import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { composeMatrix, tubeGeometry } from './pixelart3d.js';

// De kleine boten in de stijl van de andere hoofdvoertuigen (24-11): een romp met echte lijnen (dichtere stations, een bolle
// kimming met planken in twee tinten), een dolboord met kap, een schuurlijst met stootkussens, kikkers en een boegoog, een buitenboordmotor,
// reddingsboei en bootshaak; de bouwers per soort zitten in models3d_vehicles.js. K: de hulpjes en kleuren van dat bestand.
// Alles lokaal aan de romp: +x = boeg, +z = stuurboord, y = hoogte boven de waterlijn.

const METAL = 0x8a8e92, DARKM = 0x2a2e33, ROPE = 0xc8b48a, RUBBER = 0x2a2b2d;

// Tussenstations: elk interval wordt in tweeën gedeeld, zodat de romp rond leest (HULL_SHAPES blijft de enige bron van de vorm).
export function densify(ts) {
  const out = [];
  for (let i = 0; i < ts.length; i++) {
    out.push(ts[i]);
    if (i < ts.length - 1) out.push((ts[i] + ts[i + 1]) / 2);
  }
  return out;
}

// De schaal van de romp met een bolle kimming (een extra ring tussen kim en dolboord) en planken in twee tinten.
export function hullShellRich(B, st, hull, trim, floorY, deck, K) {
  const { shadeHex, WOOD, DECK, KEEL } = K;
  const plank = shadeHex(hull, 0.93);
  const ring = (p, s) => {
    const bw = p.chineW + (p.hw - p.chineW) * 0.62;
    return {
      T: [p.x, p.top, s * p.hw], Sd: [p.x, p.top - 0.07, s * p.hw * 0.995],
      Bg: [p.x, p.chine + (p.top - 0.07 - p.chine) * 0.42, s * bw], C: [p.x, p.chine, s * p.chineW], Kl: [p.x, p.keel, 0],
    };
  };
  for (let i = 0; i < st.length - 1; i++) {
    const a = st[i], b = st[i + 1];
    for (const s of [1, -1]) {
      const out = [0, 0, s], A = ring(a, s), Bq = ring(b, s);
      B.quadOut(A.Sd, Bq.Sd, Bq.T, A.T, out, trim);
      B.quadOut(A.Bg, Bq.Bg, Bq.Sd, A.Sd, out, i % 2 ? plank : hull);
      B.quadOut(A.C, Bq.C, Bq.Bg, A.Bg, [0, -0.3, s], i % 2 ? hull : plank);
      B.quadOut(A.Kl, Bq.Kl, Bq.C, A.C, [0, -1, s * 0.5], KEEL);
      if (deck) {
        const ridge = (p) => [p.x, p.top + 0.05 * Math.min(1, p.hw / 0.2), 0];
        B.quadOut(A.T, Bq.T, ridge(b), ridge(a), [0, 1, s * 0.4], hull);
        continue;
      }
      const inA = Math.min(0.06, a.hw * 0.4), inB = Math.min(0.06, b.hw * 0.4);
      const aI = [a.x, a.top, s * (a.hw - inA)], bI = [b.x, b.top, s * (b.hw - inB)];
      B.quadOut(A.T, Bq.T, bI, aI, [0, 1, 0], WOOD);
      const aF = [a.x, floorY, s * Math.max(0, a.hw - 0.12)], bF = [b.x, floorY, s * Math.max(0, b.hw - 0.12)];
      B.quadOut(aI, bI, bF, aF, [0, 0, -s], shadeHex(hull, 0.9));
      B.quadOut(aF, bF, [b.x, floorY, 0], [a.x, floorY, 0], [0, 1, 0], DECK);
    }
  }
  const s0 = st[0];
  if (s0.hw > 0.05) {
    const bw = s0.chineW + (s0.hw - s0.chineW) * 0.62, by = s0.chine + (s0.top - 0.07 - s0.chine) * 0.42;
    B.quadOut([s0.x, s0.top, s0.hw], [s0.x, s0.top, -s0.hw], [s0.x, by, -bw], [s0.x, by, bw], [-1, 0, 0], hull);
    B.quadOut([s0.x, by, bw], [s0.x, by, -bw], [s0.x, s0.chine, -s0.chineW], [s0.x, s0.chine, s0.chineW], [-1, 0, 0], plank);
    B.triOut([s0.x, s0.chine, s0.chineW], [s0.x, s0.chine, -s0.chineW], [s0.x, s0.keel, 0], [-1, 0, 0], KEEL);
    if (!deck) B.quadOut([s0.x + 0.001, s0.top, s0.hw - 0.12], [s0.x + 0.001, s0.top, -(s0.hw - 0.12)], [s0.x + 0.001, floorY, -(s0.hw - 0.12)], [s0.x + 0.001, floorY, s0.hw - 0.12], [1, 0, 0], shadeHex(hull, 0.9));
  }
}

