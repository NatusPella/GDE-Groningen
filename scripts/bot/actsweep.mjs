// Spelbot (#186): een beperkte missiesweep over akte 4 en 5, met een rapport per missie.
// De bot speelt elke missie van de akte los via de sprong (`run.mjs --mode=missions --only=<id>`),
// analyseert die run (`analyse.mjs`) en dit bestand zet de uitkomsten naast elkaar:
// per missie het resultaat, de speltijd, hoeveel stappen klaar zijn, waar hij hing, of er een
// cheat nodig was en de eerste bevindingen — plus een eindoordeel per missie.
//
// Waarom een eigen tool naast `akte_rapport.mjs`: dat maakt één rapport uit runmappen die iemand
// zelf heeft gedraaid en geanalyseerd. Deze sweep kiest de missies van de akte, bouwt de opdrachten,
// kan ze achter elkaar draaien (één Electron-slot per run) en vat daarna per missie samen of de bot
// zonder cheat doorkwam. Zo is "akte 4 en 5 echt doorlopen" meetbaar in plaats van een losse run.
//
//   node scripts/bot/actsweep.mjs                      # het plan (geen Electron)
//   node scripts/bot/actsweep.mjs --run                # de sweep draaien (Electron, één per keer)
//   node scripts/bot/actsweep.mjs --report             # rapport uit wat er in de basismap staat
//   node scripts/bot/actsweep.mjs --act=all --run --report --out=rapport.md --slot
//   --only=M22,M25 overschrijft de lijst van de akte; --met-epiloog voegt E toe aan akte 5.
//
// Wat dit niet zegt: of een missie leuk is, hoe de besturing voelt, geluid en beeld. En een cheat
// of vastzitmelding kan aan de bot liggen in plaats van aan het spel (staat ook in het rapport).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const RUN = path.join(HERE, 'run.mjs');
export const ANALYSE = path.join(HERE, 'analyse.mjs');

// De missies per akte, zoals het verhaal ze bouwt (storyarc_nieuw.js: 'zuid' = akte 4,
// 'ontzet' = akte 5). De test controleert deze lijsten tegen die bron, zodat ze niet verouderen.
export const ACTS = {
  4: ['M17', 'M18', 'M19', 'M20', 'M21'],
  5: ['M22', 'M23', 'M24', 'M25', 'M26'],
};
export const EPILOOG = 'E';

export const SWEEP = {
  act: '5',            // welke akte; 'all' = 4 en 5
  base: path.join(os.tmpdir(), 'gde-spelbot-acten'),
  perStepS: 600,       // --per-step: hooguit zoveel spelseconden per stap
  speed: 2,            // --speed: hele extra spelstappen per beeld
  maxGameS: 3600,      // --max-game: budget per missie
  waitS: 45,           // --wait: wachtbudget (gesprek, banner, laadscherm)
  analyse: true,       // na elke run analyse.mjs draaien
  archive: false,      // een oude runmap van dezelfde missie eerst opzij zetten
};

const isId = (s) => /^[A-Za-z][A-Za-z0-9]*$/.test(s);

// Welke missies horen bij deze keuze? `only` (komma's) gaat boven de akte. Onbekende id's worden
// teruggegeven in `onbekend` in plaats van stil meegedraaid: een typefout moet je zien.
export function kiesMissies({ act = SWEEP.act, only = '', metEpiloog = false } = {}) {
  if (only) {
    const ids = String(only).split(',').map((s) => s.trim()).filter(Boolean);
    return { ids: ids.filter(isId), onbekend: ids.filter((s) => !isId(s)), bron: 'only' };
  }
  const a = String(act).toLowerCase();
  const basis = a === 'all' ? [...ACTS[4], ...ACTS[5]] : (ACTS[Number(a)] || ACTS[5]).slice();
  const bron = a === 'all' ? 'akte 4 en 5' : `akte ${ACTS[Number(a)] ? Number(a) : 5}`;
  if (metEpiloog && a !== '4') basis.push(EPILOOG);
  return { ids: basis, onbekend: [], bron };
}

