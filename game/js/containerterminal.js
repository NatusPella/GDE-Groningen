// De containerterminal van M13 in de Eemshaven (#928), als echte rekwisieten in
// de wereld: de missie stuurde je naar container 4471, maar op die plek stond
// alleen gras. Deze module bouwt de stapel, de kraankooi en de kabelsrollen op
// de plekken uit containerplan.js, met vaste botsingen zodat je er niet
// doorheen loopt. De bounds zijn dezelfde als die van de missie, zodat de
// waypoint en de zichtbare container niet meer uit elkaar lopen.
// De THREE-module komt van de aanroeper (heist.js): dit bestand heeft geen eigen
// CDN-import nodig, zodat de netwerkregel van de releasegate groen blijft.
let T = null;
import { getScene } from './scene3d.js';
import { addStaticCollider } from './breakables.js';
import { M13_CRANE, M13_CONTAINER, CONTAINER_STACKS, CABLE_REELS } from './containerplan.js';

let placedOn = null;

const mat = (color) => new T.MeshLambertMaterial({ color });
function doos(g, w, h, d, color, x, y, z) {
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

const CONTAINER_H = 2.6, CONTAINER_W = 2.5;
const HOEK = 0.06; // een paar graden scheef, zoals een echte stapel

function stapel(g, c) {
  const y = CONTAINER_H / 2 + c.stapel * CONTAINER_H;
  const box = new T.Group();
  box.position.set(c.x, 0, c.y);
  box.rotation.y = -HOEK;
  // de bak, met een donkerder dak en een deurzijde
  doos(box, c.lengte, CONTAINER_H, CONTAINER_W, c.kleur, 0, y, 0);
  doos(box, c.lengte - 0.3, 0.12, CONTAINER_W - 0.1, '#333a36', 0, y + CONTAINER_H / 2 + 0.02, 0);
  for (const z of [-CONTAINER_W / 2 - 0.01, CONTAINER_W / 2 + 0.01]) {
    doos(box, c.lengte - 0.25, 0.16, 0.05, '#55524c', 0, y, z);
  }
  // de hoekprofielen
  for (const dx of [-c.lengte / 2 + 0.08, c.lengte / 2 - 0.08]) {
    for (const dz of [-CONTAINER_W / 2 + 0.06, CONTAINER_W / 2 - 0.06]) {
      doos(box, 0.14, CONTAINER_H, 0.14, '#2a2e28', dx, y, dz);
    }
  }
  g.add(box);
  addStaticCollider('container', c.x, c.y, CONTAINER_W / 2, c.lengte / 2, -HOEK, false, y + CONTAINER_H / 2);
}

// De kraankooi: een kleine cabine op poten, met een giek erboven. Je wacht
// erin tijdens de bewakerstap, dus hij staat op de plek van die stap.
function kraan(g) {
  const p = M13_CRANE;
  const k = new T.Group();
  k.position.set(p.x, 0, p.y);
  doos(k, 3.0, 2.6, 3.0, '#e8c93a', 0, 3.6, 0);
  doos(k, 3.2, 0.18, 3.2, '#333a36', 0, 5.0, 0);
  doos(k, 3.0, 0.12, 3.0, '#1f2a3a', 0, 4.1, 1.52);
  for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
    doos(k, 0.22, 2.3, 0.22, '#6d6f66', dx, 1.15, dz);
  }
  // de giek, laag over de kade
  doos(k, 9.0, 0.3, 0.3, '#e8c93a', 5.4, 5.2, 0);
  doos(k, 0.18, 2.0, 0.18, '#6d6f66', 9.6, 4.2, 0);
  g.add(k);
  addStaticCollider('kraankooi', p.x, p.y, 1.7, 1.7, 0, false, 5.1);
}

// De kabelsrollen naast de kraan: twee dikke cilinders op hun kant.
function kabelsrol(g, r) {
  const m = new T.Mesh(new T.CylinderGeometry(r.r, r.r, 2.2, 14), mat('#8a8474'));
  m.rotation.z = Math.PI / 2;
  m.position.set(r.x, r.r, r.y);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  addStaticCollider('kabelrol', r.x, r.y, 1.2, 1.1, 0, false, r.r * 2);
}

// Een keer per wereld: bij een herstart van de missie staan de rekwisieten er al.
export function placeContainerTerminal(world, THREE) {
  if (!T) T = THREE;
  if (!world) return null;
  if (placedOn === world) return world._containerTerminal || null;
  const scene = getScene();
  if (!scene) return null;
  const root = new T.Group();
  root.name = 'containerterminal';
  // een schelpenpad onder de stapel, zodat hij niet in het gras zakt
  const pad = new T.Mesh(new T.BoxGeometry(46, 0.08, 26), mat('#8a8474'));
  pad.position.set(M13_CONTAINER.x, 0.02, M13_CONTAINER.y);
  pad.receiveShadow = true;
  root.add(pad);
  for (const c of CONTAINER_STACKS) stapel(root, c);
  kraan(root);
  for (const r of CABLE_REELS) kabelsrol(root, r);
  scene.add(root);
  world._containerTerminal = root;
  placedOn = world;
  return root;
}

// Voor een test of een tweede missieronde: de rekwisieten weer weg (de
// botsingen blijven staan; die horen bij de vaste wereld).
export function disposeContainerTerminal(world) {
  if (!world || placedOn !== world) return;
  if (world._containerTerminal && world._containerTerminal.removeFromParent) world._containerTerminal.removeFromParent();
  world._containerTerminal = null;
  placedOn = null;
}
