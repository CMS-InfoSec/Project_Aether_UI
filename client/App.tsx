import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import apiFetch from "@/lib/apiClient";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";

// Pages
import Login from "./pages/Login";
import ResetConfirm from "./pages/ResetConfirm";
import Signup from "./pages/Signup";

// User Pages (accessible to both USER and ADMIN)
import UserDashboard from "./pages/UserDashboard";
import TradesPositions from "./pages/TradesPositions";
import TradeDetails from "./pages/TradeDetails";
import WalletHedge from "./pages/WalletHedge";
import AIAssistant from "./pages/AIAssistant";
import ProfileSettings from "./pages/ProfileSettings";
import UserNotifications from "./pages/UserNotifications";
import UserReports from "./pages/UserReports";
import Observability from "./pages/Observability";
import AuditLogs from "./pages/AuditLogs";
import StrategiesSignals from "./pages/StrategiesSignals";

// Admin Pages (ADMIN only)
import AdminDashboard from "./pages/AdminDashboard";
import AdminGovernance from "./pages/AdminGovernance";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminPortfolio from "./pages/AdminPortfolio";
import AdminMarkets from "./pages/AdminMarkets";
import AdminModels from "./pages/AdminModels";
import AdminSystemConfig from "./pages/AdminSystemConfig";
import AdminSystemControl from "./pages/AdminSystemControl";
import AdminBacktest from "./pages/AdminBacktest";
import AdminFeedback from "./pages/AdminFeedback";
import AdminASC from "./pages/AdminASC";
import AdminStrategyReview from "./pages/AdminStrategyReview";
import AdminPlugins from "./pages/AdminPlugins";
import AdminAutomationSocial from "./pages/AdminAutomationSocial";
import AdminPushConsole from "./pages/AdminPushConsole";
import AdminSystemTasks from "./pages/AdminSystemTasks";

import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

// Layout
import AppLayout from "./components/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import CreateFounderForm from "./components/CreateFounderForm";

const queryClient = new QueryClient();

