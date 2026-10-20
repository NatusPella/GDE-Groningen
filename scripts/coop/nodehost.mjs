// Coöp-testbank (#95): een gescripte host zonder Electron, voor wie alleen de kant van de GAST in beeld wil
// bekijken met één Electron-instantie. De host draait de echte koppeling (coopnet.js: hub, sessies, snapshots,
// berichten) op een nep-wereld en luistert op dezelfde TCP-route (desktop/coopcore.cjs) als de app. Een Electron-gast
// verbindt er gewoon mee. Het draaiboek (script) beweegt Tammo, voertuigen en voetgangers, zet een opdracht, een
// filmpje, een keuze, pauze, wanted en een passagier in het spel, en betaalt de gast.
//   const h = await startNodeHost({ stage });   // h.code, h.world, h.step(), h.stop()
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const { createCoopCore } = require(path.join(ROOT, 'desktop', 'coopcore.cjs'));
const imp = (f) => import(pathToFileURL(path.join(ROOT, 'game', 'js', f)).href);

export const START = { x: -1287, y: -1066 }; // de startplek van een nieuw spel (voor de tegels van de gast)

export async function startNodeHost({ stage, tiles = '-', story = 'nieuw', max = 4 }) {
  const N = await imp('coopnet.js');
  const { listenForGuests } = await imp('net/ipctransport.js');
  const { coopStep } = await imp('coopglue.js');
  const { VERSION } = await import(pathToFileURL(path.join(stage, 'js', 'version.js')).href);
  const info = N.handshakeInfo({ tiles, story });
  info.version = String(VERSION); // dezelfde versie als de gestagede game van de gast
  const state = { filmpje: false, pauze: false, regel: null, keuze: null };
  const world = {
    player: { x: START.x + 4, y: START.y, angle: 0, character: 'tammo', vx: 0, vy: 0, inVehicle: null },
    companion: { x: START.x, y: START.y + 2, angle: 0, character: 'anita', vx: 0, vy: 0, inVehicle: null },
    coop: { local: true }, money: 500, wanted: 0, clock: 17.5, camYaw: 0, time: 0, paused: false, messages: [], addMessage(m) { this.messages.push(m); },
    input: { axis: () => [0, 0], isDown: () => false }, vehicles: [], pedestrians: [], mission: { phase: 'idle' },
  };
  // een paar voertuigen en voetgangers in de buurt (de gast tekent ze als blokken en poppetjes)
  for (let i = 0; i < 6; i++) world.vehicles.push({ id: 100 + i, x: START.x + 15 + i * 9, y: START.y - 8 + (i % 2) * 14, angle: i % 2 ? Math.PI : 0, model: { len: i === 3 ? 11 : 4.2 }, isBus: i === 3 });
  for (let i = 0; i < 14; i++) world.pedestrians.push({ x: START.x - 10 + i * 3, y: START.y + 6 + (i % 3) * 3, angle: i, state: 'wander', health: 30, isCop: i === 2 });
  const hostInfo = { ...info };
  N.startHost(world, hostInfo, { seed: 9, max, scene: () => ({ ...state }) });

  // de TCP-kant van de app achter dezelfde ipc-brug als in Electron
  const listeners = new Set();
  const core = createCoopCore({ gameDir: stage, emit: (k, p) => { for (const f of [...listeners]) f(k, p); }, localIp: '127.0.0.1', upnp: false });
  const api = { send: (id, b) => core.send(id, b), close: (id) => core.close(id), onEvent: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } };
  listenForGuests(api, (tr) => N.addGuest(world, tr));
  const hosted = await core.host({ max });

  const h = { code: hosted.code, world, state, core, N, t: 0, log: [], timers: [] };
  // Tammo loopt rondjes; de voertuigen rijden heen en weer; Tessa wordt door de gast bestuurd (coopStep), of rijdt mee als passagier
  const move = (c, dt) => { c.x += c.vx * dt; c.y += c.vy * dt; };
  h.drive = null; // { car, until } : de host rijdt een stuk met Tessa als passagier
  let last = Date.now();
  h.timer = setInterval(() => {
    const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    h.t += dt; world.time += dt; world.clock = (world.clock + dt / 120) % 24;
    const p = world.player;
    if (h.drive) { // in het voertuig: rijdt rechtdoor
      const car = h.drive.car; car.x += Math.cos(car.angle) * 9 * dt; car.y += Math.sin(car.angle) * 9 * dt; p.x = car.x; p.y = car.y; p.angle = car.angle;
    } else if (h.walk) { p.x = START.x + 4 + Math.cos(h.t / 4) * 6; p.y = START.y + Math.sin(h.t / 4) * 6; p.angle = h.t / 4 + Math.PI / 2; }
    for (const v of world.vehicles) { if (v.id === 100 + 99) continue; v.x += Math.cos(v.angle) * 4 * dt; if (Math.abs(v.x - START.x) > 90) v.angle += Math.PI; }
    for (const q of world.pedestrians) { q.x += Math.cos(q.angle) * 0.8 * dt; q.y += Math.sin(q.angle) * 0.8 * dt; q.angle += 0.2 * dt; }
    if (!world.companion.inVehicle) coopStep(world.companion, dt, world, move); // de gast bestuurt Tessa
    world.paused = state.pauze;
    N.tickCoopNet(world, dt);
  }, 16);
  h.walk = true;
  // een voertuig voor de rit: Tammo stapt in, Tessa (de gast) rijdt mee en haar eigen x en y blijven staan zoals in het spel
  h.rit = (aan) => {
    const w = world;
    if (aan) {
      const car = { id: 199, x: w.player.x + 3, y: w.player.y, angle: 0, model: { len: 4.2 } };
      w.vehicles.push(car); h.drive = { car }; h.walk = false;
      w.player.inVehicle = car; w.companion.inVehicle = car; // de metgezel behoudt zijn oude x en y
    } else if (h.drive) {
      const car = h.drive.car; w.player.inVehicle = null; w.companion.inVehicle = null; w.companion.x = car.x - 2; w.companion.y = car.y + 2;
      w.vehicles = w.vehicles.filter((v) => v !== car); h.drive = null; h.walk = true;
    }
  };
  h.mission = (m) => { world.mission = m || { phase: 'idle' }; };
  h.pay = (geld, slot = 1) => N.payGuest(world, geld, slot);
  h.at = (sec, fn) => { const t = setTimeout(async () => { try { await fn(h); } catch (e) { h.log.push('fout ' + e.message); } }, sec * 1000); h.timers.push(t); return t; };
  h.roster = () => (world.coopRoster || []).map((r) => [r.slot, r.verbinding]);
  h.stop = async () => { clearInterval(h.timer); for (const t of h.timers) clearTimeout(t); try { N.stopCoopNet(world); } catch (e) { /* al weg */ } await new Promise((r) => setTimeout(r, 600)); try { await core.stop(); } catch (e) { /* al weg */ } };
  return h;
}
