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
  AlertCircle,
  Lock,
  Eye,
  Users,
  Zap
} from 'lucide-react';

import { supabase } from "@/integrations/supabase/client";


interface DataSourceModalProps {
  source: any;
  isOpen: boolean;
  onClose: () => void;
  // Potentially pass user ID here if not fetching globally
  // userId: string;
}

const DataSourceModal = ({ source, isOpen, onClose }: DataSourceModalProps) => {
  const [consentGiven, setConsentGiven] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // State for error messages

  if (!source) return null;

  const handleConnect = async () => {
    if (!consentGiven) {
      setErrorMessage("Please give consent to connect.");
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      // Get the authenticated user ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Authentication required: User not found or session expired.", userError);
        setErrorMessage("Authentication failed. Please log in again.");
        setIsConnecting(false);
        return;
      }
      const userId = user.id;

      // Route to appropriate live integration based on source type
      const sourceName = source.name.toLowerCase();
      
      if (sourceName.includes('apple') || sourceName.includes('health')) {
        // Apple Health - trigger real HealthKit sync
        const { data, error } = await supabase.functions.invoke('apple-health-sync', {
          body: {
            user_id: userId,
            apple_health_data: {
              // Real HealthKit data would be passed here from iOS app
              // For now, indicate this requires iOS app integration
              message: "Apple Health requires iOS app integration"
            }
          }
        });
        
        if (error) {
          setErrorMessage("Apple Health requires the iOS app to authorize HealthKit access.");
          return;
        }
      } else if (sourceName.includes('strava')) {
        // Strava - initiate OAuth flow
        const { data, error } = await supabase.functions.invoke('strava-auth-url', {
          body: { userId }
        });
        
        if (error) {
          setErrorMessage("Failed to connect to Strava. Please try again.");
          return;
        }
        
        if (data?.oauthUrl) {
          // Redirect to Strava OAuth
          window.open(data.oauthUrl, '_blank');
          setErrorMessage("Please complete Strava authorization in the new window.");
          return;
        }
      } else if (sourceName.includes('google') || sourceName.includes('fit')) {
        // Google Fit - trigger sync
        const { data, error } = await supabase.functions.invoke('google-fit-sync', {
          body: {
            user_id: userId,
            sync_type: 'manual'
          }
        });
        
        if (error) {
          setErrorMessage("Google Fit requires OAuth authorization. Please contact support.");
          return;
        }
      } else if (sourceName.includes('ford')) {
        // Ford - initiate OAuth flow
        const { data, error } = await supabase.functions.invoke('ford-auth-url', {
          body: { userId }
        });
        
        if (error) {
          setErrorMessage("Failed to connect to FordConnect. Please try again.");
          return;
        }
        
        if (data?.oauthUrl) {
          window.open(data.oauthUrl, '_blank');
          setErrorMessage("Please complete Ford authorization in the new window.");
          return;
        }
      } else {
        // For other sources, indicate they need real integration
        setErrorMessage(`${source.name} integration requires additional setup. Live data connections only.`);
        return;
      }

      // Create data connection record
      await supabase
        .from('data_connections')
        .upsert({
          user_id: userId,
          connection_type: source.name.toLowerCase().replace(/\s+/g, '_'),
          connection_name: source.name,
          is_active: true,
          last_sync_at: new Date().toISOString()
        });

      setConnected(true);
      
      // Close modal after showing success
      setTimeout(() => {
        onClose();
        setConnected(false);
        setConsentGiven(false);
      }, 2000);

    } catch (error: any) {
      console.error("Unexpected error during connection process:", error);
      setErrorMessage(`Connection error: ${error.message || 'Please try again.'}`);
      setConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const Icon = source.icon;

  const getPrivacyColor = (level: string) => {
    switch (level) {
      case 'Very High': return 'text-green-600 bg-green-100';
      case 'High': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-orange-600 bg-orange-100';
    }
  };

  if (connected) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Successfully Connected!</h3>
            <p className="text-gray-600 mb-4">
              Your {source.name} is now connected and earning you money.
            </p>
            <p className="text-sm text-green-600 font-medium">
              You'll start earning {source.estimatedEarnings} monthly
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-gray-600" />
            </div>
            <span>Connect {source.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {errorMessage && ( // Display error message if present
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}
          {/* Earnings Info */}
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-teal-600" />
              <span className="font-semibold text-teal-900">Earning Potential</span>
            </div>
            <p className="text-2xl font-bold text-teal-900">{source.estimatedEarnings}</p>
            <p className="text-sm text-teal-700">Estimated monthly earnings</p>
          </div>

          {/* Privacy Level */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Privacy Level</span>
            </div>
            <Badge className={getPrivacyColor(source.privacyLevel)}>
              {source.privacyLevel}
            </Badge>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">How it works</h4>
            <p className="text-sm text-gray-600">{source.description}</p>
          </div>

          {/* Data Types */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Data collected</h4>
            <div className="space-y-2">
              {source.dataTypes?.map((type: string, index: number) => (
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
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span className="text-gray-600">Data is anonymized before sharing</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span className="text-gray-600">No personal identifiers are included</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span className="text-gray-600">You can disconnect at any time</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span className="text-gray-600">Full transparency on data usage</span>
              </div>
            </div>
          </div>

          {/* Usage Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <Users className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 mb-1">Who uses this data?</p>
                <p className="text-sm text-blue-700">
                  Verified research institutions, ethical AI companies, and academic studies
                  focused on improving digital experiences and social good.
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
                  I consent to sharing my {source.name.toLowerCase()} data
                </p>
                <p className="text-xs text-gray-600">
                  I understand that my data will be anonymized and used for research purposes.
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
              className="flex-1 bg-teal-500 hover:bg-teal-600"
              onClick={handleConnect}
              disabled={!consentGiven || isConnecting}
            >
              {isConnecting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting...</span>
                </div>
              ) : (
                'Connect & Start Earning'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataSourceModal;