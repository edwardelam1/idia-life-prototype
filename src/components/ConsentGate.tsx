import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";
import { nextConsentRoute } from "@/config/consent";

interface Props {
  children: ReactNode;
}

/**
 * Wraps authenticated routes and enforces ToS + AoR attestation.
 * Redirects to /terms or /authority-of-record when required.
 *
 * Reads the cached auth user — no network call, and no re-fetch on every
 * navigation. Consent metadata changes trigger an auth state refresh, which
 * updates the cache automatically.
 */
const ConsentGate = ({ children }: Props) => {
  const location = useLocation();
  const { user, loading } = useAuthUser();

  if (loading) return null;

  const target = user ? nextConsentRoute(user.user_metadata as any) : null;

  if (target && location.pathname !== target) {
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
};

export default ConsentGate;
