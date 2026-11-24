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
import { makeStage, makeActor, stepActor, STAFF_ROLES } from './interioractivity.js';
import { walkGrid, reachable } from './interiorlayout.js';
import { mulberry32 } from './rng.js';
import { missingCustomers, extraCustomers, combineHooks } from './interiorcustomers.js';
import { toWorld, toLocal, frameOf } from './interiorframe.js';
import { npcLook, yawOfFace } from './interiornpc.js';
import { crowdAt, phaseOf, presentAt } from './interiorcrowd.js';
import { sightSpans, seenThrough } from './interiorsight.js';
import { buildPersonMesh, animatePersonWalk, registerPoseSource, unregisterPoseSource } from './models3d_people.js';
import { FAC } from './facilities.js';
import { PROMPT, LOCKED_HOME, clerkLine, HOME_LOOK, FITTING, HAIRCUT, CHURCH_CANDLE, TICKET_LINES, LEZEN, BOUGHT, TOO_POOR, NOT_FOR_SALE } from './interiortexts.js';
import { productFor, buyProduct, DESK_SUBS } from './interiorbuy.js';
import { getShopsForRender, openShopFromInterior, setShopInteriorCheck, setShopEntrySource, openFittingRoom, openClothingCounter } from './shops.js';
import { setHorecaInteriorCheck } from './horeca.js';
import { distToRing } from './shopbind.js';
import { noteMoney } from './finance.js';
import { sfxEvent } from './sfx/haken.js';
import { playerBusy } from './busy.js';
import { isCinematicActive } from './cinematics.js';
import { streamPlanner } from './streamplanner.js';
import { chooseHomePropertySpawn, pandSpawnOk } from './spawnbinnen.js';
import { volumeOfPlan } from './interiorvolume.js';
import { openInteriorVolume, closeInteriorVolume } from './interiorisolation.js';

export const BUILD_R = 24, DROP_R = 34, MAX_LIVE = 2, NPC_R = 24, MAX_NPC = 8;
const OPEN_TIME = 0.3, OPEN_ANGLE = 1.75, DOOR_REACH = 3.0;
const BRON = 'interieur';
let volumeSeq = 0;

const S = { world: null, live: new Map(), plans: new WeakMap(), scan: 0, spots: null, spotsN: -1, closedAt: new WeakMap(), inside: null, listeners: [], hooks: { owned: () => false, manage: () => null, homeStyle: () => null, customers: () => 0, epoch: () => 0 }, sets: [], pinned: new Set(), sceneHeld: new Set(), time: 0 };

// homeStyle(b) -> { wall, floor, fabric } | null: the colours of a home the player lives in (Homebase: a variant per living place)
// hooks other systems set: owned(b) -> true for a pand of the player (Bezit, Homebase: the door always opens);
// manage(b, plan) -> { label, sub, run(w) } | null: the management of an owned pand, at its counter (Bezit: turnover, staff, customers)
S.sfx = defaultSfx;
// customers(b) -> number (at most 6): the customers an own business is worth today; the figures are added next to the ones the layout has (interiorcustomers.js)
// Several systems may set hooks (Bezit, Homebase): combineHooks makes one of them, nothing is overwritten.
export function assignInteriorHooks(h) { if (!h) return; S.sets.push(h); S.hooks = combineHooks(S.sets); }
// The sound hook (round 4): sfx(w, key, x, y). By default a key becomes an audio event at the place; the central sound map (sfx/haken.js sfxEvent) takes over
// by assigning it: assignInteriorSfx((w, key, x, y) => sfxEvent(w, key, x, y)). Keys are those of sfx/sfxmap.js (shop_buy_coins, scissors_snip, coffee_brew ...).
export function assignInteriorSfx(fn) { S.sfx = typeof fn === 'function' ? fn : defaultSfx; }
function defaultSfx(w, key, x, y) { if (w && w.audioEvents && w.audioEvents.length < 64) w.audioEvents.push({ kind: 'fx', name: key, x, y }); }
// what is happening: { type: 'enter'|'leave', plan, b } for sound, police, missions
export function onInteriorChange(fn) { if (typeof fn === 'function') S.listeners.push(fn); }
const emit = (e) => { for (const f of S.listeners) { try { f(e); } catch (err) { console.error('interior listener', err); } } };

