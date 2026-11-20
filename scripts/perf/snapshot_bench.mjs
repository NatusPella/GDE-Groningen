// #985: de kosten van Samen spelen per extra speler aan de kant van de host, zonder netwerk en zonder wereld:
// grootte van één snapshot (bytes), de coderingstijd, en wat dat bij 20 Hz per gast en in totaal betekent.
// Een snapshot is per tick één keer verzameld (net/hub.js _snapshot) en wordt per gast opnieuw gecodeerd (kop met seq en ack).
// Gebruik: node scripts/perf/snapshot_bench.mjs [voertuigen=60] [spelers=4] [rondes=20000]
import { encodeSnapshot, decodeSnapshot, MAX_ENTITIES } from '../../game/js/net/codec.js';
const NV = Math.min(MAX_ENTITIES, +process.argv[2] || 60), NP = +process.argv[3] || 4, R = +process.argv[4] || 20000;
const snap = {
  players: Array.from({ length: NP }, (_, i) => ({ slot: i, x: 100 + i, y: 200, z: 0, angle: 1, alive: true, health: 100 })),
  shared: { money: 1234, wanted: 0, clock: 12.5 }, mission: { stage: 3, state: 'run', present: 3 },
  entities: Array.from({ length: NV }, (_, i) => ({ id: i + 1, kind: i % 3, x: 50 + i, z: 60 + i, angle: i * 0.1, fl: 1, speed: 6, steer: 0.1, vz: i % 5 ? 0 : 0.4 })),
  looks: [],
};
const bytes = encodeSnapshot(1, 1, 0, snap).length;
function t(f) { f(); const s = process.hrtime.bigint(); for (let i = 0; i < R; i++) f(i); return Number(process.hrtime.bigint() - s) / 1e3 / R; }
const enc = t((i) => encodeSnapshot(i & 0xffff, i, 0, snap));
const buf = encodeSnapshot(1, 1, 0, snap);
const dec = t(() => decodeSnapshot(buf));
console.log(`snapshot met ${NP} spelers en ${NV} entiteiten: ${bytes} bytes, coderen ${enc.toFixed(1)} us, decoderen ${dec.toFixed(1)} us`);
for (const gasten of [1, 2, 3]) console.log(`${gasten} gast(en): host stuurt ${(bytes * 20 * gasten / 1024).toFixed(1)} KB/s snapshots, codeert ${(enc * 20 * gasten / 1000).toFixed(2)} ms per seconde (${(enc * gasten / 1000).toFixed(3)} ms per snapshot-tick)`);
