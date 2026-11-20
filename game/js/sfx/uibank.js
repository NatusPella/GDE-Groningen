// De UI-geluidstaal (SFX-GAPS, groep a en b): tabwissel, weigeren, toast, kaart open en dicht, ontdekking,
// uitkijkpunt, verzameld, loopbaantrap, uitgave en waarschuwing. Eén rustige familie: zachte sinus- en
// driehoeksklanken met korte, glazige of houten aanslagen, in dezelfde toonladder (C-groot pentatonisch,
// rond C5) zodat ze nooit tegen elkaar of tegen de muziek in klinken. Alles procedureel, geen opname.
//
// Puur gegevens: elk geluid is { info, dur, gen, opts } en wordt door fxbank.js in de bank gezet
// (defSample) en in FX_INFO. Dit bestand haalt zelf niets uit fxbank.js, zodat er geen importcirkel is.
// Een geluid dat vaak klinkt (tab, toast, uitgave, weigeren, waarschuwing) heeft drie of vier varianten
// (_0, _1, ...) met een eigen zaad en een eigen toonhoogte; ui.js kiest er per aanroep een en voegt
// nog een kleine willekeurige toonhoogte toe. De klanken zijn kort (onder 2,2 s) en pieken op 0,9; het
// niveau regelt ui.js met de categorie `ui` van het mixplan.
import { dspKit } from './dsp.js';

const { addNoiseBurst: nb, addPartials, addTone, thump, bq } = dspKit;

// ref en range zijn alleen voor ?sfxtest (het paneel speelt ook de UI-geluiden als gebeurtenis af); ui.js speelt ze zonder afstand
const INFO = (label, gain = 0.5) => ({ cat: 'ui', label, gain, ref: 6, range: 400 });

// de toonladder: semitonen boven C5 (523,25 Hz) in C-groot pentatonisch
const C5 = 523.25;
const st = (n) => C5 * Math.pow(2, n / 12);
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

// een glazig tikje: grondtoon met twee onharmonische boventonen, kort uitgeklonken
const glas = (d, sr, t, f, amp, R, tau = 0.09) => addPartials(d, sr, t, f, [[1, 1, tau], [2.76, 0.28, tau * 0.45], [5.4, 0.1, tau * 0.2]], amp, R);
// een zachte, ronde klank (marimba-achtig): grondtoon en een octaaf, snel uitgedoofd
const rond = (d, sr, t, f, amp, R, tau = 0.12) => addPartials(d, sr, t, f, [[1, 1, tau], [2, 0.22, tau * 0.5], [4.1, 0.06, tau * 0.25]], amp, R);

const defs = {};
const add = (name, label, gain, dur, gen, opts = {}) => { defs[name] = { info: INFO(label, gain), dur, gen, opts }; };
// n varianten: variant i krijgt de toonhoogte-afwijking shifts[i] (in semitonen) en eigen ruis door het eigen zaad
const varianten = (base, label, gain, dur, shifts, gen, opts = {}) => {
  shifts.forEach((sh, i) => add(`${base}_${i}`, `${label} (${String.fromCharCode(65 + i)})`, gain, dur, (c, sr, R) => gen(c[0], sr, R, Math.pow(2, sh / 12)), opts));
};

// tabwissel: twee zachte houten tikken vlak na elkaar, de tweede hoger; de wijzer die overspringt
varianten('ui_tab', 'Menu: tabwissel', 0.5, 0.16, [0, 0.4, -0.5, 0.9], (d, sr, R, k) => {
  rond(d, sr, 0, st(7) * k, 0.8, R, 0.035);
  nb(d, sr, 0, R, { type: 'bp', f: 2600, q: 1.6, tau: 0.006, amp: 0.3 });
  rond(d, sr, 0.055, st(12) * k, 0.7, R, 0.04);
});

// weigeren: twee lage, dofe klanken omlaag (nee, dat kan niet), zonder schel randje
varianten('ui_weiger', 'Menu: weigeren', 0.55, 0.34, [0, -0.6, 0.5], (d, sr, R, k) => {
  addTone(d, sr, 0, 0.11, R, { f0: st(-5) * k, f1: st(-8) * k, amp: 0.7, attack: 0.004, release: 0.06 });
  addTone(d, sr, 0.15, 0.17, R, { f0: st(-8) * k, f1: st(-13) * k, amp: 0.75, attack: 0.004, release: 0.1 });
  thump(d, sr, 0, 140 * k, 0.03, 0.4);
  const lp = bq('lp', 900, 0.7, sr);
  for (let i = 0; i < d.length; i++) d[i] = lp.run(d[i]);
});

