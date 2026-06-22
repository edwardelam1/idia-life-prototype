import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, Fingerprint, MessageSquare, PenTool, Rocket, Archive, Gavel, FileText, CheckCircle2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LedgerRow {
  id: string;
  actor_id: string | null;
  action_type: string | null;
  target_table: string | null;
  target_id: string | null;
  aca_hash_key: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  profiles?: { wallet_address: string };
}

const PAGE = 25;

// Dictionary to humanize raw database action types
const getActionConfig = (actionType: string | null) => {
  const type = (actionType || "").toUpperCase();
  if (type.includes("COMMENT")) return { icon: MessageSquare, label: "Deliberation", color: "bg-blue-600", border: "border-blue-200 bg-blue-50/30" };
  if (type.includes("SIGN") || type.includes("ENDORSE")) return { icon: PenTool, label: "Signature", color: "bg-teal-600", border: "border-teal-200 bg-teal-50/30" };
  if (type.includes("ESCALATE")) return { icon: Rocket, label: "Escalation", color: "bg-orange-600", border: "border-orange-200 bg-orange-50/30" };
  if (type.includes("TERMINATE") || type.includes("ARCHIVE") || type.includes("WITHDRAW")) return { icon: Archive, label: "Archived", color: "bg-slate-600", border: "border-slate-200 bg-slate-50/30" };
  if (type.includes("PROPOSAL")) return { icon: FileText, label: "Proposal", color: "bg-indigo-600", border: "border-indigo-200 bg-indigo-50/30" };
  if (type.includes("VOTE")) return { icon: CheckCircle2, label: "Consensus", color: "bg-emerald-600", border: "border-emerald-200 bg-emerald-50/30" };
  if (type.includes("HAT") || type.includes("ROLE")) return { icon: Shield, label: "Authorization", color: "bg-amber-600", border: "border-amber-200 bg-amber-50/30" };
  
  return { icon: Gavel, label: type || "System Action", color: "bg-slate-800", border: "border-slate-200 bg-slate-50/30" };
};

const formatAddress = (r: LedgerRow) => {
  const addr = r.profiles?.wallet_address || r.actor_id;
  if (!addr) return "System Action";
  if (addr.startsWith("0x") && addr.length === 42) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
  return addr;
};

const AuditFeed: React.FC = () => {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchPage = async () => {
      console.log("[AUDIT_FEED][FETCH][START] Executing ledger poll.");
      try {
        const { data, error } = await (supabase as any)
          .from("governance_ledger")
          .select("id, actor_id, action_type, target_table, target_id, aca_hash_key, metadata, created_at")
          .not("action_type", "is", null)
          .order("created_at", { ascending: false })
          .limit(PAGE);
          
        if (error) throw error;

        const rawRows = data || [];
        let enrichedRows = rawRows;

        // Decoupled Address Stitching
        if (rawRows.length > 0) {
          const uniqueActorIds = [...new Set(rawRows.map((r: any) => r.actor_id).filter(Boolean))];
          
          if (uniqueActorIds.length > 0) {
            const { data: profilesData, error: profileError } = await (supabase as any)
              .from("profiles")
              .select("id, wallet_address")
              .in("id", uniqueActorIds);

            if (!profileError) {
              const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
              enrichedRows = rawRows.map((r: any) => ({
                ...r,
                profiles: profileMap.get(r.actor_id) || null
              }));
            } else {
              console.error(`[AUDIT_FEED][FETCH_PROFILES][ERROR] Address resolution failed: ${profileError.message}`);
            }
          }
        }

        if (isMounted) {
          setRows(enrichedRows);
          setLoading(false);
        }
        console.log(`[AUDIT_FEED][FETCH][END:OK] Hydrated ${enrichedRows.length} ledger events.`);
      } catch (err: any) {
        console.error(`[AUDIT_FEED][FETCH][FATAL_FAIL] Ledger sync collapsed: ${err.message}`);
        if (isMounted) setLoading(false);
      }
    };

    fetchPage();
    const t = setInterval(fetchPage, 15000);
    return () => {
      isMounted = false;
      clearInterval(t);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
        <History size={14} className="text-teal-600" /> Immutable Audit Trail
      </h2>
      
      {rows.length === 0 ? (
        <div className="py-10 text-center opacity-40 bg-slate-50 dark:bg-muted/30 rounded-3xl border border-slate-100 dark:border-border">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">No ledger entries recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const config = getActionConfig(r.action_type);
            const Icon = config.icon;
            
            return (
              <Card key={r.id} className={`rounded-2xl border ${config.border} shadow-sm overflow-hidden`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    {/* Action Icon */}
                    <div className={`mt-0.5 p-2 rounded-xl text-white shrink-0 ${config.color}`}>
                      <Icon size={14} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Header row: Action & Time */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge className={`${config.color} text-white text-[9px] font-black uppercase tracking-wider`}>
                          {config.label}
                        </Badge>
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground shrink-0">
                          {new Date(r.created_at).toLocaleString(undefined, { 
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                          })}
                        </span>
                      </div>

                      {/* Actor Information */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <Fingerprint size={12} className="text-muted-foreground shrink-0" />
                        <span className="font-mono text-[10px] truncate">{formatAddress(r)}</span>
                      </div>

                      {/* ACA Protocol Trace */}
                      {r.aca_hash_key && (
                        <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-black/5 dark:border-white/5">
                          <Shield size={10} className="text-teal-600 shrink-0" />
                          <span className="font-mono text-[8px] text-teal-700/70 dark:text-teal-400/70 uppercase tracking-widest truncate">
                            ACA: {r.aca_hash_key}
                          </span>
                        </div>
                      )}

                      {/* Structured Metadata (Replaces raw JSON dump) */}
                      {r.metadata && Object.keys(r.metadata).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Object.entries(r.metadata).map(([key, value]) => {
                            // Skip redundant/internal keys to keep UI clean
                            if (key === 'user_id' || key === 'proposal_id' || typeof value === 'object') return null;
                            return (
                              <span key={key} className="inline-flex items-center rounded-md bg-black/5 dark:bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                                {key.replace(/_/g, ' ')}: <span className="ml-1 text-foreground truncate max-w-[100px]">{String(value)}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AuditFeed;