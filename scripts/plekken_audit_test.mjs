// Audit van de plekken in de data (#242, #67): de stadscafés (citymap.json meta.horeca) en de vaste plekken van de
// provincie (streekplekken.json) liggen niet in een waterpolygoon van de stadskaart, en horeca.js zet een café dat bij
// het uit het gebouw halen in het water belandt (De Lallende Koe) naar de dichtstbijzijnde open plek. De volledige
// plaatscontrole (gebouw, ingesloten, bereikbaar) loopt in de verhaaltest via spotcheck.js. De drempel mag alleen dalen.
//   node scripts/plekken_audit_test.mjs [--list]
import fs from 'node:fs';

const here = (f) => new URL(f, import.meta.url);
const map = JSON.parse(fs.readFileSync(here('../game/citymap.json')));
const inPoly = (x, y, p) => { let r = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) r = !r; } return r; };
const bb = (p) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of p) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; };
const water = map.water.map((w) => ({ pts: w.pts, box: bb(w.pts) }));
const inWater = (x, y) => water.some((w) => x >= w.box[0] && x <= w.box[2] && y >= w.box[1] && y <= w.box[3] && inPoly(x, y, w.pts));

const horeca = map.meta.horeca || [];
// een drijvend café (schip, boot) hoort op het water; initHoreca zet de speler-plek aan de wal
const badHoreca = horeca.filter((h) => inWater(h.x, h.y) && !/schip|boot|ship/i.test(h.name || ''));
const sp = JSON.parse(fs.readFileSync(here('../game/streekplekken.json')));
const rows = (sp.plekken || []).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
// alleen puntplekken: het midden van een park of plein mag in water liggen
const badStreek = rows.filter((p) => p.t !== 'park' && (p.l || 0) < 60 && inWater(p.x, p.y));

const MAX_HORECA_IN_WATER = 0, MAX_STREEK_IN_WATER = 0; // drempels: alleen omlaag
if (process.argv.includes('--list')) console.log(JSON.stringify({ badHoreca, badStreek: badStreek.map((p) => [p.x, p.y, p.naam || p.id]) }, null, 1));
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };
ok(horeca.length > 100, 'cafés in de data: ' + horeca.length);
ok(badHoreca.length <= MAX_HORECA_IN_WATER, `${badHoreca.length} cafés in water (max ${MAX_HORECA_IN_WATER}): ${badHoreca.slice(0, 5).map((h) => h.name).join(', ')}`);
ok(rows.length > 100, 'streekplekken: ' + rows.length);
ok(badStreek.length <= MAX_STREEK_IN_WATER, `${badStreek.length} streekplekken in water (max ${MAX_STREEK_IN_WATER})`);
const src = fs.readFileSync(here('../game/js/horeca.js'), 'utf8');
ok(/isInWater\(map, h\.x, h\.y\) \|\| !map\.canWalkOut/.test(src), 'initHoreca zet een café uit het water naar open grond');
console.log(`plekken_audit_test: ${n - fails}/${n} ok (cafés in water ${badHoreca.length}, streekplekken in water ${badStreek.length})`);
process.exit(fails ? 1 : 0);
