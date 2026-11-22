// Leest het JSON-resultaat van de hertest-pagina (scripts/hertest_pack.mjs) en werkt de issues bij met gh.
//   node scripts/hertest_sluit.mjs --bestand=<resultaat.json>           dry-run (standaard): toont wat er zou gebeuren
//   node scripts/hertest_sluit.mjs --bestand=<resultaat.json> --apply   sluit de Opgelost-issues en plaatst de comments
//   node scripts/hertest_sluit.mjs --stdin                              leest het JSON van de standaardinvoer
// Opgelost: comment met de opmerking, label hertest en wacht-beeld eraf, issue dicht (alleen als het nog open is).
// Nog niet: comment met de opmerking; het issue blijft open en houdt zijn labels. Nieuw punt: comment bij het issue en een regel in
// de uitvoer voor de coordinator (er worden hier geen nieuwe issues gemaakt). Een resultaat met een ongeldig nummer of uitkomst stopt alles.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const OUTCOMES = ['fixed', 'not-yet', 'new-point'];

// Valideert { version: 1, run, date, results: [{ issue, outcome, note }] }; geeft { ok, errors, results }.
export function validateResult(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || data.version !== 1) errors.push('version moet 1 zijn');
  const lijst = data && Array.isArray(data.results) ? data.results : null;
  if (!lijst) errors.push('results ontbreekt of is geen lijst');
  const seen = new Set(); const results = [];
  for (const [i, r] of (lijst || []).entries()) {
    const nr = r && r.issue;
    if (!Number.isInteger(nr) || nr < 1) { errors.push(`resultaat ${i + 1}: issue is geen geheel nummer`); continue; }
    if (!OUTCOMES.includes(r.outcome)) { errors.push(`#${nr}: onbekende uitkomst "${r.outcome}"`); continue; }
    if (seen.has(nr)) { errors.push(`#${nr}: komt twee keer voor`); continue; }
    if ((r.outcome === 'not-yet' || r.outcome === 'new-point') && !String(r.note || '').trim()) { errors.push(`#${nr}: ${r.outcome} vraagt een opmerking`); continue; }
    seen.add(nr); results.push({ issue: nr, outcome: r.outcome, note: String(r.note || '').trim() });
  }
  return { ok: errors.length === 0, errors, results };
}

// De gh-opdrachten per resultaat (zonder iets uit te voeren). Bij Opgelost: eerst de comment, dan de labels, dan sluiten.
export function planCommands(results, { datum = '22-11' } = {}) {
  const cmds = [];
  for (const r of results) {
    const n = String(r.issue); const opm = r.note ? ` Opmerking: ${r.note}` : '';
    if (r.outcome === 'fixed') {
      cmds.push({ issue: r.issue, args: ['issue', 'comment', n, '--body', `Hertest ${datum}: opgelost bevestigd (hertest-pagina, beeld of spel).${opm}`] });
      cmds.push({ issue: r.issue, args: ['issue', 'edit', n, '--remove-label', 'hertest,wacht-beeld'], optional: true });
      cmds.push({ issue: r.issue, args: ['issue', 'close', n, '--reason', 'completed'], sluit: true });
    } else if (r.outcome === 'not-yet') {
      cmds.push({ issue: r.issue, args: ['issue', 'comment', n, '--body', `Hertest ${datum}: nog niet opgelost.${opm}`] });
    } else {
      cmds.push({ issue: r.issue, args: ['issue', 'comment', n, '--body', `Hertest ${datum}: nieuw punt gezien bij deze controle.${opm}`], nieuwPunt: true });
    }
  }
  return cmds;
}

function gh(args, ghPad) { return spawnSync(ghPad, args, { encoding: 'utf8' }); }

function main() {
  const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
  const apply = process.argv.includes('--apply');
  const ghPad = arg('gh', process.platform === 'win32' ? 'C:\\Program Files\\GitHub CLI\\gh.exe' : 'gh');
  const datum = arg('datum', new Date().toISOString().slice(5, 10).split('-').reverse().join('-'));
  let tekst;
  if (process.argv.includes('--stdin')) tekst = fs.readFileSync(0, 'utf8');
  else if (arg('bestand', '')) tekst = fs.readFileSync(path.resolve(arg('bestand', '')), 'utf8');
  else { console.error('Geef --bestand=<resultaat.json> of --stdin mee.'); process.exit(2); }
  let data;
  try { data = JSON.parse(tekst); } catch (e) { console.error('Geen geldig JSON: ' + e.message); process.exit(2); }
  const v = validateResult(data);
  if (!v.ok) { for (const e of v.errors) console.error('FOUT: ' + e); process.exit(2); }
  const cmds = planCommands(v.results, { datum });
  const telling = (o) => v.results.filter((r) => r.outcome === o).length;
  console.log(`${v.results.length} resultaten: ${telling('fixed')} opgelost, ${telling('not-yet')} nog niet, ${telling('new-point')} nieuw punt. ${apply ? 'Dit is een echte run (--apply).' : 'Dry-run: er wordt niets gewijzigd (voeg --apply toe).'}`);
  const gesloten = new Set(); const gecheckt = new Set();
  for (const c of cmds) {
    const regel = `gh ${c.args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`;
    if (!apply) { console.log('  [dry-run] ' + regel); continue; }
    if (!gecheckt.has(c.issue)) {
      gecheckt.add(c.issue);
      const st = gh(['issue', 'view', String(c.issue), '--json', 'state', '--jq', '.state'], ghPad);
      if (st.status === 0 && /CLOSED/.test(st.stdout)) { console.log(`  #${c.issue} is al dicht: overgeslagen`); gesloten.add(c.issue); }
    }
    if (gesloten.has(c.issue)) continue;
    const r = gh(c.args, ghPad);
    if (r.status !== 0 && !c.optional) { console.error(`  MISLUKT (${r.status}): ${regel}\n${r.stderr}`); process.exit(1); }
    console.log(`  ${r.status === 0 ? 'ok' : 'niet gelukt (genegeerd)'}: ${regel}`);
  }
  for (const r of v.results.filter((x) => x.outcome === 'new-point')) console.log(`NIEUW PUNT voor de coordinator (#${r.issue}): ${r.note}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
