// Draws the ground floors of interieurplan.js (Forum, Martinikerk, Der Aa-kerk,
// Korenbeurs) as one vertex-coloured mesh per building, shelled like the
// Groninger Museum (museum3d.js roomShell), furnished from the plan's decor
// list. Like the museum, the rooms are portal boxes and are only drawn while
// the player is near.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder } from './pixelart3d.js';
import { registerPortalBoxes, registerInterior } from './portalcut3d.js';
import { interiorMat, lampMat, G_SOLID, G_LAMP, at, roomShell, painting, sign } from './museum3d.js';

const WOOD = 0x6b4a2e, WOOD_L = 0x9b7650, STONE = 0xcfc8b8, GOLD = 0xc9a04a, CLOTH = 0xe9e2d3;

// Each decor kind draws itself with room-local (a, c); `P` places a box.
const KINDS = {
  bank(B, r, d, P) {
    const len = d.len ?? 2;
    P(d.a, d.c, 0.42, len, 0.08, d.pew ? 0.55 : 0.5, WOOD);
    if (d.pew) P(d.a, d.c + (d.c > 0 ? 0.3 : -0.3), 0.8, len, 0.7, 0.07, WOOD);
    for (const s of [-1, 1]) P(d.a + s * (len / 2 - 0.06), d.c, 0.2, 0.08, 0.4, 0.5, 0x2b2b2b);
  },
  balie(B, r, d, P) {
    P(d.a, d.c, 0.55, d.len, 1.1, 0.7, CLOTH);
    P(d.a, d.c, 1.12, d.len + 0.1, 0.06, 0.8, WOOD);
  },
  kast(B, r, d, P) {
    const c = d.side * (r.hw - 0.3);
    P(d.a, c, 1.2, d.len, 2.4, 0.5, WOOD);
    [0.5, 1.1, 1.7].forEach((y, i) => {
      for (let k = 0; k < Math.floor(d.len / 0.5); k++) {
        P(d.a - d.len / 2 + 0.25 + k * 0.5, c - d.side * 0.26, y + 0.15, 0.36, 0.3, 0.06, [0xa8453a, 0x3d5d8a, 0x5f7f4a, 0xd0a23a, 0xe8e0cc][(k + i) % 5]);
      }
    });
  },
  zuil(B, r, d, P) {
    const w = d.r * 2, h = d.h;
    P(d.a, d.c, 0.2, w + 0.5, 0.4, w + 0.5, STONE);
    P(d.a, d.c, h / 2, w, h, w, 0xe2dac6);
    P(d.a, d.c, h / 2, w * 0.8, h, w * 0.8, 0xe2dac6, Math.PI / 4);
    P(d.a, d.c, h - 0.2, w + 0.5, 0.4, w + 0.5, STONE);
  },
  kraam(B, r, d, P) {
    P(d.a, d.c, 0.5, 2.6, 1.0, 0.9, WOOD_L);
    P(d.a, d.c, 1.05, 2.8, 0.06, 1.0, CLOTH);
    for (const sx of [-1.3, 1.3]) for (const sz of [-0.45, 0.45]) P(d.a + sx, d.c + sz, 1.3, 0.07, 2.6, 0.07, 0x4a4036);
    P(d.a, d.c, 2.65, 3.0, 0.1, 1.4, d.color);
    for (let k = 0; k < 4; k++) P(d.a - 0.9 + k * 0.6, d.c, 1.2, 0.4, 0.2, 0.4, [0xc94a4a, 0xe0b73a, 0x5f8f4a, 0xd9812b][k]);
  },
  doek(B, r, d) { painting(B, r, d.a, d.side, d.w, d.h, d.color, 2); },
  scherm(B, r, d, P) {
    P(d.a, d.side * (r.hw - 0.12), 1.9, d.w + 0.3, 3.0, 0.1, 0x16151c);
    P(d.a, d.side * (r.hw - 0.2), 1.9, d.w, 2.7, 0.04, 0xd8d8e6, 0, G_LAMP);
  },
  pad(B, r, d, P) { P(d.a, d.c, 0.045, d.len, 0.03, d.wid, d.color); },
  altaar(B, r, d, P) {
    P(d.a, d.c, 0.5, 1.2, 1.0, 2.6, 0xe6dfcf);
    P(d.a, d.c, 1.03, 1.3, 0.06, 2.7, 0xf4efe2);
    P(d.a - 0.2, d.c, 2.1, 0.12, 2.2, 0.12, GOLD);
    P(d.a - 0.2, d.c, 2.6, 0.12, 0.12, 0.8, GOLD);
  },
  kansel(B, r, d, P) {
    P(d.a, d.c, 0.9, 0.7, 1.8, 0.7, WOOD);
    P(d.a, d.c, 1.95, 1.5, 0.2, 1.5, WOOD);
    P(d.a, d.c, 2.45, 1.4, 0.9, 0.12, WOOD);
    P(d.a, d.c, 3.3, 1.7, 0.15, 1.7, 0x4a3320);
  },
  vont(B, r, d, P) {
    P(d.a, d.c, 0.45, 0.8, 0.9, 0.8, STONE);
    P(d.a, d.c, 0.45, 0.8, 0.9, 0.8, STONE, Math.PI / 4);
    P(d.a, d.c, 1.0, 0.9, 0.12, 0.9, 0x8a8478);
  },
  orgel(B, r, d, P) {
    const heights = [4.5, 5.6, 6.6, 7.4, 6.6, 5.6, 4.5];
    P(d.a, 0, 1.1, 1.4, 2.2, 8.4, 0x4a3320);
    heights.forEach((h, k) => P(d.a, -3 + k, h / 2 + 1.1, 0.5, h, 0.5, 0xc8c2b0));
    P(d.a - 0.5, 0, 2.0, 0.6, 0.4, 2.0, 0x2b1d12);
  },
  stoelen(B, r, d, P) {
    for (let i = 0; i < d.rows; i++) {
      for (let k = 0; k < d.cols; k++) {
        const a = d.a + i * 1.0, c = d.c + (k - (d.cols - 1) / 2) * 0.9;
        P(a, c, 0.4, 0.5, 0.08, 0.5, 0x8a2a3a);
        P(a + 0.22, c, 0.7, 0.08, 0.6, 0.5, 0x8a2a3a);
      }
    }
  },
  kaars(B, r, d, P) {
    P(d.a, d.c, 0.6, 0.1, 1.2, 0.1, GOLD);
    P(d.a, d.c, 1.35, 0.08, 0.3, 0.08, 0xf4efe2);
    P(d.a, d.c, 1.58, 0.06, 0.14, 0.06, 0xffd36a, 0, G_LAMP);
  },
  plant(B, r, d, P) {
    P(d.a, d.c, 0.3, 0.5, 0.6, 0.5, 0xa8693a);
    P(d.a, d.c, 1.0, 0.9, 0.9, 0.9, 0x4f8f4a, 0.5);
  },
  tafel(B, r, d, P) {
    P(d.a, d.c, 0.75, 1.8, 0.07, 1.0, WOOD_L);
    for (const sx of [-0.8, 0.8]) for (const sz of [-0.4, 0.4]) P(d.a + sx, d.c + sz, 0.38, 0.07, 0.76, 0.07, 0x3a2c20);
    for (const sz of [-0.85, 0.85]) P(d.a, d.c + sz, 0.25, 0.45, 0.5, 0.45, 0x8a6a46);
  },
};

