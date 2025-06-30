
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  ExternalLink,
  Key,
  AlertCircle
} from 'lucide-react';

interface StravaConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const StravaConnectionModal = ({ isOpen, onClose, onComplete }: StravaConnectionModalProps) => {
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    if (!apiKey.trim()) return;
    
    setIsConnecting(true);
    // Simulate API connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    setConnected(true);
    setIsConnecting(false);
    
    // Show success then close
    setTimeout(() => {
      onComplete();
      setConnected(false);
      setApiKey('');
    }, 2000);
  };

  if (connected) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Strava Connected!</h3>
            <p className="text-gray-600 mb-4">
              Your Strava data is now connected and will enhance your Nike Run Club earnings.
            </p>
            <p className="text-sm text-green-600 font-medium">
              Your total earning potential is now $75-95/month
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-white" />
            </div>
            <span>Connect Strava API</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 mb-1">Enhanced Data Collection</p>
                <p className="text-sm text-amber-800">
                  Connecting Strava will provide additional activity data that complements 
                  your Nike Run Club connection, increasing your earning potential.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Get your Strava API Key</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>1. Go to Strava API settings</p>
              <p>2. Create a new application</p>
              <p>3. Copy your API key</p>
              <p>4. Paste it below</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => window.open('https://www.strava.com/settings/api', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Strava API
            </Button>
          </div>

          <div>
            <Label htmlFor="apiKey">Strava API Key</Label>
            <Input
              id="apiKey"
              placeholder="Enter your Strava API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">Data Usage</h5>
            <p className="text-sm text-blue-700">
              Your Strava data will be combined with Nike Run Club data to provide 
              more comprehensive fitness insights while maintaining complete anonymity.
            </p>
          </div>

          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={onClose}
              disabled={isConnecting}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-orange-500 hover:bg-orange-600" 
              onClick={handleConnect}
              disabled={!apiKey.trim() || isConnecting}
            >
              {isConnecting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting...</span>
                </div>
              ) : (
                'Connect Strava'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StravaConnectionModal;
