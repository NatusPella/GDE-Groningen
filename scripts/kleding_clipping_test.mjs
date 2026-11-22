// Kleding-clipping (22-11): bewaakt dat kleding en haar niet door het lichaam of door elkaar steken. De meting (scripts/lib/kleding_clipping.mjs) bouwt
// elke combinatie met de echte modelbouwers en meet de doordringing in mm; de volledige audit (scripts/kleding_clipping_audit.mjs, ca. 6.100
// combinaties, een halve minuut) staat in docs/KLEDING-CLIPPING-22-11.md. Deze lichte test neemt een gelijkmatige steekproef van elke groep, alle
// hoofddeksels op alle kapsels van Tammo, en bewijst dat de meting zelf iets vindt (een bewust kapot kapsel).
//   node scripts/kleding_clipping_test.mjs   (heeft de gevendorde three nodig: cd desktop && npm run stage)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  P, C, D, H, THREE, combos, run, buildCase, measureCase, limitFor, headDepth, rayRange, piecesOf, vertsOf, pieceFor, NEUTRAL, SET_IDS, HAIRS, BODIES, SUBJECT_IDS, HEAD_Y,
} from './lib/kleding_clipping.mjs';

let n = 0, fails = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const mm = (m) => (m * 1000).toFixed(1);
const over = (found) => found.filter((f) => f.depth > limitFor(f.check)).map((f) => `${f.check} ${mm(f.depth)} mm`);

t('de meting zelf: een punt in het hoofd telt, een punt erbuiten niet, een raak op een driehoek geeft de afstand', () => {
  assert.ok(headDepth(0.001, HEAD_Y, 0) > 0.09, 'het midden van het hoofd ligt diep in het hoofd');
  assert.equal(headDepth(0.3, HEAD_Y, 0), 0);
  assert.equal(headDepth(0, HEAD_Y + 0.5, 0), 0);
  const d = headDepth(0.09, HEAD_Y, 0); // 9 mm van de neus-kant: de voorkant ligt op 97 mm
  assert.ok(d > 0 && d < 0.01, 'vlak onder het oppervlak: ' + d);
  const tri = Float64Array.from([1, -1, -1, 1, 1, -1, 1, 0, 1]); // een driehoek op x = 1
  const h = rayRange(tri, 0, 0, 0, 1, 0, 0);
  assert.ok(h && Math.abs(h.tmax - 1) < 1e-9, 'raak op afstand 1');
  assert.equal(rayRange(tri, 0, 0, 0, -1, 0, 0), null, 'achter de straal telt niet');
  const box = new THREE.BoxGeometry(1, 1, 1).toNonIndexed().attributes.position.array;
  assert.equal(piecesOf(Float64Array.from([...box, ...box.map((v, i) => (i % 3 === 0 ? v + 5 : v))])).length, 2, 'twee losse dozen zijn twee stukken');
});

t('de meting vindt wat er te vinden is: haar dat 15 procent te groot is steekt door de pet, een pet in het hoofd wordt geteld', () => {
  const c = buildCase({ who: 'tammo', hair: 'short', worn: { ...NEUTRAL, hat: pieceFor('stadjerspet') } });
  assert.deepEqual(over(measureCase(c)), [], 'de ongeschonden pet is schoon');
  const kapot = { ...c, layers: { ...c.layers } };
  const hair = Float64Array.from(c.layers.hair);
  for (let i = 0; i < hair.length; i += 3) { hair[i] *= 1.15; hair[i + 1] = HEAD_Y + (hair[i + 1] - HEAD_Y) * 1.15; hair[i + 2] *= 1.15; }
  kapot.layers.hair = hair;
  assert.ok(measureCase(kapot).some((f) => f.check === 'haar-door-hoofddeksel' && f.depth > 0.004), 'haar 15 procent groter steekt er duidelijk door');
  const diep = Float64Array.from(c.layers.hatshell).map((v, i) => (i % 3 === 1 ? HEAD_Y + (v - HEAD_Y) * 0.8 : v * 0.8));
  assert.ok(measureCase({ ...c, layers: { ...c.layers, hatshell: diep } }).some((f) => f.check === 'hoofddeksel-in-hoofd' && f.depth > 0.01), 'een pet die 20 procent te klein is zit in het hoofd');
});

