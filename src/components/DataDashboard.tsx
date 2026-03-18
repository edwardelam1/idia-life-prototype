import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  CheckCircle,
  DollarSign,
  Zap,
  Shield,
  Heart,
  MapPin,
  Footprints,
  Watch,
  AlertTriangle,
  Lock,
  TrendingUp,
  Gift,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppleHealthModal from "./AppleHealthModal";
import StravaConnectionModal from "./StravaConnectionModal";
import NikeConnectionModal from "./NikeConnectionModal";
import DataSourceModal from "./DataSourceModal";

interface DataSource {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
  category: "health" | "fitness" | "wearable" | "lifestyle";
  earnings_rate: string;
}

const DATA_SOURCES: DataSource[] = [
  {
    id: "apple_health",
    name: "Apple Health",
    type: "apple_health",
    icon: "/lovable-uploads/8f82179a-e516-4c98-8c9f-aae3ee45c242.png",
    description: "Sleep, HRV, Activity, Workouts",
    category: "health",
    earnings_rate: "$0.02/day",
  },
  {
    id: "google_fit",
    name: "Google Fit",
    type: "google_fit",
    icon: "/gstatic.com/images/branding/product/1x/gfit_512dp.png",
    description: "Steps, Heart Rate, Sleep",
    category: "health",
    earnings_rate: "$0.02/day",
  },
  {
    id: "strava",
    name: "Strava",
    type: "strava",
    icon: "/lovable-uploads/1d14c6f9-fbbd-4462-84f8-b72a4e39b89d.png",
    description: "Running, Cycling, Activities",
    category: "fitness",
    earnings_rate: "$0.03/activity",
  },
  {
    id: "nike",
    name: "Nike Run Club",
    type: "nike",
    icon: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg",
    description: "Runs, Training, Achievements",
    category: "fitness",
    earnings_rate: "$0.03/activity",
  },
];

interface ConsentSettings {
  allow_health: boolean;
  allow_activity: boolean;
  allow_location: boolean;
}

