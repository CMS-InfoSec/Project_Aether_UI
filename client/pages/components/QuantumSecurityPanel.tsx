import React from "react";
import apiFetch from "@/lib/apiClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import HelpTip from "@/components/ui/help-tip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Shield, Lock, Cpu, Calendar, Terminal } from "lucide-react";

interface KeysStatus {
  present?: boolean;
  valid?: boolean;
  expires_at?: string | null;
  key_masked?: string | null;
  expiring_soon?: boolean;
  // optional extended payload from /security/keys/status if available
  algorithms?: { name: string; category: string }[];
  pqc_ready?: boolean;
  fallback?: boolean;
  tx_hashes?: string[];
}

export default function QuantumSecurityPanel() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [keys, setKeys] = React.useState<KeysStatus | null>(null);

  // Derived algorithms in use (from known, verifiable code paths in this repo)
  const knownAlgorithms = React.useMemo(() => {
    return [
      { name: "SHA-256", category: "Hashing (report integrity checksums)" },
      { name: "HMAC-SHA256", category: "Message authentication (admin tools)" },
    ];
  }, []);

  // Basic client-side PQC readiness check (no PQC libs present in this app)
  const pqcReady = Boolean(keys?.pqc_ready) || false;
  const pqcFallback = keys?.fallback ?? !pqcReady;

  const nextRotation = keys?.expires_at ? new Date(keys.expires_at) : null;

  const triggerStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      // Prefer the requested endpoint if available
      let res = await apiFetch("/security/keys/status");
      if (!res.ok) {
        // Fallback to existing wallet API keys status
        res = await apiFetch("/api/wallet/api-keys/status");
      }
      const data = await res.json().catch(() => ({}) as any);
      const payload: KeysStatus = data?.data || data || {};
      setKeys(payload);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to fetch security status",
      );
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    // Load once on mount to populate rotation if available
    triggerStatus().catch(() => {});
  }, []);

  const txs =
    keys?.tx_hashes && Array.isArray(keys.tx_hashes) ? keys.tx_hashes : [];

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Quantum Security
          </CardTitle>
          <CardDescription>
            Algorithms, rotation schedule, and post-quantum readiness. Includes
            on-chain signature metadata when available.
          </CardDescription>
        </div>
        <HelpTip content="Shows cryptography in use (from current code), next key rotation, and PQC readiness. Tries /security/keys/status; falls back to wallet key status." />
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={triggerStatus}>
                <RefreshCw className="h-4 w-4 mr-1" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 border rounded-md">
            <div className="text-xs text-muted-foreground mb-1">
              Algorithms in use
            </div>
            <div className="space-y-1">
              {knownAlgorithms.map((a) => (
                <div key={a.name} className="flex items-center gap-2 text-sm">
                  <Lock className="h-3 w-3" />
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground">— {a.category}</span>
                </div>
              ))}
              {Array.isArray(keys?.algorithms) &&
                keys!.algorithms!.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {keys!.algorithms!.map((a) => (
                      <div
                        key={`${a.name}:${a.category}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Lock className="h-3 w-3" />
                        <span className="font-medium">{a.name}</span>
                        <span className="text-muted-foreground">
                          — {a.category}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>

          <div className="p-4 border rounded-md">
            <div className="text-xs text-muted-foreground mb-1">
              Next rotation
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-3 w-3" />
              <span>
                {nextRotation ? nextRotation.toLocaleString() : "Unknown"}
              </span>
            </div>
            {typeof keys?.expiring_soon === "boolean" && (
              <div className="mt-2">
                <Badge
                  variant={keys!.expiring_soon ? "destructive" : "secondary"}
                >
                  {keys!.expiring_soon ? "Expiring soon" : "Healthy"}
                </Badge>
              </div>
            )}
          </div>

          <div className="p-4 border rounded-md">
            <div className="text-xs text-muted-foreground mb-1">
              PQC readiness
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Cpu className="h-3 w-3" />
              <span>{pqcReady ? "Ready" : "Not available"}</span>
              <Badge variant={pqcFallback ? "outline" : "secondary"}>
                {pqcFallback ? "Fallback: classical" : "PQC active"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-muted-foreground">
            If PQC libraries are unavailable, the system falls back to classical
            algorithms.
          </div>
          <Button onClick={triggerStatus} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking status…
              </>
            ) : (
              <>
                <Terminal className="h-4 w-4 mr-2" />
                Trigger /security/keys/status
              </>
            )}
          </Button>
        </div>

        <div className="border rounded-md p-3">
          <div className="text-xs text-muted-foreground mb-2">
            On-chain signature TX hashes
          </div>
          {txs.length ? (
            <div className="space-y-1 text-sm">
              {txs.map((h, i) => (
                <div key={`${i}:${h}`} className="font-mono break-all">
                  {h}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">None available</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
