// Coöp-testbank (#95): een headless gast zonder Electron, voor de vierde speler (er mogen maar 3 Electron-instanties
// tegelijk draaien). Praat hetzelfde protocol als het spel (net/session.js ClientSession) over dezelfde TCP-route als
// de Electron-gast (desktop/coopcore.cjs), met optioneel een netwerksimulatie: vertraging, jitter en pakketverlies,
// in beide richtingen. Houdt bij wat hij ziet (snapshots, gebeurtenissen, status) zodat de testbank dat kan beoordelen.
//   const g = await startMockGuest({ stage, code, wens: 'bram', net: { latency: 0.08, jitter: 0.03, loss: 0.05 } });
//   g.input = (t) => ({ mx: 1, my: 0, run: false, yaw: 0 });   // t = seconden sinds de start
//   g.stop();
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const { createCoopCore } = require(path.join(ROOT, 'desktop', 'coopcore.cjs'));
const { ClientSession, PROTO } = await import(pathToFileURL(path.join(ROOT, 'game', 'js', 'net', 'session.js')).href);
const { makeRng } = await import(pathToFileURL(path.join(ROOT, 'game', 'js', 'net', 'memtransport.js')).href);

// Een transport bovenop de coopcore van deze checkout, met netwerksimulatie. De simulatie zit tussen de socket en de sessie.
function makeTransport(core, hook, sim, rng) {
  const tr = { onmessage: null, onstate: null, open: false, id: 0, sent: 0, dropped: 0, recv: 0, droppedIn: 0, bytesIn: 0, bytesOut: 0 };
  const later = (f, delay) => (delay > 0 ? setTimeout(f, delay * 1000) : f());
  const delayOf = () => (sim.latency || 0) + rng() * (sim.jitter || 0);
  tr.isOpen = () => tr.open;
  tr.send = (bytes) => {
    if (!tr.open || sim.cut) return false;
    tr.sent++; tr.bytesOut += bytes.length;
    if (rng() < (sim.loss || 0)) { tr.dropped++; return true; }
    later(() => { if (tr.open && !sim.cut) core.send(0, bytes); }, delayOf());
    return true;
  };
  tr.close = () => { tr.open = false; core.close(0); };
  hook.fn = (kind, payload) => {
    if (!payload || payload.id !== 0) return;
    if (kind === 'state') { tr.open = payload.state === 'open'; if (tr.onstate) tr.onstate(payload.state); }
    else if (kind === 'msg') {
      tr.recv++; tr.bytesIn += (payload.data && payload.data.length) || 0;
      if (sim.cut) return;
      if (rng() < (sim.loss || 0)) { tr.droppedIn++; return; }
      const data = new Uint8Array(payload.data);
      later(() => { if (tr.onmessage) tr.onmessage(data); }, delayOf());
    }
  };
  return tr;
}

// opts: { stage, code, wens, wachtwoord, net: {latency, jitter, loss}, info: {tiles, story}, seed }
export async function startMockGuest(opts) {
  const sim = { ...(opts.net || {}) };
  const rng = makeRng(opts.seed || 7);
  const hook = { fn: null };
  const core = createCoopCore({ gameDir: path.join(opts.stage || path.join(ROOT, 'game')), emit: (k, p) => { if (hook.fn) hook.fn(k, p); }, localIp: '127.0.0.1', upnp: false });
  const tr = makeTransport(core, hook, sim, rng);
  const { VERSION } = await import(pathToFileURL(path.join(opts.stage || path.join(ROOT, 'game'), 'js', 'version.js')).href);
  const info = { game: 'gde', proto: PROTO, version: String(VERSION), tiles: String((opts.info && opts.info.tiles) || '-'), story: String((opts.info && opts.info.story) || 'nieuw'), char: opts.wens || undefined, ...(opts.wachtwoord ? { wachtwoord: String(opts.wachtwoord).slice(0, 32) } : null) };
  const session = new ClientSession(tr, { info, caps: ['scene', 'spelers'], token: opts.token || undefined });
  const log = { status: [], events: [], samples: [], resync: 0 };
  const kort = (l) => { if (opts.maxLog && l.length > opts.maxLog) l.splice(0, l.length - opts.maxLog); }; // een duurtest houdt niet alles bij
  session.onstatus = (s) => { log.status.push([+session.now.toFixed(2), s]); kort(log.status); };
  session.onevent = (b) => { log.events.push([+session.now.toFixed(2), b]); kort(log.events); };
  session.onresync = (st) => { log.resync++; log.lastResync = st; };
  const r = await core.join(opts.code);
  if (!r.ok) throw new Error('mockgast kan niet verbinden: ' + (r.reason || r.text));
  const g = { session, transport: tr, sim, log, input: null, core, t0: Date.now(), stopped: false };
  let last = Date.now();
  g.timer = setInterval(() => {
    const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    const t = (now - g.t0) / 1000;
    const i = g.input ? g.input(t) : { mx: 0, my: 0, run: false, yaw: 0 };
    session.setInput(i.mx || 0, i.my || 0, i.buttons != null ? i.buttons : i.run ? 1 : 0, i.yaw || 0); // buttons: de knoppenbyte zelf (4 springen, 8 bukken, #434)
    session.tick(dt);
    const w = session.world();
    if (w && (log.samples.length === 0 || t - log.samples[log.samples.length - 1].t >= 1)) { kort(log.samples); log.samples.push({ t: +t.toFixed(1), status: session.status, slot: session.slot, hostT: +w.hostT.toFixed(2), players: w.players.map((p) => ({ slot: p.slot, x: +p.x.toFixed(1), y: +p.y.toFixed(1) })), shared: w.shared, mission: w.mission, entities: w.entities.length }); }
  }, 1000 / 60);
  g.stop = async () => { g.stopped = true; clearInterval(g.timer); try { session.leave(); } catch (e) { /* al weg */ } await new Promise((res) => setTimeout(res, 200)); try { await core.stop(); } catch (e) { /* al weg */ } };
  // een tijdelijke verbreking van het netwerk (kabel eruit) of herstel
  g.cut = () => { sim.cut = true; };
  g.restore = () => { sim.cut = false; };
  g.last = () => log.samples[log.samples.length - 1] || null;
  return g;
}
