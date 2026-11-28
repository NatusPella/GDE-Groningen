// Handel tussen spelers (#1380, deel 3): game/js/loopbaanhandel.js, pure logica. Geen Electron en geen netwerk; berichten zijn gewone objecten die de test zelf aflevert of laat verdwijnen.
//   node scripts/loopbaanhandel_test.mjs
// Dekt: de gewone handel boekt twee kanten, te weinig geld of goederen doet niets, één koper per aanbod, dubbele berichten boeken één keer, en een verbinding die op elk denkbaar moment wegvalt:
// het geld is er altijd nog (totalen), en na het herstellen is de handel af of helemaal teruggedraaid. Geen bronregex.
import assert from 'node:assert/strict';
import * as H from '../game/js/loopbaanhandel.js';

let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 6).join(' | ')); } };
const paar = () => ({ V: H.maakHandelaar('v', { money: 100, stock: { tarwe: 50, mest: 5 } }), K: H.maakHandelaar('k', { money: 500, stock: {} }) });
const AANBOD = { id: 'a1', goed: 'tarwe', aantal: 20, prijs: 140 };

// De hele handel in stappen; elke stap geeft het bericht dat daarna verstuurd wordt (of null als de stap stopt).
function stappen(V, K, o = AANBOD) {
  const m = {};
  return [
    () => { m.aanbod = H.biedAan(V, o); return m.aanbod; },
    () => { m.neem = H.neem(K, m.aanbod, V.id); return m.neem; },
    () => { m.lev = H.levering(V, m.neem, K.id); return m.lev; },
    () => { m.weiger = H.ontvang(K, m.lev, V.id); return m.weiger || { a: 'ok' }; },
    () => { m.betaald = H.betaal(K, o.id); return m.betaald; },
    () => { m.bev = H.afrekenen(V, m.betaald, K.id); return m.bev; },
    () => { H.bevestig(K, m.bev); return { a: 'klaar' }; },
  ];
}
const stand = (V, K) => ({ vGeld: V.money, vTarwe: V.stock.tarwe, kGeld: K.money, kTarwe: K.stock.tarwe || 0 });

t('de gewone handel: de koper betaalt, de verkoper krijgt het geld, de goederen wisselen, niets verdwijnt', () => {
  const { V, K } = paar(); const voor = H.totalen([V, K]);
  const s = stappen(V, K);
  for (const stap of s) { assert.ok(stap()); assert.deepEqual(H.totalen([V, K]), voor, 'op elk moment is alles er nog'); }
  assert.deepEqual(stand(V, K), { vGeld: 240, vTarwe: 30, kGeld: 360, kTarwe: 20 });
  assert.equal(K.journaal.a1.fase, 'klaar'); assert.equal(V.journaal.a1.fase, 'afgerekend');
});

t('een koper zonder geld: er beweegt niets, de goederen gaan terug naar de verkoper', () => {
  const V = H.maakHandelaar('v', { money: 0, stock: { tarwe: 50 } }), K = H.maakHandelaar('k', { money: 10 });
  const s = stappen(V, K); s[0](); s[1](); s[2](); s[3]();
  const w = H.betaal(K, 'a1'); assert.equal(w.a, 'weiger'); assert.equal(w.reden, 'geld');
  assert.ok(H.zetTerug(V, 'a1'));
  assert.deepEqual(stand(V, K), { vGeld: 0, vTarwe: 50, kGeld: 10, kTarwe: 0 });
  assert.equal(V.aanbod.a1.fase, 'open', 'het aanbod staat weer open voor een volgende koper');
});

t('een verkoper met te weinig goederen kan niet aanbieden, en niet meer dan hij heeft (open aanbiedingen tellen mee)', () => {
  const { V } = paar();
  assert.equal(H.biedAan(V, { id: 'x', goed: 'tarwe', aantal: 51, prijs: 10 }), null);
  assert.ok(H.biedAan(V, { id: 'y1', goed: 'tarwe', aantal: 30, prijs: 10 }));
  assert.equal(H.biedAan(V, { id: 'y2', goed: 'tarwe', aantal: 30, prijs: 10 }), null, '30 + 30 is meer dan 50');
  assert.ok(H.biedAan(V, { id: 'y3', goed: 'tarwe', aantal: 20, prijs: 10 }));
});

