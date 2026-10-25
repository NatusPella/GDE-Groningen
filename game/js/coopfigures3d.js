// Samen spelen (#95): de figuren van de andere spelers in de wereld. Elke figuur is een
// echt persoonsmodel (models3d_people.buildPersonMesh, dezelfde als de NPC's en de
// metgezel) met een eigen kleur en uiterlijk (coopplayers.figuurLook), een naamlabel
// in zijn kleur en de loopanimatie. Wat er wel of niet bestaat komt uit coopfigures.js
// (getest); dit bestand is alleen three.js en is niet in beeld bekeken.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene, getVehicleMesh } from './scene3d.js';
import { syncZitters, aantalZitters } from './coopzitten3d.js';
import { bestuurdersLijst } from './coopbestuur.js';
import { isCinematicActive } from './cinematics.js';
import { buildPersonMesh, animatePersonWalk, setHeldWeapon, applyAttackPose } from './models3d_people.js';
import { avatarVan, avatarLook, avatarLabel } from './coopspeler.js';
import { ruimMeshOp } from './coopruim.js';
import { syncBezig, hasBezigMeshes } from './coopbezig3d.js';
import { planFigures, walkSpeed, LABEL_Y } from './coopfigures.js';
import { cutsceneSpeelt } from './coopcut.js';

const meshes = new Map(); // plek -> { mesh, char, label, prev }

function makeLabel(spec) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 34px "Arial Narrow", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(8,16,10,0.65)'; g.fillRect(8, 8, 240, 48);
  g.fillStyle = spec.kleur; g.fillText(spec.tekst, 128, 33);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  spr.scale.set(1.8, 0.45, 1); spr.position.y = LABEL_Y; spr.renderOrder = 10;
  return spr;
}

function build(scene, fig) {
  const av = avatarVan(fig, fig.slot); // (#455) altijd de online-avatar, nooit Tammo of Tessa
  const look = avatarLook(av);
  const mesh = buildPersonMesh(look.shirt, look.skin, look.opts);
  mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const label = makeLabel(avatarLabel(av));
  mesh.add(label);
  scene.add(mesh);
  return { mesh, char: av.char, label, prev: null };
}
function dispose(scene, e) {
  if (e.label) { e.mesh.remove(e.label); ruimMeshOp(null, e.label, { geometrie: false, materiaal: true }); } // het label heeft een eigen kaart en materiaal
  ruimMeshOp(scene, e.mesh);
}

const hasZitters = () => aantalZitters() > 0;
export const hasFigureMeshes = () => meshes.size > 0 || hasZitters() || hasBezigMeshes();

// Elke frame (main.js): maak, verplaats en ruim op volgens world.coopFigures.
export function syncFigures(world, dt) {
  const scene = getScene();
  if (!scene) return;
  // Een scène van de gastheer loopt soms in bedrijven: tussen twee bedrijven is er geen
  // filmpje, maar de andere spelers staan dan nog steeds niet in die scène (#434).
  const filmpje = isCinematicActive() || !!world.cinematicHidePlayers || cutsceneSpeelt(world);
  syncBezig(world, dt); // wie hengelt, pannenkoeken bakt of de beiaard speelt, met zijn gereedschap (#429)
  const plan = planFigures([...meshes.keys()], world.coopFigures);
  for (const slot of plan.remove) { dispose(scene, meshes.get(slot)); meshes.delete(slot); }
  for (const f of plan.add) meshes.set(f.slot, build(scene, f));
  for (const f of [...plan.keep, ...plan.add]) {
    let e = meshes.get(f.slot);
    const avatarChar = avatarVan(f, f.slot).char; // (#455) de avatar bepaalt het model, niet de verhaalrol
    if (e.char !== avatarChar) { dispose(scene, e); e = build(scene, f); meshes.set(f.slot, e); }
    const map = world.map;
    if (map && map.elev && map.elev.has && map.groundHeightAt) { try { f.gz = map.groundHeightAt(f.x, f.y, f.gz || 0); } catch (er) { /* hoogte onbekend: vlak */ } }
    e.mesh.visible = !f.coopVoertuig && !filmpje; // wie meerijdt zit in het voertuig (#372); in een filmpje staan alleen de spelers van de scène in beeld (#376)
    e.mesh.position.set(f.x, (f.gz || 0) + (f.z || 0), f.y);
    e.mesh.rotation.y = -(f.angle || 0);
    e.mesh.userData.crouch = !!f.crouching; // bukken (#434)
    animatePersonWalk(e.mesh, walkSpeed(e.prev, f, dt), dt);
    if (f.coopWapen !== undefined || f.coopFx) { // het wapen in zijn hand en zijn slag of schot (een gast met een wapen, coopwapen.js, #434)
      try { setHeldWeapon(e.mesh, f.coopWapen || null); if (f.coopWapen || f.coopFx) applyAttackPose(e.mesh, f.coopFx, world.time, null); } catch (er) { /* zonder wapen */ }
    }
    e.prev = { x: f.x, y: f.y };
  }
  // bij de gastheer: de extra spelers in zijn voertuig zitten op hun stoel in zijn model (bij een gast doet coopentities3d.js dit voor iedereen, #434)
  if (world.coopRole !== 'client') {
    const lijst = Object.values(world.coopFigures || {}).filter((f) => f && f.inVeh && f.stoel != null && f.char && !f.coopBestuurt).map((f) => ({ slot: f.slot, char: avatarVan(f, f.slot).char, voertuig: f.inVeh, stoel: f.stoel })).concat(bestuurdersLijst(world)); // plus de gasten die zelf een voertuig besturen (#434)
    if (lijst.length || hasZitters()) syncZitters(filmpje ? [] : lijst, (v) => { const mesh = getVehicleMesh(v.id); return mesh ? { mesh, v } : null; }, filmpje ? null : world);
  }
}

