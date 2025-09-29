import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HelpTip from "@/components/ui/help-tip";
import apiFetch from "@/lib/apiClient";
import {
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Info,
  Bookmark,
} from "lucide-react";

export type RegimeSegment = {
  id: string;
  label: string;
  start: string; // ISO
  end: string; // ISO
  confidence?: number; // 0..1
  events?: Array<{ ts: string; label: string }>;
  color?: string;
};

export default function RegimeTimelineRibbon({
  onSelect,
  selected,
}: {
  onSelect?: (
    range: { from: number; to: number; label?: string } | null,
  ) => void;
  selected?: { from: number; to: number } | null;
}) {
  const [loading, setLoading] = useState(false);
  const [segments, setSegments] = useState<RegimeSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewFrom, setViewFrom] = useState<number | null>(null);
  const [viewTo, setViewTo] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const palette = [
    "#1d4ed8",
    "#0f766e",
    "#9333ea",
    "#b45309",
    "#be123c",
    "#0ea5e9",
    "#059669",
    "#7c3aed",
  ];

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const key = "regime_history_buffer";
      let hist: RegimeSegment[] = [];
      try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) hist = parsed;
      } catch {}

      let current: any = null;
      const endpoints = [
        "/api/strategies/regime/current",
        "/api/v1/strategies/regime/current",
      ];
      for (const ep of endpoints) {
        try {
          const r = await apiFetch(ep);
          if (r.ok) {
            const j = await r.json();
            current = j?.data || j;
            break;
          }
        } catch {}
      }

      if (current) {
        const nowIso = new Date().toISOString();
        const seg: RegimeSegment = {
          id: String(current.id || current.label || nowIso),
          label: String(current.label || current.regime || "Regime"),
          start: String(current.start || current.since || nowIso),
          end: nowIso,
          confidence:
            typeof current.confidence === "number"
              ? current.confidence
              : typeof current.conf === "number"
                ? current.conf
                : undefined,
          events: Array.isArray(current.events)
            ? current.events.map((e: any) => ({
                ts: String(e.ts || e.time || e.t || nowIso),
                label: String(e.label || e.name || "event"),
              }))
            : [],
          color: current.color,
        };
        if (hist.length && hist[0].label === seg.label) {
          hist[0].end = seg.end;
          hist[0].confidence = seg.confidence ?? hist[0].confidence;
        } else {
          hist.unshift(seg);
        }
        hist = hist.slice(0, 50);
        try { localStorage.setItem(key, JSON.stringify(hist)); } catch {}
      }

      // Assign colors if missing
      for (let i = 0; i < hist.length; i++) {
        if (!hist[i].color) hist[i].color = palette[i % palette.length];
      }
      setSegments(hist);
      if (hist.length) {
        const min = Math.min(...hist.map((s) => new Date(s.start).getTime()));
        const max = Math.max(...hist.map((s) => new Date(s.end).getTime()));
        setViewFrom(min);
        setViewTo(max);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load regime history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const timeline = useMemo(() => {
    const items = segments
      .map((s) => ({
        ...s,
        from: new Date(s.start).getTime(),
        to: new Date(s.end).getTime(),
      }))
      .filter(
        (s) =>
          Number.isFinite(s.from) && Number.isFinite(s.to) && s.to > s.from,
      )
      .sort((a, b) => a.from - b.from);
    const min =
      viewFrom ?? (items.length ? items[0].from : Date.now() - 86400000);
    const max =
      viewTo ?? (items.length ? items[items.length - 1].to : Date.now());
    const span = Math.max(1, max - min);
    return { items, min, max, span };
  }, [segments, viewFrom, viewTo]);

  const pct = (t: number) => `${((t - timeline.min) / timeline.span) * 100}%`;

  const onClickSeg = (s: any) => {
    onSelect?.({ from: s.from, to: s.to, label: s.label });
  };

  const zoom = (factor: number) => {
    const mid = (timeline.min + timeline.max) / 2;
    const half = (timeline.max - timeline.min) / 2 / factor;
    setViewFrom(Math.max(0, Math.floor(mid - half)));
    setViewTo(Math.floor(mid + half));
  };

  const pan = (dir: -1 | 1) => {
    const delta = (timeline.max - timeline.min) * 0.2 * dir;
    setViewFrom(timeline.min + delta);
    setViewTo(timeline.max + delta);
  };

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Regime Timeline
            </Badge>
            <HelpTip content="Detected market regimes with confidence shading and key events. Click a segment to filter charts to that window." />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => pan(-1)}
              title="Pan left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => pan(1)}
              title="Pan right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => zoom(1.5)}>
              Zoom In
            </Button>
            <Button variant="outline" size="sm" onClick={() => zoom(1 / 1.5)}>
              Zoom Out
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div
          ref={containerRef}
          className="relative h-16 rounded-md border bg-muted/30 overflow-hidden"
        >
          {/* Confidence bands background */}
          {timeline.items.map((s) => (
            <div
              key={s.id + "_bg"}
              className="absolute inset-y-0"
              style={{
                left: pct(s.from),
                width: `calc(${pct(s.to)} - ${pct(s.from)})`,
                background: `linear-gradient(to bottom, ${s.color}22, ${s.color}44 ${Math.round((s.confidence ?? 0.8) * 100)}%, transparent ${Math.round((s.confidence ?? 0.8) * 100)}%)`,
              }}
            />
          ))}
          {/* Regime segments */}
          {timeline.items.map((s) => (
            <button
              key={s.id}
              onClick={() => onClickSeg(s)}
              className={`absolute inset-y-1 rounded-md border text-[11px] px-2 py-1 flex items-center justify-between ${selected && s.from >= selected.from && s.to <= selected.to ? "bg-primary/20 border-primary/50" : "bg-background/70 border-border"}`}
              style={{
                left: pct(s.from),
                width: `calc(${pct(s.to)} - ${pct(s.from)})`,
              }}
              title={`${s.label} (${new Date(s.start).toLocaleString()} → ${new Date(s.end).toLocaleString()})`}
            >
              <span className="truncate" style={{ color: s.color }}>
                {s.label}
              </span>
              {typeof s.confidence === "number" && (
                <Badge variant="outline" className="ml-2">
                  {Math.round(s.confidence * 100)}%
                </Badge>
              )}
            </button>
          ))}
          {/* Key events as markers */}
          {timeline.items
            .flatMap((s) =>
              (s.events || []).map((e, idx) => {
                const t = new Date(e.ts).getTime();
                if (!Number.isFinite(t)) return null as any;
                return (
                  <div
                    key={`${s.id}_ev_${idx}`}
                    className="absolute h-full"
                    style={{ left: pct(t), width: 0 }}
                  >
                    <div className="absolute bottom-0 translate-x-[-50%] text-[10px] px-1 py-0.5 rounded bg-background border flex items-center gap-1">
                      <Bookmark className="h-3 w-3" />
                      <span className="truncate max-w-[120px]" title={e.label}>
                        {e.label}
                      </span>
                    </div>
                    <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-primary/50" />
                  </div>
                );
              }),
            )
            .filter(Boolean)}
        </div>
        <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
          <div className="inline-flex items-center gap-1">
            <Info className="h-3 w-3" /> Click a segment to apply a time filter
            across charts. Click again on another segment to change. Use Reports
            → Notifications to clear unrelated alerts.
          </div>
          {selected ? (
            <div className="inline-flex items-center gap-2">
              <Badge variant="outline">Filtered</Badge>
              <span>
                {new Date(selected.from).toLocaleString()} –{" "}
                {new Date(selected.to).toLocaleString()}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSelect?.(null)}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
