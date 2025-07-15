
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import FlashingSplashScreen from '@/components/FlashingSplashScreen';
import LandingScreen from '@/components/LandingScreen';
import MainApp from '@/components/MainApp';

const Index = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showFlashingSplash, setShowFlashingSplash] = useState(true);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = () => {
    navigate('/auth');
  };

  const handleFlashingSplashComplete = () => {
    setShowFlashingSplash(false);
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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

  return <MainApp />;
};

export default Index;
