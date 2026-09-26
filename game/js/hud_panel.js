import { getGaragesForRender } from './garages.js';
import { minimapShows } from './mapfilters.js';
import { getHorecaForRender } from './horeca.js';
import { getShopsForRender, drawShopMapIcon, drawShopGlyph, SHOP_TYPES } from './shops.js';
import { getOwnedVehiclesForMap } from './ownedvehicles.js';
import { getPigeonSpotsForRender, drawPigeonMapIcon } from './pigeonspots.js';
import { getStationsForRender, drawStationMapIcon } from './stationtravel.js';
import { getSideJobSpotsForRender, drawSideJobMapIcon, JOB_TARGET_COLOR } from './sidejobs.js';
import { vehicleDisplayName } from './vehiclenames.js';
import { cinematicAllowsDamageFx } from './cinematics.js';
import { isMuted } from './audio.js';
import { drawRailsOnMap, drawTrainsOnMap } from './railway.js';
import { drawCountryMinimap, MINI_STYLE } from './countrymap.js';
import { getActiveRoute, getRouteAhead, getUserWaypoint, formatDistance } from './routing.js';
import { initPrompts, updatePrompts } from './prompts.js';
import { hudPixelRatio } from './uiscale.js';

const MINIMAP_SIZE = 230;
const MM_SCALE = 1.45; // px per meter (css pixels) when standing still
const MM_SCALE_FAST = 0.62;
const MM_FAST_SPEED = 28;
let mmScale = MM_SCALE;

// GTA-style: purple for your own waypoint, yellow for missions, orange for side jobs
export const ROUTE_COLORS = { user: '#c068ff', mission: '#e8c93a', job: '#ff9a3c' };

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
    '<div class="hud-character"></div>' +
    '<div class="hud-bar"><div class="hud-bar-fill health"></div></div>' +
    '<div class="hud-bar"><div class="hud-bar-fill armor"></div></div>' +
    '<div class="hud-mute" role="status" aria-label="Geluid uit" title="Geluid uit (U)" hidden>🔇</div>';
  root.appendChild(topLeft);

  const topRight = document.createElement('div');
  topRight.className = 'hud-top-right';
  topRight.innerHTML =
    '<div class="hud-clock" role="timer" aria-label="Tijd in het spel"><svg class="hud-clock-icon" viewBox="0 0 24 24" aria-hidden="true"></svg><b></b><small></small></div>' +
    '<div class="hud-wanted"></div>' +
    '<div class="hud-money"></div>' +
    '<div class="hud-money-delta"></div>' +
    '<div class="hud-weapon"></div>';
  root.appendChild(topRight);

  const damage = document.createElement('div');
  damage.className = 'hud-damage';
  root.insertBefore(damage, root.firstChild);

  const speedo = document.createElement('div');
  speedo.className = 'hud-speedo';
  speedo.innerHTML = '<b></b><span>km/u</span>';
  root.appendChild(speedo);

  const vehName = document.createElement('div');
  vehName.className = 'hud-vehname';
  vehName.setAttribute('aria-live', 'polite');
  vehName.innerHTML = '<small></small><b></b>';
  root.appendChild(vehName);

  const mission = document.createElement('div');
  mission.className = 'hud-mission';
  mission.innerHTML = '<div class="hud-mission-label"></div><div class="hud-mission-progress"></div><div class="hud-mission-timer"></div>';
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

  const toasts = document.createElement('div');
  toasts.className = 'hud-toasts';
  toasts.setAttribute('aria-live', 'polite');
  root.appendChild(toasts);

  const location = document.createElement('div');
  location.className = 'hud-location';
  location.innerHTML = '<div class="hud-district"></div><div class="hud-street"></div>';
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
    mute: topLeft.querySelector('.hud-mute'),
    wanted: topRight.querySelector('.hud-wanted'),
    clock: topRight.querySelector('.hud-clock'),
    money: topRight.querySelector('.hud-money'),
    moneyDelta: topRight.querySelector('.hud-money-delta'),
    damage,
    speedo,
    speedoValue: speedo.querySelector('b'),
    weapon: topRight.querySelector('.hud-weapon'),
    mission,
    vehName,
    missionLabel: mission.querySelector('.hud-mission-label'),
    missionProgress: mission.querySelector('.hud-mission-progress'),
    missionTimer: mission.querySelector('.hud-mission-timer'),
    district: location.querySelector('.hud-district'),
    street: location.querySelector('.hud-street'),
    toasts,
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
  updateCharacter(world);
  updateBars(world);
  els.mute.hidden = !isMuted();
  updateWanted(world);
  updateMoneyWeapon(dt, world);
  updateClock(world);
  updateDamage(dt, world);
  updateSpeedo(world);
  updateMission(world);
  updateRaceHud(world);
  updateToasts(world);
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
    text = `${kind === 'user' ? 'Bestemming' : kind === 'job' ? 'Klus' : 'Missie'}: ${formatDistance(route.remaining)}`;
  } else if (!route && getUserWaypoint()) {
    const wp = getUserWaypoint();
    kind = 'user';
    text = `Bestemming: ${formatDistance(Math.hypot(wp.x - world.player.x, wp.y - world.player.y))}`;
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
  const district = currentDistrict(world);
  const rp = world.map.nearestRoadPoint(world.player.x, world.player.y, 60, false);
  const street = rp && rp.road && rp.road.name;
  els.district.textContent = district || '';
  els.street.textContent = street || '';
}

