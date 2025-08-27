import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

// Pages
import Login from "./pages/Login";

// User Pages (accessible to both USER and ADMIN)
import UserDashboard from "./pages/UserDashboard";
import TradesPositions from "./pages/TradesPositions";
import WalletHedge from "./pages/WalletHedge";
import ProfileSettings from "./pages/ProfileSettings";
import UserNotifications from "./pages/UserNotifications";
import UserReports from "./pages/UserReports";

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
      const response = await fetch('/api/founders/bootstrap-status');
      if (response.ok) {
        const data = await response.json();
        setFoundersExist(data.foundersExist);
      }
    } catch (error) {
      console.error('Failed to check bootstrap status:', error);
      // If we can't check status, assume founders exist to avoid blocking
      setFoundersExist(true);
    } finally {
      setIsCheckingBootstrap(false);
    }
  };

  const handleBootstrap = async (formData: { email: string; password: string; name: string }): Promise<boolean> => {
    try {
      const response = await fetch('/api/founders/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Successfully created founder, navigate to login
        navigate('/login');
        return true;
      } else {
        const errorData = await response.json();
        console.error('Bootstrap failed:', errorData.error);
        return false;
      }
    } catch (error) {
      console.error('Bootstrap request failed:', error);
      return false;
    }
  };

  // Show loading state while checking bootstrap status
  if (isCheckingBootstrap) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no founders exist, show the CreateFounderForm
  if (foundersExist === false) {
    return <CreateFounderForm onSubmit={handleBootstrap} />;
  }

  // Normal app routing
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AppLayout />}>
        {/* Default redirect to dashboard */}
        <Route index element={<ErrorBoundary><UserDashboard /></ErrorBoundary>} />

        {/* User Pages (accessible to both USER and ADMIN) */}
        <Route path="dashboard" element={<ErrorBoundary><UserDashboard /></ErrorBoundary>} />
        <Route path="trades" element={<ErrorBoundary><TradesPositions /></ErrorBoundary>} />
        <Route path="wallet" element={<ErrorBoundary><WalletHedge /></ErrorBoundary>} />
        <Route path="profile" element={<ErrorBoundary><ProfileSettings /></ErrorBoundary>} />
        <Route path="notifications" element={<ErrorBoundary><UserNotifications /></ErrorBoundary>} />
        <Route path="reports" element={<ErrorBoundary><UserReports /></ErrorBoundary>} />

        {/* Admin Pages (ADMIN only) */}
        <Route path="admin/dashboard" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
        <Route path="admin/governance" element={<ErrorBoundary><AdminGovernance /></ErrorBoundary>} />
        <Route path="admin/users" element={<ErrorBoundary><AdminUserManagement /></ErrorBoundary>} />
        <Route path="admin/portfolio" element={<ErrorBoundary><AdminPortfolio /></ErrorBoundary>} />
        <Route path="admin/markets" element={<ErrorBoundary><AdminMarkets /></ErrorBoundary>} />
        <Route path="admin/models" element={<ErrorBoundary><AdminModels /></ErrorBoundary>} />
        <Route path="admin/system/config" element={<ErrorBoundary><AdminSystemConfig /></ErrorBoundary>} />
        <Route path="admin/system/control" element={<ErrorBoundary><AdminSystemControl /></ErrorBoundary>} />
        <Route path="admin/backtest" element={<ErrorBoundary><AdminBacktest /></ErrorBoundary>} />
        <Route path="admin/feedback" element={<ErrorBoundary><AdminFeedback /></ErrorBoundary>} />

        {/* Placeholder for unimplemented sections */}
        <Route path="placeholder/:section" element={<ErrorBoundary><PlaceholderPage /></ErrorBoundary>} />
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

createRoot(document.getElementById("root")!).render(<App />);
