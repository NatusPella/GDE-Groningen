// Kaartonthulling (#990): de pure regels achter het visuele ontdekken van de kaart. Wat is
// verborgen en hoe sterk (mist), hoe trekt de mist open vanaf het punt waar je ontdekte (de
// opening), wat blijft altijd zichtbaar, welk uitkijkpunt is de volgende stap en hoe zoomt de kaart
// naar het ontdekte gebied. Node-safe: geen canvas en geen opslag; mapview.js tekent, verkenpunten.js
// houdt het profiel. De ontdekking is per speler: elke regel krijgt het profiel van die speler.
// Samen spelen: een gast ontdekt op zijn eigen kaart (eigen profiel, gde-verkenning-v1); er gaat niets
// over het netwerk, en de wereld, de uitkijkpunten en de missies blijven voor iedereen gelijk.

// --- de mist ------------------------------------------------------------------------------------
// Drie niveaus. 'open': de plek is bekend (een streek die je kent, of een buurt die je bezocht).
// 'onbekend': in een streek die je nog niet kent: de zwaarste mist. 'buurt': buiten de streken (de
// stad en de randen), in een buurt die je nog niet bezocht: een lichtere waas.
export const MIST_ALPHA = { open: 0, buurt: 0.66, onbekend: 0.78 };

// Het mistniveau van één plek. area: de streek op die plek ({ id } of null), areaKnown: kent de speler
// hem, buurtId: de buurt op die plek (of null), buurtSeen: bezocht. Een gekende streek is helemaal
// open (je keek erover uit), ook de buurten die je nog niet bezocht.
export function mistLevel({ area = null, areaKnown = false, buurtId = null, buurtSeen = false } = {}) {
  if (area && areaKnown) return 'open';
  if (buurtId && buurtSeen) return 'open';
  if (area) return 'onbekend';
  if (buurtId) return 'buurt';
  return 'open';
}

// Het niveau als 0 tot 255 (alpha van het masker).
export const mistByte = (level) => Math.round(255 * (MIST_ALPHA[level] ?? 0));

// De eigenaar van elke cel van het masker: het nummer (1 tot n) van de streek waar de cel in valt
// (de dichtstbijzijnde middelpunt binnen zijn bereik, zoals streekAt in regioleven.js), anders 0.
// grid: { w, h, minx, miny, res }; centers: [{ x, y, reach }].
export function streekOwnerGrid(grid, centers) {
  const { w, h, minx, miny, res } = grid;
  const own = new Uint8Array(w * h);
  if (!(w > 0 && h > 0 && res > 0) || !Array.isArray(centers)) return own;
  for (let j = 0; j < h; j++) {
    const y = miny + (j + 0.5) * res;
    for (let i = 0; i < w; i++) {
      const x = minx + (i + 0.5) * res;
      let best = 0, bd = Infinity;
      for (let k = 0; k < centers.length; k++) {
        const c = centers[k];
        const d = Math.hypot(c.x - x, c.y - y);
        if (d <= c.reach && d < bd) { bd = d; best = k + 1; }
      }
      own[j * w + i] = best;
    }
  }
  return own;
}

// Het masker na de streekronde: een cel in een gekende streek is open (0), een cel in een onbekende
// streek zwaar bemist; een cel buiten de streken houdt wat de buurtronde zette. levels: Uint8Array
// (alpha per cel, wordt aangepast), owners: streekOwnerGrid, known: Set van de gekende streek-nummers.
export function applyStreekMist(levels, owners, known) {
  const zwaar = mistByte('onbekend');
  for (let i = 0; i < levels.length; i++) {
    const o = owners[i];
    if (!o) continue;
    levels[i] = known.has(o) ? 0 : zwaar;
  }
  return levels;
}

// --- de opening ---------------------------------------------------------------------------------
// Bij een nieuwe streek trekt de mist open vanaf het uitkijkpunt: een cirkel die groeit, met een zachte
// rand. De duur is lang genoeg om het te zien en kort genoeg om niet te vervelen.
export const OPEN_MS = 2600;
export const OPEN_SOFT_M = 2200; // breedte van de zachte rand van de opening, in meters

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t) => t * t * (3 - 2 * t);

