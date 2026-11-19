// De missie-stings (docs/missies/BOUWSTENEN.md, "Missie-stings"): start, stap, bijna mislukt, mislukt, geslaagd
// (klein en groot), medaille (brons, zilver, goud) en een lichte cutscene-intro en -outro, plus de kassa van
// een aankoop en de bel van tram en bus (SFX-GAPS). Eén familie: dezelfde toonladder als de UI-taal (uibank.js,
// C-groot pentatonisch rond C5) en één motief, C-E-G-C (nul, vier, zeven en twaalf halve tonen), dat in elke sting
// terugkomt: omhoog bij een begin of een winst, omlaag en in mineur bij mislukken. Elke sting is korter dan 2,5 s.
// Alles procedureel uit de bouwstenen van dsp.js, geen opname, geen AI-muziek, verzonnen melodie.
//
// Puur gegevens, net als uibank.js en worldbank.js: fxbank.js zet ze in de bank en in FX_INFO. De regels (welke sting
// wanneer, afkoeltijd, rangorde) staan in sfx/stingen.js. Een sting met meer dan één klank heeft varianten (_0, _1):
// dezelfde toonladder in een andere volgorde of versiering, nooit een andere toonsoort, zodat de varianten nooit
// vals klinken tegen de muziek of tegen elkaar.
import { dspKit } from './dsp.js';

const { addNoiseBurst: nb, addPartials, addTone, thump, bq } = dspKit;

// cat 'sting': mixplan.js geeft de categorie een niveau en een spraakdemping (een stem eroverheen dempt hem)
const STING_INFO = (label, gain = 0.6) => ({ cat: 'sting', label, gain, ref: 6, range: 400 });
const OV_INFO = (cat, label, gain, ref, range) => ({ cat, label, gain, ref, range });

const C5 = 523.25;
const st = (n) => C5 * Math.pow(2, n / 12);

// een rond, marimba-achtig tikje (zoals uibank.js) en een glazen klok met een onharmonische boventoon
const rond = (d, sr, t, f, amp, R, tau = 0.14) => addPartials(d, sr, t, f, [[1, 1, tau], [2, 0.22, tau * 0.5], [4.1, 0.06, tau * 0.25]], amp, R);
const klok = (d, sr, t, f, amp, R, tau = 0.2) => addPartials(d, sr, t, f, [[1, 1, tau], [2.76, 0.26, tau * 0.45], [5.4, 0.08, tau * 0.2]], amp, R);
// een zachte, aanhoudende pad-toon (voor de cutscene-stings en de slotakkoorden)
const pad = (d, sr, t, dur, f, amp, R, attack = 0.04, release = 0.5) => addTone(d, sr, t, dur, R, { f0: f, amp, attack, release });
// een lopende ruis die omhoog (of omlaag) schuift, voor de zucht van een begin of een einde
function veeg(d, sr, t0, dur, f0, f1, amp, R) {
  const f = bq('bp', f0, 0.9, sr), n = Math.floor(dur * sr), s0 = Math.floor(t0 * sr);
  for (let i = 0; i < n && s0 + i < d.length; i++) {
    const u = i / n;
    if ((i & 63) === 0) f.set(f0 + (f1 - f0) * u, 0.9);
    d[s0 + i] += f.run(R() * 2 - 1) * Math.sin(Math.PI * u) * amp;
  }
}

const defs = {};
const add = (name, info, dur, gen, opts = {}) => { defs[name] = { info, dur, gen, opts }; };
// variant i krijgt de i-de rij van `rijen` (halve tonen boven C5 in de toonladder) en eigen ruis door het eigen zaad
const varianten = (base, label, info, dur, rijen, gen) => {
  rijen.forEach((rij, i) => add(`${base}_${i}`, { ...info, label: `${label} (${String.fromCharCode(65 + i)})` }, dur, (c, sr, R) => gen(c[0], sr, R, rij)));
};

// --- de missie ------------------------------------------------------------------------------------------

// missie-start: een lage grondtoon, het motief omhoog en een klok die blijft hangen; de opmaat, een rustig "daar gaan we"
varianten('missie_start', 'Missie: start', STING_INFO('', 0.6), 1.9, [[0, 7, 12, 16], [0, 4, 9, 16]], (d, sr, R, rij) => {
  pad(d, sr, 0, 1.2, st(-24), 0.5, R, 0.05, 0.6);
  thump(d, sr, 0, 80, 0.05, 0.45);
  rij.forEach((n, i) => rond(d, sr, 0.05 + i * 0.14, st(n), 0.85, R, 0.22));
  klok(d, sr, 0.05 + 3 * 0.14, st(rij[3] + 12), 0.5, R, 0.55);
  veeg(d, sr, 0, 0.6, 600, 3200, 0.05, R);
});

// stap voltooid: twee zachte noten omhoog, de kleinste sting; hoort bij een tussenstap, niet bij het einde
varianten('missie_stap', 'Missie: stap voltooid', STING_INFO('', 0.5), 0.8, [[7, 12], [4, 9], [9, 14]], (d, sr, R, rij) => {
  klok(d, sr, 0, st(rij[0]), 0.8, R, 0.09);
  klok(d, sr, 0.09, st(rij[1]), 0.75, R, 0.16);
});

