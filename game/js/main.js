// first: copies the pre-0.29 'gte-*' storage keys before any module reads them
import './storagekeys.js';
import './oudmigratie.js';
import { streamTreeProps } from './treeprops.js';
import { streamTrafficLightProps } from './trafficlights.js';
import { streamFlitspaalProps } from './flitspaal.js';
import { addPropStreamer } from './breakables.js';
import './geokernels.js'; // registers the geometry kernels with geojobs.js
import { setErrorContext } from './errorlog.js';
import { DEV, STORY_TEST, FLAGS } from './devflags.js';
import { bindCoop } from './coopglue.js';
import { tickCoopNet } from './coopnet.js';
import { isHoldOpen, checkHold } from './coophold.js';
import { updatePartnerChip } from './coophud.js';
import { syncFigures, hasFigureMeshes } from './coopfigures3d.js';
import { syncHostEntities, hasHostEntities, clearHostEntities } from './coopentities3d.js';
import { syncPings, hasPingMeshes } from './cooppings3d.js';
import { updateHostScene, hasHostScene } from './coopscene.js';
import { loadMap } from './mapdata.js';
import { loadTileWorld } from './tileworld.js';
import { tileFocus } from './tilefocus.js';
import { setWorldPlaces } from './worldplaces.js';
import { setRegionData } from './regions.js';
import { tileIndexOf, tileKey, tileOrigin } from './gdt.js';
import { loadFacilities, initFacilities, loadShopPlaces, initShopPlaces, setExtraBuiltWorld, placeWithTiles, FAC } from './facilities.js';
import { setShopSpots, spotsFrom } from './shopspots.js';
import { ensureCountryEdge } from './countryplan.js';
import { warmCountryMaps } from './countrymap.js';
import { Input } from './input.js';
import { initGamepad } from './gamepad.js';
import { initPadKeyboard } from './padkeyboard.js';
import { initTextFields } from './textfield.js';
import { initInputDevice } from './inputdevice.js';
import { skipFrame } from './framecap.js';
import { initTouch } from './touch.js';
import { initGlyphs } from './glyphs.js';
import { initA11y } from './a11y.js';
import { isPlayAheadOpen } from './todo.js';
import { isHelpOfferOpen } from './assistlive.js';
import { Player } from './player.js';
import { World } from './world.js';
import { initCompanion, updateCompanion } from './companion.js';
import { tickRowingCoaches } from './roeicoach.js';
import { updateTrafficAI, resolveVehicleBuildingCollision, resolveVehicleVehicleCollisions, manageTrafficPopulation, manageBikePopulation, manageBusPopulation, manageScooterPopulation, manageMotorPopulation, manageBoatPopulation, updateBoatAI, recordContact, checkVehicleWater, spawnHeroCarNear, tickBurningVehicles, setGroundMap } from './vehicle.js';
import { spawnPedestriansNear, updatePedestrians, CITY_CENTRE } from './pedestrians.js';
import { updateCombat, updateBullets } from './combat.js';
import { updatePolice } from './police.js';
import { updateTrafficLaw } from './trafficlaw.js';
import { updateOffences } from './offences.js';
import { updateMotorPolice } from './motorpolice.js';
import { initMissions, updateMissions } from './missions.js';
import { initStory, updateStory, currentStep } from './story.js';
import { initGoal, updateGoal } from './goal.js';
import { updateOnboarding } from './onboarding.js';
import { updateContextHints } from './contexthints.js';
import { updatePractice } from './practice.js';
import { initMotion } from './motion.js';
import { initHud, updateHud } from './hud_panel.js';
import { initGarages, initCountryGarages, updateGarages, tryGarageInteract } from './garages.js';
import { initHoreca, initCountryHoreca, updateHoreca, tryHorecaInteract } from './horeca.js';
import { initShops, initCountryShops, updateShops, tryShopInteract, COUNTRY_SHOP_KINDS, getShopsForRender } from './shops.js';
import { initSnackMachines, updateSnackMachines, tryMachineInteract } from './snackautomaat.js';
import { updateStreetLife, tryStreetLifeInteract } from './streetlife.js';
import { bikeBoost, hourOf } from './streetlifedata.js';
import { wijkProfileAt } from './trafficfleet.js';
import { motorTarget } from './motortraffic.js';
import { updateParkingLots3D } from './parkinglots3d.js';
import { updateMarinas3D } from './marinas3d.js';
import { updateWaterplekken3D } from './waterplekken3d.js';
import { updateStreekplekken3D } from './streekplekken3d.js';
import { loadVaarnet, vaarPrefetch } from './vaarload.js';
import { isShopOpen } from './shopui.js';
import { initMapView, updateMapView, isMapOpen } from './mapview.js';
import { initAudio, updateAudio, setMenuAudio, setSfxLinks, setAudioCamera } from './audio.js';
import { updateBanter } from './banter.js';
import { updateNarrative } from './narrative.js';
import { initStoryContact, updateStoryContact } from './storycontact.js';
import { initTheme } from './theme.js';
import { initTrafficLights, updateTrafficLights, trafficSignalsNear, trafficLightPhaseFor } from './trafficlights.js';
import { initRailway, updateRailway, setRailExtraWorld, getTrains, getRoutes, routePoint } from './railway.js';
import { updateZeilvaren } from './zeilvaren.js';
import { updateEvenementen } from './evenementenlive.js';
import { routePenalty } from './evenementen.js';
import { setRouteClosures, getActiveRoute, getRouteAhead, getUserWaypoint } from './routing.js';
let routeSigDone = '';
import { updateStationLife } from './stationlife.js';
import { createBoard as createStationBoard } from './minigamekit.js';
import { applyCityRoutes, loadLandData } from './corridorrail.js';
import { setFarProps } from './farprops.js';
import { initProvince } from './provinceworld.js';
import { loadRoadNet, setRoadNet } from './roadgraph.js';
import { ensureSeaRows } from './seatiles.js';
import { buildMovableBridges, addMovableRoads, updateMovableBridges, getMovableBridges } from './movablebridges.js';
import { updateSluizen, getSluizen } from './sluizen.js';
import { updateBridgeHits, resetBridgeDamage, startBridgeCrashDemo, stepBridgeCrashDemo } from './bridgehitworld.js';
import { geoWorkerActive } from './geojobs.js';
import { init3D, update3D, resize3D, getScene, getRenderer, setMenuCover, MENU_FRAME_S, refreshRenderScale, terrainReady, canvasFrameCount, prewarmStreamAt, getCamera, getFollowPose, setRouteLinks } from './scene3d.js';
import { checkFrame } from './blackframe.js';
import { noteFrame, hideAdvice, classifyGpu, readGpu, dynamicScale, cpuLevel } from './gfxprofile.js';
import { updateStreetSigns } from './streetsigns.js';
import { updatePhotoMode, wireFotoKey } from './fotomodusui.js';
import { initPauseMenu, isPauseMenuOpen, openPauseMenu, pauseMenuCover } from './pausemenu.js';
import { wantsOpenSamen, takeOpenSamen, samenGate } from './samenpanel.js';
import { gateOn, setGate } from './coopgate.js';
import { updateGastLokaal } from './coopgastlokaal.js';
import { initDayNight, updateDayNight, refreshDayNight, DAY_LENGTH_S } from './daynight.js';
import { initCalendar, updateCalendar, today as calendarToday } from './calendarday.js';
import { updateFx3D } from './fx3d.js';
import { updateGore3D } from './gore3d.js';
import { updateKnockFx3D } from './knockfx3d.js';
import { updateGunFx3D } from './gunfx3d.js';
import { initCityProps, updateCityProps } from './cityprops.js';
import { initPhone, updatePhone, isPhoneOpen } from './phone.js';
import { initSaveGame, updateSaveGame, hasSave, readSave } from './savegame.js';
import { initWeather, updateWeather } from './weather.js';
import { initWorldEvents, updateWorldEvents } from './worldevents.js';
import { initMuggings, updateMuggings } from './muggings.js';
import { initRoadRage, updateRoadRage } from './roadrage.js';
import { updateClearZones } from './clearzonesweep.js';
import { updateSpikeStrips3D } from './spikestrips3d.js';
import { tryWeaponDropInteract, updateWeaponDrops3D } from './weapondrops.js';
import { initFlitspaal, updateFlitspaal } from './flitspaal.js';
import { initWildlife, updateWildlife } from './wildlife.js';
import { tickSchaapontvoering } from './schaapontvoeringrt.js';
import { initSkyProps, updateSkyProps } from './skyprops.js';
import { initSikkomFeed, updateSikkomFeed } from './sikkomfeed.js';
import { initPhoneFeed, updatePhoneFeed } from './phonefeed.js';
import { watchJumps, resetJumpWatch, startLoadScreen } from './loadscreen.js';
import { initLoading, setLoadProgress, finishLoading, showLoadError, runStartScreen, yieldToPaint, planMenuStart } from './startscreen.js';
import { initPigeonMode, updatePigeonMode, updatePigeonCamera, updatePigeonAfterglow } from './pigeonmode.js';
import { initPigeonSpots, updatePigeonSpots, tryPigeonSpotInteract } from './pigeonspots.js';
import { initSideJobs, updateSideJobs, trySideJobInteract } from './sidejobs.js';
import { updateCashVan } from './cashvan.js';
import { initHeliRun, updateHeliRun, tryHeliSpotInteract, updateHeliSpot } from './helirun.js';
import { initPadel, updatePadel, tryPadelInteract, updatePadelWorld, padelCamera } from './padel.js';
import { initActivities, isActivityActive, updateActivityGame, tryActivityInteract, updateActivitiesWorld, activityCamera } from './activities.js';
import { initRadio, updateRadio } from './radio.js';
import { updatePoleVaults } from './fierljep.js';
import { initPostgame, updatePostgame, tryPostgameInteract } from './postgame.js';
import { initStationTravel, tryStationInteract } from './stationtravel.js';
import { initOmmelandFun, updateOmmelandFun, tryOmmelandInteract } from './ommelandfun.js';
import { registerActivityKind, initActivityKinds, interactActivityKinds, tickActivityKinds } from './activityhub.js';
import { tryTrainInteract, updateTrainDriving } from './traindrive.js';
import { dist } from './util.js';
import { updateEmergency } from './emergency.js';
import { updateIndicators } from './indicators.js';
import { initAchievementTracker, updateAchievementTracker } from './achievementtracker.js';
import { probe } from './hitchprobe.js';
import { initSafety, updateSafety } from './safety.js';
import { updateCinematics, isCinematicActive, sinceCinematic, setCinematicLinks } from './cinematics.js';
import { initFlavour, updateFlavour } from './flavour.js';
import { initFlavour3D, updateFlavour3D } from './flavour3d.js';
import { prepareHomeMap, initHome, updateHome, updateHomeExterior, tryHomeInteract, homeSpawnPoint, parkHeroAtHome } from './home.js';
import { updateDrunk } from './drunk.js';
import { updateHelis } from './heliflight.js';
import { planeKind } from './planeflight.js';
import { busBoardKind } from './busboard3d.js';
import { shopSignKind } from './shopsigns3d.js';
import { loadBusLines } from './busroutes.js';
import { setBusLines, attachToNearestRoad } from './vehicle.js';
import { stapSlaOver } from './simlagen.js';
import { getSimBridge, setSimCarAttach } from './simbridge.js';
setSimCarAttach(attachToNearestRoad);
import { scaledTarget, simLevel, nextSimFrame, farAIDist, skipFar, takeDt, keepVehicle } from './simload.js';
import { getSettings } from './settings.js';
import { MODS } from './cheatmods.js';
import { makeDip, triggerDip, dipScale } from './gamefeel.js';
import { effectsFor } from './a11ylogic.js';
import { reducedMotion } from './motion.js';
import { initCheats, updateCheats } from './cheats.js';
import { updateRegioLeven, setNieuwsBronnen } from './regiolevenrt.js';
import { syncLedger, getLedger } from './finance.js';

