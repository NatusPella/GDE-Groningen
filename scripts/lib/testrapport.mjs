// Pure logica van scripts/test_all.mjs (#186, #5, #4): itemmodel, vingerafdrukken, vergelijking met de
// vorige run, logscans, Nederlandse samenvatting, Markdown en issue-concepten. Geen bestanden, geen
// processen: alles is testbaar met scripts/test_all_test.mjs.
//
// Item: { id, fase, naam, status, secs, detail, warn?, extra? }
//   status: PASS | FAIL | TIMEOUT | SKIP (niet gedraaid, met reden in detail)
export const FASEN = ['licht', 'zwaar', 'electron'];
export const FASE_NAAM = { licht: 'Licht (modules, audits, tests)', zwaar: 'Zwaar (wereldchecks)', electron: 'Electron (smoke, verhaal, bot, beelden)' };
export const MENS_ZIN = 'Niemand heeft dit rapport of deze beelden met eigen ogen bekeken: een geslaagde beeldcheck zegt alleen dat een beeld niet zwart, leeg of ongeldig is en niet sterk afwijkt van de vorige run, niet dat het er goed uitziet.';

import { OORZAKEN } from './testoorzaken.mjs';

export const isFout = (s) => s === 'FAIL' || s === 'TIMEOUT';

