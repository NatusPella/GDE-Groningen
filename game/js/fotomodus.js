// Fotomodus (#199): de regels achter pauzeren, vrije camera, scherptediepte,
// tijd van de dag, weer, filters en de lokale galerij. Puur: geen DOM, geen
// THREE, geen klok. Een laag erboven (HUD verbergen, camera, canvas.toBlob)
// leest en schrijft alleen deze toestand. Niets gaat het netwerk op: een foto
// is een bestand op de eigen schijf en in de galerij staat alleen een klein
// voorbeeld met metadata (gde-galerij-v1). Tests: scripts/fotomodus_test.mjs.

import { WEATHER_KINDS } from './weatherstate.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Filters: css-filter-waarden voor het canvas. Alles blijft zomer: geen
// filter maakt er winter van.
export const FILTERS = [
  { id: 'geen', naam: 'Geen filter', css: 'none' },
  { id: 'zomer', naam: 'Zomerzon', css: 'saturate(1.25) contrast(1.05) brightness(1.04) sepia(0.12)' },
  { id: 'ansichtkaart', naam: 'Ansichtkaart', css: 'saturate(1.4) contrast(0.95) brightness(1.08) hue-rotate(-6deg)' },
  { id: 'oudfoto', naam: 'Oude foto', css: 'sepia(0.7) contrast(1.1) brightness(0.98)' },
  { id: 'zwartwit', naam: 'Zwart-wit', css: 'grayscale(1) contrast(1.15)' },
  { id: 'gouduur', naam: 'Gouden uur', css: 'sepia(0.3) saturate(1.5) brightness(1.06) hue-rotate(-12deg)' },
  { id: 'lowpoly', naam: 'Extra plat', css: 'contrast(1.2) saturate(0.9)' },
];
export const FILTER_IDS = FILTERS.map((f) => f.id);

export const WEER_NAMEN = {
  helder: 'Helder', bewolkt: 'Bewolkt', mist: 'Mist', motregen: 'Motregen', regenbui: 'Regenbui', onweer: 'Onweer',
};

export const LIMITS = {
  fov: [20, 100],        // graden, verticaal
  dof: [0, 1],           // 0 = alles scherp
  focus: [0.5, 200],     // meter
  roll: [-0.5, 0.5],     // radialen, kleine kanteling
  height: [0.3, 60],     // m boven de grond
  roamRadius: 40000,     // m: de vrije camera is los van de speler; de rand van de wereld stopt hem (fotomodusui.js)
  speed: [0.5, 12],      // m/s
};

export function createPhoto(player = { x: 0, y: 0, z: 1.7 }, hour = 12) {
  return {
    active: false,
    hideHud: true,
    frozen: true,                         // wereld gepauzeerd terwijl je fotografeert
    origin: { x: player.x, y: player.y }, // waar de speler stond: de vrije camera blijft hierbij
    cam: { x: player.x, y: player.y, z: Math.max(player.z || 1.7, LIMITS.height[0]), yaw: 0, pitch: 0, roll: 0 },
    fov: 55, dof: 0, focus: 8,
    hour, weather: null,                  // null = laat het weer zoals het is
    filter: 'geen',
    grid: false,
  };
}

export function clampPhoto(p) {
  p.fov = clamp(p.fov, ...LIMITS.fov);
  p.dof = clamp(p.dof, ...LIMITS.dof);
  p.focus = clamp(p.focus, ...LIMITS.focus);
  p.cam.roll = clamp(p.cam.roll, ...LIMITS.roll);
  p.cam.pitch = clamp(p.cam.pitch, -1.45, 1.45);
  p.cam.z = clamp(p.cam.z, ...LIMITS.height);
  const dx = p.cam.x - p.origin.x, dy = p.cam.y - p.origin.y, d = Math.hypot(dx, dy);
  if (d > LIMITS.roamRadius) {
    p.cam.x = p.origin.x + (dx / d) * LIMITS.roamRadius;
    p.cam.y = p.origin.y + (dy / d) * LIMITS.roamRadius;
  }
  p.hour = ((p.hour % 24) + 24) % 24;
  if (p.weather !== null && !WEATHER_KINDS.includes(p.weather)) p.weather = null;
  if (!FILTER_IDS.includes(p.filter)) p.filter = 'geen';
  return p;
}

