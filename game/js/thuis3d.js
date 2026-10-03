import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { registerBuildingModel, modelKit, LANDMARK_MATERIALS } from './landmarks3d.js';
import { pointInPolygon, closestPointOnSegment } from './util.js';

// The real look of Tammo and Anita's two homes, as models for the buildings
// home.js tags (b.model):
//
// - House of Groningen and Atlas, Pleiadenlaan / Dierenriemstraat (Paddepoel),
//   on the site of the former GAK office; AAS architecten (Henk Scholten),
//   Plegt-Vos, 2019-2021. House of Groningen: ~20.5 x 27.5 m, 22-23 storeys,
//   70 m; Atlas (students): ~50 m. Fully masonry, an orange-nuanced brick
//   "gecementeerd" (the joint mortar smeared over the face), which reads as
//   golden yellow (the colour of the cathedral in Arbois); aluminium frames;
//   French balconies with classical balustrades, real balconies only on the
//   lower floors (3-9, the three-room flats); cemented ornament surfaces that
//   end in a crown on top; a two-layer parking garage between the towers in
//   the same brick with a masonry parapet on its deck, entrance from the
//   Dierenriemstraat. Sources: aasgroningen.nl/project/atlas-pleione,
//   stedenbouw.nl "Twee gebouwen, twee gebruikers, een ensemble",
//   brinkmanbaksteencentrum.nl (Atlas & House of Groningen),
//   dijkhuis-ingenieurs.nl, mwpo.nl, wijzigingsplan Atlas en Pleione.
// - Korenbloemstraat (Bloemenbuurt, Oosterparkwijk): municipal workers'
//   housing by S.J. Bouma (Gemeentewerken), late 1920s / early 1930s:
//   terraced two-storey houses in bright red brick with contrasting coloured
//   brick bands, steep red pantile roofs, wooden dakkapellen, paired front
//   doors. Sources: erfgoed.groningen.nl "Wijkbeschrijving Oosterparkwijk"
//   (Hacquebord & Overbeek), funda listing Korenbloemstraat (bouwjaar 1932).

const K = modelKit;
const { PLAIN, BRICK, GLASS, METAL, TILE } = K.G;
const STOREY = 3.1;

const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const tint = (hex, f) => {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * f)), g = Math.min(255, Math.round(((hex >> 8) & 255) * f)), b = Math.min(255, Math.round((hex & 255) * f));
  return (r << 16) | (g << 8) | b;
};

// A flat quad on edge e's outside face: t metres along it, `out` proud.
function equad(B, e, t, y0, w, h, out, color, g) {
  const ax = e.a[0] + e.tx * (t - w / 2) + e.nx * out, az = e.a[1] + e.ty * (t - w / 2) + e.ny * out;
  const bx = ax + e.tx * w, bz = az + e.ty * w;
  B.quad([ax, y0, az], [bx, y0, bz], [bx, y0 + h, bz], [ax, y0 + h, az], color, g);
}

// --- the ensemble: House of Groningen and Atlas ----------------------------------

const HOG = {
  brick: 0xd39b55, cement: 0xe8d9b8, frame: 0x3e3832, glass: 0x56707e, roof: 0x77736c, steel: 0x2c2f33, base: 0x8c6a48,
};

