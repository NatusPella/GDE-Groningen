import { wantedPhase } from './wantedstate.js';
import { getMissionLayer, updateMissionNotices } from './missionmaplive.js';
import { missionMinimapScale, selectMiniItems } from './missionmap.js';
import { drawMissionLayerIcon, drawLayerAreas, drawLayerLines } from './missionmapdraw.js';
import { pointInPolygon as pointInPoly } from './util.js';
import { dualHtml } from './subtitles.js';
import { simLevel } from './simload.js';
import { getGaragesForRender } from './garages.js';
import { getHomeForRender, getHomeGarageForRender, getHomeMooringForRender, getHomeHelipadForRender } from './home.js';
import { minimapShows } from './mapfilters.js';
import { mapCategory, mapFillColor, FLAT_INK, haloRim, HALO_DARK, HALO_LIGHT, mapPriority, miniIconScale, iconGapPx } from './mapicons.js';
import { facilitiesOf } from './facilities.js';
import { getHorecaForRender } from './horeca.js';
import { getShopsForRender, drawShopMapIcon, drawShopGlyph, SHOP_TYPES, storyTargetShop, drawStoryShopRing } from './shops.js';
import { getOwnedVehiclesForMap } from './ownedvehicles.js';
import { getPigeonSpotsForRender, drawPigeonMapIcon } from './pigeonspots.js';
import { getHeliSpotsForRender, drawHeliMapIcon, getHeliRunMarks } from './helirun.js';
import { getPadelSpotsForRender, drawPadelMapIcon } from './padel.js';
import { activityMapIcons, drawActivityMapIcon } from './activities.js';
import { getPostgameSpotsForRender, drawPostgameMapIcon } from './postgame.js';
import { getStationsForRender, drawStationMapIcon } from './stationtravel.js';
import { getSideJobSpotsForRender, drawSideJobMapIcon, JOB_TARGET_COLOR } from './sidejobs.js';
import { vehicleDisplayName } from './vehiclenames.js';
import { findEnterableVehicle, HERO_CAR_MODEL } from './vehicle.js';
import { tickLowHealth } from './lowhealth.js';
import { cinematicAllowsDamageFx, isBannerUp, isCinematicActive, wijkBlurb } from './cinematics.js';
import { isMuted, engineReadout } from './audio.js';
import { gearboxReadout } from './gearbox.js';
import { drawRailsOnMap, drawTrainsOnMap } from './railway.js';
import { drawCountryMinimap, villageLabels, syncMapPhase } from './countrymap.js';
import { MINI_PALETTE as MINI_STYLE, EMPHASIS, seaStyle, miniRoadStyle } from './mapstyle.js';
import { drawSea, drawOutside, regionLabels, regionEdgeLabels, areaNameAt, REGIONS } from './regions.js';
import { borderPlaceLabels } from './borderplaces.js';
import { worldPlaceLabels, worldPlacesReady } from './worldplaces.js';
import { provinceMapOn } from './provincemap.js';
import { edgeDistance } from './countryfield.js';
import { streetAt as roadStreetAt } from './tileplace.js';
import { ommelandArea } from './ommelandplace.js';
import { ommelandMapSpots, drawOmmelandMapIcon } from './ommelandmap.js';
import { VILLAGES } from './ommelandlines.js';
import { getActiveRoute, getRouteAhead, getRoutes, getUserWaypoint, formatDistance } from './routing.js';
import { storyWaiting, missionOnMap } from './goal.js';
import { setGhostBar, ring, pop } from './motion.js';
import { renderSnapshot, PORTRAIT_ANGLE } from './vehiclepreview.js';
import { TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { initPrompts, updatePrompts, hintCount } from './prompts.js';
import { hudPixelRatio, sizeSquareCanvas, getUiScale, onUiScaleChange } from './uiscale.js';
import { initCards, updateCards } from './hudcards.js';
import { markerColors, onPaletteChange } from './a11y.js';
import { drawMissionGlyph } from './missionicons.js';
import { decideHud, zones, hudNow, P3, PLACE_SHOW, E_SHOW, DEFER_MAX, GPS_NEAR } from './hudrules.js';
import { vehicleKind, speedoLook, meterLevel, hudEdge, distanceOwner, vehicleLabelOwner } from './hudlook.js';
import { nextTurn, turnText, etaText } from './hudgps.js';
import { travelModeOf, roadAllowed, minimapScale, northUp, MINIMAP_MODE } from './roadaccess.js';
import { hudDate } from './hudcalendar.js';
import { LANDMARK_LINES } from './placelines.js';
import { townProfile } from './stadsprofielen.js';
import { getSettings } from './settings.js';
import { heldBack } from './narrative.js';
import { isPauseMenuOpen } from './pausestate.js';
import { isOverlayHeld } from './overlayhold.js';
// portraits share the HUD's green (DESIGN_SYSTEM: no blue accents); speaker
// colours stay in subtitles
const HUD_ACCENT = '#3fc97a';

// the minimap's square, in HUD px (CSS --mm-size follows it)
const MINIMAP_SIZE = 250;
let mmScale = 1.45;
let mmSkip = 0, mmDt = 0;
let mmMode = 'lopen';
let mmRot = null;

// Genre convention: purple for your own waypoint, yellow for missions, orange for
// side jobs, pink for care (food when hurt, a garage for your own damaged ride)
// filled from the palette (a11y.js: the colour-blind settings) below; kept
// as one object so importers always read the current colours
export const ROUTE_COLORS = { user: '#c068ff', mission: '#e8c93a', job: '#ff9a3c', care: '#ff5fb4' };
// Each route kind also has its own pattern down the middle of the line and
// its own mark in the minimap's edge arrow, so they never differ by colour
// alone: verhaal/missie solid, jouw doel dashes, klus dots, opknappen dash-dot.
const ROUTE_DASH = { mission: null, user: [2.2, 1.6], job: [0.01, 1.7], care: [2.6, 1.2, 0.01, 1.2] };
export const routeLabel = (r) => (r.kind === 'user' ? 'Doel' : r.kind === 'job' ? 'Klus' : r.kind === 'care' ? (r.target && r.target.why === 'repair' ? 'Garage' : 'Opknappen') : 'Missie');

let els = null;

const STAR_PATH = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z';
const TURN_ICON = {
  rechts: '<path d="M7 20V10a3 3 0 0 1 3-3h8"/><path d="M14 3l4 4-4 4"/>',
  links: '<path d="M17 20V10a3 3 0 0 0-3-3H6"/><path d="M10 3L6 7l4 4"/>',
  recht: '<path d="M12 20V6"/><path d="M8 10l4-4 4 4"/>',
};

// The GPS card where there is no turn to give: the train (where to get off,
// where to change) and the air (altitude advice, the landing spot).
function modeCard(route, mode) {
  if (!route || route.remaining <= 30) return null;
  if (mode === 'ov' && route.uitstappen) {
    const change = route.changes && route.changes[0];
    return { title: `Uitstappen bij ${route.uitstappen.replace(/^Groningen\s+/, '')}`, sub: change ? `Overstappen bij ${change.replace(/^Groningen\s+/, '')}` : '' };
  }
  if (mode === 'lucht' && route.alt) return { title: `Hoogte ± ${route.alt} m`, sub: route.landing ? `Landen: ${route.landing.name}` : '' };
  return null;
}
const RPM_ARC = 'M30 160 A85 85 0 1 1 170 160';
// the red zone starts at this share of the arc
const RPM_RED_AT = 85;

export function initHud(world) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./hud_panel.css', import.meta.url).href;
  document.head.appendChild(link);

  const root = document.getElementById('hud');

  const damage = document.createElement('div');
  damage.className = 'hud-damage';
  root.insertBefore(damage, root.firstChild);

  // zone C: clock and date, stars, the search, money, weapon
  const topRight = document.createElement('div');
  topRight.className = 'hud-top-right';
  topRight.innerHTML =
    '<div class="hud-clock" role="timer" aria-label="Tijd in het spel"><span class="hud-special" hidden></span><span class="hud-date"></span><b class="hud-time"></b></div>' +
    '<div class="hud-wanted" role="img"></div>' +
    '<div class="hud-search" hidden><span>Uit zicht</span><i role="img" aria-label="Zoekgebied"><i></i></i></div>' +
    '<div class="hud-moneyrow"><span class="hud-money-delta"></span><span class="hud-money"></span></div>' +
    '<div class="hud-weapon"></div>';
  root.appendChild(topRight);

  // zone H: speed, gear, revs (the vehicle's damage is in F)
  const speedo = document.createElement('div');
  speedo.className = 'hud-speedo';
  speedo.innerHTML = '<div class="sp-main"><div class="sp-gears" role="img" aria-label="Versnelling"></div><b class="sp-val">0</b><span class="sp-unit">km/u</span></div>' +
    `<svg class="sp-rpm" viewBox="0 0 200 200" role="img" aria-label="Toerental"><path class="rpm-bg" d="${RPM_ARC}"/><path class="rpm-zone" d="${RPM_ARC}" pathLength="100" stroke-dasharray="${100 - RPM_RED_AT} 100" stroke-dashoffset="${-RPM_RED_AT}"/>` +
    `<path class="rpm-fill" d="${RPM_ARC}" pathLength="100" stroke-dasharray="0 100"/></svg>`;
  root.appendChild(speedo);

  const vehName = document.createElement('div');
  vehName.className = 'hud-vehname';
  vehName.setAttribute('aria-live', 'polite');
  vehName.innerHTML = '<div class="vn-text"><small></small><b></b></div><svg class="vn-ic" viewBox="0 0 24 24" aria-hidden="true"></svg>';
  root.appendChild(vehName);

  // zone B: the GPS card (next turn, distance, a mission timer) and the place name
  const gps = document.createElement('div');
  gps.className = 'hud-gps';
  gps.hidden = true;
  gps.innerHTML = '<svg class="gps-arrow" viewBox="0 0 24 24" aria-hidden="true"></svg><div class="gps-txt"><b></b><span></span></div>' +
    '<i class="gps-sep"></i><div class="gps-dist"><b></b><span></span></div><i class="gps-sep gps-tsep"></i><div class="gps-timer"><span>Tijd</span><b></b></div>';
  root.appendChild(gps);

  const place = document.createElement('div');
  place.className = 'hud-place';
  place.setAttribute('aria-live', 'polite');
  place.innerHTML = '<div class="pl-kick"><i></i><span></span><i></i></div><b class="pl-name"></b><span class="pl-line"></span>';
  root.appendChild(place);

  // zone G: the objective, one at a time, over the subtitles
  const mission = document.createElement('div');
  mission.className = 'hud-mission';
  mission.setAttribute('aria-live', 'polite');
  mission.innerHTML = '<svg class="hud-obj-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l9 10-9 10-9-10z"/></svg>' +
    '<div class="hud-obj-text"><div class="hud-mission-label"></div><div class="hud-mission-progress"></div></div><span class="hud-obj-dist"></span>';
  root.appendChild(mission);

  // zone E: the radio station (an achievement goes first, hudcards.js)
  const nowPlaying = document.createElement('div');
  nowPlaying.className = 'hud-nowplaying';
  nowPlaying.setAttribute('aria-live', 'polite');
  nowPlaying.innerHTML = '<span class="np-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M5 12a7 7 0 0 1 14 0M2 12a10 10 0 0 1 20 0"/></svg></span>' +
    '<div><small>G-Music</small><b class="np-title"></b><span class="np-artist"></span></div>';
  root.appendChild(nowPlaying);

  const race = document.createElement('div');
  race.className = 'hud-race';
  race.hidden = true;
  race.innerHTML =
    '<div class="hr-pos"><b></b><span></span></div>' +
    '<div class="hr-row" data-k="time"><span>TIJD</span><b></b></div>' +
    '<div class="hr-row" data-k="left"><span>RESTEREND</span><b></b></div>' +
    '<div class="hr-row" data-k="lap"><span>RONDE</span><b></b></div>' +
    '<div class="hr-row" data-k="cp"><span>CONTROLEPUNT</span><b></b></div>' +
    '<div class="hr-row" data-k="best"><span>RECORD</span><b></b></div>';
  root.appendChild(race);

  const cards = initCards(world, root);

  // zone F: the minimap, the street, you (health, stamina, the vehicle's damage)
  const mmWrap = document.createElement('div');
  mmWrap.className = 'hud-minimap-wrap';
  const mmCanvas = document.createElement('canvas');
  mmWrap.appendChild(mmCanvas);
  root.appendChild(mmWrap);

  const fcol = document.createElement('div');
  fcol.className = 'hud-fcol';
  root.appendChild(fcol);

  const location = document.createElement('div');
  location.className = 'hud-location';
  location.innerHTML = '<div class="hud-street"></div><div class="hud-district"></div>';
  fcol.appendChild(location);

  const topLeft = document.createElement('div');
  topLeft.className = 'hud-top-left';
  topLeft.innerHTML =
    '<div class="hud-id">' +
      '<div class="hud-portrait" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="15" r="7.2"/><path class="hair"/><path d="M6 40c1-9 7-13.5 14-13.5S33 31 34 40z"/></svg><img alt=""></div>' +
      '<div class="hud-id-main">' +
        '<div class="hud-name-row"><div class="hud-character"></div><span class="hud-mate"><span class="hud-mate-pic" aria-hidden="true"><img alt=""></span><span class="hud-mate-txt"></span></span><div class="hud-status">' +
          '<span class="hud-chip drunk" role="status" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h11l-1.3 15.2A3 3 0 0 1 12.7 21h-2.4a3 3 0 0 1-3-2.8zM7.4 7.5h8.2"/></svg>Aangeschoten</span>' +
          '<span class="hud-chip hud-mute" role="status" aria-label="Geluid uit" title="Geluid uit (U)" hidden>🔇</span>' +
        '</div></div>' +
        '<div class="hud-meter hp" role="meter" aria-label="Gezondheid" aria-valuemin="0" aria-valuemax="100"><div class="hud-bar"><div class="hud-bar-ghost"></div><div class="hud-bar-fill health"></div></div><b></b></div>' +
        '<div class="hud-meter ar" hidden role="meter" aria-label="Bescherming" aria-valuemin="0" aria-valuemax="100"><div class="hud-bar"><div class="hud-bar-ghost"></div><div class="hud-bar-fill armor"></div></div><b></b></div>' +
        '<div class="hud-meter st" hidden role="meter" aria-label="Uithoudingsvermogen" aria-valuemin="0" aria-valuemax="100"><div class="hud-bar"><div class="hud-bar-fill stamina"></div></div></div>' +
        '<div class="hud-meter veh" hidden role="meter" aria-label="Staat van het voertuig" aria-valuemin="0" aria-valuemax="100"><span class="veh-name"></span><div class="hud-bar"><div class="hud-bar-ghost"></div><div class="hud-bar-fill vehicle"></div></div></div>' +
      '</div>' +
    '</div>';
  fcol.appendChild(topLeft);

  els = {
    root,
    character: topLeft.querySelector('.hud-character'),
    healthFill: topLeft.querySelector('.health'),
    armorFill: topLeft.querySelector('.armor'),
    staminaFill: topLeft.querySelector('.stamina'),
    vehFill: topLeft.querySelector('.vehicle'),
    hpRow: topLeft.querySelector('.hud-meter.hp'),
    arRow: topLeft.querySelector('.hud-meter.ar'),
    stRow: topLeft.querySelector('.hud-meter.st'),
    vehRow: topLeft.querySelector('.hud-meter.veh'),
    vehLabel: topLeft.querySelector('.veh-name'),
    hpNum: topLeft.querySelector('.hud-meter.hp b'),
    arNum: topLeft.querySelector('.hud-meter.ar b'),
    portrait: topLeft.querySelector('.hud-portrait'),
    portraitImg: topLeft.querySelector('.hud-portrait img'),
    you: topLeft,
    mate: topLeft.querySelector('.hud-mate'),
    mateImg: topLeft.querySelector('.hud-mate img'),
    mateTxt: topLeft.querySelector('.hud-mate-txt'),
    mateKey: '', portraitKey: '', portraitT: 0,
    drunk: topLeft.querySelector('.hud-chip.drunk'),
    idKey: '', hpKey: '', arKey: '', stKey: '', vehKey: '',
    mute: topLeft.querySelector('.hud-mute'),
    topRight,
    wanted: topRight.querySelector('.hud-wanted'),
    search: topRight.querySelector('.hud-search'),
    searchBar: topRight.querySelector('.hud-search i i'),
    clock: topRight.querySelector('.hud-clock'),
    special: topRight.querySelector('.hud-special'),
    date: topRight.querySelector('.hud-date'),
    time: topRight.querySelector('.hud-time'),
    moneyRow: topRight.querySelector('.hud-moneyrow'),
    money: topRight.querySelector('.hud-money'),
    moneyDelta: topRight.querySelector('.hud-money-delta'),
    weapon: topRight.querySelector('.hud-weapon'),
    damage,
    speedo,
    speedoValue: speedo.querySelector('.sp-val'),
    gears: speedo.querySelector('.sp-gears'),
    rpmFill: speedo.querySelector('.rpm-fill'),
    rpmSvg: speedo.querySelector('.sp-rpm'),
    speedoKey: '', gearKey: '', rpmKey: '',
    gps,
    gpsArrow: gps.querySelector('.gps-arrow'),
    gpsTitle: gps.querySelector('.gps-txt b'),
    gpsSub: gps.querySelector('.gps-txt span'),
    gpsDist: gps.querySelector('.gps-dist b'),
    gpsEta: gps.querySelector('.gps-dist span'),
    gpsTimer: gps.querySelector('.gps-timer b'),
    gpsKey: '',
    place,
    placeKick: place.querySelector('.pl-kick span'),
    placeName: place.querySelector('.pl-name'),
    placeLine: place.querySelector('.pl-line'),
    mission,
    vehName,
    missionLabel: mission.querySelector('.hud-mission-label'),
    missionProgress: mission.querySelector('.hud-mission-progress'),
    missionDist: mission.querySelector('.hud-obj-dist'),
    locationEl: location,
    district: location.querySelector('.hud-district'),
    street: location.querySelector('.hud-street'),
    fcol,
    cards,
    race,
    raceRows: Object.fromEntries([...race.querySelectorAll('.hr-row')].map((r) => [r.dataset.k, r])),
    racePos: race.querySelector('.hr-pos'),
    nowPlaying,
    npStation: nowPlaying.querySelector('small'),
    npArtist: nowPlaying.querySelector('.np-artist'),
    npTitle: nowPlaying.querySelector('.np-title'),
    npShown: null,
    mmWrap,
    mmCanvas,
    mmCtx: mmCanvas.getContext('2d'),
    vis: {},
  };
  initPrompts(root);
  fitEdge(root);
  onUiScaleChange(() => fitEdge(root));
  watchRightStack(root, topRight, race);
  watchInput();
}

