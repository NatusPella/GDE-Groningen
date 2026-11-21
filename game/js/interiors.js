// Enterable interiors in the world itself (epic Interieurs, #1150, docs/INTERIEURS-21-11.md, ADR 0044). A building that has a front
// door (b.entrance, set when its facade is drawn) gets, while the player is near, a real inside: the hall behind that door, built
// lazily from the plan of interiorrules.js (kind, layout, windows), drawn in the building's own footprint on the real ground. You
// walk through the door on foot: it opens as you come (a hinged leaf), the facade is cut open there (portalcut3d.js), the walker
// collision lets you through (collision.js b.walk) and you stand in the hall, which is closed on all sides, has its own lamps and
// people, and lets the camera follow inside it (addCamTargetSource). No fade, no teleport, no loading: the room is built when you
// come within 20 m and thrown away when you are beyond 32 m (at most two at a time).
//
// Samen spelen: the world (and every building) is the same for everyone and the interior is built locally from the building's
// seed, so a player in the pand sees the same room as anyone else; positions of players already sync, so players in one building
// see each other. People in the interior are local decor, standing in the same places (deterministic), not synced; the counter,
// the purchase and the progress are the local player's own (#429). A guest runs this too: it needs no host.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { hoofdspeler } from './players.js';
import { getScene, addCamTargetSource, disposeObject } from './scene3d.js';
import { registerPortalBoxes, unregisterPortalBoxes, updatePortals } from './portalcut3d.js';
import { planInterior, doorState, planReady } from './interiorrules.js';
import { chooseLive } from './interiorplanner.js';
import { makeSpotIndex, spotFor } from './interiorspots.js';
import { markNotEnterable } from './interiormap.js';
import { buildInteriorGeometry, buildLeafGeometry, solidMaterial, lampMaterial, glassMaterial, leafMaterial } from './interiorbuild3d.js';
import { makeWalk } from './interiorwalk.js';
import { makeWanderer, stepWanderer, mayWander } from './interiorwander.js';
import { walkGrid, reachable } from './interiorlayout.js';
import { mulberry32 } from './rng.js';
import { toWorld, frameOf } from './interiorframe.js';
import { npcLook, yawOfFace } from './interiornpc.js';
import { buildPersonMesh, animatePersonWalk, seatPerson, seatedY } from './models3d_people.js';
import { FAC } from './facilities.js';
import { PROMPT, LOCKED_HOME, clerkLine, HOME_LOOK, FITTING, HAIRCUT, CHURCH_CANDLE, TICKET_LINES, LEZEN, BOUGHT, TOO_POOR, NOT_FOR_SALE } from './interiortexts.js';
import { productFor, buyProduct } from './interiorbuy.js';
import { shopInBuilding, openShopFromInterior, openFittingRoom, openClothingCounter } from './shops.js';
import { noteMoney } from './finance.js';
import { playerBusy } from './busy.js';
import { isCinematicActive } from './cinematics.js';

export const BUILD_R = 20, DROP_R = 32, MAX_LIVE = 2, NPC_R = 16, MAX_NPC = 6;
const OPEN_TIME = 0.3, OPEN_ANGLE = 1.75, DOOR_REACH = 3.0;
const BRON = 'interieur';

const S = { live: new Map(), plans: new WeakMap(), scan: 0, spots: null, spotsN: -1, closedAt: new WeakMap(), inside: null, listeners: [], hooks: { owned: () => false, manage: () => null, homeStyle: () => null }, pinned: new Set(), time: 0 };

// homeStyle(b) -> { wall, floor, fabric } | null: the colours of a home the player lives in (Homebase: a variant per living place)
// hooks other systems set: owned(b) -> true for a pand of the player (Bezit, Homebase: the door always opens);
// manage(b, plan) -> { label, sub, run(w) } | null: the management of an owned pand, at its counter (Bezit: turnover, staff, customers)
export function assignInteriorHooks(h) { Object.assign(S.hooks, h || {}); }
// what is happening: { type: 'enter'|'leave', plan, b } for sound, police, missions
export function onInteriorChange(fn) { if (typeof fn === 'function') S.listeners.push(fn); }
const emit = (e) => { for (const f of S.listeners) { try { f(e); } catch (err) { console.error('interior listener', err); } } };

