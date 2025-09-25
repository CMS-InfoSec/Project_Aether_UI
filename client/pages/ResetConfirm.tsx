import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import apiFetch from "@/lib/apiClient";

export default function ResetConfirm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tokenParam = params.get("token") || "";
  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(null); setOk(null); setLoading(true);
    try {
      if (!token || !password || !confirm) { setErr("All fields are required"); return; }
      if (password !== confirm) { setErr("Passwords do not match"); return; }
      const r = await apiFetch("/api/auth/reset/confirm", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ token, password }) });
      if (!r.ok) {
        const j = await r.json().catch(()=>({ detail: r.statusText }));
        throw new Error(j.detail || "Reset failed");
      }
      setOk("Password updated. You can sign in now.");
      setTimeout(()=> navigate("/login"), 1200);
    } catch(e:any) {
      setErr(e?.message || "Reset failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>Paste your reset token and choose a new password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {err && (<Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>)}
          {ok && (<Alert><AlertDescription>{ok}</AlertDescription></Alert>)}
          <div className="space-y-2">
            <Label htmlFor="token">Reset Token</Label>
            <Input id="token" value={token} onChange={(e)=> setToken(e.target.value)} placeholder="paste token from email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">New Password</Label>
            <Input id="pw" type="password" value={password} onChange={(e)=> setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">Confirm Password</Label>
            <Input id="pw2" type="password" value={confirm} onChange={(e)=> setConfirm(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={loading || !token || !password || !confirm}>{loading ? "Saving..." : "Update Password"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
