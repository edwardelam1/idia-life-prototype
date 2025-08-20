import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Heart, Footprints, Moon, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import React from 'react';
import { eventTracker } from '@/utils/EventTracker';

interface AppleHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingConnection?: any;
  onDisconnect?: () => void;
}

// Define all 37 data types with their display names and categories (Matching HealthKitManager omissions)
const ALL_HEALTH_DATA_TYPES = [
  // Activity & Movement
  { id: 'HKQuantityTypeIdentifierStepCount', name: 'Steps', category: 'Activity' },
  { id: 'HKQuantityTypeIdentifierDistanceWalkingRunning', name: 'Distance (Walking/Running)', category: 'Activity' },
  { id: 'HKQuantityTypeIdentifierDistanceCycling', name: 'Distance (Cycling)', category: 'Activity' },
  { id: 'HKQuantityTypeIdentifierFlightsClimbed', name: 'Flights Climbed', category: 'Activity' },
  { id: 'HKQuantityTypeIdentifierActiveEnergyBurned', name: 'Active Energy Burned', category: 'Activity' },
  { id: 'HKQuantityTypeIdentifierBasalEnergyBurned', name: 'Basal Energy Burned', category: 'Activity' },
  { id: 'HKQuantityTypeIdentifierAppleExerciseTime', name: 'Exercise Time', category: 'Activity' },
  { id: 'HKQuantityTypeIdentifierWalkingSpeed', name: 'Walking Speed', category: 'Activity' },
  { id: 'HKQuantityTypeIdentifierWalkingStepLength', name: 'Walking Step Length', category: 'Activity' },
  { id: 'HKQuantityTypeIdentifierWalkingAsymmetryPercentage', name: 'Walking Asymmetry', category: 'Activity' },
  { id: 'HKQuantityTypeIdentifierWalkingDoubleSupportPercentage', name: 'Double Support Time', category: 'Activity' },

  // Heart & Vitals (Basic)
  { id: 'HKQuantityTypeIdentifierHeartRate', name: 'Heart Rate', category: 'Vitals' },
  { id: 'HKQuantityTypeIdentifierRestingHeartRate', name: 'Resting Heart Rate', category: 'Vitals' },
  // OMITTED: HeartRateVariabilitySDNN
  { id: 'HKQuantityTypeIdentifierOxygenSaturation', name: 'Blood Oxygen', category: 'Vitals' },
  // OMITTED: BloodPressureSystolic, BloodPressureDiastolic
  { id: 'HKQuantityTypeIdentifierRespiratoryRate', name: 'Respiratory Rate', category: 'Vitals' },
  { id: 'HKQuantityTypeIdentifierBodyTemperature', name: 'Body Temperature', category: 'Vitals' },
  { id: 'HKQuantityTypeIdentifierVO2Max', name: 'VO2 Max', category: 'Vitals' },

  // Body Measurements
  { id: 'HKQuantityTypeIdentifierHeight', name: 'Height', category: 'Body' },
  { id: 'HKQuantityTypeIdentifierBodyMass', name: 'Weight', category: 'Body' },
  { id: 'HKQuantityTypeIdentifierBodyMassIndex', name: 'BMI', category: 'Body' },
  { id: 'HKQuantityTypeIdentifierBodyFatPercentage', name: 'Body Fat %', category: 'Body' },
  { id: 'HKQuantityTypeIdentifierLeanBodyMass', name: 'Lean Body Mass', category: 'Body' },
  { id: 'HKQuantityTypeIdentifierWaistCircumference', name: 'Waist Circumference', category: 'Body' },

  // Nutrition (Basic)
  { id: 'HKQuantityTypeIdentifierDietaryEnergyConsumed', name: 'Dietary Energy', category: 'Nutrition' },
  { id: 'HKQuantityTypeIdentifierDietaryFatTotal', name: 'Total Fat', category: 'Nutrition' },
  { id: 'HKQuantityTypeIdentifierDietaryProtein', name: 'Protein', category: 'Nutrition' },
  { id: 'HKQuantityTypeIdentifierDietaryWater', name: 'Water Intake', category: 'Nutrition' },
  // OMITTED: Specific dietary fats, fiber, sugar, caffeine, sodium, potassium, vitamins, calcium, iron

  // OMITTED: Sleep Analysis

  // Other Categories
  { id: 'HKCategoryTypeIdentifierMindfulSession', name: 'Mindful Minutes', category: 'Mindfulness' },
  { id: 'HKQuantityTypeIdentifierEnvironmentalAudioExposure', name: 'Environmental Audio Exposure', category: 'Environment' },
  { id: 'HKQuantityTypeIdentifierHeadphoneAudioExposure', name: 'Headphone Audio Exposure', category: 'Environment' },

  // Reproductive Health
  { id: 'HKCategoryTypeIdentifierMenstrualFlow', name: 'Menstrual Flow', category: 'Reproductive' },
  { id: 'HKQuantityTypeIdentifierBasalBodyTemperature', name: 'Basal Body Temperature', category: 'Reproductive' },
  { id: 'HKCategoryTypeIdentifierOvulationTestResult', name: 'Ovulation Test Result', category: 'Reproductive' },
  { id: 'HKCategoryTypeIdentifierCervicalMucusQuality', name: 'Cervical Mucus Quality', category: 'Reproductive' },
  { id: 'HKCategoryTypeIdentifierSexualActivity', name: 'Sexual Activity', category: 'Reproductive' },

  { id: 'HKWorkoutTypeIdentifier', name: 'Workout Data', category: 'Activity' },
  { id: 'HKClinicalTypeIdentifier', name: 'Clinical Data Indicator', category: 'Clinical' }, // Generic placeholder
  // OMITTED: Emotional State
];

