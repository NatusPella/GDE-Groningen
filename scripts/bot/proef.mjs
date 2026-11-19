// De proefspeler (docs/PROEFSPELER.md): een dunne driver om scripts/bot/run.mjs. Voor een lijst missies (en seeds) draait hij
// de Spelbot met het menselijke profiel (--mens) en --watch, en maakt per missie een playtestbundel voor een vision-reviewer:
// events.jsonl, genummerde oogmoment-beelden, index.md, samenvatting.json en review-brief.md (scripts/bot/proefbundel.mjs).
//   node scripts/bot/proef.mjs --missies=M02,M18 [--seeds=1,2,3] [--out=<map>] [--watch=20] [--pogingen=3] [--slot] [...run.mjs-opties]
//   node scripts/bot/proef.mjs --lijst=<json>     (["M02", {"id":"M18","seeds":[1,2],"skipStages":2}] of {"missies":[...]})
//   --matrix=rook|pairwise|volledig [--assen=tijd,weer,chaos]   variatie per missie (scripts/bot/matrix.mjs); --plan toont alleen het plan (geen Electron)
//   --goud[=<map>] vergelijkt de beelden met de gouden beelden (standaard .scr/goud), --goud-bewaar bewaart ze, --goud-vernieuw overschrijft; --geen-blind slaat de blinde bundel over
//   Naast de bundels: <out>/bevindingen.json, issues.md (voorstellen voor de coordinator), balans.md, matrix.md en tegenlezer-brief.md (scripts/bot/proefanalyse.mjs)
//   node scripts/bot/proef.mjs --out=<map> --alleen-bundel [--missies=...]   (geen Electron: de bundel opnieuw uit bestaande events.jsonl)
// Alle andere --opties gaan ongewijzigd naar run.mjs (--slot, --force, --speed, --wait, --stuck, --max-wall, --per-step, --shots ...).
// Uitvoer: <out>/<missie>/ (bij één seed) of <out>/<missie>/seed-<n>/ (bij meer seeds, plus een samenvatting met de faalratio), en <out>/overzicht.md.
// Geen cheats: run.mjs --mens weigert ze. De Electron-vereisten (slot, GDE_GAME_DIR, ELECTRON_DISABLE_SANDBOX=1) staan in de docs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { bundelSchrijven, faalratio, bouwOverzichtMd } from './proefbundel.mjs';
import { matrixPlan, MODI } from './matrix.mjs';
import { analyseRun, analyseSamen } from './proefanalyse.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EIGEN = ['missies', 'lijst', 'seeds', 'out', 'alleen-bundel', 'bewaar-ruw', 'matrix', 'assen', 'plan', 'goud', 'goud-bewaar', 'goud-vernieuw', 'geen-blind'];

export function parseArgs(argv) {
  const eigen = {}, door = [];
  for (const a of argv) {
    const m = a.match(/^--([\w-]+)(?:=(.*))?$/);
    if (!m) continue;
    if (EIGEN.includes(m[1])) eigen[m[1]] = m[2] === undefined ? true : m[2]; else door.push(a);
  }
  return { eigen, door };
}

// De lijst taken: [{ id, seeds: [..], extra: [..run.mjs-opties] }]. Bron: --lijst=<json> en/of --missies=M02,M18.
export function bouwTaken({ missies = '', lijst = null, seeds = '1' } = {}) {
  const standaard = String(seeds).split(',').map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0);
  const zaden = standaard.length ? standaard : [1];
  const taken = [];
  const voegToe = (t) => {
    const id = String(typeof t === 'string' ? t : t && t.id || '').trim().toUpperCase();
    if (!/^[A-Z]\d{1,3}$/.test(id)) throw new Error(`ongeldige missie-id: ${JSON.stringify(t)} (verwacht bv. M02 of A1)`);
    const sd = t && typeof t === 'object' && Array.isArray(t.seeds) && t.seeds.length ? t.seeds.map(Number) : zaden;
    const extra = [];
    if (t && typeof t === 'object' && t.skipStages) extra.push(`--skip-stages=${id}:${Number(t.skipStages) || 0}`);
    if (t && typeof t === 'object' && t.pogingen) extra.push(`--pogingen=${Number(t.pogingen)}`);
    if (!taken.some((q) => q.id === id)) taken.push({ id, seeds: sd, extra });
  };
  const items = Array.isArray(lijst) ? lijst : lijst && Array.isArray(lijst.missies) ? lijst.missies : [];
  for (const t of items) voegToe(t);
  for (const id of String(missies).split(',').map((x) => x.trim()).filter(Boolean)) voegToe(id);
  return taken;
}

