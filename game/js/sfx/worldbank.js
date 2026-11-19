// Wereld-foley die ontbrak (SFX-GAPS, groep c): hengelen (uitwerpen, beet, vangst, ontsnapt), uit het water
// klimmen en een hapje bij de horeca, plus de omgevingslagen per streek (groep d: kust, polder, riet,
// industrie). Alles procedureel uit de bouwstenen van dsp.js, geen opname. Puur gegevens, net als
// uibank.js: fxbank.js zet ze in de bank en in FX_INFO (de eenmalige geluiden) en ambience.js speelt de
// lagen (BED_FX). De eenmalige klanken hebben twee of drie varianten met een eigen zaad; ze gaan als
// `fx`-gebeurtenis door dezelfde weg als de rest (afstand, luchtfilter, spraakdemping, afkoeltijd).
import { dspKit } from './dsp.js';

const { addNoiseBurst: nb, addPartials, addTone, thump, bq } = dspKit;
const TAU = Math.PI * 2;

const defs = {};
const add = (name, info, dur, gen, opts = {}) => { defs[name] = { info, dur, gen, opts }; };
const varianten = (base, label, info, dur, shifts, gen) => {
  shifts.forEach((sh, i) => add(`${base}_${i}`, { ...info, label: `${label} (${String.fromCharCode(65 + i)})` }, dur, (c, sr, R) => gen(c[0], sr, R, Math.pow(2, sh / 12))));
};

// --- hengelen -------------------------------------------------------------------------------------------

// uitwerpen: de lijn zingt door de lucht en het dobbertje plopt in het water, met twee kringen
varianten('hengel_uitwerp', 'Hengel: uitwerpen', { cat: 'water', gain: 0.7, ref: 4, range: 60 }, 1.0, [0, 0.8, -0.8], (d, sr, R, k) => {
  const f = bq('bp', 700, 1.4, sr), n = Math.floor(0.26 * sr);
  for (let i = 0; i < n; i++) { const u = i / n; if ((i & 31) === 0) f.set((600 + 2600 * u) * k, 1.4); d[i] += f.run(R() * 2 - 1) * Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.55; }
  const t = 0.3;
  thump(d, sr, t, 150 * k, 0.03, 0.8);
  nb(d, sr, t, R, { type: 'lp', f: 1300, q: 0.8, tau: 0.05, amp: 0.7 });
  addTone(d, sr, t + 0.02, 0.1, R, { f0: 420 * k, f1: 900 * k, amp: 0.3, attack: 0.003, release: 0.04 });
  nb(d, sr, t + 0.2, R, { type: 'lp', f: 900, q: 0.7, tau: 0.08, amp: 0.15 });
});

// beet: het dobbertje wordt onder water getrokken, twee korte tikken en een zachte lijn-tik
varianten('hengel_beet', 'Hengel: er zit een vis aan', { cat: 'water', gain: 0.6, ref: 4, range: 40 }, 0.5, [0, 1, -1], (d, sr, R, k) => {
  [0, 0.12].forEach((t, i) => {
    addTone(d, sr, t, 0.07, R, { f0: 520 * k, f1: 300 * k, amp: 0.7 - i * 0.15, attack: 0.002, release: 0.03 });
    nb(d, sr, t, R, { type: 'lp', f: 1100, q: 0.8, tau: 0.02, amp: 0.4 });
  });
  nb(d, sr, 0.03, R, { type: 'hp', f: 4500, q: 0.7, tau: 0.004, amp: 0.25 });
});

// vangst: de vis spartelt boven het water, vier natte klappen en wat spetters
varianten('hengel_vangst', 'Hengel: vangst binnengehaald', { cat: 'water', gain: 0.7, ref: 4, range: 55 }, 1.3, [0, 0.5, -0.6], (d, sr, R, k) => {
  const ft = bq('lp', 1800, 0.7, sr);
  let t = 0;
  for (let i = 0; i < 4; i++) {
    thump(d, sr, t, (110 + R() * 40) * k, 0.025, 0.6 - i * 0.08);
    nb(d, sr, t, R, { type: 'lp', f: 1500 + R() * 500, q: 0.8, tau: 0.04, amp: 0.6 - i * 0.08 });
    for (let s = 0; s < 4; s++) addTone(d, sr, t + 0.01 + R() * 0.12, 0.035, R, { f0: (800 + R() * 900) * k, f1: 350, amp: 0.12, attack: 0.002, release: 0.015 });
    t += 0.14 + R() * 0.11;
  }
  nb(d, sr, 0.0, R, { type: 'hp', f: 3500, q: 0.7, tau: 0.3, amp: 0.1, len: 1 });
  for (let i = 0; i < d.length; i++) d[i] = ft.run(d[i]);
});

