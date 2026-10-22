import { boxOf, withTiles } from './tileplace.js';
import { edgeDistance } from './countryfield.js';
import { landmarkParams, kitCoversBuilding, COVER_KINDS, wierdeOnRoad, wierdeRadius, setKitList } from './landmarkkit.js';
import { createLandmarkLayer } from './landmarklayer3d.js';

// The landmark kits in today's Ommeland (LK1): the candidates from
// game/landmarkkits.json (scripts/add_landmark_kits.py) outside the city
// map, a church's node and outline merged, a church tower mapped on its
// own left to its church, mills mapped twice once; a church without an
// outline fitted to its OSM building box. They replace the skyline's
// church templates. The city keeps its own landmarks.

let S = null;

function near(a, b, r) { return Math.hypot(a.x - b.x, a.y - b.y) < r; }

// the church of the tiles' buildings nearest to (x, y), as a fit
function churchBox(map, x, y) {
  let best = null, ba = 0;
  for (const b of map.buildingsNear(x, y, 36)) {
    if (b.type !== 'church' && b.type !== 'chapel') continue;
    const q = boxOf(b);
    if (Math.hypot(q.x - x, q.y - y) > 35 || q.w * q.l <= ba) continue;
    ba = q.w * q.l; best = q;
  }
  if (!best) return null;
  return { x: best.x, y: best.y, len: Math.max(best.w, best.l), wid: Math.min(best.w, best.l), angle: best.w >= best.l ? best.a : best.a + Math.PI / 2 };
}

// The churches without an outline of their own are fitted to a church of the
// tiles, so their tiles must be in (updateOmmelandLandmarks).
function prepareLandmarks(items, map) {
  const inside = (it) => edgeDistance(it.x, it.y) > 0;
  const churches = [], mills = [], other = [];
  for (const it of items) {
    if (!inside(it)) continue;
    if (it.k === 'church' || it.k === 'chapel') {
      const twin = churches.find((c) => near(c, it, 40));
      if (twin) {
        // one church: the outline from whichever has it, the name and tags from both
        if (!twin.n && it.n) twin.n = it.n;
        twin.t = { ...it.t, ...twin.t };
        if (!twin.o && it.o) { twin.o = it.o; twin.x = it.x; twin.y = it.y; }
        continue;
      }
      churches.push({ ...it, t: { ...it.t } });
    } else if (it.k === 'mill') {
      const twin = mills.find((m) => near(m, it, 20));
      if (twin) { if (!twin.n && it.n) twin.n = it.n; twin.t = { ...it.t, ...twin.t }; continue; }
      mills.push({ ...it, t: { ...it.t } });
    } else if (['tower', 'castle', 'farm', 'silo', 'factory', 'pakhuis', 'flat', 'townhall', 'station', 'school', 'museum'].includes(it.k)) other.push(it);
  }
  const out = [];
  for (const c of churches) {
    const p = landmarkParams(c, c.o ? null : churchBox(map, c.x, c.y));
    if (!p) continue;
    // tower to the west: the long axis pointing east
    if (Math.cos(p.angle) < 0) p.angle += Math.PI;
    if (p.wierde && wierdeOnRoad(p, map.roadsNear(p.x, p.y, wierdeRadius(p) + 8))) p.wierde = false; // (no mound over a street, #5)
    out.push(p);
  }
  for (const m of mills) out.push(landmarkParams(m));
  for (const t of other) {
    if (t.k === 'tower' && churches.some((c) => near(c, t, 45))) continue;
    out.push(landmarkParams(t));
  }
  return out.filter(Boolean);
}

// The tile building under a church, mill or borg kit is hidden while the kit stands (#338): the kit is the
// building there. Every second the kits within COVER_R of the focus look at the buildings on their footprint,
// so tiles that stream in later are covered too (setBuildingHidden: no mesh, out of the camera's collision set).
const COVER_R = 450, COVER_EVERY_MS = 1000;
let coverAt = 0;
const covered = new WeakSet(); // (a dropped tile's buildings go with it)
function coverBuildings(map, list, focus, hide) {
  const now = performance.now();
  if (!hide || now - coverAt < COVER_EVERY_MS) return;
  coverAt = now;
  for (const p of list) {
    if (!COVER_KINDS.has(p.kind) || Math.hypot(p.x - focus.x, p.y - focus.y) > COVER_R) continue;
    for (const b of map.buildingsNear(p.x, p.y, Math.max(p.len || 0, p.wid || 0) / 2 + 12)) {
      if (covered.has(b) || !kitCoversBuilding(p, b)) continue;
      covered.add(b);
      hide(b, true);
    }
  }
}

// Per frame from scene3d.js: loads the list once the tiles are in. hideBuilding: scene3d's setBuildingHidden.
export function updateOmmelandLandmarks(world, scene, focus, hideBuilding = null) {
  if (!world.map.store) return;
  if (!S) {
    S = { layer: null, list: null };
    window.__landmarkKits = S;
    fetch(new URL('landmarkkits.json', location.href).href).then((r) => (r.ok ? r.json() : null)).then(async (j) => {
      if (!j || !j.items) return;
      // a church without an outline of its own is fitted to the tiles' church there
      const lone = j.items.filter((it) => (it.k === 'church' || it.k === 'chapel') && !it.o).map((it) => [it.x, it.y]);
      S.list = await withTiles(world.map, lone, () => prepareLandmarks(j.items, world.map), { radius: 60, token: 'kits', slice: 6 });
      setKitList(S.list); // (the tiles' own church kits leave the churches of this list alone, #406)
      S.layer = createLandmarkLayer(scene, S.list);
    }).catch((e) => console.warn('landmark kits not loaded', e && e.message));
  }
  if (!S.layer) return;
  if (S.list && !window.__noLandmarkKits) coverBuildings(world.map, S.list, focus, hideBuilding);
  // (perf A/B: window.__noLandmarkKits)
  S.layer.group.visible = !window.__noLandmarkKits;
  if (window.__noLandmarkKits) return;
  const night = world.dayNight ? world.dayNight.night || 0 : 0;
  const h = typeof world.clock === 'number' ? world.clock : 12;
  // floodlights from dusk until midnight
  const flood = h >= 12 ? night : 0;
  // rain, mist and overcast: the skyline fades into the haze with the ground (#259)
  const wx = world.weather || {};
  const haze = Math.max(0, Math.min(1, Math.max(wx.intensity || 0, wx.mist || 0, (wx.overcast || 0) * 0.7)));
  S.layer.update(focus.x, focus.y, night, flood, world.time || 0, haze);
}

