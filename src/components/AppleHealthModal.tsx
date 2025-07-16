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

  const syncHealthDataDirectlyToSupabase = async () => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setErrorMessage(null);

    if (!currentUserId || !authSession) {
      setErrorMessage('Please log in to connect Apple Health data.');
      setConnectionStatus('error');
      setIsConnecting(false);
      return;
    }

    console.log("Generating comprehensive HealthKit test data directly from web app...");

    // Generate realistic-looking comprehensive health data for diagnostic purposes
    const comprehensiveHealthData = {
      // Basic activity metrics
      steps: Math.floor(Math.random() * 10000) + 5000, // 5000-15000 steps
      heartRate: Math.floor(Math.random() * 30) + 70, // 70-100 bpm
      activeMinutes: Math.floor(Math.random() * 60) + 30, // 30-90 min
      sleepHours: parseFloat((Math.random() * 3 + 6).toFixed(1)), // 6-9 hours
      calories: Math.floor(Math.random() * 500) + 2000, // 2000-2500 kcal

      // Advanced vitals
      heartRateVariabilitySDNN: parseFloat((Math.random() * 30 + 20).toFixed(1)), // 20-50ms
      bloodOxygenSaturation: parseFloat((Math.random() * 5 + 95).toFixed(1)), // 95-100%
      bloodPressureSystolic: Math.floor(Math.random() * 20) + 110, // 110-130 mmHg
      bloodPressureDiastolic: Math.floor(Math.random() * 15) + 70, // 70-85 mmHg
      respiratoryRate: parseFloat((Math.random() * 5 + 12).toFixed(1)), // 12-17 breaths/min
      vo2Max: parseFloat((Math.random() * 10 + 30).toFixed(1)), // 30-40 ml/kg/min

      // Body measurements
      height: parseFloat((Math.random() * 10 + 170).toFixed(1)), // 170-180 cm
      weight: parseFloat((Math.random() * 20 + 60).toFixed(1)), // 60-80 kg
      bodyMassIndex: parseFloat((Math.random() * 5 + 20).toFixed(1)), // 20-25 BMI
      bodyFatPercentage: parseFloat((Math.random() * 10 + 15).toFixed(1)), // 15-25%
      leanBodyMass: parseFloat((Math.random() * 10 + 50).toFixed(1)), // 50-60 kg
      waistCircumference: parseFloat((Math.random() * 10 + 80).toFixed(1)), // 80-90 cm

      // Nutrition data
      dietaryEnergyConsumed: Math.floor(Math.random() * 500) + 1800, // 1800-2300 kcal
      dietaryFatTotal: Math.floor(Math.random() * 30) + 50, // 50-80g
      dietaryCarbohydrates: Math.floor(Math.random() * 100) + 200, // 200-300g
      dietaryProtein: Math.floor(Math.random() * 30) + 50, // 50-80g
      dietaryWater: Math.floor(Math.random() * 1000) + 1500, // 1500-2500 ml
      dietaryCaffeine: Math.floor(Math.random() * 100) + 50, // 50-150mg
      dietarySodium: Math.floor(Math.random() * 1000) + 1500, // 1500-2500mg
      dietaryPotassium: Math.floor(Math.random() * 1000) + 3000, // 3000-4000mg
      dietaryVitaminC: Math.floor(Math.random() * 50) + 75, // 75-125mg
      dietaryVitaminD: parseFloat((Math.random() * 10 + 15).toFixed(1)), // 15-25mcg
      dietaryCalcium: Math.floor(Math.random() * 200) + 800, // 800-1000mg
      dietaryIron: parseFloat((Math.random() * 5 + 10).toFixed(1)), // 10-15mg
      dietaryFatSaturated: parseFloat((Math.random() * 10 + 15).toFixed(1)), // 15-25g
      dietaryFatPolyunsaturated: parseFloat((Math.random() * 10 + 15).toFixed(1)), // 15-25g
      dietaryFatMonounsaturated: parseFloat((Math.random() * 10 + 15).toFixed(1)), // 15-25g
      dietaryFiber: parseFloat((Math.random() * 5 + 20).toFixed(1)), // 20-25g
      dietarySugar: parseFloat((Math.random() * 20 + 20).toFixed(1)), // 20-40g

      // Sleep analysis
      timeInBedMinutes: parseFloat((Math.random() * 60 + 420).toFixed(1)), // 7-8 hours
      timeAsleepMinutes: parseFloat((Math.random() * 60 + 360).toFixed(1)), // 6-7 hours
      remSleepMinutes: parseFloat((Math.random() * 30 + 90).toFixed(1)), // 90-120 min
      deepSleepMinutes: parseFloat((Math.random() * 30 + 60).toFixed(1)), // 60-90 min

      // Other category types (simulated)
      cervicalMucusQuality: Math.floor(Math.random() * 5) + 1, // 1-5
      sexualActivity: Math.floor(Math.random() * 2), // 0 or 1
      menstrualFlow: Math.floor(Math.random() * 4) + 1, // 1-4
      ovulationTestResult: Math.floor(Math.random() * 2), // 0 or 1 (negative/positive)
      basalBodyTemperature: parseFloat((Math.random() * 0.5 + 97.5).toFixed(2)), // 97.5-98.0 F
      
      // Environmental (simulated)
      environmentalAudioExposure: parseFloat((Math.random() * 20 + 70).toFixed(1)), // 70-90 dBA
      headphoneAudioExposure: parseFloat((Math.random() * 10 + 80).toFixed(1)), // 80-90 dBA

      // Clinical data indicators (simulated)
      hasClinicalData: Math.random() > 0.5,
      hasNutritionData: true,
      hasSleepData: true,
      hasVitalsData: true,
      
      source: 'apple_health_web_simulated',
      type: 'comprehensive_health_data_simulated',
      device_type: 'Web Browser',
      recorded_at: new Date().toISOString(),
    };

    try {
      console.log('Web app: Calling health-data-bridge directly with simulated data...');
      const { data: bridgeResult, error } = await supabase.functions.invoke('health-data-bridge', {
        body: {
          user_id: currentUserId,
          health_data: comprehensiveHealthData
        }
      });

      console.log('Web app: Health data bridge response (simulated):', { data: bridgeResult, error });

      if (error) {
        console.error('Web app: Health data bridge error (simulated):', error);
        setErrorMessage(`Simulated health data sync failed: ${error.message || 'Unknown error'}`);
        setConnectionStatus('error');
        setHealthData(null);
      } else {
        console.log('Web app: Simulated health data flow initiated successfully!');
        setHealthData(comprehensiveHealthData); // Display simulated data
        setConnectionStatus('connected');
        onComplete(); // Indicate completion to the parent component
      }
    } catch (error) {
      console.error('Web app: Unexpected error during simulated data flow:', error);
      setErrorMessage(`Connection failed: ${error.message}`);
      setConnectionStatus('error');
      setHealthData(null);
    } finally {
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
    console.log('=== HANDLECONNECT START (Web App Driven) ===');
    console.log('handleConnect called, currentUserId:', currentUserId);
    console.log('authSession present:', !!authSession);
    
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
        console.log('Starting direct data sync to Supabase...');
      
        syncHealthDataDirectlyToSupabase(); // Call the direct sync function
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
            <span>{existingConnection ? 'Apple Health (Web Test)' : 'Connect Apple Health (Web Test)'}</span>
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
                This is a diagnostic mode to test data flow directly from the web app.
              </p>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Simulated Comprehensive HealthKit Data:</h4>
                <div className="max-h-40 overflow-y-auto">
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Steps, Heart Rate, Active Minutes, Sleep Hours</li>
                    <li>• Advanced Vitals (HRV, Blood Oxygen, BP, Respiratory Rate, VO2 Max)</li>
                    <li>• Body Measurements (Height, Weight, BMI, Body Fat %, Lean Mass, Waist Circumference)</li>
                    <li>• Nutrition (Calories, Macros, Vitamins, Minerals, Water, Caffeine, Sodium, Potassium, Vit C/D, Calcium, Iron)</li>
                    <li>• Simulated Clinical Data Indicators</li>
                  </ul>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Data generated in this mode is for pipeline testing only.
                </p>
              </div>
              
              <Button 
                onClick={handleConnect}
                className="w-full"
                disabled={isConnecting || !currentUserId}
              >
                {isConnecting ? 'Connecting...' : 'Connect Apple Health (Test)'}
              </Button>
            </>
          )}

          {existingConnection && connectionStatus === 'idle' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="font-medium text-yellow-800">Web Test Connected</h3>
                <p className="text-sm text-gray-600">Testing data flow directly from web app.</p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Direct Pipeline Active</p>
                    <p className="text-xs text-yellow-600">Bypassing native app for testing</p>
                  </div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
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
              <p className="text-sm text-gray-600">Sending simulated health data...</p>
            </div>
          )}
          
          {connectionStatus === 'connected' && healthData && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-green-800">Simulated Data Sent!</h3>
                <p className="text-sm text-gray-600">Check Supabase logs for pipeline activity.</p>
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