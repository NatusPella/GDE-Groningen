// first: copies the pre-0.29 'gte-*' storage keys before any module reads them
import './storagekeys.js';
import { hoofdspeler } from './players.js';
import { beginVehicleFrame } from './vehicleindex.js';
import './oudmigratie.js';
import { streamTreeProps } from './treeprops.js';
import { updateSkatefiets } from './skatefiets.js';
import { streamTrafficLightProps, getTrafficControllers } from './trafficlights.js';
import { streamFlitspaalProps } from './flitspaal.js';
import { addPropStreamer, brokenKeysNear } from './breakables.js';
import './geokernels.js'; // registers the geometry kernels with geojobs.js
import { setErrorContext } from './errorlog.js';
import { DEV, STORY_TEST, FLAGS } from './devflags.js';
import { bindCoop } from './coopglue.js';
import { startSoloHost, stopSoloHost } from './coopsolo.js';
import { tickCoopNet, setCoopTreinen, coopWereldDoorloop, zetSamenKanHaak } from './coopnet.js';
import { zetTreinBron } from './cooptrein.js'; // de gast zoekt de trein van de gastheer op (#492)
import { meldSamenKan } from './samenplan.js'; // (#684) de positieve "samen kan"-kaart
import { zetBestuurHaken } from './coopbestuur.js';
import { zetDeelHaken } from './coopbezit.js';
import { politieMetDoelwit } from './coopgezocht.js';
import { reportCrime } from './crime.js';
import { findEnterableVehicle } from './vehicle.js';
import { findRideableProp, rideProp } from './rideprops.js';
import { isHoldOpen, checkHold, openHold } from './coophold.js';
import { sessionBootTick, sessionBootDone } from './sessionboot.js'; // een sessie vanaf de start (#528, ADR 0022)
import { updatePartnerChip } from './coophud.js';
import { syncFigures, hasFigureMeshes } from './coopfigures3d.js';
import { syncHostEntities, hasHostEntities, clearHostEntities } from './coopentities3d.js';
import { syncExtra, hasExtra, clearExtra } from './coopextra3d.js';
import { maakMisc, maakWereldLijst, maakSprekersLijst } from './coopextra.js';
import { registreerHostBronnen } from './coopbronnen.js';
import { kermisOn } from './kermis.js';
import { stuntSnapshot } from './stuntavond.js';
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
import { eigenSpec, findParkingSpot } from './ownedvehicles.js';
import { ensureCountryEdge } from './countryplan.js';
import { warmCountryMaps } from './countrymap.js';
import { Input, lockVerlorenOpentMenu } from './input.js';
import { initGamepad } from './gamepad.js';
import { initPadKeyboard } from './padkeyboard.js';
import { initTextFields } from './textfield.js';
import { initInputDevice } from './inputdevice.js';
import { skipFrame, frameWorkMs } from './framecap.js';
import { initTouch } from './touch.js';
import { initGlyphs } from './glyphs.js';
import { initA11y } from './a11y.js';
import { isPlayAheadOpen } from './todo.js';
import { isHelpOfferOpen } from './assistlive.js';
import { Player } from './player.js';
import { World } from './world.js';
import { initCompanion, updateCompanion } from './companion.js';
import { tickRowingCoaches } from './roeicoach.js';
import { PATH_BUILDS_PER_FRAME } from './pathbudget.js';
import { updateTrafficAI, resolveVehicleBuildingCollision, resolveVehicleVehicleCollisions, manageTrafficPopulation, manageBikePopulation, manageBusPopulation, manageScooterPopulation, manageMotorPopulation, manageBoatPopulation, updateBoatAI, recordContact, checkVehicleWater, spawnHeroCarNear, tickBurningVehicles, setGroundMap } from './vehicle.js';
import { spawnPedestriansNear, updatePedestrians, CITY_CENTRE, ejectPassenger } from './pedestrians.js';
import { updateCombat, updateBullets, gastAanvalUitvoeren, gastSlagLanding } from './combat.js';
import { setCombatEffect } from './combateffect.js';
import { zetWapenHaken, zetGastWapenHaken } from './coopwapen.js';
import { WEAPONS } from './weapons.js';
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
import { initParkeergarages, updateParkeergarages } from './parkeergarage.js';
import { initHoreca, initCountryHoreca, updateHoreca, tryHorecaInteract } from './horeca.js';
import { initShops, initCountryShops, updateShops, tryShopInteract, COUNTRY_SHOP_KINDS, getShopsForRender, spawnSharedVehicle } from './shops.js';
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
import { initRailway, updateRailway, setRailExtraWorld, getTrains, getRoutes, routePoint, zetTreinVanHost, zetTreinenVanHost } from './railway.js';
import { updateZeilvaren } from './zeilvaren.js';
import { updateEvenementen } from './evenementenlive.js';
import { updateWerf } from './werflive.js';
import { manageSeaShips } from './zeeschepen.js';
import { updateGolven } from './golven.js';
import { Vehicle as WerfVehicle, getVaarNet as werfVaarNet, spawnBoatOnWater as werfSpawnBoat, isShip as werfIsShip } from './vehicle.js';
import { waterAt as werfWaterAt, waterPolyAt as werfWaterPolyAt } from './waterlevels.js';
import { buildingAt as werfBuildingAt } from './tileplace.js';
import { planVaarRoute as werfPlanRoute } from './vaarnet.js';
// de dingen die de werf van de wereld nodig heeft (werflive.js houdt ze buiten de module zodat een test ze kan nabootsen)
const WERF_ENV = { Vehicle: WerfVehicle, getVaarNet: werfVaarNet, waterAt: werfWaterAt, waterPolyAt: werfWaterPolyAt, buildingAt: werfBuildingAt, planVaarRoute: werfPlanRoute, spawnBoatOnWater: werfSpawnBoat, isShip: werfIsShip };
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
import { preloadRoadWorker } from './roadsurface.js';
import { init3D, update3D, resize3D, getScene, getRenderer, toggleLightRig, disposeObject, warmWaterIndex, setMenuCover, MENU_FRAME_S, refreshRenderScale, terrainReady, canvasFrameCount, prewarmStreamAt, prewarmPending, precompilePrograms, streamPending, queueWarmupObject, prewarmBusy, takeWarmupSamples, releaseWarmupSamples, getCamera, getFollowPose, setRouteLinks } from './scene3d.js';
import { checkFrame } from './blackframe.js';
import { setCameraOverride } from './cinematics.js';
import { noteFrame, hideAdvice, classifyGpu, readGpu, dynamicScale, cpuLevel } from './gfxprofile.js';
import { updateStreetSigns } from './streetsigns.js';
import { updatePhotoMode, wireFotoKey } from './fotomodusui.js';
import { initPauseMenu, isPauseMenuOpen, openPauseMenu, pauseMenuCover } from './pausemenu.js';
import { aandeel, tegelFoci, nietBijFoci } from './coopfoci.js';
import { wantsOpenSamen, takeOpenSamen, samenGate, requestOpenSamen } from './samenpanel.js';
import { maybeOpenOnlineStart, closeOnlineStart } from './onlineconsentui.js';
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
import { initSaveGame, updateSaveGame, readSaveInfo, ensureLatestSlot } from './savegame.js';
import { START_MONEY } from './economy.js';
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
import { initLoading, setLoadProgress, finishLoading, showLoadError, runStartScreen, yieldToPaint, planMenuStart, setLoadingStatus } from './startscreen.js';
import { initPigeonMode, updatePigeonMode, updatePigeonCamera, updatePigeonAfterglow, getPigeonPosition } from './pigeonmode.js';
import { initPigeonSpots, updatePigeonSpots, tryPigeonSpotInteract } from './pigeonspots.js';
import { initSideJobs, updateSideJobs, trySideJobInteract } from './sidejobs.js';
import { updateCashVan } from './cashvan.js';
import { initHeliRun, updateHeliRun, tryHeliSpotInteract, updateHeliSpot } from './helirun.js';
import { initPadel, updatePadel, tryPadelInteract, updatePadelWorld, padelCamera } from './padel.js';
import { initActivities, isActivityActive, updateActivityGame, tryActivityInteract, updateActivitiesWorld, tickActivitiesGast, activityCamera } from './activities.js';
import { initRadio, updateRadio } from './radio.js';
import { updatePoleVaults } from './fierljep.js';
import { initPostgame, updatePostgame, tryPostgameInteract } from './postgame.js';
import { initStationTravel, tryStationInteract } from './stationtravel.js';
import { initOmmelandFun, updateOmmelandFun, tryOmmelandInteract } from './ommelandfun.js';
import { tryAaien, updateAaien } from './aaien.js';
import { tryControle, updateControle } from './kaartjescontrole.js';
import { registerActivityKind, initActivityKinds, interactActivityKinds, tickActivityKinds } from './activityhub.js';
import { tryTrainInteract, updateTrainDriving } from './traindrive.js';
import { dist } from './util.js';
import { updateEmergency } from './emergency.js';
import { updateIndicators } from './indicators.js';
import { initAchievementTracker, updateAchievementTracker } from './achievementtracker.js';
import { initOmverrijden } from './omverrijden.js';
import { initBoerderij, boerderijTijd, boerderijKlokNul } from './boerderijlive.js';
import { BOERDERIJ_WERELD_KIND } from './boerderijwereld.js';
import { probe } from './hitchprobe.js';
import { initSafety, updateSafety } from './safety.js';
import { updateCinematics, isCinematicActive, sinceCinematic, setCinematicLinks } from './cinematics.js';
import { getGrenzen } from './gebiedenbronnen.js';
import { initFlavour, updateFlavour } from './flavour.js';
import { initFlavour3D, updateFlavour3D } from './flavour3d.js';
import { prepareHomeMap, initHome, updateHome, updateHomeExterior, tryHomeInteract, homeSpawnPoint, parkHeroAtHome, garagePoortToestand } from './home.js';
import { updateDrunk } from './drunk.js';
import { updateHelis } from './heliflight.js';
import { planeKind } from './planeflight.js';
import { busBoardKind } from './busboard3d.js';
import { busBestuurKind } from './busbestuurhud.js';
import { busInterieurKind } from './businterieur3d.js';
import { bootInterieurKind } from './bootinterieur3d.js';
import { reklameTaxiKind } from './reklametaxi3d.js';
import { shopSignKind } from './shopsigns3d.js';
import { loadBusLines } from './busroutes.js';
import { setBusLines, attachToNearestRoad, getBusLines, setLiveBussen } from './vehicle.js';
import { maakBusLive } from './buslive.js';
import { stapSlaOver } from './simlagen.js';
import { getSimBridge, setSimCarAttach } from './simbridge.js';
setSimCarAttach(attachToNearestRoad);
import { scaledTarget, simLevel, nextSimFrame, farAIDist, skipFar, takeDt, keepVehicle } from './simload.js';
import { getSettings, magOnline } from './settings.js';
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
registerActivityKind(BOERDERIJ_WERELD_KIND); // je eigen erf, machines en werktuigen in de wereld (#415)
registerActivityKind(busBoardKind);
registerActivityKind(busBestuurKind);
registerActivityKind(busInterieurKind);
registerActivityKind(bootInterieurKind); // roef/stuurhut-interieurs van boten (#847)
registerActivityKind(reklameTaxiKind);
registerActivityKind(shopSignKind);
registerActivityKind({ id: 'ommeland', initPhase: 'early', init: initOmmelandFun, slot: 'uitje', interact: tryOmmelandInteract, tickPhase: 'late', tick: updateOmmelandFun });
registerActivityKind({ id: 'aaien', slot: 'uitje', interact: tryAaien, tickPhase: 'world', tick: updateAaien });
registerActivityKind({ id: 'kaartjes', slot: 'uitje', interact: tryControle, tickPhase: 'world', tick: updateControle });

