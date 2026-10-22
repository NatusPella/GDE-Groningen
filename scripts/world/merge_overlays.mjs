// De overlaytegels van de stad in hun stadstegel (#314, C2). build_province.mjs maakt voor elke stadstegel die de stadsdata half
// leeg laat een overlaytegel ('o' + sleutel) met de rest van de OSM-rijen; die stond als eigen tegel in de provinciepakketten en
// de loader pinde ze erbij. Hier gaan hun rijen achter de rijen van de stadstegel zelf, in dezelfde sectie (de ids van een
// overlayrij beginnen bij GID0 = 20.000.000, die van de stad liggen eronder: loadTileWorld scheidt ze daarop weer, tileworld.js
// splitOverlay). De rijen zelf veranderen niet.
// In index-provincie.json blijft de overlay als LEGE tegel staan ({ ov: 1, in: <stadstegel> }, zonder rijen): de vlaggen ervan
// (PROVINCE | BUILT | OVERLAY | OLD) lezen provinceworld.js (tileCoverOf, de blokken) en de tools nog, een vlag van de stadstegel
// zelf verandert niet (main.js leest BUILT voor de proefstrook), en een lege tegel laat elk script dat alle tegels van de index
// leest ongemoeid: de rijen staan nu in de stadstegel. De loader pint of vraagt ze niet meer.
//   node scripts/world/merge_overlays.mjs [--world game/world]
// Zonder overlays in de index doet het niets (nogmaals draaien is veilig). Wat het schrijft: de stadspakketten van de samengevoegde
// tegels en de provinciepakketten met lege overlays (nieuwe bestandsnamen met hash), en beide indexen.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as G from '../../game/js/gdt.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const deflate = (b) => new Uint8Array(zlib.deflateRawSync(b, { level: 9 }));
const inflate = (b) => new Uint8Array(zlib.inflateRawSync(b));
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

// de tegel als secties die encodeBlob weer maakt: rijen, json, raster of bytes
const asSections = (blob) => blob.sections.map((s) => {
  const o = { type: s.type, version: s.version };
  if (s.rows) o.rows = s.rows;
  else if (s.json !== undefined) o.json = s.json;
  else if (s.raster) o.raster = s.raster;
  else if (s.bytes) { o.bytes = s.bytes; o.name = s.name; }
  return o;
});

// de stadstegel met de rijen van zijn overlay erachter (per soort sectie één sectie; een soort die alleen de overlay heeft komt erbij)
export function mergeBlobs(city, overlay) {
  const sections = asSections(city);
  for (const o of asSections(overlay)) {
    if (!o.rows) throw new Error(`overlaysectie ${o.type} is geen tabel`);
    const s = sections.find((q) => q.type === o.type);
    if (!s) sections.push(o);
    else if (!s.rows) throw new Error(`stadssectie ${o.type} is geen tabel`);
    else s.rows = s.rows.concat(o.rows);
  }
  return G.encodeBlob({ i: city.i, j: city.j, flags: city.flags, builder: city.builder, sections });
}

// Een laag (index + pakketten in dir) opnieuw schrijven: `replace` (sleutel -> nieuwe ruwe bytes) wijzigt tegels, de rest wordt als
// gecomprimeerde plak overgenomen. Alleen pakketten met een wijziging worden herschreven (nieuwe bestandsnaam).
function repack(dir, index, replace) {
  const touched = new Set([...replace.keys()].map((k) => index.tiles[k].pack));
  for (const pk of touched) {
    const old = index.packs[pk];
    const bytes = fs.readFileSync(path.join(dir, old.file));
    const entries = Object.entries(index.tiles).filter(([, t]) => t.pack === pk).sort((a, b) => a[1].off - b[1].off);
    const parts = [];
    let off = 0;
    for (const [key, t] of entries) {
      let z, raw = t.raw, hash = t.hash;
      if (replace.has(key)) { const b = replace.get(key); z = deflate(b); raw = b.length; hash = G.hash64(b); } else z = bytes.subarray(t.off, t.off + t.len);
      parts.push([key, z, raw, hash, off]);
      off += z.length;
    }
    const all = new Uint8Array(off);
    for (const [, z, , , o] of parts) all.set(z, o);
    const file = `${pk}-${G.hash64(all).slice(0, 12)}.gdp`;
    fs.writeFileSync(path.join(dir, file), all);
    if (file !== old.file) fs.rmSync(path.join(dir, old.file));
    index.packs[pk] = { file, size: all.length };
    for (const [key, z, raw, hash, o] of parts) Object.assign(index.tiles[key], { off: o, len: z.length, raw, hash });
  }
}

