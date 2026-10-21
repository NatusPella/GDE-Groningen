import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { registerBuildingModel, modelKit, LANDMARK_MATERIALS } from './landmarks3d.js';
import { GeoBuilder } from './pixelart3d.js';
import { pointInPolygon, closestPointOnSegment } from './util.js';
import { hash2 as hash } from './rng.js';
import { nearestOnRoads } from './tileplace.js';

// The real look of Tammo and Tessa's two homes, as models for the buildings
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
// - The petrol station across the service road (Pleiadenlaan 4): a BP with a
//   shop, car wash and coffee corner; here the parody "Bakkie Prut" in the
//   same green-and-white canopy livery, no real logo.
// - Korenbloemstraat (Bloemenbuurt, Oosterparkwijk): municipal workers'
//   housing by S.J. Bouma (Gemeentewerken), late 1920s / early 1930s:
//   terraced two-storey houses in bright red brick with contrasting coloured
//   brick bands, steep red pantile roofs, wooden dakkapellen, paired front
//   doors. Sources: erfgoed.groningen.nl "Wijkbeschrijving Oosterparkwijk"
//   (Hacquebord & Overbeek), funda listing Korenbloemstraat (bouwjaar 1932).

// landmarks3d.js and this module import each other: nothing of it may be
// read while the modules load, so the kit and the model registrations wait
// for the first call (kitReady, from the tag functions in home.js).
let K, PLAIN, BRICK, GLASS, METAL, TILE;
const DEFERRED = [];
const defer = (key, fn) => DEFERRED.push([key, fn]);
function kitReady() {
  if (K) return;
  K = modelKit;
  ({ PLAIN, BRICK, GLASS, METAL, TILE } = K.G);
  for (const [key, fn] of DEFERRED) registerBuildingModel(key, fn);
}
const STOREY = 3.1;

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

defer('hogToren', (B, b) => {
  const f = b.modelFrame;
  ensembleTower(B, f.corners, {
    levels: b.h, crown: !b.modelCut, brick: HOG.brick,
    noPlinth: (x, y) => f.closed(x, y),
    balcony: (e, i, k) => k >= 3 && k <= 9 && e.len > 18 && (i % 3 === 1),
  });
});
defer('atlasToren', (B, b, ring) => {
  const f = b.modelFrame;
  ensembleTower(B, ring, { levels: b.h, crown: true, brick: tint(HOG.brick, 0.96), noPlinth: (x, y) => f.closed(x, y) });
});

// --- the 1960s galerijflats of Paddepoel-Zuid --------------------------------------

// Polluxflat, Castorflat and Morgensterflat (Polluxstraat, Castorstraat,
// Morgensterlaan, by the Dierenriemstraat): gallery flats of 1969, "10 hoog"
// in two staggered slabs, 184 homes in the Polluxflat. A concrete frame with
// brick infill and closed brick end walls, a storage plinth, on one long side
// the open galleries (renewed with new decks and railings), on the other the
// window bands with stacked balconies. Sources: zoontjens.nl "Galerijophoging
// op Polluxflat in Groningen", oogtv.nl (tag Polluxflat), woningnetgroningen.nl
// listings (Polluxstraat galerijflat). The gallery side (west) and the
// colours are estimates from the type, not from a source.
const G60 = { brick: 0xb59a72, plinth: 0x6e5a4a, concrete: 0xdcd8ce, rail: 0x3a4046, glass: 0x34444e, frame: 0xeeece6, door: 0x56606a };

