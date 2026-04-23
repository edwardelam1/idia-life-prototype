import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, CheckCircle, DollarSign, FileKey, Copy } from "lucide-react";
// 1. Rename the import to intercept it
import { supabase as typedSupabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppleHealthModal from "./AppleHealthModal";

// 2. THE ULTIMATE BYPASS:
// By typing this as 'any' at the root, TypeScript will NEVER evaluate
// the deep database schema when you type `supabase.from()`.
const supabase: any = typedSupabase;

// THE BLOCKER: Strictly flat type.
interface DataBlocker {
  id: string;
  connection_type: string;
  user_id: string;
  status?: string;
}

const DataDashboard = () => {
  const [connections, setConnections] = useState<DataBlocker[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAppleHealthModal, setShowAppleHealthModal] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<string>("unknown");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [acaRecords, setAcaRecords] = useState<any[]>([]);
  const [acaLoading, setAcaLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
    fetchConnections();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchConnections();
      fetchAcaRecords();

      const dataWalletChannel = supabase
        .channel("data-dashboard-wallet")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_wallets",
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload: any) => {
            console.log("Data Dashboard Wallet Update:", payload);
            setTotalEarnings(payload.new.cash_balance || 0);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(dataWalletChannel);
      };
    }
  }, [currentUserId]);

  const fetchAcaRecords = async () => {
    if (!currentUserId) return;
    setAcaLoading(true);
    console.log("🚀 [DASHBOARD_LOG] START: fetchAcaRecords");
    try {
      const { data, error } = await supabase
        .from("user_aca_records")
        .select("*")
        .eq("platform_guid", currentUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setAcaRecords(data);
    } catch (err: any) {
      console.error("🚨 [DASHBOARD_LOG] Failed to fetch ACA records:", err.message);
    } finally {
      setAcaLoading(false);
      console.log("🏁 [DASHBOARD_LOG] END: fetchAcaRecords");
    }
  };

  const fetchConnections = async () => {
    console.log("🚀 [DASHBOARD_LOG] START: fetchConnections");
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      // 1. Fetch data connections (Is the pipe open?)
      const connRes = await supabase.from("data_connections").select("*").eq("user_id", user.id);
      if (connRes.error) throw connRes.error;

      // 2. Fetch the SINGLE absolute latest audit record (When did water last flow?)
      // Notice: We removed the 'today' filter entirely.
      const auditRes = await supabase
        .from("user_aca_records")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("source_id", "apple_health")
        .order("created_at", { ascending: false })
        .limit(1);

      const rawData = connRes.data || [];
      const auditData = auditRes.data || [];

      let calculatedSyncStatus = "no_data";

      // 3. Time-Based Logic (The Burst Architect)
      if (auditData.length > 0) {
        const lastSyncTime = new Date(auditData[0].created_at).getTime();
        const hoursSinceLastSync = (Date.now() - lastSyncTime) / (1000 * 60 * 60);

        console.log(`⏱️ [DASHBOARD_LOG] Hours since last Apple Health sync: ${hoursSinceLastSync.toFixed(2)}`);

        if (hoursSinceLastSync < 6) {
          calculatedSyncStatus = "recent";
        } else if (hoursSinceLastSync < 24) {
          calculatedSyncStatus = "delayed"; // Idle
        } else {
          calculatedSyncStatus = "stale";
        }
      }

      // 4. Map the UI State
      const cleaned: DataBlocker[] = [];
      for (let i = 0; i < rawData.length; i++) {
        const item = rawData[i];
        const entry: DataBlocker = {
          id: String(item.id),
          connection_type: String(item.connection_type),
          user_id: String(item.user_id),
        };

        // If it exists in data_connections, it IS connected.
        // We only show 'success' visually if the sync isn't completely dead.
        if (entry.connection_type === "apple_health") {
          entry.status = auditData.length > 0 ? "success" : "no_data";
        }
        cleaned.push(entry);
      }

      setLastSyncStatus(calculatedSyncStatus);
      setConnections(cleaned);

      // 5. Fetch Wallet Balance
      const walletRes = await supabase.from("user_wallets").select("cash_balance").eq("user_id", user.id).single();

      if (walletRes.data) {
        setTotalEarnings(walletRes.data.cash_balance || 0);
      }
    } catch (error: any) {
      console.error("🚨 [DASHBOARD_LOG] Error in fetchConnections:", error.message);
    } finally {
      setLoading(false);
      console.log("🏁 [DASHBOARD_LOG] END: fetchConnections");
    }
  };

  const triggerFriendForDataEvent = () => {
    window.dispatchEvent(new CustomEvent("showFriend", { detail: { trigger: "data" } }));
  };

  const getSyncStatusBadge = () => {
    switch (lastSyncStatus) {
      case "recent":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Synced Recently
          </Badge>
        );
      case "delayed":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Idle
          </Badge>
        );
      case "no_data":
        return <Badge variant="outline">No Data Found</Badge>;
      default:
        return <Badge variant="outline">Checking...</Badge>;
    }
  };

  const handleAppleHealthComplete = async () => {
    try {
      console.log("🔗 [DASHBOARD_LOG] Apple Health connection complete.");
      await fetchConnections();
      await fetchAcaRecords();
      setShowAppleHealthModal(false); // Force close after connecting
      triggerFriendForDataEvent();
    } catch {}
  };

  const handleAppleHealthDisconnect = async () => {
    try {
      console.log("🔌 [DASHBOARD_LOG] Apple Health disconnect triggered.");
      if (!currentUserId) {
        console.log("⚠️ [DASHBOARD_LOG] No user ID, aborting disconnect.");
        return;
      }

      // THE MISSING COMMAND: Explicitly tell Supabase to destroy the connection
      console.log("🗑️ [DASHBOARD_LOG] Executing database deletion for apple_health...");
      const { error } = await supabase
        .from("data_connections")
        .delete()
        .eq("user_id", currentUserId)
        .eq("connection_type", "apple_health");

      if (error) {
        console.error("🚨 [DASHBOARD_LOG] Database deletion failed:", error.message);
        throw error;
      }

      console.log("✅ [DASHBOARD_LOG] Deletion successful. Refreshing UI.");

      // Now we refresh the local state and close the doors
      await fetchConnections();
      setShowAppleHealthModal(false);

      toast({
        title: "Source Disconnected",
        description: "Apple Health data has been unlinked.",
      });
    } catch (err: any) {
      toast({
        title: "Disconnect Failed",
        description: err.message || "Could not sever the connection.",
        variant: "destructive",
      });
    }
  };

  const getConnectionStatus = (connectionType: string) => {
    return connections.find((conn) => conn.connection_type === connectionType);
  };

  const visibleConnections = connections.filter((c) => c.connection_type === "apple_health");

  const formatSourceName = (sourceId: string) => {
    return sourceId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg mb-6"></div>
          <div className="h-24 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <p className="text-teal-100">Cash Account</p>
                {getSyncStatusBadge()}
              </div>
              <p className="text-3xl font-bold">${totalEarnings.toFixed(2)} USD</p>
              <p className="text-sm text-teal-100 mt-1">
                {connections.length > 0
                  ? "Available cash from connected data sources"
                  : "Start earning by connecting data sources"}
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1">
            <FileKey className="w-3 h-3" />
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Available Data Sources</h2>
            {!getConnectionStatus("apple_health") ? (
              <div className="flex justify-center">
                <div className="relative cursor-pointer group" onClick={() => setShowAppleHealthModal(true)}>
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-background shadow-sm border transition-all group-hover:shadow-md group-hover:scale-105">
                    <img
                      src="/lovable-uploads/8f82179a-e516-4c98-8c9f-aae3ee45c242.png"
                      alt="Apple Health"
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">All available data sources connected</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Connected Data Sources</h2>
            {visibleConnections.length > 0 ? (
              <div className="flex justify-center space-x-8">
                {visibleConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="relative cursor-pointer group"
                    onClick={() => {
                      if (connection.connection_type === "apple_health") setShowAppleHealthModal(true);
                    }}
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-background shadow-sm border-2 border-green-500 transition-all group-hover:shadow-md group-hover:scale-105">
                      <img
                        src="/lovable-uploads/8f82179a-e516-4c98-8c9f-aae3ee45c242.png"
                        alt={connection.connection_type}
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No data sources connected yet</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <FileKey className="w-4 h-4" />
                <span>Audit Log</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {acaLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading audit records...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>ACA Hash (Audit Key)</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acaRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium text-sm">
                          {formatSourceName(record.source_id || "unknown")}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>{record.aca_hash_key?.substring(0, 12)}...</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                navigator.clipboard.writeText(record.aca_hash_key || "");
                                toast({ title: "Copied", description: "ACA hash copied to clipboard" });
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(record.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AppleHealthModal
        isOpen={showAppleHealthModal}
        onClose={() => setShowAppleHealthModal(false)}
        onComplete={handleAppleHealthComplete}
        existingConnection={getConnectionStatus("apple_health")}
        onDisconnect={handleAppleHealthDisconnect} // <-- The clean exit
      />
    </div>
  );
};

export default DataDashboard;
