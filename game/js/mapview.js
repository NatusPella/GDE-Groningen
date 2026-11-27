import { gridItems } from './spatialgrid.js';
import { oskKnop } from './oskview.js';
import { keyTextHtml } from './keycap.js';
import { districtAt } from './districtat.js';
import { setMapOpenState } from './pausestate.js';
import { sfxLinks } from './latehooks.js';
import { onPaletteChange } from './a11y.js';
import { pinchStep } from './touchlogic.js';
import { MODES, roadAllowed, travelModeOf } from './roadaccess.js';
import { forEachCashTarget } from './cashvan.js';
import { facilitiesOf, FAC } from './facilities.js';
import { mapIconScale, mapKindVisible, placeIcons, iconGapPx, mapIconAlpha, mapPriority } from './mapicons.js';
import { drawMapIcon, drawMapIconHalo, drawRoute, drawRoadRoute, forEachPoliceUnit, declutter, ROUTE_COLORS, routeLabel, drawSearchArea, getPoliceSearch, missionMapKind } from './hud_panel.js';
import { getGaragesForRender } from './garages.js';
import { getHomeForRender, getHomeGarageForRender, getHomeMooringForRender, getHomeHelipadForRender } from './home.js';
import { layerOn, setLayer as storeLayer } from './mapfilters.js';
import { tekenVeroverd, tekenLegenda, tekenLegendeVlag, kaartLaag, openGebied, statusRegels } from './gebiedenkaart.js';
import { dsKleur } from './kaartkleuren.js';
import { gebiedenVan } from './gebieden.js';
import { getOverzicht, opVeranderen as onGebiedenChange, bezoekPlek } from './gebiedenlive.js';
import { enqueueNotice } from './notifyqueue.js'; // alle meldingen langs de ene wachtrij (22-11)
import { pinBlijftInMist, unseenDistricts, discoveryRatio, revealAlpha, maskSize, DISCOVERY_RES_M } from './kaartontdekking.js';
import { getHorecaForRender } from './horeca.js';
import { poiRules, capPins, fadeIn, createHorecaPlanner } from './mapdeclutter.js';
import { enterablePlaces, drawDoorBadge } from './interiormap.js'; // de kaartlaag Betreedbaar (#1150)
import { getShopsForRender, getShopsDecluttered, storyTargetShop, drawStoryShopRing } from './shops.js';
import { SHOP_TYPES } from './shopdata.js';
import { getOwnedVehiclesForMap } from './ownedvehicles.js';
import { getPigeonSpotsForRender } from './pigeonspots.js';
import { getHeliSpotsForRender, getHeliRunMarks } from './helirun.js';
import { getPadelSpotsForRender } from './padel.js';
import { activityMapIcons, ACTIVITY_LEGEND } from './activities.js';
import { getPostgameSpotsForRender } from './postgame.js';
import { getOnderdeelSpotsForRender } from './onderdelenlive.js'; // #837
import { getWrakduikSpotsForRender } from './wrakduikenlive.js'; // #839
import { getStreekuitdagingSpotsForRender } from './streekuitdaginglive.js'; // #835
import { getStationsForRender } from './stationtravel.js';
import { liveBusMarks, roosterBusMarks } from './busmap.js';
import { haltesVoorKaart } from './bushalte.js';
import { reisOptiesVoor, tekenLijnen, lijnLagen } from './reiskaart.js';
import { kaartRijen } from './ovkaart.js';
import { actieModel, reisKeuzes, infoRegels, GAST_REIS_MELDING, UITLEG_ID, klikActie } from './kaartactie.js';
import { navIndex, PAGE_SWITCH_KEYS, rijCijfer } from './listnav.js';
import { actiesHtml, reisPopupHtml, infoHtml, uitlegHtml, hierHtml, legendaHintHtml, sluitHtml, KAART_ACTIE_CSS } from './kaartactieui.js';
import { markSeen, parseSeen } from './hudtext.js';
import { optieRegel } from './ovopties.js';
import { startMeerijden } from './reisrit.js';
import { VILLAGES } from './ommelandlines.js';
import { ommelandMapSpots } from './ommelandmap.js';
import { beppeMapSpot } from './beppe_garden.js';
import { parkMapSpots as voetbalParkSpots } from './voetbalcarrierelive.js'; // #1117: de sportparken in de laag Voetbal
import { markerVisible } from './featurereveal.js'; // 22-11: Percelen en Te koop staan pas na het verhaal op de kaart
import { perceelMapSpots, eigenPerceelVlakken, tekenVeldBadge } from './perceelmap.js';
import { forSaleView, parcelOffer, koopPerceel, verkoopPerceel, bezitOpen, ensureIndex } from './bezitlive.js';
import { pickShape } from './forsalemap.js';
import { drawForSale } from './forsaledraw.js';
import { offerCardHtml, pointerSub } from './forsalecard.js';
import { pitchMarkerView, pickMarker } from './pitchmap.js';
import { drawPitchMarkers } from './pitchdraw.js';
import { spotCardHtml, pitchTipLine } from './pitchcard.js';
import { spotRows, koopVergunning, acquireRivalSpot, placeVan, snackOpen } from './snacklive.js';
import { myMobile } from './bezitlive.js';
import { getSideJobSpotsForRender, sideJobGateHint } from './sidejobs.js';
import { getEierbalTips } from './furniture.js';
import { drawRailsOnMap } from './railway.js';
import { drawCountryBase, drawCountryDetail, villageLabels, syncMapPhase, MAP_STYLE, builtUpAt } from './countrymap.js';
import { drawProvinceBase, provinceMapOn, provinceMapBounds, onProvinceMapLoad, preloadProvinceMap } from './provincemap.js';
import { ROAD_ORDER, ZOOM, EMPHASIS, INK, inkA, inkCss, kaartTekst, kaartRandTekst, labelHalo, roadWidthPx, layersAtZoom, ICON_MIN_ZOOM, modeLook, baseFilter, baseDimOverlay } from './mapstyle.js';
import { drawSea, drawOutside, regionLabels, regionEdgeLabels, areaNameAt, placeNameAt, regionName, regionBorderColor } from './regions.js';
import { borderPlaceLabels, borderPlaceAt } from './borderplaces.js';
import { viewpointHover, areaName } from './verkenpunten.js';
import { frameScale, clampView } from './kaartkader.js';
import { worldPlaceLabels, worldPlacesReady } from './worldplaces.js';
import { tileIndexOf, tileOrigin, TILE_M } from './gdt.js';
import { ensureCountryEdge } from './countryplan.js';
import { getSettings, onSettingsChange } from './settings.js';
import { wantsTeleport, plekNaam } from './kaartteleport.js';
import { ALLEEN_EIGEN_SPEL } from './coopgast.js';
import { DEV } from './devflags.js';
import { getGoal, setGoal, clearGoal, missionOnMap } from './goal.js';
import { resolveNavTargets, snapshotFromWorld, distanceFor, compactDistance, navColor, GLYPH } from './navtarget.js';
import { drawMapTargets } from './navpijl.js';
import { markerColors } from './a11y.js';
import { gameBusy } from './busy.js';
import { reducedMotion } from './motion.js';
import { getMissionLayer } from './missionmaplive.js';
import { selectMapItems } from './missionmap.js';
import { drawLayerAreas, drawLayerLines, layerCaption } from './missionmapdraw.js';
import { getTodoItems, chooseTodo, mapIconUrl } from './todo.js';
import { getMissionList } from './missionquery.js';
import { MEDALS } from './achievements.js';
import { nicknameOf, FLAVOUR_MAP_PLACES } from './flavourlines.js';
import {
  updateRouting, getActiveRoute, getRouteAhead, getRoutes, getCareRoute, dismissCareRoute, setUserWaypoint, clearUserWaypoint, getUserWaypoint, formatDistance, setRoutePrefs, getRoutePrefs,
  klikDoel, lineHitsBuilding,
} from './routing.js';
import { KEYS } from './storagekeys.js';
import { grijsBijPassief } from './cooppvp.js';
import { hoofdspeler } from './players.js';
import { getViewAnchor } from './viewanchor.js';
import { gastDoelen } from './coopextra.js';
import { kaartDoelen, KAART_ANDER_ALPHA } from './coopmissie.js';
import { samenWaarschuwing } from './coopstatus.js';
import { warnsOn, riskWhy } from './muggingrules.js';
import { getProfiel, getIndeling } from './gebiedenlive.js';
import { veroverdOp } from './gebieden.js';
import { loopbaanTeken } from './loopbaanlive.js'; // #674: de hoogste titel naast je eigen plek op de kaart

const PADDING = 0.94;
const ICON = 1.25;
const FONT = '"Bebas Neue", "Arial Narrow", Arial, sans-serif';
const OVERLAY_Z = 15;
const MIN_ZOOM = 0.55;
// the map extends this far past the city data, over the countryside
const COUNTRY_MARGIN = 3200;
const MAX_ZOOM = 12;
const TILE_PX = 512;
const MAX_TILES = 72;
const TILE_BUDGET_MS = 3.5;
// tile levels in half octaves of zoom; L_BASE is zoom 1 (the city's extent), the
// ones below it carry the whole province zoomed out
const L_BASE = 6;
const LEVEL_COUNT = 14;
const levelZoom = (L) => Math.SQRT2 ** (L - L_BASE);
const horecaPlan = createHorecaPlanner();
const MID_ZOOM = ZOOM.mid;
const NEAR_ZOOM = ZOOM.near;
const DRAG_PX = 4;
const HOVER_PX = 12;
// #887: de hover pakt een buurplaats of een weg binnen deze schermpunten op
const HOVER_SPOT_PX = 10;
// #899: het masker van de kaartontdekking (kaartontdekking.js) en de fade van een net
// bezochte buurt
const DISCOVERY_MARGIN = 4000; // m om de provincie heen, zodat de rand van het masker zacht valt
// #661: alleen het geraakte venster uploaden en de mist minder vaak bewaren
import { mapRenderDue, overlayPlan } from './mapcache.js';
import { isAreaHidden, isAreaKnown, isViewpointUsed, explorationLabels, onExplorationChange, onStreekOntdekt, getStrekenStand } from './explorationlive.js';
import { MIST_ALPHA, OPEN_MS, NAAMKAART_MS, mistByte, streekOwnerGrid, applyStreekMist, openingRadius, openingLevel, openingDone, focusScale, cameraStep, naamkaart, queueReveal, strekenTekst } from './kaartonthulling.js';
import { STREKEN } from './regioleven.js';
import { wgsToWorld } from './rdnew.js';
import { icoon } from './icons.js';
import { escapeHtml as escHtml } from './htmlescape.js';

// Jij op de kaart (#1141): de bestuurde entiteit (duif, heli, trein, voertuig) geeft plek en richting; het lichaam leent de rest.
function jijVan(world) {
  const body = hoofdspeler(world), a = getViewAnchor(world, { body });
  return a ? Object.assign(Object.create(body), { x: a.x, y: a.y, angle: a.heading }) : body;
}

// city ground and the endless meadows past it share one colour (countrymap.js)
// (read live: the palette turns to its night colours, see mapstyle.js)
const roadColors = (cat) => (cat === 'normal' ? MAP_STYLE.road : MAP_STYLE[cat] || MAP_STYLE.road);

let state = null;
let stylesInjected = false;

function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = inkCss(`
    .mapview-overlay {
      position: fixed;
      inset: 4vh 4vw;
      display: none;
      flex-direction: column;
      background: radial-gradient(ellipse at center, ink(panelTop) 0%, ink(dark) 100%);
      border: 2px solid ink(green);
      border-radius: 8px;
      box-shadow: 0 8px 40px ink(black 0.6);
      z-index: ${OVERLAY_Z};
      pointer-events: none;
      font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif;
      color: ink(textBright);
      overflow: hidden;
    }
    .mapview-overlay.open { display: flex; }
    .mapview-overlay.embedded {
      position: absolute; inset: 0; z-index: auto;
      border: none; border-radius: 0; box-shadow: none; background: transparent;
    }
    .mapview-overlay.embedded .mapview-title { display: none; }
    .mapview-canvas:focus { outline: none; }
    .mapview-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 8px 14px;
      letter-spacing: 1px;
      font-weight: bold;
      color: ink(greenLight);
      text-shadow: 0 1px 3px ink(black 0.9);
      border-bottom: 1px solid ink(greenLight 0.35);
      pointer-events: auto;
    }
    .mapview-title { font-size: 20px; white-space: nowrap; }
    .mv-modenote { color: ink(cream) !important; font-size: 14px !important; padding: 6px 4px 8px; }
    .mapview-search { position: relative; flex: 1; max-width: 340px; min-width: 140px; }
    .mapview-search input {
      width: 100%;
      box-sizing: border-box;
      font: 15px 'Arial Narrow', Arial, sans-serif;
      letter-spacing: 0.3px;
      color: ink(cream);
      background: ink(dark 0.85);
      border: 1px solid ink(greenLight 0.6);
      border-radius: 4px;
      padding: 6px 10px;
      outline: none;
    }
    .mapview-search input:focus { border-color: ink(greenLight); box-shadow: 0 0 0 2px ink(greenLight 0.3); }
    .mapview-search input:focus-visible { outline: 3px solid ink(cream); outline-offset: 2px; }
    .mapview-search input::placeholder { color: ink(cream 0.5); }
    .mapview-results {
      position: absolute;
      left: 0; right: 0; top: calc(100% + 4px);
      margin: 0; padding: 4px 0; list-style: none;
      background: ink(dark 0.96);
      border: 1px solid ink(greenLight 0.6);
      border-radius: 4px;
      z-index: 2;
      text-shadow: none;
    }
    .mapview-results[hidden] { display: none; }
    .mapview-results li {
      display: flex; justify-content: space-between; gap: 10px;
      padding: 5px 10px; cursor: pointer;
      font: 15px 'Arial Narrow', Arial, sans-serif; color: ink(cream); letter-spacing: 0.3px;
    }
    .mapview-results li[aria-selected="true"], .mapview-results li:hover { background: ink(greenDark); }
    .mapview-results .kind { color: ink(greenLight); font-size: max(13px, var(--menu-min, 13px)); }
    .mapview-results .empty { color: ink(cream 0.6); cursor: default; }
    .mapview-btn {
      font: inherit; font-size: 15px; letter-spacing: 1px; white-space: nowrap;
      color: ink(dark); background: ink(green); border: none; border-radius: 4px;
      padding: 6px 12px; cursor: pointer;
    }
    .mapview-btn:hover { background: ink(greenLight); }
    .mapview-btn.ghost { color: ink(cream); background: transparent; border: 1px solid ink(greenLight 0.6); }
    .mapview-card .mv-link { font: inherit; font-size: 14px; color: var(--ds-zeef-tx); background: none; border: 0; padding: 4px 2px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
    .mapview-card .mv-link:hover { color: var(--ds-c-ink-inkt); }
    .mapview-card .mv-link:focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-c-ink-inkt); outline-offset: var(--ds-focus-afstand); }
    .mapview-btn.ghost:hover { border-color: ink(greenLight); color: ink(greenLight); }
    .mapview-btn[hidden] { display: none; }
    .mapview-btn:focus-visible { outline: 3px solid ink(cream); outline-offset: 2px; }
    .mapview-route { margin-left: auto; font-size: 16px; color: ink(cream); white-space: nowrap; }
    .mapview-route .user { color: var(--nav-eigen, ${ROUTE_COLORS.user}); }
    .mapview-route .mission { color: var(--nav-actief, ${ROUTE_COLORS.mission}); }
    .mapview-route .job { color: var(--nav-klus, ${ROUTE_COLORS.job}); }
    .mapview-route .care { color: var(--nav-zorg, ${ROUTE_COLORS.care}); }
    .mapview-route > span + span { margin-left: 14px; }
    .mapview-route button { margin-left: 6px; padding: 0 6px; font: inherit; font-size: max(13px, var(--menu-min, 13px)); color: inherit; background: transparent; border: 1px solid currentColor; border-radius: 3px; cursor: pointer; }
    .mapview-footer b { color: ink(greenLight); font-weight: normal; }
    .mapview-body { position: relative; flex: 1; min-height: 0; display: flex; }
    .mapview-canvas {
      flex: 1; min-width: 0; height: 100%; display: block;
      pointer-events: auto; cursor: crosshair; touch-action: none;
      /* de rand van de kaart loopt zacht weg in plaats van als een harde vierkante
         rand; buiten het kader tekent de kaart hetzelfde donkere buurland. */
      box-shadow: inset 0 0 44px ink(black 0.5);
    }
    .mapview-canvas.dragging { cursor: grabbing; }
    .mapview-canvas.pointing { cursor: pointer; }
    .mapview-zoom {
      position: absolute; left: 12px; bottom: 44px;
      display: flex; flex-direction: column; gap: 4px; pointer-events: auto;
    }
    .mapview-zoom button {
      width: 44px; height: 44px; font: bold 22px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif;
      color: ink(greenLight); background: ink(dark 0.85);
      border: 1px solid ink(greenLight 0.6); border-radius: 4px; cursor: pointer; line-height: 1;
    }
    .mapview-zoom button:hover { border-color: ink(greenLight); background: ink(greenDark); }
    .mapview-osm {
      position: absolute; left: 12px; bottom: 12px; pointer-events: none;
      padding: 2px 8px; border-radius: 3px; background: ink(dark 0.7);
      font: 13px 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); letter-spacing: 0.2px; color: ink(cream 0.7);
    }
    .mapview-tp {
      position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 3; pointer-events: none;
      padding: 7px 16px 5px; border-radius: 999px; background: linear-gradient(180deg, ink(greenLight), ink(green)); color: ink(dark);
      font: 19px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; box-shadow: 0 4px 14px ink(black 0.45);
    }
    .mapview-tp[hidden] { display: none; }
    .mapview-overlay.teleporting .mapview-canvas { cursor: crosshair; }
    .mapview-tooltip {
      position: absolute; pointer-events: none;
      background: ink(dark 0.92);
      border: 1px solid ink(greenLight 0.6);
      border-radius: 4px; padding: 3px 8px; font-size: max(14px, var(--menu-min, 14px)); letter-spacing: 0.3px; color: ink(textBright);
      transform: translate(12px, -50%); max-width: min(560px, calc(100vw - 32px));
      /* de hoverregel van een activiteit noemt doel, brons en beloning en is daarmee langer
         dan een plaatsnaam. Wikkel op woordgrenzen in plaats van de regel af te knippen of midden
         in een woord te breken (overflow-wrap: normal). */      white-space: normal; overflow-wrap: normal; line-height: 1.35; display: none;
    }
    .mapview-tooltip .sub { color: ink(greenLight); margin-left: 6px; }
    .mapview-legend {
      flex: 0 0 auto; width: 280px; margin: 12px 12px 12px 0; padding: 12px;
      align-self: flex-start; max-height: calc(100% - 24px); overflow: hidden; box-sizing: border-box;
      display: flex; flex-direction: column; gap: 8px;
      background: ink(dark 0.8);
      border: 1px solid ink(greenLight 0.35); border-radius: 4px; pointer-events: auto;
    }
    /* de titel en de uitleg blijven staan; alleen de laagjes scrollen */
    .mapview-legend .mv-legend-body { min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
    .mapview-legend h3 { margin: 0 2px; font-size: 24px; font-weight: normal; letter-spacing: 1px; color: ink(greenLight); }
    .mapview-legend .hint { margin: 0 2px; font: 13px 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); color: ink(cream 0.6); }
    .mapview-legend .mv-grp { border-radius: 10px; background: ink(white 0.035); border: 1px solid ink(white 0.08); }
    .mapview-legend .mv-grp-head { display: flex; justify-content: space-between; width: 100%; padding: 8px 12px; background: none; border: 0; cursor: pointer; font: 16px 'Bebas Neue', 'Arial Narrow', sans-serif; letter-spacing: 1px; color: ink(cream 0.62); }
    .mapview-legend .mv-grp-head:focus-visible { outline: 2px solid ink(cream); }
    .mapview-legend ul { list-style: none; margin: 0; padding: 0 8px 8px; }
    .mapview-legend ul[hidden], .mapview-legend[hidden] { display: none; }
    .mapview-legend li {
      display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; align-items: center; gap: 10px; font-size: 18px; letter-spacing: 0.3px; line-height: 1;
      padding: 4px; border-radius: 6px; user-select: none; transition: background var(--dur-fast, 120ms);
    }
    .mapview-legend li[role="switch"] { cursor: pointer; }
    .mapview-legend li[role="switch"]:hover { background: ink(greenLight 0.12); }
    .mapview-legend li[role="switch"]:focus-visible { outline: 2px solid ink(cream); }
    .mapview-legend li[aria-checked="false"] > canvas, .mapview-legend li[aria-checked="false"] > span:not(.chk) { opacity: 0.45; }
    .mapview-legend .chk { position: relative; width: 38px; height: 22px; border-radius: 11px; background: ink(white 0.12); transition: background var(--dur-base, 200ms) var(--ease-out, ease); }
    .mapview-legend .chk::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: ink(cream); transition: transform var(--dur-base, 200ms) var(--ease-pop, ease); }
    .mapview-legend li[aria-checked="true"] .chk { background: ink(green); }
    .mapview-legend li[aria-checked="true"] .chk::after { transform: translateX(16px); }
    .mapview-legend .always { font: 13px 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); color: ink(cream 0.55); }
    .mapview-legend canvas { width: 30px; height: 30px; }
    .mapview-legend .note { color: ink(cream 0.6); font: 13px 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); }
    .mapview-legend .note:empty { display: none; }
    .mapview-legend .always { display: none; }
    .mv-naamkaart {
      position: absolute; z-index: 4; left: 50%; top: 18%; transform: translate(-50%, -14px); display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 18px 44px 20px; border-radius: 16px; background: ink(panelDeep 0.88); border: 1px solid ink(greenLight 0.45); box-shadow: 0 18px 48px ink(black 0.55);
      opacity: 0; pointer-events: none; transition: opacity var(--ds-m-lang) ease, transform var(--ds-m-lang) var(--ds-m-uit);
    }
    .mv-naamkaart.show { opacity: 1; transform: translate(-50%, 0); }
    .mv-naamkaart[hidden] { display: none; }
    .mv-nk-k { font: 13px 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.22em; text-transform: uppercase; color: ink(greenLight); }
    .mv-nk-n { font: 44px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.1em; text-transform: uppercase; color: ink(cream); line-height: 1; }
    .mv-nk-r { font: 15px 'Arial Narrow', Arial, sans-serif; color: ink(cream 0.7); }
    @media (prefers-reduced-motion: reduce) { .mv-naamkaart { transition: opacity 0.2s linear; transform: translate(-50%, 0); } }
    .mapview-card {
      position: absolute; z-index: 3; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; width: 360px; max-width: calc(100% - 16px); box-sizing: border-box;
      padding: 12px; border-radius: 12px; background: ink(panelDeep 0.94); border: 1px solid ink(greenLight 0.45); box-shadow: 0 10px 30px ink(black 0.5);
      pointer-events: auto; animation: mv-card-in var(--ds-m-lang) var(--ds-m-uit);
    }
    .mapview-card[hidden] { display: none; }
    @keyframes mv-card-in { from { opacity: 0; transform: translateX(-10px); } }
    .mapview-card .mv-ico { width: 52px; height: 52px; border-radius: 10px; display: grid; place-items: center; background: ink(panelCard); border: 1px solid ink(greenLight 0.16); }
    .mapview-card .mv-ico img { width: 36px; height: 36px; }
    .mapview-card > div { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .mapview-card b { font-weight: normal; font-size: 22px; letter-spacing: 1px; line-height: 1.05; }
    .mapview-card small, .mapview-card .mv-rec { font: 13px 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); color: ink(cream 0.65); letter-spacing: 0.2px; }
    .mapview-card .mv-reis { display: flex; flex-direction: column; gap: 3px; margin: 4px 0; }
    .mapview-card .mv-reisrij { text-align: left; font: 13px Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); color: ink(cream); background: ink(white 0.05); border: 0; border-radius: 4px; padding: 5px 8px; cursor: pointer; }
    .mapview-card .mv-reisrij.sel { background: ink(selected 0.22); }
    .mapview-card .mv-reisrij[aria-disabled] { opacity: 0.55; }
    .mapview-card .mv-rec { display: flex; align-items: center; gap: 8px; }
    .mapview-card .mv-pips { display: inline-flex; gap: 4px; }
    .mapview-card .mv-pip { display: inline-grid; place-items: center; width: 18px; height: 18px; box-sizing: border-box; border-radius: 50%; border: 1.5px solid; font: 13px 'Bebas Neue', sans-serif; padding-top: 1px; }
    .mapview-card .mv-pip[data-m="1"] { color: ink(medalBronze); } .mapview-card .mv-pip[data-m="2"] { color: ink(medalSilver); } .mapview-card .mv-pip[data-m="3"] { color: ink(yellow); }
    .mapview-card .mv-pip[data-on] { color: ink(dark); border-color: transparent; }
    .mapview-card .mv-pip[data-m="1"][data-on] { background: ink(medalBronze); } .mapview-card .mv-pip[data-m="2"][data-on] { background: ink(medalSilver); } .mapview-card .mv-pip[data-m="3"][data-on] { background: ink(yellow); }
    .mapview-card .mv-btns { display: flex; gap: 6px; margin-top: 4px; }
    /* Designsysteem (issue 997, ADR 0040): de kaartchroom is een papieren plaatje met inktrand en harde
       schaduw op de donkere kaart; alleen tokens, geen eigen kleur. De kaart zelf (MAP_PALETTE) blijft
       donker tot de provinciepiramide opnieuw is gebakken. */
    .mapview-overlay { background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard); font-family: var(--ds-font-zeef-tekst); }
    .mapview-header { color: var(--ds-zeef-kop); text-shadow: none; border-bottom: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); background: var(--ds-zeef-bg); font-family: var(--ds-font-zeef-kop); font-weight: 800; }
    .mapview-title { font-family: var(--ds-font-zeef-kop); font-weight: 800; text-shadow: var(--ds-misdruk); }
    .mv-modenote { color: var(--ds-zeef-tx) !important; }
    .mapview-search input { color: var(--ds-zeef-tx); background: var(--ds-c-papier-2); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); font-family: var(--ds-font-zeef-tekst); font-size: max(15px, var(--menu-min, 15px)); }
    .mapview-search input:focus, .mapview-search input:focus-visible { border-color: var(--ds-c-ink-bord); box-shadow: var(--ds-schaduw-hard-klein); outline: var(--ds-focus-dikte) solid var(--ds-c-ink-inkt); outline-offset: var(--ds-focus-afstand); }
    .mapview-search input::placeholder { color: var(--ds-tx-zacht); }
    .mapview-results { background: var(--ds-zeef-bg); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard); }
    .mapview-results li { color: var(--ds-zeef-tx); font-family: var(--ds-font-zeef-tekst); }
    .mapview-results li[aria-selected="true"], .mapview-results li:hover { background: var(--ds-c-sel-vlak); box-shadow: inset 4px 0 0 var(--ds-c-ink-bord); }
    .mapview-results .kind { color: var(--ds-tx-zacht); }
    .mapview-results .empty { color: var(--ds-tx-zacht); }
    .mapview-btn { color: var(--ds-primair-tx); background: var(--ds-zeef-primair); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard-klein); font-family: var(--ds-font-zeef-kop); font-weight: 800; min-height: var(--ds-doel-aanraken); }
    .mapview-btn:hover { background: var(--ds-c-geel-hover); }
    .mapview-btn:active { background: var(--ds-c-geel-druk); box-shadow: none; transform: translate(var(--ds-hard-klein), var(--ds-hard-klein)); }
    .mapview-btn.ghost { color: var(--ds-zeef-tx); background: var(--ds-zeef-bg); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); }
    .mapview-btn.ghost:hover { color: var(--ds-zeef-tx); background: var(--ds-c-sel-vlak); border-color: var(--ds-c-ink-inkt); }
    .mapview-btn:focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-c-ink-inkt); outline-offset: var(--ds-focus-afstand); }
    .mapview-route { color: var(--ds-zeef-tx); }
    .mapview-route .user, .mapview-route .mission, .mapview-route .job, .mapview-route .care { color: var(--ds-zeef-tx); border-bottom: 4px solid currentColor; }
    .mapview-route .user { border-bottom-color: var(--nav-eigen, ${ROUTE_COLORS.user}); }
    .mapview-route .mission { border-bottom-color: var(--nav-actief, var(--ds-c-ink-geel)); }
    .mapview-route .job { border-bottom-color: var(--nav-klus, ${ROUTE_COLORS.job}); }
    .mapview-route .care { border-bottom-color: var(--nav-zorg, ${ROUTE_COLORS.care}); }
    .mapview-footer b { color: var(--ds-zeef-kop); }
    .mapview-canvas { box-shadow: none; }
    .mapview-zoom button { color: var(--ds-zeef-tx); background: var(--ds-zeef-bg); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard-klein); font-family: var(--ds-font-zeef-kop); font-weight: 800; }
    .mapview-zoom button:hover { background: var(--ds-c-sel-vlak); border-color: var(--ds-c-ink-inkt); }
    .mapview-zoom button:focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-c-ink-inkt); outline-offset: var(--ds-focus-afstand); }
    .mapview-osm { background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); border-radius: 0; }
    .mapview-tp { background: var(--ds-zeef-primair); color: var(--ds-primair-tx); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard-klein); font-family: var(--ds-font-zeef-kop); font-weight: 800; }
    .mapview-tooltip { background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard-klein); font-family: var(--ds-font-zeef-tekst); }
    .mapview-tooltip .sub { color: var(--ds-zeef-kop); }
    .mapview-legend { background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard); }
    .mapview-legend h3 { color: var(--ds-zeef-kop); font-family: var(--ds-font-zeef-kop); font-weight: 800; }
    .mapview-legend .hint, .mapview-legend .note, .mapview-legend .always { color: var(--ds-tx-zacht); font-family: var(--ds-font-zeef-tekst); }
    .mapview-legend .mv-grp { background: var(--ds-c-papier-2); border: var(--ds-lijn) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); }
    .mapview-legend .mv-grp-head { color: var(--ds-zeef-tx); font-family: var(--ds-font-zeef-kop); font-weight: 800; }
    .mapview-legend .mv-grp-head:focus-visible, .mapview-legend li[role="switch"]:focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-c-ink-inkt); outline-offset: calc(var(--ds-focus-dikte) * -1); }
    .mapview-legend li { font-family: var(--ds-font-zeef-tekst); font-size: max(16px, var(--menu-min, 16px)); }
    .mapview-legend li[role="switch"]:hover { background: var(--ds-c-sel-vlak); }
    .mapview-legend .chk { background: var(--ds-c-papier-2); border: var(--ds-lijn-dik) solid var(--ds-c-ink-inkt); box-sizing: border-box; }
    .mapview-legend .chk::after { background: var(--ds-c-ink-inkt); top: 1px; left: 1px; }
    .mapview-legend li[aria-checked="true"] .chk { background: var(--ds-c-ink-bord); }
    .mapview-legend li[aria-checked="true"] .chk::after { background: var(--ds-c-ink-papier); }
    .mv-naamkaart { background: var(--ds-zeef-bg); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard); }
    .mv-nk-k { color: var(--ds-zeef-kop); font-family: var(--ds-font-zeef-kop); font-weight: 800; }
    .mv-nk-n { color: var(--ds-zeef-tx); font-family: var(--ds-font-zeef-kop); font-weight: 800; text-shadow: var(--ds-misdruk); }
    .mv-nk-r { color: var(--ds-tx-zacht); font-family: var(--ds-font-zeef-tekst); }
    .mapview-card { background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard); font-family: var(--ds-font-zeef-tekst); }
    .mapview-card .mv-ico { background: var(--ds-c-papier-2); border: var(--ds-lijn) solid var(--ds-c-ink-inkt); }
    .mapview-card b { font-family: var(--ds-font-zeef-kop); font-weight: 800; }
    .mapview-card small, .mapview-card .mv-rec { color: var(--ds-tx-zacht); }
    .mapview-card .mv-reisrij { color: var(--ds-zeef-tx); background: var(--ds-c-papier-2); border: var(--ds-lijn) solid var(--ds-c-ink-inkt); }
    .mapview-card .mv-reisrij.sel { background: var(--ds-c-sel-vlak); box-shadow: inset 4px 0 0 var(--ds-c-ink-bord); }
    .mapview-card .mv-pip[data-on] { color: var(--ds-c-ink-inkt); }
    @media (max-width: 700px) { .mapview-legend { display: none; } .mapview-title { display: none; } }
  `);
  document.head.appendChild(style);
}

