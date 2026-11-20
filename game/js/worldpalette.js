// De ene wereldpalet-module (21-11, ADR 0040): trekt de kleuren van de 3D-wereld SUBTIEL naar de vijf inkten van het designsysteem
// (papier, inkt, bordgroen, zomergeel, misdrukroze) en kent één regelaar, WERELD_DS_MENG (0 = het oude palet, 1 = volledig).
// Kleur is gratis: dit is een pure functie over een hex, aangeroepen waar een kleur wordt vastgelegd (GeoBuilder, habboMaterial,
// grasbasis, boomkroon, wegdek, water, kaartpalet). Geen extra materiaal, programma of drawcall; de wereldcache blijft geldig.
// Blad: geen THREE, geen DOM nodig (Node-scripts als province_map lezen mapstyle.js, dat deze module leest).
//
// Regels die de test bewaakt (worldpalette_test.mjs):
// - de helderheid (luma) van een kleur blijft behouden bij elke rol behalve accent en papier: wegen, stoepen en gevaren houden hun contrast;
// - bij meng 0 is de uitkomst gelijk aan de invoer; de uitkomst is deterministisch en blijft binnen 0x000000..0xffffff;
// - geen wintertint: alleen warme, groene en inktblauwe doelen, geen wit en geen kou.

// De inkten van het designsysteem (gelijk aan ds-tokens.css en kaartkleuren.js) plus het ene inktblauwgroen van het water.
export const WERELD_INKTEN = Object.freeze({
  papier: 0xf3ead3, inkt: 0x1d1b17, bord: 0x0e6b3c, geel: 0xf9c80e, roze: 0xe8505b,
  water: 0x1f4654, // inktblauwgroen: tussen bordgroen en een rustig blauw; het designsysteem kent geen blauw, de wereld heeft water nodig
});

// Standaard subtiel (0,25 tot 0,35 volgens de opdracht van de eigenaar). Vergelijken: ?dswereld=0 (oud) en ?dswereld=1 (volledig).
export const WERELD_DS_MENG = 0.3;

// Per rol: het doel, de maximale menging bij meng 1, en of de helderheid behouden blijft.
export const WERELD_ROLLEN = Object.freeze({
  bouw: { doel: 'papier', w: 0.8, luma: true },   // gevels, bakstenen, daken: warmer en minder verzadigd, crème ondertoon
  steen: { doel: 'papier', w: 0.6, luma: true },  // stoep, straatsteen, grijs beton: een warme papiertoon
  weg: { doel: 'inkt', w: 0.6, luma: true },      // asfalt: warm inktgrijs in plaats van koud blauwgrijs
  donker: { doel: 'inkt', w: 0.9, luma: true },   // bijna zwart wordt inkt, geen puur zwart
  groen: { doel: 'bord', w: 0.7, luma: true },    // gras en loof: gedempter en consistenter richting bordgroen
  loof: { doel: 'bord', w: 0.55, luma: true },    // boomkronen: iets minder, zodat soorten herkenbaar blijven
  water: { doel: 'water', w: 0.8, luma: true },   // inktblauwgroen, minder neon
  blauw: { doel: 'water', w: 0.6, luma: true },   // glas, schaduwtint
  papier: { doel: 'papier', w: 0.8, luma: false }, // wit (wegmarkering, kozijn) wordt papier
  geel: { doel: 'geel', w: 0.5, luma: false },    // gerichte accenten: luifels, markers
  roze: { doel: 'roze', w: 0.5, luma: false },
});

let _meng = null;
// De huidige menging: ?dswereld=0..1 in de URL (browser en Electron), anders de constante.
export function wereldMeng() {
  if (_meng !== null) return _meng;
  let m = WERELD_DS_MENG;
  try {
    if (typeof location !== 'undefined' && location.search) {
      const v = new URLSearchParams(location.search).get('dswereld');
      if (v !== null && v !== '' && Number.isFinite(Number(v))) m = Number(v);
    }
  } catch (e) { /* zonder pagina blijft de constante */ }
  _meng = Math.max(0, Math.min(1, m));
  return _meng;
}
// Voor tests en vergelijkbeelden: zet de menging (null = weer uit de URL lezen).
export function setWereldMeng(m) { _meng = m === null ? null : Math.max(0, Math.min(1, Number(m))); _cache.clear(); }