// breakables.js calls these every stream interval (it does not import them)
addPropStreamer(streamTreeProps);
addPropStreamer(streamTrafficLightProps);
addPropStreamer(streamFlitspaalProps);

// What the player can do on the map, as one registry (activityhub.js): each
// module is a kind with its init, interact slot and tick phase.
registerActivityKind({ id: 'activities', init: initActivities, slot: 'act', interact: tryActivityInteract, tickPhase: 'world', tick: updateActivitiesWorld });
registerActivityKind({ id: 'postgame', initPhase: 'late', tickRank: 0, init: initPostgame, slot: 'pre', interact: tryPostgameInteract, tickPhase: 'late', tick: updatePostgame });
registerActivityKind({ id: 'sidejobs', initPhase: 'late', tickRank: -1, init: initSideJobs, slot: 'job', interact: trySideJobInteract, tickPhase: 'late', tick: updateSideJobs });
registerActivityKind(planeKind);
registerActivityKind(busBoardKind);
registerActivityKind(shopSignKind);
registerActivityKind({ id: 'ommeland', initPhase: 'early', init: initOmmelandFun, slot: 'uitje', interact: tryOmmelandInteract, tickPhase: 'late', tick: updateOmmelandFun });

// More life on the water: small paddle and pedal craft make up most of the
// mix (boattypes.js), cheap meshes; Laag keeps a smaller fleet.
const boatTarget = () => scaledTarget(getSettings().quality === 'laag' ? 5 : 7);

