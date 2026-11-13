// Regels- en designaudit op de release-diff: kijkt alleen naar toegevoegde regels en nieuwe
// bestanden sinds de vorige tag, en toetst die aan de meetbare regels uit AGENTS.md (constitutie
// 1-5), .specs-fire/standards/ui-taal.md en DESIGN_SYSTEM.md.
//
//   node scripts/release/rules_audit.mjs [--from=<ref>] [--diff=<bestand>] [--out=<map>] [--streng]
//
// Zonder --diff wordt `git diff <from>..HEAD` opgehaald; <from> is standaard de laatste tag.
// Uitvoer: <out>/rules-gate.json en <out>/findings/auto-rules.json (een array bevindingen
// volgens scripts/release/findings-schema.json). Exitcodes: 0 geen blokkerend, 1 minstens één
// blokkerend (met --streng telt belangrijk ook), 2 fout (geen bruikbare diff), 3 niets te
// toetsen (geen toegevoegde regels).
//
// De diff- en regelanalyse is puur en testbaar: parseUnifiedDiff() en auditLines() hangen niet
// van git of van de schijf af. Alleen de CLI haalt de diff op en leest het merkenregister.
//
// Scope-keuzes (bewust, om vals alarm te voorkomen): de tekstregels (winter, 'de Grunn', merken)
// gelden voor spelinhoud onder game/ en web/; hulpmiddelen (scripts/, .github/), tests
// (_test.*) en documentatie (docs/) bevatten de verboden woorden zelf als detectielijst,
// fixture of uitleg en zijn geen speltekst. De netwerkregel geldt alleen voor game/js.
// Persoonsnamen zijn hier niet opnieuw opgesomd: die dekt scripts/text_audit.mjs (PEOPLE).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { checkDesignLine, designCandidates, stripComments } from './design_rules.mjs';
import { nederlandseNaam } from '../naamtaal_check.mjs';
import { parseRegister } from '../merkenregister_check.mjs';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Spelinhoud waar de taal- en merkenregels voor gelden.
const CONTENT = /^(?:game|web)\//;
const GAME_JS = /^game\/js\/.+\.(?:m?js|cjs)$/;
const CODE_FILE = /\.(?:m?js|cjs|ts|py|sh|bat|ps1|json|ya?ml)$/i;
const TOOLING = /^(?:scripts\/|\.github\/)/;
const TEST_FILE = /(?:^|\/)[^/]*_test\.(?:mjs|cjs|js)$/;
const isTooling = (file) => TOOLING.test(file) || TEST_FILE.test(file);

