// Samen missies (#983, #429): de bolwerken van het proefbeleg (M30) met 2 en 4 spelers over echte TCP-verbindingen (127.0.0.1), zonder Electron.
//   node scripts/coop/samenmissies_tcp_test.mjs [--n=2,4]
// De gastheer draait de echte netlaag (coopnet.js: hub, snapshots, wie J zei) en de echte missions.js (samenposten, missieposten) op een platte kaart; de gasten
// zijn headless (mockclient.mjs, ClientSession). De figuren van de gasten staan waar de test ze neerzet (de gastheer simuleert elke gast als figuur).
// Per aantal spelers: elke speler een eigen bolwerk (de melding komt bij elke gast aan), de bolwerken gaan tegelijk, een gast die weggaat midden in de opdracht
// (de rest maakt af), en een gast die later aansluit (kijkt mee, telt niet mee).
import './../node3d.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mem = new Map();
const ECHT = /^gde-(save-v1|settings|prestaties-v1)$/;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k) => { assert.ok(!ECHT.test(k), `test leest echte opslag: ${k}`); return mem.has(k) ? mem.get(k) : null; },
    setItem: (k, v) => { assert.ok(!ECHT.test(k), `test schrijft echte opslag: ${k}`); mem.set(k, String(v)); },
    removeItem: (k) => { assert.ok(!ECHT.test(k), `test wist echte opslag: ${k}`); mem.delete(k); },
    clear: () => mem.clear(),
  },
});
document.body = document.createElement('div');

const N = await import('../../game/js/coopnet.js');
const M = await import('../../game/js/missions.js');
const { ververs } = await import('../../game/js/spelersregister.js');
const { BOURTANGE } = await import('../../game/js/missions_akte6.js');
const { listenForGuests } = await import('../../game/js/net/ipctransport.js');
const { setGate } = await import('../../game/js/coopgate.js');
const { startMockGuest } = await import('./mockclient.mjs');

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { createCoopCore } = require(path.join(ROOT, 'desktop', 'coopcore.cjs'));
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const AANTALLEN = String(arg('n', '2,4')).split(',').map(Number).filter((x) => x >= 2 && x <= 4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms, what) => { const e = Date.now() + ms; while (Date.now() < e) { if (f()) return; await sleep(40); } throw new Error('time-out: ' + what); };
let checks = 0;
const ok = (c, m) => { checks++; assert.ok(c, m); };
const INFO = N.handshakeInfo({ tiles: '-', story: 'nieuw' });

const spot = (x, y) => ({ x, y, road: null });
const KAART = {
  meta: { bounds: null, shops: [], garages: [], neighbourhoodPoints: [] }, water: [], roads: [], buildings: [], tiles: [],
  isOpenSpot: () => true, nearestRoadPoint: (x, y) => ({ x, y, road: { pts: [[x, y], [x + 1, y + 1]] } }),
  openSpotNear: (x, y) => spot(x, y), findOpenSpawn: (x, y) => spot(x, y), spawnZ: () => 0,
  buildingsNear: () => [], roadsNear: () => [], isOnBridge: () => false, escapeBuilding: (x, y) => [x + 1, y + 1], roadAt: () => null,
  groundHeightAt: () => 0, surfaceAt: () => ({ z: 0 }), spawnState: () => ({}),
};
const BW = [BOURTANGE.bolwerk1, BOURTANGE.bolwerk2, BOURTANGE.bolwerk3];

