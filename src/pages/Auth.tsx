import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Lock, User, KeyRound } from "lucide-react";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const defaultIsLogin = searchParams.get("mode") !== "signup";

  // Standard Auth States
  const [isLogin, setIsLogin] = useState(defaultIsLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // OTP Password Reset States
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "verify">("request");
  const [resetEmail, setResetEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const returnTo = searchParams.get("return_to");
    if (returnTo === "hub") {
      sessionStorage.setItem("return_to_hub", "true");
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && !isResetMode) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams, isResetMode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome to IDIA!", description: "You've have now entered the IDIA Protocol." });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: "com.thebigidia.app://onboarding",
          },
        });
        if (error) throw error;
        toast({ title: "Account created!", description: "Please check your email to verify your account." });
      }
    } catch (error: any) {
      toast({ title: "Authentication failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin.includes("localhost")
            ? "http://localhost:8080"
            : "https://life.thebigidia.com",
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: `${provider} Sign In failed`, description: error.message, variant: "destructive" });
      setIsLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
      if (error) throw error;
      toast({ title: "Code Sent!", description: "Check your email for the recovery code." });
      setResetStep("verify");
    } catch (error: any) {
      toast({ title: "Failed to send code", description: error.message, variant: "destructive" });
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: resetEmail,
        token: otpCode,
        type: "recovery",
      });
      if (verifyError) throw verifyError;

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      toast({ title: "Password Updated!", description: "Security reset successful." });
      setIsResetMode(false);
      navigate("/");
    } catch (error: any) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]">
      <Card className="w-full max-w-md animate-fade-in shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isResetMode ? "Reset Security" : isLogin ? "Hi!" : "Create Account"}
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            {isResetMode
              ? "Recover your sovereign vault access."
              : isLogin
                ? "Sign in to your sovereign account"
                : "Join the IDIA Protocol"}
          </p>
        </CardHeader>
        <CardContent>
          {isResetMode ? (
            resetStep === "request" ? (
              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isResetLoading}>
                  {isResetLoading ? "Sending Code..." : "Send Reset Code"}
                </Button>
                <Button variant="link" onClick={() => setIsResetMode(false)} className="w-full text-xs">
                  Back to sign in
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndReset} className="space-y-4">
                <Input
                  type="text"
                  placeholder="6-Digit Code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="text-center tracking-widest font-mono"
                  maxLength={6}
                  required
                />
                <Input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full" disabled={isResetLoading}>
                  Update Password
                </Button>
              </form>
            )
          ) : (
            <>
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  <User className="mr-2 h-4 w-4" />
                  {isLoading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
                </Button>
              </form>

              <div className="my-6 relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOAuthSignIn("apple")}
                  disabled={isLoading}
                >
                  Sign in with Apple
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={isLoading}
                >
                  Sign in with Google
                </Button>
              </div>

              <div className="mt-6 text-center space-y-2">
                {isLogin && (
                  <Button variant="link" onClick={() => setIsResetMode(true)} className="text-xs text-muted-foreground">
                    Forgot password?
                  </Button>
                )}
                <p className="text-sm text-muted-foreground">
                  {isLogin ? "New to IDIA? " : "Joined already? "}
                  <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="p-0 font-bold text-primary">
                    {isLogin ? "Sign up" : "Sign in"}
                  </Button>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
