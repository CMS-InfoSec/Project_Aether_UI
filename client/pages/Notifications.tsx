import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import AlertsPanel from "./components/AlertsPanel";
import { getJson, patchJson } from "@/lib/apiClient";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  category?: string;
  timestamp: string;
  read: boolean;
}

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const j = await getJson<any>("/api/notifications?limit=50");
      const list: NotificationItem[] = (j?.data?.notifications || j?.notifications || []).map((n: any) => ({
        id: String(n.id),
        title: String(n.title || "Notification"),
        message: String(n.message || ""),
        severity: (n.severity || "info").toLowerCase(),
        category: n.category,
        timestamp: String(n.timestamp || new Date().toISOString()),
        read: !!n.read,
      }));
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const unread = useMemo(() => items.filter((i) => !i.read).length, [items]);

  const markRead = async (id: string) => {
    try { await patchJson(`/api/notifications/${id}/read`, { read: true }); } catch {}
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <Badge variant="outline">Unread: {unread}</Badge>
      </div>

      <AlertsPanel />

      <Card>
        <CardHeader>
          <CardTitle>System Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[420px]">
            <div className="space-y-3">
              {items.map((n) => (
                <div key={n.id} className={`p-3 border rounded-md ${n.read ? "bg-muted/30" : "bg-card"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(n.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="text-sm mt-1">{n.message}</div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline">{n.severity}</Badge>
                    {!n.read && (
                      <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>Mark read</Button>
                    )}
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-sm text-muted-foreground p-6">{loading ? "Loading…" : "No notifications"}</div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
