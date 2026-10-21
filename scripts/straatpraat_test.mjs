// Straatpraat (game/js/straatpraat.js, #190): het plan van een gesprek, de keuze van de sprekers
// en de tik die de tekstbellen boven wandelaars zet.
//   node scripts/straatpraat_test.mjs
import { GEBABBEL, AREAS, PARTS, WETS, rollGebabbel, gebabbelFor } from '../game/js/gebabbel.js';
import * as SP from '../game/js/straatpraat.js';
import { mulberry32 } from '../game/js/rng.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

// plan: sprekers 0/1, oplopende tijden, leestijd binnen grenzen
for (const g of GEBABBEL) {
  const pl = SP.planGesprek(g);
  ok(pl.lines.length === g.lines.length, 'alle regels in het plan', g.id);
  ok(pl.parties >= 1 && pl.parties <= 2, 'één of twee sprekers', g.id);
  ok(pl.lines.every((l, i) => l.who === 0 || l.who === 1) && pl.lines[0].who === 0, 'wie is 0 of 1, de eerste spreekt eerst', g.id);
  ok(pl.lines.every((l, i) => l.dur >= 2.4 && l.dur <= 5 && (i === 0 ? l.at === 0 : l.at > pl.lines[i - 1].at)), 'tijden lopen op', g.id);
  ok(pl.total > 0 && pl.total < 20, 'totaal redelijk', g.id);
}
const ping = SP.planGesprek({ id: 'x', lines: [['A', 'Hoi'], ['B', 'Hee'], ['C', 'Wie ben jij?']] });
ok(ping.lines[2].who === 1 && ping.parties === 2, 'derde label valt op de tweede spreker');

// elk gebabbel bestaat in een versie van één spreker of staat anders in een gesprek van twee
for (const a of AREAS) for (const p of PARTS) for (const w of WETS) {
  ok(rollGebabbel(a, p, w, mulberry32(3), [], 2) !== null, 'tweeregelig gesprek bestaat', `${a} ${p} ${w}`);
}
// de mompelaar: er is per streek en dagdeel minstens één regel van één spreker (zo niet, dan niets: de tik wacht)
let solo = 0;
for (const a of AREAS) for (const p of PARTS) {
  const g = rollGebabbel(a, p, 'droog', mulberry32(5), [], 1);
  if (g) { solo++; ok(new Set(g.lines.map((l) => l[0])).size === 1, 'maxParties 1 geeft één spreker', g.id); }
}
ok(solo >= 12, `genoeg mompelregels over de streken (${solo})`);
ok(GEBABBEL.length >= 120, `genoeg gebabbel (${GEBABBEL.length})`);

// sprekers kiezen
const ped = (x, y, extra = {}) => ({ x, y, state: 'wander', ...extra });
const peds = [ped(10, 0), ped(13, 1), ped(40, 0), ped(2, 0), ped(11, 2, { isCop: true }), ped(12, 1, { speechText: 'Hoi', speechUntil: 5 }), ped(-12, 1), ped(-13, 3)];
const r = mulberry32(9);
const two = SP.pickTalkers(peds, 0, 0, 0, true, r);
ok(two && two.length === 2 && two.every((p) => !p.isCop && Math.hypot(p.x, p.y) >= SP.HEAR_MIN && Math.hypot(p.x, p.y) <= SP.HEAR_MAX), 'paar binnen gehoorafstand zonder agent');
ok(Math.hypot(two[0].x - two[1].x, two[0].y - two[1].y) <= SP.PAIR_MAX, 'paar staat dicht bij elkaar');
ok(SP.pickTalkers([ped(40, 0), ped(2, 0)], 0, 0, 0) === null, 'niemand binnen gehoorafstand');
const one = SP.pickTalkers([ped(10, 0), ped(-15, 4)], 0, 0, 0, true, r);
ok(one && one.length === 1, 'zonder paar één spreker');
ok(SP.canTalk(ped(0, 0)) && !SP.canTalk(ped(0, 0, { scene: true })) && !SP.canTalk(ped(0, 0, { state: 'dead' })) && !SP.canTalk(null), 'canTalk');
ok(!SP.canTalk(ped(0, 0, { speechText: 'x', speechUntil: 9 }), 3) && SP.canTalk(ped(0, 0, { speechText: 'x', speechUntil: 2 }), 3), 'canTalk: een spreker die nog praat niet');

// de tik: na de wachttijd krijgen de twee wandelaars om de beurt een bel
SP.resetStraatpraat();
const w = { time: 100, clock: 14, player: { x: 0, y: 0 }, weather: { kind: 'helder' }, pedestrians: [ped(10, 0), ped(13, 1)] };
let said = [];
const rng = mulberry32(21);
for (let i = 0; i < 4000 && !said.length; i++) { w.time += 0.1; SP.tikStraatpraat(0.1, w, rng); said = w.pedestrians.filter((p) => p.speechText); }
ok(said.length >= 1, 'er wordt gepraat na de wachttijd');
let texts = new Set(), maxT = w.time;
for (let i = 0; i < 400; i++) { w.time += 0.1; SP.tikStraatpraat(0.1, w, rng); for (const p of w.pedestrians) if (p.speechText && w.time < p.speechUntil) texts.add(p.speechText); }
ok(texts.size >= 1, 'bellen tonen tekst');
// onderbroken door een ander (de wandelaar wordt een scène): het gesprek stopt
SP.resetStraatpraat();
w.pedestrians.forEach((p) => { delete p.speechText; p.speechUntil = 0; });
let started = false;
for (let i = 0; i < 4000 && !started; i++) { w.time += 0.1; SP.tikStraatpraat(0.1, w, rng); started = !!SP.straatpraatState().run; }
ok(started, 'een gesprek start');
w.pedestrians[0].scene = true; w.pedestrians[0].state = 'scene';
w.time += 0.1; SP.tikStraatpraat(0.1, w, rng);
ok(!SP.straatpraatState().run, 'een gesprek stopt als een spreker iets anders gaat doen');
// geen wandelaars in de buurt: wacht niet eeuwig, probeert snel opnieuw
SP.resetStraatpraat();
w.pedestrians = [];
for (let i = 0; i < 200; i++) { w.time += 0.1; SP.tikStraatpraat(0.1, w, rng); }
ok(!SP.straatpraatState().run, 'zonder wandelaars geen gesprek');

console.log(`straatpraat_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
