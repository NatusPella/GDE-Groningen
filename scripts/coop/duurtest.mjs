// Samen spelen (#95, #428): de DUURTEST. Een gastheer met 3 tot 7 gescripte gasten speelt urenlang (hier: tot 40 minuten) met alles
// wat een playtest doet: bewegen, rijden, opdrachten starten en stoppen, de pauze van de gastheer, een gast die wegvalt en met een
// nieuwe verbinding terugkomt, een gast die later aansluit of weggaat, een gastheer die even niet reageert, een verkeerde versie
// en een verbinding die nooit hallo zegt. Elke minuut meet hij het geheugen (JS-heap na gc), de wachtrijen en tabellen van hub,
// sessie en extra wereld, de frametijd van de koppeling, de bytes per gast en de meldingen (desync, consolefouten).
//   node scripts/coop/duurtest.mjs --modus=mem [--min=40] [--gasten=7]    (--gasten tot 15: 16 spelers) in het geheugen, op een virtuele klok (sneller dan echte tijd)
//   node scripts/coop/duurtest.mjs --modus=tcp [--min=10] [--gasten=7]    echte TCP op 127.0.0.1 (coopcore.cjs), echte klok
// Uitkomst: een tabel per minuut, een oordeel (heap-helling na opwarmen, begrensde tabellen) en met --uit=<bestand> alles als json.
// Zonder Electron en zonder echt internet. De heap is die van het hele proces (gastheer en gasten samen).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
if (typeof global.gc !== 'function') { // gc nodig voor een eerlijke heapmeting: start zichzelf opnieuw met --expose-gc
  const r = spawnSync(process.execPath, ['--expose-gc', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(r.status == null ? 1 : r.status);
}
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const imp = (f) => import(pathToFileURL(path.join(ROOT, 'game', 'js', f)).href);
const N = await imp('coopnet.js');
const { createLink } = await imp('net/memtransport.js');
const { pingEvent } = await imp('partnerhud.js');
const X = await imp('coopextra.js');
const MODUS = arg('modus', 'mem'), MIN = Number(arg('min', MODUS === 'mem' ? 40 : 10)), DOEL = Math.min(15, Math.max(3, Number(arg('gasten', 7)))); // gasten (de gastheer erbij: tot 16 spelers, MAX_PLAYERS)
const UIT = arg('uit', null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const START = { x: -1287, y: -1066 };

// ---------------------------------------------------------------- meldingen en tijd
const meld = { desync: 0, fouten: [], waarsch: new Map() };
const orgWarn = console.warn, orgErr = console.error;
console.warn = (...a) => { const t = a.join(' '); if (/desync met de host/.test(t)) meld.desync++; else meld.waarsch.set(t.slice(0, 80), (meld.waarsch.get(t.slice(0, 80)) || 0) + 1); };
console.error = (...a) => { meld.fouten.push(a.join(' ').slice(0, 160)); };
const tijden = []; // ms per tick van de gastheer-koppeling in dit interval
const gemeten = (f) => { const t0 = performance.now(); f(); tijden.push(performance.now() - t0); };
const INFO = N.handshakeInfo({ tiles: '-', story: 'nieuw' });

// bytes per seconde per gast (gemiddeld over de gasten die er het hele interval waren), uit de tellers van het transport
let vorigeMeting = null, klokNu = () => performance.now() / 1000; // de klok van de rig (virtueel of echt)
function snelheid(lv, op, neer) {
  const nu = klokNu(), dt = vorigeMeting == null ? 0 : nu - vorigeMeting; vorigeMeting = nu;
  let su = 0, sd = 0, n = 0;
  for (const g of lv) { const u = op(g), d = neer(g); if (g._u != null && dt > 0 && u >= g._u) { su += u - g._u; sd += d - g._d; n++; } g._u = u; g._d = d; }
  return { opBs: n && dt ? Math.round(su / n / dt) : 0, neerBs: n && dt ? Math.round(sd / n / dt) : 0 };
}
// ---------------------------------------------------------------- de wereld van de gastheer (zoals nodehost.mjs, met verloop van voertuigen en voetgangers)
let idTeller = 1000;
const KLEUR = ['#b8473a', '#3a6ea5', '#4f8a5b', '#d9b44a', '#7a5a9a', '#e8e6e0', '#8a8f96', '#c77d3a'], HUID = ['#f0c8a0', '#d9aa82', '#b98560', '#8a5a3c', '#5c3a28'];
const nieuwVoertuig = (i) => ({ id: ++idTeller, x: START.x + 15 + (i % 8) * 9, y: START.y - 8 + (i % 2) * 14, angle: i % 2 ? Math.PI : 0, model: { len: i % 7 === 3 ? 11 : 4.2 }, isBus: i % 7 === 3 });
const nieuwePop = (i) => ({ id: ++idTeller, x: START.x - 10 + (i % 14) * 3, y: START.y + 6 + (i % 3) * 3, angle: i, speed: 0.8, state: 'wander', health: 30, clothing: KLEUR[i % KLEUR.length], skin: HUID[(i * 3) % HUID.length], _lookSeed: 17.25 + i * 91.7, hasBag: i % 4 === 0, speechText: i % 5 === 0 ? 'Moi!' : undefined, speechUntil: 1e9 });
function maakHostWereld() {
  const w = {
    player: { x: START.x + 4, y: START.y, angle: 0, character: 'tammo', vx: 0, vy: 0, inVehicle: null },
    companion: { x: START.x, y: START.y + 2, angle: 0, character: 'anita', vx: 0, vy: 0, inVehicle: null },
    coop: { local: true }, money: 500, wanted: 0, clock: 17.5, camYaw: 0, time: 0, paused: false, messages: [], audioEvents: [], addMessage(m) { this.messages.push(m); if (this.messages.length > 20) this.messages.shift(); },
    input: { axis: () => [0, 0], isDown: () => false, wasPressed: () => false }, vehicles: [], pedestrians: [], wildlife: [], mission: { phase: 'idle' },
  };
  for (let i = 0; i < 8; i++) w.vehicles.push(nieuwVoertuig(i));
  for (let i = 0; i < 14; i++) w.pedestrians.push(nieuwePop(i));
  ['cow', 'sheep', 'dog', 'cat', 'duck', 'pigeon'].forEach((kind, i) => w.wildlife.push({ kind, x: START.x - 4 + i * 4, y: START.y + 15, angle: i, speed: i % 2 ? 0.5 : 0, bobSeed: 0.7 + i }));
  w.coopExtraDeps = { controllers: () => [0, 1, 2, 3, 4].map((i) => ({ x: START.x + i * 5, y: START.y + 20, t: ((i * 3 + 1 + w.time) % 15), cycle: 15 })), misc: (bij, g, nu) => X.maakMisc({ kermis: true, punten: [{ x: START.x + 10, y: START.y - 5, z: 0 }] }, g, nu), gebroken: () => [] };
  return w;
}
// verloop: de gastheer wisselt voertuigen en voetgangers (nieuwe id's), zoals het verkeer rond de speler doet
function verloop(w, aantal) {
  for (let i = 0; i < aantal; i++) { w.vehicles.shift(); w.vehicles.push(nieuwVoertuig(i + w.vehicles.length)); w.pedestrians.shift(); w.pedestrians.push(nieuwePop(i + w.pedestrians.length)); }
}
function beweeg(w, dt, t) {
  const p = w.player;
  if (!p.inVehicle) { p.x = START.x + 4 + Math.cos(t / 4) * 6; p.y = START.y + Math.sin(t / 4) * 6; p.angle = t / 4 + Math.PI / 2; } else { const c = p.inVehicle; c.x += Math.cos(c.angle) * 9 * dt; c.y += Math.sin(c.angle) * 9 * dt; p.x = c.x; p.y = c.y; if (Math.abs(c.x - START.x) > 120) c.angle += Math.PI; }
  for (const v of w.vehicles) { if (v === p.inVehicle) continue; v.x += Math.cos(v.angle) * 4 * dt; if (Math.abs(v.x - START.x) > 90) v.angle += Math.PI; }
  for (const q of w.pedestrians) { q.x += Math.cos(q.angle) * 0.8 * dt; q.y += Math.sin(q.angle) * 0.8 * dt; q.angle += 0.2 * dt; }
  w.time += dt; w.clock = (w.clock + dt / 120) % 24;
}
function rit(w, aan) {
  if (aan) { const car = nieuwVoertuig(0); car.x = w.player.x + 3; car.y = w.player.y; car.angle = 0; w.vehicles.push(car); w.player.inVehicle = car; }
  else if (w.player.inVehicle) { const car = w.player.inVehicle; w.player.inVehicle = null; w.vehicles = w.vehicles.filter((v) => v !== car); }
}

// ---------------------------------------------------------------- rig 1: in het geheugen, op een virtuele klok
async function memRig() {
  const hw = maakHostWereld(); const gs = []; let t = 0; const DT = 1 / 30; let stal = 0;
  N.startHost(hw, INFO, { seed: 5, max: Math.max(8, DOEL + 1), scene: () => ({ filmpje: false, pauze: !!hw.paused, regel: null, keuze: null }) });
  const bytes = { op: 0, neer: 0 };
  const koppel = (g) => { // nieuwe verbinding voor g (bytes tellen)
    const link = createLink({ latency: 0.04, jitter: 0.015, loss: 0.01, seed: 11 + (g.nr * 7) + (g.keer = (g.keer || 0) + 1) });
    const a = link.a.send.bind(link.a), b = link.b.send.bind(link.b);
    link.a.send = (buf, r) => { g.neer += buf.length; return a(buf, r); }; link.b.send = (buf, r) => { g.op += buf.length; return b(buf, r); };
    g.link = link; return link;
  };
  let nr = 0;
  const maakGast = (versie) => {
    const g = { nr: ++nr, op: 0, neer: 0, uit: false, wereld: null };
    const link = koppel(g);
    N.addGuest(hw, link.a);
    g.wereld = { player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 3, messages: [], audioEvents: [], addMessage(m) { this.messages.push(m); if (this.messages.length > 20) this.messages.shift(); }, input: { axis: () => [Math.cos(t / 3 + g.nr), Math.sin(t / 3 + g.nr)], isDown: () => false, wasPressed: () => false } };
    N.startClient(g.wereld, link.b, versie ? { ...INFO, version: versie } : INFO, {});
    gs.push(g); return g;
  };
  const rig = {
    naam: 'mem', hw, gs,
    nu: () => t,
    async until(doel) { while (t < doel) rig.stap(); },
    stap() {
      if (stal > 0) stal -= DT; else gemeten(() => { beweeg(hw, DT, t); N.tickCoopNet(hw, DT); });
      if (stal > 0) hw.time += 0; // de gastheer staat even stil: zijn klok loopt niet
      for (const g of gs) { if (g.wereld.coopNet && !g.uit) { N.tickCoopNet(g.wereld, DT); g.wereld.time += DT; } if (g.link) g.link.advance(DT); }
      t += DT;
    },
    aanmelden: () => maakGast(),
    vals: () => { const g = maakGast('0.0.0'); g.vals = true; return g; },
    stil: () => { const g = { nr: ++nr, op: 0, neer: 0, wereld: { coopNet: null }, uit: true, stilleLink: true }; const l = koppel(g); N.addGuest(hw, l.a); gs.push(g); return g; },
    knip: (g) => g.link.cut(), herstel: (g) => g.link.restore(),
    terug(g) { const l = koppel(g); N.addGuest(hw, l.a); g.wereld.coopNet.session.reconnect(l.b); },
    weg(g) { N.stopCoopNet(g.wereld); g.uit = true; },
    stalGastheer(s) { stal = s; },
    ping(g) { if (g.wereld.coopNet) g.wereld.coopNet.session.sendEvent(pingEvent(12, 34, 'gevaar')); },
    opruimen() { for (let i = gs.length - 1; i >= 0; i--) { const g = gs[i]; if (g.uit || g.vals || g.stilleLink) { g.t0 ??= t; if (t - g.t0 > 30) gs.splice(i, 1); } } }, // weggegane en geweigerde gasten blijven even staan en worden dan losgelaten
    levend: () => gs.filter((g) => !g.uit && !g.vals && g.wereld.coopNet && g.wereld.coopNet.session),
    meet() {
      const hub = hw.coopNet ? hw.coopNet.hub : null;
      const hs = hub ? hub.stats() : {}, sim = hub ? hub.cfg.sim.stats() : {};
      const lv = rig.levend();
      let snaps = 0, relP = 0, relA = 0, looks = 0, extra = 0, gHost = 0;
      for (const g of lv) { const s = g.wereld.coopNet.session; snaps = Math.max(snaps, s.buf.snaps.length); relP = Math.max(relP, s.rel.pending.length); relA = Math.max(relA, s.rel.ahead.size); looks = Math.max(looks, s.looks ? s.looks.size : 0); const e = g.wereld.coopExtra; if (e) extra = Math.max(extra, e.voetgangers.size + e.uiterlijk.size + e.spraak.size + e.dieren.size + e.lichten.size + e.misc.size + e.kapot.length); gHost = Math.max(gHost, g.wereld.coopHost ? g.wereld.coopHost.voertuigen.length + g.wereld.coopHost.voetgangers.length : 0); }
      const ok = lv.filter((g) => g.wereld.coopNet.session.status === 'ok' && g.wereld.coopRoster && g.wereld.coopRoster.length === lv.length + 1).length;

      return { spelers: lv.length + 1, ok, host: { ...hs, ...sim }, gast: { snaps, relP, relA, looks, extra, gHost }, ...snelheid(lv, (g) => g.op, (g) => g.neer) };
    },
    async stop() { for (const g of gs) { try { if (g.wereld.coopNet) N.stopCoopNet(g.wereld); } catch (e) { /* weg */ } } try { N.stopCoopNet(hw); } catch (e) { /* weg */ } },
  };
  return rig;
}

// ---------------------------------------------------------------- rig 2: echte TCP op de loopback, echte klok
async function tcpRig() {
  const { startNodeHost } = await import(pathToFileURL(path.join(HERE, 'nodehost.mjs')).href);
  const { startMockGuest } = await import(pathToFileURL(path.join(HERE, 'mockclient.mjs')).href);
  const stage = path.join(ROOT, 'game');
  const h = await startNodeHost({ stage, max: Math.max(8, DOEL + 1) });
  const world = h.world, gs = []; let nr = 0; const t0 = Date.now();
  // de nodehost beweegt zelf; wij sturen alleen verloop, ritten en opdrachten
  const maak = async (token) => {
    const g = await startMockGuest({ stage, code: h.code, net: { latency: 0.04, jitter: 0.01, loss: 0.01 }, seed: 30 + (++nr), maxLog: 200, token });
    g.nr = nr; g.input = (tt) => ({ mx: Math.cos(tt / 3 + g.nr), my: Math.sin(tt / 3 + g.nr), run: false, yaw: 0 }); gs.push(g); return g;
  };
  const rig = {
    naam: 'tcp', hw: world, gs,
    nu: () => (Date.now() - t0) / 1000,
    async until(doel) { while (rig.nu() < doel) await sleep(100); },
    aanmelden: () => maak(), vals: null, stil: null,
    knip: (g) => g.cut(), herstel: (g) => g.restore(),
    async terug(g) { const token = g.session.token; const i = gs.indexOf(g); try { await g.stop(); } catch (e) { /* weg */ } gs.splice(i, 1); const n = await maak(token); n.nr = g.nr; return n; },
    async weg(g) { const i = gs.indexOf(g); try { await g.stop(); } catch (e) { /* weg */ } if (i >= 0) gs.splice(i, 1); },
    stalGastheer(s) { h.stalled = true; setTimeout(() => { h.stalled = false; }, s * 1000); },
    ping(g) { g.session.sendEvent(pingEvent(12, 34, 'gevaar')); },
    opruimen() {},
    levend: () => gs.filter((g) => g.session && g.session.status !== 'verbroken' && g.session.status !== 'geweigerd'),
    meet() {
      const hub = world.coopNet ? world.coopNet.hub : null;
      const hs = hub ? hub.stats() : {}, sim = hub ? hub.cfg.sim.stats() : {};
      const lv = rig.levend();
      let snaps = 0, relP = 0, relA = 0, looks = 0, logs = 0;
      for (const g of lv) { const s = g.session; snaps = Math.max(snaps, s.buf.snaps.length); relP = Math.max(relP, s.rel.pending.length); relA = Math.max(relA, s.rel.ahead.size); looks = Math.max(looks, s.looks ? s.looks.size : 0); logs = Math.max(logs, g.log.events.length + g.log.samples.length); }
      const ok = lv.filter((g) => g.session.status === 'ok' && g.last() && g.last().players.length === lv.length + 1).length;

      return { spelers: lv.length + 1, ok, host: { ...hs, ...sim }, gast: { snaps, relP, relA, looks, extra: logs, gHost: 0 }, ...snelheid(lv, (g) => g.transport.bytesOut, (g) => g.transport.bytesIn) };
    },
    async stop() { for (const g of [...gs]) { try { await g.stop(); } catch (e) { /* weg */ } } await h.stop(); },
  };
  h.tickMs = (ms) => tijden.push(ms); // de frametijd van de koppeling bij de gastheer
  return rig;
}

// ---------------------------------------------------------------- het draaiboek: rondes van 120 s
const RONDE = 120;
function draaiboek(r) {
  const b = r * RONDE;
  const L = [];
  const op = (s, f) => L.push([b + s, f]);
  const sel = (rig, k) => { const l = rig.levend(); return l.length ? l[(r + k) % l.length] : null; };
  op(2, (rig) => { rig.hw.mission = { phase: 'active', label: 'Het Loket', type: 'stages', index: r % 5, progressText: 'Stap in de auto', marker: { x: START.x + 30, y: START.y + 30 } }; });
  op(8, (rig) => { const g = sel(rig, 0); if (g) rig.ping(g); });
  op(12, (rig) => { const g = sel(rig, 1); rig.ctx.knip = g; if (g) rig.knip(g); }); // wegvallen
  op(25, (rig) => { if (rig.ctx.knip) rig.herstel(rig.ctx.knip); }); // terug na 13 s (meer dan de 5 s waarna de gastheer hem weg noemt)
  op(30, (rig) => { N.deelMetGasten(rig.hw, 400, { vak: 'bijbaan', basis: 400, xp: 10 }); });
  op(35, (rig) => { rig.hw.coopUitslag(r % 2 === 0, 'Het Loket', r % 2 ? 'te laat' : '', r % 2 ? 0 : 800, r % 3 === 0); rig.hw.mission = { phase: 'idle' }; });
  op(40, (rig) => { rig.hw.paused = true; }); // de pauze van de gastheer
  op(50, (rig) => { rig.hw.paused = false; });
  op(55, (rig) => { rit(rig.hw, true); }); // de gastheer rijdt
  op(70, (rig) => { rit(rig.hw, false); });
  op(60, async (rig) => { const g = sel(rig, 2); if (g) { await rig.weg(g); } }); // een gast gaat weg ...
  op(66, async (rig) => { if (rig.levend().length < DOEL) await rig.aanmelden(); }); // ... en een nieuwe (of een late) neemt een plek
  op(75, (rig) => { const g = sel(rig, 3); rig.ctx.terug = g; if (g) rig.knip(g); }); // een gast met een nieuwe verbinding terug (zelfde token)
  op(82, async (rig) => { const g = rig.ctx.terug; if (g) { const n = await rig.terug(g); rig.ctx.terug = null; if (n) rig.ctx.vervangen = n; } });
  op(90, (rig) => { rig.stalGastheer(8); }); // de gastheer reageert 8 s niet
  op(100, (rig) => { if (rig.vals) { const g = rig.vals(); rig.ctx.vals = g; } if (rig.stil) rig.stil(); verloop(rig.hw, 4); }); // verkeerde versie, een stille verbinding, verkeer verloopt
  op(110, async (rig) => { if (rig.levend().length < DOEL) await rig.aanmelden(); verloop(rig.hw, 6); });
  return L;
}

// ---------------------------------------------------------------- meten en oordelen
const heapMB = () => { global.gc(); global.gc(); return +(process.memoryUsage().heapUsed / 1048576).toFixed(1); };
function helling(punten) { // kleinste kwadraten: MB per minuut over (minuut, MB)
  const n = punten.length; if (n < 3) return 0;
  const mx = punten.reduce((a, p) => a + p[0], 0) / n, my = punten.reduce((a, p) => a + p[1], 0) / n;
  let nu = 0, de = 0; for (const [x, y] of punten) { nu += (x - mx) * (y - my); de += (x - mx) ** 2; }
  return de ? nu / de : 0;
}
const pct = (l, p) => { if (!l.length) return 0; const s = [...l].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };

const rig = MODUS === 'tcp' ? await tcpRig() : await memRig();
rig.ctx = {}; klokNu = rig.nu;
const log = [], rijen = [];
const wall0 = Date.now();
console.log(`duurtest ${MODUS}: ${MIN} min (${MODUS === 'mem' ? 'virtuele klok' : 'echte klok'}), tot ${DOEL} gasten`);
try {
  if (MODUS === 'tcp') await sleep(0);
  const start = Math.min(DOEL, 3);
  for (let i = 0; i < start; i++) await rig.aanmelden();
  await rig.until(8);
  const rondes = Math.ceil(MIN * 60 / RONDE);
  let volgendeMeting = 60;
  const lijst = [];
  for (let r = 0; r < rondes; r++) lijst.push(...draaiboek(r));
  lijst.sort((a, b) => a[0] - b[0]);
  const eind = MIN * 60;
  for (let m = 60; m <= eind; m += 60) lijst.push([m - 15, 'meet']); // 45 s na de volle minuut: dan is het draaiboek rustig (geen gast die net weggaat)
  lijst.sort((a, b) => a[0] - b[0] || (a[1] === 'meet' ? 1 : -1));
  for (const [tijd, f] of lijst) {
    if (tijd > eind) break;
    await rig.until(tijd);
    if (f === 'meet') {
      const m = rig.meet(); rig.opruimen();
      if (process.env.DUUR_DEBUG && rig.gs) console.log('   ', rig.gs.map((g) => g.wereld ? `${g.nr}:${g.uit ? 'uit' : g.wereld.coopNet ? g.wereld.coopNet.session.status + '/' + (g.wereld.coopRoster || []).length + '/r' + g.wereld.coopNet.session.rel.pending.length + '/e' + g.wereld.coopNet.session.rel.expected + '/s' + g.wereld.coopNet.session.slot + '/t' + g.wereld.coopNet.session.token : 'geen'}` : '?').join(' '), JSON.stringify(rig.hw.coopRoster.map((r) => r.slot + r.verbinding)), 'host:', [...rig.hw.coopNet.hub.sessions].map(([k, x]) => `${k}:${x.status}/p${x.rel.pending.length}/q${x.rel.pending.length ? x.rel.pending[0].seq : ''}/n${x.rel.nextSend}/t${x.guest && x.guest.token}`).join(' '));
      const heap = heapMB();
      const rij = { min: Math.round(tijd / 60), heap, ...m, frameMs: { gem: +(tijden.reduce((a, b) => a + b, 0) / Math.max(1, tijden.length)).toFixed(3), p99: +pct(tijden, 0.99).toFixed(2), max: +Math.max(0, ...tijden).toFixed(2) }, desync: meld.desync, fouten: meld.fouten.length, wallS: Math.round((Date.now() - wall0) / 1000) };
      tijden.length = 0; rijen.push(rij);
      console.log(`  min ${String(rij.min).padStart(2)}  heap ${String(heap).padStart(6)} MB  spelers ${rij.spelers} ok ${rij.ok}  hub ${JSON.stringify(rij.host)}  gast ${JSON.stringify(rij.gast)}  frame ${rij.frameMs.gem}/${rij.frameMs.p99}/${rij.frameMs.max} ms  op ${rij.opBs} neer ${rij.neerBs} B/s/gast  desync ${rij.desync} fouten ${rij.fouten}  (${rij.wallS} s)`);
    } else {
      try { await f(rig); } catch (e) { log.push(`+${Math.round(tijd)} s: ${e.stack || e.message}`); }
    }
  }
  // eindcontrole: alles weer rustig? Even laten uitrusten, dan moet iedereen verbonden zijn en weten wie er zijn
  await rig.until(eind + 20);
  const slot = rig.meet();
  const problemen = [];
  if (slot.ok !== slot.spelers - 1) problemen.push(`aan het eind ziet ${slot.ok} van ${slot.spelers - 1} gasten de volle lijst`);
  if (meld.fouten.length) problemen.push(`${meld.fouten.length} consolefouten: ${meld.fouten[0]}`);
  const na = rijen.filter((x) => x.min >= Math.max(5, MIN / 2)).map((x) => [x.min, x.heap]); // de tweede helft: de eerste helft is opwarmen en spelers die nog aansluiten
  const hl = +helling(na).toFixed(3);
  if (hl > 0.5) problemen.push(`de heap groeit ${hl} MB per minuut in de tweede helft`);
  const max = (f) => Math.max(0, ...rijen.map(f));
  if (max((x) => x.host.wachtend || 0) > 4) problemen.push(`wachtende verbindingen bij de hub tot ${max((x) => x.host.wachtend || 0)}`);
  if (max((x) => x.host.relPending || 0) > 32) problemen.push('wachtrij van betrouwbare berichten boven 32');
  if (max((x) => x.host.geheugens || 0) > Math.max(8, DOEL + 1)) problemen.push('meer extra-geheugens dan plekken');
  if (max((x) => x.gast.snaps) > 40) problemen.push('snapshotbuffer boven 40');
  if (max((x) => x.gast.looks) > 400) problemen.push('uiterlijkencache boven 400');
  if (MODUS === 'mem' && max((x) => x.gast.extra) > 400) problemen.push(`extra-tabellen bij een gast tot ${max((x) => x.gast.extra)}`);
  if (meld.desync) problemen.push(`${meld.desync} desync-meldingen`);
  console.log(`\nheap-helling in de tweede helft: ${hl} MB/min; piek ${max((x) => x.heap)} MB; hoogste wachtend ${max((x) => x.host.wachtend || 0)}; hoogste relPending ${max((x) => x.host.relPending || 0)}; desync ${meld.desync}; fouten ${meld.fouten.length}`);
  if (meld.waarsch.size) console.log('waarschuwingen:', JSON.stringify([...meld.waarsch]));
  if (log.length) console.log('scriptfouten:\n  ' + log.slice(0, 8).join('\n  '));
  const bw = rijen.length ? rijen[rijen.length - 1] : null; void bw;
  console.log(problemen.length ? 'PROBLEMEN:\n  ' + problemen.join('\n  ') : 'ALLES OK');
  if (UIT) fs.writeFileSync(UIT, JSON.stringify({ modus: MODUS, min: MIN, rijen, helling: hl, problemen, scriptfouten: log, desync: meld.desync, fouten: meld.fouten, waarschuwingen: [...meld.waarsch] }, null, 1));
  process.exitCode = problemen.length || log.length ? 1 : 0;
} catch (e) { console.error = orgErr; orgErr('duurtest MISLUKT:', e && e.stack || e); process.exitCode = 1; }
finally { try { await rig.stop(); } catch (e) { /* weg */ } console.warn = orgWarn; }
process.exit(process.exitCode || 0);