// De opdrachten voor de sweep, zonder iets te draaien: per missie de run en (optioneel) de analyse.
// Zo kan een test het plan nakijken en kan `--run` hetzelfde plan uitvoeren.
export function planSweep({ ids = [], base = SWEEP.base, opts = {}, node = process.execPath, run = RUN, analyse = ANALYSE } = {}) {
  const o = { ...SWEEP, ...opts };
  return ids.map((id) => {
    const out = path.join(base, id);
    const args = [
      '--mode=missions', `--only=${id}`, `--out=${out}`,
      `--per-step=${o.perStepS}`, `--speed=${o.speed}`, `--max-game=${o.maxGameS}`, `--wait=${o.waitS}`,
      ...(o.slot ? ['--slot'] : []),
    ];
    const stappen = [{ wat: 'run', bestand: run, args, out }];
    if (o.analyse) stappen.push({ wat: 'analyse', bestand: analyse, args: [out], out });
    return { id, out, stappen };
  });
}

// De uitkomst van één runmap: result.json en, als die er is, analysis.json.
export function leesRun(dir) {
  const rf = path.join(dir, 'result.json');
  if (!fs.existsSync(rf)) return null;
  let result = null, analysis = null;
  try { result = JSON.parse(fs.readFileSync(rf, 'utf8')); } catch (e) { result = null; }
  const af = path.join(dir, 'analysis.json');
  if (fs.existsSync(af)) { try { analysis = JSON.parse(fs.readFileSync(af, 'utf8')); } catch (e) { analysis = null; } }
  if (!result && !analysis) return null;
  const m = (analysis && analysis.metrics) || {};
  return {
    result: (result && result.result) || m.result || '',
    gameSeconds: Number.isFinite(result && result.gameSeconds) ? result.gameSeconds : (Number.isFinite(m.gameSeconds) ? m.gameSeconds : null),
    lastStep: (result && result.lastStep) || m.lastStep || '',
    seed: result && result.seed,
    metrics: {
      stepsDone: m.stepsDone ?? null, stepsStarted: m.stepsStarted ?? null,
      stuck: m.stuck ?? 0, timeouts: m.timeouts ?? 0, cheats: m.cheats ?? 0, fails: m.fails ?? 0,
      consoleErrors: m.consoleErrors ?? null, nan: m.nan ?? null,
    },
    findings: (analysis && Array.isArray(analysis.findings)) ? analysis.findings : [],
    geanalyseerd: !!analysis,
  };
}

const KLAAR = (r) => r === 'KLAAR' || r === 'REPLAY';

// Het eindoordeel per missie, en de reden erbij. Dit is de kern van het rapport: kwam de bot
// zonder cheat door de missie, of had hij de cheat-ladder nodig, of kwam hij niet eens aan het eind?
export function verdictVan(run) {
  if (!run) return { code: 'niet-gedraaid', tekst: 'niet gedraaid' };
  // wel gedraaid, maar analyse.mjs is niet geweest: over cheats en vastzitten weten we dan niets,
  // dus geen 'zonder cheat' beweren
  if (run.geanalyseerd === false) return { code: 'niet-geanalyseerd', tekst: 'gedraaid, niet geanalyseerd' };
  if (!KLAAR(run.result)) {
    const waar = run.lastStep ? `, stopte in ${run.lastStep}` : '';
    return { code: 'niet-af', tekst: `niet af${waar}${run.result ? ` (${run.result})` : ''}` };
  }
  if (run.metrics.cheats > 0) return { code: 'cheat-nodig', tekst: `cheat nodig (${run.metrics.cheats}x)` };
  if (run.metrics.stuck > 0 || run.metrics.timeouts > 0) return { code: 'kwetsbaar', tekst: `gehaald, maar ${run.metrics.stuck} vast en ${run.metrics.timeouts} time-outs` };
  return { code: 'zonder-cheat', tekst: 'zonder cheat' };
}

