// De achtergrond van het hoofdmenu (#380): bij elke start een andere, willekeurige keuze oriëntatiepunten uit de hele provincie.
// Pure regels (geen DOM, geen three.js): de standpuntenlijst, de keuze (nooit twee keer hetzelfde, niet twee uit één streek achter
// elkaar), de zon (het uur volgt de kant waar de camera staat) en de rustige camerabeweging. startscreen.js verplaatst de speler
// naar de plek en laat de wereld eromheen inladen; scripts/menuplekken_test.mjs draait de regels.
import { GRID_CONVERGENCE } from './rdnew.js';
import { sunElevationDeg } from './sunrules.js';

export const PLEKKEN_SLEUTEL = 'gde-menuplekken-v1';
const D2R = Math.PI / 180;
// zoveel plekken terug telt een plek nog als 'net gezien'
export const RECENT_N = 10;
export const REEKS_N = 3;
export const SHOT_S = 16;

// Een plek: x, y in het wereldframe (RD New, y wijst naar het zuiden); R: afstand van de camera tot het doel, z: hoogte van de camera,
// lookZ: hoogte van het kijkpunt op het doel, hoek: [van, tot] graden waarin de camera mag staan (0 = oost, 90 = zuid; standaard rondom),
// fov, gewicht (standaard 1). De coördinaten komen uit landmarkkits.json (kerken, molens, borgen) en index-provincie.json (plaatsen).
const P = (id, streek, soort, x, y, R, z, lookZ, extra = {}) => ({ id, streek, soort, x, y, R, z, lookZ, ...extra });
export const MENU_PLEKKEN = [
  // Waddenkust en Hogeland
  P('menkemaborg', 'hogeland', 'borg', 7566, -20771, 85, 20, 7, { hoek: [70, 110] }),
  P('uithuizen-jacobikerk', 'hogeland', 'kerk', 6886, -21030, 105, 17, 15),
  P('usquert-kerk', 'hogeland', 'kerk', 2770, -20431, 100, 16, 14),
  P('warffum-kerk-molen', 'hogeland', 'kerk', -500, -19190, 120, 18, 12),
  P('pieterburen-kerk', 'wad', 'kerk', -7906, -19938, 105, 17, 14),
  P('hornhuizen-kerk', 'wad', 'kerk', -13985, -18534, 95, 16, 13),
  P('zeerijp-jacobskerk', 'fivelingo', 'kerk', 12564, -14320, 130, 20, 16),
  P('loppersum-petruskerk', 'fivelingo', 'kerk', 11991, -12735, 100, 16, 14),
  P('westeremden-kerk', 'fivelingo', 'kerk', 9530, -13979, 100, 16, 14),
  P('stedum-kerk', 'fivelingo', 'kerk', 8395, -11586, 100, 16, 14),
  P('godlinze-kerk', 'fivelingo', 'kerk', 16328, -17325, 100, 16, 13),
  P('bedum-kerk', 'fivelingo', 'kerk', 2407, -9173, 100, 17, 15),
  P('baflo-kerk', 'fivelingo', 'kerk', -3688, -15891, 100, 17, 14),
  P('middelstum-kerk', 'fivelingo', 'kerk', 4844, -14363, 100, 17, 14),
  P('zeldenrust-molen', 'fivelingo', 'molen', 5122, -12681, 75, 13, 10),
  P('ceres-molen', 'fivelingo', 'molen', 17724, -19343, 75, 13, 10),
  P('appingedam-nicolaikerk', 'fivelingo', 'dorp', 19328, -11524, 100, 20, 8),
  P('delfzijl-molen', 'eemsdelta', 'molen', 23844, -12840, 95, 16, 10),
  // Lauwersmeer, Reitdiep en het Westerkwartier
  P('zoutkamp-haven', 'lauwers', 'haven', -17791, -12815, 130, 22, 3),
  P('verhildersum', 'lauwers', 'borg', -11707, -15744, 80, 16, 7),
  P('oldehove-molens', 'lauwers', 'molen', -11380, -9220, 110, 18, 12),
  P('garnwerd-molen', 'lauwers', 'molen', -4878, -9417, 85, 13, 10),
  P('allersmaborg', 'lauwers', 'borg', -7651, -10970, 100, 24, 6),
  P('aduard-abdijkerk', 'lauwers', 'kerk', -7065, -4005, 105, 17, 14),
  P('ezinge-kerk', 'lauwers', 'kerk', -8533, -10084, 100, 17, 14),
  P('piloersemaborg', 'westerkwartier', 'borg', -9975, -6165, 105, 26, 6),
  P('noordhorn-fortuna', 'westerkwartier', 'molen', -11360, -4233, 65, 11, 10),
  // Ommeland rond de stad
  P('thesinge-molen', 'ommeland', 'molen', 5767, -5626, 80, 12, 10),
  P('garmerwolde-kerk', 'ommeland', 'kerk', 5460, -3283, 100, 17, 14),
  P('zuidwolde-kerk', 'ommeland', 'kerk', 1788, -4676, 100, 17, 14),
  P('fraeylemaborg', 'ommeland', 'borg', 16345, 153, 85, 16, 7),
  P('noordlaren-molen', 'ommeland', 'molen', 6807, 10902, 70, 11, 10),
  // Oldambt, Dollard en Westerwolde
  P('termunten-ursuskerk', 'dollard', 'kerk', 31955, -9376, 100, 16, 14),
  P('ennemaborg', 'oldambt', 'borg', 29082, 2454, 80, 15, 7),
  P('winschoten-molens', 'oldambt', 'molen', 31115, 7375, 110, 17, 11),
  P('oudeschans', 'dollard', 'dorp', 38669, 8239, 125, 24, 4),
  P('bourtange-vesting', 'westerwolde', 'vesting', 42442, 22704, 170, 44, 1),
  P('oude-pekela-molen', 'veenkolonien', 'molen', 29993, 12276, 95, 20, 10),
];