// Hoe ver de opening is (0 tot 1), met een zachte start en een uitlopende eind (easeOutCubic).
export function openingProgress(now, at, ms = OPEN_MS) {
  if (!Number.isFinite(now) || !Number.isFinite(at) || !(ms > 0)) return 1;
  const t = clamp01((now - at) / ms);
  return 1 - Math.pow(1 - t, 3);
}

// De straal van de opening in meters: groeit tot ver genoeg om de hele streek te bedekken (maxR plus de rand).
export function openingRadius(now, at, maxR, ms = OPEN_MS, soft = OPEN_SOFT_M) {
  return openingProgress(now, at, ms) * (Math.max(0, maxR) + soft);
}

// Het niveau (0 tot 255) van een cel tijdens de opening: buiten de cirkel nog het oude niveau, binnen
// het nieuwe, en op de rand een vloeiende overgang (smoothstep).
export function openingLevel(oud, nieuw, dist, radius, soft = OPEN_SOFT_M) {
  if (!Number.isFinite(dist) || !Number.isFinite(radius)) return nieuw;
  if (dist <= radius - soft) return nieuw;
  if (dist >= radius) return oud;
  const t = smooth(clamp01((radius - dist) / soft));
  return Math.round(oud + (nieuw - oud) * t);
}

// Is de opening klaar?
export const openingDone = (now, at, ms = OPEN_MS) => !Number.isFinite(now) || !Number.isFinite(at) || now - at >= ms;

// --- wat nooit verdwijnt --------------------------------------------------------------------------
// De mist ligt onder de pictogrammen en de wereld blijft bestaan: wat een speler moet kunnen vinden
// verdwijnt nooit achter de mist. Op de kaart (de mist ligt eronder) en in Te doen (todofilter.js)
// geldt dezelfde lijst. Een onbekende streek verbergt alleen namen en activiteiten.
export const NOOIT_VERBORGEN_GROEPEN = ['missies', 'verhaal'];
export const NOOIT_VERBORGEN_SLEUTEL = /^om:(uitkijk|dorp:|beppe$)/;
export const NOOIT_VERBORGEN_SOORTEN = ['mission', 'missie', 'story', 'verhaal', 'uitkijkpunt', 'station', 'beppe', 'eerbetoon', 'speler', 'player', 'waypoint'];

// Mag dit ding op de kaart of in Te doen nooit door onbekend gebied verborgen worden? item: { group, key, kind }.
export function isNeverHidden(item) {
  if (!item) return false;
  if (NOOIT_VERBORGEN_GROEPEN.includes(item.group)) return true;
  if (typeof item.key === 'string' && NOOIT_VERBORGEN_SLEUTEL.test(item.key)) return true;
  return typeof item.kind === 'string' && NOOIT_VERBORGEN_SOORTEN.includes(item.kind);
}

// --- de volgende stap -------------------------------------------------------------------------------
// Het uitkijkpunt dat het meest oplevert: eerst het dichtstbijzijnde ongebruikte punt van een streek die
// de speler nog niet kent (een nieuwe streek ontdekken), anders het dichtstbijzijnde ongebruikte punt
// (voor de stempel). Geeft { point, nieuw, d } of null. isKnown(streekId) en isUsed(point) komen uit het
// profiel van deze speler.
export function nextViewpoint(points, from, { isKnown = () => false, isUsed = () => false } = {}) {
  if (!Array.isArray(points) || !from || !Number.isFinite(from.x) || !Number.isFinite(from.y)) return null;
  const open = points
    .filter((q) => q && Number.isFinite(q.x) && Number.isFinite(q.y) && !isUsed(q))
    .map((q) => ({ point: q, nieuw: !isKnown(q.streek), d: Math.hypot(q.x - from.x, q.y - from.y) }));
  if (!open.length) return null;
  const nieuwe = open.filter((o) => o.nieuw);
  const pool = nieuwe.length ? nieuwe : open;
  return pool.sort((a, b) => a.d - b.d)[0];
}

