// The province animals (23-11): where they appear and how they behave. Roe deer and foxes on field edges (they flee far and
// fast), donkeys, alpacas and pigs on a smallholding at the edge of a village (tame: they stay in their patch and watch you),
// and the wolf: rare, only in the border region at night, announced by tracks and howling, dangerous up close (ADR 0042).
// Pure logic on plain animal objects; wildlife.js spawns, moves and draws them and passes its helpers in `ctx` (no import
// back into wildlife.js). The models and clips live in animalmodels.js.
//
// Wolf, in short: roams far from people; when someone comes within 30 m it stops and watches ('loer'); closer than 9 m, or
// walking straight at it, it attacks ('aanval'): it runs in and bites every 1.1 s for WOLF_BITE damage (no blood, no gore:
// the bite works like any other hit, see combat.js damagePlayer). A car or a player who charges it or has bitten three times
// drives it off ('vlucht'), after which it leaves the area. With no one near, it may go for a sheep, cow or goose: the animal
// runs and is gone (taken out of sight, nothing shown). Samen spelen: the wolf lives in the host's world; every player takes
// the bite in their own game (the host for itself, a guest when the host's snapshot shows the wolf attacking right next to it).
import { spawnWeight } from './dierenregister.js';
import { fleeFrom } from './dierenplan.js';

export const PROVINCE_KINDS = new Set(['ree', 'vos', 'wolf', 'ezel', 'alpaca', 'varken']);
export const WOLF_STATES = ['zwerf', 'loer', 'aanval', 'vlucht'];
export const WOLF_BITE = 14;
const WOLF_WATCH_M = 30, WOLF_ATTACK_M = 9, WOLF_BITE_M = 1.5, WOLF_BITE_S = 1.1;
const FARM = new Set(['ezel', 'alpaca', 'varken']);
const LIMIT = { ree: 4, vos: 1, wolf: 1, farm: 4 };

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

function newAnimal(kind, x, y, rng, extra = {}) {
  return {
    kind, x, y, angle: rng() * Math.PI * 2 - Math.PI, speed: 0, stride: 0, bobSeed: rng() * Math.PI * 2,
    wanderTarget: { x, y }, homeX: x, homeY: y, homeRadius: FARM.has(kind) ? 3 : 12, waypointTimer: 1 + rng() * 5, state: 'rust', ...extra,
  };
}

// ctx: { map, player (focus body), streekId, hour, rng, greenPoint(rMin, rMax) -> {x, y} | null, openGround(x, y),
//        urbanAt(x, y), inKom(x, y), message(text) }
// count: how many of each province kind are already near. Returns the new animals.
export function spawnProvinceAnimals(ctx, count) {
  const out = [];
  const { rng, streekId, hour } = ctx;
  const w = (id) => spawnWeight(id, streekId, hour, 'weide');
  // roe deer: a small group on a field away from houses
  if ((count.ree || 0) < LIMIT.ree && rng() < 0.12 * w('ree')) {
    const p = ctx.greenPoint(35, 90);
    if (p && ctx.urbanAt(p.x, p.y) < 0.08 && !ctx.inKom(p.x, p.y)) {
      const n = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) { const x = p.x + (rng() - 0.5) * 6, y = p.y + (rng() - 0.5) * 6; if (ctx.openGround(x, y)) out.push(newAnimal('ree', x, y, rng)); }
    }
  }
  if ((count.vos || 0) < LIMIT.vos && rng() < 0.08 * w('vos')) {
    const p = ctx.greenPoint(30, 80);
    if (p && ctx.urbanAt(p.x, p.y) < 0.2 && ctx.openGround(p.x, p.y)) out.push(newAnimal('vos', p.x, p.y, rng, { homeRadius: 25 }));
  }
  // the smallholding: a donkey, alpacas or pigs on a patch at the edge of a village (not in it, not in the open polder)
  const farm = (count.ezel || 0) + (count.alpaca || 0) + (count.varken || 0);
  if (farm < LIMIT.farm && rng() < 0.15) {
    const p = ctx.greenPoint(20, 70);
    const u = p ? ctx.urbanAt(p.x, p.y) : 0;
    if (p && u > 0.04 && u < 0.3 && !ctx.inKom(p.x, p.y)) {
      const ids = ['ezel', 'alpaca', 'varken'].filter((id) => spawnWeight(id, streekId, hour, 'erf') > 0);
      if (ids.length) {
        const kind = ids[Math.floor(rng() * ids.length)];
        const n = kind === 'ezel' ? 1 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * 2);
        for (let i = 0; i < n && farm + i < LIMIT.farm; i++) { const x = p.x + i * 1.6, y = p.y + (rng() - 0.5) * 2; if (ctx.openGround(x, y)) out.push(newAnimal(kind, x, y, rng)); }
      }
    }
  }
  // the wolf: rare, at night, far from houses, and first heard before it is seen
  if ((count.wolf || 0) < LIMIT.wolf && rng() < 0.02 * w('wolf')) {
    const p = ctx.greenPoint(70, 110);
    if (p && ctx.urbanAt(p.x, p.y) < 0.03 && !ctx.inKom(p.x, p.y) && ctx.openGround(p.x, p.y)) {
      out.push(newAnimal('wolf', p.x, p.y, rng, { state: 'zwerf', homeRadius: 40, howled: false, tracks: false, bites: 0, biteT: 0 }));
      ctx.message('In de verte huilt een wolf.');
    }
  }
  return out;
}

