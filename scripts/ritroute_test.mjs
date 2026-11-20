// Het pad van de taxirit (#882, playtest 0.64.0: "de taxi rijdt dwars door een gebouw heen"): het pad volgt de weg, snijdt geen gebouwvoetafdruk
// (ook niet op de rechterbaan waar de taxi rijdt) en start en stopt aan de straatkant als de speler of het doel in een gebouw ligt.
//   node scripts/ritroute_test.mjs
import assert from 'node:assert/strict';
import { maakPad, ritRoute, schendingen } from '../game/js/ritroute.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

// Een wereld in een rechte straat: "gebouw" is alles verder dan `breedte` meter van de wegpunten (de straat is een buis).
const dseg = (px, py, A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy || 1; const q = Math.max(0, Math.min(1, ((px - A[0]) * dx + (py - A[1]) * dy) / l2)); return Math.hypot(px - A[0] - dx * q, py - A[1] - dy * q); };
const buis = (pts, breedte) => (x, y) => { let m = Infinity; for (let j = 1; j < pts.length; j++) m = Math.min(m, dseg(x, y, pts[j - 1], pts[j])); return m > breedte; };
const rechthoeken = (...r) => (x, y) => r.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);

t('een pad met ongelijke afstanden tussen de punten zwiept met de gewone spline door de gebouwen; ritRoute doet dat niet', () => {
  // gevonden met een zoekrun (4000 willekeurige routes); de straat is 1,9 m breed aan elke kant van de wegpunten
  const routes = [
    [[0, 0], [85.6, 0], [87.9, 0], [149.8, 0], [149.8, -76.6], [156.9, -76.6]],
    [[0, 0], [0, -72.7], [-67.5, -72.7], [-70.6, -72.7], [-130.2, -72.7], [-130.2, -70.7]],
    [[0, 0], [0, -6.5], [7.9, -6.5], [7.9, -9.1], [-27.2, -9.1], [-32.7, -9.1]],
  ];
  let naiefSlecht = 0;
  for (const pts of routes) {
    const binnen = buis(pts, 1.9);
    if (schendingen(maakPad(pts, 1, 1), binnen, { baan: 0 }) > 0) naiefSlecht++;
    const r = ritRoute(pts, { binnen });
    assert.equal(r.schendingen, 0, 'het veilige pad raakt geen gebouw (ook niet op de rechterbaan)');
    assert.ok(r.pad.len > 0 && Number.isFinite(r.pad.len));
  }
  assert.ok(naiefSlecht >= 2, `de gewone spline raakt hier gebouwen (${naiefSlecht} van 3): de test bewijst iets`);
});

t('een gewone route langs een rij gebouwen houdt de volle spline (gladde bochten) als dat veilig is', () => {
  const pts = [[0, 0], [100, 0], [100, 100]];
  const r = ritRoute(pts, { binnen: rechthoeken([40, 8, 90, 60], [110, -40, 160, -8]) });
  assert.equal(r.mix, 1);
  assert.equal(r.schendingen, 0);
  // de bocht is een bocht: de koers draait geleidelijk
  let maxStap = 0, vorige = r.pad.at(0).a;
  for (let s = 1; s < r.pad.len; s++) { const a = r.pad.at(s).a; let d = a - vorige; d = Math.atan2(Math.sin(d), Math.cos(d)); maxStap = Math.max(maxStap, Math.abs(d)); vorige = a; }
  assert.ok(maxStap < 0.6, `geen knik per meter (${maxStap.toFixed(2)} rad)`);
});

t('speler en doel in een gebouw: de aansluitstukken vallen weg en de taxi start en stopt aan de straatkant', () => {
  const start = { x: -10, y: 8 }, doel = { x: 108, y: 112 };
  const pts = [[-10, 8], [0, 0], [100, 0], [100, 100], [108, 112]];
  const binnen = rechthoeken([-30, 3, -2, 30], [104, 104, 130, 140]); // het gebouw van de speler en dat van het doel
  const r = ritRoute(pts, { start, doel, binnen });
  assert.equal(r.begin, true, 'de speler stond in een gebouw');
  assert.equal(r.eind, true, 'het doel ligt in een gebouw');
  assert.equal(r.bijgesneden, 2);
  const a = r.pad.at(0), z = r.pad.at(r.pad.len);
  assert.ok(Math.hypot(a.x - 0, a.y - 0) < 1.5 && Math.hypot(z.x - 100, z.y - 100) < 3, 'het pad begint op het eerste wegpunt en eindigt op het laatste');
  assert.equal(r.schendingen, 0);
  assert.ok(!binnen(a.x, a.y) && !binnen(z.x, z.y), 'begin en eind liggen buiten de gebouwen');
});

t('speler en doel op straat: niets wordt weggesneden', () => {
  const pts = [[0, 0], [10, 0], [200, 0]];
  const r = ritRoute(pts, { start: { x: 0, y: 0 }, doel: { x: 200, y: 0 }, binnen: () => false });
  // het eerste en laatste punt van de route zijn de speler en het doel zelf: ze worden alsnog weggelaten als aansluiting, maar de route blijft heel
  assert.equal(r.begin, false);
  assert.equal(r.eind, false);
  assert.ok(r.pad.len > 150);
});

t('rare invoer geeft een geldig pad of een nette fout, nooit NaN', () => {
  for (const pts of [[[0, 0], [50, 0]], [[0, 0], [0, 0], [30, 0]], [[0, 0], [NaN, 4], [60, 0]], null]) {
    if (!pts || pts.filter((p) => Number.isFinite(p[0])).length < 2) { assert.throws(() => ritRoute(pts)); continue; }
    const r = ritRoute(pts);
    assert.ok(Number.isFinite(r.pad.len) && r.pad.len > 0);
    const q = r.pad.at(r.pad.len / 2);
    assert.ok(Number.isFinite(q.x) && Number.isFinite(q.y) && Number.isFinite(q.a));
  }
});

t('lange routes: alleen het gereden begin en einde worden gecontroleerd (snel)', () => {
  const pts = [[0, 0], [8000, 0], [8000, 8000]];
  let calls = 0;
  const r = ritRoute(pts, { binnen: () => { calls++; return false; } });
  assert.ok(calls < 4000, `${calls} controles voor 16 km`);
  assert.equal(r.schendingen, 0);
});

console.log(`ritroute_test: ${n}/${n} ok`);
