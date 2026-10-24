import { SMS_SAY } from './smsvoice.js';
import { assistTime } from './assistlive.js';
import { dist, pointInPolygon, closestPointOnSegment, boatDryPoints, clamp, isInWater } from './util.js';
import { waterPolyAt } from './waterlevels.js';
import { isNight, setHomePlace, getHomePlace, registerMissionQueries } from './missionquery.js';
import { PERFECT_VERDICT } from './flavourlines.js';
import { spawnVehicleOnRoad, Vehicle, makeTwoWheeler, spawnHeroCarNear, attachToNearestRoad, TRACTOR_MODEL, QUAD_MODEL } from './vehicle.js';
import { placeOwnedVehicleNear } from './ownedvehicles.js';
import { findWalkPath } from './routing.js';
import { setGoal } from './goal.js';
import { playMissionIntro, playMissionFailed, isCinematicActive, playCinematic, skipCinematic } from './cinematics.js';
import { playStoryIntro, playStoryOutro, playStoryFail, playVaultScene, playDuelJump, playCastScene, playEyeContact, playPigeonSwarm, playToast, storySpeakerName } from './missionstory.js';
import { showTowerFlag, cutFlagRope, dropFlag, updateStoryProps, clearStoryProps, clearSkutsjeSail, hasTowerFlag, flagFocus, flagKnotsFocus } from './storyprops3d.js';
import { RING_ROUTE, RING_CHECKPOINTS } from './ringroute.js';
import { KEI_ROUTE, KEI_CHECKPOINTS } from './keiroute.js';
import { createRace, updateRace, raceStandings, disposeRace, updateRetiredRacers } from './racers.js';
import { TOUR_BOAT, rondvaartWaypoints, rondvaartBerth, startRondvaart, updateRondvaart, stopRondvaart, rondvaartStatus, rondvaartTip, rondvaartOutro, playRondvaartBoarding, routeAt, ROUTE_LENGTH } from './rondvaartchase.js';
import { startHeliRun, isHeliRunActive, abortHeliRun, getHeliSpotsForRender } from './helirun.js';
import { createSearchlight } from './searchlight.js';
import { sweepAngle, inBeam, stepExposure } from './searchlightlogic.js';
import { helipadById } from './heliflight.js';
import { enterPlaneStage, updatePlaneStage, planeStageProgress, disposePlaneStage, releasePlaneStage, debugCompletePlaneStage } from './planestage.js';
import { spawnFxPuff, spawnFxSpark } from './fx3d.js';
import { Pedestrian } from './pedestrians.js';
import { isInsideBuilding, setPedPose } from './pedgeom.js';
import { knockDown, isKnockedDown } from './ragdoll.js';
import { getShopsForRender, getOwnedEntries, repaintVehicle, storyShopState, setStoryOutfit, ownedCarTops } from './shops.js';
import { SHOP_TYPES } from './shopdata.js';
import { getGaragesForRender, garageInside } from './garages.js';
import { getHomeGarageForRender } from './home.js';
import { startPigeonMode, stopPigeonMode, getPigeonFlight, summonDiveGull } from './pigeonmode.js';
import { getPigeonSpotsForRender } from './pigeonspots.js';
import { MISSION_IDS, MISSION_STORY_ORDER, missionCode, STEPS, missionIndexOf } from './storyarc.js';
import { requestRespawn } from './world.js';
import { getMissionRecord, recordStat } from './achievements.js';
import { BOAT_KINDS } from './boattypes.js';
import { animateSkutsjeRig } from './models3d_vehicles.js';
import { setMuseumCaseStolen } from './museum3d.js';
import {
  startHeist, guardRoute, placeHeistProps, updateHeist, updateFuse, closeFuse, camerasOff, vitrineSpot, vitrineStand, disposeHeist, heistEnterStage, heistLeaveStage,
  heistApproach, heistSpotAt, heistSendingBack, updatePlanStage, updateLock, updatePickpocket, updateLasers, updateCrack, updateGetaway, heistSkipGetaway, heistBoat, playEndingShot, heistRevealUpdate, openHeistDoor, REVEAL,
} from './heist.js';
import { spawnFjordTrain, fjordLoadPoint, fjordCrossing, loadFjord, loadFjordNow, updateFjordTrain, sendFjordTrainAway, catchFjordTrainNow, disposeFjordTrain, fjordTrainState } from './fjordtrain.js';
import { addDrunk } from './drunk.js';
import { klusloon, medalBonus } from './economy.js';
import { startStunt, updateStunt, stopStunt, stuntStatus } from './stuntavond.js';
import { storyLines, talkLines, storyDataReady, readingTime } from './storytext.js';
import { playTalk, stopTalk } from './storytalk.js';
import { buildNieuwDefs, applyNieuw } from './missions_nieuw.js';
import { createBake, updateBake, showBake, hideBake, bakeProgress, RECIPE_PRACTICE, RECIPE_CONTEST } from './bakeround.js';
import { startConvoy, spawnLimo, updateConvoy, convoyStatus, disposeConvoy } from './convoy.js';
import { wgsToWorld } from './rdnew.js';
import { enterChoice, updateChoice, closeChoice } from './stagechoice.js';
import { enterRit, updateRit } from './stagerit.js';
import { enterTiming, updateTiming, closeTiming, timingTag } from './stagetiming.js';
import { withValidity } from './validity.js';
import { afstandMeespeler, meespelerInVoertuig } from './spelersregister.js';
import { teamActor, doelStand, groepKlaar, WACHT_OP_ANDEREN } from './stagegroep.js';
// a radio fragment of a stage that never got played within ten minutes is moot (refs #171; not tied to the mission: the clue in it must not be lost)
const MISSION_RADIO_VALID = { ttl: 600 };
import { registerBusyProbe } from './busy.js';
import {
  isCheckpointStage, makeCheckpoint, applyCheckpointProgress, recordCheckpoint, createGrace, stepGrace,
  createRetryOffer, retryOfferLive, RETRY_KEYS,
} from './missioncheckpoint.js';
import { placeParty } from './storytravel.js';
import { respawnFade } from './respawn.js';
import { playerBusy } from './busy.js';
import { noteMoney } from './finance.js';
import { lateInstapVoor } from './coopmeedoen.js';
import { missieStatus, waarschuwVoorStart } from './coopstatus.js';

// radio fragments a stage puts on Nachtstreek (storycontact.js, loaded lazily: it imports the UI)
let contactMod = null;
import('./storycontact.js').then((m) => { contactMod = m; }).catch(() => {});
// story.js stays a lazy import (it sits in the import cycle): it holds the choices that outlive a mission
let storyMod = null;
import('./story.js').then((m) => { storyMod = m; }).catch(() => {});
// a choice of this mission (tag) or of an earlier one (remembered as 'keuze:<tag>')
const choiceOn = (tag) => !!(chain.tags && chain.tags.has(tag)) || !!(storyMod && storyMod.storyFlag('keuze:' + tag));

const TRIGGER_RADIUS = 4;
const CHECKPOINT_RADIUS = 6;
const RETRY_COOLDOWN = 5;
const ABANDON_DIST = 45;
const HINT_INTERVAL = 4;
const RACE_CHECKPOINT_RADIUS = 9;
const PODIUM = 3;
const STOP_RADIUS = 7;
const STOP_WAIT = 1.6;
const REQUIREMENT_HINT_EVERY = 25;

// Fatbike-terreur: a stream of bikes both ways down a narrow street. Only
// dying ends it; the hit count is for the medal.
const LANE_SPAWN_EVERY = 0.9;
const LANE_FAT_SHARE = 0.45;
const LANE_MAX_BIKES = 22;
const BIKE_TOUCH_RADIUS = 1.15;
const BIKE_HIT_GRACE = 2.5;

// Kroegentocht: drunk student crowds on the route, and now and then one of
// them staggers straight at you.
const CROWD_SIZE = 11;
const CROWD_RADIUS = 3.6;
const CHARGE_EVERY = [3.5, 6];
const CHARGE_SPEED = 3.4; // a drunk charging at you: a bit quicker than the player's jog (3.0)
const CHARGE_MAX_T = 4.5;
const DRUNK_LINES = ['Proost!', 'Nog ééntje dan!', 'Ik hou van jullie allemaal!', 'Waar is mijn fiets?', 'KEI-week! KEI-week!', 'Wie heeft mijn pet?', 'Ik ben niet dronken, ik ben Gronings!', 'Kom, nog één kroeg!'];
const CHARGE_LINES = ['Maaaaat! Knuffel!', 'HÉ! Jij bent toch die van Kiekdoar?', 'Ik ken jou! Van... ergens!', 'Opzij, ik moet naar de wc!', 'Polonaise! Iedereen mee!'];


// The nearest road point, unless that lies inside a building or a closed-off
// courtyard: then the nearest street you can actually reach (findOpenSpawn).
function roadSpot(map, x, y, drivable = false) {
  const p = map.nearestRoadPoint(x, y, 120, drivable) || { x, y, road: null };
  if (!map.isOpenSpot || map.isOpenSpot(p.x, p.y)) return p;
  return map.findOpenSpawn(p.x, p.y, 200, drivable) || p;
}

// Fixed spots in and around the binnenstad, picked so every leg is a real
// route on the road graph: car legs on the drivable network (the inner city
// is largely one-way and car-free, so straight-line distance lies), foot legs
// on the walk network, boat legs through the Diepenring's water polygon.
// A mission of the old story that the story no longer plays (#187). Its id keeps its place in MISSION_IDS
// (saves and medal records index by it), so the slot stays; nothing starts or lists it (ARC_BUILT).
const retiredDef = (id) => ({ type: 'stages', label: id, retired: true, reward: 0, start: { x: 0, y: 0, road: null }, stages: [] });

