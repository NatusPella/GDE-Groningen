// Opslaan (#584, #585): het sluiten van het venster of de tab bewaart, en geld dat als enige
// verandert (geldwagen, portemonnee) maakt de autosave vuil.
//
// savegame.js haalt three van een CDN en is in Node niet te laden. Daarom halen we de zuivere
// functies (stateSignature, markDirty) als bronblok uit het bestand en draaien die met new Function,
// precies zoals kaartlabels_test.mjs en garage_schade_test.mjs dat doen. De DOM-bedrading van de
// sluit-handlers toetsen we op de bron; een browser of Electron is hier niet nodig.
//   node scripts/savegame_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8');
let n = 0, fails = 0;
const ok = (fn, name) => { n++; try { fn(); } catch (e) { fails++; console.log(`FAIL ${name}: ${e.message}`); } };
const sg = src('savegame.js'), pm = src('pausemenu.js');

const haalFunctie = (bron, naam) => {
  const start = bron.indexOf(`function ${naam}(`);
  assert.ok(start >= 0, `${naam} staat in de bron`);
  let diep = 0, eind = -1;
  for (let i = bron.indexOf('{', start); i < bron.length; i++) {
    if (bron[i] === '{') diep++;
    else if (bron[i] === '}' && --diep === 0) { eind = i; break; }
  }
  assert.ok(eind > start, `${naam} heeft een sluitende accolade`);
  return bron.slice(start, eind + 1);
};