// toast: één glazen tik, de zachtste van allemaal; een melding zonder eigen betekenis
varianten('ui_toast', 'Melding', 0.35, 0.4, [0, 2, -3, 4], (d, sr, R, k) => {
  glas(d, sr, 0, st(PENTA[4] + 12) * k, 0.7, R, 0.08);
});

// kaart open: papier dat wordt opengevouwen, dof begin en een zacht piepend eind
add('ui_kaart_open', 'Kaart open', 0.5, 0.5, (c, sr, R) => {
  const d = c[0];
  thump(d, sr, 0, 90, 0.03, 0.3);
  const f = bq('bp', 900, 1.2, sr), n = Math.floor(0.34 * sr);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    if ((i & 31) === 0) f.set(700 + 2800 * u, 1.2);
    const crinkle = 0.55 + 0.45 * Math.sin(i / sr * 71 + Math.sin(i / sr * 13) * 2);
    d[Math.floor(0.03 * sr) + i] += f.run(R() * 2 - 1) * crinkle * Math.sin(Math.PI * u) * 0.8;
  }
  for (let k = 0; k < 5; k++) nb(d, sr, 0.05 + R() * 0.28, R, { type: 'bp', f: 3000 + R() * 2500, q: 2.5, tau: 0.004, amp: 0.3 + R() * 0.3 });
});

// kaart dicht: korter en omlaag, met een stille klap als het papier dubbel valt
add('ui_kaart_dicht', 'Kaart dicht', 0.5, 0.4, (c, sr, R) => {
  const d = c[0];
  const f = bq('bp', 3200, 1.2, sr), n = Math.floor(0.2 * sr);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    if ((i & 31) === 0) f.set(3200 - 2300 * u, 1.2);
    d[i] += f.run(R() * 2 - 1) * Math.sin(Math.PI * Math.min(1, u * 1.2)) * 0.7;
  }
  for (let k = 0; k < 3; k++) nb(d, sr, 0.02 + R() * 0.14, R, { type: 'bp', f: 2500 + R() * 2000, q: 2.5, tau: 0.004, amp: 0.25 });
  thump(d, sr, 0.19, 85, 0.035, 0.5);
  nb(d, sr, 0.19, R, { type: 'lp', f: 700, q: 0.7, tau: 0.03, amp: 0.4 });
});

// ontdekking: drie opkomende klokjes (een nieuwe plek, streek of vondst), de laatste blijft hangen
add('ui_ontdek', 'Ontdekking', 0.55, 1.1, (c, sr, R) => {
  const d = c[0];
  [0, 4, 7].forEach((n, i) => glas(d, sr, i * 0.1, st(n + 12), 0.8, R, i === 2 ? 0.3 : 0.12));
  addPartials(d, sr, 0.2, st(19), [[1, 0.35, 0.5]], 0.5, R);
});

// uitkijkpunt: wijd uitzicht, een lang uitwaaierende akkoord-arpeggio met een zucht lucht erdoorheen
add('ui_uitkijk', 'Uitkijkpunt', 0.5, 2.1, (c, sr, R) => {
  const d = c[0];
  [0, 4, 7, 12, 16].forEach((n, i) => {
    addTone(d, sr, i * 0.13, 1.1 + i * 0.1, R, { f0: st(n), amp: 0.5 - i * 0.04, attack: 0.05, release: 0.6 });
    glas(d, sr, i * 0.13, st(n + 12), 0.4, R, 0.25);
  });
  const f = bq('bp', 1500, 0.8, sr), n = Math.floor(1.4 * sr), s0 = Math.floor(0.1 * sr);
  for (let i = 0; i < n; i++) { const u = i / n; if ((i & 63) === 0) f.set(1200 + 3200 * u, 0.8); d[s0 + i] += f.run(R() * 2 - 1) * Math.sin(Math.PI * u) * 0.1; }
});

