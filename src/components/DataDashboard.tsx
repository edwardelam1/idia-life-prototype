import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  CheckCircle,
  DollarSign,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AppleHealthModal from './AppleHealthModal';
import StravaConnectionModal from './StravaConnectionModal'; // Assuming this exists

const DataDashboard = () => {
  const [connections, setConnections] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAppleHealthModal, setShowAppleHealthModal] = useState(false);
  const [showStravaModal, setShowStravaModal] = useState(false);
  const [virtuousImpacts, setVirtuousImpacts] = useState<string[]>([]);
  
  const [lastSyncStatus, setLastSyncStatus] = useState<string>('unknown');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };

    getUser();
    // Initial fetch, will re-fetch once currentUserId is set
    fetchConnections();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchConnections();
    }
  }, [currentUserId]);

  const fetchConnections = async () => {
    if (!currentUserId) return;

    try {
      const [
        pipelineHealthResult,
        connectionsResult,
        walletResult,
        recentDataResult
      ] = await Promise.allSettled([
        supabase.functions.invoke('pipeline-diagnostics'),
        supabase
          .from('data_connections')
          .select('*')
          .eq('user_id', currentUserId)
          .eq('is_active', true),
        supabase
          .from('user_wallets')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle(),
        supabase
          .from('raw_health_data')
          .select('created_at')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(1)
      ]);

      if (pipelineHealthResult.status === 'rejected') {
        console.warn('Pipeline health check failed:', pipelineHealthResult.reason);
      }

      if (connectionsResult.status === 'rejected') {
        console.error('Error fetching connections:', connectionsResult.reason);
        setConnections([]);
        setTotalEarnings(0);
        setLoading(false);
        return;
      }

      const connectionsData = connectionsResult.value.data || [];

      let totalEarned = 0;
      if (walletResult.status === 'fulfilled') {
        totalEarned = walletResult.value.data?.total_earned || 0;
      } else {
        console.error('Error fetching wallet:', walletResult.reason);
      }

      // Check last sync status
      if (recentDataResult.status === 'fulfilled' && recentDataResult.value.data?.length > 0) {
        const lastDataTime = new Date(recentDataResult.value.data[0].created_at);
        const hoursSinceLastData = (Date.now() - lastDataTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastData > 24) {
          setLastSyncStatus('stale');
        } else if (hoursSinceLastData > 6) {
          setLastSyncStatus('delayed');
        } else {
          setLastSyncStatus('recent');
        }
      } else {
        setLastSyncStatus('no_data');
      }

      setConnections(connectionsData);
      setTotalEarnings(totalEarned);

      if (connectionsData.length > 0) {
        fetchVirtuousImpacts().catch(error => {
          console.error('Non-critical: Virtuous impacts fetch failed:', error);
        });
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
    const fallbackImpacts = [
      'Your anonymized activity improved heart health model accuracy',
      'Contributed to real-time wellness trend analysis',
      'Enhanced data quality for community research'
    ];
    try {
      const { data, error } = await supabase.functions.invoke('generate-virtuous-cycle-impacts', {
        body: { user_id: currentUserId }
      });

      if (error) {
        console.error('Error fetching virtuous impacts:', error);
        setVirtuousImpacts(fallbackImpacts);
        return;
      }

      if (data?.impacts?.length) {
        setVirtuousImpacts(data.impacts);
      } else {
        setVirtuousImpacts(fallbackImpacts);
      }
    } catch (error) {
      console.error('Error fetching virtuous impacts:', error);
      setVirtuousImpacts(fallbackImpacts);
    }
  };

  const triggerFriendForDataEvent = () => {
    window.dispatchEvent(new CustomEvent('showFriend', {
      detail: { trigger: 'data' }
    }));
  };


  const getSyncStatusBadge = () => {
    switch (lastSyncStatus) {
      case 'recent':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Synced Recently</Badge>;
      case 'delayed':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Sync Delayed</Badge>;
      case 'stale':
        return null;
      case 'no_data':
        return <Badge variant="outline">No Data Found</Badge>;
      default:
        return <Badge variant="outline">Checking...</Badge>;
    }
  };

  const handleAppleHealthComplete = async () => {
    console.log("DEBUG_PARENT: handleAppleHealthComplete called. Setting setShowAppleHealthModal(false).");
    setShowAppleHealthModal(false); // This closes the modal

    try {
      await fetchConnections();
      triggerFriendForDataEvent();
    } catch (error) {
      console.error('Error refreshing connections:', error);
    }
  };

  const handleStravaComplete = async () => {
    console.log("DEBUG_PARENT: handleStravaComplete called. Setting setShowStravaModal(false).");
    setShowStravaModal(false); // This closes the modal

    try {
      await fetchConnections();
      triggerFriendForDataEvent();
    } catch (error) {
      console.error('Error refreshing connections:', error);
    }
  };

  const getConnectionStatus = (connectionType: string) => {
    return connections.find(conn => conn.connection_type === connectionType);
  };

  if (loading) {
    return (
      <div className="space-y-6">
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
      <div className="space-y-4">
      {/* Data Earnings Summary with Sync Status */}
      <Card className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <p className="text-teal-100">Total Data Earnings</p>
                {getSyncStatusBadge()}
              </div>
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
                      <CheckCircle size={16} className="text-green-500 shrink-0" />
                      <span>{impact}</span>
                    </p>
                  ))
                ) : (
                  <p className="flex items-center space-x-2">
                    <CheckCircle size={16} className="text-green-500 shrink-0" />
                    <span>Generating live impact analysis...</span>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Data Sources - Only show unconnected sources */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Available Data Sources</h2>
        {!getConnectionStatus('apple_health') || !getConnectionStatus('strava') ? (
          <div className="flex justify-center space-x-8">
            {!getConnectionStatus('apple_health') && (
              <div
                className="relative cursor-pointer group"
                onClick={() => setShowAppleHealthModal(true)}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white shadow-sm border transition-all group-hover:shadow-md group-hover:scale-105">
                  <img
                    src="/lovable-uploads/8f82179a-e516-4c98-8c9f-aae3ee45c242.png"
                    alt="Apple Health"
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              </div>
            )}

            {!getConnectionStatus('strava') && (
              <div
                className="relative cursor-pointer group"
                onClick={() => setShowStravaModal(true)}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white shadow-sm border transition-all group-hover:shadow-md group-hover:scale-105">
                  <img
                    src="/lovable-uploads/1d14c6f9-fbbd-4462-84f8-b72a4e39b89d.png"
                    alt="Strava"
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">All available data sources connected</p>
            <p className="text-xs">Manage your connections below</p>
          </div>
        )}
      </div>

      {/* Connected Data Sources - Always Visible */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Connected Data Sources</h2>
        </div>
        {connections.length > 0 ? (
          <div className="flex justify-center space-x-8">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="relative cursor-pointer group"
                onClick={() => {
                  if (connection.connection_type === 'apple_health') {
                    setShowAppleHealthModal(true);
                  } else if (connection.connection_type === 'strava') {
                    setShowStravaModal(true);
                  }
                }}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white shadow-sm border-2 border-green-500 transition-all group-hover:shadow-md group-hover:scale-105">
                  <img
                    src={connection.connection_type === 'apple_health' ? "/lovable-uploads/8f82179a-e516-4c98-8c9f-aae3ee45c242.png" : "/lovable-uploads/1d14c6f9-fbbd-4462-84f8-b72a4e39b89d.png"}
                    alt={connection.connection_type}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No data sources connected yet</p>
            <p className="text-xs">Click on an available source above to connect</p>
          </div>
        )}
      </div>

      <AppleHealthModal
        isOpen={showAppleHealthModal}
        onClose={() => setShowAppleHealthModal(false)}
        onComplete={handleAppleHealthComplete}
        existingConnection={getConnectionStatus('apple_health')}
        onDisconnect={fetchConnections}
      />

      <StravaConnectionModal
        isOpen={showStravaModal}
        onClose={() => setShowStravaModal(false)}
        onComplete={handleStravaComplete}
        existingConnection={getConnectionStatus('strava')}
        onDisconnect={fetchConnections}
      />

    </div>
  );
};

export default DataDashboard;