import { hoofdspeler } from './players.js';
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { clamp, lerp } from './util.js';
import { playSikkomLine } from './audio.js';
import { getSettings } from './settings.js';
import { regenDruppels } from './weerlook.js';
import { streekZonHoogte } from './weerdag.js';
import { easeTo, rainFade, flashGain } from './weersmooth.js';
import { updateSummerFlies } from './summerflies3d.js';
import { updateWorldLife } from './worldlife3d.js'; // wereld levend (21-11): dagelijkse evenementen en dieren, 3 instanced meshes
import { summerLayer, combineSummer, rainbowStrength } from './summerday.js'; // zomervariatie per kalenderdag (21-11)
import { createWeatherState, stepWeather, regionWeather, regionAt } from './weatherstate.js';
import { areaMoodWeights, areaMoodLook, MOOD_EASE_S } from './areamood.js'; // streeksfeer (22-11): Waddenkust, Lauwersmeer, Veenkoloniën
import { qualityLook, regionHaze, sunGlow, createStormPlanner, stepStorm, flashAt, mistAtHeight, MIST_NEAR, MIST_FAR, SKYLINE_FOG, skylineFogCaps } from './weatherlook.js';

const STORM_FOG_COLOR = new THREE.Color(0.35, 0.38, 0.42);
const LIGHTNING_COLOR = new THREE.Color(0.85, 0.88, 0.95);
const STORM_ZENITH_COLOR = new THREE.Color(0.2, 0.23, 0.27);
const STORM_MOOD = 0.65;
const _stormFog = new THREE.Color();
const RAIN_COLOR = new THREE.Color(0x9fb0bf);
const _stormZenith = new THREE.Color();
const MIST_COLOR = new THREE.Color(0.66, 0.69, 0.72);
const _mist = new THREE.Color();
const _skyCaps = {};
const _glow = new THREE.Color();

// Rain: a fixed box of streaks centred on the player every frame rather than
// a per-drop world simulation. Each drop is a thin quad stretched along its
// own fall+wind velocity and turned side-on to the camera (1px GL lines
// vanish on HiDPI screens); drops that hit the ground respawn at the top and
// wrap horizontally, so nothing is reallocated. Heavier storms draw more of
// the pool.
const RAIN_VOLUME_RADIUS = 17;
const RAIN_HEIGHT = 14;
const RAIN_COUNT = 2500;
const RAIN_FALL_SPEED = 19;
const RAIN_WIND_SPEED = 6;
const RAIN_STREAK_TIME = 0.045;
const RAIN_STREAK_WIDTH = 0.035;
const RAIN_OPACITY = 0.6;
// streaks near the lens shrink to nothing: a 0.9 m streak at 1 m from the camera is a white pole across the picture (#258)
const RAIN_NEAR = 4;
const RAIN_NEAR_MIN = 1;
let rainMesh = null;
let rainDrops = null;