t('de pet van Tammo (Stadjerspet) en elke andere schaalhoed: met elk van de 17 kapsels binnen 2 mm op Tammo en Tessa', () => {
  assert.equal(HAIRS.length, 17);
  const slecht = [];
  for (const hat of ['stadjerspet', 'pet', 'platpet', 'mutsje']) for (const hair of HAIRS) for (const who of ['tammo', 'tessa']) {
    const o = over(measureCase(buildCase({ who, hair, worn: { ...NEUTRAL, hat: pieceFor(hat) } })));
    if (o.length) slecht.push(`${who} ${hat} ${hair}: ${o.join(', ')}`);
  }
  assert.deepEqual(slecht, []);
});

t('elk hoofddeksel (ook bandjes en kroon) op elk kapsel, met bril en baard: geen haar door het deksel, geen deksel in het hoofd, geen bril erdoor', () => {
  const slecht = [];
  for (const hat of D.ITEMS.filter((i) => i.slot === 'hat').map((i) => i.id)) for (const hair of HAIRS) {
    const o = over(measureCase(buildCase({ who: 'tessa', hair, worn: { ...NEUTRAL, hat: pieceFor(hat), glasses: pieceFor('zonnebril'), face: pieceFor('snor') } })));
    if (o.length) slecht.push(`${hat} ${hair}: ${o.join(', ')}`);
  }
  assert.deepEqual(slecht, []);
});

t('de agent met zijn vaste pet blijft schoon (politie, tondeuse)', () => {
  assert.deepEqual(over(measureCase(buildCase({ who: 'agent', worn: {} }))), []);
});

// een gelijkmatige steekproef van elke groep van de audit (elke n-de combinatie); de groepen zijn zo gekozen dat elk stuk en elke lichaamsvorm voorkomt
const STRIDE = { stuk: 7, hoofd: 11, jas: 19, schoen: 3, hand: 7, sjaal: 8, tas: 5 };
for (const id of SET_IDS) {
  t(`steekproef groep ${id} (elke ${STRIDE[id]}e combinatie): geen overtreding boven de drempel`, () => {
    const lijst = combos([id], STRIDE[id]);
    assert.ok(lijst.length >= 20, 'te kleine steekproef: ' + lijst.length);
    const slecht = [];
    for (const c of lijst) { const r = run(c); if (r.found.length) slecht.push(`${r.key} (${r.spec.who}/${r.spec.body}${r.spec.hair ? '/' + r.spec.hair : ''}): ${r.found.map((f) => `${f.check} ${mm(f.depth)} mm`).join(', ')}`); }
    assert.deepEqual(slecht.slice(0, 8), []);
  });
}

t('dekking: de audit kent alle 92 stukken, alle 5 lichaamsvormen, alle 17 kapsels en meer dan 6.000 combinaties', () => {
  const alle = combos(null, 1);
  assert.ok(alle.length > 6000, 'combinaties: ' + alle.length);
  const stukken = new Set(alle.filter((c) => c.set === 'stuk').map((c) => c.key));
  assert.equal(stukken.size, D.ITEMS.length, 'elk stuk komt voor');
  assert.equal(D.ITEMS.filter((i) => !i.npc).length, 88, '63 winkelstukken en 25 stukken voetbalkleding');
  assert.equal(new Set(D.ITEMS.map((i) => i.slot)).size, 14, 'twaalf slots en de sportslots kousen en scheenbeschermers');
  assert.deepEqual(new Set(alle.filter((c) => c.set === 'stuk').map((c) => c.spec.body)), new Set(BODIES));
  assert.deepEqual(new Set(alle.filter((c) => c.set === 'stuk').map((c) => c.spec.who)), new Set(SUBJECT_IDS));
  assert.deepEqual(new Set(alle.filter((c) => c.set === 'hoofd' && c.spec.hair).map((c) => c.spec.hair)), new Set(HAIRS));
});

