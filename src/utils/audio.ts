// Web Audio API Sound Synthesizer for Backgammon

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    const saved = localStorage.getItem('bg_muted');
    this.isMuted = saved === 'true';
  }

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('bg_muted', String(muted));
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // Wooden dice roll / rattle effect
  public playDiceRoll() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // 3 subtle rapid clicks followed by a wooden rattle
      for (let i = 0; i < 4; i++) {
        const time = now + i * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140 + Math.random() * 80, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.05);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800 + Math.random() * 400, time);
        filter.Q.setValueAtTime(2.5, time);

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.06);
      }
    } catch {
      // AudioContext handling safety
    }
  }

  // Tactile wood checker pickup / selection click (unified wood click)
  public playCheckerPickup() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Soft natural wooden tap when selecting or lifting a piece
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Audio safety
    }
  }

  // Tactile wood checker piece drop / placement / tap (identical for both players)
  public playCheckerMove() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Solid walnut body resonance (warm, crisp wood drop)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1500, now);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.06);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.075);

      // Subtle felt cushion resonance
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(110, now);
      osc2.frequency.exponentialRampToValueAtTime(55, now + 0.05);

      gain2.gain.setValueAtTime(0.2, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc2.start(now);
      osc2.stop(now + 0.06);
    } catch {
      // Audio safety
    }
  }

  // Knocking / hitting an opponent blot (crisp wooden drop + bounce, unified with drop sound)
  public playHit() {
    if (this.isMuted) return;
    try {
      // Plays the unified drop sound
      this.playCheckerMove();
    } catch {
      // Audio safety
    }
  }

  // Bearing off a checker (unified wood drop with subtle bearoff resonance)
  public playBearOff() {
    if (this.isMuted) return;
    try {
      // Plays the unified wood drop sound
      this.playCheckerMove();
    } catch {
      // Audio safety
    }
  }

  // Victory fanfare
  public playWin() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const time = now + idx * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.36);
      });
    } catch {
      // Audio safety
    }
  }

  // Defeat chime
  public playDefeat() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const notes = [392.0, 349.23, 329.63, 261.63]; // G4, F4, E4, C4
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const time = now + idx * 0.16;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.32);
      });
    } catch {
      // Audio safety
    }
  }

  // Gentle UI Click (warm, organic subtle wood tap)
  public playClick() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.035);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Audio safety
    }
  }
}

export const sound = new SoundManager();
