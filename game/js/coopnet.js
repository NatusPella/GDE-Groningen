// Samen spelen (#95): koppelt de netwerksessie (net/hub.js, net/session.js) aan de
// wereld, in de stijl van Watch Dogs 2, voor N spelers (minimaal 4, tot 8). Je kunt
// op elk moment iemand uitnodigen (host) of aansluiten (gast). De host (Tammo)
// simuleert en bewaart zijn eigen spel zoals altijd; de eerste gast is Tessa;
// extra spelers zijn eigen figuren zonder hoofdrol in het verhaal. Iedere gast
// houdt zijn EIGEN voortgang: zijn geld, spullen en prestaties blijven van hem,
// de sessie schrijft zijn save niet en bij vertrek komt hij terug op zijn eigen
// plek. NIET in een echt spel gezien: het verhaal, de missies en de voertuigen
// van de host zijn er voor gasten nog niet bij, en extra figuren hebben nog geen
// model in de wereld (ze bestaan als gegevens en in de snapshots).

import { ClientSession } from './net/session.js';
import { HostHub } from './net/hub.js';
import { VERSION } from './version.js';
import { setFixedCharacters, applyHostState, makeClientInput, ensureFigure, removeFigure, figures } from './coopclient.js';
import { bindCoop } from './coopglue.js';
import { partnersInfo, createPings, addPing, tickPings, pingEvent } from './partnerhud.js';
import { holdBeleid, leesLijstEvent, lijst } from './coopplayers.js';
import { cameraRelative, stepSlot2, sharedCamera } from './coop.js';
import { nieuwCutVerzamelaar, cutGastSpeel, cutGastStop, leesCutTijd, cutSpoor } from './coopcut.js';
import { verzamelEntiteiten, leesEntiteiten, missieBericht, leesMissieBericht, missieTekst, sceneBericht, leesSceneBericht, sceneLeeg, FILMPJE_TEKST } from './coopworld.js';
import { verhaalRol } from './coopplayers.js';
import { KLOK_EVERY, klokEvent, leesKlokEvent, KlokVolger } from './net/speelklok.js';
import { HASH_EVERY, viewOf, hashEvent, leesHashEvent, DesyncMonitor } from './net/desync.js';

export const CAPS = ['scene', 'spelers']; // wat dit spel kent; uitbreidbaar (net/session.js negotiate)
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

// Een passagier (de metgezel in het voertuig van de host) behoudt zijn eigen x en y van vóór het instappen; zijn plek is die van het voertuig.
const posOf = (b) => (b && b.inVehicle && Number.isFinite(b.inVehicle.x) && Number.isFinite(b.inVehicle.y) ? b.inVehicle : b);

