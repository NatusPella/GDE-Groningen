// Test van het clubwapen (game/js/voetbalwapen.js, Club-UI 24-11): elke club in één klasse heeft een eigen combinatie van kleur, accent, patroon en symbool, deterministisch uit de club-id;
// een wapen is een SVG met een label en geen losse kleur buiten de clubkleuren.   node scripts/voetbal_wapen_test.mjs
import assert from 'node:assert/strict';
import PARKDATA from '../game/js/voetbalparkendata.js';
import { makeParkIndex, localDivision } from '../game/js/voetbalparken.js';
import { CLUBS, EUROPE_CLUBS, clubsOf, DIVISIONS } from '../game/js/voetbalclubs.js';
import { crestSvg, crestKey, emblemIndex, EMBLEMS, hexOf } from '../game/js/voetbalwapen.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const uniek = (klasse, naam) => { const keys = klasse.map((c) => crestKey(c, klasse)); assert.equal(new Set(keys).size, keys.length, `${naam}: twee gelijke wapens in één klasse`); };

t('de vaste klassen en de Waddenbeker: geen twee gelijke wapens', () => {
  for (const d of DIVISIONS) uniek(clubsOf(d), d);
  uniek(EUROPE_CLUBS.slice(0, 8), 'europa A'); uniek(EUROPE_CLUBS.slice(8), 'europa B');
});
t('de lokale klassen uit de parkdata: voor veel thuisplekken acht verschillende wapens', () => {
  const index = makeParkIndex(PARKDATA);
  const plaatsen = index.plaatsen.filter((p, i) => i % 7 === 0).slice(0, 20);
  for (const p of plaatsen) { const kl = localDivision(index, { x: p.x, y: p.y }).clubs; assert.equal(kl.length, 8); uniek(kl, `lokaal bij ${p.n}`); }
});
t('het symbool komt deterministisch uit de club-id en schuift alleen bij een botsing', () => {
  const a = { id: 'a1', naam: 'A', shirt: 0xff0000, accent: 0xffffff, patroon: 'effen' };
  assert.equal(emblemIndex(a, []), emblemIndex(a, [a])); assert.equal(emblemIndex(a, []), emblemIndex({ ...a }, []));
  const zelfde = Array.from({ length: 8 }, (_, i) => ({ id: `z${i}`, naam: `Z${i}`, shirt: 0xff0000, accent: 0xffffff, patroon: 'effen' }));
  uniek(zelfde, 'acht clubs met dezelfde kleuren krijgen acht symbolen');
  assert.equal(EMBLEMS.length, 8); assert.equal(new Set(EMBLEMS.map((e) => e.id)).size, 8);
});
t('het wapen is een SVG met label; de clubkleur is data, de rest leest tokens; namen worden ge-escaped', () => {
  const h = crestSvg(CLUBS[0], clubsOf('kroon'), 'xl');
  assert.match(h, /role="img" aria-label="Wapen van De Stadjers"/); assert.match(h, /vb-wapen--xl/); assert.match(h, /fill="#2f9e5b"/);
  assert.ok(!/style=/.test(h), 'geen inline stijl'); assert.ok(/class="vb-wapen__rand"/.test(h) && /vb-wapen__teken/.test(h));
  assert.ok(!crestSvg({ id: 'x', naam: '<b>x</b>', shirt: 1 }).includes('<b>x</b>'));
  assert.equal(crestSvg(null), ''); assert.equal(hexOf(0x0a0b0c), '#0a0b0c'); assert.equal(hexOf(NaN), '#888888');
});
console.log(`voetbal_wapen_test ok (${n} groepen)`);