// ontsnapt: de lijn schiet los, een korte zingende val en een kleine plons ernaast
varianten('hengel_los', 'Hengel: vis ontsnapt', { cat: 'water', gain: 0.6, ref: 4, range: 45 }, 0.55, [0, 0.7], (d, sr, R, k) => {
  const f = bq('bp', 4200, 3, sr), n = Math.floor(0.22 * sr);
  for (let i = 0; i < n; i++) { const u = i / n; if ((i & 15) === 0) f.set((4200 - 3200 * u) * k, 3); d[i] += f.run(R() * 2 - 1) * (1 - u) * 0.8; }
  thump(d, sr, 0.25, 130 * k, 0.03, 0.5);
  nb(d, sr, 0.25, R, { type: 'lp', f: 1000, q: 0.8, tau: 0.05, amp: 0.45 });
});

// --- uit het water klimmen en een hapje -------------------------------------------------------------------

// uit het water: een natte zwaai, druipend water in kleine toontjes en een klap als je op de kant komt
varianten('water_uit', 'Uit het water klimmen', { cat: 'water', gain: 0.75, ref: 4, range: 55 }, 1.4, [0, 0.6, -0.6], (d, sr, R, k) => {
  const f = bq('lp', 1500, 0.8, sr), n = Math.floor(0.5 * sr);
  for (let i = 0; i < n; i++) { const u = i / n; if ((i & 63) === 0) f.set((900 + 900 * Math.sin(Math.PI * u)) * k, 0.8); d[i] += f.run(R() * 2 - 1) * Math.sin(Math.PI * u) * 0.5 * (0.6 + 0.4 * Math.sin(i / sr * 24)); }
  thump(d, sr, 0.42, 85 * k, 0.04, 0.7);
  nb(d, sr, 0.42, R, { type: 'lp', f: 900, q: 0.8, tau: 0.05, amp: 0.5 });
  let t = 0.2;
  for (let i = 0; i < 9; i++) { t += 0.05 + R() * 0.09 + i * 0.01; addTone(d, sr, t, 0.04, R, { f0: (1500 + R() * 800) * k, f1: 500 + R() * 200, amp: 0.2 * (1 - i / 11), attack: 0.002, release: 0.02 }); }
});

// hapje: een knapperige hap, een slik en een zacht klinkje van bestek; kort, rond en niet te vet
varianten('horeca_hap', 'Een hapje eten', { cat: 'winkel', gain: 0.6, ref: 3, range: 40 }, 0.9, [0, 0.8, -0.8], (d, sr, R, k) => {
  [0, 0.09, 0.17].forEach((t, i) => {
    nb(d, sr, t, R, { type: 'bp', f: (2200 + R() * 1200) * k, q: 1.5, tau: 0.012, amp: 0.7 - i * 0.12 });
    thump(d, sr, t, 180 * k, 0.012, 0.3);
  });
  addTone(d, sr, 0.42, 0.12, R, { f0: 190 * k, f1: 110 * k, amp: 0.6, attack: 0.01, release: 0.05 });
  addPartials(d, sr, 0.62, 3300 * k, [[1, 0.35, 0.05], [2.5, 0.15, 0.03]], 0.6, R);
  const lp = bq('lp', 3500, 0.7, sr);
  for (let i = 0; i < d.length; i++) d[i] = lp.run(d[i]);
});

export const WORLD_FX = defs;

// --- omgevingslagen per streek (lussen) ---------------------------------------------------------------------
// Net als de lagen van dsp.js: stereo, 22,05 kHz, naadloos. Het niveau en wanneer ze klinken staat in
// streekklank.js (puur) en ambience.js (het mengen).

// zachte ruisgenerator zonder bronnen buiten dit bestand
const bruin = (R) => { let b = 0; return () => { b = (b + (R() * 2 - 1) * 0.02) * 0.998; return b * 3.5; }; };
// afstand op de lus (t mag voorbij len lopen: de overhang die loopify terugmengt)
const circ = (t, t0, len) => { const x = (((t - t0) % len) + len) % len; return Math.min(x, len - x); };

// kust: brekende golven (lange zwellen, na de top een sissende uitloop) en wat wind erboven
function bedKust(chs, sr, R, len) {
  const golven = Array.from({ length: 4 }, (_, i) => ({ t0: (i + R() * 0.5) * len / 4, w: 1.1 + R() * 0.8, a: 0.55 + R() * 0.45 }));
  chs.forEach((d, c) => {
    const br = bruin(R), lp = bq('lp', 380, 0.7, sr), hs = bq('hp', 2400, 0.7, sr), wd = bq('bp', 700, 0.6, sr);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      let zwel = 0, sis = 0;
      for (const g of golven) {
        const x = circ(t, g.t0 + c * 0.35, len);
        zwel += g.a * Math.exp(-(x * x) / (g.w * g.w));
        const na = ((t - g.t0 - c * 0.35 + len) % len);
        if (na > g.w * 0.6 && na < g.w * 3) sis += g.a * Math.exp(-(na - g.w * 0.6) / 1.1);
      }
      d[i] = lp.run(br()) * (0.35 + zwel) * 1.3 + hs.run(R() * 2 - 1) * sis * 0.1 + wd.run(R() * 2 - 1) * 0.04;
    }
  });
}