const fmt = (s) => (s == null ? '—' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);
const cel = (s) => String(s == null ? '—' : s).replace(/\|/g, '/').replace(/\r?\n/g, ' ');

// Het rapport: een tabel per missie, de groepen per oordeel en een paar regels over de grenzen van
// wat dit meet. `ids` bepaalt de volgorde; zonder ids de volgorde van akte 5 en dan 4.
export function rapport({ base = SWEEP.base, ids = null, datum = new Date().toISOString().slice(0, 10), titel = 'Akte 4 en 5' } = {}) {
  const lijst = ids && ids.length ? ids : [...ACTS[5], ...ACTS[4]];
  const rijen = lijst.map((id) => {
    const run = leesRun(path.join(base, id));
    return { id, run, verdict: verdictVan(run) };
  });
  const gedraaid = rijen.filter((r) => r.run);
  const per = (code) => rijen.filter((r) => r.verdict.code === code);
  const zonder = per('zonder-cheat'), cheat = per('cheat-nodig'), kwetsbaar = per('kwetsbaar'), nietAf = per('niet-af'), niet = per('niet-gedraaid'), ongeanalyseerd = per('niet-geanalyseerd');
  const seconden = gedraaid.reduce((s, r) => s + (r.run.gameSeconds || 0), 0);
  const cheats = gedraaid.reduce((s, r) => s + (r.run.metrics.cheats || 0), 0);

  const out = ['# Spelbot-sweep: ' + titel, ''];
  out.push(`Beperkte missiesweep van de Spelbot (epic #186), gemaakt op ${datum} uit \`${base}\`.`);
  out.push(`${gedraaid.length} van ${rijen.length} missies gedraaid, ${fmt(seconden)} speltijd, ${cheats} cheat${cheats === 1 ? '' : 's'} nodig.`);
  out.push('');
  out.push('| Missie | Uitkomst | Speltijd | Stappen klaar | Vast | Time-outs | Cheats | Mislukt | Bevindingen | Oordeel |');
  out.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rijen) {
    const m = (r.run && r.run.metrics) || {};
    const stappen = m.stepsStarted != null ? `${m.stepsDone}/${m.stepsStarted}` : '—';
    const bev = r.run ? (r.run.findings.length ? `${r.run.findings.length}${r.run.findings[0] ? ': ' + String(r.run.findings[0].title || '').slice(0, 60) : ''}` : 'geen') : '—';
    out.push(`| ${cel(r.id)} | ${cel(r.run ? r.run.result : '—')} | ${fmt(r.run && r.run.gameSeconds)} | ${stappen} | ${cel(m.stuck ?? '—')} | ${cel(m.timeouts ?? '—')} | ${cel(m.cheats ?? '—')} | ${cel(m.fails ?? '—')} | ${cel(bev)} | ${cel(r.verdict.tekst)} |`);
  }
  out.push('');
  const lijstVan = (groep) => groep.map((r) => r.id).join(', ');
  out.push('## Oordeel');
  if (zonder.length) out.push(`- **Zonder cheat gehaald:** ${lijstVan(zonder)}.`);
  if (kwetsbaar.length) out.push(`- **Gehaald, maar met haperingen (vast/time-out):** ${lijstVan(kwetsbaar)}.`);
  if (cheat.length) out.push(`- **Cheat nodig:** ${lijstVan(cheat)} (${cheat.map((r) => `${r.id}: ${r.run.metrics.cheats}x`).join('; ')}).`);
  if (nietAf.length) out.push(`- **Niet af:** ${lijstVan(nietAf)} (${nietAf.map((r) => `${r.id}${r.run.lastStep ? ' in ' + r.run.lastStep : ''}`).join('; ')}).`);
  if (niet.length) out.push(`- **Niet gedraaid:** ${lijstVan(niet)}.`);
  if (!gedraaid.length) out.push('Nog geen enkele missie gedraaid: eerst `--run`.');
  out.push('');
  out.push('## Wat dit niet zegt');
  out.push('Dit is een beperkte sweep van akte 4 en 5, door een bot gespeeld. Of een missie leuk is, hoe de besturing voelt, geluid en beeld: dat beoordeelt de bot niet. Een cheat of vastzitmelding kan ook aan de bot liggen in plaats van aan het spel; de runmap noemt de plek en de tijd, zodat een mens het kan narekenen.');
  const md = out.join('\n') + '\n';
  return { md, samenvatting: { gedraaid: gedraaid.length, totaal: rijen.length, zonderCheat: zonder.length, kwetsbaar: kwetsbaar.length, cheatNodig: cheat.length, nietAf: nietAf.length, nietGedraaid: niet.length, nietGeanalyseerd: ongeanalyseerd.length, seconden, cheats } };
}

