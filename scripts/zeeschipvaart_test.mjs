// Zeeschipvaart (#438): de loodsregels van Lauwersoog en de Eemshaven (game/js/zeeschipvaart.js).
//   node scripts/zeeschipvaart_test.mjs
import assert from 'node:assert/strict';
import { HAVENS, VAART, havenById, maakVaart, doelVan, afstandTotDoel, inHaven, stapVaart, uitslagVan, faseTekst, voortgangTekst } from '../game/js/zeeschipvaart.js';

const dt = 0.5;
const H = (id) => havenById(id);
// Vaar vanuit `van` in een rechte lijn naar het vaste punt `doel` met `v` m/s en houd de
// gebeurtenissen bij. Stopt bij `stopBij` meter van het doel of als de ronde klaar is.
function leg(s, van, doel, v, stopBij = 0.5) {
  const evs = [];
  let p = { ...van };
  for (let k = 0; k < 4000; k++) {
    const dx = doel.x - p.x, dy = doel.y - p.y, dist = Math.hypot(dx, dy);
    if (dist <= stopBij) break;
    const sp = Math.min(v, dist / dt + 1e-9);
    p = { x: p.x + (dx / dist) * sp * dt, y: p.y + (dy / dist) * sp * dt };
    evs.push(...stapVaart(s, { x: p.x, y: p.y, speed: sp }, dt));
    if (s.klaar || s.mislukt) break;
  }
  return { evs, p };
}

// --- de twee havens -------------------------------------------------------------------------
assert.equal(HAVENS.length, 2);
assert.ok(HAVENS.some((h) => h.id === 'zeeschipwad') && HAVENS.some((h) => h.id === 'zeeschipeems'), 'Lauwersoog en de Eemshaven');
for (const h of HAVENS) {
  assert.ok(h.kade && h.boei && Number.isFinite(h.kade.x) && Number.isFinite(h.boei.x), `${h.id}: kade en boei`);
  assert.ok(Math.hypot(h.boei.x - h.kade.x, h.boei.y - h.kade.y) > VAART.havenR, `${h.id}: de boei ligt buiten de havenmond`);
  assert.ok(h.intro.length >= 2 && h.bedrijf.startsWith('Loodswezen'), `${h.id}: verzonnen bedrijf en uitleg`);
}
assert.equal(havenById('bestaat-niet'), null);
assert.equal(maakVaart('bestaat-niet'), null, 'een onbekende haven maakt geen ronde');

// --- de ronde: uit naar de boei, terug en aanleggen ---------------------------------------
{
  const s = maakVaart('zeeschipwad', 1);
  assert.equal(s.fase, 'uit'); assert.equal(s.budget, VAART.budget);
  assert.equal(faseTekst(s), 'Op weg naar de boei');
  assert.deepEqual(doelVan(s), { ...H('zeeschipwad').boei, label: 'de boei bij Lauwersoog' });
  const h = H('zeeschipwad');
  const uit = leg(s, h.kade, h.boei, 3.0, 30);
  assert.ok(uit.evs.some((e) => e.type === 'boei'), 'de boei is gerond');
  assert.equal(s.fase, 'terug');
  assert.equal(faseTekst(s), 'Terug naar de kade');
  assert.equal(doelVan(s).label, 'de kade van Lauwersoog');
  const terug = leg(s, uit.p, h.kade, 2.5, 100);
  assert.ok(!terug.evs.some((e) => e.type === 'fail'), 'onderweg gaat het goed');
  assert.ok(Math.hypot(terug.p.x - h.kade.x, terug.p.y - h.kade.y) <= 110, 'terug bij de havenmond');
  const aanleg = leg(s, terug.p, h.kade, 0.9, 0.5);
  assert.ok(aanleg.evs.some((e) => e.type === 'klaar'), 'aangelegd bij de kade');
  const r = uitslagVan(s);
  assert.equal(r.failed, false);
  assert.ok(r.base >= 90, `loon met de basis erin (${r.base})`);
  assert.equal(r.tip, 30, 'rustig gevaren: fooi');
  assert.equal(r.flawless, true);
  assert.ok(s.t <= s.budget, 'binnen de tijd');
  assert.equal(voortgangTekst(s), 'Aan de kade');
}

