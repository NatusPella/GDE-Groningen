import * as THREE from 'three';
import { addStaticCollider } from './breakables.js';
import { buildPerrons, PERRON_TOP } from './perrons.js';
import { perronMateriaal, perronTegelUV, RAND_M, RAND_KLEUR } from './stationperronmateriaal.js';

// De perrons en trappen van map.perrons (perrons.js, #436) als beeld: een vloer met een stoeprand en een gemetselde zijkant tot op de grond,
// een trap (treden, leuning) of een helling met een bord en paaltjes aan de voet. De paaltjes zijn vast (een auto past er niet tussen,
// een fiets wel). Het loopvlak en de randen zelf zitten in het hoogtemodel (elevation.js addPerrons).

// Elk loopvlak draagt de tegel uit stationperronmateriaal.js (#502): zonder map was een perron één egale kleur en werd het 's nachts,
// onder het blauwe nachtlicht, één lavendelvlak zonder voegen, terwijl de straat ernaast wél betegeld is. De rand is een lichte
// betonband (RAND_M breed) in plaats van het felle geel: dat gele vlak las nachts als een lichtgevende streep.
const MAT = {
  top: perronMateriaal(0xa4a5a0),
  rand: perronMateriaal(RAND_KLEUR, { roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  zij: perronMateriaal(0x7a6f66, { roughness: 0.95 }),
  // de onderkant van een perron op een dijk of viaduct: van onderen zie je anders
  // door de open vloer heen (Groningen Noord boven de Kastanjelaan, #961)
  onder: perronMateriaal(0x6f665e, { roughness: 0.95 }),
  trede: perronMateriaal(0x9a9b96, { roughness: 0.9 }),
  stoot: perronMateriaal(0x6a6b66, { roughness: 0.9 }),
  leuning: new THREE.MeshStandardMaterial({ color: 0x2f3e36, roughness: 0.6, metalness: 0.4, flatShading: true, side: THREE.DoubleSide }),
  paal: new THREE.MeshStandardMaterial({ color: 0xe3b81f, roughness: 0.7, flatShading: true }),
  mast: new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.6, metalness: 0.5, flatShading: true }),
};
const BORD_BLAUW = 0x1d4f8f;

// Een bak driehoeken per materiaal; punten in kaartcoördinaten (x, y, hoogte), in de scène (x, hoogte, y).
class Mesh {
  constructor() { this.v = []; }
  tri(a, b, c) { for (const p of [a, b, c]) this.v.push(p[0], p[2], p[1]); }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.v, 3));
    g.computeVertexNormals();
    // uv's uit de wereldmaat, anders ligt er één tegel over de hele strook (#502)
    perronTegelUV(g);
    g.computeBoundingSphere();
    return g;
  }
}

const GROND = -0.15;
const lerp = (a, b, t) => a + (b - a) * t;
// Tot waar de zijkant van een perron doorloopt: tot de grond waar het perron op staat
// (de spoorvloer, PERRON_TOP onder de bovenkant), niet tot straatniveau eronder. Zo
// loopt de Kastanjelaan onder Groningen Noord weer vrij zichtbaar door (#961; de rand
// in het hoogtemodel reikt om dezelfde reden niet dieper, #509). Ligt het perron op
// straatniveau, dan blijft de voet op GROND staan.
const perronVoet = (z) => (z - PERRON_TOP > 0.5 ? z - PERRON_TOP - 0.05 : GROND);

