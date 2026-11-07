// #655: meet het parse- en kopieerpad van save en boot. Dezelfde opslag als de fuzz-test (in-memory,
// nooit de echte), met de tellers uit saveslots.js en savemigrate.js:
//   - boot: één parse per slot, daarna cache-hits voor hasSave/readSave/summary/loadBootSave;
//   - schrijven: de vorige save wordt alleen op versie gecontroleerd (geen migratie/deep copy);
//   - een huidige save migreert niet en wordt niet gediepcopieerd;
//   - een kapotte save valt terug op de herstelkopie, en een mislukte schrijfactie laat de oude save staan.
//   node scripts/save_parsepad_test.mjs
import fs from 'node:fs';
import { KEYS, slotKey, slotRecoveryKey } from '../game/js/storagekeys.js';
import { ARC_ID } from '../game/js/storyarc.js';
import { SAVE_VERSION as V, migrateSave, runMigrations, migrationStats, resetMigrationStats } from '../game/js/savemigrate.js';
import * as S from '../game/js/saveslots.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ' (' + info + ')' : ''}`); } };
class Mem {
  constructor(quota = Infinity) { this.m = new Map(); this.quota = quota; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) {
    v = String(v);
    const before = this.m.get(k);
    this.m.set(k, v);
    let size = 0; for (const [a, b] of this.m) size += a.length + b.length;
    if (size > this.quota) { if (before === undefined) this.m.delete(k); else this.m.set(k, before); const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; }
  }
  removeItem(k) { this.m.delete(k); }
}
const save = (money, extra = {}) => ({ v: V, arc: ARC_ID, savedAt: 1000 + money, money, speeltijd: 60, missions: { completed: [] }, character: 'tammo', ...extra });
const verse = (ls, n2) => JSON.parse(ls.getItem(slotKey(n2)));

// --- boot: één parse per slot, daarna cache-hits ------------------------------------------------
{
  const ls = new Mem();
  ls.setItem(slotKey(1), JSON.stringify(save(100)));
  ls.setItem(slotKey(2), JSON.stringify(save(200)));
  ls.setItem(KEYS.saveSlots, JSON.stringify({ active: 1, names: {} }));
  S.resetSaveStats(); S.resetReadCache();
  const list = S.listSlots(ls);
  const parseNaLijst = S.saveStats.parse;
  ok(list.length === 2 && list.every((x) => x.summary), 'twee geldige slots in de lijst');
  ok(parseNaLijst === 2, 'boot: één parse per gevuld slot, niet per keer', String(parseNaLijst));
  // de boot vraagt daarna hasSave/readSave/summary/loadBootSave opnieuw: die komen uit de cache
  S.readSlot(ls, 1); S.readSlot(ls, 1); S.readSlot(ls, 2);
  ok(S.saveStats.parse === parseNaLijst, 'herhaald lezen parseert niet opnieuw', String(S.saveStats.parse));
  ok(S.saveStats.cacheHit >= 2, 'herhaald lezen is een cache-hit', String(S.saveStats.cacheHit));
  // de cache bewaart de save; applySave leest hem alleen (muteren is niet de afspraak)
  ok(S.readSlot(ls, 1).data.money === 100, 'de cache geeft dezelfde save terug', String(S.readSlot(ls, 1).data.money));
}

// --- schrijven: alleen een versiecontrole op de vorige save --------------------------------------
{
  const ls = new Mem();
  ls.setItem(slotKey(1), JSON.stringify(save(100)));
  S.resetSaveStats(); S.resetReadCache();
  const nieuw = JSON.stringify(save(150, { savedAt: 5000 }));
  ok(S.writeSlotRaw(ls, 1, nieuw), 'schrijven lukt');
  ok(S.saveStats.parse === 1, 'schrijven parseert de vorige save één keer (versiecontrole)', String(S.saveStats.parse));
  ok(S.saveStats.migrate === 0, 'schrijven migreert de vorige save niet', String(S.saveStats.migrate));
  ok(S.saveStats.stringify === 0, 'writeSlotRaw schrijft de aangeleverde tekst zonder extra stringify', String(S.saveStats.stringify));
  // na de schrijfactie is de cache van dat slot weg: de nieuwe tekst wordt één keer gelezen
  S.resetSaveStats();
  const r = S.readSlot(ls, 1);
  ok(r.state === 'ok' && r.data.money === 150, 'nieuwe tekst leesbaar na de schrijfactie');
  ok(S.saveStats.parse === 1, 'na een schrijfactie opnieuw één parse (cache niet verouderd)', String(S.saveStats.parse));
  // lege plek: niets te controleren, niets te parsen
  S.resetSaveStats();
  ok(S.writeSlotRaw(ls, 2, JSON.stringify(save(10))), 'schrijven naar lege plek lukt');
  ok(S.saveStats.parse === 0 && S.saveStats.migrate === 0, 'lege plek: geen parse en geen migratie');
}