// 3D (scene3d.js) is the only game view - see ARCHITECTURE.md. The old 2D
// top-down canvas renderer (render2.js, camera2.js) has been fully retired;
// every system that used to have a 2D-only draw path now also has a 3D one.
initLoading();

function waitForStart(world, ready) {
  const relocate = (x, y) => {
    world.player.x = x;
    world.player.y = y;
    maintainPedestrians(world);
    manageTrafficPopulation(world, { spawnMin: 12 });
    manageBikePopulation(world, { spawnMin: 8 });
    manageBusPopulation(world, { spawnMin: 25 });
    manageScooterPopulation(world, { spawnMin: 8 });
    manageMotorPopulation(world, { spawnMin: 8 });
    manageBoatPopulation(world, { spawnMin: 5 });
  };
  const tick = (dt) => {
    world.time += dt;
    updateAudio(dt, world);
    updateTrafficLights(dt, world);
    for (const v of world.vehicles) {
      if (v.driver === 'player' || v.isPolice || v.cineTemp) continue;
      if (v.isBoat) updateBoatAI(v, dt, world.map, world, Math.random);
      else {
        updateTrafficAI(v, dt, world.map, world, Math.random);
        resolveVehicleBuildingCollision(v, world.map, dt);
      }
    }
    resolveVehicleVehicleCollisions(world.vehicles, world);
    tickBurningVehicles(world, dt);
    updateRailway(dt, world);
    updateMovableBridges(dt, world);
    updateSluizen(dt, world);
    updatePedestrians(dt, world);
    updateWildlife(dt, world);
    // in play combat.js expires these; the title screen and trailer only add
    if (world.particles.length) world.particles = world.particles.filter((pt) => pt.until === undefined || pt.until > world.time);
  };
  // the effect pools exist from the title screen on, so their shaders are
  // compiled there and not on the first explosion, shot or splash; the
  // trailer (trailer.js) passes fxDt to play its explosions
  // the street dressing the game streams in around the player (the home's
  // garage and plinth, street furniture, name signs, billboards) also on the
  // title screen, so the menu shows the street as it is in play
  const render = (dt, fxDt = 0) => {
    updateHomeExterior(dt, world);
    updateStreetSigns(dt, world, getScene());
    updateCityProps(dt, world, getScene());
    updateFlavour3D(dt, world);
    updateFx3D(fxDt, world, getScene());
    updateGore3D(fxDt, world, getScene());
    updateKnockFx3D(fxDt, world, getScene());
    updateWeaponDrops3D(fxDt, world, getScene());
    updateSpikeStrips3D(fxDt, world, getScene());
    updateGunFx3D(fxDt, world, getScene());
    update3D(dt, world);
  };
  return runStartScreen(world, { render, relocate, tick, ready });
}

let bridgeDemoT = 0, bridgeDemoDone = false; // ?brugbotsing
let errorShown = false;
function showFrameError(err) {
  console.error(err && err.stack ? err.stack : err);
  if (errorShown) return;
  errorShown = true;
  const el = document.createElement('div');
  el.className = 'frame-error';
  el.setAttribute('role', 'alert');
  el.textContent = 'Er ging iets mis: ' + (err && err.message ? err.message : String(err));
  document.body.appendChild(el);
}

const PED_TARGET = 45;

// over budget on a CPU-bound machine: the farthest ordinary cars and
// cyclists out of sight go first (simload.js)
function thinTraffic(world) {
  const { player, vehicles } = world;
  const want = { car: Math.round(scaledTarget(30) * MODS.cars), bike: Math.round(scaledTarget(16) * MODS.bikes), scooter: Math.round(scaledTarget(10) * MODS.scooters) };
  const kindOf = (v) => (v.isBike ? 'bike' : v.isScooter ? 'scooter' : v.isBus || v.isBoat || v.parked || v.wrecked ? null : 'car');
  const have = { car: [], bike: [], scooter: [] };
  for (const v of vehicles) {
    const k = kindOf(v);
    if (!k || keepVehicle(v) || v.missionFatbike) continue;
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d > 110) have[k].push([d, v]);
  }
  for (const k in have) {
    const all = have[k];
    let excess = vehicles.reduce((n, v) => n + (kindOf(v) === k && !keepVehicle(v) ? 1 : 0), 0) - want[k];
    if (MODS.fading ? excess <= 0 : excess <= 2) continue;
    all.sort((a, b) => b[0] - a[0]);
    for (const [, v] of all) {
      if (excess <= 0) break;
      vehicles.splice(vehicles.indexOf(v), 1);
      excess--;
    }
  }
}
const PED_DESPAWN_DIST = 150;

