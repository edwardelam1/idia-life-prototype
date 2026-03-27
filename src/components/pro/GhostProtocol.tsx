import { useState, useEffect, ReactNode } from 'react';
import { Shield, TrendingUp, DollarSign, Activity } from 'lucide-react';

interface GhostProtocolProps {
  children: ReactNode;
}

const GhostProtocol = ({ children }: GhostProtocolProps) => {
  const [duressDetected, setDuressDetected] = useState(false);

  // Simulated duress detection (HR delta + motion monitoring)
  useEffect(() => {
    // In production: monitor HR delta > +30bpm with zero accelerometer motion
    // For demo: expose a keyboard shortcut (Ctrl+Shift+G) to toggle
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        setDuressDetected((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (duressDetected) {
    return (
      <div className="p-4 pb-24 space-y-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-muted to-muted flex items-center justify-center">
            <Shield className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">Dashboard</h2>
            <p className="text-[10px] text-muted-foreground">Overview</p>
          </div>
        </div>

        {/* Honey-pot fake dashboard */}
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <h3 className="text-xs text-muted-foreground">Weekly Summary</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: TrendingUp, label: 'Steps', value: '8,432' },
              { icon: Activity, label: 'Active Min', value: '45' },
              { icon: DollarSign, label: 'Earned', value: '$2.15' },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="rounded-lg bg-muted/50 p-3 text-center">
                  <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  <p className="text-sm font-semibold text-foreground">{m.value}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">No recent activity to display.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default GhostProtocol;
