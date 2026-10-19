import { FLAT_SCALE, flatWheelIndex } from './flatlook.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { HABBO_PALETTE, habboMaterial, GeoBuilder, vcMaterial, markShared, composeMatrix, tubeGeometry } from './pixelart3d.js';
import { buildPersonMesh, PERSON_RIG, holdPhoneRiding } from './models3d_people.js';
import { boatKind, boatHasCabin } from './boattypes.js';
import { buildHeliMesh } from './heli3d.js';
import { buildPlaneMesh } from './plane3d.js';
import { hash2, hash3 } from './rng.js';
import { zoneTotals, losseOnderdelen } from './vehicledamage.js';

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
const RIM = 0x9ea2a6;

const geoCache = new Map();
function cached(key, build) {
  let g = geoCache.get(key);
  if (!g) {
    g = markShared(build());
    geoCache.set(key, g);
  }
  return g;
}

function toHex(c, fallback) {
  if (typeof c === 'number') return c;
  if (typeof c === 'string') return new THREE.Color(c).getHex();
  return fallback;
}

// Glass is a see-through tint so the people inside show; a burnt-out
// wreck gets sooty, matt paint and blind black windows instead.
// no metalness: a mirror sheen turns windscreens into opaque grey sheets against the sky
const GLASS_OPACITY = 0.42;
function vehicleMaterials(wrecked = false) {
  return [
    vcMaterial(wrecked ? { roughness: 0.95, metalness: 0.05 } : { roughness: 0.5, metalness: 0.1 }),
    wrecked ? vcMaterial({ roughness: 0.9, metalness: 0, color: 0x3a3a3a }) : vcMaterial({ roughness: 0.28, metalness: 0, envMapIntensity: 0.35, transparent: true, opacity: GLASS_OPACITY, depthWrite: false }),
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

function bikeWheelGeometry(r, tire, spokes = true) {
  return cached(`bwheel|${r}|${tire}|${spokes}`, () => {
    const B = new GeoBuilder(1);
    B.geo(new THREE.TorusGeometry(r - tire, tire, 4, 16), null, TIRE);
    B.geo(new THREE.TorusGeometry(r - tire * 2 - 0.008, 0.01, 3, 16), null, RIM);
    B.geo(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 6).rotateX(Math.PI / 2), null, RIM);
    if (spokes) {
      for (let k = 0; k < 4; k++) B.box(0, 0, 0, (r - tire * 2) * 2, 0.008, 0.008, 0x8a8e92, 0, 0, 0, (k / 4) * Math.PI);
    } else {
      for (let k = 0; k < 5; k++) B.box(0, 0, 0, (r - tire) * 1.9, 0.03, 0.02, 0x3a3a3c, 0, 0, 0, (k / 5) * Math.PI);
    }
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

function extrudeProfile(pts, depth, bevel = 0.04) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelOffset: -bevel * 0.8,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geo.translate(0, 0, -(depth - bevel * 2) / 2);
  return geo;
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
    : [[hl, P.nose], [hl - (P.boxy ? 0.05 : 0.14), P.hood], [P.xA, P.belt], [P.xD, P.belt], [-hl + (P.boxy ? 0.04 : 0.1), P.deck], [-hl, P.tail]];
  const outline = [...top, [-hl, sill + 0.08], ...archedSill(-hl, hl, sill, arches), [hl, sill + 0.08]];
  B.geo(extrudeProfile(outline, W, P.boxy ? 0.025 : 0.05), null, paint);
  archLiners(B, arches, W);

  if (P.van) {
    const gh = [[P.xA + 0.03, P.belt - 0.03], [P.xB, P.roof - 0.12], [P.xB - 0.3, P.roof - 0.03], [xK + 0.01, P.roof - 0.03], [xK + 0.01, P.belt - 0.03]];
    B.geo(extrudeProfile(gh, W * 0.9, 0.03), null, GLASS, G_GLASS);
    B.geo(extrudeProfile([[P.xB + 0.03, P.roof - 0.14], [P.xB - 0.3, P.roof], [xK, P.roof], [xK, P.roof - 0.08]], W * 0.97, 0.025), null, paint);
    const pz = W * 0.45;
    for (const s of [1, -1]) {
      sideStrip(B, P.xA + 0.02, P.belt - 0.01, P.xB + 0.03, P.roof - 0.12, s * pz, 0.07, 0.05, paint);
      sideStrip(B, xK + 0.04, P.belt, xK + 0.04, P.roof - 0.02, s * pz, 0.08, 0.05, paint);
      sideStrip(B, P.xA + 0.02, P.belt + 0.005, xK, P.belt + 0.005, s * (pz + 0.01), 0.025, 0.03, TRIM);
      sideStrip(B, -hl + 1.6, 1.0, -hl + 1.6, P.roof - 0.1, s * (hw + 0.004), 0.015, 0.01, shadeHex(paint, 0.7));
    }
    B.box(-hl - 0.004, (P.belt + P.roof) / 2 + 0.2, 0, 0.012, 0.5, W * 0.06, TRIM);
    for (const s of [1, -1]) B.box(-hl - 0.004, P.roof - 0.4, s * hw * 0.5, 0.012, 0.42, hw * 0.75, GLASS, G_GLASS);
  } else {
    const gh = [[P.xA + 0.03, P.belt - 0.03], [P.xB, P.roof - 0.07], [P.xC, P.roof - 0.07], [P.xD + 0.03, P.belt - 0.03]];
    B.geo(extrudeProfile(gh, W * 0.84, 0.03), null, GLASS, G_GLASS);
    const roofPts = [[P.xB + 0.07, P.roof - 0.09], [P.xB - 0.04, P.roof], [P.xC + 0.04, P.roof], [P.xC - 0.07, P.roof - 0.09]];
    B.geo(extrudeProfile(roofPts, W * 0.87, 0.025), null, paint);
    const pz = W * 0.42;
    for (const s of [1, -1]) {
      sideStrip(B, P.xA + 0.02, P.belt - 0.01, P.xB + 0.02, P.roof - 0.05, s * pz, 0.07, 0.05, paint);
      sideStrip(B, P.xC - 0.02, P.roof - 0.05, P.xD, P.belt - 0.01, s * pz, type === 'sedan' || type === 'sport' ? 0.09 : 0.16, 0.05, paint);
      const bx = (P.xB + P.xC) / 2 + 0.15;
      sideStrip(B, bx, P.belt, bx - 0.06, P.roof - 0.06, s * (pz + 0.005), 0.07, 0.04, TRIM);
      sideStrip(B, P.xA + 0.02, P.belt + 0.005, P.xD, P.belt + 0.005, s * (pz + 0.01), 0.025, 0.03, TRIM);
    }
  }

  const bumper = P.boxy ? CHROME : 0x2a2b2d;
  const vcount = () => B.groups[G_BODY].p.length / 3;
  const f0 = vcount();
  B.box(hl + 0.02, 0.38, 0, 0.12, 0.14, W - 0.04, bumper);
  B.box(hl + 0.085, 0.38, 0, 0.012, 0.1, 0.48, PLATE);
  const f1 = vcount();
  B.box(-hl - 0.02, 0.4, 0, 0.12, 0.14, W - 0.04, bumper);
  const r1 = vcount();
  B.box(-hl - 0.008, P.van ? 0.62 : Math.min(0.6, P.tail - 0.22), 0, 0.012, 0.1, 0.48, PLATE);
  const lampY = P.nose - 0.06;
  for (const s of [1, -1]) {
    B.box(hl + 0.006, lampY, s * (hw - 0.26), 0.03, P.boxy ? 0.14 : 0.1, 0.3, HEADLAMP, G_LAMP);
    B.box(hl + 0.006, lampY - (P.boxy ? 0.1 : 0.09), s * (hw - 0.1), 0.03, 0.05, 0.1, INDICATOR, G_LAMP);
    const tailY = P.van ? 0.95 : P.tail - 0.1;
    B.box(-hl - 0.006, tailY, s * (hw - 0.18), 0.03, P.van ? 0.3 : 0.12, P.van ? 0.14 : 0.3, TAIL, G_LAMP);
    B.box((P.fw + P.rw) / 2, sill + 0.08, s * (hw + 0.005), (P.fw - P.rw) - R * 2 - 0.1, 0.1, 0.02, TRIM);
    if (!P.van) {
      for (const dx of [P.xA - 0.04, (P.xB + P.xC) / 2 + 0.15]) B.box(dx, (sill + P.belt) / 2 + 0.1, s * (hw + 0.003), 0.012, P.belt - sill - 0.25, 0.01, shadeHex(paint, 0.6));
      B.box((P.xB + P.xC) / 2 + 0.05, P.belt - 0.08, s * (hw + 0.006), 0.12, 0.025, 0.012, shadeHex(paint, 0.7));
    }
  }

  if (opts.police) {
    for (const s of [1, -1]) {
      const z = s * (hw + 0.007);
      B.box(0, 0.84, z, L - 0.3, 0.13, 0.012, 0x1f3f8f);
      B.box(0, 0.755, z, L - 0.3, 0.025, 0.012, 0xd9772b);
    }
    B.box((P.xB + P.xC) / 2, P.roof + 0.05, 0, 0.3, 0.07, W * 0.72, TRIM);
  }
  if (opts.ambulance) {
    // Dutch ambulance: yellow body, a blue/yellow block band along the sides
    const n = 8, x0 = -hl + 0.15, x1 = P.xA - 0.1, bw = (x1 - x0) / n;
    for (const s of [1, -1]) {
      const z = s * (hw + 0.007);
      for (let i = 0; i < n; i++) {
        for (const [row, y] of [[0, 0.62], [1, 0.84]]) {
          if ((i + row) % 2) B.box(x0 + bw * (i + 0.5), y, z, bw, 0.22, 0.012, 0x1d4fa3);
        }
      }
      B.box((x0 + x1) / 2, 1.0, z, x1 - x0, 0.05, 0.012, 0x2f8f4e);
    }
    // the high-roof conversion box over the patient bay: ~2.6 m in all
    const roofX0 = P.xB - 0.45, rh = 0.48;
    B.box((roofX0 - hl) / 2, P.roof + rh / 2 - 0.02, 0, roofX0 + hl, rh, W - 0.04, paint);
    B.box(roofX0 + 0.04, P.roof + rh / 2, 0, 0.08, rh - 0.1, W * 0.7, 0x1d4fa3);
    B.box(-hl - 0.008, 1.45, 0, 0.012, 0.36, 0.36, 0xf4f2ee);
    B.box(-hl - 0.012, 1.45, 0, 0.012, 0.28, 0.08, 0x1d4fa3);
    B.box(-hl - 0.012, 1.45, 0, 0.012, 0.08, 0.28, 0x1d4fa3);
  }
  const variant = opts.variant || '';
  if (variant === 'taxi') {
    B.box((P.xB + P.xC) / 2 + 0.15, P.roof + 0.1, 0, 0.28, 0.16, 0.62, 0xf0c24e);
    B.box((P.xB + P.xC) / 2 + 0.15, P.roof + 0.1, 0, 0.3, 0.07, 0.64, TRIM);
    for (const x of [hl + 0.086, -hl - 0.009]) B.box(x, x > 0 ? 0.38 : Math.min(0.6, P.tail - 0.22), 0, 0.013, 0.1, 0.48, 0x2f5fb0);
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
      B.box((P.xB + P.xC) / 2, P.belt - 0.12, s * (hw + 0.008), 1.4, 0.04, 0.012, 0x3fc6d4);
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
      B.box((bay0 + bay1) / 2, 1.28, z, bay1 - bay0, 0.34, 0.012, GREEN);
      B.box((bay0 + bay1) / 2, 1.08, z, bay1 - bay0, 0.05, 0.012, GOLD);
      B.box((bay0 + bay1) / 2, 1.48, z, bay1 - bay0, 0.05, 0.012, GOLD);
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
    B.geo(new THREE.CylinderGeometry(0.26, 0.04, 0.1, 10), composeMatrix(rx - 0.45, P.roof + 0.14, 0, 0, 0, 0.5), 0xdfe3e6);
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
    for (const s of [1, -1]) B.box((P.xB + P.xC) / 2, P.roof + 0.03, s * W * 0.36, (P.xB - P.xC) * 0.8, 0.04, 0.04, TRIM);
  }
  const geo = B.build();
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

function assembleCar(type, L, W, paint, { police = false, ambulance = false, wrecked = false, wheelR = WHEEL_R, variant = '' } = {}) {
  const color = wrecked ? WRECKED_COLOR : paint;
  const vr = wrecked ? '' : variant;
  const geo = cached(`car|${type}|${L}|${W}|${color}|${police}|${ambulance}|${vr}`, () => buildCarGeometry(type, L, W, color, { police, ambulance, wheelR, variant: vr }));
  const mats = vehicleMaterials(wrecked);
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
  const P = carProfile(type, L / 2);
  // grille and mirrors are their own meshes, so they can come off in a crash (#205)
  group.userData.loose = looseCarParts(type, L, W, color, P, mats, group);
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
      group.add(lamp);
      lamps.push(lamp);
    }
    group.userData.policeLamps = lamps;
  }
  return group;
}

// Sierdoppen: een lichte schijf op elk wiel, samen één 'onderdeel' dat los kan raken (#205).
const CAP_MAT = new THREE.MeshBasicMaterial({ color: 0xc4c8cc });
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
    const mx = P.van ? P.xA - 0.12 : P.xA - 0.08;
    for (const s of [1, -1]) {
      B.box(mx, P.belt + 0.1, s * (hw + 0.08), 0.1, 0.09, 0.14, paint);
      B.box(mx + 0.02, P.belt + 0.05, s * (hw + 0.02), 0.05, 0.04, 0.06, TRIM);
    }
  });
  make('uitlaat', (B) => {
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
  if (v.model.name === 'foodtruck') return buildFoodtruckMesh(v);
  // a stolen police car that went through the spray shop wears its new paint
  const police = !!v.isPolice && !v._commandeered && !v.model.resprayed;
  const paint = police ? 0xeceae4 : toHex(v.model.color, HABBO_PALETTE.metalGrey);
  const type = carType(v);
  const wheelR = type === 'van' ? 0.34 : type === 'suv' ? 0.38 : WHEEL_R;
  return assembleCar(type, v.model.len, v.model.wid, paint, { police, wrecked: v.wrecked, wheelR, variant: carVariant(v) });
}

// Bakwagen: cab-over front with a box body.
function buildTruckMesh(v) {
  const L = v.model.len, W = v.model.wid, hl = L / 2, hw = W / 2;
  const paint = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, 0xe8e6e0);
  const r = 0.52;
  const tank = !!v.model.tank;
  const geo = cached(`truck|${L}|${W}|${paint}|${tank}`, () => {
    const B = new GeoBuilder(3);
    const cabL = 2.0, boxX0 = -hl, boxX1 = hl - cabL - 0.1;
    B.box(0, 0.74, 0, L - 0.2, 0.22, W - 0.3, 0x2a2b2d);
    const bx = (boxX0 + boxX1) / 2, bl = boxX1 - boxX0;
    if (tank) {
      // a rounded tank from three stacked slabs, a walkway on top and a red band
      const tc = paint === WRECKED_COLOR ? paint : 0xd9dcdf;
      B.box(bx, 2.2, 0, bl, 1.43, W, tc);
      B.box(bx, 2.2, 0, bl, 2.31, W - 0.55, tc);
      B.box(bx, 2.2, 0, bl - 0.2, 2.7, W - 1.1, tc);
      B.box(bx, 3.58, 0, bl * 0.8, 0.06, 0.5, TRIM);
      B.box(bx, 1.88, 0, bl + 0.02, 0.3, W + 0.02, paint === WRECKED_COLOR ? paint : 0xb8322a);
    } else B.box(bx, 2.275, 0, bl, 2.75, W, paint === WRECKED_COLOR ? paint : 0xeeeee8);
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
      if (!tank) B.box((boxX0 + boxX1) / 2, 2.4, s * (hw + 0.006), (boxX1 - boxX0) * 0.7, 0.55, 0.012, paint);
    }
    B.box(hl + 0.03, 0.64, 0, 0.1, 0.24, W - 0.1, 0x2a2b2d);
    B.box(hl + 0.085, 0.64, 0, 0.012, 0.1, 0.48, PLATE);
    B.box(-hl - 0.012, 0.7, 0, 0.012, 0.1, 0.48, PLATE);
    return B.build();
  });
  const mats = vehicleMaterials();
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
  const wgeo = carWheelGeometry(r, 0.3);
  const wheels = [];
  for (const x of [hl - 1.25, -hl + 1.7]) for (const s of [1, -1]) addWheel(group, wgeo, mats[0], x, r, s * (hw - 0.2), wheels);
  group.userData.wheels = wheels;
  group.userData.wheelRadius = r;
  if (tank && v.model.livery === 'usmemvet' && !v.wrecked) {
    // H8: the lettering on both flanks of the tank, on the body so it pitches,
    // rolls and bounces with the suspension
    const bl = L - 2.1;
    const geoL = cached('usmemvet-panel', () => new THREE.PlaneGeometry(4.1, 0.76));
    const mat = new THREE.MeshLambertMaterial({ map: usMemVetTexture() });
    for (const s of [1, -1]) {
      const panel = new THREE.Mesh(geoL, mat);
      panel.position.set(-hl + bl / 2, 2.46, s * (hw + 0.012));
      if (s < 0) panel.rotation.y = Math.PI;
      body.add(panel);
    }
  }
  return group;
}