// de stad zelf: de oriëntatiepunten van de kaart en de straten en grachten van startscreen.js (EXTRA_SPOTS); samen een streek
export const STAD_STREEK = 'stad';
export const STAD_GEWICHT = 0.3;
export function stadPlek(spot, i) {
  return { id: `stad-${i}-${spot.name}`, streek: STAD_STREEK, soort: 'stad', stad: true, gewicht: STAD_GEWICHT, x: spot.x, y: spot.y, kind: spot.kind, name: spot.name };
}

// ---- de keuze ----

// h: { eerste, recent }: de eerste plek van de vorige start en de laatst getoonde plekken (nieuwste laatst)
export const leegVerleden = () => ({ eerste: null, recent: [] });

export function leesVerleden(storage) {
  try {
    const raw = storage && storage.getItem(PLEKKEN_SLEUTEL);
    const o = raw ? JSON.parse(raw) : null;
    if (o && Array.isArray(o.recent)) return { eerste: typeof o.eerste === 'string' ? o.eerste : null, recent: o.recent.filter((s) => typeof s === 'string').slice(-30) };
  } catch (e) { /* geen opslag of onleesbaar: begin leeg */ }
  return leegVerleden();
}

export function bewaarVerleden(storage, h) {
  try { if (storage) storage.setItem(PLEKKEN_SLEUTEL, JSON.stringify({ eerste: h.eerste, recent: h.recent.slice(-30) })); } catch (e) { /* vol of geblokkeerd: de keuze is er dan alleen voor deze start */ }
}

// Het volgende standpunt: niet de eerste van de vorige start, niet een van de laatste RECENT_N en liefst niet uit de streek van de
// laatste twee. `pool` mag de stad bevatten (gewicht < 1: de provincie krijgt de meeste kansen).
export function kiesVolgende(pool, h, rand = Math.random) {
  const n = Math.min(RECENT_N, Math.floor(pool.length / 3));
  const recent = new Set(h.recent.slice(-n));
  if (h.eerste) recent.add(h.eerste);
  const streekVan = new Map(pool.map((p) => [p.id, p.streek]));
  const jongste = h.recent.slice(-2).map((id) => streekVan.get(id));
  let kand = pool.filter((p) => !recent.has(p.id));
  const anders = kand.filter((p) => !jongste.includes(p.streek));
  if (anders.length) kand = anders;
  if (!kand.length) kand = pool.filter((p) => p.id !== h.recent[h.recent.length - 1]);
  if (!kand.length) kand = pool;
  const tot = kand.reduce((s, p) => s + (p.gewicht ?? 1), 0);
  let r = rand() * tot;
  for (const p of kand) { r -= p.gewicht ?? 1; if (r <= 0) return p; }
  return kand[kand.length - 1];
}

export function noteer(h, plek, { eerste = false } = {}) {
  return { eerste: eerste ? plek.id : h.eerste, recent: [...h.recent, plek.id].slice(-30) };
}

