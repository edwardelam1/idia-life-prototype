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
        // 1. Get current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

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

        // Inside the checkState function in Index.tsx:
        if (!profile?.onboarding_completed) {
          navigate("/onboarding");
        } else {
          // Navigate to the path defined in App.tsx
          navigate("/dashboard");
        }
      } catch (err: any) {
        console.error("Routing Error:", err.message);
        // Fallback to auth if something breaks
        navigate("/auth");
      } finally {
        setIsLoading(false);
      }
    };

    checkState();
  }, [navigate]);

  // While checking, show a professional loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
          Initializing IDIA Protocol
        </p>
      </div>
    </div>
  );
};

export default Index;
