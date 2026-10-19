import { spawnPed, walkPed, holdPed, freePed, pedAlive, say as pedSay } from './sidejobkit.js';
import { recordStat, unlockAchievement } from './achievements.js';
import { Vehicle, pushCircleOutOfVehicle } from './vehicle.js';
import { isInWater } from './util.js';
import { FJORD_BUBBLES, FJORD_DUO } from './pg_lines.js';
import { finish, say, esc } from './pghost.js';
import { FJORD_SHIFT_BONUS } from './economy.js';
import { isToday } from './calendarday.js';

// The Fjord Frituur, after the story: drive the foodtruck (shops.js
// 'fjordfrituur') to a busy spot, stop, open the hatch (E) and serve the
// queue. Each customer orders one to three snacks; tap them onto the tray
// (1-6), serve with Space, Backspace clears. Right = pay plus a tip for
// speed, wrong or too slow = they leave. How busy a spot is depends on the
// clock and the weather (market, lunch, a match at the Euroborg, KEI-nacht
// in the Poelestraat). Upgrades are bought in the Ubbo app (phone.js).

const MENU = [
  { id: 'eierbal', name: 'Eierbal', price: 3.5 },
  { id: 'frikandel', name: 'Frikandel', price: 2.5 },
  { id: 'kroket', name: 'Kroket', price: 2.5 },
  { id: 'mayo', name: 'Patat mayo', price: 3 },
  { id: 'oorlog', name: 'Patat oorlog', price: 3.8 },
  { id: 'kaas', name: 'Kaassoufflé', price: 2.8 },
];

const UPGRADES = [
  { id: 'pan', name: 'Tweede frituurpan', blurb: 'Klanten wachten een kwart langer', price: 350 },
  { id: 'mosterd', name: 'Grunneger mosterd', blurb: 'Een derde meer fooi', price: 250 },
  { id: 'bel', name: 'Bel die "moi" zegt', blurb: 'Een kwart meer klanten', price: 300 },
  { id: 'neon', name: 'Neon-meeuw op het dak', blurb: 'Diensten duren 20 s langer', price: 500 },
];

const SHIFT_S = 75;
const QUEUE_MAX = 4;
const PATIENCE = [17, 23];
const hour = (w) => ((w.clock % 24) + 24) % 24;
const between = (h, a, b) => (a <= b ? h >= a && h < b : h >= a || h < b);
const raining = (w) => !!(w.weather && w.weather.active && w.weather.intensity > 0.25 && w.weather.kind !== 'mist');

// Busy-ness per spot: { level (customers per ~9 s), label }.
const SPOTS = [
  { id: 'grotemarkt', name: 'Grote Markt', at: [133.01, 94.78], busy: (w) => {
    const h = hour(w);
    if (between(h, 11, 14)) return { level: 1.3, label: 'lunchdrukte' };
    if (between(h, 17, 20)) return { level: 1.2, label: 'avondeten' };
    if (between(h, 1, 7)) return { level: 0.3, label: 'uitgestorven' };
    return { level: 0.8, label: 'gezellig' };
  } },
  { id: 'vismarkt', name: 'Vismarkt', at: [16.07, 237.62], busy: (w) => {
    const h = hour(w);
    if (between(h, 8, 17) && isToday('markt', w)) return { level: 1.2, label: 'marktdag' };
    if (between(h, 11, 18)) return { level: 0.8, label: 'gezellig' };
    return { level: between(h, 22, 6) ? 0.2 : 0.5, label: 'rustig' };
  } },
  { id: 'noorderplantsoen', name: 'Noorderplantsoen', at: [138.09, -696.53], busy: (w) => {
    const h = hour(w);
    if (raining(w)) return { level: 0.2, label: 'regen, iedereen is binnen' };
    if (between(h, 12, 20)) return { level: 1.3, label: 'zon in het park' };
    return { level: 0.5, label: 'rustig' };
  } },
  { id: 'euroborg', name: 'Euroborg', at: [1771.62, 1400.47], busy: (w) => {
    const h = hour(w);
    if (between(h, 14, 17) || between(h, 19.5, 22.5)) return { level: 1.6, label: 'wedstrijd!' };
    return { level: 0.15, label: 'geen wedstrijd (14-17 u, 19:30-22:30 u)' };
  } },
  { id: 'poelestraat', name: 'Poelestraat', at: [400.16, 126.64], busy: (w) => {
    const h = hour(w);
    if (between(h, 22, 4)) return { level: 1.5, label: 'KEI-nacht' };
    return { level: 0.2, label: 'pas vanaf 22 u druk' };
  } },
];

