// Coöp fase 4 (#95): hostmodel end-to-end over een in-memory transport met ruis:
// handshake, invoer -> host, snapshots -> client met interpolatie, lag,
// verbreken, hervatten, vastzittende toets, weigering.
import assert from 'node:assert/strict';
import { createLink, makeRng } from '../game/js/net/memtransport.js';
import { HostSession, ClientSession, SnapBuffer, LAG_AFTER, LOST_AFTER, SNAP_HZ, negotiate } from '../game/js/net/session.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const INFO = { game: 'gde', proto: 1, version: '0.50.0', tiles: 'abc', story: 'oud' };

function setup(linkCfg = {}, infoC = INFO) {
  const link = createLink({ latency: 0.04, seed: 7, ...linkCfg });
  const sim = {
    inputs: [], guest: { x: 0, y: 0 }, host: { x: 5, y: 5 }, money: 100,
    applyInput(slot, i) { this.inputs.push({ slot, ...i }); this.cur = i; },
    snapshot() {
      return { players: [{ slot: 0, x: this.host.x, y: this.host.y, z: 0, angle: 0, alive: true, health: 100 }, { slot: 1, x: this.guest.x, y: this.guest.y, z: 0, angle: 0, alive: true, health: 100 }], shared: { money: this.money, wanted: 0, clock: 12 }, mission: { stage: 1, state: 'run', present: 3 }, entities: [] };
    },
    fullState() { return { money: this.money, stage: 1 }; },
  };
  const rand = makeRng(3);
  const host = new HostSession(link.a, { info: INFO, seed: 42, sim }, rand);
  const client = new ClientSession(link.b, { info: infoC }, rand);
  const step = (secs, dt = 1 / 60) => {
    for (let t0 = 0; t0 < secs; t0 += dt) {
      if (sim.cur) { sim.guest.x += sim.cur.mx * 5 * dt; sim.guest.y += sim.cur.my * 5 * dt; }
      host.tick(dt); client.tick(dt); link.advance(dt);
    }
  };
  const join = () => { for (let i = 0; i < 900 && client.status !== 'ok'; i++) step(1 / 60); assert.equal(client.status, 'ok', 'gekoppeld'); };
  return { link, sim, host, client, step, join };
}

