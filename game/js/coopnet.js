// Samen spelen (#95): koppelt de netwerksessie (net/session.js) aan de wereld, in
// de stijl van Watch Dogs 2. Je kunt op elk moment iemand uitnodigen (host) of
// aansluiten (gast), zonder keuze per save. De host simuleert en bewaart zijn
// eigen spel zoals altijd; de gast houdt zijn EIGEN voortgang: zijn geld, spullen
// en prestaties blijven van hem, de sessie schrijft zijn save niet, en bij
// vertrek komt hij terug op de plek waar hij was. Vaste personages: host =
// Tammo, gast = Tessa. Alleen actief na startHost()/startClient(), dus alleen
// na een bewuste uitnodiging. NIET in een echt spel gezien; het verhaal, de
// missies en de voertuigen van de host zijn er voor de gast nog niet bij.

import { HostSession, ClientSession } from './net/session.js';
import { VERSION } from './version.js';
import { setFixedCharacters, applyHostState, makeClientInput } from './coopclient.js';
import { bindCoop } from './coopglue.js';
import { partnerInfo, createPings, addPing, tickPings, pingEvent } from './partnerhud.js';

export const CAPS = ['scene']; // wat dit spel kent; uitbreidbaar (net/session.js negotiate)
export const REMOVE_DELAY = 0.5; // s tussen "je bent verwijderd" en het verbreken
export const MAX_REWARD = 1000000;

// De tegelhash komt van de aanroeper (manifest van de wereld); story = verhaalboog.
export function handshakeInfo({ tiles, story }) {
  return { game: 'gde', proto: 1, version: String(VERSION), tiles: String(tiles), story: String(story) };
}

// Kan deze speler nu aansluiten? De gast verlaat zijn wereld, dus niet midden in iets.
export function canJoin(world) {
  const p = world && world.player;
  if (!p) return { ok: false, reason: 'Het spel is nog niet klaar.' };
  if (p.inVehicle) return { ok: false, reason: 'Stap eerst uit je voertuig.' };
  if (world.pigeonMode) return { ok: false, reason: 'Stop eerst met de duif-modus.' };
  if (world.cameraOverride || world.pendingRespawn || p.ragdoll) return { ok: false, reason: 'Wacht tot het filmpje of het herstel klaar is.' };
  return { ok: true };
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
    fullState() { return { wanted: world.wanted | 0 }; }, // het geld van de host is van de host
  };
}

function prepareCoop(world) {
  if (!world.coop) bindCoop(world, world.input);
  world.coopPings = world.coopPings || createPings();
}
function endCoop(world) {
  if (world.coop) { world.coop.remote = false; world.coop.remoteInput = null; world.coop.fixedChars = false; if (world.coop.prevLocal !== undefined) { world.coop.local = world.coop.prevLocal; world.coop.prevLocal = undefined; } }
  world.coopPartner = null;
}

export function startHost(world, transport, info, seed = 1, { onHold = null, fade = null, route = null } = {}) {
  const session = new HostSession(transport, { info, seed, sim: hostSim(world), caps: CAPS });
  prepareCoop(world);
  world.coop.prevLocal = world.coop.local !== false; world.coop.local = false; // in een sessie stuurt de gast, niet het toetsenbord
  // verbinding weg: het spel pauzeert en wacht (onHold toont het scherm met 'Opnieuw verbinden' en 'Alleen verder')
  session.onlost = () => { world.coop.remote = false; world.coop.remoteInput = null; if (onHold) onHold('host'); };
  session.onrelease = () => { world.coop.remote = false; world.coop.remoteInput = null; };
  session.onjoin = () => { if (fade) fade('in'); }; // de gast komt met een korte fade naast je staan
  session.onevent = (b) => handleEvent(world, b);
  setFixedCharacters(world, 'host');
  world.coopRole = 'host';
  world.coopNet = { role: 'host', session, fade, route };
  return session;
}

export function startClient(world, transport, info, { onHold = null, fade = null, route = null } = {}) {
  const ok = canJoin(world);
  if (!ok.ok) throw new Error(ok.reason);
  const session = new ClientSession(transport, { info, caps: CAPS });
  prepareCoop(world);
  const p = world.player;
  // eigen toestand bewaren: bij vertrek komt de gast hier weer terug
  const stash = { x: p.x, y: p.y, angle: p.angle, vx: 0, vy: 0, wanted: world.wanted | 0, character: p.character, companion: world.companion ? { x: world.companion.x, y: world.companion.y, character: world.companion.character } : null, prevLocal: world.coop.local !== false };
  world.coop.local = false;
  session.onlost = () => { if (onHold) onHold('client'); };
  session.onevent = (b) => handleEvent(world, b);
  setFixedCharacters(world, 'client');
  world.coopRole = 'client';
  world.coopNet = { role: 'client', session, stash, fade, joined: false, route };
  return session;
}

