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
import { initGarages, updateGarages } from './garages.js';
import { initHoreca, updateHoreca, tryHorecaInteract } from './horeca.js';
import { initShops, updateShops, tryShopInteract } from './shops.js';
import { isShopOpen } from './shopui.js';
import { initMapView, updateMapView, isMapOpen } from './mapview.js';
import { initAudio, updateAudio } from './audio.js';
import { initTheme } from './theme.js';
import { initTrafficLights, updateTrafficLights } from './trafficlights.js';
import { initRailway, updateRailway } from './railway.js';
import { init3D, update3D, resize3D, getScene } from './scene3d.js';
import { updateStreetSigns } from './streetsigns.js';
import { initPauseMenu, isPauseMenuOpen, openPauseMenu } from './pausemenu.js';
import { initDayNight, updateDayNight } from './daynight.js';
import { updateFx3D } from './fx3d.js';
import { updateGore3D } from './gore3d.js';
import { initCityProps, updateCityProps } from './cityprops.js';
import { initPhone, updatePhone, isPhoneOpen } from './phone.js';
import { initSaveGame, updateSaveGame } from './savegame.js';
import { initWeather, updateWeather } from './weather.js';
import { initFlitspaal, updateFlitspaal } from './flitspaal.js';
import { initWildlife, updateWildlife } from './wildlife.js';
import { initSkyProps, updateSkyProps } from './skyprops.js';
import { initSikkomFeed, updateSikkomFeed } from './sikkomfeed.js';
import { initPhoneFeed, updatePhoneFeed } from './phonefeed.js';
import { initLoading, setLoadProgress, finishLoading, showLoadError, runStartScreen, yieldToPaint } from './startscreen.js';
import { initPigeonMode, updatePigeonMode, updatePigeonCamera, updatePigeonAfterglow } from './pigeonmode.js';
import { initPigeonSpots, updatePigeonSpots, tryPigeonSpotInteract } from './pigeonspots.js';
import { initSideJobs, updateSideJobs, trySideJobInteract } from './sidejobs.js';
import { initStationTravel, tryStationInteract } from './stationtravel.js';
import { dist } from './util.js';
import { initAchievementTracker, updateAchievementTracker } from './achievementtracker.js';

// 3D (scene3d.js) is the only game view - see ARCHITECTURE.md. The old 2D
// top-down canvas renderer (render2.js, camera2.js) has been fully retired;
// every system that used to have a 2D-only draw path now also has a 3D one.
initLoading();

function waitForStart(world) {
  const relocate = (x, y) => {
    world.player.x = x;
    world.player.y = y;
    maintainPedestrians(world);
    manageTrafficPopulation(world, { spawnMin: 12 });
    manageBikePopulation(world, { spawnMin: 8 });
    manageBusPopulation(world, { spawnMin: 25 });
    manageScooterPopulation(world, { spawnMin: 8 });
    manageBoatPopulation(world, { spawnMin: 5 });
  };
  const tick = (dt) => {
    world.time += dt;
    updateTrafficLights(dt, world);
    for (const v of world.vehicles) {
      if (v.driver === 'player' || v.isPolice) continue;
      if (v.isBoat) updateBoatAI(v, dt, world.map, world, Math.random);
      else {
        updateTrafficAI(v, dt, world.map, world, Math.random);
        resolveVehicleBuildingCollision(v, world.map, dt);
      }
    }
    resolveVehicleVehicleCollisions(world.vehicles, world);
    updateRailway(dt, world);
    updatePedestrians(dt, world);
    updateWildlife(dt, world);
  };
  return runStartScreen(world, { render: (dt) => update3D(dt, world), relocate, tick });
}

