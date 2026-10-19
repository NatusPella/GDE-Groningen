// The turn-back scenes at the edge of the world (edgescene.js, issue #6):
// warn once, scene with props in front of the player, turn-back inside the
// warning band facing inside, quiet after it, skippable, and the border-bridge
// rule still holds. Pure logic; no world data needed.
//   node scripts/edgescene_test.mjs
import * as E from '../game/js/worldedge.js';
import * as S from '../game/js/edgescene.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };

// a border along y = 0 with the outside to the north (y < 0), Dutch side south
const border = { coast: [], border: [{ kind: 'duitsland', out: -1, bufferM: 300, pts: [[-5000, 0], [5000, 0]] }], seaM: 3000, airM: 3000 };
const outSign = E.edgeRule(0, -400, border, { mode: 'car' }) ? -1 : 1; // which side is outside for this line
const edgeAt = (m, ctx = { mode: 'car' }) => E.edgeRule(0, outSign * m, border, ctx);

ok(edgeAt(-200) === null, 'inside: nothing');
ok(edgeAt(20) === null, 'past the line but before the warning band: nothing');
const warn = edgeAt(80), back = edgeAt(400);
ok(warn && warn.action === 'warn' && warn.at && Math.abs(warn.at.y) < 1e-6, 'warn has the edge point');
ok(back && back.action === 'back' && back.d > 300 && back.warnAt === 50, 'back has d and warnAt ' + JSON.stringify(back));

// scene plan: props between the player and the outside, spot inside the warn band
const plan = S.scenePlan(back, 0, outSign * 400);
ok(plan.props.length >= 2 && plan.props[0].kind === 'rand_grenspost', 'border scene starts with the border post');
for (const p of plan.props) ok(p.y * outSign > 400 + S.AHEAD_M - 1 && p.y * outSign < 400 + S.AHEAD_M + 130, 'prop ' + p.kind + ' stands ahead of the player, outside');
ok(plan.lines.length === 2 && plan.lines[1] === back.text, 'lines: scene line, then the rule text');
const spotRule = E.edgeRule(plan.spot.x, plan.spot.y, border, { mode: 'car' });
ok(spotRule === null || spotRule.action !== 'back', 'turn-back spot is not a new turn-back');
ok(Math.abs(Math.cos(plan.spot.angle) * 0 + Math.sin(plan.spot.angle) * -outSign - 1) < 1e-6, 'spot faces inside');
ok(plan.spot.y * outSign < 400 && !spotRule, 'spot is back inside the warning band');

// the watch: warn -> (gap) -> scene -> back -> quiet
const st = S.createEdgeWatch();
let ev = S.stepEdgeWatch(st, warn, 0.1, { x: 0, y: outSign * 80 });
ok(ev && ev.type === 'warn', 'first warning is announced');
ev = S.stepEdgeWatch(st, warn, 0.1, { x: 0, y: outSign * 80 });
ok(ev === null, 'the same warning is not repeated every frame');
ev = S.stepEdgeWatch(st, back, 0.1, { x: 0, y: outSign * 400 });
ok(ev && ev.type === 'scene' && st.phase === 'scene', 'past the buffer: the scene starts');
let n = 0, last = null;
while (n++ < 1000 && !last) last = S.stepEdgeWatch(st, back, 0.1, { x: 0, y: outSign * 400 });
ok(last && last.type === 'back' && n * 0.1 >= S.SCENE_S - 0.2 && n * 0.1 <= S.SCENE_S + 0.3, 'the scene runs about SCENE_S, then the turn-back (' + n * 0.1 + ' s)');
ok(S.stepEdgeWatch(st, back, 0.1, { x: 0, y: outSign * 400 }) === null, 'quiet right after a turn-back');
for (let i = 0; i < S.COOL_S * 10 + 5; i++) S.stepEdgeWatch(st, null, 0.1);
ev = S.stepEdgeWatch(st, back, 0.1, { x: 0, y: outSign * 400 });
ok(ev && ev.type === 'scene', 'after the quiet time the edge acts again');
ev = S.stepEdgeWatch(st, back, 0.1, { x: 0, y: outSign * 400, skip: true });
ok(ev && ev.type === 'back', 'a scene can be skipped');

// the border-bridge rule: no scene on a deck or near a bridge end
ok(edgeAt(400, { mode: 'car', onDeck: true }) === null && edgeAt(400, { mode: 'car', bridgeDist: 20 }) === null, 'no turn-back on a bridge');

// every edge kind has a scene with a visible prop and Dutch text
for (const k of Object.keys(E.EDGE_GAGS)) {
  const sc = S.EDGE_SCENES[k];
  ok(sc && sc.props.length > 0 && sc.lines.length > 0, 'scene for ' + k);
}
// sea: the plan puts the player back by the warning band, not at the coast
const sea = { coast: [{ kind: 'wad', out: 1, pts: [[-5000, 0], [5000, 0]] }], border: [], seaM: 3000, airM: 3000 };
const sy = [3100, -3100].find((y) => E.edgeRule(0, y, sea, { mode: 'boat' }));
const sr = E.edgeRule(0, sy, sea, { mode: 'boat' });
ok(sr && sr.edge === 'wad' && sr.action === 'back', 'sea turn-back');
const sp = S.scenePlan(sr, 0, sy).spot;
const after = E.edgeRule(sp.x, sp.y, sea, { mode: 'boat' });
ok(!after && Math.abs(sp.y - sy) < 800, 'sea: back by a few hundred metres, not teleported to the coast');

// every prop a scene asks for exists in the prop kit and builds (a canvas stub for the signs)
await import('./node3d.mjs');
const P = await import('../game/js/ommelandprops3d.js');
globalThis.document = { querySelector: () => null, head: { appendChild: () => {} }, createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 1 }) : () => {}), set: () => true }) }) };
const used = new Set(Object.values(S.EDGE_SCENES).flatMap((sc) => sc.props.map((p) => p.kind)));
for (const kind of used) {
  ok(P.EDGE_PROP_KINDS.includes(kind), 'prop kit has ' + kind);
  try { const pr = P.buildProp(kind, { hw: 3 }, {}); ok(pr.group.children.length > 0, kind + ' builds'); P.disposeProp(pr); } catch (e) { ok(false, kind + ' builds: ' + e.message); }
}

if (fails) { console.log(fails + ' failed'); process.exit(1); }
console.log('edgescene: all passed');
process.exit(0); // overlayhold.js start een interval bij het laden