// Dolboord: een kap op de rand, met een buitenzijde en een binnenzijde; w = breedte van de kap.
function gunwaleCap(B, st, color, w = 0.07, h = 0.035, inner = true) {
  for (let i = 0; i < st.length - 1; i++) {
    const a = st[i], b = st[i + 1];
    if (a.hw < 0.03 && b.hw < 0.03) continue;
    for (const s of [1, -1]) {
      const o = (p) => [p.x, p.top + h, s * (p.hw + 0.012)], n = (p) => [p.x, p.top + h, s * Math.max(0, p.hw - w)];
      B.quadOut(o(a), o(b), n(b), n(a), [0, 1, 0], color);
      B.quadOut([a.x, a.top - 0.01, s * (a.hw + 0.012)], [b.x, b.top - 0.01, s * (b.hw + 0.012)], o(b), o(a), [0, 0, s], color);
      if (inner) B.quadOut(n(a), n(b), [b.x, b.top - 0.01, s * Math.max(0, b.hw - w)], [a.x, a.top - 0.01, s * Math.max(0, a.hw - w)], [0, 0, -s], color);
    }
  }
}

// Schuurlijst langs de zijkant, een stuk onder het dolboord, met rubber stootkussens eraan.
function rubStrake(B, st, K, drop = 0.14, pads = true, padColor = 0xe8e6e0) {
  const { hullAt } = K;
  for (let i = 0; i < st.length - 1; i++) {
    const a = st[i], b = st[i + 1];
    if (a.hw < 0.05 || b.hw < 0.05) continue;
    for (const s of [1, -1]) {
      const p = (q, d) => [q.x, q.top - drop + d, s * (q.hw * (1 - drop * 0.12) + 0.014)];
      B.quadOut(p(a, 0.03), p(b, 0.03), p(b, -0.03), p(a, -0.03), [0, 0, s], RUBBER);
    }
  }
  if (!pads) return;
  const L = st[st.length - 1].x - st[0].x;
  for (const f of [0.28, 0.5, 0.72]) {
    const x = st[0].x + L * f, h = hullAt(st, x);
    for (const s of [1, -1]) {
      B.geo(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 7), composeMatrix(x, h.top - drop - 0.1, s * (h.hw + 0.04)), padColor);
      B.geo(tubeGeometry([x, h.top, s * (h.hw - 0.01)], [x, h.top - drop + 0.02, s * (h.hw + 0.04)], 0.006, 0.006, 3), null, ROPE);
    }
  }
}

// Een kikker (afmeertuig): een dwarsstuk op twee poten.
function cleat(B, x, y, z, len = 0.14, color = METAL) {
  B.box(x, y + 0.03, z, len, 0.022, 0.03, color);
  B.box(x - len * 0.32, y + 0.012, z, 0.03, 0.024, 0.03, color);
  B.box(x + len * 0.32, y + 0.012, z, 0.03, 0.024, 0.03, color);
}

// Een reddingsboei (ring met vier banden) aan een steun, plat tegen een wand (as langs z).
function lifebuoy(B, x, y, z, r = 0.17) {
  B.geo(new THREE.TorusGeometry(r, r * 0.3, 6, 14), composeMatrix(x, y, z), 0xe8e6e0);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    B.geo(new THREE.BoxGeometry(r * 0.55, r * 0.34, r * 0.66), composeMatrix(x + Math.cos(a) * r, y + Math.sin(a) * r, z, 0, 0, a), 0xd8452f);
  }
}

// Een bootshaak langs de rand van de boot.
function boatHook(B, x0, y, z, len = 1.4) {
  B.geo(tubeGeometry([x0, y, z], [x0 + len, y, z], 0.012, 0.012, 5), null, 0xb89868);
  B.geo(tubeGeometry([x0 + len, y, z], [x0 + len + 0.04, y + 0.07, z], 0.012, 0.008, 4), null, METAL);
}

