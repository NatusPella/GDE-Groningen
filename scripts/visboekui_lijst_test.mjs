// Visboek (#1270, hertest 24-11): de waterlijst is één kolom met volle namen. De Loopbanen-CSS zet .lb-list op een raster van
// kolommen; zonder eigen regel gaf dat in het echte spel drie smalle kolommen met "All..." en "Pl...".   node scripts/visboekui_lijst_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../game/js/visboekui.js', import.meta.url), 'utf8');
const lb = fs.readFileSync(new URL('../game/js/loopbaanui.js', import.meta.url), 'utf8');
const spec = (sel) => { const ids = (sel.match(/#/g) || []).length; const cls = (sel.match(/\./g) || []).length; return ids * 100 + cls; };
assert.match(src, /class="m-list pa-list lb-list vb-list"/, 'de lijst draagt vb-list');
const eigen = src.match(/(#pause-menu \.m-list\.lb-list\.vb-list) \{([^}]*)\}/);
assert.ok(eigen && /display:\s*flex/.test(eigen[2]) && /flex-direction:\s*column/.test(eigen[2]), 'vb-list is één kolom');
const raster = lb.match(/(#pause-menu \.m-list\.lb-list) \{[^}]*display:\s*grid/);
assert.ok(raster, 'loopbaanui.js heeft nog het raster (anders is deze test overbodig)');
assert.ok(spec(eigen[1]) > spec(raster[1]), 'de Visboek-regel wint van het Loopbanen-raster');
assert.match(src, /#pause-menu \.vb-list \.vb-li \.nm \.one \{ white-space: normal; overflow: visible; text-overflow: clip; \}/, 'namen niet afgekapt');
console.log('visboekui_lijst_test: 1/1 geslaagd');
