import { dualHtml } from './subtitles.js';
import { getGaragesForRender } from './garages.js';
import { getHomeForRender, getHomeGarageForRender, getHomeMooringForRender, getHomeHelipadForRender } from './home.js';
import { minimapShows } from './mapfilters.js';
import { getHorecaForRender } from './horeca.js';
import { getShopsForRender, drawShopMapIcon, drawShopGlyph, SHOP_TYPES, storyTargetShop, drawStoryShopRing } from './shops.js';
import { getOwnedVehiclesForMap } from './ownedvehicles.js';
import { getPigeonSpotsForRender, drawPigeonMapIcon } from './pigeonspots.js';
import { getHeliSpotsForRender, drawHeliMapIcon } from './helirun.js';
import { getPadelSpotsForRender, drawPadelMapIcon } from './padel.js';
import { activityMapIcons, drawActivityMapIcon } from './activities.js';
import { getPostgameSpotsForRender, drawPostgameMapIcon } from './postgame.js';
import { getStationsForRender, drawStationMapIcon } from './stationtravel.js';
import { getSideJobSpotsForRender, drawSideJobMapIcon, JOB_TARGET_COLOR } from './sidejobs.js';
import { vehicleDisplayName } from './vehiclenames.js';
import { cinematicAllowsDamageFx } from './cinematics.js';
import { isMuted } from './audio.js';
import { drawRailsOnMap, drawTrainsOnMap } from './railway.js';
import { drawCountryMinimap, MINI_STYLE } from './countrymap.js';
import { edgeDistance, urbanWeight } from './countryfield.js';
import { REAL, nearestPlace, realStreetAt } from './countryreal.js';
import { getActiveRoute, getRouteAhead, getRoutes, getUserWaypoint, formatDistance } from './routing.js';
import { storyWaiting, missionOnMap } from './goal.js';
import { setGhostBar, ring, pop } from './motion.js';
import { renderSnapshot, PORTRAIT_ANGLE } from './vehiclepreview.js';
import { TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { initPrompts, updatePrompts } from './prompts.js';
import { hudPixelRatio } from './uiscale.js';
import { initCards, updateCards } from './hudcards.js';
// portraits share the HUD's green (DESIGN_SYSTEM: no blue accents); speaker
// colours stay in subtitles
const HUD_ACCENT = '#3fc97a';

const HEART_PATH = 'M12 21s-7.8-4.7-9.6-10A5.3 5.3 0 0 1 12 6.1a5.3 5.3 0 0 1 9.6 4.9C19.8 16.3 12 21 12 21z';
const SHIELD_PATH = 'M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z';
const MINIMAP_SIZE = 230;
const MM_SCALE = 1.45; // px per meter (css pixels) when standing still
const MM_SCALE_FAST = 0.62;
const MM_FAST_SPEED = 28;
let mmScale = MM_SCALE;

// GTA-style: purple for your own waypoint, yellow for missions, orange for
// side jobs, pink for care (food when hurt, a garage for your own damaged ride)
export const ROUTE_COLORS = { user: '#c068ff', mission: '#e8c93a', job: '#ff9a3c', care: '#ff5fb4' };
export const routeLabel = (r) => (r.kind === 'user' ? 'Doel' : r.kind === 'job' ? 'Klus' : r.kind === 'care' ? (r.target && r.target.why === 'repair' ? 'Garage' : 'Opknappen') : 'Missie');

let els = null;

export function initHud(world) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./hud_panel.css', import.meta.url).href;
  document.head.appendChild(link);

  const root = document.getElementById('hud');

  const topLeft = document.createElement('div');
  topLeft.className = 'hud-top-left';
  topLeft.innerHTML =
    '<div class="hud-id">' +
      '<div class="hud-portrait" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="15" r="7.2"/><path class="hair"/><path d="M6 40c1-9 7-13.5 14-13.5S33 31 34 40z"/></svg><img alt=""></div>' +
      '<div class="hud-id-main">' +
        '<div class="hud-name-row"><div class="hud-character"></div><div class="hud-status">' +
          '<span class="hud-chip drunk" role="status" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h11l-1.3 15.2A3 3 0 0 1 12.7 21h-2.4a3 3 0 0 1-3-2.8zM7.4 7.5h8.2"/></svg>Aangeschoten</span>' +
          '<span class="hud-chip hud-mute" role="status" aria-label="Geluid uit" title="Geluid uit (U)" hidden>🔇</span>' +
        '</div></div>' +
        `<div class="hud-meter hp" role="meter" aria-label="Gezondheid" aria-valuemin="0" aria-valuemax="100"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${HEART_PATH}"/></svg><div class="hud-bar"><div class="hud-bar-ghost"></div><div class="hud-bar-fill health"></div></div><b></b></div>` +
        `<div class="hud-meter ar" role="meter" aria-label="Bescherming" aria-valuemin="0" aria-valuemax="100"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${SHIELD_PATH}"/></svg><div class="hud-bar"><div class="hud-bar-ghost"></div><div class="hud-bar-fill armor"></div></div><b></b></div>` +
      '</div>' +
    '</div>' +
    '<div class="hud-mate" hidden><span class="hud-mate-pic" aria-hidden="true"><img alt=""></span><span class="hud-mate-txt"></span></div>';
  root.appendChild(topLeft);

  const topRight = document.createElement('div');
  topRight.className = 'hud-top-right';
  topRight.innerHTML =
    '<div class="hud-clock" role="timer" aria-label="Tijd in het spel"><span class="hud-dp"><svg class="hud-clock-icon" viewBox="0 0 24 24" aria-hidden="true"></svg><small></small></span><b></b></div>' +
    '<div class="hud-wanted" role="img"></div>' +
    '<i class="hud-tr-sep"></i>' +
    '<div class="hud-tr-row"><small>Op zak</small><span class="hud-money"></span></div>' +
    '<div class="hud-money-delta"></div>' +
    '<i class="hud-tr-sep"></i>' +
    '<div class="hud-weapon"></div>';
  root.appendChild(topRight);

  const damage = document.createElement('div');
  damage.className = 'hud-damage';
  root.insertBefore(damage, root.firstChild);

  const speedo = document.createElement('div');
  speedo.className = 'hud-speedo';
  speedo.innerHTML = '<span class="sp-num"><b></b><span>km/u</span></span><span class="sp-dmg"><small>Schade</small><span class="sp-bar"><i></i></span></span>';
  root.appendChild(speedo);

  const vehName = document.createElement('div');
  vehName.className = 'hud-vehname';
  vehName.setAttribute('aria-live', 'polite');
  vehName.innerHTML = '<div class="vn-text"><small></small><b></b></div><svg class="vn-ic" viewBox="0 0 24 24" aria-hidden="true"></svg>';
  root.appendChild(vehName);

  // the objective line: one objective at a time, top centre
  const mission = document.createElement('div');
  mission.className = 'hud-mission';
  mission.setAttribute('aria-live', 'polite');
  mission.innerHTML = '<svg class="hud-obj-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l9.5 9.5-9.5 9.5L2.5 12z"/></svg>' +
    '<div class="hud-obj-text"><div class="hud-mission-label"></div><div class="hud-mission-progress"></div></div><div class="hud-mission-timer"></div>';
  root.appendChild(mission);

  const nowPlaying = document.createElement('div');
  nowPlaying.className = 'hud-nowplaying';
  nowPlaying.setAttribute('aria-live', 'polite');
  nowPlaying.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17.5V5.2l11-2.2v12.3"/><circle cx="6.5" cy="17.5" r="2.8"/><circle cx="17.5" cy="15.3" r="2.8"/></svg>' +
    '<div><small>NU OP G-MUSIC</small><b class="np-artist"></b><span class="np-title"></span></div>';
  root.appendChild(nowPlaying);

  const race = document.createElement('div');
  race.className = 'hud-race';
  race.hidden = true;
  race.innerHTML =
    '<div class="hr-pos"><b></b><span></span></div>' +
    '<div class="hr-row" data-k="time"><span>TIJD</span><b></b></div>' +
    '<div class="hr-row" data-k="left"><span>RESTEREND</span><b></b></div>' +
    '<div class="hr-row" data-k="lap"><span>RONDE</span><b></b></div>' +
    '<div class="hr-row" data-k="cp"><span>CHECKPOINT</span><b></b></div>' +
    '<div class="hr-row" data-k="best"><span>RECORD</span><b></b></div>';
  root.appendChild(race);

  const cards = initCards(world, root);

  const location = document.createElement('div');
  location.className = 'hud-location';
  location.innerHTML = '<svg class="hud-loc-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s-7-7.2-7-12.4a7 7 0 0 1 14 0C19 14.8 12 22 12 22z"/><circle cx="12" cy="9.6" r="2.6"/></svg><div><div class="hud-district"></div><div class="hud-street"></div></div>';
  root.appendChild(location);

  const routeChip = document.createElement('div');
  routeChip.className = 'hud-route';
  routeChip.setAttribute('aria-live', 'off');
  root.appendChild(routeChip);

  const mmWrap = document.createElement('div');
  mmWrap.className = 'hud-minimap-wrap';
  const mmCanvas = document.createElement('canvas');
  mmWrap.appendChild(mmCanvas);
  root.appendChild(mmWrap);


  els = {
    character: topLeft.querySelector('.hud-character'),
    healthFill: topLeft.querySelector('.health'),
    armorFill: topLeft.querySelector('.armor'),
    hpRow: topLeft.querySelector('.hud-meter.hp'),
    arRow: topLeft.querySelector('.hud-meter.ar'),
    hpNum: topLeft.querySelector('.hud-meter.hp b'),
    arNum: topLeft.querySelector('.hud-meter.ar b'),
    portrait: topLeft.querySelector('.hud-portrait'),
    portraitImg: topLeft.querySelector('.hud-portrait img'),
    mate: topLeft.querySelector('.hud-mate'),
    mateImg: topLeft.querySelector('.hud-mate img'),
    mateTxt: topLeft.querySelector('.hud-mate-txt'),
    mateKey: '', portraitKey: '', portraitT: 0,
    drunk: topLeft.querySelector('.hud-chip.drunk'),
    idKey: '', hpKey: '', arKey: '',
    mute: topLeft.querySelector('.hud-mute'),
    wanted: topRight.querySelector('.hud-wanted'),
    clock: topRight.querySelector('.hud-clock'),
    money: topRight.querySelector('.hud-money'),
    moneyDelta: topRight.querySelector('.hud-money-delta'),
    damage,
    speedo,
    speedoValue: speedo.querySelector('b'),
    speedoDmg: speedo.querySelector('.sp-bar i'),
    speedoDmgLabel: speedo.querySelector('.sp-dmg small'),
    speedoKey: '',
    weapon: topRight.querySelector('.hud-weapon'),
    mission,
    vehName,
    missionLabel: mission.querySelector('.hud-mission-label'),
    missionProgress: mission.querySelector('.hud-mission-progress'),
    missionTimer: mission.querySelector('.hud-mission-timer'),
    locationEl: location,
    district: location.querySelector('.hud-district'),
    street: location.querySelector('.hud-street'),
    cards,
    race,
    raceRows: Object.fromEntries([...race.querySelectorAll('.hr-row')].map((r) => [r.dataset.k, r])),
    racePos: race.querySelector('.hr-pos'),
    nowPlaying,
    npArtist: nowPlaying.querySelector('.np-artist'),
    npTitle: nowPlaying.querySelector('.np-title'),
    npShown: null,
    routeChip,
    routeText: '',
    mmCanvas,
    mmCtx: mmCanvas.getContext('2d'),
  };
  initPrompts(root);
}