t('handshake: gast krijgt slot 1, seed en token; host meldt join', () => {
  const s = setup(); let joined = null; s.host.onjoin = (sl) => { joined = sl; };
  s.step(2);
  assert.equal(s.client.status, 'ok'); assert.equal(s.client.slot, 1); assert.equal(s.client.seed, 42);
  assert.ok(s.client.token && s.client.token.length === 12); assert.equal(joined, 1);
});
t('weigering: andere versie, tegels of verhaal; client toont reden', () => {
  for (const [k, reason] of [['version', 'versie'], ['tiles', 'tegels'], ['story', 'verhaal']]) {
    const s = setup({}, { ...INFO, [k]: 'x' }); s.step(2);
    assert.equal(s.client.status, 'geweigerd'); assert.equal(s.client.rejected, reason); assert.equal(s.host.guest, null);
  }
});
t('invoer van de client bereikt de host; de toestand komt terug', () => {
  const s = setup(); s.step(1);
  s.client.setInput(1, 0, 0, 0); s.step(2);
  assert.ok(s.sim.inputs.length > 30); assert.equal(s.sim.inputs.at(-1).slot, 1);
  assert.ok(s.sim.guest.x > 5, 'host verplaatst de gast');
  const w = s.client.world();
  assert.ok(Math.abs(w.players[1].x - s.sim.guest.x) < 1.5, `client ziet ${w.players[1].x} vs ${s.sim.guest.x}`);
  assert.equal(w.shared.money, 100);
});
t('werkt met verlies en jitter (10%, 60 ms)', () => {
  const s = setup({ loss: 0.1, jitter: 0.06 }); s.join(); s.step(1);
  s.client.setInput(0, 1, 0, 0); s.step(3);
  assert.equal(s.client.status, 'ok'); assert.ok(s.client.world().players[1].y > 5);
});
t('gebeurtenis van host naar client is betrouwbaar, ook bij verlies', () => {
  const s = setup({ loss: 0.3, seed: 11 }); s.join(); s.step(1);
  const got = []; s.client.onevent = (b) => got.push(b.k);
  for (let i = 0; i < 5; i++) s.host.announce({ k: 'stage', n: i });
  s.step(5);
  assert.equal(got.length, 5); assert.ok(got.every((k) => k === 'stage'));
});
t('lag: status lag na stilte, terug naar ok bij verkeer', () => {
  const s = setup(); s.step(1.5);
  const seen = []; s.client.onstatus = (x) => seen.push(x);
  s.link.set({ loss: 1 }); s.step(LAG_AFTER + 0.3);
  assert.equal(s.client.status, 'lag');
  s.link.set({ loss: 0 }); s.step(1);
  assert.equal(s.client.status, 'ok'); assert.deepEqual(seen, ['lag', 'ok']);
});
t('verbreken: host zet NPC-metgezel in, client meldt verlies; hervatten met token', () => {
  const s = setup(); s.step(1.5);
  let lost = 0, clientLost = 0, resync = null;
  s.host.onlost = () => { lost++; }; s.client.onlost = () => { clientLost++; };
  s.client.onresync = (st) => { resync = st; };
  const token = s.client.token;
  s.link.set({ loss: 1 }); s.step(LOST_AFTER + 1);
  assert.equal(lost, 1); assert.equal(clientLost, 1);
  assert.equal(s.host.status, 'lost'); assert.equal(s.client.status, 'lost');
  s.sim.money = 777; // intussen verandert de wereld
  s.link.set({ loss: 0 }); s.step(4);
  assert.equal(s.client.status, 'ok'); assert.equal(s.host.status, 'ok');
  assert.equal(s.client.token, token, 'zelfde sessie');
  assert.equal(resync.money, 777, 'volledige toestand na hervatten');
  assert.equal(lost, 1, 'geen tweede verlies');
});
t('de host ziet de gast als weggevallen terwijl de gast de host nog hoort: zodra de invoer weer aankomt, hervat de host zonder hello', () => {
  const s = setup(); s.join(); s.client.setInput(1, 0, 0, 0); s.step(1);
  const echt = s.link.b.send; let lost = 0; s.host.onlost = () => { lost++; };
  s.link.b.send = () => true; // alleen de richting gast -> host valt weg
  s.step(LOST_AFTER + 1);
  assert.equal(s.host.status, 'lost'); assert.equal(lost, 1); assert.notEqual(s.client.status, 'lost', 'de gast hoort de host nog');
  s.link.b.send = echt; s.step(2);
  assert.equal(s.host.status, 'ok', 'de host hervat op de eerstvolgende invoer'); assert.equal(s.host.guest.token, s.client.token);
  const n0 = s.sim.inputs.length; s.step(1); assert.ok(s.sim.inputs.length > n0, 'invoer komt weer aan');
});
t('hervatten met een nieuw transport (nieuwe handmatige code)', () => {
  const s = setup(); s.step(1.5);
  s.link.cut(); s.step(LOST_AFTER + 1);
  const link2 = createLink({ latency: 0.04, seed: 9 });
  s.host._attach(link2.a); s.client.reconnect(link2.b);
  const old = s.link.advance; s.link.advance = (dt) => { old(dt); link2.advance(dt); };
  s.step(4);
  assert.equal(s.client.status, 'ok'); assert.equal(s.host.status, 'ok');
});
t('hervatten met een ander token wordt geweigerd; tweede gast krijgt "vol"', () => {
  const s = setup(); s.step(1.5);
  const link2 = createLink({ latency: 0.02, seed: 4 });
  const other = new ClientSession(link2.b, { info: INFO }, makeRng(9));
  s.host._attach(link2.a);
  const adv = s.link.advance; s.link.advance = (dt) => { adv(dt); link2.advance(dt); };
  s.step(0.1); other.tick(0.1);
  for (let i = 0; i < 120; i++) { other.tick(1 / 60); s.host.tick(1 / 60); link2.advance(1 / 60); }
  assert.equal(other.status, 'geweigerd'); assert.equal(other.rejected, 'vol');
});
t('vastzittende toets: zonder verse invoer neutraliseert de host', () => {
  const s = setup(); s.step(1);
  s.client.setInput(1, 0, 0, 0); s.step(0.5);
  s.client.inputAcc = -1e9; // client valt stil (geen invoer meer) zonder BYE
  s.step(1.5);
  assert.deepEqual([s.sim.cur.mx, s.sim.cur.my], [0, 0]);
});
t('BYE: host laat de slot los en meldt dat', () => {
  const s = setup(); s.step(1.5); let why = null; s.host.onrelease = (sl, w) => { why = w; };
  s.client.leave(); s.step(0.5);
  assert.equal(why, 'weg'); assert.equal(s.host.guest, null);
});
t('ontvangst: oude snapshots en rommel worden genegeerd', () => {
  const s = setup(); s.step(1.5);
  const before = s.client.buf.snaps.length;
  s.client._raw(new Uint8Array([1, 2, 3])); s.client._raw(new Uint8Array(40));
  assert.equal(s.client.buf.snaps.length, before);
});
t('SnapBuffer interpoleert tussen twee toestanden en houdt bij sprong vast', () => {
  const b = new SnapBuffer();
  const mk = (T, x, veh) => ({ hostT: T, players: [{ slot: 0, x, y: 0, z: 0, angle: 0, alive: true, vehicle: veh }], entities: [] });
  b.push(mk(1, 0, null)); b.push(mk(1.1, 10, null)); b.push(mk(1.2, 30, 5));
  assert.equal(b.push(mk(1.0, 99, null)), false);
  b.renderT = 1.05; assert.ok(Math.abs(b.sample().players[0].x - 5) < 1e-9);
  b.renderT = 1.15; assert.equal(b.sample().players[0].x, 30, 'geen glijden door het instappen');
  assert.equal(SNAP_HZ, 20);
});
t('uitbreidbaar: gebruikte mogelijkheden zijn wat beide kennen; onbekende gebeurtenissen schaden niet', () => {
  assert.deepEqual(negotiate(['scene', 'spelers>2'], ['scene', 'iets-nieuws']), ['scene']);
  assert.deepEqual(negotiate(['scene'], undefined), []);
  const s = setup(); s.host.cfg.caps = ['scene', 'spelers>2']; s.client.cfg.caps = ['scene'];
  s.step(2);
  assert.deepEqual(s.host.caps, ['scene']); assert.deepEqual(s.client.caps, ['scene']);
  const got = []; s.client.onevent = (b) => got.push(b.k);
  s.host.announce({ k: 'toekomstig-ding', x: 1 }); s.host.announce({ k: 'stage', n: 1 }); s.step(1);
  assert.deepEqual(got, ['toekomstig-ding', 'stage'], 'komt aan; de verwerker negeert wat hij niet kent');
});
console.log(`net_hostmodel_test: ${n}/${n} ok`);
