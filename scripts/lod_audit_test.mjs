// Het centrale LOD-systeem (besluit eigenaar 23-11: alle modellen krijgen LOD's): de vereenvoudiging (lodsimplify.js), de afstandstrap
// met crossfade en hysterese (lodregistry.js), en de AUDIT: elk model van de gekoppelde soorten (straatmeubilair, bomen, boten, treinen)
// wordt hier echt gebouwd zoals het spel dat doet, en de test faalt als een geregistreerd model geen LOD's heeft of als LOD1/LOD2 niet
// genoeg driehoeken scheelt (LOD_KINDS[kind].minCut). Een nieuwe module die lodkit3d.js gebruikt, komt vanzelf in het register; zet hem
// hieronder bij "bouwen" zodat de audit zijn modellen ziet.
//   node scripts/lod_audit_test.mjs [--tabel]
import './node3d.mjs';
import assert from 'node:assert/strict';

const S = await import('../game/js/lodsimplify.js');
const R = await import('../game/js/lodregistry.js');
const K = await import('../game/js/lodkit3d.js');
const THREE = await import('three');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// --- 1. vereenvoudiging ------------------------------------------------------------------------------------------------------
const plainOf = (g) => {
  const ng = g.index ? g.toNonIndexed() : g;
  const p = ng.getAttribute('position').array;
  const col = new Float32Array(p.length);
  for (let i = 0; i < col.length; i += 3) { col[i] = 0.2; col[i + 1] = 0.6; col[i + 2] = 0.3; }
  return { position: Float32Array.from(p), color: col, index: null };
};
const sphere = plainOf(new THREE.IcosahedronGeometry(1, 3));
const chain = S.buildLodChain(sphere, { minCut: [0.4, 0.7] });
ok(chain.levels.length === 3, `een fijne bol krijgt twee lichtere niveaus (${chain.levels.map((l) => l.tris).join('/')})`);
ok(chain.levels[1].tris <= chain.tris0 * 0.6 && chain.levels[2].tris <= chain.tris0 * 0.3, 'LOD1 en LOD2 halen hun besparing');
ok(S.silhouetteKept(S.bboxOf(sphere.position), S.bboxOf(chain.levels[2].geom.position)), 'het silhouet (de bounding box) blijft');
const c2 = chain.levels[2].geom.color;
ok(c2 && Math.abs(c2[0] - 0.2) < 1e-5 && Math.abs(c2[1] - 0.6) < 1e-5, 'de vertexkleur blijft (het gemiddelde van de cel)');
const cube = plainOf(new THREE.BoxGeometry(1, 1, 1));
ok(S.buildLodChain(cube).levels.length === 1, 'een kubus van 12 driehoeken wordt niet vernield: geen lichter niveau');
ok(S.triCount(S.simplifyClustered(sphere, 10)) <= S.triCount(sphere) * 0.1, 'een cel groter dan het model laat bijna niets over (daarom bewaakt buildLodChain het silhouet)');
// meerdere materialen: elke groep apart, de groepen blijven
{
  const a = new THREE.IcosahedronGeometry(1, 8), b = new THREE.IcosahedronGeometry(0.5, 8).translate(0, 1.4, 0);
  const pa = plainOf(a), pb = plainOf(b);
  const pos = new Float32Array(pa.position.length + pb.position.length); pos.set(pa.position); pos.set(pb.position, pa.position.length);
  const groups = [{ start: 0, count: pa.position.length / 3, materialIndex: 0 }, { start: pa.position.length / 3, count: pb.position.length / 3, materialIndex: 1 }];
  const gc = S.buildLodChainGroups({ position: pos, color: null, index: null }, groups, { minCut: [0.2, 0.5] });
  ok(gc.levels.length >= 2 && gc.levels[1].groups.length === 2 && gc.levels[1].groups[1].materialIndex === 1, 'groepen per materiaal blijven bestaan');
}