// bijna mislukt: drie korte pulsen op een spanningsinterval (grondtoon-bovenleidtoon, een halve toon), zonder sirene
varianten('missie_bijna', 'Missie: bijna mislukt', STING_INFO('', 0.55), 1.1, [[-5, -6, -5], [-6, -5, -6]], (d, sr, R, rij) => {
  rij.forEach((n, i) => {
    addTone(d, sr, i * 0.2, 0.14, R, { f0: st(n), f1: st(n) * 0.99, amp: 0.8 - i * 0.08, attack: 0.008, release: 0.06, shape: 'rich' });
    addTone(d, sr, i * 0.2, 0.14, R, { f0: st(n + 12), amp: 0.22, attack: 0.008, release: 0.06 });
  });
  thump(d, sr, 0.4, 70, 0.07, 0.5);
  const lp = bq('lp', 1500, 0.7, sr);
  for (let i = 0; i < d.length; i++) d[i] = lp.run(d[i]);
});

// mislukt: het motief omlaag in mineur (G, Es, C, een lage G) en een langzame uitklinker; teleurgesteld, geen alarm
add('missie_mislukt', STING_INFO('Missie: mislukt', 0.55), 2.2, (c, sr, R) => {
  const d = c[0];
  [[7, 0], [3, 0.3], [0, 0.6]].forEach(([n, t], i) => {
    addTone(d, sr, t, 0.42, R, { f0: st(n), f1: st(n) * 0.985, amp: 0.65 - i * 0.05, attack: 0.012, release: 0.2, shape: 'rich' });
  });
  addTone(d, sr, 0.9, 1.0, R, { f0: st(-5), f1: st(-5) * 0.96, amp: 0.7, attack: 0.02, release: 0.7, shape: 'rich' });
  pad(d, sr, 0.9, 1.0, st(-17), 0.4, R, 0.05, 0.7);
  thump(d, sr, 0.9, 62, 0.12, 0.5);
  const lp = bq('lp', 1300, 0.7, sr);
  for (let i = 0; i < d.length; i++) d[i] = lp.run(d[i]);
});

// geslaagd (klein): het hele motief als snelle trap en een klokkend slotakkoord; de gewone "klaar"
varianten('missie_geslaagd', 'Missie: geslaagd', STING_INFO('', 0.6), 1.6, [[0, 4, 7, 12, 16], [0, 4, 7, 12, 19]], (d, sr, R, rij) => {
  rij.forEach((n, i) => rond(d, sr, i * 0.075, st(n), 0.8, R, 0.14));
  const t = rij.length * 0.075 + 0.05;
  [0, 4, 7, 12].forEach((n) => klok(d, sr, t, st(n + 12), 0.5, R, 0.45));
  pad(d, sr, t, 0.9, st(-12), 0.3, R, 0.02, 0.5);
});

// geslaagd (groot): het motief, een breed slotakkoord met een lage grondtoon en een sprankeling; het einde van een akte
add('missie_geslaagd_groot', STING_INFO('Missie: geslaagd (groot)', 0.65), 2.45, (c, sr, R) => {
  const d = c[0];
  [0, 4, 7, 12].forEach((n, i) => rond(d, sr, i * 0.12, st(n), 0.85, R, 0.2));
  const t = 0.58;
  [0, 4, 7, 12, 16].forEach((n, i) => { klok(d, sr, t + i * 0.025, st(n + 12), 0.55 - i * 0.04, R, 0.6); pad(d, sr, t, 1.3, st(n), 0.16, R, 0.03, 0.8); });
  pad(d, sr, t, 1.5, st(-24), 0.45, R, 0.03, 0.9);
  thump(d, sr, t, 70, 0.1, 0.55);
  nb(d, sr, t, R, { type: 'hp', f: 6500, q: 0.7, tau: 0.3, amp: 0.12, len: 1.2 });
});

// --- de medailles: dezelfde klank in drie lengtes ----------------------------------------------------------

// brons: twee noten, kort en bescheiden
add('medaille_brons', STING_INFO('Medaille: brons', 0.5), 1.0, (c, sr, R) => {
  const d = c[0];
  klok(d, sr, 0, st(7), 0.8, R, 0.18);
  klok(d, sr, 0.11, st(12), 0.75, R, 0.3);
});

// zilver: drie noten omhoog en een zweem glans
add('medaille_zilver', STING_INFO('Medaille: zilver', 0.55), 1.4, (c, sr, R) => {
  const d = c[0];
  [4, 7, 12].forEach((n, i) => klok(d, sr, i * 0.1, st(n), 0.8, R, 0.22 + i * 0.08));
  klok(d, sr, 0.3, st(19), 0.35, R, 0.5);
  nb(d, sr, 0.3, R, { type: 'hp', f: 7000, q: 0.7, tau: 0.18, amp: 0.07, len: 0.6 });
});