// opt: levels (storeys), crown (false for the cut-off tower under the flat),
// noPlinth(x, y) -> true where the ground floor stays closed (garage, lobby),
// balcony(e, i, k) -> true for a balcony at bay i of storey k.
function ensembleTower(B, ring, opt) {
  const N = opt.levels, top = N * STOREY;
  const edges = K.edgesOf(ring);
  const crownFrom = opt.crown ? N - 2 : N;
  edges.forEach((e, ei) => {
    const n = Math.max(1, Math.round(e.len / 2.9));
    const bw = e.len / n;
    for (let k = 0; k < N; k++) {
      const y0 = k * STOREY;
      const crown = k >= crownFrom;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) * bw;
        const wall = crown ? HOG.cement : tint(opt.brick, 0.95 + hash(ei * 31 + i, k) * 0.09);
        equad(B, e, t, y0, bw, STOREY, 0, wall, crown ? PLAIN : BRICK);
        if (e.len < 1.6) continue;
        const [wx, wy] = [e.a[0] + e.tx * t, e.a[1] + e.ty * t];
        if (k === 0) {
          if (opt.noPlinth && opt.noPlinth(wx, wy)) continue;
          equad(B, e, t, 0.45, Math.min(2.4, bw - 0.5), 2.45, 0.03, HOG.frame, METAL);
          equad(B, e, t, 0.55, Math.min(2.2, bw - 0.7), 2.25, 0.06, HOG.glass, GLASS);
          continue;
        }
        if (crown) {
          for (const s of [-0.3, 0.3]) {
            equad(B, e, t + s * bw * 0.6, y0 + 0.35, 0.62, 2.45, 0.03, HOG.frame, METAL);
            equad(B, e, t + s * bw * 0.6, y0 + 0.42, 0.48, 2.3, 0.06, HOG.glass, GLASS);
          }
          continue;
        }
        if (opt.balcony && opt.balcony(e, i, k)) {
          // a real balcony: a cemented slab, a steel bar railing, a door behind it
          equad(B, e, t, y0 + 0.1, 1.2, 2.5, 0.03, HOG.frame, METAL);
          equad(B, e, t, y0 + 0.2, 1.0, 2.3, 0.06, HOG.glass, GLASS);
          K.ebox(B, e, t, y0 - 0.05, bw - 0.25, 0.22, 1.45, HOG.cement, PLAIN, 0);
          equad(B, e, t, y0 + 0.17, bw - 0.25, 1.0, 1.42, HOG.steel, METAL);
          continue;
        }
        // the varied facade: columns of French balconies and ordinary windows, now and then swapped
        const french = ((i + ei) % 2 === 0) !== (hash(ei * 7 + i, k * 3) < 0.22);
        if (french) {
          equad(B, e, t, y0 + 0.1, 1.3, 2.6, 0.03, HOG.frame, METAL);
          equad(B, e, t, y0 + 0.2, 1.1, 2.4, 0.06, HOG.glass, GLASS);
          // the classical balustrade in front of it
          K.ebox(B, e, t, y0 + 0.98, 1.6, 0.1, 0.16, HOG.cement, PLAIN, 0.04);
          K.ebox(B, e, t, y0 + 0.12, 1.6, 0.1, 0.14, HOG.cement, PLAIN, 0.04);
          for (const s of [-0.55, -0.18, 0.18, 0.55]) equad(B, e, t + s, y0 + 0.22, 0.1, 0.76, 0.12, HOG.cement, PLAIN);
        } else {
          equad(B, e, t, y0 + 0.8, 1.55, 1.75, 0.03, HOG.frame, METAL);
          equad(B, e, t, y0 + 0.88, 1.35, 1.6, 0.06, HOG.glass, GLASS);
          equad(B, e, t, y0 + 0.66, 1.75, 0.16, 0.09, HOG.cement, PLAIN);
        }
      }
    }
    // cemented corner pilasters, the dark base and the cornice under the crown
    if (e.len > 4) {
      for (const t of [0.45, e.len - 0.45]) K.ebox(B, e, t, 0, 0.9, top, 0.1, HOG.cement, PLAIN, 0);
      K.ebox(B, e, e.len / 2, 0, e.len, 0.45, 0.06, HOG.base, PLAIN, 0);
      K.ebox(B, e, e.len / 2, STOREY - 0.25, e.len, 0.3, 0.14, HOG.cement, PLAIN, 0);
      if (opt.crown) K.ebox(B, e, e.len / 2, crownFrom * STOREY - 0.3, e.len + 0.3, 0.45, 0.22, HOG.cement, PLAIN, 0);
    }
  });
  K.cap(B, ring, () => top, HOG.roof, PLAIN);
  if (!opt.crown) return;
  // the crown: a cemented parapet with open piers above the roof, taller on the corners
  for (const e of edges) {
    if (e.len < 1.6) continue;
    K.ebox(B, e, e.len / 2, top, e.len, 1.0, 0.35, HOG.cement, PLAIN, -0.35);
    const n = Math.max(1, Math.round(e.len / 2.9));
    for (let i = 0; i <= n; i++) {
      const corner = i === 0 || i === n;
      const t = Math.min(e.len - 0.4, Math.max(0.4, i * e.len / n));
      K.ebox(B, e, t, top, corner ? 1.1 : 0.55, corner ? 3.6 : 2.4, corner ? 1.1 : 0.4, HOG.cement, PLAIN, corner ? -1.1 : -0.4);
    }
    K.ebox(B, e, e.len / 2, top + 2.4, e.len, 0.3, 0.55, HOG.cement, PLAIN, -0.5);
  }
}

registerBuildingModel('hogToren', (B, b) => {
  const f = b.modelFrame;
  ensembleTower(B, f.corners, {
    levels: b.h, crown: !b.modelCut, brick: HOG.brick,
    noPlinth: (x, y) => f.closed(x, y),
    balcony: (e, i, k) => k >= 3 && k <= 9 && e.len > 18 && (i % 3 === 1),
  });
});
registerBuildingModel('atlasToren', (B, b, ring) => {
  const f = b.modelFrame;
  ensembleTower(B, ring, { levels: b.h, crown: true, brick: tint(HOG.brick, 0.96), noPlinth: (x, y) => f.closed(x, y) });
});

