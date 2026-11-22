import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { composeMatrix } from './pixelart3d.js';

// Kapsels (epic Kleding, ronde 3): 17 stijlen, procedureel en low-poly, in de rompgeometrie van een persoon (één mesh, geen extra drawcall).
// Opbouw in plaats van één bolletje over het hoofd: een schedel-schil met een eigen haarlijn (voor, zij, achter), een onregelmatige
// onderrand en een bovenlaag voor volume, plus losse lokken (linten die taps toelopen) voor lang, golvend, bob en staarten. De kleur loopt
// een tikje op van wortel naar kruin (highlight) en elke lok krijgt een eigen tint, zodat het geen helm leest.
//
// H komt van models3d_people.js (die dit bestand importeert, dus geen import terug): { HEAD_Y, headShape, shade, mix, hairCap, hijab }.
// Hoofdruimte: +x is voor, +y omhoog, z opzij; de hoek A loopt van 0 (voor) via ±pi/2 (zij) naar pi (achter), theta van de kruin (0) omlaag.

const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
const dir = (A, th) => [Math.cos(A) * Math.sin(th), Math.cos(th), Math.sin(A) * Math.sin(th)];
// hairline: theta aan de voorkant, de zijkant en de achterkant, vloeiend ertussen
const line = (f, s, b) => (A) => { const a = Math.abs(wrap(A)); return a < Math.PI / 2 ? f + (s - f) * (a / (Math.PI / 2)) : s + (b - s) * ((a - Math.PI / 2) / (Math.PI / 2)); };

