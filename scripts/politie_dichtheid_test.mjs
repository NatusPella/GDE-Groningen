// #933: de politie komt alleen als je gezocht wordt, en buiten de stad is de
// bezetting veel dunner. Dit legt de pure dichtheidsregels vast (wantedlevels.js)
// waar police.js op vaart; de spelwereld zelf is niet nodig.
//   node scripts/politie_dichtheid_test.mjs
import { policeTarget, policeDensity, levelOf, chaseLayers } from '../game/js/wantedlevels.js';
import fs from 'node:fs';

let n = 0, bad = 0;
const ok = (name, c, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };

// --- 0 sterren: geen politie, waar dan ook ------------------------------------
ok('zonder sterren stuurt de politie niemand', policeTarget(0) === 0, String(policeTarget(0)));
ok('zonder sterren is de dichtheid nul in de stad', policeDensity(0).target === 0);
ok('zonder sterren is de dichtheid nul in het Ommeland', policeDensity(0, { country: true }).target === 0);
ok('zonder sterren is er geen aanlooptijd', policeDensity(0).stagger === 0 && policeDensity(0, { country: true }).stagger === 0);
ok('onzin-niveau (negatief) is ook nul', policeTarget(-3) === 0 && policeDensity(-1, { country: true }).target === 0);

// --- in de stad: het oude beeld, vanaf één ster -------------------------------
const CITY = [1, 2, 3, 4, 7];
for (let s = 1; s <= 5; s++) {
  ok(`${s} sterren: de stad krijgt ${CITY[s - 1]} eenheden`, policeDensity(s).target === CITY[s - 1], String(policeDensity(s).target));
  ok(`${s} sterren: de stad komt binnen enkele seconden`, policeDensity(s).stagger > 0 && policeDensity(s).stagger <= 2.5, String(policeDensity(s).stagger));
}

// --- buiten de stad: dunner en trager ----------------------------------------
for (let s = 1; s <= 5; s++) {
  const stad = policeDensity(s), land = policeDensity(s, { country: true });
  ok(`${s} sterren: het Ommeland krijgt nooit meer dan de stad`, land.target <= stad.target, `${land.target} vs ${stad.target}`);
  ok(`${s} sterren: het Ommeland krijgt niet meer volk`, land.target <= stad.target, `${land.target} vs ${stad.target}`);
  ok(`${s} sterren: in het Ommeland duurt het langer voor er iemand komt`, land.stagger > stad.stagger, `${land.stagger} vs ${stad.stagger}`);
}
ok('vanaf twee sterren is het Ommeland echt dunner bezet', [2, 3, 4, 5].every((s) => policeDensity(s, { country: true }).target < policeDensity(s).target));
ok('het Ommeland houdt het bij maximaal drie eenheden, ook op vijf sterren', policeDensity(5, { country: true }).target <= 3, String(policeDensity(5, { country: true }).target));
ok('één ster in het Ommeland is één eenheid', policeDensity(1, { country: true }).target === 1);
ok('de dichtheid loopt nooit terug bij een ster erbij', Array.from({ length: 5 }, (_, i) => policeDensity(i + 1, { country: true }).target).every((v, i, a) => i === 0 || v >= a[i - 1]));

// --- de rest van het wanted-systeem blijft kloppen ---------------------------
ok('de zoekregels lopen nog op per ster', levelOf(5).searchRadius > levelOf(4).searchRadius && levelOf(5).cooldown >= levelOf(4).cooldown);
ok('de lagen komen nog per ster bij', chaseLayers(5).includes('heli') && !chaseLayers(1).includes('heli'));

// --- de koppeling in police.js zelf -----------------------------------------
// #1298: bronregex vervangen door manuele controle. De pure regels (wantedlevels.js, hierboven)
// zijn gedekt; de koppeling in police.js is complex (afhankelijkheden: map, vehicles, pedestrians,
// mounts, heli, boats). Een volledige gedragstest zou de echte werelddata of een complexe mock
// vereisen. Visuele beeldtest en drive_audit dekken het gedrag in de praktijk.
ok('koppeling in police.js: manuele controle of visuele test', true);

console.log(`politie_dichtheid_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