const CHARACTER_LABELS = { tammo: 'Tammo', anita: 'Anita' };

function updateCharacter(world) {
  els.character.textContent = CHARACTER_LABELS[world.player.character] || 'Tammo';
}

function updateBars(world) {
  els.healthFill.style.width = Math.max(0, Math.min(100, world.health)) + '%';
  els.healthFill.classList.toggle('low', world.health < 30);
  els.armorFill.style.width = Math.max(0, Math.min(100, world.armor)) + '%';
}

let wantedKey = '';
function updateWanted(world) {
  const searching = !!(world.police && world.police.searching);
  const key = world.wanted + (searching ? 's' : '');
  if (key === wantedKey) return;
  wantedKey = key;
  let html = '';
  for (let i = 0; i < 5; i++) {
    html += i < world.wanted ? '<span class="on">★</span>' : '<span class="off">★</span>';
  }
  els.wanted.innerHTML = html;
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

function updateSpeedo(world) {
  const v = world.player.inVehicle || world.trainCam;
  els.speedo.classList.toggle('visible', !!v);
  if (!v) return;
  els.speedoValue.textContent = String(Math.round(Math.abs(v.speed || 0) * 3.6));
}

const WEAPON_LABELS = { fists: 'VUISTEN', pistol: 'PISTOOL', uzi: 'UZI', shotgun: 'HAGELGEWEER' };
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
  const ammoText = ammo === undefined ? '' : ammo === Infinity ? ' ∞' : ' ' + ammo;
  const weaponKey = WEAPON_ICONS[world.weapon] ? world.weapon : 'fists';
  if (els.weapon.dataset.key !== weaponKey) {
    els.weapon.dataset.key = weaponKey;
    els.weapon.innerHTML = `<svg class="hud-weapon-icon" viewBox="0 0 48 24" aria-hidden="true">${WEAPON_ICONS[weaponKey]}</svg><span class="hud-weapon-text"></span>`;
    els.weapon.classList.remove('switched');
    void els.weapon.offsetWidth;
    els.weapon.classList.add('switched');
  }
  const label = (WEAPON_LABELS[world.weapon] || 'VUISTEN') + ammoText;
  const textEl = els.weapon.querySelector('.hud-weapon-text');
  if (textEl.textContent !== label) textEl.textContent = label;
}

function updateMission(world) {
  const m = world.mission;
  const job = world.sideJob;
  if (job && job.active) {
    const timer = job.timeLeft != null ? Math.ceil(job.timeLeft) + 's' : '';
    if (els.missionLabel.textContent) els.missionLabel.textContent = '';
    if (els.missionProgress.textContent !== job.progress) els.missionProgress.textContent = job.progress;
    if (els.missionTimer.textContent !== timer) els.missionTimer.textContent = timer;
    els.mission.hidden = !job.progress && !timer;
    return;
  }
  if (!m) {
    els.missionLabel.textContent = '';
    els.missionProgress.textContent = '';
    els.missionTimer.textContent = '';
    els.mission.hidden = true;
    return;
  }
  // no permanent objective title at the top: the minimap already shows the
  // mission distance; only a live counter/timer appears during a mission
  els.missionLabel.textContent = '';
  els.missionProgress.textContent = missionProgressText(m);
  // race-like runs show their clock in the race panel instead
  els.missionTimer.textContent = m.phase === 'active' && m.timeLeft != null && !m.raceHud ? Math.ceil(m.timeLeft) + 's' : '';
  els.mission.hidden = !els.missionProgress.textContent && !els.missionTimer.textContent;
}