// A scene (mission, cutscene, story beat) keeps the interior of a building alive while it plays, wherever the player is (interiorscene.js).
// Returns the plan (or null: the building cannot be entered); the room is built on the next scan. releaseInterior lets it go again.
export function pinInterior(b) { const rec = b && planReady(b) ? planOf(b) : null; if (!rec || !rec.ok) return null; S.pinned.add(b); return rec.plan; }
export function releaseInterior(b) { S.pinned.delete(b); }
export const livePlanOf = (b) => { const ls = S.live.get(b); return ls ? ls.plan : null; };

export const insideInterior = () => (S.inside ? { b: S.inside.b, plan: S.inside.plan, kind: S.inside.plan.kind, sub: S.inside.plan.sub } : null);
export const liveInteriors = () => S.live.size;
export const interiorStats = () => ({ live: S.live.size, triangles: [...S.live.values()].reduce((n, l) => n + l.triangles, 0), npcs: [...S.live.values()].reduce((n, l) => n + l.npcs.length, 0), inside: !!S.inside });

const hourOf = (w) => ((w.clock % 24) + 24) % 24;

function spotIndex() {
  if (!FAC.ready) return null;
  if (!S.spots || S.spotsN !== FAC.all.length) { S.spots = makeSpotIndex(FAC.all); S.spotsN = FAC.all.length; }
  return S.spots;
}

function planOf(b) {
  let rec = S.plans.get(b);
  if (rec === undefined) {
    const spot = spotFor(spotIndex(), b.pts, b.entrance || null);
    let style = null;
    try { style = S.hooks.homeStyle(b); } catch (e) { style = null; }
    rec = planInterior(b, { spot, style });
    rec.b = b;
    if (!rec.ok && spot && (rec.why === 'small' || rec.why === 'low')) markNotEnterable(spot.x, spot.y); // the map layer stops promising it
    S.plans.set(b, rec);
  }
  return rec;
}

// --- building and dropping -------------------------------------------------------------------------------------

function build(w, rec) {
  const { plan, b } = rec;
  const scene = getScene();
  if (!scene) return null;
  const fr = plan.frame;
  const ground = (w.map && w.map.groundHeightAt ? w.map.groundHeightAt(fr.ox, fr.oy, 60) : 0) || 0;
  const { geometry, triangles } = buildInteriorGeometry(plan, ground, { x: fr.ox, y: fr.oy });
  const group = new THREE.Group();
  group.name = 'interieur';
  group.position.set(fr.ox, 0, fr.oy);
  const mesh = new THREE.Mesh(geometry, [solidMaterial, lampMaterial, glassMaterial]);
  mesh.userData.noBatch = true;
  group.add(mesh);
  // the door leaf, hinged at its left side seen from outside
  const lf = buildLeafGeometry(plan, ground, plan.doorColor ?? 0x6b2a24, plan.shop, plan.frameColor);
  const pivot = new THREE.Group();
  pivot.position.set(lf.hinge[0] - fr.ox, 0, lf.hinge[1] - fr.oy);
  const leaf = new THREE.Mesh(lf.geometry, leafMaterial);
  leaf.userData.noBatch = true;
  pivot.add(leaf);
  group.add(pivot);
  scene.add(group);
  // the facade is cut open where the door is (the leaf and the reveal fill the gap)
  const box = { cx: fr.ox, cy: fr.oy, ux: fr.nx, uy: fr.ny, hl: 0.6, hw: plan.door.w / 2, top: ground + plan.door.h + 0.02, bottom: ground - 0.3 };
  const ls = { b, plan, group, mesh, pivot, leaf, ground, box, boxes: [box], open: 0, target: 0, npcs: [], npcsOn: false, triangles, side: Math.sign(fr.tx * -fr.ny + fr.ty * fr.nx) || 1, bellAt: 0, walk: null };
  registerPortalBoxes(ls, ls.boxes);
  ls.walk = makeWalk(plan, b.pts, () => ls.open > 0.55, ground);
  b.walk = ls.walk;
  const p = hoofdspeler(w);
  if (p) updatePortals(p.x, p.y, true);
  return ls;
}