// Buitenboordmotor op de spiegel: kap, as, torpedo, schroef met drie bladen, hendel. x = spiegel, y = bovenkant spiegel.
export function outboardRich(B, x, y, k = 1, color = 0x2c3238) {
  B.geo(new THREE.SphereGeometry(1, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), composeMatrix(x - 0.14 * k, y + 0.03 * k, 0, 0, 0, 0, 0.17 * k, 0.2 * k, 0.12 * k), color);
  B.box(x - 0.14 * k, y + 0.03 * k, 0, 0.24 * k, 0.05 * k, 0.17 * k, shadeHex2(color, 0.7));
  B.box(x - 0.06 * k, y + 0.0, 0, 0.06 * k, 0.16 * k, 0.16 * k, METAL); // klem op de spiegel
  B.geo(tubeGeometry([x - 0.14 * k, y - 0.02 * k, 0], [x - 0.15 * k, y - 0.46 * k, 0], 0.045 * k, 0.04 * k, 6), null, color);
  B.geo(new THREE.SphereGeometry(1, 8, 5), composeMatrix(x - 0.15 * k, y - 0.5 * k, 0, 0, 0, 0, 0.14 * k, 0.045 * k, 0.045 * k), color);
  B.box(x - 0.2 * k, y - 0.57 * k, 0, 0.07 * k, 0.08 * k, 0.015 * k, METAL); // vin
  for (let i = 0; i < 3; i++) B.box(x - 0.3 * k, y - 0.5 * k, 0, 0.012 * k, 0.15 * k, 0.045 * k, METAL, 0, (i * Math.PI * 2) / 3, 0, 0);
  B.geo(tubeGeometry([x - 0.1 * k, y + 0.07 * k, 0], [x + 0.32 * k, y + 0.12 * k, 0.0], 0.016 * k, 0.014 * k, 5), null, METAL); // helmstok
}

