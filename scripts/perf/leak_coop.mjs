// Samen spelen zonder lekken: een sessie met een proefgast (geheugentransport) N keer opzetten, laten lopen en stoppen (host en gast),
// met na elke ronde de JS-heap na een GC, de actieve timers van Node en de grootte van wat de modules over sessies heen vasthouden.
// De heap moet na het opwarmen vlak blijven (hooguit +2 MB per 10 rondes; elke ronde is klein en deterministisch).
//   node --expose-gc scripts/perf/leak_coop.mjs [--n=40]
import '../node3d.mjs';
const N = Number((process.argv.find((a) => a.startsWith('--n=')) || '--n=40').slice(4));
if (!global.gc) { console.error('start met node --expose-gc'); process.exit(2); }
const { createLink } = await import('../../game/js/net/memtransport.js');
const CN = await import('../../game/js/coopnet.js');
const INFO = CN.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => ({ axis: () => [0, 0], isDown: () => false, mouse: { x: 0, y: 0 } });
const mk = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita', vx: 0, vy: 0, radius: 0.4 }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], vehicles: [], pedestrians: [], addMessage(m) { this.messages.push(m); }, input: toets(), ...extra });
const hw = mk(); // de host blijft dezelfde wereld, zoals in het spel
const heap = () => { for (let i = 0; i < 4; i++) global.gc(); return process.memoryUsage().heapUsed / 1e6; };
const timers = () => process.getActiveResourcesInfo().filter((x) => x === 'Timeout' || x === 'Immediate').length;
const rows = [];
for (let r = 0; r < N; r++) {
  CN.startHost(hw, INFO, { seed: 5 });
  const link = createLink({ latency: 0.03, jitter: 0.01, seed: 2 });
  CN.addGuest(hw, link.a);
  const gw = mk(); CN.startClient(gw, link.b, INFO, {});
  for (let k = 0; k < 240; k++) { CN.tickCoopNet(hw, 1 / 60); if (gw.coopNet) CN.tickCoopNet(gw, 1 / 60); link.advance(1 / 60); hw.time += 1 / 60; gw.time += 1 / 60; }
  CN.stopCoopNet(gw); CN.stopCoopNet(hw);
  for (let k = 0; k < 30; k++) link.advance(1 / 60);
  await new Promise((res) => setTimeout(res, 5));
  rows.push({ r, heapMB: +heap().toFixed(2), timers: timers(), hostKeys: Object.keys(hw).length });
}
const WARM = Math.min(8, N >> 2);
const a = rows[WARM], b = rows[rows.length - 1];
const per10 = ((b.heapMB - a.heapMB) / Math.max(1, rows.length - 1 - WARM)) * 10;
console.log(`rondes ${N}, heap na opwarmen ${a.heapMB} MB, aan het eind ${b.heapMB} MB, groei per 10 rondes ${per10.toFixed(2)} MB; timers ${a.timers} -> ${b.timers}; sleutels van de hostwereld ${a.hostKeys} -> ${b.hostKeys}`);
const bad = per10 > 2 || b.timers > a.timers || b.hostKeys > a.hostKeys;
console.log(bad ? 'LEK?' : 'vlak');
process.exit(bad ? 1 : 0);
