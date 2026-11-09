// Besturing (#605): het Toetsenoverzicht is een scanbaar naslagscherm (korte actie per toets,
// binnen het woordbudget), de lange uitleg staat op één plek in Hulp, er is een tabblad Aanraken
// met de knoppen op het scherm, overal zegt zoeken "niets gevonden" en de wachtstand bij het
// opnieuw indelen houdt de actienaam in beeld.
//   node scripts/besturing_overzicht_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
const pm = lees('pausemenu.js');
let n = 0;
const t = (naam, f) => { f(); n++; };

// Dezelfde uitlezing als spelmenu_test: het is een array in de bron, dus evalueer hem.
const cgSrc = pm.slice(pm.indexOf('const CONTROL_GROUPS = '), pm.indexOf('const CONTROL_LONG = '));
const groepen = new Function('DESKTOP', cgSrc.replace('const CONTROL_GROUPS = ', 'return ') + ';')(false);

t('het Toetsenoverzicht past binnen 270 woorden en is per situatie te scannen', () => {
  let woorden = 0;
  for (const [, titel, rijen] of groepen) {
    woorden += titel.split(/\s+/).length;
    for (const [keys, desc] of rijen) {
      woorden += desc.split(/\s+/).length + keys.length;
      assert.ok(desc.split(/\s+/).length <= 6, `korte actie van hooguit 6 woorden: ${desc}`);
    }
  }
  // het scherm zelf: vijf tabbladen, de titel Besturing en de regel eronder
  const scherm = woorden + ['Toetsenbord en muis', 'Controller', 'Toetsenoverzicht', 'Aanraken', 'Hulp'].join(' ').split(/\s+/).length + 7;
  assert.ok(scherm <= 270, `het Toetsenoverzicht blijft binnen 270 woorden (nu ${scherm})`);
});

t('de lange uitleg staat niet meer in het overzicht maar op één plek: Hulp', () => {
  assert.ok(pm.includes("const CONTROL_LONG = ["), 'de lange uitleg is eigen data');
  assert.ok(pm.includes('const longTextFor ='), 'er is één opzoekregel voor de lange uitleg');
  const overzicht = pm.slice(pm.indexOf('function controlsHtml()'), pm.indexOf('function controlsHelpHtml()'));
  assert.ok(!overzicht.includes('CONTROL_LONG'), 'het overzicht leest de lange uitleg niet');
  assert.ok(overzicht.includes('+ lang +'), 'de lange uitleg blijft wel doorzoekbaar op het overzicht');
  assert.ok(pm.includes('${controlsHelpHtml()}'), 'Hulp tekent de lange uitleg');
  assert.match(pm, /function controlsHelpHtml\(\) \{[\s\S]*?longTextFor\(id, desc\)/, 'Hulp gebruikt dezelfde situaties en korte acties');
});

t('er is een tabblad Aanraken met de knoppen op het scherm', () => {
  assert.ok(pm.includes("['aanraken', 'Aanraken']"), 'het tabblad staat onder Besturing');
  assert.ok(pm.includes('data-of="controls" data-sub="aanraken"'), 'het tabblad heeft een eigen paneel');
  assert.match(pm, /import \{[^}]*touchPlan[^}]*touchMore[^}]*\} from '\.\/touchlogic\.js'/, 'de indeling komt uit dezelfde bron als de touchbalk');
  assert.match(pm, /function touchOverviewHtml\(\)[\s\S]*?touchPlan\(ctx\)[\s\S]*?touchMore\(ctx\)/, 'het overzicht toont de knoppen en de rest achter Meer');
  for (const ctx of ['foot', 'vehicle', 'heli', 'plane', 'pigeon']) assert.ok(pm.includes(`['${ctx}', '`), `de situatie ${ctx} staat erbij`);
});

t('zoeken toont overal een lege-melding, niet alleen in het Toetsenoverzicht', () => {
  const noten = [...pm.matchAll(/class="m-note pm-cempty" hidden>Niks gevonden/g)].length;
  assert.ok(noten >= 5, `elke plek heeft een lege-melding (nu ${noten})`);
  assert.match(pm, /for \(const el of panel\.querySelectorAll\('\.pm-cempty'\)\) \{[\s\S]*?sub\.dataset\.sub[\s\S]*?el\.hidden/, 'de melding hoort bij het tabblad dat je ziet');
  assert.match(pm, /for \(const \[k, v\] of Object\.entries\(filterBinds\(words\)\)\) if \(v\) hits\[k\]/, 'de heringedeelde rijen tellen mee');
  assert.match(pm, /if \(g\.classList\.contains\('pm-help'\)\) \{[\s\S]*?past\(g\.textContent, words\)/, 'de hulpblokken tellen mee op hun eigen tekst');
});

t('de wachtstand bij het opnieuw indelen houdt de actienaam in beeld', () => {
  const key = pm.slice(pm.indexOf('function startKeyRebind'), pm.indexOf('function startPadRebind'));
  assert.match(key, /actionWords\(canon\)/, 'de toetsenwachtstand noemt de actie');
  assert.match(key, /Druk een toets…/, 'en zegt wat je moet doen');
  assert.match(key, /class="nm"/, 'de naam staat in dezelfde regel als in de lijst');
  const pad = pm.slice(pm.indexOf('function startPadRebind'), pm.indexOf('function cancelRebind'));
  assert.match(pad, /slotUses\(slot\) \|\| PAD_SLOT_NAMES\[slot\]/, 'de knopwachtstand noemt de actie');
  assert.match(pad, /Druk een knop…/, 'en zegt wat je moet doen');
});

t('de apparaatkeuze volgt dezelfde glyphs als de rest van het spel', () => {
  // de keycaps in het overzicht dragen data-gk en zitten in een data-pad-ctx; glyphs.js wisselt
  // ze naar het glyph van het actieve apparaat (toetsen, controller of aanraakknop)
  assert.match(pm, /data-pad-ctx="\$\{GROUP_CTX\[id\] \|\| 'foot'\}"/, 'elke situatie heeft een controllercontext');
  assert.ok(pm.includes('glyphHtml(t)'), 'de toetsen zijn tokens, geen losse letters');
});

t('de lange uitleg noemt een toets als token, niet als losse letter', () => {
  const longSrc = pm.slice(pm.indexOf('const CONTROL_LONG = ['), pm.indexOf('const GROUP_ICONS = {'));
  const lang = new Function(longSrc.replace('const CONTROL_LONG = ', 'return ') + ';')();
  for (const [gid, rijen] of lang) {
    for (const [desc, tekst] of rijen) {
      assert.ok(!/\bShift\b|\bCtrl\b|W A S D|Alt\+Enter\b/.test(tekst), `${gid}/${desc} noemt geen toets als tekst: ${tekst}`);
    }
  }
  assert.match(pm, /const keyText = \(t\) => esc\(t\)\.replace\(\/\\\{\(\[A-Z0-9\]\+\)\\\}\//, 'de tokens worden door glyphHtml gezet');
  assert.ok(pm.includes('${keyText(longTextFor(id, desc))}'), 'Hulp gebruikt de tokenregel');
});

console.log(`OK besturing_overzicht_test: ${n} controles`);
