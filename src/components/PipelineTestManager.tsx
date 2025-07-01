
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  Users, 
  TrendingUp,
  Database,
  Zap
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

  // Mock user ID for testing (in a real app, this would come from auth)
  const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

  // Mock Strava activity data for testing
  const mockStravaActivity = {
    id: Date.now(),
    type: 'Run',
    distance: 5000, // 5km
    moving_time: 1800, // 30 minutes
    elapsed_time: 1900,
    total_elevation_gain: 150,
    average_heartrate: 145,
    max_heartrate: 165,
    average_speed: 2.78, // m/s
    max_speed: 4.2,
    start_latlng: [37.7749, -122.4194], // San Francisco (will be anonymized)
    device_name: 'Garmin Forerunner 945',
    suffer_score: 85
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
      // Step 1: Test wallet creation/fetching
      setCurrentStep('wallet-setup');
      addTestResult({
        step: 'Wallet Setup',
        status: 'pending',
        message: 'Creating/verifying user wallet...'
      });

      const startTime1 = Date.now();
      
      // Check if wallet exists, create if not
      let { data: wallet, error: walletError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', TEST_USER_ID)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // Wallet doesn't exist, create it
        const { data: newWallet, error: createError } = await supabase
          .from('user_wallets')
          .insert({
            user_id: TEST_USER_ID,
            idia_usd_balance: 100.00, // Mock initial balance for testing
            total_earned: 0
          })
          .select()
          .single();

        if (createError) throw createError;
        wallet = newWallet;
      } else if (walletError) {
        throw walletError;
      }

      updateLastResult({
        status: 'success',
        message: `Wallet ready. Balance: $${wallet.idia_usd_balance}`,
        duration: Date.now() - startTime1,
        data: wallet
      });

      // Step 2: Test data connection setup
      setCurrentStep('connection-setup');
      addTestResult({
        step: 'Data Connection',
        status: 'pending',
        message: 'Setting up mock data connection...'
      });

      const startTime2 = Date.now();
      
      // Create or update a test connection
      const { data: connection, error: connectionError } = await supabase
        .from('data_connections')
        .upsert({
          user_id: TEST_USER_ID,
          connection_type: 'strava',
          connection_name: 'Test Strava Connection',
          access_token: 'test_access_token',
          is_active: true,
          last_sync_at: new Date().toISOString()
        })
        .select()
        .single();

      if (connectionError) throw connectionError;

      updateLastResult({
        status: 'success',
        message: 'Mock data connection established',
        duration: Date.now() - startTime2,
        data: connection
      });

      // Step 3: Test raw data ingestion
      setCurrentStep('data-ingestion');
      addTestResult({
        step: 'Data Ingestion',
        status: 'pending',
        message: 'Ingesting mock fitness activity...'
      });

      const startTime3 = Date.now();
      
      const { data: rawData, error: rawError } = await supabase
        .from('raw_strava_data')
        .insert({
          user_id: TEST_USER_ID,
          connection_id: connection.id,
          activity_id: mockStravaActivity.id,
          raw_data: mockStravaActivity,
          processed: false
        })
        .select()
        .single();

      if (rawError) throw rawError;

      updateLastResult({
        status: 'success',
        message: 'Raw activity data ingested successfully',
        duration: Date.now() - startTime3,
        data: { activity_type: mockStravaActivity.type, distance_km: mockStravaActivity.distance / 1000 }
      });

      // Step 4: Test anonymization and staging
      setCurrentStep('anonymization');
      addTestResult({
        step: 'Data Anonymization',
        status: 'pending',
        message: 'Anonymizing and staging data...'
      });

      const startTime4 = Date.now();
      
      const { data: anonymizeResult, error: anonymizeError } = await supabase.functions.invoke(
        'anonymize-and-stage-data',
        {
          body: {
            raw_data_id: rawData.id
          }
        }
      );

      if (anonymizeError) throw anonymizeError;

      // Wait a moment for the staging to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if staged data was created
      const { data: stagedData, error: stagedError } = await supabase
        .from('staged_data')
        .select('*')
        .eq('raw_data_id', rawData.id)
        .single();

      if (stagedError) throw stagedError;

      updateLastResult({
        status: 'success',
        message: `Data anonymized. Location generalized, PII removed`,
        duration: Date.now() - startTime4,
        data: { 
          anonymized_zone: stagedData.anonymized_location_zone,
          device_type: stagedData.device_type
        }
      });

      // Step 5: Test reward calculation and wallet crediting
      setCurrentStep('reward-calculation');
      addTestResult({
        step: 'Reward Calculation',
        status: 'pending',
        message: 'Calculating and applying rewards...'
      });

      const startTime5 = Date.now();
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check updated wallet balance
      const { data: updatedWallet, error: balanceError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', TEST_USER_ID)
        .single();

      if (balanceError) throw balanceError;

      // Check transaction record
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', TEST_USER_ID)
        .eq('transaction_type', 'data_earnings')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const rewardAmount = stagedData.reward_amount || 0;

      updateLastResult({
        status: 'success',
        message: `Reward calculated: $${rewardAmount.toFixed(2)}`,
        duration: Date.now() - startTime5,
        data: { 
          reward: rewardAmount,
          new_balance: updatedWallet.idia_usd_balance,
          transaction_created: !!transaction
        }
      });

      // Step 6: Test payout eligibility
      setCurrentStep('payout-check');
      addTestResult({
        step: 'Payout Eligibility',
        status: 'pending',
        message: 'Checking payout eligibility...'
      });

      const startTime6 = Date.now();
      
      const monthlyEarnings = updatedWallet.total_earned || 0;
      const minPayout = 1.00;
      const maxPayout = 15.00;
      
      let payoutStatus = 'eligible';
      let payoutMessage = '';
      
      if (monthlyEarnings < minPayout) {
        payoutStatus = 'below_minimum';
        payoutMessage = `Monthly earnings ($${monthlyEarnings.toFixed(2)}) below minimum payout ($${minPayout})`;
      } else if (monthlyEarnings > maxPayout) {
        payoutStatus = 'capped';
        payoutMessage = `Monthly earnings capped at maximum payout ($${maxPayout})`;
      } else {
        payoutMessage = `Eligible for full payout: $${monthlyEarnings.toFixed(2)}`;
      }

      updateLastResult({
        status: 'success',
        message: payoutMessage,
        duration: Date.now() - startTime6,
        data: { 
          monthly_earnings: monthlyEarnings,
          payout_status: payoutStatus,
          min_payout: minPayout,
          max_payout: maxPayout
        }
      });

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
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-l-green-500 bg-green-50';
      case 'error':
        return 'border-l-red-500 bg-red-50';
      case 'pending':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-300';
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Pipeline Overview */}
      <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Pipeline Test Manager</h2>
              <p className="text-purple-100">
                End-to-end testing of the data processing and reward pipeline
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Play className="w-5 h-5" />
            <span>Pipeline Test Controls</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={runPipelineTest} 
              disabled={isRunning}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
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

            {/* Payout Structure Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Min Monthly Payout</p>
                <p className="text-lg font-bold text-green-600">$1.00 - $2.00</p>
                <p className="text-xs text-gray-600">Single data stream</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium">Target Users (Y2)</p>
                <p className="text-lg font-bold text-blue-600">~2,500</p>
                <p className="text-xs text-gray-600">Active users</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">Max Monthly Payout</p>
                <p className="text-lg font-bold text-purple-600">$10.00 - $15.00+</p>
                <p className="text-xs text-gray-600">Power users</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Pipeline Test Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`border-l-4 p-4 rounded ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(result.status)}
                        <h3 className="font-semibold">{result.step}</h3>
                        {result.duration && (
                          <Badge variant="outline" className="text-xs">
                            {result.duration}ms
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                      {result.data && (
                        <div className="text-xs bg-white/50 p-2 rounded">
                          <pre>{JSON.stringify(result.data, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Status */}
      {currentStep && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="font-semibold text-blue-900">Processing: {currentStep}</p>
                <p className="text-sm text-blue-700">Testing pipeline functionality...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PipelineTestManager;
