import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { clamp, lerp } from './util.js';
import { playSikkomLine } from './audio.js';

const STORM_FOG_COLOR = new THREE.Color(0.35, 0.38, 0.42);
const LIGHTNING_COLOR = new THREE.Color(0.85, 0.88, 0.95);
const STORM_ZENITH_COLOR = new THREE.Color(0.2, 0.23, 0.27);
const STORM_MOOD = 0.65;
const _stormFog = new THREE.Color();
const RAIN_COLOR = new THREE.Color(0x9fb0bf);
const _stormZenith = new THREE.Color();

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
  rainMesh.position.set(px, 0, py);
  rainMesh.visible = t > 0.02;
  if (!rainMesh.visible) return;
  rainMesh.material.opacity = RAIN_OPACITY * Math.min(1, 0.5 + t);

  const count = Math.round(RAIN_COUNT * t);
  const wind = RAIN_WIND_SPEED * (0.4 + t * 0.6);
  const vx = Math.cos(w.windAngle) * wind, vz = Math.sin(w.windAngle) * wind;
  const vy = -RAIN_FALL_SPEED;
  const sx = vx * RAIN_STREAK_TIME, sy = vy * RAIN_STREAK_TIME, sz = vz * RAIN_STREAK_TIME;
  // horizontal "right" vector relative to the camera, so quads face it
  let rx = 1, rz = 0;
  if (cam) {
    const fx = px - cam.position.x, fz = py - cam.position.z;
    const fl = Math.hypot(fx, fz) || 1;
    rx = -fz / fl; rz = fx / fl;
  }
  const hx = rx * RAIN_STREAK_WIDTH * 0.5, hz = rz * RAIN_STREAK_WIDTH * 0.5;
  const R = RAIN_VOLUME_RADIUS;
  const drops = rainDrops;
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
    out[o] = x - hx; out[o + 1] = y; out[o + 2] = z - hz;
    out[o + 3] = x + hx; out[o + 4] = y; out[o + 5] = z + hz;
    out[o + 6] = x - hx + sx; out[o + 7] = y + sy; out[o + 8] = z - hz + sz;
    out[o + 9] = x + hx + sx; out[o + 10] = y + sy; out[o + 11] = z + hz + sz;
  }
  rainMesh.geometry.setDrawRange(0, count * 6);
  rainMesh.geometry.attributes.position.needsUpdate = true;
}

// Heavy storms only: a short double flash, returned as 0..1 for the caller
// to push onto lights/background.
const LIGHTNING_MIN_INTENSITY = 0.75;
const LIGHTNING_RATE = 0.12;
const LIGHTNING_DURATION = 0.35;
let lightningAge = Infinity;

