// Vinahouse tự chế bằng WebAudio — 138 BPM, kick "tùng tùng", bass nảy offbeat,
// clap, hat, lead "tò te" có delay, riser + zap trước drop. ~60 giây một lượt.
// Cũng phát được file nhạc thật (mp3 trong thư mục music/) và dò beat để pet nhún theo.

const BPM = 138;
const STEP = 60 / BPM / 4;                     // 16th note
// i–VI–III–VII in A minor: Am F C G (root midi)
const PROG = [45, 41, 48, 43];
const LEAD = [ // 32 steps = 2 bars, midi or -1
  81, -1, 81, 84, -1, 81, 79, -1, 76, -1, 79, 81, -1, -1, 84, 86,
  88, -1, 86, 84, -1, 81, 79, -1, 81, -1, -1, -1, 76, -1, 79, -1,
];
const LEAD_B = [
  81, -1, 81, 84, -1, 81, 79, -1, 76, -1, 79, 81, -1, -1, 79, 76,
  74, -1, 76, -1, 79, -1, 81, -1, 84, -1, 81, -1, 79, 76, 74, -1,
];
// sections: [name, bars]
const ARR = [['intro', 4], ['build', 4], ['drop', 16], ['break', 4], ['build2', 2], ['drop2', 8]];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Vinahouse {
  constructor() { this.ctx = null; this.playing = false; this.onBeat = null; this.onEnd = null; }

  _setup(volume) {
    const ctx = this.ctx = new AudioContext();
    this.master = ctx.createGain(); this.master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.12;
    this.master.connect(comp).connect(ctx.destination);
    // sidechained bus for bass + lead + stabs
    this.duck = ctx.createGain(); this.duck.connect(this.master);
    // delay for lead
    this.delay = ctx.createDelay(1); this.delay.delayTime.value = STEP * 3;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3500;
    this.delay.connect(dlp).connect(fb).connect(this.delay);
    const dOut = ctx.createGain(); dOut.gain.value = 0.35;
    this.delay.connect(dOut).connect(this.duck);
    // short room for clap
    this.room = ctx.createConvolver(); this.room.buffer = this._ir(1.1);
    const rOut = ctx.createGain(); rOut.gain.value = 0.25; this.room.connect(rOut).connect(this.master);
    this.noise = this._noiseBuf();
    // distortion curve for kick
    this.shaper = ctx.createWaveShaper();
    const c = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(x * 2.2); }
    this.shaper.curve = c; this.shaper.connect(this.master);
  }

  _noiseBuf() {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 1, this.ctx.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  _ir(sec) {
    const sr = this.ctx.sampleRate, b = this.ctx.createBuffer(2, sr * sec, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    }
    return b;
  }

  // ------------------------------------------------------------ voices
  kick(t, amp = 1) {
    const { ctx } = this;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.45);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.05 * amp, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g).connect(this.shaper); o.start(t); o.stop(t + 0.55);
    // click
    const n = ctx.createBufferSource(), ng = ctx.createGain(), hp = ctx.createBiquadFilter();
    n.buffer = this.noise; hp.type = 'highpass'; hp.frequency.value = 2500;
    ng.gain.setValueAtTime(0.25 * amp, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    n.connect(hp).connect(ng).connect(this.master); n.start(t); n.stop(t + 0.03);
    // sidechain duck
    const d = this.duck.gain;
    d.cancelScheduledValues(t); d.setValueAtTime(0.25, t); d.linearRampToValueAtTime(1, t + STEP * 3);
  }
  clap(t, amp = 0.6) {
    const { ctx } = this;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.9;
    const g = ctx.createGain();
    for (let k = 0; k < 3; k++) {
      const n = ctx.createBufferSource(); n.buffer = this.noise;
      const gg = ctx.createGain(); const tt = t + k * 0.011;
      gg.gain.setValueAtTime(amp, tt); gg.gain.exponentialRampToValueAtTime(0.001, tt + (k === 2 ? 0.2 : 0.03));
      n.connect(gg).connect(bp); n.start(tt); n.stop(tt + 0.25);
    }
    bp.connect(g).connect(this.master); bp.connect(this.room);
  }
  hat(t, open, amp = 0.22) {
    const { ctx } = this;
    const n = ctx.createBufferSource(); n.buffer = this.noise;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = open ? 7000 : 9000;
    const g = ctx.createGain(); const len = open ? 0.16 : 0.035;
    g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    n.connect(hp).connect(g).connect(this.master); n.start(t); n.stop(t + len + 0.02);
  }
  bass(t, midi, cutoff = 900, amp = 0.5) {
    const { ctx } = this;
    const f = mtof(midi);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6;
    lp.frequency.setValueAtTime(cutoff * 2.2, t); lp.frequency.exponentialRampToValueAtTime(cutoff * 0.35, t + STEP * 1.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + STEP * 1.8);
    for (const det of [-9, 9]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      // "boing": a tiny pitch dive, the vinahouse bounce
      o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
      o.connect(lp); o.start(t); o.stop(t + STEP * 2);
    }
    const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = f / 2;
    const sg = ctx.createGain(); sg.gain.setValueAtTime(amp * 0.8, t); sg.gain.exponentialRampToValueAtTime(0.001, t + STEP * 1.8);
    sub.connect(sg).connect(this.duck); sub.start(t); sub.stop(t + STEP * 2);
    lp.connect(g).connect(this.duck);
  }
  lead(t, midi, amp = 0.16) {
    const { ctx } = this;
    const f = mtof(midi);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
    lp.frequency.setValueAtTime(7000, t); lp.frequency.exponentialRampToValueAtTime(1400, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    for (const det of [-18, -6, 6, 18]) {
      const o = ctx.createOscillator(); o.type = det % 12 === 0 ? 'square' : 'sawtooth';
      o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + 0.36);
    }
    lp.connect(g); g.connect(this.duck); g.connect(this.delay);
  }
  stab(t, root, amp = 0.09) {
    const third = root === 45 ? 15 : 16;            // Am minor, F/C/G major
    for (const iv of [12, third, 19, 24]) this.lead(t, root + iv, amp);
  }
  riser(t, dur) {
    const { ctx } = this;
    const n = ctx.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2;
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(9000, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.35, t + dur);
    g.gain.setValueAtTime(0, t + dur + 0.01);
    n.connect(bp).connect(g).connect(this.master); n.start(t); n.stop(t + dur + 0.05);
  }
  zap(t) {
    const { ctx } = this;
    const o = ctx.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(2400, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.35);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.4);
  }

  // ------------------------------------------------------------ sequencer
  _plan() {
    const steps = [];
    let bar = 0;
    for (const [name, bars] of ARR) {
      for (let b = 0; b < bars; b++, bar++) {
        for (let s = 0; s < 16; s++) steps.push({ bar, b, s, name, last: b === bars - 1 });
      }
    }
    return steps;
  }

  _step(ev, t) {
    const { s, b, name, last } = ev;
    const root = PROG[ev.bar % 4];
    const drop = name.startsWith('drop');
    const build = name.startsWith('build');
    const kickOn = s % 4 === 0 && !(build && last) && name !== 'break';
    if (kickOn) this.kick(t);
    if (name === 'break' && s === 0) this.kick(t, 0.6);
    if ((drop || name === 'intro') && (s === 4 || s === 12)) this.clap(t, drop ? 0.6 : 0.35);
    if (s % 4 === 2) this.hat(t, true, drop ? 0.22 : 0.15);
    else if (s % 2 === 1) this.hat(t, false, 0.1);
    // bass: the rolling offbeat "tung tung" after every kick
    if ((drop || name === 'intro' || (build && !last)) && (s % 4 === 2 || s % 4 === 3)) {
      const oct = s % 4 === 3 ? 12 : 0;
      this.bass(t, root + oct, name === 'intro' ? 420 : 900, name === 'intro' ? 0.38 : 0.5);
    }
    if (build) {
      // snare roll that speeds up
      const every = b === 0 ? 4 : b === 1 ? 2 : 1;
      if (s % every === 0) this.clap(t, 0.12 + (s / 16) * 0.25 + b * 0.05);
      if (s % 4 === 2) this.stab(t, root);
      if (b === 0 && s === 0) this.riser(t, STEP * 16 * (name === 'build' ? 4 : 2));
    }
    if (name === 'break') {
      if (s % 4 === 2) this.stab(t, root, 0.07);
      const ph = LEAD[(ev.bar % 2) * 16 + s];
      if (ph > 0 && s % 2 === 0) this.lead(t, ph - 12, 0.08);
    }
    if (drop) {
      if (b === 0 && s === 0) this.zap(t);
      const phrase = (ev.bar % 4 < 2) ? LEAD : LEAD_B;
      const n = phrase[(ev.bar % 2) * 16 + s];
      if (n > 0) this.lead(t, n);
    }
  }

  start(volume = 0.9) {
    if (this.playing) return;
    this._setup(volume);
    this.playing = true;
    this.steps = this._plan();
    this.i = 0;
    this.t0 = this.ctx.currentTime + 0.12;
    this.events = [];
    const tick = () => {
      if (!this.playing) return;
      const ahead = this.ctx.currentTime + 0.15;
      while (this.i < this.steps.length && this.t0 + this.i * STEP < ahead) {
        const ev = this.steps[this.i], t = this.t0 + this.i * STEP;
        this._step(ev, t);
        this.events.push({ t, ...ev });
        this.i++;
      }
      if (this.i >= this.steps.length && this.ctx.currentTime > this.t0 + this.i * STEP + 0.6) {
        this.stop(true); return;
      }
      this.timer = setTimeout(tick, 25);
    };
    tick();
  }

  // Called from the render loop: returns beats that have just sounded.
  poll() {
    if (!this.playing) return [];
    const now = this.ctx.currentTime, out = [];
    while (this.events.length && this.events[0].t <= now) out.push(this.events.shift());
    return out;
  }

  stop(natural = false) {
    if (!this.playing) return;
    this.playing = false;
    clearTimeout(this.timer);
    const ctx = this.ctx;
    try {
      this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      setTimeout(() => ctx.close(), 400);
    } catch {}
    this.onEnd && this.onEnd(natural);
  }
}

