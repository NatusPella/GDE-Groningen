import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { composeMatrix, tubeGeometry } from './pixelart3d.js';

// De fiets in de stijl van de andere hoofdvoertuigen (24-11): achtkantige buizen, een echt frame met kettingkast,
// spatborden en bagagedrager, wielen met spaken, een zadel met naden, trappers die meedraaien, rem- en lichtkabels.
// Pure bouwers op een GeoBuilder (materiaalgroepen: 0 lak, 1 glas, 2 lampen); models3d_vehicles.js cachet en monteert.
// Vaste maten voor de rijder (models3d_people.js pedalIK): trapas (-0,05; 0,30), kruklengte 0,17, wiel 0,34 op +-0,56.

const G_LAMP = 2;
const RIM = 0x9ea2a6, METAL = 0x8a8e92, DARK = 0x1b1b1c, GRIP = 0x1b1b1c, TIRE = 0x1b1b1c;
const HEADLAMP = 0xf2efe4, TAIL = 0xa3211b, REFLECTOR = 0xd8452f, RUST = 0x7a4a2a;
const SADDLE = 0x2a1d14, SEAM = 0x5a4634;

export const BIKE_BB = [-0.05, 0.3];
export const BIKE_CRANK = 0.17;

function shade(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f)), g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f)), b = Math.min(255, Math.round((hex & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

// Meetkundige punten per stijl: zadelbuis (S), kop boven (H1) en onder (H0), en de vorm van het stuur.
// grip: het midden van een handvat (bike-assen), lean: hoe ver de rijder voorover hangt (rad).
const STIJL = {
  stad: { S: [-0.24, 0.84], H1: [0.4, 0.93], H0: [0.45, 0.72], lean: -0.08, post: 0.14 },
  ebike: { S: [-0.24, 0.84], H1: [0.4, 0.93], H0: [0.45, 0.72], lean: -0.07, post: 0.14 },
  fat: { S: [-0.24, 0.72], H1: [0.4, 0.82], H0: [0.45, 0.66], lean: -0.08, post: 0.2 },
  race: { S: [-0.2, 0.86], H1: [0.38, 0.86], H0: [0.43, 0.7], lean: -0.5, post: 0.12, hipX: -0.23 },
  mtb: { S: [-0.22, 0.81], H1: [0.4, 0.88], H0: [0.46, 0.7], lean: -0.3, post: 0.15, hipX: -0.27 },
};
export const bikeStijlNaam = (model) => (model && model.fat ? 'fat' : model && STIJL[model.stijl] ? model.stijl : 'stad');
export const bikeLean = (stijl) => (STIJL[stijl] || STIJL.stad).lean;
export const bikeHipX = (stijl) => (STIJL[stijl] || STIJL.stad).hipX ?? (stijl === 'fat' ? -0.26 : -0.3);

// Handvatten: x en hoogte van het midden, halve breedte, stuuras. De rijder pakt hier vast (bikeHands).
export function bikeGripSpec(stijl) {
  const s = STIJL[stijl] || STIJL.stad;
  const px = 0.38;
  if (stijl === 'race') return { x: s.H1[0] + 0.07, y: s.H1[1] + 0.12, z: 0.2, px };
  if (stijl === 'mtb') return { x: s.H1[0] - 0.17, y: s.H1[1] + 0.12, z: 0.3, px };
  return { x: 0.13, y: s.H1[1] + 0.115, z: 0.28, px };
}

const tubeAt = (B, a, b, r1, r2, c, sides = 8) => B.geo(tubeGeometry(a, b, r1, r2, sides), null, c);
const cyl = (B, x, y, z, r, len, c, sides = 10, axis = 'z') => {
  const g = new THREE.CylinderGeometry(r, r, len, sides);
  if (axis === 'z') g.rotateX(Math.PI / 2); else if (axis === 'x') g.rotateZ(Math.PI / 2);
  return B.geo(g, composeMatrix(x, y, z), c);
};

// Een gebogen strook (spatbord) om een as: rand-omlaag-gerold, met een onderkant, hoeken a0..a1 (rad, 0 = recht vooruit).
function arcStrip(B, cx, cy, ro, w, a0, a1, segs, color) {
  const ring = (a, d) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [[cx + c * (ro - 0.016 - d), cy + s * (ro - 0.016 - d), -w / 2], [cx + c * (ro - d), cy + s * (ro - d), 0], [cx + c * (ro - 0.016 - d), cy + s * (ro - 0.016 - d), w / 2]];
  };
  for (let i = 0; i < segs; i++) {
    const am = a0 + ((a1 - a0) * (i + 0.5)) / segs;
    const up = [Math.cos(am), Math.sin(am), 0], dn = [-up[0], -up[1], 0];
    const A = ring(a0 + ((a1 - a0) * i) / segs, 0), C = ring(a0 + ((a1 - a0) * (i + 1)) / segs, 0);
    const A2 = ring(a0 + ((a1 - a0) * i) / segs, 0.007), C2 = ring(a0 + ((a1 - a0) * (i + 1)) / segs, 0.007);
    for (let k = 0; k < 2; k++) {
      B.quadOut(A[k], A[k + 1], C[k + 1], C[k], up, color);
      B.quadOut(A2[k], A2[k + 1], C2[k + 1], C2[k], dn, shade(color, 0.7));
    }
  }
}

// Het wiel (spaken, naaf, velg, band, reflector). Eén geometrie per maat; r = buitenstraal, tire = bandstraal.
export function bikeWheelRich(B, r, tire, tireColor = TIRE, opts = {}) {
  const sides = tire > 0.05 ? 8 : 6;
  B.geo(new THREE.TorusGeometry(r - tire, tire, sides, 24), null, tireColor);
  const rr = r - tire * 2 - 0.004;
  B.geo(new THREE.CylinderGeometry(rr, rr, 0.034, 24, 1, true).rotateX(Math.PI / 2), null, opts.rim || RIM);
  B.geo(new THREE.CylinderGeometry(rr - 0.012, rr - 0.012, 0.03, 24, 1, true).rotateX(Math.PI / 2), null, shade(opts.rim || RIM, 0.6));
  cyl(B, 0, 0, 0, 0.026, 0.1, METAL, 8);
  for (const s of [1, -1]) cyl(B, 0, 0, s * 0.036, 0.04, 0.012, METAL, 8);
  const n = opts.spokes || 16;
  for (let k = 0; k < n; k++) {
    const th = (k / n) * Math.PI * 2, off = k % 2 ? 0.42 : -0.42, zf = (k % 2 ? 1 : -1) * 0.034;
    const x0 = Math.cos(th) * 0.04, y0 = Math.sin(th) * 0.04, x1 = Math.cos(th + off) * (rr - 0.005), y1 = Math.sin(th + off) * (rr - 0.005);
    const dx = x1 - x0, dy = y1 - y0, dl = Math.hypot(dx, dy), nx = (-dy / dl) * 0.004, ny = (dx / dl) * 0.004;
    const a = [x0 - nx, y0 - ny, zf * 0.6], b = [x0 + nx, y0 + ny, zf * 0.6], c = [x1 + nx, y1 + ny, 0], d = [x1 - nx, y1 - ny, 0];
    B.quadOut(a, b, c, d, [0, 0, 1], METAL);
    B.quadOut(a, b, c, d, [0, 0, -1], METAL);
  }
  // één reflector op de velg: zonder dit merkteken is de draairichting niet af te lezen (#436)
  const rf = (r - tire) * 0.66, rs = Math.max(0.035, (r - tire) * 0.22);
  B.box(rf, 0, 0, rs, rs * 0.75, Math.max(0.03, rs * 0.8), REFLECTOR);
  if (opts.disc) cyl(B, 0, 0, 0.032, 0.07, 0.005, 0x6a6d70, 12);
  return B;
}

// De krukken met het kettingblad: draait om de trapas met de trapfase (models3d_vehicles updateVehicleWheelSpin).
export function bikeCrankParts(B, stijl) {
  const ring = stijl === 'race' ? 0.095 : 0.085;
  cyl(B, 0, 0, 0.075, ring, 0.012, 0x5a5d60, 16);
  cyl(B, 0, 0, 0.088, ring * 0.7, 0.006, 0x3a3c3e, 12);
  if (stijl === 'race' || stijl === 'mtb') cyl(B, 0, 0, 0.066, ring * 0.6, 0.008, 0x4a4d50, 12);
  cyl(B, 0, 0, 0, 0.022, 0.24, METAL, 8);
  const C = BIKE_CRANK;
  tubeAt(B, [0, 0, 0.1], [C, 0, 0.1], 0.014, 0.01, METAL, 6);
  tubeAt(B, [0, 0, -0.1], [-C, 0, -0.1], 0.014, 0.01, METAL, 6);
  B.box(C, 0, 0.125, 0.1, 0.022, 0.07, DARK);
  B.box(-C, 0, -0.125, 0.1, 0.022, 0.07, DARK);
  B.box(C, 0, 0.1, 0.03, 0.03, 0.03, METAL);
  B.box(-C, 0, -0.1, 0.03, 0.03, 0.03, METAL);
}

// Het frame, de vorken, spatborden, drager, zadel, kettingkast, lampen. o: { color, stijl, stepThrough, st, old, noLight, extra, zonderStuur, hash }
export function bikeFrameParts(B, o) {
  const { color, stijl = 'stad', stepThrough = false, st = '', old = false, extra = {}, hash = 0.5 } = o;
  const noLight = o.noLight || st.includes('L'); // geen voorlicht: de dynamo en de lamp zijn eraf (studentenstaat, staatSleutel L)
  const P = STIJL[stijl] || STIJL.stad;
  const fat = stijl === 'fat', race = stijl === 'race', mtb = stijl === 'mtb', ebike = stijl === 'ebike';
  const sport = race || mtb;
  const r = fat ? 0.3 : 0.34, wb = fat ? 0.52 : 0.56;
  const t = fat ? 0.028 : race ? 0.016 : 0.019;
  const F = [wb, r, 0], R = [-wb, r, 0], BB = [BIKE_BB[0], BIKE_BB[1], 0];
  const { S, H1, H0 } = P;
  const fork = old ? shade(color, 0.85) : color;
  const T = (a, b, r1, r2 = r1, c = color, sides = 8) => tubeAt(B, a, b, r1, r2, c, sides);

  // hoofdbuis, kop en voorvork
  T([H0[0] + 0.004, H0[1] - 0.025, 0], [H1[0] - 0.004, H1[1] + 0.02, 0], t * 1.45, t * 1.45, color, 8);
  cyl(B, H1[0] - 0.006, H1[1] + 0.03, 0, t * 1.7, 0.03, METAL, 8, 'y');
  cyl(B, H0[0] + 0.006, H0[1] - 0.03, 0, t * 1.7, 0.03, METAL, 8, 'y');
  // onderbuis, zadelbuis, bovenbuis
  T([H0[0] - 0.01, H0[1] - 0.03, 0], [BB[0] + 0.005, BB[1] + 0.005, 0], t * 1.2, t * 1.35);
  cyl(B, BB[0], BB[1], 0, t * 1.9, 0.12, color, 8);
  T([S[0] - 0.01, S[1] - 0.02, 0], BB, t, t * 1.1);
  if (stepThrough && !fat && !sport) {
    // lage instap: één gebogen buis van de kop naar de zadelbuis, een tweede als steun
    T([H1[0] + 0.0, H1[1] - 0.06, 0], [0.27, 0.65, 0], t * 1.05, t * 1.05);
    T([0.27, 0.65, 0], [0.1, 0.47, 0], t * 1.05, t * 1.05);
    T([0.1, 0.47, 0], [-0.1, 0.4, 0], t * 1.05, t * 1.05);
    T([-0.1, 0.4, 0], [S[0] + 0.01, S[1] - 0.3, 0], t * 0.9, t * 0.9);
    T([H1[0] + 0.015, H1[1] - 0.15, 0], [0.18, 0.53, 0], t * 0.8, t * 0.8);
  } else {
    T([H1[0] - 0.005, H1[1] - 0.025, 0], [S[0] + 0.005, S[1] - 0.03, 0], t * 1.1, t * 1.0);
  }
  // zadelbuis boven en klem; stoel, vorken, achterbouw
  const post = [S[0] - 0.035, S[1] + P.post, 0];
  T([S[0] - 0.005, S[1] - 0.02, 0], post, 0.0125, 0.0125, METAL, 6);
  cyl(B, S[0] - 0.005, S[1] - 0.005, 0, 0.021, 0.035, METAL, 8, 'y');
  for (const s of [1, -1]) {
    T([S[0] - 0.015, S[1] - 0.05, s * 0.025], [R[0] + 0.005, R[1] + 0.005, s * 0.058], t * 0.78, t * 0.7);
    T([BB[0] - 0.02, BB[1] + 0.005, s * 0.05], [R[0] + 0.005, R[1] - 0.005, s * 0.06], t * 0.85, t * 0.72);
    cyl(B, R[0], R[1], s * 0.06, 0.017, 0.018, METAL, 6);
  }
  T([S[0] - 0.015, S[1] - 0.05, 0.025], [S[0] - 0.015, S[1] - 0.05, -0.025], t * 0.7, t * 0.7);
  // voorvork met een lichte bocht naar voren
  const suspension = mtb;
  for (const s of [1, -1]) {
    const top = [H0[0] + 0.005, H0[1] - 0.012, s * 0.055], bend = [H0[0] + 0.055, (H0[1] + F[1]) * 0.5 + 0.02, s * 0.055], bot = [F[0], F[1], s * 0.052];
    if (suspension) {
      T(top, [bend[0] - 0.005, bend[1] + 0.03, s * 0.055], 0.017, 0.017, 0xb8932b, 6);
      T([bend[0] - 0.005, bend[1] + 0.03, s * 0.055], bot, 0.02, 0.014, shade(color, 0.7));
    } else {
      T(top, bend, 0.015, 0.0125, fork);
      T(bend, bot, 0.0125, 0.0105, fork);
    }
    cyl(B, F[0], F[1], s * 0.052, 0.017, 0.018, METAL, 6);
  }
  B.box(H0[0] + 0.0, H0[1] - 0.045, 0, 0.05, 0.03, 0.14, fork, 0, 0, 0, -0.18);

  // zadel: afgerond, met neus, een lichte naad en veren eronder
  const sx = post[0] - 0.02, sy = post[1];
  if (race || mtb) {
    B.geo(new THREE.SphereGeometry(1, 8, 5), composeMatrix(sx + 0.01, sy + 0.028, 0, 0, 0, 0.04, 0.15, 0.027, 0.062), SADDLE);
    B.box(sx + 0.15, sy + 0.025, 0, 0.12, 0.022, 0.035, SADDLE, 0, 0, 0, 0.02);
    B.box(sx + 0.01, sy + 0.054, 0, 0.26, 0.004, 0.012, SEAM);
  } else {
    B.geo(new THREE.SphereGeometry(1, 8, 5), composeMatrix(sx - 0.03, sy + 0.04, 0, 0, 0, 0.04, 0.15, 0.036, 0.095), SADDLE);
    B.geo(new THREE.SphereGeometry(1, 6, 4), composeMatrix(sx + 0.15, sy + 0.036, 0, 0, 0, 0.03, 0.1, 0.028, 0.045), SADDLE);
    B.box(sx - 0.02, sy + 0.076, 0, 0.3, 0.004, 0.012, SEAM);
    for (const z of [0.07, -0.07]) B.box(sx - 0.03, sy + 0.074, z, 0.26, 0.004, 0.01, SEAM);
    for (const s of [1, -1]) {
      T([sx - 0.1, sy + 0.012, s * 0.045], [sx - 0.1, sy - 0.015, s * 0.025], 0.006, 0.006, METAL, 4);
      T([sx + 0.06, sy + 0.012, s * 0.03], [sx + 0.06, sy - 0.015, s * 0.02], 0.006, 0.006, METAL, 4);
    }
    if (!old) for (const x of [-0.06, 0, 0.06]) cyl(B, sx + x - 0.03, sy - 0.0, 0, 0.012, 0.01, METAL, 6, 'y');
  }

  // spatborden (voor en achter): een scheef voorspatbord is een studentenstaat (#402)
  const fender = old ? ([0xb0b3b8, 0x2a4a8a, color][Math.floor(hash * 3)]) : color;
  if (!race && !mtb || fat) {
    const w = fat ? 0.12 : 0.075, ro = r + 0.03 + (fat ? 0.04 : 0);
    // een scheef voorspatbord: omhoog gebogen en een stukje weg van het wiel (zelfde aantal driehoeken)
    if (st.includes('S')) arcStrip(B, F[0] + 0.06, F[1] + 0.09, ro, w, 0.3, 2.37, 12, fender);
    else arcStrip(B, F[0], F[1], ro, w, -0.12, 2.05, 12, fender);
    for (const s of [1, -1]) T([F[0] + 0.0, F[1], s * 0.052], [F[0] + 0.12, F[1] + 0.2, s * 0.035], 0.005, 0.005, METAL, 4);
    arcStrip(B, R[0], R[1], ro, w, 0.35, 3.45, 14, fender);
    for (const s of [1, -1]) {
      T([R[0], R[1], s * 0.06], [R[0] - 0.09, R[1] + 0.27, s * 0.045], 0.005, 0.005, METAL, 4);
      T([R[0], R[1], s * 0.06], [R[0] + 0.12, R[1] + 0.25, s * 0.045], 0.005, 0.005, METAL, 4);
    }
    B.box(R[0] - ro + 0.015, R[1] + 0.04, 0, 0.035, 0.03, 0.04, TAIL);
  }

  // bagagedrager (stad, oud, e-bike, fat), met een veerklem, steunen en achterlicht
  if (!race && !mtb) {
    const cy = 0.78, rx0 = -0.76, rx1 = -0.3;
    for (const s of [1, -1]) {
      T([rx0, cy, s * 0.075], [rx1, cy + 0.005, s * 0.075], 0.006, 0.006, METAL, 4);
      T([rx0, cy, s * 0.075], [R[0] - 0.01, R[1], s * 0.065], 0.006, 0.006, METAL, 4);
      T([rx1 + 0.02, cy, s * 0.075], [S[0] - 0.025, S[1] - 0.08, s * 0.04], 0.006, 0.006, METAL, 4);
    }
    for (let k = 0; k < 4; k++) B.box(rx0 + 0.04 + k * 0.1, cy + 0.01, 0, 0.055, 0.014, 0.17, ebike ? 0x2a2a2b : 0x3a3a3c);
    B.box(rx0 - 0.01, cy + 0.0, 0, 0.012, 0.03, 0.17, METAL);
    if (!ebike) { B.box(rx1 - 0.02, cy + 0.045, 0, 0.12, 0.012, 0.015, METAL); T([rx1 - 0.08, cy + 0.045, 0.055], [rx1 + 0.02, cy + 0.045, 0.055], 0.005, 0.005, METAL, 4); T([rx1 - 0.08, cy + 0.045, -0.055], [rx1 + 0.02, cy + 0.045, -0.055], 0.005, 0.005, METAL, 4); }
    B.box(rx0 - 0.012, cy - 0.03, 0, 0.012, 0.04, 0.06, TAIL, G_LAMP);
    if (ebike) {
      // accu op de drager
      B.box(-0.5, cy + 0.075, 0, 0.36, 0.115, 0.1, 0x2b2e33);
      B.box(-0.5, cy + 0.138, 0, 0.3, 0.012, 0.08, 0x4a4f57);
      B.box(-0.325, cy + 0.075, 0, 0.012, 0.03, 0.04, 0x3fb060, G_LAMP);
    }
    if (extra.tassen) {
      for (const s of [1, -1]) {
        B.box(-0.57, 0.56, s * 0.145, 0.32, 0.26, 0.09, extra.tasKleur);
        B.box(-0.57, 0.695, s * 0.145, 0.34, 0.028, 0.1, shade(extra.tasKleur, 0.78));
        B.box(-0.57, 0.595, s * 0.194, 0.1, 0.08, 0.008, shade(extra.tasKleur, 1.2));
      }
    }
  } else {
    // bidonhouder en bidon
    T([0.03, 0.43, 0], [-0.0, 0.5, 0], 0.006, 0.006, METAL, 4);
    cyl(B, 0.01, 0.52, 0, 0.032, 0.17, 0xe8e6e0, 8, 'y');
    cyl(B, 0.01, 0.62, 0, 0.012, 0.03, 0xd8452f, 6, 'y');
    for (const s of [1, -1]) B.box(0.01, 0.5, s * 0.03, 0.028, 0.15, 0.004, METAL);
  }

  // kettingkast of ketting met tandwiel
  if (!race && !mtb) {
    const ang = Math.atan2(R[1] - BB[1], R[0] - BB[0]) - Math.PI;
    B.box((R[0] + BB[0]) / 2 - 0.005, (R[1] + BB[1]) / 2 + 0.01, 0.092, 0.55, 0.095, 0.03, shade(color, 0.92), 0, 0, 0, ang);
    cyl(B, R[0], R[1], 0.092, 0.058, 0.03, shade(color, 0.92), 12);
    cyl(B, BB[0], BB[1], 0.094, 0.072, 0.03, shade(color, 0.92), 12);
  } else {
    const z = 0.07, c = 0x55585b;
    T([BB[0], BB[1] + 0.088, z], [R[0], R[1] + 0.034, z], 0.006, 0.006, c, 4);
    T([BB[0], BB[1] - 0.088, z], [R[0], R[1] - 0.034, z], 0.006, 0.006, c, 4);
    cyl(B, R[0], R[1], z, 0.034, 0.02, METAL, 10);
    if (mtb || race) { T([R[0] + 0.01, R[1] - 0.01, 0.07], [R[0] + 0.06, R[1] - 0.08, 0.07], 0.01, 0.01, 0x3a3c3e, 5); cyl(B, R[0] + 0.06, R[1] - 0.08, 0.07, 0.018, 0.014, METAL, 8); }
  }
  // naafdynamo of lamp, ringslot, (e-bike) motor, schijfremmen
  if (!sport) {
    if (!noLight) {
      cyl(B, H0[0] + 0.07, H0[1] + 0.06, 0, 0.05, 0.075, 0x2a2a2b, 10, 'x');
      cyl(B, H0[0] + 0.113, H0[1] + 0.06, 0, 0.038, 0.012, HEADLAMP, 10, 'x');
      B.box(H0[0] + 0.12, H0[1] + 0.06, 0, 0.01, 0.06, 0.06, HEADLAMP, G_LAMP);
      T([H0[0] + 0.03, H0[1] + 0.02, 0], [H0[0] + 0.045, H0[1] + 0.045, 0], 0.01, 0.008, METAL, 4);
      cyl(B, F[0] - 0.01, F[1] + 0.085, 0.07, 0.015, 0.02, 0x2a2a2b, 6);
    }
    B.box(-0.47, 0.6, 0, 0.075, 0.055, 0.17, 0x1d1d1e);
    cyl(B, -0.47, 0.6, 0.0, 0.03, 0.18, 0x3a3a3c, 8);
    B.box(-0.5, 0.6, 0.095, 0.03, 0.03, 0.012, 0xc8a02a);
  } else {
    if (!noLight) B.box(H0[0] + 0.045, H0[1] + 0.045, 0, 0.025, 0.035, 0.045, HEADLAMP, G_LAMP);
    B.box(R[0] - 0.07, 0.72, 0, 0.025, 0.035, 0.04, TAIL, G_LAMP);
    B.box(R[0] - 0.01, 0.72, 0, 0.06, 0.02, 0.04, 0x2a2a2b);
  }
  if (ebike) {
    B.box(BB[0] + 0.02, BB[1] + 0.0, 0, 0.17, 0.15, 0.115, 0x3a3d42);
    B.box(BB[0] + 0.02, BB[1] + 0.082, 0, 0.14, 0.012, 0.1, color);
  }
  // voorrem en achterrem: blokjes bij de velg met een kabelkoker
  B.box(F[0] - 0.005, F[1] + r - 0.08, 0, 0.04, 0.04, 0.09, 0x2a2a2b);
  B.box(R[0] + 0.005, R[1] + r - 0.08, 0, 0.04, 0.04, 0.09, 0x2a2a2b);
  // trapas is los (bikeCrankParts), de standaard hangt dichtgeklapt langs de achterbouw
  T([-0.22, 0.285, -0.07], [-0.46, 0.31, -0.085], 0.008, 0.008, 0x2a2a2b, 5);
  B.box(-0.47, 0.31, -0.085, 0.04, 0.012, 0.045, 0x2a2a2b);
  // roest op een oude fiets
  if (old) {
    B.box(0.18, 0.55, 0.0, 0.1, 0.014, 0.034, RUST, 0, 0, 0, 0.77);
    B.box(-0.14, 0.53, 0, 0.08, 0.014, 0.03, RUST, 0, 0, 0, 1.05);
    B.box(-0.38, 0.39, 0.068, 0.07, 0.01, 0.014, RUST);
  }
  // wielen laten we weg: ze zijn eigen meshes (bikeWheelRich)
  return { r, wb };
}

// Stuurstang, stuurpen, handvatten, remhendels, bel en kabels, om de stuurpen (px) gedraaid. Als de stuurpen zelf op x=px staat.
export function bikeSteerParts(B, o, px) {
  const { color, stijl = 'stad', extra = {}, old = false, hash = 0.5 } = o;
  const P = STIJL[stijl] || STIJL.stad;
  const H1 = P.H1;
  const race = stijl === 'race', mtb = stijl === 'mtb', ebike = stijl === 'ebike';
  const sx = (p) => [p[0] - px, p[1], p[2]];
  const T = (a, b, r1, r2, c, sides = 8) => tubeAt(B, sx(a), sx(b), r1, r2, c, sides);
  const box = (x, y, z, a, b, c, col, g = 0, rz = 0) => B.box(x - px, y, z, a, b, c, col, g, 0, 0, rz);
  if (race) {
    // korte stuurpen, dropstuur: kap boven, bocht naar voren en omlaag
    const clamp = [H1[0] + 0.0, H1[1] + 0.09, 0];
    T([H1[0], H1[1] + 0.02, 0], clamp, 0.017, 0.017, METAL, 6);
    T([clamp[0] - 0.01, clamp[1], -0.05], [clamp[0] - 0.01, clamp[1], 0.05], 0.016, 0.016, 0x2a2a2b, 8);
    for (const s of [1, -1]) {
      T([clamp[0] - 0.01, clamp[1], s * 0.05], [clamp[0] - 0.01, clamp[1], s * 0.2], 0.0125, 0.0125, 0x2a2a2b, 6);
      T([clamp[0] - 0.01, clamp[1], s * 0.2], [clamp[0] + 0.1, clamp[1] - 0.01, s * 0.2], 0.0125, 0.0125, 0x2a2a2b, 6);
      T([clamp[0] + 0.1, clamp[1] - 0.01, s * 0.2], [clamp[0] + 0.15, clamp[1] - 0.07, s * 0.2], 0.0125, 0.0125, 0x2a2a2b, 6);
      T([clamp[0] + 0.15, clamp[1] - 0.07, s * 0.2], [clamp[0] + 0.1, clamp[1] - 0.14, s * 0.2], 0.0125, 0.0125, 0x2a2a2b, 6);
      T([clamp[0] + 0.1, clamp[1] - 0.14, s * 0.2], [clamp[0] + 0.02, clamp[1] - 0.15, s * 0.2], 0.0125, 0.0125, 0x2a2a2b, 6);
      box(clamp[0] + 0.07, clamp[1] + 0.0, s * 0.2, 0.09, 0.05, 0.05, GRIP);
      box(clamp[0] + 0.0, clamp[1] - 0.01, s * 0.2, 0.06, 0.035, 0.04, 0x3a3c3e);
      T([clamp[0] + 0.12, clamp[1] - 0.01, s * 0.2], [clamp[0] - 0.04, clamp[1] - 0.15, s * 0.2], 0.0035, 0.0035, 0x55585b, 3);
    }
    return;
  }
  if (mtb) {
    const clamp = [H1[0] + 0.0, H1[1] + 0.12, 0];
    T([H1[0], H1[1] + 0.02, 0], clamp, 0.019, 0.019, METAL, 6);
    for (const s of [1, -1]) {
      T([clamp[0] + 0.0, clamp[1], s * 0.03], [clamp[0] - 0.02, clamp[1] + 0.015, s * 0.2], 0.0115, 0.0115, 0x2a2a2b, 6);
      T([clamp[0] - 0.02, clamp[1] + 0.015, s * 0.2], [clamp[0] - 0.1, clamp[1] - 0.005, s * 0.3], 0.0115, 0.0115, 0x2a2a2b, 6);
      T([clamp[0] - 0.1, clamp[1] - 0.005, s * 0.3], [clamp[0] - 0.24, clamp[1] - 0.02, s * 0.3], 0.019, 0.019, 0x4a8f3a, 8);
      T([clamp[0] - 0.1, clamp[1] + 0.005, s * 0.27], [clamp[0] + 0.03, clamp[1] + 0.01, s * 0.27], 0.005, 0.005, METAL, 4);
      T([clamp[0] - 0.01, clamp[1] - 0.005, s * 0.2], [clamp[0] - 0.01, clamp[1] - 0.12, s * 0.03], 0.0035, 0.0035, 0x55585b, 3);
    }
    return;
  }
  // stad, e-bike, fat: opgebogen stuur met een stuurpen
  const top = [H1[0] - 0.02, H1[1] + 0.14, 0];
  T([H1[0], H1[1] + 0.02, 0], top, 0.0145, 0.0145, METAL, 8);
  cyl(B, top[0] - px, top[1], 0, 0.021, 0.07, METAL, 8);
  for (const s of [1, -1]) {
    const m1 = [top[0] - 0.01, top[1], s * 0.1], m2 = [top[0] - 0.06, top[1] - 0.005, s * 0.2], grip = [top[0] - 0.2, top[1] - 0.02, s * 0.28];
    T(top, m1, 0.0125, 0.0125, METAL, 6);
    T(m1, m2, 0.0125, 0.0125, METAL, 6);
    T(m2, [top[0] - 0.12, top[1] - 0.015, s * 0.25], 0.0125, 0.0125, METAL, 6);
    T([top[0] - 0.12, top[1] - 0.015, s * 0.25], grip, 0.0125, 0.0125, METAL, 6);
    T(grip, [grip[0] - 0.1, grip[1] - 0.01, grip[2]], 0.019, 0.019, GRIP, 8);
    T([grip[0] - 0.1, grip[1] - 0.01, grip[2]], [grip[0] - 0.108, grip[1] - 0.011, grip[2]], 0.012, 0.012, METAL, 6);
    // remhendel en kabel
    T([grip[0] + 0.02, grip[1] + 0.012, grip[2] - s * 0.018], [grip[0] + 0.1, grip[1] - 0.012, grip[2] - s * 0.02], 0.007, 0.005, 0x2a2a2b, 4);
    T([grip[0] + 0.06, grip[1] - 0.004, grip[2] - s * 0.012], [top[0] + 0.02, top[1] - 0.1, s * 0.01], 0.0035, 0.0035, 0x2a2a2b, 3);
  }
  // bel (halve bol) op de linkerkant
  B.geo(new THREE.SphereGeometry(0.032, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), composeMatrix(top[0] - 0.08 - px, top[1] + 0.012, -0.16), METAL);
  box(top[0] - 0.08, top[1] + 0.004, -0.16, 0.03, 0.012, 0.03, 0x2a2a2b);
  if (ebike) box(top[0] - 0.05, top[1] + 0.03, 0, 0.05, 0.03, 0.08, 0x1b1d20);
  if (ebike) box(top[0] - 0.026, top[1] + 0.032, 0, 0.004, 0.02, 0.06, 0x5fd0e0, G_LAMP);
  // een mand voorop (de stuur-mand draait met het stuur mee)
  if (extra.mand) {
    const bx = top[0] + 0.15, by = top[1] - 0.27, bw = 0.36, bd = 0.26, bh = 0.2, wc = extra.mandKleur || 0x6a5a3a;
    box(bx, by, 0, bd, 0.012, bw, shade(wc, 0.8));
    for (const s of [1, -1]) {
      box(bx, by + bh / 2, s * bw / 2, bd, bh, 0.012, wc);
      box(bx + s * 0.0 + (s > 0 ? bd / 2 : -bd / 2), by + bh / 2, 0, 0.012, bh, bw, wc);
    }
    box(bx, by + bh, 0, bd + 0.01, 0.014, 0.014, METAL);
    T([bx - bd / 2, by + bh, -bw / 2], [bx - bd / 2, by + bh, bw / 2], 0.007, 0.007, METAL, 4);
    T([bx + bd / 2, by + bh, -bw / 2], [bx + bd / 2, by + bh, bw / 2], 0.007, 0.007, METAL, 4);
    T([bx - bd / 2, by + bh, -bw / 2], [bx + bd / 2, by + bh, -bw / 2], 0.007, 0.007, METAL, 4);
    T([bx - bd / 2, by + bh, bw / 2], [bx + bd / 2, by + bh, bw / 2], 0.007, 0.007, METAL, 4);
    T([bx - 0.08, by, -0.1], [H1[0] + 0.0, H1[1] - 0.06, 0], 0.007, 0.007, METAL, 4);
    T([bx - 0.08, by, 0.1], [H1[0] + 0.0, H1[1] - 0.06, 0], 0.007, 0.007, METAL, 4);
  }
  void color; void old; void hash;
}

// Zelden en veel gezien: kleur en kans per hash voor de extra's van een gewone fiets (mand voorop, fietstassen).
export function bikeExtras(h, { old = false, share = false, delivery = false, stijl = 'stad' } = {}) {
  if (stijl === 'race' || stijl === 'mtb' || stijl === 'fat') return {};
  if (share) return { mand: true, mandKleur: 0x8a8d92 };
  if (delivery) return {};
  if (h < 0.1 && !old) return { mand: true, mandKleur: [0x6a5a3a, 0x3a3d42, 0x8a6a3a][Math.floor(h * 30) % 3] };
  if (h >= 0.1 && h < 0.2) return { tassen: true, tasKleur: [0x2f5c8a, 0xd8742a, 0x3a3d42][Math.floor((h - 0.1) * 30) % 3] };
  return {};
}

// De bakfiets: lang frame met een stuurstang naar het kleine voorwiel, een houten bak met planken, een bankje, hoekstijlen en een
// dubbele standaard. Voorwiel 0,25 op x = 1,0; achterwiel 0,34 op x = -0,85. De rijder zit op x = -0,68 (models3d_vehicles.js).
export function bakfietsParts(B, color, hash = 0.5) {
  const t = 0.02;
  const T = (a, b, r1, r2 = r1, c = color, sides = 8) => tubeAt(B, a, b, r1, r2, c, sides);
  const R = [-0.85, 0.34, 0], BB = [-0.45, 0.3, 0], S = [-0.62, 0.86, 0], H = [-0.25, 0.96, 0], FW = [1.0, 0.25, 0];
  // frame
  T(BB, [-0.85, 0.34, 0.0], t * 1.1, t * 0.9);
  for (const s of [1, -1]) {
    T([BB[0] - 0.02, BB[1], s * 0.055], [R[0], R[1], s * 0.06], t * 0.85, t * 0.75);
    T([S[0] - 0.01, S[1] - 0.04, s * 0.03], [R[0], R[1], s * 0.06], t * 0.8, t * 0.7);
    cyl(B, R[0], R[1], s * 0.06, 0.018, 0.02, METAL, 6);
  }
  T([S[0], S[1], 0], BB, t, t * 1.1);
  cyl(B, BB[0], BB[1], 0, t * 1.9, 0.12, color, 8);
  // lange hoofdbuis (de stuurstang loopt eronder door naar het voorwiel)
  T(BB, [0.25, 0.27, 0], t * 1.3, t * 1.3);
  T([0.25, 0.27, 0], [0.95, 0.22, 0], t * 1.2, t * 1.0);
  T([-0.2, 0.28, 0], [-0.17, 0.62, 0], t * 1.1, t * 1.0);
  T([-0.17, 0.62, 0], H, t * 1.05, t * 1.0);
  cyl(B, H[0], H[1] - 0.02, 0, t * 1.6, 0.08, METAL, 8, 'y');
  // stuur met handvatten
  T([H[0], H[1] + 0.02, 0], [H[0] - 0.03, H[1] + 0.1, 0], 0.0145, 0.0145, METAL, 8);
  for (const s of [1, -1]) {
    T([H[0] - 0.03, H[1] + 0.1, s * 0.02], [H[0] - 0.05, H[1] + 0.1, s * 0.14], 0.0125, 0.0125, METAL, 6);
    T([H[0] - 0.05, H[1] + 0.1, s * 0.14], [H[0] - 0.13, H[1] + 0.09, s * 0.26], 0.0125, 0.0125, METAL, 6);
    T([H[0] - 0.13, H[1] + 0.09, s * 0.26], [H[0] - 0.23, H[1] + 0.085, s * 0.26], 0.019, 0.019, GRIP, 8);
    T([H[0] - 0.12, H[1] + 0.1, s * 0.245], [H[0] - 0.02, H[1] + 0.05, s * 0.03], 0.0035, 0.0035, 0x2a2a2b, 3);
  }
  B.geo(new THREE.SphereGeometry(0.03, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), composeMatrix(H[0] - 0.1, H[1] + 0.113, -0.2), METAL);
  // vork van het voorwiel, kleine spatborden
  for (const s of [1, -1]) {
    T([0.95, 0.5, s * 0.06], [FW[0], FW[1], s * 0.055], 0.014, 0.011, color, 6);
    cyl(B, FW[0], FW[1], s * 0.055, 0.016, 0.018, METAL, 6);
  }
  T([0.95, 0.22, 0], [0.95, 0.52, 0], t * 1.1, t * 1.1);
  B.box(0.95, 0.52, 0, 0.05, 0.03, 0.14, color);
  arcStrip(B, FW[0], FW[1], 0.285, 0.075, 0.1, 2.2, 10, color);
  arcStrip(B, R[0], R[1], 0.37, 0.085, 0.4, 3.4, 12, color);
  B.box(R[0] - 0.33, R[1] + 0.06, 0, 0.035, 0.03, 0.04, TAIL);
  // zadel
  B.geo(new THREE.SphereGeometry(1, 8, 5), composeMatrix(S[0] - 0.05, S[1] + 0.105, 0, 0, 0, 0.04, 0.15, 0.036, 0.095), SADDLE);
  B.box(S[0] - 0.04, S[1] + 0.06, 0, 0.018, 0.1, 0.018, METAL);
  B.box(S[0] - 0.04, S[1] + 0.141, 0, 0.3, 0.004, 0.012, SEAM);
  // bagagedrager achter
  for (const s of [1, -1]) T([-1.05, 0.8, s * 0.07], [-0.7, 0.82, s * 0.07], 0.006, 0.006, METAL, 4);
  for (let k = 0; k < 3; k++) B.box(-0.98 + k * 0.12, 0.83, 0, 0.06, 0.014, 0.17, 0x3a3a3c);
  // de bak: bodem, zijplanken, kop- en staartplank, randlijsten, hoekstijlen, bankje
  const wood = [0x9a7048, 0x8f6840, 0xa27850], dark = 0x6b4a2a;
  B.box(0.45, 0.6, 0, 0.92, 0.04, 0.66, 0x7a5a38);
  for (const s of [1, -1]) {
    for (let k = 0; k < 3; k++) B.box(0.45, 0.68 + k * 0.13, s * 0.33, 0.9, 0.12, 0.025, wood[(k + (s > 0 ? 0 : 1)) % 3]);
    B.box(0.45, 1.05, s * 0.33, 0.94, 0.03, 0.05, dark);
  }
  for (let k = 0; k < 3; k++) {
    B.box(0.91, 0.68 + k * 0.13, 0, 0.025, 0.12, 0.64, wood[k % 3]);
    B.box(-0.01, 0.68 + k * 0.13, 0, 0.025, 0.12, 0.64, wood[(k + 1) % 3]);
  }
  B.box(0.91, 1.05, 0, 0.05, 0.03, 0.7, dark);
  B.box(-0.01, 1.05, 0, 0.05, 0.03, 0.7, dark);
  for (const x of [-0.01, 0.91]) for (const s of [1, -1]) B.box(x, 0.84, s * 0.335, 0.045, 0.46, 0.045, 0x4a4d52);
  B.box(0.18, 0.84, 0, 0.2, 0.04, 0.6, 0x8a6840); // bankje voor de kinderen
  for (const s of [1, -1]) B.box(0.18, 0.76, s * 0.28, 0.05, 0.16, 0.04, 0x4a4d52);
  // dubbele standaard, lampen
  for (const s of [1, -1]) {
    T([-0.55, 0.29, s * 0.07], [-0.62, 0.02, s * 0.16], 0.008, 0.008, 0x2a2a2b, 5);
    B.box(-0.62, 0.015, s * 0.16, 0.05, 0.015, 0.05, 0x2a2a2b);
  }
  B.box(-1.04, 0.76, 0, 0.012, 0.04, 0.06, TAIL, G_LAMP);
  cyl(B, 0.93, 0.7, 0, 0.04, 0.06, 0x2a2a2b, 8, 'x');
  B.box(0.965, 0.7, 0, 0.01, 0.06, 0.06, HEADLAMP, G_LAMP);
  void hash;
}
