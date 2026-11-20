// A1 Bietenoogst (AAA-upgradeplan): de aankomst bij de Suikerhal. Naast de bietenhoop staan een weegbrug (plateau met een
// weeghokje) en een oplegger die zijn bak kantelt als de trekker nadert. Geen nieuw asset: dozen en cilinders, zoals de rest
// van missiedecor.js. De plaatsing is puur (weegPlan); het tekenen heeft three en de scène nodig.
//
// Samen spelen: lokaal beeld bij de speler die de bijbaan rijdt (bijbanen zijn per speler, #429). Niets over het net, niets in
// beloning of voortgang; wie wegvalt of later aansluit mist alleen het beeld.
import * as THREE from 'three';
import { getScene } from './scene3d.js';
import { canvasTex, signBothSides } from './canvastex.js';
import { isInWater, pointInPolygon } from './util.js';
import { haakFx } from './sfx/haken.js'; // ronde 4: hydrauliek en weegbrugklik

const eindig = (v) => typeof v === 'number' && Number.isFinite(v);

// Hoever van de hoop de weegbrug en de oplegger staan, en vanaf welke afstand de bak kantelt (van = begint, tot = helemaal).
export const WEEG_AFSTAND = 8.5;
export const KANTEL = { van: 45, tot: 14, hoek: 0.62 };

// De plaatsing rond de hoop. `hoek` is de richting waar de trekker vandaan komt (radialen). De weegbrug staat links van de
// aanrijroute, de oplegger rechts, allebei met hun lengte langs de aanrijroute. `vrij(x, y)` (optioneel) keurt een punt af
// (water, gebouw): een plek die niet mag schuift een stukje op, en valt anders weg.
export function weegPlan(hoop, hoek = 0, vrij = null) {
  if (!hoop || !eindig(hoop.x) || !eindig(hoop.y)) return null;
  const h = eindig(hoek) ? hoek : 0;
  const ok = (x, y) => !vrij || vrij(x, y);
  const plek = (zijde) => {
    for (const draai of [0, 0.35, -0.35, 0.7, -0.7]) {
      const r = h + zijde * (Math.PI / 2) + draai;
      const x = hoop.x + Math.cos(r) * WEEG_AFSTAND, y = hoop.y + Math.sin(r) * WEEG_AFSTAND;
      // het hele voetstuk (4 m naar elke kant) moet vrij zijn
      if ([[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]].every(([dx, dy]) => ok(x + dx, y + dy))) return { x, y, a: h };
    }
    return null;
  };
  const weegbrug = plek(1), oplegger = plek(-1);
  if (!weegbrug && !oplegger) return null;
  return { weegbrug, oplegger, hoop: { x: hoop.x, y: hoop.y }, clear: [weegbrug, oplegger].filter(Boolean).map((p) => ({ x: p.x, y: p.y, r: 5 })) };
}

// Hoe ver de bak omhoog staat (0 tot 1) als de trekker op `afstand` van de hoop is: vloeiend van KANTEL.van naar KANTEL.tot.
export function kantelStand(afstand, k = KANTEL) {
  if (!eindig(afstand)) return 0;
  const f = Math.max(0, Math.min(1, (k.van - afstand) / (k.van - k.tot)));
  return f * f * (3 - 2 * f);
}

// De plek-controle voor weegPlan op een echte kaart: niet in water en niet in een gebouw.
export function vrijOpKaart(map) {
  if (!map) return null;
  return (x, y) => {
    try {
      if (isInWater(map, x, y)) return false;
      return !map.buildingsNear(x, y, 3).some((b) => pointInPolygon(x, y, b.pts));
    } catch (e) { return false; }
  };
}

const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
function box(w, h, d, c, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); return m; }
function cyl(r, h, c, x, y, z, seg = 10) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat(c)); m.position.set(x, y, z); return m; }

function bordTex() {
  return canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#f0ede4'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2f6a3a'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#2f6a3a'; g.textAlign = 'center'; g.font = 'bold 30px Georgia, serif';
    g.fillText('WEEGBRUG', w / 2, 44);
    g.font = '20px Georgia, serif'; g.fillText('Suikerhal Hoogkerk', w / 2, 74);
  });
}

// De weegbrug: een plateau (lang 7 m, breed 3 m) in de grond, een weeghokje met een raam en het bord.
function maakWeegbrug() {
  const g = new THREE.Group();
  g.add(box(7, 0.14, 3.1, 0x6e7378, 0, 0.07, 0));
  g.add(box(6.6, 0.06, 2.7, 0x8a9096, 0, 0.17, 0));
  for (const s of [-1, 1]) g.add(box(7.2, 0.18, 0.1, 0xd8c23a, 0, 0.28, s * 1.6)); // gele randen
  g.add(box(2.2, 2.2, 2.0, 0xb8b0a0, -1.2, 1.1, 2.9)); // het weeghokje
  g.add(box(2.4, 0.12, 2.2, 0x6f4d2a, -1.2, 2.26, 2.9));
  g.add(box(1.0, 0.8, 0.04, 0x9fd0e0, -1.2, 1.45, 1.88)); // raam naar het plateau
  g.add(cyl(0.05, 2.4, 0x777d88, 2.2, 1.2, 2.2, 6));
  const tex = bordTex();
  const bord = signBothSides(2.0, 0.75, new THREE.MeshBasicMaterial({ map: tex }));
  bord.position.set(2.2, 2.3, 2.2);
  g.add(bord);
  return { group: g, tex };
}

