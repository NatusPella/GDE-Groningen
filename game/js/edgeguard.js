// The edge of the world in the game (docs/PROVINCIE-PLAN.md 2.24, issue #6):
// feeds the player's spot to worldedge.js, runs the turn-back scene
// (edgescene.js) and builds its props in the world: a border post with a
// boom, a patrol boat, a bank of fog, a hunebed across the road. The props
// stand in front of the player; a few seconds later the player is put back
// inside, facing inside (the scene can be skipped with E). Never on a bridge
// deck or near a bridge end. Needs the province layer's edge; without it
// nothing happens.
import { getScene } from './scene3d.js';
import { regionEdgeLayer } from './regions.js';
import { edgeRule } from './worldedge.js';
import { createEdgeWatch, stepEdgeWatch } from './edgescene.js';
import { buildProp, disposeProp, animateProp } from './ommelandprops3d.js';
import { WATER_Y } from './util.js';

const CHECK_S = 0.25; // the edge lines are walked four times a second
const BRIDGE_PROBE = [[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40]];
const SEA_PROPS = new Set(['rand_grenswachtboot', 'rand_kustwachtboot', 'rand_boei', 'rand_mistbank', 'rand_veerboot', 'rand_natuurbord']);

const watch = createEdgeWatch();
let acc = 0;
let rule = null;
let props = [];

function modeOf(p, v) {
  if (v) return v.isHeli ? 'heli' : v.isPlane ? 'plane' : v.isBoat ? 'boat' : v.isBike || v.isScooter ? 'bike' : 'car';
  return p.swimming ? 'swim' : 'foot';
}

function bridgeDist(map, x, y) {
  if (!map.isOnBridge) return undefined;
  for (const [dx, dy] of BRIDGE_PROBE) if (map.isOnBridge(x + dx, y + dy)) return Math.hypot(dx, dy);
  return undefined;
}

function groundAt(map, x, y) {
  try { return map.groundHeightAt ? map.groundHeightAt(x, y, 50) : 0; } catch (e) { return 0; }
}

function showScene(w, plan) {
  const scene = getScene();
  for (const pp of plan.props) {
    let prop;
    try { prop = buildProp(pp.kind, { hw: 3 }, {}); } catch (e) { continue; }
    const y = SEA_PROPS.has(pp.kind) ? WATER_Y : groundAt(w.map, pp.x, pp.y);
    prop.group.position.set(pp.x, y, pp.y);
    prop.group.rotation.y = -pp.angle;
    scene.add(prop.group);
    props.push(prop);
  }
  w.addMessage(plan.lines[0], 4, { kind: 'tip' });
  if (plan.lines[1]) w.addMessage(plan.lines[1], 4, { kind: 'tip' });
}

function clearScene() {
  for (const p of props) disposeProp(p);
  props = [];
}

function putBack(w, spot) {
  const p = w.player, v = p.inVehicle;
  if (v) {
    v.x = spot.x; v.y = spot.y; v.angle = spot.angle;
    v.speed = 0; v.vx = 0; v.vy = 0; v.driftX = 0; v.driftY = 0;
    p.x = spot.x; p.y = spot.y;
  } else {
    p.x = spot.x; p.y = spot.y; p.angle = spot.angle; p.vx = 0; p.vy = 0;
    w.camYaw = spot.angle;
  }
}

export function updateEdgeGuard(dt, w) {
  const edge = regionEdgeLayer();
  if (!edge || !w.map || !w.player || w.paused) return;
  const p = w.player, v = p.inVehicle;
  const x = v ? v.x : p.x, y = v ? v.y : p.y;
  if (watch.phase === 'scene') {
    for (const q of props) animateProp(q, dt, w.time);
    const skip = !!(w.input && w.input.wasPressed && w.input.wasPressed('e'));
    const ev = stepEdgeWatch(watch, null, dt, { x, y, skip });
    if (ev && ev.type === 'back') { putBack(w, ev.spot); clearScene(); w.addMessage(ev.plan.lines[1] || '', 4, { kind: 'tip' }); }
    return;
  }
  acc += dt;
  if (acc < CHECK_S) { stepEdgeWatch(watch, null, dt); return; }
  acc = 0;
  rule = edgeRule(x, y, edge, { mode: modeOf(p, v), onDeck: !!(w.map.isOnBridge && w.map.isOnBridge(x, y)), bridgeDist: bridgeDist(w.map, x, y) });
  const ev = stepEdgeWatch(watch, rule, dt, { x, y });
  if (!ev) return;
  if (ev.type === 'warn') w.addMessage(ev.rule.text, 4, { kind: 'tip' });
  else if (ev.type === 'scene') showScene(w, ev.plan);
}

