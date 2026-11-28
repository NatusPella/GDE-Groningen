// De vaste plekken van de heli-missies op de ECHTE kaart (#1033): de start in Lauwersoog, het UMCG-dek, Eelde, de ballon bij het UMCG
// en de ballon boven de Dollard liggen niet in een gebouw, en de landplekken zijn droog (de heli staat er niet in het water).
// De ballon van M12 mag boven water staan (hij is in de lucht); de standplek op de grond mag dat niet.
// Zonder game/world met de provincie: SKIP. Reproduceert: de Lauwersoog-plek was nooit op de echte kaart gecontroleerd.
import fs from 'node:fs';
import './node3d.mjs';
import assert from 'node:assert/strict';

let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };
const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) {
  console.log('heli_spots_world_test: SKIP (geen game/world met de provincie)');
  process.exit(0);
}
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const G = await import('../game/js/gdt.js');
const HP = await import('../game/js/heliplan.js');
const HF = await import('../game/js/heliflight.js');
const VB = await import('../game/js/vehicle_balloon.js');
const { isInWater, pointInPolygon } = await import('../game/js/util.js');
const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });
async function load(p, w = 150) {
  const keys = new Set();
  for (const dx of [-w, 0, w]) for (const dy of [-w, 0, w]) { const k = G.tileKey(...G.tileIndexOf(p.x + dx, p.y + dy)); if (T.index.tiles[k]) keys.add(k); }
  await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 })));
  map.tileQueue.run(1e9);
  return keys.size;
}
const inBuilding = (p) => map.buildingsNear(p.x, p.y, 0.5).some((b) => pointInPolygon(p.x, p.y, b.pts));
// De vrije straal rond een plek: hoe ver je kunt gaan voor je water of een gebouw raakt (48 richtingen, stap 1 m, tot 40 m).
function vrijeStraal(p) {
  for (let r = 1; r <= 40; r++) for (let a = 0; a < 48; a++) {
    const x = p.x + Math.cos((a * Math.PI) / 24) * r, y = p.y + Math.sin((a * Math.PI) / 24) * r;
    if (isInWater(map, x, y) || map.buildingsNear(x, y, 0.5).some((b) => pointInPolygon(x, y, b.pts))) return r;
  }
  return 41;
}
const report = [];
async function spot(name, p, { land = true } = {}) {
  const tiles = await load(p);
  const wet = isInWater(map, p.x, p.y), bld = inBuilding(p);
  const open = map.openSpotNear(p.x, p.y);
  const moved = Math.hypot(open.x - p.x, open.y - p.y);
  report.push(`${name}: tegels ${tiles}, water ${wet}, gebouw ${bld}, open plek ${moved.toFixed(1)} m verderop`);
  ok(!bld, `${name}: niet in een gebouw`);
  if (land) { ok(tiles > 0, `${name}: de tegel bij de plek bestaat`); ok(!wet, `${name}: droog`); ok(moved < 60, `${name}: open grond binnen 60 m (${moved.toFixed(0)} m)`); }
  return open;
}
await spot('Lauwersoog (start rooster)', HP.ROOSTER.lauwersoog);
await spot('Eemshaven (einde rooster)', HP.ROOSTER.eemshaven);
await spot('ballon bij het UMCG', HP.BALLOON_AT);
await spot('Dollard (ballon rooster, in de lucht)', HP.ROOSTER.dollard, { land: false });
const eelde = HF.helipadById && HF.helipadById('eelde');
if (eelde) await spot('Eelde-pad', eelde);
// #1377 L2: de landing bij Lauwersoog en de Eemshaven-kade moet ruimte voor de rotor hebben (een heli met 5 m rotorstraal plus marge: 10 m), de
// ballonlanceerplekken ruimte voor een mand en een gevulde ballon (25 m). De Dollard van het rooster is een luchtpunt en geen grond; de ballonplek staat op de dijk.
for (const [naam, p, min] of [['Lauwersoog', HP.ROOSTER.lauwersoog, 10], ['Eemshaven-kade', HP.ROOSTER.eemshaven, 10], ['lanceerplek Eelde', VB.EELDE_SITE, 25], ['lanceerplek Dollarddijk', VB.DOLLARD_SITE, 25]]) {
  await spot(naam + ' (vrije straal)', p);
  const r = vrijeStraal(p);
  report.push(naam + ': vrije straal ' + (r > 40 ? 'meer dan 40' : r) + ' m');
  ok(r >= min, naam + ': minstens ' + min + ' m vrij van water en gebouwen (' + r + ' m)');
}
for (const r of report) console.log('  ' + r);
console.log(`heli_spots_world_test: ${n} controles gehaald`);
