import { PatternOfLife } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Fingerprint, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatternOfLifeCardProps {
  pol: PatternOfLife;
}

const PatternOfLifeCard = ({ pol }: PatternOfLifeCardProps) => {
  const getAnomalyStatus = (score: number) => {
    if (score < 0.25) return { label: 'Normal', color: 'bg-emerald-500/20 text-emerald-600' };
    if (score < 0.50) return { label: 'Slight Deviation', color: 'bg-yellow-500/20 text-yellow-600' };
    if (score < 0.75) return { label: 'Anomaly Detected', color: 'bg-orange-500/20 text-orange-600' };
    return { label: 'Challenge Required', color: 'bg-red-500/20 text-red-600' };
  };

  const anomalyStatus = getAnomalyStatus(pol.anomalyScore);

  return (
    <Card className="border-none bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Pattern of Life
          </div>
          <Badge className={cn("text-xs", anomalyStatus.color)}>
            {anomalyStatus.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Geo Velocity</p>
              <p className="text-sm font-medium">{pol.geoVelocity.toFixed(1)} mph</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Circadian</p>
              <p className="text-sm font-medium">{(pol.circadianBaseline * 100).toFixed(0)}%</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
            <Fingerprint className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Device</p>
              <p className="text-sm font-medium font-mono text-[10px]">{pol.deviceFingerprint}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
            <AlertTriangle className={cn(
              "w-4 h-4",
              pol.anomalyScore < 0.25 ? "text-emerald-500" :
              pol.anomalyScore < 0.50 ? "text-yellow-500" :
              pol.anomalyScore < 0.75 ? "text-orange-500" : "text-red-500"
            )} />
            <div>
              <p className="text-xs text-muted-foreground">Anomaly</p>
              <p className="text-sm font-medium">{(pol.anomalyScore * 100).toFixed(0)}%</p>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Last verified: {pol.lastUpdate.toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
};

export default PatternOfLifeCard;