// More life on the water: small paddle and pedal craft make up most of the
// mix (boattypes.js), cheap meshes; Laag keeps a smaller fleet.
// live bussen (#395): buslive.js kiest de opvraag (in Electron de brug van het main-proces, anders
// direct), houdt de stand bij en respecteert de instelling. Zonder netwerk-opvraag in de testruns.
const liveBussenToegestaan = !(DEV || FLAGS.trailer);
const busLive = maakBusLive({ zetBron: setLiveBussen, instellingen: getSettings, toegestaan: () => liveBussenToegestaan });
const boatTarget = () => scaledTarget(getSettings().quality === 'laag' ? 5 : 7);

// 3D (scene3d.js) is the only game view - see ARCHITECTURE.md. The old 2D
// top-down canvas renderer (render2.js, camera2.js) has been fully retired;
// every system that used to have a 2D-only draw path now also has a 3D one.
initLoading();

// The boot screen warms the start area and the shaders before the player gets
// keys, so the first seconds in the world build and link nothing on the main
// thread. A longer boot is the price the owner chose for a smooth start. A test
// or QA run skips it: those start from a script and their timing must stay put.
const WARM_START = !(FLAGS.noattract || FLAGS.storytest || FLAGS.stil || FLAGS.trailer || FLAGS.preview || FLAGS.benchmark || FLAGS.perf || FLAGS.spotsonly || FLAGS.autoplay || FLAGS.menutest);
// the start area's prewarm radius (the cutscene prewarm uses 110 m), the longest
// the boot screen may spend on it before it goes on anyway, and the frame time
// and calm run that count as "warm": a worker result or shader link that lands
// after the boot screen would be exactly the hitch we are trying to remove
const START_WARM_R = 320;
const START_WARM_MS = 25000;
const START_WARM_CALM = 12;
const START_WARM_MAX_FRAME_MS = 50;
  // De eigenaar koos een langer laadscherm boven een haperende eerste minuut: de
  // montageplekken mogen samen ruim een minuut kosten om klaar te zetten.
  const INTRO_WARM_MS = 45000;

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
    beginVehicleFrame(world); // #653: de actoren-index van dit frame
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
  // The start-area warm-up (runBootScreen awaits it before the boot screen goes):
  // prewarm the buildings round the spawn (or the loaded save's position), let the
  // game's own frame work build and upload the roads and street dressing there,
  // then compile the shaders. The boot screen stays up; no work spills into the
  // first seconds of play. "Warm" is not only streamPending(): the frames must be
  // quiet too, so a late worker result (city props, shores, far LOD) or a shader
  // that links on first use is caught here instead of in play. Never longer than
  // START_WARM_MS (a slow machine goes on with a partially warm area).
  const warm = async () => {
    if (!WARM_START) return;
    const x = world.player.x, y = world.player.y;
    const t0 = performance.now();
    setLoadingStatus('De buurt rond je startpunt wordt klaargezet');
    prewarmStreamAt(x, y, 240, START_WARM_R);
    // the Ommeland placement and the map images run next to this; while they are
    // not done the warm-up keeps going (the frames keep running, so this is not
    // the frozen wait of #750). What does not fit within START_WARM_MS continues
    // behind the game as before.
    let readyDone = false;
    if (ready) Promise.resolve(ready).then(() => {
      readyDone = true;
      if (window.__loadMarks) window.__loadMarks.background = Math.round(performance.now() - t0);
    }, () => { readyDone = true; });
    else readyDone = true;
    let calm = 0, frames = 0, slowRun = 0, worst = 0;
    while (performance.now() - t0 < START_WARM_MS) {
      const f0 = performance.now();
      try { tick(1 / 60); render(1 / 60); } catch (e) { console.warn('startgebied voorladen', e); break; }
      const frameMs = performance.now() - f0;
      worst = Math.max(worst, frameMs);
      slowRun = frameMs > START_WARM_MAX_FRAME_MS ? slowRun + 1 : 0;
      frames++;
      const sp = streamPending();
      const open = sp.buildings + sp.roads + prewarmPending() + (readyDone ? 0 : 1);
      calm = open === 0 && slowRun === 0 ? calm + 1 : 0;
      if (calm >= START_WARM_CALM) break;
      await yieldToPaint();
    }
    // De montage komt meteen na het laadscherm en springt langs een tiental
    // plekken in de stad. Laad en pin hun tegels nu, bouw de gebouwen daar voor
    // (die worden meteen gecompileerd) en compileer daarna de shaders nog eens:
    // de film betaalt dat niet meer met frames van seconden (#804).
    if (!world.loadedFromSave) {
      try {
        const opening = await import('./intromontage.js');
        // #738/#804: de vaste opening-assets (acteurs, keuken, props) één keer via de
        // bestaande warm-upqueue bouwen en in beide lichtstanden compileren.
        if (opening.prepareOpeningWarm) queueWarmupObject(() => opening.prepareOpeningWarm());
        const spots = opening.introShotPoints(world);
        if (spots.length) {
          setLoadingStatus('De openingsbeelden worden klaargezet');
          const tIntro = performance.now();
          let tilesIn = !(world.map && world.map.registerShots);
          if (!tilesIn) {
            Promise.resolve(world.map.registerShots(spots.map((p) => ({ at: [p.x, p.y] })), { radius: 350 }))
              .then(() => { tilesIn = true; }, () => { tilesIn = true; });
          }
          for (const p of spots) prewarmStreamAt(p.x, p.y, 180, 170);
          const end = performance.now() + INTRO_WARM_MS;
          while (performance.now() < end) {
            const f0 = performance.now();
            try { tick(1 / 60); render(1 / 60); } catch (e) { console.warn('openingsbeelden voorladen', e); break; }
            worst = Math.max(worst, performance.now() - f0);
            frames++;
            const queue = world.map && world.map.tileQueue && world.map.tileQueue.items ? world.map.tileQueue.items.length : 0;
            if (tilesIn && queue === 0 && prewarmPending() === 0 && !prewarmBusy()) break;
            await yieldToPaint();
          }
          // De opening-assets (acteurs, keuken, duiven, props) worden pas in
          // de film gebouwd. Teken ze hier één keer echt, onder beide
          // lichtstanden: compileren alleen zet de shader-uniforms nog niet,
          // en dat is precies de eerste-draw-piek in de film (#804).
          try {
            const tPal = performance.now();
            const warmGroup = opening.prepareOpeningWarm();
            if (window.__loadMarks) window.__loadMarks.introPaletteBuild = Math.round(performance.now() - tPal);
            const sc = getScene();
            if (warmGroup && sc) {
              const vorigeOverride = world.cameraOverride;
              const px = world.player.x, py = world.player.y;
              warmGroup.position.set(px + 8, 0, py + 8);
              sc.add(warmGroup);
              setCameraOverride(world, { position: { x: px + 15, y: py + 15, z: 9 }, lookAt: { x: px + 8, y: py + 8, z: 1 }, fov: 55, cut: true });
              const tDraw = performance.now();
              for (let f = 0; f < 1; f++) { tick(1 / 60); render(1 / 60); }
              toggleLightRig();
              for (let f = 0; f < 1; f++) { tick(1 / 60); render(1 / 60); }
              if (window.__loadMarks) window.__loadMarks.introPaletteDraw = Math.round(performance.now() - tDraw);
              toggleLightRig();
              sc.remove(warmGroup);
              setCameraOverride(world, vorigeOverride || null);
              world.__openingWarm = warmGroup;
            }
          } catch (e) { console.warn('opening-assets tekenen', e); }
            // Ook de warm-up-palette (voertuigen, voetgangers, dieren, effecten)
            // één keer tekenen: de eerste auto of explosie na de film is dan
            // geen eerste draw meer.
            try {
              const warmSamples = takeWarmupSamples();
              const sc2 = getScene();
              if (warmSamples && sc2) {
                const vorigeOverride2 = world.cameraOverride;
                const px2 = world.player.x, py2 = world.player.y;
                warmSamples.position.set(px2 - 8, 0, py2 - 8);
                sc2.add(warmSamples);
                setCameraOverride(world, { position: { x: px2 - 15, y: py2 - 15, z: 9 }, lookAt: { x: px2 - 8, y: py2 - 8, z: 1 }, fov: 55, cut: true });
                for (let f = 0; f < 1; f++) { tick(1 / 60); render(1 / 60); }
                toggleLightRig();
                for (let f = 0; f < 1; f++) { tick(1 / 60); render(1 / 60); }
                toggleLightRig();
                sc2.remove(warmSamples);
                setCameraOverride(world, vorigeOverride2 || null);
                world.__warmSamples = warmSamples;
              }
            } catch (e) { console.warn('warm-samples tekenen', e); }
          if (window.__loadMarks) {
            window.__loadMarks.introTiles = spots.length;
            window.__loadMarks.introWarm = Math.round(performance.now() - tIntro);
          }
        }
      } catch (e) { console.warn('openingsbeelden voorladen', e); }
    }
    if (window.__loadMarks) window.__loadMarks.startWarm = Math.round(performance.now() - t0);
    setLoadingStatus('De shaders worden klaargezet');
    const compiled = precompilePrograms();
    if (window.__loadMarks) {
      window.__loadMarks.shaders = Math.round(compiled);
      window.__loadMarks.warmWorstFrame = Math.round(worst);
      if (frames) window.__loadMarks.warmFrames = frames;
    }
  };
  return runStartScreen(world, { render, relocate, tick, ready, warm });
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
  const f = world.cameraOverride && world.streamFocus ? world.streamFocus : hoofdspeler(world);
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

