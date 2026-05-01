import { useState, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";

// WEB3 INFRASTRUCTURE IMPORTS
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider, http } from "wagmi";
import { mainnet, base, polygon } from "wagmi/chains";

// PAGE IMPORTS
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import SecureVault from "./pages/SecureVault";

// 1. Configure the Sovereign Bridge (RainbowKit/Wagmi)
const config = getDefaultConfig({
  appName: "IDIA Life",
  projectId: "IDIA_V1_PROTOTYPE",
  chains: [mainnet, base, polygon],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [polygon.id]: http(),
  },
  ssr: false,
});

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
  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: "#14b8a6" })}>
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
                  <Route path="/settings" element={session ? <Settings /> : <Navigate to="/auth" replace />} />
                  <Route path="/secure-vault" element={session ? <SecureVault /> : <Navigate to="/auth" replace />} />
                  <Route path="/secure_vault" element={<Navigate to="/secure-vault" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;
