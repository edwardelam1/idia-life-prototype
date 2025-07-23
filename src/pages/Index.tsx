
// Enhanced Index page with comprehensive onboarding flow
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedProfile } from '@/hooks/useEnhancedProfile';
import FlashingSplashScreen from '@/components/FlashingSplashScreen';
import { WelcomeCarousel } from '@/components/onboarding/WelcomeCarousel';
import { AccountTypeSelection } from '@/components/onboarding/AccountTypeSelection';
import { InterestsSelection } from '@/components/onboarding/InterestsSelection';
import MainApp from '@/components/MainApp';

const Index = () => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useEnhancedProfile();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showFlashingSplash, setShowFlashingSplash] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState<'welcome' | 'account-type' | 'interests' | 'complete'>('welcome');

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
      if (session?.user) {
        // User just logged in, check if they need onboarding
        setOnboardingStep('welcome');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Determine onboarding status for authenticated users
  useEffect(() => {
    if (isAuthenticated && profile && !profileLoading) {
      // Check if user has completed basic onboarding
      if (!profile.account_type) {
        setOnboardingStep('account-type');
      } else if (profile.motivational_phase === 'acquisition') {
        setOnboardingStep('interests');
      } else {
        setOnboardingStep('complete');
      }
    }
  }, [isAuthenticated, profile, profileLoading]);

  const handleSignUp = () => {
    navigate('/auth');
  };

  const handleLogIn = () => {
    navigate('/auth');
  };

  const handleFlashingSplashComplete = () => {
    setShowFlashingSplash(false);
  };

  const handleAccountTypeSelect = async (accountType: 'personal' | 'business' | 'non-profit') => {
    // This would typically update the profile through the enhanced profile hook
    // For now, move to interests selection
    setOnboardingStep('interests');
  };

  const handleOnboardingComplete = () => {
    setOnboardingStep('complete');
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null || (isAuthenticated && profileLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-center">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Pre-authentication flow
  if (!isAuthenticated) {
    if (showFlashingSplash) {
      return <FlashingSplashScreen onComplete={handleFlashingSplashComplete} />;
    }
    return <WelcomeCarousel onSignUp={handleSignUp} onLogIn={handleLogIn} />;
  }

  // Post-authentication onboarding flow
  if (onboardingStep !== 'complete') {
    switch (onboardingStep) {
      case 'welcome':
        return <WelcomeCarousel onSignUp={handleOnboardingComplete} onLogIn={handleOnboardingComplete} />;
      case 'account-type':
        return <AccountTypeSelection onSelect={handleAccountTypeSelect} />;
      case 'interests':
        return <InterestsSelection onComplete={handleOnboardingComplete} onSkip={handleOnboardingComplete} />;
      default:
        return <MainApp />;
    }
  }

  // Main authenticated app
  return <MainApp />;
};

export default Index;
