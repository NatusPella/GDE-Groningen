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
import { ververs } from './spelersregister.js';
import { partnersInfo, createPings, addPing, tickPings, pingEvent } from './partnerhud.js';
import { holdBeleid, vereistVoor, leesLijstEvent, lijst } from './coopplayers.js';
import { cameraRelative, stepSlot2, sharedCamera } from './coop.js';
import { coopStep } from './coopglue.js';
import { gateOn, setGate, hekBericht } from './coopgate.js';
import { WIEL_TEKST, WIEL_HOST_TEKST, WIEL_VERZOEK_S, kanUitstappen } from './coopgast.js';
import { nieuwCutVerzamelaar, cutGastSpeel, cutGastStop, leesCutTijd, cutSpoor } from './coopcut.js';
import { verzamelExtra, codeerExtra, leesExtra, nieuwGeheugen, nieuweStand, pasExtraToe } from './coopextra.js';
import { wapenCode, aanvalCode, volgendeStoel, stapSprong, BUK_TEMPO } from './coopspeler.js';
import { getCombatEffect } from './combateffect.js';
import { wapenVan, wapenVerwerk, wapenWeg, wapenAllesWeg, wapenTick, gastWapenWeg } from './coopwapen.js';
import { voertuigId, verzamelEntiteiten, leesEntiteiten, missieBericht, leesMissieBericht, missieTekst, sceneBericht, leesSceneBericht, sceneLeeg, filmpjeTekst } from './coopworld.js';
import { verhaalRol, openerNaam, charInfo } from './coopplayers.js';
import { KLOK_EVERY, klokEvent, leesKlokEvent, KlokVolger } from './net/speelklok.js';
import { HASH_EVERY, viewOf, hashEvent, leesHashEvent, DesyncMonitor } from './net/desync.js';
import { PING_TOETSEN, PING_TEKST, pingPlek, pingMarkers, pingRegel } from './coopping.js';
import { spelersRijen, wegMelding } from './coopspelers.js';
import { maakMeedoen, opdrachtSleutel, begin as meedoenBegin, einde as meedoenEinde, antwoord as meedoenAntwoord, tik as meedoenTik, loopVrij, krijgtDeel, maakUitnodiging, uitnodigingTekst, toeschouwerTekst, LATE_GRENS, laat as meedoenLaat, bevestig as meedoenBevestig, meespelers } from './coopmeedoen.js';
import { stapVanMissie, geldigeStap, uitslagTekst } from './coopverhaal.js';
import { gastVerhaalStatus, gastVerhaalSchrijf, gastVerhaalHerlaad } from './savehook.js';
import { zetBezig, bezigVanEvent, leesBezigVan, bezigId } from './coopbezig.js';
import { WEER_EVERY, weerEvent, leesWeerEvent, pasWeerToe } from './coopweer.js';
import { loopbaanGast } from './loopbaanlive.js';
import { maakRegister, zetPlek, leegRegister, bouwFoci, losBesluit, FOCI_MAX, MAX_AFSTAND, ONGELADEN_S } from './coopfoci.js';
import { tileIndexOf, tileKey } from './gdt.js';
import { wisselEvent, wisselTik, zetCoopNet } from './coophostwisselnet.js'; // het spel overdragen (#439); die module importeert dit bestand terug, maar gebruikt het pas bij een aanroep
import { zachtAlleen, stemBegin, stemAntwoord, stemVerval, stemTik, stemEvent, stemUitslagEvent, stemAntwoordEvent, leesStemEvent, leesStemAntwoord, leesStemUitslag, stemVraagTekst, stemUitslagTekst, STEM_HOST } from './coopgroep.js';
import { zichtbaarWanted, GEZOCHT_TEKST, hudWanted } from './coopgezocht.js';
import { bustFineIn } from './economy.js';
import { gebeurtenisId, maakBoekhouding, samenwerkingsBonus, verdeelGelijk } from './coopbeloning.js'; // beloningen per gebeurtenis, één keer toegekend (#448)
import { teamDown } from './cooproles.js'; // een opdracht faalt pas als alle meespelers neer zijn (#452)
import { saveGame as bewaarNu } from './savehook.js';
import { wedHostTik, wedHandleGast, wedHandleHost, wedGastReset, zetWedHaken } from './coopwedstrijd.js';
import { wedKaartTik } from './coopwedstrijd3d.js';
import { maakPvp, wisselPassief, zetPassiefStand, verwijderSpeler, passiefEvent, passiefVanEvent, leesPassief, leesPassiefVan, pvpSchadeEvent, isPassief, PVP_TEKST } from './cooppvp.js'; // passieve stand en spelers tegen elkaar (#447)
import { pvpGastRaak, pvpDoodVerwerk } from './cooppvpwereld.js';
import { busCoopActie, busCoopValideerE } from './coopbus.js';
import { zetBestuurHaken, bestuurGebruik, bestuurTick, bestuurLos, bestuurAllesLos, bestuurt } from './coopbestuur.js';

export const CAPS = ['scene', 'spelers', 'snaptijd', 'pvp']; // wat dit spel kent; uitbreidbaar (net/session.js negotiate). snaptijd: de tijd van een snapshot (ms van de klok van de host) staat in de kop, #434
export const REMOVE_DELAY = 0.5; // s tussen "je bent verwijderd" en het verbreken
export const MAX_REWARD = 1000000;
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
  if (world.cameraOverride || world.pendingRespawn || p.ragdoll) return { ok: false, reason: 'Wacht tot het filmpje of het herstel klaar is.', filmpje: !!world.cameraOverride && !world.pendingRespawn && !p.ragdoll }; // filmpje: je eigen opening of scène, die je kunt overslaan (samenpanel.js)
  return { ok: true };
}

// Een passagier (de metgezel in het voertuig van de host) behoudt zijn eigen x en y van vóór het instappen; zijn plek is die van het voertuig.
const posOf = (b) => (b && b.inVehicle && Number.isFinite(b.inVehicle.x) && Number.isFinite(b.inVehicle.y) ? b.inVehicle : b);

// De springknop van de gast: ingedrukt, of net aangetikt (een tik korter dan een invoerpakket van 1/30 s gaat anders verloren)
function springKnop(n, inp, dt) {
  if (inp && inp.wasPressed && inp.wasPressed(' ')) n.springTik = 0.1;
  else if (n.springTik > 0) n.springTik -= dt;
  return !!(inp && inp.isDown && inp.isDown(' ')) || n.springTik > 0;
}

// Een extra speler in het voertuig van de gastheer krijgt een eigen stoel (2 en hoger; 0 is de bestuurder, 1 de bijrijder voorin, #434).
const vrijeStoel = (world, fig, v) => volgendeStoel(Object.values(figures(world)).filter((f) => f !== fig && f.inVeh === v).map((f) => f.stoel));

