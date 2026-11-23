// Zet de meubels uit het interieurregister (game/js/propregister.js INTERIEUR_REGISTER) om van de glb's van Quaternius (CC0, buiten
// git) naar ons formaat: game/js/interiorprops_data.js. Per meubel een palet (sRGB-hex per materiaal, met een soort: 0 vast,
// 1 gloeit (lampkap), 2 glas), het model zelf met gekwantiseerde posities (uint16 over de box), een paletindex per hoekpunt en
// indices. De normalen rekent het spel zelf (vlak gearceerd, laag-poly). De lichtere LOD-niveaus maakt het centrale
// LOD-systeem (lodkit3d.js) bij het bouwen.
//   node scripts/akte1/meubels_converteer.mjs [--bron=<map met de packs>] [--meet]
// Standaardbron: %USERPROFILE%/gde-assets/quaternius (ultimate-home-interior/pack en ultimate-furniture/pack), of GDE_QUATERNIUS.
// Alleen de bron leest dit script; het schrijft één bestand in de repo en verder niets.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INTERIEUR_REGISTER, INTERIEUR_IDS } from '../../game/js/propregister.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const BRON = arg('bron') || process.env.GDE_QUATERNIUS || path.join(os.homedir(), 'gde-assets', 'quaternius');
const PACKS = { home: 'ultimate-home-interior/pack', furniture: 'ultimate-furniture/pack' };
const UIT = path.join(ROOT, 'game/js/interiorprops_data.js');
const MEET = process.argv.includes('--meet');

// --- glb lezen --------------------------------------------------------------------------------------------------------------
function readGlb(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32LE(0) !== 0x46546c67) throw new Error('geen glb: ' + file);
  let off = 12, json = null, bin = null;
  while (off < b.length) {
    const len = b.readUInt32LE(off), type = b.readUInt32LE(off + 4);
    const chunk = b.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    else if (type === 0x004e4942) bin = chunk;
    off += 8 + len;
  }
  return { json, bin };
}

const COMP = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function accessor(g, i) {
  const a = g.json.accessors[i], bv = g.json.bufferViews[a.bufferView];
  const [T, size] = COMP[a.componentType], n = NCOMP[a.type];
  const stride = bv.byteStride || size * n;
  const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const out = new Float64Array(a.count * n);
  for (let k = 0; k < a.count; k++) {
    for (let c = 0; c < n; c++) {
      const o = base + k * stride + c * size;
      out[k * n + c] = T === Float32Array ? g.bin.readFloatLE(o) : T === Uint16Array ? g.bin.readUInt16LE(o) : T === Uint32Array ? g.bin.readUInt32LE(o) : T === Uint8Array ? g.bin.readUInt8(o) : T === Int16Array ? g.bin.readInt16LE(o) : g.bin.readInt8(o);
    }
  }
  return out;
}

// 4x4 kolom-matrices (zoals glTF)
const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a, b) {
  const r = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) r[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
  return r;
}
function trs(n) {
  if (n.matrix) return n.matrix.slice();
  const [tx, ty, tz] = n.translation || [0, 0, 0];
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale || [1, 1, 1];
  return [
    (1 - 2 * (y * y + z * z)) * sx, (2 * (x * y + z * w)) * sx, (2 * (x * z - y * w)) * sx, 0,
    (2 * (x * y - z * w)) * sy, (1 - 2 * (x * x + z * z)) * sy, (2 * (y * z + x * w)) * sy, 0,
    (2 * (x * z + y * w)) * sz, (2 * (y * z - x * w)) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
const apply = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];

// lineair -> sRGB-hex
const toSrgb = (c) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; };
const hexOf = (f) => (Math.round(toSrgb(f[0]) * 255) << 16) | (Math.round(toSrgb(f[1]) * 255) << 8) | Math.round(toSrgb(f[2]) * 255);
// glas en gloeiende lampkappen krijgen een eigen materiaal; 'LightMetal', 'LightOrange' enz. zijn gewoon licht van kleur
const soortVan = (naam) => (/glass/i.test(naam) ? 2 : /^light$/i.test(naam) || /^light[._]?\d*$/i.test(naam) ? 1 : 0);