// The HUD's margin to the screen edge: title-safe on a TV, tight on 720p (hudlook.js)
function fitEdge(root) {
  root.style.setProperty('--hud-edge', hudEdge(window.innerWidth, window.innerHeight, getUiScale()) + 'px');
}

// The right column flows under the top-right block: the race panel sits just
// below it and the story phone (storycontact.js) below both, via
// --hud-tr-bottom and --hud-stack-top (HUD px, so the uiscale zoom holds).
function watchRightStack(root, topRight, race) {
  if (typeof ResizeObserver === 'undefined') return;
  const GAP = 8;
  const place = () => {
    const trBottom = topRight.offsetTop + topRight.offsetHeight;
    const stack = race.hidden ? trBottom : trBottom + GAP + race.offsetHeight;
    root.style.setProperty('--hud-tr-bottom', `${trBottom}px`);
    root.style.setProperty('--hud-stack-top', `${stack + GAP + 2}px`);
  };
  const ro = new ResizeObserver(place);
  ro.observe(topRight);
  ro.observe(race);
  place();
}

// Restarts a CSS animation: the class goes off now and back on next frame,
// so the style recalc in between restarts it. (Reading offsetWidth instead
// forced a full layout in the middle of the frame: 2-10 ms on a busy HUD.)
function restartClass(el, cls, still = () => true) {
  el.classList.remove(cls);
  requestAnimationFrame(() => { if (still()) el.classList.add(cls); });
}

const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };

const VEH_ICONS = {
  car: '<path d="M3.5 15.5v-3l2-4.6A2 2 0 0 1 7.3 6.7h9.4a2 2 0 0 1 1.8 1.2l2 4.6v3z"/><path d="M6 11.5h12" class="ln"/><circle cx="7.3" cy="16.3" r="1.9"/><circle cx="16.7" cy="16.3" r="1.9"/>',
  bus: '<rect x="3.5" y="4.5" width="17" height="12" rx="2"/><path d="M3.5 10h17" class="ln"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  bike: '<circle cx="6" cy="15.5" r="3.6" class="ln"/><circle cx="18" cy="15.5" r="3.6" class="ln"/><path d="M6 15.5l4-6.5h5.5L18 15.5M10 9l2.8 6.5h2.2M13.5 6.5h2.5" class="ln"/>',
  scooter: '<circle cx="6" cy="16.5" r="2.6" class="ln"/><circle cx="18" cy="16.5" r="2.6" class="ln"/><path d="M6 16.5h7.5l2-9.5h2.5M9 13h6" class="ln"/>',
  boat: '<path d="M2.5 14.5h19l-3 5h-13z"/><path d="M11.5 3v10M11.5 4.5l6 8h-6" class="ln"/>',
  horse: '<path d="M5 19v-5.5l1.5-3.5h7l2.5-4 1.5-1.5 1 1.5 1.5 2.5-1 1.2-2-.7-1.5 2.5V19M8 14v5M14 14v5" class="ln"/><path d="M6.5 10l-2.5 2.5" class="ln"/>',
  heli: '<path d="M3 6h16M11 6v3" class="ln"/><path d="M5.5 13a4.5 3.5 0 0 1 9 0v1.5h-9z"/><path d="M14.5 12.5h6.5M20 10v4.5M6 19h8M8 16v3M12 16v3" class="ln"/>',
};

// Genre convention: the model name shows for a moment when you get into a vehicle
let vehNameFor = null;
let vehNameTimer = 0;
function updateVehicleName(dt, world) {
  const v = world.player.inVehicle || null;
  if (v !== vehNameFor) {
    vehNameFor = v;
    if (v) {
      const { make, model } = vehicleDisplayName(v);
      els.vehName.querySelector('small').textContent = make;
      els.vehName.querySelector('b').textContent = model;
      els.vehName.querySelector('.vn-ic').innerHTML = VEH_ICONS[v.isHeli ? 'heli' : v.isBoat ? 'boat' : v._mount === 'horse' ? 'horse' : v.isBike ? 'bike' : v.isScooter ? 'scooter' : v.isBus ? 'bus' : 'car'];
      vehNameTimer = 4.5;
      restartClass(els.vehName, 'on', () => vehNameFor === v);
    } else {
      vehNameTimer = 0;
    }
  }
  els.vehRow.classList.toggle('no-label', vehicleLabelOwner({ nameCardVisible: vehNameTimer > 0 }) === 'card');
  if (vehNameTimer > 0) {
    vehNameTimer -= dt;
    if (vehNameTimer <= 0) els.vehName.classList.remove('on');
  } else if (!v) els.vehName.classList.remove('on');
}

export function updateHud(dt, world) {
  sense(dt, world);
  updateVehicleName(dt, world);
  updateCharacter(dt, world);
  updateBars(world);
  els.mute.hidden = !isMuted();
  updateWanted(world);
  updateMoneyWeapon(dt, world);
  updateClock(world);
  updateDamage(dt, world);
  updateSpeedo(world);
  updateSpeedoPrefetch(dt, world);
  updateMission(world);
  updateGps(dt, world);
  updatePlace(dt, world);
  updateRaceHud(world);
  updateCards(dt, world);
  updateNowPlaying(dt, world);
  updateLocation(dt, world);
  updatePrompts(dt, world);
  updateVisibility(dt, world);
  // very CPU-bound (simload.js level 2): the minimap redraws every second
  // frame, its zoom easing over the time in between. It turns with the
  // player, so a lower rate shows as stutter; the whole HUD costs ~1 ms.
  mmDt += dt;
  if (mmSkip-- > 0) return;
  // a redraw that costs a lot (vector map of the whole province) gets at most a quarter of the time: measured on
  // hoog the minimap took 5 to 14% of the busy main thread (docs/PERF-METING-2026-10-19.md)
  const mmNow = performance.now();
  if (mmNow - mmLastAt < Math.max(MM_MIN_INTERVAL_MS, mmCostMs * 4)) return;
  mmSkip = simLevel() >= 2 ? 1 : 0;
  if (els.vis.minimap !== false) { drawMinimap(mmDt, world); mmCostMs = mmCostMs * 0.7 + (performance.now() - mmNow) * 0.3; }
  mmLastAt = mmNow;
  mmDt = 0;
}

// --- what the HUD knows about the moment (hudrules.js decides from it) -------

const S = {
  lastInput: 0, wantedOff: -Infinity, moneyAt: -Infinity, moneySign: 0, moneyHeld: null,
  hpAt: -Infinity, stAt: -Infinity, vehAt: -Infinity, hurtAt: -Infinity, fightAt: -Infinity,
  nearShop: false, shopT: 0, wasPause: false, lastHp: null, lastSt: null, lastVeh: null, now: 0,
};
const nowS = () => performance.now() / 1000;

function watchInput() {
  const poke = () => { S.lastInput = nowS(); };
  for (const t of ['keydown', 'mousedown', 'pointerdown', 'wheel']) window.addEventListener(t, poke, { capture: true, passive: true });
  let mv = 0;
  window.addEventListener('mousemove', (e) => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6 && ++mv % 4 === 0) poke(); }, { capture: true, passive: true });
  S.lastInput = nowS();
}

function sense(dt, world) {
  const now = S.now = nowS();
  const p = world.player;
  if (world.wanted > 0) S.wantedOff = Infinity;
  else if (S.wantedOff === Infinity) S.wantedOff = now;
  // the pause menu or a moving controller stick: everything back for a moment
  const pause = isPauseMenuOpen();
  if (pause !== S.wasPause) { S.wasPause = pause; S.lastInput = now; }
  const input = world.input;
  if (input && input.padKeys && input.padKeys.size) S.lastInput = now;
  if (input && input.mouse && input.mouse.down && world.weapon && world.weapon !== 'fists' && !p.inVehicle) S.fightAt = now;
  const hp = world.health;
  if (S.lastHp != null && hp < S.lastHp - 0.5) { S.hurtAt = now; S.fightAt = now; }
  if (hp !== S.lastHp) { S.hpAt = now; S.lastHp = hp; }
  if ((S.shopT -= dt) <= 0) {
    S.shopT = 0.5;
    S.nearShop = false;
    for (const sh of getShopsForRender()) if (Math.abs(sh.x - p.x) < 22 && Math.abs(sh.y - p.y) < 22) { S.nearShop = true; break; }
  }
}

const isBusy = (world) => world.wanted > 0 || nowS() - S.fightAt < 5 || !!(world.mission && world.mission.phase === 'active' && world.mission.raceHud) || !!world.challengeHud;
const isDialogue = () => document.body.classList.contains('hud-call-on') || heldBack();

let visT = 0;
const VIS_EVERY = 0.1;
// element -> the rules' key
const VIS_ELS = () => [
  ['gps', els.gps, (v) => v.gps || v.timer],
  ['place', els.place, (v) => v.place],
  ['stars', els.wanted, (v) => v.stars],
  ['search', els.search, (v) => v.stars],
  ['money', els.moneyRow, (v) => v.money],
  ['weapon', els.weapon, (v) => v.weapon],
  ['clock', els.clock, (v) => v.clock],
  ['minimap', els.mmWrap, (v) => v.minimap],
  ['street', els.locationEl, (v) => v.street],
  ['bars', els.you, (v) => v.bars],
  ['vehicle', els.speedo, (v) => v.vehicle],
  ['objective', els.mission, (v) => v.objective],
];

function updateVisibility(dt, world) {
  if ((visT -= dt) > 0) return;
  visT = VIS_EVERY;
  const b = document.body.classList;
  const now = nowS();
  const p = world.player;
  const v = p.inVehicle || world.trainCam || null;
  const busy = isBusy(world);
  const dialogue = isDialogue();
  hudNow.busy = busy;
  hudNow.dialogue = dialogue;
  // money coming in during a busy moment waits (P3), at most DEFER_MAX
  if (S.moneyHeld != null) {
    if (!busy) { S.moneyAt = now; S.moneyHeld = null; } else if (now - S.moneyHeld > DEFER_MAX) S.moneyHeld = null;
  }
  const hp = world.health;
  const st = staminaOf(world);
  const vehHp = v && Number.isFinite(v.health) ? v.health : null;
  const mapOpen = !!document.querySelector('.mapview-overlay.open');
  const sub = document.getElementById('banter-sub');
  const card = zones.occupant('A');
  const cardE = zones.occupant('E');
  const d = decideHud({
    mode: getSettings().hudMode,
    hidden: !(b.contains('game-started') || b.contains('trailer-hud')) || b.contains('cine-hide-hud') || mapOpen,
    banner: isBannerUp(),
    busy, dialogue,
    idle: now - S.lastInput,
    wanted: world.wanted, wantedAgo: S.wantedOff === Infinity ? 0 : now - S.wantedOff,
    moneyAgo: now - S.moneyAt, moneySign: S.moneySign, nearShop: S.nearShop, moneyHeld: S.moneyHeld != null,
    armed: !!world.weapon && world.weapon !== 'fists', fighting: now - S.fightAt < 5,
    hpFull: hp >= 99.5 && !(world.armor > 0 && world.armor < 100), hpAgo: now - S.hpAt, hpLow: hp < 30,
    stamFull: st == null || st >= 0.995, stamAgo: now - S.stAt,
    inVehicle: !!v, vehFull: vehHp == null || vehHp >= 99.5, vehAgo: now - S.vehAt,
    timer: !!gpsState.timer, gps: !!(gpsState.turn || gpsState.card), place: placeState.on,
    specialDay: !!els.clockSpecial, timeGoal: !!gpsState.timer,
    objective: !els.mission.hidden, subtitle: !!(sub && sub.style.opacity === '1'),
    cardA: card ? card.prio : null, cardE: cardE ? cardE.prio : null,
    keys: hintCount(),
  });
  const vis = d.show;
  for (const [key, el, pick] of VIS_ELS()) {
    const on = !!pick(vis);
    if (els.vis[key] === on) continue;
    els.vis[key] = on;
    el.classList.toggle('hv-off', !on);
    if (on) restartClass(el, 'hv-in');
  }
  els.gps.classList.toggle('no-turn', !vis.gps);
  els.clock.classList.toggle('big', d.big.clock);
  els.mission.classList.toggle('dim', d.dimObjective);
  // the cards and the radio follow the ceiling and the busy rules (they start themselves)
  setVisFlag('cardA', vis.cardA || !card, () => { els.cards.classList.toggle('hv-off', !(vis.cardA || !card)); });
  setVisFlag('cardE', vis.cardE || !cardE, () => { els.root.classList.toggle('hv-e-off', !(vis.cardE || !cardE)); });
  setVisFlag('keys', vis.keys, () => { els.root.classList.toggle('hv-keys-off', !vis.keys); });
  setVisFlag('dim', d.dimAll, () => { els.root.classList.toggle('hud-dimmed', d.dimAll); });
  setVisFlag('mode', d.mode, () => { els.root.dataset.hudMode = d.mode; });
}

function setVisFlag(key, val, apply) {
  if (els.vis[key] === val) return;
  els.vis[key] = val;
  apply();
}

// Stamina: swimming, or a bike's (or horse's) sprint; null when there is none.
function staminaOf(world) {
  const p = world.player;
  let st = null;
  if (p.swimming && Number.isFinite(p.swimStamina)) st = p.swimStamina;
  const v = p.inVehicle;
  if (v && (v.isBike || v._mount) && (v.sprintRest > 0 || v.sprintT > 0)) {
    const total = (v.sprintRest || 0) + (v.sprintT || 0);
    st = v.sprintT > 0 ? 1 - Math.min(1, (v.sprintRest - v.sprintT) / Math.max(0.1, total)) : 1 - Math.min(1, v.sprintRest / 4);
  }
  return st;
}


function currentDistrict(world) {
  const { x, y } = world.player;
  const meta = world.map.meta;
  // out in the real Ommelanden: the village you are in, else just Ommeland
  const area = ommelandArea(x, y);
  if (area) return areaNameAt(x, y).name;
  // Only 2 of the real admin boundaries actually reach into this play area,
  // and they're coarse (e.g. plain "Groningen") - the ~66 named
  // neighbourhood/quarter points give a far more specific, genre-style
  // district name ("Binnenstad", "Ebbingekwartier", ...), so prefer those
  // and only fall back to a boundary polygon if literally nothing is near.
  let best = null, bestD2 = Infinity;
  for (const p of meta.neighbourhoodPoints || []) {
    const d2 = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = p.name; }
  }
  if (best) return best;
  for (const d of meta.districts || []) {
    for (const ring of d.rings) {
      if (pointInPoly(x, y, ring)) return d.name;
    }
  }
  return null;
}

// The place at any point (the load screen): the village, a landmark within
// reach, else the wijk.
export function placeLabel(world, x, y) {
  const area = ommelandArea(x, y);
  if (area) {
    const a = areaNameAt(x, y);
    const name = a.near ? a.name : a.sub && a.region === 'groningen' ? a.sub : a.name;
    const v = VILLAGES[name];
    return { name, country: true, district: name, line: v && v.teaser ? v.teaser : townTeaser(name) };
  }
  for (const l of world.map.meta.landmarks || []) {
    if (Math.hypot(l.x - x, l.y - y) <= 90) return { name: l.name, country: false, district: '', line: LANDMARK_LINES[l.name] || '' };
  }
  let best = null, bestD2 = Infinity;
  for (const q of world.map.meta.neighbourhoodPoints || []) {
    const d2 = (q.x - x) ** 2 + (q.y - y) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = q.name; }
  }
  return { name: best || 'Grunn', country: false, district: best || '', line: best ? wijkBlurb(best) : '' };
}