t('slechte aanbiedingen: negatieve of rare aantallen, een goed met rare tekens, een eigen aanbod nemen, een dubbele id', () => {
  const { V, K } = paar();
  for (const slecht of [{ id: 'a', goed: 'tarwe', aantal: 0, prijs: 5 }, { id: 'a', goed: 'tarwe', aantal: -3, prijs: 5 }, { id: 'a', goed: 'Tarwe!', aantal: 1, prijs: 5 }, { id: '', goed: 'tarwe', aantal: 1, prijs: 5 }, { id: 'a', goed: 'tarwe', aantal: NaN, prijs: 5 }]) assert.equal(H.biedAan(V, slecht), null);
  const a = H.biedAan(V, { id: 'a', goed: 'tarwe', aantal: 1, prijs: 5 });
  assert.equal(H.biedAan(V, { id: 'a', goed: 'tarwe', aantal: 1, prijs: 5 }), null, 'dezelfde id nooit twee keer');
  assert.equal(H.neem(V, a, 'v'), null, 'je eigen aanbod nemen kan niet');
  assert.ok(H.neem(K, a, 'v'));
  assert.equal(H.neem(K, a, 'v'), null, 'ook niet twee keer');
});

t('één koper per aanbod: de tweede die het neemt krijgt niets en de verkoper reserveert maar één keer', () => {
  const V = H.maakHandelaar('v', { stock: { tarwe: 50 } }), K1 = H.maakHandelaar('k1', { money: 500 }), K2 = H.maakHandelaar('k2', { money: 500 });
  const a = H.biedAan(V, AANBOD);
  const n1 = H.neem(K1, a, 'v'), n2 = H.neem(K2, a, 'v');
  assert.ok(H.levering(V, n1, 'k1')); assert.equal(H.levering(V, n2, 'k2'), null);
  assert.equal(V.stock.tarwe, 30, 'maar één keer opzij gezet');
});

t('de koper kan niet betalen voor iets anders dan hij koos, en een verkeerde afzender doet niets', () => {
  const { V, K } = paar(); const a = H.biedAan(V, AANBOD); H.neem(K, a, 'v'); const lev = H.levering(V, { id: 'a1' }, 'k');
  assert.equal(H.ontvang(K, { ...lev, prijs: 1 }, 'v').a, 'weiger', 'een andere prijs dan afgesproken');
  assert.equal(H.betaal(K, 'a1'), null, 'na een weigering is er niets te betalen');
  const { V: V2, K: K2 } = paar(); const a2 = H.biedAan(V2, AANBOD); H.neem(K2, a2, 'v'); const lev2 = H.levering(V2, { id: 'a1' }, 'k');
  assert.equal(H.ontvang(K2, lev2, 'x').a, 'weiger', 'een levering van een ander dan de verkoper');
});

t('een herhaald bericht boekt één keer: dubbel betaald en dubbel afgerekend', () => {
  const { V, K } = paar(); const s = stappen(V, K); for (const stap of s.slice(0, 5)) stap();
  const b = { a: 'betaald', id: 'a1', prijs: 140 };
  assert.ok(H.afrekenen(V, b, 'k')); assert.ok(H.afrekenen(V, b, 'k')); assert.ok(H.afrekenen(V, b, 'k'));
  assert.equal(V.money, 240, 'één keer geboekt');
  assert.equal(H.betaal(K, 'a1'), null, 'de koper betaalt niet nog eens');
  assert.equal(K.money, 360);
  assert.equal(H.afrekenen(V, { ...b, prijs: 1 }, 'k'), null, 'een andere prijs wordt niet erkend');
  assert.equal(V.money, 240);
});

t('een betaling van een vreemde of met een andere prijs wordt niet geboekt', () => {
  const { V, K } = paar(); const s = stappen(V, K); for (const stap of s.slice(0, 4)) stap();
  assert.equal(H.afrekenen(V, { a: 'betaald', id: 'a1', prijs: 140 }, 'vreemde'), null);
  assert.equal(H.afrekenen(V, { a: 'betaald', id: 'a1', prijs: 1 }, 'k'), null, 'de verkoper rekent af op de afgesproken prijs');
  assert.equal(H.afrekenen(V, { a: 'betaald', id: 'onbekend', prijs: 140 }, 'k'), null);
  assert.equal(V.money, 100);
});

