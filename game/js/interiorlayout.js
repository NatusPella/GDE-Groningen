// The layout generator of the interiors (epic Interieurs, #1150): hall rectangle + kind + seed in,
// a layout out: rooms, partition walls, furniture, spots for people and for the things you use, the
// ceiling lamps. Pure and deterministic: the same building gives the same interior on every client
// (Samen spelen: every player builds it locally from the seed, nothing goes over the net).
//
// Coordinates are the door frame of interiorframe.js: u along the facade, v into the building,
// y up. Everything is axis-aligned in that frame; an item is a box footprint (w across its front,
// d deep) facing one of four ways, so the collision is plain boxes (interiorwalk.js).
//
// Rules a layout keeps (interior_layout_test.mjs fuzzes them): every item lies inside the hall, none
// blocks the door, every spot of people and of use is reachable on foot from the door (0.3 m
// clearance), partition walls keep their doorways open.
import { mulberry32 } from './rng.js';
import { WINKEL } from './winkelkit.js';
import { KINDS } from './interiorkinds.js';

export const FACE = { DOOR: 0, E: 1, BACK: 2, W: 3 }; // the way the front of an item looks: toward the door wall, +u, the back wall, -u
export const CELL = 0.25;
export const PLAYER_R = 0.3;
export const PART_T = 0.12; // partition thickness
export const DOOR_CLEAR_D = 1.6; // free depth behind the door

// every item type the generator can place; interiorbuild3d.js draws each of them (the test keeps them equal)
export const ITEM_TYPES = [
  'shelf', 'gondola', 'counter', 'fridge', 'rack', 'booth', 'mirror', 'barber_chair', 'sink', 'bench', 'bike', 'workbench', 'bucket',
  'tvwall', 'showcase', 'cabinet', 'table', 'chair', 'stool', 'plant', 'crate', 'poster', 'desk', 'sofa', 'tv', 'bed', 'wardrobe',
  'kitchen', 'rug', 'floorlamp', 'pew', 'altar', 'pulpit', 'candle', 'organ', 'board', 'pillar', 'machine', 'bookcase', 'carlift',
  'tyres', 'barrel', 'toolwall', 'taps', 'coatrack', 'cubicle', 'copier', 'locker', 'flag', 'trolley', 'dartboard', 'bar',
];

// sizes of the footprint on the floor: face 0/2 look along v (width along u), 1/3 look along u
export const footprint = (it) => (it.face & 1 ? { su: it.d, sv: it.w } : { su: it.w, sv: it.d });
export const rectOf = (it) => { const { su, sv } = footprint(it); return { u0: it.u - su / 2, u1: it.u + su / 2, v0: it.v - sv / 2, v1: it.v + sv / 2 }; };
const overlap = (a, b, g = 0) => a.u0 < b.u1 + g && a.u1 > b.u0 - g && a.v0 < b.v1 + g && a.v1 > b.v0 - g;

// unit vector (du, dv) a face looks along
export const faceDir = (face) => [[0, -1], [1, 0], [0, 1], [-1, 0]][face & 3];

class Plan {
  constructor(hall, door, rnd, height, density) {
    this.hall = { ...hall };
    this.door = door; // { w, h }
    this.rnd = rnd;
    this.height = height;
    this.density = density;
    this.items = [];
    this.walls = [];    // partition boxes { u0, u1, v0, v1, h }
    this.openings = []; // doorways in partitions { u, v, w, axis: 'u'|'v', h }
    this.rooms = [];
    this.npc = [];
    this.use = [];      // spots of use { id, u, v, r, face }
    this.lamps = [];
    this.reserved = [{ u0: -door.w / 2 - 0.5, u1: door.w / 2 + 0.5, v0: hall.v0 - 0.5, v1: hall.v0 + DOOR_CLEAR_D }];
  }

  get W() { return this.hall.u1 - this.hall.u0; }
  get D() { return this.hall.v1 - this.hall.v0; }
  pick(list) { return list[Math.floor(this.rnd() * list.length)]; }
  chance(p) { return this.rnd() < p * this.density; }

  fits(r, zone = this.hall, gap = 0.04, deco = null) {
    if (r.u0 < zone.u0 - 1e-6 || r.u1 > zone.u1 + 1e-6 || r.v0 < zone.v0 - 1e-6 || r.v1 > zone.v1 + 1e-6) return false;
    if (r.u0 < this.hall.u0 - 1e-6 || r.u1 > this.hall.u1 + 1e-6 || r.v0 < this.hall.v0 - 1e-6 || r.v1 > this.hall.v1 + 1e-6) return false;
    for (const q of this.reserved) if (overlap(r, q)) return false;
    for (const w of this.walls) if (overlap(r, w)) return false;
    if (deco && deco.floor) return true; // a rug lies under everything
    for (const it of this.items) {
      if (!it.solid || !overlap(r, rectOf(it), deco ? 0 : gap)) continue;
      if (deco && it.h < deco.y0 - 0.05) continue; // hangs above the furniture
      return false;
    }
    return true;
  }

  // add an item; null when it does not fit. Defaults: solid, height 1.
  add(type, u, v, w, d, face, props = {}, zone = this.hall) {
    const it = { type, u, v, w, d, h: 1, face, solid: true, ...props };
    const deco = it.solid ? null : (it.y0 === undefined ? { floor: true } : { y0: it.y0 });
    if (!this.fits(rectOf(it), zone, 0.04, deco)) return null;
    this.items.push(it);
    return it;
  }

  // flush against a wall of a zone; `along` is u (back/front) or v (left/right) of the centre
  onWall(zone, side, type, along, w, d, props = {}) {
    let u, v, face;
    if (side === 'back') { v = zone.v1 - d / 2; u = along; face = FACE.DOOR; }
    else if (side === 'front') { v = zone.v0 + d / 2; u = along; face = FACE.BACK; }
    else if (side === 'left') { u = zone.u0 + d / 2; v = along; face = FACE.E; }
    else { u = zone.u1 - d / 2; v = along; face = FACE.W; }
    return this.add(type, u, v, w, d, face, props, zone);
  }

  // a run of units along a wall between two coordinates
  run(zone, side, type, w, d, from, to, props = {}, gap = 0.04, skip = 0) {
    const out = [];
    for (let a = from + w / 2; a <= to - w / 2 + 1e-6; a += w + gap) {
      if (skip && this.rnd() < skip) continue;
      const p = typeof props === 'function' ? props(out.length) : props;
      const it = this.onWall(zone, side, type, a, w, d, p);
      if (it) out.push(it);
    }
    return out;
  }