const VEH_ICONS = {
  car: '<path d="M3.5 15.5v-3l2-4.6A2 2 0 0 1 7.3 6.7h9.4a2 2 0 0 1 1.8 1.2l2 4.6v3z"/><path d="M6 11.5h12" class="ln"/><circle cx="7.3" cy="16.3" r="1.9"/><circle cx="16.7" cy="16.3" r="1.9"/>',
  bus: '<rect x="3.5" y="4.5" width="17" height="12" rx="2"/><path d="M3.5 10h17" class="ln"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  bike: '<circle cx="6" cy="15.5" r="3.6" class="ln"/><circle cx="18" cy="15.5" r="3.6" class="ln"/><path d="M6 15.5l4-6.5h5.5L18 15.5M10 9l2.8 6.5h2.2M13.5 6.5h2.5" class="ln"/>',
  scooter: '<circle cx="6" cy="16.5" r="2.6" class="ln"/><circle cx="18" cy="16.5" r="2.6" class="ln"/><path d="M6 16.5h7.5l2-9.5h2.5M9 13h6" class="ln"/>',
  boat: '<path d="M2.5 14.5h19l-3 5h-13z"/><path d="M11.5 3v10M11.5 4.5l6 8h-6" class="ln"/>',
  heli: '<path d="M3 6h16M11 6v3" class="ln"/><path d="M5.5 13a4.5 3.5 0 0 1 9 0v1.5h-9z"/><path d="M14.5 12.5h6.5M20 10v4.5M6 19h8M8 16v3M12 16v3" class="ln"/>',
};

