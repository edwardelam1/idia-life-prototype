import { useEffect, useState, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { nextConsentRoute } from "@/config/consent";

interface Props {
  children: ReactNode;
}

/**
 * Wraps authenticated routes and enforces ToS + AoR attestation.
 * Redirects to /terms or /authority-of-record when required.
 */
const ConsentGate = ({ children }: Props) => {
  const location = useLocation();
  const [target, setTarget] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      if (!user) {
        setTarget(null);
        return;
      }
      setTarget(nextConsentRoute(user.user_metadata as any));
    });
    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  if (target === undefined) return null;
  if (target && location.pathname !== target) {
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
};

export default ConsentGate;
