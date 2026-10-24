// Extra synthesized one-shots (issue #173), registered in the sample bank of
// dsp.js: a real carbid boom, a bigger explosion, shop bell, bridge, rail and
// ship sounds, a fairground strike. No samples and no recordings; every
// variant is rendered from its own seed (the name), so variants differ and a
// node test can render them offline (scripts/sfx_test.mjs).
import { defSample, dspKit } from './dsp.js';

const { addNoiseBurst: nb, addPartials, addTone, thump, click, bq } = dspKit;

// Per effect: mixer category (mixplan.js), a Dutch label for ?sfxtest, how loud
// it plays (gain), and how far it carries (ref / range in metres).
export const FX_INFO = {
  carbid_boom_0: { cat: 'explosie', label: 'Carbidknal (A)', gain: 1.0, ref: 22, range: 3000 },
  carbid_boom_1: { cat: 'explosie', label: 'Carbidknal (B)', gain: 1.0, ref: 22, range: 3000 },
  carbid_boom_2: { cat: 'explosie', label: 'Carbidknal (C)', gain: 1.0, ref: 22, range: 3000 },
  carbid_fuse: { cat: 'wapen', label: 'Carbid: lont sist', gain: 0.6, ref: 3, range: 60 },
  explosion_boom_0: { cat: 'explosie', label: 'Explosie (A)', gain: 1.0, ref: 16, range: 2500 },
  explosion_boom_1: { cat: 'explosie', label: 'Explosie (B)', gain: 1.0, ref: 16, range: 2500 },
  shop_bell: { cat: 'winkel', label: 'Winkelbel bij de deur', gain: 0.45, ref: 3, range: 40 },
  bridge_clunk: { cat: 'brug', label: 'Brug: vergrendeling en kettingen', gain: 0.7, ref: 10, range: 200 },
  train_pass: { cat: 'spoor', label: 'Trein dendert voorbij', gain: 0.8, ref: 25, range: 500 },
  rail_squeal: { cat: 'spoor', label: 'Remmende trein piept', gain: 0.4, ref: 15, range: 300 },
  ship_horn: { cat: 'water', label: 'Scheepshoorn', gain: 0.7, ref: 30, range: 1200 },
  kermis_ding: { cat: 'kermis', label: 'Kermis: kop van Jut (klap en bel)', gain: 0.6, ref: 5, range: 120 },
  splash_big: { cat: 'water', label: 'Grote plons', gain: 0.7, ref: 6, range: 120 },
  door_wood_open: { cat: 'deur', label: 'Houten deur open', gain: 0.5, ref: 3, range: 40 },
  firework_burst_0: { cat: 'explosie', label: 'Vuurwerkbom (A)', gain: 0.85, ref: 40, range: 3200 },
  firework_burst_1: { cat: 'explosie', label: 'Vuurwerkbom (B)', gain: 0.85, ref: 40, range: 3200 },
  firework_burst_2: { cat: 'explosie', label: 'Vuurwerkbom (C)', gain: 0.85, ref: 40, range: 3200 },
  crossing_bell: { cat: 'spoor', label: 'Overwegbel (een slag)', gain: 0.6, ref: 6, range: 130 },
  door_wood_close: { cat: 'deur', label: 'Houten deur dicht', gain: 0.55, ref: 3, range: 40 },
};

function boomLayers(d, sr, R, { size = 1, tail = 3, echoes = 4 } = {}) {
  const j = () => 0.9 + R() * 0.2;
  // the sharp tik and crack at the front, then the body of the bang
  nb(d, sr, 0, R, { type: 'hp', f: 5200 * j(), q: 0.7, tau: 0.0018, amp: 1.5 });
  nb(d, sr, 0, R, { f: 2400 * j(), q: 1.1, tau: 0.012, amp: 1.3, attack: 0.0004 });
  nb(d, sr, 0.001, R, { f: 1100 * j(), q: 0.8, tau: 0.045 * size, amp: 1.2 });
  nb(d, sr, 0.001, R, { type: 'lp', f: 700 * j(), q: 0.7, tau: 0.16 * size, amp: 1.5 });
  // sub thump plus a 110-130 Hz layer so small speakers still carry it
  thump(d, sr, 0, 52 * j(), 0.34 * size, 1.9);
  thump(d, sr, 0, 118 * j(), 0.12 * size, 1.1);
  // rolling low tail
  nb(d, sr, 0.04, R, { type: 'lp', f: 320 * j(), q: 0.7, tau: 0.8 * size, amp: 0.7, attack: 0.03, len: tail });
  // reflections off facades and farmland: later, darker, quieter
  let t = 0.16 + R() * 0.08, a = 0.5;
  for (let k = 0; k < echoes; k++) {
    nb(d, sr, t, R, { type: 'lp', f: 1500 - k * 220, q: 0.6, tau: 0.08 + k * 0.05, amp: a, attack: 0.004, len: 0.6 });
    thump(d, sr, t, 70, 0.1, a * 0.7);
    t += 0.14 + R() * 0.2 + k * 0.1;
    a *= 0.6;
  }
}