defer('galerij60', (B, b, ring) => {
  const H = Math.max(2.4, b.h * STOREY), N = Math.max(2, Math.round(b.h) + 1), fh = H / N;
  K.walls(B, ring, 0, () => H, G60.brick, BRICK);
  K.cap(B, ring, () => H, 0x5d5f62, PLAIN);
  // (boxes on the wall reach into it, each to its own depth: no back face
  // flush with the wall or with another box's)
  const eb = (e, t, y0, w, h, d, col, g, emb) => K.ebox(B, e, t, y0, w, h, d + emb, col, g, -emb);
  for (const e of K.edgesOf(ring)) {
    if (e.len < 1) continue;
    eb(e, e.len / 2, 0, e.len, fh - 0.2, 0.04, G60.plinth, BRICK, 0.03);
    eb(e, e.len / 2, H - 0.45, e.len + 0.1, 0.48, 0.25, G60.concrete, PLAIN, 0.02);
    if (e.len < 15) {
      // the closed end wall: brick between two concrete frame edges
      for (const t of [0.2, e.len - 0.2]) eb(e, t, 0, 0.4, H - 0.45, 0.08, G60.concrete, PLAIN, 0.04);
      continue;
    }
    const gallery = e.nx < -0.3;
    const posts = Math.max(1, Math.round(e.len / 3.6));
    for (let k = 1; k < N; k++) {
      const y = k * fh;
      if (gallery) {
        // gallery deck, its railing, the front doors and kitchen windows behind it
        eb(e, e.len / 2, y - 0.2, e.len, 0.2, 1.6, G60.concrete, PLAIN, 0.05);
        equad(B, e, e.len / 2, y, e.len, 1.05, 1.58, G60.rail, METAL);
        equad(B, e, e.len / 2, y + 0.9, e.len - 0.6, 1.1, 0.02, G60.glass, GLASS);
        for (let i = 0; i < posts; i++) equad(B, e, (i + 0.3) * e.len / posts, y + 0.05, 0.95, 2.1, 0.04, G60.door, PLAIN);
      } else {
        equad(B, e, e.len / 2, y + 0.75, e.len - 0.6, 1.45, 0.02, G60.glass, GLASS);
        for (let i = 0; i <= posts; i++) equad(B, e, Math.min(e.len - 0.3, Math.max(0.3, i * e.len / posts)), y + 0.7, 0.14, 1.55, 0.04, G60.frame, PLAIN);
        // stacked balconies, every other bay
        for (let i = 0; i < posts; i += 2) {
          const t = (i + 0.5) * e.len / posts;
          eb(e, t, y - 0.15, e.len / posts - 0.3, 0.15, 1.3, G60.concrete, PLAIN, 0.06);
          equad(B, e, t, y, e.len / posts - 0.3, 1.0, 1.28, G60.concrete, PLAIN);
        }
      }
      eb(e, e.len / 2, y - 0.2, e.len, 0.2, 0.06, G60.concrete, PLAIN, 0.07);
    }
    // the lift's machine room on the roof, over the gallery side
    if (gallery) K.ebox(B, e, e.len * 0.5, H, 3.2, 2.4, 3.0, G60.brick, BRICK, -3.2);
  }
});

// --- Bakkie Prut (the petrol station on the Pleiadenlaan) ------------------------

const PEUT = { green: 0x0f7a3a, lime: 0x9cc53a, white: 0xf1f2ee, grey: 0xc9ccc8, dark: 0x22262a, glass: 0x34444c, curb: 0xa7a59d };