function buildRain() {
  rainDrops = new Float32Array(RAIN_COUNT * 3);
  const index = new Uint16Array(RAIN_COUNT * 6);
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainDrops[i * 3] = (Math.random() - 0.5) * RAIN_VOLUME_RADIUS * 2;
    rainDrops[i * 3 + 1] = Math.random() * RAIN_HEIGHT;
    rainDrops[i * 3 + 2] = (Math.random() - 0.5) * RAIN_VOLUME_RADIUS * 2;
    const v = i * 4, o = i * 6;
    index[o] = v; index[o + 1] = v + 1; index[o + 2] = v + 2;
    index[o + 3] = v + 2; index[o + 4] = v + 1; index[o + 5] = v + 3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAIN_COUNT * 12), 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  const mat = new THREE.MeshBasicMaterial({
    color: RAIN_COLOR, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return mesh;
}

function updateRain(dt, world, px, py, cam) {
  const w = world.weather;
  const t = clamp(w ? w.intensity : 0, 0, 1);
  // The title-screen camera hangs far above the player, so the rain box
  // follows the lens instead: entirely in front of it (no giant streaks on the lens).
  let camSide = null;
  if (world.menuCam && cam) {
    const dx = px - cam.position.x, dz = py - cam.position.z;
    const dl = Math.hypot(dx, dz) || 1;
    const ahead = RAIN_VOLUME_RADIUS + 3;
    px = cam.position.x + dx / dl * ahead;
    py = cam.position.z + dz / dl * ahead;
    rainMesh.position.set(px, cam.position.y - RAIN_HEIGHT * 0.8, py);
    camSide = [-dz / dl, dx / dl];
  } else {
    rainMesh.position.set(px, 0, py);
  }
  rainMesh.visible = t > 0.02;
  if (!rainMesh.visible) return;
  rainMesh.material.opacity = RAIN_OPACITY * Math.min(1, 0.5 + t) * rainFade(t);

  // aantal druppels per kwaliteitsprofiel (weerlook.js), nooit meer dan de pool
  const count = Math.min(RAIN_COUNT, regenDruppels(t, getSettings().quality));
  const wind = RAIN_WIND_SPEED * (0.4 + t * 0.6);
  const vx = Math.cos(w.windAngle) * wind, vz = Math.sin(w.windAngle) * wind;
  const vy = -RAIN_FALL_SPEED;
  const sx = vx * RAIN_STREAK_TIME, sy = vy * RAIN_STREAK_TIME, sz = vz * RAIN_STREAK_TIME;
  // horizontal "right" vector relative to the camera, so quads face it
  let rx = 1, rz = 0;
  if (camSide) {
    [rx, rz] = camSide;
  } else if (cam) {
    const fx = px - cam.position.x, fz = py - cam.position.z;
    const fl = Math.hypot(fx, fz) || 1;
    rx = -fz / fl; rz = fx / fl;
  }
  const hx = rx * RAIN_STREAK_WIDTH * 0.5, hz = rz * RAIN_STREAK_WIDTH * 0.5;
  const R = RAIN_VOLUME_RADIUS;
  const drops = rainDrops;
  const mx = rainMesh.position.x, my = rainMesh.position.y, mz = rainMesh.position.z;
  const cx = cam ? cam.position.x : 0, cy = cam ? cam.position.y : 0, cz = cam ? cam.position.z : 0;
  const out = rainMesh.geometry.attributes.position.array;
  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    let x = drops[ix] + vx * dt, y = drops[ix + 1] + vy * dt, z = drops[ix + 2] + vz * dt;
    if (y < 0) {
      y += RAIN_HEIGHT;
      x = (Math.random() - 0.5) * R * 2;
      z = (Math.random() - 0.5) * R * 2;
    }
    if (x > R) x -= R * 2; else if (x < -R) x += R * 2;
    if (z > R) z -= R * 2; else if (z < -R) z += R * 2;
    drops[ix] = x; drops[ix + 1] = y; drops[ix + 2] = z;
    const o = i * 12;
    let f = 1;
    if (cam) {
      const ddx = mx + x - cx, ddy = my + y - cy, ddz = mz + z - cz, d2 = ddx * ddx + ddy * ddy + ddz * ddz;
      if (d2 < RAIN_NEAR * RAIN_NEAR) { const d = Math.sqrt(d2); f = d <= RAIN_NEAR_MIN ? 0 : (d - RAIN_NEAR_MIN) / (RAIN_NEAR - RAIN_NEAR_MIN); }
    }
    const fx = hx * f, fz = hz * f, fsx = sx * f, fsy = sy * f, fsz = sz * f;
    out[o] = x - fx; out[o + 1] = y; out[o + 2] = z - fz;
    out[o + 3] = x + fx; out[o + 4] = y; out[o + 5] = z + fz;
    out[o + 6] = x - fx + fsx; out[o + 7] = y + fsy; out[o + 8] = z - fz + fsz;
    out[o + 9] = x + fx + fsx; out[o + 10] = y + fsy; out[o + 11] = z + fz + fsz;
  }
  rainMesh.geometry.setDrawRange(0, count * 6);
  rainMesh.geometry.attributes.position.needsUpdate = true;
}

// Heavy storms only: a short double flash, returned as 0..1 for the caller
// to push onto lights/background.
let lightningAge = Infinity;
let lightningFlashes = 1;
let lightningGain = 1;
let lightningStrikes = 0;
const storm = createStormPlanner((Math.random() * 0x7fffffff) | 0);

