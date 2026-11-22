// Contactbladen van het duivenmodel (software-render, geen Electron): zij-, voor- en bovenaanzicht per niveau en per variant.
//   node scripts/pigeonmodel_sheets.mjs [uitmap]     (standaard docs/beeld-22-11/duif)
import './node3d.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderView, sheet } from './lib/pigeon_render.mjs';
const THREE = await import('three');
const M = await import('../game/js/pigeonmodel.js');
const out = process.argv[2] || 'docs/beeld-22-11/duif';
mkdirSync(out, { recursive: true });
const views = ['zij', 'voor', 'boven'];
const row = (geos) => views.map((v) => renderView(THREE, geos, v));
const lift = (lod, o, w) => [{ geo: M.pigeonMerged(lod, o, { wings: w }) }];

// de poses van de spelersduif zoals het spel ze zet (poseBird): vliegen (slag omhoog en omlaag), zitten, lopen, pikken
const PM = await import('../game/js/pigeonmode.js');
const posed = (kind, pose, variant) => {
  const b = PM.buildPigeonBird(kind, variant);
  b.scale.setScalar(1); b.position.y = -0.1;
  PM.posePigeonBird(b, pose);
  b.updateMatrixWorld(true);
  const geos = [];
  b.traverse((o) => { if (o.isMesh) geos.push({ geo: o.geometry, matrix: o.matrixWorld }); });
  return geos;
};
const sit = { flapPhase: 0, amp: 0, fold: 1, grounded: true };
// blad 1: de drie niveaus (gespreid, gevouwen) en de meeuw
const rows1 = [
  row(lift('hi', {}, 0.25)), row(lift('mid', {}, 0.25)), row(lift('far', {}, 0.25)), row(posed('pigeon', sit)), row(lift('hi', { kind: 'gull' }, 0.25)),
];
writeFileSync(`${out}/duif-niveaus.png`, sheet(rows1));
// blad 2: de kleurvarianten op het hoogste niveau, zittend (zij-, voor- en bovenaanzicht)
const rows2 = ['grijs', 'wit', 'bruin', 'gevlekt'].map((v) => row(posed('pigeon', sit, v)));
writeFileSync(`${out}/duif-varianten.png`, sheet(rows2));
const poses = [
  { flapPhase: Math.PI / 2, amp: 0.9, fold: 0, grounded: false }, { flapPhase: -Math.PI / 2, amp: 0.9, fold: 0, grounded: false },
  { flapPhase: 0, amp: 0, fold: 1, grounded: true }, { flapPhase: 0, amp: 0, fold: 1, grounded: true, walkPhase: 1.1 }, { flapPhase: 0, amp: 0, fold: 1, grounded: true, peck: 1 },
];
writeFileSync(`${out}/duif-poses.png`, sheet(poses.map((p) => row(posed('pigeon', p)))));
console.log('geschreven in', out);
