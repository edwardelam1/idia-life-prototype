import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import WalletDashboard from "./pages/walletdashboard"; // 🚨 ENSURE THIS IMPORT EXISTS
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* The Controller logic lives in Index */}
          <Route path="/" element={<Index />} />

          {/* Auth & Onboarding Paths */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />

          {/* 🚨 THE MISSING LINK: Define the dashboard route explicitly */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Settings / Profile Path */}
          <Route path="/settings" element={<Settings />} />

          {/* Catch-all: If a route is missing, send them back to Index to re-evaluate state */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