// --- Korenbloemstraat: Bouma's terraced houses ----------------------------------

const KB = {
  brick: 0xa84c34, plinth: 0x4f2d24, band: 0xc9a06a, tile: 0xa04a30, frame: 0xefeae0, glass: 0x2a3640,
  door: 0x2f5a40, lead: 0x5b6166, lit: 0xf6d38c,
};

registerBuildingModel('boumaRij', (B, b, ring) => {
  const s = b.modelFrame;
  const F = K.frameFrom(s.dir[0], s.dir[1], ring);
  const vF = s.side > 0 ? F.v1 : F.v0; // the street facade's v
  const depth = (p) => Math.abs(F.V(p[0], p[1]) - vF);
  const DEEP = 8.4, EAVE = 5.5, PITCH = 1.2;
  const main = K.clipRing(ring, (p) => DEEP - depth(p));
  const rear = K.clipRing(ring, (p) => depth(p) - DEEP);
  // the back: a lower flat-roofed annex
  if (rear.length >= 3) {
    K.walls(B, rear, 0, () => 3.0, tint(KB.brick, 0.92), BRICK);
    K.cap(B, rear, () => 3.0, KB.lead, PLAIN);
  }
  if (main.length < 3) return;
  const half = DEEP / 2, vm = vF - s.side * half;
  const rise = Math.min(PITCH * half, 5.2);
  const yAt = (p) => EAVE + rise * Math.max(0, 1 - Math.abs(F.V(p[0], p[1]) - vm) / half);
  const brick = tint(KB.brick, 0.94 + hash(F.u0, F.v0) * 0.1);
  K.walls(B, main, 0, yAt, brick, BRICK);
  for (const side of [1, -1]) {
    const h = K.clipRing(main, (p) => side * (F.V(p[0], p[1]) - vm));
    if (h.length >= 3) K.cap(B, h, yAt, tint(KB.tile, 0.95 + hash(F.u1, side) * 0.08), TILE);
  }
  // the street facade: dark plinth, a yellow brick band over the ground floor,
  // paired doors and windows in white frames, a white gutter board
  for (const e of K.edgesOf(main)) {
    const facing = (e.nx * -F.uy + e.ny * F.ux) * s.side;
    if (facing < 0.7 || e.len < 2.5) continue;
    K.ebox(B, e, e.len / 2, 0, e.len, 0.55, 0.05, KB.plinth, BRICK, 0);
    K.ebox(B, e, e.len / 2, 2.55, e.len, 0.28, 0.05, KB.band, BRICK, 0);
    K.ebox(B, e, e.len / 2, EAVE - 0.3, e.len + 0.2, 0.3, 0.32, KB.frame, PLAIN, 0);
    const n = Math.max(1, Math.round(e.len / 5.2));
    const w = e.len / n;
    for (let i = 0; i < n; i++) {
      const t0 = i * w, mir = i % 2 ? -1 : 1;
      const c = t0 + w / 2;
      const dt = c - mir * w * 0.3, wt = c + mir * w * 0.12;
      equad(B, e, dt, 0.05, 1.15, 2.4, 0.03, KB.frame, PLAIN);
      equad(B, e, dt, 0.1, 0.95, 2.05, 0.06, KB.door, PLAIN);
      equad(B, e, dt, 2.2, 0.85, 0.22, 0.07, KB.glass, GLASS);
      equad(B, e, wt, 0.85, Math.min(2.2, w * 0.45), 1.5, 0.03, KB.frame, PLAIN);
      equad(B, e, wt, 0.92, Math.min(2.2, w * 0.45) - 0.16, 1.36, 0.06, KB.glass, GLASS);
      for (const d of [-0.7, 0.7]) {
        equad(B, e, c + d * w * 0.28, 3.25, 1.05, 1.3, 0.03, KB.frame, PLAIN);
        equad(B, e, c + d * w * 0.28, 3.32, 0.89, 1.16, 0.06, KB.glass, GLASS);
      }
      // the dakkapel: a wooden dormer on the street slope; the home's one is lit
      const lit = s.zolder && i === Math.floor(n / 2);
      const back = 1.5, yb = EAVE + rise * back / half;
      const [dx, dz] = [e.a[0] + e.tx * c - e.nx * back, e.a[1] + e.ty * c - e.ny * back];
      const rot = Math.atan2(e.ty, e.tx);
      const dw = lit ? 2.0 : 1.5, dh = 1.35;
      K.obox(B, dx - e.nx * 0.7, dz - e.ny * 0.7, yb - 0.6, dw, 1.4, dh + 0.6, rot, KB.frame, PLAIN);
      K.obox(B, dx - e.nx * 0.75, dz - e.ny * 0.75, yb + dh, dw + 0.25, 1.65, 0.12, KB.lead, PLAIN);
      const gx = dx + e.nx * 0.02, gz = dz + e.ny * 0.02;
      B.quad([gx - e.tx * (dw / 2 - 0.15), yb + 0.12, gz - e.ty * (dw / 2 - 0.15)], [gx + e.tx * (dw / 2 - 0.15), yb + 0.12, gz + e.ty * (dw / 2 - 0.15)],
        [gx + e.tx * (dw / 2 - 0.15), yb + dh - 0.12, gz + e.ty * (dw / 2 - 0.15)], [gx - e.tx * (dw / 2 - 0.15), yb + dh - 0.12, gz - e.ty * (dw / 2 - 0.15)], lit ? KB.lit : KB.glass, lit ? PLAIN : GLASS);
    }
  }
  // a chimney on the ridge
  const [cx, cz] = F.P(F.u0 + 0.6, vm);
  K.obox(B, cx, cz, EAVE + rise - 0.4, 0.6, 0.9, 1.5, F.rot, tint(KB.brick, 0.85), BRICK);
});

