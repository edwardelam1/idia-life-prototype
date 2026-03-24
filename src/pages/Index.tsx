
// Updated Index page with onboarding flow
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import FlashingSplashScreen from '@/components/FlashingSplashScreen';
import LandingScreen from '@/components/LandingScreen';
import OnboardingScreen from '@/components/OnboardingScreen';
import MainApp from '@/components/MainApp';

const Index = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showFlashingSplash, setShowFlashingSplash] = useState(true);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
      if (session?.user) {
        await checkProfileComplete(session.user.id);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session?.user);
      if (session?.user) {
        await checkProfileComplete(session.user.id);
      } else {
        setProfileComplete(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProfileComplete = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, date_of_birth, phone_number, full_legal_address')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      setProfileComplete(false);
      return;
    }

    const addr = data.full_legal_address as any;
    const complete = !!(
      data.first_name &&
      data.last_name &&
      data.date_of_birth &&
      data.phone_number &&
      addr && addr.street1 && addr.city && addr.state && addr.zip
    );
    setProfileComplete(complete);
  };

  const handleSignUp = () => {
    navigate('/auth');
  };

  const handleFlashingSplashComplete = () => {
    setShowFlashingSplash(false);
  };

  const handleOnboardingComplete = () => {
    setProfileComplete(true);
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

  // Authenticated but profile not yet checked
  if (profileComplete === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-center">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Profile incomplete — show onboarding
  if (!profileComplete) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return <MainApp />;
};

export default Index;
