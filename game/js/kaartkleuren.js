// Eén kleurmodule voor de kaart en de minikaart (20-11, ds-tokens): de kleuren van alles wat de kaart bovenop het land tekent
// komen uit het designsysteem (ds-tokens.css), niet uit losse hexen. Node-safe, geen DOM nodig: de tabel hieronder is de terugval
// en is gelijk aan de tokens (kaartkleuren_test.mjs vergelijkt ze met ds-tokens.css). Een canvas kan geen var() lezen, dus
// dsKleur() vraagt de token aan de pagina als die er is en valt anders op de tabel terug.
//
import { wereldMeng } from './worldpalette.js';

// Het land zelf (MAP_PALETTE in mapstyle.js) hoort bij de voorgerenderde provinciepiramide en verandert mee met de wereldbouw.
export const DS_TERUGVAL = {
  // de vijf inkten van de zeefdruk (ADR 0040)
  'ink-papier': '#f3ead3', 'ink-inkt': '#1d1b17', 'ink-bord': '#0e6b3c', 'ink-geel': '#f9c80e', 'ink-roze': '#e8505b',
  // papier en glas (de HUD-rollen)
  papier: '#f5efe0', 'papier-2': '#ebe2cb', wit: '#ffffff', inkt: '#1d1b17', 'inkt-zacht': '#4d483c', bord: '#0e6b3c', geel: '#f9c80e',
  glas: '#0c140e', 'glas-2': '#17301f', 'glas-3': '#1f3a28', creme: '#f0ede4', 'creme-zacht': '#b9b7ad',
  'licht-groen': '#3fc97a', 'rood-glas': '#d93f3f', 'rood-glas-tx': '#f5b5ad', 'amber-glas-tx': '#ffbe46', 'amber-tx': '#7a4a00',
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

// Hex naar 'rgba(r, g, b, a)'.
export function hexA(hex, alpha) {
  const h = String(hex).replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${alpha})`;
}

// Relatieve luminantie en contrast (WCAG), voor de leesbaarheidstest.
function luminantie(hex) {
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

// --- het land en de markers (22-11): één zeefdrukpalet voor de kaartlagen ---------------------------------------------------------
// De kaart is een gedrukt kaartje, net als de DS3-schermen: crème papier als land, inkt voor de lijnen (wegen, spoor, randen), en twee
// overdrukken per categorie: bordgroen voor groen, park, bos en akkers, en het grachtwater voor water. Misdrukroze is het accent van
// kerken en fietspaden. Geel blijft voor route en doel, rood voor politie en gevaar. Alles hieronder is gemengd uit tokens (meng); het
// designsysteem heeft geen blauwe token, dus het water is de ene benoemde waarde WATER_BLAUW (DESIGN_SYSTEM.md, 'grachtwater groenblauw').
// Gekozen uit drie kandidaten (docs/KAART-PALETTEN-22-11.md; de andere twee staan in scripts/lib/kaart_paletten.mjs): A haalt de beste
// leesbaarheid voor de markers (inktrand tegen crème, 3:1 en meer) en past het dichtst bij de papieren schermen.
// De Wereldkleur-instelling (worldpalette.js wereldMeng: uit 0, subtiel 0,4, drukwerk 0,65) bepaalt hoe sterk de kleurvlakken zijn:
// uit geeft meer tint (natuurlijker), drukwerk vlakker en lichter (zeefdruk). De lijnen, het papier en de inkt blijven gelijk, zodat het
// contrast van wegen en markers bij elke stand klopt (kaart_ds3_test meet alle drie).
export const WATER_BLAUW = '#2c7790';
export const KAART_PALET_VERSIE = 'zeef-2';

// Twee hexen mengen: t = 0 geeft a, t = 1 geeft b.
export function meng(a, b, t) {
  const p = (h, i) => parseInt(String(h).replace('#', '').slice(i, i + 2), 16);
  const c = (i) => Math.round(p(a, i) * (1 - t) + p(b, i) * t).toString(16).padStart(2, '0');
  return '#' + c(0) + c(2) + c(4);
}

// De sterkte van de vlaktinten bij een Wereldkleur-menging: 1,25 bij uit (0), 1 bij subtiel (0,4) en 0,8 bij drukwerk (0,65).
export function kaartTintSterkte(m = wereldMeng()) {
  return Math.max(0.8, Math.min(1.25, 1.25 - (Math.max(0, m) / 0.65) * 0.45));
}

// Het land van de grote kaart en van de minikaart (overdag; mapstyle.js zet er 's nachts de nachtfactor op).
export function kaartLand(m = wereldMeng()) {
  const k = dsKleur, f = kaartTintSterkte(m);
  const P = k('papier'), P2 = k('papier-2'), I = k('ink-inkt'), IZ = k('inkt-zacht'), B = k('ink-bord'), R = k('ink-roze'), WA = WATER_BLAUW;
  const tint = (a, b, t) => meng(a, b, Math.min(1, t * f)); // een vlaktint: sterker of zwakker met de Wereldkleur
  const kaart = {
    meadow: meng(P, P2, 0.35), park: tint(P, B, 0.16), forest: tint(P, B, 0.34), tree: tint(P, B, 0.46), allot: tint(P, B, 0.1), sports: tint(P, B, 0.2),
    village: meng(P2, P, 0.3), business: meng(P2, IZ, 0.16),
    water: tint(P, WA, 0.55), ditch: tint(P, WA, 0.8), waterEdge: meng(WA, I, 0.15),
    road: IZ, major: I, minor: meng(IZ, P, 0.3), cycle: meng(R, I, 0.12), foot: meng(IZ, P, 0.35), rail: I, railTie: P, turbine: I,
    building: hexA(meng(P2, IZ, 0.5), 0.92), church: hexA(meng(R, P2, 0.45), 0.95),
  };
  // de minikaart is klein en wordt in één blik gelezen: iets sterkere wegen, gebouwen als gedekte vlakken in vijf tinten
  const mini = {
    ...kaart, meadow: meng(P, P2, 0.2), road: meng(IZ, I, 0.4), minor: meng(IZ, P, 0.2), foot: meng(IZ, P, 0.34),
    building: meng(P2, IZ, 0.4), buildings: [meng(P2, IZ, 0.4), meng(P2, IZ, 0.48), meng(P2, R, 0.3), meng(P2, WA, 0.25), meng(P2, B, 0.25)], church: meng(R, P2, 0.45),
  };
  return { kaart, mini };
}

// De inkt van de teksten op het land (namen van straten, wijken, plaatsen): inkt met een papieren halo, de rollen van de gedrukte kaart.
// water: de naam op het water, amber: een waarschuwing (cafés en gevaar 's nachts), flavour: de bijschriften van het land.
export function kaartLabel() {
  const k = dsKleur, I = k('ink-inkt'), P = k('papier');
  return { tekst: I, halo: P, water: meng(WATER_BLAUW, I, 0.45), amber: k('amber-tx'), flavour: k('inkt-zacht') };
}

// De kleuren van de oude provinciepiramide (de PNG's die vóór 21-11 zijn gebakken: de oude MAP_PALETTE) en waar ze in de nieuwe
// kaart voor staan. Een oude piramide wordt bij het laden herkleurd (provincemap.js); een nieuwe wordt al in de nieuwe kleuren
// gebakken (scripts/world/province_map.mjs) en draagt KAART_PALET_VERSIE in zijn meta, dan blijft dit achterwege.
export const PIRAMIDE_OUD = {
  green: [0x2f, 0x5c, 0x36], forest: [0x24, 0x4a, 0x2c], water: [0x2d, 0x6a, 0x86], waterEdge: [0x4a, 0x8f, 0xae],
  building: [160, 156, 146], minor: [0x8f, 0x90, 0x95], normal: [0xc7, 0xc7, 0xc2], major: [0xf0, 0xed, 0xe4], cycle: [0xb8, 0x70, 0x3a], rail: [0x55, 0x52, 0x4c],
};
// De piramide van 21-11 (palet 'zeef-1', het donkere glas): dezelfde sleutels, bij het laden herkleurd naar het crèmepapier van 'zeef-2'.
const PIRAMIDE_ZEEF1 = {
  green: [28, 100, 62], forest: [20, 69, 43], water: [44, 119, 144], waterEdge: [142, 178, 186],
  building: [243, 234, 211], minor: [138, 142, 129], normal: [186, 183, 171], major: [240, 237, 228], cycle: [239, 180, 169], rail: [134, 134, 124],
};
// De kleuren waarmee een gebakken piramide is getekend, naar zijn meta.palet (geen palet: de oude van vóór 21-11).
export const piramideVan = (palet) => (palet === 'zeef-1' ? PIRAMIDE_ZEEF1 : PIRAMIDE_OUD);
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
