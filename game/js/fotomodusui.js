// Fotomodus (#199), de laag boven fotomodus.js: pauze, HUD weg, vrije camera
// (world.cameraOverride), filter, tijd en weer, de foto als bestand op de eigen
// schijf en het galerijscherm in het pauzemenu (Foto's). Geen netwerk: de foto
// gaat via een download-link naar de map van de speler, in de opslag staat alleen
// een klein voorbeeld (gde-galerij-v1). Toetsen: WASD lopen, pijlen kijken,
// Spatie/Ctrl omhoog/omlaag, Shift sneller, F filter, G raster, T weer,
// , en . tijd, [ en ] zoom, Enter/klik foto, Esc of F8 terug.
import * as F from './fotomodus.js';
import { getRenderer } from './scene3d.js';
import { storyDate } from './calendarday.js';
import { wijkProfileAt } from './trafficfleet.js';

let photo = null;
let saved = null;
let overlay = null;
let shoot = false;
let note = '';
let noteT = 0;
let counter = 0;
let lookDx = 0, lookDy = 0; // slepen met een vinger of muis (touch), in px sinds de vorige frame
const pointers = new Map();
let pinch = 0;
const keysDown = new Set();

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = () => { try { return window.localStorage; } catch (e) { return null; } };
export const isPhotoMode = () => !!photo;

function placeName(world) {
  try { return wijkProfileAt(world.map, world.player.x, world.player.y).wijk || 'Groningen'; } catch (e) { return 'Groningen'; }
}

function say(t) { note = t; noteT = 2.2; }

function onKey(e) {
  if (!photo) return;
  const k = e.key.toLowerCase();
  if (e.type === 'keyup') { keysDown.delete(k); return; }
  keysDown.add(k);
  if (k === 'escape' || k === 'f8') { stopPhotoMode(photo.world); e.stopImmediatePropagation(); e.preventDefault(); return; }
  if (e.repeat) { if (k === ',' || k === '.' || k === '[' || k === ']') stepSetting(k); return; }
  if (k === 'enter') shoot = true;
  else if (k === 'f') { F.cycleFilter(photo.p, e.shiftKey ? -1 : 1); say(F.FILTERS.find((x) => x.id === photo.p.filter).naam); }
  else if (k === 'g') photo.p.grid = !photo.p.grid;
  else if (k === 't') { F.cycleWeather(photo.p, 1); applyWeather(); say(`Weer: ${F.weatherLabel(photo.p)}`); }
  else stepSetting(k);
  if (['m', 'tab', 'p', 'v', 'r', 'o', 'n', 'u'].includes(k) || k === 'f' || k === 'g' || k === 't') e.stopImmediatePropagation();
}
function stepSetting(k) {
  const p = photo.p;
  if (k === ',') p.hour -= 0.25; else if (k === '.') p.hour += 0.25;
  else if (k === '[') p.fov += 3; else if (k === ']') p.fov -= 3;
  else return;
  F.clampPhoto(p);
  if (k === ',' || k === '.') photo.world.clock = p.hour;
}

function applyWeather() {
  const w = photo.world.weather;
  if (!w) return;
  const k = photo.p.weather;
  if (!k) { Object.assign(w, saved.weather); return; }
  const table = { helder: [0, 0, 0], bewolkt: [0, 0.7, 0], mist: [0, 0.4, 0.7], motregen: [0.3, 0.6, 0.1], regenbui: [0.6, 0.8, 0.1], onweer: [0.85, 1, 0.1] };
  const [rain, over, mist] = table[k] || table.helder;
  w.kind = k; w.intensity = rain; w.peak = rain; w.active = rain > 0.02; w.overcast = over; w.mist = mist;
}

export function startPhotoMode(world) {
  if (photo || !world || !world.player || world.player.ragdoll || world.cameraOverride || world.uiPaused) return false;
  const hour = typeof world.clock === 'number' ? world.clock : 12;
  const p = F.createPhoto({ x: world.player.x, y: world.player.y, z: (world.player.z || 0) + 1.7 }, hour);
  p.hour = hour; p.active = true;
  const pl = world.player;
  p.cam.yaw = typeof pl.angle === 'number' ? Math.PI / 2 - pl.angle : 0;
  p.cam.z = Math.max((pl.z || 0) + 3, 2);
  p.cam.z = Math.min(p.cam.z, F.LIMITS.height[1]);
  F.clampPhoto(p);
  photo = { p, world };
  saved = { clock: world.clock, weather: world.weather ? { ...world.weather } : null, uiPaused: !!world.uiPaused };
  world.uiPaused = true;
  document.body.classList.add('cine-hide-hud', 'foto-actief');
  buildOverlay();
  for (const t of ['keydown', 'keyup']) window.addEventListener(t, onKey, true);
  say('Fotomodus');
  return true;
}

