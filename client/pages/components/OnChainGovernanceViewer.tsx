import React from "react";
import apiFetch from "@/lib/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HelpTip from "@/components/ui/help-tip";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, RefreshCw, CheckCircle, AlertTriangle, Vote, History } from "lucide-react";

interface Proposal {
  id: string;
  description: string;
  status: "pending" | "voting" | "approved" | "rejected" | "deployed";
  votes: { founderId: string; approve: boolean; votedAt: string }[];
  requiredVotes: number;
  createdAt: string;
  createdBy: string;
  deployedAt?: string;
  deploymentStatus?: "success" | "failed" | "in_progress";
  voteCount?: number;
  approvalCount?: number;
  canDeploy?: boolean;
  tx_hash?: string; // optional, if backend provides on-chain tx
}

interface AuditEntry {
  id?: string;
  at?: string;
  timestamp?: string;
  type: string;
  modelId?: string;
  from?: string;
  to?: string;
  actor?: string;
  tx_hash?: string;
}

function shortHash(h: string) {
  if (!h) return "";
  return h.length > 16 ? `${h.slice(0, 10)}…${h.slice(-6)}` : h;
}

function explorerUrl(tx: string): string | null {
  if (!tx) return null;
  if (/^0x[0-9a-fA-F]{64}$/.test(tx)) return `https://etherscan.io/tx/${tx}`;
  if (/^[0-9a-fA-F]{64}$/.test(tx)) return `https://www.blockchain.com/explorer/transactions/btc/${tx}`;
  return null;
}

export default function OnChainGovernanceViewer() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [proposals, setProposals] = React.useState<Proposal[]>([]);
  const [audit, setAudit] = React.useState<AuditEntry[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, aRes] = await Promise.all([
        apiFetch("/api/admin/proposals", { admin: true }),
        apiFetch("/api/models/audit", { admin: true }),
      ]);
      const pData = await pRes.json().catch(() => ({}));
      const aData = await aRes.json().catch(() => ({}));
      if (pRes.ok && pData?.status === "success") setProposals(pData.data || []);
      else setProposals([]);
      if (aRes.ok && aData?.status === "success") setAudit(aData.data || []);
      else setAudit([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load governance data");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAll().catch(() => {});
    // no auto-refresh by default to avoid spam; manual refresh button provided
  }, []);

  const rollbackEvents = React.useMemo(() => {
    return (audit || []).filter((e) => e.type?.includes("rolled_back") || e.type?.includes("promoted") || e.type?.includes("deployed"));
  }, [audit]);

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">On-Chain Governance</CardTitle>
          <CardDescription>
            View ASC votes and model rollbacks with blockchain transaction hashes and quorum status.
          </CardDescription>
        </div>
        <HelpTip content="Lists proposals with quorum progress and shows model governance events from the audit log. If tx hashes are present, links to chain explorers are provided." />
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={fetchAll}>
                <RefreshCw className="h-4 w-4 mr-1" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Data refresh is manual. Some endpoints may require an admin API key.</div>
          <Button onClick={fetchAll} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Refreshing…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </>
            )}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Vote className="h-4 w-4" />
            <h3 className="font-medium">ASC Votes</h3>
          </div>
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Proposal</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Quorum</th>
                  <th className="text-left p-2">TX</th>
                  <th className="text-left p-2">Explorer</th>
                </tr>
              </thead>
              <tbody>
                {(proposals || []).map((p) => {
                  const approvals = typeof p.approvalCount === "number" ? p.approvalCount : p.votes.filter(v=>v.approve).length;
                  const req = p.requiredVotes || 0;
                  const pct = req > 0 ? Math.min(100, Math.round((approvals / req) * 100)) : 0;
                  const onChain = p.status === "deployed";
                  const link = p.tx_hash ? explorerUrl(p.tx_hash) : null;
                  return (
                    <tr key={p.id} className="border-t align-top">
                      <td className="p-2 whitespace-nowrap">
                        <div className="font-mono text-xs">{p.id}</div>
                        {onChain && (
                          <div className="mt-1"><Badge className="bg-green-100 text-green-800 border-green-200 inline-flex items-center gap-1"><CheckCircle className="h-3 w-3" /> On-chain</Badge></div>
                        )}
                      </td>
                      <td className="p-2 max-w-md">
                        <div className="line-clamp-3">{p.description}</div>
                      </td>
                      <td className="p-2">
                        <Badge variant={p.status === "approved" || p.status === "deployed" ? "secondary" : p.status === "rejected" ? "destructive" : "outline"} className="capitalize">
                          {p.status}
                        </Badge>
                        {p.deploymentStatus && (
                          <div className="text-xs text-muted-foreground mt-1">{p.deploymentStatus}</div>
                        )}
                      </td>
                      <td className="p-2 w-56">
                        <div className="text-xs mb-1">{approvals}/{req} approvals ({pct}%)</div>
                        <Progress value={pct} />
                      </td>
                      <td className="p-2">
                        {p.tx_hash ? (
                          <code className="font-mono text-xs">{shortHash(p.tx_hash)}</code>
                        ) : (
                          <span className="text-xs text-muted-foreground">n/a</span>
                        )}
                      </td>
                      <td className="p-2">
                        {link ? (
                          <a className="inline-flex items-center gap-1 text-blue-600 hover:underline" href={link} target="_blank" rel="noreferrer">
                            Verify <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(!proposals || proposals.length === 0) && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={6}>No proposals found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <h3 className="font-medium">Rollbacks & On-chain Events</h3>
          </div>
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Event</th>
                  <th className="text-left p-2">Details</th>
                  <th className="text-left p-2">TX</th>
                  <th className="text-left p-2">Explorer</th>
                </tr>
              </thead>
              <tbody>
                {(rollbackEvents || []).map((e, idx) => {
                  const ts = e.at || e.timestamp || "";
                  const tx = e.tx_hash || "";
                  const link = explorerUrl(tx);
                  const human = ts ? new Date(ts).toLocaleString() : "";
                  return (
                    <tr key={`${idx}:${e.type}:${ts}`} className="border-t align-top">
                      <td className="p-2 whitespace-nowrap">{human}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="capitalize">{e.type.replace(/[:_]/g, " ")}</Badge>
                      </td>
                      <td className="p-2 text-xs">
                        {e.modelId && <div>model: <code className="font-mono">{e.modelId}</code></div>}
                        {e.from && <div>from: <code className="font-mono">{e.from}</code></div>}
                        {e.to && <div>to: <code className="font-mono">{e.to}</code></div>}
                        {e.actor && <div>actor: <code className="font-mono">{e.actor}</code></div>}
                      </td>
                      <td className="p-2">
                        {tx ? <code className="font-mono text-xs">{shortHash(tx)}</code> : <span className="text-xs text-muted-foreground">n/a</span>}
                      </td>
                      <td className="p-2">
                        {link ? (
                          <a className="inline-flex items-center gap-1 text-blue-600 hover:underline" href={link} target="_blank" rel="noreferrer">
                            Verify <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rollbackEvents.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={5}>No on-chain events or rollbacks recorded</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Some audit endpoints require an admin API key. Add it in local settings if results appear empty.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