function peutSignTexture(lines) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#0f7a3a'; g.fillRect(0, 0, 256, 512);
  g.fillStyle = '#f1f2ee'; g.fillRect(14, 14, 228, 150);
  g.fillStyle = '#0f7a3a';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 50px sans-serif'; g.fillText('BAKKIE', 128, 62);
  g.font = 'bold 64px sans-serif'; g.fillText('PRUT', 128, 122);
  g.fillStyle = '#9cc53a'; g.fillRect(14, 172, 228, 10);
  lines.forEach(([name, price], i) => {
    const y = 214 + i * 74;
    g.fillStyle = '#16191c'; g.fillRect(14, y - 30, 228, 60);
    g.fillStyle = '#f1f2ee'; g.font = 'bold 24px sans-serif'; g.textAlign = 'left'; g.fillText(name, 26, y);
    g.fillStyle = '#ffb43a'; g.font = 'bold 34px monospace'; g.textAlign = 'right'; g.fillText(price, 232, y);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function fasciaTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#1d5f73'; g.fillRect(0, 0, 512, 64);
  g.fillStyle = '#e0a526'; g.fillRect(0, 52, 512, 6);
  g.fillStyle = '#f1f2ee'; g.font = 'bold 36px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('BAKKIE PRUT', 256, 27);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// The canopy over the pumps (a building=roof footprint, drawn instead of the
// plain canopy slab): returns the mesh and where its columns and islands stand.
function buildPeutCanopy(c, map) {
  kitReady();
  const ring = c.pts[0][0] === c.pts[c.pts.length - 1][0] && c.pts[0][1] === c.pts[c.pts.length - 1][1] ? c.pts.slice(0, -1) : c.pts;
  const F = K.minAreaFrame(ring);
  const B = new GeoBuilder(5);
  const Y = 5.2, um = (F.u0 + F.u1) / 2, vm = (F.v0 + F.v1) / 2, L = F.u1 - F.u0, Wd = F.v1 - F.v0;
  // the roof: white underside, a green fascia with a lime stripe
  K.fbox(B, F, um, vm, Y, L + 0.6, Wd + 0.6, 0.9, PEUT.white, PLAIN);
  K.fbox(B, F, um, vm, Y + 0.1, L + 0.7, Wd + 0.7, 0.6, PEUT.green, PLAIN);
  K.fbox(B, F, um, vm, Y + 0.02, L + 0.72, Wd + 0.72, 0.08, PEUT.lime, PLAIN);
  const posts = [], islands = [];
  // two islands along the long axis, two pumps on each, a column at either end
  for (const s of [-1, 1]) {
    const v = vm + s * Wd * 0.25;
    K.fbox(B, F, um, v, 0, L * 0.62, 1.1, 0.16, PEUT.curb, PLAIN);
    islands.push({ p: F.P(um, v), half: L * 0.31, angle: F.rot });
    for (const du of [-0.17, 0.17]) {
      const u = um + du * L;
      K.fbox(B, F, u, v, 0.16, 0.75, 0.5, 1.75, PEUT.white, PLAIN);
      K.fbox(B, F, u, v, 1.91, 0.8, 0.55, 0.22, PEUT.green, PLAIN);
      K.fbox(B, F, u, v, 1.1, 0.42, 0.56, 0.32, PEUT.dark, GLASS);
      K.fbox(B, F, u, v, 0.6, 0.06, 0.62, 0.5, PEUT.dark, METAL);
    }
    for (const du of [-0.38, 0.38]) {
      const u = um + du * L;
      K.fbox(B, F, u, v, 0.16, 0.38, 0.38, Y - 0.16, PEUT.white, PLAIN);
      posts.push(F.P(u, v));
    }
  }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(B.build(), LANDMARK_MATERIALS));
  // fascia lettering on the long sides
  const ftex = fasciaTexture();
  const fmat = new THREE.MeshBasicMaterial({ map: ftex });
  for (const s of [-1, 1]) {
    const [x, z] = F.P(um, vm + s * (Wd / 2 + 0.37));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(L * 0.7, 9), 0.56), fmat);
    m.position.set(x, Y + 0.4, z);
    m.rotation.y = -F.rot + (s > 0 ? 0 : Math.PI);
    g.add(m);
  }
  // the price mast at the street corner, on the side away from the shop
  const street = nearestStreet(map, ...F.P(um, vm));
  if (street) {
    let best = null;
    for (const p of ring) {
      const d = Math.hypot(p[0] - street[0], p[1] - street[1]);
      if (!best || d < best.d) best = { d, p };
    }
    const dx = street[0] - best.p[0], dy = street[1] - best.p[1], dl = Math.hypot(dx, dy) || 1;
    const k = Math.min(4, Math.max(1.5, best.d - 6));
    const mx = best.p[0] + dx / dl * k, my = best.p[1] + dy / dl * k;
    const mast = new GeoBuilder(5);
    K.obox(mast, mx, my, 0, 1.7, 0.45, 0.5, Math.atan2(dy, dx) + Math.PI / 2, PEUT.grey, PLAIN);
    K.obox(mast, mx, my, 0.5, 1.5, 0.35, 7.0, Math.atan2(dy, dx) + Math.PI / 2, PEUT.green, PLAIN);
    g.add(new THREE.Mesh(mast.build(), LANDMARK_MATERIALS));
    const smat = new THREE.MeshBasicMaterial({ map: peutSignTexture([['Euro 95', '2,09'], ['Diesel', '1,84'], ['Bakkie', '0,95'], ['Eierbal', '2,50']]) });
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 2.72), smat);
      const off = s * 0.19;
      m.position.set(mx + dx / dl * off, 5.0, my + dy / dl * off);
      m.rotation.y = -Math.atan2(dy, dx) + Math.PI / 2 + (s > 0 ? 0 : Math.PI);
      g.add(m);
    }
    posts.push([mx, my]);
  }
  return { group: g, posts, islands };
}