let save = freshSave();
function freshSave() {
  return { upgrades: [], earned: 0, shifts: 0, best: 0 };
}
export function fjordSave() {
  return { ...save, upgrades: [...save.upgrades] };
}
export function applyFjordSave(d) {
  save = freshSave();
  if (!d || typeof d !== 'object') return;
  save.upgrades = Array.isArray(d.upgrades) ? d.upgrades.filter((id) => UPGRADES.some((u) => u.id === id)) : [];
  for (const k of ['earned', 'shifts', 'best']) save[k] = Number.isFinite(d[k]) ? Math.max(0, d[k]) : 0;
}
const has = (id) => save.upgrades.includes(id);

// The upgrade rows for the phone (Ubbo).
export function fjordUpgradeOffers(world) {
  return UPGRADES.map((u) => ({
    ...u, owned: has(u.id),
    buy: () => {
      if (has(u.id)) return 'Heb je al';
      if (world.money < u.price) return 'Te weinig geld';
      world.money -= u.price;
      save.upgrades.push(u.id);
      return `${u.name} gekocht!`;
    },
  }));
}

const isTruck = (v) => !!(v && (v.isFoodtruck || (v.model && v.model.name === 'foodtruck')) && !v.wrecked);

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function makeOrder(level) {
  const n = Math.random() < 0.25 + level * 0.2 ? (Math.random() < 0.35 ? 3 : 2) : 1;
  const out = [];
  for (let i = 0; i < n; i++) out.push(pick(MENU).id);
  return out;
}

const counts = (list) => list.reduce((m, id) => { m[id] = (m[id] || 0) + 1; return m; }, {});
function sameOrder(a, b) {
  const x = counts(a), y = counts(b);
  const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
  for (const k of keys) if ((x[k] || 0) !== (y[k] || 0)) return false;
  return true;
}

function duo(run, kind) {
  const w = run.world;
  const c = w.companion;
  const who = c && c.character === 'tammo' ? 'T' : 'A';
  const list = FJORD_DUO[kind] && FJORD_DUO[kind][who];
  if (list) say(run, who === 'T' ? 'Tammo' : 'Anita', pick(list), true);
}

// On a drivable carriageway (not pavement, square or cycle path).
function onRoad(map, x, y, margin = 0.4) {
  const rp = map.nearestRoadPoint(x, y, 30, true);
  return !!rp && Math.hypot(rp.x - x, rp.y - y) < (rp.road.width || 6) / 2 + margin;
}
const walkable = (map, x, y) => {
  if (isInWater(map, x, y)) return false;
  const [ex, ey] = map.escapeBuilding(x, y, 0.4);
  return Math.hypot(ex - x, ey - y) < 0.2;
};

// The hatch goes on whichever side faces the pavement: right (+1) unless the
// left is the kerb side and the right is road.
function pickHatchSide(map, v) {
  const c = Math.cos(v.angle), s = Math.sin(v.angle), off = v.model.wid / 2 + 1.4;
  const score = (side) => {
    const x = v.x - s * off * side, y = v.y + c * off * side;
    return (walkable(map, x, y) ? 2 : 0) + (onRoad(map, x, y, 0) ? 0 : 1);
  };
  return score(-1) > score(1) ? -1 : 1;
}

