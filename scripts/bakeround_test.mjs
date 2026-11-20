// Test of the baking round of act 5 (game/js/bakeround.js): the recipe order, wrong ingredients and the redo.
import { createBake, bakeAdd, bakeProgress, bakeKeyId, bakePanel, updateBake, bakeHudModel, RECIPE_PRACTICE, RECIPE_CONTEST } from '../game/js/bakeround.js';
import { readFileSync } from 'node:fs';

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL ' + m); } };

let b = createBake({ order: RECIPE_CONTEST, rounds: 3 });
ok(bakeAdd(b, 'ei') === 'ok', 'first ingredient');
ok(bakeAdd(b, 'zout') === 'ok' && bakeAdd(b, 'meel') === 'ok', 'in order');
ok(bakeAdd(b, 'vet') === 'round' && b.round === 1, 'a ball is done');
ok(bakeProgress(b).round === 2, 'second ball');
ok(bakeAdd(b, 'zout') === 'wrong' && b.step === 0 && b.misses === 1, 'wrong ingredient spoils the ball');
ok(bakeAdd(b, 'bloem') === 'wrong' && /Fries/.test(b.last), 'fine flour is the Frisian one');
ok(bakeAdd(b, 'meel') === 'redo' && b.round === 0 && b.misses === 0 && b.redos === 1, 'three misses: bake again');
for (let r = 0; r < 3; r++) for (const id of RECIPE_CONTEST) bakeAdd(b, id);
ok(b.done && bakeAdd(b, 'ei') === 'done', 'three balls make the round');

b = createBake({ order: RECIPE_PRACTICE, rounds: 1 });
const res = RECIPE_PRACTICE.map((id) => bakeAdd(b, id));
ok(res[res.length - 1] === 'done' && RECIPE_PRACTICE.length === 5, 'practice uses all five ingredients');

// --- meedoen van een gast (#525): de stand en de toets van de gast --------------------------------
b = createBake({ order: RECIPE_CONTEST, rounds: 1 });
ok(b.seq === 1, 'een verse bakronde begint bij stand 1');
const paneel = bakePanel(b, 'Test');
ok(paneel.stap === 'bake' && paneel.toetsen.length === 6 && paneel.nr === 1, 'het paneel noemt de zes ingrediënten en de stand');
bakeAdd(b, 'ei');
ok(b.seq === 2, 'elke poging is een nieuwe stand');
ok(bakeKeyId('3') === 'meel' && bakeKeyId('x') === null, 'de toets hoort bij een ingrediënt');

b = createBake({ order: RECIPE_CONTEST, rounds: 1 });
const inp = { _justPressed: new Set(['1']), wasPressed(k) { return this._justPressed.has(k); }, consume(k) { this._justPressed.delete(k); } };
ok(updateBake(b, inp, 't') === 'ok' && b.step === 1 && !inp._justPressed.has('1'), 'de eigen toets werkt en wordt ingenomen');

b = createBake({ order: RECIPE_CONTEST, rounds: 1 });
updateBake(b, { wasPressed: () => false }, 't', '1');
ok(updateBake(b, { wasPressed: () => false }, 't', '2') === 'ok' && b.step === 2, 'een gast kan de eerste twee ingrediënten toevoegen');

b = createBake({ order: RECIPE_CONTEST, rounds: 1 });
const both = { _justPressed: new Set(['1']), wasPressed(k) { return this._justPressed.has(k); }, consume(k) { this._justPressed.delete(k); } };
ok(updateBake(b, both, 't', '2') === 'ok' && b.step === 1, 'de eigen toets van de gastheer gaat voor');

b = createBake({ order: RECIPE_CONTEST, rounds: 1 });
ok(updateBake(b, { wasPressed: () => false }, 't', 'x') === null && b.step === 0, 'een onbekende toets van een gast doet niets');

// het paneel (#985): de tekst en de balk komen uit een puur model, zonder eigen kleuren in de code
b = createBake({ order: RECIPE_CONTEST, rounds: 3 });
let m = bakeHudModel(b, 'Oma');
ok(m.pct === 0 && m.ronde === 'Eierbal 1 van 3' && m.mislukt === 'Mislukt 0/3' && /volgorde/.test(m.melding) && !m.fout, 'het paneel begint bij nul met de opdracht');
for (const id of RECIPE_CONTEST) bakeAdd(b, id);
m = bakeHudModel(b, 'Oma', 'Eierbal klaar! De volgende.');
ok(m.pct === 33 && m.balkLabel === '1 van 3 klaar' && m.ronde === 'Eierbal 2 van 3' && m.melding === 'Eierbal klaar! De volgende.', 'een klare bal telt in de balk en krijgt zijn melding');
bakeAdd(b, 'ei'); m = bakeHudModel(b, 'Oma');
ok(/Stap 2 van 4/.test(m.melding), 'halverwege een bal staat de stap');
bakeAdd(b, 'bloem'); m = bakeHudModel(b, 'Oma');
ok(m.fout && /Fries/.test(m.melding) && m.mislukt === 'Mislukt 1/3', 'een fout toont de foutmelding en de mislukte ballen');
const bron = readFileSync(new URL('../game/js/bakeround.js', import.meta.url), 'utf8');
ok(!/style\.cssText|#[0-9a-f]{6}/i.test(bron.replace(/\/\/.*$/gm, '')), 'het paneel heeft geen eigen kleuren of inline stijl meer');
ok(/id = 'bakeround'/.test(bron), 'het element heet nog #bakeround (de speelbot zoekt het)');

console.log(`${n - bad}/${n} bakeround checks passed`);
process.exit(bad ? 1 : 0);