function fillPoly(ctx, pts) {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

function normalize(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function setLayer(key, on) {
  storeLayer(key, on);
  if (key === 'buildings') clearTiles();
  state.dirty = true;
}

// --- kaartontdekking (#899, #990) --------------------------------------------
// De kaart grijst uit wat deze speler nog niet kent. Twee lagen in één masker (kaartonthulling.js
// heeft de pure regels): de buurten die hij nog niet bezocht (de `bezocht`-lijst van gebieden.js,
// dezelfde die de prestatie "de kaart verkend" telt) krijgen een lichte waas, en een streek die hij
// nog niet kent (explorationlive.js) ligt onder zware mist. Een uitkijkpunt of een binnenrit opent de
// streek: de mist trekt open vanaf dat punt (de opening), de kaart zoomt naar het gebied, een
// naamkaart noemt de streek en er klinkt het ontdekkingsgeluid. Alles per speler.

let discovery = null; // { ind, seen, byId, unseen, canvas, edge, ctx, w, h, minx, miny, res, reveal, base, owners, centers, levels }
const discoveryHiddenCache = new Map();
const DISCOVERY_CACHE_MAX = 5000; // zonder grens groeit de cache met elke rondgetoonde plek
const MIST_RGB = [0x1b, 0x24, 0x20]; // de kleur van de mist; de dekking staat per cel in het masker

function discoveryBounds(world) {
  const o = getOverzicht();
  const g = o && o.ind && o.ind.grenzen && o.ind.grenzen.provincie;
  const b = g && g.b ? g.b : world.map.meta.bounds;
  return [b[0] - DISCOVERY_MARGIN, b[1] - DISCOVERY_MARGIN, b[2] + DISCOVERY_MARGIN, b[3] + DISCOVERY_MARGIN];
}

function traceArea(ctx, grens) {
  if (!grens || !Array.isArray(grens.p)) return;
  ctx.beginPath();
  for (const poly of grens.p) for (const ring of poly) {
    for (let i = 0; i < ring.length; i++) {
      if (i) ctx.lineTo(ring[i][0], ring[i][1]); else ctx.moveTo(ring[i][0], ring[i][1]);
    }
    ctx.closePath();
  }
}

// Alle onbezochte buurten in één pad en één vulling (#899 QA): losse vullingen gaven
// langs elke buurtgrens een lichte antialias-naad, die op de kaart als een grijs
// raster/checkerpatroon te zien was.
function traceAreas(ctx, areas) {
  ctx.beginPath();
  for (const g of areas) {
    const grens = g && g.grens;
    if (!grens || !Array.isArray(grens.p)) continue;
    for (const poly of grens.p) for (const ring of poly) {
      for (let i = 0; i < ring.length; i++) {
        if (i) ctx.lineTo(ring[i][0], ring[i][1]); else ctx.moveTo(ring[i][0], ring[i][1]);
      }
      ctx.closePath();
    }
  }
}

// De streken die voor het masker als gekend tellen: wat de speler kent, min de streken waarvan de
// opening nog moet spelen (die staan nog onder mist tot de mist openrijt).
function maskKnownNumbers() {
  const nums = new Set();
  const pending = new Set((state && state.reveals ? state.reveals : []).map((r) => r.area));
  const opening = state && state.opening ? state.opening.area : null;
  STREKEN.forEach((s, i) => { if (isAreaKnown(s.id) && !pending.has(s.id) && s.id !== opening) nums.add(i + 1); });
  return nums;
}

// Het masker als niveaus (0 tot 255 per cel): de buurtwaas uit de polygonen, de streekmist erover.
function computeLevels(d, known) {
  const lv = new Uint8Array(d.base);
  applyStreekMist(lv, d.owners, known);
  return lv;
}

function paintLevels(d, lv) {
  const img = d.ctx.createImageData(d.w, d.h);
  const px = img.data;
  for (let i = 0; i < lv.length; i++) {
    const o = i * 4;
    px[o] = MIST_RGB[0]; px[o + 1] = MIST_RGB[1]; px[o + 2] = MIST_RGB[2]; px[o + 3] = lv[i];
  }
  d.ctx.putImageData(img, 0, 0);
}

// de rand zachter maken: het masker één keer blurren (de rand van een buurt of streek leest anders
// als een harde trap van cellen)
function blurEdge(d, x = 0, y = 0, w = d.w, h = d.h) {
  const e = d.edge.getContext('2d');
  e.save();
  e.setTransform(1, 0, 0, 1, 0, 0);
  e.beginPath(); e.rect(x, y, w, h); e.clip();
  e.clearRect(x, y, w, h);
  try { e.filter = 'blur(3px)'; } catch (err) { /* zonder filter blijft de rand scherper */ }
  const m = 14; // ruime bron, zodat de rand van het venster niet donkerder blurt
  const sx = Math.max(0, x - m), sy = Math.max(0, y - m), sx1 = Math.min(d.w, x + w + m), sy1 = Math.min(d.h, y + h + m);
  e.drawImage(d.canvas, sx, sy, sx1 - sx, sy1 - sy, sx, sy, sx1 - sx, sy1 - sy);
  try { e.filter = 'none'; } catch (err) { /* niets */ }
  e.restore();
}

function buildDiscoveryMask() {
  const d = discovery;
  if (!d) return;
  // de buurtwaas: de onbezochte buurten in één vulling, alleen de dekking telt
  const c = d.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, d.w, d.h);
  const s = 1 / d.res;
  c.setTransform(s, 0, 0, s, -d.minx * s, -d.miny * s);
  c.fillStyle = INK.discovery;
  traceAreas(c, d.unseen);
  c.fill('evenodd');
  c.setTransform(1, 0, 0, 1, 0, 0);
  const a = c.getImageData(0, 0, d.w, d.h).data;
  const buurt = mistByte('buurt');
  d.base = new Uint8Array(d.w * d.h);
  for (let i = 0; i < d.base.length; i++) d.base[i] = a[i * 4 + 3] > 127 ? buurt : 0;
  d.levels = computeLevels(d, maskKnownNumbers());
  paintLevels(d, d.levels);
  blurEdge(d);
}

// Wat deze speler sinds het vorige beeld ontdekte: de nieuwe buurten gloeien uit.
function refreshDiscovery(animate = true) {
  const o = getOverzicht();
  if (!discovery || !o) return;
  const profiel = o.profiel;
  const seen = new Set(profiel.bezocht || []);
  const byId = new Map(o.ind.gebieden.filter((g) => g && g.niveau === 'buurt').map((g) => [g.id, g]));
  const now = performance.now();
  if (animate) for (const id of seen) if (!discovery.seen.has(id) && byId.has(id)) discovery.reveal.push({ id, at: now });
  discovery.ind = o.ind;
  discovery.seen = seen;
  discovery.byId = byId;
  discovery.unseen = unseenDistricts(o.ind, profiel);
  discoveryHiddenCache.clear();
  buildDiscoveryMask();
  if (animate && discovery.reveal.length) state.revealUntil = now + 1600;
}

function initDiscovery(world) {
  if (discovery || !world) return;
  const o = getOverzicht();
  if (!o || !o.ind || !o.ind.grenzen) return;
  const b = discoveryBounds(world);
  const m = maskSize(b, DISCOVERY_RES_M);
  if (!m) return;
  const canvas = document.createElement('canvas');
  canvas.width = m.w; canvas.height = m.h;
  const edge = document.createElement('canvas');
  edge.width = m.w; edge.height = m.h;
  const centers = STREKEN.map((s) => { const [x, y] = wgsToWorld(s.at[0], s.at[1]); return { id: s.id, x, y, reach: s.reach }; });
  discovery = {
    ind: o.ind, seen: new Set(o.profiel.bezocht || []), byId: new Map(), unseen: [],
    canvas, edge, ctx: canvas.getContext('2d', { willReadFrequently: true }), w: m.w, h: m.h, minx: b[0], miny: b[1], res: DISCOVERY_RES_M, reveal: [],
    centers, owners: streekOwnerGrid({ w: m.w, h: m.h, minx: b[0], miny: b[1], res: DISCOVERY_RES_M }, centers),
    base: null, levels: null,
  };
  refreshDiscovery(false);
  onGebiedenChange(() => {
    if (!state) return;
    // de kaart is dicht: het masker wordt bij het openen opnieuw opgebouwd, niet elke
    // seconde terwijl je rijdt (#899)
    if (!state.open) return;
    refreshDiscovery(true);
    state.dirty = true;
  });
}

// Ligt deze plek in gebied dat de speler nog niet kent? Dan houdt de kaart de plaatsnaam weg (de mist
// ligt al over het gebied). Een buurt die nu nog uitgloeit, of een streek waarvan de opening nog
// speelt, telt ook als verborgen, zodat de naam pas komt als de mist weg is.
function discoveryHidden(x, y) {
  if (!discovery || !getSettings().showFog || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  const key = Math.round(x) + ',' + Math.round(y);
  const hit = discoveryHiddenCache.get(key);
  if (hit !== undefined) return hit;
  let hidden = false;
  try {
    const van = gebiedenVan(discovery.ind, x, y);
    hidden = !!van.buurt && !discovery.seen.has(van.buurt);
    if (!hidden && van.buurt && discovery.reveal.length) {
      const now = performance.now();
      for (const r of discovery.reveal) if (r.id === van.buurt && revealAlpha(now, r.at) > 0.02) { hidden = true; return true; }
    }
  } catch (e) { hidden = false; }
  if (discoveryHiddenCache.size > DISCOVERY_CACHE_MAX) discoveryHiddenCache.clear();
  discoveryHiddenCache.set(key, hidden);
  return hidden;
}

// De mist over de kaarttegel: één zachte, doorlopende waas (alleen bronkaart en masker, geen blend-modi
// of losse vullingen: die gaven op de kaart een raster van celranden), met een fade als je een buurt
// voor het eerst binnenkomt.
function drawDiscovery(c, now) {
  const d = discovery;
  if (!d || !getSettings().showFog) return;
  const [sx, sy] = toScreen(d.minx, d.miny);
  const size = d.res * state.scale * state.dpr;
  const x = sx * state.dpr, y = sy * state.dpr, w = d.w * size, h = d.h * size;
  c.save();
  c.globalCompositeOperation = 'source-over';
  c.imageSmoothingEnabled = true;
  try { c.imageSmoothingQuality = 'high'; } catch (e) { /* niet elke ctx kent dit */ }
  c.globalAlpha = 1;
  c.drawImage(d.edge, x, y, w, h);
  const levend = [];
  for (const r of d.reveal) {
    const a = revealAlpha(now, r.at);
    if (a > 0.01) levend.push(r);
    const g = d.byId.get(r.id);
    if (!g || !g.grens || a <= 0.01) continue;
    // het gebied krijgt zijn helderheid terug naarmate de fade vordert
    c.globalAlpha = a * MIST_ALPHA.buurt;
    c.fillStyle = INK.discovery;
    c.setTransform(state.dpr * state.scale, 0, 0, state.dpr * state.scale, state.ox * state.dpr, state.oy * state.dpr);
    traceArea(c, g.grens);
    c.fill('evenodd');
    c.setTransform(1, 0, 0, 1, 0, 0);
  }
  d.reveal = levend;
  c.restore();
}

// --- de onthulling van een streek (#990) -------------------------------------------------------------
// Een nieuwe streek komt in de wachtrij zodra de speler hem ontdekt (ook als de kaart dicht is). Bij
// het openen van de kaart speelt de onthulling: de camera zoomt naar de streek, de mist trekt open
// vanaf het uitkijkpunt, de naamkaart verschijnt en het ontdekkingsgeluid klinkt.
const CAM_MS = 1200;
const OPEN_DELAY_MS = 900;

function queueDiscovery(ev) {
  if (!state) return;
  // 22-11: de onthulling komt pas in de rij nadat het laadscherm weg is (notifyqueue.js). De kaart zelf mag open zijn
  // (juist dan speelt hij), dus het schermvullende menu houdt hier niet vast. Geen slot: elke streek apart.
  enqueueNotice('reveal', {
    key: 'reveal-' + ev.area,
    duration: 0,
    ignore: ['screen'],
    show: () => {
      if (!state) return;
      state.reveals = queueReveal(state.reveals || [], ev);
      if (discovery && state.open) startNextReveal();
    },
  });
}

// De streek-index (1-based, zoals het masker) van een streek-id.
const areaNumber = (id) => STREKEN.findIndex((s) => s.id === id) + 1;

function startNextReveal() {
  if (!state || state.opening || !discovery || !(state.reveals || []).length) return;
  if (!getSettings().showFog) { state.reveals = []; buildDiscoveryMask(); return; }
  const ev = state.reveals[0];
  const num = areaNumber(ev.area);
  const c = num ? discovery.centers[num - 1] : null;
  if (!c) { state.reveals = state.reveals.slice(1); buildDiscoveryMask(); return startNextReveal(); }
  const now = performance.now();
  const g = discovery;
  const oud = g.levels;
  // het masker staat nog zonder deze streek bekend; de nieuwe stand heeft hem erbij
  const nieuw = computeLevels(g, new Set([...maskKnownNumbers(), num]));
  // het venster: de cellen van de streek (met een rand), alleen daar verandert het masker
  let x0 = g.w, y0 = g.h, x1 = -1, y1 = -1;
  for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
    if (g.owners[j * g.w + i] === num) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  }
  if (x1 < 0) { state.reveals = state.reveals.slice(1); buildDiscoveryMask(); return startNextReveal(); }
  const pad = 14;
  const win = { x: Math.max(0, x0 - pad), y: Math.max(0, y0 - pad) };
  win.w = Math.min(g.w, x1 + pad + 1) - win.x; win.h = Math.min(g.h, y1 + pad + 1) - win.y;
  const target = { x: c.x, y: c.y, zoom: Math.max(minZoom(), Math.min(MAX_ZOOM, focusScale(c.reach, state.cw, state.ch, { fill: 0.9 }) / state.baseScale)) };
  state.cam = { from: { x: state.cx, y: state.cy, zoom: state.zoom }, to: target, at: now, ms: CAM_MS };
  state.opening = { area: ev.area, num, x: ev.x, y: ev.y, reach: c.reach, at: now + OPEN_DELAY_MS, oud, nieuw, win, img: null, sounded: false };
  state.revealUntil = now + OPEN_DELAY_MS + OPEN_MS + 200;
  state.dirty = true;
}

// Per beeld: de camera en de opening een stap verder. Geeft true zolang er iets beweegt.
function tickReveal(now) {
  if (!state) return false;
  let moving = false;
  const cam = state.cam;
  if (cam) {
    const t = (now - cam.at) / cam.ms;
    const p = cameraStep(cam.from, cam.to, t);
    state.zoom = p.zoom;
    state.cx = p.x; state.cy = p.y;
    updateTransform();
    if (t >= 1) state.cam = null; else moving = true;
  }
  const o = state.opening;
  if (o && discovery) {
    if (now < o.at) moving = true;
    else {
      if (!o.sounded) {
        o.sounded = true;
        try { sfxLinks.uiFx('ui_ontdek'); } catch (e) { /* geen geluid is geen ramp */ }
        showNaamkaart(o.area);
      }
      const d = discovery, w = o.win;
      const r = openingRadius(now, o.at, o.reach);
      if (!o.img) o.img = d.ctx.createImageData(w.w, w.h);
      const px = o.img.data;
      for (let j = 0; j < w.h; j++) {
        const wy = d.miny + (w.y + j + 0.5) * d.res;
        for (let i = 0; i < w.w; i++) {
          const wx = d.minx + (w.x + i + 0.5) * d.res;
          const gi = (w.y + j) * d.w + (w.x + i);
          const lv = openingLevel(o.oud[gi], o.nieuw[gi], Math.hypot(wx - o.x, wy - o.y), r);
          const q = (j * w.w + i) * 4;
          px[q] = MIST_RGB[0]; px[q + 1] = MIST_RGB[1]; px[q + 2] = MIST_RGB[2]; px[q + 3] = lv;
        }
      }
      d.ctx.putImageData(o.img, w.x, w.y);
      blurEdge(d, w.x, w.y, w.w, w.h);
      if (openingDone(now, o.at)) {
        // klaar: de streek is voortaan gewoon bekend in het masker
        state.reveals = (state.reveals || []).filter((e) => e.area !== o.area);
        state.opening = null;
        discoveryHiddenCache.clear();
        buildDiscoveryMask();
        startNextReveal();
      } else moving = true;
    }
  }
  if (moving || state.opening || state.cam) { state.revealUntil = Math.max(state.revealUntil || 0, now + 120); state.dirty = true; }
  return moving;
}

// De naamkaart: een groot streekplaatje met de voortgang, zacht in en uit (css-transitie op de klasse).
function showNaamkaart(areaId) {
  const el = state && state.naamEl;
  if (!el) return;
  let stand = null;
  try { stand = getStrekenStand(state.world); } catch (e) { stand = null; }
  const k = naamkaart(areaName(areaId), stand);
  if (!k) return;
  el.innerHTML = `<span class="mv-nk-k">${k.kicker}</span><b class="mv-nk-n">${k.naam}</b><span class="mv-nk-r">${k.regel}</span>`;
  el.hidden = false;
  void el.offsetWidth; // de transitie opnieuw laten beginnen
  el.classList.add('show');
  clearTimeout(state.naamTimer);
  state.naamTimer = setTimeout(() => {
    el.classList.remove('show');
    state.naamTimer = setTimeout(() => { el.hidden = true; }, 700);
  }, NAAMKAART_MS - 700);
}

// De teller in de kop van de kaart: "3 van 8 streken verkend".
function strekenChip() {
  let st = null;
  try { st = getStrekenStand(state.world); } catch (e) { st = null; }
  if (!st || !st.totaal) return '';
  return strekenTekst(st);
}

export function getDiscoveredRatio() {
  const o = getOverzicht();
  if (o && o.kaart && o.kaart.totaal) return o.kaart.pct / 100;
  const d = discovery;
  return d ? discoveryRatio(d.ind, { bezocht: [...d.seen] }).pct / 100 : 0;
}

// --- view transform ---------------------------------------------------------

function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = state.canvas.getBoundingClientRect();
  state.dpr = dpr;
  state.cw = Math.max(1, rect.width);
  state.ch = Math.max(1, rect.height);
  state.canvas.width = Math.max(1, Math.round(rect.width * dpr));
  state.canvas.height = Math.max(1, Math.round(rect.height * dpr));
  state.compose.width = state.canvas.width;
  state.compose.height = state.canvas.height;
  const [minx, miny, maxx, maxy] = state.real;
  const base = Math.min(state.cw / (maxx - minx), state.ch / (maxy - miny)) * PADDING;
  if (base !== state.baseScale || dpr !== state.tileDpr) {
    state.baseScale = base;
    state.tileDpr = dpr;
    clearTiles();
  }
  if (state.cx == null) {
    state.cx = (minx + maxx) / 2;
    state.cy = (miny + maxy) / 2;
  }
  updateTransform();
}

// as far out as the whole province fits (else the villages round town). #901: het kader
// past precies in het scherm, zodat er bij het verste zoomniveau geen rand meer overblijft.
function minZoom() {
  if (provinceMapOn() && state.baseScale) return frameScale(state.bounds, state.cw, state.ch) / state.baseScale;
  // zonder de provinciekaart: net ver genoeg inzoomen dat het stadskaartje het scherm vult
  if (state.baseScale) {
    const [x0, y0, x1, y1] = state.bounds;
    const cover = Math.max(state.cw / (x1 - x0), state.ch / (y1 - y0)) / state.baseScale;
    return Math.max(MIN_ZOOM, cover);
  }
  return MIN_ZOOM;
}

function updateTransform() {
  state.zoom = Math.max(minZoom(), Math.min(MAX_ZOOM, state.zoom));
  state.scale = state.baseScale * state.zoom;
  // #901: het beeld blijft binnen het kader; past het kader niet in het scherm, dan
  // centreert de kaart en kun je niet naar de rand pannen.
  const v = clampView(state.cx, state.cy, state.scale, state.cw, state.ch, state.bounds);
  state.cx = v.cx;
  state.cy = v.cy;
  state.ox = state.cw / 2 - state.cx * state.scale;
  state.oy = state.ch / 2 - state.cy * state.scale;
  state.dirty = true;
}

function toScreen(x, y) {
  return [x * state.scale + state.ox, y * state.scale + state.oy];
}

function toWorld(sx, sy) {
  return [(sx - state.ox) / state.scale, (sy - state.oy) / state.scale];
}

function zoomAt(factor, sx, sy) {
  state.cam = null; // #990: zelf zoomen neemt de camera van de onthulling over
  const [wx, wy] = toWorld(sx, sy);
  state.zoom = Math.max(minZoom(), Math.min(MAX_ZOOM, state.zoom * factor));
  const s = state.baseScale * state.zoom;
  state.cx = wx - (sx - state.cw / 2) / s;
  state.cy = wy - (sy - state.ch / 2) / s;
  updateTransform();
}

function centreOn(x, y, minZoom) {
  state.cx = x;
  state.cy = y;
  if (minZoom) state.zoom = Math.max(state.zoom, minZoom);
  updateTransform();
}

function viewRect(marginPx = 0) {
  const m = marginPx / state.scale;
  const [x0, y0] = toWorld(0, 0), [x1, y1] = toWorld(state.cw, state.ch);
  return [x0 - m, y0 - m, x1 + m, y1 + m];
}

// --- tile cache -------------------------------------------------------------

// the province's base map images come in as the view asks for them
onProvinceMapLoad(() => clearTiles());

function clearTiles() {
  if (state) {
    state.level0 = false;
    for (const t of state.tiles.values()) if (state.pool.length < 8) state.pool.push(t.canvas);
    state.tiles.clear();
    state.tileGen = (state.tileGen || 0) + 1;
    state.dirty = true;
  }
}

function levelFor(zoom) {
  for (let L = 0; L < LEVEL_COUNT; L++) if (levelZoom(L) >= zoom * 0.95) return L;
  return LEVEL_COUNT - 1;
}

function tileWorldSize(L) {
  return TILE_PX / (state.baseScale * levelZoom(L) * state.tileDpr);
}

// The world boxes [x, y, w, h] of the streamed data tiles inside a window
function residentRects(x0, y0, x1, y1) {
  const res = state.map.resident;
  if (!res || !res.size) return null;
  const out = [];
  const [i0, j0] = tileIndexOf(x0, y0), [i1, j1] = tileIndexOf(x1, y1);
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      if (!res.has(`${i},${j}`)) continue;
      const [ox, oy] = tileOrigin(i, j);
      out.push([ox, oy, TILE_M, TILE_M]);
    }
  }
  return out;
}