for (let v = 0; v < 3; v++) defSample(`carbid_boom_${v}`, 3.8, (c, sr, R) => boomLayers(c[0], sr, R, { size: 1.15, tail: 3.2, echoes: 5 }), { peak: 0.95 });
for (let v = 0; v < 2; v++) {
  defSample(`explosion_boom_${v}`, 3.4, (c, sr, R) => {
    const d = c[0];
    boomLayers(d, sr, R, { size: 1, tail: 2.8, echoes: 3 });
    nb(d, sr, 0.03, R, { f: 900, q: 0.6, tau: 0.35, amp: 0.8, attack: 0.01 });
    for (let k = 0; k < 8; k++) addPartials(d, sr, 0.25 + R() * 1.6, 500 + R() * 2200, [[1, 0.25, 0.04], [2.76, 0.12, 0.03]], 0.5, R);
  }, { peak: 0.95 });
}

defSample('carbid_fuse', 1.9, (c, sr, R) => {
  const d = c[0];
  nb(d, sr, 0, R, { type: 'hp', f: 4800, q: 0.7, tau: 0.9, amp: 0.6, attack: 0.05, len: 1.8 });
  nb(d, sr, 0, R, { f: 7000, q: 1.2, tau: 0.7, amp: 0.3, len: 1.8 });
  for (let k = 0; k < 14; k++) click(d, sr, R, 0.05 + R() * 1.7, 3500 + R() * 3000, 0.2 + R() * 0.3);
}, { peak: 0.7 });

defSample('shop_bell', 1.3, (c, sr, R) => {
  const d = c[0], f = 2350 + R() * 250;
  for (const t of [0, 0.22]) {
    addPartials(d, sr, t, f, [[1, 1, 0.35], [2.32, 0.55, 0.22], [4.1, 0.3, 0.12], [6.3, 0.15, 0.06]], t ? 0.7 : 1, R);
    nb(d, sr, t, R, { f: 5200, q: 3, tau: 0.006, amp: 0.5 });
  }
}, { peak: 0.8 });

defSample('bridge_clunk', 2.2, (c, sr, R) => {
  const d = c[0];
  thump(d, sr, 0, 70, 0.1, 1.4);
  nb(d, sr, 0, R, { f: 900, q: 1.5, tau: 0.04, amp: 1 });
  addPartials(d, sr, 0.005, 210 + R() * 40, [[1, 0.6, 0.35], [2.7, 0.35, 0.25], [5.1, 0.2, 0.12]], 0.7, R);
  // chains running over the wheels
  for (let k = 0; k < 16; k++) {
    const t = 0.25 + k * 0.07 + R() * 0.03;
    click(d, sr, R, t, 4200 + R() * 1200, 0.5 - k * 0.02);
    nb(d, sr, t, R, { f: 5000, q: 6, tau: 0.01, amp: 0.4 });
  }
  thump(d, sr, 1.5, 62, 0.12, 0.9);
}, { peak: 0.9 });

defSample('train_pass', 5, (c, sr, R, len) => {
  const d = c[0], lp = bq('lp', 420, 0.7, sr), mid = bq('bp', 1300, 0.7, sr);
  for (let i = 0; i < d.length; i++) {
    const t = i / sr, e = Math.exp(-(((t - 2.2) / 1.1) ** 2));
    const n = R() * 2 - 1;
    d[i] = lp.run(n) * e * 1.3 + mid.run(n) * e * e * 0.4;
  }
  // wheel sets over the joints, quickest at the heart of the pass
  for (let t = 0.8; t < len - 0.5;) {
    const e = Math.exp(-(((t - 2.2) / 1.2) ** 2));
    thump(d, sr, t, 85, 0.05, 0.8 * e);
    click(d, sr, R, t, 2600, 0.4 * e);
    t += 0.42 - 0.2 * e;
  }
}, { rate: 22050, peak: 0.9 });

defSample('rail_squeal', 1.6, (c, sr, R) => {
  const d = c[0], f = 2300 + R() * 500;
  addTone(d, sr, 0, 1.5, R, { f0: f, f1: f * 0.8, amp: 0.5, attack: 0.15, release: 0.5, vib: 0.012, vibRate: 11, shape: 'rich' });
  addTone(d, sr, 0.05, 1.4, R, { f0: f * 1.51, f1: f * 1.2, amp: 0.3, attack: 0.2, release: 0.5, vib: 0.02, vibRate: 7 });
  nb(d, sr, 0, R, { type: 'hp', f: 3500, q: 0.7, tau: 0.5, amp: 0.25, attack: 0.1, len: 1.5 });
}, { rate: 22050, peak: 0.7 });

defSample('ship_horn', 2.6, (c, sr, R) => {
  const d = c[0], f = 92 + R() * 12;
  addTone(d, sr, 0, 2.2, R, { f0: f, amp: 0.8, attack: 0.12, release: 0.5, shape: 'saw' });
  addTone(d, sr, 0, 2.2, R, { f0: f * 1.5, amp: 0.4, attack: 0.14, release: 0.5, shape: 'rich', vib: 0.003, vibRate: 5 });
  addTone(d, sr, 0, 2.2, R, { f0: f * 2.01, amp: 0.3, attack: 0.16, release: 0.5, shape: 'rich' });
  nb(d, sr, 0, R, { type: 'lp', f: 500, q: 0.7, tau: 0.8, amp: 0.15, attack: 0.1, len: 2.2 });
  // the low pass keeps it a ship, not a car: saw edges off
  const lp = bq('lp', 900, 0.7, sr);
  for (let i = 0; i < d.length; i++) d[i] = lp.run(d[i]);
}, { rate: 22050, peak: 0.85 });