export const DECOR_KINDS = Object.keys(KINDS);

const built = new Map();
export function buildInteriorOf(b) {
  const it = b.interior;
  if (!it) return null;
  if (built.has(it.id)) return built.get(it.id);
  const B = new GeoBuilder(2);
  const byId = (id) => it.rooms.find((q) => q.id === id);
  it.rooms.forEach((r, i) => roomShell(B, b, r, i, it.rooms));
  for (const d of it.decor) {
    const r = byId(d.room), draw = KINDS[d.kind];
    if (!r || !draw) continue;
    const rot = -Math.atan2(r.uy, r.ux);
    // box placed at room-local (a, c), centre height y, size along a / up / across c
    const P = (a, c, y, sa, sy, sc, color, extraRot = 0, grp = G_SOLID) => {
      const [x, , z] = at(r, a, c, 0);
      B.box(x, y, z, sa, sy, sc, color, grp, 0, rot + extraRot, 0);
    };
    draw(B, r, d, P);
  }
  const geo = B.build();
  const group = new THREE.Group();
  group.name = `interieur-${it.id}`;
  group.add(new THREE.Mesh(geo, [interiorMat, lampMat]));
  for (const s of it.signs || []) {
    const r = byId(s.room);
    if (r) sign(group, r, s.a, s.side, s.y, s.w, s.lines, s.bg, s.fg);
  }
  registerPortalBoxes(b, it.rooms.map((r) => ({ cx: r.cx, cy: r.cy, ux: r.ux, uy: r.uy, hl: r.hl, hw: r.hw, top: r.h + 0.02, bottom: -2 })));
  const main = it.rooms[0];
  registerInterior(group, { x: main.cx, y: main.cy }, it.show || 70);
  built.set(it.id, group);
  return group;
}
