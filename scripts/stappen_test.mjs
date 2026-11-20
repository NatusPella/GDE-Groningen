// Voetstappen met opnames (#988, ADR 0039): de koppeling van ondergrond aan de stap_<ondergrond>_<n>-bestanden (sfx/steps.js), de variantkeuze
// (nooit twee gelijke achter elkaar), de cadans bij lopen, rennen en sluipen, links en rechts, de afstand van anderen, en de bestanden zelf
// (manifest, duur, niveau, grootte). Pure logica, zonder Web Audio.
//   node scripts/stappen_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILE_SURFACES, FILE_VARIANTS, FILE_STEP_KEYS, fileStepNames, fileSurface, footSide, gainJitter, npcStep, stepNames, strideFor, tickFoot, PROC_STAND_IN, STEP_SURFACES } from '../game/js/sfx/steps.js';
import { SAMPLE_INFO } from '../game/js/sfx/samples.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

// -- de bestanden --------------------------------------------------------------------------------------------------------
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'audio', 'sfx', 'manifest.json'), 'utf8')).geluiden;
let bytes = 0;
for (const k of FILE_STEP_KEYS) {
  const m = man[k];
  ok(m, `${k}: staat in het manifest`);
  if (!m) continue;
  const f = path.join(ROOT, 'game', 'audio', 'sfx', m.bestand);
  ok(fs.existsSync(f), `${k}: bestand bestaat`);
  if (fs.existsSync(f)) bytes += fs.statSync(f).size;
  ok(m.duur_s >= 0.15 && m.duur_s <= 0.5, `${k}: duur van een stap (${m.duur_s} s)`);
  ok(m.loop === false, `${k}: geen lus`);
  ok(m.niveau && m.niveau.piek_db <= -1 && m.niveau.rms_db >= -30 && m.niveau.rms_db <= -22, `${k}: niveau gelijk en zonder clipping (${m.niveau && m.niveau.rms_db} / ${m.niveau && m.niveau.piek_db} dB)`);
  ok(SAMPLE_INFO[k] && SAMPLE_INFO[k].cat === 'voetstap', `${k}: heeft een regel in SAMPLE_INFO (voetstap)`);
}
ok(bytes < 4 * 1024 * 1024, `de stappen samen onder 4 MB (${Math.round(bytes / 1024)} kB)`);
for (const s of FILE_SURFACES) {
  const rms = FILE_STEP_KEYS.filter((k) => k.startsWith(`stap_${s}_`)).map((k) => (man[k] || { niveau: { rms_db: -23 } }).niveau.rms_db);
  ok(rms.length === FILE_VARIANTS, `${s}: ${FILE_VARIANTS} varianten`);
  ok(Math.max(...rms) - Math.min(...rms) <= 6, `${s}: varianten binnen 6 dB van elkaar`, rms.join(' '));
}
ok(FILE_VARIANTS >= 4 && FILE_VARIANTS <= 8, 'vier tot acht varianten per ondergrond');

// -- ondergrond naar bestanden -------------------------------------------------------------------------------------------
for (const s of FILE_SURFACES) ok(fileSurface(s) === s, `${s}: eigen set`);
ok(fileSurface('fietspad') === 'asfalt' && fileSurface('tegels') === 'klinkers' && fileSurface('strand') === 'zand' && fileSurface('erf') === 'grind', 'aliassen: fietspad, tegels, strand en erf');
ok(fileSurface('onbekend') === 'klinkers', 'onbekende ondergrond valt terug op klinkers');
ok(fileStepNames('gras', 0.1).every((x) => FILE_STEP_KEYS.includes(x)) && fileStepNames('gras', 0.1).length === FILE_VARIANTS, 'alle namen bestaan en alle varianten komen aan bod als terugval');
ok(fileStepNames('asfalt', 0.1, null, true)[0].startsWith('stap_ren_'), 'rennen op asfalt klinkt met de ren-set');
ok(fileStepNames('gras', 0.1, null, true)[0].startsWith('stap_gras_'), 'rennen op gras blijft op gras');
ok(fileStepNames('binnen', 0.1, null, true)[0].startsWith('stap_ren_'), 'rennen binnen klinkt met de ren-set');
ok(Object.entries(PROC_STAND_IN).every(([k, v]) => STEP_SURFACES.includes(v) && !STEP_SURFACES.includes(k)), 'de procedurele terugval voor binnen en ren bestaat');
for (const s of FILE_SURFACES) ok(stepNames(PROC_STAND_IN[s] || s, 0.5)[0].startsWith('step_'), `${s}: procedurele terugval levert een naam`);

