// citymap.json > game/stad.json, de ingecheckte handlaag van de stad (#90, docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md "stad.json").
//   node scripts/world/stad_split.mjs [--game game] [--out game/stad.json] [--omit buildings,water,green,trees]
// stad.json houdt wat niet uit OSM komt: meta (landmarks, wijken, buurtpunten, garages, horeca, verkeerslichten, pois, ...),
// de wegen, het spoor, het meubilair en de met de hand gemaakte gebouwen (isHandBuilding). De lagen water, groen, bomen en
// gebouwen komen uit de OSM-tegelbouw (stad_laag.mjs); stad.json bewaart wat de stadsbouw daarvoor uit citymap.json las:
// de stadstegels (tiles, in volgorde) en de dekking van de kaart (cover, een run-length masker).
// Dit is de enige lezer van citymap.json in de bouw; hij verdwijnt met citymap.json (scripts/stad_opruimen.mjs).
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAD_FORMAT, cityTileKeys } from './pack_tiles.mjs';
import { isHandBuilding } from './stad_laag.mjs';
import { buildCityCover } from './citycover.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const OSM_LAGEN = ['buildings', 'water', 'green', 'trees'];

// citymap.json zoals de oude stadsbouw hem las: { data, fromOsm: [], tiles, mask }; de dekking komt uit de kaart na mapextras
export async function readCitymap(game = path.join(ROOT, 'game')) {
  const data = JSON.parse(fs.readFileSync(path.join(game, 'citymap.json'), 'utf8'));
  const { GameMap, applyMapExtras } = await import('../../game/js/mapdata.js');
  const d = JSON.parse(fs.readFileSync(path.join(game, 'citymap.json'), 'utf8'));
  applyMapExtras(d, JSON.parse(fs.readFileSync(path.join(game, 'mapextras.json'), 'utf8')));
  return { data, fromOsm: [], tiles: cityTileKeys(data), mask: buildCityCover(new GameMap(d)).mask() };
}

// De handlaag uit de stadsdata van citymap.json; omit: de lagen die uit OSM komen (de rest blijft heel).
export function splitCity(city, { omit = OSM_LAGEN } = {}) {
  const out = { format: STAD_FORMAT, fromOsm: OSM_LAGEN.filter((l) => omit.includes(l)), tiles: city.tiles, cover: city.mask };
  for (const k of Object.keys(city.data)) {
    if (!omit.includes(k)) out[k] = city.data[k];
    else if (k === 'buildings') out[k] = city.data[k].filter(isHandBuilding);
  }
  return out;
}

// Leesbaar in git: elke sleutel op een regel, elke rij van een lijst op een eigen regel (de volgorde van de rijen is de gid van de tegels)
export function stringifyStad(s) {
  const lines = [];
  for (const [k, v] of Object.entries(s)) {
    if (Array.isArray(v) && v.length && v.every((r) => r && typeof r === 'object' && !Array.isArray(r))) {
      lines.push(`${JSON.stringify(k)}: [`, v.map((r) => JSON.stringify(r)).join(',\n'), '],');
    } else if (k === 'meta') {
      lines.push(`${JSON.stringify(k)}: {`, Object.entries(v).map(([mk, mv]) => `${JSON.stringify(mk)}: ${JSON.stringify(mv)}`).join(',\n'), '},');
    } else lines.push(`${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  }
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
  return '{\n' + lines.join('\n') + '\n}\n';
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
  const game = path.resolve(ROOT, opt('--game') || 'game');
  const out = path.resolve(ROOT, opt('--out') || path.join(game, 'stad.json'));
  const omit = opt('--omit') ? opt('--omit').split(',') : OSM_LAGEN;
  const stad = splitCity(await readCitymap(game), { omit });
  const text = stringifyStad(stad);
  JSON.parse(text);
  fs.writeFileSync(out, text);
  const n = (k) => (stad[k] ? stad[k].length : 0);
  console.log(`${path.relative(ROOT, out)}: ${(text.length / 1e6).toFixed(2)} MB; ${n('roads')} wegen, ${n('buildings')} gebouwen (hand), ${n('rails')} spoor, ${stad.tiles.length} stadstegels, dekking ${stad.cover.w}x${stad.cover.h}; uit OSM: ${stad.fromOsm.join(', ') || '-'}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
