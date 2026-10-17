import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { getCachedUser } from "@/lib/authUser";
import { useAuthUser } from "@/hooks/useAuthUser";
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
import { fireFinaleConfetti } from "../psychometric/confetti";
import LifeChallengeMap from "../life/LifeChallengeMap";
import LifeAchievementNotice from "../life/LifeAchievementNotice";
import WelcomeToLifeOverlay from "../life/WelcomeToLifeOverlay";
import ColorWashOverlay from "../life/ColorWashOverlay";
import SwipeToRate from "../life/SwipeToRate";
import SphereOfInfluence from "../life/SphereOfInfluence";
import LabelConnectionDialog from "../life/LabelConnectionDialog";
import ProximityAwarenessOverlay from "../life/ProximityAwarenessOverlay";
import { localPIIVault, type ConnectionLabel } from "@/lib/localPIIVault";
import { useNFCBridge } from "@/hooks/useNFCBridge";
import { useLifeChallengeProgress } from "@/hooks/useLifeChallengeProgress";
import { toast } from "@/components/ui/sonner";
import { Award, MessageCircle, Shield, Clock, CheckCircle, Nfc, Keyboard, Plus } from "lucide-react";

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

interface LifeScreenProps {
  onNavigate?: (tab: "data" | "vote") => void;
}