// De record van één speler in het snapshot: plek, hoogte (springen), bukken, het voertuig met stoel, en wapen en aanval van de gastheer (#434).
export function spelerRecord(world, b, slot) {
  if (!b) return b;
  const q = posOf(b), veh = b.inVehicle || b.inVeh;
  const vo = veh && typeof veh === 'object' ? veh : null, inV = !!veh;
  const r = { slot, x: q.x, y: q.y, z: b.z || 0, angle: q.angle || 0, alive: slot === 0 ? !world.pendingRespawn : slot === 1 ? b.state !== 'dead' : true, inVeh: inV, driver: (slot === 0 && inV) || bestuurt(b), run: false, health: 100,
    vehicle: vo ? voertuigId(vo, 0) : null, crouch: !inV && !!b.crouching, seat: slot === 0 || bestuurt(b) ? 0 : slot === 1 ? 1 : (b.stoel | 0) || 2, weapon: 0, attack: 0 };
  if (slot === 0 && !inV && !(b.swimming || b.vault)) { // wat de gastheer in de hand heeft en zijn laatste aanval: de gast tekent het op de figuur van de gastheer
    r.weapon = wapenCode(world.weapon);
    const fx = getCombatEffect(), a = world.coopAanval || (world.coopAanval = { start: null, teller: 0 });
    if (fx && fx.start !== undefined && fx.start !== a.start) { a.start = fx.start; a.teller++; }
    r.attack = aanvalCode(fx, world.time || 0, a.teller);
  } else if (slot >= 1 && !inV) { // een gast met een wapen: wat hij in de hand heeft en zijn laatste aanval (coopwapen.js, #434)
    const wv = wapenVan(world, slot);
    if (wv) { r.weapon = wapenCode(wv.w); r.attack = aanvalCode(wv.fx, world.time || 0, wv.teller); }
  }
  return r;
}

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
      const body = (b, slot) => spelerRecord(world, b, slot);
      const players = [body(p, 0), body(c, 1)];
      for (const s of roster().spelers) if (s.slot >= 2) players.push(body(figures(world)[s.slot], s.slot));
      const ents = verzamelEntiteiten(world, players.filter(Boolean), { treinen: hostTreinen() });
      return {
        players: players.filter(Boolean),
        shared: { money: world.money || 0, wanted: zichtbaarWanted(world), clock: Number(world.time) || 0 },
        mission: { stage: (world.mission && world.mission.index) | 0, state: world.mission && world.mission.phase === 'active' ? 'run' : 'none', present: 3 },
        // voertuigen dicht bij een speler en het doel van de opdracht: de gasten zien de wereld van de host
        entities: ents,
        looks: ents.looks, // het uiterlijk van een paar voertuigen (roulerend, #428)
      };
    },
    fullState() { return { wanted: zichtbaarWanted(world) }; }, // het geld van de host is van de host
    vergeet(slot) { geheugens.delete(slot); }, // een plek komt vrij: de volgende speler krijgt alles opnieuw te horen
    stats() { let looks = 0; for (const g of geheugens.values()) looks += g.looks.size; return { geheugens: geheugens.size, looks }; }, // voor de duurtest
  };
}

function prepareCoop(world) {
  if (!world.coop) bindCoop(world, world.input);
  world.coopPings = world.coopPings || createPings();
}
function endCoop(world) {
  bestuurAllesLos(world); wapenAllesWeg(world); gastWapenWeg(world); world.coopWapens = null; world.coopSchade = null; world.coopBoot = null; world.coopZit = null; // (#434) // een gast die stuurde laat het voertuig stil achter (#434)
  if (world.coop) { delete world.coop.leash; }
  if (world.coop) { world.coop.remote = false; world.coop.remoteInput = null; world.coop.fixedChars = false; if (world.coop.prevLocal !== undefined) { world.coop.local = world.coop.prevLocal; world.coop.prevLocal = undefined; } }
  world.players = null; world.coopPartner = null; world.coopPartners = []; world.coopRoster = null; world.coopFigures = {}; world.coopHost = null; world.coopExtra = null; world.coopHostMissie = null; world.coopCam = null; world.coopScene = null;
  world.coopVrijLopen = false; world.coopUitnodiging = null; world.coopMeedoenNee = false; world.coopMeedoenJa = null; // (#429)
  world.coopFoci = null; world.coopFociInfo = null; // spelers uit elkaar (#429)
  world.coopPvp = null; world.coopPvpSchade = null; world.coopPvpMeld = null; // (#447)
  world.coopBezigVan = {}; world.coopHudWanted = 0; // wie bezig is en de sterren in het scherm van de host (#429, #434)
  world.coopWanted = null; world.coopHeat = null; world.coopDoelwit = 0; world.coopWantedMeld = null; world.coopGepakt = null; world.coopStil = false; // (#434)
  if (world.companion) world.companion.coopWacht = false;
  world.coopOpdrachtDoor = null; // (#452)
  world.coopMeld = null; world.coopDeel = null; world.coopUitslag = null; world.coopPingMarks = []; world.coopSpelers = []; world.coopGebruik = false; world.coopWielSlot = null; world.coopWielVraag = null; world.coopWiel = false; world.coopInVoertuig = false; world.coopBestuurder = false; // (#291, #434)
  world.coopVraag = null; world.coopStem = null; world.coopStemBeantwoord = null; // gezamenlijke keuzes (#452)
  if (world.companion) { world.companion.coopUit = false; world.companion.coopBestuurt = false; }
}
// Per meespeler (wie ja zei of verplicht meedoet, en verbonden is): staat hij nog? Tessa (plek 1) is neer als ze dood is; een extra speler gaat niet neer.
function meedoendeStatus(world, n) {
  const verbonden = new Set(n.hub.roster.spelers.filter((s) => s.slot !== 0 && s.verbinding !== 'lost').map((s) => s.slot));
  return meespelers(n.meedoen).filter((s) => verbonden.has(s)).map((s) => (s === 1 ? !(world.companion && world.companion.state === 'dead') : true));
}
const now = (world) => (Number.isFinite(world.time) ? world.time : Date.now() / 1000);

