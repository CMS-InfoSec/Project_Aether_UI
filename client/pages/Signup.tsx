import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { postJson } from "@/lib/apiClient";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [founders, setFounders] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const requiredApprovals = role === "admin" ? 5 : 3;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    const founderApprovals = founders
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!email || !email.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    if (founderApprovals.length < requiredApprovals) {
      setError(`${requiredApprovals} founder approvals required for ${role}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await postJson<any>("/api/users/invite", {
        email,
        role,
        founderApprovals,
      }, { noAuth: true });
      if (res?.status && res.status !== "success") {
        throw new Error(res.error || res.message || "Invitation failed");
      }
      setSuccess("Request submitted. Your account will be activated after founder approvals.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (e: any) {
      setError(e?.message || "Failed to submit invitation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>
            Request access. You need {requiredApprovals} founder approvals for the {role} role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            )}
            {success && (
              <Alert><AlertDescription>{success}</AlertDescription></Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e)=> setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <div className="flex gap-2">
                <Button type="button" variant={role === 'user' ? 'default' : 'outline'} onClick={()=> setRole('user')}>User</Button>
                <Button type="button" variant={role === 'admin' ? 'default' : 'outline'} onClick={()=> setRole('admin')}>Admin</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="founders">Founder Approvals (IDs or emails, separated by commas or new lines)</Label>
              <textarea id="founders" className="w-full border rounded p-2 h-24 text-sm" value={founders} onChange={(e)=> setFounders(e.target.value)} placeholder="founder1@example.com, founder2@example.com, founder3@example.com" />
              <div className="text-xs text-muted-foreground">Provide at least {requiredApprovals} unique entries.</div>
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={()=> navigate('/login')}>Back to Login</Button>
              <Button type="submit" disabled={submitting || !email}>{submitting ? 'Submitting…' : 'Request Access'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