// The second floor and the stair: the walker's ground height (map.surfaceAt / groundHeightAt) comes from the stair and the upper floor of the
// live interiors first, so he climbs the ramp with the normal follow-ground logic of player.js. One wrap per map, active only while a
// stair interior lives; assignInteriorOptions({ upper: false }) switches it off.
function installFloorHook(map) {
  if (!map || map.interiorFloorHook) return;
  map.interiorFloorHook = true;
  const floorAt = (x, y, z) => {
    for (const ls of S.live.values()) { if (!ls.plan.stairs) continue; const h = ls.walk.floorAt(x, y, z); if (h !== null) return h; }
    return null;
  };
  const gAt = map.groundHeightAt && map.groundHeightAt.bind(map);
  if (gAt) map.groundHeightAt = (x, y, zHint = 0, ...rest) => { const h = S.live.size ? floorAt(x, y, zHint) : null; return h !== null ? h : gAt(x, y, zHint, ...rest); };
  const sAt = map.surfaceAt && map.surfaceAt.bind(map);
  if (sAt) map.surfaceAt = (x, y, st, ...rest) => { if (S.live.size && st) { const h = floorAt(x, y, st.z); if (h !== null) return { z: h, ribbon: null, kind: 'ground' }; } return sAt(x, y, st, ...rest); };
}

function drop(w, ls) {
  const scene = getScene();
  if (ls.b.walk === ls.walk) ls.b.walk = null;
  if (S.inside === ls) { S.inside = null; emit({ type: 'leave', plan: ls.plan, b: ls.b }); }
  unregisterPortalBoxes(ls, ls.boxes);
  if (scene) scene.remove(ls.group);
  disposeObject(ls.group);
  ls.npcs.length = 0;
  S.live.delete(ls.b);
  const p = hoofdspeler(w);
  if (p) updatePortals(p.x, p.y, true);
}

function addNpcs(ls) {
  const { plan } = ls, L = plan.layout;
  const accent = L.palette ? L.palette.accent : 0x3f6ea8;
  const all = [...L.npc.map((n) => ({ ...n, level: 1 })), ...(L.upper ? L.upper.npc.map((n) => ({ ...n, level: 2 })) : [])].slice(0, MAX_NPC);
  if (!ls.grid) { ls.grid = walkGrid(L); ls.reach = reachable(L, ls.grid); }
  const rnd = mulberry32(plan.seed ^ 0x6d2b79f5);
  all.forEach((n, i) => {
    const look = npcLook(n.role, plan.seed, i, accent, plan.sub);
    let fig;
    try { fig = buildPersonMesh(look.shirt, look.skin, look.opts); } catch (e) { return; }
    const [x, z] = toWorld(plan.frame, n.u, n.v);
    const lvl = n.level === 2 ? plan.floorH : 0;
    fig.position.set(x - plan.frame.ox, ls.ground + lvl + 0.02, z - plan.frame.oy);
    fig.rotation.y = yawOfFace(plan.frame, n.face);
    if (n.pose === 'sit') { try { seatPerson(fig); fig.position.y = ls.ground + lvl + 0.02 + seatedY(fig, 0.46); } catch (e) { /* stands then */ } }
    ls.group.add(fig);
    ls.npcs.push({ fig, n, wander: n.level === 1 && mayWander(n) ? makeWanderer(ls.grid, ls.reach, rnd, n.u, n.v) : null });
  });
  ls.npcsOn = true;
}
function dropNpcs(ls) {
  for (const o of ls.npcs) { ls.group.remove(o.fig); disposeObject(o.fig); }
  ls.npcs.length = 0;
  ls.npcsOn = false;
}

