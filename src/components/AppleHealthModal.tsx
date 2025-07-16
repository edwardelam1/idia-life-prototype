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

  useEffect(() => {
    let connectionTimeout: NodeJS.Timeout;
    
    // This function will be called by the native app upon successful sync
    (window as any).onHealthDataSyncComplete = (healthDataJson: string) => {
      console.log("Web view received sync completion callback from native app.");
      clearTimeout(connectionTimeout);
      
      try {
        const healthData = JSON.parse(healthDataJson);
        // Update your state with the real data
        setHealthData(healthData.health_data);
        setConnectionStatus('connected');
        setIsConnecting(false);
        onComplete();
        
        // Auto-close modal after successful connection with user feedback
        setTimeout(() => {
          console.log("Auto-closing Apple Health modal after successful connection");
          onClose();
        }, 1500);
      } catch (error) {
        console.error("Failed to parse health data JSON from native callback:", error);
        setErrorMessage("Failed to process health data.");
        setConnectionStatus('error');
        setIsConnecting(false);
      }
    };

    // Clean up the function when the component unmounts
    return () => {
      (window as any).onHealthDataSyncComplete = undefined;
    };
  }, [onComplete]);

  const syncHealthDataWithNativeApp = () => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    // First, check if the app is running inside the iOS wrapper.
    const webkit = (window as any).webkit;
    if (webkit && webkit.messageHandlers && webkit.messageHandlers.syncHealthData) {
      
      console.log("Sending comprehensive HealthKit data sync request to native iOS app...");
      
      // Send comprehensive HealthKit data request to native iOS app
      const comprehensiveHealthRequest = {
        action: "comprehensive_health_sync",
        config: {
          endpoint: 'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/health-data-bridge',
          user_id: currentUserId,
          auth_token: authSession?.access_token
        },
        // Request ALL HealthKit data categories
        requestedDataTypes: {
          // HKQuantityType - Activity & Fitness
          activity: [
            'HKQuantityTypeIdentifierStepCount',
            'HKQuantityTypeIdentifierDistanceWalkingRunning',
            'HKQuantityTypeIdentifierDistanceCycling',
            'HKQuantityTypeIdentifierFlightsClimbed',
            'HKQuantityTypeIdentifierActiveEnergyBurned',
            'HKQuantityTypeIdentifierBasalEnergyBurned',
            'HKQuantityTypeIdentifierAppleExerciseTime',
            'HKQuantityTypeIdentifierWalkingSpeed',
            'HKQuantityTypeIdentifierStepLength',
            'HKQuantityTypeIdentifierWalkingAsymmetryPercentage',
            'HKQuantityTypeIdentifierDoubleSupportPercentage'
          ],
          
          // HKQuantityType - Heart & Vitals
          vitals: [
            'HKQuantityTypeIdentifierHeartRate',
            'HKQuantityTypeIdentifierRestingHeartRate',
            'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
            'HKQuantityTypeIdentifierOxygenSaturation',
            'HKQuantityTypeIdentifierBloodPressureSystolic',
            'HKQuantityTypeIdentifierBloodPressureDiastolic',
            'HKQuantityTypeIdentifierRespiratoryRate',
            'HKQuantityTypeIdentifierBodyTemperature',
            'HKQuantityTypeIdentifierVO2Max'
          ],
          
          // HKQuantityType - Body Measurements
          body: [
            'HKQuantityTypeIdentifierHeight',
            'HKQuantityTypeIdentifierBodyMass',
            'HKQuantityTypeIdentifierBodyMassIndex',
            'HKQuantityTypeIdentifierBodyFatPercentage',
            'HKQuantityTypeIdentifierLeanBodyMass',
            'HKQuantityTypeIdentifierWaistCircumference'
          ],
          
          // HKQuantityType - Nutrition
          nutrition: [
            'HKQuantityTypeIdentifierDietaryEnergyConsumed',
            'HKQuantityTypeIdentifierDietaryFatTotal',
            'HKQuantityTypeIdentifierDietaryFatSaturated',
            'HKQuantityTypeIdentifierDietaryFatPolyunsaturated',
            'HKQuantityTypeIdentifierDietaryFatMonounsaturated',
            'HKQuantityTypeIdentifierDietaryCarbohydrates',
            'HKQuantityTypeIdentifierDietaryFiber',
            'HKQuantityTypeIdentifierDietarySugar',
            'HKQuantityTypeIdentifierDietaryProtein',
            'HKQuantityTypeIdentifierDietaryWater',
            'HKQuantityTypeIdentifierDietaryCaffeine',
            'HKQuantityTypeIdentifierDietarySodium',
            'HKQuantityTypeIdentifierDietaryPotassium',
            'HKQuantityTypeIdentifierDietaryVitaminC',
            'HKQuantityTypeIdentifierDietaryVitaminD',
            'HKQuantityTypeIdentifierDietaryCalcium',
            'HKQuantityTypeIdentifierDietaryIron'
          ],
          
          // HKCategoryType - Sleep
          sleep: [
            'HKCategoryTypeIdentifierSleepAnalysis'
          ],
          
          // HKCategoryType - Reproductive Health
          reproductive: [
            'HKCategoryTypeIdentifierMenstrualFlow',
            'HKCategoryTypeIdentifierCervicalMucusQuality',
            'HKCategoryTypeIdentifierOvulationTestResult',
            'HKCategoryTypeIdentifierSexualActivity'
          ],
          
          // HKQuantityType - Reproductive Health Vitals
          reproductiveVitals: [
            'HKQuantityTypeIdentifierBasalBodyTemperature'
          ],
          
          // HKCategoryType - Mindfulness
          mindfulness: [
            'HKCategoryTypeIdentifierMindfulSession'
          ],
          
          // HKWorkoutType - Workouts
          workouts: [
            'HKWorkoutTypeIdentifier'
          ],
          
          // HKClinicalType - Clinical Records
          clinical: [
            'HKClinicalTypeIdentifierAllergyRecord',
            'HKClinicalTypeIdentifierConditionRecord',
            'HKClinicalTypeIdentifierImmunizationRecord',
            'HKClinicalTypeIdentifierLabResultRecord',
            'HKClinicalTypeIdentifierMedicationRecord',
            'HKClinicalTypeIdentifierProcedureRecord',
            'HKClinicalTypeIdentifierVitalSignRecord'
          ]
        }
      };
      
      webkit.messageHandlers.syncHealthData.postMessage(comprehensiveHealthRequest);
      
    } else {
      // This message will appear if you test in a regular web browser.
      console.log("Not running in the native app wrapper. HealthKit sync is unavailable.");
      setErrorMessage("HealthKit sync is only available on the IDIA Life iOS app.");
      setConnectionStatus('error');
      setIsConnecting(false);
    }
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
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Creating/updating user_connections record...');
    
      try {
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
                <div className="max-h-40 overflow-y-auto">
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li><strong>Activity & Fitness (15+ types):</strong></li>
                    <li>• Steps, distance walking/running/cycling, flights climbed</li>
                    <li>• Active & resting energy, exercise time, walking metrics</li>
                    
                    <li><strong>Heart & Vitals (10+ types):</strong></li>
                    <li>• Heart rate, HRV, blood oxygen, blood pressure</li>
                    <li>• Respiratory rate, body temperature, VO2 Max</li>
                    
                    <li><strong>Body Measurements (6+ types):</strong></li>
                    <li>• Height, weight, BMI, body fat %, lean mass</li>
                    
                    <li><strong>Nutrition (17+ types):</strong></li>
                    <li>• Calories, macros, vitamins, minerals, water</li>
                    
                    <li><strong>Sleep Analysis (5+ types):</strong></li>
                    <li>• Sleep stages, REM, deep sleep, time in bed</li>
                    
                    <li><strong>Reproductive Health (5+ types):</strong></li>
                    <li>• Menstrual tracking, ovulation, temperature</li>
                    
                    <li><strong>Clinical Records (7+ types):</strong></li>
                    <li>• Lab results, medications, allergies, conditions</li>
                    
                    <li><strong>Mental Health & Mindfulness:</strong></li>
                    <li>• Mood tracking, mindful sessions, state of mind</li>
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
                    <div className="text-lg font-bold">{healthData.steps?.toLocaleString()}</div>
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