export function buildHairStyle(B, L, H) {
  const { HEAD_Y, headShape, shade, mix } = H;
  const style = L.hairStyle;
  const c = L.hair;
  const capped = L.hat === 'tammo' || L.hat === 'cap' || L.hat === 'police' || L.hat === 'flatcap' || L.hat === 'beanie' || L.hoodUp;
  const light = mix(c, 0xffffff, 0.2);
  const root = shade(c, 0.86);
  const seed = Math.round((L.seed || 1) * 7) % 97;
  const jit = (i) => Math.sin((i + seed) * 12.9898) * 0.5 + 0.5; // 0..1, stabiel per kapsel

  // een kleur met highlight: lichter naar de kruin en naar voren, wat donkerder in de nek; per kolom een tikje anders
  const tone = (y, j = 0) => {
    const t = Math.min(1, Math.max(0, (y - (HEAD_Y - 0.02)) / 0.14));
    const base = mix(root, light, t * 0.85);
    return j % 2 ? shade(base, 0.93) : base;
  };
  const P = (k, A, th, dx = 0, dy = 0) => headShape(k, dx, dy)(...dir(A, th));
  const out = (p) => { const x = p[0], y = p[1] - HEAD_Y, z = p[2]; const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };

  // De schedel-schil: kolommen rond het hoofd, rijen van de kruin naar de haarlijn. kOf(A, t) geeft het volume, thOf(A) de haarlijn.
  function scalp({ thOf, kOf, cols = 18, rows = 5, rag = 0.05, dx = 0, dy = 0, A0 = 0, A1 = TAU, col = null }) {
    const rc = (A1 - A0) / cols;
    const pt = (i, j) => {
      const A = A0 + j * rc;
      const edge = i === rows ? 1 + rag * (j % 2 ? 1 : -1) * (1 + jit(j)) : 1; // onregelmatige onderrand
      const t = i / rows;
      return P(kOf(A, t), A, thOf(A) * t * edge, dx, dy);
    };
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = pt(i, j), b = pt(i, j + 1), cc = pt(i + 1, j + 1), d = pt(i + 1, j);
        const mid = [(a[0] + cc[0]) / 2, (a[1] + cc[1]) / 2, (a[2] + cc[2]) / 2];
        B.quadOut(a, b, cc, d, out(mid), col ? col(mid[1], j) : tone(mid[1], j));
      }
    }
  }

  // Een lok: een lint dat van de schedel naar beneden valt, taps toeloopt en iets naar buiten bolt. Twee lagen (buiten en binnen).
  function lock({ A, th0 = 1.1, len = 0.3, w = 0.045, bulge = 0.03, wave = 0, taper = 0.7, curl = 0, k = 1.05, segs = 5, dy = 0, tint = 1 }) {
    const S = P(k, A, th0, 0, dy);
    const rx = Math.cos(A), rz = Math.sin(A), tx = -Math.sin(A), tz = Math.cos(A);
    const at = (s, side, off) => {
      const sw = wave * Math.sin(s * 5 + A * 3);
      const o = bulge * Math.sin(Math.min(1, s * 1.3) * Math.PI * 0.55) - curl * s * s + off;
      const half = (w / 2) * (1 - taper * s * s);
      const q = [S[0] + rx * o + tx * (side * half + sw), S[1] - len * s, S[2] + rz * o + tz * (side * half + sw)];
      // nooit in het hoofd: een punt dat binnen de schedel valt (bij de slapen) wordt naar buiten geduwd
      const e = Math.hypot(q[0] / 0.097, (q[1] - HEAD_Y) / 0.118, q[2] / 0.086);
      if (e < 1.03) { const u = 1.03 / Math.max(e, 1e-3); q[0] *= u; q[1] = HEAD_Y + (q[1] - HEAD_Y) * u; q[2] *= u; }
      return q;
    };
    const base = shade(tone(S[1] - len * 0.3), tint);
    for (let i = 0; i < segs; i++) {
      const s0 = i / segs, s1 = (i + 1) / segs;
      const col = i === segs - 1 ? shade(base, 0.85) : shade(base, 1 - 0.04 * (i % 2));
      B.quadOut(at(s0, -1, 0), at(s0, 1, 0), at(s1, 1, 0), at(s1, -1, 0), [rx, 0, rz], col);
      B.quadOut(at(s0, -1, -0.009), at(s0, 1, -0.009), at(s1, 1, -0.009), at(s1, -1, -0.009), [-rx, 0, -rz], shade(c, 0.6));
    }
  }
  // Een staart: een rij samengedrukte bollen die vanaf het bindpunt omlaag hangen, dunner naar de punt, met een lichte zwaai. Van
  // alle kanten een dikke staart (een lint was van opzij een streepje).
  function tail({ at, len = 0.26, r = 0.036, droop = 0.05, parts = 6, zig = 0 }) {
    for (let i = 0; i < parts; i++) {
      const sx = i / (parts - 1);
      const rr = r * (1 - 0.6 * sx * sx);
      const y = at[1] - len * sx;
      ellip(at[0] - droop * sx * sx * 3 - 0.012 * sx, y, at[2] + (i % 2 ? zig : -zig), rr, (len / parts) * 0.95, rr * 0.9, tone(y + 0.04, i));
    }
  }
  const ellip = (x, y, z, rx, ry, rz, color) => B.geo(new THREE.IcosahedronGeometry(1, 1), composeMatrix(x, y, z, 0, 0, 0, rx, ry, rz), color);
  const ball = (x, y, z, r, color, ry = r) => B.geo(new THREE.IcosahedronGeometry(1, 0), composeMatrix(x, y, z, 0, 0, 0, r, ry, r), color);
  const knot = (x, y, z, r, color) => B.geo(new THREE.IcosahedronGeometry(1, 1), composeMatrix(x, y, z, 0, 0, 0, r, r * 0.9, r), color);
  const bangs = (n, len, spread = 0.0, k = 1.07) => {
    for (let i = 0; i < n; i++) {
      const A = (i - (n - 1) / 2) * 0.25 + spread;
      lock({ A, th0: 0.5, len: len + 0.02 * jit(i + 5), w: 0.05, bulge: 0.012, taper: 0.5, k: k + 0.01 * (i % 2), segs: 3, tint: 1.05 });
    }
  };
  // krullen: een basisschil met trosjes er bovenop
  const curls = (count, r, k, thMax) => {
    for (let i = 0; i < count; i++) {
      const th = 0.12 + (thMax - 0.12) * Math.sqrt((i + 0.5) / count);
      const A = i * 2.399963 + seed;
      if (Math.abs(wrap(A)) < 0.9 && th > 0.95) continue; // het gezicht blijft vrij
      const p = P(k, A, th);
      ball(p[0], p[1], p[2], r * (0.8 + 0.4 * jit(i)) * 1.25, tone(p[1], i)); // detail 0: 20 driehoeken per krul (een menigte krullen blijft licht)
    }
  };

  const noFace = (A) => 1; // plaatshouder voor leesbaarheid
  void noFace;

  switch (style) {
    case 'bald':
      if (L.age === 'old') scalp({ thOf: line(0.5, 1.0, 1.15), kOf: () => 1.03, cols: 12, rows: 2, rag: 0 });
      return true;
    case 'buzz':
      scalp({ thOf: line(1.02, 1.28, 1.42), kOf: (A, t) => 1.012 + 0.006 * t, col: (y) => mix(c, 0x6a5a4a, 0.18), rag: 0.02 });
      return true;
    case 'short':
      scalp({ thOf: line(0.98, 1.34, 1.52), kOf: (A, t) => 1.05 + 0.05 * Math.sin(t * Math.PI) + (Math.abs(wrap(A)) < 0.9 ? 0.03 * t : 0), rag: 0.06 });
      // een zijscheiding: een bovenlaag die naar één kant valt
      scalp({ thOf: line(0.7, 0.8, 0.95), kOf: (A, t) => 1.1 + 0.03 * Math.sin(t * Math.PI), cols: 14, rows: 3, rag: 0.12, dy: 0.004 });
      return true;
    case 'pixie':
      scalp({ thOf: line(0.92, 1.38, 1.72), kOf: (A, t) => 1.06 + 0.05 * Math.sin(t * Math.PI), rag: 0.09 });
      bangs(5, 0.05, 0.25, 1.08);
      for (const s of [1, -1]) lock({ A: s * 1.35, th0: 1.1, len: 0.07, w: 0.04, bulge: 0.012, taper: 0.4, segs: 2 });
      return true;
    case 'quiff':
      scalp({ thOf: line(0.95, 1.3, 1.4), kOf: (A, t) => 1.03 + 0.012 * t, col: (y, j) => tone(y, j), rag: 0.03 });
      scalp({ thOf: line(0.95, 0.8, 0.8), kOf: (A, t) => 1.07 + 0.17 * Math.exp(-((wrap(A) / 0.8) ** 2)) * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.9), cols: 16, rows: 6, rag: 0.05, dy: 0.012 });
      return true;
    case 'undercut':
      scalp({ thOf: line(1.0, 1.35, 1.45), kOf: () => 1.014, col: () => mix(c, 0x6a5a4a, 0.2), rag: 0.02 });
      scalp({ thOf: line(0.88, 0.95, 1.0), kOf: (A, t) => 1.1 + 0.05 * Math.sin(t * Math.PI), cols: 16, rows: 5, rag: 0.08, dy: 0.008 });
      return true;
    case 'mohawk': {
      scalp({ thOf: line(1.0, 1.25, 1.4), kOf: () => 1.014, col: () => mix(c, 0x6a5a4a, 0.2), rag: 0.02 });
      const steps = 12;
      // de kam loopt over de kruin van voren (beta 0,95) naar de nek (beta -1,9): vooruit is A = 0, achteruit A = pi
      const beta = (i) => 0.9 - (i / steps) * 2.0;
      const onArc = (b, h, z) => { const p = b >= 0 ? P(1.02 + h / 0.1, 0, b) : P(1.02 + h / 0.1, Math.PI, -b); return [p[0], p[1], z]; };
      for (let i = 0; i < steps; i++) {
        const th0 = beta(i), th1 = beta(i + 1);
        const h0 = 0.02 + 0.05 * Math.sin((i / steps) * Math.PI), h1 = 0.02 + 0.05 * Math.sin(((i + 1) / steps) * Math.PI);
        const pa = (th, h, z) => onArc(th, h, z);
        const colr = i % 2 ? c : shade(c, 1.12);
        // de kam: twee zijkanten die samenkomen in een rand
        for (const z of [0.014, -0.014]) B.quadOut(pa(th0, 0, z), pa(th1, 0, z), pa(th1, h1, z * 0.3), pa(th0, h0, z * 0.3), [0, 0, z], colr);
        B.quadOut(pa(th0, h0, 0.004), pa(th1, h1, 0.004), pa(th1, h1, -0.004), pa(th0, h0, -0.004), [0, 1, 0], light);
      }
      return true;
    }
    case 'curly':
      scalp({ thOf: line(0.98, 1.38, 1.5), kOf: () => 1.06, rag: 0.05 });
      if (!capped) curls(36, 0.036, 1.11, 1.5); else curls(10, 0.03, 1.08, 1.4);
      return true;
    case 'afro':
      scalp({ thOf: line(0.98, 1.5, 1.85), kOf: (A, t) => (capped ? 1.08 : 1.18 + 0.12 * Math.sin(Math.min(1, t * 1.2) * Math.PI * 0.7)), cols: 20, rows: 6, rag: 0.05 });
      if (!capped) curls(26, 0.056, 1.3, 1.7);
      return true;
    case 'long':
    case 'wavy': {
      const wavy = style === 'wavy';
      scalp({ thOf: line(1.0, 1.5, 1.7), kOf: (A, t) => 1.055 + 0.04 * Math.sin(t * Math.PI), rag: 0.05 });
      const n = 13;
      for (let i = 0; i < n; i++) {
        const A = 0.85 + (i / (n - 1)) * (TAU - 1.7);
        const back = Math.abs(Math.sin((A - 0.85) / (TAU - 1.7) * Math.PI)); // achter het langst
        lock({ A, th0: 1.25, len: (wavy ? 0.23 : 0.27) + 0.07 * back * (0.6 + 0.4 * jit(i)), w: 0.058, bulge: wavy ? 0.05 : 0.035, wave: wavy ? 0.016 : 0.002, taper: wavy ? 0.5 : 0.35, curl: wavy ? 0.012 : 0, k: 1.06, tint: i % 3 ? 1 : 1.06 });
      }
      for (const s of [1, -1]) { // twee lokken voor de schouder
        lock({ A: s * 1.12, th0: 1.1, len: wavy ? 0.26 : 0.3, w: 0.048, bulge: 0.03, wave: wavy ? 0.012 : 0, taper: 0.55, k: 1.06 });
        lock({ A: s * 1.0, th0: 0.95, len: wavy ? 0.22 : 0.25, w: 0.04, bulge: 0.026, wave: wavy ? 0.012 : 0, taper: 0.55, k: 1.07 });
      }
      return true;
    }
    case 'bob':
    case 'fringe': {
      const bob = style === 'bob';
      scalp({ thOf: line(0.95, 1.5, 1.65), kOf: (A, t) => 1.06 + 0.05 * Math.sin(t * Math.PI), rag: 0.04 });
      const n = 14;
      for (let i = 0; i < n; i++) {
        const A = 0.8 + (i / (n - 1)) * (TAU - 1.6);
        lock({ A, th0: 1.3, len: (bob ? 0.14 : 0.2) + (bob ? 0.05 : 0.07) * jit(i + 11), w: 0.07, bulge: 0.04 + 0.02 * jit(i), curl: 0.02, taper: 0.3, k: 1.06, segs: 4, tint: i % 2 ? 1 : 1.05 });
      }
      for (const s of [1, -1]) lock({ A: s * 1.05, th0: 1.0, len: bob ? 0.17 : 0.25, w: 0.05, bulge: 0.04, curl: 0.016, taper: 0.1, k: 1.07, segs: 4 });
      bangs(bob ? 5 : 7, bob ? 0.06 : 0.075, 0, 1.075);
      return true;
    }
    case 'bun':
      scalp({ thOf: line(0.98, 1.38, 1.55), kOf: (A, t) => 1.05 + 0.05 * Math.sin(t * Math.PI), rag: 0.04 });
      knot(-0.07, HEAD_Y + 0.115, 0, 0.056, tone(HEAD_Y + 0.12, 1));
      B.geo(new THREE.TorusGeometry(0.052, 0.008, 3, 8), composeMatrix(-0.07, HEAD_Y + 0.115, 0, Math.PI / 2, 0, 0.2), shade(c, 0.7));
      return true;
    case 'ponytail':
      scalp({ thOf: line(0.98, 1.36, 1.5), kOf: (A, t) => 1.05 + 0.05 * Math.sin(t * Math.PI), rag: 0.04 });
      tail({ at: [-0.1, HEAD_Y + 0.06, 0], len: 0.3, r: 0.042, droop: 0.05, parts: 6 });
      B.box(-0.1, HEAD_Y + 0.062, 0, 0.026, 0.026, 0.056, shade(c, 0.55));
      return true;
    case 'pigtails':
      scalp({ thOf: line(0.98, 1.4, 1.55), kOf: (A, t) => 1.05 + 0.05 * Math.sin(t * Math.PI), rag: 0.04 });
      for (const s of [1, -1]) {
        tail({ at: [-0.035, HEAD_Y + 0.045, s * 0.098], len: 0.22, r: 0.03, droop: 0.02, parts: 4 });
        B.box(-0.035, HEAD_Y + 0.047, s * 0.098, 0.03, 0.03, 0.03, shade(c, 0.55));
      }
      return true;
    case 'braid':
      scalp({ thOf: line(0.98, 1.4, 1.55), kOf: (A, t) => 1.05 + 0.05 * Math.sin(t * Math.PI), rag: 0.04 });
      tail({ at: [-0.112, HEAD_Y - 0.02, 0], len: 0.34, r: 0.03, droop: 0.01, parts: 9, zig: 0.011 });
      B.box(-0.113, HEAD_Y - 0.35, 0, 0.022, 0.022, 0.03, shade(c, 0.5));
      return true;
    default:
      return false;
  }
}
