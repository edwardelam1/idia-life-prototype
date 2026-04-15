import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileKey, Activity } from "lucide-react";

interface AcaRecord {
  id: string;
  aca_hash_key: string;
  source_id: string;
  created_at: string;
  platform_guid: string;
}

const DataDashboard = () => {
  const [acaRecords, setAcaRecords] = useState<AcaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAcaRecords = async () => {
    try {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;

      if (!currentUserId) return;

      // 1. Look up the profile's platform_guid (DELT Protocol Standard)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("platform_guid")
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile for ACA records:", profileError);
      }

      const guidToQuery = profile?.platform_guid || currentUserId;

      // 2. Fetch the records using the aligned platform_guid
      const { data, error } = await supabase
        .from("user_aca_records")
        .select("*")
        .eq("platform_guid", guidToQuery)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setAcaRecords(data);
    } catch (err) {
      console.error("Failed to fetch ACA records:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAcaRecords();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Data Integrity</h2>
        <p className="text-muted-foreground">Monitor your connected streams and audit artifacts.</p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Provenance Audit Log (ACA Records)</h3>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : acaRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Activity className="w-8 h-8 mb-2 opacity-20" />
              <p>No audit records found.</p>
            </div>
          ) : (
            <div className="divide-y">
              {acaRecords.map((record) => (
                <div key={record.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <FileKey className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Source: {record.source_id || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">Hash: {record.aca_hash_key}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(record.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default DataDashboard;