  zoneOf(u0, u1, v0, v1) { return { u0, u1, v0, v1 }; }

  // a partition wall across a zone with a doorway; axis 'u' = a wall at fixed v along u
  partition(axis, at, from, to, doorAt, doorW = 1.0, h = this.height) {
    const t = PART_T / 2;
    const seg = (a, b) => {
      if (b - a < 0.05) return;
      this.walls.push(axis === 'u' ? { u0: a, u1: b, v0: at - t, v1: at + t, h } : { u0: at - t, u1: at + t, v0: a, v1: b, h });
    };
    seg(from, doorAt - doorW / 2);
    seg(doorAt + doorW / 2, to);
    this.openings.push(axis === 'u' ? { u: doorAt, v: at, w: doorW, axis, h: 2.1 } : { u: at, v: doorAt, w: doorW, axis, h: 2.1 });
    const c = axis === 'u' ? { u0: doorAt - doorW / 2 - 0.35, u1: doorAt + doorW / 2 + 0.35, v0: at - 0.9, v1: at + 0.9 } : { u0: at - 0.9, u1: at + 0.9, v0: doorAt - doorW / 2 - 0.35, v1: doorAt + doorW / 2 + 0.35 };
    this.reserved.push(c);
    // whatever was placed in the wall or in the doorway before the partition is taken away
    const wallsNow = axis === 'u' ? [{ u0: from, u1: doorAt - doorW / 2, v0: at - t, v1: at + t }, { u0: doorAt + doorW / 2, u1: to, v0: at - t, v1: at + t }] : [{ u0: at - t, u1: at + t, v0: from, v1: doorAt - doorW / 2 }, { u0: at - t, u1: at + t, v0: doorAt + doorW / 2, v1: to }];
    this.items = this.items.filter((it) => !it.solid || !(overlap(rectOf(it), c) || wallsNow.some((w) => overlap(rectOf(it), w))));
  }

  npcAt(role, u, v, face, pose = 'stand', extra = {}) { this.npc.push({ role, u, v, face, pose, ...extra }); }
  useAt(id, u, v, r = 1.1, extra = {}) { this.use.push({ id, u, v, r, ...extra }); }
}

// --- recipes ---------------------------------------------------------------------------------------------

const lampGrid = (p) => {
  const nu = Math.max(1, Math.round(p.W / 3.6)), nv = Math.max(1, Math.round(p.D / 3.6));
  for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) p.lamps.push([p.hall.u0 + (i + 0.5) * p.W / nu, p.hall.v0 + (k + 0.5) * p.D / nv]);
};

// a loose customer or guest on a free spot of the floor (not in front of the door)
function scatterPeople(p, role, n, pose = 'stand', margin = 0.9) {
  let tries = 0;
  while (n > 0 && tries++ < 40) {
    const u = p.hall.u0 + margin + p.rnd() * (p.W - 2 * margin), v = p.hall.v0 + 1.8 + p.rnd() * Math.max(0.1, p.D - 2.6);
    const r = { u0: u - 0.35, u1: u + 0.35, v0: v - 0.35, v1: v + 0.35 };
    if (!p.fits(r) || p.npc.some((q) => Math.hypot(q.u - u, q.v - v) < 1.4)) continue;
    p.npcAt(role, u, v, Math.floor(p.rnd() * 4), pose);
    n--;
  }
}

const SERVICE = new Set(['bakker', 'slager', 'snackbar', 'bloemist', 'kapper', 'kiosk']);

