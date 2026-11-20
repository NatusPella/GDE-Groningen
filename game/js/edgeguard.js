import { hoofdspeler } from './players.js';
// The edge of the world in the game (docs/PROVINCIE-PLAN.md 2.24, issue #6):
// feeds the player's spot to worldedge.js, runs the turn-back scene
// (edgescene.js) and builds its props in the world: a border post with a
// boom, a patrol boat, a bank of fog, a hunebed across the road. The props
// stand in front of the player; a few seconds later the player is put back
// inside, facing inside (the scene can be skipped with E). Never on a bridge
// deck or near a bridge end. Needs the province layer's edge; without it
// nothing happens.
import { getScene } from './scene3d.js';
import { regionEdgeLayer, regionAt } from './regions.js';
import { edgeRule } from './worldedge.js';
import { createEdgeWatch, stepEdgeWatch, cancelEdgeWatch, chooseBackSpot, snapSpotToRoad, snapSceneToRoad } from './edgescene.js';
import { playerBusy } from './busy.js';
import { buildProp, disposeProp, animateProp } from './ommelandprops3d.js';
import { WATER_Y } from './util.js';

const CHECK_S = 0.25; // the edge lines are walked four times a second
const BRIDGE_PROBE = [[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40]];
const SEA_PROPS = new Set(['rand_grenswachtboot', 'rand_kustwachtboot', 'rand_boei', 'rand_mistbank', 'rand_veerboot', 'rand_natuurbord']);

const watch = createEdgeWatch();
let acc = 0;
let rule = null;
let props = [];
let lastSafe = null; // de laatste plek waar de grens niets van de speler vond (terugvaloptie voor putBack)
const KEEP_QUIET = ['cinematic', 'respawn', 'train']; // reizen, sterven en de trein: de speler is niet aan het sturen

function modeOf(p, v, w) {
  if (!v && w && w.pigeonMode) return 'heli'; // een duif vliegt: luchtruim, geen wegversperring
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
  // de blokkade op de weg, niet in de berm (#436)
  plan = snapSceneToRoad(w.map, plan, modeOf(hoofdspeler(w), hoofdspeler(w).inVehicle, w));
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

// de regel van de grens op een plek, met de modus van de speler (de Dollard is een baai van de provincie zelf)
function ruleAt(w, edge, mode, x, y) {
  const r = regionAt(x, y);
  return edgeRule(x, y, edge, { mode, inland: !!(r && r.id === 'dollard'), onDeck: !!(w.map.isOnBridge && w.map.isOnBridge(x, y)), bridgeDist: bridgeDist(w.map, x, y) });
}

function putBack(w, plannedSpot) {
  const p = hoofdspeler(w), v = p.inVehicle;
  // over land (te voet, auto, fiets): terug op de weg, niet in een weiland (#436)
  const mode = modeOf(p, v, w);
  const edge = regionEdgeLayer();
  const snapped = mode === 'foot' || mode === 'car' || mode === 'bike' ? snapSpotToRoad(w.map, plannedSpot, mode !== 'foot') : null;
  // de plek moet zelf binnen de grens liggen, anders volgt een nieuwe scène: een lus (#988)
  const spot = edge
    ? chooseBackSpot({ planned: plannedSpot, snapped, face: plannedSpot.angle, edgeRule: (x, y) => ruleAt(w, edge, mode, x, y), lastSafe }).spot
    : (snapped || plannedSpot);
  if (v) {
    v.x = spot.x; v.y = spot.y; v.angle = spot.angle;
    v.speed = 0; v.vx = 0; v.vy = 0; v.driftX = 0; v.driftY = 0;
    p.x = spot.x; p.y = spot.y;
  } else {
    p.x = spot.x; p.y = spot.y; p.angle = spot.angle; p.vx = 0; p.vy = 0;
    w.camYaw = spot.angle;
  }
  lastSafe = { x: spot.x, y: spot.y, angle: spot.angle };
}

// Het spel is niet bij de speler (filmpje, sterven, trein): geen waarschuwing en geen terugzetting.
export function updateEdgeGuard(dt, w) {
  const edge = regionEdgeLayer();
  if (!edge || !w.map || !hoofdspeler(w) || w.paused) return;
  const p = hoofdspeler(w), v = p.inVehicle;
  const x = v ? v.x : p.x, y = v ? v.y : p.y;
  const mode = modeOf(p, v, w);
  if (watch.phase === 'scene') {
    // de speler draait zelf om, reist of laadt en staat weer binnen: de scène vervalt (geen terugzetting)
    acc += dt;
    if (acc >= CHECK_S) {
      acc = 0;
      const now = ruleAt(w, edge, mode, x, y);
      if (!now || playerBusy(w, KEEP_QUIET).busy) { cancelEdgeWatch(watch); clearScene(); return; }
    }
    for (const q of props) animateProp(q, dt, w.time);
    const skip = !!(w.input && w.input.wasPressed && w.input.wasPressed('e'));
    const ev = stepEdgeWatch(watch, null, dt, { x, y, skip });
    if (ev && ev.type === 'back') { putBack(w, ev.spot); clearScene(); w.addMessage(ev.plan.lines[1] || '', 4, { kind: 'tip' }); }
    return;
  }
  acc += dt;
  if (acc < CHECK_S) { stepEdgeWatch(watch, null, dt); return; }
  acc = 0;
  if (playerBusy(w, KEEP_QUIET).busy) { stepEdgeWatch(watch, null, dt); return; }
  rule = ruleAt(w, edge, mode, x, y);
  if (!rule) lastSafe = { x, y, angle: v ? v.angle : p.angle };
  const ev = stepEdgeWatch(watch, rule, dt, { x, y });
  if (!ev) return;
  if (ev.type === 'warn') {
    w.addMessage(ev.rule.text, 4, { kind: 'tip' });
    w.addMessage('Je verlaat het speelgebied: keer om.', 4, { kind: 'tip' });
  } else if (ev.type === 'scene') showScene(w, ev.plan);
}