// De gedeelde toestand zoals de host hem ziet en zoals een gast hem uit de snapshots opbouwt (net/desync.js)
export function hostView(world, info, roster) {
  const m = world.mission;
  return viewOf({ story: info.story, tiles: info.tiles, stage: (m && m.index) | 0, state: m && m.phase === 'active' ? 'run' : 'none', wanted: zichtbaarWanted(world), slots: [0, 1, ...roster.spelers.filter((s) => s.slot >= 2).map((s) => s.slot)] });
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
      nodigLaatUit(world, slot); // een opdracht loopt al: ook jij mag kiezen (#429)
      if (world.coopNet) { bezigVoorNieuwe(world, world.coopNet, slot); passiefVoorNieuwe(world, world.coopNet, slot); }
      const we = weerEvent(world.weatherState); if (we) hub.announce(we, slot); // het weer van de gastheer (#364)
      hub.announce({ k: 'hek', aan: gateOn() }, slot); // is het spel nog niet begonnen? dan wacht de nieuwe speler in de wachtkamer
      if (world.coopNet && world.coopNet.sceneNu && !sceneLeeg(world.coopNet.sceneNu)) hub.announce({ k: 'scene', ...world.coopNet.sceneNu }, slot); // wie midden in een filmpje aansluit, hoort het meteen
      if (slot >= 2) { const f = ensureFigure(world, slot, char); f.x = world.player.x + 1.5 * (slot - 1); f.y = world.player.y + 1.5; }
      if (fade) fade('in'); // de gast komt met een korte fade naast je staan
    },
    onLeave: (slot) => {
      bestuurLos(world, slot); bezigWeg(world, slot); wapenWeg(world, slot); passiefWeg(world, slot);
      if (world.coopWanted) delete world.coopWanted[slot]; // een gast die weggaat neemt zijn sterren mee (#434) // het voertuig van een gast die weggaat staat stil en de stoel is vrij (#434)
      if (slot === 1 && world.coop) { world.coop.remote = false; world.coop.remoteInput = null; }
      if (slot >= 2) removeFigure(world, slot);
    },
    onLost: (slot) => {
      bestuurLos(world, slot); bezigWeg(world, slot);
      if (slot === 1 && world.coop) { world.coop.remote = false; world.coop.remoteInput = null; }
      const f = slot >= 2 ? figures(world)[slot] : null; if (f) f.input = null;
      // pauze per speler (#452): de rest speelt door; alleen als de lopende opdracht deze speler echt nodig heeft pauzeert het spel
      const nn = world.coopNet, regel = world.coopStapRegel ? world.coopStapRegel() : null;
      const beleid = holdBeleid(slot, { vereist: vereistVoor(!!(nn && nn.meedoen && nn.meedoen.opdracht), regel, world.coopVereist || []) });
      if (beleid.pauze && onHold) onHold('host', slot, beleid.reden);
      else if (world.addMessage) world.addMessage(`${gastNaam(world, slot)} is weggevallen. ${beleid.reden}`, 5);
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
  world.coopVraag = (soort, tekst, naAkkoord, naNee) => stemStart(world, soort, tekst, naAkkoord, naNee); // een tijdsprong vraagt akkoord van alle anderen (#452)
  world.coopSchade = (slot, schade) => hub.announce({ k: 'schade', n: Math.round(Number(schade) || 0) }, slot); // een kogel van de politie raakt een gast (#434)
  // De gastheer gaat neer of wordt opgepakt: loopt de opdracht dan door? Ja zolang een meespeler (die ja zei, verbonden en niet neer) nog staat (#452).
  world.coopOpdrachtDoor = () => { const n = world.coopNet; if (!n || n.role !== 'host') return false; return !teamDown(meedoendeStatus(world, n)); };
  world.coopMeld = (slot, tekst) => hub.announce({ k: 'melding', tekst: String(tekst).slice(0, 90) }, slot); // een korte melding voor een gast (#291)
  world.coopPvp = maakPvp(); // iedereen begint op passief (#447)
  world.coopPvpSchade = (slot, schade, door) => hub.announce(pvpSchadeEvent(schade, door), slot); // schade van een medespeler aan een gast (#447)
  world.coopPvpMeld = (tekst, behalve) => { for (const s of hub.roster.spelers) if (s.slot !== 0 && s.slot !== behalve && s.verbinding !== 'lost') hub.announce({ k: 'melding', tekst: String(tekst).slice(0, 90) }, s.slot); };
  world.coopWanted = {}; world.coopHeat = {}; world.coopDoelwit = 0; // een gezocht-niveau per gast (#434, coopgezocht.js)
  world.coopWantedMeld = (slot, na, voor) => gezochtMelden(world, slot, na, voor);
  world.coopGepakt = (slot, level) => gastGepakt(world, slot, level);
  world.coopNet = { role: 'host', hub, fade, route, removing: {}, info, tKlok: 0, tHash: 0, tWeer: 0, tSpelers: 1, hashN: 0, scene, tScene: 0, filmpjeT: 0, sceneNu: null, meedoen: maakMeedoen(), foci: maakRegister() };
  return hub;
}

// Een gast kreeg een ster erbij of is de politie kwijt: hij en de host horen het (#434)
function gezochtMelden(world, slot, na, voor) {
  if (world.coopStil || na === voor) return;
  if (na > voor) { if (world.coopMeld) world.coopMeld(slot, GEZOCHT_TEKST.gast(na)); if (world.addMessage) world.addMessage(GEZOCHT_TEKST.host(gastNaam(world, slot), na), 4); }
  else if (na === 0 && world.coopMeld) world.coopMeld(slot, GEZOCHT_TEKST.kwijt);
}
// De politie pakt een gast (police.js updateBust met het gast als doelwit): zijn voertuig blijft stil achter, zijn niveau is weg, hij betaalt zijn boete in zijn eigen spel.
function gastGepakt(world, slot, level) {
  const n = world.coopNet; if (!n || n.role !== 'host') return false;
  bestuurLos(world, slot);
  world.wanted = 0; world.coopStil = true; // het niveau van het doelwit (politieMetDoelwit zet het terug op zijn plek)
  n.hub.announce({ k: 'gepakt', wanted: level | 0 }, slot);
  n.hub.announce({ k: 'melding', tekst: GEZOCHT_TEKST.gepakt(gastNaam(world, slot)) });
  return true;
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
  world.coopPvp = maakPvp(); // (#447)
  session.onevent = (b) => handleEvent(world, b, 0);
  session.onextra = (lading) => { const m = leesExtra(lading); if (m) { world.coopExtra = pasExtraToe(world.coopExtra || nieuweStand(), m, now(world)); world.coopExtraBytes = (world.coopExtraBytes || 0) + lading.length; } }; // de rest van de wereld van de host (#428, coopextra3d.js)
  // de host is de baas: bij een desync (net/desync.js) zet de gast zijn wanted weer gelijk aan dat van de host
  session.onresync = (st) => { if (st && Number.isFinite(st.wanted)) world.wanted = st.wanted | 0; };
  world.coopRole = 'client';
  world.coopNet = { role: 'client', wens, session, stash, fade, joined: false, fixed: false, route, info, klok: new KlokVolger(), desync: new DesyncMonitor(), lokaal: 0, tSpelers: 1 };
  return session;
}

