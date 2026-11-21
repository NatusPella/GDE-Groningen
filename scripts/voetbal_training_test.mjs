// Test van de trainingsminigames van de voetbalcarrière (#1109): scripts/voetbal_training_test.mjs. Puur (geen DOM, geen THREE): de regels, de scores, de koppeling aan de groei en de Samen-regel.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DRILLS, drillFor, drillById, newDrill, stepDrill, drillScore, scoreFromPerf, medalOf, sfxFor, drillStatus, SFX, SCORE_MIN, SCORE_MAX, MAX_DT, CONST } from '../game/js/voetbaltraining.js';
import { SFX_MAP } from '../game/js/sfx/sfxmap.js';
import { TRAIN_FOCI, FOCUS_NAMES } from '../game/js/voetbalontwikkeling.js';
import * as C from '../game/js/voetbalcarriere.js';
import { wgsToWorld } from '../game/js/rdnew.js';
import PARKDATA from '../game/js/voetbalparkendata.js';
import { makeParkIndex, HOME_WGS } from '../game/js/voetbalparken.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const DT = 1 / 60;
const alleGetallenEindig = (o) => (typeof o === 'number' ? Number.isFinite(o) : o && typeof o === 'object' ? Object.values(o).every(alleGetallenEindig) : true);

// De bots: een goede speler per oefening, een stilzittende speler en een rommelaar. Ze geven de invoer van deze frame.
const bots = {
  slalom(s) {
    const c = s.cones.find((q) => !q.done);
    const tx = c && c.z - s.p.z < 6 ? c.side * 1.8 : 0;
    return { ax: clamp((tx - s.p.x) * 3, -1, 1), act: true };
  },
  schot(s) {
    const tg = s.targets[Math.min(s.taken, s.targets.length - 1)];
    const du = tg.u - s.aim.u, dv = tg.v - s.aim.v;
    const aimed = Math.abs(du) < 0.03 && Math.abs(dv) < 0.03;
    return { ax: clamp(du * 10, -1, 1), ay: clamp(dv * 10, -1, 1), act: aimed && s.charge < 0.795 };
  },
  pass(s) {
    const h = s.hoops[s.i], dx = h.x - s.ball.x, dz = h.z - s.ball.z;
    const want = Math.atan2(dx, dz), dist = Math.hypot(dx, dz);
    const aimed = Math.abs(want - s.angle) < 0.02;
    return { ax: clamp((want - s.angle) * 8, -1, 1), act: aimed && s.charge < dist / CONST.PA.max };
  },
  conditie(s) { return { ax: 0, act: !s.blown && s.stamina > 0.04 }; },
  dekken(s) { return { ax: clamp((s.a.x - s.p.x) * 4, -1, 1), ay: clamp((s.a.z + 0.5 - s.p.z) * 4, -1, 1) }; },
};
const idle = () => ({});
// Speelt een oefening uit met een bot; de losgelaten knop (rel) volgt uit het wisselen van act.
function play(id, bot, seed = 7, maxS = 90) {
  const s = newDrill(id, seed);
  let prevAct = false;
  const events = [];
  for (let i = 0; i < maxS * 60 && !s.done; i++) {
    const b = bot(s) || {};
    const inp = { ax: b.ax || 0, ay: b.ay || 0, act: !!b.act, press: !!b.act && !prevAct, rel: !b.act && prevAct };
    prevAct = !!b.act;
    events.push(...stepDrill(s, inp, DT));
  }
  return { s, events };
}