// GTA-style: the model name shows for a moment when you get into a vehicle
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
      els.vehName.querySelector('.vn-ic').innerHTML = VEH_ICONS[v.isHeli ? 'heli' : v.isBoat ? 'boat' : v.isBike ? 'bike' : v.isScooter ? 'scooter' : v.isBus ? 'bus' : 'car'];
      vehNameTimer = 4.5;
      els.vehName.classList.remove('on');
      void els.vehName.offsetWidth;
      els.vehName.classList.add('on');
    } else {
      vehNameTimer = 0;
    }
  }
  if (vehNameTimer > 0) {
    vehNameTimer -= dt;
    if (vehNameTimer <= 0) els.vehName.classList.remove('on');
  } else if (!v) els.vehName.classList.remove('on');
}

export function updateHud(dt, world) {
  updateVehicleName(dt, world);
  updateCharacter(dt, world);
  updateBars(world);
  els.mute.hidden = !isMuted();
  updateWanted(world);
  updateMoneyWeapon(dt, world);
  updateClock(world);
  updateDamage(dt, world);
  updateSpeedo(world);
  updateMission(world);
  updateRaceHud(world);
  updateCards(dt, world);
  updateNowPlaying(world);
  updateLocation(dt, world);
  updatePrompts(dt, world);
  updateRouteChip(world);
  drawMinimap(dt, world);
}

function updateRouteChip(world) {
  const route = getActiveRoute();
  let text = '', kind = '';
  if (route && route.remaining > 12) {
    kind = route.kind;
    text = `${routeLabel(route)}: ${formatDistance(route.remaining)}`;
  } else if (!route && getUserWaypoint()) {
    const wp = getUserWaypoint();
    kind = 'user';
    text = `Doel: ${formatDistance(Math.hypot(wp.x - world.player.x, wp.y - world.player.y))}`;
  }
  if (text === els.routeText) return;
  els.routeText = text;
  els.routeChip.textContent = text;
  els.routeChip.dataset.kind = kind;
}