t('Samen spelen: de outfit-code geeft dezelfde geometrie als de kleding zelf (geen netwerkwijziging nodig)', () => {
  const worn = { hat: 'stadjerspet.roest', outer: 'jack.blauw', top: 'overhemd.wit', bottom: 'jeans.jeans', shoes: 'gympen.wit', neck: 'sjaal.rood', jewel: 'parels.wit', wrist: 'horloge.zwart', hands: 'werkhandschoen.grijs', face: 'stoppels.natuur', hair: 'quiff.bruin', body: 'breed' };
  const thuis = C.outfitToLook(worn, {});
  const code = C.encodeOutfit(worn);
  const bij = C.outfitToLook(C.decodeOutfit(code), {});
  const bouw = (o) => P.buildPersonMesh(o.shirt, 0xd9b08c, { seed: 7, variant: 'male', look: o.look, ...(o.pants != null ? { pants: o.pants } : {}), ...(o.shoes != null ? { shoes: o.shoes } : {}), ...(o.cap != null ? { cap: o.cap } : {}), ...(o.body ? { body: o.body } : {}), ...(o.hairStyle ? { hairStyle: o.hairStyle } : {}), ...(o.hair != null ? { hair: o.hair } : {}) });
  const a = bouw(thuis).userData.body.geometry.attributes.position.array, b = bouw(bij).userData.body.geometry.attributes.position.array;
  assert.equal(a.length, b.length);
  assert.ok(a.every((v, i) => v === b[i]), 'dezelfde driehoeken bij de ander');
  assert.deepEqual(over(measureCase(buildCase({ who: 'npcM', body: 'breed', hair: 'quiff', worn: C.decodeOutfit(code) }))), [], 'en die zijn schoon');
});

t('de meetpoort staat uit in het spel zelf: zonder personProbe.layers houdt de bouwer geen lagenlijst bij', () => {
  const src = readFileSync(new URL('../game/js/models3d_people.js', import.meta.url), 'utf8');
  assert.match(src, /export const personProbe = \{ layers: false \}/);
  assert.match(src, /const tag = \(B, name\) => \{ if \(B\.layers\)/);
  // geen spelmodule zet de meetpoort aan
  for (const f of ['scene3d.js', 'shops.js', 'coopfigures3d.js', 'crowd.js']) assert.ok(!/personProbe/.test(readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8')), f);
});

t('prestaties: de reparaties maken een figuur niet merkbaar duurder (driehoeken per hoofddeksel-kapsel binnen de oude grens, een mesh)', () => {
  const nu = (worn, extra = {}) => { const c = buildCase({ who: 'tammo', hair: 'curly', worn: { ...NEUTRAL, ...worn }, ...extra }); return { tri: c.geo.attributes.position.count / 3, meshes: 1 + (c.group.userData.clothingMeshes || []).length }; };
  assert.ok(nu({ hat: pieceFor('stadjerspet') }).tri < 3500, 'pet met krullen');
  assert.ok(nu({ outer: pieceFor('jack'), top: pieceFor('overhemd'), neck: pieceFor('sjaal') }).tri < 3500, 'jas met sjaal');
  assert.equal(nu({ jewel: pieceFor('parels') }).meshes, 2, 'een parelsnoer is een extra mesh, zoals voorheen');
  assert.ok(nu({ jewel: pieceFor('parels') }).tri >= 0);
});

for (const [name, fn] of tests) {
  n++;
  try { C.resetClothing(); await fn(); } catch (e) { fails++; console.log('FAIL', name, '|', String(e.stack || e.message).split('\n').slice(0, 6).join(' / ')); }
}
console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} tests`);
process.exit(fails ? 1 : 0);
