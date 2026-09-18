import { loadMap } from './mapdata.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { World } from './world.js';
import { initCompanion, updateCompanion } from './companion.js';
import { updateTrafficAI, resolveVehicleBuildingCollision, resolveVehicleVehicleCollisions, manageTrafficPopulation, manageBikePopulation, manageBusPopulation, manageScooterPopulation, manageBoatPopulation, updateBoatAI, checkVehicleWater, spawnHeroCarNear } from './vehicle.js';
import { spawnPedestriansNear, updatePedestrians } from './pedestrians.js';
import { updateCombat, updateBullets } from './combat.js';
import { updatePolice } from './police.js';
import { initMissions, updateMissions } from './missions.js';
import { initHud, updateHud } from './hud_panel.js';
import { initPickups, updatePickups } from './pickups.js';
import { initHoreca, updateHoreca } from './horeca.js';
import { initMapView, updateMapView } from './mapview.js';
import { initAudio, updateAudio } from './audio.js';
import { initTrafficLights, updateTrafficLights } from './trafficlights.js';
import { init3D, update3D, resize3D } from './scene3d.js';
import { initWeather, updateWeather } from './weather.js';
import { initFlitspaal, updateFlitspaal } from './flitspaal.js';
import { initWildlife, updateWildlife } from './wildlife.js';
import { initSkyProps, updateSkyProps } from './skyprops.js';
import { initSikkomFeed, updateSikkomFeed } from './sikkomfeed.js';
import { initPhoneFeed, updatePhoneFeed } from './phonefeed.js';
import { dist } from './util.js';

// 3D (scene3d.js) is the only game view - see ARCHITECTURE.md. The old 2D
// top-down canvas renderer (render2.js, camera2.js) has been fully retired;
// every system that used to have a 2D-only draw path now also has a 3D one.
const loadingEl = document.getElementById('loading');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');

function waitForStart() {
  return new Promise((resolve) => {
    startScreen.classList.add('visible');
    startBtn.addEventListener('click', () => {
      startScreen.classList.remove('visible');
      resolve();
    }, { once: true });
  });
}

const PED_TARGET = 45;
const PED_DESPAWN_DIST = 150;

const input = new Input();

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
  resize3D();
  window.addEventListener('resize', resize3D);

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

  const world = new World(map, input, player);
  initCompanion(world);
  const hero = spawnHeroCarNear(map, sx, sy);
  if (hero) world.vehicles.push(hero);
  if (pick.name) {
    world.spawnLandmarkName = pick.name;
    world.addMessage(`Je begint bij ${pick.name}`, 4);
  }
  manageTrafficPopulation(world);
  manageBikePopulation(world);
  manageBusPopulation(world);
  manageScooterPopulation(world);
  manageBoatPopulation(world);
  world.pedestrians = spawnPedestriansNear(map, player.x, player.y, PED_TARGET, Math.random);
  initMissions(world);
  initPickups(world);
  initHoreca(world);
  initTrafficLights(world);
  initWeather(world);
  initFlitspaal(world);
  initWildlife(world);
  initSkyProps(world);
  initSikkomFeed(world);
  initPhoneFeed(world);
  initHud(world);
  initMapView(world);

  loadingEl.style.display = 'none';
  window.__debug = { player, map, input, world };
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
      manageScooterPopulation(world);
      manageBoatPopulation(world);
    }
    pedTimer -= dt;
    if (pedTimer <= 0) {
      pedTimer = 2;
      maintainPedestrians(world);
    }

    player.update(dt, world);
    updateCompanion(dt, world);
    updateMapView(dt, world);

    updateTrafficLights(dt, world);
    for (const v of world.vehicles) {
      if (v.driver === 'player' || v.isPolice || v.isBoat) continue;
      updateTrafficAI(v, dt, map, world, Math.random);
      resolveVehicleBuildingCollision(v, map);
    }
    for (const v of world.vehicles) {
      if (v.isBoat && v.driver !== 'player') updateBoatAI(v, dt, map, world, Math.random);
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
    updateSkyProps(dt, world);
    updateMissions(dt, world);
    updateSikkomFeed(dt, world);
    updatePhoneFeed(dt, world);
    updatePickups(dt, world);
    updateHoreca(dt, world);
    updateFlitspaal(dt, world);
    updateAudio(dt, world);
    updateWeather(dt, world);

    update3D(dt, world);
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
