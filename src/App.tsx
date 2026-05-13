import { useState, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";

// PAGE IMPORTS
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import SecureVault from "./pages/SecureVault";
import RecoveryPhrase from "./pages/RecoveryPhrase";
import TermsOfService from "./pages/TermsOfService";

// Architectural Note: Defined outside to prevent re-instantiation on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [isFetched, setIsFetched] = useState(false);

  useEffect(() => {
    console.log("[START] App Lifecycle: Initializing Sovereign Routing & Auth Manifest...");

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log(`[INFO] Session Sync: ${session ? "Active Session Detected" : "No Session Found"}`);
      setSession(session);
      setIsFetched(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(`[EVENT] Auth State Change: ${_event}`);
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!isFetched) return null;

  // MARK: - IDIA Protocol: Unified Entry Point (Hydrated)
  // Stripped Wagmi/RainbowKit to route logic natively through the secure wallet architecture
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        themes={["light", "dark"]}
        disableTransitionOnChange
      >
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={session ? <Navigate to="/" replace /> : <Auth />} />
              <Route path="/" element={session ? <Index /> : <Navigate to="/auth" replace />} />
              <Route path="/dashboard" element={session ? <Index /> : <Navigate to="/auth" replace />} />
              <Route path="/onboarding" element={session ? <Onboarding /> : <Navigate to="/auth" replace />} />
              <Route path="/terms" element={session ? <TermsOfService /> : <Navigate to="/auth" replace />} />
              <Route path="/recovery-phrase" element={session ? <RecoveryPhrase /> : <Navigate to="/auth" replace />} />
              <Route path="/settings" element={session ? <Settings /> : <Navigate to="/auth" replace />} />
              <Route path="/secure-vault" element={session ? <SecureVault /> : <Navigate to="/auth" replace />} />
              <Route path="/secure_vault" element={<Navigate to="/secure-vault" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;