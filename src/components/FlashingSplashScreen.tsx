import { useState, useEffect, useRef } from 'react';
import polishedLogo from '@/assets/IDIA_Life_Logo_Polished.png';
import splashVideo from '@/assets/splash-rush.mp4.asset.json';

interface FlashingSplashScreenProps {
  onComplete: () => void;
}

const FlashingSplashScreen = ({ onComplete }: FlashingSplashScreenProps) => {
  const [phase, setPhase] = useState<'video' | 'logo' | 'white'>('video');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Phase 1: Video plays (0–3200ms)
    // Phase 2: Logo emerges (3200–3600ms)
    const t1 = setTimeout(() => setPhase('logo'), 3200);
    // Phase 3: White fade (3600–3900ms)
    const t2 = setTimeout(() => setPhase('white'), 3600);
    // Complete
    const t3 = setTimeout(() => onComplete(), 3900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden touch-none cursor-pointer bg-white"
      onClick={onComplete}
      onTouchStart={onComplete}
      role="button"
      aria-label="Skip splash"
    >
      {/* Milky fluid background (fallback while video buffers) */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(255,250,245,1) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(245,240,255,1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 80%, rgba(250,248,240,1) 0%, transparent 50%),
            linear-gradient(135deg, #faf8f5 0%, #f0ebe6 25%, #e8e4e0 50%, #f5f0ec 75%, #faf8f5 100%)
          `,
          animation: 'milkyShift 8s ease-in-out infinite',
        }}
      />

      {/* Rushing splash video */}
      <video
        ref={videoRef}
        src={splashVideo.url}
        autoPlay
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in"
        style={{
          opacity: phase === 'video' ? 1 : 0,
        }}
      />

      {/* Logo emerging */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-all duration-[800ms] ease-out"
        style={{
          opacity: phase === 'logo' || phase === 'white' ? 1 : 0,
          transform: phase === 'logo' || phase === 'white' ? 'scale(1)' : 'scale(0.3)',
          filter: phase === 'logo' || phase === 'white' ? 'blur(0px)' : 'blur(8px)',
        }}
      >
        <img
          src={polishedLogo}
          alt="IDIA Life"
          className="w-24 h-24 rounded-3xl shadow-2xl"
        />
      </div>

      {/* White fade-out overlay */}
      <div
        className="absolute inset-0 bg-white transition-opacity duration-[900ms] ease-in pointer-events-none"
        style={{
          opacity: phase === 'white' ? 1 : 0,
        }}
      />

      <style>{`
        @keyframes milkyShift {
          0%, 100% { background-position: 0% 0%, 100% 0%, 50% 100%, 0% 0%; }
          50% { background-position: 60% 40%, 30% 80%, 80% 20%, 100% 0%; }
        }
      `}</style>
    </div>
  );
};

export default FlashingSplashScreen;