const _cache = new Map();
const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const pack = (r, g, b) => (Math.round(Math.max(0, Math.min(255, r))) << 16) | (Math.round(Math.max(0, Math.min(255, g))) << 8) | Math.round(Math.max(0, Math.min(255, b)));
export const wereldLuma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b; // 0..255 op de sRGB-waarden

// Het doel op dezelfde helderheid als de bron: schaal, begrens, vul het tekort op.
function matchLuma(t, L) {
  const lt = wereldLuma(t[0], t[1], t[2]) || 1;
  let o = [t[0] * L / lt, t[1] * L / lt, t[2] * L / lt];
  for (let i = 0; i < 3; i++) {
    o = o.map((v) => Math.max(0, Math.min(255, v)));
    const d = L - wereldLuma(o[0], o[1], o[2]);
    if (Math.abs(d) < 0.5) break;
    o = o.map((v) => v + d);
  }
  return o.map((v) => Math.max(0, Math.min(255, v)));
}

// De rol van een kleur, afgeleid van tint, verzadiging en helderheid (vloeiende drempels zijn niet nodig: de verschillen tussen rollen zijn klein).
export function wereldRol(hex) {
  const [r, g, b] = rgb(hex);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn;
  const L = wereldLuma(r, g, b);
  const S = mx ? c / mx : 0;
  let h = 0;
  if (c) {
    if (mx === r) h = ((g - b) / c) % 6; else if (mx === g) h = (b - r) / c + 2; else h = (r - g) / c + 4;
    h = (h * 60 + 360) % 360;
  }
  if (S > 0.55 && L > 50) { // verzadigd: alleen geel en rood/roze krijgen een zachte trek, de rest (politieblauw, groen licht) blijft
    if (h >= 35 && h <= 70) return 'geel';
    if (h <= 20 || h >= 335) return 'roze';
    return null;
  }
  if (L < 40 && S < 0.45) return 'donker';
  if (h >= 70 && h < 170 && S > 0.12) return 'groen';
  if (h >= 170 && h < 260 && S > 0.08) return 'blauw';
  if (S < 0.1) return 'steen';
  return 'bouw';
}

// De hoofdfunctie: een hex (0xRRGGBB) naar de wereldkleur. rol 'auto' (standaard) leidt de rol af; een vaste rol (zie WERELD_ROLLEN) forceert hem.
// meng is optioneel (voor tests, de kleurplaat en het vergelijken); anders wereldMeng().
export function dsWereld(hex, rol = 'auto', meng = null) {
  if (typeof hex !== 'number' || !Number.isFinite(hex)) return hex;
  const m = meng === null ? wereldMeng() : Math.max(0, Math.min(1, meng));
  if (m <= 0) return hex;
  const key = `${hex}|${rol}|${m}`;
  const hit = _cache.get(key);
  if (hit !== undefined) return hit;
  const r = rol === 'auto' ? wereldRol(hex) : rol;
  const spec = r && WERELD_ROLLEN[r];
  let out = hex;
  if (spec) {
    const s = rgb(hex);
    let t = rgb(WERELD_INKTEN[spec.doel]);
    if (spec.luma) t = matchLuma(t, wereldLuma(s[0], s[1], s[2]));
    const k = Math.min(1, m * spec.w);
    out = pack(s[0] + (t[0] - s[0]) * k, s[1] + (t[1] - s[1]) * k, s[2] + (t[2] - s[2]) * k);
  }
  if (_cache.size > 20000) _cache.clear();
  _cache.set(key, out);
  return out;
}

