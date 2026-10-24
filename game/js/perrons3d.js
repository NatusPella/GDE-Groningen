import * as THREE from 'three';
import { addStaticCollider } from './breakables.js';
import { buildPerrons } from './perrons.js';

// De perrons en trappen van map.perrons (perrons.js, #436) als beeld: een vloer met gele rand en een gemetselde zijkant tot op de grond,
// een trap (treden, leuning) of een helling met een bord en paaltjes aan de voet. De paaltjes zijn vast (een auto past er niet tussen,
// een fiets wel). Het loopvlak en de randen zelf zitten in het hoogtemodel (elevation.js addPerrons).

const MAT = {
  top: new THREE.MeshStandardMaterial({ color: 0xa4a5a0, roughness: 0.92, flatShading: true, side: THREE.DoubleSide }),
  rand: new THREE.MeshStandardMaterial({ color: 0xe3b81f, roughness: 0.8, flatShading: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  zij: new THREE.MeshStandardMaterial({ color: 0x7a6f66, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }),
  trede: new THREE.MeshStandardMaterial({ color: 0x9a9b96, roughness: 0.9, flatShading: true, side: THREE.DoubleSide }),
  stoot: new THREE.MeshStandardMaterial({ color: 0x6a6b66, roughness: 0.9, flatShading: true, side: THREE.DoubleSide }),
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
    g.computeBoundingSphere();
    return g;
  }
}

const GROND = -0.15;
const lerp = (a, b, t) => a + (b - a) * t;

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
    for (const E of [L, R]) {
      const a = E[i], b = E[i + 1];
      M.zij.quad([a[0], a[1], a[2]], [b[0], b[1], b[2]], [b[0], b[1], GROND], [a[0], a[1], GROND]);
      // de gele rand: 0,4 m naar binnen
      const ia = [a[0] - a[3] * 0.4, a[1] - a[4] * 0.4, a[2] + 0.012], ib = [b[0] - b[3] * 0.4, b[1] - b[4] * 0.4, b[2] + 0.012];
      M.rand.quad([a[0], a[1], a[2] + 0.012], [b[0], b[1], b[2] + 0.012], ib, ia);
    }
  }
  const e = pts.length - 1;
  M.zij.quad([L[0][0], L[0][1], L[0][2]], [R[0][0], R[0][1], R[0][2]], [R[0][0], R[0][1], GROND], [L[0][0], L[0][1], GROND]);
  M.zij.quad([L[e][0], L[e][1], L[e][2]], [R[e][0], R[e][1], R[e][2]], [R[e][0], R[e][1], GROND], [L[e][0], L[e][1], GROND]);
}

function trap(M, grp, r, nm) {
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
  const mast = (o) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6), MAT.mast); m.position.set(bx + nx * o, 1.6, by + ny * o); grp.add(m); };
  mast(-hw - 0.1); mast(hw + 0.1);
  const tex = bordTexture(`Naar ${nm.toLowerCase()}`);
  const bord = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 + 0.6, 0.7), tex ? new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }) : new THREE.MeshBasicMaterial({ color: BORD_BLAUW, side: THREE.DoubleSide }));
  bord.position.set(bx, 3.0, by);
  bord.rotation.y = Math.atan2(ux, uy);
  grp.add(bord);
}

// De groep met alle perrons van de kaart; de paaltjes aan de voet van de trappen worden vaste hindernissen.
export function buildPerrons3D(map) {
  const rows = map.perrons || [];
  if (!rows.length) return null;
  const grp = new THREE.Group();
  grp.name = 'perrons';
  const M = { top: new Mesh(), rand: new Mesh(), zij: new Mesh(), trede: new Mesh(), stoot: new Mesh(), leuning: new Mesh() };
  for (const row of rows) {
    strook(M, row);
    for (const r of row.r || []) trap(M, grp, r, row.nm || 'Perron');
  }
  for (const [k, m] of Object.entries(M)) {
    if (!m.v.length) continue;
    const mesh = new THREE.Mesh(m.geometry(), MAT[k]);
    mesh.receiveShadow = true;
    mesh.castShadow = k !== 'rand';
    grp.add(mesh);
  }
  const P = buildPerrons(rows);
  const paal = new THREE.CylinderGeometry(0.11, 0.11, 0.9, 8);
  for (const p of P.posts) {
    const m = new THREE.Mesh(paal, MAT.paal);
    m.position.set(p.x, 0.45, p.y);
    grp.add(m);
    addStaticCollider('post', p.x, p.y, p.r);
  }
  return grp;
}