function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function currentDistrict(world) {
  const { x, y } = world.player;
  const meta = world.map.meta;
  // out in the real Ommelanden: the village you are in, else just Ommeland
  if (REAL.ready && edgeDistance(x, y) > 60) {
    const p = nearestPlace(x, y, 0, true);
    const d = p ? Math.hypot(p.x - x, p.y - y) : Infinity;
    return d < p.r * 1.3 || (d < 2500 && urbanWeight(x, y) > 0.3) ? p.n : 'Ommeland';
  }
  // Only 2 of the real admin boundaries actually reach into this play area,
  // and they're coarse (e.g. plain "Groningen") - the ~66 named
  // neighbourhood/quarter points give a far more specific, GTA-style
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

let locationTimer = 0;
function updateLocation(dt, world) {
  locationTimer -= dt;
  if (locationTimer > 0) return;
  locationTimer = 0.5;
  // savegame.js's "Opgeslagen" sits in the location chip
  if (!els.savedIn) {
    const t = document.querySelector('#hud > .hud-saved');
    if (t) { els.locationEl.appendChild(t); els.savedIn = true; }
  }
  const district = currentDistrict(world);
  const rp = world.map.nearestRoadPoint(world.player.x, world.player.y, 60, false);
  const street = (rp && rp.road && rp.road.name) || (REAL.ready && edgeDistance(world.player.x, world.player.y) > 0 ? realStreetAt(world.player.x, world.player.y) : '');
  els.district.textContent = district || '';
  els.street.textContent = street || '';
}

const CHARACTER_LABELS = { tammo: 'Tammo', anita: 'Anita' };
// short crop for Tammo, a ponytail for Anita (drawn over the head circle)
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
    els.character.closest('.hud-top-left').style.setProperty('--spk', HUD_ACCENT);
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
// shared renderer, cached per look); the drawn silhouette shows until then.
function setPortrait(img, ch, keyField) {
  const look = LOOKS[ch];
  const key = ch + JSON.stringify(look);
  if (els[keyField] === key) return;
  els[keyField] = key;
  renderSnapshot({ kind: 'person', look: { ...look }, frame: 'head' }, PORTRAIT_PX, PORTRAIT_PX, (url) => {
    if (els[keyField] !== key || !url) return;
    img.src = url;
    img.classList.add('on');
  }, { angle: PORTRAIT_ANGLE });
}

// "Anita rijdt mee": the companion's own small portrait while they are with you.
function updateMate(world) {
  const c = world.companion;
  const p = world.player;
  let text = '';
  if (c && !world.pigeonMode && !c.hidden) {
    const name = c.character === 'anita' ? 'Anita' : 'Tammo';
    if (p.inVehicle && c.inVehicle === p.inVehicle) text = `${name} ${p.inVehicle.isBike ? 'fietst' : p.inVehicle.isBoat ? 'vaart' : p.inVehicle.isHeli ? 'vliegt' : 'rijdt'} mee`;
    else if (!c.inVehicle && Math.hypot(c.x - p.x, c.y - p.y) < 30) text = `${name} loopt mee`;
  }
  const key = text && c.character + text;
  if (key === els.mateKey) return;
  const was = els.mateKey;
  els.mateKey = key;
  els.mate.hidden = !text;
  if (!text) return;
  els.mateTxt.textContent = text;
  els.mate.style.setProperty('--spk', HUD_ACCENT);
  setPortrait(els.mateImg, c.character === 'anita' ? 'anita' : 'tammo', 'mateLookKey');
  if (!was) { els.mate.classList.remove('in'); void els.mate.offsetWidth; els.mate.classList.add('in'); }
}

const clampPct = (v) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));
function updateBars(world) {
  const hp = Math.round(clampPct(world.health)), ar = Math.round(clampPct(world.armor));
  if (hp !== els.hpKey) {
    els.hpKey = hp;
    setGhostBar(els.healthFill, els.healthFill.previousElementSibling, hp);
    els.hpNum.textContent = hp;
    els.hpRow.setAttribute('aria-valuenow', hp);
    els.hpRow.classList.toggle('low', hp < 30 && hp > 0);
    els.portrait.classList.toggle('low', hp < 30);
  }
  if (ar !== els.arKey) {
    els.arKey = ar;
    setGhostBar(els.armorFill, els.armorFill.previousElementSibling, ar);
    els.arNum.textContent = ar;
    els.arRow.setAttribute('aria-valuenow', ar);
    els.arRow.classList.toggle('empty', ar <= 0);
  }
}

const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.5-4 6-.6z"/></svg>';
let wantedKey = '';
let wantedShown = 0;
function updateWanted(world) {
  const searching = !!(world.police && world.police.searching);
  const key = world.wanted + (searching ? 's' : '');
  if (key === wantedKey) return;
  wantedKey = key;
  if (!els.wanted.children.length) els.wanted.innerHTML = STAR.repeat(5);
  const stars = [...els.wanted.children];
  stars.forEach((st, i) => st.classList.toggle('on', i < world.wanted));
  // a new star pops in, one at a time
  for (let i = wantedShown; i < world.wanted; i++) pop(stars[i]);
  wantedShown = world.wanted;
  els.wanted.classList.toggle('searching', searching && world.wanted > 0);
  els.wanted.setAttribute('aria-label', `Gezocht: ${world.wanted} van 5${searching ? ', politie zoekt je' : ''}`);
}

