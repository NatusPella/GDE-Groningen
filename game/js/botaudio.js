// Spelbot (#186) audio tap, only with ?autoplay: an analyser on whatever reaches an
// AudioContext's destination (rms and peak, for silence and clipping) and a log of every buffer
// source that starts. The bank in sfx/dsp.js tags its buffers with their sound name, so the tap can
// report "deur" instead of "buf96000@48000"; a sample of the mix is taken right after each start as
// well, so a short effect gets its own level instead of whatever landed on the 500 ms grid
// (scripts/bot/analysis.mjs links those samples back to the effect per game event).
// Run it with ?stil&audiograf (scripts/bot/run.mjs --audio), where the whole graph runs into a
// muted output. emit(type, data) writes the replay-log line (playerapi.js).

// The name of a played buffer: the dsp bank's own name, else the old buffer-length label.
export function sfxLabel(buffer) {
  if (buffer && typeof buffer.__sfx === 'string' && buffer.__sfx) return buffer.__sfx;
  return buffer ? `buf${buffer.length}@${buffer.sampleRate}` : 'buf?';
}

// Round the mix level of every tap: null when there is no tap yet.
function levels(taps) {
  let any = false, rms = 0, peak = 0;
  for (const { an, buf } of taps.values()) {
    any = true;
    an.getFloatTimeDomainData(buf);
    let sum = 0, p = 0;
    for (let i = 0; i < buf.length; i++) { const v = Math.abs(buf[i]); sum += v * v; if (v > p) p = v; }
    rms = Math.max(rms, Math.sqrt(sum / buf.length));
    peak = Math.max(peak, p);
  }
  return any ? { rms: Math.round(rms * 10000) / 10000, peak: Math.round(peak * 1000) / 1000 } : null;
}

export function installAudioTap(emit) {
  if (typeof AudioNode === 'undefined' || typeof AudioContext === 'undefined') return false;
  const taps = new Map();
  let seq = 0; // every start gets a number, so its own sample can be linked to it in the log
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
  const sample = (sfx, n) => {
    const l = levels(taps);
    if (l) emit('audio', { ...l, ...(sfx ? { sfx } : {}), ...(n ? { seq: n } : {}) });
  };
  const origStart = typeof AudioBufferSourceNode !== 'undefined' && AudioBufferSourceNode.prototype.start;
  if (origStart) {
    AudioBufferSourceNode.prototype.start = function (...a) {
      try {
        if (this.buffer) {
          const name = sfxLabel(this.buffer);
          const n = ++seq;
          emit('sfx', { name, dur: Math.round(this.buffer.duration * 100) / 100, seq: n });
          // one sample of the mix while this effect (just) plays: the 500 ms grid misses short sounds
          setTimeout(() => { try { sample(name, n); } catch (e) { /* ignore */ } }, 80);
        }
      } catch (e) { /* ignore */ }
      return origStart.apply(this, a);
    };
  }
  setInterval(() => sample(), 500);
  return true;
}