defSample('kermis_ding', 1.8, (c, sr, R) => {
  const d = c[0];
  thump(d, sr, 0, 110, 0.05, 1.3);
  nb(d, sr, 0, R, { f: 1400, q: 0.9, tau: 0.02, amp: 1 });
  addPartials(d, sr, 0.28, 1760 + R() * 120, [[1, 1, 0.9], [2.01, 0.35, 0.5], [3.02, 0.2, 0.3], [5.4, 0.1, 0.15]], 0.8, R);
}, { peak: 0.9 });

defSample('splash_big', 1.6, (c, sr, R) => {
  const d = c[0];
  nb(d, sr, 0, R, { type: 'lp', f: 1200, q: 0.7, tau: 0.12, amp: 1.2 });
  nb(d, sr, 0, R, { f: 2800, q: 0.7, tau: 0.07, amp: 0.9 });
  thump(d, sr, 0.01, 75, 0.12, 1.1);
  for (let k = 0; k < 24; k++) addTone(d, sr, 0.08 + R() * 1.1, 0.04, R, { f0: 500 + R() * 600, f1: 1400 + R() * 800, amp: 0.1 + R() * 0.15, attack: 0.003, release: 0.02 });
  nb(d, sr, 0.15, R, { type: 'hp', f: 3000, q: 0.7, tau: 0.35, amp: 0.3, attack: 0.05, len: 1.2 });
}, { peak: 0.9 });

defSample('door_wood_open', 0.8, (c, sr, R) => {
  const d = c[0];
  click(d, sr, R, 0, 1800, 0.8);
  thump(d, sr, 0.01, 130, 0.025, 0.5);
  addTone(d, sr, 0.05, 0.5, R, { f0: 180 + R() * 40, f1: 340 + R() * 60, amp: 0.2, attack: 0.1, release: 0.2, shape: 'saw', vib: 0.04, vibRate: 27 });
  nb(d, sr, 0.05, R, { f: 900, q: 1.5, tau: 0.2, amp: 0.2, attack: 0.1, len: 0.5 });
}, { rate: 22050, peak: 0.8 });

defSample('door_wood_close', 0.7, (c, sr, R) => {
  const d = c[0];
  addTone(d, sr, 0, 0.3, R, { f0: 300 + R() * 40, f1: 180, amp: 0.15, attack: 0.05, release: 0.15, shape: 'saw', vib: 0.04, vibRate: 25 });
  thump(d, sr, 0.28, 95, 0.07, 1.2);
  nb(d, sr, 0.28, R, { type: 'lp', f: 1000, q: 0.7, tau: 0.05, amp: 1 });
  click(d, sr, R, 0.3, 2200, 0.6);
  addPartials(d, sr, 0.28, 240, [[1, 0.3, 0.12], [2.3, 0.15, 0.08]], 0.6, R);
}, { rate: 22050, peak: 0.85 });

// Cutscene vehicles (issues #117, #173): a siren and an engine that pass by,
// a tyre screech. Whole passes with their own swell, so a scene can fire one
// when the prop starts to move.
FX_INFO.siren_pass = { cat: 'voertuig', label: 'Sirene rijdt voorbij', gain: 0.6, ref: 25, range: 600 };
FX_INFO.car_pass = { cat: 'voertuig', label: 'Auto rijdt voorbij', gain: 0.6, ref: 15, range: 300 };
FX_INFO.tyre_screech = { cat: 'voertuig', label: 'Piepende banden', gain: 0.5, ref: 12, range: 200 };

defSample('siren_pass', 6, (c, sr, R, len) => {
  const d = c[0], lp = bq('lp', 2600, 0.7, sr);
  // two-tone Dutch wail (high-low), louder at the middle of the pass
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / sr, e = Math.exp(-(((t - 3) / 1.7) ** 2));
    const hi = Math.floor(t / 0.5) % 2 === 0;
    const f = (hi ? 960 : 770) * (1 + 0.06 * Math.tanh((3 - t) / 1.5)); // the pitch drops while it passes
    ph += 2 * Math.PI * f / sr;
    d[i] = lp.run(Math.sign(Math.sin(ph)) * 0.5 + Math.sin(ph * 2) * 0.15) * e;
  }
}, { rate: 22050, peak: 0.8 });

