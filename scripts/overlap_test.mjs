// Geen dubbele stad en land (#90): wat de provinciebouw rond de stad levert ligt niet ook in de stadskaart (stad.json en de OSM-lagen).
// Gebouwen en wegen: geen enkele dubbel; water: grote kanalen die op de rand door beide worden getekend zijn toegestaan.
// Slaat over zonder game/world.
import fs from 'node:fs';
import assert from 'node:assert/strict';
if (!fs.existsSync(new URL('../game/world/index-provincie.json', import.meta.url))) { console.log('SKIP overlap_test: geen game/world met de provincielaag'); process.exit(0); }
const { findOverlaps } = await import('./world/overlap_check.mjs');
const near = { x: -522, y: 2489, r: 2500 }; // Corpus den Hoorn en wat eromheen ligt
const r = await findOverlaps({ world: new URL('../game/world', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), near });
assert.ok(r.buildings.n > 1000, `gebouwen gelezen: ${r.buildings.n}`);
assert.equal(r.buildings.dup, 0, 'dubbele gebouwen ' + JSON.stringify(r.buildings.ex));
assert.equal(r.roads.dup, 0, 'dubbele wegen ' + JSON.stringify(r.roads.ex));
assert.ok(r.water.dup <= 3, 'dubbel water ' + JSON.stringify(r.water.ex));
console.log(`overlap_test: ok (${r.buildings.n} gebouwen, ${r.roads.n} wegen, ${r.water.n} water; water dubbel ${r.water.dup})`);
