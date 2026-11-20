// Het Loopbanen-overzicht (loopbaanmodel.js, #1010): kaarten met niveau, voortgang en volgende beloning, de hoofdactie
// (Doorgaan of Nu starten), eis en verdiensten, en de leeg-staat.   node scripts/loopbaanmodel_test.mjs
import assert from 'node:assert/strict';
import './node3d.mjs';
const L = await import('../game/js/loopbaan.js');
const M = await import('../game/js/loopbaanmodel.js');

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

const nieuw = () => L.nieuwProfiel();

t('een nieuw profiel is leeg: geen enkele loopbaan begonnen, elke kaart zegt Nu starten', () => {
  const o = M.overzicht(nieuw());
  assert.equal(o.leeg, true);
  assert.equal(o.begonnen, 0);
  assert.equal(o.totaal, L.VAKKEN.length);
  assert.deepEqual(o.groepen.map((g) => g.groep.id), L.GROEPEN.map((g) => g.id));
  for (const k of o.groepen.flatMap((g) => g.kaarten)) {
    assert.equal(k.actie, 'starten', k.id);
    assert.equal(k.actieLabel, 'Nu starten');
    assert.equal(k.stand, 'Nog niet begonnen');
    assert.equal(k.pct, 0);
  }
});

t('de kaarten staan in de vaste volgorde van loopbaan.js, ook na punten (de lijst springt niet)', () => {
  const p = nieuw();
  const voor = M.overzicht(p).groepen.flatMap((g) => g.kaarten.map((k) => k.id));
  L.startVak(p, 'trein');
  L.tel(p, 'trein', { n: 5, xp: 60 });
  assert.deepEqual(M.overzicht(p).groepen.flatMap((g) => g.kaarten.map((k) => k.id)), voor);
  assert.deepEqual(voor, L.GROEPEN.flatMap((g) => L.VAKKEN.filter((v) => v.groep === g.id).map((v) => v.id)));
});

t('een begonnen loopbaan toont niveau, voortgang en de volgende beloning, met Doorgaan', () => {
  const p = nieuw();
  L.startVak(p, 'trein');
  L.tel(p, 'trein', { n: 3, xp: 60 });
  const k = M.vakKaart(p, L.vakInfo('trein'));
  assert.equal(k.gestart, true);
  assert.equal(k.actie, 'doorgaan');
  assert.equal(k.actieLabel, 'Doorgaan');
  assert.ok(k.niveau >= 2, 'niveau uit de punten');
  assert.ok(k.pct > 0 && k.pct < 100, `voortgang ${k.pct}`);
  assert.match(k.beloning, /\+\d+% loon/, 'de beloning noemt het loon');
  assert.ok(k.volgend && k.beloning.startsWith(k.volgend));
  assert.equal(M.overzicht(p).leeg, false);
  assert.equal(M.overzicht(p).begonnen, 1);
});

t('op het hoogste niveau is er geen volgende beloning en geen Doorgaan', () => {
  const p = nieuw();
  L.startVak(p, 'trein');
  L.tel(p, 'trein', { n: 99, xp: 99999 });
  const k = M.vakKaart(p, L.vakInfo('trein'));
  assert.equal(k.niveau, L.MAX_NIVEAU);
  assert.equal(k.volgend, null);
  assert.equal(k.actie, 'klaar');
  assert.equal(k.beloning, 'Hoogste niveau bereikt');
  assert.equal(M.hoofdActie(p, 'trein').soort, 'klaar');
});

t('hoofdactie: starten bij een nieuw vak, het doel zetten als de volgende bijbaan te kiezen is, anders naar Activiteiten', () => {
  const p = nieuw();
  const start = M.hoofdActie(p, 'trein', new Set());
  assert.equal(start.soort, 'start');
  assert.equal(start.label, 'Nu starten');
  L.startVak(p, 'trein');
  L.tel(p, 'trein', { n: 1, xp: 5 });
  const stap = L.volgendeStap(p, 'trein');
  const zonder = M.hoofdActie(p, 'trein', new Set());
  assert.equal(zonder.soort, 'activiteiten');
  assert.equal(zonder.label, 'Doorgaan');
  if (stap && stap.waar) {
    const met = M.hoofdActie(p, 'trein', new Set([stap.waar]));
    assert.equal(met.soort, 'doel');
    assert.equal(met.baan, stap.waar);
    assert.equal(met.label, 'Doorgaan');
  }
  assert.equal(M.hoofdActie(p, 'bestaat-niet'), null);
});

t('eis en verdiensten zijn korte zinnen: wat nog moet, wat het nu betaalt en wat daarna', () => {
  const p = nieuw();
  L.startVak(p, 'trein');
  const e0 = M.eisEnVerdiensten(p, 'trein');
  assert.match(e0.eis, /^Nog \d+.* punten tot /);
  assert.equal(e0.verdiensten, 'basisloon');
  assert.match(e0.volgende, /\+\d+% loon/);
  L.tel(p, 'trein', { n: 1, xp: 60 });
  const e1 = M.eisEnVerdiensten(p, 'trein');
  assert.match(e1.verdiensten, /^\+\d+% loon$/);
  assert.ok(e1.pct >= 0 && e1.pct <= 100);
});

t('de bron: kaarten zonder tellers achter de kop, één gele hoofdknop in het detail, leeg-staat met uitnodiging', () => {
  const ui = fs_lees('game/js/loopbaanui.js');
  assert.match(ui, /class="m-bp lb-hoofd" data-vak-start=/);
  assert.match(ui, /data-todo-goal="job:\$\{esc\(a\.baan\)\}">\$\{esc\(a\.label\)\}/);
  assert.doesNotMatch(ui, /lb-gn/);
  assert.match(ui, /\(leeg \? hero : balk\)/, 'zonder voortgang de uitnodiging, anders de koprij');
  assert.match(ui, /aria-label="\$\{esc\(label\)\}"/, 'elke kaart heeft een volledige naam voor een schermlezer');
});

import fs from 'node:fs';
function fs_lees(f) { return fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'); }

console.log(`loopbaanmodel_test: ${n - fails}/${n}`);
if (fails) process.exit(1);