defSample('car_pass', 4, (c, sr, R) => {
  const d = c[0], lp = bq('lp', 700, 0.7, sr), mid = bq('bp', 1800, 0.8, sr);
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / sr, e = Math.exp(-(((t - 1.8) / 0.9) ** 2));
    const f = 70 * (1 + 0.25 * Math.tanh((1.8 - t) / 0.5)) * (1 + 0.1 * Math.sin(t * 9));
    ph += 2 * Math.PI * f / sr;
    const n = R() * 2 - 1;
    d[i] = (Math.sin(ph) * 0.5 + Math.sin(ph * 2) * 0.3 + Math.sin(ph * 3) * 0.15 + lp.run(n) * 0.5 + mid.run(n) * 0.15) * e;
  }
}, { rate: 22050, peak: 0.8 });

defSample('tyre_screech', 1.4, (c, sr, R) => {
  const d = c[0], f = 1500 + R() * 400;
  addTone(d, sr, 0, 1.2, R, { f0: f, f1: f * 0.85, amp: 0.4, attack: 0.05, release: 0.4, vib: 0.03, vibRate: 31, shape: 'rich' });
  nb(d, sr, 0, R, { f: 2600, q: 2, tau: 0.5, amp: 0.7, attack: 0.04, len: 1.2 });
  nb(d, sr, 0, R, { type: 'hp', f: 4000, q: 0.7, tau: 0.4, amp: 0.3, attack: 0.04, len: 1.2 });
}, { rate: 22050, peak: 0.75 });

// Vehicle parts (issues #173, #131): a door, bonnet or tailgate that tears
// off in a crash, a bonnet or boot lid that bangs, a bus door hiss. Linked
// in sfx/linkups.js from the door state of vehicledoors.js.
FX_INFO.part_rip = { cat: 'voertuig', label: 'Deur of kap scheurt los', gain: 0.8, ref: 10, range: 250 };
FX_INFO.hood_thump = { cat: 'voertuig', label: 'Kap of kofferbak slaat dicht', gain: 0.55, ref: 4, range: 60 };
FX_INFO.bus_door_hiss = { cat: 'voertuig', label: 'Busdeur sist open of dicht', gain: 0.7, ref: 6, range: 80 };

defSample('part_rip', 1.8, (c, sr, R) => {
  const d = c[0];
  // sheet metal tearing off its hinges, then the panel hitting the road and rattling
  nb(d, sr, 0, R, { f: 2600, q: 1.2, tau: 0.09, amp: 1.2, attack: 0.002 });
  addTone(d, sr, 0, 0.25, R, { f0: 420, f1: 190, amp: 0.4, attack: 0.01, release: 0.1, shape: 'saw', vib: 0.08, vibRate: 40 });
  thump(d, sr, 0.04, 80, 0.08, 1.0);
  for (let k = 0; k < 3; k++) {
    const t = 0.35 + k * 0.17 + R() * 0.05, a = 1 - k * 0.3;
    thump(d, sr, t, 95 + R() * 30, 0.06, 0.9 * a);
    addPartials(d, sr, t, 260 + R() * 120, [[1, 0.5, 0.12], [2.76, 0.3, 0.1], [5.4, 0.15, 0.06]], 0.7 * a, R);
    nb(d, sr, t, R, { f: 3400, q: 2, tau: 0.03, amp: 0.5 * a });
  }
  nb(d, sr, 0.9, R, { type: 'hp', f: 4200, q: 3, tau: 0.1, amp: 0.2, len: 0.8 });
}, { rate: 22050, peak: 0.9 });

defSample('hood_thump', 0.6, (c, sr, R) => {
  const d = c[0];
  thump(d, sr, 0, 110, 0.07, 1.2);
  nb(d, sr, 0, R, { type: 'lp', f: 1200, q: 0.7, tau: 0.04, amp: 1 });
  addPartials(d, sr, 0, 190 + R() * 40, [[1, 0.4, 0.1], [2.4, 0.25, 0.07]], 0.6, R);
  click(d, sr, R, 0.005, 3000, 0.5);
}, { rate: 22050, peak: 0.8 });

defSample('bus_door_hiss', 1.3, (c, sr, R) => {
  const d = c[0];
  nb(d, sr, 0, R, { type: 'hp', f: 3800, q: 0.7, tau: 0.35, amp: 0.8, attack: 0.04, len: 1.1 });
  nb(d, sr, 0, R, { f: 6200, q: 1.5, tau: 0.25, amp: 0.4, attack: 0.04, len: 1.0 });
  thump(d, sr, 0.9, 90, 0.05, 0.5);
}, { rate: 22050, peak: 0.6 });

// Locks (issues #173, x4-sluizen): the gates groan open and shut, the chamber
// fills or empties with rushing water. Linked in sfx/linkups.js (rule 'sluis')
// from the state of sluizen.js.
FX_INFO.sluis_poort = { cat: 'brug', label: 'Sluis: poort kreunt en klinkt', gain: 0.7, ref: 12, range: 220 };
FX_INFO.sluis_stroom = { cat: 'water', label: 'Sluis: water stroomt', gain: 0.6, ref: 12, range: 200 };