function shopRecipe(p, sub) {
  const T = WINKEL[sub] || WINKEL.tweedehands;
  const H = p.hall, W = p.W, D = p.D;
  const shelfH = 1.2 + T.row * 0.9;
  const accent = T.accent;
  const service = SERVICE.has(sub) || D < 5;
  let counterZoneBack = null;
  if (service) {
    // a service counter across the room, the shop-keeper behind it, the wares on the back wall
    const cw = Math.min(W - 1.6, Math.max(2.2, W * 0.55));
    const cv = H.v1 - Math.min(2.3, Math.max(1.7, D * 0.35));
    const cu = H.u0 + W / 2 + (p.rnd() - 0.5) * Math.max(0, W - cw - 1.2);
    const counter = p.add('counter', cu, cv, cw, 0.7, FACE.DOOR, { h: T.counter[0] || 1, color: T.accent, glass: sub === 'bakker' || sub === 'slager' }, p.hall);
    if (counter) {
      counterZoneBack = counter;
      p.npcAt('winkelier', cu, (cv + 0.35 + H.v1) / 2, FACE.DOOR, 'stand');
      p.useAt('kopen', cu, cv - 0.35 - 0.7, 1.4, { face: FACE.BACK, target: sub });
    }
    // wares along the back wall behind the counter and along the side wall
    p.run(H, 'back', 'shelf', 1.0, 0.45, H.u0, H.u1, { h: shelfH, color: T.accent, row: T.row });
    if (sub === 'kapper') {
      p.run(H, 'left', 'mirror', 1.6, 0.1, H.v0 + 1.8, H.v1 - 2.5, { h: 1.5, solid: false, y0: 0.9 });
      for (let v = H.v0 + 2.4; v < H.v1 - 3.2; v += 1.6) p.add('barber_chair', H.u0 + 1.2, v, 0.7, 0.8, FACE.W, { h: 1.0 });
      p.add('sink', H.u1 - 0.5, H.v1 - 1.2, 0.6, 0.5, FACE.W, { h: 0.9 });
      p.add('bench', H.u1 - 0.45, H.v0 + 2.6, 1.6, 0.5, FACE.W, { h: 0.45 });
    } else if (sub === 'bloemist') {
      for (let i = 0; i < 3; i++) p.add('bucket', H.u0 + 0.7 + i * 0.9, H.v0 + 2 + (i % 2) * 0.6, 0.6, 0.6, FACE.DOOR, { h: 0.8, color: [0xd8508a, 0xf0c030, 0xf2f2f2][i] });
      p.add('table', H.u1 - 0.8, H.v0 + 2.6, 1.4, 0.8, FACE.W, { h: 0.9 });
    } else if (sub === 'snackbar') {
      p.add('fridge', H.u0 + 0.5, H.v1 - 1.0, 0.8, 0.7, FACE.E, { h: 1.9, color: 0x6a6f73, tag: 'frituur' });
      p.add('table', H.u1 - 0.5, H.v0 + 2.2, 0.7, 0.7, FACE.W, { h: 1.1 });
      p.add('poster', 0, H.v1 - 0.02, 2.4, 0.04, FACE.DOOR, { h: 1.2, y0: 1.5, solid: false, color: 0xf2c24a, tag: 'menu' });
    } else if (sub === 'bakker' || sub === 'slager') {
      p.run(H, 'right', 'showcase', 1.2, 0.6, H.v0 + 1.8, H.v1 - 2.4, { h: 1.2, color: T.accent });
    } else if (sub === 'kiosk') {
      p.run(H, 'left', 'rack', 0.9, 0.35, H.v0 + 1.8, H.v1 - 2.2, { h: 1.7, color: T.accent });
    }
  } else {
    // self-service: a cash desk by the door at one side wall, wares on the walls and in the middle
    const sideLeft = p.rnd() < 0.5;
    const cl = Math.min(2.6, Math.max(1.6, D * 0.3));
    const cv = H.v0 + 1.4 + cl / 2;
    const cu = sideLeft ? H.u0 + 1.5 : H.u1 - 1.5;
    const counter = p.add('counter', cu, cv, cl, 0.7, sideLeft ? FACE.E : FACE.W, { h: T.counter[0] || 1, color: T.accent }, p.hall);
    if (counter) {
      p.npcAt('winkelier', sideLeft ? H.u0 + 0.5 : H.u1 - 0.5, cv, sideLeft ? FACE.E : FACE.W, 'stand');
      p.useAt('kopen', sideLeft ? cu + 0.35 + 0.8 : cu - 0.35 - 0.8, cv, 1.4, { face: sideLeft ? FACE.W : FACE.E, target: sub });
      counterZoneBack = counter;
    }
    const wareFrom = H.v0 + (counter ? cl + 2.0 : 1.6);
    if (sub === 'kleding') p.add('booth', sideLeft ? H.u1 - 0.7 : H.u0 + 0.7, H.v1 - 1.2, 1.2, 1.2, sideLeft ? FACE.W : FACE.E, { h: 2.2, color: T.accent, tag: 'paskamer' });
    if (sub === 'elektronica') p.run(H, 'back', 'tvwall', 1.4, 0.15, H.u0 + 0.5, H.u1 - 0.5, { h: 1.0, y0: 1.5, solid: false, color: T.accent });
    p.run(H, 'back', 'shelf', 1.0, 0.45, H.u0, H.u1, { h: sub === 'elektronica' ? 1.3 : shelfH, color: T.accent, row: T.row }, 0.04, 0.08);
    p.run(H, sideLeft ? 'right' : 'left', 'shelf', 1.0, 0.45, wareFrom, H.v1 - 0.6, { h: shelfH, color: T.accent, row: T.row }, 0.04, 0.08);
    if (sub === 'supermarkt' || sub === 'souvenir') for (let i = 0; i < 2; i++) p.add('crate', H.u0 + W * (0.3 + 0.4 * p.rnd()), H.v0 + 1.8 + p.rnd() * 0.6, 0.6, 0.4, FACE.DOOR, { h: 0.45, color: [0xf0a030, 0x5fa040, 0xd03a30][Math.floor(p.rnd() * 3)] });
    if (sub === 'supermarkt') {
      p.run(H, sideLeft ? 'left' : 'right', 'fridge', 1.1, 0.7, H.v0 + 4.2, H.v1 - 0.6, { h: 2.0, color: 0xcfd8de });
      for (let i = 0; i < 3; i++) p.add('trolley', (sideLeft ? H.u1 - 0.7 : H.u0 + 0.7), H.v0 + 0.9 + i * 0.1, 0.5, 0.9, FACE.DOOR, { h: 1.0, solid: true });
    }
    if (sub === 'kleding') {
      p.add('mirror', sideLeft ? H.u1 - 0.06 : H.u0 + 0.06, H.v1 - 2.6, 0.9, 0.06, sideLeft ? FACE.W : FACE.E, { h: 1.7, y0: 0.2, solid: false });
    }
    if (sub === 'fietsen') {
      for (let v = H.v0 + 3; v < H.v1 - 1.2; v += 1.1) p.add('bike', sideLeft ? H.u1 - 0.45 : H.u0 + 0.45, v, 1.7, 0.6, sideLeft ? FACE.W : FACE.E, { h: 1.0, color: T.accent });
      p.add('workbench', H.u0 + W / 2, H.v1 - 0.5, 2.2, 0.7, FACE.DOOR, { h: 1.0 });
    }
    // islands (the shop table of winkelkit: island [w, h]) in rows down the middle
    const iw = (T.island[0] || 0) * (0.85 + p.rnd() * 0.3), ih = T.island[1] || 0;
    if (iw > 0.2) {
      const mu = H.u0 + W / 2 + (p.rnd() - 0.5) * Math.max(0, W - 6) * 0.4;
      for (let v = wareFrom + 0.3 + p.rnd() * 0.6; v < H.v1 - 1.9; v += 2.5 + p.rnd() * 0.4) {
        const n = W >= 7.5 && iw < 2.2 ? 2 : 1;
        for (let k = 0; k < n; k++) p.add('gondola', mu + (n === 1 ? 0 : (k - 0.5) * 2.8), v, iw, 0.7, FACE.DOOR, { h: ih, color: T.accent, row: T.row, items: T.items });
      }
    }
  }
  void counterZoneBack;
  // loose customers
  scatterPeople(p, 'klant', Math.min(3, Math.floor(p.W * p.D / 28)) * (p.rnd() < 0.8 ? 1 : 0));
  p.palette = { wall: T.wall, floor: T.floor, floorPattern: T.floorPattern, accent: T.accent, ceil: 0xf2efe8, sign: T.sign };
}

