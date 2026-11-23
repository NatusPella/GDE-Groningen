// Bevindingen 5 en 7 van de video-QA van 23-11 (docs/VIDEO-QA-23-11.md) als blijvende test op de echte modelbouwer:
//  5. Tessa's lange haar mag niet als donker vlak voor haar gezicht hangen: geen haar in het gezichtsvlak (ogen, wangen, mond) en geen
//     bijna zwarte haarkleur (de binnenkant van een lok was 60% van een al bijna zwarte kleur).
//  7. Tammo's hand mag niet als blok uit zijn mouw steken: het deel van de hand dat bij de manchet zit, blijft binnen de doorsnede van de
//     manchet (een doos van 6,8 cm breed stak er met zijn hoeken buiten).
//   node scripts/personage_videoqa_test.mjs
import './node3d.mjs';
const THREE = await import('three');
const P = await import('../game/js/models3d_people.js');

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } else console.log('ok  ', name, extra); };
const { HEAD_Y, SHOULDER_Y } = P.PERSON_RIG;
const ARM_SPLAY = 0.06;

P.personProbe.layers = true;
// driehoeken per laag: [[eersteDriehoek, naam], ...] uit geometry.userData.layers
function layerVerts(mesh, name) {
  const g = mesh.userData.body.geometry, pos = g.attributes.position, col = g.attributes.color;
  const L = g.userData.layers, out = [];
  for (let i = 0; i < L.length - 1; i++) {
    if (L[i][1] !== name) continue;
    for (let t = L[i][0]; t < L[i + 1][0]; t++) for (let v = 0; v < 3; v++) {
      const k = t * 3 + v;
      out.push({ x: pos.getX(k), y: pos.getY(k), z: pos.getZ(k), r: col ? col.getX(k) : 1, g: col ? col.getY(k) : 1, b: col ? col.getZ(k) : 1 });
    }
  }
  return out;
}

// 5: Tessa (en elke andere lange haardos) houdt het gezicht vrij
for (const [who, app] of [['tessa', P.ANITA_APPEARANCE], ['npc lang', { ...P.ANITA_APPEARANCE, character: undefined, seed: 41, hairStyle: 'long' }], ['npc golvend', { ...P.ANITA_APPEARANCE, character: undefined, seed: 43, hairStyle: 'wavy' }]]) {
  const m = P.buildPersonMesh(app.shirt, app.skin, app);
  const hair = layerVerts(m, 'hair');
  ok(hair.length > 0, `${who}: heeft haar`);
  // gezichtsvlak: vóór de slapen (x > 0,055), tussen de wangen (|z| < 0,068), van kin tot net boven de ogen (de haarlijn op het voorhoofd mag)
  const inFace = hair.filter((p) => p.x > 0.055 && Math.abs(p.z) < 0.068 && p.y > HEAD_Y - 0.075 && p.y < HEAD_Y + 0.035);
  ok(inFace.length === 0, `${who}: geen haar voor ogen, wangen of mond`, `(${inFace.length} punten)`);
  // vertexkleuren staan in lineaire ruimte: 0,012 lineair is ca. 0x1c in sRGB, het donkerste wat nog als haar leest
  const darkest = Math.min(...hair.map((p) => 0.3 * p.r + 0.59 * p.g + 0.11 * p.b));
  ok(darkest > 0.012, `${who}: donkerste haartint is geen puur zwart`, `(${darkest.toFixed(4)} lineair)`);
}

// 7: de hand van Tammo (open jack, lange mouw) en van een NPC in een jas: bij de manchet binnen de manchet
for (const [who, app] of [['tammo', P.TAMMO_APPEARANCE], ['npc jas', { shirt: 0x3a3f47, skin: 0xd9a47a, seed: 77 }]]) {
  const m = P.buildPersonMesh(app.shirt, app.skin, app);
  const shZ = m.userData.shZ;
  const hand = layerVerts(m, 'hand');
  ok(hand.length > 0, `${who}: heeft handen`);
  let worst = 0;
  for (const p of hand) {
    const s = p.z >= 0 ? 1 : -1;
    const M = new THREE.Matrix4().compose(new THREE.Vector3(0, SHOULDER_Y, s * shZ), new THREE.Quaternion().setFromEuler(new THREE.Euler(-s * ARM_SPLAY, 0, 0)), new THREE.Vector3(1, 1, 1));
    const q = new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(M.invert());
    if (q.y < -0.56) continue; // de hand zelf, onder de manchet
    // manchet van een jas: ring van de pols (d 0,031, w 0,028) maal 1,22; een hand die daarbuiten komt steekt als blok uit de mouw
    const e = Math.hypot(q.x / (0.031 * 1.22), q.z / (0.028 * 1.22));
    worst = Math.max(worst, e);
  }
  ok(worst <= 1.0, `${who}: hand bij de manchet binnen de mouw`, `(grootste verhouding ${worst.toFixed(2)})`);
}

P.personProbe.layers = false;
console.log(fails ? `${fails} van ${n} mislukt` : `personage_videoqa_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
