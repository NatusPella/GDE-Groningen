// Draws one interior (epic Interieurs, #1150): the shell of the hall (floor, ceiling, walls with the
// doorway and the windows of the facade, lamps) and every item of the layout as a few boxes, merged
// into ONE geometry with three material groups: 0 solid (vertex colours), 1 lamps (emissive, unlit),
// 2 glass (transparent). The door leaf is a second small mesh that swings. Pure of the world: a plan
// and the floor height in, a geometry out, in coordinates relative to the door so nothing loses
// precision far from the origin (the group sits at the door).
//
// Budget (interior_budget_test.mjs): <= 9000 triangles and 3 groups per interior; the geometry is
// built when the player comes near and disposed when he leaves (interiors.js).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, vcMaterial } from './pixelart3d.js';
import { toWorld } from './interiorframe.js';
import { ITEM_TYPES, footprint, FACE } from './interiorlayout.js';
import { hash2 } from './rng.js';

export const G_SOLID = 0, G_LAMP = 1, G_GLASS = 2;
export const MAX_TRIANGLES = 9000;

export const solidMaterial = vcMaterial({ side: THREE.DoubleSide, emissive: 0x3a352c, emissiveIntensity: 1 });
export const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xfff1d6 });
export const glassMaterial = new THREE.MeshStandardMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
export const leafMaterial = vcMaterial({ side: THREE.DoubleSide, emissive: 0x2a2620, emissiveIntensity: 1 });
for (const m of [solidMaterial, lampMaterial, glassMaterial, leafMaterial]) m.userData.shared = true;

const shade = (hex, f) => {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * f)), g = Math.min(255, Math.round(((hex >> 8) & 255) * f)), b = Math.min(255, Math.round((hex & 255) * f));
  return (r << 16) | (g << 8) | b;
};
const WOOD = 0x8a6440, WOOD_D = 0x5a3d26, WOOD_L = 0xb8956a, STEEL = 0x8e949a, DARK = 0x2c2f33, WHITE = 0xece8de, GLASSC = 0xcfe6f2;
const PRODUCTS = [0xd8423a, 0xf2c24a, 0x4f9a52, 0xf2efe6, 0x3a6ad8, 0xd88a3a, 0x8a4fb0];

// ---------------------------------------------------------------------------------------------------------

