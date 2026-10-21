// Het cijferblad van het project: harde cijfers uit de repo, de GitHub-issues en de gebouwde wereld, elk met zijn bron.
//
//   node scripts/stats/schaal.mjs [--json=<pad>] [--md=<pad>] [--overlays=<pad>] [--stil]
//        [--geen-gh] [--geen-wereld] [--wereld=<map met index-provincie.json>] [--rapport=<map met rapport.json>]
//
// Zonder opties staat de samenvatting op stdout. Niets wordt geschat: wat niet te meten is (geen gh, geen gebouwde
// wereld, geen testrapport) staat als "niet gemeten" in het resultaat. Een cijfer dat een benadering is, zegt dat in `let_op`.
// Auteursnamen worden niet bewaard: alleen aantallen. Het schatten van "traditioneel versus met AI" staat in
// docs/showcase/SCHATTING.md, niet hier.
//
// Bronnen: git (log, ls-files, worktree), `gh` (issues, releases), game/world/index-provincie.json en de tegels (.gdp),
// de registers in game/js (voertuigen, dieren, bijbanen, verhaal, activiteiten) en het laatste rapport van test_all.mjs.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const opt = (n, d) => { const a = argv.find((v) => v.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const STIL = flag('stil');
const info = (...a) => { if (!STIL) console.error(...a); };

// ---------------------------------------------------------------- hulpjes

const cijfers = {};   // id -> { groep, label, waarde, eenheid, bron, let_op? }
const tijdlijnen = {};
const niet_gemeten = [];
const groepVolgorde = [];

function feit(groep, id, label, waarde, eenheid, bron, let_op) {
  if (!groepVolgorde.includes(groep)) groepVolgorde.push(groep);
  const c = { groep, label, waarde, eenheid, bron };
  if (let_op) c.let_op = let_op;
  cijfers[groep + '.' + id] = c;
}
function mis(wat, reden) { niet_gemeten.push({ wat, reden }); info('niet gemeten:', wat, '-', reden); }

function run(cmd, args, o = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 29, windowsHide: true, ...o });
  if (r.error || r.status !== 0) return null;
  return r.stdout;
}
const git = (...a) => run('git', a);
const nl = (n) => new Intl.NumberFormat('nl-NL').format(n);
const rond = (n, d = 0) => { const f = 10 ** d; return Math.round(n * f) / f; };
const dag = (iso) => iso.slice(0, 10);

const GH_CANDIDATES = [process.env.GH_EXE, 'gh', 'C:/Program Files/GitHub CLI/gh.exe'].filter(Boolean);
function gh(args) {
  for (const exe of GH_CANDIDATES) {
    const r = spawnSync(exe, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 29, windowsHide: true });
    if (!r.error && r.status === 0) return r.stdout;
  }
  return null;
}

// ---------------------------------------------------------------- 1. git: tijdlijn en sessies

