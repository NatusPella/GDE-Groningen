// Verhaal > Opdrachten (#435): geen rommelige lijst meer, maar bovenaan de
// volgende stap met één knop, daaronder de delen met hun voortgang. De regel
// "wat is de volgende stap" staat in volgendeStap() en is puur; de opbouw van
// het scherm (Volgende stap eerst, dan de delen) staat ernaast.
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const T = await import('../game/js/todoui.js');
const { volgendeStap } = T;

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

t('een missie als volgende stap houdt zijn code', () => {
  const steps = [stap('m1', { kind: 'mission', mission: 'M07', title: 'De kluis', current: true })];
  const cur = volgendeStap(steps);
  assert.equal(cur.mission, 'M07');
  assert.equal(`${cur.id} · ${cur.title}`, 'm1 · De kluis');
});

t('het scherm zet Volgende stap bovenaan, boven de delen', () => {
  const td = lees('todoui.js');
  const body = td.slice(td.indexOf('function storyHtml()'), td.indexOf('const SHOW_FIRST'));
  assert.match(body, /return nextHtml\(cur\) \+ PART_IDS\.map/, 'de volgende stap staat voor de delen');
  assert.match(body, /const cur = volgendeStap\(steps\)/, 'het scherm gebruikt dezelfde regel als de test');
  const next = td.slice(td.indexOf('function nextHtml('), td.indexOf('function storyHtml()'));
  assert.match(next, /aria-label="Volgende stap"/);
  assert.match(next, /data-todo-goal=/, 'de knop zet het doel of brengt je terug bij het verhaal');
  assert.match(next, /cur\.kind === 'mission' \? `\$\{cur\.id\} · \$\{cur\.title\}` : cur\.title/, 'een missie houdt zijn code');
});

t('elk deel klapt open met zijn eigen voortgang en "waar het om draait"', () => {
  const td = lees('todoui.js');
  assert.match(td, /data-part-toggle="\$\{part\}"/, 'een deel is open te klikken');
  assert.match(td, /data-num="part-\$\{part\}" data-to="\$\{done\}"/, 'de teller loopt naar de nieuwe stand');
  assert.match(td, /Waar het om draait/, 'het huidige deel zegt waar het over gaat');
  assert.match(td, /Wat weten we\?/, 'de aanwijzingen van dat deel staan erbij');
});

t('Aanwijzingen staan per opdracht gegroepeerd', () => {
  const vu = lees('verhaalui.js');
  assert.match(vu, /vh-gk/, 'elke opdracht heeft een kop');
  assert.match(vu, /function partOrder\(/, 'de volgorde komt uit het verhaal, niet uit de lijst');
});

console.log(`verhaalopdrachten_test: ${n}/${n} ok`);