function nearestStreet(map, x, y) {
  const q = nearestOnRoads(map, x, y, 60, (r) => r.cat === 'major' || r.cat === 'normal');
  return q && [q.x, q.y];
}

// The shop: white panels, a green band along the top, glass facing the pumps.
defer('peutShop', (B, b, ring) => {
  const H = 4.4;
  const toward = b.modelFrame.toward;
  for (const e of K.edgesOf(ring)) {
    const front = (toward[0] - e.a[0]) * e.nx + (toward[1] - e.a[1]) * e.ny > 0 && e.len > 5;
    equad(B, e, e.len / 2, 0, e.len, H - 0.95, 0, PEUT.white, PLAIN);
    K.ebox(B, e, e.len / 2, H - 0.85, e.len + 0.1, 0.85, 0.12, PEUT.green, PLAIN, 0);
    K.ebox(B, e, e.len / 2, H - 0.95, e.len + 0.1, 0.1, 0.13, PEUT.lime, PLAIN, 0);
    if (front) {
      equad(B, e, e.len / 2, 0.05, e.len - 1.2, 3.1, 0.03, PEUT.dark, METAL);
      equad(B, e, e.len / 2, 0.12, e.len - 1.4, 2.96, 0.06, PEUT.glass, GLASS);
      equad(B, e, e.len * 0.3, 0.12, 1.8, 2.3, 0.09, PEUT.dark, METAL);
    } else if (e.len > 4) {
      K.ebox(B, e, e.len / 2, 0, e.len, 0.4, 0.05, PEUT.grey, PLAIN, 0);
    }
  }
  K.cap(B, ring, () => H, 0x6c6e6c, PLAIN);
});

// --- Korenbloemstraat: Bouma's terraced houses ----------------------------------

const KB = {
  brick: 0xa84c34, plinth: 0x4f2d24, band: 0xc9a06a, tile: 0xa04a30, frame: 0xefeae0, glass: 0x2a3640,
  door: 0x2f5a40, lead: 0x5b6166, lit: 0xf6d38c,
};

defer('boumaRij', (B, b, ring) => {
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
  kitReady();
  const road = map.roads.find((r) => r.name === 'Korenbloemstraat');
  if (!road) return;
  const [a, c] = [road.pts[0], road.pts[road.pts.length - 1]];
  const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const dir = [(c[0] - a[0]) / L, (c[1] - a[1]) / L];
  const q = closestPointOnSegment(1308.82, -805.45, a[0], a[1], c[0], c[1]);
  let hn = [-dir[1], dir[0]];
  const [px, py] = [1309.06, -791.36];
  if (hn[0] * (px - q.x) + hn[1] * (py - q.y) < 0) hn = [-hn[0], -hn[1]];
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

// The Paddepoel ensemble and the petrol station. tower: home.js's building and
// layout frame; plinth: the garage polygon; lobby: the lobby door.
export function tagPleiadenlaan(map, { tower, frame, plinth, lobby }) {
  kitReady();
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
  const atlas = map.buildingsNear(-1296.56, -1041.67, 30).find((b) => b.name === 'Atlas');
  if (atlas) {
    atlas.model = 'atlasToren';
    atlas.modelFrame = { closed };
    atlas._geo3dParts = null;
  }
  // the 1960s gallery flats a few streets north
  for (const b of map.buildingsNear(-1486.21, -1369.81, 160)) {
    if (b.model || !['Polluxflat', 'Castorflat', 'Morgensterflat'].includes(b.name)) continue;
    b.model = 'galerij60';
    b._geo3dParts = null;
  }
  const canopy = (map.canopies || []).find((c) => pointInPolygon(-1334.94, -1060.18, c.pts));
  if (canopy) canopy.custom = (m) => buildPeutCanopy(canopy, m);
  const shop = map.buildingsNear(-1347.69, -1042.86, 20).find((b) => pointInPolygon(-1347.69, -1042.86, b.pts) && b.h <= 3);
  if (shop) {
    shop.model = 'peutShop';
    shop.modelFrame = { toward: [-1334.94, -1060.18] };
    shop._geo3dParts = null;
  }
}
