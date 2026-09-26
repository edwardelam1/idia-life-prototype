import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Lock, User, KeyRound } from "lucide-react";
import { runVaultGuard } from "@/lib/vaultGuard";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import polishedLogo from "@/assets/IDIA_Life_Logo_Polished.png";

const AUTH_HISTORY_KEY = "idia_has_auth_history_v1";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");
  const defaultIsLogin =
    modeParam === "signup"
      ? false
      : modeParam === "login"
        ? true
        : (() => {
            try {
              return localStorage.getItem(AUTH_HISTORY_KEY) === "1";
            } catch {
              return false;
            }
          })();

  const [isLogin, setIsLogin] = useState(defaultIsLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && !isResetMode) {
        try {
          localStorage.setItem(AUTH_HISTORY_KEY, "1");
        } catch {}
        try {
          const { isNewUser } = await runVaultGuard(session.user.id);
          navigate(isNewUser ? "/recovery-phrase" : "/", { replace: true });
        } catch (e: any) {
          toast({ title: "Vault check failed", description: e.message, variant: "destructive" });
          navigate("/", { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams, isResetMode, toast]);

  // ══════════════════════════════════════════════════════════════════════
  // GLOBAL NATIVE BRIDGE LISTENERS (Always Active)
  // ══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const handleNativeAuthMessage = (event: MessageEvent) => {
      const type = event?.data?.type;
      if (type === "IDIA_AUTH_CANCELLED") {
        setIsLoading(false);
        toast({ title: "Sign in cancelled", description: "Please try again when you're ready." });
      } else if (type === "IDIA_AUTH_COMPLETE") {
        setIsLoading(false);
      }
    };

    const handleNativeAppleSuccess = async (e: CustomEvent | any) => {
      const payload = e?.detail || e;
      if (!payload?.identityToken) return;

      setIsLoading(true);

      try {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: payload.identityToken,
        });

        if (error) throw error;

        // Zero-PII Caching
        if (payload.email || payload.firstName || payload.lastName) {
          try {
            await SecureStoragePlugin.set({
              key: "user_pii_profile",
              value: JSON.stringify({
                first_name: payload.firstName || "",
                last_name: payload.lastName || "",
                email: payload.email || "",
                phone: "",
              }),
            });
          } catch (storageErr) {
            console.warn("⚠️ Local PII seal failed.", storageErr);
          }
        }

        toast({ title: "Identity Verified", description: "Welcome to your Sovereign Vault." });
        setIsLoading(false);
        navigate("/", { replace: true });
      } catch (err: any) {
        // 🚨 This catch block guarantees the spinner dies if Supabase throws the audience error
        toast({ title: "Apple Sign In failed", description: err.message, variant: "destructive" });
        setIsLoading(false);
      }
    };

    const handleNativeAppleError = (e: CustomEvent | any) => {
      const errorMsg = e?.detail?.error || e?.error || "Authentication cancelled.";
      if (!String(errorMsg).toLowerCase().includes("cancel")) {
        toast({ title: "Apple Sign In failed", description: errorMsg, variant: "destructive" });
      }
      setIsLoading(false);
    };

    window.addEventListener("message", handleNativeAuthMessage);
    window.addEventListener("apple-signin:success", handleNativeAppleSuccess as EventListener);
    window.addEventListener("apple-signin:error", handleNativeAppleError as EventListener);
    (window as any).onAppleSignInSuccess = handleNativeAppleSuccess;

    return () => {
      window.removeEventListener("message", handleNativeAuthMessage);
      window.removeEventListener("apple-signin:success", handleNativeAppleSuccess as EventListener);
      window.removeEventListener("apple-signin:error", handleNativeAppleError as EventListener);
      delete (window as any).onAppleSignInSuccess;
    };
  }, [navigate, toast]);

  // ==========================================
  // OAUTH TRIGGER
  // ==========================================
  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    setIsLoading(true);
    try {
      const { Capacitor } = await import("@capacitor/core");
      const isNative = Capacitor.isNativePlatform();
      const webkit = (window as any)?.webkit;

      // 1. Force Native Shell Handler if available
      if (provider === "apple" && webkit?.messageHandlers?.appleSignIn) {
        webkit.messageHandlers.appleSignIn.postMessage({});

        // 60-Second Deadman Switch
        setTimeout(() => {
          setIsLoading((prev) => {
            if (prev) {
              toast({
                title: "Timeout",
                description: "Apple Sign In timed out. Please try again.",
                variant: "destructive",
              });
            }
            return false;
          });
        }, 60000);
        return;
      }

      // 2. Native Capacitor Apple Fallback
      if (provider === "apple" && isNative) {
        const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
        const result: any = await SignInWithApple.authorize({
          clientId: "com.thebigidia.app",
          redirectURI: `${window.location.origin}/`,
          scopes: "email name",
        });

        const { error } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: result.response.identityToken,
        });
        if (error) throw error;
        return;
      }

      // 3. Native Capacitor Google Fallback
      if (provider === "google" && isNative) {
        const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
        await GoogleAuth.initialize({
          clientId: "349472255801-091p5a3320h0kb9636hjsd2otfs160ct.apps.googleusercontent.com",
          scopes: ["profile", "email"],
          grantOfflineAccess: false,
        });
        const result: any = await GoogleAuth.signIn();

        if (!result?.authentication?.idToken) throw new Error("Missing Google ID token.");
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: result.authentication.idToken,
        });
        if (error) throw error;
        return;
      }

      // 4. Standard Web OAuth
      const inIdiaShell =
        typeof navigator !== "undefined" &&
        (/IDIA-Native-Shell/i.test(navigator.userAgent) || !!webkit?.messageHandlers?.appleSignIn);

      const useDeepLink = isNative || (inIdiaShell && provider === "google");

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: useDeepLink ? "idialife://auth-callback" : `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: `${provider} Sign In failed`, description: error.message, variant: "destructive" });
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        supabase.functions.invoke("send-security-alert", { body: { event: "new_login" } }).catch(() => {});
        toast({ title: "Welcome back!", description: "You've been signed in successfully." });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;

        const alreadyRegistered = !data.session && (!data.user || (data.user.identities?.length ?? 0) === 0);

        if (alreadyRegistered) {
          setIsLogin(true);
          setPassword("");
          toast({
            title: "Account may already exists",
            description: "This account may already registered. Try signing in with your existing credentials.",
            variant: "destructive",
          });
          return;
        }

        toast({ title: "Account created!", description: "Please check your email to verify your account." });
      }
    } catch (error: any) {
      toast({ title: "Authentication failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { email: resetEmail },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Code Sent!",
        description: "Check your email for the 6-digit recovery code.",
      });
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

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      supabase.functions.invoke("send-security-alert", { body: { event: "password_changed" } }).catch(() => {});
      toast({ title: "Password Updated!", description: "Your password has been successfully changed." });

      setResetStep("request");
      setResetEmail("");
      setOtpCode("");
      setNewPassword("");
      setIsResetMode(false);
      navigate("/");
    } catch (error: any) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } finally {
      setIsResetLoading(false);
    }
  };

  if (isResetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/40 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]">
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="space-y-1">
            <div className="flex justify-center pb-2">
              <img src={polishedLogo} alt="Life by IDIA logo" className="w-16 h-16 rounded-2xl shadow-lg" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
            <p className="text-sm text-muted-foreground text-center">
              {resetStep === "request"
                ? "Enter your email address and we'll send you a 6-digit code."
                : "Enter the 6-digit code sent to your email and your new password."}
            </p>
          </CardHeader>
          <CardContent>
            {resetStep === "request" ? (
              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isResetLoading}>
                  {isResetLoading ? "Sending Code..." : "Send Reset Code"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndReset} className="space-y-4">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="6-Digit Code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="pl-10 tracking-widest font-mono text-center"
                    maxLength={6}
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                <Button type="submit" className="w-full" disabled={isResetLoading}>
                  {isResetLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            )}

            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => {
                  setIsResetMode(false);
                  setResetStep("request");
                }}
                className="text-sm"
              >
                Back to sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/40 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="space-y-1">
          <div className="flex justify-center pb-2">
            <img src={polishedLogo} alt="Life by IDIA logo" className="w-16 h-16 rounded-2xl shadow-lg" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            {isLogin ? "Sign in to your Life account" : "Sign up to get started with Life"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
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
                className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              <User className="mr-2 h-4 w-4" />
              {isLoading ? (isLogin ? "Signing in..." : "Creating account...") : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="my-4 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthSignIn("apple")}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Sign in with Apple
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthSignIn("google")}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </Button>
          </div>

          {isLogin && (
            <div className="mt-4 text-center">
              <Button variant="link" onClick={() => setIsResetMode(true)} className="text-sm">
                Forgot your password?
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="text-sm p-0 font-semibold">
                {isLogin ? "Sign up" : "Sign in"}
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
