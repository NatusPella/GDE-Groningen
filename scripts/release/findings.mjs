// Bevindingentriage voor de releasegate (deel van de releasegate).
// Leest de reviewrapporten (*.json) uit één of meer reviewmappen, valideert ze zelf tegen
// scripts/release/findings-schema.json (geen dependency), dedupliceert de bevindingen en
// bepaalt de uitkomst: groen (0), rood (1), onvolledig/ongeldig (3) of fout (2).
//
//   node scripts/release/findings.mjs --dir=<map[,map]> [--required=<review-required.json>]
//        [--out=<map>] [--commit=<sha>] [--issues [--create]]
//
// Schrijft <out>/findings.json, <out>/bevindingen.md (Nederlands), <out>/issues-concept.md en
// <out>/gate.json {status, commit, blocking, belangrijk, nits, aspecten}. Standaard een droge run:
// --issues schrijft alleen concepten, --create maakt ze via gh (bestaat-al-controle op de afdruk).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DEFAULT_OUT = path.join(os.tmpdir(), 'gde-findings');

const SOURCES = ['code-review', 'vision', 'perf', 'rules', 'design', 'baseline', 'test'];
const ASPECTS = ['correctness', 'rules', 'design', 'perf', 'ux', 'gameplay', 'visual', 'multiplayer', 'privacy', 'toegankelijkheid'];
const SEVERITIES = ['blokkerend', 'belangrijk', 'nit'];
const SEVERITY_RANK = { blokkerend: 3, belangrijk: 2, nit: 1 };
const COMMIT_PATTERN = /^[0-9a-f]{7,40}$/;

// ---------------------------------------------------------------- normaliseren en valideren

const isText = (value) => typeof value === 'string' && value.trim().length > 0;

