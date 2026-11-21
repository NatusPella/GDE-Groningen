// Test van het cutscene-reviewpakket (laag 4): pakket per cutscene, panelmodus, meerderheidsoordeel over humor (bij gelijke stand blijft
// de grap), de vetolijst voor de eigenaar (gevoelig en onzeker bovenaan), de bevindingen als reviewrapport voor de releasegate en de
// koppeling aan het zevende reviewaspect `cutscenes`. Geen browser.
//   node scripts/cutscene_review_pack_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadUnits } from './lib/cutscene_data.mjs';
import { lintUnit } from './lib/cutscene_lint.mjs';
import { packVan, renderPack, stemHumor, humorUitslag, renderVeto, bevindingenVan, renderBevindingen, panelRapporten, shotLijst, OORDEELOPTIES } from './cutscene_review_pack.mjs';
import { validateReport } from './release/findings.mjs';
import { determineAspects, filesForAspect } from './release/review_pack.mjs';

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };
const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---- het pakket van een echte cutscene -------------------------------------------------------------------------------------------
const { units, speakers, looks } = await loadUnits();
const u = units.find((x) => x.id === 'M01.intro');
const v = lintUnit(u, { speakers, npc: looks });
const pack = packVan(u, v, { commit: 'abc1234' });
ok(pack.regels.length === u.lines.length && pack.regels[0].wie, 'het pakket bevat het script met sprekers');
ok(pack.shots.length >= 5 && pack.shots.every((s) => s.soort && Number.isFinite(s.van) && s.type), 'het pakket bevat de shotlijst met soort en type', String(pack.shots.length));
ok(shotLijst(u).some((s) => s.spreker), 'de shotlijst noemt wie er praat');
const md = renderPack(pack, { reviewer: 'r2', panel: 3 });
for (const kop of ['## Script', '## Shotlijst', '## Beelden', '## Automatische vondsten', '## Komische beats', '## Uitvoer']) ok(md.includes(kop), `het pakket heeft de sectie ${kop}`);
ok(md.includes('scripts/release/prompts/cutscene-review.md') && md.includes('docs/CUTSCENE-REGIE-21-11.md'), 'het pakket verwijst naar de prompt en de regie-bijbel (andere agent schrijft de inhoud)');
ok(/onafhankelijk van de andere 2 reviewers/.test(md), 'de panelmodus zegt dat de reviewers onafhankelijk zijn');
ok(/Nog geen gerenderde beelden/.test(md), 'zonder laag 3 zegt het pakket dat het beeld niet bekeken is');
ok(/humor/i.test(md) && /smaak/.test(md), 'het pakket zegt dat grappen niet als goed of slecht worden beoordeeld');

// ---- meerderheidsoordeel over humor --------------------------------------------------------------------------------------------------
{
  const o = (keuze, zekerheid, extra = {}) => ({ regelNr: 1, keuze, zekerheid, reden: `reden ${keuze}`, ...extra });
  const eens = stemHumor([o('behouden', 0.9), o('behouden', 0.8), o('aanpassen', 0.6, { variant: 'andere tekst' })]);
  ok(eens.keuze === 'behouden' && eens.stemmen.behouden === 2 && eens.zekerheid > 0.5, 'twee van drie voor behouden: behouden met zekerheid', JSON.stringify(eens));
  const aanpassen = stemHumor([o('aanpassen', 0.7, { variant: 'a' }), o('aanpassen', 0.9, { variant: 'b' }), o('behouden', 0.5)]);
  ok(aanpassen.keuze === 'aanpassen' && aanpassen.variant === 'b', 'de gekozen variant is die van de zekerste reviewer in de meerderheid', JSON.stringify(aanpassen));
  const gelijk = stemHumor([o('behouden', 0.8), o('aanpassen', 0.8, { variant: 'x' }), o('schrappen', 0.8)]);
  ok(gelijk.keuze === 'behouden' && gelijk.laag, 'geen meerderheid: de grap blijft zoals hij is en staat bij de onzekere gevallen', JSON.stringify(gelijk));
  const twee = stemHumor([o('aanpassen', 0.9, { variant: 'x' }), o('behouden', 0.9)]);
  ok(twee.keuze === 'behouden', 'een gelijke stand bij twee reviewers behoudt de grap');
  ok(stemHumor([o('behouden', 0.9, { gevoelig: true }), o('behouden', 0.9), o('behouden', 0.9)]).gevoelig, 'één reviewer die gevoelig meldt maakt het gevoelig');
  ok(stemHumor([o('onzin', 0.9), o('behouden', 0.9), o('behouden', 0.9)]).keuze === 'behouden' && OORDEELOPTIES.length === 3, 'een onbekende keuze telt als behouden');
}

