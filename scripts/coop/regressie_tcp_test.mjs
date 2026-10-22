// Samen spelen: de regressie op echte TCP-verbindingen (127.0.0.1) met 2, 4, 8 en 16 spelers, zonder Electron.
//   node scripts/coop/regressie_tcp_test.mjs [--n=2,4,8,16]
// De gastheer draait de echte koppeling (coopnet.js, hub, snapshots) achter dezelfde coopcore.cjs als de app; de gasten zijn headless
// (mockclient.mjs, ClientSession met 60 ms vertraging) en lezen wat er echt over de lijn komt. Per aantal spelers: de lijst, het hek,
// een filmpje en de pauze van de gastheer (scene), de opdracht (melding, doel, gelukt, mislukt, gestopt), de beloning, neergaan en
// gepakt (alive in de momentopname), roepjes van een gast, een gast met de kabel eruit (geen beloning), en dat de gasten bij het
// stoppen van de gastheer een eind-melding krijgen. Wat de gasten ook doen: ze lopen rondjes, zodat er elke seconde verkeer is.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as N from '../../game/js/coopnet.js';
import { listenForGuests } from '../../game/js/net/ipctransport.js';
import { pingEvent } from '../../game/js/partnerhud.js';
import { setGate } from '../../game/js/coopgate.js';
import { startMockGuest } from './mockclient.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { createCoopCore } = require(path.join(ROOT, 'desktop', 'coopcore.cjs'));
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const AANTALLEN = String(arg('n', '2,4,8,16')).split(',').map(Number).filter((x) => x >= 2 && x <= 16);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms, what) => { const e = Date.now() + ms; while (Date.now() < e) { if (f()) return; await sleep(40); } throw new Error('time-out: ' + what); };
let checks = 0;
const ok = (c, m) => { checks++; assert.ok(c, m); };
const eq = (a, b, m) => { checks++; assert.equal(a, b, m); };
const INFO = N.handshakeInfo({ tiles: '-', story: 'nieuw' });

