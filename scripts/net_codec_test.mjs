// Coöp fase 4 (#95): snapshotcodec (game/js/net/codec.js).
import assert from 'node:assert/strict';
import * as K from '../game/js/net/codec.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const near = (a, b, e) => assert.ok(Math.abs(a - b) <= e, `${a} ≉ ${b}`);

const SNAP = {
  players: [
    { slot: 0, x: 123456.5, y: 567890.25, z: 3.5, angle: 1.0, alive: true, inVeh: true, driver: true, run: false, health: 80, vehicle: 12 },
    { slot: 1, x: -5, y: 7, z: 0, angle: 6.0, alive: false, inVeh: false, driver: false, run: true, health: 0, vehicle: null },
  ],
  shared: { money: 4242, wanted: 3, clock: 13.5 },
  mission: { stage: 4, state: 'run', present: 3 },
  entities: [{ id: 9, kind: 2, x: 10.5, z: -20.25, angle: 3.0 }],
};

t('snapshot rondreis', () => {
  const buf = K.encodeSnapshot(65535, 7, 33, SNAP);
  const d = K.decodeSnapshot(buf);
  assert.equal(d.seq, 65535); assert.equal(d.tick, 7); assert.equal(d.ackInput, 33);
  assert.equal(d.players.length, 2);
  const p = d.players[0];
  near(p.x, 123456.5, 0.01); near(p.y, 567890.25, 0.1); near(p.angle, 1.0, 1e-3);
  assert.deepEqual([p.alive, p.inVeh, p.driver, p.run, p.health, p.vehicle], [true, true, true, false, 80, 12]);
  assert.equal(d.players[1].vehicle, null); assert.equal(d.players[1].alive, false);
  assert.deepEqual(d.shared, { money: 4242, wanted: 3, clock: 13.5 });
  assert.deepEqual(d.mission, { stage: 4, state: 'run', present: 3 });
  assert.equal(d.entities[0].id, 9); near(d.entities[0].z, -20.25, 0.01);
});
t('snapshot is compact (twee spelers, één entiteit)', () => {
  assert.ok(K.encodeSnapshot(0, 0, 0, SNAP).length < 120);
});
t('hoeken: wrap en kwantisatie', () => {
  near(K.dequantAngle(K.quantAngle(-0.5)), 2 * Math.PI - 0.5, 1e-3);
  near(K.dequantAngle(K.quantAngle(7)), 7 - 2 * Math.PI, 1e-3);
});
t('invoer rondreis met begrenzing', () => {
  const buf = K.encodeInput(5, 100, 8, { mx: 3, my: -0.5, buttons: 0b101, yaw: 2 });
  const d = K.decodeInput(buf);
  assert.equal(d.seq, 5); assert.equal(d.mx, 1); near(d.my, -0.5, 0.01); assert.equal(d.buttons, 5); near(d.yaw, 2, 1e-3);
});
t('afwijzen: korte, afgeknotte, verkeerde magic/versie, te lange data', () => {
  const good = K.encodeSnapshot(1, 1, 1, SNAP);
  assert.equal(K.decodeSnapshot(good.subarray(0, 30)), null);
  assert.equal(K.decodeSnapshot(new Uint8Array(3)), null);
  const bad = good.slice(); bad[0] = 0; assert.equal(K.decodeSnapshot(bad), null);
  const bad2 = good.slice(); bad2[1] = 9; assert.equal(K.decodeSnapshot(bad2), null);
  const long = new Uint8Array(good.length + 1); long.set(good); assert.equal(K.decodeSnapshot(long), null);
  assert.equal(K.decodeSnapshot('tekst'), null);
});
t('afwijzen: onmogelijke waarden', () => {
  const nan = K.encodeSnapshot(1, 1, 1, { ...SNAP, players: [{ ...SNAP.players[0], x: NaN }] });
  assert.equal(K.decodeSnapshot(nan), null);
  const far = K.encodeSnapshot(1, 1, 1, { ...SNAP, players: [{ ...SNAP.players[0], x: 1e9 }] });
  assert.equal(K.decodeSnapshot(far), null);
  const g = K.encodeSnapshot(1, 1, 1, SNAP); g[11] = 200; assert.equal(K.decodeSnapshot(g), null, 'te veel spelers');
});
t('fuzz: willekeurige bytes crashen niet', () => {
  let s = 12345; const rnd = () => (s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32;
  const base = K.encodeSnapshot(1, 1, 1, SNAP);
  for (let i = 0; i < 2000; i++) {
    const b = base.slice(); for (let j = 0; j < 4; j++) b[Math.floor(rnd() * b.length)] = Math.floor(rnd() * 256);
    K.decodeSnapshot(b); K.decodeInput(b); K.decodeJson(b);
  }
});
t('json: rondreis, grens, kapotte lengte', () => {
  const b = K.encodeJson(K.T.EVENT, 3, 1, 0, { kind: 'stage', n: 2 });
  const d = K.decodeJson(b);
  assert.deepEqual(d.body, { kind: 'stage', n: 2 }); assert.equal(d.type, K.T.EVENT);
  assert.throws(() => K.encodeJson(K.T.EVENT, 0, 0, 0, { x: 'a'.repeat(3000) }));
  assert.equal(K.decodeJson(b.subarray(0, b.length - 1)), null);
});
t('extra (#428): kop, lengte, afkappen en een oude gast die het type niet kent', () => {
  const lading = Uint8Array.from({ length: 200 }, (_, i) => (i * 7) & 255);
  const b = K.encodeExtra(65534, 12, 0, lading);
  assert.equal(K.readHeader(b).type, K.T.EXTRA); assert.equal(K.T.EXTRA, 11);
  const d = K.decodeExtra(b);
  assert.equal(d.seq, 65534); assert.equal(d.tick, 12); assert.deepEqual([...d.payload], [...lading]);
  assert.equal(K.decodeExtra(b.subarray(0, 20)), null);
  assert.equal(K.decodeExtra(K.encodeSimple(K.T.PING, 0, 0, 0)), null, 'een ander type is geen extra');
  assert.equal(K.encodeExtra(1, 1, 0, new Uint8Array(K.MAX_EXTRA + 500)).length, 13 + K.MAX_EXTRA);
  const kapot = b.slice(); kapot[11] = 0xff; kapot[12] = 0xff; // lengte klopt niet
  assert.equal(K.decodeExtra(kapot), null);
  let s = 77; const rnd = () => (s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32;
  for (let i = 0; i < 1500; i++) { const r = b.slice(); for (let j = 0; j < 3; j++) r[Math.floor(rnd() * r.length)] = Math.floor(rnd() * 256); K.decodeExtra(r); K.decodeSnapshot(r); }
  // snapshot en extra raken elkaar niet
  assert.equal(K.decodeSnapshot(b), null); assert.equal(K.decodeExtra(K.encodeSnapshot(1, 1, 0, SNAP)), null);
});
console.log(`net_codec_test: ${n}/${n} ok`);
