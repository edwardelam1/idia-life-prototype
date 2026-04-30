import React, { useState, useEffect, useLayoutEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useSocialGraph } from "@/hooks/useSocialGraph";
import { useEnhancedProfile } from "@/hooks/useEnhancedProfile";
import { supabase } from "@/integrations/supabase/client";
import PsychometricTestingCenter from "../psychometric/PsychometricTestingCenter";
import { fireGraffitiConfetti, fireFinaleConfetti } from "../psychometric/confetti";
import StandingOrb from "../life/StandingOrb";
import ColorWashOverlay from "../life/ColorWashOverlay";
import { useNFCBridge } from "@/hooks/useNFCBridge";
import { toast } from "sonner";
import {
  Heart,
  Award,
  TrendingUp,
  MessageCircle,
  Shield,
  Clock,
  CheckCircle,
  BrainCircuit,
  Users,
  ArrowRight,
  Nfc,
} from "lucide-react";

// Placeholder — derives a peer tier hue from the opaque native peer token
// until the finalized iOS contract ships. Stable hash → hue.
function peerColorFromToken(token: string): string {
  let h = 0;
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 80%, 60%)`;
}

// Resolve the user's tier color for the NFC color wash
function tierColorForScore(score: number | null | undefined): string {
  if (score === null || score === undefined || score === 0) return "hsla(200, 80%, 70%, 0.1)";
  if (score <= 110) return "hsl(0, 0%, 100%)";
  if (score <= 220) return "hsl(48, 95%, 55%)";
  if (score <= 330) return "hsl(145, 75%, 45%)";
  if (score <= 440) return "hsl(215, 90%, 55%)";
  if (score <= 550) return "hsl(278, 75%, 55%)";
  if (score <= 660) return "hsl(2, 85%, 55%)";
  if (score <= 770) return "hsl(25, 100%, 55%)";
  if (score <= 880) return "hsl(25, 55%, 35%)";
  return "hsl(0, 0%, 4%)";
}

const LifeScreen: React.FC = () => {
  const { friends, trustCircles, goodDeeds, socialMetrics, loading, submitGoodDeed, acceptFriendRequest } =
    useSocialGraph();

  const { profile, updateProfile, loading: profileLoading } = useEnhancedProfile();

  const [newDeedTitle, setNewDeedTitle] = useState("");
  const [newDeedDescription, setNewDeedDescription] = useState("");
  const [isSubmittingDeed, setIsSubmittingDeed] = useState(false);

  const [showTestModal, setShowTestModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Granular layout calibration logging — paired start/end on mount/unmount
  useLayoutEffect(() => {
    console.log("[VIEWPORT_CALIBRATION_START]");
    return () => {
      console.log("[VIEWPORT_CALIBRATION_END]");
    };
  }, []);

  // Granular NFC UI relocation sync logging — paired
  useEffect(() => {
    console.log("[NFC_UI_RELOCATION_SYNC_START]");
    return () => {
      console.log("[NFC_UI_RELOCATION_SYNC_END]");
    };
  }, []);

  useEffect(() => {
    fireGraffitiConfetti();
  }, []);

  const handleSubmitGoodDeed = async () => {
    if (!newDeedTitle.trim() || !newDeedDescription.trim()) return;
    setIsSubmittingDeed(true);
    try {
      await submitGoodDeed(newDeedTitle, newDeedDescription);
      setNewDeedTitle("");
      setNewDeedDescription("");
    } finally {
      setIsSubmittingDeed(false);
    }
  };

  // --- IDIA EDGE FUNCTION EXECUTION (preserved) ---
  const handleCalculateScore = async (moduleScores: Record<string, number>) => {
    setIsCalculating(true);
    console.log("[STANDING_SYNC_START]");
    try {
      const { tut, ...actualTelemetry } = moduleScores;

      const { data, error } = await supabase.functions.invoke("calculate-trust-score", {
        body: {
          user_id: profile?.user_id,
          telemetry: actualTelemetry,
        },
      });

      if (error) throw error;

      if (updateProfile) {
        await updateProfile({
          trust_score: data.trust_score,
          available_credit_line: data.credit_line,
        });
      }
    } catch (err) {
      console.error("IDIA Algorithm Execution Failed:", err);
    } finally {
      setIsCalculating(false);
      setShowTestModal(false);
      console.log("[STANDING_SYNC_END]");
      setTimeout(() => fireFinaleConfetti(), 400);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      accepted: "default",
      verified: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (loading || profileLoading) {
    return (
      <div className="p-4 animate-pulse space-y-4 h-full overflow-hidden">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="h-32 bg-muted rounded"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  const myTierColor = tierColorForScore(profile?.trust_score);

  return (
    <div className="h-full max-h-full overflow-hidden flex flex-col">
      <Tabs defaultValue="overview" className="flex-1 min-h-0 flex flex-col gap-2">
        <TabsList className="grid grid-cols-4 w-full bg-muted/20 shrink-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="friends">Connections</TabsTrigger>
          <TabsTrigger value="circles">Trust Circles</TabsTrigger>
          <TabsTrigger value="deeds">Good Deeds</TabsTrigger>
        </TabsList>

        {/* OVERVIEW — zero-scroll, all elements fit on a standard mobile viewport */}
        <TabsContent value="overview" className="flex-1 min-h-0 overflow-hidden m-0">
          <div className="h-full flex flex-col gap-2">
            {/* Standing Card — contains Orb + Action Panel + relocated NFC */}
            <Card className="bg-white border-teal-100 shadow-sm flex-1 min-h-0 overflow-hidden">
              <CardContent className="p-4 h-full">
                <div className="flex flex-col items-center gap-3 h-full">
                  <StandingOrb score={profile?.trust_score ?? null} size={170} />

                  <div className="w-full flex flex-col gap-2 p-3 bg-teal-50/50 border border-teal-100 rounded-xl">
                    <div className="space-y-0.5">
                      <h3 className="font-semibold flex items-center gap-2 text-foreground text-sm">
                        <BrainCircuit className="w-4 h-4 text-teal-600" />
                        Establish Your Standing
                      </h3>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Complete your psychometric validation to deepen the chromatic resolution of your standing.
                      </p>
                    </div>

                    <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="w-full font-bold shadow-lg shadow-orange-500/20 bg-gradient-to-r from-teal-500 to-orange-500 hover:from-teal-600 hover:to-orange-600 text-white border-none"
                        >
                          {isCalculating ? "Calculating..." : "Take our Tests"}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto bg-white p-0 border-none">
                        <PsychometricTestingCenter
                          onCompleteAll={handleCalculateScore}
                          onCancel={() => setShowTestModal(false)}
                        />
                      </DialogContent>
                    </Dialog>

                    {/* Relocated NFC — ~28px below "Take our Tests", nested inside the standing card */}
                    <div className="mt-7 pt-3 border-t border-teal-100 flex justify-center">
                      <NFCHandshake myTierColor={myTierColor} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compact metrics row */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-2 flex flex-col items-center">
                  <Heart className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-[10px] text-muted-foreground mt-0.5">Reciprocity</span>
                  <span className="text-base font-bold text-teal-600 leading-tight">
                    {socialMetrics?.reciprocity_score?.toFixed(1) || "0.0"}
                  </span>
                </CardContent>
              </Card>
              <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-2 flex flex-col items-center">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] text-muted-foreground mt-0.5">Vitality</span>
                  <span className="text-base font-bold text-teal-600 leading-tight">
                    {socialMetrics?.network_vitality_score?.toFixed(1) || "0.0"}
                  </span>
                </CardContent>
              </Card>
              <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-2 flex flex-col items-center">
                  <Users className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-[10px] text-muted-foreground mt-0.5">Network</span>
                  <span className="text-base font-bold text-teal-600 leading-tight">
                    {friends.filter((f) => f.status === "accepted").length}
                  </span>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="friends" className="flex-1 min-h-0 overflow-hidden m-0">
          <Card className="bg-white shadow-sm border-none h-full flex flex-col">
            <CardHeader className="shrink-0">
              <CardTitle className="text-foreground text-base">Your Connections</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto">
              {friends.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-muted-foreground">No connections yet.</p>
                  <p className="text-xs text-muted-foreground">
                    Connections are made by physical NFC tap only — there is no manual search.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map((f) => (
                    <div key={f.id} className="flex items-center space-x-3 p-3 border border-teal-50 rounded-lg">
                      <Avatar>
                        <AvatarFallback className="bg-teal-100 text-teal-700">
                          {f.friend_profile?.first_name?.[0]}
                          {f.friend_profile?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{f.friend_profile?.display_name || "User"}</p>
                        <p className="text-sm text-muted-foreground">
                          Connected {new Date(f.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(f.status)}
                        {f.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-teal-600 border-teal-200"
                            onClick={() => acceptFriendRequest(f.id)}
                          >
                            Accept
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-teal-600">
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="circles" className="flex-1 min-h-0 overflow-hidden m-0">
          <Card className="bg-white shadow-sm border-none h-full flex flex-col">
            <CardHeader className="shrink-0">
              <CardTitle className="text-foreground text-base">Trust Circles</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto">
              {trustCircles.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No trust circles yet.</p>
              ) : (
                <div className="space-y-3">
                  {trustCircles.map((circle) => (
                    <div key={circle.id} className="flex items-center space-x-3 p-3 border border-teal-50 rounded-lg">
                      <Shield className="w-5 h-5 text-teal-500" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{circle.name}</p>
                        <p className="text-sm text-muted-foreground">{circle.member_count || 0} members</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-teal-600 border-teal-200">
                        Manage
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deeds" className="flex-1 min-h-0 overflow-hidden m-0">
          <Card className="bg-white shadow-sm border-none h-full flex flex-col">
            <CardHeader className="shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground text-base">Good Deeds</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                      <Award className="w-4 h-4 mr-2" />
                      Submit Deed
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Submit Good Deed</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Deed title"
                        value={newDeedTitle}
                        onChange={(e) => setNewDeedTitle(e.target.value)}
                        className="border-teal-100"
                      />
                      <Textarea
                        placeholder="Describe your good deed..."
                        value={newDeedDescription}
                        onChange={(e) => setNewDeedDescription(e.target.value)}
                        rows={3}
                        className="border-teal-100"
                      />
                      <Button
                        className="w-full bg-teal-600 hover:bg-teal-700"
                        onClick={handleSubmitGoodDeed}
                        disabled={isSubmittingDeed || !newDeedTitle.trim()}
                      >
                        {isSubmittingDeed ? "Submitting..." : "Submit for Verification"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto">
              {goodDeeds.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No good deeds submitted yet.</p>
              ) : (
                <div className="space-y-3">
                  {goodDeeds.map((deed) => (
                    <div key={deed.id} className="p-4 border border-teal-50 rounded-lg bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground">{deed.title}</h4>
                        {getStatusBadge(deed.verification_status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{deed.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(deed.created_at).toLocaleDateString()}
                        </span>
                        {deed.verified_at && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            Verified {new Date(deed.verified_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LifeScreen;