const AppRouter = () => {
  const [foundersExist, setFoundersExist] = useState<boolean | null>(null);
  const [isCheckingBootstrap, setIsCheckingBootstrap] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkBootstrapStatus();
  }, []);

  const checkBootstrapStatus = async () => {
    try {
      const response = await apiFetch("/api/founders/bootstrap-status", {
        // Prevent caching issues
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      // Server semantics: 404 indicates bootstrap is disabled because founders already exist
      if (response.status === 404) {
        setFoundersExist(true);
      } else if (response.ok) {
        const data = await response.json().catch(() => ({}) as any);
        console.log("Bootstrap status:", data);
        setFoundersExist(!!data.foundersExist);
      } else {
        // Unexpected non-OK response (not 404) - treat as non-blocking by assuming founders exist
        console.warn(
          "Bootstrap status check unexpected response:",
          response.status,
          response.statusText,
        );
        setFoundersExist(true);
      }
    } catch (error) {
      console.error("Failed to check bootstrap status:", error);
      // If we can't check status, assume founders exist to avoid blocking
      setFoundersExist(true);
    } finally {
      setIsCheckingBootstrap(false);
    }
  };

  const handleBootstrap = async (formData: {
    email: string;
    password: string;
    name: string;
    user_id?: string;
  }): Promise<boolean> => {
    try {
      const response = await apiFetch("/api/founders/bootstrap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Successfully created founder, navigate to login
        navigate("/login");
        return true;
      } else {
        // Handle error response safely
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // If we can't parse JSON, use the status text or a generic message
          errorMessage = response.statusText || errorMessage;
        }

        console.error("Bootstrap failed:", errorMessage);

        // If we get a 409, it means founders already exist - refresh status
        if (response.status === 409) {
          console.log("Founders already exist, refreshing bootstrap status...");
          await checkBootstrapStatus();
        }

        return false;
      }
    } catch (error) {
      console.error("Bootstrap request failed:", error);
      return false;
    }
  };

  // Show loading state while checking bootstrap status
  if (isCheckingBootstrap) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking system status...</p>
          <button
            onClick={() => {
              setFoundersExist(true);
              setIsCheckingBootstrap(false);
            }}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Skip to Login (Development)
          </button>
        </div>
      </div>
    );
  }

  // If no founders exist, show the CreateFounderForm
  if (foundersExist === false) {
    return (
      <div>
        <CreateFounderForm onSubmit={handleBootstrap} />
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => {
              setIsCheckingBootstrap(true);
              checkBootstrapStatus();
            }}
            className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
          >
            Refresh Status
          </button>
        </div>
      </div>
    );
  }

  // Normal app routing
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/reset/confirm"
        element={
          <ErrorBoundary>
            <ResetConfirm />
          </ErrorBoundary>
        }
      />
      <Route path="/" element={<AppLayout />}>
        {/* Default redirect to dashboard */}
        <Route
          index
          element={
            <ErrorBoundary>
              <UserDashboard />
            </ErrorBoundary>
          }
        />

        {/* User Pages (accessible to both USER and ADMIN) */}
        <Route
          path="dashboard"
          element={
            <ErrorBoundary>
              <UserDashboard />
            </ErrorBoundary>
          }
        />
        <Route
          path="trades"
          element={
            <ErrorBoundary>
              <TradesPositions />
            </ErrorBoundary>
          }
        />
        <Route
          path="trades/:id"
          element={
            <ErrorBoundary>
              <TradeDetails />
            </ErrorBoundary>
          }
        />
        <Route
          path="wallet"
          element={
            <ErrorBoundary>
              <WalletHedge />
            </ErrorBoundary>
          }
        />
        <Route
          path="assistant"
          element={
            <ErrorBoundary>
              <AIAssistant />
            </ErrorBoundary>
          }
        />
        <Route
          path="profile"
          element={
            <ErrorBoundary>
              <ProfileSettings />
            </ErrorBoundary>
          }
        />
        <Route
          path="notifications"
          element={
            <ErrorBoundary>
              <UserNotifications />
            </ErrorBoundary>
          }
        />
        <Route
          path="reports"
          element={
            <ErrorBoundary>
              <UserReports />
            </ErrorBoundary>
          }
        />
        <Route
          path="observability"
          element={
            <ErrorBoundary>
              <Observability />
            </ErrorBoundary>
          }
        />
        <Route
          path="audit"
          element={
            <ErrorBoundary>
              <AuditLogs />
            </ErrorBoundary>
          }
        />
        <Route
          path="strategies"
          element={
            <ErrorBoundary>
              <StrategiesSignals />
            </ErrorBoundary>
          }
        />

        {/* Admin Pages (ADMIN only) */}
        <Route
          path="admin/dashboard"
          element={
            <ErrorBoundary>
              <AdminDashboard />
            </ErrorBoundary>
          }
        />
        <Route
          path="admin/governance"
          element={<Navigate to="/admin/dashboard?tab=governance" replace />}
        />
        <Route
          path="admin/users"
          element={
            <ErrorBoundary>
              <AdminUserManagement />
            </ErrorBoundary>
          }
        />
        <Route
          path="admin/portfolio"
          element={<Navigate to="/admin/dashboard?tab=portfolio" replace />}
        />
        <Route
          path="admin/markets"
          element={
            <ErrorBoundary>
              <AdminMarkets />
            </ErrorBoundary>
          }
        />
        <Route
          path="admin/models"
          element={
            <ErrorBoundary>
              <AdminModels />
            </ErrorBoundary>
          }
        />
        <Route
          path="admin/asc"
          element={
            <ErrorBoundary>
              <AdminASC />
            </ErrorBoundary>
          }
        />
        <Route
          path="admin/system/config"
          element={<Navigate to="/admin/dashboard?tab=config" replace />}
        />
        <Route
          path="admin/system/control"
          element={
            <ErrorBoundary>
              <AdminSystemControl />
            </ErrorBoundary>
          }
        />
        <Route
          path="admin/backtest"
          element={<Navigate to="/admin/dashboard?tab=reports" replace />}
        />
        <Route
          path="admin/feedback"
          element={<Navigate to="/admin/dashboard?tab=feedback" replace />}
        />
        <Route
          path="admin/strategy-review"
          element={<Navigate to="/admin/dashboard?tab=review" replace />}
        />
        <Route
          path="admin/plugins"
          element={<Navigate to="/admin/dashboard?tab=plugins" replace />}
        />
        <Route
          path="admin/automation-social"
          element={<Navigate to="/admin/dashboard?tab=automation" replace />}
        />
        <Route
          path="admin/push-console"
          element={
            <ErrorBoundary>
              <AdminPushConsole />
            </ErrorBoundary>
          }
        />
        <Route
          path="admin/system/tasks"
          element={
            <ErrorBoundary>
              <AdminSystemTasks />
            </ErrorBoundary>
          }
        />

        {/* Placeholder for unimplemented sections */}
        <Route
          path="placeholder/:section"
          element={
            <ErrorBoundary>
              <PlaceholderPage />
            </ErrorBoundary>
          }
        />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

// Reuse root across HMR to avoid createRoot being called multiple times
const container = document.getElementById("root")!;
const __rootKey = "__aether_root_v1__";
let root: import("react-dom").Root | undefined = (window as any)[__rootKey];
if (!root) {
  root = createRoot(container as HTMLElement);
  (window as any)[__rootKey] = root;
}
root.render(<App />);
