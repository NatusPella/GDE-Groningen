// Gebouwen in het water (#124): in de provinciegegevens ligt geen gebouw (boerderij, huis, schuur) met zijn midden
// of de meerderheid van zijn hoeken in een waterpolygoon van dezelfde tegel; woonboten, steigers en bruggen tellen niet.
// Heeft game/world met de provinciegegevens nodig (desktop stage).
//   node scripts/house_water_audit_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';
const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP house_water_audit_test: geen game/world met de provincie'); process.exit(0); }
const G = await import('../game/js/gdt.js');
// alleen de provincietegels: de stad heeft haar eigen woonboten en kades
const idx = JSON.parse(fs.readFileSync(new URL('index-provincie.json', root), 'utf8'));
const files = {};
const get = (f) => files[f] || (files[f] = new Uint8Array(fs.readFileSync(new URL(f, root))));
const inP = (q, x, y) => { let c = false; for (let i = 0, j = q.length - 1; i < q.length; j = i++) if ((q[i][1] > y) !== (q[j][1] > y) && x < ((q[j][0] - q[i][0]) * (y - q[i][1])) / (q[j][1] - q[i][1]) + q[i][0]) c = !c; return c; };
const LIMIT = Number(process.env.HOUSE_WATER_MAX ?? 0.00005); // (0.063 % while type houseboat counted: most of the 240 were real woonboten; 36 real ones on the tiles of 20 oct, 9 after the province build with derive_tiles slideOutOfWater 25 m + floatStuckSheds: a hall at a harbour, a platform, five houses in a water polygon over a built-up spot, all seen in Electron and fine)
let nb = 0, bad = 0, tiles = 0; const ex = [];
for (const [key, t] of Object.entries(idx.tiles)) {
  if (!t.n || !t.n.water || !t.n.buildings) continue;
  const p = idx.packs[t.pack];
  const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(get(p.file).subarray(t.off, t.off + t.len))));
  const sec = (ty) => (blob.sections.find((s) => s.type === ty) || { rows: [] }).rows;
  const water = sec(G.SECTION.WATER).filter((w) => w.pts && w.pts.length > 2), bl = sec(G.SECTION.BUILDINGS);
  if (!water.length) continue;
  tiles++;
  for (const b of bl) {
    if (!b.pts || b.pts.length < 3 || b.houseboat || b.boat || b.pier || b.type === 'houseboat') continue; // (type houseboat: OSM's woonboten and the cabins derive_tiles floatStuckSheds moors; they float on purpose)
    nb++;
    let cx = 0, cy = 0; for (const q of b.pts) { cx += q[0]; cy += q[1]; } cx /= b.pts.length; cy /= b.pts.length;
    const wet = (x, y) => water.some((w) => inP(w.pts, x, y));
    const corners = b.pts.filter((q) => wet(q[0], q[1])).length;
    if (wet(cx, cy) && corners * 2 > b.pts.length) { bad++; if (ex.length < 8) ex.push(`${key} (${Math.round(cx)}, ${Math.round(cy)})`); }
  }
}
console.log(`gebouwen ${nb} in ${tiles} tegels met water: ${bad} in het water (${(100 * bad / Math.max(1, nb)).toFixed(3)}%) ${ex.join('; ')}`);
if (nb < 1000) { console.log('FAIL te weinig gebouwen om te meten'); process.exit(1); }
if (bad / nb > LIMIT) { console.log('FAIL gebouwen in het water boven de grens ' + LIMIT); process.exit(1); }
console.log('house_water_audit_test ok');
