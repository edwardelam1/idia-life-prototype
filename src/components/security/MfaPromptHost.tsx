import { useEffect, useState } from "react";
import MfaPanel from "./MfaPanel";
import { settleMfaPrompt, subscribeMfaPrompt } from "@/lib/identityVerification";

/** Renders the Authenticator prompt whenever an action requests MFA verification. */
export default function MfaPromptHost() {
  const [reason, setReason] = useState<string | null>(null);
  useEffect(() => subscribeMfaPrompt((p) => setReason(p?.reason ?? null)), []);
  if (!reason) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/70 p-4 backdrop-blur-md">
      <MfaPanel key={reason} reason={reason} onVerified={() => settleMfaPrompt(true)} onCancel={() => settleMfaPrompt(false)} />
    </div>
  );
}
