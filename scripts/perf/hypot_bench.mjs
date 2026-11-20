// #985: micro-benchmark voor de afstandstoets per gebouw in syncBuildingsPass (Math.hypot tegen kwadraten).
// Gebruik: node scripts/perf/hypot_bench.mjs [aantal=3000] [rondes=2000]
const N = +process.argv[2] || 3000, R = +process.argv[3] || 2000;
const bs = Array.from({ length: N }, () => [Math.random() * 600 - 300, Math.random() * 600 - 300, 0, 0]);
for (const b of bs) { b[2] = b[0] + 10; b[3] = b[1] + 10; }
const px = 3, py = 4, DRAW = 200;
function a() { let n = 0; for (const b of bs) { const d = Math.hypot((b[0] + b[2]) / 2 - px, (b[1] + b[3]) / 2 - py); if (d <= DRAW) n++; } return n; }
function c() { let n = 0; for (const b of bs) { const dx = (b[0] + b[2]) / 2 - px, dy = (b[1] + b[3]) / 2 - py; if (dx * dx + dy * dy <= DRAW * DRAW) n++; } return n; }
function t(f) { f(); const s = process.hrtime.bigint(); let n = 0; for (let i = 0; i < R; i++) n += f(); return [Number(process.hrtime.bigint() - s) / 1e6 / R, n]; }
for (let k = 0; k < 3; k++) { const [h, n1] = t(a), [q, n2] = t(c); console.log(`hypot ${h.toFixed(4)} ms/frame, kwadraten ${q.toFixed(4)} ms/frame (zelfde uitkomst: ${n1 === n2})`); }