// --- #584: pagehide en beforeunload bewaren synchroon als het spel gestart is ----------------
ok(() => assert.match(sg, /window\.addEventListener\('pagehide', saveOnLeave\)/), 'pagehide-handler is gekoppeld');
ok(() => assert.match(sg, /window\.addEventListener\('beforeunload', saveOnLeave\)/), 'beforeunload gebruikt dezelfde handler');
ok(() => assert.match(sg, /window\.addEventListener\('pageshow', \(\) => \{ leaveSaved = false; \}\)/), 'na terugkeer uit de bfcache mag een volgende keer weer bewaren');
ok(() => assert.match(sg, /document\.addEventListener\('visibilitychange', \(\) => \{\s*if \(document\.hidden && !closeSaveOff && world/), 'de bestaande verberg-tik blijft en respecteert de uitzondering');
ok(() => assert.match(sg, /export function preventCloseSave\(\)/), 'preventCloseSave bestaat');
ok(() => assert.match(pm, /preventCloseSave\(\);[\s\S]{0,200}startNewSlot\(\);\s*location\.reload\(\);/), 'pauzemenu: Nieuw spel zet bewaren-bij-sluiten uit vóór de herstart, zodat de oude wereld niet over de nieuwe plek gaat');

// De handler zelf uit de bron halen en met een nep-venster draaien: pagehide bewaart, maar niet
// twee keer voor hetzelfde vertrek, niet als bewaren is uitgezet en niet buiten een gestart spel.
const haalPijl = (bron, declaratie) => {
  const start = bron.indexOf(`const ${declaratie} = () => {`);
  assert.ok(start >= 0, `${declaratie} staat in de bron`);
  let diep = 0, eind = -1;
  for (let i = bron.indexOf('{', start); i < bron.length; i++) {
    if (bron[i] === '{') diep++;
    else if (bron[i] === '}' && --diep === 0) { eind = i; break; }
  }
  assert.ok(eind > start, `${declaratie} heeft een sluitende accolade`);
  return bron.slice(start, eind + 1);
};
const saveOnLeaveBron = haalPijl(sg, 'saveOnLeave').replace(/^const saveOnLeave = /, '');
const maakHandler = (ctx) => new Function('ctx', `let leaveSaved = false; with (ctx) { return ${saveOnLeaveBron}; }`)(ctx);
const nepVenster = (extra = {}) => {
  const ctx = { world: {}, document: { body: { classList: { contains: (c) => c === 'game-started' } } }, closeSaveOff: false, saveGame: () => { ctx.saves++; }, saves: 0, ...extra };
  return ctx;
};

ok(() => {
  const ctx = nepVenster();
  const saveOnLeave = maakHandler(ctx);
  saveOnLeave();
  saveOnLeave(); // pagehide en beforeunload allebei: één save
  assert.equal(ctx.saves, 1, 'pagehide bewaart één keer');
}, 'pagehide bewaart het spel');

ok(() => {
  const ctx = nepVenster({ closeSaveOff: true });
  maakHandler(ctx)();
  assert.equal(ctx.saves, 0, 'na een bewuste herstart naar een nieuw spel wordt er niet bewaard');
}, 'bewaren-bij-sluiten kan worden uitgezet');

ok(() => {
  const ctx = nepVenster({ world: null });
  maakHandler(ctx)();
  const ctx2 = nepVenster({ document: { body: { classList: { contains: () => false } } } });
  maakHandler(ctx2)();
  assert.equal(ctx.saves + ctx2.saves, 0, 'zonder gestart spel wordt er niet bewaard');
}, 'buiten een gestart spel bewaart pagehide niets');

// --- #585: geld hoort in de autosave-signatuur ------------------------------------------------
// Een vaste nepstand voor alle opgeslagen onderdelen; alleen het kasboek en world.money verschillen.
const stand = {
  lastSig: null,
  SAVE_DEBOUNCE: 2.5,
  dirtyIn: -1,
  getShopSave: () => ({ outfit: 'zomer', ownedOutfits: [], hair: 0, heroColor: 0, heroUpgrades: [], vehicles: [{ key: 'escapade', color: 1, upgrades: [], lost: false }] }),
  getMissionProgress: () => ({ index: 2, completed: [0, 1], seen: [0, 1, 2] }),
  getStorySave: () => ({ step: 3 }),
  getAchievementSaveData: () => ({ done: ['a', 'b'] }),
  getPigeonSaveData: () => null,
  getSideJobSave: () => null,
  getPostgameSave: () => null,
  getFurnitureSave: () => null,
  getGoalSave: () => null,
  getHomeSave: () => null,
  getCheatSave: () => null,
  getRadioSave: () => 'aan',
  getFinanceSave: () => kasboek,
};
let kasboek = { day: 0, total: { in: {}, out: {} }, days: [] };
const { stateSignature, markDirty } = new Function('scope', `with (scope) {
  ${haalFunctie(sg, 'stateSignature')}
  ${haalFunctie(sg, 'markDirty')}
  return { stateSignature, markDirty };
}`)(stand);

const wereld = (money, extra = {}) => ({ money, stats: { missionsDone: 3 }, visitedLandmarks: new Set(['a']), ...extra });

ok(() => {
  const a = stateSignature(wereld(100));
  const b = stateSignature(wereld(100));
  assert.equal(a, b, 'dezelfde stand geeft dezelfde signatuur');
}, 'signatuur is stabiel zonder wijziging');

ok(() => {
  const arm = stateSignature(wereld(100));
  const rijk = stateSignature(wereld(250));
  assert.notEqual(arm, rijk, 'meer geld verandert de signatuur');
}, 'geldwijziging alleen al verandert de signatuur');

ok(() => {
  const voor = stateSignature(wereld(100));
  kasboek = { day: 0, total: { in: { Gevonden: 600 }, out: {} }, days: [{ day: 0, in: { Gevonden: 600 }, out: {} }] };
  const na = stateSignature(wereld(100));
  assert.notEqual(voor, na, 'het kasboek verandert de signatuur');
  kasboek = { day: 0, total: { in: {}, out: {} }, days: [] };
}, 'de financiën-ledger telt mee');

ok(() => {
  // Positie, tijd en gezondheid veranderen elke seconde; die horen hier bewust niet in, anders
  // zou de autosave de hele rit aan staan (zie #569). Ze gaan mee in de save zelf.
  const a = stateSignature(wereld(100, { player: { x: 0, y: 0 }, time: 1, health: 100, wanted: 0 }));
  const b = stateSignature(wereld(100, { player: { x: 120, y: 40 }, time: 9, health: 80, wanted: 3 }));
  assert.equal(a, b, 'positie, tijd en gezondheid maken de autosave niet vuil');
}, 'alleen de bewaarde stand telt, niet het rondlopen');

ok(() => {
  // De tik in updateSaveGame doet precies dit: bij een andere signatuur markDirty().
  assert.match(sg, /const sig = stateSignature\(w\);[\s\S]{0,200}else if \(sig !== lastSig\) \{ lastSig = sig; markDirty\(\); \}/, 'updateSaveGame vergelijkt de signatuur en plant dan een save');
  let last = null;
  stand.dirtyIn = -1;
  const check = (w) => { const s = stateSignature(w); if (last === null) last = s; else if (s !== last) { last = s; markDirty(); } };
  check(wereld(100));
  assert.equal(stand.dirtyIn, -1, 'de eerste tik plant nog niets');
  check(wereld(100));
  assert.equal(stand.dirtyIn, -1, 'zonder wijziging blijft de autosave stil');
  check(wereld(1000));
  assert.equal(stand.dirtyIn, 2.5, 'geld erbij plant de autosave');
}, 'geldwijziging zonder andere status maakt dirty');

console.log(`savegame_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
