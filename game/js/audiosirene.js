// #497: de sirene- en hoornstemmen uit audio.js, als eigen module met de WebAudio-context als host-naad.
// Geen wereld, geen DOM: de context, de bestemming (de sirenebus), de pannerfabriek en de lage frequentie
// komen van de aanroeper. Zo kan een test met een nep-context de harmonischen en de keten natrekken.
const golven = new WeakMap();

function golf(ctx, soort) {
  let per = golven.get(ctx);
  if (!per) { per = {}; golven.set(ctx, per); }
  if (per[soort]) return per[soort];
  if (soort === 'sirene') {
    const n = 12, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = k % 2 ? Math.pow(k, -2.2) : 0.06 / (k * k);
    per.sirene = ctx.createPeriodicWave(re, im);
  } else {
    const n = 18, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = Math.pow(k, -0.8) * (k % 2 ? 1 : 0.6);
    per.hoorn = ctx.createPeriodicWave(re, im);
  }
  return per[soort];
}

// NL/EU two-tone "hi-lo" wail: de golf voor de sirene (oneven harmonischen, doffe even).
export const maakSireneWave = (ctx) => golf(ctx, 'sirene');

// Horn discs and siren compression drivers: bright, buzzy harmonic series.
export const maakHoornWave = (ctx) => golf(ctx, 'hoorn');

// Eén gepoolde sirene-stem per nabije politie-eenheid. De keten en de waarden zijn precies die van
// audio.js (filter 1800/0.5, osc op de lage frequentie, gain 0, level 0.7, panner ref 8/0.9).
export function bouwSireneVoice({ ctx, bestemming, maakPanner, laagFrequentie }) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.5;

  const osc = ctx.createOscillator();
  osc.setPeriodicWave(maakSireneWave(ctx));
  osc.frequency.value = laagFrequentie;

  const gain = ctx.createGain();
  gain.gain.value = 0;
  const level = ctx.createGain();
  level.gain.value = 0.7;
  const panner = maakPanner({ ref: 8, rolloff: 0.9, model: 'equalpower' });
  osc.connect(filter).connect(level).connect(gain).connect(panner).connect(bestemming);
  osc.start();

  return { osc, gain, panner, target: null, level: 0, toneHigh: false, nextToggle: Math.random() * 0.6 };
}