// polder: wind door het gras (brede, trage vlagen) en af en toe een verre veldvogel
function bedPolder(chs, sr, R, len) {
  const vlagen = Array.from({ length: 5 }, () => ({ f: 0.08 + R() * 0.25, ph: R() * TAU }));
  const tsips = Array.from({ length: 6 }, () => ({ t0: R() * len, f: 3300 + R() * 900 }));
  chs.forEach((d, c) => {
    const gras = bq('bp', 1700, 0.5, sr), laag = bq('lp', 300, 0.7, sr), hoog = bq('hp', 4200, 0.7, sr);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      // vlagen met een geheel aantal perioden over de lus: naadloos
      let v = 0.5;
      for (const g of vlagen) v += 0.1 * Math.sin(TAU * Math.round(g.f * len) / len * t + g.ph + c);
      const n = R() * 2 - 1;
      let s = gras.run(n) * 0.5 * v + laag.run(n) * 0.5 * v + hoog.run(n) * 0.08 * v * v;
      for (const q of tsips) {
        const x = circ(t, q.t0 + c * 0.2, len);
        if (x < 0.12) s += Math.sin(TAU * q.f * (1 + 0.3 * x) * t) * Math.sin(Math.PI * x / 0.12) * Math.exp(-x * 30) * 0.05;
      }
      d[i] = s;
    }
  });
}

// riet: ruisend riet in vlagen en zacht klotsend water ertussen
function bedRiet(chs, sr, R, len) {
  const vlagen = Array.from({ length: 4 }, () => ({ f: 0.1 + R() * 0.3, ph: R() * TAU }));
  chs.forEach((d, c) => {
    const riet = bq('bp', 3600, 0.9, sr), laag = bq('lp', 420, 0.7, sr), plas = bq('bp', 500, 3, sr);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      let v = 0.55;
      for (const g of vlagen) v += 0.12 * Math.sin(TAU * Math.round(g.f * len) / len * t + g.ph + c * 0.7);
      const n = R() * 2 - 1;
      const klots = Math.max(0, Math.sin(TAU * Math.round(0.7 * len) / len * t + c)) ** 6;
      d[i] = riet.run(n) * 0.55 * v * v + laag.run(n) * 0.25 + plas.run(R() * 2 - 1) * klots * 0.12;
    }
  });
}

// industrie: een lage brom (50 Hz met boventonen), ver gekletter en af en toe een sissende stoomstoot
function bedIndustrie(chs, sr, R, len) {
  const kletters = Array.from({ length: 4 }, () => ({ t0: R() * len, f: 600 + R() * 900 }));
  const stoot = { t0: R() * len, w: 0.9 };
  chs.forEach((d, c) => {
    const br = bruin(R), lp = bq('lp', 160, 0.7, sr), sis = bq('hp', 5000, 0.7, sr), klet = bq('bp', 900, 5, sr);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      // 50 Hz: een geheel aantal perioden over de lus, dus naadloos
      let v = (Math.sin(TAU * 50 * t + c * 0.3) * 0.5 + Math.sin(TAU * 100 * t) * 0.25 + Math.sin(TAU * 150 * t + 1) * 0.12) * (0.8 + 0.2 * Math.sin(TAU * t / len * 3));
      v += lp.run(br()) * 0.6;
      const x = circ(t, stoot.t0 + c * 0.1, len);
      v += sis.run(R() * 2 - 1) * Math.exp(-(x * x) / (stoot.w * stoot.w)) * 0.12;
      for (const k of kletters) {
        const y = circ(t, k.t0, len);
        if (y < 0.15) { klet.set(k.f, 5); v += klet.run(R() * 2 - 1) * Math.exp(-y * 30) * 0.35; }
      }
      d[i] = v;
    }
  });
}

export const BED_FX = {
  bed_kust: { dur: 10, gen: bedKust, opts: { ch: 2, rate: 22050, loop: 0.8 } },
  bed_polder: { dur: 10, gen: bedPolder, opts: { ch: 2, rate: 22050, loop: 0.8 } },
  bed_riet: { dur: 8, gen: bedRiet, opts: { ch: 2, rate: 22050, loop: 0.6 } },
  bed_industrie: { dur: 8, gen: bedIndustrie, opts: { ch: 2, rate: 22050, loop: 0.5 } },
};
