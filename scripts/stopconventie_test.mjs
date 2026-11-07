// #688: één invoer- en stopconventie over alle activiteiten. Puur: de toetsen staan in stopconventie.js,
// minigamekit.js gebruikt ze, en deze test bewaakt de conventie en de uitzondering (I voor vrij hengelen).
//   node scripts/stopconventie_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as S from '../game/js/stopconventie.js';

const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

t('#688: de stopconventie is één tabel: Backspace direct, Esc vraagt, Esc/Enter bevestigt, Spatie gaat door', () => {
  const toetsen = S.stopToetsen();
  assert.equal(toetsen.actie, 'e', 'E is de standaard actietoets');
  assert.deepEqual(toetsen.direct, ['backspace']);
  assert.equal(toetsen.vraag, 'escape');
  assert.deepEqual(toetsen.bevestig, ['escape', 'enter']);
  assert.deepEqual(toetsen.doorgaan, [' ']);
  const u = S.stopUitkomst;
  assert.equal(u({ direct: true }), 'stop', 'Backspace stopt meteen');
  assert.equal(u({ start: true }), 'vraag', 'Esc opent de vraag');
  assert.equal(u({ vraagOpen: true, bevestig: true }), 'stop', 'Esc/Enter bevestigt');
  assert.equal(u({ vraagOpen: true, doorgaan: true }), 'door', 'Spatie gaat door');
  assert.equal(u({ vraagOpen: true }), null, 'niets ingedrukt: de vraag blijft');
  assert.equal(u({ bevestig: true }), null, 'Enter zonder vraag start niets');
  assert.equal(u(), null);
});

t('#688: de uitzondering (I voor vrij hengelen) staat in de conventie en in de kaart', () => {
  assert.equal(S.STOP_UITZONDERING.start, 'i');
  assert.ok(S.STOP_UITZONDERING.tekst.includes('hengelen'));
  const h = bron('hengelen.js');
  assert.match(h, /wasPressed\('i'\)/, 'hengelen start met I');
  const docs = fs.readFileSync(new URL('../docs/DESIGN-BEDIENING.md', import.meta.url), 'utf8');
  assert.match(docs, /één conventie \(#688\)/i, 'de conventie staat in docs/DESIGN-BEDIENING.md');
  assert.match(docs, /vrij hengelen/);
});

t('#688: minigamekit gebruikt de tabel en alle activiteiten lopen via stopPressed', () => {
  const m = bron('minigamekit.js');
  assert.match(m, /from '\.\/stopconventie\.js'/, 'de kit leest de conventie');
  assert.match(m, /stopUitkomst\(\{ direct, vraagOpen: !!stopAsk, bevestig, doorgaan, start \}\)/, 'de kit gebruikt dezelfde uitkomst');
  assert.doesNotMatch(m, /for \(const k of \['escape', 'enter'\]\)/, 'geen tweede stoplijst in de kit');
  const files = fs.readdirSync(new URL('../game/js/', import.meta.url)).filter((f) => f.endsWith('.js'));
  let gebruikt = 0;
  for (const f of files) if (bron(f).includes('stopPressed(')) gebruikt++;
  assert.ok(gebruikt >= 15, 'minstens vijftien spellen/activiteiten gebruiken dezelfde stoptoets: ' + gebruikt);
});

console.log(`stopconventie_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
