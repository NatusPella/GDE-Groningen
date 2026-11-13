// Test voor de regels- en designaudit op de release-diff (#releasegate).
//
//   node scripts/release_designrules_test.mjs
//
// Gebruikt alleen synthetische diffs in een tijdelijke map; er is geen git, Electron of
// netwerk nodig. Test de pure functies (parseUnifiedDiff, checkDesignLine, auditLines) en de
// CLI-exitcodes met een diff-bestand.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { checkDesignLine } from './release/design_rules.mjs';
import { parseUnifiedDiff, parseRealBrands, auditLines } from './release/rules_audit.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT = path.join(ROOT, 'scripts', 'release', 'rules_audit.mjs');

let controles = 0;
let fouten = 0;
function ok(cond, wat) {
  controles += 1;
  if (!cond) { fouten += 1; console.log(`FAIL ${wat}`); }
}
const is = (a, b, wat) => ok(JSON.stringify(a) === JSON.stringify(b), `${wat} (kreeg ${JSON.stringify(a)}, verwacht ${JSON.stringify(b)})`);
const ernst = (findings) => findings.map((f) => f.ernst);
const bijTitel = (findings, deel) => findings.find((f) => f.titel.includes(deel));

// ---------------------------------------------------------------- hulpfuncties

function schrijf(tmp, naam, inhoud) {
  const p = path.join(tmp, naam);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, inhoud);
  return p;
}

