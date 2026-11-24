// De containerterminal van M13 in de Eemshaven (#928, #1328), als echte rekwisieten in de wereld: de missie stuurde je naar
// container 4471, maar op die plek stond alleen gras. Deze module zet een herkenbare loskade neer op de plekken uit
// containerplan.js: de havenkraan met de kraankooi, de containerstapel, kabelhaspels en bolders aan de kade, hekken, lichtmasten,
// een heftruck en een vrachtwagen. Alles komt uit het centrale prop-register (propregister.js, propmodels3d.js) en het voertuigregister;
// hier staan geen losse dozen of cilinders meer. De verharding volgt de grond (map.surfaceAt) en loopt aan de rand over in het terrein.
// Vaste botsingen, zodat je er niet doorheen loopt. De bounds zijn dezelfde als die van de missie, zodat de waypoint en de zichtbare
// container niet meer uit elkaar lopen.
// De THREE-module komt van de aanroeper (heist.js): dit bestand heeft geen eigen CDN-import nodig, zodat de netwerkregel van de
// releasegate groen blijft.
// Samen spelen: de terminal is decor van de wereld van wie het spel opende; elke client bouwt hem zelf op dezelfde plekken (het plan
// is deterministisch), er gaat niets over het netwerk.
let T = null;
import { getScene } from './scene3d.js';
import { addStaticCollider } from './breakables.js';
import { M13_CRANE, M13_CONTAINER, CONTAINER_STACKS, CABLE_REELS } from './containerplan.js';
import { propGeometry } from './propmodels3d.js';
import { VOERTUIG_REGISTER } from './propregister.js';
import { buildVehicleMesh } from './models3d_vehicles.js';

let placedOn = null;
let hoogte = () => 0;

// een materiaal per kleur: vertexkleur maal materiaalkleur (de containerromp is lichtgrijs, de rederijkleur komt van hier)
const mats = new Map();
const mat = (color = '#ffffff') => {
  let m = mats.get(color);
  if (!m) { m = new T.MeshLambertMaterial({ vertexColors: true, color }); mats.set(color, m); }
  return m;
};
// een prop uit het register op (x, y), op de grond, met de hoek van het spel (three: rotation.y = -hoek)
function prop(g, id, x, y, hoek = 0, { kleur = '#ffffff', schaal = 1, z = 0 } = {}) {
  const m = new T.Mesh(propGeometry(id), mat(kleur));
  m.position.set(x, hoogte(x, y) + z, y);
  m.rotation.y = -hoek;
  if (schaal !== 1) m.scale.setScalar(schaal);
  m.castShadow = true;
  m.receiveShadow = true;
  m.name = 'm13-' + id;
  g.add(m);
  return m;
}

const CONTAINER_H = 2.59, CONTAINER_W = 2.44;
const HOEK = 0.06; // een paar graden scheef, zoals een echte stapel

function stapel(g, c) {
  prop(g, c.lengte > 9 ? 'container40' : 'container20', c.x, c.y, HOEK, { kleur: c.kleur, z: c.stapel * CONTAINER_H });
  addStaticCollider('container', c.x, c.y, CONTAINER_W / 2, c.lengte / 2, -HOEK, false, (c.stapel + 1) * CONTAINER_H);
}

// De havenkraan met de kraankooi. Je wacht er tijdens de bewakerstap, dus hij staat op de plek van die stap: het portaal staat
// over die plek heen en alleen de vier poten botsen, zodat je onder het portaal op de plek zelf kunt staan.
function kraan(g) {
  const p = M13_CRANE;
  prop(g, 'havenkraan', p.x, p.y, Math.PI); // de giek wijst over het water, de kabelhaspels staan aan de landkant (#1035)
  for (const [dx, dy] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) addStaticCollider('kraanpoot', p.x + dx, p.y + dy, 0.4, 0, 0, false, 6);
}

