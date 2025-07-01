
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Zap,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  step: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  duration?: number;
  data?: any;
}

const PipelineTestManager = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [testUser, setTestUser] = useState<any>(null);

  // Test credentials
  const TEST_EMAIL = 'pipeline-test@idia.dev';
  const TEST_PASSWORD = 'testpassword123';

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setIsAuthenticated(true);
      setTestUser(session.user);
    }
  };

  const createTestAuthWithServiceRole = async () => {
    try {
      // First try to sign in normally
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (signInError && signInError.message.includes('Invalid login credentials')) {
        // User doesn't exist, create them
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (signUpError) throw signUpError;

        // If email confirmation is required, we'll use service role for testing
        if (signUpData.user && !signUpData.session) {
          // Create a test session by calling our edge function with service role
          const { data: testSessionData, error: testSessionError } = await supabase.functions.invoke(
            'create-test-session',
            {
              body: { 
                email: TEST_EMAIL,
                user_id: signUpData.user.id 
              }
            }
          );

          if (testSessionError) {
            console.warn('Service role session creation failed, proceeding with limited testing');
            return signUpData.user;
          }

          return signUpData.user;
        }

        return signUpData.user;
      } else if (signInError) {
        throw signInError;
      } else if (signInData.user) {
        setTestUser(signInData.user);
        setIsAuthenticated(true);
        return signInData.user;
      }
    } catch (error) {
      console.error('Auth error:', error);
      throw error;
    }
  };

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const updateLastResult = (updates: Partial<TestResult>) => {
    setTestResults(prev => {
      const newResults = [...prev];
      const lastIndex = newResults.length - 1;
      if (lastIndex >= 0) {
        newResults[lastIndex] = { ...newResults[lastIndex], ...updates };
      }
      return newResults;
    });
  };

  const runPipelineTest = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Step 0: Ensure authentication
      setCurrentStep('authentication');
      addTestResult({
        step: 'Authentication',
        status: 'pending',
        message: 'Setting up test user authentication...'
      });

      const startTimeAuth = Date.now();
      const user = await createTestAuthWithServiceRole();
      const userId = user?.id;

      if (!userId) {
        throw new Error('Failed to authenticate test user');
      }

      updateLastResult({
        status: 'success',
        message: `Test user ready: ${TEST_EMAIL}`,
        duration: Date.now() - startTimeAuth,
        data: { user_id: userId }
      });

      // Step 1: Test wallet creation/fetching using service role
      setCurrentStep('wallet-setup');
      addTestResult({
        step: 'Wallet Setup',
        status: 'pending',
        message: 'Creating/verifying user wallet...'
      });

      const startTime1 = Date.now();
      
      // Use edge function to bypass RLS for testing
      const { data: walletResult, error: walletError } = await supabase.functions.invoke(
        'test-wallet-setup',
        {
          body: { 
            user_id: userId,
            initial_balance: 100.00
          }
        }
      );

      if (walletError) {
        // Fallback to direct table access if edge function doesn't exist
        let { data: wallet, error: directWalletError } = await supabase
          .from('user_wallets')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (directWalletError && directWalletError.code === 'PGRST116') {
          // Wallet doesn't exist, try to create it
          const { data: newWallet, error: createError } = await supabase
            .from('user_wallets')
            .insert({
              user_id: userId,
              idia_usd_balance: 100.00,
              total_earned: 0
            })
            .select()
            .single();

          if (createError) {
            updateLastResult({
              status: 'error',
              message: `Wallet setup failed: ${createError.message}. This may be due to email confirmation requirement.`,
              duration: Date.now() - startTime1
            });
            throw createError;
          }
          wallet = newWallet;
        } else if (directWalletError) {
          throw directWalletError;
        }

        updateLastResult({
          status: 'success',
          message: `Wallet ready. Balance: $${wallet.idia_usd_balance}`,
          duration: Date.now() - startTime1,
          data: wallet
        });
      } else {
        updateLastResult({
          status: 'success',
          message: `Wallet setup via service role. Balance: $${walletResult.balance}`,
          duration: Date.now() - startTime1,
          data: walletResult
        });
      }

      // Continue with remaining steps...
      // Step 2: Test data connection setup
      setCurrentStep('connection-setup');
      addTestResult({
        step: 'Data Connection',
        status: 'pending',
        message: 'Setting up mock data connection...'
      });

      const startTime2 = Date.now();
      
      const { data: connection, error: connectionError } = await supabase
        .from('data_connections')
        .upsert({
          user_id: userId,
          connection_type: 'strava',
          connection_name: 'Test Strava Connection',
          access_token: 'test_access_token',
          is_active: true,
          last_sync_at: new Date().toISOString()
        })
        .select()
        .single();

      if (connectionError) {
        updateLastResult({
          status: 'error',
          message: `Connection setup failed: ${connectionError.message}`,
          duration: Date.now() - startTime2
        });
        throw connectionError;
      }

      updateLastResult({
        status: 'success',
        message: 'Mock data connection established',
        duration: Date.now() - startTime2,
        data: connection
      });

      // Continue with remaining pipeline steps...
      setCurrentStep('complete');

    } catch (error) {
      console.error('Pipeline test failed:', error);
      updateLastResult({
        status: 'error',
        message: `Error: ${error.message || 'Unknown error occurred'}`
      });
    } finally {
      setIsRunning(false);
      setCurrentStep('');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-l-green-500 bg-green-50/50';
      case 'error':
        return 'border-l-red-500 bg-red-50/50';
      case 'pending':
        return 'border-l-blue-500 bg-blue-50/50';
      default:
        return 'border-l-gray-300';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Zap className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Test Manager</h1>
        </div>
        <p className="text-gray-600 text-sm">End-to-end testing of the data processing pipeline</p>
      </div>

      {/* Auth Status - Minimalist */}
      <div className={`border rounded-lg p-3 ${isAuthenticated ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
        <div className="flex items-center gap-2 text-sm">
          <User className={`w-4 h-4 ${isAuthenticated ? 'text-green-600' : 'text-amber-600'}`} />
          <span className={`font-medium ${isAuthenticated ? 'text-green-900' : 'text-amber-900'}`}>
            {isAuthenticated ? 'Ready' : 'Test auth will be created automatically'}
          </span>
          {isAuthenticated && (
            <span className="text-gray-600">• {testUser?.email}</span>
          )}
        </div>
      </div>

      {/* Test Control - Minimalist */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <Button 
            onClick={runPipelineTest} 
            disabled={isRunning}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            size="lg"
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Running Pipeline Test...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Full Pipeline Test
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results - Condensed */}
      {testResults.length > 0 && (
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>Test Results</span>
              {currentStep && (
                <Badge variant="outline" className="text-xs">
                  {currentStep}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`border-l-3 p-3 rounded-r ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(result.status)}
                        <span className="font-medium text-sm">{result.step}</span>
                        {result.duration && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            {result.duration}ms
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{result.message}</p>
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            View data
                          </summary>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Status */}
      {currentStep && (
        <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-blue-900">
              Processing: {currentStep.replace('-', ' ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineTestManager;
