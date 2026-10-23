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

import { ClientSession, PROTO } from './net/session.js';
import { HostHub } from './net/hub.js';
import { VERSION } from './version.js';
import { setFixedCharacters, applyHostState, makeClientInput, ensureFigure, removeFigure, figures } from './coopclient.js';
import { bindCoop } from './coopglue.js';
import { partnersInfo, createPings, addPing, tickPings, pingEvent } from './partnerhud.js';
import { holdBeleid, leesLijstEvent, lijst } from './coopplayers.js';
import { cameraRelative, stepSlot2, sharedCamera } from './coop.js';
import { coopStep } from './coopglue.js';
import { gateOn, setGate, hekBericht } from './coopgate.js';
import { WIEL_TEKST, WIEL_HOST_TEKST, WIEL_VERZOEK_S, kanUitstappen } from './coopgast.js';
import { nieuwCutVerzamelaar, cutGastSpeel, cutGastStop, leesCutTijd, cutSpoor } from './coopcut.js';
import { verzamelExtra, codeerExtra, leesExtra, nieuwGeheugen, nieuweStand, pasExtraToe } from './coopextra.js';
import { verzamelEntiteiten, leesEntiteiten, missieBericht, leesMissieBericht, missieTekst, sceneBericht, leesSceneBericht, sceneLeeg, filmpjeTekst } from './coopworld.js';
import { verhaalRol, openerNaam, charInfo } from './coopplayers.js';
import { KLOK_EVERY, klokEvent, leesKlokEvent, KlokVolger } from './net/speelklok.js';
import { HASH_EVERY, viewOf, hashEvent, leesHashEvent, DesyncMonitor } from './net/desync.js';
import { PING_TOETSEN, PING_TEKST, pingPlek, pingMarkers, pingRegel } from './coopping.js';
import { spelersRijen } from './coopspelers.js';
import { maakMeedoen, opdrachtSleutel, begin as meedoenBegin, einde as meedoenEinde, antwoord as meedoenAntwoord, tik as meedoenTik, loopVrij, krijgtDeel, maakUitnodiging, uitnodigingTekst } from './coopmeedoen.js';
import { WEER_EVERY, weerEvent, leesWeerEvent, pasWeerToe } from './coopweer.js';
import { loopbaanGast, GAST_XP_DEEL } from './loopbaanlive.js';
import { maakRegister, zetPlek, leegRegister, bouwFoci, losBesluit, FOCI_MAX, MAX_AFSTAND, ONGELADEN_S } from './coopfoci.js';
import { tileIndexOf, tileKey } from './gdt.js';

export const CAPS = ['scene', 'spelers']; // wat dit spel kent; uitbreidbaar (net/session.js negotiate)
export const REMOVE_DELAY = 0.5; // s tussen "je bent verwijderd" en het verbreken
export const MAX_REWARD = 1000000;
export const GAST_DEEL = 0.5; // een gast krijgt de helft van wat de gastheer verdient met een missie, bijbaan of prijs (#365)
export const FIGUUR_BAND = 110; // m: verder dan dit van de gastheer verdwaalt een extra speler in een wereld die daar niet geladen is (#366)
export const FIGUUR_WAARSCHUWING = 80;
export const FIGUUR_INSTAP_AFSTAND = 9; // m: de 3e en 4e speler stappen in als het voertuig van de gastheer zo dichtbij is (#372)
export const CAMERA_DELEN = false; // Tammo en Tessa delen geen camera meer: elke speler heeft zijn eigen scherm en muis; het midden tussen beiden zette de camera verder weg en scheef (#388)
export const FIGUUR_TERUG_S = 4;  // s te ver weg voor de gastheer de figuur bij de groep zet

