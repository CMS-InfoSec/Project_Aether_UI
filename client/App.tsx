import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Governance from "./pages/Governance";
import UserManagement from "./pages/UserManagement";
import Portfolio from "./pages/Portfolio";
import Markets from "./pages/Markets";
import Models from "./pages/Models";
import SystemConfig from "./pages/SystemConfig";
import SystemControl from "./pages/SystemControl";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Builder from "./pages/Builder";
import Feedback from "./pages/Feedback";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

// Layout
import AdminLayout from "./components/AdminLayout";
import { AuthProvider } from "./contexts/AuthContext";

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
            <Route path="/" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="governance/*" element={<Governance />} />
              <Route path="users/*" element={<UserManagement />} />
              <Route path="portfolio/*" element={<Portfolio />} />
              <Route path="markets" element={<Markets />} />
              <Route path="models/*" element={<Models />} />
              <Route path="system/config" element={<SystemConfig />} />
              <Route path="system/control" element={<SystemControl />} />
              <Route path="reports/*" element={<Reports />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="builder" element={<Builder />} />
              <Route path="feedback" element={<Feedback />} />
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
