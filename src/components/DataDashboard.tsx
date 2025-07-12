import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity,
  CheckCircle,
  DollarSign,
  Shield,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AppleHealthModal from './AppleHealthModal';

const DataDashboard = () => {
  const [connections, setConnections] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAppleHealthModal, setShowAppleHealthModal] = useState(false);
  const [virtuousImpacts, setVirtuousImpacts] = useState<string[]>([]);

  // Get real authenticated user ID
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [testingPipeline, setTestingPipeline] = useState(false);

  useEffect(() => {
    // Get authenticated user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    
    getUser();
    fetchConnections();
  }, []);

  // Re-fetch connections when user ID changes
  useEffect(() => {
    if (currentUserId) {
      fetchConnections();
    }
  }, [currentUserId]);

  const fetchConnections = async () => {
    if (!currentUserId) return;
    
    try {
      // Fetch real connections from database
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('user_connections')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('connection_status', 'connected');

      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
        setConnections([]);
        setTotalEarnings(0);
        setLoading(false);
        return;
      }

      // Fetch user wallet to get real earnings - REFRESH EVERY TIME
      const { data: walletData, error: walletError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle(); // Use maybeSingle to avoid errors

      const totalEarned = walletData?.total_earned || 0;

      setConnections(connectionsData || []);
      setTotalEarnings(totalEarned);
      
      // Fetch live virtuous cycle impacts
      if (connectionsData && connectionsData.length > 0) {
        await fetchVirtuousImpacts();
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching connections:', error);
      setConnections([]);
      setTotalEarnings(0);
      setLoading(false);
    }
  };

  const fetchVirtuousImpacts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-virtuous-cycle-impacts', {
        body: { user_id: currentUserId }
      });

      if (error) {
        console.error('Error fetching virtuous impacts:', error);
        return;
      }

      if (data?.impacts) {
        setVirtuousImpacts(data.impacts);
      }
    } catch (error) {
      console.error('Error fetching virtuous impacts:', error);
    }
  };

  // Add function to trigger Friend Assistant for data connection events
  const triggerFriendForDataEvent = () => {
    // Dispatch custom event that MainApp can listen for
    window.dispatchEvent(new CustomEvent('showFriend', { 
      detail: { trigger: 'data' } 
    }));
  };

  // Test function to manually trigger the IDIA pipeline
  const testPipeline = async () => {
    if (!currentUserId) {
      console.error('No user ID available for testing');
      return;
    }

    setTestingPipeline(true);
    console.log('Testing IDIA pipeline through health-data-bridge...');

    try {
      // Test the proper pipeline: health-data-bridge -> raw_health_data -> trigger -> IDIA-Synapse
      const testHealthData = {
        steps: 8245,
        heartRate: 78,
        activeMinutes: 65,
        sleepHours: 7.2,
        calories: 330,
        recorded_at: new Date().toISOString()
      };

      console.log('Testing health-data-bridge with health data:', testHealthData);

      const { data: result, error } = await supabase.functions.invoke('health-data-bridge', {
        body: {
          user_id: currentUserId,
          health_data: testHealthData
        }
      });

      console.log('Pipeline test result:', { data: result, error });

      if (error) {
        console.error('Pipeline test failed:', error);
      } else {
        console.log('Pipeline test successful! Data is now processing...');
        // Refresh data after a brief delay to allow processing
        setTimeout(async () => {
          await fetchConnections();
        }, 2000);
      }
    } catch (error) {
      console.error('Pipeline test error:', error);
    } finally {
      setTestingPipeline(false);
    }
  };


  const handleAppleHealthComplete = async () => {
    setShowAppleHealthModal(false);
    
    // Just refresh connections - the modal already created/updated the connection
    try {
      await fetchConnections();
      // Trigger Friend Assistant to celebrate the connection
      triggerFriendForDataEvent();
    } catch (error) {
      console.error('Error refreshing connections:', error);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!currentUserId) return;
    
    try {
      const { error } = await supabase
        .from('user_connections')
        .update({ connection_status: 'disconnected' })
        .eq('id', connectionId)
        .eq('user_id', currentUserId);

      if (!error) {
        await fetchConnections();
      }
    } catch (error) {
      console.error('Error disconnecting data source:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Data Earnings Summary */}
      <Card className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
          <div>
            <p className="text-teal-100 mb-1">Total Data Earnings</p>
            <p className="text-3xl font-bold">${totalEarnings.toFixed(2)} IDIA-USD</p>
            <p className="text-sm text-teal-100 mt-1">
              {connections.length > 0 ? 'Earnings from connected data sources' : 'Start earning by connecting data sources'}
            </p>
          </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Virtuous Cycle Report */}
      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span>Virtuous Cycle Impact</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
              <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Your data helped improve:</span>
                <Badge variant="secondary">Live Research Impact</Badge>
              </div>
              <div className="space-y-2 text-sm">
                {virtuousImpacts.length > 0 ? (
                  virtuousImpacts.map((impact, index) => (
                    <p key={index} className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{impact}</span>
                    </p>
                  ))
                ) : (
                  <p className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Generating live impact analysis...</span>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Data Sources */}
      {connections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Connected Data Sources</h2>
          <div className="space-y-3">
            {connections.map((connection) => (
              <Card key={connection.id} className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white">
                          <img 
                            src={connection.provider === 'apple_health' ? "/lovable-uploads/8f82179a-e516-4c98-8c9f-aae3ee45c242.png" : "/lovable-uploads/1d14c6f9-fbbd-4462-84f8-b72a4e39b89d.png"} 
                            alt={connection.provider} 
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">{connection.provider === 'apple_health' ? 'Apple Health' : connection.provider}</h3>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">
                              Active Pipeline
                            </p>
                            <p className="text-xs text-gray-500">
                              Processing data automatically
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(connection.id)}
                            className="text-xs h-8"
                          >
                            Disconnect
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {connection.provider === 'apple_health' ? 'Health data from Apple Health' : 'Connected data source'}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Shield className="w-3 h-3 text-green-600" />
                          <span>Privacy Protected</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>Active</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Test Pipeline Button */}
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="p-4 text-center">
          <h3 className="font-semibold text-gray-900 mb-2">Test Data Pipeline</h3>
          <p className="text-sm text-gray-600 mb-4">
            Test the complete IDIA data processing pipeline with sample health data
          </p>
          <Button 
            onClick={testPipeline}
            disabled={testingPipeline || !currentUserId}
            className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
          >
            {testingPipeline ? 'Testing Pipeline...' : 'Test Pipeline'}
          </Button>
        </CardContent>
      </Card>

      {/* Available Data Sources */}
      {connections.length === 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Available Data Sources</h2>
          <div className="flex justify-center">
            <div 
              className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowAppleHealthModal(true)}
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-white shadow-sm border">
                <img 
                  src="/lovable-uploads/8f82179a-e516-4c98-8c9f-aae3ee45c242.png" 
                  alt="Apple Health" 
                  className="w-full h-full object-contain p-2"
                />
              </div>
              <span className="text-sm font-medium text-gray-700 mt-2">Apple Health</span>
            </div>
          </div>
        </div>
      )}


      <AppleHealthModal 
        isOpen={showAppleHealthModal}
        onClose={() => setShowAppleHealthModal(false)}
        onComplete={handleAppleHealthComplete}
      />
    </div>
  );
};

export default DataDashboard;
