import { hoofdspeler } from '../players.js';
import { clamp, pointInPolygon } from '../util.js';
import { sfxLinks } from '../latehooks.js';
import { edgeDistance, parcelAt, MAAR_WATER } from '../countryfield.js';
import { urbanWeight } from '../provinceworld.js';
import { trunksNear } from '../countrywalls.js';
import { rand as rnd } from '../rng.js';
import { seaAt } from '../regions.js';
import { streekAt } from '../regioleven.js';
import { streekNiveaus } from './streekklank.js';import { stepContext } from './steps.js';
import { SFX_MAP, sfxClips } from './sfxmap.js';
import { havenNiveau, HAVEN_PEAK, HAVEN_LP, spoorNiveau, treinHoornPauze, verkeerDagNiveau, scheepshoornPauze, occlusie, bedWobble, bedStartRate } from './lagenplan.js';
import { RAIN_KEYS, rainTargets, summerTargets, thunderPick } from './weermap.js';
import { roomTone, ROOM_TONES } from './binnenklank.js';
import { breezeTargets } from './sfxfeel.js';
import { monumentAudioScale } from '../heritagearea.js';

// Place-aware ambience: looping beds crossfaded by where/when the listener
// is, scheduled ambient events (birds, gulls, clinks, thunder), the
// Martinitoren carillon + hour strikes, animal calls and the street reverb.

let K = null;
const SCAN_EVERY = 0.5;
const BED_STOP_AFTER = 4;
// gebouwtypen die als bedrijfsterrein klinken (de industrielaag)
const INDUSTRIAL = new Set(['industrial', 'warehouse', 'storage_tank', 'silo', 'factory', 'service']);

const place = {
  green: 0, trees: 0, treePts: [], waterD: Infinity, waterX: 0, waterY: 0,
  square: 0, horeca: 0, horecaPts: [], density: 0, open: 0, traffic: 0, peds: 0, rural: 0,
  // de streek (streekklank.js): op zee, zee in de buurt, de streek, loodsen en fabrieken dichtbij
  sea: false, coast: 0, streek: null, industrial: 0,
  // het spoor: afstand tot het dichtstbijzijnde spoor (m) en dat punt (lagenplan.js, de verre treinhoorn)
  railD: Infinity, railX: 0, railY: 0,
};
export function getPlace() { return place; }

const beds = {};
const skIn = {}, skOut = {};   // hergebruikt: setTargets draait elk beeld
const BED_DEFS = {
  city: { buf: 'bed_city' },
  // file: de opname van game/audio/sfx (weermap.js, #988); is die er niet (of nog niet geladen), dan klinkt de procedurele buf
  wind: { buf: 'bed_wind', file: 'wind_gras', filter: true },
  rain: { buf: 'bed_rain', filter: true },
  roof: { buf: 'bed_roof', file: 'regen_dak' },
  regenLicht: { file: 'regen_motregen', filter: true },
  regenBui: { file: 'regen_bui', filter: true },
  regenPlens: { file: 'regen_plens', filter: true },
  regenAuto: { file: 'regen_auto' },
  vogels: { file: 'zomer_vogels' },
  stadsvogels: { file: 'zomer_stadsvogels' },
  insecten: { file: 'zomer_insecten' },
  crowd: { buf: 'bed_crowd', file: 'menigte_gemurmel' },
  terrace: { buf: 'bed_terrace' },
  crickets: { buf: 'bed_crickets' },
  kikkers: { file: 'kikkers_nacht' },
  kermis: { file: 'kermis_lawaai' },
  stadNacht: { file: 'stad_nacht_nl' },
  binnen: { file: 'ruimte_binnen' },
  lap: { buf: 'bed_lap', file: 'golfjes_oever', positional: true },
  // per streek (streekklank.js): zee en kust, open polder, riet, industrie
  kust: { buf: 'bed_kust' },
  polder: { buf: 'bed_polder' },
  riet: { buf: 'bed_riet' },
  industrie: { buf: 'bed_industrie' },
  // de haven: een verre scheepsbrom (opname boot_motor_stat) onder de industrie en het water; alleen als de opname geladen is
  haven: { file: 'boot_motor_stat', filter: true },
};

let scanTimer = 0;
let horecaGrid = null;
const HORECA_CELL = 40;
let landmarks = null;
let timers = null;
const queue = [];
let lastHour = null;
let lastStrikes = 0; // de inslagteller van weather.js: een donderslag per inslag, niet per flikkering
let lastFlashAt = -1e9;
let nextRandomThunder = 0;
const animalNext = new WeakMap();
const animalSpeed = new WeakMap();

function now() { return K.ctx.currentTime; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function later(delay, fn) {
  if (queue.length > 64) return;
  queue.push({ t: now() + delay, fn });
}

function runQueue() {
  const t = now();
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].t > t) continue;
    const it = queue[i];
    queue.splice(i, 1);
    it.fn();
  }
}

export function initAmbience(kit, world) {
  K = kit;
  const ctx = K.ctx;
  for (const [key, d] of Object.entries(BED_DEFS)) {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    let tail = gain, filter = null, panner = null;
    if (d.positional) {
      panner = K.makePanner({ ref: 6, rolloff: 1.2, model: 'equalpower' });
      gain.connect(panner);
      tail = panner;
    }
    tail.connect(K.buses.amb);
    if (d.filter !== false) {   // elke laag krijgt een laagdoorlaat: de occlusie binnen en buiten (lagenplan.js occlusie) dempt de hoge tonen
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 20000;
      filter.connect(gain);
    }
    beds[key] = { ...d, key, gain, filter, panner, src: null, level: 0, target: 0, quietFor: 0, fresh: true, occGain: 1 };
  }
  K.bank.warm(Object.values(BED_DEFS).map((d) => d.buf).filter(Boolean));

  const meta = world.map.meta || {};
  const find = (name) => (meta.landmarks || []).find((l) => l.name === name) || null;
  landmarks = {
    tower: find('Martinitoren'),
    aa: find('Der Aa-kerk'),
    squares: ['Grote Markt', 'Vismarkt'].map(find).filter(Boolean),
    vismarkt: find('Vismarkt'),
  };
  horecaGrid = new Map();
  for (const h of meta.horeca || []) {
    const k = Math.floor(h.x / HORECA_CELL) + ',' + Math.floor(h.y / HORECA_CELL);
    let arr = horecaGrid.get(k);
    if (!arr) { arr = []; horecaGrid.set(k, arr); }
    arr.push(h);
  }
  timers = { nat: rnd(8, 20), bird: rnd(1, 4), gull: rnd(4, 10), clink: rnd(2, 6), animals: 0, trein: rnd(30, 90), hoorn: rnd(60, 200) };
  lastHour = world.dayNight ? world.dayNight.hour : null;
}

