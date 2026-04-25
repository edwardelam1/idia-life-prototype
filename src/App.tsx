import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
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

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [isFetched, setIsFetched] = useState(false);

  // SOVEREIGN TRACE: Telemetry for the Principal Architect
  useEffect(() => {
    console.log("[START] App Lifecycle: Initializing Sovereign Routing & Auth Manifest...");

    // 1. Fetch initial session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log(`[INFO] Session Sync: ${session ? "Active Session Detected" : "No Session Found"}`);
      setSession(session);
      setIsFetched(true);
    });

    // 2. Listen for login/logout events across the app
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(`[EVENT] Auth State Change: ${_event}`);
      setSession(session);
    });

    return () => {
      console.log("[CLEANUP] App Lifecycle: Unsubscribing from Auth Rail.");
      subscription.unsubscribe();
    };
  }, []);

  // Prevent the app from rendering the wrong route before we know the auth state (Avoids 404 flickering)
  if (!isFetched) {
    return null;
  }

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
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* --- PUBLIC ACCESS --- */}
              <Route path="/auth" element={session ? <Navigate to="/" replace /> : <Auth />} />

              {/* --- PROTECTED CORE --- */}
              <Route path="/" element={session ? <Index /> : <Navigate to="/auth" replace />} />
              <Route path="/dashboard" element={session ? <Index /> : <Navigate to="/auth" replace />} />
              <Route path="/onboarding" element={session ? <Onboarding /> : <Navigate to="/auth" replace />} />
              <Route path="/settings" element={session ? <Settings /> : <Navigate to="/auth" replace />} />

              {/* --- THE SOVEREIGN AIRLOCK --- */}
              {/* This is a protected route because SecureVault needs to update the authenticated profile */}
              <Route path="/secure-vault" element={session ? <SecureVault /> : <Navigate to="/auth" replace />} />

              {/* LEGACY REDIRECT: Catch any underscore mis-formatted attempts */}
              <Route path="/secure_vault" element={<Navigate to="/secure-vault" replace />} />

              {/* --- CATCH-ALL ROUTE --- */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