// ---------------------------------------------------------------- elke frame
function stepFigures(world, dt) {
  const f = figures(world);
  for (const slot of Object.keys(f)) {
    const fig = f[slot];
    if (fig.coopBestuurt) continue; // een gast die zelf een voertuig bestuurt: bestuurTick (coopbestuur.js)
    if (fig.inVeh) { // een extra speler zit mee in het voertuig van de gastheer (#372)
      const v = fig.inVeh;
      if (world.player.inVehicle !== v || v.wrecked || v.sinking) figUit(world, fig);
      else { fig.x = v.x; fig.y = v.y; fig.angle = v.angle || 0; fig.vx = 0; fig.vy = 0; continue; }
    }
    if (fig.coopWedstrijd) { fig.vx = 0; fig.vy = 0; continue; } // hij rijdt een race tegen de anderen: zijn lichaam staat stil bij zijn kart (coopwedstrijd.js, #443)
    if (fig.wacht) { fig.vx = 0; fig.vy = 0; continue; } // de wereld rond hem wordt nog geladen (bandFiguren, #429)
    if (!fig.input) { fig.vx *= Math.max(0, 1 - 10 * dt); fig.vy *= Math.max(0, 1 - 10 * dt); continue; }
    const m = fig.input;
    const len = Math.hypot(m.mx, m.my), sx = len > 1 ? 1 / len : 1;
    const sp = stapSprong(fig.sprong || (fig.sprong = {}), m.buttons, dt); // springen en bukken (#434)
    fig.z = sp.z; fig.crouching = sp.bukt;
    const dir = cameraRelative({ x: m.mx * sx * (sp.bukt ? BUK_TEMPO : 1), y: m.my * sx * (sp.bukt ? BUK_TEMPO : 1), run: !!((m.buttons || 0) & 1) && !sp.bukt, active: !!(m.mx || m.my) }, m.yaw || 0);
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
  fig.inVeh = v; fig.coopVoertuig = true; fig.vx = 0; fig.vy = 0; fig.stoel = vrijeStoel(world, fig, v);
  return true;
}

// De lijst voor de spelerslijst (Tab en het pauzemenu): ook de gast kent alleen zijn eigen ping; die van de anderen kent alleen de gastheer (#377)
function bouwSpelers(world, n) {
  const host = n.role === 'host', p = world.player;
  const mijnSlot = host ? 0 : (n.session && n.session.slot) || 0;
  const rtt = (slot) => { if (host) { const s = n.hub.sessions.get(slot); return s && Number.isFinite(s.rtt) ? s.rtt * 1000 : null; } return slot === mijnSlot && n.session && Number.isFinite(n.session.rtt) ? n.session.rtt * 1000 : null; };
  const opdracht = host ? (world.mission && world.mission.phase === 'active' ? world.mission.label || 'opdracht' : null) : (world.coopHostMissie && world.coopHostMissie.actief ? world.coopHostMissie.label : null);
  world.coopSpelers = spelersRijen({ mijnSlot, roster: world.coopRoster || [], partners: world.coopPartners || [], mijn: p ? { x: p.x, y: p.y, inVoertuig: host ? !!p.inVehicle : !!world.coopInVoertuig, rijdt: host ? !!p.inVehicle && world.coopWielSlot == null : !!world.coopWiel } : null, rtt, opdracht, pvp: world.coopPvp });
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

zetBestuurHaken({ los: (w, slot, x, y) => losVoor(w, slot, x, y), bijGroep: (w, lichaam, a) => zetBijGroep(w, lichaam, a) }); // voor coopbestuur.js
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
  if (c && world.coop && world.coop.remote && (!c.inVehicle || bestuurt(c)) && !weg.has(1)) zetPlek(n.foci, 1, c.x, c.y);
  for (const fig of Object.values(figures(world))) if ((!fig.inVeh || bestuurt(fig)) && !weg.has(fig.slot)) zetPlek(n.foci, fig.slot, fig.x, fig.y);
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
      if (plek) { fig.inVeh = v; fig.coopVoertuig = true; fig.stoel = vrijeStoel(world, fig, v); fig.x = v.x; fig.y = v.y; if (world.coopMeld) world.coopMeld(fig.slot, 'Je rijdt mee. Met E stap je uit als het voertuig stilstaat.'); continue; } // is er plek, dan zit hij weer in het voertuig (geen eindeloos terugzetten)
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
  const r = n.hub.announce({ k: 'uitslag', ok: !!ok, ...(gestopt ? { gestopt: true } : null), label: String(label || '').slice(0, 60), reden: String(reden || '').slice(0, 60), deel: ok ? deelBedrag(n, loon) : 0 });
  // een gelukte verhaalopdracht telt ook in het eigen verhaal van wie hem meespeelde (#429): alleen wie ja zei, niet wie nee zei of niet werd gevraagd
  if (ok && !gestopt && n.meedoen && n.meedoen.stap) for (const slot of meespelers(n.meedoen)) if (slot >= 1) n.hub.announce({ k: 'verhaalstap', stap: n.meedoen.stap, label: String(label || '').slice(0, 60) }, slot);
  return r;
}

// Een nieuwe opdracht van de gastheer: elke gast krijgt "Meedoen?" (#429). Verplicht waar de stap de gast-hoofdrol nodig heeft
// (world.coopStapRegel: haak die de coöp-regel van de huidige verhaalstap geeft, cooproles.js coopRule; zonder haak is meedoen vrij).
function nodigUit(world, n, huidig) {
  const sl = opdrachtSleutel(huidig && { actief: true, ...huidig });
  if (sl === (n.meedoen.opdracht || null)) return;
  if (!sl) { meedoenEinde(n.meedoen); return; }
  const regel = world.coopStapRegel ? world.coopStapRegel() : null;
  const slots = n.hub.roster.spelers.filter((s) => s.slot !== 0 && s.verbinding !== 'lost').map((s) => s.slot);
  const stap = stapVanMissie(huidig.index); // een verhaalopdracht: de gast ziet of hij hem al deed of dat zijn verhaal meespringt (#429)
  for (const u of meedoenBegin(n.meedoen, sl, slots, regel, stap)) n.hub.announce({ k: 'meedoen', label: String(huidig.label || '').slice(0, 80), verplicht: u.verplicht, sec: u.sec, ...(stap ? { stap } : null) }, u.slot);
}
// Een gast die laat aansluit terwijl een opdracht loopt krijgt dezelfde uitnodiging als wie erbij was, na de melding wat er speelt (#429).
function nodigLaatUit(world, slot) {
  const n = world.coopNet, m = n && n.missie; if (!m || !n.meedoen || !n.meedoen.opdracht) return false;
  const u = meedoenLaat(n.meedoen, slot, world.coopStapRegel ? world.coopStapRegel() : null, m.lateInstap !== false); if (!u) return false;
  if (u.toeschouwer) return n.hub.announce({ k: 'toeschouwer', label: String(m.label || '').slice(0, 80) }, slot); // een race, kluis of klok: je kijkt mee tot de volgende (#452)
  return n.hub.announce({ k: 'meedoen', label: String(m.label || '').slice(0, 80), verplicht: u.verplicht, sec: u.sec, ...(n.meedoen.stap ? { stap: n.meedoen.stap } : null) }, slot);
}
// Wie hengelt, pannenkoeken bakt of de beiaard speelt: bewaar het per plek en geef het door aan de andere gasten (#429).
function bezigMelden(world, n, slot, a) {
  if (!zetBezig(world, slot, a)) return false;
  for (const s of n.hub.roster.spelers) if (s.slot !== 0 && s.slot !== slot && s.verbinding !== 'lost') n.hub.announce(bezigVanEvent(slot, bezigId(a)), s.slot);
  return true;
}
// Een gast die aansluit hoort wie er al bezig is; een gast die weggaat is niet meer bezig.
function bezigVoorNieuwe(world, n, slot) { for (const [s, e] of Object.entries(world.coopBezigVan || {})) if (+s !== slot) n.hub.announce(bezigVanEvent(+s, e.a), slot); }
// De passieve stand (#447): de gast vraagt, de host bewaart en geeft door; een gast die aansluit hoort de standen, een gast die weggaat is weer passief.
function passiefDoorgeven(world, n, slot) {
  const a = isPassief(world.coopPvp, slot);
  for (const s of n.hub.roster.spelers) if (s.slot !== 0 && s.verbinding !== 'lost') n.hub.announce(passiefVanEvent(slot, a), s.slot);
}
function passiefVoorNieuwe(world, n, slot) { for (const s of Object.keys((world.coopPvp || {}).actief || {})) if (+s !== slot) n.hub.announce(passiefVanEvent(+s, false), slot); }
function passiefWeg(world, slot) {
  const n = world.coopNet; if (!world.coopPvp) return;
  const was = !isPassief(world.coopPvp, slot); verwijderSpeler(world.coopPvp, slot);
  if (was && n && n.role === 'host') passiefDoorgeven(world, n, slot);
}
// De knop in het spelersoverzicht, voor host en gast. Geeft { ok, passief, rest }; bij een gast komt de echte stand terug als antwoord van de host (passiefvan).
export function zetPassiefGebaar(world, passief) {
  const n = world.coopNet, st = world.coopPvp; if (!n || !st) return { ok: false, passief: true, rest: 0 };
  if (n.role === 'host') {
    const r = wisselPassief(st, 0, passief, now(world));
    if (r.ok && !r.zelfde) { passiefDoorgeven(world, n, 0); if (world.addMessage) world.addMessage(r.passief ? PVP_TEKST.passiefAan : PVP_TEKST.passiefUit, 4); }
    else if (!r.ok && world.addMessage) world.addMessage(PVP_TEKST.wacht(r.rest), 3);
    return r;
  }
  const slot = (n.session && n.session.slot) || 1, ik = isPassief(st, slot);
  if (!n.session || !(n.session.caps || []).includes('pvp')) { if (world.addMessage) world.addMessage(PVP_TEKST.nietBeschikbaar, 3); return { ok: false, passief: ik, rest: 0 }; }
  if (ik === !!passief) return { ok: true, passief: ik, rest: 0, zelfde: true };
  try { n.session.sendEvent(passiefEvent(passief)); } catch (e) { return { ok: false, passief: ik, rest: 0 }; }
  return { ok: true, passief: ik, rest: 0, gevraagd: true };
}
export const kanPassiefKiezen = (world) => { const n = world.coopNet; return !!n && !!world.coopPvp && (n.role === 'host' || !!(n.session && (n.session.caps || []).includes('pvp'))); };
export const passiefStandVan = (world) => { const n = world.coopNet; return n && world.coopPvp ? isPassief(world.coopPvp, n.role === 'host' ? 0 : (n.session && n.session.slot) || 1) : true; };
function bezigWeg(world, slot) { const n = world.coopNet; if (n && n.role === 'host') bezigMelden(world, n, slot, null); }
// ---- gezamenlijke keuzes (#452, coopgroep.js): een tijdsprong (slapen, onderduiken) gebeurt pas als alle andere spelers J zeggen.
// Geen antwoord binnen STEM_SEC seconden is nee. Wie weggaat tijdens de stemming telt niet meer mee. De host stemt niet: wie het vraagt is akkoord.
const verbondenGasten = (n) => n.hub.roster.spelers.filter((s) => s.slot !== 0 && s.verbinding !== 'lost').map((s) => s.slot);
function stemStart(world, soort, tekst, naAkkoord, naNee) {
  const n = world.coopNet; if (!n || n.role !== 'host') return false;
  if (n.stem) { if (world.addMessage) world.addMessage(STEM_HOST.bezig, 3); return false; }
  const st = stemBegin((n.stemTeller = (n.stemTeller | 0) + 1), soort, tekst, verbondenGasten(n));
  if (st.uitslag === 'ja') { if (naAkkoord) naAkkoord(); return true; } // niemand meer te vragen
  n.stem = { st, ok: naAkkoord || null, nee: naNee || null };
  for (const slot of Object.keys(st.keuze).map(Number)) n.hub.announce(stemEvent(st), slot);
  if (world.addMessage) world.addMessage(STEM_HOST.wacht, 4);
  return true;
}
function stemTikHost(world, n, dt) {
  const s = n.stem, st = s.st, nu = new Set(verbondenGasten(n));
  for (const slot of Object.keys(st.keuze).map(Number)) if (!nu.has(slot)) stemVerval(st, slot);
  stemTik(st, dt);
  if (!st.uitslag) return;
  n.stem = null;
  const ok = st.uitslag === 'ja';
  for (const slot of nu) n.hub.announce(stemUitslagEvent(st.id, ok, st.reden), slot);
  if (world.addMessage) world.addMessage(stemUitslagTekst(ok, st.reden), 4);
  const f = ok ? s.ok : s.nee;
  if (f) { try { f(); } catch (e) { console.error('stem', e); } }
}
// De gast antwoordt op de stemming (J of N).
export function gastStem(world, ja) {
  const n = world.coopNet, q = world.coopStem; if (!n || n.role !== 'client' || !n.joined || !q) return false;
  world.coopStem = null; world.coopStemBeantwoord = q.id;
  if (world.addMessage) world.addMessage(ja ? 'Je stemde ja.' : 'Je stemde nee.', 3);
  return n.session.sendEvent(stemAntwoordEvent(q.id, ja));
}
// De gast antwoordt op de uitnodiging (J of N): een bericht naar de gastheer.
export function gastMeedoen(world, ja) {
  const n = world.coopNet, u = world.coopUitnodiging; if (!n || n.role !== 'client' || !n.joined || !u || u.verplicht) return false;
  world.coopUitnodiging = null; world.coopMeedoenNee = !ja; world.coopMeedoenJa = ja && u.stap ? u.stap : null;
  if (world.addMessage) world.addMessage(ja ? 'Je doet mee.' : 'Je doet niet mee: je loopt vrij rond. Beloning en voortgang van deze opdracht zijn niet voor jou.', 4);
  return n.session.sendEvent({ k: 'meedoenantwoord', ja: !!ja });
}

// Wie deelt in de beloning van deze opdracht: alle verbonden gasten die meedoen (wie nee zei, niet antwoordde of wegviel niet).
const deelSlots = (n) => n.hub.roster.spelers.filter((s) => s.slot !== 0 && s.verbinding !== 'lost' && krijgtDeel(n.meedoen, s.slot)).map((s) => s.slot);
// Het deel van één gast bij dit bedrag (laagste deel; de rest gaat naar de eerste deelnemers): gelijk verdeeld over host en meespelers, na de bonus.
const deelBedrag = (n, bedrag) => { const sl = deelSlots(n); if (!sl.length) return 0; const alle = [0, ...sl], v = verdeelGelijk(samenwerkingsBonus(bedrag, alle.length).totaal, alle); return Math.min(...sl.map((x) => v[x] || 0)); };

// Missies, bijbanen en prijzen van de gastheer: het totaal (met samenwerkingsbonus bij twee of meer spelers) wordt gelijk verdeeld over
// alle meespelers, de gastheer inbegrepen (#452). Elke gast krijgt zijn deel in zijn eigen portemonnee (#365); de gastheer kreeg het hele
// bedrag al en krijgt hier het verschil met zijn deel erbij of eraf. Met één speler verandert er niets.
// info (loopbaan, #381): { vak, basis, xp }. basis is het bedrag voor de loonfactor van de gastheer; de gast verdient daar op zijn eigen
// apparaat zijn eigen factor over; zijn loopbaanpunten volgen dezelfde verhouding.
export function deelMetGasten(world, bedrag, info = null) {
  const n = world.coopNet; if (!n || n.role !== 'host') return 0;
  const basis = Math.floor(info && Number(info.basis) > 0 ? Number(info.basis) : Number(bedrag));
  if (!(basis >= 1)) return 0;
  const slots = deelSlots(n).filter((s) => !(info && Array.isArray(info.slots)) || info.slots.includes(s)); if (!slots.length) return 0; // info.slots: alleen wie aan de dienst meedoet (bus, #444)
  const alle = [0, ...slots];
  const totaal = samenwerkingsBonus(basis, alle.length), deel = verdeelGelijk(totaal.totaal, alle), zonder = verdeelGelijk(basis, alle);
  // de gastheer: zijn echte verdienste (na zijn loonfactor) krijgt dezelfde verdeling
  const echt = Math.max(0, Math.floor(Number(bedrag) || 0)), hostDeel = verdeelGelijk(samenwerkingsBonus(echt, alle.length).totaal, alle)[0] || 0, hostZonder = verdeelGelijk(echt, alle)[0] || 0;
  const verschil = hostDeel - echt;
  if (verschil && Number.isFinite(world.money)) world.money = Math.max(0, world.money + verschil);
  if (hostDeel > hostZonder && world.addMessage) world.addMessage(`Samenwerkbonus: €${(hostDeel - hostZonder).toLocaleString('nl-NL')}`, 4);
  let k = 0;
  const id = gebeurtenisId(n.sessieId || (n.sessieId = Math.random().toString(36).slice(2, 8)), 'b', n.beloningTeller = (n.beloningTeller || 0) + 1); // één id per gebeurtenis, voor alle gasten (#448)
  for (const slot of slots) {
    const geld = Math.min(deel[slot] || 0, MAX_REWARD); if (!(geld >= 1)) continue;
    const extra = info && typeof info.vak === 'string' && info.vak ? { vak: info.vak.slice(0, 20), xp: Math.max(0, Math.round((Number(info.xp) || 0) * (deel[slot] || 0) / basis)) } : null;
    if (payGuest(world, geld, slot, extra, id, Math.max(0, (deel[slot] || 0) - (zonder[slot] || 0)))) k++;
  }
  return k;
}

export function tickCoopNet(world, dt) {
  if (world.coopWissel) wisselTik(world, dt); // het spel overdragen (#439): ook als de sessie even weg is
  const n = world.coopNet; if (!n) return;
  if (world.coopPings) {
    tickPings(world.coopPings, now(world));
    if (!world.paused && !world.uiPaused && !world.coopHold && world.input && world.input.wasPressed && (n.role === 'host' || n.joined)) for (const k of PING_TOETSEN) if (world.input.wasPressed(k.toets)) pingGebaar(world, k.soort); // 7, 8, 9 (#367)
    world.coopPingMarks = pingMarkers(world.coopPings, world.coopRoster, n.role === 'client' && n.session ? n.session.slot : 0, now(world));
  }
  n.tSpelers += dt;
  if (n.tSpelers >= 0.25) { n.tSpelers = 0; bouwSpelers(world, n); }
  if (n.role === 'host') wedHostTik(world, dt); // een uitnodiging voor een race of minigame loopt af (#443)
  wedKaartTik(world, dt); // Meedoen? J of N en de uitslag met een rematch
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
    const m = makeClientInput(inp && inp.axis ? inp.axis() : [0, 0], !!(inp && inp.isDown && inp.isDown('shift')), world.camYaw, !!((world.coopWiel || world.coopBestuurder || world.coopWedstrijd) && inp && inp.isDown && inp.isDown(' ')), !world.coopInVoertuig && springKnop(n, inp, dt), !world.coopInVoertuig && !!(inp && inp.isDown && inp.isDown('control')), !world.coopInVoertuig && !!world.coopAanvalKnop, !world.coopInVoertuig && !!world.coopZichtKnop); // zicht: de kijker van het jachtgeweer; // springen en bukken te voet, de aanvalsknop met een wapen (#434)
    if (inp && inp.wasPressed && inp.wasPressed('y')) wielGebaar(world); // Y: om het stuur vragen (#291)
    if (inp && inp.wasPressed && inp.wasPressed('b') && !world.paused) bijGroepGebaar(world); // B: bij de groep komen (#429)
    if ((world.coopScene && world.coopScene.filmpje) || world.paused) s.setInput(0, 0, 0, m.yaw); // de gastheer kijkt een filmpje, of de gast zit zelf in een menu, de kaart of een winkel: zijn figuur staat stil (#373)
    else s.setInput(m.mx, m.my, m.buttons, m.yaw);
    s.tick(dt);
    n.lokaal += dt;
    const stem = world.coopStem; // een stemming over een tijdsprong gaat voor Meedoen (#452)
    if (stem) { stem.rest -= dt; if (stem.rest <= 0) world.coopStem = null; else if (inp && inp.wasPressed) { if (inp.wasPressed('j')) gastStem(world, true); else if (inp.wasPressed('n')) gastStem(world, false); } }
    const uit = world.coopStem ? null : world.coopUitnodiging; // Meedoen met deze opdracht? J of N; zonder antwoord kijkt de gast mee (#429, #452)
    if (uit) { if (uit.status === 'vooruit') uit.rest -= dt; if (uit.status === 'vooruit' && uit.rest <= 0) gastMeedoen(world, false); /* een spoilerwaarschuwing zonder antwoord is nee; een gewone uitnodiging blijft staan: geen antwoord is nee (#452) */ else if (world.coopWisselUi && world.coopWisselUi.vraag) world.coopUitnodiging = null; /* een vraag om het spel over te nemen gaat voor: J en N zijn van die vraag (je doet dan mee) */ else if (inp && inp.wasPressed) { if (inp.wasPressed('j')) gastMeedoen(world, true); else if (inp.wasPressed('n')) gastMeedoen(world, false); } }
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
      world.coopBestuurder = !!(ik && ik.inVeh && ik.driver); // je zit zelf achter het stuur van een voertuig bij de host (#434): Spatie is de handrem
      if (!world.coopInVoertuig) world.coopWiel = false;
      world.coopHost = sample ? leesEntiteiten(sample.entities) : { voertuigen: [], doelen: [], voetgangers: [], treinen: [] };
      const mijnVoertuig = ik && ik.inVeh && ik.vehicle != null ? world.coopHost.voertuigen.find((q) => q.id === ik.vehicle) : null; // het voertuig van de host waar de gast in zit
      world.coopZit = mijnVoertuig ? mijnVoertuig.soort : null; // de soort, voor het geluid in de cabine (sfx/ambience.js, #434)
      world.coopBoot = mijnVoertuig && mijnVoertuig.soort === 'boot' ? { x: mijnVoertuig.x, y: mijnVoertuig.y, speed: Math.abs(mijnVoertuig.snelheid || 0) } : null; // zit hij in een boot, dan kan hij vanaf het water hengelen (hengelen.js, #434)
      if (sample && rails) { if (rails.zetTreinenVanHost) rails.zetTreinenVanHost(world.coopHost.treinen); else for (const t of world.coopHost.treinen) rails.zetTreinVanHost(t.route, t.x, t.y, t.v); } // de gast speelt geen eigen dienstregeling: de treinen staan waar de host ze heeft
      world.coopPartners = partnersInfo(s.slot, sample ? sample.players : [], world.coopRoster || []); ververs(world, s.slot); // register world.players (#446)
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
  bestuurTick(world, dt); // gasten die een voertuig besturen (#434)
  wapenTick(world, dt); // gasten met een wapen slaan en schieten (#434)
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
  world.coopHudWanted = world.coopWanted ? hudWanted(world) : 0; // de sterren van een gezochte gast in het scherm van de host (#434)
  meldNeer(world, n); // de gastheer of Tessa gaat neer of wordt gearresteerd (#369)
  for (const slot of meedoenTik(n.meedoen, dt)) world.coopMeld && world.coopMeld(slot, 'Je doet mee.');
  if (n.stem) stemTikHost(world, n, dt);
  const c = world.companion;
  const players = [c ? { slot: 1, x: posOf(c).x, y: posOf(c).y, angle: posOf(c).angle, alive: c.state !== 'dead', inVeh: !!c.inVehicle } : null, ...Object.values(figures(world)).map((f) => ({ slot: f.slot, x: f.x, y: f.y, angle: f.angle, alive: true, inVeh: !!f.inVeh }))].filter(Boolean);
  world.coopPartners = partnersInfo(0, players, world.coopRoster || []); ververs(world, 0); // register world.players (#446)
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
    case 'wed': return wedHandleHost(world, body); // een wedstrijd tegen elkaar van de host: uitnodiging, start, stand, uitslag (#443, coopwedstrijd.js)
    case 'wedgast': return wedHandleGast(world, body, van); // het antwoord van een gast op die wedstrijd (alleen de host luistert)
    case 'wapen': return !!n && n.role === 'host' && van >= 1 && wapenVerwerk(world, van, body); // een gast kiest zijn wapen (zijn eigen patronen): de host rekent zijn aanval uit (#434)
    case 'passief': { // een gast wil omschakelen: de host beslist (afkoeling) en geeft de echte stand door aan iedereen (#447)
      const r = leesPassief(body); if (!r || !n || n.role !== 'host' || van < 1 || !world.coopPvp) return false;
      const w = wisselPassief(world.coopPvp, van, r.passief, now(world));
      if (world.coopMeld) { if (!w.ok) world.coopMeld(van, PVP_TEKST.wacht(w.rest)); else if (!w.zelfde) world.coopMeld(van, w.passief ? PVP_TEKST.passiefAan : PVP_TEKST.passiefUit); }
      passiefDoorgeven(world, n, van);
      return w.ok;
    }
    case 'passiefvan': { // van de host: de stand van een speler
      const r = leesPassiefVan(body); if (!r || !n || n.role !== 'client' || !world.coopPvp) return false;
      return zetPassiefStand(world.coopPvp, r.slot, r.passief);
    }
    case 'pvpdood': return pvpDoodVerwerk(world, body, van); // een gast is door een medespeler neergegaan en staat weer op (#447)
    case 'schade': { // een kogel van de politie raakte jou in het spel van de host: de schade is van jou, je valt hierdoor niet om (#434)
      if (!n || n.role !== 'client' || !Number.isFinite(body.n)) return false;
      if (body.door !== undefined) return pvpGastRaak(world, body, (n.session && n.session.slot) || 1); // een medespeler raakte jou: wel neergaan, zonder kosten (#447)
      let d = Math.max(0, Math.min(30, body.n));
      if ((world.armor || 0) > 0) { const a = Math.min(world.armor, d); world.armor -= a; d -= a; }
      world.health = Math.max(1, (world.health === undefined ? 100 : world.health) - d);
      return true;
    }
    case 'bezig': return !!n && n.role === 'host' && van >= 1 && bezigMelden(world, n, van, body.a); // een gast hengelt, bakt of speelt de beiaard: de anderen zien het (#429)
    case 'bezigvan': { // van de host: een andere gast is bezig (of niet meer)
      const b = leesBezigVan(body); if (!n || n.role !== 'client' || !b) return false;
      zetBezig(world, b.slot, b.a); return true;
    }
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
      const u = maakUitnodiging(body, geldigeStap(body.stap) ? gastVerhaalStatus(world, body.stap) : null); if (!u) return false;
      world.coopUitnodiging = u.verplicht ? null : u; world.coopMeedoenNee = !u.verplicht; world.coopMeedoenJa = null; // geen antwoord is nee (#452)
      if (world.addMessage) world.addMessage(uitnodigingTekst(u, openerNaam(world.coopRoster, true)), u.verplicht ? 5 : Math.min(u.status === 'vooruit' ? 30 : 10, u.rest));
      if (u.status === 'vooruit' && !u.verplicht && n.session) n.session.sendEvent({ k: 'meedoenwacht' }); // geen standaard-ja bij een spoilerwaarschuwing
      return true;
    }
    case 'meedoenwacht': { // de gast moet een spoilerwaarschuwing bevestigen (alleen de host luistert)
      if (!n || n.role !== 'host' || van < 1) return false;
      return meedoenBevestig(n.meedoen, van);
    }
    case 'verhaalstap': { // de opdracht is gelukt en jij speelde mee: de verhaalstap komt in je eigen opgeslagen spel (#429)
      if (!n || n.role !== 'client' || world.coopMeedoenNee) return false;
      const stap = geldigeStap(body.stap); if (!stap) return false;
      const was = gastVerhaalStatus(world, stap);
      if (was === 'vooruit' && world.coopMeedoenJa !== stap) return false; // zonder je J springt je verhaal niet mee
      const r = was === 'gedaan' ? null : gastVerhaalSchrijf(world, stap);
      const label = typeof body.label === 'string' ? body.label.slice(0, 60) : stap;
      const tekst = r ? uitslagTekst(r.status, label, r.overgeslagen, r.bonus) : was === 'gedaan' ? uitslagTekst('gedaan', label) : '';
      if (tekst && world.addMessage) world.addMessage(tekst.slice(0, 200), 6);
      world.coopMeedoenJa = null;
      return !!r;
    }
    case 'stem': { // de host wil de tijd laten verspringen: akkoord? J of N (#452)
      if (!n || n.role !== 'client') return false;
      const q = leesStemEvent(body); if (!q) return false;
      world.coopStem = q; world.coopUitnodiging = null;
      if (world.addMessage) world.addMessage(stemVraagTekst(q.tekst), Math.min(30, q.rest));
      return true;
    }
    case 'stemantwoord': { // de gast antwoordt (alleen de host luistert)
      const a = leesStemAntwoord(body); if (!a || !n || n.role !== 'host' || van < 1 || !n.stem || n.stem.st.id !== a.id) return false;
      return stemAntwoord(n.stem.st, van, a.ja);
    }
    case 'stemuitslag': { // de stemming is klaar (van de host)
      const u = leesStemUitslag(body); if (!u || !n || n.role !== 'client' || !((world.coopStem && world.coopStem.id === u.id) || world.coopStemBeantwoord === u.id)) return false; // ook wie al antwoordde hoort de uitslag
      world.coopStem = null; world.coopStemBeantwoord = null;
      if (world.addMessage) world.addMessage(stemUitslagTekst(u.ok, u.reden), 4);
      return true;
    }
    case 'meedoenantwoord': { // de gast kiest (alleen de host luistert)
      if (!n || n.role !== 'host' || van < 1) return false;
      // een J op een opdracht zonder late instap, na het begin, is te laat: toeschouwer tot de volgende (#452)
      if (body.ja && n.missie && n.missie.lateInstap === false && (n.meedoen.sinds || 0) > LATE_GRENS && n.meedoen.keuze[van] === 'wacht') {
        meedoenAntwoord(n.meedoen, van, false);
        return n.hub.announce({ k: 'toeschouwer', label: String(n.missie.label || '').slice(0, 80) }, van);
      }
      return meedoenAntwoord(n.meedoen, van, !!body.ja);
    }
    case 'toeschouwer': { // de host laat je niet meer instappen: je kijkt mee en krijgt geen deel (#452)
      if (!n || n.role !== 'client' || typeof body.label !== 'string') return false;
      world.coopUitnodiging = null; world.coopMeedoenNee = true; world.coopMeedoenJa = null;
      if (world.addMessage) world.addMessage(toeschouwerTekst(body.label), 6);
      return true;
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
      if (busCoopValideerE(world, van)) return true; // het hulpje in de bus valideert een kaartje (#444)
      if (bestuurGebruik(world, van).gedaan) return true; // een vrij voertuig bij de gast: hij stapt in als bestuurder, of uit (#434)
      if (van >= 2) return figGebruik(world, van); // de 3e en 4e speler stappen zelf in of uit (#372)
      world.coopGebruik = true;
      return true;
    }
    case 'bus': return !!n && n.role === 'host' && van >= 1 && (body.a === 'deur' || body.a === 'valideer') && busCoopActie(world, van, body.a); // O en E van een medespeler in de bus (#444)
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
    case 'gepakt': { // de politie pakte jou in het spel van de host: je betaalt een deel van je geld, in je eigen spel (#434)
      if (!n || n.role !== 'client') return false;
      const boete = Math.max(0, Math.floor(bustFineIn(Math.max(1, Math.min(5, body.wanted | 0)), world.money || 0, null)));
      world.money = Math.max(0, (world.money || 0) - boete);
      if (world.addMessage) world.addMessage(`Gepakt door de politie. Boete: €${boete.toLocaleString('nl-NL')}.`, 5);
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
      if (typeof body.id === 'string' && body.id) { // dezelfde gebeurtenis geeft nooit twee keer geld (#448)
        const boek = world.coopBoek || (world.coopBoek = maakBoekhouding());
        if (!boek.claim(body.id.slice(0, 48))) return false;
      }
      let betaald = Math.min(geld, MAX_REWARD);
      if (typeof body.vak === 'string' && body.vak) betaald = Math.min(MAX_REWARD, loopbaanGast(world, betaald, body.vak, Number(body.xp))); // eigen loonfactor en eigen punten (#381)
      world.money = (world.money || 0) + betaald;
      world.coopVerdiend = (world.coopVerdiend || 0) + betaald; // savegame.js zet dit in de eigen save van de gast
      if (world.addMessage) world.addMessage(`Beloning: €${betaald.toLocaleString('nl-NL')}`, 4);
      const bonus = Math.min(MAX_REWARD, Math.floor(Number(body.bonus)) || 0);
      if (bonus >= 1 && world.addMessage) world.addMessage(`Samenwerkbonus: €${bonus.toLocaleString('nl-NL')}`, 4); // een regel in de uitbetaling (#452)
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
      if (world.addMessage) world.addMessage(wegMelding(body.reden, openerNaam(world.coopRoster, body.reden === 'spel gestopt')), 6);
      stopCoopNet(world);
      return true;
    default: return typeof body.k === 'string' && body.k.startsWith('hw-') ? wisselEvent(world, body, van) : false; // het spel overdragen (#439)
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
// O van de gast in een bus van de host: de deuren (als hulpje of chauffeur), #444
export function gastBus(world, a = 'deur') {
  const n = world.coopNet; if (!n || n.role !== 'client' || !n.joined) return false;
  return n.session.sendEvent({ k: 'bus', a });
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
export function payGuest(world, geld, slot = null, extra = null, id = null, bonus = 0) {
  const n = world.coopNet; if (!n || n.role !== 'host') return false;
  const ok = n.hub.announce({ k: 'beloning', geld: Math.max(0, Math.floor(geld)), ...(extra ? { vak: extra.vak, xp: extra.xp } : {}), ...(typeof id === 'string' && id ? { id: id.slice(0, 48) } : {}), ...(bonus >= 1 ? { bonus: Math.floor(bonus) } : {}) }, slot);
  if (ok) { // wat elke gast in deze sessie verdiende: het gaat mee in de momentopname van het overdragen (#439, gastGeld); het geld zelf staat in de save van de gast
    const b = n.betaald || (n.betaald = {}), g = Math.max(0, Math.floor(geld));
    for (const s of slot != null ? [slot] : n.hub.roster.spelers.filter((x) => x.slot !== 0).map((x) => x.slot)) b[s] = (b[s] || 0) + g;
  }
  return ok;
}
zetWedHaken({ betaalGast: (world, slot, geld, extra) => payGuest(world, geld, slot, extra) }); // een race tegen elkaar betaalt per plek in de eigen portemonnee en loopbaan van elke gast (#443)
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
// Ook de schermen die de wereld alleen voor jou stilzetten lopen door (#452): de afspeel-vooruit-dialoog, een snelreis, het laadscherm, de fotomodus en
// het hulpaanbod (coopgroep.js zachtePauze). Een filmpje dat iedereen ziet (world.uiHard) en het wachtscherm pauzeren wel voor iedereen.
export function coopWereldDoorloop(world, menuOpen = true) {
  if (!world || !world.paused || world.coopHold || world.coopRole !== 'host' || !genoegSpelers(world, 2)) return false;
  return !!((menuOpen && !world.uiPaused) || zachtAlleen(world));
}

export function stopCoopNet(world) {
  const n = world.coopNet; if (!n) return;
  if (n.stem) { const f = n.stem.nee; n.stem = null; if (f) { try { f(); } catch (e) { /* de vraag vervalt met de sessie */ } } } // een lopende stemming over een tijdsprong vervalt (#452)
  setGate(false); // zonder samen spelen is er geen wachtkamer meer
  try { if (world.coopRole) bewaarNu(world, { toast: false }); } catch (e) { /* een laatste checkpoint: mislukt het, dan staat de vorige er nog (#448) */ }
  if (world.coopCutBezig != null) cutGastStop(world, null, true); // een scène van de gastheer stopt met het samen spelen
  if (n.role === 'host') { try { n.hub.announce({ k: 'weg', reden: 'spel gestopt' }); n.hub.closeAll(); } catch (e) { /* al weg */ } } else { try { if (n.session.status !== 'geweigerd' && n.session.status !== 'verbroken') n.session.leave(); } catch (e) { /* al weg */ } }
  world.coopNet = null;
  if (n.role === 'client') wedGastReset(world); // een race tegen elkaar op zijn scherm houdt op (#443)
  if (n.role === 'client') gastVerhaalHerlaad(world); // een meegesprongen verhaal staat ook in het lopende spel, anders overschrijft de volgende save het (#429)
  if (n.role === 'client' && n.stash) {
    const s = n.stash, p = world.player;
    p.x = s.x; p.y = s.y; p.angle = s.angle; if (p.vx !== undefined) { p.vx = 0; p.vy = 0; }
    world.wanted = s.wanted;
    p.character = s.character; p.coopChar = s.coopChar;
    world.coopBoek = null;
    world.coopVerdiend = 0; // het geld zit al in world.money en gaat met de gewone save mee; bleef dit staan, dan kwam het bij een volgende sessie nogmaals in de save
    if (world.companion && s.companion) { world.companion.x = s.companion.x; world.companion.y = s.companion.y; world.companion.character = s.companion.character; }
    if (world.coop) world.coop.prevLocal = s.prevLocal;
    if (n.fade && n.joined) n.fade('uit');
  }
  endCoop(world);
  world.coopRole = null; // eigen save mag weer (gast: met zijn eigen voortgang)
}

// de overdracht (coophostwisselnet.js) gebruikt deze functies zonder coopnet.js zelf te importeren
zetCoopNet({ addGuest, stopCoopNet, startHost, startClient, canJoin });