// --- CLI -------------------------------------------------------------------------------------------
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes(`--${k}`);

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const act = arg('act', SWEEP.act);
  const keuze = kiesMissies({ act, only: arg('only', ''), metEpiloog: flag('met-epiloog') });
  const base = path.resolve(arg('base', SWEEP.base));
  const opts = { perStepS: Number(arg('per-step', SWEEP.perStepS)), speed: Number(arg('speed', SWEEP.speed)), maxGameS: Number(arg('max-game', SWEEP.maxGameS)), waitS: Number(arg('wait', SWEEP.waitS)), analyse: !flag('no-analyse'), slot: flag('slot'), archive: flag('archive') };
  const plan = planSweep({ ids: keuze.ids, base, opts });
  const titel = arg('titel', keuze.bron === 'only' ? `missies ${keuze.ids.join(', ')}` : keuze.bron);

  if (keuze.onbekend.length) { console.error(`geen missie-id: ${keuze.onbekend.join(', ')}`); process.exit(2); }
  if (!keuze.ids.length) { console.error('geen missies gekozen'); process.exit(2); }

  if (flag('run')) {
    for (const m of plan) {
      console.log(`\n=== ${m.id}: ${m.out}`);
      if (opts.archive && fs.existsSync(m.out)) {
        const archief = path.join(base, 'archief', `${m.id}-${new Date().toISOString().replace(/[:.]/g, '-')}`);
        fs.mkdirSync(path.dirname(archief), { recursive: true });
        fs.renameSync(m.out, archief);
        console.log(`oude run opzij: ${archief}`);
      }
      for (const s of m.stappen) {
        const r = spawnSync(process.execPath, [s.bestand, ...s.args], { stdio: 'inherit' });
        if (r.status !== 0) console.log(`${m.id}: ${s.wat} gaf exitcode ${r.status}; door naar de volgende`);
        if (r.status !== 0 && s.wat === 'run') break; // zonder run niets te analyseren
      }
    }
  } else if (!flag('report')) {
    console.log(`plan voor ${plan.length} missies (${titel}), basis ${base}:`);
    for (const m of plan) for (const s of m.stappen) console.log(`  ${m.id}  ${s.wat}: node ${path.relative(process.cwd(), s.bestand)} ${s.args.join(' ')}`);
    console.log('\nDraai met --run; daarna --report (of --run --report).');
    process.exit(0);
  }

  if (flag('run') || flag('report')) {
    const { md, samenvatting: s } = rapport({ base, ids: keuze.ids, titel, datum: new Date().toISOString().slice(0, 10) });
    const uit = arg('out', '');
    if (uit) { fs.mkdirSync(path.dirname(path.resolve(uit)), { recursive: true }); fs.writeFileSync(path.resolve(uit), md); console.log(`\nrapport: ${path.resolve(uit)}`); }
    else console.log('\n' + md);
    console.log(`samengevat: ${s.gedraaid}/${s.totaal} gedraaid, ${s.zonderCheat} zonder cheat, ${s.cheatNodig} met cheat, ${s.nietAf} niet af, ${s.nietGedraaid} niet gedraaid`);
  }
}
