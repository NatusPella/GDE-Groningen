import { setMapOpenState } from './pausestate.js';
import { sfxLinks } from './latehooks.js';
import { onPaletteChange } from './a11y.js';
import { pinchStep } from './touchlogic.js';
import { MODES, roadAllowed, travelModeOf } from './roadaccess.js';
import { forEachCashTarget } from './cashvan.js';
import { facilitiesOf } from './facilities.js';
import { mapIconScale, mapKindVisible, placeIcons, iconGapPx, mapIconAlpha } from './mapicons.js';
import { drawMapIcon, drawMapIconHalo, drawRoute, drawRoadRoute, forEachPoliceUnit, declutter, ROUTE_COLORS, routeLabel, drawSearchArea, getPoliceSearch, missionMapKind } from './hud_panel.js';
import { getGaragesForRender } from './garages.js';
import { getHomeForRender, getHomeGarageForRender, getHomeMooringForRender, getHomeHelipadForRender } from './home.js';
import { layerOn, setLayer as storeLayer } from './mapfilters.js';
import { tekenVeroverd, tekenLegenda, tekenLegendeVlag } from './gebiedenkaart.js';
import { getHorecaForRender } from './horeca.js';
import { getShopsForRender, getShopsDecluttered, storyTargetShop, drawStoryShopRing } from './shops.js';
import { SHOP_TYPES } from './shopdata.js';
import { getOwnedVehiclesForMap } from './ownedvehicles.js';
import { getPigeonSpotsForRender } from './pigeonspots.js';
import { getHeliSpotsForRender, getHeliRunMarks } from './helirun.js';
import { getPadelSpotsForRender } from './padel.js';
import { activityMapIcons, ACTIVITY_LEGEND } from './activities.js';
import { getPostgameSpotsForRender } from './postgame.js';
import { getStationsForRender } from './stationtravel.js';
import { reisOptiesVoor, tekenLijnen, lijnLagen } from './reiskaart.js';
import { kaartRijen } from './ovkaart.js';
import { actieModel, reisKeuzes, infoRegels, GAST_REIS_MELDING, UITLEG_ID } from './kaartactie.js';
import { actiesHtml, reisHtml, infoHtml, uitlegHtml, hintHtml, KAART_ACTIE_CSS } from './kaartactieui.js';
import { markSeen, parseSeen } from './hudtext.js';
import { optieRegel } from './ovopties.js';
import { startMeerijden } from './reisrit.js';
import { VILLAGES } from './ommelandlines.js';
import { ommelandMapSpots } from './ommelandmap.js';
import { getSideJobSpotsForRender } from './sidejobs.js';
import { getEierbalTips } from './furniture.js';
import { drawRailsOnMap } from './railway.js';
import { drawCountryBase, drawCountryDetail, villageLabels, syncMapPhase, MAP_STYLE } from './countrymap.js';
import { drawProvinceBase, provinceMapOn, provinceMapBounds, onProvinceMapLoad } from './provincemap.js';
import { ROAD_ORDER, ZOOM, EMPHASIS, INK, inkA, inkCss, roadWidthPx, layersAtZoom, modeLook, baseFilter } from './mapstyle.js';
import { drawSea, drawOutside, regionLabels, regionEdgeLabels, areaNameAt, regionBorderColor } from './regions.js';
import { borderPlaceLabels } from './borderplaces.js';
import { worldPlaceLabels, worldPlacesReady } from './worldplaces.js';
import { tileIndexOf, tileOrigin, TILE_M } from './gdt.js';
import { ensureCountryEdge } from './countryplan.js';
import { getSettings, onSettingsChange } from './settings.js';
import { wantsTeleport, plekNaam } from './kaartteleport.js';
import { ALLEEN_EIGEN_SPEL } from './coopgast.js';
import { DEV } from './devflags.js';
import { getGoal, setGoal, clearGoal, missionOnMap } from './goal.js';
import { getMissionLayer } from './missionmaplive.js';
import { selectMapItems } from './missionmap.js';
import { drawLayerAreas, drawLayerLines, layerCaption } from './missionmapdraw.js';
import { getTodoItems, chooseTodo, mapIconUrl } from './todo.js';
import { getMissionList } from './missionquery.js';
import { MEDALS, setStatMax } from './achievements.js';
import { nicknameOf, FLAVOUR_MAP_PLACES } from './flavourlines.js';
import {
  updateRouting, getActiveRoute, getRouteAhead, getRoutes, dismissCareRoute, setUserWaypoint, clearUserWaypoint, getUserWaypoint, formatDistance, setRoutePrefs, getRoutePrefs,
} from './routing.js';
import { KEYS } from './storagekeys.js';
import { warnsOn, riskWhy } from './muggingrules.js';

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
const MID_ZOOM = ZOOM.mid;
const NEAR_ZOOM = ZOOM.near;
const DRAG_PX = 4;
const HOVER_PX = 12;
const FOG_CELL = 50;
const FOG_REVEAL = 2;
const FOG_KEY = KEYS.fog;
const FOG_FEATHER = 16; // cells

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
    .mapview-overlay.embedded .mapview-title, .mapview-overlay.embedded .mapview-footer { display: none; }
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
    .mapview-results .kind { color: ink(greenLight); font-size: 13px; }
    .mapview-results .empty { color: ink(cream 0.6); cursor: default; }
    .mapview-btn {
      font: inherit; font-size: 15px; letter-spacing: 1px; white-space: nowrap;
      color: ink(dark); background: ink(green); border: none; border-radius: 4px;
      padding: 6px 12px; cursor: pointer;
    }
    .mapview-btn:hover { background: ink(greenLight); }
    .mapview-btn.ghost { color: ink(cream); background: transparent; border: 1px solid ink(greenLight 0.6); }
    .mapview-btn.ghost:hover { border-color: ink(greenLight); color: ink(greenLight); }
    .mapview-btn[hidden] { display: none; }
    .mapview-btn:focus-visible { outline: 3px solid ink(cream); outline-offset: 2px; }
    .mapview-route { margin-left: auto; font-size: 16px; color: ink(cream); white-space: nowrap; }
    .mapview-route .user { color: var(--mk-user, ${ROUTE_COLORS.user}); }
    .mapview-route .mission { color: var(--mk-mission, ${ROUTE_COLORS.mission}); }
    .mapview-route .job { color: var(--mk-job, ${ROUTE_COLORS.job}); }
    .mapview-route .care { color: var(--mk-care, ${ROUTE_COLORS.care}); }
    .mapview-route > span + span { margin-left: 14px; }
    .mapview-route button { margin-left: 6px; padding: 0 6px; font: inherit; font-size: 13px; color: inherit; background: transparent; border: 1px solid currentColor; border-radius: 3px; cursor: pointer; }
    .mapview-footer {
      padding: 6px 14px;
      font: 13px 'Arial Narrow', Arial, sans-serif;
      letter-spacing: 0.3px;
      color: ink(cream 0.75);
      border-top: 1px solid ink(greenLight 0.35);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .mapview-footer b { color: ink(greenLight); font-weight: normal; }
    .mapview-body { position: relative; flex: 1; min-height: 0; display: flex; }
    .mapview-canvas {
      flex: 1; min-width: 0; height: 100%; display: block;
      pointer-events: auto; cursor: crosshair; touch-action: none;
    }
    .mapview-canvas.dragging { cursor: grabbing; }
    .mapview-canvas.pointing { cursor: pointer; }
    .mapview-zoom {
      position: absolute; left: 12px; bottom: 44px;
      display: flex; flex-direction: column; gap: 4px; pointer-events: auto;
    }
    .mapview-zoom button {
      width: 30px; height: 30px; font: bold 20px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif;
      color: ink(greenLight); background: ink(dark 0.85);
      border: 1px solid ink(greenLight 0.6); border-radius: 4px; cursor: pointer; line-height: 1;
    }
    .mapview-zoom button:hover { border-color: ink(greenLight); background: ink(greenDark); }
    .mapview-osm {
      position: absolute; left: 12px; bottom: 12px; pointer-events: none;
      padding: 2px 8px; border-radius: 3px; background: ink(dark 0.7);
      font: 12px 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.2px; color: ink(cream 0.7);
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
      border-radius: 4px; padding: 3px 8px; font-size: 14px; letter-spacing: 0.3px; color: ink(textBright);
      transform: translate(12px, -50%); white-space: nowrap; display: none;
    }
    .mapview-tooltip .sub { color: ink(greenLight); margin-left: 6px; }
    .mapview-legend {
      flex: 0 0 auto; width: 280px; margin: 12px 12px 12px 0; padding: 12px;
      align-self: flex-start; max-height: calc(100% - 24px); overflow-y: auto; box-sizing: border-box;
      display: flex; flex-direction: column; gap: 8px;
      background: ink(dark 0.8);
      border: 1px solid ink(greenLight 0.35); border-radius: 4px; pointer-events: auto;
    }
    .mapview-legend h3 { margin: 0 2px; font-size: 24px; font-weight: normal; letter-spacing: 1px; color: ink(greenLight); }
    .mapview-legend .hint { margin: 0 2px; font: 13px 'Arial Narrow', Arial, sans-serif; color: ink(cream 0.6); }
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
    .mapview-legend .always { font: 12px 'Arial Narrow', Arial, sans-serif; color: ink(cream 0.55); }
    .mapview-legend canvas { width: 30px; height: 30px; }
    .mapview-legend .note { color: ink(cream 0.6); font: 12px 'Arial Narrow', Arial, sans-serif; }
    .mapview-legend .note:empty { display: none; }
    .mapview-legend .always { display: none; }
    .mapview-card {
      position: absolute; z-index: 3; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; width: 360px; max-width: calc(100% - 16px); box-sizing: border-box;
      padding: 12px; border-radius: 12px; background: ink(panelDeep 0.94); border: 1px solid ink(greenLight 0.45); box-shadow: 0 10px 30px ink(black 0.5);
      pointer-events: auto; animation: mv-card-in var(--dur-slow, 320ms) var(--ease-out, ease-out);
    }
    .mapview-card[hidden] { display: none; }
    @keyframes mv-card-in { from { opacity: 0; transform: translateX(-10px); } }
    .mapview-card .mv-ico { width: 52px; height: 52px; border-radius: 10px; display: grid; place-items: center; background: ink(panelCard); border: 1px solid ink(greenLight 0.16); }
    .mapview-card .mv-ico img { width: 36px; height: 36px; }
    .mapview-card > div { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .mapview-card b { font-weight: normal; font-size: 22px; letter-spacing: 1px; line-height: 1.05; }
    .mapview-card small, .mapview-card .mv-rec { font: 13px 'Arial Narrow', Arial, sans-serif; color: ink(cream 0.65); letter-spacing: 0.2px; }
    .mapview-card .mv-reis { display: flex; flex-direction: column; gap: 3px; margin: 4px 0; }
    .mapview-card .mv-reisrij { text-align: left; font: 13px Arial, sans-serif; color: ink(cream); background: ink(white 0.05); border: 0; border-radius: 4px; padding: 5px 8px; cursor: pointer; }
    .mapview-card .mv-reisrij.sel { background: ink(selected 0.22); }
    .mapview-card .mv-reisrij[aria-disabled] { opacity: 0.55; }
    .mapview-card .mv-rec { display: flex; align-items: center; gap: 8px; }
    .mapview-card .mv-pips { display: inline-flex; gap: 4px; }
    .mapview-card .mv-pip { display: inline-grid; place-items: center; width: 18px; height: 18px; box-sizing: border-box; border-radius: 50%; border: 1.5px solid; font: 12px 'Bebas Neue', sans-serif; padding-top: 1px; }
    .mapview-card .mv-pip[data-m="1"] { color: ink(medalBronze); } .mapview-card .mv-pip[data-m="2"] { color: ink(medalSilver); } .mapview-card .mv-pip[data-m="3"] { color: ink(yellow); }
    .mapview-card .mv-pip[data-on] { color: ink(dark); border-color: transparent; }
    .mapview-card .mv-pip[data-m="1"][data-on] { background: ink(medalBronze); } .mapview-card .mv-pip[data-m="2"][data-on] { background: ink(medalSilver); } .mapview-card .mv-pip[data-m="3"][data-on] { background: ink(yellow); }
    .mapview-card .mv-btns { display: flex; gap: 6px; margin-top: 4px; }
    @media (max-width: 900px) { .mapview-footer { display: none; } }
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

// --- fog of war -------------------------------------------------------------

function initFog(world) {
  const [minx, miny, maxx, maxy] = world.map.meta.bounds;
  const w = Math.ceil((maxx - minx) / FOG_CELL), h = Math.ceil((maxy - miny) / FOG_CELL);
  const bits = new Uint8Array(Math.ceil((w * h) / 8));
  try {
    const raw = localStorage.getItem(FOG_KEY);
    const m = raw && /^(\d+)x(\d+):(.*)$/.exec(raw);
    if (m && +m[1] === w && +m[2] === h) {
      const bin = atob(m[3]);
      for (let i = 0; i < Math.min(bin.length, bits.length); i++) bits[i] = bin.charCodeAt(i);
    }
  } catch (e) { /* ignore */ }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const fctx = canvas.getContext('2d');
  const img = fctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    img.data[i * 4] = 12;
    img.data[i * 4 + 1] = 20;
    img.data[i * 4 + 2] = 14;
    // the unexplored tint fades out smoothly over the outer ~800 m of the
    // map, so zoomed out it never reads as a dark square against the Ommelanden
    const cx = i % w, cy = (i - cx) / w;
    const edge = Math.min(1, (Math.min(cx, cy, w - 1 - cx, h - 1 - cy) + 0.5) / FOG_FEATHER);
    img.data[i * 4 + 3] = bits[i >> 3] & (1 << (i & 7)) ? 0 : Math.round(130 * edge * edge * (3 - 2 * edge));
  }
  fctx.putImageData(img, 0, 0);
  state.fog = { w, h, minx, miny, bits, canvas, fctx, img, cell: -1, saveAt: 0, dirtySave: false };
  window.addEventListener('beforeunload', saveFog);
}

function saveFog() {
  const f = state && state.fog;
  if (!f || !f.dirtySave) return;
  f.dirtySave = false;
  try {
    let bin = '';
    for (let i = 0; i < f.bits.length; i++) bin += String.fromCharCode(f.bits[i]);
    localStorage.setItem(FOG_KEY, `${f.w}x${f.h}:${btoa(bin)}`);
  } catch (e) { /* ignore */ }
  // de prestaties 'kaart verkend' (#435): het percentage dat je ooit hebt gezien
  try { setStatMax(null, 'kaartVerkend', Math.round(getDiscoveredRatio() * 100)); } catch (e) { /* prestaties nog niet klaar */ }
}

function updateFog(world) {
  const f = state.fog;
  const cx = Math.floor((world.player.x - f.minx) / FOG_CELL), cy = Math.floor((world.player.y - f.miny) / FOG_CELL);
  const key = cy * f.w + cx;
  if (key !== f.cell) {
    f.cell = key;
    let changed = false;
    for (let dy = -FOG_REVEAL; dy <= FOG_REVEAL; dy++) {
      for (let dx = -FOG_REVEAL; dx <= FOG_REVEAL; dx++) {
        if (dx * dx + dy * dy > FOG_REVEAL * FOG_REVEAL + 0.5) continue;
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= f.w || y >= f.h) continue;
        const i = y * f.w + x;
        if (f.bits[i >> 3] & (1 << (i & 7))) continue;
        f.bits[i >> 3] |= 1 << (i & 7);
        f.img.data[i * 4 + 3] = 0;
        changed = true;
      }
    }
    if (changed) {
      f.fctx.putImageData(f.img, 0, 0);
      f.dirtySave = true;
      state.dirty = true;
    }
  }
  const now = performance.now();
  if (f.dirtySave && now > f.saveAt) {
    f.saveAt = now + 3000;
    saveFog();
  }
}

