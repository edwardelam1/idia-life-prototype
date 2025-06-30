
import { useState } from 'react';
import SplashScreen from '@/components/SplashScreen';
import MainApp from '@/components/MainApp';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleSignUp = () => {
    // Simplified sign up - just move to main app
    setIsAuthenticated(true);
  };

  const handleLogin = () => {
    // Simplified login - just move to main app
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <SplashScreen onSignUp={handleSignUp} onLogin={handleLogin} />;
  }

  return <MainApp />;
};

export default Index;