// Titel normaliseren voor dedupe: lowercase, accenten en leestekens weg, spaties platslaan.
export function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const normalizePath = (file) => String(file || '').replace(/\\/g, '/').replace(/^\.\//, '').trim();

export function dedupeKey(finding) {
  const files = (Array.isArray(finding.bestanden) ? finding.bestanden : []).map(normalizePath).filter(Boolean).sort();
  return `${normalizeTitle(finding.titel)}|${files.join(',')}`;
}

// Kleine, stabiele afdruk (djb2) voor de bestaat-al-controle van een issue; geen crypto nodig.
export function fingerprint(finding) {
  const basis = `${dedupeKey(finding)}|${String(finding.aspect || '')}`;
  let hash = 5381;
  for (let i = 0; i < basis.length; i++) hash = ((hash * 33) ^ basis.charCodeAt(i)) >>> 0;
  return hash.toString(16).padStart(8, '0');
}

// Valideert één bevinding volgens $defs.bevinding. Geeft een lijst met Nederlandse fouten.
export function validateFinding(finding, where = 'bevinding') {
  const errors = [];
  if (!finding || typeof finding !== 'object' || Array.isArray(finding)) return [`${where}: geen object`];
  if (!isText(finding.bron)) errors.push(`${where}: bron ontbreekt`);
  else if (!SOURCES.includes(finding.bron)) errors.push(`${where}: onbekende bron "${finding.bron}"`);
  if (!isText(finding.aspect)) errors.push(`${where}: aspect ontbreekt`);
  else if (!ASPECTS.includes(finding.aspect)) errors.push(`${where}: onbekend aspect "${finding.aspect}"`);
  if (!isText(finding.ernst)) errors.push(`${where}: ernst ontbreekt`);
  else if (!SEVERITIES.includes(finding.ernst)) errors.push(`${where}: onbekende ernst "${finding.ernst}"`);
  if (!isText(finding.categorie)) errors.push(`${where}: categorie ontbreekt`);
  else if (finding.categorie.length < 2 || finding.categorie.length > 40) errors.push(`${where}: categorie moet 2 tot 40 tekens zijn`);
  if (!isText(finding.titel)) errors.push(`${where}: titel ontbreekt`);
  else if (finding.titel.length < 4 || finding.titel.length > 120) errors.push(`${where}: titel moet 4 tot 120 tekens zijn`);
  if (!isText(finding.beschrijving)) errors.push(`${where}: beschrijving ontbreekt`);
  else if (finding.beschrijving.length < 10 || finding.beschrijving.length > 2000) errors.push(`${where}: beschrijving moet 10 tot 2000 tekens zijn`);
  if (finding.bewijs != null) {
    if (!Array.isArray(finding.bewijs) || finding.bewijs.some((item) => typeof item !== 'string' || !item.trim())) {
      errors.push(`${where}: bewijs moet een lijst niet-lege teksten zijn`);
    }
  }
  if (finding.ernst === 'blokkerend' && (!Array.isArray(finding.bewijs) || !finding.bewijs.length)) {
    errors.push(`${where}: blokkerende bevinding zonder bewijs`);
  }
  if (finding.bestanden != null && (!Array.isArray(finding.bestanden) || finding.bestanden.some((item) => typeof item !== 'string'))) {
    errors.push(`${where}: bestanden moet een lijst paden zijn`);
  }
  if (finding.beeld != null && typeof finding.beeld !== 'string') errors.push(`${where}: beeld moet tekst zijn`);
  if (finding.fix != null && (typeof finding.fix !== 'string' || finding.fix.length > 1000)) errors.push(`${where}: fix moet tekst van maximaal 1000 tekens zijn`);
  if (finding.reviewer != null && (typeof finding.reviewer !== 'string' || finding.reviewer.length > 80)) errors.push(`${where}: reviewer moet tekst van maximaal 80 tekens zijn`);
  if (finding.issue != null && (!Number.isInteger(finding.issue) || finding.issue < 1)) errors.push(`${where}: issue moet een positief getal zijn`);
  return errors;
}

// Valideert een reviewrapport volgens $defs.reviewrapport.
export function validateReport(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['rapport is geen object'];
  if (!isText(data.onderwerp)) errors.push('onderwerp ontbreekt');
  if (!isText(data.reviewer)) errors.push('reviewer ontbreekt');
  if (!isText(data.commit)) errors.push('commit ontbreekt');
  else if (!COMMIT_PATTERN.test(data.commit)) errors.push(`commit "${data.commit}" is geen kleine hex-sha van 7 tot 40 tekens`);
  if (!data.dekking || typeof data.dekking !== 'object' || Array.isArray(data.dekking)) {
    errors.push('dekking ontbreekt');
  } else if (!Array.isArray(data.dekking.bestanden) || data.dekking.bestanden.some((file) => typeof file !== 'string')) {
    errors.push('dekking.bestanden moet een lijst paden zijn');
  }
  if (!Array.isArray(data.bevindingen)) {
    errors.push('bevindingen moet een lijst zijn');
  } else {
    data.bevindingen.forEach((finding, index) => errors.push(...validateFinding(finding, `bevinding ${index + 1}`)));
  }
  return errors;
}

// Dekking van een rapport: het onderwerp en de opgegeven aspecten, in kleine letters.
// Het vision-rapport van de beeldreview gebruikt als onderwerp "vision-visual-gate"; dat telt
// als dekking van het aspect vision. Andere namen (zoals "design-system") dekken niets extra's.
function coveredAspects(data) {
  const covered = new Set();
  const add = (value) => {
    for (const part of String(value || '').toLowerCase().split(/[\s,+/]+/)) {
      const name = part.trim();
      if (name) covered.add(name);
    }
  };
  add(data.onderwerp);
  if (String(data.onderwerp || '').trim().toLowerCase().startsWith('vision')) covered.add('vision');
  if (data.dekking && Array.isArray(data.dekking.aspecten)) for (const aspect of data.dekking.aspecten) add(aspect);
  return [...covered];
}

// ---------------------------------------------------------------- dedupe

function sortFindings(list) {
  const aspectRank = (aspect) => {
    const index = ASPECTS.indexOf(aspect);
    return index >= 0 ? index : ASPECTS.length;
  };
  const sourceRank = (source) => {
    const index = SOURCES.indexOf(source);
    return index >= 0 ? index : SOURCES.length;
  };
  return [...list].sort((left, right) =>
    (SEVERITY_RANK[right.ernst] || 0) - (SEVERITY_RANK[left.ernst] || 0)
    || aspectRank(left.aspect) - aspectRank(right.aspect)
    || sourceRank(left.bron) - sourceRank(right.bron)
    || normalizeTitle(left.titel).localeCompare(normalizeTitle(right.titel))
    || String(left.titel).localeCompare(String(right.titel))
  );
}

// Dedupliceert op genormaliseerde titel + gesorteerde bestanden; voegt bewijs samen en
// houdt de hoogste ernst. `reviewers` en `duplicaten` zijn extra context, geen schemaveld.
export function dedupeFindings(findings) {
  const groups = new Map();
  for (const finding of sortFindings(findings)) {
    const key = dedupeKey(finding);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(finding);
  }
  const merged = [];
  for (const [, group] of groups) {
    const base = group[0];
    const evidence = [];
    const files = new Set();
    const reviewers = new Set();
    let description = base.beschrijving;
    let fix = base.fix || '';
    let image = base.beeld || '';
    for (const finding of group) {
      for (const item of Array.isArray(finding.bewijs) ? finding.bewijs : []) if (!evidence.includes(item)) evidence.push(item);
      for (const file of Array.isArray(finding.bestanden) ? finding.bestanden : []) files.add(normalizePath(file));
      if (finding.reviewer) reviewers.add(finding.reviewer);
      if (finding.beschrijving && finding.beschrijving.length > description.length) description = finding.beschrijving;
      if (finding.fix && finding.fix.length > fix.length) fix = finding.fix;
      if (finding.beeld && !image) image = finding.beeld;
    }
    const finding = {
      ...base,
      beschrijving: description,
      bewijs: evidence,
      bestanden: [...files].filter(Boolean).sort(),
      fix,
      afdruk: fingerprint(base),
      duplicaten: group.length,
      reviewers: [...reviewers].sort(),
    };
    if (image) finding.beeld = image;
    else delete finding.beeld;
    if (!fix) delete finding.fix;
    merged.push(finding);
  }
  return sortFindings(merged);
}

// ---------------------------------------------------------------- triage

function commitMatches(reportCommit, commit) {
  if (!commit || !reportCommit) return true;
  return reportCommit.startsWith(commit) || commit.startsWith(reportCommit);
}

// Bepaalt de uitkomst uit de gelezen rapporten en de verplichte aspecten (uit review-required.json).
export function triage({ reports = [], requiredAspects = [], commit = '', requiredCommit = '' } = {}) {
  const required = [...new Set((requiredAspects || []).map((aspect) => String(aspect || '').trim().toLowerCase()).filter(Boolean))];
  const invalid = [];
  const valid = [];
  const seen = new Set();

  for (const report of reports) {
    if (report.leesfout) {
      invalid.push({ bestand: report.bestand, fouten: [`geen geldige JSON: ${report.leesfout}`] });
      continue;
    }
    const errors = validateReport(report.data);
    if (errors.length) {
      invalid.push({ bestand: report.bestand, fouten: errors });
      continue;
    }
    if (commit && !commitMatches(report.data.commit, commit)) {
      invalid.push({ bestand: report.bestand, fouten: [`review op commit ${report.data.commit}, verwacht ${commit}`] });
      continue;
    }
    valid.push(report);
    for (const aspect of coveredAspects(report.data)) seen.add(aspect);
  }

  const all = dedupeFindings(valid.flatMap((report) => report.data.bevindingen.map((finding) => ({ ...finding, reviewer: finding.reviewer || report.data.reviewer }))));
  const blocking = all.filter((finding) => finding.ernst === 'blokkerend');
  const important = all.filter((finding) => finding.ernst === 'belangrijk');
  const nits = all.filter((finding) => finding.ernst === 'nit');
  const missing = required.filter((aspect) => !seen.has(aspect));
  const effectiveCommit = commit
    || requiredCommit
    || (valid.length && valid.every((report) => report.data.commit === valid[0].data.commit) ? valid[0].data.commit : '');

  let status = 'groen';
  if (!reports.length) status = 'onvolledig';
  else if (invalid.length || missing.length) status = 'onvolledig';
  else if (blocking.length) status = 'rood';

  return {
    status,
    commit: effectiveCommit,
    blocking,
    belangrijk: important,
    nits,
    bevindingen: all,
    ongeldig: invalid,
    aspecten: {
      verplicht: required,
      gezien: [...seen].sort(),
      ontbrekend: missing,
    },
    rapporten: reports.map((report) => ({
      bestand: report.bestand,
      onderwerp: report.data && report.data.onderwerp,
      reviewer: report.data && report.data.reviewer,
      commit: report.data && report.data.commit,
      geldig: valid.includes(report),
      aantalBevindingen: Array.isArray(report.data && report.data.bevindingen) ? report.data.bevindingen.length : 0,
    })),
  };
}

// ---------------------------------------------------------------- output

const SEVERITY_HEADING = { blokkerend: 'Blokkerend', belangrijk: 'Belangrijk', nit: 'Nit' };

function evidenceLines(finding) {
  const lines = [];
  for (const item of Array.isArray(finding.bewijs) ? finding.bewijs : []) lines.push(`- ${item}`);
  return lines;
}

function renderFinding(finding) {
  const lines = [];
  lines.push(`#### ${finding.titel}`);
  lines.push('');
  lines.push(`- Ernst: **${finding.ernst}** · aspect: ${finding.aspect} · categorie: ${finding.categorie} · bron: ${finding.bron}${finding.duplicaten > 1 ? ` · ${finding.duplicaten} keer gemeld` : ''}`);
  if (Array.isArray(finding.bestanden) && finding.bestanden.length) lines.push(`- Bestanden: ${finding.bestanden.map((file) => `\`${file}\``).join(', ')}`);
  if (finding.beeld) lines.push(`- Beeld: \`${finding.beeld}\``);
  lines.push(`- Afdruk: \`${finding.afdruk}\``);
  lines.push('');
  lines.push(String(finding.beschrijving || '').trim());
  lines.push('');
  const evidence = evidenceLines(finding);
  if (evidence.length) {
    lines.push('**Bewijs**', '');
    lines.push(...evidence);
    lines.push('');
  }
  if (finding.fix) {
    lines.push(`**Voorgestelde fix:** ${finding.fix}`);
    lines.push('');
  }
  return lines;
}