// De tegelhash komt van de aanroeper (manifest van de wereld); story = verhaalboog.
export function handshakeInfo({ tiles, story }) {
  return { game: 'gde', proto: PROTO, version: String(VERSION), tiles: String(tiles), story: String(story) };
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

// De treinen van de gewone dienstregeling (geen opdrachttreinen), met hun plek op de route, voor de gasten (#428).
// railway.js trekt three.js mee: main.js geeft de spoorwegen door (setCoopTreinen), zodat dit bestand in Node testbaar blijft.
let rails = null;
export function setCoopTreinen(r) { rails = r; }
function hostTreinen() {
  if (!rails) return [];
  const { getTrains, getRoutes, routePoint } = rails;
  const routes = getRoutes(), uit = [];
  for (const t of getTrains()) {
    const i = routes.indexOf(t.route);
    if (i < 0 || (t.state !== 'run' && t.state !== 'dwell')) continue;
    const p = routePoint(t.route, t.c);
    uit.push({ id: i, x: p[0], y: p[1], v: t.v * t.dir, halfLen: t.halfLen });
  }
  return uit;
}

// sim-adapter voor de host: plek 0 = world.player, plek 1 = world.companion, plek 2+ = figuren
export function hostSim(world, roster) {
  const geheugens = new Map(); // per gast wat de extra wereld (coopextra.js) hem al vertelde
  const lichamen = () => {
    const p = world.player, c = world.companion;
    const l = [p, c].filter(Boolean).map(posOf);
    for (const s of roster().spelers) if (s.slot >= 2) { const f = figures(world)[s.slot]; if (f) l.push(f); }
    return l.filter((q) => q && Number.isFinite(q.x) && Number.isFinite(q.y));
  };
  return {
    // voetgangers (uiterlijk, lopen), dieren, verkeerslichten en kapotte objecten van de host (#428), per gast op maat
    extra(slot) {
      const bij = lichamen(); if (!bij.length) return null;
      const f = slot === 1 ? posOf(world.companion) : figures(world)[slot];
      const oorsprong = f && Number.isFinite(f.x) && Number.isFinite(f.y) ? f : bij[0];
      let g = geheugens.get(slot); if (!g) geheugens.set(slot, g = nieuwGeheugen());
      const d = world.coopExtraDeps || {};
      const deps = { controllers: d.controllers ? d.controllers() : [], gebroken: d.gebroken, misc: d.misc, wereld: d.wereld, sprekers: d.sprekers };
      return codeerExtra(verzamelExtra(world, bij, g, deps), oorsprong);
    },
    applyInput(slot, input) {
      if (!world.coop || slot < 1) return;
      if (slot === 1) { world.coop.remote = true; world.coop.remoteInput = input; return; }
      const f = ensureFigure(world, slot, null); f.input = input;
    },
    snapshot() {
      const p = world.player, c = world.companion;
      const body = (b, slot) => { const q = posOf(b); return b && ({ slot, x: q.x, y: q.y, z: b.z || 0, angle: q.angle || 0, alive: slot === 0 ? !world.pendingRespawn : slot === 1 ? b.state !== 'dead' : true, inVeh: !!(b.inVehicle || b.inVeh), driver: false, run: false, health: 100, vehicle: null }); };
      const players = [body(p, 0), body(c, 1)];
      for (const s of roster().spelers) if (s.slot >= 2) players.push(body(figures(world)[s.slot], s.slot));
      const ents = verzamelEntiteiten(world, players.filter(Boolean), { treinen: hostTreinen() });
      return {
        players: players.filter(Boolean),
        shared: { money: world.money || 0, wanted: world.wanted | 0, clock: Number(world.time) || 0 },
        mission: { stage: (world.mission && world.mission.index) | 0, state: world.mission && world.mission.phase === 'active' ? 'run' : 'none', present: 3 },
        // voertuigen dicht bij een speler en het doel van de opdracht: de gasten zien de wereld van de host
        entities: ents,
        looks: ents.looks, // het uiterlijk van een paar voertuigen (roulerend, #428)
      };
    },
    fullState() { return { wanted: world.wanted | 0 }; }, // het geld van de host is van de host
    vergeet(slot) { geheugens.delete(slot); }, // een plek komt vrij: de volgende speler krijgt alles opnieuw te horen
    stats() { let looks = 0; for (const g of geheugens.values()) looks += g.looks.size; return { geheugens: geheugens.size, looks }; }, // voor de duurtest
  };
}

function prepareCoop(world) {
  if (!world.coop) bindCoop(world, world.input);
  world.coopPings = world.coopPings || createPings();
}
function endCoop(world) {
  if (world.coop) { delete world.coop.leash; }
  if (world.coop) { world.coop.remote = false; world.coop.remoteInput = null; world.coop.fixedChars = false; if (world.coop.prevLocal !== undefined) { world.coop.local = world.coop.prevLocal; world.coop.prevLocal = undefined; } }
  world.coopPartner = null; world.coopPartners = []; world.coopRoster = null; world.coopFigures = {}; world.coopHost = null; world.coopExtra = null; world.coopHostMissie = null; world.coopCam = null; world.coopScene = null;
  world.coopVrijLopen = false; world.coopUitnodiging = null; world.coopMeedoenNee = false; // (#429)
  world.coopFoci = null; world.coopFociInfo = null; // spelers uit elkaar (#429)
  if (world.companion) world.companion.coopWacht = false;
  world.coopMeld = null; world.coopDeel = null; world.coopUitslag = null; world.coopPingMarks = []; world.coopSpelers = []; world.coopGebruik = false; world.coopWielSlot = null; world.coopWielVraag = null; world.coopWiel = false; world.coopInVoertuig = false; // (#291)
  if (world.companion) world.companion.coopUit = false;
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
      const we = weerEvent(world.weatherState); if (we) hub.announce(we, slot); // het weer van de gastheer (#364)
      hub.announce({ k: 'hek', aan: gateOn() }, slot); // is het spel nog niet begonnen? dan wacht de nieuwe speler in de wachtkamer
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
  if (world.coop) world.coop.leash = Infinity; // geen harde lijn van 38 m om Tessa: ze kon niet verder dan dat van de gastheer, en hij kon niet weten waarom (#388); bandMetgezel doet het werk
  world.coopRole = 'host';
  world.coopRoster = lijst(hub.roster);
  world.coopUitslag = (ok, label, reden, loon, gestopt) => uitslagMelden(world, ok, label, reden, loon, gestopt); // gelukt, mislukt of gestopt (#371, #390)
  world.coopDeel = (bedrag, info) => deelMetGasten(world, bedrag, info); // missies, bijbanen en prijzen delen met de gasten (#365)
  world.coopMeld = (slot, tekst) => hub.announce({ k: 'melding', tekst: String(tekst).slice(0, 90) }, slot); // een korte melding voor een gast (#291)
  world.coopNet = { role: 'host', hub, fade, route, removing: {}, info, tKlok: 0, tHash: 0, tWeer: 0, tSpelers: 1, hashN: 0, scene, tScene: 0, filmpjeT: 0, sceneNu: null, meedoen: maakMeedoen(), foci: maakRegister() };
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
  session.onlost = () => { if (onHold) onHold('client', session.slot, `Verbinding met ${openerNaam(world.coopRoster)} is weg.`); };
  session.onevent = (b) => handleEvent(world, b, 0);
  session.onextra = (lading) => { const m = leesExtra(lading); if (m) { world.coopExtra = pasExtraToe(world.coopExtra || nieuweStand(), m, now(world)); world.coopExtraBytes = (world.coopExtraBytes || 0) + lading.length; } }; // de rest van de wereld van de host (#428, coopextra3d.js)
  // de host is de baas: bij een desync (net/desync.js) zet de gast zijn wanted weer gelijk aan dat van de host
  session.onresync = (st) => { if (st && Number.isFinite(st.wanted)) world.wanted = st.wanted | 0; };
  world.coopRole = 'client';
  world.coopNet = { role: 'client', session, stash, fade, joined: false, fixed: false, route, info, klok: new KlokVolger(), desync: new DesyncMonitor(), lokaal: 0, tSpelers: 1 };
  return session;
}

// ---------------------------------------------------------------- elke frame
function stepFigures(world, dt) {
  const f = figures(world);
  for (const slot of Object.keys(f)) {
    const fig = f[slot];
    if (fig.inVeh) { // een extra speler zit mee in het voertuig van de gastheer (#372)
      const v = fig.inVeh;
      if (world.player.inVehicle !== v || v.wrecked || v.sinking) figUit(world, fig);
      else { fig.x = v.x; fig.y = v.y; fig.angle = v.angle || 0; fig.vx = 0; fig.vy = 0; continue; }
    }
    if (fig.wacht) { fig.vx = 0; fig.vy = 0; continue; } // de wereld rond hem wordt nog geladen (bandFiguren, #429)
    if (!fig.input) { fig.vx *= Math.max(0, 1 - 10 * dt); fig.vy *= Math.max(0, 1 - 10 * dt); continue; }
    const m = fig.input;
    const len = Math.hypot(m.mx, m.my), sx = len > 1 ? 1 / len : 1;
    const dir = cameraRelative({ x: m.mx * sx, y: m.my * sx, run: !!((m.buttons || 0) & 1), active: !!(m.mx || m.my) }, m.yaw || 0);
    stepSlot2(fig, dir, dt, null);
    if (world.coopMove) world.coopMove(fig, dt, world); // botsingen met gebouwen: companion.js zet deze haak
    else { fig.x += fig.vx * dt; fig.y += fig.vy * dt; }
  }
  bandFiguren(world, dt);
  bandMetgezel(world, dt);
}

// Pauzeert de gastheer (pauzemenu, kaart, winkel), dan stond de wereld stil en de speler van Tessa met hem: updateGameplay stapt haar niet.
// De anderen blijven lopen (stepFigures draait altijd); Tessa nu ook. Een wachtscherm bij wegvallen (coopHold) pauzeert wel voor iedereen (#388).
export function stapMetgezelInPauze(world, dt) {
  const c = world.companion, p = world.player;
  if (!world.paused || world.coopHold || !c || !p || !world.coop || !world.coop.remote || world.coopDoorloopNu) return false; // loopt de wereld door achter het menu (#434), dan stapt updateGameplay haar al
  if (c.inVehicle || c.water || c.state === 'dead' || world.companionHold || (p.inVehicle && !c.coopUit)) return false;
  return coopStep(c, dt, world, world.coopMove || ((q, d) => { q.x += q.vx * d; q.y += q.vy * d; }));
}

// Plekken voor extra spelers (naast Tessa) in een voertuig van de gastheer
export function figuurPlekken(v) {
  if (!v || v.isBike || v.isScooter || v.isHeli || v.isPlane || v.wrecked || v.sinking) return 0;
  return v.isBus ? 6 : 3;
}
// Een extra speler stapt uit: naast het voertuig, aan de kant van zijn plek
function figUit(world, fig) {
  const v = fig.inVeh; fig.inVeh = null; fig.coopVoertuig = false;
  if (!v) return;
  const zijde = fig.slot % 2 ? 1 : -1, a = (v.angle || 0) + zijde * Math.PI / 2, d = (v.halfWid || 1) + 1.4 + 0.5 * Math.floor(fig.slot / 2);
  fig.x = v.x + Math.cos(a) * d; fig.y = v.y + Math.sin(a) * d; fig.vx = 0; fig.vy = 0;
}
// E van de 3e of 4e speler: instappen als de gastheer in een voertuig zit met een vrije plek dichtbij, of uitstappen als het bijna stilstaat
export function figGebruik(world, slot) {
  const fig = figures(world)[slot]; if (!fig) return false;
  const meld = (t) => { if (world.coopMeld) world.coopMeld(slot, t); };
  if (fig.inVeh) {
    if (!kanUitstappen(fig.inVeh)) { meld('Stap uit als het voertuig bijna stilstaat.'); return false; }
    figUit(world, fig); return true;
  }
  const v = world.player && world.player.inVehicle;
  if (!v) return false;
  const plekken = figuurPlekken(v);
  if (!plekken) { meld('Hier kun je niet meerijden.'); return false; }
  if (Math.hypot(fig.x - v.x, fig.y - v.y) > FIGUUR_INSTAP_AFSTAND) { meld('Loop naar het voertuig om in te stappen.'); return false; }
  if (Object.values(figures(world)).filter((f) => f.inVeh === v).length >= plekken) { meld('Er is geen plek meer in dit voertuig.'); return false; }
  fig.inVeh = v; fig.coopVoertuig = true; fig.vx = 0; fig.vy = 0;
  return true;
}

// De lijst voor de spelerslijst (Tab en het pauzemenu): ook de gast kent alleen zijn eigen ping; die van de anderen kent alleen de gastheer (#377)
function bouwSpelers(world, n) {
  const host = n.role === 'host', p = world.player;
  const mijnSlot = host ? 0 : (n.session && n.session.slot) || 0;
  const rtt = (slot) => { if (host) { const s = n.hub.sessions.get(slot); return s && Number.isFinite(s.rtt) ? s.rtt * 1000 : null; } return slot === mijnSlot && n.session && Number.isFinite(n.session.rtt) ? n.session.rtt * 1000 : null; };
  const opdracht = host ? (world.mission && world.mission.phase === 'active' ? world.mission.label || 'opdracht' : null) : (world.coopHostMissie && world.coopHostMissie.actief ? world.coopHostMissie.label : null);
  world.coopSpelers = spelersRijen({ mijnSlot, roster: world.coopRoster || [], partners: world.coopPartners || [], mijn: p ? { x: p.x, y: p.y, inVoertuig: host ? !!p.inVehicle : !!world.coopInVoertuig, rijdt: host ? !!p.inVehicle && world.coopWielSlot == null : !!world.coopWiel } : null, rtt, opdracht });
}

// Tessa gaat niet meer vanzelf mee als de gastheer instapt (een echte speler beslist zelf): ze leest wat ze moet doen (#388)
export function meldVoertuig(world, n) {
  const hv = world.player && world.player.inVehicle || null, c = world.companion;
  if (hv === (n.hostVoertuig || null)) return false;
  n.hostVoertuig = hv;
  if (!hv || !c || c.inVehicle || hv.passenger || !(world.coop && world.coop.remote) || !figuurPlekken(hv)) return false;
  n.hub.announce({ k: 'melding', tekst: `${openerNaam(world.coopRoster, true)} zit in een voertuig. Druk bij het voertuig op E om mee te rijden.` }, 1);
  return true;
}

// Neergaan, arrestatie en opstaan van de gastheer en Tessa: de anderen horen het, de gast zelf ook (#369)
export function meldNeer(world, n) {
  const pr = world.pendingRespawn ? (world.pendingRespawn.busted ? 'gepakt' : 'neer') : null;
  if (pr !== (n.hostNeer || null)) {
    n.hostNeer = pr;
    if (pr) n.hub.announce({ k: 'melding', tekst: `${openerNaam(world.coopRoster, true)} is ${pr === 'gepakt' ? 'door de politie gepakt' : 'neergeslagen'}.` });
  }
  const vast = !!(world.companionHold && world.coop && world.coop.remote && !world.coopVrijLopen); // wie niet meedoet loopt vrij (#429) // een opdracht of minigame parkeert Tessa: haar speler kan even niet lopen (#375)
  if (vast !== !!n.tessaVast) { n.tessaVast = vast; n.hub.announce({ k: 'melding', tekst: vast ? 'Je kijkt even mee: de opdracht houdt je op je plek.' : 'Je kunt weer lopen.' }, 1); }
  const c = world.companion, dood = !!(c && c.state === 'dead');
  if (dood !== !!n.tessaNeer) {
    n.tessaNeer = dood;
    n.hub.announce({ k: 'melding', tekst: dood ? 'Je bent geraakt. Je staat zo weer op.' : 'Je staat weer.' }, 1);
  }
}

// Spelers uit elkaar (#429, coopfoci.js): de gastheer laadt en simuleert de wereld ook rond elke losse groep spelers. Dan zet de band een speler die los loopt niet terug zolang hij een eigen focus heeft, binnen de maximale afstand
// blijft en de wereld rond hem geladen is. Is de wereld daar nog niet geladen, dan staat hij even stil; duurt dat te lang, dan zet de band hem terug.
export function tegelGeladen(world, x, y) {
  const m = world.map; if (!m || !m.store || !m.resident || !m.store.index) return true; // zonder tegels (tests, een kleine wereld): alles is er
  const [i, j] = tileIndexOf(x, y);
  if (!m.store.index.tiles[tileKey(i, j)]) return true; // daar is niets te laden (zee, buiten de kaart)
  return m.resident.has(`${i},${j}`);
}
export const LOS_TEKST = 'Je loopt los van de groep. Druk op B om bij de groep te komen.';
export const BUDGET_TEKST = 'Te veel groepen uit elkaar voor het geheugen van het spel. Druk op B om bij de groep te komen, anders word je zo teruggezet.';
export const LOS_MELD_M = 300; // m: vanaf hier zegt het spel een keer hoe je bij de groep komt
export const WACHT_TEKST = 'De wereld hier wordt nog geladen. Even wachten.';

// Is deze speler los van de gastheer toegestaan? { ok, wacht }; zie coopfoci.js losBesluit
export function losVoor(world, slot, x, y) {
  const p = world.player, info = world.coopFociInfo, n = world.coopNet;
  if (!info || !p || (n && n.sprong > 0)) return { ok: false, wacht: false }; // een sprong van de gastheer (snelreizen, herstel) haalt iedereen bij, zoals altijd
  if (p.inVehicle && Math.abs(p.inVehicle.speed || 0) > 6 && Math.hypot(x - p.x, y - p.y) < 400) return { ok: false, wacht: false }; // rijdt de gastheer snel weg, dan raakt wie dichtbij is het eerst achter: bij hem gezet, zoals altijd
  const r = losBesluit({ aan: true, slot, bediend: info.bediend, dHost: Math.hypot(x - p.x, y - p.y), maxAfstand: MAX_AFSTAND, geladen: tegelGeladen(world, x, y) });
  return { ok: r.ok, wacht: r.wacht };
}

const buitenBudget = (world, slot) => !!(world.coopFociInfo && world.coopFociInfo.buiten.has(slot));

// Elke host-tick: de plekken van alle spelers in het register, de foci daaruit (world.coopFoci: alleen met meer dan een focus, zodat alles
// bij een groep precies zo blijft als voorheen) en wie er bediend wordt. Uit (standaard): geen foci.
export const SPRONG_M = 300, SPRONG_S = 0.8;
export function werkFoci(world, dt = 0) {
  const n = world.coopNet; if (!n || n.role !== 'host' || !n.foci) return null;
  const p = world.player;
  if (p && Number.isFinite(p.x) && n.hostLast && Math.hypot(p.x - n.hostLast.x, p.y - n.hostLast.y) > SPRONG_M) n.sprong = SPRONG_S; else if (n.sprong > 0) n.sprong -= dt;
  if (p && Number.isFinite(p.x)) n.hostLast = { x: p.x, y: p.y };
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) { world.coopFoci = null; world.coopFociInfo = null; return null; }
  leegRegister(n.foci);
  const c = world.companion;
  const weg = new Set(n.hub.roster.spelers.filter((s) => s.verbinding === 'lost').map((s) => s.slot));
  if (c && world.coop && world.coop.remote && !c.inVehicle && !weg.has(1)) zetPlek(n.foci, 1, c.x, c.y);
  for (const fig of Object.values(figures(world))) if (!fig.inVeh && !weg.has(fig.slot)) zetPlek(n.foci, fig.slot, fig.x, fig.y);
  const info = bouwFoci({ x: p.x, y: p.y }, n.foci, { max: FOCI_MAX, maxAfstand: MAX_AFSTAND });
  world.coopFociInfo = info;
  world.coopFoci = info.foci.length > 1 ? info.foci : null;
  return info;
}