// De rij in Te doen: titel en regels volgen de stand ("3 van 8 verkend").
export function ontdekRij(stand, next) {
  if (!next) return null;
  const st = stand || { totaal: 0, verkend: 0 };
  return {
    title: next.nieuw ? 'Ontdek een nieuwe streek' : 'Uitkijken over de streek',
    meta: `${next.point.streekNaam || 'de provincie'} · ${Math.round(next.d)} m`,
    record: `${st.verkend} van ${st.totaal} verkend`,
  };
}

// --- de kaart naar het ontdekte gebied ---------------------------------------------------------------
// De schaal (pixels per meter) waarbij een streek met deze reikwijdte het scherm vult, met een rand
// (fill = welk deel van de korte zijde). Binnen [minScale, maxScale].
export function focusScale(reach, cw, ch, { fill = 0.8, minScale = 0, maxScale = Infinity } = {}) {
  if (!(reach > 0) || !(cw > 0) || !(ch > 0)) return minScale > 0 ? minScale : 0;
  const s = (Math.min(cw, ch) * fill) / (2 * reach);
  return Math.max(minScale, Math.min(maxScale, s));
}

// Een zachte tussenstap van de camera: van (x0, y0, z0) naar (x1, y1, z1), t van 0 tot 1. Het zoomen
// loopt geometrisch (elke stap even veel factor), zodat het niet kruipt en niet schiet.
export function cameraStep(from, to, t) {
  const u = smooth(clamp01(t));
  const z = from.zoom > 0 && to.zoom > 0 ? from.zoom * Math.pow(to.zoom / from.zoom, u) : to.zoom;
  return { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u, zoom: z };
}

// --- de teller ---------------------------------------------------------------------------------------
// "1 van 8 streken ontdekt · 0 verkend": ontdekt = je kent de streek, verkend = ook alle missies en het uitkijkpunt
// gedaan (de stempel). stand is strekenStand() van deze speler.
export function strekenTekst(stand) {
  if (!stand || !(stand.totaal > 0)) return '';
  return `${stand.ontdekt} van ${stand.totaal} streken ontdekt · ${stand.verkend} verkend`;
}

// --- de naamkaart ------------------------------------------------------------------------------------
export const NAAMKAART_MS = 4200;
// De inhoud van de naamkaart bij een nieuwe streek; stand is strekenStand() van deze speler.
export function naamkaart(areaName, stand) {
  if (!areaName) return null;
  const st = stand || { totaal: 0, ontdekt: 0, verkend: 0 };
  return {
    kicker: 'Nieuwe streek',
    naam: areaName,
    regel: `${st.ontdekt} van ${st.totaal} ontdekt`,
    sub: `${st.verkend} van ${st.totaal} verkend`,
  };
}

// De alpha van de naamkaart: zacht erin (eerste 15%), blijft staan, zacht eruit (laatste 25%).
export function naamkaartAlpha(now, at, ms = NAAMKAART_MS) {
  if (!Number.isFinite(now) || !Number.isFinite(at) || !(ms > 0)) return 0;
  const t = (now - at) / ms;
  if (t < 0 || t > 1) return 0;
  if (t < 0.15) return smooth(t / 0.15);
  if (t > 0.75) return smooth((1 - t) / 0.25);
  return 1;
}

// --- de wachtrij van onthullingen -----------------------------------------------------------------------
// Ontdek je een streek terwijl de kaart dicht is (het uitkijkpunt in de wereld), dan speelt de onthulling
// pas als je de kaart opent: dan zie je hem ook. Pure lijst van { area, x, y }; dubbele streken tellen één keer.
export function queueReveal(queue, ev) {
  const q = Array.isArray(queue) ? queue : [];
  if (!ev || typeof ev.area !== 'string' || !Number.isFinite(ev.x) || !Number.isFinite(ev.y)) return q;
  if (q.some((e) => e.area === ev.area)) return q;
  return [...q, { area: ev.area, x: ev.x, y: ev.y }];
}
