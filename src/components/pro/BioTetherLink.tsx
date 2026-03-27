import { useState, useRef } from 'react';
import { Heart, Activity, Moon } from 'lucide-react';

const BioTetherLink = () => {
  const [linked, setLinked] = useState(false);
  const [dragX, setDragX] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handlePointerDown = () => { dragging.current = true; };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left - 20, rect.width - 44));
    setDragX(x);
    if (x > rect.width - 60) { setLinked(true); dragging.current = false; }
  };
  const handlePointerUp = () => {
    dragging.current = false;
    if (!linked) setDragX(0);
  };

  const streams = [
    { icon: Heart, label: 'Heart Rate', value: '72 bpm', color: 'text-destructive' },
    { icon: Activity, label: 'HRV', value: '48ms', color: 'text-[hsl(178,42%,32%)]' },
    { icon: Moon, label: 'Sleep', value: '7.2h', color: 'text-[hsl(270,60%,50%)]' },
  ];

  return (
    <div className="rounded-2xl border border-white/20 bg-card/60 backdrop-blur-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Bio-Tether Link</h3>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${linked ? 'bg-[hsl(178,42%,32%)]/10 text-[hsl(178,42%,32%)]' : 'bg-muted text-muted-foreground'}`}>
          {linked ? '● LINKED' : '○ UNLINKED'}
        </span>
      </div>

      {/* Data Streams */}
      <div className="grid grid-cols-3 gap-2">
        {streams.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl bg-muted/50 p-3 text-center space-y-1">
              <Icon className={`w-4 h-4 mx-auto ${linked ? s.color : 'text-muted-foreground/40'} ${linked ? 'animate-pulse' : ''}`} />
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className={`text-xs font-semibold ${linked ? 'text-foreground' : 'text-muted-foreground/40'}`}>{linked ? s.value : '—'}</p>
            </div>
          );
        })}
      </div>

      {/* Swipe to Link */}
      {!linked && (
        <div
          ref={trackRef}
          className="relative h-12 rounded-full bg-muted/60 border border-border overflow-hidden select-none touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
            Swipe to Link Bio-Tether →
          </div>
          <div
            className="absolute top-1 left-1 w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg"
            style={{ transform: `translateX(${dragX}px)` }}
            onPointerDown={handlePointerDown}
          >
            <Activity className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      {linked && (
        <p className="text-[10px] text-center text-muted-foreground">
          Privacy Handshake Complete • Data streams encrypted end-to-end
        </p>
      )}
    </div>
  );
};

export default BioTetherLink;