function metGit() {
  if (!git('rev-parse', 'HEAD')) { mis('git', 'geen git-repo'); return; }
  const head = git('rev-parse', '--short', 'HEAD').trim();
  const tak = git('rev-parse', '--abbrev-ref', 'HEAD').trim();
  const cmd = 'git log (--format=%cI)';
  const log = git('log', '--format=%H|%cI|%an|%P').trim().split('\n').map((l) => { const [h, d, a, p] = l.split('|'); return { h, d, a, ouders: p ? p.split(' ').length : 0 }; });
  const perDag = {};
  for (const c of log) perDag[dag(c.d)] = (perDag[dag(c.d)] || 0) + 1;
  const dagen = Object.keys(perDag).sort();
  const eerste = log[log.length - 1].d, laatste = log[0].d;
  const spanDagen = Math.round((new Date(dag(laatste)) - new Date(dag(eerste))) / 864e5) + 1;
  const piek = dagen.reduce((a, d) => (perDag[d] > perDag[a] ? d : a), dagen[0]);
  tijdlijnen.commitsPerDag = dagen.map((d) => ({ dag: d, commits: perDag[d] }));
  feit('git', 'commits', 'Commits', log.length, 'commits', 'git rev-list --count HEAD');
  feit('git', 'eerste', 'Eerste commit', dag(eerste), 'datum', cmd);
  feit('git', 'laatste', 'Laatste commit (op deze checkout)', dag(laatste), 'datum', cmd);
  feit('git', 'kalenderdagen', 'Kalenderdagen van eerste tot laatste commit', spanDagen, 'dagen', cmd);
  feit('git', 'actieve_dagen', 'Dagen met minstens één commit', dagen.length, 'dagen', cmd);
  feit('git', 'commits_per_actieve_dag', 'Gemiddeld aantal commits per actieve dag', rond(log.length / dagen.length, 1), 'commits', 'commits / actieve dagen');
  feit('git', 'piekdag', `Drukste dag (${piek})`, perDag[piek], 'commits', cmd);
  const uren = {}; for (const c of log) { const u = c.d.slice(11, 13); uren[u] = (uren[u] || 0) + 1; }
  const nacht = log.filter((c) => { const u = Number(c.d.slice(11, 13)); return u < 6; }).length;
  feit('git', 'nachtcommits', 'Commits tussen 00:00 en 06:00 (lokale tijd van de commit)', nacht, 'commits', cmd, 'de tijdstippen zijn de commit-tijden van de auteur; zegt niets over wie er wakker was');
  feit('git', 'merges', 'Merge-commits', log.filter((c) => c.ouders > 1).length, 'commits', 'git log --merges');
  feit('git', 'git_identiteiten', 'Verschillende git-identiteiten als auteur', new Set(log.map((c) => c.a)).size, 'identiteiten', cmd, 'namen worden bewust niet bewaard');

  // medewerkende AI-modellen uit de commit-voetregel
  const body = git('log', '--format=%x01%B') || '';
  const modellen = {}; let metAi = 0;
  for (const m of body.split('\x01')) {
    const hits = [...m.matchAll(/^Co-Authored-By:\s*(Claude[^<\n]*?)\s*</gim)].map((x) => x[1].trim());
    if (hits.length) metAi++;
    for (const h of new Set(hits)) modellen[h] = (modellen[h] || 0) + 1;
  }
  feit('git', 'commits_met_ai_medeauteur', 'Commits met een AI als medeauteur in de voetregel', metAi, 'commits', 'Co-Authored-By: Claude in de commitberichten');
  feit('git', 'ai_modelnamen', 'Verschillende AI-modelnamen in die voetregels', Object.keys(modellen).length, 'modellen', 'idem', `per naam: ${Object.entries(modellen).map(([k, v]) => `${k} ${v}`).join('; ')}`);
  const refs = new Set(); let metIssue = 0;
  for (const m of body.split('\x01')) { const t = [...m.matchAll(/(?:Closes|Refs|Fixes|Closed|Ref)\s+#(\d+)/gi)]; if (t.length) metIssue++; for (const x of t) refs.add(x[1]); for (const x of m.matchAll(/(?:Closes|Refs|Fixes)\s+[^\n]*/gi)) for (const y of x[0].matchAll(/#(\d+)/g)) refs.add(y[1]); }
  feit('git', 'commits_met_issue', 'Commits die een issue noemen (Closes/Refs #n)', metIssue, 'commits', 'regex op de commitberichten');
  feit('git', 'issues_genoemd', 'Verschillende issues genoemd in commitberichten', refs.size, 'issues', 'idem');

  // sessies en agents: een eigen branch per sessie (claude/<naam>) en een werkboom per agent
  const rondes = new Set();
  const tellen = new Set();
  const namen = (git('for-each-ref', '--format=%(refname:short)', 'refs/heads', 'refs/remotes') || '').split('\n').filter(Boolean);
  for (const n of namen) { const k = n.replace(/^origin\//, ''); if (/^(claude|worktree-agent)/.test(k)) tellen.add(k); }
  const mergeKoppen = (git('log', '--merges', '--format=%s') || '').split('\n');
  const gemerged = new Set();
  for (const s of mergeKoppen) { const m = s.match(/^Merge (?:remote-tracking )?branch '([^']+)'/); if (m) { const k = m[1].replace(/^origin\//, ''); if (/^(claude|worktree-agent)/.test(k)) gemerged.add(k); } }
  for (const k of gemerged) tellen.add(k);
  const wt = (git('worktree', 'list', '--porcelain') || '').split('\n').filter((l) => l.startsWith('worktree ')).length;
  feit('sessies', 'branches_sessies', 'Verschillende sessie-branches (claude/… en worktree-agent-…) die ooit bestonden of zijn gemerged', tellen.size, 'branches', 'git for-each-ref + kopteksten van merge-commits', 'ondergrens: een sessie die op een bestaande branch werkte, een opgeruimde en nooit gemergede branch of een oude branchnaam telt niet mee');
  feit('sessies', 'gemerged', 'Daarvan gemerged in de hoofdlijn', gemerged.size, 'branches', 'git log --merges');
  feit('sessies', 'branches_totaal', 'Branches in deze checkout (lokaal en op afstand)', namen.length, 'branches', 'git for-each-ref');
  feit('sessies', 'werkbomen', 'Git-werkbomen (parallelle werkmappen) nu', wt, 'werkbomen', 'git worktree list', 'momentopname; opgeruimde werkbomen zijn weg');
  feit('sessies', 'tags', 'Git-tags (releases)', (git('tag') || '').split('\n').filter(Boolean).length, 'tags', 'git tag');
  void uren; void rondes;
}

// ---------------------------------------------------------------- 2. code per taal

const TAAL = { js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', py: 'Python', html: 'HTML', css: 'CSS', md: 'Markdown', json: 'JSON (data)', sh: 'Shell', bat: 'Batch', ps1: 'PowerShell', java: 'Java', gradle: 'Gradle', xml: 'XML', svg: 'SVG', yml: 'YAML', txt: 'Tekst' };

function metCode() {
  const lijst = (git('ls-files', '-z') || '').split('\0').filter(Boolean);
  if (!lijst.length) return;
  const perTaal = {}; const perMap = {};
  const bij = (o, k, regels, leeg) => { const e = o[k] || (o[k] = { bestanden: 0, regels: 0, nietLeeg: 0 }); e.bestanden++; e.regels += regels; e.nietLeeg += regels - leeg; };
  let jsModules = 0, spelModules = 0, testBestanden = 0, auditBestanden = 0;
  for (const f of lijst) {
    const ext = path.extname(f).slice(1).toLowerCase();
    if (!TAAL[ext]) continue;
    let tekst; try { tekst = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { continue; }
    if (tekst.length > 5e6 && ext === 'json') { bij(perTaal, TAAL[ext], tekst.split('\n').length, 0); continue; }
    const regels = tekst.split('\n'); if (regels[regels.length - 1] === '') regels.pop();
    const leeg = regels.filter((r) => !r.trim()).length;
    bij(perTaal, TAAL[ext], regels.length, leeg);
    if (ext === 'js' || ext === 'mjs' || ext === 'cjs') {
      jsModules++;
      const top = f.startsWith('game/js/') ? 'Spelcode (game/js)' : /^scripts\/(?:[^/]+_test\.mjs|.*\/[^/]+_test\.mjs)$/.test(f) ? 'Testcode (*_test.mjs)' : f.startsWith('scripts/') ? 'Gereedschap en audits (scripts/, rest)' : f.startsWith('desktop/') ? 'Desktop-app (Electron)' : f.startsWith('web/') ? 'Webbouw' : f.startsWith('android/') ? 'Android' : 'Overig JavaScript';
      bij(perMap, top, regels.length, leeg);
      if (f.startsWith('game/js/') && ext === 'js') spelModules++;
      if (/_test\.mjs$/.test(f)) testBestanden++;
      if (/_audit\.mjs$/.test(f) || /\/audits?\//.test(f)) auditBestanden++;
    }
  }
  const sorteer = (o) => Object.entries(o).sort((a, b) => b[1].regels - a[1].regels);
  feit('code', 'bestanden_in_git', 'Bestanden in git', lijst.length, 'bestanden', 'git ls-files');
  feit('code', 'js_bestanden', 'JavaScript-bestanden (.js, .mjs, .cjs)', jsModules, 'bestanden', 'git ls-files');
  feit('code', 'spelmodules', 'JavaScript-modules van het spel zelf (game/js/*.js)', spelModules, 'modules', 'git ls-files game/js');
  const tot = (naam) => (perTaal[naam] || { regels: 0 }).regels;
  const jsTot = tot('JavaScript');
  feit('code', 'js_regels', 'Regels JavaScript (alles)', jsTot, 'regels', 'regels van alle .js/.mjs/.cjs in git (incl. lege regels en commentaar)');
  const code = Object.entries(perTaal).filter(([t]) => !['Markdown', 'JSON (data)', 'Tekst', 'SVG', 'XML', 'YAML'].includes(t)).reduce((s, [, v]) => s + v.regels, 0);
  feit('code', 'regels_code', 'Regels programmacode (JS, Python, HTML, CSS, shell, Java, Gradle)', code, 'regels', 'som van de talen hieronder, zonder Markdown en data');
  feit('code', 'regels_docs', 'Regels documentatie (Markdown)', tot('Markdown'), 'regels', 'git ls-files *.md');
  feit('code', 'regels_data_json', 'Regels JSON-data in git', tot('JSON (data)'), 'regels', 'git ls-files *.json', 'gegenereerde en handgemaakte data; geen programmacode');
  for (const [t, v] of sorteer(perTaal).slice(0, 10)) feit('code_per_taal', t.replace(/\W+/g, '_').toLowerCase(), `${t}: ${v.bestanden} bestanden`, v.regels, 'regels', 'git ls-files + regels tellen', `${v.nietLeeg} niet-lege regels`);
  for (const [t, v] of sorteer(perMap)) feit('code_per_soort', t.replace(/\W+/g, '_').toLowerCase(), `${t}: ${v.bestanden} bestanden`, v.regels, 'regels', 'git ls-files + regels tellen', `${v.nietLeeg} niet-lege regels`);
  feit('tests', 'testscripts', 'Testscripts (scripts/**/*_test.mjs)', testBestanden, 'scripts', 'git ls-files');
  feit('tests', 'auditscripts', 'Audit- en probe-scripts (*_audit.mjs en scripts in een audits-map)', auditBestanden, 'scripts', 'git ls-files');
  return { lijst };
}

// toegevoegd en verwijderd over de hele geschiedenis (alleen programmacode)
function metChurn() {
  const uit = git('log', '--numstat', '--format=%x40');
  if (!uit) return;
  let plus = 0, min = 0, files = 0;
  for (const l of uit.split('\n')) {
    const m = l.match(/^(\d+)\t(\d+)\t(.+)$/); if (!m) continue;
    if (!/\.(js|mjs|cjs|py|html|css|sh|bat|ps1|java|gradle)$/i.test(m[3])) continue;
    plus += Number(m[1]); min += Number(m[2]); files++;
  }
  feit('git', 'regels_toegevoegd', 'Regels programmacode ooit toegevoegd (over alle commits)', plus, 'regels', 'git log --numstat, alleen code-extensies', 'bruto: een regel die vaak is herschreven telt elke keer mee');
  feit('git', 'regels_verwijderd', 'Regels programmacode ooit verwijderd', min, 'regels', 'idem', 'zie hierboven');
  feit('git', 'bestandswijzigingen', 'Bestandswijzigingen in programmacode (som over commits)', files, 'wijzigingen', 'idem');
}

// ---------------------------------------------------------------- 3. tests

function metTests(lijst) {
  const files = (lijst || []).filter((f) => /_test\.mjs$/.test(f));
  let asserts = 0;
  for (const f of files) {
    let t; try { t = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { continue; }
    asserts += (t.match(/(?<![\w.])(?:ok|assert|check|eq|expect|assertEq|assert\.\w+)\(/g) || []).length;
  }
  feit('tests', 'assert_aanroepen', 'Controle-aanroepen in de testscripts (ok(, assert(, check(, eq(, expect()', asserts, 'aanroepen', 'regex op de bronregels van de *_test.mjs', 'statische telling van aanroepen in de code, geen uitgevoerde controles: een controle in een lus draait vaker');
  const kandidaten = [opt('rapport'), process.env.GDE_TESTRAPPORT, path.join(os.tmpdir(), 'gde-testall')].filter(Boolean);
  let map = null;
  for (const k of kandidaten) {
    if (!fs.existsSync(k)) continue;
    if (fs.existsSync(path.join(k, 'rapport.json'))) { map = k; break; }
    const runs = fs.readdirSync(k).filter((n) => /^\d{8}-\d{6}$/.test(n) && fs.existsSync(path.join(k, n, 'rapport.json'))).sort();
    if (runs.length) {
      map = path.join(k, runs[runs.length - 1]);
      feit('tests', 'testrondes', 'Volledige testrondes (test_all) met rapport op deze machine', runs.length, 'rondes', 'tijdelijke map gde-testall', 'alleen wat nog op schijf staat; het tijdelijke rapportmapje wordt niet bewaard');
      break;
    }
  }
  if (!map) { mis('laatste testrapport', 'geen rapport.json van test_all.mjs gevonden (zet --rapport=<map>)'); return; }
  try {
    const r = JSON.parse(fs.readFileSync(path.join(map, 'rapport.json'), 'utf8'));
    const fasen = r.fases || r.fasen || {};
    const items = [];
    const verzamel = (x) => { if (Array.isArray(x)) for (const i of x) verzamel(i); else if (x && typeof x === 'object') { if (x.status && x.name !== undefined || x.status && x.naam !== undefined) items.push(x); else for (const v of Object.values(x)) verzamel(v); } };
    verzamel(fasen);
    const tel = {}; for (const i of items) tel[i.status] = (tel[i.status] || 0) + 1;
    const stempel = path.basename(map);
    if (items.length) {
      feit('tests', 'rapport_items', `Items in het laatste testrapport (${stempel})`, items.length, 'items', `gde-testall/${stempel}/rapport.json`);
      for (const [s, n] of Object.entries(tel)) feit('tests', 'rapport_' + String(s).toLowerCase().replace(/\W+/g, '_'), `Status ${s} (${stempel})`, n, 'items', 'idem');
    } else {
      feit('tests', 'rapport_gelezen', `Laatste testrapport (${stempel}) gelezen, maar de structuur is niet herkend`, 0, 'items', `gde-testall/${stempel}/rapport.json`);
    }
    if (r.duurSecs) feit('tests', 'rapport_duur_min', `Duur van die ronde (${stempel})`, rond(r.duurSecs / 60), 'minuten', `gde-testall/${stempel}/rapport.json`);
    info('rapport', stempel, JSON.stringify(tel));
  } catch (e) { mis('laatste testrapport', 'rapport.json onleesbaar: ' + e.message); }
}

// ---------------------------------------------------------------- 4. issues en releases (GitHub)

function metGithub() {
  if (flag('geen-gh')) { mis('GitHub (issues, releases)', 'overgeslagen met --geen-gh'); return; }
  const raw = gh(['issue', 'list', '--state', 'all', '--limit', '5000', '--json', 'number,state,labels,createdAt,closedAt']);
  if (!raw) { mis('GitHub (issues, releases)', 'gh niet gevonden of niet ingelogd'); return; }
  const issues = JSON.parse(raw);
  const open = issues.filter((i) => i.state === 'OPEN').length;
  const lab = (i, naam) => i.labels.some((l) => l.name === naam);
  const bron = 'gh issue list --state all';
  feit('issues', 'totaal', 'Issues (geopend, open en gesloten)', issues.length, 'issues', bron, 'pull requests zijn hier niet bij');
  feit('issues', 'gesloten', 'Gesloten', issues.length - open, 'issues', bron);
  feit('issues', 'open', 'Nog open', open, 'issues', bron);
  feit('issues', 'bugs', 'Bugs (label bug)', issues.filter((i) => lab(i, 'bug')).length, 'issues', bron);
  feit('issues', 'bugs_gesloten', 'Bugs die gesloten zijn', issues.filter((i) => lab(i, 'bug') && i.state === 'CLOSED').length, 'issues', bron);
  feit('issues', 'wensen', 'Wensen (label wens)', issues.filter((i) => lab(i, 'wens')).length, 'issues', bron);
  feit('issues', 'wensen_gesloten', 'Wensen die gesloten zijn', issues.filter((i) => lab(i, 'wens') && i.state === 'CLOSED').length, 'issues', bron);
  for (const l of ['impact-zeer-hoog', 'impact-hoog', 'impact-midden', 'impact-laag']) feit('issues', l.replace(/-/g, '_'), `Label ${l}`, issues.filter((i) => lab(i, l)).length, 'issues', bron);
  for (const l of ['kosten-S', 'kosten-M', 'kosten-L']) feit('issues', l.replace(/-/g, '_').toLowerCase(), `Label ${l}`, issues.filter((i) => lab(i, l)).length, 'issues', bron);
  feit('issues', 'eigenaar', 'Wachten op de eigenaar (label eigenaar)', issues.filter((i) => lab(i, 'eigenaar')).length, 'issues', bron);
  const sluit = issues.filter((i) => i.closedAt);
  if (sluit.length) {
    const dt = sluit.map((i) => (new Date(i.closedAt) - new Date(i.createdAt)) / 36e5).sort((a, b) => a - b);
    feit('issues', 'mediaan_uren_tot_sluiten', 'Mediane tijd van openen tot sluiten', rond(dt[Math.floor(dt.length / 2)], 1), 'uur', bron);
    const perDag = {}; for (const i of issues) perDag[dag(i.createdAt)] = (perDag[dag(i.createdAt)] || 0) + 1;
    const gDag = {}; for (const i of sluit) gDag[dag(i.closedAt)] = (gDag[dag(i.closedAt)] || 0) + 1;
    tijdlijnen.issuesPerDag = [...new Set([...Object.keys(perDag), ...Object.keys(gDag)])].sort().map((d) => ({ dag: d, geopend: perDag[d] || 0, gesloten: gDag[d] || 0 }));
  }
  const rel = gh(['release', 'list', '--limit', '500', '--json', 'tagName,isPrerelease,publishedAt,name']);
  if (rel) {
    const r = JSON.parse(rel).sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
    const versie = (t) => t.replace(/^v/, '').split('.').map(Number);
    const naar = (a, b) => { for (let k = 0; k < 3; k++) if (a[k] !== b[k]) return a[k] - b[k]; return 0; };
    const vs = r.map((x) => versie(x.tagName));
    feit('releases', 'aantal', 'Releases op GitHub', r.length, 'releases', 'gh release list');
    feit('releases', 'pre', 'Daarvan pre-releases', r.filter((x) => x.isPrerelease).length, 'releases', 'gh release list');
    if (r.length) {
      feit('releases', 'eerste', 'Eerste release', r[0].tagName + ' op ' + dag(r[0].publishedAt), 'tag', 'gh release list');
      feit('releases', 'laatste', 'Laatste release', r[r.length - 1].tagName + ' op ' + dag(r[r.length - 1].publishedAt), 'tag', 'gh release list');
      feit('releases', 'vanaf_035', 'Releases van 0.35.0 tot en met de laatste', vs.filter((v) => naar(v, [0, 35, 0]) >= 0).length, 'releases', 'gh release list');
      const perDag = {}; for (const x of r) perDag[dag(x.publishedAt)] = (perDag[dag(x.publishedAt)] || 0) + 1;
      tijdlijnen.releasesPerDag = Object.keys(perDag).sort().map((d) => ({ dag: d, releases: perDag[d] }));
      feit('releases', 'dagen_eerste_tot_laatste', 'Dagen tussen eerste en laatste release', Math.round((new Date(dag(r[r.length - 1].publishedAt)) - new Date(dag(r[0].publishedAt))) / 864e5), 'dagen', 'gh release list');
    }
  } else mis('releases', 'gh release list faalde');
  const ms = gh(['api', 'repos/{owner}/{repo}/milestones?state=all&per_page=100', '--jq', 'length']);
  if (ms) feit('issues', 'mijlpalen', 'Mijlpalen (epics)', Number(ms.trim()), 'mijlpalen', 'gh api milestones');
  const prs = gh(['pr', 'list', '--state', 'all', '--limit', '5000', '--json', 'number']);
  if (prs) feit('issues', 'pull_requests', 'Pull requests', JSON.parse(prs).length, 'pull requests', 'gh pr list --state all', 'het project merget vooral direct via branches; weinig PR\'s is normaal');
  const cl = path.join(ROOT, 'CHANGELOG.md');
  if (fs.existsSync(cl)) feit('releases', 'changelog_secties', 'Versiesecties in CHANGELOG.md', (fs.readFileSync(cl, 'utf8').match(/^## \[\d/gm) || []).length, 'secties', 'CHANGELOG.md');
}

// ---------------------------------------------------------------- 5. de wereld

function zoekWereld() {
  const kand = [opt('wereld'), process.env.GDE_WORLD, path.join(ROOT, 'game/world')];
  const gem = git('rev-parse', '--git-common-dir');
  if (gem) kand.push(path.resolve(ROOT, gem.trim(), '..', 'game/world'));
  for (const k of kand.filter(Boolean)) if (fs.existsSync(path.join(k, 'index-provincie.json'))) return k;
  return null;
}

const ringOppervlak = (ring) => { let s = 0; for (let i = 0, n = ring.length; i < n; i++) { const a = ring[i], b = ring[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
const lengte = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };

async function metWereld() {
  if (flag('geen-wereld')) { mis('wereld (tegels)', 'overgeslagen met --geen-wereld'); return; }
  const dir = zoekWereld();
  if (!dir) { mis('wereld (tegels)', 'geen game/world/index-provincie.json (bouw met: cd desktop && npm run stage) of geef --wereld='); return; }
  const G = await import(pathToFileURL(path.join(ROOT, 'game/js/gdt.js')).href);
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index-provincie.json'), 'utf8'));
  const gebouwd = fs.statSync(path.join(dir, 'index-provincie.json')).mtime.toISOString();
  const bron = 'game/world/index-provincie.json + tegels (.gdp)';
  const g = index.global || {};
  feit('wereld', 'gebouwd_op', 'Wereldbouw waaruit dit komt', dag(gebouwd), 'datum', 'game/world/index-provincie.json (tijdstempel)', 'een bouw van de dag genoemd; latere wijzigingen aan de wereldbouw zitten er niet in');
  feit('wereld', 'tegels', 'Kaarttegels van 1 × 1 km', Object.keys(index.tiles).length, 'tegels', bron);
  feit('wereld', 'tegelpakketten', 'Tegelpakketten (.gdp)', Object.keys(index.packs).length, 'bestanden', bron);
  let mb = 0; for (const p of Object.values(index.packs)) mb += p.size; feit('wereld', 'tegelgrootte_mb', 'Grootte van alle tegelpakketten', rond(mb / 1048576, 1), 'MB', bron);
  if (g.outline && g.outline.length) {
    const km2 = g.outline.reduce((s, r) => s + ringOppervlak(r), 0) / 1e6;
    feit('wereld', 'oppervlak_km2', 'Speelgebied: oppervlak van de provinciegrens (spelcoördinaten, meters)', rond(km2), 'km²', 'oppervlakte (formule van Gauss) van global.outline in index-provincie.json', 'het gebied binnen de grens, dus ook water; docs/PROVINCIE-PLAN.md noemt ~2.960 km² totaal en ~2.330 km² land');
  }
  // de tegels openen: unieke objecten (gid), want een groot object staat in elke tegel die het raakt
  const SEC = G.SECTION;
  const bijgid = (set) => (rows, f) => { for (const r of rows) { const k = r.gid ?? r.g; if (k === undefined || set.has(k)) continue; set.add(k); f(r); } };
  const seen = { b: new Set(), w: new Set(), r: new Set(), rail: new Set(), t: new Set(), gr: new Set(), f: new Set() };
  const tot = { gebouwen: 0, bag3d: 0, wegen: 0, wegKm: 0, bruggen: 0, bruggenKm: 0, water: 0, groen: 0, bomen: 0, spoor: 0, spoorKm: 0, meubilair: 0, tegelsMetGebouw: 0, wegKmAuto: 0, wegKmVoet: 0, signalen: 0 };
  const cat = {}; const typen = {}; const nummers = new Set();
  const fds = new Map();
  const t0 = Date.now();
  for (const t of Object.values(index.tiles)) {
    const pk = index.packs[t.pack]; if (!pk) continue;
    if (!fds.has(pk.file)) fds.set(pk.file, fs.openSync(path.join(dir, pk.file), 'r'));
    const buf = Buffer.alloc(t.len); fs.readSync(fds.get(pk.file), buf, 0, t.len, t.off);
    let blob; try { blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf))); } catch { continue; }
    const rijen = (ty) => ((blob.sections.find((s) => s.type === ty) || { rows: [] }).rows);
    const gebouwen = rijen(SEC.BUILDINGS);
    if (gebouwen.length) tot.tegelsMetGebouw++;
    bijgid(seen.b)(gebouwen, (r) => { tot.gebouwen++; if (r.hsrc === '3dbag') tot.bag3d++; typen[r.type || '?'] = (typen[r.type || '?'] || 0) + 1; });
    bijgid(seen.r)(rijen(SEC.ROADS), (r) => {
      const km = lengte(r.pts || r.p || []) / 1000; tot.wegen++; tot.wegKm += km; cat[r.cat || '?'] = (cat[r.cat || '?'] || 0) + km;
      if (r.cat === 'car' || r.cat === 'road' || r.cat === 'major' || r.cat === 'minor') tot.wegKmAuto += km;
      if (r.bridge) { tot.bruggen++; tot.bruggenKm += km; }
    });
    bijgid(seen.w)(rijen(SEC.WATER), () => { tot.water++; });
    bijgid(seen.gr)(rijen(SEC.GREEN), () => { tot.groen++; });
    bijgid(seen.t)(rijen(SEC.TREES), (r) => { tot.bomen += 1; });
    bijgid(seen.rail)(rijen(SEC.RAILS), (r) => { tot.spoor++; tot.spoorKm += lengte(r.pts || r.p || []) / 1000; });
    bijgid(seen.f)(rijen(SEC.FURNITURE), (r) => { tot.meubilair++; if (r.k === 'signals') tot.signalen++; });
  }
  for (const fd of fds.values()) fs.closeSync(fd);
  info(`tegels gelezen in ${Math.round((Date.now() - t0) / 1000)} s`);
  feit('wereld', 'gebouwen', 'Gebouwen (unieke objecten in de tegels)', tot.gebouwen, 'gebouwen', bron, 'unieke gid; gelijk aan index stats.buildings');
  feit('wereld', 'gebouwen_bag', 'Daarvan met hoogte uit de BAG/3D BAG (hsrc = 3dbag)', tot.bag3d, 'gebouwen', bron);
  feit('wereld', 'wegen', 'Wegen- en padstukken (unieke OSM-ways met eigen gid)', tot.wegen, 'stukken', bron);
  feit('wereld', 'wegen_km', 'Wegen, fiets- en voetpaden bij elkaar', rond(tot.wegKm), 'km', bron, 'som van de lengte van de polylijnen; een weg met twee rijbanen telt per rijbaan');
  feit('wereld', 'wegen_auto_km', 'Daarvan wegen waar een auto op mag (normal, minor, major)', rond((cat.normal || 0) + (cat.minor || 0) + (cat.major || 0)), 'km', bron, 'categorienamen van de tegelbouw');
  for (const [c, km] of Object.entries(cat).sort((a, b) => b[1] - a[1])) feit('wereld_wegen', c, `Wegcategorie ${c}`, rond(km), 'km', bron);
  feit('wereld', 'bruggen', 'Brugstukken (wegen met bridge = true)', tot.bruggen, 'stukken', bron, 'OSM-ways met het brugkenmerk; een brug kan uit meerdere stukken bestaan');
  feit('wereld', 'bruggen_km', 'Totale lengte van die brugstukken', rond(tot.bruggenKm, 1), 'km', bron);
  feit('wereld', 'water', 'Wateroppervlakken en waterlopen (polygonen)', tot.water, 'objecten', bron);
  feit('wereld', 'groen', 'Groenvlakken (park, bos, weide)', tot.groen, 'vlakken', bron);
  feit('wereld', 'bomen', 'Bomen', tot.bomen, 'bomen', bron, 'rijen in de tegels; een rij kan een boom of een groepje zijn');
  feit('wereld', 'spoor_km', 'Spoor', rond(tot.spoorKm), 'km', bron);
  feit('wereld', 'straatmeubilair', 'Straatmeubilair (lantaarns, bankjes, borden, verkeerslichten, ...)', tot.meubilair, 'objecten', bron);
  if (Array.isArray(g.stations)) feit('wereld', 'stations', 'Treinstations', g.stations.length, 'stations', 'index-provincie.json global.stations');
  if (Array.isArray(g.routes)) feit('wereld', 'treinlijnen', 'Treinlijnen (met de stad als beginpunt)', g.routes.length, 'lijnen', 'index-provincie.json global.routes');
  if (Array.isArray(g.locks)) feit('wereld', 'sluizen', 'Sluizen en keersluizen (OSM, in de tegelindex)', g.locks.length, 'sluizen', 'index-provincie.json global.locks', 'inclusief kleine sluisjes en gemalen met een sluisfunctie in OSM');
  if (Array.isArray(g.places)) {
    const k = {}; for (const p of g.places) k[p.kind] = (k[p.kind] || 0) + 1;
    feit('wereld', 'plaatsen', 'Benoemde plaatsen (index global.places)', g.places.length, 'plaatsen', 'index-provincie.json global.places');
    feit('wereld', 'stad', 'Steden', (k.city || 0), 'plaatsen', 'places kind city');
    feit('wereld', 'plaatsen_stadjes', 'Stadjes en kleine steden (kind town)', (k.town || 0), 'plaatsen', 'places kind town');
    feit('wereld', 'dorpen', 'Dorpen (kind village)', (k.village || 0), 'plaatsen', 'places kind village');
    feit('wereld', 'gehuchten', 'Gehuchten (kind hamlet)', (k.hamlet || 0), 'plaatsen', 'places kind hamlet');
    feit('wereld', 'wijken', 'Wijken en buurten (kind neighbourhood, quarter, suburb)', (k.neighbourhood || 0) + (k.quarter || 0) + (k.suburb || 0), 'plaatsen', 'places');
  }
  const bus = path.join(dir, 'provincie-bus.json');
  if (fs.existsSync(bus)) {
    const b = JSON.parse(fs.readFileSync(bus, 'utf8')).bus || [];
    feit('wereld', 'buslijnroutes', 'Buslijn-routes (OSM-relaties, per richting)', b.length, 'routes', 'game/world/provincie-bus.json');
    feit('wereld', 'buslijnen', 'Verschillende buslijnnummers', new Set(b.map((x) => x.ref).filter(Boolean)).size, 'lijnnummers', 'game/world/provincie-bus.json (ref)');
  }
  const stad = path.join(ROOT, 'game/sluizen.json');
  if (fs.existsSync(stad)) { try { const s = JSON.parse(fs.readFileSync(stad, 'utf8')); const n = Array.isArray(s) ? s.length : Object.keys(s.sluizen || s.locks || s).length; feit('wereld', 'sluizen_bediend', 'Sluizen met eigen bediening in het spel (game/sluizen.json)', n, 'sluizen', 'game/sluizen.json'); } catch { /* andere vorm */ } }
  tijdlijnen.gebouwTypen = Object.entries(typen).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([type, n]) => ({ type, n }));
}

// ---------------------------------------------------------------- 6. wat erin zit: de registers

async function laadNode3d() {
  try { await import(pathToFileURL(path.join(ROOT, 'scripts/node3d.mjs')).href); return true; } catch { return false; }
}

async function metInhoud() {
  const imp = async (f) => import(pathToFileURL(path.join(ROOT, 'game/js', f)).href);
  const probeer = async (naam, f) => { try { return await f(); } catch (e) { mis(naam, 'import faalde: ' + String(e.message).split('\n')[0].slice(0, 120)); return null; } };
  const drie = await laadNode3d();
  if (!drie) info('three.js uit de vendor-cache ontbreekt: een deel van de registers wordt overgeslagen (npm run stage in desktop/ vult die cache)');

  const arc = await probeer('missies (storyarc.js)', () => imp('storyarc.js'));
  if (arc) {
    feit('inhoud', 'verhaalmissies', 'Verhaalmissies (MISSION_IDS)', arc.MISSION_IDS.length, 'missies', 'game/js/storyarc.js');
    if (arc.PARTS) feit('inhoud', 'aktes', 'Aktes van het verhaal (PARTS)', Array.isArray(arc.PARTS) ? arc.PARTS.length : Object.keys(arc.PARTS).length, 'aktes', 'game/js/storyarc.js');
    feit('inhoud', 'verhaalstappen', 'Stappen in het verhaal (STEPS)', arc.STEPS.length, 'stappen', 'game/js/storyarc.js');
  }
  const scriptPad = path.join(ROOT, 'game/storydata/script.json');
  if (fs.existsSync(scriptPad)) {
    const s = JSON.parse(fs.readFileSync(scriptPad, 'utf8'));
    let regels = 0, woorden = 0, regie = 0;
    for (const sc of s.scenes) for (const l of sc.lines || []) { regels++; woorden += String(l.text ?? l.t ?? l[1] ?? '').split(/\s+/).filter(Boolean).length; }
    for (const sc of s.scenes) regie += (sc.regie || []).length;
    feit('inhoud', 'scenes', 'Scènes in het verhaalscript', s.scenes.length, 'scènes', 'game/storydata/script.json');
    feit('inhoud', 'sprekers', 'Sprekende personages in het script', Object.keys(s.speakers).length, 'sprekers', 'game/storydata/script.json');
    feit('inhoud', 'dialoogregels', 'Regels dialoog in het verhaalscript', regels, 'regels', 'game/storydata/script.json (scenes[].lines)');
    feit('inhoud', 'dialoogwoorden', 'Woorden dialoog in het verhaalscript', woorden, 'woorden', 'idem', 'splitsen op spaties');
    feit('inhoud', 'regie_aanwijzingen', 'Regie-aanwijzingen in het script', regie, 'aanwijzingen', 'idem');
  }
  if (drie) {
    await probeer('cutscenes', async () => {
      const a1 = await imp('cutscenes_akte1.js');
      for (const n of [2, 3, 4, 5]) { try { await imp(`cutscenes_akte${n}.js`); } catch { /* bestaat niet */ } }
      const keys = new Set([...Object.keys(a1.SPECS), ...Object.keys(a1.MORE_SPECS)]);
      feit('inhoud', 'cutscenes', 'Geregisseerde cutscenes (SPECS + MORE_SPECS, na het laden van akte 1 t/m 4)', keys.size, 'cutscenes', 'game/js/cutscenes_akte1..4.js');
    });
    const sj = await probeer('bijbanen', () => imp('sidejobs.js'));
    if (sj) feit('inhoud', 'bijbanen', 'Bijbanen en zijmissies (SIDE_JOBS)', sj.SIDE_JOBS.length, 'bijbanen', 'game/js/sidejobs.js');
    const ac = await probeer('activiteiten', () => imp('activities.js'));
    if (ac) feit('inhoud', 'activiteiten', 'Vrijetijdsactiviteiten en minigames (legenda van activities.js)', ac.ACTIVITY_LEGEND.length, 'activiteiten', 'game/js/activities.js', 'zonder de pg_*-minigames van de verhaalmissies');
    const pr = await probeer('prestaties', () => imp('achievements.js'));
    if (pr) feit('inhoud', 'prestaties', 'Prestaties (trofeeën)', pr.ACHIEVEMENTS.length, 'prestaties', 'game/js/achievements.js');
  }
  const ve = await probeer('voertuigen', () => imp('vehicleregister.js'));
  if (ve) {
    const k = {}; for (const v of Object.values(ve.VOERTUIGEN)) k[v.klasse] = (k[v.klasse] || 0) + 1;
    feit('inhoud', 'voertuigmodellen', 'Voertuigmodellen in het voertuigregister', Object.keys(ve.VOERTUIGEN).length, 'modellen', 'game/js/vehicleregister.js', `per klasse: ${Object.entries(k).map(([a, b]) => `${a} ${b}`).join(', ')}`);
  }
  const di = await probeer('dieren', () => imp('dierenregister.js'));
  if (di) feit('inhoud', 'diersoorten', 'Diersoorten in het dierenregister', di.DIEREN.length, 'soorten', 'game/js/dierenregister.js', di.DIEREN.map((d) => d.id).join(', '));
  const pg = fs.readdirSync(path.join(ROOT, 'game/js')).filter((f) => /^pg_.*\.js$/.test(f)).length;
  feit('inhoud', 'verhaalminigames', 'Minigames in de verhaalmissies (bestanden pg_*.js)', pg, 'minigames', 'game/js/pg_*.js');
  const nb = fs.readdirSync(path.join(ROOT, 'game/js')).filter((f) => /^sidejob_.*\.js$/.test(f)).length;
  feit('inhoud', 'bijbaanmodules', 'Bijbaanmodules (bestanden sidejob_*.js)', nb, 'modules', 'game/js/sidejob_*.js');

  // geluid
  const audio = path.join(ROOT, 'game/audio');
  if (fs.existsSync(audio)) {
    const tel = (d) => { let n = 0, b = 0; const walk = (p) => { for (const e of fs.readdirSync(p, { withFileTypes: true })) { const f = path.join(p, e.name); if (e.isDirectory()) walk(f); else if (/\.(mp3|wav|ogg|opus)$/i.test(e.name)) { n++; b += fs.statSync(f).size; } } }; walk(d); return { n, b }; };
    const sub = fs.readdirSync(audio, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    let alles = 0, bytes = 0;
    for (const s of sub) { const t = tel(path.join(audio, s)); alles += t.n; bytes += t.b; if (s === 'voicelines') { feit('inhoud', 'stemopnames', 'Stemopnames (game/audio/voicelines)', t.n, 'bestanden', 'game/audio/voicelines', 'bestanden, geen zinnen; alle stemmen zijn met AI gemaakt (README)'); } }
    feit('inhoud', 'audio_bestanden', 'Geluidsbestanden in game/audio (stemmen, muziek, radio, nieuws)', alles, 'bestanden', 'game/audio');
    feit('inhoud', 'audio_mb', 'Grootte van game/audio', rond(bytes / 1048576), 'MB', 'game/audio');
    for (const s of sub.filter((x) => x !== 'voicelines')) feit('inhoud_audio', s, `game/audio/${s}`, tel(path.join(audio, s)).n, 'bestanden', 'game/audio/' + s);
    const man = path.join(audio, 'gmusic/manifest.json');
    if (fs.existsSync(man)) feit('inhoud', 'muziektracks', 'Muziektracks in de radiolijst (gmusic/manifest.json)', JSON.parse(fs.readFileSync(man, 'utf8')).tracks.length, 'tracks', 'game/audio/gmusic/manifest.json', 'tracks met AI gemaakt (README); meer dan 3 minuten per track is niet gemeten');
    const sub2 = ['gmusic', 'scenario', 'theme'].reduce((s, d) => s + (fs.existsSync(path.join(audio, d)) ? tel(path.join(audio, d)).n : 0), 0);
    feit('inhoud', 'muziekbestanden', 'Muziekbestanden (gmusic + scenario + theme)', sub2, 'bestanden', 'game/audio/{gmusic,scenario,theme}');
  }
  feit('inhoud', 'talen', 'Talen van het spel (tekst)', 1, 'taal', 'AGENTS.md (constitution punt 1)', 'alleen Nederlands; de stemmen praten Gronings, de ondertitels zijn Nederlands');
  const ds = path.join(ROOT, 'game/models');
  if (fs.existsSync(ds)) feit('inhoud', 'glb_modellen', 'Los 3D-model als bestand (.glb)', fs.readdirSync(ds).filter((f) => f.endsWith('.glb')).length, 'modellen', 'game/models', 'bijna alle voertuigen, gebouwen en figuren worden met code gegenereerd (procedureel), niet gemodelleerd');
  const platforms = ['desktop', 'web', 'android'].filter((d) => fs.existsSync(path.join(ROOT, d)));
  feit('inhoud', 'platformen', 'Doelplatformen met eigen map (desktop, web, android)', platforms.length, 'platformen', platforms.join(', '), 'builds: macOS, Windows en (soms) Linux; webversie en Android in ontwikkeling (README)');
}

// ---------------------------------------------------------------- uitvoer

function mdTabel() {
  const uit = [];
  uit.push(`# Cijferblad (gemaakt ${new Date().toISOString().slice(0, 10)})`);
  uit.push('');
  uit.push('Alle cijfers komen uit `node scripts/stats/schaal.mjs`; elk cijfer heeft zijn bron. Een cijfer met een voorbehoud staat onder "Let op".');
  for (const groep of groepVolgorde) {
    uit.push(''); uit.push(`## ${groep}`); uit.push('');
    uit.push('| Cijfer | Waarde | Eenheid | Bron | Let op |'); uit.push('|---|---:|---|---|---|');
    for (const [id, c] of Object.entries(cijfers)) {
      if (c.groep !== groep) continue;
      const w = typeof c.waarde === 'number' ? nl(c.waarde) : String(c.waarde);
      uit.push(`| ${c.label} | ${w} | ${c.eenheid} | ${c.bron.replace(/\|/g, '/')} | ${(c.let_op || '').replace(/\|/g, '/')} |`);
    }
  }
  if (niet_gemeten.length) { uit.push(''); uit.push('## Niet gemeten'); uit.push(''); for (const n of niet_gemeten) uit.push(`- ${n.wat}: ${n.reden}`); }
  return uit.join('\n') + '\n';
}

// de cijfers die op het scherm komen (grote cijfers, korte Nederlandse labels): één lijst voor de dia's en de video
const OVERLAYS = [
  ['git.commits', 'commits'],
  ['git.kalenderdagen', 'dagen van eerste commit tot nu'],
  ['sessies.branches_sessies', 'AI-sessies met eigen branch'],
  ['code.regels_code', 'regels code'],
  ['code.spelmodules', 'JavaScript-modules in het spel'],
  ['code.testscripts', 'testscripts'],
  ['issues.totaal', 'issues op het bord'],
  ['issues.bugs_gesloten', 'bugs opgelost'],
  ['releases.aantal', 'releases'],
  ['wereld.oppervlak_km2', 'km² speelgebied'],
  ['wereld.tegels', 'kaarttegels'],
  ['wereld.gebouwen', 'gebouwen'],
  ['wereld.wegen_km', 'km weg en pad'],
  ['wereld.bruggen', 'brugstukken'],
  ['wereld.stations', 'treinstations'],
  ['wereld.buslijnen', 'buslijnnummers'],
  ['wereld.dorpen', 'dorpen'],
  ['wereld.bomen', 'bomen'],
  ['inhoud.verhaalmissies', 'verhaalmissies'],
  ['inhoud.cutscenes', 'cutscenes'],
  ['inhoud.dialoogregels', 'regels dialoog'],
  ['inhoud.stemopnames', 'stemopnames'],
  ['inhoud.muziektracks', 'muziektracks'],
  ['inhoud.voertuigmodellen', 'voertuigmodellen'],
  ['inhoud.diersoorten', 'diersoorten'],
  ['inhoud.bijbanen', 'bijbanen'],
  ['inhoud.activiteiten', 'minigames en activiteiten'],
  ['inhoud.prestaties', 'prestaties'],
];

function overlays() {
  return OVERLAYS.filter(([id]) => cijfers[id] && cijfers[id].waarde !== null).map(([id, label]) => {
    const c = cijfers[id];
    return { id, waarde: c.waarde, tekst: typeof c.waarde === 'number' ? nl(c.waarde) : String(c.waarde), label, bron: c.bron, let_op: c.let_op || null };
  });
}

async function main() {
  info('git ...'); metGit();
  info('code ...'); const code = metCode(); metChurn();
  info('tests ...'); metTests(code && code.lijst);
  info('github ...'); metGithub();
  info('wereld ...'); await metWereld();
  info('inhoud ...'); await metInhoud();
  const vorm = (git('rev-parse', '--short', 'HEAD') || '').trim();
  const rapport = {
    gemaakt: new Date().toISOString(),
    commit: vorm,
    let_op: 'Elk cijfer is gemeten uit de repo, GitHub of de gebouwde wereld, met zijn bron. Geen van deze cijfers is een schatting van werk of kosten; die staan apart in SCHATTING.md.',
    cijfers,
    tijdlijnen,
    niet_gemeten,
    overlays: overlays(),
  };
  const j = opt('json'); if (j) { fs.mkdirSync(path.dirname(path.resolve(j)), { recursive: true }); fs.writeFileSync(j, JSON.stringify(rapport, null, 2) + '\n'); }
  const m = opt('md'); if (m) { fs.mkdirSync(path.dirname(path.resolve(m)), { recursive: true }); fs.writeFileSync(m, mdTabel()); }
  const o = opt('overlays'); if (o) { fs.mkdirSync(path.dirname(path.resolve(o)), { recursive: true }); fs.writeFileSync(o, JSON.stringify({ gemaakt: rapport.gemaakt, commit: vorm, let_op: 'Gemeten cijfers uit scripts/stats/schaal.mjs; de bron staat bij elk cijfer.', cijfers: rapport.overlays }, null, 2) + '\n'); }
  if (!STIL) console.log(mdTabel());
}

await main();
