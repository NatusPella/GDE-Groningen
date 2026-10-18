// Spelbot (#186) audio tap, only with ?autoplay: an analyser on whatever reaches an
// AudioContext's destination (rms and peak every 500 ms, for silence and clipping) and a log of
// every buffer source that starts (which sfx play, by buffer length). Run it with
// ?stil&audiograf (scripts/bot/run.mjs --audio), where the whole graph runs into a muted output.
// emit(type, data) writes the replay-log line (playerapi.js).
export function installAudioTap(emit) {
  if (typeof AudioNode === 'undefined' || typeof AudioContext === 'undefined') return false;
  const taps = new Map();
  const origConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    const r = origConnect.call(this, dest, ...rest);
    try {
      const ctx = this.context;
      if (dest === ctx.destination && !(this.__botTap) && !taps.has(ctx)) {
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        an.__botTap = true;
        origConnect.call(this, an);
        taps.set(ctx, { an, buf: new Float32Array(an.fftSize) });
      } else if (dest === ctx.destination && taps.has(ctx) && !this.__botTap) origConnect.call(this, taps.get(ctx).an);
    } catch (e) { /* the tap never breaks the game's audio */ }
    return r;
  };
  const origStart = typeof AudioBufferSourceNode !== 'undefined' && AudioBufferSourceNode.prototype.start;
  if (origStart) {
    AudioBufferSourceNode.prototype.start = function (...a) {
      try { if (this.buffer) emit('sfx', { name: `buf${this.buffer.length}@${this.buffer.sampleRate}`, dur: Math.round(this.buffer.duration * 100) / 100 }); } catch (e) { /* ignore */ }
      return origStart.apply(this, a);
    };
  }
  setInterval(() => {
    for (const { an, buf } of taps.values()) {
      an.getFloatTimeDomainData(buf);
      let sum = 0, peak = 0;
      for (let i = 0; i < buf.length; i++) { const v = Math.abs(buf[i]); sum += v * v; if (v > peak) peak = v; }
      emit('audio', { rms: Math.round(Math.sqrt(sum / buf.length) * 10000) / 10000, peak: Math.round(peak * 1000) / 1000 });
    }
  }, 500);
  return true;
}
