// Index page — straight to MainApp after auth
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import FlashingSplashScreen from '@/components/FlashingSplashScreen';
import LandingScreen from '@/components/LandingScreen';
import MainApp from '@/components/MainApp';

const OAUTH_SPLASH_SUPPRESS_UNTIL_KEY = 'idia_oauth_splash_suppress_until_v1';

const shouldSuppressSplash = () => {
  if (typeof window === 'undefined') return false;
  try {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hasAuthCallbackMarkers =
      search.has('code') ||
      search.has('error') ||
      hash.has('access_token') ||
      hash.has('refresh_token') ||
      hash.has('error');

    const rawUntil =
      sessionStorage.getItem(OAUTH_SPLASH_SUPPRESS_UNTIL_KEY) ||
      localStorage.getItem(OAUTH_SPLASH_SUPPRESS_UNTIL_KEY);
    const suppressUntil = rawUntil ? Number(rawUntil) : 0;

    return hasAuthCallbackMarkers || (Number.isFinite(suppressUntil) && suppressUntil > Date.now());
  } catch {
    return false;
  }
};

const clearSplashSuppression = () => {
  try {
    sessionStorage.removeItem(OAUTH_SPLASH_SUPPRESS_UNTIL_KEY);
    localStorage.removeItem(OAUTH_SPLASH_SUPPRESS_UNTIL_KEY);
  } catch {}
};

const Index = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showFlashingSplash, setShowFlashingSplash] = useState(() => !shouldSuppressSplash());

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authenticated = !!session?.user;
      if (authenticated) clearSplashSuppression();
      setIsAuthenticated(authenticated);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const authenticated = !!session?.user;
      if (authenticated) clearSplashSuppression();
      setIsAuthenticated(authenticated);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = () => {
    navigate('/auth');
  };

  const handleFlashingSplashComplete = () => {
    setShowFlashingSplash(false);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-center">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showFlashingSplash) {
      return <FlashingSplashScreen onComplete={handleFlashingSplashComplete} />;
    }
    return <LandingScreen onSignUp={handleSignUp} />;
  }

  // Authenticated: never replay splash (avoids post-OAuth loop-back to splash)
  

  return <MainApp />;
};

export default Index;
