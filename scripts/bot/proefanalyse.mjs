// De analysestap van de proefspeler: per run de detectoren, de voortgang, het goud en het blinde bundel, en over alle runs de triage.
// proef.mjs roept dit aan VOOR bundelSchrijven (dat hernoemt de ruwe shots-*.png naar genummerde beelden); de uitkomst staat in
// <run>/analyse.json zodat --alleen-bundel (geen Electron, geen ruwe beelden meer) ze kan hergebruiken.
//   analyseRun(dir, opts)      { run, uitvoer } voor een run-map
//   analyseSamen(runs, out)    schrijft bevindingen.json, issues.md, balans.md, matrix.md en tegenlezer-brief.md
import fs from 'node:fs';
import path from 'node:path';
import { parseEvents, samenvatMissie } from './proefbundel.mjs';
import { voortgangAnalyse, balansOverzicht, faalHeatmap, heatmapAscii } from './voortgang.mjs';
import { bevindingenVoorRun, triage, bevindingenJson, issuesMd } from './triage.mjs';
import { goudBewaar } from './goud.mjs';
import { blindBundelSchrijven, tegenlezerBrief } from './blind.mjs';

const heeftRuw = (dir) => fs.existsSync(dir) && fs.readdirSync(dir).some((f) => /^shots-.+\.png$/.test(f));

export function analyseRun(dir, { id = '', seed = null, naam = '', args = [], goudRoot = null, goudBewaarOok = false, goudVernieuw = false, blind = true, verwachtS = null } = {}) {
  const evPad = path.join(dir, 'events.jsonl');
  const events = fs.existsSync(evPad) ? parseEvents(fs.readFileSync(evPad, 'utf8')) : [];
  const sam = samenvatMissie(events, { id, seed });
  const analyse = voortgangAnalyse(events, { id, verwachtS });
  analyse.mislukkingen.forEach((f) => { f.seed = seed; });
  const cache = path.join(dir, 'analyse.json');
  const run = { missie: id, seed, naam, dir, events, sam, analyse, args, replay: fs.existsSync(path.join(dir, 'replay.jsonl')) };
  if (!heeftRuw(dir) && fs.existsSync(cache)) {
    // geen ruwe beelden meer: de beeldkant komt uit de vorige analyse
    const oud = JSON.parse(fs.readFileSync(cache, 'utf8'));
    run.bevindingen = [...bevindingenVoorRun({ ...run, dir: null }), ...(oud.beeldBevindingen || [])].map((b, i) => ({ ...b, _i: i }));
    run.beeldBevindingen = oud.beeldBevindingen || [];
    return run;
  }
  const alles = bevindingenVoorRun(run, { goudRoot });
  run.bevindingen = alles;
  run.beeldBevindingen = alles.filter((b) => b.soort === 'beeld' || b.soort === 'goud');
  if (goudRoot && goudBewaarOok) goudBewaar(dir, events, goudRoot, { missie: id, vernieuw: goudVernieuw });
  if (blind) { try { blindBundelSchrijven(dir, dir); } catch (e) { run.blindFout = String(e && e.message || e); } }
  fs.writeFileSync(cache, JSON.stringify({ missie: id, seed, naam, beeldBevindingen: run.beeldBevindingen, analyse }, null, 1));
  return run;
}

// Het matrixplan als leesbare lijst: wat is gedraaid en wat is alleen in het echte spel te beoordelen
export function matrixMd(plan) {
  if (!plan.length) return '';
  const k = ['# Variatiematrix', '', '| missie | run | perturbaties | alleen in het echte spel te beoordelen |', '| --- | --- | --- | --- |'];
  for (const r of plan) k.push(`| ${r.missie} | ${r.naam} | ${Object.entries(r.perturbaties).map(([a, v]) => `${a}=${v}`).join(', ')} | ${r.echt.map((e) => `${e.as}=${e.waarde}: ${e.reden}`).join('; ') || '-'} |`);
  return k.join('\n') + '\n';
}

export function balansMd(runs) {
  const an = runs.map((r) => r.analyse).filter(Boolean);
  const b = balansOverzicht(an);
  const k = ['# Voortgang en balans', '', '| missie | runs | duur mediaan | min | max | verwacht | verhouding | geld (mediaan) | dode tijd (mediaan) | pogingen max |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
  for (const x of b) k.push(`| ${x.missie} | ${x.seeds} | ${x.duurMediaanS} s | ${x.duurMinS} | ${x.duurMaxS} | ${x.verwachtS ?? '?'} | ${x.verhouding ?? '?'} | ${x.geldDeltaMediaan ?? '?'} | ${x.dodeTijdMediaanS ?? '?'} s | ${x.pogingenMax} |`);
  const heat = faalHeatmap(runs.filter((r) => r.analyse).map((r) => ({ missie: r.missie, seed: r.seed, mislukkingen: r.analyse.mislukkingen })));
  k.push('', '## Waar missies mislukken (cellen van 50 m)', '');
  if (!heat.length) k.push('Geen mislukkingen met een plek.');
  for (const c of heat.slice(0, 15)) k.push(`- ${c.missie} bij (${Math.round(c.x)}, ${Math.round(c.y)}): ${c.n}x, seeds ${c.seeds.join(', ')}; vaakste oorzaak: ${c.oorzaak}`);
  for (const m of [...new Set(heat.map((c) => c.missie))]) k.push('', `Kaart ${m} (cijfer = aantal mislukkingen per cel):`, '', '```', heatmapAscii(heat.filter((c) => c.missie === m)), '```');
  k.push('', '## Dode tijd en stilstand', '');
  for (const r of runs) for (const d of (r.analyse ? r.analyse.dodeTijd : [])) k.push(`- ${r.missie} seed ${r.seed}${r.naam ? ' (' + r.naam + ')' : ''}: ${d.duurS} s zonder voortgang vanaf t=${d.vanT} (${d.redenen.join(', ')})${d.plek ? ` bij (${Math.round(d.plek[0])}, ${Math.round(d.plek[1])})` : ''}`);
  return k.join('\n') + '\n';
}

export function analyseSamen(runs, out, { plan = [], extraBevindingen = [] } = {}) {
  const clusters = triage(runs);
  fs.writeFileSync(path.join(out, 'bevindingen.json'), JSON.stringify(bevindingenJson(runs, clusters), null, 1));
  fs.writeFileSync(path.join(out, 'issues.md'), issuesMd(clusters));
  fs.writeFileSync(path.join(out, 'balans.md'), balansMd(runs));
  fs.writeFileSync(path.join(out, 'tegenlezer-brief.md'), tegenlezerBrief(clusters));
  if (plan.length) fs.writeFileSync(path.join(out, 'matrix.md'), matrixMd(plan));
  return clusters;
}