async function ronde(spelers) {
  const t0 = Date.now(), gasten = spelers - 1;
  const world = {
    map: KAART, onRespawn: [], player: { x: 0, y: 0, z: 0, gz: 0, angle: 0, character: 'tammo', vx: 0, vy: 0, inVehicle: null, radius: 0.35, exitVehicle() { this.inVehicle = null; } },
    companion: { x: 1, y: 1, angle: 0, character: 'anita', vx: 0, vy: 0, radius: 0.4 }, coop: { local: true },
    vehicles: [], pedestrians: [], wildlife: [], stats: { pedKills: 0, copKills: 0 }, health: 100, armor: 0, money: 0, wanted: 0, time: 0, clock: 12, meldingen: [],
    input: { wasPressed: () => false, consume() {}, axis: () => [0, 0], isDown: () => false }, addMessage(t) { this.meldingen.push(t); },
  };
  ververs(world, 0);
  M.initMissions(world);
  const listeners = new Set();
  const core = createCoopCore({ gameDir: path.join(ROOT, 'game'), emit: (k, p) => { for (const f of [...listeners]) f(k, p); }, localIp: '127.0.0.1', upnp: false });
  const api = { send: (id, bytes) => core.send(id, bytes), close: (id) => core.close(id), onEvent: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } };
  N.startHost(world, INFO, { seed: 4, max: 4, scene: () => ({ filmpje: false, pauze: false, regel: null, keuze: null }) });
  listenForGuests(api, (tr) => N.addGuest(world, tr));
  const hosted = await core.host({ max: 4 });
  ok(hosted.ok, `${spelers}: de gastheer luistert`);
  const plek = {}; // waar de test elke gast neerzet (slot -> [x, y])
  let last = Date.now();
  const timer = setInterval(() => {
    const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    world.time += dt;
    for (const [slot, p] of Object.entries(plek)) { const f = world.coopFigures && world.coopFigures[slot]; if (f && p) { f.x = p[0]; f.y = p[1]; } }
    N.tickCoopNet(world, dt);
    M.updateMissions(dt, world);
  }, 16);
  const guests = [];
  const stop = async () => { clearInterval(timer); for (const g of guests) { try { await g.stop(); } catch (e) { /* al weg */ } } try { N.stopCoopNet(world); } catch (e) { /* al weg */ } await sleep(300); try { await core.stop(); } catch (e) { /* al weg */ } };
  const gebeurt = (g, k, van = 0) => g.log.events.slice(van).filter(([, b]) => b.k === k).map(([, b]) => b);
  const def = () => M.getMissionDefs().find((d) => d.label === 'Het proefbeleg');
  const index = () => M.getMissionDefs().findIndex((d) => d.label === 'Het proefbeleg');
  const eerste = () => def().stages.findIndex((s) => s.posten === 'bolwerken');
  const poort = () => def().stages.findIndex((s, i) => i > eerste() && s.kind === 'goto' && !s.posten);
  const stap = () => M.missionDebug.state().stage;
  const nieuweGast = async (i) => {
    const g = await startMockGuest({ stage: path.join(ROOT, 'game'), code: hosted.code, net: { latency: 0.05, jitter: 0.01 }, seed: 40 + i });
    g.input = () => ({ mx: 0, my: 0, run: false, yaw: 0 });
    guests.push(g);
    return g;
  };
  try {
    setGate(false);
    for (let i = 0; i < gasten; i++) await nieuweGast(i);
    await until(() => guests.every((g) => g.session.status === 'ok' && g.last()), 20000, 'alle gasten verbonden');
    await sleep(800);
    ok(world.coopRoster.length === spelers, `${spelers}: de lijst telt ${spelers} spelers`);
    const slots = guests.map((g) => g.session.slot);
    // elke gast staat bij een eigen bolwerk; bij het begin van de opdracht antwoordt hij J (zoals een speler op "Meedoen?")
    slots.forEach((s, i) => { plek[s] = BW[(i + 1) % 3]; });
    world.player.x = BW[0][0]; world.player.y = BW[0][1];
    await until(() => slots.every((s) => (world.coopPartners || []).some((p) => p.slot === s && Math.hypot(p.x - plek[s][0], p.y - plek[s][1]) < 3)), 8000, 'de gasten staan bij hun bolwerk');
    const begin = async (lijst, label) => { // start de opdracht bij de bolwerken en laat de gasten in de lijst J zeggen
      const van = lijst.map((g) => g.log.events.length);
      ok(M.missionDebug.hervat(world, index(), eerste()), `${spelers}: ${label}`);
      await until(() => lijst.every((g, i) => gebeurt(g, 'meedoen', van[i]).length >= 1), 8000, 'de uitnodiging komt bij elke gast');
      for (const g of lijst) g.session.sendEvent({ k: 'meedoenantwoord', ja: true });
      await until(() => lijst.every((g) => (world.coopMeespelers() || []).includes(g.session.slot)), 8000, 'elke gast heeft J gezegd');
      return van;
    };
    const van = await begin(guests, 'het proefbeleg begint bij de bolwerken');
    // de rollen komen bij elke gast aan
    await until(() => guests.every((g, i) => gebeurt(g, 'melding', van[i]).some((b) => /^Jij neemt het .* bolwerk/.test(b.tekst))), 10000, 'rolmelding bij elke gast');
    ok(world.meldingen.some((m) => /^Jij neemt het .* bolwerk/.test(m)), `${spelers}: de gastheer krijgt zijn bolwerk in beeld`);
    const rollen = guests.map((g, i) => gebeurt(g, 'melding', van[i]).find((b) => /Jij neemt/.test(b.tekst)).tekst);
    ok(new Set(rollen).size === gasten, `${spelers}: elke gast een eigen bolwerk (${rollen.join(' | ')})`);
    // de bolwerken gaan tegelijk: bij drie of vier spelers staan ze in ongeveer een vlag (6 s) allemaal klaar
    const t1 = Date.now();
    if (spelers >= 4) {
      await until(() => stap() >= poort(), 25000, 'alle drie de bolwerken tegelijk');
      ok((Date.now() - t1) / 1000 < 14, `${spelers}: drie bolwerken in ${((Date.now() - t1) / 1000).toFixed(1)} s (alleen was het 18 s)`);
    } else {
      await until(() => stap() >= eerste() + 4, 25000, 'twee bolwerken tegelijk');
      ok((Date.now() - t1) / 1000 < 12, `${spelers}: twee bolwerken in ${((Date.now() - t1) / 1000).toFixed(1)} s (alleen was het 12 s)`);
      world.player.x = BW[2][0]; world.player.y = BW[2][1];
      await until(() => stap() >= poort(), 25000, 'het derde bolwerk');
    }
    ok(M.missionDebug.state().phase === 'active', `${spelers}: de opdracht loopt door naar de poort`);
    M.missionDebug.lose(world); // klaar voor deze ronde
    for (const s of Object.keys(plek)) delete plek[s];
    await sleep(500);

    // wegvallen midden in de opdracht (alleen met meer dan twee spelers: er blijft een gast over)
    if (gasten >= 2) {
      const g1 = guests[0], g2 = guests[guests.length - 1];
      plek[g1.session.slot] = BW[1]; plek[g2.session.slot] = BW[2];
      world.player.x = BW[0][0]; world.player.y = BW[0][1];
      await begin(guests, 'tweede poging begint');
      await sleep(2000); // iedereen staat 2 s op zijn post
      await g2.stop(); // een gast gaat weg midden in de opdracht
      delete plek[g2.session.slot];
      await until(() => world.coopRoster.find((r) => r.slot === g2.session.slot).verbinding === 'lost' || !world.coopRoster.some((r) => r.slot === g2.session.slot), 30000, 'de weggaande gast is uit de lijst').catch(() => {});
      // de rest maakt de bolwerken af: de gastheer en g1 houden hun post, daarna loopt de gastheer zelf naar het derde bolwerk
      await until(() => stap() >= eerste() + 4 || M.missionDebug.state().phase !== 'active', 30000, 'eerste en tweede bolwerk klaar');
      world.player.x = BW[2][0]; world.player.y = BW[2][1];
      await until(() => stap() >= poort(), 30000, 'het derde bolwerk door de overblijvers');
      ok(M.missionDebug.state().phase === 'active', `${spelers}: na het wegvallen van een gast loopt de opdracht door`);
      M.missionDebug.lose(world);
      for (const s of Object.keys(plek)) delete plek[s];
      await sleep(500);
    }
    // later aansluiten (alleen als er een plek vrij is): een gast die binnenkomt als de opdracht loopt en nee zegt telt niet mee
    if (spelers < 4) {
      const laat = await nieuweGast(9);
      await until(() => laat.session.status === 'ok' && laat.last(), 20000, 'late gast verbonden');
      const vast = guests.filter((g) => g !== laat && g.session.status === 'ok');
      vast.forEach((g, i) => { plek[g.session.slot] = BW[1]; });
      plek[laat.session.slot] = BW[2]; // hij staat bij het derde bolwerk
      world.player.x = BW[0][0]; world.player.y = BW[0][1];
      const vanLaat = laat.log.events.length;
      await begin(vast, 'derde poging begint');
      await until(() => gebeurt(laat, 'meedoen', vanLaat).length >= 1 || gebeurt(laat, 'toeschouwer', vanLaat).length >= 1, 8000, 'de late gast krijgt een uitnodiging of kijkt mee');
      laat.session.sendEvent({ k: 'meedoenantwoord', ja: false }); // hij kijkt liever mee
      await sleep(9000);
      ok(stap() >= eerste() + 4 && stap() < poort(), `${spelers}: een late gast die nee zei bezet het derde bolwerk niet (stap ${stap() - eerste()})`);
      world.player.x = BW[2][0]; world.player.y = BW[2][1];
      await until(() => stap() >= poort(), 25000, 'de gastheer loopt het derde bolwerk zelf');
      M.missionDebug.lose(world);
    }
    console.log(`  ${spelers} spelers over TCP: ok (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } finally { await stop(); }
}

try {
  for (const n of AANTALLEN) await ronde(n);
  console.log(`samenmissies_tcp_test: ${checks} controles ok (spelers: ${AANTALLEN.join(', ')})`);
} catch (e) { console.error('samenmissies_tcp_test MISLUKT:', e && e.stack || e); process.exitCode = 1; }
process.exit(process.exitCode || 0);