export function stopPhotoMode(world) {
  if (!photo) return;
  const w = photo.world || world;
  for (const t of ['keydown', 'keyup']) window.removeEventListener(t, onKey, true);
  w.cameraOverride = null;
  w.uiPaused = saved.uiPaused;
  if (typeof saved.clock === 'number') w.clock = saved.clock;
  if (w.weather && saved.weather) Object.assign(w.weather, saved.weather);
  document.body.classList.remove('cine-hide-hud', 'foto-actief');
  const r = getRenderer();
  if (r) r.domElement.style.filter = '';
  if (overlay) { overlay.remove(); overlay = null; }
  photo = null; saved = null; shoot = false; keysDown.clear(); pointers.clear(); lookDx = lookDy = 0;
}

function buildOverlay() {
  overlay = document.createElement('div');
  overlay.id = 'foto-ui';
  overlay.innerHTML = '<div class="foto-look"></div><div class="foto-grid" hidden></div><div class="foto-pad">' +
    [['w', 'Vooruit'], ['s', 'Achteruit'], ['a', 'Links'], ['d', 'Rechts'], [' ', 'Omhoog'], ['control', 'Omlaag']].map(([k, l]) => `<button type="button" class="foto-btn foto-mv" data-foto-mv="${k}">${l}</button>`).join('') +
    '</div><div class="foto-bar"></div><div class="foto-note"></div>';
  wireTouch(overlay);
  overlay.addEventListener('click', (e) => { if (e.target.closest('[data-foto-stop]')) stopPhotoMode(); else if (e.target.closest('[data-foto-shoot]')) shoot = true; });
  document.body.appendChild(overlay);
}

// Touch (en muis): een vinger slepen kijkt rond, twee vingers knijpen zoomt, de knoppen onderin lopen.
function wireTouch(el) {
  const look = el.querySelector('.foto-look');
  look.addEventListener('pointerdown', (e) => { look.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); pinch = 0; });
  look.addEventListener('pointermove', (e) => {
    const q = pointers.get(e.pointerId);
    if (!q) return;
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      q.x = e.clientX; q.y = e.clientY;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch && photo) { photo.p.fov -= (d - pinch) * 0.15; F.clampPhoto(photo.p); }
      pinch = d;
      return;
    }
    lookDx += e.clientX - q.x; lookDy += e.clientY - q.y;
    q.x = e.clientX; q.y = e.clientY;
  });
  const up = (e) => { pointers.delete(e.pointerId); pinch = 0; };
  look.addEventListener('pointerup', up);
  look.addEventListener('pointercancel', up);
  el.querySelectorAll('[data-foto-mv]').forEach((b) => {
    const k = b.dataset.fotoMv;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); keysDown.add(k); });
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(t, () => keysDown.delete(k));
  });
}

const KEYBTN = (k, label) => `<span class="foto-key"><kbd>${k}</kbd> ${label}</span>`;

function renderBar() {
  const p = photo.p;
  const bar = overlay.querySelector('.foto-bar');
  bar.innerHTML =
    `<span class="foto-info">${esc(F.hourLabel(p.hour))} · ${esc(F.weatherLabel(p))} · ${esc(F.FILTERS.find((f) => f.id === p.filter).naam)} · beeldhoek ${Math.round(p.fov)}°</span>` +
    KEYBTN('Enter', 'Foto') + KEYBTN('F', 'Filter') + KEYBTN('T', 'Weer') + KEYBTN(', .', 'Tijd') + KEYBTN('[ ]', 'Inzoomen') + KEYBTN('G', 'Raster') +
    '<button type="button" class="foto-btn" data-foto-shoot>Foto maken</button><button type="button" class="foto-btn" data-foto-stop>Terug</button>';
  overlay.querySelector('.foto-grid').hidden = !p.grid;
  const n = overlay.querySelector('.foto-note');
  n.textContent = noteT > 0 ? note : '';
}

function pose(p) {
  const c = p.cam, cp = Math.cos(c.pitch);
  return {
    position: { x: c.x, y: c.y, z: c.z },
    lookAt: { x: c.x + Math.sin(c.yaw) * cp * 10, y: c.y + Math.cos(c.yaw) * cp * 10, z: c.z + Math.sin(c.pitch) * 10 },
    fov: p.fov, cut: true,
  };
}

