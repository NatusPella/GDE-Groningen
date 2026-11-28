import { glyphHtml } from './keycap.js';
import { setVisibleInterval } from './visibletimer.js';
import { toggleChoice } from './difficulty.js';
import { probe } from './hitchprobe.js';
import { iconInner, icoon } from './icons.js';
import { wantedPhase, wantedStatus, wantedAnnounce } from './wantedstate.js';
import { levelOf, cooldownOf, zoekBalkVulling, zoekTeller } from './wantedlevels.js';
import { telStap, bewegingUit, MI } from './microinteractions.js';
import { tikGetal } from './dsmicro.js'; // DS3: het geldgetal tikt even bij geld binnen (ds-micro.css, .ds-m-tik)
import { moneyLabel, moneyNeedsUpdate, weaponAmmoText } from './hudmoney.js';
import { getMissionLayer, updateMissionNotices } from './missionmaplive.js';
import { missionMinimapScale, selectMiniItems } from './missionmap.js';
import { drawMissionLayerIcon, drawLayerAreas, drawLayerLines } from './missionmapdraw.js';
import { pointInPolygon as pointInPoly } from './util.js';
import { dualHtml } from './subtitles.js';
import { simLevel } from './simload.js';
import { getGaragesForRender, lekkeBandGarage } from './garages.js';
import { getHomeForRender, getHomeGarageForRender, getHomeMooringForRender, getHomeHelipadForRender } from './home.js';
import { minimapShows } from './mapfilters.js';
import { borderSegments, BORDER_CELL } from './mapborders.js'; // #885: stabiele buurtgrenzen op de minikaart
import { tekenVeroverdMini, plekOnbezocht, kaartLaag as gebiedenLaag } from './gebiedenkaart.js';
import { pinBlijftInMist } from './kaartontdekking.js';
import { GLYPH_LIGHT as GLYPH_CREAM, mapCategory, mapFillColor, FLAT_INK, haloRim, HALO_DARK, HALO_LIGHT, mapPriority, miniIconScale, iconGapPx, badgeShape, badgeGlyphColor, shadeHex, stateLook, BADGE_UNITS, BADGE_GLYPH } from './mapicons.js';
import { facilitiesOf } from './facilities.js';
import { getHorecaForRender } from './horeca.js';
import { getShopsForRender, drawShopMapIcon, drawShopGlyph, storyTargetShop, drawStoryShopRing } from './shops.js';
import { SHOP_TYPES } from './shopdata.js';
import { getOwnedVehiclesForMap, eigenRandMarkers } from './ownedvehicles.js';
import { getPigeonSpotsForRender, drawPigeonMapIcon } from './pigeonspots.js';
import { getHeliSpotsForRender, drawHeliMapIcon, getHeliRunMarks } from './helirun.js';
import { getPadelSpotsForRender, drawPadelMapIcon } from './padel.js';
import { activityMapIcons, drawActivityMapIcon } from './activities.js';
import { isAreaHidden, onStreekOntdekt } from './explorationlive.js';
import { getPostgameSpotsForRender, drawPostgameMapIcon } from './postgame.js';
import { getOnderdeelSpotsForRender } from './onderdelenlive.js'; // #837
import { getWrakduikSpotsForRender } from './wrakduikenlive.js'; // #839
import { getStreekuitdagingSpotsForRender } from './streekuitdaginglive.js'; // #835
import { getStationsForRender, drawStationMapIcon } from './stationtravel.js';
import { liveBusMarks, roosterBusMarks, drawLiveBusMapIcon } from './busmap.js';
import { getSideJobSpotsForRender, drawSideJobMapIcon, JOB_TARGET_COLOR } from './sidejobs.js';
import { vehicleDisplayName } from './vehiclenames.js';
import { findEnterableVehicle, HERO_CAR_MODEL } from './vehicle.js';
import { tickLowHealth } from './lowhealth.js';
import { schadeFase, schadeLabel } from './vehicledamage.js';
import { cinematicAllowsDamageFx, isBannerUp, isCinematicActive, wijkBlurb } from './cinematics.js';
import { isMuted, engineReadout, toggleMute, playTimeWarning } from './audio.js';
import { timeWarning, timeWarningText } from './timewarn.js'; // #985
import { dempMelding } from './coopgeluid.js';
import { gearboxReadout } from './gearbox.js';
import { drawRailsOnMap, drawTrainsOnMap } from './railway.js';
import { drawCountryMinimap, villageLabels, syncMapPhase, miniTilesPending } from './countrymap.js';
import { markerIcoon } from './mapmarkers.js';
import { MINI_PALETTE as MINI_STYLE, EMPHASIS, INK, inkA, seaStyle, miniRoadStyle, MINI_RANGE_M, kaartTekst, labelHalo } from './mapstyle.js';
import { drawSea, drawOutside, regionLabels, regionEdgeLabels, areaNameAt, REGIONS } from './regions.js';
import { borderPlaceLabels } from './borderplaces.js';
import { worldPlaceLabels, worldPlacesReady, worldPlaceAt } from './worldplaces.js';
import { provinceMapOn } from './provincemap.js';
import { edgeDistance } from './countryfield.js';
import { streetAt as roadStreetAt } from './tileplace.js';
import { ommelandArea } from './ommelandplace.js';
import { districtAt } from './districtat.js';
import { ommelandMapSpots, drawOmmelandMapIcon } from './ommelandmap.js';
import { beppeMapSpot } from './beppe_garden.js';
import { perceelMapSpots, drawPerceelMapIcon } from './perceelmap.js';
import { singleEntryCache } from './hudcache.js';
import { minimapMoved, minimapRedrawDue } from './minimapcadence.js';
import { locatieLift, locatieHysterese, locatieVerschuiving, LOCATIE_GAP } from './hudlinks.js'; // #1141: de locatiekaart staat onderin en gaat alleen omhoog voor wat eronder komt
import { VILLAGES } from './ommelandlines.js';
import { getActiveRoute, getRouteAhead, getRoutes, getUserWaypoint, getCareRoute, formatDistance, landingSpots } from './routing.js';
import { getClockText } from './clocktext.js';
export { getClockText };
import { storyWaiting, missionOnMap, getGoal } from './goal.js';
import { resolveNavTargets, snapshotFromWorld, distanceFor, compactDistance, navColor, NAV_ROL, GLYPH } from './navtarget.js';
import { drawKompasRand, MAX_ANDEREN } from './navpijl.js';
import { MM_ONTDEK_MS } from './kaartontdekking.js';
import { enqueueNotice, runNoticeQueue } from './notifyqueue.js'; // alle meldingen langs de ene wachtrij (22-11)
import { setGhostBar, ring, pop, reducedMotion } from './motion.js';
import { renderSnapshot, PORTRAIT_ANGLE } from './vehiclepreview.js';
import { TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { initPrompts, updatePrompts, hintCount } from './prompts.js';
import { hudPixelRatio, sizeSquareCanvas, getUiScale, onUiScaleChange } from './uiscale.js';
import { initCards, updateCards } from './hudcards.js';
import { markerColors, onPaletteChange } from './a11y.js';
import { dsKleur } from './kaartkleuren.js';
import { sterTeken } from './a11ylogic.js';
import { drawMissionGlyph } from './missionicons.js';
import { drawMapGlyph, phosphorPaden } from './mapglyphs.js';
import { miniWind, windSterkte, windPijlHoek, windTekst } from './windmini.js';
import { decideHud, zones, hudNow, cardYields, vehnameBottom, P3, PLACE_SHOW, DEFER_MAX, GPS_NEAR, nowPlayingSeconds, storySubLine } from './hudrules.js';
import { goalTitle, travelMode } from './goaltext.js';
import { vehicleKind, speedoLook, meterLevel, hudEdge, distanceOwner, vehicleLabelOwner } from './hudlook.js';
import { nextTurn, turnText, etaText, dichtstbijDoel } from './hudgps.js';
import { airEtaText } from './airguide.js';
import { airCard, cutTitle } from './airguidecard.js'; // #1038: één kaart in de lucht, plaatsnaam en handeling
import { getAirNeed } from './airprofile.js';
import { gastDoelen } from './coopextra.js';
import { kaartDoelen, KAART_ANDER_ALPHA } from './coopmissie.js';
import { travelModeOf, roadAllowed, minimapScale, minimapTopSpeed, northUp, MINIMAP_MODE } from './roadaccess.js';
import { routeLook, CHEVRON_STAP, CHEVRON_MAAT, plekAlpha, plekBudget, volgSnelheid, zoomStap, naarZoom, naarHoek, backingPx, landMaat, landVerouderd, SPELER_PIJL, SPELER_SCHADUW, NOORD } from './minimapstyle.js';
import { hudDate } from './hudcalendar.js';
import { fmtTime } from './missionstats.js';
import { LANDMARK_LINES } from './placelines.js';
import { townProfile } from './stadsprofielen.js';
import { getSettings } from './settings.js';
import { physicalKey, keyName } from './controls.js';
import { controlHint, hintText, hintContext } from './controlhint.js'; // #824: compacte bedieningsregel in de doellijn
import { createPractice, trackPractice } from './firststeps.js'; // the first-goal line steps aside once the player can move
import { createNarrator } from './narration.js';
import { heldBack } from './narrative.js';
import { isPauseMenuOpen, openPauseMenu } from './pausestate.js';
import { bindMinimapOpen } from './minimaptap.js'; // #985
import { activeLocalMap } from './localmap.js'; // 24-11: binnen een veld, baan of circuit toont de minimap die plek
import { drawLocalMap, resetLocalMapDraw } from './localmapdraw.js';
let navVorig = null; // het doel dat vorig beeld actief was (navtarget.js HYSTERESE: geen flipperende pijl tussen twee gelijke doelen)
import { hudExpensiveDue, intervalDue } from './hudgate.js';
import { isOverlayHeld } from './overlayhold.js';
import { hoofdspeler } from './spelersregister.js';
import { getViewAnchor, easeAnchor, mapUpRotation } from './viewanchor.js'; // wat als jij telt: duif, heli, trein, voertuig of figuur (#1141)
import { maakWidget, zetAankondiger } from './regelwidget.js'; // #987: regel als icoon en meter (eierrit)
import { noticeBar } from './melding.js'; // #988: het aflopende balkje op de radiokaart
// portraits share the HUD's green (DESIGN_SYSTEM: no blue accents); speaker
// colours stay in subtitles
const HUD_ACCENT = INK.greenLight;

// the minimap's square, in HUD px (CSS --mm-size follows it)
const MINIMAP_SIZE = 250;
// #638: een totaalplafond voor de losse minimapiconen (de straten blijven zichtbaar).
const MM_ICON_BUDGET = 10;
let mmScale = 1.45;
let mmSkip = 0, mmDt = 0;
let mmMode = 'lopen';
let mmRot = null;
// 23-11 (minimapstyle.js): de gladgestreken snelheid voor de zoom, de zoomstand bij Beweging beperken, de apparaatpixels van het vak
let mmSpeed = NaN, mmZoomStap = 0, mmBoxPx = 0;
const mmEase = { heading: null, kind: null, t: 0 }; // zachte richting van de driehoek bij in- en uitstappen (viewanchor.js)

// Genre convention: purple for your own waypoint, yellow for missions, orange for
// side jobs, pink for care (food when hurt, a garage for your own damaged ride)
// filled from the palette (a11y.js: the colour-blind settings) below; kept
// as one object so importers always read the current colours
export const ROUTE_COLORS = { user: INK.routeUser, mission: INK.yellow, job: INK.routeJob, care: INK.routeCare };
// Each route kind also has its own pattern down the middle of the line and
// its own mark in the minimap's edge arrow, so they never differ by colour
// alone: verhaal/missie solid, jouw doel dashes, klus dots, opknappen dash-dot.
const ROUTE_DASH = { mission: null, user: [2.2, 1.6], job: [0.01, 1.7], care: [2.6, 1.2, 0.01, 1.2] };
export const routeLabel = (r) => (r.kind === 'user' ? 'Doel' : r.kind === 'job' ? 'Klus' : r.kind === 'care' ? (r.target && r.target.why === 'repair' ? 'Garage' : 'Opknappen') : 'Missie');

let els = null;
// #802: schermnarratie — een eigen aria-live-regio en een begrensde wachtrij
let narration = null;
const narrator = createNarrator();
let narrationUntil = 0;

const STAR_PATH = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z';
// Phosphor (icons.js): een bestaand <svg> krijgt viewBox 256 en de paden van een betekenisnaam.
const setIc = (svg, naam) => { svg.setAttribute('viewBox', '0 0 256 256'); svg.style.fill = 'currentColor'; svg.style.stroke = 'none'; svg.innerHTML = iconInner(naam); };
const TURN_ICON = { rechts: 'afslag_rechts', links: 'afslag_links', recht: 'pijl_omhoog' };

// The GPS card where there is no turn to give: the train (where to get off,
// where to change) and the air (altitude advice, the landing spot).
function modeCard(route, mode, me, map) {
  if (!route || route.remaining <= 30) return null;
  if (mode === 'ov' && route.uitstappen) {
    const change = route.changes && route.changes[0];
    return { title: `Uitstappen bij ${route.uitstappen.replace(/^Groningen\s+/, '')}`, sub: change ? `Overstappen bij ${change.replace(/^Groningen\s+/, '')}` : '' };
  }
  // in de lucht: een rechte lijn naar het doel; koers, peiling, tijd en hoogteadvies (airguide.js) in plaats van afslagen
  if (mode === 'lucht' && route.mode === 'fly' && route.target && me) {
    const c = airCard(me, route.target, { alt: route.alt, need: getAirNeed(), pads: map ? landingSpots(map) : [], placeAt: worldPlaceAt });
    return { title: c.title, sub: c.sub, dist: formatDistance(c.dist), eta: airEtaText(c.etaS), air: c };
  }
  if (mode === 'lucht' && route.alt) return { title: `Hoogte ± ${route.alt} m`, sub: route.landing ? `Landen: ${route.landing.name}` : '' };
  return null;
}
// #985 (eigenaar 20-11): the revs are a thin bar inside the speed card, not a separate big arc
const RPM_ARC = 'M7 7H193';
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

  // #802: schermnarratie leest statuswijzigingen voor via een eigen aria-live-regio
  narration = document.createElement('div');
  narration.className = 'hud-narration';
  narration.setAttribute('role', 'status');
  narration.setAttribute('aria-live', 'polite');
  narration.setAttribute('aria-atomic', 'true');
  root.appendChild(narration);

  // zone C: clock and date, stars, the search, money, weapon
  const topRight = document.createElement('div');
  topRight.className = 'hud-top-right';
  topRight.innerHTML =
    '<div class="hud-clock" role="timer" aria-label="Tijd in het spel"><span class="hud-special" hidden></span><span class="hud-date"></span><b class="hud-time"></b></div>' +
    '<div class="hud-wanted" role="img" hidden><div class="hw-status"><b class="hw-tekst"></b><div class="hud-search" hidden><i role="img" aria-label="Zoekgebied"><i></i></i></div></div></div>' +
    '<div class="hud-moneyrow"><span class="hud-money-delta"></span><span class="hud-money ds-m-tik"></span></div>' +
    '<div class="hud-weapon"></div>';
  root.appendChild(topRight);

  // zone H: speed, gear, revs (the vehicle's damage is in F)
  const speedo = document.createElement('div');
  speedo.className = 'hud-speedo';
  speedo.innerHTML = '<div class="sp-main"><b class="sp-val">0</b><span class="sp-unit">km/u</span><div class="sp-gears" role="img" aria-label="Versnelling"></div>' +
    `<svg class="sp-rpm" viewBox="0 0 200 14" preserveAspectRatio="none" role="img" aria-label="Toerental"><path class="rpm-bg" d="${RPM_ARC}"/><path class="rpm-zone" d="${RPM_ARC}" pathLength="100" stroke-dasharray="${100 - RPM_RED_AT} 100" stroke-dashoffset="${-RPM_RED_AT}"/>` + // ds3-uitzondering: toerentalboog, de dash-lengte volgt het toerental (meetgeometrie, geen icoon)
    `<path class="rpm-fill" d="${RPM_ARC}" pathLength="100" stroke-dasharray="0 100"/></svg>` +
    '<span class="sp-zender" hidden aria-label="Radiozender">' + icoon('muziek', { maat: 14 }) + '<b></b></span></div>'; // #988: de zender van het voertuig, licht kort op bij een wissel
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
  // zone B is one column: the objective (top), the route card under it; the place name hangs under the column (--hud-b-bottom).
  // The objective used to sit bottom centre; the owner moved it up (#985, 20-11) so the bottom row stays for the minimap, street and speed.
  const zoneB = document.createElement('div');
  zoneB.className = 'hud-zone-b';
  zoneB.appendChild(gps);
  root.appendChild(zoneB);

  const place = document.createElement('div');
  place.className = 'hud-place';
  place.setAttribute('aria-live', 'polite');
  place.innerHTML = '<div class="pl-kick"><i></i><span></span><i></i></div><b class="pl-name"></b><span class="pl-line"></span>';
  root.appendChild(place);

  // zone G: the objective, one at a time, over the subtitles
  const mission = document.createElement('div');
  mission.className = 'hud-mission';
  mission.setAttribute('aria-live', 'polite');
  mission.innerHTML = icoon('doel', { cls: 'hud-obj-icon' }) +
    '<div class="hud-obj-text"><div class="hud-mission-label"></div><div class="hud-mission-progress"></div><div class="hud-obj-keys" aria-label="Besturing" hidden></div><div class="hud-obj-regel" hidden></div></div><span class="hud-obj-dist"></span>';
  zoneB.insertBefore(mission, gps);

  // zone E: the radio station (an achievement goes first, hudcards.js)
  const nowPlaying = document.createElement('div');
  nowPlaying.className = 'hud-nowplaying';
  nowPlaying.setAttribute('aria-live', 'polite');
  nowPlaying.innerHTML = '<span class="np-ic">' + icoon('muziek') + '</span>' +
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
  // De plaatsnaam en de routekaart van zone B wijken voor de berichten van zone A (#463)
  watchZoneA(root, cards);
  watchZoneB(root, zoneB);

  // zone F: the minimap, the street, you (health, stamina, the vehicle's damage)
  const mmWrap = document.createElement('div');
  mmWrap.className = 'hud-minimap-wrap';
  const mmCanvas = document.createElement('canvas');
  mmWrap.appendChild(mmCanvas);
  // 23-11: de canvas krijgt precies de apparaatpixels van zijn vak (binnen de papieren rand is dat geen 250 HUD-px): zo hoeft de
  // browser niets te herschalen en blijven de lijnen scherp (minimapstyle.js backingPx). Eén meting per maatwissel, niet per beeld.
  if (typeof ResizeObserver === 'function') {
    try {
      const meet = (es) => {
        const e = es[es.length - 1];
        const d = e.devicePixelContentBoxSize && e.devicePixelContentBoxSize[0];
        mmBoxPx = d ? d.inlineSize : 0; // zonder apparaatmaat (Safari): de oude maat, want contentRect telt de CSS-zoom van de HUD niet overal gelijk
        mmPrev = null; // de volgende tekenbeurt mag meteen
      };
      try { new ResizeObserver(meet).observe(mmCanvas, { box: 'device-pixel-content-box' }); } catch (e) { new ResizeObserver(meet).observe(mmCanvas); }
    } catch (e) { /* zonder meting: CSS-maat keer verhouding */ }
  }
  // #1175: de sterren staan op de minimap, alleen bij 1 ster of meer; de schermlezer hoort één regel (de aria-label van de statuskaart)
  const mmSterren = document.createElement('div');
  mmSterren.className = 'hud-mm-sterren';
  mmSterren.hidden = true;
  mmSterren.setAttribute('aria-hidden', 'true');
  mmWrap.appendChild(mmSterren);
  root.appendChild(mmWrap);
  // #990: een nieuwe streek ontdekt (ook onderweg, kaart dicht): de rand van de minimap gloeit even op, geen beweging nodig
  let ontdekT = 0;
  // 22-11: de gloed wacht tot het laadscherm weg is (notifyqueue.js); meerdere streken tegelijk worden één gloed
  runNoticeQueue();
  onStreekOntdekt(() => {
    enqueueNotice('discovery', {
      key: 'minimap-ontdek',
      text: 'Je ontdekt een nieuwe streek',
      show: () => {
        mmWrap.classList.add('ontdek');
        clearTimeout(ontdekT);
        ontdekT = setTimeout(() => mmWrap.classList.remove('ontdek'), MM_ONTDEK_MS);
      },
    });
  });
  // #993: de buurtnaam als inktlabel onder de minimap; de rasterpatroon-defs is voor de lege wantedster
  const defsWrap = document.createElement('div');
  defsWrap.innerHTML = '<svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs><pattern id="hud-raster" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="0.9" style="fill: var(--ds-c-ink-inkt)"/></pattern></defs></svg>';
  root.appendChild(defsWrap.firstChild);
  // #985: een tik op de minikaart opent de kaart (op een telefoon stond die achter "Meer")
  mmWrap.setAttribute('role', 'button');
  mmWrap.setAttribute('aria-label', 'Kaart openen');
  bindMinimapOpen(mmWrap, () => openPauseMenu('map'), () => isPauseMenuOpen() || isCinematicActive());

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
        '<div class="hud-name-row"><div class="hud-character"></div><span class="hud-mate"><span class="hud-mate-txt"></span></span><div class="hud-status">' +
          '<span class="hud-chip drunk" role="status" hidden>' + icoon('dorst') + 'Aangeschoten</span>' +
          '<button type="button" class="hud-chip hud-mute" tabindex="-1" aria-label="Geluid staat uit" title="Geluid staat uit" hidden>' + icoon('geluid_uit', { maat: 'm' }) + '</button>' +
        '</div></div>' +
        '<div class="hud-meter hp" role="meter" aria-label="Gezondheid" aria-valuemin="0" aria-valuemax="100">' + icoon('hart_vol', { maat: 16, cls: 'hud-meter-ic' }) + '<div class="hud-bar"><div class="hud-bar-ghost"></div><div class="hud-bar-fill health"></div></div><b></b></div>' +
        '<div class="hud-meter ar" hidden role="meter" aria-label="Pantser" aria-valuemin="0" aria-valuemax="100">' + icoon('schild', { maat: 16, cls: 'hud-meter-ic' }) + '<div class="hud-bar"><div class="hud-bar-ghost"></div><div class="hud-bar-fill armor"></div></div><b></b></div>' +
        '<div class="hud-meter st" hidden role="meter" aria-label="Uithoudingsvermogen" aria-valuemin="0" aria-valuemax="100"><span class="hud-meter-ic" aria-hidden="true"></span><div class="hud-bar"><div class="hud-bar-fill stamina"></div></div></div>' +
        '<div class="hud-meter veh" hidden role="meter" aria-label="Voertuig" aria-valuemin="0" aria-valuemax="100">' + icoon('auto', { maat: 16, cls: 'hud-meter-ic veh-ic' }) + '<span class="veh-name"></span><div class="hud-bar"><div class="hud-bar-ghost"></div><div class="hud-bar-fill vehicle"></div></div></div>' +
      '</div>' +
    '</div>';
  fcol.appendChild(topLeft);
  // #881: de hoogte van de linkerkolom voor de vliegstand op een telefoon
  watchFlightColumn(root, fcol);
  watchLocatie(root, fcol, location, topLeft);

  els = {
    root,
    narration,
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
    mateTxt: topLeft.querySelector('.hud-mate-txt'),
    mateKey: '', portraitKey: '', portraitT: 0,
    drunk: topLeft.querySelector('.hud-chip.drunk'),
    idKey: '', hpKey: '', arKey: '', stKey: '', vehKey: '',
    mute: topLeft.querySelector('.hud-mute'),
    topRight,
    wanted: topRight.querySelector('.hud-wanted'),
    wantedStars: mmSterren,
    wantedText: topRight.querySelector('.hw-tekst'),
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
    objKeys: mission.querySelector('.hud-obj-keys'), // #824
    objRegel: mission.querySelector('.hud-obj-regel'), // #987: regelwidgets onder de doelregel
    rwEgg: null, rwEggen: null, rwA: NaN, rwB: NaN, rwC: NaN, rwD: NaN,
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
    channelChip: speedo.querySelector('.sp-zender'),
    channelText: speedo.querySelector('.sp-zender b'),
    channelName: '',
    channelIcon: 'muziek',
    channelAt: null,
    mmWrap,
    mmCanvas,
    mmCtx: mmCanvas.getContext('2d'),
    vis: {},
  };
  // De dempindicator is ook de knop (#434): wie de toets niet kent of geen
  // toetsenbord heeft (touch, een gast op een tablet), zet het geluid hier
  // weer aan. Daarna laat de knop de focus los, zodat Spatie weer springt.
  els.mute.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMute();
    els.mute.blur();
  });
  initPrompts(root);
  fitEdge(root);
  onUiScaleChange(() => fitEdge(root));
  watchRightStack(root, topRight, race, root.querySelector('.hud-vehname'), root.querySelector('.hud-cards'));
  watchInput();
}

