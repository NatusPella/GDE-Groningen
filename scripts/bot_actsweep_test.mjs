// Spelbot (#186): de beperkte akte 4/5-missiesweep (scripts/bot/actsweep.mjs).
// Geen Electron en geen netwerk: de keuze, het plan, het oordeel per missie en het rapport worden
// met kleine runmappen in een tijdelijke map nagespeeld; de CLI wordt één keer echt gestart
// (plan en rapport), zodat de bedrading ook klopt.
//   node scripts/bot_actsweep_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = await import('../scripts/bot/actsweep.mjs');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// --- 1. de missielijsten komen uit het verhaal (storyarc_nieuw.js: 'zuid' = akte 4, 'ontzet' = akte 5)
{
  const arc = lees('game/js/storyarc_nieuw.js');
  const per = (deel) => [...arc.matchAll(new RegExp(`M\\('(M\\d+)', '${deel}'`, 'g'))].map((m) => m[1]);
  const zuid = per('zuid'), ontzet = per('ontzet');
  ok(zuid.length === 5 && S.ACTS[4].join() === zuid.join(), 'akte 4 is M17 t/m M21, net als in het verhaal', `${zuid.join(',')} / ${S.ACTS[4].join(',')}`);
  ok(ontzet.length === 5 && S.ACTS[5].join() === ontzet.join(), 'akte 5 is M22 t/m M26, net als in het verhaal', `${ontzet.join(',')} / ${S.ACTS[5].join(',')}`);
  ok(/A\('E', 'ontzet'/.test(arc) && S.EPILOOG === 'E', 'de epiloog is stap E');
}

// --- 2. welke missies: de akte, alles, of een eigen lijst
{
  ok(S.kiesMissies({ act: '5' }).ids.join() === 'M22,M23,M24,M25,M26', 'standaard: akte 5');
  ok(S.kiesMissies({ act: '4' }).ids.join() === 'M17,M18,M19,M20,M21', 'akte 4');
  ok(S.kiesMissies({ act: 'all' }).ids.length === 10, 'akte 4 en 5 samen: tien missies');
  ok(S.kiesMissies({ act: '5', metEpiloog: true }).ids.join() === 'M22,M23,M24,M25,M26,E', 'met de epiloog erbij');
  ok(S.kiesMissies({ metEpiloog: true, act: '4' }).ids.length === 5 && !S.kiesMissies({ metEpiloog: true, act: '4' }).ids.includes('E'), 'de epiloog hoort niet bij akte 4');
  const eigen = S.kiesMissies({ only: 'M22, E ,M25' });
  ok(eigen.ids.join() === 'M22,E,M25' && eigen.bron === 'only', 'een eigen lijst gaat boven de akte', eigen.ids.join());
  const fout = S.kiesMissies({ only: 'M22, M-23, M25' });
  ok(fout.ids.join() === 'M22,M25' && fout.onbekend.join() === 'M-23', 'een typefout wordt gemeld, niet stil meegedraaid', JSON.stringify(fout.onbekend));
  ok(S.kiesMissies({ act: 'onzin' }).ids.join() === S.ACTS[5].join(), 'een onbekende akte valt terug op akte 5');
}

// --- 3. het plan: wat de sweep precies zou draaien
{
  const plan = S.planSweep({ ids: ['M22', 'M23'], base: path.join(os.tmpdir(), 'x'), opts: { speed: 3, perStepS: 120, slot: true } });
  ok(plan.length === 2 && plan[0].id === 'M22' && plan[1].id === 'M23', 'één plan per missie');
  const run = plan[0].stappen[0], analyse = plan[0].stappen[1];
  ok(run.wat === 'run' && /run\.mjs$/.test(run.bestand), 'de eerste stap is run.mjs');
  for (const f of ['--mode=missions', '--only=M22', '--per-step=120', '--speed=3', '--slot']) ok(run.args.includes(f), `het plan heeft ${f}`, run.args.join(' '));
  ok(run.args.includes(`--out=${path.join(os.tmpdir(), 'x', 'M22')}`), 'elke missie heeft een eigen runmap', run.args.find((a) => a.startsWith('--out=')));
  ok(analyse.wat === 'analyse' && /analyse\.mjs$/.test(analyse.bestand) && analyse.args[0] === run.out, 'daarna analyse.mjs op die runmap');
  const zonder = S.planSweep({ ids: ['M22'], opts: { analyse: false } });
  ok(zonder[0].stappen.length === 1, 'analyse is uit te zetten');
  ok(S.planSweep({}).length === 0, 'geen missies: geen plan');
}

// --- 4. het oordeel per missie
{
  ok(S.verdictVan(null).code === 'niet-gedraaid', 'geen run: niet gedraaid');
  const klaar = (cheats = 0, stuck = 0, timeouts = 0) => ({ result: 'KLAAR', gameSeconds: 600, lastStep: 'M23.4', metrics: { cheats, stuck, timeouts, fails: 0 } });
  ok(S.verdictVan(klaar()).code === 'zonder-cheat', 'KLAAR zonder cheat: zonder cheat');
  ok(S.verdictVan(klaar(2)).code === 'cheat-nodig' && /2x/.test(S.verdictVan(klaar(2)).tekst), 'KLAAR met cheats: cheat nodig, met het aantal');
  ok(S.verdictVan(klaar(0, 1)).code === 'kwetsbaar' && /1 vast/.test(S.verdictVan(klaar(0, 1)).tekst), 'KLAAR maar vastgezeten: kwetsbaar');
  const niet = S.verdictVan({ result: 'tijd op', gameSeconds: 300, lastStep: 'M24.2', metrics: { cheats: 1 } });
  ok(niet.code === 'niet-af' && /M24\.2/.test(niet.tekst), 'niet KLAAR: niet af, met de stap erbij', niet.tekst);
  ok(S.verdictVan({ result: 'REPLAY', geanalyseerd: true, metrics: {} }).code === 'zonder-cheat', 'een replay telt als een gespeelde run');
  ok(S.verdictVan({ result: 'KLAAR', geanalyseerd: false, metrics: {} }).code === 'niet-geanalyseerd', 'gedraaid zonder analyse: geen oordeel over cheats');
}

// --- 5. het rapport uit kleine runmappen
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-actsweep-test-'));
const base = path.join(tmp, 'basis');
const schrijf = (id, result, analysis = null) => {
  const dir = path.join(base, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(result));
  if (analysis) fs.writeFileSync(path.join(dir, 'analysis.json'), JSON.stringify(analysis));
};
{
  const metrics = (o) => ({ gameSeconds: o.gameSeconds ?? 600, stepsDone: o.stepsDone ?? 4, stepsStarted: o.stepsStarted ?? 5, stuck: o.stuck ?? 0, timeouts: o.timeouts ?? 0, cheats: o.cheats ?? 0, fails: o.fails ?? 0, consoleErrors: 0, nan: 0, result: o.result });
  schrijf('M22', { result: 'KLAAR', gameSeconds: 300, lastStep: 'M22.2', seed: 1 }, { metrics: metrics({ gameSeconds: 300, result: 'KLAAR' }), findings: [] });
  schrijf('M23', { result: 'KLAAR', gameSeconds: 800, lastStep: 'M23.4' }, { metrics: metrics({ cheats: 2, timeouts: 1 }), findings: [{ severity: 'bug', title: 'De colonne valt uiteen bij de brug' }] });
  schrijf('M24', { result: 'tijd op', gameSeconds: 420, lastStep: 'M24.2' }, { metrics: metrics({ result: 'tijd op', stepsDone: 1, stepsStarted: 3, cheats: 1, fails: 1 }) });
  schrijf('M25', null, null);
  fs.rmSync(path.join(base, 'M25'), { recursive: true, force: true }); // M25 bestaat niet: niet gedraaid
  schrijf('M26', { result: 'KLAAR', gameSeconds: 900, lastStep: 'M26.8' }, { metrics: metrics({ stuck: 2, cheats: 0 }) });
  const r = S.rapport({ base, ids: S.ACTS[5], datum: '2026-11-06', titel: 'Akte 5' });
  ok(/Spelbot-sweep: Akte 5/.test(r.md) && /2026-11-06/.test(r.md), 'het rapport heeft een kop en de datum');
  ok(/4 van 5 missies gedraaid/.test(r.md), 'het aantal gedraaide missies', r.md.split('\n')[2]);
  ok(r.samenvatting.gedraaid === 4 && r.samenvatting.zonderCheat === 1 && r.samenvatting.cheatNodig === 1 && r.samenvatting.nietAf === 1 && r.samenvatting.nietGedraaid === 1, 'de samenvatting per oordeel', JSON.stringify(r.samenvatting));
  ok(/M22/.test(r.md) && /zonder cheat/.test(r.md) && /cheat nodig \(2x\)/.test(r.md) && /niet af, stopte in M24\.2/.test(r.md) && /niet gedraaid/.test(r.md), 'een regel per missie met het oordeel');
  ok(/De colonne valt uiteen bij de brug/.test(r.md), 'de eerste bevinding staat in de tabel');
  ok(/Gehaald, maar met haperingen/.test(r.md) && /M26/.test(r.md), 'gehaald met vastzitten is een eigen groep');
  // een run zonder analyse: wel gedraaid, maar geen oordeel over cheats
  schrijf('M18', { result: 'KLAAR', gameSeconds: 120, lastStep: 'M18.1' });
  const zonderAnalyse = S.rapport({ base, ids: ['M18'], datum: '2026-11-06' });
  ok(/niet geanalyseerd/.test(zonderAnalyse.md) && zonderAnalyse.samenvatting.nietGeanalyseerd === 1, 'zonder analyse.mjs geen zonder-cheat-oordeel', zonderAnalyse.md.split('\\n').slice(2, 6).join(' | '));
  ok(/Wat dit niet zegt/.test(r.md) && /smaak|beleeft|geluid/i.test(r.md), 'het rapport zegt wat het niet meet');
  ok(/—/.test(r.md), 'ontbrekende waarden zijn een streepje, geen crash');
  const leeg = S.rapport({ base: path.join(tmp, 'leeg'), ids: ['M22'], datum: '2026-11-06' });
  ok(/0 van 1 missies gedraaid/.test(leeg.md) && /Nog geen enkele missie gedraaid/.test(leeg.md), 'een lege basismap zegt het eerlijk');
}

// --- 6. de CLI: plan en rapport, zonder Electron
{
  const cli = path.join(ROOT, 'scripts/bot/actsweep.mjs');
  const plan = spawnSync(process.execPath, [cli, '--base=' + base, '--act=5'], { encoding: 'utf8', cwd: ROOT });
  ok(plan.status === 0 && /--mode=missions --only=M22/.test(plan.stdout) && /--run/.test(plan.stdout), 'zonder vlaggen drukt de CLI het plan', (plan.stdout || '').slice(-120));
  const out = path.join(tmp, 'rapport.md');
  const rep = spawnSync(process.execPath, [cli, '--base=' + base, '--act=5', '--report', '--out=' + out], { encoding: 'utf8', cwd: ROOT });
  ok(rep.status === 0 && fs.existsSync(out) && /4 van 5/.test(fs.readFileSync(out, 'utf8')), '--report schrijft het rapport', (rep.stderr || '').slice(-160));
  const fout = spawnSync(process.execPath, [cli, '--only=M22,M-23'], { encoding: 'utf8', cwd: ROOT });
  ok(fout.status === 2 && /geen missie-id: M-23/.test(fout.stderr), 'een onbekend id stopt de CLI met uitleg', fout.stderr.trim());
}
fs.rmSync(tmp, { recursive: true, force: true });

console.log(fails ? `bot_actsweep_test: ${fails} van ${n} mislukt` : `bot_actsweep_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