// Truck-local frame: u along the heading, l towards the hatch.
function toLocal(v, side, x, y) {
  const c = Math.cos(v.angle), s = Math.sin(v.angle), dx = x - v.x, dy = y - v.y;
  return { u: dx * c + dy * s, l: (-dx * s + dy * c) * side };
}
function toWorld(v, side, u, l) {
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  return { x: v.x + c * u - s * l * side, y: v.y + s * u + c * l * side };
}

// How far out from the hatch the pavement starts (the truck may stand a
// metre or two off the kerb).
function kerbOffset(map, v, side) {
  const base = v.model.wid / 2 + 1.1;
  for (let l = base; l <= base + 4; l += 0.4) {
    const p = toWorld(v, side, 0, l);
    if (!walkable(map, p.x, p.y)) break;
    if (!onRoad(map, p.x, p.y, 0.3)) return l;
  }
  return base;
}

// the queue on the pavement along the hatch, first one at the window
function hatchSlots(map, v, side, off) {
  const out = [];
  for (let k = 0; k < QUEUE_MAX + 1; k++) {
    const p = toWorld(v, side, 0.2 - k * 1.1, off + k * 0.2);
    [p.x, p.y] = map.escapeBuilding(p.x, p.y, 0.35);
    out.push(p);
  }
  const f = toWorld(v, side, 0, v.model.wid / 2);
  return { slots: out, fx: f.x, fy: f.y };
}

// Steer around the truck's footprint: a path that would cut through it goes
// via the nearest hatch-side corner first.
function aroundTruck(v, side, px, py, tx, ty) {
  const hl = v.model.len / 2 + 0.7, hw = v.model.wid / 2 + 0.7;
  const a = toLocal(v, side, px, py), b = toLocal(v, side, tx, ty);
  let t0 = 0, t1 = 1;
  for (const [p0, dp, lim] of [[a.u, b.u - a.u, hl], [a.l, b.l - a.l, hw]]) {
    if (Math.abs(dp) < 1e-6) { if (Math.abs(p0) > lim) return null; continue; }
    let e0 = (-lim - p0) / dp, e1 = (lim - p0) / dp;
    if (e0 > e1) [e0, e1] = [e1, e0];
    t0 = Math.max(t0, e0); t1 = Math.min(t1, e1);
    if (t0 > t1) return null;
  }
  const eu = (a.u >= 0 ? 1 : -1) * (hl + 0.4);
  // alongside the far side: first out past the nearest end, then round to the hatch side
  return Math.abs(a.u) <= hl ? toWorld(v, side, eu, a.l) : toWorld(v, side, eu, hw + 0.4);
}

function walkCustomer(w, d, q, tx, ty, speed, dt, reach) {
  const v = d.truck, ped = q.ped;
  const via = aroundTruck(v, d.side, ped.x, ped.y, tx, ty);
  const done = via ? (walkPed(w, ped, via.x, via.y, speed, dt, 0.3), false) : walkPed(w, ped, tx, ty, speed, dt, reach);
  const push = pushCircleOutOfVehicle(ped.x, ped.y, (ped.radius || 0.3) + 0.15, v);
  if (push) { ped.x = push.x; ped.y = push.y; if (ped.guard) { ped.guard.x = ped.x; ped.guard.y = ped.y; } }
  return done;
}

function spawnCustomer(run) {
  const w = run.world, d = run.data, v = d.truck;
  for (let t = 0; t < 30; t++) {
    const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 10;
    const x = v.x + Math.cos(a) * r, y = v.y + Math.sin(a) * r;
    // first tries only on the hatch side, never on the carriageway
    if (t < 18 && toLocal(v, d.side, x, y).l < 1) continue;
    if (!walkable(w.map, x, y) || onRoad(w.map, x, y)) continue;
    const ped = spawnPed(w, x, y, a + Math.PI);
    const pat = PATIENCE[0] + Math.random() * (PATIENCE[1] - PATIENCE[0]);
    d.queue.push({ ped, order: makeOrder(d.level), patience: pat * (has('pan') ? 1.25 : 1), max: pat * (has('pan') ? 1.25 : 1), greeted: false, arrived: false });
    return true;
  }
  return false;
}