function renderTile(L, tx, ty) {
  const z = levelZoom(L);
  const lay = layersAtZoom(z); // the layer rule (mapstyle.js)
  const s = state.baseScale * z * state.tileDpr;
  const tws = TILE_PX / s;
  const [minx, miny, maxx, maxy] = state.bounds;
  const wx0 = minx + tx * tws, wy0 = miny + ty * tws;
  // #977: de kavelgrenzen van het platteland blijven buiten de bebouwde kom. Eén vraag per
  // kaarttegel-cel van 16 m, want de slootlijnen zijn er honderden per tegel.
  const builtCache = new Map();
  const builtAt = (x, y) => {
    const k = `${Math.round(x / 16)},${Math.round(y / 16)}`;
    let v = builtCache.get(k);
    if (v === undefined) builtCache.set(k, (v = builtUpAt(state.map, x, y)));
    return v;
  };
  let canvas = state.pool.pop();
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = canvas.height = TILE_PX;
  }
  const c = canvas.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, TILE_PX, TILE_PX);
  c.setTransform(s, 0, 0, s, -wx0 * s, -wy0 * s);
  const [rx0, ry0, rx1, ry1] = state.real;
  c.fillStyle = MAP_STYLE.meadow;
  if (wx0 < rx1 && wx0 + tws > rx0 && wy0 < ry1 && wy0 + tws > ry0) {
    c.fillRect(Math.max(rx0, wx0), Math.max(ry0, wy0), Math.min(rx1, wx0 + tws) - Math.max(rx0, wx0), Math.min(ry1, wy0 + tws) - Math.max(ry0, wy0));
  }
  drawCountryBase(c, wx0, wy0, wx0 + tws, wy0 + tws, MAP_STYLE);
  // the province's base map (provincemap.js), under the vectors
  const prov = provinceMapOn();
  if (prov) drawSea(c, (n) => n / (state.baseScale * z));
  if (prov) {
    c.save();
    c.filter = baseFilter(); // the pyramid is drawn in day colours
    // up close the vectors of the streamed tiles replace the base map's coarse pixels there
    const res = lay.streamedVectors ? residentRects(wx0, wy0, wx0 + tws, wy0 + tws) : null;
    if (res && res.length) {
      c.save();
      const clip = new Path2D();
      clip.rect(wx0, wy0, tws, tws);
      for (const r of res) clip.rect(r[0], r[1], r[2], r[3]);
      c.clip(clip, 'evenodd');
      drawProvinceBase(c, wx0, wy0, wx0 + tws, wy0 + tws, state.baseScale * z * state.tileDpr);
      c.restore();
    } else drawProvinceBase(c, wx0, wy0, wx0 + tws, wy0 + tws, state.baseScale * z * state.tileDpr);
    // zonder canvasfilter (Safari/WebKit): 's nachts een donkere laag over de basis in plaats van brightness()
    const dim = baseDimOverlay(c);
    if (dim) { c.fillStyle = dim; c.fillRect(wx0, wy0, tws, tws); }
    c.restore();
  }

  // the city data only exists inside the real bounds (with the province on:
  // whatever tiles streamed in, up close)
  const wide = prov && lay.streamedVectors;
  const qx0 = wide ? wx0 : Math.max(wx0, rx0 - 50), qy0 = wide ? wy0 : Math.max(wy0, ry0 - 50);
  const qx1 = wide ? wx0 + tws : Math.min(wx0 + tws, rx1 + 50), qy1 = wide ? wy0 + tws : Math.min(wy0 + tws, ry1 + 50);
  const view = qx0 < qx1 && qy0 < qy1 ? state.map.queryView(qx0, qy0, qx1, qy1) : { roads: [], buildings: [], water: [], green: [], trees: [] };
  const cssPerM = state.baseScale * z;
  const px = (n) => n / cssPerM;

  c.fillStyle = MAP_STYLE.park;
  for (const g of view.green) fillPoly(c, g.pts);

  const mode = state.mode || 'lopen';
  // the layer rule of this zoom and travel mode (mapstyle.js): the water stands out for a boat, the land steps back
  const look = modeLook(mode);
  const landA = look.land;
  c.fillStyle = MAP_STYLE.water;
  c.strokeStyle = MAP_STYLE.waterEdge;
  c.lineWidth = px(lay.waterEdgePx * look.waterEdge);
  c.lineJoin = 'round';
  for (const w of view.water) {
    fillPoly(c, w.pts);
    if (w.pts.length >= 3) c.stroke();
  }

  if (lay.buildings && layerOn('buildings')) {
    c.globalAlpha = landA;
    for (const b of view.buildings) {
      c.fillStyle = b.landmark ? MAP_STYLE.church : MAP_STYLE.building;
      fillPoly(c, b.pts);
    }
    c.globalAlpha = 1;
  }

  const roads = view.roads.filter((r) => {
    if (r.pts.length < 2) return false;
    return lay.roads.includes(r.cat);
  }).sort((a, b) => ROAD_ORDER[a.cat] - ROAD_ORDER[b.cat]);
  c.lineCap = 'round';
  for (const r of roads) {
    const wpx = roadWidthPx(r.cat, z, r.width, cssPerM);
    c.beginPath();
    c.moveTo(r.pts[0][0], r.pts[0][1]);
    for (let i = 1; i < r.pts.length; i++) c.lineTo(r.pts[i][0], r.pts[i][1]);
    if (r.bridge && lay.bridgeCasing) {
      c.strokeStyle = EMPHASIS.bridgeCasing;
      c.lineWidth = px(wpx + 2);
      c.stroke();
    }
    const allowed = roadAllowed(r, mode);
    // the roads for your way of travel stand out; the ones that are not for you step back
    let a = r.cat === 'normal' ? lay.normalRoadAlpha : 1;
    a *= landA;
    let wpx2 = wpx, col = roadColors(r.cat);
    if (mode === 'lopen' && r.cat === 'foot') { col = EMPHASIS.foot; wpx2 = wpx * 1.4; }
    else if (mode === 'fiets' && r.cat === 'cycle') { col = EMPHASIS.cycle; wpx2 = wpx * 1.6; }
    else if (mode === 'auto' && r.cat === 'major') wpx2 = wpx * 1.2;
    if (allowed === false && r.cat !== 'major') a *= 0.35;
    c.strokeStyle = col;
    c.globalAlpha = a;
    c.lineWidth = px(wpx2);
    c.stroke();
    c.globalAlpha = 1;
  }
  drawCountryDetail(c, wx0, wy0, wx0 + tws, wy0 + tws, cssPerM, MAP_STYLE, { built: builtAt });
  drawRailsOnMap(c, state.map, wx0, wy0, wx0 + tws, wy0 + tws, px(lay.railPx * look.rail));
  // what lies outside the province darker, with its land borders
  if (prov) drawOutside(c, [wx0, wy0, wx0 + tws, wy0 + tws], px);
  return canvas;
}

function tileKey(L, tx, ty) {
  return L * 1e6 + tx * 1000 + ty;
}

function visibleTiles(L) {
  const tws = tileWorldSize(L);
  const [minx, miny, maxx, maxy] = state.bounds;
  const nx = Math.ceil((maxx - minx) / tws), ny = Math.ceil((maxy - miny) / tws);
  const [x0, y0, x1, y1] = viewRect();
  const out = [];
  const tx0 = Math.max(0, Math.floor((x0 - minx) / tws)), tx1 = Math.min(nx - 1, Math.floor((x1 - minx) / tws));
  const ty0 = Math.max(0, Math.floor((y0 - miny) / tws)), ty1 = Math.min(ny - 1, Math.floor((y1 - miny) / tws));
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) out.push([tx, ty]);
  return { tws, out };
}

// The overview tiles over the real map at once; the countryside ones
// arrive through fillTiles within its time budget.
function ensureLevel0() {
  const tws = tileWorldSize(L_BASE);
  const [minx, miny, maxx, maxy] = state.bounds;
  const [rx0, ry0, rx1, ry1] = state.real;
  const nx = Math.ceil((maxx - minx) / tws), ny = Math.ceil((maxy - miny) / tws);
  for (let ty = 0; ty < ny; ty++) {
    for (let tx = 0; tx < nx; tx++) {
      const ax = minx + tx * tws, ay = miny + ty * tws;
      if (ax > rx1 || ax + tws < rx0 || ay > ry1 || ay + tws < ry0) continue;
      const k = tileKey(L_BASE, tx, ty);
      if (!state.tiles.has(k)) state.tiles.set(k, { canvas: renderTile(L_BASE, tx, ty), used: 0, L: L_BASE });
    }
  }
}

// Keeps level 0 and the tiles of the current view; on a large high-DPI
// canvas one view alone can need more than MAX_TILES.
function evictTiles(keep) {
  const limit = Math.max(MAX_TILES, keep.size + 16);
  if (state.tiles.size <= limit) return;
  const list = [...state.tiles.entries()].filter(([k, t]) => t.L !== L_BASE && !keep.has(k)).sort((a, b) => a[1].used - b[1].used);
  for (let i = 0; i < list.length && state.tiles.size > limit; i++) {
    state.tiles.delete(list[i][0]);
    if (state.pool.length < 8) state.pool.push(list[i][1].canvas);
  }
}

function drawTiles(ctx, L, list, tws) {
  const [minx, miny] = state.bounds;
  for (const [tx, ty] of list) {
    const t = state.tiles.get(tileKey(L, tx, ty));
    if (!t) continue;
    t.used = state.frame;
    const x0 = Math.round(((minx + tx * tws) * state.scale + state.ox) * state.dpr);
    const y0 = Math.round(((miny + ty * tws) * state.scale + state.oy) * state.dpr);
    const x1 = Math.round(((minx + (tx + 1) * tws) * state.scale + state.ox) * state.dpr);
    const y1 = Math.round(((miny + (ty + 1) * tws) * state.scale + state.oy) * state.dpr);
    ctx.drawImage(t.canvas, x0, y0, x1 - x0, y1 - y0);
  }
}

// Renders missing tiles for the current level within a time budget; returns true when all are ready.
function fillTiles(L) {
  const { out } = visibleTiles(L);
  const missing = out.filter(([tx, ty]) => !state.tiles.has(tileKey(L, tx, ty)));
  if (!missing.length) return true;
  const [ccx, ccy] = [state.cx, state.cy];
  const tws = tileWorldSize(L);
  const [minx, miny] = state.bounds;
  missing.sort((a, b) => {
    const da = (minx + (a[0] + 0.5) * tws - ccx) ** 2 + (miny + (a[1] + 0.5) * tws - ccy) ** 2;
    const db = (minx + (b[0] + 0.5) * tws - ccx) ** 2 + (miny + (b[1] + 0.5) * tws - ccy) ** 2;
    return da - db;
  });
  const t0 = performance.now();
  let done = 0;
  const keep = new Set(out.map(([tx, ty]) => tileKey(L, tx, ty)));
  for (const k of state.tiles.keys()) if (state.tiles.get(k).L === L_BASE) keep.add(k);
  for (const [tx, ty] of missing) {
    if (done > 0 && performance.now() - t0 > TILE_BUDGET_MS) break;
    const r0 = performance.now();
    state.tiles.set(tileKey(L, tx, ty), { canvas: renderTile(L, tx, ty), used: state.frame, L });
    state.perf.tileRenderMs = performance.now() - r0;
    state.tileGen = (state.tileGen || 0) + 1;
    done++;
  }
  evictTiles(keep);
  return done === missing.length;
}

// --- beeldhandtekening (kaart-perf 22-11) ---------------------------------------------------
// Het beeld (schaal, verschuiving, dpr, grootte) als vijf getallen, zonder allocatie per vraag.
function sameView(v) {
  return !!v && v.scale === state.scale && v.ox === state.ox && v.oy === state.oy && v.dpr === state.dpr && v.cw === state.cw && v.ch === state.ch;
}
function saveView(v) {
  v = v || {};
  v.scale = state.scale; v.ox = state.ox; v.oy = state.oy; v.dpr = state.dpr; v.cw = state.cw; v.ch = state.ch;
  return v;
}
// The last complete tile layer and the view it was drawn for. While the
// tiles of a new zoom step or view are still being rendered it is drawn
// underneath, moved and scaled to the current view, so zooming never shows
// bare meadow or a coarse overview where detail was a moment ago.
function keepLastGood() {
  let g = state.lastGood;
  // Kaart-perf 22-11: dezelfde tegels in hetzelfde beeld hoeven niet nog eens naar de kopie
  if (g && g.gen === state.tileGen && sameView(g.view)) return;
  if (!g) g = state.lastGood = { canvas: document.createElement('canvas') };
  g.gen = state.tileGen; g.view = saveView(g.view);
  const src = state.compose;
  if (g.canvas.width !== src.width || g.canvas.height !== src.height) {
    g.canvas.width = src.width;
    g.canvas.height = src.height;
  }
  const gc = g.canvas.getContext('2d');
  gc.clearRect(0, 0, src.width, src.height);
  gc.drawImage(src, 0, 0);
  g.scale = state.scale; g.ox = state.ox; g.oy = state.oy; g.dpr = state.dpr;
  g.base = state.baseScale;
}

function drawLastGood(c) {
  const g = state.lastGood;
  if (!g || g.base !== state.baseScale) return;
  // old device pixel q -> world (q / g.dpr - g.ox) / g.scale -> new device pixel
  const k = (state.scale * state.dpr) / (g.scale * g.dpr);
  const dx = (state.ox - (g.ox * state.scale) / g.scale) * state.dpr;
  const dy = (state.oy - (g.oy * state.scale) / g.scale) * state.dpr;
  c.drawImage(g.canvas, dx, dy, g.canvas.width * k, g.canvas.height * k);
}

// --- static overlay (labels + static icons), rebuilt with the view ---------

function textBox(cx, cy, w, h, angle) {
  const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
  const hw = (w * c + h * s) / 2, hh = (w * s + h * c) / 2;
  return [cx - hw, cy - hh, cx + hw, cy + hh];
}

function collides(boxes, b) {
  for (const o of boxes) if (b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) return true;
  return false;
}

// --- labelbotsing (#463) ----------------------------------------------------
// Een label en een pin bezetten allebei een doos in schermpunten. Wie eerst komt
// wint; onderling geldt missie > wijk > POI (LABEL_PRIO). Een pin ligt altijd
// bovenop en is klein en klikbaar, dus een label wijkt daar als eerste voor: in
// de binnenstad liepen de wijk- en gebiedsnamen anders door de pins heen.
const LABEL_PRIO = { missie: 0, wijk: 1, poi: 2 };

// Kaart-perf 22-11: de breedte van een tekst bij het huidige font, onthouden per font. Een herschil van de
// vaste laag mat elk label opnieuw (honderden measureText-aanroepen per zoomstap); dezelfde tekst in
// hetzelfde font geeft dezelfde breedte. Een later ingeladen webfont maakt de cache leeg.
const fontWidths = new Map();
let fontWidthN = 0;
if (typeof document !== 'undefined' && document.fonts && document.fonts.addEventListener) {
  document.fonts.addEventListener('loadingdone', () => { fontWidths.clear(); fontWidthN = 0; });
}
function textWidth(ctx, tekst) {
  const f = ctx.font;
  let m = fontWidths.get(f);
  if (!m) fontWidths.set(f, (m = new Map()));
  let w = m.get(tekst);
  if (w === undefined) {
    if (fontWidthN > 6000) { fontWidths.clear(); fontWidthN = 0; fontWidths.set(f, (m = new Map())); }
    w = ctx.measureText(tekst).width;
    m.set(tekst, w);
    fontWidthN++;
  }
  return w;
}

// De doos van een label bij het font dat de ctx nu heeft (schermpunten, geen
// wereldmeters: dezelfde tekst is bij elke zoom even groot).
function labelDoos(ctx, tekst, x, y, uitlijning = 'center') {
  const w = textWidth(ctx, tekst);
  const m = /([\d.]+)px/.exec(ctx.font || '');
  const h = m ? parseFloat(m[1]) : 13;
  const links = uitlijning === 'left' ? x : uitlijning === 'right' ? x - w : x - w / 2;
  return [links, y - h / 2, links + w, y + h / 2];
}

// Plaatst een set labels in volgorde van belang; wat een ander label of een pin
// raakt valt weg. Niet verschuiven: een half verschoven naam leest slechter dan
// een naam die je even niet ziet, en de volgende zoom laat hem weer toe.
// `kandidaten`: [{ box, prio, ... }]; `bezet`: al bezette dozen (pins, strook).
function plaatsLabels(kandidaten, bezet = [], marge = 2) {
  const uit = [];
  const volgorde = kandidaten.map((k, i) => ({ k, i })).sort((a, b) => a.k.prio - b.k.prio || a.i - b.i);
  for (const { k } of volgorde) {
    const b = [k.box[0] - marge, k.box[1] - marge, k.box[2] + marge, k.box[3] + marge];
    if (collides(bezet, b)) continue;
    if (uit.some((o) => collides([o.box], b))) continue;
    uit.push({ ...k, box: b });
  }
  return uit;
}

// De tweede regel van een gebied ("0 van 5 · 0%", of "veroverd") hoort niet bij
// het punt op de kaart maar in de strook; daar is hij altijd leesbaar.
function isVoortgangsregel(tekst) {
  return tekst === 'veroverd' || /^\d+ van \d+ · \d+%$/.test(tekst);
}

// De strook: links onder het zoekveld (eerst rechtsboven, maar daar lagen de knop Lagen en het paneel overheen). Daar zit geen kaartchrome (de uitleg
// staat linksboven, de legenda, de zoomknoppen en de schaalbalk linksonder) en
// de pins wijken ervoor, dus de chip valt nooit over een icoon (#463).
function voortgangsStrook(cw, ch, breedte, hoogte, top = 196, links = 52) {
  const w = Math.min(Math.max(120, Math.round(breedte)), Math.max(120, cw - 24));
  const h = Math.max(18, Math.round(hoogte));
  return [links, top, links + w, Math.min(ch - 12, top + h)]; // links onder het zoekveld: rechtsboven liggen de knop Lagen en het paneel Op de kaart
}

// Een pin onder de strook is onleesbaar en niet aanwijsbaar; hij wijkt, tenzij
// hij belangrijk is (missie 800, doel 900, speler 1000: die houden hun plek).
function pinWijktVoorStrook(sx, sy, prio, strook) {
  if (!strook) return false;
  if (sx < strook[0] || sx > strook[2] || sy < strook[1] || sy > strook[3]) return false;
  return prio < 400;
}

// De plek die een pin op het scherm inneemt: het rondje met zijn halo plus een
// randje lucht, zodat een label de rand niet raakt.
function pinDoos(sx, sy, sc) {
  const r = Math.max(9, 5 * sc + 2);
  return [sx - r, sy - r, sx + r, sy + r];
}

// De pins van de dynamische laag staan in wereldcoördinaten in state.pins (de
// laatste getekende set). Hier gaan ze met de huidige zoom naar schermpunten,
// zodat ze ook kloppen nadat er geschoven of gezoomd is.
function pinDozen() {
  const sc = mapIconScale(state.zoom);
  const uit = [];
  for (const p of state.pins || []) {
    const [sx, sy] = toScreen(p[0], p[1]);
    uit.push(pinDoos(sx, sy, sc));
  }
  if (state.strook) uit.push(state.strook); // de strook houdt haar eigen plek vrij
  return uit;
}

// De strook zelf: een donkere band met per gebied één regel "naam · 0 van 5 · 0%".
function tekenVoortgangsStrook(ctx, regels, box) {
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = '600 12px sans-serif';
  ctx.beginPath();
  ctx.roundRect(box[0], box[1], box[2] - box[0], box[3] - box[1], 7);
  ctx.fillStyle = inkA('dark', 0.82);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = inkA('greenLight', 0.35);
  ctx.stroke();
  for (let i = 0; i < regels.length; i++) {
    drawLabel(ctx, regels[i].tekst, box[0] + 10, box[1] + 12 + i * 18, regels[i].kleur || INK.cream, 'left', true);
  }
  ctx.restore();
  return box;
}

// Een naam op het land: inkt met een papieren halo (de gedrukte kaart); `donker` voor een tekst op een donkere band (crème met donkere halo).
function drawLabel(ctx, text, x, y, color, align, donker = false) {
  ctx.textAlign = align;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = donker ? inkA('dark', 0.85) : labelHalo(0.85);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = donker ? color : kaartTekst(color);
  ctx.fillText(text, x, y);
}

// #825: de stempel van een helemaal verkende streek naast zijn naam: een klein rond stempelvlak met
// een vinkje, in dezelfde inkt als de kaart. Alleen de kaart; de speler leest hem uit zijn eigen profiel.
function drawAreaStamp(ctx, x, y) {
  const r = 6;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = inkA('greenLight', 0.9);
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = inkA('dark', 0.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 2.6, y);
  ctx.lineTo(x - 0.6, y + 2);
  ctx.lineTo(x + 2.8, y - 2.4);
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK.dark;
  ctx.stroke();
  ctx.restore();
}

function roadRuns(road) {
  const p = road.pts;
  const runs = [];
  let start = 0, len = 0, prevA = null;
  for (let i = 0; i < p.length - 1; i++) {
    const dx = p[i + 1][0] - p[i][0], dy = p[i + 1][1] - p[i][1];
    const a = Math.atan2(dy, dx);
    let turn = prevA == null ? 0 : Math.abs(a - prevA);
    if (turn > Math.PI) turn = Math.PI * 2 - turn;
    if (turn > 0.35) {
      runs.push({ a: p[start], b: p[i], len });
      start = i;
      len = 0;
    }
    len += Math.hypot(dx, dy);
    prevA = a;
  }
  runs.push({ a: p[start], b: p[p.length - 1], len });
  return runs;
}

function drawStreetNames(ctx, boxes, bezet = []) {
  const [x0, y0, x1, y1] = viewRect(-20);
  const roads = state.map.queryView(x0, y0, x1, y1).roads;
  const names = layersAtZoom(state.zoom).labels;
  const fontPx = names.streetPx;
  ctx.font = `${fontPx}px ${FONT}`;
  const cands = [];
  for (const r of roads) {
    if (!r.name || r.cat === 'foot') continue;
    if (r.cat === 'cycle' && !names.cycleStreets) continue;
    if (r._labelRun === undefined) {
      let best = null;
      for (const run of roadRuns(r)) if (!best || run.len > best.len) best = run;
      r._labelRun = best;
    }
    const best = r._labelRun;
    if (!best) continue;
    const mx = (best.a[0] + best.b[0]) / 2, my = (best.a[1] + best.b[1]) / 2;
    if (mx < x0 || mx > x1 || my < y0 || my > y1) continue;
    if (discoveryHidden(mx, my)) continue; // 20-11: geen straatnamen in onbezocht gebied
    const chord = Math.hypot(best.b[0] - best.a[0], best.b[1] - best.a[1]) * state.scale;
    cands.push({ r, mx, my, chord, a: best.a, b: best.b, pri: ROAD_ORDER[r.cat] });
  }
  cands.sort((p, q) => q.pri - p.pri || q.chord - p.chord);
  const placedByName = new Map();
  let widthCache = state.textWidths.get(fontPx);
  if (!widthCache) state.textWidths.set(fontPx, widthCache = new Map());
  let placed = 0;
  for (const c of cands) {
    if (placed >= 110) break;
    let w = widthCache.get(c.r.name);
    if (w === undefined) { w = ctx.measureText(c.r.name).width; widthCache.set(c.r.name, w); }
    if (c.chord < w + 14) continue;
    const [sx, sy] = toScreen(c.mx, c.my);
    const prev = placedByName.get(c.r.name);
    if (prev && prev.some(([px, py]) => (px - sx) ** 2 + (py - sy) ** 2 < 320 * 320)) continue;
    let ang = Math.atan2(c.b[1] - c.a[1], c.b[0] - c.a[0]);
    if (ang > Math.PI / 2) ang -= Math.PI;
    if (ang < -Math.PI / 2) ang += Math.PI;
    const box = textBox(sx, sy, w + 6, fontPx + 2, ang);
    if (collides(boxes, box) || collides(bezet, box)) continue; // ook niet over een pin heen (#463)
    boxes.push(box);
    if (!prev) placedByName.set(c.r.name, [[sx, sy]]); else prev.push([sx, sy]);
    placed++;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);
    ctx.textBaseline = 'middle';
    drawLabel(ctx, c.r.name, 0, 1, c.r.cat === 'major' ? INK.cream : inkA('cream', 0.85), 'center');
    ctx.restore();
  }
}

