// Procedurally synthesized trait sounds — no audio files, so there's
// nothing to download and the page stays tiny. Every sound is built from
// oscillators and filtered noise via the Web Audio API.

type Voice = { stop: number };

const MAX_CONCURRENT_VOICES = 6;
const HEARING_RANGE = 780; // px; past this a character is inaudible

export class TraitAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private voices: Voice[] = [];
  private muted = false;
  private unlocked = false;

  constructor() {
    // Browsers refuse to start audio until the user interacts with the page.
    const unlock = () => this.unlock();
    window.addEventListener("pointerdown", unlock, { once: false });
    window.addEventListener("keydown", unlock, { once: false });
  }

  private unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoiseBuffer(this.ctx);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.unlocked = true;
  }

  get isMuted() {
    return this.muted;
  }

  get isReady() {
    return this.unlocked && !!this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  private makeNoiseBuffer(ctx: AudioContext) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /**
   * Play the sound for a trait, attenuated and panned by where the character
   * is relative to the listener. `dx` is the horizontal offset from the
   * local player, `distance` the straight-line distance.
   */
  play(trait: string, distance: number, dx: number) {
    if (this.muted || !this.ctx || !this.master || !this.noise) return;
    if (distance > HEARING_RANGE) return;

    const now = this.ctx.currentTime;
    this.voices = this.voices.filter((v) => v.stop > now);
    if (this.voices.length >= MAX_CONCURRENT_VOICES) return;

    const falloff = Math.pow(Math.max(0, 1 - distance / HEARING_RANGE), 1.6);
    if (falloff <= 0.01) return;

    const out = this.ctx.createGain();
    out.gain.value = falloff;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, dx / (HEARING_RANGE * 0.7)));
    out.connect(panner).connect(this.master);

    const duration = this.render(trait, out, now);
    this.voices.push({ stop: now + duration });
    window.setTimeout(() => out.disconnect(), (duration + 0.4) * 1000);
  }

  private render(trait: string, out: GainNode, t0: number): number {
    switch (trait) {
      case "sleeping": return this.snore(out, t0);
      case "chewing really loud": return this.chew(out, t0);
      case "yelling": return this.yell(out, t0, 1);
      case "yelling at anyone who is nearby": return this.yell(out, t0, 1.18);
      case "busy working out": return this.workout(out, t0);
      case "sucking on her toe": return this.slurp(out, t0);
      case "making TikTok videos": return this.tiktok(out, t0);
      case "singing": return this.singing(out, t0);
      case "begging for ice cream": return this.whine(out, t0);
      case "working at the Dairy Bar": return this.iceCreamJingle(out, t0);
      case "playing video games": return this.videoGame(out, t0);
      case "getting drunk": return this.hiccup(out, t0);
      default: return 0;
    }
  }

  // --- building blocks ----------------------------------------------------

  private osc(type: OscillatorType, freq: number, t: number, dur: number, out: AudioNode, peak = 0.3) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
    return { o, g };
  }

  private noiseBurst(t: number, dur: number, out: AudioNode, filter: BiquadFilterType, freq: number, q: number, peak = 0.3) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t);
    src.stop(t + dur + 0.05);
    return { src, f, g };
  }

  // --- the sounds ---------------------------------------------------------

  private snore(out: GainNode, t: number) {
    // rattly inhale, softer exhale
    const { o, g } = this.osc("sawtooth", 68, t, 0.85, out, 0.22);
    o.frequency.linearRampToValueAtTime(96, t + 0.5);
    o.frequency.linearRampToValueAtTime(58, t + 0.85);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.85);
    this.noiseBurst(t, 0.8, out, "lowpass", 420, 1, 0.12);
    this.osc("sine", 52, t + 1.0, 0.5, out, 0.1);
    return 1.6;
  }

  private chew(out: GainNode, t: number) {
    // Wet, crunchy, open-mouthed — this is Jane's whole bit, so it needs to
    // carry. A wide filter keeps the noise energy that a narrow bandpass eats.
    for (let i = 0; i < 5; i++) {
      const at = t + i * 0.17;
      this.noiseBurst(at, 0.11, out, "bandpass", 1300 + Math.random() * 800, 1.1, 0.95);
      this.noiseBurst(at + 0.03, 0.08, out, "lowpass", 700, 1, 0.6);
      this.osc("triangle", 120 + Math.random() * 40, at, 0.07, out, 0.18);
    }
    return 1.0;
  }

  private yell(out: GainNode, t: number, intensity: number) {
    const base = 240 * intensity;
    const { o } = this.osc("sawtooth", base, t, 0.62, out, 0.26 * intensity);
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.5, t + 0.12);
    o.frequency.linearRampToValueAtTime(base * 0.85, t + 0.62);
    // vowel-ish formant
    this.noiseBurst(t, 0.6, out, "bandpass", 900 * intensity, 6, 0.2);
    this.osc("square", base * 2, t + 0.02, 0.5, out, 0.07);
    return 0.9;
  }

  private workout(out: GainNode, t: number) {
    for (let i = 0; i < 3; i++) {
      const at = t + i * 0.55;
      const { o } = this.osc("sawtooth", 150, at, 0.3, out, 0.2);
      o.frequency.linearRampToValueAtTime(95, at + 0.3);
      this.noiseBurst(at, 0.34, out, "lowpass", 900, 1, 0.16);
    }
    return 1.8;
  }

  private slurp(out: GainNode, t: number) {
    const { f, g } = this.noiseBurst(t, 0.55, out, "bandpass", 500, 2.5, 0.85);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.85, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    const { o } = this.osc("sine", 180, t + 0.1, 0.4, out, 0.09);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.5);
    return 0.8;
  }

  private tiktok(out: GainNode, t: number) {
    // phone shutter, then a bouncy hook
    this.noiseBurst(t, 0.05, out, "highpass", 3000, 1, 0.25);
    const notes = [659, 784, 880, 784, 1046];
    notes.forEach((f, i) => this.osc("square", f, t + 0.14 + i * 0.13, 0.12, out, 0.12));
    return 1.0;
  }

  private singing(out: GainNode, t: number) {
    // three sustained notes with vibrato
    const ctx = this.ctx!;
    const notes = [392, 440, 523];
    notes.forEach((freq, i) => {
      const at = t + i * 0.42;
      const { o } = this.osc("sine", freq, at, 0.4, out, 0.2);
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 5.5;
      lfoGain.gain.value = 5;
      lfo.connect(lfoGain).connect(o.frequency);
      lfo.start(at);
      lfo.stop(at + 0.45);
      this.osc("triangle", freq * 2, at, 0.38, out, 0.05);
    });
    return 1.5;
  }

  private whine(out: GainNode, t: number) {
    // pleading, rising-then-falling "pleeease"
    const { o } = this.osc("triangle", 420, t, 0.85, out, 0.22);
    o.frequency.setValueAtTime(420, t);
    o.frequency.linearRampToValueAtTime(620, t + 0.35);
    o.frequency.linearRampToValueAtTime(390, t + 0.85);
    const ctx = this.ctx!;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 7;
    lfoGain.gain.value = 18;
    lfo.connect(lfoGain).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + 0.9);
    return 1.1;
  }

  private iceCreamJingle(out: GainNode, t: number) {
    // tinny ice cream truck melody
    const notes = [523, 659, 784, 659, 523, 587];
    notes.forEach((f, i) => {
      const at = t + i * 0.19;
      this.osc("square", f, at, 0.17, out, 0.13);
      this.osc("square", f * 2, at, 0.14, out, 0.05);
    });
    return 1.4;
  }

  private videoGame(out: GainNode, t: number) {
    // 8-bit arpeggio + coin
    const arp = [392, 523, 659, 784];
    arp.forEach((f, i) => this.osc("square", f, t + i * 0.08, 0.08, out, 0.13));
    const { o } = this.osc("square", 988, t + 0.42, 0.28, out, 0.14);
    o.frequency.setValueAtTime(988, t + 0.42);
    o.frequency.setValueAtTime(1319, t + 0.5);
    return 0.9;
  }

  private hiccup(out: GainNode, t: number) {
    // hic! then a woozy slide
    const { o } = this.osc("triangle", 300, t, 0.12, out, 0.26);
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(760, t + 0.06);
    o.frequency.exponentialRampToValueAtTime(240, t + 0.12);
    const { o: o2 } = this.osc("sine", 260, t + 0.3, 0.7, out, 0.16);
    o2.frequency.linearRampToValueAtTime(180, t + 1.0);
    const ctx = this.ctx!;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 3.2;
    lfoGain.gain.value = 22;
    lfo.connect(lfoGain).connect(o2.frequency);
    lfo.start(t + 0.3);
    lfo.stop(t + 1.05);
    return 1.3;
  }
}
