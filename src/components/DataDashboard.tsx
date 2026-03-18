import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Footprints, Moon, Heart, CheckCircle2 } from 'lucide-react';
import DataSourceModal from './DataSourceModal';

interface DataDashboardProps {
  onComplete?: () => void;
  onBack?: () => void;
}

const DATA_SOURCES = [
  {
    id: 'apple_health',
    name: 'Apple Health',
    icon: Heart,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    description: 'Sync your core vitals securely.',
    dataTypes: ['Steps', 'Heart Rate', 'Sleep Analysis']
  },
  {
    id: 'google_fit',
    name: 'Google Fit',
    icon: Activity,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    description: 'Sync your Android telemetry.',
    dataTypes: ['Activity', 'Energy Burned', 'Vitals']
  },
  {
    id: 'strava',
    name: 'Strava',
    icon: Footprints,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    description: 'Sync your endurance tracking.',
    dataTypes: ['Workouts', 'Distance', 'Pace']
  },
  {
    id: 'oura',
    name: 'Oura Ring',
    icon: Moon,
    color: 'text-zinc-300',
    bg: 'bg-zinc-500/10',
    description: 'Sync your recovery metrics.',
    dataTypes: ['Sleep Stages', 'Readiness', 'HRV']
  }
];

export default function DataDashboard({ onComplete, onBack }: DataDashboardProps) {
  const [selectedSource, setSelectedSource] = useState<any | null>(null);
  const [connectedSources, setConnectedSources] = useState<Record<string, boolean>>({});

  const handleConsentGiven = (sourceId: string) => {
    setConnectedSources(prev => ({ ...prev, [sourceId]: true }));
    setSelectedSource(null);
  };

  const hasConnections = Object.keys(connectedSources).length > 0;

  return (
    <div className="fixed inset-0 bg-[#0a0f1a] text-white flex flex-col overflow-hidden">
      {/* STRICT NO-SCROLL LOCK */}
      
      {/* Header Area */}
      <div className="pt-12 pb-6 px-6 flex-shrink-0">
        {onBack && (
          <button onClick={onBack} className="text-muted-foreground mb-4 hover:text-white transition">
            ← Back
          </button>
        )}
        <h1 className="text-3xl font-bold text-[#d4af37]">Connect Telemetry</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Select the data sources you wish to connect. You control what is shared.
        </p>
      </div>

      {/* Main Content: Horizontal Carousel */}
      <div className="flex-grow flex items-center">
        <div className="w-full flex overflow-x-auto snap-x snap-mandatory px-6 pb-8 space-x-6 hide-scrollbar">
          {DATA_SOURCES.map((source) => {
            const isConnected = connectedSources[source.id];
            const Icon = source.icon;
            
            return (
              <div key={source.id} className="snap-center flex-shrink-0 w-56 h-72">
                <Card 
                  className={`w-full h-full cursor-pointer transition-all duration-300 ${
                    isConnected 
                      ? 'border-green-500/50 bg-white/10 shadow-[0_0_20px_rgba(34,197,94,0.15)]' 
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  } backdrop-blur-md relative overflow-hidden flex flex-col items-center justify-center p-6`}
                  onClick={() => setSelectedSource(source)}
                >
                  {isConnected && (
                    <div className="absolute top-4 right-4 text-green-400 animate-in fade-in zoom-in">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  )}
                  
                  <div className={`w-20 h-20 rounded-2xl ${source.bg} flex items-center justify-center mb-6`}>
                    <Icon className={`w-10 h-10 ${source.color}`} />
                  </div>
                  
                  <h3 className="font-semibold text-lg text-white text-center mb-2">{source.name}</h3>
                  <span className={`text-xs font-medium ${isConnected ? 'text-green-400' : 'text-muted-foreground'}`}>
                    {isConnected ? 'Syncing Active' : 'Not Connected'}
                  </span>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed Bottom Action Area */}
      <div className="p-6 flex-shrink-0 pb-12">
        <Button 
          onClick={onComplete}
          disabled={!hasConnections}
          className={`w-full h-14 rounded-2xl ont-bold text-lg transition-all ${
            hasConnections 
              ? 'bg-[#4f8aff] hover:bg-[#4f8aff]/90 text-white shadow-[0_0_20px_rgba(79,138,255,0.3)]' 
              : 'bg-white/5 text-muted-foreground cursor-not-allowed border border-white/10'
          }`}
        >
          {hasConnections ? 'Enter IDIA Life' : 'Connect a Source to Continue'}
        </Button>
      </div>

      {/* Shadcn UI Modal */}
      {selectedSource && (
        <DataSourceModal 
          isOpen={!!selectedSource}
          source={selectedSource} 
          onClose={() => setSelectedSource(null)} 
          onConsent={() => handleConsentGiven(selectedSource.id)} 
        />
      )}
    </div>
  );
}