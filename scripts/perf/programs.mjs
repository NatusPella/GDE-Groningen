// Shader program count: where do the programs of renderer.info.programs come from?
//   node scripts/perf/programs.mjs --static                 key sites in game/js (onBeforeCompile, customProgramCacheKey) without Electron
//   node scripts/perf/programs.mjs <dump.json> [--snap=N]   decode the cacheKeys of a programs.page.js run (see scripts/perf/programs.page.js)
// A cacheKey of three r160 is the join of: shaderID, defines (name,value pairs), precision, 40 parameters in a fixed order, two bit masks
// (features and render state), outputColorSpace and the material's customProgramCacheKey. This script cuts a key into those fields
// and shows per field how many programs would disappear if that field were constant (sensitivity), so the count is explained by data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vindVendorCache } from '../lib/vendorcache.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const arg = (k, d = '') => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };

// --- the key layout, read from the vendored three so it follows an upgrade -------------------------------------------------------------------
export function keyLayout(threeFile = vindVendorCache(ROOT).three || path.join(ROOT, 'desktop', 'vendor-cache', 'npm', 'three@0.160.0', 'build', 'three.module.js')) {
  const src = fs.readFileSync(threeFile, 'utf8');
  const a = src.indexOf('function getProgramCacheKeyParameters(');
  const b = src.indexOf('function getProgramCacheKeyBooleans(');
  const c = src.indexOf('function getUniforms(', b);
  if (a < 0 || b < 0 || c < 0) throw new Error('three: key layout not found');
  const params = [...src.slice(a, b).matchAll(/array\.push\( parameters\.(\w+) \)/g)].map((m) => m[1]);
  const booleans = src.slice(b, c);
  const split = booleans.indexOf('array.push( _programLayers.mask )');
  const bits = (s) => { const out = []; for (const m of s.matchAll(/if \( parameters\.(\w+) \)\s*_programLayers\.enable\( (\d+) \)/g)) out[+m[2]] = m[1]; return out; };
  return { params, features: bits(booleans.slice(0, split)), state: bits(booleans.slice(split + 10)) };
}

// Splits one cacheKey into named fields. The custom key (last) may itself contain commas (a function's source), so it takes the rest.
export function decodeKey(key, L) {
  const t = key.split(',');
  const pi = t.findIndex((x) => x === 'highp' || x === 'mediump' || x === 'lowp');
  if (pi < 0) return { shaderID: t[0], raw: key };
  const f = { shaderID: t[0], defines: t.slice(1, pi).join(',') };
  let i = pi;
  for (const p of L.params) f[p] = t[i++];
  const fm = +t[i++], sm = +t[i++];
  f.features = L.features.filter((_, n) => fm & (1 << n)).filter(Boolean).join('+');
  f.state = L.state.filter((_, n) => sm & (1 << n)).filter(Boolean).join('+');
  f.outputColorSpace2 = t[i++];
  f.custom = t.slice(i).join(',');
  return f;
}

