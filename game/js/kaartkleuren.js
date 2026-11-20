// Eén kleurmodule voor de kaart en de minikaart (20-11, ds-tokens): de kleuren van alles wat de kaart bovenop het land tekent
// komen uit het designsysteem (ds-tokens.css), niet uit losse hexen. Node-safe, geen DOM nodig: de tabel hieronder is de terugval
// en is gelijk aan de tokens (kaartkleuren_test.mjs vergelijkt ze met ds-tokens.css). Een canvas kan geen var() lezen, dus
// dsKleur() vraagt de token aan de pagina als die er is en valt anders op de tabel terug.
//
// Het land zelf (MAP_PALETTE in mapstyle.js) hoort bij de voorgerenderde provinciepiramide en verandert mee met de wereldbouw.
export const DS_TERUGVAL = {
  // de vijf inkten van de zeefdruk (ADR 0040)
  'ink-papier': '#f3ead3', 'ink-inkt': '#1d1b17', 'ink-bord': '#0e6b3c', 'ink-geel': '#f9c80e', 'ink-roze': '#e8505b',
  // papier en glas (de HUD-rollen)
  papier: '#f5efe0', inkt: '#1d1b17', 'inkt-zacht': '#4d483c', bord: '#0e6b3c', geel: '#f9c80e',
  glas: '#0c140e', 'glas-2': '#17301f', 'glas-3': '#1f3a28', creme: '#f0ede4', 'creme-zacht': '#b9b7ad',
  'licht-groen': '#3fc97a', 'rood-glas': '#d93f3f', 'amber-glas-tx': '#ffbe46',
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
    veroverd: { lijn: dsKleur('ink-papier'), rand: dsKleur('ink-inkt') },
  };
}
