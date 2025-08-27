import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import AdminBuilder from "./pages/AdminBuilder";
import AdminFeedback from "./pages/AdminFeedback";

import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

// Layout
import AppLayout from "./components/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
                <Route path="admin/builder" element={<ErrorBoundary><AdminBuilder /></ErrorBoundary>} />
                <Route path="admin/feedback" element={<ErrorBoundary><AdminFeedback /></ErrorBoundary>} />

                {/* Placeholder for unimplemented sections */}
                <Route path="placeholder/:section" element={<ErrorBoundary><PlaceholderPage /></ErrorBoundary>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

createRoot(document.getElementById("root")!).render(<App />);