// weatherlook.js plans the strikes (distance, flickers); the thunder in
// ambience.js reads scene.userData.lightningDistance to time its rumble.
function updateLightning(dt, t, quality, scene) {
  lightningAge += dt;
  for (const s of stepStorm(storm, dt, t, quality)) {
    lightningAge = 0;
    lightningFlashes = s.flashes;
    lightningGain = flashGain(s.dist); // een inslag ver weg flitst zwakker
    scene.userData.lightningDistance = s.dist;
    // een teller per inslag: de donder (ambience.js) rolt een keer per inslag, niet een keer per flikkering
    scene.userData.lightningStrikes = ++lightningStrikes;
  }
  return flashAt(lightningAge, lightningFlashes) * lightningGain;
}

// world.weather fields (read by scene3d.js's 3D pass for fog/lighting mood,
// and by applyWeatherToScene3D below):
//   active     bool  - a storm is currently ramping up, holding, or fading
//   timer      sec   - countdown to the next storm-start roll while !active
//   intensity  0-1   - smoothly eased in/out, drives both the 2D overlay and
//                      whatever the 3D pass wants to darken/fog
//   windAngle  rad   - rain streak direction, 0 = blowing toward +x (east)
//   duration   sec   - how long the current storm holds before fading (set
//                      on start, used internally to time the toppled-bike
//                      throttling; harmless to ignore from outside)
//   elapsed    sec   - time since the current storm started (internal)
//   overcast   0-1   - optional grey sky without rain (title screen shots)
//   mist       0-1   - optional ground fog without rain (title screen shots)
const DRY_MIN = 150, DRY_MAX = 390;
// Most showers are just rain; only the rare full storm is a "code rood".
// peak = target intensity (lightning starts ~0.75, rain density scales with it).
const WEATHER_KINDS = [
  { kind: 'motregen', weight: 45, peak: 0.3, dur: [40, 90] },
  { kind: 'regenbui', weight: 35, peak: 0.6, dur: [40, 80] },
  { kind: 'onweer', weight: 15, peak: 0.85, dur: [50, 90] },
  { kind: 'storm', weight: 5, peak: 1, dur: [30, 55] },
];

// The game is always summer (calendar.js; after the story the nazomer
// holds): longer dry spells, the odd shower, no full storms.
const summer = (world) => !!world;

function pickWeatherKind(world) {
  const kinds = summer(world) ? WEATHER_KINDS.filter((k) => k.kind !== 'storm') : WEATHER_KINDS;
  let r = Math.random() * kinds.reduce((sum, k) => sum + k.weight, 0);
  for (const k of kinds) { r -= k.weight; if (r <= 0) return k; }
  return kinds[0];
}
const RAMP_TIME = 9;
const TOPPLE_RANGE = 40;
const TOPPLE_THRESHOLD = 0.5;

function rollTimer(world) {
  return (DRY_MIN + Math.random() * (DRY_MAX - DRY_MIN)) * (summer(world) ? 1.8 : 1);
}

export function initWeather(world) {
  world.weather = {
    active: false,
    timer: rollTimer(world),
    intensity: 0,
    windAngle: Math.random() * Math.PI * 2,
    duration: 0,
    elapsed: 0,
  };
  // The province's weather (weatherstate.js, pure): one machine for all
  // regions; the player's region drives world.weather. Not saved.
  world.weatherState = createWeatherState((Math.random() * 0x7fffffff) | 0);
}

// Forced weather (trailer shots, the storm cheat) keeps the hand-set path below.
const forcedWeather = (w) => w.timer >= 1e8 || (w.active && w.kind === 'storm');

const _summerWeather = {};
function followRegionWeather(dt, world, w) {
  if (!world.weatherState) world.weatherState = createWeatherState((Math.random() * 0x7fffffff) | 0);
  const p = hoofdspeler(world);
  const region = p ? regionAt(p.x, p.y) : 'stad';
  // samen spelen (#364): een gast volgt het weer van de gastheer (coopweer.js) en stapt zijn eigen machine niet
  if (world.coopRole !== 'client') stepWeather(world.weatherState, dt, typeof world.clock === 'number' ? world.clock : 12);
  // zomervariatie (21-11): een pure functie van kalenderdag en klok, bij elke speler gelijk en zonder netwerkverkeer
  const calDay = world.calendar && Number.isFinite(world.calendar.day) ? world.calendar.day : 1;
  w.summer = summerLayer(calDay, typeof world.clock === 'number' ? world.clock : 12, w.summer || {});
  const r = combineSummer(regionWeather(world.weatherState, region), w.summer, region, _summerWeather);
  const was = w.kind;
  const step = dt / RAMP_TIME;
  w.intensity = r.rain > w.intensity ? Math.min(r.rain, w.intensity + step) : Math.max(r.rain, w.intensity - step);
  w.kind = r.kind;
  w.peak = r.rain;
  w.active = w.intensity > 0.02;
  // bewolking en mist schuiven mee naar de regio waar je staat: een regiogrens of een gastheerbericht is geen sprong in de lucht
  w.overcast = w.overcast === undefined ? r.overcast : easeTo(w.overcast, r.overcast, dt);
  w.mist = w.mist === undefined ? r.mist : easeTo(w.mist, r.mist, dt);
  w.windAngle = r.windAngle;
  w.windStrength = r.windStrength;
  w.timer = 60;
  if (r.kind === 'onweer' && was !== 'onweer' && region === 'stad') world.addMessage('Onweer boven de Stad', 3);
}