// sim-adapter voor de host: plek 0 = world.player, plek 1 = world.companion, plek 2+ = figuren
export function hostSim(world, roster) {
  return {
    applyInput(slot, input) {
      if (!world.coop || slot < 1) return;
      if (slot === 1) { world.coop.remote = true; world.coop.remoteInput = input; return; }
      const f = ensureFigure(world, slot, null); f.input = input;
    },
    snapshot() {
      const p = world.player, c = world.companion;
      const body = (b, slot) => { const q = posOf(b); return b && ({ slot, x: q.x, y: q.y, z: b.z || 0, angle: q.angle || 0, alive: true, inVeh: !!b.inVehicle, driver: false, run: false, health: 100, vehicle: null }); };
      const players = [body(p, 0), body(c, 1)];
      for (const s of roster().spelers) if (s.slot >= 2) players.push(body(figures(world)[s.slot], s.slot));
      return {
        players: players.filter(Boolean),
        shared: { money: world.money || 0, wanted: world.wanted | 0, clock: Number(world.time) || 0 },
        mission: { stage: (world.mission && world.mission.index) | 0, state: world.mission && world.mission.phase === 'active' ? 'run' : 'none', present: 3 },
        // voertuigen dicht bij een speler en het doel van de opdracht: de gasten zien de wereld van de host
        entities: verzamelEntiteiten(world, players.filter(Boolean)),
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
  world.coopPartner = null; world.coopPartners = []; world.coopRoster = null; world.coopFigures = {}; world.coopHost = null; world.coopHostMissie = null; world.coopCam = null; world.coopScene = null;
}
const now = (world) => (Number.isFinite(world.time) ? world.time : Date.now() / 1000);

// De gedeelde toestand zoals de host hem ziet en zoals een gast hem uit de snapshots opbouwt (net/desync.js)
export function hostView(world, info, roster) {
  const m = world.mission;
  return viewOf({ story: info.story, tiles: info.tiles, stage: (m && m.index) | 0, state: m && m.phase === 'active' ? 'run' : 'none', wanted: world.wanted | 0, slots: [0, 1, ...roster.spelers.filter((s) => s.slot >= 2).map((s) => s.slot)] });
}
export function guestView(sample, info) {
  const mi = sample.mission || {};
  return viewOf({ story: info.story, tiles: info.tiles, stage: mi.stage, state: mi.state, wanted: sample.shared ? sample.shared.wanted : 0, slots: sample.players.map((p) => p.slot) });
}

// ---------------------------------------------------------------- host
// opts: { seed, max (4 tot 8), onHold(rol, slot, reden), fade, route, onChange(roster), scene() -> { filmpje, regel, keuze } (wat de host op het scherm heeft, coopscene.js) }
export function startHost(world, info, opts = {}) {
  prepareCoop(world);
  world.coop.prevLocal = world.coop.local !== false; world.coop.local = false; // in een sessie sturen de gasten, niet het toetsenbord
  const { onHold = null, fade = null, route = null, onChange = null, scene = null } = opts;
  let hub;
  hub = new HostHub({
    info, seed: opts.seed ?? 1, max: opts.max, caps: CAPS, rand: opts.rand,
    sim: hostSim(world, () => hub.roster),
    onJoin: (slot, char) => {
      if (world.coopNet && world.coopNet.missie) hub.announce(missieBericht(null, world.mission).event || { k: 'missie', actief: false }, slot);
      if (world.coopNet && world.coopNet.sceneNu && !sceneLeeg(world.coopNet.sceneNu)) hub.announce({ k: 'scene', ...world.coopNet.sceneNu }, slot); // wie midden in een filmpje aansluit, hoort het meteen
      if (slot >= 2) { const f = ensureFigure(world, slot, char); f.x = world.player.x + 1.5 * (slot - 1); f.y = world.player.y + 1.5; }
      if (fade) fade('in'); // de gast komt met een korte fade naast je staan
    },
    onLeave: (slot) => {
      if (slot === 1 && world.coop) { world.coop.remote = false; world.coop.remoteInput = null; }
      if (slot >= 2) removeFigure(world, slot);
    },
    onLost: (slot) => {
      if (slot === 1 && world.coop) { world.coop.remote = false; world.coop.remoteInput = null; }
      const f = slot >= 2 ? figures(world)[slot] : null; if (f) f.input = null;
      // pauze per speler: Tessa houdt het spel op, een extra speler pas als de opdracht hem nodig heeft
      const beleid = holdBeleid(slot, { vereist: world.coopVereist || [] });
      if (beleid.pauze && onHold) onHold('host', slot, beleid.reden);
    },
    onEvent: (slot, body) => {
      handleEvent(world, body, slot);
      if (body && body.k === 'ping') for (const s of hub.roster.spelers) if (s.slot !== 0 && s.slot !== slot) hub.announce({ ...body, van: slot }, s.slot); // iedereen ziet elke ping
    },
  });
  hub.onchange = (roster) => { world.coopRoster = lijst(roster); if (onChange) onChange(roster); };
  setFixedCharacters(world, 0);
  world.coopRole = 'host';
  world.coopRoster = lijst(hub.roster);
  world.coopNet = { role: 'host', hub, fade, route, removing: {}, info, tKlok: 0, tHash: 0, hashN: 0, scene, tScene: 0, filmpjeT: 0, sceneNu: null };
  return hub;
}

// Een nieuwe gast op een geopend transport (kamercode of IP-adres).
export function addGuest(world, transport) {
  const n = world.coopNet; if (!n || n.role !== 'host') throw new Error('Er is geen uitnodiging open.');
  return n.hub.accept(transport);
}

// ---------------------------------------------------------------- gast
// opts: { onHold, fade, route, wens (gewenste figuur voor plek 2 en hoger) }
export function startClient(world, transport, info, opts = {}) {
  const ok = canJoin(world);
  if (!ok.ok) throw new Error(ok.reason);
  const { onHold = null, fade = null, route = null, wens = null } = opts;
  const session = new ClientSession(transport, { info: { ...info, char: wens || undefined }, caps: CAPS });
  prepareCoop(world);
  const p = world.player;
  // eigen toestand bewaren: bij vertrek komt de gast hier weer terug
  const stash = { x: p.x, y: p.y, angle: p.angle, wanted: world.wanted | 0, character: p.character, coopChar: p.coopChar, companion: world.companion ? { x: world.companion.x, y: world.companion.y, character: world.companion.character } : null, prevLocal: world.coop.local !== false };
  world.coop.local = false;
  session.onlost = () => { if (onHold) onHold('client', session.slot, 'De verbinding met de gastheer is weg.'); };
  session.onevent = (b) => handleEvent(world, b, 0);
  // de host is de baas: bij een desync (net/desync.js) zet de gast zijn wanted weer gelijk aan dat van de host
  session.onresync = (st) => { if (st && Number.isFinite(st.wanted)) world.wanted = st.wanted | 0; };
  world.coopRole = 'client';
  world.coopNet = { role: 'client', session, stash, fade, joined: false, fixed: false, route, info, klok: new KlokVolger(), desync: new DesyncMonitor(), lokaal: 0 };
  return session;
}

// ---------------------------------------------------------------- elke frame
function stepFigures(world, dt) {
  const f = figures(world);
  for (const slot of Object.keys(f)) {
    const fig = f[slot];
    if (!fig.input) { fig.vx *= Math.max(0, 1 - 10 * dt); fig.vy *= Math.max(0, 1 - 10 * dt); continue; }
    const m = fig.input;
    const len = Math.hypot(m.mx, m.my), sx = len > 1 ? 1 / len : 1;
    const dir = cameraRelative({ x: m.mx * sx, y: m.my * sx, run: !!((m.buttons || 0) & 1), active: !!(m.mx || m.my) }, m.yaw || 0);
    stepSlot2(fig, dir, dt, null);
    if (world.coopMove) world.coopMove(fig, dt, world); // botsingen met gebouwen: companion.js zet deze haak
    else { fig.x += fig.vx * dt; fig.y += fig.vy * dt; }
  }
}

export function tickCoopNet(world, dt) {
  const n = world.coopNet; if (!n) return;
  if (world.coopPings) tickPings(world.coopPings, now(world));
  if (n.role === 'client') {
    const s = n.session;
    // afgewezen (sessie vol, andere versie) of de gastheer stopte (BYE): de gast speelt weer in zijn eigen spel. Zonder dit bleef hij 'gast' (zijn spel werd niet meer bewaard)
    // of stond zijn wereld stil op de laatste plek van de gastheer.
    if (s.status === 'geweigerd' || s.status === 'verbroken') {
      if (s.status === 'verbroken' && n.joined && world.addMessage) world.addMessage('De gastheer is gestopt met samen spelen. Je speelt weer in je eigen spel.', 5);
      if (s.status === 'geweigerd') world.coopWeigering = s.rejected || 'gesloten'; // wat de lobby al liet zien; ook voor tests
      stopCoopNet(world); return;
    }
    const inp = world.input;
    const m = makeClientInput(inp && inp.axis ? inp.axis() : [0, 0], !!(inp && inp.isDown && inp.isDown('shift')), world.camYaw);
    if (world.coopScene && world.coopScene.filmpje) s.setInput(0, 0, 0, m.yaw); // de gastheer kijkt een filmpje: Tessa staat stil
    else s.setInput(m.mx, m.my, m.buttons, m.yaw);
    s.tick(dt);
    n.lokaal += dt;
    // de gedeelde speelklok: de tijd van de dag volgt de host (net/speelklok.js)
    if (n.klok.last && Number.isFinite(world.clock)) world.clock = n.klok.step(world.clock, dt, n.lokaal);
    if (s.joined && !n.fixed) { // eerst weten we welke plek en figuur we hebben
      n.fixed = true; setFixedCharacters(world, s.slot, s.welcome && s.welcome.char);
      if (!n.rosterEvent && s.welcome && Array.isArray(s.welcome.lijst)) world.coopRoster = s.welcome.lijst; // een 'spelers'-bericht dat vóór het welkom aankwam is nieuwer
    }
    if (n.fixed && (s.status === 'ok' || s.status === 'lag')) {
      const sample = s.world();
      if (sample && !n.joined) { n.joined = true; if (n.fade) n.fade('in'); }
      applyHostState(world, s.slot, sample, world.coopRoster, dt);
      world.coopHost = sample ? leesEntiteiten(sample.entities) : { voertuigen: [], doelen: [], voetgangers: [] };
      world.coopPartners = partnersInfo(s.slot, sample ? sample.players : [], world.coopRoster || []);
      world.coopPartner = world.coopPartners[0] || null;
      world.coopCam = s.slot === 1 ? sharedCamera(world.player, world.companion) : null; // alleen Tessa deelt de camera met Tammo
    }
    return;
  }
  for (const [slot, t] of Object.entries(n.removing)) { n.removing[slot] = t - dt; if (n.removing[slot] <= 0) { delete n.removing[slot]; n.hub.release(+slot); } }
  n.hub.tick(dt);
  stepFigures(world, dt);
  n.tKlok += dt; n.tHash += dt;
  if (n.tKlok >= KLOK_EVERY) { n.tKlok = 0; n.hub.announce(klokEvent(world)); }
  if (n.tHash >= HASH_EVERY) { n.tHash = 0; n.hub.announce(hashEvent(++n.hashN, hostView(world, n.info, n.hub.roster))); }
  n.tScene += dt;
  if (n.scene && n.tScene >= 0.25) { // een filmpje, een regel, een keuze: voor de gasten
    const tScene = n.tScene; n.tScene = 0;
    let sc = null; try { sc = n.scene(); } catch (e) { sc = null; }
    n.filmpjeT = sc && sc.filmpje ? n.filmpjeT + tScene : 0;
    if (sc && sc.filmpje && n.filmpjeT < 0.7) sc = { ...sc, filmpje: false }; // een kort kaartje (zoals bij dood) is geen filmpje
    const r = sceneBericht(n.sceneNu, sc); n.sceneNu = r.huidig;
    if (r.event) n.hub.announce(r.event);
  }
  const mb = missieBericht(n.missie || null, world.mission); // wat de host speelt, voor de gasten
  if (mb.event) { n.hub.announce(mb.event); } n.missie = mb.huidig;
  const c = world.companion;
  const players = [c ? { slot: 1, x: posOf(c).x, y: posOf(c).y, angle: posOf(c).angle, alive: true, inVeh: !!c.inVehicle } : null, ...Object.values(figures(world)).map((f) => ({ slot: f.slot, x: f.x, y: f.y, angle: f.angle, alive: true }))].filter(Boolean);
  world.coopPartners = partnersInfo(0, players, world.coopRoster || []);
  world.coopPartner = world.coopPartners[0] || null;
  // gedeelde camera met Tessa (plek 1) zolang zij echt meespeelt; extra spelers hebben hun eigen camera
  const tessa = n.hub.roster.spelers.find((x) => x.slot === 1);
  world.coopCam = tessa && tessa.verbinding === 'ok' && world.coop && world.coop.remote ? sharedCamera(world.player, world.companion) : null;
}

// ---------------------------------------------------------------- gebeurtenissen tussen de spelers
// van = plek van de afzender (0 = host). Alles wat binnenkomt wordt gecontroleerd; onbekende soorten worden genegeerd.
export function handleEvent(world, body, van = 0) {
  if (!body || typeof body !== 'object') return false;
  const n = world.coopNet;
  switch (body.k) {
    case 'ping': { // de host stuurt door met 'van'; een gast stuurt zonder
      const afz = n && n.role === 'client' && Number.isInteger(body.van) ? body.van : van;
      return !!(world.coopPings && addPing(world.coopPings, { x: body.x, y: body.y, soort: body.soort, van: afz }, now(world)));
    }
    case 'missie': { // wat de host speelt; de gast ziet het als melding, extra spelers lopen mee in de open wereld
      if (!n || n.role !== 'client') return false;
      const m = leesMissieBericht(body); if (!m) return false;
      const slot = n.session ? n.session.slot : 1;
      const vorige = world.coopHostMissie;
      world.coopHostMissie = m;
      const nieuweOpdracht = !vorige || !vorige.actief || vorige.index !== m.index || vorige.label !== m.label;
      // een nieuwe opdracht: wat de gastheer speelt; daarna alleen nog de volgende stap
      const tekst = nieuweOpdracht ? missieTekst(m, verhaalRol(slot) === 'wereld' ? 'wereld' : 'hoofdrol') : (m.actief && m.stap ? `Gastheer, volgende stap: ${m.stap}` : '');
      if (tekst && world.addMessage) world.addMessage(tekst, 6);
      return true;
    }
    case 'scene': { // wat de host op het scherm heeft: filmpje, regel, keuze (alleen kijken)
      if (!n || n.role !== 'client') return false;
      const sc = leesSceneBericht(body); if (!sc) return false;
      const was = !!(world.coopScene && world.coopScene.filmpje);
      world.coopScene = sceneLeeg(sc) ? null : sc;
      if (sc.filmpje && !was && world.addMessage && world.coopCutBezig == null) world.addMessage(FILMPJE_TEKST, 4);
      return true;
    }
    case 'cut': { // de scène van de gastheer (coopcut.js): in stukjes; compleet = meteen mee afspelen
      if (!n || n.role !== 'client') return false;
      const v = n.cutVerzamelaar || (n.cutVerzamelaar = nieuwCutVerzamelaar());
      const p = v.voegToe(body); if (body.i === 0) cutSpoor(world, 'gast-stuk0', body.id, body.n); if (!p) return true;
      cutSpoor(world, 'gast-compleet', p.id);
      cutGastSpeel(world, p);
      return true;
    }
    case 'cuttijd': { // de tijd van de gastheer in zijn scène: de gast loopt mee (coopcut.js cutGastTempo)
      if (!n || n.role !== 'client') return false;
      const k = leesCutTijd(body); if (!k) return false;
      world.coopCutHost = { id: k.id, t: k.t, stil: k.stil, at: Date.now() };
      return true;
    }
    case 'cutend': { // de gastheer is klaar of slaat over
      if (!n || n.role !== 'client' || !Number.isInteger(body.id)) return false;
      if (n.cutVerzamelaar) n.cutVerzamelaar.reset();
      cutGastStop(world, body.id, !!body.skip);
      return true;
    }
    case 'spelers': { // alleen de host stuurt de lijst
      if (!n || n.role !== 'client') return false;
      const l = leesLijstEvent(body); if (!l) return false;
      n.rosterEvent = true;
      world.coopRoster = l.spelers.map((s) => ({ ...s })); return true;
    }
    case 'beloning': { // alleen de host mag de gast betalen; het geld is van de gast
      if (!n || n.role !== 'client') return false;
      const geld = Math.floor(Number(body.geld));
      if (!Number.isFinite(geld) || geld <= 0) return false;
      const betaald = Math.min(geld, MAX_REWARD);
      world.money = (world.money || 0) + betaald;
      world.coopVerdiend = (world.coopVerdiend || 0) + betaald; // savegame.js zet dit in de eigen save van de gast
      if (world.addMessage) world.addMessage(`Beloning: €${betaald.toLocaleString('nl-NL')}`, 4);
      return true;
    }
    case 'klok': { // de tijd van de dag van de host
      if (!n || n.role !== 'client') return false;
      const k = leesKlokEvent(body); return !!k && n.klok.observe(k, n.lokaal);
    }
    case 'hash': { // de host controleert of de gast hetzelfde ziet; bij drie afwijkingen achter elkaar vraagt de gast zijn toestand opnieuw
      if (!n || n.role !== 'client') return false;
      const h = leesHashEvent(body); const sample = n.session && n.session.world();
      if (!h || !sample) return false;
      const r = n.desync.check(h, guestView(sample, n.info));
      if (!r.ok) {
        world.coopDesync = { n: n.desync.total, velden: r.velden };
        if (r.alarm && typeof console !== 'undefined') console.warn('[coop] desync met de host: ' + r.velden.join(', '));
      }
      if (r.alarm) n.session.requestResync();
      return true;
    }
    case 'weg': // de host heeft deze speler verwijderd
      if (!n || n.role !== 'client') return false;
      if (world.addMessage) world.addMessage(body.reden === 'gastheer gestopt' ? 'De gastheer is gestopt met samen spelen. Je speelt weer in je eigen spel.' : 'Je bent uit het spel van de gastheer gehaald.', 4);
      stopCoopNet(world);
      return true;
    default: return false;
  }
}
export function sendPing(world, x, y, soort = 'hier') {
  const n = world.coopNet; if (!n || !world.coopPings) return false;
  if (!addPing(world.coopPings, { x, y, soort, van: 'eigen' }, now(world))) return false;
  return n.role === 'host' ? n.hub.announce({ ...pingEvent(x, y, soort), van: 0 }) : n.session.sendEvent(pingEvent(x, y, soort));
}
// Host: beloning voor één gast (slot) of voor alle gasten; elk bewaart hem in zijn eigen save.
export function payGuest(world, geld, slot = null) {
  const n = world.coopNet; if (!n || n.role !== 'host') return false;
  return n.hub.announce({ k: 'beloning', geld: Math.max(0, Math.floor(geld)) }, slot);
}
// Host: een speler verwijderen (eerst een bericht, dan verbreken).
export function removeGuest(world, slot = 1) {
  const n = world.coopNet; if (!n || n.role !== 'host') return false;
  if (!n.hub.kick(slot)) return false;
  n.removing[slot] = REMOVE_DELAY; return true;
}
export function setMaxPlayers(world, max) {
  const n = world.coopNet; if (!n || n.role !== 'host') return null;
  return n.hub.setMax(max);
}

// Verlaten. Gast: terug naar de eigen plek en eigen toestand, saven mag weer. Host: alleen verder; alle gasten gaan eruit.
export function stopCoopNet(world) {
  const n = world.coopNet; if (!n) return;
  if (world.coopCutBezig != null) cutGastStop(world, null, true); // een scène van de gastheer stopt met het samen spelen
  if (n.role === 'host') { try { n.hub.announce({ k: 'weg', reden: 'gastheer gestopt' }); n.hub.closeAll(); } catch (e) { /* al weg */ } } else { try { if (n.session.status !== 'geweigerd' && n.session.status !== 'verbroken') n.session.leave(); } catch (e) { /* al weg */ } }
  world.coopNet = null;
  if (n.role === 'client' && n.stash) {
    const s = n.stash, p = world.player;
    p.x = s.x; p.y = s.y; p.angle = s.angle; if (p.vx !== undefined) { p.vx = 0; p.vy = 0; }
    world.wanted = s.wanted;
    p.character = s.character; p.coopChar = s.coopChar;
    world.coopVerdiend = 0; // het geld zit al in world.money en gaat met de gewone save mee; bleef dit staan, dan kwam het bij een volgende sessie nogmaals in de save
    if (world.companion && s.companion) { world.companion.x = s.companion.x; world.companion.y = s.companion.y; world.companion.character = s.companion.character; }
    if (world.coop) world.coop.prevLocal = s.prevLocal;
    if (n.fade && n.joined) n.fade('uit');
  }
  endCoop(world);
  world.coopRole = null; // eigen save mag weer (gast: met zijn eigen voortgang)
}
