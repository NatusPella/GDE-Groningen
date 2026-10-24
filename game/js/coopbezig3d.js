// Samen spelen (#429): wie van de andere spelers hengelt, pannenkoeken bakt of de beiaard speelt, staat in beeld met zijn hengel, pan
// of klepels in de hand. De figuur zelf blijft een staande speler (zijn lichaam staat stil, zie input.stil); dit tekent er alleen het
// gereedschap bij, in wereldruimte, dus ook bij de eerste gast (de metgezel). De hengel is dezelfde als je eigen (hengelanim.js).
// Niet in beeld bekeken; de logica staat in coopbezig.js (getest).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { maakHengelAnim } from './hengelanim.js';
import { bezigLijst, tikBezig, eenvoudigePose, hengelFase } from './coopbezig.js';
import { ruimMeshOp } from './coopruim.js';

const props = new Map(); // plek -> { beeld, hengel, groep, delen }
const REIK_VOOR = 6; // m: waar de hengel van een ander naartoe wijst

const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
function maakGroep(beeld) {
  const g = new THREE.Group(), delen = {};
  if (beeld === 'pan') {
    const pan = new THREE.Group();
    pan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.05, 10), mat(0x2b2b2e)));
    const steel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5), mat(0x3a2a1a)); steel.rotation.z = Math.PI / 2; steel.position.x = -0.3; pan.add(steel);
    const koek = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 10), mat(0xe0b060)); koek.position.y = 0.04; pan.add(koek);
    g.add(pan); delen.pan = pan; delen.koek = koek;
  } else if (beeld === 'klepels') {
    for (const k of ['links', 'rechts']) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 5), mat(0x7a5a2a));
      m.geometry.translate(0, 0.35, 0); g.add(m); delen[k] = m;
    }
  }
  return { g, delen };
}
function ruim(scene, e) {
  if (e.hengel) e.hengel.dispose();
  if (e.groep) ruimMeshOp(scene, e.groep, { materiaal: true }); // de materialen zijn per prop nieuw (mat in maakGroep)
}

// Elke frame (coopfigures3d.js syncFigures): maak, verplaats en ruim op volgens world.coopBezigVan.
export function syncBezig(world, dt) {
  const scene = getScene();
  const me = world.coopRole === 'client' && world.coopNet && world.coopNet.session ? world.coopNet.session.slot : 0;
  const hebben = world.coopBezigVan && Object.keys(world.coopBezigVan).length;
  if (!scene || (!hebben && !props.size)) return;
  tikBezig(world, dt);
  const lijst = bezigLijst(world, me), nu = new Set(lijst.map((b) => b.slot));
  for (const [slot, e] of props) if (!nu.has(slot) || !lijst.find((b) => b.slot === slot && b.beeld === e.beeld)) { ruim(scene, e); props.delete(slot); }
  for (const b of lijst) {
    let e = props.get(b.slot);
    if (!e) {
      e = { beeld: b.beeld, hengel: null, groep: null, delen: null };
      if (b.beeld === 'hengel') e.hengel = maakHengelAnim();
      else if (b.beeld) { const m = maakGroep(b.beeld); e.groep = m.g; e.delen = m.delen; scene.add(m.g); }
      props.set(b.slot, e);
    }
    const ux = Math.cos(b.angle), uy = Math.sin(b.angle);
    if (e.hengel) {
      const nepWereld = { player: { x: b.x, y: b.y, angle: b.angle, z: b.gz, inVehicle: null }, map: null };
      e.hengel.update(dt, nepWereld, { phase: hengelFase(b.t) }, [], { x: b.x + ux * REIK_VOOR, y: b.y + uy * REIK_VOOR });
    } else if (e.groep) {
      const p = eenvoudigePose(b.beeld, b.t);
      e.groep.position.set(b.x + ux * 0.55, b.gz + 1.0, b.y + uy * 0.55);
      e.groep.rotation.y = -b.angle;
      if (e.delen.pan) { e.delen.pan.rotation.z = p.pan; e.delen.pan.rotation.x = p.omslag; e.delen.koek.visible = p.omslag < 0.6; }
      if (e.delen.links) {
        e.delen.links.position.set(0.1, 0, -0.25); e.delen.links.rotation.z = -0.3 - p.links;
        e.delen.rechts.position.set(0.1, 0, 0.25); e.delen.rechts.rotation.z = -0.3 - p.rechts;
      }
    }
  }
}
export const hasBezigMeshes = () => props.size > 0;