// A scene (mission, cutscene, story beat) keeps the interior of a building alive while it plays, wherever the player is (interiorscene.js).
// Returns the plan (or null: the building cannot be entered); the room is built on the next scan. releaseInterior lets it go again.
export function pinInterior(b) { const rec = b && planReady(b) ? planOf(b) : null; if (!rec || !rec.ok) return null; S.pinned.add(b); return rec.plan; }
export function releaseInterior(b) { S.pinned.delete(b); }

// Echte-wereld-sets (realsets.js, docs/CUTSCENE-INTERIEURS-22-11.md): een cutscene of binnenmissie speelt in dit pand. planForScene geeft het
// plan zoals de wereld het ziet ({ ok, plan, why }, null zolang de gevel nog niet getekend is, dus de deur nog niet bekend is).
// holdInterior bouwt de hal NU (waar de speler ook staat), pint hem en houdt de eigen mensen van het pand weg (de scène brengt zijn eigen
// figuren); null als hij niet te bouwen is. releaseSceneInterior laat hem weer los: de gewone afstandsregels nemen het over.
export function planForScene(b) { return b && planReady(b) ? planOf(b) : null; }
export function holdInterior(w, b) {
  const rec = planForScene(b);
  if (!rec || !rec.ok) return null;
  S.pinned.add(b); S.sceneHeld.add(b);
  if (!S.live.has(b)) {
    let ls = null;
    try { ls = build(w, rec); } catch (e) { console.error('interieur voor de scène', e); }
    if (!ls) { S.pinned.delete(b); S.sceneHeld.delete(b); return null; }
    S.live.set(b, ls);
  }
  return { plan: rec.plan, ground: S.live.get(b).ground };
}
export function releaseSceneInterior(b) { S.pinned.delete(b); S.sceneHeld.delete(b); }
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

// Which building holds a shop or cafe marker of the game (its marker stands at the door, often on the pavement): the nearest building within
// 9 m of the marker that can be entered. Cached per marker. Used to move the buying from the street to the counter inside.
const markerBuilding = new WeakMap();
function buildingOfMarker(m) {
  if (markerBuilding.has(m)) return markerBuilding.get(m);
  const w = S.world;
  if (!w || !w.map || !w.map.buildingsNear) return null;
  let best = null, bd = 9;
  const near = w.map.buildingsNear(m.x, m.y, 10);
  if (!near.length) return null; // the tile is not in yet: ask again later
  for (const b of near) {
    if (!b.pts || b.dropped || !planReady(b)) continue;
    const d = distToRing(m.x, m.y, b.pts[0][0] === b.pts[b.pts.length - 1][0] && b.pts[0][1] === b.pts[b.pts.length - 1][1] ? b.pts.slice(0, -1) : b.pts);
    if (d < bd) { const rec = planOf(b); if (rec.ok && rec.plan.kind !== 'woning') { bd = d; best = b; } }
  }
  markerBuilding.set(m, best);
  return best;
}
const hasCounter = (plan) => plan.layout.use.some((u) => ['kopen', 'bestellen', 'balie', 'kappen'].includes(u.id));
// The entry of a walk-in shop (shopentry.js): the door in world coordinates, the counter, whether the room lives now (the door can open)
// and whether the player is in it. Only from a plan that is already made (no planning here: shops.js asks this a few times a second).
// null when the shop has no interior with a counter. Spelbot 23-11, M05 Trap & Toeter: the guide pointed at the marker, not at the door.
export function shopEntryAt(m) {
  const b = buildingOfMarker(m);
  const rec = b ? S.plans.get(b) : null;
  if (!rec || !rec.ok || !hasCounter(rec.plan)) return null;
  const fr = rec.plan.frame;
  const s = rec.plan.layout.use.find((u) => ['kopen', 'bestellen', 'balie', 'kappen'].includes(u.id));
  const [cx, cy] = toWorld(fr, s.u, s.v);
  return { door: { x: fr.ox, y: fr.oy }, counter: { x: cx, y: cy }, live: S.live.has(b), inside: !!(S.inside && S.inside.b === b) };
}