// Een speler zet de band terug naast de gastheer (de eerste droge plek rond hem)
function zetBijGroep(world, lichaam, a0) {
  const p = world.player;
  lichaam.x = p.x; lichaam.y = p.y; // niets vrij rond de gastheer: dan op zijn plek
  let droog = false;
  for (let i = 0; i < 8; i++) { // de eerste droge plek rond de gastheer, niet in het water of een gebouw
    const a = a0 + i * Math.PI / 4, x = p.x + Math.cos(a) * 2.2, y = p.y + Math.sin(a) * 2.2;
    if (!world.coopVrij || world.coopVrij(x, y, world)) { lichaam.x = x; lichaam.y = y; droog = true; break; }
  }
  lichaam.gz = p.gz || 0; lichaam.vx = 0; lichaam.vy = 0;
  return droog;
}
// Zit de gastheer op het water in een boot en is er rond hem geen droge plek, dan zet de band een speler in de boot (een plek, anders naast de boot in het water)
// in plaats van in zee; een boot ligt niet aan de kant. Geeft true als de speler in de boot zit (#434).
export function zetInBoot(world, lichaam) {
  const v = world.player && world.player.inVehicle;
  if (!v || !v.isBoat || v.sinking || v.wrecked || !figuurPlekken(v)) return false;
  if (lichaam === world.companion) {
    if (v.passenger) return false;
    lichaam.inVehicle = v; v.passenger = 'companion'; lichaam.coopUit = false; lichaam.vx = 0; lichaam.vy = 0;
    return true;
  }
  if (Object.values(figures(world)).filter((f) => f.inVeh === v).length >= figuurPlekken(v)) return false;
  lichaam.inVeh = v; lichaam.coopVoertuig = true; lichaam.x = v.x; lichaam.y = v.y; lichaam.vx = 0; lichaam.vy = 0;
  return true;
}
const BOOT_MELD = 'Je zit weer in de boot.';

