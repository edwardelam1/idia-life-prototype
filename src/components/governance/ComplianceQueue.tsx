import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldAlert, ShieldCheck, Clock, CheckCircle, XCircle, CalendarClock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateACAHash } from "@/utils/acaGenerator";

const ComplianceQueue: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Modal States
  const [vetoTarget, setVetoTarget] = useState<any | null>(null);
  const [extendTarget, setExtendTarget] = useState<any | null>(null);
  const [reason, setReason] = useState("");

  const fetchQueue = async () => {
    console.log("[COMPLIANCE_QUEUE] BEGIN: Fetching pending_veto telemetry.");
    try {
      const { data, error } = await supabase
        .from("dao_hats")
        .select("*")
        .eq("eligibility_status", "pending_veto")
        .is("revoked_at", null);

      if (error) throw error;
      setItems(data || []);
      console.log("[COMPLIANCE_QUEUE] SUCCESS: Fetched", data?.length, "items.");
    } catch (e) {
      console.error("[COMPLIANCE_QUEUE] CRITICAL_STALL: Fetch failed", e);
    } finally {
      setIsLoading(false);
      console.log("[COMPLIANCE_QUEUE] END: Telemetry sync.");
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleVeto = async () => {
    if (!vetoTarget) return;
    setActionBusyId(vetoTarget.id);
    console.log("[COMPLIANCE_QUEUE] BEGIN: Veto execution for hat:", vetoTarget.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { hash, payload } = await generateACAHash(user!.id, `veto_${vetoTarget.id}`, ["VETO_ACTION", "LEDGER_WRITE"]);

      const { error } = await supabase.from("dao_hats").update({
        eligibility_status: "vetoed",
        veto_reason: reason,
        veto_aca_hash: hash,
        veto_aca_payload: payload
      }).eq("id", vetoTarget.id);

      if (error) throw error;
      toast({ title: "Veto Executed Successfully" });
      setVetoTarget(null);
      fetchQueue();
    } catch (e: any) {
      console.error("[COMPLIANCE_QUEUE] CRITICAL_STALL: Veto execution failed", e);
      toast({ title: "Veto Failed", description: e.message, variant: "destructive" });
    } finally {
      setActionBusyId(null);
      console.log("[COMPLIANCE_QUEUE] END: Veto execution complete.");
    }
  };

  const handleExtend = async () => {
    if (!extendTarget) return;
    setActionBusyId(extendTarget.id);
    console.log("[COMPLIANCE_QUEUE] BEGIN: Veto extension for hat:", extendTarget.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { hash, payload } = await generateACAHash(user!.id, `extend_${extendTarget.id}`, ["VETO_EXTENSION"]);
      
      // Extend window by 24h
      const newEnd = new Date(new Date(extendTarget.veto_window_end).getTime() + 24 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase.from("dao_hats").update({
        veto_window_end: newEnd,
        veto_extended: true,
        veto_extended_at: new Date().toISOString(),
        veto_aca_hash: hash,
        veto_aca_payload: payload
      }).eq("id", extendTarget.id);

      if (error) throw error;
      toast({ title: "Veto Window Extended" });
      setExtendTarget(null);
      fetchQueue();
    } catch (e: any) {
      console.error("[COMPLIANCE_QUEUE] CRITICAL_STALL: Extension failed", e);
      toast({ title: "Extension Failed", variant: "destructive" });
    } finally {
      setActionBusyId(null);
      console.log("[COMPLIANCE_QUEUE] END: Extension complete.");
    }
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-teal-600" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Compliance Queue</h2>
      {items.length === 0 && <p className="text-xs text-muted-foreground p-4 bg-muted/20 rounded">No pending actions detected.</p>}
      
      {items.map((item) => (
        <Card key={item.id} className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground">ID: {item.id}</p>
              <p className="text-sm font-bold capitalize">{item.hat_type}</p>
              <p className="text-[10px] text-amber-700 font-medium">Expires: {new Date(item.veto_window_end).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setExtendTarget(item)} disabled={actionBusyId === item.id}>
                <CalendarClock className="w-3 h-3 mr-1" /> Extend
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setVetoTarget(item)} disabled={actionBusyId === item.id}>
                <XCircle className="w-3 h-3 mr-1" /> Veto
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Veto Dialog */}
      <Dialog open={!!vetoTarget} onOpenChange={(o) => !o && setVetoTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Execute Veto</DialogTitle></DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Justification for veto..." />
          <DialogFooter>
            <Button variant="destructive" onClick={handleVeto} disabled={actionBusyId === vetoTarget?.id}>Confirm Veto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComplianceQueue;