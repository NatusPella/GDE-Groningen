// Het erf van boer Roelf bij het carbidveld (24-11, feedback eigenaar: "totaal niet te zien dat het carbidschieten is, en die staat
// ook in een totaal kaal weiland"). Rond de melkbus van het spel (carbid.js) staat nu een herkenbaar carbiderf: een rij melkbussen
// op bokken met de deksels erin, emmers water en blikken carbid, hekken met toeschouwers op afstand, de koffietafel, een trekker met
// een wagen balen, een werktuigenloods, een kop-hals-rompboerderij en bomen. Alles komt uit de echte bibliotheken: de props uit
// propregister.js (via storyprops.js DECOR_MAKERS), de boerderij, loods en bomen uit countrymodels.js (dezelfde bouwers als het
// platteland), de trekker uit het voertuigregister en de mensen uit het kledingsysteem (modulair als dat aan staat).
//
// Coördinaten in het veld: u langs de schietlijn (+u het veld in), v dwars (+v rechts, gezien vanaf de bus). In three-lokaal van
// de veldgroep is x = u en z = v; een ding dat naar richting phi kijkt (vanaf +u naar +v) heeft rotation.y = -phi.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { DECOR_MAKERS } from './storyprops.js';
import { shedGeometry, roundTreeGeometry, poplarGeometry, farmKHRGeometry, FARM_LOOKS, trailerBodyGeometry, trailerBaseGeometry } from './countrymodels.js';
import { buildPersonMesh } from './models3d_people.js';
import { buildModularFromAppearance, modularReady, mensenFase } from './modularpeople.js';
import { buildVehicleMesh } from './models3d_vehicles.js';
import { TRACTOR_MODEL } from './vehicle.js';
import { animateActor } from './actoranim.js';
import { FLAGS } from './devflags.js';
import { markShared } from './pixelart3d.js';
import { MELKBUS, BOK_WIEG } from './carbidprops3d.js';
import { isInWater, pointInPolygon } from './util.js';

// De hoogte van de as van een liggende bus op een bok
export const BUS_AS = BOK_WIEG + MELKBUS.r + 0.008;

// De rij bussen naast die van het spel (v), elk een eigen bok, deksel en emmer; de bus van het spel staat op v = 0
export const RIJ = [-2.6, -5.2, 2.7];

// Wat er op het erf staat (u, v, phi). Achter de bus loopt een sloot (gemeten op de echte kaart, 24-11) en links de weg: het erf
// ligt rechts van de schietlijn (+v), de boerderij met haar romp langs het veld. Het veld zelf (v < 6) blijft vrij.
export const ERF = {
  hekken: [[-9, 6.6, Math.PI / 2], [-5, 6.6, Math.PI / 2], [-1, 6.6, Math.PI / 2], [3, 6.6, Math.PI / 2]],
  tafel: [-6.2, 4.3, 0],
  trekker: [6, 13.5, Math.PI],
  balen: [[-10.5, 11.5, 0], [-10.5, 12.9, 0], [-10.5, 12.2, 0, 1.2]],
  loods: [-3, 15.5, Math.PI],
  boerderij: [-8, 32, 0],
  bomen: [[-13, 22, 'rond'], [-14, 39, 'rond'], [46, 28, 'rond'], [20, 9.5, 'rond'], ...[-10, 0, 10, 20, 30, 40].map((u) => [u, 48, 'populier'])],
  // de toeschouwers achter het hek (op afstand), met gehoorkappen voor wie dichtbij staat
  publiek: [
    { u: -9.6, v: 7.6, rol: 'boer', seed: 7311, anim: 'idle', kap: false, shirt: 0x2f5a3a, skin: 0xe2b48c, variant: 'male', hairStyle: 'short', look: { age: 'old', hat: 'flatcap', hatColor: 0x3a3a34 } },
    { u: -8.4, v: 7.9, rol: 'voetganger', seed: 7323, anim: 'phone', kap: false, shirt: 0xc9a227, skin: 0xb98a62, variant: 'female', hairStyle: 'long' },
    { u: -5.8, v: 7.5, rol: 'feestganger', seed: 7337, anim: 'idle', kap: true, shirt: 0xb8352a, skin: 0xd9b48f, variant: 'male', hairStyle: 'curly' },
    { u: -2.4, v: 7.7, rol: 'boer', seed: 7349, anim: 'hips', kap: true, shirt: 0x6a4a8a, skin: 0x8a5a3c, variant: 'female', hairStyle: 'bun' },
  ],
};

