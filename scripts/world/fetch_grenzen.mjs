// De echte grenzen van de provincie Groningen ophalen, op verzoek, naar data/cache/grenzen/ (#414, gebieden veroveren).
// Alleen dit script gebruikt het netwerk; het spel zelf nooit. Zonder --haal-op doet het niets en toont wat het zou ophalen.
//   node scripts/world/fetch_grenzen.mjs --haal-op [--uit=data/cache/grenzen] [--jaar=2025]
// Bronnen (allemaal open data, coördinaten rechtstreeks in RD New, EPSG:28992):
//   provincie en gemeenten  Kadaster, PDOK Bestuurlijke Gebieden (OGC API, collecties provinciegebied en gemeentegebied)
//   woonplaatsen            Kadaster, BAG woonplaats (PDOK OGC API v2)
//   wijken en buurten       CBS, Gebiedsindelingen (PDOK OGC API, wijk_gegeneraliseerd en buurt_gegeneraliseerd, per jaarcode)
// Licenties en aftiteling: docs/LICENTIES.md. De ruwe antwoorden blijven in data/cache (niet in git);
// scripts/world/grenzen.mjs maakt er het compacte game/grenzen.json van.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(ROOT, arg('uit', 'data/cache/grenzen'));
const RD = 'crs=' + encodeURIComponent('http://www.opengis.net/def/crs/EPSG/0/28992');
const PROVINCIE = 'Groningen';
const BASES = {
  bestuurlijk: 'https://api.pdok.nl/kadaster/bestuurlijkegebieden/ogc/v1',
  bag: 'https://api.pdok.nl/kadaster/bag/ogc/v2',
  cbs: 'https://api.pdok.nl/cbs/gebiedsindelingen/ogc/v1',
};
const PLAN = [
  ['provincie.json', `${BASES.bestuurlijk}/collections/provinciegebied/items?f=json&limit=20&${RD}`, 'provinciegebied (alle provincies, daarna gefilterd op naam)'],
  ['gemeenten.json', `${BASES.bestuurlijk}/collections/gemeentegebied/items?f=json&limit=100&ligt_in_provincie_naam=${PROVINCIE}&${RD}`, 'gemeentegebied van Groningen'],
  ['woonplaatsen.json', `${BASES.bag}/collections/woonplaats/items?f=json&limit=100&provincie_naam=${PROVINCIE}&${RD}`, 'BAG woonplaatsen van Groningen'],
  ['wijken.json', `${BASES.cbs}/collections/wijk_gegeneraliseerd/items?f=json&limit=1000&jaarcode={jaar}&bbox={bbox}&${RD}`, 'CBS wijken in het kader van de provincie'],
  ['buurten.json', `${BASES.cbs}/collections/buurt_gegeneraliseerd/items?f=json&limit=1000&jaarcode={jaar}&bbox={bbox}&${RD}`, 'CBS buurten in het kader van de provincie'],
];

if (!process.argv.includes('--haal-op')) {
  console.log('fetch_grenzen: niets opgehaald (geef --haal-op). Het zou ophalen naar ' + OUT + ':');
  for (const [f, u, w] of PLAN) console.log(`  ${f.padEnd(18)} ${w}\n    ${u}`);
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function haal(url) {
  for (let poging = 1; ; poging++) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/geo+json, application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (poging >= 4) throw new Error(`${url}: ${e.message}`);
      await sleep(1500 * poging);
    }
  }
}
// Alle pagina's van een lijst (rel=next), tot de limiet van maxPaginas.
async function alles(url, maxPaginas = 60) {
  const features = [];
  let u = url;
  for (let p = 0; u && p < maxPaginas; p++) {
    const j = await haal(u);
    features.push(...(j.features || []));
    const next = (j.links || []).find((l) => l.rel === 'next');
    u = next ? next.href : null;
    process.stdout.write(`\r  ${features.length} objecten`);
  }
  process.stdout.write('\n');
  return features;
}
const bboxVan = (g) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const loop = (c) => { if (typeof c[0] === 'number') { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); } else for (const k of c) loop(k); };
  loop(g.coordinates);
  return [x0, y0, x1, y1];
};
// RD naar lengte- en breedtegraad is hier niet nodig: de bbox-parameter van PDOK is standaard WGS84, dus we vragen met een ruime
// vaste doos om Groningen. Wat buiten de provincie ligt valt in grenzen.mjs af (gemeentecode).
const DOOS_WGS84 = '6.0,52.78,7.3,53.62';

fs.mkdirSync(OUT, { recursive: true });
const bewaar = (naam, features, extra = {}) => fs.writeFileSync(path.join(OUT, naam), JSON.stringify({ type: 'FeatureCollection', ...extra, features }));
const bron = { opgehaald: new Date().toISOString(), crs: 'EPSG:28992', provincie: PROVINCIE, doosWgs84: DOOS_WGS84, bestanden: {} };

console.log('provincie');
const prov = (await alles(PLAN[0][1])).filter((f) => f.properties.naam === PROVINCIE);
if (!prov.length) throw new Error('provincie Groningen niet gevonden');
bewaar('provincie.json', prov);
bron.bestanden['provincie.json'] = prov.length;

console.log('gemeenten');
const gm = await alles(PLAN[1][1]);
if (!gm.length) throw new Error('geen gemeenten gevonden');
bewaar('gemeenten.json', gm);
bron.bestanden['gemeenten.json'] = gm.length;
const codes = new Set(gm.map((f) => f.properties.identificatie));

console.log('woonplaatsen');
let wp = await alles(PLAN[2][1]);
bewaar('woonplaatsen.json', wp);
bron.bestanden['woonplaatsen.json'] = wp.length;

// het laatste jaar waarvoor de CBS-indeling bestaat
let jaar = Number(arg('jaar', 0));
if (!jaar) {
  for (const j of [2027, 2026, 2025, 2024, 2023]) {
    const t = await haal(`${BASES.cbs}/collections/wijk_gegeneraliseerd/items?f=json&limit=1&jaarcode=${j}`);
    if ((t.features || []).length) { jaar = j; break; }
  }
}
if (!jaar) throw new Error('geen jaarcode gevonden voor de CBS-indeling');
bron.cbsJaar = jaar;
for (const [naam, soort] of [['wijken.json', 'wijk'], ['buurten.json', 'buurt']]) {
  console.log(`${soort}en ${jaar}`);
  const url = PLAN.find((p) => p[0] === naam)[1].replace('{jaar}', jaar).replace('{bbox}', DOOS_WGS84);
  const f = (await alles(url)).filter((x) => codes.has(x.properties.gm_code));
  bewaar(naam, f, { jaarcode: jaar });
  bron.bestanden[naam] = f.length;
}
fs.writeFileSync(path.join(OUT, 'bron.json'), JSON.stringify(bron, null, 1));
console.log('klaar:', JSON.stringify(bron.bestanden), 'CBS-jaar', jaar, '->', OUT);