function horecaRecipe(p, sub) {
  const H = p.hall, W = p.W, D = p.D;
  const dark = sub === 'kroeg';
  // the bar along the left or right wall, the keeper behind it
  const left = p.rnd() < 0.5;
  const bl = Math.min(D - 3.2, Math.max(2.4, D * 0.55)), b0 = H.v1 - 0.6 - bl;
  const bu = left ? H.u0 + 1.55 : H.u1 - 1.55;
  const bar = p.add('bar', bu, b0 + bl / 2, bl, 0.7, left ? FACE.E : FACE.W, { h: 1.1, color: dark ? 0x4a3322 : 0x8a6440 }, H);
  if (bar) {
    p.run(H, left ? 'left' : 'right', 'taps', 1.0, 0.4, b0, b0 + bl, { h: 1.8, solid: true });
    p.npcAt('barman', left ? H.u0 + 0.95 : H.u1 - 0.95, b0 + bl / 2, left ? FACE.E : FACE.W, 'stand');
    p.useAt('bestellen', left ? bu + 0.35 + 0.7 : bu - 0.35 - 0.7, b0 + bl / 2, 1.5, { face: left ? FACE.W : FACE.E, target: sub });
    for (let v = b0 + 0.4; v < b0 + bl - 0.2; v += 0.8) p.add('stool', left ? bu + 0.35 + 0.45 : bu - 0.35 - 0.45, v, 0.4, 0.4, FACE.DOOR, { h: 0.7 });
  }
  // tables on the free side
  const x0 = left ? H.u0 + 3.3 : H.u0 + 0.9, x1 = left ? H.u1 - 0.9 : H.u1 - 3.3;
  const seats = [];
  for (let v = H.v0 + 2.0; v < H.v1 - 1.2; v += 2.0) {
    for (let u = x0 + 0.9; u <= x1 - 0.5; u += 2.1) {
      if (!p.chance(0.9)) continue;
      const t = p.add('table', u, v, 0.8, 0.8, FACE.DOOR, { h: 0.75, round: p.rnd() < 0.5 });
      if (!t) continue;
      for (const [du, dv, face] of [[-0.65, 0, FACE.E], [0.65, 0, FACE.W], [0, 0.6, FACE.DOOR], [0, -0.6, FACE.BACK]]) {
        if (!p.chance(0.75)) continue;
        const c = p.add('chair', u + du, v + dv, 0.42, 0.42, face, { h: 0.9 });
        if (c) seats.push(c);
      }
    }
  }
  if (sub === 'kroeg') p.add('dartboard', 0, H.v1 - 0.03, 0.5, 0.06, FACE.DOOR, { h: 0.5, y0: 1.6, solid: false });
  else p.add('poster', H.u0 + W / 2, H.v1 - 0.02, 1.4, 0.04, FACE.DOOR, { h: 0.9, y0: 1.5, solid: false, color: 0xe8d9b0 });
  // restaurants and cafes: a kitchen door at the back
  if (sub !== 'kroeg' && D >= 7 && W >= 5) {
    const kv = H.v1 - 2.2;
    p.partition('u', kv, p.hall.u0, p.hall.u1, left ? H.u1 - 1.6 : H.u0 + 1.6, 1.0);
    p.rooms.push({ id: 'keuken', role: 'keuken', u0: H.u0, u1: H.u1, v0: kv + PART_T / 2, v1: H.v1 });
  }
  seats.slice(0, 4).forEach((c, i) => { if (p.rnd() < 0.7) p.npcAt('gast', c.u, c.v, c.face, 'sit', { seat: i }); });
  p.palette = { wall: dark ? 0x6b4a32 : 0xe9dcc2, floor: dark ? 0x3a2a1e : 0x9a7a52, floorPattern: 0, accent: dark ? 0xb8402a : 0xd0652a, ceil: dark ? 0x3a2a22 : 0xf0e6d4 };
}

function officeRecipe(p) {
  const H = p.hall, W = p.W, D = p.D;
  // reception: a desk near the entrance
  const ru = H.u0 + W * (0.3 + p.rnd() * 0.4);
  const rec = p.add('counter', ru, H.v0 + 2.2, Math.min(3, W - 1.6), 0.7, FACE.DOOR, { h: 1.1, color: 0x3a4a5a }, H);
  if (rec) { p.npcAt('receptionist', ru, H.v0 + 2.2 + 0.35 + 0.4, FACE.DOOR, 'stand'); p.useAt('balie', ru, H.v0 + 2.2 - 0.35 - 0.8, 1.4, { face: FACE.BACK }); }
  // a meeting room at the back (glass wall) when there is space
  let work = { ...H, v0: H.v0 + 3.4 };
  if (D >= 9 && W >= 5) {
    const mv = H.v1 - 3.4;
    p.partition('u', mv, H.u0, H.u1, H.u0 + W * 0.7, 1.0, p.height);
    p.rooms.push({ id: 'vergaderkamer', role: 'vergaderen', u0: H.u0, u1: H.u1, v0: mv + PART_T / 2, v1: H.v1 });
    p.add('table', H.u0 + W / 2, (mv + H.v1) / 2 + 0.2, Math.min(3.2, W - 2), 1.2, FACE.DOOR, { h: 0.75 }, p.zoneOf(H.u0, H.u1, mv, H.v1));
    work.v1 = mv - PART_T / 2;
  }
  const seatsAt = [];
  for (let v = work.v0 + 0.9; v < work.v1 - 1.5; v += 2.4) {
    for (let u = H.u0 + 1.2; u < H.u1 - 1.6; u += 2.2) {
      if (!p.chance(0.85)) continue;
      const d = p.add('desk', u, v, 1.5, 0.8, FACE.DOOR, { h: 0.75 }, work);
      if (!d) continue;
      const c = p.add('chair', u, v + 0.75, 0.5, 0.5, FACE.BACK, { h: 0.9 }, work);
      if (c) seatsAt.push(c);
    }
  }
  p.add('copier', H.u1 - 0.5, work.v1 - 0.5, 0.8, 0.7, FACE.W, { h: 1.1 }, work);
  p.add('plant', H.u0 + 0.5, H.v0 + 0.6, 0.6, 0.6, FACE.DOOR, { h: 1.2 });
  p.add('plant', H.u1 - 0.5, H.v0 + 0.6, 0.6, 0.6, FACE.DOOR, { h: 1.2 });
  p.add('cabinet', H.u0 + 0.3, H.v0 + 3.4 + 0.8, 1.2, 0.5, FACE.E, { h: 1.9 }, work);
  seatsAt.slice(0, 3).forEach((c, i) => p.npcAt('medewerker', c.u, c.v, c.face, 'sit', { seat: i }));
  p.palette = { wall: 0xe2e5e9, floor: 0x5a6068, floorPattern: 1, accent: 0x3a6ad8, ceil: 0xf4f5f7 };
}

