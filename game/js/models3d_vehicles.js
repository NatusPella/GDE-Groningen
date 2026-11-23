import { FLAT_SCALE, flatWheelIndex } from './flatlook.js';
import { LRUCache } from './lrucache.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { applyVehicleLook } from './vehiclelook3d.js'; // epic Autotuning (#1155): v.look komt er na het bouwen op
import { HABBO_PALETTE, habboMaterial, GeoBuilder, vcMaterial, markShared, composeMatrix, tubeGeometry } from './pixelart3d.js';
import { buildPersonMesh, PERSON_RIG, holdPhoneRiding, reachHandFromParent, steerHands } from './models3d_people.js';
import { boatKind, boatHasCabin } from './boattypes.js';
import { CANOPY, RAIL } from './boatdeck.js';
import { midibusDeurXs } from './businterieur.js';
import { ZEESCHIP_SHAPE, SLEPER_SHAPE, zeeschipFit, sleperFit } from './zeeschip3d.js';
import { buildHeliMesh } from './heli3d.js';
import { buildPlaneMesh } from './plane3d.js';
import { hash2, hash3 } from './rng.js';
import { zoneTotals, losseOnderdelen, fietsStaat } from './vehicledamage.js';
import { staatSleutel } from './studentenfiets.js';
import { naadStroken } from './vehicledoorcuts.js';
import { propGeometry } from './propmodels3d.js';
import { DEUR_DEFS as DEUR_DEFS_REF } from './vehicledoors.js';
import { QCARS } from './models/qcars.js';
import { hybrideSchaal, VOERTUIG_REGISTER } from './propregister.js';
import { attachVehicleLods } from './vehiclelod3d.js';
import { DitherLOD } from './lod3d.js';

// Low-poly vehicles. Group origin = vehicle centre at ground level (y=0),
// facing local +X, right-hand side on +Z; sized off v.model.len/wid.
// Body geometry is merged per model variant into a few vertex-coloured meshes
// and cached across instances (geometry.userData.shared). Materials are made
// per vehicle so scene3d can dispose them on despawn; police lamps need their
// own anyway since updatePoliceLamps animates them.


const WHEEL_R = 0.32;
const WHEEL_W = 0.22;
const HERO_LEN = 4.0;
const HERO_WID = 1.65;
const WRECKED_COLOR = 0x1f1d1b;

const G_BODY = 0, G_GLASS = 1, G_LAMP = 2;
const TRIM = 0x1f2022;
const CHROME = 0xb9bcbf;
const GLASS = 0x2b3740;
const HEADLAMP = 0xf2efe4;
const TAIL = 0xa3211b;
const INDICATOR = 0xd9822b;
const PLATE = 0xe3bb1c;
const TIRE = 0x1b1b1c;
const BLUE_TIRE = 0x2f6fb0; // de blauwe banden van de goedkope leenfiets
const RIM = 0x9ea2a6;

// #658: begrensde cache (LRU) i.p.v. een onbegrensde Map
const geoCache = new LRUCache(180);
function cached(key, build) {
  let g = geoCache.get(key);
  if (!g) {
    g = markShared(build());
    g.userData.geoRefs = 0; // #787: hoeveel meshes deze gedeelde geometrie nog tekenen
    geoCache.set(key, g);
  }
  return g;
}

// #787: anders dan bij personGeometries houdt niet de mesh zelf een refcount bij, maar
// onthoudt elk voertuig bij het bouwen de lijst gedeelde geometrieën die het tekent
// (userData.cachedGeometries); scene3d.disposeObject geeft die lijst bij het opruimen terug.
// Een geëvicteerde geometrie blijft in leven zolang een mesh hem tekent en de laatste
// gebruiker ruimt hem op. Zonder teller lekte de GPU-buffer: three.js geeft die alleen
// vrij via dispose(), niet via garbage collection.
function retireCachedGeometry(g) {
  if (!g || !g.userData || typeof g.userData.geoRefs !== 'number') return;
  if (g.userData.geoRefs > 0) { g.userData.geoRetired = true; return; }
  g.dispose();
}
geoCache.onEvict = retireCachedGeometry;

// Een mesh die weggaat geeft zijn gedeelde voertuiggeometrie terug; de laatste gebruiker van
// een geëvicteerde geometrie ruimt hem op.
export function releaseVehicleGeometry(g) {
  if (!g || !g.userData || typeof g.userData.geoRefs !== 'number') return false;
  g.userData.geoRefs = Math.max(0, g.userData.geoRefs - 1);
  if (g.userData.geoRefs === 0 && g.userData.geoRetired) { g.userData.geoRetired = false; g.dispose(); return true; }
  return false;
}

// #787: teller erbij + onthouden op de mesh, zodat ook een onderweg verwisselde geometrie
// (deukkopie, stuurvariant) zijn oorspronkelijke gedeelde geometrie teruggeeft.
function retainCachedGeometry(root, g) {
  if (!root || !root.userData || !g || !g.userData || typeof g.userData.geoRefs !== 'number') return false;
  g.userData.geoRefs++;
  (root.userData.cachedGeometries || (root.userData.cachedGeometries = [])).push(g);
  return true;
}
function retainCachedGeometries(root) {
  root.traverse((o) => { if (o.geometry) retainCachedGeometry(root, o.geometry); });
}
// Alle gedeelde geometrieën van dit voertuig terug naar de teller (scene3d.disposeObject).
export function releaseVehicleGeometries(root) {
  const held = root && root.userData && root.userData.cachedGeometries;
  if (!held) return;
  root.userData.cachedGeometries = null;
  for (const g of held) releaseVehicleGeometry(g);
}

function toHex(c, fallback) {
  if (typeof c === 'number') return c;
  if (typeof c === 'string') return new THREE.Color(c).getHex();
  return fallback;
}

// Glass is a see-through tint so the people inside show; a burnt-out
// wreck gets sooty, matt paint and blind black windows instead.
// no metalness: a mirror sheen turns windscreens into opaque grey sheets against the sky
// #463 (beeldronde): bij 0,42 dekking scheen het verlichte interieur er zo helder doorheen dat een
// cabine van buiten op een open doos leek; de Knakker leek geen voorruit en geen zijruiten te hebben
// terwijl de ruiten er wel in zaten (zelfde mesh als de sedan, 28 glasdriehoeken). Iets dichter glas
// leest als glas en laat het interieur nog steeds zien (#442). De hemelweerkaatsing gaat mee omlaag:
// met een lage ruwheid werd de ruit bij een schuine blik op de lucht een witte plaat.
const GLASS_OPACITY = 0.62;
const GLASS_ROUGHNESS = 0.55;
function vehicleMaterials(wrecked = false) {
  return [
    vcMaterial(wrecked ? { roughness: 0.95, metalness: 0.05 } : { roughness: 0.5, metalness: 0.1 }),
    wrecked ? vcMaterial({ roughness: 0.9, metalness: 0, color: 0x3a3a3a }) : vcMaterial({ roughness: GLASS_ROUGHNESS, metalness: 0, envMapIntensity: 0.12, transparent: true, opacity: GLASS_OPACITY, depthWrite: false }),
    new THREE.MeshBasicMaterial({ vertexColors: true, color: wrecked ? 0x202020 : 0xffffff }),
  ];
}

function lampMaterial(color, emissiveIntensity = 0) {
  return habboMaterial(color, { emissive: color, emissiveIntensity });
}

// --- shared wheels ------------------------------------------------------------

function carWheelGeometry(r, w) {
  return cached(`wheel|${r}|${w}`, () => {
    const B = new GeoBuilder(1);
    const axleZ = (geo) => geo.rotateX(Math.PI / 2);
    B.geo(axleZ(new THREE.CylinderGeometry(r, r, w, 12, 1)), null, TIRE);
    B.geo(axleZ(new THREE.CylinderGeometry(r * 0.64, r * 0.64, w + 0.02, 10, 1)), null, RIM);
    B.geo(axleZ(new THREE.CylinderGeometry(r * 0.18, r * 0.18, w + 0.05, 6, 1)), null, 0x6a6d70);
    // five radial spokes (72 deg symmetry; see SPIN_STEP) plus one dark lug so the roll reads
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      B.box(Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, 0, r * 0.5, r * 0.13, w + 0.035, 0x5c5f62, 0, 0, 0, a);
    }
    B.box(r * 0.8, 0, 0, r * 0.2, r * 0.22, w + 0.012, 0x3a3c3e);
    return B.build();
  });
}

// tireColor: de blauwe banden van de goedkope leenfiets (studentenfiets.js)
// REFLECTOR: één reflector op de velg (#436). Zonder dat ene merkteken is de draairichting van een
// fietswiel niet af te lezen: de vier spaakstangen staan 45° uit elkaar en de band en de velg hebben
// 16 vlakjes (elke 22,5°). Het getekende stuk per beeld loopt bij fietsnelheid op tot 0,34 rad (19,5°),
// meer dan de helft van 22,5°, dus de velg- en bandvlakjes liepen achteruit terwijl de spaken vooruit
// gingen: het voorwiel leek achteruit te draaien. Eén asymmetrisch merkteken maakt de richting
// ondubbelzinnig, net als het donkere moer-merkteken op een autowiel (carWheelGeometry, SPIN_STEP).
const REFLECTOR = 0xd8452f;
function bikeWheelGeometry(r, tire, spokes = true, tireColor = TIRE) {
  return cached(`bwheel|${r}|${tire}|${spokes}|${tireColor}`, () => {
    const B = new GeoBuilder(1);
    B.geo(new THREE.TorusGeometry(r - tire, tire, 4, 16), null, tireColor);
    B.geo(new THREE.TorusGeometry(r - tire * 2 - 0.008, 0.01, 3, 16), null, RIM);
    B.geo(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 6).rotateX(Math.PI / 2), null, RIM);
    if (spokes) {
      for (let k = 0; k < 4; k++) B.box(0, 0, 0, (r - tire * 2) * 2, 0.008, 0.008, 0x8a8e92, 0, 0, 0, (k / 4) * Math.PI);
    } else {
      for (let k = 0; k < 5; k++) B.box(0, 0, 0, (r - tire) * 1.9, 0.03, 0.02, 0x3a3a3c, 0, 0, 0, (k / 5) * Math.PI);
    }
    // de reflector: één blokje op de velg, aan beide kanten van het wiel te zien (breder dan de spaken)
    const rr = (r - tire) * 0.66, rs = Math.max(0.035, (r - tire) * 0.22);
    B.box(rr, 0, 0, rs, rs * 0.75, Math.max(0.03, rs * 0.8), REFLECTOR);
    return B.build();
  });
}

function addWheel(group, geo, mat, x, y, z, wheels) {
  const w = new THREE.Mesh(geo, mat);
  w.position.set(x, y, z);
  group.add(w);
  wheels.push(w);
  return w;
}

// --- generic helpers ------------------------------------------------------------

function extrudeProfile(pts, depth, bevel = 0.04, segments = 1, gaten = []) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  // gaten [x0, y0, x1, y1]: echte deuropeningen dwars door de romp (de deuren links en rechts staan op dezelfde plek)
  for (const [x0, y0, x1, y1] of gaten) {
    const h = new THREE.Path();
    h.moveTo(x0, y0); h.lineTo(x0, y1); h.lineTo(x1, y1); h.lineTo(x1, y0); h.lineTo(x0, y0);
    shape.holes.push(h);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelOffset: -bevel * 0.8,
    bevelSegments: segments,
    curveSegments: 1,
  });
  geo.translate(0, 0, -(depth - bevel * 2) / 2);
  return geo;
}

// Het koetswerk is een dichte extrusie tot de raamlijn: de bovenkant van het profiel tussen
// voor- en achterruit is daardoor één plaat over de hele cabine, dwars door het interieur dat
// sinds #442/#847 door de ruiten te zien is (#923, de Knakker). Die plaat gaat er hier uit,
// net als bij de open cabine van de maaidorser (#847): de raamlijst die er al langs de
// buitenkant ligt (sideStrip) en de ruiten sluiten de band af. Alleen vlakke driehoeken in het
// raamlijnvlak tussen de twee opgegeven x'en verdwijnen; de schuine neus, het dak en de bevels
// blijven staan.
function withoutBeltPlate(geo, beltY, x0, x1, pad = 0.2) {
  const src = geo.index ? geo.toNonIndexed() : geo;
  const pos = src.attributes.position;
  const keep = [];
  const n = pos.count / 3;
  for (let i = 0; i < n; i++) {
    const o = i * 9;
    let flat = true, xmin = Infinity, xmax = -Infinity;
    for (let k = 0; k < 3; k++) {
      const y = pos.array[o + k * 3 + 1], x = pos.array[o + k * 3];
      if (Math.abs(y - beltY) > 1e-3) { flat = false; break; }
      if (x < xmin) xmin = x;
      if (x > xmax) xmax = x;
    }
    if (flat && xmin >= x0 - pad && xmax <= x1 + pad) continue;
    keep.push(o);
  }
  if (keep.length * 9 === pos.count * 3) { if (src !== geo) src.dispose(); return geo; }
  const out = new THREE.BufferGeometry();
  const p = new Float32Array(keep.length * 9);
  keep.forEach((o, i) => { for (let k = 0; k < 9; k++) p[i * 9 + k] = pos.array[o + k]; });
  out.setAttribute('position', new THREE.BufferAttribute(p, 3));
  if (src !== geo) src.dispose();
  geo.dispose();
  return out;
}

// Bottom edge from rear to front with semicircular arches over each wheel.
function archedSill(x0, x1, sillY, arches) {
  const pts = [[x0, sillY + 0.02]];
  for (const { x, r, cy } of arches) {
    pts.push([x - r, sillY]);
    for (let k = 1; k < 7; k++) {
      const a = Math.PI - (k / 7) * Math.PI;
      pts.push([x + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    pts.push([x + r, sillY]);
  }
  pts.push([x1, sillY + 0.02]);
  return pts;
}

// Thin slab lying on a side (z = +-), or along a slope, as a box between two
// profile points (x,y) at a given lateral z.
function sideStrip(B, ax, ay, bx, by, z, thick, depth, color, group = G_BODY) {
  const len = Math.hypot(bx - ax, by - ay);
  B.box((ax + bx) / 2, (ay + by) / 2, z, len, thick, depth, color, group, 0, 0, Math.atan2(by - ay, bx - ax));
}

function archLiners(B, arches, W) {
  for (const { x, r, cy } of arches) {
    const geo = new THREE.CylinderGeometry(r - 0.035, r - 0.035, W - 0.16, 8, 1, true, Math.PI / 2, Math.PI);
    geo.rotateX(Math.PI / 2);
    geo.scale(1, 1, -1);
    B.geo(geo, composeMatrix(x, cy, 0), 0x151516);
  }
}

// Deurnaden en handvatten uit de ene deurtabel (vehicledoorcuts.js): de romp is dicht, dus de naad om het paneel is wat
// een gesloten deur zichtbaar maakt en een open deur een plek geeft waar hij uit komt. Gedeelde, gecachete geometrie.
function addDoorCuts(B, doorName, len, hw, paint, handle = CHROME, zonderHandvat = false) {
  const naad = shadeHex(paint, 0.32);
  for (const s of naadStroken(doorName, len, hw)) {
    if (s.soort === 'handvat' && zonderHandvat) continue; // bij een echt gat zit het handvat op het deurblad zelf
    B.box(s.x, s.y, s.z, s.sx, s.sy, s.sz, s.soort === 'handvat' ? handle : naad);
  }
}
// Een lange strook langs de flank (sierlijn, dorpelstrip, politiestreep), in stukken die bij een echt deurgat ophouden; het stuk
// op de deur gaat mee naar het deurblad (moveDoorDecor), zodat de strook doorloopt als de deur dicht is.
function hboxSplit(B, cx, cy, z, sx, sy, sz, color, gaten) {
  let segs = [[cx - sx / 2, cx + sx / 2]];
  for (const g of gaten) {
    const [x0, y0, x1, y1] = g.rect;
    if (cy + sy / 2 < y0 || cy - sy / 2 > y1) continue;
    const uit = [];
    for (const [a, b] of segs) {
      if (b <= x0 || a >= x1) { uit.push([a, b]); continue; }
      if (a < x0) uit.push([a, x0]);
      uit.push([Math.max(a, x0), Math.min(b, x1)]);
      if (b > x1) uit.push([x1, b]);
    }
    segs = uit;
  }
  for (const [a, b] of segs) if (b - a > 0.005) B.box((a + b) / 2, cy, z, b - a, sy, sz, color);
}
// Haalt uit de lakgroep van B alle driehoeken (vanaf vertex `vanaf`) die in een echt deurgat op de buitenkant van de flank liggen,
// en geeft ze per deur terug: die versiering hoort bij het deurblad. { deurId: [[a, b, c, kleur], ...] }
function moveDoorDecor(B, vanaf, gaten, hw) {
  const G = B.groups[G_BODY], p = G.p, c = G.c, uv = G.uv;
  const per = {}, kp = [], kc = [], ku = [];
  for (let t = vanaf; t < p.length / 9; t++) {
    const o = t * 9;
    const cx = (p[o] + p[o + 3] + p[o + 6]) / 3, cy = (p[o + 1] + p[o + 4] + p[o + 7]) / 3, cz = (p[o + 2] + p[o + 5] + p[o + 8]) / 3;
    const g = Math.abs(cz) > hw * 0.75 ? gaten.find((q) => cx > q.rect[0] && cx < q.rect[2] && cy > q.rect[1] && cy < q.rect[3]) : null;
    if (g) {
      const id = g.ids[cz < 0 ? 0 : 1];
      (per[id] || (per[id] = [])).push([[p[o], p[o + 1], p[o + 2]], [p[o + 3], p[o + 4], p[o + 5]], [p[o + 6], p[o + 7], p[o + 8]], [c[o], c[o + 1], c[o + 2]]]);
    } else {
      for (let k = 0; k < 9; k++) { kp.push(p[o + k]); kc.push(c[o + k]); }
      for (let k = 0; k < 6; k++) ku.push(uv[t * 6 + k]);
    }
  }
  p.length = vanaf * 9; c.length = vanaf * 9; uv.length = vanaf * 6;
  for (let k = 0; k < kp.length; k++) { p.push(kp[k]); c.push(kc[k]); }
  for (let k = 0; k < ku.length; k++) uv.push(ku[k]);
  return per;
}

// --- cars -------------------------------------------------------------------------

// Side profile keyed off half-length. y values in metres.
function carProfile(type, hl) {
  switch (type) {
    case 'sedan': return { nose: 0.6, hood: 0.84, belt: 0.95, roof: 1.45, xA: hl - 1.3, xB: hl - 2.0, xC: -hl + 1.35, xD: -hl + 0.8, deck: 0.98, tail: 0.8, fw: hl - 0.85, rw: -hl + 0.95 };
    case 'wagon': return { nose: 0.6, hood: 0.85, belt: 0.95, roof: 1.5, xA: hl - 1.25, xB: hl - 1.95, xC: -hl + 0.3, xD: -hl + 0.1, deck: 0.98, tail: 0.92, fw: hl - 0.9, rw: -hl + 1.0 };
    case 'sport': return { nose: 0.45, hood: 0.7, belt: 0.82, roof: 1.25, xA: hl - 1.5, xB: hl - 2.2, xC: -hl + 1.25, xD: -hl + 0.35, deck: 0.86, tail: 0.74, fw: hl - 0.9, rw: -hl + 0.95 };
    case 'escort': return { nose: 0.7, hood: 0.82, belt: 0.9, roof: 1.38, xA: hl - 1.05, xB: hl - 1.6, xC: -hl + 0.55, xD: -hl + 0.15, deck: 0.94, tail: 0.9, fw: hl - 0.75, rw: -hl + 0.75, boxy: true };
    case 'van': return { nose: 0.85, hood: 1.05, belt: 1.08, roof: 2.08, xA: hl - 0.45, xB: hl - 1.1, xC: -hl + 0.04, xD: -hl + 0.02, deck: 2.08, tail: 2.02, fw: hl - 0.8, rw: -hl + 1.05, van: true };
    case 'suv': return { nose: 0.78, hood: 1.02, belt: 1.12, roof: 1.74, xA: hl - 1.2, xB: hl - 1.9, xC: -hl + 0.32, xD: -hl + 0.1, deck: 1.14, tail: 1.08, fw: hl - 0.95, rw: -hl + 1.0, boxy: true };
    default: return { nose: 0.58, hood: 0.82, belt: 0.93, roof: 1.47, xA: hl - 1.0, xB: hl - 1.75, xC: -hl + 0.5, xD: -hl + 0.12, deck: 0.98, tail: 0.94, fw: hl - 0.75, rw: -hl + 0.7 };
  }
}

// De echte deuropeningen van een romp: alleen deuren die links en rechts op dezelfde plek zitten (het gat loopt dwars door de
// extrusie), van de wielkasten af gehouden. [{ ids, rect: [x0, y0, x1, y1] }]
function doorHoles(doorName, L, arches, beltY = Infinity) {
  const defs = (DEUR_DEFS_REF[doorName] || []).filter((d) => d.soort === 'scharnier' || d.soort === 'achterscharnier');
  const uit = [];
  for (const d of defs) {
    if (d.side !== -1) continue;
    const ander = defs.find((o) => o.side === 1 && Math.abs(o.x - d.x) < 1e-6 && Math.abs(o.y0 - d.y0) < 1e-6);
    if (!ander) continue;
    let x0 = d.x * L - d.w / 2 + 0.03, x1 = d.x * L + d.w / 2 - 0.03;
    const y0 = d.y0 + 0.03, y1 = Math.min(d.y0 + d.h - 0.02, beltY - 0.04); // het gat blijft onder de raamlijn (de bovenkant van de romp)
    for (const a of arches) {
      const l = a.x - a.r - 0.04, r = a.x + a.r + 0.04;
      if (r > x0 && l < x1) { if (a.x < (x0 + x1) / 2) x0 = Math.max(x0, r); else x1 = Math.min(x1, l); }
    }
    if (x1 - x0 > 0.3) uit.push({ ids: [d.id, ander.id], rect: [x0, y0, x1, y1] });
  }
  return uit;
}

function buildCarGeometry(type, L, W, paint, opts) {
  const hl = L / 2, hw = W / 2;
  const P = carProfile(type, hl);
  const B = new GeoBuilder(3);
  const r = opts.wheelR;
  const R = r + 0.09;
  const arches = [{ x: P.rw, r: R, cy: r }, { x: P.fw, r: R, cy: r }];
  const sill = 0.3;

  // vans: open cab (glass greenhouse like the cars) in front of a closed cargo box from xK back
  const xK = P.xB - 0.8;
  const top = P.van
    ? [[hl, P.nose], [hl - 0.12, P.hood], [P.xA, P.belt], [xK, P.belt], [xK, P.roof], [-hl + 0.06, P.roof], [-hl, P.roof - 0.06]]
    : P.boxy
      ? [[hl, P.nose], [hl - 0.05, P.hood], [P.xA, P.belt], [P.xD, P.belt], [-hl + 0.04, P.deck], [-hl, P.tail]]
      // 23-11 (vormtaal van het Quaternius-autopakket): een ronde neus en kont en een bolle motorkap, met een paar extra punten
      // alleen op die plekken; de rest van het profiel blijft zoals het was
      : [[hl, P.nose - 0.08], [hl - 0.05, P.nose + 0.07], [hl - 0.22, P.hood], [(hl - 0.22 + P.xA) / 2, P.hood + 0.05], [P.xA, P.belt],
        [P.xD, P.belt], [-hl + Math.min(0.34, (P.xD + hl) * 0.5), P.deck + 0.03], [-hl + 0.08, P.deck - 0.05], [-hl, P.tail - 0.1]];
  const outline = [...top, [-hl, sill + 0.08], ...archedSill(-hl, hl, sill, arches), [hl, sill + 0.08]];
  // #923: bij een personenauto staat de raamband open (zie withoutBeltPlate), zodat het interieur
  // door het glas te zien is; de raamlijst (sideStrip, verderop) sluit de band langs de buitenkant
  // af. Een bestelbus houdt zijn vlak tussen voorruit en laadruimte: dat is de neus/dashboardplaat.
  // 23-11 (inspiratie: Quaternius' CC0-autopakket): een ronder koetswerk met een bredere afronding in twee stappen, zodat de
  // flanken naar het dak en de bodem toe inlopen in plaats van als een kist te eindigen
  const bevel = P.boxy ? 0.035 : 0.075;
  // echte deuropeningen (eis eigenaar 23-11): de romp krijgt een gat waar een deur zit, zodat je bij een open deur de auto in
  // kijkt; de dichte deur vult het gat (vehicledoors3d.js, userData.deurenDicht). De opening blijft van de wielkasten af.
  const gaten = doorHoles(opts.doorName, L, arches, P.belt);
  let rompGeo = extrudeProfile(outline, W, bevel, 1, gaten.map((g) => g.rect));
  // het plafond van de tunnel (de bovenkant van het gat) gaat eruit: daar kijk je door de ruiten in de auto
  for (const g of gaten) rompGeo = withoutBeltPlate(rompGeo, g.rect[3], g.rect[0], g.rect[2], 0.001);
  const body = P.van ? rompGeo : withoutBeltPlate(rompGeo, P.belt, P.xD, P.xA);
  B.geo(body, null, paint);
  archLiners(B, arches, W);
  const decorVanaf = B.groups[G_BODY].p.length / 9;

  if (P.van) {
    const gh = [[P.xA + 0.03, P.belt - 0.03], [P.xB, P.roof - 0.12], [P.xB - 0.3, P.roof - 0.03], [xK + 0.01, P.roof - 0.03], [xK + 0.01, P.belt - 0.03]];
    B.geo(extrudeProfile(gh, W * 0.9, 0.03), null, GLASS, G_GLASS);
    B.geo(extrudeProfile([[P.xB + 0.03, P.roof - 0.14], [P.xB - 0.3, P.roof], [xK, P.roof], [xK, P.roof - 0.08]], W * 0.97, 0.025), null, paint);
    const pz = W * 0.45;
    for (const s of [1, -1]) {
      sideStrip(B, P.xA + 0.02, P.belt - 0.01, P.xB + 0.03, P.roof - 0.12, s * pz, 0.07, 0.05, paint);
      sideStrip(B, xK + 0.04, P.belt, xK + 0.04, P.roof - 0.02, s * pz, 0.08, 0.05, paint);
      sideStrip(B, P.xA + 0.02, P.belt + 0.005, xK, P.belt + 0.005, s * (pz + 0.02), 0.025, 0.03, TRIM);
      sideStrip(B, -hl + 1.6, 1.0, -hl + 1.6, P.roof - 0.1, s * (hw + 0.004), 0.015, 0.01, shadeHex(paint, 0.7));
    }
    B.box(-hl - 0.004, (P.belt + P.roof) / 2 + 0.2, 0, 0.012, 0.5, W * 0.06, TRIM);
    for (const s of [1, -1]) B.box(-hl - 0.004, P.roof - 0.4, s * hw * 0.5, 0.012, 0.42, hw * 0.75, GLASS, G_GLASS);
  } else {
    const gh = [[P.xA + 0.03, P.belt - 0.03], [P.xB, P.roof - 0.07], [P.xC, P.roof - 0.07], [P.xD + 0.03, P.belt - 0.03]];
    // De ruiten staan tot tegen de carrosserie (#463, beeldronde): op 0,84 van de breedte bleef er
    // boven de raamlijn een gleuf van 14 cm tussen het plaatswerk en het glas, en daar keek je zo
    // langs naar binnen - bij de lichtgrijze Knakker leek de cabine daardoor open te zijn, met de
    // losse stangen van het interieur in het zicht. Het glas staat nu 1 cm binnen de body, het dak
    // sluit erop aan en de stijlen staan op de ruit in plaats van ernaast.
    // De glasband is een dichte extrusie: de onderkant daarvan is een plaat over de hele cabine
    // op de raamlijn, en die sneed door het interieur (#923). De onderkant gaat eruit; de
    // raamlijst van het koetswerk sluit de band af.
    // 23-11: ingelopen ramen (de kas is smaller dan de romp, 0,90 in plaats van 0,94; de test van #463 eist meer dan 0,88) met een richel in lak op de raamlijn die de
    // gleuf tussen glas en plaatwerk dicht houdt (#463), en een bol dak met afgeronde zijkanten
    const ghW = P.boxy ? 0.94 : 0.9;
    B.geo(withoutBeltPlate(extrudeProfile(gh, W * ghW, 0.03), P.belt - 0.03, P.xD, P.xA), null, GLASS, G_GLASS);
    if (!P.boxy) for (const s of [1, -1]) B.box((P.xA + P.xD) / 2, P.belt - 0.006, s * W * (ghW + 1) / 4, P.xA - P.xD + 0.02, 0.012, W * (1 - ghW) / 2 + 0.01, paint);
    const roofPts = P.boxy
      ? [[P.xB + 0.07, P.roof - 0.09], [P.xB - 0.04, P.roof], [P.xC + 0.04, P.roof], [P.xC - 0.07, P.roof - 0.09]]
      : [[P.xB + 0.07, P.roof - 0.09], [P.xB - 0.03, P.roof - 0.025], [P.xB - 0.2, P.roof + 0.035], [P.xC + 0.2, P.roof + 0.035], [P.xC + 0.03, P.roof - 0.025], [P.xC - 0.07, P.roof - 0.09]];
    B.geo(extrudeProfile(roofPts, W * (P.boxy ? 0.98 : ghW + 0.06), P.boxy ? 0.025 : 0.06), null, paint);
    const pz = W * ghW / 2; // de stijlen staan op de ruit (#463)
    for (const s of [1, -1]) {
      sideStrip(B, P.xA + 0.02, P.belt - 0.01, P.xB + 0.02, P.roof - 0.05, s * pz, 0.07, 0.05, paint);
      sideStrip(B, P.xC - 0.02, P.roof - 0.05, P.xD, P.belt - 0.01, s * pz, type === 'sedan' || type === 'sport' ? 0.09 : 0.16, 0.05, paint);
      const bx = (P.xB + P.xC) / 2 + 0.15;
      sideStrip(B, bx, P.belt, bx - 0.06, P.roof - 0.06, s * (pz + 0.005), 0.07, 0.04, TRIM);
      sideStrip(B, P.xA + 0.02, P.belt + 0.005, P.xD, P.belt + 0.005, s * (pz + (P.boxy ? 0.02 : 0.03)), 0.025, 0.03, TRIM);
    }
  }

  // bumpers in de lakkleur met een donkere onderlip die om de hoeken loopt (een oude 'boxy' auto houdt zijn chroom)
  const bumper = P.boxy ? CHROME : shadeHex(paint, 0.9);
  const lip = 0x1f2022;
  const vcount = () => B.groups[G_BODY].p.length / 3;
  const f0 = vcount();
  B.box(hl + 0.02, 0.38, 0, 0.12, 0.14, W - 0.04, bumper);
  B.box(hl + 0.085, 0.38, 0, 0.012, 0.1, 0.48, PLATE);
  if (!P.boxy) for (const s of [1, -1]) B.box(hl - 0.08, 0.38, s * hw, 0.22, 0.14, 0.05, bumper); // de hoek van de bumper
  B.box(hl + 0.035, 0.29, 0, 0.1, 0.045, W - 0.12, lip);
  const f1 = vcount();
  B.box(-hl - 0.02, 0.4, 0, 0.12, 0.14, W - 0.04, bumper);
  if (!P.boxy) for (const s of [1, -1]) B.box(-hl + 0.08, 0.4, s * hw, 0.22, 0.14, 0.05, bumper);
  B.box(-hl - 0.035, 0.31, 0, 0.1, 0.045, W - 0.12, lip);
  const r1 = vcount();
  // een lichte karakterlijn in de flank (de wielkastlijsten van de vorige ronde waren op afstand niet te zien en zijn eruit)
  for (const s of [1, -1]) hboxSplit(B, (P.fw + P.rw) / 2, P.belt - 0.15, s * (hw + 0.002), P.fw - P.rw - 0.2, 0.014, 0.008, shadeHex(paint, 1.15), gaten);
  B.box(-hl - 0.008, P.van ? 0.62 : Math.min(0.6, P.tail - 0.22), 0, 0.012, 0.1, 0.48, PLATE);
  const lampY = P.nose - (P.boxy || P.van ? 0.06 : 0.13); // de ronde neus (23-11) loopt boven de lampen in
  for (const s of [1, -1]) {
    B.box(hl + 0.006, lampY, s * (hw - 0.26), 0.03, P.boxy ? 0.14 : 0.13, P.boxy ? 0.3 : 0.36, HEADLAMP, G_LAMP); // grotere, heldere koplampen (23-11)
    B.box(hl + 0.006, lampY - (P.boxy ? 0.1 : 0.09), s * (hw - 0.1), 0.03, 0.05, 0.1, INDICATOR, G_LAMP);
    const tailY = P.van ? 0.95 : P.tail - (P.boxy ? 0.1 : 0.19);
    B.box(-hl - 0.006, tailY, s * (hw - 0.18), 0.03, P.van ? 0.3 : 0.12, P.van ? 0.14 : 0.3, TAIL, G_LAMP);
    hboxSplit(B, (P.fw + P.rw) / 2, sill + 0.08, s * (hw + 0.005), (P.fw - P.rw) - R * 2 - 0.1, 0.1, 0.02, TRIM, gaten);
  }
  addDoorCuts(B, opts.doorName, L, hw, paint, CHROME, gaten.length > 0);

  if (opts.police) {
    for (const s of [1, -1]) {
      const z = s * (hw + 0.007);
      hboxSplit(B, 0, 0.84, z, L - 0.3, 0.13, 0.012, 0x1f3f8f, gaten);
      hboxSplit(B, 0, 0.755, z, L - 0.3, 0.025, 0.012, 0xd9772b, gaten);
    }
    B.box((P.xB + P.xC) / 2, P.roof + 0.075, 0, 0.3, 0.07, W * 0.72, TRIM);
  }
  if (opts.ambulance) {
    // Nederlandse ambulance (#407): geel met een witte hoge dakkap, een band van rode en witte reflecterende blokken langs de
    // zijkant (twee rijen op de laadruimte, één op de portieren), een lichtbalk op het cabinedak, blauwe flitsers voor en
    // achter en rode en witte blokken over de achterdeuren. Het opschrift staat in assembleCar (ambulanceOpschrift).
    const RED = 0xd2232a, WHITE = 0xf4f2ee;
    const cargo0 = -hl + 0.1, cargo1 = P.xB - 0.06, n = 9, bw = (cargo1 - cargo0) / n;
    for (const s of [1, -1]) {
      const z = s * (hw + 0.007);
      for (let i = 0; i < n; i++) {
        for (const [row, y] of [[0, 0.95], [1, 1.17]]) B.box(cargo0 + bw * (i + 0.5), y, z, bw, 0.22, 0.012, (i + row) % 2 ? WHITE : RED);
      }
      // op het portier: één rij, onder de raamlijn
      const door0 = P.xB + 0.02, door1 = P.xA - 0.12, nd = 3, dw = (door1 - door0) / nd;
      for (let i = 0; i < nd; i++) B.box(door0 + dw * (i + 0.5), 0.92, z, dw, 0.18, 0.012, i % 2 ? WHITE : RED);
    }
    // de hoge dakkap boven de patiëntenruimte, wit; de rand ervoor blauw
    const roofX0 = P.xB - 0.45, rh = 0.48;
    B.box((roofX0 - hl) / 2, P.roof + rh / 2 - 0.02, 0, roofX0 + hl, rh, W - 0.04, WHITE);
    B.box(roofX0 + 0.02, P.roof + rh / 2, 0, 0.04, rh - 0.12, W * 0.7, 0x1d4fa3);
    // lichtbalk op het cabinedak: donkere balk met blauwe uiteinden (de twee knipperende lampen staan er in assembleCar bovenop)
    const barX = P.xB - 0.25;
    B.box(barX, P.roof + 0.03, 0, 0.3, 0.06, W * 0.84, TRIM);
    for (const s of [1, -1]) B.box(barX, P.roof + 0.1, s * W * 0.4, 0.26, 0.1, 0.12, 0x2f6bff, G_LAMP);
    // blauwe flitsers in de grille, en boven op de achterdeuren
    for (const s of [1, -1]) {
      B.box(hl + 0.012, P.nose + 0.2, s * (hw - 0.62), 0.02, 0.07, 0.22, 0x2f6bff, G_LAMP);
      B.box(-hl - 0.014, P.tail - 0.14, s * (hw - 0.1), 0.02, 0.09, 0.14, 0x2f6bff, G_LAMP);
    }
    // achterdeuren: één rij rode en witte blokken
    const rn = 8, rw = (W - 0.3) / rn;
    for (let i = 0; i < rn; i++) B.box(-hl - 0.008, 0.9, -((W - 0.3) / 2) + rw * (i + 0.5), 0.012, 0.2, rw, i % 2 ? WHITE : RED);
  }
  const variant = opts.variant || '';
  if (variant === 'taxi') {
    B.box((P.xB + P.xC) / 2 + 0.15, P.roof + 0.1, 0, 0.28, 0.16, 0.62, 0xf0c24e);
    B.box((P.xB + P.xC) / 2 + 0.15, P.roof + 0.1, 0, 0.3, 0.07, 0.64, TRIM);
    for (const x of [hl + 0.0915, -hl - 0.0145]) B.box(x, x > 0 ? 0.38 : Math.min(0.6, P.tail - 0.22), 0, 0.013, 0.12, 0.52, 0x2f5fb0);
    for (const s of [1, -1]) B.box((P.xB + P.xC) / 2, P.belt - 0.12, s * (hw + 0.008), 0.9, 0.12, 0.012, 0xf0c24e);
  } else if (variant === 'rust') {
    const rust = [0x8a4a26, 0x6e3b20, 0x9a5a2e];
    for (let i = 0; i < 7; i++) {
      const sx = -hl + 0.4 + hash2(i, L) * (L - 0.8), sy = sill + 0.12 + hash2(i, W) * 0.35;
      B.box(sx, sy, (i % 2 ? 1 : -1) * (hw + 0.006), 0.18 + hash2(i, 3) * 0.3, 0.08 + hash2(i, 5) * 0.14, 0.012, rust[i % 3]);
    }
    // a door from the scrapyard, in another colour
    B.box((P.xB + P.xC) / 2 + 0.2, (sill + P.belt) / 2 + 0.05, hw + 0.009, 0.9, P.belt - sill - 0.15, 0.012, 0xa89a7a);
  } else if (variant === 'ev') {
    // elektrisch: gesloten neus met een lichtbalk, blauwe accentstreep, laadklepje, geen uitlaat
    B.box(hl + 0.012, P.nose - 0.2, 0, 0.02, 0.16, W * 0.5, 0x1a1b1d);
    B.box(hl + 0.016, lampY, 0, 0.02, 0.025, W - 0.5, HEADLAMP, G_LAMP);
    for (const s of [1, -1]) {
      hboxSplit(B, (P.xB + P.xC) / 2, P.belt - 0.12, s * (hw + 0.008), 1.4, 0.04, 0.012, 0x3fc6d4, gaten);
    }
    B.box(-hl + 0.5, sill + 0.4, hw + 0.01, 0.16, 0.12, 0.012, 0x3fa66a);
  } else if (variant === 'tokkie') {
    // opgevoerd: groot achtervleugel, dikke dubbele uitlaat, zijstrepen en blauwe onderverlichting
    for (const s of [1, -1]) {
      B.box(-hl + 0.18, P.tail + 0.14, s * (hw - 0.3), 0.1, 0.3, 0.06, 0x1a1b1d);
      B.box(-hl - 0.08, 0.26, s * 0.38, 0.28, 0.1, 0.1, CHROME);
      B.box((P.xA + P.xD) / 2, sill + 0.2, s * (hw + 0.008), L * 0.6, 0.05, 0.012, 0xf2f0ea);
      B.box(0, 0.1, s * (hw - 0.05), L - 0.8, 0.04, 0.05, 0x35e0ff, G_LAMP);
    }
    B.box(-hl + 0.12, P.tail + 0.32, 0, 0.36, 0.05, W * 0.92, 0x1a1b1d);
  } else if (variant === 'cash') {
    // Poen Express armoured cash van: steel plates over the load bay, barred
    // cab windows, green/gold livery with a coin logo, bull bar, amber beacon
    const GREEN = 0x1f4f33, GOLD = 0xd9b21b, STEEL = shadeHex(paint, 0.78), BAR = 0x1a1b1d;
    const bay0 = -hl + 0.12, bay1 = P.xB - 0.85;
    for (const s of [1, -1]) {
      const z = s * (hw + 0.008);
      B.box((bay0 + bay1) / 2, (sill + P.roof) / 2 + 0.12, s * (hw + 0.004), bay1 - bay0, P.roof - sill - 0.35, 0.012, STEEL);
      B.box((bay0 + bay1) / 2, 1.28, z, bay1 - bay0 - 0.02, 0.34, 0.012, GREEN);
      B.box((bay0 + bay1) / 2, 1.08, z, bay1 - bay0 - 0.02, 0.05, 0.012, GOLD);
      B.box((bay0 + bay1) / 2, 1.48, z, bay1 - bay0 - 0.02, 0.05, 0.012, GOLD);
      const lx = (bay0 + bay1) / 2 + 0.4;
      B.box(lx, 1.28, s * (hw + 0.012), 0.44, 0.44, 0.012, GOLD);
      B.box(lx, 1.28, s * (hw + 0.016), 0.08, 0.3, 0.012, GREEN);
      for (const dy of [-0.07, 0.07]) B.box(lx - 0.05, 1.28 + dy, s * (hw + 0.018), 0.26, 0.05, 0.012, GREEN);
      for (let x = bay0 + 0.2; x < bay1 - 0.1; x += 0.3) B.box(x, sill + 0.2, s * (hw + 0.012), 0.04, 0.04, 0.012, BAR);
      for (let x = bay0 + 0.2; x < bay1 - 0.1; x += 0.3) B.box(x, P.roof - 0.18, s * (hw + 0.012), 0.04, 0.04, 0.012, BAR);
      for (let k = 0; k < 4; k++) B.box(P.xA - 0.2 - k * 0.17, (P.belt + P.roof) / 2 - 0.05, s * (hw + 0.014), 0.035, P.roof - P.belt - 0.3, 0.014, BAR);
      B.box(bay1 - 0.3, 1.75, s * (hw + 0.012), 0.34, 0.07, 0.012, BAR);
    }
    B.box(-hl - 0.006, (sill + P.roof) / 2 + 0.12, 0, 0.012, P.roof - sill - 0.35, W * 0.92, STEEL);
    B.box(-hl - 0.012, 1.3, 0, 0.012, 0.3, W * 0.9, GREEN);
    for (let k = 0; k < 6; k++) B.box(-hl - 0.016, 0.62, -hw + 0.18 + k * (W - 0.36) / 5, 0.012, 0.16, 0.12, k % 2 ? GOLD : BAR);
    B.box(-hl - 0.016, (sill + P.roof) / 2 + 0.1, 0, 0.012, P.roof - sill - 0.4, 0.025, BAR);
    B.box(hl + 0.1, 0.5, 0, 0.08, 0.36, W * 0.8, BAR);
    for (const s of [1, -1]) B.box(hl + 0.1, 0.72, s * W * 0.3, 0.08, 0.2, 0.06, BAR);
    B.box(P.xB - 1.2, P.roof + 0.03, 0, 0.5, 0.06, W * 0.5, BAR);
    B.box(P.xB - 1.2, P.roof + 0.12, 0, 0.18, 0.14, 0.18, 0xf08a1c, G_LAMP);
  } else if (variant === 'nieuws') {
    // Noord-Nieuws reporter van (invented): teal band, orange stripe, a blocky
    // double-N on the sides, a camera on a mast and a small dish on the roof
    const TEAL = 0x16899a, ORANGE = 0xf08a1c;
    const bx0 = -hl + 0.5, bx1 = Math.min(hl - 0.8, xK - 0.05);
    for (const s of [1, -1]) {
      const z = s * (hw + 0.008);
      B.box((bx0 + bx1) / 2, 1.08, z, bx1 - bx0, 0.36, 0.012, TEAL);
      B.box((bx0 + bx1) / 2, 0.84, z, bx1 - bx0, 0.05, 0.012, ORANGE);
      for (let k = 0; k < 2; k++) {
        const lx = (bx0 + bx1) / 2 - 0.2 + k * 0.34, lz = s * (hw + 0.016);
        B.box(lx - 0.07, 1.08, lz, 0.05, 0.24, 0.012, 0xf4f2ec);
        B.box(lx + 0.07, 1.08, lz, 0.05, 0.24, 0.012, 0xf4f2ec);
        B.box(lx - 0.035, 1.14, lz, 0.05, 0.06, 0.012, 0xf4f2ec);
        B.box(lx, 1.08, lz, 0.05, 0.06, 0.012, 0xf4f2ec);
        B.box(lx + 0.035, 1.02, lz, 0.05, 0.06, 0.012, 0xf4f2ec);
      }
    }
    const rx = Math.min(0, (bx0 + bx1) / 2);
    B.box(rx, P.roof + 0.36, 0, 0.05, 0.72, 0.05, 0x2a2b2d);
    B.box(rx + 0.12, P.roof + 0.78, 0, 0.42, 0.22, 0.26, 0x2a2b2d);
    B.box(rx + 0.36, P.roof + 0.78, 0, 0.1, 0.14, 0.14, 0x9fb4d8, G_GLASS);
    B.geo(new THREE.CylinderGeometry(0.26, 0.04, 0.1, 10), composeMatrix(rx - 0.45, P.roof + 0.14, 0, 0, 0, 0.5), 0xd6d6d1);
    B.box(rx - 0.45, P.roof + 0.07, 0, 0.05, 0.1, 0.05, 0x2a2b2d);
    B.box(rx + 0.42, P.roof + 0.78, 0, 0.02, 0.05, 0.05, ORANGE, G_LAMP);
  } else if (variant === 'pakket') {
    for (const s of [1, -1]) {
      const z = s * (hw + 0.008);
      const bx0 = -hl + 0.8, bx1 = Math.min(hl - 0.8, xK - 0.05);
      B.box((bx0 + bx1) / 2, 1.5, z, bx1 - bx0, 0.34, 0.012, 0xf4f2ec);
      B.box(-0.3, 1.5, z, 0.32, 0.26, 0.016, 0x1f4f9a);
      B.box(-0.3 - 0.55, 1.5, z, 0.5, 0.08, 0.016, 0x1f4f9a);
    }
  }
  if (type === 'sport') {
    B.box(-hl + 0.12, P.deck + 0.1, 0, 0.18, 0.03, W * 0.84, paint);
    for (const s of [1, -1]) B.box(-hl + 0.14, P.deck + 0.05, s * W * 0.34, 0.06, 0.08, 0.04, TRIM);
  }
  if (type === 'wagon' && !opts.police) {
    for (const s of [1, -1]) B.box((P.xB + P.xC) / 2, P.roof + 0.065, s * W * 0.36, (P.xB - P.xC) * 0.8, 0.04, 0.04, TRIM); // boven het bolle dak
  }
  const deurDecor = gaten.length ? moveDoorDecor(B, decorVanaf, gaten, hw) : {};
  const geo = B.build();
  geo.userData.gaten = gaten;
  geo.userData.deurDecor = deurDecor;
  // 23-11 (vormtaal van het Quaternius-autopakket): van boven gezien lopen neus en kont rond in. De laatste halve meter aan
  // beide kanten wordt smaller (tot 13 % van de halve breedte, kwadratisch), het hele model mee: lak, bumpers, lampen en glas. Geen extra driehoeken;
  // de deuren liggen daarbuiten, dus hun naden en de deurtabel blijven kloppen. De materialen tekenen platte normalen (flatShading).
  if (!P.boxy && !P.van && !(typeof process !== 'undefined' && process.env.GDE_GEEN_TAPER)) {
    // een verschuiving in plaats van een schaal: alles in de buitenste helft schuift evenveel naar binnen, zodat lagen die
    // op het plaatwerk liggen (naden, strepen, belettering, lampen) hun afstand tot het plaatwerk houden
    const pos = geo.attributes.position, a = pos.array, zone = 0.55, d = (P.van ? 0.07 : 0.13) * hw, binnen = hw * 0.55;
    for (let i = 0; i < a.length; i += 3) {
      const t = Math.min(1, Math.max(0, (Math.abs(a[i]) - (hl - zone)) / zone));
      if (t > 0 && Math.abs(a[i + 2]) > binnen) a[i + 2] -= Math.sign(a[i + 2]) * d * t * t;
    }
    pos.needsUpdate = true;
  }
  geo.userData.parts = {
    hl, hw, hood: P.hood, bumperColor: bumper,
    front: { start: f0, end: f1, y: 0.38, x: hl + 0.02 },
    rear: { start: f1, end: r1, y: 0.4, x: -hl - 0.02 },
  };
  return geo;
}

function shadeHex(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((hex & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

function assembleCar(type, L, W, paint, { police = false, ambulance = false, wrecked = false, wheelR = WHEEL_R, variant = '', doorNaam = '' } = {}) {
  const color = wrecked ? WRECKED_COLOR : paint;
  const vr = wrecked ? '' : variant;
  const doorName = doorNaam || (ambulance ? 'ambulance' : police ? 'police' : type === 'van' ? (vr === 'cash' ? 'cashvan' : 'van') : type === 'sedan' && vr === 'taxi' ? 'taxi' : type);
  const geo = cached(`car|${type}|${L}|${W}|${color}|${police}|${ambulance}|${vr}|${doorName}`, () => buildCarGeometry(type, L, W, color, { police, ambulance, wheelR, variant: vr, doorName }));
  const mats = vehicleMaterials(wrecked);
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
  const P = carProfile(type, L / 2);
  // grille and mirrors are their own meshes, so they can come off in a crash (#205)
  group.userData.loose = looseCarParts(type, L, W, color, P, mats, group);
  addRealDoors(group, body, geo.userData.gaten || [], doorName, L, W, color, P, type);
  const wgeo = carWheelGeometry(wheelR, WHEEL_W);
  const wheels = [];
  for (const x of [P.fw, P.rw]) for (const s of [1, -1]) addWheel(group, wgeo, mats[0], x, wheelR, s * (W / 2 - WHEEL_W / 2 - 0.04), wheels);
  group.userData.wheels = wheels;
  group.userData.frontWheels = wheels.slice(0, 2);
  group.userData.wheelRadius = wheelR;
  group.userData.loose.sierdoppen = hubcaps(wheels, wheelR);
  if (police || ambulance) {
    // the ambulance's lamps sit on the cab roof, just ahead of its roof box
    const barY = P.roof + (ambulance ? 0.07 : 0.14);
    const barX = ambulance ? P.xB - 0.25 : (P.xB + P.xC) / 2;
    const lamps = [];
    for (const s of [1, -1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, W * 0.3), lampMaterial(0x2f6bff, 0.25));
      lamp.position.set(barX, barY, s * W * 0.2);
      // #938: the lamps hang on the body, not on the root: when braking or pulling
      // away the body moves (susPitch/susRoll, scene3d.js), and the beacons should
      // move with it. On the root they stayed bolt upright.
      body.add(lamp);
      lamps.push(lamp);
    }
    group.userData.policeLamps = lamps;
  }
  if (ambulance && !wrecked) ambulanceOpschrift(group, P, L, W);
  return group;
}

// Het eenvoudige interieur achter een echte deuropening, uit het register (propregister.js: autostoel en dashboard): een vloer, twee
// voorstoelen, twee achterstoelen en het dashboard met stuur aan de kant van de bestuurder (-z), op de maten van de romp.
function addPropGeo(B, geo, m) {
  const p = geo.attributes.position, c = geo.attributes.color, v = new THREE.Vector3();
  for (let i = 0; i + 2 < p.count; i += 3) {
    const pts = [0, 1, 2].map((k) => { v.fromBufferAttribute(p, i + k).applyMatrix4(m); return [v.x, v.y, v.z]; });
    B._push(0, pts[0], pts[1], pts[2], [c.getX(i), c.getY(i), c.getZ(i)], null);
  }
}
// ruimte(x0, x1, y0, y1): de halve binnenbreedte die over dat hele stuk vrij is (de smalste plek van de flank, min een marge); zonder
// ruimte-functie gelden de vaste maten (zs, dashW). Elke stoel schuift dan naar binnen en het dashboard wordt smaller waar de romp
// inloopt (wielkast, A-stijl, voorruit), zodat geen interieurdeel door de carrosserie steekt.
function addInterieur(B, { xA, xD, belt, vloerY, vloerW, stoelY, sx, zs, dashW, ruimte = null }) {
  const vw = ruimte ? Math.min(vloerW, 2 * ruimte(xD + 0.1, xA - 0.1, vloerY - 0.01, vloerY + 0.01)) : vloerW;
  B.box((xA + xD) / 2, vloerY, 0, xA - xD - 0.2, 0.02, vw, 0x45474c);
  const stoel = propGeometry('autostoel'), dash = propGeometry('dashboard');
  if (!stoel.boundingBox) stoel.computeBoundingBox();
  if (!dash.boundingBox) dash.computeBoundingBox();
  const sb = stoel.boundingBox, db = dash.boundingBox, sHalf = Math.max(-sb.min.z, sb.max.z);
  // de achterbank staat iets verder naar voren dan bij de procedurele auto: daar lopen het dak en de achterruit al in
  let ax = ruimte ? sx - 0.78 : sx - 0.85, ay = stoelY;
  // past de hoofdsteun niet onder de achterruit (de flank houdt daar op), dan schuift de bank naar voren
  if (ruimte) for (let i = 0; i < 12 && ruimte(ax + sb.min.x, ax + sb.min.x + 0.12, ay + sb.max.y - 0.14, ay + sb.max.y) < zs * 0.92 + 0.14; i++) ax += 0.03;
  const stoelZ = (x, y, z) => {
    if (!ruimte) return z;
    const vrij = ruimte(x + sb.min.x, x + sb.max.x, y + sb.min.y, y + sb.max.y) - sHalf;
    return Math.sign(z) * Math.max(sHalf + 0.01, Math.min(Math.abs(z), vrij));
  };
  for (const z of [-zs, zs]) {
    addPropGeo(B, stoel, composeMatrix(sx, stoelY, stoelZ(sx, stoelY, z)));
    addPropGeo(B, stoel, composeMatrix(ax, ay, stoelZ(ax, ay, z * 0.92)));
  }
  // het dashboard staat achter de onderrand van de voorruit: schuift naar achteren tot de romp minstens 85 % van zijn breedte vrij laat
  // (de voorruit en de A-stijlen lopen naar voren in), en wordt dan smal genoeg gemaakt dat het nergens door de flank steekt
  let dx = xA - 0.26;
  const dy = belt - 0.5, dHalf = Math.max(-db.min.z, db.max.z);
  const dashVrij = (x) => ruimte(x + db.min.x, x + db.max.x, dy + db.min.y, dy + db.max.y);
  if (ruimte) for (let i = 0; i < 12 && dashVrij(dx) < dHalf * 0.85; i++) dx -= 0.03;
  const dz = ruimte ? Math.max(0.5, Math.min(1, dashVrij(dx) / dHalf)) : Math.min(1, dashW / 1.42);
  addPropGeo(B, dash, composeMatrix(dx, dy, 0, 0, 0, 0, 1, 1, dz));
}

// De echte deuropeningen (eis eigenaar 23-11): de dichte deuren als één statische mesh in het gat (buitenkant in lak, binnenkant
// bekleding) zolang er geen deur-rig is, en een eenvoudig interieur (vloer, stoelen, dashboard) dat je door de open deur ziet zolang
// de echte cabine (cabin3d.js) er niet is. Beide gedeelde geometrie per model.
function addRealDoors(group, body, gaten, doorName, L, W, paint, P, type) {
  if (!gaten.length) return;
  const ids = new Set(gaten.flatMap((g) => g.ids));
  const defs = (DEUR_DEFS_REF[doorName] || []).filter((d) => ids.has(d.id));
  const hw = W / 2, hl = L / 2;
  // het deurblad per deur: precies het gat (de dichte deur ligt vlak in de flank zonder over het plaatwerk ernaast te vallen), met
  // een bekleding aan de binnenkant, de versiering die op de deur hoort (strepen, sierlijn) en het handvat; samen de dichte deuren
  const decor = (body.geometry.userData && body.geometry.userData.deurDecor) || {};
  const panelen = {};
  const bouwPaneel = (Bx, g, side, id) => {
    const [x0, y0, x1, y1] = g.rect, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    Bx.box(cx, cy, side * (hw - 0.012), x1 - x0, y1 - y0, 0.024, paint);
    Bx.box(cx, cy, side * (hw - 0.06), x1 - x0 - 0.02, y1 - y0 - 0.02, 0.024, 0x2a2c30);
    for (const [a, b, c, rgb] of decor[id] || []) Bx._push(G_BODY, a, b, c, rgb, null);
    const d = defs.find((q) => q.id === id);
    if (d) Bx.box(d.x * L + (d.soort === 'scharnier' ? -1 : 1) * d.w * 0.36, d.y0 + d.h - Math.min(0.12, d.h * 0.2), side * (hw + 0.008), 0.13, 0.022, 0.016, CHROME);
  };
  for (const g of gaten) g.ids.forEach((id, k) => {
    panelen[id] = cached(`deurpaneel|${body.geometry.uuid}|${id}`, () => { const Bx = new GeoBuilder(3); bouwPaneel(Bx, g, k ? 1 : -1, id); return Bx.build(); });
  });
  const dicht = cached(`deurendicht3|${body.geometry.uuid}`, () => {
    const B = new GeoBuilder(3);
    for (const g of gaten) g.ids.forEach((id, k) => bouwPaneel(B, g, k ? 1 : -1, id));
    return B.build();
  });
  group.userData.deurPanelen = panelen;
  const dm = new THREE.Mesh(dicht, body.material);
  dm.name = 'deurenDicht';
  body.add(dm);
  group.userData.deurenDicht = dm;
  group.userData.echtGat = ids;
  group.userData.gatRects = Object.fromEntries(gaten.flatMap((g) => g.ids.map((id) => [id, g.rect])));
  if (P) {
    const ig = cached(`interieurSimpel2|${type}|${L}|${W}`, () => {
      const B = new GeoBuilder(1);
      addInterieur(B, { xA: P.xA, xD: P.xD, belt: P.belt, vloerY: 0.335, vloerW: W - 0.2, stoelY: 0.2, sx: -hl * 0.06, zs: hw * 0.36, dashW: W - 0.3 });
      return B.build();
    });
    const im = new THREE.Mesh(ig, cabinFallbackMaterial());
    im.name = 'interieurSimpel';
    body.add(im);
    group.userData.interieurSimpel = im;
  }
}
const NADEN_MAT = markShared(vcMaterial({ roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
let cabinFallbackMat = null;
function cabinFallbackMaterial() { return cabinFallbackMat || (cabinFallbackMat = markShared(vcMaterial({ roughness: 0.9 }))); }

// Het opschrift van de ambulance (#407), Nederlands en zonder regionamen of logo's: AMBULANCE in spiegelschrift op de
// voorkant (leesbaar in de spiegel van de auto ervoor), AMBULANCE langs beide zijkanten van de laadruimte, 112 en
// AMBULANCE op de achterdeuren. Vlakken met een gedeelde canvastextuur (alleen de letters, het gele plaatwerk
// schijnt erdoorheen) op 1,2 cm van het plaatwerk, met een polygonOffset.
const opschriftCache = {};
function opschriftMateriaal(tekst, spiegel, kleur, w, h, font) {
  const key = [tekst, spiegel, kleur].join('|');
  if (opschriftCache[key]) return opschriftCache[key];
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  if (spiegel) { g.translate(w, 0); g.scale(-1, 1); }
  g.fillStyle = kleur;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(tekst, w / 2, h / 2 + 2, w - 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const m = new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
  m.userData.shared = true;
  opschriftCache[key] = m;
  return m;
}
function ambulanceOpschrift(group, P, L, W) {
  const hl = L / 2, hw = W / 2;
  const BLAUW = '#1d3f8f', ROOD = '#c8102e';
  const geo = cached('opschrift-vlak', () => markShared(new THREE.PlaneGeometry(1, 1)));
  const zet = (mat, w, h, x, y, z, ry) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(w, h, 1); m.position.set(x, y, z); m.rotation.y = ry;
    m.userData.noBatch = true;
    group.add(m);
  };
  const tekst = opschriftMateriaal('AMBULANCE', false, ROOD, 512, 64, "bold 56px 'Arial Narrow',Arial,sans-serif");
  const tekstSpiegel = opschriftMateriaal('AMBULANCE', true, BLAUW, 512, 64, "bold 56px 'Arial Narrow',Arial,sans-serif");
  const x0 = -hl + 0.1, x1 = P.xB - 0.06, cx = (x0 + x1) / 2, bw = Math.min(2.6, (x1 - x0) * 0.8);
  zet(tekst, bw, bw / 8, cx, 1.68, hw + 0.012, 0);
  zet(tekst, bw, bw / 8, cx, 1.68, -hw - 0.012, Math.PI);
  // voorkant: spiegelschrift boven de grille
  zet(tekstSpiegel, 1.0, 0.125, hl + 0.014, P.nose + 0.07, 0, Math.PI / 2);
  // achterdeuren
  zet(opschriftMateriaal('112', false, ROOD, 256, 128, "bold 104px Arial,sans-serif"), 0.62, 0.31, -hl - 0.014, 1.62, 0, -Math.PI / 2);
  zet(tekst, 1.3, 0.16, -hl - 0.014, 1.3, 0, -Math.PI / 2);
}

// Sierdoppen: een lichte schijf op elk wiel, samen één 'onderdeel' dat los kan raken (#205).
// Naafkapjes zijn geen lichtbron: een MeshBasicMaterial bleef in het donker fel wit (playtestvideo 23-10).
const CAP_MAT = new THREE.MeshLambertMaterial({ color: 0xc4c8cc });
function hubcaps(wheels, r) {
  const geo = cached(`hubcap|${r}`, () => new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.03, 10, 1).rotateX(Math.PI / 2));
  const caps = wheels.map((w) => {
    const c = new THREE.Mesh(geo, CAP_MAT);
    c.position.z = Math.sign(w.position.z || 1) * (WHEEL_W / 2 + 0.02);
    w.add(c);
    return c;
  });
  return { set visible(on) { for (const c of caps) c.visible = on; }, get visible() { return caps.length ? caps[0].visible : true; } };
}

function looseCarParts(type, L, W, paint, P, mats, group) {
  const hl = L / 2, hw = W / 2;
  const parts = {};
  const make = (id, build) => {
    const geo = cached(`loose|${id}|${type}|${L}|${W}|${paint}`, () => { const B = new GeoBuilder(3); build(B); return B.build(); });
    const m = new THREE.Mesh(geo, mats);
    group.add(m);
    parts[id] = m;
  };
  make('grille', (B) => B.box(hl + 0.005, P.nose - 0.12, 0, 0.03, 0.11, W * 0.42, TRIM));
  make('spiegels', (B) => {
    // een hybride romp heeft zijn eigen spiegels (aan de voordeur, ze gaan met de deur mee): geen tweede blok ernaast, alleen een
    // onzichtbaar stipje binnen de flank zodat de schade (fx3d.js) een plek heeft om de scherven van te laten vallen
    if (P.uitlaat) { for (const s of [1, -1]) B.box(P.xA - 0.08, P.belt, s * (hw - 0.12), 0.01, 0.01, 0.01, TRIM); return; }
    const mx = P.van ? P.xA - 0.12 : P.xA - 0.08;
    for (const s of [1, -1]) {
      B.box(mx, P.belt + 0.1, s * (hw + 0.08), 0.1, 0.09, 0.14, paint);
      B.box(mx + 0.02, P.belt + 0.05, s * (hw + 0.02), 0.05, 0.04, 0.06, TRIM);
    }
  });
  make('uitlaat', (B) => {
    // een hybride romp heeft een ronde kont: de uitlaat zit eronder, vast aan de onderkant, en steekt maar een paar cm uit
    if (P.uitlaat) {
      const u = P.uitlaat; // half in de onderkant van de bumper, de punt 2 cm voorbij de achterkant
      for (const s of [0.5, -0.5]) B.geo(new THREE.CylinderGeometry(0.024, 0.024, 0.14, 8).rotateZ(Math.PI / 2), composeMatrix(u.x - 0.02 + 0.07, u.y + 0.008, s * hw * 0.42), 0x2a2a2c);
      return;
    }
    for (const s of P.van ? [0.45] : [0.5, -0.5]) B.box(-hl - 0.08, 0.3, s * hw * 0.5, 0.22, 0.07, 0.09, 0x2a2a2c);
  });
  return parts;
}

// Hides the parts that vehicledamage.js says are loose (grille, mirrors) on a car mesh.
export function syncLooseParts(mesh, v) {
  const parts = mesh && mesh.userData.loose;
  if (!parts) return;
  const los = new Set(losseOnderdelen(zoneTotals(v.dentLog, v.model.len, v.model.wid)));
  for (const id of Object.keys(parts)) parts[id].visible = !los.has(id);
}

function carType(v) {
  if (v.isPolice && !v._commandeered) return 'wagon';
  const n = v.model.name;
  if (n === 'taxi') return 'sedan';
  if (n === 'cashvan') return 'van';
  return n === 'sedan' || n === 'wagon' || n === 'van' || n === 'sport' || n === 'suv' ? n : 'hatch';
}

// De raamlijn en het dak van de romp van een gewone personenauto (#442): cabin3d.js en
// carinteriorlayout.js hangen het dashboard, het stuur en de binnenspiegel zo aan de echte
// carrosserie dat ze achter de voorruit vallen in plaats van erdoorheen. null voor voertuigen
// met een eigen cabine (vrachtwagen, bus, tractor, foodtruck) en voor een wrak.
export function carBodyFit(v) {
  if (!v || !v.model || v.wrecked) return null;
  const n = v.model.name;
  if (v.isBus || n === 'truck' || n === 'trekkerlimo' || n === 'tractor' || n === 'quad' || n === 'foodtruck' || n === 'maaidorser' || n === 'laadmachine') return null;
  const hk = hybridKey(v);
  if (hk) { const m = hybrideSchaal(hk); return { ...hybridFit(hk, m.len, m.wid) }; }
  const P = carProfile(carType(v), v.model.len / 2);
  return { belt: P.belt, roof: P.roof, xA: P.xA, xB: P.xB, xC: P.xC, xD: P.xD, hood: P.hood, deck: P.deck, nose: P.nose, tail: P.tail, fw: P.fw, rw: P.rw };
}

function carVariant(v) {
  const n = v.model.name;
  if (n === 'taxi' || v.isTaxi) return 'taxi';
  if (n === 'cashvan') return 'cash';
  if (v.model.rusty) return 'rust';
  if (v.model.electric) return 'ev';
  if (v.model.tokkie) return 'tokkie';
  return v.model.livery || '';
}

function buildCarMesh(v) {
  if (v.isAmbulance) return assembleCar('van', v.model.len, v.model.wid, 0xf1d21c, { ambulance: true, wrecked: v.wrecked, wheelR: 0.34 });
  if (v.model.name === 'truck') return buildTruckMesh(v);
  if (v.model.name === 'trekkerlimo') return buildTrekkerLimoMesh(v);
  if (v.model.name === 'tractor') return buildTractorMesh(v);
  if (v.model.name === 'quad') return buildQuadMesh(v);
  if (v.model.name === 'maaidorser') return buildMaaidorserMesh(v);
  if (v.model.name === 'laadmachine') return buildLaadmachineMesh(v);
  if (v.model.name === 'foodtruck') return buildFoodtruckMesh(v);
  // a stolen police car that went through the spray shop wears its new paint
  const police = !!v.isPolice && !v._commandeered && !v.model.resprayed;
  const paint = police ? 0xeceae4 : toHex(v.model.color, HABBO_PALETTE.metalGrey);
  const type = carType(v);
  const hk = hybridKey(v);
  if (hk) return buildHybridCar(v, hk, paint); // de hybride auto's (23-11), zie hieronder
  const wheelR = type === 'van' ? 0.34 : type === 'suv' ? 0.38 : WHEEL_R;
  return assembleCar(type, v.model.len, v.model.wid, paint, { police, wrecked: v.wrecked, wheelR, variant: carVariant(v) });
}

// --- hybride auto's (23-11) ---------------------------------------------------------
// De carrosserieën van het Quaternius-autopakket (CC0, game/js/models/qcars.js, omgezet door scripts/convert_quaternius_car.mjs) met
// onze functies erop: onze drie materialen (lak in de kleur van het voertuig, glas, lampen), onze wielen op hun plekken (draaien en
// sturen), een ECHT gat in de flank waar een deur zit met het uitgeknipte stuk romp als deur (dikte, binnenkant), deurstijlen en
// een dorpel, een eenvoudig interieur achter de opening, deurnaden op de gebogen flank, schade (deuken, hangende bumpers, losse
// grille, spiegels en wieldoppen), politielampen en strepen. Standaard voor de gewone personenauto's, politie en taxi; een auto met
// een andere uitvoering (roest, tokkie, elektrisch, belettering), tuning of model.hybride === false houdt onze eigen bouwer.
// De maat komt uit het register (propregister.js, VOERTUIG_REGISTER[..].schaal, getoetst aan VOERTUIG_NORM): hun auto's zijn te laag
// (1,15 tot 1,24 m), dus de hoogte wordt per model op de norm gezet, zodat een volwassene van 1,78 m erin past. De getekende lengte
// en breedte kunnen van de botsmaat (v.model.len, wid) afwijken; de deuren rekenen met de getekende maat (userData.deurLen, deurWid).
const hybData = new Map();
function b64Bytes(s) { return typeof atob === 'function' ? Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) : new Uint8Array(Buffer.from(s, 'base64')); }
function hybridData(key) {
  let d = hybData.get(key);
  if (d) return d;
  const auto = QCARS[key];
  const pb = b64Bytes(auto.posities), ib = b64Bytes(auto.index);
  d = { auto, pos: new Int16Array(pb.buffer, pb.byteOffset, pb.byteLength / 2), idx: new Uint16Array(ib.buffer, ib.byteOffset, ib.byteLength / 2), rol: b64Bytes(auto.rol) };
  hybData.set(key, d);
  return d;
}
// De dakhoogte van hun romp (ongeschaald): de bovenkant van de ruiten plus de dikte van het dak. Een daklicht of taxibord telt
// niet mee (die steken boven het dak uit).
const DAK = 0.06;
function hybridRoofU(key) {
  const d = hybridData(key);
  let top = 0;
  for (let t = 0; t < d.rol.length; t++) if (d.rol[t] === 1) for (let k = 0; k < 3; k++) top = Math.max(top, d.pos[d.idx[t * 3 + k] * 3 + 1] / 1000);
  return top + DAK;
}
function hybridScale(auto, L, W, key) {
  const schaal = hybrideSchaal(key);
  return { sx: L / auto.maat.len, sy: (schaal ? schaal.hoog : 1.45) / hybridRoofU(key), sz: W / auto.maat.wid };
}
// Welke hybride bij dit voertuig hoort, of null (dan onze eigen bouwer).
export function hybridKey(v) {
  if (!v || !v.model || v.model.hybride === false || v.isAmbulance || v.isHeroCar || v.look) return null;
  if (v.model.qcar && QCARS[v.model.qcar]) return v.model.qcar; // een vaste keuze (register, contactblad)
  if (v.model.name === 'police' || (v.isPolice && !v._commandeered)) return 'police';
  const variant = carVariant(v);
  if (variant === 'taxi') return 'taxi';
  if (variant) return null;
  const n = v.model.name;
  if (n === 'sedan') return 'sedan';
  if (n === 'hatch') return 'hatch';
  if (n === 'suv') return 'suv';
  if (n === 'sport') return hash2(typeof v.id === 'number' ? v.id : String(v.id).length, 3.7) < 0.5 ? 'sport' : 'sport2';
  return null;
}
const HYB_DOORS = { sedan: 'sedan', hatch: 'hatch', suv: 'suv', sport: 'sport', sport2: 'sport', taxi: 'taxi', police: 'police' };
// De flank: waar een straal van buiten naar binnen (langs z) de romp raakt, op hoogte y en lengte x.
function hybridSurface(tris, x, y, side) {
  let best = null;
  for (const t of tris) {
    const [a, b, c] = t;
    const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(d) < 1e-9) continue;
    const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d;
    const l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
    const l3 = 1 - l1 - l2;
    if (l1 < 0 || l2 < 0 || l3 < 0) continue;
    const z = l1 * a[2] + l2 * b[2] + l3 * c[2];
    if (z * side > 0 && (best === null || z * side > best * side)) best = z;
  }
  return best;
}
// De geschaalde driehoeken met hun rol, in onze assen.
function hybridTris(key, L, W) {
  const { auto, pos, idx, rol } = hybridData(key);
  const { sx, sy, sz } = hybridScale(auto, L, W, key);
  const out = [];
  for (let t = 0; t < rol.length; t++) {
    const v = [0, 1, 2].map((k) => { const i = idx[t * 3 + k] * 3; return [pos[i] / 1000 * sx, pos[i + 1] / 1000 * sy, pos[i + 2] / 1000 * sz]; });
    out.push({ v, r: rol[t] });
  }
  return out;
}
// Maten van de hybride romp voor cabine, stoelen, spiegels en tuning (zoals carProfile voor onze bouwer).
export function hybridFit(key, L, W) {
  return cached(`hybfit|${key}|${L}|${W}`, () => {
    const tris = hybridTris(key, L, W), glas = [], lak = [];
    for (const t of tris) (t.r === 1 ? glas : t.r === 0 ? lak : []).push(...t.v);
    const ys = (a) => a.map((p) => p[1]), xs = (a) => a.map((p) => p[0]);
    const { sy } = hybridScale(QCARS[key], L, W, key);
    const roof = Math.max(...ys(glas)) + DAK * sy, belt = Math.min(...ys(glas));
    const xA = Math.max(...glas.filter((p) => p[1] < belt + 0.08).map((p) => p[0])), xD = Math.min(...glas.filter((p) => p[1] < belt + 0.08).map((p) => p[0]));
    const hoog = glas.filter((p) => p[1] > roof - 0.12);
    const xB = hoog.length ? Math.max(...xs(hoog)) : xA - 0.6, xC = hoog.length ? Math.min(...xs(hoog)) : xD + 0.5;
    const voor = lak.filter((p) => p[0] > xA + 0.1);
    const hood = voor.length ? Math.max(...ys(voor)) : belt - 0.1;
    const kop = tris.filter((t) => t.r === 2).flatMap((t) => t.v);
    const nose = kop.length ? Math.max(...ys(kop)) + 0.08 : hood - 0.2;
    const g = new THREE.BufferGeometry(); // de vorm hoort bij cached(): een lege geometrie met de maten in userData
    g.userData.fit = { belt, roof, xA, xB, xC, xD, hood, deck: belt, nose, tail: belt - 0.1, fw: L / 2 - 0.85, rw: -L / 2 + 0.95 };
    return g;
  }).userData.fit;
}
function hybridBody(key, L, W, paint, doorName, police) {
  return cached(`hybride4|${key}|${L}|${W}|${paint}|${doorName}|${police}`, () => {
    const hl = L / 2, hw = W / 2;
    const tris = hybridTris(key, L, W);
    const fit = hybridFit(key, L, W);
    const kleur = [paint, GLASS, HEADLAMP, TAIL, 0x1b1b1b, 0x707070, shadeHex(paint, 0.72)];
    const groep = [G_BODY, G_GLASS, G_LAMP, G_LAMP, G_BODY, G_BODY, G_BODY];
    const lakTris = tris.filter((t) => t.r === 0).map((t) => t.v);
    // de deuren die een echt gat krijgen: hun uitgeknipte stuk romp (met ruit) wordt de deur
    const defs = (DEUR_DEFS_REF[doorName] || []).filter((d) => d.soort === 'scharnier' || d.soort === 'achterscharnier');
    const vlak = {}, deurZ = {}, rects = {}, deurMaat = {};
    // de wielkasten: een portier begint achter de voorste wielkast en eindigt vóór de achterste (anders opent de deur een stuk
    // spatbord en zie je door het gat het wiel met zijn wieldop)
    const { auto } = hybridData(key), sc = hybridScale(auto, L, W, key), wr = auto.wielen[0].r * sc.sy;
    const kasten = [...new Set(auto.wielen.map((w) => +(w.x * sc.sx).toFixed(3)))];
    for (const d of defs) {
      const z = hybridSurface(lakTris, d.x * L, d.y0 + d.h / 2, d.side);
      if (z === null) continue;
      deurZ[d.id] = Math.abs(z);
      // bovenkant: de bovenkant van de zijruit boven deze deur plus de raamlijst (niet het dak of de C-stijl: die zitten niet aan de deur)
      let x0 = d.x * L - d.w / 2, x1 = d.x * L + d.w / 2;
      // de deur schuift weg van de wielkast en houdt zijn breedte, tot op 7 cm van het midden van de stijl naar de buurdeur
      const buren = defs.filter((q) => q !== d && q.side === d.side);
      for (const kx of kasten) {
        if (kx > x1 + wr + 0.04 || kx < x0 - wr - 0.04) continue;
        if (kx > (x0 + x1) / 2) {
          x1 = Math.min(x1, kx - wr - 0.04);
          const achter = buren.filter((q) => q.x < d.x).map((q) => (q.x * L + q.w / 2 + d.x * L - d.w / 2) / 2 + 0.07);
          x0 = Math.max(x1 - d.w, ...achter, -Infinity) > x0 ? x0 : Math.max(x1 - d.w, ...achter);
        } else {
          x0 = Math.max(x0, kx + wr + 0.04);
          const voor = buren.filter((q) => q.x > d.x).map((q) => (q.x * L - q.w / 2 + d.x * L + d.w / 2) / 2 - 0.07);
          x1 = Math.min(x0 + d.w, ...voor, Infinity) < x1 ? x1 : Math.min(x0 + d.w, ...voor);
        }
      }
      if (x1 - x0 < 0.6) { x0 = d.x * L - d.w / 2; x1 = d.x * L + d.w / 2; } // te smal: dan de oude maat
      if (x0 !== d.x * L - d.w / 2 || x1 !== d.x * L + d.w / 2) deurMaat[d.id] = { x: (x0 + x1) / 2 / L, w: x1 - x0 };
      let ruitTop = 0;
      for (const t of tris) if (t.r === 1) { const cx = (t.v[0][0] + t.v[1][0] + t.v[2][0]) / 3, cz = (t.v[0][2] + t.v[1][2] + t.v[2][2]) / 3; if (cx > x0 && cx < x1 && cz * d.side > 0.3) ruitTop = Math.max(ruitTop, ...t.v.map((p) => p[1])); }
      rects[d.id] = [x0, d.y0, x1, Math.min(fit.roof - 0.07, ruitTop ? ruitTop + 0.035 : fit.roof - 0.07)];
      vlak[d.id] = [];
    }
    const inDeur = (t) => {
      if (t.r === 2 || t.r === 3) return null;
      const c = [0, 1, 2].map((k) => (t.v[0][k] + t.v[1][k] + t.v[2][k]) / 3);
      for (const d of defs) {
        const r = rects[d.id];
        if (!r || c[2] * d.side < deurZ[d.id] * 0.55) continue;
        if (c[0] > r[0] && c[0] < r[2] && c[1] > r[1] && c[1] < r[3]) return d.id;
      }
      return null;
    };
    // volgorde: voorbumper, achterbumper, de rest (schade laat de bumpers als deel hangen, zie userData.parts)
    const isVoor = (t) => t.r !== 1 && t.v.every((p) => p[0] > hl - 0.3 && p[1] < fit.nose - 0.05);
    const isAchter = (t) => t.r !== 1 && t.v.every((p) => p[0] < -hl + 0.3 && p[1] < fit.belt - 0.1);
    const B = new GeoBuilder(3);
    const vcount = () => B.groups[G_BODY].p.length / 3;
    const rest = [];
    // een rechte snede langs de deurcontour: een driehoek op de flank die de rand kruist wordt geknipt (Sutherland-Hodgman in x en
    // y, z volgt lineair), het stuk binnen gaat naar de deur en de stukken erbuiten blijven romp; geen zaagtand langs de opening
    const knip = (poly, as, c, binnen) => {
      const uit = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length], ia = binnen(a[as], c), ib = binnen(b[as], c);
        if (ia) uit.push(a);
        if (ia !== ib) { const t2 = (c - a[as]) / (b[as] - a[as]); uit.push(a.map((v2, k) => v2 + (b[k] - v2) * t2)); }
      }
      return uit;
    };
    const platOpp = (a, b, c) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; return Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]); };
    const fan = (poly, r) => { const o = []; for (let i = 1; i + 1 < poly.length; i++) if (platOpp(poly[0], poly[i], poly[i + 1]) > 1e-8) o.push({ v: [poly[0], poly[i], poly[i + 1]], r }); return o; };
    const kleiner = (x, c) => x <= c, groter = (x, c) => x >= c;
    // de flank wordt langs de deurcontour geknipt (Sutherland-Hodgman in x en y, z volgt lineair): alleen de vlakken die opzij kijken
    // (de deur en zijn ruit, ook de ronde dorpel en schouder, niet het dak of de voorruit). Het deurblad krijgt de contour 4 mm naar binnen (de kier), de romp houdt
    // alles buiten de contour. Langs elke snede komt een rand met dikte: in de opening 6 cm naar binnen (stijlen en dorpel), aan de
    // deur 3,5 cm (tot zijn binnenkant). Zo blijven er geen losse scherven en geen gekartelde randen over.
    const KIER = 0.004, RAND_GAT = 0.06, RAND_DEUR = 0.035, RANDKLEUR = shadeHex(paint, 0.45);
    const randen = []; // [a, b, uit, diepte, side, kleur, doel] doel: 'romp' of deur-id
    const opLijn = (a, b, as, c) => Math.abs(a[as] - c) < 1e-6 && Math.abs(b[as] - c) < 1e-6;
    const randVan = (poly, r, naarBinnen, diepte, side, doel) => {
      const lijnen = [[0, r[0], [1, 0, 0]], [0, r[2], [-1, 0, 0]], [1, r[1], [0, 1, 0]], [1, r[3], [0, -1, 0]]];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        for (const [as, c, u] of lijnen) if (opLijn(a, b, as, c)) randen.push([a, b, naarBinnen ? u : u.map((x) => -x), diepte, side, RANDKLEUR, doel]);
      }
    };
    // hun model heeft binnenin een plat zwart vlak op raamhoogte (de 'binnenkant' van de dichte auto); door een open deur zie je het
    // dwars door de cabine liggen, dus het gaat eruit (het interieur is van ons)
    const binnenPlaat = (t) => t.r === 4 && t.v.every((p) => Math.abs(p[2]) < hw - 0.3 && p[0] < fit.xA + 0.05 && p[0] > fit.xD - 0.05 && p[1] > fit.belt - 0.25 && p[1] < fit.belt + 0.25);
    for (const t of tris) {
      if (binnenPlaat(t)) continue;
      const c = [0, 1, 2].map((k) => (t.v[0][k] + t.v[1][k] + t.v[2][k]) / 3);
      const u = [0, 1, 2].map((k) => t.v[1][k] - t.v[0][k]), w = [0, 1, 2].map((k) => t.v[2][k] - t.v[0][k]);
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], nl = Math.hypot(...n) || 1;
      const ruitOpzij = t.r !== 1 || (n[2] / nl) * (c[2] < 0 ? -1 : 1) > 0.6; // van de ruiten alleen de zijruit, niet de hoek van de voor- of achterruit
      // zwarte sierlijsten op de flank (de raamlijst, met een bovenvlak dat niet opzij kijkt) gaan altijd mee met de deur
      const d = (t.r === 2 || t.r === 3 || !ruitOpzij) ? null : defs.find((q) => rects[q.id] && ((n[2] / nl) * q.side > (c[1] > fit.belt ? 0.5 : 0.15) && c[2] * q.side >= deurZ[q.id] * 0.55 || (c[1] <= fit.belt && (n[2] / nl) * q.side > -0.3 || t.r === 4) && c[2] * q.side >= deurZ[q.id] * 0.8)
        && Math.max(...t.v.map((p) => p[0])) > rects[q.id][0] && Math.min(...t.v.map((p) => p[0])) < rects[q.id][2] && Math.max(...t.v.map((p) => p[1])) > rects[q.id][1] && Math.min(...t.v.map((p) => p[1])) < rects[q.id][3]);
      if (!d) {
        // een klein deel dat helemaal binnen de contour aan de buitenkant zit maar niet opzij kijkt (een spiegel, een sierrand op de deur):
        // gaat in zijn geheel mee met de deur, anders zweeft het in de open opening
        const heel = (t.r === 1 || t.r === 2 || t.r === 3) ? null : defs.find((q) => { const r = rects[q.id]; return r && t.v.every((p) => p[0] > r[0] && p[0] < r[2] && p[1] > r[1] && p[1] < r[3] && p[2] * q.side >= deurZ[q.id] * 0.8); });
        if (heel) vlak[heel.id].push(t); else rest.push(t);
        continue;
      }
      const r = rects[d.id], ri = [r[0] + KIER, r[1] + KIER, r[2] - KIER, r[3] - KIER];
      const binnenRect = (poly, q) => knip(knip(knip(knip(poly, 0, q[0], groter), 0, q[2], kleiner), 1, q[1], groter), 1, q[3], kleiner);
      if (binnenRect(t.v, r).length < 3) { rest.push(t); continue; } // raakt de opening niet: heel laten
      const deur = binnenRect(t.v, ri);
      if (deur.length >= 3) { vlak[d.id].push(...fan(deur, t.r)); randVan(deur, ri, false, RAND_DEUR, d.side, d.id); }
      // buiten de contour: links, rechts, en in de middenstrook onder en boven
      const mid = knip(knip(t.v, 0, r[0], groter), 0, r[2], kleiner);
      for (const poly of [knip(t.v, 0, r[0], kleiner), knip(t.v, 0, r[2], groter), knip(mid, 1, r[1], kleiner), knip(mid, 1, r[3], groter)]) {
        if (poly.length < 3) continue;
        rest.push(...fan(poly, t.r));
        randVan(poly, r, true, RAND_GAT, d.side, 'romp');
      }
    }
    // losse eilandjes langs de opening (een stukje raamlijst, een dunne lat van hun binnenrand) zweven anders als scherf in de open
    // opening of hangen als lat aan het deurblad: kleine eilanden (onder 150 cm2) binnen 10 cm van een deurcontour gaan eruit
    const KLEIN_EILAND = 0.015;
    const eilanden = (lijst) => {
      const key = (p) => `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)},${Math.round(p[2] * 1000)}`;
      const ouder = lijst.map((_, i) => i), vind = (a) => (ouder[a] === a ? a : (ouder[a] = vind(ouder[a])));
      const eerste = new Map();
      lijst.forEach((t, i) => { for (const p of t.v) { const k = key(p); if (eerste.has(k)) ouder[vind(i)] = vind(eerste.get(k)); else eerste.set(k, i); } });
      const groep = new Map();
      lijst.forEach((t, i) => { const r = vind(i); if (!groep.has(r)) groep.set(r, []); groep.get(r).push(t); });
      return [...groep.values()];
    };
    const opp = (t) => { const [a, b, c] = t.v, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; return Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2; };
    const bijContour = (lijst) => Object.values(rects).some((r) => lijst.some((t) => t.v.some((p) => p[0] > r[0] - 0.1 && p[0] < r[2] + 0.1 && p[1] > r[1] - 0.1 && p[1] < r[3] + 0.1)));
    const opgeruimd = (lijst, alleenBijContour) => eilanden(lijst).filter((e) => e.reduce((a, t) => a + opp(t), 0) >= KLEIN_EILAND || (alleenBijContour && !bijContour(e))).flat();
    for (const id of Object.keys(vlak)) vlak[id] = opgeruimd(vlak[id], false);
    rest.splice(0, rest.length, ...opgeruimd(rest, true));
    // de randen horen bij wat er overblijft: een rand van een opgeruimd eilandje gaat mee weg
    const over = new Set([...rest, ...Object.values(vlak).flat()].flatMap((t) => t.v.map((p) => `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)},${Math.round(p[2] * 1000)}`)));
    const randOver = (rd) => [rd[0], rd[1]].every((p) => over.has(`${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)},${Math.round(p[2] * 1000)}`));
    randen.splice(0, randen.length, ...randen.filter(randOver));
    const f0 = vcount();
    for (const t of rest) if (isVoor(t)) B.tri(t.v[0], t.v[1], t.v[2], kleur[t.r], groep[t.r]);
    const f1 = vcount();
    for (const t of rest) if (!isVoor(t) && isAchter(t)) B.tri(t.v[0], t.v[1], t.v[2], kleur[t.r], groep[t.r]);
    const r1 = vcount();
    for (const t of rest) if (!isVoor(t) && !isAchter(t)) B.tri(t.v[0], t.v[1], t.v[2], kleur[t.r], groep[t.r]);
    // de rand van de opening in de romp (stijlen en dorpel met diepte); de rand van de deur gaat mee met het deurblad (hieronder)
    const randQuad = (Bx, [a, b, uit, diepte, side, kl]) => {
      const a2 = [a[0], a[1], a[2] - side * diepte], b2 = [b[0], b[1], b[2] - side * diepte];
      Bx.quadOut(a, b, b2, a2, uit, kl);
    };
    for (const rd of randen) if (rd[6] === 'romp') randQuad(B, rd);
    // politiestrepen: dunne vlakjes die de gebogen flank volgen, in een eigen mesh met polygonOffset (NADEN_MAT),
    // zodat ze vlak op het plaatwerk kunnen liggen zonder ermee te vechten
    const D = new GeoBuilder(1);
    // (de deurnaden zelf zijn nu de echte kier van 4 mm met een donkere rand erachter; een getekende naad zou in een open opening zweven)
    const streepOpDeur = {};
    if (police) {
      // Nederlandse politiestrepen langs de flank (blauw met een oranje lijn), de lijn volgt de flank; geen echte opschriften
      for (const side of [1, -1]) {
        for (let x = -hl + 0.4; x < hl - 0.5; x += 0.3) {
          const z0 = hybridSurface(lakTris, x, 0.66, side), z1 = hybridSurface(lakTris, x + 0.3, 0.66, side);
          if (z0 === null || z1 === null) continue;
          const o = side * 0.009;
          // een stuk op een deur gaat mee met het deurblad (zie de schil hieronder), anders zweeft het in de open opening
          const deur = defs.find((d) => d.side === side && rects[d.id] && x + 0.15 > rects[d.id][0] && x + 0.15 < rects[d.id][2]);
          const doel = deur ? (streepOpDeur[deur.id] || (streepOpDeur[deur.id] = [])) : null;
          const q = (a, b, c, d2, kl) => (doel ? doel.push([a, b, c, d2, side, kl]) : D.quadOut(a, b, c, d2, [0, 0, side], kl));
          q([x, 0.6, z0 + o], [x + 0.3, 0.6, z1 + o], [x + 0.3, 0.72, z1 + o], [x, 0.72, z0 + o], 0x1f3f8f);
          q([x, 0.555, z0 + o], [x + 0.3, 0.555, z1 + o], [x + 0.3, 0.58, z1 + o], [x, 0.58, z0 + o], 0xd9772b);
        }
      }
    }
    const geo = B.build();
    geo.userData.parts = { hl, hw, hood: fit.hood, bumperColor: paint, front: { start: f0, end: f1, y: 0.4, x: hl - 0.1 }, rear: { start: f1, end: r1, y: 0.42, x: -hl + 0.1 } };
    geo.userData.deurZ = deurZ;
    geo.userData.gatRects = rects;
    geo.userData.deurMaat = deurMaat;
    geo.userData.naden = markShared(D.build());
    // de deurbladen: het uitgeknipte stuk romp, met een binnenkant 3,5 cm naar binnen (omgekeerd, in bekleding) en een handvat
    const panelen = {}, decals = {};
    const alle = new GeoBuilder(3), DA = new GeoBuilder(1);
    for (const d of defs) {
      if (!vlak[d.id] || !vlak[d.id].length) continue;
      const P2 = new GeoBuilder(3);
      for (const Bx of [P2, alle]) {
        for (const rd of randen) if (rd[6] === d.id) randQuad(Bx, rd);
        for (const t of vlak[d.id]) {
          Bx.tri(t.v[0], t.v[1], t.v[2], kleur[t.r], groep[t.r]);
          const inn = t.v.map((p) => [p[0], p[1], p[2] - d.side * 0.035]);
          Bx.tri(inn[0], inn[2], inn[1], t.r === 1 ? GLASS : 0x2a2c30, t.r === 1 ? G_GLASS : G_BODY);
        }
        const hx = d.x * L + (d.soort === 'scharnier' ? -1 : 1) * d.w * 0.36, hy = d.y0 + d.h - 0.12;
        const hz = hybridSurface(vlak[d.id].map((t) => t.v), hx, hy, d.side);
        if (hz !== null) Bx.box(hx, hy, hz + d.side * 0.008, 0.13, 0.022, 0.016, CHROME);
      }
      panelen[d.id] = markShared(P2.build());
      // de strepen op dit deurblad: eigen mesh met polygonOffset (NADEN_MAT), net als de naden op de romp
      if (streepOpDeur[d.id]) {
        const DD = new GeoBuilder(1);
        for (const [a, b, c, d2, side, kl] of streepOpDeur[d.id]) { DD.quadOut(a, b, c, d2, [0, 0, side], kl); DA.quadOut(a, b, c, d2, [0, 0, side], kl); }
        decals[d.id] = markShared(DD.build());
      }
    }
    geo.userData.deurPanelen = panelen;
    geo.userData.deurDecals = decals;
    geo.userData.deurenDicht = markShared(alle.build());
    geo.userData.deurenDichtDecals = Object.keys(decals).length ? markShared(DA.build()) : null;
    geo.userData.fit = fit;
    return geo;
  });
}
function buildHybridCar(v, key, paint) {
  const schaal = hybrideSchaal(key), L = schaal.len, W = schaal.wid;
  const auto = QCARS[key];
  const police = key === 'police' && !!v.isPolice && !v._commandeered && !v.model.resprayed;
  const doorName = HYB_DOORS[key];
  const color = v.wrecked ? WRECKED_COLOR : paint;
  const geo = hybridBody(key, L, W, color, doorName, police);
  const mats = vehicleMaterials(v.wrecked);
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
  group.userData.hybride = key;
  group.userData.deurZ = geo.userData.deurZ;
  group.userData.deurPanelen = geo.userData.deurPanelen;
  group.userData.deurLen = L;
  group.userData.deurWid = W;
  group.userData.gatRects = geo.userData.gatRects;
  group.userData.deurMaat = geo.userData.deurMaat; // de deuren die voor de wielkast korter zijn geworden (vehicledoors3d.js)
  // dichte deuren: één statische mesh in de gaten tot er een deur-rig is
  const dm = new THREE.Mesh(geo.userData.deurenDicht, mats);
  dm.name = 'deurenDicht';
  body.add(dm);
  group.userData.deurenDicht = dm;
  if (geo.userData.deurenDichtDecals) dm.add(new THREE.Mesh(geo.userData.deurenDichtDecals, NADEN_MAT));
  group.userData.deurDecals = geo.userData.deurDecals;
  group.userData.nadenMat = NADEN_MAT;
  group.userData.echtGat = new Set(Object.keys(geo.userData.deurPanelen));
  const naden = new THREE.Mesh(geo.userData.naden, NADEN_MAT);
  naden.name = 'naden';
  body.add(naden);
  const fit = geo.userData.fit;
  // eenvoudig interieur achter de opening (tot cabin3d.js de echte cabine laat zien)
  // de breedte van elk interieurdeel volgt de flank op die plek (de romp loopt in naar voren, achteren en boven): niets steekt erdoor
  const flankTris = hybridTris(key, L, W).filter((t) => t.r === 0).map((t) => t.v);
  const binnen = (x, y, marge = 0.1) => { const z = hybridSurface(flankTris, x, y, 1); return Math.max(0.3, 2 * ((z === null ? W / 2 : z) - marge)); };
  const ig = cached(`hybInterieur4|${key}|${L}|${W}`, () => {
    const B = new GeoBuilder(1);
    const sx = -L / 2 * 0.06;
    // de smalste plek van de flank (lak en ruit, de romp vóór het knippen) over een stuk, op een rooster van 6 x 6 punten
    const schil = hybridTris(key, L, W).filter((t) => t.r === 0 || t.r === 1).map((t) => t.v);
    const ruimte = (x0, x1, y0, y1) => {
      let m = Infinity;
      for (let i = 0; i <= 5; i++) for (let j = 0; j <= 5; j++) { const z = hybridSurface(schil, x0 + (x1 - x0) * i / 5, y0 + (y1 - y0) * j / 5, 1); m = Math.min(m, z === null ? 0 : z); }
      return m - 0.03;
    };
    addInterieur(B, { xA: fit.xA, xD: fit.xD, belt: fit.belt, vloerY: 0.36, vloerW: Math.min(binnen(fit.xA - 0.3, 0.45), binnen(fit.xD + 0.3, 0.45)), ruimte,
      stoelY: 0.33, sx, zs: Math.min(binnen(sx, 0.6) / 2 - 0.26, 0.42), dashW: binnen(fit.xA - 0.2, fit.belt - 0.1, 0.12) });
    return B.build();
  });
  const im = new THREE.Mesh(ig, cabinFallbackMaterial());
  im.name = 'interieurSimpel';
  body.add(im);
  group.userData.interieurSimpel = im;
  // losse delen bij schade: grille, spiegels, uitlaat (zoals onze bouwer), op de maten van deze romp
  const lakTris = hybridTris(key, L, W).filter((t) => t.r === 0).map((t) => t.v);
  const zSp = hybridSurface(lakTris, fit.xA - 0.08, fit.belt - 0.02, 1);
  // de uitlaat hangt onder de achterbumper: de onderkant van hun kont (laagste punt in de laatste 35 cm) en hoe ver die naar achteren reikt
  const kont = hybridTris(key, L, W).flatMap((t) => t.v).filter((p) => p[0] < -L / 2 + 0.35 && Math.abs(p[2]) < 0.6);
  const kontY = kont.length ? Math.min(...kont.map((p) => p[1])) : 0.3;
  const kontX = kont.length ? Math.min(...kont.filter((p) => p[1] < kontY + 0.06).map((p) => p[0])) : -L / 2;
  const P = { ...fit, van: false, uitlaat: { x: kontX, y: kontY } };
  group.userData.loose = looseCarParts('hyb-' + key, L, zSp ? zSp * 2 : W, color, P, mats, group);
  // wielen: onze wielgeometrie op hun plekken
  const { sx, sy, sz } = hybridScale(auto, L, W, key);
  const r = +(auto.wielen[0].r * sy).toFixed(3);
  const wgeo = carWheelGeometry(r, WHEEL_W);
  const wheels = [], front = [];
  for (const w of auto.wielen) {
    const m = addWheel(group, wgeo, mats[0], w.x * sx, r, w.z * sz * 0.97, wheels);
    if (w.voor) front.push(m);
  }
  group.userData.wheels = wheels;
  group.userData.frontWheels = front;
  group.userData.wheelRadius = r;
  group.userData.loose.sierdoppen = hubcaps(wheels, r);
  if (police && auto.lichtbalk) {
    const lamps = [];
    const bx = auto.lichtbalk.x * sx, by = auto.lichtbalk.y * sy;
    const bar = new THREE.Mesh(cached(`hybbalk|${W}`, () => new THREE.BoxGeometry(0.3, 0.06, W * 0.62)), new THREE.MeshLambertMaterial({ color: TRIM }));
    bar.position.set(bx, by - 0.02, 0);
    body.add(bar);
    for (const s of [1, -1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, W * 0.26), lampMaterial(0x2f6bff, 0.25));
      lamp.position.set(bx, by + 0.05, s * W * 0.17);
      body.add(lamp);
      lamps.push(lamp);
    }
    group.userData.policeLamps = lamps;
  }
  return group;
}

// --- echte deurgaten in een romp van blokken (vrachtwagen, trekker, trekker-limo, 23-11) ------------------------------------------
// Een voertuig dat uit dozen is opgebouwd (cabine, zijpanelen) krijgt dezelfde echte opening als de auto's: de zijvlakken binnen de
// deurcontour worden langs de contour geknipt (Sutherland-Hodgman, zoals bij de hybride) en het uitgeknipte stuk wordt het deurblad
// (met een binnenkant 3,5 cm naar binnen en het handvat). Achter de opening staat een binnenbak (naar binnen gekeerde vlakken) met
// vloer en stoel, zodat je door de open deur de cabine in kijkt en niet dwars door de doos naar buiten.
function binnenDoos(B, x, y, z, sx, sy, sz, color) {
  const g0 = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); // Box is geïndexeerd
  const a = g0.attributes.position.array;
  for (let i = 0; i < a.length; i += 9) for (let k = 0; k < 3; k++) { const t = a[i + 3 + k]; a[i + 3 + k] = a[i + 6 + k]; a[i + 6 + k] = t; } // omgekeerde winding
  B.geo(g0, composeMatrix(x, y, z), color);
}
function knipDeurgaten(B, doorName, L, W) {
  const defs = (DEUR_DEFS_REF[doorName] || []).filter((d) => d.soort === 'scharnier' || d.soort === 'achterscharnier');
  const rects = {}, zs = {}, shells = {};
  for (const d of defs) {
    zs[d.id] = d.zij ? d.zij * W : W / 2;
    rects[d.id] = [d.x * L - d.w / 2 + 0.02, d.y0 + 0.02, d.x * L + d.w / 2 - 0.02, d.y0 + d.h - 0.02];
    shells[d.id] = [];
  }
  const knip = (poly, as, c, binnen) => {
    const uit = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], ia = binnen(a[as], c), ib = binnen(b[as], c);
      if (ia) uit.push(a);
      if (ia !== ib) { const t2 = (c - a[as]) / (b[as] - a[as]); uit.push(a.map((v2, k) => v2 + (b[k] - v2) * t2)); }
    }
    return uit;
  };
  // een waaier uit een geknipte veelhoek, zonder platte driehoeken (drie punten op een lijn langs de snede)
  const vlakOpp = (a, b, c) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; return Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]); };
  const fan = (poly) => { const o = []; for (let i = 1; i + 1 < poly.length; i++) if (vlakOpp(poly[0], poly[i], poly[i + 1]) > 1e-8) o.push([poly[0], poly[i], poly[i + 1]]); return o; };
  const kl = (x, c) => x <= c, gr = (x, c) => x >= c;
  for (const gi of [G_BODY, G_GLASS]) {
    const G = B.groups[gi], p = G.p.slice(), c = G.c.slice();
    G.p.length = 0; G.c.length = 0; G.uv.length = 0;
    for (let o = 0; o < p.length; o += 9) {
      const v = [[p[o], p[o + 1], p[o + 2]], [p[o + 3], p[o + 4], p[o + 5]], [p[o + 6], p[o + 7], p[o + 8]]], rgb = [c[o], c[o + 1], c[o + 2]];
      const u = [v[1][0] - v[0][0], v[1][1] - v[0][1], v[1][2] - v[0][2]], w = [v[2][0] - v[0][0], v[2][1] - v[0][1], v[2][2] - v[0][2]];
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], nl = Math.hypot(...n) || 1;
      const cz = (v[0][2] + v[1][2] + v[2][2]) / 3;
      const d = defs.find((q) => {
        const r = rects[q.id];
        // alles in de schil van de flank (het zijvlak met zijn dikte, en sierlijsten en strips die erop liggen): van 7,5 cm binnen tot 6 cm buiten
        return cz * q.side > zs[q.id] - 0.075 && cz * q.side < zs[q.id] + 0.06
          && Math.max(...v.map((x) => x[0])) > r[0] && Math.min(...v.map((x) => x[0])) < r[2] && Math.max(...v.map((x) => x[1])) > r[1] && Math.min(...v.map((x) => x[1])) < r[3];
      });
      const houd = (t) => B._push(gi, t[0], t[1], t[2], rgb, null);
      if (!d) { houd(v); continue; }
      const [x0, y0, x1, y1] = rects[d.id];
      const inn = knip(knip(knip(knip(v, 0, x0, gr), 0, x1, kl), 1, y0, gr), 1, y1, kl);
      if (inn.length < 3) { houd(v); continue; }
      for (const t of fan(inn)) if (vlakOpp(t[0], t[1], t[2]) > 2e-6) shells[d.id].push({ v: t, rgb, gi }); // geen platte reepjes (onder 1 mm2) aan het deurblad
      if (v.every((q) => q[0] >= x0 && q[0] <= x1 && q[1] >= y0 && q[1] <= y1)) continue;
      for (const t of [...fan(knip(v, 0, x0, kl)), ...fan(knip(v, 0, x1, gr))]) houd(t);
      const mid = knip(knip(v, 0, x0, gr), 0, x1, kl);
      for (const t of [...fan(knip(mid, 1, y0, kl)), ...fan(knip(mid, 1, y1, gr))]) houd(t);
    }
  }
  return { defs, rects, zs, shells };
}
// De deurbladen uit het uitgeknipte stuk: per deur een geometrie (buitenkant, binnenkant in bekleding, handvat) en alle samen (dicht).
function deurSchillen(res, L) {
  const panelen = {};
  const alle = new GeoBuilder(3);
  const LINER = linearRGBArr(0x2a2c30), GL = linearRGBArr(GLASS);
  for (const d of res.defs) {
    const tris = res.shells[d.id];
    if (!tris.length) continue;
    const P2 = new GeoBuilder(3);
    for (const Bx of [P2, alle]) {
      for (const t of tris) {
        Bx._push(t.gi, t.v[0], t.v[1], t.v[2], t.rgb, null);
        const inn = t.v.map((q) => [q[0], q[1], q[2] - d.side * 0.035]);
        Bx._push(t.gi, inn[0], inn[2], inn[1], t.gi === G_GLASS ? GL : LINER, null);
      }
      const hx = d.x * L + (d.soort === 'scharnier' ? -1 : 1) * d.w * 0.36, hy = d.y0 + Math.min(d.h - 0.12, 0.62 - 0.12);
      Bx.box(hx, hy, d.side * (res.zs[d.id] + 0.008), 0.13, 0.022, 0.016, CHROME);
    }
    panelen[d.id] = markShared(P2.build());
  }
  return { panelen, dicht: markShared(alle.build()) };
}
const linearRGBArr = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
// Hangt de dichte deuren aan de romp en zet wat de deur-rig en de tests nodig hebben (zoals addRealDoors en de hybride).
function koppelDeurgaten(group, body, geo) {
  const k = geo.userData.knip;
  if (!k) return;
  const dm = new THREE.Mesh(k.dicht, body.material);
  dm.name = 'deurenDicht';
  body.add(dm);
  group.userData.deurenDicht = dm;
  group.userData.deurPanelen = k.panelen;
  group.userData.echtGat = new Set(Object.keys(k.panelen));
  group.userData.gatRects = k.rects;
  group.userData.deurZ = k.zs;
}

// Bakwagen: cab-over front with a box body.
function buildTruckMesh(v) {
  // de tankwagen (model.tank: Us Mem Vet, de stuntavond) heeft een eigen opbouw en cabine, zie buildTankerMesh
  if (v.model.tank) return buildTankerMesh(v);
  const L = v.model.len, W = v.model.wid, hl = L / 2, hw = W / 2;
  const paint = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, 0xe8e6e0);
  const r = 0.52;
  const geo = cached(`truck3|${L}|${W}|${paint}`, () => {
    const B = new GeoBuilder(3);
    const cabL = 2.0, boxX0 = -hl, boxX1 = hl - cabL - 0.1;
    B.box(0, 0.74, 0, L - 0.2, 0.22, W - 0.3, 0x2a2b2d);
    const bx = (boxX0 + boxX1) / 2, bl = boxX1 - boxX0;
    {
      // de laadbak: panelen met verticale ribbels, aluminium randen boven en onder, hoekstijlen, twee achterdeuren met
      // scharnieren en sluitstangen, en een onderrijbeveiliging achter en opzij
      const bc = paint === WRECKED_COLOR ? paint : 0xeeeee8, alu = paint === WRECKED_COLOR ? paint : 0xa7adb3;
      B.box(bx, 2.275, 0, bl, 2.75, W, bc);
      const nRib = Math.max(3, Math.round(bl / 0.62));
      for (const s of [1, -1]) {
        for (let i = 1; i < nRib; i++) B.box(boxX0 + (bl * i) / nRib, 2.275, s * (hw + 0.017), 0.05, 2.6, 0.03, shadeHex(bc, 0.86));
        B.box(bx, 3.6, s * (hw + 0.025), bl + 0.02, 0.1, 0.036, alu);
        B.box(bx, 0.96, s * (hw + 0.025), bl + 0.02, 0.12, 0.036, alu);
        for (const x of [boxX0 + 0.03, boxX1 - 0.03]) B.box(x, 2.275, s * (hw - 0.03), 0.09, 2.78, 0.09, alu);
      }
      B.box(bx, 3.66, 0, bl - 0.1, 0.03, W - 0.1, shadeHex(bc, 0.92));
      const dw = W / 2 - 0.07;
      for (const s of [1, -1]) {
        B.box(-hl - 0.012, 2.25, s * (W / 4 + 0.005), 0.02, 2.5, dw, shadeHex(bc, 0.95));
        for (const y of [1.25, 2.25, 3.25]) B.box(-hl - 0.03, y, s * (hw - 0.07), 0.04, 0.1, 0.07, 0x3a3d40);   // scharnieren
        for (const z of [0.22, 0.72]) {
          B.geo(new THREE.CylinderGeometry(0.018, 0.018, 2.5, 6), composeMatrix(-hl - 0.045, 2.25, s * z), alu); // sluitstang
          B.box(-hl - 0.07, 1.6, s * z + (s > 0 ? -0.08 : 0.08), 0.03, 0.035, 0.18, 0x3a3d40);              // hendel
          for (const y of [1.02, 3.48]) B.box(-hl - 0.045, y, s * z, 0.05, 0.05, 0.06, 0x3a3d40);            // nokken
        }
      }
      B.box(-hl + 0.12, 0.45, 0, 0.12, 0.13, W - 0.2, 0x3a3d40);                                                  // onderrijbeveiliging
      for (const s of [1, -1]) {
        B.box(-hl + 0.33, 0.6, s * 0.6, 0.42, 0.06, 0.06, 0x3a3d40);
        for (let i = 0; i < 3; i++) B.box(-hl + 0.059, 0.45, s * (0.2 + i * 0.35), 0.006, 0.08, 0.16, i % 2 ? 0xf2efe4 : 0xc8102e); // reflectiestrook
        const sx0 = -hl + 1.7 + 0.62, sx1 = hl - 1.25 - 0.62;
        for (const y of [0.52, 0.74]) B.box((sx0 + sx1) / 2, y, s * (hw - 0.06), sx1 - sx0, 0.08, 0.04, 0x3a3d40); // zijbeveiliging
      }
    }
    // cab: solid below the windows, glass all round above them, then the roof
    const cx = hl - cabL / 2;
    B.box(cx, 1.325, 0, cabL, 1.05, W - 0.05, paint);
    B.box(cx, 2.6, 0, cabL, 0.2, W - 0.05, paint);
    B.box(cx - 0.02, 2.175, 0, cabL - 0.1, 0.65, W - 0.12, GLASS, G_GLASS);
    B.box(hl - cabL + 0.04, 2.175, 0, 0.08, 0.65, W - 0.05, paint);
    B.box(hl - cabL / 2 - 0.05, 2.75, 0, cabL - 0.3, 0.1, W - 0.25, shadeHex(paint, 0.85));
    for (const s of [1, -1]) {
      B.box(hl - 0.04, 2.175, s * (hw - 0.06), 0.08, 0.65, 0.08, paint);
      B.box(hl - 1.05, 2.175, s * (hw - 0.05), 0.08, 0.65, 0.06, paint);
      B.box(hl + 0.02, 0.95, s * (hw - 0.3), 0.03, 0.14, 0.32, HEADLAMP, G_LAMP);
      B.box(-hl - 0.01, 0.95, s * (hw - 0.2), 0.02, 0.2, 0.18, TAIL, G_LAMP);
      B.box(hl - 0.1, 2.35, s * (hw + 0.2), 0.06, 0.3, 0.1, TRIM);
      B.box((boxX0 + boxX1) / 2, 2.4, s * (hw + 0.006), (boxX1 - boxX0) * 0.7, 0.55, 0.012, paint);
    }
    B.box(hl + 0.03, 0.64, 0, 0.1, 0.24, W - 0.1, 0x2a2b2d);
    B.box(hl + 0.085, 0.64, 0, 0.012, 0.1, 0.48, PLATE);
    B.box(-hl - 0.012, 0.7, 0, 0.012, 0.1, 0.48, PLATE);
    addDoorCuts(B, 'truck', L, hw, paint, CHROME, true);
    // de cabine van binnen: wanden, vloer, twee stoelen en het dashboard (zichtbaar door de open deur)
    binnenDoos(B, hl - cabL / 2, 1.32, 0, cabL - 0.14, 1.02, W - 0.32, 0x3a3c40);
    B.box(hl - cabL / 2, 0.83, 0, cabL - 0.16, 0.02, W - 0.4, 0x45474c);
    for (const s of [1, -1]) { B.box(hl - 1.05, 1.05, s * 0.5, 0.5, 0.12, 0.5, 0x4d515c); B.box(hl - 1.33, 1.4, s * 0.5, 0.1, 0.6, 0.5, 0x4d515c); }
    B.box(hl - 0.25, 1.62, 0, 0.35, 0.3, W - 0.3, 0x2b2d32);
    const k = knipDeurgaten(B, 'truck', L, W);
    const g = B.build();
    g.userData.knip = { ...deurSchillen(k, L), rects: k.rects, zs: k.zs };
    return g;
  });
  const mats = vehicleMaterials();
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
  koppelDeurgaten(group, body, geo);
  const wgeo = carWheelGeometry(r, 0.3);
  const wheels = [];
  for (const x of [hl - 1.25, -hl + 1.7]) for (const s of [1, -1]) addWheel(group, wgeo, mats[0], x, r, s * (hw - 0.2), wheels);
  group.userData.wheels = wheels;
  group.userData.wheelRadius = r;
  return group;
}

// De tankwagen (vettruck 23-11): een bakwagen-chassis met een levensmiddelentank voor frituurvet, gebouwd als één gecachete romp met
// vertexkleuren zoals de bakwagen. Kantelcabine met wielkast, grille, bumper met lampen, zonneklep en een windscherm op het dak; een
// elliptische rvs-tank met gebolde koppen, spanbanden, loopbrug met dekselputten en neergeklapte leuning, een ladder achter, een
// aftapkraan, slangkokers, een pompkast, de dieseltank, dubbellucht achter en een onderrijbeveiliging. De belettering van Us Mem Vet
// (Jelle's frituurvet, verzonnen merk) ligt als gebogen strook op de tankwand. Alle maten volgen len en wid: dezelfde bouwer dient de
// missiewagen (8,5 m), de winkelversie (7,2 m) en de stuntavond (6,2 m). Kwaliteitsnorm: propregister.js VOERTUIG_REGISTER.tankwagen.
function tankerDims(L, W) {
  const hl = L / 2, hw = W / 2, cabL = 2.0, kop = 0.3;
  // band en strook: hoe ver de spanbanden en de belettering buiten de tankwand liggen (minstens 2 cm uit elkaar: geen z-fighting)
  return { cabL, kop, x0: -hl + 0.1 + kop, x1: hl - cabL - 0.2 - kop, y: 2.08, ry: 0.9, rz: hw - 0.04, band: 0.025, strook: 0.05 };
}

function buildTankerMesh(v) {
  const L = v.model.len, W = v.model.wid, hl = L / 2, hw = W / 2;
  const wrecked = !!v.wrecked;
  const paint = wrecked ? WRECKED_COLOR : toHex(v.model.color, 0x1d4f9c);
  const r = 0.52;
  const fx = hl - 1.25, rx = -hl + 1.7; // voor- en achteras (dezelfde plek als de bakwagen)
  const T = tankerDims(L, W);
  const top = T.y + T.ry;
  const geo = cached(`tankwagen|${L}|${W}|${paint}`, () => {
    const B = new GeoBuilder(3);
    const K = (c) => (wrecked ? WRECKED_COLOR : c); // een wrak is overal zwartgeblakerd
    const STEEL = K(0xc9ced3), STEEL_HI = K(0xe6e6e1), STEEL_LO = K(0x9ba2a8), FRAME = K(0x26282b), DARK = K(0x3a3d40), ALU = K(0xa7adb3);
    const RUBBER = K(0x161718), RAIL = K(0xd9b92e), WIT = K(0xf4f2ec), ROOD = K(0xc8102e);
    const cabL = T.cabL, cx0 = hl - cabL, cx = hl - cabL / 2;
    const ellipse = (len, seg = 22) => new THREE.CylinderGeometry(1, 1, len, seg, 1, true).rotateZ(Math.PI / 2);

    // --- chassis: twee langsliggers met dwarsbalken
    for (const s of [1, -1]) B.box(0.1, 0.8, s * 0.44, L - 0.5, 0.24, 0.1, FRAME);
    for (const x of [hl - 0.6, fx - 0.9, 0.3, rx + 0.9, -hl + 0.5]) B.box(x, 0.8, 0, 0.12, 0.16, 0.8, FRAME);

    // --- de tank: rvs, boven lichter en onder donkerder (geslepen staal leest zo ook zonder omgevingskaart)
    const tl = T.x1 - T.x0, tc = (T.x0 + T.x1) / 2;
    const wand = (x, y) => (y > T.y + T.ry * 0.55 ? STEEL_HI : y < T.y - T.ry * 0.45 ? STEEL_LO : STEEL);
    B.geo(ellipse(tl), composeMatrix(tc, T.y, 0, 0, 0, 0, 1, T.ry, T.rz), wand);
    for (const s of [1, -1]) {
      // gebolde koppen voor en achter
      const kop = new THREE.SphereGeometry(1, 22, 5, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-s * Math.PI / 2);
      B.geo(kop, composeMatrix(s > 0 ? T.x1 : T.x0, T.y, 0, 0, 0, 0, T.kop, T.ry, T.rz), wand);
    }
    const nBand = Math.max(2, Math.round(tl / 1.7));
    for (let i = 0; i <= nBand; i++) B.geo(ellipse(0.07), composeMatrix(T.x0 + (tl * i) / nBand, T.y, 0, 0, 0, 0, 1, T.ry + T.band, T.rz + T.band), STEEL_LO); // spanbanden
    for (const x of [T.x1 - 0.25, tc, T.x0 + 0.35]) B.box(x, 1.02, 0, 0.16, 0.36, W * 0.62, FRAME);   // zadels op het chassis

    // loopbrug met rooster, alu randen, neergeklapte gele leuning en dekselputten
    B.box(tc, top + 0.03, 0, tl * 0.86, 0.04, 0.56, DARK);
    for (let i = 0; i < Math.floor(tl * 0.86 / 0.3); i++) B.box(tc - tl * 0.43 + 0.15 + i * 0.3, top + 0.055, 0, 0.03, 0.012, 0.54, K(0x5a5e62));
    const nPost = Math.max(2, Math.round(tl / 1.4));
    for (const s of [1, -1]) {
      B.box(tc, top + 0.06, s * 0.29, tl * 0.86, 0.03, 0.03, ALU);
      B.box(tc, top + 0.1, s * 0.43, tl * 0.82, 0.035, 0.035, RAIL);
      for (let i = 0; i <= nPost; i++) B.box(tc - tl * 0.41 + (tl * 0.82 * i) / nPost, top + 0.06, s * 0.43, 0.05, 0.09, 0.05, DARK);
    }
    const nPut = L >= 8 ? 3 : 2;
    for (let i = 0; i < nPut; i++) {
      const x = T.x0 + (tl * (i + 0.5)) / nPut;
      B.geo(new THREE.CylinderGeometry(0.27, 0.29, 0.14, 14), composeMatrix(x, top + 0.07, 0), STEEL_HI);      // kraag
      B.geo(new THREE.CylinderGeometry(0.25, 0.26, 0.05, 14), composeMatrix(x, top + 0.165, 0), ALU);          // deksel
      B.geo(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 8).rotateX(Math.PI / 2), composeMatrix(x - 0.27, top + 0.19, 0), DARK); // scharnier
      for (const k of [-1, 1]) B.box(x + 0.2, top + 0.17, k * 0.14, 0.07, 0.05, 0.04, DARK);                  // knevels
      B.geo(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 8), composeMatrix(x + 0.06, top + 0.24, 0.12), ALU); // ontluchting
    }

    // achter: ladder op de bolle kop, aftapkraan met rood handwiel, lichtbalk en onderrijbeveiliging
    const lz = T.rz * 0.42, ly0 = 0.95, ly1 = top + 0.25;
    for (const dz of [-0.17, 0.17]) B.box(-hl + 0.04, (ly0 + ly1) / 2, lz + dz, 0.04, ly1 - ly0, 0.04, ALU);
    for (let y = ly0 + 0.15; y < ly1 - 0.1; y += 0.3) B.box(-hl + 0.04, y, lz, 0.04, 0.03, 0.34, ALU);
    for (const y of [1.55, top - 0.25]) B.box(-hl + 0.1, y, lz, 0.14, 0.04, 0.3, DARK);
    const az = -0.35;
    B.geo(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 10).rotateZ(Math.PI / 2), composeMatrix(-hl + 0.55, 1.02, az), STEEL);
    B.geo(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10), composeMatrix(-hl + 1.02, 1.15, az), STEEL);                // stijgbuis naar de tank
    B.box(-hl + 0.3, 1.02, az, 0.16, 0.2, 0.2, DARK);                                                                   // klephuis
    B.geo(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 6), composeMatrix(-hl + 0.3, 1.18, az), DARK);
    B.geo(new THREE.TorusGeometry(0.1, 0.018, 4, 12).rotateX(Math.PI / 2), composeMatrix(-hl + 0.3, 1.25, az), ROOD);    // handwiel
    B.geo(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 10).rotateZ(Math.PI / 2), composeMatrix(-hl + 0.03, 1.02, az), DARK); // dop
    B.box(-hl + 0.12, 0.5, 0, 0.12, 0.14, W - 0.2, DARK);
    for (let i = 0; i < 6; i++) B.box(-hl + 0.055, 0.5, -hw + 0.3 + (i * (W - 0.6)) / 5, 0.006, 0.09, 0.2, i % 2 ? WIT : ROOD); // reflectiestrook
    for (const s of [1, -1]) B.box(-hl + 0.3, 0.62, s * 0.55, 0.42, 0.06, 0.06, DARK);
    B.box(-hl + 0.12, 0.8, 0, 0.1, 0.16, W - 0.1, FRAME);
    for (const s of [1, -1]) {
      B.box(-hl + 0.065, 0.8, s * (hw - 0.2), 0.02, 0.12, 0.24, TAIL, G_LAMP);
      B.box(-hl + 0.065, 0.8, s * (hw - 0.43), 0.02, 0.12, 0.14, INDICATOR, G_LAMP);
      B.box(-hl + 0.065, 0.8, s * (hw - 0.58), 0.02, 0.12, 0.1, HEADLAMP, G_LAMP);   // achteruitrijlicht
      B.box(T.x0 - T.kop * 0.33, 2.0, s * (T.rz - 0.1), 0.05, 0.1, 0.1, TAIL, G_LAMP); // contourlamp op de rand van de kop
    }
    B.box(-hl + 0.06, 0.8, 0.0, 0.012, 0.11, 0.5, PLATE);

    // dubbellucht achter: spatbord en spatlap
    for (const s of [1, -1]) {
      const z = s * (hw - 0.36);
      B.box(rx, 1.1, z, 1.3, 0.04, 0.72, FRAME);
      B.box(rx - 0.68, 0.64, z, 0.03, 0.6, 0.66, RUBBER);
    }

    // tussen de assen: links de dieseltank en de pompkast, rechts de accubak en twee slangkokers; zijbeveiliging ervoor
    const m0 = rx + 0.75, m1 = fx - 0.75, span = m1 - m0;
    const dl = Math.min(1.1, span * 0.32), dX = m1 - dl / 2;
    B.geo(new THREE.CylinderGeometry(0.25, 0.25, dl, 12).rotateZ(Math.PI / 2), composeMatrix(dX, 0.72, -(hw - 0.42)), ALU);
    B.geo(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8), composeMatrix(dX + dl * 0.3, 0.98, -(hw - 0.42)), DARK); // tankdop
    for (const x of [dX - dl * 0.3, dX + dl * 0.3]) B.box(x, 0.72, -(hw - 0.42), 0.04, 0.54, 0.54, DARK);      // spanbanden
    const p0 = m0 + 0.05, p1 = m1 - dl - 0.1, pc = (p0 + p1) / 2, pl = p1 - p0, pz = -(hw - 0.35);
    if (pl > 0.4) {
      B.box(pc, 0.8, pz, pl, 0.56, 0.5, ALU);                                                                    // pompkast
      const fz = pz - 0.25 - 0.004;
      for (const y of [0.54, 1.06]) B.box(pc, y, fz, pl - 0.04, 0.012, 0.01, DARK);
      for (const x of [p0 + 0.02, pc, p1 - 0.02]) B.box(x, 0.8, fz, 0.012, 0.52, 0.01, DARK);
      for (const x of [pc - 0.1, pc + 0.1]) B.box(x, 0.86, fz - 0.01, 0.04, 0.1, 0.02, CHROME);                 // grepen
    }
    B.box(m1 - 0.35, 0.72, hw - 0.4, 0.5, 0.42, 0.5, FRAME);                                                      // accubak
    B.box(m1 - 0.35, 0.95, hw - 0.4, 0.52, 0.04, 0.52, DARK);
    const h0 = m0 + 0.05, h1 = m1 - 0.7;
    for (const y of [1.06, 1.3]) {
      B.geo(new THREE.CylinderGeometry(0.1, 0.1, h1 - h0, 12).rotateZ(Math.PI / 2), composeMatrix((h0 + h1) / 2, y, hw - 0.24), K(0x30343a)); // slangkoker
      B.geo(new THREE.CylinderGeometry(0.125, 0.125, 0.04, 12).rotateZ(Math.PI / 2), composeMatrix(h0 - 0.01, y, hw - 0.24), ALU);
    }
    const z0 = rx + r + 0.12, z1 = fx - r - 0.14; // zijbeveiliging tussen de wielen
    for (const s of [1, -1]) for (const y of [0.5, 0.72]) B.box((z0 + z1) / 2, y, s * (hw - 0.06), z1 - z0, 0.07, 0.04, DARK);
    for (const s of [1, -1]) for (const x of [z0 + 0.05, z1 - 0.1]) B.box(x, 0.66, s * (hw - 0.2), 0.05, 0.05, 0.3, DARK); // steunen

    // --- cabine: dicht tot de raamlijn met een uitgespaarde wielkast, glas rondom erboven, dan het dak
    const wf0 = fx - 0.62, wf1 = fx + 0.62;
    B.box(cx, 1.47, 0, cabL, 0.76, W - 0.05, paint);
    B.box((wf1 + hl) / 2, 0.86, 0, hl - wf1, 0.46, W - 0.05, paint);
    B.box((cx0 + wf0) / 2, 0.86, 0, wf0 - cx0, 0.46, W - 0.05, paint);
    B.box(fx, 0.97, 0, 1.24, 0.24, W - 0.9, FRAME);                                                              // binnenkant wielkast
    for (const s of [1, -1]) B.geo(new THREE.TorusGeometry(0.62, 0.05, 4, 10, Math.PI), composeMatrix(fx, r, s * (hw - 0.03)), FRAME);
    B.box(cx, 2.72, 0, cabL, 0.24, W - 0.05, paint);
    B.box(cx - 0.02, 2.225, 0, cabL - 0.1, 0.75, W - 0.12, GLASS, G_GLASS);
    B.box(cx0 + 0.04, 2.225, 0, 0.08, 0.75, W - 0.05, paint);
    for (const s of [1, -1]) {
      B.box(hl - 0.05, 2.225, s * (hw - 0.07), 0.1, 0.75, 0.1, paint);           // A-stijl
      B.box(hl - 1.02, 2.225, s * (hw - 0.04), 0.07, 0.75, 0.06, paint);         // B-stijl
      B.box(cx, 1.66, s * (hw - 0.0235), cabL - 0.04, 0.1, 0.003, WIT);          // bies wit en rood onder de ramen
      B.box(cx, 1.58, s * (hw - 0.0235), cabL - 0.04, 0.035, 0.003, ROOD);
      for (const y of [0.46, 0.8]) B.box((cx0 + wf0) / 2 - 0.02, y, s * (hw - 0.1), 0.3, 0.04, 0.24, DARK); // opstap
      B.box(hl - 0.12, 2.36, s * (hw + 0.1), 0.05, 0.04, 0.24, TRIM);            // spiegelarmen
      B.box(hl - 0.12, 1.96, s * (hw + 0.1), 0.05, 0.04, 0.24, TRIM);
      B.box(hl - 0.14, 2.16, s * (hw + 0.23), 0.08, 0.44, 0.15, TRIM);           // spiegel
      B.box(hl - 0.185, 2.16, s * (hw + 0.23), 0.012, 0.38, 0.11, K(0x8fa6b8));
      B.box(hl - 0.14, 1.74, s * (hw + 0.2), 0.08, 0.18, 0.13, TRIM);            // groothoekspiegel
      B.box(hl + 0.0, 1.0, s * (hw - 0.02), 0.05, 0.06, 0.1, INDICATOR, G_LAMP); // zijknipperlicht op de hoek
    }
    B.box(hl + 0.005, 1.87, 0, 0.04, 0.06, W - 0.1, TRIM);
    B.box(hl + 0.005, 2.585, 0, 0.04, 0.05, W - 0.1, TRIM);
    for (const z of [-0.45, 0.4]) B.box(hl + 0.03, 1.99, z, 0.02, 0.03, 0.62, TRIM, 0, 0.35, 0, 0); // ruitenwissers
    B.box(hl + 0.07, 2.64, 0, 0.18, 0.04, W - 0.16, TRIM, 0, 0, 0, -0.18);                           // zonneklep
    for (let i = -2; i <= 2; i++) B.box(hl - 0.02, 2.86, i * 0.25, 0.06, 0.04, 0.1, INDICATOR, G_LAMP); // daklampjes
    // windscherm op het dak, met zijschotten, tot de hoogte van de loopbrug
    const dTop = top + 0.12, dLen = cabL * 0.75, dH = dTop - 2.84, dX0 = cx - 0.15;
    if (dH > 0.05) {
      B.box(dX0, 2.84 + dH / 2, 0, Math.hypot(dLen, dH), 0.05, W - 0.46, paint, 0, 0, 0, -Math.atan2(dH, dLen));
      B.box(dX0 - dLen / 2 + 0.07, 2.84 + (dH - 0.06) / 2, 0, 0.04, dH - 0.06, W - 0.5, shadeHex(paint, 0.8));
      for (const s of [1, -1]) B.triOut([dX0 + dLen / 2, 2.84, s * (hw - 0.2)], [dX0 - dLen / 2, 2.84, s * (hw - 0.2)], [dX0 - dLen / 2, dTop, s * (hw - 0.2)], [0, 0, s], shadeHex(paint, 0.9));
    }
    // de voorkant: grille met lamellen en embleem, bumper met koplampen, mistlampen en richtingaanwijzers
    B.box(hl + 0.012, 1.38, 0, 0.03, 0.5, W * 0.6, FRAME);
    for (let i = 0; i < 4; i++) B.box(hl + 0.03, 1.2 + i * 0.12, 0, 0.02, 0.035, W * 0.58, K(0x8e9399));
    B.box(hl + 0.03, 1.74, 0, 0.02, 0.12, 0.44, WIT);
    B.box(hl + 0.04, 1.74, 0, 0.02, 0.07, 0.36, K(0x1d4f9c));
    B.box(hl + 0.07, 0.64, 0, 0.16, 0.34, W, K(0x2e3134));
    for (const s of [1, -1]) {
      B.box(hl + 0.15, 0.7, s * (hw - 0.33), 0.02, 0.15, 0.36, HEADLAMP, G_LAMP);
      B.box(hl + 0.15, 0.7, s * (hw - 0.09), 0.02, 0.15, 0.08, INDICATOR, G_LAMP);
      B.box(hl + 0.15, 0.53, s * (hw - 0.45), 0.02, 0.08, 0.14, HEADLAMP, G_LAMP);
    }
    B.box(hl + 0.155, 0.55, 0, 0.012, 0.11, 0.5, PLATE);
    // uitlaat achter de cabine, met hitteschild
    B.geo(new THREE.CylinderGeometry(0.075, 0.075, top + 0.25 - 1.0, 10), composeMatrix(cx0 - 0.09, (1.0 + top + 0.25) / 2, hw - 0.3), K(0xb9bcbf));
    B.box(cx0 - 0.09, 1.9, hw - 0.21, 0.18, 0.7, 0.02, DARK);
    // de deurnaden van de cabine (vehicledoors.js DEUR_DEFS.truck), afgekapt boven de wielkast
    const naad = shadeHex(paint, 0.32), kapY = 1.1;
    for (const st of naadStroken('truck', L, hw)) {
      let y = st.y, sy = st.sy;
      if (y - sy / 2 < kapY) {
        if (sy < 0.05) y = kapY + 0.01;
        else { const y1 = y + sy / 2; y = (kapY + y1) / 2; sy = y1 - kapY; }
      }
      B.box(st.x, y, st.z, st.sx, sy, st.sz, st.soort === 'handvat' ? CHROME : naad);
    }
    return B.build();
  });
  const mats = vehicleMaterials(wrecked);
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
  // de wielen krijgen een eigen materiaal: ze staan in LOD-niveau 0 en 1, de romp alleen in 0
  const wheelMat = vehicleMaterials(wrecked)[0];
  const wgeo = carWheelGeometry(r, 0.3);
  const wheels = [];
  for (const x of [fx, rx]) for (const s of [1, -1]) addWheel(group, wgeo, wheelMat, x, r, s * (hw - 0.2), wheels);
  // dubbellucht: de binnenste band draait mee als kind van de buitenste
  for (const w of wheels) if (w.position.x < 0) {
    const twin = new THREE.Mesh(wgeo, wheelMat);
    twin.position.z = -Math.sign(w.position.z) * 0.36;
    w.add(twin);
  }
  group.userData.wheels = wheels;
  group.userData.wheelRadius = r;
  // de aftapkraan achter: daar lekt het vet uit (trailer.js, fattrail3d.js)
  group.userData.aftap = { x: -hl + 0.03, y: 1.02, z: -0.35 };
  const lod0 = [...mats, wheelMat], lod1 = [wheelMat];
  if (v.model.livery === 'usmemvet' && !wrecked) {
    // de belettering als gebogen strook op beide flanken, op de romp zodat hij meeveert en meehelt
    const mat = new THREE.MeshLambertMaterial({ map: usMemVetTexture(), transparent: true, alphaTest: 0.1 });
    for (const s of [1, -1]) {
      const strip = new THREE.Mesh(usMemVetStrip(T, s), mat);
      strip.userData.noBatch = true;
      body.add(strip);
    }
    lod0.push(mat); lod1.push(mat);
  }
  // LOD (eis eigenaar 23-11, opgave in propregister.js VOERTUIG_REGISTER.tankwagen.lod): niveau 1 en 2 hangen onder de romp,
  // zodat ze meeveren; DitherLOD zet per niveau de materialen aan en dithert de overgang
  const m1 = vehicleMaterials(wrecked), m2 = vehicleMaterials(wrecked);
  for (const [n, mm] of [[1, m1], [2, m2]]) {
    const lm = new THREE.Mesh(tankerLodGeometry(L, W, paint, n), mm);
    lm.userData.lodNiveau = n;
    body.add(lm);
  }
  const lod = new DitherLOD(VOERTUIG_REGISTER.tankwagen.lod, [lod0, [...m1, ...lod1], m2]);
  lod.name = 'lod';
  body.add(lod);
  group.userData.lod = lod;
  return group;
}

// De lichtere niveaus van de tankwagen: 1 (tot de tweede grens: tank, cabine, lampen en belettering, geen kleine onderdelen)
// en 2 (silhouet: tank, cabine, ruiten, lampen en vier wielblokken; de echte wielen staan dan uit). Zelfde maten als niveau 0.
function tankerLodGeometry(L, W, paint, n) {
  return cached(`tankwagen-lod${n}|${L}|${W}|${paint}`, () => {
    const hl = L / 2, hw = W / 2, wrecked = paint === WRECKED_COLOR;
    const K = (c) => (wrecked ? WRECKED_COLOR : c);
    const T = tankerDims(L, W), top = T.y + T.ry, tl = T.x1 - T.x0, tc = (T.x0 + T.x1) / 2;
    const fx = hl - 1.25, rx = -hl + 1.7, cx = hl - T.cabL / 2, cx0 = hl - T.cabL;
    const STEEL = K(0xc9ced3), FRAME = K(0x26282b), DARK = K(0x3a3d40);
    const B = new GeoBuilder(3);
    const seg = n === 1 ? 12 : 8;
    B.box(0.1, 0.8, 0, L - 0.5, 0.24, 0.98, FRAME);
    // een plat vlak boven (rotateY halve sector): bij acht zijden anders een nok als een tentdak
    B.geo(new THREE.CylinderGeometry(1, 1, tl, seg, 1, n === 2).rotateY(Math.PI / seg).rotateZ(Math.PI / 2), composeMatrix(tc, T.y, 0, 0, 0, 0, 1, T.ry, T.rz), STEEL);
    if (n === 1) {
      for (const s of [1, -1]) B.geo(new THREE.SphereGeometry(1, seg, 3, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-s * Math.PI / 2), composeMatrix(s > 0 ? T.x1 : T.x0, T.y, 0, 0, 0, 0, T.kop, T.ry, T.rz), STEEL);
      for (const x of [T.x0, T.x1]) B.geo(new THREE.CylinderGeometry(1, 1, 0.07, seg, 1, true).rotateZ(Math.PI / 2), composeMatrix(x, T.y, 0, 0, 0, 0, 1, T.ry + T.band, T.rz + T.band), K(0x9ba2a8));
      B.box(tc, top + 0.03, 0, tl * 0.86, 0.04, 0.56, DARK);
      for (const s of [1, -1]) B.box(tc, top + 0.1, s * 0.43, tl * 0.82, 0.035, 0.035, K(0xd9b92e));
      B.box(-hl + 0.12, 0.8, 0, 0.1, 0.16, W - 0.1, FRAME);
      B.box(-hl + 0.12, 0.5, 0, 0.12, 0.14, W - 0.2, DARK);
      for (const s of [1, -1]) {
        B.box(rx, 1.1, s * (hw - 0.36), 1.3, 0.04, 0.72, FRAME);
        B.box(-hl + 0.04, (0.95 + top + 0.25) / 2, T.rz * 0.42 + s * 0.17, 0.04, top + 0.25 - 0.95, 0.04, K(0xa7adb3));
        B.box((rx + fx) / 2, 0.61, s * (hw - 0.06), fx - rx - 1.3, 0.28, 0.04, DARK);
      }
    } else {
      for (const s of [1, -1]) for (const x of [fx, rx]) B.box(x, 0.52, s * (hw - (x < 0 ? 0.38 : 0.2)), 1.0, 1.0, x < 0 ? 0.7 : 0.3, TIRE);
    }
    // cabine (beide niveaus): dicht, ruiten, dak, bumper, grille en lampen
    B.box(cx, 1.3, 0, T.cabL, 1.1, W - 0.05, paint);
    B.box(cx - 0.02, 2.225, 0, T.cabL - 0.1, 0.75, W - 0.12, GLASS, G_GLASS);
    B.box(cx, 2.72, 0, T.cabL, 0.24, W - 0.05, paint);
    B.box(hl + 0.07, 0.64, 0, 0.16, 0.34, W, K(0x2e3134));
    B.box(hl + 0.012, 1.38, 0, 0.03, 0.5, W * 0.6, FRAME);
    for (const s of [1, -1]) {
      B.box(hl + 0.15, 0.7, s * (hw - 0.33), 0.02, 0.15, 0.36, HEADLAMP, G_LAMP);
      B.box(-hl + 0.065, 0.8, s * (hw - 0.2), 0.02, 0.12, 0.24, TAIL, G_LAMP);
      B.box(hl - 0.14, 2.16, s * (hw + 0.23), 0.08, 0.44, 0.15, TRIM); // spiegels: ook op afstand de breedte van de cabine
      if (n === 1) B.box(cx, 1.66, s * (hw - 0.0235), T.cabL - 0.04, 0.1, 0.003, K(0xf4f2ec));
    }
    if (n === 1) {
      const dTop = top + 0.12, dLen = T.cabL * 0.75, dH = dTop - 2.84;
      if (dH > 0.05) B.box(cx - 0.15, 2.84 + dH / 2, 0, Math.hypot(dLen, dH), 0.05, W - 0.46, paint, 0, 0, 0, -Math.atan2(dH, dLen));
      B.geo(new THREE.CylinderGeometry(0.075, 0.075, top + 0.25 - 1.0, 6), composeMatrix(cx0 - 0.09, (1.0 + top + 0.25) / 2, hw - 0.3), K(0xb9bcbf));
    }
    return B.build();
  });
}

// De belettering volgt de tankwand: een raster over de ellips (hoek th0..th1 rond de flank) en 86 % van de tanklengte, iets
// buiten de spanbanden. u loopt voor de kijker van links naar rechts (op de linkerflank dus van voor naar achter).
function usMemVetStrip(T, s) {
  return cached(`usmemvet-strip|${T.x0}|${T.x1}|${T.rz}|${s}`, () => {
    const nx = 14, ny = 6, th0 = -0.42, th1 = 0.5, ry = T.ry + T.strook, rz = T.rz + T.strook;
    const len = (T.x1 - T.x0) * 0.86, xc = (T.x0 + T.x1) / 2;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) {
      const th = th0 + ((th1 - th0) * j) / ny;
      pos.push(xc - (s * len) / 2 + (s * len * i) / nx, T.y + ry * Math.sin(th), s * rz * Math.cos(th));
      uv.push(i / nx, j / ny);
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const a = i * (ny + 1) + j, b = (i + 1) * (ny + 1) + j;
      idx.push(a, b, b + 1, a, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
}

// "Us Mem Vet": Jelle's frituurvet (verzonnen merk). Een blauw veld in de kleur van de Friese vlag met de koe Us Mem (het beeld in
// Ljouwert) in een witte cirkel, de woordnaam, rode pompeblêden en de regel die op een levensmiddelentank hoort.
let usMemVetTex = null;
function usMemVetTexture() {
  if (usMemVetTex) return usMemVetTex;
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 192;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 1024, 192);
  const rond = (x, y, w, h, rr) => { g.beginPath(); g.moveTo(x + rr, y); g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr); g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr); g.closePath(); };
  g.fillStyle = '#1d4f9c';
  rond(0, 10, 1024, 172, 26); g.fill();
  g.strokeStyle = '#f4f2ec'; g.lineWidth = 4;
  rond(10, 20, 1004, 152, 20); g.stroke();
  // het embleem: de koe in profiel in een witte cirkel
  g.fillStyle = '#f4f2ec';
  g.beginPath(); g.arc(104, 96, 66, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1c1d20';
  g.beginPath(); g.ellipse(96, 100, 38, 22, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(138, 84, 14, 11, -0.4, 0, Math.PI * 2); g.fill();
  for (const x of [70, 84, 104, 118]) g.fillRect(x, 112, 7, 30);
  g.fillStyle = '#f4f2ec';
  g.beginPath(); g.ellipse(84, 94, 13, 9, 0.3, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(110, 106, 10, 7, -0.2, 0, Math.PI * 2); g.fill();
  // de woordnaam en de regels eronder
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#f4f2ec';
  g.font = 'bold 92px "Arial Black", Arial, sans-serif';
  g.fillText('Us Mem Vet', 196, 110, 600);
  g.font = 'italic bold 32px Georgia, serif';
  g.fillText('Frituurvet. Foar mem.', 200, 152, 420);
  g.textAlign = 'right';
  g.font = 'bold 22px Arial, sans-serif';
  g.fillText('UITSLUITEND LEVENSMIDDELEN', 996, 152, 360);
  // drie rode pompeblêden rechtsboven
  g.fillStyle = '#d42a24';
  const blad = (x, y, k) => {
    g.beginPath();
    g.moveTo(x, y + 14 * k);
    g.bezierCurveTo(x - 20 * k, y, x - 12 * k, y - 18 * k, x, y - 7 * k);
    g.bezierCurveTo(x + 12 * k, y - 18 * k, x + 20 * k, y, x, y + 14 * k);
    g.fill();
  };
  for (const x of [880, 930, 980]) blad(x, 66, 1.2);
  usMemVetTex = new THREE.CanvasTexture(c);
  usMemVetTex.colorSpace = THREE.SRGBColorSpace;
  usMemVetTex.anisotropy = 4;
  return usMemVetTex;
}

// Banden met profiel (de trekker-limo): een band met verspringende noppen links en rechts, een velg en
// de vijf spaken van de gewone auto-wielen, zodat het draaien leesbaar blijft. `wall` geeft een crème
// witte flank en een chromen wieldop (de limo-banden). Eén gedeelde geometrie per maat.
function treadWheelGeometry(r, w, lugs, wall = false) {
  return cached(`tread|${r}|${w}|${lugs}|${wall}`, () => {
    const B = new GeoBuilder(1);
    const axleZ = (geo) => geo.rotateX(Math.PI / 2);
    B.geo(axleZ(new THREE.CylinderGeometry(r, r, w, 14, 1)), null, TIRE);
    if (wall) {
      B.geo(axleZ(new THREE.CylinderGeometry(r * 0.86, r * 0.86, w + 0.008, 14, 1)), null, 0xe6e1d2);
      B.geo(axleZ(new THREE.CylinderGeometry(r * 0.7, r * 0.7, w + 0.016, 14, 1)), null, TIRE);
    }
    B.geo(axleZ(new THREE.CylinderGeometry(r * 0.6, r * 0.6, w + 0.024, 10, 1)), null, wall ? CHROME : RIM);
    B.geo(axleZ(new THREE.CylinderGeometry(r * 0.17, r * 0.17, w + 0.05, 6, 1)), null, wall ? 0xd9a521 : 0x6a6d70);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      B.box(Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32, 0, r * 0.4, r * 0.12, w + 0.04, wall ? 0x8f9296 : 0x5c5f62, 0, 0, 0, a);
    }
    B.box(r * 0.78, 0, 0, r * 0.2, r * 0.2, w + 0.02, 0x3a3c3e);
    for (let k = 0; k < lugs; k++) {
      for (const s of [1, -1]) {
        const a = ((k + (s > 0 ? 0 : 0.5)) / lugs) * Math.PI * 2;
        const tr = r + r * 0.03;
        B.box(Math.cos(a) * tr, Math.sin(a) * tr, s * w * 0.24, r * 0.1, (Math.PI * 2 * r / lugs) * 0.5, w * 0.46, 0x101011, 0, 0, 0, a);
      }
    }
    return B.build();
  });
}

// Jelle Terpstra's trekker-limousine: voorop een echte trekker (kap met chromen grille en ronde koplampen,
// cabine, grote noppenbanden, uitlaatpijp, twee vlaggetjes), erachter een lange zwarte limousine met drie
// ramen per kant, witte flanken, een rode loper over de kofferbak en achterin een conferentie-opstelling
// (twee crème banken tegenover elkaar, een barkastje met gouden glazen en een koeler). De deuren zitten in
// vehicledoors.js (DEUR_DEFS.trekkerlimo): twee cabinedeuren en twee achterdeuren, met naden in de romp.
// Maten: de trekker is 2,2 m van de neus, de rest is limousine (3,4 m bij len 5,6 / wid 2,0, zoals alle modelverwijzingen).
export const LIMO_TRACTOR_L = 2.2;
const LIMO_BELT = 0.98, LIMO_ROOF = 1.47, LIMO_CAB_W = 0.43, LIMO_BODY_W = 0.425;
export function trekkerLimoMaten(L, W) {
  const hl = L / 2, tx0 = hl - LIMO_TRACTOR_L;
  return { hl, tx0, cabX0: tx0, cabX1: tx0 + 1.1, cabHw: W * LIMO_CAB_W, limoHw: W * LIMO_BODY_W, bigX: tx0 + 0.55, smallX: hl - 0.5, limoAxles: [-hl + 0.75, -hl + 2.0] };
}
function buildTrekkerLimoMesh(v) {
  const L = v.model.len, W = v.model.wid, hw = W / 2;
  const wrecked = v.wrecked;
  const paint = wrecked ? WRECKED_COLOR : toHex(v.model.color, 0x141414);
  const green = wrecked ? WRECKED_COLOR : 0x1e6b3a;
  const gold = wrecked ? WRECKED_COLOR : 0xd8a521;
  const M = trekkerLimoMaten(L, W);
  const { hl, tx0, cabX0, cabX1, cabHw: cw, limoHw: lw } = M;
  const geo = cached(`trekkerlimo4|${L}|${W}|${paint}|${wrecked}`, () => {
    const B = new GeoBuilder(3);
    const belt = LIMO_BELT, roof = LIMO_ROOF, sill = 0.3, R = 0.43;
    const greenDark = shadeHex(green, 0.72);
    const cabCx = (cabX0 + cabX1) / 2;

    // --- de limousine: twee zijpanelen met wielkasten, vloer, achterwand, dak en ramen
    const arches = M.limoAxles.map((x) => ({ x, r: R, cy: 0.34 }));
    const xF = tx0 + 0.05;
    const top = [[xF, belt], [-hl + 0.12, belt + 0.03], [-hl, belt - 0.06]];
    const outline = [...top, [-hl, sill + 0.08], ...archedSill(-hl, xF, sill, arches), [xF, sill + 0.08]];
    for (const s of [1, -1]) B.geo(extrudeProfile(outline, 0.06, 0.02).translate(0, 0, s * (lw - 0.03)), null, paint);
    for (const { x, r, cy } of arches) {
      for (const s of [1, -1]) {
        const g = new THREE.CylinderGeometry(r - 0.03, r - 0.03, 0.5, 8, 1, true, Math.PI / 2, Math.PI);
        g.rotateX(Math.PI / 2); g.scale(1, 1, -1);
        B.geo(g, composeMatrix(x, cy, s * (lw - 0.28)), 0x151516);
      }
    }
    const lx0 = -hl, lx1 = xF, lcx = (lx0 + lx1) / 2, ll = lx1 - lx0;
    B.box(lcx + 0.02, 0.34, 0, ll - 0.1, 0.06, lw * 2 - 0.1, 0x1a1a1b);           // vloer
    B.box(lcx + 0.05, 0.392, 0, ll - 0.2, 0.03, lw * 2 - 0.14, 0x8d1c24);         // rode vloerbedekking
    B.box(-hl + 0.03, (sill + 0.08 + belt - 0.06) / 2 + 0.02, 0, 0.06, belt - sill - 0.12, lw * 2, paint); // achterwand
    // het glazen bovenhuis als één extrusie (zoals bij de personenauto's): voorkant tegen de cabine, schuine achterruit
    // naar de C-stijl; het dak erop met afgeronde randen (bevel) en een glazen schuifdakstrook
    const cP = -hl + 1.05, rW = -hl + 0.62;
    const gh = [[xF - 0.03, belt - 0.02], [xF - 0.07, roof - 0.07], [cP, roof - 0.07], [rW, belt - 0.02]];
    B.geo(withoutBeltPlate(extrudeProfile(gh, lw * 2 * 0.95, 0.03), belt - 0.02, rW, xF), null, GLASS, G_GLASS);
    const roofPts = [[xF - 0.01, roof - 0.09], [xF - 0.1, roof], [cP + 0.04, roof], [cP - 0.1, roof - 0.09]];
    B.geo(extrudeProfile(roofPts, lw * 2 * 0.985, 0.04), null, paint);
    B.box(-0.55, roof + 0.006, 0, 1.4, 0.014, 0.5, GLASS, G_GLASS);              // schuifdak
    for (const z of [-0.27, 0.27]) B.box(-0.55, roof + 0.012, z, 1.46, 0.018, 0.035, CHROME);
    for (const x of [-1.27, 0.17]) B.box(x, roof + 0.012, 0, 0.035, 0.018, 0.5, CHROME);
    const pz = lw * 0.965;
    for (const s of [1, -1]) {
      sideStrip(B, rW + 0.12, belt - 0.01, cP + 0.06, roof - 0.09, s * pz, 0.14, 0.05, paint);        // brede C-stijl
      for (const px of [-1.03, -0.05]) sideStrip(B, px, belt, px - 0.02, roof - 0.06, s * pz, 0.07, 0.05, paint); // B-stijlen bij de deur
      sideStrip(B, xF - 0.04, belt, xF - 0.07, roof - 0.06, s * pz, 0.08, 0.05, paint);               // stijl tegen de cabine
      sideStrip(B, rW + 0.05, belt + 0.004, xF - 0.04, belt + 0.004, s * (pz + 0.02), 0.025, 0.03, CHROME); // chromen raamlijst
      B.box((lx0 + lx1) / 2, 0.62, s * (lw + 0.006), ll - 0.5, 0.035, 0.012, CHROME);          // chromen sierlijn
      // treeplank onder de achterdeur met een stukje rode loper: hier stap je in
      B.box(-0.55, 0.3, s * (lw + 0.07), 1.04, 0.04, 0.14, CHROME);
      B.box(-0.55, 0.325, s * (lw + 0.07), 0.96, 0.012, 0.12, 0xb01c24);
    }
    // kofferdeksel in lak met een chromen strip langs de achterrand
    B.box((-hl + rW) / 2, belt + 0.012, 0, rW + hl, 0.04, lw * 2 - 0.04, paint);
    B.box(-hl + 0.04, belt + 0.04, 0, 0.03, 0.02, lw * 2 - 0.14, CHROME);
    B.box(-hl - 0.012, belt - 0.1, 0, 0.012, 0.03, lw * 2 - 0.24, CHROME);
    // de glazen overgang van de cabine naar het dak van de limousine: een schuine nek in lak met een ruit erin
    const nek = [[tx0 + 0.03, roof - 0.09], [tx0 + 0.03, 2.3], [tx0 - 0.1, 2.3], [tx0 - 0.78, roof - 0.01], [tx0 - 0.78, roof - 0.09]];
    B.geo(extrudeProfile(nek, cw * 2 - 0.12, 0.03), null, paint);
    {
      const ax = tx0 - 0.66, ay = roof + 0.07, bx = tx0 - 0.17, by = 2.2, d = Math.hypot(bx - ax, by - ay);
      const nx = -(by - ay) / d * 0.012, ny = (bx - ax) / d * 0.012;
      sideStrip(B, ax + nx, ay + ny, bx + nx, by + ny, 0, 0.012, cw * 2 - 0.4, GLASS, G_GLASS);
    }
    const CREAM = 0xd8c9a6, WOOD = 0x5a3a24;
    const rowA = xF - 0.37, backA = xF - 0.1, rowB = -hl + 0.98, backB = -hl + 0.72, tab = (rowA + rowB) / 2;
    B.box(xF - 0.02, 0.8, 0, 0.04, 0.9, lw * 2 - 0.02, 0x2a2a2c);
    // interieur: achterbank (kijkt naar voren, rug tegen de kofferruimte), voorbank (kijkt naar achteren, rug
    // tegen de cabine), barkastje ertussen; alles in crème leer, goud en rood
    for (const [cx, rug] of [[rowA, backA], [rowB, backB]]) {
      B.box(cx, 0.4, 0, 0.5, 0.16, lw * 2 - 0.16, CREAM);
      B.box(rug, 0.74, 0, 0.1, 0.56, lw * 2 - 0.16, CREAM);
      for (const s of [1, -1]) B.box(cx + (rug > cx ? 0.05 : -0.05), 0.56, s * (lw - 0.13), 0.52, 0.16, 0.08, shadeHex(CREAM, 0.85)); // armsteun
    }
    B.box(tab, 0.62, 0, 0.42, 0.5, 0.52, WOOD);
    B.box(tab, 0.89, 0, 0.46, 0.03, 0.56, CHROME);
    for (const z of [-0.14, 0.04]) { // twee champagneglazen, zonder merk
      B.geo(new THREE.CylinderGeometry(0.03, 0.02, 0.1, 6), composeMatrix(tab - 0.06, 1.0, z), 0xefd98f);
      B.geo(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 4), composeMatrix(tab - 0.06, 0.94, z), 0xefd98f);
    }
    B.geo(new THREE.CylinderGeometry(0.075, 0.06, 0.16, 8), composeMatrix(tab + 0.08, 0.98, 0.14), CHROME);   // ijsemmer
    B.geo(new THREE.CylinderGeometry(0.026, 0.03, 0.2, 6), composeMatrix(tab + 0.08, 1.14, 0.14), 0x1f4a2a);   // fles
    B.geo(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 6), composeMatrix(tab + 0.08, 1.26, 0.14), gold);      // folie
    // achterkant: chromen bumper, dubbele uitlaat, achterlichten, een geel kenteken met een blauwe band en streepjes in
    // plaats van tekens (geen echt kenteken)
    B.box(-hl - 0.03, 0.4, 0, 0.1, 0.14, lw * 2 + 0.08, CHROME);
    for (const s of [1, -1]) {
      B.geo(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 6).rotateZ(Math.PI / 2), composeMatrix(-hl - 0.1, 0.3, s * 0.36), CHROME);
      B.box(-hl - 0.008, 0.8, s * (lw - 0.22), 0.03, 0.1, 0.36, TAIL, G_LAMP);
      B.box(-hl - 0.012, 0.8, s * (lw - 0.04), 0.02, 0.08, 0.06, INDICATOR, G_LAMP);
    }
    B.box(-hl - 0.014, 0.6, 0, 0.012, 0.11, 0.52, PLATE);
    B.box(-hl - 0.022, 0.6, -0.235, 0.006, 0.1, 0.045, 0x1f3f8f);
    for (let i = 0; i < 6; i++) B.box(-hl - 0.022, 0.6, -0.17 + i * 0.07, 0.006, 0.06, 0.035, 0x1b1b1c);

    // --- de trekker: chassis, kap, grille, koplampen, spatborden, cabine, uitlaat, vlaggetjes
    B.box((tx0 + hl) / 2, 0.55, 0, hl - tx0 - 0.1, 0.16, 0.8, 0x1a1a1b);
    B.box(cabCx, 0.7, 0, cabX1 - cabX0 - 0.1, 0.5, 0.9, 0x1a1a1b);
    B.geo(extrudeProfile([[hl, 0.8], [hl - 0.03, 1.36], [hl - 0.22, 1.5], [hl - 1.1, 1.55], [hl - 1.1, 0.8]], 1.0, 0.03), null, green);
    B.box(hl + 0.014, 1.1, 0, 0.02, 0.66, 0.84, CHROME);
    for (let i = 0; i < 7; i++) B.box(hl + 0.026, 1.1, -0.33 + i * 0.11, 0.02, 0.56, 0.04, 0x2a2b2d);
    B.box(hl + 0.03, 1.5, 0, 0.05, 0.07, 0.07, gold);
    for (const s of [1, -1]) {
      B.geo(new THREE.CylinderGeometry(0.115, 0.115, 0.06, 12).rotateZ(Math.PI / 2), composeMatrix(hl + 0.01, 1.3, s * 0.4), CHROME);
      B.geo(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 12).rotateZ(Math.PI / 2), composeMatrix(hl + 0.02, 1.3, s * 0.4), HEADLAMP, G_LAMP);
      B.box(hl - 0.6, 1.2, s * 0.505, 0.9, 0.035, 0.012, gold);                                  // gouden sierstreep op de kap
      B.box(M.smallX, 0.98, s * (hw - 0.26), 0.95, 0.06, 0.4, greenDark);                         // spatbord voor
      B.box(M.smallX + 0.5, 0.82, s * (hw - 0.26), 0.06, 0.34, 0.4, greenDark);
      B.box(M.bigX, 1.63, s * (hw - 0.22), 1.6, 0.06, 0.62, greenDark);                           // spatbord achter
      B.box(M.bigX + 0.83, 1.36, s * (hw - 0.22), 0.06, 0.55, 0.62, greenDark);
      B.box(M.bigX - 0.83, 1.36, s * (hw - 0.22), 0.06, 0.55, 0.62, greenDark);
      B.box(cabX1 - 0.15, 0.95, s * (cw + 0.02), 0.5, 0.06, 0.2, 0x2a2a2a);                        // opstap
      // vlaggetjes: paal op de kap met een kleine driekleur
      B.box(hl - 0.28, 1.85, s * 0.42, 0.025, 0.62, 0.025, CHROME);
      B.box(hl - 0.5, 2.1, s * 0.42, 0.42, 0.07, 0.012, 0xc8102e);
      B.box(hl - 0.5, 2.03, s * 0.42, 0.42, 0.07, 0.012, 0xf0f0ee);
      B.box(hl - 0.5, 1.96, s * 0.42, 0.42, 0.07, 0.012, 0x21468b);
      // spiegels op de cabinehoek
      B.box(cabX1 + 0.02, 1.95, s * (cw + 0.12), 0.03, 0.28, 0.03, 0x2a2a2a);
      B.box(cabX1 + 0.02, 2.1, s * (cw + 0.2), 0.04, 0.2, 0.12, 0x2a2a2a);
    }
    B.geo(new THREE.CylinderGeometry(0.045, 0.045, 1.0, 6), composeMatrix(hl - 0.95, 2.05, 0.28), CHROME);
    B.geo(new THREE.CylinderGeometry(0.06, 0.045, 0.05, 6), composeMatrix(hl - 0.95, 2.58, 0.28), 0x2a2a2a);
    // cabine: dichte onderkant tot de raamlijn, glas rondom, dak met rand en een amberlamp
    const cbelt = 1.5, croof = 2.38, cgy = (cbelt + croof) / 2, cgh = croof - cbelt;
    B.box(cabCx, (1.0 + cbelt) / 2, 0, cabX1 - cabX0, cbelt - 1.0, cw * 2, green);
    B.box(cabCx, croof + 0.06, 0, cabX1 - cabX0 + 0.1, 0.12, cw * 2 + 0.06, greenDark);
    B.box(cabX1 + 0.1, croof + 0.02, 0, 0.18, 0.04, cw * 2, shadeHex(green, 0.6));
    B.box(cabCx, croof + 0.15, 0, 0.16, 0.1, 0.16, 0xe88a1a, G_LAMP);
    B.box(cabX1 - 0.03, cgy, 0, 0.02, cgh, cw * 2 - 0.1, GLASS, G_GLASS);
    B.box(cabX0 + 0.045, cgy, 0, 0.02, cgh, cw * 2 - 0.1, GLASS, G_GLASS);
    for (const s of [1, -1]) {
      for (const px of [cabX0 + 0.03, cabX1 - 0.03]) B.box(px, cgy, s * cw, 0.06, cgh, 0.06, green);
      B.box(cabCx, cgy, s * (cw - 0.01), cabX1 - cabX0 - 0.1, cgh, 0.02, GLASS, G_GLASS);
    }
    addDoorCuts(B, 'trekkerlimo', L, hw, paint, CHROME, true);
    // de trekkercabine van binnen (de limousine heeft al banken en een barkastje)
    binnenDoos(B, cabCx, 1.25, 0, cabX1 - cabX0 - 0.12, 0.5, cw * 2 - 0.2, 0x2f4a36);
    B.box(cabCx - 0.05, 1.42, -0.1, 0.42, 0.1, 0.42, 0x2b2d32);
    const k = knipDeurgaten(B, 'trekkerlimo', L, W);
    const g = B.build();
    g.userData.knip = { ...deurSchillen(k, L), rects: k.rects, zs: k.zs };
    return g;
  });
  const mats = vehicleMaterials(wrecked);
  // hoogglans: een blanke laklaag over de lak (alleen dit ene voertuig, dus de duurdere shader kost weinig)
  if (!wrecked) mats[0] = new THREE.MeshPhysicalMaterial({ vertexColors: true, flatShading: true, roughness: 0.32, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 });
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
  koppelDeurgaten(group, body, geo);
  const wheels = [], front = [];
  const small = treadWheelGeometry(0.42, 0.3, 14), big = treadWheelGeometry(0.78, 0.5, 18), limo = treadWheelGeometry(0.34, 0.26, 0, true);
  const k = (r) => 0.42 / r; // dezelfde grondsnelheid: een groter wiel draait trager
  for (const s of [1, -1]) {
    front.push(addWheel(group, small, mats[0], M.smallX, 0.42, s * (hw - 0.25), wheels));
    const b = addWheel(group, big, mats[0], M.bigX, 0.78, s * (hw - 0.22), wheels); b.userData.spinK = k(0.78);
    for (const x of M.limoAxles) { const l = addWheel(group, limo, mats[0], x, 0.34, s * (M.limoHw - 0.1), wheels); l.userData.spinK = k(0.34); }
  }
  group.userData.wheels = wheels;
  group.userData.frontWheels = front;
  group.userData.wheelRadius = 0.42;
  return group;
}

// An Ommeland farm tractor (~100 hp): long hood, the glass cab over the
// rear axle, 1.75 m rear wheels, a 2.45 m wheelbase and a three-point hitch.
// Built for TRACTOR_MODEL's 4.3 x 2.3; seating3d.js tractorCab() places the driver.
export function tractorCab(L) {
  const hl = L / 2;
  const rearX = hl - 0.75 - TRACTOR_WB;
  return { x0: rearX - 0.62, x1: rearX + 0.78, floor: 1.0, belt: 1.8, roof: 2.72, rearX, frontX: hl - 0.75 };
}
const TRACTOR_WB = 2.45, TRACTOR_RR = 0.88, TRACTOR_FR = 0.58;
// M09 Heel aankomen (AAA-upgradeplan): de kratten staan op een plank aan de hef, drie naast elkaar en twee hoog (de zes kratten van
// Geesje). Zonder nieuw asset: dozen in de eigen geometrie van de trekker. `x` is het midden van de plank achter de trekker.
function addEggCrates(B, x, n) {
  const KRAT = 0x9a7a4a, LAT = 0x6f4d2a, EI = 0xf0e6c8;
  B.box(x, 0.86, 0, 0.62, 0.06, 1.3, LAT); // de plank op de hef
  for (let i = 0; i < n; i++) {
    const laag = (i / 3) | 0, kolom = i % 3;
    const z = (kolom - 1) * 0.4, y = 0.92 + laag * 0.3 + 0.13;
    B.box(x, y, z, 0.5, 0.26, 0.38, KRAT);
    B.box(x, y + 0.14, z, 0.42, 0.02, 0.3, EI); // de eieren bovenin, licht
    B.box(x - 0.26, y, z, 0.02, 0.2, 0.3, LAT); // de lat langs de achterkant
  }
}
function buildTractorMesh(v) {
  const L = v.model.len, W = v.model.wid, hl = L / 2, hw = W / 2;
  const paint = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, 0x3f7d3a);
  const C = tractorCab(L);
  const kratten = v.model.kratten ? Math.min(6, v.model.kratten | 0) : 0; // M09 (AAA): Geesjes eierkratten achterop, zichtbaar op de hef
  const geo = cached(`tractor2|${L}|${W}|${paint}|${kratten}`, () => {
    const B = new GeoBuilder(3);
    const cz = W * 0.43, cl = C.x1 - C.x0, cx = (C.x0 + C.x1) / 2;
    const gh = C.roof - C.belt, gy = (C.roof + C.belt) / 2;
    // hood over the engine, frame and front axle beneath it
    const hx0 = C.x1 - 0.05;
    B.box((hx0 + hl) / 2, 1.27, 0, hl - hx0, 0.76, W * 0.55, paint);
    B.box((hx0 + hl) / 2 + 0.05, 1.66, 0, hl - hx0 - 0.25, 0.04, W * 0.5, shadeHex(paint, 0.85));
    B.box((C.x0 + hl) / 2, 0.78, 0, hl - C.x0 - 0.2, 0.5, W * 0.42, 0x2a2a2a);
    B.box(hl - 0.05, 1.2, 0, 0.08, 0.5, W * 0.48, 0x2a2a2a);
    // cab: solid up to the belt, glass all round above it, the roof
    B.box(cx, (C.floor + C.belt) / 2, 0, cl, C.belt - C.floor, W * 0.86, paint);
    B.box(cx, C.roof + 0.08, 0, cl, 0.16, W * 0.86, paint);
    B.box(cx, C.roof + 0.2, 0, cl + 0.12, 0.08, W * 0.92, shadeHex(paint, 0.8));
    B.box(C.x1 - 0.01, gy, 0, 0.02, gh, W * 0.8, GLASS, G_GLASS);
    B.box(C.x0 + 0.01, gy, 0, 0.02, gh, W * 0.8, GLASS, G_GLASS);
    for (const s of [1, -1]) {
      for (const px of [C.x0 + 0.03, C.x1 - 0.03]) B.box(px, gy, s * (cz - 0.03), 0.06, gh, 0.06, paint);
      B.box(cx, gy, s * cz, cl - 0.1, gh, 0.02, GLASS, G_GLASS);
      // rear mudguards over the big wheels, a step up to the cab
      B.box(C.rearX, TRACTOR_RR * 2 + 0.06, s * (hw - 0.02), 1.9, 0.08, 0.56, shadeHex(paint, 0.75));
      B.box(C.rearX + 0.92, TRACTOR_RR * 1.55, s * (hw - 0.02), 0.08, TRACTOR_RR * 0.9, 0.56, shadeHex(paint, 0.75));
      B.box(C.x1 - 0.1, 0.62, s * (hw - 0.45), 0.3, 0.05, 0.25, 0x2a2a2a);
      B.box(hl + 0.01, 1.3, s * (W * 0.2), 0.02, 0.14, 0.2, HEADLAMP, G_LAMP);
      B.box(C.x0 - 0.05, C.belt - 0.15, s * (cz - 0.1), 0.04, 0.12, 0.1, TAIL, G_LAMP);
      B.box(C.x1 + 0.1, C.roof + 0.05, s * (cz - 0.05), 0.08, 0.1, 0.12, HEADLAMP, G_LAMP);
      B.box(-hl + 0.32, 0.72, s * 0.35, 0.64, 0.08, 0.08, 0x2a2a2a);
    }
    // exhaust up the front corner of the cab
    B.box(C.x1 + 0.12, C.belt + 0.35, W * 0.22, 0.1, 1.5, 0.1, TRIM);
    B.box(-hl + 0.12, 0.68, 0, 0.24, 0.3, W * 0.5, 0x2a2a2a);
    if (kratten) addEggCrates(B, -hl - 0.12, kratten);
    addDoorCuts(B, 'tractor', L, hw, paint, CHROME, true);
    // de cabine van binnen onder de raamlijn, met de stoel
    binnenDoos(B, cx, (C.floor + C.belt) / 2, 0, cl - 0.12, C.belt - C.floor - 0.02, W * 0.86 - 0.2, 0x2f3a32);
    B.box(cx, C.floor + 0.42, 0, 0.45, 0.1, 0.45, 0x2b2d32);
    B.box(cx - 0.22, C.floor + 0.75, 0, 0.1, 0.55, 0.45, 0x2b2d32);
    const k = knipDeurgaten(B, 'tractor', L, W);
    const g = B.build();
    g.userData.knip = { ...deurSchillen(k, L), rects: k.rects, zs: k.zs };
    return g;
  });
  const mats = vehicleMaterials(v.wrecked);
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
  koppelDeurgaten(group, body, geo);
  const wheels = [];
  const small = carWheelGeometry(TRACTOR_FR, 0.36), big = carWheelGeometry(TRACTOR_RR, 0.52);
  for (const s of [1, -1]) {
    addWheel(group, small, mats[0], C.frontX, TRACTOR_FR, s * (hw - 0.3), wheels);
    addWheel(group, big, mats[0], C.rearX, TRACTOR_RR, s * (hw - 0.02), wheels);
  }
  group.userData.wheels = wheels;
  group.userData.wheelRadius = TRACTOR_FR;
  return group;
}

// A farm quad: low frame, fat tyres, racks front and back, straddle seat.
function buildQuadMesh(v) {
  const L = v.model.len, W = v.model.wid, hl = L / 2, hw = W / 2;
  const paint = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, 0xb8322a);
  const geo = cached(`quad|${L}|${W}|${paint}`, () => {
    const B = new GeoBuilder(3);
    B.box(0, 0.45, 0, L * 0.7, 0.2, W * 0.42, 0x2a2a2a);
    B.box(hl - 0.42, 0.68, 0, 0.62, 0.22, W * 0.8, paint);
    B.box(-hl + 0.42, 0.68, 0, 0.62, 0.22, W * 0.8, paint);
    B.box(0.12, 0.7, 0, 0.7, 0.3, W * 0.42, paint);
    B.box(-0.22, 0.86, 0, 0.62, 0.1, 0.36, 0x1c1c1c);
    B.box(hl - 0.42, 0.84, 0, 0.5, 0.04, W * 0.7, 0x3a3a3a);
    B.box(-hl + 0.42, 0.84, 0, 0.5, 0.04, W * 0.7, 0x3a3a3a);
    B.box(0.42, 0.98, 0, 0.06, 0.36, 0.06, 0x2a2a2a);
    B.box(0.44, 1.16, 0, 0.06, 0.04, W * 0.72, 0x2a2a2a);
    for (const s of [1, -1]) {
      B.box(hl - 0.08, 0.74, s * 0.2, 0.02, 0.1, 0.16, HEADLAMP, G_LAMP);
      B.box(-hl + 0.105, 0.72, s * 0.24, 0.02, 0.08, 0.1, TAIL, G_LAMP);
      B.box(-0.05, 0.42, s * (W * 0.26), 0.4, 0.04, 0.22, 0x2a2a2a);
    }
    return B.build();
  });
  const mats = vehicleMaterials(v.wrecked);
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
  const wheels = [];
  const wheel = carWheelGeometry(0.3, 0.26);
  for (const s of [1, -1]) {
    addWheel(group, wheel, mats[0], hl - 0.42, 0.3, s * (hw - 0.13), wheels);
    addWheel(group, wheel, mats[0], -hl + 0.42, 0.3, s * (hw - 0.13), wheels);
  }
  group.userData.wheels = wheels;
  group.userData.wheelRadius = 0.3;
  return group;
}

// De Korenwolf M3 (verzonnen maaidorser, #415): brede maaitafel voorop, de cabine hoog erboven, graantank en lospijp achterop, grote voorwielen.
// Gebouwd voor MAAIDORSER_MODEL (vehicle.js): 7,4 x 3,3 m. Aparte functie: de boerderij hangt hier niets anders aan.
function buildMaaidorserMesh(v) {
  const L = v.model.len, W = v.model.wid, hl = L / 2, hw = W / 2;
  const paint = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, 0xc43d2b);
  const geo = cached(`maaidorser|${L}|${W}|${paint}`, () => {
    const B = new GeoBuilder(3);
    const rond = shadeHex(paint, 0.82);
    // maaitafel voorop met haspel en messenbalk, dorskast, graantank, lospijp, cabine
    B.box(hl - 0.5, 0.62, 0, 1.0, 0.5, W, 0xd9b84a);
    B.box(hl - 0.15, 0.4, 0, 0.18, 0.14, W, 0x6b6b6b);
    B.box(hl - 0.45, 1.05, 0, 0.5, 0.5, W * 0.96, shadeHex(0xd9b84a, 0.8));
    B.box(hl - 1.45, 1.5, 0, 1.6, 1.0, W * 0.62, rond);
    B.box(-0.55, 1.55, 0, hl * 1.2, 1.1, W * 0.78, paint);
    B.box(-1.2, 2.55, 0, 3.2, 1.0, W * 0.74, paint);
    B.box(-1.2, 3.14, 0, 3.3, 0.14, W * 0.78, rond);
    B.box(-0.2, 3.5, hw * 0.55, 3.4, 0.14, 0.16, 0x6b6b6b);
    // De maaidorsers-cabine (#847): geen dichte plaatswerkdoos meer achter het glas, zodat het
    // interieur op cabinehoogte (2,35-3,2 m) door de glasband te zien is. Onderpaneel tot de
    // raamlijn, dakpaneel erboven en vier hoekstijlen ertussen; de glaspanelen zelf staan op
    // dezelfde plek als voorheen (voor/achter op hl-1,64 en hl-3,16, zij op +/-W*0,35).
    B.box(hl - 2.4, 2.175, 0, 1.5, 0.35, W * 0.7, paint);
    B.box(hl - 2.4, 3.25, 0, 1.5, 0.1, W * 0.7, paint);
    for (const px of [hl - 3.12, hl - 1.68]) for (const pz of [-1, 1]) B.box(px, 2.775, pz * (W * 0.35 - 0.03), 0.06, 0.85, 0.06, paint);
    B.box(hl - 2.4, 3.36, 0, 1.6, 0.14, W * 0.76, rond);
    B.box(hl - 1.64, 2.7, 0, 0.03, 1.0, W * 0.64, GLASS, G_GLASS);
    B.box(hl - 3.16, 2.7, 0, 0.03, 1.0, W * 0.64, GLASS, G_GLASS);
    for (const s of [1, -1]) {
      B.box(hl - 2.4, 2.7, s * W * 0.35, 1.5, 1.0, 0.03, GLASS, G_GLASS);
      B.box(hl - 0.04, 0.62, s * (hw - 0.3), 0.02, 0.14, 0.24, HEADLAMP, G_LAMP);
      B.box(-hl + 0.03, 1.5, s * (hw * 0.5), 0.02, 0.14, 0.2, TAIL, G_LAMP);
    }
    return B.build();
  });
  const mats = vehicleMaterials(v.wrecked);
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
  const wheels = [];
  const big = carWheelGeometry(0.95, 0.7), small = carWheelGeometry(0.62, 0.5);
  for (const s of [1, -1]) {
    addWheel(group, big, mats[0], hl - 2.7, 0.95, s * (hw - 0.45), wheels);
    addWheel(group, small, mats[0], -hl + 1.0, 0.62, s * (hw - 0.55), wheels);
  }
  group.userData.wheels = wheels;
  group.userData.wheelRadius = 0.95;
  return group;
}

// De Laadkabouter L45 (verzonnen kleine laadmachine, #415): compacte knikmachine met een laadarm en bak voorop. 3,4 x 1,8 m.
function buildLaadmachineMesh(v) {
  const L = v.model.len, W = v.model.wid, hl = L / 2, hw = W / 2;
  const paint = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, 0xe0a92b);
  const geo = cached(`laadmachine|${L}|${W}|${paint}`, () => {
    const B = new GeoBuilder(3);
    const rond = shadeHex(paint, 0.8);
    B.box(-hl + 0.7, 0.85, 0, 1.4, 0.7, W * 0.8, paint);
    B.box(-hl + 0.45, 1.3, 0, 0.9, 0.3, W * 0.72, rond);
    B.box(0.15, 0.62, 0, 1.6, 0.4, W * 0.62, 0x2a2a2a);
    // cabine met kooi, de laadarm langs beide kanten en de bak
    B.box(-0.1, 1.45, 0, 1.1, 0.12, W * 0.78, rond);
    B.box(-0.1, 2.0, 0, 1.1, 0.08, W * 0.86, rond);
    for (const s of [1, -1]) {
      for (const px of [-0.6, 0.38]) B.box(px, 1.75, s * (hw * 0.78), 0.06, 0.66, 0.06, rond);
      B.box(0.55, 1.2, s * (hw * 0.92), 1.7, 0.1, 0.1, 0x5a5a5a);
      B.box(0.38, 1.76, s * (hw * 0.78), 0.02, 0.56, 0.02, GLASS, G_GLASS);
      B.box(hl - 0.03, 0.9, s * (W * 0.3), 0.02, 0.12, 0.2, HEADLAMP, G_LAMP);
      B.box(-hl + 0.02, 1.05, s * (W * 0.3), 0.02, 0.1, 0.18, TAIL, G_LAMP);
    }
    B.box(hl + 0.1, 0.45, 0, 0.8, 0.5, W * 1.02, 0x5a5a5a);
    B.box(hl + 0.45, 0.72, 0, 0.1, 0.45, W * 1.02, 0x5a5a5a);
    B.box(-0.1, 1.75, 0, 0.02, 0.56, W * 0.76, GLASS, G_GLASS);
    return B.build();
  });
  const mats = vehicleMaterials(v.wrecked);
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
  const wheels = [];
  const wheel = carWheelGeometry(0.46, 0.5);
  for (const s of [1, -1]) {
    addWheel(group, wheel, mats[0], hl - 0.85, 0.46, s * (hw - 0.25), wheels);
    addWheel(group, wheel, mats[0], -hl + 0.7, 0.46, s * (hw - 0.25), wheels);
  }
  group.userData.wheels = wheels;
  group.userData.wheelRadius = 0.46;
  return group;
}

// The snackwagen: Tessa's foodtruck. A blue van with a serving hatch and
// a striped awning on the right (+z, the kerb side), a roof sign with the
// seagull and a giant eierbal on top.
let fjordSignTex = null;
function fjordSignTexture() {
  if (fjordSignTex) return fjordSignTex;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f1e6';
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#1f4f8f';
  g.fillRect(0, 0, 512, 12); g.fillRect(0, 116, 512, 12);
  g.font = 'bold 50px "Arial Black", Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#1f4f8f';
  g.fillText('TAM & TES', 292, 66, 400);
  // the seagull
  g.strokeStyle = '#1c1d20'; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(14, 58); g.quadraticCurveTo(30, 34, 44, 58); g.quadraticCurveTo(58, 34, 74, 58); g.stroke();
  fjordSignTex = new THREE.CanvasTexture(c);
  fjordSignTex.colorSpace = THREE.SRGBColorSpace;
  fjordSignTex.anisotropy = 4;
  return fjordSignTex;
}

function buildFoodtruckMesh(v) {
  const L = v.model.len, W = v.model.wid, hl = L / 2, hw = W / 2;
  const wrecked = v.wrecked;
  const paint = wrecked ? WRECKED_COLOR : toHex(v.model.color, 0x2f6fb0);
  const group = assembleCar('van', L, W, paint, { wrecked, wheelR: 0.34, doorNaam: 'foodtruck' }); // de cabinedeuren van de snackwagen, niet de schuifdeur van de bestelbus
  if (wrecked) return group;
  const geo = cached(`foodtruck|${L}|${W}|${paint}`, () => {
    const B = new GeoBuilder(3);
    // the hatch: a dark opening with a steel counter, the flap propped up as the awning
    const x0 = -hl + 0.55, x1 = hl - 1.45;
    const cx = (x0 + x1) / 2, cl = x1 - x0;
    B.box(cx, 1.45, hw + 0.007, cl, 0.8, 0.01, 0x1c1d20);
    B.box(cx, 1.3, hw + 0.012, cl * 0.9, 0.35, 0.01, 0xf2c230, G_LAMP);
    B.box(cx, 1.03, hw + 0.16, cl + 0.1, 0.05, 0.32, CHROME);
    for (let i = 0; i < 6; i++) {
      const sx = x0 + (cl * (i + 0.5)) / 6;
      B.box(sx, 1.98, hw + 0.42, cl / 6, 0.035, 0.9, i % 2 ? 0xf4f1e6 : 0x1f4f8f, 0, 0.5, 0, 0);
    }
    for (const x of [x0 + 0.05, x1 - 0.05]) B.geo(tubeGeometry([x, 1.86, hw + 0.8], [x, 1.1, hw + 0.03], 0.018, 0.018, 4), null, CHROME);
    // snacks on the counter
    for (let i = 0; i < 4; i++) B.box(cx - cl * 0.3 + i * cl * 0.2, 1.09, hw + 0.18, 0.12, 0.08, 0.1, [0xc9852e, 0xe8c24a, 0x8a4a22, 0xc9852e][i]);
    // roof: sign frame, an extractor hood, and the eierbal
    B.box(-0.3, 2.3, 0, L * 0.55, 0.06, 0.08, 0x2a2a2b);
    for (const x of [-0.3 - L * 0.26, -0.3 + L * 0.26]) B.box(x, 2.22, 0, 0.06, 0.2, 0.06, 0x2a2a2b);
    B.box(-hl + 0.7, 2.18, -hw * 0.45, 0.5, 0.18, 0.5, CHROME);
    B.geo(new THREE.SphereGeometry(0.42, 12, 9), composeMatrix(hl - 1.25, 2.55, 0, 0, 0, 0, 1, 0.92, 1), 0xb8742c);
    B.geo(new THREE.SphereGeometry(0.45, 12, 9, 0, Math.PI * 2, 0, 0.9), composeMatrix(hl - 1.25, 2.55, 0, 0, 0, 0, 1, 0.92, 1), 0xd89a44);
    B.box(hl - 1.25, 2.12, 0, 0.5, 0.06, 0.5, 0x2a2a2b);
    return B.build();
  });
  group.add(new THREE.Mesh(geo, vehicleMaterials()));
  const signMat = new THREE.MeshLambertMaterial({ map: fjordSignTexture() });
  const sign = new THREE.Mesh(cached('foodtruck-sign|' + L, () => new THREE.BoxGeometry(L * 0.55, 0.62, 0.05)), signMat);
  sign.position.set(-0.3, 2.64, 0);
  group.add(sign);
  return group;
}

function buildFordEscortGroup(color, len = HERO_LEN, wid = HERO_WID, wrecked = false) {
  return assembleCar('escort', len, wid, toHex(color, HABBO_PALETTE.brickRed), { wrecked, wheelR: 0.3 });
}

export function buildFordEscortMesh(color) {
  const mesh = buildFordEscortGroup(color);
  retainCachedGeometries(mesh); // #787
  return mesh;
}

// --- bike / scooter ----------------------------------------------------------------

function riderFor(v, shirtHex) {
  const skins = [0xe8b48a, 0xcaa06f, 0x8a5a3c, 0x5c3d28, 0xf0c9a0];
  const seed = (v.id || 0) * 3.7 + 1;
  return buildPersonMesh(shirtHex, skins[Math.floor(hash2(seed, 2.1) * skins.length)], { seed, role: 'voetganger' });
}

function poseRider(rider, legBase, armAngle, lean) {
  const ud = rider.userData;
  rider.rotation.z = lean;
  ud.armL.rotation.z = armAngle;
  ud.armR.rotation.z = armAngle;
  ud.legL.rotation.z = legBase;
  ud.legR.rotation.z = legBase;
}

// st: de studentenstaat als sleutel (staatSleutel: S scheef voorspatbord, L geen voorlicht)
function buildBikeGeometry(color, fat, stepThrough, st = '', zonderStuur = false) {
  return cached(`bike|${color}|${fat}|${stepThrough}|${st}|${zonderStuur}`, () => {
    const B = new GeoBuilder(3);
    const r = fat ? 0.3 : 0.34;
    const wb = fat ? 0.52 : 0.56;
    const t = fat ? 0.028 : 0.018;
    const F = [wb, r, 0], R = [-wb, r, 0];
    const BB = [-0.05, 0.3, 0];
    const S = [-0.24, fat ? 0.72 : 0.84, 0];
    const H1 = [0.4, fat ? 0.82 : 0.93, 0], H0 = [0.45, fat ? 0.66 : 0.72, 0];
    const tube = (a, b, rr = t, c = color) => B.geo(tubeGeometry(a, b, rr, rr, 5), null, c);
    tube(H0, H1, t * 1.3);
    tube(S, BB);
    for (const s of [1, -1]) {
      tube([BB[0], BB[1], s * 0.04], [R[0], R[1], s * 0.05], t * 0.8);
      tube([S[0], S[1], s * 0.02], [R[0], R[1], s * 0.05], t * 0.8);
      tube([H0[0], H0[1], s * 0.04], [F[0], F[1], s * 0.05], t * 0.85);
    }
    if (stepThrough && !fat) {
      tube([0.42, 0.86, 0], [0.05, 0.4, 0]);
      tube([0.05, 0.4, 0], BB);
      tube([0.44, 0.78, 0], [0.12, 0.36, 0], t * 0.8);
      tube([0.12, 0.36, 0], [-0.02, 0.29, 0], t * 0.8);
    } else {
      tube(H1, [S[0] + 0.02, S[1] - 0.02, 0]);
      tube(H0, BB, t * 1.1);
    }
    const saddle = [S[0] - 0.03, S[1] + (fat ? 0.2 : 0.14), 0];
    tube(S, saddle, 0.013, 0x8a8e92);
    B.box(saddle[0] - 0.02, saddle[1] + 0.03, 0, 0.27, 0.06, 0.16, 0x2a1d14);
    // stem and bars: drawn on their own when the bike is near (stuurOverlay), so they turn with the steering (#442)
    const stemTop = [H1[0] - 0.02, H1[1] + 0.14, 0];
    if (!zonderStuur) bikeStuurOnderdelen(B, fat, 0);
    for (const [x] of [F, R]) {
      const guard = new THREE.TorusGeometry(r + 0.03, fat ? 0.05 : 0.028, 3, 9, Math.PI * 0.85);
      guard.scale(1, 1, fat ? 1.2 : 1);
      // een scheef voorspatbord: omhoog gebogen, een stukje opzij en iets weg van het wiel
      if (st.includes('S') && x === F[0]) B.geo(guard, composeMatrix(x + 0.06, r + 0.09, 0.07, 0.3, 0.32, Math.PI * 0.08 + 0.5), color);
      else B.geo(guard, composeMatrix(x, r, 0, 0, 0, Math.PI * 0.08), color);
    }
    if (!fat) {
      B.box(-0.33, 0.44, 0.075, 0.62, 0.13, 0.03, color, 0, 0, 0, 0.07);
      B.box(-0.5, 0.78, 0, 0.44, 0.02, 0.15, 0x2a2a2b);
      for (const s of [1, -1]) tube([-0.66, 0.78, s * 0.07], [R[0], R[1], s * 0.06], 0.01, 0x2a2a2b);
      // geen voorlicht: de dynamo en de lamp zijn eraf
      if (!st.includes('L')) {
        B.geo(new THREE.CylinderGeometry(0.045, 0.035, 0.07, 7).rotateZ(Math.PI / 2), composeMatrix(H0[0] + 0.07, H0[1] + 0.04, 0), 0x2a2a2b);
        B.box(H0[0] + 0.11, H0[1] + 0.04, 0, 0.01, 0.06, 0.06, HEADLAMP, G_LAMP);
      }
      B.box(-0.73, 0.76, 0, 0.01, 0.04, 0.06, TAIL, G_LAMP);
    }
    for (const s of [1, -1]) B.box(BB[0], BB[1], s * 0.1, 0.1, 0.02, 0.08, 0x2a2a2b);
    return B.build();
  });
}

// Bakfiets: long frame with a wooden box between the rider and a small front wheel.
function buildBakfietsGeometry(color) {
  return cached(`bakfiets|${color}`, () => {
    const B = new GeoBuilder(3);
    const t = 0.02;
    const tube = (a, b, rr = t, c = color) => B.geo(tubeGeometry(a, b, rr, rr, 5), null, c);
    const R = [-0.85, 0.34, 0], BB = [-0.45, 0.3, 0], S = [-0.62, 0.86, 0], H = [-0.25, 0.96, 0];
    tube(R, BB);
    tube(R, S, t * 0.8);
    tube(BB, S, t * 1.2);
    tube(BB, [0.95, 0.22, 0], t * 1.3);
    tube([-0.2, 0.28, 0], H, t * 1.1);
    for (const s of [1, -1]) tube(H, [H[0] - 0.12, H[1] + 0.05, s * 0.26], 0.012, 0x8a8e92);
    B.box(S[0] - 0.02, S[1] + 0.1, 0, 0.26, 0.06, 0.16, 0x2a1d14);
    B.box(0.45, 0.62, 0, 0.9, 0.04, 0.66, 0x7a5a38);
    for (const s of [1, -1]) B.box(0.45, 0.82, s * 0.33, 0.9, 0.4, 0.03, 0x9a7048);
    B.box(0.9, 0.82, 0, 0.03, 0.4, 0.66, 0x9a7048);
    B.box(0.0, 0.82, 0, 0.03, 0.4, 0.66, 0x9a7048);
    B.box(0.45, 1.03, 0.33, 0.9, 0.03, 0.04, 0x6b4a2a);
    B.box(0.45, 1.03, -0.33, 0.9, 0.03, 0.04, 0x6b4a2a);
    B.box(-0.97, 0.76, 0, 0.01, 0.04, 0.06, TAIL, G_LAMP);
    B.box(0.93, 0.7, 0, 0.01, 0.06, 0.06, HEADLAMP, G_LAMP);
    return B.build();
  });
}

// Delivery rider's big cube bag (invented chain colours, streetlifedata.js).
function buildBagGeometry(color, trim) {
  return cached(`bag|${color}|${trim}`, () => {
    const B = new GeoBuilder(3);
    B.box(0, 0, 0, 0.5, 0.5, 0.52, color);
    B.box(0, 0.255, 0, 0.52, 0.035, 0.54, trim);
    B.box(0, 0.02, 0.265, 0.34, 0.2, 0.02, trim);
    B.box(0, 0.02, -0.265, 0.34, 0.2, 0.02, trim);
    B.box(-0.255, 0.0, 0, 0.012, 0.3, 0.3, 0xf4f2ec);
    return B.build();
  });
}

// Bike-share (Wisselwiel): a tinted disc over the front wheel and mudguard.
function buildShareTintGeometry(color, wb, r) {
  return cached(`sharetint|${color}|${wb}|${r}`, () => {
    const B = new GeoBuilder(3);
    for (const s of [1, -1]) B.geo(new THREE.CylinderGeometry(r - 0.02, r - 0.02, 0.012, 14).rotateX(Math.PI / 2), composeMatrix(wb, r, s * 0.03), color);
    B.geo(new THREE.TorusGeometry(r + 0.025, 0.02, 3, 9, Math.PI * 0.62), composeMatrix(wb, r, 0, 0, 0, Math.PI * 0.19), color);
    B.box(wb - 0.02, r * 2 + 0.2, 0, 0.1, 0.2, 0.06, color);
    return B.build();
  });
}

// What a student moving house has strapped in the cargo bike's box.
function buildBikeLoadGeometry(kind) {
  return cached(`bikeload|${kind}`, () => {
    const B = new GeoBuilder(3);
    if (kind === 'sofa') {
      const fab = 0x3f7a82, dark = 0x2c5860;
      B.box(0.45, 0.8, 0, 0.62, 0.22, 0.98, fab);
      B.box(0.2, 1.05, 0, 0.14, 0.42, 0.98, dark);
      for (const s of [1, -1]) B.box(0.45, 0.96, s * 0.5, 0.62, 0.3, 0.12, dark);
      B.box(0.55, 0.93, 0, 0.4, 0.07, 0.8, shadeHex(fab, 1.12));
    } else if (kind === 'matras') {
      B.box(0.45, 1.12, 0, 1.25, 0.16, 0.85, 0xe8e4da, 0, 0, 0, 0.1);
      B.box(0.45, 1.13, 0, 0.1, 0.17, 0.87, 0x4a6fa8, 0, 0, 0, 0.1);
      B.box(0.15, 1.1, 0, 0.04, 0.2, 0.9, 0x2a2a2b, 0, 0, 0, 0.1);
      B.box(0.75, 1.15, 0, 0.04, 0.2, 0.9, 0x2a2a2b, 0, 0, 0, 0.1);
    } else if (kind === 'plant') {
      B.geo(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 8), composeMatrix(0.45, 0.82, 0), 0xb5654a);
      B.geo(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 5), composeMatrix(0.45, 1.2, 0), 0x6a4a2a);
      B.geo(new THREE.IcosahedronGeometry(0.42, 0), composeMatrix(0.45, 1.65, 0, 0, 0, 0, 1, 1.15, 1), 0x3f8a3c);
      B.geo(new THREE.IcosahedronGeometry(0.28, 0), composeMatrix(0.7, 1.45, 0.14), 0x4f9a46);
    } else {
      B.box(0.45, 0.88, 0, 0.7, 0.4, 0.55, 0xc8a878);
      B.box(0.35, 1.28, 0.05, 0.5, 0.36, 0.45, 0xb89868);
      B.box(0.6, 1.2, -0.1, 0.3, 0.3, 0.3, 0xd2b484);
      B.box(0.45, 0.88, 0, 0.72, 0.03, 0.57, 0x6b4a2a);
    }
    return B.build();
  });
}

function buildBakfietsMesh(v) {
  const group = new THREE.Group();
  const color = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, HABBO_PALETTE.black);
  const mats = vehicleMaterials();
  group.add(new THREE.Mesh(buildBakfietsGeometry(color), mats));
  const wheels = [];
  addWheel(group, bikeWheelGeometry(0.34, 0.022), mats[0], -0.85, 0.34, 0, wheels);
  addWheel(group, bikeWheelGeometry(0.25, 0.022), mats[0], 1.0, 0.25, 0, wheels);
  group.userData.wheels = wheels;
  group.userData.wheelRadius = 0.32;
  group.userData.spinStep = 0.26; // 8 spaken (45 graden), en het kleine voorwiel draait sneller (spinK)
  wheels[0].userData.spinK = 0.32 / 0.34;
  wheels[1].userData.spinK = 0.32 / 0.25;
  const rider = riderFor(v, toHex(v.model.rider, HABBO_PALETTE.roofBlue));
  rider.position.set(-0.68, 1.02 - 0.93 * rider.scale.y, 0);
  poseRider(rider, 0.33, 0.7, -0.05);
  group.add(rider);
  group.userData.riderLegs = { legs: [rider.userData.legL, rider.userData.legR], base: 0.33, amp: 0.2 };
  if (v.model.load) {
    group.add(new THREE.Mesh(buildBikeLoadGeometry(v.model.load), mats));
    return group;
  }
  // a kid (or two) in the box
  if (hash2(v.id || 0, 7.7) < 0.6) {
    const kid = buildPersonMesh([0xd0457a, 0x3f7ab0, 0xe8c93a][Math.floor(hash2(v.id || 0, 2) * 3)], 0xe8b48a, { seed: (v.id || 0) + 9 });
    kid.scale.setScalar(0.55);
    kid.position.set(0.5, 0.35, 0);
    if (kid.userData.legL) kid.userData.legL.rotation.z = 1.4;
    if (kid.userData.legR) kid.userData.legR.rotation.z = 1.4;
    group.add(kid);
  }
  return group;
}

// Een klap voorop (v.dentLog, vehicledamage.js fietsStaat) maakt het voorspatbord scheef of breekt het voorlicht af: het frame wordt
// vervangen door de variant met die afwijking. true als er iets veranderde. (De banden en het geluid veranderen niet door een klap.)
export function updateBikeStaat(mesh, v) {
  if (!mesh || !v || !v.isBike || v.wrecked || v.model.fat || v.model.cargo) return false;
  const sleutel = staatSleutel(fietsStaat(v));
  if (mesh.userData.staatSleutel === undefined || mesh.userData.staatSleutel === sleutel) return false;
  const frame = mesh.children[0];
  if (!frame || !frame.isMesh) return false;
  frame.geometry = buildBikeGeometry(toHex(v.model.color, HABBO_PALETTE.black), false, hash2(v.id || 0, 4.2) < 0.5, sleutel);
  mesh.userData.staatSleutel = sleutel;
  return true;
}

function buildBikeMesh(v) {
  if (v.model.cargo) return buildBakfietsMesh(v);
  const group = new THREE.Group();
  const fat = !!v.model.fat;
  const color = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, HABBO_PALETTE.black);
  const stepThrough = hash2(v.id || 0, 4.2) < 0.5;
  const mats = vehicleMaterials();
  // de studentenstaat (#402): scheef spatbord, geen voorlicht, blauwe banden (en een klap voorop maakt het spatbord ook scheef)
  const staat = !fat && v.isBike ? fietsStaat(v) : null;
  const sleutel = staat ? staatSleutel(staat) : '';
  const bikeBody = new THREE.Mesh(buildBikeGeometry(color, fat, stepThrough, sleutel), mats);
  group.add(bikeBody);
  group.userData.staatSleutel = sleutel;
  group.userData.stuurSpec = { soort: 'fiets', color, fat, stepThrough, sleutel, body: bikeBody };
  const r = fat ? 0.3 : 0.34;
  const wb = fat ? 0.52 : 0.56;
  const wgeo = bikeWheelGeometry(r, fat ? 0.07 : 0.022, true, staat && staat.blauw ? BLUE_TIRE : TIRE);
  const wheels = [];
  addWheel(group, wgeo, mats[0], wb, r, 0, wheels);
  addWheel(group, wgeo, mats[0], -wb, r, 0, wheels);
  group.userData.wheels = wheels;
  group.userData.wheelRadius = r;
  group.userData.spinStep = 0.34; // 4 spoke bars: 45 deg symmetry

  const rider = riderFor(v, toHex(v.model.rider, HABBO_PALETTE.roofBlue));
  const hipY = fat ? 0.93 : 1.02;
  rider.position.set(fat ? -0.26 : -0.3, hipY - 0.93 * rider.scale.y, 0);
  poseRider(rider, fat ? 0.55 : 0.33, fat ? 0.95 : 0.85, -0.08);
  // handen aan het stuur (actorlife.js): de grepen van bikeStuurOnderdelen; dichtbij draaien ze mee met het stuur (voertuigbediening.js)
  group.userData.riderMesh = rider;
  group.userData.riderGrip = bikeGrip(fat);
  bikeHands(rider, group.userData.riderGrip, 0);
  if (!fat && v.isBike && v.driver !== 'player' && !v.wrecked && hash2((v.id || 0) * 1.9, 7.3) < 0.18) holdPhoneRiding(rider);
  group.add(rider);
  group.userData.riderLegs = { legs: [rider.userData.legL, rider.userData.legR], base: fat ? 0.55 : 0.33, amp: 0.2 };
  if (v.model.delivery && !v.wrecked) {
    const bag = new THREE.Mesh(buildBagGeometry(toHex(v.model.bag, 0x9bd630), toHex(v.model.bagTrim, 0x2b3a12)), mats);
    bag.position.set(-0.7, 1.32, 0);
    group.add(bag);
  } else if (v.model.share && !v.wrecked) {
    group.add(new THREE.Mesh(buildShareTintGeometry(toHex(v.model.tint, 0xff6a4d), wb, r), mats));
  }
  return group;
}

function buildScooterGeometry(color, zonderStuur = false) {
  return cached(`step|${color}|${zonderStuur}`, () => {
    const B = new GeoBuilder(3);
    // deck with the battery pack slung underneath and grip tape on top
    B.box(-0.04, 0.13, 0, 0.78, 0.05, 0.19, color);
    B.box(-0.04, 0.095, 0, 0.62, 0.05, 0.15, 0x26272a);
    B.box(-0.06, 0.158, 0, 0.64, 0.008, 0.155, 0x1d1d1e);
    // steering neck and a thick stem
    B.geo(tubeGeometry([0.3, 0.14, 0], [0.43, 0.12, 0], 0.028, 0.026, 6), null, color);
    if (!zonderStuur) B.geo(tubeGeometry([0.43, 0.1, 0], [0.37, 1.02, 0], 0.034, 0.028, 8), null, color);
    B.box(0.43, 0.2, 0, 0.06, 0.12, 0.05, 0x2a2a2b);
    B.geo(tubeGeometry([0.43, 0.2, 0.03], [0.42, 0.11, 0.035], 0.012, 0.012, 4), null, 0x8a8e92);
    B.geo(tubeGeometry([0.43, 0.2, -0.03], [0.42, 0.11, -0.035], 0.012, 0.012, 4), null, 0x8a8e92);
    // bars, grips, the little display and a bell
    if (!zonderStuur) scooterStuurOnderdelen(B, 0);
    B.box(0.405, 0.42, 0, 0.035, 0.05, 0.07, HEADLAMP, G_LAMP);
    // fenders over both wheels, tail light on the rear one, kickstand
    const fender = new THREE.TorusGeometry(0.13, 0.024, 3, 8, Math.PI * 0.6);
    B.geo(fender.clone(), composeMatrix(0.42, 0.11, 0, 0, 0, Math.PI * 0.25), color);
    B.geo(fender, composeMatrix(-0.43, 0.11, 0, 0, 0, Math.PI * 0.15), color);
    B.box(-0.52, 0.2, 0, 0.012, 0.025, 0.07, TAIL, G_LAMP);
    B.geo(tubeGeometry([-0.14, 0.09, -0.08], [-0.26, 0.01, -0.13], 0.01, 0.01, 4), null, 0x2a2a2b);
    return B.build();
  });
}

// Snorscooter: step-through body with a front shield, a long seat and small wheels.
function buildMopedGeometry(color, zonderStuur = false) {
  return cached(`moped|${color}|${zonderStuur}`, () => {
    const B = new GeoBuilder(3);
    const dark = 0x2a2b2e;
    B.box(-0.38, 0.5, 0, 0.72, 0.36, 0.44, color);
    B.box(-0.3, 0.73, 0, 0.7, 0.1, 0.32, 0x1b1b1c);
    B.box(0.08, 0.3, 0, 0.62, 0.07, 0.36, dark);
    B.box(0.42, 0.62, 0, 0.12, 0.62, 0.44, color);
    B.box(0.48, 0.34, 0, 0.3, 0.1, 0.2, color);
    if (!zonderStuur) mopedStuurOnderdelen(B, color, 0);
    B.box(-0.76, 0.56, 0, 0.04, 0.08, 0.18, TAIL, G_LAMP);
    B.box(-0.62, 0.8, 0, 0.26, 0.05, 0.3, dark);
    B.geo(tubeGeometry([-0.3, 0.28, 0.16], [-0.72, 0.36, 0.2], 0.035, 0.03, 6), null, CHROME);
    return B.build();
  });
}

const MOPED_BODY_L = 1.53;
function buildMopedMesh(v) {
  const group = new THREE.Group();
  const color = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, 0xe6e1d6);
  const mats = vehicleMaterials();
  // the body is drawn 1.53 m long: stretch it to the model (1.7 m, as collision)
  const sx = (v.model.len || MOPED_BODY_L) / MOPED_BODY_L;
  const body = new THREE.Mesh(buildMopedGeometry(color), mats);
  body.scale.x = sx;
  group.add(body);
  group.userData.stuurSpec = { soort: 'brommer', color, body, sx };
  const r = 0.23;
  const wgeo = bikeWheelGeometry(r, 0.09, false);
  const wheels = [];
  addWheel(group, wgeo, mats[0], 0.55 * sx, r, 0, wheels);
  addWheel(group, wgeo, mats[0], -0.52 * sx, r, 0, wheels);
  group.userData.wheels = wheels;
  group.userData.wheelRadius = r;
  group.userData.spinStep = 0.28;
  const rider = riderFor(v, toHex(v.model.rider, HABBO_PALETTE.roofBlue));
  rider.position.set(-0.22, 0.8 - 0.93 * rider.scale.y, 0);
  poseRider(rider, 1.25, 1.0, -0.04);
  group.add(rider);
  return group;
}

// --- motorbikes and the geared classic moped ------------------------------------------
// model.motorbike: 'sport' (faired, clip-ons, leaning over the tank), 'naked'
// (open frame, wide bars) or 'old' (chrome, round lamp, upright). The geared
// moped is the scooter family with model.geared: tank, frame and two pipes.

const MOTO_SPEC = {
  // het achterwiel van een sportmotor is breder en groter dan het voorwiel (rr, rtire; #436)
  sport: { r: 0.3, tire: 0.1, rr: 0.34, rtire: 0.13, fx: 0.7, rx: -0.68, seat: { x: -0.3, y: 0.8, lean: -0.5, arm: 1.2, leg: 1.25 } },
  naked: { r: 0.31, tire: 0.09, fx: 0.7, rx: -0.68, seat: { x: -0.3, y: 0.82, lean: -0.2, arm: 0.95, leg: 1.2 } },
  old: { r: 0.33, tire: 0.06, fx: 0.72, rx: -0.7, seat: { x: -0.28, y: 0.84, lean: -0.05, arm: 0.85, leg: 1.15 } },
  moped: { r: 0.24, tire: 0.06, fx: 0.55, rx: -0.52, seat: { x: -0.2, y: 0.78, lean: -0.04, arm: 0.9, leg: 1.2 } },
};

// Where a rider sits and how they hold on: for the built-in rider and the
// player's figure (scene3d.js syncPlayerRider). null: the model has no seat pose.
export function riderSeatFor(model) {
  const k = model && (model.motorbike || (model.geared ? 'moped' : null));
  return k && MOTO_SPEC[k] ? MOTO_SPEC[k].seat : null;
}

function buildMotorbikeGeometry(kind, color) {
  return cached(`moto|${kind}|${color}`, () => {
    const B = new GeoBuilder(3);
    const s = MOTO_SPEC[kind];
    const dark = 0x2a2b2e, black = 0x1b1b1c, steel = 0x3a3c40;
    const tube = (a, b, rr, c = dark) => B.geo(tubeGeometry(a, b, rr, rr, 6), null, c);
    const F = [s.fx, s.r, 0], R = [s.rx, s.rr || s.r, 0];
    const head = [s.fx - 0.2, 0.92, 0];
    const old = kind === 'old', sport = kind === 'sport';
    // engine and gearbox
    B.box(-0.02, 0.38, 0, 0.44, 0.34, 0.3, old ? CHROME : steel);
    B.box(-0.22, 0.34, 0, 0.16, 0.2, 0.34, steel);
    B.box(0.14, 0.58, 0, 0.2, 0.18, 0.26, old ? CHROME : dark);
    // forks, steering stem and swing arm
    for (const z of [0.08, -0.08]) {
      tube([head[0] + 0.02, head[1] - 0.04, z], [F[0], F[1], z], 0.026, CHROME);
      tube([-0.2, 0.4, z * 1.4], [R[0], R[1], z * 1.3], 0.022, sport ? color : dark);
    }
    tube(head, [0.12, 0.62, 0], 0.03, dark);
    tube([0.12, 0.62, 0], [-0.32, 0.72, 0], 0.028, dark);
    tube([-0.32, 0.72, 0], [-0.55, 0.78, 0], 0.025, dark);
    // tank, seat and tail
    B.box(0.16, 0.82, 0, 0.48, sport ? 0.2 : 0.24, sport ? 0.3 : 0.28, color, 0, 0, 0, sport ? -0.1 : 0.04);
    B.box(-0.34, 0.8, 0, 0.62, 0.08, 0.27, black);
    if (sport) {
      B.box(-0.76, 0.88, 0, 0.44, 0.14, 0.2, color, 0, 0, 0, 0.22);
      B.box(0.52, 0.76, 0, 0.5, 0.36, 0.34, color, 0, 0, 0, -0.18);
      B.box(0.78, 0.96, 0, 0.12, 0.14, 0.26, 0x2b3740, 1, 0, 0, -0.9);
      B.box(0.62, 0.74, 0, 0.1, 0.12, 0.2, HEADLAMP, G_LAMP);
      B.box(0.08, 0.28, 0, 0.56, 0.16, 0.32, color);
    } else {
      B.box(-0.7, 0.88, 0, 0.36, 0.06, 0.2, color, 0, 0, 0, 0.12);
      B.geo(new THREE.CylinderGeometry(old ? 0.1 : 0.085, old ? 0.1 : 0.085, 0.1, 10).rotateZ(Math.PI / 2), composeMatrix(head[0] + 0.12, head[1] - 0.04, 0), old ? CHROME : dark);
      B.box(head[0] + 0.18, head[1] - 0.04, 0, 0.02, old ? 0.12 : 0.1, old ? 0.12 : 0.1, HEADLAMP, G_LAMP);
    }
    // handlebars and grips
    const bar = sport ? 0.2 : old ? 0.4 : 0.34;
    const bx = head[0] - (sport ? 0.04 : old ? 0.08 : 0.02), by = head[1] + (sport ? 0.05 : old ? 0.18 : 0.12);
    const gx = bx - (old ? 0.1 : 0.02), gy = by + (old ? 0.04 : 0);
    tube([head[0], head[1], 0], [bx, by, 0], 0.025, dark);
    for (const z of [1, -1]) {
      tube([bx, by, 0], [gx, gy, z * bar], 0.014, old ? CHROME : dark);
      tube([gx, gy, z * bar], [gx, gy, z * (bar + 0.1)], 0.02, black);
    }
    // exhaust
    if (sport) tube([0.05, 0.22, 0.14], [-0.82, 0.62, 0.1], 0.05, 0x6a6e72);
    else if (kind === 'naked') { tube([0.2, 0.26, 0.17], [-0.6, 0.34, 0.2], 0.045, CHROME); B.box(-0.74, 0.35, 0.2, 0.26, 0.1, 0.1, 0x6a6e72); }
    else for (const z of [0.2, -0.2]) { tube([0.18, 0.26, z], [-0.62, 0.34, z * 1.15], 0.04, CHROME); B.box(-0.72, 0.35, z * 1.15, 0.28, 0.08, 0.08, CHROME); }
    // mudguards, tail lamp, brake discs
    B.geo(new THREE.TorusGeometry(s.r + 0.03, 0.03, 3, 9, Math.PI * 0.8), composeMatrix(F[0], F[1], 0, 0, 0, Math.PI * 0.1), sport ? color : old ? CHROME : dark);
    B.box(R[0] - 0.12, 0.62, 0, 0.3, 0.03, 0.2, sport ? color : dark, 0, 0, 0, 0.35);
    B.box(R[0] - 0.3, 0.66, 0, 0.02, 0.05, 0.1, TAIL, G_LAMP);
    for (const x of [F[0], R[0]]) B.geo(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 10).rotateX(Math.PI / 2), composeMatrix(x, s.r, 0.05), 0x8a8e92);
    return B.build();
  });
}

function buildClassicMopedGeometry(color) {
  return cached(`cmoped|${color}`, () => {
    const B = new GeoBuilder(3);
    const s = MOTO_SPEC.moped;
    const dark = 0x2a2b2e, black = 0x1b1b1c;
    const tube = (a, b, rr, c = dark) => B.geo(tubeGeometry(a, b, rr, rr, 6), null, c);
    const F = [s.fx, s.r, 0], R = [s.rx, s.r, 0];
    B.box(-0.02, 0.36, 0, 0.3, 0.26, 0.24, 0x8a8e92);
    B.box(0.0, 0.62, 0, 0.36, 0.17, 0.24, color, 0, 0, 0, 0.06);
    tube([0.3, 0.84, 0], [F[0] - 0.02, F[1], 0.06], 0.022, CHROME);
    tube([0.3, 0.84, 0], [F[0] - 0.02, F[1], -0.06], 0.022, CHROME);
    tube([0.3, 0.84, 0], [-0.04, 0.5, 0], 0.03, dark);
    tube([-0.04, 0.5, 0], [R[0] + 0.1, 0.62, 0], 0.025, dark);
    for (const z of [0.07, -0.07]) tube([-0.04, 0.34, z], [R[0], R[1], z * 1.2], 0.02, dark);
    B.box(-0.34, 0.74, 0, 0.56, 0.08, 0.22, black);
    B.box(-0.6, 0.8, 0, 0.26, 0.03, 0.24, dark);
    B.geo(new THREE.CylinderGeometry(0.075, 0.075, 0.09, 10).rotateZ(Math.PI / 2), composeMatrix(0.36, 0.9, 0), CHROME);
    B.box(0.42, 0.9, 0, 0.02, 0.09, 0.09, HEADLAMP, G_LAMP);
    tube([0.3, 0.86, 0], [0.26, 1.04, 0], 0.025, dark);
    for (const z of [1, -1]) {
      tube([0.26, 1.04, 0], [0.2, 1.08, z * 0.3], 0.013, CHROME);
      tube([0.2, 1.08, z * 0.3], [0.2, 1.08, z * 0.4], 0.02, black);
    }
    for (const z of [1, -1]) B.box(-0.02, 0.18, z * 0.16, 0.12, 0.02, 0.1, dark);
    tube([0.1, 0.26, 0.17], [-0.56, 0.34, 0.2], 0.04, CHROME);
    B.box(-0.62, 0.35, 0.2, 0.22, 0.09, 0.09, 0x6a6e72);
    B.geo(new THREE.TorusGeometry(s.r + 0.03, 0.025, 3, 9, Math.PI * 0.8), composeMatrix(F[0], F[1], 0, 0, 0, Math.PI * 0.1), color);
    B.geo(new THREE.TorusGeometry(s.r + 0.03, 0.025, 3, 9, Math.PI * 0.7), composeMatrix(R[0], R[1], 0, 0, 0, Math.PI * 0.15), color);
    B.box(R[0] - 0.22, 0.6, 0, 0.02, 0.05, 0.08, TAIL, G_LAMP);
    return B.build();
  });
}

function helmetGeometry(color) {
  return cached(`helmet|${color}`, () => {
    const B = new GeoBuilder(3);
    B.geo(new THREE.SphereGeometry(0.168, 10, 8), composeMatrix(0, 0, 0, 0, 0, 0, 1.08, 1, 0.98), color);
    B.box(0.115, -0.015, 0, 0.08, 0.07, 0.2, 0x1d2328, 1);
    B.box(0.03, -0.14, 0, 0.14, 0.06, 0.2, color);
    return B.build();
  });
}

// A full-face helmet on a rider's head bone (models3d_people), replacing any earlier one.
export function attachHelmet(rider, color = 0xe8e6e0) {
  const head = rider && rider.userData && rider.userData.head;
  if (!head) return null;
  if (rider.userData.helmet) head.remove(rider.userData.helmet);
  const mesh = new THREE.Mesh(helmetGeometry(color), vehicleMaterials());
  mesh.position.set(0.005, PERSON_RIG.HEAD_Y - PERSON_RIG.NECK_Y + 0.012, 0);
  head.add(mesh);
  rider.userData.helmet = mesh;
  return mesh;
}

function seatRider(v, seat, hex) {
  const rider = riderFor(v, toHex(v.model.rider, hex));
  rider.position.set(seat.x, seat.y - 0.93 * rider.scale.y, 0);
  poseRider(rider, seat.leg, seat.arm, seat.lean);
  return rider;
}

function buildMotorbikeMesh(v) {
  const group = new THREE.Group();
  const kind = MOTO_SPEC[v.model.motorbike] ? v.model.motorbike : 'naked';
  const s = MOTO_SPEC[kind];
  const color = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, 0xc9a227);
  const mats = vehicleMaterials();
  // the body is drawn about 2.05 m long: stretch it to the model's length, as collision
  const sx = (v.model.len || 2.05) / 2.05;
  const body = new THREE.Mesh(buildMotorbikeGeometry(kind, color), mats);
  body.scale.x = sx;
  group.add(body);
  const wgeo = bikeWheelGeometry(s.r, s.tire, false);
  const rgeo = s.rr ? bikeWheelGeometry(s.rr, s.rtire, false) : wgeo;
  const wheels = [];
  addWheel(group, wgeo, mats[0], s.fx * sx, s.r, 0, wheels);
  addWheel(group, rgeo, mats[0], s.rx * sx, s.rr || s.r, 0, wheels);
  if (s.rr) wheels[1].userData.spinK = s.r / s.rr; // groter wiel, lagere hoeksnelheid
  group.userData.wheels = wheels;
  group.userData.wheelRadius = s.r;
  group.userData.spinStep = 0.28;
  const rider = seatRider(v, s.seat, 0x1c1c1e);
  attachHelmet(rider, toHex(v.model.helmet, kind === 'sport' ? 0xe8e6e0 : 0x1c1c1e));
  group.add(rider);
  return group;
}

function buildClassicMopedMesh(v) {
  const group = new THREE.Group();
  const s = MOTO_SPEC.moped;
  const color = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, 0xc9541e);
  const mats = vehicleMaterials();
  const sx = (v.model.len || 1.7) / 1.7;
  const body = new THREE.Mesh(buildClassicMopedGeometry(color), mats);
  body.scale.x = sx;
  group.add(body);
  const wgeo = bikeWheelGeometry(s.r, s.tire, true);
  const wheels = [];
  addWheel(group, wgeo, mats[0], s.fx * sx, s.r, 0, wheels);
  addWheel(group, wgeo, mats[0], s.rx * sx, s.r, 0, wheels);
  group.userData.wheels = wheels;
  group.userData.wheelRadius = s.r;
  group.userData.spinStep = 0.34;
  const rider = seatRider(v, s.seat, HABBO_PALETTE.roofBlue);
  attachHelmet(rider, 0xd8c8a0);
  group.add(rider);
  return group;
}

function buildScooterMesh(v) {
  if (v.model.motorbike) return buildMotorbikeMesh(v);
  if (v.model.geared) return buildClassicMopedMesh(v);
  if (v.model.moped) return buildMopedMesh(v);
  const group = new THREE.Group();
  const color = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, HABBO_PALETTE.black);
  const mats = vehicleMaterials();
  const stepBody = new THREE.Mesh(buildScooterGeometry(color), mats);
  group.add(stepBody);
  group.userData.stuurSpec = { soort: 'step', color, body: stepBody };
  const r = 0.11;
  const wgeo = bikeWheelGeometry(r, 0.035, false);
  const wheels = [];
  addWheel(group, wgeo, mats[0], 0.42, r, 0, wheels);
  addWheel(group, wgeo, mats[0], -0.43, r, 0, wheels);
  group.userData.wheels = wheels;
  group.userData.wheelRadius = r;
  group.userData.spinStep = 0.28; // 5 spoke bars: 36 deg symmetry
  // standing rider: one foot forward on the deck, the other behind, a slight
  // forward lean with both hands on the bars
  const rider = riderFor(v, toHex(v.model.rider, HABBO_PALETTE.roofBlue));
  rider.position.set(-0.1, 0.162, 0);
  poseRider(rider, 0, 0.7, -0.07);
  rider.userData.legL.rotation.z = 0.2;
  rider.userData.legR.rotation.z = -0.16;
  rider.userData.legL.position.z *= 0.6;
  rider.userData.legR.position.z *= 0.6;
  group.add(rider);
  if (v.isPolice) {
    const lamps = [];
    for (const s of [1, -1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.07), lampMaterial(0x2f6bff, 0.25));
      lamp.position.set(0.39, 1.1, s * 0.09);
      group.add(lamp);
      lamps.push(lamp);
    }
    group.userData.policeLamps = lamps;
  }
  return group;
}

// --- mounted police ------------------------------------------------------------
// The horse body comes from countryside.js, handed over by policemounts.js
// (importing it here would close an import cycle through models3d_people).

let horseMeshBuilder = null;
export function setHorseMeshBuilder(fn) { horseMeshBuilder = fn; }

const HORSE_SADDLE_Y = 1.72;

function buildPoliceHorseMesh(v) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const horse = horseMeshBuilder(v.model.coat || 0);
  body.add(horse);
  group.add(body);
  if (v.wrecked) {
    body.rotation.x = 1.4;
    body.position.z = 1.2;
  }
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.62), habboMaterial(0x1c3fae));
  saddle.position.set(-0.05, 1.68, 0);
  horse.add(saddle);
  const rider = riderFor(v, toHex(v.model.rider, 0x1c3fae));
  const baseY = HORSE_SADDLE_Y - 0.93 * rider.scale.y;
  rider.position.set(-0.08, baseY, 0);
  poseRider(rider, 0.7, 0.75, -0.04);
  // legs astride the barrel instead of through it
  rider.userData.legL.rotation.x = -0.5;
  rider.userData.legR.rotation.x = 0.5;
  group.add(rider);
  Object.assign(group.userData, { horseLegs: horse.userData.legs, horseBody: horse, riderBaseY: baseY });
  return group;
}

// Per frame for police bikes/horses (after ragdoll.syncBikeRider): hides the
// rider while the officer is off on foot and animates the horse's gait.
export function syncPoliceMount(mesh, v, dt) {
  const ud = mesh.userData;
  if (ud.riderFig && !v.hijacked) ud.riderFig.visible = !v._riderAway && !v.wrecked;
  // the player rides it in their own look (scene3d seats them on the saddle)
  if (ud.riderFig && v.driver === 'player') ud.riderFig.visible = false;
  const legs = ud.horseLegs;
  if (!legs || v.wrecked) return;
  const s = Math.abs(v.speed);
  const gallop = s > 5.5;
  ud.gaitPhase = ((ud.gaitPhase || 0) + dt * (s < 0.2 ? 0 : 3 + s * (gallop ? 0.75 : 0.95))) % (Math.PI * 2);
  const ph = ud.gaitPhase, amp = Math.min(0.6, s * 0.09);
  // trot swings the diagonal pairs together; a gallop staggers them
  const lag = gallop ? 0.7 : 0;
  legs[0].rotation.z = Math.sin(ph) * amp;
  legs[3].rotation.z = Math.sin(ph + lag) * amp;
  legs[1].rotation.z = Math.sin(ph + Math.PI) * amp;
  legs[2].rotation.z = Math.sin(ph + Math.PI + lag) * amp;
  const bob = Math.abs(Math.sin(ph)) * amp * 0.12;
  ud.horseBody.position.y = bob;
  if (ud.riderFig) ud.riderFig.position.y = ud.riderBaseY + bob;
}

// --- bus (articulated "harmonica") ---------------------------------------------
// Front unit is the vehicle's real pose; the rear unit hangs off a pivot at the
// joint (userData.busRear) that scene3d swings from the bus's trail history.

const BUS_JOINT_FRAC = 0.6;
const BUS_JOINT_GAP = 0.2;
const BUS_WHITE = 0xe9e9e4;
const BUS_GREEN = 0x2f7d46;
const BUS_LIME = 0x9cc24a;
const BUS_ROOF = 3.0;
const BUS_SILL = 0.32;
const BUS_WHEEL_R = 0.5;

// One bus section from x0 (rear) to x1 (front); rounded roof edge at whichever
// end is exposed. doorXs: door centre positions on the kerb (+Z) side.
function spansBetween(x0, x1, arches, pad = 0.02) {
  const out = [];
  let a = x0;
  for (const { x, r } of arches) {
    if (x - r - pad > a) out.push([a, x - r - pad]);
    a = Math.max(a, x + r + pad);
  }
  if (x1 > a) out.push([a, x1]);
  return out;
}

function busSection(B, x0, x1, W, { front, rear, wheelXs, doorXs }) {
  const hw = W / 2;
  const R = BUS_WHEEL_R + 0.1;
  const arches = wheelXs.slice().sort((a, b) => a - b).map((x) => ({ x, r: R, cy: BUS_WHEEL_R }));
  const zs = hw + 0.006;
  const winY0 = 1.15, winY1 = 2.6;
  const inner0 = x0 + (rear ? 0.35 : 0.1), inner1 = x1 - (front ? 0.3 : 0.1);
  // hollow between the window lines, so the driver shows through the glass
  const top = [[x1, BUS_SILL + 0.1]];
  if (front) top.push([x1 + 0.03, 1.0], [x1 + 0.03, winY0]);
  else top.push([x1, winY0]);
  top.push([x0, winY0], [x0, BUS_SILL + 0.1]);
  B.geo(extrudeProfile([...top, ...archedSill(x0, x1, BUS_SILL, arches)], W, 0.06), null, BUS_WHITE);
  const roof = [[x1, winY1]];
  if (front) roof.push([x1, 2.7], [x1 - 0.25, BUS_ROOF]);
  else roof.push([x1, BUS_ROOF]);
  if (rear) roof.push([x0 + 0.25, BUS_ROOF], [x0, 2.75], [x0, winY1]);
  else roof.push([x0, BUS_ROOF], [x0, winY1]);
  B.geo(extrudeProfile(roof, W, 0.06), null, BUS_WHITE);
  const midY = (winY0 + winY1) / 2, winH = winY1 - winY0;
  for (const s of [1, -1]) {
    B.box((x0 + inner0) / 2, midY, s * (hw - 0.03), inner0 - x0, winH, 0.06, BUS_WHITE);
    B.box((inner1 + x1) / 2, midY, s * (hw - 0.03), x1 - inner1, winH, 0.06, BUS_WHITE);
  }
  if (rear) {
    B.box(x0 + 0.03, (winY0 + 1.65) / 2, 0, 0.06, 1.65 - winY0, W, BUS_WHITE);
    for (const s of [1, -1]) B.box(x0 + 0.03, (1.65 + winY1) / 2, s * (hw - 0.125), 0.06, winY1 - 1.65, 0.25, BUS_WHITE);
  } else B.box(x0 + 0.03, midY, 0, 0.06, winH, W, BUS_WHITE);
  if (!front) B.box(x1 - 0.03, midY, 0, 0.06, winH, W, BUS_WHITE);
  B.box((x0 + x1) / 2, winY0 + 0.012, 0, x1 - x0 - 0.12, 0.02, W - 0.12, 0x3a3d42);
  for (let x = inner0 + 0.6; x < inner1 - (front ? 1.2 : 0.4); x += 1.1) {
    for (const s of [1, -1]) B.box(x, winY0 + 0.3, s * hw * 0.5, 0.08, 0.55, hw * 0.78, 0x2f4f7a);
  }
  archLiners(B, arches, W);

  for (const s of [1, -1]) {
    const z = s * zs;
    for (const [a, b] of spansBetween(x0 + 0.03, x1 - 0.03, arches)) {
      B.box((a + b) / 2, 0.55, z, b - a, 0.42, 0.012, BUS_GREEN);
      B.box((a + b) / 2, 0.8, z, b - a, 0.07, 0.012, BUS_LIME);
    }
    B.box((inner0 + inner1) / 2, (winY0 + winY1) / 2, z, inner1 - inner0, winY1 - winY0, 0.012, GLASS, G_GLASS);
    const n = Math.max(2, Math.round((inner1 - inner0) / 1.45));
    for (let i = 0; i <= n; i++) {
      const x = inner0 + ((inner1 - inner0) * i) / n;
      B.box(x, (winY0 + winY1) / 2, s * (zs + 0.004), 0.09, winY1 - winY0 + 0.02, 0.01, TRIM);
    }
    B.box((inner0 + inner1) / 2, winY1 + 0.03, s * (zs + 0.004), inner1 - inner0, 0.05, 0.01, TRIM);
    B.box((inner0 + inner1) / 2, winY0 - 0.02, s * (zs + 0.004), inner1 - inner0, 0.04, 0.01, TRIM);
    if (s === 1) {
      for (const dx of doorXs) {
        // gesloten deurblad: lichtblauw glas boven een witte onderkant, dicht en dus niet door te kijken
        // (vroeger donker doorzichtig glas voor een lege romp: een dichte bus zag er open uit)
        B.box(dx, (BUS_SILL + 0.1 + 1.05) / 2, s * (zs + 0.008), 1.25, 1.05 - BUS_SILL - 0.1, 0.012, BUS_WHITE);
        B.box(dx, (1.05 + winY1) / 2, s * (zs + 0.008), 1.25, winY1 - 1.05, 0.012, 0x5f8299);
        B.box(dx, (BUS_SILL + 0.1 + winY1) / 2, s * (zs + 0.014), 0.05, winY1 - BUS_SILL - 0.05, 0.01, TRIM);
        for (const e of [-0.64, 0.64]) B.box(dx + e, (BUS_SILL + 0.1 + winY1) / 2, s * (zs + 0.014), 0.06, winY1 - BUS_SILL, 0.012, TRIM);
      }
    }
  }
  if (front) {
    B.box(x1 + 0.035, 1.8, 0, 0.012, 1.55, W - 0.24, GLASS, G_GLASS);
    B.box(x1 + 0.04, 2.8, 0, 0.012, 0.22, W * 0.7, 0x1b1b1c);
    B.box(x1 + 0.046, 2.8, 0, 0.01, 0.13, W * 0.55, 0xf0b33a, G_LAMP);
    B.box(x1 + 0.018, 0.6, 0, 0.012, 0.35, W - 0.1, BUS_GREEN);
    for (const s of [1, -1]) {
      B.box(x1 + 0.03, 0.62, s * (hw - 0.28), 0.02, 0.14, 0.34, HEADLAMP, G_LAMP);
      B.box(x1 - 0.35, 2.35, s * (hw + 0.28), 0.08, 0.34, 0.12, TRIM);
      B.box(x1 - 0.2, 2.55, s * (hw + 0.14), 0.05, 0.04, 0.3, TRIM);
    }
    B.box(x1 + 0.03, 0.47, 0, 0.012, 0.1, 0.48, PLATE);
  }
  if (rear) {
    B.box(x0 - 0.035, 2.1, 0, 0.012, 0.9, W - 0.5, GLASS, G_GLASS);
    B.box(x0 - 0.04, 0.95, 0, 0.012, 0.5, W - 0.6, 0x3a3b3d);
    for (const s of [1, -1]) {
      B.box(x0 - 0.045, 0.75, s * (hw - 0.25), 0.02, 0.35, 0.18, TAIL, G_LAMP);
      B.box(x0 - 0.045, 1.0, s * (hw - 0.25), 0.02, 0.1, 0.18, INDICATOR, G_LAMP);
    }
    B.box(x0 - 0.06, 0.45, 0, 0.012, 0.1, 0.48, PLATE);
  }
  const podLen = Math.min(4, (x1 - x0) * 0.45);
  B.box((x0 + x1) / 2 + (front ? 0.6 : -0.3), BUS_ROOF + 0.14, 0, podLen, 0.28, W * 0.72, 0xd6d6d0);
  B.box((x0 + x1) / 2 + (front ? 0.6 : -0.3), BUS_ROOF + 0.29, 0, podLen - 0.3, 0.03, W * 0.6, 0xa9aaa6);
}

function buildBusMesh(v) {
  const group = new THREE.Group();
  const len = v.model.len, wid = v.model.wid;
  const hl = len / 2;
  // model.trailer: the rear unit's length behind the body (an 18 m gelede
  // bus: the 11.2 m front unit is the physics body, vehicle.js
  // busTrailerPose); without it the joint sits inside the body's length
  const trailer = v.model.trailer || 0;
  const jointX = trailer ? -hl : hl - len * BUS_JOINT_FRAC;
  const frontLen = hl - jointX - BUS_JOINT_GAP;
  const frontX = hl - frontLen / 2;
  const rearLen = trailer ? trailer - BUS_JOINT_GAP : jointX + hl - BUS_JOINT_GAP;
  const rearX = -BUS_JOINT_GAP - rearLen / 2;
  const x0f = jointX + BUS_JOINT_GAP;
  const fwX = hl - 2.7, mwX = trailer ? x0f + 1.6 : x0f + 1.0;
  const rwX = trailer ? -BUS_JOINT_GAP - rearLen + 2.4 : -hl * 0.78 - jointX;
  const key = `bus|${len}|${wid}|${trailer}|${!!v.wrecked}`;
  const mats = vehicleMaterials(!!v.wrecked);

  const frontGeo = cached(key + '|f', () => {
    const B = new GeoBuilder(3);
    busSection(B, x0f, hl, wid, { front: true, rear: false, wheelXs: [fwX, mwX], doorXs: [hl - 1.05, (fwX + mwX) / 2] });
    const bel = new THREE.CylinderGeometry(wid / 2 * 0.96, wid / 2 * 0.96, BUS_ROOF - 0.45, 12, 1, true);
    B.geo(bel, composeMatrix(jointX, (BUS_ROOF + 0.45) / 2, 0), 0x2a2a2c);
    for (let i = 0; i < 3; i++) B.geo(new THREE.TorusGeometry(wid / 2 * 0.965, 0.025, 3, 12).rotateX(Math.PI / 2), composeMatrix(jointX, 0.9 + i * 0.75, 0), 0x3a3a3c);
    return B.build();
  });
  group.add(new THREE.Mesh(frontGeo, mats));

  const rear = new THREE.Group();
  rear.position.x = jointX;
  group.add(rear);
  const rearGeo = cached(key + '|r', () => {
    const B = new GeoBuilder(3);
    busSection(B, -BUS_JOINT_GAP - rearLen, -BUS_JOINT_GAP, wid, { front: false, rear: true, wheelXs: [rwX], doorXs: [-BUS_JOINT_GAP - (trailer ? 1.4 : 1.2)] });
    return B.build();
  });
  rear.add(new THREE.Mesh(rearGeo, mats));

  const wgeo = carWheelGeometry(BUS_WHEEL_R, 0.3);
  const wheels = [];
  const wz = wid / 2 - 0.2;
  for (const x of [fwX, mwX]) for (const s of [1, -1]) addWheel(group, wgeo, mats[0], x, BUS_WHEEL_R, s * wz, wheels);
  for (const s of [1, -1]) addWheel(rear, wgeo, mats[0], rwX, BUS_WHEEL_R, s * wz, wheels);

  group.userData.wheels = wheels;
  group.userData.frontWheels = wheels.slice(0, 2);
  group.userData.wheelRadius = BUS_WHEEL_R;
  group.userData.busRear = rear;
  group.userData.busSections = { frontLen, frontX, rearLen, rearX };

  if (v.isPolice) {
    const lamps = [];
    for (const s of [1, -1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, wid * 0.3), lampMaterial(0x2f6bff, 0.25));
      lamp.position.set(hl - 1, BUS_ROOF + 0.1, s * wid * 0.2);
      group.add(lamp);
      lamps.push(lamp);
    }
    group.userData.policeLamps = lamps;
  }
  return group;
}

// Swings the rear unit of a buildBusMesh() group to rearAngle (radians, world
// heading like v.angle). The joint allows BUS_JOINT_MAX_ANGLE (the same limit
// as TRAILER_MAX_ANGLE in vehicle.js), so a tight corner is not cut short;
// the clamp here only stops a teleported or interpolated pose from folding
// the unit double.
const BUS_JOINT_MAX_ANGLE = 1.1;
export function setBusRearAngle(mesh, busAngle, rearAngle) {
  const rear = mesh.userData.busRear;
  if (!rear) return;
  let d = (rearAngle - busAngle) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  else if (d < -Math.PI) d += Math.PI * 2;
  rear.rotation.y = -Math.max(-BUS_JOINT_MAX_ANGLE, Math.min(BUS_JOINT_MAX_ANGLE, d));
}

// Dutch police flash blue only: the two bar halves alternate while chasing,
// a double flash per side. Returns 1 (left half), -1 (right half) or 0 (dark);
// each unit gets its own phase so a convoy doesn't strobe in lockstep.
export function policeFlash(time, id = 0) {
  const off = ((id * 0.6180339) % 1 + 1) % 1;
  const phase = (time * 3 + off) % 1;
  if ((phase % 0.25) >= 0.16) return 0;
  return phase < 0.5 ? 1 : -1;
}

// Orange turn-signal lamps at the four corners, made the first time a car
// blinks and then only shown or hidden (hazards: all four, a signal: one side).
const IND_GEO = markShared(new THREE.BoxGeometry(0.2, 0.11, 0.16));
const IND_GEO_SMALL = markShared(new THREE.BoxGeometry(0.07, 0.05, 0.06));
const IND_GEO_TINY = markShared(new THREE.BoxGeometry(0.045, 0.04, 0.045));
const IND_MAT = markShared(new THREE.MeshBasicMaterial({ color: 0xff9a1a }));
const IND_PERIOD = 0.62;
export function updateIndicatorLamps(mesh, v, time) {
  let lamps = mesh.userData.indLamps;
  if (!lamps) {
    if (!v.indicator) return;
    const m = v.model || {};
    const len = m.len || 4, wid = m.wid || 1.7;
    const two = !!(v.isBike && !m.motorbike);
    const bike = !!(m.motorbike || v.isBike || v.isScooter);
    lamps = [];
    // a bicycle gets two tiny lamps on the handlebar ends (like the stuurlampjes on a modern fiets),
    // a scooter or motorbike small lamps on the bars and at the tail, a car blocks at the corners
    const spots = [];
    if (two) for (const side of [-1, 1]) spots.push([0.22, 1.02, side * 0.3, side]);
    else if (bike) for (const side of [-1, 1]) { spots.push([len * 0.3, 0.95, side * 0.3, side]); spots.push([-len / 2 + 0.1, 0.7, side * 0.12, side]); }
    else for (const side of [-1, 1]) for (const end of [1, -1]) spots.push([end * (len / 2 + 0.01), m.van ? 0.95 : 0.66, side * (wid / 2 - 0.16), side]);
    for (const [x, y, z, side] of spots) {
      const l = new THREE.Mesh(two ? IND_GEO_TINY : bike ? IND_GEO_SMALL : IND_GEO, IND_MAT);
      l.position.set(x, y, z);
      l.visible = false;
      l.userData.side = side;
      mesh.add(l);
      lamps.push(l);
    }
    mesh.userData.indLamps = lamps;
  }
  const on = !!v.indicator && Math.floor(time / IND_PERIOD) % 2 === 0;
  for (const l of lamps) l.visible = on && (v.indicator === 'hazard' || (v.indicator === 'left' ? l.userData.side < 0 : l.userData.side > 0));
}

export function updatePoliceLamps(mesh, time, chasing, id = 0) {
  const lamps = mesh.userData.policeLamps;
  if (!lamps) return;
  if (!chasing) {
    for (const l of lamps) l.material.emissiveIntensity = 0.25;
    return;
  }
  const f = policeFlash(time, id);
  lamps[0].material.emissiveIntensity = f === 1 ? 3 : 0.1;
  if (lamps[1]) lamps[1].material.emissiveIntensity = f === -1 ? 3 : 0.1;
}

// --- boat ---------------------------------------------------------------------
// Lofted hulls per boat kind (boattypes.js): gunwale and chine outlines per
// station, flat or pointed transom. The keel sits below y=0 (scene3d parks
// the group at water level). Flags are the Groningen city flag (green, white,
// green); nav lights sit in the lamp group so nightlights3d can make them glow.

const NAV_RED = 0xff2a1a, NAV_GREEN = 0x26ff5a, NAV_WHITE = 0xf2ead2;
const GRN_FLAG = 0x1f8a3c, WHITE_FLAG = 0xf2f0ea;
const WOOD = 0x9a7048, DECK = 0xb08658, KEEL = 0x5a2a22;

const HULL_SHAPES = {
  sloep: {
    ts: [0, 0.14, 0.32, 0.52, 0.68, 0.8, 0.9, 1],
    f: (t) => (t < 0.55 ? 0.86 + 0.14 * Math.sin((t / 0.55) * Math.PI / 2) : Math.cos(((t - 0.55) / 0.45) * Math.PI / 2)),
    top: (t) => 0.5 + 0.22 * t * t, rise: (t) => Math.max(0, (t - 0.6) / 0.4), chine: -0.08, keel: -0.2, floor: 0.14,
  },
  rondvaart: {
    ts: [0, 0.06, 0.2, 0.45, 0.7, 0.8, 0.88, 0.95, 1],
    f: (t) => (t < 0.06 ? 0.9 + 0.1 * Math.sin((t / 0.06) * Math.PI / 2) : t < 0.72 ? 1 : Math.pow(Math.cos(((t - 0.72) / 0.28) * Math.PI / 2), 0.75)),
    top: (t) => 0.52 + 0.14 * Math.max(0, (t - 0.7) / 0.3) ** 2, rise: (t) => Math.max(0, (t - 0.75) / 0.25), chine: -0.14, keel: -0.3, floor: 0.14,
  },
  kano: {
    ts: [0, 0.05, 0.14, 0.3, 0.5, 0.7, 0.86, 0.95, 1],
    f: (t) => Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.5),
    top: (t) => 0.3 + 0.14 * (2 * t - 1) ** 4, rise: (t) => Math.abs(2 * t - 1) ** 2, chine: -0.07, keel: -0.13, floor: 0.06,
  },
  kajak: {
    ts: [0, 0.05, 0.14, 0.3, 0.5, 0.7, 0.86, 0.95, 1],
    f: (t) => Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.6),
    top: (t) => 0.2 + 0.06 * (2 * t - 1) ** 2, rise: (t) => Math.abs(2 * t - 1) ** 2, chine: -0.05, keel: -0.11, floor: 0.04, deck: true,
  },
  dinghy: {
    ts: [0, 0.16, 0.36, 0.55, 0.72, 0.86, 1],
    f: (t) => (t < 0.45 ? 0.8 + 0.2 * Math.sin((t / 0.45) * Math.PI / 2) : Math.pow(Math.cos(((t - 0.45) / 0.55) * Math.PI / 2), 0.7)),
    top: (t) => 0.42 + 0.12 * t * t, rise: (t) => Math.max(0, (t - 0.55) / 0.45), chine: -0.05, keel: -0.15, floor: 0.08,
  },
  rubberboot: {
    ts: [0, 0.14, 0.32, 0.52, 0.68, 0.82, 0.92, 1],
    f: (t) => (t < 0.6 ? 0.9 + 0.1 * Math.sin((t / 0.6) * Math.PI / 2) : Math.pow(Math.cos(((t - 0.6) / 0.4) * Math.PI / 2), 0.8)),
    top: (t) => 0.24 + 0.14 * t * t, rise: (t) => Math.max(0, (t - 0.6) / 0.4), chine: -0.06, keel: -0.17, floor: 0.1,
  },
  // stand-up paddle board: a thin flat board with a little nose rocker
  sup: {
    ts: [0, 0.06, 0.2, 0.5, 0.72, 0.86, 0.95, 1],
    f: (t) => (t < 0.08 ? 0.72 + 0.28 * Math.sin((t / 0.08) * Math.PI / 2) : t < 0.66 ? 1 : Math.pow(Math.cos(((t - 0.66) / 0.34) * Math.PI / 2), 0.6)),
    top: (t) => 0.1 + 0.06 * Math.max(0, (t - 0.78) / 0.22) ** 2, rise: () => 0, chine: 0.02, keel: -0.04, floor: 0.08, deck: true, chineK: 0.92,
  },
  // rowing: a slim decked shell, pointed at both ends (single scull, coxed eight)
  skiff: {
    ts: [0, 0.04, 0.14, 0.32, 0.5, 0.68, 0.86, 0.96, 1],
    f: (t) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, t * 0.98 + 0.01))), 0.62),
    top: () => 0.11, rise: () => 0, chine: -0.02, keel: -0.08, floor: 0.04, deck: true, chineK: 0.85,
  },
  acht: {
    ts: [0, 0.03, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95, 1],
    f: (t) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, t * 0.98 + 0.01))), 0.55),
    top: () => 0.13, rise: () => 0, chine: -0.02, keel: -0.1, floor: 0.04, deck: true, chineK: 0.85,
  },
  // Inland barge (spits, Kempenaar): a long box hull with a rounded bow, a
  // slightly raked stern and a flat bottom; hold, hatches and the wheelhouse
  // aft come from binnenvaartFit
  binnenvaart: {
    ts: [0, 0.03, 0.08, 0.2, 0.5, 0.8, 0.92, 0.97, 1],
    f: (t) => (t < 0.08 ? 0.45 + 0.55 * Math.sin((t / 0.08) * Math.PI / 2) : t < 0.92 ? 1 : 0.86 + 0.14 * Math.cos(((t - 0.92) / 0.08) * Math.PI / 2)),
    top: (t) => 1.1 + 0.2 * Math.max(0, (t - 0.9) / 0.1) + 0.28 * Math.max(0, (0.08 - t) / 0.08),
    rise: (t) => Math.max(0, (t - 0.9) / 0.1) * 0.3, chine: -0.7, keel: -1.0, floor: 0.35, chineK: 0.93,
  },
  // sea ships and the tug (#398): zeeschip3d.js
  zeeschip: ZEESCHIP_SHAPE,
  sleper: SLEPER_SHAPE,
  // Frisian skûtsje: flat bottom, full round bow with a high sheer, a
  // squarish stern; the hold is decked over with hatches (skutsjeFit)
  skutsje: {
    ts: [0, 0.04, 0.12, 0.3, 0.55, 0.72, 0.84, 0.92, 0.97, 1],
    f: (t) => (t < 0.12 ? 0.8 + 0.2 * Math.sin((t / 0.12) * Math.PI / 2) : t < 0.72 ? 1 : Math.pow(Math.cos(((t - 0.72) / 0.28) * Math.PI / 2), 0.42)),
    top: (t) => 0.62 + 0.46 * Math.max(0, (t - 0.68) / 0.32) ** 2 + 0.12 * Math.max(0, (0.12 - t) / 0.12) ** 2,
    rise: (t) => Math.max(0, (t - 0.82) / 0.18), chine: -0.12, keel: -0.26, floor: 0.2, chineK: 0.9,
  },
};

// Gunwale heights over the waterline at stern, middle and bow (scene3d.js
// keeps them clear of the swell when the boat pitches and rolls).
const hullProfiles = new Map();
export function boatHullProfile(kind, L, W) {
  const key = kind + '|' + L + '|' + W;
  let p = hullProfiles.get(key);
  if (!p) {
    const S = HULL_SHAPES[kind];
    if (!S) p = { stern: 0.36, mid: 0.36, bow: 0.36 };
    else {
      const st = hullStations(L, W, S);
      p = { stern: st[0].top, mid: hullAt(st, 0).top, bow: st[st.length - 1].top };
    }
    hullProfiles.set(key, p);
  }
  return p;
}

function hullStations(L, W, S) {
  const hl = L / 2;
  return S.ts.map((t) => {
    const hw = (W / 2) * Math.max(0, S.f(t));
    const r = S.rise(t);
    return {
      x: -hl + t * L, t, hw,
      top: S.top(t),
      chineW: hw * (S.chineK || 0.72),
      chine: S.chine + (0.22 - S.chine * 0.5) * r * r,
      keel: S.keel + (0.2 - S.keel) * r * r * r,
    };
  });
}

// Half-width and gunwale height of the hull at local x.
function hullAt(st, x) {
  for (let i = 0; i < st.length - 1; i++) {
    const a = st[i], b = st[i + 1];
    if (x >= a.x && x <= b.x) {
      const k = (x - a.x) / (b.x - a.x || 1);
      return { hw: a.hw + (b.hw - a.hw) * k, top: a.top + (b.top - a.top) * k };
    }
  }
  const e = x < st[0].x ? st[0] : st[st.length - 1];
  return { hw: e.hw, top: e.top };
}

function hullShell(B, st, hull, trim, floorY, deck) {
  for (let i = 0; i < st.length - 1; i++) {
    const a = st[i], b = st[i + 1];
    for (const s of [1, -1]) {
      const out = [0, 0, s];
      const aT = [a.x, a.top, s * a.hw], bT = [b.x, b.top, s * b.hw];
      const aS = [a.x, a.top - 0.07, s * a.hw * 0.995], bS = [b.x, b.top - 0.07, s * b.hw * 0.995];
      const aC = [a.x, a.chine, s * a.chineW], bC = [b.x, b.chine, s * b.chineW];
      const aK = [a.x, a.keel, 0], bK = [b.x, b.keel, 0];
      B.quadOut(aS, bS, bT, aT, out, trim);
      B.quadOut(aC, bC, bS, aS, out, hull);
      B.quadOut(aK, bK, bC, aC, [0, -1, s * 0.5], KEEL);
      if (deck) {
        const ridge = (p) => [p.x, p.top + 0.05 * Math.min(1, p.hw / 0.2), 0];
        B.quadOut(aT, bT, ridge(b), ridge(a), [0, 1, s * 0.4], hull);
        continue;
      }
      const inA = Math.min(0.06, a.hw * 0.4), inB = Math.min(0.06, b.hw * 0.4);
      const aI = [a.x, a.top, s * (a.hw - inA)], bI = [b.x, b.top, s * (b.hw - inB)];
      B.quadOut(aT, bT, bI, aI, [0, 1, 0], WOOD);
      const aF = [a.x, floorY, s * Math.max(0, a.hw - 0.12)], bF = [b.x, floorY, s * Math.max(0, b.hw - 0.12)];
      B.quadOut(aI, bI, bF, aF, [0, 0, -s], shadeHex(hull, 0.9));
      B.quadOut(aF, bF, [b.x, floorY, 0], [a.x, floorY, 0], [0, 1, 0], DECK);
    }
  }
  const s0 = st[0];
  if (s0.hw > 0.05) {
    B.quadOut([s0.x, s0.top, s0.hw], [s0.x, s0.top, -s0.hw], [s0.x, s0.chine, -s0.chineW], [s0.x, s0.chine, s0.chineW], [-1, 0, 0], hull);
    B.triOut([s0.x, s0.chine, s0.chineW], [s0.x, s0.chine, -s0.chineW], [s0.x, s0.keel, 0], [-1, 0, 0], KEEL);
    if (!deck) B.quadOut([s0.x + 0.001, s0.top, s0.hw - 0.12], [s0.x + 0.001, s0.top, -(s0.hw - 0.12)], [s0.x + 0.001, floorY, -(s0.hw - 0.12)], [s0.x + 0.001, floorY, s0.hw - 0.12], [1, 0, 0], shadeHex(hull, 0.9));
  }
}

// Groningen city flag on a pole: three equal horizontal bands, green-white-
// green, the cloth streaming aft (-x) with a slight ripple.
function cityFlag(B, x, baseY, z, poleH = 0.8, len = 0.36, h = 0.24) {
  const topY = baseY + poleH;
  B.geo(tubeGeometry([x, baseY, z], [x - 0.04, topY + 0.04, z], 0.012, 0.009, 4), null, 0x6a5038);
  const segs = 4, bands = [GRN_FLAG, WHITE_FLAG, GRN_FLAG];
  for (let i = 0; i < segs; i++) {
    const x0 = x - 0.045 - len * (i / segs), x1 = x - 0.045 - len * ((i + 1) / segs);
    const z0 = z + 0.03 * Math.sin(i * 1.7), z1 = z + 0.03 * Math.sin((i + 1) * 1.7);
    const sag0 = 0.012 * i, sag1 = 0.012 * (i + 1);
    for (let b = 0; b < 3; b++) {
      const y0 = topY - (h * b) / 3, y1 = topY - (h * (b + 1)) / 3;
      const q = [[x0, y0 - sag0, z0], [x1, y0 - sag1, z1], [x1, y1 - sag1, z1], [x0, y1 - sag0, z0]];
      B.quadOut(q[0], q[1], q[2], q[3], [0, 0, 1], bands[b]);
      B.quadOut(q[0], q[1], q[2], q[3], [0, 0, -1], bands[b]);
    }
  }
}

// Port (left, -z) red, starboard green, white stern light.
function navLights(B, st, L, sternY) {
  const hl = L / 2;
  const x = hl * 0.45;
  const h = hullAt(st, x);
  B.box(x, h.top + 0.035, -(h.hw + 0.005), 0.1, 0.05, 0.03, NAV_RED, G_LAMP);
  B.box(x, h.top + 0.035, h.hw + 0.005, 0.1, 0.05, 0.03, NAV_GREEN, G_LAMP);
  B.box(-hl + 0.02, sternY, 0, 0.04, 0.06, 0.06, NAV_WHITE, G_LAMP);
}

function sloepFit(B, st, L, W, hull, cabin, police) {
  const hl = L / 2;
  const benchW = W * 0.8;
  B.box(-hl + 0.3, 0.36, 0, 0.36, 0.06, benchW * 0.95, WOOD);
  B.box(-hl + 0.3, 0.25, 0, 0.3, 0.2, benchW * 0.8, shadeHex(hull, 0.85));
  for (const s of [1, -1]) B.box(-hl + 0.9, 0.36, s * (benchW / 2 - 0.12), 1.0, 0.06, 0.24, WOOD);
  B.box(hl * 0.35, 0.36, 0, 0.28, 0.06, W * 0.62, WOOD);
  if (cabin) {
    const cx0 = -hl * 0.35, cx1 = hl * 0.35;
    const cw = W * 0.72;
    const cabinTop = 1.2;
    B.box((cx0 + cx1) / 2, (0.14 + 0.85) / 2, 0, cx1 - cx0, 0.71, cw, police ? 0xeceae4 : shadeHex(hull, 0.95));
    B.box((cx0 + cx1) / 2 - 0.03, 1.02, 0, cx1 - cx0 - 0.08, 0.34, cw - 0.04, GLASS, G_GLASS);
    B.box((cx0 + cx1) / 2, cabinTop + 0.02, 0, cx1 - cx0 + 0.15, 0.07, cw + 0.06, cabin);
    for (const s of [1, -1]) B.box(cx0 + 0.03, 1.02, s * (cw / 2 - 0.03), 0.06, 0.34, 0.06, cabin);
    if (!police) {
      B.box(cx1 - 0.1, cabinTop + 0.2, 0, 0.05, 0.36, 0.05, 0x2a2a2b);
      B.box(cx1 - 0.1, cabinTop + 0.39, 0, 0.06, 0.06, 0.06, NAV_WHITE, G_LAMP);
    }
  } else {
    const cx = hl * 0.05, cz = W * 0.18;
    B.box(cx, 0.45, cz, 0.4, 0.62, 0.36, shadeHex(hull, 0.9));
    B.box(cx + 0.19, 0.86, cz, 0.02, 0.2, 0.4, GLASS, G_GLASS, 0, 0, 0.35);
    B.geo(new THREE.TorusGeometry(0.1, 0.012, 3, 10).rotateY(Math.PI / 2), composeMatrix(cx - 0.24, 0.86, cz, 0, 0, 0.5), 0x2a2a2b);
    // helmsman's seat behind the console
    B.box(cx - 0.62, 0.31, cz, 0.34, 0.34, 0.36, shadeHex(hull, 0.85));
    B.box(cx - 0.62, 0.48, cz, 0.36, 0.04, 0.38, WOOD);
    B.box(cx - 0.8, 0.68, cz, 0.04, 0.36, 0.34, WOOD, 0, 0, 0, 0.12);
  }
  cityFlag(B, -hl + 0.05, 0.5, 0);
}

// Inland barge: decks fore and aft, a coaming with hatch covers over the
// hold, a wheelhouse with a radar mast aft, bollards and a bow winch. The
// livery colour is the hull; `cabin` paints the wheelhouse and the hatches.
function binnenvaartFit(B, st, L, W, hull, cabin) {
  const hl = L / 2;
  const hatch = shadeHex(hull, 1.35), dark = shadeHex(hull, 0.7);
  const foreX = hl - 0.6, holdFore = hl - 6.5, holdAft = -hl + 11, aftX = -hl + 0.6;
  // decks fore and aft of the hold
  for (const [x0, x1] of [[holdFore, foreX], [aftX, holdAft]]) {
    for (let x = x0; x < x1 - 0.01; x += 1.2) {
      const xm = Math.min(x1, x + 1.2), h = hullAt(st, (x + xm) / 2);
      B.box((x + xm) / 2, h.top - 0.04, 0, xm - x, 0.08, Math.max(0.2, h.hw * 2 - 0.1), 0x5d5f60);
    }
  }
  // gunwale strip and hatch coaming
  const deckTop = st[Math.floor(st.length / 2)].top;
  const cw = W - 1.2, cl = holdFore - holdAft;
  B.box((holdFore + holdAft) / 2, deckTop + 0.2, 0, cl, 0.4, cw, dark);
  // hatch covers: a row of ridged boxes, the ribs a shade darker
  const n = Math.max(3, Math.round(cl / 4.2)), hlen = cl / n;
  for (let i = 0; i < n; i++) {
    const x = holdAft + hlen * (i + 0.5);
    B.box(x, deckTop + 0.5, 0, hlen - 0.18, 0.2, cw - 0.2, hatch);
    B.box(x, deckTop + 0.63, 0, hlen - 0.5, 0.08, cw - 0.7, shadeHex(hatch, 0.9));
  }
  // wheelhouse aft: a box with a window band, an overhanging roof, a mast
  const wx = -hl + 3.6, wl = 4.6, ww = Math.min(W * 0.78, W - 1.0), base = deckTop;
  B.box(wx, base + 0.9, 0, wl, 1.8, ww, cabin);
  B.box(wx + 0.05, base + 1.15, 0, wl - 0.2, 0.7, ww + 0.06, GLASS, G_GLASS);
  B.box(wx + 0.05, base + 1.15, 0, wl + 0.02, 0.7, ww - 0.9, GLASS, G_GLASS);
  B.box(wx, base + 1.9, 0, wl + 0.6, 0.12, ww + 0.5, shadeHex(cabin, 0.8));
  B.box(wx - 1.2, base + 2.05, 0, 0.5, 0.18, 0.5, 0x3a3c3e);
  // radar mast, folded height: its top is the barge's air draft (4.2 m)
  B.box(wx + 0.4, base + 2.5, 0, 0.12, 1.1, 0.12, 0x2a2a2b);
  B.box(wx + 0.4, base + 3.05, 0, 0.5, 0.1, 0.9, 0x2a2a2b);
  B.box(wx + 0.4, base + 3.17, 0, 0.1, 0.1, 0.1, NAV_WHITE, G_LAMP);
  // fixed-bridge bow: winch, bollards and a bow lamp
  B.box(hl - 2.2, deckTop + 0.3, 0, 1.2, 0.6, 1.4, dark);
  for (const s of [1, -1]) {
    B.box(hl - 1.0, deckTop + 0.25, s * (W / 2 - 0.6), 0.3, 0.5, 0.3, 0x2a2a2b);
    B.box(-hl + 1.0, deckTop + 0.25, s * (W / 2 - 0.6), 0.3, 0.5, 0.3, 0x2a2a2b);
  }
  B.box(hl - 0.5, deckTop + 1.0, 0, 0.08, 1.4, 0.08, 0x2a2a2b);
  B.box(hl - 0.5, deckTop + 1.75, 0, 0.1, 0.1, 0.1, NAV_WHITE, G_LAMP);
  // stern light and the colour stripe of the name board
  B.box(-hl + 0.02, deckTop + 0.5, 0, 0.06, 0.1, 0.1, NAV_WHITE, G_LAMP);
  for (const s of [1, -1]) B.box(hl * 0.55, deckTop - 0.35, s * (hullAt(st, hl * 0.55).hw + 0.005), 3.2, 0.3, 0.03, 0xe8e6e0);
}

function rondvaartFit(B, st, L, W, hull, cabin) {
  const hl = L / 2;
  const iw = W / 2 - 0.16;
  for (let x = hl - 2.1; x > -hl + 1.6; x -= 0.95) {
    for (const s of [1, -1]) {
      B.box(x, 0.39, s * (iw + 0.15) / 2, 0.4, 0.06, iw - 0.15, WOOD);
      B.box(x, 0.26, s * (iw + 0.15) / 2, 0.32, 0.2, iw - 0.2, shadeHex(hull, 0.8));
      B.box(x - 0.24, 0.62, s * (iw + 0.15) / 2, 0.05, 0.42, iw - 0.15, cabin, 0, 0, 0, 0.1);
    }
  }
  // glass-roofed canopy on slim posts
  const rx0 = -hl + CANOPY.back, rx1 = hl - CANOPY.front, roofY = CANOPY.roofY;
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const x = rx0 + ((rx1 - rx0) * i) / n;
    for (const s of [1, -1]) B.box(x, (0.55 + roofY) / 2, s * (W / 2 - 0.08), 0.05, roofY - 0.55, 0.05, cabin);
  }
  for (const s of [1, -1]) {
    B.box((rx0 + rx1) / 2, roofY, s * (W / 2 - 0.08), rx1 - rx0 + 0.1, 0.07, 0.08, cabin);
    B.box((rx0 + rx1) / 2, 0.78, s * (W / 2 - 0.06), rx1 - rx0, 0.05, 0.04, cabin);
  }
  B.box((rx0 + rx1) / 2, roofY + 0.06, 0, rx1 - rx0 + 0.1, 0.04, W - 0.12, GLASS, G_GLASS);
  for (const x of [rx0, rx1]) B.box(x, roofY + 0.02, 0, 0.08, 0.08, W - 0.12, cabin);
  // the bow rail on the open foredeck (boatdeck.js RAIL, one source with the deck moment where the pair leans on it): slim
  // stanchions along the gunwale from the canopy to the bow and a rounded top rail that meets at the stem
  {
    const x0 = rx1 + 0.05, x1 = hl - RAIL.stemBack, steps = 5, pts = [];
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps, h = hullAt(st, x);
      pts.push({ x, z: Math.max(0.06, h.hw - RAIL.inset), top: h.top });
    }
    for (const s of [1, -1]) {
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        B.geo(tubeGeometry([p.x, p.top, s * p.z], [p.x, RAIL.y, s * p.z], 0.014, 0.014, 5), null, RAIL.color);
        if (i) { const q = pts[i - 1]; B.geo(tubeGeometry([q.x, RAIL.y, s * q.z], [p.x, RAIL.y, s * p.z], 0.02, 0.02, 6), null, RAIL.color); }
      }
    }
    const tip = pts[pts.length - 1];
    B.geo(tubeGeometry([tip.x, RAIL.y, tip.z], [tip.x, RAIL.y, -tip.z], 0.02, 0.02, 6), null, RAIL.color);
  }
  // skipper's stool and wheel at the stern
  B.box(-hl + 0.75, 0.38, 0, 0.3, 0.48, 0.3, 0x2a2a2b);
  B.box(-hl + 0.75, 0.6, 0, 0.34, 0.04, 0.34, WOOD);
  B.box(-hl + 1.2, 0.55, 0, 0.3, 0.82, 0.5, cabin);
  B.geo(new THREE.TorusGeometry(0.14, 0.014, 3, 12).rotateY(Math.PI / 2), composeMatrix(-hl + 1.04, 1.0, 0, 0, 0, 0.45), 0x2a2a2b);
  cityFlag(B, -hl + 0.08, 0.55, 0, 1.0, 0.5, 0.33);
  cityFlag(B, hl - 0.2, 0.66, 0, 0.7, 0.3, 0.2);
  // mast light above the canopy
  B.box(rx1 - 0.2, roofY + 0.25, 0, 0.04, 0.4, 0.04, 0x2a2a2b);
  B.box(rx1 - 0.2, roofY + 0.48, 0, 0.07, 0.07, 0.07, NAV_WHITE, G_LAMP);
}

function kanoFit(B, st, L, W, hull) {
  const hl = L / 2;
  for (const x of [-hl * 0.58, hl * 0.5]) {
    const h = hullAt(st, x);
    B.box(x, 0.15, 0, 0.26, 0.04, h.hw * 2 - 0.1, WOOD);
  }
  const h = hullAt(st, 0);
  B.box(0, h.top - 0.02, 0, 0.06, 0.04, h.hw * 2 - 0.06, WOOD);
}

function supFit(B, st) {
  // grippy deck pad where the paddler stands
  const h = hullAt(st, -0.15);
  B.box(-0.15, h.top + 0.05, 0, 0.9, 0.012, h.hw * 1.5, 0x2a2c2e);
  B.box(-0.55, h.top + 0.055, 0, 0.12, 0.02, h.hw * 1.5, 0x1e1f21);
}

// Rowing gear: sliding seats, riggers out to the oarlocks, long oars with
// flat blades on the water (the rowers' hands animate in seating3d 'row').
function rowFit(B, st, L, W, hull, trimColor, seatXs, sweep = false) {
  const hl = L / 2;
  const blade = trimColor, shaft = 0x1c1c1e;
  seatXs.forEach((x, i) => {
    B.box(x, 0.13, 0, 0.3, 0.025, 0.2, 0x2a2b2d);
    B.box(x + 0.34, 0.12, 0, 0.1, 0.03, 0.34, 0x2a2b2d);
    // a single scull has two oars; in an eight each rower has one, alternating sides
    for (const s of sweep ? [i % 2 ? 1 : -1] : [1, -1]) {
      const lx = x + 0.1, lz = s * (W / 2 + 0.52);
      B.geo(tubeGeometry([lx, 0.12, s * 0.15], [lx - 0.04, 0.24, lz], 0.012, 0.01, 4), null, 0x9aa0a6);
      B.geo(tubeGeometry([lx - 0.04, 0.24, s * 0.18], [lx - 0.04, 0.24, lz], 0.01, 0.01, 4), null, 0x9aa0a6);
      B.geo(tubeGeometry([lx - 0.45, 0.3, sweep ? -s * 0.12 : s * 0.2], [lx + 0.08, 0.25, s * (W / 2 + 0.55)], 0.016, 0.016, 5), null, shaft);
      B.geo(tubeGeometry([lx + 0.08, 0.25, s * (W / 2 + 0.55)], [lx + 0.5, 0.2, s * (W / 2 + 1.55)], 0.016, 0.016, 5), null, shaft);
      B.box(lx + 0.62, 0.17, s * (W / 2 + 1.78), 0.46, 0.012, 0.2, blade, 0, 0, 0, 0);
    }
  });
  B.box(hl - 0.1, 0.12, 0, 0.07, 0.06, 0.06, NAV_WHITE, G_LAMP);
  B.box(-hl + 0.05, 0.12, 0, 0.07, 0.05, 0.05, NAV_WHITE, G_LAMP);
}

function acht(B, st, L, W, hull, trimColor) {
  const hl = L / 2;
  const xs = [];
  for (let i = 0; i < 8; i++) xs.push(-hl + 2.4 + i * 1.55);
  rowFit(B, st, L, W, hull, trimColor, xs, true);
  // the cox's seat and a stern flag in the club colours
  B.box(-hl + 0.7, 0.14, 0, 0.5, 0.03, 0.34, 0x2a2b2d);
  B.geo(tubeGeometry([-hl + 0.3, 0.14, 0], [-hl + 0.28, 0.75, 0], 0.008, 0.008, 4), null, 0x6a5038);
  B.box(-hl + 0.12, 0.66, 0, 0.3, 0.14, 0.012, trimColor);
}

function kajakFit(B) {
  const coam = new THREE.TorusGeometry(1, 0.08, 3, 14).rotateX(Math.PI / 2);
  B.geo(coam, composeMatrix(-0.12, 0.25, 0, 0, 0, 0, 0.36, 0.3, 0.22), 0x1e1e20);
  B.geo(new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2), composeMatrix(-0.12, 0.245, 0, 0, 0, 0, 0.34, 1, 0.2), 0x121214);
}

function dinghyFit(B, st, L) {
  const hl = L / 2;
  for (const x of [0.1, -hl + 0.38]) {
    const h = hullAt(st, x);
    B.box(x, 0.3, 0, 0.26, 0.04, h.hw * 2 - 0.08, WOOD);
  }
  for (const s of [1, -1]) B.geo(tubeGeometry([-0.6, 0.4, s * 0.38], [1.0, 0.36, s * 0.3], 0.018, 0.018, 4), null, 0x8a6440);
  outboard(B, -hl, 0.45, 0.8);
}

function outboard(B, x, y, k = 1) {
  B.box(x - 0.12 * k, y + 0.12 * k, 0, 0.24 * k, 0.26 * k, 0.2 * k, 0x1e2226);
  B.box(x - 0.1 * k, y - 0.14 * k, 0, 0.08 * k, 0.5 * k, 0.08 * k, 0x2a2e33);
  B.box(x + 0.05 * k, y + 0.05 * k, 0, 0.26 * k, 0.03 * k, 0.03 * k, 0x2a2e33, 0, 0, 0, -0.2);
}

function rubberFit(B, st, L, W, tube, accent) {
  const hl = L / 2;
  const R = 0.2;
  const rad = (p) => R * (1 - 0.3 * p.t ** 3);
  const ctr = (p, s) => [p.x, 0.3 + 0.2 * Math.max(0, (p.t - 0.6) / 0.4) ** 2, s * Math.max(0, p.hw - R * 0.9)];
  for (const s of [1, -1]) {
    for (let i = 0; i < st.length - 1; i++) {
      const a = ctr(st[i], s), b = ctr(st[i + 1], s);
      B.geo(tubeGeometry(a, b, rad(st[i]), rad(st[i + 1]), 7), null, tube);
      B.geo(new THREE.SphereGeometry(rad(st[i]), 7, 4), composeMatrix(a[0], a[1], a[2]), tube);
    }
    const a = ctr(st[2], s), b = ctr(st[4], s);
    B.geo(tubeGeometry([a[0], a[1] + 0.03, a[2] * 1.08], [b[0], b[1] + 0.03, b[2] * 1.08], 0.13, 0.12, 5), null, accent);
  }
  const tip = st[st.length - 1];
  B.geo(new THREE.SphereGeometry(rad(tip), 7, 4), composeMatrix(tip.x, 0.5, 0), tube);
  B.box(0.15, 0.36, 0, 0.36, 0.52, 0.42, shadeHex(accent, 0.9));
  B.box(0.26, 0.7, 0, 0.02, 0.18, 0.44, GLASS, G_GLASS, 0, 0, 0.4);
  B.box(-0.35, 0.3, 0, 0.36, 0.3, W - 0.8, 0x2a2a2b);
  outboard(B, -hl + 0.02, 0.4, 1.1);
}

function waterfietsFit(B, L, W, color, accent) {
  const hl = L / 2;
  for (const s of [1, -1]) {
    const pz = s * (W / 2 - 0.22);
    B.geo(new THREE.SphereGeometry(1, 12, 6), composeMatrix(0, 0.02, pz, 0, 0, 0, hl * 0.98, 0.25, 0.22), color);
    B.geo(new THREE.SphereGeometry(1, 12, 3, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.12), composeMatrix(0, 0.02, pz, 0, 0, 0, hl * 0.99, 0.252, 0.222), accent);
  }
  B.box(-0.05, 0.29, 0, 1.9, 0.06, W - 0.35, accent);
  B.box(-0.15, 0.52, 0, 0.44, 0.06, W - 0.35, color);
  B.box(-0.15, 0.4, 0, 0.36, 0.2, W - 0.5, shadeHex(accent, 0.8));
  B.box(-0.4, 0.8, 0, 0.06, 0.52, W - 0.35, color, 0, 0, 0, 0.18);
  B.box(0.35, 0.42, 0, 0.3, 0.2, 0.3, shadeHex(accent, 0.8));
  const wheel = new THREE.CylinderGeometry(0.34, 0.34, 0.46, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2);
  B.geo(wheel, composeMatrix(-0.95, 0.3, 0), accent);
  B.box(0.75, 0.62, 0, 0.04, 0.6, 0.04, 0x8a8e92);
  B.box(0.75, 0.9, 0, 0.05, 0.03, 0.4, 0x2a2a2b);
  cityFlag(B, -1.15, 0.32, 0, 0.9, 0.26, 0.17);
  B.box(-1.19, 1.25, 0, 0.05, 0.05, 0.05, NAV_WHITE, G_LAMP);
}

// --- skûtsje -------------------------------------------------------------------
// Tarred black hull with a varnished wale, decked hold with green hatches,
// fan-shaped leeboards (zwaarden) on both sides, a big rudder with a curved
// tiller. The rig is a separate child (buildSkutsjeRig) so it can be trimmed
// and struck under bridges: animateSkutsjeRig.

const VARNISH = 0x8a5a2c, TAR = 0x141516, HATCH = 0x1f5a3a, SAIL_BROWN = 0x7e3419, SPAR = 0x6a4a2a;

function skutsjeFit(B, st, L, W) {
  const hl = L / 2;
  const deckY = 0.66;
  // decks fore and aft, the hold between them under hatch covers
  const fx0 = hl * 0.42, ax1 = -hl * 0.55;
  for (const [x0, x1] of [[fx0, hl - 0.05], [-hl + 0.05, ax1]]) {
    for (let x = x0; x < x1 - 0.01; x += 0.4) {
      const xm = Math.min(x1, x + 0.4);
      const h = hullAt(st, (x + xm) / 2);
      B.box((x + xm) / 2, Math.max(deckY, h.top - 0.05), 0, xm - x, 0.06, Math.max(0.1, h.hw * 2 - 0.14), 0x6e5436);
    }
  }
  const hw0 = hullAt(st, 0).hw;
  const hx = (fx0 + ax1) / 2, hLen = fx0 - ax1;
  B.box(hx, deckY + 0.06, 0, hLen, 0.2, hw0 * 2 - 0.3, TAR);
  for (let i = 0; i < 6; i++) {
    const x = ax1 + hLen * (i + 0.5) / 6;
    B.box(x, deckY + 0.22, 0, hLen / 6 - 0.04, 0.1, hw0 * 1.4, HATCH, 0, 0.12);
    B.box(x, deckY + 0.28, 0, hLen / 6 - 0.04, 0.04, 0.1, VARNISH);
  }
  // varnished wale along the sheer and a thin white line under it
  for (let i = 0; i < st.length - 1; i++) {
    const a = st[i], b = st[i + 1];
    for (const s of [1, -1]) {
      B.quadOut([a.x, a.top - 0.02, s * (a.hw + 0.01)], [b.x, b.top - 0.02, s * (b.hw + 0.01)], [b.x, b.top - 0.16, s * (b.hw + 0.01)], [a.x, a.top - 0.16, s * (a.hw + 0.01)], [0, 0, s], VARNISH);
      B.quadOut([a.x, a.top - 0.18, s * (a.hw + 0.008)], [b.x, b.top - 0.18, s * (b.hw + 0.008)], [b.x, b.top - 0.21, s * (b.hw + 0.008)], [a.x, a.top - 0.21, s * (a.hw + 0.008)], [0, 0, s], 0xe8e6e0);
    }
  }
  // leeboards: fans hung from the wale just forward of the mast, tipped aft
  const lx = hl * 0.12;
  const hwL = hullAt(st, lx);
  const fan = extrudeProfile([[-0.22, 0], [0.22, 0], [0.62, -1.55], [0.34, -1.95], [-0.34, -2.0], [-0.66, -1.62]], 0.07, 0.02);
  for (const s of [1, -1]) {
    B.geo(fan.clone(), composeMatrix(lx, hwL.top - 0.05, s * (hwL.hw + 0.06), s * 0.08, 0, 0.42), VARNISH);
    B.box(lx, hwL.top + 0.02, s * (hwL.hw + 0.04), 0.14, 0.12, 0.1, 0x2a2a2b);
  }
  fan.dispose();
  // rudder and tiller
  const sx = st[0].x;
  B.geo(extrudeProfile([[0, 0.9], [0.1, 0.9], [0.12, -0.2], [-0.75, -0.95], [-0.8, -0.2], [-0.35, 0.9]], 0.09, 0.02), composeMatrix(sx + 0.05, 0, 0), VARNISH);
  B.geo(tubeGeometry([sx + 0.02, 0.98, 0], [sx + 0.9, 1.12, 0], 0.035, 0.03, 5), null, SPAR);
  B.geo(tubeGeometry([sx + 0.9, 1.12, 0], [sx + 1.45, 1.02, 0], 0.03, 0.028, 5), null, SPAR);
  // mast foot (tabernacle) and a stern flag pole
  const mx = hl * 0.28;
  for (const s of [1, -1]) B.box(mx, deckY + 0.35, s * 0.12, 0.3, 0.7, 0.06, TAR);
  B.geo(tubeGeometry([sx + 0.25, 0.7, 0], [sx + 0.2, 2.2, 0], 0.025, 0.02, 4), null, SPAR);
  // a bowsprit-less round bow gets a little anchor winch
  B.box(hl - 0.9, deckY + 0.15, 0, 0.35, 0.22, 0.6, TAR);
}

let pompebledTex = null;
function pompebledTexture() {
  if (pompebledTex) return pompebledTex;
  const Wd = 128, H = 64, c = document.createElement('canvas');
  c.width = Wd; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f2ec';
  g.fillRect(0, 0, Wd, H);
  const band = H / 3.5;
  g.save();
  g.rotate(0.45);
  g.fillStyle = '#1d4f9c';
  for (let i = -4; i < 8; i += 2) g.fillRect(-Wd, i * band, Wd * 3, band);
  g.restore();
  g.fillStyle = '#d42a24';
  for (const [x, y] of [[18, 40], [52, 12], [70, 50], [100, 26]]) {
    g.beginPath();
    g.moveTo(x, y + 6);
    g.bezierCurveTo(x - 9, y, x - 5, y - 8, x, y - 3);
    g.bezierCurveTo(x + 5, y - 8, x + 9, y, x, y + 6);
    g.fill();
  }
  pompebledTex = new THREE.CanvasTexture(c);
  pompebledTex.colorSpace = THREE.SRGBColorSpace;
  return pompebledTex;
}

// Mast with gaff sail, boom and pompeblêd pennant. rig (pivot at the mast
// foot) rotates about z to strike the mast; rig.userData.sail rotates about
// the mast for the trim; the pennant and the stern flag flutter.
function buildSkutsjeRig(L) {
  const hl = L / 2;
  // a 15 m skûtsje carries a ~17 m mast (struck flat for the bridges)
  const mastH = Math.min(17, L * 1.13);
  const boomL = L * 0.58, gaffL = L * 0.4;
  const rigGeo = cached(`skutsje-rig|${L}`, () => {
    const B = new GeoBuilder(3);
    B.geo(tubeGeometry([0, 0, 0], [0, mastH, 0], 0.11, 0.07, 6), null, SPAR);
    B.box(0, mastH + 0.08, 0, 0.16, 0.16, 0.16, 0x2a2a2b);
    B.box(0, mastH - 0.3, 0, 0.05, 0.05, 0.05, NAV_WHITE, G_LAMP);
    // forestay and shrouds down to the bow and the wale
    B.geo(tubeGeometry([0, mastH - 0.2, 0], [hl * 0.72 + 0.1, 0.35, 0], 0.012, 0.012, 3), null, 0x2a2a2b);
    for (const s of [1, -1]) B.geo(tubeGeometry([0, mastH - 0.5, 0], [-0.25, 0.1, s * L * 0.13], 0.012, 0.012, 3), null, 0x2a2a2b);
    return B.build();
  });
  const sailGeo = cached(`skutsje-sail|${L}`, () => {
    const B = new GeoBuilder(3);
    const tack = [0.25, 0.55], clew = [-boomL, 0.62], throat = [0.1, mastH * 0.66];
    const peak = [throat[0] - gaffL * 0.78, throat[1] + gaffL * 0.62];
    B.geo(tubeGeometry([0.1, 0.5, 0], [clew[0] - 0.2, clew[1] - 0.05, 0], 0.07, 0.06, 5), null, SPAR);
    B.geo(tubeGeometry([throat[0], throat[1] + 0.1, 0], [peak[0] - 0.15, peak[1] + 0.1, 0], 0.06, 0.05, 5), null, SPAR);
    // cloth: a 3x3 patch with a little belly to leeward (+z), both faces
    const P = (u, v) => {
      const bx = tack[0] + (clew[0] - tack[0]) * u, by = tack[1] + (clew[1] - tack[1]) * u;
      const tx = throat[0] + (peak[0] - throat[0]) * u, ty = throat[1] + (peak[1] - throat[1]) * u;
      return [bx + (tx - bx) * v, by + (ty - by) * v, 0.38 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v)];
    };
    const N = 3;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const a = P(i / N, j / N), b = P((i + 1) / N, j / N), c = P((i + 1) / N, (j + 1) / N), d = P(i / N, (j + 1) / N);
        const col = (i + j) % 2 ? SAIL_BROWN : shadeHex(SAIL_BROWN, 0.9);
        B.quadOut(a, b, c, d, [0, 0, 1], col);
        B.quadOut(a, b, c, d, [0, 0, -1], shadeHex(col, 0.8));
      }
    }
    return B.build();
  });
  const mats = vehicleMaterials();
  const rig = new THREE.Group();
  rig.position.set(hl * 0.28, 0.72, 0);
  rig.add(new THREE.Mesh(rigGeo, mats));
  const sail = new THREE.Group();
  sail.add(new THREE.Mesh(sailGeo, mats));
  rig.add(sail);
  const flagMat = new THREE.MeshLambertMaterial({ map: pompebledTexture(), side: THREE.DoubleSide });
  const pennantGeo = cached('skutsje-pennant', () => {
    const g = new THREE.BufferGeometry();
    const len = 2.2, h = 0.34, n = 6;
    const pos = [], uv = [];
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      const h0 = h * (1 - u0 * 0.85), h1 = h * (1 - u1 * 0.85);
      const x0 = -len * u0, x1 = -len * u1;
      pos.push(x0, 0, 0, x1, 0, 0, x1, -h1, 0, x0, 0, 0, x1, -h1, 0, x0, -h0, 0);
      uv.push(u0, 1, u1, 1, u1, 1 - h1 / h, u0, 1, u1, 1 - h1 / h, u0, 1 - h0 / h);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  });
  const pennant = new THREE.Mesh(pennantGeo, flagMat);
  pennant.position.set(0, mastH + 0.12, 0);
  rig.add(pennant);
  const sternFlag = new THREE.Mesh(cached('skutsje-sternflag', () => new THREE.PlaneGeometry(0.75, 0.5).translate(-0.38, -0.25, 0)), flagMat);
  sternFlag.position.set(-hl + 0.22, 2.2, 0);
  rig.userData = { sail, pennant, sternFlag, strike: 0, trim: 0.35 };
  return { rig, sternFlag };
}

// Called by whoever sails a skûtsje, per frame: trim = boom angle off the
// centre line (radians, signed: + swings the boom to starboard), strike 0..1
// (the mast folds aft to pass under a bridge), t = time for the flutter.
export function animateSkutsjeRig(v, trim, strike, t) {
  const mesh = getVehicleMesh(v.id);
  const rig = mesh && mesh.userData.rig;
  if (!rig) return false;
  const ud = rig.userData;
  ud.trim += (trim - ud.trim) * 0.08;
  // raised slowly: the struck mast reaches well aft of the stern, past the bridge
  ud.strike += (strike - ud.strike) * (strike > ud.strike ? 0.1 : 0.025);
  rig.rotation.z = ud.strike * 1.5;
  ud.sail.rotation.y = ud.trim;
  ud.sail.scale.z = ud.trim < 0 ? -1 : 1;
  const flap = Math.sin(t * 7 + v.id) * 0.25 + Math.sin(t * 11.3) * 0.12;
  ud.pennant.rotation.y = ud.trim * 0.6 + flap;
  ud.sternFlag.rotation.y = flap * 0.8;
  return true;
}

// de hulpjes en kleuren van dit bestand voor zeeschip3d.js
const SHIP_K = { GLASS, G_GLASS, G_LAMP, NAV_WHITE, NAV_RED, NAV_GREEN, shadeHex, hullAt };

function buildBoatGeometry(kind, L, W, hull, trim, cabin, police, soort = '') {
  return cached(`boat|${kind}|${L}|${W}|${hull}|${trim}|${cabin}|${police}|${soort}`, () => {
    const B = new GeoBuilder(3);
    const hl = L / 2;
    if (kind === 'waterfiets') {
      waterfietsFit(B, L, W, hull, cabin || 0x2a8fb0);
      return B.build();
    }
    const S = HULL_SHAPES[kind] || HULL_SHAPES.sloep;
    const st = hullStations(L, W, S);
    hullShell(B, st, hull, trim, S.floor, !!S.deck);
    switch (kind) {
      case 'rondvaart': rondvaartFit(B, st, L, W, hull, cabin || 0xe8e6e0); break;
      case 'kano': kanoFit(B, st, L, W, hull); break;
      case 'kajak': kajakFit(B); break;
      case 'skiff': rowFit(B, st, L, W, hull, trim, [-0.2]); break;
      case 'acht': acht(B, st, L, W, hull, trim); break;
      case 'sup': supFit(B, st); break;
      case 'dinghy': dinghyFit(B, st, L); break;
      case 'rubberboot': rubberFit(B, st, L, W, hull, cabin || 0xd8572a); break;
      case 'skutsje': skutsjeFit(B, st, L, W); break;
      case 'binnenvaart': binnenvaartFit(B, st, L, W, hull, cabin || 0xe8e6e0); break;
      case 'zeeschip': zeeschipFit(B, st, L, W, hull, cabin || 0xe8e6e0, soort, SHIP_K); break;
      case 'sleper': sleperFit(B, st, L, W, hull, cabin || 0xe8e6e0, SHIP_K); break;
      default: sloepFit(B, st, L, W, hull, cabin, police);
    }
    if (kind === 'kano' || kind === 'kajak') {
      const x = -hl * 0.72;
      B.box(x, hullAt(st, x).top + (kind === 'kajak' ? 0.06 : 0.02), 0, 0.05, 0.05, 0.05, NAV_WHITE, G_LAMP);
    } else if (kind !== 'sup' && kind !== 'skiff' && kind !== 'acht' && kind !== 'zeeschip' && kind !== 'sleper') navLights(B, st, L, st[0].top + (kind === 'rubberboot' ? 0.42 : 0.06));
    return B.build();
  });
}

function buildBoatMesh(v) {
  const group = new THREE.Group();
  const len = v.model.len, wid = v.model.wid;
  const police = !!v.isPolice;
  const kind = police ? 'sloep' : boatKind(v);
  const hull = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, 0xe8e6e0);
  const cabinColor = toHex(v.model.cabin, 0x2f3a44);
  const trims = kind === 'skutsje' ? [0x2a211b] : kind === 'binnenvaart' || kind === 'zeeschip' || kind === 'sleper' ? [0xe8e6e0] : kind === 'rondvaart' ? [0xe8e6e0, 0xc9a227] : kind === 'kano' || kind === 'kajak' || kind === 'sup' ? [shadeHex(hull, 0.7), 0x2a2a2b] : kind === 'skiff' || kind === 'acht' ? [0xc8502a, 0x1f4f9a, 0x2f7d46, 0x6a2e8a] : [0x21468b, 0x2f4a3a, 0x6b2a24, 0x9a7048];
  const trim = police ? 0x1f3f8f : trims[Math.floor(hash2(v.id || 0, 8.1) * trims.length)];
  const cabin = kind === 'sloep' ? (boatHasCabin(v) ? cabinColor : 0) : cabinColor;
  group.add(new THREE.Mesh(buildBoatGeometry(kind, len, wid, hull, trim, cabin, police, v.model.soort || ''), vehicleMaterials()));
  if (kind === 'skutsje' && !v.wrecked) {
    const { rig, sternFlag } = buildSkutsjeRig(len);
    group.add(rig, sternFlag);
    group.userData.rig = rig;
  }
  if (police) {
    const lamps = [];
    for (const s of [1, -1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.24), lampMaterial(0x2f6bff, 0.25));
      lamp.position.set(0, 1.3, s * 0.18);
      group.add(lamp);
      lamps.push(lamp);
    }
    group.userData.policeLamps = lamps;
  }
  return group;
}

// A boat hull mesh outside the vehicle registry (the ship on the slipway of werf3d.js, #398).
export const buildShipMesh = (v) => { const mesh = buildBoatMesh(v); retainCachedGeometries(mesh); return mesh; };

// --- stuur dat meedraait (#442) ---------------------------------------------------
// Stuurstang, stuurpen en handvatten van een fiets, step en brommer als eigen onderdeel: dichtbij vervangt
// voertuigbediening.js de carrosseriegeometrie door de variant zonder stuur en tekent dit onderdeel draaiend
// om de stuurpen. Geometrie wordt gedeeld (cached); px = de x van de stuurpen (het draaipunt).
// Het midden van een handvat (bikeStuurOnderdelen): x, hoogte en halve breedte in de assen van de fiets; px = de stuuras.
function bikeGrip(fat) {
  const H1y = fat ? 0.82 : 0.93;
  return { x: 0.13, y: H1y + 0.115, z: 0.28, px: 0.38 };
}
// Beide handen van de fietser op de handvatten, het stuur gedraaid over hoek a (rad, zoals stuurstang.rotation.y).
export function bikeHands(rider, grip, a) {
  if (!rider || !grip) return;
  const c = Math.cos(a), s = Math.sin(a), dx = grip.x - grip.px;
  for (const k of [0, 1]) {
    const z = k === 0 ? grip.z : -grip.z;
    reachHandFromParent(rider, k, grip.px + dx * c + z * s, grip.y, -dx * s + z * c);
  }
}

function bikeStuurOnderdelen(B, fat, px) {
  const H1 = [0.4, fat ? 0.82 : 0.93, 0];
  const stemTop = [H1[0] - 0.02, H1[1] + 0.14, 0];
  const tube = (a, b, rr, c) => B.geo(tubeGeometry([a[0] - px, a[1], a[2]], [b[0] - px, b[1], b[2]], rr, rr, 5), null, c);
  tube(H1, stemTop, 0.014, 0x8a8e92);
  for (const s of [1, -1]) {
    const grip = [stemTop[0] - 0.2, stemTop[1] - 0.02, s * 0.28];
    tube(stemTop, [stemTop[0] - 0.02, stemTop[1], s * 0.12], 0.012, 0x8a8e92);
    tube([stemTop[0] - 0.02, stemTop[1], s * 0.12], grip, 0.012, 0x8a8e92);
    tube(grip, [grip[0] - 0.1, grip[1] - 0.01, grip[2]], 0.018, 0x1b1b1c);
  }
}
function scooterStuurOnderdelen(B, px, color = null) {
  const tube = (a, b, r1, r2, sides, c) => B.geo(tubeGeometry([a[0] - px, a[1], a[2]], [b[0] - px, b[1], b[2]], r1, r2, sides), null, c);
  if (color !== null) tube([0.43, 0.1, 0], [0.37, 1.02, 0], 0.034, 0.028, 8, color);
  tube([0.37, 1.03, -0.25], [0.37, 1.03, 0.25], 0.016, 0.016, 6, 0x2a2a2b);
  for (const s of [1, -1]) tube([0.37, 1.03, s * 0.17], [0.37, 1.03, s * 0.26], 0.022, 0.022, 6, 0x1b1b1c);
  B.box(0.37 - px, 1.055, 0, 0.07, 0.025, 0.1, 0x1b1b1c);
  B.box(0.35 - px, 1.07, 0, 0.012, 0.018, 0.07, 0x5fd0e0, G_LAMP);
  B.geo(new THREE.CylinderGeometry(0.018, 0.022, 0.02, 8), composeMatrix(0.37 - px, 1.05, -0.13), 0xc8cbcf);
}
function mopedStuurOnderdelen(B, color, px) {
  const dark = 0x2a2b2e;
  const tube = (a, b, r1, r2, sides, c) => B.geo(tubeGeometry([a[0] - px, a[1], a[2]], [b[0] - px, b[1], b[2]], r1, r2, sides), null, c);
  tube([0.46, 0.7, 0], [0.42, 1.04, 0], 0.032, 0.03, 6, dark);
  tube([0.42, 1.04, -0.32], [0.42, 1.04, 0.32], 0.018, 0.018, 6, CHROME);
  for (const s of [1, -1]) tube([0.42, 1.04, s * 0.22], [0.42, 1.04, s * 0.33], 0.024, 0.024, 6, 0x1b1b1c);
  B.box(0.49 - px, 1.0, 0, 0.1, 0.12, 0.16, color);
  B.box(0.545 - px, 1.0, 0, 0.02, 0.08, 0.1, HEADLAMP, G_LAMP);
  for (const s of [1, -1]) B.box(0.43 - px, 1.12, s * 0.2, 0.02, 0.07, 0.05, CHROME);
}
// De bouwstenen voor het meedraaiende stuur van een fiets, step of brommer: { zonder: carrosserie zonder stuur,
// stuur: het stuur om de stuurpen, px: x van de stuurpen, sx: schaal van de carrosserie } of null.
export function stuurOverlay(spec) {
  if (!spec) return null;
  // #787: het voertuig onthoudt deze gedeelde geometrieën (userData.cachedGeometries), zodat ze
  // bij het opruimen teruggaan naar de teller; de gewone carrosserie wordt er onderweg door vervangen.
  const owner = spec.body && spec.body.parent;
  const hold = (g) => { retainCachedGeometry(owner, g); return g; };
  if (spec.soort === 'fiets') {
    const px = 0.38;
    return {
      px, sx: 1,
      zonder: hold(buildBikeGeometry(spec.color, spec.fat, spec.stepThrough, spec.sleutel, true)),
      stuur: hold(cached(`stuur|fiets|${spec.fat}`, () => { const B = new GeoBuilder(3); bikeStuurOnderdelen(B, spec.fat, px); return B.build(); })),
    };
  }
  if (spec.soort === 'step') {
    const px = 0.4;
    return {
      px, sx: 1,
      zonder: hold(buildScooterGeometry(spec.color, true)),
      stuur: hold(cached(`stuur|step|${spec.color}`, () => { const B = new GeoBuilder(3); scooterStuurOnderdelen(B, px, spec.color); return B.build(); })),
    };
  }
  if (spec.soort === 'brommer') {
    const px = 0.44;
    return {
      px, sx: spec.sx || 1,
      zonder: hold(buildMopedGeometry(spec.color, true)),
      stuur: hold(cached(`stuur|brommer|${spec.color}`, () => { const B = new GeoBuilder(3); mopedStuurOnderdelen(B, spec.color, px); return B.build(); })),
    };
  }
  return null;
}

// --- wheel spin ---------------------------------------------------------------

// Rolls every wheel by the distance travelled this frame and turns the front
// wheels with the steering; bike riders pedal in step. The drawn roll per
// frame is capped below half the spoke spacing, so fast wheels keep turning
// forwards instead of strobing still or backwards (wagon-wheel effect).
// A fiets heeft daarnaast één reflector per wiel (bikeWheelGeometry): de velg
// heeft 16 vlakjes en die liepen bij fietsnelheid achteruit terwijl de spaken
// vooruit gingen (#436).
// No-op for meshes without userData.wheels (boats).
const SPIN_STEP = 0.5;
const MAX_STEER_ANGLE = 0.5;
export function updateVehicleWheelSpin(mesh, speed, dt, steer = 0) {
  const ud = mesh.userData;
  const wheels = ud.wheels;
  if (!wheels || !wheels.length) return;
  const delta = (speed / ud.wheelRadius) * dt;
  const cap = ud.spinStep || SPIN_STEP;
  const shown = Math.max(-cap, Math.min(cap, delta));
  for (const w of wheels) w.rotation.z -= shown * (w.userData.spinK || 1);
  // de bestuurder draait mee aan het stuur (actorlife.js), alleen als hij te zien is en het stuur echt bewoog
  const df = ud.driverFigure;
  if (df && df.visible && df.userData.wheelArms && Math.abs(steer - (df.userData.steer || 0)) > 0.02) {
    df.userData.steer = steer;
    steerHands(df, steer);
  }
  const fw = ud.frontWheels;
  if (fw) {
    const a = -steer * MAX_STEER_ANGLE;
    for (const w of fw) {
      if (w.rotation.order !== 'YZX') w.rotation.order = 'YZX';
      w.rotation.y += (a - w.rotation.y) * Math.min(1, dt * 14);
    }
  }
  const rl = ud.riderLegs;
  if (rl) {
    // cranks turn the same way as the wheels (angle decreasing = forward)
    ud.pedalPhase = ((ud.pedalPhase || 0) - delta * 0.45) % (Math.PI * 2);
    const moving = Math.min(1, Math.abs(speed) / 1.5);
    const sw = Math.sin(ud.pedalPhase) * rl.amp * moving;
    rl.legs[0].rotation.z = rl.base + sw;
    rl.legs[1].rotation.z = rl.base - sw;
    // de zwaai van dit beeld, voor een zitter van buiten dit model (coopzitten3d.js): zijn benen trappen mee (#434)
    ud.pedalSwing = sw;
  }
}

// Lekke band (#41): het wiel aan de trekkende kant wordt kleiner en zakt in; terug naar normaal na
// reparatie (v.flat weg). Idempotent, goedkoop genoeg om elk frame aan te roepen.
export function applyFlatTire(mesh, v) {
  const ud = mesh.userData, wheels = ud.wheels;
  if (!wheels || !wheels.length) return;
  const want = v.flat ? flatWheelIndex(wheels.map((w) => ({ x: w.position.x, z: w.position.z })), v.id) : -1;
  if ((ud.flatIdx ?? -1) === want) return;
  const prev = ud.flatIdx ?? -1;
  if (prev >= 0 && wheels[prev]) { wheels[prev].scale.setScalar(1); wheels[prev].position.y = wheels[prev].userData.baseY; }
  ud.flatIdx = want;
  if (want >= 0) {
    const w = wheels[want];
    if (w.userData.baseY == null) w.userData.baseY = w.position.y;
    w.scale.setScalar(FLAT_SCALE);
    w.position.y = w.userData.baseY * FLAT_SCALE;
  }
}

// --- dispatch -------------------------------------------------------------------

// Midi bus: one short rigid section, same livery as the big ones. The passenger room
// (seats, poles, travellers) is businterieur3d.js' job; both use midibusDeurXs() so the
// benches stay out of the two doorways this body draws.
function buildMidiBusMesh(v) {
  const group = new THREE.Group();
  const len = v.model.len, wid = v.model.wid, hl = len / 2;
  const fwX = hl - 1.9, rwX = -hl + 2.0;
  const geo = cached(`midibus|${len}|${wid}|${!!v.wrecked}`, () => {
    const B = new GeoBuilder(3);
    busSection(B, -hl, hl, wid, { front: true, rear: true, wheelXs: [fwX, rwX], doorXs: midibusDeurXs(len) });
    return B.build();
  });
  const mats = vehicleMaterials();
  group.add(new THREE.Mesh(geo, mats));
  const wgeo = carWheelGeometry(BUS_WHEEL_R, 0.3);
  const wheels = [];
  for (const x of [fwX, rwX]) for (const s of [1, -1]) addWheel(group, wgeo, mats[0], x, BUS_WHEEL_R, s * (wid / 2 - 0.2), wheels);
  group.userData.wheels = wheels;
  // de eerste twee wielen zijn de vooras (fwX, beide kanten): zonder dit veld
  // stonden de voorwielen van de midibus stil bij het sturen (updateVehicleWheelSpin)
  group.userData.frontWheels = wheels.slice(0, 2);
  group.userData.wheelRadius = BUS_WHEEL_R;
  return group;
}

function buildVehicleMeshFor(v) {
  if (v._mount === 'horse' && horseMeshBuilder) return buildPoliceHorseMesh(v);
  if (v.isBike) return buildBikeMesh(v);
  if (v.isScooter) return buildScooterMesh(v);
  if (v.isBus && v.model.name === 'midibus') return buildMidiBusMesh(v);
  if (v.isBus) return buildBusMesh(v);
  if (v.isBoat) return buildBoatMesh(v);
  if (v.isHeli) return buildHeliMesh(v);
  if (v.isPlane) return buildPlaneMesh(v);
  if (v.isHeroCar) return buildFordEscortGroup(v.model.color, v.model.len, v.model.wid, v.wrecked);
  return buildCarMesh(v);
}

// vehicle id -> the live mesh built for it; entries go stale once scene3d
// drops the mesh (parent null) and are pruned by pruneVehicleMeshes().
const meshRegistry = new Map();

export function buildVehicleMesh(v) {
  const group = buildVehicleMeshFor(v);
  retainCachedGeometries(group); // #787: welke gedeelde geometrieën dit voertuig tekent
  group.userData.vehicleId = v.id;
  group.userData.builtAt = performance.now();
  meshRegistry.set(v.id, group);
  if (v.damage) restoreDamage(group, v);
  else if (v.dentLog && v.dentLog.length && !v.wrecked) replayDents(group, v);
  if (v.dentLog && v.dentLog.length) syncLooseParts(group, v);
  if ((v.look || (v.model && (v.model.name === 'foodtruck' || v.model.name === 'snackwagen'))) && !v.wrecked) applyVehicleLook(group, v, carBodyFit(v)); // de snackwagen draagt altijd zijn belettering
  // LOD's (vehiclelod3d.js, op het centrale systeem): niet voor fietsen, steps en het paard (de berijder hoort bij het model)
  // boten: buildBoatMesh (centraal systeem, soort 'boat'); de tankwagen (vettruck 23-11) heeft zijn eigen DitherLOD in buildTankerMesh
  if (!v.isBike && !v.isScooter && !v.isBoat && v._mount !== 'horse' && !v.model.tank) attachVehicleLods(group, v.model.name);
  return group;
}

export function getVehicleMesh(id) {
  const m = meshRegistry.get(id);
  return m && m.parent ? m : null;
}

export function pruneVehicleMeshes() {
  const now = performance.now();
  for (const [id, m] of meshRegistry) if (!m.parent && now - m.userData.builtAt > 2000) meshRegistry.delete(id);
}

// --- damage ---------------------------------------------------------------------
// The body geometry is cached and shared, so the first dent swaps in a private
// copy. Each impact first refines the mesh around the hit (so the dent has
// vertices to move), then pushes them in. v.damage keeps the arrays so a mesh
// rebuilt after streaming back in looks the same.

const MAX_DENT = 0.42;
const MAX_DAMAGE_VERTS = 9000;
const CRAZED_GLASS = [0.62, 0.66, 0.68];
const BROKEN_LAMP = [0.05, 0.05, 0.05];
const DENT_Y = 0.55;

function posHash(x, y, z) { return hash3(x, y, z); }

// Per corner: x y z (current), bx by bz (undamaged), r g b, u v.
const ST = 11;

// Red-green refinement: an edge is split iff it is long and its undamaged
// midpoint lies near the impact - both triangles sharing it agree, so the
// mesh stays crack-free.
function refine(tris, maxLen, px, pz, reach) {
  const L2 = maxLen * maxLen, R2 = reach * reach;
  const split = (t, a, b) => {
    const i = a * ST, j = b * ST;
    const dx = t[i + 3] - t[j + 3], dy = t[i + 4] - t[j + 4], dz = t[i + 5] - t[j + 5];
    if (dx * dx + dy * dy + dz * dz <= L2) return false;
    const mx = (t[i + 3] + t[j + 3]) * 0.5 - px, my = ((t[i + 4] + t[j + 4]) * 0.5 - DENT_Y) * 0.7, mz = (t[i + 5] + t[j + 5]) * 0.5 - pz;
    return mx * mx + my * my + mz * mz < R2;
  };
  const corner = (t, a) => t.slice(a * ST, a * ST + ST);
  const mid = (A, B) => {
    const m = new Array(ST);
    for (let k = 0; k < ST; k++) m[k] = (A[k] + B[k]) * 0.5;
    return m;
  };
  for (let iter = 0; iter < 4; iter++) {
    const out = [];
    let changed = false;
    for (const t of tris) {
      const e0 = split(t, 0, 1), e1 = split(t, 1, 2), e2 = split(t, 2, 0);
      const n = e0 + e1 + e2;
      if (!n) { out.push(t); continue; }
      changed = true;
      const r = n === 1 ? (e0 ? 0 : e1 ? 1 : 2) : n === 2 ? (!e2 ? 0 : !e0 ? 1 : 2) : 0;
      const A = corner(t, r), B = corner(t, (r + 1) % 3), C = corner(t, (r + 2) % 3);
      const mAB = mid(A, B), mBC = mid(B, C), mCA = mid(C, A);
      if (n === 1) out.push([...A, ...mAB, ...C], [...mAB, ...B, ...C]);
      else if (n === 2) out.push([...A, ...mAB, ...mBC], [...mAB, ...B, ...mBC], [...A, ...mBC, ...C]);
      else out.push([...A, ...mAB, ...mCA], [...mAB, ...B, ...mBC], [...mCA, ...mBC, ...C], [...mAB, ...mBC, ...mCA]);
    }
    tris = out;
    if (!changed) break;
  }
  return tris;
}

function readTris(g, start, end) {
  const pos = g.attributes.position.array, col = g.attributes.color.array, uv = g.attributes.uv.array;
  const base = g.userData.base || pos;
  const tris = [];
  for (let v = start; v < end; v += 3) {
    const t = new Array(ST * 3);
    for (let k = 0; k < 3; k++) {
      const i = v + k, o = k * ST;
      t[o] = pos[i * 3]; t[o + 1] = pos[i * 3 + 1]; t[o + 2] = pos[i * 3 + 2];
      t[o + 3] = base[i * 3]; t[o + 4] = base[i * 3 + 1]; t[o + 5] = base[i * 3 + 2];
      t[o + 6] = col[i * 3]; t[o + 7] = col[i * 3 + 1]; t[o + 8] = col[i * 3 + 2];
      t[o + 9] = uv[i * 2]; t[o + 10] = uv[i * 2 + 1];
    }
    tris.push(t);
  }
  return tris;
}

function buildDamagedGeometry(lists, parts) {
  let total = 0;
  for (const l of lists) total += l.tris.length * 3;
  const pos = new Float32Array(total * 3), base = new Float32Array(total * 3), col = new Uint8Array(total * 3), uv = new Float32Array(total * 2);
  const g = new THREE.BufferGeometry();
  let v = 0;
  for (const l of lists) {
    const start = v;
    for (const t of l.tris) {
      for (let k = 0; k < 3; k++, v++) {
        const o = k * ST;
        pos[v * 3] = t[o]; pos[v * 3 + 1] = t[o + 1]; pos[v * 3 + 2] = t[o + 2];
        base[v * 3] = t[o + 3]; base[v * 3 + 1] = t[o + 4]; base[v * 3 + 2] = t[o + 5];
        col[v * 3] = t[o + 6]; col[v * 3 + 1] = t[o + 7]; col[v * 3 + 2] = t[o + 8];
        uv[v * 2] = t[o + 9]; uv[v * 2 + 1] = t[o + 10];
      }
    }
    g.addGroup(start, v - start, l.mi);
  }
  return fromArrays(pos, base, col, uv, groupsOf(g), parts);
}

function groupsOf(g) {
  return g.groups.map((q) => ({ start: q.start, count: q.count, materialIndex: q.materialIndex }));
}

function fromArrays(pos, base, col, uv, groups, parts) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(pos.length), 3, true));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  for (const q of groups) g.addGroup(q.start, q.count, q.materialIndex);
  g.userData = { damaged: true, parts, base };
  recomputeFlatNormals(g);
  return g;
}

// Refines the body around (px, pz) and swaps the result into the mesh. The
// bumper ranges stay verbatim at the front of the body group.
function refineBodyAround(mesh, px, pz, reach) {
  const body = mesh.userData.body;
  const g = body.geometry;
  const parts = g.userData.parts;
  if (g.userData.damaged && g.attributes.position.count > MAX_DAMAGE_VERTS) return g;
  const lists = [];
  for (const grp of groupsOf(g).sort((a, b) => a.start - b.start)) {
    const s0 = grp.start, s1 = grp.start + grp.count;
    if (grp.materialIndex === G_BODY) {
      const keep = readTris(g, parts.front.start, parts.rear.end);
      const rest = readTris(g, s0, parts.front.start).concat(readTris(g, parts.rear.end, s1));
      lists.push({ mi: grp.materialIndex, tris: keep.concat(refine(rest, 0.3, px, pz, reach)) });
    } else if (grp.materialIndex === G_GLASS) {
      lists.push({ mi: grp.materialIndex, tris: refine(readTris(g, s0, s1), 0.4, px, pz, reach * 1.5) });
    } else {
      lists.push({ mi: grp.materialIndex, tris: readTris(g, s0, s1) });
    }
  }
  const fLen = parts.front.end - parts.front.start, rLen = parts.rear.end - parts.rear.start;
  const newParts = { ...parts, front: { ...parts.front, start: 0, end: fLen }, rear: { ...parts.rear, start: fLen, end: fLen + rLen } };
  const out = buildDamagedGeometry(lists, newParts);
  if (g.userData.damaged) g.dispose();
  body.geometry = out;
  return out;
}

function recomputeFlatNormals(g) {
  const pos = g.attributes.position.array, nor = g.attributes.normal.array;
  for (let i = 0; i < pos.length; i += 9) {
    const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1], uz = pos[i + 5] - pos[i + 2];
    const vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1], vz = pos[i + 8] - pos[i + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx = Math.round((nx / l) * 127); ny = Math.round((ny / l) * 127); nz = Math.round((nz / l) * 127);
    for (let k = 0; k < 9; k += 3) { nor[i + k] = nx; nor[i + k + 1] = ny; nor[i + k + 2] = nz; }
  }
  g.attributes.normal.needsUpdate = true;
}

function paintTriangles(g, groupIdx, px, py, pz, r, rgb, chance) {
  const grp = g.groups.find((q) => q.materialIndex === groupIdx);
  if (!grp) return;
  const pos = g.attributes.position.array, col = g.attributes.color.array;
  const r2 = r * r;
  for (let v = grp.start; v < grp.start + grp.count; v += 3) {
    const i = v * 3;
    const cx = (pos[i] + pos[i + 3] + pos[i + 6]) / 3, cy = (pos[i + 1] + pos[i + 4] + pos[i + 7]) / 3, cz = (pos[i + 2] + pos[i + 5] + pos[i + 8]) / 3;
    const dx = cx - px, dy = cy - py, dz = cz - pz;
    if (dx * dx + dy * dy + dz * dz > r2) continue;
    const h = posHash(cx, cy, cz);
    if (h > chance) continue;
    const shade = 0.85 + h * 0.3;
    for (let k = 0; k < 9; k += 3) {
      col[i + k] = Math.min(255, rgb[0] * shade * 255);
      col[i + k + 1] = Math.min(255, rgb[1] * shade * 255);
      col[i + k + 2] = Math.min(255, rgb[2] * shade * 255);
    }
  }
  g.attributes.color.needsUpdate = true;
}

function transformPart(g, part, fn) {
  const pos = g.attributes.position.array, base = g.userData.base;
  for (let v = part.start; v < part.end; v++) {
    const i = v * 3;
    fn(base[i], base[i + 1], base[i + 2], pos, i);
  }
  g.attributes.position.needsUpdate = true;
}

function hangBumper(g, part, side) {
  const hw = g.userData.parts.hw, pz = side * hw, py = part.y;
  const th = 0.38, c = Math.cos(th), s = Math.sin(th);
  transformPart(g, part, (x, y, z, pos, i) => {
    const ry = y - py, rz = z - pz;
    pos[i] = x + Math.sign(part.x) * 0.05;
    pos[i + 1] = Math.max(0.03, py + ry * c + side * rz * s);
    pos[i + 2] = pz + rz * c - side * ry * s;
  });
}

function dropBumper(g, part) {
  const inX = part.x * 0.8;
  transformPart(g, part, (x, y, z, pos, i) => { pos[i] = inX; pos[i + 1] = 0.4; pos[i + 2] = 0; });
}

function applyBumperState(g, v) {
  const parts = g.userData.parts, d = v.damage;
  for (const end of ['front', 'rear']) {
    const st = d[end + 'State'];
    if (st === 1) hangBumper(g, parts[end], d[end + 'Side']);
    else if (st === 2) dropBumper(g, parts[end]);
  }
}

function syncDamageMaterials(mesh, v) {
  const mats = mesh.userData.body && mesh.userData.body.material;
  if (!Array.isArray(mats)) return;
  const k = Math.min(1, v.damage.glass);
  mats[1].color.setScalar(1 - k * 0.3);
  mats[1].roughness = GLASS_ROUGHNESS + k * 0.4;
  // crazed glass is harder to see through
  if (mats[1].transparent) mats[1].opacity = Math.min(1, GLASS_OPACITY + k * 0.4);
  mats[0].roughness = 0.5 + Math.min(1, v.damage.total / 3) * 0.25;
}

function storeDamage(v, g) {
  const d = v.damage;
  d.pos = g.attributes.position.array;
  d.base = g.userData.base;
  d.col = g.attributes.color.array;
  d.uv = g.attributes.uv.array;
  d.groups = groupsOf(g);
  d.parts = g.userData.parts;
  d.paint = v.model.color;
}

// A dented car keeps its vertex arrays in v.damage; after a respray they
// still carry the old paint, so swap that colour for the new one (the
// paint is a flat per-vertex colour, see pixelart3d linearRGB).
function repaintDamage(d, from, to) {
  if (from == null || to == null || from === to) return;
  const a = new THREE.Color(toHex(from, 0)), b = new THREE.Color(toHex(to, 0));
  const col = d.col = new d.col.constructor(d.col);
  // normalized integer colours (Uint8/Uint16) or plain floats
  const k = col instanceof Uint8Array ? 255 : col instanceof Uint16Array ? 65535 : 1;
  const q = (x) => (k === 1 ? x : Math.round(x * k));
  const eps = k === 1 ? 1e-4 : 1.5;
  const [ar, ag, ab, br, bg, bb] = [a.r, a.g, a.b, b.r, b.g, b.b].map(q);
  for (let i = 0; i < col.length; i += 3) {
    if (Math.abs(col[i] - ar) < eps && Math.abs(col[i + 1] - ag) < eps && Math.abs(col[i + 2] - ab) < eps) {
      col[i] = br; col[i + 1] = bg; col[i + 2] = bb;
    }
  }
}

function restoreDamage(mesh, v) {
  const body = mesh.userData.body, d = v.damage;
  if (!body || !d.pos) return;
  if (!v.wrecked && !v.isPolice) repaintDamage(d, d.paint, v.model.color);
  const g = fromArrays(d.pos, d.base, d.col, d.uv, d.groups, d.parts);
  body.geometry = g;
  storeDamage(v, g);
  syncDamageMaterials(mesh, v);
}

// Local-space impact (lx forward, lz right, metres from the centre), strength
// 0..1. Returns 'front'/'rear' when that bumper just fell off, else null.
export function applyVehicleDamage(mesh, v, lx, lz, strength) {
  const body = mesh.userData.body;
  if (!body || !body.geometry.userData.parts) return null;
  const parts0 = body.geometry.userData.parts;
  const hl = parts0.hl, hw = parts0.hw;
  const px = Math.max(-hl - 0.05, Math.min(hl + 0.05, lx));
  const pz = Math.max(-hw - 0.05, Math.min(hw + 0.05, lz));
  const R = 0.5 + strength * 0.6;
  const g = refineBodyAround(mesh, px, pz, R);
  if (!v.damage) v.damage = { total: 0, glass: 0, front: 0, rear: 0, frontState: 0, rearState: 0, frontSide: 1, rearSide: 1 };
  const d = v.damage;
  const endness = Math.abs(px) / hl, sideness = Math.abs(pz) / hw;
  let ix = endness > 0.55 ? -Math.sign(px) * endness : 0;
  let iz = sideness > 0.45 ? -Math.sign(pz) * sideness : 0;
  if (!ix && !iz) ix = -Math.sign(px || 1);
  const il = Math.hypot(ix, iz);
  ix /= il; iz /= il;
  const depth = 0.06 + strength * 0.28;
  const pos = g.attributes.position.array, base = g.userData.base;
  const R2 = R * R;
  const skipFrom = g.userData.parts.front.start, skipTo = g.userData.parts.rear.end;
  for (let i = 0; i < pos.length; i += 3) {
    const vi = i / 3;
    if (vi >= skipFrom && vi < skipTo) continue;
    const bx = base[i], by = base[i + 1], bz = base[i + 2];
    const dx = bx - px, dy = (by - DENT_Y) * 0.7, dz = bz - pz;
    const dd = dx * dx + dy * dy + dz * dz;
    if (dd > R2) continue;
    const f = 1 - Math.sqrt(dd) / R;
    const n = posHash(bx, by, bz) - 0.5;
    const m = depth * f * f * (1 + n * 1.1);
    const buckle = Math.sin(bx * 11 + bz * 7 + by * 5) * 0.35 - 0.25 * Math.max(0, by - 0.3);
    let x = pos[i] + ix * m, y = pos[i + 1] + m * buckle, z = pos[i + 2] + iz * m;
    const ox = x - bx, oy = y - by, oz = z - bz;
    const ol = Math.hypot(ox, oy, oz);
    if (ol > MAX_DENT) { const k = MAX_DENT / ol; x = bx + ox * k; y = by + oy * k; z = bz + oz * k; }
    pos[i] = x; pos[i + 1] = Math.max(0.02, y); pos[i + 2] = z;
  }
  g.attributes.position.needsUpdate = true;
  d.total += strength;
  if (strength > 0.25) {
    paintTriangles(g, G_GLASS, px, 1.05, pz, R * 1.9, CRAZED_GLASS, 0.35 + strength * 0.6);
    d.glass += strength * 0.6;
  }
  paintTriangles(g, G_LAMP, px, 0.6, pz, R * 0.9, BROKEN_LAMP, strength * 1.4);

  let dropped = null;
  const end = px > hl * 0.5 ? 'front' : px < -hl * 0.5 ? 'rear' : null;
  if (end) {
    d[end] += strength;
    const prevState = d[end + 'State'];
    if (prevState < 2 && d[end] > 1.3) { d[end + 'State'] = 2; dropped = end; }
    else if (prevState < 1 && d[end] > 0.45) { d[end + 'State'] = 1; d[end + 'Side'] = pz > 0 ? -1 : 1; }
    if (d[end + 'State'] !== prevState) applyBumperState(g, v);
  }
  recomputeFlatNormals(g);
  storeDamage(v, g);
  syncDamageMaterials(mesh, v);
  // compact log of the hits, so a saved (owned) vehicle comes back dented
  if (!replaying) {
    if (!v.dentLog) v.dentLog = [];
    v.dentLog.push([lx, lz, strength]);
    if (v.dentLog.length > 12) v.dentLog.shift();
    syncLooseParts(mesh, v);
  }
  return dropped;
}

let replaying = false;
function replayDents(mesh, v) {
  replaying = true;
  try {
    for (const [lx, lz, st] of v.dentLog) applyVehicleDamage(mesh, v, lx, lz, st);
  } finally {
    replaying = false;
  }
}

export function vehicleDamageParts(mesh) {
  const body = mesh.userData.body;
  return body ? body.geometry.userData.parts : null;
}