export function getDiscoveredRatio() {
  const f = state && state.fog;
  if (!f) return 0;
  let n = 0;
  for (let i = 0; i < f.w * f.h; i++) if (f.bits[i >> 3] & (1 << (i & 7))) n++;
  return n / (f.w * f.h);
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

// as far out as the whole province fits (else the villages round town)
function minZoom() {
  if (provinceMapOn() && state.baseScale) {
    const [x0, y0, x1, y1] = state.bounds;
    return Math.min(state.cw / (x1 - x0), state.ch / (y1 - y0)) * 0.98 / state.baseScale;
  }
  return MIN_ZOOM;
}

function updateTransform() {
  const [minx, miny, maxx, maxy] = state.bounds;
  state.zoom = Math.max(minZoom(), Math.min(MAX_ZOOM, state.zoom));
  state.cx = Math.max(minx, Math.min(maxx, state.cx));
  state.cy = Math.max(miny, Math.min(maxy, state.cy));
  state.scale = state.baseScale * state.zoom;
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
    // "niet voor jou": a trunk road you may not walk or cycle on, red and dashed
    if (allowed === false && r.cat === 'major') {
      c.setLineDash([px(6), px(4)]);
      c.strokeStyle = EMPHASIS.forbidden;
      c.lineWidth = px(Math.max(1.4, wpx * 0.5));
      c.stroke();
      c.setLineDash([]);
    }
  }
  drawCountryDetail(c, wx0, wy0, wx0 + tws, wy0 + tws, cssPerM, MAP_STYLE);
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
    done++;
  }
  evictTiles(keep);
  return done === missing.length;
}

