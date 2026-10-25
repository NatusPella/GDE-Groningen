// Meerijden en lijnweergave (game/js/meerijden.js, ovkaart.js, #97):  node scripts/meerijden_test.mjs
import * as M from '../game/js/meerijden.js';
import * as K from '../game/js/ovkaart.js';
import * as O from '../game/js/ovopties.js';
import { CAP } from '../game/js/reistijd.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const trein = { length: 18000, etaS: 1500, changes: ['Groningen'], pts: [[0, 0], [1, 1]],
  legs: [{ kind: 'walk', pts: [[0, 0], [10, 0]], length: 10 }, { kind: 'train', pts: [[10, 0], [9000, 0]], length: 9000, line: 'Stoptrein' }, { kind: 'train', pts: [[9000, 0], [18000, 0]], length: 9000, line: 'Sneltrein' }],
  stops: [{ kind: 'instap', name: 'Grunn', x: 10, y: 0 }, { kind: 'overstap', name: 'Zuid', x: 9000, y: 0 }, { kind: 'uitstap', name: 'Winsum', x: 18000, y: 0 }] };
const opts = O.reisOpties({ trein, auto: { length: 20000, etaS: 900 } }, { money: 50 });
const ritOpt = opts.find((o) => o.id === 'trein');

// kaartlagen
const L = K.lijnLagen(opts, 'trein');
ok(L.paths.length === 3 && L.paths.every((p) => p.alpha === 1), 'train legs drawn, selected');
ok(L.paths.some((p) => p.kind === 'walk' && p.dash), 'walk dashed');
ok(L.stops.length === 3 && L.stops.find((s) => s.kind === 'overstap').big, 'stops with transfer marked big');
ok(L.legenda.length === 1 && L.legenda[0].selected, 'legend per ride option');
ok(L.bounds && L.bounds.x1 === 18000, 'bounds');
ok(K.lijnLagen(opts, 'bus').paths.every((p) => p.alpha < 1), 'not selected is dimmed');
ok(K.lijnLagen([{ id: 'auto', ride: false, lines: [], stops: [], legs: [], pts: [] }], 'auto').paths.length === 0, 'self drive not drawn');
const rows = K.kaartRijen(opts, O.optieRegel, 'trein');
ok(rows.length === 2 && rows[0].actie === 'zelf' && rows[1].actie === 'meerijden' && rows[1].selected, 'rows');
ok(K.kaartRijen(O.reisOpties({ trein }, { money: 1, directM: 100 }), O.optieRegel)[1].disabled === 'Te weinig geld', 'row disabled without money');

// rit
const plan = M.ritPlan(ritOpt);
ok(plan.playS <= CAP.meerijden && plan.clockS === 1500, 'play time capped, clock real', plan.playS);
ok(Math.abs(plan.shots.reduce((s, x) => s + x.duur, 0) - plan.playS) < 1e-6, 'shots sum to the scene');
ok(M.ritPlan({ ...ritOpt, etaS: 20 }).playS >= 6, 'minimum scene');
const r = M.startRit(plan);
M.stepRit(r, 0.1, { skip: true });
ok(!r.skipped && !r.done, 'guard: no skip in the first moments');
ok(M.skipHint(r) === null, 'no hint during the guard');
M.stepRit(r, 1, {});
const h = M.skipHint(r);
ok(h && h.toets === 'Spatie', 'white key hint after the guard');
ok(M.shotAt(plan, 0).name === 'perron' && M.shotAt(plan, plan.playS - 0.1).name === 'aankomst', 'shots in order');
M.stepRit(r, 0.016, { skip: true });
ok(r.skipped && r.done && M.voortgang(r) === 1, 'space skips to the end');
const a = M.aankomst(r, { x: 5, y: 6, name: 'Winsum' }, 50);
ok(a && a.skipped && a.aankomstS === M.SKIPPED_S && a.klokMinuten === 25 && a.prijs === 8, 'arrival: same clock and price when skipped', JSON.stringify(a));
ok(/Winsum/.test(a.bericht) && /€ 8/.test(a.bericht), 'arrival message');
ok(M.aankomst(r, { x: 0, y: 0 }, 3) === null, 'no ride without money');
const r2 = M.startRit(plan);
while (!r2.done) M.stepRit(r2, 1, {});
ok(!r2.skipped && M.aankomst(r2, { x: 0, y: 0 }, 99).aankomstS === M.PLAYED_ARRIVAL_S, 'plays out without skip');
const t0 = r2.t;
M.stepRit(r2, 5, { skip: true });
ok(r2.t === t0, 'done stays done');
// ondertitels
const r3 = M.startRit(plan);
ok(/Instappen bij Grunn/.test(M.ondertitel(r3)), 'subtitle: boarding', M.ondertitel(r3));
r3.t = plan.playS * 0.5;
ok(/Overstappen op Zuid/.test(M.ondertitel(r3)), 'subtitle: transfer', M.ondertitel(r3));
r3.t = plan.playS - 0.1;
ok(/Volgende halte: Winsum/.test(M.ondertitel(r3)), 'subtitle: arriving', M.ondertitel(r3));

// Reizen als boot (#438): je komt aan bij de aanlegplaats en de scenetekst zegt geen halte.
const bootOpt = { id: 'boot', etaS: 600, price: 5, lines: [],
  legs: [{ kind: 'walk', pts: [[0, 0], [100, 20]], length: 102 }, { kind: 'boat', pts: [[100, 20], [500, 30], [900, 40]], length: 800 }],
  stops: [{ kind: 'instap', name: 'Kade Oosterhaven', x: 100, y: 20 }, { kind: 'uitstap', name: 'Lauwersoog', x: 860, y: 38 }] };
const bootPlan = M.ritPlan(bootOpt);
ok(bootPlan.mode === 'boot' && bootPlan.shots.some((s) => s.name === 'kade'), 'boat ride has its own shots');
ok(bootPlan.haven && bootPlan.haven.x === 900 && bootPlan.haven.y === 40, 'the aanlegplaats is the end of the boat leg');
const bootRit = M.startRit(bootPlan);
const bootA = M.aankomst(bootRit, { x: 5, y: 6, name: 'Lauwersoog' }, 50);
ok(bootA && bootA.x === 900 && bootA.y === 40, 'boat arrival at the aanlegplaats', JSON.stringify(bootA));
ok(bootA.naam === 'Lauwersoog' && /Lauwersoog/.test(bootA.bericht), 'boat arrival keeps the place name');
const bootZonderVaar = M.ritPlan({ id: 'boot', etaS: 60, price: 0, legs: [], lines: [], stops: [] });
ok(M.aankomst(M.startRit(bootZonderVaar), { x: 7, y: 8 }, 0).x === 7, 'boat without a leg falls back to the target');
ok(/Aan boord bij Kade Oosterhaven/.test(M.ondertitel(bootRit)), 'boat subtitle: boarding', M.ondertitel(bootRit));
bootRit.t = bootPlan.playS - 0.1;
ok(/Volgende aanlegplaats: Lauwersoog/.test(M.ondertitel(bootRit)), 'boat subtitle: aanlegplaats', M.ondertitel(bootRit));
console.log(`${n - fails}/${n} meerijden`);
process.exit(fails ? 1 : 0);