// verzameld: vier snelle hoge pingetjes omhoog (een verzamelobject, een stempel)
add('ui_verzameld', 'Verzameld', 0.45, 0.6, (c, sr, R) => {
  const d = c[0];
  [PENTA[5], PENTA[6], PENTA[7], PENTA[8]].forEach((n, i) => glas(d, sr, i * 0.055, st(n + 12), 0.75 - i * 0.05, R, 0.07 + i * 0.03));
});

// loopbaantrap: een trapje van vier noten en een vol slotakkoord; het langste en blijste geluid van de set
add('ui_loopbaan', 'Loopbaan: een trap omhoog', 0.55, 1.7, (c, sr, R) => {
  const d = c[0];
  [PENTA[3], PENTA[5], PENTA[6], PENTA[7]].forEach((n, i) => rond(d, sr, i * 0.1, st(n), 0.9, R, 0.2));
  [0, 4, 7, 12].forEach((n) => { rond(d, sr, 0.46, st(n + 12), 0.5, R, 0.55); addTone(d, sr, 0.46, 0.9, R, { f0: st(n), amp: 0.14, attack: 0.02, release: 0.5 }); });
  nb(d, sr, 0.46, R, { type: 'hp', f: 6000, q: 0.7, tau: 0.25, amp: 0.1, len: 1 });
});

// uitgave: twee muntjes die op elkaar vallen (geld uit); matte klink, geen kassa
varianten('ui_uitgave', 'Geld uitgegeven', 0.5, 0.45, [0, 1.2, -1, 2], (d, sr, R, k) => {
  [0, 0.07].forEach((t, i) => {
    addPartials(d, sr, t, 2900 * k * (1 + i * 0.12), [[1, 1, 0.05], [2.4, 0.5, 0.03], [3.9, 0.3, 0.02], [5.5, 0.15, 0.015]], 0.8 - i * 0.2, R);
    nb(d, sr, t, R, { type: 'hp', f: 5000, q: 0.7, tau: 0.002, amp: 0.3 });
  });
  addPartials(d, sr, 0.16, 2300 * k, [[1, 0.5, 0.08], [2.4, 0.2, 0.04]], 0.5, R);
});

// waarschuwing: twee lage zachte pulsen (politie, gevaar); geen sirene, de stings doen het grote werk
varianten('ui_gevaar', 'Melding: gevaar', 0.5, 0.45, [0, -0.7, 0.6], (d, sr, R, k) => {
  [0, 0.16].forEach((t) => {
    addTone(d, sr, t, 0.12, R, { f0: st(-2) * k, f1: st(-4) * k, amp: 0.8, attack: 0.006, release: 0.05, shape: 'rich' });
  });
  const lp = bq('lp', 1100, 0.7, sr);
  for (let i = 0; i < d.length; i++) d[i] = lp.run(d[i]);
});

// Samen spelen: een speler komt binnen, twee zachte glazen klanken omhoog (welkom), zacht genoeg om een gesprek niet te storen
varianten('ui_speler_binnen', 'Samen spelen: speler komt binnen', 0.4, 0.7, [0, 0.5], (d, sr, R, k) => {
  glas(d, sr, 0, st(PENTA[3]) * k, 0.7, R, 0.1);
  glas(d, sr, 0.11, st(PENTA[5]) * k, 0.75, R, 0.2);
});

// Samen spelen: een speler vertrekt, twee zachte houten klanken omlaag (tot ziens), zonder mineur en zonder schrik
varianten('ui_speler_weg', 'Samen spelen: speler vertrekt', 0.4, 0.7, [0, -0.5], (d, sr, R, k) => {
  rond(d, sr, 0, st(PENTA[5]) * k, 0.7, R, 0.1);
  rond(d, sr, 0.12, st(PENTA[3]) * k, 0.7, R, 0.22);
});

// Samen spelen: een uitnodiging (meedoen met een opdracht), drie klokjes als een vraag: omhoog, omhoog, en de laatste open
add('ui_uitnodiging', 'Samen spelen: uitnodiging', 0.45, 1.0, (c, sr, R) => {
  const d = c[0];
  [PENTA[2], PENTA[4], PENTA[6]].forEach((n, i) => glas(d, sr, i * 0.13, st(n), 0.7, R, i === 2 ? 0.3 : 0.1));
});

export const UI_FX = defs;
// de basisnamen (zonder _0): wat ui.js speelt
export const UI_SOUNDS = [...new Set(Object.keys(defs).map((n) => n.replace(/_\d$/, '')))];