function startBed(b) {
  const buffer = (b.file && K.samples && K.samples.buffer(b.file)) || (b.buf ? K.bank.get(b.buf) : null);
  if (!buffer) return;
  const src = K.ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.playbackRate.value = bedStartRate(Math.random());   // een lus start elke keer met een iets andere toonhoogte (+-1,5 procent)
  src.connect(b.filter || b.gain);
  src.start(now(), Math.random() * buffer.duration);
  if (K.track) K.track('bed:' + b.key, src, { max: 1 });   // ruisregister: een bed hoort er hooguit één te hebben
  b.src = src;
}

function stopBed(b) {
  if (!b.src) return;
  try { b.src.stop(); } catch (e) { /* already stopped */ }
  b.src.disconnect();
  b.src = null;
}

function driveBeds(dt) {
  const t = now();
  for (const key in beds) {
    const b = beds[key];
    // een NaN-doel (een plaatsmeting die NaN geeft) bleef in b.level hangen en liet setTargetAtTime gooien: het bed ging nooit meer uit
    if (!Number.isFinite(b.target)) b.target = 0;
    if (!Number.isFinite(b.level)) b.level = 0;
    if (!Number.isFinite(b.occGain)) b.occGain = 1;
    if (b.target > 0.002 && !b.src) startBed(b);
    const rate = b.target > b.level ? 0.7 : 0.45;
    b.level += (b.target - b.level) * Math.min(1, dt * rate);
    if (b.level < 0.0015 && b.target <= 0.002) {
      b.level = 0;
      b.quietFor += dt;
      if (b.quietFor > BED_STOP_AFTER) stopBed(b);
    } else b.quietFor = 0;
    b.gain.gain.setTargetAtTime(b.src ? b.level * b.occGain * bedWobble(t, key, b.wobble ?? 0.08) : 0, t, 0.08);
  }
}

// --- place analysis -----------------------------------------------------

function nearestWater(map, x, y) {
  let best = Infinity, bx = x, by = y;
  for (const w of map.waterNear(x, y, 45)) {
    const [minx, miny, maxx, maxy] = w.bounds;
    if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, w.pts)) return { d: 0, x, y };
    const pts = w.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], ay = pts[i][1], dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay;
      const l2 = dx * dx + dy * dy;
      const u = l2 > 1e-9 ? clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1) : 0;
      const px = ax + dx * u, py = ay + dy * u, d = Math.hypot(px - x, py - y);
      if (d < best) { best = d; bx = px; by = py; }
    }
  }
  return { d: best, x: bx, y: by };
}

// Samen spelen (#434): een gast heeft in zijn eigen spel geen voertuig, ook niet als hij bij de host in een auto of boot zit. world.coopZit (coopnet.js)
// is de soort van dat voertuig: dan klinkt de wereld zoals bij de host (dichte cabine dempt het gemurmel van de menigte, de wind en het verkeer).
const GAST_VOERTUIG = { fiets: { isBike: true }, scooter: { isScooter: true }, motor: { isScooter: true }, boot: { isBoat: true } };
export function rijdtIn(world) {
  const v = hoofdspeler(world).inVehicle;
  if (v) return v;
  const z = world.coopRole === 'client' ? world.coopZit : null;
  return z ? (GAST_VOERTUIG[z] || {}) : null;
}

// De wereld staat stil voor het geluid van de omgeving: het pauzemenu wel, een cutscene die de wereld stilzet (cinematics.js
// cinematicPause) niet. Daar klinkt dezelfde omgeving als in het spel; de stemmen gaan erboven door de gewone spraakduik (audio.js).
export function stil(world) {
  return !!world.paused && !(world.cinematicPause && !world.menuMuffle);
}