// --- the update ------------------------------------------------------------------------------------------------

function scan(w, p) {
  installFloorHook(w.map);
  const near = w.map.buildingsNear(p.x, p.y, DROP_R + 12);
  const want = [];
  let computed = 0;
  for (const b of near) {
    if (b.dropped || !planReady(b)) continue;
    let rec = S.plans.get(b);
    if (rec === undefined) { if (computed >= 1) continue; computed++; rec = planOf(b); }
    if (!rec.ok) continue;
    const d = Math.hypot(rec.plan.frame.ox - p.x, rec.plan.frame.oy - p.y);
    if (d <= BUILD_R) want.push({ id: rec.b, d, rec });
  }
  want.sort((a, c) => a.d - c.d);
  const live = [...S.live.values()].map((ls) => ({ id: ls.b, d: Math.hypot(ls.plan.frame.ox - p.x, ls.plan.frame.oy - p.y), inside: S.inside === ls || S.pinned.has(ls.b) }));
  const { drops, build: pick } = chooseLive(want, live, { buildR: BUILD_R, dropR: DROP_R, max: MAX_LIVE });
  for (const id of drops) { const ls = S.live.get(id); if (ls) drop(w, ls); }
  if (pick && !computed) { const rec = want.find((x) => x.id === pick).rec; const ls = build(w, rec); if (ls) S.live.set(rec.b, ls); }
}

function updateLive(w, ls, dt, p, onFoot) {
  const { plan } = ls, fr = plan.frame;
  const dd = Math.hypot(p.x - fr.ox, p.y - fr.oy);
  const inside = onFoot && ls.walk.inside(p.x, p.y, 0.3);
  const st = doorState(plan, hourOf(w), S.hooks.owned(ls.b));
  const atDoor = onFoot && dd < DOOR_REACH && ls.walk.atDoor(p.x, p.y, DOOR_REACH);
  // the door opens for someone who may come in, and for anyone inside who walks to it
  ls.target = (atDoor && (st.open || inside)) || (inside && dd < DOOR_REACH) ? 1 : 0;
  const was = ls.open;
  ls.open += Math.sign(ls.target - ls.open) * Math.min(Math.abs(ls.target - ls.open), dt / OPEN_TIME);
  if (ls.open !== was) ls.pivot.rotation.y = -ls.side * ls.open * OPEN_ANGLE;
  if (was < 0.05 && ls.open > 0.05 && !plan.shop && w.audioEvents && w.audioEvents.length < 64 && S.time - ls.bellAt > 3) { ls.bellAt = S.time; w.audioEvents.push({ kind: 'fx', name: 'door_wood_open', x: fr.ox, y: fr.oy }); }
  if (was > 0.95 && ls.open < 0.95 && w.audioEvents && w.audioEvents.length < 64 && S.time - (ls.closeAt || -9) > 3) { ls.closeAt = S.time; w.audioEvents.push({ kind: 'fx', name: 'door_wood_close', x: fr.ox, y: fr.oy }); }
  if (was < 0.05 && ls.open > 0.05 && plan.shop && w.audioEvents && w.audioEvents.length < 64 && S.time - ls.bellAt > 3) { ls.bellAt = S.time; w.audioEvents.push({ kind: 'fx', name: 'shop_bell', x: fr.ox, y: fr.oy }); }
  // a closed door says so, once per approach
  if (!st.open && onFoot && dd < 2.4 && !inside && S.time - (S.closedAt.get(ls.b) || -99) > 20) {
    S.closedAt.set(ls.b, S.time);
    const text = plan.kind === 'woning' ? LOCKED_HOME[plan.seed % LOCKED_HOME.length] : '';
    if (w.addMessage) w.addMessage(text, 3.2, { kind: 'tip' });
  }
  // who is inside
  if (inside && S.inside !== ls) { S.inside = ls; emit({ type: 'enter', plan, b: ls.b }); }
  else if (!inside && S.inside === ls) { S.inside = null; emit({ type: 'leave', plan, b: ls.b }); }
  // the people: only when open (or you are in), and only close by
  const wantNpcs = (st.open || inside) && dd < NPC_R;
  if (wantNpcs && !ls.npcsOn) addNpcs(ls);
  else if (!wantNpcs && ls.npcsOn) dropNpcs(ls);
  if (ls.npcsOn && dd < NPC_R) {
    for (const o of ls.npcs) {
      if (o.n.pose === 'sit') continue;
      let speed = 0;
      if (o.wander) {
        stepWanderer(o.wander, dt);
        const [x, z] = toWorld(plan.frame, o.wander.u, o.wander.v);
        o.fig.position.x = x - plan.frame.ox; o.fig.position.z = z - plan.frame.oy;
        if (o.wander.moving) {
          speed = 1.1;
          const wx = plan.frame.tx * o.wander.hu - plan.frame.nx * o.wander.hv, wy = plan.frame.ty * o.wander.hu - plan.frame.ny * o.wander.hv;
          o.fig.rotation.y = -Math.atan2(wy, wx);
        }
      }
      try { animatePersonWalk(o.fig, speed, dt); } catch (e) { /* idles */ }
    }
  }
}