let mats = null;
function materials() {
  if (mats) return mats;
  const vc = (color = 0xffffff, o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, color, roughness: 0.85, ...o });
  mats = { boom: vc(), boerderij: vc(), loods: vc(0xc4c8bf), wagen: vc(0x8e4a32), wagenOnder: vc() };
  for (const m of Object.values(mats)) m.userData.shared = true; // het veld en de trailershot delen ze: nooit weggooien
  return mats;
}
const geos = {};
const geo = (k, f) => geos[k] || (geos[k] = markShared(f()));

const prop = (id) => DECOR_MAKERS[id]();
function put(parent, o, u, v, y = 0, phi = 0) {
  o.position.set(u, y, v);
  o.rotation.y = -phi;
  o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  parent.add(o);
  return o;
}

// Een mens uit het kledingsysteem: modulair (Quaternius) als de decorsets dat mogen, anders de procedurele mens met dezelfde look.
export function setMens(look) {
  const q = mensenFase(FLAGS.mensen) >= 2 && modularReady()
    ? buildModularFromAppearance({ ...look, look: look.look || {} }) : null;
  return q || buildPersonMesh(look.shirt, look.skin, look);
}

// Gehoorkappen op een hoofd (de scène én het publiek)
export function zetGehoorkap(mens) {
  // op de kruin van de mens (de hoogte uit zijn eigen omhullende: modulair en procedureel hebben verschillende hoofdbotten), de kappen
  // op oorhoogte, langs z (opzij); de mens kijkt naar +x
  const kap = prop('gehoorkap');
  mens.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mens);
  const voet = mens.getWorldPosition(new THREE.Vector3()).y;
  const kruin = Number.isFinite(box.max.y) ? (box.max.y - voet) / (mens.scale.y || 1) : 1.78;
  kap.position.set(0.0, kruin - 0.19, 0);
  kap.scale.setScalar(1.12);
  mens.add(kap);
  return kap;
}

// Een liggende bus op een bok, de mond iets omhoog (de spie), het deksel erin. Geeft { groep, bus, deksel }.
export function busOpBok(el = 0.2) {
  const g = new THREE.Group();
  g.add(prop('carbidbok'));
  const bus = new THREE.Group();
  bus.position.set(-0.26, BUS_AS, 0);
  bus.rotation.z = el;
  const m = prop('melkbus');
  m.position.set(-0.08, -(MELKBUS.r + 0.008), 0);
  bus.add(m);
  const deksel = prop('busdeksel');
  deksel.rotation.z = -Math.PI / 2;
  deksel.position.set(-0.08 + MELKBUS.mond + 0.005, 0, 0);
  bus.add(deksel);
  g.add(bus);
  return { groep: g, bus, deksel };
}

// Is een plek van het erf droog en buiten de gebouwen van de echte kaart? toW(u, v) geeft de kaartcoördinaat. (Het veld en de trailer.)
export function vrijOpKaart(map, toW) {
  return (u, v, r) => {
    if (!map) return true;
    const p = toW(u, v);
    try {
      if (isInWater(map, p.x, p.y)) return false;
      if (typeof map.buildingsNear === 'function' && map.buildingsNear(p.x, p.y, r + 1).some((b) => b.pts && pointInPolygon(p.x, p.y, b.pts))) return false;
    } catch (e) { /* geen kaartgegevens: gewoon plaatsen */ }
    return true;
  };
}

