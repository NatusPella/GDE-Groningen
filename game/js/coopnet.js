// Coöp online (#95): koppelt de netwerksessie (net/session.js) aan de wereld.
// De host simuleert en bewaart (coöp-save); de gast stuurt invoer en toont de
// toestand van de host. Vaste personages: host = Tammo, gast = Tessa.
// Alleen actief na startHost()/startClient(), dus alleen na een bewuste
// menukeuze. NIET in een echt spel gezien; het verhaal en de missies van de
// gast volgen de host nog niet (alleen posities, geld en wanted).

import { HostSession, ClientSession } from './net/session.js';
import { VERSION } from './version.js';
import { setFixedCharacters, applyHostState, makeClientInput } from './coopclient.js';
import { toCoopSave, readCoopSave, writeCoopSave } from './coopsave.js';

export const CAPS = ['scene']; // wat dit spel kent; uitbreidbaar (net/session.js negotiate)
export const AUTOSAVE_EVERY = 30; // seconden

// De tegelhash komt van de aanroeper (manifest van de wereld); story = verhaalboog.
export function handshakeInfo({ tiles, story }) {
  return { game: 'gde', proto: 1, version: String(VERSION), tiles: String(tiles), story: String(story) };
}

// sim-adapter voor de host
export function hostSim(world) {
  return {
    applyInput(slot, input) {
      if (slot !== 1 || !world.coop) return;
      world.coop.remote = true; world.coop.remoteInput = input;
    },
    snapshot() {
      const p = world.player, c = world.companion;
      const body = (b, slot) => b && ({ slot, x: b.x, y: b.y, z: b.z || 0, angle: b.angle || 0, alive: true, inVeh: !!b.inVehicle, driver: false, run: false, health: 100, vehicle: null });
      return {
        players: [body(p, 0), body(c, 1)].filter(Boolean),
        shared: { money: world.money || 0, wanted: world.wanted | 0, clock: Number(world.time) || 0 },
        mission: { stage: 0, state: 'none', present: 3 },
        entities: [],
      };
    },
    fullState() { return { money: world.money || 0, wanted: world.wanted | 0 }; },
  };
}

export function startHost(world, transport, info, seed = 1, { storage = null, getStory = null } = {}) {
  const session = new HostSession(transport, { info, seed, sim: hostSim(world), caps: CAPS });
  // verbinding weg: de volg-AI van de metgezel neemt het weer over (companion.js)
  session.onlost = () => { if (world.coop) { world.coop.remote = false; world.coop.remoteInput = null; } };
  session.onrelease = session.onlost;
  if (world.coop) setFixedCharacters(world, 'host');
  world.coopNet = { role: 'host', session, saveAcc: 0, storage, getStory };
  return session;
}

export function startClient(world, transport, info) {
  const session = new ClientSession(transport, { info, caps: CAPS });
  if (world.coop) setFixedCharacters(world, 'client');
  world.coopNet = { role: 'client', session };
  return session;
}

// Per frame vanuit de hoofdlus (alleen als world.coopNet bestaat).
export function tickCoopNet(world, dt) {
  const n = world.coopNet; if (!n || !n.session) return;
  if (n.role === 'client') {
    const inp = world.input;
    const axis = inp && inp.axis ? inp.axis() : [0, 0];
    const run = !!(inp && inp.isDown && inp.isDown('shift'));
    const m = makeClientInput(axis, run, world.camYaw);
    n.session.setInput(m.mx, m.my, m.buttons, m.yaw);
    n.session.tick(dt);
    if (n.session.status === 'ok' || n.session.status === 'lag') applyHostState(world, 'client', n.session.world());
    return;
  }
  n.session.tick(dt);
  if (n.storage && n.session.status === 'ok') { // de host bewaart de gedeelde voortgang
    n.saveAcc += dt;
    if (n.saveAcc >= AUTOSAVE_EVERY) { n.saveAcc = 0; saveCoop(world, n.storage, n.getStory ? n.getStory() : undefined); }
  }
}

// Coöp-save schrijven (alleen host of lokaal). story = getStorySave() van de aanroeper.
export function saveCoop(world, storage, story) {
  const prev = readCoopSave(storage);
  const save = toCoopSave(prev, { story, shared: { money: world.money || 0, wanted: world.wanted | 0 } }, Date.now());
  return writeCoopSave(storage, save);
}

export function stopCoopNet(world) {
  const n = world.coopNet; if (!n) return;
  try { n.session.leave(); } catch (e) { /* al weg */ }
  if (world.coop) { world.coop.remote = false; world.coop.remoteInput = null; }
  world.coopNet = null;
}
