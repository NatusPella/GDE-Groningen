// De OSM-lagen van de stad (osmCityLayers, stad_laag.mjs) zijn het dure deel van elke stadsbouw en van elke test die de stad
// laadt (#90). Hier staan ze in een cache in de tijdelijke map, met een sleutel uit alles wat het resultaat bepaalt:
// de stadstegels, de dekking, de handgebouwen, de gevraagde lagen, de provincie-extracten en de bestanden van de bouwcode
// (grootte + tijd van de import-sluiting van stad_laag.mjs en build_province.mjs, en van hun json-bestanden). Verandert er iets, dan is de sleutel anders; GDE_STAD_CACHE=0 zet de cache uit.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const cacheDir = () => process.env.GDE_STAD_CACHE_DIR || path.join(os.tmpdir(), 'gde-stad-cache');

const stamps = (dir, test, out) => {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir).sort()) {
    if (!test(f)) continue;
    const s = fs.statSync(path.join(dir, f));
    if (s.isFile()) out.push(`${dir}/${f}:${s.size}:${Math.floor(s.mtimeMs)}`);
  }
};

// de bestanden die osmCityLayers kan laden: de import-sluiting van stad_laag.mjs en build_province.mjs (relatieve import en import())
const IMPORT = /(?:from|import\()\s*['"](\.[^'"]+)['"]/g;
export function codeClosure(entries) {
  const seen = new Set(), todo = [...entries];
  while (todo.length) {
    const f = todo.pop();
    if (seen.has(f) || !fs.existsSync(f)) continue;
    seen.add(f);
    if (!/\.m?js$/.test(f)) continue;
    for (const m of fs.readFileSync(f, 'utf8').matchAll(IMPORT)) todo.push(path.resolve(path.dirname(f), m[1]));
  }
  return [...seen].sort();
}

// grootte + tijd van de bouwcode en van de bronbestanden
export async function inputStamp() {
  const out = [];
  for (const f of codeClosure([path.join(ROOT, 'scripts/world/stad_laag.mjs'), path.join(ROOT, 'scripts/world/build_province.mjs')])) {
    const s = fs.statSync(f);
    out.push(`${path.relative(ROOT, f)}:${s.size}:${Math.floor(s.mtimeMs)}`);
  }
  stamps(path.join(ROOT, 'data/world'), () => true, out);
  stamps(path.join(ROOT, 'scripts/world'), (f) => f.endsWith('.json'), out);
  stamps(path.join(ROOT, 'game'), (f) => f.endsWith('.json') && !['stad.json', 'mapextras.json'].includes(f), out);
  const { SRC_DIR: PROV_SRC, bufferDirs: PROV_BUFFERS } = await import('./province_src.mjs');
  for (const d of [PROV_SRC, ...PROV_BUFFERS(PROV_SRC)]) stamps(d, () => true, out);
  return out.join('\n');
}

// zelfde argumenten als osmCityLayers (stad_laag.mjs), plus de dekkingsmasker voor de sleutel
export async function osmCityLayersCached(keys, inside, lagen, data, mask) {
  const { osmCityLayers } = await import('./stad_laag.mjs');
  if (process.env.GDE_STAD_CACHE === '0') return osmCityLayers(keys, inside, lagen, data);
  const { isHandBuilding } = await import('./stad_laag.mjs');
  const h = crypto.createHash('sha256');
  h.update(await inputStamp());
  h.update(JSON.stringify([[...keys], mask, [...lagen].sort(), (data.buildings || []).filter(isHandBuilding)]));
  const file = path.join(cacheDir(), h.digest('hex').slice(0, 32) + '.json');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* geen cache: bouwen */ }
  const rows = await osmCityLayers(keys, inside, lagen, data);
  try {
    fs.mkdirSync(cacheDir(), { recursive: true });
    const tmp = file + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(rows));
    fs.renameSync(tmp, file);
  } catch { /* de cache is een gemak, geen vereiste */ }
  return rows;
}