defSample('sluis_poort', 3.2, (c, sr, R) => {
  const d = c[0], f = 62 + R() * 8;
  // heavy gate: a low groan that wanders, creaking joints, then the clunk of the stop
  addTone(d, sr, 0, 2.6, R, { f0: f, f1: f * 1.35, amp: 0.7, attack: 0.3, release: 0.6, shape: 'saw', vib: 0.05, vibRate: 7 });
  addTone(d, sr, 0.2, 2.2, R, { f0: f * 2.7, f1: f * 2.1, amp: 0.25, attack: 0.4, release: 0.6, shape: 'rich', vib: 0.08, vibRate: 11 });
  for (let k = 0; k < 9; k++) addTone(d, sr, 0.3 + R() * 2.1, 0.12, R, { f0: 380 + R() * 500, f1: 260 + R() * 300, amp: 0.15, attack: 0.01, release: 0.08, shape: 'saw', vib: 0.1, vibRate: 30 });
  thump(d, sr, 2.7, 58, 0.12, 1.2);
  nb(d, sr, 2.7, R, { f: 900, q: 1.2, tau: 0.04, amp: 0.8 });
  const lp = bq('lp', 700, 0.7, sr);
  for (let i = 0; i < d.length; i++) d[i] = lp.run(d[i]) * 1.4;
}, { rate: 22050, peak: 0.85 });

defSample('sluis_stroom', 6, (c, sr, R, len) => {
  const d = c[0], lp = bq('lp', 900, 0.7, sr), hp = bq('hp', 3000, 0.7, sr);
  for (let i = 0; i < d.length; i++) {
    const t = i / sr, e = Math.min(1, t / 0.8) * Math.min(1, (len - t) / 1.2);
    const n = R() * 2 - 1, w = 1 + 0.35 * Math.sin(t * 2.3) + 0.2 * Math.sin(t * 5.1);
    d[i] = (lp.run(n) * 0.9 * w + hp.run(n) * 0.18 * w * w) * e;
  }
}, { rate: 22050, peak: 0.7 });

// Fireworks (#131): a shell opening is a hard crack, a low thump you feel, a
// short bloom of noise and then glitter crackling down for two seconds. Every
// variant scatters its own pops.
for (let v = 0; v < 3; v++) defSample(`firework_burst_${v}`, 2.8, (c, sr, R) => {
  const d = c[0], j = () => 0.9 + R() * 0.2;
  nb(d, sr, 0, R, { type: 'hp', f: 4800 * j(), q: 0.7, tau: 0.004, amp: 1.5 });
  nb(d, sr, 0, R, { f: 2000 * j(), q: 0.9, tau: 0.03, amp: 1.1, attack: 0.0005 });
  nb(d, sr, 0.002, R, { type: 'lp', f: 900 * j(), q: 0.7, tau: 0.22, amp: 1.0 });
  thump(d, sr, 0, 78 * j(), 0.3, 1.5);
  const n = 34 + Math.floor(R() * 14);
  for (let k = 0; k < n; k++) {
    const u = Math.pow(R(), 1.6);
    nb(d, sr, 0.14 + u * 2.1, R, { f: 3200 + R() * 4200, q: 2.5, tau: 0.003 + R() * 0.006, amp: (0.55 - 0.35 * u) * (0.4 + R() * 0.6), attack: 0.0003 });
  }
}, { peak: 0.9 });

// Level-crossing bell: a hard steel strike, bright and short, ringing out on its own.
defSample('crossing_bell', 0.9, (c, sr, R) => {
  const d = c[0], f = 1450 + R() * 100;
  addPartials(d, sr, 0, f, [[1, 1, 0.16], [1.006, 0.7, 0.2], [2.76, 0.45, 0.09], [5.4, 0.2, 0.04]], 1, R);
  nb(d, sr, 0, R, { type: 'hp', f: 4200, q: 1.5, tau: 0.004, amp: 0.5 });
}, { peak: 0.85 });

// The thin ones (issue #173, level report of scripts/qa/sfx_levels.mjs): swinging a weapon,
// a house door, the engine switching off, the alarm, the camera and the empty click were
// plain synth bursts 20 dB under the rest. Rendered here with a body, a start and a tail;
// audio.js plays them first and keeps the old synth as the fallback while a sample renders.
FX_INFO.swing_whoosh_0 = { cat: 'wapen', label: 'Zwaai met een wapen (A)', gain: 0.85, ref: 3, range: 45 };
FX_INFO.swing_whoosh_1 = { cat: 'wapen', label: 'Zwaai met een wapen (B)', gain: 0.85, ref: 3, range: 45 };
FX_INFO.swing_whoosh_2 = { cat: 'wapen', label: 'Zwaai met een wapen (C)', gain: 0.85, ref: 3, range: 45 };
FX_INFO.door_house_open = { cat: 'deur', label: 'Huisdeur open', gain: 0.8, ref: 3, range: 45 };
FX_INFO.door_house_close = { cat: 'deur', label: 'Huisdeur dicht', gain: 0.9, ref: 3, range: 50 };
FX_INFO.engine_off = { cat: 'voertuig', label: 'Motor slaat af', gain: 0.8, ref: 5, range: 70 };
FX_INFO.alarm_ring = { cat: 'omgeving', label: 'Alarm loeit', gain: 0.8, ref: 8, range: 160 };
FX_INFO.camera_click = { cat: 'ui', label: 'Camera: spiegel en sluiter', gain: 0.9, ref: 3, range: 40 };
FX_INFO.empty_click = { cat: 'wapen', label: 'Leeg: klik', gain: 0.9, ref: 2, range: 30 };

