import { REAL, RTILE, buildingsInTile } from './countryreal.js';
import { edgeDistance } from './countryfield.js';
import { landmarkParams } from './landmarkkit.js';
import { createLandmarkLayer } from './landmarklayer3d.js';
import { setSkylineChurches } from './countryskyline.js';

// The landmark kits in today's Ommeland (LK1): the candidates from
// game/landmarkkits.json (scripts/add_landmark_kits.py) outside the city
// map, a church's node and outline merged, a church tower mapped on its
// own left to its church, mills mapped twice once; a church without an
// outline fitted to its OSM building box. They replace the skyline's
// church templates. The city keeps its own landmarks.

let S = null;

function near(a, b, r) { return Math.hypot(a.x - b.x, a.y - b.y) < r; }

// the church box of the building data (code 7) nearest to (x, y), as a fit
function churchBox(x, y) {
  let best = -1, ba = 0;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      for (const i of buildingsInTile(Math.floor(x / RTILE) + ox, Math.floor(y / RTILE) + oy) || []) {
        if (REAL.code[i] !== 7 || Math.hypot(REAL.bx[i] - x, REAL.by[i] - y) > 35) continue;
        const a = REAL.bw[i] * REAL.bl[i];
        if (a > ba) { ba = a; best = i; }
      }
    }
  }
  if (best < 0) return null;
  const w = REAL.bw[best], l = REAL.bl[best];
  return { x: REAL.bx[best], y: REAL.by[best], len: Math.max(w, l), wid: Math.min(w, l), angle: w >= l ? REAL.ba[best] : REAL.ba[best] + Math.PI / 2 };
}

export function prepareLandmarks(items) {
  const [x0, y0, x1, y1] = REAL.ext;
  const inside = (it) => it.x > x0 && it.x < x1 && it.y > y0 && it.y < y1 && edgeDistance(it.x, it.y) > 0;
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
    } else if (it.k === 'tower' || it.k === 'castle') other.push(it);
  }
  const out = [];
  for (const c of churches) {
    const p = landmarkParams(c, c.o ? null : churchBox(c.x, c.y));
    if (!p) continue;
    // tower to the west: the long axis pointing east
    if (Math.cos(p.angle) < 0) p.angle += Math.PI;
    out.push(p);
  }
  for (const m of mills) out.push(landmarkParams(m));
  for (const t of other) {
    if (t.k === 'tower' && churches.some((c) => near(c, t, 45))) continue;
    out.push(landmarkParams(t));
  }
  return out.filter(Boolean);
}

// Per frame from scene3d.js: loads the list once the real Ommeland is in.
export function updateOmmelandLandmarks(world, scene, focus) {
  if (!REAL.ready) return;
  if (!S) {
    S = { layer: null, list: null };
    window.__landmarkKits = S;
    fetch(new URL('landmarkkits.json', location.href).href).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (!j || !j.items) return;
      S.list = prepareLandmarks(j.items);
      // their church boxes leave the countryside's buildings (countryside.js, realmap.js)
      const churchy = S.list.filter((p) => p.kit === 'church');
      const old = REAL.churchNear;
      REAL.churchNear = (x, y) => (old && old(x, y)) || churchy.some((p) => Math.abs(p.x - x) < 35 && Math.abs(p.y - y) < 35 && Math.hypot(p.x - x, p.y - y) < 35);
      S.layer = createLandmarkLayer(scene, S.list);
      setSkylineChurches(false);
    }).catch((e) => console.warn('landmark kits not loaded', e && e.message));
  }
  if (!S.layer) return;
  // (perf A/B: window.__noLandmarkKits)
  S.layer.group.visible = !window.__noLandmarkKits;
  if (window.__noLandmarkKits) return;
  const night = world.dayNight ? world.dayNight.night || 0 : 0;
  const h = typeof world.clock === 'number' ? world.clock : 12;
  // floodlights from dusk until midnight
  const flood = h >= 12 ? night : 0;
  S.layer.update(focus.x, focus.y, night, flood, world.time || 0);
}

export function ommelandLandmarkStats() {
  return S && S.layer ? { ...S.layer.stats(), kits: S.list.reduce((a, p) => { a[p.kit] = (a[p.kit] || 0) + 1; return a; }, {}) } : null;
}
