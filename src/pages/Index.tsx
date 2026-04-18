import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkState = async () => {
      try {
        // Enforce a 2-second launch sequence so the branding screen is always visible
        const launchDelay = new Promise((resolve) => setTimeout(resolve, 2000));

        // 1. Get current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Wait for the launch delay to elapse before any navigation
        await launchDelay;

        if (!session) {
          // If no session, they must authenticate first.
          // Do NOT show onboarding yet.
          navigate("/auth");
          return;
        }

        // 2. Session exists, check database for onboarding status
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("user_id", session.user.id)
          .single();

        if (error) throw error;

       if (!profile?.onboarding_completed) {
          // 3. User is real but has no Enclave data yet.
          navigate("/onboarding");
        } else {
          // 4. Identity Verified & Sovereignty Established.
          const isHubReturn = sessionStorage.getItem("return_to_hub");
          
          if (isHubReturn === "true") {
            sessionStorage.removeItem("return_to_hub");
            window.location.href = "https://thebigidia.com/dashboard"; // Update to your exact Hub dashboard URL
          } else {
            // Enter the IDIA Life System
           navigate("/dashboard");
          }
        }
      } catch (err) {
        console.error("Index checkState error:", err);
        navigate("/auth");
      } finally {
        setIsLoading(false);
      }
    };

    checkState();
  }, [navigate]);

  // While checking, show a dramatic, welcoming launch sequence
  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Subtle radial glow to create a dramatic, deep space backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.12)_0%,rgba(0,0,0,1)_60%)]" />

      <div className="relative flex flex-col items-center space-y-10 z-10 animate-in fade-in duration-1000 slide-in-from-bottom-4">
        
        {/* Pulsing Aura behind the Polished Logo */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-28 h-28 bg-[#D4AF37] blur-[35px] opacity-30 animate-pulse rounded-full" />
          
          <img 
            src="/images/IDIA_Life_Logo_Polished.png" 
            alt="IDIA Life" 
            className="w-20 h-20 object-contain relative z-10"
            onError={(e) => {
              // Graceful fallback if the image path shifts
              e.currentTarget.style.display = 'none';
              const textFallback = document.createElement('span');
              textFallback.className = 'text-[#D4AF37] text-4xl font-light tracking-[0.2em] relative z-10';
              textFallback.innerText = 'IDIA';
              e.currentTarget.parentElement?.appendChild(textFallback);
            }}
          />
        </div>

        {/* Welcoming Text Sequence */}
        <div className="flex flex-col items-center space-y-5">
          <h1 className="text-2xl md:text-3xl font-light text-white tracking-widest text-center animate-in fade-in zoom-in duration-700 delay-300 fill-mode-both">
            Welcome to the IDIA Protocol.
          </h1>
          
          {/* Lively, organic loading dots */}
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1.2s" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: "150ms", animationDuration: "1.2s" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: "300ms", animationDuration: "1.2s" }} />
          </div>
          
          <p className="text-[10px] sm:text-xs text-[#D4AF37]/80 font-medium uppercase tracking-[0.3em] animate-pulse">
            Establishing Sovereign Connection
          </p>
        </div>

      </div>
    </div>
  );

export default Index;
