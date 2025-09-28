import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import apiFetch from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import HelpTip from "@/components/ui/help-tip";
import { RefreshCw, ArrowLeft, AlertTriangle, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";

interface TradeDetail {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  fee_cost: number;
  slippage_bps?: number;
  timestamp: string;
  status: string;
  rationale?: string;
}

export default function TradeDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trade, setTrade] = useState<TradeDetail | null>(null);

  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [explainData, setExplainData] = useState<any | null>(null);
  const [showJson, setShowJson] = useState(false);

  const loadTrade = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch(`/api/trades/${encodeURIComponent(id)}`);
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
      setTrade(j || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load trade");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchExplain = async () => {
    if (!id) return;
    setExplainLoading(true);
    setExplainError(null);
    setExplainData(null);
    try {
      const r = await apiFetch(`/ai/explain/${encodeURIComponent(id)}`);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `Explain HTTP ${r.status}`);
      }
      const j = await r.json();
      setExplainData(j);
    } catch (e: any) {
      setExplainError(e?.message || "Failed to fetch explanation");
    } finally {
      setExplainLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild>
          <Link to="/trades" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Trades
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Trade Details</h1>
            <HelpTip content="Inspect a single trade, including admin-only model explanation." />
          </div>
          <p className="text-muted-foreground">ID: {id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadTrade} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {trade && (
            <Badge variant="outline" className="capitalize">
              {trade.status}
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {trade && (
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">Overview</CardTitle>
            <CardDescription>Execution and costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Symbol</div>
                <div className="font-medium">{trade.symbol}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Side</div>
                <div className="font-medium capitalize">{trade.side}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Amount</div>
                <div className="font-medium">{trade.amount}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Price</div>
                <div className="font-medium">{trade.price}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Fee Cost</div>
                <div className="font-medium">{trade.fee_cost}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Slippage (bps)</div>
                <div className="font-medium">{trade.slippage_bps ?? "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Time</div>
                <div className="font-medium">{new Date(trade.timestamp).toLocaleString()}</div>
              </div>
            </div>
            {trade.rationale && (
              <div className="mt-4">
                <div className="text-muted-foreground text-sm mb-1">Rationale</div>
                <div className="text-sm">{trade.rationale}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="inline-flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Model Explanation
              </CardTitle>
              <CardDescription>SHAP/feature importances for this trade</CardDescription>
            </div>
            <HelpTip content="Fetch SHAP/feature importances for this trade. Endpoint: /ai/explain/{trade_id}." />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="tradeId" className="text-sm">Trade ID</Label>
              <Input id="tradeId" value={id || ""} readOnly className="max-w-sm" />
              <Button variant="outline" size="sm" onClick={fetchExplain} disabled={explainLoading || !id}>
                {explainLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Fetching…
                  </>
                ) : (
                  "Fetch Explanation"
                )}
              </Button>
              {explainData && (
                <Button variant="ghost" size="sm" onClick={()=> setShowJson((v)=> !v)}>
                  {showJson ? "Hide JSON" : "Show JSON"}
                </Button>
              )}
            </div>
            {explainError && (
              <div className="text-sm text-red-600">{explainError}</div>
            )}
            {explainData && (
              <div className="grid md:grid-cols-2 gap-3">
                <div className="h-64">
                  {(() => {
                    const raw = explainData;
                    const src = raw?.shap?.top_features || raw?.top_features || raw?.features || [];
                    const items = Array.isArray(src) ? src : [];
                    const bars = items.map((f:any)=> ({
                      name: f.feature || f.name || String(f[0]||""),
                      value: typeof f.weight === "number" ? Math.abs(f.weight) : (typeof f.shap === "number" ? Math.abs(f.shap) : (typeof f.value === "number" ? Math.abs(f.value) : 0)),
                    })).filter((x:any)=> x.name);
                    if (!bars.length) return <div className="text-xs text-muted-foreground">No feature importance data</div>;
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={bars.slice(0, 12)} layout="vertical" margin={{ left: 24 }}>
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={140} />
                          <RechartsTooltip />
                          <Bar dataKey="value" fill="#2563eb" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
                <div className="text-xs bg-background border rounded p-2 overflow-auto max-h-64">
                  {showJson ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(explainData, null, 2)}</pre>
                  ) : (
                    <div className="text-muted-foreground">Toggle JSON to view raw explanation</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(!trade && !loading && !error) && (
        <div className="text-sm text-muted-foreground">No trade found.</div>
      )}
    </div>
  );
}