const DataDashboard = () => {
  const [connections, setConnections] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sources");

  // Modal states
  const [showAppleHealthModal, setShowAppleHealthModal] = useState(false);
  const [showStravaModal, setShowStravaModal] = useState(false);
  const [showNikeModal, setShowNikeModal] = useState(false);
  const [showGoogleFitModal, setShowGoogleFitModal] = useState(false);

  const [virtuousImpacts, setVirtuousImpacts] = useState<string[]>([]);
  const [lastSyncStatus, setLastSyncStatus] = useState<string>("unknown");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // HRI Score (simulated)
  const [hriScore, setHriScore] = useState(72);
  const [trustScore, setTrustScore] = useState(850);

  // Consent settings
  const [consents, setConsents] = useState<ConsentSettings>({
    allow_health: true,
    allow_activity: true,
    allow_location: false,
  });

  // Minor status (simulated - would come from profile)
  const [isMinor, setIsMinor] = useState(false);
  const [ghostModeActive, setGhostModeActive] = useState(false);

  // Rewards ledger (simulated)
  const [recentRewards, setRecentRewards] = useState([
    { id: 1, source: "Apple Health", amount: 0.02, timestamp: new Date().toISOString(), type: "health_data" },
    {
      id: 2,
      source: "Strava Run",
      amount: 0.03,
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      type: "activity",
    },
    {
      id: 3,
      source: "Sleep Data",
      amount: 0.02,
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      type: "health_data",
    },
  ]);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };

    getUser();
    fetchConnections();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchConnections();
    }
  }, [currentUserId]);

  useEffect(() => {
    // If minor, enforce ghost mode
    if (isMinor) {
      setGhostModeActive(true);
      setConsents({
        allow_health: false,
        allow_activity: false,
        allow_location: false,
      });
    }
  }, [isMinor]);

  const fetchConnections = async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    try {
      const [pipelineHealthResult, connectionsResult, walletResult, recentDataResult] = await Promise.allSettled([
        supabase.functions.invoke("pipeline-diagnostics"),
        supabase.from("data_connections").select("*").eq("user_id", currentUserId).eq("is_active", true),
        supabase.from("user_wallets").select("*").eq("user_id", currentUserId).maybeSingle(),
        supabase
          .from("raw_health_data")
          .select("created_at")
          .eq("user_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (pipelineHealthResult.status === "rejected") {
        console.warn("Pipeline health check failed:", pipelineHealthResult.reason);
      }

      if (connectionsResult.status === "rejected") {
        console.error("Error fetching connections:", connectionsResult.reason);
        setConnections([]);
        setTotalEarnings(0);
        setLoading(false);
        return;
      }

      const connectionsData = connectionsResult.value.data || [];

      let totalEarned = 0;
      if (walletResult.status === "fulfilled") {
        totalEarned = walletResult.value.data?.total_earned || 0;
      }

      if (recentDataResult.status === "fulfilled" && recentDataResult.value.data?.length > 0) {
        const lastDataTime = new Date(recentDataResult.value.data[0].created_at);
        const hoursSinceLastData = (Date.now() - lastDataTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastData > 24) {
          setLastSyncStatus("stale");
        } else if (hoursSinceLastData > 6) {
          setLastSyncStatus("delayed");
        } else {
          setLastSyncStatus("recent");
        }
      } else {
        setLastSyncStatus("no_data");
      }

      setConnections(connectionsData);
      setTotalEarnings(totalEarned);

      if (connectionsData.length > 0) {
        fetchVirtuousImpacts();
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

      if (error || !data?.impacts?.length) {
        setVirtuousImpacts(fallbackImpacts);
        return;
      }
      setVirtuousImpacts(data.impacts);
    } catch {
      setVirtuousImpacts(fallbackImpacts);
    }
  };

  const triggerFriendForDataEvent = () => {
    window.dispatchEvent(
      new CustomEvent("showFriend", {
        detail: { trigger: "data" },
      }),
    );
  };

  const getConnectionStatus = (connectionType: string) => {
    return connections.find((conn) => conn.connection_type === connectionType);
  };

  const handleSourceClick = (sourceType: string) => {
    switch (sourceType) {
      case "apple_health":
        setShowAppleHealthModal(true);
        break;
      case "strava":
        setShowStravaModal(true);
        break;
      case "nike":
        setShowNikeModal(true);
        break;
      case "google_fit":
        setShowGoogleFitModal(true);
        break;
    }
  };

  const handleConnectionComplete = async () => {
    await fetchConnections();
    triggerFriendForDataEvent();
  };

  const getHRIColor = () => {
    if (hriScore >= 70) return "text-green-600";
    if (hriScore >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getHRIBg = () => {
    if (hriScore >= 70) return "bg-green-500";
    if (hriScore >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getHRIStatus = () => {
    if (hriScore >= 70) return "Optimal";
    if (hriScore >= 40) return "Moderate";
    return "Needs Attention";
  };

  const handleConsentChange = (key: keyof ConsentSettings, value: boolean) => {
    if (isMinor && value) {
      // Minors cannot enable data sharing without guardian consent
      return;
    }
    setConsents((prev) => ({ ...prev, [key]: value }));
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
      {/* Ghost Mode Warning for Minors */}
      {ghostModeActive && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3 flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Ghost Mode Active</p>
              <p className="text-xs text-amber-600">Data sharing disabled for minor account protection</p>
            </div>
            <Lock className="w-4 h-4 text-amber-600" />
          </CardContent>
        </Card>
      )}

      {/* Trust Score & Earnings Row */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Trust Score</span>
            </div>
            <p className="text-2xl font-bold">{trustScore}</p>
            <Badge variant="outline" className="text-xs mt-1">
              Verified
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs text-teal-100">Data Earnings</span>
            </div>
            <p className="text-2xl font-bold">${totalEarnings.toFixed(2)}</p>
            <span className="text-xs text-teal-100">IDIA-USD</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="consent">Consent</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>

        {/* Data Sources Tab */}
        <TabsContent value="sources" className="space-y-4 mt-4">
          {/* Connected Sources */}
          {connections.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Connected</h3>
              <div className="grid grid-cols-2 gap-3">
                {DATA_SOURCES.filter((source) => getConnectionStatus(source.type)).map((source) => (
                  <Card
                    key={source.id}
                    className="cursor-pointer border-green-200 bg-green-50/50 hover:shadow-md transition-shadow"
                    onClick={() => handleSourceClick(source.type)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center overflow-hidden relative">
                          <img src={source.icon} alt={source.name} className="w-8 h-8 object-contain" />
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{source.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{source.description}</p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {source.earnings_rate}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Available Sources */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Available Sources</h3>
            <div className="grid grid-cols-2 gap-3">
              {DATA_SOURCES.filter((source) => !getConnectionStatus(source.type)).map((source) => (
                <Card
                  key={source.id}
                  className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
                  onClick={() => handleSourceClick(source.type)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        <img src={source.icon} alt={source.name} className="w-8 h-8 object-contain opacity-75" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{source.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{source.description}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {source.earnings_rate}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Virtuous Cycle Impact */}
          {connections.length > 0 && virtuousImpacts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Virtuous Cycle Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {virtuousImpacts.map((impact, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{impact}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Consent Tab */}
        <TabsContent value="consent" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Data Sharing Preferences
              </CardTitle>
              <p className="text-xs text-muted-foreground">Control what data you share to earn rewards</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Health Data Consent */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-medium text-sm">Health Data</p>
                    <p className="text-xs text-muted-foreground">Sleep, HRV, Heart Rate</p>
                  </div>
                </div>
                <Switch
                  checked={consents.allow_health}
                  onCheckedChange={(val) => handleConsentChange("allow_health", val)}
                  disabled={isMinor}
                />
              </div>

              {/* Activity Data Consent */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Footprints className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-sm">Activity Data</p>
                    <p className="text-xs text-muted-foreground">Steps, Workouts, Exercises</p>
                  </div>
                </div>
                <Switch
                  checked={consents.allow_activity}
                  onCheckedChange={(val) => handleConsentChange("allow_activity", val)}
                  disabled={isMinor}
                />
              </div>

              {/* Location Data Consent */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium text-sm">Location Data</p>
                    <p className="text-xs text-muted-foreground">Geo-temporal patterns</p>
                  </div>
                </div>
                <Switch
                  checked={consents.allow_location}
                  onCheckedChange={(val) => handleConsentChange("allow_location", val)}
                  disabled={isMinor}
                />
              </div>

              {isMinor && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-amber-800">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-xs">Guardian consent required to enable data sharing</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Privacy Info */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Your Data, Your Control</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All data is anonymized before processing. You earn IDIA-USD for each validated data packet. Toggle
                    off anytime to stop sharing specific data types.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                Rewards Ledger
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentRewards.map((reward) => (
                  <div key={reward.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{reward.source}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(reward.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      +${reward.amount.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Earnings Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Earnings by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-sm">Health Data</span>
                  </div>
                  <span className="font-medium text-sm">$0.06</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Activity Data</span>
                  </div>
                  <span className="font-medium text-sm">$0.03</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Watch className="w-4 h-4 text-purple-500" />
                    <span className="text-sm">Wearable Sync</span>
                  </div>
                  <span className="font-medium text-sm">$0.00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AppleHealthModal
        isOpen={showAppleHealthModal}
        onClose={() => setShowAppleHealthModal(false)}
        onComplete={handleConnectionComplete}
        existingConnection={getConnectionStatus("apple_health")}
        onDisconnect={fetchConnections}
      />

      <StravaConnectionModal
        isOpen={showStravaModal}
        onClose={() => setShowStravaModal(false)}
        onComplete={handleConnectionComplete}
        existingConnection={getConnectionStatus("strava")}
        onDisconnect={fetchConnections}
      />

      <NikeConnectionModal
        isOpen={showNikeModal}
        onClose={() => setShowNikeModal(false)}
        onConnect={async () => {
          setShowNikeModal(false);
          await handleConnectionComplete();
        }}
      />

      <DataSourceModal
        isOpen={showGoogleFitModal}
        onClose={() => setShowGoogleFitModal(false)}
        source={{
          name: "Google Fit",
          icon: Activity,
          estimatedEarnings: "$0.60/month",
          privacyLevel: "High",
          description: "Sync your Google Fit health and activity data to earn rewards",
          dataTypes: ["Steps", "Heart Rate", "Sleep", "Workouts"],
        }}
      />
    </div>
  );
};

export default DataDashboard;
