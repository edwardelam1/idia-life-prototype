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

// Assuming you have a Supabase client instance available
// You might pass it as a prop or import it from a global setup file.
// For this example, let's assume it's imported:
import { createClient } from '@supabase/supabase-js'; // Make sure this path is correct
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'; // Replace with your actual Supabase URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'; // Replace with your actual Supabase Anon Key
const supabase = createClient(supabaseUrl, supabaseAnonKey);


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
    setErrorMessage(null); // Clear previous errors

    try {
      // 1. Get the authenticated user ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Authentication required: User not found or session expired.", userError);
        setErrorMessage("Authentication failed. Please log in again.");
        setIsConnecting(false);
        return;
      }
      const userId = user.id;

      // 2. Prepare the health_data payload
      // This is a crucial step. You need to gather actual health data here.
      // The structure must match what your health-data-bridge Edge Function expects.
      const healthDataPayload = {
        steps: source.currentSteps || 5000, // Replace 'source.currentSteps' with actual collected step data
        heartRate: source.currentHeartRate || 75, // Example: add other relevant data
        activityMinutes: source.currentActivity || 60,
        recorded_at: new Date().toISOString(),
        // ... include any other relevant data points your health_data object should contain
        // Ensure this matches the `health_data` structure your health-data-bridge function uses.
      };

      // 3. Invoke the health-data-bridge Edge Function (proper pipeline entry point)
      const { data: bridgeResponse, error: invokeError } = await supabase.functions.invoke('health-data-bridge', {
        body: {
          user_id: userId,
          health_data: healthDataPayload,
        },
      });

      if (invokeError) {
        console.error("Error invoking health-data-bridge function:", invokeError);
        setErrorMessage(`Connection failed: ${invokeError.message || 'Unknown error'}. Please try again.`);
        setConnected(false); // Ensure connected state is false on error
      } else {
        console.log("Health data bridge invoked successfully. Response:", bridgeResponse);
        setConnected(true);
        // Do not close modal immediately, allow success message to show
        setTimeout(() => {
          onClose();
          setConnected(false);
          setConsentGiven(false);
        }, 2000);
      }

    } catch (error: any) {
      console.error("Unexpected error during connection process:", error);
      setErrorMessage(`An unexpected error occurred: ${error.message || 'Please try again.'}`);
      setConnected(false); // Ensure connected state is false on error
    } finally {
      setIsConnecting(false); // Always stop connecting state
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