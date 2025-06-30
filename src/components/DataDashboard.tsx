
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

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      // For demo purposes, we'll start with no connections
      // In a real app, this would query the data_connections table
      setConnections([]);
      setTotalEarnings(0);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching connections:', error);
      setLoading(false);
    }
  };

  const handleNikeConnect = () => {
    setShowNikeModal(false);
    setShowStravaModal(true);
  };

  const handleStravaComplete = () => {
    setShowStravaModal(false);
    // Add the connection to state
    const newConnection = {
      id: 1,
      connection_name: 'Nike Run Club + Strava',
      earnings_this_month: 67.50,
      total_earnings: 203.25,
      is_active: true,
      connected_at: new Date().toISOString()
    };
    setConnections([newConnection]);
    setTotalEarnings(67.50);
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
              <p className="text-teal-100 mb-1">Monthly Data Earnings</p>
              <p className="text-3xl font-bold">${totalEarnings.toFixed(2)}</p>
              <p className="text-sm text-teal-100 mt-1">
                {connections.length > 0 ? '+23% from last month' : 'Start earning by connecting data sources'}
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
                <Badge variant="secondary">2 studies this month</Badge>
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
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{connection.connection_name}</h3>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">
                            ${connection.earnings_this_month.toFixed(2)}/mo
                          </p>
                          <p className="text-xs text-gray-500">
                            Total: ${connection.total_earnings.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Combined fitness data from Nike Run Club and Strava
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Shield className="w-3 h-3 text-green-600" />
                          <span>Very High Privacy</span>
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

      {/* Available Data Sources - Nike Logo and NRC Text */}
      {connections.length === 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Available Data Sources</h2>
          <div className="flex justify-center">
            <div 
              className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowNikeModal(true)}
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden">
                <img 
                  src="/lovable-uploads/06b7764e-1013-42f5-a125-b1230ee1ddd8.png" 
                  alt="Nike Run Club" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-sm font-medium text-gray-700 mt-2">NRC</span>
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
