// Fuzz: een save met velden van het verkeerde type (een bewerkt of half geschreven bestand) laat de migratie niet gooien en
// blijft een bruikbare save, of wordt netjes geweigerd. Gooit migrateSave toch, dan kreeg de speler "kapot" voor een
// save die nog te redden was. #1298: de oude test bewees alleen dat migrateSave niet gooit, niet dat de save echt bruikbaar
// is. Nu draait applySave op de gefuzzte save en controleert dat geld, gezondheid en positie eindig blijven.
//   node scripts/savemigrate_fuzz_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';
import { skipIfThreeMissing } from './lib/threeskip.mjs';

// home.js bouwt zijn indeling pas in het echte spel; applySave leest alleen home.center
registerHooks({
  load(url, ctx, next) {
    const r = next(url, ctx);
    if (/\/game\/js\/home\.js$/.test(url)) return { ...r, source: String(r.source) + '\nexport function __zetHome(h) { home = h; }\n', shortCircuit: true };
    return r;
  },
});

let SM, SS, SG, WORLD, HOME, SJ;
try {
  SM = await import('../game/js/savemigrate.js');
  SS = await import('../game/js/saveslots.js');
  SG = await import('../game/js/savegame.js');
  WORLD = await import('../game/js/world.js');
  HOME = await import('../game/js/home.js');
  SJ = await import('../game/js/sidejobs.js');
} catch (e) {
  skipIfThreeMissing('savemigrate_fuzz_test.mjs', e);
}

// sidejobs init (zoals compat_saves_test)
const zonderMelding = (f) => { const ce = console.error; const out = []; console.error = (...a) => out.push(a.map((x) => (x && x.message) || x).join(' ')); try { return [f(), out]; } finally { console.error = ce; } };
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
// Mock world voor applySave (alleen wat savegame.js nodig heeft)
const makeWorld = () => ({
  stats: { ...WORLD.STAT_DEFAULTS },
  player: { x: 0, y: 0, angle: 0, character: 'tammo', inVehicle: null },
  companion: null,
  vehicles: [],
  messages: [],
  addMessage() {},
  map: { nearestRoadPoint: () => null, findOpenSpawn: (x, y) => ({ x, y }), escapeBuilding: (x, y) => [x, y], meta: {} },
  money: 1000,
  ammo: {},
  weapon: 'fists',
  health: 100,
  armor: 0,
});

// sidejobs init (de nepkaart heeft geen ankers maar zet de modulevariabele wel)
zonderMelding(() => { try { SJ.initSideJobs(makeWorld()); } catch (e) { /* de nepkaart heeft geen ankers */ } });
// Controleert of de wereld na applySave nog zinnig is
const zinnig = (w) => Number.isFinite(w.money) && w.money >= 0 && w.money <= 1e12
  && Number.isFinite(w.health) && w.health >= 1 && w.health <= 100
  && Number.isFinite(w.armor) && Number.isFinite(w.player.x) && Number.isFinite(w.player.y);

let n = 0, fails = 0;
const gooide = {};
const ok = (c, m, i = '') => { n++; if (!c) { fails++; gooide[i] = (gooide[i] || 0) + 1; if (fails < 8) console.log('FAIL', m, i); } };
for (const [naam, d] of fixtures) {
  const saveData = d.save || d; // fixtures bevatten soms {save: ...} of direct de save
  for (let i = 0; i < 60; i++) {
    const kopie = JSON.parse(JSON.stringify(saveData));
    wijzig(kopie);
    let m;
    try { m = SM.migrateSave(kopie); ok(true, 'migreert'); } catch (e) { ok(false, 'migrateSave gooide op ' + naam, e.message.slice(0, 90)); continue; }
    if (!m) continue;
    // Oude test: summarize mag niet gooien
    try { SS.summarize(m.data); ok(true, 'samenvatting'); } catch (e) { ok(false, 'summarize gooide op ' + naam, e.message.slice(0, 90)); }
    // Nieuwe test (#1298): applySave mag niet gooien en de wereld moet zinnig blijven
    try {
      const w = makeWorld();
      HOME.__zetHome(null);
      SG.applySave(w, m.data);
      ok(zinnig(w), 'blijft bruikbaar na applySave', naam);
    } catch (e) {
      ok(false, 'applySave gooide op ' + naam, e.message.slice(0, 90));
    }
  }
}
for (let i = 0; i < 200; i++) {
  const s = { v: 1 + Math.floor(rnd() * 10) };
  for (const k of ['masterVolume', 'quality', 'keyBinds', 'padBinds', 'difficulty', 'onlineMeedoen', 'drawDistance']) if (rnd() < 0.7) s[k] = rommel[Math.floor(rnd() * rommel.length)];
  try { SM.migrateSettings(s); ok(true, 'instellingen'); } catch (e) { ok(false, 'migrateSettings gooide', e.message.slice(0, 90)); }
}
console.log(`savemigrate_fuzz_test: ${n - fails}/${n}`, fails ? JSON.stringify(gooide) : '');
process.exit(fails ? 1 : 0);