function homeRecipe(p) {
  const H = p.hall, W = p.W, D = p.D;
  const look = p.look || {};
  const living = { ...H, v1: H.v0 + Math.max(3.2, D * 0.55) };
  const back = D >= 7.5;
  if (back) {
    // a partition between the living room and the back, a doorway at about 30% of the width
    const pv = living.v1;
    p.partition('u', pv, H.u0, H.u1, H.u0 + Math.max(1.2, W * (0.25 + p.rnd() * 0.3)), 0.95);
    living.v1 = pv - PART_T / 2;
    p.rooms.push({ id: 'woonkamer', role: 'wonen', u0: H.u0, u1: H.u1, v0: H.v0, v1: living.v1 });
  }
  const ft = look.furniture ?? Math.floor(p.rnd() * 3); // 0 sofa, 1 bookcase, 2 table: what the window shows
  // the living room: sofa + tv on the long axis
  const tvU = H.u0 + W * (0.3 + p.rnd() * 0.4);
  const bv = living.v1;
  p.add('tv', tvU, bv - 0.25, 1.1, 0.4, FACE.DOOR, { h: 0.9, solid: true }, living);
  p.add('sofa', tvU, bv - 2.6, 2.0, 0.9, FACE.BACK, { h: 0.85, color: p.pickFabric }, living);
  p.add('rug', tvU, bv - 1.6, 2.4, 2.2, FACE.DOOR, { h: 0.02, solid: false, color: p.pickFabric2 }, living);
  p.add('table', tvU, bv - 1.55, 1.0, 0.6, FACE.DOOR, { h: 0.42 }, living);
  if (ft === 1 || p.chance(0.6)) p.run(living, 'left', 'bookcase', 1.0, 0.35, living.v0 + 2.2, living.v1 - 0.6, { h: 2.0 }, 0.04, 0.3);
  if (ft === 2 || p.chance(0.4)) p.add('table', H.u1 - 0.9, living.v0 + 3, 1.0, 1.0, FACE.DOOR, { h: 0.75 }, living);
  p.add('floorlamp', H.u1 - 0.4, bv - 0.5, 0.4, 0.4, FACE.DOOR, { h: 1.7 }, living);
  if (W >= 6 && D >= 9) p.add('cubicle', H.u0 + 0.7, H.v0 + 0.85, 1.2, 1.4, FACE.E, { h: 2.2, tag: 'wc' }, living);
  p.add('plant', H.u0 + 0.5, living.v0 + 0.8, 0.6, 0.6, FACE.DOOR, { h: 1.2 }, living);
  p.add('coatrack', H.u1 - 0.3, H.v0 + 0.5, 0.4, 0.3, FACE.W, { h: 1.7, solid: true });
  if (back) {
    const zone = { ...H, v0: living.v1 + PART_T };
    p.rooms.push({ id: 'keuken', role: 'keuken', u0: zone.u0, u1: zone.u1, v0: zone.v0, v1: zone.v1 });
    p.run(zone, 'back', 'kitchen', 0.9, 0.6, zone.u0 + 0.2, Math.min(zone.u1 - 0.2, zone.u0 + 4.2), { h: 0.9, color: 0xdad6cc });
    p.add('fridge', zone.u0 + 0.5, zone.v1 - 0.9, 0.7, 0.7, FACE.DOOR, { h: 1.8, color: 0xe4e6e8 }, zone);
    const tu = zone.u0 + W * 0.5, tv = zone.v0 + Math.min(1.8, (zone.v1 - zone.v0) * 0.5);
    const t = p.add('table', tu, tv, 1.4, 0.9, FACE.DOOR, { h: 0.75 }, zone);
    if (t) for (const du of [-0.5, 0.5]) { p.add('chair', tu + du, tv - 0.7, 0.42, 0.42, FACE.BACK, { h: 0.9 }, zone); p.add('chair', tu + du, tv + 0.7, 0.42, 0.42, FACE.DOOR, { h: 0.9 }, zone); }
    // a bedroom when there is a second wing
    if (W >= 6.2 && zone.v1 - zone.v0 >= 3) {
      const mu = zone.u0 + W * 0.58;
      p.partition('v', mu, zone.v0, zone.v1, zone.v0 + 1.2, 0.9);
      p.rooms.push({ id: 'slaapkamer', role: 'slapen', u0: mu + PART_T / 2, u1: H.u1, v0: zone.v0, v1: zone.v1 });
      const bz = { ...zone, u0: mu + PART_T / 2 };
      p.add('bed', bz.u1 - 1.1, bz.v1 - 1.1, 2.0, 1.6, FACE.W, { h: 0.55, color: p.pickFabric }, bz);
      p.add('wardrobe', bz.u0 + 0.8, bz.v1 - 0.4, 1.4, 0.55, FACE.DOOR, { h: 2.1 }, bz);
      p.add('cabinet', bz.u1 - 0.3, bz.v0 + 0.9, 0.5, 0.4, FACE.W, { h: 0.5 }, bz);
    }
    if (p.chance(0.5)) p.npcAt('bewoner', zone.u0 + W * 0.3, zone.v0 + 1.0, FACE.BACK, 'stand');
  } else if (p.chance(0.5)) {
    p.npcAt('bewoner', tvU, bv - 2.6, FACE.BACK, 'sit');
  }
  p.useAt('rondkijken', H.u0 + W / 2, H.v0 + 2.0, 1.4, { face: FACE.BACK });
  p.palette = { wall: look.wall ?? 0xe8dcc4, floor: look.floor ?? 0x9a7448, floorPattern: 2, accent: look.accent ?? 0x8a3a3a, ceil: 0xf4f0e8 };
}

function churchRecipe(p) {
  const H = p.hall, W = p.W, D = p.D;
  const mid = H.u0 + W / 2, aisle = 1.4;
  // altar and pulpit at the far end
  p.add('altar', mid, H.v1 - 1.0, 1.8, 0.9, FACE.DOOR, { h: 1.1 });
  p.add('pulpit', H.u0 + 1.0, H.v1 - 3.0, 0.9, 0.9, FACE.E, { h: 1.0 });
  if (W >= 9) p.add('organ', H.u1 - 2.0, H.v1 - 0.6, 3.6, 0.7, FACE.DOOR, { h: 4.5 });
  // pews in two blocks with a central aisle
  const blockW = Math.min(3.6, (W - aisle - 1.4) / 2);
  for (let v = H.v0 + 3.0; v < H.v1 - 4.2; v += 1.15) {
    p.add('pew', mid - aisle / 2 - blockW / 2, v, blockW, 0.7, FACE.BACK, { h: 0.9 });
    p.add('pew', mid + aisle / 2 + blockW / 2, v, blockW, 0.7, FACE.BACK, { h: 0.9 });
  }
  for (let i = 0; i < 3; i++) p.add('candle', H.u0 + 0.5, H.v0 + 3 + i * 3, 0.3, 0.3, FACE.E, { h: 1.3, glow: true });
  p.npcAt('koster', mid + 1.4, H.v1 - 2.6, FACE.DOOR, 'stand');
  scatterPeople(p, 'bezoeker', Math.min(2, Math.floor(W * D / 70)), 'sit');
  p.useAt('kaars', H.u0 + 1.2, H.v0 + 3, 1.2, { face: FACE.W });
  p.palette = { wall: 0xe2d8c4, floor: 0x8e8a82, floorPattern: 2, accent: 0xc9a04a, ceil: 0xd8cfbc };
}