export function buildInteriorGeometry(plan, baseY, origin, opts = {}) {
  const { frame, hall, layout, door } = plan;
  const H = plan.height;
  const B = new GeoBuilder(3);
  const pal = layout.palette;
  const P = (u, v, y) => { const [x, z] = toWorld(frame, u, v); return [x - origin.x, baseY + y, z - origin.y]; };
  const du = [frame.tx, 0, frame.ty], dv = [-frame.nx, 0, -frame.ny];
  const neg = (a) => [-a[0], -a[1], -a[2]];
  const UP = [0, 1, 0], DOWN = [0, -1, 0];
  const q = (a, b, c, d, out, color, grp = G_SOLID) => B.quadOut(a, b, c, d, out, color, grp);

  // axis-aligned box in the door frame; faces: top, +u, -u, +v, -v (no bottom)
  const box = (u0, u1, v0, v1, y0, y1, color, grp = G_SOLID, lite = false) => {
    if (u1 - u0 < 1e-4 || v1 - v0 < 1e-4 || y1 - y0 < 1e-4) return;
    q(P(u0, v0, y1), P(u1, v0, y1), P(u1, v1, y1), P(u0, v1, y1), UP, color, grp);
    q(P(u0, v0, y0), P(u1, v0, y0), P(u1, v0, y1), P(u0, v0, y1), neg(dv), color, grp);
    if (lite) return;
    q(P(u0, v1, y0), P(u1, v1, y0), P(u1, v1, y1), P(u0, v1, y1), dv, shade(color, 0.92), grp);
    q(P(u1, v0, y0), P(u1, v1, y0), P(u1, v1, y1), P(u1, v0, y1), du, shade(color, 0.85), grp);
    q(P(u0, v0, y0), P(u0, v1, y0), P(u0, v1, y1), P(u0, v0, y1), neg(du), shade(color, 0.85), grp);
  };
  // a wall quad at fixed v (runs along u), facing +v (side = 1) or -v (side = -1)
  const wallAtV = (v, ua, ub, y0, y1, side, color, grp = G_SOLID) => { if (ub - ua > 1e-4 && y1 - y0 > 1e-4) q(P(ua, v, y0), P(ub, v, y0), P(ub, v, y1), P(ua, v, y1), side > 0 ? dv : neg(dv), color, grp); };
  const wallAtU = (u, va, vb, y0, y1, side, color, grp = G_SOLID) => { if (vb - va > 1e-4 && y1 - y0 > 1e-4) q(P(u, va, y0), P(u, vb, y0), P(u, vb, y1), P(u, va, y1), side > 0 ? du : neg(du), color, grp); };

  // --- floor, ceiling --------------------------------------------------------------------------------------
  const floorY = 0.02;
  const tile = pal.floorPattern === 1 ? 1.0 : pal.floorPattern === 2 ? 1.25 : 0;
  const fl = pal.floor;
  if (tile) {
    let ti = 0;
    for (let u = hall.u0; u < hall.u1 - 1e-6; u += tile, ti++) {
      let tk = 0;
      for (let v = hall.v0; v < hall.v1 - 1e-6; v += tile, tk++) {
        const u1 = Math.min(hall.u1, u + tile), v1 = Math.min(hall.v1, v + tile);
        q(P(u, v, floorY), P(u1, v, floorY), P(u1, v1, floorY), P(u, v1, floorY), UP, (ti + tk) % 2 ? shade(fl, 0.82) : fl);
      }
    }
  } else if (plan.kind === 'woning' || plan.kind === 'horeca' || plan.kind === 'bibliotheek') {
    // boards: wide strips in two shades along u
    let i = 0;
    for (let v = hall.v0; v < hall.v1 - 1e-6; v += 0.8, i++) q(P(hall.u0, v, floorY), P(hall.u1, v, floorY), P(hall.u1, Math.min(hall.v1, v + 0.8), floorY), P(hall.u0, Math.min(hall.v1, v + 0.8), floorY), UP, shade(fl, i % 2 ? 0.93 : 1.0));
  } else {
    q(P(hall.u0, hall.v0, floorY), P(hall.u1, hall.v0, floorY), P(hall.u1, hall.v1, floorY), P(hall.u0, hall.v1, floorY), UP, fl);
  }
  // the doorway: floor through the facade, a threshold strip
  q(P(-door.w / 2, 0, floorY), P(door.w / 2, 0, floorY), P(door.w / 2, hall.v0, floorY), P(-door.w / 2, hall.v0, floorY), UP, shade(fl, 0.9));
  box(-door.w / 2, door.w / 2, 0.08, 0.2, 0, 0.045, 0x9a9a98);
  q(P(hall.u0, hall.v0, H), P(hall.u1, hall.v0, H), P(hall.u1, hall.v1, H), P(hall.u0, hall.v1, H), DOWN, pal.ceil);

  // --- walls -----------------------------------------------------------------------------------------------
  const wallC = pal.wall, skirt = shade(pal.wall, 0.62), wain = plan.kind === 'woning' || plan.kind === 'horeca' ? shade(pal.wall, 0.8) : null;
  const wainH = 1.0;
  // side and back walls, inward faces; a skirting board
  const solidWallV = (u, side) => {
    wallAtU(u, hall.v0, hall.v1, 0, 0.12, side, skirt);
    if (wain) { wallAtU(u, hall.v0, hall.v1, 0.12, wainH, side, wain); wallAtU(u, hall.v0, hall.v1, wainH, H, side, wallC); } else wallAtU(u, hall.v0, hall.v1, 0.12, H, side, wallC);
  };
  solidWallV(hall.u0, 1); solidWallV(hall.u1, -1);
  const backWall = () => {
    wallAtV(hall.v1, hall.u0, hall.u1, 0, 0.12, -1, skirt);
    if (wain) { wallAtV(hall.v1, hall.u0, hall.u1, 0.12, wainH, -1, wain); wallAtV(hall.v1, hall.u0, hall.u1, wainH, H, -1, wallC); } else wallAtV(hall.v1, hall.u0, hall.u1, 0.12, H, -1, wallC);
  };
  backWall();

  // the front wall with its openings (door gap, the windows of the facade)
  const opens = [{ u0: -door.w / 2, u1: door.w / 2, y0: 0, y1: door.h, door: true }];
  for (const w of plan.windows || []) {
    const u = w.c - plan.doorC, a = u - w.w / 2, b = u + w.w / 2;
    if (b < hall.u0 + 0.2 || a > hall.u1 - 0.2) continue;
    const o = { u0: Math.max(hall.u0 + 0.05, a), u1: Math.min(hall.u1 - 0.05, b), y0: Math.max(0.05, w.y0), y1: Math.min(H - 0.1, w.y1) };
    if (o.u1 - o.u0 < 0.25 || o.y1 - o.y0 < 0.3) continue;
    if (o.u0 >= opens[0].u0 - 1e-6 && o.u1 <= opens[0].u1 + 1e-6 && o.y1 <= opens[0].y1 + 1e-6) continue; // inside the door gap
    opens.push(o);
  }
  const cuts = [...new Set([hall.u0, hall.u1, ...opens.flatMap((o) => [o.u0, o.u1])])].filter((u) => u >= hall.u0 - 1e-9 && u <= hall.u1 + 1e-9).sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i++) {
    const ua = cuts[i], ub = cuts[i + 1];
    if (ub - ua < 1e-4) continue;
    const mid = (ua + ub) / 2;
    const here = opens.filter((o) => mid > o.u0 && mid < o.u1).map((o) => [o.y0, o.y1]).sort((a, b) => a[0] - b[0]);
    let y = 0;
    for (const [a, b] of here) { if (a > y) addFront(ua, ub, y, a); y = Math.max(y, b); }
    if (y < H) addFront(ua, ub, y, H);
  }
  function addFront(ua, ub, y0, y1) {
    // skirting at the foot, the wall colour above
    const sk = Math.min(y1, 0.12);
    if (y0 < sk) wallAtV(hall.v0, ua, ub, y0, sk, 1, skirt);
    const base = Math.max(y0, 0.12);
    if (y1 > base) wallAtV(hall.v0, ua, ub, base, y1, 1, wallC);
  }
  // reveals: the wall is 0.3 m thick between the facade and the hall
  for (const o of opens) {
    const c = o.door ? shade(wallC, 0.9) : shade(wallC, 0.95);
    wallAtU(o.u0, 0, hall.v0, o.y0, o.y1, 1, c);
    wallAtU(o.u1, 0, hall.v0, o.y0, o.y1, -1, c);
    q(P(o.u0, 0, o.y1), P(o.u1, 0, o.y1), P(o.u1, hall.v0, o.y1), P(o.u0, hall.v0, o.y1), DOWN, shade(wallC, 0.85));
    if (!o.door) q(P(o.u0, 0, o.y0), P(o.u1, 0, o.y0), P(o.u1, hall.v0, o.y0), P(o.u0, hall.v0, o.y0), UP, shade(wallC, 1.0)); // the sill
  }

  // --- partitions ------------------------------------------------------------------------------------------
  for (const w of layout.walls) {
    box(w.u0, w.u1, w.v0, w.v1, 0, w.h, shade(wallC, 0.97));
  }
  for (const o of layout.openings) {
    // a lintel over the doorway of a partition
    if (o.axis === 'u') box(o.u - o.w / 2, o.u + o.w / 2, o.v - 0.06, o.v + 0.06, o.h, H, shade(wallC, 0.97));
    else box(o.u - 0.06, o.u + 0.06, o.v - o.w / 2, o.v + o.w / 2, o.h, H, shade(wallC, 0.97));
  }

  // --- lamps -----------------------------------------------------------------------------------------------
  for (const [u, v] of layout.lamps) {
    box(u - 0.45, u + 0.45, v - 0.2, v + 0.2, H - 0.05, H - 0.01, 0xfff1d6, G_LAMP, true);
  }

  // --- items -----------------------------------------------------------------------------------------------
  for (let k = 0; k < layout.items.length; k++) drawItem(layout.items[k], k);

  function drawItem(it, k) {
    const fn = DRAW[it.type];
    if (!fn) return;
    const fp = footprint(it);
    // item-local (a across the front, c toward the front, y up) -> hall frame by the face
    const f = it.face & 3;
    const map = (a, c) => (f === FACE.DOOR ? [it.u + a, it.v - c] : f === FACE.E ? [it.u + c, it.v + a] : f === FACE.BACK ? [it.u - a, it.v + c] : [it.u - c, it.v - a]);
    const bx = (a0, a1, c0, c1, y0, y1, color, grp = G_SOLID, lite = false) => {
      const [pu0, pv0] = map(a0, c0), [pu1, pv1] = map(a1, c1);
      // "front" is +c: lite boxes draw the face toward the front; map keeps it a face of the aligned box
      const u0 = Math.min(pu0, pu1), u1 = Math.max(pu0, pu1), v0 = Math.min(pv0, pv1), v1 = Math.max(pv0, pv1);
      if (lite) liteBox(u0, u1, v0, v1, y0, y1, color, grp, f);
      else box(u0, u1, v0, v1, y0, y1, color, grp);
    };
    const r = (n) => hash2(it.u * 7.3 + n + k * 1.7, it.v * 3.1 + n * 2.9);
    fn({ bx, it, w: it.w, d: it.d, h: it.h, r, shade, fp, color: it.color ?? pal.accent, pal });
  }
  // a lite box shows only its top and the face that looks toward the item front (f = face of the item)
  function liteBox(u0, u1, v0, v1, y0, y1, color, grp, f) {
    if (u1 - u0 < 1e-4 || v1 - v0 < 1e-4 || y1 - y0 < 1e-4) return;
    q(P(u0, v0, y1), P(u1, v0, y1), P(u1, v1, y1), P(u0, v1, y1), UP, color, grp);
    if (f === FACE.DOOR) q(P(u0, v0, y0), P(u1, v0, y0), P(u1, v0, y1), P(u0, v0, y1), neg(dv), shade(color, 0.9), grp);
    else if (f === FACE.BACK) q(P(u0, v1, y0), P(u1, v1, y0), P(u1, v1, y1), P(u0, v1, y1), dv, shade(color, 0.9), grp);
    else if (f === FACE.E) q(P(u1, v0, y0), P(u1, v1, y0), P(u1, v1, y1), P(u1, v0, y1), du, shade(color, 0.9), grp);
    else q(P(u0, v0, y0), P(u0, v1, y0), P(u0, v1, y1), P(u0, v0, y1), neg(du), shade(color, 0.9), grp);
  }

  const geometry = B.build();
  return { geometry, triangles: B.triangleCount, plan };
}

