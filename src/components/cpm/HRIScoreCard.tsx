import { HRIScore } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HRIScoreCardProps {
  hriScore: HRIScore;
}

const HRIScoreCard = ({ hriScore }: HRIScoreCardProps) => {
  const getStatusColor = (status: HRIScore['status']) => {
    switch (status) {
      case 'optimal': return 'text-emerald-500';
      case 'good': return 'text-green-500';
      case 'moderate': return 'text-yellow-500';
      case 'low': return 'text-orange-500';
      case 'critical': return 'text-red-500';
    }
  };

  const getScoreRingColor = (score: number) => {
    if (score >= 80) return 'stroke-emerald-500';
    if (score >= 60) return 'stroke-green-500';
    if (score >= 40) return 'stroke-yellow-500';
    if (score >= 20) return 'stroke-orange-500';
    return 'stroke-red-500';
  };

  const TrendIcon = hriScore.trend === 'up' ? TrendingUp : 
                   hriScore.trend === 'down' ? TrendingDown : Minus;

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (hriScore.score / 100) * circumference;

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30 border-none shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-primary" />
          Human Reliability Index
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
              />
              <circle
                cx="64"
                cy="64"
                r="45"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn("transition-all duration-1000", getScoreRingColor(hriScore.score))}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{hriScore.score}</span>
              <span className="text-xs text-muted-foreground">HRI Score</span>
            </div>
          </div>
          
          <div className="flex-1 ml-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-medium capitalize", getStatusColor(hriScore.status))}>
                {hriScore.status}
              </span>
              <TrendIcon className={cn(
                "w-4 h-4",
                hriScore.trend === 'up' ? 'text-emerald-500' :
                hriScore.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
              )} />
            </div>
            <p className="text-xs text-muted-foreground">
              Last updated: {hriScore.lastUpdated.toLocaleTimeString()}
            </p>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Inputs:</p>
              <p>Sleep · HRV · Reaction Time</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HRIScoreCard;
