
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  DollarSign, 
  CheckCircle, 
  Lock,
  Users,
  Activity
} from 'lucide-react';

interface NikeConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
}

const NikeConnectionModal = ({ isOpen, onClose, onConnect }: NikeConnectionModalProps) => {
  const [consentGiven, setConsentGiven] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!consentGiven) return;
    
    setIsConnecting(true);
    // Simulate connection process
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsConnecting(false);
    onConnect();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span>Connect Nike Run Club</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Earnings Info */}
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-teal-600" />
              <span className="font-semibold text-teal-900">Earning Potential</span>
            </div>
            <p className="text-2xl font-bold text-teal-900">$40-60/month</p>
            <p className="text-sm text-teal-700">Estimated monthly earnings from fitness data</p>
          </div>

          {/* Privacy Level */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Privacy Level</span>
            </div>
            <Badge className="text-green-600 bg-green-100">
              Very High
            </Badge>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">How it works</h4>
            <p className="text-sm text-gray-600">
              Share your anonymized running and fitness data from Nike Run Club to help improve 
              health research and fitness app development. Your personal identity is never shared.
            </p>
          </div>

          {/* Data Types */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Data collected</h4>
            <div className="space-y-2">
              {[
                'Running distance and pace',
                'Workout frequency and duration',
                'Achievement patterns',
                'App usage statistics'
              ].map((type, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">{type}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Privacy Guarantees */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center space-x-2">
              <Lock className="w-4 h-4" />
              <span>Privacy Guarantees</span>
            </h4>
            <div className="space-y-2 text-sm">
              {[
                'Data is anonymized before sharing',
                'No personal identifiers are included', 
                'You can disconnect at any time',
                'Full transparency on data usage'
              ].map((guarantee, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-gray-600">{guarantee}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <Users className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 mb-1">Who uses this data?</p>
                <p className="text-sm text-blue-700">
                  Health research institutions, fitness app developers, and wellness studies 
                  focused on improving public health outcomes and digital fitness experiences.
                </p>
              </div>
            </div>
          </div>

          {/* Consent */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <Switch 
                checked={consentGiven}
                onCheckedChange={setConsentGiven}
                className="mt-1"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  I consent to sharing my Nike Run Club data
                </p>
                <p className="text-xs text-gray-600">
                  I understand that my fitness data will be anonymized and used for research purposes. 
                  I can revoke this consent at any time through the app settings.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
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
              className="flex-1 bg-black hover:bg-gray-800" 
              onClick={handleConnect}
              disabled={!consentGiven || isConnecting}
            >
              {isConnecting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting...</span>
                </div>
              ) : (
                'Connect to Nike'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NikeConnectionModal;
