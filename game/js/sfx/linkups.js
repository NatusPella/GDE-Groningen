// Linkups (issue #173): which game events trigger which effect of fxbank.js,
// for the events that carry no audio event of their own. Each rule watches
// state the game already keeps (bridges, trains, the player) and emits one
// { kind: 'fx', name, x, y } audio event on a change, never every frame. No
// Web Audio here and no timers: the events go through world.audioEvents like
// all others, so the voice budget and the per-effect gap in audio.js apply,
// and nothing is allocated that would have to be released. Pure, so
// scripts/sfx_linkups_test.mjs can run it on fake worlds.
//
// Not in this table because the game already pushes an audio event for them:
// door_open/door_close, splash, crossing_bell, train_horn, carbid, explosion
// (audio.js plays those), and the shop bell and the fairground bump, which
// shops.js and kermis.js push themselves (SELF_PUSHED below).

export const SELF_PUSHED = [
  { fx: 'shop_bell', where: 'shops.js (interact: de winkel gaat open)' },
  { fx: 'kermis_ding', where: 'kermis.js (botsauto raakt een ander)' },
];

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const ev = (name, x, y, extra = {}) => ({ kind: 'fx', name, x, y, ...extra });

// Each rule: { id, fx, source, init() -> state, step(state, world, env, out) }.
export const LINK_RULES = [
  {
    id: 'brug-lift',
    fx: 'bridge_clunk',
    source: 'movablebridges.js: b.state naar opening (de brug komt los) en naar up (het dek valt in het slot)',
    init: () => new WeakMap(),
    step(seen, world, env, out) {
      for (const b of env.bridges()) {
        const was = seen.get(b);
        seen.set(b, b.state);
        if (was === undefined || was === b.state) continue;
        if (b.state === 'opening') out.push(ev('bridge_clunk', b.x, b.y));
        else if (b.state === 'up') out.push(ev('bridge_clunk', b.x, b.y, { gain: 0.8, rate: 0.9 }));
      }
    },
  },
  {
    id: 'brug-schip',
    fx: 'ship_horn',
    source: 'movablebridges.js: b.state naar warn (een schip vraagt de brug open)',
    init: () => new WeakMap(),
    step(seen, world, env, out) {
      for (const b of env.bridges()) {
        const was = seen.get(b);
        seen.set(b, b.state);
        if (was === undefined || was === b.state || b.state !== 'warn') continue;
        const boat = b.boats && b.boats.size ? [...b.boats.keys()].find((k) => k && Number.isFinite(k.x)) : null;
        out.push(boat ? ev('ship_horn', boat.x, boat.y) : ev('ship_horn', b.x, b.y, { gain: 0.7 }));
      }
    },
  },
  {
    id: 'trein-voorbij',
    fx: 'train_pass',
    source: 'railway.js: getTrains(), een trein die op de luisteraar af komt en over ~2 s voorbij is',
    init: () => new WeakMap(),
    step(seen, world, env, out) {
      const L = env.listener();
      for (const t of env.trains()) {
        const c = t.cars && t.cars[Math.floor(t.cars.length / 2)];
        if (!c) continue;
        const d = dist(c.x, c.y, L.x, L.y);
        let s = seen.get(t);
        if (!s) { s = { d, t: world.time, fired: -1e9 }; seen.set(t, s); continue; }
        const dt = world.time - s.t;
        if (dt <= 0) continue;
        const closing = (s.d - d) / dt;
        s.d = d; s.t = world.time;
        if (closing > 6 && d < 260 && d / closing < 2.3 && world.time - s.fired > 25) {
          s.fired = world.time;
          out.push(ev('train_pass', c.x, c.y));
        }
      }
    },
  },
  {
    id: 'trein-remmen',
    fx: 'rail_squeal',
    source: 'railway.js: een rijdende trein (> 5 m/s) komt tot stilstand',
    init: () => new WeakMap(),
    step(seen, world, env, out) {
      for (const t of env.trains()) {
        const c = t.cars && t.cars[0];
        if (!c) continue;
        const v = Math.abs(t.pv || 0);
        let s = seen.get(t);
        if (!s) { s = { moving: v > 5 }; seen.set(t, s); continue; }
        if (v > 5) s.moving = true;
        else if (v < 0.4 && s.moving) { s.moving = false; out.push(ev('rail_squeal', c.x, c.y)); }
      }
    },
  },
  {
    id: 'voertuigdelen',
    fx: 'part_rip',
    also: ['hood_thump', 'bus_door_hiss'],
    source: 'vehicledoors.js: v.doors.loose krijgt een deel erbij (scheurt los), kap/klep/laadklep komt dicht, een busdeur (schuif) gaat open of dicht',
    init: () => new WeakMap(),
    step(seen, world, env, out) {
      if (!env.vehicles) return;
      const L = env.listener();
      for (const v of env.vehicles()) {
        const st = v && v.doors;
        if (!st || dist(v.x, v.y, L.x, L.y) > 120) continue;
        let s = seen.get(v);
        const loose = st.loose ? Object.keys(st.loose).length : 0;
        const o = st.open || {};
        const open = {};
        for (const id of Object.keys(o)) open[id] = o[id] > 0.5;
        if (!s) { seen.set(v, { loose, open }); continue; }
        if (loose > s.loose) out.push(ev('part_rip', v.x, v.y));
        for (const id of new Set([...Object.keys(open), ...Object.keys(s.open)])) {
          if (!!open[id] === !!s.open[id]) continue;
          if (id === 'kap' || id === 'klep') { if (!open[id]) out.push(ev('hood_thump', v.x, v.y)); }
          else if ((v.isBus || v.isTram || v.isTrain) && /^d[0-9]a$/.test(id)) out.push(ev('bus_door_hiss', v.x, v.y));
        }
        seen.set(v, { loose, open });
      }
    },
  },
  {
    id: 'sluis',
    fx: 'sluis_poort',
    also: ['sluis_stroom'],
    source: 'sluizen.js: lock.state naar closing/opening (poort beweegt, klinkt aan het eind) en naar levelling (water stroomt)',
    init: () => new WeakMap(),
    step(seen, world, env, out) {
      if (!env.locks) return;
      for (const k of env.locks()) {
        const was = seen.get(k);
        seen.set(k, k.state);
        if (was === undefined || was === k.state) continue;
        if (k.state === 'closing' || k.state === 'opening') out.push(ev('sluis_poort', k.x, k.y));
        else if (k.state === 'levelling') out.push(ev('sluis_stroom', k.x, k.y));
      }
    },
  },
  {
    id: 'plons-groot',
    fx: 'splash_big',
    source: 'player.js: swimming wordt true (de speler valt in het water)',
    init: () => ({ was: null }),
    step(s, world, env, out) {
      const p = world.player;
      const now = !!p.swimming;
      if (s.was === false && now) out.push(ev('splash_big', p.x, p.y));
      s.was = now;
    },
  },
];

export function createLinkups() {
  const states = LINK_RULES.map((r) => r.init());
  const out = [];
  return {
    // events this frame (a reused array: copy it if you keep it)
    step(world, env) {
      out.length = 0;
      LINK_RULES.forEach((r, i) => r.step(states[i], world, env, out));
      return out;
    },
  };
}
