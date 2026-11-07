// Instellingen en het foutrapport (#604): vijf echte instellingstabbladen, "Standaard herstellen"
// vraagt eerst en kan ongedaan gemaakt worden, elke rij heeft een regel uitleg, het foutrapport staat
// onder Over met een Nederlandse samenvatting en Engelse details achter een vouw, en Toegankelijkheid
// toont een kleine proef van markers, routelijnen en tekst.
//   node scripts/instellingen_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
const pm = lees('pausemenu.js');
const css = lees('pausemenu.css');
let n = 0;
const t = (naam, f) => { f(); n++; };

t('Instellingen heeft vijf echte instellingstabbladen; Cheats en Foutrapport zijn er geen tabblad meer', () => {
  const m = pm.match(/settings: \[(\['video'[\s\S]*?)\],\n/);
  assert.ok(m, 'de settings-tabs staan in pausemenu.js');
  const tabs = [...m[1].matchAll(/\['(\w+)',/g)].map((x) => x[1]);
  assert.deepEqual(tabs, ['video', 'sound', 'besturing', 'display', 'a11y'], 'Beeld, Geluid, Besturing, Interface, Toegankelijkheid');
  assert.ok(!pm.includes("tab('cheats'"), 'Cheats is geen tabblad van Instellingen meer');
  assert.ok(!pm.includes('data-sub="fouten"'), 'Foutrapport is geen tabblad van Instellingen meer');
  assert.match(pm, /RAIL_GROUPS = \[[^\]]*\], \[[^\]]*\], \['settings', 'streken'\]\]/, 'Cheats staat als eigen onderdeel in de rail');
  assert.match(pm, /rowName\('Over GDE'[\s\S]*?data-goto="over"/, 'Over heeft een ingang via Instellingen > Interface (#601)');
});

t('Standaard herstellen vraagt eerst en noemt wat teruggezet wordt', () => {
  const box = pm.slice(pm.indexOf('data-reset-confirm'), pm.indexOf('data-reset-undo'));
  assert.ok(box.includes('Alles terug naar de standaard?'), 'de vraag staat er');
  assert.ok(/Beeld, geluid, ondertitels, beweging, tekstgrootte en de hulpinstellingen gaan terug/.test(box), 'de vraag noemt wat er teruggezet wordt');
  assert.ok(box.includes('data-action="reset-cancel"'), 'er is een annuleerknop');
  assert.match(pm, /else if \(a === 'reset'\) \{[\s\S]*?box\.hidden = false;[\s\S]*?reset-cancel"\]'\)\.focus\(\)/, 'de herstelknop opent eerst de vraag en zet de focus op Annuleren');
  assert.match(pm, /const resetBox = root\.querySelector\('\[data-reset-confirm\]'\);\s*if \(resetBox && !resetBox\.hidden\) \{[\s\S]*?return;/, 'Escape sluit de vraag zonder iets te herstellen');
});

t('de herstelde stand is met één knop ongedaan te maken', () => {
  assert.match(pm, /resetBackup = \{ \.\.\.getSettings\(\) \};\s*resetSettings\(\);/, 'eerst een momentopname, dan pas herstellen');
  assert.match(pm, /a === 'reset-undo'[\s\S]*?for \(const \[k, v\] of Object\.entries\(resetBackup\)\) setSetting\(k, v\);/, 'ongedaan maken zet de oude waarden terug');
  assert.ok(pm.includes('data-action="reset-dismiss"'), 'de strook kan ook gewoon weg');
  assert.match(pm, /if \(name !== 'settings'\) \{[\s\S]*?data-reset-confirm[\s\S]*?hidden = true/, 'een andere sectie begint zonder de herstelvraag in beeld');
});

t('elke rij die de review noemde heeft nu een regel uitleg', () => {
  const paren = [
    [/'shadows', 'Schaduwen', '[^']+'/, 'Schaduwen'],
    [/'drunkFx', 'Dronken effecten', \[.*\], '[^']+'/, 'Dronken effecten'],
    [/'showHints', 'Toetshints', '[^']+'/, 'Toetshints'],
    [/'fov', 'Beeldhoek', 50, 90, 1, '[^']+'/, 'Beeldhoek'],
    [/'cameraDistance', 'Camera-afstand', 0\.8, 1\.6, 0\.05, '[^']+'/, 'Camera-afstand'],
  ];
  for (const [re, naam] of paren) assert.match(pm, re, `${naam} heeft een uitleg`);
});

t('het foutrapport staat onder Over: Nederlandse samenvatting eerst, Engelse details gevouwen', () => {
  const over = pm.slice(pm.indexOf('function renderOverPanel'), pm.indexOf('const ARROWS'));
  const blok = pm.slice(pm.indexOf('function problemsHtml'), pm.indexOf('export function initPauseMenu'));
  assert.ok(over.includes('${problemsHtml()}'), 'Over tekent het problemenblok');
  assert.ok(blok.includes('<span>Problemen</span>'), 'het kopje Problemen staat er');
  assert.ok(blok.includes('data-errsum'), 'de Nederlandse samenvatting heeft een eigen plek');
  assert.ok(/<details class="pm-errfold"><summary>Technische details/.test(blok), 'de technische details zitten achter een vouw');
  assert.ok(blok.indexOf('data-errsum') < blok.indexOf('data-errlog'), 'eerst de samenvatting, dan de details');
  const log = pm.slice(pm.indexOf('function renderErrorLog'), pm.indexOf('onErrorLogChange(() =>'));
  assert.match(log, /Geen problemen gemeld/, 'zonder meldingen zegt de samenvatting dat het goed gaat');
  assert.match(log, /fouten/, 'de samenvatting telt de fouten');
  assert.match(log, /waarschuwingen/, 'de samenvatting telt de waarschuwingen');
  assert.match(log, /Er is niets verstuurd/, 'de samenvatting zegt dat er niets verstuurd is');
  assert.ok(!pm.includes("tab('fouten'"), 'het foutrapport is geen instellingstabblad meer');
});

t('Toegankelijkheid toont een proef met de markers, de routelijnen en de lettergroottes', () => {
  assert.ok(pm.includes('class="pm-a11yprev"'), 'de proefstrook staat er');
  assert.ok(pm.includes("['ok', 'danger', 'mission', 'user', 'job', 'care', 'police']"), 'de proef noemt alle markerrollen');
  assert.ok(pm.includes('data-mk="${r}"'), 'elke marker leest zijn kleur uit --mk-*');
  assert.ok(pm.includes('data-route="verhaal"') && pm.includes('data-route="doel"') && pm.includes('data-route="klus"'), 'de proef toont de drie routelijnen');
  assert.ok(pm.includes('pm-a11y-13') && pm.includes('pm-a11y-20'), 'de proef toont 13 px en 20 px tekst');
  assert.match(css, /\.pm-a11y-mk\[data-mk="ok"\] \{ background: var\(--mk-ok/, 'de proef leest de kleuren uit --mk-*');
  assert.match(css, /\.pm-a11y-route\[data-route="doel"\] \{ border-top-color: var\(--mk-user/, 'de routelijnen komen uit --mk-*');
  assert.match(css, /\.pm-a11y-13 \{ font-size: 13px; \}/, 'de 13 px-vloer is zichtbaar');
  assert.match(css, /\.pm-a11y-20 \{ font-size: 20px; \}/, 'de 20 px menutekst is zichtbaar');
});

console.log(`OK instellingen_test: ${n} controles`);
