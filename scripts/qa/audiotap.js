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
  AudioNode.prototype.connect = function (dest, ...rest) {
    const r = origConnect.call(this, dest, ...rest);
    try {
      const ctx = this.context;
      if (dest === ctx.destination && this.gain && this.gain.value === 0) this.__qaMute = true; // the muted output of ?audiograf
      if (dest && dest.__qaMute && !this.__qaTap) {
        if (!taps.has(ctx)) { const an = ctx.createAnalyser(); an.fftSize = 1024; an.__qaTap = true; taps.set(ctx, { an, buf: new Float32Array(an.fftSize) }); }
        origConnect.call(this, taps.get(ctx).an);
      } else if (dest === ctx.destination && !this.__qaTap && !taps.has(ctx) && !this.__qaMute) {
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        an.__qaTap = true;
        origConnect.call(this, an);
        taps.set(ctx, { an, buf: new Float32Array(an.fftSize) });
      } else if (dest === ctx.destination && taps.has(ctx) && !this.__qaTap && !this.__qaMute) origConnect.call(this, taps.get(ctx).an);
    } catch (e) { /* never breaks the game's audio */ }
    return r;
  };
  const origStart = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    try { if (this.buffer) log.sfx.push({ t: Math.round(performance.now() - log.t0), len: Math.round(this.buffer.duration * 100) / 100 }); } catch (e) { /* ignore */ }
    return origStart.apply(this, a);
  };
  setInterval(() => {
    for (const { an, buf } of taps.values()) {
      an.getFloatTimeDomainData(buf);
      let sum = 0, peak = 0;
      for (let i = 0; i < buf.length; i++) { const v = Math.abs(buf[i]); sum += v * v; if (v > peak) peak = v; }
      log.rms.push({ t: Math.round(performance.now() - log.t0), rms: Math.round(Math.sqrt(sum / buf.length) * 10000) / 10000, peak: Math.round(peak * 1000) / 1000 });
      if (log.rms.length > 4000) log.rms.shift();
    }
  }, 250);
})();