// ctx: { world, mover(a) -> {x, y, speed, kind}, nearest(a) -> body, steer(a, tx, ty, turn, dt), openGround(x, y), rng,
//        prey(a, r) -> nearest grazing animal within r or null, playersNear(a, r) -> bool, message(text), bite(body, damage) }
export function updateProvinceAnimal(a, dt, ctx) {
  if (a.kind === 'wolf') return updateWolf(a, dt, ctx);
  const mv = ctx.mover(a);
  if (!FARM.has(a.kind)) {
    if (a.fleeT > 0) {
      a.fleeT -= dt;
      ctx.steer(a, a.wanderTarget.x, a.wanderTarget.y, 5, dt);
      if (a.fleeT <= 0) { a.speed = 0; a.homeX = a.x; a.homeY = a.y; a.wanderTarget = { x: a.x, y: a.y }; }
      return;
    }
    const f = fleeFrom(a.kind, a.x, a.y, mv);
    if (f) {
      a.fleeT = a.kind === 'ree' ? 4 : 3;
      a.speed = f.speed;
      a.wanderTarget = { x: a.x + f.ux * 40, y: a.y + f.uy * 40 };
      return;
    }
  }
  wander(a, dt, ctx, a.kind === 'vos' ? 1.1 : a.kind === 'ree' ? 0.7 : 0.6);
}

function wander(a, dt, ctx, pace) {
  a.waypointTimer -= dt;
  const d = dist(a.x, a.y, a.wanderTarget.x, a.wanderTarget.y);
  if (d < 0.4) {
    a.speed = 0;
    if (a.waypointTimer <= 0) {
      const ang = ctx.rng() * Math.PI * 2, r = ctx.rng() * a.homeRadius;
      const tx = a.homeX + Math.cos(ang) * r, ty = a.homeY + Math.sin(ang) * r;
      if (ctx.openGround(tx, ty)) a.wanderTarget = { x: tx, y: ty };
      a.waypointTimer = 4 + ctx.rng() * 9;
    }
    return;
  }
  a.speed = a.kind === 'varken' ? 0 : pace;   // the pig has no walk clip: it stays put and turns
  if (a.speed) ctx.steer(a, a.wanderTarget.x, a.wanderTarget.y, 2, dt);
  else a.wanderTarget = { x: a.x, y: a.y };
}