async function ronde(spelers) {
  const t0 = Date.now(), gasten = spelers - 1;
  let filmpje = false;
  const world = { player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita', vx: 0, vy: 0, radius: 0.4 }, coop: { local: true }, money: 0, wanted: 0, clock: 9, camYaw: 0, time: 0, messages: [], audioEvents: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false, wasPressed: () => false } };
  const listeners = new Set();
  const core = createCoopCore({ gameDir: path.join(ROOT, 'game'), emit: (k, p) => { for (const f of [...listeners]) f(k, p); }, localIp: '127.0.0.1', upnp: false });
  const api = { send: (id, bytes) => core.send(id, bytes), close: (id) => core.close(id), onEvent: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } };
  N.startHost(world, INFO, { seed: 3, max: Math.max(4, spelers), scene: () => ({ filmpje, pauze: !!world.paused, regel: null, keuze: null }) });
  listenForGuests(api, (tr) => N.addGuest(world, tr));
  const hosted = await core.host({ max: Math.max(4, spelers) });
  ok(hosted.ok, `${spelers}: de gastheer luistert`);
  let last = Date.now();
  const timer = setInterval(() => { const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; N.tickCoopNet(world, dt); world.time += dt; }, 16);
  const guests = [];
  const stop = async () => { clearInterval(timer); for (const g of guests) { try { await g.stop(); } catch (e) { /* al weg */ } } try { N.stopCoopNet(world); } catch (e) { /* al weg */ } await sleep(300); try { await core.stop(); } catch (e) { /* al weg */ } };
  const gebeurt = (g, k, van = 0) => g.log.events.slice(van).filter(([, b]) => b.k === k).map(([, b]) => b);
  const evenAantal = (g) => g.log.events.length;
  try {
    setGate(true); // een nieuw spel: de wachtkamer is dicht tot de gastheer start
    for (let i = 0; i < gasten; i++) {
      const g = await startMockGuest({ stage: path.join(ROOT, 'game'), code: hosted.code, net: { latency: 0.06, jitter: 0.01 }, seed: 20 + i });
      g.input = (tt) => ({ mx: Math.cos(tt + i), my: Math.sin(tt + i), run: false, yaw: 0 });
      guests.push(g);
    }
    await until(() => guests.every((g) => g.session.status === 'ok' && g.last()), 20000, 'alle gasten verbonden');
    await sleep(1500);
    eq(world.coopRoster.length, spelers, `${spelers}: de lijst`);
    eq(new Set(guests.map((g) => g.session.slot)).size, gasten, `${spelers}: elke gast een eigen plek`);
    ok(guests.every((g) => g.last().players.length === spelers), `${spelers}: de momentopname heeft ${spelers} spelers`);
    ok(guests.every((g) => g.log.events.some(([, b]) => b.k === 'spelers' || b.k === 'klok')), `${spelers}: lijst en klok komen binnen`);

    // het hek
    await until(() => guests.every((g) => gebeurt(g, 'hek').some((b) => b.aan === true)), 5000, 'hek dicht');
    let van = guests.map(evenAantal); N.openHek(world);
    await until(() => guests.every((g, i) => gebeurt(g, 'hek', van[i]).some((b) => b.aan === false)), 5000, 'hek open');

    // een filmpje en de pauze van de gastheer
    van = guests.map(evenAantal); filmpje = true; await sleep(1200); world.paused = true;
    await until(() => guests.every((g, i) => gebeurt(g, 'scene', van[i]).some((b) => b.filmpje === true)) && guests.every((g, i) => gebeurt(g, 'scene', van[i]).some((b) => b.pauze === true)), 6000, 'filmpje en pauze');
    filmpje = false; world.paused = false;
    await until(() => guests.every((g, i) => gebeurt(g, 'scene', van[i]).slice(-1)[0] && gebeurt(g, 'scene', van[i]).slice(-1)[0].filmpje !== true), 6000, 'filmpje voorbij');

    // de opdracht van de gastheer
    van = guests.map(evenAantal);
    world.mission = { phase: 'active', label: 'Het Loket', type: 'stages', index: 3, progressText: 'Stap in de auto', marker: { x: 30, y: 30 } };
    await until(() => guests.every((g, i) => gebeurt(g, 'missie', van[i]).some((b) => b.actief === true)), 6000, 'opdracht gemeld');
    await until(() => guests.every((g) => g.last().entities >= 1), 6000, 'het doel zit in de momentopname');
    van = guests.map(evenAantal);
    world.coopUitslag(true, 'Het Loket', '', 1000); world.coopUitslag(false, 'De Kluis', 'te laat', 0); world.coopUitslag(false, 'Het Loket', '', 0, true);
    world.mission = { phase: 'idle' };
    await until(() => guests.every((g, i) => gebeurt(g, 'uitslag', van[i]).length === 3), 6000, 'drie uitslagen');
    for (const [i, g] of guests.entries()) {
      const [a, b, c] = gebeurt(g, 'uitslag', van[i]);
      eq(`${a.ok}|${a.deel}|${b.ok}|${b.reden}|${c.gestopt}`, 'true|500|false|te laat|true', `${spelers}: gelukt met deel 500, mislukt met reden, gestopt`);
    }

    // de beloning (met een vak, zoals een bijbaan: de loopbaan van de gast)
    van = guests.map(evenAantal);
    eq(N.deelMetGasten(world, 1000, { vak: 'bijbaan', basis: 1000, xp: 20 }), gasten, `${spelers}: elke verbonden gast betaald`);
    await until(() => guests.every((g, i) => gebeurt(g, 'beloning', van[i]).length === 1), 6000, 'beloning aangekomen');
    ok(guests.every((g, i) => gebeurt(g, 'beloning', van[i])[0].geld === 500), `${spelers}: elke gast €500`);

    // neergaan en gepakt
    van = guests.map(evenAantal); world.pendingRespawn = { busted: true };
    await until(() => guests.every((g, i) => gebeurt(g, 'melding', van[i]).some((b) => /gepakt/.test(b.tekst))), 6000, 'gepakt gemeld');
    await until(() => guests.every((g) => { const p = g.session.world().players.find((q) => q.slot === 0); return p && p.alive === false; }), 6000, 'alive=false');
    world.pendingRespawn = null;
    await until(() => guests.every((g) => g.session.world().players.find((q) => q.slot === 0).alive === true), 6000, 'weer levend');

    // roepjes van de laatste gast
    van = guests.map(evenAantal); world.audioEvents.length = 0;
    const roeper = guests[guests.length - 1];
    roeper.session.sendEvent(pingEvent(12, 34, 'gevaar'));
    await until(() => guests.slice(0, -1).every((g, i) => gebeurt(g, 'ping', van[i]).length === 1), 6000, 'ping bij de anderen');
    for (const [i, g] of guests.slice(0, -1).entries()) { const p = gebeurt(g, 'ping', van[i])[0]; eq(`${p.x}|${p.y}|${p.soort}|${p.van}`, `12|34|gevaar|${roeper.session.slot}`, `${spelers}: plek en afzender`); }
    await sleep(400); eq(gebeurt(roeper, 'ping', van[guests.length - 1]).length, 0, `${spelers}: de afzender krijgt zijn eigen roep niet terug`);
    await until(() => world.coopPingMarks.length === 1, 3000, 'baken bij de gastheer');

    // een gast met de kabel eruit
    if (gasten >= 2) {
      const weg = guests[guests.length - 1]; weg.cut();
      await until(() => world.coopRoster.find((r) => r.slot === weg.session.slot).verbinding === 'lost', 25000, 'gast als weg gemeld');
      van = guests.map(evenAantal);
      eq(N.deelMetGasten(world, 200), gasten - 1, `${spelers}: wie weg is krijgt niets`);
      await until(() => guests.slice(0, -1).every((g, i) => gebeurt(g, 'beloning', van[i]).length === 1), 6000, 'rest betaald');
      eq(gebeurt(weg, 'beloning', van[guests.length - 1]).length, 0, `${spelers}: de weggevallen gast krijgt niets`);
    }
    // de gastheer stopt: de verbonden gasten horen het
    van = guests.map(evenAantal); N.stopCoopNet(world);
    await until(() => guests.slice(0, gasten >= 2 ? -1 : undefined).every((g, i) => gebeurt(g, 'weg', van[i]).some((b) => b.reden === 'spel gestopt') || g.session.status === 'verbroken'), 8000, 'stop gemeld');
    console.log(`  ${spelers} spelers over TCP: ok (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } finally { await stop(); }
}

try {
  for (const n of AANTALLEN) await ronde(n);
  console.log(`regressie_tcp_test: ${checks} controles ok (spelers: ${AANTALLEN.join(', ')})`);
} catch (e) { console.error('regressie_tcp_test MISLUKT:', e && e.stack || e); process.exitCode = 1; }
process.exit(process.exitCode || 0);
