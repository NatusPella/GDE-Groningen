// Fotomodus (#199), de laag boven fotomodus.js: pauze, HUD weg, vrije camera
// (world.cameraOverride), filter, tijd en weer, de foto als bestand op de eigen
// schijf en het galerijscherm in het pauzemenu (Foto's). Geen netwerk: de foto
// gaat via een download-link naar de map van de speler, in de opslag staat alleen
// een klein voorbeeld (gde-galerij-v1). Toetsen: WASD lopen, pijlen kijken,
// Spatie/Ctrl omhoog/omlaag, Shift sneller, F filter, G raster, T weer,
// , en . tijd, [ en ] zoom, C en V kantelen, H terug bij Tammo, Z en X
// scherptediepte, Enter/klik foto, Esc of F8 terug.
import { icoon } from './icons.js';
import * as F from './fotomodus.js';
import { glyphHtml, keyLabelHtml, braceKeysHtml } from './keycap.js';
import { getRenderer } from './scene3d.js';
import { storyDate } from './calendarday.js';
import { wijkProfileAt } from './trafficfleet.js';
import { inProvinceData } from './provinceworld.js';
import { zachtePauze, meerSpelers } from './coopgroep.js';
import { registerMusicProbe } from './scenariomusic.js';
import { hoofdspeler } from './players.js'; // de speler van dit apparaat (#500)
import { calmState } from './dsmicro.js';
import { escapeHtml as esc } from './htmlescape.js';

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

const store = () => { try { return window.localStorage; } catch (e) { return null; } };
export const isPhotoMode = () => !!photo;
registerMusicProbe('foto', () => !!photo); // de eigen muziek van de fotomodus (thuis_loop)

function placeName(world) {
  try { const p = hoofdspeler(world); return wijkProfileAt(world.map, p.x, p.y).wijk || 'Groningen'; } catch (e) { return 'Groningen'; }
}

function say(t) { note = t; noteT = 2.2; }

