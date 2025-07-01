
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Key, Zap, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        navigate('/');
      }
    };

    // Check for password reset mode
    const mode = searchParams.get('mode');
    if (mode === 'reset-password') {
      setShowUpdatePassword(true);
    }

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  const handleSignUp = async () => {
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter both email and password.",
        variant: "destructive"
      });
      return;
    }

    setIsSigningUp(true);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive"
      });
    } else if (data.user && !data.session) {
      toast({
        title: "Check your email",
        description: "We sent you a confirmation link. Please check your email and click the link to verify your account.",
      });
    } else if (data.session) {
      toast({
        title: "Sign up successful",
        description: "Your account has been created and you're now signed in.",
      });
    }
    
    setIsSigningUp(false);
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter both email and password.",
        variant: "destructive"
      });
      return;
    }

    setIsSigningIn(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
    }
    
    setIsSigningIn(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast({
        title: "Missing information",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      return;
    }

    setIsResettingPassword(true);

    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error('Failed to send reset email');
      }

      toast({
        title: "Reset email sent",
        description: "Check your email for password reset instructions.",
      });
      
      setShowResetForm(false);
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing information",
        description: "Please enter and confirm your new password.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both password fields match.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast({
        title: "Password update failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
      navigate('/');
    }

    setIsUpdatingPassword(false);
  };

  if (showUpdatePassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-xl flex items-center justify-center gap-2 text-white">
              <Key className="w-5 h-5" />
              Update Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <Button 
              onClick={handleUpdatePassword} 
              disabled={isUpdatingPassword}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResetForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResetForm(false)}
                className="absolute left-4 text-gray-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Mail className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl text-white">Reset Password</CardTitle>
            <p className="text-gray-300 text-sm mt-2">Enter your email to receive reset instructions</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <Button 
              onClick={handleResetPassword} 
              disabled={isResettingPassword}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isResettingPassword ? 'Sending...' : 'Send Reset Email'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8">
        <img 
          src="/lovable-uploads/a1fcabab-f9bb-4a81-9b30-10d1aab93545.png" 
          alt="IDIA Life Logo" 
          className="w-16 h-16 rounded-2xl shadow-lg mx-auto mb-4"
        />
        <div className="flex items-center justify-center gap-3">
          <Zap className="w-6 h-6 text-teal-400" />
          <h1 className="text-2xl font-bold">IDIA Life</h1>
        </div>
        <p className="text-gray-400 text-center mt-2">Data Monetization Platform</p>
      </div>

      {/* Authentication Form */}
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-xl flex items-center justify-center gap-2 text-white">
            <Mail className="w-5 h-5" />
            Welcome
          </CardTitle>
          <p className="text-gray-300 text-sm">Sign in to your account or create a new one</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={handleSignIn} 
              disabled={isSigningIn}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Key className="w-4 h-4 mr-2" />
              {isSigningIn ? 'Signing In...' : 'Sign In'}
            </Button>
            <Button 
              onClick={handleSignUp} 
              disabled={isSigningUp}
              variant="outline"
              className="w-full border-white/30 text-white hover:bg-white/10"
            >
              {isSigningUp ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => setShowResetForm(true)}
              className="text-gray-300 hover:text-white text-sm"
            >
              Forgot your password?
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Test Link */}
      <div className="mt-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/pipeline-test')}
          className="text-gray-400 hover:text-white text-sm"
        >
          Pipeline Test Manager →
        </Button>
      </div>
    </div>
  );
};

export default Auth;