t('vijf oefeningen, elk bij een eigen vaardigheid, en de namen zijn Nederlands', () => {
  assert.equal(DRILLS.length, 5);
  assert.deepEqual(DRILLS.map((d) => d.focus).sort(), TRAIN_FOCI.slice().sort());
  for (const d of DRILLS) {
    assert.equal(drillFor(d.focus).id, d.id); assert.equal(drillById(d.id).focus, d.focus);
    assert.ok(d.naam.length > 3 && d.kort.endsWith('.') && !/[A-Z]{4,}[a-z]/.test(d.kort));
    assert.ok(Array.isArray(d.keys[0]) && d.keys[0].length >= 1, 'toetsen voor de knop');
  }
  assert.equal(drillFor('onzin'), null); assert.equal(newDrill('onzin'), null);
  for (const k of TRAIN_FOCI) assert.ok(FOCUS_NAMES[k]);
});
t('de score: 0,5 tot 1,5, nooit NaN, een medaille hoort bij een score', () => {
  assert.equal(scoreFromPerf(0), SCORE_MIN); assert.equal(scoreFromPerf(1), SCORE_MAX); assert.equal(scoreFromPerf(0.5), 1);
  for (const v of [NaN, undefined, -3, 9, Infinity]) { const x = scoreFromPerf(v); assert.ok(x >= SCORE_MIN && x <= SCORE_MAX && Number.isFinite(x)); }
  assert.equal(medalOf(1.4), 'goud'); assert.equal(medalOf(1.0), 'zilver'); assert.equal(medalOf(0.8), 'brons'); assert.equal(medalOf(0.5), '');
});
for (const d of DRILLS) {
  t(`${d.id}: een goede speler scoort hoog, een stilzittende laag, en de uitslag is deterministisch`, () => {
    const goed = play(d.id, bots[d.id]), stil = play(d.id, idle, 7, 90);
    assert.ok(goed.s.done && stil.s.done, 'beide lopen af (ook een tijdslimiet)');
    const a = drillScore(goed.s), b = drillScore(stil.s);
    assert.ok(a >= 1.25, `goed ${d.id}: ${a}`);
    assert.ok(b < a - 0.3, `stil ${d.id}: ${b} tegen ${a}`);
    assert.ok(a <= SCORE_MAX && b >= SCORE_MIN);
    assert.equal(drillScore(play(d.id, bots[d.id]).s), a, 'zelfde zaad en invoer, zelfde score');
    assert.ok(goed.events.includes('done') && goed.events.filter((e) => e === 'done').length === 1);
  });
  t(`${d.id}: een lange frame, onzin als invoer en stappen na afloop doen niets raars`, () => {
    const s = newDrill(d.id, 3);
    stepDrill(s, { ax: NaN, ay: Infinity, act: 1 }, 5);
    assert.ok(s.t <= MAX_DT + 1e-9, 'een lange frame wordt begrensd');
    assert.ok(alleGetallenEindig(s), 'geen NaN in de staat');
    assert.ok(Number.isFinite(s.t));
    const klaar = play(d.id, bots[d.id]).s;
    const sc = drillScore(klaar), t0 = klaar.t;
    assert.deepEqual(stepDrill(klaar, { ax: 1, act: true }, DT), []);
    assert.equal(klaar.t, t0); assert.equal(drillScore(klaar), sc);
    assert.equal(drillScore(newDrill(d.id, 1)), null, 'een lopende oefening heeft nog geen score');
    assert.ok(typeof drillStatus(newDrill(d.id, 1)) === 'string' && drillStatus(newDrill(d.id, 1)).length > 3);
  });
}
t('slalom: een kegel raken of aan de verkeerde kant langs kost 1,5 s', () => {
  const { s: raak } = play('slalom', idle, 1);               // rechtdoor: de kegels recht op
  assert.ok(raak.hits >= 1 && raak.pen >= 1.5);
  const goed = play('slalom', bots.slalom).s;
  assert.equal(goed.hits + goed.misses, 0, 'de bot loopt foutloos');
  assert.ok(goed.t < 14, `tijd ${goed.t}`);
});
t('schot: te zacht of te hard schieten wijkt af; de hoek raken geeft de hoogste score', () => {
  const gooi = (kracht) => {
    const s = newDrill('schot', 5);
    const tg = s.targets[0];
    s.aim.u = tg.u; s.aim.v = tg.v;
    stepDrill(s, { act: true }, 0.0001);
    s.charge = kracht;
    stepDrill(s, { rel: true }, DT);
    return s.scores[0];
  };
  assert.ok(gooi(0.8) > 0.95, 'precies de sweet spot raakt het doeltje');
  assert.ok(gooi(0.15) < gooi(0.8) && gooi(1) < gooi(0.8));
  const s = newDrill('schot', 5); s.aim.u = 2; s.aim.v = 0.5; s.charge = 0.8;
  const ev = stepDrill(s, { rel: true }, DT);
  assert.equal(s.scores[0], 0, 'naast het doel is nul'); assert.ok(ev.includes('miss') && ev.includes('kick'));
});
t('pass: de hoepels liggen deterministisch en altijd voor de bal; een rechte pass op de goede kracht raakt', () => {
  const a = newDrill('pass', 9), b = newDrill('pass', 9), c = newDrill('pass', 10);
  assert.deepEqual(a.hoops, b.hoops); assert.notDeepEqual(a.hoops, c.hoops);
  const r = play('pass', bots.pass).s;
  assert.ok(r.hits >= 4, `hoepels ${r.hits}`);
  for (const h of r.hoops) assert.ok(Math.abs(h.x) <= 16 && h.z > 0);
});
t('conditie: wie altijd spurt loopt leeg en wordt langzaam; goed doseren is sneller dan altijd joggen', () => {
  const alles = play('conditie', () => ({ act: true })).s;
  const jog = play('conditie', idle).s;
  const slim = play('conditie', bots.conditie).s;
  assert.ok(alles.blowns >= 1, 'altijd spurten gaat mis');
  assert.ok(slim.perf >= jog.perf);
  assert.ok(slim.t < jog.t);
});
t('dekken: wie meeloopt houdt de aanvaller uit het doel, wie stilstaat laat hem door', () => {
  const goed = play('dekken', bots.dekken).s, stil = play('dekken', idle).s;
  assert.ok(goed.through <= 1 && stil.through >= 3, `door: ${goed.through} tegen ${stil.through}`);
  assert.ok(goed.near > stil.near);
});
t('de geluiden zijn bestaande sfxEvent-sleutels', () => {
  for (const k of Object.values(SFX)) assert.ok(SFX_MAP[k], `sfx ${k}`);
  for (const e of ['kick', 'net', 'goal', 'done', 'cone', 'wrongside', 'puffed', 'through']) assert.ok(sfxFor(e) && SFX_MAP[sfxFor(e)]);
  assert.equal(sfxFor('miss'), null); assert.equal(sfxFor('point'), null);
});

