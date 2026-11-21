// Karakterbonus (karakterbonus.js, #1005, #981): Tessa komt van het platteland. Alleen zij krijgt een bonus, geen NaN, de formules
// zijn begrensd, de uitleg toont de bonus, de boerderij past hem per speler toe en saves blijven werken.
//   node scripts/karakterbonus_test.mjs
import assert from 'node:assert/strict';
import './node3d.mjs';
const K = await import('../game/js/karakterbonus.js');
const B = await import('../game/js/boerderij.js');
const WT = await import('../game/js/werktuigen.js');
const WG = await import('../game/js/werkgang.js');
const Live = await import('../game/js/boerderijlive.js');

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

t('alleen Tessa (anita) heeft een bonus; Tammo en onbekend zijn neutraal', () => {
  assert.equal(K.heeftBonus('anita'), true);
  for (const k of ['tammo', 'rikus', undefined, null, '']) {
    assert.equal(K.heeftBonus(k), false);
    assert.deepEqual(K.farmBonus(k), K.NEUTRAAL.farm);
    assert.deepEqual(K.voetbalBonus(k), K.NEUTRAAL.voetbal);
  }
});
t('de tabel heeft de afgesproken sleutels en gezonde getallen', () => {
  for (const [kar, rij] of Object.entries(K.KARAKTER_BONUS)) {
    for (const s of ['snelheid', 'opbrengst', 'foutloos']) assert.ok(Number.isFinite(rij.farm[s]), kar + ' farm ' + s);
    for (const s of ['sprint', 'schotnauwkeurigheid', 'aanname']) assert.ok(Number.isFinite(rij.voetbal[s]), kar + ' voetbal ' + s);
    for (const s of ['snelheid', 'opbrengst']) assert.ok(rij.farm[s] >= 1 && rij.farm[s] <= K.MAX_FACTOR, 'factor ' + s);
    for (const s of ['sprint', 'schotnauwkeurigheid', 'aanname']) assert.ok(rij.voetbal[s] >= 1 && rij.voetbal[s] <= K.MAX_FACTOR, 'factor ' + s);
  }
  assert.equal(K.KARAKTER_BONUS.anita.farm.snelheid, 1.15);
});
t('balans: de bonus is klein (hooguit 15% op farm-tempo, 10% op voetbal)', () => {
  assert.ok(K.farmSnelheid('anita') <= 1.15 && K.farmOpbrengst('anita') <= 1.05);
  assert.ok(K.voetbalSprint('anita') <= 1.1 && K.voetbalSchot('anita') <= 1.1 && K.voetbalAanname('anita') <= 1.1);
});
t('farmFractie: alleen zaaien en oogsten, nooit boven 1, nooit onder het origineel, geen NaN', () => {
  for (const taak of ['zaaien', 'oogsten']) {
    assert.equal(K.farmFractie('tammo', taak, 0.5), 0.5);
    assert.ok(K.farmFractie('anita', taak, 0.5) > 0.5 && K.farmFractie('anita', taak, 0.5) < 1);
  }
  assert.equal(K.farmFractie('anita', 'ploegen', 0.5), 0.5);
  assert.equal(K.farmFractie('anita', 'oogsten', 1), 1);
  assert.equal(K.farmFractie('anita', 'oogsten', 0), 0.4);
  for (const f of [NaN, undefined, -3, 9, Infinity]) { const r = K.farmFractie('anita', 'oogsten', f); assert.ok(Number.isFinite(r) && r >= 0 && r <= 1, String(f)); }
});
t('voetbalfactoren en aannamekans: begrensd en zonder NaN', () => {
  assert.ok(K.aannameKans('anita', 0.5) > K.aannameKans('tammo', 0.5));
  assert.equal(K.aannameKans('anita', 0.95), 0.99);
  assert.equal(K.aannameKans('anita', NaN), 0);
  assert.equal(K.voetbalSprint('tammo'), 1);
});
t('de uitleg toont de bonus voor Tessa en de eerlijke regel voor Tammo', () => {
  assert.match(K.uitlegRegel('anita', 'farm'), /boerendochter/);
  assert.match(K.uitlegRegel('anita', 'farm'), /15%/);
  assert.match(K.uitlegRegel('anita', 'voetbal'), /dorpsteam/);
  assert.equal(K.uitlegRegel('tammo', 'farm'), '');
  assert.equal(K.kortRegel('tammo', 'farm'), '');
  assert.match(K.kortRegel('anita', 'farm'), /boerendochter/);
});
t('de teksten: Nederlands, zonder echte merken of winter, en de prestatie hoort bij de definitie', () => {
  const alle = JSON.stringify(K.TESSA_REGELS) + K.LORE;
  assert.ok(!/sneeuw|winter|ijs\b/i.test(alle));
  assert.ok(!/Groningen/.test(K.LORE), 'het platteland is niet Groningen');
  assert.equal(K.TESSA_REGELS.prestatie.titel, 'Boerendochter');
});
t('werktuigen en werkgang: Tessa mag harder werken zonder slordig te zijn; Tammo niet', () => {
  assert.equal(WT.nieuwWerk('zaaien', {}).vMax, WT.BANDEN.zaaien.vMax);
  assert.ok(Math.abs(WT.nieuwWerk('zaaien', { snelheid: 1.15 }).vMax - WT.BANDEN.zaaien.vMax * 1.15) < 1e-9);
  assert.equal(WT.nieuwWerk('zaaien', { snelheid: 9 }).vMax, WT.BANDEN.zaaien.vMax);
  assert.ok(WG.init('ploegen', { snelheid: 1.15 }).vMax > WG.init('ploegen', {}).vMax);
  assert.equal(WG.init('afleveren', { snelheid: 1.15 }).soort, 'rit');
});
t('boerderij.rondTaakAf: opbrengstfactor, 1 als hij ontbreekt of rommel is', () => {
  const maak = (op) => {
    const b = B.nieuweBoerderij();
    b.veld = { ...B.nieuwVeld(), fase: 'gezaaid', gewas: 'aardappelen', bodem: 1, zaai: 1, gezaaidOp: 0 };
    b.uren = 1e5; b.totaal = b.totaal || { uitgaven: 0, oogsten: 0 };
    return B.rondTaakAf(b, 'oogsten', 1, { opbrengst: op });
  };
  const basis = maak(undefined).kg;
  assert.ok(basis > 0);
  assert.ok(maak(1.05).kg >= basis);
  assert.equal(maak(NaN).kg, basis);
  assert.equal(maak(-2).kg, basis);
});
t('boerderijlive.rondAf: boeren doe je als Tessa, dus de bonus geldt voor wie de klus doet (ook met Tammo-lichaam, vaste personages)', () => {
  const kg = (kar) => {
    Live.zetBoerderijVoorTest(null, nepOpslag());
    const b = Live.getBoerderij();
    b.veld = { ...B.nieuwVeld(), fase: 'gezaaid', gewas: 'aardappelen', bodem: 1, zaai: 1, gezaaidOp: 0 };
    b.uren = 1e5;
    const w = { money: 0, player: { character: kar }, addMessage() {} };
    return Live.rondAf(w, 'oogsten', 0.8, { vrij: true }).kg;
  };
  const kaal = (() => { const b = B.nieuweBoerderij(); b.veld = { ...B.nieuwVeld(), fase: 'gezaaid', gewas: 'aardappelen', bodem: 1, zaai: 1, gezaaidOp: 0 }; b.uren = 1e5; b.totaal = b.totaal || { uitgaven: 0, oogsten: 0 }; return B.rondTaakAf(b, 'oogsten', 0.8).kg; })();
  const tammo = kg('tammo'), tessa = kg('anita');
  assert.equal(tammo, tessa, 'de bonus volgt de activiteit, niet het lichaam');
  assert.ok(tessa > kaal && tessa < kaal * 1.5, `bonus ${tessa} tegen ${kaal}, geen onoverwinbaar voordeel`);
});
const wereld = (kar = 'tammo', extra = {}) => ({ player: { character: kar }, companion: { character: kar === 'tammo' ? 'anita' : 'tammo' }, msgs: [], addMessage(t) { this.msgs.push(t); }, ...extra });
t('wissel: farm en voetbal worden gespeeld als Tessa, daarna terug naar het vorige personage; maat ruilt mee', () => {
  K.zetWisselHaak(null);
  for (const soort of ['farm', 'voetbal']) {
    const w = wereld('tammo');
    assert.equal(K.startActiviteit(w, soort), true);
    assert.equal(w.player.character, 'anita'); assert.equal(w.companion.character, 'tammo');
    assert.match(w.msgs[0], /Tessa neemt het over: dit is haar/);
    assert.equal(K.startActiviteit(w, soort), false, 'tweede start doet niets');
    assert.equal(K.eindActiviteit(w, soort), true);
    assert.equal(w.player.character, 'tammo'); assert.equal(w.companion.character, 'anita'); assert.equal(w.activiteitKar, null);
  }
  const t2 = wereld('anita');
  assert.equal(K.startActiviteit(t2, 'farm'), false, 'Tessa hoeft niet te wisselen');
  assert.equal(K.eindActiviteit(t2, 'farm'), false); assert.equal(t2.player.character, 'anita');
});
t('wissel: de haak bepaalt de overgang en kan wisselen uitstellen (scene, vlucht)', () => {
  const tekst = []; let mag = false;
  K.zetWisselHaak({ mag: () => mag, toon: (w, x) => tekst.push(x) });
  const w = wereld('tammo');
  assert.equal(K.startActiviteit(w, 'farm'), false); assert.equal(w.player.character, 'tammo'); assert.equal(w.activiteitKar, undefined);
  mag = true;
  assert.equal(K.startActiviteit(w, 'farm'), true); assert.equal(tekst.length, 1);
  K.eindActiviteit(w, 'farm'); assert.match(tekst[1], /Tammo neemt het weer over/);
  K.zetWisselHaak(null);
});
t('wissel: volgActiviteit wisselt bij instappen en pas na een paar seconden terug; een activiteit met eigen einde blijft staan', () => {
  K.zetWisselHaak(null);
  const w = wereld('tammo');
  assert.equal(K.volgActiviteit(w, 'farm', true, 0.016), 'start');
  assert.equal(K.volgActiviteit(w, 'farm', false, 1), null); assert.equal(w.player.character, 'anita');
  K.volgActiviteit(w, 'farm', true, 0.016);
  assert.equal(K.volgActiviteit(w, 'farm', false, 3), null);
  assert.equal(K.volgActiviteit(w, 'farm', false, 2), 'eind'); assert.equal(w.player.character, 'tammo');
  const b = wereld('tammo'); K.startActiviteit(b, 'farm');
  assert.equal(K.volgActiviteit(b, 'farm', false, 60), null); assert.equal(b.player.character, 'anita');
  K.eindActiviteit(b, 'farm'); assert.equal(b.player.character, 'tammo');
  assert.equal(K.volgActiviteit(null, 'farm', false, NaN), null);
  assert.equal(K.volgActiviteit(wereld(), 'farm', false, NaN), null);
});
t('opslaan en laden midden in een activiteit: de save bewaart het eigen personage; laden wist de activiteit', () => {
  K.zetWisselHaak(null);
  const w = wereld('tammo'); K.startActiviteit(w, 'voetbal');
  assert.equal(w.player.character, 'anita'); assert.equal(K.karakterVoorSave(w), 'tammo');
  K.wisActiviteit(w); assert.equal(w.activiteitKar, null);
  assert.equal(K.karakterVoorSave(wereld('anita')), 'anita'); assert.equal(K.karakterVoorSave(null), 'tammo');
  const w2 = wereld('anita'); K.startActiviteit(w2, 'farm'); assert.equal(K.karakterVoorSave(w2), 'anita');
});
t('Samen spelen: elke speler wisselt voor zichzelf; bij vaste personages blijft het lichaam, de Tessa-regels gelden wel', () => {
  K.zetWisselHaak(null);
  const a = wereld('tammo'), b = wereld('anita');
  K.startActiviteit(a, 'farm');
  assert.equal(a.player.character, 'anita'); assert.equal(b.player.character, 'anita'); assert.equal(b.activiteitKar, undefined);
  K.eindActiviteit(a, 'farm'); assert.equal(a.player.character, 'tammo'); assert.equal(b.player.character, 'anita');
  const v = wereld('tammo', { coop: { fixedChars: true } });
  assert.equal(K.startActiviteit(v, 'farm'), false); assert.equal(v.player.character, 'tammo'); assert.ok(v.activiteitKar);
  assert.equal(K.karakterVoorSave(v), 'tammo'); assert.equal(K.karakterVoorActiviteit('farm'), 'anita');
  K.eindActiviteit(v, 'farm'); assert.equal(v.player.character, 'tammo'); assert.equal(v.msgs.length, 0);
});
t('persona-regels: laag gedoseerd (kans en cooldown), per soort, alleen tekst', () => {
  K.wisPersona();
  assert.equal(K.personaRegel('farm', { rng: () => 0.9, nu: 0 }), null, 'boven de kans');
  const eerste = K.personaRegel('farm', { rng: () => 0.1, nu: 100 });
  assert.ok(typeof eerste === 'string' && eerste.length > 0);
  assert.equal(K.personaRegel('farm', { rng: () => 0.1, nu: 100 + K.PERSONA_COOLDOWN_S - 1 }), null, 'cooldown');
  assert.ok(K.personaRegel('farm', { rng: () => 0.1, nu: 100 + K.PERSONA_COOLDOWN_S }));
  assert.ok(K.personaRegel('voetbal', { rng: () => 0.1, nu: 100 }), 'andere soort heeft een eigen cooldown');
  assert.equal(K.personaRegel('onbekend', { rng: () => 0, nu: 0 }), null);
  K.wisPersona(); let n = 0;
  for (let i = 0; i < 1000; i++) if (K.personaRegel('farm', { rng: () => (i % 7) / 7, nu: i * 60 })) n++;
  assert.ok(n > 0 && n < 400, 'af en toe, niet elke klus: ' + n);
  for (const x of K.PERSONA_SOORTEN) { K.wisPersona(); const r = K.personaRegel(x, { rng: () => 0.01, nu: 0 }); assert.ok(r && !/sneeuw|winter|ijs\b/i.test(r)); }
});
t('saves blijven werken: de boerderij heeft geen nieuw opslagveld voor de bonus', () => {
  const b = B.nieuweBoerderij();
  const j = JSON.parse(JSON.stringify(b));
  assert.ok(!('karakter' in j) && !('bonus' in j));
  assert.ok(B.normaliseer(j));
});

console.log(fails ? `${fails} van ${n} mislukt` : `karakterbonus ok (${n} controles)`);
process.exit(fails ? 1 : 0);
