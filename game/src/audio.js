// Synthesised sound only: every effect is built from oscillators, so
// the game ships no audio files. Each call is guarded, so a headless or
// muted run never throws.
let audioCtx = null;
let muted = false;
let bassTimer = null;
let engineNodes = null;

function ctx() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(freq, dur, type, vol, slideTo) {
  try {
    const ac = ctx();
    if (!ac || muted) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.15, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  } catch {
    // Sound never breaks the game.
  }
}

function noiseBurst(dur, vol, low) {
  try {
    const ac = ctx();
    if (!ac || muted) return;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low || 900;
    const gain = ac.createGain();
    gain.gain.value = vol || 0.3;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start();
  } catch {
    // Sound never breaks the game.
  }
}

export const sound = {
  get muted() {
    return muted;
  },
  toggleMute() {
    muted = !muted;
    if (muted) this.stopBass();
    return muted;
  },
  unlock() {
    ctx();
  },
  shot() {
    noiseBurst(0.12, 0.35, 2400);
    tone(190, 0.1, 'square', 0.12, 60);
  },
  crash() {
    noiseBurst(0.25, 0.4, 500);
    tone(90, 0.25, 'sawtooth', 0.14, 40);
  },
  pickup() {
    tone(660, 0.12, 'sine', 0.16);
    setTimeout(() => tone(990, 0.18, 'sine', 0.16), 90);
  },
  jingle() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => setTimeout(() => tone(n, 0.22, 'triangle', 0.16), i * 110));
  },
  busted() {
    const notes = [392, 311, 233, 175];
    notes.forEach((n, i) => setTimeout(() => tone(n, 0.35, 'sawtooth', 0.12), i * 160));
  },
  punch() {
    noiseBurst(0.08, 0.25, 700);
  },
  sirenBlip() {
    tone(720, 0.3, 'sine', 0.05, 980);
    setTimeout(() => tone(980, 0.3, 'sine', 0.05, 720), 300);
  },
  engineStart() {
    tone(70, 0.5, 'sawtooth', 0.1, 140);
  },
  startBass() {
    try {
      const ac = ctx();
      if (!ac || muted || bassTimer) return;
      const roots = [55, 55, 65.4, 49];
      let step = 0;
      bassTimer = setInterval(() => {
        if (muted) return;
        tone(roots[step % roots.length], 0.5, 'triangle', 0.05);
        step++;
      }, 500);
    } catch {
      // Sound never breaks the game.
    }
  },
  stopBass() {
    if (bassTimer) {
      clearInterval(bassTimer);
      bassTimer = null;
    }
  },
  setEngine(running, speed) {
    try {
      const ac = ctx();
      if (!ac || muted) return;
      if (running && !engineNodes) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 60;
        gain.gain.value = 0.02;
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start();
        engineNodes = { osc, gain };
      }
      if (engineNodes) {
        if (!running) {
          engineNodes.osc.stop();
          engineNodes = null;
        } else {
          engineNodes.osc.frequency.value = 55 + Math.abs(speed) * 0.14;
          engineNodes.gain.gain.value = 0.015 + Math.abs(speed) * 0.00004;
        }
      }
    } catch {
      // Sound never breaks the game.
    }
  },
};