// ---- de vetolijst voor de eigenaar ------------------------------------------------------------------------------------------------
{
  const reports = [
    { cutscene: 'M01.intro', reviewer: 'r1', bevindingen: [], humor: [{ regelNr: 0, keuze: 'behouden', zekerheid: 0.9 }, { regelNr: 3, keuze: 'aanpassen', variant: 'nieuw', zekerheid: 0.5, reden: 'te lang' }] },
    { cutscene: 'M01.intro', reviewer: 'r2', bevindingen: [], humor: [{ regelNr: 0, keuze: 'behouden', zekerheid: 0.9 }, { regelNr: 3, keuze: 'behouden', zekerheid: 0.5 }] },
    { cutscene: 'M01.intro', reviewer: 'r3', bevindingen: [], humor: [{ regelNr: 0, keuze: 'behouden', zekerheid: 0.9 }, { regelNr: 3, keuze: 'schrappen', zekerheid: 0.4 }] },
    { cutscene: 'M09.2', reviewer: 'r1', bevindingen: [], humor: [{ regelNr: 1, keuze: 'behouden', zekerheid: 0.9, gevoelig: true }] },
    { cutscene: 'M09.2', reviewer: 'r2', bevindingen: [], humor: [{ regelNr: 1, keuze: 'behouden', zekerheid: 0.9 }] },
    { cutscene: 'M09.2', reviewer: 'r3', bevindingen: [], humor: [{ regelNr: 1, keuze: 'behouden', zekerheid: 0.9 }] },
  ];
  const packs = new Map([['M01.intro', { akte: 1, regels: [{ nr: 0, wie: 'Tammo', tekst: 'Zeker weten.' }, { nr: 3, wie: 'Anita', tekst: 'Een droge grap.' }], humor: [] }], ['M09.2', { akte: 1, regels: [{ nr: 1, wie: 'Tessa', tekst: 'Over de aardbeving.' }], humor: [] }]]);
  const uitslag = humorUitslag(panelRapporten(reports), packs);
  ok(uitslag.length === 3, 'elke komische beat krijgt een uitslag', String(uitslag.length));
  const veto = renderVeto(1, uitslag);
  const iEerst = veto.indexOf('Eerst kijken'), iPanel = veto.indexOf('Het panel koos');
  ok(iEerst >= 0 && iPanel > iEerst, 'de vetolijst heeft eerst "Eerst kijken", dan "Het panel koos"');
  const gevoeligPos = veto.indexOf('aardbeving'), onzekerPos = veto.indexOf('Een droge grap'), zekerPos = veto.indexOf('Zeker weten');
  ok(gevoeligPos > iEerst && gevoeligPos < iPanel && onzekerPos > iEerst && onzekerPos < iPanel && zekerPos > iPanel, 'gevoelig en onzeker staan bovenaan, de zekere beats eronder');
  ok(gevoeligPos < onzekerPos, 'gevoelig staat boven onzeker');
  ok(/zet een kruisje/.test(veto) && /hoeft niets goed te keuren/.test(veto), 'de eigenaar krijgt alleen een veto, geen goedkeuring');
  // bevindingen
  const b = (titel, ernst) => ({ ernst, categorie: 'camera', titel, beschrijving: 'de spreker is nergens in beeld bij regel 3', bewijs: ['regel 3'], fix: 'een close-up' });
  const rapport = bevindingenVan(panelRapporten([
    { cutscene: 'M01.intro', reviewer: 'r1', bevindingen: [b('Spreker buiten beeld', 'blokkerend'), b('Alleen ik zag dit', 'blokkerend')], humor: [] },
    { cutscene: 'M01.intro', reviewer: 'r2', bevindingen: [b('Spreker buiten beeld', 'blokkerend')], humor: [] },
    { cutscene: 'M01.intro', reviewer: 'r3', bevindingen: [], humor: [] },
  ]), { commit: 'abc1234' });
  ok(rapport.bevindingen.length === 2, 'gelijke bevindingen van het panel worden samengevoegd');
  ok(rapport.bevindingen.find((x) => /Spreker buiten beeld/.test(x.titel)).ernst === 'blokkerend', 'twee van drie reviewers: de ernst blijft');
  ok(rapport.bevindingen.find((x) => /Alleen ik/.test(x.titel)).ernst === 'nit', 'een bevinding van één reviewer in een panel wordt een nit');
  const val = validateReport(rapport);
  ok(!(val && val.errors && val.errors.length) && !(Array.isArray(val) && val.length), 'het rapport voldoet aan het schema van de releasegate', JSON.stringify(val).slice(0, 200));
  ok(/## blokkerend \(1\)/.test(renderBevindingen(rapport)), 'de lijst voor issues is gegroepeerd op ernst');
}

// ---- het zevende reviewaspect --------------------------------------------------------------------------------------------------------
{
  const files = { 'game/js/cutscenes_akte1.js': {}, 'scripts/foo.mjs': {} };
  const asp = determineAspects(files, []);
  ok(asp.includes('cutscenes'), 'een gewijzigd cutscene-bestand maakt `cutscenes` verplicht', asp.join(','));
  ok(!determineAspects({ 'scripts/foo.mjs': {} }, []).includes('cutscenes'), 'zonder cutscene-bestanden is het aspect niet verplicht');
  ok(determineAspects({ 'game/storydata/script.json': {} }, []).includes('cutscenes'), 'nieuwe scripttekst maakt `cutscenes` verplicht');
  ok(filesForAspect('cutscenes', files).join() === 'game/js/cutscenes_akte1.js', 'filesForAspect geeft alleen de cutscene-bestanden');
}

// ---- het script zelf (pakketten + panel + verzamelen) ------------------------------------------------------------------------------------
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-crp-'));
  try {
    const run = (args) => spawnSync(process.execPath, [path.join(HERE, 'cutscene_review_pack.mjs'), ...args], { encoding: 'utf8', cwd: path.resolve(HERE, '..') });
    const r = run([`--out=${tmp}`, '--only=M01.intro', '--panel=3']);
    ok(r.status === 0, 'het script bouwt pakketten', (r.stderr || '').slice(0, 200));
    ok(fs.existsSync(path.join(tmp, 'M01.intro', 'pack.md')) && fs.existsSync(path.join(tmp, 'M01.intro', 'pack.json')), 'pack.md en pack.json staan er');
    ok(['1', '2', '3'].every((k) => fs.existsSync(path.join(tmp, 'panel', 'M01.intro', `reviewer-${k}.md`))), 'het panel krijgt drie onafhankelijke opdrachten');
    ok(fs.existsSync(path.join(tmp, 'index.md')), 'index.md bestaat');
    ok(fs.readdirSync(path.join(tmp, 'humor')).some((f) => /humor-review\.md$/.test(f)), 'de humorbundel per akte voor het panel bestaat');
    // verzamelen
    const uit = path.join(tmp, 'uitvoer');
    fs.mkdirSync(uit, { recursive: true });
    const p = JSON.parse(fs.readFileSync(path.join(tmp, 'M01.intro', 'pack.json'), 'utf8'));
    const beat = p.humor[0];
    for (const k of [1, 2, 3]) fs.writeFileSync(path.join(uit, `uitvoer-M01.intro-r${k}.json`), JSON.stringify({ cutscene: 'M01.intro', reviewer: `r${k}`, commit: 'abc1234', scores: { tekst: 4 }, bevindingen: [{ ernst: 'belangrijk', categorie: 'camera', titel: 'Springende as', beschrijving: 'de camera springt over de as bij regel 4', bewijs: ['regel 4'] }], humor: beat ? [{ regelNr: beat.regelNr, keuze: k === 3 ? 'aanpassen' : 'behouden', variant: k === 3 ? 'x' : null, zekerheid: 0.7, reden: 'ok' }] : [] }));
    const c = run([`--collect=${uit}`, `--out=${uit}`, `--packs=${tmp}`, '--commit=abc1234']);
    ok(c.status === 0, 'het script verzamelt de reviewuitvoer', (c.stderr || '').slice(0, 200));
    ok(fs.existsSync(path.join(uit, 'bevindingen.json')) && fs.existsSync(path.join(uit, 'bevindingen.md')) && fs.existsSync(path.join(uit, 'humor-uitslag.json')), 'bevindingen en humoruitslag staan er');
    ok(!beat || fs.readdirSync(uit).some((f) => /^humor-veto-akte\d+\.md$/.test(f)), 'de vetolijst per akte is geschreven');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

console.log(fails ? `${fails} van ${n} cutscene_review_pack-controles falen` : `cutscene_review_pack_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
