// Original sound for Kota Senja: everything is synthesised with WebAudio,
// no audio files, no licensed music. A soft sunset bassline, engine hum,
// siren, pickup blip, gunshot and mission chime. Starts only after the
// player first interacts, so browsers allow it. M mutes.
export function createAudio() {
  let ctx = null, master = null, muted = false, musicTimer = null;
  let engineOsc = null, engineGain = null;
  const notes = [110, 130.81, 164.81, 196, 220, 164.81, 130.81, 98];
  let noteIndex = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
      engineGain = ctx.createGain(); engineGain.gain.value = 0; engineOsc.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      musicTimer = window.setInterval(() => {
        if (muted || !ctx) return;
        const o = ctx.createOscillator(); o.type = 'triangle';
        o.frequency.value = notes[noteIndex % notes.length]; noteIndex += 1;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.12, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 0.95);
      }, 480);
      return true;
    } catch { return false; }
  }

  function blip(freq, dur, type, vol) {
    if (!ensure() || muted) return;
    const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.35; return muted; },
    get muted() { return muted; },
    pickup() { blip(880, 0.15, 'sine', 0.25); blip(1320, 0.2, 'sine', 0.18); },
    shot() { blip(180, 0.08, 'square', 0.25); },
    punch() { blip(120, 0.1, 'square', 0.2); },
    chime() { blip(523, 0.25, 'sine', 0.25); blip(784, 0.35, 'sine', 0.25); },
    siren(on) {
      if (!ensure()) return;
      if (!on) { if (engineGain) engineGain.gain.value = 0; return; }
      // Two-tone siren: alternate the engine oscillator up and down.
      const t = ctx.currentTime;
      engineOsc.frequency.setValueAtTime(660, t);
      engineOsc.frequency.setValueAtTime(520, t + 0.4);
    },
    engine(speed01) {
      if (!ensure() || muted) return;
      if (engineGain) engineGain.gain.value = 0.02 + speed01 * 0.05;
      if (engineOsc) engineOsc.frequency.value = 55 + speed01 * 90;
    },
  };
}