// Een extra speler (plek 2 en hoger) heeft geen band zoals Tessa; loopt hij te ver van de gastheer, dan is de wereld daar niet geladen
// (geen gebouwen, geen grond). Eerst een melding, daarna zet de gastheer hem bij de groep (#366). Met spelers uit elkaar (#429)
// geldt dat alleen voor wie geen eigen focus heeft (te veel groepen voor het budget).
export function bandFiguren(world, dt) {
  const p = world.player; if (!p || !Number.isFinite(p.x)) return;
  const v = p.inVehicle, snel = !!v && Math.abs(v.speed || 0) > 6; // rijdt de gastheer weg, dan raakt een speler te voet het eerst achter
  for (const fig of Object.values(figures(world))) {
    if (fig.inVeh) { fig.wacht = false; continue; }
    const d = Math.hypot(fig.x - p.x, fig.y - p.y), los = losVoor(world, fig.slot, fig.x, fig.y), band = snel ? 35 : FIGUUR_BAND;
    const plek = false; // niemand wordt vanzelf in een voertuig gezet: te ver weg betekent naast de gastheer, instappen doet de speler zelf met E
    if (los.ok) { // los van de groep, maar de wereld is voor hem geladen: niet terugzetten, wel een keer zeggen hoe hij terugkomt
      if (d > LOS_MELD_M && !fig.losGemeld) { fig.losGemeld = true; if (world.coopMeld) world.coopMeld(fig.slot, LOS_TEKST); }
      if (d <= LOS_MELD_M) fig.losGemeld = false;
      fig.gewaarschuwd = false;
      if (los.wacht && !fig.wacht && world.coopMeld) world.coopMeld(fig.slot, WACHT_TEKST);
      fig.wacht = los.wacht; fig.ongeladen = los.wacht ? (fig.ongeladen || 0) + dt : 0;
      if (fig.wacht) { fig.vx = 0; fig.vy = 0; }
      fig.verTijd = los.wacht && fig.ongeladen >= ONGELADEN_S ? FIGUUR_TERUG_S : 0;
    } else {
      fig.wacht = false; fig.ongeladen = 0; fig.losGemeld = false;
      if (d > FIGUUR_WAARSCHUWING && !fig.gewaarschuwd && !snel) { fig.gewaarschuwd = true; if (world.coopMeld) world.coopMeld(fig.slot, buitenBudget(world, fig.slot) ? BUDGET_TEKST : 'Blijf bij de groep: te ver weg wordt je teruggezet.'); }
      if (d <= FIGUUR_WAARSCHUWING) fig.gewaarschuwd = false;
      fig.verTijd = d > band ? (fig.verTijd || 0) + dt : 0;
    }
    fig.vastMeet = (fig.vastMeet || 0) + dt; // vast in water of een muur (bijvoorbeeld na een sprong van de gastheer): vier keer per seconde meten, want er kunnen tot 16 spelers zijn
    if (fig.vastMeet >= 0.25) { fig.vastTijd = world.coopVrij && !world.coopVrij(fig.x, fig.y, world) ? (fig.vastTijd || 0) + fig.vastMeet : 0; fig.vastMeet = 0; }
    if (fig.verTijd >= (d > 300 && !los.ok ? 0.5 : FIGUUR_TERUG_S) || fig.vastTijd >= FIGUUR_TERUG_S) { // een sprong van de gastheer (snelreizen, herstel) haalt de figuur meteen bij
      fig.verTijd = 0; fig.vastTijd = 0; fig.gewaarschuwd = false; fig.losGemeld = false; fig.wacht = false; fig.ongeladen = 0; fig.vx = 0; fig.vy = 0;
      if (plek) { fig.inVeh = v; fig.coopVoertuig = true; fig.x = v.x; fig.y = v.y; if (world.coopMeld) world.coopMeld(fig.slot, 'Je rijdt mee. Met E stap je uit als het voertuig stilstaat.'); continue; } // is er plek, dan zit hij weer in het voertuig (geen eindeloos terugzetten)
      if (!zetBijGroep(world, fig, (fig.slot * 1.7) % (Math.PI * 2)) && zetInBoot(world, fig)) { if (world.coopMeld) world.coopMeld(fig.slot, BOOT_MELD); continue; }
      if (world.coopMeld) world.coopMeld(fig.slot, 'Je staat weer bij de groep.');
    }
  }
}