// "Us Mem Vet": Jelle's frying-fat brand, after the Frisian flag (blue-white
// bends, red pompeblêden) and Us Mem, the cow statue in Leeuwarden.
let usMemVetTex = null;
function usMemVetTexture() {
  if (usMemVetTex) return usMemVetTex;
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 190;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f2ec';
  g.fillRect(0, 0, 1024, 190);
  // the flag's bends on the left third
  g.save();
  g.beginPath(); g.rect(0, 0, 260, 190); g.clip();
  g.rotate(0.5);
  g.fillStyle = '#1d4f9c';
  for (let i = -6; i < 10; i += 2) g.fillRect(-400, i * 32, 1400, 32);
  g.restore();
  g.fillStyle = '#d42a24';
  const leaf = (x, y, k) => {
    g.beginPath();
    g.moveTo(x, y + 14 * k);
    g.bezierCurveTo(x - 20 * k, y, x - 12 * k, y - 18 * k, x, y - 7 * k);
    g.bezierCurveTo(x + 12 * k, y - 18 * k, x + 20 * k, y, x, y + 14 * k);
    g.fill();
  };
  for (const [x, y] of [[45, 50], [130, 34], [205, 92], [85, 130], [180, 160]]) leaf(x, y, 1.1);
  // the cow: Us Mem in profile, black and white
  g.fillStyle = '#1c1d20';
  g.beginPath(); g.ellipse(335, 100, 58, 34, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(395, 78, 21, 16, -0.4, 0, Math.PI * 2); g.fill();
  for (const x of [298, 320, 350, 372]) g.fillRect(x, 118, 10, 46);
  g.fillStyle = '#f4f2ec';
  g.beginPath(); g.ellipse(318, 92, 21, 14, 0.3, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(360, 110, 15, 10, -0.2, 0, Math.PI * 2); g.fill();
  // the lettering
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#1d4f9c';
  g.font = 'bold 104px "Arial Black", Arial, sans-serif';
  g.fillText('US MEM VET', 440, 112, 560);
  g.fillStyle = '#d42a24';
  g.font = 'italic bold 34px Georgia, serif';
  g.fillText('Frituurvet. Foar mem.', 446, 160, 540);
  g.fillStyle = '#1d4f9c';
  g.fillRect(0, 0, 1024, 8); g.fillRect(0, 182, 1024, 8);
  usMemVetTex = new THREE.CanvasTexture(c);
  usMemVetTex.colorSpace = THREE.SRGBColorSpace;
  usMemVetTex.anisotropy = 4;
  return usMemVetTex;
}

// Jelle Terpstra's trekker-limousine: a tractor up front (big rear wheels,
// exhaust stack, little flags) with a stretched black limousine behind it.
function buildTrekkerLimoMesh(v) {
  const L = v.model.len, W = v.model.wid, hl = L / 2, hw = W / 2;
  const wrecked = v.wrecked;
  const paint = wrecked ? WRECKED_COLOR : toHex(v.model.color, 0x141414);
  const tractor = wrecked ? WRECKED_COLOR : 0x1e6b3a;
  const geo = cached(`trekkerlimo|${L}|${W}|${paint}`, () => {
    const B = new GeoBuilder(3);
    const trL = 2.3, tx0 = hl - trL;
    // tractor: hood, cab, fenders over the big wheels, exhaust. The cab is
    // solid up to the window line and glass above it, so the driver shows.
    const cz = W * 0.43;
    B.box(hl - 0.55, 1.05, 0, 1.1, 0.8, W * 0.62, tractor);
    B.box(tx0 + 0.6, 1.075, 0, 1.2, 0.85, W * 0.86, tractor);
    B.box(tx0 + 0.6, 2.38, 0, 1.2, 0.16, W * 0.86, tractor);
    B.box(tx0 + 0.6, 2.5, 0, 1.3, 0.08, W * 0.9, shadeHex(tractor, 0.8));
    B.box(tx0 + 1.19, 1.9, 0, 0.02, 0.8, W * 0.8, GLASS, G_GLASS);
    B.box(tx0 + 0.01, 1.9, 0, 0.02, 0.8, W * 0.8, GLASS, G_GLASS);
    for (const s of [1, -1]) {
      for (const px of [tx0 + 0.03, tx0 + 1.17]) B.box(px, 1.9, s * (cz - 0.03), 0.06, 0.8, 0.06, tractor);
      B.box(tx0 + 0.6, 1.9, s * cz, 1.1, 0.8, 0.02, GLASS, G_GLASS);
      B.box(tx0 + 0.55, 1.35, s * (hw - 0.12), 1.3, 0.12, 0.34, shadeHex(tractor, 0.75));
      B.box(hl + 0.01, 0.95, s * (W * 0.2), 0.02, 0.14, 0.2, HEADLAMP, G_LAMP);
      // flag poles with red leaves on white and blue
      B.box(hl - 0.2, 1.75, s * (W * 0.28), 0.04, 1.3, 0.04, CHROME);
      B.box(hl - 0.42, 2.25, s * (W * 0.28), 0.42, 0.28, 0.015, 0x2553a6);
      B.box(hl - 0.42, 2.25, s * (W * 0.28 + 0.01), 0.2, 0.14, 0.012, 0xc8102e);
    }
    B.box(hl - 0.95, 2.0, W * 0.2, 0.1, 1.0, 0.1, TRIM);
    // limousine body, long windows, chrome line
    const lx = (-hl + tx0) / 2, ll = tx0 + hl;
    B.box(lx, 0.72, 0, ll, 0.62, W, paint);
    B.box(lx - 0.1, 1.3, 0, ll - 0.6, 0.55, W - 0.12, paint);
    B.box(lx - 0.1, 1.6, 0, ll - 0.8, 0.06, W - 0.2, shadeHex(paint, 1.3));
    for (const s of [1, -1]) {
      B.box(lx - 0.1, 1.3, s * (hw - 0.055), ll - 1.0, 0.36, 0.02, GLASS, G_GLASS);
      B.box(lx, 0.95, s * (hw + 0.005), ll - 0.2, 0.04, 0.01, CHROME);
      B.box(-hl - 0.01, 0.85, s * (hw - 0.2), 0.02, 0.16, 0.24, TAIL, G_LAMP);
    }
    B.box(-hl - 0.012, 0.6, 0, 0.012, 0.1, 0.48, PLATE);
    return B.build();
  });
  const mats = vehicleMaterials();
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
  const wheels = [];
  const small = carWheelGeometry(0.42, 0.3), big = carWheelGeometry(0.78, 0.5), limo = carWheelGeometry(0.34, 0.26);
  for (const s of [1, -1]) {
    addWheel(group, small, mats[0], hl - 0.55, 0.42, s * (hw - 0.3), wheels);
    addWheel(group, big, mats[0], hl - 1.75, 0.78, s * (hw - 0.05), wheels);
    addWheel(group, limo, mats[0], -hl + 0.8, 0.34, s * (hw - 0.2), wheels);
  }
  group.userData.wheels = wheels;
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
function buildTractorMesh(v) {
  const L = v.model.len, W = v.model.wid, hl = L / 2, hw = W / 2;
  const paint = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, 0x3f7d3a);
  const C = tractorCab(L);
  const geo = cached(`tractor|${L}|${W}|${paint}`, () => {
    const B = new GeoBuilder(3);
    const cz = W * 0.43, cl = C.x1 - C.x0, cx = (C.x0 + C.x1) / 2;
    const gh = C.roof - C.belt, gy = (C.roof + C.belt) / 2;
    // hood over the engine, frame and front axle beneath it
    const hx0 = C.x1 - 0.05;
    B.box((hx0 + hl) / 2, 1.27, 0, hl - hx0, 0.76, W * 0.55, paint);
    B.box((hx0 + hl) / 2 + 0.05, 1.66, 0, hl - hx0 - 0.25, 0.04, W * 0.5, shadeHex(paint, 0.85));
    B.box((C.x0 + hl) / 2, 0.78, 0, hl - C.x0 - 0.2, 0.5, W * 0.42, 0x2a2a2a);
    B.box(hl - 0.04, 1.2, 0, 0.08, 0.5, W * 0.48, 0x2a2a2a);
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
    return B.build();
  });
  const mats = vehicleMaterials(v.wrecked);
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
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
      B.box(-hl + 0.12, 0.72, s * 0.24, 0.02, 0.08, 0.1, TAIL, G_LAMP);
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

// The Fjord Frituur: Tessa's foodtruck. A blue van with a serving hatch and
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
  g.fillText('FJORD FRITUUR', 292, 66, 400);
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
  const group = assembleCar('van', L, W, paint, { wrecked, wheelR: 0.34 });
  if (wrecked) return group;
  const geo = cached(`foodtruck|${L}|${W}|${paint}`, () => {
    const B = new GeoBuilder(3);
    // the hatch: a dark opening with a steel counter, the flap propped up as the awning
    const x0 = -hl + 0.55, x1 = hl - 1.45;
    const cx = (x0 + x1) / 2, cl = x1 - x0;
    B.box(cx, 1.45, hw + 0.004, cl, 0.8, 0.01, 0x1c1d20);
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
    B.geo(new THREE.SphereGeometry(0.43, 12, 9, 0, Math.PI * 2, 0, 0.9), composeMatrix(hl - 1.25, 2.55, 0, 0, 0, 0, 1, 0.92, 1), 0xd89a44);
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
  return buildFordEscortGroup(color);
}

// --- bike / scooter ----------------------------------------------------------------

function riderFor(v, shirtHex) {
  const skins = [0xe8b48a, 0xcaa06f, 0x8a5a3c, 0x5c3d28, 0xf0c9a0];
  const seed = (v.id || 0) * 3.7 + 1;
  return buildPersonMesh(shirtHex, skins[Math.floor(hash2(seed, 2.1) * skins.length)], { seed });
}

function poseRider(rider, legBase, armAngle, lean) {
  const ud = rider.userData;
  rider.rotation.z = lean;
  ud.armL.rotation.z = armAngle;
  ud.armR.rotation.z = armAngle;
  ud.legL.rotation.z = legBase;
  ud.legR.rotation.z = legBase;
}

function buildBikeGeometry(color, fat, stepThrough) {
  return cached(`bike|${color}|${fat}|${stepThrough}`, () => {
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
    const stemTop = [H1[0] - 0.02, H1[1] + 0.14, 0];
    tube(H1, stemTop, 0.014, 0x8a8e92);
    for (const s of [1, -1]) {
      const grip = [stemTop[0] - 0.2, stemTop[1] - 0.02, s * 0.28];
      tube(stemTop, [stemTop[0] - 0.02, stemTop[1], s * 0.12], 0.012, 0x8a8e92);
      tube([stemTop[0] - 0.02, stemTop[1], s * 0.12], grip, 0.012, 0x8a8e92);
      tube(grip, [grip[0] - 0.1, grip[1] - 0.01, grip[2]], 0.018, 0x1b1b1c);
    }
    for (const [x] of [F, R]) {
      const guard = new THREE.TorusGeometry(r + 0.03, fat ? 0.05 : 0.028, 3, 9, Math.PI * 0.85);
      guard.scale(1, 1, fat ? 1.2 : 1);
      B.geo(guard, composeMatrix(x, r, 0, 0, 0, Math.PI * 0.08), color);
    }
    if (!fat) {
      B.box(-0.33, 0.44, 0.075, 0.62, 0.13, 0.03, color, 0, 0, 0, 0.07);
      B.box(-0.5, 0.78, 0, 0.44, 0.02, 0.15, 0x2a2a2b);
      for (const s of [1, -1]) tube([-0.66, 0.78, s * 0.07], [R[0], R[1], s * 0.06], 0.01, 0x2a2a2b);
      B.geo(new THREE.CylinderGeometry(0.045, 0.035, 0.07, 7).rotateZ(Math.PI / 2), composeMatrix(H0[0] + 0.07, H0[1] + 0.04, 0), 0x2a2a2b);
      B.box(H0[0] + 0.11, H0[1] + 0.04, 0, 0.01, 0.06, 0.06, HEADLAMP, G_LAMP);
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

function buildBikeMesh(v) {
  if (v.model.cargo) return buildBakfietsMesh(v);
  const group = new THREE.Group();
  const fat = !!v.model.fat;
  const color = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, HABBO_PALETTE.black);
  const stepThrough = hash2(v.id || 0, 4.2) < 0.5;
  const mats = vehicleMaterials();
  group.add(new THREE.Mesh(buildBikeGeometry(color, fat, stepThrough), mats));
  const r = fat ? 0.3 : 0.34;
  const wb = fat ? 0.52 : 0.56;
  const wgeo = bikeWheelGeometry(r, fat ? 0.07 : 0.022);
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

function buildScooterGeometry(color) {
  return cached(`step|${color}`, () => {
    const B = new GeoBuilder(3);
    // deck with the battery pack slung underneath and grip tape on top
    B.box(-0.04, 0.13, 0, 0.78, 0.05, 0.19, color);
    B.box(-0.04, 0.095, 0, 0.62, 0.05, 0.15, 0x26272a);
    B.box(-0.06, 0.158, 0, 0.64, 0.008, 0.155, 0x1d1d1e);
    // steering neck and a thick stem
    B.geo(tubeGeometry([0.3, 0.14, 0], [0.43, 0.12, 0], 0.028, 0.026, 6), null, color);
    B.geo(tubeGeometry([0.43, 0.1, 0], [0.37, 1.02, 0], 0.034, 0.028, 8), null, color);
    B.box(0.43, 0.2, 0, 0.06, 0.12, 0.05, 0x2a2a2b);
    B.geo(tubeGeometry([0.43, 0.2, 0.03], [0.42, 0.11, 0.035], 0.012, 0.012, 4), null, 0x8a8e92);
    B.geo(tubeGeometry([0.43, 0.2, -0.03], [0.42, 0.11, -0.035], 0.012, 0.012, 4), null, 0x8a8e92);
    // bars, grips, the little display and a bell
    B.geo(tubeGeometry([0.37, 1.03, -0.25], [0.37, 1.03, 0.25], 0.016, 0.016, 6), null, 0x2a2a2b);
    for (const s of [1, -1]) B.geo(tubeGeometry([0.37, 1.03, s * 0.17], [0.37, 1.03, s * 0.26], 0.022, 0.022, 6), null, 0x1b1b1c);
    B.box(0.37, 1.055, 0, 0.07, 0.025, 0.1, 0x1b1b1c);
    B.box(0.35, 1.07, 0, 0.012, 0.018, 0.07, 0x5fd0e0, G_LAMP);
    B.geo(new THREE.CylinderGeometry(0.018, 0.022, 0.02, 8), composeMatrix(0.37, 1.05, -0.13), 0xc8cbcf);
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
function buildMopedGeometry(color) {
  return cached(`moped|${color}`, () => {
    const B = new GeoBuilder(3);
    const dark = 0x2a2b2e;
    B.box(-0.38, 0.5, 0, 0.72, 0.36, 0.44, color);
    B.box(-0.3, 0.73, 0, 0.7, 0.1, 0.32, 0x1b1b1c);
    B.box(0.08, 0.3, 0, 0.62, 0.07, 0.36, dark);
    B.box(0.42, 0.62, 0, 0.12, 0.62, 0.44, color);
    B.box(0.48, 0.34, 0, 0.3, 0.1, 0.2, color);
    B.geo(tubeGeometry([0.46, 0.7, 0], [0.42, 1.04, 0], 0.032, 0.03, 6), null, dark);
    B.geo(tubeGeometry([0.42, 1.04, -0.32], [0.42, 1.04, 0.32], 0.018, 0.018, 6), null, CHROME);
    for (const s of [1, -1]) B.geo(tubeGeometry([0.42, 1.04, s * 0.22], [0.42, 1.04, s * 0.33], 0.024, 0.024, 6), null, 0x1b1b1c);
    B.box(0.49, 1.0, 0, 0.1, 0.12, 0.16, color);
    B.box(0.545, 1.0, 0, 0.02, 0.08, 0.1, HEADLAMP, G_LAMP);
    for (const s of [1, -1]) B.box(0.43, 1.12, s * 0.2, 0.02, 0.07, 0.05, CHROME);
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
  sport: { r: 0.3, tire: 0.1, fx: 0.7, rx: -0.68, seat: { x: -0.3, y: 0.8, lean: -0.5, arm: 1.2, leg: 1.25 } },
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
    const F = [s.fx, s.r, 0], R = [s.rx, s.r, 0];
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
  const wheels = [];
  addWheel(group, wgeo, mats[0], s.fx * sx, s.r, 0, wheels);
  addWheel(group, wgeo, mats[0], s.rx * sx, s.r, 0, wheels);
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
  group.add(new THREE.Mesh(buildScooterGeometry(color), mats));
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
// heading like v.angle), clamped so a trail glitch can never fold it double.
export function setBusRearAngle(mesh, busAngle, rearAngle) {
  const rear = mesh.userData.busRear;
  if (!rear) return;
  let d = (rearAngle - busAngle) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  else if (d < -Math.PI) d += Math.PI * 2;
  rear.rotation.y = -Math.max(-0.75, Math.min(0.75, d));
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
const IND_MAT = markShared(new THREE.MeshBasicMaterial({ color: 0xff9a1a }));
const IND_PERIOD = 0.62;
export function updateIndicatorLamps(mesh, v, time) {
  let lamps = mesh.userData.indLamps;
  if (!lamps) {
    if (!v.indicator) return;
    const m = v.model || {};
    // a bicycle has no indicators; hand signals are not drawn
    if (v.isBike && !m.motorbike) { mesh.userData.indLamps = []; return; }
    const len = m.len || 4, wid = m.wid || 1.7;
    const bike = !!(m.motorbike || v.isBike || v.isScooter);
    const hz = bike ? 0.16 : wid / 2 - 0.16, y = bike ? 0.85 : m.van ? 0.95 : 0.66;
    lamps = [];
    for (const side of [-1, 1]) for (const end of [1, -1]) {
      const l = new THREE.Mesh(bike ? IND_GEO_SMALL : IND_GEO, IND_MAT);
      l.position.set(end * (len / 2 + 0.01), y, side * hz);
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

const NAV_RED = 0xff2a1a, NAV_GREEN = 0x26ff5a, NAV_WHITE = 0xfff4dc;
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
  const rx0 = -hl + 1.25, rx1 = hl - 1.35, roofY = 1.6;
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

function buildBoatGeometry(kind, L, W, hull, trim, cabin, police) {
  return cached(`boat|${kind}|${L}|${W}|${hull}|${trim}|${cabin}|${police}`, () => {
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
      default: sloepFit(B, st, L, W, hull, cabin, police);
    }
    if (kind === 'kano' || kind === 'kajak') {
      const x = -hl * 0.72;
      B.box(x, hullAt(st, x).top + (kind === 'kajak' ? 0.06 : 0.02), 0, 0.05, 0.05, 0.05, NAV_WHITE, G_LAMP);
    } else if (kind !== 'sup' && kind !== 'skiff' && kind !== 'acht') navLights(B, st, L, st[0].top + (kind === 'rubberboot' ? 0.42 : 0.06));
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
  const trims = kind === 'skutsje' ? [0x2a211b] : kind === 'binnenvaart' ? [0xe8e6e0] : kind === 'rondvaart' ? [0xe8e6e0, 0xc9a227] : kind === 'kano' || kind === 'kajak' || kind === 'sup' ? [shadeHex(hull, 0.7), 0x2a2a2b] : kind === 'skiff' || kind === 'acht' ? [0xc8502a, 0x1f4f9a, 0x2f7d46, 0x6a2e8a] : [0x21468b, 0x2f4a3a, 0x6b2a24, 0x9a7048];
  const trim = police ? 0x1f3f8f : trims[Math.floor(hash2(v.id || 0, 8.1) * trims.length)];
  const cabin = kind === 'sloep' ? (boatHasCabin(v) ? cabinColor : 0) : cabinColor;
  group.add(new THREE.Mesh(buildBoatGeometry(kind, len, wid, hull, trim, cabin, police), vehicleMaterials()));
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

// --- wheel spin ---------------------------------------------------------------

// Rolls every wheel by the distance travelled this frame and turns the front
// wheels with the steering; bike riders pedal in step. The drawn roll per
// frame is capped below half the spoke spacing, so fast wheels keep turning
// forwards instead of strobing still or backwards (wagon-wheel effect).
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
  for (const w of wheels) w.rotation.z -= shown;
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

// Midi bus: one short rigid section, same livery as the big ones.
function buildMidiBusMesh(v) {
  const group = new THREE.Group();
  const len = v.model.len, wid = v.model.wid, hl = len / 2;
  const fwX = hl - 1.9, rwX = -hl + 2.0;
  const geo = cached(`midibus|${len}|${wid}|${!!v.wrecked}`, () => {
    const B = new GeoBuilder(3);
    busSection(B, -hl, hl, wid, { front: true, rear: true, wheelXs: [fwX, rwX], doorXs: [hl - 1.05, 0.2] });
    return B.build();
  });
  const mats = vehicleMaterials();
  group.add(new THREE.Mesh(geo, mats));
  const wgeo = carWheelGeometry(BUS_WHEEL_R, 0.3);
  const wheels = [];
  for (const x of [fwX, rwX]) for (const s of [1, -1]) addWheel(group, wgeo, mats[0], x, BUS_WHEEL_R, s * (wid / 2 - 0.2), wheels);
  group.userData.wheels = wheels;
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
  group.userData.vehicleId = v.id;
  group.userData.builtAt = performance.now();
  meshRegistry.set(v.id, group);
  if (v.damage) restoreDamage(group, v);
  else if (v.dentLog && v.dentLog.length && !v.wrecked) replayDents(group, v);
  if (v.dentLog && v.dentLog.length) syncLooseParts(group, v);
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
  mats[1].roughness = 0.28 + k * 0.4;
  // crazed glass is harder to see through
  if (mats[1].transparent) mats[1].opacity = GLASS_OPACITY + k * 0.4;
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