export function mergeOverlays(dir, { log = () => {} } = {}) {
  const cityFile = path.join(dir, 'index.json'), provFile = path.join(dir, 'index-provincie.json');
  if (!fs.existsSync(cityFile) || !fs.existsSync(provFile)) return { merged: 0 };
  const city = readJson(cityFile), prov = readJson(provFile);
  const ovKeys = Object.keys(prov.tiles).filter((k) => prov.tiles[k].ov && !prov.tiles[k].in);
  if (!ovKeys.length) return { merged: 0 };
  const slice = (idx, t) => {
    const fd = fs.openSync(path.join(dir, idx.packs[t.pack].file), 'r');
    try { const b = new Uint8Array(t.len); fs.readSync(fd, b, 0, t.len, t.off); return inflate(b); } finally { fs.closeSync(fd); }
  };
  const mergedCity = new Map(), emptied = new Map();
  for (const ok of ovKeys) {
    const k = ok.slice(1);
    const ce = city.tiles[k];
    if (!ce) throw new Error(`overlay ${ok} heeft geen stadstegel ${k}`);
    const pe = prov.tiles[ok];
    const ovBlob = G.decodeBlob(slice(prov, pe));
    const merged = mergeBlobs(G.decodeBlob(slice(city, ce)), ovBlob);
    mergedCity.set(k, { bytes: merged, n: { ...ce.n }, maxH: Math.max(ce.maxH || 0, pe.maxH || 0), ovN: pe.n });
    for (const [kind, v] of Object.entries(pe.n || {})) mergedCity.get(k).n[kind] = (mergedCity.get(k).n[kind] || 0) + v;
    emptied.set(ok, G.encodeBlob({ i: ovBlob.i, j: ovBlob.j, flags: ovBlob.flags, builder: ovBlob.builder, sections: [] }));
    log(`  ${k}: stad ${ce.raw} + overlay ${pe.raw} -> ${merged.length} B`);
  }
  const was = Object.values(prov.packs).reduce((a, p) => a + p.size, 0);
  repack(dir, city, new Map([...mergedCity].map(([k, v]) => [k, v.bytes])));
  for (const [k, v] of mergedCity) Object.assign(city.tiles[k], { n: v.n, maxH: v.maxH });
  fs.writeFileSync(cityFile, JSON.stringify(city));
  repack(dir, prov, emptied);
  for (const ok of ovKeys) Object.assign(prov.tiles[ok], { in: ok.slice(1), ov: 1 });
  fs.writeFileSync(provFile, JSON.stringify(prov));
  return { merged: ovKeys.length, provinceBytes: was - Object.values(prov.packs).reduce((a, p) => a + p.size, 0) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dir = path.resolve(ROOT, args.includes('--world') ? args[args.indexOf('--world') + 1] : 'game/world');
  const r = mergeOverlays(dir, { log: args.includes('--verbose') ? console.log : () => {} });
  console.log(`overlays in de stadstegels: ${r.merged} samengevoegd${r.provinceBytes ? `, ${(r.provinceBytes / 1e6).toFixed(2)} MB uit de provinciepakketten` : ''}`);
}
