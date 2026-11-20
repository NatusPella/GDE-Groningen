// #955: aankleding bij een race. Een finish met een boog en een doek, pylonen
// langs de kant, hekken en een rij toeschouwers: een race hoort ergens te
// eindigen waar mensen staan te kijken, niet op een lege weg.
//
// De opstelling is puur (raceDecorPlan) en met een test na te spelen; het
// tekenen heeft three.js en de scène nodig.
import * as THREE from 'three';
import { getScene } from './scene3d.js';
import { buildPersonMesh, releasePersonGeometry } from './models3d_people.js';
import { signBothSides, fitText } from './canvastex.js';
import { buildCrowd, updateCrowd, disposeCrowd } from './crowd.js';
import { seedFromKey } from './crowdplan.js';
import { raceDressingPlan, routeInfo, pathClearCircles, startSignalState } from './cinetemplates.js';

const SHIRTS = [0xc8552e, 0x2f6fb0, 0xe0b93a, 0x3f8a52, 0x8a4a8a, 0xd8d2c2, 0x555f6e];
const SKINS = [0xf1c9a5, 0xd9a06e, 0xa9744a, 0x7a4e2e];

// Waar de spullen komen, in meters langs (x) en naast (y) de finishlijn. De
// finishlijn staat loodrecht op `a` (de richting van de baan).
export function raceDecorPlan({ count = 6 } = {}) {
  const n = Math.max(2, Math.min(10, count | 0 || 6));
  const cones = [];
  for (let i = 0; i < n; i++) {
    const k = i / Math.max(1, n - 1) - 0.5; // -0.5 .. 0.5
    cones.push({ along: k * 22, side: -7.2, kind: 'cone' }, { along: k * 22, side: 7.2, kind: 'cone' });
  }
  const people = [];
  for (let i = 0; i < 8; i++) {
    const k = i / 7 - 0.5;
    people.push({ along: k * 18 + (i % 2 ? 0.6 : -0.6), side: i % 2 ? 10.4 : 11.6, height: 0.9 + (i % 3) * 0.04 });
  }
  return { poles: [{ along: -8.2, side: 0 }, { along: 8.2, side: 0 }], cones, people, barriers: [{ along: -11, side: 7.2 }, { along: 11, side: -7.2 }] };
}

function banner(text, w = 6.4) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#f0ede4'; g.fillRect(0, 0, 512, 96);
  g.strokeStyle = '#d93f3f'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 88);
  g.fillStyle = '#d93f3f'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitText(g, text, 470, 46, 'bold', 'Arial', 22); g.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return signBothSides(w, 1.1, new THREE.MeshBasicMaterial({ map: tex }));
}

function cone() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.62, 6), new THREE.MeshLambertMaterial({ color: 0xe4571e }));
  m.position.y = 0.31;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  base.position.y = 0.025;
  g.add(m, base);
  return g;
}

function barrier() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 0.08), new THREE.MeshLambertMaterial({ color: 0x9aa0a8 }));
    post.position.set((i - 1) * 1.4, 0.52, 0);
    g.add(post);
  }
  for (let i = 0; i < 2; i++) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.18, 0.06), new THREE.MeshLambertMaterial({ color: i ? 0xd8d2c2 : 0xc8261e }));
    rail.position.set(0, i ? 0.92 : 0.6, 0);
    g.add(rail);
  }
  return g;
}

// at: { x, y, a? } van de finish; y is de map-coördinaat, de hoogte komt van de kaart.
export function buildRaceDecor(world, at, { title = 'FINISH', count = 6, scene: target = null } = {}) {
  const scene = target || getScene();
  if (!scene || !at || !Number.isFinite(at.x) || !Number.isFinite(at.y)) return null;
  const a = Number.isFinite(at.a) ? at.a : 0;
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const origin = { x: at.x, y: at.y };
  const z = world && world.map && world.map.groundHeightAt ? world.map.groundHeightAt(at.x, at.y, 0) || 0 : 0;
  const plan = raceDecorPlan({ count });
  const group = new THREE.Group();
  group.name = 'race-decor';
  const place = (o, along, side) => {
    const x = origin.x + ux * along + nx * side, y = origin.y + uy * along + ny * side;
    const gz = world && world.map && world.map.groundHeightAt ? world.map.groundHeightAt(x, y, 0) || 0 : z;
    o.position.set(x, gz, y);
    group.add(o);
    return o;
  };
  // de finishboog: twee palen met een doek ertussen
  const [p1, p2] = plan.poles;
  for (const p of [p1, p2]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4.4, 8), new THREE.MeshLambertMaterial({ color: 0xd8d2c2 }));
    pole.position.y = 2.2;
    place(pole, p.along, p.side);
  }
  const arch = banner(title, 16.8);
  arch.position.set(origin.x, z + 4.2, origin.y);
  arch.rotation.y = -a + Math.PI / 2;
  group.add(arch);
  for (const c of plan.cones) place(cone(), c.along, c.side);
  for (const b of plan.barriers) place(barrier(), b.along, b.side);
  // het publiek achter de hekken
  plan.people.forEach((p, i) => {
    const m = buildPersonMesh(SHIRTS[i % SHIRTS.length], SKINS[i % SKINS.length], { seed: 900 + i, variant: i % 3 === 0 ? 'female' : null });
    place(m, p.along, p.side);
    m.rotation.y = -a + (p.side > 0 ? 0 : Math.PI);
    m.scale.y = p.height;
  });
  scene.add(group);
  return group;
}