function stationRecipe(p, sub) {
  const H = p.hall, W = p.W, D = p.D;
  const n = Math.max(1, Math.min(3, Math.floor(W / 3.2)));
  for (let i = 0; i < n; i++) {
    const u = H.u0 + (i + 0.5) * W / (n + 0.0);
    const c = p.add('counter', u, H.v1 - 1.2, 2.0, 0.7, FACE.DOOR, { h: 1.1, glass: true, color: 0x2f4f8a }, H);
    if (c && i < 2) { p.npcAt('loketmedewerker', u, H.v1 - 0.55, FACE.DOOR, 'stand'); if (i === 0) p.useAt('kaartje', u, H.v1 - 2.2, 1.4, { face: FACE.BACK }); }
  }
  p.add('board', H.u0 + W / 2, H.v1 - 0.05, Math.min(5, W - 1), 0.1, FACE.DOOR, { h: 0.9, y0: 2.4, solid: false, glow: true });
  p.run(H, 'left', 'machine', 0.8, 0.5, H.v0 + 2.4, H.v0 + 5.6, { h: 1.7, color: 0x2f4f8a }, 0.3);
  const sw = Math.min(2.0, W * 0.22);
  for (let v = H.v0 + 2.6; v < H.v1 - 3.4; v += 2.4) {
    p.add('bench', H.u0 + W * 0.3, v, sw, 0.5, FACE.DOOR, { h: 0.45 });
    p.add('bench', H.u0 + W * 0.7, v, sw, 0.5, FACE.DOOR, { h: 0.45 });
  }
  if (W >= 10) { p.add('pillar', H.u0 + W * 0.2, H.v0 + D * 0.5, 0.7, 0.7, FACE.DOOR, { h: p.height }); p.add('pillar', H.u0 + W * 0.8, H.v0 + D * 0.5, 0.7, 0.7, FACE.DOOR, { h: p.height }); }
  scatterPeople(p, 'reiziger', Math.min(4, 1 + Math.floor(W * D / 60)));
  p.palette = { wall: 0xe6e2d6, floor: 0xb8b4a8, floorPattern: 1, accent: 0x2f4f8a, ceil: 0xf1efe8 };
  void sub;
}

function libraryRecipe(p) {
  const H = p.hall, W = p.W, D = p.D;
  const desk = p.add('counter', H.u0 + 2.2, H.v0 + 2.0, 2.4, 0.7, FACE.BACK, { h: 1.1, color: 0x6a4a2e }, H);
  if (desk) { p.npcAt('bibliothecaris', H.u0 + 2.2, H.v0 + 2.0 - 0.35 - 0.4, FACE.BACK, 'stand'); p.useAt('balie', H.u0 + 2.2, H.v0 + 2.0 + 0.35 + 0.8, 1.4, { face: FACE.DOOR }); }
  p.run(H, 'back', 'bookcase', 1.0, 0.4, H.u0, H.u1, { h: 2.3 });
  p.run(H, 'left', 'bookcase', 1.0, 0.4, H.v0 + 4, H.v1 - 0.4, { h: 2.3 });
  p.run(H, 'right', 'bookcase', 1.0, 0.4, H.v0 + 4, H.v1 - 0.4, { h: 2.3 });
  for (let v = H.v0 + 4.8; v < H.v1 - 2.2; v += 2.8) {
    for (let u = H.u0 + 2.4; u <= H.u1 - 2.4; u += 3.4) p.add('bookcase', u, v, 2.2, 0.7, FACE.DOOR, { h: 1.9, double: true });
  }
  const seats = [];
  for (let u = H.u0 + 3.4; u < H.u1 - 1.2; u += 2.4) {
    const t = p.add('table', u, H.v0 + 2.2, 1.6, 0.9, FACE.DOOR, { h: 0.75 });
    if (t) { const c = p.add('chair', u, H.v0 + 2.2 + 0.75, 0.45, 0.45, FACE.BACK, { h: 0.9 }); if (c) seats.push(c); }
  }
  seats.slice(0, 2).forEach((c, i) => p.npcAt('lezer', c.u, c.v, c.face, 'sit', { seat: i }));
  p.useAt('lezen', H.u0 + W / 2, H.v0 + 3.2, 1.6, { face: FACE.BACK });
  p.palette = { wall: 0xece4d2, floor: 0x7a5a3c, floorPattern: 0, accent: 0x2f6a3a, ceil: 0xf4efe4 };
}

function garageRecipe(p, sub) {
  const H = p.hall, W = p.W, D = p.D;
  const lu = H.u0 + W * 0.5;
  p.add('carlift', lu, H.v0 + D * 0.55, 2.4, 4.4, FACE.DOOR, { h: 1.6, color: [0x2f6fb8, 0xc2423a, 0xe0e0dc, 0x3a3c3e][Math.floor(p.rnd() * 4)] });
  p.run(H, 'back', 'toolwall', 1.2, 0.2, H.u0 + 0.4, H.u1 - 0.4, { h: 2.0, solid: false, y0: 0.9 });
  p.run(H, 'back', 'workbench', 1.6, 0.7, H.u0 + 0.4, H.u1 - 2.0, { h: 0.95 });
  p.add('tyres', H.u1 - 0.6, H.v0 + 2.4, 0.9, 0.9, FACE.W, { h: 1.1 });
  p.add('barrel', H.u0 + 0.5, H.v0 + 2.2, 0.6, 0.6, FACE.DOOR, { h: 0.9, color: 0x2f6a8a });
  p.add('barrel', H.u0 + 0.5, H.v0 + 3.0, 0.6, 0.6, FACE.DOOR, { h: 0.9, color: 0xc2423a });
  const c = p.add('counter', H.u1 - 1.6, H.v0 + 1.6, 1.8, 0.6, FACE.W, { h: 1.05, color: 0x3a3c3e });
  if (c) { p.npcAt('monteur', lu + 2, H.v0 + D * 0.55, FACE.W, 'stand'); p.useAt('balie', H.u1 - 1.6 - 0.3 - 0.9, H.v0 + 1.6, 1.4, { face: FACE.E, target: sub }); }
  p.palette = { wall: 0xcfd2d4, floor: 0x6a6c6e, floorPattern: 0, accent: 0xc98a16, ceil: 0xb8bcc0 };
}