// ---------------------------------------------------------------------------------------------------------
// The items. Each draws in item-local axes: a across the front (-w/2..w/2), c toward the front
// (-d/2 back .. +d/2 front), y up. `lite` boxes only show their top and front (goods on shelves).

const goods = (x, n, a0, a1, c0, c1, y0, y1, colors) => {
  const w = (a1 - a0) / n;
  for (let i = 0; i < n; i++) x.bx(a0 + i * w + 0.02, a0 + (i + 1) * w - 0.02, c0, c1, y0, y0 + (y1 - y0) * (0.7 + 0.3 * x.r(i + y0 * 5)), colors[Math.floor(x.r(i * 3 + y0) * colors.length)], G_SOLID, true);
};

const DRAW = {
  shelf(x) {
    const { w, d, h } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, -c + 0.04, 0, h, WOOD_D);
    x.bx(-a, -a + 0.04, -c, c, 0, h, WOOD_D); x.bx(a - 0.04, a, -c, c, 0, h, WOOD_D);
    const levels = Math.max(2, Math.min(5, Math.round(h / 0.4)));
    const pal = [x.color, x.shade(x.color, 1.25), ...PRODUCTS];
    for (let i = 0; i < levels; i++) {
      const y = 0.15 + i * ((h - 0.2) / levels);
      x.bx(-a, a, -c, c, y, y + 0.03, WOOD_L);
      goods(x, 4, -a + 0.05, a - 0.05, -c + 0.05, c - 0.04, y + 0.03, y + 0.03 + Math.min(0.3, (h - 0.2) / levels - 0.06), pal);
    }
  },
  gondola(x) {
    const { w, d, h } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, c, 0, h * 0.55, x.shade(x.color, 0.4));
    x.bx(-a, a, -c, c, h * 0.55, h * 0.6, WHITE);
    goods(x, Math.max(3, Math.round(w / 0.3)), -a + 0.04, a - 0.04, -c + 0.05, c - 0.05, h * 0.6, h * 0.6 + 0.25, [x.color, ...PRODUCTS]);
  },
  counter(x) {
    const { w, d, h } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, c, 0, h - 0.05, x.color);
    x.bx(-a - 0.03, a + 0.03, -c - 0.03, c + 0.06, h - 0.05, h, WHITE);
    if (x.it.glass) x.bx(-a + 0.05, a - 0.05, 0, c - 0.02, h, h + 0.35, GLASSC, G_GLASS);
    x.bx(-0.25, 0.25, -c + 0.05, -c + 0.35, h, h + 0.22, DARK); // the till
    x.bx(-0.2, 0.2, -c + 0.07, -c + 0.09, h + 0.05, h + 0.2, 0x4aa8d8, G_LAMP);
  },
  bar(x) { DRAW.counter({ ...x, it: { ...x.it, glass: false } }); x.bx(-x.w / 2, x.w / 2, x.d / 2 + 0.02, x.d / 2 + 0.07, 0.2, 0.26, STEEL); },
  fridge(x) {
    const { w, d, h } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, c - 0.05, 0, h, x.color);
    x.bx(-a + 0.04, a - 0.04, c - 0.05, c - 0.03, 0.1, h - 0.1, GLASSC, G_GLASS);
    const n = Math.max(2, Math.round(h / 0.45));
    for (let i = 0; i < n; i++) goods(x, 4, -a + 0.06, a - 0.06, -c + 0.05, c - 0.08, 0.15 + i * (h - 0.3) / n, 0.15 + i * (h - 0.3) / n + 0.25, PRODUCTS);
    x.bx(-a, a, c - 0.06, c - 0.02, h - 0.05, h, 0xe8f4ff, G_LAMP);
  },
  rack(x) {
    const { w, h } = x, a = w / 2;
    x.bx(-a, -a + 0.04, -0.03, 0.03, 0, h, STEEL); x.bx(a - 0.04, a, -0.03, 0.03, 0, h, STEEL);
    x.bx(-a, a, -0.025, 0.025, h - 0.1, h - 0.06, STEEL);
    const n = Math.max(3, Math.round(w / 0.16));
    for (let i = 0; i < n; i++) x.bx(-a + 0.06 + i * ((w - 0.12) / n), -a + 0.06 + (i + 0.75) * ((w - 0.12) / n), -0.12, 0.12, h - 0.7, h - 0.12, PRODUCTS[Math.floor(x.r(i) * PRODUCTS.length)], G_SOLID, true);
  },
  booth(x) {
    const { w, d, h } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, -c + 0.05, 0, h, WOOD_L); x.bx(-a, -a + 0.05, -c, c, 0, h, WOOD_L); x.bx(a - 0.05, a, -c, c, 0, h, WOOD_L);
    x.bx(-a + 0.05, a - 0.05, c - 0.06, c - 0.02, 0.1, h - 0.1, x.color); // the curtain
    x.bx(-a, a, -c, c, h - 0.03, h, WOOD_L);
  },
  mirror(x) { x.bx(-x.w / 2, x.w / 2, -x.d / 2, x.d / 2, x.it.y0 ?? 0.2, (x.it.y0 ?? 0.2) + x.h, 0xcfe0e8, G_GLASS); x.bx(-x.w / 2 - 0.03, x.w / 2 + 0.03, -x.d / 2, -x.d / 2 + 0.02, (x.it.y0 ?? 0.2) - 0.03, (x.it.y0 ?? 0.2) + x.h + 0.03, DARK); },
  barber_chair(x) {
    x.bx(-0.3, 0.3, -0.3, 0.3, 0, 0.08, STEEL); x.bx(-0.06, 0.06, -0.06, 0.06, 0.08, 0.45, STEEL);
    x.bx(-0.3, 0.3, -0.3, 0.3, 0.45, 0.58, 0x2a2a2e); x.bx(-0.3, 0.3, -0.34, -0.22, 0.58, 1.05, 0x2a2a2e);
    x.bx(-0.25, 0.25, 0.28, 0.4, 0.1, 0.18, STEEL);
  },
  sink(x) { x.bx(-0.3, 0.3, -0.25, 0.25, 0, 0.85, WHITE); x.bx(-0.22, 0.22, -0.18, 0.18, 0.85, 0.9, 0xb8c4cc); x.bx(-0.02, 0.02, -0.22, -0.18, 0.9, 1.1, STEEL); },
  bench(x) {
    const { w, d, h } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, c, h - 0.06, h, WOOD); x.bx(-a + 0.06, -a + 0.14, -c + 0.04, c - 0.04, 0, h - 0.06, WOOD_D); x.bx(a - 0.14, a - 0.06, -c + 0.04, c - 0.04, 0, h - 0.06, WOOD_D);
  },
  bike(x) {
    const { w } = x, a = w / 2;
    x.bx(-a, -a + 0.05, -0.04, 0.04, 0.05, 0.75, DARK); x.bx(a - 0.05, a, -0.04, 0.04, 0.05, 0.75, DARK);
    x.bx(-a + 0.35, a - 0.35, -0.03, 0.03, 0.4, 0.46, x.color); x.bx(-a + 0.35, -a + 0.4, -0.03, 0.03, 0.4, 0.95, x.color);
    x.bx(a - 0.5, a - 0.2, -0.05, 0.05, 0.9, 0.95, DARK);
  },
  workbench(x) {
    const { w, d, h } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, c, h - 0.05, h, WOOD_L); x.bx(-a + 0.05, -a + 0.12, -c + 0.05, c - 0.05, 0, h - 0.05, STEEL); x.bx(a - 0.12, a - 0.05, -c + 0.05, c - 0.05, 0, h - 0.05, STEEL);
    x.bx(-a + 0.12, a - 0.12, -c + 0.05, c - 0.05, 0.25, 0.3, WOOD_D);
    x.bx(-0.3, 0.1, -0.1, 0.1, h, h + 0.12, 0xc2423a, G_SOLID, true);
  },
  bucket(x) {
    x.bx(-0.2, 0.2, -0.2, 0.2, 0, 0.4, 0x6f7a80);
    for (let i = 0; i < 5; i++) x.bx(-0.18 + i * 0.07, -0.18 + i * 0.07 + 0.1, -0.12 + (i % 2) * 0.14, -0.02 + (i % 2) * 0.14, 0.4, 0.4 + 0.25 + (i % 3) * 0.08, x.color, G_SOLID, true);
  },
  tvwall(x) {
    const n = Math.max(1, Math.round(x.w / 0.7));
    for (let i = 0; i < n; i++) { const a0 = -x.w / 2 + i * (x.w / n); x.bx(a0 + 0.04, a0 + x.w / n - 0.04, -x.d / 2, -x.d / 2 + 0.06, x.it.y0 ?? 1.5, (x.it.y0 ?? 1.5) + 0.55, DARK); x.bx(a0 + 0.08, a0 + x.w / n - 0.08, -x.d / 2 + 0.06, -x.d / 2 + 0.065, (x.it.y0 ?? 1.5) + 0.04, (x.it.y0 ?? 1.5) + 0.51, [0x3a6ad8, 0x35d0f0, 0xf0f4ff, 0xf08a3a][i % 4], G_LAMP); }
  },
  showcase(x) {
    const { w, d, h } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, c, 0, 0.7, x.color); x.bx(-a + 0.03, a - 0.03, -c + 0.03, c - 0.03, 0.7, h, GLASSC, G_GLASS);
    goods(x, 4, -a + 0.06, a - 0.06, -c + 0.08, c - 0.08, 0.7, 0.9, PRODUCTS);
  },
  cabinet(x) { x.bx(-x.w / 2, x.w / 2, -x.d / 2, x.d / 2, 0, x.h, x.color === 0x2e9a5a ? x.color : WOOD); x.bx(-0.01, 0.01, x.d / 2, x.d / 2 + 0.01, 0.05, x.h - 0.05, WOOD_D); },
  table(x) {
    const { w, d, h } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, c, h - 0.05, h, WOOD_L);
    x.bx(-a + 0.05, -a + 0.1, -c + 0.05, -c + 0.1, 0, h - 0.05, WOOD_D); x.bx(a - 0.1, a - 0.05, c - 0.1, c - 0.05, 0, h - 0.05, WOOD_D);
    x.bx(a - 0.1, a - 0.05, -c + 0.05, -c + 0.1, 0, h - 0.05, WOOD_D); x.bx(-a + 0.05, -a + 0.1, c - 0.1, c - 0.05, 0, h - 0.05, WOOD_D);
  },
  chair(x) {
    const { w, d } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, c, 0.42, 0.47, WOOD); x.bx(-a, a, -c, -c + 0.05, 0.47, 0.9, WOOD); x.bx(-a + 0.03, a - 0.03, -c + 0.03, c - 0.03, 0, 0.42, WOOD_D);
  },
  stool(x) { x.bx(-0.18, 0.18, -0.18, 0.18, 0.6, 0.66, 0x8a2a2a); x.bx(-0.04, 0.04, -0.04, 0.04, 0, 0.6, STEEL); },
  plant(x) { x.bx(-0.25, 0.25, -0.25, 0.25, 0, 0.4, 0xa8693a); x.bx(-0.3, 0.3, -0.3, 0.3, 0.4, 0.9, 0x4f8f4a); x.bx(-0.2, 0.2, -0.2, 0.2, 0.9, 1.2, 0x5fa05a); },
  crate(x) { x.bx(-x.w / 2, x.w / 2, -x.d / 2, x.d / 2, 0, 0.3, WOOD); x.bx(-x.w / 2 + 0.03, x.w / 2 - 0.03, -x.d / 2 + 0.03, x.d / 2 - 0.03, 0.3, 0.42, x.color, G_SOLID, true); },
  poster(x) { const y0 = x.it.y0 ?? 1.5; x.bx(-x.w / 2, x.w / 2, -x.d / 2, -x.d / 2 + 0.03, y0, y0 + x.h, x.color); x.bx(-x.w / 2 + 0.08, x.w / 2 - 0.08, -x.d / 2 + 0.03, -x.d / 2 + 0.035, y0 + 0.08, y0 + x.h - 0.08, x.shade(x.color, 0.7)); },
  desk(x) {
    const { w, d, h } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, c, h - 0.04, h, WOOD_L); x.bx(-a, -a + 0.04, -c, c, 0, h - 0.04, STEEL); x.bx(a - 0.04, a, -c, c, 0, h - 0.04, STEEL);
    x.bx(-0.2, 0.2, -c + 0.1, -c + 0.14, h, h + 0.3, DARK); x.bx(-0.17, 0.17, -c + 0.14, -c + 0.145, h + 0.03, h + 0.27, 0x7ab8f0, G_LAMP);
    x.bx(-0.18, 0.18, 0, 0.18, h, h + 0.02, 0x3a3c3e);
  },
  sofa(x) {
    const { w, d } = x, a = w / 2, c = d / 2, col = x.color;
    x.bx(-a, a, -c, c, 0.05, 0.4, col); x.bx(-a, a, -c, -c + 0.22, 0.4, 0.85, x.shade(col, 0.9));
    x.bx(-a, -a + 0.15, -c, c, 0.4, 0.62, x.shade(col, 0.8)); x.bx(a - 0.15, a, -c, c, 0.4, 0.62, x.shade(col, 0.8));
  },
  tv(x) { x.bx(-x.w / 2, x.w / 2, -x.d / 2, x.d / 2, 0, 0.42, WOOD_D); x.bx(-0.45, 0.45, -0.05, 0.03, 0.45, 0.95, DARK); x.bx(-0.4, 0.4, 0.03, 0.035, 0.5, 0.9, 0x2a3a5a, G_LAMP); },
  bed(x) {
    const { w, d } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, c, 0, 0.3, WOOD_D); x.bx(-a + 0.03, a - 0.03, -c + 0.03, c - 0.03, 0.3, 0.5, x.color);
    x.bx(-a, a, -c, -c + 0.08, 0.3, 0.95, WOOD_D); x.bx(-a + 0.1, a - 0.1, -c + 0.12, -c + 0.4, 0.5, 0.62, WHITE);
  },
  wardrobe(x) { x.bx(-x.w / 2, x.w / 2, -x.d / 2, x.d / 2, 0, x.h, WOOD); x.bx(-0.01, 0.01, x.d / 2, x.d / 2 + 0.01, 0.05, x.h - 0.05, WOOD_D); },
  kitchen(x) {
    const { w, d, h } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, c, 0, h - 0.04, x.color); x.bx(-a - 0.01, a + 0.01, -c, c + 0.03, h - 0.04, h, 0x5a5e62);
    if (x.r(1) < 0.4) for (const [p, s] of [[-0.18, -0.12], [0.18, -0.12], [-0.18, 0.12], [0.18, 0.12]]) x.bx(p - 0.07, p + 0.07, s - 0.05, s + 0.05, h, h + 0.01, DARK);
  },
  rug(x) { x.bx(-x.w / 2, x.w / 2, -x.d / 2, x.d / 2, 0.02, 0.035, x.color); },
  floorlamp(x) { x.bx(-0.02, 0.02, -0.02, 0.02, 0, 1.5, DARK); x.bx(-0.15, 0.15, -0.15, 0.15, 1.5, 1.8, 0xffe6b0, G_LAMP); },
  pew(x) {
    const { w, d } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c + 0.1, c, 0.4, 0.46, WOOD_D); x.bx(-a, a, -c, -c + 0.07, 0.46, 0.95, WOOD_D);
    x.bx(-a, -a + 0.06, -c, c, 0, 0.95, WOOD_D); x.bx(a - 0.06, a, -c, c, 0, 0.95, WOOD_D);
  },
  altar(x) { x.bx(-x.w / 2, x.w / 2, -x.d / 2, x.d / 2, 0, 1.0, 0xe6dfcf); x.bx(-x.w / 2 - 0.05, x.w / 2 + 0.05, -x.d / 2 - 0.05, x.d / 2 + 0.05, 1.0, 1.06, 0xf4efe2); x.bx(-0.04, 0.04, -0.05, 0.05, 1.06, 1.7, 0xc9a04a); x.bx(-0.22, 0.22, -0.05, 0.05, 1.45, 1.51, 0xc9a04a); },
  pulpit(x) { x.bx(-0.3, 0.3, -0.3, 0.3, 0, 1.6, WOOD_D); x.bx(-0.5, 0.5, -0.5, 0.5, 1.6, 1.72, WOOD); x.bx(-0.5, 0.5, -0.5, -0.4, 1.72, 2.3, WOOD_D); },
  candle(x) { x.bx(-0.04, 0.04, -0.04, 0.04, 0, 1.2, 0xc9a04a); x.bx(-0.07, 0.07, -0.07, 0.07, 1.2, 1.3, 0xf4efe2); x.bx(-0.03, 0.03, -0.03, 0.03, 1.3, 1.42, 0xffd36a, G_LAMP); },
  organ(x) {
    const { w } = x, a = w / 2;
    x.bx(-a, a, -x.d / 2, x.d / 2, 0, 2.2, 0x4a3320);
    const n = 9;
    for (let i = 0; i < n; i++) { const hh = 4.2 + 2.2 * Math.sin((i / (n - 1)) * Math.PI); x.bx(-a + 0.15 + i * ((w - 0.3) / n), -a + 0.15 + (i + 0.6) * ((w - 0.3) / n), -x.d / 2 + 0.1, -x.d / 2 + 0.35, 2.2, Math.min(hh, 6.2), 0xc8c2b0); }
  },
  board(x) {
    const y0 = x.it.y0 ?? 2.4;
    x.bx(-x.w / 2, x.w / 2, -x.d / 2, -x.d / 2 + 0.08, y0, y0 + x.h, 0x16151c);
    for (let i = 0; i < 4; i++) x.bx(-x.w / 2 + 0.2, x.w / 2 - 0.2, -x.d / 2 + 0.08, -x.d / 2 + 0.085, y0 + 0.12 + i * 0.2, y0 + 0.22 + i * 0.2, 0xffc24a, G_LAMP);
  },
  pillar(x) { x.bx(-x.w / 2, x.w / 2, -x.d / 2, x.d / 2, 0, x.h, 0xe2dac6); x.bx(-x.w / 2 - 0.06, x.w / 2 + 0.06, -x.d / 2 - 0.06, x.d / 2 + 0.06, 0, 0.3, 0xcfc8b8); },
  machine(x) { x.bx(-x.w / 2, x.w / 2, -x.d / 2, x.d / 2, 0, x.h, x.color); x.bx(-0.25, 0.25, x.d / 2, x.d / 2 + 0.02, 1.1, 1.5, 0x7ab8f0, G_LAMP); },
  bookcase(x) {
    const { w, d, h } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, c - 0.06, 0, h, WOOD);
    const n = Math.max(3, Math.round(h / 0.38));
    const cols = [0x8a2a2a, 0x2a3a66, 0x4a6a3a, 0xcbb894, 0xc8943c, 0x6a4a2e];
    for (let i = 0; i < n; i++) {
      const y = 0.12 + i * ((h - 0.2) / n);
      goods(x, Math.max(4, Math.round(w / 0.18)), -a + 0.03, a - 0.03, c - 0.06, c - 0.005, y, y + 0.3, cols);
      if (x.it.double) x.bx(-a + 0.03, a - 0.03, -c - 0.05, -c, y, y + 0.3, cols[i % cols.length]);
    }
  },
  carlift(x) {
    const { w, d } = x, a = w / 2, c = d / 2;
    x.bx(-a, -a + 0.12, -c + 0.4, -c + 0.55, 0, 2.2, 0xc98a16); x.bx(a - 0.12, a, -c + 0.4, -c + 0.55, 0, 2.2, 0xc98a16);
    x.bx(-a, a, -c + 0.2, c - 0.2, 0.5, 0.58, STEEL);
    x.bx(-a + 0.1, a - 0.1, -c + 0.1, c - 0.1, 0.7, 1.15, x.color); x.bx(-a + 0.2, a - 0.2, -c + 0.9, c - 0.9, 1.15, 1.55, x.shade(x.color, 0.9)); x.bx(-a + 0.28, a - 0.28, -c + 0.95, c - 0.95, 1.2, 1.5, 0xaed0e2, G_GLASS);
    for (const [p, s] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) x.bx(p * (a - 0.02) - 0.09, p * (a - 0.02) + 0.09, s * (c - 0.7) - 0.3, s * (c - 0.7) + 0.3, 0.45, 0.95, DARK);
  },
  tyres(x) { for (let i = 0; i < 4; i++) x.bx(-0.35, 0.35, -0.35, 0.35, i * 0.25, i * 0.25 + 0.24, 0x2a2a2c); },
  barrel(x) { x.bx(-0.28, 0.28, -0.28, 0.28, 0, 0.9, x.color); x.bx(-0.29, 0.29, -0.29, 0.29, 0.3, 0.34, 0x2a2a2c); x.bx(-0.29, 0.29, -0.29, 0.29, 0.6, 0.64, 0x2a2a2c); },
  toolwall(x) {
    const y0 = x.it.y0 ?? 0.9;
    x.bx(-x.w / 2, x.w / 2, -x.d / 2, -x.d / 2 + 0.05, y0, y0 + x.h, 0xb8a37a);
    for (let i = 0; i < Math.round(x.w / 0.3); i++) x.bx(-x.w / 2 + 0.1 + i * 0.3, -x.w / 2 + 0.16 + i * 0.3, -x.d / 2 + 0.05, -x.d / 2 + 0.09, y0 + 0.2 + (i % 3) * 0.3, y0 + 0.65 + (i % 3) * 0.3, [STEEL, 0xc2423a, 0x2f6fb8][i % 3]);
  },
  taps(x) {
    const { w } = x, a = w / 2;
    x.bx(-a, a, -0.2, 0.2, 0, 1.0, WOOD_D); x.bx(-a, a, -0.2, 0.2, 1.0, 1.06, STEEL);
    for (let i = 0; i < 5; i++) x.bx(-a + 0.1 + i * (w / 5), -a + 0.2 + i * (w / 5), 0.0, 0.1, 1.06, 1.4 + (i % 3) * 0.1, [0x2f6a3a, 0x8a4a20, 0xcfd8de, 0x2a3a66, 0xc2423a][i], G_SOLID, true);
    x.bx(-a, a, -0.2, -0.17, 1.5, 1.52, STEEL);
  },
  coatrack(x) { x.bx(-0.03, 0.03, -0.03, 0.03, 0, 1.7, DARK); for (let i = 0; i < 3; i++) x.bx(-0.15 + i * 0.12, -0.05 + i * 0.12, -0.1, 0.1, 0.9, 1.6, [0x2a3a66, 0x8a2a2a, 0x4a6a3a][i], G_SOLID, true); },
  cubicle(x) {
    const { w, d, h } = x, a = w / 2, c = d / 2;
    x.bx(-a, a, -c, -c + 0.06, 0, h, 0xdad6cc); x.bx(-a, -a + 0.06, -c, c, 0, h, 0xdad6cc); x.bx(a - 0.06, a, -c, c, 0, h, 0xdad6cc);
    x.bx(-a + 0.06, a - 0.06, c - 0.05, c, 0, h - 0.1, 0x9a8a6a); x.bx(-0.18, 0.18, -c + 0.1, -c + 0.45, 0, 0.4, WHITE);
  },
  copier(x) { x.bx(-x.w / 2, x.w / 2, -x.d / 2, x.d / 2, 0, x.h, 0xd8d8d4); x.bx(-x.w / 2 + 0.05, x.w / 2 - 0.05, -x.d / 2 + 0.05, x.d / 2 - 0.05, x.h, x.h + 0.06, 0x3a3c3e); },
  locker(x) { x.bx(-x.w / 2, x.w / 2, -x.d / 2, x.d / 2, 0, x.h, 0x4a6a8a); x.bx(-0.01, 0.01, x.d / 2, x.d / 2 + 0.01, 0.1, x.h - 0.1, DARK); },
  flag(x) { x.bx(-0.02, 0.02, -0.02, 0.02, 0, x.h, STEEL); x.bx(0.02, 0.5, -0.01, 0.01, x.h - 0.6, x.h - 0.1, 0x2f4f8a); },
  trolley(x) { x.bx(-0.22, 0.22, -0.4, 0.4, 0.2, 0.9, 0xb8bcc0, G_SOLID, true); x.bx(-0.22, 0.22, -0.4, -0.35, 0.9, 1.0, DARK); x.bx(-0.2, 0.2, -0.38, 0.38, 0.05, 0.2, DARK); },
  dartboard(x) { const y0 = x.it.y0 ?? 1.6; x.bx(-0.25, 0.25, -x.d / 2, -x.d / 2 + 0.03, y0, y0 + 0.5, 0x16151c); x.bx(-0.16, 0.16, -x.d / 2 + 0.03, -x.d / 2 + 0.04, y0 + 0.09, y0 + 0.41, 0xc2423a); x.bx(-0.06, 0.06, -x.d / 2 + 0.04, -x.d / 2 + 0.05, y0 + 0.19, y0 + 0.31, 0x2f6a3a); },
};

