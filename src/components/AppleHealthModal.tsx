import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Heart, Footprints, Moon, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AppleHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingConnection?: any;
  onDisconnect?: () => void;
}

const AppleHealthModal = ({ isOpen, onClose, onComplete, existingConnection, onDisconnect }: AppleHealthModalProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        setErrorMessage('Authentication error. Please log in again.');
        return;
      }
      if (session?.user) {
        setCurrentUserId(session.user.id);
        setAuthSession(session);
      } else {
        setErrorMessage('Please log in to connect Apple Health data.');
      }
    };
    getSession();
  }, []);

  const syncHealthDataWithNativeApp = () => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    // First, check if the app is running inside the iOS wrapper.
    // The 'webkit.messageHandlers' object only exists in a WKWebView.
    const webkit = (window as any).webkit;
    if (webkit && webkit.messageHandlers && webkit.messageHandlers.syncHealthData) {
      
      console.log("Sending 'syncHealthData' message to the native iOS app.");
      
        // Send configuration to native iOS app for health data ingestion
        const ingestorConfig = {
          endpoint: 'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/health-data-bridge',
          user_id: currentUserId,
          auth_token: authSession?.access_token // Get proper auth token from session
        };
      
      webkit.messageHandlers.syncHealthData.postMessage({
        action: "start_sync",
        config: ingestorConfig
      });
      
      // Fetch real health data from Supabase
      setTimeout(async () => {
        if (!currentUserId) return;
        
        try {
          // Get latest raw health data
          const { data: healthMetrics, error: healthError } = await supabase
            .from('raw_health_data')
            .select('*')
            .eq('user_id', currentUserId)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get staged health data for more detailed metrics
          const { data: stagedHealth, error: stagedError } = await supabase
            .from('staged_health_data')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          console.log('Health data fetched:', { healthMetrics, stagedHealth });

          const realHealthData = {
            steps: healthMetrics?.step_count || 0,
            heartRate: 0,
            activeMinutes: 0,
            sleepHours: '0',
            calories: 0
          };
          
           setHealthData(realHealthData);
           setConnectionStatus('connected');
           setIsConnecting(false);
           
           // Update connection status to connected
           await supabase
             .from('data_connections')
             .update({ 
               is_active: true,
               last_sync_at: new Date().toISOString() 
             })
             .eq('user_id', currentUserId)
             .eq('connection_type', 'apple_health');
           
           // Trigger the IDIA data flow for iOS
           try {
             await triggerIdiaDataFlow(realHealthData);
             // Complete the connection immediately
             onComplete();
           } catch (dataFlowError) {
             console.error('Data flow failed:', dataFlowError);
             setErrorMessage('Health data sync failed. Please try again.');
             setConnectionStatus('error');
             setIsConnecting(false);
           }
        } catch (error) {
          console.error('Error fetching health data:', error);
          // Fallback to demo data if no real data available
          const fallbackData = {
            steps: 0,
            heartRate: 0,
            activeMinutes: 0,
            sleepHours: '0',
            calories: 0
          };
           setHealthData(fallbackData);
           setConnectionStatus('connected');
           setIsConnecting(false);
           
           // Trigger the IDIA data flow even with fallback data for iOS
           await triggerIdiaDataFlow(fallbackData);
           
           onComplete();
        }
      }, 2000);

    } else {
      // This message will appear if you test in a regular web browser.
      console.log("Not running in the native app wrapper. HealthKit sync is unavailable.");
      
      // For demo purposes, we'll fetch real data from Supabase
      setTimeout(async () => {
        if (!currentUserId) {
          console.error('Cannot proceed: currentUserId is null after 2 second timeout');
          return;
        }
        try {
          // Get latest raw health data
          const { data: healthMetrics, error: healthError } = await supabase
            .from('raw_health_data')
            .select('*')
            .eq('user_id', currentUserId)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get staged health data for more detailed metrics
          const { data: stagedHealth, error: stagedError } = await supabase
            .from('staged_health_data')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          console.log('Health data fetched (web):', { healthMetrics, stagedHealth });

          const realHealthData = {
            steps: healthMetrics?.step_count || 0,
            heartRate: 0,
            activeMinutes: 0,
            sleepHours: '0',
            calories: 0
          };
          
          setHealthData(realHealthData);
          setConnectionStatus('connected');
          setIsConnecting(false);
          
          // Update connection status to connected
          await supabase
            .from('data_connections')
            .update({ 
              is_active: true,
              last_sync_at: new Date().toISOString() 
            })
            .eq('user_id', currentUserId)
            .eq('connection_type', 'apple_health');
          
          // Trigger the IDIA data flow
          try {
            await triggerIdiaDataFlow(realHealthData);
            // Complete the connection immediately
            onComplete();
          } catch (dataFlowError) {
            console.error('Data flow failed:', dataFlowError);
            setErrorMessage('Health data sync failed. Please try again.');
            setConnectionStatus('error');
            setIsConnecting(false);
          }
        } catch (error) {
          console.error('Error fetching health data:', error);
          // Fallback to demo data if no real data available
          const fallbackData = {
            steps: 0,
            heartRate: 0,
            activeMinutes: 0,
            sleepHours: '0',
            calories: 0
          };
          setHealthData(fallbackData);
          setConnectionStatus('connected');
          setIsConnecting(false);
          
          // Trigger the IDIA data flow even with fallback data
          await triggerIdiaDataFlow(fallbackData);
          
          onComplete();
        }
      }, 2000);
    }
  };

  const triggerIdiaDataFlow = async (healthData: any) => {
    console.log('=== APPLE HEALTH MODAL: Starting data flow ===');
    console.log('AppleHealthModal: triggerIdiaDataFlow called with:', { currentUserId, healthData });
    
    if (!currentUserId) {
      console.error('AppleHealthModal: Cannot trigger data flow - currentUserId is null');
      return;
    }
    
    // Enhanced validation for health data
    if (!healthData || Object.keys(healthData).length === 0) {
      console.error('AppleHealthModal: Cannot trigger data flow - healthData is empty');
      return;
    }

    // Prepare comprehensive health data structure for Apple Health
    const validatedHealthData = {
      // Basic activity metrics
      steps: Number(healthData.steps) || 0,
      heartRate: Number(healthData.heartRate) || 0,
      activeMinutes: Number(healthData.activeMinutes) || 0,
      sleepHours: Number(healthData.sleepHours) || 0,
      calories: Number(healthData.calories) || 0,
      
      // Additional Apple Health data structure
      source: 'apple_health',
      type: 'comprehensive_health_data',
      device_type: 'Apple Health',
      recorded_at: new Date().toISOString(),
      
      // Request all 60+ Apple HealthKit data types in the native app
      requestedDataTypes: [
        // Activity & Fitness
        'steps', 'distanceWalkingRunning', 'distanceCycling', 'flightsClimbed',
        'activeEnergyBurned', 'restingEnergyBurned', 'exerciseTime',
        
        // Heart & Vitals
        'heartRate', 'heartRateVariability', 'bloodOxygenSaturation', 
        'bloodPressureSystolic', 'bloodPressureDiastolic', 'respiratoryRate',
        'bodyTemperature', 'electrocardiogram', 'vo2Max',
        
        // Body Measurements
        'height', 'weight', 'bodyMassIndex', 'bodyFatPercentage', 
        'leanBodyMass', 'waistCircumference',
        
        // Nutrition
        'dietaryEnergyConsumed', 'totalFat', 'saturatedFat', 'polyunsaturatedFat',
        'monounsaturatedFat', 'carbohydrates', 'fiber', 'sugar', 'protein',
        'water', 'caffeine', 'sodium', 'potassium', 'vitaminC', 'vitaminD',
        'calcium', 'iron',
        
        // Sleep Data
        'sleep', 'timeInBed', 'timeAsleep', 'sleepAnalysis',
        
        // Activity & Mobility
        'walkingSpeed', 'stepLength', 'walkingAsymmetryPercentage',
        'doubleSupportTime',
        
        // Reproductive Health
        'menstrualFlow', 'cervicalMucusQuality', 'ovulationTestResult',
        'sexualActivity', 'basalBodyTemperature',
        
        // Mindfulness & Mental Health
        'mindfulSession', 'moodScore', 'stateOfMind',
        
        // Symptoms & Clinical
        'symptoms', 'clinicalRecords', 'allergies', 'conditions', 'immunizations',
        'labResults', 'medications', 'procedures', 'medicationDoseEvents'
      ]
    };

    console.log('AppleHealthModal: Validated health data:', validatedHealthData);
    
    try {
      console.log('AppleHealthModal: Calling health-data-bridge (single entry point)...');
      console.log('AppleHealthModal: Expected flow: health-data-bridge → raw_health_data → trigger → IDIA-Synapse → anonymization');
      
      // Call health-data-bridge as the ONLY entry point
      const { data: bridgeResult, error } = await supabase.functions.invoke('health-data-bridge', {
        body: {
          user_id: currentUserId,
          health_data: validatedHealthData
        }
      });

      console.log('AppleHealthModal: Health data bridge response:', { data: bridgeResult, error });

      if (error) {
        console.error('AppleHealthModal: Health data bridge error:', error);
        console.error('AppleHealthModal: Error details:', JSON.stringify(error, null, 2));
        throw new Error(`Health data bridge failed: ${error.message || 'Unknown error'}`);
      } else {
        console.log('AppleHealthModal: Health data flow initiated successfully!');
        console.log('AppleHealthModal: Pipeline should now execute automatically via database triggers');
        console.log('AppleHealthModal: Bridge result:', JSON.stringify(bridgeResult, null, 2));
      }
    } catch (error) {
      console.error('AppleHealthModal: Unexpected error triggering data flow:', error);
      console.error('AppleHealthModal: Error name:', error.name);
      console.error('AppleHealthModal: Error message:', error.message);
      throw error; // Re-throw to handle in calling function
    }
    
    console.log('=== APPLE HEALTH MODAL: Data flow initiation complete ===');
  };

  const handleDisconnect = async () => {
    if (!currentUserId || !existingConnection) return;
    
    try {
      const { error } = await supabase
        .from('data_connections')
        .update({ is_active: false })
        .eq('id', existingConnection.id)
        .eq('user_id', currentUserId);

      if (!error) {
        onDisconnect?.();
        onClose();
      }
    } catch (error) {
      console.error('Error disconnecting Apple Health:', error);
    }
  };

  const handleConnect = async () => {
    console.log('=== HANDLECONNECT START ===');
    console.log('handleConnect called, currentUserId:', currentUserId);
    console.log('authSession present:', !!authSession);
    console.log('authSession.access_token present:', !!authSession?.access_token);
    
    setErrorMessage(null);
    
    if (!currentUserId || !authSession) {
      const errorMsg = 'Please log in to connect Apple Health data.';
      console.error('Authentication check failed:', { currentUserId, authSession: !!authSession });
      setErrorMessage(errorMsg);
      setConnectionStatus('error');
      return;
    }
    
    // Wait a moment to ensure authentication is fully loaded
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Creating/updating user_connections record...');
    
      // Create user_connections record before starting sync
      try {
        // Use upsert to handle connection creation/update atomically
        console.log('Creating/updating connection record with upsert');
        const { data: connectionResult, error: connectionError } = await supabase
          .from('data_connections')
          .upsert({
            user_id: currentUserId,
            connection_type: 'apple_health',
            connection_name: 'Apple Health',
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,connection_type'
          })
          .select()
          .single();
      
      console.log('Connection operation result:', { connectionResult, connectionError });
      
      if (connectionError) {
        console.error('Database connection error details:', {
          code: connectionError.code,
          message: connectionError.message,
          details: connectionError.details,
          hint: connectionError.hint
        });
        setErrorMessage(`Failed to initialize connection: ${connectionError.message}`);
        setConnectionStatus('error');
        return;
      }
      
      console.log('Connection record created/updated successfully:', connectionResult);
      console.log('Starting health data sync...');
      
      syncHealthDataWithNativeApp();
    } catch (error) {
      console.error('Unexpected error in handleConnect:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      setErrorMessage(`Connection failed: ${error.message}`);
      setConnectionStatus('error');
    }
    
    console.log('=== HANDLECONNECT END ===');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/8f82179a-e516-4c98-8c9f-aae3ee45c242.png" 
              alt="Apple Health" 
              className="w-6 h-6"
            />
            <span>{existingConnection ? 'Apple Health' : 'Connect Apple Health'}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          )}
          
          {connectionStatus === 'idle' && !existingConnection && (
            <>
              <p className="text-sm text-gray-600">
                Connect your Apple Health data to earn rewards for your fitness activities and health metrics.
              </p>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Comprehensive HealthKit Data we'll access:</h4>
                <div className="max-h-32 overflow-y-auto">
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li><strong>Activity & Fitness:</strong></li>
                    <li>• Steps, distance walking/running/cycling</li>
                    <li>• Active & resting energy burned, exercise time</li>
                    <li>• Flights climbed, walking speed & metrics</li>
                    
                    <li><strong>Heart & Vitals:</strong></li>
                    <li>• Heart rate, HRV, blood oxygen (SpO2)</li>
                    <li>• Blood pressure, respiratory rate, ECG</li>
                    <li>• Body temperature, VO2 Max</li>
                    
                    <li><strong>Body Measurements:</strong></li>
                    <li>• Height, weight, BMI, body fat %</li>
                    <li>• Lean body mass, waist circumference</li>
                    
                    <li><strong>Sleep & Recovery:</strong></li>
                    <li>• Sleep duration, stages (REM, deep, core)</li>
                    <li>• Time in bed vs asleep</li>
                    
                    <li><strong>Nutrition:</strong></li>
                    <li>• Calories, macros (carbs, fat, protein)</li>
                    <li>• Vitamins, minerals, water, caffeine</li>
                    
                    <li><strong>Mindfulness & Mental Health:</strong></li>
                    <li>• Mindful minutes, mood tracking</li>
                    
                    <li><strong>Clinical Records (if available):</strong></li>
                    <li>• Lab results, medications, allergies</li>
                    <li>• Medical conditions, procedures</li>
                  </ul>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  All data is anonymized and encrypted for privacy protection
                </p>
              </div>
              
              <Button 
                onClick={handleConnect}
                className="w-full"
                disabled={isConnecting || !currentUserId}
              >
                {isConnecting ? 'Connecting...' : 'Connect Apple Health'}
              </Button>
            </>
          )}

          {existingConnection && connectionStatus === 'idle' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-green-800">Apple Health Connected</h3>
                <p className="text-sm text-gray-600">Your health data is actively earning rewards</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Active Pipeline</p>
                    <p className="text-xs text-green-600">Processing data automatically</p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={onClose}
                >
                  Close
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          )}
          
          {connectionStatus === 'error' && (
            <div className="text-center py-6">
              <p className="text-sm text-red-600 mb-4">Connection failed. Please try again.</p>
              <Button 
                onClick={() => {
                  setConnectionStatus('idle');
                  setErrorMessage(null);
                }}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}
          
          {connectionStatus === 'connecting' && (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Syncing your health data...</p>
            </div>
          )}
          
          {connectionStatus === 'connected' && healthData && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-green-800">Successfully Connected!</h3>
                <p className="text-sm text-gray-600">Here's your latest health data:</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <Footprints className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <div className="text-lg font-bold">{healthData.steps.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Steps</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3 text-center">
                    <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                    <div className="text-lg font-bold">{healthData.heartRate}</div>
                    <div className="text-xs text-gray-500">Avg HR</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3 text-center">
                    <Activity className="w-5 h-5 text-green-500 mx-auto mb-1" />
                    <div className="text-lg font-bold">{healthData.activeMinutes}</div>
                    <div className="text-xs text-gray-500">Active Min</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3 text-center">
                    <Moon className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                    <div className="text-lg font-bold">{healthData.sleepHours}h</div>
                    <div className="text-xs text-gray-500">Sleep</div>
                  </CardContent>
                </Card>
              </div>
              
              <p className="text-sm text-center text-gray-600">
                Earning rewards for your health data...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppleHealthModal;