import { useState, useEffect, useCallback } from 'react';
import { Brain, Eye, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import BioTetherLink from './BioTetherLink';

const RSVP_WORDS = ['FOCUS', 'CLARITY', 'RESOLVE', 'EXECUTE', 'DOMINATE', 'OPTIMIZE', 'TRANSCEND', 'SOVEREIGN'];

const CPMDashboard = () => {
  const [gammaActive, setGammaActive] = useState(false);
  const [rsvpActive, setRsvpActive] = useState(false);
  const [rsvpWord, setRsvpWord] = useState(0);
  const [rsvpSpeed, setRsvpSpeed] = useState(300);

  // RSVP cycling
  useEffect(() => {
    if (!rsvpActive) return;
    const interval = setInterval(() => {
      setRsvpWord((p) => (p + 1) % RSVP_WORDS.length);
    }, rsvpSpeed);
    return () => clearInterval(interval);
  }, [rsvpActive, rsvpSpeed]);

  const biometrics = [
    { label: 'Alpha Power', value: '12.4 µV²', status: 'elevated' },
    { label: 'Theta/Beta', value: '0.82', status: 'optimal' },
    { label: 'Gamma Band', value: gammaActive ? '42 Hz' : '—', status: gammaActive ? 'active' : 'standby' },
    { label: 'Focus Score', value: '87/100', status: 'high' },
    { label: 'Stress Index', value: '0.34', status: 'low' },
    { label: 'Recovery %', value: '78%', status: 'good' },
  ];

  return (
    <div className="p-4 pb-24 space-y-4 animate-fade-in relative">
      {/* 40Hz Gamma Flicker Overlay */}
      {gammaActive && (
        <div className="fixed inset-0 z-40 pointer-events-none animate-[gamma-flicker_25ms_linear_infinite] bg-[hsl(28,80%,55%)]/5" />
      )}

      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(28,80%,55%)] to-[hsl(28,80%,45%)] flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-sm">Cognitive Performance</h2>
          <p className="text-[10px] text-muted-foreground">IDIA Life Pro+</p>
        </div>
      </div>

      <BioTetherLink />

      {/* Biometric Grid */}
      <div className="rounded-2xl border border-white/20 bg-card/60 backdrop-blur-xl p-4">
        <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-[hsl(28,80%,55%)]" />
          Cognitive Biometrics
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {biometrics.map((b) => (
            <div key={b.label} className="rounded-lg bg-muted/50 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">{b.label}</p>
              <p className="text-xs font-semibold text-foreground">{b.value}</p>
              <span className={`text-[9px] ${b.status === 'active' ? 'text-[hsl(28,80%,55%)]' : b.status === 'optimal' || b.status === 'high' ? 'text-[hsl(142,71%,45%)]' : 'text-muted-foreground'}`}>
                {b.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Gamma Trigger */}
      <div className="rounded-2xl border border-white/20 bg-card/60 backdrop-blur-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${gammaActive ? 'text-[hsl(28,80%,55%)] animate-pulse' : 'text-muted-foreground'}`} />
            <div>
              <h3 className="text-xs font-semibold text-foreground">40Hz Gamma Trigger</h3>
              <p className="text-[10px] text-muted-foreground">Neural entrainment stimulation</p>
            </div>
          </div>
          <Switch checked={gammaActive} onCheckedChange={setGammaActive} />
        </div>
        {gammaActive && (
          <p className="text-[10px] text-[hsl(28,80%,55%)] animate-pulse">
            ⚡ Flashbulb Mode Active — 40Hz visual entrainment engaged
          </p>
        )}
      </div>

      {/* RSVP Memory Anchoring */}
      <div className="rounded-2xl border border-white/20 bg-card/60 backdrop-blur-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[hsl(28,80%,55%)]" />
            <div>
              <h3 className="text-xs font-semibold text-foreground">Memory Anchoring RSVP</h3>
              <p className="text-[10px] text-muted-foreground">Rapid Serial Visual Presentation</p>
            </div>
          </div>
          <Button
            size="sm"
            variant={rsvpActive ? 'destructive' : 'default'}
            className="text-xs h-7"
            onClick={() => setRsvpActive(!rsvpActive)}
          >
            {rsvpActive ? 'Stop' : 'Start'}
          </Button>
        </div>

        {rsvpActive && (
          <div className="flex flex-col items-center py-6">
            <div className="text-3xl font-black text-foreground tracking-wider transition-all duration-75">
              {RSVP_WORDS[rsvpWord]}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-[10px] text-muted-foreground">Speed:</span>
              {[500, 300, 150].map((s) => (
                <button
                  key={s}
                  className={`text-[10px] px-2 py-0.5 rounded ${rsvpSpeed === s ? 'bg-[hsl(28,80%,55%)] text-white' : 'bg-muted text-muted-foreground'}`}
                  onClick={() => setRsvpSpeed(s)}
                >
                  {s}ms
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes gamma-flicker {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CPMDashboard;
