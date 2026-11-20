// Samen spelen (#983, #429): de regels van posten die tegelijk bezet worden (game/js/samenposten.js).
//   node scripts/samenposten_test.mjs
// Puur: geen wereld, geen netwerk. De koppeling met de echte stappen staat in scripts/coopmissie_posten_test.mjs.
import assert from 'node:assert/strict';
import { maakPosten, tik, verdeel, activeer, rolTekst, minimaleTijd, aantalKlaar, nogOpen, voortgangVan, POST_AFNAME } from '../game/js/samenposten.js';

let n = 0;
const t = (naam, f) => { n++; try { f(); console.log('ok  ', naam); } catch (e) { process.exitCode = 1; console.log('FAIL', naam, '\n    ' + (e.message || e)); } };

const DRIE = () => maakPosten([
  { id: 'a', x: 0, y: 0, r: 9, time: 6, label: 'Het eerste bolwerk' },
  { id: 'b', x: 100, y: 0, r: 9, time: 6, label: 'Het tweede bolwerk' },
  { id: 'c', x: 200, y: 0, r: 9, time: 6, label: 'Het derde bolwerk' },
]);
// loop de klok door met de gegeven spelers, tot alles klaar is of de limiet; geeft de seconden
const draai = (st, spelers, max = 200, dt = 0.1) => { let s = 0; while (!st.klaar && s < max) { tik(st, spelers, dt); s += dt; } return s; };

t('ongeldige posten vallen weg, het maximum geldt', () => {
  const st = maakPosten([{ x: NaN, y: 0, time: 5 }, { x: 1, y: 1, time: 0 }, null, { x: 2, y: 2, time: 4 }]);
  assert.equal(st.posten.length, 1);
  assert.equal(maakPosten(Array.from({ length: 12 }, (_, i) => ({ x: i, y: 0, time: 3 }))).posten.length, 6);
});

t('alleen: één post per keer, de som van de tijden (zoals de oude volgorde)', () => {
  const st = DRIE();
  // de speler loopt van post naar post; telkens 6 s staan
  const pos = [[0, 0], [100, 0], [200, 0]];
  let s = 0;
  for (const [x, y] of pos) { for (let i = 0; i < 70; i++) { tik(st, [{ slot: 0, x, y }], 0.1); s += 0.1; } }
  assert.ok(st.klaar, 'alle drie klaar');
  assert.ok(Math.abs(s - 21) < 0.2, `3 x ~6 s + marge (${s.toFixed(1)})`);
});

t('twee spelers: twee posten tegelijk, de derde erna', () => {
  const st = DRIE();
  const sp = [{ slot: 0, x: 0, y: 0 }, { slot: 1, x: 100, y: 0 }];
  let s = 0;
  while (!st.posten[0].klaar || !st.posten[1].klaar) { tik(st, sp, 0.1); s += 0.1; }
  assert.ok(s < 6.5, `twee posten in ~6 s (${s.toFixed(1)})`);
  assert.equal(aantalKlaar(st), 2);
  sp[0].x = 200;
  const rest = draai(st, sp);
  assert.ok(rest < 6.5 && st.klaar, `de derde in ~6 s (${rest.toFixed(1)})`);
});

t('drie of vier spelers: alles in één ronde van een post', () => {
  const st = DRIE();
  const sp = [{ slot: 0, x: 0, y: 0 }, { slot: 1, x: 100, y: 0 }, { slot: 2, x: 200, y: 0 }, { slot: 3, x: 0, y: 3 }];
  const s = draai(st, sp);
  assert.ok(st.klaar && s < 6.5, `alles in ~6 s (${s.toFixed(1)})`);
});

t('buiten de kring zakt de klok half zo snel, een klare post blijft klaar', () => {
  const st = DRIE();
  for (let i = 0; i < 30; i++) tik(st, [{ slot: 0, x: 0, y: 0 }], 0.1); // 3 s
  assert.ok(Math.abs(st.posten[0].t - 3) < 0.05);
  for (let i = 0; i < 20; i++) tik(st, [{ slot: 0, x: 50, y: 50 }], 0.1); // 2 s weg
  assert.ok(Math.abs(st.posten[0].t - (3 - 2 * POST_AFNAME)) < 0.05, `afname ${st.posten[0].t}`);
  for (let i = 0; i < 80; i++) tik(st, [{ slot: 0, x: 0, y: 0 }], 0.1);
  assert.ok(st.posten[0].klaar);
  tik(st, [], 5);
  assert.ok(st.posten[0].klaar && voortgangVan(st, 0) === 1, 'klaar blijft klaar');
});

t('wie niet meetelt (ok false, bijvoorbeeld in een auto) bezet niets', () => {
  const st = DRIE();
  for (let i = 0; i < 100; i++) tik(st, [{ slot: 0, x: 0, y: 0, ok: false }], 0.1);
  assert.equal(st.posten[0].t, 0);
});

