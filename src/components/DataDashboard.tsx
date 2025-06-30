
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  ShoppingCart, 
  Smartphone, 
  Wifi, 
  Camera, 
  Music,
  Calendar,
  Activity,
  CheckCircle,
  Clock,
  DollarSign,
  Shield,
  Zap
} from 'lucide-react';
import DataSourceModal from './DataSourceModal';

const DataDashboard = () => {
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const connectedSources = [
    {
      id: 1,
      name: 'Location Data',
      icon: MapPin,
      status: 'active',
      earnings: '$45.23',
      monthlyEarnings: '$127.50',
      description: 'Anonymized location patterns for retail analytics',
      dataTypes: ['GPS coordinates', 'Visit frequency', 'Dwell time'],
      privacyLevel: 'High',
      connectedDate: '2024-01-15'
    },
    {
      id: 2,
      name: 'Shopping Behavior',
      icon: ShoppingCart,
      status: 'active',
      earnings: '$32.15',
      monthlyEarnings: '$89.40',
      description: 'Purchase patterns and product preferences',
      dataTypes: ['Purchase history', 'Product categories', 'Price sensitivity'],
      privacyLevel: 'Medium',
      connectedDate: '2024-02-01'
    },
    {
      id: 3,
      name: 'App Usage Analytics',
      icon: Smartphone,
      status: 'active',
      earnings: '$18.67',
      monthlyEarnings: '$52.30',
      description: 'App interaction patterns and preferences',
      dataTypes: ['Screen time', 'App categories', 'Usage patterns'],
      privacyLevel: 'High',
      connectedDate: '2024-02-10'
    }
  ];

  const potentialSources = [
    {
      id: 4,
      name: 'Wi-Fi Network Data',
      icon: Wifi,
      estimatedEarnings: '$25-40/month',
      description: 'Network usage patterns for connectivity analytics',
      dataTypes: ['Connection frequency', 'Network quality', 'Usage duration'],
      privacyLevel: 'High',
      demandLevel: 'High'
    },
    {
      id: 5,
      name: 'Photo Metadata',
      icon: Camera,
      estimatedEarnings: '$15-25/month',
      description: 'Image metadata for content optimization research',
      dataTypes: ['Photo timestamps', 'Location tags', 'Image categories'],
      privacyLevel: 'Medium',
      demandLevel: 'Medium'
    },
    {
      id: 6,
      name: 'Music Streaming',
      icon: Music,
      estimatedEarnings: '$20-35/month',
      description: 'Listening habits for music recommendation systems',
      dataTypes: ['Genres', 'Play frequency', 'Skip patterns'],
      privacyLevel: 'Low',
      demandLevel: 'High'
    },
    {
      id: 7,
      name: 'Calendar Patterns',
      icon: Calendar,
      estimatedEarnings: '$30-50/month',
      description: 'Schedule patterns for productivity research',
      dataTypes: ['Meeting frequency', 'Time blocks', 'Availability patterns'],
      privacyLevel: 'High',
      demandLevel: 'Very High'
    },
    {
      id: 8,
      name: 'Health & Fitness',
      icon: Activity,
      estimatedEarnings: '$40-60/month',
      description: 'Activity data for wellness and health research',
      dataTypes: ['Step count', 'Exercise patterns', 'Sleep quality'],
      privacyLevel: 'Very High',
      demandLevel: 'Very High'
    }
  ];

  const handleConnectSource = (source: any) => {
    setSelectedSource(source);
    setIsModalOpen(true);
  };

  const totalEarnings = connectedSources.reduce((sum, source) => {
    return sum + parseFloat(source.monthlyEarnings.replace('$', ''));
  }, 0);

  const getDemandColor = (level: string) => {
    switch (level) {
      case 'Very High': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getPrivacyColor = (level: string) => {
    switch (level) {
      case 'Very High': return 'text-green-600';
      case 'High': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      default: return 'text-orange-600';
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Data Earnings Summary */}
      <Card className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 mb-1">Monthly Data Earnings</p>
              <p className="text-3xl font-bold">${totalEarnings.toFixed(2)}</p>
              <p className="text-sm text-teal-100 mt-1">+23% from last month</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Virtuous Cycle Report */}
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
              <Badge variant="secondary">3 studies this month</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Retail traffic optimization (15% improvement)</span>
              </p>
              <p className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Smart city planning initiatives</span>
              </p>
              <p className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Healthcare accessibility research</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Data Sources */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Connected Data Sources</h2>
        <div className="space-y-3">
          {connectedSources.map((source) => {
            const Icon = source.icon;
            return (
              <Card key={source.id} className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{source.name}</h3>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">{source.monthlyEarnings}/mo</p>
                          <p className="text-xs text-gray-500">This week: {source.earnings}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{source.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Shield className={`w-3 h-3 ${getPrivacyColor(source.privacyLevel)}`} />
                          <span>{source.privacyLevel} Privacy</span>
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
            );
          })}
        </div>
      </div>

      {/* Potential Data Sources */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Potential Data Sources</h2>
        <div className="grid gap-3">
          {potentialSources.map((source) => {
            const Icon = source.icon;
            return (
              <Card key={source.id} className="border-2 border-dashed border-gray-200 hover:border-teal-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{source.name}</h3>
                        <Badge className={getDemandColor(source.demandLevel)}>
                          {source.demandLevel} Demand
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{source.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Shield className={`w-3 h-3 ${getPrivacyColor(source.privacyLevel)}`} />
                            <span>{source.privacyLevel} Privacy</span>
                          </span>
                          <span className="font-medium text-green-600">{source.estimatedEarnings}</span>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleConnectSource(source)}
                          className="bg-teal-500 hover:bg-teal-600"
                        >
                          Connect
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <DataSourceModal 
        source={selectedSource}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default DataDashboard;