// --- 2. afstandstrap, crossfade, hysterese, stand ------------------------------------------------------------------------------
for (const kind of Object.keys(R.LOD_KINDS)) {
  const k = R.LOD_KINDS[kind];
  const maxLevels = k.lod.grenzen.length + 1; // zoveel niveaus kan de soort onderscheiden
  ok(R.lodSpecError(kind) === null, `${kind}: de opgave klopt volgens lodlevels.js (${R.lodSpecError(kind)})`);
  for (let levels = 1; levels <= maxLevels; levels++) {
    let prev = null;
    for (let d = 0; d < 1200; d += 0.5) {
      const ls = R.lodLevelsForFade(kind, d, { levels, slack: 0 });
      const e = R.lodEdges(kind, levels);
      const culled = d > e[levels - 1] + k.lod.band / 2; // voorbij de weg-band (zoals lodChoice: de rand hoort er nog bij)
      if (!culled) ok(ls.length >= 1 && ls.length <= 2, `${kind}/${levels}: op ${d} m één of twee niveaus (${ls})`);
      else ok(ls.length === 0, `${kind}/${levels}: voorbij de cull-afstand niets (${d} m)`);
      if (prev && ls.length && prev.length) ok(Math.max(...ls) >= Math.max(...prev), `${kind}: verder weg nooit een zwaarder niveau`);
      prev = ls;
    }
    if (k.lod.weg == null) ok(!Number.isFinite(R.lodEdges(kind, levels)[levels - 1]), `${kind}: zonder weg blijft het laatste niveau staan`);
    // één systeem: zonder slack zijn de vensters precies lodChoice van lodlevels.js
    for (let d = 0; d < 1000; d += 0.75) {
      const c = R.lodChoiceFor(kind, d, levels);
      const want = [c.a, c.b].filter((x) => x >= 0).sort();
      const got = R.lodLevelsForFade(kind, d, { levels, slack: 0 });
      ok(JSON.stringify(got) === JSON.stringify(want), `${kind}/${levels} op ${d} m: ${got} is lodChoice ${want}`);
    }
  }
}
// hysterese: op de grens springt het niveau niet heen en weer
{
  const e = R.lodEdges('prop', 3)[0];
  ok(R.lodLevel('prop', e + 1, { prev: 0 }) === 0 && R.lodLevel('prop', e + 5, { prev: 0 }) === 1, 'hysterese omhoog: pas 4 m voorbij de grens');
  ok(R.lodLevel('prop', e - 1, { prev: 1 }) === 1 && R.lodLevel('prop', e - 5, { prev: 1 }) === 0, 'hysterese omlaag: pas 4 m binnen de grens');
}
ok(R.lodDistances('prop', R.lodScaleFor('laag'))[0] < R.lodDistances('prop', R.lodScaleFor('hoog'))[0], 'een lichtere stand wisselt eerder');
ok(R.lodScaleFor('hoog') === 1 && R.lodScaleFor('onbekend') === R.lodScaleFor('vlot'), 'Ultra is de maat; een onbekende stand rekent als Hoog');
// een al eenvoudig model (minder niveaus dan de soort vraagt) verdwijnt niet bij de afstand van LOD1
ok(R.lodLevelsForFade('vehicle', 200, { levels: 1, slack: 0 }).length === 1, 'een model met één niveau blijft tot de cull-afstand');

// --- 3. de audit-regels zelf ----------------------------------------------------------------------------------------------------
ok(R.auditLodModel({ kind: 'prop', name: 'x', tris: [400, 200, 100], cull: true }).length === 0, 'goed model');
ok(R.auditLodModel({ kind: 'boat', name: 'x', tris: [400], cull: true }).length === 1, 'een zwaar model met alleen cull faalt');
ok(R.auditLodModel({ kind: 'tree', name: 'x', tris: [400, 390, 100], cull: false }).length === 1, 'LOD1 die te weinig scheelt faalt');
ok(R.auditLodModel({ kind: 'prop', name: 'x', tris: [12], cull: true }).length === 0, 'een minimaal model met cull is in orde');
ok(R.auditLodModel({ kind: 'tree', name: 'x', tris: [12], cull: false }).length === 1, 'een minimaal model zonder cull en zonder LOD1 faalt');