// De reeks van een start: n plekken uit verschillende streken, de eerste nooit de eerste van de vorige start.
export function kiesReeks(pool, h, rand = Math.random, n = REEKS_N) {
  let hh = { eerste: h.eerste, recent: h.recent.slice() };
  const reeks = [];
  for (let i = 0; i < n; i++) {
    const p = kiesVolgende(pool, hh, rand);
    reeks.push(p);
    hh = noteer(hh, p, { eerste: i === 0 });
  }
  return { reeks, verleden: hh };
}

// ---- de zon ----

// Draait de zon met het uur zoals daynight.js: de middagrichting -60° plus de roosterconvergentie, 15° per uur (in x/y van de kaart)
const NOON_BEARING = -60 * D2R + GRID_CONVERGENCE;
export const zonAzimut = (uur) => NOON_BEARING + (uur - 12) * 15 * D2R;
const hoekVerschil = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
export const UREN = [];
for (let u = 7.5; u <= 18.75; u += 0.25) UREN.push(u);
const ZON_MIN_HOOGTE = 8;
export const ZON_MAX_AFWIJKING = 55 * D2R;
// de kanten waar de zon in de wereld achter de camera kan staan (noord tot oost, 225 tot 405 graden): daar kiest de camera, tenzij een plek eigen grenzen heeft
export const ZON_KANT = [225, 405];

// de uren waarop de zon aan de kant van de camera staat (achter of schuin achter je) en hoog genoeg staat
export function uurKandidaten(theta) {
  return UREN.filter((u) => sunElevationDeg(u) >= ZON_MIN_HOOGTE && hoekVerschil(zonAzimut(u), theta) <= ZON_MAX_AFWIJKING);
}

// De camerakant en het uur voor een plek: een kant uit het toegestane bereik waar de zon achter de camera kan staan.
// vast: { hoek (graden), uur } legt een van beide (of allebei) vast, voor de opnames en de test.
export function kiesKantEnUur(plek, rand = Math.random, vast = {}) {
  const [van, tot] = plek.hoek || ZON_KANT;
  const graden = (a) => (((a % 360) + 360) % 360) * D2R;
  const kies = (k) => k[Math.floor(rand() * k.length)];
  if (vast.hoek != null) {
    const theta = graden(vast.hoek), k = uurKandidaten(theta);
    return { theta, uur: vast.uur ?? (k.length ? kies(k) : bestUur(theta)) };
  }
  let eerste = null;
  for (let i = 0; i < 24; i++) {
    const theta = graden(van + rand() * (tot - van));
    const k = uurKandidaten(theta);
    if (k.length) return { theta, uur: vast.uur ?? kies(k) };
    if (eerste === null) eerste = theta;
  }
  return { theta: eerste, uur: vast.uur ?? bestUur(eerste) };
}
function bestUur(theta) {
  let b = UREN[0], d = Infinity;
  for (const u of UREN) { const v = hoekVerschil(zonAzimut(u), theta); if (v < d && sunElevationDeg(u) >= ZON_MIN_HOOGTE) { d = v; b = u; } }
  return b;
}

// ---- de camera ----

export const BEWEGINGEN = ['baan', 'zweef', 'kraan', 'glij'];
const zacht = (k) => { const t = Math.max(0, Math.min(1, k)); return t * t * (3 - 2 * t); };

// De pose(t) van een plek: een rustige beweging rond het doel. Geeft ook het uur, de kant en het soort beweging terug.
export function maakBeeld(plek, rand = Math.random, vast = {}) {
  const { theta, uur } = kiesKantEnUur(plek, rand, vast);
  const beweging = vast.beweging || BEWEGINGEN[Math.floor(rand() * BEWEGINGEN.length)];
  const dir = rand() < 0.5 ? 1 : -1;
  const { x, y, R, z, lookZ } = plek;
  const fov = plek.fov || 52;
  const focusDist = Math.min(300, plek.focus || R);
  const lookAt = { x, y, z: lookZ };
  const op = (a, r, h, s = 0) => {
    const px = x + Math.cos(a) * r - Math.sin(a) * s, py = y + Math.sin(a) * r + Math.cos(a) * s;
    return { position: { x: px, y: py, z: h }, lookAt, fov, focusDist };
  };
  let pose;
  if (beweging === 'baan') pose = (t) => op(theta + dir * 0.03 * t, R, z);
  else if (beweging === 'zweef') pose = (t) => op(theta, R * (1.1 - 0.014 * t), z * (1 - 0.004 * t));
  else if (beweging === 'kraan') pose = (t) => op(theta, R, z * (0.72 + 0.5 * zacht(t / SHOT_S)));
  else pose = (t) => op(theta, R, z, dir * (t - SHOT_S / 2) * R * 0.012);
  return { uur, theta, beweging, dir, pose };
}
