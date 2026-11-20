// Eén kleurmodule voor de kaart en de minikaart (20-11, ds-tokens): de kleuren van alles wat de kaart bovenop het land tekent
// komen uit het designsysteem (ds-tokens.css), niet uit losse hexen. Node-safe, geen DOM nodig: de tabel hieronder is de terugval
// en is gelijk aan de tokens (kaartkleuren_test.mjs vergelijkt ze met ds-tokens.css). Een canvas kan geen var() lezen, dus
// dsKleur() vraagt de token aan de pagina als die er is en valt anders op de tabel terug.
//
import { dsWereldCss } from './worldpalette.js';

// Het land zelf (MAP_PALETTE in mapstyle.js) hoort bij de voorgerenderde provinciepiramide en verandert mee met de wereldbouw.
export const DS_TERUGVAL = {
  // de vijf inkten van de zeefdruk (ADR 0040)
  'ink-papier': '#f3ead3', 'ink-inkt': '#1d1b17', 'ink-bord': '#0e6b3c', 'ink-geel': '#f9c80e', 'ink-roze': '#e8505b',
  // papier en glas (de HUD-rollen)
  papier: '#f5efe0', inkt: '#1d1b17', 'inkt-zacht': '#4d483c', bord: '#0e6b3c', geel: '#f9c80e',
  glas: '#0c140e', 'glas-2': '#17301f', 'glas-3': '#1f3a28', creme: '#f0ede4', 'creme-zacht': '#b9b7ad',
  'licht-groen': '#3fc97a', 'rood-glas': '#d93f3f', 'rood-glas-tx': '#f5b5ad', 'amber-glas-tx': '#ffbe46',
};

const cache = new Map();
// De kleur van een token (zonder --ds-c-). Leest de pagina als die er is, anders de terugval.
export function dsKleur(naam) {
  if (cache.has(naam)) return cache.get(naam);
  let k = DS_TERUGVAL[naam];
  if (!k) throw new Error('onbekende ds-kleur: ' + naam);
  try {
    if (typeof document !== 'undefined' && typeof getComputedStyle === 'function') {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--ds-c-' + naam).trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) k = v.toLowerCase();
    }
  } catch (e) { /* zonder pagina blijft de terugval */ }
  cache.set(naam, k);
  return k;
}
export const vernieuwDsKleuren = () => cache.clear();

