// #985: micro-benchmark van de paarlus in resolveVehicleVehicleCollisions: oude volgorde (capsule per voertuig, veel toetsen, dan afstand)
// tegen de nieuwe (afstand eerst, capsule lui). Gebruik: node scripts/perf/pairloop_bench.mjs [voertuigen=120] [rondes=3000]
const N = +process.argv[2] || 120, R = +process.argv[3] || 3000;
const vs = Array.from({ length: N }, (_, i) => ({ id: i, x: Math.random() * 400, y: Math.random() * 400, angle: Math.random() * 6, halfLen: 2.1, halfWid: 0.9, z: 0, sinking: false, wrecked: false, isBoat: false, ghost: false, isHeli: false, isBus: false, isScooter: false, isBike: false, ignoreId: null }));
const cap = (v) => { const sh = Math.max(0, v.halfLen - v.halfWid), dx = Math.cos(v.angle) * sh, dy = Math.sin(v.angle) * sh; return { ax: v.x - dx, ay: v.y - dy, bx: v.x + dx, by: v.y + dy, r: v.halfWid + 0.05 }; };
function oud(w) {
  let n = 0;
  for (let i = 0; i < vs.length; i++) {
    const a = vs[i]; if (a.sinking) continue;
    const capA = cap(a);
    for (let j = i + 1; j < vs.length; j++) {
      const b = vs[j];
      if (b.sinking || (a.wrecked && b.wrecked) || !a.isBoat !== !b.isBoat) continue;
      if (a.ghost || b.ghost) continue;
      if ((a.isHeli && !a.onGround) || (b.isHeli && !b.onGround)) continue;
      if (Math.abs((a.z || 0) - (b.z || 0)) > 2.5) continue;
      if (w && !((a.isBus && (b.isScooter || b.isBike)) || (b.isBus && (a.isScooter || a.isBike))) && ((a.ignoreId === b.id && w.time < a.ignoreUntil) || (b.ignoreId === a.id && w.time < b.ignoreUntil))) continue;
      const reach = a.halfLen + b.halfLen + 0.2, cdx = b.x - a.x, cdy = b.y - a.y;
      if (cdx * cdx + cdy * cdy > reach * reach) continue;
      n += cap(b).r + capA.r > 0 ? 1 : 0;
    }
  }
  return n;
}
function nieuw(w) {
  let n = 0;
  for (let i = 0; i < vs.length; i++) {
    const a = vs[i]; if (a.sinking) continue;
    let capA = null;
    for (let j = i + 1; j < vs.length; j++) {
      const b = vs[j];
      const reach = a.halfLen + b.halfLen + 0.2, cdx = b.x - a.x, cdy = b.y - a.y;
      if (cdx * cdx + cdy * cdy > reach * reach) continue;
      if (b.sinking || (a.wrecked && b.wrecked) || !a.isBoat !== !b.isBoat) continue;
      if (a.ghost || b.ghost) continue;
      if ((a.isHeli && !a.onGround) || (b.isHeli && !b.onGround)) continue;
      if (Math.abs((a.z || 0) - (b.z || 0)) > 2.5) continue;
      if (w && !((a.isBus && (b.isScooter || b.isBike)) || (b.isBus && (a.isScooter || a.isBike))) && ((a.ignoreId === b.id && w.time < a.ignoreUntil) || (b.ignoreId === a.id && w.time < b.ignoreUntil))) continue;
      if (!capA) capA = cap(a);
      n += cap(b).r + capA.r > 0 ? 1 : 0;
    }
  }
  return n;
}
const w = { time: 1 };
function t(f) { f(w); const s = process.hrtime.bigint(); let n = 0; for (let i = 0; i < R; i++) n += f(w); return [Number(process.hrtime.bigint() - s) / 1e6 / R, n]; }
for (let k = 0; k < 3; k++) { const [o, n1] = t(oud), [m, n2] = t(nieuw); console.log(`oud ${o.toFixed(4)} ms/frame, nieuw ${m.toFixed(4)} ms/frame (zelfde aantal paren: ${n1 === n2})`); }