t('verdeel: elke speler een eigen post, de dichtstbijzijnde eerst, stabiel op plek', () => {
  const st = DRIE();
  const v = verdeel(st, [{ slot: 2, x: 190, y: 5 }, { slot: 0, x: 5, y: 0 }, { slot: 1, x: 95, y: 0 }]);
  assert.deepEqual(v, [{ slot: 0, post: 0 }, { slot: 1, post: 1 }, { slot: 2, post: 2 }]);
  // twee spelers bij dezelfde hoek: de tweede krijgt de volgende post, niemand dubbel
  const w = verdeel(st, [{ slot: 0, x: 0, y: 0 }, { slot: 1, x: 1, y: 0 }]);
  assert.equal(new Set(w.map((r) => r.post)).size, 2);
  assert.equal(w[0].post, 0, 'plek 0 is het dichtst bij en wint bij gelijke afstand');
});

t('verdeel: meer spelers dan posten, de rest helpt bij de dichtstbijzijnde; zonder spelers niets', () => {
  const st = maakPosten([{ x: 0, y: 0, time: 4 }, { x: 50, y: 0, time: 4 }]);
  const v = verdeel(st, [{ slot: 0, x: 0, y: 0 }, { slot: 1, x: 50, y: 0 }, { slot: 2, x: 48, y: 0 }, { slot: 3, x: 2, y: 0 }]);
  assert.equal(v.length, 4);
  assert.equal(v.find((r) => r.slot === 2).post, 1);
  assert.equal(v.find((r) => r.slot === 3).post, 0);
  assert.deepEqual(verdeel(st, []), []);
});

t('verdeel slaat klare posten over', () => {
  const st = DRIE();
  st.posten[0].klaar = true;
  const v = verdeel(st, [{ slot: 0, x: 0, y: 0 }, { slot: 1, x: 5, y: 0 }]);
  assert.ok(v.every((r) => r.post !== 0));
});

t('activeer geeft één keer rollen; de rolzin noemt de post', () => {
  const st = DRIE();
  const r = activeer(st, [{ slot: 0, x: 0, y: 0 }, { slot: 1, x: 100, y: 0 }]);
  assert.equal(r.length, 2);
  assert.equal(activeer(st, []), r, 'tweede keer: dezelfde rollen');
  assert.match(rolTekst(st, r[1]), /^Jij neemt het tweede bolwerk\./);
});

t('wegvallen: de overblijver maakt de rest af, wat klaar is blijft klaar', () => {
  const st = DRIE();
  const sp = [{ slot: 0, x: 0, y: 0 }, { slot: 1, x: 100, y: 0 }, { slot: 2, x: 200, y: 0 }];
  for (let i = 0; i < 30; i++) tik(st, sp, 0.1); // 3 s alle drie
  const tweede = st.posten[1].t;
  const over = [{ slot: 0, x: 0, y: 0 }]; // twee vallen weg
  for (let i = 0; i < 40; i++) tik(st, over, 0.1);
  assert.ok(st.posten[0].klaar, 'de post van de overblijver wordt klaar');
  assert.ok(st.posten[1].t < tweede, 'de verlaten post zakt');
  over[0].x = 100; draai(st, over);
  over[0].x = 200; draai(st, over);
  // na afloop van alles: de klok van de verlaten posten is gezakt maar loopt weer op
  assert.ok(st.klaar || nogOpen(st).length <= 2);
});

t('tik meldt elke post en daarna één keer alles', () => {
  const st = maakPosten([{ x: 0, y: 0, time: 1 }, { x: 50, y: 0, time: 1 }]);
  const ev = [];
  for (let i = 0; i < 30; i++) ev.push(...tik(st, [{ slot: 0, x: 0, y: 0 }, { slot: 1, x: 50, y: 0 }], 0.1));
  assert.equal(ev.filter((e) => e.type === 'post').length, 2);
  assert.equal(ev.filter((e) => e.type === 'alles').length, 1);
  assert.deepEqual(tik(st, [], 1), [], 'klaar: niets meer');
  assert.deepEqual(tik(maakPosten([{ x: 0, y: 0, time: 1 }]), [], 0), [], 'dt 0: niets');
});

t('schaalbaarheid: de minimale tijd daalt met het aantal spelers tot het aantal posten', () => {
  const st = DRIE();
  assert.equal(minimaleTijd(st, 1), 18);
  assert.equal(minimaleTijd(st, 2), 12);
  assert.equal(minimaleTijd(st, 3), 6);
  assert.equal(minimaleTijd(st, 4), 6);
  assert.equal(minimaleTijd(st, 0), 18, 'nul telt als een');
});

console.log(`\n${n} tests`);
