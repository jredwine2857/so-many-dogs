// Procedurally synthesized trait sounds — no audio files, so there's
// nothing to download and the page stays tiny. Every sound is built from
// oscillators and filtered noise via the Web Audio API.

type Voice = { stop: number };

const MAX_CONCURRENT_VOICES = 6;
// The town is 2500px wide and the viewport shows ~1000px of it, so a range
// much tighter than this means characters you can plainly see make no sound.
const HEARING_RANGE = 1100;

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
      case "cooking food": return this.cooking(out, t0);
      case "scolding people": return this.scold(out, t0);
      case "turning into a monkey and eating bananas": return this.monkey(out, t0);
      case "asking Hey a bunch": return this.hey(out, t0);
      case "running a marathon": return this.running(out, t0);
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

  /**
   * Formant synthesis — the reason a shout reads as a human voice rather
   * than a buzzing sawtooth. A vocal source is fed through parallel bandpass
   * filters tuned to vowel resonances; those peaks are what the ear decodes
   * as "a person made this". Roughly the vowel of "ah".
   */
  private voice(
    out: AudioNode,
    t: number,
    opts: {
      dur: number;
      f0: number[]; // pitch contour, spread evenly across the duration
      formants: [number, number][]; // [frequency, relative gain]
      gain: number;
      vibrato?: number;
      breath?: number;
    }
  ) {
    const ctx = this.ctx!;
    const { dur, f0, formants, gain, vibrato = 0, breath = 0 } = opts;

    const src = ctx.createOscillator();
    src.type = "sawtooth";
    src.frequency.setValueAtTime(f0[0], t);
    f0.slice(1).forEach((freq, i) => {
      src.frequency.linearRampToValueAtTime(freq, t + (dur * (i + 1)) / (f0.length - 1));
    });

    if (vibrato > 0) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 5.5;
      lfoGain.gain.value = vibrato;
      lfo.connect(lfoGain).connect(src.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }

    // Shared amplitude envelope for the whole voice.
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.05);
    env.gain.setValueAtTime(gain, t + dur * 0.65);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    env.connect(out);

    formants.forEach(([freq, amp]) => {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = 9;
      const g = ctx.createGain();
      g.gain.value = amp;
      src.connect(bp).connect(g).connect(env);
    });

    if (breath > 0) {
      const n = ctx.createBufferSource();
      n.buffer = this.noise!;
      n.loop = true;
      const nf = ctx.createBiquadFilter();
      nf.type = "bandpass";
      nf.frequency.value = 1800;
      nf.Q.value = 1.2;
      const ng = ctx.createGain();
      ng.gain.value = breath;
      n.connect(nf).connect(ng).connect(env);
      n.start(t);
      n.stop(t + dur + 0.05);
    }

    src.start(t);
    src.stop(t + dur + 0.05);
    return src;
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
    // A bite is three things happening in ~120ms: a sharp crunch transient, a
    // wet squish as the jaw closes, and a soft lip smack. The previous version
    // was only the crunch, which is why it read as static rather than eating.
    // Timing is deliberately irregular — evenly spaced bites sound mechanical.
    const ctx = this.ctx!;
    let at = t;

    for (let i = 0; i < 5; i++) {
      // 1. crunch: broadband transient, very short
      this.noiseBurst(at, 0.045, out, "bandpass", 1100 + Math.random() * 700, 0.9, 0.9);

      // 2. squish: resonant lowpass sweeping downward = the jaw closing
      const n = ctx.createBufferSource();
      n.buffer = this.noise!;
      n.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(1500, at + 0.02);
      lp.frequency.exponentialRampToValueAtTime(260, at + 0.13);
      lp.Q.value = 7; // resonance is what makes it sound wet
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.75, at + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
      n.connect(lp).connect(g).connect(out);
      n.start(at + 0.02);
      n.stop(at + 0.2);

      // 3. lip smack on some bites, high and brief
      if (i % 2 === 1) {
        this.noiseBurst(at + 0.1, 0.03, out, "highpass", 2600, 0.7, 0.5);
      }

      at += 0.15 + Math.random() * 0.11;
    }
    return at - t + 0.2;
  }

  private yell(out: GainNode, t: number, intensity: number) {
    // "HEY!" — a real shout, via formant synthesis. The pitch leaps up on the
    // attack then falls away, and the vowel formants are what make it read as
    // a voice instead of a buzzer.
    const base = 230 * intensity;
    this.voice(out, t, {
      dur: 0.55,
      f0: [base * 0.85, base * 1.45, base * 1.25, base * 0.8],
      // "ah" vowel, pushed up slightly for a strained/shouted quality
      formants: [
        [780 * intensity, 1.0],
        [1250 * intensity, 0.7],
        [2800, 0.32],
        [3600, 0.16],
      ],
      gain: 0.85 * intensity,
      vibrato: 7,
      breath: 0.1,
    });

    // A second shorter syllable makes it sound like someone actually
    // hollering at you rather than a single held note.
    this.voice(out, t + 0.72, {
      dur: 0.34,
      f0: [base * 1.15, base * 1.35, base * 0.95],
      formants: [
        [700 * intensity, 1.0],
        [1150 * intensity, 0.65],
        [2650, 0.28],
      ],
      gain: 0.7 * intensity,
      vibrato: 9,
      breath: 0.09,
    });

    return 1.2;
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
    // Three sung notes on an "ah". Same formant model as the yell, but
    // gentler and in tune — a sine would have sounded like a test tone.
    const notes = [392, 440, 523];
    notes.forEach((freq, i) => {
      this.voice(out, t + i * 0.42, {
        dur: 0.4,
        f0: [freq * 0.99, freq, freq * 1.005],
        formants: [
          [730, 1.0],
          [1090, 0.6],
          [2440, 0.25],
        ],
        gain: 0.95,
        vibrato: 6,
        breath: 0.04,
      });
    });
    return 1.5;
  }

  private whine(out: GainNode, t: number) {
    // "pleeeease" — a child's whine: higher pitch, a big rise-and-fall, and
    // heavy vibrato for the wobble that makes it read as pleading.
    this.voice(out, t, {
      dur: 0.9,
      f0: [430, 640, 600, 400],
      // "eh"-ish vowel: closer to a whine than the open "ah" of a shout
      formants: [
        [560, 1.0],
        [1900, 0.75],
        [2600, 0.3],
      ],
      gain: 0.62,
      vibrato: 16,
      breath: 0.05,
    });
    return 1.15;
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

  private cooking(out: GainNode, t: number) {
    // Sizzle: sustained band-limited noise, plus a couple of pan clatters.
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 4200;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.25);
    g.gain.setValueAtTime(0.5, t + 1.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    src.connect(bp).connect(g).connect(out);
    src.start(t);
    src.stop(t + 1.7);

    // metal on metal
    this.osc("triangle", 900, t + 0.5, 0.09, out, 0.16);
    this.osc("triangle", 1350, t + 0.56, 0.07, out, 0.11);
    this.osc("triangle", 780, t + 1.15, 0.1, out, 0.13);
    return 1.7;
  }

  private scold(out: GainNode, t: number) {
    // Three clipped, falling syllables — the cadence of "do not DO that".
    // Lower and tighter than a yell: telling off, not shouting across a street.
    const syllables = [
      { at: 0, dur: 0.2, f0: [300, 250] },
      { at: 0.28, dur: 0.18, f0: [280, 235] },
      { at: 0.54, dur: 0.34, f0: [330, 260, 210] },
    ];
    syllables.forEach((s) => {
      this.voice(out, t + s.at, {
        dur: s.dur,
        f0: s.f0,
        formants: [
          [620, 1.0],
          [1180, 0.7],
          [2500, 0.25],
        ],
        gain: 0.72,
        vibrato: 3,
        breath: 0.05,
      });
    });
    return 1.1;
  }

  private monkey(out: GainNode, t: number) {
    // "ooh ooh ah ah" — hooting is a high, narrow "oo" formant; the closing
    // calls open out to "ah" and drop in pitch.
    const calls = [
      { at: 0, dur: 0.16, f0: [520, 700, 620], formants: [[380, 1.0], [900, 0.4]] },
      { at: 0.24, dur: 0.16, f0: [560, 760, 660], formants: [[400, 1.0], [950, 0.4]] },
      { at: 0.52, dur: 0.22, f0: [420, 330], formants: [[760, 1.0], [1300, 0.6], [2600, 0.2]] },
      { at: 0.8, dur: 0.22, f0: [400, 300], formants: [[730, 1.0], [1250, 0.6], [2500, 0.2]] },
    ];
    calls.forEach((c) => {
      this.voice(out, t + c.at, {
        dur: c.dur,
        f0: c.f0,
        formants: c.formants as [number, number][],
        gain: 0.75,
        vibrato: 10,
        breath: 0.06,
      });
    });
    return 1.2;
  }

  private hey(out: GainNode, t: number) {
    // "Hey!... hey!... hey?" — same word three times, the last one lilting up
    // because she has not got an answer yet.
    const calls = [
      { at: 0, f0: [340, 420, 380] },
      { at: 0.5, f0: [330, 410, 370] },
      { at: 1.0, f0: [320, 400, 470] }, // rising = questioning
    ];
    calls.forEach((c) => {
      // breathy "h" onset before the vowel
      this.noiseBurst(t + c.at, 0.05, out, "highpass", 2200, 0.7, 0.22);
      this.voice(out, t + c.at + 0.03, {
        dur: 0.26,
        f0: c.f0,
        // "eh" as in hey
        formants: [
          [590, 1.0],
          [1840, 0.7],
          [2500, 0.25],
        ],
        gain: 0.7,
        vibrato: 5,
        breath: 0.05,
      });
    });
    return 1.5;
  }

  private running(out: GainNode, t: number) {
    // Footfalls on pavement plus breathing, deliberately out of step with
    // each other — runners breathe roughly every other stride, and locking
    // them together sounds like a machine rather than a person.
    const ctx = this.ctx!;
    const stride = 0.31;

    for (let i = 0; i < 5; i++) {
      const at = t + i * stride;
      // heel strike: short low thud with a fast pitch drop
      const { o } = this.osc("sine", 150, at, 0.09, out, 0.42);
      o.frequency.exponentialRampToValueAtTime(58, at + 0.08);
      // grit of shoe on road
      this.noiseBurst(at, 0.06, out, "bandpass", 2400, 1.1, 0.3);
    }

    // two breaths across the same span, offset from the footfalls
    [0.16, 0.78].forEach((offset, i) => {
      const at = t + offset;
      const n = ctx.createBufferSource();
      n.buffer = this.noise!;
      n.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(i === 0 ? 700 : 520, at);
      bp.frequency.linearRampToValueAtTime(i === 0 ? 1300 : 380, at + 0.3);
      bp.Q.value = 1.6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(0.5, at + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.34);
      n.connect(bp).connect(g).connect(out);
      n.start(at);
      n.stop(at + 0.4);
    });

    return 1.7;
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
