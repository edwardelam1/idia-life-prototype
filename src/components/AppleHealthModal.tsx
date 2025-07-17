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
  const [healthData, setHealthData] = useState<any>(null); // To show what was sent by native app
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
    // This callback is expected from the native app for the simplified version
    (window as any).onHealthDataSyncComplete = (responseBody: string) => {
      console.log("Web view received sync completion callback from native app (simplified).");
      try {
        const responseData = JSON.parse(responseBody);
        // Display the data that the native app reported sending
        if (responseData && responseData.health_data) {
          setHealthData(responseData.health_data); 
        } else {
          setHealthData({steps: '?', heartRate: '?', activeMinutes: '?', sleepHours: '?'});
        }
        setConnectionStatus('connected');
        setIsConnecting(false);
        onComplete();
      } catch (error) {
        console.error("Failed to parse native callback response (simplified):", error);
        setErrorMessage("HealthKit sync failed.");
        setConnectionStatus('error');
        setIsConnecting(false);
      }
    };
    // Handle error callback from native app
    (window as any).onHealthDataSyncError = (errorMessage: string) => {
        console.error("Web view received error callback from native app (simplified):", errorMessage);
        setErrorMessage(`HealthKit Sync Error: ${errorMessage}`);
        setConnectionStatus('error');
        setIsConnecting(false);
    };

    return () => {
      (window as any).onHealthDataSyncComplete = undefined;
      (window as any).onHealthDataSyncError = undefined;
    };
  }, [onComplete]);


  const syncHealthDataViaNativeApp = () => { // Function name restored to be generic
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setErrorMessage(null);
    
    const webkit = (window as any).webkit;
    if (webkit && webkit.messageHandlers && webkit.messageHandlers.syncHealthData) {
      console.log("Sending basic HealthKit data sync request to native iOS app (simplified HealthKitManager)...");
      
      const basicHealthRequest = { // Requesting only basic types for simplified native
        action: "basic_health_sync",
        config: {
          endpoint: 'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/health-data-bridge',
          user_id: currentUserId,
          auth_token: authSession?.access_token
        },
        requestedDataTypes: { // Only basic types in request, native collects specific ones
          activity: [
            'HKQuantityTypeIdentifierStepCount',
            'HKQuantityTypeIdentifierActiveEnergyBurned'
          ],
          vitals: [
            'HKQuantityTypeIdentifierHeartRate'
          ],
          sleep: [
            'HKCategoryTypeIdentifierSleepAnalysis'
          ]
        }
      };
      
      webkit.messageHandlers.syncHealthData.postMessage(basicHealthRequest);
      
    } else {
      console.log("Not running in the native app wrapper. HealthKit sync unavailable (Launch via Xcode).");
      setErrorMessage("HealthKit sync is unavailable outside the native iOS app wrapper. Please launch from Xcode.");
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
    console.log('=== HANDLECONNECT START (Simplified Native) ===');
    console.log('handleConnect called, currentUserId:', currentUserId);
    console.log('authSession present:', !!authSession);
    
    setErrorMessage(null);
    setConnectionStatus('connecting');
    
    if (!currentUserId || !authSession) {
      const errorMsg = 'Please log in to connect Apple Health data.';
      console.error('Authentication check failed:', { currentUserId, authSession: !!authSession });
      setErrorMessage(errorMsg);
      setConnectionStatus('error');
      return;
    }
    
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
      console.log('Starting simplified HealthKit data sync via native app...');
    
      syncHealthDataViaNativeApp(); // Call the simplified native sync function
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
    
    console.log('=== HANDLECONNECT END (Simplified Native) ===');
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
            <span>{existingConnection ? 'Apple Health (Simplified)' : 'Connect Apple Health (Simplified)'}</span>
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
                This is a diagnostic mode for basic HealthKit data flow via the native app.
              </p>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">HealthKit Data Collected (Simplified Set):</h4>
                <div className="max-h-40 overflow-y-auto">
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Steps, Active Energy, Heart Rate, Sleep Hours</li>
                  </ul>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Data generated is for basic pipeline testing only.
                </p>
              </div>
              
              <Button 
                onClick={handleConnect}
                className="w-full"
                disabled={isConnecting || !currentUserId}
              >
                {isConnecting ? 'Connecting...' : 'Connect Apple Health (Simplified)'}
              </Button>
            </>
          )}

          {existingConnection && connectionStatus === 'idle' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="font-medium text-yellow-800">Basic Test Connected</h3>
                <p className="text-sm text-gray-600">Testing basic data flow via native app.</p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Basic Pipeline Active</p>
                    <p className="text-xs text-yellow-600">Testing native app bridge.</p>
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
              <p className="text-sm text-gray-600">Sending basic HealthKit data...</p>
            </div>
          )}
          
          {connectionStatus === 'connected' && healthData && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-green-800">Basic Data Sent!</h3>
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

export default AppleHealthModal;import { useState, useEffect } from 'react';
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
  const [healthData, setHealthData] = useState<any>(null); // To show minimal data sent
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
    // This callback is expected from the native app for minimal test
    (window as any).onHealthDataSyncComplete = (responseBody: string) => {
      console.log("Web view received sync completion callback from native app for minimal test.");
      try {
        const responseData = JSON.parse(responseBody);
        setHealthData(responseData.health_data); // Show what was sent for test
        setConnectionStatus('connected');
        setIsConnecting(false);
        onComplete();
      } catch (error) {
        console.error("Failed to parse native callback response:", error);
        setErrorMessage("HealthKit test sync failed.");
        setConnectionStatus('error');
        setIsConnecting(false);
      }
    };

    return () => {
      (window as any).onHealthDataSyncComplete = undefined;
    };
  }, [onComplete]);


  const syncHealthDataViaNativeAppMinimal = () => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setErrorMessage(null);
    
    const webkit = (window as any).webkit;
    if (webkit && webkit.messageHandlers && webkit.messageHandlers.syncHealthData) {
      console.log("Sending minimal HealthKit data sync request to native iOS app...");
      
      const minimalHealthRequest = {
        action: "minimal_health_sync_test", // Action for minimal test
        config: {
          endpoint: 'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/health-data-bridge',
          user_id: currentUserId,
          auth_token: authSession?.access_token
        },
        requestedDataTypes: { // Minimal data types for request, actual data is hardcoded in native
          activity: ['HKQuantityTypeIdentifierStepCount'],
        }
      };
      
      webkit.messageHandlers.syncHealthData.postMessage(minimalHealthRequest);
      
    } else {
      console.log("Not running in the native app wrapper. HealthKit sync unavailable (Launch via Xcode).");
      setErrorMessage("HealthKit sync is unavailable outside the native iOS app wrapper. Please launch from Xcode.");
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
    console.log('=== HANDLECONNECT START (Minimal Test) ===');
    console.log('handleConnect called, currentUserId:', currentUserId);
    console.log('authSession present:', !!authSession);
    
    setErrorMessage(null);
    setConnectionStatus('connecting');
    
    if (!currentUserId || !authSession) {
      const errorMsg = 'Please log in to connect Apple Health data.';
      console.error('Authentication check failed:', { currentUserId, authSession: !!authSession });
      setErrorMessage(errorMsg);
      setConnectionStatus('error');
      return;
    }
    
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
      console.log('Starting minimal HealthKit data sync via native app...');
    
      syncHealthDataViaNativeAppMinimal(); // Call the minimal native sync function
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
    
    console.log('=== HANDLECONNECT END (Minimal Test) ===');
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
            <span>{existingConnection ? 'Apple Health (Minimal Test)' : 'Connect Apple Health (Minimal Test)'}</span>
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
                This is a diagnostic mode to test basic HealthKit data flow via native app.
              </p>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Simulated HealthKit Data (Minimal Set):</h4>
                <div className="max-h-40 overflow-y-auto">
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Steps, Heart Rate, Active Energy, Sleep Hours (minimal/hardcoded)</li>
                  </ul>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Data generated is for basic pipeline testing only.
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
                <h3 className="font-medium text-yellow-800">Minimal Test Connected</h3>
                <p className="text-sm text-gray-600">Testing basic data flow via native app.</p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Basic Pipeline Active</p>
                    <p className="text-xs text-yellow-600">Testing native app bridge.</p>
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
              <p className="text-sm text-gray-600">Sending minimal HealthKit data...</p>
            </div>
          )}
          
          {connectionStatus === 'connected' && healthData && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-green-800">Minimal Data Sent!</h3>
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