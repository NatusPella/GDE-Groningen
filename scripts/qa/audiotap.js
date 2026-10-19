// Pre-script for scripts/qa/visual_issues.mjs --audio (desktop --bench-eval, run as soon as the page loads):
// an analyser on whatever reaches an AudioContext's destination and a log of every buffer source that
// starts, into window.__qaAudio. Needs the audio graph to run, which the driver asks for with
// --audio-graph (the game then plays into a muted output: levels are measured, nothing is heard).
// Same idea as game/js/botaudio.js (the spelbot's tap), kept here so the QA run does not need ?autoplay.
(() => {
  if (window.__qaAudio || typeof AudioNode === 'undefined' || typeof AudioContext === 'undefined') return;
  const log = { rms: [], sfx: [], t0: performance.now() };
  window.__qaAudio = log;
  const taps = new Map();
  const origConnect = AudioNode.prototype.connect;
  const mk = (ctx) => { // block-wise peak and RMS (2048 samples): no timer, so a 0.1 s knock is never missed
    const an = ctx.createScriptProcessor(2048, 1, 1);
    an.onaudioprocess = (e) => {
      const d = e.inputBuffer.getChannelData(0);
      let sum = 0, peak = 0;
      for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); sum += v * v; if (v > peak) peak = v; }
      log.rms.push({ t: Math.round(performance.now() - log.t0), rms: Math.round(Math.sqrt(sum / d.length) * 10000) / 10000, peak: Math.round(peak * 1000) / 1000 });
      if (log.rms.length > 40000) log.rms.shift();
    };
    const z = ctx.createGain(); z.gain.value = 0; z.__qaTap = true; an.__qaTap = true;
    origConnect.call(an, z); origConnect.call(z, ctx.destination);
    return an;
  };
  AudioNode.prototype.connect = function (dest, ...rest) {
    const r = origConnect.call(this, dest, ...rest);
    try {
      const ctx = this.context;
      if (dest === ctx.destination && this.gain && this.gain.value === 0) this.__qaMute = true; // the muted output of ?audiograf
      if (dest && dest.__qaMute && !this.__qaTap) {
        if (!taps.has(ctx)) { taps.set(ctx, { an: mk(ctx) }); }
        origConnect.call(this, taps.get(ctx).an);
      } else if (dest === ctx.destination && !this.__qaTap && !taps.has(ctx) && !this.__qaMute) {
        const an = mk(ctx);
        origConnect.call(this, an);
        taps.set(ctx, { an });
      } else if (dest === ctx.destination && taps.has(ctx) && !this.__qaTap && !this.__qaMute) origConnect.call(this, taps.get(ctx).an);
    } catch (e) { /* never breaks the game's audio */ }
    return r;
  };
  const origStart = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    try { if (this.buffer) log.sfx.push({ t: Math.round(performance.now() - log.t0), len: Math.round(this.buffer.duration * 100) / 100 }); } catch (e) { /* ignore */ }
    return origStart.apply(this, a);
  };
  })();
