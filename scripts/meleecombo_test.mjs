// Melee-reeks (#492): losse slagen worden een reeks. De pure regels staan in game/js/meleecombo.js; hier de opbouw,
// het venster van 0,8 s, de misser, de reset en de stand per aanvaller.
//   node scripts/meleecombo_test.mjs
import assert from 'node:assert/strict';
import { nieuweCombo, comboSlag, comboUitslag, VENSTER, FACTOREN, KNOCK_DERDE } from '../game/js/meleecombo.js';

let n = 0;
const t = (naam, f) => { f(); n++; };

t('opbouw: 1e ×1,00, 2e ×1,15, 3e ×1,40 met +0,20 knock, daarna begint de reeks opnieuw', () => {
  assert.deepEqual(nieuweCombo(), { count: 0, laatste: -Infinity });
  let st = nieuweCombo(), nu = 10;
  let s = comboSlag(st, nu);
  assert.deepEqual(s, { factor: 1, knockExtra: 0, count: 1 }, 'de eerste slag is gewoon ×1,00');
  st = comboUitslag(st, nu, true);
  assert.deepEqual(st, { count: 1, laatste: 10 }, 'een treffer telt door');
  nu += 0.3;
  s = comboSlag(st, nu);
  assert.deepEqual([s.factor, s.count], [1.15, 2], 'de tweede slag binnen het venster');
  st = comboUitslag(st, nu, true);
  nu += 0.3;
  s = comboSlag(st, nu);
  assert.deepEqual([s.factor, s.count, s.knockExtra], [1.4, 3, KNOCK_DERDE], 'de derde slag is de zwaarste en duwt harder');
  st = comboUitslag(st, nu, true);
  nu += 0.3;
  s = comboSlag(st, nu);
  assert.deepEqual([s.factor, s.count, s.knockExtra], [1, 1, 0], 'na de derde begint de reeks opnieuw');
  st = comboUitslag(st, nu, true);
  nu += 0.3;
  assert.equal(comboSlag(st, nu).factor, 1.15, 'en loopt dan weer op');
  assert.deepEqual(FACTOREN, [1, 1.15, 1.4]);
});

t('het venster: precies 0,8 s telt nog mee, een haar later begint de reeks opnieuw', () => {
  assert.equal(VENSTER, 0.8);
  const st = { count: 1, laatste: 5 };
  assert.equal(comboSlag(st, 5).factor, 1.15, 'op hetzelfde moment telt de reeks door');
  assert.equal(comboSlag(st, 5 + VENSTER).factor, 1.15, 'de grens zelf telt mee');
  assert.equal(comboSlag(st, 5 + VENSTER + 1e-6).factor, 1, 'net over de grens: terug naar ×1,00');
});

t('0,9 s zonder treffer: de reeks staat weer op ×1,00 (en telt daarna gewoon weer op)', () => {
  const st = { count: 2, laatste: 1 };
  const s = comboSlag(st, 1.9);
  assert.deepEqual(s, { factor: 1, knockExtra: 0, count: 1 });
  const na = comboUitslag(st, 1.9, true);
  assert.deepEqual(na, { count: 1, laatste: 1.9 }, 'de treffer na het venster is de eerste van een nieuwe reeks');
  assert.equal(comboSlag(na, 2.1).factor, 1.15);
});

t('een misser wist de reeks, ook al was het de derde slag', () => {
  let st = nieuweCombo(), nu = 0;
  for (let i = 0; i < 3; i++) { st = comboUitslag(st, nu, true); nu += 0.25; }
  assert.equal(st.count, 3);
  const mis = comboUitslag(st, nu, false);
  assert.deepEqual(mis, nieuweCombo(), 'een misser zet de stand terug op niets');
  assert.equal(comboSlag(mis, nu + 0.1).factor, 1, 'de volgende slag is weer ×1,00');
});

t('per aanvaller: twee standen lopen los van elkaar en de pure module onthoudt zelf niets', () => {
  const a = nieuweCombo(), b = nieuweCombo();
  const a1 = comboUitslag(a, 2, true);
  const a2 = comboUitslag(a1, 2.2, true);
  assert.equal(comboSlag(a2, 2.4).factor, 1.4, 'aanvaller A zit op zijn derde slag');
  assert.equal(comboSlag(b, 2.4).factor, 1, 'aanvaller B begint gewoon bij ×1,00: hij sloeg nog niet');
  const bevroren = { ...a2 };
  comboSlag(a2, 2.4); comboSlag(a2, 3); comboUitslag(b, 2.5, true); comboUitslag(a2, 9, false);
  assert.deepEqual(a2, bevroren, 'comboSlag verandert de stand niet: er is geen stand buiten de wereld');
  assert.equal(comboSlag(a2, 2.4).factor, 1.4, 'twee keer dezelfde vraag geeft hetzelfde antwoord');
  assert.equal(b.count, 0, 'de uitslag van B raakt A niet');
});

t('een lege of rare stand en een onbekende tijd geven veilig ×1,00', () => {
  for (const raar of [undefined, null, {}, { count: 0, laatste: 5 }, { count: -2, laatste: 5 }, { count: 9, laatste: 5 },
    { count: 'twee', laatste: 5 }, { count: 1, laatste: NaN }, { count: 1, laatste: 'gisteren' }, { count: 1, laatste: Infinity }]) {
    const s = comboSlag(raar, 5);
    assert.deepEqual([s.factor, s.knockExtra], [1, 0], JSON.stringify(raar));
  }
  for (const tijd of [NaN, undefined, null, Infinity]) assert.equal(comboSlag({ count: 2, laatste: 0 }, tijd).factor, 1, String(tijd));
  assert.equal(comboSlag({ count: 2, laatste: 10 }, 9).factor, 1, 'een klok die terugloopt is geen reeks');
  assert.deepEqual(comboUitslag({ count: 2, laatste: 10 }, NaN, true), nieuweCombo(), 'een onbekende tijd wist de reeks');
  assert.deepEqual(comboUitslag(null, 5, true), { count: 1, laatste: 5 }, 'een lege stand met een treffer begint bij 1');
  assert.deepEqual(comboUitslag(undefined, 5, false), nieuweCombo());
});

console.log(`meleecombo_test: ${n}/${n} ok`);