// Hex naar 'rgba(r, g, b, a)'.
export function hexA(hex, alpha) {
  const h = String(hex).replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${alpha})`;
}

// Relatieve luminantie en contrast (WCAG), voor de leesbaarheidstest.
export function luminantie(hex) {
  const h = String(hex).replace('#', '');
  const f = (i) => { const c = parseInt(h.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4);
}
export function contrast(a, b) {
  const la = luminantie(a), lb = luminantie(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// De rollen van de kaart-chroom, benoemd naar de tokens (mapstyle.js INK leest dit).
export const KAART_ROLLEN = {
  cream: 'creme', paper: 'papier', dark: 'glas', panelTop: 'glas-2', greenLight: 'licht-groen', red: 'rood-glas', amber: 'amber-glas-tx',
  yellow: 'ink-geel', amberInk: 'inkt', greenDark: 'ink-bord',
};
export function kaartInk() {
  const uit = {};
  for (const [rol, token] of Object.entries(KAART_ROLLEN)) uit[rol] = dsKleur(token);
  return uit;
}

// De kleuren van de gebiedstoestanden (gebiedenkaart.js), allemaal uit de inkten en het glas.
export function gebiedKleuren() {
  return {
    onzichtbaar: { vul: dsKleur('glas-3'), lijn: dsKleur('creme-zacht'), raster: dsKleur('ink-inkt') },
    zichtbaar: { vul: dsKleur('ink-papier'), lijn: dsKleur('ink-papier') },
    bezig: { vul: dsKleur('ink-geel'), lijn: dsKleur('ink-geel') },
    veroverd: { vul: dsKleur('licht-groen'), lijn: dsKleur('licht-groen'), rand: dsKleur('ink-inkt') }, // 20-11: veroverd is groen (lichtgroen uit de ds-tokens), aan het veroveren blijft geel
  };
}

// --- het land en de markers (21-11): één zeefdrukpalet voor de kaartlagen ----------------------------------------------------
// De kaart is het GLAS-oppervlak van het designsysteem (donker groen glas; ds-tokens.css): het land komt uit het glas en het
// bordgroen, de wegen uit crème, het water uit het grachtwater van DESIGN_SYSTEM.md. Geel is alleen voor route en doel, rood
// voor politie en gevaar. Alles hieronder is gemengd uit tokens (meng), behalve het water: het designsysteem heeft geen
// blauwe token, dus het water is één benoemde waarde (DESIGN_SYSTEM.md, 'grachtwater groenblauw').
// De wereldmenging (worldpalette.js WERELD_DS_MENG, ?dswereld=) werkt ook op de kaart (21-11): het land en de gebouwen gaan door dezelfde
// rollen als in de 3D-wereld (groen naar bordgroen gedempt, steen en bouw naar papier), met behoud van helderheid. Daardoor blijft het
// contrast met de wegen en het glas zoals de test het meet, en ziet de speler op de kaart dezelfde warme, gedempte toon als in het beeld.
// Bewust NIET gemengd: het water (de ene benoemde waarde hieronder, vastgelegd in DESIGN_SYSTEM.md), de wegen die op het glas moeten
// oplichten (major, turbine) en de fietspaden (al een roze menging).
const LAND_ROL = {
  meadow: 'groen', park: 'groen', tree: 'groen', forest: 'groen', allot: 'groen', sports: 'groen', village: 'groen',
  road: 'steen', minor: 'steen', foot: 'steen', rail: 'steen', business: 'steen', building: 'bouw', church: 'bouw',
};
function volgWereld(palet) {
  const uit = { ...palet };
  for (const [naam, rol] of Object.entries(LAND_ROL)) if (typeof uit[naam] === 'string') uit[naam] = dsWereldCss(uit[naam], rol);
  if (Array.isArray(uit.buildings)) uit.buildings = uit.buildings.map((h) => dsWereldCss(h, 'bouw'));
  return uit;
}

export const WATER_BLAUW = '#2c7790';
export const KAART_PALET_VERSIE = 'zeef-1';

// Twee hexen mengen: t = 0 geeft a, t = 1 geeft b.
export function meng(a, b, t) {
  const p = (h, i) => parseInt(String(h).replace('#', '').slice(i, i + 2), 16);
  const c = (i) => Math.round(p(a, i) * (1 - t) + p(b, i) * t).toString(16).padStart(2, '0');
  return '#' + c(0) + c(2) + c(4);
}

// Het land van de grote kaart en van de minikaart (overdag; mapstyle.js zet er 's nachts de nachtfactor op).
export function kaartLand() {
  const k = dsKleur;
  const glas = k('glas'), glas2 = k('glas-2'), glas3 = k('glas-3'), bord = k('ink-bord'), creme = k('creme'), zacht = k('creme-zacht');
  const papier = k('ink-papier'), roze = k('ink-roze'), licht = k('licht-groen');
  const water = WATER_BLAUW, rand = meng(water, creme, 0.5);
  const kaart = {
    meadow: meng(glas2, glas3, 0.45), park: meng(bord, glas3, 0.12), ditch: water, water, waterEdge: rand,
    road: zacht, major: creme, minor: meng(zacht, glas2, 0.3), cycle: meng(papier, roze, 0.35), foot: meng(zacht, glas2, 0.42),
    building: hexA(papier, 0.5), church: hexA(papier, 0.85), tree: meng(bord, glas, 0.5), village: meng(glas3, bord, 0.22),
    allot: meng(bord, glas3, 0.45), sports: meng(bord, glas3, 0.12), business: meng(glas3, zacht, 0.18), rail: meng(zacht, glas, 0.3), railTie: papier, turbine: creme,
    forest: meng(bord, glas, 0.42),
  };
  const mini = {
    meadow: meng(glas3, bord, 0.3), park: meng(bord, licht, 0.22), ditch: meng(water, creme, 0.25), water: meng(water, creme, 0.25), waterEdge: meng(water, creme, 0.65),
    road: zacht, major: creme, minor: zacht, cycle: kaart.cycle, foot: zacht,
    building: meng(papier, glas3, 0.35), buildings: [meng(papier, glas3, 0.35), meng(zacht, glas3, 0.3), meng(papier, roze, 0.25), meng(zacht, water, 0.3), meng(papier, bord, 0.25)],
    church: meng(papier, glas3, 0.5), tree: meng(bord, glas, 0.25), village: meng(glas3, bord, 0.4),
    allot: meng(bord, licht, 0.1), sports: meng(bord, licht, 0.22), business: meng(zacht, glas3, 0.45), rail: meng(zacht, glas, 0.12), railTie: papier, turbine: creme,
    forest: meng(bord, glas, 0.2),
  };
  return { kaart: volgWereld(kaart), mini: volgWereld(mini) };
}

// De kleuren van de oude provinciepiramide (de PNG's die vóór 21-11 zijn gebakken: de oude MAP_PALETTE) en waar ze in de nieuwe
// kaart voor staan. Een oude piramide wordt bij het laden herkleurd (provincemap.js); een nieuwe wordt al in de nieuwe kleuren
// gebakken (scripts/world/province_map.mjs) en draagt KAART_PALET_VERSIE in zijn meta, dan blijft dit achterwege.
export const PIRAMIDE_OUD = {
  green: [0x2f, 0x5c, 0x36], forest: [0x24, 0x4a, 0x2c], water: [0x2d, 0x6a, 0x86], waterEdge: [0x4a, 0x8f, 0xae],
  building: [160, 156, 146], minor: [0x8f, 0x90, 0x95], normal: [0xc7, 0xc7, 0xc2], major: [0xf0, 0xed, 0xe4], cycle: [0xb8, 0x70, 0x3a], rail: [0x55, 0x52, 0x4c],
};
const rgbVan = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export function piramideNieuw() {
  const { kaart } = kaartLand();
  const gebouw = /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/.exec(kaart.building);
  return {
    green: rgbVan(kaart.park), forest: rgbVan(kaart.forest), water: rgbVan(kaart.water), waterEdge: rgbVan(kaart.waterEdge),
    building: [+gebouw[1], +gebouw[2], +gebouw[3]], minor: rgbVan(kaart.minor), normal: rgbVan(kaart.road), major: rgbVan(kaart.major), cycle: rgbVan(kaart.cycle), rail: rgbVan(kaart.rail),
  };
}

// Herkleurt een raster (RGBA, in de plaats): elke pixel krijgt de nieuwe kleur van de dichtstbijzijnde oude kleur, de alfa blijft.
// Eén opzoektabel per kleur, dus een tegel van 512 x 512 kost enkele milliseconden en alleen bij het laden.
export function herkleurRaster(px, van = PIRAMIDE_OUD, naar = piramideNieuw()) {
  const namen = Object.keys(van);
  const lut = new Map();
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const sleutel = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
    let nieuw = lut.get(sleutel);
    if (nieuw === undefined) {
      let beste = namen[0], afstand = Infinity;
      for (const n of namen) {
        const o = van[n];
        const d = (o[0] - px[i]) ** 2 + (o[1] - px[i + 1]) ** 2 + (o[2] - px[i + 2]) ** 2;
        if (d < afstand) { afstand = d; beste = n; }
      }
      const c = naar[beste];
      nieuw = (c[0] << 16) | (c[1] << 8) | c[2];
      lut.set(sleutel, nieuw);
    }
    px[i] = nieuw >> 16; px[i + 1] = (nieuw >> 8) & 255; px[i + 2] = nieuw & 255;
  }
  return px;
}

// De kleur van de glyph op een vlak: de lichtste van crème en inkt die het best leest.
export function glyphOp(vlak) {
  return contrast(dsKleur('creme'), vlak) >= contrast(dsKleur('ink-inkt'), vlak) ? dsKleur('creme') : dsKleur('ink-inkt');
}

// De markers (kaart en minikaart) in vijf rollen uit de tokens: bordgroen voor diensten en winkels, geel voor doelen en
// acties, rood voor politie en gevaar, inktblauw voor vervoer en water, crème voor de rest. Rand: crème; silhouet: inkt.
export function markerRollen() {
  const k = dsKleur;
  // bord, rood en blauw zijn net zo donker dat een crème glyph 4,5:1 haalt en de donkere buitenrand van de schijf 3:1
  return { bord: meng(k('ink-bord'), k('licht-groen'), 0.1), geel: k('ink-geel'), rood: meng(k('rood-glas'), k('ink-inkt'), 0.18), blauw: meng(WATER_BLAUW, k('ink-inkt'), 0.1), creme: k('creme') };
}
// Welke rol bij welke categorie hoort (mapstyle.js ICON_FILL en ICON_RIM lezen dit).
export const MARKER_ROL = {
  zorg: 'bord', politiebureau: 'rood', garage: 'blauw', station: 'blauw', job: 'bord', shop: 'bord', fun: 'creme', horeca: 'bord', ommeland: 'blauw',
  flitspaal: 'rood', tip: 'creme', other: 'creme',
  // alleen een rand (missie- en gebiedsvlakken, rijtjes): gevaar en rivaal rood, doelen geel
  gevaar: 'rood', rival: 'rood', halte: 'geel', subdoel: 'geel', own: 'geel',
};
const RAND_ALLEEN = ['gevaar', 'rival', 'halte', 'subdoel', 'own'];
export function markerKleuren() {
  const r = markerRollen();
  const vul = {}, rim = {};
  for (const [cat, rol] of Object.entries(MARKER_ROL)) {
    if (!RAND_ALLEEN.includes(cat)) vul[cat] = r[rol];
    if (cat === 'flitspaal' || cat === 'tip' || cat === 'other') continue; // zonder eigen rand: de standaardrand (crème)
    rim[cat] = rol === 'geel' ? r.geel : cat === 'gevaar' || cat === 'rival' ? dsKleur('rood-glas-tx') : r.creme; // de rand van een schijf is crème; doelen houden geel, gevaar licht rood
  }
  return { vul, rim, glyph: dsKleur('creme') };
}