// inp: { fwd, right, up (-1..1), yawRate, pitchRate, boost } -> verplaatst de camera
export function stepFreeCam(p, inp, dt) {
  const v = LIMITS.speed[0] + (LIMITS.speed[1] - LIMITS.speed[0]) * (inp.boost ? 1 : 0.2);
  const c = p.cam;
  c.yaw += (inp.yawRate || 0) * dt;
  c.pitch += (inp.pitchRate || 0) * dt;
  const f = inp.fwd || 0, r = inp.right || 0;
  c.x += (Math.sin(c.yaw) * f + Math.cos(c.yaw) * r) * v * dt;
  c.y += (Math.cos(c.yaw) * f - Math.sin(c.yaw) * r) * v * dt;
  c.z += (inp.up || 0) * v * 0.6 * dt;
  return clampPhoto(p);
}

export const setFilter = (p, id) => { p.filter = FILTER_IDS.includes(id) ? id : 'geen'; return p; };
export const cycleFilter = (p, dir = 1) => {
  const i = FILTER_IDS.indexOf(p.filter);
  p.filter = FILTER_IDS[(i + dir + FILTER_IDS.length) % FILTER_IDS.length];
  return p;
};
export const filterCss = (p) => (FILTERS.find((f) => f.id === p.filter) || FILTERS[0]).css;

export function cycleWeather(p, dir = 1) {
  const order = [null, ...WEATHER_KINDS];
  const i = order.indexOf(p.weather);
  p.weather = order[(i + dir + order.length) % order.length];
  return p;
}
export const weatherLabel = (p) => (p.weather ? WEER_NAMEN[p.weather] || p.weather : 'Zoals het is');

export function hourLabel(h) {
  const hh = Math.floor(((h % 24) + 24) % 24), mm = Math.floor((h - Math.floor(h)) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// Scherptediepte: waas (0..1) van een punt op afstand d bij de focus van p.
export function blurAt(p, d) {
  if (p.dof <= 0) return 0;
  const k = Math.abs(d - p.focus) / Math.max(d, p.focus);
  return clamp(k * p.dof * 1.4, 0, 1);
}

// --- galerij ---------------------------------------------------------------------------------

export const GALLERY = { max: 24, thumbMax: 18000, key: 'gde-galerij-v1' };

const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').slice(0, n);

// Een regel in de galerij. thumb is een klein data:image-voorbeeld (mag leeg).
export function makeShot({ id, plaats = '', dagLabel = '', hour = 12, weather = null, filter = 'geen', thumb = '', file = '' }) {
  return {
    id: clean(id, 40),
    plaats: clean(plaats, 60), dagLabel: clean(dagLabel, 40),
    uur: hourLabel(hour),
    weer: weather && WEER_NAMEN[weather] ? weather : null,
    filter: FILTER_IDS.includes(filter) ? filter : 'geen',
    thumb: typeof thumb === 'string' && thumb.startsWith('data:image/') && thumb.length <= GALLERY.thumbMax ? thumb : '',
    file: clean(file, 120),
  };
}

export function addShot(list, shot) {
  return [shot, ...list.filter((s) => s.id !== shot.id)].slice(0, GALLERY.max);
}
export const removeShot = (list, id) => list.filter((s) => s.id !== id);

export function loadGallery(storage, key = GALLERY.key) {
  try {
    const raw = storage && storage.getItem(key);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((s) => s && typeof s.id === 'string').slice(0, GALLERY.max);
  } catch (e) { return []; }
}

// Opslaan mag nooit het spel breken; bij een volle schijf vallen eerst de
// voorbeeldjes weg, dan de oudste foto's.
export function saveGallery(storage, list, key = GALLERY.key) {
  if (!storage) return false;
  let cur = list.slice(0, GALLERY.max);
  for (let step = 0; step < 4; step++) {
    try { storage.setItem(key, JSON.stringify(cur)); return true; } catch (e) {
      if (step === 0) cur = cur.map((s) => ({ ...s, thumb: '' }));
      else cur = cur.slice(0, Math.max(1, Math.floor(cur.length / 2)));
    }
  }
  return false;
}

// Bestandsnaam: alleen veilige tekens, geen persoonsgegevens.
export function shotFileName(plaats, n) {
  const slug = clean(plaats, 40).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'groningen';
  return `gde-${slug}-${String(n).padStart(3, '0')}.png`;
}
