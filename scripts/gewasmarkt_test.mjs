// De markt van de boerderij (#492): dagprijzen per gewas (gewasmarkt.js). Puur: geen DOM, THREE, klok, opslag of Math.random.
//   node scripts/gewasmarkt_test.mjs
// De basisprijzen komen uit GEWASSEN (boerderij.js), zodat de test bewaakt dat de ene bron de enige blijft.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as M from '../game/js/gewasmarkt.js';
import * as B from '../game/js/boerderij.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

const IDS = B.GEWAS_IDS;
const basis = (id) => B.GEWASSEN[id].prijsKg;
const opCenten = (x) => Math.round(x * 100) / 100;

t('de basisprijzen staan op één plek: gewasmarkt.js en GEWASSEN zeggen hetzelfde', () => {
  assert.deepEqual(Object.keys(M.PRIJS_KG).sort(), [...IDS].sort());
  for (const id of IDS) assert.equal(M.PRIJS_KG[id], basis(id), id);
});

t('dagVan: elke vierentwintig speluren een dag; onbekend, negatief en oneindig tellen als dag nul', () => {
  assert.equal(M.dagVan(0), 0);
  assert.equal(M.dagVan(23.9), 0);
  assert.equal(M.dagVan(24), 1);
  assert.equal(M.dagVan(47.99), 1);
  assert.equal(M.dagVan(24 * 100 + 5), 100);
  for (const x of [-1, -24, -1e9, NaN, Infinity, -Infinity, undefined, null, '48', {}, []]) assert.equal(M.dagVan(x), 0, String(x));
});

t('dag nul is precies de basisprijs, met een gelijke trend', () => {
  for (const id of IDS) {
    assert.equal(M.dagprijs(id, 0), basis(id), id);
    assert.deepEqual(M.markt(id, 0), { prijs: basis(id), trend: 'gelijk' });
    for (const rare of [-5, NaN, Infinity, undefined]) assert.equal(M.dagprijs(id, rare), basis(id), `${id} ${String(rare)}`);
  }
});

t('de dagprijs is begrensd: hooguit twintig procent rond de basis, op centen en nooit onder één cent', () => {
  for (const id of IDS) {
    const b = basis(id);
    for (let dag = 0; dag <= 1000; dag++) {
      const p = M.dagprijs(id, dag);
      assert.ok(p >= M.MIN_PRIJS, `${id} dag ${dag}: ${p} onder de cent`);
      assert.ok(p >= b * (1 - M.MAX_SCHOM) - 0.005, `${id} dag ${dag}: ${p} te laag`);
      assert.ok(p <= b * (1 + M.MAX_SCHOM) + 0.005, `${id} dag ${dag}: ${p} te hoog`);
      assert.equal(p, opCenten(p), `${id} dag ${dag}: ${p} is niet op centen afgerond`);
    }
  }
});

t('de dagprijs is deterministisch: dezelfde gewas en dag geven altijd dezelfde prijs', () => {
  for (const id of IDS) for (let dag = 0; dag <= 60; dag++) assert.equal(M.dagprijs(id, dag), M.dagprijs(id, dag), `${id} ${dag}`);
  // en hij hangt niet van de vorige aanroep af: in een andere volgorde hetzelfde antwoord
  const eerste = IDS.map((id) => M.dagprijs(id, 5));
  const tweede = [...IDS].reverse().map((id) => M.dagprijs(id, 5));
  assert.deepEqual(tweede.reverse(), eerste);
});

t('de dagwissel: minstens drie van de vier gewassen hebben op dag 1 een andere prijs dan op dag 0', () => {
  const anders = IDS.filter((id) => M.dagprijs(id, 1) !== M.dagprijs(id, 0));
  assert.ok(anders.length >= 3, `${anders.length} van de 4 anders: ${anders.join(', ')}`);
  // de prijzen bewegen vaker wel dan niet: over een reeks dagen verandert het merendeel
  let wissels = 0;
  for (let dag = 1; dag <= 30; dag++) for (const id of IDS) if (M.dagprijs(id, dag) !== M.dagprijs(id, dag - 1)) wissels++;
  assert.ok(wissels >= 30 * IDS.length * 0.6, `${wissels} wissels in 30 dagen`);
});

t('de trend: op als de prijs stijgt, neer als hij daalt, gelijk als hij blijft, en altijd die van de vorige dag', () => {
  let op = 0, neer = 0, gelijk = 0;
  for (const id of IDS) for (let dag = 0; dag <= 100; dag++) {
    const m = M.markt(id, dag), vorige = M.dagprijs(id, dag > 0 ? dag - 1 : dag);
    const verwacht = m.prijs > vorige ? 'op' : m.prijs < vorige ? 'neer' : 'gelijk';
    assert.equal(m.trend, verwacht, `${id} dag ${dag}`);
    if (m.trend === 'op') op++; else if (m.trend === 'neer') neer++; else gelijk++;
  }
  assert.ok(op > 0 && neer > 0 && gelijk > 0, `op ${op}, neer ${neer}, gelijk ${gelijk}`);
});

t('een onbekend gewas heeft geen prijs en geen trend, en gooit niet', () => {
  for (const id of ['tarwe', 'uien', '', null, undefined, 7, {}]) {
    assert.equal(M.dagprijs(id, 4), 0, String(id));
    assert.deepEqual(M.markt(id, 4), { prijs: 0, trend: 'gelijk' });
  }
});

t('twee spelers met hun eigen boerderij en eigen uren: dezelfde dag geeft dezelfde prijs, een andere dag niet', () => {
  const a = B.nieuweBoerderij(), g = B.nieuweBoerderij();
  a.uren = 24 * 6 + 2; g.uren = 24 * 6 + 20;              // dezelfde speldag, andere uren
  assert.equal(M.dagVan(a.uren), M.dagVan(g.uren));
  for (const id of IDS) assert.equal(M.dagprijs(id, M.dagVan(a.uren)), M.dagprijs(id, M.dagVan(g.uren)));
  g.uren = 24 * 7 + 1;                                    // een dag later: de prijs mag meebewegen
  assert.notEqual(M.dagVan(a.uren), M.dagVan(g.uren));
});

t('geen klok, geen toeval en geen opslag in de regelmodule', () => {
  const src = fs.readFileSync(fileURLToPath(new URL('../game/js/gewasmarkt.js', import.meta.url)), 'utf8');
  const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const verboden of ['Math.random', 'Date.now', 'performance.now', 'localStorage', 'THREE', 'document', 'window', 'setTimeout']) {
    assert.ok(!code.includes(verboden), `gewasmarkt.js gebruikt ${verboden}`);
  }
});

console.log(`gewasmarkt_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
