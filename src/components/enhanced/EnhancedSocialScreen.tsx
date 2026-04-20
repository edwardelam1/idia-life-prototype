import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { useSocialGraph } from "@/hooks/useSocialGraph";
import { useEnhancedProfile } from "@/hooks/useEnhancedProfile";
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

  // Pull profile to access current trust score and credit line
  const { profile, updateProfile } = useEnhancedProfile();

  const [newDeedTitle, setNewDeedTitle] = useState("");
  const [newDeedDescription, setNewDeedDescription] = useState("");
  const [newCircleName, setNewCircleName] = useState("");
  const [isSubmittingDeed, setIsSubmittingDeed] = useState(false);




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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      accepted: "default",
      verified: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Social Network</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Friend
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Friend</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Enter friend's email or username" />
              <Button className="w-full">Send Friend Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="circles">Trust Circles</TabsTrigger>
          <TabsTrigger value="deeds">Good Deeds</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Trust Score & Capital Advance CTA */}
          <Card className="bg-[#0a0a0a] border-primary/20 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                      IDIA Trust Score
                    </h2>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-bold text-white tracking-tighter">
                      {profile?.trust_score || "---"}
                    </span>
                    <span className="text-sm text-muted-foreground font-medium">/ 1000</span>
                  </div>
                  <p className="text-sm text-gray-400 max-w-sm">
                    Current Max Advance:{" "}
                    <span className="text-emerald-400 font-bold">
                      ${profile?.available_credit_line?.toLocaleString() || "0"}
                    </span>
                  </p>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Social Health Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  Reciprocity Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {socialMetrics?.reciprocity_score?.toFixed(1) || "0.0"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">How much you give vs receive</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Network Vitality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {socialMetrics?.network_vitality_score?.toFixed(1) || "0.0"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">How active your network is</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Network Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {friends.filter((f) => f.status === "accepted").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Connected friends</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Social Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {goodDeeds.slice(0, 5).map((deed) => (
                  <div key={deed.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Award className="w-5 h-5 text-yellow-500" />
                    <div className="flex-1">
                      <p className="font-medium">{deed.title}</p>
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
          <Card>
            <CardHeader>
              <CardTitle>Your Friends ({friends.filter((f) => f.status === "accepted").length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Avatar>
                      <AvatarImage src={friend.friend_profile?.avatar_url || ""} />
                      <AvatarFallback>
                        {friend.friend_profile?.first_name?.[0]}
                        {friend.friend_profile?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {friend.friend_profile?.display_name ||
                          `${friend.friend_profile?.first_name} ${friend.friend_profile?.last_name}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Friends since {new Date(friend.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(friend.status)}
                      {friend.status === "pending" && (
                        <Button size="sm" onClick={() => acceptFriendRequest(friend.id)}>
                          Accept
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {friends.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No friends yet. Start by adding some friends!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="circles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Trust Circles ({trustCircles.length})</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">Create Circle</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Trust Circle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Circle name"
                        value={newCircleName}
                        onChange={(e) => setNewCircleName(e.target.value)}
                      />
                      <Button className="w-full" onClick={handleCreateTrustCircle} disabled={!newCircleName.trim()}>
                        Create Circle
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trustCircles.map((circle) => (
                  <div key={circle.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium">{circle.name}</p>
                      <p className="text-sm text-muted-foreground">{circle.member_count || 0} members</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>
                ))}
                {trustCircles.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No trust circles yet. Create one to organize your close friends!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deeds" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Good Deeds ({goodDeeds.length})</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Award className="w-4 h-4 mr-2" />
                      Submit Deed
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Submit Good Deed</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Deed title"
                        value={newDeedTitle}
                        onChange={(e) => setNewDeedTitle(e.target.value)}
                      />
                      <Textarea
                        placeholder="Describe your good deed..."
                        value={newDeedDescription}
                        onChange={(e) => setNewDeedDescription(e.target.value)}
                        rows={3}
                      />
                      <Button
                        className="w-full"
                        onClick={handleSubmitGoodDeed}
                        disabled={isSubmittingDeed || !newDeedTitle.trim() || !newDeedDescription.trim()}
                      >
                        {isSubmittingDeed ? "Submitting..." : "Submit for Verification"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {goodDeeds.map((deed) => (
                  <div key={deed.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{deed.title}</h4>
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
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          Verified {new Date(deed.verified_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {goodDeeds.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No good deeds submitted yet. Share your positive impact!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedSocialScreen;
