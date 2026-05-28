import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, History } from "lucide-react";
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
}

const PAGE = 25;

const AuditFeed: React.FC = () => {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPage();
    const t = setInterval(fetchPage, 15000);
    return () => clearInterval(t);
  }, []);

  const fetchPage = async () => {
    const { data, error } = await (supabase as any)
      .from("governance_ledger")
      .select("id, actor_id, action_type, target_table, target_id, aca_hash_key, metadata, created_at")
      .not("action_type", "is", null)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    if (!error) setRows(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
        <History size={14} className="text-teal-600" /> Governance Audit Feed
      </h2>
      {rows.length === 0 ? (
        <div className="py-10 text-center opacity-40 bg-slate-50 dark:bg-muted/30 rounded-3xl border border-slate-100 dark:border-border">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">No ledger entries yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="rounded-2xl border-teal-100 dark:border-teal-900/40">
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-teal-600 text-white text-[9px] font-black uppercase tracking-wider">
                    {r.action_type}
                  </Badge>
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground break-all">
                  actor: {r.actor_id || "—"}
                </p>
                {r.aca_hash_key && (
                  <p className="text-[10px] font-mono text-muted-foreground break-all">
                    aca: {r.aca_hash_key.substring(0, 16)}…
                  </p>
                )}
                {r.metadata && Object.keys(r.metadata).length > 0 && (
                  <pre className="text-[10px] bg-muted/30 rounded p-2 overflow-x-auto">
                    {JSON.stringify(r.metadata, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

export default AuditFeed;