function drawStaticOverlay(ctx) {
  const hover = [];
  const boxes = [];
  const z = state.zoom;
  const sc = mapIconScale(z);
  const names = layersAtZoom(z).labels; // which names show at this zoom (mapstyle.js)
  const onScreen = (sx, sy, m = 20) => sx > -m && sy > -m && sx < state.cw + m && sy < state.ch + m;
  // wat er al ligt: de pins van de dynamische laag en de voortgangsstrook. Een
  // label valt daaromheen (#463); de pins staan in wereldcoördinaten en worden
  // hier met de huidige zoom omgerekend, dus ze kloppen ook na schuiven/zoomen.
  const bezet = pinDozen();
  const vrij = (box) => !collides(boxes, box) && !collides(bezet, box);

  // gebieden veroveren (#414): wat je gedaan hebt kleurt mee, een veroverd gebied
  // krijgt een vlag. De namen worden uitgesteld (#463): de vullingen en grenzen
  // horen onder de andere labels, de namen gaan mee in dezelfde botsingsregel.
  const gebiedLabels = [];
  const onthoudLabel = (c, tekst, x, y, kleur, uitlijning) => gebiedLabels.push({ font: c.font, tekst, x, y, kleur, uitlijning });
  state.legendLaag = null;
  if (layerOn('veroverd')) {
    const laagId = tekenVeroverd(ctx, toScreen, state.scale, state.cw, state.ch, hover, onthoudLabel, inkA('cream', 0.9));
    state.legendLaag = laagId; // de legenda wordt in drawChrome getekend, boven de pins en volledig dekkend
  }

  // de voortgangsstrook meteen zijn plek laten reserveren (#463): hij is even
  // breed als zijn langste regel, dus dat kan voordat de andere labels gelegd
  // #900: de stand van alle gebieden waar je al iets deed, op elk zoomniveau. Niet alleen
  // de laag die de kaart nu tekent: een veroverd gebied of een half gedane wijk blijft zo
  // ook zichtbaar als je ver uit- of dicht inzoomt.
  // 20-11: één compacte regel (aantal veroverd en bezig) in plaats van drie regels; de details staan bij het aanwijzen van een gebied
  const alleRegels = layerOn('veroverd') ? statusRegels(kaartLaag().lijst, 99) : [];
  const nVer = alleRegels.filter((r) => r.tekst.endsWith('veroverd')).length, nBezig = alleRegels.length - nVer;
  const strookRegels = alleRegels.length ? [{ tekst: [nVer ? `${nVer} veroverd` : '', nBezig ? `${nBezig} bezig` : ''].filter(Boolean).join(' · '), kleur: nVer ? alleRegels[0].kleur : null }] : [];
  if (strookRegels.length) {
    ctx.font = '600 12px sans-serif';
    let w = 0;
    for (const r of strookRegels) w = Math.max(w, textWidth(ctx, r.tekst));
    // de strook hangt onder het zoekveld zoals het er echt staat (de kop schaalt mee met het menu), niet op een vaste hoogte
    let top = 196, links = 52;
    try {
      const zr = state.overlay.querySelector('.mapview-search').getBoundingClientRect(), cr = state.canvas.getBoundingClientRect();
      if (zr.height > 0 && cr.width > 0) { top = Math.round((zr.bottom - cr.top) * (state.cw / cr.width)) + 12; links = Math.max(12, Math.round((zr.left - cr.left) * (state.cw / cr.width))); }
    } catch (e) { /* geen DOM (test): de vaste plek */ }
    state.strook = voortgangsStrook(state.cw, state.ch, w + 20, strookRegels.length * 18 + 8, top, links);
    bezet.push(state.strook);
  } else state.strook = null;

  // de vaste pictogrammen eerst: hun plek is bezet voordat de labels gelegd
  // worden, zodat geen naam over een icoon heen valt (#463)
  // (horeca staat sinds 21-11 in de pinwachtrij van de dynamische laag: gegroepeerd per zoom, mapdeclutter.js)
  // Betreedbaar (#1150): de plekken waar je door de deur naar binnen kunt lopen, vanaf het stadsniveau
  if (layerOn('betreedbaar') && z >= NEAR_ZOOM) {
    const cellPx = 24 * sc / 1.9;
    for (const e of declutter(enterablePlaces(FAC.all), cellPx / state.scale)) {
      const [sx, sy] = toScreen(e.x, e.y);
      if (!onScreen(sx, sy)) continue;
      drawDoorBadge(ctx, sx, sy, sc * 0.9);
      bezet.push(pinDoos(sx, sy, sc));
      hover.push({ sx, sy, name: e.name || e.label, sub: 'Betreedbaar: ' + e.label });
    }
  }
  if (layerOn('flitspaal') && mapKindVisible('flitspaal', z)) {
    for (const f of state.world.flitspaalen || []) {
      const [sx, sy] = toScreen(f.x, f.y);
      if (!onScreen(sx, sy)) continue;
      drawMapIconHalo(ctx, 'flitspaal', sx, sy, sc);
      drawMapIcon(ctx, 'flitspaal', sx, sy, sc, { t: 0 });
      bezet.push(pinDoos(sx, sy, sc));
      hover.push({ sx, sy, name: 'Flitspaal' });
    }
  }
  if (layerOn('landmark')) {
    for (const l of state.map.meta.landmarks || []) {
      const [sx, sy] = toScreen(l.x, l.y);
      if (!onScreen(sx, sy, 120)) continue;
      drawMapIcon(ctx, 'landmark', sx, sy, sc, { t: 0 });
      bezet.push(pinDoos(sx, sy, sc));
      const nick = nicknameOf(l.name);
      hover.push({ sx, sy, name: l.name, sub: nick ? `Bezienswaardigheid · ${nick}` : 'Bezienswaardigheid', teleport: { x: l.x, y: l.y, name: l.name } });
    }
  }
  // #807 A15: één uitkijkpunt per streek (verkenpunten.js), uit de bestaande punten;
  // klikken zet er een routepunt, zoals bij een bezienswaardigheid. #902: de hover noemt
  // het gebied dat je ermee opent en waarom je erheen gaat; het punt zelf blijft altijd
  // staan (het is juist hoe je een onbekende streek ontdekt).
  if (layerOn('uitkijkpunt')) {
    for (const u of state.map.meta.uitkijkpunten || []) {
      if (!Number.isFinite(u.x) || !Number.isFinite(u.y)) continue;
      const [sx, sy] = toScreen(u.x, u.y);
      if (!onScreen(sx, sy, 120)) continue;
      drawMapIcon(ctx, 'uitkijkpunt', sx, sy, sc, { t: 0 });
      bezet.push(pinDoos(sx, sy, sc));
      const tekst = viewpointHover(u, { known: isAreaKnown(u.streek), used: isViewpointUsed(u) });
      hover.push({ sx, sy, name: tekst.main, sub: tekst.sub, x: u.x, y: u.y });
    }
  }

  // monumentgebieden (heritagearea.js): een eigen icoon met naam en een korte tekst, klikken zet een waypoint
  if (layerOn('landmark')) {
    for (const m of state.map.meta.monumenten || []) {
      const [sx, sy] = toScreen(m.x, m.y);
      if (!onScreen(sx, sy, 120)) continue;
      drawMapIcon(ctx, 'monument', sx, sy, sc, { t: 0 });
      bezet.push(pinDoos(sx, sy, sc));
      hover.push({ sx, sy, name: m.naam, sub: m.tekst, x: m.x, y: m.y });
    }
  }

  // region names (Friesland, Drenthe, Duitsland, the seas) under the places
  const [rx0, ry0, rx1, ry1] = provinceMapOn() ? viewRect() : [0, 0, 0, 0];
  const named = new Set();
  if (provinceMapOn() && names.regions) {
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    // (the right edge is pulled in by 8%: a clamped name at the bottom right would sit under the zoom buttons)
    for (const r of regionLabels(rx0, ry0, rx1 - (rx1 - rx0) * 0.08, ry1, 0.1)) {
      if (r.id === 'groningen' && !names.cityRegion) continue;
      const [sx, sy] = toScreen(r.x, r.y);
      const size = Math.round(r.big ? 30 : r.land ? 28 : 24);
      ctx.font = `${size}px ${FONT}`;
      const label = r.name.toUpperCase().split('').join(' ');
      const w = textWidth(ctx, label);
      const a = names.regionAlpha;
      if (r.land && r.id !== 'groningen') { ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = labelHalo(0.8); ctx.strokeText(label, sx, sy); }
      ctx.fillStyle = r.land ? (r.id === 'groningen' ? kaartTekst(inkA('cream', a.toFixed(2))) : kaartRandTekst(regionBorderColor(r.id))) : kaartTekst(inkA('seaLabel', (a + 0.1).toFixed(2)));
      ctx.fillText(label, sx, sy);
      boxes.push([sx - w / 2, sy - size / 2, sx + w / 2, sy + size / 2]);
      named.add(r.id);
    }
  }
  // #901: de naam van Friesland, Drenthe of Duitsland staat ook dichtbij langs de grens,
  // waar de kaart verder geen regiokaart-labels tekent. Zo zie je altijd waar je ophoudt.
  if (provinceMapOn()) {
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const m = 110 / state.scale;
    for (const r of regionEdgeLabels(rx0 + m, ry0 + m, rx1 - m, ry1 - m, 34 / state.scale)) {
      if (named.has(r.id)) continue;
      const [sx, sy] = toScreen(r.x, r.y);
      ctx.font = `18px ${FONT}`;
      const label = r.name.toUpperCase().split('').join(' ');
      const w = textWidth(ctx, label);
      const box = [sx - w / 2, sy - 10, sx + w / 2, sy + 10];
      if (!vrij(box)) continue;
      boxes.push(box);
      // de naam van een buurgebied in de kleur van zijn grens, goed leesbaar (#435)
      ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = labelHalo(0.8);
      ctx.strokeText(label, sx, sy);
      ctx.fillStyle = r.land ? kaartRandTekst(regionBorderColor(r.id)) : kaartTekst(inkA('seaLabel', 0.7));
      ctx.fillText(label, sx, sy);
    }
  }

  // towns, villages and hamlets of the province, by zoom (the city's wijken have their own names)
  {
    const [vx0, vy0, vx1, vy1] = viewRect(60);
    ctx.textBaseline = 'middle';
    if (worldPlacesReady()) {
      const [cx0, cy0, cx1, cy1] = state.real;
      for (const v of worldPlaceLabels(vx0, vy0, vx1, vy1)) {
        if (z < v.zoom) continue;
        if (discoveryHidden(v.x, v.y)) continue; // #899: nog niet bezocht: de naam wacht
        if (v.rank >= 5 && v.x > cx0 && v.x < cx1 && v.y > cy0 && v.y < cy1) continue;
        const [sx, sy] = toScreen(v.x, v.y);
        const big = v.rank <= 1;
        ctx.font = `${big ? 16 : names.placePx}px ${FONT}`;
        const label = v.name.toUpperCase();
        const box = labelDoos(ctx, label, sx, sy);
        if (!vrij(box)) continue;
        boxes.push(box);
        drawLabel(ctx, label, sx, sy, big ? INK.paper : inkA('cream', 0.82), 'center');
        hover.push({ sx, sy, name: v.name, sub: v.rank >= 5 ? 'Wijk' : v.kind === 'city' ? 'Stad' : v.kind === 'town' ? 'Plaats' : v.kind === 'hamlet' ? 'Buurtschap' : 'Dorp' });
      }
    } else {
      ctx.font = `${names.placePx}px ${FONT}`;
      for (const v of villageLabels(vx0, vy0, vx1, vy1)) {
        if ((v.kind === 'hamlet' || v.kind === 'quarter') && !names.hamlets) continue;
        if (discoveryHidden(v.x, v.y)) continue; // #899
        const [sx, sy] = toScreen(v.x, v.y);
        const label = v.name.toUpperCase();
        const box = labelDoos(ctx, label, sx, sy);
        if (!vrij(box)) continue;
        boxes.push(box);
        drawLabel(ctx, label, sx, sy, inkA('cream', 0.8), 'center');
        hover.push({ sx, sy, name: v.name, sub: 'Dorp in het Ommeland' });
      }
    }
  }

  // the neighbour villages outside the province, dimmed and not clickable (#237)
  if (provinceMapOn() && names.neighbours) {
    const [nx0, ny0, nx1, ny1] = viewRect(0);
    ctx.font = `${names.placePx}px ${FONT}`;
    ctx.textBaseline = 'middle';
    for (const v of borderPlaceLabels(nx0, ny0, nx1, ny1, [], { zoom: z, max: 40, gap: 70 / state.scale })) {
      const [sx, sy] = toScreen(v.x, v.y);
      const label = v.name.toUpperCase();
      const w = textWidth(ctx, label);
      if (sx - w / 2 < 4 || sx + w / 2 > state.cw - 4 || sy < 12 || sy > state.ch - 12) continue;
      const box = [sx - w / 2 - 2, sy - 8, sx + w / 2 + 2, sy + 8];
      if (!vrij(box)) continue;
      boxes.push(box);
      drawLabel(ctx, label, sx, sy, inkA('cream', 0.45), 'center');
    }
  }

  if (layerOn('wijken') && names.wijken) {
    ctx.font = `${names.wijkPx}px ${FONT}`;
    ctx.textBaseline = 'middle';
    const alpha = names.wijkAlpha;
    for (const p of state.map.meta.neighbourhoodPoints || []) {
      const [sx, sy] = toScreen(p.x, p.y);
      if (!onScreen(sx, sy, 80)) continue;
      if (discoveryHidden(p.x, p.y)) continue; // #899
      const label = p.name.toUpperCase();
      const w = textWidth(ctx, label);
      const box = [sx - w / 2 - 2, sy - 8, sx + w / 2 + 2, sy + 8];
      if (!vrij(box)) continue;
      boxes.push(box);
      // after dark a few wijken carry a warning (muggingrules.js): amber name and a triangle.
      // #888: een veroverde wijk is niet gevaarlijk meer.
      const conquered = veroverdOp(getProfiel(), getIndeling(), p.x, p.y, 'buurt') || veroverdOp(getProfiel(), getIndeling(), p.x, p.y, 'wijk');
      const warn = warnsOn(p.name, ((state.world.clock % 24) + 24) % 24, conquered);
      drawLabel(ctx, label, sx, sy, warn ? inkA('amber', Math.max(0.85, alpha).toFixed(2)) : inkA('cream', alpha.toFixed(2)), 'center');
      if (warn) {
        const tx = sx - w / 2 - 11;
        ctx.beginPath(); ctx.moveTo(tx, sy - 6); ctx.lineTo(tx + 6, sy + 5); ctx.lineTo(tx - 6, sy + 5); ctx.closePath();
        ctx.fillStyle = INK.amber; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = inkA('dark', 0.9); ctx.stroke();
        ctx.fillStyle = INK.amberInk; ctx.fillRect(tx - 0.7, sy - 2.5, 1.4, 4); ctx.fillRect(tx - 0.7, sy + 2.3, 1.4, 1.4);
      }
      hover.push({ sx, sy, name: p.name, sub: warn ? `Wijk · 's nachts opletten: ${riskWhy(p.name)}` : 'Wijk', teleport: { x: p.x, y: p.y, name: p.name } });
    }
  }

  // #825: de namen van de streken die deze speler kent, pas na de dorpen (die gaan voor) en met een
  // stempel als de streek helemaal verkend is. Een onbekende streek staat hier niet: alleen de kaart
  // verbergt hem, de wereld blijft gewoon bestaan en berijdbaar.
  if (provinceMapOn() && names.regions) {
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    for (const area of explorationLabels()) {
      const [sx, sy] = toScreen(area.x, area.y);
      if (!onScreen(sx, sy, 200)) continue;
      ctx.font = `20px ${FONT}`;
      const label = area.name.toUpperCase().split('').join(' ');
      const w = textWidth(ctx, label);
      const box = [sx - w / 2 - 8, sy - 12, sx + w / 2 + (area.stamp ? 20 : 8), sy + 12];
      if (!vrij(box)) continue;
      boxes.push(box);
      ctx.fillStyle = kaartTekst(area.stamp ? inkA('cream', 0.85) : inkA('cream', 0.5));
      ctx.fillText(label, sx, sy);
      if (area.stamp) drawAreaStamp(ctx, sx + w / 2 + 10, sy);
    }
    ctx.textAlign = 'left';
  }

  // de gebiedsnamen, in dezelfde botsingsregel en na de wijken (wijk > gebied);
  // hun voortgangsregel staat al in de strook rechtsboven (#463)
  if (gebiedLabels.length) {
    ctx.textBaseline = 'middle';
    const kandidaten = [];
    for (const it of gebiedLabels) {
      if (isVoortgangsregel(it.tekst)) continue;
      ctx.font = it.font;
      kandidaten.push({ tekst: it.tekst, x: it.x, y: it.y, kleur: it.kleur, uitlijning: it.uitlijning, font: it.font, prio: LABEL_PRIO.wijk, box: labelDoos(ctx, it.tekst, it.x, it.y, it.uitlijning) });
    }
    for (const k of plaatsLabels(kandidaten, [...bezet, ...boxes])) {
      ctx.font = k.font;
      drawLabel(ctx, k.tekst, k.x, k.y, k.kleur, k.uitlijning);
      boxes.push(k.box);
    }
  }
  // de strook staat er ook als de getekende laag even geen naam kwijt kan (#900)
  if (strookRegels.length) tekenVoortgangsStrook(ctx, strookRegels, state.strook);

  if (layerOn('streets') && names.streets) drawStreetNames(ctx, boxes, bezet);

  // de namen van bezienswaardigheden en bijgenaamde gebouwen: POI, dus als laatste
  if (layerOn('landmark')) {
    ctx.font = '14px ' + FONT;
    ctx.textBaseline = 'middle';
    for (const l of state.map.meta.landmarks || []) {
      const [sx, sy] = toScreen(l.x, l.y);
      if (!onScreen(sx, sy, 120)) continue;
      const x = sx + 6 + 5 * sc;
      const box = labelDoos(ctx, l.name, x, sy + 1, 'left');
      if (!vrij(box)) continue; // geen naam over een pin of een andere naam heen (#463)
      boxes.push(box);
      drawLabel(ctx, l.name, x, sy + 1, INK.paper, 'left');
    }
    // nicknamed buildings and the old Oosterpark (flavourlines.js)
    ctx.font = 'italic 13px ' + FONT;
    for (const f of FLAVOUR_MAP_PLACES) {
      const [sx, sy] = toScreen(f.x, f.y);
      if (!onScreen(sx, sy, 120) || !names.flavour) continue;
      const box = labelDoos(ctx, f.name, sx, sy);
      if (!vrij(box)) continue;
      boxes.push(box);
      drawLabel(ctx, f.name, sx, sy, inkA('flavour', 0.9), 'center');
      hover.push({ sx, sy, name: f.name, sub: f.sub });
    }
  }
  state.staticHover = hover;
}

// De vaste laag staat op een eigen doek. Tijdens pannen en zoomen (het beeld veranderde minder dan
// OVERLAY_SETTLE_MS geleden) tekent hij de vorige laag geschaald mee; na stilstand of bij een andere
// oorzaak van vuil (laag aan/uit, pins, modus) bouwt hij hem opnieuw. Geeft true als er nog een scherpe
// herschil volgt.
function drawOverlayCached(c, wasDirty, now) {
  let ov = state.fixedLayerCache; // (niet state.overlay: dat is het DOM-element van de kaart)
  if (!ov) ov = state.fixedLayerCache = { canvas: document.createElement('canvas'), ctx: null, valid: false, view: null };
  const src = state.compose;
  if (ov.canvas.width !== src.width || ov.canvas.height !== src.height) {
    ov.canvas.width = src.width; ov.canvas.height = src.height; ov.valid = false; ov.ctx = null;
  }
  if (!ov.ctx) ov.ctx = ov.canvas.getContext('2d');
  const seen = state.seenView;
  if (!sameView(seen)) { state.seenView = saveView(seen); state.viewMovedAt = now; }
  const plan = overlayPlan({ valid: ov.valid, sameView: sameView(ov.view), wasDirty, sameBase: ov.base === state.baseScale, sinceMoveMs: now - state.viewMovedAt });
  if (plan === 'reuse') { c.drawImage(ov.canvas, 0, 0); state.perf.overlayHits = (state.perf.overlayHits || 0) + 1; return false; }
  if (plan === 'interim') {
    const v = ov.view;
    const k = (state.scale * state.dpr) / (v.scale * v.dpr);
    const dx = (state.ox - (v.ox * state.scale) / v.scale) * state.dpr;
    const dy = (state.oy - (v.oy * state.scale) / v.scale) * state.dpr;
    const keep = c.getTransform();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(ov.canvas, dx, dy, ov.canvas.width * k, ov.canvas.height * k);
    c.setTransform(keep);
    state.perf.overlayInterim = (state.perf.overlayInterim || 0) + 1;
    return true;
  }
  const oc = ov.ctx;
  oc.setTransform(1, 0, 0, 1, 0, 0);
  oc.clearRect(0, 0, ov.canvas.width, ov.canvas.height);
  oc.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  state.pinsGebruikt = state.pinsSleutel || '';
  state.pinsPositieGebruikt = state.pinsPosities || '';
  drawStaticOverlay(oc);
  ov.view = saveView(ov.view); ov.base = state.baseScale; ov.valid = true;
  const keep = c.getTransform();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(ov.canvas, 0, 0);
  c.setTransform(keep);
  state.perf.overlayBuilds = (state.perf.overlayBuilds || 0) + 1;
  return false;
}

function compose() {
  const t0 = performance.now();
  const wasDirty = state.dirty;
  const c = state.composeCtx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, state.compose.width, state.compose.height);
  // #901: buiten het kader van de kaart ligt hetzelfde donkere buurland als erbinnen
  // (meadow met de tint van drawOutside), zodat de rand van de kaart nooit als een
  // lichte of harde vierkante rand in beeld komt als het scherm breder is dan de kaart.
  c.fillStyle = MAP_STYLE.meadow;
  c.fillRect(0, 0, state.compose.width, state.compose.height);
  c.fillStyle = inkA('tintMap', 0.5);
  c.fillRect(0, 0, state.compose.width, state.compose.height);
  c.imageSmoothingEnabled = true;

  if (!state.level0) { state.level0 = true; ensureLevel0(); }
  const L = levelFor(state.zoom);
  const ready = fillTiles(L);
  const { tws, out } = visibleTiles(L);
  if (!ready) {
    const v0 = visibleTiles(L_BASE);
    drawTiles(c, L_BASE, v0.out, v0.tws);
    drawLastGood(c);
  }
  drawTiles(c, L, out, tws);
  if (ready) keepLastGood();

  // #899: de onbezochte buurten uitgrijzen, met de fade van net ontdekte buurten
  drawDiscovery(c, performance.now());

  const t1 = performance.now();
  c.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  // de pins waar deze laag omheen legt (#463): de vaste laag onthoudt welke set
  // hij gebruikte, zodat een nieuwe set één keer tot een herschil leidt
  const interim = drawOverlayCached(c, wasDirty, t0);
  state.perf.tilesMs = t1 - t0;
  state.perf.overlayMs = performance.now() - t1;
  state.dirty = !ready || interim;
  state.perf.composeMs = performance.now() - t0;
}

// --- dynamic layer ----------------------------------------------------------

// #759: de vaste laag (labels, straatnamen) hoeft niet elke frame opnieuw opgebouwd te
// worden als alleen de pins bewegen. Bewegen ze binnen dezelfde set, dan volgt hooguit
// één herschil per 250 ms; een label staat dan even naast een pin, meer niet.
const PIN_RECOMPOSE_MS = 250;

// De sleutel van dezelfde vaste laag (#759): alleen de set pins (soort en naam) telt,
// niet waar ze staan. Twee pins van dezelfde soort en naam zijn voor de labels gelijk,
// dus een bewegende medespeler of politie-eenheid vraagt geen nieuw herschil.
export function pinSetKey(geplaatst) {
  return (Array.isArray(geplaatst) ? geplaatst : []).map((q) => `${q && q.kind}|${(q && q.name) || ''}`).sort().join(';');
}

// het aantal van een groep pictogrammen (horeca, mapdeclutter.js): een rond bolletje rechtsboven het icoon
function drawClusterTelling(ctx, x, y, n) {
  const tekst = n > 99 ? '99+' : String(n);
  ctx.save();
  ctx.font = 'bold 12px sans-serif';
  const r = Math.max(9, ctx.measureText(tekst).width / 2 + 5);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = INK.dark;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK.cream;
  ctx.stroke();
  ctx.fillStyle = INK.cream;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tekst, x, y + 0.5);
  ctx.restore();
}

// Samen spelen: een onderdeel dat nog niet samen werkt is uitgegrijsd (zelfde grijs als de passieve spelers: INK.passiefGrijs).
function drawGrijs(ctx, teken) {
  ctx.save();
  try { ctx.filter = 'grayscale(1)'; } catch (e) { /* zonder filter blijft de lagere dekking over */ }
  teken();
  ctx.restore();
}
// Een onderdeel dat deels samen werkt: een klein rond bolletje, half gevuld (niet alleen kleur), rechtsboven op het pictogram.
function drawDeelsMarkering(ctx, x, y, sc) {
  const r = Math.max(4, 4.4 * sc);
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = INK.cream; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r - 1, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath(); ctx.fillStyle = INK.amber; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 1.2; ctx.strokeStyle = inkA('dark', 0.9); ctx.stroke();
  ctx.restore();
}

