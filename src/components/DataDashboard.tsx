import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Activity, CheckCircle, DollarSign, Zap, FileKey, Search, Loader2, Info } from "lucide-react";
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

  // ACA Tracking Logic
  const [searchHash, setSearchHash] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<any>(null);

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
      // 1. Check Ingestion
      const { data: aca } = await supabase
        .from("user_aca_records")
        .select("id")
        .eq("aca_hash_key", searchHash)
        .maybeSingle();

      // 2. Check Processing
      let inQueue = false;
      if (aca) {
        const { data: proc } = await supabase
          .from("data_processing_queue")
          .select("processing_status")
          .eq("raw_data_id", aca.id)
          .maybeSingle();
        inQueue = proc?.processing_status === "completed" || proc?.processing_status === "processing";
      }

      // 3. Check Staged
      const { data: staged } = await supabase
        .from("staged_health_data")
        .select("id")
        .eq("aca_hash_key", searchHash)
        .maybeSingle();

      // 4. Check Purchased
      const { data: egress } = await supabase
        .from("egress_logs")
        .select("id")
        .contains("aca_record_references", [searchHash])
        .maybeSingle();

      setTrackingStatus({
        ingested: !!aca,
        processing: inQueue,
        staged: !!staged,
        purchased: !!egress,
      });
    } catch (err) {
      console.error("Audit lookup failed:", err);
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
    } finally {
      setAcaLoading(false);
    }
  };

  const fetchConnections = async () => {
    if (!currentUserId) return;
    try {
      const [conn, wallet] = await Promise.all([
        supabase.from("data_connections").select("*").eq("user_id", currentUserId).eq("is_active", true),
        supabase.from("user_wallets").select("cash_balance").eq("user_id", currentUserId).maybeSingle(),
      ]);
      if (conn.data) setConnections(conn.data);
      if (wallet.data) setTotalEarnings(wallet.data.cash_balance);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const StatusLight = ({ active, label }: { active: boolean; label: string }) => (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-3 h-3 rounded-full shadow-sm transition-all duration-500 ${active ? "bg-emerald-500 shadow-emerald-500/50" : "bg-red-500/20"}`}
      />
      <span className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground">{label}</span>
    </div>
  );

  if (loading) return <div className="p-8 animate-pulse bg-white rounded-xl h-64 border" />;

  return (
    <div className="space-y-4 bg-white min-h-screen p-1">
      {/* 1. Wallet Summary (Teal Gradient) */}
      <Card className="bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] text-white border-none shadow-lg">
        <CardContent className="p-5 flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-teal-100/70 tracking-widest">Sovereign Liquidity</p>
            <p className="text-3xl font-black">
              ${totalEarnings.toFixed(2)} <span className="text-sm font-normal text-teal-100/50">USD</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
        </CardContent>
      </Card>

      {/* 2. NEW: Data Flow Tracker (Orange Accents) */}
      <Card className="border-border bg-white shadow-sm overflow-hidden">
        <div className="bg-[hsl(28,80%,55%)]/5 px-4 py-2 border-b border-[hsl(28,80%,55%)]/10 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[hsl(28,80%,55%)]" />
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[hsl(28,80%,55%)]">Data Flow Lifecycle</h3>
        </div>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Paste ACA Hash (Audit Key)..."
                className="pl-8 text-[11px] h-9 border-muted"
                value={searchHash}
                onChange={(e) => setSearchHash(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="bg-[hsl(178,42%,32%)] hover:bg-[hsl(178,42%,42%)] h-9 px-4"
              onClick={handleAcaSearch}
              disabled={isTracking}
            >
              {isTracking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track"}
            </Button>
          </div>

          <div className="grid grid-cols-4 items-center pt-2 relative">
            {/* Visual connector line */}
            <div className="absolute top-[5px] left-1/2 -translate-x-1/2 w-[75%] h-[1px] bg-muted -z-0" />
            <StatusLight active={trackingStatus?.ingested} label="Ingested" />
            <StatusLight active={trackingStatus?.processing} label="Processing" />
            <StatusLight active={trackingStatus?.staged} label="Staged" />
            <StatusLight active={trackingStatus?.purchased} label="Purchased" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Connections & Transactions */}
      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger
            value="connections"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[hsl(178,42%,32%)] font-bold text-xs"
          >
            Connections
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[hsl(178,42%,32%)] font-bold text-xs"
          >
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-6 pt-2">
          {/* Data Sources */}
          <div className="px-1">
            <h2 className="text-sm font-black text-foreground uppercase tracking-widest mb-4">Connected Sources</h2>
            <div className="flex flex-wrap gap-6 justify-center">
              {connections.map((c) => (
                <div
                  key={c.id}
                  className="relative group cursor-pointer"
                  onClick={() =>
                    c.connection_type === "apple_health" ? setShowAppleHealthModal(true) : setShowStravaModal(true)
                  }
                >
                  <div className="w-16 h-16 rounded-2xl bg-white border-2 border-emerald-500 shadow-sm p-3 transition-transform group-hover:scale-105">
                    <img
                      src={
                        c.connection_type === "apple_health"
                          ? "/lovable-uploads/8f82179a-e516-4c98-8c9f-aae3ee45c242.png"
                          : "/lovable-uploads/1d14c6f9-fbbd-4462-84f8-b72a4e39b89d.png"
                      }
                      alt={c.connection_type}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white shadow-sm">
                    <CheckCircle size={10} className="text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Virtuous Impact (Moved to Bottom) */}
          {connections.length > 0 && (
            <Card className="bg-muted/30 border-none shadow-none mt-8">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Activity className="w-3 h-3" /> Virtuous Impact Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {virtuousImpacts.map((impact, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-white/50 border border-white">
                    <div className="w-1.5 h-1.5 rounded-full bg-[hsl(178,42%,32%)] mt-1 shrink-0" />
                    <p className="text-[11px] leading-relaxed text-foreground/80 font-medium">{impact}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit" className="pt-2">
          <Card className="border-none shadow-none">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-muted">
                  <TableHead className="text-[10px] uppercase font-bold tracking-tighter">Event Source</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-tighter">ACA Key</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acaRecords.map((r) => (
                  <TableRow key={r.id} className="border-muted">
                    <TableCell className="text-xs font-bold text-foreground">{r.source_id}</TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                      {r.aca_hash_key}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connection Modals */}
      <AppleHealthModal
        isOpen={showAppleHealthModal}
        onClose={() => setShowAppleHealthModal(false)}
        onComplete={handleAcaSearch}
        existingConnection={connections.find((c) => c.connection_type === "apple_health")}
        onDisconnect={fetchConnections}
      />
      <StravaConnectionModal
        isOpen={showStravaModal}
        onClose={() => setShowStravaModal(false)}
        onComplete={handleAcaSearch}
        existingConnection={connections.find((c) => c.connection_type === "strava")}
        onDisconnect={fetchConnections}
      />
      <FordConnectionModal
        isOpen={showFordModal}
        onClose={() => setShowFordModal(false)}
        onComplete={handleAcaSearch}
        existingConnection={connections.find((c) => c.connection_type === "ford")}
        onDisconnect={fetchConnections}
      />
    </div>
  );
};

export default DataDashboard;