export function getClockText(world) {
  const h = world && world.dayNight ? world.dayNight.hour : undefined;
  if (typeof h !== 'number' || !Number.isFinite(h)) return '';
  const total = Math.floor((((h % 24) + 24) % 24) * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const SUN_ICON = '<circle cx="12" cy="12" r="4.6"/><g stroke-width="2.2" stroke-linecap="round">' +
  [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
    const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180);
    return `<line x1="${(12 + c * 7.4).toFixed(1)}" y1="${(12 + s * 7.4).toFixed(1)}" x2="${(12 + c * 10).toFixed(1)}" y2="${(12 + s * 10).toFixed(1)}"/>`;
  }).join('') + '</g>';
const MOON_ICON = '<path d="M15.6 3.2a8.6 8.6 0 1 0 5.2 13.9A7.2 7.2 0 0 1 15.6 3.2z"/>';

function dayPart(h) {
  if (h < 6) return 'NACHT';
  if (h < 12) return 'OCHTEND';
  if (h < 18) return 'MIDDAG';
  return 'AVOND';
}

let clockShown = null;
let clockNight = null;
function updateClock(world) {
  const t = getClockText(world);
  els.clock.hidden = !t;
  if (t === clockShown) return;
  clockShown = t;
  const h = world.dayNight.hour;
  const night = (world.dayNight.night ?? 0) > 0.5;
  if (night !== clockNight) {
    clockNight = night;
    const icon = els.clock.querySelector('svg');
    icon.innerHTML = night ? MOON_ICON : SUN_ICON;
    els.clock.classList.toggle('night', night);
  }
  els.clock.querySelector('b').textContent = t;
  els.clock.querySelector('small').textContent = dayPart(h);
}

let lastHp = null;
let flash = 0;
function updateDamage(dt, world) {
  const hp = world.health + world.armor;
  if (document.body.classList.contains('intro-montage') || !cinematicAllowsDamageFx()) {
    // no blood screen in cutscenes, and no delayed flash for damage taken during one
    flash = 0;
    lastHp = hp;
    els.damage.style.opacity = '0';
    return;
  }
  if (lastHp != null && hp < lastHp - 0.5) flash = Math.min(1, flash + 0.35 + (lastHp - hp) / 30);
  lastHp = hp;
  flash = Math.max(0, flash - dt * 1.8);
  const low = world.health < 30 && world.health > 0 ? 0.35 + 0.15 * Math.sin(performance.now() / 260) : 0;
  const o = Math.max(flash, low);
  els.damage.style.opacity = o.toFixed(3);
}