// The last complete tile layer and the view it was drawn for. While the
// tiles of a new zoom step or view are still being rendered it is drawn
// underneath, moved and scaled to the current view, so zooming never shows
// bare meadow or a coarse overview where detail was a moment ago.
function keepLastGood() {
  let g = state.lastGood;
  if (!g) g = state.lastGood = { canvas: document.createElement('canvas') };
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

function drawLabel(ctx, text, x, y, color, align) {
  ctx.textAlign = align;
  ctx.lineWidth = 3;
  ctx.strokeStyle = inkA('dark', 0.85);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
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

function drawStreetNames(ctx, boxes) {
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
    if (collides(boxes, box)) continue;
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
  const names = layersAtZoom(z).labels; // which names show at this zoom (mapstyle.js)
  const onScreen = (sx, sy, m = 20) => sx > -m && sy > -m && sx < state.cw + m && sy < state.ch + m;

  // gebieden veroveren (#414): wat je gedaan hebt kleurt mee, een veroverd gebied krijgt een vlag
  if (layerOn('veroverd')) {
    const laagId = tekenVeroverd(ctx, toScreen, state.scale, state.cw, state.ch, hover, drawLabel, inkA('cream', 0.9));
    tekenLegenda(ctx, state.cw, state.ch, laagId, inkA('cream', 0.92));
  }

  if (layerOn('landmark')) {
    ctx.font = '14px ' + FONT;
    ctx.textBaseline = 'middle';
    for (const l of state.map.meta.landmarks || []) {
      const [sx, sy] = toScreen(l.x, l.y);
      if (!onScreen(sx, sy, 120)) continue;
      const w = ctx.measureText(l.name).width;
      boxes.push([sx - 7, sy - 8, sx + 11 + w, sy + 8]);
      const nick = nicknameOf(l.name);
      hover.push({ sx, sy, name: l.name, sub: nick ? `Bezienswaardigheid · ${nick}` : 'Bezienswaardigheid', teleport: { x: l.x, y: l.y, name: l.name } });
    }
  }

  // region names (Friesland, Drenthe, Duitsland, the seas) under the places
  if (provinceMapOn() && names.regions) {
    const [rx0, ry0, rx1, ry1] = viewRect();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const named = new Set();
    // (the right edge is pulled in by 8%: a clamped name at the bottom right would sit under the zoom buttons)
    for (const r of regionLabels(rx0, ry0, rx1 - (rx1 - rx0) * 0.08, ry1, 0.1)) {
      if (r.id === 'groningen' && !names.cityRegion) continue;
      const [sx, sy] = toScreen(r.x, r.y);
      const size = Math.round(r.big ? 30 : r.land ? 28 : 24);
      ctx.font = `${size}px ${FONT}`;
      const label = r.name.toUpperCase().split('').join(' ');
      const w = ctx.measureText(label).width;
      const a = names.regionAlpha;
      if (r.land && r.id !== 'groningen') { ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = inkA('dark', 0.8); ctx.strokeText(label, sx, sy); }
      ctx.fillStyle = r.land ? (r.id === 'groningen' ? inkA('cream', a.toFixed(2)) : regionBorderColor(r.id)) : inkA('seaLabel', (a + 0.1).toFixed(2));
      ctx.fillText(label, sx, sy);
      boxes.push([sx - w / 2, sy - size / 2, sx + w / 2, sy + size / 2]);
      named.add(r.id);
    }
    // the regions beyond the border or the coast that are in view but have no name on screen yet (#237):
    // the name sits outside the line, kept off the frame so nothing is clipped
    const m = 110 / state.scale;
    for (const r of regionEdgeLabels(rx0 + m, ry0 + m, rx1 - m, ry1 - m, 34 / state.scale)) {
      if (named.has(r.id)) continue;
      const [sx, sy] = toScreen(r.x, r.y);
      ctx.font = `18px ${FONT}`;
      const label = r.name.toUpperCase().split('').join(' ');
      const w = ctx.measureText(label).width;
      const box = [sx - w / 2, sy - 10, sx + w / 2, sy + 10];
      if (collides(boxes, box)) continue;
      boxes.push(box);
      // de naam van een buurgebied in de kleur van zijn grens, goed leesbaar (#435)
      ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = inkA('dark', 0.8);
      ctx.strokeText(label, sx, sy);
      ctx.fillStyle = r.land ? regionBorderColor(r.id) : inkA('seaLabel', 0.7);
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
        if (v.rank >= 5 && v.x > cx0 && v.x < cx1 && v.y > cy0 && v.y < cy1) continue;
        const [sx, sy] = toScreen(v.x, v.y);
        const big = v.rank <= 1;
        ctx.font = `${big ? 16 : names.placePx}px ${FONT}`;
        const label = v.name.toUpperCase();
        const w = ctx.measureText(label).width;
        const box = [sx - w / 2 - 2, sy - 8, sx + w / 2 + 2, sy + 8];
        if (collides(boxes, box)) continue;
        boxes.push(box);
        drawLabel(ctx, label, sx, sy, big ? INK.paper : inkA('cream', 0.82), 'center');
        hover.push({ sx, sy, name: v.name, sub: v.rank >= 5 ? 'Wijk' : v.kind === 'city' ? 'Stad' : v.kind === 'town' ? 'Plaats' : v.kind === 'hamlet' ? 'Buurtschap' : 'Dorp' });
      }
    } else {
      ctx.font = `${names.placePx}px ${FONT}`;
      for (const v of villageLabels(vx0, vy0, vx1, vy1)) {
        if ((v.kind === 'hamlet' || v.kind === 'quarter') && !names.hamlets) continue;
        const [sx, sy] = toScreen(v.x, v.y);
        const label = v.name.toUpperCase();
        const w = ctx.measureText(label).width;
        const box = [sx - w / 2 - 2, sy - 8, sx + w / 2 + 2, sy + 8];
        if (collides(boxes, box)) continue;
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
      const w = ctx.measureText(label).width;
      if (sx - w / 2 < 4 || sx + w / 2 > state.cw - 4 || sy < 12 || sy > state.ch - 12) continue;
      const box = [sx - w / 2 - 2, sy - 8, sx + w / 2 + 2, sy + 8];
      if (collides(boxes, box)) continue;
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
      const label = p.name.toUpperCase();
      const w = ctx.measureText(label).width;
      const box = [sx - w / 2 - 2, sy - 8, sx + w / 2 + 2, sy + 8];
      if (collides(boxes, box)) continue;
      boxes.push(box);
      // after dark a few wijken carry a warning (muggingrules.js): amber name and a triangle
      const warn = warnsOn(p.name, ((state.world.clock % 24) + 24) % 24);
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

  if (layerOn('streets') && names.streets) drawStreetNames(ctx, boxes);

  const sc = mapIconScale(z);
  if (layerOn('horeca') && mapKindVisible('horeca', z)) {
    const cellPx = z >= NEAR_ZOOM * 2 ? 26 * sc / 1.9 : 40 * sc / 1.9;
    for (const h of declutter(getHorecaForRender(), cellPx / state.scale)) {
      const [sx, sy] = toScreen(h.x, h.y);
      if (!onScreen(sx, sy)) continue;
      drawMapIconHalo(ctx, 'horeca', sx, sy, sc);
      drawMapIcon(ctx, 'horeca', sx, sy, sc, { t: 0 });
      hover.push({ sx, sy, name: h.name || 'Horeca', sub: 'Horeca' });
    }
  }
  if (layerOn('flitspaal') && mapKindVisible('flitspaal', z)) {
    for (const f of state.world.flitspaalen || []) {
      const [sx, sy] = toScreen(f.x, f.y);
      if (!onScreen(sx, sy)) continue;
      drawMapIconHalo(ctx, 'flitspaal', sx, sy, sc);
      drawMapIcon(ctx, 'flitspaal', sx, sy, sc, { t: 0 });
      hover.push({ sx, sy, name: 'Flitspaal' });
    }
  }
  if (layerOn('landmark')) {
    ctx.font = '14px ' + FONT;
    ctx.textBaseline = 'middle';
    for (const l of state.map.meta.landmarks || []) {
      const [sx, sy] = toScreen(l.x, l.y);
      if (!onScreen(sx, sy, 120)) continue;
      drawMapIcon(ctx, 'landmark', sx, sy, sc, { t: 0 });
      drawLabel(ctx, l.name, sx + 6 + 5 * sc, sy + 1, INK.paper, 'left');
    }
    // nicknamed buildings and the old Oosterpark (flavourlines.js)
    ctx.font = 'italic 13px ' + FONT;
    for (const f of FLAVOUR_MAP_PLACES) {
      const [sx, sy] = toScreen(f.x, f.y);
      if (!onScreen(sx, sy, 120) || !names.flavour) continue;
      drawLabel(ctx, f.name, sx, sy, inkA('flavour', 0.9), 'center');
      hover.push({ sx, sy, name: f.name, sub: f.sub });
    }
  }
  state.staticHover = hover;
}

function compose() {
  const t0 = performance.now();
  const c = state.composeCtx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, state.compose.width, state.compose.height);
  c.fillStyle = MAP_STYLE.meadow;
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

  if (getSettings().showFog) {
    const f = state.fog;
    const [sx, sy] = toScreen(f.minx, f.miny);
    const size = FOG_CELL * state.scale * state.dpr;
    c.drawImage(f.canvas, sx * state.dpr, sy * state.dpr, f.w * size, f.h * size);
  }

  const t1 = performance.now();
  c.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  drawStaticOverlay(c);
  state.perf.tilesMs = t1 - t0;
  state.perf.overlayMs = performance.now() - t1;
  state.dirty = !ready;
  state.perf.composeMs = performance.now() - t0;
}

// --- dynamic layer ----------------------------------------------------------

function drawDynamicMarkers(ctx, world) {
  const t = performance.now() / 1000;
  const hover = [];
  const z = state.zoom;
  // pick: what a click on the marker offers ({ goal, todo }, see markerCard)
  // the icons are queued, then thinned by priority and drawn (mapicons.js)
  const queue = [];
  const sc = mapIconScale(z);
  const icon = (layer, kind, x, y, name, opts, sub, pick) => {
    if (layer && !layerOn(layer)) return;
    if (!mapKindVisible(kind, z)) return;
    const [sx, sy] = toScreen(x, y);
    if (sx < -20 || sy < -20 || sx > state.cw + 20 || sy > state.ch + 20) return;
    queue.push({ kind, sx, sy, opts, name, sub, x, y, pick });
  };

  for (const r of getRoutes()) drawFullRoute(ctx, world, t, r);
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
      icon(null, missionMapKind(k.index, false), k.start.x, k.start.y, k.code ? `${k.code} · ${k.label}` : k.label, { alpha: 0.5 }, `Klus · opnieuw spelen: €${k.klusloon}`, { todo: 'm:' + k.index });
    }
  }
  if (showMission) {
    const wps = m.phase === 'active' ? m.remainingWaypoints || [] : [];
    if (wps.length) {
      drawRoute(ctx, [m.marker, ...wps].map((w) => toScreen(w.x, w.y)), ICON);
      for (const w of wps) icon(null, 'waypoint', w.x, w.y, 'Controlepunt');
    }
    icon(null, missionMapKind(m.index, m.phase === 'active'), m.marker.x, m.marker.y,
      m.label || 'Missie', {}, m.phase === 'active' ? 'Missiedoel' : 'Missie starten', m.phase === 'active' ? null : { todo: 'm:' + m.index });
  }
  // samen spelen: het doel van de opdracht van de gastheer staat ook op de kaart van een gast (#368)
  const gastDoel = world.coopRole === 'client' && !showMission && world.coopHost && world.coopHost.doelen && world.coopHost.doelen[0];
  if (gastDoel) icon(null, missionMapKind(-1, true), gastDoel.x, gastDoel.y, (world.coopHostMissie && world.coopHostMissie.label) || 'Opdracht', {}, 'Missiedoel van ' + (((world.coopRoster || []).find((r) => r.slot === 0) || {}).naam || 'de ander'));
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

  for (const o of getOwnedVehiclesForMap(world)) icon('car', 'own', o.x, o.y, 'Jouw ' + o.label, { vkind: o.kind, color: o.color });
  for (const sh of getShopsDecluttered(z >= NEAR_ZOOM ? 1 : 26 / state.scale)) icon(SHOP_TYPES[sh.type].group, 'shop-' + sh.type, sh.x, sh.y, sh.name, {}, SHOP_TYPES[sh.type].label);
  const storyShop = storyTargetShop(world);
  if (storyShop) {
    const [sx, sy] = toScreen(storyShop.x, storyShop.y);
    drawStoryShopRing(ctx, sx, sy, 13, t);
    icon(null, 'shop-' + storyShop.type, storyShop.x, storyShop.y, storyShop.name, {}, 'Voor het verhaal: ' + world.storyGuide.name.replace(/^Eerst: /, ''));
  }
  for (const ps of getPigeonSpotsForRender()) icon('duif', 'pigeon', ps.x, ps.y, ps.name, {}, 'Word een duif', { goal: { kind: 'play', id: 'duif', name: 'Duivenmodus', sub: ps.name, x: ps.x, y: ps.y }, todo: 'mg:duif' });
  const play = (id, name, sub, x, y, todo) => ({ goal: { kind: 'play', id, name, sub, x, y }, todo });
  for (const hs of getHeliSpotsForRender()) icon('heli', 'heli', hs.x, hs.y, hs.name, {}, 'Ballonjacht met de heli', play('heli', 'Ballonjacht', hs.name, hs.x, hs.y, 'mg:heli'));
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
  for (const ps of getPadelSpotsForRender()) icon('padel', 'padel', ps.x, ps.y, ps.name, {}, world.time < ps.nextAt ? 'Baan even bezet' : 'Potje padel: volle gezondheid', play('padel', 'Padel', ps.name, ps.x, ps.y, 'mg:padel'));
  const ACT_PLAY = { carbid: ['carbid', 'Carbid schieten', 'mg:carbid'], kermis: ['kermis', "Botsauto's", 'mg:botsauto'], drift: ['drift', 'Driftzone', 'mg:drift'], discgolf: ['discgolf', 'Discgolf', 'mg:discgolf'], pitchputt: ['pitchputt', 'Pitch & putt', 'mg:pitchputt'], skatepark: ['skatepark', 'Skatepark', 'mg:skatepark'], kartbaan: ['kartbaan', 'Karten bij Kardinge', 'mg:kartbaan'], zwembad: ['zwembad', 'Zwembad', 'mg:zwembad'], klimtoren: ['klimtoren', 'Klimtoren Zernike', 'mg:klimtoren'], waterski: ['waterski', 'Waterskiën', 'mg:waterski'], vliegschool: ['vliegschool', 'Vliegschool', 'mg:vliegschool'] };
  for (const a of activityMapIcons(world)) {
    const ap = ACT_PLAY[a.layer];
    icon(a.layer, a.kind, a.x, a.y, a.name, {}, a.sub, ap ? play(ap[0], ap[1], a.name, a.x, a.y, ap[2]) : null);
  }
  for (const q of getPostgameSpotsForRender()) icon('postgame', 'pg-' + q.kind, q.x, q.y, q.name, {}, q.busy ? `Nu: ${q.busy.label}` : q.sub, q.id ? { goal: { kind: 'challenge', id: q.id, name: q.name, x: q.x, y: q.y }, todo: 'pg:' + q.id } : null);
  const ct = !job && world.challengeTarget;
  if (ct) {
    if (ct.path.length) drawRoute(ctx, [...ct.path, ct].map((w) => toScreen(w.x, w.y)), ICON);
    icon(null, 'sj-target', ct.x, ct.y, 'Controlepunt', {}, 'Uitdaging');
  }
  for (const sj of getSideJobSpotsForRender()) icon(sj.job.layer || 'bijbaan', 'sj-' + sj.job.id, sj.x, sj.y, sj.job.name, {}, `${sj.job.kicker || 'Bijbaantje'}: ${sj.job.blurb.toLowerCase()}`, { goal: { kind: 'job', id: sj.job.id, name: sj.job.name, sub: 'Bijbaantje', x: sj.x, y: sj.y }, todo: 'job:' + sj.job.id });
  for (const st of getStationsForRender()) icon('trein', 'station', st.x, st.y, st.name, {}, VILLAGES[st.name] ? `Reizen met de trein · ${VILLAGES[st.name].teaser}. Machinist: pak een stilstaande trein (E), dan G` : 'Reizen met de trein. Machinist: pak een stilstaande trein (E), dan G');
  for (const q of ommelandMapSpots()) icon('ommeland', q.kind, q.x, q.y, q.name, {}, q.sub);
  for (const e of getEierbalTips()) icon(null, 'eierbalTip', e.x, e.y, 'Eierbal-tip', {}, 'Uit de Buukenkaas: hier ligt er eentje verstopt');

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
    icon(null, 'userWaypoint', wp.x, wp.y, `Waypoint: ${wp.name}`, {}, 'klik voor Haal weg · rechtsklik of Del om te wissen', { isGoal: true });
  }

  icon(null, 'player', world.player.x, world.player.y, 'Jij', { angle: world.player.angle });
  // medespelers (samen spelen, #95): eigen kleur en vorm, naam en status bij de aanwijzer
  for (const p of world.coopPartners || []) if (p.zichtbaar) icon(null, 'partner', p.x, p.y, p.naam, { angle: p.heading, kleur: p.kleur, vorm: p.vorm }, p.tekst);
  for (const m of world.coopPingMarks || []) icon(null, 'partner', m.x, m.y, m.naam ? `${m.naam}: ${m.tekst}` : m.tekst, { angle: 0, kleur: m.kleur, vorm: m.vorm }, 'roep');
  for (const q of placeIcons(queue, iconGapPx(sc))) {
    drawMapIconHalo(ctx, q.kind, q.sx, q.sy, sc);
    drawMapIcon(ctx, q.kind, q.sx, q.sy, sc, { t, alpha: mapIconAlpha(q.kind, z), ...q.opts });
    if (q.name) hover.push({ sx: q.sx, sy: q.sy, name: q.name, sub: q.sub, x: q.x, y: q.y, kind: q.kind, ...q.pick });
  }
  // het bijschrift van de laag (bv. Treinrit: afstand en richting) boven alle pictogrammen, op een donkere band: de pictogrammen worden hierboven in een rij getekend en lagen er eerst overheen
  if (layerCap) {
    ctx.save();
    ctx.font = 'bold 14px sans-serif';
    const tw = ctx.measureText(layerCap).width + 24;
    ctx.fillStyle = inkA('dark', 0.72);
    ctx.fillRect(state.cw / 2 - tw / 2, 40, tw, 24);
    drawLabel(ctx, layerCap, state.cw / 2, 56, INK.cream, 'center');
    ctx.restore();
  }
  state.dynHover = hover;
}