// De speler van Tessa (plek 1) heeft dezelfde band als een extra speler (#388): eerst een melding, dan zet de gastheer haar bij de groep, of
// laat haar meerijden als hij wegrijdt en er plek is. Vroeger hield een harde lijn van 38 m haar vast: wie het paarse lijntje volgde of
// verder liep kon alleen nog terug. Met spelers uit elkaar (#429) zie bandFiguren.
export function bandMetgezel(world, dt) {
  const c = world.companion, p = world.player;
  if (!c || !p || !world.coop || !world.coop.remote || c.inVehicle || c.state === 'dead' || !Number.isFinite(p.x) || !Number.isFinite(c.x)) { if (c) c.coopWacht = false; return false; }
  const v = p.inVehicle, snel = !!v && Math.abs(v.speed || 0) > 6;
  const d = Math.hypot(c.x - p.x, c.y - p.y), los = losVoor(world, 1, c.x, c.y), band = snel ? 35 : FIGUUR_BAND;
  if (los.ok) {
    if (d > LOS_MELD_M && !c.losGemeld) { c.losGemeld = true; if (world.coopMeld) world.coopMeld(1, LOS_TEKST); }
    if (d <= LOS_MELD_M) c.losGemeld = false;
    c.gewaarschuwd = false;
    if (los.wacht && !c.coopWacht && world.coopMeld) world.coopMeld(1, WACHT_TEKST);
    c.coopWacht = los.wacht; c.ongeladen = los.wacht ? (c.ongeladen || 0) + dt : 0;
    if (c.coopWacht) { c.vx = 0; c.vy = 0; }
    c.verTijd = los.wacht && c.ongeladen >= ONGELADEN_S ? FIGUUR_TERUG_S : 0;
  } else {
    c.coopWacht = false; c.ongeladen = 0; c.losGemeld = false;
    if (d > FIGUUR_WAARSCHUWING && !c.gewaarschuwd && !snel) { c.gewaarschuwd = true; if (world.coopMeld) world.coopMeld(1, buitenBudget(world, 1) ? BUDGET_TEKST : 'Blijf bij de groep: te ver weg wordt je teruggezet.'); }
    if (d <= FIGUUR_WAARSCHUWING) c.gewaarschuwd = false;
    c.verTijd = d > band ? (c.verTijd || 0) + dt : 0;
  }
  if (c.verTijd < (d > 300 && !los.ok ? 0.5 : FIGUUR_TERUG_S)) return false;
  c.verTijd = 0; c.gewaarschuwd = false; c.losGemeld = false; c.coopWacht = false; c.ongeladen = 0; c.vx = 0; c.vy = 0;
  const plek = false; // geen automatisch meerijden: te ver weg betekent naast de gastheer, instappen doet ze zelf met E
  if (plek) { c.inVehicle = v; v.passenger = 'companion'; c.coopUit = false; if (world.coopMeld) world.coopMeld(1, 'Je rijdt mee. Met E stap je uit als het voertuig stilstaat.'); return true; }
  if (!zetBijGroep(world, c, Math.PI * 1.7) && zetInBoot(world, c)) { if (world.coopMeld) world.coopMeld(1, BOOT_MELD); return true; }
  if (world.coopMeld) world.coopMeld(1, 'Je staat weer bij de groep.');
  return true;
}

// B (gast): "Bij de groep komen": de gastheer zet je lichaam naast zich. Een gast die los loopt kan zo altijd terug (#429).
export const BIJ_GROEP_WACHT_S = 3;
export function bijGroepGebaar(world) {
  const n = world.coopNet; if (!n || n.role !== 'client' || !n.joined) return false;
  const nu = Date.now() / 1000;
  if (n.bijGroepT && nu - n.bijGroepT < BIJ_GROEP_WACHT_S) return false;
  n.bijGroepT = nu;
  return n.session.sendEvent({ k: 'bijgroep' });
}
// De host zet het lichaam van deze gast naast zich, tenzij hij in een voertuig zit of de gastheer zelf een voertuig neemt.
export function bijGroepHost(world, slot) {
  const n = world.coopNet; if (!n || n.role !== 'host' || slot < 1 || !world.player) return false;
  const lichaam = slot === 1 ? world.companion : figures(world)[slot];
  if (!lichaam || lichaam.inVehicle || lichaam.inVeh || (slot === 1 && lichaam.state === 'dead')) return false;
  const droog = zetBijGroep(world, lichaam, slot === 1 ? Math.PI * 1.7 : (slot * 1.7) % (Math.PI * 2));
  lichaam.verTijd = 0; lichaam.wacht = false; lichaam.coopWacht = false; lichaam.ongeladen = 0;
  if (!droog && zetInBoot(world, lichaam)) { if (world.coopMeld) world.coopMeld(slot, BOOT_MELD); return true; }
  if (world.coopMeld) world.coopMeld(slot, 'Je staat weer bij de groep.');
  return true;
}

// De opdracht van de gastheer is gelukt of mislukt: elke gast leest het (en bij gelukt wat zijn deel was), zodat niemand raadt (#371)
export function uitslagMelden(world, ok, label, reden = '', loon = 0, gestopt = false) {
  const n = world.coopNet; if (!n || n.role !== 'host') return false;
  return n.hub.announce({ k: 'uitslag', ok: !!ok, ...(gestopt ? { gestopt: true } : null), label: String(label || '').slice(0, 60), reden: String(reden || '').slice(0, 60), deel: ok ? Math.floor(Math.max(0, Number(loon) || 0) * GAST_DEEL) : 0 });
}

// Een nieuwe opdracht van de gastheer: elke gast krijgt "Meedoen?" (#429). Verplicht waar de stap de gast-hoofdrol nodig heeft
// (world.coopStapRegel: haak die de coöp-regel van de huidige verhaalstap geeft, cooproles.js coopRule; zonder haak is meedoen vrij).
function nodigUit(world, n, huidig) {
  const sl = opdrachtSleutel(huidig && { actief: true, ...huidig });
  if (sl === (n.meedoen.opdracht || null)) return;
  if (!sl) { meedoenEinde(n.meedoen); return; }
  const regel = world.coopStapRegel ? world.coopStapRegel() : null;
  const slots = n.hub.roster.spelers.filter((s) => s.slot !== 0 && s.verbinding !== 'lost').map((s) => s.slot);
  for (const u of meedoenBegin(n.meedoen, sl, slots, regel)) n.hub.announce({ k: 'meedoen', label: String(huidig.label || '').slice(0, 80), verplicht: u.verplicht, sec: u.sec }, u.slot);
}
// De gast antwoordt op de uitnodiging (J of N): een bericht naar de gastheer.
export function gastMeedoen(world, ja) {
  const n = world.coopNet, u = world.coopUitnodiging; if (!n || n.role !== 'client' || !n.joined || !u || u.verplicht) return false;
  world.coopUitnodiging = null; world.coopMeedoenNee = !ja;
  if (world.addMessage) world.addMessage(ja ? 'Je doet mee.' : 'Je doet niet mee: je loopt vrij rond. Beloning en voortgang van deze opdracht zijn niet voor jou.', 4);
  return n.session.sendEvent({ k: 'meedoenantwoord', ja: !!ja });
}

