import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, CheckCircle, DollarSign, FileKey, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppleHealthModal from "./AppleHealthModal";

// THE EXTERNAL BLOCKER:
// This acts as a terminal point for the compiler to prevent infinite recursion.
type DashboardConnection = {
  id: string;
  connection_type: string;
  user_id: string;
  status?: string;
} & Record<string, any>;

const DataDashboard = () => {
  const [connections, setConnections] = useState<DashboardConnection[]>([]);
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
          (payload) => {
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: connectionsData, error: connectionsError } = await supabase
        .from("data_connections")
        .select("*")
        .eq("user_id", user.id);

      if (connectionsError) throw connectionsError;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: recentAuditData } = await supabase
        .from("user_aca_records")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("source_id", "apple_health")
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      // THE ONE-MOTION ACTION:
      // We pass the data through the blocker to clip infinite relationship trees.
      const rawList = (connectionsData as any[]) || [];

      const processed: DashboardConnection[] = rawList.map((item) => {
        const base: DashboardConnection = {
          id: String(item.id),
          connection_type: String(item.connection_type),
          user_id: String(item.user_id),
          ...item,
        };

        if (base.connection_type === "apple_health") {
          base.status = recentAuditData && recentAuditData.length > 0 ? "success" : "no_data";
        }
        return base;
      });

      setLastSyncStatus(recentAuditData && recentAuditData.length > 0 ? "recent" : "no_data");
      setConnections(processed);

      const { data: walletData } = await supabase
        .from("user_wallets")
        .select("cash_balance")
        .eq("user_id", user.id)
        .single();

      if (walletData) setTotalEarnings(walletData.cash_balance || 0);
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
      await fetchConnections();
      await fetchAcaRecords();
      triggerFriendForDataEvent();
    } catch {}
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
        onDisconnect={fetchConnections}
      />
    </div>
  );
};

export default DataDashboard;