// De kabelhaspels naast de kraan, op hun rand; de straal uit het plan bepaalt de maat (de haspel is 1,2 m in straal gebouwd).
function kabelhaspel(g, r) {
  prop(g, 'kabelhaspel', r.x, r.y, 0, { schaal: r.r / 1.2 });
  addStaticCollider('kabelrol', r.x, r.y, 1.2, 1.1, 0, false, r.r * 2);
}

// Verharding die de grond volgt: betonplaten van 2 m (elk een eigen tint, zoals echte platen) over w x d meter rond (cx, cy),
// met een rand van `rand` meter die van beton via grind naar doorzichtig loopt, zodat de plaat niet als losse plank in het gras ligt.
function verharding(g, cx, cy, w, d, rand = 3) {
  const cel = 2, x0 = cx - w / 2 - rand, y0 = cy - d / 2 - rand, nx = Math.ceil((w + 2 * rand) / cel), ny = Math.ceil((d + 2 * rand) / cel);
  const pos = [], col = [];
  // lineaire kleuren (three rekent vertexkleuren lineair): grijs beton en een bruingrijze grindrand
  const beton = [0.3, 0.3, 0.285], grind = [0.26, 0.235, 0.19];
  // hoe ver een punt in de rand ligt: 0 binnen de plaat, 1 aan de buitenkant
  const randVan = (x, y) => Math.min(1, Math.max(0, Math.max(Math.abs(x - cx) - w / 2, Math.abs(y - cy) - d / 2) / rand));
  const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const xa = x0 + i * cel, ya = y0 + j * cel, xb = xa + cel, yb = ya + cel;
      const tint = 0.94 + hash(i, j) * 0.1;
      const hoek = [[xa, ya], [xb, ya], [xb, yb], [xa, yb]].map(([x, y]) => {
        const k = randVan(x, y);
        const c = beton.map((v, n) => (v * (1 - k) + grind[n] * k) * (k > 0 ? 1 : tint));
        return { p: [x, hoogte(x, y) + 0.05, y], c: [...c, 1 - k * k] };
      });
      for (const q of [0, 1, 2, 0, 2, 3]) { pos.push(...hoek[q].p); col.push(...hoek[q].c); }
    }
  }
  // de winding: de grond kijkt omhoog (+y); (x, y) naar three (x, z) draait de volgorde om
  for (let t = 0; t < pos.length; t += 9) for (let k = 0; k < 3; k++) { const a = pos[t + 3 + k]; pos[t + 3 + k] = pos[t + 6 + k]; pos[t + 6 + k] = a; }
  for (let t = 0; t < col.length; t += 12) for (let k = 0; k < 4; k++) { const a = col[t + 4 + k]; col[t + 4 + k] = col[t + 8 + k]; col[t + 8 + k] = a; }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 4));
  geo.computeVertexNormals();
  const m = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.receiveShadow = true;
  m.renderOrder = -1; // voor de andere doorzichtige dingen: de verharding ligt altijd onderop
  m.name = 'm13-verharding';
  g.add(m);
  return m;
}

// Het decor van de loskade, als offsets van de containerplek en de kraan (meters; binnen de verharding, het pad van de kade naar
// container 4471 aan de +y-kant blijft vrij).
const DECOR_CONTAINERS = [
  { dx: -8, dy: -9, lengte: 12.2, kleur: '#7a8c3a', stapel: 0 },
  { dx: -8, dy: -9, lengte: 12.2, kleur: '#8f2f2a', stapel: 1 },
  { dx: 6.5, dy: -9, lengte: 6.1, kleur: '#c99a3a', stapel: 0 },
  { dx: 14.5, dy: -9, lengte: 6.1, kleur: '#23428a', stapel: 0 },
  { dx: 14.5, dy: -9, lengte: 6.1, kleur: '#d8d4cc', stapel: 1 },
  { dx: -17, dy: 9, lengte: 6.1, kleur: '#2f5a3f', stapel: 0 },
];
const LICHTMASTEN = [[-21, -11.5], [21, -11.5], [-21, 11.5], [21, 11.5]];