const AppleHealthModal = ({ isOpen, onClose, onComplete, existingConnection, onDisconnect }: AppleHealthModalProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [healthData, setHealthData] = useState<any>(null); // To show what was sent by native app
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<any>(null);
  // State to manage selected data types - all selected by default
  const [selectedDataTypes, setSelectedDataTypes] = useState<Set<string>>(new Set(ALL_HEALTH_DATA_TYPES.map(d => d.id)));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Removed showAllTypes state as it's not used in current simplified list view
  // const [showAllTypes, setShowAllTypes] = useState(false);


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

  // Auto-close timer when connection is successful
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const timer = setTimeout(() => {
        console.log("DEBUG_UI: Auto-closing modal after 2 second delay.");
        onComplete();
      }, 2000); // 2 second delay to show success state

      return () => clearTimeout(timer);
    }
  }, [connectionStatus, onComplete]);

  useEffect(() => {
    // This callback is expected from the native app upon sync completion
    (window as any).onHealthDataSyncComplete = (responseBody: any) => {
      console.log("DEBUG_UI: Web view received sync completion callback from native app.");
      console.log("DEBUG_UI: Raw Response Body from Native:", responseBody);

      try {
        let responseData;
        
        // Handle both string (JSON) and object responses from native app
        if (typeof responseBody === 'string') {
          responseData = JSON.parse(responseBody);
        } else {
          responseData = responseBody;
        }
        
        console.log("DEBUG_UI: Parsed/Direct Response Data from Native:", responseData);

        if (responseData && responseData.health_data) {
          setHealthData(responseData.health_data);
        } else if (responseData) {
          setHealthData(responseData); // Use the entire response if no health_data field
        } else {
          setHealthData({}); // Clear healthData on empty response
        }

        setConnectionStatus('connected');
        setIsConnecting(false);
        console.log("DEBUG_UI: Connection status set to 'connected', will auto-close in 2 seconds.");

        // Track successful connection
        eventTracker.trackFeatureUsage({
          feature: 'apple_health_connection',
          action: 'sync_completed',
          success: true
        });

      } catch (error: any) {
        console.error("DEBUG_UI: Failed to parse native callback response:", error);
        setErrorMessage(`HealthKit sync failed: ${error.message || 'Unknown error'}`);
        setConnectionStatus('error');
        setIsConnecting(false);
        console.log("DEBUG_UI: Connection status set to 'error' due to parsing failure.");
        
        // Track sync error
        eventTracker.trackFeatureUsage({
          feature: 'apple_health_connection',
          action: 'sync_failed',
          success: false,
          context: {
            error_message: error.message || 'Unknown error'
          }
        });
      }
    };
    // Handle error callback from native app
    (window as any).onHealthDataSyncError = (errorMsg: string) => {
        console.error("DEBUG_UI: Web view received error callback from native app:", errorMsg);
        setErrorMessage(`HealthKit Sync Error: ${errorMsg}`);
        setConnectionStatus('error');
        setIsConnecting(false);
        console.log("DEBUG_UI: Connection status set to 'error' by native error callback.");
    };

    return () => {
      (window as any).onHealthDataSyncComplete = undefined;
      (window as any).onHealthDataSyncError = undefined;
    };
  }, [onComplete]);

  const handleCheckboxChange = useCallback((id: string, isChecked: boolean) => {
    setSelectedDataTypes(prev => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const syncHealthDataViaNativeApp = useCallback(() => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setErrorMessage(null);

    const webkit = (window as any).webkit;
    if (webkit && webkit.messageHandlers && webkit.messageHandlers.syncHealthData) {
      console.log("DEBUG_UI: Preparing HealthKit data sync request for native iOS app...");

      const requestedTypesByCategory: { [key: string]: string[] } = {};
      ALL_HEALTH_DATA_TYPES.forEach(type => {
        if (selectedDataTypes.has(type.id)) {
          if (!requestedTypesByCategory[type.category.toLowerCase()]) {
            requestedTypesByCategory[type.category.toLowerCase()] = [];
          }
          requestedTypesByCategory[type.category.toLowerCase()].push(type.id);
        }
      });

      const comprehensiveHealthRequest = {
        action: "comprehensive_health_sync",
        config: {
          endpoint: 'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/health-data-bridge',
          user_id: currentUserId,
          auth_token: authSession?.access_token
        },
        requestedDataTypes: requestedTypesByCategory // Send only user-selected types
      };

      webkit.messageHandlers.syncHealthData.postMessage(comprehensiveHealthRequest);
      console.log("DEBUG_UI: Sent request to native app with selected types:", requestedTypesByCategory);

    } else {
      console.log("DEBUG_UI: Not running in the native app wrapper. HealthKit sync unavailable (Launch via Xcode).");
      setErrorMessage("HealthKit sync is unavailable outside the native iOS app wrapper. Please launch from Xcode.");
      setConnectionStatus('error');
      setIsConnecting(false);
    }
  }, [selectedDataTypes, currentUserId, authSession]);

  const handleDisconnect = useCallback(async () => {
    if (!currentUserId || !existingConnection) return;

    try {
      // Track disconnection through synapse
      eventTracker.trackFeatureUsage({
        feature: 'apple_health_connection',
        action: 'disconnect_initiated',
        success: false
      });

      const { error } = await supabase
        .from('data_connections')
        .update({ is_active: false })
        .eq('id', existingConnection.id)
        .eq('user_id', currentUserId);

      if (!error) {
        // Track successful disconnection
        eventTracker.trackFeatureUsage({
          feature: 'apple_health_connection',
          action: 'disconnected',
          success: true
        });

        onDisconnect?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Error disconnecting Apple Health:', error);

      // Track disconnection error
      eventTracker.trackFeatureUsage({
        feature: 'apple_health_connection',
        action: 'disconnect_failed',
        success: false
      });
    }
  }, [currentUserId, existingConnection, onDisconnect, onClose]);

  const handleConnect = useCallback(async () => {
    console.log('=== HANDLECONNECT START (Native App Driven) ===');
    console.log('handleConnect called, currentUserId:', currentUserId);
    console.log('authSession present:', !!authSession);

    // Track connection attempt through synapse
    eventTracker.trackFeatureUsage({
      feature: 'apple_health_connection',
      action: 'connect_initiated',
      success: false,
      context: {
        selected_data_types: selectedDataTypes.size,
        auth_session_present: !!authSession
      }
    });

    setErrorMessage(null);
    setConnectionStatus('connecting'); // Set status to connecting immediately

    if (!currentUserId || !authSession) {
      const errorMsg = 'Please log in to connect Apple Health data.';
      console.error('Authentication check failed:', { currentUserId, authSession: !!authSession });
      setErrorMessage(errorMsg);
      setConnectionStatus('error');

      // Track authentication error
      eventTracker.trackFeatureUsage({
        feature: 'apple_health_connection',
        action: 'auth_failed',
        success: false
      });

      return;
    }

    try {
      console.log('DEBUG_UI: Creating/updating connection record with upsert');

      // The database insert will automatically trigger synapse via database trigger
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

      console.log('DEBUG_UI: Connection operation result:', { connectionResult, connectionError });

      if (connectionError) {
        console.error('DEBUG_UI: Database connection error details:', {
          code: connectionError.code,
          message: connectionError.message,
          details: connectionError.details,
          hint: connectionError.hint
        });
        setErrorMessage(`Failed to initialize connection: ${connectionError.message}`);
        setConnectionStatus('error');

        // Track connection error
        eventTracker.trackFeatureUsage({
          feature: 'apple_health_connection',
          action: 'connection_failed',
          success: false,
          context: {
            error_code: connectionError.code,
            error_message: connectionError.message
          }
        });

        return;
      }

      console.log('DEBUG_UI: Connection record created/updated successfully:', connectionResult);
      console.log('DEBUG_UI: Starting comprehensive HealthKit data sync via native app...');

      // Track successful connection creation
      eventTracker.trackFeatureUsage({
        feature: 'apple_health_connection',
        action: 'connection_created',
        success: true,
        context: {
          connection_id: connectionResult.id
        }
      });

      syncHealthDataViaNativeApp(); // Call the native sync function
    } catch (error: any) {
      console.error('DEBUG_UI: Unexpected error in handleConnect:', error);
      console.error('DEBUG_UI: Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      setErrorMessage(`Connection failed: ${error.message}`);
      setConnectionStatus('error');

      // Track unexpected error
      eventTracker.trackFeatureUsage({
        feature: 'apple_health_connection',
        action: 'unexpected_error',
        success: false,
        context: {
          error_name: error.name,
          error_message: error.message
        }
      });
    }

    console.log('=== HANDLECONNECT END (Native App Driven) ===');
  }, [currentUserId, authSession, syncHealthDataViaNativeApp, selectedDataTypes]);

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
                <h4 className="font-medium text-sm">Select HealthKit Data to Access:</h4>
                <div className="max-h-60 overflow-y-auto border p-2 rounded-md"> {/* Increased max-height */}
                  {/* Group data types by category for better UX */}
                  {Array.from(new Set(ALL_HEALTH_DATA_TYPES.map(d => d.category))).map(category => (
                    <div key={category} className="mb-2">
                      <h5 className="font-semibold text-xs text-gray-700 mt-1">{category}</h5>
                      {ALL_HEALTH_DATA_TYPES.filter(d => d.category === category).map(type => (
                        <div key={type.id} className="flex items-center space-x-2 text-xs py-1">
                          <Checkbox
                            id={type.id}
                            checked={selectedDataTypes.has(type.id)}
                            onCheckedChange={(checked: boolean) => handleCheckboxChange(type.id, checked)}
                          />
                          <label htmlFor={type.id} className="text-gray-600 cursor-pointer">{type.name}</label>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {/* Removed setShowAllTypes toggle as it makes list too long */}
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
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3 text-center">
                    <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                    <div className="text-lg font-bold">{healthData.heartRate}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3 text-center">
                    <Activity className="w-5 h-5 text-green-500 mx-auto mb-1" />
                    <div className="text-lg font-bold">{healthData.activeMinutes}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3 text-center">
                    <Moon className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                    <div className="text-lg font-bold">{healthData.sleepHours}h</div>
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