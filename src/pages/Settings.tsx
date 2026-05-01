import { useState, useEffect } from "react";
import { ArrowLeft, User, Palette, Shield, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import EnhancedProfileSettings from "@/components/enhanced/EnhancedProfileSettings";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  // Default to the IDIA profile tab since the standard one is removed
  const [activeTab, setActiveTab] = useState("idia-profile");

  // Get tab from URL parameter
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["idia-profile", "appearance", "privacy", "notifications"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Get current user and handle authentication
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      // Redirect if not authenticated
      if (!user) {
        navigate("/auth");
        return;
      }
    };
    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background pt-[max(0.5rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]">
      <div className="container max-w-4xl mx-auto py-2 px-2 sm:px-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          </div>

          {user && (
            <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="text-sm">{user.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 sm:flex-none">
                <p className="text-sm font-medium truncate">{user.user_metadata?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-destructive"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
                <span className="sr-only">Sign out</span>
              </Button>
            </div>
          )}
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
          {/* Changed grid-cols-5 to grid-cols-4 since we removed one tab */}
          <TabsList className="grid w-full grid-cols-4 bg-muted">
            <TabsTrigger value="idia-profile" className="flex items-center gap-2 data-[state=active]:bg-background">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">IDIA</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="idia-profile">
            <EnhancedProfileSettings />
          </TabsContent>

          <TabsContent value="appearance">
            <AppearanceSettings />
          </TabsContent>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Data</CardTitle>
                <CardDescription>Control your data sharing and privacy preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <PrivacySettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Manage your notification preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationSettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
