// De wereld in game/world is een build-artefact en staat niet in git, dus niemand merkt het als hij
// achterloopt. Dat gebeurde op 25-10: de wereld stamde van 18 oktober, van vóór merge_overlays (#314,
// C2), en drie wereldcontroles faalden daardoor (#491) — het leek data, het was een oude build.
//
// Deze test kijkt naar één harde eigenschap van een verse build: elke overlaytegel in
// index-provincie.json is leeg en wijst naar zijn stadstegel ({ ov: 1, in: ... }). Draagt een overlay
// nog zijn eigen rijen, dan is de wereld van vóór de samenvoeging en moet hij opnieuw gestaged worden.
//
//   node scripts/world_versie_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(ROOT, 'game', 'world', 'index-provincie.json');
const stadium = path.join(ROOT, 'game', 'world', 'index.json');

if (!fs.existsSync(file)) {
  console.log('SKIP world_versie_test: geen game/world (cd desktop && npm run stage)');
  process.exit(0);
}

let idx;
try {
  idx = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.log('FAIL world_versie_test: index-provincie.json is geen geldige JSON (' + e.message + ')');
  process.exit(1);
}
const tiles = idx.tiles || idx;
const keys = Object.keys(tiles);
const overlays = keys.filter((k) => k.startsWith('o'));
const ongemerged = overlays.filter((k) => !(tiles[k] && tiles[k].ov === 1 && tiles[k].in));

const oud = fs.statSync(file).mtime;
const dagen = (Date.now() - oud.getTime()) / 86400000;

let fails = 0;
if (!keys.length) { console.log('FAIL world_versie_test: de index heeft geen tegels'); fails++; }
if (ongemerged.length) {
  console.log(`FAIL world_versie_test: ${ongemerged.length} van ${overlays.length} overlaytegels is niet samengevoegd ` +
    `(${ongemerged.slice(0, 5).join(', ')}). Deze wereld is van vóór merge_overlays; draai "cd desktop && npm run stage".`);
  fails++;
}
if (dagen > 30) {
  console.log(`LET OP world_versie_test: game/world is ${Math.round(dagen)} dagen oud (${oud.toISOString().slice(0, 10)}); ` +
    'een wereldcontrole op oude data zegt weinig.');
}

// Een rebuild van de provincielaag bovenop een bestaande wereld zette de rijen van de overlay een tweede keer
// in de stadstegel: twee verschillende rijen met dezelfde id in de band van de overlay (vanaf 20.000.000).
// De loader houdt dan de oude rij en het water en de gebouwen van de nieuwe verdwijnen uit de rasters (#512).
// Alleen die band telt: de vulbomen van de stad liggen op ~32 miljard en staan soms met identieke rijen in
// de tegel (de loader houdt er één over), dat is geen fout.
let dubbel = 0, dubbelTegels = 0, rijen = 0;
if (fs.existsSync(stadium)) {
  const G = await import('../game/js/gdt.js');
  const zlib = await import('node:zlib');
  const OVERLAY_GID0 = 20_000_000, OVERLAY_GID_SPAN = 10_000_000;
  const stad = JSON.parse(fs.readFileSync(stadium, 'utf8'));
  const blobs = new Map();
  for (const [k, t] of Object.entries(stad.tiles || {})) {
    const pack = stad.packs[t.pack];
    if (!pack) continue;
    if (!blobs.has(pack.file)) blobs.set(pack.file, fs.openSync(path.join(ROOT, 'game', 'world', pack.file), 'r'));
    const buf = Buffer.alloc(t.len);
    fs.readSync(blobs.get(pack.file), buf, 0, t.len, t.off);
    const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
    let raak = 0;
    for (const s of blob.sections) {
      if (!s.rows || s.type === G.SECTION.NAV) continue;
      const seen = new Set();
      for (const r of s.rows) {
        const g = typeof r === 'object' && r ? (s.type === G.SECTION.TREES ? r.g : r.gid) : undefined;
        if (typeof g !== 'number' || g < OVERLAY_GID0 || g >= OVERLAY_GID0 + OVERLAY_GID_SPAN) continue;
        rijen++;
        if (seen.has(g)) { dubbel++; raak++; } else seen.add(g);
      }
    }
    if (raak) dubbelTegels++;
  }
  for (const fd of blobs.values()) fs.closeSync(fd);
  if (dubbel) {
    console.log(`FAIL world_versie_test: ${dubbel} van ${rijen} overlayrijen in de stadstegels heeft een dubbele id ` +
      `(${dubbelTegels} tegels). Deze wereld is opnieuw gebouwd bovenop een oude: de overlay staat er twee keer in ` +
      'en de loader houdt de oude rij (#512). Bouw de wereld opnieuw met "cd desktop && npm run stage".');
    fails++;
  }
}

if (!fails) {
  console.log(`world_versie_test ok: ${keys.length} tegels, ${overlays.length} overlaytegels allemaal samengevoegd` +
    (fs.existsSync(stadium) ? `, stad-index aanwezig (${rijen} overlayrijen zonder dubbele id)` : ', geen stad-index (kan kloppen)'));
}
process.exit(fails ? 1 : 0);