export function renderFindingsMd(result) {
  const lines = [];
  lines.push(`# Bevindingen release-review (${result.status})`, '');
  lines.push(`- Commit: ${result.commit ? `\`${result.commit}\`` : 'onbekend'}`);
  lines.push(`- Rapporten: ${result.rapporten.length}`);
  lines.push(`- Bevindingen: ${result.blocking.length} blokkerend, ${result.belangrijk.length} belangrijk, ${result.nits.length} nit`);
  lines.push('');
  lines.push('## Aspecten', '');
  lines.push(`- Verplicht: ${result.aspecten.verplicht.length ? result.aspecten.verplicht.join(', ') : '(geen)'}`);
  lines.push(`- Gezien: ${result.aspecten.gezien.length ? result.aspecten.gezien.join(', ') : '(geen)'}`);
  lines.push(`- Ontbrekend: ${result.aspecten.ontbrekend.length ? result.aspecten.ontbrekend.join(', ') : '(geen)'}`);
  lines.push('');
  if (result.ongeldig.length) {
    lines.push('## Ongeldige rapporten', '');
    for (const report of result.ongeldig) {
      lines.push(`- \`${report.bestand}\``);
      for (const error of report.fouten) lines.push(`  - ${error}`);
    }
    lines.push('');
  }
  if (result.aspecten.ontbrekend.length) {
    lines.push('## Ontbrekende verplichte aspecten', '');
    lines.push('Deze aspecten zijn niet gedekt door een geldig reviewrapport; de review is dus niet compleet:');
    lines.push('');
    for (const aspect of result.aspecten.ontbrekend) lines.push(`- ${aspect}`);
    lines.push('');
  }
  for (const severity of SEVERITIES) {
    const list = severity === 'blokkerend' ? result.blocking : severity === 'belangrijk' ? result.belangrijk : result.nits;
    lines.push(`## ${SEVERITY_HEADING[severity]}`, '');
    if (!list.length) {
      lines.push('Geen.', '');
      continue;
    }
    const aspects = [...new Set(list.map((finding) => finding.aspect))];
    for (const aspect of aspects) {
      lines.push(`### ${aspect}`, '');
      for (const finding of list.filter((item) => item.aspect === aspect)) lines.push(...renderFinding(finding));
    }
  }
  if (!result.bevindingen.length) lines.push('Geen bevindingen in de geldige rapporten.', '');
  return lines.join('\n') + '\n';
}

