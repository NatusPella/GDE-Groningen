// Het wegwerpprofiel van de QA-harnassen (#980): op deze machine kan Electron zijn
// profiel niet onder %TEMP% aanmaken ("Lock file can not be created", "Toegang
// geweigerd"), en dan start geen enkel beeldscript. De helper kiest daarom de eerste
// schrijfbare basis: GDE_PROFILE_DIR, dan %TEMP%, dan naast de uitvoer.
//
// Deze test bewijst:
//   - een absolute GDE_PROFILE_DIR wint;
//   - zonder die env komt er een bestaande, schrijfbare map terug;
//   - als %TEMP% onbruikbaar is, valt hij terug op de uitvoermap;
//   - een pad dat nergens schrijfbaar is, geeft een duidelijke fout in plaats van een
//     halve run;
//   - de drie beeldscripts van de releasegate gebruiken de helper, zodat de visual-fase
//     niet meer stukloopt op de omgeving.
//   node scripts/testprofile_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { profileDirFor, verwijderProfiel } from './lib/testprofile.mjs';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok ' + naam); };
const tijdelijk = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-prof-test-'));

t('een absolute GDE_PROFILE_DIR wint van %TEMP%', () => {
  const eerder = process.env.GDE_PROFILE_DIR;
  process.env.GDE_PROFILE_DIR = tijdelijk;
  try {
    const dir = profileDirFor('prof-a', path.join(tijdelijk, 'uit'));
    assert.equal(dir, path.join(tijdelijk, 'prof-a'));
    assert.ok(fs.existsSync(dir), 'de map bestaat');
    verwijderProfiel(dir);
    assert.ok(!fs.existsSync(dir), 'en is weer weg');
  } finally {
    if (eerder === undefined) delete process.env.GDE_PROFILE_DIR; else process.env.GDE_PROFILE_DIR = eerder;
  }
});

t('zonder env komt de map naast de uitvoer, niet in %TEMP%', () => {
  const eerder = process.env.GDE_PROFILE_DIR;
  delete process.env.GDE_PROFILE_DIR;
  try {
    const dir = profileDirFor('prof-b', tijdelijk);
    assert.ok(path.isAbsolute(dir), 'het pad is absoluut (anders plakt main.js het weer aan %TEMP%)');
    assert.ok(fs.existsSync(dir));
    fs.accessSync(dir, fs.constants.W_OK);
    // %TEMP% is op deze machine voor Node schrijfbaar maar voor Electron niet: de
    // uitvoermap is de betrouwbare keuze en moet dus winnen.
    assert.equal(dir, path.join(tijdelijk, '.profielen', 'prof-b'), 'het profiel staat naast de uitvoer');
    verwijderProfiel(dir);
  } finally {
    if (eerder !== undefined) process.env.GDE_PROFILE_DIR = eerder;
  }
});

t('zonder uitvoermap valt hij terug op %TEMP%', () => {
  const eerder = process.env.GDE_PROFILE_DIR;
  delete process.env.GDE_PROFILE_DIR;
  try {
    const dir = profileDirFor('prof-d', null);
    assert.ok(dir.startsWith(path.resolve(os.tmpdir())), 'zonder uitvoer blijft %TEMP% over');
    verwijderProfiel(dir);
  } finally {
    if (eerder !== undefined) process.env.GDE_PROFILE_DIR = eerder;
  }
});

t('dezelfde naam twee keer geeft dezelfde map, zonder fout', () => {
  const eerder = process.env.GDE_PROFILE_DIR;
  process.env.GDE_PROFILE_DIR = tijdelijk;
  try {
    const a = profileDirFor('prof-c', tijdelijk);
    const b = profileDirFor('prof-c', tijdelijk);
    assert.equal(a, b);
    verwijderProfiel(a);
  } finally {
    if (eerder === undefined) delete process.env.GDE_PROFILE_DIR; else process.env.GDE_PROFILE_DIR = eerder;
  }
});

t('de drie beeldscripts van de gate gebruiken de helper', () => {
  const lees = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  for (const f of ['scripts/ui_shots.mjs', 'scripts/qa/sweep.mjs', 'scripts/qa/readme_shots.mjs']) {
    const s = lees(f);
    assert.match(s, /profileDirFor\(/, `${f} kiest zijn profiel via de helper`);
    assert.match(s, /GDE_TEST_PROFILE: profDir/, `${f} geeft het absolute pad aan Electron`);
    assert.ok(!/GDE_TEST_PROFILE: profile\b/.test(s), `${f} geeft geen relatief profiel meer mee`);
  }
});

t('de helper ruimt stil op als het profiel al weg is', () => {
  verwijderProfiel(path.join(tijdelijk, 'bestaat-niet'));
  verwijderProfiel('');
  verwijderProfiel(null);
});

try { fs.rmSync(tijdelijk, { recursive: true, force: true }); } catch (e) { /* al weg */ }
console.log(`testprofile_test: ${n} controles ok`);