function publicRecipe(p, sub) {
  const H = p.hall, W = p.W, D = p.D;
  const n = Math.max(1, Math.min(3, Math.floor((W - 1) / 2.6)));
  for (let i = 0; i < n; i++) {
    const u = H.u0 + (i + 0.5) * W / n;
    const c = p.add('counter', u, H.v1 - 2.0, Math.min(2.2, W / n - 0.5), 0.7, FACE.DOOR, { h: 1.1, glass: sub === 'politie', color: sub === 'politie' ? 0x2a3f6a : sub === 'apotheek' ? 0x2e9a5a : 0x6a5a48 }, H);
    if (c) { p.npcAt('baliemedewerker', u, H.v1 - 2.0 + 0.35 + 0.45, FACE.DOOR, 'stand'); if (i === 0) p.useAt('balie', u, H.v1 - 2.0 - 0.35 - 0.8, 1.4, { face: FACE.BACK, target: sub }); }
  }
  p.run(H, 'back', sub === 'apotheek' ? 'shelf' : 'cabinet', 1.0, 0.45, H.u0, H.u1, { h: 2.0, color: 0x2e9a5a });
  const bw = Math.min(2.0, W * 0.28);
  for (let v = H.v0 + 2.6; v < H.v1 - 3.6; v += 2.2) {
    p.add('bench', H.u0 + W * 0.25, v, bw, 0.5, FACE.BACK, { h: 0.45 });
    p.add('bench', H.u0 + W * 0.75, v, bw, 0.5, FACE.BACK, { h: 0.45 });
  }
  if (sub === 'school') p.run(H, 'left', 'locker', 0.5, 0.5, H.v0 + 2, H.v1 - 3, { h: 1.9 }, 0.02);
  if (sub === 'hotel') { p.add('sofa', H.u0 + 1.4, H.v0 + 3.4, 1.8, 0.9, FACE.E, { h: 0.85 }); p.add('plant', H.u1 - 0.5, H.v0 + 1.4, 0.6, 0.6, FACE.W, { h: 1.2 }); }
  if (sub === 'politie') p.add('flag', H.u1 - 0.4, H.v1 - 0.5, 0.2, 0.2, FACE.W, { h: 2.4 });
  p.add('plant', H.u0 + 0.5, H.v0 + 0.8, 0.6, 0.6, FACE.DOOR, { h: 1.2 });
  scatterPeople(p, 'bezoeker', Math.min(2, Math.floor(W * D / 40)), 'sit');
  p.palette = { wall: sub === 'politie' ? 0xdfe6ee : 0xe8e4da, floor: 0x8a8e92, floorPattern: 1, accent: sub === 'politie' ? 0x2a3f6a : 0x6a5a48, ceil: 0xf4f4f2 };
}

const RECIPES = { winkel: shopRecipe, horeca: horecaRecipe, kantoor: officeRecipe, woning: homeRecipe, kerk: churchRecipe, station: stationRecipe, bibliotheek: libraryRecipe, garage: garageRecipe, publiek: publicRecipe };

// --- reachability ----------------------------------------------------------------------------------------

// Grid of the hall: a cell is walkable when a 0.3 m circle fits (clear of the walls and of every solid).
export function walkGrid(layout) {
  const H = layout.hall, nu = Math.ceil((H.u1 - H.u0) / CELL), nv = Math.ceil((H.v1 - H.v0) / CELL);
  const blocks = [...layout.walls, ...layout.items.filter((i) => i.solid).map(rectOf)];
  const free = new Uint8Array(nu * nv);
  for (let k = 0; k < nv; k++) for (let i = 0; i < nu; i++) {
    const u = H.u0 + (i + 0.5) * CELL, v = H.v0 + (k + 0.5) * CELL;
    if (u < H.u0 + PLAYER_R - 1e-6 || u > H.u1 - PLAYER_R + 1e-6 || v < H.v0 + PLAYER_R - 1e-6 || v > H.v1 - PLAYER_R + 1e-6) continue;
    let ok = 1;
    for (const b of blocks) {
      const du = Math.max(b.u0 - u, 0, u - b.u1), dv = Math.max(b.v0 - v, 0, v - b.v1);
      if (du * du + dv * dv < PLAYER_R * PLAYER_R - 1e-9) { ok = 0; break; }
    }
    free[k * nu + i] = ok;
  }
  return { free, nu, nv, H };
}

// Flood fill from the door; returns the reachable mask. The door cell is the one just behind the door.
export function reachable(layout, grid = walkGrid(layout)) {
  const { free, nu, nv, H } = grid;
  const seen = new Uint8Array(nu * nv);
  const ci = Math.min(nu - 1, Math.max(0, Math.floor((0 - H.u0) / CELL))), ck = 0;
  let start = -1;
  for (let k = 0; k < Math.min(nv, 4) && start < 0; k++) for (let d = 0; d < 3 && start < 0; d++) for (const s of [0, -1, 1]) { const i = ci + s * d; if (i >= 0 && i < nu && free[k * nu + i]) { start = k * nu + i; break; } }
  if (start < 0) return { seen, grid };
  const q = [start]; seen[start] = 1;
  while (q.length) {
    const c = q.pop(), i = c % nu, k = (c - i) / nu;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = k + dk;
      if (a < 0 || b < 0 || a >= nu || b >= nv) continue;
      const n = b * nu + a;
      if (free[n] && !seen[n]) { seen[n] = 1; q.push(n); }
    }
  }
  return { seen, grid };
}

// can a person stand at (u, v) and reach it from the door?
export function reachableAt(res, u, v, r = 0.8) {
  const { seen, grid } = res, { nu, nv, H } = grid;
  const i0 = Math.floor((u - r - H.u0) / CELL), i1 = Math.floor((u + r - H.u0) / CELL), k0 = Math.floor((v - r - H.v0) / CELL), k1 = Math.floor((v + r - H.v0) / CELL);
  for (let k = Math.max(0, k0); k <= Math.min(nv - 1, k1); k++) for (let i = Math.max(0, i0); i <= Math.min(nu - 1, i1); i++) {
    const cu = H.u0 + (i + 0.5) * CELL, cv = H.v0 + (k + 0.5) * CELL;
    if (Math.hypot(cu - u, cv - v) <= r && seen[k * nu + i]) return true;
  }
  return false;
}