// the line of a town of the province (stadsprofielen.js), where a village has none
const townTeaser = (name) => { const t = townProfile(name); return t ? t.teaser : ''; };

let locationTimer = 0;
let locWhere = { district: '', country: false, region: '' };
function updateLocation(dt, world) {
  locationTimer -= dt;
  if (locationTimer > 0) return;
  locationTimer = 0.5;
  // savegame.js's "Opgeslagen" sits in the location block
  if (!els.savedIn) {
    const t = document.querySelector('#hud > .hud-saved');
    if (t) { els.locationEl.appendChild(t); els.savedIn = true; }
  }
  const district = currentDistrict(world);
  const area = ommelandArea(world.player.x, world.player.y);
  const country = !!area;
  const rp = world.map.nearestRoadPoint(world.player.x, world.player.y, 60, false);
  const street = (rp && rp.road && rp.road.name) || (edgeDistance(world.player.x, world.player.y) > 0 ? roadStreetAt(world.map, world.player.x, world.player.y) : '');
  locWhere = { district: district || '', country, region: area ? areaNameAt(world.player.x, world.player.y).region : '' };
  // the street big, the wijk (or village) and the city under it
  setText(els.street, street || district || '');
  // plaats + wijk: a district of a town out in the province names its town
  const aname = area ? areaNameAt(world.player.x, world.player.y) : null;
  const region = aname ? (aname.near ? aname.name : aname.sub || (aname.region === 'groningen' ? 'Ommeland' : aname.name)) : 'Ommeland';
  setText(els.district, street ? [district, country ? (district === 'Ommeland' ? '' : region) : 'Grunn'].filter(Boolean).join(' · ') : (country ? region : 'Grunn'));
}

// --- zone B: a new place, big for a moment ---------------------------------------

const placeState = { on: false, t: 0, shown: new Map(), last: '', lastAt: -Infinity, pendingAt: 0, pending: null };
const PLACE_GAP = 20;
const PLACE_AGAIN = 600;
const LANDMARK_R = 55;
let placeScanT = 0;

function placeCandidate(world) {
  const p = world.player;
  for (const l of world.map.meta.landmarks || []) {
    if (Math.abs(l.x - p.x) > LANDMARK_R || Math.abs(l.y - p.y) > LANDMARK_R) continue;
    if (Math.hypot(l.x - p.x, l.y - p.y) <= LANDMARK_R) return { key: 'lm:' + l.name, kick: locWhere.district || 'Grunn', name: l.name, line: LANDMARK_LINES[l.name] || '' };
  }
  const d = locWhere.district;
  if (!d) return null;
  if (locWhere.country) {
    if (d === 'Ommeland') return null;
    const v = VILLAGES[d];
    const rn = locWhere.region && locWhere.region !== 'groningen' ? REGIONS[locWhere.region].name : '';
    if (rn) return { key: 'v:' + d, kick: rn === d ? '' : rn, name: d, line: v && v.teaser ? v.teaser : townTeaser(d) };
    return { key: 'v:' + d, kick: v && v.gro ? `Ommeland · ${v.gro}` : 'Ommeland', name: d, line: v && v.teaser ? v.teaser : '' };
  }
  return { key: 'w:' + d, kick: 'Grunn', name: d, line: wijkBlurb(d) };
}

function updatePlace(dt, world) {
  const now = nowS();
  if (placeState.on) {
    placeState.t -= dt;
    if (placeState.t <= 0) { placeState.on = false; els.place.classList.remove('on'); }
  }
  if ((placeScanT -= dt) > 0) return;
  placeScanT = 0.5;
  const c = placeCandidate(world);
  if (!c || c.key === placeState.last) return;
  // a mission timer, a cutscene or a busy moment: the place is just taken in
  const timer = !!gpsState.timer;
  if (timer || world.pigeonMode || world.heliRun || !document.body.classList.contains('game-started')) { placeState.last = c.key; return; }
  // a flyover (wijk, landmark) names its place in this card once it ends
  if (isCinematicActive() || isBusy(world) || isDialogue() || isOverlayHeld('locatie')) {
    if (!placeState.pending || placeState.pending.key !== c.key) { placeState.pending = c; placeState.pendingAt = now; }
    if (now - placeState.pendingAt > DEFER_MAX) { placeState.last = c.key; placeState.pending = null; }
    return;
  }
  if (now - placeState.lastAt < PLACE_GAP) return;
  if (now - (placeState.shown.get(c.key) ?? -Infinity) < PLACE_AGAIN) { placeState.last = c.key; return; }
  placeState.last = c.key;
  placeState.pending = null;
  placeState.lastAt = now;
  placeState.shown.set(c.key, now);
  placeState.on = true;
  placeState.t = PLACE_SHOW + 0.6;
  setText(els.placeKick, c.kick);
  setText(els.placeName, c.name);
  setText(els.placeLine, c.line);
  restartClass(els.place, 'on', () => placeState.on);
}

// --- zone B: the GPS card ---------------------------------------------------------

const gpsState = { turn: null, card: null, timer: '', t: 0 };
function updateGps(dt, world) {
  if ((gpsState.t -= dt) > 0) return;
  gpsState.t = 0.2;
  const o = lastObjective;
  gpsState.timer = o && o.timer ? o.timer : '';
  const p = world.player;
  const mode = travelModeOf(world);
  const route = getActiveRoute();
  let turn = null;
  // a turn card only in a vehicle on the roads, with a route, near a turn
  if (route && (mode === 'auto' || mode === 'fiets' || mode === 'boot') && route.remaining > 30) {
    const ahead = getRouteAhead(GPS_NEAR + 20, route);
    turn = nextTurn(ahead, GPS_NEAR);
  }
  gpsState.turn = turn;
  const card = turn ? null : modeCard(route, mode);
  gpsState.card = card;
  if (!turn && !card && !gpsState.timer) return;
  let key = gpsState.timer;
  if (turn) {
    const after = turn.after ? world.map.nearestRoadPoint(turn.after[0], turn.after[1], 25, false) : null;
    const street = after && after.road && after.road.name ? after.road.name : '';
    // where it goes is on the objective card below; the turn card says the street
    const sub = street;
    const v = p.inVehicle;
    const title = turnText(turn);
    key += '|' + title + '|' + sub + '|' + formatDistance(route.remaining);
    if (key === els.gpsKey) return;
    els.gpsArrow.innerHTML = TURN_ICON[turn.side];
    setText(els.gpsTitle, title);
    setText(els.gpsSub, sub);
    setText(els.gpsDist, formatDistance(route.remaining));
    setText(els.gpsEta, etaText(route.remaining, v ? v.speed : 0, route.mode || (mode === 'fiets' ? 'bike' : 'drive'), route));
  } else if (card) {
    key += `|${card.title}|${card.sub}|${formatDistance(route.remaining)}`;
    if (key === els.gpsKey) return;
    els.gpsArrow.innerHTML = TURN_ICON.recht;
    setText(els.gpsTitle, card.title);
    setText(els.gpsSub, card.sub);
    setText(els.gpsDist, formatDistance(route.remaining));
    setText(els.gpsEta, etaText(route.remaining, 0, route.mode || 'drive', route));
  } else if (key === els.gpsKey) return;
  els.gpsKey = key;
  setText(els.gpsTimer, gpsState.timer);
  els.gps.classList.toggle('has-timer', !!gpsState.timer);
  els.gps.hidden = false;
}

const CHARACTER_LABELS = { tammo: 'Tammo', anita: 'Tessa' };
// short crop for Tammo, a ponytail for Tessa (drawn over the head circle)
const HAIR = {
  tammo: 'M12.4 14.5c-.6-5.6 3-9 7.6-9s8.2 3 7.6 9c-1.6-3-4.4-4.2-7.6-4.2s-6 1.2-7.6 4.2z',
  anita: 'M12.6 14c-.4-5.4 3-8.6 7.4-8.6s7.8 3.2 7.4 8.6c-1.8-2.6-4.4-3.8-7.4-3.8s-5.6 1.2-7.4 3.8zM26.4 11.5c3.4 1.2 4.6 5.6 2.8 9.4-.6-2.4-1.8-3.8-3.4-4.4z',
};

function updateCharacter(dt, world) {
  const ch = world.player.character === 'anita' ? 'anita' : 'tammo';
  const drunk = (world.drunk || 0) > 0.08;
  const key = ch + (drunk ? 'd' : '');
  if (key !== els.idKey) {
    const swap = els.idKey && els.idKey[0] !== key[0];
    els.idKey = key;
    const name = CHARACTER_LABELS[ch];
    els.character.textContent = name;
    els.you.style.setProperty('--spk', HUD_ACCENT);
    els.portrait.querySelector('.hair').setAttribute('d', HAIR[ch]);
    els.drunk.hidden = !drunk;
    els.portraitT = 0;
    if (swap) pop(els.portrait);
  }
  // the outfits (wardrobe, the heist overall) change the looks in place
  els.portraitT -= dt;
  if (els.portraitT <= 0) {
    els.portraitT = 1;
    setPortrait(els.portraitImg, ch, 'portraitKey');
  }
  updateMate(world);
}

const LOOKS = { tammo: TAMMO_APPEARANCE, anita: ANITA_APPEARANCE };
const PORTRAIT_PX = 96;

// A head-and-shoulders render of the real character model (vehiclepreview.js
// shared renderer, cached per look and kept across sessions, so it only
// renders again for a new outfit or character); the drawn silhouette shows
// until then.
function setPortrait(img, ch, keyField) {
  const look = LOOKS[ch];
  const key = ch + JSON.stringify(look);
  if (els[keyField] === key) return;
  els[keyField] = key;
  renderSnapshot({ kind: 'person', look: { ...look }, frame: 'head' }, PORTRAIT_PX, PORTRAIT_PX, (url) => {
    if (els[keyField] !== key || !url) return;
    img.src = url;
    img.classList.add('on');
  }, { angle: PORTRAIT_ANGLE, keep: true });
}

// "· Tessa rijdt mee": the companion, next to your name, while they are with you.
function updateMate(world) {
  const c = world.companion;
  const p = world.player;
  let text = '';
  if (c && !world.pigeonMode && !c.hidden) {
    const name = c.character === 'anita' ? 'Tessa' : 'Tammo';
    if (p.inVehicle && c.inVehicle === p.inVehicle) text = `${name} ${p.inVehicle._mount === 'horse' ? 'rijdt' : p.inVehicle.isBike ? 'fietst' : p.inVehicle.isBoat ? 'vaart' : p.inVehicle.isHeli ? 'vliegt' : 'rijdt'} mee`;
    else if (!c.inVehicle && Math.hypot(c.x - p.x, c.y - p.y) < 30) text = `${name} loopt mee`;
  }
  const key = text && c.character + text;
  if (key === els.mateKey) return;
  const was = els.mateKey;
  els.mateKey = key;
  els.mate.hidden = !text;
  if (!text) return;
  els.mateTxt.textContent = '· ' + text;
  setPortrait(els.mateImg, c.character === 'anita' ? 'anita' : 'tammo', 'mateLookKey');
  if (!was) restartClass(els.mate, 'in');
}

const clampPct = (v) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));
function updateBars(world) {
  const hp = Math.round(clampPct(world.health)), ar = Math.round(clampPct(world.armor));
  if (hp !== els.hpKey) {
    els.hpKey = hp;
    setGhostBar(els.healthFill, els.healthFill.previousElementSibling, hp);
    els.hpNum.textContent = hp;
    els.hpRow.setAttribute('aria-valuenow', hp);
    const lvl = meterLevel(hp / 100);
    els.hpRow.classList.toggle('low', lvl !== 'ok' && hp > 0);
    els.hpRow.classList.toggle('crit', lvl === 'crit' && hp > 0);
    els.portrait.classList.toggle('low', hp < 30);
  }
  if (ar !== els.arKey) {
    els.arKey = ar;
    setGhostBar(els.armorFill, els.armorFill.previousElementSibling, ar);
    els.arNum.textContent = ar;
    els.arRow.setAttribute('aria-valuenow', ar);
    const wasHidden = els.arRow.hidden;
    els.arRow.hidden = ar <= 0;
    if (wasHidden && ar > 0) pop(els.arRow);
  }
  const st = staminaOf(world);
  const stKey = st == null ? '' : Math.round(st * 50) * 2;
  if (stKey !== els.stKey) {
    els.stKey = stKey;
    S.stAt = nowS();
    els.stRow.hidden = st == null;
    if (st != null) { els.staminaFill.style.width = stKey + '%'; els.stRow.setAttribute('aria-valuenow', stKey); }
  }
  // the vehicle's damage under yours, with its name (the train has none)
  const v = world.player.inVehicle;
  const vh = v && Number.isFinite(v.health) ? Math.round(clampPct(v.health)) : null;
  const vKey = vh == null ? '' : (v.id || '') + ':' + vh;
  if (vKey !== els.vehKey) {
    const fresh = !els.vehKey || els.vehKey.split(':')[0] !== String(v ? v.id || '' : '');
    els.vehKey = vKey;
    els.vehRow.hidden = vh == null;
    if (vh != null) {
      if (fresh) { setText(els.vehLabel, vehicleDisplayName(v).model || 'Voertuig'); S.vehAt = -Infinity; } else S.vehAt = nowS();
      setGhostBar(els.vehFill, els.vehFill.previousElementSibling, vh);
      els.vehRow.setAttribute('aria-valuenow', vh);
      els.vehRow.classList.toggle('hurt', vh <= 35);
    }
  }
}

const STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;
let wantedKey = '';
let wantedShown = 0;
function updateWanted(world) {
  const pol = world.police;
  const phase = wantedPhase(world);
  const searching = phase === 'zoeken';
  // the search box: how far you are out of the search area (and how long until a star drops)
  if (searching && world.wanted > 0 && pol.searchCenter) {
    const d = Math.hypot(world.player.x - pol.searchCenter.x, world.player.y - pol.searchCenter.y);
    const k = Math.max(0, Math.min(1, d / Math.max(1, pol.searchRadius) * 0.5 + (world.wantedDecayTimer || 0) / 24));
    const w = Math.round(k * 50) * 2 + '%';
    if (els.searchBar.style.width !== w) els.searchBar.style.width = w;
  }
  els.search.hidden = !(searching && world.wanted > 0);
  const key = world.wanted + (searching ? 's' : '');
  els.mmWrap.classList.toggle('wanted', world.wanted > 0);
  if (key === wantedKey) return;
  wantedKey = key;
  if (!els.wanted.children.length) els.wanted.innerHTML = STAR.repeat(5);
  const stars = [...els.wanted.children];
  stars.forEach((st, i) => st.classList.toggle('on', i < world.wanted));
  // a new star pops in, one at a time
  for (let i = wantedShown; i < world.wanted; i++) pop(stars[i]);
  wantedShown = world.wanted;
  els.wanted.classList.toggle('searching', searching && world.wanted > 0);
  els.wanted.classList.toggle('chase', world.wanted > 0 && !searching);
  els.wanted.setAttribute('aria-label', `Gezocht: ${world.wanted} van 5, ${wantedPhase(world) === 'zoeken' ? 'politie zoekt je' : 'achtervolging'}`);
}