// --- te hard in de haven kost de fooi en de tijd, niet meteen de klus ---------------------
{
  const s = maakVaart('zeeschipeems', 1);
  const h = H(s.id);
  const p = { x: h.kade.x + 10, y: h.kade.y };
  assert.equal(inHaven(s, p.x, p.y), true);
  let tehard = 0;
  for (let k = 0; k < 6; k++) tehard += stapVaart(s, { x: p.x, y: p.y, speed: 5 }, dt).filter((e) => e.type === 'tehard').length;
  assert.equal(tehard, 6, 'elke stap in de haven te hard telt');
  assert.ok(s.tehard >= 3 && s.tehard < VAART.tehardMax, 'nog niet mislukt');
  assert.equal(s.mislukt, false);
  // buiten de havenmond is harder varen geen overtreding
  const ver = { x: h.boei.x, y: h.boei.y };
  assert.equal(inHaven(s, ver.x, ver.y), false);
  const s2 = maakVaart(s.id, 1);
  stapVaart(s2, { x: ver.x, y: ver.y, speed: 8 }, dt);
  assert.equal(s2.tehard, 0, 'op de rede mag het schip doorvaren');
}

// --- te lang te hard: de klus mislukt -----------------------------------------------------
{
  const s = maakVaart('zeeschipwad', 1);
  const h = H(s.id);
  let fail = null;
  for (let k = 0; k < 40 && !fail; k++) {
    const ev = stapVaart(s, { x: h.kade.x + 5, y: h.kade.y, speed: 6 }, dt);
    fail = ev.find((e) => e.type === 'fail') || null;
  }
  assert.ok(fail && /haven/.test(fail.why), 'te hard varen in de haven stopt de klus');
  assert.equal(s.mislukt, true);
  assert.equal(uitslagVan(s).failed, true);
  assert.equal(uitslagVan(s).base, 0);
}

// --- de klok: zonder op tijd aanleggen geen loon ------------------------------------------
{
  const s = maakVaart('zeeschipeems', 5);
  assert.equal(s.budget, VAART.budget - 4 * VAART.perNiveau, 'elk niveau is de klok korter');
  const h = H(s.id);
  let fail = null;
  for (let k = 0; k < 2000 && !fail; k++) fail = stapVaart(s, { x: h.kade.x + 20, y: h.kade.y, speed: 1 }, dt).find((e) => e.type === 'fail') || null;
  assert.ok(fail && /loodsploeg/.test(fail.why), 'na het budget is de dienst voorbij');
  assert.equal(uitslagVan(s).tip, 0);
}

// --- aanleggen moet langzaam: langsvaren telt niet ---------------------------------------
{
  const s = maakVaart('zeeschipwad', 1);
  s.fase = 'terug';
  const h = H(s.id);
  const ev = stapVaart(s, { x: h.kade.x, y: h.kade.y, speed: 4 }, dt);
  assert.ok(!ev.some((e) => e.type === 'klaar'), 'te snel langs de kade is niet aangelegd');
  assert.equal(s.klaar, false);
  const ev2 = stapVaart(s, { x: h.kade.x, y: h.kade.y, speed: 0.4 }, dt);
  assert.ok(ev2.some((e) => e.type === 'klaar'), 'stil bij de kade is wel aangelegd');
}

// --- afstand en de hulpjes voor het scherm ------------------------------------------------
{
  const s = maakVaart('zeeschipwad', 1);
  const h = H(s.id);
  assert.equal(afstandTotDoel(s, h.boei.x, h.boei.y), 0);
  assert.ok(afstandTotDoel(s, h.kade.x, h.kade.y) > 300);
  assert.equal(afstandTotDoel(s, NaN, 0), Infinity);
  assert.match(voortgangTekst(s), /Op weg naar de boei · nog \d+ s/);
  assert.equal(voortgangTekst(null), 'Op weg naar de boei · nog 0 s');
  assert.equal(doelVan(null), null);
  assert.equal(inHaven(null, 0, 0), false);
  assert.deepEqual(stapVaart(null, {}, dt), []);
  const klaar = maakVaart('zeeschipeems', 2);
  klaar.klaar = true;
  assert.deepEqual(stapVaart(klaar, { x: 0, y: 0, speed: 0 }, dt), [], 'na het einde gebeurt er niets meer');
}

console.log('zeeschipvaart_test ok');
