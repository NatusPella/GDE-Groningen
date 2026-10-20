// Publicatiecheck (#37, #62, #83): scant de getrackte bestanden van de repo vóór de zichtbaarheid wordt
// gewijzigd. Alleen lezen: het script publiceert, uploadt en wijzigt niets. Nooit .env lezen: private-only
// bestanden worden alleen op bestandsnaam herkend (git ls-files), nooit geopend. Gevonden geheimen worden
// als bestand:regel + patroonnaam gemeld, nooit als waarde.
//   node scripts/publish_check.mjs            rapport; exit 1 bij FAIL (WARN laat exit 0)
//   node scripts/publish_check.mjs --json     machine-leesbaar
//   node scripts/publish_check.mjs --history  ook auteurs/e-mailadressen in git log --all
//   node scripts/publish_check.mjs --no-text-audit   sla scripts/text_audit.mjs over
// Optioneel: een lokale, niet-getrackte lijst met namen die niet in de repo mogen staan
// (.publish-names.local, één naam per regel; staat in .gitignore) wordt als FAIL gemeld.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = new Set(['scripts/publish_check.mjs', 'scripts/publish_check_test.mjs']);

// Patronen worden uit stukjes opgebouwd, zodat dit bestand zichzelf niet raakt.
const j = (...p) => p.join('');
export const SECRET_PATTERNS = [
  { name: 'OpenAI/OpenRouter-sleutel', re: new RegExp(j('\\bsk-(?:or-v1-|proj-)?[A-Za-z0-9_-]{', '32,}')) },
  { name: 'Google-sleutel', re: new RegExp(j('\\bAI', 'za[0-9A-Za-z_-]{35}\\b')) },
  { name: 'GitHub-token', re: new RegExp(j('\\bgh[pousr]', '_[A-Za-z0-9]{30,}\\b')) },
  { name: 'GitHub-token (fijn)', re: new RegExp(j('\\bgithub_', 'pat_[A-Za-z0-9_]{40,}')) },
  { name: 'AWS-sleutel', re: new RegExp(j('\\bAK', 'IA[0-9A-Z]{16}\\b')) },
  { name: 'Slack-token', re: new RegExp(j('\\bxox[abprs]', '-[A-Za-z0-9-]{10,}')) },
  { name: 'privésleutelblok', re: new RegExp(j('-----BEGIN ', '(?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY')) },
  { name: 'sleutel/wachtwoord = "waarde"',
    re: /\b(?:api[_-]?key|secret|token|passw(?:or)?d|wachtwoord|sleutel)\b\s*[:=]\s*["'][A-Za-z0-9+/_\-.]{16,}["']/i },
];

export const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const EMAIL_OK = /(?:^noreply@github\.com$|@users\.noreply\.github\.com|@example\.(?:com|org|nl)|@localhost)$/i;
export const emailsIn = (line) => (line.match(EMAIL_RE) || []).filter((e) => !EMAIL_OK.test(e));

// Persoonlijke paden: thuismappen met een gebruikersnaam.
export const HOME_PATH_RE = /(?:[A-Za-z]:[\\/]+Users[\\/]+(?!Public\b|runneradmin\b|Default\b|<|%|\$|\{|user\b|name\b)[A-Za-z0-9._-]+|(?<![\w/.-])\/(?:Users|home)\/(?!runner\b|user\b|name\b|<|\$|\{|you\b)[a-z][A-Za-z0-9._-]*)/;

// Private-only: horen nooit getrackt te zijn. Alleen op bestandsnaam.
export const PRIVATE_FILE_RES = [
  /(^|\/)\.env(\..*)?$/, /\.(pem|p12|pfx|keystore|jks)$/i, /(^|\/)id_(rsa|ed25519|ecdsa)(\.pub)?$/,
  /^\.claude\//, /^game\/world\//, /^data\/cache\//, /^data\/satellite_reference\.jpg$/,
  /\.(mp4|mov)$/i, /^steam\/(content|output)\//, /^web-dist\//, /\.local$/,
];
const ENV_EXAMPLE = /(^|\/)\.env\.(example|sample|template)$/;

export const REQUIRED_FILES = [
  'LICENSE', 'LICENSE-CONTENT.md', 'NOTICE.md', 'README.md', 'SECURITY.md', 'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md', 'docs/LICENTIES.md', 'docs/MERKENREGISTER.md', 'docs/PRIVACY-EN-CREDITS.md',
  '.github/PULL_REQUEST_TEMPLATE.md', '.github/ISSUE_TEMPLATE/config.yml',
];
export const REQUIRED_GITIGNORE = ['.env', '.claude/', 'game/world/'];

// Workflows die publiceren, uploaden of zichtbaarheid wijzigen horen er niet in te staan zonder akkoord.
export const WORKFLOW_RISK = [
  { name: 'Pages-deploy', re: /deploy-pages|upload-pages-artifact|configure-pages/ },
  { name: 'release/upload', re: /gh\s+release\s+(create|upload)|upload-artifact|softprops\/action-gh-release/ },
  { name: 'zichtbaarheid', re: /visibility|--accept-visibility-change-consequences/ },
  { name: 'schrijfrechten', re: /(contents|pages|id-token)\s*:\s*write/ },
];

const BIG_WARN = 10 * 1024 * 1024, BIG_FAIL = 50 * 1024 * 1024;
const TEXT_EXT = /\.(md|txt|js|mjs|cjs|json|yml|yaml|html|css|sh|bat|py|toml|cfg|csv|overpass|gdt|svg)$/i;
// Bestanden met bewust veel contactgegevens uit OpenStreetMap (ODbL): als aparte WARN, niet FAIL.
const OSM_DATA = /^data\/.*\.(json|overpass)$|^data\/.*\.json\.gz$/;

// ---------------------------------------------------------------- pure functies (getest)

/** Scant de tekst van één bestand. Geeft bevindingen {level, rule, file, line, detail} (nooit de waarde). */
export function scanText(file, text, { names = [] } = {}) {
  const out = [];
  const lines = text.split(/\r?\n/);
  const osm = OSM_DATA.test(file);
  const lock = /(^|\/)package-lock\.json$/.test(file); // e-mailadressen van derden in npm-metadata
  let osmEmails = 0;
  lines.forEach((l, i) => {
    const line = i + 1;
    if (l.length > 4000 && !osm) l = l.slice(0, 4000);
    for (const p of SECRET_PATTERNS) if (p.re.test(l)) out.push({ level: 'FAIL', rule: 'geheim', file, line, detail: p.name });
    if (HOME_PATH_RE.test(l)) out.push({ level: 'FAIL', rule: 'thuispad', file, line, detail: 'pad met gebruikersnaam' });
    const em = lock ? [] : emailsIn(l);
    if (em.length) {
      if (osm) osmEmails += em.length;
      else out.push({ level: 'FAIL', rule: 'e-mailadres', file, line, detail: em.length + 'x e-mailadres' });
    }
    for (const n of names) if (n && l.toLowerCase().includes(n.toLowerCase())) out.push({ level: 'FAIL', rule: 'naam', file, line, detail: 'naam uit .publish-names.local' });
  });
  if (osmEmails) out.push({ level: 'WARN', rule: 'osm-contactgegevens', file, line: 0, detail: osmEmails + ' e-mailadres(sen) uit OSM-tags (ODbL, eigenaar beslist, #62)' });
  return out;
}

/** Controleert de lijst getrackte bestanden op private-only namen. */
export function scanFileNames(files) {
  const out = [];
  for (const f of files) {
    if (ENV_EXAMPLE.test(f)) continue;
    for (const re of PRIVATE_FILE_RES) if (re.test(f)) { out.push({ level: 'FAIL', rule: 'private-only', file: f, line: 0, detail: 'hoort niet getrackt te zijn' }); break; }
  }
  return out;
}

export function scanSizes(sized) {
  const out = [];
  for (const { file, size } of sized) {
    if (size >= BIG_FAIL) out.push({ level: 'FAIL', rule: 'groot-bestand', file, line: 0, detail: (size / 1048576).toFixed(1) + ' MB (GitHub weigert 100 MB, waarschuwt vanaf 50 MB)' });
    else if (size >= BIG_WARN) out.push({ level: 'WARN', rule: 'groot-bestand', file, line: 0, detail: (size / 1048576).toFixed(1) + ' MB' });
  }
  return out;
}

export function scanRequired(files, gitignoreText) {
  const set = new Set(files);
  const out = [];
  for (const f of REQUIRED_FILES) if (!set.has(f)) out.push({ level: 'FAIL', rule: 'ontbrekend', file: f, line: 0, detail: 'verplicht voor publicatie' });
  if (!set.has('licenses/') && !files.some((f) => f.startsWith('licenses/'))) out.push({ level: 'FAIL', rule: 'ontbrekend', file: 'licenses/', line: 0, detail: 'licentieteksten van derden' });
  const gi = (gitignoreText || '').split(/\r?\n/).map((s) => s.trim());
  for (const g of REQUIRED_GITIGNORE) if (!gi.includes(g)) out.push({ level: 'FAIL', rule: 'gitignore', file: '.gitignore', line: 0, detail: g + ' ontbreekt' });
  return out;
}

/** Alleen met de hand te starten (workflow_dispatch, geen push/pull_request/schedule)? Dan publiceert het niet vanzelf. */
export function isManualOnly(text) {
  const on = text.match(/^on:[ \t]*\r?\n((?:[ \t]+.*\r?\n?|[ \t]*\r?\n)*)/m);
  if (!on) return false;
  const keys = [...on[1].matchAll(/^ {2}([A-Za-z_]+):/gm)].map((m) => m[1]);
  return keys.length > 0 && keys.every((k) => k === 'workflow_dispatch');
}

export function scanWorkflow(file, text) {
  const out = [];
  const manual = isManualOnly(text);
  text.split(/\r?\n/).forEach((l, i) => {
    if (/^\s*#/.test(l)) return;
    for (const r of WORKFLOW_RISK) {
      if (!r.re.test(l)) continue;
      out.push(manual
        ? { level: 'WARN', rule: 'workflow-handmatig', file, line: i + 1, detail: r.name + ' (alleen workflow_dispatch: start niet vanzelf; eigenaar beslist, #83)' }
        : { level: 'FAIL', rule: 'workflow-publiceert', file, line: i + 1, detail: r.name });
    }
  });
  return out;
}

export function scanAuthors(lines) { // regels "naam <tab> e-mail"
  const out = [];
  const bad = new Set();
  for (const l of lines) {
    const [, email = ''] = l.split('\t');
    if (email && !/@users\.noreply\.github\.com$|^noreply@github\.com$/i.test(email)) bad.add(email);
  }
  for (const e of bad) out.push({ level: 'FAIL', rule: 'historie-e-mail', file: 'git log', line: 0, detail: 'auteur-e-mail anders dan noreply' });
  return out;
}

// ---------------------------------------------------------------- uitvoeren

const git = (...a) => spawnSync('git', a, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });

export function run({ history = false, textAudit = true } = {}) {
  const findings = [];
  const files = git('ls-files', '-z').stdout.split('\0').filter(Boolean);
  findings.push(...scanFileNames(files));
  const privateNames = new Set(findings.map((f) => f.file));
  const gi = fs.existsSync(path.join(REPO, '.gitignore')) ? fs.readFileSync(path.join(REPO, '.gitignore'), 'utf8') : '';
  findings.push(...scanRequired(files, gi));
  let names = [];
  const nf = path.join(REPO, '.publish-names.local');
  if (fs.existsSync(nf)) names = fs.readFileSync(nf, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const sized = [];
  for (const f of files) {
    const abs = path.join(REPO, f);
    let st; try { st = fs.statSync(abs); } catch { continue; }
    sized.push({ file: f, size: st.size });
    if (SELF.has(f) || privateNames.has(f) || !TEXT_EXT.test(f) || st.size > 40 * 1048576) continue;
    if (/(^|\/)\.env/.test(f)) continue; // nooit openen
    const text = fs.readFileSync(abs, 'utf8');
    findings.push(...scanText(f, text, { names }));
    if (f.startsWith('.github/workflows/')) findings.push(...scanWorkflow(f, text));
  }
  findings.push(...scanSizes(sized));
  if (history) {
    const r = git('log', '--all', '--format=%an\t%ae\t%cn\t%ce');
    const lines = [];
    for (const l of r.stdout.split(/\r?\n/).filter(Boolean)) { const [an, ae, cn, ce] = l.split('\t'); lines.push(an + '\t' + ae, cn + '\t' + ce); }
    findings.push(...scanAuthors(lines));
    const nm = new Set(lines.map((l) => l.split('\t')[0]));
    findings.push({ level: 'INFO', rule: 'historie-namen', file: 'git log', line: 0, detail: 'auteursnamen: ' + [...nm].sort().join(', ') + ' (eigenaar beslist over echte naam, #62)' });
  }
  if (textAudit) {
    const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/text_audit.mjs')], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 });
    if (r.status !== 0) findings.push({ level: 'FAIL', rule: 'speltekst', file: 'scripts/text_audit.mjs', line: 0, detail: 'tekstaudit heeft open bevindingen (draai hem apart)' });
  }
  return { findings, fileCount: files.length };
}

function main() {
  const args = process.argv.slice(2);
  const { findings, fileCount } = run({ history: args.includes('--history'), textAudit: !args.includes('--no-text-audit') });
  const fails = findings.filter((f) => f.level === 'FAIL');
  if (args.includes('--json')) console.log(JSON.stringify({ fileCount, findings }, null, 2));
  else {
    for (const f of findings) console.log(`${f.level} ${f.rule} ${f.file}${f.line ? ':' + f.line : ''} ${f.detail}`);
    console.log(`\n${fileCount} getrackte bestanden, ${fails.length} FAIL, ${findings.filter((f) => f.level === 'WARN').length} WARN.`);
    console.log('Dit vervangt gitleaks niet: draai `gitleaks detect` vlak voor Public (docs/PUBLICEREN.md).');
  }
  process.exit(fails.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
