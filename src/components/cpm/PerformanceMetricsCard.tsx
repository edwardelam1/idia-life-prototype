import { PerformanceMetric } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceMetricsCardProps {
  metrics: PerformanceMetric[];
}

const PerformanceMetricsCard = ({ metrics }: PerformanceMetricsCardProps) => {
  const getCategoryColor = (category: PerformanceMetric['category']) => {
    switch (category) {
      case 'cognitive': return 'bg-purple-500';
      case 'physical': return 'bg-blue-500';
      case 'recovery': return 'bg-emerald-500';
      case 'occupational': return 'bg-amber-500';
    }
  };

  const getCategoryLabel = (category: PerformanceMetric['category']) => {
    switch (category) {
      case 'cognitive': return 'Cognitive';
      case 'physical': return 'Physical';
      case 'recovery': return 'Recovery';
      case 'occupational': return 'Work';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-4 h-4 text-primary" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map((metric) => {
          const progress = (metric.value / metric.target) * 100;
          const isOnTarget = metric.value >= metric.target;
          
          return (
            <div key={metric.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", getCategoryColor(metric.category))} />
                  <span className="text-sm font-medium">{metric.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "text-sm font-bold",
                    isOnTarget ? "text-emerald-500" : "text-muted-foreground"
                  )}>
                    {metric.value}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {metric.target} {metric.unit}
                  </span>
                  {isOnTarget && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                </div>
              </div>
              <Progress 
                value={Math.min(progress, 100)} 
                className="h-1.5"
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default PerformanceMetricsCard;
