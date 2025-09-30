import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import HelpTip from "@/components/ui/help-tip";
import apiFetch from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function parseRetentionMetrics(text: string) {
  const getNum = (re: RegExp) => {
    const m = text.match(re);
    return m ? Number(m[1]) : 0;
  };
  return {
    days: getNum(/aether_data_retention_days\s+(\d+(?:\.\d+)?)/),
    lastTs: getNum(
      /aether_data_last_purge_timestamp_seconds\s+(\d+(?:\.\d+)?)/,
    ),
    deleted: getNum(/aether_data_last_purge_deleted_total\s+(\d+(?:\.\d+)?)/),
    errors: getNum(/aether_data_last_purge_errors_total\s+(\d+(?:\.\d+)?)/),
  };
}

export default function DataRetentionPanel() {
  const [days, setDays] = useState<number>(30);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [metrics, setMetrics] = useState<{
    days: number;
    lastTs: number;
    deleted: number;
    errors: number;
  }>({ days: 30, lastTs: 0, deleted: 0, errors: 0 });

  // No writable retention config endpoint; UI remains read-only
  const loadMetrics = async () => {
    try {
      const r = await apiFetch("/api/v1/metrics");
      const text = await r.text();
      setMetrics(parseRetentionMetrics(text));
      const m = parseRetentionMetrics(text);
      if (typeof m.days === "number") setDays(m.days);
    } catch {}
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const lastPurgeAt = useMemo(
    () =>
      metrics.lastTs
        ? new Date(metrics.lastTs * 1000).toLocaleString()
        : "never",
    [metrics.lastTs],
  );

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle>Data Retention</CardTitle>
          <CardDescription>
            Control retention window and perform manual purge. Stats sourced
            from Prometheus metrics.
          </CardDescription>
        </div>
        <HelpTip content="Adjust retention duration in days. Manual purge deletes data older than retention." />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Label>Retention duration (days)</Label>
            <Badge variant="outline">{days}d</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Slider
              value={[days]}
              min={7}
              max={3650}
              step={1}
              onValueChange={(v) => setDays(v[0])}
              className="max-w-xl"
              disabled
            />
            <Button disabled>Save</Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Range: 7–3650 days. Read-only: no writable backend endpoint.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="destructive" disabled>
            <Trash2 className="h-4 w-4 mr-2" />
            Manual Purge
          </Button>
          <Button variant="outline" onClick={loadMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Stats
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 border rounded-md">
            <div className="text-xs text-muted-foreground">
              Retention (metrics)
            </div>
            <div className="text-lg font-semibold">{metrics.days} d</div>
          </div>
          <div className="p-3 border rounded-md">
            <div className="text-xs text-muted-foreground">Last purge</div>
            <div className="text-lg font-semibold">{lastPurgeAt}</div>
          </div>
          <div className="p-3 border rounded-md">
            <div className="text-xs text-muted-foreground">Deleted (last)</div>
            <div className="text-lg font-semibold">{metrics.deleted}</div>
          </div>
          <div className="p-3 border rounded-md">
            <div className="text-xs text-muted-foreground">Errors (last)</div>
            <div
              className={`text-lg font-semibold ${metrics.errors > 0 ? "text-red-600" : ""}`}
            >
              {metrics.errors}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