// nooit twee gelijke achter elkaar, ook niet bij een bevroren toevalsgetal
for (const s of ['gras', 'asfalt', 'metaal', 'binnen']) {
  const mem = {};
  let prev = '', gelijk = 0;
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const nm = fileStepNames(s, i % 3 === 0 ? 0.3 : (i * 0.6180339) % 1, mem)[0];
    if (nm === prev) gelijk++;
    prev = nm; seen.add(nm);
  }
  ok(gelijk === 0, `${s}: nooit twee gelijke stappen achter elkaar`, String(gelijk));
  ok(seen.size === FILE_VARIANTS, `${s}: alle ${FILE_VARIANTS} varianten komen voor (${seen.size})`);
}
{ const mem = {}; let prev = ''; let g = 0; for (let i = 0; i < 100; i++) { const nm = fileStepNames('wet', 0.5, mem)[0]; if (nm === prev) g++; prev = nm; } ok(g === 0, 'zelfs met altijd hetzelfde getal wisselt de variant'); }

// -- links en rechts, kleine variatie --------------------------------------------------------------------------------------
const l = footSide(0), r = footSide(1);
ok(l.offset < 0 && r.offset > 0 && Math.abs(l.offset + r.offset) < 1e-9 && l.rate !== r.rate, 'links en rechts: tegengestelde kant en een haartje andere toonhoogte');
ok(Math.abs(gainJitter(0) - Math.pow(10, -1.5 / 20)) < 1e-9 && Math.abs(gainJitter(1) - Math.pow(10, 1.5 / 20)) < 1e-9 && gainJitter(0.5) === 1, 'volumevariatie ±1,5 dB');

// -- cadans: lopen, rennen en sluipen, niets bij stilstand of in de lucht --------------------------------------------------
const tel = (speed, secs, extra = {}) => {
  const foot = { phase: 0, air: false, maxRise: 0, baseZ: 0 };
  let c = 0, ev = [];
  for (let t = 0; t < secs; t += 1 / 60) { tickFoot(foot, { vx: speed, vy: 0, z: 0, gz: 0, ...extra }, 1 / 60, ev); c += ev.filter((e) => e.kind === 'step').length; }
  return c;
};
const wandel = tel(1.6, 10), jog = tel(4, 10), sprint = tel(7, 10);
ok(wandel > 8 && wandel < 22, `wandelen: een stap per halve seconde (${wandel} in 10 s)`);
ok(jog > wandel && sprint > jog, `cadans stijgt met de snelheid (${wandel} < ${jog} < ${sprint})`);
ok(tel(0, 10) === 0 && tel(0.2, 10) === 0, 'stilstaan: geen stappen');
ok(tel(5, 10, { z: 2, gz: 0 }) === 0, 'in de lucht: geen stappen');
ok(tel(0.8, 10, { crouching: true }) < wandel, 'sluipen (langzaam): rustiger cadans dan wandelen');
{
  const foot = { phase: 0, air: false, maxRise: 0, baseZ: 0 }, ev = [];
  let run = null, crouch = null;
  for (let t = 0; t < 2; t += 1 / 60) { tickFoot(foot, { vx: 7, vy: 0, z: 0, gz: 0 }, 1 / 60, ev); for (const e of ev) if (e.kind === 'step') run = e; }
  const f2 = { phase: 0, air: false, maxRise: 0, baseZ: 0 };
  for (let t = 0; t < 2; t += 1 / 60) { tickFoot(f2, { vx: 1.2, vy: 0, z: 0, gz: 0, crouching: true }, 1 / 60, ev); for (const e of ev) if (e.kind === 'step') crouch = e; }
  ok(run && run.run === true && crouch && crouch.crouch === true && crouch.gain < run.gain / 2, 'een rensstap draagt run, een sluipstap crouch en is veel zachter');
}
ok(strideFor(7, false) > strideFor(1.6, false) && strideFor(1.2, true) < strideFor(1.6, false), 'passen worden langer bij snelheid, korter bij sluipen');

// -- anderen: veel zachter, gespreid, dof op afstand -------------------------------------------------------------------------
const dichtbij = npcStep(3, false, false), ver = npcStep(18, false, false), rend = npcStep(3, true, false);
ok(dichtbij.gain < 0.1 && ver.gain < dichtbij.gain / 2, `NPC's: zachter met afstand (${dichtbij.gain.toFixed(3)} naar ${ver.gain.toFixed(3)})`);
ok(ver.lp > 0 && ver.lp < 9000 && dichtbij.lp === 0, 'NPC\'s op afstand klinken dof');
ok(rend.gain < 0.2, 'een rennende NPC is zachter dan je eigen wandeling');

console.log(fails ? `${fails} van ${n} controles mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