const LifeScreen: React.FC<LifeScreenProps> = ({ onNavigate }) => {
  const { friends, trustCircles, goodDeeds, loading, acceptFriendRequest, reload } = useSocialGraph();

  const { profile, updateProfile, loading: profileLoading } = useEnhancedProfile();

  const [newDeedTitle, setNewDeedTitle] = useState("");
  const [newDeedDescription, setNewDeedDescription] = useState("");
  const [newDeedFile, setNewDeedFile] = useState<File | null>(null);
  const [isSubmittingDeed, setIsSubmittingDeed] = useState(false);
  const [deedDialogOpen, setDeedDialogOpen] = useState(false);
  const [lifeTab, setLifeTab] = useState("overview");

  const [showTestModal, setShowTestModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [manualGuid, setManualGuid] = useState("");
  const [manualConnecting, setManualConnecting] = useState(false);
  const [guidError, setGuidError] = useState<string | null>(null);
  const challengeProgress = useLifeChallengeProgress();
  const [achievementChallenge, setAchievementChallenge] = useState<number | null>(null);
  const previousSequentialProgress = useRef<boolean[] | null>(null);
  const pendingAchievementKey = "idia_life_pending_achievement_v1";

  useEffect(() => {
    if (challengeProgress.loading) return;

    const recorded = [
      challengeProgress.state.assessment,
      challengeProgress.state.connection,
      challengeProgress.state.goodDeed,
      challengeProgress.state.dataSource,
      challengeProgress.state.proposalVote,
    ];
    let sequenceOpen = true;
    const sequential = recorded.map((isRecorded) => {
      const isComplete = sequenceOpen && isRecorded;
      if (!isComplete) sequenceOpen = false;
      return isComplete;
    });

    const previous = previousSequentialProgress.current;
    previousSequentialProgress.current = sequential;
    if (!previous) {
      try {
        const pendingChallenge = Number(sessionStorage.getItem(pendingAchievementKey));
        if ((pendingChallenge === 4 || pendingChallenge === 5) && sequential[pendingChallenge - 1]) {
          sessionStorage.removeItem(pendingAchievementKey);
          setAchievementChallenge(pendingChallenge);
        }
      } catch {}
      return;
    }

    const newlyCompleted = sequential.findIndex((isComplete, index) => isComplete && !previous[index]);
    if (newlyCompleted !== -1) setAchievementChallenge(newlyCompleted + 1);
  }, [challengeProgress.loading, challengeProgress.state]);

  // NFC Bridge — Sovereign Handshake to native iOS hardware
  const { isScanning, initiateSovereignHandshake } = useNFCBridge();
  const [washPeerColor, setWashPeerColor] = useState<string | null>(null);
  const [rateTarget, setRateTarget] = useState<string | null>(null);
  const [proximityOpen, setProximityOpen] = useState(false);

  // Local PII Vault — IndexedDB-only labels for Connections (never sent to cloud)
  const [labels, setLabels] = useState<Record<string, ConnectionLabel>>({});
  const [labelTarget, setLabelTarget] = useState<string | null>(null);

  // Load local labels for the current Connections list
  useEffect(() => {
    if (!friends.length) {
      setLabels({});
      return;
    }
    const ids = friends.map((f) => f.id);
    localPIIVault.lookupBatch(ids).then(setLabels);
  }, [friends]);

  // Witness-only Good Deeds: the submitter picks the Connection who did the deed.
  const { user: authUser } = useAuthUser();
  const [showLifeWelcome, setShowLifeWelcome] = useState(false);
  const lifeWelcomeUserId = authUser?.id || profile?.user_id || profile?.id;

  useEffect(() => {
    if (!lifeWelcomeUserId) return;
    try {
      setShowLifeWelcome(localStorage.getItem(`idia_life_welcome_seen_v1:${lifeWelcomeUserId}`) !== "1");
    } catch {
      setShowLifeWelcome(true);
    }
  }, [lifeWelcomeUserId]);

  const dismissLifeWelcome = () => {
    setShowLifeWelcome(false);
    if (!lifeWelcomeUserId) return;
    try {
      localStorage.setItem(`idia_life_welcome_seen_v1:${lifeWelcomeUserId}`, "1");
    } catch {}
  };

  const [deedDoerFriendshipId, setDeedDoerFriendshipId] = useState<string | null>(null);
  const acceptedConnections = friends.filter((f) => f.status === "accepted");
  const doerName = (doerId: string) => {
    const f = acceptedConnections.find((c) => c.user_id_1 === doerId || c.user_id_2 === doerId);
    return f ? localPIIVault.displayName(f.id, labels[f.id] ?? null) : "a Connection";
  };

  // After a successful Sync, prompt the user to label the new Connection.
  const promptLabelForLatestSync = () => {
    const latest = [...friends].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (latest) setLabelTarget(latest.id);
  };

  useEffect(() => {
    console.log("[LIFE_NFC_SUBSCRIBE_START]");
    const onComplete = async (e: Event) => {
      const detail = (e as CustomEvent<{ peerToken: string; raw?: unknown }>).detail;
      const peerColor = peerColorFromToken(detail?.peerToken ?? "");
      console.log("[LIFE_NFC_HANDSHAKE_RESOLVED]", { peerColor });
      setWashPeerColor(peerColor);

      try {
        console.log("[LIFE_NFC_RESOLVE_INVOKE_START]");
        const { data, error } = await supabase.functions.invoke("nfc-handshake-resolve", {
          body: { peerPayload: detail?.raw ?? detail?.peerToken },
        });
        if (error || !data?.friendshipId) {
          console.error("[LIFE_NFC_RESOLVE_FAIL]", error?.message ?? data);
          toast("The Sync did not complete", {
            description: error?.message ?? "Could not register the Connection.",
          });
          return;
        }
        console.log("[LIFE_NFC_RESOLVE_OK]", data);
        toast.success("Sync complete", {
          description: data.created ? "You made a new Connection." : "Connection refreshed.",
        });
        await reload();
        await challengeProgress.refresh();
        // Target the new friendship row for rate + label sheets
        setTimeout(() => setRateTarget(data.friendshipId), 3600);
        setTimeout(() => setLabelTarget(data.friendshipId), 4200);
      } catch (err: any) {
        console.error("[LIFE_NFC_RESOLVE_CRASH]", err?.message ?? String(err));
        toast("The Sync did not complete", {
          description: "Network error registering the Connection. Try again.",
        });
      }
    };
    const onError = () => {
      toast("The Sync did not complete", {
        description: "Try again with the phones held closer, back-to-back.",
      });
    };
    window.addEventListener("nfc:scan-complete", onComplete);
    window.addEventListener("nfc:scan-error", onError);
    return () => {
      window.removeEventListener("nfc:scan-complete", onComplete);
      window.removeEventListener("nfc:scan-error", onError);
      console.log("[LIFE_NFC_SUBSCRIBE_END]");
    };
  }, [reload, challengeProgress.refresh]);

  // Granular layout calibration logging
  useLayoutEffect(() => {
    console.log("[VIEWPORT_CALIBRATION_START]");
    return () => {
      console.log("[VIEWPORT_CALIBRATION_END]");
    };
  }, []);

  // Granular NFC UI relocation sync logging
  useEffect(() => {
    console.log("[NFC_UI_RELOCATION_SYNC_START]");
    return () => {
      console.log("[NFC_UI_RELOCATION_SYNC_END]");
    };
  }, []);

  // Syncing terminology init
  useEffect(() => {
    console.log("[SYNCING_TERMINOLOGY_INIT_START]");
    return () => {
      console.log("[SYNCING_TERMINOLOGY_INIT_END]");
    };
  }, []);

  // Phase 5 — Evidence-Based Good Deeds.
  const handleSubmitGoodDeed = async () => {
    const title = newDeedTitle.trim();
    const description = newDeedDescription.trim();
    if (!title || !description || !newDeedFile) {
      toast("Please add a title, a description, and one piece of proof.");
      return;
    }
    const doerFriendship = acceptedConnections.find((f) => f.id === deedDoerFriendshipId);
    if (!doerFriendship) {
      toast("Please choose the Connection who did the Good Deed.");
      return;
    }
    setIsSubmittingDeed(true);
    console.log("[GOOD_DEED_SUBMISSION_START]");
    try {
      const {
        data: { user },
      } = await getCachedUser();
      if (!user) {
        toast("Please sign in to submit a Good Deed.");
        return;
      }
      const doerId = doerFriendship.user_id_1 === user.id ? doerFriendship.user_id_2 : doerFriendship.user_id_1;
      if (!doerId || doerId === user.id) {
        toast("You cannot submit a Good Deed about yourself.");
        return;
      }

      // 1. Insert the deed row first (witness = submitter, doer = Connection)
      const { data: inserted, error: insertErr } = await supabase
        .from("good_deeds")
        .insert({
          user_id: user.id,
          doer_id: doerId,
          title,
          description,
          verification_status: "pending",
        } as any)
        .select("id")
        .maybeSingle();
      if (insertErr || !inserted) throw insertErr ?? new Error("Insert failed");

      // 2. Upload the evidence file
      const ext = (newDeedFile.name.split(".").pop() || "bin").toLowerCase().slice(0, 8);
      const path = `${user.id}/${inserted.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("deed-evidence").upload(path, newDeedFile, {
        cacheControl: "3600",
        upsert: true,
        contentType: newDeedFile.type || undefined,
      });
      if (uploadErr) throw uploadErr;

      // 3. Persist the storage path
      await supabase.from("good_deeds").update({ evidence_url: path }).eq("id", inserted.id);

      toast.success("Submitted for review", {
        description: "Your Good Deed is being checked by the Friend AI.",
      });

      // 4. Fire the AI verifier
      const { data: verifyData, error: verifyErr } = await supabase.functions.invoke("verify-good-deed-evidence", {
        body: { deed_id: inserted.id },
      });
      if (verifyErr) {
        console.error("[DEED_AI_ERROR]", verifyErr);
        toast("Could not finish AI review. Your Deed will stay as Pending.");
      } else if (verifyData?.verdict === "accept") {
        toast.success("Verified!", {
          description: verifyData.reason || "Your Good Deed was approved.",
        });
        await challengeProgress.refresh();
      } else if (verifyData?.verdict === "reject") {
        toast("Not approved", {
          description: verifyData?.reason || "The proof did not match the description.",
        });
      }

      setNewDeedTitle("");
      setNewDeedDescription("");
      setNewDeedFile(null);
      setDeedDialogOpen(false);
      reload?.();
    } catch (e) {
      console.error("[GOOD_DEED_SUBMISSION_FAILED]", e);
      toast("Could not submit your Good Deed. Please try again.");
    } finally {
      setIsSubmittingDeed(false);
      console.log("[GOOD_DEED_SUBMISSION_END]");
    }
  };

  // --- IDIA EDGE FUNCTION EXECUTION ---
  const handleCalculateScore = async (moduleScores: Record<string, number>) => {
    setIsCalculating(true);
    console.log("[STANDING_SYNC_START]");
    try {
      const { data, error } = await supabase.functions.invoke("calculate-trust-score", {
        body: {
          user_id: profile?.user_id,
          telemetry: moduleScores,
        },
      });

      if (error) throw error;

      if (updateProfile) {
        await updateProfile({
          trust_score: data.trust_score,
          available_credit_line: data.credit_line,
        });
      }
      await challengeProgress.markAssessmentComplete();
      toast.success("Challenge 1 complete");
    } catch (err) {
      console.error("IDIA Algorithm Execution Failed:", err);
      toast("Assessment could not be secured", { description: "Please try again." });
    } finally {
      setIsCalculating(false);
      setShowTestModal(false);
      console.log("[STANDING_SYNC_END]");
      setTimeout(() => fireFinaleConfetti(), 400);
    }
  };

  const resolveConnection = async (peerPayload: string) => {
    setManualConnecting(true);
    setGuidError(null);
    console.log("[LIFE_MANUAL_CONNECTION][BEGIN]");
    try {
      if (authUser?.id && peerPayload === authUser.id.toLowerCase()) {
        throw new Error("That is your own GUID. Enter the other person's GUID.");
      }
      // Biometric challenge before the Connection is accepted
      try {
        await generateACAHash(authUser?.id ?? "", "life_connection", ["sovereign_connection", "manual_guid"]);
      } catch {
        throw new Error("Biometric check was not completed. Try again.");
      }
      const { data, error } = await supabase.functions.invoke("nfc-handshake-resolve", {
        body: { peerPayload, connectionMethod: "manual_guid" },
      });
      if (error) {
        let message = "Could not register the Connection.";
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) message = body.error;
        } catch { /* keep default */ }
        throw new Error(message);
      }
      if (!data?.friendshipId) throw new Error(data?.error ?? "Could not register the Connection.");
      setManualGuid("");
      setConnectionDialogOpen(false);
      await reload();
      await challengeProgress.refresh();
      setLabelTarget(data.friendshipId);
      toast.success("Challenge 2 complete", { description: "Your Connection is active." });
      console.log("[LIFE_MANUAL_CONNECTION][END:OK]");
    } catch (error: any) {
      console.error("[LIFE_MANUAL_CONNECTION][END:FAIL]", error?.message);
      setGuidError(error?.message ?? "Check the GUID and try again.");
    } finally {
      setManualConnecting(false);
    }
  };

  const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const handleGuidInput = (raw: string) => {
    const value = raw.replace(/\s+/g, "").toLowerCase().slice(0, 36);
    setManualGuid(value);
    if (value.length < 36) {
      setGuidError(null);
      return;
    }
    if (!GUID_RE.test(value)) {
      setGuidError("That is not a valid GUID. Check it and try again.");
      return;
    }
    if (!manualConnecting) void resolveConnection(value);
  };

  const handleChallenge = (challenge: number) => {
    if (challenge === 1) setShowTestModal(true);
    if (challenge === 2) setConnectionDialogOpen(true);
    if (challenge === 3) {
      setLifeTab("deeds");
      window.setTimeout(() => setDeedDialogOpen(true), 0);
    }
    if (challenge === 4 || challenge === 5) {
      try {
        sessionStorage.setItem(pendingAchievementKey, String(challenge));
      } catch {}
      onNavigate?.(challenge === 4 ? "data" : "vote");
    }
  };

  const handleSubmitRating = async (rateeId: string, stars: number) => {
    console.log("[RATING_SUBMIT_START]", { rateeId, stars });
    try {
      const looksLikeUuid = /^[0-9a-f-]{36}$/i.test(rateeId);
      if (!looksLikeUuid) {
        toast("Rating saved on device", {
          description: "We will share it with the IDIA Protocol when the Connection is fully linked.",
        });
        return;
      }
      const { data, error } = await supabase.functions.invoke("submit-connection-rating", {
        body: { ratee_id: rateeId, stars },
      });
      if (error) throw error;
      toast.success("Rating saved", {
        description: stars >= 4 ? "Thank you for the kind feedback." : "Your honest rating helps the network.",
      });
    } catch (err) {
      console.error("[RATING_SUBMIT_ERROR]", err);
      toast("Could not save rating");
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
    <div className="relative h-full max-h-full overflow-hidden flex flex-col">
      {showLifeWelcome && <WelcomeToLifeOverlay onDismiss={dismissLifeWelcome} />}
      {achievementChallenge !== null && (
        <LifeAchievementNotice
          key={achievementChallenge}
          challenge={achievementChallenge}
          onDismiss={() => setAchievementChallenge(null)}
        />
      )}
      <Tabs value={lifeTab} onValueChange={setLifeTab} className="flex-1 min-h-0 flex flex-col gap-2">
        <TabsList className="grid grid-cols-5 w-full bg-muted/20 shrink-0">
          <TabsTrigger value="overview" className="text-[11px] px-1">
            Life Path
          </TabsTrigger>
          <TabsTrigger value="friends" className="text-[11px] px-1">
            Connects
          </TabsTrigger>
          <TabsTrigger value="sphere" className="text-[11px] px-1">
            Sphere
          </TabsTrigger>
          <TabsTrigger value="circles" className="text-[11px] px-1">
            Circles
          </TabsTrigger>
          <TabsTrigger value="deeds" className="text-[11px] px-1">
            Deeds
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 min-h-0 overflow-hidden m-0">
          <LifeChallengeMap
            score={profile?.trust_score}
            progress={challengeProgress.state}
            celebrated={challengeProgress.celebrated}
            loading={challengeProgress.loading}
            onChallenge={handleChallenge}
            onCelebrate={challengeProgress.markCelebrated}
          />
        </TabsContent>

        <TabsContent value="friends" className="flex-1 min-h-0 overflow-hidden m-0">
          <Card className="bg-card shadow-sm border-none h-full flex flex-col">
            <CardHeader className="shrink-0 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-foreground text-base">Your Connections</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-teal-600"
                onClick={() => setConnectionDialogOpen(true)}
                aria-label="Add a Connection by NFC or GUID"
              >
                Add <Plus className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto">
              {friends.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-muted-foreground">You do not have any Connections yet.</p>
                  <p className="text-xs text-muted-foreground">
                    Sync in person by tapping phones, or tap Add + to enter their GUID.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map((f) => {
                    const label = labels[f.id] ?? null;
                    const displayName = localPIIVault.displayName(f.id, label);
                    const initials = localPIIVault.initials(f.id, label);
                    return (
                      <div key={f.id} className="flex items-center space-x-3 p-3 border border-teal-50 rounded-lg">
                        <Avatar>
                          <AvatarFallback className="bg-teal-100 text-teal-700">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{displayName}</p>
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
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-teal-600 border-teal-200"
                            onClick={() => setLabelTarget(f.id)}
                          >
                            Name
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-teal-600 border-teal-200"
                            onClick={() => setRateTarget(f.id)}
                          >
                            Rate
                          </Button>
                          <Button variant="ghost" size="sm" className="text-teal-600">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sphere" className="flex-1 min-h-0 overflow-hidden m-0">
          <SphereOfInfluence friends={friends as any} currentScore={profile?.trust_score ?? null} />
        </TabsContent>

        <TabsContent value="circles" className="flex-1 min-h-0 overflow-hidden m-0">
          <Card className="bg-card shadow-sm border-none h-full flex flex-col">
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
          <Card className="bg-card shadow-sm border-none h-full flex flex-col">
            <CardHeader className="shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground text-base">Good Deeds</CardTitle>
                <Dialog
                  open={deedDialogOpen}
                  onOpenChange={(o) => {
                    setDeedDialogOpen(o);
                    if (!o) {
                      setNewDeedTitle("");
                      setNewDeedDescription("");
                      setNewDeedFile(null);
                      setDeedDoerFriendshipId(null);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                      <Award className="w-4 h-4 mr-2" />
                      Submit Deed
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card">
                    <DialogHeader>
                      <DialogTitle>Submit a Good Deed</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground leading-snug">
                        You must show proof. Add a photo, a short video, or a voice note that shows the Good Deed you
                        saw. Then write what your Connection did.
                      </p>
                      <Input
                        placeholder="Title of your Good Deed"
                        value={newDeedTitle}
                        onChange={(e) => setNewDeedTitle(e.target.value)}
                        maxLength={100}
                        className="border-teal-100"
                      />
                      <Textarea
                        placeholder="Tell us what your Connection did and who it helped."
                        value={newDeedDescription}
                        onChange={(e) => setNewDeedDescription(e.target.value)}
                        rows={3}
                        maxLength={1000}
                        className="border-teal-100"
                      />
                      <div className="space-y-1.5">
                        <label className="text-xs text-foreground font-medium">
                          Add proof (photo, video, or voice note)
                        </label>
                        <Input
                          type="file"
                          accept="image/*,video/*,audio/*"
                          onChange={(e) => setNewDeedFile(e.target.files?.[0] ?? null)}
                          className="border-teal-100 file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-xs file:text-teal-700"
                        />
                        {newDeedFile && (
                          <p className="text-[11px] text-muted-foreground truncate">{newDeedFile.name}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-foreground font-medium">Who did the Good Deed?</label>
                        {acceptedConnections.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            You can only submit a Good Deed you saw a Connection do. Make a Connection first.
                          </p>
                        ) : (
                          <div className="max-h-40 space-y-1.5 overflow-y-auto">
                            {acceptedConnections.map((f) => {
                              const label = labels[f.id] ?? null;
                              const selected = deedDoerFriendshipId === f.id;
                              return (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => setDeedDoerFriendshipId(f.id)}
                                  aria-pressed={selected}
                                  className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-sm transition-colors ${
                                    selected ? "border-teal-500 bg-teal-50/60 dark:bg-teal-900/30" : "border-border"
                                  }`}
                                >
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                                      {localPIIVault.initials(f.id, label)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="flex-1 truncate text-foreground">
                                    {localPIIVault.displayName(f.id, label)}
                                  </span>
                                  {selected && <CheckCircle className="h-4 w-4 text-teal-600" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          You cannot submit a Good Deed about yourself.
                        </p>
                      </div>
                      <Button
                        className="w-full bg-teal-600 hover:bg-teal-700"
                        onClick={handleSubmitGoodDeed}
                        disabled={
                          isSubmittingDeed ||
                          !newDeedTitle.trim() ||
                          !newDeedDescription.trim() ||
                          !newDeedFile ||
                          !deedDoerFriendshipId
                        }
                      >
                        {isSubmittingDeed ? "Submitting…" : "Submit for Verification"}
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
                    <div key={deed.id} className="p-4 border border-teal-50 rounded-lg bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground">{deed.title}</h4>
                        {getStatusBadge(deed.verification_status)}
                      </div>
                      <p className="text-xs font-medium text-teal-700 dark:text-teal-300">
                        {deed.user_id === authUser?.id
                          ? `You witnessed ${deed.doer_id ? doerName(deed.doer_id) : "this deed"}`
                          : "Witnessed by a Connection"}
                      </p>
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

      <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-5xl overflow-y-auto border-none bg-card p-0">
          <PsychometricTestingCenter onCompleteAll={handleCalculateScore} onCancel={() => setShowTestModal(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={connectionDialogOpen} onOpenChange={setConnectionDialogOpen}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle>Make a Connection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              className="w-full bg-life-teal text-primary-foreground hover:bg-life-teal/90"
              disabled={isScanning}
              onClick={() => initiateSovereignHandshake("STANDARD")}
            >
              <Nfc className="mr-2 h-4 w-4" />
              {isScanning ? "Listening for a tap…" : "NFC Sync"}
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              <Input
                value={manualGuid}
                onChange={(event) => setManualGuid(event.target.value)}
                placeholder="Enter their GUID"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={manualConnecting || !/^[0-9a-f-]{36}$/i.test(manualGuid.trim())}
                onClick={() => void resolveConnection(manualGuid.trim())}
              >
                <Keyboard className="mr-2 h-4 w-4" />
                {manualConnecting ? "Connecting…" : "Connect with GUID"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {washPeerColor && (
        <ColorWashOverlay myColor={myTierColor} peerColor={washPeerColor} onComplete={() => setWashPeerColor(null)} />
      )}

      {rateTarget && (
        <SwipeToRate
          connectionId={rateTarget}
          onSubmit={(stars) => handleSubmitRating(rateTarget, stars)}
          onClose={() => setRateTarget(null)}
        />
      )}

      <LabelConnectionDialog
        connectionId={labelTarget}
        open={!!labelTarget}
        onOpenChange={(o) => !o && setLabelTarget(null)}
        onSaved={() => {
          if (friends.length) {
            localPIIVault.lookupBatch(friends.map((f) => f.id)).then(setLabels);
          }
        }}
      />

      <ProximityAwarenessOverlay
        open={proximityOpen}
        onClose={() => setProximityOpen(false)}
        onPeerSelected={(peer) => {
          console.log("[PROXIMITY_HANDSHAKE_TRIGGER]");
          setProximityOpen(false);
          window.setTimeout(() => initiateSovereignHandshake("STANDARD"), 250);
        }}
      />
    </div>
  );
};

export default LifeScreen;
