// De lange synthetische voertuigstemmen van audio.js: de motor van het verkeer,
// de helikopter, de vroege weerkaatsing langs de gevels, het schrapen langs een
// muur, de slip van de banden en de rammel van de wielen (allemaal oscillatoren
// en ruis, geen opname). Wat ze uit de audiograaf nodig hebben komt via
// setVehicleVoices(): zo importeert dit bestand niets terug uit audio.js en
// blijft de module-cyclus op 0. Verder is dit een verplaatsing: dezelfde namen,
// dezelfde volgorde, dezelfde commentaren.

let ctx = null;
let noiseBuffer = null;
let makePanner = null;
let trafficBus = null;
let engineBus = null;
let sfxBus = null;

export function setVehicleVoices(deps) {
  ({ ctx, noiseBuffer, makePanner, trafficBus, engineBus, sfxBus } = deps);
}

function buildEngineVoice() {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 40;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const panner = makePanner({ ref: 4, rolloff: 1.3, model: 'equalpower' });
  osc.connect(filter).connect(gain).connect(panner).connect(trafficBus);
  osc.start();
  return { osc, filter, gain, panner, target: null, level: 0 };
}

function buildHeliVoice() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  const chop = ctx.createGain();
  chop.gain.value = 0.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 11;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.5;
  lfo.connect(lfoDepth).connect(chop.gain);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const panner = makePanner({ ref: 12, rolloff: 0.8, model: 'equalpower' });
  src.connect(filter).connect(chop).connect(gain).connect(panner).connect(trafficBus);
  src.start();
  lfo.start();
  return { gain, panner };
}

// Two short, darkened slap-backs off the facades, cross-fed L/R; level
// follows how built-up the street is. Subtle by design.
function buildEarlyReflections() {
  const input = ctx.createGain();
  const level = ctx.createGain();
  level.gain.value = 0;
  const split = ctx.createChannelSplitter(2);
  const merge = ctx.createChannelMerger(2);
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2200;
  input.connect(tone).connect(split);
  [[0, 1, 0.011], [1, 0, 0.017]].forEach(([from, to, time]) => {
    const d = ctx.createDelay(0.05);
    d.delayTime.value = time;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    split.connect(d, from).connect(g).connect(merge, 0, to);
  });
  merge.connect(level).connect(engineBus);
  return { input, level };
}

// Soft, dull scrape while a vehicle slides along a wall or another car; fed
// by collision contacts, fades once they stop.
function buildScrapeVoice() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 650;
  band.Q.value = 0.9;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const panner = makePanner({ ref: 5, rolloff: 1.1, model: 'equalpower' });
  src.connect(band).connect(lp).connect(gain);
  gain.connect(panner).connect(sfxBus);
  src.start();
  return { band, gain, panner, level: 0, target: 0, until: 0, fresh: true };
}

function buildSquealVoice() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1300;
  band.Q.value = 9;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = 1100;
  const oscGain = ctx.createGain();
  oscGain.gain.value = 0.12;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const panner = makePanner({ ref: 6, rolloff: 1, model: 'equalpower' });
  src.connect(band).connect(gain);
  osc.connect(oscGain).connect(gain);
  gain.connect(panner).connect(sfxBus);
  src.start();
  osc.start();
  return { band, osc, gain, panner, level: 0, target: null, fresh: true, loop: null };
}

function buildRumbleVoice() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 200;
  filter.Q.value = 0.8;
  const am = ctx.createGain();
  am.gain.value = 1;
  const lfo = ctx.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 20;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0;
  lfo.connect(lfoDepth).connect(am.gain);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(filter).connect(am).connect(gain).connect(sfxBus);
  src.start();
  lfo.start();
  return { filter, am, lfo, lfoDepth, gain };
}

export { buildEngineVoice, buildHeliVoice, buildEarlyReflections, buildScrapeVoice, buildSquealVoice, buildRumbleVoice };