const input = new Input();

function maintainPedestrians(world) {
  // in a cutscene the street life fills round the camera's view, not round the hidden player (#157)
  const f = world.cameraOverride && world.streamFocus ? world.streamFocus : world.player;
  world.pedestrians = world.pedestrians.filter(
    (p) => p.state === 'dead' || dist(p.x, p.y, f.x, f.y) < PED_DESPAWN_DIST
  );
  if (world.pedestrians.length < PED_TARGET) {
    world.pedestrians.push(...spawnPedestriansNear(
      world.map, f.x, f.y, PED_TARGET - world.pedestrians.length, Math.random
    ));
  }
}

// load timeline (ms since navigation) for perf runs: window.__loadMarks
const loadMarks = window.__loadMarks = {};
const markLoad = (k) => { loadMarks[k] = Math.round(performance.now()); };
let tileWorldStats = null;

async function boot() {
  markLoad('boot');
  // the geometry worker loads its modules while the map downloads
  geoWorkerActive();
  initA11y();
  initGlyphs();
  initTheme();
  // the map comes from .gdt tiles (world/, js/tileworld.js); a build without
  // them (the dev server) gets stad.json alone: roads, rails, the hand-made buildings
  const onMapProgress = (f) => setLoadProgress(0.05 + f * 0.45);
  // the province's layer (index-provincie.json, F2) and the proefstrook's
  // (index-corridor.json) name the places and stream their tiles in
  // (provinceworld.js). The province's tiles win.
  const extra = [{ name: 'index-provincie.json' }, { name: 'index-corridor.json' }];
  const tiles = await loadTileWorld('world/', { onProgress: onMapProgress, extra, terrain: FLAGS.terrain });
  const corridor = !!tiles;
  if (tiles && FLAGS.terrain) tiles.world.terrainOn = true;
  if (tiles && FLAGS.vlakbruggen) tiles.world.streamProfiles = false;
  const layers = (tiles && tiles.index.layers) || {};
  const corLayer = (layers.provincie && layers.provincie.global ? layers.provincie : null) || layers.corridor;
  if (corLayer && corLayer.global) setWorldPlaces(corLayer.global.places);
  setRegionData(corLayer && corLayer.global, tiles ? (x, y) => { const [i, j] = tileIndexOf(x, y); return !!tiles.index.tiles[tileKey(i, j)]; } : null);
  const inCorridor = (x, y) => { const [i, j] = tileIndexOf(x, y); const t = tiles.index.tiles[tileKey(i, j)]; return !!t && !!(t.flags & 4); };
  if (corridor && tiles) { setExtraBuiltWorld(inCorridor); setRailExtraWorld(inCorridor); }
  if (tiles) initProvince(tiles);
  // the tiles' car roads for the GPS and the police (roadgraph.js), read while the rest loads
  const roadsFile = layers.provincie && layers.provincie.global && layers.provincie.global.roadsFile;
  if (tiles && roadsFile) loadRoadNet('world/', roadsFile).then((r) => r && setRoadNet(r));
  // the real bus lines for the buses' routes, boards and next stop (busroutes.js, #80, #160)
  const busFile = layers.provincie && layers.provincie.global && layers.provincie.global.busFile;
  if (tiles && busFile) loadBusLines('world/', busFile).then(setBusLines);
  // the city's train routes on over the layer's track, the countryside's rails, turbines and pylons (corridorrail.js)
  const landData = corLayer && corLayer.global ? loadLandData('world/', corLayer.global.landFile) : null;
  const facilities = loadFacilities('stad.json');
  const shopPlaces = loadShopPlaces('stad.json');
  const map = tiles ? tiles.world : await loadMap('stad.json', onMapProgress);
  tileWorldStats = tiles ? tiles.store : null;
  markLoad('map');
  // the waterway network's fixes and route graph (#184), small files read while the rest loads
  loadVaarnet(map);
  const land = await landData;
  applyCityRoutes(map, land);
  setFarProps(land);
  initFacilities(map, await facilities);
  initShopPlaces(map, await shopPlaces);
  setShopSpots(spotsFrom(FAC.all)); // a building's shopfront follows the real shop in it (#156)
  markLoad('ommeland');
  prepareHomeMap(map);
  planMenuStart(map); // the menu's first viewpoint and its tiles load next to the rest of the boot (#380)
  setLoadProgress(0.55);
  await yieldToPaint();
  markLoad('prepared');
  init3D(map);
  resize3D();
  markLoad('init3D');
  // the map-edge layout (~0.3 s) during loading, not on the first trip out;
  // after init3D, which sets the country bounds it measures from
  ensureCountryEdge(map);
  setGroundMap(map);
  markLoad('countryEdge');
  setLoadProgress(0.8);
  await yieldToPaint();
  window.addEventListener('resize', resize3D);

  // every game starts at home: outside the lobby of Tammo and Tessa's flat
  // (home.js), the Escapade in the garage
  const spawn = homeSpawnPoint();
  const sx = spawn.x, sy = spawn.y;
  const player = new Player(sx, sy);
  player.angle = spawn.angle;

  const world = new World(map, input, player);
  initCompanion(world);
  if (FLAGS.coop) bindCoop(world, input);
  const hero = spawnHeroCarNear(map, sx, sy);
  if (hero) world.vehicles.push(hero);
  manageTrafficPopulation(world);
  manageBikePopulation(world);
  manageBusPopulation(world);
  manageScooterPopulation(world);
  manageMotorPopulation(world);
  manageBoatPopulation(world, { target: boatTarget() });
  world.pedestrians = spawnPedestriansNear(map, player.x, player.y, PED_TARGET, Math.random);
  initMissions(world);
  initGarages(world);
  initHoreca(world);
  initShops(world);
  setShopSpots(spotsFrom(FAC.all, getShopsForRender()));
  initSnackMachines(world);
  initHome(world);
  parkHeroAtHome(world);
  initTrafficLights(world);
  initRailway(world);
  buildMovableBridges(world.map);
  // the province's movable bridges come with the streamed tiles, not with map.roads (#235)
  if (world.map.onTiles) {
    world.map.onTiles((kind, tile) => { if (kind === 'add' && tile) { const o = tileOrigin(tile.i, tile.j); addMovableRoads(world.map.roadsNear(o[0] + 500, o[1] + 500, 720)); } });
    addMovableRoads(world.map.roadsNear(player.x, player.y, 2500));
  }
  resetBridgeDamage();
  initStationTravel(world);
  initActivityKinds(world, 'early');
  initWeather(world);
  initWorldEvents(world);
  initMuggings(world);
  initRoadRage(world);
  initFlitspaal(world);
  initWildlife(world);
  initSkyProps(world);
  initSikkomFeed(world);
  initPhoneFeed(world);
  initPigeonMode(world);
  initPigeonSpots(world);
  initHeliRun(world);
  initPadel(world);
  initActivityKinds(world, 'main');
  initRadio(world);
  initActivityKinds(world, 'late');
  initStory(world);
  let gpuClass = '';
  setErrorContext(() => {
    const st = getSettings();
    const step = currentStep();
    if (!gpuClass) { try { const g = classifyGpu(readGpu(getRenderer().getContext())); gpuClass = `${g.tier} (${g.why})`; } catch (e) { gpuClass = '?'; } }
    return {
      step: step ? step.id || (step.end ? 'einde ' + step.end : '') : '',
      settings: `kwaliteit ${st.quality}, schaduwen ${st.shadows ? 'aan' : 'uit'}, resolutie ${Math.round(st.resolution * 100)}%${st.autoResolution ? ' auto' : ''}, zicht ${st.drawDistance}, ui ${st.uiScale}`,
      gpu: gpuClass,
    };
  });
  initGoal(world);
  initMotion();
  initStoryContact(world);
  initHud(world);
  initMapView(world);
  initPauseMenu(world);
  markLoad('world');
  setLoadProgress(0.92);
  await yieldToPaint();
  // mouse-look: clicking the game captures the mouse; Esc releases it (the
  // browser swallows that Esc keypress), which opens the pause menu instead
  const menuOpen = () => isPauseMenuOpen() || isMapOpen() || isPhoneOpen() || isShopOpen() || !!world.devPanelOpen;
  input.canLock = () => document.body.classList.contains('game-started') && !menuOpen() && !world.uiPaused;
  initInputDevice();
  initPadKeyboard();
  initTextFields(); // alle toetsen, plakken en een rechtermuismenu in tekstvelden (#95)
  initGamepad(input, world, { menuOpen: () => menuOpen() || isPlayAheadOpen() || isHelpOfferOpen(), phoneOpen: isPhoneOpen, pauseOpen: isPauseMenuOpen, mapOpen: () => isMapOpen() });
  initTouch(input, world, { menuOpen: () => menuOpen() || isPlayAheadOpen() || isHelpOfferOpen() });
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && document.body.classList.contains('game-started') && !menuOpen()) openPauseMenu();
  });
  initDayNight(world);
  initCalendar(world);
  initCityProps(world);
  initFlavour(world);
  initFlavour3D(world, getScene());
  initPhone(world);
  initSaveGame(world);

  window.__debug = { player, map, input, world };
  initAchievementTracker(world);
  initSafety(world);
  initCheats(world);
  if (DEV) import('./storydev.js').then((m) => m.initStoryDev(world)).catch((e) => console.error('storydev', e));
  if (FLAGS.sfxtest) import('./sfx/sfxtest.js').then((m) => m.initSfxTest(world)).catch((e) => console.error('sfxtest', e));
  if (FLAGS.autoplay) import('./playerapi.js').then((m) => m.initPlayerApi(world, input)).catch((e) => console.error('playerapi', e));
  if (FLAGS.testmenu) import('./testmenu.js').then((m) => m.initTestMenu(world)).catch((e) => console.error('testmenu', e));
  if (DEV) import('./profileoverlay.js').then((m) => m.initProfileOverlay(world)).catch((e) => console.error('profileoverlay', e));
  if (STORY_TEST) import('./storytest.js').then((m) => m.runStoryTest(world)).catch((e) => console.error('storytest', e));
  markLoad('systems');
  // the first tiles round the save build while the boot screen is still up
  try { const sv = hasSave() ? readSave() : null; if (sv && sv.pos) prewarmStreamAt(sv.pos.x, sv.pos.y, 40); } catch (e) { /* ignore */ }
  await terrainReady();
  markLoad('terrain');
  await finishLoading();
  markLoad('title');
  // the garages, cafés and shops out in the Ommelanden get their doors from the
  // tiles round them: those load behind the title screen (a few ms a frame) and
  // the game waits for them only if you start sooner
  const countryPlaced = placeWithTiles(map, ['horeca', 'car_repair', 'fuel', ...COUNTRY_SHOP_KINDS], () => {
    initCountryGarages(world);
    initCountryHoreca(world);
    initCountryShops(world);
  }, { slice: 6 }).then(() => markLoad('placement'), (e) => console.warn('country placement', e));
  // the minimap's and map's Ommeland water and meadow images, a few ms a frame
  warmCountryMaps();
  // the title screen already sounds like the city (quieter, no music)
  setMenuAudio(true);
  initAudio(world);
  setNieuwsBronnen({ bridges: getMovableBridges });
  setAudioCamera(getCamera);
  setRouteLinks({ getActiveRoute, getRouteAhead, getUserWaypoint });
  setCinematicLinks({ getFollowPose, prewarmStreamAt });
  setSfxLinks({ bridges: getMovableBridges, trains: getTrains, vehicles: () => world.vehicles, locks: getSluizen });
  await waitForStart(world, countryPlaced);
  await countryPlaced;
  document.body.classList.add('game-started');
  hideAdvice();
  input.tryLock(false); // the game itself asks here, long after the click that started it: refusing is no sign of a browser without lock (#328)
  setMenuAudio(false);
  // a benchmark started from a game: its result waits in Instellingen > Beeld
  if (world.openSettingsOnStart) { openPauseMenu('settings', { sub: world.openSettingsOnStart }); world.openSettingsOnStart = null; }

  wireFotoKey(world, () => !isMapOpen() && !isPauseMenuOpen() && !isShopOpen() && !isCinematicActive() && !world.pigeonMode);
  let last = performance.now();
  let menuDt = 0;
  let trafficTimer = 0;
  const tileFollow = {};
  let pedTimer = 0;
  function frame(now) {
    if (getSettings().zuinig && skipFrame(now - last)) { requestAnimationFrame(frame); return; }
    const frameMs = now - last;
    const dt = Math.min(0.05, frameMs / 1000);
    last = now;
    probe.begin(now);
    const t0 = performance.now();
    const drawnBefore = canvasFrameCount();
    try {
      frameBody(dt);
    } catch (err) {
      showFrameError(err);
    }
    if (!world.paused && noteFrame(frameMs, performance.now() - t0)) refreshRenderScale();
    checkFrame(getRenderer(), canvasFrameCount() !== drawnBefore, blackFrameState);
    input.endFrame();
    probe.end();
    requestAnimationFrame(frame);
  }

  function blackFrameState() {
    const st = getSettings(), r = getRenderer(), c = r.domElement;
    return `${st.quality}, schaal ${dynamicScale()}, cpu ${cpuLevel()}, ${c.width}x${c.height}@${r.getPixelRatio().toFixed(2)}${world.paused ? ', pauze' : ''}${world.cameraOverride ? ', camera-override' : ''}`;
  }

  const feelDip = makeDip(), dipSeen = { imp: null, mh: null };
  let samenSince = null, gateMenu = false;
  function frameBody(dt) {
    // Samen spelen vanuit het hoofdmenu (#95): de lobby opent zodra het spel te besturen is (na de opening van een nieuw spel)
    // (een paar seconden wachten: de opening van een nieuw spel begint pas even na de start en zou de lobby anders overvallen)
    if (wantsOpenSamen()) {
      if (samenSince == null) samenSince = world.time;
      // met het wachtkamer-hek (nieuw spel samen) opent de lobby meteen, voordat de opening begint
      const klaar = samenGate() ? world.time - samenSince > 1.5 && document.body.classList.contains('game-started') && !isPauseMenuOpen() : world.time - samenSince > 5 && !isCinematicActive() && sinceCinematic() > 2 && !world.cameraOverride && !world.pendingRespawn && !isPauseMenuOpen();
      if (klaar) { gateMenu = samenGate(); takeOpenSamen(); samenSince = null; openPauseMenu('samen'); }
    }
    // het hek gaat pas open met minstens twee spelers en een druk op Spel starten (samenpanel.js); tot dan blijft iedereen in de wachtkamer
    if (gateOn() && gateMenu && !isPauseMenuOpen()) openPauseMenu('samen');
    if (!gateOn()) gateMenu = false;
    updateMapView(dt, world);
    world.paused = isMapOpen() || isPauseMenuOpen() || isShopOpen() || !!world.uiPaused || !!world.coopHold; // coopHold: wachtscherm bij een weggevallen speler (coophold.js)
    if (document.pointerLockElement && (isMapOpen() || isPauseMenuOpen() || isPhoneOpen())) document.exitPointerLock();
    // world.timeScale: slow-motion for cinematic moments (1 = normal)
    // hit-stop (#216): 60-90 ms dip bij een zware klap of een melee-raak
    const nowS = performance.now() / 1000;
    const imp = world.lastImpact, mh = world.lastMeleeHit;
    if ((imp && imp !== dipSeen.imp) || (mh && mh !== dipSeen.mh)) {
      triggerDip(feelDip, nowS, { strength: imp && imp !== dipSeen.imp ? imp.strength : 0, melee: !!(mh && mh !== dipSeen.mh) }, effectsFor({ reduceMotion: reducedMotion() || getSettings().speedFeel === false }));
      dipSeen.imp = imp; dipSeen.mh = mh;
    }
    const gameDt = dt * Math.max(0, Math.min(1, world.timeScale ?? 1)) * MODS.slow * dipScale(feelDip, nowS);
    // dev mode time scale (storydev.js): whole extra gameplay steps per frame
    const reps = world.devTimeScale > 1 ? Math.min(8, Math.round(world.devTimeScale)) : 1;
    if (!world.paused) for (let r = 0; r < reps; r++) updateGameplay(gameDt);
    // the tiles follow the camera or the player (speed and heading prefetch)
    if (world.map.follow) {
      const tf = tileFocus(world.player, world.cameraOverride, tileFollow, dt);
      // a boat on the waterway network: the tiles of its route ahead come early (#184)
      if (tf && world.player.inVehicle && world.player.inVehicle.isBoat && !world.cameraOverride) tf.opts = vaarPrefetch(tf.opts, tf.x, tf.y);
      if (tf) world.map.follow(tf.x, tf.y, tf.opts, 1.5);
      // the open sea as water rows round the player (#233)
      if (tf && world.map.addWaterPatches) ensureSeaRows(world.map, world.player.x, world.player.y);
    }
    updateAudio(dt, world);
    updateNarrative();
    updateBanter(world.paused ? 0 : gameDt, world);
    updateStoryContact(world.paused ? 0 : dt, world);
    updatePractice(world.paused ? 0 : dt, world);
    probe.mark('audio');
    updateStreetSigns(dt, world, getScene());
    const animDt = world.paused ? 0 : gameDt;
    updateFx3D(animDt, world, getScene());
    updateGore3D(animDt, world, getScene());
    updateKnockFx3D(animDt, world, getScene());
    updateWeaponDrops3D(animDt, world, getScene());
    updateSpikeStrips3D(animDt, world, getScene());
    updateGunFx3D(animDt, world, getScene());
    probe.mark('fx+gore');
    updateCityProps(animDt, world, getScene());
    updateFlavour3D(animDt, world);
    probe.mark('cityprops');
    updatePigeonAfterglow(animDt);
    // cutscenes keep running (and end) while you're a pigeon; its camera wins
    if (world.pigeonMode) { updateCinematics(dt, world); updatePigeonCamera(dt, world); }
    else if (!world.heliRun) {
      updatePhone(dt, world);
      updateSaveGame(dt, world);
    }
    if (world.coopNet) tickCoopNet(world, dt); // samen spelen (#95), alleen na een bewuste uitnodiging
    if (isHoldOpen()) checkHold(world);
    if (world.coopNet || world.coopPartner !== undefined) updatePartnerChip(world);
    if (world.coopNet || hasFigureMeshes()) syncFigures(world, dt); // de figuren van de andere spelers (#95)
    if (world.coopNet || hasPingMeshes()) syncPings(world); // de roepjes van de spelers (#367)
    if (world.coopRole === 'client') syncHostEntities(world); else if (hasHostEntities()) clearHostEntities(); // voertuigen en doel van de host bij een gast
    if (world.coopScene || hasHostScene()) updateHostScene(world); // filmpje, regel en keuze van de host bij een gast
    probe.mark('phone+save');
    updateSafety(dt, world);
    // a padel match owns the camera (cinematics.js resets cameraOverride each frame)
    if (world.padelGame) padelCamera(world);
    else if (isActivityActive()) activityCamera(world);
    // behind a menu the city keeps rendering, at a lower rate
    const cover = isMapOpen() ? 2 : Math.max(pauseMenuCover(), isShopOpen() ? 1 : 0);
    setMenuCover(cover);
    menuDt += world.paused ? dt : gameDt;
    if (!cover || menuDt >= MENU_FRAME_S[cover]) {
      update3D(Math.min(0.1, menuDt), world);
      menuDt = 0;
    }
    updatePhotoMode(dt, world);
    updateHud(dt, world);
    // a long jump (fast travel, teleport): the load screen while the city streams in
    if (world.devJumpLoad) { world.devJumpLoad = false; resetJumpWatch(); startLoadScreen(world, { kind: 'travel', x: world.player.x, y: world.player.y, mission: world.loadMission }); }
    watchJumps(world, { swallow: world.pigeonMode || !!world.pendingRespawn || isCinematicActive() || sinceCinematic() < 2 || !!world.cameraOverride, hold: world.paused && !world.uiPaused });
    probe.mark('hud');
  }

  function updateGameplay(dt) {
    world.time += dt;
    // samen spelen (#95): een gast draait de wereld van de host niet zelf; die komt via het net (coopnet.js, coopworld.js)
    if (world.coopRole === 'client' && world.coopNet && world.coopNet.joined) { updateGastLokaal(world); updateWeather(dt, world); refreshDayNight(world); return; } // het weer en de dagstand volgen de gastheer (#378) // winkelen en in- of uitstappen (#291)
    // money must stay a number: a NaN from any price or reward is undone
    if (Number.isFinite(world.money)) world._goodMoney = world.money;
    else {
      console.warn('geld was geen getal meer, hersteld', world.money);
      world.money = Number.isFinite(world._goodMoney) ? world._goodMoney : 250;
    }
    syncLedger(getLedger(), world.money, world.clock);

    trafficTimer -= dt;
    if (trafficTimer <= 0) {
      trafficTimer = 1.5;
      manageTrafficPopulation(world, { target: Math.round(scaledTarget(30) * MODS.cars) });
      // the centre is full of bikes: eight more cyclists while you are in it
      const inCentre = Math.hypot(world.player.x - CITY_CENTRE.x, world.player.y - CITY_CENTRE.y) < CITY_CENTRE.r;
      const rush = bikeBoost(wijkProfileAt(world.map, world.player.x, world.player.y).key, Math.hypot(world.player.x - CITY_CENTRE.x, world.player.y - CITY_CENTRE.y), hourOf(world));
      manageBikePopulation(world, { target: Math.round((scaledTarget(16) + (inCentre ? scaledTarget(8) : 0) + (rush ? scaledTarget(rush) : 0)) * MODS.bikes) });
      manageBusPopulation(world);
      manageScooterPopulation(world, { target: Math.round(scaledTarget(10) * MODS.scooters) });
      manageMotorPopulation(world, { target: Math.round(scaledTarget(motorTarget(wijkProfileAt(world.map, world.player.x, world.player.y).key, hourOf(world))) * MODS.motors) });
      manageBoatPopulation(world, { target: boatTarget() });
      tickRowingCoaches(world);
      if (simLevel() || MODS.fading) thinTraffic(world);
    }
    pedTimer -= dt;
    if (pedTimer <= 0) {
      pedTimer = 2;
      maintainPedestrians(world);
    }
    probe.mark('populate');

    if (world.pigeonMode) updatePigeonMode(dt, world);
    else if (world.heliRun) updateHeliRun(dt, world);
    else if (world.padelGame) { updatePadel(dt, world); updateCompanion(dt, world); }
    else if (isActivityActive()) { updateActivityGame(dt, world); updateCompanion(dt, world); }
    else {
      interactActivityKinds(world, 'pre');
      tryPadelInteract(world);
      interactActivityKinds(world, 'act');
      tryTrainInteract(world);
      interactActivityKinds(world, 'job');
      tryHeliSpotInteract(world);
      updateCashVan(dt, world);
      tryGarageInteract(world);
      tryMachineInteract(world);
      tryWeaponDropInteract(world);
      tryStreetLifeInteract(world);
      tryShopInteract(world);
      tryPigeonSpotInteract(world);
      interactActivityKinds(world, 'uitje');
      tryStationInteract(world);
      tryHomeInteract(world);
      tryHorecaInteract(world);
      updateSnackMachines();
      if (!updateTrainDriving(dt, world)) {
        // a post-game minigame (the fierljep duel) holds the player in place
        if (!world.challengeHoldPlayer) player.update(dt, world);
        updateCompanion(dt, world);
      }
      updateHome(dt, world);
      updateEmergency(dt, world);
      updateIndicators(dt, world);
    }
    updateHomeExterior(dt, world);
    probe.mark('player');

    updateTrafficLights(dt, world);
    const frameNoSim = nextSimFrame();
    const farAI = farAIDist();
    // ?simauto (#58): ver weg rijdende gewone auto's worden door de simulatieworker gestuurd (simbridge.js)
    const simCars = FLAGS.simworker && FLAGS.simauto && map.roads ? getSimBridge(map) : null;
    if (simCars) simCars.updateCars(dt, player, world.vehicles);
    for (let i = 0; i < world.vehicles.length; i++) {
      const v = world.vehicles[i];
      // police.js drives its own units; an abandoned or burning one just rolls out here
      if (v.driver === 'player' || v.isBoat || (v.isPolice && !v.disabled && !(v.hijacked && !v.driver))) continue;
      if (simCars && simCars.driveCar(v)) continue;
      // far ordinary traffic thinks less often on a CPU-bound machine (simload.js)
      if (farAI < Infinity && !keepVehicle(v) && skipFar(v, i, Math.abs(v.x - player.x) + Math.abs(v.y - player.y), dt)) continue;
      // simlagen (#18): gewoon verkeer op middenafstand denkt om de paar frames, met opgespaarde dt
      if (FLAGS.simlagen && !v.parked && !keepVehicle(v)) {
        const dd = Math.hypot(v.x - player.x, v.y - player.y);
        if (dd > 150 && stapSlaOver('auto', dd, i, frameNoSim)) { v._simDt = (v._simDt || 0) + dt; continue; }
      }
      const vdt = takeDt(v, dt);
      updateTrafficAI(v, vdt, map, world, Math.random);
      resolveVehicleBuildingCollision(v, map, vdt);
    }
    for (const v of world.vehicles) {
      if (v.isBoat && v.driver !== 'player') updateBoatAI(v, dt, map, world, Math.random);
    }
    probe.mark('traffic');

    if (!world.pigeonMode && !world.heliRun) updatePolice(dt, world);
    updateTrafficLaw(dt, world);
    updateOffences(dt, world, { signalsNear: trafficSignalsNear, phaseFor: trafficLightPhaseFor });
    updateMotorPolice(dt, world);
    resolveVehicleVehicleCollisions(world.vehicles, world);
    tickBurningVehicles(world, dt);
    updateRailway(dt, world);
    updateEvenementen(dt, world, calendarToday(world));
    // de routeplanner mijdt dichte afsluitingen van evenementen (#203)
    if (world.eventRouteSig !== routeSigDone) {
      routeSigDone = world.eventRouteSig;
      const n = calendarToday(world), hour = ((world.clock % 24) + 24) % 24;
      setRouteClosures(routeSigDone ? (x, y) => routePenalty(x, y, n, hour) : null, routeSigDone || '');
    }
    updateZeilvaren(dt, world, calendarToday(world));
    updateStationLife(dt, world, { routes: getRoutes(), point: routePoint, day: calendarToday(world), createBoard: createStationBoard, trains: getTrains(), schaal: 86400 / DAY_LENGTH_S, driving: getTrains().some((t) => t.state === 'player') });
    updateMovableBridges(dt, world);
    updateSluizen(dt, world);
    // a ship against a bridge deck: the crash sound of a car contact, by how hard the deck was hit (audio.js updateContactAudio)
    for (const h of updateBridgeHits(dt, world)) recordContact(h.boat, null, h.boat.x, h.boat.y, 0, 0, 4 + h.severity * 4, 0);
    if (FLAGS.brugbotsing) {
      bridgeDemoT += dt;
      if (bridgeDemoT > 6 && !bridgeDemoDone) bridgeDemoDone = !!startBridgeCrashDemo(world);
      stepBridgeCrashDemo(dt, world);
    }
    for (const v of world.vehicles) {
      if (!v.wrecked) checkVehicleWater(v, map, world);
    }
    updateHelis(dt, world);
    probe.mark('police+collide');
    if (!world.pigeonMode && !world.heliRun) {
      updateCombat(dt, world);
      updateBullets(dt, world);
    }
    updateDrunk(dt, world);
    probe.mark('combat');
    updatePedestrians(dt, world);
    probe.mark('peds');
    updateWildlife(dt, world);
    tickSchaapontvoering(dt, world);
    updateStreetLife(dt, world);
    updateSkyProps(dt, world);
    updatePigeonSpots(dt, world);
    updateHeliSpot(dt);
    updatePadelWorld(dt, world);
    tickActivityKinds(dt, world, 'world');
    updatePoleVaults(dt, world);
    probe.mark('wildlife');
    if (!world.pigeonMode && !world.heliRun) {
      updateMissions(dt, world);
      updateSikkomFeed(dt, world);
      updatePhoneFeed(dt, world);
      updateGarages(dt, world);
      updateHoreca(dt, world);
      updateShops(dt, world);
      updateParkingLots3D(world);
      updateMarinas3D(world);
      updateWaterplekken3D(world);
      updateStreekplekken3D(world);
      updateFlitspaal(dt, world);
      updateFlavour(dt, world);
    } else updateMissions(dt, world);
    updateStory(dt, world);
    updateGoal(dt, world);
    updateOnboarding(dt, world);
    updateContextHints(dt, world);
    tickActivityKinds(dt, world, 'late');
    updateWeather(dt, world);
    updateWorldEvents(dt, world);
    updateMuggings(dt, world);
    updateRoadRage(dt, world);
    updateClearZones(dt, world);
    updateDayNight(dt, world);
    updateCalendar(dt, world);
    updateCheats(dt, world);
    updateRegioLeven(dt, world);
    updateAchievementTracker(dt, world);
    updateRadio(dt, world);
    probe.mark('systems');
  }

  input.reset();
  resetJumpWatch();
  requestAnimationFrame(frame);
}

boot().catch((err) => {
  showLoadError(err.message);
  console.error(err);
});