// Speed and, for a vehicle that can break, its damage under the minimap.
function updateSpeedo(world) {
  const v = world.player.inVehicle || world.trainCam;
  els.speedo.classList.toggle('visible', !!v);
  document.body.classList.toggle('hud-in-vehicle', !!v);
  if (!v) { els.speedoKey = ''; return; }
  els.speedoValue.textContent = String(Math.round(Math.abs(v.speed || 0) * 3.6));
  const dmg = v === world.trainCam || !Number.isFinite(v.health) ? -1 : Math.round(clampPct(100 - v.health));
  const key = v.id + ':' + dmg;
  if (key === els.speedoKey) return;
  const was = Number(els.speedoKey.split(':')[1]);
  const fresh = !els.speedoKey.startsWith(v.id + ':');
  els.speedoKey = key;
  els.speedo.classList.toggle('no-dmg', dmg < 0);
  if (dmg < 0) return;
  els.speedo.classList.toggle('hurt', dmg >= 60);
  els.speedoDmgLabel.textContent = dmg >= 60 ? `Schade ${dmg}%` : 'Schade';
  if (fresh) els.speedoDmg.style.transition = 'none';
  els.speedoDmg.style.width = dmg + '%';
  if (fresh) { void els.speedoDmg.offsetWidth; els.speedoDmg.style.transition = ''; }
  else if (dmg > was + 4) pop(els.speedo);
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
    moneyTarget = target;
    els.moneyDelta.textContent = (deltaSum > 0 ? '+ €' : '− €') + Math.abs(deltaSum).toLocaleString('nl-NL');
    els.moneyDelta.dataset.sign = deltaSum > 0 ? 'plus' : 'min';
    els.moneyDelta.classList.add('visible');
  }
  if (deltaTimer > 0 && (deltaTimer -= dt) <= 0) els.moneyDelta.classList.remove('visible');
  const diff = moneyTarget - moneyShown;
  if (diff !== 0) {
    const step = Math.max(1, Math.abs(diff) * Math.min(1, dt * 5));
    moneyShown = Math.abs(diff) <= step ? moneyTarget : moneyShown + Math.sign(diff) * step;
  }
  els.money.textContent = '€' + Math.round(moneyShown).toLocaleString('nl-NL');
  els.money.classList.toggle('rolling', diff !== 0);
  const ammo = world.ammo ? world.ammo[world.weapon] : undefined;
  const weaponKey = WEAPON_ICONS[world.weapon] ? world.weapon : 'fists';
  const sub = weaponKey === 'fists' ? 'geen wapen' : ammo === undefined || NO_COUNT.has(world.weapon) ? 'slaan' : ammo === Infinity ? '∞' : String(ammo);
  if (els.weapon.dataset.key !== weaponKey) {
    els.weapon.dataset.key = weaponKey;
    els.weapon.innerHTML = `<svg class="hud-weapon-icon" viewBox="0 0 48 24" aria-hidden="true">${WEAPON_ICONS[weaponKey]}</svg><span class="hud-weapon-col"><span class="hud-weapon-text"></span><small class="hud-weapon-ammo"></small></span>`;
    els.weapon.classList.remove('switched');
    void els.weapon.offsetWidth;
    els.weapon.classList.add('switched');
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
// bijbaan's next goal, else "lose the police"), GTA style: the objective
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
  if (goal && !world.padelGame && !world.activityGame && !world.heliRun && !world.challenge && !(m && m.phase === 'active')) {
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
  if (g && g.name && !world.storyFreePlay && !world.padelGame && !world.activityGame && !(m && m.phase === 'active')) {
    const atMarker = m && (m.phase === 'idle' || m.phase === 'cooldown') && Math.hypot(m.marker.x - g.x, m.marker.y - g.y) < 4;
    const near = Math.hypot(g.x - world.player.x, g.y - world.player.y) < 40;
    const inside = atMarker && !m.armed && m.distanceToMarker < (m.triggerRadius || 4);
    const sub = g.buy ? (near ? 'Voor het verhaal: loop naar binnen (E)' : 'Volg de gele route naar de winkel')
      : inside ? 'Stap even uit de marker en weer terug'
      : atMarker ? (near ? 'Loop of rij de gele marker in' : 'Volg de gele route naar de marker') : 'Volg de gele route';
    return { kind: 'story', title: g.name, sub, timer: '' };
  }
  return null;
}

const OBJ_HINT_TIME = 6;
const GOAL_HINTS = 3;
let goalHints = 0;

function updateMission(world) {
  const o = currentObjective(world);
  els.mission.hidden = !o || (!o.title && !o.timer);
  if (els.mission.hidden) { els.objKey = ''; return; }
  const key = o.kind + '|' + o.title;
  if (key !== els.objKey) { els.objAt = world.time; if (o.kind === 'goal') goalHints++; }
  // a new objective first says how (the bijbaan's hint), then its counter
  const sub = o.hint && world.time - els.objAt < OBJ_HINT_TIME ? o.hint : o.sub;
  if (els.missionLabel.textContent !== o.title) els.missionLabel.textContent = o.title;
  if (els.missionProgress.textContent !== sub) els.missionProgress.textContent = sub;
  if (els.missionTimer.textContent !== o.timer) els.missionTimer.textContent = o.timer;
  if (key !== els.objKey) {
    els.objKey = key;
    els.mission.dataset.kind = o.kind;
    // a mission's objective stays up in pigeon mode too (H4's photos, H10's knots)
    els.mission.classList.toggle('in-mission', o.kind === 'mission');
    els.mission.classList.remove('pop');
    void els.mission.offsetWidth;
    els.mission.classList.add('pop');
    if (o.kind === 'goal') ring(els.mission);
  }
}

// missions.js leaves these fields set after a mission ends, so gate on the
// current type and phase instead of trusting their presence.
function missionProgressText(m) {
  if (m.phase !== 'active') return '';
  if (m.progressText) return m.progressText;
  if (m.raceHud) return '';
  if (m.type === 'rampage' && m.killTarget != null) return `Maak chaos · ${Math.max(0, m.killProgress || 0)}/${m.killTarget} neer`;
  if ((m.type === 'checkpoint' || m.type === 'boat') && m.wpTotal) {
    const cp = `Checkpoint ${Math.min(m.wpTotal, (m.wpIndex || 0) + 1)}/${m.wpTotal}`;
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

const NOW_PLAYING_TIME = 8;
function updateNowPlaying(world) {
  const np = world.nowPlaying;
  if (np && np !== els.npShown) {
    els.npShown = np;
    els.npArtist.textContent = np.artist || '';
    els.npTitle.textContent = np.title || '';
    els.nowPlaying.classList.remove('on');
    void els.nowPlaying.offsetWidth;
    els.nowPlaying.classList.add('on');
  }
  if (np && world.time - np.at > NOW_PLAYING_TIME) {
    els.nowPlaying.classList.remove('on');
    world.nowPlaying = null;
  }
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
export function drawMapIcon(ctx, kind, x, y, s = 1, opts = {}) {
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
      if (kind.startsWith('shop-')) drawShopMapIcon(ctx, kind.slice(5), s);
      else if (kind === 'pigeon') drawPigeonMapIcon(ctx, s);
      else if (kind === 'heli') drawHeliMapIcon(ctx, s);
      else if (kind === 'padel') drawPadelMapIcon(ctx, s);
      else if (kind.startsWith('act-')) drawActivityMapIcon(ctx, kind, s);
      else if (kind === 'pg-jelle' || kind === 'pg-fjord') drawPostgameMapIcon(ctx, kind.slice(3), s);
      else if (kind === 'station') drawStationMapIcon(ctx, s);
      else if (kind.startsWith('sj-')) drawSideJobMapIcon(ctx, kind, s, opts);
  }
  ctx.restore();
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

export function drawEdgeArrow(ctx, x, y, angle, color, s = 1) {
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
export function drawRoadRoute(ctx, pts, color, width = 4) {
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

const MM_ICON = 1.2;
// Static places: only the categories switched on in the map legend
// (mapfilters.js, shared with the full map), only the nearest few, only close by, drawn smaller and
// skipped where they would overlap something more important.
const MM_POI_ICON = 1.05;
const MM_POI_GAP_PX = 15;
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
  if (inVehicle) add('flitspaal', world.flitspaalen || [], 'flitspaal', 2);
  if (!inVehicle) add('duif', getPigeonSpotsForRender(), 'pigeon', 1);
  add('heli', getHeliSpotsForRender(), 'heli', 1, MM_POI_FAR_M);
  add('padel', getPadelSpotsForRender(), 'padel', 1, MM_POI_FAR_M);
  for (const a of activityMapIcons(world)) add(a.layer, [a], a.kind, 1, MM_POI_FAR_M);
  add('postgame', getPostgameSpotsForRender(), (q) => 'pg-' + q.kind, 2, MM_POI_FAR_M);
  add('horeca', getHorecaForRender(), 'horeca', 1);
  add('landmark', world.map.meta.landmarks || [], 'landmark', 2);

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
  for (const [kind, sx, sy] of drawn) drawMapIcon(ctx, kind, sx, sy, MM_POI_ICON, { t });
}

function drawMinimap(dt, world) {
  const ctx = els.mmCtx;
  const dpr = hudPixelRatio();
  const px = Math.round(MINIMAP_SIZE * dpr);
  if (els.mmCanvas.width !== px) els.mmCanvas.width = els.mmCanvas.height = px;
  const player = world.player;
  const t = performance.now() / 1000;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, els.mmCanvas.width, els.mmCanvas.height);

  const speed = player.inVehicle ? Math.abs(player.inVehicle.speed || 0) : 0;
  const targetScale = MM_SCALE - (MM_SCALE - MM_SCALE_FAST) * Math.min(1, speed / MM_FAST_SPEED);
  mmScale += (targetScale - mmScale) * Math.min(1, dt * 1.2);
  const MM_RADIUS_M = MINIMAP_SIZE / 2 / mmScale;

  const cx = MINIMAP_SIZE / 2, cy = MINIMAP_SIZE / 2;
  // The map rotates so the camera heading always points up; any world
  // angle plus mapRotation gives its on-screen angle.
  // a flying pigeon: its own heading (pigeonmode.js keeps player.angle on it)
  const mapRotation = -Math.PI / 2 - (world.pigeonMode ? player.angle : world.camYaw ?? player.angle);
  const cosR = Math.cos(mapRotation), sinR = Math.sin(mapRotation);
  ctx.translate(cx * dpr, cy * dpr);
  ctx.rotate(mapRotation);
  ctx.scale(mmScale * dpr, mmScale * dpr);
  ctx.translate(-player.x, -player.y);

  ctx.fillStyle = MINI_STYLE.meadow;
  ctx.fillRect(player.x - MM_RADIUS_M, player.y - MM_RADIUS_M, MM_RADIUS_M * 2, MM_RADIUS_M * 2);
  drawCountryMinimap(ctx, player.x - MM_RADIUS_M, player.y - MM_RADIUS_M, player.x + MM_RADIUS_M, player.y + MM_RADIUS_M, mmScale);

  const view = world.map.queryView(
    player.x - MM_RADIUS_M, player.y - MM_RADIUS_M,
    player.x + MM_RADIUS_M, player.y + MM_RADIUS_M
  );

  if (edgeDistance(player.x, player.y) < 0) drawNeighbourhoodBorders(ctx, dt, world, player, MM_RADIUS_M);

  ctx.fillStyle = MINI_STYLE.park;
  for (const g of view.green) fillPoly(ctx, g.pts);

  ctx.fillStyle = MINI_STYLE.water;
  for (const w of view.water) fillPoly(ctx, w.pts);

  for (const r of view.roads) {
    if (r.pts.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(r.pts[0][0], r.pts[0][1]);
    for (let i = 1; i < r.pts.length; i++) ctx.lineTo(r.pts[i][0], r.pts[i][1]);
    ctx.strokeStyle = r.cat === 'major' ? '#f0ede4' : r.cat === 'cycle' ? '#c9603f' : '#a8ada2';
    ctx.lineWidth = Math.max(r.width, 3);
    ctx.stroke();
  }
  drawRailsOnMap(ctx, world.map, player.x - MM_RADIUS_M, player.y - MM_RADIUS_M, player.x + MM_RADIUS_M, player.y + MM_RADIUS_M, 3.2);
  drawTrainsOnMap(ctx);

  const MM_BUILDING_COLORS = ['#b98a6a', '#9a8a7a', '#c9a876', '#8a96a0', '#a88a9a'];
  for (const b of view.buildings) {
    ctx.fillStyle = b.landmark ? '#8a8474' : MM_BUILDING_COLORS[Math.floor(mmHash(b.pts[0][0], b.pts[0][1]) * MM_BUILDING_COLORS.length)];
    fillPoly(ctx, b.pts);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const iconRangeM = MM_RADIUS_M - 5 / mmScale;
  const toScreen = (x, y) => {
    const dx = x - player.x, dy = y - player.y;
    return [cx + (dx * cosR - dy * sinR) * mmScale, cy + (dx * sinR + dy * cosR) * mmScale];
  };

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
  const showMission = !!(m && missionOnMap(world) && !job);
  if (showMission) reserve(m.marker.x, m.marker.y);
  if (wp) reserve(wp.x, wp.y);
  const showOwn = minimapShows('car');
  if (showOwn) for (const o of owned) reserve(o.x, o.y);
  const storyShop = storyTargetShop(world);
  const storyAt = storyShop && inRange(storyShop.x, storyShop.y) ? toScreen(storyShop.x, storyShop.y) : null;
  if (storyAt) placed.push(storyAt[0], storyAt[1]);
  drawMinimapPois(ctx, world, job, placed, inRange, toScreen, t);
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
    const kind = m.phase === 'active' ? 'missionActive' : 'missionIdle';
    if (!icon(kind, m.marker.x, m.marker.y)) missionEdge = edgeAngle(m.marker.x, m.marker.y);
  }

  let wpEdge = null;
  if (wp && !icon('userWaypoint', wp.x, wp.y)) wpEdge = edgeAngle(wp.x, wp.y);

  let heroEdge = null;
  if (showOwn) for (const o of owned) {
    if (!icon('own', o.x, o.y, { vkind: o.kind, color: o.color }) && o.hero) heroEdge = edgeAngle(o.x, o.y);
  }

  const c = world.companion;
  if (c && c.state !== 'dead' && !c.inVehicle && minimapShows('companion')) icon('companion', c.x, c.y);

  forEachPoliceUnit(world, (x, y, kind) => icon(kind, x, y));

  drawMapIcon(ctx, 'player', cx, cy, 1.35, { angle: player.angle + mapRotation });

  drawNorthIndicator(ctx, cx, cy, mapRotation + -Math.PI / 2);

  const edgeR = MINIMAP_SIZE / 2 - 11;
  if (heroEdge != null) {
    drawEdgeArrow(ctx, cx + Math.cos(heroEdge) * edgeR, cy + Math.sin(heroEdge) * edgeR, heroEdge, C.greenLight, 0.9);
  }
  if (jobEdge != null) {
    const s = 1 + (wp ? 0 : pulseAt(t) * 0.2);
    drawEdgeArrow(ctx, cx + Math.cos(jobEdge) * edgeR, cy + Math.sin(jobEdge) * edgeR, jobEdge, JOB_TARGET_COLOR, wp ? 0.8 : s);
  }
  if (missionEdge != null) {
    const s = 1 + (wp ? 0 : pulseAt(t) * 0.2);
    drawEdgeArrow(ctx, cx + Math.cos(missionEdge) * edgeR, cy + Math.sin(missionEdge) * edgeR, missionEdge, C.yellow, wp ? 0.8 : s);
  }
  if (wpEdge != null) {
    const s = 1 + pulseAt(t) * 0.2;
    drawEdgeArrow(ctx, cx + Math.cos(wpEdge) * edgeR, cy + Math.sin(wpEdge) * edgeR, wpEdge, ROUTE_COLORS.user, s);
  }
}

function drawNorthIndicator(ctx, cx, cy, screenAngle) {
  const R = MINIMAP_SIZE / 2 - 5;
  ctx.save();
  ctx.translate(cx + Math.cos(screenAngle) * R, cy + Math.sin(screenAngle) * R);
  ctx.rotate(screenAngle + Math.PI / 2);
  ctx.fillStyle = '#3fc97a';
  ctx.strokeStyle = '#0c140e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(-3.5, 3.5);
  ctx.lineTo(3.5, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // the letter from a cached bitmap: text on the rotated minimap each frame was costly
  const tf = ctx.getTransform();
  const dpr = Math.max(1, Math.round(Math.hypot(tf.a, tf.b)));
  if (!northGlyph || northGlyph.dpr !== dpr || (!northGlyph.font && document.fonts && document.fonts.check('bold 10px "Bebas Neue"'))) northGlyph = makeNorthGlyph(dpr);
  ctx.drawImage(northGlyph.c, -6, 0, 12, 12);
  ctx.restore();
}

let northGlyph = null;
function makeNorthGlyph(dpr) {
  const c = document.createElement('canvas');
  c.width = c.height = 12 * dpr;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.fillStyle = '#3fc97a';
  g.font = 'bold 10px "Bebas Neue", "Arial Narrow", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('N', 6, 6);
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
