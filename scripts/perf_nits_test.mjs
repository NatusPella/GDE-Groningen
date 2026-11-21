// Kleine prestatiepunten uit de review van 22-11 (N2, N4, N5 en de tegelkoeler): glowBudget geeft hetzelfde als voorheen zonder per frame arrays
// en een Set te maken; de snapshotcache van vehiclepreview.js is begrensd en pump vangt een gooiende bouw af; dropStreamTile laat de koeler los.
//   node scripts/perf_nits_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { glowBudget, MAX_GLOW_VISIBLE } from '../game/js/tuningworld.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const src = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

// de oude uitvoering, als referentie
const oud = (entries, max) => { const show = new Set(); for (const e of entries.filter((x) => x.glow).sort((a, b) => a.dist - b.dist || String(a.id).localeCompare(String(b.id))).slice(0, max)) show.add(e.id); return show; };
const rnd = (() => { let s = 12345; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();

t('N2: glowBudget kiest dezelfde auto\'s als de oude sortering (ook bij gelijke afstand)', () => {
  for (let ronde = 0; ronde < 300; ronde++) {
    const k = Math.floor(rnd() * 20);
    const entries = Array.from({ length: k }, (_, i) => ({ id: 'auto' + i, dist: Math.floor(rnd() * 8) * 5, glow: rnd() < 0.7 }));
    for (const max of [1, 2, MAX_GLOW_VISIBLE, 30]) {
      const a = glowBudget(entries, max), b = oud(entries, max);
      assert.deepEqual([...a].sort(), [...b].sort(), `ronde ${ronde} max ${max}`);
    }
  }
});
t('N2: met een meegegeven Set wordt die hergebruikt en leeggemaakt', () => {
  const uit = new Set(['oud']);
  const r = glowBudget([{ id: 'a', dist: 3, glow: true }, { id: 'b', dist: 1, glow: true }], 1, uit);
  assert.equal(r, uit); assert.deepEqual([...r], ['b']);
});
t('N2: tickVehicleLooks hergebruikt zijn lijst en Set (geen filter, sort of nieuwe Set per frame)', () => {
  const s = src('../game/js/vehiclelook3d.js');
  const tick = s.slice(s.indexOf('export function tickVehicleLooks'), s.indexOf('// Een sticker getekend'));
  assert.ok(!/new Set\(/.test(tick) && !/\.filter\(/.test(tick) && !/\.sort\(/.test(tick), 'geen allocaties in de tik');
  assert.match(tick, /glowBudget\(_glowList, MAX_GLOW_VISIBLE, _glowShow\)/);
});
t('N4: pump vangt een gooiende bouw af, zodat pumping niet voorgoed aan blijft', () => {
  const s = src('../game/js/vehiclepreview.js');
  const pump = s.slice(s.indexOf('function pump('), s.indexOf('// A still image (data URL'));
  assert.match(pump, /try \{ url = shoot\([^)]*\); \} catch \(e\) \{ url = ''; \}/);
});
t('N5: de snapshotcache is begrensd (oudste eruit) en er is een enkele plek die hem vult', () => {
  const s = src('../game/js/vehiclepreview.js');
  assert.match(s, /const SHOTS_MAX = \d+;/);
  assert.match(s, /function rememberShot\(key, url\)/);
  assert.equal((s.match(/shots\.set\(/g) || []).length, 1, 'alleen rememberShot zet in de cache');
});
t('tegelkoeler: dropStreamTile laat de koeler los van de tegel', () => {
  const s = src('../game/js/farlod.js');
  const f = s.slice(s.indexOf('function dropStreamTile'), s.indexOf('return { update, setNight'));
  assert.match(f, /tileCooler\.forget\(t\)/);
});
console.log(`perf_nits_test ok (${n} groepen)`);
