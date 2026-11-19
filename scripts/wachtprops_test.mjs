// #963: wachten in een cirkel krijgt aankleding. De keuze van de spullen is
// puur (wachtprops.js) en de missielus zet de kring bij een hold-stap neer en
// haalt hem bij de volgende stap of het einde weer weg.
//   node scripts/wachtprops_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const { waitDressingFor, propSpots, waitFigureFor, waitSeed, figureClipAt, idlePose, PROP_KINDS, IDLE_CLIPS, tickWaitFigure } = await import('../game/js/wachtprops.js');
const { neutralPose } = await import('../game/js/actoranim.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

ok(waitDressingFor({ label: 'Wacht in de rij tot je nummer komt' }) === 'plant', 'de wachtrij bij het loket krijgt een plant');
ok(waitDressingFor({ label: 'Plant de vlag op het eerste bolwerk', say: 'Blijf op de wal staan' }) === 'ton', 'de wal van Bourtange krijgt tonnen');
ok(waitDressingFor({ label: 'Zet de tafels op het erf' }) === 'baal', 'het erf krijgt balen');
ok(waitDressingFor({ label: 'Leg aan bij de kade' }) === 'kist', 'de kade krijgt kisten');
ok(waitDressingFor({ label: 'Wacht op het perron' }) === 'bank', 'het perron krijgt een bank');
ok(waitDressingFor({}) === 'bank', 'zonder aanwijzing een bank');
ok(waitDressingFor({ label: 'Iets anders' }) === 'bank', 'een onbekende plek valt terug op de bank');
ok(waitDressingFor(null) === 'bank', 'zelfs zonder stap geen crash');

const spots = propSpots(3, 6);
ok(spots.length === 3, 'drie spullen');
ok(spots.every((p) => Math.abs(Math.hypot(p.x, p.y) - 6) < 1e-9), 'alles staat op de kring om het doel');
ok(spots.every((p, i) => spots.every((q, j) => i === j || Math.hypot(p.x - q.x, p.y - q.y) > 2)), 'de spullen staan niet op elkaar');
ok(propSpots(4, 5).length === 4, 'het aantal is instelbaar');

// ---- de wachtfiguur (bouwsteen) ----
const hold = (extra = {}) => ({ kind: 'hold', label: 'Wacht op het perron', say: 'Blijf staan', time: 20, ...extra });
ok(waitFigureFor(hold()) === null, 'een stap zonder wacht krijgt geen figuur');
ok(waitFigureFor(hold({ wacht: { figuur: false } })) === null, 'figuur: false zet hem uit');
ok(waitFigureFor(null) === null && waitFigureFor({}) === null, 'zonder stap geen crash');
ok(waitDressingFor(hold()) === 'bank' && waitDressingFor(hold({ wacht: { prop: 'koffie' } })) === 'koffie', 'wacht.prop kiest de spullen');
ok(waitDressingFor(hold({ wacht: { prop: 'bestaatniet' } })) === 'bank', 'een onbekende prop valt terug op de tekst');
ok(waitDressingFor({ label: 'Leg aan bij de kade', wacht: {} }) === 'kist', 'wacht zonder prop verandert de keuze niet');
for (const prop of PROP_KINDS) {
  const f = waitFigureFor(hold({ wacht: { figuur: true, prop } }), 7);
  ok(f && f.prop === prop && f.rooster.length >= 3, `figuur bij ${prop}`);
  ok(f.rooster.every((r) => IDLE_CLIPS.includes(r.clip) && r.dur >= 3 && r.dur <= 6), `clips en duren kloppen bij ${prop}`);
  ok(f.plek >= 0 && f.plek < 3, `plek is een van de drie spots bij ${prop}`);
}
const kof = waitFigureFor(hold({ wacht: { figuur: true, prop: 'koffie' } }), 3);
ok(kof.rooster.some((r) => r.clip === 'koffie'), 'bij het koffietafeltje wordt koffie gedronken');
const kra = waitFigureFor(hold({ wacht: { figuur: true, prop: 'krant' } }), 3);
ok(kra.rooster.some((r) => r.clip === 'lezen'), 'bij de krant wordt gelezen');
// seed: dezelfde seed geeft dezelfde figuur, andere seeds variëren
const s1 = JSON.stringify(waitFigureFor(hold({ wacht: { figuur: true } }), 11)), s2 = JSON.stringify(waitFigureFor(hold({ wacht: { figuur: true } }), 11));
ok(s1 === s2, 'dezelfde seed, dezelfde figuur');
const varianten = new Set();
for (let sd = 1; sd <= 40; sd++) { const f = waitFigureFor(hold({ wacht: { figuur: true } }), sd / 40); varianten.add(`${f.shirt}|${f.plek}|${f.rooster[0].clip}`); }
ok(varianten.size >= 6, 'de seed geeft variatie', String(varianten.size));
ok(waitSeed(hold({ wacht: { seed: 0.25 } })) === 0.25, 'wacht.seed wint');
ok(waitSeed(hold()) === waitSeed(hold()) && waitSeed(hold()) !== waitSeed(hold({ label: 'Wacht bij de sluis' })), 'zonder seed volgt hij het label');
// rooster over tijd: elke tijd geeft een geldige clip, hergebruikt hetzelfde object
const plan = waitFigureFor(hold({ wacht: { figuur: true } }), 5);
const uit = { clip: '', tl: 0, dur: 1 };
let zelfde = true;
const gezien = new Set();
for (let t = -3; t < plan.totaal * 3; t += 0.37) {
  const r = figureClipAt(plan, t, uit);
  if (r !== uit) zelfde = false;
  gezien.add(r.clip);
  if (!(r.tl >= 0 && r.tl <= r.dur && IDLE_CLIPS.includes(r.clip))) { zelfde = false; break; }
}
ok(zelfde, 'figureClipAt schrijft in het meegegeven object en blijft binnen de clip');
ok(gezien.size === new Set(plan.rooster.map((r) => r.clip)).size, 'alle clips van het rooster komen langs');
// poses: eindig, begrensd, neutraal aan de randen, zonder nieuwe objecten
const pose = neutralPose();
const refs = [pose.head, pose.armL, pose.armR, pose.chest, pose.legL];
let eindig = true, rand = true;
for (const clip of IDLE_CLIPS) {
  for (let tl = 0; tl <= 5; tl += 0.25) {
    idlePose(pose, clip, tl, 5);
    for (const v of [pose.head.x, pose.head.y, pose.armL.z, pose.armL.e, pose.armR.z, pose.armR.e, pose.chest.y, pose.pelvisDrop, pose.legL.k]) if (!Number.isFinite(v) || Math.abs(v) > 3) eindig = false;
  }
  idlePose(pose, clip, 0, 5);
  if (Math.abs(pose.head.y) > 1e-9 || Math.abs(pose.armL.z - 0.08) > 1e-9 || Math.abs(pose.armR.z - 0.08) > 1e-9) rand = false;
}
ok(eindig, 'alle poses blijven eindig en binnen de hoeken');
ok(rand, 'elke clip begint in de neutrale stand (zachte overgang)');
ok(refs[0] === pose.head && refs[1] === pose.armL && refs[2] === pose.armR && refs[3] === pose.chest && refs[4] === pose.legL, 'idlePose maakt geen nieuwe objecten aan');
idlePose(pose, 'horloge', 2.5, 5);
ok(pose.armL.z > 1 && pose.head.x > 0.3, 'op het horloge kijken: arm omhoog, hoofd omlaag');
idlePose(pose, 'koffie', 2.5, 5);
ok(pose.armR.z > 1, 'koffie: rechterarm omhoog');
ok(tickWaitFigure(null, 1) === false && tickWaitFigure({ userData: {} }, 1) === false, 'tickWaitFigure zonder figuur doet niets');
// een bestaande stap zonder wacht verandert niet: dezelfde keuze als altijd
ok(waitDressingFor({ label: 'Wacht in de rij tot je nummer komt', wacht: undefined }) === 'plant', 'bestaande stappen houden hun spullen');

const src = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
ok(/buildWaitDressing\(st, S\.target/.test(src), 'de missielus bouwt de kring bij een hold-stap');
ok(/updateWaitDressing\(S\.wait, st\.time \? Math\.min\(1, S\.hold \/ st\.time\)/.test(src), 'de ring vult met de wachttijd');
ok(/disposeStageDressing\(\)/.test(src), 'de kring wordt opgeruimd');
const wp = fs.readFileSync(new URL('../game/js/wachtprops.js', import.meta.url), 'utf8');
ok(/export function buildWaitDressing/.test(wp) && /export function disposeWaitDressing/.test(wp), 'bouwen en opruimen staan in de module');

console.log(`${n - fails}/${n} wachtprops`);
process.exit(fails ? 1 : 0);
