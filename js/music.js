'use strict';
// Background music, synthesised live with Web Audio: a tanpura drone plus a soft tabla-style keherwa groove.
// Original and royalty-free by construction (no samples). Each world has its own root note and tempo.

const MUSIC_THEMES = {
  mumbai: { root: 138.59, bpm: 96 },     // C#
  delhi: { root: 146.83, bpm: 88 },      // D
  rajasthan: { root: 110.0, bpm: 100 },  // A
  kerala: { root: 164.81, bpm: 84 },     // E
  himalaya: { root: 123.47, bpm: 74 },   // B
  up: { root: 174.61, bpm: 80 },         // F
  uttarakhand: { root: 155.56, bpm: 76 }, // D#
  chandigarh: { root: 130.81, bpm: 104 }, // C
  goa: { root: 196.0, bpm: 92 },          // G
  gujarat: { root: 185.0, bpm: 108 },     // F#, garba tempo
  punjab: { root: 116.54, bpm: 112 },     // A#, bhangra tempo
  karnataka: { root: 233.08, bpm: 94 },   // A#
  tamilnadu: { root: 220.0, bpm: 100 },   // A
  telangana: { root: 196.0, bpm: 90 },    // G
  andhra: { root: 246.94, bpm: 98 },      // B
  andaman: { root: 207.65, bpm: 86 },     // G#
  kashmir: { root: 103.83, bpm: 72 },     // G#, low and slow
  ladakh: { root: 98.0, bpm: 70 },        // G
};
// keherwa, one bol per eighth note: dha ge na ti | na ka dhi na
const KEHERWA = ['dha', 'ge', 'na', 'ti', 'na', 'ka', 'dhi', 'na'];

const Music = {
  ctx: null, out: null, noise: null, timer: null, nextT: 0, step: 0, theme: 'mumbai', level: 0,

  // Called every frame by the game loop. Starts lazily once the browser allows audio.
  update(actx, enabled, theme) {
    if (!actx) return;
    if (!this.ctx) this.attach(actx);
    if (MUSIC_THEMES[theme]) this.theme = theme;
    const target = enabled ? 0.32 : 0;
    if (target !== this.level) {
      this.level = target;
      this.out.gain.setTargetAtTime(target, actx.currentTime, 0.4);
    }
    if (enabled && !this.timer) {
      this.nextT = actx.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 100);
    } else if (!enabled && this.timer && this.ctx.currentTime > this.nextT + 1) {
      clearInterval(this.timer); this.timer = null;
    }
  },

  attach(actx) {
    this.ctx = actx;
    this.out = actx.createGain();
    this.out.gain.value = 0;
    this.out.connect(actx.destination);
    const buf = actx.createBuffer(1, actx.sampleRate * 0.2, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  },

  schedule() {
    const { root, bpm } = MUSIC_THEMES[this.theme], eighth = 60 / bpm / 2;
    while (this.nextT < this.ctx.currentTime + 0.3) {
      const t = this.nextT, s = this.step % 16;
      // tanpura cycle over two bars: Pa (below), Sa, Sa, Sa (low)
      if (s % 4 === 0) this.pluck([root * 0.75, root, root, root / 2][s / 4], t);
      this.bol(KEHERWA[s % 8], t, root, s < 8 ? 1 : 0.85);
      this.nextT += eighth;
      this.step++;
    }
  },

  pluck(freq, t) {
    const c = this.ctx, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    for (const detune of [-6, 5]) {          // two slightly detuned strings give the tanpura shimmer
      const o = c.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = detune;
      o.connect(f); o.start(t); o.stop(t + 2.7);
    }
    f.connect(g).connect(this.out);
  },

  bol(name, t, root, accent) {
    const bass = name === 'dha' || name === 'ge' || name === 'dhi';
    const ring = name === 'dha' || name === 'na' || name === 'dhi';
    if (bass) this.drum(90, 58, 0.32, 0.22 * accent, t);                 // bayan: pitch-bending low thump
    if (ring) this.drum(root * 4, root * 3.96, 0.16, 0.07 * accent, t);  // dayan: tuned ring
    if (name === 'ti' || name === 'ka') this.click(0.035 * accent, t);
  },

  drum(f0, f1, dur, vol, t) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t); o.stop(t + dur + 0.02);
  },

  click(vol, t) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise;
    f.type = 'highpass'; f.frequency.value = 2500;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f).connect(g).connect(this.out);
    s.start(t); s.stop(t + 0.06);
  },
};