let errorShown = false;
function showFrameError(err) {
  console.error(err);
  if (errorShown) return;
  errorShown = true;
  const el = document.createElement('div');
  el.className = 'frame-error';
  el.setAttribute('role', 'alert');
  el.textContent = 'Er ging iets mis: ' + (err && err.message ? err.message : String(err));
  document.body.appendChild(el);
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
  initTheme();
  const map = await loadMap('citymap.json', (f) => setLoadProgress(0.05 + f * 0.45));
  setLoadProgress(0.55);
  await yieldToPaint();
  init3D(map);
  resize3D();
  setLoadProgress(0.8);
  await yieldToPaint();
  window.addEventListener('resize', resize3D);

  // spawn in front of a random real Groningen landmark each game, snapped to
  // the nearest street so the player never appears inside a building
  const landmarks = map.meta.landmarks || [];
  const pick = landmarks.length ? landmarks[Math.floor(Math.random() * landmarks.length)] : { x: 0, y: 0 };
  // nearest street point, pushed out of buildings, that you can actually walk
  // away from (not a courtyard the footprints close off)
  const spawn = map.findOpenSpawn(pick.x, pick.y, 400) || { x: 0, y: 0 };
  const sx = spawn.x, sy = spawn.y;
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
  initGarages(world);
  initHoreca(world);
  initShops(world);
  initTrafficLights(world);
  initRailway(world);
  initStationTravel(world);
  initWeather(world);
  initFlitspaal(world);
  initWildlife(world);
  initSkyProps(world);
  initSikkomFeed(world);
  initPhoneFeed(world);
  initPigeonMode(world);
  initPigeonSpots(world);
  initSideJobs(world);
  initHud(world);
  initMapView(world);
  initPauseMenu(world);
  setLoadProgress(0.92);
  await yieldToPaint();
  // mouse-look: clicking the game captures the mouse; Esc releases it (the
  // browser swallows that Esc keypress), which opens the pause menu instead
  const menuOpen = () => isPauseMenuOpen() || isMapOpen() || isPhoneOpen() || isShopOpen();
  input.canLock = () => document.body.classList.contains('game-started') && !menuOpen() && !world.uiPaused;
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && document.body.classList.contains('game-started') && !menuOpen()) openPauseMenu();
  });
  initDayNight(world);
  initCityProps(world);
  initPhone(world);
  initSaveGame(world);

  window.__debug = { player, map, input, world };
  initAchievementTracker(world);
  await finishLoading();
  await waitForStart(world);
  document.body.classList.add('game-started');
  input.tryLock();
  initAudio(world);

  let last = performance.now();
  let trafficTimer = 0;
  let pedTimer = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    try {
      frameBody(dt);
    } catch (err) {
      showFrameError(err);
    }
    input.endFrame();
    requestAnimationFrame(frame);
  }

  function frameBody(dt) {
    updateMapView(dt, world);
    world.paused = isMapOpen() || isPauseMenuOpen() || isShopOpen() || !!world.uiPaused;
    if (document.pointerLockElement && (isMapOpen() || isPauseMenuOpen() || isPhoneOpen())) document.exitPointerLock();
    // world.timeScale: slow-motion for cinematic moments (1 = normal)
    const gameDt = dt * Math.max(0, Math.min(1, world.timeScale ?? 1));
    if (!world.paused) updateGameplay(gameDt);
    updateAudio(dt, world);
    updateStreetSigns(dt, world, getScene());
    const animDt = world.paused ? 0 : gameDt;
    updateFx3D(animDt, world, getScene());
    updateGore3D(animDt, world, getScene());
    updateCityProps(animDt, world, getScene());
    updatePigeonAfterglow(animDt);
    if (world.pigeonMode) updatePigeonCamera(dt, world);
    else {
      updatePhone(dt, world);
      updateSaveGame(dt, world);
    }
    update3D(world.paused ? dt : gameDt, world);
    updateHud(dt, world);
  }

  function updateGameplay(dt) {
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

    if (world.pigeonMode) updatePigeonMode(dt, world);
    else {
      trySideJobInteract(world);
      tryShopInteract(world);
      tryPigeonSpotInteract(world);
      tryStationInteract(world);
      tryHorecaInteract(world);
      player.update(dt, world);
      updateCompanion(dt, world);
    }

    updateTrafficLights(dt, world);
    for (const v of world.vehicles) {
      if (v.driver === 'player' || v.isPolice || v.isBoat) continue;
      updateTrafficAI(v, dt, map, world, Math.random);
      resolveVehicleBuildingCollision(v, map, dt);
    }
    for (const v of world.vehicles) {
      if (v.isBoat && v.driver !== 'player') updateBoatAI(v, dt, map, world, Math.random);
    }

    if (!world.pigeonMode) updatePolice(dt, world);
    resolveVehicleVehicleCollisions(world.vehicles, world);
    updateRailway(dt, world);
    for (const v of world.vehicles) {
      if (!v.wrecked) checkVehicleWater(v, map, world);
    }
    if (!world.pigeonMode) {
      updateCombat(dt, world);
      updateBullets(dt, world);
    }
    updatePedestrians(dt, world);
    updateWildlife(dt, world);
    updateSkyProps(dt, world);
    updatePigeonSpots(dt, world);
    if (!world.pigeonMode) {
      updateMissions(dt, world);
      updateSikkomFeed(dt, world);
      updatePhoneFeed(dt, world);
      updateGarages(dt, world);
      updateHoreca(dt, world);
      updateShops(dt, world);
      updateFlitspaal(dt, world);
    }
    updateSideJobs(dt, world);
    updateWeather(dt, world);
    updateDayNight(dt, world);
    updateAchievementTracker(dt, world);
  }

  input.reset();
  requestAnimationFrame(frame);
}

boot().catch((err) => {
  showLoadError(err.message);
  console.error(err);
});