export const DRAWN_TYPES = Object.keys(DRAW);

// ---------------------------------------------------------------------------------------------------------
// The door leaf: a small geometry around its hinge (hinge at the left side of the door seen from outside),
// closed along the facade. interiors.js rotates the mesh about the hinge.
export function buildLeafGeometry(plan, baseY, color, shop, frameColor = 0x2a2b2d) {
  const { frame, door } = plan;
  const B = new GeoBuilder(3);
  const hinge = toWorld(frame, -door.w / 2, 0.1);
  const P = (a, v, y) => { const [x, z] = toWorld(frame, -door.w / 2 + a, 0.1 + v); return [x - hinge[0], baseY + y, z - hinge[1]]; };
  const du = [frame.tx, 0, frame.ty], dv = [-frame.nx, 0, -frame.ny];
  const t = 0.05, W = door.w - 0.04, Hh = door.h - 0.02;
  const face = (a0, a1, y0, y1, side, c, grp = G_SOLID) => B.quadOut(P(a0, side * t / 2, y0), P(a1, side * t / 2, y0), P(a1, side * t / 2, y1), P(a0, side * t / 2, y1), side > 0 ? dv : [-dv[0], 0, -dv[2]], c, grp);
  const edge = (a, y0, y1, side, c) => B.quadOut(P(a, -t / 2, y0), P(a, t / 2, y0), P(a, t / 2, y1), P(a, -t / 2, y1), side > 0 ? du : [-du[0], 0, -du[2]], c, G_SOLID);
  const top = (a0, a1, y1, c) => B.quadOut(P(a0, -t / 2, y1), P(a1, -t / 2, y1), P(a1, t / 2, y1), P(a0, t / 2, y1), [0, 1, 0], c, G_SOLID);
  if (shop) {
    // a glass door in a frame
    const f = 0.07;
    for (const s of [1, -1]) {
      face(0, f, 0.02, Hh, s, frameColor); face(W - f, W, 0.02, Hh, s, frameColor); face(f, W - f, 0.02, 0.2, s, frameColor); face(f, W - f, Hh - f, Hh, s, frameColor);
      face(f, W - f, 0.2, Hh - f, s, 0xcfe6f2, G_GLASS);
    }
    edge(0, 0.02, Hh, 1, frameColor); edge(W, 0.02, Hh, 1, frameColor); top(0, W, Hh, frameColor);
  } else {
    for (const s of [1, -1]) face(0, W, 0.02, Hh, s, s > 0 ? color : B_shade(color));
    edge(0, 0.02, Hh, 1, B_shade(color)); edge(W, 0.02, Hh, 1, B_shade(color)); top(0, W, Hh, B_shade(color));
    // a small window and a handle
    B.quadOut(P(W - 0.18, t / 2 + 0.002, 1.0), P(W - 0.1, t / 2 + 0.002, 1.0), P(W - 0.1, t / 2 + 0.002, 1.1), P(W - 0.18, t / 2 + 0.002, 1.1), dv, 0xd8d0b8, G_SOLID);
  }
  return { geometry: B.build(), hinge };
}
const B_shade = (hex) => shade(hex, 0.8);

// the item types the drawer knows must be the ones the generator places (interior_budget_test.mjs)
export { ITEM_TYPES };