// Leest één glb tot een geïndexeerde mesh in meters met Y omhoog: { pos: [], col: [] (paletindex), idx: [], palet: [{ hex, soort, naam }] }
function laad(file) {
  const g = readGlb(file);
  const pos = [], col = [], idx = [], palet = [];
  const paletIdx = new Map();
  const scene = g.json.scenes[g.json.scene || 0];
  const walk = (ni, parent) => {
    const n = g.json.nodes[ni];
    const m = mul(parent, trs(n));
    if (n.mesh != null) {
      for (const p of g.json.meshes[n.mesh].primitives) {
        if (p.mode != null && p.mode !== 4) continue;
        const mat = p.material != null ? g.json.materials[p.material] : { name: 'standaard' };
        const f = (mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorFactor) || [0.8, 0.8, 0.8, 1];
        const hex = hexOf(f), soort = soortVan(mat.name || '');
        const key = hex + '|' + soort;
        if (!paletIdx.has(key)) { paletIdx.set(key, palet.length); palet.push({ hex, soort, naam: mat.name || '' }); }
        const ci = paletIdx.get(key);
        const P = accessor(g, p.attributes.POSITION);
        const base = pos.length / 3;
        for (let k = 0; k < P.length; k += 3) { pos.push(...apply(m, P[k], P[k + 1], P[k + 2])); col.push(ci); }
        const I = p.indices != null ? accessor(g, p.indices) : Array.from({ length: P.length / 3 }, (_, k) => k);
        // een spiegelende transformatie draait de wikkeling om
        const det = m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);
        for (let k = 0; k < I.length; k += 3) det < 0 ? idx.push(base + I[k], base + I[k + 2], base + I[k + 1]) : idx.push(base + I[k], base + I[k + 1], base + I[k + 2]);
      }
    }
    for (const c of n.children || []) walk(c, m);
  };
  for (const ni of scene.nodes) walk(ni, ident());
  return { pos, col, idx, palet };
}

// Voorkant naar +x, oorsprong midden op de grond.
function normaliseer(mesh, voor) {
  const f = { '+z': [0, 1], '-z': [0, -1], '+x': [1, 0], '-x': [-1, 0] }[voor];
  if (!f) throw new Error('onbekende voorkant ' + voor);
  // draaien om y zodat de voorkant (fx, fz) op +x valt: cos = fx, sin = fz
  const [c, s] = f;
  const p = mesh.pos;
  for (let k = 0; k < p.length; k += 3) {
    const x = p[k], z = p[k + 2];
    p[k] = x * c + z * s;
    p[k + 2] = -x * s + z * c;
  }
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < p.length; k += 3) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], p[k + c]); mx[c] = Math.max(mx[c], p[k + c]); }
  const cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2;
  for (let k = 0; k < p.length; k += 3) { p[k] -= cx; p[k + 1] -= mn[1]; p[k + 2] -= cz; }
  return mesh;
}

// Lassen: hoekpunten met dezelfde positie (en kleur) worden één; met `cel` > 0 op een raster (lod 1).
function las(mesh, cel) {
  const { pos, col, idx } = mesh;
  const map = new Map(), som = [], np = [], nc = [], remap = new Int32Array(pos.length / 3);
  for (let v = 0; v < pos.length / 3; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const key = cel > 0 ? `${Math.round(x / cel)},${Math.round(y / cel)},${Math.round(z / cel)},${col[v]}` : `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)},${col[v]}`;
    let i = map.get(key);
    if (i == null) { i = nc.length; map.set(key, i); nc.push(col[v]); som.push([0, 0, 0, 0]); }
    const s = som[i]; s[0] += x; s[1] += y; s[2] += z; s[3]++;
    remap[v] = i;
  }
  for (const s of som) np.push(s[0] / s[3], s[1] / s[3], s[2] / s[3]);
  const ni = [], seen = new Set();
  for (let k = 0; k < idx.length; k += 3) {
    const a = remap[idx[k]], b = remap[idx[k + 1]], c = remap[idx[k + 2]];
    if (a === b || b === c || a === c) continue;
    const key = [a, b, c].sort((p, q) => p - q).join(',');
    if (cel > 0 && seen.has(key)) continue;
    seen.add(key);
    ni.push(a, b, c);
  }
  return { pos: np, col: nc, idx: ni, palet: mesh.palet };
}