function decor(g) {
  const k = M13_CONTAINER, c = M13_CRANE;
  for (const d of DECOR_CONTAINERS) stapel(g, { x: k.x + d.dx, y: k.y + d.dy, lengte: d.lengte, kleur: d.kleur, stapel: d.stapel });
  for (const [dx, dy] of LICHTMASTEN) { prop(g, 'lichtmast', k.x + dx, k.y + dy, 0); addStaticCollider('lichtmast', k.x + dx, k.y + dy, 0.5, 0, 0, false, 10); }
  for (const [dx, dy] of [[5.5, 6], [-5.5, -6]]) { prop(g, 'lichtmast', c.x + dx, c.y + dy, 0); addStaticCollider('lichtmast', c.x + dx, c.y + dy, 0.5, 0, 0, false, 10); }
  // hekken langs de achterkant (-y) en de oostkant (+x) van het containerveld; de kade- en de wegkant blijven open
  for (let i = 0; i < 13; i++) {
    const x = k.x - 21 + i * 3.5, y = k.y - 12.8;
    prop(g, 'havenhek', x, y, Math.PI / 2);
    addStaticCollider('hek', x, y, 0.2, 1.75, 0, false, 2);
  }
  for (let i = 0; i < 7; i++) {
    const x = k.x + 22.8, y = k.y - 10.5 + i * 3.5;
    prop(g, 'havenhek', x, y, 0);
    addStaticCollider('hek', x, y, 0.2, 1.75, Math.PI / 2, false, 2);
  }
  // de heftruck bij de stapel, met de vorken naar de containers; de vrachtwagen wacht op zijn lading
  prop(g, 'heftruck', k.x + 4, k.y + 7.6, -Math.PI / 2);
  addStaticCollider('heftruck', k.x + 4, k.y + 7.6, 0.7, 1.4, Math.PI / 2, false, 2.2);
  const truck = buildVehicleMesh({ id: 'm13-vrachtwagen', model: { ...VOERTUIG_REGISTER.truck.model }, health: 100 });
  const tx = k.x + 3, ty = k.y + 10.9;
  truck.position.set(tx, hoogte(tx, ty), ty);
  truck.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(truck);
  addStaticCollider('vrachtwagen', tx, ty, 1.3, 4.3, 0, false, 3.6);
  // bolders langs de kaderand aan de waterkant van de kraan
  for (const dy of [-5, 0, 5]) prop(g, 'bolder', c.x - 7.2, c.y + dy, 0);
}

// Een keer per wereld: bij een herstart van de missie staan de rekwisieten er al.
export function placeContainerTerminal(world, THREE) {
  if (!T) T = THREE;
  if (!world) return null;
  if (placedOn === world) return world._containerTerminal || null;
  const scene = getScene();
  if (!scene) return null;
  // de ene hoogtevraag van de kaart (map.surfaceAt), zodat alles op de grond staat en niet in het gras zakt of erboven zweeft
  const map = world.map, st = { z: 0, ribbon: null, kind: 'ground' };
  hoogte = map && map.surfaceAt ? (x, y) => { st.z = 0; st.ribbon = null; const r = map.surfaceAt(x, y, st); return r && Number.isFinite(r.z) ? r.z : 0; } : () => 0;
  const root = new T.Group();
  root.name = 'containerterminal';
  // de verharding onder het containerveld (46 x 26 m) en de kadevloer onder de kraan (16 x 14 m)
  verharding(root, M13_CONTAINER.x, M13_CONTAINER.y, 46, 26);
  verharding(root, M13_CRANE.x, M13_CRANE.y, 16, 14);
  for (const c of CONTAINER_STACKS) stapel(root, c);
  kraan(root);
  for (const r of CABLE_REELS) kabelhaspel(root, r);
  decor(root);
  scene.add(root);
  world._containerTerminal = root;
  placedOn = world;
  return root;
}
