// WebAudio synth for Solmar City — no audio files. Everything is guarded:
// headless or muted runs must never throw.
export function createAudio() {
  const a = { ctx: null, muted: false, engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null, bassTimer: null, bassStep: 0 };
  a.ensure = () => {
    if (a.ctx) { if (a.ctx.state === 'suspended') a.ctx.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      a.ctx = new AC();
      // Engine hum.
      a.engineOsc = a.ctx.createOscillator();
      a.engineOsc.type = 'sawtooth';
      a.engineOsc.frequency.value = 55;
      const filt = a.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 420;
      a.engineGain = a.ctx.createGain();
      a.engineGain.gain.value = 0;
      a.engineOsc.connect(filt); filt.connect(a.engineGain); a.engineGain.connect(a.ctx.destination);
      a.engineOsc.start();
      // Two-tone siren.
      a.sirenOsc = a.ctx.createOscillator();
      a.sirenOsc.type = 'square';
      a.sirenOsc.frequency.value = 720;
      a.sirenGain = a.ctx.createGain();
      a.sirenGain.gain.value = 0;
      a.sirenOsc.connect(a.sirenGain); a.sirenGain.connect(a.ctx.destination);
      a.sirenOsc.start();
      // Lazy bassline loop.
      const notes = [55, 55, 65.41, 49, 55, 58.27, 65.41, 49];
      a.bassTimer = setInterval(() => {
        if (a.muted || !a.ctx || document.hidden) return;
        try {
          const o = a.ctx.createOscillator();
          o.type = 'triangle';
          o.frequency.value = notes[a.bassStep % notes.length];
          const g = a.ctx.createGain();
          g.gain.setValueAtTime(0.05, a.ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, a.ctx.currentTime + 0.42);
          o.connect(g); g.connect(a.ctx.destination);
          o.start(); o.stop(a.ctx.currentTime + 0.45);
          a.bassStep++;
        } catch { /* ignore */ }
      }, 460);
    } catch { a.ctx = null; }
  };
  a.setEngine = (speed01, inCar) => {
    if (!a.ctx || a.muted || !a.engineGain) return;
    try {
      a.engineGain.gain.value = inCar ? 0.028 + speed01 * 0.03 : 0;
      a.engineOsc.frequency.value = 52 + speed01 * 95;
    } catch { /* ignore */ }
  };
  a.setSiren = (on) => {
    if (!a.ctx || !a.sirenGain) return;
    try {
      if (on && !a.muted) {
        a.sirenGain.gain.value = 0.016;
        a.sirenOsc.frequency.value = Math.floor(performance.now() / 380) % 2 === 0 ? 720 : 950;
      } else a.sirenGain.gain.value = 0;
    } catch { /* ignore */ }
  };
  function blip(freq, dur, vol, type = 'square') {
    if (!a.ctx || a.muted) return;
    try {
      const o = a.ctx.createOscillator();
      o.type = type; o.frequency.value = freq;
      const g = a.ctx.createGain();
      g.gain.setValueAtTime(vol, a.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.ctx.currentTime + dur);
      o.connect(g); g.connect(a.ctx.destination);
      o.start(); o.stop(a.ctx.currentTime + dur + 0.02);
    } catch { /* ignore */ }
  }
  function noise(dur, vol) {
    if (!a.ctx || a.muted) return;
    try {
      const len = Math.floor(a.ctx.sampleRate * dur);
      const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = a.ctx.createBufferSource();
      src.buffer = buf;
      const g = a.ctx.createGain();
      g.gain.value = vol;
      src.connect(g); g.connect(a.ctx.destination);
      src.start();
    } catch { /* ignore */ }
  }
  a.shoot = () => noise(0.12, 0.22);
  a.crash = () => { noise(0.25, 0.3); blip(70, 0.2, 0.15, 'sawtooth'); };
  a.pickup = () => { blip(660, 0.1, 0.12, 'sine'); setTimeout(() => blip(990, 0.14, 0.12, 'sine'), 90); };
  a.jingle = () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.18, 0.12, 'sine'), i * 110)); };
  a.busted = () => { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => blip(f, 0.25, 0.14, 'sawtooth'), i * 160)); };
  a.punch = () => noise(0.08, 0.18);
  a.click = () => blip(880, 0.06, 0.08, 'sine');
  a.toggleMute = () => {
    a.muted = !a.muted;
    if (a.engineGain) a.engineGain.gain.value = 0;
    if (a.sirenGain) a.sirenGain.gain.value = 0;
    return a.muted;
  };
  return a;
}
