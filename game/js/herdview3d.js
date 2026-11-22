// Het vee van Bezit in de wereld (epic #1095, #1101; ontwerp docs/BEZIT-21-11.md 5.4): hoogstens twaalf dieren per weide met een kudde, rond het binnenpunt van het
// perceel, alleen binnen de streamstraal en hoogstens vier weiden tegelijk. De planning (herdview.js) is puur en vast per perceel-ID; hier staat alleen de THREE-kant:
// de bestaande koe-, schaap- en kipmodellen van wildlife.js (hun geometrie wordt gedeeld, een dier is alleen een skelet en een materiaalverwijzing) en het opruimen
// via disposeObject. Elke seconde getikt, niet elk beeld; de dieren staan stil (geen animatie, wel een vaste pose per dier: staan, kijken of grazen; dus ook niets om reducedMotion voor te negeren). Een gast ziet het niet.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene, disposeObject } from './scene3d.js';
import { hoofdspeler } from './players.js';
import { getBezit } from './bezitlive.js';
import { buildCowMesh3D, buildSheepMesh3D, buildChickenMesh3D, KIP_VARIANTEN, poseHerdAnimal } from './wildlife.js';
import { isInWater } from './util.js';
import { herdsVisible, planHerds, diffHerds, herdSig, animalLayout } from './herdview.js';

const TICK_S = 1;
const S = { herds: new Map(), sig: new Map(), t: 0 };
const ground = (w, x, y) => (w.map && w.map.groundHeightAt ? w.map.groundHeightAt(x, y, 0) || 0 : 0);

// Een echte kip (vier looks, een op de zes een haan) in plaats van een eend; elk dier krijgt een vaste pose (staan, kijken, grazen) naar zijn zaad.
export function animalMesh(model, a) {
  const m = model === 'cow' ? buildCowMesh3D(a.seed, a.red) : model === 'sheep' ? buildSheepMesh3D() : buildChickenMesh3D(Math.floor(a.seed * KIP_VARIANTEN));
  poseHerdAnimal(m, model, (a.seed * 3.7) % 1);
  return m;
}
// Een plek is goed als er geen water of gebouw staat (anders slaan we hem over; animalLayout geeft daarvoor extra kandidaten).
function spotOk(w, x, y) {
  try { if (isInWater(w.map, x, y)) return false; } catch (e) { /* geen waterlaag: droog */ }
  return !(w.map.buildingsNear && w.map.buildingsNear(x, y, 6).length);
}

function buildHerd(w, h) {
  const g = new THREE.Group();
  g.name = 'bezit-kudde';
  let placed = 0;
  for (const a of animalLayout(h.id, [h.x, h.y], h.ha, h.n)) {
    if (placed >= h.n) break;
    if (!spotOk(w, a.x, a.y)) continue;
    const m = animalMesh(h.model, a);
    m.position.set(a.x, ground(w, a.x, a.y), a.y);
    m.rotation.y = -a.angle;
    if (a.size !== 1) m.scale.multiplyScalar(a.size);
    g.add(m);
    placed++;
  }
  return g;
}
function dropHerd(id) {
  const g = S.herds.get(id);
  if (g) { if (g.parent) g.parent.remove(g); disposeObject(g); }
  S.herds.delete(id); S.sig.delete(id);
}

// Elke seconde aangeroepen (main.js): plant de kuddes in beeld en bouwt of ruimt alleen op wat verandert.
export function updateHerds(w, dt) {
  if (!w || !w.map || !(dt > 0)) return;
  if (!herdsVisible(w)) { if (S.herds.size) clearHerds(); return; }
  S.t += dt;
  if (S.t < TICK_S) return;
  S.t = 0;
  const sc = getScene(), pl = hoofdspeler(w);
  if (!sc || !pl) return;
  const plan = planHerds(getBezit(), { x: pl.x, y: pl.y }, { current: new Set(S.herds.keys()) });
  const d = diffHerds(S.sig, plan);
  for (const id of d.remove) dropHerd(id);
  for (const h of [...d.change, ...d.add]) {
    dropHerd(h.id);
    const g = buildHerd(w, h);
    S.herds.set(h.id, g); S.sig.set(h.id, herdSig(h));
    sc.add(g);
  }
}
function clearHerds() { for (const id of [...S.herds.keys()]) dropHerd(id); S.t = 0; }
export const herdCount = () => S.herds.size;
