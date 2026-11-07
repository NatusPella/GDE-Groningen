// De 'gezien'-lijst van wijken hoort bij de save, niet bij het apparaat (#726): een nieuw spel
// mag de wijkkaarten van de andere saves niet opnieuw laten spelen. Een save van vóór het veld
// valt één keer terug op de oude apparaatlijst.
//   node scripts/wijken_seen_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const src = (f) => fs.readFileSync(new URL('game/js/' + f, root), 'utf8');
const { KEYS } = await import('../game/js/storagekeys.js');
const CI = await import('../game/js/cinematics.js');
const KEY = KEYS.wijkenSeen;

let n = 0, fails = 0;
const ok = (fn, name) => { n++; try { fn(); } catch (e) { fails++; console.log(`FAIL ${name}: ${e.message}`); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- een save van vóór #726 (geen wijken-veld) neemt de apparaatlijst over
ok(() => {
  localStorage.setItem(KEY, JSON.stringify(['Binnenstad', 'Paddepoel']));
  CI.applyWijkenSeen(undefined);
  if (!same(CI.getWijkenSeen().sort(), ['Binnenstad', 'Paddepoel'])) throw new Error('geen terugval op de apparaatlijst');
}, 'oude save neemt de apparaatlijst');

// --- een save met een eigen lijst gebruikt die lijst, niet het apparaat
ok(() => {
  CI.applyWijkenSeen(['A-kwartier']);
  if (!same(CI.getWijkenSeen(), ['A-kwartier'])) throw new Error('de lijst uit de save wint niet');
  if (localStorage.getItem(KEY) === null) throw new Error('de apparaatlijst is gewist');
}, 'save met eigen lijst wint van het apparaat');

// --- een lege lijst is een geldige lijst: een nieuw spel valt niet terug op het apparaat
ok(() => {
  CI.applyWijkenSeen([]);
  if (CI.getWijkenSeen().length) throw new Error('een lege lijst valt terug op het apparaat');
}, 'een nieuw spel begint met een lege lijst');

// --- rommel in de lijst wordt genegeerd, en de lijst is een kopie
ok(() => {
  CI.applyWijkenSeen(['Binnenstad', 42, null, 'Ebbingekwartier']);
  if (!same(CI.getWijkenSeen().sort(), ['Binnenstad', 'Ebbingekwartier'])) throw new Error('geen schone lijst');
  const kopie = CI.getWijkenSeen();
  kopie.push('Paddepoel');
  if (CI.getWijkenSeen().includes('Paddepoel')) throw new Error('de lijst lekt naar buiten');
}, 'lijst is schoon en een kopie');

// --- de bron: het apparaat wordt niet meer gewist of beschreven, de save bewaart en laadt de lijst
ok(() => {
  const cine = src('cinematics.js');
  if (/removeItem\(\s*WIJK_KEY\s*\)/.test(cine)) throw new Error('cinematics wist de apparaatlijst nog');
  if (/setItem\(\s*WIJK_KEY/.test(cine)) throw new Error('cinematics schrijft de apparaatlijst nog');
  const save = src('savegame.js');
  if (!/wijken:\s*getWijkenSeen\(\)/.test(save)) throw new Error('de save schrijft de wijkenlijst niet');
  if (!/applyWijkenSeen\(d\.wijken\)/.test(save)) throw new Error('de save laadt de wijkenlijst niet');
}, 'save bewaart en laadt de lijst; apparaatlijst alleen nog als terugval');

// --- bron: Nieuw spel wist de apparaatlijst niet meer (geen removeItem bij het starten)
ok(() => {
  const cine = src('cinematics.js');
  const start = cine.slice(cine.indexOf('function playGameStart('), cine.indexOf('function playGameStart(') + 900);
  if (!/if \(!w\.loadedFromSave\) wijkSeen = new Set\(\)/.test(start)) throw new Error('nieuw spel zet de lijst niet leeg');
  if (/removeItem/.test(start)) throw new Error('nieuw spel wist nog iets van het apparaat');
}, 'Nieuw spel wist alleen zijn eigen lijst');

console.log(`wijken-seen: ${n} checks`);
console.log(fails ? `${fails} failure(s)` : 'wijken-seen: ok');
process.exit(fails ? 1 : 0);
