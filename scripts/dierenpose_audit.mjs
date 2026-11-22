// Pose-audit van de dieren (wildlife.js): voor elke soort en toestand wordt de geanimeerde, gevilde mesh doorgemeten.
// Gemeten: eindige hoekpunten, laagste punt (voeten of buik door de grond), en de afwijking van de rustpose (geen exploderende botten).
//   node scripts/dierenpose_audit.mjs [--json]
import './node3d.mjs';
const THREE = await import('three');
const W = await import('../game/js/wildlife.js');
export const GEVALLEN = [
  ['cow', { bobSeed: 0.3 }, [['loop', { speed: 0.55 }], ['graas', { speed: 0 }], ['ren', { speed: 2.6 }]]],
  ['sheep', {}, [['loop', { speed: 0.45 }], ['graas', { speed: 0 }], ['ren', { speed: 3.2 }]]],
  ['cat', { variant: 1 }, [['sta', { speed: 0 }], ['loop', { speed: 1 }], ['ren', { speed: 4, state: 'flee' }], ['zit', { speed: 0, state: 'sit' }], ['poets', { speed: 0, state: 'groom' }], ['aai', { speed: 0, state: 'sit', aaiT: 1 }]]],
  ['dog', { breed: 1, color: 0.4 }, [['sta', { speed: 0 }], ['loop', { speed: 1.2 }], ['ren', { speed: 4.5 }], ['snuf', { speed: 0, sniff: 1 }], ['aai', { speed: 0, aaiT: 1 }]]],
  ['duck', { variant: 'drake' }, [['sta', { speed: 0, state: 'swim' }], ['loop', { speed: 0.5, state: 'swim' }]]],
  ['gans', {}, [['sta', { speed: 0 }], ['loop', { speed: 0.6 }]]],
  ['reiger', {}, [['sta', { speed: 0, state: 'stand' }], ['loop', { speed: 0.4 }]]],
  ['pigeon', { bobSeed: 0.2, state: 'ground', z: 0.1 }, [['sta', { speed: 0 }], ['loop', { speed: 0.8 }]]],
  ['seagull', { state: 'ground', z: 0 }, [['sta', { speed: 0 }], ['loop', { speed: 0.5 }]]],
];
export function meet(kind, base, extra, t) {
  const a = { kind, ...base, ...extra, stride: t * (extra.speed || 0) * 1.7, z: 0 };
  const g = W.buildWildlifeMesh3D(a);
  W.animateWildlifeMesh3D(g, a, t);
  g.updateMatrixWorld(true);
  let minY = Infinity, maxY = -Infinity, bad = 0;
  const v = new THREE.Vector3();
  g.traverse((o) => {
    if (!o.isSkinnedMesh && !o.isMesh) return;
    const p = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(p.count / 400));
    for (let i = 0; i < p.count; i += step) {
      if (o.isSkinnedMesh) o.getVertexPosition(i, v); else v.fromBufferAttribute(p, i);
      v.applyMatrix4(o.matrixWorld);
      if (!Number.isFinite(v.x + v.y + v.z)) { bad++; continue; }
      if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
    }
  });
  return { minY, maxY, bad };
}
if (process.argv[1] && process.argv[1].endsWith('dierenpose_audit.mjs')) {
  const rows = [];
  for (const [kind, base, poses] of GEVALLEN) for (const [naam, extra] of poses) {
    let lo = Infinity, hi = -Infinity, bad = 0;
    for (let t = 0; t < 12; t += 0.37) { const r = meet(kind, base, extra, t); lo = Math.min(lo, r.minY); hi = Math.max(hi, r.maxY); bad += r.bad; }
    rows.push({ kind, naam, lo: +lo.toFixed(3), hi: +hi.toFixed(3), bad });
  }
  for (const r of rows) console.log(r.kind.padEnd(8), r.naam.padEnd(6), 'laagste', String(r.lo).padStart(7), 'hoogste', String(r.hi).padStart(6), r.bad ? 'NAN ' + r.bad : '');
}