// Bouwsteen G0b: aankleding voor een `checkpoint`-race (M05) die zelf geen start of finish heeft.
// route: [x, y]-punten van de start naar de finish. Een startboog, een finishboog (buildRaceDecor),
// twee groepen publiek langs het begin en het eind (uit het parcours gehouden) en een startlicht.
// Samen spelen: lokaal opgebouwd uit route en sleutel, geen netwerkstaat; een tweede aanroep met
// dezelfde sleutel (een gast die dezelfde stap draait) bouwt het publiek niet nog eens.
export function buildCheckpointRaceDecor(world, route, { key = null, startCount = 24, finishCount = 40, title = 'FINISH', scene = null } = {}) {
  const info = routeInfo(route);
  if (!info) return null;
  const k = key || `race:${Math.round(info.start.x)}:${Math.round(info.start.y)}`;
  const plan = raceDressingPlan(info, { startCount, finishCount, title });
  // een ronde (plan.loop): één boog op de lijn, niet een start- en een finishboog op elkaar
  const groups = (plan.loop ? [buildRaceDecor(world, plan.finish, { title: plan.finish.title, scene })] : [buildRaceDecor(world, plan.start, { title: plan.start.title, count: 4, scene }), buildRaceDecor(world, plan.finish, { title: plan.finish.title, scene })]).filter(Boolean);
  const clear = pathClearCircles([route], 3.5);
  const crowds = plan.crowds.map((c) => buildCrowd(world, { ...c.spec, seed: seedFromKey(k + ':' + c.id), clear }, { key: k + ':' + c.id, scene })).filter(Boolean);
  const lights = buildStartLights(world, plan.start, { scene });
  return { key: k, plan, groups, crowds, lights };
}

export function updateCheckpointRaceDecor(h, dt, focus = null, t = null) {
  if (!h) return;
  for (const c of h.crowds) updateCrowd(c, dt, focus, focus);
  if (h.lights && t != null) setStartLights(h.lights, t);
}

export function disposeCheckpointRaceDecor(h) {
  if (!h) return;
  for (const c of h.crowds) disposeCrowd(c);
  for (const g of h.groups) disposeRaceDecor(g);
  disposeRaceDecor(h.lights && h.lights.group);
  h.crowds.length = 0; h.groups.length = 0; h.lights = null;
}

// Het startlicht: een portaal met drie lampen bij de startboog. setStartLights(h, t) zet ze
// volgens startSignalState (cinetemplates.js): rood, rood, rood, dan groen.
export function buildStartLights(world, at, { scene = null } = {}) {
  const target = scene || getScene();
  if (!target || !at || !Number.isFinite(at.x) || !Number.isFinite(at.y)) return null;
  const a = Number.isFinite(at.a) ? at.a : 0;
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const group = new THREE.Group();
  group.name = 'start-lights';
  const gz = (x, y) => (world && world.map && world.map.groundHeightAt ? world.map.groundHeightAt(x, y, 0) || 0 : 0);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 2.2), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  const px = at.x + ux * 3 + nx * 7.4, py = at.y + uy * 3 + ny * 7.4;
  bar.position.set(px, gz(px, py) + 3.6, py);
  bar.rotation.y = -a;
  group.add(bar);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.6, 8), new THREE.MeshLambertMaterial({ color: 0x9aa0a8 }));
  post.position.set(px, gz(px, py) + 1.8, py);
  group.add(post);
  const lamps = [-0.7, 0, 0.7].map((o) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0x331111 }));
    m.position.set(px + nx * o - ux * 0.2, bar.position.y, py + ny * o - uy * 0.2);
    group.add(m);
    return m;
  });
  target.add(group);
  return { group, lamps };
}

export function setStartLights(h, t) {
  if (!h) return;
  const s = startSignalState(t);
  h.lamps.forEach((m, i) => m.material.color.setHex(s.go ? 0x22cc44 : i < s.lit ? 0xff2a1a : 0x331111));
}

export function disposeRaceDecor(group) {
  if (!group) return;
  group.removeFromParent();
  group.traverse((o) => {
    // #796: de rompgeometrie van een figuur is gedeeld; alleen de ref teruggeven
    if (o.isSkinnedMesh) { releasePersonGeometry(o); if (o.skeleton) o.skeleton.dispose(); return; }
    if (o.geometry) o.geometry.dispose();
    if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
  });
}