function drawDynamicMarkers(ctx, world) {
  const t = performance.now() / 1000;
  const hover = [];
  const z = state.zoom;
  // pick: what a click on the marker offers ({ goal, todo }, see markerCard)
  // the icons are queued, then thinned by priority and drawn (mapicons.js)
  const queue = [];
  const sc = mapIconScale(z);
  // samen spelen: met twee of meer spelers is een onderdeel dat nog niet samen werkt grijs ('nee') of heeft een markering ('deels'), met de melding bij hover en klik
  const samenVan = (soort, id, status) => samenWaarschuwing(world, soort, id, status);
  const icon = (layer, kind, x, y, name, opts, sub, pick, samen = null) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return; // een laag zonder echte plek mag geen pin of toFixed-crash geven
    if (layer && !layerOn(layer)) return;
    if (!mapKindVisible(kind, z)) return;
    if (!pinBlijftInMist(kind, pick) && discoveryHidden(x, y)) return; // 20-11: in nog onbezocht gebied geen pins, alleen de bewust getoonde doelen
    const [sx, sy] = toScreen(x, y);
    if (sx < -20 || sy < -20 || sx > state.cw + 20 || sy > state.ch + 20) return;
    if (samen) pick = { ...pick, samen };
    queue.push({ kind, sx, sy, opts, name, sub, x, y, pick, samen });
  };

  for (const r of getRoutes()) drawFullRoute(ctx, world, t, r);
  // #972 en #1092: je eigen akkers en weilanden als label met statusicoon op het veld, zonder getekend vlak: de catalogusvelden hebben geen
  // echte perceelvorm (kaartdata), en een verzonnen rechthoek als perceelrand hoort niet op de kaart.
  const eigenVelden = layerOn('percelen') && markerVisible('percelen') ? eigenPerceelVlakken() : [];
  state.eigenVelden = eigenVelden;
  for (const v of eigenVelden) {
    const st = v.stijl || { vul: 'greenLight', rand: 'greenLight', dash: [], letter: '' };
    if (!st.letter) continue;
    const p = toScreen(v.x, v.y);
    ctx.save();
    tekenVeldLabel(ctx, v, st, p, p, toScreen);
    ctx.restore();
  }
  // epic Bezit (#1098): de kaartlaag Te koop (forsalemap.js): vlakken met prijs, van jou, van een medespeler, niet te koop
  const koopView = layerOn('tekoop') && bezitOpen('land') ? forSaleView(viewRect(), state.scale) : null;
  state.koopVelden = koopView && koopView.mode === 'shapes' ? koopView.shapes : [];
  if (koopView && koopView.loading) ensureIndex().then(() => { state.dirty = true; }).catch(() => {});
  if (koopView) drawForSale(ctx, koopView, toScreen, state.zoom, state.hoverKoopId, state.card && state.card.h && state.card.h.bezit);
  // Snackimperium (#1102): de kaartlaag Standplaatsen (pitchmap.js): vrij, van jou, van Us Mem Snacks, van een medespeler
  const standView = layerOn('standplaats') && snackOpen() ? pitchMarkerView(spotRows(), viewRect(), state.scale) : null;
  state.standMarkers = standView && standView.mode === 'markers' ? standView.markers : [];
  if (standView) drawPitchMarkers(ctx, standView, toScreen, state.zoom, null, state.card && state.card.h && state.card.h.standplaats);
  // de OV-lijnen van de bestemming waar de kaartkaart open voor staat (#97)
  if (state.reis) tekenLijnen(ctx, state.reis.lagen, toScreen, 1);

  for (const g of getGaragesForRender()) icon('garage', 'garage', g.x, g.y, g.name || 'Garage');
  for (const f of facilitiesOf(['hospital', 'gppost'])) icon('zorg', 'hospital', f.x, f.y, f.name, {}, f.kind === 'hospital' ? 'Ziekenhuis' : 'Huisartsenpost');
  for (const f of facilitiesOf('police')) icon('politiebureau', 'politiebureau', f.x, f.y, f.name, {}, 'Politiebureau');
  for (const h of getHomeForRender()) icon('home', 'home', h.x, h.y, h.name, {}, h.sub);
  for (const h of getHomeGarageForRender()) icon('homeGarage', 'home', h.x, h.y, h.name, {}, h.sub);
  for (const h of getHomeMooringForRender(world)) icon('home', 'homeMooring', h.x, h.y, h.name, {}, h.sub);
  for (const h of getHomeHelipadForRender()) icon('home', 'homeHelipad', h.x, h.y, h.name, {}, h.sub);

  const m = world.mission;
  const job = world.sideJob && world.sideJob.active ? world.sideJob : null;
  if (job) {
    for (const d of job.dots) icon(null, 'sj-dot', d.x, d.y, d.label || job.label);
    if (job.marker) icon(null, 'sj-target', job.marker.x, job.marker.y, job.label, {}, job.goal ? job.goal.label : 'Klus');
  }
  // map rule: a mission shows only while it runs, as the story's step or as the goal
  const showMission = !!(m && missionOnMap(world) && !job);
  if (layerOn('klussen') && !job) {
    for (const k of getMissionList()) {
      if (!k.done || (showMission && k.index === m.index) || k.status === 'actief') continue;
      icon(null, missionMapKind(k.index, false), k.start.x, k.start.y, k.label, { alpha: 0.5 }, `Klus · opnieuw spelen: €${k.klusloon}`, { todo: 'm:' + k.index }, samenVan('missie', k.index, k.samen));
    }
  }
  if (showMission) {
    const wps = m.phase === 'active' ? m.remainingWaypoints || [] : [];
    if (wps.length) {
      drawRoute(ctx, [m.marker, ...wps].map((w) => toScreen(w.x, w.y)), ICON);
      for (const w of wps) icon(null, 'waypoint', w.x, w.y, 'Controlepunt');
    }
    icon(null, missionMapKind(m.index, m.phase === 'active'), m.marker.x, m.marker.y,
      m.label || 'Missie', {}, m.phase === 'active' ? 'Missiedoel' : 'Missie starten', m.phase === 'active' ? null : { todo: 'm:' + m.index }, samenVan('missie', m.index, (getMissionList().find((q) => q.index === m.index) || {}).samen));
  }
  // samen spelen: het doel van de opdracht van de gastheer staat ook op de kaart van een gast (#368)
  const gastDoelLijst = world.coopRole === 'client' && !showMission ? gastDoelen(world) : []; // alle doelen van jouw groep, niet alleen het eerste (#452)
  const gastDoel = gastDoelLijst[0];
  const gastMissie = world.coopMissie || world.coopHostMissie; // de opdracht van deze gast, niet die van een andere groep (#452)
  for (const gd of gastDoelLijst) icon(null, gd.soort === 'controle' ? 'waypoint' : missionMapKind(-1, true), gd.x, gd.y, gd.soort === 'controle' ? 'Controlepunt' : gd.label || (gastMissie && gastMissie.label) || 'Opdracht', {}, 'Missiedoel van ' + (((world.coopRoster || []).find((r) => r.slot === 0) || {}).naam || 'de ander'));
  // samen spelen (#492): op de gastheer de groepen uit het register. De eigen groep komt vooraan en bovenop (eigen: true); de andere
  // groepen mogen gedempt mee, maar overschrijven de eigen markering niet. Loopt de eigen opdracht al op de kaart, dan is die marker
  // genoeg. Een gast kent alleen zijn eigen groep: die staat hierboven al (gastDoelen).
  for (const gd of kaartDoelen(world)) {
    if (gd.eigen && showMission) continue;
    icon(null, gd.soort === 'controle' ? 'waypoint' : missionMapKind(-1, true), gd.x, gd.y,
      gd.soort === 'controle' ? 'Controlepunt' : gd.label || gd.groep || 'Opdracht',
      gd.eigen ? {} : { alpha: KAART_ANDER_ALPHA },
      gd.eigen ? 'Doel van jouw groep' : `Missiedoel van ${gd.groep || 'een andere groep'}`);
  }
  const gastStart = world.coopRole === 'client' && !showMission && !gastDoel && world.coopHost && world.coopHost.starts && world.coopHost.starts[0]; // (#434)
  if (gastStart) icon(null, missionMapKind(gastStart.index, false), gastStart.x, gastStart.y, 'Opdracht', {}, 'Begint zodra ' + (((world.coopRoster || []).find((r) => r.slot === 0) || {}).naam || 'de ander') + ' bij de marker staat');
  // the story's step stays on the map while a goal of your own waits it out
  const sg = world.storyGuide;
  if (sg && !world.storyFreePlay && !(showMission && Math.hypot(m.marker.x - sg.x, m.marker.y - sg.y) < 4) && !(sg.buy && storyTargetShop(world))) {
    icon(null, 'missionIdle', sg.x, sg.y, sg.name, {}, 'Verhaal', { story: true });
  }
  // a story step with a choice (Even onderduiken): the other options too
  for (const c of world.storyChoices || []) {
    if (sg && Math.hypot(c.x - sg.x, c.y - sg.y) < 4) continue;
    icon(null, 'missionIdle', c.x, c.y, c.name, {}, 'Verhaal: of dit', { story: true });
  }

  // #834: van een onbekende streek ook de bijbanen, vondsten en overige spots verbergen.
  const onbekend = (x, y) => isAreaHidden(x, y);
  for (const o of getOwnedVehiclesForMap(world)) icon('car', 'own', o.x, o.y, 'Jouw ' + o.label, { vkind: o.kind, color: o.color });
  for (const sh of getShopsDecluttered(z >= NEAR_ZOOM ? 1 : 26 / state.scale)) { if (onbekend(sh.x, sh.y)) continue; icon(SHOP_TYPES[sh.type].group, 'shop-' + sh.type, sh.x, sh.y, sh.name, {}, SHOP_TYPES[sh.type].label); }
  // horeca (21-11): per zoom gegroepeerd en begrensd (mapdeclutter.js); een groep toont het aantal en zoomt in bij een klik
  if (layerOn('horeca') && mapKindVisible('horeca', z)) {
    const [wx0, wy0] = toWorld(0, 0), [wx1, wy1] = toWorld(state.cw, state.ch);
    const fade = fadeIn(z, ICON_MIN_ZOOM.horeca);
    for (const h of horecaPlan(getHorecaForRender(), { zoom: z, scale: state.scale, x0: Math.min(wx0, wx1), x1: Math.max(wx0, wx1), y0: Math.min(wy0, wy1), y1: Math.max(wy0, wy1) })) {
      if (h.n > 1) icon('horeca', 'horeca', h.x, h.y, `${h.n} horecaplekken`, { alpha: fade }, 'Klik om in te zoomen', { clusterN: h.n });
      else icon('horeca', 'horeca', h.x, h.y, h.first.name || 'Horeca', { alpha: fade }, 'Horeca');
    }
  }
  const storyShop = storyTargetShop(world);
  if (storyShop) {
    const [sx, sy] = toScreen(storyShop.x, storyShop.y);
    drawStoryShopRing(ctx, sx, sy, 13, t);
    icon(null, 'shop-' + storyShop.type, storyShop.x, storyShop.y, storyShop.name, {}, 'Voor het verhaal: ' + world.storyGuide.name.replace(/^Eerst: /, ''));
  }
  for (const ps of getPigeonSpotsForRender()) { if (onbekend(ps.x, ps.y)) continue; icon('duif', 'pigeon', ps.x, ps.y, ps.name, {}, 'Word een duif', { goal: { kind: 'play', id: 'duif', name: 'Duivenmodus', sub: ps.name, x: ps.x, y: ps.y }, todo: 'mg:duif' }, samenVan('minigame', 'duif')); }
  const play = (id, name, sub, x, y, todo) => ({ goal: { kind: 'play', id, name, sub, x, y }, todo });
  for (const hs of getHeliSpotsForRender()) { if (onbekend(hs.x, hs.y)) continue; icon('heli', 'heli', hs.x, hs.y, hs.name, {}, 'Ballonjacht met de heli', play('heli', 'Ballonjacht', hs.name, hs.x, hs.y, 'mg:heli'), samenVan('minigame', 'heli')); }
  // a heli run: its rings where they hang, the H to land on and the balloon
  const hm = getHeliRunMarks();
  if (hm) {
    ctx.save();
    for (const r of hm.rings) {
      if (r.state === 'done' || r.state === 'miss') continue;
      const [sx, sy] = toScreen(r.x, r.y);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(5, 11 * state.scale), 0, Math.PI * 2);
      ctx.lineWidth = r.state === 'next' ? 3 : 2;
      ctx.strokeStyle = r.state === 'next' ? INK.ringNext : inkA('ringLater', 0.8);
      ctx.stroke();
    }
    for (const [q, col] of [[hm.pad, INK.green], [hm.balloon, INK.balloon]]) {
      if (!q) continue;
      const [sx, sy] = toScreen(q.x, q.y);
      ctx.beginPath();
      ctx.arc(sx, sy, 7, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK.cream;
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const ps of getPadelSpotsForRender()) { if (onbekend(ps.x, ps.y)) continue; icon('padel', 'padel', ps.x, ps.y, ps.name, {}, world.time < ps.nextAt ? 'Baan even bezet' : 'Potje padel: volle gezondheid', play('padel', 'Padel', ps.name, ps.x, ps.y, 'mg:padel'), samenVan('minigame', 'padel')); }
  const ACT_PLAY = { carbid: ['carbid', 'Carbid schieten', 'mg:carbid'], kermis: ['kermis', "Botsauto's", 'mg:botsauto'], drift: ['drift', 'Driftzone', 'mg:drift'], discgolf: ['discgolf', 'Discgolf', 'mg:discgolf'], pitchputt: ['pitchputt', 'Pitch & putt', 'mg:pitchputt'], skatepark: ['skatepark', 'Skatepark', 'mg:skatepark'], penalty: ['penalty', 'Penaltyserie Euroborg', 'mg:penalty'], voetbal: ['voetbal', 'Voetbal Euroborg', 'mg:voetbal'], kartbaan: ['kartbaan', 'Karten bij Kardinge', 'mg:kartbaan'], zwembad: ['zwembad', 'Zwembad', 'mg:zwembad'], klimtoren: ['klimtoren', 'Klimtoren Zernike', 'mg:klimtoren'], waterski: ['waterski', 'Waterskiën', 'mg:waterski'], vliegschool: ['vliegschool', 'Vliegschool', 'mg:vliegschool'] };
  for (const a of activityMapIcons(world)) {
    // #825: een streek die deze speler nog niet kent toont geen activiteiten-iconen; de wereld, de
    // wegen en de missies blijven wel staan (alleen de kaart verbergt ze, niets is onbereikbaar).
    if (isAreaHidden(a.x, a.y)) continue;
    const ap = ACT_PLAY[a.layer];
    icon(a.layer, a.kind, a.x, a.y, a.name, {}, a.sub, ap ? play(ap[0], ap[1], a.name, a.x, a.y, ap[2]) : null, samenVan('activiteit', a.id));
  }
  for (const q of getPostgameSpotsForRender()) { if (onbekend(q.x, q.y)) continue; icon('postgame', 'pg-' + q.kind, q.x, q.y, q.name, {}, q.busy ? `Nu: ${q.busy.label}` : q.sub, q.id ? { goal: { kind: 'challenge', id: q.id, name: q.name, x: q.x, y: q.y }, todo: 'pg:' + q.id } : null, samenVan('minigame', 'pg_' + q.id)); }
  for (const q of getOnderdeelSpotsForRender()) { if (onbekend(q.x, q.y)) continue; icon('onderdeel', 'onderdeel-' + q.id, q.x, q.y, q.naam, {}, q.plek, { goal: { kind: 'place', name: q.naam, sub: q.plek, x: q.x, y: q.y } }); }
  for (const q of getWrakduikSpotsForRender()) { if (q.gedoken || onbekend(q.x, q.y)) continue; icon('wrakduik', 'wrakduik-' + q.id, q.x, q.y, q.naam, {}, `Duiken naar ${q.wrak.naam}`, { goal: { kind: 'place', name: q.naam, sub: q.water, x: q.x, y: q.y } }, samenVan('activiteit', 'wrakduik')); }
  for (const q of getStreekuitdagingSpotsForRender()) { if (onbekend(q.x, q.y)) continue; icon('streekuitdaging', 'hogelandrit', q.x, q.y, q.naam, {}, 'Met een voertuig vanaf Warffum', { goal: { kind: 'place', name: q.naam, x: q.x, y: q.y } }, samenVan('activiteit', 'hogelandrit')); }
  const ct = !job && world.challengeTarget;
  if (ct) {
    if (ct.path.length) drawRoute(ctx, [...ct.path, ct].map((w) => toScreen(w.x, w.y)), ICON);
    icon(null, 'sj-target', ct.x, ct.y, 'Controlepunt', {}, 'Uitdaging');
  }
  for (const sj of getSideJobSpotsForRender()) { if (onbekend(sj.x, sj.y)) continue; const dicht = sideJobGateHint(sj.job.id); /* #1131: nog dicht in het verhaal: gedimd, met de zin van het personage */ icon(sj.job.layer || 'bijbaan', 'sj-' + sj.job.id, sj.x, sj.y, sj.job.name, dicht ? { alpha: 0.4 } : {}, dicht || `${sj.job.kicker || 'Bijbaantje'}: ${sj.job.blurb.toLowerCase()}`, { goal: { kind: 'job', id: sj.job.id, name: sj.job.name, sub: 'Bijbaantje', x: sj.x, y: sj.y }, todo: 'job:' + sj.job.id }, samenVan('bijbaan', sj.job.id)); }
  for (const st of getStationsForRender()) icon('trein', 'station', st.x, st.y, st.name, {}, VILLAGES[st.name] ? `Reizen met de trein · ${VILLAGES[st.name].teaser}. Machinist: pak een stilstaande trein (E), dan G` : 'Reizen met de trein. Machinist: pak een stilstaande trein (E), dan G');
  // de bushaltes rond de speler (ovmissie.js): bij elke halte kan een busdienst beginnen; zelfde filter als de stations
  for (const h of haltesVoorKaart(hoofdspeler(world))) icon('trein', 'ov-halte', h.x, h.y, `Halte ${h.naam}`, {}, 'Een busdienst starten: loop erheen en druk E');
  // #922: de live bussen van vandaag, met hun lijn en dienst als label
  for (const b of liveBusMarks(hoofdspeler(world), 4)) icon(null, 'livebus', b.x, b.y, b.label, {}, b.sub);
  // de terugval als er geen live gegevens zijn: de bussen van het spel, duidelijk als Rooster gemarkeerd (busbron.js)
  for (const b of roosterBusMarks(world, 3)) icon(null, 'roosterbus', b.x, b.y, b.label, {}, b.sub);
  for (const q of ommelandMapSpots()) { if (onbekend(q.x, q.y)) continue; icon('ommeland', q.kind, q.x, q.y, q.name, {}, q.sub); }
  // het eerbetoonbankje (#832): een eigen icoon, altijd zichtbaar zodat de plek
  // aan de westgrens te vinden is (ook voordat je er geweest bent)
  const beppe = beppeMapSpot();
  if (beppe) icon(null, beppe.kind, beppe.x, beppe.y, beppe.name, {}, beppe.sub, { goal: beppe.goal, todo: beppe.todo });
  if (markerVisible('percelen')) for (const q of perceelMapSpots()) { if (onbekend(q.x, q.y) && !q.kind.startsWith('perceel-eigen')) continue; icon('percelen', q.kind, q.x, q.y, q.name, {}, q.sub, { goal: q.goal }); }
  // de kaartlaag Voetbal (#1117): de sportparken uit de kaart met hun verzonnen club, gedimd naast de eigen club en de volgende tegenstander (die komen van de activiteit)
  if (markerVisible('voetbalclub')) for (const q of voetbalParkSpots()) { if (onbekend(q.x, q.y)) continue; icon('voetbal', 'act-voetbal', q.x, q.y, q.name, { alpha: 0.55 }, q.sub, { goal: q.goal }); }
  for (const e of getEierbalTips()) { if (onbekend(e.x, e.y)) continue; icon(null, 'eierbalTip', e.x, e.y, 'Eierbal-tip', {}, 'Uit de Buukenkaas: hier ligt er eentje verstopt'); }

  const c = world.companion;
  if (c && c.state !== 'dead' && !c.inVehicle) icon('companion', 'companion', c.x, c.y, c.character === 'tammo' ? 'Tammo' : 'Tessa', {}, 'Maat');

  const search = getPoliceSearch(world);
  if (search) {
    const [sx, sy] = toScreen(search.x, search.y);
    drawSearchArea(ctx, sx, sy, search.r * state.scale, t);
  }
  // the running mission's own layer: area, lines and what counts for it (missionmap.js)
  const layer = getMissionLayer(world);
  let layerCap = null;
  if (layer) {
    drawLayerAreas(ctx, layer, toScreen, state.scale, t);
    drawLayerLines(ctx, layer, toScreen, Math.max(3, Math.min(6, 2 + z * 0.5)));
    if (layer.kind !== 'heli') for (const it of selectMapItems(layer, z, { skipDrawn: true })) icon(null, it.kind, it.x, it.y, it.label, {}, it.sub);
    const cap = layerCaption(layer);
    if (cap) layerCap = `${layer.title ? layer.title + ': ' : ''}${cap}`;
  }
  forEachCashTarget(world, (x, y, loot) => icon(null, 'cash', x, y, loot ? 'Geldbuit' : 'Geldwagen'));
  forEachPoliceUnit(world, (x, y, kind) => icon(null, kind, x, y, kind === 'policeHorse' ? 'Bereden politie' : kind === 'policeBike' ? 'Politie op de fiets' : 'Politie'));

  const wp = getUserWaypoint();
  if (wp) {
    // a new goal gets one soft ring (motion spec)
    const g = getGoal();
    if (g !== state.ringGoal) { state.ringGoal = g; state.ringAt = t; }
    const k = (t - state.ringAt) / 0.7;
    if (k < 1 && !document.documentElement.classList.contains('reduce-motion')) {
      const [sx, sy] = toScreen(wp.x, wp.y);
      ctx.beginPath();
      ctx.arc(sx, sy - 8 * ICON, 6 + k * 18, 0, Math.PI * 2);
      ctx.strokeStyle = inkA('greenLight', (0.6 * (1 - k)).toFixed(3));
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    icon(null, 'userWaypoint', wp.x, wp.y, `Waypoint: ${wp.name}`, {}, '{LMB} voor Haal weg · {RMB} of {DELETE} om te wissen', { isGoal: true });
  }

  // de hint bij je eigen plek (#445): waar je staat, ook als je even niet weet waar je bent. #674: met de
  // hoogste titel erbij (alleen je eigen scherm; een gast leest zijn eigen titel, niet die van de opener).
  const ik = jijVan(world);
  const hier = plekHier(ik);
  const teken = loopbaanTeken();
  const mijnTitel = teken ? ` · ${teken.titel}` : '';
  icon(null, 'player', ik.x, ik.y, 'Jij', { angle: ik.angle }, hier ? `Je staat hier · ${hier}${mijnTitel}` : `Je staat hier${mijnTitel}`, { self: true, hier });
  // medespelers (samen spelen, #95): eigen kleur en vorm, naam en status bij de aanwijzer
  for (const p of world.coopPartners || []) if (p.zichtbaar) icon(null, 'partner', p.x, p.y, p.naam, { angle: p.heading, kleur: grijsBijPassief(world.coopPvp, p.slot) ? INK.passiefGrijs : p.kleur, vorm: p.vorm }, p.tekst + (grijsBijPassief(world.coopPvp, p.slot) ? ' · passief' : '')); // passief is grijs zodra er PvP in het spel is (#447)
  for (const m of world.coopPingMarks || []) icon(null, 'partner', m.x, m.y, m.naam ? `${m.naam}: ${m.tekst}` : m.tekst, { angle: 0, kleur: m.kleur, vorm: m.vorm }, 'roep');
  // de voortgangsstrook rechtsboven is van de chip (#463): een pin die daaronder
  // valt is onleesbaar en niet aanwijsbaar en wijkt dus; de belangrijke pins
  // (missie, doel, speler) houden hun plek en liggen boven de strook
  const strook = state.strook;
  const zichtbaar = strook ? queue.filter((q) => !pinWijktVoorStrook(q.sx, q.sy, mapPriority(q.kind), strook)) : queue;
  const geplaatst = capPins(placeIcons(zichtbaar, iconGapPx(sc)), poiRules(z).maxPins);
  const scBasis = sc;
  // onthoud waar de pins staan (wereldcoördinaten, zodat de vaste laag ze bij elke
  // zoom opnieuw naar schermpunten kan omrekenen). #759: alleen de set pins (soort en
  // naam) maakt die laag vuil, niet de positie. In Samen spelen loopt de wereld achter
  // de kaart door (medespelers, politie), dus bewegende pins zouden het bouwen anders
  // elke frame laten terugkomen. Beweegt een pin binnen dezelfde set, dan volgt hooguit
  // 4×/s een herschil, zodat een label niet lang naast een pin blijft staan.
  state.pins = geplaatst.map((q) => [q.x, q.y]);
  state.pinsPosities = geplaatst.map((q) => q.x.toFixed(1) + ',' + q.y.toFixed(1)).join(';');
  state.pinsSleutel = pinSetKey(geplaatst);
  if (state.pinsGebruikt !== state.pinsSleutel) { state.dirty = true; state.pinsDirtyAt = t * 1000; }
  else if (state.pinsPositieGebruikt !== state.pinsPosities && t * 1000 - state.pinsDirtyAt >= PIN_RECOMPOSE_MS) {
    state.dirty = true; state.pinsDirtyAt = t * 1000;
  }
  // je eigen velden liggen bovenop alle andere pins en zijn ver uitgezoomd groter (circa 34 px), zodat je boerderij op de provinciekaart te vinden is (20-11)
  const eigenPin = (q) => q.kind.startsWith('perceel-eigen');
  geplaatst.sort((a, b) => eigenPin(a) - eigenPin(b));
  for (const q of geplaatst) {
    const sc = eigenPin(q) && z < 2 ? scBasis * 1.65 : scBasis;
    drawMapIconHalo(ctx, q.kind, q.sx, q.sy, sc);
    if (q.samen && q.samen.grijs) drawGrijs(ctx, () => drawMapIcon(ctx, q.kind, q.sx, q.sy, sc, { t, ...q.opts, alpha: ((q.opts && q.opts.alpha) ?? mapIconAlpha(q.kind, z)) * 0.6 })); // samen spelen: dit werkt nog niet samen (uitgegrijsd)
    else drawMapIcon(ctx, q.kind, q.sx, q.sy, sc, { t, alpha: mapIconAlpha(q.kind, z), ...q.opts });
    if (q.pick && q.pick.clusterN) drawClusterTelling(ctx, q.sx + 8 * sc, q.sy - 8 * sc, q.pick.clusterN);
    if (q.samen && q.samen.deels) drawDeelsMarkering(ctx, q.sx + 7 * sc, q.sy - 7 * sc, sc);
    if (q.name) hover.push({ sx: q.sx, sy: q.sy, name: q.name, sub: q.sub, tipSub: q.samen ? q.samen.tekst + (q.sub ? ' · ' + q.sub : '') : undefined, x: q.x, y: q.y, kind: q.kind, ...q.pick });
  }
  // #1078 navtarget.js: dezelfde taal als de minikaart. Het doel dat je volgt is een rond icoon met de afstand, wachtende doelen zijn kleine iconen;
  // jouw eigen doel houdt zijn paarse pin en krijgt alleen de afstand. Een klik werkt op de pin eronder (hover blijft bij de pins).
  {
    const careRoute = getCareRoute();
    const nav = resolveNavTargets(snapshotFromWorld(world, { speler: { x: ik.x, y: ik.y }, modus: 'auto', busyGame: gameBusy(world), goal: getGoal(), missieOpKaart: missionOnMap(world), heli: world.heliRunTarget || null, zorg: careRoute && careRoute.target ? { x: careRoute.target.x, y: careRoute.target.y, name: careRoute.target.name } : null }));
    const palet = markerColors(), actieveRoute = getActiveRoute();
    const lijst = nav.alle.map((d) => {
      const [sx, sy] = toScreen(d.x, d.y);
      const actief = d.rol === 'actief';
      return { sx, sy, kleur: navColor(d, palet), icoon: GLYPH[d.glyph] || GLYPH.punt, actief, tekst: actief ? compactDistance(distanceFor(d, actieveRoute)) : '', zonderSchijf: d.type === 'eigen' };
    }).filter((q) => q.sx > -30 && q.sy > -30 && q.sx < state.cw + 30 && q.sy < state.ch + 30);
    // een wachtend eigen doel heeft al zijn pin: geen tweede icoon eroverheen
    drawMapTargets(ctx, lijst.filter((q) => q.actief || !q.zonderSchijf), { s: Math.max(0.8, Math.min(1.25, scBasis / ICON)), t, beweging: !reducedMotion() });
  }
  // het bijschrift van de laag (bv. Treinrit: afstand en richting) boven alle pictogrammen, op een donkere band: de pictogrammen worden hierboven in een rij getekend en lagen er eerst overheen
  if (layerCap) {
    ctx.save();
    ctx.font = 'bold 14px sans-serif';
    const tw = ctx.measureText(layerCap).width + 24;
    ctx.fillStyle = inkA('dark', 0.72);
    ctx.fillRect(state.cw / 2 - tw / 2, 40, tw, 24);
    drawLabel(ctx, layerCap, state.cw / 2, 56, INK.cream, 'center', true);
    ctx.restore();
  }
  state.dynHover = hover;
}

// A GPS line over the whole route, thick enough to read at every
// zoom level; without a road route (boat, off the network) a dashed line
// points straight at the destination instead.
// #985: de statusletter en het woord in het midden van je veld, zodat kleur nooit de enige betekenis is.
function tekenVeldLabel(ctx, v, st, a, c, toScreen) {
  // de label staat bij de hoek met de vlag (het eerste punt), want in het midden liggen vaak je machines
  const mx = a[0] + (c[0] - a[0]) * 0.34, my = a[1] + (c[1] - a[1]) * 0.34;
  const px = 11 * Math.min(1.6, Math.max(1, state.zoom || 1));
  ctx.font = `700 ${px}px 'Bebas Neue', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = inkA('dark', 0.85); ctx.strokeText(st.letter, mx, my);
  ctx.fillStyle = inkA(st.vul, 1); ctx.fillText(st.letter, mx, my);
  tekenVeldBadge(ctx, mx, my - px * 1.35, px * 0.95, v);   // het icoon van de stand, met een ring voor de groei (20-11)
  if (v.statusNaam && (state.zoom || 1) >= 1.2) { ctx.font = `600 ${Math.round(px * 0.8)}px sans-serif`; ctx.strokeText(v.statusNaam, mx, my + px); ctx.fillStyle = inkA('cream', 1); ctx.fillText(v.statusNaam, mx, my + px); }
}

function drawFullRoute(ctx, world, t, route) {
  if (!route) return;
  // #1078: de route die je volgt is dik en vol, de andere routes zijn dun en gedempt (één actief doel, zoals de minikaart)
  const actief = route === getActiveRoute();
  ctx.save();
  if (!actief) ctx.globalAlpha = 0.6;
  drawFullRouteLijn(ctx, world, t, route, actief ? 1.3 : 0.55);
  ctx.restore();
}
function drawFullRouteLijn(ctx, world, t, route, dikte) {
  const ik = jijVan(world);
  const color = ROUTE_COLORS[route.kind] || ROUTE_COLORS.user;
  const width = Math.max(3, Math.min(9, 3 + state.zoom * 0.7)) * dikte;
  const ahead = getRouteAhead(Infinity, route);
  const vaarLuchtlijn = route.noRoute && route.mode === 'boat'; // geen vaarroute: gestippelde luchtlijn
  if (ahead && ahead.length > 1 && !vaarLuchtlijn) {
    const pts = [[ik.x, ik.y], ...ahead].map(([x, y]) => toScreen(x, y));
    drawRoadRoute(ctx, pts, color, width);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([2, 14]);
    ctx.lineDashOffset = -t * 18;
    ctx.lineWidth = Math.max(1.5, width * 0.35);
    ctx.strokeStyle = inkA('white', 0.55);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const tg = route.target;
  if (!tg) return;
  // Geen weg gevonden (of de weg houdt op bij de bebouwde kom): dan geen rechte
  // stippellijn van hier naar het doel, want die loopt dwars door de gevels en de
  // speler leest hem als "hij wil me door dat gebouw heen" (#502). Liever geen
  // lijn met de eerlijke afstand erbij dan een lijn die liegt over de route.
  if ((route.noRoute && !vaarLuchtlijn) || (!vaarLuchtlijn && lineHitsBuilding(state.map, ik.x, ik.y, tg.x, tg.y))) return;
  const [ax, ay] = toScreen(ik.x, ik.y);
  const [bx, by] = toScreen(tg.x, tg.y);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.setLineDash([8, 7]);
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = inkA('dark', 0.8);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

function niceScale(maxPx) {
  const steps = [10, 20, 50, 100, 200, 500, 1000, 2000];
  let best = steps[0];
  for (const s of steps) if (s * state.scale <= maxPx) best = s;
  return best;
}

// De vignette van de kaart in het zeefdruk-pauzemenu (pausemenu.css, .gm): ze zit in het canvas, onder de legenda, de schaalbalk
// en het kompas, en niet als laag van de pagina boven alle kaart-UI. Zo wordt niets van de kaart-UI gedimd.
function drawVignette(ctx) {
  const gm = state.overlay && state.overlay.classList.contains('embedded') && state.overlay.closest('.gm');
  if (!gm) return;
  const w = state.cw, h = state.ch, cx = w * 0.55, cy = h * 0.5;
  const rx = Math.SQRT2 * Math.max(cx, w - cx), ry = Math.SQRT2 * Math.max(cy, h - cy);
  const ink = dsKleur('ink-inkt');
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, ink + '00');
  g.addColorStop(0.55, ink + '00');
  g.addColorStop(1, ink + 'b3');
  ctx.fillStyle = g;
  ctx.fillRect(-cx / rx, -cy / ry, w / rx, h / ry);
  ctx.restore();
}

// Waar de schaalbalk begint: rechts van de bronvermelding (links 12 px + ca. 190 px breed), zodat ze elkaar niet dekken (#1190).
const MAP_SCALE_X = 224;

function drawChrome(ctx) {
  // de legenda van Veroverd staat boven de pins en volledig dekkend (gezet in drawStaticOverlay)
  if (state.legendLaag) tekenLegenda(ctx, state.cw, state.ch, state.legendLaag);
  const x = 22, y = 24;
  ctx.save();
  ctx.translate(state.cw - 30, y + 6);
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fillStyle = inkA('dark', 0.85);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = inkA('greenLight', 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(5, 2);
  ctx.lineTo(0, -1);
  ctx.lineTo(-5, 2);
  ctx.closePath();
  ctx.fillStyle = INK.greenLight;
  ctx.fill();
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK.cream;
  ctx.fillText('N', 0, 9);
  ctx.restore();

  const meters = niceScale(130);
  const w = meters * state.scale;
  const by = state.ch - 18;
  // de schaalbalk staat naast de bronvermelding (.mapview-osm, linksonder), niet erover (#1190)
  const sx = MAP_SCALE_X;
  ctx.save();
  ctx.fillStyle = inkA('dark', 0.75);
  ctx.fillRect(sx - 8, by - 18, w + 60, 26);
  ctx.strokeStyle = INK.cream;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, by - 5);
  ctx.lineTo(sx, by);
  ctx.lineTo(sx + w, by);
  ctx.lineTo(sx + w, by - 5);
  ctx.stroke();
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = INK.cream;
  ctx.fillText(meters >= 1000 ? `${meters / 1000} km` : `${meters} m`, sx + 6 + w, by + 3);
  ctx.restore();
}

// --- search -----------------------------------------------------------------

function buildSearchIndex(world) {
  const entries = [];
  const byName = new Map();
  for (const r of gridItems(world.map.roadGrid)) {
    if (!r.name || r.pts.length < 2) continue;
    let len = 0;
    for (let i = 1; i < r.pts.length; i++) len += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]);
    const cur = byName.get(r.name);
    if (!cur || len > cur.len) byName.set(r.name, { r, len });
  }
  for (const [name, { r }] of byName) {
    const mid = r.pts[Math.floor(r.pts.length / 2)];
    const prev = r.pts[Math.max(0, Math.floor(r.pts.length / 2) - 1)];
    entries.push({ label: name, kind: 'Straat', pri: 2, x: (mid[0] + prev[0]) / 2, y: (mid[1] + prev[1]) / 2, zoom: 7 });
  }
  for (const l of world.map.meta.landmarks || []) entries.push({ label: l.name, kind: 'Bezienswaardigheid', pri: 0, x: l.x, y: l.y, zoom: 6 });
  for (const p of world.map.meta.neighbourhoodPoints || []) entries.push({ label: p.name, kind: 'Wijk', pri: 1, x: p.x, y: p.y, zoom: 4 });
  for (const h of getHorecaForRender() || []) if (h.name && !isAreaHidden(h.x, h.y)) entries.push({ label: h.name, kind: 'Horeca', pri: 3, x: h.x, y: h.y, zoom: 8 });
  for (const g of getGaragesForRender()) if (!isAreaHidden(g.x, g.y)) entries.push({ label: g.name, kind: 'Garage', pri: 4, x: g.x, y: g.y, zoom: 7 });
  for (const h of getHomeForRender()) entries.push({ label: h.name, kind: 'Jullie flat en garage', pri: 0, x: h.x, y: h.y, zoom: 7 });
  for (const h of getHomeMooringForRender(world)) entries.push({ label: h.name, kind: 'Boten thuis', pri: 1, x: h.x, y: h.y, zoom: 8 });
  for (const h of getHomeHelipadForRender()) entries.push({ label: h.name, kind: 'Heli thuis', pri: 1, x: h.x, y: h.y, zoom: 8 });
  for (const sh of getShopsForRender()) if (!isAreaHidden(sh.x, sh.y)) entries.push({ label: sh.name, kind: SHOP_TYPES[sh.type].label, pri: 3, x: sh.x, y: sh.y, zoom: 8 });
  for (const sj of getSideJobSpotsForRender()) { if (isAreaHidden(sj.x, sj.y)) continue; entries.push({ label: sj.job.name, kind: sj.job.kicker || 'Bijbaantje', pri: 1, x: sj.x, y: sj.y, zoom: 8 }); }
  for (const q of getOnderdeelSpotsForRender()) { if (isAreaHidden(q.x, q.y)) continue; entries.push({ label: q.naam, kind: 'Onderdeel', pri: 1, x: q.x, y: q.y, zoom: 8 }); }
  for (const q of getWrakduikSpotsForRender()) { if (q.gedoken || isAreaHidden(q.x, q.y)) continue; entries.push({ label: q.naam, kind: 'Duikplek', pri: 1, x: q.x, y: q.y, zoom: 8 }); }
  for (const q of getStreekuitdagingSpotsForRender()) { if (isAreaHidden(q.x, q.y)) continue; entries.push({ label: q.naam, kind: 'Streekuitdaging', pri: 1, x: q.x, y: q.y, zoom: 8 }); }
  for (const st of getStationsForRender()) entries.push({ label: st.name, kind: 'Treinstation', pri: 0, x: st.x, y: st.y, zoom: 7 });
  // het eerbetoon aan de westgrens (#832, #916): zoek op Beppe of Kollum en de kaart springt erheen, ook in een onontdekte streek
  const beppe = beppeMapSpot();
  if (beppe) entries.push({ label: beppe.name, kind: 'Eerbetoon', pri: 0, x: beppe.x, y: beppe.y, zoom: 8 });
  for (const e of entries) {
    e.norm = normalize(e.label);
    e.compact = e.norm.replace(/ /g, '');
  }
  return entries;
}

const TODO_KIND = { missies: 'Missie', minigames: 'Minigame', diensten: 'Dienst', kantoorklussen: 'Kantoorklus', bijbaantjes: 'Bijbaantje', ommeland: 'Ommeland', nahetverhaal: 'Na het verhaal', verhaal: 'Verhaal' };

// Missions and activities change with progress: indexed per search.
function todoEntries() {
  const out = [];
  for (const it of getTodoItems(state.world)) {
    if (it.dist == null || it.status === 'slot') continue;
    const label = (it.code ? it.code + ' ' : '') + it.title;
    const norm = normalize(label);
    out.push({ label: it.title, kind: it.status === 'klaar' && it.group === 'missies' ? 'Klus' : TODO_KIND[it.group] || 'Te doen', pri: 0, x: it.x, y: it.y, zoom: 6, todo: it.key, icon: it.icon, norm, compact: norm.replace(/ /g, '') });
  }
  return out;
}

function search(q) {
  const n = normalize(q);
  if (!n) return [];
  const res = [];
  for (const e of [...todoEntries(), ...state.searchIndex]) {
    let score;
    if (e.norm.startsWith(n)) score = 0;
    else if ((' ' + e.norm).includes(' ' + n)) score = 1;
    else if (e.norm.includes(n)) score = 2;
    else if (e.compact.includes(n.replace(/ /g, ''))) score = 3;
    else continue;
    res.push({ e, score });
  }
  res.sort((a, b) => a.score - b.score || a.e.pri - b.e.pri || a.e.label.length - b.e.label.length);
  return res.slice(0, 8).map((r) => r.e);
}

function renderResults() {
  const ul = state.results;
  const q = state.searchInput.value;
  state.found = search(q);
  state.sel = state.found.length ? Math.min(state.sel, state.found.length - 1) : -1;
  ul.innerHTML = '';
  if (!q.trim()) { ul.hidden = true; return; }
  if (!state.found.length) {
    ul.innerHTML = '<li class="empty">Niets gevonden</li>';
    ul.hidden = false;
    return;
  }
  state.found.forEach((e, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === state.sel));
    const a = document.createElement('span');
    a.textContent = e.label;
    const b = document.createElement('span');
    b.className = 'kind';
    b.textContent = e.kind;
    li.append(a, b);
    li.addEventListener('click', (ev) => { ev.preventDefault(); chooseResult(e); });
    ul.appendChild(li);
  });
  ul.hidden = false;
}

function chooseResult(e) {
  if (e.todo) {
    centreOn(e.x, e.y, e.zoom);
    state.searchInput.value = '';
    state.results.hidden = true;
    state.searchInput.blur();
    const [sx, sy] = toScreen(e.x, e.y);
    showCard(state.world, { name: e.label, x: e.x, y: e.y, kind: e.icon, todo: e.todo, sx, sy }, sx, sy);
    return;
  }
  // Het zoekresultaat is de plek: geen sprong naar de dichtstbijzijnde weg (die
  // lag tot 120 m verderop). Alleen uit een gebouw stappen, want daar kun je
  // niet staan (#502).
  const [gx, gy] = klikDoel(state.map, e.x, e.y);
  setUserWaypoint(gx, gy, e.label);
  centreOn(gx, gy, e.zoom);
  state.searchInput.value = '';
  state.results.hidden = true;
  state.searchInput.blur();
}

// --- interaction ------------------------------------------------------------

function nearestHover(sx, sy) {
  let best = null, bestD2 = HOVER_PX * HOVER_PX;
  for (const list of [state.dynHover, state.staticHover]) {
    for (const h of list || []) {
      const d2 = (h.sx - sx) ** 2 + (h.sy - sy) ** 2;
      if (d2 < bestD2) { bestD2 = d2; best = h; }
    }
    if (best) return best;
  }
  return null;
}

function streetAt(wx, wy, radiusM) {
  let best = null, bestD2 = radiusM * radiusM;
  for (const r of state.map.roadsNear(wx, wy, radiusM)) {
    if (!r.name) continue;
    const p = r.pts;
    for (let i = 0; i < p.length - 1; i++) {
      const ax = p[i][0], ay = p[i][1], dx = p[i + 1][0] - ax, dy = p[i + 1][1] - ay;
      const l2 = dx * dx + dy * dy;
      let t = l2 > 1e-9 ? ((wx - ax) * dx + (wy - ay) * dy) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d2 = (ax + dx * t - wx) ** 2 + (ay + dy * t - wy) ** 2;
      if (d2 < bestD2) { bestD2 = d2; best = r.name; }
    }
  }
  return best;
}

// #1077: alleen een wijk waar je echt in staat (districtat.js), nooit het dichtstbijzijnde stadspunt buiten de stad.
function wijkAt(wx, wy) {
  const d = districtAt(state.map.meta.neighbourhoodPoints || [], wx, wy);
  return d ? d.name : null;
}

// Waar je staat (#445): de straat, anders de wijk. De kaart staat stil, dus één
// opzoeking per plek volstaat; niet elke beeldtijd opnieuw.
let hierAt = { x: NaN, y: NaN, naam: '' };
function plekHier(p) {
  if (hierAt.x === p.x && hierAt.y === p.y) return hierAt.naam;
  hierAt = { x: p.x, y: p.y, naam: streetAt(p.x, p.y, 40) || wijkAt(p.x, p.y) || '' };
  return hierAt.naam;
}

// Het gebied onder de cursor (#435, #900): altijd het open niveau (de wijk), zodat je
// bij elke zoom hetzelfde gebied opent; de kaartlaag zelf wisselt nog met de zoom.
// De laatste opzoeking wordt bewaard: de kaart staat stil tussen twee muisbewegingen.
let gebiedCache = { x: NaN, y: NaN, scale: 0, r: null };
function gebiedBij(wx, wy) {
  if (!layerOn('veroverd')) return null;
  if (gebiedCache.x === wx && gebiedCache.y === wy && gebiedCache.scale === state.scale) return gebiedCache.r;
  const r = openGebied(kaartLaag().lijst, wx, wy);
  gebiedCache = { x: wx, y: wy, scale: state.scale, r };
  return r;
}

// De regel onder de naam van een gebied: dezelfde woorden als de kaartlaag.
function gebiedSub(r) {
  const soort = r.niveau.enkel;
  const metHoofdletter = soort[0].toUpperCase() + soort.slice(1);
  if (r.voltooid) return `${metHoofdletter} veroverd: alles gedaan (${r.totaal} dingen)`;
  if (r.veroverbaar) return `${metHoofdletter}: ${r.klaar} van ${r.totaal} gedaan`;
  return metHoofdletter;
}

function updateTooltip(sx, sy) {
  const tip = state.tooltip;
  const [wx, wy] = toWorld(sx, sy);
  // #972: een eigen veld heeft geen pin maar wel een hover: de omtrek licht op en de
  // tip noemt het gewas, de grootte en de grond.
  const veld = null;   // een eigen veld heeft geen getekend vlak meer (#1092): de pin is de hover
  const koop = !nearestHover(sx, sy) && !veld ? pickShape(state.koopVelden, wx, wy, 8) : null;
  const koopOffer = koop ? parcelOffer(koop.id) : null;
  const h = nearestHover(sx, sy) || (veld ? { name: veld.naam, sub: veld.sub, x: veld.x, y: veld.y, veld: true } : koopOffer ? { name: koopOffer.name, sub: pointerSub(koopOffer), x: koop.x, y: koop.y, veld: true } : null);
  if ((state.hoverKoopId || null) !== (koop ? koop.id : null)) { state.hoverKoopId = koop ? koop.id : null; state.dirty = true; }
  if ((state.hoverVeldId || null) !== (veld ? veld.id : null)) {
    state.hoverVeldId = veld ? veld.id : null;
    state.dirty = true;
  }
  state.canvas.classList.toggle('pointing', !!h || !!gebiedBij(wx, wy));
  let main = '', sub = '';
  if (h) {
    main = h.name;
    sub = h.tipSub || h.sub || '';
  } else {
    const [wx, wy] = toWorld(sx, sy);
    const gebied = gebiedBij(wx, wy);
    const [minx, miny, maxx, maxy] = state.real;
    const inCity = !(wx < minx || wy < miny || wx > maxx || wy > maxy);
    const spotM = Math.max(6, HOVER_SPOT_PX / state.scale);
    // #887: bij een weg de straatnaam en de plaatsnaam, bij een buurdorp of eiland
    // de naam van dat object, en anders het gebied. Nooit het dichtstbijzijnde
    // Groningse dorp op zee of in een buurprovincie.
    const road = streetAt(wx, wy, spotM);
    const buur = inCity ? null : borderPlaceAt(wx, wy, spotM * 1.4);
    if (road) {
      main = road;
      sub = inCity ? (wijkAt(wx, wy) || 'Groningen') : placeNameAt(wx, wy);
    } else if (gebied) {
      main = gebied.gebied.naam;
      sub = gebiedSub(gebied);
    } else if (buur) {
      main = buur.name;
      sub = regionName(buur.region) || 'Buiten de provincie';
    } else if (!inCity) {
      if (worldPlacesReady() || provinceMapOn()) {
        const a = areaNameAt(wx, wy);
        main = a.name;
        sub = a.sub || (a.region === 'groningen' ? 'Provincie Groningen' : '');
      } else {
        const v = villageLabels(wx - 150, wy - 150, wx + 150, wy + 150).find((q) => Math.hypot(q.x - wx, q.y - wy) < q.r);
        main = v ? v.name : 'Ommeland';
        sub = v ? 'Dorp in het Ommeland' : '';
      }
    } else {
      main = wijkAt(wx, wy) || '';
      sub = main ? 'Wijk' : '';
    }
  }
  if (!main) { tip.style.display = 'none'; return; }
  tip.textContent = main;
  if (sub) {
    const s = document.createElement('span');
    s.className = 'sub';
    s.textContent = sub;
    tip.appendChild(s);
  }
  const z = viewZoom();
  tip.style.left = sx / z + 'px';
  tip.style.top = sy / z + 'px';
  tip.style.display = 'block';
}

// Alleen nog de cheat Overal en nergens (Streken, cheats.js) teleporteert vanaf de
// kaart; het magische snelreizen is geen reisoptie meer (#97): reizen kan zelf
// rijden of meerijden.
function teleportTo(world, target) {
  if (!world.cheatActions) return;
  if (world.coopRole === 'client' && world.coopNet) { world.addMessage(ALLEEN_EIGEN_SPEL, 3); return; } // (#388)
  if (!world.cheatActions.teleport(target.x, target.y, target.name)) return;
  if (state.teleport) setMapTeleport(false);
  if (closeHandler) closeHandler();
  else closeMap();
}

function handleClick(world, sx, sy, shift = false) {
  const h = nearestHover(sx, sy);
  if (h && h.clusterN) { zoomAt(1.8, h.sx, h.sy); return; } // een groep horeca (mapdeclutter.js): inzoomen op die groep, geen plekkaart
  const [wx, wy] = toWorld(sx, sy);
  // #972: een klik op je eigen akker opent hetzelfde kaartje als een plek, met de naam van het veld
  const veld = null;   // idem (#1092)
  const koop = !h && !veld ? pickShape(state.koopVelden, wx, wy, 8) : null;
  // de cheat Overal en nergens, of shift+klik (instelling mapShiftTeleport, kaartteleport.js)
  if (wantsTeleport({ shift, enabled: getSettings().mapShiftTeleport, teleportMode: state.teleport })) {
    if (h && h.teleport) teleportTo(world, h.teleport);
    else teleportTo(world, { x: wx, y: wy, name: plekNaam(veld && veld.naam, streetAt(wx, wy, 60), wijkAt(wx, wy)) });
    return;
  }
  // een klik op het routepunt zelf haalt het weg (#445): de tweede klik wist het
  if (h && h.isGoal && klikActie(getUserWaypoint(), { x: h.x, y: h.y }) === 'weg') { hideCard(); clearUserWaypoint(); return; }
  const stand = !h && !veld && !koop ? pickMarker(state.standMarkers, wx, wy, state.scale) : null;       // Snackimperium (#1102): een standplaats
  if (state.card) { hideCard(); if (!h && !veld && !koop && !stand) return; }
  // je eigen veld: het kaartje van het perceel, met dezelfde acties als een plek
  if (veld) { showCard(world, { name: veld.naam, sub: veld.sub, x: veld.x, y: veld.y, spot: true }, sx, sy); return; }
  // epic Bezit (#1098): een perceel op de kaartlaag Te koop: de perceelkaart met Koop, Doel en Info
  if (koop) { const o = parcelOffer(koop.id); if (o) { showCard(world, { name: o.name, sub: pointerSub(o), x: koop.x, y: koop.y, spot: true, bezit: koop.id }, sx, sy); return; } }
  if (stand) { const r = spotRows().find((q) => q.id === stand.id); if (r) { showCard(world, { name: r.name, sub: pitchTipLine(r), x: r.x, y: r.y, spot: true, standplaats: r.id }, sx, sy); return; } }
  // je eigen plek: een hint waar je staat, geen routepunt naar jezelf
  if (h && h.self) { showCard(world, h, sx, sy); return; }
  // een marker: een kaartje met wat het is en "Zet als doel"
  if (h) { showCard(world, h, sx, sy); return; }
  // een gebied (gemeente, woonplaats, wijk of buurt): overal in het vlak aan te klikken (#435)
  const gebied = gebiedBij(wx, wy);
  if (gebied) {
    showCard(world, { name: gebied.gebied.naam, sub: gebiedSub(gebied), x: gebied.gebied.x, y: gebied.gebied.y }, sx, sy);
    return;
  }
  // Een klik op een plek: het doel is precies die plek (#502). Tot nu toe schoof
  // de kaart de klik naar de dichtstbijzijnde weg zodra die binnen 30 m lag, en
  // stond je routepunt dus naast waar je klikte. Alleen een klik in een gebouw
  // schuift naar de gevel: daar kan niemand staan en de route komt er niet.
  const [x, y] = klikDoel(state.map, wx, wy);
  const name = streetAt(x, y, 40) || wijkAt(x, y) || '';
  // een klik op een plek: eerst kiezen wat je wilt (#445), niet meteen een routepunt
  showCard(world, { name: name || 'Plek op de kaart', sub: wijkAt(x, y) && name !== wijkAt(x, y) ? wijkAt(x, y) : '', x, y, spot: true }, sx, sy);
}

// --- marker card ---------------------------------------------------------------


function cardTodo(world, key) {
  return key ? getTodoItems(world).find((it) => it.key === key) || null : null;
}

// h: a hover entry ({ name, sub, x, y, kind, goal, todo, isGoal, story }).
function showCard(world, h, sx, sy) {
  if (!Number.isFinite(h.x)) {
    const t = h.teleport;
    const [wx, wy] = t ? [t.x, t.y] : toWorld(h.sx, h.sy);
    h = { ...h, x: wx, y: wy };
  }
  const it = cardTodo(world, h.todo);
  // op jezelf klikken: een hint bij je eigen plek, geen acties naar jezelf (#445)
  if (h.self) {
    const el = state.cardEl;
    el.innerHTML = `<span class="mv-ico"><img src="${mapIconUrl('player')}" alt=""></span><div>${hierHtml(h.hier || '')}${sluitHtml()}</div>`;
    el.hidden = false;
    state.card = { h, self: true };
    focusPlekkaart();
    return;
  }
  const goal = getGoal();
  const ik = jijVan(world);
  const d = Math.hypot(h.x - ik.x, h.y - ik.y);
  const pips = it && it.medal != null ? `<span class="mv-pips">${[1, 2, 3].map((m) => `<span class="mv-pip" data-m="${m}"${it.medal >= m ? ' data-on' : ''} title="${MEDALS[m]}">${'BZG'[m - 1]}</span>`).join('')}</span>` : '';
  const meta = [it ? it.meta : h.sub, formatDistance(d), h.isGoal ? 'jouw routepunt' : ''].filter(Boolean).map(escHtml).join(' · ');
  // de actiebalk (#445): Zet routepunt / Reis erheen / Info, met reizen als eigen uitgelegde stap
  const keep = state.card && state.card.h === h ? state.card : null;
  const stap = keep ? keep.stap || null : null;
  const gast = world.coopRole === 'client' && !!world.coopNet;
  const opts = reisOptiesVoor(world, { x: h.x, y: h.y });
  const verhaal = !!(h.story && goal);
  const model = actieModel({ spot: { x: h.x, y: h.y, name: h.name }, speler: ik, waypoint: h.isGoal ? { x: h.x, y: h.y } : getUserWaypoint(), opts, fmt: formatDistance, gast, verhaal });
  let stapHtml = '';
  let popup = null;
  state.reis = null;
  let gekozen = null;
  if (stap === 'reis') {
    const rijen = reisKeuzes(opts, d, { gast });
    const keep0 = keep ? keep.gekozen : null;
    // de keuze die je had, anders de aanbevolen rij, anders de eerste die een route heeft (een rij zonder route is niet te kiezen)
    gekozen = (rijen.find((r) => r.id === keep0 && !r.geenRoute) || rijen.find((r) => r.aanbevolen) || rijen.find((r) => !r.geenRoute) || {}).id || null;
    const kleur = Object.fromEntries(kaartRijen(opts, optieRegel, gekozen).map((r) => [r.id, r.color]));
    // 21-11: de reiskeuze is een eigen popup (reisPopupHtml); de plekkaart groeit niet meer
    const sel = opts.find((o) => o.id === gekozen);
    const prijs = sel ? (sel.price > 0 ? `€ ${sel.price}` : 'gratis') : '';
    const melding = gast ? GAST_REIS_MELDING
      : !gekozen ? 'Er gaat geen vervoer naar deze plek. Zet een routepunt om er zelf heen te gaan.'
      : sel && !sel.afford ? (sel.blokkade || 'Je hebt te weinig geld voor deze rit.') : '';
    popup = { naam: it ? it.title : h.name, afstand: formatDistance(d), rijen, gekozen, kleur, gast, melding,
      reis: gekozen && sel && !gast ? { label: `Reis nu · ${prijs} · ${sel.eta || ''}`.trim(), uitgeschakeld: !sel.afford } : null };
    state.reis = { opts, gekozen, lagen: lijnLagen(opts, gekozen), dest: { x: h.x, y: h.y, name: h.name } };
  } else if (stap === 'info') {
    stapHtml = infoHtml(infoRegels({ spot: { x: h.x, y: h.y, name: it ? it.title : h.name }, sub: it ? it.meta : h.sub, afstand: d, fmt: formatDistance }));
  } else if (keep && keep.melding) stapHtml = `<p class="mv-note">${escHtml(keep.melding)}</p>`;
  const el = state.cardEl;
  el.innerHTML = `<span class="mv-ico">${h.kind ? `<img src="${mapIconUrl(h.kind)}" alt="">` : ''}</span><div><b>${escHtml(it ? (it.code ? it.code + ' · ' : '') + it.title : h.name || 'Plek op de kaart')}</b>` +
    `<small>${meta}</small>${pips || (it && it.record) ? `<span class="mv-rec">${pips}${escHtml(it ? it.record : '')}</span>` : ''}${h.samen ? `<p class="mv-note" data-samen="${escHtml(h.samen.status)}">${escHtml(h.samen.tekst)}</p>` : ''}${actiesHtml(model, stap)}${stapHtml}${h.bezit ? offerCardHtml(parcelOffer(h.bezit), { stap: keep ? keep.bezitStap || null : null, melding: keep ? keep.bezitMelding || '' : '', money: world.money || 0 }) : ''}${h.standplaats ? spotCardHtml(spotRows().find((q) => q.id === h.standplaats), { stap: keep ? keep.bezitStap || null : null, melding: keep ? keep.bezitMelding || '' : '', money: world.money || 0, hasWagon: myMobile().some((m) => m.id === 'frietwagen') }) : ''}` +
    `${sluitHtml()}</div>`;
  el.hidden = false;
  state.card = { h, it, gekozen, stap, model, bezitStap: keep ? keep.bezitStap : null, bezitMelding: keep ? keep.bezitMelding : '' };
  syncReisPopup(popup);
  // eerste focus op de primaire actie (21-11); een popup neemt de focus zelf, en bij een andere keuze in de popup blijft hij waar hij was
  if (!popup) focusPlekkaart(stap === 'info' ? '[data-card="info"]' : null);
}

// Eerste focus van de plekkaart (21-11): de primaire actie (Zet routepunt, of Haal weg / Volg het verhaal), zodat Enter en de A-knop meteen iets doen
// en de D-pad en pijltjes er vanaf lopen. Programmatische focus na een muisklik toont geen ring (focus-visible), dus de muis ziet er niets van.
function focusPlekkaart(sel) {
  const el = state.cardEl && !state.cardEl.hidden ? state.cardEl : null;
  const b = el && (el.querySelector(sel || '.mv-actie') || el.querySelector('[data-card="close"]'));
  if (b) b.focus({ preventScroll: true });
}

// De reispopup (21-11): een eigen venster over de kaart in plaats van een plekkaart die groeit. Een rij per vervoerswijze (reisKeuzes), elke rij
// kiest met kies:, Reis nu (rij) bevestigt; Zelf gaan is geen keuze meer (dat is Zet routepunt). Esc en Terug sluiten naar de plekkaart, Enter bevestigt,
// de focus blijft binnen het venster (kaartToets). Eerste focus: Reis nu, de primaire actie; na een keuze met Enter of een cijfer springt de focus naar Reis nu.
function syncReisPopup(popup) {
  const body = state.overlay && state.overlay.querySelector('.mapview-body');
  if (!body) return;
  const oud = body.querySelector('.mv-reispop');
  if (!popup) { if (oud) oud.remove(); return; }
  const fc = oud && oud.contains(document.activeElement) && document.activeElement.dataset ? document.activeElement.dataset.card : null;
  const naarOk = state.reisFocusOk; state.reisFocusOk = false;
  if (oud) oud.remove();
  body.insertAdjacentHTML('beforeend', reisPopupHtml(popup));
  const pop = body.querySelector('.mv-reispop');
  // bij een andere keuze komt het venster niet opnieuw binnen schuiven
  if (oud) pop.style.animation = 'none', pop.firstElementChild.style.animation = 'none';
  const ok = pop.querySelector('.mv-reispop-ok:not(:disabled)');
  const wens = (naarOk && ok) || (fc && [...pop.querySelectorAll('[data-card]')].find((b) => b.dataset.card === fc && !b.disabled)) || ok || pop.querySelector('.mv-keuze.sel') || pop.querySelector('.mv-reispop-terug');
  if (wens) wens.focus({ preventScroll: true });
}
// Esc en de B-knop (pausemenu.js goBack): eerst de reispopup dicht, terug naar de plekkaart; true als er een openstond.
export function kaartReisPopupSluiten() {
  const pop = state && state.overlay && state.overlay.querySelector('.mv-reispop');
  if (!pop) return false;
  if (state.card) state.card.stap = null;
  if (state.card && state.card.h) showCard(state.world, state.card.h); else pop.remove();
  const terug = state.cardEl && state.cardEl.querySelector('[data-card="reis"]');
  (terug || state.canvas).focus({ preventScroll: true });
  return true;
}
// De laag daaronder (21-11): Esc of B sluit na de uitleg en de popup ook de plekkaart (de kaart blijft open); pas dan gaat de kaart zelf dicht. true als er een plekkaart openstond.
export function kaartPlekkaartSluiten() {
  if (!state || !state.open || !state.card || !state.cardEl || state.cardEl.hidden) return false;
  hideCard();
  state.canvas.focus({ preventScroll: true });
  return true;
}
// Staat er een venster open dat de toetsen voor zichzelf houdt (de reispopup of de eenmalige uitleg)?
export function kaartPopupOpen() {
  return !!(state && state.overlay && state.overlay.querySelector('.mv-reispop, .mv-help'));
}

// Het toetsenpatroon van alle kaartpopups (21-11; docs/KAART-POPUPS-21-11.md, DESIGN_SYSTEM.md "Navigatie met controller en toetsenbord"):
//   Enter of A bevestigt (de focus, of in de reispopup Reis nu), Esc of B gaat een laag terug, pijl omhoog/omlaag of D-pad lopen door de knoppen,
//   links/rechts in de voetknoppen, Home/End naar begin en einde, 1 tot 9 kiest een rij of actie, Tab blijft in een venster, Q/E en [ ] doen
//   in een venster niets (ze zouden het menu onder de kaart wisselen). Pad en toetsenbord sturen dezelfde toetsen (gamepad.js), dus dit is één pad.
const NAAR_MENU = PAGE_SWITCH_KEYS;
function stop(e) { e.preventDefault(); e.stopPropagation(); }
function lijstFocus(lijst, e, wrap) {
  const n = navIndex(lijst.length, lijst.indexOf(document.activeElement), e.key, { wrap, shift: e.shiftKey });
  if (lijst[n]) lijst[n].focus({ preventScroll: true });
}
// pop: de reispopup. true als de toets hier is afgehandeld.
function reisPopupToets(e, pop) {
  const knoppen = [...pop.querySelectorAll('button:not(:disabled)')];
  const doel = e.target && e.target.closest ? e.target.closest('button') : null;
  const op = (doel && pop.contains(doel)) ? doel : null;
  if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
    stop(e);
    const rij = op && op.closest('.mv-keuze');
    if (rij) {
      // een rij: kiezen, en de focus gaat naar Reis nu zodat de volgende Enter bevestigt
      state.reisFocusOk = true;
      cardAction(state.world, rij.dataset.card);
    } else (op || pop.querySelector('.mv-reispop-ok:not(:disabled)') || pop.querySelector('.mv-reispop-terug')).click();
    return true;
  }
  if (e.key === 'Enter' || e.key === ' ') { stop(e); return true; }
  if (e.key === 'Tab' && knoppen.length) { stop(e); lijstFocus(knoppen, e, true); return true; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') { stop(e); lijstFocus(knoppen, e, false); return true; }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    stop(e);
    if (op && op.closest('.mv-help-foot')) lijstFocus([...pop.querySelectorAll('.mv-help-foot button:not(:disabled)')], e, false);
    return true;
  }
  if (rijCijfer(e.key)) {
    const rij = pop.querySelector(`.mv-keuze[data-key="${e.key}"]`);
    stop(e);
    if (rij) { state.reisFocusOk = true; cardAction(state.world, rij.dataset.card); }
    return true;
  }
  if (NAAR_MENU.test(e.key)) { stop(e); return true; }
  return false;
}
// De plekkaart is geen venster (de kaart blijft bedienbaar): de cijfers 1 tot 3 doen de actie, met de focus in de kaart lopen de pijlen langs de knoppen.
function plekkaartToets(e) {
  const kaart = state.cardEl;
  if (!state.card || !kaart || kaart.hidden) return false;
  if (rijCijfer(e.key) && !e.repeat) {
    const b = kaart.querySelector(`.mv-actie[data-key="${e.key}"]`);
    if (!b) return false;
    stop(e);
    b.click();
    return true;
  }
  if (!kaart.contains(document.activeElement)) return false;
  const knoppen = [...kaart.querySelectorAll('button:not(:disabled)')];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') { stop(e); lijstFocus(knoppen, e, false); return true; }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { stop(e); return true; } // de kaart schuift niet terwijl je in de kaartkaart bent; Esc geeft hem terug
  return false;
}
// Eén ingang voor pausemenu.js (dat de toetsen als eerste krijgt) en voor de eigen luisteraar hieronder: true als de toets van een kaartvenster of de plekkaart was.
export function kaartToets(e) {
  if (!state || !state.open || !state.overlay) return false;
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  const t = e.target;
  if (t && (t === state.searchInput || (t.tagName === 'INPUT' && t.type !== 'checkbox'))) return false;
  const uitleg = state.overlay.querySelector('.mv-help');
  if (uitleg) {
    if ((e.key === 'Enter' || e.key === ' ') && kaartUitlegSluiten()) { stop(e); return true; }
    if (e.key === 'Tab' || NAAR_MENU.test(e.key) || e.key.startsWith('Arrow')) { stop(e); return true; }
    return false;
  }
  const pop = state.overlay.querySelector('.mv-reispop');
  if (pop) return reisPopupToets(e, pop);
  return plekkaartToets(e);
}

// De uitleg bij de kaart (#445; de toetsen en knoppen staan in de voetregel van het pauzemenu): de eerste keer open, te sluiten, terug te vinden bij Besturing, Hulp.
// Ook in het geheugen onthouden (21-11): een opslag die niet schrijft (geblokkeerd, ander profiel) bracht de popup steeds terug.
let uitlegGezien = false;
// alleen voor de proefspeler (scripts/qa/kaart_uitleg.page.js): de uitleg weer als nieuw
export function vergeetKaartUitleg() { uitlegGezien = false; }
function kaartGezien() {
  if (uitlegGezien) return true;
  try { return !!parseSeen(localStorage.getItem(KEYS.hudSeen))[UITLEG_ID]; } catch (e) { return false; }
}
function initKaartUitleg(overlay) {
  const st = document.createElement('style');
  st.textContent = KAART_ACTIE_CSS;
  document.head.appendChild(st);
}
// De uitleg past bij je rol (#445): een gast leest er de Samen spelen-regel bij.
// Bij het openen, want of je gast bent kan na het starten veranderen. De uitleg is een
// eenmalige popup over de kaart: één keer, met de focus erop, daarna nooit meer vanzelf.
function syncKaartUitleg(world, opnieuw = false) {
  if (!state.overlay) return;
  const body = state.overlay.querySelector('.mapview-body');
  if (!body) return;
  const gast = !!world && world.coopRole === 'client' && !!world.coopNet;
  const box = state.overlay.querySelector('.mv-help');
  if (box) {
    if ((box.dataset.gast === '1') !== gast) { box.outerHTML = uitlegHtml({ gast }); plaatsWijzers(); }
  } else if (!opnieuw && !kaartGezien()) {
    // UX-audit 23-11 (just-in-time): geen venster over de kaart bij de eerste keer. De uitleg komt pas als je hem nodig hebt:
    // bij de eerste focus op het zoekveld een korte tip eronder. De volledige uitleg blijft achter de Hulp-knop.
    wachtOpZoekTip();
  } else if (opnieuw) {
    // de popup over de kaart (alleen via de Hulp-knop); hij neemt zelf de focus, dus de kaart eronder is even rustig
    body.insertAdjacentHTML('beforeend', uitlegHtml({ gast }));
    const knop = state.overlay.querySelector('.mv-help .mv-help-ok');
    if (knop) knop.focus({ preventScroll: true });
    // de eerste keer is alles rustig (21-11): Lagen dicht, de kaart gedimd; rij 2 wijst naar de knop Lagen
    toggleLegend(false);
    plaatsWijzers();
  }
  // de legenda bovenaan Lagen zegt hetzelfde in het kort (#445)
  const leg = state.overlay.querySelector('.mv-leg-hint');
  if (leg && (leg.dataset.gast === '1') !== gast) leg.outerHTML = legendaHintHtml({ gast });
}
// De tip bij het zoekveld (UX-audit 23-11): één keer, bij de eerste focus, onder het veld; geen focusdief en geen venster. Hij gaat weg
// bij blur of na ZOEKTIP_MS, en daarmee is de uitleg gezien (dezelfde sleutel als de popup).
export const ZOEKTIP = 'Zoek een plek, missie of minigame. Kies een punt op de kaart voor een routepunt of een reis.';
const ZOEKTIP_MS = 8000;
function wachtOpZoekTip() {
  const veld = state.overlay && state.overlay.querySelector('.mapview-search input');
  if (!veld || veld.dataset.tip) return;
  veld.dataset.tip = '1';
  veld.addEventListener('focus', () => {
    if (kaartGezien()) return;
    const zoek = veld.closest('.mapview-search');
    if (!zoek || zoek.querySelector('.mv-zoektip')) return;
    zoek.insertAdjacentHTML('beforeend', `<p class="mv-zoektip ds-zeef ds-z-kaart ds-z-kaart--recht" role="status">${ZOEKTIP}</p>`);
    const weg = () => { const t = zoek.querySelector('.mv-zoektip'); if (t) t.remove(); };
    setTimeout(weg, ZOEKTIP_MS);
    veld.addEventListener('blur', weg, { once: true });
    uitlegGezien = true;
    try { localStorage.setItem(KEYS.hudSeen, JSON.stringify(markSeen(parseSeen(localStorage.getItem(KEYS.hudSeen)), UITLEG_ID))); } catch (e) { /* ignore */ }
  }, { once: true });
}
// De wijzers van de uitleg (21-11): een ring met het cijfer van de rij om het echte onderdeel van de kaart (zoekveld, knop Lagen), geplaatst
// in de eigen laag van de uitleg, dus de kaart eronder verandert niet en de wijzer is geen focusdoel (aria-hidden).
const WIJS_DOEL = { zoek: '.mapview-search', lagen: '.mv-layers' };
let wijsLuistert = false;
function plaatsWijzers() {
  const box = state && state.overlay && state.overlay.querySelector('.mv-help');
  if (!box) return;
  box.querySelectorAll('.ds-uitleg-wijzer').forEach((w) => w.remove());
  const hb = box.getBoundingClientRect();
  const z = viewZoom();
  [...box.querySelectorAll('.ds-uitleg__stap[data-wijs]')].forEach((li) => {
    const doel = state.overlay.querySelector(WIJS_DOEL[li.dataset.wijs] || '.nergens');
    if (!doel || doel.hidden) return;
    const r = doel.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const nr = [...li.parentElement.children].indexOf(li) + 1;
    const w = document.createElement('span');
    w.className = 'ds-uitleg-wijzer';
    w.setAttribute('aria-hidden', 'true');
    w.style.cssText = `left:${Math.round((r.left - hb.left) / z - 4)}px;top:${Math.round((r.top - hb.top) / z - 4)}px;width:${Math.round(r.width / z + 8)}px;height:${Math.round(r.height / z + 8)}px`;
    w.innerHTML = `<span class="ds-uitleg-wijzer__nr">${nr}</span>`;
    box.insertBefore(w, box.firstChild);
  });
  if (!wijsLuistert) {
    wijsLuistert = true;
    window.addEventListener('resize', () => { if (state && state.overlay && state.overlay.querySelector('.mv-help')) plaatsWijzers(); });
  }
}
// Escape en de B-knop van de controller sluiten eerst de uitleg, dan pas de kaart (pausemenu.js goBack): true als er een uitleg openstond.
export function kaartUitlegSluiten() {
  const box = state && state.overlay && state.overlay.querySelector('.mv-help');
  if (!box) return false;
  sluitKaartUitleg(box);
  return true;
}
function sluitKaartUitleg(btn) {
  uitlegGezien = true;
  const box = btn && btn.closest ? btn.closest('.mv-help') : state.overlay && state.overlay.querySelector('.mv-help');
  if (box) box.remove();
  // de focus gaat terug: naar de Hulp-knop als de uitleg daarvan kwam, anders naar het doek (anders valt hij op het niets)
  if (state && state.open) { const hb = state.hulpTerug && state.overlay.querySelector('[data-act="hulp"]'); (hb || state.canvas).focus({ preventScroll: true }); state.hulpTerug = false; }
  try { localStorage.setItem(KEYS.hudSeen, JSON.stringify(markSeen(parseSeen(localStorage.getItem(KEYS.hudSeen)), UITLEG_ID))); } catch (e) { /* ignore */ }
}

// The menu is zoomed with the interface (menu.css): CSS px of the overlay are
// this many screen px.
function viewZoom() {
  const c = state.canvas;
  return c && c.offsetWidth ? (c.getBoundingClientRect().width / c.offsetWidth) || 1 : 1;
}

function layerCount() {
  const rows = LEGEND.flatMap((g) => g.rows).filter((r) => r.layers);
  return [rows.filter((r) => r.layers.some((k) => layerOn(k))).length, rows.length];
}

function syncLayersButton() {
  const n = state.overlay.querySelector('.mv-layers-n');
  if (n) { const [on, all] = layerCount(); n.textContent = `${on}/${all}`; n.parentElement.setAttribute('aria-label', `Lagen: ${on} van ${all} aan`); n.parentElement.title = `Lagen: ${on} van ${all} aan`; }
}

function toggleLegend(open) {
  const lg = state.legendEl || state.overlay.querySelector('.mapview-legend');
  const btn = state.overlay.querySelector('.mv-layers');
  const on = open == null ? lg.hidden : open;
  lg.hidden = !on;
  btn.setAttribute('aria-expanded', String(on));
  syncLayersButton();
}

function hideCard() {
  state.card = null;
  state.reis = null;
  if (state.cardEl) state.cardEl.hidden = true;
  syncReisPopup(null);
}

function cardAction(world, act) {
  const c = state.card;
  if (!c) return;
  if (act.startsWith('kies:') && state.reis) {
    // een andere optie uitlichten: de lijnen op de kaart wisselen mee; een vervoer zonder route (alleen een reden in de rij) valt niet te kiezen
    if (!state.reis.opts.some((o) => o.id === act.slice(5) && o.ride)) return;
    c.gekozen = act.slice(5);
    showCard(world, c.h);
    return;
  }
  if (act === 'reis-sluit') { kaartReisPopupSluiten(); return; }
  if (act.startsWith('bezit-')) { bezitActie(world, c, act); return; }
  if (act.startsWith('sp-')) { standActie(world, c, act); return; }
  if (act === 'reis' || act === 'info') {
    // Reis erheen opent de popup (een gast leest daarin waarom reizen hier niet kan); Info klapt de kaart uit of weer in
    c.stap = act === 'reis' ? 'reis' : (c.stap === act ? null : act);
    c.melding = act === 'reis' && c.model && c.model.acties.some((a) => a.id === 'reis' && a.disabled) ? GAST_REIS_MELDING : null;
    showCard(world, c.h);
    return;
  }
  // Zelf gaan bestaat niet meer als reisoptie (21-11): dat is Zet routepunt ('waypoint' hieronder)
  if (act === 'rij' && state.reis) {
    const { opts, gekozen, dest } = state.reis;
    const o = opts.find((x) => x.id === gekozen);
    hideCard();
    if (!o || !o.ride) return;
    if (!o.afford) { if (o.blokkade && world.addMessage) world.addMessage(o.blokkade, 3); return; } // uitgeschakeld met een reden (ovopties.js taxiBlokkade)
    if (world.coopRole === 'client' && world.coopNet) { world.addMessage(ALLEEN_EIGEN_SPEL, 3); return; } // een rit verplaatst alleen zijn eigen figuur, de wereld is van de ander (#388)
    if (closeHandler) closeHandler();
    else closeMap();
    startMeerijden(world, o, dest);
    return;
  }
  const h = c.h;
  hideCard();
  if (act === 'clear' || act === 'haalweg' || act === 'story') clearGoal();
  else if (act === 'goal' || act === 'waypoint') zetWaypoint(world, c, h);
}

// Bezit (#1098): kopen en verkopen op de perceelkaart, steeds met een bevestiging. Het resultaat staat als melding op de kaart en in het berichtenvak.
function bezitActie(world, c, act) {
  const id = c.h.bezit;
  if (act === 'bezit-koop' || act === 'bezit-verkoop') { c.bezitStap = act === 'bezit-koop' ? 'koop' : 'verkoop'; c.bezitMelding = ''; showCard(world, c.h); return; }
  if (act === 'bezit-annuleer') { c.bezitStap = null; c.bezitMelding = ''; showCard(world, c.h); return; }
  const r = act === 'bezit-ok' ? koopPerceel(world, id) : verkoopPerceel(world, id);
  c.bezitStap = null; c.bezitMelding = r.text || '';
  if (r.ok && world.addMessage) world.addMessage(r.text, 3);
  state.dirty = true;
  showCard(world, c.h);
}

// Snackimperium (#1102): een vergunning kopen, een plek van Us Mem Snacks overnemen of je wagen verplaatsen, steeds met een bevestiging.
function standActie(world, c, act) {
  const id = c.h.standplaats, row = spotRows().find((q) => q.id === id);
  if (act === 'sp-koop') { c.bezitStap = 'koop'; c.bezitMelding = ''; showCard(world, c.h); return; }
  if (act === 'sp-annuleer') { c.bezitStap = null; c.bezitMelding = ''; showCard(world, c.h); return; }
  const r = act === 'sp-zet' ? placeVan(id) : row && row.status === 'usmem' ? acquireRivalSpot(world, id) : koopVergunning(world, id);
  c.bezitStap = null; c.bezitMelding = r.text || '';
  if (r.ok && world.addMessage) world.addMessage(r.text, 3);
  state.dirty = true;
  showCard(world, c.h);
}

// Zet routepunt: een missie of klus wordt jouw doel, een plek wordt het ene routepunt.
function zetWaypoint(world, c, h) {
  const missie = c.it && c.it.goal && (c.it.goal === 'story' || c.it.goal.kind === 'mission');
  if (h.samen && !missie && world.addMessage) world.addMessage(h.samen.tekst, 3); // samen spelen: dit onderdeel werkt nog niet (helemaal) samen; het routepunt wordt wel gezet (bij een missie meldt playMission het)
  if (missie) chooseTodo(world, c.it);
  else if (h.goal) setGoal(h.goal);
  else if (h.spot) setUserWaypoint(h.x, h.y, h.name || '');
  else setGoal({ kind: 'place', name: h.name, sub: h.sub, x: h.x, y: h.y });
}

function canvasPos(e) {
  const r = state.canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

function handleKeys(dt, world) {
  const input = world.input;
  if (document.activeElement === state.searchInput) return;
  if (state.overlay && state.overlay.querySelector('.mv-reispop, .mv-help')) return; // een open popup of uitleg: de pijltjes schuiven de kaart niet
  // met de focus in de plekkaart lopen de pijlen langs haar knoppen (kaartToets); WASD blijft de kaart schuiven
  const pijl = !(state.cardEl && !state.cardEl.hidden && state.cardEl.contains(document.activeElement));
  let px = 0, py = 0;
  if (input.isDown('a') || (pijl && input.isDown('arrowleft'))) px -= 1;
  if (input.isDown('d') || (pijl && input.isDown('arrowright'))) px += 1;
  if (input.isDown('w') || (pijl && input.isDown('arrowup'))) py -= 1;
  if (input.isDown('s') || (pijl && input.isDown('arrowdown'))) py += 1;
  if (px || py) {
    const speed = 700 * dt / state.scale;
    state.cx += px * speed;
    state.cy += py * speed;
    updateTransform();
  }
  if (input.wasPressed(' ')) { const ik = jijVan(world); centreOn(ik.x, ik.y, 3); }
}

// --- lifecycle --------------------------------------------------------------

// "Op de kaart": what the map and the minimap show. Altijd has no switch;
// a row with several layers switches them together (same keys as before,
// mapfilters.js); Diensten and Onderweg start folded.
const LEGEND = [
  { group: 'Altijd', folded: true, rows: [
    { kind: 'player', label: 'Jij', note: 'en wie er met je meerijdt' },
    { kind: 'missionIdle', label: 'Verhaal', dyn: 'story' },
    { kind: 'userWaypoint', label: 'Jouw routepunt', dyn: 'goal', note: 'een klik erop of Haal weg haalt het weg' },
    { kind: 'route', label: 'Route', note: 'dik en geel: wat je volgt (verhaal of missie); paars gestreept: jouw eigen doel; puntjes: klus; streep-punt: opknappen of repareren; dunne lijnen wachten' },
    { kind: 'navdoel', label: 'Doel dat je volgt', note: 'een rond icoon met de afstand; kleine ronde iconen wachten (geel verhaal, paars jouw doel, oranje klus, roze opknappen)' },
  ] },
  { group: 'Te doen', rows: [
    { kind: 'padel', label: 'Minigames', note: 'padel, carbid, botsauto\'s, driftzones, discgolf, pitch & putt, penalty’s, voetbal, skatepark, karten, zwemmen, klimmen, waterskiën, vlieglessen, duiven, ballonjacht', layers: ['padel', 'duif', 'heli', ...ACTIVITY_LEGEND.map((l) => l.layer).filter((l) => l !== 'safehuis')] },
    { kind: 'sj-taxi', label: 'Bijbaantjes', note: 'start bij de baas', layers: ['bijbaan', 'rondvaarttour'] },
    { kind: 'missionIdle', label: 'Klussen', note: 'gespeelde missies, om opnieuw te spelen', layers: ['klussen'] },
    { kind: 'dorp', label: 'Ommeland', note: 'dorpsuitjes waar je in de buurt was, gevonden wereldeinden', layers: ['ommeland'] },
    { kind: 'perceel-koop', label: 'Percelen', note: 'akkers en weilanden: geel te koop, blauw te huur, groen van jou (met omtrek en hover); klik voor een doel', layers: ['percelen'] },
    { kind: 'perceel-koop', label: 'Te koop', note: 'percelen in de provincie: blauw met streeplijn en prijs is te koop, groen is van jou, een andere kleur van een medespeler, grijs met een slot is niet te koop; klik voor de perceelkaart met Koop', layers: ['tekoop'] },
    { kind: 'perceel-koop', label: 'Standplaatsen', note: 'plekken voor de snackwagen: blauwe cirkel is vrij, groene schijf is van jou, rode ruit is van Us Mem Snacks, een vierkant in een andere kleur is van een medespeler; klik voor het kaartje met de vergunning', layers: ['standplaats'] },
    { kind: 'perceel-eigen-rijp', label: 'Je velden', note: 'een letter per stand: B braak, S stoppel, P geploegd, Z zaailing, G groeit, O oogstklaar (groen met een vlag: dat is je doel; geel: het gewas groeit); T is een machine van jou, A een afnemer van je oogst', layers: ['percelen'] },
    { kind: 'perceel-eigen-rijp', label: 'Alleen oogstklaar', note: 'filter op Je velden: alleen wat nu te oogsten valt blijft staan, plus je machines en de afnemers; uit is alles zichtbaar', layers: ['oogstklaarAlleen'] },
    { kind: 'pg-jelle', label: 'Na het verhaal', note: 'Jelle\'s uitdagingen en de snackwagen', layers: ['postgame'] },
  ] },
  { group: 'Diensten', folded: true, rows: [
    { kind: 'home', label: 'Thuis', note: 'flat, garage, steiger en helidek', layers: ['home', 'homeGarage'] },
    { kind: 'own', label: 'Jouw voertuigen', note: 'auto, fiets, e-step, boot, heli', layers: ['car'] },
    { kind: 'garage', label: 'Garage en pomp', note: 'repareren, spuiten, opvoeren, wrakken', layers: ['garage'] },
    { kind: 'hospital', label: 'Ziekenhuis en huisarts', layers: ['zorg'] },
    { kind: 'politiebureau', label: 'Politiebureau', layers: ['politiebureau'] },
    { kind: 'police', label: 'Politie-eenheid', note: 'de dichtstbijzijnde eenheden in beeld; de sterren staan linksboven op de kaart (alleen als je gezocht wordt), en de rand van de kaart pulseert rood en blauw tijdens een achtervolging' },
    { kind: 'horeca', label: 'Horeca', layers: ['horeca'] },
    { kind: 'betreedbaar', label: 'Betreedbaar', note: 'winkels, cafés, kantoren en andere panden waar je door de deur naar binnen kunt lopen (zoom in)', layers: ['betreedbaar'] },
    { kind: 'shop-kleding', label: 'Winkels', note: 'kleding, kapper, loten, krant, super, snacks', layers: ['shops'] },
    { kind: 'shop-fietsen', label: 'Voertuigwinkels', note: 'fietsen, auto\'s, tuning, boten, heli\'s', layers: ['shopsVoertuigen'] },
    { kind: 'shop-wapens', label: 'Wapens & pandjeshuis', layers: ['shopsWapens'] },
    { kind: 'station', label: 'Treinstation', note: 'reizen met de trein, een treindienst rijden', layers: ['trein'] },
    { kind: 'ov-halte', label: 'Bushalte', note: 'een busdienst starten', layers: ['trein'] },
    { kind: 'livebus', label: 'Live bus', note: 'een echte bus op zijn echte plek, met lijn en richting; uit te zetten in Instellingen' },
    { kind: 'roosterbus', label: 'Rooster', note: 'de terugval: een bus uit het rooster van het spel, alleen als er geen live gegevens zijn' },
  ] },
  { group: 'Onderweg', folded: true, rows: [
    { kind: 'companion', label: 'Maat', layers: ['companion'] },
    { kind: 'flitspaal', label: 'Flitspaal', layers: ['flitspaal'] },
    { kind: 'landmark', label: 'Bezienswaardigheid', layers: ['landmark'] },
    { kind: 'uitkijkpunt', label: 'Uitkijkpunten', note: 'één per streek: uitzicht en een herkenningspunt onderweg', layers: ['uitkijkpunt'] },
    { kind: 'act-safehuis', label: 'Safehouse', note: 'een huisje om te kopen of te krijgen in elk gebied dat je kunt veroveren: slapen, kleren, garage, onderduiken', layers: ['safehuis'] },
    { kind: 'veroverd', label: 'Veroverd', note: 'wijken, plaatsen en streken die je aan het doen bent (de kleur loopt mee) of helemaal gedaan hebt (een vlag)', layers: ['veroverd'] },
    { kind: 'text-street', label: 'Straatnamen', layers: ['streets'] },
    { kind: 'text-wijk', label: 'Wijknamen (oranje met driehoek: \'s nachts opletten)', layers: ['wijken'] },
    { kind: 'buildings', label: 'Gebouwen', layers: ['buildings'] },
  ] },
];

function drawLegendIcon(ctx, kind) {
  if (kind === 'route') {
    drawRoadRoute(ctx, [[3, 16], [11, 10], [21, 12]], ROUTE_COLORS.user, 3);
    drawRoadRoute(ctx, [[3, 21], [21, 19]], ROUTE_COLORS.mission, 5);
    drawRoadRoute(ctx, [[3, 6], [12, 4], [21, 6]], ROUTE_COLORS.care, 2);
  } else if (kind === 'navdoel') {
    drawMapTargets(ctx, [{ sx: 12, sy: 11, kleur: ROUTE_COLORS.mission, icoon: GLYPH.ster, actief: true, tekst: '' }], { s: 0.5, beweging: false });
  } else if (kind === 'userWaypoint') {
    drawMapIcon(ctx, 'userWaypoint', 12, 20, ICON, { t: 0 });
  } else if (kind === 'text-street' || kind === 'text-wijk') {
    ctx.font = `${kind === 'text-wijk' ? 11 : 13}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = kind === 'text-wijk' ? inkA('cream', 0.6) : INK.cream;
    ctx.fillText(kind === 'text-wijk' ? 'WIJK' : 'Abc', 12, 13);
  } else if (kind === 'veroverd') {
    tekenLegendeVlag(ctx);
  } else if (kind === 'betreedbaar') {
    drawDoorBadge(ctx, 12, 12, 1.5);
  } else if (kind === 'buildings') {
    ctx.fillStyle = MAP_STYLE.building;
    ctx.fillRect(5, 6, 8, 7);
    ctx.fillRect(14, 9, 6, 10);
    ctx.fillRect(4, 15, 8, 5);
  } else {
    drawMapIconHalo(ctx, kind, 12, 12, ICON);
    drawMapIcon(ctx, kind, 12, 12, ICON, { t: 0 });
  }
}