// Missies, bijbanen en prijzen van de gastheer: elke verbonden gast krijgt zijn deel in zijn eigen portemonnee (#365).
// info (loopbaan, #381): { vak, basis, xp }. De gast krijgt de helft van het bedrag voor de loonfactor van de gastheer, en
// verdient daar op zijn eigen apparaat zijn eigen factor over; de helft van de punten gaat naar zijn eigen loopbaan.
export function deelMetGasten(world, bedrag, info = null) {
  const n = world.coopNet; if (!n || n.role !== 'host') return 0;
  const basis = info && Number(info.basis) > 0 ? Number(info.basis) : Number(bedrag);
  const geld = Math.floor(basis * GAST_DEEL);
  if (!(geld >= 1)) return 0;
  const extra = info && typeof info.vak === 'string' && info.vak ? { vak: info.vak.slice(0, 20), xp: Math.max(0, Math.round((Number(info.xp) || 0) * GAST_XP_DEEL)) } : null;
  let k = 0;
  for (const s of n.hub.roster.spelers) if (s.slot !== 0 && s.verbinding !== 'lost' && krijgtDeel(n.meedoen, s.slot) && payGuest(world, Math.min(geld, MAX_REWARD), s.slot, extra)) k++;
  return k;
}

export function tickCoopNet(world, dt) {
  const n = world.coopNet; if (!n) return;
  if (world.coopPings) {
    tickPings(world.coopPings, now(world));
    if (!world.paused && !world.uiPaused && !world.coopHold && world.input && world.input.wasPressed && (n.role === 'host' || n.joined)) for (const k of PING_TOETSEN) if (world.input.wasPressed(k.toets)) pingGebaar(world, k.soort); // 7, 8, 9 (#367)
    world.coopPingMarks = pingMarkers(world.coopPings, world.coopRoster, n.role === 'client' && n.session ? n.session.slot : 0, now(world));
  }
  n.tSpelers += dt;
  if (n.tSpelers >= 0.25) { n.tSpelers = 0; bouwSpelers(world, n); }
  if (n.role === 'client') {
    const s = n.session;
    // afgewezen (sessie vol, andere versie) of de gastheer stopte (BYE): de gast speelt weer in zijn eigen spel. Zonder dit bleef hij 'gast' (zijn spel werd niet meer bewaard)
    // of stond zijn wereld stil op de laatste plek van de gastheer.
    if (s.status === 'geweigerd' || s.status === 'verbroken') {
      if (s.status === 'verbroken' && n.joined && world.addMessage) world.addMessage(`${openerNaam(world.coopRoster, true)} heeft het spel gestopt. Je speelt weer in je eigen spel.`, 5);
      if (s.status === 'geweigerd') world.coopWeigering = s.rejected || 'gesloten'; // wat de lobby al liet zien; ook voor tests
      stopCoopNet(world); return;
    }
    const inp = world.input;
    const m = makeClientInput(inp && inp.axis ? inp.axis() : [0, 0], !!(inp && inp.isDown && inp.isDown('shift')), world.camYaw, !!(world.coopWiel && inp && inp.isDown && inp.isDown(' ')));
    if (inp && inp.wasPressed && inp.wasPressed('y')) wielGebaar(world); // Y: om het stuur vragen (#291)
    if (inp && inp.wasPressed && inp.wasPressed('b') && !world.paused) bijGroepGebaar(world); // B: bij de groep komen (#429)
    if ((world.coopScene && world.coopScene.filmpje) || world.paused) s.setInput(0, 0, 0, m.yaw); // de gastheer kijkt een filmpje, of de gast zit zelf in een menu, de kaart of een winkel: zijn figuur staat stil (#373)
    else s.setInput(m.mx, m.my, m.buttons, m.yaw);
    s.tick(dt);
    n.lokaal += dt;
    const uit = world.coopUitnodiging; // Meedoen met deze opdracht? J of N; zonder antwoord doet de gast mee (#429)
    if (uit) { uit.rest -= dt; if (uit.rest <= 0) world.coopUitnodiging = null; else if (inp && inp.wasPressed) { if (inp.wasPressed('j')) gastMeedoen(world, true); else if (inp.wasPressed('n')) gastMeedoen(world, false); } }
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
      const ik = sample && sample.players.find((q) => q.slot === s.slot);
      world.coopInVoertuig = !!(ik && ik.inVeh);
      if (!world.coopInVoertuig) world.coopWiel = false;
      world.coopHost = sample ? leesEntiteiten(sample.entities) : { voertuigen: [], doelen: [], voetgangers: [], treinen: [] };
      if (sample && rails) { if (rails.zetTreinenVanHost) rails.zetTreinenVanHost(world.coopHost.treinen); else for (const t of world.coopHost.treinen) rails.zetTreinVanHost(t.route, t.x, t.y, t.v); } // de gast speelt geen eigen dienstregeling: de treinen staan waar de host ze heeft
      world.coopPartners = partnersInfo(s.slot, sample ? sample.players : [], world.coopRoster || []);
      world.coopPartner = world.coopPartners[0] || null;
      world.coopCam = CAMERA_DELEN && s.slot === 1 ? sharedCamera(world.player, world.companion) : null; // alleen Tessa zou de camera delen met Tammo (uit, #388)
    }
    return;
  }
  for (const [slot, t] of Object.entries(n.removing)) { n.removing[slot] = t - dt; if (n.removing[slot] <= 0) { delete n.removing[slot]; n.hub.release(+slot); } }
  n.hub.tick(dt);
  if (world.input && world.input.wasPressed && world.input.wasPressed('y')) wielGebaar(world); // Y: het stuur geven of terugnemen (#291)
  if (world.coopWielSlot != null && !(world.player.inVehicle && world.companion && world.companion.inVehicle === world.player.inVehicle)) wielLos(world);
  werkFoci(world, dt); // spelers uit elkaar: de foci van dit moment, voor de band, de tegels en de bevolking (#429)
  stepFigures(world, dt);
  stapMetgezelInPauze(world, dt);
  n.tKlok += dt; n.tHash += dt; n.tWeer += dt;
  if (n.tKlok >= KLOK_EVERY) { n.tKlok = 0; n.hub.announce(klokEvent(world)); }
  if (n.tWeer >= WEER_EVERY) { n.tWeer = 0; const we = weerEvent(world.weatherState); if (we) n.hub.announce(we); }
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
  meldVoertuig(world, n); // de gastheer stapt in: Tessa leest hoe ze meerijdt (#388)
  const mb = missieBericht(n.missie || null, world.mission); // wat de host speelt, voor de gasten
  if (mb.event) { n.hub.announce(mb.event); }
  nodigUit(world, n, mb.huidig); n.missie = mb.huidig;
  world.coopVrijLopen = loopVrij(n.meedoen, 1); // Tessa wordt niet vastgezet als haar speler niet meedoet (#429)
  meldNeer(world, n); // de gastheer of Tessa gaat neer of wordt gearresteerd (#369)
  for (const slot of meedoenTik(n.meedoen, dt)) world.coopMeld && world.coopMeld(slot, 'Je doet mee.');
  const c = world.companion;
  const players = [c ? { slot: 1, x: posOf(c).x, y: posOf(c).y, angle: posOf(c).angle, alive: c.state !== 'dead', inVeh: !!c.inVehicle } : null, ...Object.values(figures(world)).map((f) => ({ slot: f.slot, x: f.x, y: f.y, angle: f.angle, alive: true, inVeh: !!f.inVeh }))].filter(Boolean);
  world.coopPartners = partnersInfo(0, players, world.coopRoster || []);
  world.coopPartner = world.coopPartners[0] || null;
  // gedeelde camera met Tessa (plek 1) zolang zij echt meespeelt; extra spelers hebben hun eigen camera
  const tessa = n.hub.roster.spelers.find((x) => x.slot === 1);
  world.coopCam = CAMERA_DELEN && tessa && tessa.verbinding === 'ok' && world.coop && world.coop.remote ? sharedCamera(world.player, world.companion) : null;
}