// Elke frame, na update3D: camera sturen en een foto nemen als erom is gevraagd.
export function updatePhotoMode(dt, world) {
  if (!photo) return;
  const p = photo.p, w = world;
  const d = (k) => (keysDown.has(k) ? 1 : 0);
  F.stepFreeCam(p, {
    fwd: d('w') - d('s'), right: d('d') - d('a'), up: d(' ') - d('control'),
    yawRate: (d('arrowright') - d('arrowleft')) * 1.2 + lookDx * 0.004 / Math.max(0.001, Math.min(dt, 0.05)), pitchRate: (d('arrowup') - d('arrowdown')) * 0.9 - lookDy * 0.003 / Math.max(0.001, Math.min(dt, 0.05)),
    boost: keysDown.has('shift'),
  }, Math.min(dt, 0.05));
  lookDx = 0; lookDy = 0;
  w.cameraOverride = pose(p);
  const r = getRenderer();
  if (r) r.domElement.style.filter = F.filterCss(p);
  if (noteT > 0) noteT -= dt;
  if (shoot) { shoot = false; takeShot(world); }
  renderBar();
}

function takeShot(world) {
  const r = getRenderer();
  if (!r) return;
  const src = r.domElement;
  const out = document.createElement('canvas');
  out.width = src.width; out.height = src.height;
  const ctx = out.getContext('2d');
  ctx.filter = F.filterCss(photo.p);
  ctx.drawImage(src, 0, 0);
  const th = document.createElement('canvas');
  th.width = 160; th.height = Math.max(1, Math.round(160 * src.height / Math.max(1, src.width)));
  th.getContext('2d').drawImage(out, 0, 0, th.width, th.height);
  let thumb = '';
  try { thumb = th.toDataURL('image/jpeg', 0.5); } catch (e) { thumb = ''; }
  const st = store();
  const list = F.loadGallery(st);
  counter = Math.max(counter, list.length ? Number(list[0].id.replace(/\D/g, '').slice(-6)) || 0 : 0) + 1;
  const place = placeName(world);
  const file = F.shotFileName(place, counter);
  const shot = F.makeShot({ id: 'f' + counter, plaats: place, dagLabel: storyDate(world).long || '', hour: photo.p.hour, weather: photo.p.weather, filter: photo.p.filter, thumb, file });
  F.saveGallery(st, F.addShot(list, shot));
  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = file;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');
  say(`Opgeslagen als ${file}`);
}

// --- pauzemenu: sectie Foto's ---------------------------------------------------------------

export function renderFotoPanel(el) {
  const list = F.loadGallery(store());
  el.innerHTML =
    '<div class="foto-panel"><p class="foto-lead">Zet de wereld stil, loop met een vrije camera rond, kies een filter en het weer en maak een foto. ' +
    'De foto komt als bestand op je eigen schijf; er gaat niets het internet op.</p>' +
    '<button type="button" class="pm-primary" data-foto-start>Fotomodus starten</button>' +
    `<h3>Galerij (${list.length} van ${F.GALLERY.max})</h3>` +
    (list.length
      ? '<div class="foto-gal">' + list.map((s) =>
        `<figure>${s.thumb ? `<img src="${s.thumb}" alt="Foto in ${esc(s.plaats)}">` : '<div class="foto-leeg">Geen voorbeeld</div>'}` +
        `<figcaption><b>${esc(s.plaats)}</b><br>${esc(s.dagLabel)} ${esc(s.uur)}${s.weer ? ' · ' + esc(F.WEER_NAMEN[s.weer] || s.weer) : ''}<br><small>${esc(s.file)}</small>` +
        `<br><button type="button" class="pm-secondary" data-foto-del="${esc(s.id)}">Weghalen</button></figcaption></figure>`).join('') + '</div>'
      : '<p class="mut">Nog geen foto\'s. Het bestand zelf blijft staan als je een foto hier weghaalt.</p>') + '</div>';
}

// true als de klik van de fotomodus was
export function fotoClick(e, world, el, api = {}) {
  if (e.target.closest('[data-foto-start]')) {
    if (api.close) api.close();
    if (!startPhotoMode(world)) { world.addMessage && world.addMessage('Nu even niet: wacht tot het rustig is.', 2); }
    return true;
  }
  const del = e.target.closest('[data-foto-del]');
  if (del) {
    const st = store();
    F.saveGallery(st, F.removeShot(F.loadGallery(st), del.dataset.fotoDel));
    renderFotoPanel(el);
    return true;
  }
  return false;
}

export function wireFotoKey(world, canStart) {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F8' && !photo && (!canStart || canStart())) { e.preventDefault(); startPhotoMode(world); }
  });
}
