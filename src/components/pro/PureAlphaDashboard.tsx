import { Zap, TrendingUp, Moon, DollarSign } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import BioTetherLink from './BioTetherLink';
import GhostProtocol from './GhostProtocol';
import SovereignAuth from './SovereignAuth';
import { useState } from 'react';

const fusionData = [
  { day: 'Mon', hrv: 62, sleepLatency: 12, revenue: 4200 },
  { day: 'Tue', hrv: 58, sleepLatency: 18, revenue: 3800 },
  { day: 'Wed', hrv: 71, sleepLatency: 8, revenue: 5100 },
  { day: 'Thu', hrv: 45, sleepLatency: 25, revenue: 2900 },
  { day: 'Fri', hrv: 68, sleepLatency: 11, revenue: 4700 },
  { day: 'Sat', hrv: 74, sleepLatency: 7, revenue: 5400 },
  { day: 'Sun', hrv: 80, sleepLatency: 5, revenue: 6100 },
];

const PureAlphaDashboard = () => {
  const [authVerified, setAuthVerified] = useState(false);

  if (!authVerified) {
    return <SovereignAuth onVerified={() => setAuthVerified(true)} />;
  }

  return (
    <GhostProtocol>
      <div className="p-4 pb-24 space-y-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(270,60%,50%)] to-[hsl(270,60%,35%)] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">Executive Sovereignty</h2>
            <p className="text-[10px] text-muted-foreground">Pure Alpha</p>
          </div>
        </div>

        <BioTetherLink />

        {/* P&L Fusion Dashboard */}
        <div className="rounded-2xl border border-white/20 bg-card/60 backdrop-blur-xl p-4">
          <h3 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[hsl(270,60%,50%)]" />
            P&L Fusion Dashboard
          </h3>
          <p className="text-[10px] text-muted-foreground mb-4">Bio-state × Financial Performance Correlation</p>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={fusionData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis yAxisId="bio" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                <YAxis yAxisId="financial" orientation="right" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Bar yAxisId="financial" dataKey="revenue" fill="hsl(270, 60%, 50%)" opacity={0.3} radius={[4, 4, 0, 0]} name="Revenue ($)" />
                <Line yAxisId="bio" dataKey="hrv" stroke="hsl(178, 42%, 32%)" strokeWidth={2} dot={{ r: 3 }} name="HRV (ms)" />
                <Line yAxisId="bio" dataKey="sleepLatency" stroke="hsl(28, 80%, 55%)" strokeWidth={2} dot={{ r: 3 }} name="Sleep Latency (min)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: TrendingUp, label: 'HRV Avg', value: '65ms', color: 'text-[hsl(178,42%,32%)]' },
            { icon: Moon, label: 'Sleep Score', value: '84/100', color: 'text-[hsl(270,60%,50%)]' },
            { icon: DollarSign, label: 'Week Rev', value: '$32.2K', color: 'text-[hsl(28,80%,55%)]' },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="rounded-xl border border-white/20 bg-card/60 backdrop-blur-xl p-3 text-center">
                <Icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
                <p className="text-sm font-bold text-foreground">{m.value}</p>
              </div>
            );
          })}
        </div>

        {/* Correlation Insight */}
        <div className="rounded-2xl border border-[hsl(270,60%,50%)]/20 bg-[hsl(270,60%,50%)]/5 backdrop-blur-xl p-4">
          <p className="text-xs font-semibold text-foreground mb-1">🧬 Correlation Insight</p>
          <p className="text-[11px] text-muted-foreground">
            Your revenue peaks correlate with HRV &gt; 65ms and sleep latency &lt; 10min. 
            Thursday's dip aligns with your lowest HRV reading. Consider scheduling high-stakes 
            decisions on days with optimal bio-metrics.
          </p>
        </div>
      </div>
    </GhostProtocol>
  );
};

export default PureAlphaDashboard;
