import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";

import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [isFetched, setIsFetched] = useState(false);

  useEffect(() => {
    // 1. Fetch initial session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsFetched(true);
    });

    // 2. Listen for login/logout events across the app
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Prevent the app from rendering the wrong route before we know the auth state
  if (!isFetched) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        themes={["light", "dark"]}
        disableTransitionOnChange
      >
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Auth Route: If already logged in, push to the dashboard (Index) */}
              <Route path="/auth" element={session ? <Navigate to="/" replace /> : <Auth />} />

              {/* Protected Routes: If NOT logged in, push to the Auth screen */}
              <Route path="/" element={session ? <Index /> : <Navigate to="/auth" replace />} />
              <Route path="/dashboard" element={session ? <Index /> : <Navigate to="/auth" replace />} />
              <Route path="/onboarding" element={session ? <Onboarding /> : <Navigate to="/auth" replace />} />
              <Route path="/settings" element={session ? <Settings /> : <Navigate to="/auth" replace />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