// Het hele erf in de veldgroep `root` (lokaal: x = u, z = v). `vrij(u, v, r)` zegt of een plek droog is en buiten een gebouw van de
// echte kaart ligt (een onderdeel dat daar niet past, vervalt: het erf schuift nooit een sloot of een huis in). Geeft de handvatten
// die de intro en het spel nodig hebben.
export function buildCarbidSet(root, { vrij = () => true } = {}) {
  const M = materials();
  const set = { rij: [], mensen: [], publiek: [], groep: new THREE.Group(), colliders: [] };
  set.groep.name = 'carbiderf';
  root.add(set.groep);
  const G = set.groep;
  // de rij bussen van de buren, elk met emmer en blik
  for (const v of RIJ) {
    const b = busOpBok(0.18 + (v > 0 ? 0.04 : 0));
    put(G, b.groep, 0, v);
    put(G, prop('carbidspul'), -0.9, v + 0.55, 0, 0.3);
    set.rij.push({ v, ...b });
  }
  // hekken: het publiek staat op afstand
  for (const [u, v, phi] of ERF.hekken) if (vrij(u, v, 2.2)) put(G, prop('weidehek'), u, v, 0, phi);
  // de koffietafel van Hilje
  { const [u, v, phi] = ERF.tafel; if (vrij(u, v, 1)) { put(G, prop('koffietafel'), u, v, 0, phi); set.colliders.push([u, v, 0.8]); } }
  // de trekker met een wagen balen erachter
  { const [u, v, phi] = ERF.trekker;
    if (vrij(u, v, 5)) {
      const t = buildVehicleMesh({ id: 'carbid-trekker', model: { ...TRACTOR_MODEL }, health: 100 });
      put(G, t, u, v, 0, phi);
      const w = new THREE.Group();
      w.add(new THREE.Mesh(geo('wagen', trailerBodyGeometry), M.wagen), new THREE.Mesh(geo('wagenOnder', trailerBaseGeometry), M.wagenOnder));
      const c = Math.cos(phi), s = Math.sin(phi), d = 2.15 + 4.0;
      put(G, w, u - c * d, v - s * d, 0, phi);
      for (const k of [-1.6, 0, 1.6]) { const baal = prop('hooibaal'); baal.rotation.y = Math.PI / 2; baal.position.set(k, 2.2, 0); w.add(baal); }
      set.colliders.push([u, v, 2.2], [u - c * d, v - s * d, 2.8]);
    } }
  for (const [u, v, phi, y = 0] of ERF.balen) if (vrij(u, v, 1)) put(G, prop('hooibaal'), u, v, y, phi);
  // de werktuigenloods, de boerderij en de bomen (platteland-bouwers)
  { const [u, v, phi] = ERF.loods;
    if (vrij(u, v, 6)) { const l = new THREE.Mesh(geo('loods', shedGeometry), M.loods); l.scale.set(12, 1, 9); put(G, l, u, v, 0, phi); set.colliders.push([u, v, 6]); } }
  { const [u, v, phi] = ERF.boerderij;
    // de boerderij is groot (50 bij 24 m): alleen als de hele voetafdruk vrij is
    const c = Math.cos(phi), s = Math.sin(phi);
    const vrijB = [0, 10, 25, 40].every((x) => [-10, 0, 10].every((z) => vrij(u + c * x - s * z, v + s * x + c * z, 2)));
    if (vrijB) { put(G, new THREE.Mesh(geo('boerderij', () => farmKHRGeometry(FARM_LOOKS[0])), M.boerderij), u, v, 0, phi); set.boerderij = true; } }
  for (const [u, v, soort] of ERF.bomen) if (vrij(u, v, 1.5)) put(G, new THREE.Mesh(geo(soort, soort === 'rond' ? roundTreeGeometry : poplarGeometry), M.boom), u, v, 0, (u * 7 + v) % 6.28);
  // het publiek achter het hek
  for (const p of ERF.publiek) {
    if (!vrij(p.u, p.v, 0.5)) continue;
    const m = setMens({ shirt: p.shirt, skin: p.skin, seed: p.seed, variant: p.variant, hairStyle: p.hairStyle, look: p.look || {}, role: p.rol, outfitCtx: { hot: true, detail: true } });
    put(G, m, p.u, p.v, 0, -Math.PI / 2 + (p.u % 1) * 0.3);
    if (p.kap) zetGehoorkap(m);
    set.publiek.push({ mesh: m, anim: p.anim, t: p.seed % 7 });
  }
  return set;
}

// Elk beeld: het publiek ademt en kijkt (anim kan de intro overschrijven: juichen en klappen na de knal).
export function animateCarbidSet(set, dt, anim = null) {
  if (!set) return;
  for (const p of set.publiek) { p.t += dt; animateActor(p.mesh, { anim: anim || p.anim, speed: 0, gaze: 0, t: p.t, dt }); }
}