// people behind a counter: nobody has to reach them
export const STAFF = new Set(['winkelier', 'barman', 'receptionist', 'loketmedewerker', 'baliemedewerker', 'bibliothecaris', 'monteur']);

// What is wrong with a layout (empty = valid): items out of the hall, in the doorway, unreachable spots.
export function validateLayout(L) {
  const bad = [];
  const H = L.hall;
  const door = { u0: -L.door.w / 2, u1: L.door.w / 2, v0: H.v0 - 0.5, v1: H.v0 + DOOR_CLEAR_D };
  L.items.forEach((it, i) => {
    const r = rectOf(it);
    if (r.u0 < H.u0 - 1e-6 || r.u1 > H.u1 + 1e-6 || r.v0 < H.v0 - 1e-6 || r.v1 > H.v1 + 1e-6) bad.push(`item ${i} (${it.type}) buiten de hal`);
    if (it.solid && overlap(r, door)) bad.push(`item ${i} (${it.type}) blokkeert de deur`);
    if (!ITEM_TYPES.includes(it.type)) bad.push(`item ${i} onbekend type ${it.type}`);
  });
  for (let i = 0; i < L.items.length; i++) for (let k = i + 1; k < L.items.length; k++) {
    const a = L.items[i], b = L.items[k];
    if (a.solid && b.solid && overlap(rectOf(a), rectOf(b), -1e-6)) bad.push(`items ${i} en ${k} overlappen`);
  }
  const res = reachable(L);
  const spots = [...L.npc.map((n) => ({ ...n, what: 'npc ' + n.role, r: 0.5 })), ...L.use.map((s) => ({ ...s, what: 'gebruik ' + s.id }))];
  for (const s of spots) if (s.pose !== 'sit' && !STAFF.has(s.role) && !reachableAt(res, s.u, s.v, s.r || 0.8)) bad.push(`${s.what} niet bereikbaar op (${s.u.toFixed(1)}, ${s.v.toFixed(1)})`);
  for (const w of L.walls) if (w.u0 < H.u0 - 0.2 || w.u1 > H.u1 + 0.2 || w.v0 < H.v0 - 0.2 || w.v1 > H.v1 + 0.2) bad.push('wand buiten de hal');
  // rooms: every room must hold a reachable cell
  for (const r of L.rooms) { const c = { u: (r.u0 + r.u1) / 2, v: (r.v0 + r.v1) / 2 }; if (!reachableAt(res, c.u, c.v, Math.min(1.2, (r.u1 - r.u0) / 2, (r.v1 - r.v0) / 2))) bad.push(`kamer ${r.id} niet bereikbaar`); }
  return bad;
}

const ESSENTIAL = new Set(['counter', 'bar', 'altar', 'carlift']);

// What cannot be reached: people and spots of use on the free floor, and the rooms. { kind, i, u, v }
function unreachable(L) {
  const res = reachable(L), out = [];
  L.npc.forEach((n, i) => { if (n.pose !== 'sit' && !STAFF.has(n.role) && !reachableAt(res, n.u, n.v, 0.5)) out.push({ kind: 'npc', i, u: n.u, v: n.v }); });
  L.use.forEach((s, i) => { if (!reachableAt(res, s.u, s.v, s.r || 0.8)) out.push({ kind: 'use', i, u: s.u, v: s.v }); });
  for (const r of L.rooms) { const u = (r.u0 + r.u1) / 2, v = (r.v0 + r.v1) / 2; if (!reachableAt(res, u, v, Math.min(1.2, (r.u1 - r.u0) / 2, (r.v1 - r.v0) / 2))) out.push({ kind: 'room', u, v }); }
  return out;
}

// Thin out a layout until everything is reachable: a person nobody can reach is dropped, and for a spot or a
// room the nearest piece of furniture that is not the heart of the place is taken away. Deterministic.
function repair(L) {
  for (let k = 0; k < 60; k++) {
    const bad = unreachable(L);
    if (!bad.length) return true;
    const t = bad[0];
    if (t.kind === 'npc') { L.npc.splice(t.i, 1); L.removed++; continue; }
    let best = -1, bd = Infinity;
    L.items.forEach((it, i) => {
      if (!it.solid || ESSENTIAL.has(it.type)) return;
      const d = Math.hypot(it.u - t.u, it.v - t.v);
      if (d < bd) { bd = d; best = i; }
    });
    if (best < 0) return false;
    L.items.splice(best, 1);
    L.removed++;
  }
  return false;
}

const FABRIC = [0x8a2a2a, 0x4a6a3a, 0xcbb894, 0x2a3a66, 0xc8943c, 0x7a7a80, 0x9a5a4a, 0x3a6a6a];

// The generator. spec: { kind, sub, seed (integer), hall: {u0,u1,v0,v1}, door: {w,h}, height, look? }
// Always returns a valid layout: it thins out the furniture (density 1 -> 0) until the validation passes.
export function generateLayout(spec) {
  const recipe = RECIPES[spec.kind];
  if (!recipe) return null;
  for (const density of [1, 0.6, 0.3, 0]) {
    const p = new Plan(spec.hall, spec.door, mulberry32((spec.seed >>> 0) ^ 0x9e3779b9), spec.height, density);
    p.look = spec.look || null;
    p.pickFabric = spec.look && spec.look.fabric != null ? spec.look.fabric : FABRIC[Math.floor(p.rnd() * FABRIC.length)];
    p.pickFabric2 = FABRIC[Math.floor(p.rnd() * FABRIC.length)];
    recipe(p, spec.sub);
    lampGrid(p);
    const L = {
      v: 1, kind: spec.kind, sub: spec.sub || null, seed: spec.seed >>> 0, hall: p.hall, door: p.door, height: p.height,
      items: p.items, walls: p.walls, openings: p.openings, rooms: p.rooms, npc: p.npc, use: p.use, lamps: p.lamps,
      palette: p.palette, density,
    };
    L.removed = 0;
    // a person who stands inside a solid or a partition wall is dropped
    const body = (n) => ({ u0: n.u - 0.25, u1: n.u + 0.25, v0: n.v - 0.25, v1: n.v + 0.25 });
    L.npc = L.npc.filter((n) => !L.items.some((it) => it.solid && overlap(body(n), rectOf(it))) && !L.walls.some((w) => overlap(body(n), w)));
    repair(L);
    const bads = validateLayout(L);
    if (!bads.length) return L;
    generateLayout.lastBad = bads; // for the tests: why the last attempt failed
  }
  return null;
}

export { KINDS };