function buildDefs(world) {
  const { map } = world;
  const drive = (x, y) => roadSpot(map, x, y, true);
  const walk = (x, y) => roadSpot(map, x, y);
  // toast: the short drink at the door (missionstory.js playToast): glass, camera variant, one line or none
  const kroeg = (name, x, y, toast = null) => ({ ...walk(x, y), name, toast });
  // Route guidance between checkpoints along the streets, so the line to the
  // next marker never runs through a block; passed automatically (see waypointReached).
  const via = (spot) => ({ ...spot, via: true });
  const ring = (i) => ({ x: RING_ROUTE[i][0], y: RING_ROUTE[i][1], z: map.spawnZ ? map.spawnZ(RING_ROUTE[i][0], RING_ROUTE[i][1]) : 0, road: null });
  const kei = (i) => ({ x: KEI_ROUTE[i][0], y: KEI_ROUTE[i][1], road: null });
  const berth = rondvaartBerth(map);
  // H12: up the Oude Ebbingestraat from the Grote Markt to the Ebbingebrug, then
  // along the water (Spilsluizen, Lopendediep) to Oma Trijntje at the Noorderhaven
  const fatStart = walk(117.2, -13.68), fatBridge = walk(24.97, -259.81), fatEnd = walk(-289.25, -106.7);
  const laneLegs = [findWalkPath(map, fatStart.x, fatStart.y, fatBridge.x, fatBridge.y), findWalkPath(map, fatBridge.x, fatBridge.y, fatEnd.x, fatEnd.y)];
  const lanePts = laneLegs.every(Boolean) ? [...laneLegs[0].pts, ...laneLegs[1].pts.slice(1)] : [[fatStart.x, fatStart.y], [fatBridge.x, fatBridge.y], [fatEnd.x, fatEnd.y]];
  const list = [
    retiredDef('berend'),
    retiredDef('chaos'),
    {
      type: 'checkpoint',
      label: 'Wind tegen, beide kanten op',
      triggerRadius: 6,
      intro: ['Sjoerd, van de Kiezelweek, praat alleen met wie op het podium komt. Zijn neef werkt \'s nachts in het museum.', 'Doel: één rondje door de binnenstad, op de fiets, tegen vier eerstejaars. Alleen het podium telt, en niet stoppen voor gratis tasjes.'],
      outro: 'Podium! Sjoerd vertelt het: om twaalf uur gaan de camera\'s drie minuten uit. Nieuw doel: vannacht om twaalf uur de bal pakken.',
      race: 'kei',
      requires: 'bike',
      ride: 'bike',
      // the all-green crossing: Tessa comes the other way on her own bike
      moment: { at: 3, text: 'Alles groen. Tessa komt van de andere kant, op haar eigen fiets. Oogcontact. Jullie remmen allebei.' },
      // each on their own bike (D: she comes the other way at the all-green crossing), so she gets off his
      ownBike: true,
      say: 'Ik fiets zelf, op mijn eigen fiets. Met bonnetje. Zie je op het kruispunt.',
      // a bike does 25 km/h (Shift: ~33)
      timeLimit: 58,
      checkpointBonus: 33,
      reward: 550,
      start: kei(0),
      waypoints: [...KEI_CHECKPOINTS.slice(1).map(kei), kei(0)],
    },
    retiredDef('noorderzon'),
    retiredDef('ringweg'),
    {
      type: 'checkpoint',
      label: 'Nog eentje dan',
      intro: ['Kroegentocht! Vier kroegen, één avond, nul excuses. Grunn slaapt toch nooit.', 'Te voet, hè. De hele Poelestraat staat vol dronken studenten, en die lopen je zo omver.'],
      outro: 'Vier kroegen gehaald. Morgen wordt het een eierbalontbijt.',
      timeLimit: 110,
      checkpointBonus: 25,
      reward: 600,
      onFoot: true,
      drunk: 0.2, // per pub, drunk.js
      crowds: [walk(280.78, 120.54), walk(393.98, 116.67), walk(415.08, 180.75), walk(381.6, 217.54), walk(241.83, 129.23)],
      start: walk(251.57, 111.96),
      waypoints: [
        via(walk(306.24, 127.07)),
        kroeg('Café De Lallende Koe', 369.87, 113.64, { glass: 'beer', variant: 0, lines: [['A', 'Proost!']] }),
        via(walk(418.29, 120.1)),
        kroeg("Kroeg 't Scheve Toorntje", 413.32, 165.58, { glass: 'wine', variant: 1, lines: [['T', 'Op Grunn.']] }),
        via(walk(434.25, 176.51)), via(walk(397.09, 189.9)), via(walk(403.26, 205.71)), via(walk(369.49, 218.74)),
        kroeg('Nachtcafé De Uil van Half Vier', 356.19, 220.67, { glass: 'jenever', variant: 2, lines: [] }),
        via(walk(319.93, 240.6)), via(walk(264.01, 125.15)),
        kroeg('Café De Dikke Duif', 215.44, 133.59, { glass: 'beer', variant: 3, lines: [['T', 'Op de laatste.']] }),
      ],
    },
    {
      type: 'fatbike',
      label: 'Fatbikes tellen niet als fiets',
      intro: ['De Oude Ebbingestraat: smal, druk, en vol fatbikes die van twee kanten komen, over de stoep. Remmen hebben ze wel, gebruiken doen ze ze niet.', 'Loop de straat uit, over de Ebbingebrug en langs het water naar Oma Trijntje aan de Noorderhaven. Geschept worden doet pijn, maar zolang je blijft ademen telt het.'],
      outro: 'Overeind gebleven tussen de fatbikes. Oma Trijntje is trots.',
      timeLimit: 160,
      reward: 500,
      onFoot: true,
      lane: lanePts,
      // passed on the way: a toast, once
      notes: [{ ...fatBridge, text: 'De Ebbingebrug. Nu langs het water, naar de Noorderhaven. Daar rijden ze nog harder.' }],
      start: fatStart,
      dest: fatEnd,
    },
    retiredDef('rondvaart'),
    // --- Kop story missions (storyarc.js H2, H4, H6): 'stages' missions,
    // a list of small objectives run by the stage runner below
    {
      type: 'stages',
      label: 'Even pinnen',
      // a marker next to a parked car or a rack is hard to reach to 4 m (#243)
      triggerRadius: 6,
      intro: ['Twee reuzen trokken de pinautomaat uit de muur in de Herestraat, met Tessa\'s pas erin. Zonder pas geen contant geld voor het Loket.', 'Doel: breng de automaat naar Sjabbe van Pand & Poen. Eerst de pliesie kwijt, dan een nieuwe kleur.'],
      outro: 'Sjabbe gaf Tessa haar pas terug. De reuzen werken voor Jelle Terpstra, en hij vroeg naar het museum. Nieuw doel: naar Het Loket.',
      timeLimit: null,
      reward: 400,
      vehicle: 'car',
      start: drive(235.26, 401.14),
      stages: [
        { kind: 'board', label: 'Stap in de auto: de pinautomaat ligt achterin', say: 'Instappen: de automaat ligt achterin, met mijn pas erin. Hij piept een beetje.' },
        { kind: 'garage', stars: 2, target: { garage: true }, label: 'Naar Spuit & Klaar (automaat zit achterin)', say: 'Alarm! Twee sterren. Rij een garage in: Spuit & Klaar spuit hem om en de pliesie is je kwijt.' },
        { kind: 'goto', target: { shop: 'pand' }, mode: 'vehicle', radius: 14, stop: 1.2, label: 'Naar Pand & Poen: lever de automaat achterin af', say: 'Nieuwe kleur, nieuw leven. Door naar Pand & Poen, Sjabbe wacht achterom.' },
      ],
    },
    {
      type: 'stages',
      label: 'Kieken van boven',
      intro: ['Voor ze de bal pakken, willen Tessa en Tammo weten hoe het museum bewaakt wordt. Bert, vriend van Tammo\'s opa, leent je een duif.', 'Doel: vlieg naar het Groninger Museum en fotografeer de camera\'s, de bewakers en de stroomkast.'],
      outro: 'Drie camera\'s, twee bewakers en een zwarte trekker-limo. Bewaker twee is omgekocht. Nieuw doel: de Kiezelrace winnen, want Sjoerds neef kent de camera\'s.',
      timeLimit: 200,
      reward: 350,
      start: walk(-44.33, 896.96),
      startSpot: 'station',
      stages: [
        {
          kind: 'pigeon', spot: 'station', label: 'Spot het museum van boven', say: 'Eerst even wennen: W/S hoger en lager, muis sturen, Shift sneller. Zweef boven het plein, dan door naar het museum.',
          targets: [
            { at: [-46.86, 864.79], label: 'Vliegles: zweef boven het Stationsplein' },
            { landmark: 'Groninger Museum', off: [-30, -22], label: 'Camera bij de noordgevel' },
            { landmark: 'Groninger Museum', off: [34, -8], label: 'Camera op de gouden toren' },
            { landmark: 'Groninger Museum', off: [18, 34], label: 'Camera bij de brug' },
            { landmark: 'Groninger Museum', off: [-12, 52], label: 'Bewaker bij de ingang' },
            { landmark: 'Groninger Museum', off: [-46, 14], label: 'Bewaker bij de achteringang' },
          ],
        },
      ],
    },
    {
      type: 'stages',
      label: 'Het museum stond er al zo',
      intro: ['Middernacht. Via het Verbindingskanaal naar de achterkant van het Groninger Museum. De camera\'s gaan drie minuten uit.', 'Doel: eerst de stroomkast, dan de vitrine met de Gouden Eierbal. En daarna wegwezen, het liefst over het water.'],
      outro: 'De vitrine was leeg: Jelle was jullie voor, en de camera\'s hebben jullie gefilmd. Nieuw doel: Jelle stoppen.',
      timeLimit: null,
      reward: 400,
      requires: ['heist', 'night'],
      // midnight: three minutes without cameras, from the fuse box until the case is open
      // once over time: 90 s more (the companion resets the fuse box), then it fails
      window: { after: 'fuse', until: 'crack', secs: 180, extra: 90, label: 'camera\'s uit', extend: 'De camera\'s gaan weer aan! Ik zet ze nog één keer op herhaling: anderhalve minuut. Opschieten!', late: 'de tijd is om. De camera\'s staan weer aan' },
      start: walk(29.31, 740.73),
      heist: { fuse: { landmark: 'Groninger Museum', off: [-29, -38], snap: 'walk' }, vitrine: { landmark: 'Groninger Museum', off: [3, 17] } },
      // heist.js: the plan picks the approach; stages with `only` belong to one of them
      stages: [
        {
          kind: 'plan', label: 'Het plan', kicker: 'Groninger Museum', title: 'De bouwtekening',
          lines: [
            ['A', 'Oké, luister. Het museum ligt op een eiland in het Verbindingskanaal.', { focus: 'island' }],
            ['T', 'Dus we moeten zwemmen.', { focus: 'water' }],
            ['A', 'Er zijn bruggen, Tammo. Eerst de stroomkast bij de fietsenstalling.', { focus: 'fuse' }],
            ['A', 'Dan draaien de camera\'s de hele nacht een filmpje van een leeg museum.', { focus: 'cams' }],
            ['T', 'En de bewakers?', { focus: 'guards' }],
            ['A', 'Die lopen rond met zaklampen. Blijf uit hun licht.', { focus: 'guards' }],
            ['A', 'In zaal 3 hangen lasers. Bukken, springen, wachten. Daarachter staat de vitrine.', { focus: 'lasers' }],
            ['T', 'Met een slot erop. En de code?', { focus: 'vitrine' }],
            ['A', 'Achttien karaat uit 1953. Raad eens.', { focus: 'vitrine' }],
            ['A', 'Naar binnen kan via de achterdeur: slotje openpeuteren en sluipen.', { focus: 'routeA' }],
            ['T', 'Of we worden schoonmakers. Ik heb twee overalls "geleend". En een emmer.', { focus: 'routeB' }],
            ['T', 'Jij bent de baas. Jij kiest.', { focus: 'choice' }],
          ],
        },
        {
          kind: 'goto', watch: { guards: 1, cameras: 2 }, target: { landmark: 'Groninger Museum', off: [-29, -38], snap: 'walk' }, mode: 'foot', radius: 5,
          label: 'Sluip naar de stroomkast', say: 'Eerst de stroomkast. Twee camera\'s en een bewaker: blijf uit de lichtbundels. Bukken helpt.',
        },
        { kind: 'fuse', target: { landmark: 'Groninger Museum', off: [-29, -38], snap: 'walk' }, label: 'Camera\'s op herhaling', say: 'De stroomkast. Druk op Spatie als de naald in het groen staat. Drie zekeringen, dan hebben we drie minuten.' },
        { kind: 'goto', only: 'sluip', target: { heistSpot: 'achterdeur' }, mode: 'foot', radius: 1.6, label: 'Naar de achterdeur', say: 'Camera\'s op herhaling. Nu de achterdeur, in de fietspassage.' },
        { kind: 'lock', only: 'sluip', target: { heistSpot: 'achterdeur' }, opens: 'achterdeur', label: 'Peuter het slot open', say: 'Slotje openpeuteren. Spatie als het pinnetje in het groen staat. Ik hou de wacht.' },
        { kind: 'goto', only: 'sluip', post: 'zaal1', target: { heistSpot: 'deur1' }, mode: 'foot', radius: 1.4, label: 'Sluip door zaal 1', say: 'Zaal 1. Die bewaker loopt rondjes. Wacht tot hij je zijn rug toekeert, en dan bukken.' },
        { kind: 'pickpocket', only: 'vermomd', post: 'rookplek', target: { heistSpot: 'rookplek' }, label: 'Rol het pasje van de bewaker', say: 'Overall aan, emmer mee. Die bewaker bij de glazen deur heeft het pasje. Sluip achter hem en blijf even staan.' },
        { kind: 'goto', only: 'vermomd', target: { heistSpot: 'glasdeur' }, opens: 'glasdeur', mode: 'foot', radius: 1.4, label: 'Door de glazen deur', say: 'Pasje erlangs en door de glazen deur. Gewoon doen alsof je hier werkt.' },
        { kind: 'goto', post: 'entreehal', distract: true, target: { heistSpot: 'deur3' }, mode: 'foot', radius: 1.3, label: 'Door de Entreehal', say: 'De Entreehal. Eén bewaker loopt, één slaapt achter de balie. Druk op E, dan tik ik op het raam.' },
        { kind: 'laser', target: { heistSpot: 'stand' }, label: 'Door de lasers van zaal 3', say: 'Zaal 3. Bukken onder de hoge lasers, springen over de lage, en wachten op de knipperende.' },
        { kind: 'crack', target: { heistSpot: 'stand' }, label: 'Kraak de vitrine', say: 'De vitrine. Draai met A en D, voel de klik en zet hem vast met Spatie.' },
        {
          kind: 'scene', reveal: true, label: 'De vitrine',
          kicker: 'Groninger Museum, zaal 3',
          lines: [['A', '"Tige tank! – J."', { clue: true }], ['T', 'Hij bedankt ons.'], ['A', 'Hij. Bedankt. Ons.']],
        },
        {
          kind: 'getaway', checkpoint: true, stars: 2, target: { heistSpot: 'boot' }, label: 'Alarm! Rennen, naar de boot', say: 'Alarm! Het kussen was een drukplaat. Rennen, ik haal de boot!',
          lines: [['T', 'Instappen! De motor draait al!'], ['A', 'Tammo, sinds wanneer kun jij varen?'], ['T', 'Sinds nu. Vol gas!']],
        },
        {
          kind: 'escape', stars: 2, label: 'Naar de kade bij het Hoofdstation', say: 'Jij stuurt, ik kijk achterom. Schud die pliesie af en leg aan bij het station. Daar zijn we gewoon reizigers.',
          // a mooring on the Verbindingskanaal in front of the station: the run ends there, once the police are gone
          target: { x: -26.96, y: 855.4, label: 'Kade bij het Hoofdstation' }, dock: 14, mode: 'boat',
          // Nachtstreek, live, while they flee: Jelle calls in
          radio: { caller: 'Een beller uit Ljouwert', lines: [
            ['rikus', 'We hebben een beller. Uit… Ljouwert?'],
            ['jelle', 'Moai, Rikus. Jelle Terpstra, van Us Mem Snacks. Ik wil een groet doen aan twee mensen in een museum.', { card: 'jelle' }],
            ['rikus', 'Jelle. Je bent live.'],
            ['jelle', 'Daarom bel ik. Reglement van de Noordelijke Snackprijs, artikel 4: de trofee gaat naar wie op Gronings Ontzet wint. Ik heb hem alvast meegenomen. Dat scheelt een rit.', { clue: true }],
            ['jelle', 'En geen vet, geen Grinzer aan de start. Oant sjen op it Ontset!'],
          ] },
        },
        { kind: 'shot', label: 'Weg van het museum', big: 'Iemand was ze voor.' },
      ],
    },
    // --- Romp story missions (storyarc.js H8, H10) ---------------------------
    {
      type: 'stages',
      label: 'Al het vet van Grunn',
      intro: ['De tankwagen van Us Mem Vet staat bij de groothandel aan de Bornholmstraat, vol met al het frituurvet van Grunn.', 'Kaap hem: spring erin, of schiet of ram zijn banden stuk. Breng het vet naar de Oosterpoort.'],
      outro: 'Het vet is terug in Grunn. Jelle sprong over de gracht, de tweeling fietste erachteraan.',
      timeLimit: null,
      reward: 950,
      vehicle: 'car',
      start: drive(1157.56, 406.06),
      handBack: { how: 'park', say: 'De tankwagen blijft bij de Oosterpoort, voor de frituurpannen. Wij lopen verder.' },
      stages: [
        { kind: 'board', label: 'Stap in de auto', say: 'Instappen, Femke heeft hem voor ons klaargezet. De tankwagen staat bij de groothandel.' },
        {
          // parked at the groothandel until you come close (`parked` m) or hit it; then it flees.
          // Jumping in (`hijack`) takes it there and then, and the run goes on to the Oosterpoort.
          kind: 'chase', label: 'Kaap de tankwagen of schiet zijn banden plat', say: 'Naar de groothandel aan de Bornholmstraat. Daar laden Durk en Douwe de tankwagen vol.',
          vehicle: { name: 'truck', tank: true, livery: 'usmemvet', len: 8.5, wid: 2.5, maxSpeed: 24, accel: 4.5, brake: 14, turnRate: 1.5, color: '#e6c21a' },
          name: 'Tankwagen Us Mem Vet', from: [1905.18, 335.21], lead: 6, hits: 70, flee: [-2596.64, 646.07], cruise: 15.5, escape: 380, time: 180,
          parked: 60, parkedLabel: 'Naar de groothandel aan de Bornholmstraat', go: 'Daar gaat hij! Erin springen, of de banden plat. Schieten mag, rammen mag.',
          stopped: 'Pang! Banden plat. Durk en Douwe springen eruit en fietsen weg, allebei op één fatbike.',
          hijack: 'Gekaapt! Durk en Douwe rollen eruit en fietsen weg, allebei op één fatbike. Het vet is van ons.',
        },
        { kind: 'board', label: 'Kaap de tankwagen', say: 'Hij staat stil. Instappen, het vet is van ons. Van Grunn, bedoel ik.' },
        { kind: 'goto', target: { at: [621.49, 662.56], snap: 'drive', label: 'De Oosterpoort' }, mode: 'vehicle', stop: 1, label: 'Breng de tankwagen naar de Oosterpoort', say: 'Rustig rijden, met platte banden. Naar de Oosterpoort, daar wachten de frituurpannen.', sayHijacked: 'Naar de Oosterpoort, daar wachten de frituurpannen. En rustig, hè: het is een tankwagen.' },
        {
          kind: 'vault', label: 'Jelle',
          lines: [['jelle', 'Moai, Grinzers. Mijn vet. Mijn tankwagen. Mijn dag.'], ['A', 'Was, Jelle. Het vet blijft in Grunn.'],
            ['jelle', 'Dan koop ik nieuw vet. Jild genôch. En een polsstok.'], ['T', 'Een wat?'], ['durk', 'Baas… en wij?'], ['jelle', 'Jim fytse mar, jonges.']],
          landing: 'Moai! Oant sjen op Gronings Ontzet!',
        },
      ],
    },
    {
      type: 'stages',
      label: "Er hangt iets Fries aan d'Olle Grieze",
      intro: ['Jelle heeft een reuzenvlag aan de Martinitoren gehangen. Heel Grunn kijkt ernaar.', 'Fluit een duif bij de toren en pik de vijf touwen los. Pas op voor de Fryske meeuwen.'],
      outro: 'De vlag ligt op de keien. Heel Grunn klapte voor een duif.',
      timeLimit: 240,
      reward: 600,
      // moved onto the Martinitoren pigeon spot once that exists (resolveSpotStarts)
      start: walk(205.43, 49.3),
      startSpot: 'martini',
      stages: [
        {
          kind: 'scene', label: 'De vlag aan de toren', target: { landmark: 'Martinitoren', off: [0, 70], snap: 'walk' }, showFlag: true,
          cam: { r: 58, h: 30, lookZ: 57, crane: true, at: { landmark: 'Martinitoren', off: [0, 14] } },
          kicker: "d'Olle Grieze", title: 'Een Friese vlag',
          cast: [{ key: 'jelle', pose: 'self', at: [3.4, 1.4] }], knots: true,
          lines: [
            ['V', 'Dertig meter Fries doek, aan de trots van Grunn. Onderaan, in grote letters: foar mem.'],
            ['jelle', 'Moai, Grinzers! Kijk eens omhoog. Foar mem.'],
            ['A', 'Zie je die vijf gele knopen, Tammo? Die houden hem vast.', { clue: true, look: 'knots' }],
            ['T', 'Vijf knopen. Vijf keer fluiten.'],
          ],
        },
        {
          kind: 'pigeon', spot: 'martini', label: 'Pik de vijf touwen los', say: 'Vlieg naar de gele knopen van de vlag en blijf er even bij hangen: pik, pik, los.',
          spotTime: 0.6, gulls: [6, 10], gullText: 'Een Fryske meeuw duikt op je af!', verb: 'Pik! %s is los',
          flag: { landmark: 'Martinitoren', off: [0, 12], z0: 42, z1: 72, width: 14 },
          targets: [
            { landmark: 'Martinitoren', off: [-7, 12], z: 72, r: 6, label: 'Touw linksboven' },
            { landmark: 'Martinitoren', off: [7, 12], z: 72, r: 6, label: 'Touw rechtsboven' },
            { landmark: 'Martinitoren', off: [-7, 12], z: 57, r: 6, label: 'Touw links' },
            { landmark: 'Martinitoren', off: [7, 12], z: 57, r: 6, label: 'Touw rechts' },
            { landmark: 'Martinitoren', off: [0, 12], z: 43, r: 6, label: 'Touw onderaan' },
          ],
        },
        {
          kind: 'scene', label: 'De vlag valt', target: { landmark: 'Martinitoren', off: [0, 70], snap: 'walk' }, dropFlag: true, shotLines: 2,
          cam: { r: 34, h: 9, lookZ: 34, at: { landmark: 'Martinitoren', off: [0, 14] } },
          kicker: "d'Olle Grieze", big: 'Hij valt!',
          lines: [['A', 'Daar gaat hij. Kopje onder, Jelle.'], ['T', 'Dertig meter vlag. Losgepikt. Door mijn duif.'], ['A', 'Ja, ja. Jouw duif.']],
        },
      ],
    },
    // --- Staart story missions (storyarc.js H14-H18) ---------------------------
    {
      type: 'stages',
      label: 'Geleend van de Friezen',
      intro: ['Jelle\'s skûtsje gooit los. Met de Gouden Eierbal aan boord, zegt Klaas.', 'Vaar er met je huurboot achteraan, ga langszij en spring aan boord.'],
      outro: 'De Eierbal was van chocola. Jelle sprong weg, maar hij verklapte zijn plan: een ballon.',
      timeLimit: null,
      reward: 1300,
      requires: 'boat',
      // starts at your rented boat, wherever it is moored (updateMissions)
      startAt: 'rental',
      triggerRadius: 9,
      start: walk(748.62, 408.8),
      stages: [
        { kind: 'goto', target: { rental: true }, mode: 'any', radius: 9, label: 'Naar je huurboot', say: 'Naar de huurboot. Het skûtsje gooit zo los.' },
        { kind: 'goto', target: { route: true, label: 'De Diepenring' }, mode: 'boat', radius: 30, label: 'Vaar de Diepenring op', say: 'Varen! De Diepenring op, daar komt het skûtsje langs.' },
        {
          kind: 'boatchase', label: 'Ga langszij bij het skûtsje', name: 'Skûtsje van Jelle', lead: 55, board: 8, boardTime: 2.5, escape: 230, time: 200,
          say: 'Daar vaart hij! Zwart skûtsje, rood zeil. Ga er vlak naast varen, dan spring je aan boord.',
          near: 'Langszij! Hou hem vast, Tammo springt zo...', lost: 'het skûtsje is weg, met zeil en al',
        },
        {
          kind: 'scene', label: 'Aan boord', target: { skutsje: true }, deckCam: true,
          kicker: 'Het skûtsje', big: 'Chocola?!',
          cast: [{ key: 'durk', at: [2.3, 0.35], jump: 'Plons.', jumpSide: 1 }, { key: 'douwe', at: [3.2, -0.35], jump: 'Plons.', jumpSide: -1, jumpDelay: 0.4 }],
          props: [{ kind: 'ball', holder: 'A', from: 'Hier is hij' }],
          lines: [['durk', 'Douwe! Er staat iemand op ons dek!'], ['T', 'Moi. Ik kom voor de Eierbal.'], ['A', 'En ik kom voor hem. Opzij, jongens.'], ['douwe', 'Plons?'], ['durk', 'Plons.'],
            ['A', 'Hier is hij! In een kist. Met een kaartje: "Foar mem."', { clue: true }], ['T', 'Hij knispert. Hij is… zacht.'], ['A', 'Chocola. Met goudpapier eromheen.']],
        },
        { kind: 'goto', target: { shore: true, label: 'De kade' }, mode: 'foot', radius: 6, label: 'Spring aan wal, achter Jelle aan', say: 'Jelle springt van boord! Aan wal, achter hem aan.' },
        {
          kind: 'vault', label: 'Jelle', target: { shore: true },
          lines: [['jelle', 'Moai, Grinzers. Jullie hebben mijn sûkelade gevonden.'], ['T', 'Waar is de echte, Jelle?'], ['jelle', 'Die gaat de lucht in. Fan\'e jûn, met een ballon.', { clue: true }],
            ['A', 'Een ballon? Doe bist nait goed wies!'], ['jelle', 'Jelle is Fries. Friezen zijn altijd goed wijs.']],
          landing: 'Oant fan\'e jûn, Grinzers!',
        },
      ],
    },
    {
      type: 'stages',
      label: 'Het staat niet in het rooster',
      intro: ['Rotor Roelf leent zijn demoheli uit, op Eelde. Onderweg belt Dokter Dijkstra met een spoedje.', 'Eerst het UMCG, dan Jelles ballon: Tessa vliegt, Tammo hangt aan het touw.'],
      outro: 'Tammo haalde de Eierbal uit de mand en Tessa zette de heli netjes op de H. Jelle landde in een weiland, tussen de koeien.',
      timeLimit: null,
      reward: 1500,
      // one flight in Rotor Roelf's demo heli: off from his pad on Eelde (resolveSpotStarts)
      start: { x: 1767.87, y: 9950.93, road: null },
      startSpot: 'eelde',
      stages: [
        { kind: 'heli', variant: 'traumaduif', target: { helipad: 'eelde', label: 'Rotor Roelf, Eelde' }, label: 'Vlieg naar het UMCG, dan achter de ballon aan', say: 'Instappen bij Roelf. Spatie omhoog, W vooruit, A/D draaien. De rest staat in beeld.', lost: 'de ballon is ontsnapt, richting de Ommelanden' },
      ],
    },
    {
      type: 'stages',
      label: 'Iedereen heeft een rode auto gezien',
      intro: ['Tammo\'s Escapade is gejat. Op zijn plek staat een klomp. Jelmers chat zag een rode auto bij de Westerhaven.', 'Alleen: vraag rond, volg het piepje van de zender die Henk erin zette en haal hem terug voordat hij op de trein naar Ljouwert staat.'],
      outro: 'De Escapade is terug. En Tammo zei sorry.',
      timeLimit: null,
      reward: 1100,
      vehicle: 'car',
      fjordTrain: true,
      // Tessa alone: Tammo stays behind with the klomp
      solo: true,
      start: drive(-46.69, 874.85),
      stages: [
        {
          kind: 'goto', target: { at: [-156.33, 913.89], snap: 'walk', label: 'De Westerhaven' }, mode: 'any', radius: 14, label: 'Naar de Westerhaven: daar zag Jelmers chat een rode auto', say: 'Jelmers chat zag een rode auto bij de Westerhaven. Erheen, en vraag rond.',
          // Mem Terpstra calls Nachtstreek while Tessa looks
          radio: { caller: 'Gerda Terpstra, Ljouwert', lines: [
            ['mem', 'Rikus. Gerda Terpstra, Ljouwert. Myn soan hat dy reade auto op de trein nei Ljouwert set. Zeg tegen dat famke: perron 3.', { card: 'mem', clue: true }],
            ['rikus', 'Mevrouw Terpstra, waarom helpt u ons?'],
            ['mem', 'Omdat mijn zoon gekke dingen doet om iets voor mij te winnen wat ik niet meer hoef. En omdat ik in 1953 tweede werd, tegen Trijntje. Dat heeft hij nooit losgelaten. Ik wel.'],
          ] },
        },
        {
          kind: 'scene', label: 'Rondvragen', target: { at: [-156.33, 913.89], snap: 'walk' }, solo: true,
          kicker: 'De Westerhaven', cast: [{ key: 'hilly', pose: 'point', at: [2.1, 0] }],
          lines: [
            ['hilly', 'Rooie auto? Mit twij grode kerels der in? Dij binnen net richten stasjon reden.'],
            ['A', 'Twee grote kerels. Durk en Douwe.'],
            ['hilly', 'De ain zat te zingen. Fries, docht ik. Dat heur je hier nait vaak.'],
            ['A', 'De Escapade heeft nog die oude zender van Henk. Hij piept. Achter het station!', { clue: true }],
          ],
        },
        { kind: 'goto', target: { at: [3.55, 882.08], snap: 'walk', label: 'Achter het station' }, mode: 'any', radius: 16, label: 'Volg het piepje van de zender naar achter het station', say: 'Het piepje wordt sneller. Achter het station, bij de goederentrein. Perron 3.' },
        { kind: 'board', label: 'Stap in de auto', say: 'Jelmer heeft zijn auto laten staan. Instappen, ze rijden weg!' },
        {
          kind: 'chase', label: 'Stop de Escapade', say: 'Achter ze aan! Ram hem tot hij stilstaat, voordat hij op de trein staat. Niet op Tammo\'s auto schieten, hè!',
          vehicle: { name: 'escort', len: 4.0, wid: 1.65, maxSpeed: 50, accel: 6, brake: 22, turnRate: 3.2, color: '#a11f1f' },
          hero: true, name: 'De Escapade', lead: 45, hits: 60, health: 170, flee: [-2595.05, 746.7], cruise: 16.5, escape: 380, time: 50,
          toTrain: true, loaded: 'Ze rijden de Escapade zo de goederentrein op! Die gaat naar Ljouwert.', late: 'Te laat: de Escapade staat al op de goederentrein naar Ljouwert!',
          meter: 'Escapade', clock: 'trein', half: 'Hij slingert! Durk krijgt de zenuwen.',
          stopped: 'De Escapade staat stil. Durk en Douwe springen eruit en fietsen weg, allebei op één fatbike.',
          // Tessa in her own car (it stood still, or she yanked the door open): that stops it too
          hijack: 'Tessa trekt het portier open. Durk en Douwe springen eruit en fietsen weg, allebei op één fatbike. De Escapade is terug!',
          block: true,
          lost: 'de Escapade staat op de trein naar Ljouwert', gone: 'de Escapade is foetsie', burned: 'de Escapade staat in de fik. Tammo praat nooit meer tegen je',
        },
        {
          kind: 'train', label: 'Blokkeer de overweg aan de Peizerweg', say: 'Snel, naar de overweg aan de Peizerweg! Ga erbij staan, dan moet de machinist wel stoppen.',
          caught: 'De trein staat stil. Durk en Douwe rijden de Escapade van de wagon en fietsen weg, allebei op één fatbike.',
          taken: 'Tessa rijdt de Escapade zelf van de wagon af. Moai!',
          lost: 'de Escapade staat op de trein naar Ljouwert',
        },
        { kind: 'board', label: 'Stap in de Escapade', say: 'Hij is terug. Instappen, Tessa. Hij rijdt nog. Nauwelijks.' },
      ],
    },
    {
      type: 'stages',
      label: 'Het bod viel tegen',
      intro: ['Jelle daagt jullie uit voor de Noordelijke Snackprijs op Gronings Ontzet. Winnen jullie, dan houden jullie de Eierbal.', 'Doe de boodschappen voor de echte eierbal: mosterd, verse eieren van de volkstuin en stoetbrood. En niet hard remmen met die eieren.'],
      outro: 'Alles is binnen, de eieren zijn heel. En ze weten wat ze met de Eierbal doen als ze winnen.',
      timeLimit: null,
      reward: 600,
      start: walk(-26.58, 878.55),
      eggs: { from: 2, failAt: 25, fail: 'omelet op de achterbank. Zo win je geen snackprijs' },
      stages: [
        { kind: 'goto', target: { shop: 'super' }, mode: 'any', stop: 0.8, pay: 60, paid: 'Groninger mosterd, drie potten', label: 'Mosterd halen bij Nait Duur', say: 'Eerst mosterd. Echte Groninger, bij Nait Duur.' },
        { kind: 'goto', target: { at: [1036.85, 1530.47], snap: 'walk', label: 'Volkstuin' }, mode: 'any', stop: 0.8, pay: 90, paid: 'Twaalf eieren van de kippen van Bert', label: 'Verse eieren bij de volkstuin', say: 'Nu eieren. De kippen bij Berts duiventil leggen de beste van Grunn.' },
        { kind: 'goto', checkpoint: true, target: { at: [696.4, 1254.24], snap: 'walk', label: 'Bakker Deeg & Deugd' }, mode: 'any', stop: 0.8, pay: 150, paid: 'Stoetbrood van gisteren, voor de korst', label: 'Stoetbrood bij Bakker Deeg & Deugd', say: 'Eieren achterin. Rustig rijden, niet remmen als een pion. Door naar de bakker.' },
        { kind: 'goto', checkpoint: true, target: { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' }, mode: 'any', stop: 0.8, label: 'Naar de kraam op de Grote Markt', say: 'Alles binnen. Naar de kraam op de Grote Markt, en heel voorzichtig.' },
      ],
    },
    {
      type: 'stages',
      label: 'Ontzet, net als in 1672',
      intro: ['Gronings Ontzet. De Noordelijke Snackprijs op de Grote Markt, Berend in de jury, en de Escapade met een luik: de eerste Fjord Frituur.', 'Hou de kraam heel tegen het vuurwerk, en laat de Eierbal niet uit het oog.'],
      outro: 'De Snackprijs gaat naar Grunn. De Gouden Eierbal blijft in Stad, met twee namen op het bordje.',
      timeLimit: null,
      reward: 4000,
      vehicle: 'car',
      start: drive(176.46, 116.21),
      stages: [
        {
          kind: 'hold', target: { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' }, radius: 9, time: 30, mode: 'foot',
          label: 'Hou de kraam heel tegen het vuurwerk', say: 'Durk en Douwe steken per ongeluk hun vuurwerk aan! Blijf bij de kraam en stap opzij als er een pijl aankomt.',
          ticks: ['De eerste eierballen gaan het vet in.', 'Berend ruikt al iets. Hij knikt bijna.', 'Nog even! De jury pakt de vorken.'],
          fireworks: { every: [1.0, 1.8], hit: 1.9, cost: 2, hitText: 'Pang! Vol raak. Even liggen, dan weer naar de kraam.' },
        },
        {
          kind: 'scene', label: 'Het naspel', target: { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' },
          kicker: 'Gronings Ontzet', big: 'Hij grist de Eierbal!',
          cast: [{ key: 'jelle', pose: 'hold', at: [2.2, 0] }, { key: 'durk', pose: 'arms', at: [3.5, 1.5] }, { key: 'douwe', pose: 'arms', at: [3.5, -1.5] }, { key: 'berend', pose: 'hips', at: [1.3, 2.7] }],
          props: [{ kind: 'ball', holder: 'jelle' }],
          lines: [['jelle', 'Mem moet hem zien. Vóór de uitslag. Ik bin sa werom!'], ['A', 'Hé! Die staat op de jurytafel!'], ['berend', 'Dit hoort niet bij het naspel.'], ['T', 'Tessa, de auto! Ik hou de eierballen warm.']],
        },
        { kind: 'board', label: 'Stap in de auto', say: 'Henk heeft de auto klaargezet. Instappen, achter die trekker aan!' },
        {
          // D-definitief H18: from the corner of the Grote Markt up the Oude Boteringestraat,
          // over the Boteringebrug, along the Spilsluizen and back down the Oude Ebbingestraat
          // into the fireworks; the torenwachter reports every street, then Tammo whistles
          kind: 'chase', label: 'Haal de trekker-limo van Jelle in: blijf erbij, dan fluit Tammo de duiven', say: 'Achter die trekker aan! Blijf erbij, ram hem als het kan. Niet schieten, er is kermis.',
          vehicle: { name: 'trekkerlimo', len: 5.6, wid: 2.0, maxSpeed: 40, accel: 7, brake: 14, turnRate: 2.1, color: '#1b1c1f' },
          name: 'Trekker-limo van Jelle', from: [19.79, 97.64], lead: 6, hits: 90, flee: [-1919.2, -874.66], cruise: 14, escape: 500, time: 300,
          meter: 'trekker', block: true,
          route: [
            { at: [-61.63, -38.94], radio: { caller: 'De torenwachter, d\'Olle Grieze', lines: [['torenwachter', 'Trekker, Oude Boteringestraat. Ik meld alleen.']] } },
            { at: [-144.22, -186.58], radio: { caller: 'De torenwachter, d\'Olle Grieze', lines: [['torenwachter', 'Trekker, Boteringebrug. Over het water, de bocht te ruim. Ik meld alleen.']] } },
            { at: [22.9, -263.8], radio: { caller: 'De torenwachter, d\'Olle Grieze', lines: [['torenwachter', 'Trekker, Spilsluizen. Hij rijdt een rondje om de toren. Ik meld alleen.']] } },
            { at: [66.83, -151.77], radio: { caller: 'De torenwachter, d\'Olle Grieze', lines: [['torenwachter', 'Trekker, Oude Ebbingestraat. Terug naar de markt, recht onder het vuurwerk door.']] } },
            { at: [110.91, -30.69] },
          ],
          // a third on the meter, 25 s close behind it, boxed in, or back at the market with you near: the pigeons
          swarm: {
            stall: { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' }, near: 260, close: 45, closeFor: 25,
            lines: [
              ['T', 'Kom op, jongens. Eén keer luisteren.'],
              ['torenwachter', 'Duiven. Boven het vuurwerk. Allemaal tegelijk. Ik meld alleen.'],
              ['jelle', 'Wat is dit?! Ik sjoch neat!'],
              ['A', 'Duiven luisteren naar niemand. Behalve naar hem.'],
            ],
          },
          half: 'Tammo fluit. Een zwerm duiven valt over het vuurwerk heen op de voorruit van de trekker!',
          stopped: 'De trekker-limo staat stil, vol duiven. Jelle stapt uit, met de Eierbal in zijn armen.',
          lost: 'Jelle is weg met de Eierbal', gone: 'Jelle is foetsie, met de Eierbal', burned: 'de trekker staat in de fik. De Eierbal smelt bijna',
        },
        {
          kind: 'scene', label: 'Voor mem', kicker: 'Gronings Ontzet', solo: true,
          cast: [{ key: 'jelle', pose: 'hold', at: [2.0, 0.3] }],
          props: [{ kind: 'ball', holder: 'jelle' }],
          lines: [['jelle', 'Ik woe him allinnich oan mem jaan. Foar de útslach.'], ['A', 'Ze staat op de Grote Markt, Jelle. Bij de jury. Geef maar.'], ['jelle', '…Tige tank.']],
        },
        {
          kind: 'goto', target: { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' }, mode: 'any', radius: 12, limit: 240, calm: true,
          label: 'Terug naar de kraam, voordat de eierballen koud zijn', late: 'de eierballen zijn koud. Berend proeft niks wat koud is',
          say: 'Terug naar de kraam, met de bal! Voordat de eierballen koud zijn.',
        },
      ],
    },
  ];
  list.push(...buildNieuwDefs({ map, walk, drive, models: { tractor: TRACTOR_MODEL, quad: QUAD_MODEL } }));
  applyNieuw(list);
  return list;
}

let chain = null;

export function initMissions(world) {
  worldRef = world;
  const defs = buildDefs(world);
  defs.forEach((d, i) => { d.id = MISSION_IDS[i]; });
  // a def that names its id (act 5) must sit at that id's index: the defs and NEW_MISSION_IDS are appended in the same order
  defs.forEach((d, i) => { if (d.mid && d.mid !== MISSION_IDS[i]) console.warn(`missions: def '${d.mid}' staat op plek ${i} maar MISSION_IDS heeft '${MISSION_IDS[i]}'`); });
  chain = {
    defs,
    index: 0,
    phase: 'idle',
    timeLeft: 0,
    cooldownTimer: 0,
    wpIndex: 0,
    completed: new Set(),
    seen: new Set(),
    // highest medal whose bonus this playthrough has paid, per mission index
    medalPaid: {},
    // #213: per mission index the last checkpoint stage of a failed or running attempt (not saved)
    checkpoints: new Map(),
    resume: null,
    grace: null,
    retry: null,
    run: null,
    race: null,
    vehicle: null,
    leftover: null,
    boarded: false,
    armed: true,
    hintAt: -Infinity,
    reqHintAt: -Infinity,
    bikes: [],
    crowd: [],
    pub: { type: null, label: '', phase: 'idle', timeLeft: 0, index: 0, total: defs.length, marker: { x: 0, y: 0 }, distanceToMarker: 0, remainingWaypoints: [] },
  };
  world.mission = chain.pub;
  // zaal 3's case is empty once H6 has been played
  setMuseumCaseStolen(() => isMissionCompleted(missionIndexById('museumkraak')));
  syncPub(world);
  world.onRespawn.push((w, { busted }) => {
    // samen spelen (#452): gaat alleen de gastheer neer en staat een meespeler nog, dan loopt de opdracht door; zonder meespelers (of alleen) faalt hij als altijd
    if (w.coopOpdrachtDoor && w.coopOpdrachtDoor()) return;
    failActiveMission(w, busted ? 'Missie mislukt: opgepakt' : 'Missie mislukt: knock-out', busted ? 'Opgepakt door de politie' : 'Je bent knock-out', busted ? 'opgepakt door de politie' : 'neergeslagen');
  });
}

// Index of the running mission (missions.js def index), or -1.
export function activeMissionIndex() {
  return chain && chain.phase === 'active' ? chain.index : -1;
}

// The running mission's current stage (a def.stages entry), or null.
export function activeStage() {
  if (!chain || chain.phase !== 'active') return null;
  const def = chain.defs[chain.index];
  return (def && def.stages && def.stages[chain.stageIndex]) || null;
}

export function failActiveMission(world, reason, bannerReason, coopReden = '') {
  if (!chain || chain.phase !== 'active') return false;
  const def = chain.defs[chain.index];
  playMissionFailed(world, { reason: bannerReason || reason, stats: runStats(world, def) }, false);
  const i = chain.index;
  if (world.coopUitslag) world.coopUitslag(false, def.label, coopReden || String(bannerReason || reason || '').toLowerCase()); // samen spelen (#371): ook knock-out, arrestatie en afbreken horen de gasten
  endInFailure(world, reason);
  syncPub(world);
  hooks.failed(world, i);
  return true;
}

// Stopping a running mission on purpose (pause menu "Missie stoppen", #390): not a failure. No Sikkom card, no fail count and no help
// offer in the story (hooks.failed is not called), no stats and no reward, and the checkpoint is dropped so the next try starts at the
// first stage. Everything a mission leaves behind is cleaned up the way a failure does it (endInFailure: talk, panels, props, the
// borrowed vehicle, a pigeon, the heli run), and the retry offer stands ("opnieuw beginnen? Enter") as does the marker at the start.
// In Samen spelen (#371) the host's guests hear that it was stopped (world.coopUitslag, `gestopt`).
export function cancelActiveMission(world) {
  if (!chain || chain.phase !== 'active') return false;
  const def = chain.defs[chain.index];
  const i = chain.index;
  chain.checkpoints.delete(i);
  if (world.coopUitslag) world.coopUitslag(false, def.label, '', 0, true);
  endInFailure(world, `${def.label} gestopt. Je kunt hem opnieuw starten`);
  syncPub(world);
  return true;
}

function speakerName(world) {
  const c = world.companion;
  if (c && c.character) return c.character === 'tammo' ? 'Tammo' : 'Anita';
  return world.player.character === 'tammo' ? 'Anita' : 'Tammo';
}

function statusOf(i) {
  if (chain.phase === 'active' && i === chain.index) return 'actief';
  if (i === chain.index) return 'volgende';
  return chain.completed.has(i) ? 'geklaard' : 'open';
}

// The new arc lists only the missions it has built (the others are old-story defs with the old plot's text, or not there yet).
const ARC_BUILT = new Set(STEPS.filter((s) => s.kind === 'mission' && s.built).map((s) => missionIndexOf(s.mission)));

export function getMissionList() {
  if (!chain) return [];
  const w = worldRef;
  return chain.defs.map((d, i) => ({
    index: i, id: d.id, code: missionCode(i), order: storyOrder(i), label: d.label, type: d.type, reward: d.reward, status: statusOf(i), skipped: !!hooks.skipped(i), start: { x: d.start.x, y: d.start.y },
    samen: missieStatus(d), needs: w ? requirementText(w, d) : null, done: chain.completed.has(i), klusloon: klusloon(d.reward), medalPaid: chain.medalPaid[i] || 0,
    pay: chain.completed.has(i) ? klusloon(d.reward) : d.reward,
  })).filter((m) => ARC_BUILT.has(m.index));
}

// --- requirements ------------------------------------------------------------
// Some missions need gear first: a gun of your own for Jelmer's livestream, a
// car on your own name for the sponsored ring race.

const REQUIREMENTS = {
  bike: {
    met: () => getOwnedEntries().some((o) => o.spec && o.spec.kind === 'bike'),
    shop: 'fietsen',
    text: (shop) => `De KEI-weekrace is een fietsrace: alleen wie een eigen fiets heeft, mag starten. Koop er een bij ${shop}.`,
  },
  heist: {
    met: () => { const st = storyShopState(); return st.incognito || st.rental; },
    shop: ['kleding', 'boot'],
    text: (shop) => `Voor de kraak heb je zwart incognito nodig (Stoer & Stads) of een huurboot (Bootje Huren). Dichtstbij: ${shop}.`,
  },
  night: {
    met: (w) => isNight(w),
    garage: true, home: true,
    text: () => 'Kraken doe je in het donker. Wacht thuis in de flat tot het avond is (na 21:00), of slaap tot de avond.',
  },
  boat: {
    met: () => storyShopState().rental,
    shop: 'boot',
    text: (shop) => `Hiervoor heb je een eigen boot nodig. Huur er een bij ${shop}.`,
  },
  weapon: {
    met: (w) => ['pistol', 'uzi', 'shotgun', 'jachtgeweer'].some((k) => (w.ammo[k] || 0) > 0),
    shop: 'wapens',
    text: (shop) => `Jelmer leent geen wapens meer uit. Koop eerst een wapen bij ${shop}.`,
  },
  // H9: a car of your own that can keep up on the ringweg (the Escapade once tuned)
  racecar: {
    met: (w) => ownedCarTops().some((c) => isRaceCar(c.name, c.top)) || rideOk(w, 'racecar'),
    shop: 'tuning',
    text: (shop) => `De ringweg-race win je alleen in een snelle auto, 200 km/u of meer. Voer de Escapade op bij ${shop}, of koop een sportwagen bij ${SHOP_TYPES.auto.chain}.`,
  },
  car: {
    met: () => getOwnedEntries().some((o) => o.spec && o.spec.kind === 'car' && !o.spec.unlock), // bought, not a story unlock
    shop: 'auto',
    text: (shop) => `De ringweg-race wordt gesponsord door ${SHOP_TYPES.auto.chain}: alleen wie een eigen auto heeft mag starten. Koop er eerst een bij ${shop}.`,
  },
};

// --- the right ride at the start ----------------------------------------------
// def.ride: what you have to arrive in for the mission to start (the start
// marker waits, with a line from the companion, until you do).
//   racecar  H9: a sports car, or any car tuned to 200 km/u (RACE_MIN_TOP)
//   bike     H5: any bike, a fatbike included
//   quay     H13: on the quay, not in a boat of your own: the tour boat waits

export const RACE_MIN_TOP = 200 / 3.6;
// the rivals top out at ~55 m/s (racers.js RACE_TOP x topScale) and the
// rubber band holds the leaders back: from 200 km/u the podium is a fair fight
const isRaceCar = (name, top) => name === 'sport' || top >= RACE_MIN_TOP - 0.01;
const isCarRide = (v) => !!v && !v.isBoat && !v.isBike && !v.isScooter && !v.isHeli;

function rideOk(w, ride, v = w.player.inVehicle) {
  if (ride === 'racecar') return isCarRide(v) && !v.wrecked && isRaceCar(v.model.name, v.model.maxSpeed);
  if (ride === 'bike') return !!v && v.isBike;
  if (ride === 'quay') return !v || !v.isBoat;
  return true;
}

// What the companion says when you turn up in the wrong thing.
const WRONG_RIDE = {
  racecar: [
    { when: (v) => !v, say: 'Lopend win je geen race. Haal je snelste auto.' },
    { when: (v) => v.model.tank, say: 'Met die vetwagen win je geen race. Haal je snelste auto.' },
    { when: (v) => v.isBike || v.isScooter, say: 'Op de ringweg win je niks op twee wielen. Haal je snelste auto.' },
    { when: (v) => v.isHeroCar, say: 'De Escapade is nog te traag voor de ringweg. Eerst langs Knal & Kolder.' },
    { when: () => true, say: 'Daarmee win je geen race. Haal je snelste auto, of laat hem opvoeren bij Knal & Kolder.' },
  ],
  bike: [
    { when: () => true, say: 'Het is een fietsrace. Kom op je eigen fiets.' },
  ],
  quay: [{ when: () => true, say: 'Eerst aanmeren en uitstappen. De rondvaartboot ligt al klaar aan de kade.' }],
};

// False (with the companion's line, now and then) while the player is not in
// the ride def needs.
function checkRide(w, def) {
  if (!def.ride || rideOk(w, def.ride)) return true;
  if (w.time - chain.reqHintAt >= 3) {
    chain.reqHintAt = w.time;
    const v = w.player.inVehicle;
    const line = WRONG_RIDE[def.ride].find((r) => r.when(v));
    w.addMessage(line.say, 4, { kind: 'missie' });
  }
  return false;
}

let worldRef = null;

// story.js plugs in here: waived requirements (a skipped gate), and what
// happens after a mission passes, fails or hits a gate.
const hooks = {
  waived: () => false,
  skipped: () => false,
  passed: () => {},
  failed: () => {},
  gated: () => {},
  // false while the story still has to hand the controls to the other character
  canStart: () => true,
};

export function setMissionHooks(h) {
  Object.assign(hooks, h);
}

// night by the sun (sunrules.js): the same answer as the street lights
export { isNight };

const reqList = (def) => (Array.isArray(def.requires) ? def.requires : def.requires ? [def.requires] : []);

// First requirement of def the player doesn't meet yet (key), or null.
export function unmetRequirement(w, def) {
  for (const key of reqList(def)) {
    const req = REQUIREMENTS[key];
    if (req && !req.met(w) && !hooks.waived(key)) return key;
  }
  return null;
}

export function requirementMet(w, key) {
  const req = REQUIREMENTS[key];
  return !req || req.met(w) || hooks.waived(key);
}

// Where to get requirement key: nearest shop of its type(s), or a garage.
// home.js registers where home is: waiting for the dark happens there.
export { setHomePlace };

export function requirementPlace(w, key) {
  const req = REQUIREMENTS[key];
  if (!req) return null;
  const homePlace = getHomePlace();
  const h = req.home && homePlace && homePlace();
  if (h) return h;
  if (req.garage) {
    let best = null, bd = Infinity;
    for (const g of getGaragesForRender()) {
      const d = dist(g.x, g.y, w.player.x, w.player.y);
      if (d < bd) { bd = d; best = g; }
    }
    return best ? { x: best.x, y: best.y, name: best.name } : null;
  }
  return nearestShopOf(w, req.shop);
}

function nearestShopOf(w, type) {
  const types = Array.isArray(type) ? type : [type];
  let best = null, bd = Infinity;
  for (const s of getShopsForRender()) {
    if (!types.includes(s.type)) continue;
    const d = dist(s.x, s.y, w.player.x, w.player.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

function chainName(req) {
  const t = Array.isArray(req.shop) ? req.shop[0] : req.shop;
  return t && SHOP_TYPES[t] ? SHOP_TYPES[t].chain : '';
}

function requirementText(w, def) {
  const key = unmetRequirement(w, def);
  if (!key) return null;
  const req = REQUIREMENTS[key];
  const place = requirementPlace(w, key);
  return req.text(place ? place.name : chainName(req));
}

// Tells the player (toast + phone) what is missing; story.js points the
// guide at the nearest place that sells it. Returns true when the mission
// may start.
function checkRequirement(w, def, force = false) {
  const key = unmetRequirement(w, def);
  if (!key) return true;
  if (w.time - chain.reqHintAt < (force ? 3 : REQUIREMENT_HINT_EVERY)) return false;
  chain.reqHintAt = w.time;
  const place = requirementPlace(w, key);
  const text = REQUIREMENTS[key].text(place ? place.name : chainName(REQUIREMENTS[key]));
  w.addMessage(text, 5);
  if (w.phoneNotifications) w.phoneNotifications.push({ from: 'GDE', text: `${def.label}: ${text}${place ? ' Staat op je kaart.' : ''}`, duration: 6, say: SMS_SAY.gate.lines[0] });
  hooks.gated(w, chain.index, key);
  return false;
}

export function getNextMission() {
  if (!chain) return null;
  const d = chain.defs[chain.index];
  return { index: chain.index, id: d.id, label: d.label, reward: d.reward, active: chain.phase === 'active', phase: chain.phase, start: { x: d.start.x, y: d.start.y } };
}

// Position of mission i in the story (MISSION_STORY_ORDER), or a large
// number for missions outside the arc.
function storyOrder(i) {
  const k = MISSION_STORY_ORDER.indexOf(i);
  return k >= 0 ? k : 100 + i;
}

export function missionIndexById(id) {
  return chain ? chain.defs.findIndex((d) => d.id === id) : -1;
}

export function isMissionCompleted(i) {
  return !!chain && chain.completed.has(i);
}

// story.js: makes mission i the next one without touching the player's
// waypoint (the story guide routes there by itself).
export function setNextMission(world, i) {
  if (!chain || !chain.defs[i] || chain.phase === 'active') return false;
  if (chain.index !== i) {
    chain.index = i;
    chain.phase = 'idle';
    chain.armed = true;
    chain.wpIndex = 0;
  }
  syncPub(world);
  return true;
}

// A skipped story mission counts as done for the story and the dialogue
// (no stats, medals or achievements); story.js pays the part of the reward.
export function markMissionCompleted(world, i) {
  if (!chain || !chain.defs[i]) return;
  chain.completed.add(i);
  chain.seen.add(i);
  if (chain.phase !== 'active' && chain.index === i) {
    chain.index = nextOpenMission(i);
    chain.phase = 'idle';
    // standing on the old marker must not start the next one straight away
    chain.armed = false;
    chain.wpIndex = 0;
  }
  syncPub(world);
}

// Read-only access for debug/test tooling (checkpoint validation).
export function getMissionDefs() {
  return chain ? chain.defs : [];
}

export function getActiveRace() {
  return chain ? chain.race : null;
}

export function isMissionActive() {
  return !!chain && chain.phase === 'active';
}
registerBusyProbe('mission', isMissionActive);
registerBusyProbe('activeRace', () => !!getActiveRace());
registerMissionQueries({
  isMissionActive, getActiveRace, isMissionCompleted, getMissionDefs, getMissionProgress, missionIndexById, getMissionList,
  payMedalBonus, setNextMission, unmetRequirement, requirementMet, requirementPlace, activeStage,
});

// Makes mission i the next one in the chain and the player's goal (goal.js).
// Callers that offer story missions ahead of the story go through todo.js
// playMission first, which asks.
export function trackMission(world, i) {
  if (!chain || !chain.defs[i]) return false;
  if (chain.phase === 'active') return i === chain.index;
  chain.index = i;
  chain.phase = 'idle';
  chain.armed = true;
  chain.wpIndex = 0;
  const d = chain.defs[i];
  checkRequirement(world, d, true);
  syncPub(world);
  setGoal({ kind: 'mission', id: i, x: d.start.x, y: d.start.y, name: missionCode(i) ? `${missionCode(i)} · ${d.label}` : d.label }, { quiet: true });
  return true;
}

export function getMissionProgress() {
  if (!chain) return null;
  return { index: chain.index, completed: [...chain.completed], seen: [...chain.seen], medals: { ...chain.medalPaid } };
}

export function setMissionProgress(world, prog) {
  if (!chain) return;
  // a save without mission progress is a fresh start: a mission running now still has to end
  if (!prog || typeof prog !== 'object') prog = {};
  const n = chain.defs.length;
  if (chain.phase === 'active') {
    // a save loaded mid-mission: what the mission put in the world goes with it
    clearStoryProps();
    if (chain.defs[chain.index] && chain.defs[chain.index].heist) setStoryOutfit(null);
  }
  releaseMissionVehicle(world);
  chain.afoot = false;
  chain.handBack = null;
  chain.index = Number.isInteger(prog.index) && prog.index >= 0 && prog.index < n ? prog.index : 0;
  const valid = (list) => (Array.isArray(list) ? list : []).filter((i) => Number.isInteger(i) && i >= 0 && i < n);
  chain.completed = new Set(valid(prog.completed));
  chain.seen = new Set([...valid(prog.seen), ...chain.completed]);
  chain.medalPaid = {};
  if (prog.medals && typeof prog.medals === 'object') {
    for (const [k, v] of Object.entries(prog.medals)) if (chain.defs[k] && Number.isInteger(v)) chain.medalPaid[k] = Math.max(0, Math.min(3, v));
  }
  chain.phase = 'idle';
  chain.armed = true;
  chain.wpIndex = 0;
  chain.run = null;
  chain.stage = null;
  chain.stagePending = false;
  if (chain.retry && chain.retry.fade != null) respawnFade(0, 0);
  chain.checkpoints.clear();
  chain.resume = null;
  chain.grace = null;
  chain.retry = null;
  if (world.pigeonMode) stopPigeonMode(world);
  syncPub(world);
}

function fmtTime(s) {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

const killCount = (world) => world.stats.pedKills + world.stats.copKills;

function runStats(world, def) {
  const r = chain.run;
  if (!r) return [];
  const stats = [['Tijd', fmtTime(r.elapsed)]];
  const kills = killCount(world) - r.kills;
  if (kills > 0 && def.type !== 'stunt') stats.push(['Kills', String(Math.max(0, kills))]);
  const rv = def.type === 'boat' ? rondvaartStatus() : null;
  if (rv) stats.push(['Toeristen', `${rv.joy}%`], ['Verhalen verteld', `${rv.told}/${rv.stops}`], ['Botsingen', String(rv.bumps)]);
  if (r.vehicleUsed && !rv) stats.push([def.fragile ? def.fragile.label : 'Schade voertuig', def.fragile ? `${Math.round(cargoLeft(def))}%` : `${Math.round(r.vehDamage)}%`]);
  if (def.type === 'fatbike') stats.push(['Geschept', String(chain.fatbikeHits || 0)]);
  const su = def.type === 'stunt' ? stuntStatus() : null;
  if (su) stats.push(['Punten', String(su.score)], ['Omver', String(su.broken)]);
  if (r.hurt > 0.5 || (!rv && !r.vehicleUsed)) stats.push(['Verwondingen', `${Math.round(r.hurt)}%`]);
  if (r.racePos) stats.push(['Positie', `${r.racePos}/${r.raceTotal}`]);
  return stats;
}

// The vehicle whose damage counts for the run: the mission car/boat, the
// handed-out race car/bike, else whatever the player drives meanwhile.
function runVehicle(world) {
  if (chain.vehicle) return chain.vehicle;
  if (chain.race && chain.race.playerCar) return chain.race.playerCar;
  const v = world.player.inVehicle;
  return v && !v.isBoat ? v : null;
}

// Damage is tracked as health lost (player HP and armour, and the health of
// the run's vehicle while it is being driven), never as the current level,
// so healing up or switching cars doesn't erase earlier knocks.
function trackRun(dt, world) {
  const r = chain.run;
  if (!r) return;
  r.elapsed += dt;
  const hp = world.health + world.armor;
  if (hp < r.hp && !world.pendingRespawn) r.hurt += r.hp - hp;
  r.hp = hp;
  const v = runVehicle(world);
  if (v) {
    if (v !== r.veh) { r.veh = v; r.vehHp = v.health; }
    if (world.player.inVehicle === v) r.vehicleUsed = true;
    if (v.health < r.vehHp) r.vehDamage = Math.min(100, r.vehDamage + (r.vehHp - v.health));
    r.vehHp = v.health;
  }
  r.damage = Math.min(100, r.hurt + r.vehDamage);
}

function cargoLeft(def) {
  const r = chain.run;
  if (!def.fragile || !r) return 100;
  return clamp(100 - r.vehDamage * def.fragile.per, 0, 100);
}

// Until the player sits in the mission car/boat, point them at it rather
// than at the destination they can't complete without it.
function vehicleToBoard(world, def) {
  if (def.type === 'stages') return stageNeedsVehicle(world, def) ? chain.vehicle : null;
  if (def.type !== 'deliver' && def.type !== 'boat') return null;
  const v = chain.vehicle;
  const p = world.player;
  if (!v || v.wrecked || v.disabled) return null;
  // the rondvaart is in the tour boat (the tourists are aboard), not your own
  if (p.inVehicle === v || meespelerInVoertuig(world, v)) return null;
  return v;
}

function syncPub(world) {
  const st = chain;
  const def = st.defs[st.index];
  const pub = st.pub;
  pub.type = def.type;
  pub.samen = missieStatus(def); // werkt de opdracht al samen? (coopstatus.js)
  pub.label = def.label;
  pub.phase = st.phase;
  pub.timeLeft = st.phase === 'active' && Number.isFinite(st.timeLeft) ? st.timeLeft : null;
  { const sg = st.phase === 'active' && def.stages ? def.stages[st.stageIndex] : null; pub.lateInstap = lateInstapVoor({ type: def.type, stageKind: sg && sg.kind, timer: pub.timeLeft != null, race: !!st.race }); } // mag een laatkomer nog meedoen? (samen spelen, #452)
  pub.code = missionCode(st.index);
  pub.index = st.index;
  pub.total = st.defs.length;
  const board = st.phase === 'active' ? vehicleToBoard(world, def) : null;
  let target;
  if (st.phase !== 'active' || def.type === 'stunt') target = def.start;
  else if (board) target = board;
  else if (def.type === 'deliver') target = chain.stuntPhase ? def.stunt.center : nextStop(def) || def.dest;
  else if (def.type === 'fatbike') target = def.dest;
  else if (def.type === 'stages') target = stageMarker(world, def);
  // past the last waypoint (the last pub's toast plays before the outro): the last one
  else target = def.waypoints[Math.min(st.wpIndex, def.waypoints.length - 1)];
  if (target) {
    pub.marker.x = target.x;
    pub.marker.y = target.y;
    pub.marker.z = Number.isFinite(target.z) && def.type === 'stages' && st.phase === 'active' ? target.z : null;
  }
  pub.distanceToMarker = afstandMeespeler(world, pub.marker.x, pub.marker.y);
  pub.armed = !!st.armed;
  pub.triggerRadius = def.triggerRadius || TRIGGER_RADIUS;
  pub.stunt = (def.type === 'stunt' || chain.stuntPhase) && st.phase === 'active' ? stuntStatus() : null;
  if (def.type === 'checkpoint' || def.type === 'boat') {
    pub.wpIndex = def.waypoints.slice(0, st.wpIndex).filter((wp) => !wp.via).length;
    pub.wpTotal = def.waypoints.filter((wp) => !wp.via).length;
  }
  if (st.race && st.phase === 'active') {
    const r = raceStandings(st.race);
    pub.racePos = r.position;
    pub.raceTotal = r.total;
  } else {
    pub.racePos = null;
    pub.raceTotal = null;
  }
  const active = st.phase === 'active';
  if (def.type === 'fatbike' && active) {
    pub.fatbikeHits = st.fatbikeHits;
    pub.fatbikeMaxHits = null;
  }
  const rv = def.type === 'boat' && active ? rondvaartStatus() : null;
  pub.happiness = rv ? rv.joy : null;
  pub.bumps = rv ? rv.bumps : null;
  const r = active ? st.run : null;
  pub.damage = r ? Math.round(r.damage) : null;
  pub.vehicleDamage = r && r.vehicleUsed ? Math.round(r.vehDamage) : null;
  pub.cargo = r && def.fragile ? Math.round(cargoLeft(def)) : null;
  pub.progressText = rv ? (board ? 'Stap in de rondvaartboot' : boatProgressText(rv)) : active ? progressText(world, def, pub) : null;
  const race = st.race && active ? raceStandings(st.race) : null;
  world.race = race ? {
    pos: race.position, total: race.total, finished: race.finished,
    elapsed: r ? r.elapsed : 0, remaining: st.timeLeft,
    checkpoint: pub.wpIndex, checkpoints: pub.wpTotal,
    phase: st.race.phase, bikes: !!st.race.bikes,
  } : null;
  pub.raceHud = (def.type === 'checkpoint' || def.type === 'boat') && st.phase === 'active' ? raceHud(st, pub) : null;
  // the car races (KEI-week and the ringweg) get the race loop; not the kroegentocht on foot
  pub.raceMusic = def.type === 'checkpoint' && !def.onFoot && st.phase === 'active';
  pub.remainingWaypoints =
    (def.type === 'checkpoint' || def.type === 'boat') && st.phase === 'active' && !board
      ? upcomingWaypoints(def, st.wpIndex).map((wp) => ({ x: wp.x, y: wp.y }))
      : [];
  world.mission = pub;
}

// The Diepenring loop has a guidance point every ~70 m: show those up to the
// checkpoint after next rather than dots all round the city.
function upcomingWaypoints(def, wpIndex) {
  const rest = def.waypoints.slice(wpIndex + 1);
  if (def.type !== 'boat') return rest;
  let real = def.waypoints[wpIndex] && !def.waypoints[wpIndex].via ? 1 : 0;
  const out = [];
  for (const wp of rest) {
    out.push(wp);
    if (!wp.via && ++real >= 2) break;
  }
  return out;
}

// Everything the race HUD shows for a checkpoint run (races, kroegentocht,
// rondvaart): position against the other racers, running time, time left,
// checkpoints and the best time from the lifetime records.
function raceHud(st, pub) {
  const rec = getMissionRecord(st.index);
  return {
    pos: pub.racePos || null,
    total: pub.raceTotal || null,
    elapsed: st.run ? st.run.elapsed : 0,
    timeLeft: Math.max(0, st.timeLeft),
    cp: Math.min(pub.wpTotal, (pub.wpIndex || 0) + 1),
    cpTotal: pub.wpTotal,
    lap: st.race ? 1 : null,
    laps: st.race ? 1 : null,
    best: rec && rec.best != null ? rec.best : null,
  };
}

function nextStop(def) {
  return def.stops && chain.stopIndex < def.stops.length ? def.stops[chain.stopIndex] : null;
}

// Live counter line for the HUD (races and checkpoint runs keep the HUD's
// own position/checkpoint text).
function progressText(world, def, pub) {
  if (def.type === 'deliver') {
    if (vehicleToBoard(world, def)) return `Stap in ${def.vehicleName || 'de auto'}`;
    if (chain.stuntPhase) {
      const s = stuntStatus();
      return s ? `Stunt op de Grote Markt · punten ${s.score}/${s.target}${s.combo > 1 ? ` · reeks x${s.combo}` : ''}${pub.vehicleDamage != null ? ` · schade ${pub.vehicleDamage}%` : ''}` : 'Rij naar de Grote Markt';
    }
    const stop = nextStop(def);
    const to = def.destName || 'de bestemming';
    const bits = [stop ? `Eerst naar ${stop.name}` : def.stops ? `Door naar ${to}` : `Rij naar ${to}`];
    if (def.fragile) bits.push(`${def.fragile.label} ${pub.cargo ?? 100}% heel`);
    else if (pub.vehicleDamage != null) bits.push(`Schade ${pub.vehicleDamage}%`);
    return bits.join(' · ') || null;
  }
  if (def.type === 'fatbike') return `Geschept: ${chain.fatbikeHits || 0} · Gezondheid ${Math.max(0, Math.round(world.health))}%`;
  if (def.type === 'stages') return stageProgressText(world, def);
  if (def.type === 'stunt') {
    const s = stuntStatus();
    if (!s) return null;
    if (!world.player.inVehicle) return `Stap in de Escapade · punten ${s.score}/${s.target}`;
    return `Punten ${s.score}/${s.target}${s.combo > 1 ? ` · reeks x${s.combo}` : ''}`;
  }
  return null;
}

function boatProgressText(rv) {
  const mood = rv.joy >= 80 ? 'blij' : rv.joy >= 55 ? 'tevreden' : rv.joy >= 30 ? 'nerveus' : 'paniek';
  const wiebe = rv.wiebeDist != null ? ` · Wiebe ${rv.wiebeDist} m` : '';
  return `Toeristen ${rv.joy}% ${mood}${wiebe}`;
}

// The car/boat stays in the world after the mission, but as ordinary
// traffic that the population managers may despawn.
function releaseMissionVehicle(world) {
  disposeConvoy(world, chain.convoy);
  chain.convoy = null;
  hideBake();
  stopRondvaart(world, 'mission');
  dropPursuer(world);
  disposeLight();
  if (chain.storyBoat) {
    const sb = chain.storyBoat;
    chain.storyBoat = null;
    sb.missionCar = false;
    const i = world.vehicles.indexOf(sb);
    if (i >= 0 && world.player.inVehicle !== sb) world.vehicles.splice(i, 1);
  }
  disposeFjordTrain(world);
  disposeHeist();
  releasePlaneStage(world);
  if (chain.skutsje) {
    const i = world.vehicles.indexOf(chain.skutsje);
    if (i >= 0 && chain.skutsje.driver !== 'player') world.vehicles.splice(i, 1);
    chain.skutsje = null;
    clearSkutsjeSail();
  }
  const chased = chain.stage && chain.stage.target;
  if (chased && chased.chaseTarget) { chased.missionCar = false; chased.chaseTarget = false; chased.chaseDodge = false; chased.aiOpts = null; }
  releaseLaneBikes(world);
  releaseCrowd(world);
  stopStunt(world);
  chain.stuntPhase = false;
  if (chain.soloHold) { chain.soloHold = false; world.companionHold = null; }
  if (chain.race) {
    disposeRace(world, chain.race);
    chain.race = null;
  }
  const v = chain.vehicle;
  if (!v) return;
  v.missionCar = false;
  if (v.isBoat) v.waterPoly = waterPolyAt(world.map, v.x, v.y);
  chain.leftover = v;
  chain.vehicle = null;
}

// def.handBack: a borrowed car or boat goes back to its owner once the
// mission is passed, and you go on on foot (rideFirst points at your own).
//   drive  the owner gets in and drives off as traffic (H1: Berend)
//   park   it stays put, locked, and goes once you are out of sight (H7, H8)
//   moor   the tour boat stays at the quay, locked; you step ashore at the start (H13)
const HANDBACK_GONE_M = 120;

function handBack(world, def, v) {
  const p = world.player;
  const how = def.handBack.how;
  if (!world.vehicles.includes(v) || v.wrecked || v.sinking) return;
  if (p.inVehicle === v) {
    if (how === 'moor') {
      v.driver = null; v.speed = 0; v.throttle = 0;
      p.inVehicle = null; p.water = null; p.swimming = false; p.climb = null;
      p.x = def.start.x; p.y = def.start.y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.gz = 0;
      const c = world.companion;
      if (c && c.inVehicle === v) { v.passenger = null; c.inVehicle = null; c.x = p.x + 1; c.y = p.y; c.water = null; c.swimming = false; }
    } else p.exitVehicle(world.map, world);
  }
  v.missionCar = false;
  v.speed = 0;
  // somebody else's: locked until it drives off or goes
  v.driver = 'owner';
  chain.handBack = { v, how, say: def.handBack.say, t: 0 };
  chain.afoot = true;
}

function updateHandBack(dt, world) {
  const hb = chain.handBack;
  if (!hb) return;
  const v = hb.v;
  if (!world.vehicles.includes(v) || v.wrecked) { chain.handBack = null; return; }
  if (hb.t < 1.2) {
    if (isCinematicActive()) return;
    hb.t += dt;
    if (hb.t < 1.2) return;
    world.addMessage(hb.say, 4.5, { kind: 'missie' });
    if (hb.how === 'drive') {
      v.driver = null;
      if (attachToNearestRoad(v, world.map)) { chain.handBack = null; return; }
      v.driver = 'owner';
    }
  }
  if (dist(v.x, v.y, world.player.x, world.player.y) > HANDBACK_GONE_M) {
    const i = world.vehicles.indexOf(v);
    if (i >= 0) world.vehicles.splice(i, 1);
    if (chain.leftover === v) chain.leftover = null;
    chain.handBack = null;
  }
}

// Where to fetch your own transport before the story's next place: after a
// hand-back (you are on foot), or for a step that needs a car of yours
// (need 'car': r-tuning; 'racecar': H9). { x, y, name } or null.
export function rideFirst(world, need = null) {
  if (!chain) return null;
  const p = world.player;
  const fits = need === 'racecar' ? (v) => rideOk(world, 'racecar', v) : need === 'car' ? isCarRide : (v) => !v.isBoat && !v.isHeli;
  if (p.inVehicle && fits(p.inVehicle)) { chain.afoot = false; return null; }
  if (!need && (!chain.afoot || p.inVehicle)) return null;
  let best = null, bd = Infinity;
  for (const v of world.vehicles) {
    if (!(v.isHeroCar || v.playerOwned) || v.missionCar || v.wrecked || v.sinking || v.driver || !fits(v)) continue;
    const d = dist(v.x, v.y, p.x, p.y);
    if (d < bd) { bd = d; best = v; }
  }
  if (best && !best.homeStored) return { x: best.x, y: best.y, name: best.isHeroCar ? 'de Escapade' : 'je eigen vervoer' };
  const atHome = best || (need === 'racecar' ? ownedCarTops().some((c) => isRaceCar(c.name, c.top)) : true);
  const g = atHome ? getHomeGarageForRender()[0] : null;
  return g ? { x: g.x, y: g.y, name: 'je garage thuis' } : null;
}

function removeLeftover(world) {
  const v = chain.leftover;
  chain.leftover = null;
  if (!v || v.driver === 'player' || v.passenger || v.isHeroCar || v.playerOwned) return;
  const i = world.vehicles.indexOf(v);
  if (i >= 0) world.vehicles.splice(i, 1);
}

// How far the Tammo/Tessa story has got for mission i: normally i itself,
// lower when missions were played out of order.
function storyStage(i) {
  const k = MISSION_STORY_ORDER.indexOf(i);
  const prior = k >= 0 ? MISSION_STORY_ORDER.slice(0, k) : [...chain.completed].filter((j) => j !== i);
  if (prior.every((j) => chain.completed.has(j))) return i;
  return Math.max(0, Math.min(i - 1, prior.filter((j) => chain.completed.has(j)).length));
}

// Berend fines scratches; intact fragile cargo earns a bonus.
function rewardAdjust(def, base) {
  const r = chain.run;
  if (!r) return { amount: 0, text: '' };
  if (def.scratchFine && r.vehDamage >= 1) {
    const fine = Math.min(Math.round(base * 0.75), Math.round(r.vehDamage * def.scratchFine));
    return { amount: -fine, text: ` (€${fine} ingehouden voor krassen)` };
  }
  if (def.fragile) {
    const bonus = Math.round(cargoLeft(def) * 1.5);
    return bonus > 0 ? { amount: bonus, text: ` en €${bonus} bonus voor heel decor` } : { amount: 0, text: '' };
  }
  return { amount: 0, text: '' };
}

// the jury's tier: the baking score, one level lower when both answers to the jury were wrong
function juryTier() {
  const order = ['top', 'goed', 'mager'];
  let i = order.indexOf(chain.bakeTier || 'goed');
  if (chain.tags && chain.tags.has('fout1') && chain.tags.has('fout2')) i = Math.min(2, i + 1);
  return order[i];
}

// what a choice or the baking score added to the reward: { amount, text, rows }
function consequenceAdjust(def) {
  let amount = 0;
  const rows = [];
  if (def.bakeBonus && chain.bakeTier) {
    const tier = juryTier();
    amount += def.bakeBonus[tier] || 0;
    if (def.bakeRows && def.bakeRows[tier]) rows.push(def.bakeRows[tier]);
  }
  for (const tag of chain.tags || []) {
    amount += (def.tagAdjust && def.tagAdjust[tag]) || 0;
    if (def.tagRows && def.tagRows[tag]) rows.push(def.tagRows[tag]);
  }
  return { amount, text: amount ? (amount > 0 ? ` en €${amount} bonus` : ` (€${-amount} ingehouden)`) : '', rows };
}

function succeed(world, def) {
  const i = chain.index;
  chain.checkpoints.delete(i);
  chain.retry = null;
  stopTalk();
  // a replay pays the klusloon; the first pass the full reward
  const replay = chain.completed.has(i);
  const base = replay ? klusloon(def.reward) : def.reward;
  closeChoice();
  closeTiming();
  // choices that matter later in the story (M23's ally, read again in M26)
  if (def.remember && storyMod) for (const tag of def.remember) if (chain.tags && chain.tags.has(tag)) storyMod.rememberStoryChoice(tag);
  const tip =def.type === 'boat' ? rondvaartTip() : 0;
  const adj = rewardAdjust(def, base);
  const cons = consequenceAdjust(def);
  const reward = Math.max(0, base + tip + adj.amount + cons.amount);
  const reason = def.type === 'boat' ? rondvaartOutro() : def.outro || def.label;
  noteMoney('Missies');
  world.money += reward;
  if (world.coopDeel) world.coopDeel(reward); // samen spelen (#365): de gasten krijgen hun deel
  if (world.coopUitslag) world.coopUitslag(true, def.label, '', reward); // en horen dat het gelukt is (#371)
  world.stats.missionsDone++;
  world.addMessage(`${def.label} geklaard! ${replay ? 'Klusloon ' : ''}+€${base}${tip ? ` en €${tip} fooi` : ''}${adj.text}${cons.text}`, 4);
  const stats = runStats(world, def);
  // what the mission cost on the way (Het Loket: the entry fee), so the card is honest about a reward of 0
  if (def.costRow && !replay) stats.push(def.costRow);
  if (!replay) stats.push(...consequenceAdjust(def).rows);
  // a flawless run earns the highest compliment there is (flavour.js has an NPC say it too)
  const r = chain.run;
  if (r && r.hurt < 0.5 && (!r.vehicleUsed || r.vehDamage < 3) && (!r.racePos || r.racePos === 1)) {
    stats.push(['Oordeel', PERFECT_VERDICT]);
    world.lastPerfectRun = world.time;
  }
  playStoryOutro(world, i, { stage: storyStage(i), short: chain.completed.has(i), reward, stats, reason });
  const borrowed = def.handBack ? chain.vehicle : null;
  // a replayed kraak has no train trip after it: their own clothes straight away
  if (def.heist && replay) setStoryOutfit(null);
  releaseMissionVehicle(world);
  if (borrowed) handBack(world, def, borrowed);
  chain.completed.add(chain.index);
  chain.run = null;
  chain.index = nextOpenMission(i);
  chain.phase = 'idle';
  chain.wpIndex = 0;
  chain.stage = null;
  hooks.passed(world, i);
}

// achievementtracker.js after a medal run: the one-time bonus for each tier
// reached for the first time in this playthrough. Returns the amount paid.
export function payMedalBonus(world, i, medal) {
  const d = chain && chain.defs[i];
  if (!d) return 0;
  const from = chain.medalPaid[i] || 0;
  if (medal <= from) return 0;
  const bonus = medalBonus(d.reward, from, medal);
  chain.medalPaid[i] = medal;
  if (bonus > 0) { noteMoney('Missies'); world.money += bonus; if (world.coopDeel) world.coopDeel(bonus); }
  return bonus;
}

// Bonus still to earn on mission i: [{ medal, amount }] for the tiers not yet paid.
export function medalBonusLeft(i) {
  const d = chain && chain.defs[i];
  if (!d) return [];
  const out = [];
  for (let m = (chain.medalPaid[i] || 0) + 1; m <= 3; m++) out.push({ medal: m, amount: medalBonus(d.reward, m - 1, m) });
  return out;
}

// After mission i: the next unfinished one in story order, else the next
// one after it (story.js may override with setNextMission).
function nextOpenMission(i) {
  const order = MISSION_STORY_ORDER;
  const open = order.find((j) => !chain.completed.has(j));
  if (open != null) return open;
  const k = order.indexOf(i);
  return order[(k + 1) % order.length];
}

function fail(world, def, reason) {
  const pretty = reason ? reason[0].toUpperCase() + reason.slice(1) : def.label;
  const i = chain.index;
  playStoryFail(world, i, { reason: pretty, stats: runStats(world, def) });
  if (world.coopUitslag) world.coopUitslag(false, def.label, pretty); // samen spelen (#371): de gasten horen het
  endInFailure(world, `${def.label} mislukt${reason ? ' — ' + reason : ''}`);
  hooks.failed(world, i);
}

function endInFailure(world, text) {
  world.addMessage(text, 3.5);
  stopTalk();
  closeChoice();
  closeTiming();
  clearStoryProps();
  // H6 failed: out of the black again (startMission puts it back on)
  if (chain.defs[chain.index] && chain.defs[chain.index].heist) setStoryOutfit(null);
  if (world.pigeonMode) stopPigeonMode(world);
  // an aborted or skipped H15 must not leave the heli run flying on
  if (isHeliRunActive()) abortHeliRun();
  dropPursuer(world);
  chain.stage = null;
  releaseMissionVehicle(world);
  chain.phase = 'cooldown';
  chain.armed = false;
  chain.cooldownTimer = RETRY_COOLDOWN;
  chain.wpIndex = 0;
  chain.run = null;
  chain.grace = null;
  chain.resume = null;
  // #214: a retry prompt (Enter) brings you straight back instead of a long drive to the start
  chain.retry = chain.defs[chain.index] && chain.defs[chain.index].start ? createRetryOffer(chain.index, world.time) : null;
}

// A point `offset` metres along the road from p, towards whichever end has
// room, so the parked car doesn't spawn on top of the player at the marker.
function pointAlongRoad(road, p, offset) {
  const pts = road.pts;
  let seg = 0, t = 0, best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestPointOnSegment(p.x, p.y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (cp.dist2 < best) { best = cp.dist2; seg = i; t = cp.t; }
  }
  const segLen = (i) => Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  let ahead = segLen(seg) * (1 - t), behind = segLen(seg) * t;
  for (let i = seg + 1; i < pts.length - 1; i++) ahead += segLen(i);
  for (let i = seg - 1; i >= 0; i--) behind += segLen(i);
  const dir = ahead >= behind ? 1 : -1;
  let left = Math.min(offset, Math.max(ahead, behind));
  let i = seg, x = p.x, y = p.y;
  while (left > 0 && i >= 0 && i < pts.length - 1) {
    const [tx, ty] = dir > 0 ? pts[i + 1] : pts[i];
    const d = Math.hypot(tx - x, ty - y);
    if (d >= left) { x += (tx - x) / d * left; y += (ty - y) / d * left; break; }
    left -= d; x = tx; y = ty; i += dir;
  }
  return { x, y };
}

function spawnMissionCar(world, def) {
  const at = pointAlongRoad(def.start.road, def.start, world.player.inVehicle ? 10 : 6);
  const car = spawnVehicleOnRoad(world.map, def.start.road, false, Math.random, false, false, at, false, def.vehicleModel ? { ...def.vehicleModel } : null);
  car.road = null;
  car.speed = 0;
  car.missionCar = true;
  return car;
}

// a boat pose is usable when the hull is on water, at least 1.5 m clear of
// any building (houseboats), and there is ~8 m of free water ahead
function boatPoseClear(map, boat, x, y, a) {
  if (boatDryPoints(map, boat, x, y, a) > 0) return false;
  const c = Math.cos(a), s = Math.sin(a);
  const h = boat.model.len / 2 + 1.5, w = boat.model.wid / 2 + 1.5;
  const probes = [[h, 0], [-h, 0], [0, w], [0, -w], [h, w], [h, -w], [-h, w], [-h, -w], [h + 4, 0], [h + 8, 0]];
  for (const [lx, ly] of probes) {
    const px = x + lx * c - ly * s, py = y + lx * s + ly * c;
    if (map.buildingsNear(px, py, 1).some((bd) => pointInPolygon(px, py, bd.pts))) return false;
    if (Math.abs(ly) < 0.1 && lx > h && boatDryPoints(map, boat, px, py, a) > 2) return false;
  }
  return true;
}

// M11: Klaas' rubber boat (def.boatStart { x, y, angle }), the player's way over the water; gone once the mission is over
function spawnStoryBoat(world, def) {
  const b = def.boatStart;
  const boat = new Vehicle(b.x, b.y, b.angle, { ...BOAT_KINDS[b.kind || 'rubberboot'] });
  boat.isBoat = true;
  boat.missionCar = true;
  // the quay in the data is a guess of a few metres: the nearest pose with the whole hull on water and free water ahead
  const map = world.map;
  if (map && boatDryPoints(map, boat, boat.x, boat.y, boat.angle) > 0) {
    let best = null;
    for (let r = 0.5; r <= 40 && !best; r += 0.5) {
      for (let k = 0; k < 24 && !best; k++) {
        const x = b.x + Math.cos((k / 24) * Math.PI * 2) * r, y = b.y + Math.sin((k / 24) * Math.PI * 2) * r;
        for (const da of [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1]) {
          if (boatPoseClear(map, boat, x, y, b.angle + da)) { best = { x, y, a: b.angle + da }; break; }
        }
      }
    }
    if (best) { boat.x = best.x; boat.y = best.y; boat.angle = best.a; }
  }
  world.vehicles.push(boat);
  chain.storyBoat = boat;
}

function spawnMissionBoat(def, map) {
  const b = def.boatAt;
  const boat = new Vehicle(b.x, b.y, b.angle, { ...(def.boatModel ? BOAT_KINDS[def.boatModel] : TOUR_BOAT) });
  boat.isBoat = true;
  boat.missionCar = true;
  // rondvaartBerth moors it alongside the quay; only if that spot touches the
  // shore after all, find the nearest pose with the whole hull on open water,
  // clear of houseboats and with free water ahead, towards the first waypoint
  if (map && boatDryPoints(map, boat, boat.x, boat.y, boat.angle) > 0) {
    const wp = def.waypoints && def.waypoints[0];
    const toWp = wp ? Math.atan2(wp.y - b.y, wp.x - b.x) : b.angle;
    let best = null;
    for (let r = 0.5; r <= 30 && !best; r += 0.5) {
      for (let k = 0; k < 24 && !best; k++) {
        const x = b.x + Math.cos((k / 24) * Math.PI * 2) * r, y = b.y + Math.sin((k / 24) * Math.PI * 2) * r;
        for (const da of [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1]) {
          if (boatPoseClear(map, boat, x, y, toWp + da)) { best = { x, y, a: toWp + da }; break; }
        }
      }
    }
    if (best) { boat.x = best.x; boat.y = best.y; boat.angle = best.a; }
  }
  return boat;
}

// --- Fatbike-terreur: a stream of bikes both ways down a narrow street ---------

const LANE_HALF = 2.1;
const FAT_COLORS = ['#20221f', '#2a2f36', '#3b2a22', '#1b2a3a'];
const RIDER_COLORS = ['#8a3a1f', '#2f5c8a', '#c94b3a', '#3f6b3f', '#c9a227', '#6b3f8a', '#e8e6e0'];

function laneGeom(def) {
  if (def._lane) return def._lane;
  const pts = def.lane;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  def._lane = { pts, cum, len: cum[cum.length - 1] };
  return def._lane;
}

function laneAt(g, s) {
  s = clamp(s, 0, g.len);
  let i = 0;
  while (i < g.pts.length - 2 && g.cum[i + 1] < s) i++;
  const [ax, ay] = g.pts[i], [bx, by] = g.pts[i + 1];
  const t = (s - g.cum[i]) / (g.cum[i + 1] - g.cum[i] || 1);
  const a = Math.atan2(by - ay, bx - ax);
  return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, a, nx: -Math.sin(a), ny: Math.cos(a) };
}

// Arc length and signed lateral offset of (x, y) on the lane.
function laneProject(g, x, y) {
  let best = null;
  for (let i = 0; i < g.pts.length - 1; i++) {
    const cp = closestPointOnSegment(x, y, g.pts[i][0], g.pts[i][1], g.pts[i + 1][0], g.pts[i + 1][1]);
    if (!best || cp.dist2 < best.d2) best = { d2: cp.dist2, s: g.cum[i] + cp.t * (g.cum[i + 1] - g.cum[i]) };
  }
  const q = laneAt(g, best.s);
  return { s: best.s, lat: (x - q.x) * q.nx + (y - q.y) * q.ny };
}

function spawnLaneBike(world, def, dir, s0 = null) {
  const g = laneGeom(def);
  const fat = Math.random() < LANE_FAT_SHARE;
  // a long lane (H12) feeds bikes in around the player instead of only at its ends
  const pl = s0 == null && g.len > 220 ? laneProject(g, world.player.x, world.player.y).s : null;
  const s = s0 ?? (pl != null ? clamp(pl + dir * -(45 + Math.random() * 30), 0, g.len) : dir > 0 ? 0 : g.len);
  const q = laneAt(g, s);
  // never out of thin air on top of the player
  if (dist(q.x, q.y, world.player.x, world.player.y) < 12) return;
  const lat = (Math.random() * 2 - 1) * LANE_HALF;
  const x = q.x + q.nx * lat, y = q.y + q.ny * lat;
  if (isInsideBuilding(world.map, x, y)) return;
  const ang = q.a + (dir < 0 ? Math.PI : 0);
  const rider = RIDER_COLORS[Math.floor(Math.random() * RIDER_COLORS.length)];
  let v;
  if (fat) {
    v = new Vehicle(x, y, ang, { name: 'bike', fat: true, len: 1.95, wid: 0.62, maxSpeed: 8.5, accel: 4.2, brake: 6, turnRate: 3.8, color: FAT_COLORS[Math.floor(Math.random() * FAT_COLORS.length)], rider });
    v.isBike = true;
  } else {
    v = makeTwoWheeler('bike', x, y, ang);
    v.model = { ...v.model, rider };
  }
  v.driver = 'mission';
  v.road = null;
  v.missionFatbike = true;
  v.speed = fat ? 6.5 + Math.random() * 2 : 4.2 + Math.random() * 1.8;
  world.vehicles.push(v);
  chain.bikes.push({ v, s, dir, lat, latT: lat, speed: v.speed, fat, decided: false, weaveAt: world.time + 1 + Math.random() * 2 });
}

function startLane(world, def) {
  const g = laneGeom(def);
  chain.fatbikeHits = 0;
  chain.notesSaid = null;
  chain.hitGraceUntil = world.time + 2.5;
  chain.laneT = 0.4;
  chain.laneDir = 1;
  const p = world.player;
  for (let s = 10, dir = -1; s < Math.min(g.len, 120); s += 11 + Math.random() * 6, dir = -dir) {
    const q = laneAt(g, s);
    if (dist(q.x, q.y, p.x, p.y) > 12) spawnLaneBike(world, def, dir, s);
  }
}

// Bikes ride the lane kinematically: weaving, and once the player is close
// ahead each rider picks a side. Fatbikes mostly hold their line or drift
// right at you; regular riders try to swerve, not always in time.
const HONK_BACK = ['Toeter nait zo, jong!', 'Doe toch nait zo roar, mien jong!', 'Zoek dien eigen pad, joh!', 'Wie bist doe, de burgemeester?', 'Kiek uut, tutteltje!', 'Hou dien toeter dicht, joh!'];

function fatbikersAnswerHonk(world, p) {
  const pv = p.inVehicle;
  const on = !!(pv && pv.horn);
  const rising = on && !chain.hornWas;
  chain.hornWas = on;
  if (!rising || world.time < (chain.honkBackAt || 0)) return;
  const b = chain.bikes.find((q) => q.fat && !q.v.wrecked && Math.hypot(q.v.x - p.x, q.v.y - p.y) < 22);
  if (!b) return;
  chain.honkBackAt = world.time + 5;
  chain.honkIdx = ((chain.honkIdx || 0) + 1 + Math.floor(Math.random() * 3)) % HONK_BACK.length;
  const text = HONK_BACK[chain.honkIdx];
  (world.extraSpeakers || (world.extraSpeakers = [])).push({ x: b.v.x, y: b.v.y, h: 2.2, follow: b.v, speechText: text, speechUntil: world.time + 2.8 });
}

function updateLaneBikes(dt, world, def) {
  const g = laneGeom(def);
  const p = world.player;
  fatbikersAnswerHonk(world, p);
  const pl = laneProject(g, p.x, p.y);
  chain.laneT -= dt;
  if (chain.laneT <= 0 && chain.bikes.length < LANE_MAX_BIKES) {
    chain.laneT = LANE_SPAWN_EVERY * (0.6 + Math.random() * 0.8);
    spawnLaneBike(world, def, chain.laneDir);
    chain.laneDir = -chain.laneDir;
  }
  for (let k = chain.bikes.length - 1; k >= 0; k--) {
    const b = chain.bikes[k], v = b.v;
    if (!world.vehicles.includes(v) || v.wrecked || v.driver !== 'mission') { chain.bikes.splice(k, 1); continue; }
    const ahead = (pl.s - b.s) * b.dir;
    if (!b.decided && ahead > 0 && ahead < 13 && Math.abs(pl.lat) < LANE_HALF + 1.5) {
      b.decided = true;
      const aim = Math.random() < (b.fat ? 0.35 : 0.1);
      b.latT = aim ? clamp(pl.lat + (Math.random() - 0.5) * 0.6, -LANE_HALF, LANE_HALF)
        : clamp(pl.lat + (pl.lat > b.lat ? -1.6 : 1.6), -LANE_HALF, LANE_HALF);
    } else if (!b.decided && world.time > b.weaveAt) {
      b.weaveAt = world.time + 1.2 + Math.random() * 2.2;
      b.latT = clamp(b.lat + (Math.random() - 0.5) * 2.4, -LANE_HALF, LANE_HALF);
    }
    const rate = b.fat ? 1.3 : 1.2;
    const dl = clamp(b.latT - b.lat, -rate * dt, rate * dt);
    b.lat += dl;
    b.speed = Math.min(b.speed + dt * 1.5, v.model.fat ? 8.5 : 6.2);
    b.s += b.dir * b.speed * dt;
    if (b.s < -3 || b.s > g.len + 3 || (g.len > 220 && Math.abs(b.s - pl.s) > 110)) {
      const i = world.vehicles.indexOf(v);
      if (i >= 0) world.vehicles.splice(i, 1);
      chain.bikes.splice(k, 1);
      continue;
    }
    const q = laneAt(g, b.s);
    let x = q.x + q.nx * b.lat, y = q.y + q.ny * b.lat;
    if (isInsideBuilding(world.map, x, y)) { b.lat *= 0.7; b.latT = b.lat; x = q.x + q.nx * b.lat; y = q.y + q.ny * b.lat; }
    v.x = x; v.y = y;
    v.angle = q.a + (b.dir < 0 ? Math.PI : 0) + Math.atan2(dl / Math.max(dt, 1e-3), b.speed) * b.dir;
    v.speed = b.speed;
    v.driftX = 0; v.driftY = 0; v.yawVel = 0;
  }
}

function checkLaneHits(world) {
  const p = world.player;
  if (p.inVehicle || world.time < chain.hitGraceUntil || world.pendingRespawn || isKnockedDown(p, world)) return;
  for (const b of chain.bikes) {
    const v = b.v;
    if (Math.abs(v.x - p.x) > 2 || Math.abs(v.y - p.y) > 2 || dist(v.x, v.y, p.x, p.y) > BIKE_TOUCH_RADIUS) continue;
    chain.fatbikeHits++;
    chain.hitGraceUntil = world.time + BIKE_HIT_GRACE;
    let dmg = Math.round(b.fat ? 5 + b.speed * 0.6 : 2 + b.speed * 0.3);
    if (world.armor > 0) { const a = Math.min(world.armor, dmg); world.armor -= a; dmg -= a; }
    world.health = Math.max(0, world.health - dmg);
    const vx = Math.cos(v.angle) * b.speed, vy = Math.sin(v.angle) * b.speed;
    const dead = world.health <= 0;
    world.lastImpact = { strength: b.fat ? 0.6 : 0.3, time: world.time, x: p.x, y: p.y };
    if (b.fat || dead) knockDown(p, world, { kind: 'hit', dead, vx: vx * 0.8, vy: vy * 0.8, vz: 1.2 + b.speed * 0.15, lieFor: 1.1 });
    else { p.shoveX = (p.shoveX || 0) + vx * 0.7; p.shoveY = (p.shoveY || 0) + vy * 0.7; }
    b.speed *= 0.4;
    world.addMessage(b.fat ? `Au! Geschept door een fatbike (${chain.fatbikeHits}x)` : `Een fietser tikt je aan: "Kiek uut, joh!" (${chain.fatbikeHits}x)`, 2);
    if (dead) requestRespawn(world);
    break;
  }
}

function releaseLaneBikes(world) {
  for (const b of chain.bikes) {
    const i = world.vehicles.indexOf(b.v);
    if (i >= 0 && b.v.driver === 'mission') world.vehicles.splice(i, 1);
  }
  chain.bikes.length = 0;
}

// --- Kroegentocht: drunk crowds and people staggering into you -----------------

// Crowds stand on the car-free streets only; traffic would mow them down.
function footSpot(map, x, y) {
  let best = null;
  for (const r of map.roadsNear(x, y, 30)) {
    if (r.cat !== 'foot') continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
      if (!best || cp.dist2 < best.d2) best = { d2: cp.dist2, x: cp.x, y: cp.y };
    }
  }
  return best && best.d2 < 30 * 30 ? best : null;
}

function spawnCrowds(world, def) {
  chain.crowd = [];
  chain.chargeT = 4;
  for (const c0 of def.crowds) {
    const c = footSpot(world.map, c0.x, c0.y);
    if (!c) continue;
    for (let k = 0, placed = 0; k < CROWD_SIZE * 4 && placed < CROWD_SIZE; k++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * CROWD_RADIUS;
      const x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r;
      if (isInsideBuilding(world.map, x, y)) continue;
      placed++;
      const ped = new Pedestrian(x, y, Math.random() * Math.PI * 2);
      ped.crowdAnchor = { x: c.x, y: c.y, r: CROWD_RADIUS };
      ped.anchor = ped.crowdAnchor;
      ped.nightlife = true;
      ped.missionCrowd = true;
      ped.hasBag = false;
      world.pedestrians.push(ped);
      chain.crowd.push(ped);
    }
  }
}

function endCharge(ped) {
  ped.charging = false;
  ped.state = 'wander';
  ped.stateUntil = 0;
  ped.waypoint = null;
  ped.fleeFrom = null;
}

function startCharge(world, ped) {
  ped.charging = true;
  ped.chargeUntil = world.time + CHARGE_MAX_T;
  ped.anchor = null;
  setPedPose(ped, null);
  ped.speechText = CHARGE_LINES[Math.floor(Math.random() * CHARGE_LINES.length)];
  ped.speechUntil = world.time + 2.4;
}

function updateCrowd(dt, world, def) {
  const p = world.player;
  const t = world.time;
  const next = def.waypoints[chain.wpIndex];
  for (let k = chain.crowd.length - 1; k >= 0; k--) {
    const ped = chain.crowd[k];
    if (ped.state === 'dead' || !world.pedestrians.includes(ped)) { chain.crowd.splice(k, 1); continue; }
    if (ped.ragdoll) continue;
    if (!ped.charging) {
      ped.anchor = ped.crowdAnchor;
      ped.nightlife = true;
      if (Math.random() < dt * 0.06 && dist(ped.x, ped.y, p.x, p.y) < 25) {
        ped.speechText = DRUNK_LINES[Math.floor(Math.random() * DRUNK_LINES.length)];
        ped.speechUntil = t + 2.2;
      }
      continue;
    }
    const d = dist(ped.x, ped.y, p.x, p.y);
    if (t > ped.chargeUntil || d > 30 || p.inVehicle) { endCharge(ped); continue; }
    // "fleeing" from the point mirrored through the player runs straight at them
    ped.state = 'flee';
    ped.stateUntil = t + 1;
    ped.fleeFrom = { x: 2 * ped.x - p.x, y: 2 * ped.y - p.y };
    ped.fleeJitter = Math.sin(t * 4 + ped._lookSeed) * 0.4;
    ped.fleeSpeed = CHARGE_SPEED;
    if (d < 0.9 && !isKnockedDown(p, world)) {
      const nx = (p.x - ped.x) / (d || 1), ny = (p.y - ped.y) / (d || 1);
      p.shoveX = (p.shoveX || 0) + nx * 5.5;
      p.shoveY = (p.shoveY || 0) + ny * 5.5;
      world.lastImpact = { strength: 0.3, time: t, x: p.x, y: p.y };
      if (Math.random() < 0.3) {
        knockDown(p, world, { kind: 'hit', vx: nx * 3, vy: ny * 3, vz: 1.1, lieFor: 0.9 });
        world.addMessage('Omvergelopen door een dronken student. Hij verontschuldigt zich bij een lantaarnpaal.', 2.6);
      }
      endCharge(ped);
    }
  }
  chain.chargeT -= dt;
  if (chain.chargeT > 0 || p.inVehicle) return;
  chain.chargeT = CHARGE_EVERY[0] + Math.random() * (CHARGE_EVERY[1] - CHARGE_EVERY[0]);
  const hx = next ? next.x - p.x : 0, hy = next ? next.y - p.y : 0;
  const hl = Math.hypot(hx, hy) || 1;
  let best = null, bs = -Infinity;
  for (const ped of chain.crowd) {
    if (ped.charging || ped.ragdoll) continue;
    const d = dist(ped.x, ped.y, p.x, p.y);
    if (d < 6 || d > 22) continue;
    const score = ((ped.x - p.x) * hx + (ped.y - p.y) * hy) / (hl * d) - d * 0.02;
    if (score > bs) { bs = score; best = ped; }
  }
  if (best) startCharge(world, best);
}

function releaseCrowd() {
  for (const ped of chain.crowd) {
    if (ped.charging) endCharge(ped);
    ped.anchor = null;
    ped.crowdAnchor = null;
    ped.nightlife = false;
  }
  chain.crowd.length = 0;
}

// the dev cheat starts a lazyStart mission without road data (the tiles may not stream in headless)
let forceStart = false;
function startMission(world, def) {
  removeLeftover(world);
  chain.tags = new Set();
  chain.bakeTier = null;
  // a start out in the province has no road data until the player is there (the tiles stream in): find the road now
  if (def.lazyStart && !def.start.road && !forceStart) {
    const spot = roadSpot(world.map, def.start.x, def.start.y, true);
    if (spot.road) Object.assign(def.start, spot);
    else {
      // no road loaded here (yet): try again in a moment instead of starting without a vehicle
      world.addMessage('De weg hier wordt nog geladen. Even wachten…', 3);
      chain.phase = 'cooldown'; chain.cooldownTimer = RETRY_COOLDOWN; chain.armed = false;
      return;
    }
  }
  waarschuwVoorStart(world, 'missie', def.id, missieStatus(def)); // samen spelen: een melding als dit nog niet (helemaal) samen werkt; de start gaat door
  chain.afoot = false;
  chain.phase = 'active';
  chain.timeLeft = assistTime(def.timeLimit) ?? Infinity;
  chain.wpIndex = 0;
  chain.stopIndex = 0;
  chain.stopT = 0;
  chain.cargoWarn = 100;
  chain.boarded = false;
  chain.hintAt = -Infinity;
  chain.run = { elapsed: 0, kills: killCount(world), hp: world.health + world.armor, hurt: 0, damage: 0, veh: null, vehHp: 100, vehDamage: 0, vehicleUsed: false };
  chain.windowT = 0;
  chain.windowExtended = false;
  chain.clockRate = 1;
  chain.stuntPhase = false;
  chain.beats = {};
  chain.momentDone = false;
  chain.hijacked = false;
  chain.finishPending = false;
  // the kraak: both in black, whoever bought it (off again on the train, stationtravel.js)
  // (any other mission: the train was skipped somehow, so their own clothes again)
  setStoryOutfit(def.heist ? 'incognito' : null);
  if (def.solo) {
    // the companion stays where the mission starts (H16: Tammo with the klomp)
    const p0 = world.player;
    world.companionHold = { x: p0.x + Math.cos(p0.angle + 2) * 1.6, y: p0.y + Math.sin(p0.angle + 2) * 1.6, face: p0.angle, pose: 'phone' };
    chain.soloHold = true;
  }
  if (def.type === 'stunt') {
    startStunt(world, def.stunt);
    bringHeroCar(world, def);
  } else if (def.type === 'deliver' && def.start.road) {
    chain.vehicle = spawnMissionCar(world, def);
    world.vehicles.push(chain.vehicle);
    // M01 of the new arc: the stunt first, in the bakkie, then the delivery
    if (def.stunt) { startStunt(world, def.stunt); chain.stuntPhase = true; }
  } else if (def.type === 'boat') {
    chain.vehicle = spawnMissionBoat(def, world.map);
    world.vehicles.push(chain.vehicle);
    startRondvaart(world, chain.vehicle);
  } else if (def.type === 'fatbike') {
    startLane(world, def);
  } else if (def.type === 'stages') {
    if (def.vehicle === 'car' && def.snapStart && !def.start.road) {
      const rs = roadSpot(world.map, def.start.x, def.start.y, true);
      if (rs && rs.road) def.start = { ...rs };
    }
    if (def.heroCar) {
      // act 5: the Escapade (the Fjord Frituur) waits at the start of the mission
      chain.vehicle = heroCarTo(world, def.start) || (def.start.road ? spawnMissionCar(world, def) : null);
      if (chain.vehicle && !world.vehicles.includes(chain.vehicle)) world.vehicles.push(chain.vehicle);
    } else if (def.vehicle === 'car' && def.start.road) {
      chain.vehicle = spawnMissionCar(world, def);
      world.vehicles.push(chain.vehicle);
    }
    if (def.boatStart) spawnStoryBoat(world, def);
    // akte 4 (Open, dicht): a boat at the start of a stages mission, `boatAt` { x, y, angle }, `boatModel` a BOAT_KINDS key
    if (def.boatAt) {
      chain.vehicle = spawnMissionBoat(def, world.map);
      world.vehicles.push(chain.vehicle);
    }
    chain.stage = null;
    chain.stageIndex = -1;
    chain.stagePending = true;
    // #213: a retry picks up at the last checkpoint stage, not at stage 0
    const cp = chain.checkpoints.get(chain.index);
    chain.resume = cp && !chain.completed.has(chain.index) && isCheckpointStage(def, cp.stageIndex) ? cp : null;
    if (!chain.resume) chain.checkpoints.delete(chain.index);
  } else if (def.race === 'ring') {
    // the full ringweg is ~17.5 km: tuned-up race cars keep a lap near six minutes
    chain.race = createRace(world, RING_ROUTE, RING_CHECKPOINTS, { topScale: 1.35, accelScale: 1.3, band: 320, jelle: true });
  } else if (def.race === 'kei') {
    chain.race = createRace(world, KEI_ROUTE, KEI_CHECKPOINTS, { bikes: true, band: 70 });
    if (def.ownBike) companionOwnBike(world);
  }
  if (def.crowds) spawnCrowds(world, def);
  const i = chain.index;
  const code = missionCode(i);
  const kicker = code ? `Missie ${code}` : `Missie ${i + 1}/${chain.defs.length}`;
  const title = def.label;
  const objective = chain.vehicle || def.dest || (def.waypoints && def.waypoints[0]) || def.start;
  const shown = playStoryIntro(world, i, { stage: storyStage(i), short: chain.seen.has(i), kicker, title, target: objective });
  if (!shown) {
    const who = speakerName(world);
    playMissionIntro(world, { kicker, title: `Missie: ${title}`, lines: (def.intro || []).map((text) => ({ speaker: who, text })), objective });
  }
  // H13: after the intro on the quay, a shot of the boat with the two of them aboard
  if (def.type === 'boat' && chain.vehicle) playRondvaartBoarding(world, chain.vehicle);
  if (def.say) world.addMessage(def.say, 5);
  // the new story: the remarks between the pair while a lane or delivery mission runs (stages carry their own talk)
  if (def.talk && storyDataReady()) playTalk(talkLines(def.talk.ids, def.talk), { id: `${def.label}:talk`, delay: def.talk.delay || 1 });
  chain.seen.add(i);
}

// H5: the race is one bike each. The companion gets off the player's bike and
// stays by the start (it is also the finish) for the race; in the all-green
// moment (playEyeContact) she comes the other way on her own bike.
function companionOwnBike(world) {
  const c = world.companion;
  if (!c || c.state === 'dead') return;
  const p = world.player;
  if (c.inVehicle) { c.inVehicle.passenger = null; c.inVehicle = null; }
  const a = p.angle + Math.PI / 2;
  const spot = world.map.openSpotNear ? world.map.openSpotNear(p.x + Math.cos(a) * 2.5, p.y + Math.sin(a) * 2.5) : { x: p.x + Math.cos(a) * 2.5, y: p.y + Math.sin(a) * 2.5 };
  c.x = spot.x; c.y = spot.y; c.vx = 0; c.vy = 0;
  world.companionHold = { x: spot.x, y: spot.y, face: p.angle, pose: 'phone' };
  chain.soloHold = true;
}

// Act 5: the mission car is the Escapade itself. The one in the world is moved to the start, else Henk brings a new one.
function heroCarTo(world, at) {
  let car = world.vehicles.find((v) => v.isHeroCar && !v.wrecked && !v.sinking);
  if (car && (car.driver === 'player' || dist(car.x, car.y, at.x, at.y) < 70)) { car.missionCar = true; return car; }
  if (car && placeOwnedVehicleNear(world, car, at.x, at.y)) { car.missionCar = true; return car; }
  car = spawnHeroCarNear(world.map, at.x, at.y);
  if (!car) return null;
  for (const v of world.vehicles) if (v.isHeroCar && v.wrecked) v.isHeroCar = false;
  car.missionCar = true;
  world.vehicles.push(car);
  return car;
}

// H3 is a stunt evening in the Escapade: when it is not near, Henk parks it at the square.
function bringHeroCar(world, def) {
  const p = world.player;
  if (p.inVehicle && !p.inVehicle.isBoat && !p.inVehicle.isBike) return;
  const c = def.stunt && def.stunt.center ? def.stunt.center : def.start;
  let car = world.vehicles.find((v) => v.isHeroCar && !v.wrecked && !v.sinking);
  if (car && dist(car.x, car.y, p.x, p.y) < 70) return;
  if (car && car.driver !== 'player') {
    if (placeOwnedVehicleNear(world, car, p.x, p.y)) { world.addMessage('Henk heeft de Escapade aan de rand van de Grote Markt gezet.', 4); return; }
  }
  car = spawnHeroCarNear(world.map, (p.x + c.x) / 2, (p.y + c.y) / 2);
  if (!car) return;
  for (const v of world.vehicles) if (v.isHeroCar && v.wrecked) v.isHeroCar = false;
  world.vehicles.push(car);
  world.addMessage('Henk heeft de Escapade aan de rand van de Grote Markt gezet.', 4);
}

function hint(world, text, say = undefined) {
  if (world.time - chain.hintAt < HINT_INTERVAL) return;
  chain.hintAt = world.time;
  world.addMessage(text, 2.5, { say });
}

// Returns a failure reason when the mission car/boat is gone or left behind.
function vehicleProblem(world, def) {
  const v = chain.vehicle;
  const p = v ? teamActor(world, v, (a) => a.inVehicle === v) : world.player; // samen spelen (#452): de meespeler in het voertuig, anders de dichtstbijzijnde
  const vf = def.vehicleFail || {};
  if (!v || !world.vehicles.includes(v)) return vf.gone || (def.type === 'boat' ? 'de boot is foetsie' : 'de auto is foetsie');
  if (v.wrecked || v.disabled) return vf.wrecked || (def.type === 'boat' ? 'de boot ligt nu tussen de fietsen op de bodem' : 'de auto is afgeschreven, Kiekdoar heeft al foto\'s');
  if (p.inVehicle === v) { chain.boarded = true; chain.grace = null; return null; }
  const g = chain.grace || (chain.grace = createGrace());
  const far = dist(p.x, p.y, v.x, v.y) > ABANDON_DIST;
  // #214: leaving the vehicle behind is a warning with a clock, the way back is the marker; only a wreck or a gone vehicle fails at once
  const dt = Math.max(0, Math.min(0.25, world.time - (chain.graceT ?? world.time)));
  chain.graceT = world.time;
  const r = stepGrace(g, dt, far ? 'away' : 'near');
  if (r.state === 'grace') {
    const what = def.type === 'boat' ? 'de boot' : 'de auto';
    hint(world, `Ga terug naar ${what}: nog ${Math.ceil(r.left)} s`);
    return null;
  }
  if (r.state === 'fail') {
    const what = def.type === 'boat' ? 'de boot' : 'de auto';
    chain.grace = null;
    if (vf.left) return vf.left;
    return chain.boarded ? `je liet ${what} gewoon achter` : `je liet ${what} staan. Parkeren kost hier meer dan de auto`;
  }
  return null;
}

// H5's all-green crossing: a staged scene (missionstory.js playEyeContact) that
// pauses the race; both brake, so the player rolls on slowly. The text is the fallback.
function playMoment(world, m) {
  const p = world.player, v = p.inVehicle;
  const heading = v ? v.angle : p.angle;
  const staged = !isCinematicActive() && playEyeContact(world, { at: { x: p.x, y: p.y }, heading });
  if (staged && v) v.speed *= 0.3;
  if (!staged) world.addMessage(m.text, 4.5, { kind: 'missie' });
  if (m.talk && storyDataReady()) playTalk(talkLines(m.talk.ids), { id: 'moment', delay: 0.8 });
}

// M01's stunt part: the Grote Markt scene when the bakkie arrives, the pair talking while it goes on,
// and the chat's reaction when the points are in. Then the delivery goes on (the clock keeps running).
function updateStuntPhase(dt, world, def) {
  const p = world.player;
  const b = chain.beats || (chain.beats = {});
  const near = dist(p.x, p.y, def.stunt.center.x, def.stunt.center.y) < def.stunt.radius + 10;
  if (near && !b.arrived && !isCinematicActive() && storyDataReady()) {
    b.arrived = true;
    playStageScene(world, { script: { ids: ['M01.3'] }, kicker: 'Grote Markt', cast: [{ key: 'jelmer', pose: 'phone', at: [3.2, 1.2] }] }, { target: null });
  }
  const s = stuntStatus();
  if (s && b.arrived && !b.talked && s.score >= s.target * 0.2 && storyDataReady()) {
    b.talked = true;
    playTalk(talkLines(['M01.4']), { id: 'M01.4', delay: 0.5 });
  }
  if (updateStunt(dt, world, chain.timeLeft) === 'done') {
    stopStunt(world);
    chain.stuntPhase = false;
    if (storyDataReady() && !isCinematicActive()) playStageScene(world, { script: { ids: ['M01.5'] }, kicker: 'Grote Markt', cast: [{ key: 'jelmer', pose: 'cheer', at: [3.2, 1.2] }, { key: 'terras', pose: 'cheer', at: [3.6, -1.4] }] }, { target: null });
    world.addMessage('Punten binnen. Nu het bakkie heel naar het Boterdiep.', 4.5, { kind: 'missie' });
  }
}

// Index of the waypoint the player is at: the current one or, while the
// current one is only a `via` (route guidance along the streets), any later
// via or the next real checkpoint, so cutting a corner never strands you.
function waypointReached(p, def, radius) {
  for (let k = chain.wpIndex; k < def.waypoints.length; k++) {
    const wp = def.waypoints[k];
    if (dist(p.x, p.y, wp.x, wp.y) < radius) return k;
    if (!wp.via) break;
  }
  return -1;
}

function reachCheckpoint(world, def, k = chain.wpIndex) {
  chain.wpIndex = k;
  const wp = def.waypoints[chain.wpIndex];
  chain.wpIndex++;
  if (!wp.via) chain.timeLeft += wp.bonus ?? def.checkpointBonus;
  if (def.drunk && wp.name) addDrunk(world, def.drunk);
  if (wp.toast && !isCinematicActive()) playToast(world, { at: { x: world.player.x, y: world.player.y }, facing: world.player.angle, kicker: wp.name, ...wp.toast });
  if (def.moment && !chain.momentDone && chain.wpIndex >= def.moment.at) {
    chain.momentDone = true;
    playMoment(world, def.moment);
  }
  if (chain.wpIndex >= def.waypoints.length) {
    if (wp.toast && isCinematicActive('mission-scene')) { chain.finishPending = true; return; }
    if (chain.race) {
      const { position, total } = raceStandings(chain.race);
      chain.run.racePos = position;
      chain.run.raceTotal = total;
      if (position > PODIUM) {
        fail(world, def, `je werd ${position}e. Alleen het podium telt`);
        return;
      }
      world.addMessage(position === 1 ? 'Gewonnen! Eerste over de streep!' : `Finish! Je werd ${position}e van ${total}.`, 3.5);
    }
    succeed(world, def);
    return;
  }
  const next = def.waypoints.slice(chain.wpIndex).find((q) => q.name);
  if (wp.name && next) world.addMessage(`Proost in ${wp.name}! Hup, door naar ${next.name}.`, 3);
}

// Missions that start at a pigeon spot: the spots are placed after the
// defs are built, so the start moves there on the first update that has them.
function resolveSpotStarts(world) {
  if (!chain.heliStarts) {
    const hs = getHeliSpotsForRender()[0];
    if (hs) {
      chain.heliStarts = true;
      for (const d of chain.defs) if (d.startSpot === 'heli') d.start = { ...world.map.openSpotNear(hs.x + 3.5, hs.y + 1.5), road: null };
    }
  }
  if (!chain.eeldeStart) {
    // H15 starts beside Rotor Roelf's pad on Eelde, between the pad and his kiosk
    const ep = helipadById('eelde');
    if (ep) {
      chain.eeldeStart = true;
      for (const d of chain.defs) if (d.startSpot === 'eelde') d.start = { x: ep.x - 7, y: ep.y + 5, road: null };
    }
  }
  if (chain.spotStarts) return;
  const spots = getPigeonSpotsForRender();
  if (!spots.length) return;
  chain.spotStarts = true;
  for (const d of chain.defs) {
    const ps = d.startSpot && spots.find((q) => q.id === d.startSpot);
    if (ps) d.start = roadSpot(world.map, ps.x, ps.y);
  }
}

// #214: after a failure, Enter (or E: pad and touch send it) fades out and puts you, your vehicle and your companion at the mission's start
const RETRY_FADE_S = 0.45;
function updateRetry(dt, world, def) {
  const r = chain.retry;
  if (!r) return;
  if (r.fade != null) {
    r.fade -= dt;
    if (r.fade > 0) return;
    chain.retry = null;
    recordStat(world, 'missionRetries');
    placeParty(world, def.start);
    chain.armed = true;
    chain.phase = 'idle';
    chain.cooldownTimer = 0;
    respawnFade(0, 500);
    return;
  }
  if (r.missionIndex !== chain.index || !retryOfferLive(r, world.time)) { chain.retry = null; return; }
  if (chain.phase !== 'idle') return;
  const p = world.player;
  if (dist(p.x, p.y, def.start.x, def.start.y) < (def.triggerRadius || TRIGGER_RADIUS) * 3 + 10) { chain.retry = null; return; }
  if (isCinematicActive() || world.pendingRespawn || (world.sideJob && world.sideJob.active) || playerBusy(world, ['challenge', 'padel', 'activityGame']).busy) return;
  if (!r.hintedAt || world.time - r.hintedAt > 10) {
    r.hintedAt = world.time;
    world.addMessage(`${def.label}: opnieuw beginnen? Druk op Enter (of E).`, 4, { key: 'missie-opnieuw' });
  }
  for (const k of RETRY_KEYS) {
    if (!world.input.wasPressed(k)) continue;
    world.input.consume(k);
    r.fade = RETRY_FADE_S;
    respawnFade(1, 350);
    return;
  }
}

export function updateMissions(dt, world) {
  if (!chain) return;
  resolveSpotStarts(world);
  updateStoryProps(dt);
  updateHandBack(dt, world);
  const def = chain.defs[chain.index];
  const p = world.player;
  // a pigeon flight only runs the stages mission that started it
  if (world.pigeonMode && !(chain.phase === 'active' && def.type === 'stages')) return;
  updateRetiredRacers(dt, world);

  updateRetry(dt, world, def);

  if (chain.phase === 'cooldown') {
    chain.cooldownTimer -= dt;
    if (chain.cooldownTimer <= 0) chain.phase = 'idle';
    syncPub(world);
    return;
  }

  if (chain.phase === 'idle') {
    // a mission that starts at your rented boat (H14) follows it around
    if (def.startAt === 'rental') {
      const b = rentalBoat(world);
      if (b) def.start = { x: b.x, y: b.y, road: null };
    }
    const R = def.triggerRadius || TRIGGER_RADIUS;
    const d = dist(p.x, p.y, def.start.x, def.start.y);
    if (d > R + 2) chain.armed = true;
    else if (d < R && chain.armed) {
      // a running bijbaantje (sidejobs.js) first has to be finished or stopped
      if (world.sideJob && world.sideJob.active) {
        chain.armed = false;
        world.addMessage('Eerst je bijbaantje afmaken of stoppen (Esc > Spel)', 3);
      } else if (playerBusy(world, ['challenge', 'padel', 'activityGame']).busy) chain.armed = false; else if (!checkRequirement(world, def, true)) chain.armed = false;
      else if (!checkRide(world, def)) chain.armed = false;
      else if (hooks.canStart(world, chain.index)) startMission(world, def);
    }
    syncPub(world);
    return;
  }

  trackRun(dt, world);
  // the clock starts at the race's GO, not while the grid waits
  if ((!chain.race || chain.race.phase === 'race') && !isCinematicActive()) chain.timeLeft -= dt * (chain.clockRate || 1);
  if (chain.timeLeft <= 0) {
    fail(world, def, def.timeUp ? def.timeUp : def.type === 'boat' ? 'tijd op. De toeristen missen hun trein naar Zwolle' : def.type === 'stunt' || chain.stuntPhase ?'tijd op. Chat is al naar een kattenfilmpje' : 'tijd op. Zelfs de bus was sneller');
    syncPub(world);
    return;
  }

  const problem = def.type === 'deliver' || def.type === 'boat' ? vehicleProblem(world, def)
    : def.type === 'stages' ? stageVehicleProblem(world, def) : raceCarProblem();
  if (problem) {
    fail(world, def, problem);
    syncPub(world);
    return;
  }
  // arriving by car is fine: a warning first, it only fails if you keep driving
  if (def.onFoot && def.type === 'fatbike' && chain.run) {
    if (p.inVehicle) {
      chain.run.inVehT = (chain.run.inVehT || 0) + dt;
      if (chain.run.inVehT < dt * 1.5) hint(world, 'Uitstappen, jong. Fatbikes ontwijk je te voet.');
      if (chain.run.inVehT > 10) {
        fail(world, def, 'je moest lopen, niet stiekem rijden');
        syncPub(world);
        return;
      }
    } else chain.run.inVehT = 0;
  }

  if (def.type === 'deliver' && chain.stuntPhase) {
    updateStuntPhase(dt, world, def);
  } else if (def.type === 'deliver') {
    if (def.fragile) {
      const left = cargoLeft(def);
      if (left <= def.fragile.failAt) {
        fail(world, def, def.fragile.fail);
        syncPub(world);
        return;
      }
      for (const lvl of [80, 60, 45]) {
        if (left < lvl && chain.cargoWarn > lvl) {
          chain.cargoWarn = lvl;
          world.addMessage(lvl > 50 ? `Krak! Achterin sneuvelt iets. ${def.fragile.label}: ${Math.round(left)}%` : `Nog één klap en het ${def.fragile.label.toLowerCase()} is weg! (${Math.round(left)}%)`, 2.8);
        }
      }
    }
    const v = chain.vehicle;
    if (p.inVehicle === v) {
      const stop = nextStop(def);
      const goal = stop || def.dest;
      if (dist(p.x, p.y, goal.x, goal.y) < (stop ? STOP_RADIUS : CHECKPOINT_RADIUS)) {
        if (!stop) succeed(world, def);
        else if (Math.abs(v.speed) > 2.5) hint(world, `Even stilstaan bij ${stop.name}, anders kan er niemand in.`, 'Even stilstaan, anders kan er niemand in.');
        else if ((chain.stopT += dt) >= STOP_WAIT) {
          chain.stopIndex++;
          chain.stopT = 0;
          if (stop.bonus) chain.timeLeft += stop.bonus;
          world.addMessage(`${stop.arrive}${stop.bonus ? ` (+${stop.bonus}s)` : ''}`, 3.5);
        }
      } else chain.stopT = 0;
    }
  } else if (def.type === 'stunt') {
    if (updateStunt(dt, world, chain.timeLeft) === 'done') succeed(world, def);
  } else if (def.type === 'checkpoint') {
    // the last pub's toast first, then the outro (a story scene can't start under it)
    if (chain.finishPending) { if (!isCinematicActive()) { chain.finishPending = false; succeed(world, def); } return; }
    if (chain.race) {
      updateRace(dt, world, chain.race, chain.wpIndex);
      const r = raceStandings(chain.race);
      if (r.finished >= PODIUM) {
        chain.run.racePos = r.position;
        chain.run.raceTotal = r.total;
        fail(world, def, 'het podium is al vol. Drie anderen waren eerder binnen');
        syncPub(world);
        return;
      }
    }
    if (def.crowds) updateCrowd(dt, world, def);
    const k = waypointReached(p, def, chain.race ? RACE_CHECKPOINT_RADIUS : CHECKPOINT_RADIUS);
    if (k >= 0) {
      if (def.onFoot && p.inVehicle) hint(world, 'Uitstappen, jong. Het heet kroegentocht, niet kroegenrit.');
      else if (chain.race && chain.race.bikes && !(p.inVehicle && p.inVehicle.isBike)) hint(world, 'Op de fiets, hè. Het is een fietsrace.');
      else reachCheckpoint(world, def, k);
    }
  } else if (def.type === 'fatbike') {
    updateLaneBikes(dt, world, def);
    checkLaneHits(world);
    for (const n of def.notes || []) {
      if (chain.notesSaid && chain.notesSaid.has(n)) continue;
      if (dist(p.x, p.y, n.x, n.y) > 14) continue;
      (chain.notesSaid || (chain.notesSaid = new Set())).add(n);
      world.addMessage(n.text, 4, { kind: 'missie' });
    }
    if (dist(p.x, p.y, def.dest.x, def.dest.y) < CHECKPOINT_RADIUS && !isKnockedDown(p, world)) {
      succeed(world, def);
    }
  } else if (def.type === 'stages') {
    updateStages(dt, world, def);
  } else if (def.type === 'boat') {
    const fled = updateRondvaart(dt, world);
    if (fled) {
      fail(world, def, fled);
      syncPub(world);
      return;
    }
    if (p.inVehicle === chain.vehicle) {
      const k = waypointReached(p, def, CHECKPOINT_RADIUS + 2);
      if (k >= 0) reachCheckpoint(world, def, k);
    }
  }

  syncPub(world);
}

// A wrecked handed-out race car or bike ends the race.
function raceCarProblem() {
  const car = chain.race && chain.race.playerCar;
  if (!car || !car.wrecked) return null;
  return chain.race.bikes ? 'je fiets ligt in de prak' : 'je racewagen is afgeschreven. Harm huilt, de pionnen juichen';
}

// --- stages: story missions built from small objectives ------------------------
// A def with type 'stages' lists objectives that run one after the other:
//   board   get into the mission car (def.vehicle: 'car')
//   goto    reach target (mode: vehicle | foot | boat | any; stop: seconds standing still)
//   hold    stay within target's radius for `time` seconds
//   garage  drive the mission car into any garage bay: new colour, police gone
//   escape  lose the police (stars: set on entering, any stage may set them)
//   pigeon  become a pigeon at pigeon spot `spot` and hover over every target
//   scene   a cutscene (lines, then an optional `big` card) at the target
//   chase   a vehicle (st.vehicle model) flees from `lead` metres ahead towards `flee`;
//           damage it by `hits` (shots or rams) and it stops and becomes the
//           mission vehicle (board it next). Fails when it gets `escape` metres
//           away, runs out of `time` or burns out.
//   choice  (akte 4, stagechoice.js) a conversation puzzle: rounds of up to three answers (keys 1-3), wrong answers can fail
//   timing  (akte 4, stagetiming.js) a few timing presses on a bar: the sluip past the cameras, the fierljep duel, the wagon jumps
//   rit     (akte 4, stagerit.js) drive the stopped train to the next platform with gas and brake
//   vault   Jelle's polsstok escape over the nearest canal (missionstory.js); fail: he misses
//   boatchase  Jelle's skûtsje sails the Diepenring from `lead` metres ahead of you; stay
//           alongside in a boat (`board` m) for `boardTime` s to jump aboard. Fails past
//           `escape` m or after `time` s (lost = the reason)
//   heli    a heli run in Rotor Roelf's demo heli (helirun.js, `variant`); passes on the final landing
//   train   (H16, def `fjordTrain`) stand at the level crossing before the goods train
//           with the Fjord gets there (fjordtrain.js); a chase with `toTrain` ends when
//           the fleeing Fjord reaches the train or `time` runs out (`loaded`; stopped first = no train stage)
//   H6 (def `heist`, heist.js): plan (the blueprint and the choice of approach; a
//           stage with `only` runs for that approach), fuse (the fuse box), lock (the
//           back door), pickpocket (the pass off a guard), laser (the grid in zaal 3),
//           crack (the case's dial), getaway (the alarm, the run to the boat and a short
//           scene), shot (the closing wide shot); `opens` a door when the stage is done
// goto `watch` { guards, cameras }: torch cones and sweeping cameras along the way
// (heist.js); goto `post`: the guards of a named post inside, `distract`: E sends them
// to the window; seen = back to where the stage started. Scene `reveal`: the empty case shot.
// More options: goto `limit` (seconds, `late` = the fail reason), `pay` (money taken when
// the stage is done, `paid` = the toast), hold `ticks` (three progress toasts) and
// `fireworks` { every: [min, max], hit, cost, hitText } (bangs that knock you down and
// cost hold time); chase `hero` (the fleeing car is Tessa's own Fjord), `clock`, `meter`,
// `half`, `lost`, `gone`, `burned`, `from` [x, y] (spawn on that road instead of the start's),
// `route` [{ at, radio, say }] (drives point to point, each one's radio report on reaching it,
// then `flee`) and `swarm` { stall, near, lines } (H18: at half the meter, or after the route
// with you within `near` m, the pigeons come down on it: missionstory.js playPigeonSwarm); def `eggs` { from, failAt, fail }: from stage `from`
// on, hard braking and knocks break the eggs.
// Pigeon options: spotTime, gulls: [min, max] seconds between diving gulls,
// flag: Jelle's banner (storyprops3d.js) whose ropes are the targets; a
// target with z must be reached at that height (+-8 m), r = its radius.
// Scene options: cam { r, h, lookZ, at } (a wide shot), dropFlag.
// Targets: { x, y } | { at: [x, y], snap } | { shop } | { garage: true } |
// { landmark, off: [dx, dy], snap, z, r } | { pigeonSpot } | { heistSpot } (heist.js) | { heli } | { helipad: id } | { rental } (your
// rented boat) | { route } (the nearest point on the Diepenring) | { shore } (the nearest
// street) | { skutsje } | { bank: [x, y] } (the water's edge near there); snap: 'walk' | 'drive'.

const STAGE_RADIUS = 7;
const HOLD_RADIUS = 3.5;
const SPOT_RADIUS = 16;
const SPOT_TIME = 0.8;
const RESPRAY_COLORS = ['#1e9e56', '#2e5f9e', '#d9b21b', '#6a2e8a', '#e8e6e0'];

function resolveTarget(world, spec, from) {
  if (!spec) return null;
  const map = world.map;
  const snap = (x, y) => (spec.snap ? roadSpot(map, x, y, spec.snap === 'drive') : { x, y });
  if (Number.isFinite(spec.x) && Number.isFinite(spec.y)) return spec;
  if (spec.at) return { ...snap(spec.at[0], spec.at[1]), label: spec.label };
  // a real place by latitude and longitude (the new arc's tile world, akte 4); snapped to a road when `snap` says so
  if (spec.ll) { const [wx, wy] = wgsToWorld(spec.ll[0], spec.ll[1]); return { ...snap(wx, wy), label: spec.label }; }
  if (spec.shop) {
    const s = nearestShopOf({ player: from }, spec.shop);
    return s ? { x: s.x, y: s.y, name: s.name, label: spec.label || s.name } : null;
  }
  if (spec.garage) {
    let best = null, bd = Infinity;
    for (const g of getGaragesForRender()) {
      const d = dist(g.x, g.y, from.x, from.y);
      if (d < bd) { bd = d; best = g; }
    }
    return best ? { x: best.x, y: best.y, name: best.name, label: spec.label || best.name } : null;
  }
  if (spec.landmark) {
    const lm = (map.meta.landmarks || []).find((l) => l.name === spec.landmark);
    if (!lm) return null;
    const [dx, dy] = spec.off || [0, 0];
    return { ...snap(lm.x + dx, lm.y + dy), label: spec.label || spec.landmark, z: spec.z, r: spec.r };
  }
  if (spec.heistSpot) return heistSpotAt(map, spec.heistSpot);
  if (spec.pigeonSpot) {
    const ps = getPigeonSpotsForRender().find((q) => q.id === spec.pigeonSpot);
    return ps ? { x: ps.x, y: ps.y, label: ps.name } : null;
  }
  if (spec.helipad) {
    const hp = helipadById(spec.helipad);
    return hp ? { x: hp.x, y: hp.y, label: spec.label || hp.name } : null;
  }
  if (spec.heli) {
    const hs = getHeliSpotsForRender()[0];
    return hs ? { x: hs.x, y: hs.y, label: spec.label || 'Traumaheli' } : null;
  }
  if (spec.rental) {
    const b = rentalBoat(world);
    return b ? { x: b.x, y: b.y, label: spec.label || 'Je huurboot' } : null;
  }
  if (spec.route) {
    const r = routeS(from.x, from.y);
    const q = routeAt(r.s);
    return { x: q.x, y: q.y, label: spec.label };
  }
  if (spec.shore) return { ...roadSpot(map, from.x, from.y), label: spec.label };
  if (spec.skutsje) return chain.skutsje ? { x: chain.skutsje.x, y: chain.skutsje.y, label: spec.label } : null;
  if (spec.storyBoat) return chain.storyBoat ? { x: chain.storyBoat.x, y: chain.storyBoat.y, label: spec.label || 'De rubberboot van Klaas' } : null;
  if (spec.bank) return { ...bankNear(map, spec.bank[0], spec.bank[1]), label: spec.label };
  return null;
}
export { resolveTarget as resolveMissionTarget };

function rentalBoat(world) {
  return world.vehicles.find((v) => v.isBoat && v.playerOwned && !v.wrecked && !v.sinking) || null;
}

// Progress s along the Diepenring route (rondvaartchase.js) nearest to (x, y).
function routeS(x, y) {
  let best = 0, bd = Infinity;
  for (let s = 0; s <= ROUTE_LENGTH; s += 4) {
    const q = routeAt(s);
    const d = (q.x - x) ** 2 + (q.y - y) ** 2;
    if (d < bd) { bd = d; best = s; }
  }
  return { s: best, d: Math.sqrt(bd) };
}

// A dry spot right at the water's edge near (x, y), outside buildings: where
// Jelle takes his run-up for a jump over the water.
function bankNear(map, x, y) {
  const inside = (px, py) => map.buildingsNear(px, py, 1).some((b) => pointInPolygon(px, py, b.pts));
  for (let r = 0; r <= 160; r += 4) {
    const n = Math.max(1, Math.round(r / 3));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (isInWater(map, px, py) || inside(px, py)) continue;
      for (let j = 0; j < 8; j++) {
        if (isInWater(map, px + Math.cos(j * Math.PI / 4) * 4, py + Math.sin(j * Math.PI / 4) * 4)) return { x: px, y: py };
      }
    }
  }
  return roadSpot(map, x, y);
}

// The fleeing vehicle of a chase stage: on the start road, `lead` metres on
// from the mission start, pointing away from the player where the road allows.
// seconds a parked chase target waits for the player to come close before it flees by itself
export const CHASE_WAIT_MAX = 6;
// the wait for a parked target: CHASE_WAIT_MAX s, plus the metres to its `parked` ring at an easy 10 m/s (the bot measured 13 m/s through the city, with a flat tyre on the way)
export function chaseWaitMax(d0, st) {
  return CHASE_WAIT_MAX + Math.max(0, (d0 || 0) - (st.parked || 0)) / 10;
}

function spawnChaseVehicle(world, def, st) {
  const from = st.from ? roadSpot(world.map, st.from[0], st.from[1], true) : null;
  const base = from && from.road ? from : def.start;
  const road = base.road;
  if (!road) return null;
  const at = pointAlongRoad(road, base, st.lead || 40);
  const p = world.player;
  let v = null;
  for (const pick of [0.1, 0.9]) {
    v = spawnVehicleOnRoad(world.map, road, false, () => pick, false, false, at, false, { ...st.vehicle });
    if (road.oneway || Math.cos(v.angle - Math.atan2(v.y - p.y, v.x - p.x)) > 0) break;
  }
  v.health = st.health || 190;
  if (st.hero) {
    // Tessa's own Fjord (H16): the one in the world goes, this one is it now
    for (let i = world.vehicles.length - 1; i >= 0; i--) {
      const o = world.vehicles[i];
      if (o !== v && o.isHeroCar && o.driver !== 'player' && !o.passenger) world.vehicles.splice(i, 1);
    }
    v.isHeroCar = true;
  }
  v.missionCar = true;
  v.chaseTarget = true;
  // een vluchtende wagen remt niet voor de speler (dan kaap je hem te makkelijk door ervoor te gaan
  // rijden): hij rijdt door en moet worden ingehaald of stukgeschoten. Alleen `block` laat hem staan.
  v.chaseDodge = !st.block;
  v.label = st.name || '';
  const first = st.route && st.route[0];
  const goal = (st.toTrain && fjordLoadPoint()) || (first ? { x: first.at[0], y: first.at[1] } : { x: st.flee[0], y: st.flee[1] });
  v.aiOpts = { goal: { x: goal.x, y: goal.y }, chase: true, cruise: st.cruise || 15 };
  // waiting at the groothandel: off the road graph (so traffic AI leaves it be) until it flees
  if (st.parked) { v.parkedRoad = v.road; v.parkedAi = v.aiOpts; v.road = null; v.aiOpts = null; v.speed = 0; }
  world.vehicles.push(v);
  return v;
}

// the seconds a chase may take; timeIf: { tag: seconds } gives the ones who helped (M26: the ally of M23 closes a street) more
function chaseTime(st) {
  const help = st.timeIf && Object.entries(st.timeIf).find(([tag]) => choiceOn(tag));
  return help ? help[1] : st.time || 180;
}

// A chase `route` ({ at, radio }): the fleeing vehicle drives from point to point;
// reaching one puts its radio report on air, after the last it heads for `flee`.
function updateChaseRoute(world, st, S, t, dt = 0) {
  const leg = S.leg || 0;
  const wp = st.route[leg];
  if (!wp) return;
  // there, or as close as its road gets it (it waits at the end of its plan)
  const dw = dist(t.x, t.y, wp.at[0], wp.at[1]);
  S.wpWait = dw < 50 && Math.abs(t.speed) < 1 ? (S.wpWait || 0) + dt : 0;
  if (dw > (wp.r || 22) && S.wpWait < 2) return;
  S.wpWait = 0;
  if (wp.radio && contactMod) contactMod.queueStoryContact(withValidity({ via: 'radio', from: 'rikus', mood: 'night', ...wp.radio }, MISSION_RADIO_VALID));
  if (wp.say) world.addMessage(wp.say, 3);
  S.leg = leg + 1;
  const next = st.route[S.leg];
  if (!next) S.routeDone = true;
  t.aiOpts = { ...t.aiOpts, goal: next ? { x: next.at[0], y: next.at[1] } : { x: st.flee[0], y: st.flee[1] } };
  t.planAt = 0;
}

// H18: Tammo whistles and the pigeons come down over the fireworks onto the
// fleeing trekker (missionstory.js playPigeonSwarm); it stops when the scene ends.
function startSwarm(world, def, st, S, t) {
  S.swarm = 'playing';
  const stall = resolveTarget(world, st.swarm.stall, { x: t.x, y: t.y });
  const done = () => { t.speed = 0; S.swarm = 'done'; };
  const sw = st.swarm.script && storyDataReady() ? storyLines(st.swarm.script.ids, st.swarm.script).map(([who, text]) => [who, text]) : st.swarm.lines;
  if (isCinematicActive() || !playPigeonSwarm(world, { limo: t, stall, lines: sw, onDone: done })) {
    world.addMessage(st.half, 3.5);
    done();
  }
}

// Flat tyres: the chased vehicle rolls to a stop and becomes the mission
// vehicle; the car the player came in goes back to being ordinary traffic.
function stopChaseVehicle(world, def, st) {
  const v = chain.stage && chain.stage.target;
  if (!v) { nextStage(world, def); return; }
  if (st.keep) {
    // the finale's limo: it stays where it stopped, nobody's mission car
    v.speed = 0; v.aiOpts = null; v.chaseTarget = false; v.missionCar = false;
    if (st.stopped) world.addMessage(st.stopped, 4.5);
    nextStage(world, def);
    return;
  }
  adoptVehicle(world, v, st);
  if (st.stopped) world.addMessage(st.stopped, 4.5);
  nextStage(world, def);
}

// The player jumped into the chased vehicle (H8's tanker): it is theirs,
// tyres whole, and the run goes straight on past the 'board' stage.
function hijackChase(world, def, st, v) {
  adoptVehicle(world, v, st, true);
  chain.hijacked = true;
  chain.boarded = true;
  world.addMessage(st.hijack, 4.5);
  if (def.stages[chain.stageIndex + 1] && def.stages[chain.stageIndex + 1].kind === 'board') chain.stageIndex++;
  nextStage(world, def);
}

function adoptVehicle(world, v, st, intact = false) {
  v.road = null;
  v.aiOpts = null;
  v.plan = [];
  if (v.driver !== 'player') v.driver = null;
  v.chaseTarget = false;
  if (!st.hero && !intact) v.model = { ...v.model, maxSpeed: Math.min(v.model.maxSpeed, 15) };
  v.health = Math.max(v.health, 60);
  const old = chain.vehicle;
  if (old && old !== v) old.missionCar = false;
  chain.vehicle = v;
  chain.boarded = false;
}

// H16: the Fjord drives onto the goods train at the Stationsplein
function chaseReachedTrain(world, def, st, S, t, dt) {
  const lp = fjordLoadPoint();
  if (!lp) return false;
  const d = dist(t.x, t.y, lp.x, lp.y);
  S.stuck = d < 45 && Math.abs(t.speed) < 1 ? (S.stuck || 0) + dt : 0;
  const late = S.t > (st.time || 180) || dist(world.player.x, world.player.y, t.x, t.y) > (st.escape || 380);
  if (d > 14 && S.stuck < 3 && !late) return false;
  // it got there (up the ramp), or the clock ran out (it is on the train already)
  if (d > 14) loadFjordNow(world, t);
  else loadFjord(world, t);
  if (st.loaded) world.addMessage(d > 14 ? st.late || st.loaded : st.loaded, 4);
  nextStage(world, def);
  return true;
}

function stageNeedsVehicle(world, def) {
  const st = def.stages && def.stages[chain.stageIndex];
  const v = chain.vehicle;
  if (!st || !v || v.wrecked || v.disabled || world.player.inVehicle === v || meespelerInVoertuig(world, v)) return false;
  return st.kind === 'board' || st.kind === 'garage' || (st.kind === 'goto' && st.mode === 'vehicle');
}

function stageVehicleProblem(world, def) {
  const st = def.stages && def.stages[chain.stageIndex];
  if (!st || !def.vehicle || !(st.kind === 'board' || st.kind === 'garage' || (st.kind === 'goto' && st.mode === 'vehicle'))) return null;
  // a car waiting after another objective (H16's pigeon flight) is not abandoned yet
  if (st.kind === 'board' && !chain.boarded && chain.stageIndex > 0) {
    const v = chain.vehicle;
    if (v && world.vehicles.includes(v) && !v.wrecked && !v.disabled) return null;
  }
  return vehicleProblem(world, def);
}

function stageMarker(world, def) {
  const S = chain.stage;
  const st = def.stages && def.stages[chain.stageIndex];
  if (!S || !st) return def.start;
  if (stageNeedsVehicle(world, def)) return chain.vehicle;
  if (st.kind === 'pigeon' && S.flying) {
    const k = S.targets.findIndex((t, j) => t && !S.spotted.has(j));
    return k >= 0 ? S.targets[k] : def.start;
  }
  if (st.kind === 'chase' && st.race && S.finish) return S.finish;
  return S.target || S.here;
}

// H6's three minutes: the stages after `window.after` up to and including `window.until`.
function inWindow(def) {
  const W = def.window;
  if (!W || !def.stages) return false;
  const a = def.stages.findIndex((q) => q.kind === W.after), b = def.stages.findIndex((q) => q.kind === W.until);
  return a >= 0 && b >= 0 && chain.stageIndex > a && chain.stageIndex <= b;
}

function stageProgressText(world, def) {
  const text = stageProgressBase(world, def);
  return text && inWindow(def) ? `${text} · ${def.window.label} ${fmtTime(assistTime(def.window.secs) - chain.windowT)}` : text;
}

function stageProgressBase(world, def) {
  const S = chain.stage;
  const st = def.stages && def.stages[chain.stageIndex];
  if (!S || !st) return null;
  const list = def.heist ? def.stages.filter((q) => !q.only || q.only === heistApproach()) : def.stages;
  const n = `${list.indexOf(st) + 1}/${list.length}`;
  if (st.kind === 'pigeon' && S.flying) return `${st.label} · op de foto ${S.spotted.size}/${S.targets.length}`;
  if (st.kind === 'hold') return `${st.label} · ${Math.min(100, Math.round(S.hold / st.time * 100))}%`;
  if (st.kind === 'bake' && S.bake) return `${st.label} · eierbal ${bakeProgress(S.bake).round}/${S.bake.rounds}`;
  if (st.kind === 'convoy' && chain.convoy) { const sc = convoyStatus(world, chain.convoy); return `${st.label} · ${sc.near}/${sc.total} bij elkaar`; }
  if (st.kind === 'airgates' && planeStageProgress(st, S)) return planeStageProgress(st, S);
  if (st.kind === 'escape') {
    if (S.target && !world.wanted) return `${st.label} · ${Math.round(afstandMeespeler(world, S.target.x, S.target.y))} m`;
    return `${S.target ? 'Schud de politie af' : st.label} · ${'★'.repeat(world.wanted)}`;
  }
  if (st.kind === 'chase' && st.race && S.finish) return `${st.label} · nog ${Math.round(afstandMeespeler(world, S.finish.x, S.finish.y))} m`;
  if (st.kind === 'chase' && S.target && S.target.parkedRoad) return `${st.parkedLabel || st.label} · ${Math.round(afstandMeespeler(world, S.target.x, S.target.y))} m`;
  if (st.kind === 'chase' && S.target) {
    const left = `${st.meter || 'banden'} ${Math.max(0, Math.round(100 - (S.hp0 - S.target.health) / st.hits * 100))}%`;
    return `${st.label} · ${left}${st.clock ? ` · ${st.clock} ${fmtTime((st.time || 180) - S.t)}` : ''}`;
  }
  if (st.kind === 'boatchase' && S.boat) return S.hold > 0 ? `${st.label} · aan boord ${Math.min(100, Math.round(S.hold / (st.boardTime || 2.5) * 100))}%` : `${st.label} · ${Math.round(afstandMeespeler(world, S.boat.v.x, S.boat.v.y))} m`;
  if (st.light && chain.light) return `${st.label} · gezien ${Math.round(chain.light.exposure * 100)}%${Number.isFinite(chain.timeLeft) ? ` · het water komt over ${fmtTime(chain.timeLeft)}` : ''}`;
  if (st.kind === 'goto' && st.limit) return `${st.label} · ${fmtTime(st.limit - S.t)}`;
  if (st.kind === 'train' && fjordTrainState()) {
    const ft = fjordTrainState();
    return `${st.label} · trein nog ${Math.max(0, Math.round(ft.cross.s - ft.t.c - ft.t.halfLen))} m`;
  }
  if (def.eggs && chain.stageIndex >= def.eggs.from && chain.eggs != null) return `${st.label} · ${eggText(def)}`;
  return `${st.label} (${n})`;
}

// Jelle's banner (H10) from the stage that has it, with its rope knots.
function showMissionFlag(world, def, from) {
  const ps = def.stages.find((q) => q.flag);
  if (!ps) return;
  const c = resolveTarget(world, ps.flag, from);
  const ropes = ps.targets.map((t) => resolveTarget(world, t, from)).filter(Boolean);
  if (c) showTowerFlag({ x: c.x, y: c.y, z0: ps.flag.z0, z1: ps.flag.z1, width: ps.flag.width, ropes });
}

function enterStage(world, def, k) {
  chain.stageIndex = k;
  const st = def.stages[k];
  if (!st) { succeed(world, def); return; }
  // a stage that belongs to one answer: ifTag / unlessTag (a choice of this mission or a remembered one)
  if ((st.ifTag && !choiceOn(st.ifTag)) || (st.unlessTag && choiceOn(st.unlessTag))) { enterStage(world, def, k + 1); return; }
  const from ={ x: world.player.x, y: world.player.y };
  const S = { t: 0, hold: 0, here: from, target: resolveTarget(world, st.target, from), spotted: new Set(), holds: [], started: false, flying: false, said: 0 };
  if (st.kind === 'pigeon') {
    S.targets = st.targets.map((t) => resolveTarget(world, t, from));
    S.target = resolveTarget(world, { pigeonSpot: st.spot }, from);
    S.gullT = st.gulls ? st.gulls[1] : 0;
    if (st.flag && !hasTowerFlag()) showMissionFlag(world, def, from);
  }
  if (st.showFlag && !hasTowerFlag()) showMissionFlag(world, def, from);
  if (def.fjordTrain && k === 0) spawnFjordTrain(world);
  if (def.heist) {
    if (k === 0 && startHeist(world, def.heist)) {
      placeHeistProps(world, resolveTarget(world, def.heist.fuse, from), resolveTarget(world, def.heist.vitrine, from));
      // the cameras and the guard outside stand from the start (the plan shows them)
      // along the walk from the mission's own start, wherever the player happened to trigger it
      const origin = def.start && dist(from.x, from.y, def.start.x, def.start.y) > 12 ? def.start : from;
      def.stages.forEach((q, j) => { if (q.watch) guardRoute(world, origin, resolveTarget(world, q.target, origin), q.watch, j); });
    }
    if (st.only && st.only !== heistApproach()) { enterStage(world, def, k + 1); return; }
    if (st.vitrine && vitrineStand()) S.target = { ...vitrineStand(), label: st.label };
    const moved = heistEnterStage(world, st, S, k);
    if (moved) S.target = moved;
    const fi = def.stages.findIndex((q) => q.kind === 'fuse');
    if (fi >= 0 && k > fi) { closeFuse(); camerasOff(); }
  }
  if (st.kind === 'chase') {
    S.target = spawnChaseVehicle(world, def, st);
    S.hp0 = S.target ? S.target.health : 0;
  }
  if (st.kind === 'train') {
    const ft = fjordTrainState();
    if (!ft || !ft.fjord) {
      // stopped before it got on: the train leaves without it
      sendFjordTrainAway();
      chain.stage = S;
      nextStage(world, def);
      return;
    }
    S.target = fjordCrossing();
  }
  if (st.kind === 'scene' && st.dropFlag) dropFlag();
  if (st.kind === 'chase' && st.race) S.finish = resolveTarget(world, st.finish, from);
  disposePlaneStage(world);
  if (st.kind === 'plane' || st.kind === 'airgates' || st.kind === 'landplane') enterPlaneStage(world, st, S);
  if (st.kind === 'boatchase') S.boat = spawnSkutsje(world, st);
  if (st.kind === 'boatchase' && S.boat) S.target = S.boat.v;
  if (st.kind === 'hold' && st.fireworks) { S.fwT = 1.5; S.fw = []; }
  if (st.kind === 'choice') enterChoice(S);
  if (st.kind === 'timing') enterTiming(S, st, choiceOn);
  if (st.kind === 'rit') enterRit(world, st, S);
  if (def.eggs && k === def.eggs.from) { chain.eggs = 100; chain.eggWarn = 100; chain.eggVeh = null; }
  chain.stage = S;
  if (st.stars) { world.wanted = Math.max(world.wanted, st.stars); world.wantedDecayTimer = 0; }
  if (st.calm) { world.wanted = 0; world.wantedDecayTimer = 0; }
  if (st.bonus) chain.timeLeft += st.bonus;
  if (st.setTime) chain.timeLeft = st.setTime;
  const say = chain.hijacked && st.sayHijacked ? st.sayHijacked : st.say;
  if (say) world.addMessage(say, 4.5);
  if (st.radio && contactMod) contactMod.queueStoryContact(withValidity({ via: 'radio', from: 'rikus', mood: 'night', ...st.radio }, MISSION_RADIO_VALID));
  // the new arc: a radio fragment and talk from the script, and the clock that runs faster (Het Loket)
  if (st.radioScript && contactMod && storyDataReady()) {
    const lines = storyLines(st.radioScript.ids, { from: st.radioScript.from, to: st.radioScript.to }).map(([who, text, o]) => [who === 'V' ? 'rikus' : who, text, { tag: o.tag, ...(who === 'jelle' ? { card: 'jelle' } : {}) }]);
    if (lines.length) contactMod.queueStoryContact(withValidity({ via: 'radio', from: 'rikus', mood: 'night', caller: st.radioScript.caller || '', lines }, MISSION_RADIO_VALID));
  }
  if (st.talk && storyDataReady()) playTalk(talkLines(st.talk.ids, st.talk), { id: `${def.id || def.label}:${k}`, delay: st.talk.delay || 1 });
  if (st.clock) { chain.clockRate = st.clock; world.addMessage('De klok loopt harder: Jelle heeft de rij gekocht.', 4, { kind: 'gevaar', key: 'loket-klok' }); }
  saveCheckpoint(world, def, k);
}

// #213: remember this stage as the place a new attempt starts from (see missioncheckpoint.js for which stages count)
function saveCheckpoint(world, def, k) {
  if (!chain.checkpoints || chain.phase !== 'active' || !isCheckpointStage(def, k)) return;
  const p = world.player, v = chain.vehicle;
  const usable = v && world.vehicles.includes(v) && !v.wrecked && !v.disabled;
  recordCheckpoint(chain.checkpoints, makeCheckpoint({
    missionIndex: chain.index, stageIndex: k, timeLeft: chain.timeLeft, chain,
    player: { x: p.x, y: p.y, angle: p.angle },
    vehicle: usable ? { x: v.x, y: v.y, angle: v.angle, inside: p.inVehicle === v } : null,
  }));
}

// A new attempt at a mission that failed after a checkpoint: back to that stage with the time, progress and vehicle of the moment.
function resumeFromCheckpoint(world, def) {
  const cp = chain.resume;
  chain.resume = null;
  if (!cp) return;
  const p = world.player, v = chain.vehicle;
  if (cp.player) placeParty(world, cp.player);
  if (v && cp.vehicle && !(def.heist && !cp.vehicle.inside)) {
    v.x = cp.vehicle.x; v.y = cp.vehicle.y; v.angle = cp.vehicle.angle; v.speed = 0; v.vx = 0; v.vy = 0;
    if (cp.vehicle.inside && !p.inVehicle && typeof p.enterVehicle === 'function') p.enterVehicle(v, world);
  }
  if (def.heist || def.fjordTrain) enterStage(world, def, 0);
  // a heist retried at the getaway: the doors you came through stand open
  if (def.heist) for (const id of ['achterdeur', 'glasdeur']) openHeistDoor(id);
  if (chain.phase !== 'active') return;
  enterStage(world, def, cp.stageIndex);
  applyCheckpointProgress(cp, chain);
  chain.boarded = chain.boarded || !!(cp.vehicle && cp.vehicle.inside);
  world.addMessage('Je begint opnieuw bij het laatste hervatpunt.', 3.5);
}

function nextStage(world, def) {
  const cur = def.stages[chain.stageIndex];
  dropPursuer(world);
  if (chain.light && !(def.stages[chain.stageIndex + 1] && def.stages[chain.stageIndex + 1].light)) disposeLight();
  if (def.heist) heistLeaveStage(world, cur);
  if (cur && cur.pay) {
    const amt = Math.min(cur.pay, Math.max(0, Math.floor(world.money)));
    world.money -= amt;
    const short = amt < cur.pay ? (cur.payShort || ` Oma Trijntje legt de laatste €${cur.pay - amt} bij.`) : '';
    world.addMessage(`Gekocht! ${cur.paid || 'Afgerekend'}, -€${amt}.${short}`, 4, { kind: 'missie', key: 'stage-paid' });
  }
  enterStage(world, def, chain.stageIndex + 1);
}

// --- H14: Jelle's skûtsje sails the Diepenring (rondvaartchase.js route) -------
const SKUTSJE_MODEL = { ...BOAT_KINDS.skutsje, maxSpeed: 8 };

// The route a boat chase follows: the Diepenring (rondvaartchase.js), or the stage's own `path` (world points,
// M11 on the Reitdiep and the Lauwersmeer): { len, at(s) -> { x, y, a }, nearest(x, y) -> s }.
const pathRoutes = new WeakMap();
function chaseRoute(st) {
  if (!st.path) return { len: ROUTE_LENGTH, at: routeAt, nearest: (x, y) => routeS(x, y).s };
  let R = pathRoutes.get(st.path);
  if (R) return R;
  const pts = st.path, cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  const at = (s) => {
    s = clamp(s, 0, len);
    let i = 0;
    while (i < pts.length - 2 && cum[i + 1] < s) i++;
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const t = (s - cum[i]) / (cum[i + 1] - cum[i] || 1);
    return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, a: Math.atan2(by - ay, bx - ax) };
  };
  const nearest = (x, y) => {
    let best = 0, bd = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (cp.dist2 < bd) { bd = cp.dist2; best = cum[i] + cp.t * (cum[i + 1] - cum[i]); }
    }
    return best;
  };
  R = { len, at, nearest };
  pathRoutes.set(st.path, R);
  return R;
}

function spawnSkutsje(world, st) {
  const p = world.player;
  const R = chaseRoute(st);
  const here = R.nearest(p.x, p.y);
  const dir = here + 600 < R.len ? 1 : -1;
  const s0 = clamp(here + dir * (st.lead || 45), 0, R.len);
  const q = R.at(s0);
  const v = new Vehicle(q.x, q.y, q.a + (dir < 0 ? Math.PI : 0), { ...SKUTSJE_MODEL });
  v.isBoat = true;
  v.scripted = true;
  v.missionCar = true;
  v.driver = 'jelle';
  v.label = st.name || '';
  world.vehicles.push(v);
  chain.skutsje = v;
  return { v, s: s0, dir, speed: 2, R };
}

function updateBoatChase(dt, world, def, st, S) {
  const B = S.boat;
  if (!B) { nextStage(world, def); return; }
  const p = world.player, v = B.v;
  if (v.driver !== 'jelle') { fail(world, def, st.lost); return; }
  if (!world.vehicles.includes(v)) world.vehicles.push(v);
  const d = dist(p.x, p.y, v.x, v.y);
  // a chase does not wait for the player: the skûtsje keeps its pace however far behind you are
  const want = 7;
  B.speed += clamp(want - B.speed, -2 * dt, 1.4 * dt);
  B.s += B.dir * B.speed * dt;
  if (B.s <= 0 || B.s >= B.R.len) { B.s = clamp(B.s, 0, B.R.len); B.speed = 0; }
  const q = B.R.at(B.s);
  v.x = q.x; v.y = q.y;
  v.angle = q.a + (B.dir < 0 ? Math.PI : 0);
  v.speed = B.speed;
  v.driftX = 0; v.driftY = 0;
  // the mast folds aft to pass under the bridges (models3d_vehicles.js)
  const c = Math.cos(v.angle), sn = Math.sin(v.angle);
  animateSkutsjeRig(v, 0.55, [-2, 2, 6, 10].some((k) => world.map.isOnBridge(v.x + c * k, v.y + sn * k)) ? 1 : 0, world.time);
  const alongside = !!(p.inVehicle && p.inVehicle.isBoat) && d < (st.board || 8);
  if (alongside) {
    if (!S.said) { S.said = 1; world.addMessage(st.near || 'Langszij! Hou hem vast...', 2.5); }
    S.hold += dt;
    if (S.hold >= (st.boardTime || 2.5)) { B.speed = 0; v.speed = 0; nextStage(world, def); return; }
  } else S.hold = Math.max(0, S.hold - dt * 0.5);
  if (d > (st.escape || 230) || S.t > (st.time || 180)) fail(world, def, st.lost || 'het skûtsje is ontsnapt');
}

// --- M11: the coast guard's searchlight over the marsh (stage `light`, searchlightlogic.js) ----------
// The light stays up over consecutive stages that carry the same `light`; seen too long = the end of the sneaking.
function updateLightStage(dt, world, def, st, S) {
  if (!chain.light) chain.light = { ctl: createSearchlight(st.light), exposure: 0, t: 0, warned: false };
  const Lt = chain.light;
  Lt.t += dt;
  if (Lt.ctl) Lt.ctl.update(Lt.t);
  const p = world.player, ref = p.inVehicle || p;
  const ang = sweepAngle(st.light, Lt.t);
  const inside = inBeam(st.light, ang, ref.x, ref.y);
  const coming = inside || inBeam({ ...st.light, half: (st.light.half || 0.17) * 3 }, ang, ref.x, ref.y);
  Lt.exposure = stepExposure(Lt.exposure, dt, inside, !!p.crouching, st.light);
  if (coming && !Lt.warned) { Lt.warned = true; world.addMessage(st.light.warn || 'Het licht! Bukken (Ctrl), of weg uit de bundel.', 2.8, { kind: 'gevaar', key: 'zoeklicht' }); }
  else if (!coming && Lt.exposure < 0.1) Lt.warned = false;
  if (Lt.exposure >= 1) {
    fail(world, def, st.light.fail || 'in het licht van de kustwacht gezien');
    return true;
  }
  return false;
}

function disposeLight() {
  if (!chain.light) return;
  if (chain.light.ctl) chain.light.ctl.dispose();
  chain.light = null;
}

// M11: a hop over the water or the coast, Klaas' cutter: the pair stands at `spec` (a stage target), on foot
function warpPlayer(world, spec) {
  const p = world.player;
  const t = resolveTarget(world, spec, p);
  if (!t) return;
  if (p.inVehicle) p.exitVehicle(world.map, world);
  p.x = t.x; p.y = t.y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.gz = 0;
  p.water = null; p.swimming = false; p.climb = null;
  const c = world.companion;
  if (c && c.state !== 'dead') {
    if (c.inVehicle) { c.inVehicle.passenger = null; c.inVehicle = null; }
    c.x = t.x + 1.6; c.y = t.y + 0.6; c.vx = 0; c.vy = 0; c.water = null; c.swimming = false;
  }
  if (spec.clock != null && typeof world.clock === 'number') world.clock = spec.clock;
}

// --- M10: a limo on your tail (goto stage `pursuer`) -------------------------------
// It drives the road graph after you (the chase AI of vehicle.js, goal = where you are), so a quad that
// cuts over a wierdepad or through a churchyard loses it. Caught = it stays right on you for `caughtFor` s.
// pursuer { model, behind, cruise, caught, caughtFor, shake, name, fail, close, lostText }
function spawnPursuer(world, st) {
  const P = st.pursuer, ref = world.player.inVehicle || world.player;
  const back = P.behind || 45, a = ref.angle || 0;
  const spot = roadSpot(world.map, ref.x - Math.cos(a) * back, ref.y - Math.sin(a) * back, true);
  if (!spot.road) return null;
  let v = null;
  for (const pick of [0.1, 0.9]) {
    v = spawnVehicleOnRoad(world.map, spot.road, false, () => pick, false, false, spot, false, { ...P.model });
    // facing the player where the road allows
    if (spot.road.oneway || Math.cos(v.angle - Math.atan2(ref.y - v.y, ref.x - v.x)) > 0) break;
  }
  v.missionCar = true;
  v.chaseDodge = true;
  v.label = P.name || '';
  v.aiOpts = { goal: { x: ref.x, y: ref.y }, chase: true, cruise: P.cruise || 14 };
  return v;
}

function updatePursuer(dt, world, def, st, S) {
  const P = st.pursuer;
  if (S.limo === undefined) {
    S.limo = spawnPursuer(world, st);
    if (S.limo) world.vehicles.push(S.limo);
  }
  const v = S.limo;
  if (!v) return false;
  if (S.lost) return false;
  // wrecked, or taken out of the world: the chase is over
  if (!world.vehicles.includes(v) || v.wrecked) { S.lost = true; S.limo = null; return false; }
  const ref = world.player.inVehicle || world.player;
  const d = dist(ref.x, ref.y, v.x, v.y);
  if ((S.goalT = (S.goalT || 0) - dt) <= 0) {
    S.goalT = 0.8;
    v.aiOpts = { goal: { x: ref.x, y: ref.y }, chase: true, cruise: P.cruise || 14 };
  }
  S.caughtT = d < (P.caught || 7) ? (S.caughtT || 0) + dt : Math.max(0, (S.caughtT || 0) - dt * 0.7);
  if (d < (P.close || 22) && !S.warned) { S.warned = true; world.addMessage(P.closeText || 'De limo zit op je bumper!', 2.6, { kind: 'gevaar', key: 'pursuer-close' }); }
  else if (d > (P.close || 22) * 2) S.warned = false;
  if (S.caughtT > (P.caughtFor || 3)) {
    fail(world, def, P.fail || 'de limo haalt je in');
    return true;
  }
  if (d > (P.shake || 170)) {
    S.lost = true;
    world.addMessage(P.lostText || 'De limo raakt je kwijt.', 3.2);
    const i = world.vehicles.indexOf(v);
    if (i >= 0) world.vehicles.splice(i, 1);
    S.limo = null;
  }
  return false;
}

function dropPursuer(world) {
  const v = chain.stage && chain.stage.limo;
  if (!v) return;
  const i = world.vehicles.indexOf(v);
  if (i >= 0) world.vehicles.splice(i, 1);
  chain.stage.limo = null;
}

// --- H15: the trauma heli (helirun.js) as one stage -----------------------------
function updateHeliStage(dt, world, def, st, S) {
  const p = world.player;
  if (S.result) {
    if (S.result.success) nextStage(world, def);
    else fail(world, def, S.result.aborted ? 'de vlucht is afgebroken' : st.lost || 'de ballon is ontsnapt');
    return;
  }
  if (S.started || isCinematicActive()) return;
  if (p.inVehicle && !p.inVehicle.storyDemo) { hint(world, 'Uitstappen: Rotor Roelf wacht bij zijn heli.'); return; }
  if (S.target && dist(p.x, p.y, S.target.x, S.target.y) > 30) { hint(world, st.hint || 'Naar het helidek van Rotor Roelf, op Eelde.'); return; }
  S.started = startHeliRun({ variant: st.variant, onFinish: (res) => { S.result = res; } });
  if (!S.started && S.t > 10) { world.addMessage('Rotor Roelf vliegt zelf. Dijkstra brengt de Eierbal.', 4); nextStage(world, def); }
}

// --- M14 (new story): a race to a spot against a rival on the road network. Whoever is first at `finish` wins; the
// rival drives like the fleeing vehicle of a chase (it has no route data, it follows the roads). Without a rival
// (no road to put it on) it is a drive to the finish.
function updateChaseRace(world, def, st, S) {
  const p = world.player;
  const fin = S.finish;
  if (!fin) { nextStage(world, def); return; }
  const t = S.target && world.vehicles.includes(S.target) && !S.target.wrecked ? S.target : null;
  if (t) {
    S.rivalBest = Math.min(S.rivalBest ?? Infinity, dist(t.x, t.y, fin.x, fin.y));
    if (S.rivalBest < (st.rivalRadius || 40)) { fail(world, def, st.lost || 'de ander was eerder bij de finish'); return; }
  }
  if (dist(p.x, p.y, fin.x, fin.y) < (st.radius || 16)) {
    if (t) { t.chaseTarget = false; t.missionCar = false; t.aiOpts = { ...t.aiOpts, chase: false }; }
    if (st.won) world.addMessage(st.won, 4);
    nextStage(world, def);
  }
}

// --- H18: Durk & Douwe's fireworks rain down on a hold stage --------------------
const FW_COLORS = [[1, 0.35, 0.3], [1, 0.85, 0.3], [0.4, 0.8, 1], [0.6, 1, 0.5], [1, 0.5, 0.9]];

function updateFireworks(dt, world, def, st, S) {
  const fw = st.fireworks;
  const p = world.player;
  const c = S.target;
  if ((S.fwT -= dt) <= 0) {
    S.fwT = fw.every[0] + Math.random() * (fw.every[1] - fw.every[0]);
    // mostly around the player, so standing still at the stall is not enough
    const close = dist(p.x, p.y, c.x, c.y) < (st.radius || HOLD_RADIUS) * 2.5;
    const aim = close && Math.random() < 0.6 ? p : c;
    const a = Math.random() * Math.PI * 2, r = Math.random() * 5;
    S.fw.push({ x: aim.x + Math.cos(a) * r, y: aim.y + Math.sin(a) * r, t: 1.3 });
    const f = S.fw[S.fw.length - 1];
    (world.audioEvents || (world.audioEvents = [])).push({ kind: 'weapon', sub: 'incoming', x: f.x, y: f.y });
  }
  for (let i = S.fw.length - 1; i >= 0; i--) {
    const f = S.fw[i];
    f.t -= dt;
    if (f.t > 0) {
      // a whistling trail coming down, so you can see where it lands
      spawnFxSpark(f.x, 1 + f.t * 9, f.y, (Math.random() - 0.5) * 2, -6, (Math.random() - 0.5) * 2, 0.35);
      continue;
    }
    S.fw.splice(i, 1);
    (world.audioEvents || (world.audioEvents = [])).push({ kind: 'weapon', sub: 'burst', x: f.x, y: f.y, z: 1.5 });
    const [r0, g0, b0] = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      spawnFxPuff(f.x, 1.2, f.y, Math.cos(a) * 6, 2 + Math.random() * 3, Math.sin(a) * 6, 0.7, 0.25, 0.9, r0, g0, b0, 0.95, 2.4, 0);
      spawnFxSpark(f.x, 1, f.y, Math.cos(a) * 8, 3 + Math.random() * 5, Math.sin(a) * 8, 0.6);
    }
    if (!p.inVehicle && dist(p.x, p.y, f.x, f.y) < (fw.hit || 2.2) && !isKnockedDown(p, world)) {
      const a = Math.atan2(p.y - f.y, p.x - f.x);
      knockDown(p, world, { vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, vz: 3, kind: 'blast', lieFor: 1 });
      S.hold = Math.max(0, S.hold - (fw.cost || 3));
      world.addMessage(fw.hitText || 'Pang! Vol raak.', 2.2);
    }
  }
}

// --- H17: the egg meter, from the volkstuin to the stall: no hard braking --------
// def.eggs.count (M09: sixty eggs): the meter reads as eggs still whole
function eggText(def) {
  const n = def.eggs.count;
  return n ? `${Math.round(chain.eggs / 100 * n)} van ${n} eieren heel` : `eiermeter ${Math.round(chain.eggs)}%`;
}

function updateEggs(dt, world, def) {
  const v = world.player.inVehicle;
  if (!v || chain.eggs == null || !dt) { chain.eggVeh = null; return; }
  const sp = Math.abs(v.speed);
  if (chain.eggVeh === v) {
    const decel = (chain.eggPrev - sp) / dt;
    let loss = decel > 13 ? (decel - 13) * dt * 1.4 : 0;
    // M09: the wierdepaden are full of holes, so speed breaks eggs too
    if (def.eggs.rough) loss += Math.max(0, sp - def.eggs.rough.speed) * def.eggs.rough.per * dt;
    if (v.health < chain.eggHp) loss += (chain.eggHp - v.health) * 1.2;
    chain.eggs = Math.max(0, chain.eggs - loss);
  }
  chain.eggVeh = v;
  chain.eggPrev = sp;
  chain.eggHp = v.health;
  for (const lvl of [75, 50]) {
    if (chain.eggs < lvl && chain.eggWarn > lvl) {
      chain.eggWarn = lvl;
      world.addMessage(lvl > 60 ? `Krak. Achterin breekt een ei. ${eggText(def)}` : `Nog zo'n remmer en het wordt omelet! (${eggText(def)})`, 2.8);
    }
  }
  if (chain.eggs <= def.eggs.failAt) fail(world, def, def.eggs.fail);
}

const MODE_HINT = {
  vehicle: 'Met de auto, hè. Die hoort erbij.',
  foot: 'Uitstappen. Dit doe je te voet.',
  boat: 'Dit gaat over het water. Pak een boot.',
};

const GROEPSTAPPEN = new Set(['goto', 'hold', 'board', 'escape', 'chase']); // stappen die de vlag iedereen zelf lezen (of die er niet voor gelden)

function modeOk(p, mode) {
  if (mode === 'foot') return !p.inVehicle;
  if (mode === 'boat') return !!(p.inVehicle && p.inVehicle.isBoat);
  if (mode === 'vehicle') return !!chain.vehicle && p.inVehicle === chain.vehicle;
  return true;
}

// The staging (cutscenes_akte*.js) of a stage scene: its one script scene ('M20.2'), or the slice of it that it plays ('M26.4#7-14').
// The reveal of the case (M06.3) has a hand-made camera for the whole scene (shotAll below): its staging only brings the people.
function stagingKey(st) {
  const sc = st.script;
  if (!sc || sc.ids.length !== 1) return null;
  if (sc.from || sc.to) return `${sc.ids[0]}#${sc.from || 0}-${sc.to == null ? '' : sc.to}`;
  return sc.ids[0];
}

function playStageScene(world, st, S) {
  // the new arc's stage scenes say the script's lines (storytext.js)
  // a consequence picks the scene: the baking score (scriptTier) or an answer's tag (scriptIf)
  if (st.scriptTier && st.script) st = { ...st, script: { ...st.script, ids: st.scriptTier[juryTier()] || st.script.ids } };
  if (st.scriptIf && st.script) { const hit = st.scriptIf.find((q) => choiceOn(q.tag)); if (hit) st = { ...st, script: { ...st.script, ids: hit.ids } }; }
  if (st.script && storyDataReady()) st = { ...st, lines: storyLines(st.script.ids, st.script) };
  const c = S.target || { x: world.player.x, y: world.player.y };
  const name = (who) => (who === 'T' ? 'Tammo' : who === 'A' ? 'Anita' : storySpeakerName(who));
  let at = st.reveal ? REVEAL.card : 0.6;
  const lines = (st.lines || []).map(([who, text]) => {
    const dur = readingTime(text);
    const l = { speaker: name(who), text, at, dur };
    at += dur + 0.1;
    return l;
  });
  const orbit = (a0, r, h) => (u) => {
    const a = a0 + u * 0.7;
    return { position: { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, z: h }, lookAt: { x: c.x, y: c.y, z: 1.4 }, fov: 46 };
  };
  let shot = orbit(world.player.angle + 2.4, 9, 3.2);
  if (st.reveal) {
    // the empty case (heist.js lifts the dome on REVEAL's clock)
    const v = vitrineSpot() || c;
    const roofed = (x, y) => world.map.buildingsNear(x, y, 0.5).some((b) => pointInPolygon(x, y, b.pts));
    const open = (a, r) => !roofed(v.x + Math.cos(a) * r, v.y + Math.sin(a) * r);
    // the push-in comes from the most open side, towards the player where possible
    const toC = Math.atan2(c.y - v.y, c.x - v.x);
    let a0 = toC, bestN = -1;
    for (let k = 0; k < 16; k++) {
      const a = toC + (k / 16) * Math.PI * 2;
      const n = [1.3, 2.2, 3.4].filter((r) => open(a, r)).length * 3 - Math.min(k, 16 - k) * 0.2;
      if (n > bestN) { bestN = n; a0 = a; }
    }
    const side = [1, -1].find((sd) => open(a0 + sd * 0.9, 2.8) && open(a0 + sd * 0.5, 2.8)) ?? 1;
    // push in on the frosted dome in silence, hold while it lifts off the
    // empty cushion, close in on the card, then round to the two of them
    const card = { x: v.x + 0.05, y: v.y + 0.04 };
    const ease = (k) => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };
    const cardEnd = REVEAL.card + 1.9;
    shot = (u, t = 0) => ({ ...revealPose(t), held: true });
    const revealPose = (t) => {
      if (t < REVEAL.card) {
        const k = ease(t / REVEAL.push), h = ease((t - REVEAL.push) / (REVEAL.card - REVEAL.push));
        const r = 3.4 - 1.9 * k - 0.2 * h;
        return { position: { x: v.x + Math.cos(a0 + 0.12) * r, y: v.y + Math.sin(a0 + 0.12) * r, z: 2.1 - 0.4 * k }, lookAt: { x: v.x, y: v.y, z: 1.3 - 0.12 * h }, fov: 48 - 10 * k };
      }
      if (t < cardEnd) {
        const k = ease((t - REVEAL.card) / 0.8), r = 1.3 - 0.55 * k;
        return { position: { x: card.x + Math.cos(a0 + 0.12) * r, y: card.y + Math.sin(a0 + 0.12) * r, z: 1.68 - 0.13 * k }, lookAt: { x: card.x, y: card.y, z: 1.09 }, fov: 38 - 4 * k };
      }
      const k = ease((t - cardEnd) / 1.2), a = a0 + side * (0.35 + 0.55 * k);
      const near = Math.hypot(c.x - v.x, c.y - v.y) < 5;
      return { position: { x: v.x + Math.cos(a) * 2.8, y: v.y + Math.sin(a) * 2.8, z: 1.75 }, lookAt: { x: near ? (v.x + c.x) / 2 : v.x, y: near ? (v.y + c.y) / 2 : v.y, z: 1.2 }, fov: 50 };
    };
  } else if (st.deckCam && chain.skutsje) {
    // on the skûtsje (H14): from just off the bow quarter, low, looking aft over the deck, so the
    // sail stands behind the cast instead of between them and the camera; a slow drift along the hull
    const b = chain.skutsje, ca = Math.cos(b.angle), sa = Math.sin(b.angle), hl = b.model.len / 2;
    const sd = [1, -1].find((s) => isInWater(world.map, b.x + ca * (hl + 2.5) - sa * s * 3.5, b.y + sa * (hl + 2.5) + ca * s * 3.5)) ?? 1;
    shot = (u) => {
      const k = u * u * (3 - 2 * u), fw = hl + 3.2 - k * 1.4, lat = sd * (3.6 - k * 0.8);
      return { position: { x: b.x + ca * fw - sa * lat, y: b.y + sa * fw + ca * lat, z: 2.5 - k * 0.3 }, lookAt: { x: b.x + ca * 0.6, y: b.y + sa * 0.6, z: 1.7 }, fov: 50 - k * 4 };
    };
  } else if (st.cam) {
    // a wide shot from the target, looking up at cam.at (e.g. the tower)
    const look = (st.cam.at && resolveTarget(world, st.cam.at, c)) || c;
    const a0 = Math.atan2(c.y - look.y, c.x - look.x);
    shot = (u) => {
      const a = a0 + (u - 0.5) * 0.25;
      return { position: { x: look.x + Math.cos(a) * st.cam.r, y: look.y + Math.sin(a) * st.cam.r, z: st.cam.h }, lookAt: { x: look.x, y: look.y, z: st.cam.lookZ - u * 12 }, fov: 50 };
    };
    if (st.cam.crane) {
      // from the square up the tower to the banner
      shot = (u) => {
        const k = u * u * (3 - 2 * u), a = a0 - 0.3 + u * 0.35, r = st.cam.r - k * 12;
        return { position: { x: look.x + Math.cos(a) * r, y: look.y + Math.sin(a) * r, z: 2 + k * (st.cam.h - 2) }, lookAt: { x: look.x, y: look.y, z: 10 + k * (st.cam.lookZ - 10) }, fov: 48 - k * 6 };
      };
    }
    if (st.dropFlag) {
      // slow motion after the falling banner, down to the keien
      shot = (u, t) => {
        const q = flagFocus() || { x: look.x, y: look.y, z: 30 };
        const a = a0 + 0.35 + t * 0.03;
        return { position: { x: q.x + Math.cos(a) * 30, y: q.y + Math.sin(a) * 30, z: Math.max(4, q.z * 0.7 + 3) }, lookAt: { x: q.x, y: q.y, z: Math.max(0.5, q.z) }, fov: 46 };
      };
    }
  }
  // with actors: Tammo and Tessa where you stand (on the target for a wide
  // shot), plus the stage's cast; the camera shots above lead where given
  if (lines.length && !world.pigeonMode) {
    const wide = !!st.cam;
    const lookTo = (wide && st.cam.at && resolveTarget(world, st.cam.at, c)) || c;
    const staged = playCastScene(world, {
      at: wide ? c : { x: world.player.x, y: world.player.y }, lines: st.lines, cast: st.cast || [],
      kicker: st.kicker || '', title: st.title || '', big: wide ? '' : st.big || '', lookTo, solo: !!st.solo, staging: stagingKey(st), lead: st.reveal ? REVEAL.card : 0.6,
      deck: st.target && st.target.skutsje ? chain.skutsje : null,
      shot: st.reveal || wide || st.deckCam ? shot : null, shotLines: wide ? st.shotLines || 1 : 0, shotAll: !!st.reveal,
      poses: st.dropFlag || st.showFlag ? (t, cur) => ({ T: 'lookup', A: cur && cur.who === 'A' ? (st.dropFlag ? 'cheer' : 'point') : 'lookup' }) : null,
      props: [...(st.props || []), ...(st.knots ? [{ kind: 'point', name: 'knots', at: flagKnotsFocus }] : [])],
      update: st.dropFlag || st.showFlag ? (t, dt) => updateStoryProps(st.dropFlag ? dt * 0.45 : dt) : st.reveal ? heistRevealUpdate : null,
    });
    if (staged) return true;
  }
  const ok = playCinematic({
    id: 'mission-scene', priority: 3, duration: at + 0.4, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker: st.kicker || '', title: st.title || '', cardFor: 2.5, lines,
    shot: st.reveal ? (u, t) => { heistRevealUpdate(t, 0); return shot(u, t); } : shot,
    onStart: () => { world.cinematicHideNav = true; },
    onEnd: () => { world.cinematicHideNav = false; },
  });
  if (ok && st.big && !st.cam) {
    playCinematic({ id: 'mission-scene', priority: 3, duration: 3.6, pause: true, letterbox: true, skippable: true, hideHud: true, big: st.big, queue: true, shot: orbit(world.player.angle + 3.1, 5, 2.2), onStart: () => { world.cinematicHideNav = true; }, onEnd: () => { world.cinematicHideNav = false; } });
  }
  return ok;
}

function updateStages(dt, world, def) {
  const p = world.player;
  if (chain.stagePending) {
    if (isCinematicActive()) return;
    chain.stagePending = false;
    if (chain.resume) resumeFromCheckpoint(world, def);
    else enterStage(world, def, 0);
    if (chain.phase !== 'active') return;
  }
  const st = def.stages[chain.stageIndex];
  const S = chain.stage;
  if (!st || !S) return;
  S.t += dt;
  if (inWindow(def) && !isCinematicActive() && !(def.heist && heistSendingBack())) {
    chain.windowT += dt;
    const W = def.window;
    const wSecs = assistTime(W.secs);
    // the first time it runs out the companion puts the cameras on repeat once more
    if (chain.windowT > wSecs && W.extra && !chain.windowExtended) {
      chain.windowExtended = true;
      chain.windowT = wSecs - W.extra;
      world.addMessage(W.extend, 4.5);
    } else if (chain.windowT > wSecs) { fail(world, def, W.late); return; }
  }
  if (def.eggs && chain.stageIndex >= def.eggs.from) {
    updateEggs(dt, world, def);
    if (chain.phase !== 'active') return;
  }
  // seen by a guard or camera: the stage waits while you're sent back; O held: skip it
  if (def.heist) {
    const h = updateHeist(dt, world, st, S);
    if (h === 'skip') {
      if (st.kind === 'getaway') heistSkipGetaway(world, true);
      missionDebug.complete(world);
      return;
    }
    if (h) return;
  }
  if (def.boatStart && chain.storyBoat && chain.stageIndex <= (def.boatUntil ?? 3) && (chain.storyBoat.wrecked || chain.storyBoat.sinking || !world.vehicles.includes(chain.storyBoat))) {
    fail(world, def, 'de rubberboot is gezonken. Klaas wil hem niet zo terug');
    return;
  }
  if (st.light && updateLightStage(dt, world, def, st, S)) return;
  const v = chain.vehicle;
  const inCar = !!v && p.inVehicle === v;
  // samen spelen (#452): een stap met de vlag iedereen wacht op elke meespeler bij het doel (goto, hold en escape lezen de vlag zelf)
  if (st.iedereen && !GROEPSTAPPEN.has(st.kind) && !groepKlaar(world, st, S.target)) { hint(world, WACHT_OP_ANDEREN); return; }
  switch (st.kind) {
    case 'board':
      if (inCar || meespelerInVoertuig(world, v) || (def.snapStart && !chain.vehicle)) nextStage(world, def);
      break;
    case 'goto': {
      if (!S.target) { nextStage(world, def); break; }
      if (st.pursuer && updatePursuer(dt, world, def, st, S)) break;
      if (st.limit && S.t > st.limit) { fail(world, def, st.late || 'te laat'); break; }
      const gr = st.radius || STAGE_RADIUS;
      const g = doelStand(world, S.target, gr, st.mode, modeOk, st.iedereen), q = g.actor; // een meespeler in het doel is genoeg (met st.iedereen: allemaal)
      if (st.mud && dist(q.x, q.y, S.target.x, S.target.y) < gr * 2) sinkInMud(world, dt, 1.2);
      if (g.status === 'buiten') { S.hold = 0; break; }
      if (g.status === 'modus') { hint(world, MODE_HINT[st.mode] || ''); break; }
      if (g.status === 'wacht') { S.hold = 0; hint(world, WACHT_OP_ANDEREN); break; }
      if (st.stop && q.inVehicle && Math.abs(q.inVehicle.speed) > 2) { S.hold = 0; hint(world, 'Even stilstaan.'); break; }
      if ((S.hold += dt) >= (st.stop || 0)) nextStage(world, def);
      break;
    }
    case 'hold': {
      if (!S.target) { nextStage(world, def); break; }
      if (st.fireworks) updateFireworks(dt, world, def, st, S);
      if (chain.phase !== 'active') break;
      if (st.mud) sinkInMud(world, dt, 4);
      const g = doelStand(world, S.target, st.radius || HOLD_RADIUS, st.mode, modeOk, st.iedereen); // een meespeler bij het doel houdt de klok gaande (met st.iedereen: allemaal)
      if (g.status === 'modus') { hint(world, MODE_HINT[st.mode] || ''); break; }
      if (g.status === 'wacht') hint(world, WACHT_OP_ANDEREN);
      if (g.status !== 'binnen') { S.hold = Math.max(0, S.hold - dt * 0.5); break; }
      S.hold += dt;
      const third = Math.floor(S.hold / st.time * 3);
      if (third > S.said && third < 3) { S.said = third; world.addMessage(st.ticks ? st.ticks[third - 1] : `Klik. Camera ${third} van 3 gaat op zwart.`, 2.4); }
      if (S.hold >= st.time) nextStage(world, def);
      break;
    }
    case 'bake':
      if (updateBakeStage(dt, world, def, st, S)) nextStage(world, def);
      break;
    case 'convoy': {
      const r = updateConvoyStage(dt, world, def, st, S);
      if (r === 'fail') fail(world, def, st.lost || 'de colonne is uiteengevallen');
      else if (r === 'done') nextStage(world, def);
      break;
    }
    case 'fuse':
      if (!S.target) { nextStage(world, def); break; }
      if (p.inVehicle) { hint(world, MODE_HINT.foot || ''); break; }
      if (updateFuse(dt, world, S.target, world.input)) nextStage(world, def);
      break;
    case 'plan':
      if (updatePlanStage(dt, world, st, S, def)) nextStage(world, def);
      break;
    case 'lock':
      if (p.inVehicle) { hint(world, MODE_HINT.foot || ''); break; }
      if (updateLock(dt, world, S.target)) nextStage(world, def);
      break;
    case 'pickpocket':
      if (updatePickpocket(dt, world)) nextStage(world, def);
      break;
    case 'laser':
      if (updateLasers(dt, world, S.target)) nextStage(world, def);
      break;
    case 'crack':
      if (updateCrack(dt, world, S.target)) nextStage(world, def);
      break;
    case 'getaway':
      if (updateGetaway(dt, world, st, S)) {
        if (heistBoat()) chain.vehicle = heistBoat();
        nextStage(world, def);
      }
      break;
    case 'shot':
      if (!S.started) {
        if (isCinematicActive()) break;
        S.started = true;
        playEndingShot(world, st, () => { S.shotDone = true; });
      } else if (S.shotDone) nextStage(world, def);
      break;
    case 'garage': {
      const site = inCar ? garageInside(world) : null;
      if (!site || Math.abs(v.speed) > 1.5) { S.hold = 0; break; }
      if ((S.hold += dt) < 1.2) break;
      repaintVehicle(world, v, RESPRAY_COLORS[Math.floor(Math.random() * RESPRAY_COLORS.length)]);
      world.wanted = 0;
      world.wantedDecayTimer = 0;
      world.addMessage('Nieuwe kleur, nieuwe kans. Gratis. De pliesie kent hem niet meer.', 4);
      nextStage(world, def);
      break;
    }
    case 'escape': {
      if (!S.target) { if (world.wanted === 0 && S.t > 1) nextStage(world, def); break; }
      // H6: lose the police, then moor at the quay (target, within `dock` m, still in the boat)
      const dk = st.dock || STAGE_RADIUS;
      const q = teamActor(world, S.target, (a, d) => d < dk && !!a.inVehicle && !!a.inVehicle.isBoat); // de boot van een meespeler legt aan
      const boat = q.inVehicle && q.inVehicle.isBoat ? q.inVehicle : null;
      const docked = !!boat && dist(q.x, q.y, S.target.x, S.target.y) < dk;
      if (!docked) break;
      if (world.wanted > 0) { hint(world, 'Nog pliesie achter ons. Eerst afschudden, dan pas aanleggen.'); break; }
      boat.speed *= 0.5;
      nextStage(world, def);
      break;
    }
    case 'chase': {
      const t = S.target;
      if (st.race) { updateChaseRace(world, def, st, S); break; }
      if (S.swarm) { if (S.swarm === 'done') stopChaseVehicle(world, def, st); break; }
      if (!t || !world.vehicles.includes(t)) { fail(world, def, st.gone || 'de tankwagen is foetsie'); break; }
      if (t.wrecked || t.disabled) { fail(world, def, st.burned || 'de tankwagen staat in de fik. Zonde van al dat vet'); break; }
      if (st.hijack && p.inVehicle === t) { hijackChase(world, def, st, t); break; }
      const d = afstandMeespeler(world, t.x, t.y); // de dichtstbijzijnde meespeler (#452)
      if (t.parkedRoad) {
        // it does not wait for you for ever: after CHASE_WAIT_MAX s it flees on its own (a chase never waits for the player),
        // plus the time the drive to it takes (M07: the groothandel is 750 m from the start; 6 s was unwinnable)
        if (S.d0 == null) S.d0 = d;
        if (d > st.parked && t.health >= S.hp0 && S.t < chaseWaitMax(S.d0, st)) break;
        t.road = t.parkedRoad;
        t.aiOpts = t.parkedAi;
        t.parkedRoad = null;
        t.planAt = 0;
        S.goAt = S.t;
        if (st.go) world.addMessage(st.go, 4);
      }
      // boxed in: it stands still with you right on it for a moment, and that is a stop as well
      if (st.block) {
        S.blockT = Math.abs(t.speed) < 1 && d < 10 ? (S.blockT || 0) + dt : 0;
        if (S.blockT > 2.5) { if (st.swarm) startSwarm(world, def, st, S, t); else stopChaseVehicle(world, def, st); break; }
      }
      if (st.swarm && st.swarm.close && d < st.swarm.close) S.closeT = (S.closeT || 0) + dt;
      if (st.route) updateChaseRoute(world, st, S, t, dt);
      if (st.swarm && (S.hp0 - t.health >= st.hits / 3 || (S.closeT || 0) >= (st.swarm.closeFor || Infinity) || (S.routeDone && d < (st.swarm.near || 150)))) { startSwarm(world, def, st, S, t); break; }
      if (S.hp0 - t.health >= st.hits) { stopChaseVehicle(world, def, st); break; }
      if (st.toTrain && chaseReachedTrain(world, def, st, S, t, dt)) break;
      if (d > (st.escape || 380) || S.t - (S.goAt || 0) > chaseTime(st)) { fail(world, def, st.lost || 'de tankwagen is ontsnapt, richting Friesland'); break; }
      if (S.hp0 - t.health >= st.hits / 2 && !S.half && !st.swarm) { S.half = true; world.addMessage(st.half || 'Hij slingert! Nog even, de banden zijn bijna op.', 2.5); }
      break;
    }
    case 'boatchase':
      updateBoatChase(dt, world, def, st, S);
      break;
    case 'train': {
      const r = updateFjordTrain(dt, world);
      if (r === 'lost') { fail(world, def, st.lost); break; }
      if (r !== 'caught' && r !== 'taken') break;
      const fv = fjordTrainState() && fjordTrainState().fjord;
      if (fv) adoptVehicle(world, fv, { hero: true });
      world.addMessage(r === 'taken' ? st.taken : st.caught, 4.5);
      nextStage(world, def);
      break;
    }
    case 'plane':
    case 'airgates':
    case 'landplane': {
      const r = updatePlaneStage(dt, world, st, S);
      if (r === 'next') nextStage(world, def);
      else if (r && r.fail) fail(world, def, r.fail);
      break;
    }
    case 'heli':
      updateHeliStage(dt, world, def, st, S);
      break;
    case 'vault':
      if (!S.started) {
        if (isCinematicActive()) break;
        S.started = true;
        const at = S.target || { x: p.x, y: p.y };
        const vlines = st.script && storyDataReady() ? storyLines(st.script.ids, st.script) : st.lines;
        if (!playVaultScene(world, { at, lines: vlines, landing: st.landing, fail: !!st.fail })) { world.addMessage(st.fail ? 'Jelle springt met een polsstok… en ligt in het water.' : 'Jelle springt met een polsstok over de gracht. Moai.', 4); nextStage(world, def); }
      } else if (!isCinematicActive('mission-vault')) nextStage(world, def);
      break;
    case 'scene':
      if (!S.started) {
        if (isCinematicActive()) break;
        S.started = true;
        // the hour of the scene (M11: dusk, then night on the sandbank), set before the shot is made
        if (st.clockTo != null && typeof world.clock === 'number') world.clock = st.clockTo;
        if (!playStageScene(world, st, S)) { if (st.big) world.addMessage(st.big, 4); if (st.warp) warpPlayer(world, st.warp); nextStage(world, def); }
      } else if (!isCinematicActive('mission-scene')) { if (st.warp) warpPlayer(world, st.warp); nextStage(world, def); }
      break;
    case 'pigeon':
      updatePigeonStage(dt, world, def, st, S);
      break;
    case 'rit': {
      const r = updateRit(dt, world, st, S, hint);
      if (r === 'done') nextStage(world, def);
      else if (r && r.fail) fail(world, def, r.fail);
      break;
    }
    case 'timing': {
      // after the presses a stage with vaultJump shows the real pole vault (landing when won, splash when not) before it goes on
      if (S.duelJump) {
        S.duelT = (S.duelT || 0) + dt;
        if (S.duelJump.over || S.duelT > 25) { S.duelJump.dispose(); S.duelJump = null; nextStage(world, def); }
        break;
      }
      const r = updateTiming(dt, world, st, S);
      if (r === 'done') {
        const tag = timingTag(st, S);
        if (tag) (chain.tags = chain.tags || new Set()).add(tag);
        const jump = st.vaultJump ? playDuelJump(world, { at: S.target || { x: p.x, y: p.y }, fail: S.hits < (st.goodAt ?? st.rounds.length) }) : null;
        if (jump) { S.duelJump = jump; S.duelT = 0; jump.done.then(() => { jump.over = true; }); } else nextStage(world, def);
      } else if (r && r.fail) fail(world, def, r.fail);
      break;
    }
    case 'choice': {
      const r = updateChoice(dt, world, st, S);
      if (r === 'done') {
        // an answer can carry a tag: the mission pays and tells its consequence (def.tagAdjust, def.tagRows, st.scriptIf)
        (chain.tags = chain.tags || new Set());
        st.rounds.forEach((rd, k) => { const o = rd.options[S.picks[k]]; if (o && o.tag) chain.tags.add(o.tag); });
        // the number of wrong answers as tags ('<countTag>1' from one wrong answer, '<countTag>2' from two): the intake of M18 gets warier with each
        for (let w = 1; w <= S.wrong; w++) if (st.countTag) chain.tags.add(st.countTag + w);
        nextStage(world, def);
      } else if (r && r.fail) fail(world, def, r.fail);
      break;
    }
    default:
      nextStage(world, def);
  }
}

// Act 5 (M22): the meadow is mud. A car in it slows down; `k` is how hard per second.
function sinkInMud(world, dt, k) {
  const v = world.player.inVehicle;
  if (!v || Math.abs(v.speed) < 0.05) return;
  v.speed *= Math.max(0, 1 - k * dt);
  v.driftX = (v.driftX || 0) * 0.9;
  v.driftY = (v.driftY || 0) * 0.9;
}

// Act 5: the baking round (bakeround.js). The stage is on while you stand in the kitchen or at the stall.
function updateBakeStage(dt, world, def, st, S) {
  const p = world.player;
  const title = st.recipe === 'practice' ? "Oma's keuken: de oefenronde" : 'Gronings Ontzet: bak de eierbal';
  if (!S.bake) S.bake = createBake({ order: st.recipe === 'practice' ? RECIPE_PRACTICE : RECIPE_CONTEST, rounds: st.rounds || 1 });
  if (!S.target) return true;
  const near = dist(p.x, p.y, S.target.x, S.target.y) < (st.radius || HOLD_RADIUS);
  if (!near) { hideBake(); S.shown = false; hint(world, st.farHint || ''); return false; }
  if (!modeOk(p, st.mode)) { hideBake(); S.shown = false; hint(world, MODE_HINT[st.mode] || ''); return false; }
  if (!S.shown) { S.shown = true; showBake(S.bake, title); }
  const res = updateBake(S.bake, world.input, title);
  if (res === 'round') world.addMessage(`Eierbal ${S.bake.round} van ${S.bake.rounds} is goud. Door!`, 2);
  else if (res === 'wrong' || res === 'redo') world.addMessage(S.bake.last, 3);
  if (res === 'done') {
    hideBake();
    const bad = S.bake.wrongs + S.bake.redos * 3;
    if (st.recipe === 'contest') chain.bakeTier = bad === 0 ? 'top' : bad < 3 ? 'goed' : 'mager';
    world.addMessage(st.recipe === 'contest' ? (bad === 0 ? 'Alle eierballen zijn goud, geen enkele mislukt. De jury gaat dit proeven.' : bad < 3 ? 'De eierballen zijn goud. Een paar mislukten, de jury merkt het niet.' : 'De eierballen zijn goud, na veel gedoe. De jury heeft het gezien.') : 'Alle eierballen zijn goud.', 3);
    return true;
  }
  return false;
}

// Act 5 (M23): the column. The first convoy stage brings the friends (and Jelle's limo after limoAfter seconds);
// each stage ends when the leader is at the target and most of the column is with him. 'fail' when it falls apart.
function updateConvoyStage(dt, world, def, st, S) {
  if (!chain.convoy) chain.convoy = startConvoy(world);
  const c = chain.convoy;
  // the ally chosen at the start (M23) can hold Jelle's limo back for a while (limoAfterIf: { tag: seconds })
  const held = st.limoAfterIf && Object.entries(st.limoAfterIf).find(([tag]) => choiceOn(tag));
  const limoAfter = held ? held[1] : st.limoAfter;
  if (!S.limoDone && limoAfter && S.t > limoAfter) { S.limoDone = true; if (spawnLimo(world, c)) world.addMessage('Jelles limo komt op de colonne af.', 3.5); }
  const r = updateConvoy(dt, world, c, (text) => world.addMessage(text, 2.5, { key: 'colonne-lag' }));
  if (r && r.split) { world.addMessage(`${r.split} is te ver achter: de colonne valt uiteen.`, 3.5); return 'fail'; }
  const v = chain.vehicle;
  const p = world.player;
  if (v && p.inVehicle !== v && dist(p.x, p.y, v.x, v.y) > 12) { hint(world, st.carHint || ''); return null; }
  if (!S.target || dist(p.x, p.y, S.target.x, S.target.y) >= (st.radius || STAGE_RADIUS)) return null;
  const sc = convoyStatus(world, c);
  if (sc.total && sc.near < Math.ceil(sc.total * 0.7)) { hint(world, `Wacht op de colonne: ${sc.near} van ${sc.total} bij elkaar.`); return null; }
  return 'done';
}

function updatePigeonStage(dt, world, def, st, S) {
  const p = world.player;
  const f = getPigeonFlight();
  if (!S.flying) {
    if (isCinematicActive()) return;
    if (p.inVehicle) { hint(world, 'Uitstappen bij de duiven. Een duif rijdt geen auto.'); return; }
    const spot = S.target;
    if (startPigeonMode(world, spot ? { x: spot.x, y: spot.y } : null)) { S.flying = true; return; }
    if (S.t > 8) fail(world, def, 'de duiven wilden vandaag niet meewerken');
    return;
  }
  if (!f) {
    if (S.spotted.size < S.targets.length) fail(world, def, 'je werd weer mens voordat alles op de foto stond');
    return;
  }
  if (f.intro) return;
  if (st.gulls && (S.gullT -= dt) <= 0) {
    S.gullT = st.gulls[0] + Math.random() * (st.gulls[1] - st.gulls[0]);
    summonDiveGull(st.gullText);
  }
  S.targets.forEach((t, k) => {
    if (!t || S.spotted.has(k)) return;
    const high = Number.isFinite(t.z) ? Math.abs(f.z - t.z) < 8 : f.z - f.ground < 80;
    const near = dist(f.x, f.y, t.x, t.y) < (t.r || SPOT_RADIUS) && high;
    S.holds[k] = near ? (S.holds[k] || 0) + dt : 0;
    if (S.holds[k] >= (st.spotTime || SPOT_TIME)) {
      S.spotted.add(k);
      if (st.flag) cutFlagRope(k);
      const text = st.verb ? st.verb.replace('%s', t.label) : `Klik! ${t.label} staat op de foto`;
      world.addMessage(`${text} (${S.spotted.size}/${S.targets.length})`, 2.6);
    }
  });
  if (S.spotted.size >= S.targets.filter(Boolean).length) {
    stopPigeonMode(world);
    nextStage(world, def);
  }
}

// --- debug / test hooks (story dev mode and the automated story test) -----------

export const missionDebug = {
  state: () => (chain ? {
    index: chain.index, phase: chain.phase, stage: chain.stageIndex, wp: chain.wpIndex, completed: [...chain.completed],
    stageInfo: chain.stage ? { t: Math.round(chain.stage.t * 10) / 10, flying: chain.stage.flying, target: chain.stage.target && { x: Math.round(chain.stage.target.x), y: Math.round(chain.stage.target.y) } } : null,
    player: worldRef && { x: Math.round(worldRef.player.x), y: Math.round(worldRef.player.y), inVehicle: !!worldRef.player.inVehicle },
  } : null),
  // starts mission i right here, requirements and the trigger ring aside
  start(world, i) {
    if (!chain || !chain.defs[i] || chain.phase === 'active') return false;
    const def = chain.defs[i];
    chain.index = i;
    const p = world.player;
    if (!p.inVehicle && dist(p.x, p.y, def.start.x, def.start.y) > 30) { p.x = def.start.x; p.y = def.start.y; }
    // a lazyStart mission needs road data the streaming has not brought yet: look wider for it, the cheat has the player on the spot
    if (def.lazyStart && !def.start.road) {
      const far = world.map.nearestRoadPoint(def.start.x, def.start.y, 600, true);
      if (far && far.road) Object.assign(def.start, far);
    }
    forceStart = true;
    try { startMission(world, def); } finally { forceStart = false; }
    syncPub(world);
    return chain.phase === 'active';
  },
  // wins whatever stage the mission is in (a scene, a vault, the intro still pending): independent of the path
  // the player took, so the spelbot's cheat ladder ends here (#186)
  win(world) {
    if (!chain || chain.phase !== 'active') return false;
    const def = chain.defs[chain.index];
    if (world.pigeonMode) stopPigeonMode(world);
    chain.stagePending = false;
    chain.resume = null;
    if (isCinematicActive()) skipCinematic();
    succeed(world, def);
    syncPub(world);
    return true;
  },
  lose(world) {
    if (!chain || chain.phase !== 'active') return false;
    fail(world, chain.defs[chain.index], 'afgebroken in de testmodus');
    syncPub(world);
    return true;
  },
  // finishes the current objective: the next stage, checkpoint or stop
  complete(world) {
    if (!chain || chain.phase !== 'active') return false;
    const def = chain.defs[chain.index];
    if (def.type === 'stages') {
      if (chain.stagePending) { chain.stagePending = false; enterStage(world, def, 0); }
      const cur = def.stages[chain.stageIndex];
      // a cutscene stage plays by itself (skippable); don't jump past it
      if (cur && (cur.kind === 'scene' || cur.kind === 'vault' || cur.kind === 'shot')) { syncPub(world); return true; }
      if (cur && (cur.kind === 'plane' || cur.kind === 'airgates' || cur.kind === 'landplane') && debugCompletePlaneStage(world, cur, chain.stage)) { syncPub(world); return true; }
      if (cur && cur.kind === 'getaway') {
        heistSkipGetaway(world, false);
        if (heistBoat()) chain.vehicle = heistBoat();
      }
      if (cur && cur.kind === 'chase' && cur.toTrain && chain.stage && chain.stage.target && fjordLoadPoint()) {
        // it makes it to the train: the Fjord goes up the ramp now
        loadFjordNow(world, chain.stage.target);
        nextStage(world, def);
        syncPub(world);
        return true;
      }
      if (cur && cur.kind === 'train') {
        // there in time: the train stops at the crossing, the Fjord is back on the street
        const c = fjordCrossing();
        const p = world.player;
        if (c && !world.pigeonMode) {
          const pv = p.inVehicle;
          if (pv) { pv.x = c.x + 12; pv.y = c.y + 6; pv.speed = 0; }
          p.x = c.x + 12; p.y = c.y + 6;
        }
        updateFjordTrain(0, world);
        const fv = catchFjordTrainNow(world);
        if (fv) adoptVehicle(world, fv, { hero: true });
        nextStage(world, def);
        syncPub(world);
        return true;
      }
      if (cur && cur.kind === 'chase') {
        // flat tyres now, and the player right next to the stopped vehicle
        const t = chain.stage && chain.stage.target;
        stopChaseVehicle(world, def, cur);
        const p = world.player;
        if (t && !world.pigeonMode) {
          const pv = p.inVehicle;
          const x = t.x - Math.cos(t.angle) * 10, y = t.y - Math.sin(t.angle) * 10;
          if (pv) { pv.x = x; pv.y = y; pv.speed = 0; }
          p.x = x; p.y = y;
        }
        syncPub(world);
        return true;
      }
      if (cur && cur.kind === 'fuse') { closeFuse(); camerasOff(); }
      if (cur && cur.kind === 'boatchase' && chain.stage && chain.stage.boat) chain.stage.boat.speed = 0;
      if (cur && cur.kind === 'heli' && isHeliRunActive()) abortHeliRun();
      if (chain.phase !== 'active') { syncPub(world); return true; }
      if (chain.stage && def.stages[chain.stageIndex] && def.stages[chain.stageIndex].kind === 'pigeon' && world.pigeonMode) stopPigeonMode(world);
      if (world.wanted) { world.wanted = 0; world.wantedDecayTimer = 0; }
      if (chain.phase === 'active') nextStage(world, def);
    } else if ((def.type === 'checkpoint' || def.type === 'boat') && !chain.race) {
      // all waypoints reached, the outro waits for the last toast (updateMissions)
      if (!chain.finishPending) reachCheckpoint(world, def);
    } else if (def.type === 'deliver' && chain.stuntPhase) {
      // the stunt part counts as done: on to the delivery
      stopStunt(world);
      chain.stuntPhase = false;
    } else if (def.type === 'deliver' && nextStop(def)) {
      chain.stopIndex++;
    } else succeed(world, def);
    syncPub(world);
    return true;
  },
  // moves the player (and whatever they drive) to the current marker
  teleport(world) {
    if (!chain) return false;
    const m = chain.pub.marker;
    const p = world.player;
    if (world.pigeonMode) return false;
    const v = p.inVehicle;
    if (v) { v.x = m.x; v.y = m.y; v.speed = 0; }
    p.x = m.x; p.y = m.y;
    world.teleported = world.time;
    return true;
  },
  // Samen spelen (#452): the mission carries on at the same place in the chain when the game changes hands. Starts mission i
  // and enters stage `deel` (a waypoint for a checkpoint run) with the time that was left; `plek: false` leaves the player
  // where he stands, so a guest who becomes host does not jump back to the start of the mission.
  // Best effort by design: the state a stage builds for itself (a scene, the vault, the heist doors) starts fresh.
  hervat(world, i, deel = 0, tijd = null, { plek = false } = {}) {
    if (!chain || !chain.defs[i] || chain.phase === 'active') return false;
    const p = world.player, was = p && Number.isFinite(p.x) ? { x: p.x, y: p.y } : null;
    const terug = () => { if (!plek && was && p && !p.inVehicle) { p.x = was.x; p.y = was.y; } };
    if (!this.start(world, i)) { terug(); return false; }
    terug();
    const def = chain.defs[chain.index];
    let k = Math.max(0, Math.floor(Number(deel) || 0));
    // a plan screen or a menu stage builds its own state and cannot be entered cold: resume at the stage before it
    while (k > 0 && def.stages && def.stages[k] && (def.stages[k].kind === 'plan' || def.stages[k].kind === 'choice')) k--;
    if (def.type === 'stages' && k > 0 && def.stages && def.stages[k]) {
      chain.stagePending = false;
      if (def.heist || def.fjordTrain) enterStage(world, def, 0); // what those stages build for themselves stands from stage 0
      if (chain.phase === 'active') enterStage(world, def, k);
    } else if ((def.type === 'checkpoint' || def.type === 'boat') && k > 0 && def.waypoints && k < def.waypoints.length) {
      chain.wpIndex = k;
    }
    if (chain.phase === 'active' && Number.isFinite(tijd) && tijd > 0 && Number.isFinite(chain.timeLeft)) chain.timeLeft = Math.max(tijd, 15);
    syncPub(world);
    return chain.phase === 'active';
  },
};

// The 3D markers live in missionmarker3d.js (a leaf, so scene3d.js need not import this module).
export { MARKER_COLOR_ACTIVE, buildMissionMarker3D, updateMissionMarker3D, buildWaypointDotMesh3D } from './missionmarker3d.js';
