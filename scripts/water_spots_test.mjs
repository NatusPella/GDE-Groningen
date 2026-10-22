// Plekken in het water (de verhaaltest: "all spots reachable", Kroeg 't Scheve Toorntje): de stadscafés en garages staan na het
// laden van de watergaten en -koppelingen van vaarnet_fixes.json (vaarload.js, na de start) niet in het water. Dezelfde volgorde als
// het spel: plaatsen, dan de patches erbij (map.addWaterPatches), dan refitHoreca. Op de stadstegels van een gebouwde wereld
// (game/world of GAME_WORLD); zonder die: SKIP.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { heeftWereld, laadStadTegels } from './lib/stadtegels.mjs';

if (!heeftWereld()) { console.log('SKIP water_spots_test.mjs: geen game/world (cd desktop && npm run stage)'); process.exit(0); }
const { isInWater } = await import('../game/js/util.js');
const V = await import('../game/js/vaarnet.js');
const H = await import('../game/js/horeca.js');
const G = await import('../game/js/garages.js');
const map = (await laadStadTegels()).world;
const fixes = JSON.parse(fs.readFileSync(new URL('../game/vaarnet_fixes.json', import.meta.url), 'utf8'));

H.initHoreca({ map });
G.initGarages({ map });
const nat = (list) => list.filter((s) => isInWater(map, s.x, s.y));
assert.equal(nat(H.getHorecaForRender()).length, 0, 'na het plaatsen staat een café in het water');
map.addWaterPatches(V.patchRows(fixes).filter((r) => !r.strip));
const voor = nat(H.getHorecaForRender()).length;
const verplaatst = H.refitHoreca(map);
assert.equal(verplaatst, voor, `${voor} cafés in het water, ${verplaatst} verplaatst`);
const horeca = H.getHorecaForRender();
assert.equal(nat(horeca).length, 0, 'na refitHoreca staat een café in het water: ' + nat(horeca).map((s) => s.osmName).join(', '));
for (const s of horeca) assert.ok(map.canWalkOut(s.x, s.y, 45), `een café is ingesloten: ${s.osmName} (${s.x.toFixed(1)}, ${s.y.toFixed(1)})`);
assert.equal(nat(G.getGaragesForRender()).length, 0, 'een garage staat in het water');
console.log(`water_spots_test: ok (${horeca.length} cafés, ${G.getGaragesForRender().length} garages en pompen; ${verplaatst} café na de watergaten verplaatst)`);
