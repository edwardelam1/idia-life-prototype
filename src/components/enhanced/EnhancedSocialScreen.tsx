import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useSocialGraph } from "@/hooks/useSocialGraph";
import { useEnhancedProfile } from "@/hooks/useEnhancedProfile";
import { supabase } from "@/integrations/supabase/client";
import PsychometricTestingCenter from "../psychometric/PsychometricTestingCenter";
import { fireGraffitiConfetti, fireFinaleConfetti } from "../psychometric/confetti";
import {
  Users,
  Heart,
  Award,
  TrendingUp,
  UserPlus,
  MessageCircle,
  Shield,
  Clock,
  CheckCircle,
  ShieldCheck,
  BrainCircuit,
  ArrowRight,
} from "lucide-react";

const EnhancedSocialScreen: React.FC = () => {
  const {
    friends,
    trustCircles,
    goodDeeds,
    socialMetrics,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    submitGoodDeed,
    createTrustCircle,
  } = useSocialGraph();

  const { profile, updateProfile, loading: profileLoading } = useEnhancedProfile();

  const [newDeedTitle, setNewDeedTitle] = useState("");
  const [newDeedDescription, setNewDeedDescription] = useState("");
  const [newCircleName, setNewCircleName] = useState("");
  const [isSubmittingDeed, setIsSubmittingDeed] = useState(false);

  const [showTestModal, setShowTestModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Execution: Trigger Graffiti Confetti on component mount
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

  const handleCreateTrustCircle = async () => {
    if (!newCircleName.trim()) return;
    await createTrustCircle(newCircleName);
    setNewCircleName("");
  };

  // --- IDIA EDGE FUNCTION EXECUTION ---
  const handleCalculateScore = async (moduleScores: Record<string, number>) => {
    setIsCalculating(true);
    try {
      // 1. Filter out the tutorial module ('tut') to keep the telemetry pure
      const { tut, ...actualTelemetry } = moduleScores;

      // 2. Invoke the Single Source of Truth (The Edge Function)
      const { data, error } = await supabase.functions.invoke("calculate-trust-score", {
        body: {
          user_id: profile?.user_id,
          telemetry: actualTelemetry,
        },
      });

      if (error) throw error;

      // 3. Update Global Profile State
      // This forces all screens to re-render with the new Trust Score & Credit Line
      if (updateProfile) {
        await updateProfile({
          trust_score: data.trust_score,
          available_credit_line: data.credit_line,
        });
      }

      // 4. (Optional) Local feedback for the Simulation UI in the Wallet
      if (typeof setCreditSimulation === "function") {
        setCreditSimulation({
          current_score: profile?.trust_score ?? "NO SCORE",
          simulated_score: data.trust_score,
          actions: ["Psychometric telemetry verified via IDIA Protocol", "Deterministic capital limit recalculated"],
        });
      }
    } catch (err) {
      console.error("IDIA Algorithm Execution Failed:", err);
    } finally {
      setIsCalculating(false);
      setShowTestModal(false);

      // Delay the celebration to ensure the modal is closed
      setTimeout(() => {
        fireFinaleConfetti();
      }, 400);
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
      <div className="p-4 animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="h-32 bg-muted rounded"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Social Network</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Friend
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Add Friend</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Enter friend's email or username" />
              <Button className="w-full bg-teal-600 hover:bg-teal-700">Send Friend Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full bg-muted/20">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="circles">Trust Circles</TabsTrigger>
          <TabsTrigger value="deeds">Good Deeds</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-white border-teal-100 overflow-hidden relative shadow-sm">
            <CardContent className="p-6 relative z-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-600" />
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                      IDIA Trust Score
                    </h2>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-bold tracking-tighter text-foreground">
                      {profile?.trust_score !== null && profile?.trust_score !== undefined
                        ? profile.trust_score
                        : "NO SCORE"}
                    </span>
                    <span className="text-sm text-muted-foreground font-medium">/ 1000</span>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Current Max Advance:{" "}
                    <span className="text-emerald-500 font-bold">
                      ${profile?.available_credit_line?.toLocaleString() || "0"}
                    </span>
                  </p>
                </div>

                <div className="w-full md:w-auto flex flex-col gap-3 p-4 bg-teal-50/50 border border-teal-100 rounded-xl">
                  <div className="space-y-1">
                    <h3 className="font-semibold flex items-center gap-2 text-foreground">
                      <BrainCircuit className="w-4 h-4 text-teal-600" />
                      Need an advance?
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Complete your psychometric validation to establish your deterministic limit.
                    </p>
                  </div>

                  <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
                    <DialogTrigger asChild>
                      <Button className="w-full font-bold shadow-lg shadow-orange-500/20 bg-gradient-to-r from-teal-500 to-orange-500 hover:from-teal-600 hover:to-orange-600 text-white border-none">
                        {isCalculating ? "Calculating..." : "Take our Tests"} <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto bg-white p-0 border-none">
                      <PsychometricTestingCenter onCompleteAll={handleCalculateScore} />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <Heart className="w-4 h-4 text-orange-500" />
                  Reciprocity Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-600">
                  {socialMetrics?.reciprocity_score?.toFixed(1) || "0.0"}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Network Vitality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-600">
                  {socialMetrics?.network_vitality_score?.toFixed(1) || "0.0"}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <Users className="w-4 h-4 text-teal-600" />
                  Network Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-600">
                  {friends.filter((f) => f.status === "accepted").length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white shadow-sm border-none">
            <CardHeader>
              <CardTitle className="text-foreground">Recent Social Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {goodDeeds.slice(0, 5).map((deed) => (
                  <div
                    key={deed.id}
                    className="flex items-center space-x-3 p-3 border border-teal-50 rounded-lg bg-teal-50/20"
                  >
                    <Award className="w-5 h-5 text-orange-400" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{deed.title}</p>
                      <p className="text-sm text-muted-foreground">{new Date(deed.created_at).toLocaleDateString()}</p>
                    </div>
                    {getStatusBadge(deed.verification_status)}
                  </div>
                ))}
                {goodDeeds.length === 0 && <p className="text-center text-muted-foreground py-4">No recent activity</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="friends" className="space-y-4">
          <Card className="bg-white shadow-sm border-none">
            <CardHeader>
              <CardTitle className="text-foreground">Your Friends</CardTitle>
            </CardHeader>
            <CardContent>
              {friends.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No friends yet.</p>
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

        <TabsContent value="circles" className="space-y-4">
          <Card className="bg-white shadow-sm border-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">Trust Circles</CardTitle>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                  Create Circle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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

        <TabsContent value="deeds" className="space-y-4">
          <Card className="bg-white shadow-sm border-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">Good Deeds</CardTitle>
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
            <CardContent>
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

export default EnhancedSocialScreen;