// --- 4. bouwen: de gekoppelde soorten, precies zoals het spel ze bouwt ----------------------------------------------------------
R.clearLodModels();
const SF = await import('../game/js/streetfurniture3d.js');
for (const [k, g, kind] of SF.furnitureModels()) K.makeLodGeometries(kind, 'furniture:' + k, g);
await import('../game/js/scene3d.js'); // bomen: registreert 'boom' en 'kroon' bij het laden
const MV = await import('../game/js/models3d_vehicles.js');
const { BOAT_KINDS } = await import('../game/js/boattypes.js');
let id = 1;
for (const [name, model] of Object.entries(BOAT_KINDS)) MV.buildShipMesh({ id: id++, isBoat: true, model: { ...model }, name });
const R3 = await import('../game/js/railway3d.js');
const { TRAIN_TYPES } = await import('../game/js/railway.js');
for (const cfg of Object.values(TRAIN_TYPES)) for (const seg of cfg.segments) K.makeLodObject('train', 'wagen', (() => { const g = new THREE.Group(); g.add(R3.buildCar(cfg, seg)); return g.children[0]; })());

// 24-11 (beeldregressie, 'platte grijze blokjes' op straat): een klein dier (duif, meeuw, eend) mag op geen enkel niveau tot een plat
// blok vereenvoudigen: elk niveau houdt zijn silhouet (de bounding box per as binnen 80%). De blokjes in het laadschermbeeld zelf komen uit
// game/img/laad/vismarkt.jpg (een render van 15-10, de oude duiven), niet uit de LOD's.
{
  const W = await import('../game/js/wildlife.js');
  for (const [name, mesh] of [['duif', W.buildPigeonMesh3D(0)], ['meeuw', W.buildSeagullMesh3D()], ['eend', W.buildDuckMesh3D()]]) {
    const geos = mesh.userData.lod && mesh.userData.lod.geos;
    ok(geos && geos.length === 3, `${name}: drie niveaus`);
    const b0 = S.bboxOf(geos[0].getAttribute('position').array);
    for (let L = 1; L < geos.length; L++) ok(S.silhouetteKept(b0, S.bboxOf(geos[L].getAttribute('position').array)), `${name}: LOD${L} houdt het silhouet (geen plat blok)`);
  }
}

const models = R.lodModels();
const kinds = new Set(models.map((m) => m.kind));
ok(SF.furnitureLodKind('gantry') === 'propfar' && SF.furnitureLodKind('bench') === 'prop', 'een portaal is van ver te zien, een bankje niet');
for (const kind of ['prop', 'propfar', 'tree', 'treecrown', 'boat', 'train']) ok(kinds.has(kind), `de soort ${kind} heeft geregistreerde modellen`);
const issues = R.auditLod(models);
if (process.argv.includes('--tabel')) for (const m of models) console.log(`${m.kind.padEnd(10)} ${m.name.slice(0, 48).padEnd(48)} ${m.tris.join(' / ')}${m.cull ? ' + cull' : ''}`);
const tot = (L) => models.reduce((a, m) => a + (m.tris[Math.min(L, m.tris.length - 1)] || 0), 0);
console.log(`LOD-audit: ${models.length} modellen; driehoeken LOD0 ${tot(0)}, LOD1 ${tot(1)}, LOD2 ${tot(2)}`);
if (issues.length) { console.log(issues.join('\n')); }
ok(issues.length === 0, `${issues.length} modellen zonder goede LOD's`);
console.log(`lod_audit_test: ${n} controles groen`);
