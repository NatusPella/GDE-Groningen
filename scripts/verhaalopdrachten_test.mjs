// Verhaal > Opdrachten (#435): geen rommelige lijst meer, maar bovenaan de
// volgende stap met één knop, daaronder de delen met hun voortgang. De regel
// "wat is de volgende stap" staat in volgendeStap() en is puur; de opbouw van
// het scherm (Volgende stap eerst, dan de delen) staat ernaast.
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const T = await import('../game/js/todoui.js');
const { volgendeStap } = T;
const { partName } = await import('../game/js/storyarc.js');

const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
let n = 0;
const t = (name, f) => { f(); n++; };

const stap = (id, extra = {}) => ({ id, kind: 'stap', part: 'p1', title: `Stap ${id}`, done: false, available: true, current: false, ...extra });

t('de stap die nu loopt is de volgende stap', () => {
  const steps = [stap('a', { done: true }), stap('b', { current: true }), stap('c')];
  assert.equal(volgendeStap(steps).id, 'b');
});

t('loopt er niets, dan de eerste die je kunt doen en nog niet klaar is', () => {
  const steps = [stap('a', { done: true }), stap('b', { available: false }), stap('c'), stap('d')];
  assert.equal(volgendeStap(steps).id, 'c', 'b is nog op slot');
});

t('alles klaar of geen stappen: geen volgende stap', () => {
  assert.equal(volgendeStap([stap('a', { done: true })]), null);
  assert.equal(volgendeStap([]), null);
  assert.equal(volgendeStap(null), null);
});

t('een missie als volgende stap houdt zijn titel, niet zijn nummer (#913)', () => {
  const steps = [stap('m1', { kind: 'mission', mission: 'M07', title: 'De kluis', current: true })];
  const cur = volgendeStap(steps);
  assert.equal(cur.mission, 'M07', 'de missie-index blijft nodig voor het spel');
  assert.equal(cur.title, 'De kluis');
});

t('het scherm zet Volgende stap bovenaan, boven de delen', () => {
  const td = lees('todoui.js');
  const body = td.slice(td.indexOf('function storyHtml()'), td.indexOf('const SHOW_FIRST'));
  assert.match(body, /return nextHtml\(cur\) \+ PART_IDS\.map/, 'de volgende stap staat voor de delen');
  assert.match(body, /const cur = volgendeStap\(steps\)/, 'het scherm gebruikt dezelfde regel als de test');
  const next = td.slice(td.indexOf('function nextHtml('), td.indexOf('function storyHtml()'));
  assert.match(next, /aria-label="Volgende stap"/);
  assert.match(next, /data-todo-goal=/, 'de knop zet het doel of brengt je terug bij het verhaal');
  assert.match(next, /\$\{esc\(cur\.title\)\}/, 'de titel staat vooraan; het missienummer is uit de UI (#913)');
  assert.ok(!/\$\{cur\.id\}|\$\{cur\.mission\}/.test(next), 'geen administratief nummer in de kop (#913)');
});

t('het missie-overzicht is één rustige hoofdstukkenlijst (#912)', () => {
  assert.equal(partName('kop'), 'Moi, Grunn', 'geen "Akte 1" meer in de menunaam');
  assert.equal(partName('staart'), 'Aan de Eems');
  assert.equal(partName('nazomer'), 'Nazomer', 'geen tweede "Deel 4" meer');
  assert.equal(partName('bestaatniet'), '');
  const td = lees('todoui.js');
  assert.match(td, /function partName\(|from '\.\/storyarc\.js'/);
  const body = td.slice(td.indexOf('function storyHtml()'), td.indexOf('const SHOW_FIRST'));
  assert.match(body, /partName\(part\)/, 'de hoofdstukken heten zoals het verhaal ze noemt, niet "Akte 3" of "Deel 4"');
  assert.match(body, /td-chapter/, 'elk hoofdstuk is één regel met zijn stand');
  assert.match(body, /(Afgerond|Hier ben je|Op slot|Wacht op het einde)/, 'de stand staat als woord in de lijst');
  const arc = lees('storyarc.js');
  assert.match(arc, /export function partName\(part\)/);
  assert.match(arc, /Akte\|Deel/, 'de weergavenaam haalt de acte-/deelnummering weg');
});

t('elk deel klapt open met zijn eigen voortgang en "waar het om draait"', () => {
  const td = lees('todoui.js');
  assert.match(td, /data-part-toggle="\$\{part\}"/, 'een deel is open te klikken');
  assert.match(td, /data-num="part-\$\{part\}" data-to="\$\{done\}"/, 'de teller loopt naar de nieuwe stand');
  assert.match(td, /Waar het om draait/, 'het huidige deel zegt waar het over gaat');
  assert.ok(!/Wat weten we\?/.test(td), 'de aanwijzingen zijn uit de lijst (21-11: hints en clues voegen niets toe)');
});

t('de Aanwijzingen-tab bestaat niet meer', () => {
  const vu = lees('verhaalui.js');
  assert.ok(!/vh-gk|function partOrder\(|function cluesHtml\(/.test(vu), 'de aanwijzingenlijst is uit verhaalui.js');
});

console.log(`verhaalopdrachten_test: ${n}/${n} ok`);
