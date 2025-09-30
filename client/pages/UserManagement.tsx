import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  CheckCircle,
  Clock,
  Mail,
  Shield,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  AlertTriangle,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { HelpTip } from "@/components/ui/help-tip";

// Types
interface PendingUser {
  id: string;
  email: string;
  requestedRole: "user" | "admin";
  approvalsReceived: number;
  approvalsNeeded: number;
  invitedAt: string;
  founderApprovals: string[];
}

interface UserSettings {
  stopLossMultiplier: number;
  takeProfitMultiplier: number;
  newsAnalysisEnabled: boolean;
  trailingStop: number;
  riskTier: "low" | "medium" | "high";
}

const FALLBACK_FOUNDERS = [
  { id: "founder1", name: "Founder 1" },
  { id: "founder2", name: "Founder 2" },
  { id: "founder3", name: "Founder 3" },
  { id: "founder4", name: "Founder 4" },
  { id: "founder5", name: "Founder 5" },
];

const MAX_PAGE_LIMIT = 50;

export default function UserManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("invite");

  // Identity & Profile
  const [identity, setIdentity] = useState<any | null>(null);
  const [profile, setProfile] = useState<{
    risk_tier: "aggressive" | "balanced" | "conservative";
  } | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Invite Users State
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "user" as "user" | "admin",
    founderApprovals: [] as string[],
    expiryDays: 7,
  });
  const [isInviting, setIsInviting] = useState(false);

  // Pending Users Queue
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Approval Drawer
  const [approveOpen, setApproveOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [assignedRole, setAssignedRole] = useState<"user" | "admin">("user");
  const [isApproving, setIsApproving] = useState(false);
  const [approvalAuditId, setApprovalAuditId] = useState<string | null>(null);

  // Founders roster
  const [founders, setFounders] =
    useState<Array<{ id: string; email?: string; name: string }>>(
      FALLBACK_FOUNDERS,
    );
  const [bootstrapStatus, setBootstrapStatus] = useState<{
    foundersExist: boolean;
  } | null>(null);
  const [newFounder, setNewFounder] = useState({ email: "", name: "" });
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [foundersError, setFoundersError] = useState<string | null>(null);

  // Personal overrides (v1 config/user)
  const [userSettings, setUserSettings] = useState<UserSettings>({
    stopLossMultiplier: 0.2,
    takeProfitMultiplier: 2.0,
    newsAnalysisEnabled: true,
    trailingStop: 0.05,
    riskTier: "medium",
  });
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [settingsDegraded, setSettingsDegraded] = useState(false);

  // Admin cap inferred from founders count (3 max)
  const adminCapReached = founders && founders.length >= 3;

  // Load identity, profile, founders, and queue
  useEffect(() => {
    (async () => {
      try {
        const [meRes, profRes, foundersRes, bootRes] = await Promise.all([
          apiFetch("/api/auth/me"),
          apiFetch("/api/user/profile"),
          apiFetch("/api/founders"),
          apiFetch("/api/founders/bootstrap-status"),
        ]);
        const me = await meRes.json().catch(() => null);
        const prof = await profRes.json().catch(() => null);
        const fList = await foundersRes.json().catch(() => []);

        // Handle bootstrap-status which intentionally returns 404 when founders exist
        let bStat: any = null;
        try {
          if (bootRes.status === 404) {
            bStat = { foundersExist: true };
          } else {
            bStat = await bootRes.json().catch(() => null);
          }
        } catch {}

        if (me) setIdentity(me);
        if (prof?.status === "success") setProfile(prof.data);
        if (Array.isArray(fList) && fList.length) setFounders(fList);
        else setFounders(FALLBACK_FOUNDERS);
        if (bStat) setBootstrapStatus(bStat);
      } catch {}
    })();
  }, []);

  // Fetch pending users (paginated)
  const fetchPendingUsers = async () => {
    setQueueError(null);
    try {
      const params = new URLSearchParams({
        limit: String(Math.min(limit, MAX_PAGE_LIMIT)),
        offset: String(Math.max(0, offset)),
        search: searchTerm,
      });
      const response = await apiFetch(`/api/users/pending?${params}`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      if ([422, 502, 503, 504].includes(response.status)) {
        setQueueError(data.error || "Queue temporarily unavailable");
        return;
      }
      if (!response.ok || data.status !== "success")
        throw new Error(data.error || "Failed to fetch queue");

      setPendingUsers(data.data.users || []);
      setTotalPending(data.data.total || 0);
      setHasMore(Boolean(data.data.hasMore));
    } catch (error) {
      setQueueError(
        error instanceof Error
          ? error.message
          : "Failed to fetch pending users",
      );
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, [searchTerm, limit, offset]);

  // Invite User
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredApprovals = inviteForm.role === "admin" ? 5 : 3;
    if (
      !inviteForm.email ||
      inviteForm.founderApprovals.length < requiredApprovals
    ) {
      toast({
        title: "Validation Error",
        description: `Email is required and ${requiredApprovals} founder approvals needed for ${inviteForm.role} role.`,
        variant: "destructive",
      });
      return;
    }
    if (adminCapReached && inviteForm.role === "admin") {
      toast({
        title: "Admin Limit",
        description:
          "Maximum of 3 admins reached. Adjust roles before inviting another admin.",
        variant: "destructive",
      });
      return;
    }

    setIsInviting(true);
    try {
      const response = await apiFetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 429) {
        toast({
          title: "Rate limited",
          description: "Please wait and try again.",
          variant: "destructive",
        });
        return;
      }
      if ([422, 502, 503, 504].includes(response.status)) {
        toast({
          title: "Service degraded",
          description: data.error || response.statusText,
          variant: "destructive",
        });
        return;
      }
      if (!response.ok)
        throw new Error(data.error || "Failed to send invitation");

      toast({
        title: "Invitation Sent",
        description: data?.data?.id
          ? `Invite ID: ${data.data.id}`
          : `Invitation sent to ${inviteForm.email}.`,
      });
      setInviteForm({
        email: "",
        role: "user",
        founderApprovals: [],
        expiryDays: 7,
      });
      setOffset(0);
      await fetchPendingUsers();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleFounderToggle = (founderId: string) => {
    setInviteForm((prev) => ({
      ...prev,
      founderApprovals: prev.founderApprovals.includes(founderId)
        ? prev.founderApprovals.filter((id) => id !== founderId)
        : [...prev.founderApprovals, founderId],
    }));
  };

  // Approvals
  const handleApproveSelected = async () => {
    if (!selectedUser) return;
    if (adminCapReached && assignedRole === "admin") {
      toast({
        title: "Admin Limit",
        description:
          "Maximum of 3 admins reached. Adjust roles before approving another admin.",
        variant: "destructive",
      });
      return;
    }
    setIsApproving(true);
    try {
      const response = await apiFetch("/api/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, assignedRole }),
      });
      const data = await response.json().catch(() => ({}));
      if ([422, 502, 503, 504].includes(response.status)) {
        toast({
          title: "Service degraded",
          description: data.error || response.statusText,
          variant: "destructive",
        });
        return;
      }
      if (!response.ok) throw new Error(data.error || "Failed to approve user");

      setApprovalAuditId(data?.data?.audit_id || null);
      toast({
        title: "User Approved",
        description: "Activation complete. View audit for details.",
      });
      setApproveOpen(false);
      setSelectedUser(null);
      await fetchPendingUsers();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to approve user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      const response = await apiFetch(`/api/users/pending/${userId}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to reject user");
      toast({
        title: "User Rejected",
        description: "User invitation has been rejected.",
      });
      await fetchPendingUsers();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to reject user. Please try again.",
        variant: "destructive",
      });
    }
  };

  // User settings
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const response = await apiFetch("/api/v1/config/user");
        const j = await response.json().catch(() => ({}));
        if (response.ok) {
          const d = j?.data || j || {};
          if (typeof d.supabase_degraded === "boolean") setSettingsDegraded(!!d.supabase_degraded);
          const mapped: UserSettings = {
            stopLossMultiplier: Number(d.stopLossMultiplier ?? d.stop_loss_multiplier ?? 0.2),
            takeProfitMultiplier: Number(d.takeProfitMultiplier ?? d.take_profit_multiplier ?? 2.0),
            newsAnalysisEnabled: Boolean(d.newsAnalysisEnabled ?? d.news_analysis_enabled ?? true),
            trailingStop: Number(d.trailingStop ?? d.trailing_stop ?? 0.05),
            riskTier: (d.riskTier ?? d.risk_tier ?? "medium") as any,
          };
          setUserSettings(mapped);
        }
      } catch {}
    };
    fetchUserSettings();
  }, []);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      userSettings.stopLossMultiplier < 0.1 ||
      userSettings.stopLossMultiplier > 1.0
    ) {
      toast({
        title: "Validation Error",
        description: "Stop-loss multiplier must be between 0.1 and 1.0.",
        variant: "destructive",
      });
      return;
    }
    if (userSettings.takeProfitMultiplier < 1.0) {
      toast({
        title: "Validation Error",
        description: "Take-profit multiplier must be at least 1.0.",
        variant: "destructive",
      });
      return;
    }
    if (userSettings.trailingStop <= 0) {
      toast({
        title: "Validation Error",
        description: "Trailing stop must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingSettings(true);
    try {
      const payload = {
        stopLossMultiplier: userSettings.stopLossMultiplier,
        takeProfitMultiplier: userSettings.takeProfitMultiplier,
        newsAnalysisEnabled: userSettings.newsAnalysisEnabled,
        trailingStop: userSettings.trailingStop,
        riskTier: userSettings.riskTier,
      };
      const response = await apiFetch("/api/v1/config/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Failed to save settings");
      setSettingsDegraded(Boolean(data?.supabase_degraded || data?.data?.supabase_degraded));
      toast({ title: "Settings Saved", description: "Preferences updated." });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Founders helpers
  const refreshFounders = async () => {
    setFoundersError(null);
    try {
      const r = await apiFetch("/api/founders");
      if (r.ok) {
        const j = await r.json();
        setFounders(Array.isArray(j) && j.length ? j : FALLBACK_FOUNDERS);
      } else {
        setFounders(FALLBACK_FOUNDERS);
      }
    } catch {
      setFounders(FALLBACK_FOUNDERS);
    }
  };

  const tryBootstrap = async () => {
    setIsBootstrapping(true);
    try {
      const r = await apiFetch("/api/founders/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newFounder.email,
          password: "ChangeMe123!",
          name: newFounder.name,
        }),
      });
      if (r.status === 404 || r.status === 503) {
        setFoundersError("Bootstrap unavailable: maintenance");
        return;
      }
      if (r.status === 409) {
        toast({
          title: "Already bootstrapped",
          description: "Founders already exist",
        });
        await refreshFounders();
        return;
      }
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Bootstrap failed");
      }
      toast({ title: "Founder created", description: "Bootstrap successful" });
      await Promise.all([refreshFounders()]);
      setBootstrapStatus({ foundersExist: true });
    } catch (e: any) {
      setFoundersError(e.message || "Bootstrap failed");
    } finally {
      setIsBootstrapping(false);
    }
  };

  const removeFounder = async (id: string) => {
    if (!confirm("Remove founder? This may force logout.")) return;
    try {
      const r = await apiFetch(`/api/founders/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Failed to remove founder");
      }
      toast({ title: "Founder removed" });
      await refreshFounders();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to remove founder",
        variant: "destructive",
      });
    }
  };

  const updateRiskTier = async (
    tier: "aggressive" | "balanced" | "conservative",
  ) => {
    setIsUpdatingProfile(true);
    try {
      const r = await apiFetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ risk_tier: tier }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Failed to update profile");
      setProfile(j.data || { risk_tier: tier });
      toast({
        title: "Profile Updated",
        description: `Risk tier set to ${tier}`,
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to update risk tier",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-96">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Admin privileges required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Invite, approve, and manage users, founders, and settings
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/20"
          >
            <Users className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
          <Badge
            variant="outline"
            className="bg-accent/10 text-accent border-accent/20"
          >
            {totalPending} Pending
          </Badge>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5 md:grid-cols-6">
          <TabsTrigger value="invite">Invite</TabsTrigger>
          <TabsTrigger value="pending">Pending Queue</TabsTrigger>
          <TabsTrigger value="approve">Approvals</TabsTrigger>
          <TabsTrigger value="founders">Founders</TabsTrigger>
          <TabsTrigger value="profile">Identity & Risk</TabsTrigger>
          <TabsTrigger value="settings">Overrides</TabsTrigger>
        </TabsList>

        {/* Invite */}
        <TabsContent value="invite" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span className="inline-flex items-center gap-2">Invite New User <HelpTip content="Send invites that require founder approvals. Admin invites require all 5 founders." /></span>
              </CardTitle>
              <CardDescription>
                Governance-gated invitation orchestration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInviteSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="inline-flex items-center gap-2">Email Address <HelpTip content="Recipient email to invite." /></Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteForm.email}
                      onChange={(e) =>
                        setInviteForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="inline-flex items-center gap-2">Initial Role <HelpTip content="Role granted on activation. Admin requires 5 founder approvals and counts toward admin cap." /></Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(value: "user" | "admin") =>
                        setInviteForm((prev) => ({ ...prev, role: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry" className="inline-flex items-center gap-2">Expiry (days) <HelpTip content="Days before the invite link expires." /></Label>
                    <Input
                      id="expiry"
                      type="number"
                      min={1}
                      max={30}
                      value={inviteForm.expiryDays}
                      onChange={(e) =>
                        setInviteForm((prev) => ({
                          ...prev,
                          expiryDays: Math.max(
                            1,
                            Math.min(30, parseInt(e.target.value) || 7),
                          ),
                        }))
                      }
                    />
                    <div className="text-xs text-muted-foreground">
                      Default 7 days
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="inline-flex items-center gap-2">
                      Founder Approvals ({inviteForm.founderApprovals.length}/5
                      selected) <HelpTip content="Select founders to authorize this invite. Admins require all 5; users require at least 3." />
                    </Label>
                    <Badge
                      variant={
                        inviteForm.founderApprovals.length >= 3
                          ? "default"
                          : "destructive"
                      }
                    >
                      {inviteForm.founderApprovals.length >= 3
                        ? "Valid Quorum"
                        : "Need 3 minimum"}
                    </Badge>
                  </div>
                  {inviteForm.role === "admin" &&
                    (inviteForm.founderApprovals.length < 5 ||
                      adminCapReached) && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {adminCapReached
                            ? "Admin cap reached (3). Adjust roles before adding another admin."
                            : `Admin role requires all 5 founder approvals. Currently selected: ${inviteForm.founderApprovals.length}/5`}
                        </AlertDescription>
                      </Alert>
                    )}
                  <div className="grid gap-3 md:grid-cols-2">
                    {founders.map((founder) => (
                      <div
                        key={founder.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg"
                      >
                        <input
                          type="checkbox"
                          id={founder.id}
                          checked={inviteForm.founderApprovals.includes(
                            founder.id,
                          )}
                          onChange={() => handleFounderToggle(founder.id)}
                          className="rounded border-gray-300"
                        />
                        <Label
                          htmlFor={founder.id}
                          className="flex-1 cursor-pointer"
                        >
                          {founder.name || founder.email}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isInviting ||
                    !inviteForm.email ||
                    inviteForm.founderApprovals.length <
                      (inviteForm.role === "admin" ? 5 : 3)
                  }
                >
                  {isInviting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" /> Sending
                      Invitation...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" /> Send Invitation
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Queue */}
        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="inline-flex items-center gap-2">Pending Users <HelpTip content="Invited users awaiting governance approval. Approve once quorum is met." /></CardTitle>
                  <CardDescription>
                    Paginated queue with governance status
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by email..."
                      value={searchTerm}
                      onChange={(e) => {
                        setOffset(0);
                        setSearchTerm(e.target.value);
                      }}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select
                    value={String(limit)}
                    onValueChange={(v) => {
                      setOffset(0);
                      setLimit(Math.min(parseInt(v) || 10, MAX_PAGE_LIMIT));
                    }}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="20">20 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {queueError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{queueError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-3">
                {pendingUsers.map((u) => (
                  <div key={u.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{u.email}</div>
                        <div className="text-sm text-muted-foreground">
                          Requested: {u.requestedRole} • Invited:{" "}
                          {new Date(u.invitedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            u.approvalsReceived >= u.approvalsNeeded
                              ? "default"
                              : "secondary"
                          }
                        >
                          {u.approvalsReceived}/{u.approvalsNeeded} approvals
                        </Badge>
                        <Badge variant="outline">{u.requestedRole}</Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Approval Progress</span>
                        <span>
                          {Math.round(
                            (u.approvalsReceived / u.approvalsNeeded) * 100,
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`${u.approvalsReceived >= u.approvalsNeeded ? "bg-accent" : "bg-primary"} h-2 rounded-full`}
                          style={{
                            width: `${(u.approvalsReceived / u.approvalsNeeded) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectUser(u.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedUser(u);
                          setAssignedRole(u.requestedRole);
                          setApproveOpen(true);
                        }}
                        disabled={!(u.approvalsReceived >= u.approvalsNeeded)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}

                {pendingUsers.length === 0 && !queueError && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    <p>No pending users</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="text-sm text-muted-foreground">
                    Total: {totalPending}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                      disabled={offset === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {totalPending === 0 ? 0 : offset + 1}-
                      {Math.min(offset + limit, totalPending)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setOffset(hasMore ? offset + limit : offset)
                      }
                      disabled={!hasMore}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval Drawer */}
          <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="inline-flex items-center gap-2">Approve User <HelpTip content="Confirm role and finalize activation for the selected user." /></DialogTitle>
                <DialogDescription>
                  Verify quorum, role, and proceed
                </DialogDescription>
              </DialogHeader>
              {selectedUser && (
                <div className="space-y-4">
                  <div className="text-sm">
                    {selectedUser.email} • Requested:{" "}
                    {selectedUser.requestedRole}
                  </div>
                  <div className="space-y-2">
                    <Label className="inline-flex items-center gap-2">Assigned Role <HelpTip content="Role to grant on activation. Admin may be blocked if admin cap (3) is reached." /></Label>
                    <Select
                      value={assignedRole}
                      onValueChange={(v: "user" | "admin") =>
                        setAssignedRole(v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {adminCapReached && assignedRole === "admin" && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Admin cap reached (3). Adjust roles first.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge
                      variant={
                        selectedUser.approvalsReceived >=
                        selectedUser.approvalsNeeded
                          ? "default"
                          : "secondary"
                      }
                    >
                      {selectedUser.approvalsReceived}/
                      {selectedUser.approvalsNeeded} approvals
                    </Badge>
                    <span>
                      Supermajority {selectedUser.approvalsNeeded} required
                    </span>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setApproveOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleApproveSelected}
                  disabled={
                    isApproving ||
                    !selectedUser ||
                    (adminCapReached && assignedRole === "admin")
                  }
                >
                  {isApproving ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />{" "}
                      Approving...
                    </>
                  ) : (
                    "Approve"
                  )}
                </Button>
              </DialogFooter>
              {approvalAuditId && (
                <div className="pt-2 text-xs">
                  <a
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                    href={`/audit?ref=${approvalAuditId}`}
                  >
                    <ExternalLink className="h-3 w-3" /> View Audit
                  </a>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Approvals (quick selector) */}
        <TabsContent value="approve" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span className="inline-flex items-center gap-2">Approve Users <HelpTip content="Review pending registrations and finalize activation once approvals meet requirements." /></span>
              </CardTitle>
              <CardDescription>
                Review and approve pending registrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="inline-flex items-center gap-2">Select User to Approve <HelpTip content="Choose a user who has reached the required approval threshold." /></Label>
                <Select
                  value={selectedUser?.id || ""}
                  onValueChange={(id) => {
                    const u = pendingUsers.find((p) => p.id === id) || null;
                    setSelectedUser(u);
                    setAssignedRole(u?.requestedRole || "user");
                    setApproveOpen(!!u);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a pending user" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingUsers
                      .filter((u) => u.approvalsReceived >= u.approvalsNeeded)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.email} - {u.requestedRole} ({u.approvalsReceived}/
                          {u.approvalsNeeded} approvals)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {pendingUsers.filter(
                (u) => u.approvalsReceived >= u.approvalsNeeded,
              ).length === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No users currently have sufficient approvals.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Founders */}
        <TabsContent value="founders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">Founders Roster <HelpTip content="Manage founder accounts and bootstrap initial access if not yet set up." /></CardTitle>
              <CardDescription>
                Manage founder records and bootstrap
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {foundersError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{foundersError}</AlertDescription>
                </Alert>
              )}
              <div className="p-3 border rounded-md bg-muted/50 text-sm">
                Bootstrap status:{" "}
                {bootstrapStatus?.foundersExist
                  ? "Founders exist"
                  : "Eligible for bootstrap"}
              </div>
              {!bootstrapStatus?.foundersExist && (
                <div className="grid gap-3 md:grid-cols-3 items-end">
                  <div className="space-y-1">
                    <Label className="inline-flex items-center gap-2">Email <HelpTip content="Email for the new founder to bootstrap the system." /></Label>
                    <Input
                      value={newFounder.email}
                      onChange={(e) =>
                        setNewFounder((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="founder@example.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="inline-flex items-center gap-2">Name <HelpTip content="Display name for the founder account." /></Label>
                    <Input
                      value={newFounder.name}
                      onChange={(e) =>
                        setNewFounder((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Full name"
                    />
                  </div>
                  <Button
                    onClick={tryBootstrap}
                    disabled={
                      isBootstrapping || !newFounder.email || !newFounder.name
                    }
                  >
                    {isBootstrapping ? "Bootstrapping..." : "Bootstrap Founder"}
                  </Button>
                </div>
              )}

              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium">Current Founders</div>
                <div className="space-y-2">
                  {founders.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="text-sm">
                        {f.name || f.email}{" "}
                        <span className="text-muted-foreground">({f.id})</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFounder(f.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={refreshFounders}>
                  <Clock className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Identity & Risk */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">Operator Identity <HelpTip content="Current session identity and role." /></CardTitle>
              <CardDescription>Session and profile context</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="p-3 border rounded-md">
                {identity ? (
                  <div>
                    Email: {identity?.email || "unknown"} • Role:{" "}
                    {identity?.role || "unknown"}
                  </div>
                ) : (
                  "Loading identity..."
                )}
              </div>
              <div className="space-y-2">
                <Label className="inline-flex items-center gap-2">Risk Tier <HelpTip content="Set your global risk appetite for strategy behavior." /></Label>
                <Select
                  value={profile?.risk_tier || "balanced"}
                  onValueChange={(
                    v: "aggressive" | "balanced" | "conservative",
                  ) => updateRiskTier(v)}
                  disabled={isUpdatingProfile}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="conservative">Conservative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overrides */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span className="inline-flex items-center gap-2">Trading Preferences <HelpTip content="Configure personal trade and risk parameters for this account." /></span>
              </CardTitle>
              <CardDescription>
                Configure your personal trading settings and risk parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settingsDegraded && (
                <Alert className="mb-4">
                  <AlertDescription>Settings service degraded; changes may be delayed.</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSettingsSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="stopLoss" className="inline-flex items-center gap-2">Stop-loss Multiplier <HelpTip content="Fraction of entry price for stop-loss; valid range 0.1–1.0." /></Label>
                    <Input
                      id="stopLoss"
                      type="number"
                      min="0.1"
                      max="1.0"
                      step="0.01"
                      value={userSettings.stopLossMultiplier}
                      onChange={(e) =>
                        setUserSettings((prev) => ({
                          ...prev,
                          stopLossMultiplier: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Range: 0.1 - 1.0
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="takeProfit" className="inline-flex items-center gap-2">Take-profit Multiplier <HelpTip content="Target profit multiple; must be at least 1.0." /></Label>
                    <Input
                      id="takeProfit"
                      type="number"
                      min="1.0"
                      step="0.1"
                      value={userSettings.takeProfitMultiplier}
                      onChange={(e) =>
                        setUserSettings((prev) => ({
                          ...prev,
                          takeProfitMultiplier: parseFloat(e.target.value) || 1,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum: 1.0
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trailingStop" className="inline-flex items-center gap-2">Trailing Stop <HelpTip content="Dynamic stop that trails price by a percentage; must be greater than 0." /></Label>
                    <Input
                      id="trailingStop"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={userSettings.trailingStop}
                      onChange={(e) =>
                        setUserSettings((prev) => ({
                          ...prev,
                          trailingStop: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be greater than 0
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="inline-flex items-center gap-2">Risk Tier <HelpTip content="Overall trading risk preference: Low, Medium, or High." /></Label>
                    <Select
                      value={userSettings.riskTier}
                      onValueChange={(value: "low" | "medium" | "high") =>
                        setUserSettings((prev) => ({
                          ...prev,
                          riskTier: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <Switch
                    id="newsAnalysis"
                    checked={userSettings.newsAnalysisEnabled}
                    onCheckedChange={(checked) =>
                      setUserSettings((prev) => ({
                        ...prev,
                        newsAnalysisEnabled: checked,
                      }))
                    }
                  />
                  <div className="flex-1">
                    <Label htmlFor="newsAnalysis" className="cursor-pointer inline-flex items-center gap-2">
                      Enable News Analysis <HelpTip content="Toggle inclusion of news sentiment in signal generation." />
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Include news sentiment analysis in trading signals
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isUpdatingSettings}
                >
                  {isUpdatingSettings ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" /> Saving
                      Settings...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Save Settings
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