export function getClockText(world) {
  const h = world && world.dayNight ? world.dayNight.hour : undefined;
  if (typeof h !== 'number' || !Number.isFinite(h)) return '';
  const total = Math.floor((((h % 24) + 24) % 24) * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

let clockShown = null;
let dateT = 0;
function updateClock(world) {
  const t = getClockText(world);
  els.clock.hidden = !t;
  if (t === clockShown) return;
  clockShown = t;
  els.time.textContent = t;
  // the date and a special day: once a game minute is plenty
  if (--dateT > 0) return;
  dateT = 5;
  const d = hudDate(world);
  setText(els.date, d.short);
  els.clockSpecial = d.special && !d.small ? d.special : '';
  els.special.hidden = !d.special;
  els.special.classList.toggle('small', d.small);
  if (els.specialKey !== d.key) {
    els.specialKey = d.key;
    els.special.innerHTML = d.special ? `${d.icon}<span>${d.special}</span>` : '';
  }
}

let lastHpFx = null;
let flash = 0;
function updateDamage(dt, world) {
  // almost no health: lowhealth.js (red edge, drained colours, heartbeat), no words
  tickLowHealth(dt, world);
  const hp = world.health + world.armor;
  if (document.body.classList.contains('intro-montage') || !cinematicAllowsDamageFx()) {
    // no blood screen in cutscenes, and no delayed flash for damage taken during one
    flash = 0;
    lastHpFx = hp;
    els.damage.style.opacity = '0';
    return;
  }
  if (lastHpFx != null && hp < lastHpFx - 0.5) flash = Math.min(1, flash + 0.35 + (lastHpFx - hp) / 30);
  lastHpFx = hp;
  flash = Math.max(0, flash - dt * 1.8);
  const s = flash.toFixed(2);
  if (els.damage.style.opacity !== s) els.damage.style.opacity = s;
}

// Without a running engine sound (audio off or not started yet) the gear and
// revs come from the speed, with the same gear tops as the engine sound.
const FALLBACK_TOPS = [0.15, 0.3, 0.48, 0.7, 1.05];
function fallbackEngine(v) {
  if (v && v.gb && !v.isBoat && !v.isHeli) {
    const g = v.gb;
    return { rpm: g.rpm, red: g.p.red, gear: Math.max(0, g.gear - 1), reverse: g.reverse, gears: g.p.tops.length, gb: gearboxReadout(g) };
  }
  if (!v || v.isBoat || v.isBike || v.isHeli || v.isScooter || v._mount || !v.model) return null;
  const red = 7000;
  if (v.speed < -0.2) return { rpm: 1500 + Math.min(1, -v.speed / 6) * 2500, red, gear: 0, reverse: true, gears: 5 };
  const frac = Math.abs(v.speed || 0) / (v.model.maxSpeed || 30);
  let g = 0;
  while (g < FALLBACK_TOPS.length - 1 && frac > FALLBACK_TOPS[g]) g++;
  return { rpm: Math.max(900, red * 0.93 * frac / FALLBACK_TOPS[g]), red, gear: g, reverse: false, gears: 5 };
}

// Zone H: the speed big, the gear row over it and the revs in an arc.
function updateSpeedo(world) {
  const v = world.player.inVehicle || world.trainCam;
  const on = !!v && !(v.isHeli && document.body.classList.contains('heli-flying'));
  els.speedo.classList.toggle('visible', on);
  document.body.classList.toggle('hud-in-vehicle', !!v);
  if (!v) { els.speedoKey = ''; return; }
  setText(els.speedoValue, String(Math.round(Math.abs(v.speed || 0) * 3.6)));
  const isTrain = v === world.trainCam;
  const eng = isTrain ? null : engineReadout() || fallbackEngine(v);
  // manual shifting (gearbox.js): the position row shows N too, a stalled engine and a grinding box say so
  const gbm = eng && eng.gb && eng.gb.mode !== 'auto' ? eng.gb : null;
  const gearKey = !eng || eng.gear < 0 ? '' : gbm ? `M${gbm.pos}/${gbm.layout.length}${eng.reverse ? 'R' : ''}${gbm.stalled ? 's' : ''}${gbm.grind ? 'g' : ''}${gbm.refuse ? 'x' : ''}${gbm.mode === 'clutch' ? 'c' : ''}` : (eng.reverse ? 'R' : String(eng.gear + 1)) + '/' + eng.gears;
  if (gearKey !== els.gearKey) {
    els.gearKey = gearKey;
    if (!gearKey) els.gears.innerHTML = '';
    else if (gbm) {
      const note = gbm.stalled ? 'MOTOR AF' : gbm.grind ? 'KRAKEN' : gbm.refuse ? 'TE HARD' : '';
      const lay = gbm.layout;
      const list = eng.reverse ? ['R', ...lay.slice(Math.max(0, gbm.pos), gbm.pos + 2)] : lay.slice(Math.max(0, gbm.pos - 1), gbm.pos + 3);
      const cur = eng.reverse ? 'R' : lay[gbm.pos];
      els.gears.innerHTML = note ? `<span class="on warn">${note}</span>` : list.map((g) => `<span${g === cur ? ' class="on"' : ''}>${g}</span>`).join('');
      els.gears.setAttribute('aria-label', note || `Versnelling ${cur === 'N' ? 'neutraal' : cur}`);
    } else {
      const cur = eng.reverse ? 'R' : eng.gear + 1;
      const list = eng.reverse ? ['R', 1] : [cur - 1, cur, cur + 1, cur + 2].filter((g) => g >= 1 && g <= eng.gears);
      els.gears.innerHTML = list.map((g) => `<span${g === cur ? ' class="on"' : ''}>${g}</span>`).join('');
      els.gears.setAttribute('aria-label', `Versnelling ${cur}`);
    }
  }
  els.speedo.classList.toggle('shiftlight', !!gbm && gbm.shiftLight && !gbm.limiter);
  els.speedo.classList.toggle('limiter', !!gbm && gbm.limiter);
  // a vehicle shows only what it has (hudlook.js): no gears on a bike, no revs on a boat
  const look = speedoLook(vehicleKind(v, { train: isTrain }), !!eng);
  els.speedo.classList.toggle('no-rpm', !look.rpm);
  els.speedo.classList.toggle('no-gears', !look.gears);
  if (eng) {
    const pct = Math.max(0, Math.min(100, Math.round((eng.rpm / (eng.red / (RPM_RED_AT / 100))) * 100)));
    const k = String(pct);
    if (k !== els.rpmKey) {
      els.rpmKey = k;
      els.rpmFill.setAttribute('stroke-dasharray', `${pct} 100`);
      els.speedo.classList.toggle('redline', pct >= RPM_RED_AT - 1);
    }
  }
}

const SPEEDO_PIC_W = 62;
const SPEEDO_PIC_H = 34;
const VEH_FLAGS = ['isPolice', 'isBus', 'isTaxi', 'isAmbulance', 'isHeroCar'];

function speedoSpec(v) {
  const m = v && v.model;
  if (!m || !m.name) return null;
  const flags = {};
  for (const f of VEH_FLAGS) if (v[f]) flags[f] = true;
  if (v._mount) flags._mount = v._mount;
  const kind = v.isHeli ? 'heli' : v.isBoat ? 'boat' : v.isBike ? 'bike' : v.isScooter ? 'scooter' : 'car';
  const model = {};
  for (const [k, val] of Object.entries(m)) if (k !== 'rider' && (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean')) model[k] = val;
  return { kind, model, color: m.color, nameIdx: 0, flags };
}
const speedoPx = () => Math.min(3, Math.max(2, Math.ceil(hudPixelRatio())));

// The garage and phone show vehicle stills (vehiclepreview.js, cached per
// model and colour); they are made ahead, in idle time: the vehicle you walk
// up to, and once at the start your own car (that first shot also warms up
// the renderer), so opening them costs no long frame.
const PREFETCH_REACH = 7;
const PREFETCH_EVERY = 0.4;
let prefetchIn = 0;
let warmed = false;
function prefetchSpeedoPic(v) {
  const spec = speedoSpec(v);
  if (!spec) return;
  const px = speedoPx();
  renderSnapshot(spec, SPEEDO_PIC_W * px, SPEEDO_PIC_H * px, null, { angle: 0.75 });
}
function updateSpeedoPrefetch(dt, world) {
  if (!warmed) { warmed = true; prefetchSpeedoPic({ model: HERO_CAR_MODEL, isHeroCar: true }); }
  if ((prefetchIn -= dt) > 0) return;
  prefetchIn = PREFETCH_EVERY;
  const p = world.player;
  if (!p || p.inVehicle || world.trainCam || !world.vehicles) return;
  const v = findEnterableVehicle(p.x, p.y, world.vehicles, PREFETCH_REACH);
  if (v) prefetchSpeedoPic(v);
}

const WEAPON_LABELS = {
  fists: 'VUISTEN', pistol: 'PISTOOL', uzi: 'UZI', shotgun: 'HAGELGEWEER',
  knuppel: 'HONKBALKNUPPEL', hockeystick: 'HOCKEYSTICK', bezem: 'BEZEM', fietspomp: 'FIETSPOMP', klomp: 'KLOMP', polsstok: 'POLSSTOK',
  jachtgeweer: 'JACHTGEWEER', waterpistool: 'WATERPISTOOL', carbidbus: 'CARBIDBUS', vuurwerk: 'VUURWERKPIJLEN',
};
// melee weapons never run out: no count next to the name
const NO_COUNT = new Set(['knuppel', 'hockeystick', 'bezem', 'fietspomp', 'klomp', 'polsstok']);
// Simple original silhouettes (48x24 viewBox), drawn in the HUD foreground colour.
const WEAPON_ICONS = {
  // front-on fist: four knuckles, thumb wrapped across, wrist below
  fists: '<rect x="18.5" y="17" width="11" height="6.5" rx="1.2"/><rect x="13.5" y="6.5" width="21" height="12" rx="4"/>' +
    '<rect x="13.5" y="1.5" width="5.6" height="10" rx="2.8"/><rect x="18.6" y="0.8" width="5.6" height="10.5" rx="2.8"/><rect x="23.7" y="1.2" width="5.6" height="10.2" rx="2.8"/><rect x="28.8" y="2.4" width="5.2" height="9.2" rx="2.6"/>' +
    '<path d="M19.1 3v6.4M24.2 2.6v7.1M29.3 3.4v7" stroke="rgba(0,0,0,.45)" stroke-width="1" fill="none" stroke-linecap="round"/>' +
    '<path d="M13.8 12.2c2.2-1.6 6.2-2.3 10.6-1.9 1.6.2 2.2 1.6 1.2 2.6-.9.9-2.3 1.2-3.6 1.3-3.2.3-5.8.9-8.2 2.2" stroke="rgba(0,0,0,.45)" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M19.5 18.6h9" stroke="rgba(0,0,0,.35)" stroke-width="0.9" fill="none" stroke-linecap="round"/>',
  pistol: '<path d="M8 6h30v6H22l-2 3h-5l-2 7H7l2-10H8z"/><rect x="38" y="7" width="3" height="3"/>',
  uzi: '<path d="M6 7h32v6H27v9h-5v-9h-4l-2 5h-6l2-5H6z"/><rect x="38" y="8.5" width="5" height="2.5"/><path d="M2 8h4v4H2z"/>',
  shotgun: '<path d="M2 8h28v2l16 0v3H30v1h-8l-3 2H13l-2 4H4l2-5H2z"/><rect x="24" y="13" width="7" height="3" rx="1"/>',
  knuppel: '<path d="M4 15.5l30-7.5c3.5-.9 7.5-.4 8.6 2.3.9 2.3-1.8 4.3-5.2 5L7 17.8c-1.4.2-2.6-.3-3-1.2z"/><circle cx="4.2" cy="16.6" r="2.3"/>',
  hockeystick: '<path d="M7 2.5l2.4-.8 11.4 16.6H40c1.6 0 2.4 1 2.4 2.2s-.8 2.1-2.4 2.1H18.6c-1 0-1.8-.4-2.4-1.3z"/><path d="M26 18.4h3v4h-3z" fill="rgba(0,0,0,.35)"/>',
  bezem: '<rect x="2" y="10.6" width="30" height="2.4" rx="1.2"/><path d="M31 8h4l9-3v14l-9-3h-4z"/><path d="M37 8.5v7M40 7.5v9M43 6.5v11" stroke="rgba(0,0,0,.4)" stroke-width="0.9"/>',
  fietspomp: '<rect x="6" y="10" width="30" height="4.6" rx="2.3"/><rect x="2" y="5" width="3.4" height="14.6" rx="1.4"/><rect x="5" y="11" width="3" height="2.6"/><path d="M36 12.3h6l3 3" stroke="currentColor" stroke-width="1.6" fill="none"/>',
  klomp: '<path d="M5 12c0-3.4 2.6-5 6-5h8c6 0 10 2.4 14 3.4 5 1.2 11 1.6 11 5.4 0 2.6-2.4 3.8-6 3.8H9c-2.6 0-4-1.6-4-4z"/><path d="M11 8.6c1.8 2.6 5.4 3.6 9 2.6" stroke="rgba(0,0,0,.4)" stroke-width="1" fill="none"/>',
  polsstok: '<rect x="1" y="10.8" width="46" height="2.4" rx="1.2"/><path d="M1 10.8h3v2.4H1z" fill="rgba(0,0,0,.4)"/><path d="M44 10.8h3v2.4h-3z" fill="rgba(0,0,0,.4)"/>',
  jachtgeweer: '<path d="M1 10h30v-.5l15 .3v2.6H30v1.2h-9l-3 1.6-8 4.6H3.5l3-5.8H1z"/><rect x="17" y="5.5" width="12" height="3" rx="1.5"/><path d="M20 8.5v1.5M26 8.5v1.5" stroke="currentColor" stroke-width="1.4"/>',
  waterpistool: '<path d="M8 7h26c2 0 3 1 3 2.5v1.8H44V14h-7v.4c0 1-1 1.6-2.2 1.6H22l-2 6h-7l2-6H10c-1.8 0-3-1.2-3-2.8V9.5C7 8 7.4 7 8 7z"/><circle cx="18" cy="5.2" r="4.4"/>',
  carbidbus: '<path d="M8 6h22c1.4 0 2.4 1 2.4 2.4v.4h4v6.4h-4v.4c0 1.4-1 2.4-2.4 2.4H8c-1.4 0-2.4-1-2.4-2.4V8.4C5.6 7 6.6 6 8 6z"/><rect x="37" y="10.2" width="4" height="3.6" rx="1"/><path d="M42 12l3-3M42 12l3.4 1.2M42 12l2 3.4" stroke="currentColor" stroke-width="1.1"/><path d="M14 6v12M24 6v12" stroke="rgba(0,0,0,.35)" stroke-width="1"/>',
  vuurwerk: '<path d="M28 7h10l6 5-6 5H28z"/><rect x="2" y="11" width="27" height="2" rx="1"/><path d="M26 12H8" stroke="rgba(0,0,0,.35)"/><path d="M28 9.5v5" stroke="rgba(0,0,0,.4)" stroke-width="1.2"/>',
};

let moneyShown = null;
let moneyTarget = 0;
let deltaSum = 0;
let deltaTimer = 0;
function updateMoneyWeapon(dt, world) {
  const target = Math.max(0, Math.floor(world.money));
  if (moneyShown == null) moneyShown = moneyTarget = target;
  if (target !== moneyTarget) {
    deltaSum = (deltaTimer > 0 ? deltaSum : 0) + (target - moneyTarget);
    deltaTimer = 2.2;
    // money in is P3 and waits out a chase; money out (and a shop) shows at once
    if (target > moneyTarget && isBusy(world)) S.moneyHeld = nowS();
    else { S.moneyAt = nowS(); S.moneyHeld = null; }
    S.moneySign = target > moneyTarget ? 1 : -1;
    moneyTarget = target;
    els.moneyDelta.textContent = (deltaSum > 0 ? '+€' : '−€') + Math.abs(deltaSum).toLocaleString('nl-NL');
    els.moneyDelta.dataset.sign = deltaSum > 0 ? 'plus' : 'min';
    els.moneyDelta.classList.add('visible');
  }
  if (deltaTimer > 0 && (deltaTimer -= dt) <= 0) els.moneyDelta.classList.remove('visible');
  const diff = moneyTarget - moneyShown;
  if (diff !== 0) {
    const step = Math.max(1, Math.abs(diff) * Math.min(1, dt * 5));
    moneyShown = Math.abs(diff) <= step ? moneyTarget : moneyShown + Math.sign(diff) * step;
  }
  setText(els.money, '€ ' + Math.round(moneyShown).toLocaleString('nl-NL'));
  els.money.classList.toggle('rolling', diff !== 0);
  const ammo = world.ammo ? world.ammo[world.weapon] : undefined;
  const weaponKey = WEAPON_ICONS[world.weapon] ? world.weapon : 'fists';
  const sub = weaponKey === 'fists' ? 'geen wapen' : ammo === undefined || NO_COUNT.has(world.weapon) ? 'slaan' : ammo === Infinity ? '∞' : String(ammo);
  if (els.weapon.dataset.key !== weaponKey) {
    els.weapon.dataset.key = weaponKey;
    els.weapon.innerHTML = `<svg class="hud-weapon-icon" viewBox="0 0 48 24" aria-hidden="true">${WEAPON_ICONS[weaponKey]}</svg><span class="hud-weapon-col"><span class="hud-weapon-text"></span><small class="hud-weapon-ammo"></small></span>`;
    restartClass(els.weapon, 'switched');
  }
  const label = WEAPON_LABELS[world.weapon] || 'VUISTEN';
  const textEl = els.weapon.querySelector('.hud-weapon-text');
  if (textEl.textContent !== label) textEl.textContent = label;
  const ammoEl = els.weapon.querySelector('.hud-weapon-ammo');
  if (ammoEl.textContent !== sub) {
    ammoEl.textContent = sub;
    ammoEl.dataset.num = /^\d+$/.test(sub) ? '1' : '';
  }
}

// The objective line: one objective at a time (a mission stage, else the
// bijbaan's next goal, else "lose the police"), genre style: the objective
// big, its live counter small under it, a timer to the right. It pops in
// again whenever the objective itself changes.
function currentObjective(world) {
  const m = world.mission;
  const job = world.sideJob;
  if (job && job.active) {
    const timer = job.timeLeft != null ? Math.ceil(job.timeLeft) + 's' : '';
    const g = job.goal;
    return { kind: 'job', title: g ? g.label : job.progress, sub: g ? job.progress : '', hint: g ? g.desc : '', timer };
  }
  if (m && m.phase === 'active') {
    const text = missionProgressText(m);
    const timer = m.timeLeft != null && !m.raceHud ? Math.ceil(m.timeLeft) + 's' : '';
    const cut = text.search(/ · | \(\d+\/\d+\)$/);
    const sub = cut > 0 ? text.slice(cut).replace(/^ · /, '').replace(/^ \((\d+\/\d+)\)$/, 'stap $1') : '';
    if (text || timer) return { kind: 'mission', title: cut > 0 ? text.slice(0, cut) : text, sub, timer };
  }
  if (world.wanted > 0 && !(m && m.phase === 'active')) {
    const searching = !!(world.police && world.police.searching);
    return {
      kind: 'police', title: searching ? 'Blijf uit het zicht' : 'Ontsnap aan de politie', timer: '',
      sub: searching ? 'Ze zijn je kwijt' : world.trainDriving ? 'Een trein houden ze niet zomaar tegen' : world.player.inVehicle ? 'Of laat je bak spuiten bij Spuit & Klaar' : 'Pak een bak en smeer hem',
    };
  }
  // the player's own goal (goal.js): the story waits meanwhile
  const goal = world.goal;
  if (goal && !playerBusy(world, ['padel', 'activityGame', 'heliRun', 'challenge']).busy && !(m && m.phase === 'active')) {
    const r = getActiveRoute();
    const d = r && r.kind === 'user' ? r.remaining : Math.hypot(goal.x - world.player.x, goal.y - world.player.y);
    const wait = storyWaiting(world);
    const first = r && r.kind === 'user' && r.target && /^Eerst: /.test(r.target.name) ? r.target.name : '';
    const sub = [first || goal.sub, formatDistance(d), wait ? `verhaal wacht: ${wait.code}` : ''].filter(Boolean).join(' · ');
    // the HUD takes no clicks: say where the goal can be dropped, the first few times
    return { kind: 'goal', title: `Doel: ${goal.name}`, sub, hint: goalHints <= GOAL_HINTS ? `${sub} · wissen via Te doen of de kaart` : '', timer: '' };
  }
  // between missions: the next story step, so it is always clear where to go
  const g = world.storyGuide;
  if (g && g.name && !world.storyFreePlay && !gameBusy(world) && !(m && m.phase === 'active')) {
    const atMarker = m && (m.phase === 'idle' || m.phase === 'cooldown') && Math.hypot(m.marker.x - g.x, m.marker.y - g.y) < 4;
    const near = Math.hypot(g.x - world.player.x, g.y - world.player.y) < 40;
    const inside = atMarker && !m.armed && m.distanceToMarker < (m.triggerRadius || 4);
    const sub = g.alt ? `${near ? 'Je bent er' : 'Volg de gele route'} · of kies: ${g.alt}, op de kaart`
      : g.buy ? (near ? 'Voor het verhaal: loop naar binnen (E)' : 'Volg de gele route naar de winkel')
      : inside ? 'Stap even uit de marker en weer terug'
      : atMarker ? (near ? 'Loop of rij de gele marker in' : 'Volg de gele route naar de marker') : 'Volg de gele route';
    return { kind: 'story', title: g.name, sub, timer: '' };
  }
  return null;
}

const OBJ_HINT_TIME = 6;
const QUIET_AFTER = 9;
const GOAL_HINTS = 3;
let goalHints = 0;

let lastObjective = null;
function updateMission(world) {
  const o = currentObjective(world);
  lastObjective = o;
  els.mission.hidden = !o || (!o.title && !o.timer);
  if (els.mission.hidden) { els.objKey = ''; return; }
  const key = o.kind + '|' + o.title;
  if (key !== els.objKey) { els.objAt = world.time; if (o.kind === 'goal') goalHints++; }
  // a new objective first says how (the bijbaan's hint), then its counter
  const sub = o.hint && world.time - els.objAt < OBJ_HINT_TIME ? o.hint : o.sub;
  // the route and the story speak for themselves after a moment: the card shrinks to the goal and the distance
  els.mission.classList.toggle('obj-quiet', (o.kind === 'story' || o.kind === 'goal' || o.kind === 'police') && world.time - els.objAt >= QUIET_AFTER);
  if (els.missionLabel.textContent !== o.title) els.missionLabel.textContent = o.title;
  if (els.missionProgress.textContent !== sub) els.missionProgress.textContent = sub;
  const r = getActiveRoute();
  // the turn card already carries the distance of the route
  const gpsShows = !els.gps.hidden && !els.gps.classList.contains('no-turn') && !els.gps.classList.contains('hv-off');
  setText(els.missionDist, r && r.remaining > 12 && o.kind !== 'job' && distanceOwner({ gps: gpsShows, objective: true }) === 'objective' ? formatDistance(r.remaining) : '');
  if (key !== els.objKey) {
    els.objKey = key;
    els.mission.dataset.kind = o.kind;
    // a mission's objective stays up in pigeon mode too (H4's photos, H10's knots)
    els.mission.classList.toggle('in-mission', o.kind === 'mission');
    restartClass(els.mission, 'pop');
    if (o.kind === 'goal') ring(els.mission);
  }
}

// missions.js leaves these fields set after a mission ends, so gate on the
// current type and phase instead of trusting their presence.
function missionProgressText(m) {
  if (m.phase !== 'active') return '';
  if (m.progressText) return m.progressText;
  if (m.raceHud) return '';
  if ((m.type === 'checkpoint' || m.type === 'boat') && m.wpTotal) {
    const cp = `Controlepunt ${Math.min(m.wpTotal, (m.wpIndex || 0) + 1)}/${m.wpTotal}`;
    return m.racePos ? `Positie ${m.racePos}/${m.raceTotal} · ${cp}` : cp;
  }
  if (m.type === 'fatbike' && m.fatbikeMaxHits != null) return `Geschept: ${m.fatbikeHits || 0}/${m.fatbikeMaxHits}`;
  return '';
}

function fmtRaceTime(s, tenths = true) {
  const t = Math.max(0, s);
  const m = Math.floor(t / 60);
  const sec = t - m * 60;
  return tenths ? `${m}:${sec.toFixed(1).padStart(4, '0')}` : `${m}:${String(Math.floor(sec)).padStart(2, '0')}`;
}

function setRaceRow(k, text, cls = '') {
  const row = els.raceRows[k];
  row.hidden = text == null;
  if (text == null) return;
  const b = row.firstElementChild.nextElementSibling;
  if (b.textContent !== text) b.textContent = text;
  if (row.dataset.state !== cls) row.dataset.state = cls;
}

function updateRaceHud(world) {
  const m = world.mission;
  const r = (m && m.phase === 'active' && !(world.sideJob && world.sideJob.active) ? m.raceHud : null) || world.challengeHud || null;
  els.race.hidden = !r;
  if (!r) return;
  els.racePos.hidden = !r.pos;
  if (r.pos) {
    els.racePos.querySelector('b').textContent = `${r.pos}e`;
    els.racePos.querySelector('span').textContent = `van ${r.total}`;
    els.racePos.dataset.lead = r.pos === 1 ? '1' : '';
  }
  setRaceRow('time', fmtRaceTime(r.elapsed));
  setRaceRow('left', fmtRaceTime(Math.ceil(r.timeLeft), false), r.timeLeft < 10 ? 'low' : '');
  setRaceRow('lap', r.laps ? `${r.lap}/${r.laps}` : null);
  setRaceRow('cp', `${r.cp}/${r.cpTotal}`);
  setRaceRow('best', r.best != null ? fmtRaceTime(r.best) : '–', r.best != null && r.elapsed < r.best ? 'ahead' : '');
}

// Zone E: the radio station for a few seconds. It waits out a chase or a
// call (at most DEFER_MAX s, then it lapses) and gives way to an achievement.
let npTimer = 0, npWait = 0;
function updateNowPlaying(dt, world) {
  const np = world.nowPlaying;
  if (np && np !== els.npShown) {
    els.npShown = np;
    npWait = DEFER_MAX;
    npTimer = 0;
    els.nowPlaying.classList.remove('on');
    const prog = np.programme && np.programme !== np.title ? ' · ' + np.programme : '';
    setText(els.npStation, (np.station || 'G-Music') + prog);
    setText(els.npTitle, np.title || '');
    setText(els.npArtist, np.artist || '');
  }
  if (np && npWait > 0 && npTimer <= 0) {
    if (!isBusy(world) && !isDialogue() && !zones.occupant('E') && !world.paused) {
      npTimer = E_SHOW;
      npWait = 0;
      restartClass(els.nowPlaying, 'on', () => npTimer > 0);
    } else if (!world.paused && (npWait -= dt) <= 0) world.nowPlaying = null;
  }
  if (npTimer > 0 && !world.paused && (npTimer -= dt) <= 0) {
    els.nowPlaying.classList.remove('on');
    world.nowPlaying = null;
  }
  // an achievement or a call takes the zone over at once
  if (npTimer > 0 && (zones.occupant('E') || isBusy(world))) { npTimer = 0; els.nowPlaying.classList.remove('on'); world.nowPlaying = null; }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

const C = {
  green: '#1e9e56',
  greenLight: '#3fc97a',
  greenDark: '#0f5c30',
  dark: '#0c140e',
  cream: '#f0ede4',
  landmark: '#f5f0e6',
  red: '#d93f3f',
  policeBlue: '#3f6fd9',
  yellow: '#e8c93a',
  yellowHalf: 'rgba(232, 201, 58, 0.5)',
  horeca: '#c9622a',
  grey: '#c7c7c2',
  greyDark: '#2a2e28',
};

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function applyPalette(p = markerColors()) {
  Object.assign(ROUTE_COLORS, { user: p.user, mission: p.mission, job: p.job, care: p.care });
  C.red = p.danger;
  C.yellow = p.mission;
  C.yellowHalf = hexA(p.mission, 0.5);
  C.policeBlue = p.police;
}
applyPalette();
onPaletteChange(applyPalette);

function outline(ctx, s, color = C.dark, w = 1.2) {
  ctx.lineWidth = w * s;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function pulseAt(t, speed = 5) {
  return 0.5 + 0.5 * Math.sin(t * speed);
}

// Draws one map marker in CSS-pixel space centred on (x, y); shared by the
// minimap, the full map and its legend so all three always match.
// vorm per medespeler (coopplayers.js): n hoeken, star = ster, rot = vaste draaiing
const PARTNER_VORMEN = {
  driehoek: { n: 3 }, ruit: { n: 4, rot: 0 }, vierkant: { n: 4, rot: Math.PI / 4 }, cirkel: { n: 0 }, vijfhoek: { n: 5 }, ster: { n: 5, star: true },
  plus: { plus: true }, kruis: { kruis: true }, maan: { n: 6 }, hart: { n: 6, star: true }, bliksem: { n: 7 }, druppel: { n: 8 }, blok: { n: 4, star: true },
  golf: { n: 7, star: true }, schild: { n: 3, rot: Math.PI / 2 }, bloem: { n: 8, star: true },
};
export function drawMapIcon(ctx, kind, x, y, s = 1, opts = {}) {
  if (!opts.raw && drawFlatMapIcon(ctx, kind, x, y, s, opts)) return;
  const t = opts.t ?? performance.now() / 1000;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  switch (kind) {
    case 'player': {
      ctx.rotate(opts.angle ?? -Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(7 * s, 0);
      ctx.lineTo(-5 * s, 4.6 * s);
      ctx.lineTo(-2.6 * s, 0);
      ctx.lineTo(-5 * s, -4.6 * s);
      ctx.closePath();
      ctx.fillStyle = C.greenLight;
      ctx.fill();
      outline(ctx, s, C.dark, 1.6);
      break;
    }
    case 'partner': { // medespeler (samen spelen, #95): vorm en kleur van de speler, nooit alleen kleur
      const f = PARTNER_VORMEN[opts.vorm] || PARTNER_VORMEN.cirkel;
      ctx.rotate(f.rot ?? (f.n === 3 ? (opts.angle ?? -Math.PI / 2) : 0));
      ctx.beginPath();
      if (f.plus) { ctx.rect(-1.6 * s, -5.2 * s, 3.2 * s, 10.4 * s); ctx.rect(-5.2 * s, -1.6 * s, 10.4 * s, 3.2 * s); }
      else if (f.kruis) { ctx.rotate(Math.PI / 4); ctx.rect(-1.6 * s, -5.2 * s, 3.2 * s, 10.4 * s); ctx.rect(-5.2 * s, -1.6 * s, 10.4 * s, 3.2 * s); }
      else if (!f.n) ctx.arc(0, 0, 4.8 * s, 0, Math.PI * 2);
      else for (let i = 0; i < (f.star ? f.n * 2 : f.n); i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / (f.star ? f.n * 2 : f.n), r = (f.star && i % 2 ? 2.6 : 5.6) * s;
        if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = opts.kleur || C.greenLight;
      ctx.fill();
      outline(ctx, s, C.dark, 1.4);
      break;
    }
    case 'companion': {
      // head and shoulders
      ctx.beginPath();
      ctx.arc(0, 0, 4.4 * s, 0, Math.PI * 2);
      ctx.fillStyle = C.greenDark;
      ctx.fill();
      outline(ctx, s, C.dark, 1.2);
      ctx.beginPath();
      ctx.arc(0, -1.3 * s, 1.5 * s, 0, Math.PI * 2);
      ctx.moveTo(-2.6 * s, 3 * s);
      ctx.quadraticCurveTo(0, -0.9 * s, 2.6 * s, 3 * s);
      ctx.closePath();
      ctx.fillStyle = C.cream;
      ctx.fill();
      break;
    }
    case 'cash': {
      ctx.beginPath();
      ctx.arc(0, 0, 5 * s, 0, Math.PI * 2);
      ctx.fillStyle = C.yellow;
      ctx.fill();
      outline(ctx, s, C.dark, 1.4);
      ctx.fillStyle = C.dark;
      ctx.font = `bold ${7.5 * s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u20ac', 0, 0.4 * s);
      break;
    }
    case 'car': {
      ctx.beginPath();
      ctx.roundRect(-5.5 * s, -2 * s, 11 * s, 5 * s, 1.4 * s);
      ctx.moveTo(-3 * s, -2 * s);
      ctx.lineTo(-1.8 * s, -4.4 * s);
      ctx.lineTo(2 * s, -4.4 * s);
      ctx.lineTo(3.2 * s, -2 * s);
      ctx.fillStyle = C.greenDark;
      ctx.fill();
      outline(ctx, s, C.dark, 3);
      outline(ctx, s, C.greenLight, 1.4);
      ctx.beginPath();
      ctx.arc(-3 * s, 3 * s, 1.2 * s, 0, Math.PI * 2);
      ctx.arc(3 * s, 3 * s, 1.2 * s, 0, Math.PI * 2);
      ctx.fillStyle = C.greenLight;
      ctx.fill();
      break;
    }
    case 'missionIdle': {
      const pulse = pulseAt(t);
      ctx.beginPath();
      ctx.arc(0, 0, (4.5 + pulse * 2) * s, 0, Math.PI * 2);
      outline(ctx, s, 'rgba(0,0,0,0.6)', 3.4);
      ctx.globalAlpha = (opts.alpha ?? 1) * (0.65 + pulse * 0.35);
      outline(ctx, s, C.yellow, 2);
      break;
    }
    case 'missionActive': {
      const pulse = pulseAt(t);
      ctx.beginPath();
      ctx.arc(0, 0, (5.5 + pulse * 1.2) * s, 0, Math.PI * 2);
      outline(ctx, s, 'rgba(0,0,0,0.6)', 3.4);
      outline(ctx, s, C.yellow, 2);
      ctx.beginPath();
      ctx.arc(0, 0, 2.6 * s, 0, Math.PI * 2);
      ctx.fillStyle = C.yellow;
      ctx.fill();
      outline(ctx, s, C.dark, 0.8);
      break;
    }
    case 'userWaypoint': {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-1.2 * s, -3 * s, -4.6 * s, -4.6 * s, -4.6 * s, -8 * s);
      ctx.arc(0, -8 * s, 4.6 * s, Math.PI, 0);
      ctx.bezierCurveTo(4.6 * s, -4.6 * s, 1.2 * s, -3 * s, 0, 0);
      ctx.closePath();
      ctx.fillStyle = ROUTE_COLORS.user;
      ctx.fill();
      outline(ctx, s, C.dark, 1.6);
      ctx.beginPath();
      ctx.arc(0, -8 * s, 1.9 * s, 0, Math.PI * 2);
      ctx.fillStyle = C.cream;
      ctx.fill();
      break;
    }
    case 'eierbalTip': {
      ctx.beginPath();
      ctx.arc(0, 0, 4.2 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#b06a28';
      ctx.fill();
      outline(ctx, s, C.yellow, 1.6);
      break;
    }
    case 'waypoint': {
      ctx.beginPath();
      ctx.arc(0, 0, 2.4 * s, 0, Math.PI * 2);
      ctx.fillStyle = C.yellowHalf;
      ctx.fill();
      break;
    }
    case 'own': {
      // owned vehicle: badge in its own paint with a green 'yours' ring
      const glyph = { car: 'auto', bike: 'fietsen', scooter: 'fietsen', boat: 'boot', heli: 'heli' }[opts.vkind] || 'auto';
      const paint = opts.color || C.greenDark;
      ctx.beginPath();
      ctx.arc(0, 0, 5 * s, 0, Math.PI * 2);
      ctx.fillStyle = paint;
      ctx.fill();
      outline(ctx, s, C.dark, 3.2);
      outline(ctx, s, C.greenLight, 1.6);
      drawShopGlyph(ctx, glyph, 3.3 * s, paint);
      break;
    }
    case 'home': {
      // Thuis: a cream house on a blue badge
      ctx.beginPath();
      ctx.arc(0, 0, 5.4 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#2f6fb0';
      ctx.fill();
      outline(ctx, s, C.dark, 1.4);
      ctx.beginPath();
      ctx.moveTo(0, -3.4 * s);
      ctx.lineTo(3.3 * s, -0.4 * s);
      ctx.lineTo(2.3 * s, -0.4 * s);
      ctx.lineTo(2.3 * s, 2.9 * s);
      ctx.lineTo(-2.3 * s, 2.9 * s);
      ctx.lineTo(-2.3 * s, -0.4 * s);
      ctx.lineTo(-3.3 * s, -0.4 * s);
      ctx.closePath();
      ctx.fillStyle = C.cream;
      ctx.fill();
      ctx.fillStyle = '#2f6fb0';
      ctx.fillRect(-0.7 * s, 0.9 * s, 1.4 * s, 2 * s);
      break;
    }
    case 'homeMooring':
    case 'homeHelipad': {
      // your own jetty / helidek: a cream boat or helicopter on the blue home badge
      ctx.beginPath();
      ctx.arc(0, 0, 5.4 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#2f6fb0';
      ctx.fill();
      outline(ctx, s, C.dark, 1.4);
      drawShopGlyph(ctx, kind === 'homeMooring' ? 'boot' : 'heli', 3.5 * s, '#2f6fb0');
      break;
    }
    case 'homeGarage': {
      // your own garage: a cream roller door on the same blue badge as home
      ctx.beginPath();
      ctx.arc(0, 0, 5.4 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#2f6fb0';
      ctx.fill();
      outline(ctx, s, C.dark, 1.4);
      ctx.fillStyle = C.cream;
      ctx.fillRect(-3.2 * s, -2.8 * s, 6.4 * s, 5.8 * s);
      ctx.fillStyle = '#2f6fb0';
      for (let i = 0; i < 4; i++) ctx.fillRect(-2.6 * s, (-1.9 + i * 1.3) * s, 5.2 * s, 0.45 * s);
      break;
    }
    case 'garage': {
      // Spuit & Klaar: wrench on a green badge
      ctx.beginPath();
      ctx.roundRect(-4.6 * s, -4.6 * s, 9.2 * s, 9.2 * s, 2 * s);
      ctx.fillStyle = C.green;
      ctx.fill();
      outline(ctx, s, C.dark, 1.2);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = C.cream;
      ctx.fillRect(-0.7 * s, -0.6 * s, 1.4 * s, 4 * s);
      ctx.beginPath();
      ctx.arc(0, -1.6 * s, 1.9 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.green;
      ctx.fillRect(-0.6 * s, -3.8 * s, 1.2 * s, 2.2 * s);
      break;
    }
    case 'horeca': {
      // fork and knife
      ctx.beginPath();
      ctx.arc(0, 0, 4.6 * s, 0, Math.PI * 2);
      ctx.fillStyle = C.horeca;
      ctx.fill();
      outline(ctx, s, C.dark, 1.2);
      ctx.strokeStyle = C.cream;
      ctx.lineCap = 'round';
      ctx.lineWidth = 0.75 * s;
      ctx.beginPath();
      ctx.moveTo(-1.4 * s, -2.8 * s); ctx.lineTo(-1.4 * s, 2.8 * s);
      ctx.moveTo(-2.3 * s, -2.8 * s); ctx.lineTo(-2.3 * s, -1 * s);
      ctx.moveTo(-0.5 * s, -2.8 * s); ctx.lineTo(-0.5 * s, -1 * s);
      ctx.moveTo(-2.3 * s, -1 * s); ctx.quadraticCurveTo(-1.4 * s, 0.2 * s, -0.5 * s, -1 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1.6 * s, 2.8 * s); ctx.lineTo(1.6 * s, -2.8 * s);
      ctx.quadraticCurveTo(2.9 * s, -1.6 * s, 2.4 * s, 0);
      ctx.lineTo(1.6 * s, 0);
      ctx.stroke();
      break;
    }
    case 'flitspaal': {
      // speed camera: a camera body with a lens
      ctx.beginPath();
      ctx.roundRect(-4.6 * s, -4.6 * s, 9.2 * s, 9.2 * s, 2 * s);
      ctx.fillStyle = C.greyDark;
      ctx.fill();
      outline(ctx, s, C.dark, 1.2);
      ctx.fillStyle = C.cream;
      ctx.beginPath();
      ctx.roundRect(-3 * s, -1.8 * s, 6 * s, 4 * s, 0.8 * s);
      ctx.fill();
      ctx.fillRect(-2.2 * s, -2.9 * s, 1.8 * s, 1.2 * s);
      ctx.beginPath();
      ctx.arc(0.4 * s, 0.2 * s, 1.3 * s, 0, Math.PI * 2);
      ctx.fillStyle = C.greyDark;
      ctx.fill();
      ctx.fillStyle = '#e8c93a';
      ctx.fillRect(1.6 * s, -1.4 * s, 0.9 * s, 0.9 * s);
      break;
    }
    case 'hospital': {
      // ziekenhuis / huisartsenpost: a white cross on a red square
      ctx.beginPath();
      ctx.roundRect(-5 * s, -5 * s, 10 * s, 10 * s, 2.2 * s);
      ctx.fillStyle = C.red;
      ctx.fill();
      outline(ctx, s, C.dark, 1.2);
      ctx.fillStyle = C.cream;
      ctx.fillRect(-1.1 * s, -3.4 * s, 2.2 * s, 6.8 * s);
      ctx.fillRect(-3.4 * s, -1.1 * s, 6.8 * s, 2.2 * s);
      break;
    }
    case 'politiebureau': {
      // politiebureau: a still blue shield with a cream star (the flashing one is a unit)
      ctx.beginPath();
      ctx.moveTo(0, -5.6 * s);
      ctx.lineTo(4.8 * s, -3.9 * s);
      ctx.quadraticCurveTo(4.6 * s, 3 * s, 0, 5.8 * s);
      ctx.quadraticCurveTo(-4.6 * s, 3 * s, -4.8 * s, -3.9 * s);
      ctx.closePath();
      ctx.fillStyle = C.policeBlue;
      ctx.fill();
      outline(ctx, s, C.dark, 1.2);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 1 : 2.4) * s;
        if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r - 0.2 * s); else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r - 0.2 * s);
      }
      ctx.closePath();
      ctx.fillStyle = C.cream;
      ctx.fill();
      break;
    }
    case 'landmark': {
      const r = 5 * s;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const oa = -Math.PI / 2 + i * (Math.PI * 2 / 5);
        const ia = oa + Math.PI / 5;
        if (i === 0) ctx.moveTo(Math.cos(oa) * r, Math.sin(oa) * r);
        else ctx.lineTo(Math.cos(oa) * r, Math.sin(oa) * r);
        ctx.lineTo(Math.cos(ia) * r * 0.45, Math.sin(ia) * r * 0.45);
      }
      ctx.closePath();
      ctx.fillStyle = C.landmark;
      ctx.fill();
      outline(ctx, s, C.dark, 1);
      break;
    }
    case 'policeFoot':
    case 'policeBike':
    case 'policeHorse':
    case 'police': {
      // flashing police shield; officers on foot, bike or horse get a smaller
      // one with a glyph instead of the star
      const blue = Math.floor(t * 6) % 2 === 1;
      if (kind !== 'police') {
        const k = kind === 'policeFoot' ? 0.62 : 0.82;
        ctx.scale(k, k);
      }
      ctx.beginPath();
      ctx.moveTo(0, -4.4 * s);
      ctx.lineTo(3.8 * s, -3 * s);
      ctx.quadraticCurveTo(3.6 * s, 2.4 * s, 0, 4.6 * s);
      ctx.quadraticCurveTo(-3.6 * s, 2.4 * s, -3.8 * s, -3 * s);
      ctx.closePath();
      ctx.fillStyle = blue ? C.policeBlue : C.red;
      ctx.fill();
      outline(ctx, s, C.dark, 1.2);
      if (kind === 'policeBike' || kind === 'policeHorse') {
        ctx.strokeStyle = C.cream;
        ctx.lineWidth = 0.9 * s;
        ctx.beginPath();
        if (kind === 'policeBike') {
          ctx.lineWidth = 0.7 * s;
          ctx.arc(-1.6 * s, 0.2 * s, 0.9 * s, 0, Math.PI * 2);
          ctx.moveTo(2.5 * s, 0.2 * s);
          ctx.arc(1.6 * s, 0.2 * s, 0.9 * s, 0, Math.PI * 2);
          ctx.moveTo(-1.6 * s, 0.2 * s);
          ctx.lineTo(-0.3 * s, -1.7 * s);
          ctx.lineTo(1.6 * s, 0.2 * s);
        } else {
          ctx.arc(0, -0.2 * s, 1.7 * s, Math.PI * 0.8, Math.PI * 2.2, false);
        }
        ctx.stroke();
        break;
      }
      if (kind === 'policeFoot') break;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 0.8 : 1.9) * s;
        if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r - 0.2 * s); else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r - 0.2 * s);
      }
      ctx.closePath();
      ctx.fillStyle = C.cream;
      ctx.fill();
      break;
    }
    default:
      if (drawOmmelandMapIcon(ctx, kind, s)) break;
      if (kind.startsWith('shop-')) drawShopMapIcon(ctx, kind.slice(5), s);
      else if (kind === 'pigeon') drawPigeonMapIcon(ctx, s);
      else if (kind === 'heli') drawHeliMapIcon(ctx, s);
      else if (kind === 'padel') drawPadelMapIcon(ctx, s);
      else if (kind.startsWith('act-')) drawActivityMapIcon(ctx, kind, s);
      else if (kind === 'pg-jelle' || kind === 'pg-fjord') drawPostgameMapIcon(ctx, kind.slice(3), s);
      else if (kind === 'station') drawStationMapIcon(ctx, s);
      else if (kind.startsWith('sj-')) drawSideJobMapIcon(ctx, kind, s, opts);
      else if (kind.startsWith('mi-') || kind.startsWith('ma-')) drawMissionMapIcon(ctx, kind, s, opts, t);
      else if (kind.startsWith('mm-')) drawMissionLayerIcon(ctx, kind, s);
  }
  ctx.restore();
}

// One icon, one colour (#114): the glyph drawn above, rasterised once per kind and
// size, becomes a flat silhouette in its category colour (mapicons.js FLAT_FILL)
// with a dark outline; its light details turn into dark ink. Returns false when
// this kind keeps its own look (or there is no canvas), so the caller draws it as before.
const flatCache = new Map();
let flatBroken = false; // no canvas readback here: the old disc and rings take over
function flatSprite(kind, s, a, opts) {
  const { t: _t, angle: _a, raw: _r, ...rest } = opts;
  const key = kind + '|' + s + '|' + a + '|' + JSON.stringify(rest);
  if (flatCache.has(key)) return flatCache.get(key);
  let sprite = null;
  try {
    const half = Math.ceil(13 * s + 6);
    const n = Math.ceil(half * 2 * a);
    const src = document.createElement('canvas');
    src.width = src.height = n;
    const sc = src.getContext('2d', { willReadFrequently: true });
    sc.scale(a, a);
    drawMapIcon(sc, kind, half, half, s, { ...opts, t: 0, raw: true });
    const img = sc.getImageData(0, 0, n, n);
    const d = img.data;
    const maskA = new Uint8ClampedArray(n * n), ink = new Uint8ClampedArray(n * n);
    let area = 0, light = 0;
    for (let i = 0; i < n * n; i++) {
      if (d[i * 4 + 3] < 90) continue;
      maskA[i] = 255; area++;
      if (Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) > 185) { ink[i] = 255; light++; }
    }
    const keepInk = area > 0 && light / area < 0.5;
    const plane = (arr, color) => {
      const c = document.createElement('canvas');
      c.width = c.height = n;
      const x = c.getContext('2d');
      const o = x.createImageData(n, n);
      const rgb = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
      for (let i = 0; i < n * n; i++) if (arr[i]) { o.data[i * 4] = rgb[0]; o.data[i * 4 + 1] = rgb[1]; o.data[i * 4 + 2] = rgb[2]; o.data[i * 4 + 3] = 255; }
      x.putImageData(o, 0, 0);
      return c;
    };
    const fill = plane(maskA, mapFillColor(kind)), dark = plane(maskA, FLAT_INK), rim = plane(maskA, HALO_LIGHT);
    const out = document.createElement('canvas');
    out.width = out.height = n;
    const oc = out.getContext('2d');
    const r = Math.max(1.5, 0.42 * s) * a;
    // a thin light line outside the dark outline keeps the icon apart from mid-tone ground
    const r2 = r + Math.max(1, 0.2 * s) * a;
    for (let i = 0; i < 16; i++) oc.drawImage(rim, Math.cos(i * Math.PI / 8) * r2, Math.sin(i * Math.PI / 8) * r2);
    for (let i = 0; i < 16; i++) oc.drawImage(dark, Math.cos(i * Math.PI / 8) * r, Math.sin(i * Math.PI / 8) * r);
    oc.drawImage(fill, 0, 0);
    if (keepInk) oc.drawImage(plane(ink, FLAT_INK), 0, 0);
    sprite = { canvas: out, size: n / a };
  } catch (e) { sprite = null; flatBroken = true; }
  flatCache.set(key, sprite);
  return sprite;
}
function drawFlatMapIcon(ctx, kind, x, y, s, opts) {
  if (flatBroken || typeof document === 'undefined' || !mapFillColor(kind) || !ctx.getTransform) return false;
  const a = Math.round(ctx.getTransform().a * 100) / 100 || 1;
  // sprites come in quarter steps of the scale (zooming is continuous); drawn at the exact size
  const sq = Math.max(0.5, Math.round(s * 4) / 4);
  if (flatCache.size > 300) flatCache.clear();
  const sp = flatSprite(kind, sq, a, opts);
  if (!sp) return false;
  const w = sp.size * s / sq;
  ctx.drawImage(sp.canvas, x - w / 2, y - w / 2, w, w);
  return true;
}

// A dark disc with a cream rim under an icon, so it reads on sea, meadow and
// the darker land outside the province alike. Goals, missions, police and the
// player carry their own rings and get none.
const NO_HALO = new Set(['player', 'goal', 'mission', 'police']);
export function drawMapIconHalo(ctx, kind, x, y, s = 1) {
  if (NO_HALO.has(mapCategory(kind)) || (mapFillColor(kind) && !flatBroken)) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 6.6 * s, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(12, 20, 14, 0.78)';
  ctx.fill();
  // outline, ring, category rim: 3:1 on any ground (mapicons.js, #114)
  const w = Math.max(1.6, 0.7 * s);
  ctx.lineWidth = w + 2;
  ctx.strokeStyle = HALO_DARK;
  ctx.stroke();
  ctx.lineWidth = w;
  ctx.strokeStyle = HALO_LIGHT;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 6.6 * s - w, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1.2, w * 0.8);
  ctx.strokeStyle = haloRim(kind);
  ctx.stroke();
  ctx.restore();
}

// A story mission on the map: the yellow ring with the mission's own icon
// (missionicons.js) on a dark disc; 'ma-<i>' while it runs, 'mi-<i>' else.
function drawMissionMapIcon(ctx, kind, s, opts, t) {
  const active = kind[1] === 'a';
  const pulse = pulseAt(t);
  const r = (active ? 6.6 + pulse * 0.8 : 6 + pulse * 1.2) * s;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(12,20,14,0.85)';
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.fill();
  outline(ctx, s, 'rgba(0,0,0,0.6)', 3.4);
  ctx.globalAlpha = (opts.alpha ?? 1) * (active ? 1 : 0.65 + pulse * 0.35);
  outline(ctx, s, C.yellow, 2);
  ctx.globalAlpha = opts.alpha ?? 1;
  if (!drawMissionGlyph(ctx, +kind.slice(3), 8.4 * s, C.yellow)) {
    ctx.beginPath();
    ctx.arc(0, 0, 2.6 * s, 0, Math.PI * 2);
    ctx.fillStyle = C.yellow;
    ctx.fill();
  }
}

// The map kind for mission i: its icon in the ring, or the plain ring.
export function missionMapKind(i, active) {
  return Number.isInteger(i) && i >= 0 ? (active ? 'ma-' : 'mi-') + i : active ? 'missionActive' : 'missionIdle';
}

// Pulsing red/blue police search ring; (x, y) and r in screen pixels.
export function drawSearchArea(ctx, x, y, r, t = performance.now() / 1000) {
  if (!(r > 0)) return;
  const pulse = pulseAt(t, 4);
  const blue = Math.floor(t * 2.5) % 2 === 1;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = blue ? 'rgba(63, 111, 217, 0.22)' : 'rgba(217, 63, 63, 0.26)';
  ctx.fill();
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = 'rgba(12, 20, 14, 0.7)';
  ctx.stroke();
  ctx.lineWidth = 2.5 + pulse * 1.2;
  ctx.strokeStyle = blue ? C.policeBlue : C.red;
  ctx.globalAlpha = 0.6 + pulse * 0.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * (0.55 + pulse * 0.45), 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.35 * (1 - pulse);
  ctx.stroke();
  ctx.restore();
}

export function getPoliceSearch(world) {
  const s = world.police;
  if (!s || !s.searching || !s.searchCenter) return null;
  const { x, y } = s.searchCenter;
  const r = s.searchRadius;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r) || r <= 0) return null;
  return { x, y, r };
}

// As the crow flies (pigeon mode): a dashed straight line to the target.
function drawCrowLine(ctx, [ax, ay], [bx, by], color) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.setLineDash([7, 6]);
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(12, 20, 14, 0.75)';
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

// mark: what the arrow points at, drawn small inside it (a dot for your
// goal, a square for a klus, a ring for the story, nothing for your car)
function drawEdgeArrow(ctx, x, y, angle, color, s = 1, mark = '') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(7 * s, 0);
  ctx.lineTo(-4.2 * s, 4.4 * s);
  ctx.lineTo(-4.2 * s, -4.4 * s);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = C.dark;
  ctx.stroke();
  if (mark) {
    ctx.fillStyle = C.dark;
    ctx.strokeStyle = C.dark;
    ctx.beginPath();
    if (mark === 'user') ctx.arc(-0.6 * s, 0, 1.5 * s, 0, Math.PI * 2);
    else if (mark === 'job') ctx.rect(-2 * s, -1.4 * s, 2.8 * s, 2.8 * s);
    if (mark === 'user' || mark === 'job') ctx.fill();
    else if (mark === 'mission') { ctx.lineWidth = 0.9 * s; ctx.arc(-0.6 * s, 0, 1.6 * s, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
}

export function drawRoute(ctx, pts, s = 1) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.setLineDash([3 * s, 3 * s]);
  ctx.lineWidth = 1.4 * s;
  ctx.strokeStyle = C.yellowHalf;
  ctx.stroke();
  ctx.restore();
}

// Thick along-the-road route line with a dark casing; pts in screen space.
export function drawRoadRoute(ctx, pts, color, width = 4, kind = null) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width + 3;
  ctx.strokeStyle = 'rgba(12, 20, 14, 0.85)';
  ctx.stroke();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
  const k = kind || Object.keys(ROUTE_COLORS).find((n) => ROUTE_COLORS[n] === color);
  const dash = k && ROUTE_DASH[k];
  if (dash) {
    // the pattern in the line's own dark casing colour, scaled to its width
    ctx.setLineDash(dash.map((d) => d * width));
    ctx.lineWidth = Math.max(1.2, width * 0.42);
    ctx.strokeStyle = 'rgba(12, 20, 14, 0.8)';
    ctx.stroke();
  }
  ctx.restore();
}

// Horeca is dense (hundreds of spots), so keep at most one icon per world
// grid cell; a world-space grid stays stable while the minimap rotates.
export function declutter(items, cellM) {
  const seen = new Set();
  return items.filter((it) => {
    const key = Math.floor(it.x / cellM) * 100003 + Math.floor(it.y / cellM);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

import { forEachCashTarget } from './cashvan.js';
import { gameBusy } from './busy.js';
import { playerBusy } from './busy.js';

export function getHeroCar(world) {
  return world.vehicles.find((v) => v.isHeroCar && !v.wrecked) || null;
}

// fn(x, y, kind): kind is the map icon, 'police' for cars, boats and the
// heli, 'policeBike' / 'policeHorse' for mounted officers, 'policeFoot'.
export function forEachPoliceUnit(world, fn) {
  for (const v of world.vehicles) {
    if (!v.isPolice || v.hijacked || v.wrecked) continue;
    if (v._mount) {
      if (!v.riderOff && !v._riderAway) fn(v.x, v.y, v._mount === 'horse' ? 'policeHorse' : 'policeBike');
    } else fn(v.x, v.y, 'police');
  }
  for (const p of world.pedestrians) {
    if (p.isCop && p.state !== 'dead') fn(p.x, p.y, 'policeFoot');
  }
  if (world.policeHeli) fn(world.policeHeli.x, world.policeHeli.y, 'police');
}

// icon sizes come from mapicons.js: a floor in HUD px, bigger than on the full map in proportion (#114)
const MM_ICON = miniIconScale(MINIMAP_SIZE, true);
// Static places: only the categories switched on in the map legend
// (mapfilters.js, shared with the full map), only the nearest few, only close by, drawn smaller and
// skipped where they would overlap something more important.
const MM_POI_ICON = miniIconScale(MINIMAP_SIZE);
const MM_POI_GAP_PX = iconGapPx(MM_POI_ICON);
const MM_POI_NEAR_M = 150;
const MM_POI_FAR_M = 250;
const SHOP_GROUPS = ['shopsWapens', 'shops', 'shopsVoertuigen'];

function nearestWithin(list, x, y, r, max) {
  const hits = [];
  for (const it of list) {
    const dx = it.x - x, dy = it.y - y;
    if (Math.abs(dx) > r || Math.abs(dy) > r) continue;
    const d2 = dx * dx + dy * dy;
    if (d2 <= r * r) hits.push([d2, it]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  return hits.slice(0, max).map((h) => h[1]);
}

function drawMinimapPois(ctx, world, job, placed, inRange, toScreen, t) {
  const player = world.player;
  const px = player.x, py = player.y;
  const inVehicle = !!player.inVehicle;
  const pois = [];
  const add = (layer, list, kind, max, r = MM_POI_NEAR_M) => {
    if (!minimapShows(layer)) return;
    for (const it of nearestWithin(list, px, py, r, max)) pois.push([typeof kind === 'function' ? kind(it) : kind, it.x, it.y]);
  };
  add('home', getHomeForRender(), 'home', 1, MM_POI_FAR_M * 2);
  add('home', getHomeGarageForRender(), 'homeGarage', 1, MM_POI_FAR_M * 2);
  add('home', getHomeMooringForRender(world), 'homeMooring', 1, MM_POI_FAR_M * 2);
  add('home', getHomeHelipadForRender(), 'homeHelipad', 1, MM_POI_FAR_M * 2);
  add('garage', getGaragesForRender(), 'garage', 1, MM_POI_FAR_M);
  add('zorg', facilitiesOf(['hospital', 'gppost']), 'hospital', 1, MM_POI_FAR_M * 2);
  add('politiebureau', facilitiesOf('police'), 'politiebureau', 1, MM_POI_FAR_M * 2);
  const shops = nearestWithin(getShopsForRender(), px, py, MM_POI_NEAR_M, 24);
  for (const group of SHOP_GROUPS) {
    if (!minimapShows(group)) continue;
    const types = new Set();
    for (const sh of shops) {
      if (types.size >= 2) break;
      if ((SHOP_TYPES[sh.type] || {}).group !== group || types.has(sh.type)) continue;
      types.add(sh.type);
      pois.push(['shop-' + sh.type, sh.x, sh.y]);
    }
  }
  if (!job) {
    const sjs = getSideJobSpotsForRender();
    add('bijbaan', sjs.filter((sj) => !sj.job.layer), (sj) => 'sj-' + sj.job.id, 2, MM_POI_FAR_M);
    add('rondvaarttour', sjs.filter((sj) => sj.job.layer === 'rondvaarttour'), (sj) => 'sj-' + sj.job.id, 1, MM_POI_FAR_M);
  }
  add('trein', getStationsForRender(), 'station', 1, MM_POI_FAR_M);
  add('ommeland', ommelandMapSpots(), (q) => q.kind, 2, MM_POI_FAR_M);
  if (inVehicle) add('flitspaal', world.flitspaalen || [], 'flitspaal', 2);
  if (!inVehicle) add('duif', getPigeonSpotsForRender(), 'pigeon', 1);
  add('heli', getHeliSpotsForRender(), 'heli', 1, MM_POI_FAR_M);
  add('padel', getPadelSpotsForRender(), 'padel', 1, MM_POI_FAR_M);
  for (const a of activityMapIcons(world)) add(a.layer, [a], a.kind, 1, MM_POI_FAR_M);
  add('postgame', getPostgameSpotsForRender(), (q) => 'pg-' + q.kind, 2, MM_POI_FAR_M);
  add('horeca', getHorecaForRender(), 'horeca', 1);
  add('landmark', world.map.meta.landmarks || [], 'landmark', 2);

  // the most important place wins where two would touch
  pois.sort((a, b) => mapPriority(b[0]) - mapPriority(a[0]));
  const gap2 = MM_POI_GAP_PX * MM_POI_GAP_PX;
  const drawn = [];
  for (const [kind, x, y] of pois) {
    if (!inRange(x, y)) continue;
    const [sx, sy] = toScreen(x, y);
    let blocked = false;
    for (let i = 0; i < placed.length && !blocked; i += 2) blocked = (placed[i] - sx) ** 2 + (placed[i + 1] - sy) ** 2 < gap2;
    if (blocked) continue;
    placed.push(sx, sy);
    drawn.push([kind, sx, sy]);
  }
  for (const [kind, sx, sy] of drawn) {
    drawMapIconHalo(ctx, kind, sx, sy, MM_POI_ICON);
    drawMapIcon(ctx, kind, sx, sy, MM_POI_ICON, { t });
  }
}

// Town, village and region names on the minimap (the list is refreshed when
// the player has moved a bit), upright over the rotating map; a name just
// off the map keeps to the rim, towards it.
const VILLAGE_KINDS = new Set(['town', 'village', 'hamlet', undefined]);
let villageCache = { x: Infinity, y: Infinity, list: [], regions: [], edge: [], neighbours: [] };
function drawVillageNames(ctx, player, radius, toScreen) {
  if (Math.hypot(player.x - villageCache.x, player.y - villageCache.y) > 25) {
    const r = radius * 3;
    const own = worldPlacesReady();
    const list = own
      ? worldPlaceLabels(player.x - r, player.y - r, player.x + r, player.y + r).filter((v) => v.rank < 5 && (v.rank <= 1 || (v.x - player.x) ** 2 + (v.y - player.y) ** 2 < (radius * 1.5) ** 2))
      : villageLabels(player.x - radius * 1.5, player.y - radius * 1.5, player.x + radius * 1.5, player.y + radius * 1.5).filter((v) => VILLAGE_KINDS.has(v.kind));
    const regions = provinceMapOn() ? regionLabels(player.x - radius, player.y - radius, player.x + radius, player.y + radius, 0.1).filter((q) => q.id !== 'groningen') : [];
    // what lies beyond the border or the coast in view (#237): the region's name just outside the line, and a few neighbour villages
    const named = new Set(regions.map((q) => q.id));
    const edge = provinceMapOn() ? regionEdgeLabels(player.x - radius * 0.8, player.y - radius * 0.8, player.x + radius * 0.8, player.y + radius * 0.8, radius * 0.2).filter((q) => !named.has(q.id)) : [];
    const neighbours = provinceMapOn() ? borderPlaceLabels(player.x - radius, player.y - radius, player.x + radius, player.y + radius, [...regions, ...edge].map((q) => [q.x, q.y]), { zoom: 1, max: 3, gap: radius * 0.45 }) : [];
    villageCache = { x: player.x, y: player.y, list, regions, edge, neighbours };
  }
  const rim = MINIMAP_SIZE / 2 - 20;
  const [cx, cy] = toScreen(player.x, player.y);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = "11px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif";
  for (const q of villageCache.regions) {
    const [sx, sy] = toScreen(q.x, q.y);
    ctx.fillStyle = q.land ? 'rgba(240, 237, 228, 0.5)' : 'rgba(190, 225, 245, 0.65)';
    ctx.fillText(q.name.toUpperCase().split('').join(' '), sx, sy);
  }
  // the names beyond the border and the dimmed neighbour villages, kept inside the frame so nothing is cut off
  const keep = (name, sx, sy) => {
    const w = ctx.measureText(name).width;
    return [Math.max(w / 2 + 6, Math.min(MINIMAP_SIZE - w / 2 - 6, sx)), Math.max(10, Math.min(MINIMAP_SIZE - 10, sy))];
  };
  for (const q of villageCache.edge) {
    const name = q.name.toUpperCase().split('').join(' ');
    const [sx, sy] = keep(name, ...toScreen(q.x, q.y));
    ctx.fillStyle = q.land ? 'rgba(240, 237, 228, 0.42)' : 'rgba(190, 225, 245, 0.55)';
    ctx.fillText(name, sx, sy);
  }
  for (const q of villageCache.neighbours) {
    const name = q.name.toUpperCase();
    const [sx, sy] = keep(name, ...toScreen(q.x, q.y));
    ctx.fillStyle = 'rgba(240, 237, 228, 0.36)';
    ctx.fillText(name, sx, sy);
  }
  ctx.font = "15px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif";
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(12, 20, 14, 0.85)';
  ctx.fillStyle = '#f0ede4';
  const boxes = [];
  let n = 0;
  for (const v of villageCache.list) {
    let [sx, sy] = toScreen(v.x, v.y);
    const d = Math.hypot(sx - cx, sy - cy);
    if (d > rim) { sx = cx + (sx - cx) * rim / d; sy = cy + (sy - cy) * rim / d; }
    const label = v.name.toUpperCase();
    const w = ctx.measureText(label).width;
    if (boxes.some((o) => Math.abs(o[0] - sx) < (o[2] + w) / 2 && Math.abs(o[1] - sy) < 14)) continue;
    boxes.push([sx, sy, w]);
    ctx.strokeText(label, sx, sy);
    ctx.fillText(label, sx, sy);
    if (++n >= 4) break;
  }
  ctx.restore();
}

const MM_MIN_INTERVAL_MS = 33;
let mmLastAt = 0, mmCostMs = 0;

function drawMinimap(dt, world) {
  syncMapPhase(world);
  const ctx = els.mmCtx;
  const dpr = hudPixelRatio();
  sizeSquareCanvas(els.mmCanvas, Math.round(MINIMAP_SIZE * dpr));
  const player = world.player;
  const t = performance.now() / 1000;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, els.mmCanvas.width, els.mmCanvas.height);

  const speed = player.inVehicle ? Math.abs(player.inVehicle.speed || 0) : 0;
  mmMode = travelModeOf(world);
  const mode = MINIMAP_MODE[mmMode] || MINIMAP_MODE.lopen;
  const st = getSettings();
  // a running mission zooms the minimap in on its area (missionmap.js)
  const layer = getMissionLayer(world);
  updateMissionNotices(world, layer);
  const targetScale = missionMinimapScale(layer, minimapScale(mmMode, speed, st.minimapZoom || 1), MINIMAP_SIZE);
  mmScale += (targetScale - mmScale) * Math.min(1, dt * 1.6);
  const MM_RADIUS_M = MINIMAP_SIZE / 2 * 1.42 / mmScale;

  const cx = MINIMAP_SIZE / 2, cy = MINIMAP_SIZE / 2;
  // The map rotates so the camera heading always points up (or stays north-up
  // in the air or by setting); any world angle plus mapRotation gives its
  // on-screen angle. A change of mode turns it smoothly.
  // a flying pigeon: its own heading (pigeonmode.js keeps player.angle on it)
  const upYaw = world.pigeonMode ? player.angle : world.camYaw ?? player.angle;
  const rotTarget = northUp(st.minimapNorth, mmMode) ? 0 : -Math.PI / 2 - upYaw;
  if (mmRot == null) mmRot = rotTarget;
  let dr = rotTarget - mmRot;
  dr -= Math.round(dr / (Math.PI * 2)) * Math.PI * 2;
  mmRot += Math.abs(dr) < 0.02 ? dr : dr * Math.min(1, dt * 8);
  const mapRotation = mmRot;
  const cosR = Math.cos(mapRotation), sinR = Math.sin(mapRotation);
  const dimLand = mode.dimLand;
  ctx.translate(cx * dpr, cy * dpr);
  ctx.rotate(mapRotation);
  ctx.scale(mmScale * dpr, mmScale * dpr);
  ctx.translate(-player.x, -player.y);

  ctx.fillStyle = MINI_STYLE.meadow;
  ctx.fillRect(player.x - MM_RADIUS_M, player.y - MM_RADIUS_M, MM_RADIUS_M * 2, MM_RADIUS_M * 2);
  drawCountryMinimap(ctx, player.x - MM_RADIUS_M, player.y - MM_RADIUS_M, player.x + MM_RADIUS_M, player.y + MM_RADIUS_M, mmScale);
  const province = provinceMapOn();
  if (province) drawSea(ctx, (n) => n / mmScale, seaStyle(MINI_STYLE));

  const view = world.map.queryView(
    player.x - MM_RADIUS_M, player.y - MM_RADIUS_M,
    player.x + MM_RADIUS_M, player.y + MM_RADIUS_M
  );

  if (edgeDistance(player.x, player.y) < 0) drawNeighbourhoodBorders(ctx, dt, world, player, MM_RADIUS_M);

  ctx.fillStyle = MINI_STYLE.park;
  for (const g of view.green) fillPoly(ctx, g.pts);

  ctx.fillStyle = MINI_STYLE.water;
  for (const w of view.water) fillPoly(ctx, w.pts);

  const emph = mode.emph;
  const landAlpha = 1 - dimLand;
  for (const r of view.roads) {
    if (r.pts.length < 2) continue;
    const allowed = roadAllowed(r, mmMode);
    ctx.beginPath();
    ctx.moveTo(r.pts[0][0], r.pts[0][1]);
    for (let i = 1; i < r.pts.length; i++) ctx.lineTo(r.pts[i][0], r.pts[i][1]);
    let color = r.cat === 'major' ? MINI_STYLE.major : r.cat === 'cycle' ? MINI_STYLE.cycle : MINI_STYLE.road;
    const rs = miniRoadStyle(r.cat, r.width, mmScale);
    if (rs.alpha <= 0.02) continue;
    let w = rs.widthM;
    let a = landAlpha * rs.alpha;
    if (emph === 'foot') { if (r.cat === 'foot') { color = EMPHASIS.foot; w = Math.max(w, 3.4); } }
    else if (emph === 'cycle') { if (r.cat === 'cycle') { color = EMPHASIS.cycle; w = Math.max(w, 4); } else if (r.cat === 'foot') a *= 0.4; }
    else if (emph === 'major') { if (r.cat === 'major') w = Math.max(w, r.width * 1.1); else if (r.cat === 'foot' || r.cat === 'cycle') a *= 0.35; }
    if (allowed === false && r.cat !== 'major') a *= 0.45;
    ctx.globalAlpha = a;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.stroke();
    // "niet voor jou": a trunk road you may not walk or cycle on gets a red dash
    if (allowed === false && r.cat === 'major') {
      ctx.globalAlpha = 1;
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = EMPHASIS.forbidden;
      ctx.lineWidth = Math.max(2, w * 0.4);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.globalAlpha = landAlpha;
  drawRailsOnMap(ctx, world.map, player.x - MM_RADIUS_M, player.y - MM_RADIUS_M, player.x + MM_RADIUS_M, player.y + MM_RADIUS_M, 3.2);
  drawTrainsOnMap(ctx);

  const MM_BUILDING_COLORS = MINI_STYLE.buildings;
  for (const b of view.buildings) {
    ctx.fillStyle = b.landmark ? MINI_STYLE.church : MM_BUILDING_COLORS[Math.floor(mmHash(b.pts[0][0], b.pts[0][1]) * MM_BUILDING_COLORS.length)];
    fillPoly(ctx, b.pts);
  }
  ctx.globalAlpha = 1;
  // outside the province darker, with its land borders
  if (province) drawOutside(ctx, [player.x - MM_RADIUS_M, player.y - MM_RADIUS_M, player.x + MM_RADIUS_M, player.y + MM_RADIUS_M], (n) => n / mmScale, { tint: 'rgba(6, 12, 9, 0.34)', width: 2.6 });

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const iconRangeM = (MINIMAP_SIZE / 2 - 8) / mmScale;
  const toScreen = (x, y) => {
    const dx = x - player.x, dy = y - player.y;
    return [cx + (dx * cosR - dy * sinR) * mmScale, cy + (dx * sinR + dy * cosR) * mmScale];
  };

  if (edgeDistance(player.x, player.y) > -150) drawVillageNames(ctx, player, MM_RADIUS_M, toScreen);

  const search = getPoliceSearch(world);
  if (search) {
    const [sx, sy] = toScreen(search.x, search.y);
    drawSearchArea(ctx, sx, sy, search.r * mmScale, t);
  }

  for (const route of getRoutes()) {
    if (route.fly) { drawCrowLine(ctx, toScreen(player.x, player.y), toScreen(route.target.x, route.target.y), ROUTE_COLORS[route.kind] || ROUTE_COLORS.user); continue; }
    const ahead = getRouteAhead(MM_RADIUS_M * 2.5, route);
    if (ahead && ahead.length > 1) drawRoadRoute(ctx, [[player.x, player.y], ...ahead].map(([x, y]) => toScreen(x, y)), ROUTE_COLORS[route.kind] || ROUTE_COLORS.user, route === getActiveRoute() ? 4 : 3);
  }
  const inRange = (x, y) => (x - player.x) ** 2 + (y - player.y) ** 2 <= iconRangeM * iconRangeM;
  const heliMarks = getHeliRunMarks();
  if (heliMarks) drawHeliRunMarks(ctx, heliMarks, toScreen, inRange, mmScale, t);
  // a minigame on the spot (padel, carbid, the kermis) or a heli run: no other mission or story marks
  const busyGame = gameBusy(world);
  const placed = [];
  const icon = (kind, x, y, opts) => {
    if (!inRange(x, y)) return false;
    const [sx, sy] = toScreen(x, y);
    drawMapIcon(ctx, kind, sx, sy, MM_ICON, { t, ...opts });
    placed.push(sx, sy);
    return true;
  };
  const edgeAngle = (x, y) => Math.atan2(y - player.y, x - player.x) + mapRotation;

  const m = world.mission;
  const job = world.sideJob && world.sideJob.active ? world.sideJob : null;
  const wp = getUserWaypoint();
  const owned = getOwnedVehiclesForMap(world);
  const reserve = (x, y) => { if (inRange(x, y)) placed.push(...toScreen(x, y)); };
  if (job && job.marker) reserve(job.marker.x, job.marker.y);
  // map rule (goal.js): the story's mission, the goal's or the one that runs
  const showMission = !!(m && missionOnMap(world) && !job && !busyGame);
  if (showMission) reserve(m.marker.x, m.marker.y);
  if (wp) reserve(wp.x, wp.y);
  const showOwn = minimapShows('car');
  if (showOwn) for (const o of owned) reserve(o.x, o.y);
  const storyShop = busyGame ? null : storyTargetShop(world);
  const storyAt = storyShop && inRange(storyShop.x, storyShop.y) ? toScreen(storyShop.x, storyShop.y) : null;
  if (storyAt) placed.push(storyAt[0], storyAt[1]);
  // a mission layer quiets the places that do not count for it
  if (!(layer && layer.quiet)) drawMinimapPois(ctx, world, job, placed, inRange, toScreen, t);
  if (layer) {
    drawLayerAreas(ctx, layer, toScreen, mmScale, t);
    drawLayerLines(ctx, layer, toScreen, 3);
    if (layer.kind !== 'heli') for (const it of selectMiniItems(layer, player, undefined, { skipDrawn: true })) {
      if (!inRange(it.x, it.y)) continue;
      const [sx, sy] = toScreen(it.x, it.y);
      drawMapIconHalo(ctx, it.kind, sx, sy, MM_ICON);
      drawMapIcon(ctx, it.kind, sx, sy, MM_ICON, { t });
      placed.push(sx, sy);
    }
  }
  if (storyAt) {
    drawStoryShopRing(ctx, storyAt[0], storyAt[1], 11, t);
    drawMapIcon(ctx, 'shop-' + storyShop.type, storyAt[0], storyAt[1], MM_ICON, { t });
  }


  let missionEdge = null, jobEdge = null;
  if (job) {
    for (const d of job.dots) icon('sj-dot', d.x, d.y);
    if (job.marker && !icon('sj-target', job.marker.x, job.marker.y)) jobEdge = edgeAngle(job.marker.x, job.marker.y);
  }
  // a post-game challenge's next checkpoint (postgame.js)
  const ct = !job && world.challengeTarget;
  if (ct) {
    if (ct.path.length) drawRoute(ctx, [...ct.path, ct].map((w) => toScreen(w.x, w.y)), MM_ICON);
    if (!icon('sj-target', ct.x, ct.y)) jobEdge = edgeAngle(ct.x, ct.y);
  }
  if (showMission) {
    const wps = m.phase === 'active' ? m.remainingWaypoints || [] : [];
    if (wps.length) {
      drawRoute(ctx, [m.marker, ...wps].map((w) => toScreen(w.x, w.y)), MM_ICON);
      for (const w of wps) icon('waypoint', w.x, w.y);
    }
    const kind = missionMapKind(m.index, m.phase === 'active');
    if (!icon(kind, m.marker.x, m.marker.y)) missionEdge = edgeAngle(m.marker.x, m.marker.y);
  }

  let wpEdge = null;
  if (wp && !busyGame && !icon('userWaypoint', wp.x, wp.y)) wpEdge = edgeAngle(wp.x, wp.y);
  let heliEdge = null;
  if (heliMarks && heliMarks.target && !inRange(heliMarks.target.x, heliMarks.target.y)) heliEdge = edgeAngle(heliMarks.target.x, heliMarks.target.y);

  let heroEdge = null;
  if (showOwn) for (const o of owned) {
    if (!icon('own', o.x, o.y, { vkind: o.kind, color: o.color }) && o.hero) heroEdge = edgeAngle(o.x, o.y);
  }

  const c = world.companion;
  if (c && c.state !== 'dead' && !c.inVehicle && minimapShows('companion')) icon('companion', c.x, c.y);
  // medespelers (samen spelen, #95): buiten beeld blijven ze als gekleurde pijl aan de rand staan
  const partnerEdges = [];
  for (const p of world.coopPartners || []) if (p.zichtbaar && !icon('partner', p.x, p.y, { kleur: p.kleur, vorm: p.vorm, angle: p.heading + mapRotation })) partnerEdges.push({ a: edgeAngle(p.x, p.y), kleur: p.kleur });

  forEachPoliceUnit(world, (x, y, kind) => icon(kind, x, y));
  forEachCashTarget(world, (x, y) => icon('cash', x, y));

  drawMapIcon(ctx, 'player', cx, cy, 1.8, { angle: player.angle + mapRotation });

  drawNorthIndicator(ctx, cx, cy, mapRotation - Math.PI / 2);

  const edgeR = MINIMAP_SIZE / 2 - 11;
  if (heroEdge != null) {
    drawEdgeArrow(ctx, cx + Math.cos(heroEdge) * edgeR, cy + Math.sin(heroEdge) * edgeR, heroEdge, C.greenLight, 0.9);
  }
  for (const e of partnerEdges) if (e.a != null) drawEdgeArrow(ctx, cx + Math.cos(e.a) * edgeR, cy + Math.sin(e.a) * edgeR, e.a, e.kleur, 0.9);
  if (jobEdge != null) {
    const s = 1 + (wp ? 0 : pulseAt(t) * 0.2);
    drawEdgeArrow(ctx, cx + Math.cos(jobEdge) * edgeR, cy + Math.sin(jobEdge) * edgeR, jobEdge, ROUTE_COLORS.job || JOB_TARGET_COLOR, wp ? 0.8 : s, 'job');
  }
  if (missionEdge != null) {
    const s = 1 + (wp ? 0 : pulseAt(t) * 0.2);
    drawEdgeArrow(ctx, cx + Math.cos(missionEdge) * edgeR, cy + Math.sin(missionEdge) * edgeR, missionEdge, C.yellow, wp ? 0.8 : s, 'mission');
  }
  if (heliEdge != null) {
    drawEdgeArrow(ctx, cx + Math.cos(heliEdge) * edgeR, cy + Math.sin(heliEdge) * edgeR, heliEdge, '#5dff7a', 1 + pulseAt(t) * 0.2, 'mission');
  }
  if (wpEdge != null) {
    const s = 1 + pulseAt(t) * 0.2;
    drawEdgeArrow(ctx, cx + Math.cos(wpEdge) * edgeR, cy + Math.sin(wpEdge) * edgeR, wpEdge, ROUTE_COLORS.user, s, 'user');
  }
}

// A heli run (helirun.js): its rings as circles where they hang, the H to land
// on and the balloon. Drawn through toScreen, so they stay put while the map turns.
const HELI_RING_COLORS = { next: '#ffc21a', later: 'rgba(255,233,160,0.75)', done: '#5dff7a', miss: '#ff5a3c' };
function drawHeliRunMarks(ctx, marks, toScreen, inRange, scale, t) {
  ctx.save();
  for (const r of marks.rings) {
    if (r.state === 'done' || r.state === 'miss' || !inRange(r.x, r.y)) continue;
    const [sx, sy] = toScreen(r.x, r.y);
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(4, 11 * scale) * (r.state === 'next' ? 1 + pulseAt(t) * 0.25 : 1), 0, Math.PI * 2);
    ctx.lineWidth = r.state === 'next' ? 3 : 2;
    ctx.strokeStyle = HELI_RING_COLORS[r.state] || HELI_RING_COLORS.later;
    ctx.stroke();
  }
  if (marks.pad && inRange(marks.pad.x, marks.pad.y)) {
    const [sx, sy] = toScreen(marks.pad.x, marks.pad.y);
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#1e9e56';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f0ede4';
    ctx.stroke();
    ctx.fillStyle = '#f0ede4';
    ctx.fillRect(sx - 3.5, sy - 4, 1.8, 8);
    ctx.fillRect(sx + 1.7, sy - 4, 1.8, 8);
    ctx.fillRect(sx - 3.5, sy - 0.9, 7, 1.8);
  }
  if (marks.balloon && inRange(marks.balloon.x, marks.balloon.y)) {
    const [sx, sy] = toScreen(marks.balloon.x, marks.balloon.y);
    ctx.beginPath();
    ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff7ab6';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#0c140e';
    ctx.stroke();
  }
  ctx.restore();
}

// The N badge sits on the square's edge, towards north.
function drawNorthIndicator(ctx, cx, cy, screenAngle) {
  const half = MINIMAP_SIZE / 2 - 17;
  const dx = Math.cos(screenAngle), dy = Math.sin(screenAngle);
  const t = Math.min(half / (Math.abs(dx) || 1e-6), half / (Math.abs(dy) || 1e-6));
  const x = cx + dx * t, y = cy + dy * t;
  const tf = ctx.getTransform();
  const dpr = Math.max(1, Math.round(Math.hypot(tf.a, tf.b)));
  if (!northGlyph || northGlyph.dpr !== dpr || (!northGlyph.font && document.fonts && document.fonts.check('bold 10px "Bebas Neue"'))) northGlyph = makeNorthGlyph(dpr);
  ctx.drawImage(northGlyph.c, x - 13, y - 13, 26, 26);
}

let northGlyph = null;
function makeNorthGlyph(dpr) {
  const c = document.createElement('canvas');
  c.width = c.height = 26 * dpr;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.beginPath();
  g.arc(13, 13, 12, 0, Math.PI * 2);
  g.fillStyle = '#0c140e';
  g.fill();
  g.lineWidth = 1.2;
  g.strokeStyle = '#3fc97a';
  g.stroke();
  g.fillStyle = '#3fc97a';
  g.font = '18px "Bebas Neue", "Arial Narrow", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('N', 13, 14);
  return { c, dpr, font: !!(document.fonts && document.fonts.check('bold 10px "Bebas Neue"')) };
}

function fillPoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

function mmHash(x, y) {
  const h = Math.sin(x * 91.3 + y * 197.1) * 27183.6;
  return h - Math.floor(h);
}

// We only have real polygon boundaries for 2 districts, but 66 named
// neighbourhood points with citywide coverage - and the HUD's "which wijk
// are you in" readout already answers that with "nearest named point", so
// sampling a coarse grid for nearest-point and drawing where the answer
// changes between neighbouring cells gives boundaries that agree with the
// HUD instead of showing unrelated administrative lines.
let borderCache = null; // {ox, oy, rects}
let borderCacheTimer = 0;
function drawNeighbourhoodBorders(ctx, dt, world, player, MM_RADIUS_M) {
  const points = world.map.meta.neighbourhoodPoints;
  if (!points || !points.length) return;
  const cell = 14; // meters
  const half = Math.ceil(MM_RADIUS_M / cell) + 1;
  const ox = Math.round(player.x / cell), oy = Math.round(player.y / cell);

  borderCacheTimer -= dt;
  if (!borderCache || borderCacheTimer <= 0 || borderCache.ox !== ox || borderCache.oy !== oy || borderCache.half !== half) {
    borderCacheTimer = 0.3;
    const rects = [];
    const width = half * 2 + 2;
    let prevRow = null;
    for (let gy = oy - half; gy <= oy + half; gy++) {
      const curRow = new Array(width);
      for (let gx = ox - half; gx <= ox + half; gx++) {
        const wx = gx * cell, wy = gy * cell;
        let best = -1, bestD2 = Infinity;
        for (let i = 0; i < points.length; i++) {
          const d2 = (points[i].x - wx) ** 2 + (points[i].y - wy) ** 2;
          if (d2 < bestD2) { bestD2 = d2; best = i; }
        }
        const col = gx - (ox - half);
        curRow[col] = best;
        const leftIdx = col > 0 ? curRow[col - 1] : best;
        const upIdx = prevRow ? prevRow[col] : best;
        if (best !== leftIdx || best !== upIdx) rects.push([wx - cell / 2, wy - cell / 2]);
      }
      prevRow = curRow;
    }
    borderCache = { ox, oy, half, rects };
  }

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (const [rx, ry] of borderCache.rects) ctx.fillRect(rx, ry, cell * 0.5, cell * 0.5);
}