// #751: de eerste-startvraag (Samen spelen) wacht op een bewuste klik (#556). Zonder invoer
// bleef de boot op 100% staan: er was geen time-out en geen Escape. Deze wachter sluit de
// vraag na 20 s of met Escape via de nette route van onlineconsentui.js (geen voorkeur
// opgeslagen, niets verbonden; de vraag komt de volgende start terug). Het spel start gewoon
// alleen verder. Een verborgen venster telt niet als antwoord: de vraag blijft dan staan.
const ONLINE_START_WAIT_MS = 20000;
// De vraag zelf openen we al vroeg, boven het laadscherm; het laden loopt
// erachter gewoon door. waitForOnlineStart legt pas vlak voor de start zijn
// time-out en Escape erop, zodat een trage schijf de vraag niet voortijdig sluit.
let onlineVraag = null;
function beginOnlineStartQuestion() {
  if (!onlineVraag) onlineVraag = maybeOpenOnlineStart();
  return onlineVraag;
}
function waitForOnlineStart(ms) {
  const vraag = onlineVraag || beginOnlineStartQuestion();
  return new Promise((resolve) => {
    let klaar = false;
    let timer = 0;
    const afronden = (res) => {
      if (klaar) return;
      klaar = true;
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey, true);
      resolve(res ?? null);
    };
    const zonderAntwoord = (waarom) => {
      if (klaar) return;
      closeOnlineStart();
      console.warn(`Samen-spelen-vraag gesloten zonder antwoord (${waarom}); geen voorkeur opgeslagen`);
      afronden(null);
    };
    const onKey = (e) => {
      if (!e || e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      zonderAntwoord('Escape');
    };
    const wacht = () => {
      timer = setTimeout(() => {
        if (document.hidden) wacht();
        else zonderAntwoord('time-out');
      }, ms);
    };
    wacht();
    window.addEventListener('keydown', onKey, true);
    Promise.resolve(vraag).then((res) => afronden(res), (err) => {
      console.warn('Samen-spelen-vraag mislukt', err);
      closeOnlineStart();
      afronden(null);
    });
  });
}