export function updateInteriors(dt, w) {
  if (!w || !w.map || !w.map.buildingsNear) return;
  const p = hoofdspeler(w);
  if (!p || !getScene()) return;
  S.time += dt;
  const onFoot = !p.inVehicle && !p.swimming && !p.dead;
  if ((S.scan -= dt) <= 0) { S.scan = 0.3; scan(w, p); }
  for (const ls of S.live.values()) updateLive(w, ls, dt, p, onFoot);
  w.insideBuilding = !!S.inside || !!w.insideExternal; // read by police.js (the walls are the sight lines) and worldevents.js (indoor sound)
  w.insideKind = S.inside ? S.inside.plan.kind : w.insideExternal ? 'woning' : null; // read by sfx/ambience.js: the room tone per kind
}

// --- using what is in the room --------------------------------------------------------------------------------------

function ready(w) { return !(!w || w.paused || w.uiPaused || w.pigeonMode || w.heliRun || isCinematicActive() || w.cameraOverride || playerBusy(w).busy); }

// the spot of use the player stands at, in the interior he is in
function nearSpot(w) {
  const ls = S.inside;
  if (!ls) return null;
  const p = hoofdspeler(w);
  for (const s of ls.plan.layout.use) {
    const [x, y] = toWorld(ls.plan.frame, s.u, s.v);
    if (Math.hypot(p.x - x, p.y - y) <= Math.min(1.5, s.r || 1.2)) return { ls, s, x, y };
  }
  return null;
}

export function interiorPrompt(w) {
  if (!S.inside || !ready(w)) return null;
  const hit = nearSpot(w);
  if (!hit) return null;
  const mg = managedAt(hit);
  if (mg) return { id: 'interieur-beheer', x: hit.x, y: hit.y, h: 1.3, key: 'E', label: mg.label || 'Beheer', sub: mg.sub || 'Je eigen pand', ring: true };
  const t = PROMPT[hit.s.id];
  if (!t) return null;
  return { id: 'interieur-' + hit.s.id, x: hit.x, y: hit.y, h: 1.3, key: 'E', label: t.label, sub: t.sub, ring: true };
}

function say(w, text) { if (w.addMessage) w.addMessage(text, 3.6, { kind: 'tip' }); }

// the counter of a pand the player owns is its management (the Bezit hook), not a shop
function managedAt(hit) {
  if (!['kopen', 'bestellen', 'balie'].includes(hit.s.id)) return null;
  let m = null;
  try { m = S.hooks.owned(hit.ls.b) ? S.hooks.manage(hit.ls.b, hit.ls.plan) : null; } catch (e) { m = null; }
  return m && typeof m.run === 'function' ? m : null;
}