// missions.js leaves these fields set after a mission ends, so gate on the
// current type and phase instead of trusting their presence.
function missionProgressText(m) {
  if (m.phase !== 'active') return '';
  if (m.progressText) return m.progressText;
  if (m.raceHud) return '';
  if (m.type === 'rampage' && m.killTarget != null) return `Kills: ${Math.max(0, m.killProgress || 0)}/${m.killTarget}`;
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
  const r = m && m.phase === 'active' && !(world.sideJob && world.sideJob.active) ? m.raceHud : null;
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

// Only touch the DOM when the list changes, so the aria-live region
// doesn't get re-announced every frame.
let lastToastHtml = '';
function updateToasts(world) {
  world.messages = world.messages.filter((m) => m.until >= world.time);
  const html = world.messages
    .filter((m) => m.text !== 'DOOD' && m.text !== 'OPGEPAKT')
    .map((m) => `<div class="hud-toast">${escapeHtml(m.text)}</div>`)
    .join('');
  if (html === lastToastHtml) return;
  lastToastHtml = html;
  els.toasts.innerHTML = html;
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
    case 'waypoint': {
      ctx.beginPath();
      ctx.arc(0, 0, 2.4 * s, 0, Math.PI * 2);
      ctx.fillStyle = C.yellowHalf;
      ctx.fill();
      break;
    }
    case 'own': {
      // owned vehicle: badge in its own paint with a green 'yours' ring
      const glyph = { car: 'auto', bike: 'fietsen', scooter: 'fietsen', boat: 'boot' }[opts.vkind] || 'auto';
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
    case 'police': {
      // flashing police shield
      const blue = Math.floor(t * 6) % 2 === 1;
      ctx.beginPath();
      ctx.moveTo(0, -4.4 * s);
      ctx.lineTo(3.8 * s, -3 * s);
      ctx.quadraticCurveTo(3.6 * s, 2.4 * s, 0, 4.6 * s);
      ctx.quadraticCurveTo(-3.6 * s, 2.4 * s, -3.8 * s, -3 * s);
      ctx.closePath();
      ctx.fillStyle = blue ? C.policeBlue : C.red;
      ctx.fill();
      outline(ctx, s, C.dark, 1.2);
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

export function forEachPoliceUnit(world, fn) {
  for (const v of world.vehicles) {
    if (v.isPolice && !v.hijacked && !v.wrecked) fn(v.x, v.y);
  }
  for (const p of world.pedestrians) {
    if (p.isCop && p.state !== 'dead') fn(p.x, p.y);
  }
  if (world.policeHeli) fn(world.policeHeli.x, world.policeHeli.y);
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
  if (!job) add('bijbaan', getSideJobSpotsForRender(), (sj) => 'sj-' + sj.job.id, 2, MM_POI_FAR_M);
  add('trein', getStationsForRender(), 'station', 1, MM_POI_FAR_M);
  if (inVehicle) add('flitspaal', world.flitspaalen || [], 'flitspaal', 2);
  if (!inVehicle) add('duif', getPigeonSpotsForRender(), 'pigeon', 1);
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
  const mapRotation = -Math.PI / 2 - (world.camYaw ?? player.angle);
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

  drawNeighbourhoodBorders(ctx, dt, world, player, MM_RADIUS_M);

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

  const route = getActiveRoute();
  const ahead = route && getRouteAhead(MM_RADIUS_M * 2.5);
  if (ahead && ahead.length > 1) {
    drawRoadRoute(ctx, [[player.x, player.y], ...ahead].map(([x, y]) => toScreen(x, y)), ROUTE_COLORS[route.kind] || ROUTE_COLORS.user, 4);
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
  const showMission = !!(m && m.marker && m.phase !== 'cooldown' && !job && minimapShows('mission'));
  if (showMission) reserve(m.marker.x, m.marker.y);
  if (wp) reserve(wp.x, wp.y);
  const showOwn = minimapShows('car');
  if (showOwn) for (const o of owned) reserve(o.x, o.y);
  drawMinimapPois(ctx, world, job, placed, inRange, toScreen, t);


  let missionEdge = null, jobEdge = null;
  if (job) {
    for (const d of job.dots) icon('sj-dot', d.x, d.y);
    if (job.marker && !icon('sj-target', job.marker.x, job.marker.y)) jobEdge = edgeAngle(job.marker.x, job.marker.y);
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

  forEachPoliceUnit(world, (x, y) => icon('police', x, y));

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
  ctx.font = 'bold 10px "Bebas Neue", "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', 0, 6);
  ctx.restore();
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
