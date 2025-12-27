import { BiometricReading } from './types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Moon, 
  Zap, 
  Activity, 
  Brain, 
  RefreshCw 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BiometricsGridProps {
  biometrics: BiometricReading[];
}

const BiometricsGrid = ({ biometrics }: BiometricsGridProps) => {
  const getIcon = (type: BiometricReading['type']) => {
    switch (type) {
      case 'hrv': return Activity;
      case 'sleep': return Moon;
      case 'reaction_time': return Zap;
      case 'heart_rate': return Heart;
      case 'stress': return Brain;
      case 'recovery': return RefreshCw;
    }
  };

  const getLabel = (type: BiometricReading['type']) => {
    switch (type) {
      case 'hrv': return 'HRV RMSSD';
      case 'sleep': return 'Sleep';
      case 'reaction_time': return 'Reaction';
      case 'heart_rate': return 'Heart Rate';
      case 'stress': return 'Stress';
      case 'recovery': return 'Recovery';
    }
  };

  const getValidationColor = (tier: BiometricReading['validationTier']) => {
    switch (tier) {
      case 'clinical': return 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30';
      case 'consumer': return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
      case 'unvalidated': return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {biometrics.map((bio) => {
        const Icon = getIcon(bio.type);
        return (
          <Card key={bio.id} className="bg-card/50 border-border/50">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center gap-1">
                <Icon className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted-foreground">{getLabel(bio.type)}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold">{bio.value}</span>
                  <span className="text-xs text-muted-foreground">{bio.unit}</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px] px-1.5 py-0", getValidationColor(bio.validationTier))}
                >
                  {bio.validationTier === 'clinical' ? '✓ Clinical' : 
                   bio.validationTier === 'consumer' ? 'Consumer' : 'Unvalidated'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BiometricsGrid;