// a whoosh: a band of noise that sweeps up through the swing and falls away
for (let v = 0; v < 3; v++) defSample(`swing_whoosh_${v}`, 0.5, (c, sr, R) => {
  const d = c[0], j = () => 0.9 + R() * 0.2, base = 520 + v * 90;
  for (let k = 0; k < 5; k++) nb(d, sr, 0.015 + k * 0.035, R, { f: base * (1 + k * 0.55) * j(), q: 1.3, tau: 0.05, amp: 0.55 + k * 0.08, attack: 0.03 });
  nb(d, sr, 0.04, R, { type: 'hp', f: 2800, q: 0.7, tau: 0.08, amp: 0.25, attack: 0.04, len: 0.3 });
  thump(d, sr, 0.0, 95 * j(), 0.06, 0.25);
}, { rate: 22050, peak: 0.75 });

defSample('door_house_open', 0.9, (c, sr, R) => {
  const d = c[0];
  // handle, latch, then the door swinging off its stop
  click(d, sr, R, 0, 2600, 0.9);
  nb(d, sr, 0.004, R, { f: 1700, q: 2, tau: 0.012, amp: 0.9 });
  thump(d, sr, 0.05, 120, 0.03, 0.55);
  addTone(d, sr, 0.09, 0.5, R, { f0: 150 + R() * 30, f1: 290 + R() * 40, amp: 0.16, attack: 0.1, release: 0.2, shape: 'saw', vib: 0.05, vibRate: 24 });
  nb(d, sr, 0.1, R, { f: 700, q: 1.5, tau: 0.25, amp: 0.25, attack: 0.1, len: 0.5 });
}, { rate: 22050, peak: 0.85 });

defSample('door_house_close', 0.7, (c, sr, R) => {
  const d = c[0];
  // the slam: body, the door hitting its frame, the latch snapping
  thump(d, sr, 0, 88, 0.12, 1.5);
  nb(d, sr, 0, R, { type: 'lp', f: 900, q: 0.7, tau: 0.07, amp: 1.2 });
  nb(d, sr, 0, R, { f: 2600, q: 1.3, tau: 0.012, amp: 0.8 });
  click(d, sr, R, 0.045, 2100, 0.7);
  addPartials(d, sr, 0, 210 + R() * 30, [[1, 0.3, 0.12], [2.3, 0.15, 0.08]], 0.6, R);
}, { rate: 22050, peak: 0.9 });

defSample('engine_off', 1.6, (c, sr, R) => {
  const d = c[0], f = 58 + R() * 6;
  // a last cough as the revs fall away, then the metal ticking while it cools
  addTone(d, sr, 0, 0.7, R, { f0: f * 2.1, f1: f * 0.55, amp: 0.55, attack: 0.01, release: 0.3, shape: 'saw', vib: 0.03, vibRate: 13 });
  addTone(d, sr, 0, 0.6, R, { f0: f * 4.2, f1: f * 1.2, amp: 0.2, attack: 0.01, release: 0.3, shape: 'saw' });
  thump(d, sr, 0.55, f * 1.1, 0.07, 0.8);
  for (let k = 0; k < 7; k++) click(d, sr, R, 0.9 + k * (0.08 + k * 0.03) + R() * 0.02, 2800 + R() * 800, 0.4 - k * 0.04);
  const lp = bq('lp', 1100, 0.7, sr);
  for (let i = 0; i < d.length; i++) d[i] = lp.run(d[i]) * 1.5;
}, { rate: 22050, peak: 0.8 });

defSample('alarm_ring', 2.6, (c, sr, R, len) => {
  const d = c[0], lp = bq('lp', 4200, 0.7, sr);
  // a burglar bell: two tones that alternate five times a second, a hard edge and a little shimmer
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / sr, hi = Math.floor(t * 5) % 2 === 0, f = hi ? 1320 : 990;
    ph += 2 * Math.PI * f / sr;
    const e = Math.min(1, t / 0.02) * Math.min(1, (len - t) / 0.15);
    const edge = 0.5 + 0.5 * Math.sin(t * 5 * Math.PI * 2 - 1.2);
    d[i] = lp.run(Math.sign(Math.sin(ph)) * 0.55 + Math.sin(ph * 3) * 0.12) * e * (0.75 + 0.25 * edge);
  }
}, { rate: 22050, peak: 0.8 });

defSample('camera_click', 0.35, (c, sr, R) => {
  const d = c[0];
  // mirror slap, then the shutter curtain
  thump(d, sr, 0, 150, 0.015, 0.7);
  click(d, sr, R, 0, 3200, 0.9);
  nb(d, sr, 0, R, { f: 2400, q: 2, tau: 0.01, amp: 0.8 });
  click(d, sr, R, 0.075, 2600, 0.7);
  nb(d, sr, 0.075, R, { f: 3800, q: 2, tau: 0.008, amp: 0.6 });
  thump(d, sr, 0.075, 190, 0.012, 0.35);
}, { rate: 22050, peak: 0.8 });

