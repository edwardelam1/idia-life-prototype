import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, CheckCircle, DollarSign, Zap, FileKey, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppleHealthModal from "./AppleHealthModal";
import StravaConnectionModal from "./StravaConnectionModal";
import FordConnectionModal from "./FordConnectionModal";
import fordLogo from "@/assets/ford-logo.png";

const [isActivelySyncing, setIsActivelySyncing] = useState(false);
const DataDashboard = () => {
  const [connections, setConnections] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAppleHealthModal, setShowAppleHealthModal] = useState(false);
  const [showStravaModal, setShowStravaModal] = useState(false);
  const [showFordModal, setShowFordModal] = useState(false);
  const [virtuousImpacts, setVirtuousImpacts] = useState<string[]>([]);
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

      // Existing Wallet Listener
      const dataWalletChannel = supabase
        .channel("data-dashboard-wallet")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "user_wallets", filter: `user_id=eq.${currentUserId}` },
          (payload) => setTotalEarnings(payload.new.cash_balance || 0),
        )
        .subscribe();

      // DISCUSSION: New Pipeline Activity Listener
      const dataActivityChannel = supabase
        .channel("data-dashboard-activity")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "raw_health_data",
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            console.log("⚡ Live Data Pipeline Triggered:", payload);

            // 1. Turn on the "Receiving Data" UI
            setIsActivelySyncing(true);

            // 2. Refresh the audit log and last sync time
            fetchAcaRecords();
            fetchConnections();

            // 3. Keep the indicator glowing for 3 seconds so the human eye can register it
            setTimeout(() => {
              setIsActivelySyncing(false);
            }, 3000);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(dataWalletChannel);
        supabase.removeChannel(dataActivityChannel); // Cleanup new channel
      };
    }
  }, [currentUserId]);

  const fetchAcaRecords = async () => {
    if (!currentUserId) return;
    setAcaLoading(true);
    try {
      // Unified Identity: Auth User ID === Platform GUID (enforced by DB trigger).
      // Query strictly by currentUserId — no profile lookup, no fallback.
      const { data, error } = await supabase
        .from("user_aca_records")
        .select("*")
        .eq("platform_guid", currentUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setAcaRecords(data);
    } catch (err) {
      console.error("Failed to fetch ACA records:", err);
    } finally {
      setAcaLoading(false);
    }
  };

  const fetchConnections = async () => {
    if (!currentUserId) return;

    try {
      // STRIPPED: Removed the dead pipeline-diagnostics edge function call
      const [connectionsResult, walletResult, recentDataResult] = await Promise.allSettled([
        supabase.from("data_connections").select("*").eq("user_id", currentUserId).eq("is_active", true),
        supabase.from("user_wallets").select("*").eq("user_id", currentUserId).maybeSingle(),
        supabase
          .from("raw_health_data")
          .select("created_at")
          .eq("user_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (connectionsResult.status === "rejected") {
        console.error("Error fetching connections:", connectionsResult.reason);
        setConnections([]);
        setTotalEarnings(0);
        setLoading(false);
        return;
      }

      const connectionsData = connectionsResult.value.data || [];
      let totalEarned = 0;
      if (walletResult.status === "fulfilled") totalEarned = walletResult.value.data?.cash_balance || 0;

      if (recentDataResult.status === "fulfilled" && recentDataResult.value.data?.length > 0) {
        const lastDataTime = new Date(recentDataResult.value.data[0].created_at);
        const hoursSinceLastData = (Date.now() - lastDataTime.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastData > 24) setLastSyncStatus("stale");
        else if (hoursSinceLastData > 6) setLastSyncStatus("delayed");
        else setLastSyncStatus("recent");
      } else {
        setLastSyncStatus("no_data");
      }

      setConnections(connectionsData);
      setTotalEarnings(totalEarned);

      if (connectionsData.length > 0) {
        fetchVirtuousImpacts().catch((error) => console.error("Non-critical: Virtuous impacts fetch failed:", error));
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching connections:", error);
      setConnections([]);
      setTotalEarnings(0);
      setLoading(false);
    }
  };

  const fetchVirtuousImpacts = async () => {
    const fallbackImpacts = [
      "Your anonymized activity improved heart health model accuracy",
      "Contributed to real-time wellness trend analysis",
      "Enhanced data quality for community research",
    ];
    try {
      const { data, error } = await supabase.functions.invoke("generate-virtuous-cycle-impacts", {
        body: { user_id: currentUserId },
      });
      if (error) {
        setVirtuousImpacts(fallbackImpacts);
        return;
      }
      setVirtuousImpacts(data?.impacts?.length ? data.impacts : fallbackImpacts);
    } catch {
      setVirtuousImpacts(fallbackImpacts);
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
      case "stale":
        return null;
      case "no_data":
        return <Badge variant="outline">No Data Found</Badge>;
      default:
        return <Badge variant="outline">Checking...</Badge>;
    }
  };

  const handleAppleHealthComplete = async () => {
    // Do NOT close the modal here — the modal owns its own connected-state UI
    // and will be dismissed by the user via X / Close / overlay / Escape.
    try {
      await fetchConnections();
      await fetchAcaRecords();
      triggerFriendForDataEvent();
    } catch {}
  };

  const handleStravaComplete = async () => {
    setShowStravaModal(false);
    try {
      await fetchConnections();
      await fetchAcaRecords();
      triggerFriendForDataEvent();
    } catch {}
  };

  const handleFordComplete = async () => {
    setShowFordModal(false);
    try {
      await fetchConnections();
      await fetchAcaRecords();
      triggerFriendForDataEvent();
    } catch {}
  };

  const getConnectionStatus = (connectionType: string) => {
    return connections.find((conn) => conn.connection_type === connectionType);
  };

  const formatSourceName = (sourceId: string) => {
    return sourceId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Data Earnings Summary */}
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

      {/* Tabs: Connections + Audit Log */}
      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1">
            <FileKey className="w-3 h-3" />
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          {/* Virtuous Cycle Report */}
          {connections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span>Virtuous Cycle Impact</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Your data helped improve:</span>
                    <Badge variant="secondary">Live Research Impact</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    {virtuousImpacts.length > 0 ? (
                      virtuousImpacts.map((impact, index) => (
                        <p key={index} className="flex items-center space-x-2">
                          <CheckCircle size={16} className="text-green-500 shrink-0" />
                          <span>{impact}</span>
                        </p>
                      ))
                    ) : (
                      <p className="flex items-center space-x-2">
                        <CheckCircle size={16} className="text-green-500 shrink-0" />
                        <span>Generating live impact analysis...</span>
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Data Sources */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Available Data Sources</h2>
            {!getConnectionStatus("apple_health") || !getConnectionStatus("strava") || !getConnectionStatus("ford") ? (
              <div className="flex justify-center space-x-8">
                {!getConnectionStatus("apple_health") && (
                  <div className="relative cursor-pointer group" onClick={() => setShowAppleHealthModal(true)}>
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-background shadow-sm border transition-all group-hover:shadow-md group-hover:scale-105">
                      <img
                        src="/lovable-uploads/8f82179a-e516-4c98-8c9f-aae3ee45c242.png"
                        alt="Apple Health"
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                  </div>
                )}
                {!getConnectionStatus("strava") && (
                  <div className="relative cursor-pointer group" onClick={() => setShowStravaModal(true)}>
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-background shadow-sm border transition-all group-hover:shadow-md group-hover:scale-105">
                      <img
                        src="/lovable-uploads/1d14c6f9-fbbd-4462-84f8-b72a4e39b89d.png"
                        alt="Strava"
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                  </div>
                )}
                {!getConnectionStatus("ford") && (
                  <div className="relative cursor-pointer group" onClick={() => setShowFordModal(true)}>
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-background shadow-sm border transition-all group-hover:shadow-md group-hover:scale-105">
                      <img src={fordLogo} alt="Ford" className="w-full h-full object-contain p-1" />
                    </div>
                    <p className="text-xs text-center mt-1 text-muted-foreground">Ford</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">All available data sources connected</p>
                <p className="text-xs">Manage your connections below</p>
              </div>
            )}
          </div>

          {/* Connected Data Sources */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Connected Data Sources</h2>
            {connections.length > 0 ? (
              <div className="flex justify-center space-x-8">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="relative cursor-pointer group"
                    onClick={() => {
                      if (connection.connection_type === "apple_health") setShowAppleHealthModal(true);
                      else if (connection.connection_type === "strava") setShowStravaModal(true);
                      else if (connection.connection_type === "ford") setShowFordModal(true);
                    }}
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-background shadow-sm border-2 border-green-500 transition-all group-hover:shadow-md group-hover:scale-105">
                      {connection.connection_type === "ford" ? (
                        <img src={fordLogo} alt="Ford" className="w-full h-full object-contain p-1" />
                      ) : (
                        <img
                          src={
                            connection.connection_type === "apple_health"
                              ? "/lovable-uploads/8f82179a-e516-4c98-8c9f-aae3ee45c242.png"
                              : "/lovable-uploads/1d14c6f9-fbbd-4462-84f8-b72a4e39b89d.png"
                          }
                          alt={connection.connection_type}
                          className="w-full h-full object-contain p-2"
                        />
                      )}
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
                <p className="text-xs">Click on an available source above to connect</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Audit Log Tab */}
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
              ) : acaRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileKey className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No audit records yet</p>
                  <p className="text-xs">ACA hashes are generated when you connect a data source</p>
                </div>
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
                                toast({
                                  title: "Copied",
                                  description: "ACA hash copied to clipboard",
                                });
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
      <StravaConnectionModal
        isOpen={showStravaModal}
        onClose={() => setShowStravaModal(false)}
        onComplete={handleStravaComplete}
        existingConnection={getConnectionStatus("strava")}
        onDisconnect={fetchConnections}
      />
      <FordConnectionModal
        isOpen={showFordModal}
        onClose={() => setShowFordModal(false)}
        onComplete={handleFordComplete}
        existingConnection={getConnectionStatus("ford")}
        onDisconnect={fetchConnections}
      />
    </div>
  );
};

export default DataDashboard;
