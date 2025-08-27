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
import Staking from "./pages/Staking";
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
              <Route index element={<UserDashboard />} />
              
              {/* User Pages (accessible to both USER and ADMIN) */}
              <Route path="dashboard" element={<UserDashboard />} />
              <Route path="trades" element={<TradesPositions />} />
              <Route path="wallet" element={<WalletHedge />} />
              <Route path="staking" element={<Staking />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="notifications" element={<UserNotifications />} />
              <Route path="reports" element={<UserReports />} />
              
              {/* Admin Pages (ADMIN only) */}
              <Route path="admin/dashboard" element={<AdminDashboard />} />
              <Route path="admin/governance" element={<AdminGovernance />} />
              <Route path="admin/users" element={<AdminUserManagement />} />
              <Route path="admin/portfolio" element={<AdminPortfolio />} />
              <Route path="admin/markets" element={<AdminMarkets />} />
              <Route path="admin/models" element={<AdminModels />} />
              <Route path="admin/system/config" element={<AdminSystemConfig />} />
              <Route path="admin/system/control" element={<AdminSystemControl />} />
              <Route path="admin/backtest" element={<AdminBacktest />} />
              <Route path="admin/builder" element={<AdminBuilder />} />
              <Route path="admin/feedback" element={<AdminFeedback />} />
              
              {/* Placeholder for unimplemented sections */}
              <Route path="placeholder/:section" element={<PlaceholderPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
