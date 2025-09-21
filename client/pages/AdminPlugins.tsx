import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import apiFetch from "@/lib/apiClient";

interface PluginItem {
  name: string;
  module: string;
  description: string;
  status: "pending" | "activated" | string;
  votes?: { for: number; against: number; abstain: number };
}

export default function AdminPlugins() {
  const { user } = useAuth();
  const isFounder = user?.role === "admin";
  const { toast } = useToast();

  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<{
    code: number;
    message: string;
  } | null>(null);
  const [degraded, setDegraded] = useState(false);

  // Filters/search
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "activated">("all");
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Proposal form
  const [pName, setPName] = useState("");
  const [pModule, setPModule] = useState("");
  const [pDesc, setPDesc] = useState("");
  const canSubmit =
    pName.trim().length > 0 &&
    pModule.trim().length > 0 &&
    pDesc.trim().length > 0;
  const [proposing, setProposing] = useState(false);

  // Row details & actions
  const [detail, setDetail] = useState<PluginItem | null>(null);
  const [actTarget, setActTarget] = useState<PluginItem | null>(null);
  const [ack, setAck] = useState(false);
  const [activating, setActivating] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return plugins.filter((p) => {
      if (status !== "all" && String(p.status).toLowerCase() !== status)
        return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.module.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    });
  }, [plugins, search, status]);

  const fetchPlugins = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    setDegraded(false);
    try {
      const r = await apiFetch("/api/governance/plugins");
      const isDegraded =
        (r.headers.get("X-Supabase-Degraded") || "").toLowerCase() === "true";
      if (!r.ok) {
        const j = await r.json().catch(() => ({ detail: `HTTP ${r.status}` }));
        setDegraded(isDegraded || r.status === 502);
        setErrorBanner({
          code: r.status,
          message: j.detail || r.statusText || "Failed",
        });
        return;
      }
      const j = await r.json();
      const list: PluginItem[] = Array.isArray(j?.data)
        ? j.data
        : Array.isArray(j)
          ? j
          : [];
      setPlugins(list);
      setDegraded(isDegraded || Boolean(j?.supabase_degraded));
    } catch (e: any) {
      setErrorBanner({ code: 0, message: e?.message || "Network error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      fetchPlugins();
    }, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchPlugins]);

  const propose = async () => {
    if (!canSubmit) {
      toast({
        title: "Validation",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }
    setProposing(true);
    try {
      const r = await apiFetch("/api/governance/plugins/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pName.trim(),
          module: pModule.trim(),
          description: pDesc.trim(),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 201 || r.ok) {
        const added: PluginItem | null = j?.data || null;
        if (added) setPlugins((prev) => [added, ...prev]);
        else await fetchPlugins();
        setPName("");
        setPModule("");
        setPDesc("");
        toast({
          title: "Proposed",
          description: `${pName} submitted for review`,
        });
      } else {
        toast({
          title: "Proposal failed",
          description: j.detail || "Failed to propose plugin",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Proposal error",
        description: e?.message || "Failed",
        variant: "destructive",
      });
    } finally {
      setProposing(false);
    }
  };

  const vote = async (
    name: string,
    choice: "approve" | "reject" | "abstain",
  ) => {
    if (!isFounder) return;
    setVoting(`${name}:${choice}`);
    try {
      const r = await apiFetch(
        `/api/governance/plugins/${encodeURIComponent(name)}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ choice }),
        },
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast({
          title: "Vote failed",
          description: j.detail || "Invalid vote",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Vote recorded", description: `${choice} for ${name}` });
      await fetchPlugins();
    } catch (e: any) {
      toast({
        title: "Vote error",
        description: e?.message || "Failed",
        variant: "destructive",
      });
    } finally {
      setVoting(null);
    }
  };

  const openActivate = (p: PluginItem) => {
    setActTarget(p);
    setAck(false);
  };
  const activate = async () => {
    if (!actTarget) return;
    if (!ack) {
      toast({
        title: "Acknowledgement required",
        description: "Confirm Approve & Activate",
        variant: "destructive",
      });
      return;
    }
    setActivating(true);
    try {
      const r = await apiFetch(
        `/api/governance/plugins/${encodeURIComponent(actTarget.name)}/approve`,
        { method: "POST" },
      );
      const j = await r.json().catch(() => ({}));
      if (r.status === 403) {
        toast({
          title: "Insufficient votes",
          description: "Supermajority not reached",
          variant: "destructive",
        });
        return;
      }
      if (!r.ok) {
        toast({
          title: "Activation failed",
          description: j.detail || "Failed to activate",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Activated",
        description: j.audit_entry_id
          ? `Audit ${j.audit_entry_id}`
          : "Plugin approved & activated",
      });
      setActTarget(null);
      setAck(false);
      await fetchPlugins();
    } catch (e: any) {
      toast({
        title: "Activation error",
        description: e?.message || "Failed",
        variant: "destructive",
      });
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Strategy Plugins</h1>
          <p className="text-muted-foreground">
            Founder-only governance for plugin proposals, votes, and activation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span>Auto-refresh</span>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <span className="text-muted-foreground">30s</span>
          </div>
          <Button variant="outline" onClick={fetchPlugins} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {errorBanner && (
        <Alert variant="destructive">
          <AlertTitle>
            {errorBanner.code ? `Error ${errorBanner.code}` : "Error"}
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{errorBanner.message}</span>
            <Button size="sm" variant="outline" onClick={fetchPlugins}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {degraded && (
        <Alert>
          <AlertTitle>Degraded mode</AlertTitle>
          <AlertDescription>
            Supabase unavailable. Listing may be stale and approvals record
            local-only audit entries.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Propose Plugin</CardTitle>
          <CardDescription>
            Provide the plugin name, backend module path, and a rich
            description. Rehash is required after any change.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Plugin name"
              value={pName}
              onChange={(e) => setPName(e.target.value)}
            />
            <Input
              placeholder="Backend module path (e.g. strategies.plugins.my_bot:Plugin)"
              value={pModule}
              onChange={(e) => setPModule(e.target.value)}
            />
            <div className="md:col-span-3">
              <Textarea
                placeholder="Describe behavior, dependencies, and execution expectations"
                value={pDesc}
                onChange={(e) => setPDesc(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Only founders may propose. Storage write falls back when degraded.
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={propose}
                    disabled={!canSubmit || !isFounder || proposing}
                  >
                    {proposing ? "Submitting…" : "Submit Proposal"}
                  </Button>
                </span>
              </TooltipTrigger>
              {!isFounder && (
                <TooltipContent>Founder permission required</TooltipContent>
              )}
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plugins</CardTitle>
          <CardDescription>
            Search, filter, and manage proposals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search name/module/description"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[320px]"
            />
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="activated">Activated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Module</th>
                  <th className="p-2 text-left">Description</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Votes</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const forVotes = p.votes?.for || 0;
                  const againstVotes = p.votes?.against || 0;
                  const abstainVotes = p.votes?.abstain || 0;
                  const supermajority = forVotes >= 2; // mock threshold
                  return (
                    <tr key={p.name} className="border-t">
                      <td className="p-2">
                        <button
                          className="text-primary hover:underline"
                          onClick={() => setDetail(p)}
                        >
                          {p.name}
                        </button>
                      </td>
                      <td className="p-2">{p.module}</td>
                      <td className="p-2">
                        <span title={p.description}>
                          {(p.description || "").slice(0, 80)}
                          {(p.description || "").length > 80 ? "…" : ""}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              String(p.status).toLowerCase() === "activated"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {String(p.status)}
                          </Badge>
                          {supermajority &&
                            String(p.status).toLowerCase() !== "activated" && (
                              <Badge>Supermajority</Badge>
                            )}
                        </div>
                      </td>
                      <td className="p-2">
                        +{forVotes}/-{againstVotes}/~{abstainVotes}
                      </td>
                      <td className="p-2 text-right space-x-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!isFounder || voting != null}
                                onClick={() => vote(p.name, "approve")}
                              >
                                {voting === `${p.name}:approve`
                                  ? "Voting…"
                                  : "Approve"}
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {!isFounder && (
                            <TooltipContent>
                              Founder permission required
                            </TooltipContent>
                          )}
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!isFounder || voting != null}
                                onClick={() => vote(p.name, "reject")}
                              >
                                {voting === `${p.name}:reject`
                                  ? "Voting…"
                                  : "Reject"}
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {!isFounder && (
                            <TooltipContent>
                              Founder permission required
                            </TooltipContent>
                          )}
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                title="Withdraw ballot not available (route missing)"
                              >
                                Withdraw
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Withdraw route not implemented
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                size="sm"
                                onClick={() => openActivate(p)}
                                disabled={
                                  !isFounder ||
                                  !supermajority ||
                                  String(p.status).toLowerCase() === "activated"
                                }
                              >
                                Approve & Activate
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {!isFounder && (
                            <TooltipContent>
                              Founder permission required
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td
                      className="p-2 text-center text-muted-foreground"
                      colSpan={6}
                    >
                      No plugins match. Try a different filter or view{" "}
                      <a className="underline" href="/audit">
                        Audit & Logs
                      </a>
                      .
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td
                      className="p-2 text-center text-muted-foreground"
                      colSpan={6}
                    >
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Activate modal */}
      <Dialog
        open={!!actTarget}
        onOpenChange={(o) => {
          if (!o) {
            setActTarget(null);
            setAck(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve & Activate</DialogTitle>
            <DialogDescription>
              Confirm activation of {actTarget?.name}. Ensure code hash is
              verified and recorded.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Runtime executes only approved plugin hashes with restricted
            builtins. Rehash after any change.
          </div>
          <div className="flex items-center gap-2">
            <input
              id="ack"
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            <label htmlFor="ack" className="text-sm">
              I understand and confirm activation with audit logging
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActTarget(null);
                setAck(false);
              }}
              disabled={activating}
            >
              Cancel
            </Button>
            <Button onClick={activate} disabled={!ack || activating}>
              {activating ? "Activating…" : "Confirm Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details drawer */}
      <Drawer
        open={!!detail}
        onOpenChange={(o) => {
          if (!o) setDetail(null);
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{detail?.name}</DrawerTitle>
            <DrawerDescription>{detail?.module}</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-3">
            <div className="text-sm whitespace-pre-wrap">
              {detail?.description}
            </div>
            {detail && (
              <div className="flex items-center gap-2 text-sm">
                <Badge
                  variant={
                    String(detail.status).toLowerCase() === "activated"
                      ? "default"
                      : "secondary"
                  }
                >
                  {String(detail.status)}
                </Badge>
                <span>
                  Votes +{detail.votes?.for || 0}/-{detail.votes?.against || 0}
                  /~{detail.votes?.abstain || 0}
                </span>
              </div>
            )}
            <a
              className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
              href={
                detail
                  ? `/audit?query=plugin:${encodeURIComponent(detail.name)}`
                  : "/audit"
              }
            >
              View audit history
            </a>
          </div>
          <DrawerFooter>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