// goud: het hele motief, een vol akkoord en een lange sprankeling; het langste en blijste van de drie
add('medaille_goud', STING_INFO('Medaille: goud', 0.6), 2.2, (c, sr, R) => {
  const d = c[0];
  [0, 4, 7, 12].forEach((n, i) => klok(d, sr, i * 0.1, st(n), 0.8, R, 0.22));
  const t = 0.46;
  [0, 4, 7, 12, 16].forEach((n, i) => { klok(d, sr, t + i * 0.02, st(n + 12), 0.5 - i * 0.03, R, 0.65); pad(d, sr, t, 1.1, st(n), 0.12, R, 0.03, 0.7); });
  thump(d, sr, t, 75, 0.08, 0.4);
  nb(d, sr, t, R, { type: 'hp', f: 6500, q: 0.7, tau: 0.35, amp: 0.12, len: 1.4 });
});

// --- de cutscene -----------------------------------------------------------------------------------------

// intro: een zacht aanzwellend akkoord (C, G, E) met een zucht lucht omhoog; het gordijn gaat open
add('scene_in', STING_INFO('Scène: intro', 0.45), 1.7, (c, sr, R) => {
  const d = c[0];
  [[-12, 0], [-5, 0.08], [4, 0.16], [7, 0.24]].forEach(([n, t]) => pad(d, sr, t, 1.1, st(n), 0.45, R, 0.5, 0.5));
  klok(d, sr, 0.55, st(19), 0.3, R, 0.5);
  veeg(d, sr, 0, 1.2, 500, 2600, 0.07, R);
});

// outro: dezelfde noten in omgekeerde volgorde, het akkoord dooft uit en komt thuis op de grondtoon
add('scene_uit', STING_INFO('Scène: outro', 0.45), 1.9, (c, sr, R) => {
  const d = c[0];
  [[19, 0], [12, 0.18], [7, 0.36]].forEach(([n, t], i) => klok(d, sr, t, st(n), 0.55 - i * 0.05, R, 0.3));
  [[-12, 0.4], [0, 0.4], [4, 0.45]].forEach(([n, t]) => pad(d, sr, t, 1.2, st(n), 0.4, R, 0.1, 0.8));
  veeg(d, sr, 0.3, 1.2, 2400, 500, 0.05, R);
});

// --- de gaten uit SFX-GAPS die hier thuishoren ------------------------------------------------------------

// kassa bij een aankoop: een korte klik, een lade die schuift en een bel die rinkelt; vriendelijk, geen muntenregen
varianten('winkel_kassa', 'Winkel: kassa bij een aankoop', OV_INFO('ui', '', 0.55, 6, 400), 0.9, [1, 1.05], (d, sr, R, k) => {
  nb(d, sr, 0, R, { type: 'bp', f: 3000, q: 1.8, tau: 0.006, amp: 0.7 });
  thump(d, sr, 0, 190, 0.015, 0.4);
  nb(d, sr, 0.05, R, { type: 'bp', f: 1400, q: 1, tau: 0.07, amp: 0.3, attack: 0.02 });
  addPartials(d, sr, 0.16, 2350 * k, [[1, 1, 0.28], [2.4, 0.45, 0.16], [3.9, 0.22, 0.09], [5.6, 0.1, 0.05]], 0.75, R);
  thump(d, sr, 0.3, 140, 0.03, 0.3);
});

// tram: twee heldere tikken van een koperen bel, "ting-ting", bij het vertrek uit een halte
varianten('tram_bel', 'Tram: bel bij vertrek', OV_INFO('voertuig', '', 0.5, 12, 160), 1.2, [1, 1.06], (d, sr, R, k) => {
  [0, 0.26].forEach((t, i) => addPartials(d, sr, t, 1850 * k, [[1, 1, 0.3], [2.32, 0.5, 0.18], [4.2, 0.22, 0.09], [6.1, 0.1, 0.05]], 0.8 - i * 0.1, R));
  nb(d, sr, 0, R, { type: 'hp', f: 5500, q: 0.7, tau: 0.003, amp: 0.2 });
});

// bus: één zachte dubbele "ding-dong" van de stopaanvraag of de halte, lager dan de tram
add('bus_bel', OV_INFO('voertuig', 'Bus: ding van de halte', 0.45, 8, 100), 1.0, (c, sr, R) => {
  const d = c[0];
  addPartials(d, sr, 0, 1320, [[1, 1, 0.22], [2, 0.3, 0.12], [3.01, 0.12, 0.06]], 0.8, R);
  addPartials(d, sr, 0.2, 990, [[1, 1, 0.3], [2, 0.3, 0.14], [3.01, 0.12, 0.07]], 0.75, R);
});

export const MISSIE_FX = defs;
// de basisnamen van de stings (zonder _0), voor de dekkingstabel en de documentatie
export const MISSIE_SOUNDS = [...new Set(Object.keys(defs).map((n) => n.replace(/_\d$/, '')))];