function bordTexture(tekst) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#1d4f8f';
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.strokeRect(6, 6, 500, 116);
  g.fillStyle = '#ffffff'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(tekst, 256, 68);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function strook(M, row) {
  const pts = row.p;
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l, hs = pts[i][2], z = pts[i][3];
    L.push([pts[i][0] + nx * hs, pts[i][1] + ny * hs, z, nx, ny]);
    R.push([pts[i][0] - nx * hs, pts[i][1] - ny * hs, z, -nx, -ny]);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    M.top.quad(L[i], L[i + 1], R[i + 1], R[i]);
    const a = L[i], b = L[i + 1], ra = R[i], rb = R[i + 1];
    const ba = perronVoet(a[2]), bb = perronVoet(b[2]);
    M.zij.quad([a[0], a[1], a[2]], [b[0], b[1], b[2]], [b[0], b[1], bb], [a[0], a[1], ba]);
    M.zij.quad([ra[0], ra[1], ra[2]], [rb[0], rb[1], rb[2]], [rb[0], rb[1], bb], [ra[0], ra[1], ba]);
    // een verhoogd perron is van onderen dicht: de vloer is de bovenkant van een brugdek
    if (ba > GROND + 0.01 || bb > GROND + 0.01) M.onder.quad([a[0], a[1], ba], [b[0], b[1], bb], [rb[0], rb[1], bb], [ra[0], ra[1], ba]);
    for (const E of [L, R]) {
      const c = E[i], d = E[i + 1];
      // de rand van het perron: een betonband van RAND_M naar binnen, geen verfstreep (#502)
      const ia = [c[0] - c[3] * RAND_M, c[1] - c[4] * RAND_M, c[2] + 0.012], ib = [d[0] - d[3] * RAND_M, d[1] - d[4] * RAND_M, d[2] + 0.012];
      M.rand.quad([c[0], c[1], c[2] + 0.012], [d[0], d[1], d[2] + 0.012], ib, ia);
    }
  }
  const e = pts.length - 1;
  const b0 = perronVoet(L[0][2]), b1 = perronVoet(R[0][2]), be = perronVoet(L[e][2]), bf = perronVoet(R[e][2]);
  M.zij.quad([L[0][0], L[0][1], L[0][2]], [R[0][0], R[0][1], R[0][2]], [R[0][0], R[0][1], b1], [L[0][0], L[0][1], b0]);
  M.zij.quad([L[e][0], L[e][1], L[e][2]], [R[e][0], R[e][1], R[e][2]], [R[e][0], R[e][1], bf], [L[e][0], L[e][1], be]);
}

function trap(M, grp, r, nm, masts) {
  const [ax, ay] = r.a, [bx, by] = r.b;
  const len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len, uy = (by - ay) / len, nx = -uy, ny = ux, hw = r.hw;
  const at = (s, o, z) => [ax + ux * s + nx * o, ay + uy * s + ny * o, z];
  const zAt = (s) => lerp(r.za, r.zb, s / len);
  const hoog = r.za - r.zb;
  // een trap met treden van ~0,18 m; een lage helling is glad
  const stappen = r.k === 'trap' ? Math.max(4, Math.round(hoog / 0.18)) : 0;
  if (stappen) {
    for (let k = 0; k < stappen; k++) {
      const s0 = (len * k) / stappen, s1 = (len * (k + 1)) / stappen;
      const z0 = zAt(s0) - 0.0, z1 = zAt(s1);
      const zt = (z0 + z1) / 2 + 0.02;
      (k % 2 ? M.trede : M.top).quad(at(s0, -hw, zt), at(s1, -hw, zt), at(s1, hw, zt), at(s0, hw, zt));
      M.stoot.quad(at(s1, -hw, zt), at(s1, hw, zt), at(s1, hw, zt - hoog / stappen), at(s1, -hw, zt - hoog / stappen));
    }
  } else M.top.quad(at(0, -hw, r.za), at(len, -hw, r.zb), at(len, hw, r.zb), at(0, hw, r.za));
  for (const o of [-hw, hw]) {
    const n = Math.max(2, Math.round(len / 3));
    for (let k = 0; k < n; k++) {
      const s0 = (len * k) / n, s1 = (len * (k + 1)) / n;
      M.zij.quad(at(s0, o, zAt(s0)), at(s1, o, zAt(s1)), at(s1, o, GROND), at(s0, o, GROND));
      // leuning: een plaat van 0,9 m op de rand (gesloten borstwering, zodat je er niet doorheen kijkt)
      M.leuning.quad(at(s0, o, zAt(s0)), at(s1, o, zAt(s1)), at(s1, o, zAt(s1) + 0.9), at(s0, o, zAt(s0) + 0.9));
    }
  }
  // het bord boven de voet, met de naam van het perron
  // #1039: de masten van alle borden zijn één InstancedMesh (buildPerrons3D), niet een mesh per mast
  const mast = (o) => { masts.push([bx + nx * o, 1.6, by + ny * o]); };
  mast(-hw - 0.1); mast(hw + 0.1);
  const tex = bordTexture(`Naar ${nm.toLowerCase()}`);
  // hertest 24-11: twee vlakken rug aan rug, elk met de voorkant naar buiten; een dubbelzijdig vlak toonde de naam in spiegelschrift
  const bordMat = tex ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshBasicMaterial({ color: BORD_BLAUW });
  const bord = new THREE.Mesh(tweeKanten(new THREE.PlaneGeometry(hw * 2 + 0.6, 0.7)), bordMat);
  bord.position.set(bx, 3.0, by);
  bord.rotation.y = Math.atan2(ux, uy);
  grp.add(bord);
}