// #749: de boot als geheel heeft een uiterste grens. Tijdens de boot zijn de tegel-grenzen
// ruim maar begrensd (game/js/tilestore.js: 60 s per read en 60 s per decode, dus één koude
// tegel kan samen ~120 s kosten). De ladder is daarom: boot-tegelgrens (60/60 s) <
// MAP_LOAD_MS (150 s) < BOOT_WATCHDOG_MS (180 s). Zo loopt een langzame koude schijf niet
// stuk op de tegel-stap (de harde grens rond loadTileWorld) en blijft de wachter de
// buitenste grens in plaats van een tweede, scherpere deadline (#582, #749). De wachter
// meldt het na 180 zichtbare seconden met de laatste loadmarker en een herlaadknop. Tijd in
// een verborgen venster telt niet: daar staat rAF stil (Electron met backgroundThrottling,
// #656) en de boot hervat vanzelf als het venster terug is.
const BOOT_WATCHDOG_MS = 180000;
const MAP_LOAD_MS = 150000;
const TERRAIN_READY_MS = 60000;
let bootWatchdog = 0;
let bootWatchdogCleanup = null;
let bootFinished = false;

function stopBootWatchdog() {
  bootFinished = true;
  if (bootWatchdog) { clearTimeout(bootWatchdog); bootWatchdog = 0; }
  if (bootWatchdogCleanup) { bootWatchdogCleanup(); bootWatchdogCleanup = null; }
}

function showBootFailure(msg) {
  showLoadError(msg);
  const box = document.getElementById('loading');
  if (!box || document.getElementById('boot-reload')) return;
  const knop = document.createElement('button');
  knop.id = 'boot-reload';
  knop.type = 'button';
  knop.textContent = 'Opnieuw laden';
  knop.style.cssText = 'display:block;margin:18px auto 0;padding:10px 22px;font:inherit;cursor:pointer;border:1px solid #ffffff66;border-radius:6px;background:#ffffff22;color:#fff';
  knop.addEventListener('click', () => { try { location.reload(); } catch (e) { /* geen locatie */ } });
  box.appendChild(knop);
  if (knop.focus) knop.focus();
}

function armBootWatchdog() {
  let seenMs = 0; // zichtbare tijd sinds de boot begon
  let visibleSince = document.hidden ? 0 : performance.now();
  const visibleNow = () => seenMs + (visibleSince ? performance.now() - visibleSince : 0);
  const onVisibility = () => {
    const nu = performance.now();
    if (document.hidden) { if (visibleSince) { seenMs += nu - visibleSince; visibleSince = 0; } }
    else if (!visibleSince) visibleSince = nu;
  };
  document.addEventListener('visibilitychange', onVisibility);
  bootWatchdogCleanup = () => document.removeEventListener('visibilitychange', onVisibility);
  const plan = (ms) => {
    bootWatchdog = setTimeout(check, Math.max(1000, ms));
    if (bootWatchdog && typeof bootWatchdog.unref === 'function') bootWatchdog.unref();
  };
  const check = () => {
    bootWatchdog = 0;
    if (bootFinished) return;
    const gezien = visibleNow();
    if (gezien < BOOT_WATCHDOG_MS) { plan(Math.min(5000, BOOT_WATCHDOG_MS - gezien)); return; }
    const mark = Object.entries(loadMarks).sort((a, b) => b[1] - a[1])[0];
    console.warn(`boot-wachter: na ${Math.round(gezien / 1000)} s zichtbaar laden nog niet klaar; laatste marker: ${mark ? `${mark[0]} (${mark[1]} ms)` : 'geen'}`);
    showBootFailure('Het laden duurt te lang. Controleer je verbinding en probeer het opnieuw.');
  };
  plan(BOOT_WATCHDOG_MS);
}

// #749: één boot-stap met een harde grens. Zonder `onTimeout` verwerpt hij (zichtbaar in
// het laadscherm via boot().catch); met `onTimeout` gaat de boot door en waarschuwt die.
function withDeadline(p, ms, wat, onTimeout = null) {
  return new Promise((resolve, reject) => {
    let klaar = false;
    const timer = setTimeout(() => {
      klaar = true;
      if (onTimeout) { onTimeout(); resolve(null); return; }
      reject(Object.assign(new Error(`${wat} duurde te lang (${Math.round(ms / 1000)} s)`), { timeout: true }));
    }, ms);
    if (timer && typeof timer.unref === 'function') timer.unref();
    Promise.resolve(p).then((v) => { if (!klaar) { klaar = true; clearTimeout(timer); resolve(v); } },
      (e) => { if (!klaar) { klaar = true; clearTimeout(timer); reject(e); } });
  });
}

