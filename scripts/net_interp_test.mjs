// #434: vloeiend bewegen bij een gast (game/js/net/interp.js en SnapBuffer): interpoleren, voorspellen bij een ontbrekend pakket,
// een harde sprong alleen bij een teleport, en een zachte weergavetijd bij aankomstjitter.
import assert from 'node:assert/strict';
import { SnapBuffer } from '../game/js/net/session.js';
import { volgTijd, mixPositie, INTERP_DELAY, EXTRA_MAX, SPRONG_M } from '../game/js/net/interp.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok', naam); };
const snap = (T, x, z, extra = {}) => ({ hostT: T, players: [{ slot: 0, x, y: z, z: 0, angle: 0, alive: true, inVeh: false }], entities: [{ id: 7, kind: 0, x, z, angle: 0, speed: 20, steer: 0, vz: 0, ...extra }] });
const ex = (b) => b.sample().entities[0], pl = (b) => b.sample().players[0];

t('mixPositie: midden, hoek over de rand en teleport', () => {
  const m = mixPositie({ x: 0, z: 0, angle: 3.0, speed: 0 }, { x: 10, z: 4, angle: -3.0, speed: 10 }, 0.5);
  assert.equal(m.x, 5); assert.equal(m.z, 2); assert.equal(m.speed, 5);
  assert.ok(Math.abs(Math.abs(m.angle) - Math.PI) < 0.2, 'de korte kant om');
  const b = { x: SPRONG_M + 5, z: 0, angle: 0 };
  assert.equal(mixPositie({ x: 0, z: 0, angle: 0 }, b, 0.5), b, 'teleport: geen glijden');
});
t('voorspellen: voorbij de laatste snapshot gaat de beweging door met dezelfde snelheid', () => {
  const b = new SnapBuffer(); // 20 m/s, een snapshot per 0,05 s
  for (let i = 0; i < 10; i++) b.push(snap(i * 0.05, i * 1, 0));
  b.renderT = 0.45; assert.ok(Math.abs(ex(b).x - 9) < 1e-9);
  b.renderT = 0.45 + 0.1; assert.ok(Math.abs(ex(b).x - 11) < 1e-9, 'twee extra meter na 0,1 s: ' + ex(b).x);
  assert.ok(Math.abs(pl(b).x - 11) < 1e-9, 'spelers ook');
});
t('weergavetijd blijft vooruit lopen en klemt op laatste + EXTRA_MAX', () => {
  let r = 1 - INTERP_DELAY;
  for (let i = 0; i < 120; i++) r = volgTijd(r, 1, 1 / 60);
  assert.ok(Math.abs(r - (1 + EXTRA_MAX)) < 1e-9, 'na 2 s zonder pakket: ' + r);
});
t('stilstand bij vertraging: een lange gat zet de weergavetijd terug bij de laatste snapshot', () => {
  assert.equal(volgTijd(0, 5, 1 / 60), 5 - INTERP_DELAY);
  assert.equal(volgTijd(null, 5, 1 / 60), 5 - INTERP_DELAY);
});
t('glad bij jitter: weergegeven stap per frame wijkt weinig af van de echte snelheid (pakketten 0 tot 80 ms te laat, af en toe weg)', () => {
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const b = new SnapBuffer(); const v = 12; // m/s
  const aankomst = []; // [tijd van aankomst, snapshot]
  for (let i = 0; i < 400; i++) if (rnd() > 0.1) aankomst.push([i * 0.05 + rnd() * 0.08, snap(i * 0.05, i * 0.05 * v, 0)]);
  aankomst.sort((p, q) => p[0] - q[0]);
  const dt = 1 / 60; let k = 0, vorige = null, maxAfw = 0, stil = 0;
  for (let T = 0; T < 19; T += dt) {
    while (k < aankomst.length && aankomst[k][0] <= T) b.push(aankomst[k++][1]);
    if (!b.snaps.length) continue;
    b.advance(dt);
    const x = ex(b).x;
    if (vorige != null && T > 1) { const stap = (x - vorige) / dt; maxAfw = Math.max(maxAfw, Math.abs(stap - v)); if (stap < 0.3 * v) stil++; }
    vorige = x;
  }
  assert.equal(stil, 0, 'nooit bijna stil: ' + stil);
  assert.ok(maxAfw < 0.6 * v, 'grootste afwijking van de snelheid ' + maxAfw.toFixed(1) + ' m/s');
});
t('oud gedrag blijft: instappen en teleport glijden niet; spelers met een voertuigwissel blijven staan', () => {
  const b = new SnapBuffer();
  b.push(snap(1, 0, 0)); const s2 = snap(1.05, 100, 0); s2.players[0].inVeh = true; b.push(s2);
  b.renderT = 1.025; assert.equal(pl(b).x, 100); assert.equal(ex(b).x, 100, 'meer dan 20 m: een sprong');
});
console.log(`net_interp_test: ${n}/${n} ok`);