// De run.mjs-argumenten voor één missie en één seed.
export function runArgs(taak, seed, out, door = [], extra = []) {
  const heeft = (k) => door.some((a) => a.startsWith(`--${k}=`) || a === `--${k}`);
  return [path.join(HERE, 'run.mjs'), '--mode=missions', `--only=${taak.id}`, '--mens', `--seed=${seed}`, `--out=${out}`,
    ...(heeft('watch') ? [] : ['--watch=20']), ...(heeft('shots') ? [] : ['--shots=150']), ...taak.extra, ...extra, ...door];
}

export function mapVoor(out, taak, seed, variant = null) { return variant ? path.join(out, taak.id, variant.naam) : taak.seeds.length > 1 ? path.join(out, taak.id, `seed-${seed}`) : path.join(out, taak.id); }

// De uitvoeringen van een taak: zonder matrix een run per seed, met matrix de runs van het plan (zonder de --seed-opties: runArgs zet de seed zelf).
export function uitvoeringen(taak, plan = null) {
  if (!plan) return taak.seeds.map((seed) => ({ seed, variant: null, extra: [] }));
  return plan.filter((r) => r.missie === taak.id).map((r) => ({ seed: r.perturbaties.seed, variant: r, extra: r.args.filter((a) => !/^--seed=/.test(a)) }));
}

// Het samenvattende bestand van een missie met meerdere seeds: de faalratio, en per seed de samenvatting.
function meerSeeds(out, taak, sams, ratio) {
  const dir = path.join(out, taak.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'samenvatting.json'), JSON.stringify({ missie: taak.id, faalratio: ratio, seeds: sams }, null, 1));
  const eerste = sams.find((s) => !s.geslaagd) || sams[0];
  const kop = [`# Reviewbrief ${taak.id}: ${sams.length} seeds`, '',
    `Geslaagd ${ratio.geslaagd} van ${ratio.seeds}; faalratio ${ratio.faalratio}; gemiddeld ${ratio.gemPogingen} pogingen; opgegeven ${ratio.opgegeven}x.`, '',
    ...sams.map((s) => `- seed ${s.seed}: ${s.geslaagd ? 'geslaagd' : 'NIET geslaagd (' + s.uitkomst + ')'}, ${s.pogingen} poging(en), brief: \`${s.map || 'seed-' + s.seed}/review-brief.md\``), '',
    `Begin met seed ${eerste.seed}${eerste.geslaagd ? '' : ' (de eerste die faalde)'}: lees \`${eerste.map || 'seed-' + eerste.seed}/review-brief.md\` en de beelden daarin. Een missie die bij sommige seeds faalt en bij andere slaagt is een bevinding op zich: noem wat het verschil kan zijn.`, ''];
  fs.writeFileSync(path.join(dir, 'review-brief.md'), kop.join('\n'));
}