defSample('empty_click', 0.3, (c, sr, R) => {
  const d = c[0];
  // a dry hammer falling on nothing: a tik, then a smaller tok from the spring
  click(d, sr, R, 0, 3400, 0.9);
  nb(d, sr, 0, R, { f: 3000, q: 2.5, tau: 0.01, amp: 0.9 });
  addPartials(d, sr, 0, 1900 + R() * 200, [[1, 0.6, 0.02], [2.4, 0.3, 0.015]], 0.35, R);
  click(d, sr, R, 0.07, 2300, 0.45);
}, { rate: 22050, peak: 0.8 });

// Minigames that had a voice but no foley (#460): discgolf, the skatepark and
// the climbing tower. One set per game, all synth and all short; the event ->
// effect table is sfx/minigamefoley.js, the level and reach are here.
FX_INFO.disc_whoosh = { cat: 'sport', label: 'Discgolf: de disc verlaat de hand', gain: 0.85, ref: 4, range: 45 };
FX_INFO.disc_ketting = { cat: 'sport', label: 'Discgolf: disc in de kettingen', gain: 1.15, ref: 6, range: 70 };
FX_INFO.disc_boom = { cat: 'sport', label: 'Discgolf: disc tegen een boom', gain: 0.75, ref: 5, range: 55 };
FX_INFO.skate_pop = { cat: 'sport', label: 'Skateboard: de tail tikt op het beton', gain: 0.85, ref: 4, range: 45 };
FX_INFO.skate_land = { cat: 'sport', label: 'Skateboard: landing', gain: 0.75, ref: 4, range: 45 };
FX_INFO.skate_grind = { cat: 'sport', label: 'Skateboard over een leuning', gain: 0.7, ref: 5, range: 55 };
FX_INFO.skate_val = { cat: 'sport', label: 'Skateboard: val op het beton', gain: 0.8, ref: 5, range: 60 };
FX_INFO.klim_greep = { cat: 'sport', label: 'Klimtoren: hand op de greep', gain: 0.8, ref: 2.5, range: 25 };
FX_INFO.klim_kalk = { cat: 'sport', label: 'Klimtoren: magnesium', gain: 0.6, ref: 2.5, range: 20 };
FX_INFO.klim_val = { cat: 'sport', label: 'Klimtoren: val op de mat', gain: 0.7, ref: 4, range: 45 };

defSample('disc_whoosh', 0.55, (c, sr, R) => {
  const d = c[0], j = () => 0.9 + R() * 0.2;
  // a disc leaving the hand: a band of air that opens while the arm swings
  // through and falls away, with the rim hissing over the top
  for (let k = 0; k < 4; k++) {
    nb(d, sr, 0.008 + k * 0.045, R, { f: (680 + k * 430) * j(), q: 1.1, tau: 0.055 + k * 0.02, amp: 0.45 + k * 0.12, attack: 0.02 });
  }
  nb(d, sr, 0.02, R, { type: 'hp', f: 2600 * j(), q: 0.7, tau: 0.14, amp: 0.18, attack: 0.03, len: 0.4 });
  thump(d, sr, 0, 120, 0.03, 0.2);
}, { rate: 22050, peak: 0.7 });

defSample('disc_ketting', 1.4, (c, sr, R) => {
  const d = c[0];
  // the signature of disc golf: the disc hits the chains. A hard clank high up,
  // a little body, then the loose links settling one after another
  thump(d, sr, 0, 150 + R() * 30, 0.03, 0.35);
  nb(d, sr, 0, R, { type: 'hp', f: 5200, q: 0.8, tau: 0.006, amp: 0.9 });
  nb(d, sr, 0, R, { f: 3400, q: 1.6, tau: 0.02, amp: 0.8 });
  addPartials(d, sr, 0, 1240 + R() * 120, [[1, 0.45, 0.1], [1.51, 0.5, 0.12], [2.76, 0.45, 0.08], [4.1, 0.3, 0.05], [6.4, 0.2, 0.03]], 0.8, R);
  for (let k = 0; k < 26; k++) {
    const t = 0.04 + Math.pow(R(), 1.3) * 0.9;
    const a = Math.max(0.05, 1 - t / 1.05) * (0.3 + R() * 0.4);
    click(d, sr, R, t, 3600 + R() * 3000, a);
    nb(d, sr, t, R, { f: 5200 + R() * 4000, q: 3, tau: 0.007, amp: a * 0.8 });
  }
}, { rate: 22050, peak: 0.85 });

defSample('disc_boom', 0.7, (c, sr, R) => {
  const d = c[0];
  // a disc into a trunk: a dull wooden knock, a short body, then leaves
  thump(d, sr, 0, 170 + R() * 40, 0.05, 0.9);
  nb(d, sr, 0, R, { type: 'lp', f: 1600, q: 0.8, tau: 0.03, amp: 0.9 });
  addPartials(d, sr, 0, 320 + R() * 90, [[1, 0.4, 0.08], [2.3, 0.2, 0.05]], 0.6, R);
  nb(d, sr, 0.05, R, { type: 'hp', f: 4200, q: 0.9, tau: 0.22, amp: 0.14, attack: 0.03, len: 0.5 });
}, { rate: 22050, peak: 0.8 });