function updateWolf(a, dt, ctx) {
  const body = ctx.nearest(a);
  const d = body ? dist(a.x, a.y, body.x, body.y) : 1e9;
  const mv = ctx.mover(a);
  a.biteT = Math.max(0, (a.biteT || 0) - dt);
  if (a.state === 'vlucht') {
    a.speed = 7.5;
    ctx.steer(a, a.wanderTarget.x, a.wanderTarget.y, 4, dt);
    if (d > 120) a.gone = true;
    return;
  }
  const driveOff = () => {
    a.state = 'vlucht';
    const ux = d > 1e-3 ? (a.x - body.x) / d : 1, uy = d > 1e-3 ? (a.y - body.y) / d : 0;
    a.wanderTarget = { x: a.x + ux * 150, y: a.y + uy * 150 };
  };
  // a car scares it off; so does a player who runs straight at it while it is only watching
  if (body && mv.kind === 'voertuig' && mv.speed > 2 && d < 25) return driveOff();
  if (body && a.state === 'loer' && mv.speed > 4 && d < 18) {
    const closing = ((a.x - body.x) * (body.vx || 0) + (a.y - body.y) * (body.vy || 0)) / Math.max(1e-3, d);
    if (closing > 3) return driveOff();
  }
  if (a.bites >= 3) return driveOff();
  // tracks first: when someone comes within 50 m, they notice fresh paw prints
  if (body && d < 50 && !a.tracks) { a.tracks = true; ctx.message('Verse pootafdrukken in het zand. Hier loopt een wolf.'); }
  if (body && d < WOLF_ATTACK_M && mv.kind !== 'voertuig') a.state = 'aanval';
  else if (body && d < WOLF_WATCH_M && a.state !== 'aanval') a.state = 'loer';
  else if (a.state !== 'aanval' || d > WOLF_WATCH_M) a.state = 'zwerf';
  if (a.state === 'aanval') {
    if (d > WOLF_BITE_M) { a.speed = 7; ctx.steer(a, body.x, body.y, 6, dt); return; }
    a.speed = 0;
    a.angle = Math.atan2(body.y - a.y, body.x - a.x);
    if (a.biteT <= 0) { a.biteT = WOLF_BITE_S; a.bites = (a.bites || 0) + 1; ctx.bite(body, WOLF_BITE); }
    return;
  }
  if (a.state === 'loer') {
    a.speed = 0;
    a.angle = Math.atan2(body.y - a.y, body.x - a.x);   // it faces you and waits
    return;
  }
  // roaming: with nobody near it may go for a grazing animal; the prey runs and is gone, nothing is shown
  if (!a.prey && !ctx.playersNear(a, 35)) a.prey = ctx.prey(a, 30);
  if (a.prey) {
    const p = a.prey;
    if (p.gone || p.dead) { a.prey = null; return; }
    const dp = dist(a.x, a.y, p.x, p.y);
    a.speed = 6.5;
    ctx.steer(a, p.x, p.y, 5, dt);
    p.fleeT = 2;
    if (dp < 1.2) {
      p.gone = true;
      a.prey = null;
      a.state = 'vlucht';
      a.wanderTarget = { x: a.x + Math.cos(a.angle) * 150, y: a.y + Math.sin(a.angle) * 150 };
      if (ctx.playersNear(a, 120)) ctx.message('Er ontbreekt een dier in de wei. Er liep hier een wolf.');
    }
    return;
  }
  wander(a, dt, ctx, 1.3);
}

// The bites waiting for this device's player: wildlife.js (host) and coopextra3d.js (guest) queue them, main.js hands them
// to combat.js damagePlayer. Returns the total damage dealt.
export function takeAnimalHits(world, damage) {
  const q = world.animalHits;
  if (!q || !q.length) return 0;
  let sum = 0;
  for (const h of q) { damage(world, h.damage, 'melee'); sum += h.damage; }
  q.length = 0;
  return sum;
}
export function queueAnimalHit(world, damage) {
  if (!world.animalHits) world.animalHits = [];
  if (world.animalHits.length < 8) world.animalHits.push({ damage });
}