// #1141 (eigenaar, 21-11): de locatiekaart (straat + plaats) staat standaard onderaan de kolom naast de minimap. Het speler-blok
// eronder (meters) houdt zijn ruimte ook als het verborgen is (hv-off is alleen doorzichtig), dus de kaart zweefde boven een
// lege plek. De regels staan in hudlinks.js; hier alleen het meten (bij een verandering, niet per frame) en het zetten van
// --hud-loc-y, de verschuiving die de CSS als `translate` op .hud-location toepast.
const LOCATIE_HINDERNIS = ['#banter-sub', '#radio-sub', '#story-talk', '#rv-sub'];
function watchLocatie(root, fcol, location, topLeft) {
  let staat = null, timer = 0, stroomH = 0, sig = '';
  const apply = (lift) => root.style.setProperty('--hud-loc-y', `${Math.round(locatieVerschuiving(stroomH, LOCATIE_GAP, lift))}px`);
  const wil = () => {
    const onder = [{ id: 'speler', h: stroomH, zichtbaar: !topLeft.classList.contains('hv-off') }];
    // ondertitels die boven de kaart uit zouden komen: alleen meten als er een zichtbaar is (de handtekening hieronder)
    const hindernissen = [];
    let kaart = null;
    for (const sel of LOCATIE_HINDERNIS) {
      const el = document.querySelector(sel);
      if (!el || el.style.opacity === '0' || el.style.display === 'none' || !el.style.opacity) continue;
      const r = el.getBoundingClientRect();
      if (r.height <= 0) continue;
      if (!kaart) {
        const k = location.getBoundingClientRect();
        const s = (root.getBoundingClientRect().height / (root.offsetHeight || 1)) || 1; // zoom van #hud (--ui)
        kaart = { x0: k.left, x1: k.right, bodem: fcol.getBoundingClientRect().bottom, s }; // bodem: de laagste plek van de kaart
      }
      hindernissen.push({ id: sel, x0: r.left, x1: r.right, top: r.top });
    }
    if (!kaart) return locatieLift({ onder }).lift;
    // alles in schermpixels gemeten: de gap en de uitkomst gaan via de zoom van #hud
    const l = locatieLift({ onder: onder.map((o) => ({ ...o, h: o.h * kaart.s })), hindernissen, kaart, gap: LOCATIE_GAP * kaart.s }).lift;
    return l / kaart.s;
  };
  const stap = () => {
    clearTimeout(timer);
    const r = locatieHysterese(staat, wil(), performance.now());
    staat = r.staat;
    apply(r.lift);
    if (r.wacht != null) timer = setTimeout(stap, Math.ceil(r.wacht) + 5);
  };
  const meet = () => { stroomH = topLeft.offsetHeight; stap(); };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => requestAnimationFrame(meet)).observe(topLeft);
  if (typeof MutationObserver !== 'undefined') new MutationObserver(stap).observe(topLeft, { attributes: true, attributeFilter: ['class'] });
  // ondertitels komen en gaan zonder maatwijziging van de kolom: een lichte controle van hun stijl (geen layout), meten bij een wissel
  setVisibleInterval(() => { // 22-11: niet tikken terwijl het venster verborgen is
    const s2 = LOCATIE_HINDERNIS.map((q) => { const el = document.querySelector(q); return el ? el.style.opacity + el.textContent.length : ''; }).join('|');
    if (s2 !== sig) { sig = s2; stap(); }
  }, 250);
  meet();
}

// The HUD's margin to the screen edge: title-safe on a TV, tight on 720p (hudlook.js)
function fitEdge(root) {
  root.style.setProperty('--hud-edge', hudEdge(window.innerWidth, window.innerHeight, getUiScale()) + 'px');
}

// De onderkant van de berichten van zone A, in HUD px: zone B (de plaatsnaam en
// de routekaart) hangt aan dezelfde bovenrand en zou er op een smal scherm onder
// schuiven (#463: "GROTE MARKT" achter de TIP-kaart, en de ACHTERVOLGING-kaart
// over de routetitel). De melding gaat voor (hudrules.js), dus zone B tilt op tot
// onder de gemeten kaart: hud_panel.css gebruikt --hud-a-bottom in de top van
// .hud-place en --hud-gps-top voor de routekaart. Alleen op een smal scherm
// meten: daar is de kaartkolom een groot deel van de breedte; op de
// bureaubladindeling staat de melding links en zone B in het midden, en blijft
// alles zoals het was. Zonder kaart is de kolom 0 px hoog en gaan de variabelen
// weg. De plaatsnaam beslaat de volle breedte en schuift dus altijd op; de
// routekaart staat in het midden en wijkt alleen als de kolom hem werkelijk raakt.
// #985: de onderkant van zone B (doel + routekaart) in HUD px, voor de plaatsnaam (hud_panel.css) en de plaatskaart (bigmoment.js).
function watchZoneB(root, zoneB) {
  if (typeof ResizeObserver === 'undefined') return;
  const place = () => root.style.setProperty('--hud-b-bottom', `${Math.ceil(zoneB.offsetTop + zoneB.offsetHeight)}px`);
  const ro = new ResizeObserver(() => requestAnimationFrame(place)); // not in the observer callback itself: "ResizeObserver loop" errors
  ro.observe(zoneB);
  place();
}
const NARROW = 1024;
const TOP_GAP = 12;
function watchZoneA(root, cards) {
  if (typeof ResizeObserver === 'undefined') return;
  // zone A heeft twee stapels op dezelfde plek: de berichtkaarten (hudcards.js)
  // en de telefoonfeed met binnenkomende berichten (phonefeed.js, staat er al
  // voor initHud). De hoogste bepaalt waar zone B begint.
  const feed = root.querySelector('.phonefeed');
  const gps = root.querySelector('.hud-zone-b');
  const place = () => {
    if (window.innerWidth > NARROW) {
      root.style.removeProperty('--hud-a-bottom');
      root.style.removeProperty('--hud-gps-top');
      return;
    }
    let bottom = 0, right = 0;
    for (const el of [cards, feed]) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.height > 0) { bottom = Math.max(bottom, el.offsetTop + el.offsetHeight); right = Math.max(right, r.right); }
    }
    if (bottom > 0) root.style.setProperty('--hud-a-bottom', `${Math.ceil(bottom)}px`);
    else root.style.removeProperty('--hud-a-bottom');
    // de routekaart is smaller en staat gecentreerd (translateX): zijn gemeten
    // linkerkant telt, niet offsetLeft, want dat ziet de transform niet. Hij
    // wijkt alleen voor een kolom die tot over die linkerkant komt, zodat de
    // routebanner in landschap blijft staan waar de kaart hem niet raakt.
    if (bottom > 0 && gps && right + 8 > gps.getBoundingClientRect().left) root.style.setProperty('--hud-gps-top', `${Math.ceil(bottom + TOP_GAP)}px`);
    else root.style.removeProperty('--hud-gps-top');
  };
  const ro = new ResizeObserver(place);
  ro.observe(cards); // een kaart erbij of eraf is een maatwijziging van de kolom
  if (feed) ro.observe(feed);
  if (gps) ro.observe(gps); // een andere routetitel kan de kaart breder maken
  ro.observe(root); // een draai of een ander venster kan de smalle grens passeren
  place();
}

// The right column flows under the top-right block: the race panel sits just
// below it and the story phone (storycontact.js) below both, via
// --hud-tr-bottom and --hud-stack-top (HUD px, so the uiscale zoom holds).
function watchRightStack(root, topRight, race, vehName, cards) {
  if (typeof ResizeObserver === 'undefined') return;
  const GAP = 8;
  const place = () => {
    const trBottom = topRight.offsetTop + topRight.offsetHeight;
    const stack = race.hidden ? trBottom : trBottom + GAP + race.offsetHeight;
    root.style.setProperty('--hud-tr-bottom', `${trBottom}px`);
    root.style.setProperty('--hud-stack-top', `${stack + GAP + 2}px`);
    // #854: het vliegschool-/minigamebord reserveert de echte zone C-kolom.
    // Via getBoundingClientRect (niet offsetWidth), want de kolom kan in een
    // gezoomde/verschoven context staan; de maten gaan terug naar HUD-px.
    const scale = getUiScale();
    const trRect = topRight.getBoundingClientRect();
    root.style.setProperty('--hud-c-width', `${Math.max(0, Math.round(trRect.width / scale))}px`);
    root.style.setProperty('--hud-c-right', `${Math.max(0, Math.round((window.innerWidth - trRect.left) / scale))}px`);
    // #638: de voertuignaam in dezelfde gemeten kolom: boven het racepaneel, niet op een vaste 300 px.
    const bottom = race.hidden ? null : vehnameBottom({ raceTop: race.getBoundingClientRect().top, viewH: window.innerHeight, gap: GAP });
    if (bottom != null && cards && !cards.classList.contains('hc-held')) root.style.setProperty('--hud-vehname-bottom', `${bottom}px`);
    else root.style.removeProperty('--hud-vehname-bottom');
    // #985: op een laag venster (1024x600) lag de toetshintstapel (.hud-ctx) over de naamkaart: de naamkaart hangt erboven
    const ctx = root.querySelector('.hud-ctx');
    if (ctx && !ctxGezien) { ro.observe(ctx); ctxGezien = true; }
    const cr = ctx ? ctx.getBoundingClientRect() : null;
    const boven = cr && cr.height > 0 ? vehnameBottom({ raceTop: cr.top, viewH: window.innerHeight, gap: GAP }) : null;
    if (boven != null) root.style.setProperty('--hud-vehname-ctx', `${Math.round(boven / scale)}px`);
    else root.style.removeProperty('--hud-vehname-ctx');
  };
  let ctxGezien = false;
  const ro = new ResizeObserver(() => requestAnimationFrame(place));
  ro.observe(topRight);
  ro.observe(race);
  if (vehName) ro.observe(vehName);
  place();
  // #854: de eerste meting kan vallen voordat zone C zijn definitieve breedte
  // heeft (letters/fonts); meet daarom ook na de eerste layout nog een keer.
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => { place(); requestAnimationFrame(place); });
}

// #881: in portret staat het vliegtuigpaneel boven de rechterknoppen, maar de
// linkerkolom (straatnaam, gezondheid) schuift in portret boven de linkerknoppen
// en kan daardoor op dezelfde hoogte komen. We meten de bovenkant van die kolom
// in HUD-px vanaf de onderkant van #hud (--hud-f-top), zodat touch.js het paneel
// daar precies boven kan zetten.
function watchFlightColumn(root, fcol) {
  if (typeof ResizeObserver === 'undefined') return;
  const place = () => {
    const top = root.clientHeight - fcol.offsetTop;
    if (top > 0) root.style.setProperty('--hud-f-top', `${Math.ceil(top)}px`);
    else root.style.removeProperty('--hud-f-top');
  };
  const ro = new ResizeObserver(place);
  ro.observe(fcol);
  ro.observe(root);
  place();
}

// De prestatiekaart wijkt voor een hint die hij zou raken (#463, hudrules.js
// cardYields): de kaart van achievements.js hangt boven het midden, precies
// waar een interactiehint van prompts.js kan staan. Alleen kijken als er een
// kaart staat -- dat is een paar seconden per prestatie, niet elke ronde -- en
// dan een keer per 0,2 s, want een hint schuift met de speler mee.
let achYieldT = 0;
function updateAchievementCard(root, dt) {
  if ((achYieldT -= dt) > 0) return;
  achYieldT = 0.2;
  const card = root.querySelector('.ach-toast.on');
  if (!card) { root.classList.remove('hud-ach-yield'); return; }
  const hints = document.body.classList.contains('hide-hints') ? [] : [...root.querySelectorAll('.hud-prompts:not(.off) .wp.in .wp-chip')];
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom } : null;
  };
  root.classList.toggle('hud-ach-yield', cardYields(box(card), hints.map(box)));
}

// De cabine van de trein (treincabine.js, zone H) staat op de bodem van het
// scherm: breder en hoger dan de snelheidsmeter, en precies onder het doel van
// zone G. We meten hoe hoog die band is (de cabine, en de uitleg die erbij
// hoort) en zetten dat in --hud-g-floor, waar hud_panel.css het doel boven tilt
// (#463). Alleen meten als er een trein bestuurd wordt: geen layout lezen in de
// gewone ronde.
let trainBand = null; // { ro, cab, intro }
function updateTrainBand(root) {
  if (typeof ResizeObserver === 'undefined') return;
  if (!document.body.classList.contains('tc-on')) {
    if (trainBand) { trainBand.ro.disconnect(); trainBand = null; root.style.removeProperty('--hud-g-floor'); }
    return;
  }
  if (trainBand && trainBand.cab.isConnected) return;
  const cab = root.querySelector('.tc-cab');
  if (!cab) return; // de cabine wordt pas bij het instappen gebouwd
  const intro = root.querySelector('.tc-intro');
  if (trainBand) trainBand.ro.disconnect(); // een nieuwe cabine: opnieuw kijken
  const ro = new ResizeObserver(() => placeTrainBand(root));
  ro.observe(root); ro.observe(cab);
  if (intro) ro.observe(intro); // de uitleg komt en gaat; dat is een maatwijziging
  trainBand = { ro, cab, intro };
  placeTrainBand(root);
}

// De bovenkant van de treinband in HUD px vanaf de onderkant van #hud: de
// hoogste van de cabine en de uitleg erboven. Een verborgen element telt niet
// mee (offsetHeight 0), want die staat op 0 en zou het hele scherm als band
// opeisen.
function placeTrainBand(root) {
  if (!trainBand) return;
  const h = root.clientHeight;
  let floor = 0;
  for (const el of [trainBand.cab, trainBand.intro]) {
    if (el && el.isConnected && el.offsetHeight > 0) floor = Math.max(floor, h - el.offsetTop);
  }
  root.style.setProperty('--hud-g-floor', `${Math.max(0, Math.ceil(floor))}px`);
}

// Restarts a CSS animation: the class goes off now and back on next frame,
// so the style recalc in between restarts it. (Reading offsetWidth instead
// forced a full layout in the middle of the frame: 2-10 ms on a busy HUD.)
function restartClass(el, cls, still = () => true) {
  el.classList.remove(cls);
  requestAnimationFrame(() => { if (still()) el.classList.add(cls); });
}

const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };

// Betekenisnamen (icons.js) per voertuigsoort.
const VEH_ICONS = { car: 'auto', bus: 'bus', bike: 'fiets', scooter: 'scooter', boat: 'boot', horse: 'paard', heli: 'helikopter', plane: 'vliegtuig' };