// true when the marker's building has an interior with a counter: the buying happens there, not at the marker on the street
export function markerHasInterior(m) {
  const b = buildingOfMarker(m);
  if (!b) return false;
  const rec = S.plans.get(b);
  return !!(rec && rec.ok && hasCounter(rec.plan));
}
// the game shop (shops.js) whose building this is
function gameShopOf(b) {
  for (const s of getShopsForRender()) if (!s.country && buildingOfMarker(s) === b) return s;
  return null;
}

const hookEpoch = () => { try { return S.hooks.epoch() | 0; } catch (e) { return 0; } };
// A plan is made once; when the owner's side changed (a pand bought or sold: other colours) a quiet building gets a new plan. A live or pinned room stays as it is until it is dropped.
function restyleIfStale(b, rec, epoch) {
  if (!rec || rec.epoch === epoch || S.live.has(b) || S.pinned.has(b)) return rec;
  S.plans.delete(b);
  return undefined;
}
function planOf(b) {
  let rec = S.plans.get(b);
  if (rec === undefined) {
    const spot = spotFor(spotIndex(), b.pts, b.entrance || null);
    let style = null;
    try { style = S.hooks.homeStyle(b); } catch (e) { style = null; }
    const plan = planInterior(b, { spot, style });
    rec = { ok: plan.ok, why: plan.why, plan, b, epoch: hookEpoch() }; // scan, build en pinInterior lezen rec.plan (het platte plan van interiorrules.js zat er niet in)
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
  // The windows of the facade are cut open too (glass and wall), so from outside you look into the real room, its furniture and its
  // people, instead of the fake room of the glass shader (interiorglass.js); beyond the build radius the fake room is what you see.
  const winBoxes = [];
  for (const wd of plan.windows || []) {
    const u = wd.c - plan.doorC, a = Math.max(plan.hall.u0 + 0.05, u - wd.w / 2), c = Math.min(plan.hall.u1 - 0.05, u + wd.w / 2);
    if (c - a < 0.3 || wd.y1 - wd.y0 < 0.3 || wd.y1 > plan.topY) continue;
    if (a <= plan.door.w / 2 && c >= -plan.door.w / 2 && wd.y1 <= plan.door.h + 0.05) continue; // the door glass: the door gap is already open
    const [wx, wy] = toWorld(fr, (a + c) / 2, 0);
    winBoxes.push({ cx: wx, cy: wy, ux: fr.nx, uy: fr.ny, hl: 0.6, hw: (c - a) / 2, top: ground + wd.y1, bottom: ground + wd.y0 });
  }
  winBoxes.sort((p, q) => q.hw - p.hw);
  const ls = { b, plan, group, mesh, pivot, leaf, ground, box, boxes: [box, ...winBoxes.slice(0, 7)], open: 0, target: 0, npcs: [], npcsOn: false, triangles, side: Math.sign(fr.tx * -fr.ny + fr.ty * fr.nx) || 1, bellAt: 0, walk: null };
  registerPortalBoxes(ls, ls.boxes);
  // the world keeps out of the hall: the fixed world layers do not draw in it, walkers and loose props are swept out (interiorisolation.js)
  ls.volumeId = `pand:${++volumeSeq}`;
  openInteriorVolume(ls.volumeId, volumeOfPlan(plan, ground));
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
  if (ls.volumeId) closeInteriorVolume(ls.volumeId);
  if (scene) scene.remove(ls.group);
  disposeObject(ls.group);
  for (const o of ls.npcs) unregisterPoseSource(o.seed);
  ls.npcs.length = 0; ls.npcTodo = null;
  S.live.delete(ls.b);
  const p = hoofdspeler(w);
  if (p) updatePortals(p.x, p.y, true);
}

// Review 22-11 P3: de mensen van een pand komen niet allemaal in de frame dat het live gaat (elke figuur is een eigen uiterlijk: 2 tot 4 ms,
// samen tot ca. 40 ms), maar een per frame via de streamplanner (klasse actors); addNpcs maakt alleen de lijst, buildNextNpc bouwt er een.
function addNpcs(ls) {
  const { plan } = ls, L = plan.layout;
  const all = [...L.npc.map((n) => ({ ...n, level: 1 })), ...(L.upper ? L.upper.npc.map((n) => ({ ...n, level: 2 })) : [])].slice(0, MAX_NPC);
  if (!ls.grid) { ls.grid = walkGrid(L); ls.reach = reachable(L, ls.grid); ls.stage = makeStage(L, ls.grid, ls.reach); }
  // an own business: the customers of today's turnover (Bezit), on top of the loose ones the layout has
  let want = 0;
  try { want = S.hooks.customers(ls.b) | 0; } catch (e) { want = 0; }
  if (want > 0) all.push(...extraCustomers(ls.grid, ls.reach, all, missingCustomers(want, all), mulberry32((plan.seed ^ 0x9e3779b1) >>> 0)).map((n) => ({ ...n, level: 1 })));
  ls.npcTodo = all.map((n, i) => ({ n, i }));
  ls.firstSeen = new Set();
  ls.npcsOn = true;
  ls.crowdKey = null; // the first update sets who is there at this hour
}

function buildNextNpc(ls) {
  const { plan } = ls, L = plan.layout;
  const accent = L.palette ? L.palette.accent : 0x3f6ea8;
  const { n, i } = ls.npcTodo.shift();
  const firstSeen = ls.firstSeen;
  {
    const look = npcLook(n.role, plan.seed, i, accent, plan.sub);
    let fig;
    try { fig = buildPersonMesh(look.shirt, look.skin, look.opts); } catch (e) { return; }
    const [x, z] = toWorld(plan.frame, n.u, n.v);
    const baseY = ls.ground + (n.level === 2 ? plan.floorH : 0) + 0.02;
    fig.position.set(x - plan.frame.ox, baseY, z - plan.frame.oy);
    fig.rotation.y = yawOfFace(plan.frame, n.face);
    // the pose (sitting, crouching, ringing up) comes from the pose source of the person system
    const src = { state: 'alive', pose: n.pose === 'sit' ? 'sit' : null, persistent: true }; // persistent: prunePoseSources (pedestrians) laat hem staan
    registerPoseSource(look.opts.seed, src);
    let actor = null;
    if (n.level === 1) {
      const domain = STAFF_ROLES.has(n.role) ? reachable(L, ls.grid, { u: n.u, v: n.v }) : null;
      actor = makeActor(ls.stage, n, mulberry32((plan.seed ^ (i * 7919 + 13)) >>> 0), i, domain);
    }
    ls.group.add(fig);
    ls.npcs.push({ fig, n, src, actor, seed: look.opts.seed, baseY, idx: i, first: !STAFF_ROLES.has(n.role) && !firstSeen.has(n.role) && !!firstSeen.add(n.role), present: true, seen: true });
    ls.crowdKey = null; // the new figure gets its place in the crowd of the hour in this same update
  }
}

// The crowd of the hour: who is there (interiorcrowd.js) and what part of the day the scripts follow; once per game half hour, not per frame.
function applyCrowd(w, ls) {
  const hour = hourOf(w), key = Math.floor(hour * 2);
  if (ls.crowdKey === key) return;
  ls.crowdKey = key;
  const level = crowdAt(ls.plan.kind, ls.plan.sub, hour);
  if (ls.stage) ls.stage.phase = phaseOf(hour);
  for (const o of ls.npcs) o.present = presentAt(o.n.role, ls.plan.seed, o.idx, level, o.first);
}
function dropNpcs(ls) {
  for (const o of ls.npcs) { unregisterPoseSource(o.seed); ls.group.remove(o.fig); disposeObject(o.fig); }
  ls.npcs.length = 0;
  ls.npcTodo = null;
  ls.npcsOn = false;
}

// --- the update ------------------------------------------------------------------------------------------------

function scan(w, p) {
  installFloorHook(w.map);
  const near = w.map.buildingsNear(p.x, p.y, DROP_R + 12);
  const want = [];
  let computed = 0;
  const epoch = hookEpoch();
  for (const b of near) {
    if (b.dropped || !planReady(b)) continue;
    let rec = restyleIfStale(b, S.plans.get(b), epoch);
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
    if (text) sfxEvent(w, 'key_lock_turn', fr.ox, fr.oy);   // SFX ronde 6: je voelt aan een dichte voordeur
    if (w.addMessage) w.addMessage(text, 3.2, { kind: 'tip' });
  }
  // SFX ronde 6: op de trap (de helling tussen de twee vloeren) klinkt hij zolang je de hoogte verandert, hoogstens elke 0,7 s
  if (inside && plan.stairs) {
    const h = ls.walk.floorAt(p.x, p.y, (p.gz || 0) + (p.z || 0)), rel = h === null ? null : h - ls.ground;
    const op = rel !== null && rel > 0.15 && rel < plan.floorH - 0.15;
    if (op && ls.stairRel !== undefined && Math.abs(rel - ls.stairRel) > 0.004 && S.time - (ls.stairAt || -9) > 0.7) { ls.stairAt = S.time; sfxEvent(w, 'stairs_steps', p.x, p.y); }
    ls.stairRel = op ? rel : undefined;
  }
  // who is inside
  if (inside && S.inside !== ls) {
    S.inside = ls; emit({ type: 'enter', plan, b: ls.b });
    if (plan.kind === 'woning' && (hourOf(w) < 6 || hourOf(w) >= 19)) sfxEvent(w, 'light_switch', p.x, p.y);   // SFX ronde 6: 's avonds en 's nachts klikt het licht aan
  }
  else if (!inside && S.inside === ls) { S.inside = null; emit({ type: 'leave', plan, b: ls.b }); }
  // the people: only when open (or you are in), and only close by
  const wantNpcs = (st.open || inside) && dd < NPC_R && !S.sceneHeld.has(ls.b); // een pand dat een scène vasthoudt heeft alleen de figuren van de scène
  if (wantNpcs && !ls.npcsOn) addNpcs(ls);
  else if (!wantNpcs && ls.npcsOn) dropNpcs(ls);
  if (ls.npcsOn && ls.npcTodo && ls.npcTodo.length) {
    const plan2 = streamPlanner(), g = plan2.grant('actors', 6);
    if (g > 0) { const t0 = performance.now(); buildNextNpc(ls); plan2.spend('actors', performance.now() - t0); }
  }
  if (ls.npcsOn && dd < NPC_R) {
    applyCrowd(w, ls);
    // Seen from outside only what shows through a window or the door; the rest is behind a wall and costs nothing (no draw, no animation)
    let eye = null;
    if (!inside) { if (!ls.spans) ls.spans = sightSpans(plan); eye = toLocal(fr, p.x, p.y); }
    for (const o of ls.npcs) {
      let speed = 0;
      const A = o.actor;
      if (!o.present) { o.fig.visible = false; continue; }
      o.seen = inside || (A ? seenThrough(ls.spans, eye[0], eye[1], A.u, A.v) : seenThrough(ls.spans, eye[0], eye[1], o.n.u, o.n.v));
      o.fig.visible = o.seen;
      if (A) {
        stepActor(ls.stage, A, dt);
        const [x, z] = toWorld(plan.frame, A.u, A.v);
        o.fig.position.set(x - plan.frame.ox, o.baseY, z - plan.frame.oy);
        const wx = plan.frame.tx * A.hu - plan.frame.nx * A.hv, wy = plan.frame.ty * A.hu - plan.frame.ny * A.hv;
        o.fig.rotation.y = -Math.atan2(wy, wx);
        o.src.pose = A.pose;
        speed = A.moving ? 1.1 : 0;
      } else o.fig.position.y = o.baseY;
      if (!o.seen) continue;
      try { animatePersonWalk(o.fig, speed, dt); } catch (e) { /* idles */ }
    }
  }
}

export function updateInteriors(dt, w) {
  if (!w || !w.map || !w.map.buildingsNear) return;
  const p = hoofdspeler(w);
  if (!p || !getScene()) return;
  S.world = w;
  S.time += dt;
  const onFoot = !p.inVehicle && !p.swimming && !p.dead;
  if ((S.scan -= dt) <= 0) { S.scan = 0.3; scan(w, p); }
  for (const ls of S.live.values()) updateLive(w, ls, dt, p, onFoot);
  w.insideBuilding = !!S.inside || !!w.insideExternal; // read by police.js (the walls are the sight lines) and worldevents.js (indoor sound)
  w.insideKind = S.inside ? S.inside.plan.kind : w.insideExternal ? 'woning' : null; // read by sfx/ambience.js and audio.js: the room tone and the muffled music per kind (sfx/binnenklank.js)
  w.insideSub = S.inside ? S.inside.plan.sub || null : null;
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

// SFX ronde 6: wat er bij de balie klinkt na een gelukte koop of bestelling, per soort pand (de UI-kassa en bij bestellen de hap van horeca_hap
// blijven zoals ze waren; dit is het geluid van de handeling zelf). Eén geluid per handeling, op de plek van de balie.
const COUNTER_SFX = {
  kopen: { supermarkt: 'shop_scanner_beep', bakker: 'shop_bag_rustle', slager: 'shop_bag_rustle', bloemist: 'shop_bag_rustle', snackbar: 'fryer_sizzle', _: 'shop_drawer' },
  bestellen: { cafe: 'coffee_brew', kroeg: ['bar_pour', 'bar_bottle_open'], restaurant: 'bar_glass_clink', _: 'bar_glass_clink' },
};
// een lijst is om de beurt (n: de seconde van het spel), zodat een rondje bestellen niet steeds hetzelfde klinkt
export function counterSfx(spotId, sub, n = 0) { const t = COUNTER_SFX[spotId]; const k = t ? (t[sub] || t._) : null; return Array.isArray(k) ? k[n % k.length] : k; }
function counterSound(w, hit, plan) { const k = counterSfx(hit.s.id, plan.sub, Math.floor(S.time)); if (k) sfxEvent(w, k, hit.x, hit.y); }

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
      const gameShop = gameShopOf(ls.b);
      if (gameShop && openShopFromInterior(w, gameShop)) return true;
      // a clothing interior without a shop of the game: the same stock and menu as a clothing shop (epic Kleding, round 4)
      if (s.id === 'kopen' && plan.sub === 'kleding' && openClothingCounter(w, 'kleding|' + seed, 'Kledingwinkel')) return true;
      const prod = productFor(plan.kind, plan.sub);
      if (!prod) { say(w, NOT_FOR_SALE); return true; }
      noteMoney('Winkels');
      const r = buyProduct(w, prod);
      if (r.ok && s.id === 'bestellen' && w.audioEvents && w.audioEvents.length < 64) w.audioEvents.push({ kind: 'fx', name: 'horeca_hap', x: hit.x, y: hit.y });
      if (!r.ok) say(w, TOO_POOR(prod.item, prod.price, w.money));
      else { w.kassaKlik = true; counterSound(w, hit, plan); say(w, BOUGHT(prod.item, prod.price) + (r.healed ? ` +${Math.round(r.healed)} gezondheid` : '')); }
      return true;
    }
    case 'passen': {
      // the fitting room (epic Kleding, round 4): try on the stock of this shop, your own wardrobe, save an outfit, the curtain sounds
      const gameShop = gameShopOf(ls.b);
      if (gameShop && gameShop.type !== 'kleding' && openShopFromInterior(w, gameShop)) return true;
      if (openFittingRoom(w, gameShop && gameShop.type === 'kleding' ? gameShop : 'kleding|' + seed, hit.x, hit.y)) return true;
      say(w, FITTING[n % FITTING.length]);
      return true;
    }
    case 'kappen': {
      const gameShop = gameShopOf(ls.b);
      if (gameShop && openShopFromInterior(w, gameShop)) return true;
      sfxEvent(w, ['scissors_snip', 'hair_clipper', 'hairdryer_blast'][n % 3], hit.x, hit.y);   // SFX ronde 6: de kapper knipt, trimt of föhnt, om de beurt
      say(w, HAIRCUT[n % HAIRCUT.length]);
      return true;
    }
    case 'balie': {
      const gameShop = gameShopOf(ls.b);
      if (gameShop && openShopFromInterior(w, gameShop)) return true; // a garage or workshop of the game: its own menu (tuning, repair, paint)
      // a gym sells its day card at the desk (round 4); price and effect from the product table, money of the player himself (#429)
      const deskSub = plan.sub || (plan.kind === 'garage' ? 'werkplaats' : null); // a garage without a variant is a workshop
      const dayCard = DESK_SUBS.has(deskSub) ? productFor(plan.kind, deskSub) : null;
      if (dayCard) {
        noteMoney('Winkels');
        const r = buyProduct(w, dayCard);
        if (!r.ok) say(w, TOO_POOR(dayCard.item, dayCard.price, w.money));
        else { w.kassaKlik = true; S.sfx(w, 'shop_buy_coins', hit.x, hit.y); say(w, BOUGHT(dayCard.item, dayCard.price) + (r.healed ? ` +${Math.round(r.healed)} gezondheid` : '')); }
        return true;
      }
      say(w, clerkLine(plan.kind, seed, n, plan.sub));
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
  S.world = w;
  setShopInteriorCheck(markerHasInterior);
  setShopEntrySource(shopEntryAt);
  setHorecaInteriorCheck(markerHasInterior);
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

// Binnenspawn (spawnbinnen.js, docs/SPAWN-BINNEN-22-11.md): a home that is a pand with an ordinary interior (a bought house, Bezit/Homebase). The room is
// built now, at once and whatever the distance (the load screen waits on it), and the spot in the hall is returned: walkable, clear of
// furniture, the door reachable, looking at the front wall. null when the pand has no interior or no spot (the caller then stays
// outside, in front of the door). The player is set there by the caller; scan() keeps the room alive because he stands in it.
export function binnenplekInPand(w, b) {
  const rec = b && planReady(b) ? planOf(b) : null;
  if (!rec || !rec.ok) return null;
  const sp = chooseHomePropertySpawn(rec.plan);
  if (!sp || !pandSpawnOk(rec.plan, sp).ok) return null;
  if (!S.live.has(b)) {
    const ls = build(w, rec);
    if (!ls) return null;
    S.live.set(b, ls);
  }
  return sp;
}

export const INTERIOR_KIND = {
  id: BRON,
  init: initInteriors,
  slot: 'uitje',
  interact: tryInteriorInteract,
  tickPhase: 'world',
  tick: updateInteriors,
};
