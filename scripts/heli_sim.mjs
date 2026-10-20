// Flies both heli runs (helirun.js plans from heliplan.js) with the real
// flight model (heliflight.js flyHeli) on the city map and a scripted pilot
// that holds keys the way a player would: proves every leg can be done.
//   node scripts/heli_sim.mjs
import './node3d.mjs';
import fs from 'node:fs';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const H = await import('../game/js/heliflight.js');
const P = await import('../game/js/heliplan.js');
const { helipadInfo } = await import('../game/js/skyprops.js');

const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
const map = new GameMap(data);
const u = helipadInfo(map);
const pads = { umcg: { x: u.x, y: u.y, deck: u.deck, r: u.r }, lauwersoog: { id: 'lauwersoog', x: P.ROOSTER.lauwersoog.x, y: P.ROOSTER.lauwersoog.y, deck: 0, r: 6, angle: 0 } };
H.registerHelipad({ id: 'umcg', x: u.x, y: u.y, r: u.r, z: u.deck, exit: false });

let fails = 0;
const DT = 1 / 30;

function fly(variant, limit, { noAssist = false } = {}) {
  const plan = P.makePlan(variant, pads);
  const st = P.newRunState();
  const keys = new Set();
  const w = { map, time: 0, vehicles: [], input: { isDown: (k) => keys.has(k), lookActive: () => false, mouse: { dx: 0, dy: 0 } }, addMessage: () => {}, particles: [], player: {} };
  let v;
  if (variant === 'traumaduif') {
    // right after the cruise cut: south of the UMCG, nose north
    v = H.makeHeli(u.x, u.y + P.ENTRY.back, P.ENTRY.z, -Math.PI / 2);
    v.onGround = false;
    v.rotor = 1;
    st.leg = 1;
  } else if (variant === 'rooster') {
    // right after the first cruise cut: short of the UMCG, nose along the flight
    const c = plan.legs[0].cut;
    v = H.makeHeli(c.x, c.y, c.z, c.angle);
    v.onGround = false;
    v.rotor = 1;
    st.leg = 1;
  } else v = H.makeHeli(u.x, u.y, u.deck, u.angle);
  v.driver = 'player';
  w.vehicles.push(v);
  const bAt = variant === 'rooster' ? P.ROOSTER.dollard : P.BALLOON_AT;
  const b = { x: bAt.x, y: bAt.y, z: 0, ground: 0, phase: 'ground' };
  const log = [];
  let t = 0;
  while (t < limit && st.leg < plan.legs.length && !v.wrecked) {
    const leg = plan.legs[st.leg];
    // the city map ends far short of the Dollard: the rooster run is proven up to the second cruise (the catch is the old catch)
    if (variant === 'rooster' && leg.kind === 'cruise') { st.leg = plan.legs.length; log.push(`${t.toFixed(0)}s cruise to the Dollard (not flown on the city map)`); break; }
    if (leg.kind === 'cruise' && leg.cut) { v.x = leg.cut.x; v.y = leg.cut.y; v.z = leg.cut.z; v.angle = leg.cut.angle; v.vx = Math.cos(v.angle) * 22; v.vy = Math.sin(v.angle) * 22; v.onGround = false; }
    if (leg.kind === 'pickup' || leg.kind === 'cruise') { P.nextLeg(st); log.push(`${t.toFixed(0)}s ${leg.kind}`); continue; }
    if ((leg.kind === 'rings' || leg.kind === 'catch') && b.phase === 'ground') P.launchBalloon(b);
    const mode = P.legMode(leg);
    const tgt = P.legTarget(plan, st, b, pads, v);
    keys.clear();
    for (const k of P.pilotKeys(v, tgt, mode)) keys.add(k);
    H.flyHeli(v, DT, w);
    if (!noAssist) P.assist(v, keys, tgt, DT, mode, b);
    P.stepBalloon(b, DT);
    for (const [e, d] of P.advance(plan, st, v, b, DT)) if (e !== 'ring' && e !== 'miss') log.push(`${t.toFixed(0)}s ${e}${d !== undefined ? ' ' + d : ''}`);
    w.time += DT;
    t += DT;
  }
  const ok = st.leg >= plan.legs.length;
  if (!ok) fails++;
  console.log(`${variant}${noAssist ? ' (no assist)' : ''}: ${ok ? 'done' : 'NOT done'} in ${t.toFixed(0)} s, rings ${st.ringsHit} hit / ${st.ringsMissed} missed, bumps ${st.bumps}, health ${Math.round(v.health)}`);
  console.log('  ' + log.join(' · '));
  if (!ok) console.log('  stuck in leg', plan.legs[st.leg] && plan.legs[st.leg].kind, 'at', Math.round(v.x), Math.round(v.y), Math.round(v.z), 'ground', v.onGround, 'target', JSON.stringify(P.legTarget(plan, st, b, pads, v)), 'check', JSON.stringify(st.check));
  return ok;
}

fly('traumaduif', 420);
fly('ballonjacht', 420);
fly('rooster', 420);
const f0 = fails;
fly('traumaduif', 420, { noAssist: true });
fails = f0;
process.exit(fails ? 1 : 0);