// Genre convention: the model name shows for a moment when you get into a vehicle
let vehNameFor = null;
let vehNameTimer = 0;
function updateVehicleName(dt, world) {
  const v = hoofdspeler(world).inVehicle || null;
  if (v !== vehNameFor) {
    vehNameFor = v;
    if (v) {
      const { make, model } = vehicleDisplayName(v);
      els.vehName.querySelector('small').textContent = make;
      els.vehName.querySelector('b').textContent = model;
      setIc(els.vehName.querySelector('.vn-ic'), VEH_ICONS[v.isPlane ? 'plane' : v.isHeli ? 'heli' : v.isBoat ? 'boat' : v._mount === 'horse' ? 'horse' : v.isBike ? 'bike' : v.isScooter ? 'scooter' : v.isBus ? 'bus' : 'car']);
      vehNameTimer = 4.5;
      restartClass(els.vehName, 'on', () => vehNameFor === v);
    } else {
      vehNameTimer = 0;
    }
  }
  setVehMeterIcon(v);
  els.vehRow.classList.toggle('no-label', vehicleLabelOwner({ nameCardVisible: vehNameTimer > 0 }) === 'card');
  if (vehNameTimer > 0) {
    vehNameTimer -= dt;
    if (vehNameTimer <= 0) els.vehName.classList.remove('on');
  } else if (!v) els.vehName.classList.remove('on');
}

// De dempindicator (#434): alleen zichtbaar als het geluid uit staat. #966: geen
// toetsenhint meer in de HUD (radio en dempen staan in de instellingen); het
// luidsprekertje zelf blijft de knop om het weer aan te zetten.
let muteHint = '';
function updateMute() {
  const demp = isMuted();
  els.mute.hidden = !demp;
  if (!demp) return;
  const touch = document.documentElement.classList.contains('touch-device');
  const label = dempMelding(true, { touch });
  if (label === muteHint) return;
  muteHint = label;
  els.mute.title = label;
  els.mute.setAttribute('aria-label', label);
}

// #898 / #985 (eigenaar, 20-11): de totale voortgang ("N% klaar") staat niet meer in de HUD; hij staat in Spel > Overzicht en in het savegame-overzicht
// (progresslive.js, dezelfde bron). Het welkom-terugbericht met het cijfer is daarmee ook weg.

// #802: statusaankondigingen voor de schermnarratie. Alleen als de instelling
// aan staat, en begrensd door de wachtrij in narration.js.
function announce(text) {
  if (!getSettings().screenNarration) return;
  narrator.push(text);
}

function tickNarration() {
  const now = nowS();
  if (narrationUntil && now > narrationUntil) {
    if (narration) narration.textContent = '';
    narrationUntil = 0;
  }
  if (!getSettings().screenNarration) { narrator.clear(); return; }
  const text = narrator.next(now);
  if (text && narration) {
    narration.textContent = text;
    narrationUntil = now + Math.max(3.5, text.length * 0.06);
  }
}

export function updateHud(dt, world) {
  // #804: met PERF_HUD_MARKS splitst de hitchprobe de HUD in fasen (minimap is
  // de grootste verdachte op spoor); zonder de vlag blijft het beeld identiek.
  const hm = typeof window !== 'undefined' && !!window.__perfHudMarks;
  if (hm) probe.split();
  // #659: achter het pauzemenu is de HUD onzichtbaar; dan het dure werk overslaan
  const expensive = hudExpensiveDue(isPauseMenuOpen());
  sense(dt, world);
  updateVehicleName(dt, world);
  updateCharacter(dt, world);
  updateBars(world);
  updateMute();
  updateWanted(world);
  updateMoneyWeapon(dt, world);
  updateClock(world);
  updateDamage(dt, world);
  updateSpeedo(world);
  if (expensive) updateSpeedoPrefetch(dt, world);
  updateTrainBand(els.root);
  updateMission(dt, world);
  updateGps(dt, world);
  updatePlace(dt, world);
  updateRaceHud(world);
  updateCards(dt, world);
  if (expensive) updateAchievementCard(els.root, dt);
  updateNowPlaying(dt, world);
  updateChannelChip(dt, world);
  updateLocation(dt, world);
  updatePrompts(dt, world);
  updateVisibility(dt, world);
  tickNarration();
  if (hm) probe.mark('hud:base');
  // very CPU-bound (simload.js level 2): the minimap redraws every second
  // frame, its zoom easing over the time in between. It turns with the
  // player, so a lower rate shows as stutter; the whole HUD costs ~1 ms.
  if (!expensive) return; // #659: geen minimap achter het pauzemenu
  mmDt += dt;
  if (mmSkip-- > 0) return;
  // a redraw that costs a lot (vector map of the whole province) gets at most a quarter of the time: measured on
  // hoog the minimap took 5 to 14% of the busy main thread (docs/PERF-METING-2026-10-19.md)
  const mmNow = performance.now();
  // Op een dure kaart de cadans echt kostenproportioneel maken: een redraw van
  // 5-12 ms mag hooguit ~10% van het frame kosten, anders zakt de kaart naar
  // 10-15 fps in plaats van de vaste 20 fps-vloer. (#804, P7)
  // De cadans hangt ook af van beweging: een stilstaande kaart (speler staat, geen rotatie of
  // zoom-easing) tekent op een rustige cadans (minimapcadence.js), een bewegende houdt zijn tempo.
  const mmP = hoofdspeler(world);
  const mmA = getViewAnchor(world, { body: mmP });
  const mmCur = { x: mmA.x, y: mmA.y, yaw: mmA.upYaw };
  const mmMoved = minimapMoved(mmPrev, mmCur, mmSettling);
  if (!minimapRedrawDue(mmNow, mmLastAt, mmCostMs, mmMoved)) return;
  mmPrev = mmCur;
  mmSkip = simLevel() >= 2 ? 1 : 0;
  if (els.vis.minimap !== false) { drawMinimap(mmDt, world); mmCostMs = mmCostMs * 0.7 + (performance.now() - mmNow) * 0.3; }
  if (hm) probe.mark('hud:minimap');
  mmLastAt = mmNow;
  mmDt = 0;
}

// --- what the HUD knows about the moment (hudrules.js decides from it) -------

const S = {
  lastInput: 0, wantedOff: -Infinity, moneyAt: -Infinity, moneySign: 0, moneyHeld: null,
  weaponAt: -Infinity, hpAt: -Infinity, stAt: -Infinity, vehAt: -Infinity, hurtAt: -Infinity, fightAt: -Infinity,
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
  const p = hoofdspeler(world);
  if (world.wanted > 0) S.wantedOff = Infinity;
  else if (S.wantedOff === Infinity) S.wantedOff = now;
  // the pause menu or a moving controller stick: everything back for a moment
  const pause = isPauseMenuOpen();
  if (pause !== S.wasPause) {
    S.wasPause = pause; S.lastInput = now;
    // #985 punt 18: Slim toont geld alleen vlak na een transactie; na het sluiten van het menu
    // (waar je Overzicht en je saldo bekeek) blijft het saldo even staan, ook zonder transactie
    if (!pause) S.moneyAt = now;
  }
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
  const p = hoofdspeler(world);
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
    wanted: world.wanted,
    moneyAgo: now - S.moneyAt, moneySign: S.moneySign, nearShop: S.nearShop, moneyHeld: S.moneyHeld != null,
    armed: !!world.weapon && world.weapon !== 'fists', fighting: now - S.fightAt < 5, weaponAgo: now - S.weaponAt,
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
  const p = hoofdspeler(world);
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
  const { x, y } = hoofdspeler(world);
  const meta = world.map.meta;
  // out in the real Ommelanden: the village you are in, else just Ommeland
  const area = ommelandArea(x, y);
  if (area) return areaNameAt(x, y).name;
  // The ~66 named neighbourhood/quarter points give a genre-style district name ("Binnenstad", "Ebbingekwartier", ...), but
  // only where the player really is in the city (districtat.js): outside it the nearest point of the city is no wijk (before,
  // a spot in Winsum or on the A7 was "Paddepoel-Noord"). Out of the city and the wijken it is the place or Ommeland.
  const wijk = districtAt(meta.neighbourhoodPoints || [], x, y);
  if (wijk) return wijk.name;
  for (const d of meta.districts || []) {
    for (const ring of d.rings) {
      if (pointInPoly(x, y, ring) && !(meta.neighbourhoodPoints || []).length) return d.name;
    }
  }
  return areaNameAt(x, y).name;
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
  const wijk = districtAt(world.map.meta.neighbourhoodPoints || [], x, y);
  const best = wijk ? wijk.name : '';
  if (!best) { const a = areaNameAt(x, y); return { name: a.name || 'Grunn', country: false, district: a.name || '', line: townTeaser(a.name) }; }
  return { name: best, country: false, district: best, line: wijkBlurb(best) };
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
  const h = hoofdspeler(world); // de plek van de speler van dit apparaat; de HUD hoort bij wie hier kijkt (#446)
  const area = ommelandArea(h.x, h.y);
  const country = !!area;
  const rp = world.map.nearestRoadPoint(h.x, h.y, 60, false);
  const street = (rp && rp.road && rp.road.name) || (edgeDistance(h.x, h.y) > 0 ? roadStreetAt(world.map, h.x, h.y) : '');
  locWhere = { district: district || '', country, region: area ? areaNameAt(h.x, h.y).region : '' };
  // the street big, the wijk (or village) and the city under it
  setText(els.street, street || district || '');
  // plaats + wijk: a district of a town out in the province names its town
  const aname = area ? areaNameAt(h.x, h.y) : null;
  const region = aname ? (aname.near ? aname.name : aname.sub || (aname.region === 'groningen' ? 'Ommeland' : aname.name)) : 'Ommeland';
  setText(els.district, street ? [district, country ? (district === 'Ommeland' ? '' : region) : 'Stad'].filter(Boolean).join(' · ') : (country ? region : 'Stad'));
}

// --- zone B: a new place, big for a moment ---------------------------------------

const placeState = { on: false, t: 0, shown: new Map(), last: '', lastAt: -Infinity, pendingAt: 0, pending: null };
const PLACE_GAP = 20;
const PLACE_AGAIN = 600;
const LANDMARK_R = 55;
let placeScanT = 0;

function placeCandidate(world) {
  const p = hoofdspeler(world);
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
  // #993: een stadswijk staat al als label onder de minimap; een eigen kaart ernaast zou de naam dubbel tonen
  return null;
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
  // #802: de plaatsnaam een keer voorlezen
  announce(c.kick ? `${c.kick}. ${c.name}` : c.name);
  restartClass(els.place, 'on', () => placeState.on);
}

// --- zone B: the GPS card ---------------------------------------------------------

