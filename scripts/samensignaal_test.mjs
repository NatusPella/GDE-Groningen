// De verbindingsniveaus van Samen spelen (samensignaal.js): drempels, woorden en dat er geen milliseconden in de uitleg staan.
//   node scripts/samensignaal_test.mjs
import assert from 'node:assert/strict';
import { verbindingNiveau, verbindingUitleg, NIVEAUS, NIVEAU_TEKST, MATIG_MS, SLECHT_MS } from '../game/js/samensignaal.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok ' + naam); };

t('de drempels staan op volgorde en zijn gewone getallen', () => { assert.ok(MATIG_MS > 0 && SLECHT_MS > MATIG_MS); });
t('lost is weg, lag is slecht, ok zonder meting is goed', () => {
  assert.equal(verbindingNiveau({ verbinding: 'lost', ms: 10 }), 'weg');
  assert.equal(verbindingNiveau({ verbinding: 'lag', ms: 10 }), 'slecht');
  assert.equal(verbindingNiveau({ verbinding: 'ok', ms: null }), 'goed');
  assert.equal(verbindingNiveau({}), 'goed');
  assert.equal(verbindingNiveau(), 'goed');
});
t('de drempels op de grens', () => {
  assert.equal(verbindingNiveau({ verbinding: 'ok', ms: MATIG_MS - 1 }), 'goed');
  assert.equal(verbindingNiveau({ verbinding: 'ok', ms: MATIG_MS }), 'matig');
  assert.equal(verbindingNiveau({ verbinding: 'ok', ms: SLECHT_MS - 1 }), 'matig');
  assert.equal(verbindingNiveau({ verbinding: 'ok', ms: SLECHT_MS }), 'slecht');
});
t('elk niveau heeft een woord en slecht, matig en weg een uitleg zonder getal', () => {
  for (const n of NIVEAUS) assert.ok(NIVEAU_TEKST[n]);
  for (const n of ['matig', 'slecht', 'weg']) for (const eigen of [true, false]) {
    const u = verbindingUitleg(n, { eigen, naam: 'Tijn' });
    assert.ok(u.length > 20); assert.doesNotMatch(u, /\d|\bms\b|ping|NAT|STUN/i);
  }
  assert.equal(verbindingUitleg('goed'), '');
});
t('de uitleg voor een ander noemt zijn naam, die voor jezelf niet', () => {
  assert.match(verbindingUitleg('matig', { naam: 'Tijn' }), /Tijn/);
  assert.doesNotMatch(verbindingUitleg('matig', { eigen: true, naam: 'Tijn' }), /Tijn/);
});
console.log(`samensignaal_test: ${n} tests ok`);
