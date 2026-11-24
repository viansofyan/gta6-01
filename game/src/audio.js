// Synthesised sound for Solmar City: WebAudio only, no audio files.
// Every call is guarded, so a headless or muted run never throws.
export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    engineOsc: null,
    engineGain: null,
    sirenTimer: null,
    sirenOsc: null,
    sirenGain: null,
    bassTimer: null,
    bassStep: 0,
  };

  audio.ensure = function () {
    try {
      if (!audio.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audio.ctx = new AC();
      }
      if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
      if (!audio.engineOsc) {
        audio.engineOsc = audio.ctx.createOscillator();
        audio.engineOsc.type = 'sawtooth';
        audio.engineOsc.frequency.value = 55;
        audio.engineGain = audio.ctx.createGain();
        audio.engineGain.gain.value = 0;
        const filt = audio.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 320;
        audio.engineOsc.connect(filt);
        filt.connect(audio.engineGain);
        audio.engineGain.connect(audio.ctx.destination);
        audio.engineOsc.start();
      }
      if (!audio.bassTimer) {
        const notes = [55, 55, 65.41, 49, 55, 55, 73.42, 65.41];
        audio.bassTimer = setInterval(() => {
          try {
            if (audio.muted || !audio.ctx) return;
            const osc = audio.ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = notes[audio.bassStep % notes.length];
            const g = audio.ctx.createGain();
            g.gain.value = 0.045;
            osc.connect(g);
            g.connect(audio.ctx.destination);
            osc.start();
            osc.stop(audio.ctx.currentTime + 0.42);
            audio.bassStep++;
          } catch (e) { /* never throw from the loop */ }
        }, 430);
      }
    } catch (e) { /* audio is optional */ }
  };

  audio.setEngine = function (speed01, inCar) {
    try {
      if (!audio.ctx || !audio.engineOsc || !audio.engineGain) return;
      audio.engineGain.gain.value = audio.muted ? 0 : inCar ? 0.02 + speed01 * 0.035 : 0;
      audio.engineOsc.frequency.value = 52 + speed01 * 95;
    } catch (e) {}
  };

  audio.setSiren = function (on) {
    try {
      if (!audio.ctx) return;
      if (on && !audio.sirenTimer) {
        audio.sirenOsc = audio.ctx.createOscillator();
        audio.sirenOsc.type = 'square';
        audio.sirenOsc.frequency.value = 720;
        audio.sirenGain = audio.ctx.createGain();
        audio.sirenGain.gain.value = audio.muted ? 0 : 0.02;
        audio.sirenOsc.connect(audio.sirenGain);
        audio.sirenGain.connect(audio.ctx.destination);
        audio.sirenOsc.start();
        let high = false;
        audio.sirenTimer = setInterval(() => {
          try {
            if (!audio.sirenOsc) return;
            high = !high;
            audio.sirenOsc.frequency.value = high ? 960 : 720;
            if (audio.sirenGain) audio.sirenGain.gain.value = audio.muted ? 0 : 0.02;
          } catch (e) {}
        }, 420);
      } else if (!on && audio.sirenTimer) {
        clearInterval(audio.sirenTimer);
        audio.sirenTimer = null;
        try { audio.sirenOsc.stop(); } catch (e) {}
        audio.sirenOsc = null;
      }
    } catch (e) {}
  };

  function blip(freq, dur, type, vol, slideTo) {
    try {
      if (!audio.ctx || audio.muted) return;
      const osc = audio.ctx.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, audio.ctx.currentTime + dur);
      const g = audio.ctx.createGain();
      g.gain.setValueAtTime(vol, audio.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + dur);
      osc.connect(g);
      g.connect(audio.ctx.destination);
      osc.start();
      osc.stop(audio.ctx.currentTime + dur);
    } catch (e) {}
  }

  function noiseBurst(dur, vol, lowFreq) {
    try {
      if (!audio.ctx || audio.muted) return;
      const len = Math.floor(audio.ctx.sampleRate * dur);
      const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = audio.ctx.createBufferSource();
      src.buffer = buf;
      const filt = audio.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = lowFreq || 1200;
      const g = audio.ctx.createGain();
      g.gain.value = vol;
      src.connect(filt);
      filt.connect(g);
      g.connect(audio.ctx.destination);
      src.start();
    } catch (e) {}
  }

  audio.shot = function () {
    noiseBurst(0.12, 0.22, 2400);
    blip(190, 0.08, 'square', 0.1, 70);
  };
  audio.crash = function () {
    noiseBurst(0.25, 0.3, 420);
    blip(85, 0.22, 'sine', 0.2, 38);
  };
  audio.punch = function () {
    noiseBurst(0.09, 0.18, 700);
  };
  audio.pickup = function () {
    blip(660, 0.1, 'sine', 0.14);
    setTimeout(() => blip(880, 0.14, 'sine', 0.14), 90);
  };
  audio.jingle = function () {
    const seq = [523, 659, 784, 1046];
    seq.forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.16), i * 120));
  };
  audio.busted = function () {
    const seq = [392, 330, 262, 196];
    seq.forEach((f, i) => setTimeout(() => blip(f, 0.4, 'sawtooth', 0.12), i * 180));
  };
  audio.toggleMute = function () {
    audio.muted = !audio.muted;
    try {
      if (audio.engineGain) audio.engineGain.gain.value = 0;
      if (audio.sirenGain) audio.sirenGain.gain.value = 0;
    } catch (e) {}
    return audio.muted;
  };
  return audio;
}