function leave(run, q, text) {
  const w = run.world;
  if (text) pedSay(w, q.ped, text, 3);
  freePed(q.ped, 0);
}

export const FJORD = {
  id: 'fjord',
  name: 'Fjord Frituur',
  blurb: 'Jullie eigen foodtruck: parkeer bij de drukte en verkoop snacks',
  icon: 'fjord',
  jelle: false,
  reach: 11,
  duringIntro: false,
  vehicle: isTruck,
  need: 'Kom met de Fjord Frituur (bestel hem via je telefoon)',
  spots(world) {
    const map = world.map;
    return SPOTS.map((sp) => {
      const rp = map.nearestRoadPoint(sp.at[0], sp.at[1], 120, true);
      const p = rp && Math.hypot(rp.x - sp.at[0], rp.y - sp.at[1]) < 90 ? rp : { x: sp.at[0], y: sp.at[1] };
      return { x: p.x, y: p.y, name: `Fjord Frituur: ${sp.name}`, sub: 'Parkeer hier en open het luik', spot: sp, busy: (w) => sp.busy(w) };
    });
  },
  verb: () => 'Luik open: Fjord Frituur',
  promptSub(s, w) {
    const b = s.data.spot.busy(w);
    return `${s.data.spot.name}: ${b.label}`;
  },
  start(run) {
    const w = run.world, v = w.player.inVehicle;
    if (!isTruck(v)) return 'Kom met de Fjord Frituur';
    const b = run.spot.data.spot.busy(w);
    Object.assign(run.data, {
      truck: v, x0: v.x, y0: v.y, side: pickHatchSide(w.map, v), throttleT: 0, level: b.level * (has('bel') ? 1.25 : 1), label: b.label, where: run.spot.data.spot.name,
      left: SHIFT_S + (has('neon') ? 20 : 0), spawnT: 1.2, queue: [], tray: [], served: 0, wrong: 0, lost: 0, earned: 0, flash: null, rushSaid: false,
    });
    v.speed = 0;
    v.driftX = 0; v.driftY = 0;
    v.shiftParked = true;
    run.data.kerbL = kerbOffset(w.map, v, run.data.side);
    w.yieldWalkers = [];
    duo(run, 'open');
    return true;
  },
  keys(run, input) {
    const d = run.data;
    for (let i = 0; i < MENU.length; i++) {
      const k = String(i + 1);
      if (input.wasPressed(k)) { input.consume(k); if (d.tray.length < 3) d.tray.push(MENU[i].id); }
    }
    if (input.wasPressed('backspace') || input.wasPressed('0')) { input.consume('backspace'); input.consume('0'); d.tray = []; }
    if (input.wasPressed(' ') || input.wasPressed('enter')) { input.consume(' '); input.consume('enter'); d.serve = true; }
    d.wantsDrive = !d.ended && input.axis()[1] < 0;
  },
  update(run, dt) {
    const w = run.world, d = run.data, v = d.truck;
    const moved = Math.hypot(v.x - d.x0, v.y - d.y0);
    if (w.player.inVehicle !== v || moved > 4 || v.wrecked) { end(run, moved > 4 ? 'De truck schoof weg: luik dicht.' : 'Luik dicht.'); return; }
    // holding the throttle closes up: the truck stays on its brakes until the queue has stepped aside
    d.throttleT = d.wantsDrive ? d.throttleT + dt : 0;
    if (d.throttleT > 0.6) { end(run, 'Luik dicht: jullie rijden door.'); return; }
    if (d.wantsDrive && d.throttleT < dt * 1.5) w.addMessage('Gas vasthouden: luik dicht en wegrijden', 1.5, { key: 'fjord-drive' });
    d.left -= dt;
    const { slots, fx, fy } = hatchSlots(w.map, v, d.side, d.kerbL);
    // new customers
    d.spawnT -= dt;
    if (d.left > 6 && d.spawnT <= 0 && d.queue.length < QUEUE_MAX + (has('neon') ? 1 : 0)) {
      spawnCustomer(run);
      d.spawnT = Math.max(2.2, (6 + Math.random() * 3) / Math.max(0.3, d.level));
    }
    if (!d.rushSaid && d.queue.length >= 3) { d.rushSaid = true; duo(run, 'rush'); }
    // the queue walks up and waits; the front one's patience runs down
    for (let i = d.queue.length - 1; i >= 0; i--) {
      const q = d.queue[i];
      if (!pedAlive(w, q.ped)) { d.queue.splice(i, 1); continue; }
      const slot = slots[Math.min(i, slots.length - 1)];
      if (!q.arrived) q.arrived = walkCustomer(w, d, q, slot.x, slot.y, 1.6, dt, 0.35);
      else { walkCustomer(w, d, q, slot.x, slot.y, 1.2, dt, 0.35); holdPed(q.ped, fx, fy); }
      if (q.arrived && i === 0 && !q.greeted) { q.greeted = true; pedSay(w, q.ped, pick(FJORD_BUBBLES.greet), 3); }
      if (q.arrived) q.patience -= dt * (i === 0 ? 1 : 0.45);
      if (q.patience <= 0) {
        d.queue.splice(i, 1);
        d.lost++;
        leave(run, q, pick(FJORD_BUBBLES.leave));
        if (i === 0) d.tray = [];
      }
    }
    // serve
    if (d.serve) {
      d.serve = false;
      const q = d.queue[0];
      if (q && q.arrived && d.tray.length) {
        d.queue.shift();
        if (sameOrder(q.order, d.tray)) {
          const base = q.order.reduce((s, id) => s + MENU.find((m) => m.id === id).price, 0);
          const tip = base * 0.5 * Math.max(0, q.patience / q.max) * (has('mosterd') ? 1.33 : 1);
          const pay = Math.round(base + tip);
          d.earned += pay;
          d.served++;
          d.flash = { text: `+€${pay}`, t: 1.2, ok: true };
          leave(run, q, pick(FJORD_BUBBLES.happy));
        } else {
          d.wrong++;
          d.flash = { text: 'Fout!', t: 1.2, ok: false };
          leave(run, q, pick(FJORD_BUBBLES.wrong));
        }
        d.tray = [];
      }
    }
    w.yieldWalkers = d.queue.map((q) => q.ped);
    if (d.flash && (d.flash.t -= dt) <= 0) d.flash = null;
    render(run);
    if (d.left <= 0) end(run, 'Einde dienst.');
  },
  hud: () => null,
  stop(run) {
    const d = run.data;
    // whoever still queues goes about their business again (on the pavement, clear of the wheels)
    for (const q of d.queue || []) leave(run, q, null);
    if (d.truck) d.truck.shiftParked = false;
    run.world.yieldWalkers = null;
  },
  debugVehicle(world, s) {
    // dev/test only: put the player in a Fjord Frituur at the spot
    const p = world.player;
    if (p.inVehicle) return;
    const v = world.vehicles.find((x) => isTruck(x) && !x.driver) || new Vehicle(s.x, s.y, 0, { name: 'foodtruck', len: 5.4, wid: 2.1, maxSpeed: 34, accel: 6.5, brake: 14, turnRate: 2, color: '#2f6fb0' });
    if (!world.vehicles.includes(v)) { v.isFoodtruck = true; v.missionCar = true; world.vehicles.push(v); }
    v.x = s.x; v.y = s.y; v.speed = 0;
    p.x = s.x; p.y = s.y;
    p.enterVehicle(v, world);
  },
  // dying or being arrested mid-shift: what was earned so far is still paid out
  onRespawn(run, { busted }) {
    end(run, busted ? 'Opgepakt: de dienst is voorbij.' : 'Je bent knock-out: de dienst is voorbij.', true);
  },
  debugWin(run) {
    const d = run.data;
    d.served = Math.max(d.served, 9);
    d.earned = Math.max(d.earned, 120);
    d.wrong = 0; d.lost = 0;
    end(run, 'Einde dienst.');
  },
  debugState: (run) => ({ left: Math.round(run.data.left), queue: run.data.queue.length, served: run.data.served, earned: run.data.earned, order: run.data.queue[0] && run.data.queue[0].arrived ? run.data.queue[0].order : null }),
};