// De kern: de verbinding valt weg op elk moment in de handel. Daarna komen ze weer bij elkaar en wordt herstelt wat open staat.
for (let wegNa = 0; wegNa < 7; wegNa++) {
  t(`de verbinding valt weg na stap ${wegNa + 1} van 7: het geld is er altijd nog en na herstel is de handel af of teruggedraaid`, () => {
    const { V, K } = paar(); const voor = H.totalen([V, K]); const s = stappen(V, K);
    for (let i = 0; i <= wegNa; i++) { const m = s[i](); if (!m) break; assert.deepEqual(H.totalen([V, K]).geld, voor.geld, `geld na stap ${i + 1}`); }
    // het bericht van de laatste stap kwam niet aan: beide kanten merken het weggaan
    H.weggevallen(V, 'k'); H.weggevallen(K, 'v');
    assert.equal(H.totalen([V, K]).geld, voor.geld, 'na het wegvallen is het geld er nog (een betaling die onderweg was telt mee)');
    // ze ontmoeten elkaar weer: de koper herhaalt wat open stond
    for (const b of H.open(K, 'v')) { const bev = H.afrekenen(V, b, 'k'); if (bev) H.bevestig(K, bev); }
    const na = stand(V, K);
    const afgerond = na.vGeld === 240 && na.kGeld === 360 && na.kTarwe === 20 && na.vTarwe === 30;
    const teruggedraaid = na.vGeld === 100 && na.kGeld === 500 && na.kTarwe === 0 && na.vTarwe === 50;
    assert.ok(afgerond || teruggedraaid, `halve handel: ${JSON.stringify(na)}`);
    assert.equal(H.totalen([V, K]).geld, voor.geld); assert.equal(H.totalen([V, K]).goed.tarwe, voor.goed.tarwe, 'ook de goederen zijn er nog');
    // een betaalde handel is nooit teruggedraaid, een onbetaalde nooit afgerond
    if (wegNa >= 4) assert.ok(afgerond, 'wie betaald had, heeft zijn goederen en de verkoper zijn geld'); else assert.ok(teruggedraaid, 'voor de betaling is alles zoals het was');
  });
}

t('de betaling kwam aan maar de verkoper zette de reservering al terug: de goederen gaan er weer af, het geld blijft kloppen', () => {
  const { V, K } = paar(); const voor = H.totalen([V, K]); const s = stappen(V, K);
  for (const stap of s.slice(0, 5)) stap();                               // de koper betaalde; het bericht ging verloren
  H.weggevallen(V, 'k');                                                  // de verkoper zette de reservering al terug
  assert.equal(V.stock.tarwe, 50);
  const bev = H.afrekenen(V, { a: 'betaald', id: 'a1', prijs: 140 }, 'k'); H.bevestig(K, bev);
  assert.deepEqual(stand(V, K), { vGeld: 240, vTarwe: 30, kGeld: 360, kTarwe: 20 });
  assert.deepEqual(H.totalen([V, K]), voor);
});

t('wie meerdere aanbiedingen heeft verliest bij het wegvallen van één koper alleen de reservering van die koper', () => {
  const V = H.maakHandelaar('v', { stock: { tarwe: 100 } }), K1 = H.maakHandelaar('k1', { money: 500 }), K2 = H.maakHandelaar('k2', { money: 500 });
  const a = H.biedAan(V, { id: 'a', goed: 'tarwe', aantal: 10, prijs: 50 }), b = H.biedAan(V, { id: 'b', goed: 'tarwe', aantal: 10, prijs: 50 });
  H.levering(V, H.neem(K1, a, 'v'), 'k1'); H.levering(V, H.neem(K2, b, 'v'), 'k2');
  assert.equal(V.stock.tarwe, 80);
  assert.equal(H.weggevallen(V, 'k1'), 1);
  assert.equal(V.stock.tarwe, 90); assert.equal(V.reserve.b, 10, 'de reservering voor K2 blijft');
});

console.log(`loopbaanhandel_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