// Kwantiseren en inpakken: [pos uint16 x 3n][col uint8 x n][pad tot 2][idx uint16 x 3t] in base64.
function pak(mesh, box) {
  const n = mesh.col.length, t = mesh.idx.length / 3;
  if (n > 65535) throw new Error('te veel hoekpunten voor uint16-indices: ' + n);
  const colBytes = n + (n % 2);
  const buf = Buffer.alloc(n * 6 + colBytes + t * 6);
  for (let v = 0; v < n; v++) for (let c = 0; c < 3; c++) {
    const q = box[3 + c] > 0 ? Math.round(((mesh.pos[v * 3 + c] - box[c]) / box[3 + c]) * 65535) : 0;
    buf.writeUInt16LE(Math.max(0, Math.min(65535, q)), (v * 3 + c) * 2);
  }
  for (let v = 0; v < n; v++) buf.writeUInt8(mesh.col[v], n * 6 + v);
  const io = n * 6 + colBytes;
  for (let k = 0; k < mesh.idx.length; k++) buf.writeUInt16LE(mesh.idx[k], io + k * 2);
  return { v: n, t, b64: buf.toString('base64') };
}

const data = {};
let totaal = 0;
for (const id of INTERIEUR_IDS) {
  const e = INTERIEUR_REGISTER[id];
  const file = path.join(BRON, PACKS[e.bron.pack], e.bron.bestand);
  if (!fs.existsSync(file)) { console.log('ONTBREEKT', id, file); process.exitCode = 1; continue; }
  const ruw = normaliseer(laad(file), e.bron.voor || '+z');
  if (e.bron.schaal) for (let k = 0; k < ruw.pos.length; k++) ruw.pos[k] *= e.bron.schaal;
  const lod0 = las(ruw, 0);
  const p = lod0.pos;
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < p.length; k += 3) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], p[k + c]); mx[c] = Math.max(mx[c], p[k + c]); }
  const maat = mx.map((v, c) => v - mn[c]);
  const box = [...mn, ...maat].map((v) => +v.toFixed(5));
  // de lichtere niveaus maakt het centrale LOD-systeem (lodkit3d.js makeLodObject, soort 'interior'): hier alleen het model zelf
  const a = pak(lod0, box);
  totaal += a.b64.length;
  data[id] = { palet: lod0.palet.map((c) => c.hex), soort: lod0.palet.map((c) => c.soort), namen: lod0.palet.map((c) => c.naam), schaal: e.bron.schaal, box, lod: [a] };
  if (MEET) console.log(id.padEnd(12), `${a.t} tris ${a.v} hp`, 'maat', maat.map((v) => v.toFixed(2)).join(' x '), 'palet', lod0.palet.map((c) => c.naam + (c.soort ? '*' + c.soort : '')).join(','));
}

const kop = `// GEGENEREERD door scripts/akte1/meubels_converteer.mjs uit de CC0-packs van Quaternius (zie docs/MEUBEL-LICENTIES.md). Niet met de hand
// bewerken: pas het register aan (game/js/propregister.js INTERIEUR_REGISTER) en draai het script opnieuw.
// Per meubel: palet (sRGB), soort per paletkleur (0 vast, 1 gloeit, 2 glas), namen (de materialen van de glb), schaal (de importschaal
// uit het register), box [minx, miny, minz, bx, by, bz] in m, lod [0, 1]:
// { v: hoekpunten, t: driehoeken, b64: uint16-posities (3v), uint8-paletindex (v, aangevuld tot even), uint16-indices (3t) }.
`;
const body = 'export const INTERIOR_PROP_DATA = {\n' + Object.entries(data).map(([id, d]) => `  ${id}: ${JSON.stringify(d)},`).join('\n') + '\n};\n';
fs.writeFileSync(UIT, kop + body);
console.log(`geschreven: ${path.relative(ROOT, UIT)} (${Object.keys(data).length} meubels, ${(fs.statSync(UIT).size / 1024).toFixed(0)} kB)`);
