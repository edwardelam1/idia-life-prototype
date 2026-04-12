import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom'; // Added useSearchParams
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// ... other imports

const Auth = () => {
  const [searchParams] = useSearchParams(); // Catch the URL parameters
  
  // Look at the URL to decide if we should show Login or Sign Up first
  const defaultIsLogin = searchParams.get('mode') !== 'signup';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isLogin, setIsLogin] = useState(defaultIsLogin); // Replaced `true` with our dynamic variable
  // ... rest of your state declarations

  useEffect(() => {
    // Catch the Hub breadcrumb so we know where to send them after Onboarding
    const returnTo = searchParams.get('return_to');
    if (returnTo === 'hub') {
      sessionStorage.setItem('return_to_hub', 'true');
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);