function scan(world) {
  const map = world.map;
  const p = hoofdspeler(world);
  const src = p.inVehicle || p;
  const x = src.x, y = src.y;

  let green = 0;
  for (const g of map.greenNear(x, y, 25)) {
    if (g.kind === 'outdoor_seating' || g.kind === 'pitch') continue;
    const [minx, miny, maxx, maxy] = g.bounds;
    if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, g.pts)) { green = 1; break; }
    const dx = Math.max(minx - x, 0, x - maxx), dy = Math.max(miny - y, 0, y - maxy);
    green = Math.max(green, clamp(1 - Math.hypot(dx, dy) / 30, 0, 0.6));
  }
  place.green = green;

  const trees = map.treesNear(x, y, 30);
  place.treePts.length = 0;
  let tn = 0;
  for (const t of trees) {
    const d = Math.hypot(t[0] - x, t[1] - y);
    if (d > 35) continue;
    tn++;
    if (place.treePts.length < 10) place.treePts.push(t);
  }
  place.trees = clamp(tn / 12, 0, 1);

  const w = nearestWater(map, x, y);
  place.waterD = w.d; place.waterX = w.x; place.waterY = w.y;

  let sq = 0;
  for (const l of landmarks.squares) sq = Math.max(sq, clamp(1 - (Math.hypot(l.x - x, l.y - y) - 35) / 80, 0, 1));
  place.square = sq;

  place.horecaPts.length = 0;
  let hn = 0;
  const cx = Math.floor(x / HORECA_CELL), cy = Math.floor(y / HORECA_CELL);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const arr = horecaGrid.get((cx + i) + ',' + (cy + j));
    if (!arr) continue;
    for (const h of arr) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d > 55) continue;
      hn += 1 - d / 55;
      if (place.horecaPts.length < 8) place.horecaPts.push(h);
    }
  }
  for (const g of map.greenNear(x, y, 30)) if (g.kind === 'outdoor_seating') hn += 0.8;
  place.horeca = clamp(hn / 5, 0, 1);

  let dens = 0, near70 = 0, ind = 0;
  for (const b of map.buildingsNear(x, y, 60)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    const d = Math.hypot(Math.max(minx - x, 0, x - maxx), Math.max(miny - y, 0, y - maxy));
    if (d < 60) near70++;
    if (d < 50 && INDUSTRIAL.has(b.type)) ind++;
    if (d < 22) dens += clamp((b.h || 8) / 12, 0.3, 1.6) * (1 - d / 22);
  }
  place.density = clamp(dens / 5, 0, 1);
  place.industrial = clamp(ind / 4, 0, 1);
  place.open = place.density < 0.35 && near70 > 8 ? clamp((near70 - 8) / 20, 0, 1) * (1 - place.density) : 0;

  let traffic = 0;
  for (const v of world.vehicles) {
    if (v.isBike || v.isBoat || v.wrecked || Math.abs(v.speed) < 1) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < 110) traffic += 1 - d / 110;
  }
  place.traffic = clamp(traffic / 6, 0, 1);

  let peds = 0;
  for (const ped of world.pedestrians) if (ped.state !== 'dead' && Math.abs(ped.x - x) < 30 && Math.abs(ped.y - y) < 30) peds++;
  if (world.coopRole === 'client' && world.coopHost) for (const q of world.coopHost.voetgangers || []) if (Math.abs(q.x - x) < 30 && Math.abs(q.y - y) < 30) peds++; // de voetgangers van de host: de menigte is dezelfde als bij hem (#434)
  place.peds = clamp(peds / 14, 0, 1);

  countryPlace(x, y);
  coastPlace(x, y);
  railPlace(map, x, y);
  // een monumentgebied (heritagearea.js): geen verkeer en nauwelijks stadsgeur, wel groen, vogels en wind (bestaande lagen, geen nieuwe opname)
  const ma = monumentAudioScale(x, y);
  if (ma) {
    place.traffic *= ma.traffic;
    place.density *= ma.city;
    place.green = Math.max(place.green, 0.8 * ma.weight);
    place.open = Math.max(place.open, 0.6 * ma.weight);
  }

  const v = rijdtIn(world);
  const closed = !!v && !v.isBike && !v.isScooter && !v.isBoat;
  K.setReverb(place.density, place.open, closed);
}

// Out in the Ommeland the city's green and trees are gone: the meadows all
// round and the trunks of the road trees and hedgerows (countrywalls.js)
// take their place (the water is the tiles' polygons, scanned above), and
// the polder is open (no city hum, more wind) outside a village's built-up
// part.
const _trunks = [];
function countryPlace(x, y) {
  const e = edgeDistance(x, y);
  const urban = urbanWeight(x, y);
  place.rural = smooth01(20, 220, e) * (1 - 0.8 * urban);
  if (e < 20) return;
  const k = smooth01(20, 220, e);
  place.green = Math.max(place.green, 0.85 * k * (1 - 0.6 * urban));
  _trunks.length = 0;
  const tn = trunksNear(x, y, 35, _trunks, 10);
  if (tn) {
    place.trees = Math.max(place.trees, clamp(tn / 12, 0, 1));
    if (place.treePts.length < 4) place.treePts.push(..._trunks);
  }
  place.open = Math.max(place.open, place.rural);
  // a maar of the polder grid (past the real data)
  const pm = parcelAt(x, y).dMaar - MAAR_WATER;
  if (pm < place.waterD) { place.waterD = Math.max(0, pm); place.waterX = x; place.waterY = y; }
}

// Het spoor: afstand tot het dichtstbijzijnde spoorstuk binnen 100 m (Infinity als er geen is) en het punt erop.
function railPlace(map, x, y) {
  place.railD = Infinity;
  if (!map.railNear) return;
  for (const r of map.railNear(x, y, 100)) {
    const P = r.pts;
    if (!P) continue;
    for (let k = 0; k < P.length - 1; k++) {
      const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, L2 = dx * dx + dy * dy || 1;
      const u = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1);
      const px = ax + dx * u, py = ay + dy * u, d = Math.hypot(px - x, py - y);
      if (d < place.railD) { place.railD = d; place.railX = px; place.railY = py; }
    }
  }
}

// De zee: staat de luisteraar op zee, en hoeveel zee ligt er binnen 150 m (0 tot 1). De zee heeft geen
// waterpolygoon (alleen de kustlijn), dus dit is de enige manier om een dijk of strand te herkennen.
const COAST_R = 150;
function coastPlace(x, y) {
  place.sea = seaAt(x, y);
  let n = 0;
  if (!place.sea) {
    if (seaAt(x + COAST_R, y)) n++;
    if (seaAt(x - COAST_R, y)) n++;
    if (seaAt(x, y + COAST_R)) n++;
    if (seaAt(x, y - COAST_R)) n++;
  }
  place.coast = n / 4;
  const s = streekAt(x, y);
  place.streek = s ? s.id : null;
}