function onKey(e) {
  if (!photo) return;
  const k = e.key.toLowerCase();
  if (e.type === 'keyup') { keysDown.delete(k); return; }
  keysDown.add(k);
  if (k === 'escape' || k === 'f8') { stopPhotoMode(photo.world); e.stopImmediatePropagation(); e.preventDefault(); return; }
  if (e.repeat) { if (',.[]cvzx'.includes(k) && k.length === 1 && !(photo.sessie && (k === ',' || k === '.'))) stepSetting(k); return; }
  if (k === 'enter') shoot = true;
  else if (k === 'f') { F.cycleFilter(photo.p, e.shiftKey ? -1 : 1); say(F.FILTERS.find((x) => x.id === photo.p.filter).naam); }
  else if (k === 'g') photo.p.grid = !photo.p.grid;
  else if (k === 'h') { F.resetFreeCam(photo.p); say('Camera weer bij Tammo'); }
  else if ((k === 't' || k === ',' || k === '.') && photo.sessie) say('Tijd en weer staan vast in Samen spelen');
  else if (k === 't') { F.cycleWeather(photo.p, 1); applyWeather(); say(`Weer: ${F.weatherLabel(photo.p)}`); }
  else stepSetting(k);
  if (['m', 'tab', 'p', 'v', 'c', 'e', 'q', 'r', 'o', 'n', 'u', 'h'].includes(k) || k === 'f' || k === 'g' || k === 't') e.stopImmediatePropagation();
}
function stepSetting(k) {
  const p = photo.p;
  if (k === ',') p.hour -= 0.25; else if (k === '.') p.hour += 0.25;
  else if (k === '[') p.fov += 3; else if (k === ']') p.fov -= 3;
  else if (k === 'c') p.cam.roll -= 0.03; else if (k === 'v') p.cam.roll += 0.03; // kantelen op C en V: E is in het spel instappen (#435)
  else if (k === 'z') p.dof -= 0.1; else if (k === 'x') p.dof += 0.1;
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

function startPhotoMode(world) {
  const pl = hoofdspeler(world); // de camera begint bij het eigen lichaam (#500)
  if (photo || !pl || pl.ragdoll || world.cameraOverride || world.uiPaused) return false;
  const hour = typeof world.clock === 'number' ? world.clock : 12;
  const p = F.createPhoto({ x: pl.x, y: pl.y, z: pl.z || 0 }, hour);
  p.hour = hour; p.active = true;
  p.cam.yaw = typeof pl.angle === 'number' ? Math.PI / 2 - pl.angle : 0;
  p.cam.z = Math.max((pl.z || 0) + 3, 2);
  p.cam.z = Math.min(p.cam.z, F.LIMITS.height[1]);
  F.clampPhoto(p);
  photo = { p, world, sessie: meerSpelers(world) }; // met meer spelers loopt de wereld door: tijd en weer zijn van iedereen en blijven staan (#452)
  saved = { clock: world.clock, weather: world.weather ? { ...world.weather } : null, uiPaused: !!world.uiPaused };
  world.uiPaused = true;
  zachtePauze(world, 'fotomodus', true);
  document.body.classList.add('cine-hide-hud', 'foto-actief');
  buildOverlay();
  for (const t of ['keydown', 'keyup']) window.addEventListener(t, onKey, true);
  say('Fotomodus · vrije camera, {H} terug bij Tammo');
  return true;
}

function stopPhotoMode(world) {
  if (!photo) return;
  const w = photo.world || world;
  for (const t of ['keydown', 'keyup']) window.removeEventListener(t, onKey, true);
  w.cameraOverride = null;
  w.uiPaused = saved.uiPaused;
  zachtePauze(w, 'fotomodus', false);
  if (!photo.sessie && typeof saved.clock === 'number') w.clock = saved.clock;
  if (!photo.sessie && w.weather && saved.weather) Object.assign(w.weather, saved.weather);
  document.body.classList.remove('cine-hide-hud', 'foto-actief');
  const r = getRenderer();
  if (r) { r.domElement.style.filter = ''; r.domElement.style.transform = ''; }
  if (overlay) { overlay.remove(); overlay = null; }
  photo = null; saved = null; shoot = false; keysDown.clear(); pointers.clear(); lookDx = lookDy = 0;
}

function buildOverlay() {
  barInfo = '';
  overlay = document.createElement('div');
  overlay.id = 'foto-ui';
  overlay.innerHTML = '<div class="foto-look"></div><div class="foto-grid" hidden></div><div class="foto-dof" hidden></div><div class="foto-pad">' +
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

// Every key of a photo-mode hint is an icon (keycap.js): a label with spaces is several keys, 'Muis slepen' and 'Pijlen' are icons of their own.
const FOTO_ICONS = { 'Muis slepen': 'MOUSE', Pijlen: 'ARROWS', 'W A S D': 'WASD' };
const fotoKeys = (k) => (FOTO_ICONS[k] ? glyphHtml(FOTO_ICONS[k]) : k.split(' ').map(keyLabelHtml).join(''));
const KEYBTN = (k, label) => `<span class="foto-key"><span class="foto-kc" style="display:inline-flex;gap:2px;vertical-align:middle">${fotoKeys(k)}</span> ${label}</span>`;

// De knoppenbalk onderin (#435): een infostrook, twee rijen toetsen (bewegen, instellen) en twee knoppen.
// Staat één keer in de overlay: alleen de infostrook wisselt per frame, zodat een klik op een knop niet onder de muis wegvalt.
const BAR_HTML =
  '<div class="foto-info" aria-live="off"></div>' +
  '<div class="foto-row foto-row-move"><span class="foto-lbl">Vrije camera</span>' + KEYBTN('W A S D', 'Lopen') + KEYBTN('Muis slepen', 'Kijken') + KEYBTN('Pijlen', 'Kijken') + KEYBTN('Spatie', 'Omhoog') + KEYBTN('Ctrl', 'Omlaag') + KEYBTN('Shift', 'Sneller') + KEYBTN('H', 'Bij Tammo') + '</div>' +
  '<div class="foto-row"><span class="foto-lbl">Beeld</span>' + KEYBTN('F', 'Filter') + KEYBTN('T', 'Weer') + KEYBTN(', .', 'Tijd') + KEYBTN('[ ]', 'Inzoomen') + KEYBTN('C V', 'Kantelen') + KEYBTN('Z X', 'Scherpte') + KEYBTN('G', 'Raster') + '</div>' +
  '<div class="foto-acts"><button type="button" class="foto-btn foto-go" data-foto-shoot>Foto maken <span class="foto-kc" style="display:inline-flex;vertical-align:middle">' + keyLabelHtml('Enter') + '</span></button><button type="button" class="foto-btn" data-foto-stop>Terug <span class="foto-kc" style="display:inline-flex;vertical-align:middle">' + keyLabelHtml('Esc') + '</span></button></div>';

let barInfo = '';
function renderBar() {
  const p = photo.p;
  const bar = overlay.querySelector('.foto-bar');
  if (!bar.firstChild) bar.innerHTML = BAR_HTML;
  const info = `${F.hourLabel(p.hour)} · ${F.weatherLabel(p)} · ${F.FILTERS.find((f) => f.id === p.filter).naam} · beeldhoek ${Math.round(p.fov)}°${p.cam.roll ? ` · kanteling ${Math.round(p.cam.roll * 57.3)}°` : ''}${p.dof > 0 ? ` · scherpte ${Math.round(p.dof * 10)}` : ''}`;
  if (info !== barInfo) { barInfo = info; bar.querySelector('.foto-info').textContent = info; }
  overlay.querySelector('.foto-grid').hidden = !p.grid;
  const dof = overlay.querySelector('.foto-dof');
  dof.hidden = p.dof <= 0;
  if (p.dof > 0) dof.style.setProperty('--foto-dof', `${(p.dof * 7).toFixed(1)}px`);
  const n = overlay.querySelector('.foto-note');
  n.textContent = noteT > 0 ? note : '';
}

// kanteling: de kaart draait en wordt net genoeg vergroot dat de hoeken gevuld blijven
function rollCss(p) {
  const a = p.cam.roll;
  if (!a) return '';
  const ar = (window.innerWidth || 16) / Math.max(1, window.innerHeight || 9);
  const s = Math.cos(Math.abs(a)) + Math.sin(Math.abs(a)) * Math.max(ar, 1 / ar);
  return `rotate(${a}rad) scale(${s.toFixed(3)})`;
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
  // een cutscene of banner die eindigt haalt de HUD-klasse weg: in de fotomodus blijft de HUD verborgen
  if (!document.body.classList.contains('cine-hide-hud')) document.body.classList.add('cine-hide-hud');
  const d = (k) => (keysDown.has(k) ? 1 : 0);
  const vorige = { x: p.cam.x, y: p.cam.y };
  F.stepFreeCam(p, {
    fwd: d('w') - d('s'), right: d('d') - d('a'), up: d(' ') - d('control'),
    yawRate: (d('arrowright') - d('arrowleft')) * 1.2 + lookDx * 0.004 / Math.max(0.001, Math.min(dt, 0.05)), pitchRate: (d('arrowup') - d('arrowdown')) * 0.9 - lookDy * 0.003 / Math.max(0.001, Math.min(dt, 0.05)),
    boost: keysDown.has('shift'),
  }, Math.min(dt, 0.05));
  lookDx = 0; lookDy = 0;
  // de camera is los van Tammo, maar blijft in de wereld: buiten de data of onder de grond kan ze niet
  if (inProvinceData(p.cam.x, p.cam.y) === false) { p.cam.x = vorige.x; p.cam.y = vorige.y; }
  try {
    const g = w.map && w.map.groundHeightAt ? w.map.groundHeightAt(p.cam.x, p.cam.y, 0) : 0;
    if (Number.isFinite(g) && p.cam.z < g + 0.8) p.cam.z = g + 0.8;
  } catch (e) { /* zonder hoogte blijft de laagste stand van clampPhoto */ }
  w.cameraOverride = pose(p);
  const r = getRenderer();
  if (r) { r.domElement.style.filter = F.filterCss(p); r.domElement.style.transform = rollCss(p); }
  if (noteT > 0) noteT -= dt;
  if (shoot) { shoot = false; takeShot(world); }
  renderBar();
}

// dezelfde waas als op het scherm: scherp in het midden, zachter naar de randen
function blurEdges(cv, dof) {
  const tmp = document.createElement('canvas');
  tmp.width = cv.width; tmp.height = cv.height;
  const t = tmp.getContext('2d');
  t.filter = `blur(${(dof * 7 * cv.width / Math.max(1, window.innerWidth || cv.width)).toFixed(1)}px)`;
  t.drawImage(cv, 0, 0);
  t.filter = 'none';
  t.globalCompositeOperation = 'destination-in';
  const g = t.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.22, cv.width / 2, cv.height / 2, cv.height * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  t.fillStyle = g; t.fillRect(0, 0, cv.width, cv.height);
  cv.getContext('2d').drawImage(tmp, 0, 0);
}

// Een korte witte flits als de sluiter klikt (juice). Alleen als beweging mag; bij Beweging beperken of Rustig drukwerk blijft het weg.
function flits() {
  if (!overlay || calmState()) return;
  const d = document.createElement('div');
  d.className = 'foto-flits';
  d.setAttribute('aria-hidden', 'true');
  d.style.cssText = 'position:fixed;inset:0;background:var(--ds-c-creme);opacity:0.55;pointer-events:none;z-index:2147483000;transition:opacity 0.24s ease-out';
  overlay.appendChild(d);
  requestAnimationFrame(() => { d.style.opacity = '0'; });
  setTimeout(() => d.remove(), 360);
}

function takeShot(world) {
  const r = getRenderer();
  if (!r) return;
  const src = r.domElement;
  const out = document.createElement('canvas');
  out.width = src.width; out.height = src.height;
  const ctx = out.getContext('2d');
  ctx.filter = F.filterCss(photo.p);
  const a = photo.p.cam.roll;
  if (a) {
    const ar = out.width / out.height, sc = Math.cos(Math.abs(a)) + Math.sin(Math.abs(a)) * Math.max(ar, 1 / ar);
    ctx.translate(out.width / 2, out.height / 2); ctx.rotate(a); ctx.scale(sc, sc); ctx.translate(-out.width / 2, -out.height / 2);
  }
  ctx.drawImage(src, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (photo.p.dof > 0) blurEdges(out, photo.p.dof);
  const th = document.createElement('canvas');
  th.width = 160; th.height = Math.max(1, Math.round(160 * src.height / Math.max(1, src.width)));
  th.getContext('2d').drawImage(out, 0, 0, th.width, th.height);
  let thumb = '';
  try { thumb = th.toDataURL('image/jpeg', 0.5); } catch (e) { thumb = ''; }
  const st = store();
  const list = F.loadGallery(st);
  counter = F.volgendNummer(list, counter); // boven alle nummers in de galerij: een weggehaalde nieuwste foto geeft geen dubbele bestandsnaam
  const place = placeName(world);
  const file = F.shotFileName(place, counter);
  const shot = F.makeShot({ id: 'f' + counter, plaats: place, dagLabel: storyDate(world).long || '', hour: photo.p.hour, weather: photo.p.weather, filter: photo.p.filter, thumb, file });
  F.saveGallery(st, F.addShot(list, shot));
  out.toBlob((blob) => {
    if (!blob) { say('Het bestand bewaren lukte niet. Probeer het nog eens.'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = file;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');
  flits();
  const noot = F.galerijNoot(list.length);
  say(`Opgeslagen als ${file}${noot ? '. ' + noot : ''}`);
}

// --- pauzemenu: sectie Foto's ---------------------------------------------------------------

const CAM = icoon('camera'); // F6: Phosphor via icons.js

// De stijl van Foto's woont bij deze module, net als bij Prestaties en Veroverd: alleen de
// bestaande tokens en lettertypen van het menu. Hero bovenaan, de galerij als echte galerij
// (beeld boven, bijschrift in lagen, Weghalen klein in de hoek) en de uitleg open in een
// compacte strook in plaats van achter een vouw (#980).
const FOTO_CSS = `
#pause-menu .foto-hero { margin: 0 24px 14px; flex: none; }
#pause-menu .foto-ongedaan { margin: 0 24px 14px; flex: none; flex-direction: row; align-items: center; justify-content: space-between; gap: var(--ds-s-3); }
#pause-menu .foto-ongedaan .ds-z-knop { min-height: var(--ds-doel-aanraken); font-size: var(--ds-t-label); }
#pause-menu .foto-hero .ds-z-kaart__tekst { max-width: 640px; }
#pause-menu .foto-inhoud { display: flex; flex: none; flex-direction: column; gap: 18px; min-width: 0; padding: 0 24px 36px; }
#pause-menu .foto-gal { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(210px, 100%), 1fr)); gap: 14px; min-width: 0; }
#pause-menu .foto-kaart { position: relative; display: flex; flex-direction: column; gap: 0; min-width: 0; padding: 0; overflow: hidden; margin: 0; }
#pause-menu .foto-kaart:focus-within { border-color: var(--ds-c-ink-bord); outline: var(--ds-lijn-dik) solid var(--ds-c-ink-bord); outline-offset: -1px; }
#pause-menu .foto-beeld { background: var(--ds-zeef-bg); border-bottom: var(--ds-lijn) solid var(--ds-c-ink-inkt); }
#pause-menu .foto-beeld img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 0; }
#pause-menu .foto-beeld .foto-leeg { width: 100%; aspect-ratio: 16 / 9; border-radius: 0; color: var(--ds-c-inkt-zacht); }
#pause-menu .foto-gal figcaption.foto-tekst { display: flex; flex-direction: column; gap: 1px; min-width: 0; margin-top: 0; padding: var(--ds-s-2) var(--ds-s-3) var(--ds-s-3); font-size: inherit; }
#pause-menu .foto-kop { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
#pause-menu .foto-plek { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-family: var(--ds-font-zeef-kop); font-weight: normal; font-size: var(--ds-t-subkop); line-height: var(--ds-lh-kop); letter-spacing: var(--ds-ls-kop); text-transform: uppercase; }
#pause-menu .foto-weer { flex: none; margin-left: auto; font-size: var(--ds-t-hulp); color: var(--ds-c-inkt-zacht); white-space: nowrap; }
#pause-menu .foto-wanneer { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: var(--ds-t-body); line-height: var(--ds-lh-tekst); }
#pause-menu .foto-bestand { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: var(--ds-t-hulp); line-height: var(--ds-lh-tekst); color: var(--ds-c-inkt-zacht); }
/* Weghalen is een omlijnde knop onderin de kaart (een lijst met kaarten heeft geen gele knoppen: de ene gele
   hoofdknop is "Nog een foto maken"). */
#pause-menu .foto-kaart .foto-acts { padding: 0 var(--ds-s-3) var(--ds-s-3); }
#pause-menu .foto-kaart .foto-weg { min-height: var(--ds-doel-aanraken); padding: var(--ds-s-1) var(--ds-s-4); font-size: var(--ds-t-label); }
/* De lege staat is een rustige kaart onder de kop, geen tweede groen paneel. */
#pause-menu .foto-leegstaat { width: min(760px, 100%); }
#pause-menu .foto-leegstaat .ds-z-knop { min-height: var(--ds-doel-aanraken); font-size: var(--ds-t-label); }
#pause-menu .foto-leegstaat .foto-tips { justify-content: center; }
#pause-menu .foto-leegstaat-ic svg { width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linejoin: round; }
/* De uitleg staat open in een compacte strook: de drie toetsen, één zin over de opslag en de actie. */
#pause-menu .foto-voet { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 20px; padding: 14px 16px 15px; border-radius: 10px; background: color-mix(in srgb, var(--ink) 4%, transparent); box-shadow: inset 0 0 0 1px var(--line); }
#pause-menu .foto-voet .foto-tips { padding-top: 0; }
#pause-menu .foto-voet .foto-start { margin-left: auto; }
#pause-menu .foto-noot { flex: 1 0 100%; margin: 0; font-size: max(15px, var(--menu-min)); line-height: 1.4; color: var(--mut); }
`;
let fotoCssAan = false;
function zetFotoCss() {
  if (fotoCssAan || typeof document === 'undefined') return;
  fotoCssAan = true;
  const stijl = document.createElement('style');
  stijl.id = 'style-fotos';
  stijl.textContent = FOTO_CSS;
  document.head.appendChild(stijl);
}

// De drie toetsen die je in de fotomodus meteen nodig hebt: in de lege staat en in de strook.
// #1257: the tips are keycaps, not raw {TOKEN}s.
const FOTO_TIPS = braceKeysHtml('<div class="foto-tips">' +
  '<span class="foto-tip">{F8} fotomodus</span>' +
  '<span class="foto-tip">{ENTER} foto maken</span>' +
  '<span class="foto-tip">{F} filter · {T} weer</span>' +
  '</div>');

// #980: dezelfde hero-taal als de andere schermen: een kop met de stand als badge en één zin
// die zegt wat je hier doet. Leeg heet de kop "Nog geen foto's"; gevuld "Je galerij".
function heroHtml(n) {
  const leeg = !n;
  const titel = leeg ? 'Nog geen foto\'s' : 'Je galerij';
  const lead = leeg
    ? 'Zet de wereld stil, loop met een vrije camera rond, kies een filter en het weer, en maak een foto. Hij komt als bestand op je eigen schijf; er gaat niets het internet op.'
    : 'Elke foto die je maakte, nieuwste eerst. Weghalen kan per foto en is terug te draaien; het bestand op je eigen schijf blijft staan.';
  const stand = `<span class="ds-z-chip${leeg ? '' : ' ds-z-chip--succes'}">${icoon('vinkje', { cls: 'ds-z-chip__icoon' })}${n} van ${F.GALLERY.max} foto's</span>`;
  return '<section class="ds-zeef ds-z-kaart ds-z-kaart--recht foto-hero" aria-label="Foto\'s">' +
    `<div class="ds-z-kaart__kop"><span class="ds-z-kaart__titel">${titel}</span>${stand}</div>` +
    `<p class="ds-z-kaart__tekst">${lead}</p></section>`;
}

// #910: de lege staat blijft een uitnodiging: het pictogram, de drie toetsen en één duidelijke
// actie om te beginnen. De uitleg staat in de kop erboven, niet nog eens in de kaart.
function leegStateHtml() {
  return '<div class="ds-zeef ds-z-leeg foto-leegstaat">' +
    `<span class="ds-z-leeg__beeld foto-leegstaat-ic">${CAM}</span>` +
    '<div class="ds-z-leeg__kop">Maak je eerste foto</div>' +
    FOTO_TIPS +
    '<div class="foto-start foto-start-big"><button type="button" class="ds-z-knop" data-foto-start>Fotomodus starten</button></div>' +
    '</div>';
}

// Eén foto in de galerij: beeld boven, het bijschrift in lagen (plek als kop, dag en uur als
// tweede regel, bestandsnaam klein en stil) en Weghalen als kleine actie in de hoek (#980).
function kaartHtml(s) {
  const plek = s.plaats || 'Groningen';
  const weer = s.weer ? (F.WEER_NAMEN[s.weer] || s.weer) : '';
  const wanneer = [s.dagLabel, s.uur].filter(Boolean).join(' · ');
  return '<figure class="ds-zeef ds-z-kaart foto-kaart">' +
    '<div class="foto-beeld">' +
      (s.thumb ? `<img src="${s.thumb}" alt="Foto in ${esc(plek)}${s.uur ? ' om ' + esc(s.uur) : ''}" decoding="async">` : '<div class="foto-leeg">Geen voorbeeld</div>') +
    '</div>' +
    '<figcaption class="foto-tekst">' +
      `<span class="foto-kop"><b class="foto-plek" title="${esc(plek)}">${esc(plek)}</b>${weer ? `<span class="foto-weer">${esc(weer)}</span>` : ''}</span>` +
      (wanneer ? `<span class="foto-wanneer">${esc(wanneer)}</span>` : '') +
      (s.file ? `<span class="foto-bestand" title="${esc(s.file)}">${esc(s.file)}</span>` : '') +
    '</figcaption>' +
    `<div class="foto-acts"><button type="button" class="ds-z-knop ds-z-knop--secundair foto-weg" data-foto-del="${esc(s.id)}" aria-label="Foto van ${esc(plek)} weghalen">Weghalen</button></div>` +
    '</figure>';
}

// De compacte infostrook in plaats van "Meer opties": de drie toetsen, één eerlijke zin over
// waar de foto blijft, en de actie om er nog een te maken. Niets om open te klikken.
function voetHtml() {
  return '<div class="ds-zeef foto-voet">' + FOTO_TIPS +
    '<div class="foto-start"><button type="button" class="ds-z-knop" data-foto-start>Nog een foto maken</button></div>' +
    '<p class="foto-noot">De foto zelf staat als bestand op je eigen schijf; Weghalen ruimt alleen deze galerij op. Er gaat niets het internet op.</p>' +
    '</div>';
}

// De galerij onder de kop: nieuwste eerst, en de actie blijft in het eerste beeld (#611, #980).
let laatsteWeg = null; // de laatst weggehaalde foto, voor Ongedaan maken (alleen zolang het scherm blijft staan)
export function renderFotoPanel(el, { behoudWeg = false } = {}) {
  if (!el) return;
  if (!behoudWeg) laatsteWeg = null;
  zetFotoCss();
  const list = F.loadGallery(store());
  const leeg = !list.length;
  const voet = leeg ? '' : voetHtml();
  const ongedaan = laatsteWeg ? '<div class="ds-zeef ds-z-kaart foto-ongedaan" role="status"><span class="ds-z-kaart__tekst">Foto van ' + esc(laatsteWeg.shot.plaats || 'Groningen') + ' weggehaald.</span>' +
    '<button type="button" class="ds-z-knop ds-z-knop--secundair" data-foto-undo>Ongedaan maken</button></div>' : '';
  el.innerHTML = heroHtml(list.length) + ongedaan + '<div class="foto-inhoud">' +
    (leeg ? leegStateHtml() : '<div class="foto-gal">' + list.map(kaartHtml).join('') + '</div>' + voet) +
    '</div>';
}

// true als de klik van de fotomodus was
export function fotoClick(e, world, el, api = {}) {
  if (e.target.closest('[data-foto-start]')) {
    if (api.close) api.close();
    if (!startPhotoMode(world)) meldStartFout(world);
    return true;
  }
  const del = e.target.closest('[data-foto-del]');
  if (del) {
    const st = store();
    const r = F.haalWeg(F.loadGallery(st), del.dataset.fotoDel);
    F.saveGallery(st, r.lijst);
    laatsteWeg = r.weg;
    renderFotoPanel(el, { behoudWeg: true });
    return true;
  }
  if (e.target.closest('[data-foto-undo]')) {
    const st = store();
    F.saveGallery(st, F.zetTerug(F.loadGallery(st), laatsteWeg));
    laatsteWeg = null;
    renderFotoPanel(el);
    return true;
  }
  return false;
}

// Waarom het niet startte, in gewone taal (fotomodus.js startReden)
function meldStartFout(world) {
  let speler = null;
  try { speler = hoofdspeler(world); } catch (err) { speler = null; }
  const reden = F.startReden({ fotomodus: !!photo, speler, cameraOverride: world.cameraOverride, uiPaused: world.uiPaused }) || 'Nu even niet: wacht tot het rustig is.';
  if (world.addMessage) world.addMessage(reden, 2);
}

export function wireFotoKey(world, canStart) {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F8' && !photo && (!canStart || canStart())) { e.preventDefault(); if (!startPhotoMode(world)) meldStartFout(world); }
  });
}