// De oplegger: een kantelbak op een wielstel, met de bieten erin. De bak draait om het achterscharnier (het groepje `bak`).
function maakOplegger() {
  const g = new THREE.Group();
  g.add(box(6.2, 0.18, 2.1, 0x3a3f46, 0, 0.62, 0)); // het chassis
  for (const x of [-1.6, -0.5, 0.6]) for (const s of [-1, 1]) { const w = cyl(0.5, 0.3, 0x1d1f21, x - 1.2, 0.5, s * 1.0, 12); w.rotation.x = Math.PI / 2; g.add(w); }
  g.add(box(0.9, 0.4, 0.5, 0x777d88, 3.2, 0.7, 0)); // de aanhaakpoot
  const bak = new THREE.Group();
  bak.position.set(-3.0, 0.75, 0); // het scharnier achter
  bak.add(box(5.8, 0.1, 2.2, 0xc8782a, 2.9, 0.05, 0));
  for (const s of [-1, 1]) bak.add(box(5.8, 0.9, 0.08, 0xc8782a, 2.9, 0.5, s * 1.1));
  bak.add(box(0.08, 0.9, 2.2, 0xc8782a, 5.8, 0.5, 0)); // de voorwand
  for (let i = 0; i < 14; i++) { // de bieten: lage, bruine bollen in de bak
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.26 + (i % 3) * 0.04, 6, 5), mat(i % 2 ? 0xb89a6a : 0xa88858));
    b.position.set(0.7 + (i % 7) * 0.7, 0.32 + ((i / 7) | 0) * 0.22, ((i * 37) % 17 - 8) * 0.1);
    bak.add(b);
  }
  g.add(bak);
  return { group: g, bak };
}

// Bouwt de weegbrug en de oplegger; null zonder plan of scène. `plan` komt van weegPlan.
export function buildBietenhal(world, plan) {
  const scene = getScene();
  if (!scene || !plan) return null;
  const groep = new THREE.Group();
  groep.name = 'bietenhal';
  const ground = (x, y) => (world && world.map && world.map.groundHeightAt ? (world.map.groundHeightAt(x, y, 50) || 0) : 0);
  const zet = (o, p) => { o.position.set(p.x, ground(p.x, p.y), p.y); o.rotation.y = -p.a; groep.add(o); };
  let weeg = null, op = null;
  if (plan.weegbrug) { weeg = maakWeegbrug(); zet(weeg.group, plan.weegbrug); }
  if (plan.oplegger) { op = maakOplegger(); zet(op.group, plan.oplegger); }
  scene.add(groep);
  return { groep, weeg, op, stand: 0, world, plan, hydro: false, klik: false };
}

// Elk beeld: de bak kantelt mee met hoe dicht de trekker bij de hoop is. `focus` is { x, y } van de trekker.
export function updateBietenhal(h, dt, focus, hoop) {
  if (!h || !h.op || !focus || !hoop) return;
  const doel = kantelStand(Math.hypot(focus.x - hoop.x, focus.y - hoop.y));
  const stap = Math.min(1, (dt || 0) * 0.8);
  h.stand += (doel - h.stand) * stap; // de bak komt langzaam omhoog en zakt weer
  h.op.bak.rotation.z = h.stand * KANTEL.hoek;
  // ronde 4: de hydrauliek zodra de bak omhoog komt, de klik van de weegbrug als de trekker erop rijdt (elk een keer per nadering)
  const pl = h.plan;
  if (!h.world || !pl) return;
  if (pl.oplegger && !h.hydro && h.stand > 0.15) { h.hydro = true; haakFx(h.world, 'oplegger_hydrauliek', pl.oplegger.x, pl.oplegger.y); }
  else if (h.hydro && h.stand < 0.05) h.hydro = false;
  if (pl.weegbrug) {
    const af = Math.hypot(focus.x - pl.weegbrug.x, focus.y - pl.weegbrug.y);
    if (!h.klik && af < 3.5) { h.klik = true; haakFx(h.world, 'weegbrug_klik', pl.weegbrug.x, pl.weegbrug.y); }
    else if (h.klik && af > 9) h.klik = false;
  }
}

export function disposeBietenhal(h) {
  if (!h) return;
  h.groep.removeFromParent();
  h.groep.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) if (m) { if (m.map) m.map.dispose(); if (m.dispose) m.dispose(); }
  });
  h.groep = null; h.weeg = null; h.op = null;
}