// '#rrggbb' of 'rgba(r, g, b, a)' (de kaartpaletten) door dezelfde regels; de alfa blijft.
export function dsWereldCss(css, rol = 'auto', meng = null) {
  if (typeof css !== 'string') return css;
  let m = /^#([0-9a-fA-F]{6})$/.exec(css);
  if (m) return '#' + dsWereld(parseInt(m[1], 16), rol, meng).toString(16).padStart(6, '0');
  m = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\s*\)$/.exec(css);
  if (m) {
    const o = dsWereld(pack(+m[1], +m[2], +m[3]), rol, meng);
    return `rgba(${(o >> 16) & 255}, ${(o >> 8) & 255}, ${o & 255}, ${m[4]})`;
  }
  return css;
}

// De kleurplaat (docs/WERELDKLEUREN-21-11.md): de hoofdkleuren per categorie, met de rol waarmee ze door de wereld lopen.
export const WERELD_KLEURPLAAT = Object.freeze({
  'Gevels en bakstenen': { rol: 'auto', kleuren: { baksteenrood: 0x8f4634, baksteenoranje: 0xa9623f, donkerbaksteen: 0x6e3a2c, bruinbaksteen: 0x7d4b37, geelbaksteen: 0xb08a5e, pleisterwit: 0xe3ddd0, crème: 0xd6cab0, roze: 0xc2a293, mint: 0xa3b2a0, okergeel: 0xcfb46c } },
  'Daken': { rol: 'auto', kleuren: { terracotta: 0x8a4a33, leisteen: 0x464b52, bruinrood: 0x5b3a2e, blauwgrijs: 0x3e4449, industrie: 0x5a5d60 } },
  'Wegdek en stoep': { rol: 'auto', kleuren: { 'asfalt hoofdweg': 0x57595c, 'asfalt gewoon': 0x4b4d50, fietspad: 0x823b2d, 'klinker rood': 0x6c4236, 'klinker grijs': 0x7a766e, tegels: 0x837e74, stoep: 0x7b776d, grind: 0x9a8f78 } },
  'Gras en velden': { rol: 'auto', kleuren: { park: 0x4f7234, weide: 0x557434, bos: 0x405e2c, gazon: 0x4a6c31, 'droog gras': 0x9c9153, mos: 0x3b5a2c, rand: 0x3b5529 } },
  'Bomen': { rol: 'auto', kleuren: { linde: 0x4f7d3a, plataan: 0x5d8a42, eik: 0x48703a, beuk: 0x527a33, es: 0x6a9148, populier: 0x6a9352, wilg: 0x82a35e, den: 0x2e4d2a, kers: 0xe58fb4, 'stam eik': 0x4a3a2c } },
  'Water': { rol: 'auto', kleuren: { diep: 0x0b2420, ondiep: 0x2c4a38, kroos: 0x5d7f2c, schuim: 0xb9c2b0 } },
  'Voertuigen en kleine props': { rol: 'auto', kleuren: { 'luifel groen': 0x2f5a3a, 'luifel rood': 0x7a2424, 'luifel geel': 0x8a6a2a, 'parasol rood': 0x8f2f2a, 'kraam geel': 0xc99a3a, 'kleur metaal': 0x7b7e82, 'zwart plastic': 0x232323, 'hout midden': 0x8a6440 } },
  'Lucht en licht (zon hoog, bijna avond)': { rol: 'auto', kleuren: { 'zon hoog': 0xfff4e2, 'zenit hoog': 0x3a78c4, 'horizon hoog': 0xc8d9e2, 'mist hoog': 0xc6d4dc, 'horizon avond': 0xf1ae74, 'mist avond': 0xd9a67e, 'schaduwtint hoog': 0xf6f6f6, 'schaduwtint avond': 0xd6eaf2 } },
  'Kaart (minikaart)': { rol: 'auto', kleuren: { weide: 0x3e4c39, park: 0x5a8445, water: 0x3a86a8, weg: 0xa8ada2, gebouw: 0xb98a6a, bos: 0x34562c } },
});