function buildLegend(root) {
  const dpr = window.devicePixelRatio || 1;
  // de uitleg bovenaan (#445), met de Samen spelen-regel voor een gast; bij het
  // openen van de kaart volgt syncKaartUitleg je rol
  root.innerHTML = '<h3>Op de kaart</h3>' + legendaHintHtml({ gast: !!(state.world && state.world.coopRole === 'client' && state.world.coopNet) }) + '<div class="mv-legend-body"></div>';
  const body = root.querySelector('.mv-legend-body');
  state.legendDyn = {};
  for (const g of LEGEND) {
    const box = document.createElement('div');
    box.className = 'mv-grp';
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'mv-grp-head';
    head.setAttribute('aria-expanded', String(!g.folded));
    head.innerHTML = `<span>${g.group}</span><span aria-hidden="true">${g.folded ? '+' : '–'}</span>`;
    const list = document.createElement('ul');
    list.hidden = !!g.folded;
    head.addEventListener('click', () => {
      list.hidden = !list.hidden;
      head.setAttribute('aria-expanded', String(!list.hidden));
      head.lastElementChild.textContent = list.hidden ? '+' : '–';
    });
    for (const row of g.rows) {
      const li = document.createElement('li');
      const cv = document.createElement('canvas');
      cv.width = cv.height = 30 * dpr;
      const ctx = cv.getContext('2d');
      // icons are drawn on a 24 px grid, shown at 30 px
      ctx.setTransform(dpr * 1.25, 0, 0, dpr * 1.25, 0, 0);
      drawLegendIcon(ctx, row.kind);
      // the colour-blind palettes change the route and marker colours
      onPaletteChange(() => { ctx.clearRect(0, 0, 24, 24); drawLegendIcon(ctx, row.kind); state.dirty = true; });
      const span = document.createElement('span');
      span.textContent = row.label;
      const n = document.createElement('span');
      n.className = 'note';
      // the explanation sits in the tooltip: the legend stays a short list of icon and name
      n.textContent = row.dyn ? row.note || '' : '';
      if (row.dyn) span.append(document.createElement('br'), n);
      if (row.dyn) { state.legendDyn[row.dyn] = n; if (row.note) li.title = row.note; }
      else if (row.note && !row.layers) li.title = row.note;
      if (row.kind === 'companion') state.legendMaat = span.firstChild;
      li.append(cv, span);
      if (row.layers) {
        li.setAttribute('role', 'switch');
        li.tabIndex = 0;
        const on = () => row.layers.some((k) => layerOn(k));
        li.setAttribute('aria-checked', String(on()));
        li.title = (row.note ? row.note + '. ' : '') + 'Klik om aan of uit te zetten (kaart en minimap)';
        const sw = document.createElement('span');
        sw.className = 'chk';
        sw.setAttribute('aria-hidden', 'true');
        li.appendChild(sw);
        const toggle = () => {
          const v = !on();
          for (const k of row.layers) setLayer(k, v);
          li.setAttribute('aria-checked', String(v));
          syncLayersButton();
        };
        li.addEventListener('click', toggle);
        li.addEventListener('keydown', (e) => {
          if (e.target !== li || (e.key !== 'Enter' && e.key !== ' ')) return;
          e.preventDefault();
          e.stopPropagation();
          toggle();
        });
      } else {
        const a = document.createElement('span');
        a.className = 'always';
        a.textContent = 'altijd';
        li.appendChild(a);
      }
      list.appendChild(li);
    }
    box.append(head, list);
    body.appendChild(box);
  }
}