function useSpot(w, hit) {
  const mg = managedAt(hit);
  if (mg) { mg.run(w); return true; }
  const { ls, s } = hit, plan = ls.plan, seed = plan.seed;
  const n = Math.floor(S.time);
  switch (s.id) {
    case 'kopen': case 'bestellen': {
      const gameShop = shopInBuilding(ls.b);
      if (gameShop && openShopFromInterior(w, gameShop)) return true;
      // a clothing interior without a shop of the game: the same stock and menu as a clothing shop (epic Kleding, round 4)
      if (s.id === 'kopen' && plan.sub === 'kleding' && openClothingCounter(w, 'kleding|' + seed, 'Kledingwinkel')) return true;
      const prod = productFor(plan.kind, plan.sub);
      if (!prod) { say(w, NOT_FOR_SALE); return true; }
      noteMoney('Winkels');
      const r = buyProduct(w, prod);
      if (r.ok && s.id === 'bestellen' && w.audioEvents && w.audioEvents.length < 64) w.audioEvents.push({ kind: 'fx', name: 'horeca_hap', x: hit.x, y: hit.y });
      if (!r.ok) say(w, TOO_POOR(prod.item, prod.price));
      else { w.kassaKlik = true; say(w, BOUGHT(prod.item, prod.price) + (r.healed ? ` +${Math.round(r.healed)} gezondheid` : '')); }
      return true;
    }
    case 'passen': {
      // the fitting room (epic Kleding, round 4): try on the stock of this shop, your own wardrobe, save an outfit, the curtain sounds
      const gameShop = shopInBuilding(ls.b);
      if (gameShop && gameShop.type !== 'kleding' && openShopFromInterior(w, gameShop)) return true;
      if (openFittingRoom(w, gameShop && gameShop.type === 'kleding' ? gameShop : 'kleding|' + seed, hit.x, hit.y)) return true;
      say(w, FITTING[n % FITTING.length]);
      return true;
    }
    case 'kappen': {
      const gameShop = shopInBuilding(ls.b);
      if (gameShop && openShopFromInterior(w, gameShop)) return true;
      say(w, HAIRCUT[n % HAIRCUT.length]);
      return true;
    }
    case 'balie': {
      const gameShop = shopInBuilding(ls.b);
      if (gameShop && openShopFromInterior(w, gameShop)) return true; // a garage or workshop of the game: its own menu (tuning, repair, paint)
      say(w, clerkLine(plan.kind, seed, n));
      return true;
    }
    case 'kaars': say(w, CHURCH_CANDLE[n % CHURCH_CANDLE.length]); return true;
    case 'kaartje': say(w, TICKET_LINES[n % TICKET_LINES.length]); return true;
    case 'lezen': say(w, LEZEN[n % LEZEN.length]); return true;
    case 'rondkijken': say(w, HOME_LOOK[(seed + n) % HOME_LOOK.length]); return true;
    default: return false;
  }
}

export function tryInteriorInteract(w) {
  if (!w || !w.input || !S.inside || !ready(w)) return false;
  if (!(w.input.wasPressed('e') || w.input.wasPressed('f'))) return false;
  const hit = nearSpot(w);
  if (!hit) return false;
  w.input.consume('e'); w.input.consume('f');
  return useSpot(w, hit);
}

export function initInteriors(w) {
  for (const ls of [...S.live.values()]) drop(w, ls);
  S.inside = null;
  S.spots = null;
  S.time = 0;
  S.scan = 0;
  if (!S.camSource) {
    S.camSource = true;
    // the camera collides with the walls and the ceiling of the room the player is in, so it stays inside
    addCamTargetSource((px, py, list) => { if (S.inside) list.push(S.inside.mesh); });
  }
  // dying or being arrested puts the player elsewhere: drop() happens by distance on the next scan
}

export const INTERIOR_KIND = {
  id: BRON,
  init: initInteriors,
  slot: 'uitje',
  interact: tryInteriorInteract,
  tickPhase: 'world',
  tick: updateInteriors,
};
