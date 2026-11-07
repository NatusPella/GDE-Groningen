// #497: de blobschaduw-pool uit scene3d.js, met de scène als host-naad. De module kent geen THREE en geen
// DOM: de host geeft de THREE-namespace, de scène, een canvasfabriek en de gedeelde-geometrie/materialen-
// registratie. Zo kan een test met een nep-THREE de pool, de lagen en de instanced matrices natrekken.
const BLOB_HIDDEN_LAYER = 30;
const BLOB_POOL_CAP = 768;

let host = null;
let geo = null, mat = null, pool = null;
let poolOn = true;
const shadows = new Set();

export function setBlobHost(h) { host = h; }

function ensure() {
  if (geo) return;
  const T = host.THREE;
  geo = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const c = host.maakCanvas(64, 64);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,0.38)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.24)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  // polygon offset: boven elke gronddecal (GROUND_LAYER), zodat de schaduw op de weg valt en niet eronder
  mat = new T.MeshBasicMaterial({
    map: new T.CanvasTexture(c), color: 0x000000, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -10, polygonOffsetUnits: -40,
  });
  host.addShared(geo, mat);
}

// Eén InstancedMesh voor alle schaduwen: elke schaduw gaat van de renderlaag af en zijn wereldmatrix wordt
// een instance, gevuld vlak voordat de pool getekend wordt. Verborgen of verdwenen schaduwen tekenen apart.
export function initBlobPool() {
  if (pool) return pool;
  ensure();
  const T = host.THREE;
  const m = new T.InstancedMesh(geo, mat, BLOB_POOL_CAP);
  m.frustumCulled = false;
  m.renderOrder = 1;
  m.matrixAutoUpdate = false;
  m.count = 0;
  m.name = 'blob-instances';
  m.userData.shared = true;
  m.instanceMatrix.setUsage(T.DynamicDrawUsage);
  m.onBeforeRender = fillBlobPool;
  host.scene.add(m);
  pool = m;
  return m;
}

export function fillBlobPool() {
  if (!pool) return;
  if (!poolOn) { pool.count = 0; for (const sh of shadows) sh.layers.set(0); return; }
  const arr = pool.instanceMatrix.array;
  let n = 0;
  for (const sh of shadows) {
    let vis = true, a = sh;
    for (; a && a !== host.scene; a = a.parent) if (!a.visible) { vis = false; break; }
    if (a !== host.scene && vis) {
      // niet in de scène: vergeet hem na lange afwezigheid (een gecachte actor komt ruim eerder terug)
      if ((sh.userData.away = (sh.userData.away || 0) + 1) > 900) shadows.delete(sh);
      sh.layers.set(0);
      continue;
    }
    sh.userData.away = 0;
    if (!vis || n >= BLOB_POOL_CAP) { sh.layers.set(vis ? 0 : BLOB_HIDDEN_LAYER); continue; }
    sh.layers.set(BLOB_HIDDEN_LAYER);
    sh.matrixWorld.toArray(arr, n * 16);
    n++;
  }
  pool.count = n;
  pool.instanceMatrix.needsUpdate = true;
}

export function addBlobShadow(parent, sx, sz, x = 0) {
  ensure();
  const T = host.THREE;
  const shadow = new T.Mesh(geo, mat);
  shadow.position.set(x, 0.02, 0);
  shadow.scale.set(sx, 1, sz);
  shadow.renderOrder = 1;
  parent.add(shadow);
  parent.userData.shadow = shadow;
  shadows.add(shadow);
  return shadow;
}

// A/B-schakelaar (window.__scene3d.setBlobPool): uit = elke schaduw tekent weer op zichzelf.
export function zetBlobPool(aan) { poolOn = !!aan; }
export const blobPoolGrootte = () => BLOB_POOL_CAP;