function refreshLegend(world) {
  const d = state.legendDyn || {};
  const g = getGoal();
  if (d.goal) d.goal.textContent = g ? [g.name, g.sub].filter(Boolean).join(' · ') : '';
  if (d.story) d.story.textContent = world.storyGuide ? world.storyGuide.name : world.storyFreePlay ? 'het verhaal is uit' : '';
}

// The map's travel mode (Lopen, Fiets, Auto, Boot, OV, Lucht): it opens on how
// you travel now; the roads that are for you stand out and the others step back.
// A mode without a note gets no line (#594: no "niet voor jou"-dash any more).
const MODE_NOTE = {
  fiets: 'Fietspaden lichten op.',
  auto: 'Doorgaande wegen.',
  boot: 'Vaarwater en bruggen.',
  ov: 'Spoor en stations.',
  lucht: 'Oriëntatiepunten.',
};
function setMode(m) {
  if (!MODES.includes(m)) return;
  state.mode = m;
  if (state.modeNote) {
    const note = MODE_NOTE[m] || '';
    state.modeNote.textContent = note;
    state.modeNote.hidden = !note;
  }
  if (state.avoidBtn) state.avoidBtn.hidden = m !== 'auto';
  clearTiles();
  state.dirty = true;
}

function openMap(world) {
  ensureCountryEdge(world.map);
  setMode(travelModeOf(world));
  // #899: de buurt waar je staat heb je altijd gezien, ook als de tracker nog niet liep
  // (het eerste beeld, of een QA-start): die blijft helder op de kaart.
  try { bezoekPlek(world); } catch (e) { /* zonder wereld of indeling: geen bezoek */ }
  state.open = true;
  setMapOpenState(true);
  state.overlay.classList.add('open');
  sizeCanvas();
  // #899: de grenzen kunnen later binnenkomen dan de kaart; haal de ontdekking dan op.
  // Wat je sinds de vorige keer op de kaart ontdekte, gloeit nu zacht uit.
  initDiscovery(world);
  if (discovery) refreshDiscovery(true);
  state.cam = null;
  preloadProvinceMap(); // #1191: de grovere lagen staan klaar als invaller, geen mozaïek van 160 m
  ensureLevel0();
  state.dirty = true;
  syncKaartUitleg(world);
  const c = world.companion;
  if (state.legendMaat) state.legendMaat.textContent = c ? `Maat (${c.character === 'tammo' ? 'Tammo' : 'Tessa'})` : 'Maat';
  refreshLegend(world);
  syncLayersButton();
  setHeaderEyebrow();
  // #990: een streek die je ontdekte terwijl de kaart dicht was, gaat nu open
  if (discovery) startNextReveal();
}

