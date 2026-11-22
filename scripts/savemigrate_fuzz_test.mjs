// Fuzz: een save met velden van het verkeerde type (een bewerkt of half geschreven bestand) laat de migratie niet gooien en
// blijft een bruikbare save, of wordt netjes geweigerd. Gooit migrateSave toch, dan kreeg de speler "kapot" voor een
// save die nog te redden was. node scripts/savemigrate_fuzz_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateSave, migrateSettings } from '../game/js/savemigrate.js';
import { summarize } from '../game/js/saveslots.js';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'saves');
const fixtures = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))]);
let seed = 99;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const rommel = [null, true, 0, -1, 1e9, 'tekst', '', [], {}, [null], { a: null }, NaN];
const wijzig = (o, diepte = 0) => {
  if (!o || typeof o !== 'object') return;
  for (const k of Object.keys(o)) {
    if (k === 'v' && diepte === 0) continue; // de versie zelf is het onderwerp van andere tests
    if (rnd() < 0.12) o[k] = rommel[Math.floor(rnd() * rommel.length)];
    else wijzig(o[k], diepte + 1);
  }
};
let n = 0, fails = 0;
const gooide = {};
const ok = (c, m, i = '') => { n++; if (!c) { fails++; gooide[i] = (gooide[i] || 0) + 1; if (fails < 8) console.log('FAIL', m, i); } };
for (const [naam, d] of fixtures) {
  for (let i = 0; i < 60; i++) {
    const kopie = JSON.parse(JSON.stringify(d));
    wijzig(kopie);
    let m;
    try { m = migrateSave(kopie); ok(true, 'migreert'); } catch (e) { ok(false, 'migrateSave gooide op ' + naam, e.message.slice(0, 90)); continue; }
    if (m) { try { summarize(m.data); ok(true, 'samenvatting'); } catch (e) { ok(false, 'summarize gooide op ' + naam, e.message.slice(0, 90)); } }
  }
}
for (let i = 0; i < 200; i++) {
  const s = { v: 1 + Math.floor(rnd() * 10) };
  for (const k of ['masterVolume', 'quality', 'keyBinds', 'padBinds', 'difficulty', 'onlineMeedoen', 'drawDistance']) if (rnd() < 0.7) s[k] = rommel[Math.floor(rnd() * rommel.length)];
  try { migrateSettings(s); ok(true, 'instellingen'); } catch (e) { ok(false, 'migrateSettings gooide', e.message.slice(0, 90)); }
}
console.log(`savemigrate_fuzz_test: ${n - fails}/${n}`, fails ? JSON.stringify(gooide) : '');
process.exit(fails ? 1 : 0);
