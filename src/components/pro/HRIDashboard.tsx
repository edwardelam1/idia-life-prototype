import { useState, useEffect } from 'react';
import { Gauge, TrendingUp, Clock, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import BioTetherLink from './BioTetherLink';

const HRIDashboard = () => {
  const [hriScore, setHriScore] = useState(72);

  // Simulate HRI fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setHriScore((prev) => {
        const next = Math.max(10, Math.min(100, prev + (Math.random() - 0.52) * 8));
        return Math.round(next);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Low Cognitive Battery alert
  useEffect(() => {
    if (hriScore < 30) {
      toast({
        title: '⚠️ Low Cognitive Battery',
        description: `HRI at ${hriScore}%. Consider rest or recovery activities.`,
        variant: 'destructive',
      });
    }
  }, [hriScore]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'hsl(142, 71%, 45%)';
    if (score >= 40) return 'hsl(28, 80%, 55%)';
    return 'hsl(0, 84%, 60%)';
  };

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (hriScore / 100) * circumference;

  const metrics = [
    { icon: TrendingUp, label: 'Focus Index', value: '84%', trend: '+3%' },
    { icon: Clock, label: 'Recovery Time', value: '4.2h', trend: '-0.5h' },
    { icon: Zap, label: 'Peak Hours', value: '9AM-1PM', trend: 'Stable' },
    { icon: Gauge, label: 'Gig Score', value: '91/100', trend: '+5' },
  ];

  return (
    <div className="p-4 pb-24 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] flex items-center justify-center">
          <Gauge className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-sm">Workforce Optimization</h2>
          <p className="text-[10px] text-muted-foreground">IDIA Life Pro</p>
        </div>
      </div>

      <BioTetherLink />

      {/* HRI Gauge */}
      <div className="rounded-2xl border border-white/20 bg-card/60 backdrop-blur-xl p-6 flex flex-col items-center">
        <p className="text-xs text-muted-foreground mb-4">Human Reliability Index</p>
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={getScoreColor(hriScore)}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{hriScore}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: getScoreColor(hriScore) }}>
          {hriScore >= 70 ? 'Optimal Performance' : hriScore >= 40 ? 'Moderate — Rest Recommended' : 'Low Battery — Recovery Needed'}
        </p>
      </div>

      {/* Gig Performance Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-xl border border-white/20 bg-card/60 backdrop-blur-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-[hsl(178,42%,32%)]" />
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{m.value}</p>
              <p className="text-[10px] text-[hsl(178,42%,32%)]">{m.trend}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HRIDashboard;
