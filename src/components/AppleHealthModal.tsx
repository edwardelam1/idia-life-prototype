import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Heart, Footprints, Moon, Zap } from 'lucide-react';

interface AppleHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const AppleHealthModal = ({ isOpen, onClose, onComplete }: AppleHealthModalProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  const syncHealthDataWithNativeApp = () => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    // First, check if the app is running inside the iOS wrapper.
    // The 'webkit.messageHandlers' object only exists in a WKWebView.
    const webkit = (window as any).webkit;
    if (webkit && webkit.messageHandlers && webkit.messageHandlers.syncHealthData) {
      
      console.log("Sending 'syncHealthData' message to the native iOS app.");
      
      // This is the key line: it sends a message to the native code.
      // The name "syncHealthData" must exactly match the name you registered in the Swift code.
      webkit.messageHandlers.syncHealthData.postMessage("start_sync");
      
      // Simulate receiving health data (in real implementation, this would come from the native app)
      setTimeout(() => {
        const mockHealthData = {
          steps: 12543,
          heartRate: 72,
          activeMinutes: 45,
          sleepHours: 7.5,
          calories: 2156
        };
        setHealthData(mockHealthData);
        setConnectionStatus('connected');
        setIsConnecting(false);
        
        // Complete the connection after showing data
        setTimeout(() => {
          onComplete();
        }, 3000);
      }, 2000);

    } else {
      // This message will appear if you test in a regular web browser.
      console.log("Not running in the native app wrapper. HealthKit sync is unavailable.");
      
      // For demo purposes, we'll simulate the connection working
      setTimeout(() => {
        const mockHealthData = {
          steps: 12543,
          heartRate: 72,
          activeMinutes: 45,
          sleepHours: 7.5,
          calories: 2156
        };
        setHealthData(mockHealthData);
        setConnectionStatus('connected');
        setIsConnecting(false);
        
        // Complete the connection after showing data
        setTimeout(() => {
          onComplete();
        }, 3000);
      }, 2000);
    }
  };

  const handleConnect = () => {
    syncHealthDataWithNativeApp();
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
            <span>Connect Apple Health</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {connectionStatus === 'idle' && (
            <>
              <p className="text-sm text-gray-600">
                Connect your Apple Health data to earn rewards for your fitness activities and health metrics.
              </p>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Data we'll access:</h4>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Step count and walking distance</li>
                  <li>• Heart rate and active minutes</li>
                  <li>• Sleep duration and quality</li>
                  <li>• Calories burned</li>
                  <li>• Workout data</li>
                </ul>
              </div>
              
              <Button 
                onClick={handleConnect}
                className="w-full"
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect Apple Health'}
              </Button>
            </>
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