// Winterwoorden uit AGENTS.md constitutie 3 (altijd zomer); dezelfde lijst als
// scripts/text_audit.mjs, zodat dit script en de tekstaudit hetzelfde oordelen.
const WINTER = [
  /\bsneeuw\w*/i, /\bwinter\w*/i, /\bkerst(?!ens?\b)\w*/i, /\bvorst\b/i,
  /\bijs(?:baan|banen|vrij|pret|kap|schol|beer|berg|pegel|zeil\w*)?\b/i, /\bijzel\w*/i,
  /\bschaats\w*/i, /\bbevroren\b/i, /\bbesneeuwd\w*/i, /\bsinterklaas\w*/i, /\boud en nieuw\b/i,
  /\boliebol\w*/i, /\belfsteden\w*/i, /\bgladheid\b/i, /\bstrooizout\b/i, /\bwinterbanden\b/i,
  /\bkachel\w*/i, /\bhagel(?!geweer)\w*/i, /\bsnow\b/i, /\bchristmas\b/i, /\bice\b/i,
  /\bdooi\w*/i, /\bijskrabber\w*/i, /\bgevroren\b/i, /\bvriest\b/i, /\bvriezen\b/i,
  /\bnatuurijs\b/i, /\bsleeën\b/i, /\bsledes?\b/i, /\boudjoar\w*/i, /\bnajaar\w*/i,
  /\bherfst\w*/i, /\bvoorjaar\w*/i, /\b(?:november|december|januari|februari)\b/i,
];
const DE_GRUNN = /\bde Grunn\b(?!e|\w)/i;
const FETCH_CODE = /(?<![\w$])fetch\s*\(|\bXMLHttpRequest\b/;
const URL_ANY = /\bhttps?:\/\/[^\s'"`)]+|\bwww\.[a-z0-9-]+\.[a-z]{2,}/i;
const ENV_REF = /(?<![\w.])\.env\b/;
const STORAGE_CALL = /(?:localStorage|sessionStorage)\s*\.\s*(?:setItem|getItem|removeItem)\s*\(\s*(?:([A-Za-z_$][\w$]*)|(['"`])([^'"`]*)\2)/g;
const CONST_STRING = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"`])([^'"`]*)\2/g;
const TODO_RE = /\b(?:TODO|FIXME|HACK|XXX)\b/;
const NEW_JS = /^game\/js\/.+\.(?:m?js|cjs)$/;

const normalize = (file) => String(file || '').replaceAll('\\', '/');
const quote = (text) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 140);

function evidence(file, line, text) {
  return line > 0 ? `${file}:${line}: ${quote(text)}` : `${file}: nieuw bestand: ${quote(text)}`;
}

function finding({ file, line = 0, text = '', ernst, categorie, titel, beschrijving, fix, bron = 'rules' }) {
  return {
    bron,
    aspect: bron === 'design' ? 'design' : 'rules',
    ernst,
    categorie,
    titel,
    beschrijving,
    bewijs: [evidence(normalize(file), line, text)],
    bestanden: [normalize(file)],
    fix,
    reviewer: 'rules_audit',
  };
}

// ---------------------------------------------------------------- diff parsing

/**
 * Parseert een unified diff (zoals `git diff`) naar de toegevoegde regels met hun
 * regelnummer in het nieuwe bestand. Alleen `+`-regels tellen, plus de volledige inhoud
 * van nieuwe bestanden (die staat als `+`-regels in de diff). Puur en testbaar.
 *
 * @param {string} tekst
 * @returns {{files: string[], addedFiles: string[], deletedFiles: string[],
 *            addedLines: {file: string, line: number, text: string}[]}}
 */
export function parseUnifiedDiff(tekst) {
  const addedLines = [];
  const files = [];
  const addedFiles = [];
  const deletedFiles = [];
  let current = null; // pad in het nieuwe bestand
  let oldPath = null; // pad in het oude bestand (voor een verwijderd bestand)
  let isNew = false;
  let deleted = false;
  let newLine = 0;
  let inHunk = false;

  const schoon = (p) => {
    let s = String(p || '').trim();
    if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).replaceAll('\\"', '"').replaceAll('\\\\', '\\');
    if (s.startsWith('b/') || s.startsWith('a/')) s = s.slice(2);
    return s;
  };

  for (const rawRegel of String(tekst ?? '').split(/\r?\n/)) {
    const regel = rawRegel.replace(/\r$/, '');

    if (regel.startsWith('diff --git ')) {
      current = null;
      oldPath = null;
      isNew = false;
      deleted = false;
      inHunk = false;
      continue;
    }
    if (regel.startsWith('new file mode')) { isNew = true; continue; }
    if (regel.startsWith('deleted file mode')) { deleted = true; continue; }
    if (regel.startsWith('--- ')) {
      const p = regel.slice(4).trim();
      if (p === '/dev/null') isNew = true;
      else oldPath = schoon(p);
      continue;
    }
    if (regel.startsWith('+++ ')) {
      const p = regel.slice(4).trim();
      if (p === '/dev/null') {
        deleted = true;
        current = null;
        if (oldPath && !deletedFiles.includes(oldPath)) deletedFiles.push(oldPath);
        continue;
      }
      current = schoon(p);
      if (!files.includes(current)) files.push(current);
      if (isNew && !addedFiles.includes(current)) addedFiles.push(current);
      if (deleted && !deletedFiles.includes(current)) deletedFiles.push(current);
      inHunk = false;
      continue;
    }
    if (regel.startsWith('@@')) {
      const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(regel);
      if (!m) { inHunk = false; continue; }
      newLine = Number(m[3]);
      inHunk = true;
      continue;
    }
    if (!inHunk || !current) continue;

    const prefix = regel[0] ?? ' ';
    if (prefix === '+') {
      addedLines.push({ file: current, line: newLine, text: regel.slice(1) });
      newLine += 1;
    } else if (prefix === ' ') {
      newLine += 1;
    } else if (prefix === '-') {
      // telt niet mee in het nieuwe bestand
    } else if (prefix === '\\') {
      // "\ No newline at end of file"
    } else {
      // onbekende regel binnen een hunk: de hunk is klaar
      inHunk = false;
    }
  }

  return { files, addedFiles, deletedFiles, addedLines };
}

// ---------------------------------------------------------------- merkenregister

/**
 * De echte merken uit sectie 3 van docs/MERKENREGISTER.md ("Echte merken die bewust niet
 * voorkomen"). Puur op de markdown-tekst, zodat de test een eigen register kan voeden.
 */
export function parseRealBrands(md) {
  const bron = String(md ?? '');
  const start = bron.search(/^## +3\./m);
  if (start < 0) return [];
  const rest = bron.slice(start);
  const eind = rest.search(/^## +4\./m);
  const sectie = eind < 0 ? rest : rest.slice(0, eind);
  const namen = [];
  for (const regel of sectie.split(/\r?\n/)) {
    const m = /^-\s+(?:\*\*[^*]+\*\*:\s*)?(.+)$/.exec(regel.trim());
    if (!m) continue;
    for (let item of m[1].replace(/[.;]+$/, '').split(',')) {
      item = item.trim().replace(/^en\s+/i, '').replace(/\s+en\s+andere.*$/i, '').trim();
      if (!/^[A-Z][\p{L}\p{N}'’&.\- ]{1,39}$/u.test(item)) continue;
      if (/^(?:En|Andere|Bekende|Regionale|Leden|Plus)$/u.test(item)) continue;
      namen.push(item);
    }
  }
  return [...new Set(namen)];
}

/** Leest het merkenregister: echte merken (sectie 3), riskante verzonnen namen ('let op'). */
export function loadRegisterData(repoRoot = REPO) {
  const md = fs.readFileSync(path.join(repoRoot, 'docs', 'MERKENREGISTER.md'), 'utf8');
  const rows = parseRegister(md);
  return {
    realBrands: parseRealBrands(md),
    sensitive: rows.filter((r) => /^let op/i.test(r.beoordeling))
      .map((r) => ({ naam: r.naam, bron: normalize(r.bron), beoordeling: r.beoordeling })),
    rows,
  };
}

// ---------------------------------------------------------------- de regels

const brandRegexes = new Map();
function brandRegex(term) {
  let re = brandRegexes.get(term);
  if (!re) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu');
    brandRegexes.set(term, re);
  }
  return re;
}

function findBrands(text, brands) {
  const hits = [];
  for (const term of brands) if (brandRegex(term).test(text)) hits.push(term);
  return [...new Set(hits)];
}

/** Eén opslagsleutel beoordelen: gde- is de afspraak, gte- is de oude migratiesleutel. */
export function storageKeySeverity(key) {
  const k = String(key ?? '');
  if (k.startsWith('gde-')) return null;
  if (k.startsWith('gte-')) return 'belangrijk';
  if (k.includes('${')) return null; // dynamische sleutel: niet te beoordelen zonder context
  return 'blokkerend';
}

/**
 * Keurt de toegevoegde regels van een diff. Puur: de merkenlijst en het register komen als
 * opties binnen, zodat de test ze kan voeden. Geeft de bevindingen en de telling per regelsoort.
 *
 * @param {{file: string, line: number, text: string}[]} addedLines
 * @param {string[]} [addedFiles]
 * @param {{brands?: string[], sensitive?: {naam: string, bron: string, beoordeling: string}[]}} [options]
 */
export function auditLines(addedLines = [], addedFiles = [], options = {}) {
  const findings = [];
  const brands = options.brands || [];
  const sensitive = options.sensitive || [];
  const perRegel = {
    kleur: 0, typografie: 0, fontgrootte: 0, important: 0,
    grunn: 0, winter: 0, merken: 0, netwerk: 0, env: 0, opslagsleutel: 0, todo: 0, bestandsnaam: 0,
  };
  const gezien = new Set();
  const voegToe = (f, regelId) => {
    const sleutel = `${regelId}|${f.bestanden[0]}|${f.bewijs[0]}`;
    if (gezien.has(sleutel)) return;
    gezien.add(sleutel);
    findings.push(f);
  };

  for (const item of addedLines) {
    const file = normalize(item.file);
    const line = Number(item.line) || 0;
    const text = String(item.text ?? '');

    // Design: kleuren, typografie en !important.
    const kandidaten = designCandidates(file, text);
    for (const soort of ['kleur', 'typografie', 'fontgrootte', 'important']) if (kandidaten[soort]) perRegel[soort] += 1;
    if (kandidaten.kleur || kandidaten.typografie || kandidaten.fontgrootte || kandidaten.important) {
      for (const f of checkDesignLine({ file, line, text })) voegToe(f, `design-${f.titel}`);
    }

    // Tekstregels: alleen op spelinhoud (geen tooling, tests of documentatie).
    if (CONTENT.test(file)) {
      const clean = stripComments(text, file);
      perRegel.winter += 1;
      perRegel.merken += 1;
      if (/grunn/i.test(clean)) perRegel.grunn += 1;

      if (DE_GRUNN.test(clean)) {
        voegToe(finding({
          file, line, text, ernst: 'blokkerend', categorie: 'taal',
          titel: "'de Grunn' in speltekst",
          beschrijving: "De eigennaam is 'Grunn', nooit 'de Grunn' (AGENTS.md constitutie 1; tekstaudit regel de-grunn).",
          fix: "Vervang 'de Grunn' door 'Grunn'.",
        }), 'grunn');
      }

      const winter = WINTER.filter((re) => re.test(clean)).map((re) => re.exec(clean)[0]);
      if (winter.length) {
        voegToe(finding({
          file, line, text, ernst: 'blokkerend', categorie: 'constitutie',
          titel: 'Winterwoord in speltekst',
          beschrijving: `Het spel is altijd zomer, ook in tekst en commentaar van spelinhoud: ${[...new Set(winter)].join(', ')} `
            + '(AGENTS.md constitutie 3).',
          fix: 'Haal het winterwoord weg of vervang het door een zomerse variant.',
        }), 'winter');
      }

      const merken = findBrands(clean, brands);
      if (merken.length) {
        voegToe(finding({
          file, line, text, ernst: 'belangrijk', categorie: 'constitutie',
          titel: 'Echte merknaam in speltekst',
          beschrijving: `Echte merken horen niet in speltekst of beeld (AGENTS.md constitutie 2): ${merken.join(', ')}. `
            + 'Echte plaatsen mogen; merken en bedrijven krijgen een verzonnen naam (docs/MERKENREGISTER.md).',
          fix: 'Vervang de merknaam door een verzonnen parodie en leg hem vast in docs/MERKENREGISTER.md.',
        }), 'merken');
      }

      for (const row of sensitive) {
        if (!row.naam || file === row.bron) continue;
        if (!brandRegex(row.naam).test(clean)) continue;
        voegToe(finding({
          file, line, text, ernst: 'belangrijk', categorie: 'constitutie',
          titel: 'Naam met merkenrisico buiten zijn bronbestand',
          beschrijving: `"${row.naam}" staat in het merkenregister met beoordeling "${row.beoordeling}" `
            + `(klankgelijkenis met een echt merk) en hoort bij ${row.bron}; hij duikt nu ergens anders op.`,
          fix: 'Controleer of de naam hier bewust staat en werk docs/MERKENREGISTER.md bij, of gebruik een eigen naam.',
        }), 'merken');
      }
    }

    // Netwerk: geen nieuwe externe verbindingen in game/js (constitutie 4/5).
    if (GAME_JS.test(file)) {
      perRegel.netwerk += 1;
      const clean = stripComments(text, file);
      if (FETCH_CODE.test(clean) || URL_ANY.test(clean)) {
        voegToe(finding({
          file, line, text, ernst: 'blokkerend', categorie: 'privacy',
          titel: 'Nieuwe externe verbinding in game/js',
          beschrijving: 'Het spel stuurt niets naar buiten en haalt alleen openbare gegevens op via de goedgekeurde weg '
            + '(AGENTS.md constitutie 4/5). Een nieuwe fetch, XMLHttpRequest of webadres hoort eerst langs een uitzondering.',
          fix: 'Gebruik de bestaande goedgekeurde weg (STUN/broker/live bus) of haal de verbinding weg; leg een uitzondering vast.',
        }), 'netwerk');
      } else if (URL_ANY.test(text)) {
        voegToe(finding({
          file, line, text, ernst: 'belangrijk', categorie: 'privacy',
          titel: 'Webadres in commentaar',
          beschrijving: 'Geen spelgedrag, maar wel een echt webadres in de code van het spel. '
            + 'Controleer of dit een bronvermelding is en geen nieuwe externe verbinding.',
          fix: 'Verwijder het adres of maak van de verwijzing een bronvermelding zonder klikbare URL.',
        }), 'netwerk');
      }
    }

    // Geheimen: .env noemen of lezen in code (constitutie 5).
    if (CODE_FILE.test(file) && !isTooling(file)) {
      perRegel.env += 1;
      const clean = stripComments(text, file);
      const genoemd = /['"`]\.env\b/.test(text) || ENV_REF.test(clean);
      if (genoemd) {
        voegToe(finding({
          file, line, text, ernst: 'blokkerend', categorie: 'geheimen',
          titel: '.env in code',
          beschrijving: 'Niemand leest, print of noemt .env in code (AGENTS.md constitutie 5). '
            + 'Alleen de TTS-scripts gebruiken de gateway van de eigenaar op een andere manier.',
          fix: 'Haal de .env-verwijzing weg; gebruik geen sleutel in de spelcode.',
        }), 'env');
      }
    }

    // Opslagsleutel: aparte pass (zie auditStorage) om const-verwijzingen te kunnen volgen.
    if (CODE_FILE.test(file) && !isTooling(file) && /localStorage/.test(text)) perRegel.opslagsleutel += 1;

    // TODO/FIXME/HACK in toegevoegde code.
    if (CODE_FILE.test(file) && !isTooling(file) && TODO_RE.test(text)) {
      perRegel.todo += 1;
      voegToe(finding({
        file, line, text, ernst: 'nit', categorie: 'codekwaliteit',
        titel: 'TODO/FIXME/HACK in toegevoegde code',
        beschrijving: 'Een nieuwe tijdelijke aantekening in de code. Los het op of maak er een issue van voordat dit mee gaat.',
        fix: 'Los de aantekening op of verplaats hem naar een issue op het bord.',
      }), 'todo');
    }
  }

  // Opslagsleutels: dezelfde regels, maar met de const-verwijzingen per bestand erbij.
  const storageFindings = auditStorageOrdered(addedLines);
  for (const f of storageFindings) {
    const sleutel = `opslag|${f.bestanden[0]}|${f.bewijs[0]}`;
    if (!gezien.has(sleutel)) { gezien.add(sleutel); findings.push(f); }
  }

  // Nieuwe bestandsnaam in het Nederlands (ADR 0027; naamtaal_check is de bron).
  for (const bestand of addedFiles) {
    const f = normalize(bestand);
    if (!NEW_JS.test(f)) continue;
    perRegel.bestandsnaam += 1;
    if (!nederlandseNaam(path.basename(f))) continue;
    voegToe(finding({
      file: f, text: path.basename(f), ernst: 'belangrijk', categorie: 'naamgeving',
      titel: 'Nederlandse bestandsnaam in een nieuw bestand',
      beschrijving: 'Code, bestandsnamen en identifiers zijn Engels (ADR 0027, AGENTS.md Code). '
        + `"${path.basename(f)}" is een nieuwe Nederlandse bestandsnaam; naamtaal_check keurt dit ook.`,
      fix: 'Gebruik een Engelse bestandsnaam en houd de spelertekst Nederlands.',
    }), 'bestandsnaam');
  }

  findings.sort((a, b) => {
    const rank = { blokkerend: 0, belangrijk: 1, nit: 2 };
    const fa = a.bestanden[0];
    const fb = b.bestanden[0];
    return fa.localeCompare(fb)
      || (rank[a.ernst] - rank[b.ernst])
      || String(a.titel).localeCompare(String(b.titel))
      || String(a.bewijs[0]).localeCompare(String(b.bewijs[0]));
  });

  const telling = {
    toegevoegd: addedLines.length,
    bestanden: new Set(addedLines.map((l) => normalize(l.file))).size,
    nieuweBestanden: addedFiles.length,
    perRegel,
    blokkerend: findings.filter((f) => f.ernst === 'blokkerend').length,
    belangrijk: findings.filter((f) => f.ernst === 'belangrijk').length,
    nit: findings.filter((f) => f.ernst === 'nit').length,
  };
  return { findings, telling };
}

// Houdt de regelnummers bij de opslagsleutelpass: de pass loopt in dezelfde volgorde als
// addedLines, dus de bevinding hoort bij de regel die de localStorage-aanroep bevat.
function auditStorageOrdered(addedLines) {
  const perFile = new Map();
  const uit = [];
  for (const { file, line, text } of addedLines) {
    const f = normalize(file);
    if (!CODE_FILE.test(f) || isTooling(f)) continue;
    if (!perFile.has(f)) perFile.set(f, new Map());
    const consts = perFile.get(f);
    for (const m of String(text).matchAll(CONST_STRING)) consts.set(m[1], m[3]);
    for (const m of String(text).matchAll(STORAGE_CALL)) {
      const key = m[3] !== undefined ? m[3] : consts.get(m[1]);
      if (key === undefined) continue;
      const ernst = storageKeySeverity(key);
      if (!ernst) continue;
      uit.push(finding({
        file: f, line, text, ernst, categorie: 'opslag',
        titel: ernst === 'blokkerend' ? 'Nieuwe opslagsleutel zonder gde-' : 'Oude gte-*-opslagsleutel in nieuwe code',
        beschrijving: ernst === 'blokkerend'
          ? `Nieuwe opslagsleutel "${key}" zonder de afgesproken prefix gde-. Opslagsleutels heten gde-* (AGENTS.md, Code).`
          : `De oude migratiesleutel "${key}" wordt gebruikt. Lezen mag voor de migratie; nieuwe sleutels heten gde-*.`,
        fix: 'Gebruik een sleutel met de prefix gde- (en laat de oude gte-*-migratie intact).',
      }));
    }
  }
  return uit;
}

// ---------------------------------------------------------------- CLI

const HELP = `Regels- en designaudit op de release-diff.

  node scripts/release/rules_audit.mjs [--from=<ref>] [--diff=<bestand>] [--out=<map>] [--streng]

  --from=<ref>     diff sinds deze ref (standaard: de laatste tag via git describe)
  --diff=<bestand> lees een bestaande unified diff in plaats van git diff
  --out=<map>      uitvoermap voor rules-gate.json en findings/auto-rules.json
  --streng         belangrijk telt ook als blokkerend

Exitcodes: 0 geen blokkerend, 1 blokkerend, 2 fout, 3 niets te toetsen.`;

function parseArgs(argv) {
  const args = { from: '', diff: '', out: '', streng: false, help: false };
  for (const a of argv) {
    if (a === '--streng') args.streng = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--from=')) args.from = a.slice('--from='.length);
    else if (a.startsWith('--diff=')) args.diff = a.slice('--diff='.length);
    else if (a.startsWith('--out=')) args.out = a.slice('--out='.length);
    else throw new Error(`onbekende optie: ${a}`);
  }
  return args;
}

function git(args) {
  return spawnSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 96 << 20 });
}

