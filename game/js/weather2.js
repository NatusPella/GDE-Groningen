import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { clamp, lerp } from './util2.js';

const STORM_FOG_COLOR = new THREE.Color(0.35, 0.38, 0.42);

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
const RAMP_TIME = 4;
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

export function applyWeatherToScene3D(scene, renderer, world) {
  const w = world.weather;
  if (!w) return;
  const t = clamp(w.intensity, 0, 1);

  if (scene && scene.fog) {
    if (!scene.userData._weatherBaseFog) {
      scene.userData._weatherBaseFog = {
        color: scene.fog.color ? scene.fog.color.clone() : null,
        near: scene.fog.near,
        far: scene.fog.far,
        density: scene.fog.density,
      };
    }
    const base = scene.userData._weatherBaseFog;
    if (scene.fog.color && base.color) {
      scene.fog.color.copy(base.color).lerp(STORM_FOG_COLOR, t * 0.6);
    }
    if (typeof base.near === 'number') scene.fog.near = lerp(base.near, base.near * 0.4, t);
    if (typeof base.far === 'number') scene.fog.far = lerp(base.far, base.far * 0.45, t);
    if (typeof base.density === 'number') scene.fog.density = lerp(base.density, base.density * 2.2, t);
  }

  if (scene && Array.isArray(scene.children)) {
    for (const obj of scene.children) {
      if (!obj || (obj.type !== 'DirectionalLight' && obj.type !== 'HemisphereLight')) continue;
      if (obj.userData._weatherBaseIntensity === undefined) obj.userData._weatherBaseIntensity = obj.intensity;
      obj.intensity = obj.userData._weatherBaseIntensity * (1 - t * 0.55);
    }
  }
}
