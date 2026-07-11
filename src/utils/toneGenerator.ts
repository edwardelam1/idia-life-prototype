/**
 * Lightweight Web Audio tone generator for the splash sequence.
 *
 * Plays a soft 40Hz sine with quiet 80Hz + 120Hz harmonic reinforcement so
 * the tone is actually audible on phone speakers (which can't reproduce
 * pure sub-bass). Purely additive — silently no-ops if the browser blocks
 * audio (e.g. iOS Safari before a user gesture).
 */
export class SplashTone {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private stopped = false;

  async start(volume = 0.05) {
    if (this.ctx || this.stopped) return;
    try {
      const AC: typeof AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch { /* ignore */ }
      }
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      // Fundamental + harmonics so the tone carries on tiny speakers.
      const layers: Array<{ freq: number; gain: number }> = [
        { freq: 40, gain: 1.0 },
        { freq: 80, gain: 0.35 },
        { freq: 120, gain: 0.18 },
      ];

      for (const { freq, gain } of layers) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = gain;
        osc.connect(g).connect(master);
        osc.start();
        this.oscillators.push(osc);
      }

      // Smooth fade-in so it never "pops" on.
      const now = ctx.currentTime;
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(volume, now + 0.6);

      this.ctx = ctx;
      this.master = master;
    } catch {
      /* silently no-op — visuals must not be affected */
    }
  }

  fadeOut(durationMs = 1200) {
    if (!this.ctx || !this.master) return;
    try {
      const now = this.ctx.currentTime;
      const end = now + durationMs / 1000;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0.0001, end);
      window.setTimeout(() => this.stop(), durationMs + 60);
    } catch { /* ignore */ }
  }

  stop() {
    this.stopped = true;
    try {
      this.oscillators.forEach((o) => { try { o.stop(); } catch { /* ignore */ } });
      this.oscillators = [];
      if (this.ctx) {
        this.ctx.close().catch(() => {});
        this.ctx = null;
        this.master = null;
      }
    } catch { /* ignore */ }
  }
}