function lastTag() {
  const r = git(['describe', '--tags', '--abbrev=0']);
  return r.status === 0 ? String(r.stdout || '').trim() : '';
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function verbeterStreng(findings) {
  for (const f of findings) {
    if (f.ernst !== 'belangrijk') continue;
    f.ernst = 'blokkerend';
    f.beschrijving = `${f.beschrijving} (--streng: belangrijk telt als blokkerend)`.slice(0, 2000);
  }
}

function printSamenvatting({ bron, telling, findings, streng, uitMap }) {
  console.log(`Regels- en designaudit op de diff (${bron})`);
  console.log(`  toegevoegde regels: ${telling.toegevoegd} in ${telling.bestanden} bestanden (${telling.nieuweBestanden} nieuw)`);
  const p = telling.perRegel;
  console.log('  per regel bekeken: '
    + `kleur ${p.kleur}, lettertype ${p.typografie}, lettergrootte ${p.fontgrootte}, !important ${p.important}, `
    + `'de Grunn' ${p.grunn}, winter ${p.winter}, merken ${p.merken}, netwerk ${p.netwerk}, `
    + `.env ${p.env}, opslagsleutel ${p.opslagsleutel}, TODO ${p.todo}, bestandsnaam ${p.bestandsnaam}`);
  console.log(`  bevindingen: ${telling.blokkerend} blokkerend, ${telling.belangrijk} belangrijk, ${telling.nit} nit`
    + (streng ? ' (--streng)' : ''));
  const blokkades = findings.filter((f) => f.ernst === 'blokkerend');
  for (const f of blokkades.slice(0, 40)) console.log(`  BLOKKEREND ${f.bewijs[0]} — ${f.titel}`);
  if (blokkades.length > 40) console.log(`  ... en nog ${blokkades.length - 40} blokkerende bevindingen`);
  if (!blokkades.length) {
    for (const f of findings.filter((x) => x.ernst === 'belangrijk').slice(0, 10)) console.log(`  belangrijk ${f.bewijs[0]} — ${f.titel}`);
  }
  if (uitMap) console.log(`  uitvoer: ${uitMap}`);
}

function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    console.error(`rules_audit: ${e.message}`);
    console.error(HELP);
    return 2;
  }
  if (args.help) { console.log(HELP); return 0; }

  const repoRel = (p) => (path.isAbsolute(p) ? p : path.resolve(process.cwd(), p));
  let diffText = '';
  let bron = '';
  let from = args.from;
  try {
    if (args.diff) {
      diffText = fs.readFileSync(repoRel(args.diff), 'utf8');
      bron = `bestand ${args.diff}`;
    } else {
      if (!from) from = lastTag();
      if (!from) {
        console.error('rules_audit: geen git-tag gevonden; geef --from=<ref> of --diff=<bestand>.');
        return 2;
      }
      // Een ref is geen optie: weiger wat git als vlag zou lezen of rare tekens bevat.
      if (/^-|[\s'"`$;&|<>]/.test(from)) {
        console.error(`rules_audit: ongeldige ref "${from}".`);
        return 2;
      }
      const r = git(['diff', '--no-color', '--no-ext-diff', '--no-textconv', `${from}..HEAD`]);
      if (r.error || r.status !== 0) {
        console.error(`rules_audit: git diff ${from}..HEAD mislukt: ${r.error ? r.error.message : String(r.stderr || '').trim()}`);
        return 2;
      }
      diffText = String(r.stdout || '');
      bron = `git ${from}..HEAD`;
    }
  } catch (e) {
    console.error(`rules_audit: diff niet leesbaar: ${e.message}`);
    return 2;
  }

  const parsed = parseUnifiedDiff(diffText);
  let register = { realBrands: [], sensitive: [] };
  try {
    register = loadRegisterData(REPO);
  } catch (e) {
    console.error(`rules_audit: waarschuwing: merkenregister niet gelezen (${e.message}); merkenregel overgeslagen.`);
  }

  const { findings, telling } = auditLines(parsed.addedLines, parsed.addedFiles, {
    brands: register.realBrands,
    sensitive: register.sensitive,
  });
  if (args.streng) verbeterStreng(findings);
  if (args.streng) {
    telling.blokkerend = findings.filter((f) => f.ernst === 'blokkerend').length;
    telling.belangrijk = findings.filter((f) => f.ernst === 'belangrijk').length;
  }

  const uitMap = args.out
    ? path.resolve(args.out)
    : path.join(os.tmpdir(), 'gde-rules-audit', stamp());
  let code;
  if (!parsed.addedLines.length) code = 3;
  else code = telling.blokkerend > 0 ? 1 : 0;

  try {
    fs.mkdirSync(path.join(uitMap, 'findings'), { recursive: true });
    const gate = {
      tool: 'rules_audit',
      schema: 'rules-gate',
      versie: 1,
      gestart: new Date().toISOString(),
      from: from || null,
      to: 'HEAD',
      diffBron: bron,
      streng: Boolean(args.streng),
      status: code === 3 ? 'leeg' : code === 1 ? 'rood' : 'groen',
      exitcode: code,
      telling,
    };
    fs.writeFileSync(path.join(uitMap, 'rules-gate.json'), `${JSON.stringify(gate, null, 1)}\n`);
    fs.writeFileSync(path.join(uitMap, 'findings', 'auto-rules.json'), `${JSON.stringify(findings, null, 1)}\n`);
  } catch (e) {
    console.error(`rules_audit: uitvoer niet schrijfbaar: ${e.message}`);
    return 2;
  }

  printSamenvatting({ bron, telling, findings, streng: Boolean(args.streng), uitMap });
  if (code === 3) console.log('  niets te toetsen: de diff bevat geen toegevoegde regels.');
  return code;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}

export default { parseUnifiedDiff, parseRealBrands, loadRegisterData, auditLines, storageKeySeverity, auditStorageOrdered };