// A GPS line over the whole route, thick enough to read at every
// zoom level; without a road route (boat, off the network) a dashed line
// points straight at the destination instead.
function drawFullRoute(ctx, world, t, route) {
  if (!route) return;
  const color = ROUTE_COLORS[route.kind] || ROUTE_COLORS.user;
  const width = Math.max(4, Math.min(9, 3 + state.zoom * 0.7)) * (route === getActiveRoute() ? 1 : 0.8);
  const ahead = getRouteAhead(Infinity, route);
  if (ahead && ahead.length > 1) {
    const pts = [[world.player.x, world.player.y], ...ahead].map(([x, y]) => toScreen(x, y));
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
  const [ax, ay] = toScreen(world.player.x, world.player.y);
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

function drawChrome(ctx) {
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
  ctx.save();
  ctx.fillStyle = inkA('dark', 0.75);
  ctx.fillRect(x - 8 + 46, by - 18, w + 60, 26);
  ctx.strokeStyle = INK.cream;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 46, by - 5);
  ctx.lineTo(x + 46, by);
  ctx.lineTo(x + 46 + w, by);
  ctx.lineTo(x + 46 + w, by - 5);
  ctx.stroke();
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = INK.cream;
  ctx.fillText(meters >= 1000 ? `${meters / 1000} km` : `${meters} m`, x + 52 + w, by + 3);
  ctx.restore();
}

// --- search -----------------------------------------------------------------

function buildSearchIndex(world) {
  const entries = [];
  const byName = new Map();
  for (const r of world.map.roads) {
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
  for (const h of getHorecaForRender() || []) if (h.name) entries.push({ label: h.name, kind: 'Horeca', pri: 3, x: h.x, y: h.y, zoom: 8 });
  for (const g of getGaragesForRender()) entries.push({ label: g.name, kind: 'Garage', pri: 4, x: g.x, y: g.y, zoom: 7 });
  for (const h of getHomeForRender()) entries.push({ label: h.name, kind: 'Jullie flat en garage', pri: 0, x: h.x, y: h.y, zoom: 7 });
  for (const h of getHomeMooringForRender(world)) entries.push({ label: h.name, kind: 'Boten thuis', pri: 1, x: h.x, y: h.y, zoom: 8 });
  for (const h of getHomeHelipadForRender()) entries.push({ label: h.name, kind: 'Heli thuis', pri: 1, x: h.x, y: h.y, zoom: 8 });
  for (const sh of getShopsForRender()) entries.push({ label: sh.name, kind: SHOP_TYPES[sh.type].label, pri: 3, x: sh.x, y: sh.y, zoom: 8 });
  for (const sj of getSideJobSpotsForRender()) entries.push({ label: sj.job.name, kind: sj.job.kicker || 'Bijbaantje', pri: 1, x: sj.x, y: sj.y, zoom: 8 });
  for (const st of getStationsForRender()) entries.push({ label: st.name, kind: 'Treinstation', pri: 0, x: st.x, y: st.y, zoom: 7 });
  for (const e of entries) {
    e.norm = normalize(e.label);
    e.compact = e.norm.replace(/ /g, '');
  }
  return entries;
}

const TODO_KIND = { missies: 'Missie', minigames: 'Minigame', bijbaantjes: 'Bijbaantje', ommeland: 'Ommeland', nahetverhaal: 'Na het verhaal', verhaal: 'Verhaal' };

// Missions and activities change with progress: indexed per search.
function todoEntries() {
  const out = [];
  for (const it of getTodoItems(state.world)) {
    if (it.dist == null || it.status === 'slot') continue;
    const label = (it.code ? it.code + ' ' : '') + it.title;
    const norm = normalize(label);
    out.push({ label: it.code ? `${it.code} · ${it.title}` : it.title, kind: it.status === 'klaar' && it.group === 'missies' ? 'Klus' : TODO_KIND[it.group] || 'Te doen', pri: 0, x: it.x, y: it.y, zoom: 6, todo: it.key, icon: it.icon, norm, compact: norm.replace(/ /g, '') });
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
    li.addEventListener('mousedown', (ev) => { ev.preventDefault(); chooseResult(e); });
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
  const map = state.map;
  const spot = map.nearestRoadPoint(e.x, e.y, 120) || { x: e.x, y: e.y };
  setUserWaypoint(spot.x, spot.y, e.label);
  centreOn(spot.x, spot.y, e.zoom);
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

function wijkAt(wx, wy) {
  let best = null, bestD2 = Infinity;
  for (const p of state.map.meta.neighbourhoodPoints || []) {
    const d2 = (p.x - wx) ** 2 + (p.y - wy) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = p.name; }
  }
  return best;
}

function updateTooltip(sx, sy) {
  const tip = state.tooltip;
  const h = nearestHover(sx, sy);
  state.canvas.classList.toggle('pointing', !!h);
  let main = '', sub = '';
  if (h) {
    main = h.name;
    sub = h.sub || '';
  } else {
    const [wx, wy] = toWorld(sx, sy);
    const [minx, miny, maxx, maxy] = state.real;
    if (wx < minx || wy < miny || wx > maxx || wy > maxy) {
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
      main = streetAt(wx, wy, Math.max(4, 10 / state.scale)) || '';
      sub = wijkAt(wx, wy) || '';
      if (!main) { main = sub; sub = ''; }
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
  const [wx, wy] = toWorld(sx, sy);
  // de cheat Overal en nergens, of shift+klik (instelling mapShiftTeleport, kaartteleport.js)
  if (wantsTeleport({ shift, enabled: getSettings().mapShiftTeleport, teleportMode: state.teleport })) {
    if (h && h.teleport) teleportTo(world, h.teleport);
    else teleportTo(world, { x: wx, y: wy, name: plekNaam(streetAt(wx, wy, 60), wijkAt(wx, wy)) });
    return;
  }
  if (state.card) { hideCard(); if (!h) return; }
  // a marker: a small card with what it is and "Zet als doel"
  if (h && h.name !== 'Jij') { showCard(world, h, sx, sy); return; }
  const spot = state.map.nearestRoadPoint(wx, wy, 60);
  const x = spot && Math.hypot(spot.x - wx, spot.y - wy) < 30 ? spot.x : wx;
  const y = spot && Math.hypot(spot.x - wx, spot.y - wy) < 30 ? spot.y : wy;
  const name = streetAt(x, y, 40) || wijkAt(x, y) || '';
  // een klik op een plek: eerst kiezen wat je wilt (#445), niet meteen een waypoint
  showCard(world, { name: name || 'Plek op de kaart', sub: wijkAt(x, y) && name !== wijkAt(x, y) ? wijkAt(x, y) : '', x, y, spot: true }, sx, sy);
}

// --- marker card ---------------------------------------------------------------

const escHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
  const goal = getGoal();
  const d = Math.hypot(h.x - world.player.x, h.y - world.player.y);
  const pips = it && it.medal != null ? `<span class="mv-pips">${[1, 2, 3].map((m) => `<span class="mv-pip" data-m="${m}"${it.medal >= m ? ' data-on' : ''} title="${MEDALS[m]}">${'BZG'[m - 1]}</span>`).join('')}</span>` : '';
  const meta = [it ? it.meta : h.sub, formatDistance(d), h.isGoal ? 'jouw waypoint' : ''].filter(Boolean).map(escHtml).join(' · ');
  // de actiebalk (#445): Zet waypoint / Reis erheen / Info, met reizen als eigen uitgelegde stap
  const keep = state.card && state.card.h === h ? state.card : null;
  const stap = keep ? keep.stap || null : null;
  const gast = world.coopRole === 'client' && !!world.coopNet;
  const opts = reisOptiesVoor(world, { x: h.x, y: h.y });
  const verhaal = !!(h.story && goal);
  const model = actieModel({ spot: { x: h.x, y: h.y, name: h.name }, speler: world.player, waypoint: h.isGoal ? { x: h.x, y: h.y } : getUserWaypoint(), opts, fmt: formatDistance, gast, verhaal });
  let stapHtml = '';
  state.reis = null;
  let gekozen = null;
  if (stap === 'reis') {
    const rijen = reisKeuzes(opts, d, { gast });
    const keep0 = keep ? keep.gekozen : null;
    gekozen = (rijen.find((r) => r.id === keep0 && r.soort === 'snel') || rijen.find((r) => r.aanbevolen && r.soort === 'snel') || rijen.find((r) => r.soort === 'snel') || {}).id || null;
    const kleur = Object.fromEntries(kaartRijen(opts, optieRegel, gekozen).map((r) => [r.id, r.color]));
    stapHtml = reisHtml(rijen, gekozen, kleur);
    if (gast) stapHtml += `<p class="mv-note">${escHtml(GAST_REIS_MELDING)}</p>`;
    const sel = opts.find((o) => o.id === gekozen);
    if (gekozen && sel && !gast) stapHtml += `<button type="button" class="mapview-btn" data-card="rij"${sel.afford ? '' : ' disabled'}>Reis nu · ${sel.price > 0 ? `€ ${sel.price}` : 'gratis'} · ${escHtml(sel.eta || '')}</button>`;
    state.reis = { opts, gekozen, lagen: lijnLagen(opts, gekozen), dest: { x: h.x, y: h.y, name: h.name } };
  } else if (stap === 'info') {
    stapHtml = infoHtml(infoRegels({ spot: { x: h.x, y: h.y, name: it ? it.title : h.name }, sub: it ? it.meta : h.sub, afstand: d, fmt: formatDistance }));
  } else if (keep && keep.melding) stapHtml = `<p class="mv-note">${escHtml(keep.melding)}</p>`;
  const el = state.cardEl;
  el.innerHTML = `<span class="mv-ico">${h.kind ? `<img src="${mapIconUrl(h.kind)}" alt="">` : ''}</span><div><b>${escHtml(it ? (it.code ? it.code + ' · ' : '') + it.title : h.name || 'Plek op de kaart')}</b>` +
    `<small>${meta}</small>${pips || (it && it.record) ? `<span class="mv-rec">${pips}${escHtml(it ? it.record : '')}</span>` : ''}${actiesHtml(model, stap)}${stapHtml}` +
    '<div class="mv-btns"><button type="button" class="mapview-btn ghost" data-card="close">Sluiten</button></div></div>';
  el.hidden = false;
  state.card = { h, it, gekozen, stap, model };
}

// De uitleg bij de kaart en de hints eronder (#445): de eerste keer open, te sluiten, terug te vinden bij Besturing, Hulp.
function kaartGezien() {
  try { return !!parseSeen(localStorage.getItem(KEYS.hudSeen))[UITLEG_ID]; } catch (e) { return false; }
}
function initKaartUitleg(overlay) {
  const st = document.createElement('style');
  st.textContent = KAART_ACTIE_CSS;
  document.head.appendChild(st);
  const body = overlay.querySelector('.mapview-body');
  const hint = document.createElement('div');
  hint.className = 'mv-hint';
  hint.dataset.padCtx = 'menu';
  hint.innerHTML = hintHtml();
  body.appendChild(hint);
  if (!kaartGezien()) body.insertAdjacentHTML('beforeend', uitlegHtml());
}
function sluitKaartUitleg(btn) {
  const box = btn.closest('.mv-uitleg');
  if (box) box.remove();
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
  if (n) { const [on, all] = layerCount(); n.textContent = `${on} van ${all} aan`; }
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
}

function cardAction(world, act) {
  const c = state.card;
  if (!c) return;
  if (act.startsWith('kies:') && state.reis) {
    // een andere optie uitlichten: de lijnen op de kaart wisselen mee
    c.gekozen = act.slice(5);
    showCard(world, c.h);
    return;
  }
  if (act === 'reis' || act === 'info') {
    // uitklappen of weer inklappen; een gast leest waarom reizen hier niet kan
    c.stap = c.stap === act ? null : act;
    c.melding = act === 'reis' && c.model && c.model.acties.some((a) => a.id === 'reis' && a.disabled) ? GAST_REIS_MELDING : null;
    showCard(world, c.h);
    return;
  }
  if (act === 'zelf') {
    // Zelf gaan: een waypoint, en de kaart gaat dicht zodat je zelf kunt gaan
    const h = c.h;
    hideCard();
    zetWaypoint(world, c, h);
    if (closeHandler) closeHandler();
    else closeMap();
    return;
  }
  if (act === 'rij' && state.reis) {
    const { opts, gekozen, dest } = state.reis;
    const o = opts.find((x) => x.id === gekozen);
    hideCard();
    if (!o || !o.ride) return;
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

// Zet waypoint: een missie of klus wordt jouw doel, een plek wordt het ene waypoint.
function zetWaypoint(world, c, h) {
  if (c.it && c.it.goal && (c.it.goal === 'story' || c.it.goal.kind === 'mission')) chooseTodo(world, c.it);
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
  let px = 0, py = 0;
  if (input.isDown('a') || input.isDown('arrowleft')) px -= 1;
  if (input.isDown('d') || input.isDown('arrowright')) px += 1;
  if (input.isDown('w') || input.isDown('arrowup')) py -= 1;
  if (input.isDown('s') || input.isDown('arrowdown')) py += 1;
  if (px || py) {
    const speed = 700 * dt / state.scale;
    state.cx += px * speed;
    state.cy += py * speed;
    updateTransform();
  }
  if (input.wasPressed(' ')) centreOn(world.player.x, world.player.y, 3);
}

// --- lifecycle --------------------------------------------------------------

// "Op de kaart": what the map and the minimap show. Altijd has no switch;
// a row with several layers switches them together (same keys as before,
// mapfilters.js); Diensten and Onderweg start folded.
const LEGEND = [
  { group: 'Altijd', rows: [
    { kind: 'player', label: 'Jij', note: 'en wie er met je meerijdt' },
    { kind: 'missionIdle', label: 'Verhaal', dyn: 'story' },
    { kind: 'userWaypoint', label: 'Jouw waypoint', dyn: 'goal' },
    { kind: 'route', label: 'Route', note: 'doorgetrokken: verhaal of missie, streepjes: jouw doel, puntjes: klus, streep-punt: opknappen of repareren' },
  ] },
  { group: 'Te doen', rows: [
    { kind: 'padel', label: 'Minigames', note: 'padel, carbid, botsauto\'s, driftzones, discgolf, pitch & putt, skatepark, karten, zwemmen, klimmen, waterskiën, vlieglessen, duiven, ballonjacht', layers: ['padel', 'duif', 'heli', ...ACTIVITY_LEGEND.map((l) => l.layer).filter((l) => l !== 'safehuis')] },
    { kind: 'sj-taxi', label: 'Bijbaantjes', note: 'start bij de baas', layers: ['bijbaan', 'rondvaarttour'] },
    { kind: 'missionIdle', label: 'Klussen', note: 'gespeelde missies, om opnieuw te spelen', layers: ['klussen'] },
    { kind: 'dorp', label: 'Ommeland', note: 'dorpsuitjes waar je in de buurt was, gevonden wereldeinden', layers: ['ommeland'] },
    { kind: 'pg-jelle', label: 'Na het verhaal', note: 'Jelle\'s uitdagingen en de Fjord Frituur', layers: ['postgame'] },
  ] },
  { group: 'Diensten', folded: true, rows: [
    { kind: 'home', label: 'Thuis', note: 'flat, garage, steiger en helidek', layers: ['home', 'homeGarage'] },
    { kind: 'own', label: 'Jouw voertuigen', note: 'auto, fiets, e-step, boot, heli', layers: ['car'] },
    { kind: 'garage', label: 'Garage en pomp', note: 'repareren, spuiten, opvoeren, wrakken', layers: ['garage'] },
    { kind: 'hospital', label: 'Ziekenhuis en huisarts', layers: ['zorg'] },
    { kind: 'politiebureau', label: 'Politiebureau', layers: ['politiebureau'] },
    { kind: 'horeca', label: 'Horeca', layers: ['horeca'] },
    { kind: 'shop-kleding', label: 'Winkels', note: 'kleding, kapper, loten, krant, super, snacks', layers: ['shops'] },
    { kind: 'shop-fietsen', label: 'Voertuigwinkels', note: 'fietsen, auto\'s, tuning, boten, heli\'s', layers: ['shopsVoertuigen'] },
    { kind: 'shop-wapens', label: 'Wapens & pandjeshuis', layers: ['shopsWapens'] },
    { kind: 'station', label: 'Treinstation', note: 'reizen met de trein', layers: ['trein'] },
  ] },
  { group: 'Onderweg', folded: true, rows: [
    { kind: 'companion', label: 'Maat', layers: ['companion'] },
    { kind: 'flitspaal', label: 'Flitspaal', layers: ['flitspaal'] },
    { kind: 'landmark', label: 'Bezienswaardigheid', layers: ['landmark'] },
    { kind: 'act-safehuis', label: 'Safehouse', note: 'een huisje om te kopen of te krijgen in elk gebied dat je kunt veroveren: slapen, kleren, garage, onderduiken', layers: ['safehuis'] },
    { kind: 'veroverd', label: 'Veroverd', note: 'wijken, plaatsen en streken die je aan het doen bent (de kleur loopt mee) of helemaal gedaan hebt (een vlag)', layers: ['veroverd'] },
    { kind: 'text-street', label: 'Straatnamen', layers: ['streets'] },
    { kind: 'text-wijk', label: 'Wijknamen (oranje met driehoek: \'s nachts opletten)', layers: ['wijken'] },
    { kind: 'buildings', label: 'Gebouwen', layers: ['buildings'] },
  ] },
];

function drawLegendIcon(ctx, kind) {
  if (kind === 'route') {
    drawRoadRoute(ctx, [[3, 16], [11, 10], [21, 12]], ROUTE_COLORS.user, 3.5);
    drawRoadRoute(ctx, [[3, 21], [21, 19]], ROUTE_COLORS.mission, 3.5);
    drawRoadRoute(ctx, [[3, 6], [12, 4], [21, 6]], ROUTE_COLORS.care, 3);
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
  root.innerHTML = '<h3>Op de kaart</h3>';
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
      if (row.dyn) state.legendDyn[row.dyn] = n;
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
    root.appendChild(box);
  }
}

function refreshLegend(world) {
  const d = state.legendDyn || {};
  const g = getGoal();
  if (d.goal) d.goal.textContent = g ? [g.name, g.sub].filter(Boolean).join(' · ') : '';
  if (d.story) d.story.textContent = world.storyGuide ? world.storyGuide.name : world.storyFreePlay ? 'het verhaal is uit' : '';
}

// The map's travel mode (Lopen, Fiets, Auto, Boot, OV, Lucht): it opens on how
// you travel now; the roads that are for you stand out, the others step back
// and a trunk road you may not walk or cycle on is dashed red.
const MODE_NOTE = {
  lopen: 'Rood gestreept: niet voor jou.',
  fiets: 'Fietspaden lichten op.',
  auto: 'Doorgaande wegen.',
  boot: 'Vaarwater en bruggen.',
  ov: 'Spoor en stations.',
  lucht: 'Oriëntatiepunten.',
};
function setMode(m) {
  if (!MODES.includes(m)) return;
  state.mode = m;
  if (state.modeNote) state.modeNote.textContent = MODE_NOTE[m];
  if (state.avoidBtn) state.avoidBtn.hidden = m !== 'auto';
  clearTiles();
  state.dirty = true;
}

function openMap(world) {
  ensureCountryEdge(world.map);
  setMode(travelModeOf(world));
  state.open = true;
  setMapOpenState(true);
  state.overlay.classList.add('open');
  sizeCanvas();
  ensureLevel0();
  state.dirty = true;
  const c = world.companion;
  if (state.legendMaat) state.legendMaat.textContent = c ? `Maat (${c.character === 'tammo' ? 'Tammo' : 'Tessa'})` : 'Maat';
  refreshLegend(world);
  syncLayersButton();
  const eb = state.overlay.querySelector('.mv-eb');
  const seen = getDiscoveredRatio();
  if (eb) { eb.hidden = seen < 0.01; eb.textContent = `${Math.round(seen * 100)}% van Grunn verkend`; }
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
  if (state.dirty) compose();
  const { ctx } = state;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
  ctx.drawImage(state.compose, 0, 0);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  drawDynamicMarkers(ctx, world);
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
    '<label class="mapview-search m-inp"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg><input type="search" placeholder="Zoek een plek, missie of minigame" aria-label="Zoek een plek, missie of minigame" autocomplete="off" spellcheck="false">' +
    '<ul class="mapview-results" role="listbox" hidden></ul></label></div>' +
    '<div class="mv-hr">' +
    '<button type="button" class="m-bg mv-layers" data-act="layers" aria-expanded="false" aria-controls="mv-legend">Lagen <span class="mv-layers-n"></span></button>' +
    '<button type="button" class="m-bg mv-close" data-act="close" style="display:none">Sluiten</button></div></div>' +
    '<div class="mapview-body"><canvas class="mapview-canvas"></canvas>' +
    '<div class="mapview-zoom"><button type="button" class="m-bg" data-act="in" aria-label="Inzoomen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button><button type="button" class="m-bg" data-act="out" aria-label="Uitzoomen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button><button type="button" class="m-bg" data-act="centre" aria-label="Naar jezelf"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg></button></div>' +
    '<div class="mv-goal"><span class="m-eb">Je route</span><span class="mapview-route"></span><button type="button" class="m-bt" data-act="clear" hidden>Haal waypoint weg</button><button type="button" class="m-bt" data-act="avoid" aria-pressed="false" hidden>Snelwegen vermijden</button></div>' +
    '<div class="mapview-osm">© OpenStreetMap-bijdragers</div>' +
    '<div class="mapview-tp" hidden>Kies een plek: daar sta je meteen · <b>Esc</b> stopt</div><div class="mapview-tooltip"></div><div class="mapview-card" hidden></div><aside class="mapview-legend" id="mv-legend" hidden></aside></div>';
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
    drag: null,
    found: [],
    sel: -1,
    legendMaat: null,
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
  reticle.innerHTML = '<svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="9"/><path d="M17 2v8M17 24v8M2 17h8M24 17h8"/></svg>';
  state.canvas.parentElement.appendChild(reticle);
  state.searchIndex = buildSearchIndex(world);
  initFog(world);
  buildLegend(overlay.querySelector('.mapview-legend'));
  state.avoidBtn = overlay.querySelector('[data-act="avoid"]');
  state.modeNote = document.createElement('p');
  state.modeNote.className = 'hint mv-modenote';
  overlay.querySelector('.mapview-legend').prepend(state.modeNote);
  setMode('lopen');
  onSettingsChange((s, key) => { if (key === 'showFog') state.dirty = true; });

  overlay.addEventListener('mousedown', (e) => e.stopPropagation());

  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'avoid') {
      const on = !getRoutePrefs().avoidMotorways;
      setRoutePrefs({ avoidMotorways: on });
      btn.setAttribute('aria-pressed', String(on));
    } else if (act === 'centre') centreOn(world.player.x, world.player.y, 3);
    else if (act === 'layers') toggleLegend();
    else if (act === 'close') { if (closeHandler) closeHandler(); else closeMap(); } // no Esc on a touchscreen
    else if (act === 'clear') clearUserWaypoint();
    else if (act === 'uitleg-sluit') sluitKaartUitleg(btn);
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
    if (!state.legendGezien) { state.legendGezien = true; toggleLegend(true); } // legenda en filters staan de eerste keer open: ze zaten achter de knop Lagen (#435)
    centreOn(world.player.x, world.player.y, 2);
    state.canvas.focus({ preventScroll: true });
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
  updateFog(world);
  updateRouting(dt, world);
  if (!state.open) return;
  if (syncMapPhase(world) !== state.phase) { state.phase = syncMapPhase(world); clearTiles(); }
  handleKeys(dt, world);
  render(world);
}