// Labels voor een issue-concept: bug bij correctheid/perf/visuele fout, anders wens,
// plus een impact- en kostenlabel als voorstel (de mens beslist).
export function issueLabels(finding) {
  const aspect = String(finding.aspect || '');
  const category = String(finding.categorie || '').toLowerCase();
  const isBug = ['correctness', 'perf', 'visual'].includes(aspect) || /bug|fout|crash|correct|regress|save|lek|privacy/.test(category);
  const labels = [isBug ? 'bug' : 'wens'];
  labels.push(finding.ernst === 'nit' ? 'impact-laag' : 'impact-hoog');
  labels.push(finding.ernst === 'nit' ? 'kosten-S' : 'kosten-M');
  return labels;
}

export function issueBody(finding) {
  const print = finding.afdruk || fingerprint(finding);
  const lines = [];
  lines.push('De release-review vond deze bevinding in de diff sinds de vorige tag.');
  lines.push('');
  lines.push(`- Ernst: ${finding.ernst}`);
  lines.push(`- Aspect: ${finding.aspect}`);
  lines.push(`- Categorie: ${finding.categorie}`);
  lines.push(`- Bron: ${finding.bron}`);
  if (finding.reviewers && finding.reviewers.length) lines.push(`- Reviewers: ${finding.reviewers.join(', ')}`);
  lines.push('');
  lines.push(String(finding.beschrijving || '').trim());
  lines.push('');
  const evidence = evidenceLines(finding);
  if (evidence.length) {
    lines.push('## Bewijs', '');
    lines.push(...evidence);
    lines.push('');
  }
  if (finding.fix) {
    lines.push('## Voorgestelde fix', '');
    lines.push(finding.fix);
    lines.push('');
  }
  if (Array.isArray(finding.bestanden) && finding.bestanden.length) {
    lines.push(`Bestanden: ${finding.bestanden.map((file) => `\`${file}\``).join(', ')}`);
    lines.push('');
  }
  lines.push('Nog niet door een mens bekeken; beoordeel eerst of dit echt een issue is en of het al bestaat.');
  lines.push('');
  lines.push(`releasegate-afdruk: ${print}`);
  lines.push(`<!-- releasegate:${print} -->`);
  return lines.join('\n');
}

export function buildIssueConcepts(findings) {
  const concepts = [];
  for (const finding of findings) {
    if (finding.ernst === 'blokkerend') continue;
    const title = `[release] ${String(finding.titel || '').trim()}`.slice(0, 120);
    concepts.push({
      fp: finding.afdruk || fingerprint(finding),
      titel: title,
      labels: issueLabels(finding),
      body: issueBody(finding),
      ernst: finding.ernst,
      aspect: finding.aspect,
    });
  }
  return concepts;
}

function ghPath() {
  if (process.env.GH) return process.env.GH;
  const windowsGh = 'C:\\Program Files\\GitHub CLI\\gh.exe';
  return process.platform === 'win32' && fs.existsSync(windowsGh) ? windowsGh : 'gh';
}

function gh(args) {
  const result = spawnSync(ghPath(), args, { encoding: 'utf8', maxBuffer: 32 << 20 });
  return {
    code: typeof result.status === 'number' ? result.status : 2,
    out: result.stdout || '',
    err: (result.stderr || '').trim(),
    error: result.error ? result.error.message : '',
  };
}

// Maakt de concepten aan via gh: eerst zoeken op de afdruk, anders aanmaken met bestaande labels.
// Wordt alleen met --create aangeroepen; de tests komen hier nooit.
export function createIssues(concepts) {
  const results = new Map();
  const labelResult = gh(['label', 'list', '--json', 'name', '--limit', '200']);
  let labels = null;
  try {
    labels = new Set(JSON.parse(labelResult.out).map((label) => label.name));
  } catch {
    labels = null; // gh niet beschikbaar: dan proberen we het zonder labelcontrole
  }
  for (const concept of concepts) {
    const search = gh(['issue', 'list', '--state', 'all', '--search', `releasegate-afdruk: ${concept.fp}`, '--json', 'number', '--limit', '1']);
    let existing = null;
    try { existing = (JSON.parse(search.out)[0] || {}).number || null; } catch { /* gh niet beschikbaar */ }
    if (existing) {
      results.set(concept.fp, { bestaat: existing });
      continue;
    }
    const usableLabels = concept.labels.filter((label) => !labels || labels.has(label));
    const result = gh(['issue', 'create', '--title', concept.titel, '--body', concept.body, ...usableLabels.flatMap((label) => ['--label', label])]);
    const match = /\/issues\/(\d+)/.exec(result.out || '');
    if (result.code === 0 && match) results.set(concept.fp, { aangemaakt: Number(match[1]) });
    else results.set(concept.fp, { fout: (result.err || result.error || result.out || `exit ${result.code}`).split(/\r?\n/).slice(-3).join(' ') });
  }
  return results;
}

export function renderIssueConceptsMd(concepts, { create = false, results = new Map() } = {}) {
  const lines = [];
  lines.push(`# Issue-concepten (${create ? 'aangemaakt via gh' : 'droge run, niets aangemaakt'})`, '');
  if (!concepts.length) lines.push('Geen belangrijke of nit-bevindingen zonder issue.', '');
  lines.push('Een concept is een voorstel; een mens beslist of het een issue wordt. Blokkerende bevindingen komen hier niet in: die worden eerst gerepareerd.', '');
  for (const concept of concepts) {
    lines.push(`## ${concept.titel}`, '');
    lines.push(`- Afdruk: \`${concept.fp}\``);
    lines.push(`- Ernst: ${concept.ernst} · aspect: ${concept.aspect}`);
    lines.push(`- Voorgestelde labels: ${concept.labels.join(', ')}`);
    const result = results.get(concept.fp);
    if (result) {
      if (result.bestaat) lines.push(`> bestaat al als #${result.bestaat}, niet opnieuw aangemaakt`);
      else if (result.aangemaakt) lines.push(`> aangemaakt: #${result.aangemaakt}`);
      else lines.push(`> aanmaken mislukt: ${result.fout}`);
    }
    lines.push('');
    lines.push(concept.body);
    lines.push('');
  }
  return lines.join('\n') + '\n';
}

