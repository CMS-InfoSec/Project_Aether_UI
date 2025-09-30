import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import apiFetch, { getJson, postJson } from "@/lib/apiClient";
import { Sparkles, Bot, Shield, RefreshCw } from "lucide-react";

interface Msg {
  role: "user" | "assistant" | "system";
  text: string;
  ts: number;
}

export default function CopilotDock() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    desc: string;
    requireReason?: boolean;
    reason?: string;
    onConfirm: ((reason?: string) => Promise<void>) | null;
  }>({
    open: false,
    title: "",
    desc: "",
    onConfirm: null,
    requireReason: false,
    reason: "",
  });

  if (!user) return null;

  const logCopilot = async (title: string, message: string) => {
    try {
      await apiFetch("/api/v1/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          severity: "info",
          category: "copilot",
        }),
      });
    } catch {}
  };

  const append = (m: Msg) => setMsgs((prev) => [...prev, m].slice(-50));

  const sendLLM = async (question: string, sources: string[]) => {
    setLoading(true);
    const userMsg: Msg = { role: "user", text: question, ts: Date.now() };
    append(userMsg);
    try {
      const r = await apiFetch("/api/v1/llm/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const j = await r.json().catch(() => ({ answer: "No response" }));
      const answer =
        typeof j?.answer === "string"
          ? j.answer
          : j?.data?.answer || JSON.stringify(j);
      const cites = sources.length ? `\n\nSources: ${sources.join(", ")}` : "";
      append({ role: "assistant", text: `${answer}${cites}`, ts: Date.now() });
      await logCopilot("Copilot suggestion", `${question} → ${answer}`);
    } catch (e: any) {
      append({
        role: "assistant",
        text: `Error: ${e?.message || "Failed"}`,
        ts: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const actWhyLastTrade = async () => {
    setLoading(true);
    try {
      const tr = await getJson<any>("/api/trades/recent");
      const items = Array.isArray(tr?.items) ? tr.items : [];
      const last = items[0];
      if (!last?.id) {
        append({
          role: "assistant",
          text: "No recent trades.",
          ts: Date.now(),
        });
        return;
      }
      let ex: any = null;
      try {
        ex = await getJson<any>(
          `/api/v1/explain/${encodeURIComponent(last.id)}`,
        );
      } catch {
        try {
          ex = await getJson<any>(
            `/api/ai/explain/${encodeURIComponent(last.id)}`,
          );
        } catch {}
      }
      const shap = ex?.data || ex || {};
      const why = `Trade ${last.id} rationale: ${shap.summary || shap.reason || shap?.shap?.summary || "explanation unavailable"}`;
      const cites = ["GET /api/trades/recent", "GET /api/v1/explain/{id}"];
      append({
        role: "assistant",
        text: `${why}\n\nSources: ${cites.join(", ")}`,
        ts: Date.now(),
      });
      await logCopilot("Copilot why", `trade=${last.id}`);
    } catch {
      append({
        role: "assistant",
        text: "Failed to fetch rationale.",
        ts: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const actWhatIf = async (preset: "flash" | "rally") => {
    setLoading(true);
    try {
      const body = {
        scenario:
          preset === "flash"
            ? {
                name: "Flash Crash",
                price_jump_pct: -0.2,
                vol_spike_pct: 0.8,
                spread_widen_bps: 150,
                liquidity_drain_pct: 0.7,
                duration_min: 20,
              }
            : {
                name: "Rally on Thin Liquidity",
                price_jump_pct: 0.15,
                vol_spike_pct: 0.4,
                spread_widen_bps: 60,
                liquidity_drain_pct: 0.6,
                duration_min: 45,
              },
      };
      const r = await apiFetch("/api/v1/execution/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      const data = j?.data || j || {};
      const slippage = data?.summary?.slippageBps ?? data.slippageBps ?? 0;
      const avgPx = data?.summary?.avgPrice ?? data.avgPrice ?? 0;
      const totalQty = data?.summary?.totalQty ?? data.totalQty ?? 0;
      append({
        role: "assistant",
        text: `Scenario '${body.scenario.name}' → Slippage: ${Number(slippage).toFixed(2)} bps, Avg Px: ${Number(avgPx).toFixed(2)}, Qty: ${Number(totalQty).toFixed(4)}\n\nSources: POST /api/v1/execution/simulate`,
        ts: Date.now(),
      });
      await logCopilot("Copilot what-if", body.scenario.name);
    } catch {
      append({
        role: "assistant",
        text: "Scenario run failed.\n\nSources: POST /api/sim/run",
        ts: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const actRiskSummary = async () => {
    setLoading(true);
    try {
      const daily = await getJson<any>("/api/reports/daily");
      const hedge = await getJson<any>("/api/hedge/percent");
      const dr = daily?.data || daily || {};
      const hp = hedge?.data || hedge || {};
      const txt = `Risk posture: total return ${(dr.totalReturnPercent ?? 0).toFixed?.(2) || 0}%, winRate ${Math.round((dr.winRate ?? 0) * 100)}%, hedge ${(hp.hedgePercent ?? hp.effectivePercent ?? 0) * 100}%`;
      append({
        role: "assistant",
        text: `${txt}\n\nSources: GET /api/reports/daily, GET /api/hedge/percent`,
        ts: Date.now(),
      });
      await logCopilot("Copilot risk summary", "ok");
    } catch {
      append({
        role: "assistant",
        text: "Failed to summarize risk.\n\nSources: GET /api/reports/daily, GET /api/hedge/percent",
        ts: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const actExplainRisk = async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/strategies/explain");
      const j = await r.json().catch(() => ({}));
      const data = j?.data || j || {};
      const summary =
        data.summary || data.explanation || data.reason || "No explanation";
      append({
        role: "assistant",
        text: `Risk explain: ${summary}\n\nSources: GET /api/strategies/explain`,
        ts: Date.now(),
      });
      await logCopilot("Copilot risk explain", "ok");
    } catch {
      append({
        role: "assistant",
        text: "Risk explain failed.",
        ts: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const actCompareModels = async () => {
    setLoading(true);
    try {
      let modelsResp: any = null;
      const endpoints = [
        "/api/governance/models",
        "/governance/models",
        "/api/models",
        "/api/models/history",
      ];
      for (const ep of endpoints) {
        try {
          const r = await apiFetch(ep, { admin: true });
          const j = await r.json().catch(() => null);
          if (j) {
            modelsResp = j;
            break;
          }
        } catch {}
      }
      const list: any[] = Array.isArray(modelsResp?.data)
        ? modelsResp.data
        : Array.isArray(modelsResp)
          ? modelsResp
          : [];
      const norm = list.map((m: any) => ({
        id: m.modelId || m.id || m.name,
        name: m.name || m.modelId,
        status: m.status || "trained",
        deployedAt: m.deployedAt ? new Date(m.deployedAt).getTime() : 0,
        sharpe: m.performance?.sharpeRatio ?? m.metrics?.sharpeRatio ?? null,
        dd: m.performance?.maxDrawdown ?? m.metrics?.maxDrawdown ?? null,
        win: m.performance?.winRate ?? m.metrics?.winRate ?? null,
      }));
      const promoted = norm
        .filter((m) => m.status === "deployed" || m.deployedAt > 0)
        .sort((a, b) => b.deployedAt - a.deployedAt)
        .slice(0, 3);
      if (promoted.length === 0) {
        append({
          role: "assistant",
          text: "No promoted models found.",
          ts: Date.now(),
        });
        return;
      }
      const lines = promoted.map(
        (m) =>
          `${m.name}: Sharpe ${m.sharpe ?? "-"}, Win ${(m.win ?? 0) * 100}%, MaxDD ${m.dd ?? "-"}`,
      );
      append({
        role: "assistant",
        text: `Last promoted models (3):\n- ${lines.join("\n- ")}`,
        ts: Date.now(),
      });
      await logCopilot("Copilot compare models", `count=${promoted.length}`);
    } catch {
      append({
        role: "assistant",
        text: "Failed to compare models.",
        ts: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const actKillSwitch = async () => {
    if (user.role !== "admin") {
      append({
        role: "assistant",
        text: "Kill-switch requires admin.",
        ts: Date.now(),
      });
      return;
    }
    setConfirm({
      open: true,
      title: "Enable Kill Switch",
      desc: "Emergency stop all trading and pause system. Reason required.",
      requireReason: true,
      reason: "",
      onConfirm: async (reason?: string) => {
        try {
          const r = await apiFetch("/api/admin/kill-switch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              enabled: true,
              actor: user.email,
              reason: reason || "Emergency stop",
            }),
            admin: true,
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.message || "Kill-switch failed");
          append({
            role: "assistant",
            text: `Kill switch enabled.`,
            ts: Date.now(),
          });
          await logCopilot("Copilot action", `kill-switch enabled`);
        } catch (e: any) {
          append({
            role: "assistant",
            text: `Kill-switch error: ${e?.message || "error"}`,
            ts: Date.now(),
          });
        }
      },
    });
  };

  const actRollback = async () => {
    if (user.role !== "admin") {
      append({
        role: "assistant",
        text: "Rollback requires admin confirmation.",
        ts: Date.now(),
      });
      return;
    }
    setConfirm({
      open: true,
      title: "Confirm Rollback",
      desc: "Rollback model to previous stable version?",
      onConfirm: async () => {
        try {
          const models = await getJson<any>("/api/models?type=rl_agent");
          const list = (models?.data || models || []).filter(
            (m: any) =>
              m.status === "trained" ||
              m.status === "shadow" ||
              m.status === "deployed",
          );
          const deployed = (models?.data || models || []).find(
            (m: any) => m.status === "deployed",
          );
          const target = list.find((m: any) => m.modelId !== deployed?.modelId);
          if (!deployed || !target) {
            append({
              role: "assistant",
              text: "No eligible rollback target.",
              ts: Date.now(),
            });
            return;
          }
          const r = await apiFetch("/api/models/rollback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromModelId: deployed.modelId,
              toModelId: target.modelId,
              founderApproval: true,
            }),
            admin: true,
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.detail || "Rollback failed");
          append({
            role: "assistant",
            text: `Rollback initiated ${deployed.modelId} → ${target.modelId}.\n\nSources: POST /api/models/rollback`,
            ts: Date.now(),
          });
          await logCopilot(
            "Copilot action",
            `rollback ${deployed.modelId} -> ${target.modelId}`,
          );
        } catch (e: any) {
          append({
            role: "assistant",
            text: `Rollback failed: ${e?.message || "error"}`,
            ts: Date.now(),
          });
        }
      },
    });
  };

  const onSend = async () => {
    const q = input.trim();
    if (!q) return;
    setInput("");
    // Simple intent routing
    const lower = q.toLowerCase();
    if (lower.startsWith("why")) return actWhyLastTrade();
    if (
      lower.includes("flash crash") ||
      lower.includes("what-if") ||
      lower.includes("flash")
    )
      return actWhatIf("flash");
    if (lower.includes("rally")) return actWhatIf("rally");
    if (lower.includes("explain") && lower.includes("risk"))
      return actExplainRisk();
    if (lower.includes("risk")) return actRiskSummary();
    if (lower.includes("compare") && lower.includes("model"))
      return actCompareModels();
    if (lower.includes("kill") && lower.includes("switch"))
      return actKillSwitch();
    if (lower.includes("rollback")) return actRollback();
    return sendLLM(q, []);
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={() => setOpen(true)} className="shadow-lg">
          <Bot className="h-4 w-4 mr-2" /> Copilot
        </Button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[420px] p-0 flex flex-col"
        >
          <div className="p-3 border-b flex items-center justify-between sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="font-medium">AI Copilot</div>
              <Badge variant="outline">{user.role.toUpperCase()}</Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Cites data sources; admin actions require confirmation
            </div>
          </div>
          <div className="p-2 border-b flex flex-wrap gap-2 text-xs">
            <Button variant="outline" size="sm" onClick={actWhyLastTrade}>
              Why last trade?
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actWhatIf("flash")}
            >
              What-if: Flash Crash
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actWhatIf("rally")}
            >
              What-if: Rally
            </Button>
            <Button variant="outline" size="sm" onClick={actExplainRisk}>
              Explain risk
            </Button>
            <Button variant="outline" size="sm" onClick={actRiskSummary}>
              Risk summary
            </Button>
            <Button variant="outline" size="sm" onClick={actCompareModels}>
              Compare models
            </Button>
            <Button variant="outline" size="sm" onClick={actRollback}>
              <Shield className="h-3 w-3 mr-1" /> Rollback
            </Button>
            {user.role === "admin" && (
              <Button variant="destructive" size="sm" onClick={actKillSwitch}>
                Kill switch
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {msgs.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  Ask "why", run a scenario, or request how-to steps. Sensitive
                  actions need admin.
                </div>
              )}
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    <div className="opacity-70 text-[10px] mb-1">
                      {new Date(m.ts).toLocaleString()}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-3 border-t sticky bottom-0 bg-background">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask why / what-if / how-to…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />
              <Button onClick={onSend} disabled={loading}>
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={confirm.open}
        onOpenChange={(o) => setConfirm((prev) => ({ ...prev, open: o }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm.title}</DialogTitle>
            <DialogDescription>{confirm.desc}</DialogDescription>
          </DialogHeader>
          {confirm.requireReason && (
            <div className="space-y-2">
              <label className="text-sm">Reason</label>
              <Input
                value={confirm.reason || ""}
                onChange={(e) =>
                  setConfirm((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Describe why this action is necessary"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirm((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const reason = confirm.reason || "";
                if (confirm.requireReason && reason.trim().length < 10) return;
                if (confirm.onConfirm) await confirm.onConfirm(reason);
                setConfirm((prev) => ({ ...prev, open: false }));
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