async function boot() {
  markLoad('boot');
  // #749: de boot als geheel heeft een uiterste grens (zie armBootWatchdog)
  armBootWatchdog();
  // the geometry worker loads its modules while the map downloads
  geoWorkerActive();
  preloadRoadWorker();
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
  // #749: een bron die nooit antwoordt mag de boot niet oneindig laten wachten; de
  // tegel-time-outs staan tijdens de boot uit (#582), dus deze stap krijgt zijn eigen grens.
  // the baked ground comes with the tiles (world/terrain.bin); without that file
  // the geometry worker builds it as before
  const tiles = await withDeadline(loadTileWorld('world/', { onProgress: onMapProgress, extra, terrain: FLAGS.terrain, terrainCache: true }), MAP_LOAD_MS, 'tegels laden');
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
  // de bron voor de live bussen is bij het opstarten al aan vehicle.js gegeven (buslive.js, #395)
  // the city's train routes on over the layer's track, the countryside's rails, turbines and pylons (corridorrail.js)
  const landData = corLayer && corLayer.global ? loadLandData('world/', corLayer.global.landFile) : null;
  const facilities = loadFacilities('stad.json');
  const shopPlaces = loadShopPlaces('stad.json');
  const map = tiles ? tiles.world : await withDeadline(loadMap('stad.json', onMapProgress), MAP_LOAD_MS, 'kaart laden');
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
  initParkeergarages(world);
  initHoreca(world);
  initShops(world);
  setShopSpots(spotsFrom(FAC.all, getShopsForRender()));
  initSnackMachines(world);
  initHome(world);
  parkHeroAtHome(world);
  initTrafficLights(world);
  world.coopExtraDeps = { controllers: getTrafficControllers, gebroken: brokenKeysNear, misc: (bij, g, nu) => maakMisc({ kermis: kermisOn(world), stunt: stuntSnapshot(), punten: world.mission && world.mission.phase === 'active' ? world.mission.remainingWaypoints : null }, g, nu), wereld: (bij) => maakWereldLijst(getMovableBridges(), getSluizen(), bij, garagePoortToestand()), sprekers: (bij, nu) => maakSprekersLijst(world.extraSpeakers, nu, bij), duif: () => getPigeonPosition() }; // wat de host de gasten vertelt (coopnet.js, coopextra.js)
  registreerHostBronnen(world); // tijdelijke rekwisieten en doelen voor de gasten (#452)
  initRailway(world);
  setCoopTreinen({ getTrains, getRoutes, routePoint, zetTreinVanHost, zetTreinenVanHost }); // samen spelen: de host stuurt zijn treinen (#428)
  zetTreinBron(() => ({ treinen: getTrains(), routes: getRoutes() })); // de gast zoekt de trein van de gastheer op (#492)
  // samen spelen (#434): een gast stapt in en rijdt een vrij voertuig van de host met de besturing van player.js (coopbestuur.js)
  zetWapenHaken({ aanval: gastAanvalUitvoeren, landing: gastSlagLanding }); // een gast met een wapen: de host rekent zijn aanval uit (#434)
  zetGastWapenHaken({ effect: (w, key, p) => { const wp = WEAPONS[key]; if (!wp) return; setCombatEffect({ type: wp.kind === 'melee' ? 'melee' : 'muzzle', angle: p.angle, until: w.time + (wp.kind === 'melee' ? 0.15 : 0.06), start: w.time, side: 1, weapon: key, swing: wp.swing }); (w.audioEvents || (w.audioEvents = [])).length < 64 && w.audioEvents.push({ kind: 'weapon', sub: wp.kind === 'melee' ? 'swing' : 'shot', weapon: key, x: p.x, y: p.y }); }, geluid: (w, ev) => { (w.audioEvents || (w.audioEvents = [])).length < 64 && w.audioEvents.push(ev); } }); // het eigen beeld en geluid van de gast
  zetBestuurHaken({ misdaad: (w, slot, kind) => reportCrime(w, kind, { dader: slot }), vind: findEnterableVehicle, vindProp: findRideableProp, rijProp: rideProp, enter: (l, v, w) => Player.prototype.enterVehicle.call(l, v, w), exit: (l, map, w, th) => Player.prototype.exitVehicle.call(l, map, w, th), drive: (l, dt, inv, map, w) => Player.prototype.driveVehicle.call(l, dt, inv, map, w), stap: (l, v, map, uit) => Player.prototype.stapNaastDeur.call(l, v, map, uit), trekUit: (w, v, rol) => ejectPassenger(w, v, rol) }); // trekUit: een gast trekt een passagier uit zijn deur (#459); stap: de gast stapt naast de deur van zijn stoel uit (#502)
  // samen spelen (#449): de gastheer zet het eigen voertuig van een gast neer (coopbezit.js)
  zetDeelHaken({ spec: eigenSpec, plek: (w, x, y, model, opts) => findParkingSpot(w, x, y, model, opts), maak: spawnSharedVehicle });
  zetSamenKanHaak(meldSamenKan); // (#684) de positieve "samen kan"-kaart naast de eerste "Meedoen?"
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
    if (!document.pointerLockElement && lockVerlorenOpentMenu({ gestart: document.body.classList.contains('game-started'), menuOpen: menuOpen(), vraagOpen: isPlayAheadOpen() || isHelpOfferOpen() })) openPauseMenu();
  });
  initDayNight(world);
  initCalendar(world);
  initCityProps(world);
  initFlavour(world);
  initFlavour3D(world, getScene());
  initPhone(world);
  initSaveGame(world);

  // #827: kleine, alleen-lezen framecijfers voor de latentiemeting; geen invloed
// op de spellus zelf.
const frameStats = { workMs: 0, frameMs: 16, at: 0 };
window.__debug = { player, map, input, world, frameStats };
  initAchievementTracker(world);
  initOmverrijden(world);
  initBoerderij();
  initSafety(world);
  initCheats(world);
  if (DEV) import('./storydev.js').then((m) => m.initStoryDev(world)).catch((e) => console.error('storydev', e));
  if (FLAGS.sfxtest) import('./sfx/sfxtest.js').then((m) => m.initSfxTest(world)).catch((e) => console.error('sfxtest', e));
  if (FLAGS.autoplay) import('./playerapi.js').then((m) => m.initPlayerApi(world, input)).catch((e) => console.error('playerapi', e));
  if (FLAGS.testmenu) import('./testmenu.js').then((m) => m.initTestMenu(world)).catch((e) => console.error('testmenu', e));
  if (DEV) import('./profileoverlay.js').then((m) => m.initProfileOverlay(world)).catch((e) => console.error('profileoverlay', e));
  if (STORY_TEST) import('./storytest.js').then((m) => m.runStoryTest(world)).catch((e) => console.error('storytest', e));
  markLoad('systems');
  // the first tiles round the save build while the boot screen is still up; boot loads the
  // save that was written last, so warm that slot and not whichever slot happened to be active
  // #655: de boot leest de save één keer (readSaveInfo); hasSave()/readSave() erna komen uit de lees-cache.