export function buildGate(result) {
  return {
    status: result.status,
    commit: result.commit,
    blocking: result.blocking,
    belangrijk: result.belangrijk,
    nits: result.nits,
    aspecten: result.aspecten,
  };
}

// ---------------------------------------------------------------- CLI

function option(name, fallback) {
  const value = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

function readReports(maps) {
  const reports = [];
  for (const map of maps) {
    const names = fs.readdirSync(map)
      .filter((name) => /\.json$/i.test(name))
      .sort((left, right) => left.localeCompare(right));
    for (const name of names) {
      const file = path.join(map, name);
      try {
        reports.push({ bestand: file, data: JSON.parse(fs.readFileSync(file, 'utf8')) });
      } catch (error) {
        reports.push({ bestand: file, data: null, leesfout: error && error.message ? error.message : String(error) });
      }
    }
  }
  return reports;
}

function main() {
  const dirArg = option('dir', '');
  if (!dirArg) {
    console.error('Geen --dir=<reviewmap> opgegeven. Geef één of meer mappen met reviewrapporten, gescheiden door komma\'s.');
    return 2;
  }
  const maps = dirArg.split(',').map((item) => path.resolve(item.trim())).filter(Boolean);
  const missingMaps = maps.filter((map) => !fs.existsSync(map) || !fs.statSync(map).isDirectory());
  if (missingMaps.length) {
    console.error('Reviewmap niet gevonden: ' + missingMaps.join(', '));
    return 2;
  }
  const out = path.resolve(option('out', DEFAULT_OUT));
  const commitArg = option('commit', '');
  if (commitArg && !COMMIT_PATTERN.test(commitArg)) {
    console.error(`--commit="${commitArg}" is geen kleine hex-sha van 7 tot 40 tekens.`);
    return 2;
  }

  let requiredAspects = [];
  let requiredCommit = '';
  const requiredPath = option('required', '');
  if (requiredPath) {
    let required;
    try {
      required = JSON.parse(fs.readFileSync(path.resolve(requiredPath), 'utf8'));
    } catch (error) {
      console.error(`--required niet leesbaar: ${requiredPath} (${error.message})`);
      return 2;
    }
    if (!Array.isArray(required.aspecten)) {
      console.error(`--required heeft geen aspecten-lijst: ${requiredPath}`);
      return 2;
    }
    requiredAspects = required.aspecten.map((aspect) => String(aspect || '').trim().toLowerCase()).filter(Boolean);
    if (typeof required.commit === 'string' && COMMIT_PATTERN.test(required.commit)) requiredCommit = required.commit;
  }

  const reports = readReports(maps);
  const result = triage({
    reports,
    requiredAspects,
    commit: commitArg.toLowerCase(),
    requiredCommit,
  });

  const concepts = buildIssueConcepts(result.bevindingen);
  const create = flag('create');
  const issues = flag('issues') || create;
  const results = create ? createIssues(concepts) : new Map();

  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'findings.json'), JSON.stringify({
    status: result.status,
    commit: result.commit,
    aspecten: result.aspecten,
    rapporten: result.rapporten,
    ongeldig: result.ongeldig,
    bevindingen: result.bevindingen,
    blocking: result.blocking,
    belangrijk: result.belangrijk,
    nits: result.nits,
  }, null, 1) + '\n');
  fs.writeFileSync(path.join(out, 'bevindingen.md'), renderFindingsMd(result));
  fs.writeFileSync(path.join(out, 'gate.json'), JSON.stringify(buildGate(result), null, 1) + '\n');
  fs.writeFileSync(path.join(out, 'issues-concept.md'), renderIssueConceptsMd(concepts, { create, results }));

  const code = result.status === 'groen' ? 0 : result.status === 'rood' ? 1 : 3;
  console.log(`Release-review: ${result.status.toUpperCase()} (exit ${code})`);
  console.log(`  commit: ${result.commit || 'onbekend'}`);
  console.log(`  rapporten: ${result.rapporten.length}, ongeldig: ${result.ongeldig.length}`);
  console.log(`  aspecten: verplicht ${result.aspecten.verplicht.length}, gezien ${result.aspecten.gezien.length}, ontbrekend ${result.aspecten.ontbrekend.length}`);
  console.log(`  bevindingen: ${result.blocking.length} blokkerend, ${result.belangrijk.length} belangrijk, ${result.nits.length} nit`);
  if (result.aspecten.ontbrekend.length) console.log(`  ontbrekende aspecten: ${result.aspecten.ontbrekend.join(', ')}`);
  for (const invalid of result.ongeldig.slice(0, 5)) console.log(`  ongeldig: ${invalid.bestand}: ${invalid.fouten.join('; ')}`);
  if (issues) console.log(`  issue-concepten: ${concepts.length}${create ? ' (aangemaakt/gecontroleerd via gh)' : ' (droge run, --create maakt ze aan)'}`);
  console.log(`  Uitvoer: ${path.join(out, 'gate.json')}, ${path.join(out, 'bevindingen.md')}`);
  return code;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try { process.exit(main()); } catch (error) { console.error('findings crashte:', error && error.stack || error); process.exit(2); }
}

export { main };