const gpsState = { turn: null, card: null, timer: '', t: 0 };
const gpsAfter = singleEntryCache((map, p) => map.nearestRoadPoint(p[0], p[1], 25, false));
let gpsMapSeen = null;
function updateGps(dt, world) {
  if ((gpsState.t -= dt) > 0) return;
  gpsState.t = 0.2;
  const o = lastObjective;
  gpsState.timer = o && o.timer ? o.timer : '';
  const p = hoofdspeler(world);
  const mode = travelModeOf(world);
  const route = getActiveRoute();
  let turn = null;
  // a turn card only in a vehicle on the roads, with a route, near a turn
  if (route && (mode === 'auto' || mode === 'fiets' || mode === 'boot') && route.remaining > 30) {
    const ahead = getRouteAhead(GPS_NEAR + 20, route);
    turn = nextTurn(ahead, GPS_NEAR);
  }
  gpsState.turn = turn;
  const v0 = p.inVehicle;
  const card = turn ? null : modeCard(route, mode, mode === 'lucht' ? { x: v0 ? v0.x : p.x, y: v0 ? v0.y : p.y, z: v0 ? v0.z || 0 : p.gz || 0, angle: v0 ? v0.angle : p.angle, speed: v0 ? v0.speed : 0 } : null, world.map);
  gpsState.card = card;
  els.gps.classList.toggle('is-air', !!(card && card.air));
  // de kaart volgt de kleur van de route die hij uitlegt (geel autoroute, paars eigen doel): dezelfde bron als de boog op de minimap (navtarget.js)
  els.gps.style.setProperty('--nav-doel', route ? ROUTE_COLORS[route.kind] || '' : '');
  if (!turn && !card && !gpsState.timer) return;
  let key = gpsState.timer;
  if (turn) {
    // de opzoeking per afslag onthouden; dezelfde afslag komt elke 0,2 s terug
    if (gpsMapSeen !== world.map) { gpsAfter.clear(); gpsMapSeen = world.map; }
    const after = turn.after ? gpsAfter(turn.after[0] + ',' + turn.after[1], world.map, turn.after) : null;
    const street = after && after.road && after.road.name ? after.road.name : '';
    // where it goes is on the objective card below; the turn card says the street
    const sub = street;
    const v = p.inVehicle;
    const title = turnText(turn);
    key += '|' + title + '|' + sub + '|' + formatDistance(route.remaining);
    if (key === els.gpsKey) return;
    setIc(els.gpsArrow, TURN_ICON[turn.side]);
    els.gpsIcon = '';
    setText(els.gpsTitle, title);
    setText(els.gpsSub, sub);
    setText(els.gpsDist, formatDistance(route.remaining));
    setText(els.gpsEta, etaText(route.remaining, v ? v.speed : 0, route.mode || (mode === 'fiets' ? 'bike' : 'drive'), route));
  } else if (card) {
    key += `|${card.title}|${card.sub}|${card.dist || formatDistance(route.remaining)}|${card.eta || ''}`;
    // in de lucht draait de pijl mee met je koers (0 = recht vooruit); bij een U-bocht staat er een omdraai-icoon.
    // De hoek volgt elk tikje, ook als de tekst gelijk blijft; een andere handeling laat de kaart even oplichten (<= 250 ms).
    const air = card.air;
    if (air) {
      if (air.icon !== els.gpsIcon) { setIc(els.gpsArrow, air.icon); els.gpsIcon = air.icon; }
      els.gpsArrow.style.setProperty('--gps-hoek', `${Math.round(air.deg)}deg`);
      if (air.key !== els.gpsAirKey) { els.gpsAirKey = air.key; els.gps.classList.remove('wissel'); void els.gps.offsetWidth; els.gps.classList.add('wissel'); }
    }
    if (key === els.gpsKey) return;
    if (!air) { setIc(els.gpsArrow, TURN_ICON.recht); els.gpsIcon = ''; }
    setText(els.gpsTitle, card.title);
    setText(els.gpsSub, card.sub);
    setText(els.gpsDist, card.dist || formatDistance(route.remaining));
    setText(els.gpsEta, card.eta || etaText(route.remaining, 0, route.mode || 'drive', route));
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
  const ch = hoofdspeler(world).character === 'anita' ? 'anita' : 'tammo';
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

// #985: the vehicle meter's icon follows the kind of vehicle (car, bike, boat, plane, scooter), like the name card on the right
function setVehMeterIcon(v) {
  const naam = !v ? 'auto' : v.isPlane || v.isHeli ? 'vliegtuig' : v.isBoat ? 'boot' : v._mount === 'horse' ? 'auto' : v.isBike ? 'fiets' : v.isScooter ? 'scooter' : v.isBus ? 'bus' : 'auto';
  if (els.vehIcKey === naam) return;
  els.vehIcKey = naam;
  const el = els.vehRow.querySelector('.veh-ic');
  if (el) el.outerHTML = icoon(naam, { maat: 16, cls: 'hud-meter-ic veh-ic' });
}

// "Tessa rijdt mee": the companion for screen readers only (hud-mate-txt is visually hidden). The card shows one character, the one you play
// (hoofdspeler: a Samen spelen guest sees their own figure); a second portrait next to the name was removed on 20-11 (#985).
function updateMate(world) {
  const c = world.companion;
  const p = hoofdspeler(world);
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
    // #802: alleen bij een overgang, niet bij elk procentpunt
    const was = S.hpLevel;
    S.hpLevel = lvl;
    if (was !== undefined && lvl !== was && hp > 0) {
      if (lvl !== 'ok') announce(lvl === 'crit' ? 'Gezondheid kritiek' : 'Gezondheid laag');
      else if (was !== 'ok') announce('Gezondheid weer op peil');
    }
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
  const v = hoofdspeler(world).inVehicle;
  const vh = v && Number.isFinite(v.health) ? Math.round(clampPct(v.health)) : null;
  const vFase = vh == null ? 'heel' : schadeFase(v, v.model ? v.model.len : 4, v.model ? v.model.wid : 2);
  const vKey = vh == null ? '' : (v.id || '') + ':' + vh + ':' + vFase;
  if (vKey !== els.vehKey) {
    const fresh = !els.vehKey || els.vehKey.split(':')[0] !== String(v ? v.id || '' : '');
    const vNaam = vh == null ? '' : vehicleDisplayName(v).model || 'Voertuig';
    els.vehKey = vKey;
    els.vehRow.hidden = vh == null;
    if (vh != null) {
      setText(els.vehLabel, schadeLabel(vNaam, vFase)); // de fase ("Rookt") staat erbij zodra het niet meer heel is (#985)
      if (fresh) S.vehAt = -Infinity; else S.vehAt = nowS();
      setGhostBar(els.vehFill, els.vehFill.previousElementSibling, vh);
      els.vehRow.setAttribute('aria-valuenow', vh);
      els.vehRow.classList.toggle('hurt', vh <= 35);
    }
  }
}

const STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;
let wantedKey = '';
let wantedShown = 0;
let wantedChangedT = 0;
// the police icons on the maps flash only while you are wanted; otherwise they sit still (blue)
let policeAlert = false;
function updateWanted(world) {
  const ster = Math.max(world.wanted | 0, world.coopHudWanted | 0); // samen spelen: de sterren van een gezochte gast staan ook in het scherm van de host (#434)
  policeAlert = ster > 0;
  const pol = world.police;
  const phase = wantedPhase(world);
  const searching = phase === 'zoeken';
  // the search box: how far you are out of the search area (and how long until a star drops)
  if (searching && world.wanted > 0 && pol.searchCenter) {
    const h = hoofdspeler(world);
    const d = Math.hypot(h.x - pol.searchCenter.x, h.y - pol.searchCenter.y);
    const k = zoekBalkVulling(d, pol.searchRadius, world.wantedDecayTimer, cooldownOf(levelOf(Math.max(1, world.wanted | 0))));
    const w = Math.round(k * 50) * 2 + '%';
    if (els.searchBar.style.width !== w) els.searchBar.style.width = w;
  }
  els.search.hidden = !(searching && world.wanted > 0);
  const key = ster + (searching ? 's' : '');
  els.mmWrap.classList.toggle('wanted', ster > 0);
  els.mmWrap.classList.toggle('chase', ster > 0 && !searching); // #1080: de rand pulseert rustig, alleen tijdens de achtervolging
  if (key === wantedKey) return;
  wantedKey = key;
  const wasSter = wantedShown;
  if (!els.wantedStars.children.length) els.wantedStars.innerHTML = STAR.repeat(5);
  const stars = [...els.wantedStars.children];
  els.wanted.hidden = ster === 0; // #1080: de statuskaart is er alleen als je gezocht wordt
  els.wantedStars.hidden = ster === 0; // #1175: de sterren op de minimap ook niet bij 0
  els.wantedStars.dataset.n = sterTeken(ster, { vormen: true }); // 21-11: het cijfer bij de sterren, alleen zichtbaar met Vormen bij kleur (a11y.css .vormen-extra)
  els.wantedText.textContent = wantedStatus(ster, phase);
  stars.forEach((st, i) => st.classList.toggle('on', i < ster));
  // misdruk alleen bij verandering: de klasse gaat na 1,4 s weer weg (#993)
  els.wantedStars.classList.add('changed');
  clearTimeout(wantedChangedT);
  wantedChangedT = setTimeout(() => els.wantedStars.classList.remove('changed'), 1400);
  // a new star pops in, one at a time
  for (let i = wantedShown; i < ster; i++) pop(stars[i]);
  wantedShown = ster;
  // #802: een nieuwe ster of het einde van de achtervolging een keer benoemen
  if (ster !== wasSter) announce(wantedAnnounce(ster, phase));
  els.wantedStars.classList.toggle('searching', searching && ster > 0);
  els.wantedStars.classList.toggle('chase', ster > 0 && !searching);
  els.wanted.classList.toggle('searching', searching && ster > 0);
  els.wanted.classList.toggle('chase', ster > 0 && !searching);
  els.wanted.setAttribute('aria-label', wantedAnnounce(ster, phase));
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
  const v = hoofdspeler(world).inVehicle || world.trainCam;
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
  const p = hoofdspeler(world);
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
let moneyStart = 0; // microinteractions.js: de waarde waar de lopende teller van begon
let deltaSum = 0;
let deltaTimer = 0;
// #661: cache de geformatteerde geldregel en de twee wapen-kind-elementen
let moneyRounded = null, weaponTextEl = null, weaponAmmoEl = null;
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
    moneyStart = moneyShown;
    moneyTarget = target;
    els.moneyDelta.textContent = (deltaSum > 0 ? '+€' : '−€') + Math.abs(deltaSum).toLocaleString('nl-NL');
    els.moneyDelta.dataset.sign = deltaSum > 0 ? 'plus' : 'min';
    els.moneyDelta.classList.add('visible');
    if (S.moneySign > 0) pop(els.moneyDelta); // het bedrag springt even op bij geld binnen (#985); uit bij Beweging beperken
    if (S.moneySign > 0) tikGetal(els.money); // DS3: het getal zelf tikt één keer mee (80 ms); uit bij Beweging beperken en Rustig drukwerk
  }
  if (deltaTimer > 0 && (deltaTimer -= dt) <= 0) els.moneyDelta.classList.remove('visible');
  const diff = moneyTarget - moneyShown;
  // TELLER OPLOPEN (ds-motion.css, microinteractions.js): lineair in hooguit 250 ms, bij Beweging beperken meteen
  if (diff !== 0) moneyShown = telStap(moneyShown, moneyTarget, moneyStart, dt, bewegingUit() ? 0 : MI.max / 1000);
  const rounded = Math.round(moneyShown);
  if (moneyNeedsUpdate(rounded, moneyRounded)) { moneyRounded = rounded; setText(els.money, moneyLabel(rounded)); }
  els.money.classList.toggle('rolling', diff !== 0);
  const ammo = world.ammo ? world.ammo[world.weapon] : undefined;
  const weaponKey = WEAPON_ICONS[world.weapon] ? world.weapon : 'fists';
  const sub = weaponAmmoText(weaponKey, ammo, NO_COUNT);
  if (els.weapon.dataset.key !== weaponKey) {
    const eerste = els.weapon.dataset.key === undefined;
    els.weapon.dataset.key = weaponKey;
    els.weapon.innerHTML = `<svg class="hud-weapon-icon" viewBox="0 0 48 24" aria-hidden="true">${WEAPON_ICONS[weaponKey]}</svg><span class="hud-weapon-col"><span class="hud-weapon-text"></span><small class="hud-weapon-ammo"></small></span>`;
    weaponTextEl = weaponAmmoEl = null; // nieuwe kinderen
    restartClass(els.weapon, 'switched');
    if (!eerste) S.weaponAt = nowS(); // het wapen wisselde: het plaatje komt even in beeld (#995)
  }
  const label = WEAPON_LABELS[world.weapon] || 'VUISTEN';
  const textEl = weaponTextEl || (weaponTextEl = els.weapon.querySelector('.hud-weapon-text'));
  if (textEl.textContent !== label) textEl.textContent = label;
  const ammoEl = weaponAmmoEl || (weaponAmmoEl = els.weapon.querySelector('.hud-weapon-ammo'));
  if (ammoEl.textContent !== sub) {
    if (ammoEl.textContent) S.weaponAt = nowS();
    ammoEl.textContent = sub;
    ammoEl.dataset.num = /^\d+$/.test(sub) ? '1' : '';
  }
}

// De klok van een missie of klus. Onder een minuut telt hij in seconden ("42s", leesbaar
// terwijl je rent); daarboven als een klok ("6:52"), want "412s" zegt niemand iets.
const clockText = (s) => (s < 60 ? `${Math.ceil(s)}s` : fmtTime(s));

// Tijdens de zoektocht: hoeveel seconden je nog uit het zicht moet blijven voordat er een ster
// afgaat. De teller loopt met dt * (buiten de cirkel ? 2 : 1) * de signalementfactor
// (stepUnseen in wantedlevels.js, decayFactor in signalement.js); die factoren staan hier
// deels in plaats van in een import, omdat de HUD alleen hoeft te schatten wat de speler ziet.
function zoekStand(world) {
  const pol = world.police, h = hoofdspeler(world);
  const d = pol.searchCenter ? Math.hypot(h.x - pol.searchCenter.x, h.y - pol.searchCenter.y) : 0;
  return zoekTeller(world.wanted, world.wantedDecayTimer, d, pol.searchCenter ? pol.searchRadius : Infinity);
}
// #989: de seconden staan in de teller onder de doelregel; de regel zegt alleen nog wat je doet
function zoekSub(world) {
  return zoekStand(world).buiten ? 'Buiten de cirkel: twee keer zo snel een ster minder' : 'Ze zijn je kwijt: blijf uit het zicht';
}

// The objective line: one objective at a time (a mission stage, else the
// bijbaan's next goal, else "lose the police"), genre style: the objective
// big, its live counter small under it, a timer to the right. It pops in
// again whenever the objective itself changes.
function currentObjective(world) {
  const m = world.mission;
  const hv = hoofdspeler(world).inVehicle || world.trainCam || null;
  const modus = travelMode(hv, hv ? vehicleKind(hv, { train: hv === world.trainCam }) : null);
  const job = world.sideJob;
  if (job && job.active) {
    // een klus met een limiet van twee minuten leest als "1:42", niet als "102s"
    const timer = job.timeLeft != null ? clockText(job.timeLeft) : '';
    const g = job.goal;
    return { kind: 'job', raw: g ? g.label : job.progress, title: goalTitle('job', g ? g.label : job.progress, modus), sub: g ? job.progress : '', hint: g ? g.desc : '', timer, secs: job.timeLeft };
  }
  if (m && m.phase === 'active') {
    const text = missionProgressText(m);
    const timer = m.timeLeft != null && !m.raceHud ? clockText(m.timeLeft) : '';
    const cut = text.search(/ · | \(\d+\/\d+\)$/);
    const sub = cut > 0 ? text.slice(cut).replace(/^ · /, '').replace(/^ \((\d+\/\d+)\)$/, 'stap $1') : '';
    if (text || timer) return { kind: 'mission', raw: cut > 0 ? text.slice(0, cut) : text, title: goalTitle('mission', cut > 0 ? text.slice(0, cut) : text, modus), sub, timer, secs: m.timeLeft };
  }
  if (world.wanted > 0 && !(m && m.phase === 'active')) {
    const searching = !!(world.police && world.police.searching);
    return {
      kind: 'police', title: searching ? 'Blijf uit het zicht' : 'Ontsnap aan de politie', timer: '',
      // tijdens de zoektocht zegt de regel hoe ver je van een ster af bent, niet alleen "ze zijn je kwijt":
      // de balk op de minimap is klein en deze regel staat waar je kijkt (decay: buiten de cirkel dubbel zo snel)
      sub: searching ? zoekSub(world) : world.trainDriving ? 'Een trein houden ze niet zomaar tegen' : hoofdspeler(world).inVehicle ? 'Of laat je bak spuiten bij Spuit & Klaar' : 'Pak een bak en smeer hem',
    };
  }
  // the player's own goal (goal.js): the story waits meanwhile
  const goal = world.goal;
  if (goal && !playerBusy(world, ['padel', 'activityGame', 'heliRun', 'challenge']).busy && !(m && m.phase === 'active')) {
    const r = getActiveRoute();
    const d = r && r.kind === 'user' ? r.remaining : Math.hypot(goal.x - hoofdspeler(world).x, goal.y - hoofdspeler(world).y);
    const wait = storyWaiting(world);
    const first = r && r.kind === 'user' && r.target && /^Eerst: /.test(r.target.name) ? r.target.name : '';
    const sub = [first || goal.sub, formatDistance(d), wait ? `je verhaalmissie wacht: ${wait.label}` : ''].filter(Boolean).join(' · ');
    // the HUD takes no clicks: say where the goal can be dropped, the first few times
    return { kind: 'goal', raw: goal.name, title: goalTitle('goal', goal.name, modus), sub, hint: goalHints <= GOAL_HINTS ? `${sub} · wissen via Activiteiten of de kaart` : '', timer: '' };
  }
  // between missions: the next story step, so it is always clear where to go
  const g = world.storyGuide;
  if (g && g.name && !world.storyFreePlay && !gameBusy(world) && !(m && m.phase === 'active')) {
    const atMarker = m && (m.phase === 'idle' || m.phase === 'cooldown') && Math.hypot(m.marker.x - g.x, m.marker.y - g.y) < 4;
    const near = Math.hypot(g.x - hoofdspeler(world).x, g.y - hoofdspeler(world).y) < 40;
    const inside = atMarker && !m.armed && m.distanceToMarker < (m.triggerRadius || 4);
    const sub = g.alt ? `${near ? 'Je bent er' : 'Volg de gele route'} · of kies: ${g.alt}, op de kaart`
      : g.buy ? (near ? 'Voor het verhaal: loop naar binnen (E)' : 'Volg de gele route naar de winkel')
      : inside ? 'Stap even uit de marker en weer terug'
      : atMarker ? (near ? 'Loop of rij de gele marker in' : 'Volg de gele route naar de marker') : 'Volg de gele route';
    // audit speelbaarheid 23-11: hoe ver het nog is (tot 59 km tussen twee missies), zodat de speler zelf kiest: rijden, OV of taxi
    const sr = getActiveRoute(), afst = sr && sr.kind === 'mission' && Number.isFinite(sr.remaining) ? sr.remaining : Math.hypot(g.x - hoofdspeler(world).x, g.y - hoofdspeler(world).y);
    const subAfst = !near && !inside && afst >= STORY_AFSTAND_M ? `${sub} · ${formatDistance(afst)}` : sub;
    // in de lucht staat de bestemming op de routekaart (plaatsnaam, #1038): de balk toont alleen de naam van de opdracht, zonder "Vlieg naar:"
    const lucht = travelModeOf(world) === 'lucht';
    return { kind: 'story', raw: g.name, title: lucht ? cutTitle(g.name) : goalTitle('story', g.name, modus), sub: subAfst, timer: '' };
  }
  return null;
}

const OBJ_HINT_TIME = 6;
const STORY_AFSTAND_M = 300; // vanaf hier zegt de doelbalk van het verhaal hoe ver het nog is (audit speelbaarheid 23-11)
const QUIET_AFTER = 9;
const GOAL_HINTS = 3;
let goalHints = 0;
let storyHints = 0; // UX-audit 23-11 (S6): hoeveel verhaaldoelen er al stonden (de routeregel alleen de eerste keren)

let lastObjective = null;
const missionTick = { t: 0 };
function updateMission(dt, world) {
  // doelregel op 0,15 s: de klok staat op 1 s, de afstand op 10 m; het wisselmoment van een doel is niet te zien
  if (!intervalDue(missionTick, dt, 0.15)) return;
  const o = currentObjective(world);
  lastObjective = o;
  els.mission.hidden = !o || (!o.title && !o.timer);
  if (els.mission.hidden) { els.objKey = ''; missionTick.secs = null; els.gps.classList.remove('time-low'); return; }
  // #985: bij 30 en 10 s een melding, een piep en een rode klok; zonder klok wordt de stand vergeten
  const secs = o.timer && Number.isFinite(o.secs) ? o.secs : null;
  const warn = timeWarning(missionTick.secs, secs);
  missionTick.secs = secs;
  if (warn) {
    const tekst = timeWarningText(warn);
    if (world.addMessage) world.addMessage(tekst, 2.5, { kind: 'tip', key: 'tijd-' + warn });
    playTimeWarning(warn <= 10);
    announce(tekst);
  }
  els.gps.classList.toggle('time-low', secs != null && secs <= 10);
  const key = o.kind + '|' + (o.raw ?? o.title); // de bestemming, niet het werkwoord: instappen laat het doel niet opnieuw verschijnen
  if (key !== els.objKey) { els.objAt = world.time; if (o.kind === 'goal') goalHints++; if (o.kind === 'story') storyHints++; }
  // a new objective first says how (the bijbaan's hint), then its counter
  const sub = o.hint && world.time - els.objAt < OBJ_HINT_TIME ? o.hint : o.kind === 'story' ? storySubLine(o.sub, storyHints) : o.sub;
  // the route and the story speak for themselves after a moment: the card shrinks to the goal and the distance
  els.mission.classList.toggle('obj-fresh', world.time - els.objAt < OBJ_HINT_TIME); // #985: de hulpregel alleen bij een nieuw doel
  els.mission.classList.toggle('obj-quiet', (o.kind === 'story' || o.kind === 'goal' || o.kind === 'police') && world.time - els.objAt >= QUIET_AFTER);
  if (els.missionLabel.textContent !== o.title) els.missionLabel.textContent = o.title;
  if (els.missionProgress.textContent !== sub) els.missionProgress.textContent = sub;
  const r = getActiveRoute();
  // the turn card already carries the distance of the route. Een bijbaan deed hier niet mee en
  // heeft ook geen eigen GPS-kaart, dus te voet naar een klus toe was er nergens een afstand.
  const gpsShows = !els.gps.hidden && !els.gps.classList.contains('no-turn') && !els.gps.classList.contains('hv-off');
  setText(els.missionDist, r && r.remaining > 12 && distanceOwner({ gps: gpsShows, objective: true }) === 'objective' ? formatDistance(r.remaining) : '');
  if (key !== els.objKey) {
    els.objKey = key;
    els.mission.dataset.kind = o.kind;
    // #802: een nieuw doel een keer voorlezen
    if (o.title) announce(o.title); // de titel heeft zelf het werkwoord ("Ga naar: ...", "Bezig: ...")
    // a mission's objective stays up in pigeon mode too (H4's photos, H10's knots)
    els.mission.classList.toggle('in-mission', o.kind === 'mission');
    restartClass(els.mission, 'pop');
    if (o.kind === 'goal') ring(els.mission);
  }
  updateObjectiveKeys(world, o.kind);
  updateRegelwidgets(world, o.kind);
}

// #987: de eierrit als meter en icoontjes in plaats van alleen een zin: de snelheid tegen de limiet met een
// waarschuwingszone, en de eieren die breken. Eén keer gebouwd, daarna alleen een schrijfbeurt als een getal
// verandert (rwA..rwD zijn de laatst getoonde waarden). De tekstregel erboven blijft staan.
function updateRegelwidgets(world, kind) {
  const m = world.mission;
  const egg = kind === 'mission' && m && m.phase === 'active' && m.eggLimit ? m : null;
  const limo = kind === 'mission' && m && m.phase === 'active' && Number.isFinite(m.limoAfstand) ? m : null;
  updateLimoMeter(limo);
  const zoek = updateZoekTeller(world, kind);
  if (!egg) {
    if (els.rwEgg) { els.rwEgg.verberg(); els.rwEggen.verberg(); }
    if (!limo && !zoek) els.objRegel.hidden = true;
    return;
  }
  if (!els.rwEgg) {
    zetAankondiger(announce);
    els.rwEgg = maakWidget('limiet', els.objRegel, { marge: 2, eenheid: 'km/u', label: 'Snelheid', icoon: 'meter' });
    els.rwEggen = maakWidget('voorraad', els.objRegel, { icoon: 'ei', label: 'Eieren' });
  }
  const kmh = egg.eggKmh | 0, heel = egg.eggsHeel | 0;
  if (kmh === els.rwA && egg.eggLimit === els.rwB && heel === els.rwC && egg.eggsTotaal === els.rwD) return;
  els.rwA = kmh; els.rwB = egg.eggLimit; els.rwC = heel; els.rwD = egg.eggsTotaal;
  els.objRegel.hidden = false;
  const l = els.rwEgg.inv;
  l.waarde = kmh; l.limiet = egg.eggLimit;
  const v = els.rwEggen.inv;
  v.heel = heel; v.totaal = egg.eggsTotaal;
  els.rwEgg.ververs();
  els.rwEggen.ververs();
}

// #989: de zoektocht van de politie als teller: hoe lang nog tot er een ster af gaat. Alleen bij de doelregel Blijf uit
// het zicht (kind 'police' en zoeken); hele seconden, dus hooguit één schrijfbeurt per seconde.
function updateZoekTeller(world, kind) {
  const aan = kind === 'police' && world.wanted > 0 && !!(world.police && world.police.searching);
  if (!aan) {
    if (els.rwZoek) els.rwZoek.verberg();
    els.rwZoekA = undefined;
    return false;
  }
  if (!els.rwZoek) { zetAankondiger(announce); els.rwZoek = maakWidget('teller', els.objRegel, { eenheid: 's', label: 'Tot een ster minder' }); }
  const z = zoekStand(world), rest = Math.ceil(z.rest);
  if (rest === els.rwZoekA && z.totaal === els.rwZoekB) return true;
  els.rwZoekA = rest; els.rwZoekB = z.totaal;
  els.objRegel.hidden = false;
  els.rwZoek.inv.rest = rest; els.rwZoek.inv.totaal = z.totaal;
  els.rwZoek.ververs();
  return true;
}

// AAA M10: de afstand tot de limo als wijzer (richting en afstandsringen), zodat "hij zit op je bumper" te zien is voor het te laat is.
// Binnen de eerste ring (12 m) knippert hij; de missie vangt je pas na drie seconden op 7 m.
function updateLimoMeter(limo) {
  if (!limo) {
    if (els.rwLimo) els.rwLimo.verberg();
    els.rwLimoA = els.rwLimoB = undefined;
    return;
  }
  if (!els.rwLimo) els.rwLimo = maakWidget('wijzer', els.objRegel, { ringen: [12, 30, 80], label: 'Limo achter je' });
  const afstand = limo.limoAfstand, hoek = limo.limoHoek || 0;
  if (afstand === els.rwLimoA && hoek === els.rwLimoB) return;
  els.rwLimoA = afstand; els.rwLimoB = hoek;
  els.objRegel.hidden = false;
  els.rwLimo.inv.afstand = afstand;
  els.rwLimo.inv.hoek = hoek;
  els.rwLimo.ververs();
}

// #824: de compacte bedieningsregel hoort bij missies, bijbanen en achtervolgingen. Hij staat in
// de bestaande doellijn (zone G), dus hij maakt geen eigen vak en kan de rest van de HUD niet
// overlappen; de toetsen volgen de toetsenbord-/controllerbinding via physicalKey/keyName.
function besturingLabel(token) {
  // 'spatie' is de leestoken van een tekstregel; de echte binding kan intussen een andere toets
  // zijn (springen op T). Geen hardgecodeerd "SPATIE" meer: de schermnarratie las altijd de
  // standaardtoets voor, ook als de speler hem verlegd had (#QoL).
  if (token === 'spatie') token = ' ';
  const fysiek = physicalKey(getSettings().keyBinds, token);
  return keyName(fysiek).toUpperCase();
}
// per device and per session, never saved: a new session shows the line again until the player has moved
const practice = createPractice();
function updateObjectiveKeys(world, kind) {
  if (!els.objKeys) return;
  // "Toetshints uit" hoort ook deze regel te verbergen: hij stond in de doellijn en niet in
  // .hud-prompts, dus de instelling liet hem tijdens elke missie staan (QoL-review).
  const hintsOn = toggleChoice('hints', getSettings().showHints !== false); // #1169: Hints en tips per save
  const speler = hoofdspeler(world);
  // only the first story goal counts as practice: metres covered there make its line step aside (firststeps.js)
  if (kind === 'story' && speler) trackPractice(practice, hintContext(speler), speler.x, speler.y);
  const hint = hintsOn && (kind === 'mission' || kind === 'job' || kind === 'police' || kind === 'story') ? controlHint(world, speler, { eerstedoel: kind === 'story', practice }) : null;
  const sig = hint ? hint.context + '|' + hint.groepen.map((g) => g.keys.join('+') + g.werk).join('|') : '';
  if (sig === els.objKeysSig) return;
  els.objKeysSig = sig;
  els.objKeys.hidden = !hint;
  if (!hint) { els.objKeys.innerHTML = ''; els.objKeys.removeAttribute('aria-label'); return; }
  els.objKeys.innerHTML = hint.groepen.map((g) => '<span class="hud-obj-key">' +
    g.keys.map((k) => glyphHtml(besturingLabel(k))).join('') +
    `<span>${escapeHtml(g.werk)}</span></span>`).join('');
  els.objKeys.setAttribute('aria-label', 'Besturing: ' + hintText(hint, besturingLabel));
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
  const hideRace = !r;
  if (els.race.hidden !== hideRace) els.race.hidden = hideRace;
  if (!r) return;
  const hidePos = !r.pos;
  if (els.racePos.hidden !== hidePos) els.racePos.hidden = hidePos;
  if (r.pos) {
    const bEl = els.racePosB || (els.racePosB = els.racePos.querySelector('b'));
    const spEl = els.racePosSpan || (els.racePosSpan = els.racePos.querySelector('span'));
    const posText = `${r.pos}e`;
    const totText = `van ${r.total}`;
    const leadVal = r.pos === 1 ? '1' : '';
    if (bEl && bEl.textContent !== posText) bEl.textContent = posText;
    if (spEl && spEl.textContent !== totText) spEl.textContent = totText;
    if (els.racePos.dataset.lead !== leadVal) els.racePos.dataset.lead = leadVal;
  }
  setRaceRow('time', fmtRaceTime(r.elapsed));
  setRaceRow('left', fmtRaceTime(Math.ceil(r.timeLeft), false), r.timeLeft < 10 ? 'low' : '');
  setRaceRow('lap', r.laps ? `${r.lap}/${r.laps}` : null);
  setRaceRow('cp', `${r.cp}/${r.cpTotal}`);
  setRaceRow('best', r.best != null ? fmtRaceTime(r.best) : '–', r.best != null && r.elapsed < r.best ? 'ahead' : '');
}

// Zone E: the radio station for a few seconds. It waits out a chase or a
// call (at most DEFER_MAX s, then it lapses) and gives way to an achievement.
let npTimer = 0, npWait = 0, npQueued = null;
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
    // 22-11: de radiokaart loopt via de ene meldingenwachtrij (notifyqueue.js): een tegelijk, nooit tijdens laden of film
    if (npQueued !== np) {
      npQueued = np;
      enqueueNotice('radio', {
        key: 'radio-' + (np.title || np.station || ''),
        surface: 'radio',
        text: np.title || 'radio',
        duration: nowPlayingSeconds(np),
        maxAge: DEFER_MAX,
        ready: () => !isBusy(world) && !isDialogue() && !zones.occupant('E') && !world.paused,
        show: () => {
          if (world.nowPlaying !== np) return;
          npTimer = nowPlayingSeconds(np); // #975: lang genoeg om titel, artiest en zender te lezen
          npWait = 0;
          noticeBar(els.nowPlaying, { duur: npTimer }); // het aflopende balkje (DESIGN_SYSTEM.md, Meldingen); .on laat hem lopen
          restartClass(els.nowPlaying, 'on', () => npTimer > 0);
        },
        until: () => npTimer <= 0,
        cut: () => { npTimer = 0; els.nowPlaying.classList.remove('on'); world.nowPlaying = null; },
        onDrop: () => { if (world.nowPlaying === np) world.nowPlaying = null; },
      });
    }
    if (!world.paused && (npWait -= dt) <= 0) world.nowPlaying = null;
  }
  if (npTimer > 0 && !world.paused && (npTimer -= dt) <= 0) {
    els.nowPlaying.classList.remove('on');
    world.nowPlaying = null;
  }
  // an achievement or a call takes the zone over at once
  if (npTimer > 0 && (zones.occupant('E') || isBusy(world))) { npTimer = 0; els.nowPlaying.classList.remove('on'); world.nowPlaying = null; }
}

