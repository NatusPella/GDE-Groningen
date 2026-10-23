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
// Een host die elke `interval` s een snapshot stuurt terwijl zijn simulatieklok `simStap` s opschuift (een trage host: het spel kapt dt af op 0,05 s,
// dus 15 beelden per seconde lopen op 0,75 van de echte tijd), met aankomstjitter en verlies. oud: de oude weergavetijd (vast tussen laatste - 0,25 en
// laatste - 0,05, geen voorspelling) en seq / 20 als tijd; nieuw: SnapBuffer met de tijd uit de kop.
function speel({ interval, simStap, jitter = 0.08, verlies = 0.1, v = 12, oud = false, seconden = 19 }) {
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const aankomst = [];
  for (let i = 0; i < seconden / interval; i++) if (rnd() > verlies) aankomst.push([i * interval + rnd() * jitter, { hostT: oud ? i * 0.05 : (i + 1) * simStap, x: (i + 1) * simStap * v }]);
  aankomst.sort((p, q) => p[0] - q[0]);
  const b = new SnapBuffer(), snaps = [];
  const dt = 1 / 60; let k = 0, r = null, vorige = null, stil = 0, n = 0, maxAfw = 0;
  const verwacht = v * simStap / interval; // m/s in echte tijd
  for (let T = 0; T < seconden; T += dt) {
    while (k < aankomst.length && aankomst[k][0] <= T) { const s = aankomst[k++][1]; if (oud) { if (!snaps.length || s.hostT > snaps[snaps.length - 1].hostT) snaps.push(s); } else b.push(snap(s.hostT, s.x, 0)); }
    let x;
    if (oud) {
      if (!snaps.length) continue;
      const L = snaps[snaps.length - 1].hostT; if (r == null) r = L - 0.1;
      r = Math.min(L - 0.05, Math.max(L - 0.25, r + dt));
      x = snaps[0].x;
      for (let i = snaps.length - 1; i > 0; i--) if (snaps[i - 1].hostT <= r) { const a = snaps[i - 1], c = snaps[i], kk = Math.min(1, Math.max(0, (r - a.hostT) / (c.hostT - a.hostT))); x = a.x + (c.x - a.x) * kk; break; }
    } else { if (!b.snaps.length) continue; b.advance(dt); x = ex(b).x; }
    if (vorige != null && T > 2) { const stap = (x - vorige) / dt; n++; if (stap < 0.3 * verwacht) stil++; maxAfw = Math.max(maxAfw, Math.abs(stap - verwacht)); }
    vorige = x;
  }
  return { stil, n, maxAfw, verwacht };
}
t('glad bij jitter: een host van 20 beelden per seconde, pakketten 0 tot 80 ms te laat en 10% weg: nooit stil, afwijking beperkt', () => {
  const r = speel({ interval: 0.05, simStap: 0.05 });
  assert.equal(r.stil, 0, 'stil: ' + r.stil);
  assert.ok(r.maxAfw < 0.6 * r.verwacht, 'grootste afwijking ' + r.maxAfw.toFixed(1) + ' m/s van ' + r.verwacht);
});
t('trage host (15 beelden per seconde met een simulatiestap van 0,05 s): de weergavetijd loopt in zijn tempo mee, ook dan nooit stil', () => {
  const nieuw = speel({ interval: 1 / 15, simStap: 0.05 });
  assert.equal(nieuw.stil, 0, 'stil: ' + nieuw.stil + ' van ' + nieuw.n);
  assert.ok(nieuw.maxAfw < 0.75 * nieuw.verwacht, 'afwijking ' + nieuw.maxAfw.toFixed(1) + ' van ' + nieuw.verwacht);
  const oud = speel({ interval: 1 / 15, simStap: 0.05, oud: true });
  console.log('   oude weergavetijd, trage host: ' + oud.stil + ' van ' + oud.n + ' beelden (bijna) stil; nu ' + nieuw.stil);
  assert.ok(oud.stil > nieuw.stil + 50, 'de oude aanpak stond stil: ' + oud.stil);
});
t('oud gedrag blijft: instappen en teleport glijden niet; spelers met een voertuigwissel blijven staan', () => {
  const b = new SnapBuffer();
  b.push(snap(1, 0, 0)); const s2 = snap(1.05, 100, 0); s2.players[0].inVeh = true; b.push(s2);
  b.renderT = 1.025; assert.equal(pl(b).x, 100); assert.equal(ex(b).x, 100, 'meer dan 20 m: een sprong');
});
console.log(`net_interp_test: ${n}/${n} ok`);