// --- wet roads for the driving model -----------------------------------------
// w.wet follows the rain the way the ground shaders' uWet does (wet in ~6 s,
// dry in ~40 s), and puddleAt mirrors their puddle noise (terrain3d.js
// WET_GLSL, without the per-surface dip) so the slippery spots are the ones
// you see.

function fract(x) { return x - Math.floor(x); }
function wHash(x, y) {
  let a = fract(x * 0.1031), b = fract(y * 0.1031), c = fract(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fract((a + b) * c);
}
function wNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = wHash(ix, iy), b = wHash(ix + 1, iy), c = wHash(ix, iy + 1), d = wHash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function puddleAt(x, y, wet) {
  if (wet < 0.02) return 0;
  const p = wNoise(x * 0.21, y * 0.21) * 0.7 + wNoise(x * 0.83, y * 0.83) * 0.3;
  return smoothstep(0.74 - 0.12 * wet, 0.8 - 0.12 * wet, p) * wet;
}

// Tyre grip 0..1 at (x, y): a wet road loses a little, standing water a lot.
export function roadGrip(world, x, y, surface) {
  const wet = world.weather ? world.weather.wet || 0 : 0;
  if (surface === 'gras') return 0.85 - 0.2 * wet;
  const g = (surface === 'klinkers' ? 1 - 0.22 * wet : 1 - 0.15 * wet) - 0.55 * puddleAt(x, y, wet);
  return clamp(g, 0.3, 1);
}

export function updateWeather(dt, world) {
  const w = world.weather;
  const rainK = clamp(w.intensity, 0, 1);
  w.wet = (w.wet || 0) + (rainK - (w.wet || 0)) * Math.min(1, dt / (rainK > (w.wet || 0) ? 6 : 40));

  if (!forcedWeather(w)) { followRegionWeather(dt, world, w); return; }

  if (!w.active) {
    w.intensity = Math.max(0, w.intensity - dt / RAMP_TIME);
    w.timer -= dt;
    if (w.timer <= 0) {
      const k = pickWeatherKind(world);
      w.active = true;
      w.kind = k.kind;
      w.peak = k.peak;
      w.elapsed = 0;
      w.duration = k.dur[0] + Math.random() * (k.dur[1] - k.dur[0]);
      w.windAngle = Math.random() * Math.PI * 2;
      w.nextToppleAt = w.duration * (0.25 + Math.random() * 0.2);
      if (k.kind === 'storm') {
        world.addMessage('Code Rood: storm boven Grunn, hou je fiets vast!', 4);
        if (world.phoneNotifications) {
          world.phoneNotifications.push({ text: 'KIEKDOAR: code rood, storm raast over Grunn', duration: 4, voiced: true });
          playSikkomLine('weather_storm_start');
        }
      } else if (k.kind === 'onweer') {
        world.addMessage('Onweer boven Grunn', 3);
      }
    }
    return;
  }

  w.elapsed += dt;
  const fadeStart = w.duration - RAMP_TIME;
  const target = w.elapsed > fadeStart ? 0 : (w.peak ?? 1);
  const rate = dt / RAMP_TIME;
  w.intensity = target > w.intensity ? Math.min(target, w.intensity + rate) : Math.max(target, w.intensity - rate);

  if (w.kind === 'storm' && w.intensity > TOPPLE_THRESHOLD && w.elapsed >= w.nextToppleAt) {
    w.nextToppleAt = w.elapsed + w.duration / (3 + Math.random() * 2);
    toppleRandomBike(world);
  }

  if (w.elapsed >= w.duration) {
    w.active = false;
    w.timer = rollTimer(world);
    if (w.kind === 'storm') {
      world.addMessage('Storm trekt weg, Grunn droogt weer op.', 3);
      if (world.phoneNotifications) {
        world.phoneNotifications.push({ text: 'KIEKDOAR: storm trekt weg, Groningen droogt weer op', duration: 4, voiced: true });
        playSikkomLine('weather_storm_end');
      }
    }
  }
}

function toppleRandomBike(world) {
  const player = hoofdspeler(world);
  const nearby = world.vehicles.filter(
    (v) => v.isBike && !v.wrecked && Math.hypot(v.x - player.x, v.y - player.y) < TOPPLE_RANGE
  );
  if (!nearby.length) return;
  const v = nearby[Math.floor(Math.random() * nearby.length)];
  v.angle += (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.9);
  v.speed = 0;
}

// region mood (areamood.js): the eased weights of the local view and the look they give; reused every frame
const _moodTarget = { wad: 0, lauwers: 0, veen: 0 }, _moodW = { wad: NaN, lauwers: NaN, veen: NaN }; // NaN: the first frame takes the target at once (easeTo)
const _mood = { tint: [1, 1, 1], haze: 0, glow: 1 };
const _moodTint = new THREE.Color(1, 1, 1);
const _moodZenith = new THREE.Color(1, 1, 1);
const MOOD_ZENITH_K = 0.6; // het deel van de streektint dat ook het zenit kleurt (#1291)

export function applyWeatherToScene3D(scene, renderer, world, dt, px, py, cam = null) {
  const w = world.weather;
  if (!w) return;
  const t = clamp(w.intensity, 0, 1);

  if (!rainMesh) {
    rainMesh = buildRain();
    scene.add(rainMesh);
  }
  updateRain(dt, world, px, py, cam);
  updateSummerFlies(scene, w.summer ? w.summer.flies : 0, cam, dt);
  updateWorldLife(scene, world, px, py, dt);
  const quality = getSettings().quality;
  const flash = updateLightning(dt, w.active ? t : 0, quality, scene);
  const region = hoofdspeler(world) ? regionAt(hoofdspeler(world).x, hoofdspeler(world).y) : 'stad';
  const mist = clamp((w.mist || 0) * qualityLook(quality).mist * regionHaze(region).mistK, 0, 1);
  const cloud = Math.max(t, clamp(w.overcast || 0, 0, 1), mist * 0.6);
  const moodT = cloud * STORM_MOOD;
  scene.userData.lightningFlash = flash;
  // the mood of the spot this view stands on (px, py: the local view, not a fixed player), eased so a jump does not snap
  areaMoodWeights(px, py, _moodTarget);
  _moodW.wad = easeTo(_moodW.wad, _moodTarget.wad, dt, MOOD_EASE_S);
  _moodW.lauwers = easeTo(_moodW.lauwers, _moodTarget.lauwers, dt, MOOD_EASE_S);
  _moodW.veen = easeTo(_moodW.veen, _moodTarget.veen, dt, MOOD_EASE_S);
  areaMoodLook(_moodW, world.dayNight ? world.dayNight.sunElevation : 30, _mood);
  _moodTint.setRGB(_mood.tint[0], _mood.tint[1], _mood.tint[2]);
  _moodZenith.setRGB(1 + (_mood.tint[0] - 1) * MOOD_ZENITH_K, 1 + (_mood.tint[1] - 1) * MOOD_ZENITH_K, 1 + (_mood.tint[2] - 1) * MOOD_ZENITH_K);
  scene.userData.areaMood = _mood;

  // Base (clear-weather) mood is written by scene3d every frame from the
  // day/night cycle; storm colours darken with it so night storms stay dark.
  const base = scene.userData.lightBase;
  if (!base) return;
  const dayK = 0.14 + 0.86 * base.daylight;
  rainMesh.material.color.copy(RAIN_COLOR).multiplyScalar(0.3 + 0.7 * base.daylight);
  _stormFog.copy(STORM_FOG_COLOR).multiplyScalar(dayK);
  _stormZenith.copy(STORM_ZENITH_COLOR).multiplyScalar(dayK);
  _mist.copy(MIST_COLOR).multiplyScalar(0.08 + 0.92 * base.daylight);

  const caps = skylineFogCaps(mist, _skyCaps);
  SKYLINE_FOG.capNear.value = caps.capNear;
  SKYLINE_FOG.capFar.value = caps.capFar;
  if (scene.fog) {
    // #866: mist 0,7 zette het zicht op ~50 m en maakte een hoog beeld helemaal
    // wit. De mist blijft (kleur en sfeer ongewijzigd), maar met een zichtbodem:
    // dichtbij nooit onder ~16 m en in de verte nooit onder ~220 m, zodat de
    // wereld ook in dichte mist leesbaar blijft.
    const fogBaseNear = lerp(base.fogNear, base.fogNear * 0.4, t);
    const fogBaseFar = lerp(base.fogFar, base.fogFar * 0.45, t) * (1 - _mood.haze);
    // #866: vanaf een hoog beeld (camera ver boven de straat) dempt de mist mee, anders
    // verdwijnt de hele wereld achter de dichtstbijzijnde mistlaag.
    const fogMist = mistAtHeight(mist, cam && cam.position ? cam.position.y : 0);
    scene.fog.color.copy(base.fog).multiply(_moodTint).lerp(_stormFog, moodT).lerp(_mist, mist).lerp(LIGHTNING_COLOR, flash * 0.5);
    scene.fog.near = lerp(fogBaseNear, Math.max(MIST_NEAR, fogBaseNear * 0.25), fogMist);
    scene.fog.far = lerp(fogBaseFar, Math.max(MIST_FAR, fogBaseFar * 0.45), fogMist);
  }
  if (scene.background && scene.background.isColor) {
    scene.background.copy(base.fog).multiply(_moodTint).lerp(_stormFog, moodT).lerp(_mist, mist).lerp(LIGHTNING_COLOR, flash * 0.6);
  }

  const sky = scene.userData.sky;
  if (sky) {
    const u = sky.uniforms;
    // #1291 (hertest 24-11): ook de lucht boven je krijgt de streekkleur (zachter dan de horizon), anders is de avondlucht overal hetzelfde roze
    u.uZenith.value.copy(base.zenith).multiply(_moodZenith).lerp(_stormZenith, cloud * 0.9).lerp(_mist, mist * 0.85).lerp(LIGHTNING_COLOR, flash * 0.6);
    u.uHorizon.value.copy(base.horizon).multiply(_moodTint).lerp(_stormFog, cloud * 0.9).lerp(_mist, mist).lerp(LIGHTNING_COLOR, flash * 0.5);
    // #840: een regenboog na een bui, zacht en alleen als de lucht weer opklaart.
    if (u.uSunDir && u.uRainbow) {
      const regenboog = clamp(((w.wet || 0) - 0.35) / 0.3, 0, 1) * (1 - clamp(t * 4, 0, 1)) * (1 - clamp((w.overcast || 0) * 1.5, 0, 1));
      u.uRainbow.value = regenboog * 0.35;
      if (w.summer) u.uRainbow.value = rainbowStrength(u.uRainbow.value, w.summer); // summerday.js: ook een regenboog na de bui van de dag
      u.uRainbowDir.value.copy(u.uSunDir.value).multiplyScalar(-1);
    }
    const glow = sunGlow(world.dayNight ? streekZonHoogte(region, world.dayNight.hour) : 30, cloud);
    if (glow.strength > 0.01) {
      _glow.setRGB(glow.color[0], glow.color[1], glow.color[2]);
      u.uHorizon.value.lerp(_glow, Math.min(0.5, glow.strength * 0.35 * _mood.glow));
    }
    u.uSunStrength.value = base.sunStrength * (1 - cloud);
    if (u.uGlow) u.uGlow.value = base.glow * (1 - cloud);
  }

  if (!scene.userData._weatherLights) {
    scene.userData._weatherLights = scene.children.filter((o) => o && (o.type === 'DirectionalLight' || o.type === 'HemisphereLight'));
  }
  // Overcast kills most direct sun (and so the shadows) but keeps sky fill.
  for (const obj of scene.userData._weatherLights) {
    if (obj.userData._weatherBaseIntensity === undefined) obj.userData._weatherBaseIntensity = obj.intensity;
    const sunLight = obj.type === 'DirectionalLight';
    obj.intensity = obj.userData._weatherBaseIntensity * (1 - cloud * (sunLight ? 0.85 : 0.35)) + flash * (sunLight ? 3 : 1.2);
  }
}