function shadeHex2(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f)), g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f)), b = Math.min(255, Math.round((hex & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

// Een bootsraam: een lijst met een ruit (groep 1), een kolom en een dwarsstijl in het midden.
export function windowFrame(B, x, y, z, w, h, color, K, side = 1) {
  const { GLASS, G_GLASS } = K;
  B.box(x, y, z, w, h, 0.02, GLASS, G_GLASS);
  for (const dy of [h / 2, -h / 2]) B.box(x, y + dy, z + side * 0.004, w + 0.04, 0.03, 0.03, color);
  for (const dx of [w / 2, -w / 2]) B.box(x + dx, y, z + side * 0.004, 0.03, h + 0.03, 0.03, color);
  B.box(x, y, z + side * 0.004, 0.02, h, 0.025, color);
}

// De afwerking per soort bovenop romp en inrichting (bouwers in models3d_vehicles.js): dolboord, schuurlijst, kikkers, boegoog en wat
// bij die boot hoort. cabin: kleur van de kajuit/dak of 0 (open sloep).
export function boatFinish(B, kind, st, L, W, hull, trim, cabin, K, police = false) {
  const { shadeHex, hullAt } = K;
  const hl = L / 2, top0 = st[0].top;
  const teak = 0x8a5a2c;
  const bow = st[st.length - 1];
  const eye = (x, y) => { B.geo(new THREE.TorusGeometry(0.035, 0.009, 4, 8).rotateY(Math.PI / 2), composeMatrix(x, y, 0), METAL); B.box(x - 0.02, y - 0.04, 0, 0.04, 0.05, 0.05, METAL); };
  if (kind === 'sloep') {
    gunwaleCap(B, st, teak, 0.075, 0.035);
    rubStrake(B, st, K, 0.13, true, 0xe8e6e0);
    for (const s of [1, -1]) {
      for (const f of [0.1, 0.9]) {
        const x = -hl + L * f, h = hullAt(st, x);
        cleat(B, x, h.top + 0.035, s * (h.hw - 0.06));
      }
    }
    eye(hl - 0.06, bow.top - 0.1);
    // spanten aan de binnenkant, een stootplaat op de spiegel en de reddingsboei
    for (let x = -hl + 0.6; x < hl - 0.8; x += 0.55) {
      const h = hullAt(st, x);
      for (const s of [1, -1]) B.box(x, (h.top + 0.14) / 2, s * (h.hw - 0.075), 0.04, h.top - 0.14, 0.014, shadeHex(hull, 0.8));
    }
    B.box(-hl + 0.01, top0 - 0.06, 0, 0.03, 0.1, 0.4, shadeHex(hull, 0.75));
    if (cabin) {
      lifebuoy(B, 0, 0.82, (W * 0.72) / 2 + 0.03, 0.15);
      // stijlen in de zijruiten en een gootlijst
      const cx0 = -hl * 0.35, cx1 = hl * 0.35, cw = W * 0.72;
      for (const s of [1, -1]) for (const f of [0.34, 0.67]) B.box(cx0 + (cx1 - cx0) * f, 1.02, s * (cw / 2 + 0.005), 0.035, 0.36, 0.02, cabin);
      B.box((cx0 + cx1) / 2, 1.255, 0, cx1 - cx0 + 0.2, 0.025, cw + 0.1, shadeHex(cabin, 0.7));
      if (police) B.box(cx0 + 0.15, 1.3, 0, 0.3, 0.08, cw * 0.9, 0x1f3f8f);
    } else {
      boatHook(B, -hl * 0.4, top0 + 0.04, W * 0.38, 1.5);
      B.geo(new THREE.TorusGeometry(0.09, 0.03, 4, 10).rotateX(Math.PI / 2), composeMatrix(hl * 0.55, 0.4, W * 0.18), ROPE); // een touwrol
    }
  } else if (kind === 'rondvaart') {
    gunwaleCap(B, st, 0xe8e6e0, 0.09, 0.04);
    rubStrake(B, st, K, 0.17, true, RUBBER);
    // kikkers, reddingsboeien en een boegoog
    for (const s of [1, -1]) {
      for (const f of [0.08, 0.5, 0.92]) {
        const x = -hl + L * f, h = hullAt(st, x);
        cleat(B, x, h.top + 0.04, s * (h.hw - 0.08), 0.2);
      }
      lifebuoy(B, -hl + 3.4, 0.9, s * (W / 2 - 0.1), 0.2);
    }
    eye(hl - 0.1, bow.top - 0.12);
    // dekplanken op de voorplecht (lijnen om de 0,22 m) en een bolder op de punt
    const x0 = hl - 2.1, x1 = hl - 0.45;
    for (let z = -0.9; z <= 0.9; z += 0.22) {
      const hw = hullAt(st, x1).hw;
      if (Math.abs(z) < hw - 0.18) B.box((x0 + x1) / 2, 0.55, z, x1 - x0, 0.006, 0.01, 0x6a4a2a);
    }
    B.geo(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 8), composeMatrix(hl - 0.5, bow.top + 0.1, 0), 0x2a2a2a);
    // schoorsteen met kap
    B.geo(tubeGeometry([-hl + 0.45, 0.45, 0.5], [-hl + 0.45, 1.3, 0.5], 0.05, 0.045, 7), null, 0x3a3c3e);
    B.geo(new THREE.CylinderGeometry(0.075, 0.05, 0.08, 7), composeMatrix(-hl + 0.45, 1.34, 0.5), 0x2a2a2a);
  } else if (kind === 'kano') {
    gunwaleCap(B, st, 0xb89868, 0.05, 0.03);
    const hh = hullAt(st, 0);
    // een dwarsbalk (juk), rieten zittingen, voor- en achterdek met een handvat en een peddel dwars op de rand
    B.geo(new THREE.CylinderGeometry(0.02, 0.02, hh.hw * 2, 6).rotateX(Math.PI / 2), composeMatrix(0, hh.top - 0.01, 0), 0xb89868);
    for (const x of [-hl * 0.5, hl * 0.42]) {
      const h = hullAt(st, x);
      B.box(x, 0.17, 0, 0.3, 0.015, h.hw * 2 - 0.16, 0xd8c08a);
      B.box(x, 0.18, 0, 0.3, 0.005, h.hw * 2 - 0.2, 0xb59a62);
    }
    for (const s of [-1, 1]) {
      const x = s * (hl - 0.32), h = hullAt(st, x);
      B.box(x, h.top + 0.01, 0, 0.42, 0.025, Math.max(0.1, h.hw * 2 - 0.05), shadeHex(hull, 0.85));
      B.geo(new THREE.TorusGeometry(0.05, 0.008, 4, 8).rotateY(Math.PI / 2), composeMatrix(s * (hl - 0.03), h.top + 0.08, 0), 0x2a2a2a);
    }
    B.geo(tubeGeometry([hl * 0.1, hh.top + 0.1, -0.45], [-hl * 0.08, hh.top + 0.18, 0.5], 0.014, 0.014, 5), null, 0x8a6a3a);
    B.box(-hl * 0.08 - 0.02, hh.top + 0.19, 0.52, 0.2, 0.008, 0.1, 0x8a6a3a, 0, 0, 0, 0.1);
    B.box(hl * 0.1 + 0.02, hh.top + 0.1, -0.47, 0.2, 0.008, 0.1, 0x8a6a3a, 0, 0, 0, 0.1);
  } else if (kind === 'kajak') {
    for (const s of [1, -1]) B.geo(tubeGeometry([-hl * 0.55, 0.255, s * 0.12], [hl * 0.5, 0.265, s * 0.1], 0.006, 0.006, 3), null, 0x2a2a2d);
    for (const x of [-hl * 0.5, hl * 0.4]) B.geo(tubeGeometry([x, 0.255, -0.16], [x, 0.265, 0.16], 0.005, 0.005, 3), null, 0x2a2a2d);
    B.geo(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 10), composeMatrix(-hl * 0.55, 0.222, 0), 0x2a2a2d);
    B.geo(tubeGeometry([-0.2, 0.3, -0.5], [0.12, 0.34, 0.6], 0.012, 0.012, 5), null, 0x1c1c1e);
    B.box(0.14, 0.35, 0.65, 0.22, 0.006, 0.1, 0xd8452f, 0, 0, 0, 0.12);
    B.box(-0.22, 0.29, -0.55, 0.22, 0.006, 0.1, 0xd8452f, 0, 0, 0, 0.12);
    for (const s of [1, -1]) B.geo(new THREE.TorusGeometry(0.04, 0.007, 4, 8).rotateY(Math.PI / 2), composeMatrix(s * (hl - 0.06), 0.2, 0), 0x2a2a2d);
  } else if (kind === 'dinghy') {
    gunwaleCap(B, st, teak, 0.06, 0.03);
    rubStrake(B, st, K, 0.1, false);
    cleat(B, hl - 0.2, bow.top + 0.03, 0, 0.12);
    eye(hl - 0.04, bow.top - 0.08);
    B.box(-hl - 0.02, 0.1, 0, 0.03, 0.5, 0.2, shadeHex(hull, 0.7)); // roerblad achter
  } else if (kind === 'rubberboot') {
    for (const s of [1, -1]) for (const f of [0.28, 0.5, 0.72]) {
      const x = -hl + L * f, h = hullAt(st, x);
      B.geo(new THREE.TorusGeometry(0.06, 0.01, 4, 8).rotateX(Math.PI / 2), composeMatrix(x, 0.42, s * (h.hw - 0.02)), METAL);
    }
    B.box(0.0, 0.18, 0, 1.4, 0.015, 0.8, 0xb09468);
    for (let x = -0.55; x <= 0.55; x += 0.28) B.box(x, 0.19, 0, 0.012, 0.004, 0.8, 0x8a6e44);
    B.geo(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 7), composeMatrix(-hl + 0.55, 0.22, 0.25), 0x3a3d42); // tank
  } else if (kind === 'skutsje') {
    gunwaleCap(B, st, 0x8a5a2c, 0.1, 0.04, false);
    for (const s of [1, -1]) for (const f of [0.15, 0.4, 0.62, 0.85]) {
      const x = -hl + L * f, h = hullAt(st, x);
      B.box(x, h.top + 0.08, s * (h.hw - 0.08), 0.08, 0.14, 0.08, 0x2a211b);
    }
    for (const s of [1, -1]) for (let x = -hl + 0.6; x < hl - 0.4; x += 0.9) {
      const h = hullAt(st, x);
      B.box(x, h.top + 0.08, s * (h.hw - 0.04), 0.05, 0.12, 0.03, 0x6a4a2a);
    }
    eye(hl - 0.04, bow.top - 0.14);
  }
}