export async function main(argv) {
  const { eigen, door } = parseArgs(argv);
  let lijst = null;
  if (eigen.lijst) lijst = JSON.parse(fs.readFileSync(path.resolve(String(eigen.lijst)), 'utf8'));
  const taken = bouwTaken({ missies: eigen.missies || '', lijst, seeds: eigen.seeds || '1' });
  if (!taken.length) { console.error('Geen missies: geef --missies=M02,M18 of --lijst=<json>.'); return 2; }
  let plan = null;
  if (eigen.matrix) {
    const modus = eigen.matrix === true ? 'rook' : String(eigen.matrix);
    if (!MODI.includes(modus)) { console.error(`Onbekende --matrix=${modus}: kies ${MODI.join(', ')}.`); return 2; }
    plan = matrixPlan({ missies: taken.map((t) => t.id), modus, assen: eigen.assen && eigen.assen !== true ? String(eigen.assen).split(',') : null, seeds: taken[0].seeds });
    console.log(`matrix ${modus}: ${plan.length} run(s) voor ${taken.length} missie(s)`);
    if (eigen.plan) { for (const r of plan) console.log(`  ${r.missie} ${r.naam}: ${r.args.join(' ')}${r.echt.length ? '  [alleen echt spel: ' + r.echt.map((e) => e.as + '=' + e.waarde).join(', ') + ']' : ''}`); return 0; }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = path.resolve(String(eigen.out && eigen.out !== true ? eigen.out : path.join(os.tmpdir(), 'gde-proef', stamp)));
  const droog = !!eigen['alleen-bundel'];
  const goudRoot = eigen.goud || eigen['goud-bewaar'] || eigen['goud-vernieuw'] ? path.resolve(typeof eigen.goud === 'string' ? eigen.goud : '.scr/goud') : null;
  fs.mkdirSync(out, { recursive: true });
  const perMissie = [], alleRuns = [];
  for (const taak of taken) {
    const sams = [];
    for (const uit of uitvoeringen(taak, plan)) {
      const seed = uit.seed, dir = mapVoor(out, taak, seed, uit.variant);
      fs.mkdirSync(dir, { recursive: true });
      if (!droog) {
        console.log(`== ${taak.id} seed ${seed}${uit.variant ? ' ' + uit.variant.naam : ''} -> ${dir}`);
        const r = spawnSync(process.execPath, runArgs(taak, seed, dir, door, uit.extra), { stdio: 'inherit' });
        // 3 = er draait al een Electron, 4 = geen slot: dit is geen bevinding over de missie, de hele proef stopt
        if (r.status === 3 || r.status === 4) { console.error(`run.mjs stopte met ${r.status} (Electron bezet of geen slot): proef afgebroken.`); return r.status; }
        fs.rmSync(path.join(dir, '_page.js'), { force: true });
      }
      // eerst de analyse (leest de ruwe beelden), dan de bundel (hernoemt ze)
      const run = analyseRun(dir, { id: taak.id, seed, naam: uit.variant ? uit.variant.naam : '', args: [...taak.extra, ...uit.extra], goudRoot, goudBewaarOok: !!(eigen['goud-bewaar'] || eigen['goud-vernieuw']), goudVernieuw: !!eigen['goud-vernieuw'], blind: !eigen['geen-blind'] });
      alleRuns.push(run);
      const { sam } = bundelSchrijven(dir, dir, { id: taak.id, seed, bewaarRuw: !!eigen['bewaar-ruw'] });
      sam.map = path.basename(dir);
      sams.push(sam);
    }
    const ratio = faalratio(sams);
    if (sams.length > 1) meerSeeds(out, taak, sams, ratio);
    else { const f = path.join(mapVoor(out, taak, taak.seeds[0], plan ? uitvoeringen(taak, plan)[0].variant : null), 'samenvatting.json'); fs.writeFileSync(f, JSON.stringify({ ...sams[0], faalratio: ratio }, null, 1)); }
    perMissie.push({ missie: taak.id, ratio, samenvattingen: sams });
    console.log(`   ${taak.id}: ${ratio.geslaagd}/${ratio.seeds} geslaagd, cheats ${sams.reduce((a, s) => a + s.cheats, 0)}, vast ${sams.reduce((a, s) => a + s.vastgezet, 0)}`);
  }
  fs.writeFileSync(path.join(out, 'overzicht.md'), bouwOverzichtMd(perMissie));
  fs.writeFileSync(path.join(out, 'samenvatting.json'), JSON.stringify(perMissie.map((m) => ({ missie: m.missie, faalratio: m.ratio, seeds: m.samenvattingen })), null, 1));
  const clusters = analyseSamen(alleRuns, out, { plan: plan || [] });
  console.log(`bevindingen: ${clusters.length} cluster(s) (P1 ${clusters.filter((c) => c.prioriteit === 'P1').length}); zie ${path.join(out, 'issues.md')}`);
  console.log(`bundel: ${out}`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(await main(process.argv.slice(2)));