// De kop van de kaart: de teller van de streken en het deel van Grunn dat je zag.
function setHeaderEyebrow() {
  const eb = state.overlay.querySelector('.mv-eb');
  if (!eb) return;
  const seen = getDiscoveredRatio();
  const chip = strekenChip();
  const delen = [chip, seen >= 0.01 ? `${Math.round(seen * 100)}% van Grunn verkend` : ''].filter(Boolean);
  eb.hidden = !delen.length;
  // 20-11: één compacte chip met icoon en getal; de volle zin staat in de aria-label en de tooltip
  const vol = delen.join(' · ');
  const kort = seen >= 0.01 ? `${Math.round(seen * 100)}%` : (chip || '');
  eb.innerHTML = `${icoon('kaart', { maat: 'm' })} <span>${kort}</span>`;
  eb.title = vol; eb.setAttribute('aria-label', vol);
}

// Streken > Overal en nergens: the next click (or A under the crosshair)
// teleports instead of setting a goal; closing the map ends it.
export function setMapTeleport(on) {
  if (!state) return;
  state.teleport = !!on;
  state.overlay.classList.toggle('teleporting', state.teleport);
  state.tpEl.hidden = !state.teleport;
}

function closeMap() {
  followViewTiles(true);
  setMapTeleport(false);
  hideCard();
  state.open = false;
  setMapOpenState(false);
  setRoutePrefs({ planMode: null });
  state.overlay.classList.remove('open');
  state.tooltip.style.display = 'none';
  state.drag = null;
  state.canvas.classList.remove('dragging');
  state.searchInput.blur();
  state.results.hidden = true;
}

function updateHeader() {
  const route = getActiveRoute();
  const wp = getUserWaypoint();
  state.clearBtn.hidden = !wp;
  let html = '';
  if (route) {
    // the primary route first, then the others; the care route can be dismissed
    const all = [route, ...getRoutes().filter((r) => r !== route).reverse()];
    html = all.map((r) => `<span class="${r.kind}">${routeLabel(r)}: ${formatDistance(r.remaining)}${r.kind === 'care' ? '<button type="button" data-act="care-off" title="Roze route verbergen">Negeren</button>' : ''}${r.target && r.target.pg ? '<button type="button" data-act="pg-next" title="Route naar de volgende uitdaging">Volgende</button><button type="button" data-act="pg-off" title="Automatische route uitzetten">Uit</button>' : ''}</span>`).join('');
  }
  // after the story the automatic route to the next challenge can be off: one button turns it back on
  const w = state.world;
  const pg = w && w.postgame && w.postgameActions && w.postgameActions.guide;
  if (pg && pg.isOff()) html += '<span class="pg">Route naar uitdagingen: uit<button type="button" data-act="pg-on" title="Automatische route weer aanzetten">Aan</button></span>';
  if (html !== state.routeHtml) {
    state.routeHtml = html;
    state.routeEl.innerHTML = html;
  }
}

// Zoomed in over the province, the tiles under the view stream in (and stay
// while they are looked at): their vectors take over from the base map's
// coarsest pixels, so the map is as sharp there as in the city.
const viewTiles = { keys: new Set(), n: -1, at: 0 };
const VIEW_TILES_MAX_M = 6000;
function followViewTiles(release) {
  const store = state.map.store;
  if (!store || !provinceMapOn()) return;
  const now = performance.now();
  if (!release && now - viewTiles.at < 350) return;
  viewTiles.at = now;
  let want = [];
  if (!release && state.zoom >= MID_ZOOM) {
    const [x0, y0, x1, y1] = viewRect();
    if (x1 - x0 <= VIEW_TILES_MAX_M) want = store.keysAround((x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) / 2);
  }
  const next = new Set(want);
  for (const k of viewTiles.keys) if (!next.has(k)) store.unpin(k);
  // De kaart is dicht of laat alle tegels los: lopende tegel-loads van de kaart mogen stoppen (#588).
  // 'map' is het token van dit scherm alleen; de beloften zijn al afgevangen.
  if (!next.size && store.cancel) store.cancel('map');
  for (const k of next) if (!viewTiles.keys.has(k)) { store.pin(k); store.request(k, { priority: -500, token: 'map' }).catch(() => {}); }
  viewTiles.keys = next;
  const n = state.map.resident ? state.map.resident.size : 0;
  if (n !== viewTiles.n) {
    const first = viewTiles.n < 0;
    viewTiles.n = n;
    if (!first && next.size) clearTiles();
  }
}

function render(world) {
  const t0 = performance.now();
  state.frame++;
  followViewTiles(false);
  // #899: tijdens de fade van een net ontdekte buurt blijft de kaart opnieuw tekenen,
  // ook als er verder niets vuil is.
  if (state.dirty || performance.now() < (state.revealUntil || 0)) compose();
  const { ctx } = state;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
  ctx.drawImage(state.compose, 0, 0);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  drawDynamicMarkers(ctx, world);
  drawVignette(ctx);
  drawChrome(ctx);
  updateHeader();
  if (state.frame % 20 === 0) refreshLegend(world);
  const ms = performance.now() - t0;
  const perf = state.perf;
  perf.frameMs = ms;
  perf.maxMs = Math.max(perf.maxMs, ms);
  perf.avgMs = perf.avgMs * 0.95 + ms * 0.05;
}

export function initMapView(world) {
  if (state) return;
  injectStyles();

  const overlay = document.createElement('div');
  overlay.className = 'mapview-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Kaart van Groningen');
  overlay.innerHTML =
    '<div class="mapview-header"><div class="mv-hl"><span class="m-eb mv-eb" hidden></span><h1 class="mapview-title m-h1">Kaart</h1>' +
    '<label class="mapview-search m-inp">' + icoon('zoek') + '<input type="search" data-osk="zoek" data-osk-chips="missie|minigame|winkel" placeholder="Zoek een plek, missie of minigame" aria-label="Zoek een plek, missie of minigame" autocomplete="off" spellcheck="false">' + oskKnop('de kaart') + '' +
    '<ul class="mapview-results" role="listbox" hidden></ul></label></div>' +
    '<div class="mv-hr">' +
    '<button type="button" class="m-bg mv-layers" data-act="layers" aria-expanded="false" aria-controls="mv-legend" aria-label="Lagen" title="Lagen">' + icoon('lagen', { maat: 'm' }) + ' Lagen <span class="mv-layers-n"></span></button>' +
    '<button type="button" class="m-bg mv-close" data-act="close" style="display:none">Sluiten</button></div></div>' +
    '<div class="mapview-body"><canvas class="mapview-canvas"></canvas>' +
    '<div class="mapview-zoom"><button type="button" class="m-bg" data-act="in" aria-label="Inzoomen">' + icoon('plus') + '</button><button type="button" class="m-bg" data-act="out" aria-label="Uitzoomen">' + icoon('min') + '</button><button type="button" class="m-bg" data-act="centre" aria-label="Naar jezelf">' + icoon('doel') + '</button><button type="button" class="m-bg" data-act="hulp" aria-label="Uitleg bij de kaart" title="Uitleg bij de kaart">' + icoon('vraag') + '</button></div>' +
    '<div class="mv-goal"><span class="m-eb">Je route</span><span class="mapview-route"></span><button type="button" class="m-bt" data-act="clear" hidden>Haal routepunt weg</button><button type="button" class="m-bt" data-act="avoid" aria-pressed="false" hidden>Snelwegen vermijden</button></div>' +
    '<div class="mapview-osm">© OpenStreetMap-bijdragers</div>' +
    '<div class="mapview-tp" hidden>Kies een plek: daar sta je meteen · ' + keyTextHtml('{ESC}') + ' stopt</div><div class="mapview-tooltip"></div><div class="mapview-card" hidden></div><div class="mv-naamkaart" hidden aria-live="polite"></div><aside class="mapview-legend" id="mv-legend" hidden></aside></div>';
  document.body.appendChild(overlay);
  initKaartUitleg(overlay);

  const compose = document.createElement('canvas');
  state = {
    open: false,
    world,
    map: world.map,
    real: world.map.meta.bounds,
    bounds: world.map.meta.bounds.map((v, i) => {
      const q = v + (i < 2 ? -COUNTRY_MARGIN : COUNTRY_MARGIN);
      // the whole province when its tiles are on (provincemap.js)
      const pb = provinceMapBounds();
      return pb ? (i < 2 ? Math.min(q, pb[i]) : Math.max(q, pb[i])) : q;
    }),
    overlay,
    canvas: overlay.querySelector('canvas'),
    tooltip: overlay.querySelector('.mapview-tooltip'),
    searchInput: overlay.querySelector('.mapview-search input'),
    results: overlay.querySelector('.mapview-results'),
    clearBtn: overlay.querySelector('[data-act="clear"]'),
    routeEl: overlay.querySelector('.mapview-route'),
    routeHtml: null,
    compose,
    composeCtx: compose.getContext('2d'),
    tiles: new Map(),
    textWidths: new Map(),
    pool: [],
    baseScale: 0,
    tileDpr: 0,
    zoom: 1,
    cx: null,
    cy: null,
    scale: 1,
    ox: 0,
    oy: 0,
    cw: 1,
    ch: 1,
    dpr: window.devicePixelRatio || 1,
    dirty: true,
    frame: 0,
    staticHover: [],
    dynHover: [],
    // de pins van de dynamische laag en de voortgangsstrook (#463): de vaste
    // laag legt haar labels daaromheen
    pins: [],
    pinsSleutel: '',
    pinsGebruikt: '',
    strook: null,
    pinsPosities: '',        // #759: positie-sleutel van de pins, om bewegen te herkennen
    pinsPositieGebruikt: '', // de positie-sleutel waarmee de vaste laag is opgebouwd
    pinsDirtyAt: 0,          // ms: wanneer de pins voor het laatst een herschil vroegen
    drag: null,
    reveals: [],            // #990: ontdekte streken waarvan de onthulling nog moet spelen
    opening: null,          // #990: de mist die nu openrijdt
    cam: null,              // #990: de camera naar het ontdekte gebied
    naamEl: overlay.querySelector('.mv-naamkaart'),
    naamTimer: 0,
    found: [],
    sel: -1,
    legendMaat: null,
    revealUntil: 0,          // #899: tot wanneer de fade van net ontdekte buurten loopt
    perf: { composeMs: 0, frameMs: 0, avgMs: 0, maxMs: 0 },
  };
  state.ctx = state.canvas.getContext('2d');
  state.tpEl = overlay.querySelector('.mapview-tp');
  state.cardEl = overlay.querySelector('.mapview-card');
  state.cardEl.addEventListener('mousedown', (e) => e.stopPropagation());
  state.cardEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-card]');
    if (!b) return;
    if (b.dataset.card === 'close') hideCard();
    else cardAction(world, b.dataset.card);
    if (state.open && !state.card) state.canvas.focus({ preventScroll: true });
  });
  state.canvas.tabIndex = -1;
  // a controller has no pointer: A picks what is under this crosshair (a11y.css shows it)
  const reticle = document.createElement('div');
  reticle.className = 'map-pad-reticle';
  reticle.innerHTML = icoon('doel');
  state.canvas.parentElement.appendChild(reticle);
  state.searchIndex = buildSearchIndex(world);
  initDiscovery(world);
  buildLegend(overlay.querySelector('.mapview-legend'));
  state.avoidBtn = overlay.querySelector('[data-act="avoid"]');
  state.modeNote = document.createElement('p');
  state.modeNote.className = 'hint mv-modenote';
  overlay.querySelector('.mapview-legend').prepend(state.modeNote);
  setMode('lopen');
  onSettingsChange((s, key) => { if (key === 'showFog') state.dirty = true; });
  // #825: een streek of stempel erbij vraagt meteen een nieuw beeld van de vaste laag
  onExplorationChange(() => { if (state) state.dirty = true; });
  // #990: een nieuwe streek komt in de wachtrij van de onthulling (speelt zodra de kaart open is)
  onStreekOntdekt((ev) => queueDiscovery(ev));

  overlay.addEventListener('mousedown', (e) => e.stopPropagation());

  overlay.addEventListener('click', (e) => {
    // de eenmalige uitleg gaat ook weg als je ernaast klikt, niet alleen op Begrepen
    const uitleg = state.overlay && state.overlay.querySelector('.mv-help');
    if (uitleg && e.target === uitleg) { sluitKaartUitleg(uitleg); return; }
    // de reispopup (21-11): zijn knoppen dragen data-card, een klik naast het venster is Terug
    const pop = state.overlay && state.overlay.querySelector('.mv-reispop');
    if (pop) {
      if (e.target === pop) { kaartReisPopupSluiten(); return; }
      const pk = e.target.closest('.mv-reispop [data-card]');
      if (pk) { cardAction(world, pk.dataset.card); return; }
    }
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'avoid') {
      const on = !getRoutePrefs().avoidMotorways;
      setRoutePrefs({ avoidMotorways: on });
      btn.setAttribute('aria-pressed', String(on));
    } else if (act === 'centre') { const ik = jijVan(world); centreOn(ik.x, ik.y, 3); }
    else if (act === 'layers') toggleLegend();
    else if (act === 'close') { if (closeHandler) closeHandler(); else closeMap(); } // no Esc on a touchscreen
    else if (act === 'clear') clearUserWaypoint();
    else if (act === 'uitleg-sluit') sluitKaartUitleg(btn);
    else if (act === 'hulp') { hideCard(); state.hulpTerug = true; syncKaartUitleg(world, true); } // de Hulp-knop (21-11): dezelfde uitleg als de eerste keer, op elk moment
    else if (act === 'care-off') dismissCareRoute();
    else if ((act === 'pg-next' || act === 'pg-off' || act === 'pg-on') && world.postgameActions) {
      const g = world.postgameActions.guide;
      world.addMessage(act === 'pg-next' ? g.next() : act === 'pg-on' ? g.on() : g.off(), 3);
    }
    else if (act === 'in') zoomAt(1.6, state.cw / 2, state.ch / 2);
    else if (act === 'out') zoomAt(1 / 1.6, state.cw / 2, state.ch / 2);
  });

  const si = state.searchInput;
  for (const type of ['keydown', 'keyup', 'keypress']) {
    si.addEventListener(type, (e) => {
      e.stopPropagation();
      if (type !== 'keydown') return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!state.found.length) return;
        state.sel = (state.sel + (e.key === 'ArrowDown' ? 1 : -1) + state.found.length) % state.found.length;
        renderResults();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const pick = state.found[Math.max(0, state.sel)];
        if (pick) chooseResult(pick);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (si.value) { si.value = ''; renderResults(); } else si.blur();
      }
    });
  }
  si.addEventListener('input', () => { state.sel = 0; renderResults(); });
  si.addEventListener('focus', () => { world.input.reset(); si.select(); renderResults(); });
  si.addEventListener('blur', () => { state.results.hidden = true; });

  const cv = state.canvas;
  cv.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (document.activeElement === si) si.blur();
    const [sx, sy] = canvasPos(e);
    state.drag = { sx, sy, cx: state.cx, cy: state.cy, moved: false };
    state.cam = null; // #990: zelf pannen neemt de camera van de onthulling over
  });
  window.addEventListener('mousemove', (e) => {
    if (!state.open) return;
    const [sx, sy] = canvasPos(e);
    const d = state.drag;
    // released outside the window (no mouseup arrives): stop dragging instead
    // of leaving the map glued to the cursor
    if (d && !(e.buttons & 1)) { endDrag(); return; }
    if (d) {
      if (!d.moved && Math.hypot(sx - d.sx, sy - d.sy) > DRAG_PX) {
        d.moved = true;
        hideCard();
        cv.classList.add('dragging');
        state.tooltip.style.display = 'none';
      }
      if (d.moved) {
        state.cx = d.cx - (sx - d.sx) / state.scale;
        state.cy = d.cy - (sy - d.sy) / state.scale;
        updateTransform();
      }
      return;
    }
    if (e.target === cv) updateTooltip(sx, sy);
  });
  const endDrag = () => {
    state.drag = null;
    cv.classList.remove('dragging');
  };
  window.addEventListener('blur', endDrag);
  document.addEventListener('visibilitychange', () => { if (document.hidden) endDrag(); });
  // capture phase: the pause menu stops mouseup from bubbling to window
  window.addEventListener('mouseup', (e) => {
    const d = state.drag;
    if (!d || e.button !== 0) return;
    endDrag();
    if (!d.moved && state.open) {
      const [sx, sy] = canvasPos(e);
      handleClick(world, sx, sy, e.shiftKey);
    }
  }, true);
  // a touchscreen sends no mouse events while dragging: one finger pans,
  // two fingers pinch (a tap still arrives as a mouse click)
  const fingers = new Map();
  const fingerPts = () => [...fingers.values()];
  cv.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (cv.setPointerCapture) { try { cv.setPointerCapture(e.pointerId); } catch (err) { /* gone already */ } }
    if (fingers.size === 2) { state.drag = null; cv.classList.remove('dragging'); }
  });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch' || !fingers.has(e.pointerId) || !state.open) return;
    const prev = fingerPts();
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const cur = fingerPts();
    const r = cv.getBoundingClientRect();
    if (cur.length === 1) {
      const dx = cur[0].x - prev[0].x, dy = cur[0].y - prev[0].y;
      if (!state.touchPan && Math.hypot(dx, dy) < 1) return;
      state.touchPan = true;
      hideCard();
      state.cx -= dx / state.scale;
      state.cy -= dy / state.scale;
      updateTransform();
    } else if (cur.length === 2) {
      const { factor, mid } = pinchStep(prev, cur);
      zoomAt(factor, mid.x - r.left, mid.y - r.top);
    }
  });
  const fingerUp = (e) => {
    if (!fingers.delete(e.pointerId)) return;
    if (!fingers.size) setTimeout(() => { state.touchPan = false; }, 0);
  };
  cv.addEventListener('pointerup', fingerUp);
  cv.addEventListener('pointercancel', fingerUp);
  cv.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!state.open || !getUserWaypoint()) return;
    clearUserWaypoint();
    const [sx, sy] = canvasPos(e);
    updateTooltip(sx, sy);
  });
  cv.addEventListener('mouseleave', () => { state.tooltip.style.display = 'none'; });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const [sx, sy] = canvasPos(e);
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(Math.exp(-dy * 0.0018), sx, sy);
    state.tooltip.style.display = 'none';
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (!state.open || e.target === si) return;
    // de uitleg en de reispopup zijn van het toetsenbord (21-11): Enter bevestigt, Tab blijft binnen, Esc loopt via pausemenu.js goBack
    if (kaartToets(e)) return;
    // Enter on the map itself (a controller's A): click under the crosshair
    if (e.key === 'Enter' && !e.defaultPrevented && !(e.target && e.target.closest && e.target.closest('button, input, a, select, .mapview-card'))) {
      e.preventDefault();
      handleClick(world, state.cw / 2, state.ch / 2);
      const b = state.card && state.cardEl.querySelector('button');
      if (b) b.focus({ preventScroll: true });
      else state.canvas.focus({ preventScroll: true });
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      clearUserWaypoint();
      return;
    }
    const zin = e.key === '+' || e.key === '=' || e.code === 'NumpadAdd';
    const zout = e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract';
    if (!zin && !zout) return;
    e.preventDefault();
    zoomAt(zin ? 1.35 : 1 / 1.35, state.cw / 2, state.ch / 2);
  });

  const resize = () => {
    if (!state.open) return;
    sizeCanvas();
    ensureLevel0();
  };
  window.addEventListener('resize', resize);
  // the pause menu lays the canvas out after it opens (sheet, zoomed header,
  // fonts), so its box changes without a window resize: a stale backing store
  // would be stretched into the new box and squash the map
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => {
      const r = state.canvas.getBoundingClientRect();
      const d = state.dpr || 1;
      if (Math.round(r.width * d) !== state.canvas.width || Math.round(r.height * d) !== state.canvas.height) resize();
    }).observe(state.canvas);
  }
}

export { isMapOpen } from './pausestate.js';

let closeHandler = null;

export function setMapCloseHandler(fn) {
  closeHandler = fn;
}

// Re-parents the map UI into a host element (the pause menu's Kaart panel).
export function mountMapView(host) {
  if (!state || !host) return;
  state.overlay.classList.add('embedded');
  host.appendChild(state.overlay);
}

export function setMapActive(world, on) {
  if (!state || on === state.open) return;
  if (on) {
    openMap(world);
    // de legenda en de laagschakelaars staan de eerste keer open (#435); daarna opent
    // de kaart rustig en haalt de knop Lagen ze erbij (#602)
    // behalve als de eerste-keer-uitleg openstaat (21-11): dan blijft Lagen dicht en wijst de uitleg naar de knop
    const uitlegOpen = !!state.overlay.querySelector('.mv-help');
    if (!state.legendGezien && !uitlegOpen) { state.legendGezien = true; toggleLegend(true); }
    else { state.legendGezien = true; toggleLegend(false); }
    if (uitlegOpen) plaatsWijzers();
    const ik = jijVan(world);
    centreOn(ik.x, ik.y, 2);
    // staat de eenmalige uitleg open, dan houdt zijn knop de focus (21-11): met de focus op het doek deed Enter niets of klikte onder het richtkruis
    const uitlegKnop = state.overlay.querySelector('.mv-help .mv-help-ok');
    (uitlegKnop || state.canvas).focus({ preventScroll: true });
  } else closeMap();
}

export function getMapViewStats() {
  if (!state) return null;
  return { ...state.perf, zoom: state.zoom, tiles: state.tiles.size, level: levelFor(state.zoom) };
}
sfxLinks.mapStats = getMapViewStats; // sfx/ui.js (latehooks.js)

export function setMapView(x, y, zoom) {
  if (!state) return;
  if (zoom) state.zoom = zoom;
  centreOn(x, y);
}

export function updateMapView(dt, world) {
  if (!state) return;
  updateRouting(dt, world);
  if (!state.open) return;
  if (syncMapPhase(world) !== state.phase) { state.phase = syncMapPhase(world); clearTiles(); }
  handleKeys(dt, world);
  tickReveal(performance.now()); // #990: camera en opening van een nieuwe streek
  // #661: stilstaand (gepauzeerd) en niets vuil: 15 Hz is genoeg; bewegen of
  // invoer tekent gewoon elke frame.
  const now = performance.now();
  if (mapRenderDue(now, state.lastRender || 0, !!world.paused, !!state.dirty)) { state.lastRender = now; render(world); }
}