function runCli(args) {
  const r = spawnSync(process.execPath, [AUDIT, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function leesJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function valideerBevinding(f, waar) {
  const verplicht = ['bron', 'aspect', 'ernst', 'categorie', 'titel', 'beschrijving'];
  ok(verplicht.every((k) => typeof f[k] === 'string' && f[k].length > 0), `${waar}: verplichte velden aanwezig`);
  ok(['design', 'rules'].includes(f.bron), `${waar}: bron design of rules`);
  ok(['design', 'rules'].includes(f.aspect), `${waar}: aspect design of rules`);
  ok(['blokkerend', 'belangrijk', 'nit'].includes(f.ernst), `${waar}: ernst is een schemawaarde`);
  ok(f.categorie.length >= 2 && f.categorie.length <= 40, `${waar}: categorie binnen 2-40 tekens`);
  ok(f.titel.length >= 4 && f.titel.length <= 120, `${waar}: titel binnen 4-120 tekens`);
  ok(f.beschrijving.length >= 10 && f.beschrijving.length <= 2000, `${waar}: beschrijving binnen 10-2000 tekens`);
  ok(Array.isArray(f.bewijs) && f.bewijs.length > 0 && f.bewijs.every((b) => typeof b === 'string' && b.length > 0), `${waar}: bewijs is een niet-lege array`);
  ok(Array.isArray(f.bestanden) && f.bestanden.every((b) => typeof b === 'string'), `${waar}: bestanden is een array`);
}

// ---------------------------------------------------------------- fixtures

// Een synthetische diff met een gewijzigd CSS-bestand, een gewijzigd JS-bestand en twee nieuwe
// bestanden. De regelnummers in het nieuwe bestand zijn bewust niet gelijk aan de oude.
const VUILE_DIFF = [
  'diff --git a/game/js/menu.css b/game/js/menu.css',
  'index 1111111..2222222 100644',
  '--- a/game/js/menu.css',
  '+++ b/game/js/menu.css',
  '@@ -10,2 +10,7 @@',
  ' .m-bp {',
  '-  color: #f0ede4;',
  '+  color: var(--ink, #f0ede4);',
  '+  color: #ff00ff;',
  "+  font-family: 'Comic Sans MS', sans-serif;",
  '+  font-size: 9px;',
  '+  background: #17301f !important;',
  ' }',
  'diff --git a/game/js/story.js b/game/js/story.js',
  'index 3333333..4444444 100644',
  '--- a/game/js/story.js',
  '+++ b/game/js/story.js',
  '@@ -1,1 +1,12 @@',
  ' // bestaand',
  "+const tekst = 'Welkom in de Grunn';",
  "+const seizoen = 'sneeuw in de winter';",
  "+const data = fetch('https://example.com/api');",
  "+const sleutel = '.env';",
  "+localStorage.setItem('settings', 'x');",
  '+// TODO: dit later',
  "+const merk = 'Heineken';",
  "+const kleur = '#ff00ff';",
  '+// geen winter, altijd zomer',
  '+const mode = process.env.NODE_ENV;',
  'diff --git a/game/js/verhaalstap.js b/game/js/verhaalstap.js',
  'new file mode 100644',
  'index 0000000..5555555',
  '--- /dev/null',
  '+++ b/game/js/verhaalstap.js',
  '@@ -0,0 +1,1 @@',
  '+export const step = 1;',
  '',
].join('\n');

const SCHONE_DIFF = [
  'diff --git a/game/js/menu.css b/game/js/menu.css',
  'index 1111111..2222222 100644',
  '--- a/game/js/menu.css',
  '+++ b/game/js/menu.css',
  '@@ -1,1 +1,2 @@',
  ' .gm {',
  '+  color: var(--ink, #f0ede4);',
  'diff --git a/game/js/story.js b/game/js/story.js',
  'index 3333333..4444444 100644',
  '--- a/game/js/story.js',
  '+++ b/game/js/story.js',
  '@@ -1,1 +1,2 @@',
  ' // bestaand',
  '+const stap = 2;',
  '',
].join('\n');

const ALLEEN_MERK_DIFF = [
  'diff --git a/game/js/story.js b/game/js/story.js',
  'index 3333333..4444444 100644',
  '--- a/game/js/story.js',
  '+++ b/game/js/story.js',
  '@@ -1,1 +1,2 @@',
  ' // bestaand',
  "+const merk = 'Heineken';",
  '',
].join('\n');

const LEGE_DIFF = [
  'diff --git a/game/js/story.js b/game/js/story.js',
  'index 3333333..4444444 100644',
  '--- a/game/js/story.js',
  '+++ b/game/js/story.js',
  '@@ -1,2 +1,1 @@',
  ' // bestaand',
  '-const oud = 1;',
  '',
].join('\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-rules-test-'));

try {
  // ---------------------------------------------------------------- parseUnifiedDiff
  const parsed = parseUnifiedDiff(VUILE_DIFF);
  is(parsed.files, ['game/js/menu.css', 'game/js/story.js', 'game/js/verhaalstap.js'], 'parse: alle gewijzigde bestanden');
  is(parsed.addedFiles, ['game/js/verhaalstap.js'], 'parse: nieuw bestand herkend');
  is(parsed.deletedFiles, [], 'parse: geen verwijderde bestanden');
  const cssRegels = parsed.addedLines.filter((l) => l.file === 'game/js/menu.css');
  is(cssRegels.map((l) => l.line), [11, 12, 13, 14, 15], 'parse: nieuwe regelnummers uit de hunk-header');
  is(cssRegels[1].text, '  color: #ff00ff;', 'parse: + eraf, inhoud heel');
  const storyRegels = parsed.addedLines.filter((l) => l.file === 'game/js/story.js');
  is(storyRegels.map((l) => l.line), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 'parse: doorlopende nummers over -regels heen');
  is(parseUnifiedDiff(LEGE_DIFF).addedLines.length, 0, 'parse: alleen verwijderingen geeft geen toegevoegde regels');
  is(parseUnifiedDiff('').addedLines.length, 0, 'parse: lege tekst');
  const bestandsnaamDiff = parseUnifiedDiff([
    'diff --git a/game/js/nieuw.js b/game/js/nieuw.js',
    'new file mode 100644',
    '--- /dev/null',
    '+++ b/game/js/nieuw.js',
    '@@ -0,0 +1,2 @@',
    '+een',
    '+twee',
    '',
  ].join('\n'));
  is(bestandsnaamDiff.addedLines.map((l) => [l.line, l.text]), [[1, 'een'], [2, 'twee']], 'parse: volledige inhoud van een nieuw bestand');
  const verwijderd = parseUnifiedDiff([
    'diff --git a/game/js/oud.js b/game/js/oud.js',
    'deleted file mode 100644',
    'index 3333333..0000000',
    '--- a/game/js/oud.js',
    '+++ /dev/null',
    '@@ -1,1 +0,0 @@',
    '-const oud = 1;',
    '',
  ].join('\n'));
  is(verwijderd.deletedFiles, ['game/js/oud.js'], 'parse: verwijderd bestand herkend');
  is(verwijderd.addedLines.length, 0, 'parse: verwijderd bestand heeft geen toegevoegde regels');
  const crlf = parseUnifiedDiff(VUILE_DIFF.replaceAll('\n', '\r\n'));
  is(crlf.addedLines.length, parsed.addedLines.length, 'parse: CRLF-diff geeft dezelfde regels');

  // ---------------------------------------------------------------- designregels
  const kleur = checkDesignLine({ file: 'game/js/menu.css', line: 12, text: '  color: #ff00ff;' });
  is(kleur.length, 1, 'design: losse hex geeft één bevinding');
  is([kleur[0].bron, kleur[0].aspect, kleur[0].ernst, kleur[0].categorie], ['design', 'design', 'blokkerend', 'design-system'], 'design: hex is blokkerend design-system');
  ok(kleur[0].bewijs[0].startsWith('game/js/menu.css:12:'), 'design: bewijs noemt bestand en regel');
  valideerBevinding(kleur[0], 'design hex');

  is(checkDesignLine({ file: 'game/js/menu.css', line: 1, text: '  color: #3fc97a;' }).length, 0, 'design: tokenwaarde mag');
  is(checkDesignLine({ file: 'game/js/menu.css', line: 1, text: '  background: var(--iets, #ff00ff);' }).length, 0, 'design: var()-terugval mag');
  is(checkDesignLine({ file: 'game/js/menu.css', line: 1, text: '/* #602: de kaartbalk */' }).length, 0, 'design: issuenummer in commentaar is geen kleur');
  is(checkDesignLine({ file: 'game/js/menu.css', line: 1, text: '  box-shadow: 0 2px 8px rgba(0,0,0,.4);' }).length, 0, 'design: zwarte slagschaduw mag');
  is(checkDesignLine({ file: 'game/js/menu.css', line: 1, text: '  color: rgb(1, 2, 3);' }).map((f) => f.ernst), ['blokkerend'], 'design: losse rgb() is blokkerend');
  const inline = checkDesignLine({ file: 'game/index.html', line: 4, text: '<span style="color:#ff00ff">x</span>' });
  is(inline.map((f) => f.ernst), ['blokkerend'], 'design: losse kleur in inline style is blokkerend');

  const font = checkDesignLine({ file: 'game/js/menu.css', line: 13, text: "  font-family: 'Comic Sans MS', sans-serif;" });
  is(font.map((f) => f.ernst), ['belangrijk'], 'design: onbekend lettertype is belangrijk');
  is(font[0].categorie, 'typografie', 'design: lettertype heeft categorie typografie');
  is(checkDesignLine({ file: 'game/js/menu.css', line: 1, text: "  font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif;" }).length, 0, 'design: vaste fontstack mag');
  is(checkDesignLine({ file: 'game/js/menu.css', line: 1, text: "  font-family: 'Big Shoulders Display';" }).length, 0, 'design: Big Shoulders voor het logo mag');

  const klein = checkDesignLine({ file: 'game/js/menu.css', line: 14, text: '  font-size: 9px;' });
  is(klein.map((f) => f.ernst), ['blokkerend'], 'design: 9 px is blokkerend');
  is(checkDesignLine({ file: 'game/js/menu.css', line: 1, text: '  font-size: 12px;' }).map((f) => f.ernst), ['belangrijk'], 'design: 12 px in een menu is belangrijk');
  is(checkDesignLine({ file: 'game/js/hud_panel.css', line: 1, text: '  font-size: 12px;' }).length, 0, 'design: 12 px buiten een menu mag');
  is(checkDesignLine({ file: 'game/js/menu.css', line: 1, text: '.m-kc { font-size: 10px; }' }).length, 0, 'design: toetsplaatje-inhoud mag kleiner');

  const belangrijk = checkDesignLine({ file: 'game/js/menu.css', line: 15, text: '  background: #17301f !important;' });
  is(belangrijk.map((f) => f.ernst), ['nit'], 'design: nieuwe !important is een nit');
  is(checkDesignLine({ file: 'game/js/scene3d.js', line: 1, text: "const kleur = '#ff00ff';" }).length, 0, 'design: canvaskleur in niet-UI-JS is geen UI-kleur');
  is(checkDesignLine({ file: 'game/js/hudcards.js', line: 1, text: "kaart.style.color = '#ff00ff';" }).map((f) => f.ernst), ['blokkerend'], 'design: JS die een UI-stijl zet valt onder de kleurregel');

  // ---------------------------------------------------------------- merkenregister
  const register = [
    '# Testregister',
    '## 3. Echte merken die bewust niet voorkomen',
    '',
    '- **auto**: Volkswagen, Mercedes, BMW en andere;',
    '- **personen**: bekende politici, sporters, artiesten en leden van het koningshuis.',
    '',
    '## 4. Echte namen die er wel in staan',
    '',
    '- **Plaatsen** mogen: Martinitoren, Diepenring.',
    '',
  ].join('\n');
  is(parseRealBrands(register), ['Volkswagen', 'Mercedes', 'BMW'], 'register: echte merken uit sectie 3, zonder "en andere"');
  is(parseRealBrands('- **auto**: Tesla;'), [], 'register: zonder sectie 3 geen merken');

  // ---------------------------------------------------------------- auditLines
  const regels = [
    { file: 'game/js/story.js', line: 2, text: "const tekst = 'Welkom in de Grunn';" },
    { file: 'game/js/story.js', line: 3, text: "const seizoen = 'sneeuw in de winter';" },
    { file: 'game/js/story.js', line: 3, text: '// geen winter, altijd zomer' },
    { file: 'game/js/story.js', line: 4, text: "const u = fetch('https://example.com/api');" },
    { file: 'game/js/story.js', line: 5, text: '// bron: https://example.com/uitleg' },
    { file: 'game/js/story.js', line: 6, text: "const p = '.env';" },
    { file: 'game/js/story.js', line: 7, text: 'const mode = process.env.NODE_ENV;' },
    { file: 'game/js/story.js', line: 8, text: "localStorage.setItem('settings', 'x');" },
    { file: 'game/js/story.js', line: 9, text: "localStorage.setItem('gde-settings', 'x');" },
    { file: 'game/js/story.js', line: 10, text: "localStorage.getItem('gte-save-v1');" },
    { file: 'game/js/story.js', line: 11, text: '// TODO: dit later' },
    { file: 'game/js/story.js', line: 12, text: "const merk = 'Heineken';" },
    { file: 'game/js/story.js', line: 13, text: "const naam = 'EIKEA';" },
    { file: 'game/js/shopdata.js', line: 5, text: "const keten = 'EIKEA';" },
    { file: 'scripts/release/hulp.mjs', line: 1, text: "const x = 'de Grunn'; fetch('https://example.com');" },
  ];
  const audit = auditLines(regels, ['game/js/verhaalstap.js', 'game/js/storystep.js'], {
    brands: ['Heineken'],
    sensitive: [{ naam: 'EIKEA', bron: 'game/js/shopdata.js', beoordeling: 'let op' }],
  });
  const titels = audit.findings.map((f) => f.titel).join(' | ');
  ok(Boolean(bijTitel(audit.findings, "'de Grunn'")), `audit: 'de Grunn' gevonden (${titels})`);
  ok(Boolean(bijTitel(audit.findings, 'Winterwoord')), 'audit: winterwoord in code gevonden');
  ok(!audit.findings.some((f) => f.bewijs[0].includes('geen winter')), 'audit: winter in commentaar telt niet');
  ok(Boolean(bijTitel(audit.findings, 'externe verbinding')), 'audit: fetch in game/js is blokkerend');
  ok(Boolean(bijTitel(audit.findings, 'Webadres in commentaar')), 'audit: webadres in commentaar is belangrijk');
  ok(Boolean(bijTitel(audit.findings, '.env')), 'audit: .env in code is blokkerend');
  ok(!audit.findings.some((f) => f.bewijs[0].includes('process.env')), 'audit: process.env is geen .env-verwijzing');
  ok(Boolean(bijTitel(audit.findings, 'zonder gde-')), 'audit: opslagsleutel zonder gde- is blokkerend');
  ok(Boolean(bijTitel(audit.findings, 'gte-')), 'audit: oude gte-*-sleutel is belangrijk');
  ok(!audit.findings.some((f) => f.bewijs[0].includes('gde-settings')), 'audit: gde-sleutel mag');
  ok(Boolean(bijTitel(audit.findings, 'TODO')), 'audit: TODO is een nit');
  ok(Boolean(bijTitel(audit.findings, 'Echte merknaam')), 'audit: echte merknaam is belangrijk');
  ok(Boolean(bijTitel(audit.findings, 'buiten zijn bronbestand')), 'audit: let-op-naam buiten zijn bron is belangrijk');
  ok(!audit.findings.some((f) => f.bestanden[0] === 'game/js/shopdata.js'), 'audit: let-op-naam in zijn eigen bronbestand telt niet');
  ok(!audit.findings.some((f) => f.bestanden[0].startsWith('scripts/')), 'audit: hulpmiddelen vallen buiten de tekstregels');
  ok(Boolean(audit.findings.find((f) => f.categorie === 'naamgeving')), 'audit: Nederlandse bestandsnaam in nieuw bestand');
  is(audit.telling.toegevoegd, regels.length, 'audit: telling telt de toegevoegde regels');
  ok(audit.telling.perRegel.winter >= 1 && audit.telling.perRegel.netwerk >= 1 && audit.telling.perRegel.todo >= 1, 'audit: telling per regelsoort gevuld');
  for (const f of audit.findings) valideerBevinding(f, 'audit-bevinding');
  const ernstVolgorde = { blokkerend: 0, belangrijk: 1, nit: 2 };
  ok(audit.findings.every((f, i) => i === 0 || audit.findings[i - 1].bestanden[0] <= f.bestanden[0]), 'audit: bevindingen gesorteerd op bestand');
  ok(audit.findings.every((f, i) => i === 0 || audit.findings[i - 1].bestanden[0] < f.bestanden[0] || ernstVolgorde[audit.findings[i - 1].ernst] <= ernstVolgorde[f.ernst]), 'audit: binnen een bestand op ernst gesorteerd');

  // ---------------------------------------------------------------- CLI en exitcodes
  const vuil = schrijf(tmp, 'vuil.diff', VUILE_DIFF);
  const schoon = schrijf(tmp, 'schoon.diff', SCHONE_DIFF);
  const alleenMerk = schrijf(tmp, 'alleen-merk.diff', ALLEEN_MERK_DIFF);
  const leeg = schrijf(tmp, 'leeg.diff', LEGE_DIFF);

  const uitVuil = path.join(tmp, 'uit-vuil');
  const rVuil = runCli([`--diff=${vuil}`, `--out=${uitVuil}`]);
  is(rVuil.code, 1, `cli: blokkerende bevinding geeft exit 1 (kreeg ${rVuil.code}; ${rVuil.stderr.trim()})`);
  ok(rVuil.stdout.includes('BLOKKEREND'), 'cli: samenvatting noemt de blokkerende bevindingen');
  ok(/toegevoegde regels: \d+/.test(rVuil.stdout), 'cli: samenvatting noemt het aantal toegevoegde regels');
  const gateVuil = leesJson(path.join(uitVuil, 'rules-gate.json'));
  ok(Boolean(gateVuil), 'cli: rules-gate.json geschreven');
  is(gateVuil.status, 'rood', 'cli: gate is rood');
  ok(typeof gateVuil.telling?.toegevoegd === 'number' && gateVuil.telling.toegevoegd > 0, 'cli: telling.toegevoegd is gevuld');
  is(gateVuil.exitcode, 1, 'cli: gate vermeldt exitcode 1');
  const autoVuil = leesJson(path.join(uitVuil, 'findings', 'auto-rules.json'));
  ok(Array.isArray(autoVuil) && autoVuil.length > 0, 'cli: findings/auto-rules.json is een array met bevindingen');
  if (Array.isArray(autoVuil)) for (const f of autoVuil) valideerBevinding(f, 'cli-bevinding');

  const rSchoon = runCli([`--diff=${schoon}`, `--out=${path.join(tmp, 'uit-schoon')}`]);
  is(rSchoon.code, 0, `cli: schone diff geeft exit 0 (kreeg ${rSchoon.code}; ${rSchoon.stderr.trim()})`);
  is(leesJson(path.join(tmp, 'uit-schoon', 'rules-gate.json'))?.status, 'groen', 'cli: schone gate is groen');

  const rMerk = runCli([`--diff=${alleenMerk}`, `--out=${path.join(tmp, 'uit-merk')}`]);
  is(rMerk.code, 0, 'cli: alleen een belangrijke bevinding geeft exit 0');
  const rStreng = runCli([`--diff=${alleenMerk}`, `--out=${path.join(tmp, 'uit-streng')}`, '--streng']);
  is(rStreng.code, 1, 'cli: --streng maakt belangrijk blokkerend');

  const rLeeg = runCli([`--diff=${leeg}`, `--out=${path.join(tmp, 'uit-leeg')}`]);
  is(rLeeg.code, 3, 'cli: lege diff geeft exit 3');
  const rFout = runCli([`--diff=${path.join(tmp, 'bestaat-niet.diff')}`, `--out=${path.join(tmp, 'uit-fout')}`]);
  is(rFout.code, 2, 'cli: onleesbare diff geeft exit 2');
  ok((rFout.stderr || '').length > 0, 'cli: fout meldt zich op stderr');
  const rRef = runCli(['--from=bestaat-niet-xyz', `--out=${path.join(tmp, 'uit-ref')}`]);
  is(rRef.code, 2, 'cli: onbekende git-ref geeft exit 2');
} catch (e) {
  fouten += 1;
  console.log(`FAIL onverwachte fout: ${e && e.stack ? e.stack : e}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (fouten) {
  console.log(`release_designrules_test: ${fouten} fout(en) van ${controles} controles`);
  process.exitCode = 1;
} else {
  console.log(`release_designrules_test: ok (${controles} controles)`);
  process.exitCode = 0;
}
