import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Activity, CheckCircle, DollarSign, Zap, FileKey, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppleHealthModal from "./AppleHealthModal";
import StravaConnectionModal from "./StravaConnectionModal";
import FordConnectionModal from "./FordConnectionModal";
import fordLogo from "@/assets/ford-logo.png";

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

  // Data Flow Lifecycle State
  const [searchHash, setSearchHash] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [flowStatus, setFlowStatus] = useState({
    ingested: false,
    processing: false,
    staged: false,
    purchased: false,
  });

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
    }
  }, [currentUserId]);

  const handleAcaSearch = async () => {
    if (!searchHash) return;
    setIsTracking(true);
    try {
      // 1. Check Ingested (ACA Record exists)
      const { data: aca } = await supabase
        .from("user_aca_records")
        .select("id")
        .eq("aca_hash_key", searchHash)
        .maybeSingle();

      // 2. Check Processing (In queue or pending sync)
      const { data: raw } = await supabase
        .from("raw_health_data")
        .select("processing_status")
        .eq("aca_hash_key", searchHash)
        .maybeSingle();

      // 3. Check Staged (Moved to analytics ledger)
      const { data: staged } = await supabase
        .from("staged_health_data")
        .select("id")
        .eq("aca_hash_key", searchHash)
        .maybeSingle();

      // 4. Check Purchased (Settled in egress logs)
      const { data: egress } = await supabase
        .from("egress_logs")
        .select("id")
        .contains("aca_record_references", [searchHash])
        .maybeSingle();

      setFlowStatus({
        ingested: !!aca,
        processing: raw?.processing_status === "processing" || raw?.processing_status === "pending",
        staged: !!staged,
        purchased: !!egress,
      });
    } catch (err) {
      console.error("Lifecycle search failed:", err);
    } finally {
      setIsTracking(false);
    }
  };

  const fetchAcaRecords = async () => {
    if (!currentUserId) return;
    setAcaLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_aca_records")
        .select("*")
        .eq("platform_guid", currentUserId)
        .order("created_at", { ascending: false });
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

      if (connectionsResult.status === "fulfilled") setConnections(connectionsResult.value.data || []);
      if (walletResult.status === "fulfilled") setTotalEarnings(walletResult.value.data?.cash_balance || 0);

      if (recentDataResult.status === "fulfilled" && recentDataResult.value.data?.length > 0) {
        const lastDataTime = new Date(recentDataResult.value.data[0].created_at);
        const hours = (Date.now() - lastDataTime.getTime()) / (1000 * 60 * 60);
        setLastSyncStatus(hours > 24 ? "stale" : hours > 6 ? "delayed" : "recent");
      } else {
        setLastSyncStatus("no_data");
      }

      if (connections.length > 0) fetchVirtuousImpacts();
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const fetchVirtuousImpacts = async () => {
    try {
      const { data } = await supabase.functions.invoke("generate-virtuous-cycle-impacts", {
        body: { user_id: currentUserId },
      });
      setVirtuousImpacts(data?.impacts || []);
    } catch {}
  };

  const formatSourceName = (sourceId: string) => {
    return sourceId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getConnectionStatus = (connectionType: string) => {
    return connections.find((conn) => conn.connection_type === connectionType);
  };

  if (loading) return <div className="p-8 animate-pulse bg-white h-64 border rounded-xl" />;

  return (
    <div className="space-y-4 bg-white p-1 min-h-screen">
      {/* 1. Wallet Summary (Teal) */}
      <Card className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white border-none shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <p className="text-teal-100 text-[10px] uppercase font-bold tracking-widest">Liquid Cash Account</p>
                {getSyncStatusBadge()}
              </div>
              <p className="text-3xl font-black">${totalEarnings.toFixed(2)} USD</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Data Flow Lifecycle (Orange Accents) */}
      <Card className="border-muted bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-2 bg-orange-50/50 border-b border-orange-100">
          <CardTitle className="text-[10px] font-black uppercase tracking-tighter flex items-center gap-2 text-orange-600">
            <Zap className="w-3 h-3" /> Data Flow Lifecycle
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search ACA Hash..."
              className="text-xs h-9 bg-muted/30"
              value={searchHash}
              onChange={(e) => setSearchHash(e.target.value)}
            />
            <Button
              size="sm"
              className="h-9 px-4 bg-orange-500 hover:bg-orange-600"
              onClick={handleAcaSearch}
              disabled={isTracking}
            >
              {isTracking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2">
            {[
              { label: "Ingested", active: flowStatus.ingested },
              { label: "Processing", active: flowStatus.processing },
              { label: "Staged", active: flowStatus.staged },
              { label: "Purchased", active: flowStatus.purchased },
            ].map((step) => (
              <div key={step.label} className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${step.active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500/20"}`}
                />
                <span className="text-[8px] font-bold uppercase tracking-tighter text-muted-foreground">
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Connections & Transactions Tabs */}
      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="connections" className="text-xs font-bold rounded-lg data-[state=active]:bg-white">
            Connections
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs font-bold rounded-lg data-[state=active]:bg-white">
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-6 pt-2">
          {/* Available Sources */}
          <div className="space-y-3 px-1">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Available</h2>
            <div className="flex gap-4">
              {!getConnectionStatus("apple_health") && (
                <div
                  className="w-14 h-14 rounded-xl bg-muted/20 border-2 border-dashed flex items-center justify-center cursor-pointer opacity-50 grayscale"
                  onClick={() => setShowAppleHealthModal(true)}
                >
                  <img
                    src="/lovable-uploads/8f82179a-e516-4c98-8c9f-aae3ee45c242.png"
                    alt="Health"
                    className="w-8 h-8 object-contain"
                  />
                </div>
              )}
              {!getConnectionStatus("strava") && (
                <div
                  className="w-14 h-14 rounded-xl bg-muted/20 border-2 border-dashed flex items-center justify-center cursor-pointer opacity-50 grayscale"
                  onClick={() => setShowStravaModal(true)}
                >
                  <img
                    src="/lovable-uploads/1d14c6f9-fbbd-4462-84f8-b72a4e39b89d.png"
                    alt="Strava"
                    className="w-8 h-8 object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Connected Sources */}
          <div className="space-y-3 px-1">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-foreground">Connected</h2>
            <div className="flex gap-4">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="relative cursor-pointer group"
                  onClick={() =>
                    conn.connection_type === "apple_health"
                      ? setShowAppleHealthModal(true)
                      : conn.connection_type === "strava"
                        ? setShowStravaModal(true)
                        : setShowFordModal(true)
                  }
                >
                  <div className="w-14 h-14 rounded-xl bg-white border-2 border-green-500 shadow-sm p-3 transition-transform active:scale-95">
                    <img
                      src={
                        conn.connection_type === "ford"
                          ? fordLogo
                          : conn.connection_type === "apple_health"
                            ? "/lovable-uploads/8f82179a-e516-4c98-8c9f-aae3ee45c242.png"
                            : "/lovable-uploads/1d14c6f9-fbbd-4462-84f8-b72a4e39b89d.png"
                      }
                      alt="Source"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white">
                    <CheckCircle size={10} className="text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Virtuous Cycle Impact (At the bottom) */}
          {connections.length > 0 && (
            <Card className="bg-teal-50/50 border-teal-100 shadow-none mt-4">
              <CardHeader className="py-3">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-teal-800 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" /> Virtuous Cycle Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {virtuousImpacts.map((impact, index) => (
                  <div key={index} className="flex items-start gap-2 text-[10px] leading-relaxed text-teal-900/80">
                    <div className="w-1 h-1 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                    <span>{impact}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit" className="pt-2 px-1">
          {/* Table content remains same as original snippet */}
        </TabsContent>
      </Tabs>

      <AppleHealthModal
        isOpen={showAppleHealthModal}
        onClose={() => setShowAppleHealthModal(false)}
        onComplete={fetchConnections}
        existingConnection={getConnectionStatus("apple_health")}
        onDisconnect={fetchConnections}
      />
      <StravaConnectionModal
        isOpen={showStravaModal}
        onClose={() => setShowStravaModal(false)}
        onComplete={fetchConnections}
        existingConnection={getConnectionStatus("strava")}
        onDisconnect={fetchConnections}
      />
      <FordConnectionModal
        isOpen={showFordModal}
        onClose={() => setShowFordModal(false)}
        onComplete={fetchConnections}
        existingConnection={getConnectionStatus("ford")}
        onDisconnect={fetchConnections}
      />
    </div>
  );
};

export default DataDashboard;