function updateLightning(dt, t) {
  lightningAge += dt;
  if (t > LIGHTNING_MIN_INTENSITY && lightningAge > 2 && Math.random() < LIGHTNING_RATE * dt) lightningAge = 0;
  if (lightningAge > LIGHTNING_DURATION) return 0;
  const a = lightningAge;
  return a < 0.07 ? 1 : a < 0.14 ? 0.15 : Math.max(0, 0.8 * (1 - (a - 0.14) / (LIGHTNING_DURATION - 0.14)));
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
const STORM_CHANCE_MIN = 90, STORM_CHANCE_MAX = 180;
const STORM_DURATION_MIN = 20, STORM_DURATION_MAX = 40;
const RAMP_TIME = 9;
const TOPPLE_RANGE = 40;
const TOPPLE_THRESHOLD = 0.5;

function rollTimer() {
  return STORM_CHANCE_MIN + Math.random() * (STORM_CHANCE_MAX - STORM_CHANCE_MIN);
}

export function initWeather(world) {
  world.weather = {
    active: false,
    timer: rollTimer(),
    intensity: 0,
    windAngle: Math.random() * Math.PI * 2,
    duration: 0,
    elapsed: 0,
  };
}

export function updateWeather(dt, world) {
  const w = world.weather;

  if (!w.active) {
    w.intensity = Math.max(0, w.intensity - dt / RAMP_TIME);
    w.timer -= dt;
    if (w.timer <= 0) {
      w.active = true;
      w.elapsed = 0;
      w.duration = STORM_DURATION_MIN + Math.random() * (STORM_DURATION_MAX - STORM_DURATION_MIN);
      w.windAngle = Math.random() * Math.PI * 2;
      w.nextToppleAt = w.duration * (0.25 + Math.random() * 0.2);
      world.addMessage('Code Rood: storm boven Groningen, hou je fiets vast!', 4);
      if (world.phoneNotifications) {
        world.phoneNotifications.push({ text: 'SIKKOM: code rood, storm raast over Grunn', duration: 4 });
        playSikkomLine('weather_storm_start');
      }
    }
    return;
  }

  w.elapsed += dt;
  const fadeStart = w.duration - RAMP_TIME;
  const target = w.elapsed > fadeStart ? 0 : 1;
  const rate = dt / RAMP_TIME;
  w.intensity = target > w.intensity ? Math.min(1, w.intensity + rate) : Math.max(0, w.intensity - rate);

  if (w.intensity > TOPPLE_THRESHOLD && w.elapsed >= w.nextToppleAt) {
    w.nextToppleAt = w.elapsed + w.duration / (3 + Math.random() * 2);
    toppleRandomBike(world);
  }

  if (w.elapsed >= w.duration) {
    w.active = false;
    w.timer = rollTimer();
    world.addMessage('Storm trekt weg, Groningen droogt weer op.', 3);
    if (world.phoneNotifications) {
      world.phoneNotifications.push({ text: 'SIKKOM: storm trekt weg, Groningen droogt weer op', duration: 4 });
      playSikkomLine('weather_storm_end');
    }
  }
}

function toppleRandomBike(world) {
  const player = world.player;
  const nearby = world.vehicles.filter(
    (v) => v.isBike && !v.wrecked && Math.hypot(v.x - player.x, v.y - player.y) < TOPPLE_RANGE
  );
  if (!nearby.length) return;
  const v = nearby[Math.floor(Math.random() * nearby.length)];
  v.angle += (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.9);
  v.speed = 0;
}

export function applyWeatherToScene3D(scene, renderer, world, dt, px, py, cam = null) {
  const w = world.weather;
  if (!w) return;
  const t = clamp(w.intensity, 0, 1);

  if (!rainMesh) {
    rainMesh = buildRain();
    scene.add(rainMesh);
  }
  updateRain(dt, world, px, py, cam);
  const flash = updateLightning(dt, w.active ? t : 0);
  const moodT = t * STORM_MOOD;
  scene.userData.lightningFlash = flash;

  // Base (clear-weather) mood is written by scene3d every frame from the
  // day/night cycle; storm colours darken with it so night storms stay dark.
  const base = scene.userData.lightBase;
  if (!base) return;
  const dayK = 0.14 + 0.86 * base.daylight;
  rainMesh.material.color.copy(RAIN_COLOR).multiplyScalar(0.3 + 0.7 * base.daylight);
  _stormFog.copy(STORM_FOG_COLOR).multiplyScalar(dayK);
  _stormZenith.copy(STORM_ZENITH_COLOR).multiplyScalar(dayK);

  if (scene.fog) {
    scene.fog.color.copy(base.fog).lerp(_stormFog, moodT).lerp(LIGHTNING_COLOR, flash * 0.5);
    scene.fog.near = lerp(base.fogNear, base.fogNear * 0.4, t);
    scene.fog.far = lerp(base.fogFar, base.fogFar * 0.45, t);
  }
  if (scene.background && scene.background.isColor) {
    scene.background.copy(base.fog).lerp(_stormFog, moodT).lerp(LIGHTNING_COLOR, flash * 0.6);
  }

  const sky = scene.userData.sky;
  if (sky) {
    const u = sky.uniforms;
    u.uZenith.value.copy(base.zenith).lerp(_stormZenith, t * 0.9).lerp(LIGHTNING_COLOR, flash * 0.6);
    u.uHorizon.value.copy(base.horizon).lerp(_stormFog, t * 0.9).lerp(LIGHTNING_COLOR, flash * 0.5);
    u.uSunStrength.value = base.sunStrength * (1 - t);
    if (u.uGlow) u.uGlow.value = base.glow * (1 - t);
  }

  if (!scene.userData._weatherLights) {
    scene.userData._weatherLights = scene.children.filter((o) => o && (o.type === 'DirectionalLight' || o.type === 'HemisphereLight'));
  }
  // Overcast kills most direct sun (and so the shadows) but keeps sky fill.
  for (const obj of scene.userData._weatherLights) {
    if (obj.userData._weatherBaseIntensity === undefined) obj.userData._weatherBaseIntensity = obj.intensity;
    const sunLight = obj.type === 'DirectionalLight';
    obj.intensity = obj.userData._weatherBaseIntensity * (1 - t * (sunLight ? 0.85 : 0.35)) + flash * (sunLight ? 3 : 1.2);
  }
}
