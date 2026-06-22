import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Truck,
  Map,
  FileText,
  ShieldAlert,
  Zap,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { eventTracker } from '@/utils/EventTracker';

interface TruckstopConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingConnection?: any;
  onDisconnect?: () => void;
}

const TruckstopConnectionModal = ({ isOpen, onClose, onComplete, existingConnection, onDisconnect }: TruckstopConnectionModalProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  const handleDisconnect = async () => {
    if (!currentUserId || !existingConnection) return;
    
    try {
      eventTracker.trackFeatureUsage({ feature: 'truckstop_connection', action: 'disconnect_initiated', success: false });

      // Completely remove the connection from the database
      const { error } = await supabase
        .from('data_connections')
        .delete()
        .eq('id', existingConnection.id)
        .eq('user_id', currentUserId);

      if (!error) {
        eventTracker.trackFeatureUsage({ feature: 'truckstop_connection', action: 'disconnected', success: true });
        onDisconnect?.();
        onClose();
      }
    } catch (error) {
      console.error('Error disconnecting Truckstop:', error);
    }
  };

  const handleConnect = async () => {
    if (!currentUserId) {
      toast({ title: "Error", description: "Please log in to connect your Truckstop account.", variant: "destructive" });
      return;
    }

    eventTracker.trackFeatureUsage({ feature: 'truckstop_connection', action: 'connect_initiated', success: false });
    setIsConnecting(true);

    try {
      // For the prototype, we simulate the OAuth handshake duration, 
      // then insert the connection directly into the database.
      setTimeout(async () => {
        const { error } = await supabase.from('data_connections').insert({
          user_id: currentUserId,
          connection_type: 'truckstop',
          is_active: true // FIXED: Uses is_active instead of status
        });

        if (error) throw error;

        eventTracker.trackFeatureUsage({ feature: 'truckstop_connection', action: 'connected', success: true });
        setIsConnecting(false);
        setConnected(true);
        toast({ title: "Connected!", description: "Your Truckstop Go account has been linked successfully." });
        
        setTimeout(() => { 
          onComplete(); 
          setConnected(false); 
        }, 2000);
      }, 1500);

    } catch (error) {
      console.error('Error starting Truckstop connection:', error);
      setIsConnecting(false);
      toast({
        title: "Connection Failed",
        description: `Failed to link Truckstop: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const dataCategories = [
    { icon: Map, label: 'Carrier Visibility', desc: 'Real-time GPS, route history, and lane preferences.' },
    { icon: DollarSign, label: 'Freight Matching', desc: 'Load searches, booked freight, and rate confirmations.' },
    { icon: FileText, label: 'Document Aggregation', desc: 'Anonymized BOLs, weight tickets, and digital paperwork.' },
    { icon: ShieldAlert, label: 'Compliance Status', desc: 'DOT number status, safety ratings, and insurance auth.' },
  ];

  if (connected) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Truckstop Linked!</h3>
            <p className="text-muted-foreground mb-4">
              Your commercial freight telemetry is now securely streaming into IDIA.
            </p>
            <p className="text-sm text-orange-600 font-medium">
              Earning potential: $150-300/month from commercial data
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
            <div className="w-10 h-10 bg-[#FF5A00] rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span>{existingConnection ? 'Truckstop Go' : 'Connect Truckstop Go'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {existingConnection ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Truck className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-medium text-orange-800">Truckstop Active</h3>
                <p className="text-sm text-muted-foreground">Commercial telemetry is streaming</p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-800">Live Logistics Data</p>
                    <p className="text-xs text-orange-600">Processing freight metrics automatically</p>
                  </div>
                  <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDisconnect}>Disconnect</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-start space-x-2">
                  <Zap className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-orange-900 mb-1">Commercial Telemetry</p>
                    <p className="text-sm text-orange-800">
                      Link your Truckstop account to securely stream your load history, location pings, and compliance data into the marketplace to earn IDIA-USD.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-3">Data Categories</h4>
                <div className="space-y-2">
                  {dataCategories.map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="flex items-center space-x-3 p-2 rounded-lg bg-muted/50">
                      <Icon className="w-4 h-4 text-orange-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h5 className="font-medium text-foreground mb-2">Enterprise Anonymization</h5>
                <p className="text-sm text-muted-foreground">
                  Your commercial data is highly valuable. IDIA strips all PII (Personally Identifiable Information), hashing your MC/DOT numbers and abstracting exact pickup locations into regional zones before it hits the open market.
                </p>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1" onClick={onClose} disabled={isConnecting}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-[#FF5A00] hover:bg-[#E04F00] text-white" 
                  onClick={handleConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </div>
                  ) : (
                    'Link Truckstop'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TruckstopConnectionModal;