// Per frame vanuit de hoofdlus (alleen als world.coopNet bestaat).
export function tickCoopNet(world, dt) {
  const n = world.coopNet; if (!n || !n.session) return;
  if (world.coopPings) tickPings(world.coopPings, now(world));
  if (n.removing != null) { n.removing -= dt; if (n.removing <= 0) { stopCoopNet(world); return; } }
  if (n.role === 'client') {
    const inp = world.input;
    const axis = inp && inp.axis ? inp.axis() : [0, 0];
    const run = !!(inp && inp.isDown && inp.isDown('shift'));
    const m = makeClientInput(axis, run, world.camYaw);
    n.session.setInput(m.mx, m.my, m.buttons, m.yaw);
    n.session.tick(dt);
    if (n.session.status === 'ok' || n.session.status === 'lag') {
      const sample = n.session.world();
      if (sample && !n.joined) { n.joined = true; if (n.fade) n.fade('in'); }
      applyHostState(world, 'client', sample);
      world.coopPartner = partnerInfo('gast', sample && sample.players.find((p) => p.slot === 0), n.session.status);
    }
    return;
  }
  n.session.tick(dt);
  const c = world.companion;
  world.coopPartner = partnerInfo('host', c ? { x: c.x, y: c.y, angle: c.angle, alive: true, inVeh: !!c.inVehicle } : null, n.session.status === 'ok' ? 'ok' : n.session.status);
}

const now = (world) => (Number.isFinite(world.time) ? world.time : Date.now() / 1000);

// ---------------------------------------------------------------- gebeurtenissen tussen de twee spelers
// Alles wat van de ander komt wordt gecontroleerd; onbekende soorten worden genegeerd (uitbreidbaar).
export function handleEvent(world, body) {
  if (!body || typeof body !== 'object') return false;
  const n = world.coopNet;
  switch (body.k) {
    case 'ping': return !!(world.coopPings && addPing(world.coopPings, { x: body.x, y: body.y, soort: body.soort, van: 'ander' }, now(world)));
    case 'beloning': { // alleen de host mag de gast betalen; het geld is van de gast
      if (!n || n.role !== 'client') return false;
      const geld = Math.floor(Number(body.geld));
      if (!Number.isFinite(geld) || geld <= 0) return false;
      world.money = (world.money || 0) + Math.min(geld, MAX_REWARD);
      if (world.addMessage) world.addMessage(`Beloning: €${Math.min(geld, MAX_REWARD).toLocaleString('nl-NL')}`, 4);
      return true;
    }
    case 'weg': // de host heeft de gast verwijderd
      if (!n || n.role !== 'client') return false;
      if (world.addMessage) world.addMessage('Je bent uit het spel van de host gehaald.', 4);
      stopCoopNet(world);
      return true;
    default: return false;
  }
}
export function sendPing(world, x, y, soort = 'hier') {
  const n = world.coopNet; if (!n || !world.coopPings) return false;
  if (!addPing(world.coopPings, { x, y, soort, van: 'eigen' }, now(world))) return false;
  return n.role === 'host' ? n.session.announce(pingEvent(x, y, soort)) : n.session.sendEvent(pingEvent(x, y, soort));
}
// Host: beloning voor de gast na een samen gedane opdracht; de gast bewaart hem in zijn eigen save.
export function payGuest(world, geld) {
  const n = world.coopNet; if (!n || n.role !== 'host') return false;
  return n.session.announce({ k: 'beloning', geld: Math.max(0, Math.floor(geld)) });
}
// Host: gast verwijderen (eerst een bericht, dan verbreken).
export function removeGuest(world) {
  const n = world.coopNet; if (!n || n.role !== 'host') return false;
  n.session.announce({ k: 'weg', reden: 'verwijderd' });
  n.removing = REMOVE_DELAY; return true;
}

// Verlaten. Gast: terug naar de eigen plek en eigen toestand, saven mag weer. Host: alleen verder.
export function stopCoopNet(world) {
  const n = world.coopNet; if (!n) return;
  try { n.session.leave(); } catch (e) { /* al weg */ }
  world.coopNet = null;
  if (n.role === 'client' && n.stash) {
    const s = n.stash, p = world.player;
    p.x = s.x; p.y = s.y; p.angle = s.angle; if (p.vx !== undefined) { p.vx = 0; p.vy = 0; }
    world.wanted = s.wanted;
    p.character = s.character;
    if (world.companion && s.companion) { world.companion.x = s.companion.x; world.companion.y = s.companion.y; world.companion.character = s.companion.character; }
    if (world.coop) world.coop.prevLocal = s.prevLocal;
    if (n.fade) n.fade('uit');
  }
  endCoop(world);
  world.coopRole = null; // eigen save mag weer (gast: met zijn eigen voortgang)
}
