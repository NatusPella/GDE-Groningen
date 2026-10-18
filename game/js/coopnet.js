// Coöp online (#95): koppelt de netwerksessie (net/session.js) aan de wereld.
// De host simuleert en bewaart (de ene save); de gast stuurt invoer en toont de
// toestand van de host. Vaste personages: host = Tammo, gast = Tessa.
// Alleen actief na startHost()/startClient(), dus alleen na een bewuste
// menukeuze. NIET in een echt spel gezien; het verhaal en de missies van de
// gast volgen de host nog niet (alleen posities, geld en wanted).

import { HostSession, ClientSession } from './net/session.js';
import { VERSION } from './version.js';
import { setFixedCharacters, applyHostState, makeClientInput } from './coopclient.js';

export const CAPS = ['scene']; // wat dit spel kent; uitbreidbaar (net/session.js negotiate)

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

export function startHost(world, transport, info, seed = 1, { onHold = null } = {}) {
  const session = new HostSession(transport, { info, seed, sim: hostSim(world), caps: CAPS });
  // verbinding weg: het spel pauzeert en wacht (onHold toont het scherm met 'Opnieuw verbinden' en 'Alleen verder')
  session.onlost = () => { if (world.coop) { world.coop.remote = false; world.coop.remoteInput = null; } if (onHold) onHold('host'); };
  session.onrelease = () => { if (world.coop) { world.coop.remote = false; world.coop.remoteInput = null; } };
  if (world.coop) setFixedCharacters(world, 'host');
  world.coopRole = 'host';
  world.coopNet = { role: 'host', session };
  return session;
}

export function startClient(world, transport, info, { onHold = null } = {}) {
  const session = new ClientSession(transport, { info, caps: CAPS });
  session.onlost = () => { if (onHold) onHold('client'); };
  if (world.coop) setFixedCharacters(world, 'client');
  world.coopRole = 'client';
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
}

export function stopCoopNet(world) {
  const n = world.coopNet; if (!n) return;
  try { n.session.leave(); } catch (e) { /* al weg */ }
  if (world.coop) { world.coop.remote = false; world.coop.remoteInput = null; }
  world.coopNet = null;
  if (n.role !== 'client') world.coopRole = null; // een gast bewaart het verhaal niet, ook niet na stoppen
}