// Plays a real track from music/ and detects kicks from its low band.
export class TrackPlayer {
  constructor() { this.playing = false; this.onEnd = null; }
  start(file, volume = 0.9, maxSec = 75) {
    this.audio = new Audio('file:///' + file.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:'));
    this.audio.volume = volume;
    this.ctx = new AudioContext();
    const src = this.ctx.createMediaElementSource(this.audio);
    this.an = this.ctx.createAnalyser(); this.an.fftSize = 1024;
    src.connect(this.an); this.an.connect(this.ctx.destination);
    this.buf = new Uint8Array(this.an.frequencyBinCount);
    this.avg = 0; this.lastBeat = 0; this.n = 0;
    // start somewhere in the first third so it's not always the intro
    this.audio.addEventListener('loadedmetadata', () => {
      if (this.audio.duration > 120) this.audio.currentTime = Math.random() * this.audio.duration * 0.3;
    }, { once: true });
    this.audio.addEventListener('ended', () => this.stop(true));
    this.audio.play().catch(() => this.stop(true));
    this.playing = true;
    this.cut = setTimeout(() => this.fadeOut(), maxSec * 1000);
  }
  poll() {
    if (!this.playing) return [];
    this.an.getByteFrequencyData(this.buf);
    let e = 0; for (let i = 1; i < 6; i++) e += this.buf[i];
    e /= 5;
    this.avg = this.avg * 0.92 + e * 0.08;
    const now = performance.now();
    const detected = e > this.avg * 1.18 && e > 120 && now - this.lastBeat > 280;
    // file:// media can be CORS-silenced for the analyser → fall back to a 128 BPM pulse
    const ghost = !detected && now - this.lastBeat > 1500 && now - (this.lastGhost || 0) > 469;
    if (detected || ghost) {
      if (detected) this.lastBeat = now; else this.lastGhost = now;
      this.n++;
      return [{ s: 0, name: 'drop', bar: Math.floor(this.n / 4), b: 0 }];
    }
    return [];
  }
  fadeOut() {
    if (!this.playing) return;
    const a = this.audio; let v = a.volume;
    const iv = setInterval(() => { v -= 0.05; if (v <= 0) { clearInterval(iv); this.stop(true); } else a.volume = v; }, 80);
  }
  stop(natural = false) {
    if (!this.playing) return;
    this.playing = false; clearTimeout(this.cut);
    try { this.audio.pause(); this.ctx.close(); } catch {}
    this.onEnd && this.onEnd(natural);
  }
}

// No audio in-app: dances to a 138 BPM ghost clock (YouTube mode).
export class GhostClock {
  constructor() { this.playing = false; }
  start(_f, _v, sec = 60) {
    this.playing = true; this.t0 = performance.now(); this.n = 0;
    this.cut = setTimeout(() => this.stop(true), sec * 1000);
  }
  poll() {
    if (!this.playing) return [];
    const k = Math.floor((performance.now() - this.t0) / (STEP * 4000));
    const out = [];
    while (this.n <= k) { out.push({ s: (this.n % 4) * 4, name: 'drop', bar: Math.floor(this.n / 4), b: 0 }); this.n++; }
    return out;
  }
  stop(natural = false) {
    if (!this.playing) return;
    this.playing = false; clearTimeout(this.cut); this.onEnd && this.onEnd(natural);
  }
}
