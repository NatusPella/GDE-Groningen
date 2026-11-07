// Medailles (#672): één uitleg en één rekenregel voor wat een medaille oplevert, zodat missies,
// vliegschool, postgame en de losse activiteiten hetzelfde verhaal vertellen.
//   node scripts/medailles_test.mjs
import assert from 'node:assert/strict';
import * as M from '../game/js/medalrules.js';
import { medalBonus } from '../game/js/economy.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

t('de namen en de uitleg zijn er één keer, in het Nederlands', () => {
  assert.deepEqual(M.MEDAILLES, ['geen medaille', 'Brons', 'Zilver', 'Goud']);
  assert.equal(typeof M.uitleg(), 'string');
  assert.ok(M.uitleg().length > 100);
  assert.match(M.uitleg(), /brons, zilver of goud/i);
  assert.match(M.uitleg(), /telt nooit twee keer/);
  assert.equal(M.uitleg(), M.UITLEG);
});

t('medailleBedrag: een missie betaalt de eenmalige bonus over de missiebeloning', () => {
  const r = M.medailleBedrag('missie', 2, { reward: 1000, van: 0 });
  assert.equal(r.geld, 400); assert.equal(r.xp, 0); assert.equal(r.eenmalig, true);
  assert.match(r.tekst, /^Zilver · \+€400 medaillebonus \(eenmalig\)$/);
  assert.equal(r.geld, medalBonus(1000, 0, 2));
  // van brons naar goud: alleen het verschil, niet de hele bonus opnieuw
  assert.equal(M.medailleBedrag('missie', 3, { reward: 1000, van: 1 }).geld, medalBonus(1000, 1, 3));
  // de trede is al gehaald: geen bedrag
  const al = M.medailleBedrag('missie', 2, { reward: 1000, van: 2 });
  assert.equal(al.geld, 0); assert.match(al.tekst, /bonus al gehaald/);
  assert.equal(M.medailleBedrag('missie', 0, { reward: 1000 }).geld, 0);
});

t('medailleBedrag: vliegschool, postgame en activiteit vertellen bedrag en punten', () => {
  const v = M.medailleBedrag('vliegschool', 1, { geld: 25, xp: 14 });
  assert.equal(v.geld, 25); assert.equal(v.xp, 14); assert.match(v.tekst, /Brons · \+€25 · \+14 punten \(eerste keer\)/);
  const her = M.medailleBedrag('vliegschool', 3, { geld: 60, xp: 6, eerste: false });
  assert.equal(her.geld, 0); assert.equal(her.xp, 6); assert.match(her.tekst, /opnieuw: geen bedrag/);
  const p = M.medailleBedrag('postgame', 3);
  assert.equal(p.geld, 700); assert.match(p.tekst, /Goud · \+€700/);
  const a = M.medailleBedrag('activiteit', 2, { geld: 20, xp: 40 });
  assert.equal(a.geld, 20); assert.equal(a.xp, 40); assert.match(a.tekst, /Zilver · \+€20 premie · \+40 punten/);
  // onzin begrenst
  assert.equal(M.medailleBedrag('postgame', 9).geld, 700);
  assert.equal(M.medailleBedrag('onbekend', 3).geld, 0);
});

t('volgendeTrede: lager is beter (tijd, slagen) en hoger is beter (punten)', () => {
  const lager = { lager: true, klok: true };
  let r = M.volgendeTrede([6, 1, -2], 8, lager);
  assert.equal(r.medal, 1); assert.equal(r.nodig, 2); assert.equal(r.tekst, 'nog 0:02 tot brons');
  r = M.volgendeTrede([6, 1, -2], 3, lager);
  assert.equal(r.medal, 2); assert.equal(r.tekst, 'nog 0:02 tot zilver');
  r = M.volgendeTrede([6, 1, -2], 0, lager);
  assert.equal(r.medal, 3); assert.equal(r.tekst, 'nog 0:02 tot goud');
  r = M.volgendeTrede([6, 1, -2], -3, lager);
  assert.equal(r.klaar, true); assert.match(r.tekst, /Alle drie de medailles/);
  // hoger is beter: 1.100 van 3.200 is nog 2.100 tot zilver
  r = M.volgendeTrede([1200, 3200, 6500], 1100, { eenheid: 'punten' });
  assert.equal(r.medal, 1); assert.equal(r.nodig, 100); assert.equal(r.tekst, 'nog 100 punten tot brons');
  // geen getal: niets zeggen
  assert.deepEqual(M.volgendeTrede([1, 2, 3], NaN), { onbekend: true, klaar: false, tekst: '' });
  assert.equal(M.volgendeTredeTekst([1, 2, 3], NaN), '');
});

t('volgendePlek: een klassering zegt de volgende plek', () => {
  assert.equal(M.volgendePlek(1).klaar, true);
  assert.equal(M.volgendePlek(2).tekst, 'nog 1 plek tot goud');
  assert.equal(M.volgendePlek(3).tekst, 'nog 1 plek tot zilver');
  assert.equal(M.volgendePlek(0).tekst, '');
});

t('klokTekst: mm:ss, nooit negatief', () => {
  assert.equal(M.klokTekst(4), '0:04');
  assert.equal(M.klokTekst(64), '1:04');
  assert.equal(M.klokTekst(-5), '0:00');
  assert.equal(M.klokTekst(NaN), '0:00');
});


// #672: de uitslagen van de activiteiten gebruiken dezelfde regel en noemen de volgende trede.
// (De missie- en postgame-uitslag volgen in dezelfde stijl; die raken de cutscene- en prestatielaag.)
import fs from 'node:fs';
const bron = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
t('de activiteiten tonen bedrag, punten en de volgende trede', () => {
  for (const f of ['kartbaan.js', 'skatepark.js', 'ringrace.js', 'vliegschool.js']) {
    const src = bron(f);
    assert.match(src, /from '\.\/medalrules\.js'/, f + ' haalt de medailleregel uit medalrules.js');
    assert.match(src, /medailleBedrag\('(activiteit|vliegschool)'/, f + ' noemt bedrag en punten bij de medaille');
  }
  for (const f of ['kartbaan.js', 'skatepark.js', 'ringrace.js']) assert.match(bron(f), /\['Volgende'/, f + ' noemt de volgende trede in de uitslag');
});
console.log(`medailles_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);