// ---------------------------------------------------------------- gebeurtenissen tussen de spelers
// van = plek van de afzender (0 = host). Alles wat binnenkomt wordt gecontroleerd; onbekende soorten worden genegeerd.
export function handleEvent(world, body, van = 0) {
  if (!body || typeof body !== 'object') return false;
  const n = world.coopNet;
  switch (body.k) {
    case 'ping': { // de host stuurt door met 'van'; een gast stuurt zonder
      const afz = n && n.role === 'client' && Number.isInteger(body.van) ? body.van : van;
      const ok = !!(world.coopPings && addPing(world.coopPings, { x: body.x, y: body.y, soort: body.soort, van: afz }, now(world)));
      if (ok && afz !== 'eigen' && (world.audioEvents || (world.audioEvents = [])).length < 64) world.audioEvents.push({ kind: 'notify', x: world.player ? world.player.x : 0, y: world.player ? world.player.y : 0 }); // een bestaand geluidje: iemand roept (#367)
      if (ok && world.addMessage) world.addMessage(pingRegel(afz, PING_TEKST[body.soort] ? body.soort : 'hier', world.coopRoster, n && n.role === 'client' && n.session ? n.session.slot : 0), 3);
      return ok;
    }
    case 'missie': { // wat de host speelt; de gast ziet het als melding, extra spelers lopen mee in de open wereld
      if (!n || n.role !== 'client') return false;
      const m = leesMissieBericht(body); if (!m) return false;
      const slot = n.session ? n.session.slot : 1;
      const vorige = world.coopHostMissie;
      world.coopHostMissie = m;
      if (!m.actief) world.coopUitnodiging = null; // de opdracht is voorbij (#429); coopMeedoenNee blijft tot de uitslag of de volgende uitnodiging
      const nieuweOpdracht = !vorige || !vorige.actief || vorige.index !== m.index || vorige.label !== m.label;
      // een nieuwe opdracht: wat de gastheer speelt; daarna alleen nog de volgende stap
      const tekst = nieuweOpdracht ? missieTekst(m, verhaalRol(slot) === 'wereld' ? 'wereld' : 'hoofdrol', openerNaam(world.coopRoster, true)) : (m.actief && m.stap ? `${openerNaam(world.coopRoster, true)}, volgende stap: ${m.stap}` : '');
      if (tekst && world.addMessage) world.addMessage(tekst, 6);
      return true;
    }
    case 'meedoen': { // de gastheer begint een opdracht: wil je meedoen? (#429)
      if (!n || n.role !== 'client') return false;
      const u = maakUitnodiging(body); if (!u) return false;
      world.coopUitnodiging = u.verplicht ? null : u; world.coopMeedoenNee = false;
      if (world.addMessage) world.addMessage(uitnodigingTekst(u, openerNaam(world.coopRoster, true)), u.verplicht ? 5 : Math.min(10, u.rest));
      return true;
    }
    case 'meedoenantwoord': { // de gast kiest (alleen de host luistert)
      if (!n || n.role !== 'host' || van < 1) return false;
      return meedoenAntwoord(n.meedoen, van, !!body.ja);
    }
    case 'uitslag': { // gelukt, mislukt of gestopt, van de gastheer (#371, #390)
      if (!n || n.role !== 'client' || typeof body.label !== 'string') return false;
      const naam = openerNaam(world.coopRoster, true);
      if (world.coopMeedoenNee) { world.coopMeedoenNee = false; if (world.addMessage) world.addMessage(`${body.label}: ${naam} heeft het zonder jou gedaan.`.slice(0, 160), 4); return true; } // je deed niet mee: geen deel (#429)
      const deel = Math.floor(Number(body.deel)) || 0;
      // gestopt (#390): de gastheer stopte de missie uit het pauzemenu, voor iedereen; het is geen mislukking
      const tekst = body.gestopt ? `${naam} heeft ${body.label} gestopt, voor iedereen. ${naam} kan hem opnieuw starten.` : body.ok ? `${body.label} gelukt! ${naam} en jij hebben het samen gedaan.${deel > 0 ? ` Jouw deel: €${deel.toLocaleString('nl-NL')}.` : ''}` : `${body.label} mislukt${body.reden ? ': ' + String(body.reden).slice(0, 60) : ''}. ${naam} probeert het misschien opnieuw.`;
      if (world.addMessage) world.addMessage(tekst.slice(0, 160), 5);
      return true;
    }
    case 'scene': { // wat de host op het scherm heeft: filmpje, regel, keuze (alleen kijken)
      if (!n || n.role !== 'client') return false;
      const sc = leesSceneBericht(body); if (!sc) return false;
      const was = !!(world.coopScene && world.coopScene.filmpje);
      world.coopScene = sceneLeeg(sc) ? null : sc;
      if (sc.filmpje && !was && world.addMessage && world.coopCutBezig == null) world.addMessage(filmpjeTekst(openerNaam(world.coopRoster, true)), 4);
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
    case 'hek': { // het spel is nog niet begonnen (aan) of begint nu (uit): de wachtkamer
      if (!n || n.role !== 'client') return false;
      hekBericht(world, body.aan);
      return true;
    }
    case 'gebruik': { // de gast drukte op E bij de host: als bijrijder in- of uitstappen (alleen plek 1, de metgezel)
      if (!n || n.role !== 'host' || van < 1) return false;
      if (van >= 2) return figGebruik(world, van); // de 3e en 4e speler stappen zelf in of uit (#372)
      world.coopGebruik = true;
      return true;
    }
    case 'bijgroep': return bijGroepHost(world, van); // een gast die los loopt wil terug bij de groep (#429)
    case 'wielvraag': { // de gast vraagt om het stuur; de bestuurder geeft het met Y
      if (!n || n.role !== 'host' || van !== 1) return false;
      if (body.terug) { if (wielLos(world) && world.addMessage) world.addMessage(WIEL_HOST_TEKST.terug(gastNaam(world, 1)), 4); return true; } // de bijrijder geeft het stuur terug
      const p = world.player, c = world.companion;
      if (!(p.inVehicle && c && c.inVehicle === p.inVehicle)) { if (world.coopMeld) world.coopMeld(1, WIEL_TEKST.geen); return false; }
      world.coopWielVraag = { slot: 1, tot: (Number(world.time) || 0) + WIEL_VERZOEK_S };
      if (world.addMessage) world.addMessage(WIEL_HOST_TEKST.gevraagd(gastNaam(world, 1)), 5);
      return true;
    }
    case 'wiel': { // de bestuurder geeft het stuur of neemt het terug
      if (!n || n.role !== 'client') return false;
      world.coopWiel = !!body.aan;
      if (world.addMessage) world.addMessage(body.aan ? WIEL_TEKST.gekregen(openerNaam(world.coopRoster, true)) : WIEL_TEKST.terug(openerNaam(world.coopRoster, true)), 4);
      return true;
    }
    case 'melding': { // een korte melding van de host, alleen voor jou
      if (!n || n.role !== 'client' || typeof body.tekst !== 'string') return false;
      if (world.addMessage) world.addMessage(body.tekst.slice(0, 90), 3.5);
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
      let betaald = Math.min(geld, MAX_REWARD);
      if (typeof body.vak === 'string' && body.vak) betaald = Math.min(MAX_REWARD, loopbaanGast(world, betaald, body.vak, Number(body.xp))); // eigen loonfactor en eigen punten (#381)
      world.money = (world.money || 0) + betaald;
      world.coopVerdiend = (world.coopVerdiend || 0) + betaald; // savegame.js zet dit in de eigen save van de gast
      if (world.addMessage) world.addMessage(`Beloning: €${betaald.toLocaleString('nl-NL')}`, 4);
      return true;
    }
    case 'weer': { // het weer van de host (coopweer.js): een gast stapt zijn eigen weermachine niet
      if (!n || n.role !== 'client') return false;
      const w = leesWeerEvent(body); if (!w) return false;
      world.weatherState = pasWeerToe(world.weatherState, w); return true;
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
      if (world.addMessage) world.addMessage(body.reden === 'spel gestopt' ? `${openerNaam(world.coopRoster, true)} heeft het spel gestopt. Je speelt weer in je eigen spel.` : `Je bent uit het spel van ${openerNaam(world.coopRoster)} gehaald.`, 4);
      stopCoopNet(world);
      return true;
    default: return false;
  }
}
// Een roepje op een toets (7 = Kom hier, 8 = Help!, 9 = Kijk daar): op je plek, of voor 'Kijk daar' een stuk vooruit (#367)
export function pingGebaar(world, soort = 'hier') {
  const plek = pingPlek(world.player, soort); if (!plek) return false;
  const ok = sendPing(world, plek.x, plek.y, soort);
  if (ok && world.addMessage) world.addMessage(`Je riep: ${PING_TEKST[soort] || PING_TEKST.hier}`, 2);
  return ok;
}
export function sendPing(world, x, y, soort = 'hier') {
  const n = world.coopNet; if (!n || !world.coopPings) return false;
  if (!addPing(world.coopPings, { x, y, soort, van: 'eigen' }, now(world))) return false;
  return n.role === 'host' ? n.hub.announce({ ...pingEvent(x, y, soort), van: 0 }) : n.session.sendEvent(pingEvent(x, y, soort));
}
// ---- de gast doet iets bij de host (#291, docs/COOP-GAST.md)
const gastNaam = (world, slot) => { const p = (world.coopRoster || []).find((x) => x && x.slot === slot); return (p && (p.naam || (charInfo(p.char) || {}).naam)) || 'De ander'; };
// E van de gast die niet bij een winkel of automaat was: de host laat zijn lichaam in- of uitstappen
export function gastGebruik(world) {
  const n = world.coopNet; if (!n || n.role !== 'client' || !n.joined) return false;
  return n.session.sendEvent({ k: 'gebruik' });
}
// Y: de host geeft het stuur aan zijn bijrijder (of neemt het terug), de gast vraagt erom
export function wielGebaar(world) {
  const n = world.coopNet; if (!n) return false;
  if (n.role === 'client') {
    if (!world.coopInVoertuig) { if (world.addMessage) world.addMessage(WIEL_TEKST.geen, 3); return false; }
    if (world.coopWiel) return n.session.sendEvent({ k: 'wielvraag', terug: true }); // je hebt het stuur: Y geeft het terug
    if (world.addMessage) world.addMessage(WIEL_TEKST.gevraagd, 3);
    return n.session.sendEvent({ k: 'wielvraag' });
  }
  const p = world.player, c = world.companion;
  if (!(p.inVehicle && c && c.inVehicle === p.inVehicle && world.coop && world.coop.remote) || p.inVehicle.isHeli || p.inVehicle.isPlane) return false;
  const naam = gastNaam(world, 1);
  if (world.coopWielSlot === 1) { wielLos(world); if (world.addMessage) world.addMessage(WIEL_HOST_TEKST.terug(naam), 4); return true; }
  world.coopWielSlot = 1; world.coopWielVraag = null;
  n.hub.announce({ k: 'wiel', aan: true }, 1);
  if (world.addMessage) world.addMessage(WIEL_HOST_TEKST.gegeven(naam), 4);
  return true;
}
// het stuur is weer van de bestuurder
export function wielLos(world) {
  const was = world.coopWielSlot != null;
  world.coopWielSlot = null;
  const n = world.coopNet;
  if (was && n && n.role === 'host') n.hub.announce({ k: 'wiel', aan: false }, 1);
  return was;
}

// Host: beloning voor één gast (slot) of voor alle gasten; elk bewaart hem in zijn eigen save.
export function payGuest(world, geld, slot = null, extra = null) {
  const n = world.coopNet; if (!n || n.role !== 'host') return false;
  return n.hub.announce({ k: 'beloning', geld: Math.max(0, Math.floor(geld)), ...(extra ? { vak: extra.vak, xp: extra.xp } : {}) }, slot);
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
// de gastheer start het spel: de wachtkamer is open, iedereen begint samen
export function openHek(world) {
  setGate(false);
  const n = world.coopNet;
  if (n && n.role === 'host' && n.hub) n.hub.announce({ k: 'hek', aan: false });
}
// genoeg spelers om te starten (de gastheer plus minstens een verbonden gast)
export function genoegSpelers(world, min = 2) {
  const n = world.coopNet;
  return !!(n && n.role === 'host' && n.hub && n.hub.roster.spelers.filter((p) => p.verbinding !== 'lost').length >= min);
}

// Samen spelen: staat er minstens één gast in de sessie, dan loopt de wereld van wie het spel opende door achter het pauzemenu, de kaart en de winkel.
// Alleen de lokale invoer staat dan stil (main.js zet input.blocked); alleen de pauze door een menu telt, geen filmpje, wachtscherm of minigame-scherm (#434).
export function coopWereldDoorloop(world, menuOpen = true) {
  return !!(menuOpen && world && world.paused && !world.coopHold && !world.uiPaused && world.coopRole === 'host' && genoegSpelers(world, 2));
}

export function stopCoopNet(world) {
  const n = world.coopNet; if (!n) return;
  setGate(false); // zonder samen spelen is er geen wachtkamer meer
  if (world.coopCutBezig != null) cutGastStop(world, null, true); // een scène van de gastheer stopt met het samen spelen
  if (n.role === 'host') { try { n.hub.announce({ k: 'weg', reden: 'spel gestopt' }); n.hub.closeAll(); } catch (e) { /* al weg */ } } else { try { if (n.session.status !== 'geweigerd' && n.session.status !== 'verbroken') n.session.leave(); } catch (e) { /* al weg */ } }
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