function render(run) {
  const d = run.data;
  const q = d.queue[0];
  run.ui.setRows([['Plek', `${d.where} (${d.label})`], ['Tijd', `${Math.max(0, Math.ceil(d.left))} s`], ['Kassa', `€${d.earned}`], ['Geholpen', `${d.served}${d.wrong ? ` · ${d.wrong} fout` : ''}${d.lost ? ` · ${d.lost} weg` : ''}`]]);
  let html = '';
  if (q && q.arrived) {
    const want = counts(q.order), have = counts(d.tray);
    const items = Object.entries(want).map(([id, n]) => {
      const cls = (have[id] || 0) === n ? 'ok' : (have[id] || 0) > n ? 'bad' : '';
      return `<span class="${cls}">${n > 1 ? n + '× ' : ''}${esc(MENU.find((m) => m.id === id).name)}</span>`;
    }).join('');
    const extra = d.tray.filter((id) => !want[id]).map((id) => `<span class="bad">${esc(MENU.find((m) => m.id === id).name)}</span>`).join('');
    html += `<div>Bestelling:</div><div class="pg-order">${items}${extra}</div><div class="pg-patience" style="width:${Math.max(0, (q.patience / q.max) * 100).toFixed(0)}%"></div>`;
  } else html += `<div class="pg-help">${d.queue.length ? 'De klant komt eraan…' : 'Wachten op klanten…'}</div>`;
  if (d.flash) html += `<div style="color:${d.flash.ok ? '#5dff7a' : '#ff6a4a'};font-size:18px">${esc(d.flash.text)}</div>`;
  html += '<div class="pg-menu">' + MENU.map((m, i) => `<div><kbd>${i + 1}</kbd>${esc(m.name)}</div>`).join('') + '</div><div class="pg-help"><kbd>SPATIE</kbd> serveren · <kbd>BACKSPACE</kbd> opnieuw</div>';
  run.ui.setSlot(html);
}

