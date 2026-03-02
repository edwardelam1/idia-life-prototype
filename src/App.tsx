import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

// Pages
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import UpdatePassword from "./pages/UpdatePassword"; // <-- Added this for the new screen

const queryClient = new QueryClient();

// 1. The Deep Link Listener Component
const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the OS telling the app to open via a URL
    CapacitorApp.addListener("appUrlOpen", (event) => {
      const url = event.url;

      // If the link is our specific password reset protocol...
      if (url.includes("idialife://update-password")) {
        // Supabase attaches the secure token after the '#' symbol
        const hashFragments = url.split("#")[1];

        if (hashFragments) {
          // Instantly force the app to route to the Update Password screen
          navigate(`/update-password#${hashFragments}`);
        }
      }
    });

    // Cleanup the listener if the app closes
    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [navigate]);

  return null; // It renders nothing to the screen
};

const App = () => (
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
          <DeepLinkHandler /> {/* <-- LISTENS FOR THE EMAIL LINK */}
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/update-password" element={<UpdatePassword />} /> {/* <-- ROUTE ADDED */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