// Maakt een foutregel vergelijkbaar tussen runs: tijden, getallen, tijdelijke mappen en hex-ids eruit.
export function normalizeFoutregel(s) {
  return (String(s || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0] || '')
    .replace(/[A-Za-z]:[\\/][^\s'")]+/g, '<pad>')
    .replace(/(?:\/[\w.-]+){3,}/g, '<pad>')
    .replace(/\b[0-9a-f]{8,}\b/gi, '<id>')
    .replace(/\d+(?:[.,]\d+)?/g, '#')
    .replace(/\s+/g, ' ')
    .slice(0, 160);
}

// De regel die het best zegt waarom iets faalde (eerste regel met FAIL/Error/fout, anders de laatste).
export function eersteFout(out) {
  const lines = String(out || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.find((l) => /\b(FAIL|Error|TypeError|ReferenceError|SyntaxError|AssertionError|fout|mislukt)\b/i.test(l)) || lines[lines.length - 1] || '';
}

export function fingerprint(item) {
  const basis = `${item.id}|${isFout(item.status) ? normalizeFoutregel(item.detail) : ''}`;
  let h = 5381;
  for (let i = 0; i < basis.length; i++) h = ((h * 33) ^ basis.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

export function maakItem(fase, id, naam, status, secs, detail, extra = {}) {
  return { id, fase, naam, status, secs: Math.round((secs || 0) * 10) / 10, detail: String(detail || '').slice(0, 1500), ...extra };
}

// Vergelijkt twee itemlijsten (zelfde fase). -> { nieuweFouten, opgelost, blijftFout, traag, nieuw, verdwenen }
export function diffRuns(prevItems, curItems, { traagFactor = 1.5, traagMinSecs = 5 } = {}) {
  const prev = new Map((prevItems || []).map((i) => [i.id, i]));
  const cur = new Map(curItems.map((i) => [i.id, i]));
  const out = { nieuweFouten: [], opgelost: [], blijftFout: [], traag: [], nieuw: [], verdwenen: [] };
  const haveAny = prev.size > 0;
  for (const i of curItems) {
    const p = prev.get(i.id);
    if (!p) { if (haveAny) out.nieuw.push(i.id); if (isFout(i.status)) out.nieuweFouten.push(i.id); continue; }
    if (isFout(i.status)) {
      if (isFout(p.status) && fingerprint(p) === fingerprint(i)) out.blijftFout.push(i.id);
      else out.nieuweFouten.push(i.id);
    } else if (isFout(p.status) && i.status === 'PASS') out.opgelost.push(i.id);
    if (i.status === 'PASS' && p.status === 'PASS' && i.secs >= traagMinSecs && p.secs > 0 && i.secs >= p.secs * traagFactor) out.traag.push({ id: i.id, was: p.secs, nu: i.secs });
  }
  for (const id of prev.keys()) if (!cur.has(id)) out.verdwenen.push(id);
  return out;
}

export function telStatus(items) {
  const t = { PASS: 0, FAIL: 0, TIMEOUT: 0, SKIP: 0 };
  for (const i of items) t[i.status] = (t[i.status] || 0) + 1;
  return t;
}

// ---------------------------------------------------------------- logscans

// Zoekt in de uitvoer van een Electron-run naar de fouten die we willen zien. -> [{ soort, regel }]
export function scanLog(text) {
  const found = [];
  const seen = new Set();
  for (const raw of String(text || '').split(/\r?\n/)) {
    const l = raw.trim();
    if (!l) continue;
    let soort = null;
    if (/Cannot access '[^']+' before initialization/.test(l)) soort = 'tdz';
    else if (/does not provide an export named|Failed to resolve module|Cannot find module|ERR_MODULE_NOT_FOUND|Unexpected token 'export'|Cannot use import statement/.test(l)) soort = 'import';
    else if (/computeBoundingSphere/.test(l)) soort = 'nan';
    else if (/^\[(renderer|load failed|smoke error)\]/.test(l)) soort = 'renderer';
    else if (/Uncaught|UnhandledPromiseRejection|Unhandled promise rejection/.test(l)) soort = 'uitzondering';
    if (!soort) continue;
    const sleutel = soort + '|' + normalizeFoutregel(l);
    if (seen.has(sleutel)) continue;
    seen.add(sleutel);
    found.push({ soort, regel: l.slice(0, 300) });
  }
  return found;
}

// '[story-test] PASS: 120 steps, 0 failed checks, report in <dir>' en de FAIL-regels.
export function parseStoryLog(text) {
  const lines = String(text || '').split(/\r?\n/);
  const kop = lines.map((l) => /\[story-test\] (PASS|FAIL):? (\d+) steps, (\d+) failed checks/.exec(l)).find(Boolean);
  const fails = lines.filter((l) => /^\[story-test\] (FAIL|error) /.test(l)).map((l) => l.replace(/^\[story-test\] /, '').slice(0, 300));
  const nan = lines.map((l) => /\[story-test\] FAIL (\d+) NaN geometry warnings/.exec(l)).find(Boolean);
  const timeout = lines.some((l) => /\[story-test\] timeout/.test(l));
  return { gehaald: !!kop, result: kop ? kop[1] : null, steps: kop ? Number(kop[2]) : 0, failedChecks: kop ? Number(kop[3]) : 0, nanWaarschuwingen: nan ? Number(nan[1]) : 0, timeout, fails };
}

// Frametijd uit de JSON van '[perf] {...}' of '[perf-script] {...}': zoekt fps/p50 (ms) in het object.
export function parseFrameStats(text) {
  let best = null;
  for (const l of String(text || '').split(/\r?\n/)) {
    const m = /^\[perf(?:-script)?\]\s*(\{.*\})\s*$/.exec(l.trim());
    if (!m) continue;
    let obj;
    try { obj = JSON.parse(m[1]); } catch { continue; }
    const hit = (function walk(o, depth) {
      if (!o || typeof o !== 'object' || depth > 4) return null;
      if (typeof o.fps === 'number') return { fps: o.fps, p50: typeof o.p50 === 'number' ? o.p50 : null, p95: typeof o.p95 === 'number' ? o.p95 : null };
      for (const v of Object.values(o)) { const r = walk(v, depth + 1); if (r) return r; }
      return null;
    })(obj, 0);
    if (hit) best = hit;
  }
  return best;
}

// Beoordeelt frametijd: FAIL alleen bij echt stilstaand beeld, 'warn' als het veel trager is dan vorige keer.
export function beoordeelFrames(stats, prevStats, { minFps = 3, traagFactor = 1.5 } = {}) {
  if (!stats) return { status: 'SKIP', detail: 'geen frametijd in de uitvoer gevonden', warn: false };
  const tekst = `${stats.fps} fps${stats.p50 != null ? `, p50 ${stats.p50} ms` : ''}`;
  if (stats.fps < minFps) return { status: 'FAIL', detail: `beeld staat bijna stil: ${tekst}`, warn: false };
  const warn = !!(prevStats && prevStats.fps > 0 && stats.fps * traagFactor <= prevStats.fps);
  return { status: 'PASS', detail: tekst + (warn ? ` (vorige run ${prevStats.fps} fps)` : ''), warn };
}

// Poort zwarte wereld / consolefouten per frame: de JSON van scripts/perf/wereldpoort.js ('[perf-script] {...}').
export function parseWereldpoort(text) {
  for (const l of String(text || '').split(/\r?\n/)) {
    const m = /^\[perf-script\]\s*(\{.*\})\s*$/.exec(l.trim());
    if (!m) continue;
    try { const o = JSON.parse(m[1]); if (o && typeof o.meshes === 'number') return o; } catch { /* volgende regel */ }
  }
  return null;
}

// -> { status, detail }: FAIL bij geen spel, geen scène, een bijna lege of niet getekende wereld, NaN-meshes of een
// fout in meer dan een paar frames (een fout per frame is een gebroken build, geen vondst).
export function beoordeelWereldpoort(rep, { minMeshes = 300, maxFramesMetFout = 3 } = {}) {
  if (!rep) return { status: 'FAIL', detail: 'geen uitslag van het poortscript in de uitvoer' };
  const f = [];
  if (!rep.gestart) f.push('het spel startte niet');
  if (!rep.scene) f.push('geen scène');
  if (rep.meshes < minMeshes) f.push(`bijna lege wereld (${rep.meshes} zichtbare meshes, minimaal ${minMeshes})`);
  if (rep.tris === 0 || rep.calls === 0) f.push(`er wordt niets getekend (${rep.tris} driehoeken, ${rep.calls} drawcalls)`);
  if (rep.nan > 0) f.push(`NaN-geometrie in ${rep.nan} meshes`);
  if (rep.framesMetFout > maxFramesMetFout) f.push(`fouten in ${rep.framesMetFout} van ${rep.frames} frames (${rep.foutenTotaal} in totaal): ${(rep.voorbeeld || []).join(' | ').slice(0, 300)}`);
  if (f.length) return { status: 'FAIL', detail: f.join('; ') };
  return { status: 'PASS', detail: `${rep.meshes} zichtbare meshes (de laatste renderpas telt ${rep.tris} driehoek en ${rep.calls} aanroep: de nabewerking), fouten in ${rep.framesMetFout} van ${rep.frames} frames` };
}

// ---------------------------------------------------------------- beelden

// Combineert de analyse van één beeld met de vorige handtekening. -> { status, detail, warn, diff }
export function beoordeelBeeld(analyse, diff, { diffDrempel = 0.08 } = {}) {
  if (analyse.verdict !== 'ok') return { status: 'FAIL', detail: `${analyse.verdict} beeld (zwart ${(analyse.black * 100).toFixed(0)}%, doorzichtig ${(analyse.transparent * 100).toFixed(0)}%, magenta ${(analyse.magenta * 100).toFixed(0)}%, spreiding ${analyse.std.toFixed(1)})`, warn: false, diff };
  if (diff != null && diff > diffDrempel) return { status: 'PASS', detail: `${(diff * 100).toFixed(1)}% anders dan vorige run`, warn: true, diff };
  return { status: 'PASS', detail: diff == null ? 'geen vorige run om mee te vergelijken' : `${(diff * 100).toFixed(1)}% verschil`, warn: false, diff };
}

// ---------------------------------------------------------------- samenvatting en Markdown

const sec = (s) => (s >= 90 ? `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, '0')}s` : `${s.toFixed(1)}s`);

// report: { stamp, duurSecs, fases: { licht: { gedraaid, items, secs, diff? }, ... } }
export function samenvatting(report) {
  const regels = [];
  const alle = [];
  const niet = [];
  const toon = report.toon || FASEN;
  for (const f of toon) {
    const p = report.fases[f];
    if (!p || !p.gedraaid) { niet.push(f); continue; }
    alle.push(...p.items);
  }
  const t = telStatus(alle);
  const nieuwe = toon.flatMap((f) => (report.fases[f] && report.fases[f].diff ? report.fases[f].diff.nieuweFouten : []));
  const opgelost = toon.flatMap((f) => (report.fases[f] && report.fases[f].diff ? report.fases[f].diff.opgelost : []));
  if (!alle.length) { regels.push('Er is niets gedraaid.'); }
  else {
    const kop = t.FAIL + t.TIMEOUT === 0 && t.PASS === 0 ? 'Niets is echt gedraaid' : t.FAIL + t.TIMEOUT === 0 ? 'Alles dat gedraaid is, is geslaagd' : `${t.FAIL + t.TIMEOUT} item${t.FAIL + t.TIMEOUT === 1 ? '' : 's'} mislukt`;
    regels.push(`${kop}: ${t.PASS} geslaagd, ${t.FAIL} mislukt, ${t.TIMEOUT} over de tijdslimiet, ${t.SKIP} niet gedraaid.`);
    if (nieuwe.length) regels.push(`Nieuw sinds de vorige run: ${nieuwe.length} (${nieuwe.slice(0, 8).join(', ')}${nieuwe.length > 8 ? ', ...' : ''}).`);
    else if (t.FAIL + t.TIMEOUT) regels.push('Geen nieuwe fouten sinds de vorige run; wat mislukt was al bekend.');
    if (opgelost.length) regels.push(`Opgelost sinds de vorige run: ${opgelost.length}.`);
  }
  if (niet.length) regels.push(`Fasen niet gedraaid: ${niet.join(', ')}.`);
  const warns = alle.filter((i) => i.warn).length;
  if (warns) regels.push(`${warns} beeld${warns === 1 ? '' : 'en'} of meting${warns === 1 ? '' : 'en'} wijkt duidelijk af van de vorige run (geen fout, wel kijken).`);
  regels.push(MENS_ZIN);
  return regels;
}

const cel = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

export function renderMarkdown(report) {
  const o = [];
  o.push(`# Testrapport ${report.stamp}`, '');
  o.push('## Samenvatting', '');
  for (const r of samenvatting(report)) o.push('- ' + r);
  o.push('');
  const faseVoorId = new Map();
  for (const f of report.toon || FASEN) {
    const p = report.fases[f];
    if (!p || !p.gedraaid) { o.push(`## ${FASE_NAAM[f]}`, '', '**Niet gedraaid** in deze run.', ''); continue; }
    const d = p.diff || { nieuweFouten: [], opgelost: [], blijftFout: [], traag: [], nieuw: [], verdwenen: [] };
    const t = telStatus(p.items);
    for (const i of p.items) faseVoorId.set(i.id, f);
    o.push(`## ${FASE_NAAM[f]}`, '');
    o.push(`Duur ${sec(p.secs || 0)}. ${t.PASS} geslaagd, ${t.FAIL} mislukt, ${t.TIMEOUT} timeout, ${t.SKIP} niet gedraaid.${p.vorige ? ` Vergeleken met de run van ${p.vorige}.` : ' Geen vorige run om mee te vergelijken.'}`, '');
    if (d.nieuweFouten.length) o.push('**Nieuwe fouten:** ' + d.nieuweFouten.map((x) => '`' + x + '`').join(', '), '');
    if (d.opgelost.length) o.push('**Opgelost:** ' + d.opgelost.map((x) => '`' + x + '`').join(', '), '');
    if (d.blijftFout.length) o.push('**Bleef fout:** ' + d.blijftFout.map((x) => '`' + x + '`').join(', '), '');
    if (d.traag.length) o.push('**Trager dan vorige run:** ' + d.traag.map((x) => `\`${x.id}\` ${x.was}s → ${x.nu}s`).join(', '), '');
    if (d.verdwenen.length) o.push('**Niet meer in de run:** ' + d.verdwenen.map((x) => '`' + x + '`').join(', '), '');
    const slecht = p.items.filter((i) => isFout(i.status));
    if (slecht.length) {
      o.push('### Mislukt', '', '| Item | Status | Duur | Wat |', '|---|---|---|---|');
      for (const i of slecht) o.push(`| ${cel(i.id)} | ${i.status}${d.nieuweFouten.includes(i.id) ? ' (nieuw)' : ''} | ${sec(i.secs)} | ${cel(i.detail).slice(0, 220)} |`);
      o.push('');
      o.push('Oorzaak per mislukt item (register in scripts/lib/testoorzaken.mjs):', '');
      for (const i of slecht) o.push(`- \`${i.id}\`: ${OORZAKEN[i.id] ? `${OORZAKEN[i.id].soort}, ${OORZAKEN[i.id].tekst}` : 'oorzaak nog niet onderzocht'}`);
      o.push('');
    }
    const bekend = p.items.filter((i) => OORZAKEN[i.id] && !isFout(i.status));
    if (bekend.length) {
      o.push('### Eerder instabiel of onterecht mislukt (nu niet)', '');
      for (const i of bekend) o.push(`- \`${i.id}\` (${i.status}): ${OORZAKEN[i.id].soort}, ${OORZAKEN[i.id].tekst}`);
      o.push('');
    }
    const overgeslagen = p.items.filter((i) => i.status === 'SKIP');
    if (overgeslagen.length) {
      o.push('### Niet gedraaid', '');
      for (const i of overgeslagen) o.push(`- \`${i.id}\`: ${cel(i.detail) || 'reden onbekend'}`);
      o.push('');
    }
    const warn = p.items.filter((i) => i.warn);
    if (warn.length) {
      o.push('### Let op (wijkt af, geen fout)', '');
      for (const i of warn) o.push(`- \`${i.id}\`: ${cel(i.detail)}`);
      o.push('');
    }
    o.push('<details><summary>Alle items</summary>', '', '| Item | Status | Duur | Opmerking |', '|---|---|---|---|');
    for (const i of p.items) o.push(`| ${cel(i.id)} | ${i.status} | ${sec(i.secs)} | ${cel(i.detail).slice(0, 120)} |`);
    o.push('', '</details>', '');
  }
  o.push('## Wat niemand heeft gezien', '', MENS_ZIN, '');
  return o.join('\n');
}

// ---------------------------------------------------------------- issues

// Concepten voor nieuwe fouten die nog niet eerder als issue zijn aangemaakt. known = { [fp]: issuenummer }.
export function issueConcepten(report, known = {}) {
  const out = [];
  for (const f of FASEN) {
    const p = report.fases[f];
    if (!p || !p.gedraaid) continue;
    const nieuw = new Set(p.diff ? p.diff.nieuweFouten : p.items.filter((i) => isFout(i.status)).map((i) => i.id));
    for (const i of p.items) {
      // een timeout is meestal belasting van de machine, geen bevinding: geen issue-concept
      if (i.status !== 'FAIL' || !nieuw.has(i.id)) continue;
      const fp = fingerprint(i);
      if (known[fp]) continue;
      const kort = normalizeFoutregel(i.detail) || i.status;
      out.push({
        fp,
        titel: `[testrun] ${i.naam || i.id}: ${kort.slice(0, 70)}`,
        labels: ['bug'],
        body: [
          `De geautomatiseerde testrun (\`node scripts/test_all.mjs\`, fase ${f}, ${report.stamp}) vond een nieuwe fout.`, '',
          `- Item: \`${i.id}\``, `- Status: ${i.status} na ${sec(i.secs)}`, `- Wat: ${i.detail.split(/\r?\n/)[0].slice(0, 300)}`, '',
          '```', i.detail.slice(0, 1200), '```', '',
          'Nog niet door een mens bekeken; reproduceer eerst met het genoemde script.', '',
          `testall-afdruk: ${fp}`, `<!-- testall:${fp} -->`,
        ].join('\n'),
      });
    }
  }
  return out;
}

// Voegt de nieuwe run van een fase samen met de bewaarde staat (laatste run per fase).
export function werkStaatBij(staat, fase, stamp, items, extra = {}) {
  const s = staat && typeof staat === 'object' ? staat : {};
  return { ...s, fases: { ...(s.fases || {}), [fase]: { stamp, items, ...extra } } };
}
