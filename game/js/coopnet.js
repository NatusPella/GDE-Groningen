// Coöp fase 4/5 (#95): koppelt de netwerksessie (net/session.js) aan de wereld,
// alleen aan de HOST-kant. De gast stuurt de metgezel (speler 2) via invoer;
// de host simuleert en stuurt toestand terug. De CLIENT-kant (toestand van de
// host op het eigen scherm tonen) is nog niet gebouwd. Niet in een echt spel
// getest. Alleen actief na startHost(), dus alleen na een bewuste menukeuze.

import { HostSession } from './net/session.js';
import { VERSION } from './version.js';

// Hash over de tegels/verhaal: de echte waarden komen van de aanroeper
// (manifesthash en STEPS-hash), zodat dit bestand geen wereld hoeft te kennen.
export function handshakeInfo({ tiles, story }) {
  return { game: 'gde', proto: 1, version: String(VERSION), tiles: String(tiles), story: String(story) };
}

// sim-adapter voor de host: leest en schrijft alleen via world.coop en de twee lichamen
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

// Start de host-sessie op een geopend transport.
export function startHost(world, transport, info, seed = 1) {
  const session = new HostSession(transport, { info, seed, sim: hostSim(world) });
  // verbinding weg: de volg-AI van de metgezel neemt het weer over (companion.js)
  session.onlost = () => { if (world.coop) { world.coop.remote = false; world.coop.remoteInput = null; } };
  world.coopNet = { role: 'host', session };
  return session;
}

// Per frame vanuit de hoofdlus (alleen als world.coopNet bestaat).
export function tickCoopNet(world, dt) {
  const n = world.coopNet; if (n && n.session) n.session.tick(dt);
}
export function stopCoopNet(world) {
  const n = world.coopNet; if (!n) return;
  try { n.session.leave(); } catch (e) { /* al weg */ }
  if (world.coop) { world.coop.remote = false; world.coop.remoteInput = null; }
  world.coopNet = null;
}