// Een vlak en zijn omgedraaide kopie in één geometrie (één draw call): de tekst leest van beide kanten goed, zonder spiegelbeeld.
function tweeKanten(voor) {
  const achter = voor.clone().rotateY(Math.PI);
  const g = new THREE.BufferGeometry();
  for (const naam of ['position', 'normal', 'uv']) {
    const a = voor.getAttribute(naam), b = achter.getAttribute(naam);
    const arr = new Float32Array(a.array.length + b.array.length);
    arr.set(a.array, 0); arr.set(b.array, a.array.length);
    g.setAttribute(naam, new THREE.BufferAttribute(arr, a.itemSize));
  }
  const ia = voor.getIndex().array, ib = achter.getIndex().array, n = voor.getAttribute('position').count;
  g.setIndex([...ia, ...Array.from(ib, (i) => i + n)]);
  voor.dispose(); achter.dispose();
  return g;
}

// De groep met alle perrons van de kaart; de paaltjes aan de voet van de trappen worden vaste hindernissen.
export function buildPerrons3D(map) {
  const rows = map.perrons || [];
  if (!rows.length) return null;
  const grp = new THREE.Group();
  grp.name = 'perrons';
  const masts = [];
  const M = { top: new Mesh(), rand: new Mesh(), zij: new Mesh(), onder: new Mesh(), trede: new Mesh(), stoot: new Mesh(), leuning: new Mesh() };
  for (const row of rows) {
    strook(M, row);
    for (const r of row.r || []) trap(M, grp, r, row.nm || 'Perron', masts);
  }
  for (const [k, m] of Object.entries(M)) {
    if (!m.v.length) continue;
    const mesh = new THREE.Mesh(m.geometry(), MAT[k]);
    // een naam per vlak, zodat een test het loopvlak kan aanwijzen (perronmateriaal_test)
    mesh.name = 'perron-' + k;
    mesh.receiveShadow = true;
    mesh.castShadow = k !== 'rand';
    grp.add(mesh);
  }
  const P = buildPerrons(rows);
  // #1039: één draw voor alle paaltjes en één voor alle masten (was een mesh per stuk: ruim 50 drawcalls bij een station)
  for (const p of P.posts) addStaticCollider('post', p.x, p.y, p.r);
  const inst = (geo, mat, spots, name) => {
    if (!spots.length) return;
    const im = new THREE.InstancedMesh(geo, mat, spots.length);
    const m4 = new THREE.Matrix4();
    spots.forEach((p, i) => im.setMatrixAt(i, m4.makeTranslation(p[0], p[1], p[2])));
    im.instanceMatrix.needsUpdate = true;
    im.name = name;
    im.computeBoundingSphere();
    grp.add(im);
  };
  inst(new THREE.CylinderGeometry(0.11, 0.11, 0.9, 8), MAT.paal, P.posts.map((p) => [p.x, 0.45, p.y]), 'perron-paaltjes');
  inst(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6), MAT.mast, masts, 'perron-masten');
  return grp;
}
