import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Shield, Activity, FileKey } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateACAHash } from "@/utils/acaGenerator";

interface AppleHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingConnection?: any;
  onDisconnect?: () => void;
}

const AppleHealthModal = ({ isOpen, onClose, onComplete, existingConnection, onDisconnect }: AppleHealthModalProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User session not found");

      // 1. DELT Protocol: Generate mandatory ACA Hash
      const { hash, payload } = await generateACAHash(user.id, "apple_health", [
        "HEALTH_DATA_READ",
        "ANONYMIZATION_REQUIRED",
      ]);

      // 2. Liability Shield: Log mandatory audit record
      const { error: acaError } = await supabase.from("user_aca_records").insert({
        platform_guid: user.id,
        aca_hash_key: hash,
        consent_type: "apple_health_sync",
        consent_scope: payload.consent_scope,
      });

      if (acaError) throw new Error("Failed to log audit record");

      // 3. Invoke Edge Function for Sync
      // In the Swift wrapper, the native bridge typically calls this,
      // but we invoke it here to trigger the protocol verification.
      const { data, error: syncError } = await supabase.functions.invoke("apple-health-sync", {
        body: {
          user_id: user.id,
          aca_hash: hash,
          automated_sync: false,
        },
      });

      if (syncError || !data?.success) throw new Error(data?.error || "Sync failed");

      onComplete();
    } catch (err: any) {
      console.error("Apple Health Protocol Error:", err);
      setError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="text-red-500" />
            Apple Health Connection
          </DialogTitle>
          <DialogDescription>Securely link your health data to the IDIA Synapse engine.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm">DELT Protocol Verified</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your data remains sovereign. This connection uses a cryptographic ACA anchor to ensure anonymization
              before any third-party research access.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={existingConnection ? "secondary" : "outline"}>
                {existingConnection ? "Connected" : "Not Linked"}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Audit Key:</span>
              <span className="font-mono text-xs">
                {existingConnection?.id ? `ACA-${existingConnection.id.substring(0, 8)}` : "None"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? "Verifying Protocol..." : "Sync Health Data"}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={isSyncing}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppleHealthModal;