// ---- koppeling aan de carrière: groei per speler, dagcap, geen verlies ----
const index = makeParkIndex(PARKDATA);
const [hx, hy] = wgsToWorld(HOME_WGS.lat, HOME_WGS.lon);
const start = (char) => C.createCareer({ char, index, home: { x: hx, y: hy } });
const som = (p) => Object.values(p.attrs).reduce((a, b) => a + b, 0);
t('de score uit de oefening bepaalt de groei; een slechte training kost nooit punten', () => {
  const growth = (char, score) => { let c = start(char); const v0 = som(c.me); for (let i = 0; i < 3; i++) { const r = C.train(c, 'shot', score); c = r.career; c = { ...c, day: c.day + 1, trainedDay: -1 }; } return { c, d: som(c.me) - v0 }; };
  for (const char of ['anita', 'tammo']) {
    const laag = growth(char, scoreFromPerf(0)), hoog = growth(char, scoreFromPerf(1));
    assert.ok(laag.d >= 0, 'nooit verlies');
    assert.ok(hoog.d >= laag.d, `hoog ${hoog.d} tegen laag ${laag.d}`);
    assert.ok(hoog.c.prog.shot + hoog.d > laag.c.prog.shot + laag.d, 'meer opgebouwde groei bij een betere oefening');
  }
});
t('een training per speldag: een tweede oefening dezelfde dag levert niets op', () => {
  const c0 = start('anita');
  const r1 = C.train(c0, 'pass', 1.5);
  assert.ok(r1.ok);
  const r2 = C.train(r1.career, 'pass', 1.5);
  assert.equal(r2.ok, false); assert.equal(som(r2.career.me), som(r1.career.me));
});
t('Samen: een gast heeft een eigen carrière en de training verandert alleen zijn eigen speler (lokaal, geen netwerk)', () => {
  const host = start('anita'), gast = start('tammo');
  const r = C.train(gast, 'defend', 1.2);
  assert.deepEqual(host.me, start('anita').me, 'de speler van wie het spel opende staat stil');
  assert.ok(r.ok && som(r.career.me) >= som(gast.me));
  for (const f of ['voetbaltraining.js', 'voetbaltraining3d.js']) {
    const src = fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
    assert.ok(!/coopnet|WebSocket|fetch\(|RTCPeer|localStorage|Math\.random/.test(src), `${f}: geen net, geen opslag, geen toeval buiten het zaad`);
  }
});
t('geen woorden van leed of echte namen in de oefeningen', () => {
  const tekst = JSON.stringify(DRILLS);
  assert.ok(!/gebroken|bloed|pijn|blessure|ziekenhuis/i.test(tekst));
});
console.log(`voetbal_training_test: ${n} tests ok`);