// #988: de zender van het voertuig als klein icoon met naam bij de snelheidsmeter; hij licht kort op als de zender wisselt
let channelLit = 0;
function updateChannelChip(dt, world) {
  const r = world.radioHud;
  const naam = r && r.name ? r.name : '';
  if (naam !== els.channelName) {
    els.channelName = naam;
    setText(els.channelText, naam);
    els.channelChip.hidden = !naam;
  }
  const ic = (r && r.icon) || 'muziek';
  if (ic !== els.channelIcon) {
    els.channelIcon = ic;
    const old = els.channelChip.querySelector('svg');
    if (old) old.outerHTML = icoon(ic, { maat: 14 });
  }
  if (r && naam && r.at !== els.channelAt) {
    els.channelAt = r.at;
    channelLit = 1.8;
    els.channelChip.classList.add('lit');
  }
  if (channelLit > 0 && !world.paused && (channelLit -= dt) <= 0) els.channelChip.classList.remove('lit');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

const C = {
  green: INK.green,
  greenLight: INK.greenLight,
  greenDark: INK.greenDark,
  dark: INK.dark,
  cream: INK.cream,
  landmark: INK.paper,
  red: INK.red,
  policeBlue: INK.policeBlue,
  yellow: INK.yellow,
  yellowHalf: inkA('yellow', 0.5),
  horeca: INK.horeca,
  grey: INK.grey,
  greyDark: INK.greyDark,
};

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function applyPalette(p = markerColors()) {
  // navtarget.js NAV_ROL kiest per type de paletrol: de kleur van een route of pijl wijzigen is daar één regel
  Object.assign(ROUTE_COLORS, { user: p[NAV_ROL.eigen], mission: p[NAV_ROL.missie], job: p[NAV_ROL.klus], care: p[NAV_ROL.zorg] });
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

// Een ronde markerschijf met een Phosphor-glyph in crème (22-11): vulling, donkere buitenlijn, een gekleurde ring (crème of 'van jou').
function phDisc(ctx, s, fill, naam, r = 5, ring = C.cream) {
  ctx.beginPath();
  ctx.arc(0, 0, r * s, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  outline(ctx, s, C.dark, 3.2);
  outline(ctx, s, ring, 1.6);
  const paden = phosphorPaden(naam);
  if (!paden) return;
  const box = r * 1.34 * s;
  ctx.save();
  ctx.translate(-box / 2, -box / 2);
  ctx.scale(box / 256, box / 256);
  ctx.fillStyle = badgeGlyphColor(fill);
  for (const p of paden) ctx.fill(p);
  ctx.restore();
}

function pulseAt(t, speed = 5) {
  return 0.5 + 0.5 * Math.sin(t * speed);
}

// Draws one map marker in CSS-pixel space centred on (x, y); shared by the
// minimap, the full map and its legend so all three always match.
// vorm per medespeler (coopplayers.js): n hoeken, star = ster, rot = vaste draaiing
const PARTNER_VORMEN = {
  driehoek: { n: 3 }, ruit: { n: 4, rot: 0 }, vierkant: { n: 4, rot: Math.PI / 4 }, cirkel: { n: 0 }, vijfhoek: { n: 5 }, ster: { n: 5, star: true },
  plus: { plus: true }, kruis: { kruis: true }, maan: { pad: true }, hart: { pad: true }, bliksem: { pad: true }, druppel: { pad: true }, blok: { pad: true },
  golf: { pad: true }, schild: { pad: true }, bloem: { pad: true },
};
// the shapes that are no regular polygon: a real moon, heart, bolt, drop, block, wave, shield and flower (#383),
// each inside +-5.6 units; 'golf' and 'bloem' also set their own outline
const PARTNER_PADEN = {
  maan: (g, s) => { g.moveTo(1.8 * s, -5.2 * s); g.bezierCurveTo(-6.8 * s, -4.8 * s, -6.8 * s, 4.8 * s, 1.8 * s, 5.2 * s); g.bezierCurveTo(-1.8 * s, 3.2 * s, -1.8 * s, -3.2 * s, 1.8 * s, -5.2 * s); },
  hart: (g, s) => { g.moveTo(0, 5.2 * s); g.bezierCurveTo(-7 * s, 0.4 * s, -5.2 * s, -5 * s, -2.4 * s, -4.8 * s); g.bezierCurveTo(-1 * s, -4.7 * s, 0, -3.6 * s, 0, -2.6 * s); g.bezierCurveTo(0, -3.6 * s, 1 * s, -4.7 * s, 2.4 * s, -4.8 * s); g.bezierCurveTo(5.2 * s, -5 * s, 7 * s, 0.4 * s, 0, 5.2 * s); },
  bliksem: (g, s) => { g.moveTo(1.8 * s, -5.8 * s); g.lineTo(-3.4 * s, 0.8 * s); g.lineTo(-0.4 * s, 0.8 * s); g.lineTo(-1.8 * s, 5.8 * s); g.lineTo(3.6 * s, -1.2 * s); g.lineTo(0.6 * s, -1.2 * s); },
  druppel: (g, s) => { g.moveTo(0, -5.8 * s); g.bezierCurveTo(3.4 * s, -1.8 * s, 4.6 * s, 0.4 * s, 4.6 * s, 1.8 * s); g.arc(0, 1.8 * s, 4.6 * s, 0, Math.PI); g.bezierCurveTo(-4.6 * s, 0.4 * s, -3.4 * s, -1.8 * s, 0, -5.8 * s); },
  blok: (g, s) => { g.rect(-4.4 * s, -2 * s, 8.8 * s, 6.4 * s); g.rect(-3 * s, -4.6 * s, 2.4 * s, 2.6 * s); g.rect(0.6 * s, -4.6 * s, 2.4 * s, 2.6 * s); },
  schild: (g, s) => { g.moveTo(-4.6 * s, -4.8 * s); g.lineTo(4.6 * s, -4.8 * s); g.lineTo(4.6 * s, 0.6 * s); g.quadraticCurveTo(4.4 * s, 3.8 * s, 0, 5.8 * s); g.quadraticCurveTo(-4.4 * s, 3.8 * s, -4.6 * s, 0.6 * s); },
  golf: (g, s) => { g.moveTo(-5.4 * s, 2 * s); g.bezierCurveTo(-4.4 * s, -3.8 * s, -1.6 * s, -3.8 * s, 0, 0); g.bezierCurveTo(1.6 * s, 3.8 * s, 4.4 * s, 3.8 * s, 5.4 * s, -2 * s); g.lineTo(5.4 * s, 1.8 * s); g.bezierCurveTo(4.4 * s, 7.4 * s, 1.6 * s, 7.4 * s, 0, 3.8 * s); g.bezierCurveTo(-1.6 * s, 0.2 * s, -4.4 * s, 0.2 * s, -5.4 * s, 5.8 * s); },
  bloem: (g, s) => { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5, x = Math.cos(a) * 2.9 * s, y = Math.sin(a) * 2.9 * s; g.moveTo(x + 2.6 * s, y); g.arc(x, y, 2.6 * s, 0, Math.PI * 2); } g.moveTo(2.8 * s, 0); g.arc(0, 0, 2.8 * s, 0, Math.PI * 2); },
};
export function drawMapIcon(ctx, kind, x, y, s = 1, opts = {}) {
  if (!opts.raw && drawFlatMapIcon(ctx, kind, x, y, s, opts)) return;
  const t = opts.t ?? performance.now() / 1000;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  switch (kind) {
    case 'player': {
      // you: a soft green glow, a cream-edged arrow, so it stands out among the badges (#180)
      if (!opts.raw) {
        const gr = ctx.createRadialGradient(0, 0, 1 * s, 0, 0, 11 * s);
        gr.addColorStop(0, inkA('greenLight', 0.55));
        gr.addColorStop(1, inkA('greenLight', 0));
        ctx.beginPath();
        ctx.arc(0, 0, 11 * s, 0, Math.PI * 2);
        ctx.fillStyle = gr;
        ctx.fill();
      }
      ctx.rotate(opts.angle ?? -Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(8 * s, 0);
      ctx.lineTo(-5.6 * s, 5.2 * s);
      ctx.lineTo(-2.8 * s, 0);
      ctx.lineTo(-5.6 * s, -5.2 * s);
      ctx.closePath();
      ctx.fillStyle = C.greenLight;
      ctx.fill();
      outline(ctx, s, C.dark, 3.4);
      outline(ctx, s, C.cream, 1.7);
      ctx.fillStyle = C.greenLight;
      ctx.fill();
      break;
    }
    case 'partner': { // medespeler (samen spelen, #95): vorm en kleur van de speler, nooit alleen kleur
      const f = PARTNER_VORMEN[opts.vorm] || PARTNER_VORMEN.cirkel;
      ctx.rotate(f.rot ?? (f.n === 3 ? (opts.angle ?? -Math.PI / 2) : 0));
      ctx.beginPath();
      if (f.pad) PARTNER_PADEN[opts.vorm](ctx, s);
      else if (f.plus) { ctx.rect(-1.6 * s, -5.2 * s, 3.2 * s, 10.4 * s); ctx.rect(-5.2 * s, -1.6 * s, 10.4 * s, 3.2 * s); }
      else if (f.kruis) { ctx.rotate(Math.PI / 4); ctx.rect(-1.6 * s, -5.2 * s, 3.2 * s, 10.4 * s); ctx.rect(-5.2 * s, -1.6 * s, 10.4 * s, 3.2 * s); }
      else if (!f.n) ctx.arc(0, 0, 4.8 * s, 0, Math.PI * 2);
      else for (let i = 0; i < (f.star ? f.n * 2 : f.n); i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / (f.star ? f.n * 2 : f.n), r = (f.star && i % 2 ? 2.6 : 5.6) * s;
        if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      if (f.pad) outline(ctx, s, C.dark, 2.4); // under the fill: only the outer half shows, so a thin shape stays coloured
      ctx.fillStyle = opts.kleur || C.greenLight;
      ctx.fill();
      if (!f.pad) outline(ctx, s, C.dark, 1.4);
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
      // het geld van een beroving (22-11): munten (Phosphor 'geld') op een gele schijf, inkt op geel
      phDisc(ctx, s, C.yellow, 'geld', 5, C.dark);
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
      outline(ctx, s, inkA('black', 0.6), 3.4);
      ctx.globalAlpha = (opts.alpha ?? 1) * (0.65 + pulse * 0.35);
      outline(ctx, s, C.yellow, 2);
      break;
    }
    case 'missionActive': {
      const pulse = pulseAt(t);
      ctx.beginPath();
      ctx.arc(0, 0, (5.5 + pulse * 1.2) * s, 0, Math.PI * 2);
      outline(ctx, s, inkA('black', 0.6), 3.4);
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
      ctx.fillStyle = INK.eierbal;
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
      // owned vehicle: a disc in its own paint with a green 'yours' ring and the vehicle's Phosphor glyph (22-11)
      phDisc(ctx, s, opts.color || C.greenDark, { auto: 'auto', car: 'auto', bike: 'fiets', scooter: 'scooter', boat: 'boot', heli: 'helikopter' }[opts.vkind] || 'auto', 5, C.greenLight);
      break;
    }
    case 'home':
    case 'homeMooring':
    case 'homeHelipad':
    case 'homeGarage': {
      // Thuis (22-11): een Phosphor-icoon op de blauwe schijf van Bezit: huis, steiger (anker), helidek of garage
      phDisc(ctx, s, INK.homeBlue, { home: 'thuis', homeMooring: 'anker', homeHelipad: 'helikopter', homeGarage: 'garage' }[kind], 5.4, C.cream);
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
      ctx.fillStyle = INK.yellow;
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
    case 'uitkijkpunt': {
      // uitkijkpunt (#886, #902): een rond oog met een pupil in de landmarkkleur. Vector en
      // rond, dus geen platgedrukte ovaal en scherp op elke zoom; de hover noemt de streek
      // en waarom je erheen gaat (verkenpunten.js, viewpointHover).
      ctx.beginPath();
      ctx.arc(0, 0, 5.2 * s, 0, Math.PI * 2);
      ctx.fillStyle = C.cream;
      ctx.fill();
      outline(ctx, s, C.dark, 1.3);
      ctx.beginPath();
      ctx.arc(0, 0, 2.5 * s, 0, Math.PI * 2);
      ctx.fillStyle = C.landmark;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 1.15 * s, 0, Math.PI * 2);
      ctx.fillStyle = C.dark;
      ctx.fill();
      // een klein lichtpuntje op de pupil: scherp en levend, ook op de minikaart
      ctx.beginPath();
      ctx.arc(-0.45 * s, -0.45 * s, 0.38 * s, 0, Math.PI * 2);
      ctx.fillStyle = C.cream;
      ctx.fill();
      break;
    }
    case 'beppe': {
      // het eerbetoonbankje (#832): een bankje met een duif erboven, in het
      // eigen blauw van de Ommeland-laag; altijd zichtbaar op de kaart
      ctx.fillStyle = C.cream;
      ctx.fillRect(-4.6 * s, -1.5 * s, 9.2 * s, 1.1 * s);
      ctx.fillRect(-4.6 * s, 0.2 * s, 9.2 * s, 1.0 * s);
      for (const bx of [-4.2, 3.2]) ctx.fillRect(bx * s, 1.2 * s, 1.0 * s, 2.6 * s);
      ctx.beginPath();
      ctx.ellipse(0.7 * s, -3.5 * s, 1.9 * s, 1.15 * s, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2.3 * s, -4.3 * s, 0.75 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'monument': {
      // een monument (heritagearea.js): een vijfhoek met een kleinere vijfhoek erin, de omtrek van een stervormige vesting
      for (const [k, fill] of [[5.4, C.landmark], [2.6, C.dark]]) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
          if (i === 0) ctx.moveTo(Math.cos(a) * k * s, Math.sin(a) * k * s);
          else ctx.lineTo(Math.cos(a) * k * s, Math.sin(a) * k * s);
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (k > 3) outline(ctx, s, C.dark, 1);
      }
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
      // police shield (flashes red/blue only while you are wanted); officers on foot, bike or horse get a smaller
      // one with a glyph instead of the star
      const blue = !policeAlert || Math.floor(t * 6) % 2 === 1;
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
      if (kind === 'policeBike' || kind === 'policeHorse') break; // no glyph: a small arch or two rings read as a bump (#383)
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
      if (drawMapGlyph(ctx, kind, s)) break;
      if (drawOmmelandMapIcon(ctx, kind, s)) break;
      if (drawPerceelMapIcon(ctx, kind, s)) break;
      if (kind.startsWith('shop-')) drawShopMapIcon(ctx, kind.slice(5), s);
      else if (kind === 'pigeon') drawPigeonMapIcon(ctx, s);
      else if (kind === 'heli') drawHeliMapIcon(ctx, s);
      else if (kind === 'padel') drawPadelMapIcon(ctx, s);
      else if (kind.startsWith('act-')) drawActivityMapIcon(ctx, kind, s);
      else if (kind === 'pg-jelle' || kind === 'pg-fjord') drawPostgameMapIcon(ctx, kind.slice(3), s);
      else if (kind === 'station') drawStationMapIcon(ctx, s);
      else if (kind === 'livebus' || kind === 'ov-halte') drawLiveBusMapIcon(ctx, s, t);
      else if (kind === 'roosterbus') drawLiveBusMapIcon(ctx, s, t, true);
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
function flatBlobSprite(kind, s, a, opts) {
  const { t: _t, angle: _a, raw: _r, ...rest } = opts;
  const key = 'blob|' + kind + '|' + s + '|' + a + '|' + JSON.stringify(rest);
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

// The badge (#180, #92): a category shape in a saturated fill with a lighter rim, a soft shadow
// and the kind's own glyph, enlarged, in cream or dark ink (mapicons.js). The glyph is what the
// kind's own drawing shows in light pixels (its cream details); kinds without one, or whose
// body is light, keep the flat blob above.
function badgePath(g, shape, w) {
  const h = w / 2;
  g.beginPath();
  if (shape === 'tile') g.roundRect(-h, -h, w, w, w * 0.27);
  else if (shape === 'squircle') g.roundRect(-h * 1.05, -h * 0.88, w * 1.05, w * 0.88, w * 0.36);
  else if (shape === 'hex') { for (let i = 0; i < 6; i++) { const an = -Math.PI / 2 + i * Math.PI / 3; g[i ? 'lineTo' : 'moveTo'](Math.cos(an) * h * 1.06, Math.sin(an) * h * 1.06); } g.closePath(); }
  else if (shape === 'diamond') { g.save(); g.rotate(Math.PI / 4); g.roundRect(-h * 0.76, -h * 0.76, w * 0.76, w * 0.76, w * 0.14); g.restore(); }
  else if (shape === 'octagon') { for (let i = 0; i < 8; i++) { const an = Math.PI / 8 + i * Math.PI / 4; g[i ? 'lineTo' : 'moveTo'](Math.cos(an) * h * 1.08, Math.sin(an) * h * 1.08); } g.closePath(); }
  else if (shape === 'pill') g.roundRect(-h * 1.16, -h * 0.82, w * 1.16, w * 0.82, w * 0.41);
  else if (shape === 'pin') { g.arc(0, -h * 0.12, h * 0.96, Math.PI * 0.78, Math.PI * 0.22, false); g.lineTo(0, h * 1.08); g.closePath(); }
  else if (shape === 'shield') { g.moveTo(0, -h * 1.08); g.lineTo(h * 0.96, -h * 0.74); g.quadraticCurveTo(h * 0.94, h * 0.62, 0, h * 1.1); g.quadraticCurveTo(-h * 0.94, h * 0.62, -h * 0.96, -h * 0.74); g.closePath(); }
  else g.arc(0, 0, h, 0, Math.PI * 2);
}
// De badge zelf (22-11, DS3: een harde buitenlijn, de categoriekleur met een lichte bovenkant en een zachte schaduw): één plek voor de
// badge met een uitgesneden glyph (flatSprite) en de badge met een Phosphor-glyph (phBadgeSprite).
function paintBadgeBody(oc, shape, W, fill, s, a) {
  // soft shadow under the whole badge
  oc.save();
  oc.shadowColor = inkA('black', 0.55); oc.shadowBlur = 2.4 * s * a; oc.shadowOffsetY = 0.7 * s * a;
  badgePath(oc, shape, W);
  oc.fillStyle = INK.black; oc.fill();
  oc.restore();
  // a thin light line, a dark outline, the fill with a light top, the rim
  badgePath(oc, shape, W);
  oc.lineWidth = (1.0 + 2.5) * 0.5 * s * a * 1.4 + 0.6 * s * a; oc.strokeStyle = HALO_LIGHT; oc.stroke();
  oc.lineWidth = 1.5 * 0.5 * s * a * 1.4; oc.strokeStyle = HALO_DARK; oc.stroke();
  const grad = oc.createLinearGradient(0, -W / 2, 0, W / 2);
  grad.addColorStop(0, shadeHex(fill, 0.22)); grad.addColorStop(0.55, fill); grad.addColorStop(1, shadeHex(fill, -0.14));
  oc.fillStyle = grad; oc.fill();
  oc.save();
  badgePath(oc, shape, W * 0.9);
  oc.lineWidth = Math.max(1, 0.45 * s * a); oc.strokeStyle = shadeHex(fill, 0.38); oc.globalAlpha = 0.55; oc.stroke();
  oc.restore();
}

// De badge met zijn Phosphor-glyph (mapmarkers.js): vet, in crème of inkt, optisch gecentreerd per vorm (mapicons.js BADGE_GLYPH).
function phBadgeSprite(kind, s, a, opts, naam) {
  const paden = phosphorPaden(naam);
  if (!paden) return null;
  const look = stateLook(opts.state);
  const fill = look.gray ? INK.locked : mapFillColor(kind);
  const glyphCol = badgeGlyphColor(fill);
  const half = Math.ceil(13 * s + 6), n = Math.ceil(half * 2 * a);
  const out = document.createElement('canvas');
  out.width = out.height = n;
  const oc = out.getContext('2d');
  const W = BADGE_UNITS * s * a, shape = badgeShape(kind);
  oc.translate(n / 2, n / 2);
  oc.lineJoin = 'round';
  paintBadgeBody(oc, shape, W, fill, s, a);
  const G = BADGE_GLYPH[shape] || BADGE_GLYPH.circle, box = W * G.box;
  oc.save();
  oc.translate(-box / 2, -box / 2 + W * G.dy);
  oc.scale(box / 256, box / 256);
  if (glyphCol === GLYPH_CREAM) { oc.shadowColor = inkA('black', 0.3); oc.shadowOffsetY = 0.5 * s * a * 256 / box; oc.shadowBlur = 0; }
  oc.fillStyle = glyphCol;
  for (const p of paden) oc.fill(p);
  oc.restore();
  return { canvas: out, size: n / a };
}
function flatSprite(kind, s, a, opts) {
  const { t: _t, angle: _a, raw: _r, alpha: _al, ...rest } = opts;
  const key = 'badge|' + kind + '|' + s + '|' + a + '|' + JSON.stringify(rest);
  if (flatCache.has(key)) return flatCache.get(key);
  let sprite = null;
  // 22-11: een soort met een Phosphor-icoon (mapmarkers.js) tekent dat direct; de oude uitgesneden tekening blijft de terugval zonder Path2D
  const phNaam = typeof Path2D !== 'undefined' && mapFillColor(kind) ? markerIcoon(kind) : null;
  if (phNaam) {
    try { sprite = phBadgeSprite(kind, s, a, opts, phNaam); } catch (e) { sprite = null; }
    if (sprite) { flatCache.set(key, sprite); return sprite; }
  }
  try {
    const K = 1.5;
    const half2 = Math.ceil(13 * s * K + 6), n2 = Math.ceil(half2 * 2 * a);
    const src = document.createElement('canvas');
    src.width = src.height = n2;
    const sc = src.getContext('2d', { willReadFrequently: true });
    sc.scale(a, a);
    drawMapIcon(sc, kind, half2, half2, s * K, { ...opts, t: 0, raw: true });
    const d = sc.getImageData(0, 0, n2, n2).data;
    let area = 0, light = 0, x0 = n2, y0 = n2, x1 = -1, y1 = -1;
    const lit = new Uint8Array(n2 * n2);
    for (let i = 0; i < n2 * n2; i++) {
      if (d[i * 4 + 3] < 90) continue;
      area++;
      if (Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) > 185) {
        lit[i] = 1; light++;
        const x = i % n2, y = (i / n2) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    // no cream details (a pigeon-less circle, a dark glyph on a light body): the dark pixels well inside
    // the body are the glyph (a chessboard distance from the edge keeps the outline out)
    if (area && (light / area < 0.02 || x1 < x0)) {
      const dist = new Uint16Array(n2 * n2);
      const BIG = 60000;
      for (let i = 0; i < n2 * n2; i++) dist[i] = d[i * 4 + 3] < 90 ? 0 : BIG;
      for (let y = 0; y < n2; y++) for (let x = 0; x < n2; x++) {
        const i = y * n2 + x; if (!dist[i]) continue;
        let m = dist[i];
        if (x === 0 || y === 0) m = 1; else m = Math.min(m, dist[i - 1] + 1, dist[i - n2] + 1, dist[i - n2 - 1] + 1);
        dist[i] = m;
      }
      for (let y = n2 - 1; y >= 0; y--) for (let x = n2 - 1; x >= 0; x--) {
        const i = y * n2 + x; if (!dist[i]) continue;
        let m = dist[i];
        if (x === n2 - 1 || y === n2 - 1) m = 1; else m = Math.min(m, dist[i + 1] + 1, dist[i + n2] + 1, dist[i + n2 + 1] + 1);
        dist[i] = m;
      }
      const inner = 2.4 * s * K * a;
      let dark = 0;
      x0 = n2; y0 = n2; x1 = -1; y1 = -1;
      lit.fill(0);
      for (let i = 0; i < n2 * n2; i++) {
        if (dist[i] < inner) continue;
        if (Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) > 110) continue;
        lit[i] = 1; dark++;
        const x = i % n2, y = (i / n2) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      light = dark;
    }
    if (!area || light / area > 0.5 || light / area < 0.02 || x1 < x0) sprite = flatBlobSprite(kind, s, a, opts);
    else {
      const look = stateLook(opts.state);
      const fill = look.gray ? INK.locked : mapFillColor(kind);
      const glyphCol = badgeGlyphColor(fill);
      const half = Math.ceil(13 * s + 6), n = Math.ceil(half * 2 * a);
      const out = document.createElement('canvas');
      out.width = out.height = n;
      const oc = out.getContext('2d');
      const W = BADGE_UNITS * s * a, shape = badgeShape(kind);
      oc.translate(n / 2, n / 2);
      oc.lineJoin = 'round';
      paintBadgeBody(oc, shape, W, fill, s, a);
      // the glyph, enlarged to about 60 % of the badge
      const gw = x1 - x0 + 1, gh = y1 - y0 + 1;
      const g = document.createElement('canvas');
      g.width = gw; g.height = gh;
      const gc = g.getContext('2d');
      const gi = gc.createImageData(gw, gh);
      const rgb = [parseInt(glyphCol.slice(1, 3), 16), parseInt(glyphCol.slice(3, 5), 16), parseInt(glyphCol.slice(5, 7), 16)];
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
        const j = (y + y0) * n2 + x + x0;
        if (lit[j]) { const o = (y * gw + x) * 4; gi.data[o] = rgb[0]; gi.data[o + 1] = rgb[1]; gi.data[o + 2] = rgb[2]; gi.data[o + 3] = 255; }
      }
      gc.putImageData(gi, 0, 0);
      const r = (W * 0.6) / Math.max(gw, gh);
      const dw = gw * r, dh = gh * r;
      oc.imageSmoothingQuality = 'high';
      if (glyphCol === GLYPH_CREAM) { oc.globalAlpha = 0.3; oc.filter = 'brightness(0)'; oc.drawImage(g, -dw / 2, -dh / 2 + 0.5 * s * a, dw, dh); oc.filter = 'none'; oc.globalAlpha = 1; }
      oc.drawImage(g, -dw / 2, -dh / 2, dw, dh);
      sprite = { canvas: out, size: n / a };
    }
  } catch (e) { sprite = flatBlobSprite(kind, s, a, opts); }
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
  const al = (opts.alpha ?? 1) * stateLook(opts.state).alpha;
  if (al < 1) { ctx.save(); ctx.globalAlpha *= al; ctx.drawImage(sp.canvas, x - w / 2, y - w / 2, w, w); ctx.restore(); } else ctx.drawImage(sp.canvas, x - w / 2, y - w / 2, w, w);
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
  ctx.fillStyle = inkA('dark', 0.78);
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
  ctx.fillStyle = inkA('dark', 0.85);
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.fill();
  outline(ctx, s, inkA('black', 0.6), 3.4);
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
  ctx.fillStyle = blue ? inkA('policeBlue', 0.22) : inkA('red', 0.26);
  ctx.fill();
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = inkA('dark', 0.7);
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
  ctx.strokeStyle = inkA('dark', 0.75);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();
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
  ctx.strokeStyle = inkA('dark', 0.85);
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
    ctx.strokeStyle = inkA('dark', 0.8);
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
const MM_POI_NEAR_M = MINI_RANGE_M.near; // how far the minimap looks for places: mapstyle.js, with the full map's zoom rule
const MM_POI_FAR_M = MINI_RANGE_M.far;
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

// #1008: de keuze van de POI's (ca. 25 lijstscans met filters, closures en arrays) is van beeld tot beeld dezelfde. Hij wordt vier keer
// per seconde opnieuw gedaan, of eerder als de speler verder dan MM_POI_CACHE_M liep, de wereld wisselde of een bijbaan begon of eindigde;
// de minikaart tekent op 20 tot 30 beelden per seconde, dus ruim 80% van de allocaties van deze functie vervalt.
const MM_POI_CACHE_MS = 250, MM_POI_CACHE_M = 6;
const poiCache = { at: -1e9, x: 0, y: 0, world: null, job: false, veh: false, list: [] };
const _poiXY = [0, 0];
const _poiDrawn = [];
function minimapPoiList(world, job, player) {
  const c = poiCache, now = performance.now();
  const dx = player.x - c.x, dy = player.y - c.y;
  if (c.world === world && c.job === !!job && c.veh === !!player.inVehicle && now - c.at < MM_POI_CACHE_MS && dx * dx + dy * dy < MM_POI_CACHE_M * MM_POI_CACHE_M) return c.list;
  c.at = now; c.x = player.x; c.y = player.y; c.world = world; c.job = !!job; c.veh = !!player.inVehicle;
  return (c.list = collectMinimapPois(world, job, player));
}

// De POI's rond de speler als [soort, x, y], het belangrijkste eerst.
function collectMinimapPois(world, job, player) {
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
  // #834: een onbekende streek toont ook op de minikaart geen bijbanen, vondsten en overige spots.
  const sichtbaar = (x, y) => !isAreaHidden(x, y);
  const shops = nearestWithin(getShopsForRender(), px, py, MM_POI_NEAR_M, 24);
  for (const group of SHOP_GROUPS) {
    if (!minimapShows(group)) continue;
    const types = new Set();
    for (const sh of shops) {
      if (types.size >= 2) break;
      if (!sichtbaar(sh.x, sh.y)) continue; // #834
      if ((SHOP_TYPES[sh.type] || {}).group !== group || types.has(sh.type)) continue;
      types.add(sh.type);
      pois.push(['shop-' + sh.type, sh.x, sh.y]);
    }
  }
  // #834: een onbekende streek toont ook op de minikaart geen bijbanen, vondsten en overige spots.
  if (!job) {
    const sjs = getSideJobSpotsForRender().filter((sj) => sichtbaar(sj.x, sj.y));
    add('bijbaan', sjs.filter((sj) => !sj.job.layer), (sj) => 'sj-' + sj.job.id, 2, MM_POI_FAR_M);
    add('rondvaarttour', sjs.filter((sj) => sj.job.layer === 'rondvaarttour'), (sj) => 'sj-' + sj.job.id, 1, MM_POI_FAR_M);
  }
  add('trein', getStationsForRender(), 'station', 1, MM_POI_FAR_M);
  // #922: de live bussen met hun eigen icoon; dichterbij dan de POI-grens
  add(null, liveBusMarks(player, 3), 'livebus', 3, MM_POI_FAR_M);
  add(null, roosterBusMarks(world, 2), 'roosterbus', 2, MM_POI_FAR_M); // de terugval, alleen zonder live gegevens (busbron.js)
  add('ommeland', ommelandMapSpots().filter((q) => sichtbaar(q.x, q.y)), (q) => q.kind, 2, MM_POI_FAR_M);
  // het eerbetoonbankje (#832): een eigen icoon, ook zichtbaar voordat je er geweest bent
  const beppe = beppeMapSpot();
  if (beppe) add('ommeland', [beppe], beppe.kind, 1, MM_POI_FAR_M);
  add('percelen', perceelMapSpots().filter((q) => sichtbaar(q.x, q.y)), (q) => q.kind, 3, MM_POI_FAR_M);
  if (inVehicle) add('flitspaal', world.flitspaalen || [], 'flitspaal', 2);
  if (!inVehicle) add('duif', getPigeonSpotsForRender().filter((q) => sichtbaar(q.x, q.y)), 'pigeon', 1);
  add('heli', getHeliSpotsForRender().filter((q) => sichtbaar(q.x, q.y)), 'heli', 1, MM_POI_FAR_M);
  add('padel', getPadelSpotsForRender().filter((q) => sichtbaar(q.x, q.y)), 'padel', 1, MM_POI_FAR_M);
  for (const a of activityMapIcons(world)) if (sichtbaar(a.x, a.y)) add(a.layer, [a], a.kind, 1, MM_POI_FAR_M);
  add('postgame', getPostgameSpotsForRender().filter((q) => sichtbaar(q.x, q.y)), (q) => 'pg-' + q.kind, 2, MM_POI_FAR_M);
  add('onderdeel', getOnderdeelSpotsForRender().filter((q) => sichtbaar(q.x, q.y)), (q) => 'onderdeel-' + q.id, 1, MM_POI_FAR_M);
  add('wrakduik', getWrakduikSpotsForRender().filter((q) => !q.gedoken && sichtbaar(q.x, q.y)), (q) => 'wrakduik-' + q.id, 1, MM_POI_FAR_M);
  add('streekuitdaging', getStreekuitdagingSpotsForRender().filter((q) => sichtbaar(q.x, q.y)), () => 'hogelandrit', 1, MM_POI_FAR_M);
  add('horeca', getHorecaForRender().filter((q) => sichtbaar(q.x, q.y)), 'horeca', 1);
  add('landmark', (world.map.meta.landmarks || []).filter((q) => sichtbaar(q.x, q.y)), 'landmark', 2);
  add('uitkijkpunt', world.map.meta.uitkijkpunten || [], 'uitkijkpunt', 2, MM_POI_FAR_M);
  add('ommeland', world.map.meta.monumenten || [], 'monument', 2, MM_POI_FAR_M); // monumentgebieden (heritagearea.js)

  // the most important place wins where two would touch
  pois.sort((a, b) => mapPriority(b[0]) - mapPriority(a[0]));
  return pois;
}

// max: hoeveel plekken hooguit (minimapstyle.js plekBudget: minder naarmate je harder gaat); alpha: stil als er een doel is (plekAlpha)
function drawMinimapPois(ctx, world, job, placed, inRange, toScreen, t, max = Infinity, alpha = 1) {
  const pois = minimapPoiList(world, job, hoofdspeler(world));
  const gap2 = MM_POI_GAP_PX * MM_POI_GAP_PX;
  const drawn = _poiDrawn; // vlak: soort, sx, sy per icoon (geen array per icoon)
  drawn.length = 0;
  const xy = _poiXY;
  const mist = getSettings().showFog; // 20-11: in nog onbezocht gebied geen pins op de minikaart (zoals op de grote kaart)
  for (let k = 0; k < pois.length && drawn.length < max * 3; k++) {
    const p = pois[k], kind = p[0], x = p[1], y = p[2];
    if (!inRange(x, y)) continue;
    if (mist && !pinBlijftInMist(kind, null) && plekOnbezocht(x, y)) continue;
    toScreen.into(x, y, xy);
    const sx = xy[0], sy = xy[1];
    let blocked = false;
    for (let i = 0; i < placed.length && !blocked; i += 2) blocked = (placed[i] - sx) ** 2 + (placed[i + 1] - sy) ** 2 < gap2;
    if (blocked) continue;
    placed.push(sx, sy);
    drawn.push(kind, sx, sy);
  }
  const opts = _poiOpts;
  opts.t = t; opts.alpha = alpha;
  ctx.globalAlpha = alpha;
  for (let i = 0; i < drawn.length; i += 3) {
    drawMapIconHalo(ctx, drawn[i], drawn[i + 1], drawn[i + 2], MM_POI_ICON);
    drawMapIcon(ctx, drawn[i], drawn[i + 1], drawn[i + 2], MM_POI_ICON, opts);
  }
  ctx.globalAlpha = 1;
}
const _poiOpts = { t: 0, alpha: 1 };

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
    ctx.fillStyle = kaartTekst(q.land ? inkA('cream', 0.5) : inkA('seaLabel', 0.65));
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
    ctx.fillStyle = kaartTekst(q.land ? inkA('cream', 0.42) : inkA('seaLabel', 0.55));
    ctx.fillText(name, sx, sy);
  }
  for (const q of villageCache.neighbours) {
    const name = q.name.toUpperCase();
    const [sx, sy] = keep(name, ...toScreen(q.x, q.y));
    ctx.fillStyle = kaartTekst(inkA('cream', 0.36));
    ctx.fillText(name, sx, sy);
  }
  ctx.font = "15px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif";
  ctx.lineWidth = 3;
  ctx.strokeStyle = labelHalo(0.85);
  ctx.fillStyle = kaartTekst(INK.cream);
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
    if (++n >= 3) break; // #638: hoogstens drie plaatsnamen op de minimap
  }
  ctx.restore();
}

// De cadans (#804: dure kaart 20 fps, lichte 30 fps, stilstaand rustig) staat in minimapcadence.js.
const MAX_POLITIE_ICONEN = 3;
let mmLastAt = 0, mmCostMs = 0, mmPrev = null, mmSettling = true, mmLokaal = false;

function drawMinimap(dt, world) {
  syncMapPhase(world);
  const ctx = els.mmCtx;
  // 23-11: precies de apparaatpixels van het vak (ResizeObserver hierboven); dpr is dan apparaatpixels per HUD-px van een kaart van 250
  const px = backingPx(mmBoxPx, MINIMAP_SIZE, hudPixelRatio());
  sizeSquareCanvas(els.mmCanvas, px);
  const dpr = px / MINIMAP_SIZE;
  // "jij" is de bestuurde entiteit (viewanchor.js): plek, richting en kijkhoek komen van de duif, de heli, het voertuig of de trein;
  // het lichaam leent de rest (inVehicle enz.)
  const body = hoofdspeler(world);
  const anchor = easeAnchor(mmEase, getViewAnchor(world, { body }), dt);
  const player = Object.assign(Object.create(body), { x: anchor.x, y: anchor.y, angle: anchor.heading });
  const t = performance.now() / 1000;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, els.mmCanvas.width, els.mmCanvas.height);

  // 24-11 (localmap.js): speelt de speler in een afgebakende plek (voetbalveld, padelbaan, kartcircuit), dan toont de minimap die plek; elke beurt opnieuw gevraagd, dus
  // zodra de activiteit eindigt (hoe dan ook) staat de wereldkaart er weer. De volledige kaart (M) blijft de wereldkaart.
  const lokaal = activeLocalMap(world);
  if (lokaal) {
    mmSettling = true; // de stippen bewegen: de lichte cadans
    drawLocalMap(ctx, lokaal, { dt, dpr, maat: MINIMAP_SIZE, beperkt: reducedMotion(), eigen: (c, x, y, h) => drawMiniSpeler(c, x, y, h) });
    mmLokaal = true;
    return;
  }
  if (mmLokaal) { mmLokaal = false; resetLocalMapDraw(); mmPrev = null; }

  const speed = player.inVehicle ? Math.abs(player.inVehicle.speed || 0) : 0;
  mmMode = travelModeOf(world);
  const mode = MINIMAP_MODE[mmMode] || MINIMAP_MODE.lopen;
  const st = getSettings();
  // a running mission zooms the minimap in on its area (missionmap.js)
  const layer = getMissionLayer(world);
  updateMissionNotices(world, layer);
  // 23-11 (minimapstyle.js): de zoom volgt een gladgestreken snelheid en eased los van de framerate; bij Beweging beperken
  // twee vaste standen (dichtbij, ver) die in één keer wisselen, en de draaiing volgt de camera zonder eigen naloop
  const beperkt = reducedMotion();
  const top = minimapTopSpeed(mmMode);
  mmSpeed = volgSnelheid(mmSpeed, speed, dt);
  if (beperkt) mmZoomStap = zoomStap(mmZoomStap, speed, top);
  const targetScale = missionMinimapScale(layer, minimapScale(mmMode, beperkt ? mmZoomStap * top : mmSpeed, st.minimapZoom || 1), MINIMAP_SIZE);
  const zoom = naarZoom(mmScale, targetScale, dt, beperkt);
  mmScale = zoom.waarde;
  const MM_RADIUS_M = MINIMAP_SIZE / 2 * 1.42 / mmScale;

  const cx = MINIMAP_SIZE / 2, cy = MINIMAP_SIZE / 2;
  // The map rotates so the camera heading always points up (or stays north-up
  // in the air or by setting); any world angle plus mapRotation gives its
  // on-screen angle. A change of mode turns it smoothly.
  // viewanchor.js: de camerahoek, maar de richting van de duif, heli, het vliegtuig en de trein, en bij een scenecamera de eigen richting
  const rotTarget = mapUpRotation(anchor, northUp(st.minimapNorth, mmMode));
  const draai = naarHoek(mmRot, rotTarget, dt, beperkt);
  mmRot = draai.waarde;
  mmSettling = zoom.bezig || draai.bezig;
  const mapRotation = mmRot;
  const cosR = Math.cos(mapRotation), sinR = Math.sin(mapRotation);
  ctx.translate(cx * dpr, cy * dpr);
  ctx.rotate(mapRotation);
  ctx.scale(mmScale * dpr, mmScale * dpr);
  ctx.translate(-player.x, -player.y);

  // 23-11: het land (alles wat stilligt) komt uit één gecachete laag, noord-boven in wereldmaat, en wordt hier gedraaid neergelegd
  // (minimapstyle.js LAND_LAYERS, landVerouderd). Alleen de rijdende treinen komen er elke tekenbeurt bovenop.
  drawMiniLandCached(ctx, world, player, MM_RADIUS_M, mode, dpr, mmSettling);
  ctx.globalAlpha = 1 - mode.dimLand;
  drawTrainsOnMap(ctx);
  ctx.globalAlpha = 1;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const iconRangeM = (MINIMAP_SIZE / 2 - 8) / mmScale;
  const toScreen = (x, y) => {
    const dx = x - player.x, dy = y - player.y;
    return [cx + (dx * cosR - dy * sinR) * mmScale, cy + (dx * sinR + dy * cosR) * mmScale];
  };
  // dezelfde afbeelding zonder array per punt (de POI-lus, #1008)
  toScreen.into = (x, y, out) => {
    const dx = x - player.x, dy = y - player.y;
    out[0] = cx + (dx * cosR - dy * sinR) * mmScale;
    out[1] = cy + (dx * sinR + dy * cosR) * mmScale;
    return out;
  };

  if (edgeDistance(player.x, player.y) > -150) drawVillageNames(ctx, player, MM_RADIUS_M, toScreen);

  const search = getPoliceSearch(world);
  if (search) {
    const [sx, sy] = toScreen(search.x, search.y);
    drawSearchArea(ctx, sx, sy, search.r * mmScale, t);
  }

  // 23-11 (minimapstyle.js routeLook): eerst de andere routes, dun en stil, dan de route die je volgt bovenop, dik met een papieren rand
  const volgRoute = getActiveRoute();
  for (let pass = 0; pass < 2; pass++) for (const route of getRoutes()) {
    if ((route === volgRoute) !== (pass === 1)) continue;
    if (route.fly || (route.noRoute && route.mode === 'boat')) { drawCrowLine(ctx, toScreen(player.x, player.y), toScreen(route.target.x, route.target.y), ROUTE_COLORS[route.kind] || ROUTE_COLORS.user); continue; }
    const ahead = getRouteAhead(MM_RADIUS_M * 2.5, route);
    if (ahead && ahead.length > 1) drawMiniRoute(ctx, player, ahead, toScreen, ROUTE_COLORS[route.kind] || ROUTE_COLORS.user, route.kind, route === volgRoute);
  }
  const inRange = (x, y) => (x - player.x) ** 2 + (y - player.y) ** 2 <= iconRangeM * iconRangeM;
  const heliMarks = getHeliRunMarks();
  if (heliMarks) drawHeliRunMarks(ctx, heliMarks, toScreen, inRange, mmScale, t);
  // a minigame on the spot (padel, carbid, the kermis) or a heli run: no other mission or story marks
  const busyGame = gameBusy(world);
  const placed = [];
  // #638: de minimap heeft een totaalbudget; de straten zijn waar hij voor bestaat, dus losse
  // iconen (politie, cash, doelen) mogen hem niet volzetten.
  let iconCount = 0;
  const icon = (kind, x, y, opts) => {
    if (iconCount >= MM_ICON_BUDGET || !inRange(x, y)) return false;
    const [sx, sy] = toScreen(x, y);
    drawMapIcon(ctx, kind, sx, sy, MM_ICON, { t, ...opts });
    placed.push(sx, sy);
    iconCount++;
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
  // samen spelen: de doelen van de groep (#368, #452, #492); een gast ziet die van de gastheer, de gastheer die van de groepen
  const gastDoelLijst = world.coopRole === 'client' && !showMission && !job ? gastDoelen(world) : [];
  const groepDoelen = kaartDoelen(world);
  const eigenGroepDoelen = showMission || job ? [] : groepDoelen.filter((gd) => gd.eigen);
  const gastStart = world.coopRole === 'client' && !showMission && !job && !gastDoelLijst[0] && world.coopHost && world.coopHost.starts && world.coopHost.starts[0]; // het beginpunt van de volgende opdracht van de gastheer (#434)
  // #1078 navtarget.js: welk doel de pijl volgt (gevuld), welke wachten (hol) en welke doelen dezelfde plek zijn
  const careRoute = getCareRoute();
  const lekGarage = lekkeBandGarage(player.inVehicle, player.x, player.y);
  const goalNu = getGoal();
  const nav = resolveNavTargets(snapshotFromWorld(world, {
    speler: { x: player.x, y: player.y }, modus: mmMode, busyGame, goal: goalNu, missieOpKaart: missionOnMap(world), vorig: navVorig,
    heli: heliMarks && heliMarks.target ? heliMarks.target : null,
    groep: [dichtstbijDoel(gastDoelLijst, player.x, player.y), dichtstbijDoel(eigenGroepDoelen, player.x, player.y)].filter(Boolean).map((r) => r.doel).concat(gastStart ? [gastStart] : []),
    zorg: lekGarage ? { x: lekGarage.x, y: lekGarage.y, name: 'Garage' } : careRoute && careRoute.target ? { x: careRoute.target.x, y: careRoute.target.y, name: careRoute.target.name } : null,
  }));
  navVorig = nav.actief ? { type: nav.actief.type, id: nav.actief.id } : null;
  // twee doelen op dezelfde plek zijn één doel: het lagere krijgt geen eigen markering (de speler zag eerst een paarse pin onder een gele ring)
  const samen = (id) => nav.verborgen.some((v) => v.id === id && /^zelfde plek/.test(v.reden));
  const missieMarker = showMission && !samen('missie');
  if (showMission) reserve(m.marker.x, m.marker.y);
  if (wp) reserve(wp.x, wp.y);
  const showOwn = minimapShows('car');
  if (showOwn) for (const o of owned) reserve(o.x, o.y);
  const storyShop = busyGame ? null : storyTargetShop(world);
  const storyAt = storyShop && inRange(storyShop.x, storyShop.y) ? toScreen(storyShop.x, storyShop.y) : null;
  if (storyAt) placed.push(storyAt[0], storyAt[1]);
  // a mission layer quiets the places that do not count for it
  // 23-11 (minimapstyle.js): hoe harder je gaat hoe minder plekken, en met een doel stappen ze een tree terug
  if (!(layer && layer.quiet)) drawMinimapPois(ctx, world, job, placed, inRange, toScreen, t, plekBudget(mmSpeed, top), plekAlpha(!!nav.actief));
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


  if (job) {
    for (const d of job.dots) icon('sj-dot', d.x, d.y);
    if (job.marker) icon('sj-target', job.marker.x, job.marker.y);
  }
  // a post-game challenge's next checkpoint (postgame.js)
  const ct = !job && world.challengeTarget;
  if (ct) {
    if (ct.path.length) drawRoute(ctx, [...ct.path, ct].map((w) => toScreen(w.x, w.y)), MM_ICON);
    icon('sj-target', ct.x, ct.y);
  }
  if (showMission) {
    const wps = m.phase === 'active' ? m.remainingWaypoints || [] : [];
    if (wps.length) {
      drawRoute(ctx, [m.marker, ...wps].map((w) => toScreen(w.x, w.y)), MM_ICON);
      for (const w of wps) icon('waypoint', w.x, w.y);
    }
    const kind = missionMapKind(m.index, m.phase === 'active');
    if (missieMarker) icon(kind, m.marker.x, m.marker.y);
  }
  // samen spelen: het doel van de opdracht van de gastheer staat ook op de minimap van een gast (#368)
  // (de lijsten staan hierboven bij navdoel; de pijl naar het dichtstbijzijnde doel komt uit nav, #452)
  for (const gd of gastDoelLijst) icon(gd.soort === 'controle' ? 'waypoint' : missionMapKind(-1, true), gd.x, gd.y);
  // samen spelen (#492): op de gastheer de groepen uit het register. De eigen groep staat vol en bovenop; de andere groepen mogen
  // gedempt mee en overschrijven de eigen markering niet. Loopt de eigen opdracht al op de kaart, dan is die marker genoeg.
  if (!busyGame) for (const gd of groepDoelen) if (!gd.eigen) icon(gd.soort === 'controle' ? 'waypoint' : missionMapKind(-1, true), gd.x, gd.y, { alpha: KAART_ANDER_ALPHA });
  for (const gd of eigenGroepDoelen) icon(gd.soort === 'controle' ? 'waypoint' : missionMapKind(-1, true), gd.x, gd.y);
  if (gastStart) icon(missionMapKind(gastStart.index, false), gastStart.x, gastStart.y);

  if (wp && !busyGame && !samen('eigen')) icon('userWaypoint', wp.x, wp.y);

  // eigen voertuigen: op de minimap als ze erin vallen, anders een pijl aan de rand (de Escapade en de dichtstbijzijnde andere)
  const ownEdges = [];
  if (showOwn) {
    for (const o of owned) icon('own', o.x, o.y, { vkind: o.kind, color: o.color });
    for (const o of eigenRandMarkers(owned, player.x, player.y, (x, y) => !inRange(x, y))) ownEdges.push(edgeAngle(o.x, o.y));
  }

  // lekke band (#985): de dichtstbijzijnde garage gloeit op de minimap, buiten beeld als pijl aan de rand
  if (lekGarage) {
    if (inRange(lekGarage.x, lekGarage.y)) {
      const [sx, sy] = toScreen(lekGarage.x, lekGarage.y);
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.4 * pulseAt(t);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = ROUTE_COLORS.care;
      ctx.beginPath(); ctx.arc(sx, sy, 8 + 2.5 * pulseAt(t), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      drawMapIconHalo(ctx, 'garage', sx, sy, MM_ICON);
      drawMapIcon(ctx, 'garage', sx, sy, MM_ICON, { t });
    }
  }

  const c = world.companion;
  if (c && c.state !== 'dead' && !c.inVehicle && minimapShows('companion')) icon('companion', c.x, c.y);
  // medespelers (samen spelen, #95): buiten beeld blijven ze als gekleurde pijl aan de rand staan
  const partnerEdges = [];
  for (const p of world.coopPartners || []) if (p.zichtbaar && !icon('partner', p.x, p.y, { kleur: p.kleur, vorm: p.vorm, angle: p.heading + mapRotation })) partnerEdges.push({ a: edgeAngle(p.x, p.y), kleur: p.kleur });

  // roepjes van de medespelers (samen spelen, #367): een ster of kruis in de kleur van wie riep
  for (const m of world.coopPingMarks || []) if (!icon('partner', m.x, m.y, { kleur: m.kleur, vorm: m.vorm, angle: 0 })) partnerEdges.push({ a: edgeAngle(m.x, m.y), kleur: m.kleur });

  // #638: bij vijf sterren stonden er tien schilden over de straten, dus hoogstens de MAX_POLITIE_ICONEN dichtstbijzijnde.
  // #1080: geen ring, stippen of chip meer: de sterren staan op één plek (rechtsboven); de minimap toont alleen waar de politie staat.
  const polities = [];
  forEachPoliceUnit(world, (x, y, kind) => polities.push({ x, y, kind, d: (x - player.x) ** 2 + (y - player.y) ** 2 }));
  if (polities.length > 1) polities.sort((a, b) => a.d - b.d);
  for (let i = 0; i < polities.length && i < MAX_POLITIE_ICONEN; i++) icon(polities[i].kind, polities[i].x, polities[i].y);
  let cashN = 0;
  forEachCashTarget(world, (x, y) => { if (cashN < 3 && icon('cash', x, y)) cashN++; });

  drawMiniSpeler(ctx, cx, cy, player.angle + mapRotation);

  drawNorthIndicator(ctx, cx, cy, mapRotation - Math.PI / 2, dpr);
  const wind = miniWind(world);
  if (wind) drawMiniWind(ctx, WIND_X, MINIMAP_SIZE - WIND_Y, wind, mapRotation);

  // de kompasboog (navpijl.js, ontwerp C): het doel dat je volgt als boog met icoon en afstand, wachtende doelen, medespelers en voertuigen als punten
  const palet = markerColors();
  const actieveRoute = getActiveRoute();
  const kompas = [];
  const anderen = [...ownEdges.map((a) => ({ a, kleur: C.greenLight, icoon: GLYPH.auto })), ...partnerEdges.filter((e) => e.a != null).map((e) => ({ a: e.a, kleur: e.kleur, icoon: GLYPH.speler }))];
  kompas.push(...anderen.slice(0, MAX_ANDEREN));
  for (const d of [...nav.secundair, ...(nav.actief ? [nav.actief] : [])]) {
    if (inRange(d.x, d.y)) continue; // in beeld staat zijn marker; de markering aan de rand is voor wat buiten de kaart ligt
    const actief = d.rol === 'actief';
    kompas.push({ a: edgeAngle(d.x, d.y), kleur: navColor(d, palet), icoon: GLYPH[d.glyph] || GLYPH.punt, actief, tekst: actief ? compactDistance(distanceFor(d, actieveRoute)) : '' });
  }
  // obstakels op of bij de rand waar de markers omheen schuiven: de N-badge en het windschijfje (de hitte-chip is er niet meer, #1141)
  const obstakels = [{ a: mapRotation - Math.PI / 2, nodig: 31, r: 13, inset: 17 }];
  if (wind) obstakels.push({ a: Math.atan2(MINIMAP_SIZE - WIND_Y - cy, WIND_X - cx), nodig: 34, r: 24, x: WIND_X, y: MINIMAP_SIZE - WIND_Y });
  drawKompasRand(ctx, MINIMAP_SIZE, kompas, { t, beweging: !reducedMotion(), obstakels });
}

// De kleuren van route en speler op de minimap, uit de tokens (inkt en papier van het drukwerk), één keer gemaakt.
let mmInkt = null;
function mmKleuren() {
  return mmInkt || (mmInkt = {
    inkt: dsKleur('ink-inkt'), randInkt: hexA(dsKleur('ink-inkt'), 0.9), papier: hexA(dsKleur('ink-papier'), 0.92),
    kring: inkA('greenLight', 0.2), groen: INK.greenLight, creme: INK.cream,
  });
}

// Een route op de minimap (23-11, minimapstyle.js routeLook). De route die je volgt: papieren rand, inktrand, de kleur van zijn
// soort en inktchevrons in de looprichting (missie); paars, oranje en roze houden hun eigen streeppatroon (vorm naast kleur).
// Een andere route is dun en stapt terug. Schermpunten in één platte lijst, zonder array per punt.
const _routeXY = [];
const _rxy = [0, 0];
const _dashes = new Map();
const GEEN_STREEP = [];
function drawMiniRoute(ctx, player, ahead, toScreen, kleur, kind, actief) {
  const L = routeLook(actief);
  const xy = _routeXY;
  xy.length = 0;
  toScreen.into(player.x, player.y, _rxy); xy.push(_rxy[0], _rxy[1]);
  for (const p of ahead) { toScreen.into(p[0], p[1], _rxy); xy.push(_rxy[0], _rxy[1]); }
  const n = xy.length;
  if (n < 4) return;
  const k = mmKleuren();
  ctx.save();
  ctx.globalAlpha = L.alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(xy[0], xy[1]);
  for (let i = 2; i < n; i += 2) ctx.lineTo(xy[i], xy[i + 1]);
  if (L.halo) { ctx.lineWidth = L.width + L.casing + 2 * L.halo; ctx.strokeStyle = k.papier; ctx.stroke(); }
  ctx.lineWidth = L.width + L.casing;
  ctx.strokeStyle = k.randInkt;
  ctx.stroke();
  ctx.lineWidth = L.width;
  ctx.strokeStyle = kleur;
  ctx.stroke();
  const dash = ROUTE_DASH[kind];
  if (dash) {
    const sleutel = kind + L.width;
    let d = _dashes.get(sleutel);
    if (!d) _dashes.set(sleutel, (d = dash.map((v) => v * L.width)));
    ctx.setLineDash(d);
    ctx.lineWidth = Math.max(1.2, L.width * 0.42);
    ctx.strokeStyle = k.randInkt;
    ctx.stroke();
    ctx.setLineDash(GEEN_STREEP);
  } else if (L.chevrons) routeChevrons(ctx, xy, n, k.inkt);
  ctx.restore();
}
// Inktchevrons langs de route, elke CHEVRON_STAP px, niet vlak bij de speler en niet vlak bij het einde, alleen binnen de kaart.
function routeChevrons(ctx, xy, n, inkt) {
  let totaal = 0;
  for (let i = 0; i + 3 < n; i += 2) totaal += Math.hypot(xy[i + 2] - xy[i], xy[i + 3] - xy[i + 1]);
  const m = CHEVRON_MAAT;
  let rest = 18, afgelegd = 0;
  ctx.beginPath();
  for (let i = 0; i + 3 < n; i += 2) {
    const ax = xy[i], ay = xy[i + 1], bx = xy[i + 2], by = xy[i + 3];
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 1e-3) continue;
    const ux = (bx - ax) / len, uy = (by - ay) / len;
    let d = rest;
    for (; d <= len; d += CHEVRON_STAP) {
      if (afgelegd + d > totaal - 14) break;
      const px = ax + ux * d, py = ay + uy * d;
      if (px < 4 || py < 4 || px > MINIMAP_SIZE - 4 || py > MINIMAP_SIZE - 4) continue;
      ctx.moveTo(px - ux * m * 0.7 - uy * m, py - uy * m * 0.7 + ux * m);
      ctx.lineTo(px + ux * m * 0.7, py + uy * m * 0.7);
      ctx.lineTo(px - ux * m * 0.7 + uy * m, py - uy * m * 0.7 - ux * m);
    }
    rest = d - len;
    afgelegd += len;
  }
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = inkt;
  ctx.stroke();
}

// Jij op de minimap (23-11): een strakke lichtgroene pijl met een inkeping, een crème rand binnen een inktrand en een harde
// inktschaduw (het drukwerk van de kaart), op een stille lichtgroene kring zodat je altijd te vinden bent. Geen verloop per beeld.
function spelerPijl(ctx) {
  const P = SPELER_PIJL;
  ctx.beginPath();
  ctx.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
  ctx.closePath();
}
function drawMiniSpeler(ctx, x, y, hoek) {
  const k = mmKleuren();
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, 12.5, 0, Math.PI * 2);
  ctx.fillStyle = k.kring;
  ctx.fill();
  ctx.save();
  ctx.translate(SPELER_SCHADUW, SPELER_SCHADUW);
  ctx.rotate(hoek);
  spelerPijl(ctx);
  ctx.fillStyle = k.inkt;
  ctx.fill();
  ctx.lineWidth = 3; // zo groot als de pijl met zijn inktrand: de schaduw steekt er 1,4 px rechtsonder onder uit
  ctx.lineJoin = 'round';
  ctx.strokeStyle = k.inkt;
  ctx.stroke();
  ctx.restore();
  ctx.rotate(hoek);
  ctx.lineJoin = 'round';
  spelerPijl(ctx);
  ctx.fillStyle = k.groen;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = k.inkt;
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = k.creme;
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

// Het land van de minimap in wereldcoördinaten (de transformatie staat al), rond (x, y) met straal R, getekend voor een kaartschaal
// (px per meter). Volgorde: minimapstyle.js LAND_LAYERS. Wordt alleen in de landcache getekend, niet per beeld.
function drawMiniLand(ctx, world, x, y, R, scale, mode) {
  const x0 = x - R, y0 = y - R, x1 = x + R, y1 = y + R;
  ctx.fillStyle = MINI_STYLE.meadow;
  ctx.fillRect(x0, y0, R * 2, R * 2);
  drawCountryMinimap(ctx, x0, y0, x1, y1, scale);
  const province = provinceMapOn();
  if (province) drawSea(ctx, (n) => n / scale, seaStyle(MINI_STYLE));

  const view = minimapView(world.map, x0, y0, x1, y1);

  if (edgeDistance(x, y) < 0) drawNeighbourhoodBorders(ctx, world, { x, y }, R, scale);

  ctx.fillStyle = MINI_STYLE.park;
  fillPolys(ctx, view.green);

  ctx.fillStyle = MINI_STYLE.water;
  fillPolys(ctx, view.water);
  // gebieden veroveren (#414, #423): boven het groen en het water, onder de wegen en gebouwen
  if (minimapShows('veroverd')) tekenVeroverdMini(ctx, scale, x, y, R);

  const emph = mode.emph;
  const landAlpha = 1 - mode.dimLand;
  for (const r of view.roads) {
    if (r.pts.length < 2) continue;
    // the paths and styles of the roads that fade out at this zoom (foot, cycle) are not worked out at all
    const rs = miniRoadStyle(r.cat, r.width, scale);
    if (rs.alpha <= 0.02) continue;
    const allowed = roadAllowed(r, mmMode);
    ctx.beginPath();
    ctx.moveTo(r.pts[0][0], r.pts[0][1]);
    for (let i = 1; i < r.pts.length; i++) ctx.lineTo(r.pts[i][0], r.pts[i][1]);
    let color = r.cat === 'major' ? MINI_STYLE.major : r.cat === 'cycle' ? MINI_STYLE.cycle : MINI_STYLE.road;
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
  }
  ctx.globalAlpha = landAlpha;
  drawRailsOnMap(ctx, world.map, x0, y0, x1, y1, 3.2, MINI_STYLE);

  fillBuildings(ctx, view.buildings, MINI_STYLE.buildings);
  ctx.globalAlpha = 1;
  // outside the province darker, with its land borders (#885: doorgetrokken op de
  // minikaart, want streeplengtes die met de zoom meeschuiven lieten de lijn trillen)
  if (province) drawOutside(ctx, [x0, y0, x1, y1], (n) => n / scale, { tint: inkA('tintMini', 0.34), width: 2.6, dash: false });
}

// De landcache (23-11, minimapstyle.js): een canvas noord-boven rond het punt waar hij getekend is, ruimer dan het beeld en
// overbemonsterd, zodat hij gedraaid scherp blijft. Opnieuw getekend alleen als het beeld de rand nadert, de zoom echt verandert,
// dag/nacht, vervoermiddel, provinciekaart of veroverde gebieden wisselen, of er nieuwe tegels binnenkomen (landVerouderd).
let mmLand = null; // { canvas, g, x, y, half, schaal, sleutel, geo, at, onvolledig, map }
const mmLandQ = { x: 0, y: 0, straal: 0, schaal: 0, sleutel: 0, geo: 0, nu: 0, bezig: false, laden: false };
let veroverdLaag = null, veroverdSig = 0;
// Een getal dat verandert als de veroverde gebieden veranderen (de laag zelf wordt eens per seconde nieuw gemaakt).
function veroverdStand() {
  if (!minimapShows('veroverd')) return -1;
  const l = gebiedenLaag();
  if (l !== veroverdLaag) {
    veroverdLaag = l;
    let h = l.lijst.length;
    for (const r of l.lijst) h = (h * 31 + (r.pct | 0) * 7 + (r.voltooid ? 3 : 0) + (r.toestand ? r.toestand.length : 0)) % 1000000007;
    veroverdSig = h;
  }
  return veroverdSig;
}
function drawMiniLandCached(ctx, world, player, R, mode, k, bezig) {
  const now = performance.now();
  const c = mmLand;
  const ver = veroverdStand();
  // de stijlsleutel als vergelijking van velden, zonder een nieuwe tekenreeks per beeld (1 = gelijk aan de cache)
  const zelfde = c && c.map === world.map && c.meadow === MINI_STYLE.meadow && c.park === MINI_STYLE.park && c.mode === mmMode && c.dim === mode.dimLand
    && c.province === provinceMapOn() && c.veroverd === ver && c.binnen === (edgeDistance(player.x, player.y) < 0);
  const q = mmLandQ;
  q.x = player.x; q.y = player.y; q.straal = R; q.schaal = mmScale; q.sleutel = zelfde ? 1 : 0;
  q.geo = world.map.geoVer || 0; q.nu = now; q.bezig = bezig; q.laden = !!(c && c.onvolledig);
  if (landVerouderd(c, q)) {
    const m = landMaat(R, mmScale, k);
    const l = mmLand || (mmLand = { canvas: document.createElement('canvas'), g: null });
    sizeSquareCanvas(l.canvas, m.px);
    const g = l.g || (l.g = l.canvas.getContext('2d'));
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, m.px, m.px);
    g.setTransform(m.res, 0, 0, m.res, -(player.x - m.half) * m.res, -(player.y - m.half) * m.res);
    drawMiniLand(g, world, player.x, player.y, m.half, mmScale, mode);
    Object.assign(l, {
      x: player.x, y: player.y, half: m.half, schaal: mmScale, geo: q.geo, at: now, onvolledig: miniTilesPending(), map: world.map,
      meadow: MINI_STYLE.meadow, park: MINI_STYLE.park, mode: mmMode, dim: mode.dimLand, province: provinceMapOn(), veroverd: ver,
      binnen: edgeDistance(player.x, player.y) < 0, sleutel: 1,
    });
  }
  const l = mmLand;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(l.canvas, l.x - l.half, l.y - l.half, l.half * 2, l.half * 2);
}

// A heli run (helirun.js): its rings as circles where they hang, the H to land
// on and the balloon. Drawn through toScreen, so they stay put while the map turns.
const HELI_RING_COLORS = { next: INK.ringNext, later: inkA('ringLater', 0.75), done: INK.heliDone, miss: INK.heliMiss };
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
    ctx.fillStyle = INK.green;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK.cream;
    ctx.stroke();
    ctx.fillStyle = INK.cream;
    ctx.fillRect(sx - 3.5, sy - 4, 1.8, 8);
    ctx.fillRect(sx + 1.7, sy - 4, 1.8, 8);
    ctx.fillRect(sx - 3.5, sy - 0.9, 7, 1.8);
  }
  if (marks.balloon && inRange(marks.balloon.x, marks.balloon.y)) {
    const [sx, sy] = toScreen(marks.balloon.x, marks.balloon.y);
    ctx.beginPath();
    ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = INK.balloon;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = INK.dark;
    ctx.stroke();
  }
  ctx.restore();
}

// The N badge sits on the square's edge, towards north (23-11: paper with an ink edge and a hard shadow, like the minimap's own
// frame, and a small ink point outwards that says where north is; minimapstyle.js NOORD). k: device px per HUD px.
function drawNorthIndicator(ctx, cx, cy, screenAngle, k = 1) {
  const half = MINIMAP_SIZE / 2 - NOORD.inset;
  const dx = Math.cos(screenAngle), dy = Math.sin(screenAngle);
  const t = Math.min(half / (Math.abs(dx) || 1e-6), half / (Math.abs(dy) || 1e-6));
  const x = cx + dx * t, y = cy + dy * t;
  const kk = Math.round(k * 100) / 100;
  if (!northGlyph || northGlyph.k !== kk || (!northGlyph.font && document.fonts && document.fonts.check('bold 10px "Bebas Neue"'))) northGlyph = makeNorthGlyph(kk);
  const r = NOORD.r;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(screenAngle);
  ctx.beginPath();
  ctx.moveTo(r + NOORD.punt + 0.6, 0);
  ctx.lineTo(r - 0.4, -4);
  ctx.lineTo(r - 0.4, 4);
  ctx.closePath();
  ctx.fillStyle = NOORD_INKT.inkt;
  ctx.fill();
  ctx.restore();
  ctx.drawImage(northGlyph.c, x - 13, y - 13, 26, 26);
}

// The wind while you sail (#399): a dark disc in the lower left corner of the minimap with an arrow that points where
// the wind blows to (like the wind gauge, zeilvaren.js) and one to three streaks that grow with the wind speed; the
// speed in m/s under it. The same disc and ring as the N, so it reads as part of the minimap.
export const WIND_X = 30, WIND_Y = 48;
export function drawMiniWind(ctx, x, y, wind, mapRotation) {
  const { t, streepjes } = windSterkte(wind.snelheid);
  const half = 9 + t * 6; // half the arrow's length, 9 to 15 px
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fillStyle = inkA('dark', 0.82);
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = INK.greenLight;
  ctx.stroke();
  ctx.rotate(windPijlHoek(wind.van, mapRotation));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK.cream;
  ctx.fillStyle = INK.cream;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-half, 0);
  ctx.lineTo(half - 4, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(half, 0);
  ctx.lineTo(half - 7, -4.8);
  ctx.lineTo(half - 7, 4.8);
  ctx.closePath();
  ctx.fill();
  // the streaks run alongside the shaft, the stronger the wind the more of them
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (streepjes >= 2) for (const sy of [-5.5, 5.5]) { ctx.moveTo(-half, sy); ctx.lineTo(-half + 8, sy); }
  if (streepjes >= 3) for (const sy of [-10, 10]) { ctx.moveTo(-half + 2, sy); ctx.lineTo(-half + 8, sy); }
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.font = '14px "Bebas Neue", "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = inkA('dark', 0.85);
  ctx.strokeText(windTekst(wind.snelheid), x, y + 25);
  ctx.fillStyle = INK.cream;
  ctx.fillText(windTekst(wind.snelheid), x, y + 25);
  ctx.restore();
}

let northGlyph = null;
// de kleuren van de N uit de tokens (papier en inkt), één keer gelezen
const NOORD_INKT = { get inkt() { return dsKleur('ink-inkt'); }, get papier() { return dsKleur('ink-papier'); } };
function makeNorthGlyph(k) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(26 * k);
  const g = c.getContext('2d');
  g.scale(c.width / 26, c.height / 26);
  const r = NOORD.r;
  g.beginPath();
  g.arc(13 + 1.2, 13 + 1.2, r, 0, Math.PI * 2); // de harde schaduw
  g.fillStyle = NOORD_INKT.inkt;
  g.fill();
  g.beginPath();
  g.arc(13, 13, r, 0, Math.PI * 2);
  g.fillStyle = NOORD_INKT.papier;
  g.fill();
  g.lineWidth = NOORD.rand;
  g.strokeStyle = NOORD_INKT.inkt;
  g.stroke();
  g.fillStyle = NOORD_INKT.inkt;
  g.font = '16px "Bebas Neue", "Arial Narrow", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('N', 13, 14);
  return { c, k, font: !!(document.fonts && document.fonts.check('bold 10px "Bebas Neue"')) };
}

// The map behind the minimap: the grids are asked for 25% more than the view needs and the answer is kept for
// 0.4 s (the view moves a few metres in that time), cut to the view by the bounds each time: at the zoomed-out
// scales of a train, a heli or the A7 a query was ~15% of the minimap's time. Trees are not drawn.
let mmViewCache = null;
const MM_VIEW_MARGIN = 0.25, MM_VIEW_KEEP_MS = 400;
const inView = (it, x0, y0, x1, y1) => { const b = it.bounds; return !b || !(b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1); };
function minimapView(map, x0, y0, x1, y1) {
  const now = performance.now(), c = mmViewCache;
  if (!(c && c.map === map && now - c.at < MM_VIEW_KEEP_MS && x0 >= c.x0 && y0 >= c.y0 && x1 <= c.x1 && y1 <= c.y1)) {
    const mx = (x1 - x0) * MM_VIEW_MARGIN, my = (y1 - y0) * MM_VIEW_MARGIN;
    mmViewCache = { map, at: now, x0: x0 - mx, y0: y0 - my, x1: x1 + mx, y1: y1 + my, view: map.queryView(x0 - mx, y0 - my, x1 + mx, y1 + my, false) };
    const v = mmViewCache.view;
    return { roads: v.roads.filter((it) => inView(it, x0, y0, x1, y1)), buildings: v.buildings.filter((it) => inView(it, x0, y0, x1, y1)), water: v.water.filter((it) => inView(it, x0, y0, x1, y1)), green: v.green.filter((it) => inView(it, x0, y0, x1, y1)), trees: [] };
  }
  const v = c.view;
  return { roads: v.roads.filter((it) => inView(it, x0, y0, x1, y1)), buildings: v.buildings.filter((it) => inView(it, x0, y0, x1, y1)), water: v.water.filter((it) => inView(it, x0, y0, x1, y1)), green: v.green.filter((it) => inView(it, x0, y0, x1, y1)), trees: [] };
}

// Polygons of one colour as one path per winding direction (nonzero fill: two overlapping polygons that wind
// the other way would cancel each other out in one path), instead of a path, a fill and a fillStyle each.
const polyWinding = (o) => {
  if (o._mmw === undefined) { let a = 0; const p = o.pts; for (let i = 0; i < p.length - 1; i++) a += p[i][0] * p[i + 1][1] - p[i + 1][0] * p[i][1]; o._mmw = a < 0 ? 1 : 0; }
  return o._mmw;
};
// no closePath: a fill closes its subpaths itself, and in a path of thousands of subpaths every closePath is slow (~1 ms each in Chromium's canvas)
function addPoly(ctx, pts) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}
function fillPolys(ctx, list) {
  for (let w = 0; w < 2; w++) {
    let any = false;
    ctx.beginPath();
    for (const o of list) if (o.pts.length >= 2 && polyWinding(o) === w) { addPoly(ctx, o.pts); any = true; }
    if (any) ctx.fill();
  }
}
function fillBuildings(ctx, list, colors) {
  const n = colors.length + 1; // the last colour index is the church (a landmark)
  const buckets = [];
  for (let i = 0; i < n * 2; i++) buckets.push([]);
  for (const b of list) {
    if (b._mmc === undefined) b._mmc = b.landmark ? n - 1 : Math.floor(mmHash(b.pts[0][0], b.pts[0][1]) * colors.length);
    buckets[b._mmc * 2 + polyWinding(b)].push(b.pts);
  }
  for (let i = 0; i < buckets.length; i++) {
    if (!buckets[i].length) continue;
    ctx.fillStyle = (i >> 1) === n - 1 ? MINI_STYLE.church : colors[i >> 1];
    ctx.beginPath();
    for (const pts of buckets[i]) addPoly(ctx, pts);
    ctx.fill();
  }
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
// De grenzen tussen de wijken op de minikaart (#885): de lijnen liggen op een vast
// wereldraster en worden als één doorlopend pad getekend. Ze schuiven daardoor niet meer
// met de speler mee (dat was het trillen) en de cache wordt alleen bij een nieuwe cel
// opnieuw opgebouwd. De lijnbreedte staat in schermpunten, dus ook bij in- en uitzoomen
// blijft de lijn rustig.
let borderCache = null; // { gx, gy, half, lines }
function drawNeighbourhoodBorders(ctx, world, player, MM_RADIUS_M, scale) {
  const points = world.map.meta.neighbourhoodPoints;
  if (!points || !points.length) return;
  const cell = BORDER_CELL;
  const half = Math.ceil(MM_RADIUS_M / cell) + 1;
  // het venster ligt op het wereldraster (niet op de spelerspositie): de lijnen blijven
  // daardoor op hun plek en de cache vervalt pas als je een cel opschuift
  const gx = Math.floor(player.x / cell), gy = Math.floor(player.y / cell);
  if (!borderCache || borderCache.gx !== gx || borderCache.gy !== gy || borderCache.half !== half) {
    const x0 = (gx - half) * cell, y0 = (gy - half) * cell;
    const x1 = (gx + half + 1) * cell, y1 = (gy + half + 1) * cell;
    borderCache = { gx, gy, half, lines: borderSegments(points, x0, y0, x1, y1, cell) };
  }
  if (!borderCache.lines.length) return;
  ctx.save();
  ctx.beginPath();
  for (const [ax, ay, bx, by] of borderCache.lines) { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
  ctx.lineCap = 'round';
  ctx.strokeStyle = inkA('dark', 0.35);
  ctx.lineWidth = 2.8 / scale;
  ctx.stroke();
  ctx.strokeStyle = inkA('white', 0.4);
  ctx.lineWidth = 1.2 / scale;
  ctx.stroke();
  ctx.restore();
}