// --- een huidige save migreert niet en wordt niet gediepcopieerd ---------------------------------
{
  resetMigrationStats();
  const m = migrateSave(save(100));
  ok(m && m.data.v === V, 'huidige save migreert naar dezelfde versie');
  ok(migrationStats.copied === 0, 'huidige save: geen deep copy', String(migrationStats.copied));
  const direct = runMigrations(save(100), { 1: (d) => d }, V);
  ok(direct && direct.data && direct.data.money === 100 && migrationStats.copied === 0, 'runMigrations geeft dezelfde save zonder kopie');
  resetMigrationStats();
  const oud = runMigrations({ v: 1, money: 5 }, { 1: (d) => ({ ...d, x: 1 }) }, V);
  ok(oud && oud.data.v === V && migrationStats.copied === 1, 'een oude save kopieert één keer voor de migratiestap');
}

// --- herstelkopie en een mislukte schrijfactie ---------------------------------------------------
{
  const ls = new Mem();
  const goed = JSON.stringify(save(120));
  ls.setItem(slotKey(1), goed);
  S.resetSaveStats(); S.resetReadCache();
  ok(S.writeSlotRaw(ls, 1, JSON.stringify(save(130))), 'eerste schrijfactie lukt');
  ok(ls.getItem(slotRecoveryKey(1)) === goed, 'de vorige goede save is de herstelkopie');
  // kapot hoofdbestand: de herstelkopie wordt gelezen en repareert niets aan de kapotte tekst
  ls.setItem(slotKey(1), '{kapot');
  S.resetReadCache();
  const r = S.readSlot(ls, 1);
  ok(r.state === 'hersteld' && r.data.money === 120, 'kapotte save: herstelkopie gelezen', r.state);
  // volle opslag: de schrijfactie faalt en de oude save blijft staan
  const vol = new Mem();
  const oud = JSON.stringify(save(77));
  vol.setItem(slotKey(1), oud);
  S.resetReadCache();
  vol.quota = 0; // niets kan erbij
  ok(!S.writeSlotRaw(vol, 1, JSON.stringify(save(88))), 'volle opslag: schrijven faalt');
  ok(vol.getItem(slotKey(1)) === oud, 'volle opslag: de oude save staat er nog');
  S.resetReadCache();
  ok(S.readSlot(vol, 1).data.money === 77, 'na de mislukte schrijfactie leest de oude save');
}

// --- fuzz: rotzooi en afgekapte tekst blijven veilig, ook met de cache ---------------------------
{
  const ls = new Mem();
  const rommel = ['', '{', 'null', '[]', '{"v":"x"}', '{"v":999,"arc":"nieuw"}', 'x'.repeat(5000)];
  for (const t of rommel) {
    ls.setItem(slotKey(1), t);
    S.resetReadCache();
    let r;
    try { r = S.readSlot(ls, 1); } catch (e) { r = null; }
    ok(r && r.data == null && typeof r.state === 'string', `rotzooi (${t.slice(0, 12)}): veilige toestand`, r && r.state);
  }
}

// --- de versiecontrole voor keepNewerSave is een regex, geen parse -------------------------------
{
  S.resetSaveStats();
  ok(S.newerVersionOf(JSON.stringify({ v: V })) === null, 'huidige save: geen nieuwere versie');
  ok(S.newerVersionOf(JSON.stringify({ v: V + 1 })) === V + 1, 'nieuwere save wordt herkend');
  ok(S.newerVersionOf(null) === null && S.newerVersionOf('{') === null, 'geen tekst: niets');
  ok(S.saveStats.parse === 0, 'de versiecontrole parseert niet', String(S.saveStats.parse));
}

// --- de boot in main.js gebruikt één readSaveInfo in plaats van hasSave()+readSave() -------------
{
  const main = fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
  ok(/ensureLatestSlot\(\); const info = slot \? readSaveInfo\(\)/.test(main), 'de boot leest de save één keer via readSaveInfo');
  const saveslots = fs.readFileSync(new URL('../game/js/saveslots.js', import.meta.url), 'utf8');
  ok(/export const saveStats/.test(saveslots) && /export function resetSaveStats/.test(saveslots), 'de teller staat in saveslots');
  const sm = fs.readFileSync(new URL('../game/js/savemigrate.js', import.meta.url), 'utf8');
  ok(/export const migrationStats/.test(sm), 'de migratieteller staat in savemigrate');
}

console.log(`#655 meting: ${n - fails}/${n} save-parsepad ok`);
process.exitCode = fails ? 1 : 0;