function end(run, why, cut = false) {
  const w = run.world, d = run.data;
  const earned = d.earned;
  const clean = d.wrong === 0 && d.lost === 0;
  const medal = d.served >= 8 && clean ? 3 : d.served >= 6 ? 2 : d.served >= 3 ? 1 : 0;
  save.shifts++;
  save.earned += earned;
  save.best = Math.max(save.best, earned);
  if (earned > 0) recordStat(w, 'fjordEarned', earned);
  if (d.served >= 1) unlockAchievement(w, 'fjord_klaar');
  run.data.ended = true;
  const good = !cut && d.served >= 3 && d.served >= d.wrong + d.lost;
  const bonus = good ? FJORD_SHIFT_BONUS[medal] : 0;
  if (!cut) duo(run, good ? 'good' : 'bad');
  finish(run, {
    success: good, medal, value: earned, lower: false, reward: earned + bonus,
    title: good ? 'DIENST GESLAAGD' : 'DIENST VOORBIJ',
    reason: why + (clean && d.served ? ' Niemand klaagde. Kon minder.' : ''),
    stats: [['Geholpen', String(d.served)], ['Fout', String(d.wrong)], ['Weggelopen', String(d.lost)], ...(bonus ? [['Dienstbonus', `€${bonus}`]] : [])],
  });
}