function smooth01(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

const rainOut = {}, sumOut = {};
// the facts and the result of the wind bed (sfx/sfxfeel.js): own objects, nothing new per frame
const windIn = { open: 0, green: 0, coast: 0, sea: false, rain: 0, breeze: 0, hour: 12, closed: false, paused: 1 }, windOut = { level: 0, lp: 2500 };
const EIGEN_FILTER = new Set(['wind', 'rain', 'regenLicht', 'regenBui', 'regenPlens']);
function setTargets(world) {
  const dn = world.dayNight || { hour: 12, night: 0 };
  const night = dn.night || 0, day = 1 - night, hour = dn.hour;
  const rain = clamp(world.weather ? world.weather.intensity : 0, 0, 1);
  const v = rijdtIn(world);
  const closed = !!v && !v.isBike && !v.isScooter && !v.isBoat;
  const evening = smooth01(16, 19, hour) * (1 - smooth01(23.5, 24, hour)) + (hour < 2 ? 0.6 : 0);
  const paused = K.muted() ? 0 : stil(world) ? 0.45 : 1;
  const cabin = closed ? 0.45 : 1;

  beds.city.target = (0.07 + place.traffic * 0.1 + place.density * 0.04 - place.green * 0.04) * (0.55 + 0.45 * day) * (1 - 0.9 * place.rural) * cabin * paused;
  // the wind follows the place, the hour and the breeze of the day (a calm dawn, a sea breeze on the coast in the afternoon)
  windIn.open = place.open; windIn.green = place.green; windIn.coast = place.coast; windIn.sea = place.sea; windIn.rain = rain;
  windIn.breeze = world.weather ? world.weather.windStrength : 0; windIn.hour = hour; windIn.closed = closed; windIn.paused = paused;
  beds.wind.target = breezeTargets(windIn, windOut).level;
  // regen: de opnames (motregen, bui, plensbui, kruisend op de intensiteit; dak en auto binnen) zodra ze geladen zijn, anders de procedurele lagen
  const S = K.samples, recRain = !!S && RAIN_KEYS.every((k) => S.has(k)) && S.has('regen_dak') && S.has('regen_auto');
  // een cutscene binnen (cutscenesfx.js, cutscenehost.js zet world.cutsceneAmb): de set is binnen, ook als de speler buiten staat
  const sa = world.cutsceneAmb || null;
  const indoors = (sa ? !!sa.binnen : stepContext.indoors) && !closed;
  if (recRain) {
    const rt = rainTargets(rain, { closed, indoors }, paused, rainOut);
    beds.rain.target = 0;
    beds.regenLicht.target = rt.licht; beds.regenBui.target = rt.bui; beds.regenPlens.target = rt.plens;
    beds.regenAuto.target = rt.auto; beds.roof.target = rt.dak;
  } else {
    beds.rain.target = rain * (closed ? 0.1 : 0.28) * paused;
    beds.roof.target = closed ? rain * 0.32 * paused : 0;
    beds.regenLicht.target = beds.regenBui.target = beds.regenPlens.target = beds.regenAuto.target = 0;
  }
  // zomer: vogels, stadsvogels en insecten overdag (opnames; de losse vogelroepen van ambientEvents blijven)
  const zt = summerTargets(hour, rain, place, cabin, paused, sumOut);
  beds.vogels.target = zt.vogels; beds.stadsvogels.target = zt.stadsvogels; beds.insecten.target = zt.insecten;
  beds.crowd.target = Math.max(place.square * (0.2 * day + 0.08 * night), place.peds * 0.08, (world.coopRole !== 'client' && world.eventSound ? world.eventSound.gain * 0.22 : 0)) * (1 - rain * 0.7) * cabin * paused;
  beds.terrace.target = place.horeca * (0.05 * day + evening * 0.16) * (1 - rain * 0.85) * cabin * paused;
  beds.crickets.target = night * Math.max(place.green, place.trees * 0.7) * 0.13 * (1 - rain) * cabin * paused;
  beds.lap.target = clamp(1 - place.waterD / 28, 0, 1) * (v && v.isBoat ? 0.32 : 0.2) * paused;
  // een Nederlandse stad 's nachts (opname, verkeer op afstand zonder gebeurtenissen) in de plaats van de helft van het procedurele stadsbed; in de flat een kamertoon
  beds.stadNacht.target = (0.06 + place.traffic * 0.1 + place.density * 0.05) * night * (1 - 0.9 * place.rural) * cabin * paused;
  beds.city.target *= 1 - 0.5 * night * (K.samples && K.samples.has('stad_nacht_nl') ? 1 : 0);
  beds.binnen.target = indoors ? 0.25 * paused : 0;
  // in a pand (interiors.js, #1150, #1164): the room tone per kind (sfx/binnenklank.js): a bar and a station hall have people in them, a library and a church do not, a garage hums
  let roomMachine = 0;
  if (indoors && (sa ? sa.room : world.insideKind)) {
    const rt = sa ? (ROOM_TONES[sa.room] || roomTone(null)) : roomTone(world.insideKind, world.insideSub);
    if (rt.crowd) beds.crowd.target = Math.max(beds.crowd.target, rt.crowd * paused);
    beds.binnen.target = rt.room * paused;
    roomMachine = rt.machine;
  }
  // de kermis op de Grote Markt: drukte en attracties op afstand zolang hij open is (opname kermis_lawaai), zachter bij regen en in een voertuig
  const kermisMid = sfxLinks.kermisPunt(world);
  if (kermisMid) {
    const kd = Math.hypot(K.listener.x - kermisMid.x, K.listener.z - kermisMid.y);
    beds.kermis.target = Math.pow(clamp(1 - kd / 200, 0, 1), 1.5) * 0.4 * (1 - rain * 0.5) * cabin * paused;
  } else beds.kermis.target = 0;
  // kikkers aan het water op een zomernacht (opname), in het groen of op het platteland; regen en een gesloten voertuig dempen ze
  beds.kikkers.target = night * clamp(1 - place.waterD / 45, 0, 1) * Math.max(place.green, place.trees * 0.6, place.rural * 0.8) * 0.2 * (1 - rain) * cabin * paused;

  // de lagen per streek: eerst de gemeten niveaus, dan het weer (regen overstemt de brandingwind) en de pauze
  skIn.sea = place.sea; skIn.coast = place.coast; skIn.streek = place.streek; skIn.rural = place.rural; skIn.open = place.open;
  skIn.industrial = place.industrial; skIn.waterD = place.waterD; skIn.density = place.density; skIn.closed = closed; skIn.night = night;
  const sk = streekNiveaus(skIn, skOut);
  const droog = 1 - rain * 0.5;
  beds.kust.target = sk.kust * droog * paused;
  beds.polder.target = sk.polder * (1 - rain * 0.7) * paused;
  beds.riet.target = sk.riet * (1 - rain * 0.6) * paused;
  beds.industrie.target = Math.max(sk.industrie, roomMachine) * paused;

  // de haven (verre scheepsbrom) en verkeer overdag (dezelfde opname als 's nachts, zachter): nieuwe lagen van de audit van 21-11
  const havenF = { industrial: place.industrial, waterD: place.waterD, streek: place.streek, sea: place.sea, closed };
  beds.haven.target = havenNiveau(havenF) * HAVEN_PEAK * (1 - rain * 0.3) * paused;
  beds.stadNacht.target += verkeerDagNiveau(place.traffic, place.density, day, place.rural, cabin) * paused * (K.samples && K.samples.has('stad_nacht_nl') ? 1 : 0);
  // occlusie: in de flat of een gesloten voertuig klinkt het buitengeluid dof (en in de flat zachter); het binnengeluid blijft
  const t = now();
  const occCtx = { closed, indoors };
  for (const key in beds) {
    const b = beds[key], o = occlusie(occCtx, key);
    b.occGain = o.gain;
    b.occLp = o.lp;
  }
  if (beds.haven.filter) beds.haven.occLp = Math.min(beds.haven.occLp, HAVEN_LP);
  if (beds.wind.filter) beds.wind.filter.frequency.setTargetAtTime(windOut.lp, t, 0.3);
  if (beds.rain.filter) beds.rain.filter.frequency.setTargetAtTime(closed ? 1400 : 12000, t, 0.3);
  for (const k of ['regenLicht', 'regenBui', 'regenPlens']) if (beds[k].filter) beds[k].filter.frequency.setTargetAtTime(closed || indoors ? 1400 : 12000, t, 0.3);
  // alle andere lagen: de laagdoorlaat van de occlusie (de weerlagen hierboven hebben hun eigen stand)
  for (const key in beds) {
    const b = beds[key];
    if (b.filter && !EIGEN_FILTER.has(key)) b.filter.frequency.setTargetAtTime(b.occLp, t, 0.3);
  }
  if (beds.lap.panner && place.waterD < 60) {
    K.setPannerPos(beds.lap.panner, place.waterX, place.waterY, 0.2, !beds.lap.fresh);
    beds.lap.fresh = false;
  }
}

// --- scheduled ambient events -------------------------------------------

function playAt(buf, x, y, h, o) {
  const out = K.spatial(x, y, { ref: o.ref ?? 6, rolloff: o.rolloff ?? 1.2, range: o.range ?? 80, h, model: 'equalpower', bus: K.buses.amb, prio: 0 });
  if (!out) return;
  K.buf(buf, { out, gain: o.gain, rate: o.rate ?? 1, prio: 0, lp: o.lp || 0, buffer: o.buffer || null, cat: o.cat || 'omgeving' });
}

function ambientEvents(dt, world) {
  const dn = world.dayNight || { hour: 12, night: 0 };
  const daylight = 1 - (dn.night || 0);
  const rain = clamp(world.weather ? world.weather.intensity : 0, 0, 1);
  const L = K.listener;
  const lx = L.x, ly = L.z;

  timers.bird -= dt;
  if (timers.bird <= 0) {
    const dawn = dn.hour > 4.5 && dn.hour < 8 ? 1.8 : 1;
    const act = daylight * (0.12 + place.green + place.trees * 0.8) * (1 - rain * 0.9) * dawn;
    timers.bird = act > 0.05 ? rnd(1.2, 5) / Math.min(2.5, act) : rnd(4, 8);
    if (act > 0.05 && !stil(world)) {
      const tr = place.treePts.length ? pick(place.treePts) : null;
      const a = Math.random() * Math.PI * 2, r = rnd(8, 25);
      const x = tr ? tr[0] : lx + Math.cos(a) * r, y = tr ? tr[1] : ly + Math.sin(a) * r;
      // SFX ronde 5: de helft van de keren een echte vogel (sfxmap.js bird_chirp), anders de procedurele
      const vogel = K.samples && Math.random() < 0.5 ? dierOpname(sfxClips('bird_chirp'), K.samples) : null;
      if (vogel) playAt(vogel.key, x, y, rnd(4, 9), { gain: rnd(0.14, 0.24), rate: rnd(0.95, 1.08), ref: 5, rolloff: 1.4, range: 60, buffer: vogel.buffer, cat: 'dier' });
      else playAt('bird_' + Math.floor(Math.random() * 5), x, y, rnd(4, 9), { gain: rnd(0.1, 0.2), rate: rnd(0.9, 1.12), ref: 5, rolloff: 1.4, range: 60 });
    }
  }

  // SFX ronde 5: kikker aan het water, uil in het groen (zomernacht) en een windvlaag door de bomen (overdag)
  timers.nat -= dt;
  if (timers.nat <= 0) {
    timers.nat = rnd(9, 24);
    const night = dn.night || 0, roll = Math.random();
    // SFX ronde 6: bij regen soms druppels van een dak of in een plas (rain_drips), dichtbij; bij droog weer de zomerdieren en wind
    const ev = rain > 0.15 && !stil(world) && K.samples && roll < 0.5 ? 'rain_drips' : rain > 0.6 || stil(world) || !K.samples ? null : night > 0.6 && place.waterD < 60 && roll < 0.55 ? 'frog_croak' : night > 0.6 && (place.trees > 0.3 || place.rural > 0.3) && roll < 0.8 ? 'owl_hoot' : night < 0.6 && place.trees > 0.35 && roll < 0.45 ? 'wind_gust' : null;
    const rec = ev ? dierOpname(sfxClips(ev), K.samples) : null;
    if (rec) {
      const e = SFX_MAP[ev], a = Math.random() * Math.PI * 2, r = rnd(10, 40);
      playAt(rec.key, lx + Math.cos(a) * r, ly + Math.sin(a) * r, 1.5, { gain: e.gain * 0.3, rate: rnd(0.95, 1.05), ref: e.ref, rolloff: 1.2, range: e.range * 0.5, buffer: rec.buffer, cat: e.cat });
    }
  }

  timers.gull -= dt;
  if (timers.gull <= 0) {
    const vis = landmarks.vismarkt ? clamp(1 - Math.hypot(landmarks.vismarkt.x - lx, landmarks.vismarkt.y - ly) / 180, 0, 1) : 0;
    const act = Math.max(clamp(1 - place.waterD / 70, 0, 1), vis) * (0.3 + daylight * 0.7) * (1 - rain * 0.6);
    timers.gull = act > 0.05 ? rnd(5, 14) / act : rnd(6, 12);
    if (act > 0.05 && !stil(world)) {
      const a = Math.random() * Math.PI * 2, r = rnd(15, 45);
      playAt('gull_' + (Math.random() < 0.5 ? 0 : 1), lx + Math.cos(a) * r, ly + Math.sin(a) * r, rnd(12, 25), { gain: rnd(0.12, 0.22), rate: rnd(0.9, 1.1), ref: 10, rolloff: 1, range: 120 });
    }
  }

  // een verre treinhoorn langs het spoor, een scheepshoorn in de haven (opnames van sfx/samples.js, dof en zacht: ver weg)
  timers.trein -= dt;
  if (timers.trein <= 0) {
    timers.trein = treinHoornPauze(place.railD, dn.night || 0, rain, Math.random());
    const S = K.samples, key = Math.random() < 0.7 ? 'trein_hoorn_kort' : 'trein_hoorn_lang';
    if (S && spoorNiveau(place.railD) > 0.1 && rain < 0.7 && !stil(world) && S.has(key)) {
      const a = Math.random() * Math.PI * 2, r = rnd(60, 200);
      playAt(key, place.railX + Math.cos(a) * r, place.railY + Math.sin(a) * r, 2, { gain: rnd(0.07, 0.12), rate: rnd(0.97, 1.03), ref: 20, rolloff: 1, range: 400, lp: 2200, buffer: S.buffer(key), cat: 'spoor' });
    }
  }
  timers.hoorn -= dt;
  if (timers.hoorn <= 0) {
    const hv = havenNiveau({ industrial: place.industrial, waterD: place.waterD, streek: place.streek, sea: place.sea, closed: false });
    timers.hoorn = scheepshoornPauze(hv, Math.random());
    const S = K.samples;
    if (S && hv >= 0.3 && !stil(world) && S.has('scheepshoorn_op')) {
      const a = Math.random() * Math.PI * 2, r = rnd(120, 300);
      playAt('scheepshoorn_op', place.waterX + Math.cos(a) * r, place.waterY + Math.sin(a) * r, 3, { gain: rnd(0.1, 0.16), rate: rnd(0.96, 1.04), ref: 30, rolloff: 1, range: 600, lp: 1600, buffer: S.buffer('scheepshoorn_op'), cat: 'water' });
    }
  }

  timers.clink -= dt;
  if (timers.clink <= 0) {
    const evening = dn.hour > 16 || dn.hour < 1.5 ? 1 : 0.3;
    const act = place.horeca * evening * (1 - rain);
    timers.clink = act > 0.1 ? rnd(2.5, 7) / act : rnd(5, 9);
    if (act > 0.1 && place.horecaPts.length && !stil(world)) {
      const h = pick(place.horecaPts);
      playAt('clink', h.x + rnd(-3, 3), h.y + rnd(-3, 3), 1, { gain: rnd(0.06, 0.12), rate: rnd(0.92, 1.1), ref: 4, rolloff: 1.4, range: 50 });
    }
  }
}

// --- bells --------------------------------------------------------------

// Original short phrase (semitones above C5, beat lengths) for the carillon.
const CARILLON = [[12, 1], [7, 1], [9, 1], [4, 2], [5, 1], [9, 1], [7, 1], [0, 3]];
const CARILLON_BEAT = 0.34;

function bellOut(lm, h) {
  return K.spatial(lm.x, lm.y, { h, ref: 70, rolloff: 0.7, range: 3000, maxDist: 2500, model: 'equalpower', prio: 2 });
}

function bellLowpass(lm) {
  const d = K.dist(lm.x, lm.y, 60);
  return clamp(9000 - d * 5, 1200, 9000);
}

function playCarillon() {
  const lm = landmarks.tower;
  if (!lm) return;
  // SFX ronde 5: soms luidt in plaats van het kunstmatige beiaardspel een echte kerkklok (sfxmap.js church_bell)
  const klok = K.samples && Math.random() < 0.4 ? dierOpname(sfxClips('church_bell'), K.samples) : null;
  if (klok) { const e = SFX_MAP.church_bell; playAt(klok.key, lm.x, lm.y, 30, { gain: e.gain * 0.45, rate: 1, ref: e.ref, rolloff: 1, range: e.range, lp: 3500, buffer: klok.buffer, cat: e.cat }); return; }
  let t = 0;
  for (const [semi, beats] of CARILLON) {
    later(t, () => {
      const out = bellOut(lm, 70);
      if (out) K.buf('bell_carillon', { out, gain: 0.32, rate: Math.pow(2, semi / 12), prio: 2, lp: bellLowpass(lm) });
    });
    t += beats * CARILLON_BEAT;
  }
}

function strikeHour(count, lm, rate = 1, gain = 0.55) {
  if (!lm) return;
  for (let i = 0; i < count; i++) {
    later(i * 1.7, () => {
      const out = bellOut(lm, 60);
      if (out) K.buf('bell_big', { out, gain, rate, prio: 2, lp: bellLowpass(lm) });
    });
  }
}

function bells(world) {
  if (!world.dayNight) return;
  const h = world.dayNight.hour;
  const prevH = lastHour;
  lastHour = h;
  if (prevH === null) return;
  const hh = h < prevH - 12 ? h + 24 : h;
  const dh = hh - prevH;
  if (dh <= 0 || dh > 0.2) return;
  const crossed = (mark) => Math.floor(prevH - mark) !== Math.floor(hh - mark);
  // a game day lasts 24 real minutes, so ringing every game hour would mean
  // a carillon plus up to 12 strikes every real minute: ring every 3rd hour
  const nextHour = Math.ceil(prevH) % 24;
  if (crossed(0.93) && (Math.round(hh + 0.07) % 24) % BELL_EVERY_HOURS === 0) playCarillon();
  if (crossed(0) && nextHour % BELL_EVERY_HOURS === 0) {
    const hr = Math.round(h) % 24;
    strikeHour(hr % 12 || 12, landmarks.tower);
  }
}
const BELL_EVERY_HOURS = 3;

// --- thunder ------------------------------------------------------------

function thunder(distance) {
  const v = rijdtIn(weatherWorld);
  const th = thunderPick(distance, Math.random(), Math.random(), { closed: !!v && !v.isBike && !v.isScooter && !v.isBoat, indoors: stepContext.indoors });
  const S = K.samples, rec = S && S.buffer(th.key);
  const variant = distance < 700 ? 'thunder_0' : Math.random() < 0.5 ? 'thunder_1' : 'thunder_2';
  const delay = th.delay;
  const gain = clamp(0.75 - distance / 5000, 0.25, 0.7);
  later(delay, () => {
    // the recorded clap when it is loaded (weermap.js), else the synthesised one
    if (rec) K.buf(th.key, { bus: K.buses.sfx, gain: th.gain, rate: th.rate, prio: 2, lp: th.lp, buffer: rec });
    else K.buf(variant, { bus: K.buses.sfx, gain, rate: 0.9 + Math.random() * 0.15, prio: 2, lp: clamp(6000 - distance * 1.5, 900, 6000) });
    K.duckAmb(0.35, 2.5);
  });
}

let weatherWorld = null;
function weatherEvents(world) {
  weatherWorld = world;
  const sc = sfxLinks.getScene();
  const strikes = sc && sc.userData ? sc.userData.lightningStrikes || 0 : 0;
  const t = now();
  if (strikes !== lastStrikes) {
    // dezelfde gebeurtenis als de flits (weather.js updateLightning); de afstandsvertraging zit in thunderPick
    if (strikes > lastStrikes) { lastFlashAt = t; thunder(sc.userData.lightningDistance || rnd(250, 3200)); }
    lastStrikes = strikes;
  }
  const w = world.weather;
  if (w && w.active && w.intensity > 0.75 && t - lastFlashAt > 25) {
    if (!nextRandomThunder) nextRandomThunder = t + rnd(8, 20);
    else if (t > nextRandomThunder) { thunder(rnd(1500, 4500)); nextRandomThunder = t + rnd(12, 30); }
  } else nextRandomThunder = 0;
}

// --- animals ------------------------------------------------------------

// rec: sleutels van de opnames (samples.js) die de procedurele roep vervangen; dag: zwijgt meestal in de nacht
const ANIMALS = {
  cow: { buf: 'cow', rec: ['dier_koe', ...sfxClips('cow_moo')], dag: true, gap: [9, 26], gain: 0.3, rate: [0.9, 1.08], h: 1.3, range: 80 },
  sheep: { buf: 'sheep', rec: ['dier_schaap', ...sfxClips('sheep_bleat')], dag: true, gap: [6, 18], gain: 0.22, rate: [0.9, 1.15], h: 0.8, range: 60 },
  horse: { buf: null, rec: ['dier_paard'], dag: true, gap: [14, 40], gain: 0.22, rate: [0.94, 1.06], h: 1.4, range: 70 },
  seagull: { buf: 'gull', rec: ['dier_meeuw_0', 'dier_meeuw_1'], dag: true, gap: [7, 20], gain: 0.18, rate: [0.92, 1.1], h: 8, range: 90 },
  duck: { buf: 'duck', rec: ['dier_eend'], dag: true, gap: [4, 12], gain: 0.16, rate: [0.9, 1.1], h: 0.2, range: 45 },
  heron: { buf: 'heron', gap: [14, 40], gain: 0.2, rate: [0.9, 1.1], h: 0.8, range: 70 },
  seal: { buf: 'seal', gap: [12, 30], gain: 0.2, rate: [0.9, 1.1], h: 0.2, range: 60 },
  fish: { buf: 'imp_water', gap: [8, 20], gain: 0.07, rate: [1.6, 2.1], h: 0, range: 18 },
  chicken: { buf: null, rec: sfxClips('chicken_cluck'), dag: true, gap: [5, 16], gain: 0.2, rate: [0.95, 1.05], h: 0.4, range: 50 },
  pigeon: { buf: 'pigeon', gap: [5, 14], gain: 0.1, rate: [0.92, 1.08], h: 0.3, range: 30 },
  dog: { buf: 'dog', rec: sfxClips('dog_bark'), gap: [4, 14], gain: 0.22, rate: [0.8, 1.25], h: 0.5, range: 70, double: true },
  cat: { buf: 'cat', rec: sfxClips('cat_meow'), gap: [10, 30], gain: 0.14, rate: [0.9, 1.15], h: 0.3, range: 35 },
};
const ALIASES = { gans: 'duck', gull: 'seagull', meeuw: 'seagull', eend: 'duck', duif: 'pigeon', hond: 'dog', kat: 'cat', koe: 'cow', kip: 'chicken', hen: 'chicken', haan: 'chicken', schaap: 'sheep', paard: 'horse', reiger: 'heron', zeehond: 'seal', vis: 'fish' };

// een geladen opname uit de lijst sleutels (samples.js), of null
const dierVorige = new Map();   // per lijst de opname die als laatste klonk: nooit twee keer dezelfde achter elkaar (SFX ronde 5)
function dierOpname(keys, S) {
  let klaar = keys.filter((k) => S.has(k));
  if (!klaar.length) return null;
  const lijstId = keys[0];
  if (klaar.length > 1 && dierVorige.has(lijstId)) klaar = klaar.filter((k) => k !== dierVorige.get(lijstId));
  const key = klaar[Math.floor(Math.random() * klaar.length)];
  dierVorige.set(lijstId, key);
  return { key, buffer: S.buffer(key) };
}

function animalDef(kind) {
  if (typeof kind !== 'string') return null;
  const k = kind.toLowerCase();
  return ANIMALS[k] || ANIMALS[ALIASES[k]] || null;
}

function animals(dt, world) {
  timers.animals -= dt;
  const extra = world.countryAudible;
  const list = extra && extra.length ? (world.wildlife || []).concat(extra) : world.wildlife;
  if (!list || !list.length || stil(world)) return;
  const check = timers.animals <= 0;
  if (check) timers.animals = 0.4;
  const t = now();
  for (const a of list) {
    if (!a || typeof a.x !== 'number') continue;
    const def = animalDef(a.kind);
    if (!def) continue;
    const sp = typeof a.speed === 'number' ? a.speed : 0;
    const prevSp = animalSpeed.get(a) ?? sp;
    animalSpeed.set(a, sp);
    const h = typeof a.z === 'number' ? a.z + 0.2 : def.h;
    if (def.buf === 'pigeon' && sp - prevSp > 1.2 && K.dist(a.x, a.y, h) < 25) {
      playAt('flutter', a.x, a.y, h, { gain: 0.14, rate: rnd(0.9, 1.15), ref: 3, rolloff: 1.4, range: 25 });
    }
    if (!check) continue;
    const next = animalNext.get(a);
    if (next === undefined) { animalNext.set(a, t + rnd(1, def.gap[1])); continue; }
    if (t < next) continue;
    animalNext.set(a, t + rnd(def.gap[0], def.gap[1]));
    if (K.dist(a.x, a.y, h) > def.range) continue;
    // dagdieren zwijgen meestal in de nacht (de kikkers en krekels nemen het over)
    if (def.dag && (world.dayNight ? world.dayNight.night : 0) > 0.6 && Math.random() < 0.75) continue;
    const buf = def.buf === 'gull' ? 'gull_' + (Math.random() < 0.5 ? 0 : 1) : def.buf;
    const rate = rnd(def.rate[0], def.rate[1]);
    // de opname van sfx/samples.js (SFX ronde 3) als hij geladen is, anders de procedurele roep
    const rec = K.samples && def.rec ? dierOpname(def.rec, K.samples) : null;
    if (rec) { playAt(rec.key, a.x, a.y, h, { gain: def.gain * 0.8, rate, ref: 4, rolloff: 1.2, range: def.range, buffer: rec.buffer }); continue; }
    if (!buf) continue;   // een dier zonder procedurele roep (paard) zwijgt zolang de opname er niet is
    playAt(buf, a.x, a.y, h, { gain: def.gain, rate, ref: 4, rolloff: 1.2, range: def.range, cat: 'dier' });
    if (def.double && Math.random() < 0.5) later(rnd(0.25, 0.4), () => playAt(buf, a.x, a.y, h, { gain: def.gain * 0.9, rate: rate * 1.03, ref: 4, rolloff: 1.2, range: def.range, cat: 'dier' }));
  }
}

// Een losse roep van een dier van de omgeving (een meeuw of eend in een cutscene, cutscenesfx.js): dezelfde opname en procedurele
// terugval als de dieren in de wereld hierboven. kind: een sleutel of alias van ANIMALS. false = geen dier of nog niet klaar.
export function playAnimalCall(kind, x, y) {
  if (!K) return false;
  const def = animalDef(kind);
  if (!def) return false;
  const rate = rnd(def.rate[0], def.rate[1]);
  const rec = K.samples && def.rec ? dierOpname(def.rec, K.samples) : null;
  if (rec) { playAt(rec.key, x, y, def.h, { gain: def.gain * 0.8, rate, ref: 4, rolloff: 1.2, range: def.range, buffer: rec.buffer }); return true; }
  const buf = def.buf === 'gull' ? 'gull_' + (Math.random() < 0.5 ? 0 : 1) : def.buf;
  if (!buf) return false;
  playAt(buf, x, y, def.h, { gain: def.gain, rate, ref: 4, rolloff: 1.2, range: def.range, cat: 'dier' });
  return true;
}

export function updateAmbience(dt, world) {
  if (!K) return;
  runQueue();
  scanTimer -= dt;
  if (scanTimer <= 0) {
    scanTimer = SCAN_EVERY;
    scan(world);
  }
  setTargets(world);
  driveBeds(dt);
  if (K.muted()) return;
  ambientEvents(dt, world);
  bells(world);
  weatherEvents(world);
  animals(dt, world);
}

export function ambienceStats() {
  let running = 0;
  for (const k in beds) if (beds[k].src) running++;
  return { bedsRunning: running, queued: queue.length };
}

