import { loadMap } from './mapdata2.js';
import { Camera } from './camera2.js';
import { Input } from './input2.js';
import { Player } from './player2.js';
import { World } from './world2.js';
import { updateTrafficAI, resolveVehicleBuildingCollision, resolveVehicleVehicleCollisions, drawVehicle, manageTrafficPopulation, manageBikePopulation, manageBusPopulation, checkVehicleWater, drawSplash, spawnHeroCarNear } from './vehicle2.js';
import { applyCameraTransform, drawGround, drawGreen, drawWater, drawRoads, drawRoadLabels, drawBuildings, drawLandmarkLabels, drawTrees, drawFilmGrain, drawViewModeGrade } from './render2.js';
import { spawnPedestriansNear, updatePedestrians, drawPedestrians } from './pedestrians2.js';
import { updateCombat, updateBullets, drawCombat } from './combat2.js';
import { updatePolice } from './police2.js';
import { initMissions, updateMissions, drawMissions } from './missions2.js';
import { initHud, updateHud } from './hud_panel.js';
import { initPickups, updatePickups, drawPickups } from './pickups2.js';
import { initMapView, updateMapView } from './mapview2.js';
import { initAudio, updateAudio } from './audio2.js';
import { initTrafficLights, updateTrafficLights, drawTrafficLights } from './trafficlights2.js';
import { init3D, update3D, resize3D, set3DActive } from './scene3d.js';
import { initWeather, updateWeather, drawWeather } from './weather2.js';
import { initFlitspaal, updateFlitspaal, drawFlitspaal } from './flitspaal2.js';
import { initWildlife, updateWildlife, drawWildlife } from './wildlife2.js';
import { initSikkomFeed, updateSikkomFeed } from './sikkomfeed2.js';
import { dist } from './util2.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const loadingEl = document.getElementById('loading');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');

function waitForStart() {
  return new Promise((resolve) => {
    startScreen.classList.add('visible');
    startBtn.addEventListener('click', () => {
      startScreen.classList.remove('visible');
      canvas.focus();
      resolve();
    }, { once: true });
  });
}

const PED_TARGET = 45;
const PED_DESPAWN_DIST = 150;

function resize(camera) {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  camera.resize(window.innerWidth, window.innerHeight);
  resize3D();
}

const camera = new Camera();
const input = new Input();

