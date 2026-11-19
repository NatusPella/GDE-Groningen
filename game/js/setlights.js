// Lights of a built set (Tessa's kitchen, the loket, the office, a room) borrow a lamp of the night rig instead of
// being extra lights in the scene. three compiles one program per light count (numPointLights is part of the key), so a
// set that appears or hides (the kitchen shots of the opening film, a mission set) used to make every material in view
// link a second program set at its first frame: ~110 programs and the 2-4 s hitches at the first kitchen shot
// (docs/PERF-PLEISTERS.md, scripts/perf/programs.mjs). The set keeps its own PointLight objects (it animates them as
// before) but they are not drawn: every frame their colour, range, decay, position and intensity are copied onto the last
// lamps of the night rig's pool, which are in the scene anyway (the rig on/off variants are already prewarmed).
// Without a free pool lamp (quality 'laag' has none) or outside the game scene the light stays a real one.
const proxies = [];
const DETACHED_FRAMES = 300;

export function adoptSetLight(light) {
  if (light && !proxies.includes(light)) { light.userData.setDetached = 0; proxies.push(light); }
  return light;
}
export const adoptedSetLights = () => proxies;

// 1: in the scene and not hidden by a parent, 0: hidden by a parent, -1: not in this scene
function placeOf(o, scene) {
  let vis = true;
  for (let n = o; n; n = n.parent) {
    if (n === scene) return vis ? 1 : 0;
    if (n !== o && n.visible === false) vis = false;
  }
  return -1;
}

// pool: the night rig's point lights (lamp assignment first, so the borrowed ones come from the end). Returns how many were borrowed.
export function syncSetLights(scene, pool, list = proxies) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    if (placeOf(p, scene) >= 0) { p.userData.setDetached = 0; continue; }
    p.visible = true;
    if (++p.userData.setDetached > DETACHED_FRAMES) list.splice(i, 1);
  }
  let k = 0;
  for (const p of list) {
    const place = placeOf(p, scene);
    if (place < 0) continue;
    if (place === 0) { p.visible = false; continue; }
    if (k >= pool.length) { p.visible = true; continue; }
    p.visible = false;
    const pl = pool[pool.length - 1 - k++];
    const ud = pl.userData;
    if (!ud.setOrig) ud.setOrig = { c: pl.color.clone(), d: pl.distance, e: pl.decay };
    ud.lamp = null;
    pl.color.copy(p.color);
    pl.distance = p.distance;
    pl.decay = p.decay;
    p.updateWorldMatrix(true, false);
    pl.position.setFromMatrixPosition(p.matrixWorld);
    pl.intensity = p.intensity;
  }
  for (let j = pool.length - 1 - k; j >= 0; j--) {
    const ud = pool[j].userData;
    if (!ud.setOrig) continue;
    pool[j].color.copy(ud.setOrig.c); pool[j].distance = ud.setOrig.d; pool[j].decay = ud.setOrig.e;
    pool[j].intensity = 0;
    ud.setOrig = null;
  }
  return k;
}
