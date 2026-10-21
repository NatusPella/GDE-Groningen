import { getScene } from './scene3d.js';
import { notifyPhone } from './phonefeed.js';
import { buildUfoMesh, kleurLampjes, buildStraal, setStraal } from './ufo3d.js';
import * as S from './schaapontvoering.js';

// Schaapontvoering (#333), de kant van de wereld: kiest in de nacht een grazend wildlife-schaap op het land,
// laat schaapontvoering.js de schotel, de straal en het optillen sturen, en tekent ze. Het schaap blijft staan
// (wildlife.js slaat een `ontvoerd` dier over), hangt via `a.lift` boven de grond (scene3d.js) en verdwijnt
// in de schotel. Eén keer per nacht hoogstens, en alleen als de speler het kan zien. `window.__ontvoering` debug.

let st = null, schaap = null, ufo = null, straal = null, nacht = null, plan = false, klaar = false, checkT = 3, regel = -1, hudT = 0;
let sceneOverride = null;

function mesh(scene) {
  if (ufo) return;
  ufo = buildUfoMesh();
  ufo.g.visible = false;
  straal = buildStraal();
  scene.add(ufo.g, straal);
}

function stop() {
  if (schaap) { schaap.lift = 0; schaap.draai = 0; schaap.ontvoerd = false; }
  if (ufo) ufo.g.visible = false;
  if (straal) straal.visible = false;
  st = null; schaap = null;
}

// het schaap is in de schotel: weg uit de wereld
function schaapWeg(world) {
  if (!schaap) return;
  const i = world.wildlife ? world.wildlife.indexOf(schaap) : -1;
  if (i >= 0) world.wildlife.splice(i, 1);
  schaap.ontvoerd = false; schaap.lift = 0;
  schaap = null;
}

export const zetScene = (scene) => { sceneOverride = scene; };   // tests: een eigen scene in plaats van die van het spel

// Begin de ontvoering van dit schaap (de wereld kiest het, of een test/ontwikkelaar).
export function startOntvoering(world, dier, hoek = Math.random() * Math.PI * 2) {
  if (st || !dier) return false;
  mesh(sceneOverride || getScene());
  schaap = dier;
  schaap.ontvoerd = true;
  schaap.speed = 0;
  st = S.begin(dier, hoek, S.nachtNr(world.clock));
  regel = -1;
  return true;
}

export function tickSchaapontvoering(dt, world, scene = null) {
  if (scene) sceneOverride = scene;
  if (!st) {
    if (!world.wildlife || !world.player) return;
    if ((checkT -= dt) > 0) return;
    checkT = S.CHECK_S;
    if (!S.isNacht(world.clock)) return;
    const n = S.nachtNr(world.clock);
    if (n !== nacht) { nacht = n; plan = Math.random() < S.KANS_PER_NACHT; klaar = false; }
    if (!plan || klaar) return;
    // niet vlak na het hoofdverhaal of in een scène waar de speler naar iets anders kijkt
    if (world.cinematic || world.cameraOverride) return;
    const pick = S.kiesSchaap(world.wildlife, world.player, Math.random());
    if (pick && startOntvoering(world, pick)) klaar = true;
    return;
  }
  // het schaap is intussen weggehaald (de speler is ver weg gereden): de schotel gaat er alleen vandoor
  if (schaap && world.wildlife && !world.wildlife.includes(schaap) && st.fase !== 'weg') { st.fase = 'weg'; st.t = 0; st.schaapWeg = true; st.lift = Math.min(st.lift, S.HOOGTE - 2.4); }
  S.stap(st, dt);
  const t = world.time || 0;
  ufo.g.visible = true;
  ufo.g.position.set(st.ufo.x + Math.sin(t * 1.3) * 0.6, st.ufo.z + Math.sin(t * 1.7) * 0.5, st.ufo.y);
  ufo.g.rotation.y += dt * 0.9;
  kleurLampjes(ufo.lights, t);
  setStraal(straal, S.straalVan(st), t);
  if (st.schaapWeg) schaapWeg(world);
  if (schaap) {
    schaap.lift = st.lift;
    schaap.draai = st.draai;
    schaap.speed = 0;
  }
  // één korte regel op het scherm als de straal aangaat, en op het eind een Kiekdoar-bericht
  if (st.fase === 'straal' && regel < 0) { regel = Math.floor(Math.random() * S.REGELS.length); if (schaap && Math.hypot(schaap.x - world.player.x, schaap.y - world.player.y) < S.BEREIK[1] && world.addMessage) world.addMessage(S.REGELS[regel], 4); }
  if (st.klaar) {
    try { notifyPhone(world, { from: 'Kiekdoar', app: 'sikkom', text: S.NIEUWS, voiced: false }); } catch (e) { /* geen telefoon: dan alleen de schotel */ }
    stop();
  }
}

if (typeof window !== 'undefined') {
  window.__ontvoering = {
    status: () => (st ? { fase: st.fase, t: +st.t.toFixed(1), lift: +st.lift.toFixed(1), straal: +st.straal.toFixed(2), ufo: { ...st.ufo } } : null),
    start: (world, dier) => startOntvoering(world, dier || S.kiesSchaap(world.wildlife, world.player, 0)),
    nacht: () => ({ nacht, plan, klaar }),
  };
}