// --- tagging -----------------------------------------------------------------------

// Korenbloemstraat: the houses on either side of it get Bouma's terrace, the
// one under the opening's attic window (intromontage.js: 9.5 m from the
// street towards the park) its lit dakkapel.
export function tagKorenbloemstraat(map) {
  const road = map.roads.find((r) => r.name === 'Korenbloemstraat');
  if (!road) return;
  const [a, c] = [road.pts[0], road.pts[road.pts.length - 1]];
  const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const dir = [(c[0] - a[0]) / L, (c[1] - a[1]) / L];
  const q = closestPointOnSegment(1320, -779, a[0], a[1], c[0], c[1]);
  let hn = [-dir[1], dir[0]];
  if (hn[0] * (1320 - q.x) + hn[1] * (-765 - q.y) < 0) hn = [-hn[0], -hn[1]];
  const attic = [q.x + hn[0] * 9.5, q.y + hn[1] * 9.5];
  let home = null;
  const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
  for (const b of map.buildingsNear(mid[0], mid[1], L / 2 + 30)) {
    if (b.type !== 'house' || b.model) continue;
    const cx = b.pts.reduce((s, p) => s + p[0], 0) / b.pts.length, cy = b.pts.reduce((s, p) => s + p[1], 0) / b.pts.length;
    const p = closestPointOnSegment(cx, cy, a[0], a[1], c[0], c[1]);
    if (p.dist2 > 21 * 21) continue;
    const along = (cx - a[0]) * dir[0] + (cy - a[1]) * dir[1];
    if (along < -3 || along > L + 3) continue;
    const side = (p.x - cx) * -dir[1] + (p.y - cy) * dir[0] > 0 ? 1 : -1;
    b.model = 'boumaRij';
    b.modelFrame = { dir, side, zolder: false };
    b._geo3dParts = null;
    const d = (pointInPolygon(attic[0], attic[1], b.pts) ? 0 : 1) + Math.hypot(cx - attic[0], cy - attic[1]) / 100;
    if (!home || d < home.d) home = { d, b };
  }
  if (home) home.b.modelFrame.zolder = true;
}

// The Paddepoel ensemble. tower: home.js's building and
// layout frame; plinth: the garage polygon; lobby: the lobby door.
export function tagPleiadenlaan(map, { tower, frame, plinth, lobby }) {
  const nearPlinth = (x, y) => {
    for (let i = 0; i < plinth.length; i++) {
      const a = plinth[i], c = plinth[(i + 1) % plinth.length];
      if (closestPointOnSegment(x, y, a[0], a[1], c[0], c[1]).dist2 < 1.5 * 1.5) return true;
    }
    return pointInPolygon(x, y, plinth);
  };
  const closed = (x, y) => nearPlinth(x, y) || Math.hypot(x - lobby[0], y - lobby[1]) < 2.6;
  tower.model = 'hogToren';
  tower.modelFrame = { corners: frame, closed };
  tower._geo3dParts = null;
  const atlas = map.buildingsNear(-1276, -1056, 30).find((b) => b.name === 'Atlas');
  if (atlas) {
    atlas.model = 'atlasToren';
    atlas.modelFrame = { closed };
    atlas._geo3dParts = null;
  }
}