function drawPlayerOnFoot(ctx, player) {
  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0.06, 0.06, player.radius * 1.05, player.radius * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(player.angle);
  ctx.fillStyle = '#2f5c9e';
  ctx.beginPath();
  ctx.ellipse(-player.radius * 0.15, 0, player.radius * 0.95, player.radius * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e0b48a';
  ctx.beginPath();
  ctx.arc(player.radius * 0.35, 0, player.radius * 0.62, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(40,25,10,0.75)';
  ctx.beginPath();
  ctx.arc(player.radius * 0.55, 0, player.radius * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function maintainPedestrians(world) {
  world.pedestrians = world.pedestrians.filter(
    (p) => p.state === 'dead' || dist(p.x, p.y, world.player.x, world.player.y) < PED_DESPAWN_DIST
  );
  if (world.pedestrians.length < PED_TARGET) {
    world.pedestrians.push(...spawnPedestriansNear(
      world.map, world.player.x, world.player.y, PED_TARGET - world.pedestrians.length, Math.random
    ));
  }
}

async function boot() {
  const map = await loadMap('citymap.json');
  init3D();
  set3DActive(false);
  let view3d = false;
  resize(camera);
  window.addEventListener('resize', () => resize(camera));

  // spawn in front of a random real Groningen landmark each game, snapped to
  // the nearest street so the player never appears inside a building
  const landmarks = map.meta.landmarks || [];
  const pick = landmarks.length ? landmarks[Math.floor(Math.random() * landmarks.length)] : { x: 0, y: 0 };
  const spawn = map.nearestRoadPoint(pick.x, pick.y, 400) || { x: 0, y: 0 };
  // some "landmark" buildings (station canopies, big public halls) are large
  // enough that the nearest road point can still land under/inside them -
  // shove clear of any building before the player ever appears there
  const [sx, sy] = map.escapeBuilding(spawn.x, spawn.y);
  const player = new Player(sx, sy);
  camera.x = player.x;
  camera.y = player.y;

  const world = new World(map, camera, input, player);
  const hero = spawnHeroCarNear(map, sx, sy);
  if (hero) world.vehicles.push(hero);
  if (pick.name) {
    world.spawnLandmarkName = pick.name;
    world.addMessage(`Je begint bij ${pick.name}`, 4);
  }
  manageTrafficPopulation(world);
  manageBikePopulation(world);
  manageBusPopulation(world);
  world.pedestrians = spawnPedestriansNear(map, player.x, player.y, PED_TARGET, Math.random);
  initMissions(world);
  initPickups(world);
  initTrafficLights(world);
  initWeather(world);
  initFlitspaal(world);
  initWildlife(world);
  initSikkomFeed(world);
  initHud(world);
  initMapView(world);

  loadingEl.style.display = 'none';
  window.__debug = { player, camera, map, input, world };
  await waitForStart();
  initAudio(world);

  let last = performance.now();
  let trafficTimer = 0;
  let pedTimer = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    world.time += dt;

    trafficTimer -= dt;
    if (trafficTimer <= 0) {
      trafficTimer = 1.5;
      manageTrafficPopulation(world);
      manageBikePopulation(world);
      manageBusPopulation(world);
    }
    pedTimer -= dt;
    if (pedTimer <= 0) {
      pedTimer = 2;
      maintainPedestrians(world);
    }

    player.update(dt, world);
    updateMapView(dt, world);

    updateTrafficLights(dt, world);
    for (const v of world.vehicles) {
      if (v.driver === 'player' || v.isPolice) continue;
      updateTrafficAI(v, dt, map, world, Math.random);
      resolveVehicleBuildingCollision(v, map);
    }

    updatePolice(dt, world);
    resolveVehicleVehicleCollisions(world.vehicles);
    for (const v of world.vehicles) {
      if (!v.wrecked) checkVehicleWater(v, map, world);
    }
    updateCombat(dt, world);
    updateBullets(dt, world);
    updatePedestrians(dt, world);
    updateWildlife(dt, world);
    updateMissions(dt, world);
    updateSikkomFeed(dt, world);
    updatePickups(dt, world);
    updateFlitspaal(dt, world);
    updateAudio(dt, world);
    updateWeather(dt, world);

    if (input.wasPressed('v')) {
      view3d = !view3d;
      set3DActive(view3d);
    }

    const driving = !!player.inVehicle;
    camera.targetZoom = driving ? Math.max(9, 17 - Math.abs(player.inVehicle.speed) * 0.14) : (input.isDown('shift') ? 13.5 : 16);
    camera.follow(player.x, player.y, driving ? 0.18 : 0.12);
    camera.update(dt);

    if (view3d) {
      update3D(dt, world);
    } else {
      drawGround(ctx);

      const yZoom = camera.zoom * camera.tiltYFactor;
      ctx.setTransform(
        camera.zoom * devicePixelRatio, 0, 0, yZoom * devicePixelRatio,
        (camera.w / 2 - camera.x * camera.zoom) * devicePixelRatio,
        (camera.h / 2 - camera.y * yZoom) * devicePixelRatio
      );

      const [minx, miny, maxx, maxy] = camera.viewBounds(15);
      const view = map.queryView(minx, miny, maxx, maxy);

      drawGreen(ctx, view.green, camera.zoom);
      drawWater(ctx, view.water, world.time);
      drawLandmarkLabels(ctx, map.meta.landmarks, camera.zoom, [minx, miny, maxx, maxy], camera.x, camera.y, camera.w, camera.h);
      drawRoads(ctx, view.roads, camera.zoom);
      drawRoadLabels(ctx, view.roads, camera.zoom);
      drawBuildings(ctx, view.buildings, camera.zoom, camera.x, camera.y, camera.w, camera.h, camera.tilt);
      drawTrees(ctx, view.trees, camera.zoom, camera.tilt);
      drawTrafficLights(ctx, world);
      drawMissions(ctx, world);
      drawPickups(ctx, world);
      drawFlitspaal(ctx, world);
      drawPedestrians(ctx, world);
      drawWildlife(ctx, world);

      for (const v of world.vehicles) {
        if (v.x < minx - 10 || v.x > maxx + 10 || v.y < miny - 10 || v.y > maxy + 10) continue;
        drawVehicle(ctx, v);
      }

      if (!player.inVehicle) drawPlayerOnFoot(ctx, player);
      drawCombat(ctx, world);
      drawSplash(ctx, world);
      drawWeather(ctx, world);
      drawFilmGrain(ctx);
      drawViewModeGrade(ctx, camera.tilt);
    }

    updateHud(dt, world);

    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot().catch((err) => {
  loadingEl.textContent = 'Fout bij laden: ' + err.message;
  console.error(err);
});
