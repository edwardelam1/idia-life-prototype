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
import NikeConnectionModal from './NikeConnectionModal';
import StravaConnectionModal from './StravaConnectionModal';

const DataDashboard = () => {
  const [connections, setConnections] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNikeModal, setShowNikeModal] = useState(false);
  const [showStravaModal, setShowStravaModal] = useState(false);

  // Mock user ID for testing - in production this would come from auth
  const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    fetchConnections();
    
    // Check for Strava authorization code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state === 'strava_auth') {
      handleStravaCallback(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchConnections = async () => {
    try {
      // Fetch real connections from database
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('data_connections')
        .select('*')
        .eq('user_id', TEST_USER_ID)
        .eq('is_active', true);

      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
        setConnections([]);
        setTotalEarnings(0);
        setLoading(false);
        return;
      }

      // Fetch user wallet to get real earnings
      const { data: walletData, error: walletError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', TEST_USER_ID)
        .single();

      const monthlyEarnings = walletData?.total_earned || 0;

      setConnections(connectionsData || []);
      setTotalEarnings(monthlyEarnings);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching connections:', error);
      setConnections([]);
      setTotalEarnings(0);
      setLoading(false);
    }
  };

  const handleStravaAuth = () => {
    // For now, just open the modal for API key connection
    setShowStravaModal(true);
  };

  const handleStravaCallback = async (code: string) => {
    try {
      console.log('Strava authorization code:', code);
      
      // Create a test connection
      const { data: newConnection, error: connectionError } = await supabase
        .from('data_connections')
        .insert({
          user_id: TEST_USER_ID,
          connection_name: 'Strava',
          connection_type: 'strava',
          access_token: 'test_access_token_' + Date.now(),
          is_active: true
        })
        .select()
        .single();

      if (connectionError) {
        console.error('Error creating connection:', connectionError);
        return;
      }
      
      // Refresh connections after successful creation
      fetchConnections();
    } catch (error) {
      console.error('Error handling Strava callback:', error);
    }
  };

  const handleNikeConnect = () => {
    setShowNikeModal(false);
    setShowStravaModal(true);
  };

  const handleStravaComplete = async () => {
    setShowStravaModal(false);
    
    // Create a test connection when modal completes
    try {
      const { data: newConnection, error: connectionError } = await supabase
        .from('data_connections')
        .insert({
          user_id: TEST_USER_ID,
          connection_name: 'Strava',
          connection_type: 'strava',
          access_token: 'test_access_token_' + Date.now(),
          is_active: true
        })
        .select()
        .single();

      if (!connectionError) {
        // Refresh connections after successful creation
        await fetchConnections();
      }
    } catch (error) {
      console.error('Error creating connection:', error);
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
              <p className="text-3xl font-bold">${totalEarnings.toFixed(2)}</p>
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
                <Badge variant="secondary">Research studies</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <p className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Marathon training optimization research</span>
                </p>
                <p className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Fitness app accessibility improvements</span>
                </p>
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
                        src="/lovable-uploads/1d14c6f9-fbbd-4462-84f8-b72a4e39b89d.png" 
                        alt="Strava" 
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{connection.connection_name}</h3>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">
                            Active Pipeline
                          </p>
                          <p className="text-xs text-gray-500">
                            Processing data automatically
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {connection.connection_type === 'strava' ? 'Fitness data from Strava activities' : 'Connected data source'}
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

      {/* Available Data Sources - Strava */}
      {connections.length === 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Available Data Sources</h2>
          <div className="flex justify-center">
            <div 
              className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleStravaAuth}
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-white">
                <img 
                  src="/lovable-uploads/1d14c6f9-fbbd-4462-84f8-b72a4e39b89d.png" 
                  alt="Strava" 
                  className="w-full h-full object-contain p-2"
                />
              </div>
              <span className="text-sm font-medium text-gray-700 mt-2">Strava</span>
            </div>
          </div>
        </div>
      )}

      <NikeConnectionModal 
        isOpen={showNikeModal}
        onClose={() => setShowNikeModal(false)}
        onConnect={handleNikeConnect}
      />

      <StravaConnectionModal 
        isOpen={showStravaModal}
        onClose={() => setShowStravaModal(false)}
        onComplete={handleStravaComplete}
      />
    </div>
  );
};

export default DataDashboard;
