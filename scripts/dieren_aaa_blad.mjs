// Beeldblad van de dieren in een rij poses (zoogdieren: staan, kijken naar de speler, stappen, op de vlucht; vogels en de zeehond hun
// eigen poses), software-render zonder Electron.
//   node scripts/dieren_aaa_blad.mjs <uitmap> [bronmap met game/js, standaard deze repo] [voor|na] [soort,soort,...]
// Voor een voor/na-vergelijking: pak de oude commit uit (git archive <commit> game/js | tar -x -C <map>) en geef die map als tweede argument.
// Vogels staan schuin (een driekwartaanzicht van boven), zodat een gespreide vleugel ook in een zijaanzicht te zien is.
import './node3d.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { renderGeometry } from './lib/kleding_clip_png.mjs';
const THREE = await import('three');
const [out = 'dieren_aaa', src = path.resolve(import.meta.dirname, '..'), tag = 'na', alleen = ''] = process.argv.slice(2);
const imp = (f) => import(pathToFileURL(path.join(src, 'game/js', f)).href);
const W = await imp('wildlife.js'), C = await imp('countryside.js'), PM = await imp('pigeonmode.js');
mkdirSync(out, { recursive: true });
const POSES = [
  { naam: 'staan', a: { speed: 0, stride: 0 } },
  { naam: 'kijken', a: { speed: 0, stride: 0, watch: 0.8 } },
  { naam: 'stap', a: { speed: 0.6, stride: 0.9 } },
  { naam: 'vlucht', a: { speed: 2.8, stride: 2.1, fleeT: 2, flee: 2, state: 'flee' } },
];
// t: het tijdstip van de pose (de vleugelslag en de pulsen hangen ervan af), eventueel per soort: de neerslag en de opslag vallen
// per soort op een ander tijdstip (eigen slagfrequentie en zaad)
const VOGEL = [
  { naam: 'staan', t: 12, a: { state: 'ground', speed: 0, z: 0.1 } },
  { naam: 'pikken', t: 12, a: { state: 'ground', speed: 0, peck: 1, z: 0.1 } },
  { naam: 'koeren', t: 4.855, a: { state: 'ground', speed: 0, z: 0.1, coo: 1 } },
  { naam: 'stap', t: 12, a: { state: 'ground', speed: 0.4, stride: 0.05, z: 0.1 } },
  { naam: 'neerslag', t: { duif: 1.53, meeuw: 1.87 }, a: { state: 'fly', speed: 6, z: 0.6, cruise: 0.6, bank: 0, glide: 0 } },
  { naam: 'opslag', t: { duif: 1.406, meeuw: 1.621 }, a: { state: 'fly', speed: 6, z: 0.6, cruise: 0.6, bank: 0, glide: 0 } },
  { naam: 'zweven', t: 3.5, a: { state: 'fly', speed: 6, z: 0.6, cruise: 0.6, bank: 0.35, glide: 1 } },
  { naam: 'landen', t: 12, a: { state: 'land', speed: 1.2, z: 0.5, cruise: 0.5 } },
];
const ZEEHOND = [
  { naam: 'rust', t: 12, a: { state: 'rust', speed: 0 } },
  { naam: 'kop-omhoog', t: 12, a: { state: 'rust', speed: 0, watch: 0.5, headUp: 1 } },
  { naam: 'zwemmen', t: 12.3, a: { state: 'rust', speed: 0.3 } },
  { naam: 'kant', t: 12, a: { state: 'kant', speed: 0 } },
  { naam: 'kruipen', t: 12.25, a: { state: 'naarWater', speed: 1, stride: 0.4 } },
  { naam: 'duik', t: 12, a: { state: 'duik', diveT: 0.3 } },
];
const GANS = [
  ...POSES.slice(0, 3),
  { naam: 'grazen', t: 7.5, a: { speed: 0 } },
  { naam: 'blazen', t: 12, a: { speed: 0, watch: 0.1, hiss: 1 } },
  { naam: 'vlucht', t: 12.03, a: { speed: 2.2, stride: 2.1, fleeT: 2 } },
];
// de speelbare duif van de duivenmodus (pigeonmode.js, hoogste niveau): de poses zoals het spel ze zet (posePigeonBird)
const SPELERDUIF = [
  { naam: 'neerslag', pose: { flapPhase: 2.3, amp: 0.9, fold: 0, grounded: false, time: 1 } },
  { naam: 'opslag', pose: { flapPhase: -1.2, amp: 0.9, fold: 0, grounded: false, time: 1 } },
  { naam: 'zweven', pose: { flapPhase: 0.4, amp: 0.08, fold: 0, grounded: false, roll: 0.45, time: 1 } },
  { naam: 'landen', pose: { flapPhase: 1.4, amp: 0.9, fold: 0, grounded: false, landing: 1, pitch: 0.3, time: 1 } },
  { naam: 'lopen', pose: { flapPhase: 0, amp: 0, fold: 1, grounded: true, walkPhase: 1.1, time: 1 } },
  { naam: 'pikken', pose: { flapPhase: 0, amp: 0, fold: 1, grounded: true, peck: 1, idle: true, time: 1 } },
  { naam: 'koeren', pose: { flapPhase: 0, amp: 0, fold: 1, grounded: true, idle: true, time: 1.3 } },
];
const SOORT = {
  koe: { kind: 'cow', bouw: (i) => W.buildCowMesh3D(0.1 + i * 0.25, false), span: 2.8, hoog: 1.8 },
  schaap: { kind: 'sheep', bouw: (i) => W.buildSheepMesh3D(i), span: 1.6, hoog: 1.2 },
  paard: { kind: 'horse', bouw: (i) => C.buildHorseMesh(i), span: 3.0, hoog: 2.4 },
  kat: { kind: 'cat', bouw: (i) => W.buildCatMesh3D(i), span: 0.9, hoog: 0.6 },
  eend: { kind: 'duck', bouw: (i) => W.buildDuckMesh3D(['drake', 'hen'][i % 2]), span: 0.7, hoog: 0.35, grond: 0.1 },
  reiger: { kind: 'reiger', bouw: () => W.buildDuckMesh3D('reiger'), span: 2.0, hoog: 2.4 },
  hond: { kind: 'dog', bouw: (i) => W.buildDogMesh3D(i, 0.3), span: 1.4, hoog: 0.9 },
  duif: { kind: 'pigeon', bouw: () => W.buildWildlifeMesh3D({ kind: 'pigeon', bobSeed: 0.37 }), span: 0.55, hoog: 0.85, poses: VOGEL, schuin: true },
  meeuw: { kind: 'seagull', bouw: () => W.buildWildlifeMesh3D({ kind: 'seagull', bobSeed: 0.37 }), span: 1.3, hoog: 1.1, poses: VOGEL, schuin: true },
  gans: { kind: 'gans', bouw: () => W.buildWildlifeMesh3D({ kind: 'gans', bobSeed: 0.37 }), span: 1.0, hoog: 0.9, poses: GANS, schuin: true },
  spelerduif: { bouw: () => { const b = PM.buildPigeonBird('pigeon'); b.userData.seed = 0; b.scale.setScalar(1); return b; }, span: 0.55, hoog: 0.5, poses: SPELERDUIF, schuin: true,
    zet: (g, P) => { PM.posePigeonBird(g, P.pose); g.rotation.set(P.pose.roll || 0, 0, P.pose.pitch || 0); g.position.y = P.pose.grounded ? 0 : 0.12; } },
  zeehond: { kind: 'zeehond', bouw: () => W.buildWildlifeMesh3D({ kind: 'zeehond', bobSeed: 0.37 }), span: 1.9, hoog: 1.0, poses: ZEEHOND, grond: 0.15, schuin: true },
};
const wel = alleen ? new Set(alleen.split(',')) : null;
const kant = new THREE.Matrix4().makeRotationX(0.45).multiply(new THREE.Matrix4().makeRotationY(-0.55));
const zichtbaar = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
// één pagina met alle soorten onder elkaar, elke rij even breed geschaald
const pagina = { pos: [], col: [], y: 0 };
for (const [naam, S] of Object.entries(SOORT)) {
  if (wel && !wel.has(naam)) continue;
  const lijst = S.poses || POSES;
  const pos = [], col = [];
  lijst.forEach((P, i) => {
    const g = S.bouw(i);
    const a = { kind: S.kind, bobSeed: 0.37, flapSeed: 0, angle: 0, x: 0, y: 0, ...P.a };
    if (S.zet) S.zet(g, P);
    else W.animateWildlifeMesh3D(g, a, typeof P.t === 'object' ? P.t[naam] ?? 12 : P.t ?? 12);   // t = 12: geen graaspuls, zodat staan ook staan is
    // de eend en de zeehond liggen in de wereld op het water, hier op de grond; op de kant ligt de zeehond al op de grond
    if (S.grond !== undefined && a.state !== 'kant' && a.state !== 'naarWater') g.position.y = S.grond;
    g.updateMatrixWorld(true);
    const v = new THREE.Vector3(), mc = new THREE.Color();
    g.traverse((o) => {
      if (!o.isMesh || !zichtbaar(o)) return;
      const p = o.geometry.attributes.position, c = o.geometry.attributes.color, idx = o.geometry.index, cnt = idx ? idx.count : p.count;
      if (!c) mc.copy(o.material.color || mc.set(0x888888));
      for (let k = 0; k < cnt; k++) {
        const j = idx ? idx.getX(k) : k;
        if (o.isSkinnedMesh) o.getVertexPosition(j, v); else v.fromBufferAttribute(p, j);
        v.applyMatrix4(o.matrixWorld);
        if (S.schuin) v.applyMatrix4(kant);
        pos.push(v.x + i * S.span, v.y, v.z);
        if (c) col.push(c.getX(j), c.getY(j), c.getZ(j)); else col.push(mc.r, mc.g, mc.b);
      }
    });
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  const k = 1 / (lijst.length * S.span), onder = -0.25 * (S.schuin ? S.hoog : 0) - 0.02;
  pagina.y -= (S.hoog - onder) * k + 0.01;
  for (let n = 0; n < pos.length; n += 3) pagina.pos.push((pos[n] + S.span * 0.5) * k, (pos[n + 1] - onder) * k + pagina.y, pos[n + 2] * k);
  pagina.col.push(...col);
  writeFileSync(`${out}/${tag}_${naam}.png`, renderGeometry(geo, { view: 'zij', box: [-S.span * 0.5, -0.25 * (S.schuin ? S.hoog : 0) - 0.02, lijst.length * S.span - S.span * 0.5, S.hoog], ppm: Math.round(1500 / (lijst.length * S.span)) }));
}
const pg = new THREE.BufferGeometry();
pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pagina.pos), 3));
pg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pagina.col), 3));
writeFileSync(`${out}/${tag}_pagina${alleen ? '_' + alleen.replace(/,/g, '-') : ''}.png`, renderGeometry(pg, { view: 'zij', box: [-0.01, pagina.y - 0.01, 1.01, 0.01], ppm: 1500 }));
console.log('klaar', out);