// the tag of a custom key: the suffixes the game adds ('|cut', '|pool', ...) and a short fingerprint of the rest
export function customTag(c) {
  const tags = [...(c || '').matchAll(/\|(cutc|cut|pool|bakedcolor|pedfade|portal)\b|(skyline)$|^(portal)\|/g)].map((m) => m[1] || m[2] || m[3]);
  const named = /^[a-z][\w-]*$/i.test((c || '').split('|')[0]) && !/[(){}=]/.test(c || '') ? (c || '').split('|')[0] : (c ? 'fn#' + hash(c.replace(/\|(cutc|cut|pool|bakedcolor|pedfade)\b/g, '')) : '');
  return (named + (tags.length ? '|' + tags.join('|') : '')).slice(0, 60);
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

const FIELDS_NOT_AXES = new Set(['raw', 'outputColorSpace2']);
export function analyse(list, L) {
  const dec = list.map((p) => ({ p, f: decodeKey(p.k, L) }));
  const byName = {};
  for (const { p, f } of dec) { const k = `${p.n}/${f.shaderID}`; byName[k] = (byName[k] || 0) + 1; }
  const byTag = {};
  for (const { f } of dec) { const k = customTag(f.custom); byTag[k] = (byTag[k] || 0) + 1; }
  // sensitivity: distinct keys left when a field is dropped from the key
  const fieldNames = Object.keys(dec[0] ? dec[0].f : {}).filter((x) => !FIELDS_NOT_AXES.has(x));
  const sens = [];
  for (const name of fieldNames) {
    const set = new Set(dec.map(({ f }) => fieldNames.filter((x) => x !== name).map((x) => f[x]).join('\u0001')));
    const distinct = new Set(dec.map(({ f }) => f[name])).size;
    if (distinct > 1) sens.push({ field: name, distinct, programsIfConstant: set.size, saved: dec.length - set.size });
  }
  sens.sort((a, b) => b.saved - a.saved);
  return { total: dec.length, byName, byTag, sens };
}

// --- static: sites in the source -----------------------------------------------------------------------------------------------------------
function staticScan() {
  const dir = path.join(ROOT, 'game', 'js');
  const rows = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (e.name.endsWith('.js')) scan(f); } };
  const scan = (f) => {
    const s = fs.readFileSync(f, 'utf8'); const rel = path.relative(dir, f).replace(/\\/g, '/');
    const lines = s.split('\n');
    lines.forEach((l, i) => {
      if (/\.customProgramCacheKey\s*=/.test(l)) {
        const rhs = l.split('=').slice(1).join('=');
        const dyn = /\$\{|\+\s*(?!['"`])[A-Za-z_(]/.test(rhs.replace(/\|\w+'|'\|\w+/g, ''));
        rows.push({ file: rel, line: i + 1, kind: 'key', dynamic: dyn, text: l.trim().slice(0, 140) });
      } else if (/\.onBeforeCompile\s*=/.test(l)) rows.push({ file: rel, line: i + 1, kind: 'patch', text: l.trim().slice(0, 140) });
      else if (/new THREE\.MeshPhysicalMaterial/.test(l)) rows.push({ file: rel, line: i + 1, kind: 'physical', text: l.trim().slice(0, 140) });
      else if (/new THREE\.(Point|Spot)Light\(/.test(l)) rows.push({ file: rel, line: i + 1, kind: 'light', text: l.trim().slice(0, 140) });
    });
  };
  walk(dir);
  return rows;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--static')) {
    const rows = staticScan();
    const files = {};
    for (const r of rows) (files[r.file] ||= []).push(r);
    for (const [f, rs] of Object.entries(files)) {
      console.log(`${f}: ${rs.filter((r) => r.kind === 'patch').length} patches, ${rs.filter((r) => r.kind === 'key').length} keys (${rs.filter((r) => r.dynamic).length} dynamic), ${rs.filter((r) => r.kind === 'physical').length} physical, ${rs.filter((r) => r.kind === 'light').length} lights`);
      for (const r of rs.filter((x) => x.kind === 'key' || x.kind === 'physical')) console.log(`   ${r.line}: ${r.kind}${r.dynamic ? ' DYN' : ''} ${r.text}`);
    }
    const n = (k) => rows.filter((r) => r.kind === k).length;
    console.log(`totaal: ${n('patch')} onBeforeCompile-toewijzingen, ${n('key')} customProgramCacheKey-toewijzingen, ${n('physical')} MeshPhysicalMaterial, ${n('light')} Point/SpotLight-sites`);
  } else {
    const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
    if (!file) { console.error('usage: programs.mjs --static | <dump.json> [--snap=N]'); process.exit(2); }
    const dump = JSON.parse(fs.readFileSync(file, 'utf8'));
    const L = keyLayout();
    const which = arg('snap', '');
    dump.snaps.forEach((s, i) => {
      if (which !== '' && +which !== i) return;
      const a = analyse(s.list, L);
      console.log(`\n== snapshot ${i} (t=${s.at}s): ${s.count} programma's, ${s.linked} gelinkt, heap ${s.heapMB} MB, parallel compile ${s.parallel}`);
      console.log('per naam/shaderID:', JSON.stringify(a.byName));
      console.log('per custom-sleutel (top 15):', JSON.stringify(Object.entries(a.byTag).sort((x, y) => y[1] - x[1]).slice(0, 15)));
      console.log('gevoeligheid (veld constant maken: programma\'s over):');
      for (const r of a.sens.slice(0, 12)) console.log(`  ${r.field.padEnd(22)} ${String(r.distinct).padStart(3)} waarden -> ${String(r.programsIfConstant).padStart(4)} programma's (-${r.saved})`);
    });
    if (dump.win) console.log('\nhitches:', JSON.stringify(dump.win));
  }
}