defSample('skate_pop', 0.35, (c, sr, R) => {
  const d = c[0];
  // the tail snapping the deck on the concrete: a sharp tik, the deck's own note
  click(d, sr, R, 0, 3000 + R() * 500, 1);
  nb(d, sr, 0, R, { type: 'hp', f: 3800, q: 0.8, tau: 0.008, amp: 0.7 });
  nb(d, sr, 0, R, { f: 2400, q: 1.6, tau: 0.012, amp: 0.8 });
  thump(d, sr, 0.004, 150, 0.015, 0.22);
  addPartials(d, sr, 0.003, 660 + R() * 80, [[1, 0.35, 0.05], [2.7, 0.22, 0.03]], 0.45, R);
}, { rate: 22050, peak: 0.8 });

defSample('skate_land', 0.45, (c, sr, R) => {
  const d = c[0];
  // four wheels come down together: a low bump, the trucks chattering
  thump(d, sr, 0, 95, 0.05, 1);
  nb(d, sr, 0, R, { type: 'lp', f: 1200, q: 0.8, tau: 0.04, amp: 0.9 });
  for (let k = 0; k < 5; k++) click(d, sr, R, 0.01 + k * 0.012 + R() * 0.01, 2200 + R() * 1800, 0.35 - k * 0.05);
  nb(d, sr, 0.02, R, { f: 3000, q: 1.2, tau: 0.06, amp: 0.3 });
}, { rate: 22050, peak: 0.85 });

defSample('skate_grind', 1, (c, sr, R, len) => {
  const d = c[0], bp = bq('bp', 2600, 1.4, sr), hp = bq('hp', 5200, 0.7, sr);
  // steel on steel: a band of noise that wanders with the speed, a hard sheen
  // on top and the deck rattling along
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    if ((i & 63) === 0) bp.set(2300 + 700 * Math.sin(t * 9) + 400 * Math.sin(t * 31), 1.4);
    const n = R() * 2 - 1, e = Math.min(1, t / 0.05) * Math.min(1, (len - t) / 0.12);
    d[i] = (bp.run(n) * 1.1 + hp.run(n) * 0.35) * e * (0.7 + 0.3 * Math.sin(t * 61));
  }
  thump(d, sr, 0, 80, 0.05, 0.3);
}, { rate: 22050, peak: 0.75 });

defSample('skate_val', 0.9, (c, sr, R) => {
  const d = c[0];
  // a bail: the body on the concrete, then the board clattering off on its own
  thump(d, sr, 0, 85, 0.09, 1.2);
  nb(d, sr, 0, R, { type: 'lp', f: 900, q: 0.7, tau: 0.09, amp: 1.1 });
  nb(d, sr, 0.02, R, { f: 2600, q: 1.1, tau: 0.05, amp: 0.5 });
  for (let k = 0; k < 4; k++) {
    const t = 0.12 + k * 0.13 + R() * 0.04;
    click(d, sr, R, t, 1800 + R() * 1600, 0.4 - k * 0.08);
    thump(d, sr, t, 120, 0.03, 0.3 - k * 0.06);
  }
}, { rate: 22050, peak: 0.85 });

defSample('klim_greep', 0.3, (c, sr, R) => {
  const d = c[0];
  // a chalked hand closing on a resin hold: a soft thwack and a little squeak
  thump(d, sr, 0, 210 + R() * 40, 0.02, 0.6);
  nb(d, sr, 0, R, { type: 'lp', f: 1400, q: 1.2, tau: 0.02, amp: 0.9 });
  addTone(d, sr, 0.004, 0.07, R, { f0: 620 + R() * 120, f1: 380, amp: 0.14, attack: 0.002, release: 0.02, shape: 'rich' });
}, { rate: 22050, peak: 0.7 });

defSample('klim_kalk', 0.5, (c, sr, R) => {
  const d = c[0];
  // chalk between the hands: a dry puff, no tone at all
  nb(d, sr, 0, R, { type: 'hp', f: 2400, q: 0.9, tau: 0.12, amp: 0.7, attack: 0.02, len: 0.4 });
  nb(d, sr, 0.01, R, { f: 1500, q: 1.1, tau: 0.06, amp: 0.4, attack: 0.02 });
  thump(d, sr, 0, 240, 0.01, 0.2);
}, { rate: 22050, peak: 0.6 });

defSample('klim_val', 0.8, (c, sr, R) => {
  const d = c[0];
  // off the wall onto the mat: a deep soft landing, the rope and the mat settling
  thump(d, sr, 0, 70, 0.09, 1.3);
  nb(d, sr, 0, R, { type: 'lp', f: 600, q: 0.8, tau: 0.1, amp: 1 });
  nb(d, sr, 0.01, R, { f: 1200, q: 1, tau: 0.05, amp: 0.35 });
  for (let k = 0; k < 3; k++) click(d, sr, R, 0.2 + k * 0.15 + R() * 0.05, 1600 + R() * 900, 0.15 - k * 0.04);
}, { rate: 22050, peak: 0.8 });