try { const slot = ensureLatestSlot(); const info = slot ? readSaveInfo() : null; const sv = info && info.data ? info.data : null; if (sv && sv.pos) prewarmStreamAt(sv.pos.x, sv.pos.y, 40); } catch (e) { /* ignore */ }
  // #749: de geometry-worker bouwt het terrein, maar een worker die leeft en niet antwoordt
  // heeft geen deadline; na 60 s gaat de wereld zonder dat terrein verder. De terugval op de
  // hoofdthread (terrainArrays/terrainGroup) zit in scene3d.js en blijft daar.
  await withDeadline(terrainReady(), TERRAIN_READY_MS, 'terrein bouwen', () => {
    console.warn('terrein: de geometry-worker antwoordde niet binnen 60 s; de wereld start zonder terrein');
  });
  markLoad('terrain');
  // Samen spelen (#530, ADR 0022): de eerste-startvraag (naam en alleen/samen)
  // verschijnt nu al boven het laadscherm terwijl de boot gewoon doorlaadt; pas
  // vlak voor de start wachten we op het antwoord (#751: time-out en Escape).
  // Zo staat de popup niet boven een laadscherm dat al "Klaar" zegt en hoeft hij
  // het laden niet stil te leggen.
  const vraagOnline = !(FLAGS.noattract || FLAGS.storytest || FLAGS.stil || FLAGS.trailer || FLAGS.preview || FLAGS.benchmark || FLAGS.perf || FLAGS.spotsonly || FLAGS.autoplay || FLAGS.menutest) && !document.hidden;
  if (vraagOnline) beginOnlineStartQuestion();
  await finishLoading();
  if (vraagOnline) {
    setLoadingStatus('Kies of je alleen of samen speelt');
    const antwoord = await waitForOnlineStart(ONLINE_START_WAIT_MS);
    onlineVraag = null;
    if (antwoord) setLoadingStatus(antwoord.keuze === 'meedoen' ? 'Samen spelen: de wereld wordt klaargezet' : 'Alleen spelen: de wereld wordt klaargezet');
    // Samen spelen is de default: wie meedoen heeft gekozen, ziet na het starten meteen de
    // openbare sessielijst (en kan daar alsnog alleen verder).
    if (magOnline() && !document.hidden) requestOpenSamen({ rol: 'gast', lijst: true });
  }
  markLoad('title');
  // the garages, cafés and shops out in the Ommelanden get their doors from the
  // tiles round them, and the minimap's and map's Ommeland images are drawn in
  // slices. Both run here, next to the boot screen, and the warm-up waits for
  // them within its own bound: no work spills into the first seconds of play.
  // It is *not* the old #750 wait: the warm loop keeps the frames running, and
  // what does not finish in time continues behind the game exactly as before.
  const countryPlaced = placeWithTiles(map, ['horeca', 'car_repair', 'fuel', ...COUNTRY_SHOP_KINDS], () => {
    initCountryGarages(world);
    initCountryHoreca(world);
    initCountryShops(world);
  }, { slice: 6 }).then(() => markLoad('placement'), (e) => console.warn('country placement', e));
  const countryMaps = warmCountryMaps().then(() => markLoad('countryMaps'), (e) => { console.warn('country maps', e); return true; });
  const ready = Promise.all([countryPlaced, countryMaps]).then(() => true, () => true);
  // the title screen already sounds like the city (quieter, no music)
  setMenuAudio(true);
  initAudio(world);
  setNieuwsBronnen({ bridges: getMovableBridges });
  setAudioCamera(getCamera);
  setRouteLinks({ getActiveRoute, getRouteAhead, getUserWaypoint });
  setCinematicLinks({ getFollowPose, prewarmStreamAt, getGrenzen });
  setSfxLinks({ bridges: getMovableBridges, trains: getTrains, vehicles: () => world.vehicles, locks: getSluizen });
  // #749: het laden is klaar; vanaf hier wacht het spel op de speler (de eerste-startvraag
  // heeft zijn eigen time-out) en telt de boot-wachter niet meer.
  stopBootWatchdog();
  await waitForStart(world, ready);
  // #750: eerst de wereld speelbaar (HUD, besturing en de spellus), daarna pas
  // wat van de achtergrondstappen over is. De warm-up hierboven wacht er met
  // draaiende frames op; alleen wat niet binnen zijn grens klaar was, loopt hier
  // nog door (zoals voorheen). Stond `await countryPlaced` hier, dan hing bij een
  // save het laadscherm boven een wachtende plaatsing: update3D draaide nog niet,
  // dus streamPending() kon niet dalen en de balk stond stil tot de 12 s-noodgreep.
  document.body.classList.add('game-started');
  markLoad('gameStart');
  // De montage ruimt de vooraf gepinde tegels zelf op; loopt hij niet (of is hij
  // al klaar), dan mogen ze hier alsnog vrij.
  setTimeout(() => {
    try { if (world.map && world.map.releaseShots && !document.body.classList.contains('intro-montage')) world.map.releaseShots(); if (!document.body.classList.contains('intro-montage')) { try { releaseWarmupSamples(); } catch (e) { /* niet erg */ } if (world.__openingWarm) { try { disposeObject(world.__openingWarm); } catch (e) { /* niet erg */ } world.__openingWarm = null; } } } catch (e) { /* niet erg */ }
  }, 20000);
  hideAdvice();
  input.tryLock(false); // the game itself asks here, long after the click that started it: refusing is no sign of a browser without lock (#328)
  setMenuAudio(false);
  // a benchmark started from a game: its result waits in Instellingen > Beeld
  if (world.openSettingsOnStart) { openPauseMenu('settings', { sub: world.openSettingsOnStart }); world.openSettingsOnStart = null; }

  wireFotoKey(world, () => !isMapOpen() && !isPauseMenuOpen() && !isShopOpen() && !isCinematicActive() && !world.pigeonMode);
  let last = performance.now();
  let laatsteFrameMs = 16;
  let soloWachtS = 0;
  let menuDt = 0;
  let trafficTimer = 0;
  const tileFollow = {};
  let pedTimer = 0;
  function frame(now) {
    // #804: plan het volgende beeld meteen, vóór al het werk van dit beeld. Een lange staart (of een
    // fout in de staart) kan de aanvraag dan niet meer overslaan; de browser houdt de cadans vast en
    // de volgende frame staat al klaar zodra deze callback klaar is.
    requestAnimationFrame(frame);
    const zuinig = getSettings().zuinig;
    if (zuinig && skipFrame(now - last)) return;
    const frameMs = now - last;
    const dt = Math.min(0.05, frameMs / 1000);
    // Het bewuste wachten van de zuinige modus is geen traag beeld (#561): de adaptieve kwaliteit
    // (noteFrame doet dezelfde aftrek) en het tegelbudget mogen de cap niet als GPU-drukte lezen.
    laatsteFrameMs = frameWorkMs(frameMs, zuinig);
    last = now;
    probe.begin(now);
    probe.mark('frame'); // #804: het gat tussen twee frames (GPU-wacht) krijgt een eigen naam, zodat de volgende sectie niet van de vorige frame-mark erft
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
    frameStats.workMs = performance.now() - t0;
    frameStats.frameMs = frameMs;
    frameStats.at = performance.now();
  }

  function blackFrameState() {
    const st = getSettings(), r = getRenderer(), c = r.domElement;
    return `${st.quality}, schaal ${dynamicScale()}, cpu ${cpuLevel()}, ${c.width}x${c.height}@${r.getPixelRatio().toFixed(2)}${world.paused ? ', pauze' : ''}${world.cameraOverride ? ', camera-override' : ''}`;
  }

  const feelDip = makeDip(), dipSeen = { imp: null, mh: null };
  let samenSince = null, gateMenu = false;
  function frameBody(dt) {
    // Alleen spelen is een sessie van één (#554): start die zodra het spel loopt en er
    // geen Samen-scherm open staat. Zo lopen alle functies door hetzelfde multiplayer-pad.
    // Wie online meedoet, wacht eerst op de startzoektocht (#528); die host of sluit aan, of
    // geeft na een paar pogingen op. Duurt het te lang of kan hij niet beginnen, dan valt de
    // sessie van één na 12 s in (de zoektocht stopt dan zelf zodra hij een sessie ziet).
    const onlineNu = magOnline();
    soloWachtS = onlineNu ? soloWachtS + dt : 0;
    const soloKlaar = !onlineNu || sessionBootDone(world) || soloWachtS > 12;
    if (!world.coopNet && !world.coopWissel && !wantsOpenSamen() && !isPauseMenuOpen() && !document.getElementById('load-screen') && document.body.classList.contains('game-started')
      && !FLAGS.coop && soloKlaar
      && !FLAGS.storytest && !FLAGS.trailer && !FLAGS.perf && !FLAGS.benchmark && !FLAGS.spotsonly && !FLAGS.autoplay && !FLAGS.preview && !FLAGS.menutest) {
      startSoloHost(world, { seed: world.seed ?? 1 });
    }
    // Samen spelen vanuit het hoofdmenu (#95): de lobby opent zodra het spel te besturen is (na de opening van een nieuw spel)
    // (een paar seconden wachten: de opening van een nieuw spel begint pas even na de start en zou de lobby anders overvallen)
    if (wantsOpenSamen()) {
      if (samenSince == null) samenSince = world.time;
      // met het wachtkamer-hek (nieuw spel samen) opent de lobby meteen, voordat de opening begint
      const klaar = samenGate() ? world.time - samenSince > 1.5 && document.body.classList.contains('game-started') && !isPauseMenuOpen() : world.time - samenSince > 5 && !isCinematicActive() && sinceCinematic() > 2 && !world.cameraOverride && !world.pendingRespawn && !isPauseMenuOpen();
      if (klaar) { gateMenu = samenGate(); takeOpenSamen(); samenSince = null; stopSoloHost(world); openPauseMenu('samen'); }
    }
    // het hek gaat pas open met minstens twee spelers en een druk op Spel starten (samenpanel.js); tot dan blijft iedereen in de wachtkamer
    if (world.coopHekMenu) { world.coopHekMenu = false; if (gateOn()) gateMenu = true; } // een gast die midden in een spel aansloot bij een gastheer in de wachtkamer (coopgate.js)
    if (gateOn() && gateMenu && !isPauseMenuOpen()) openPauseMenu('samen');
    if (!gateOn()) gateMenu = false;
    // Samen spelen vanaf de start (#528, ADR 0022): zodra de wereld te besturen is en de speler dat wil,
    // zoekt het spel een sessie of opent het er zelf een. Zonder toestemming gebeurt hier niets; de wereld
    // loopt gewoon door terwijl er gezocht wordt (sessionboot.js). Wie in het titelscherm al voor Samen
    // spelen koos, houdt de bestaande lobby: die gaat voor.
    if (!wantsOpenSamen()) sessionBootTick(world, { onHold: (rol, slot, reden) => openHold(world, rol, slot, reden) });
    updateMapView(dt, world);
    world.paused = isMapOpen() || isPauseMenuOpen() || isShopOpen() || !!world.uiPaused || !!world.coopHold; // coopHold: wachtscherm bij een weggevallen speler (coophold.js)
    if (document.pointerLockElement && (isMapOpen() || isPauseMenuOpen() || isPhoneOpen())) document.exitPointerLock();
    input.menuStand(menuOpen()); // een gesloten menu vraagt de muis meteen weer (#435)
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
    const doorloop = world.paused && coopWereldDoorloop(world, isMapOpen() || isPauseMenuOpen() || isShopOpen());
    world.coopDoorloopNu = doorloop; // coopnet.js stapMetgezelInPauze: updateGameplay stapt Tessa dan al
    // #752: de actoren-index van dit frame, één keer, vóór alle systemen. De aanroep stond
    // alleen in de menu-tick (waitForStart), dus de spellus ververste de index nooit: elke
    // vehiclesNear()-query bouwde hem opnieuw op (honderden keren per frame) en in de
    // menuroute bevroor de index op het laatste menuframe.
    beginVehicleFrame(world);
    if (!world.paused) for (let r = 0; r < reps; r++) updateGameplay(gameDt);
    else if (doorloop) { // samen spelen (#434): de wereld loopt door achter een menu; alleen jouw eigen invoer staat stil
      const m = input.mouse, bewaard = { down: m.down, rightDown: m.rightDown, middleDown: m.middleDown, dx: m.dx, dy: m.dy, wheel: m.wheel };
      input.blocked = true; m.down = m.rightDown = m.middleDown = false; m.dx = m.dy = m.wheel = 0;
      try { updateGameplay(gameDt); } finally { input.blocked = false; Object.assign(m, bewaard); }
    }
    // the tiles follow the camera or the player (speed and heading prefetch)
    if (world.map.follow) {
      const tf = tileFocus(hoofdspeler(world), world.cameraOverride, tileFollow, dt);
      // a boat on the waterway network: the tiles of its route ahead come early (#184)
      if (tf && hoofdspeler(world).inVehicle && hoofdspeler(world).inVehicle.isBoat && !world.cameraOverride) tf.opts = vaarPrefetch(tf.opts, tf.x, tf.y);
      if (tf && world.coopFoci && world.coopFoci.length > 1) tf.opts = { ...tf.opts, foci: tegelFoci(world.coopFoci) }; // spelers uit elkaar: ook tegels rond de losse groepen (#429)
      // In een traag beeld minder tegelwerk op de hoofdthread, zodat een hapering niet
    // nog een frame lang doorwerkt (#553).
    if (tf) world.map.follow(tf.x, tf.y, tf.opts, laatsteFrameMs > 25 ? 0.6 : 1.5);
      // the open sea as water rows round the player (#233)
      if (tf && world.map.addWaterPatches) ensureSeaRows(world.map, hoofdspeler(world).x, hoofdspeler(world).y);
    }
    // The tile follower and the story systems are not audio (#473: this used
    // to be one section called "audio", and its 1945 ms peak was map
    // streaming). Each gets its own mark, so "audio" is only updateAudio.
    probe.mark('mapfollow');
    updateAudio(dt, world);
    probe.mark('audio');
    updateNarrative();
    updateBanter(world.paused ? 0 : gameDt, world);
    updateStoryContact(world.paused ? 0 : dt, world);
    updatePractice(world.paused ? 0 : dt, world);
    probe.mark('story');
    updateStreetSigns(dt, world, getScene());
    const animDt = world.paused && !doorloop ? 0 : gameDt;
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
    // De helikoptermissie (Ballonjacht): de filmcamera loopt mee, zodat V ook in de
    // lucht een andere stand kan kiezen in plaats van altijd star achter de heli
    // (#502). Alleen de telefoon en de save-tik blijven uit; de missie heeft haar
    // eigen HUD en spelregels en die veranderen hier niet.
    else if (world.heliRun) {
      // De filmcamera loopt mee, zodat V ook in de lucht een andere stand kan kiezen in plaats van
      // altijd star achter de heli. De hoogtecorrectie voor die stand zit in helirun.js (daar hoort
      // de camera van de missie thuis). Alleen de telefoon en de save-tik blijven uit.
      updateCinematics(dt, world);
    }
    else {
      updatePhone(dt, world);
      updateSaveGame(dt, world);
    }
    if (world.coopNet || world.coopWissel) tickCoopNet(world, dt); // samen spelen (#95), alleen na een bewuste uitnodiging
    if (isHoldOpen()) checkHold(world);
    if (world.coopNet || world.coopPartner !== undefined) updatePartnerChip(world);
    if (world.coopNet || hasFigureMeshes()) syncFigures(world, dt); // de figuren van de andere spelers (#95)
    if (world.coopNet || hasPingMeshes()) syncPings(world); // de roepjes van de spelers (#367)
    if (world.coopRole === 'client') { syncHostEntities(world, dt); syncExtra(world, dt); } else { if (hasHostEntities()) clearHostEntities(); if (hasExtra()) clearExtra(); if (world.coopSirenUnits) world.coopSirenUnits = null; } // voertuigen, doel, voetgangers, dieren, lichten en kapotte objecten van de host bij een gast (#428)
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
    if (world.devJumpLoad) { world.devJumpLoad = false; resetJumpWatch(); startLoadScreen(world, { kind: 'travel', x: hoofdspeler(world).x, y: hoofdspeler(world).y, mission: world.loadMission }); }
    watchJumps(world, { swallow: world.pigeonMode || !!world.pendingRespawn || isCinematicActive() || sinceCinematic() < 2 || !!world.cameraOverride, hold: world.paused && !world.uiPaused });
    probe.mark('hud');
  }

  // samen spelen, spelers uit elkaar (#429): verkeer rond een losse groep spelers, met zijn deel van het totaalbudget (coopfoci.js)
  function verkeerRondFocus(world, f, fa) {
    const key = wijkProfileAt(world.map, f.x, f.y).key;
    manageTrafficPopulation(world, { target: Math.round(scaledTarget(30) * MODS.cars * fa), focus: f });
    manageBikePopulation(world, { target: Math.round(scaledTarget(16) * MODS.bikes * fa), focus: f });
    manageScooterPopulation(world, { target: Math.round(scaledTarget(10) * MODS.scooters * fa), focus: f });
    manageMotorPopulation(world, { target: Math.round(scaledTarget(motorTarget(key, hourOf(world))) * MODS.motors * fa), focus: f });
  }

  function updateGameplay(dt) {
    world.time += dt;
    // samen spelen (#95): een gast draait de wereld van de host niet zelf; die komt via het net (coopnet.js, coopworld.js)
    if (world.coopRole === 'client' && world.coopNet && world.coopNet.joined) { updateGastLokaal(world, dt); try { if (world.coopBoerNet !== world.coopNet) { world.coopBoerNet = world.coopNet; boerderijKlokNul(); } boerderijTijd(world); } catch (e) { /* zonder boerderij */ } updateWeather(dt, world); refreshDayNight(world); try { updateEvenementen(dt, world, Number.isInteger(world.coopDag) ? world.coopDag : calendarToday(world)); } catch (e) { /* zonder evenementen */ } try { updateHomeExterior(dt, world); } catch (e) { /* zonder garage */ } try { updateGarages(dt, world, true); tickActivitiesGast(dt, world); updateStationLife(dt, world, { routes: getRoutes(), point: routePoint, day: calendarToday(world), createBoard: createStationBoard, trains: getTrains().filter((t) => !t.gastWeg), schaal: 86400 / DAY_LENGTH_S, driving: false }); } catch (e) { console.error('gast: gebouwen', e); } return; } // een gast ziet ook de garages en safehouses waar zijn lichaam tegenaan botst (#434) // het weer en de dagstand volgen de gastheer (#378) // winkelen en in- of uitstappen (#291)
    // money must stay a number: a NaN from any price or reward is undone
    if (Number.isFinite(world.money)) world._goodMoney = world.money;
    else {
      console.warn('geld was geen getal meer, hersteld', world.money);
      world.money = Number.isFinite(world._goodMoney) ? world._goodMoney : START_MONEY;
    }
    syncLedger(getLedger(), world.money, world.clock);
    probe.mark('populate-pre'); // #804: sectie begint hier, niet bij de vorige frame-mark

    trafficTimer -= dt;
    if (trafficTimer <= 0) {
      trafficTimer = 1.5;
      const fociN = world.coopFoci && world.coopFoci.length > 1 ? world.coopFoci.length : 1, fa = aandeel(fociN); // spelers uit elkaar (#429): de foci delen het budget
      manageTrafficPopulation(world, { target: Math.round(scaledTarget(30) * MODS.cars * fa) });
      probe.mark('pop-traffic');
      // the centre is full of bikes: eight more cyclists while you are in it
      const inCentre = Math.hypot(hoofdspeler(world).x - CITY_CENTRE.x, hoofdspeler(world).y - CITY_CENTRE.y) < CITY_CENTRE.r;
      const rush = bikeBoost(wijkProfileAt(world.map, hoofdspeler(world).x, hoofdspeler(world).y).key, Math.hypot(hoofdspeler(world).x - CITY_CENTRE.x, hoofdspeler(world).y - CITY_CENTRE.y), hourOf(world));
      manageBikePopulation(world, { target: Math.round((scaledTarget(16) + (inCentre ? scaledTarget(8) : 0) + (rush ? scaledTarget(rush) : 0)) * MODS.bikes * fa) });
      probe.mark('pop-bikes');
      // live bussen (#395): hooguit één opvraag per minuut, alleen met de instelling aan, nooit in de geautomatiseerde runs (buslive.js)
      busLive.tick(getBusLines());
      manageBusPopulation(world);
      probe.mark('pop-bus');
      manageScooterPopulation(world, { target: Math.round(scaledTarget(10) * MODS.scooters * fa) });
      probe.mark('pop-scooters');
      manageMotorPopulation(world, { target: Math.round(scaledTarget(motorTarget(wijkProfileAt(world.map, hoofdspeler(world).x, hoofdspeler(world).y).key, hourOf(world))) * MODS.motors * fa) });
      probe.mark('pop-motors');
      if (fociN > 1) for (const f of world.coopFoci) if (!f.host) verkeerRondFocus(world, f, fa);
      manageBoatPopulation(world, { target: boatTarget() });
      tickRowingCoaches(world);
      probe.mark('pop-boats');
      if (simLevel() || MODS.fading) thinTraffic(world);
    }
    pedTimer -= dt;
    if (pedTimer <= 0) {
      pedTimer = 2;
      maintainPedestrians(world);
      probe.mark('pop-peds');
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
    updateSkatefiets(world, dt);
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
    // #804: per-frame budget voor de eerste padopbouw van nieuwe voertuigen
    const pathBudget = { left: PATH_BUILDS_PER_FRAME };
    const simCars = FLAGS.simworker && FLAGS.simauto && map.hasRoads() ? getSimBridge(map) : null;
    if (simCars) simCars.updateCars(dt, player, nietBijFoci(world, world.vehicles));
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
      updateTrafficAI(v, vdt, map, world, Math.random, { budget: pathBudget });
      resolveVehicleBuildingCollision(v, map, vdt);
    }
    for (const v of world.vehicles) {
      if (v.isBoat && v.driver !== 'player') updateBoatAI(v, dt, map, world, Math.random);
    }
    probe.mark('traffic');

    if (!world.pigeonMode && !world.heliRun) politieMetDoelwit(dt, world, updatePolice); // met een gast die gezocht wordt jaagt de politie op hem (#434)
    updateTrafficLaw(dt, world);
    updateOffences(dt, world, { signalsNear: trafficSignalsNear, phaseFor: trafficLightPhaseFor });
    updateMotorPolice(dt, world);
    resolveVehicleVehicleCollisions(world.vehicles, world);
    tickBurningVehicles(world, dt);
    updateRailway(dt, world);
    updateEvenementen(dt, world, calendarToday(world));
    updateWerf(dt, world, calendarToday(world), WERF_ENV); // een zeeschip wordt te water gelaten (#398)
    manageSeaShips(world, dt, WERF_ENV);
    updateGolven(world, dt); // kielzog en zeegang laten kleine vaartuigen wiebelen of omvallen (#417)
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
      updateParkeergarages(dt, world);
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
    boerderijTijd(world); // de gewassen groeien in speltijd (#415)
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
  // #749: ook een afgebroken boot krijgt de zichtbare fout met de herlaadknop
  stopBootWatchdog();
  showBootFailure(err && err.message ? err.message : String(err));
  console.error(err);
});












