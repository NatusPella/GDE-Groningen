// Samen spelen (#95): het onderdeel "Samen" in het pauzemenu (alleen met ?coop).
// Hier komen de uitnodiging (host) en het aansluiten (gast) samen; geen keuze bij
// Nieuw spel of Doorgaan. Dit is lijm tussen lobbyui.js en coopnet.js; niet in beeld bekeken.
import { mountLobby } from './lobbyui.js';
import { startHost, startClient, addGuest, stopCoopNet, handshakeInfo, canJoin, removeGuest, setMaxPlayers, openHek, genoegSpelers } from './coopnet.js';
import { fadeFlash } from './coophud.js';
import { openHold } from './coophold.js';
import { koppelWissel } from './multiplayerhostwisselui.js';
import { biedOver } from './coophostwisselnet.js';
import { readSession, writeSession, toSession } from './coopsave.js';
import { readHostScene } from './coopscene.js';
import { setGate } from './coopgate.js';
import { saveGame, hasSave } from './savegame.js';
import { nameOf, activeSlot } from './saveslots.js';
import { isCinematicActive, skipCinematic } from './cinematics.js';
import { formatRoom } from './net/sigcrypto.js';
import { mountSamenHub, hubTerug as hubTerugUi, closeSamenHub } from './samenhubui.js';
import { ACT, STAP, actieVan } from './samenhub.js';
import { magOnline } from './settings.js';

// Aansluiten als gast terwijl je eigen opening of een filmpje nog loopt (bijvoorbeeld bij opnieuw aansluiten): wie op Aansluiten drukt
// kiest ervoor, dus je eigen filmpje stopt en je sluit meteen aan. Herstel na een val of een nieuwe start wacht nog wel (#429).
function eigenFilmpjeOverslaan(world, kan) {
  if (kan.ok || !kan.filmpje || !isCinematicActive()) return kan;
  try { skipCinematic(); } catch (e) { return kan; }
  if (world.cameraOverride) world.cameraOverride = null;
  return canJoin(world);
}

let view = null, mountedOn = null, gebonden = null; // gebonden: de sessie (world.coopNet) waar dit paneel zelf bij hoort; een andere sessie is door een overdracht gekomen

// De hub (#527): stap 1 ("waar speel je") staat vóór de lobby zolang er nog geen sessie is. De lobby blijft eronder
// gemount met zijn eigen knoppen en schermen, zodat de bestaande stroom en de testbank niets merken; de hub wijst
// hem alleen de weg met de keuze die het oude beginscherm ook al doorgaf (keuze/lijst, zie lobby.js createLobby).
// Escape gaat binnen de hub een stap terug en nooit de sessie uit (samenhub.js escapeStap).
let hubOpen = false;
let hubStap = null; // de stap van de hub binnen dit onderdeel; null = nog geen keuze gemaakt
// Kwam de lobby die nu open staat uit de hub? Dan brengt Escape je op de eerste, nog niets doende schermen terug
// naar stap 1 in plaats van het onderdeel te verlaten. `laatste` is de laatste aanroep, om opnieuw te kunnen tekenen.
let vanHub = false, laatste = null;
// De lobby-schermen waarop Escape teruggaat naar de hub: geen sessie, geen verbinding onderweg en nog geen toestemming
// gegeven. Dieper in de lobby (de lijst, verbinden, de wachtkamer) laat Escape alles bij het oude: daar heeft de lobby
// zijn eigen Terug en Annuleren, en die weten wat er afgebroken moet worden.
const HUB_TERUG_STAPPEN = ['start', 'methode', 'gast-typt'];

// De sessie loopt al maar dit paneel heeft hem niet zelf gemaakt (het spel is overgedragen, of het paneel is opnieuw getekend): dan tekent het paneel
// de huidige sessie (rol, kamercode, spelers, Iedereen stoppen of Spel verlaten) en niet het beginscherm. De nieuwe host kent zijn kamercode uit de overdracht.
function huidigeSessie(world, oudeCode = '') {
  const n = world && world.coopNet;
  if (!n || (n.role === 'host' ? !n.hub : !n.session)) return null;
  const wisselKamer = world.coopWissel && world.coopWissel.rm && world.coopWissel.rm.kamer;
  let code = oudeCode; if (!code && n.role === 'host' && wisselKamer) { try { code = formatRoom(wisselKamer); } catch (e) { code = ''; } }
  return { net: n, rol: n.role === 'host' ? 'host' : 'gast', route: n.route === 'direct' ? 'direct' : 'kamer', code };
}

// Samen spelen vanuit het hoofdmenu (startscreen.js zet het, main.js haalt het op zodra het spel te besturen is);
// een gewone variabele: het wereldobject wordt bij een nieuw spel opnieuw opgebouwd
// opts: { rol: 'host' | 'gast' (al gekozen in het hoofdmenu), gate (het spel begint pas als de gastheer start) }
let openOnStart = false, startOpts = {};
export const requestOpenSamen = (opts = {}) => { openOnStart = true; startOpts = { ...opts }; setGate(!!opts.gate); };
export const takeOpenSamen = () => { const v = openOnStart; openOnStart = false; return v; };
export const wantsOpenSamen = () => openOnStart;
export const samenGate = () => !!startOpts.gate;
export const samenKeuze = () => startOpts.rol || null;

const store = () => { try { return localStorage; } catch (e) { return null; } };

// Staat het paneel open terwijl het spel wordt overgedragen, dan wisselt de sessie onder het paneel: het volgt dat zelf (twee keer per seconde kijken, goedkoop).
let volger = null;
function volgSessie(world, sluit) {
  if (volger || typeof setInterval !== 'function') return;
  volger = setInterval(() => {
    const r = mountedOn, n = world && world.coopNet;
    if (!view || !r || r.isConnected === false || !n || n === gebonden) return;
    renderSamenPanel(r, world, sluit);
  }, 500);
  if (volger && volger.unref) volger.unref();
}

// root: .pm-inner van het onderdeel. Blijft staan als je even naar een ander onderdeel gaat.
// sluit: het pauzemenu sluiten (pausemenu.js geeft het mee; samenpanel.js importeert het menu zelf niet, dat is een importcyclus)
export function renderSamenPanel(root, world, sluit = () => {}) {
  volgSessie(world, sluit);
  laatste = { root, world, sluit };
  const nu = world && world.coopNet;
  if (nu) { vanHub = false; hubOpen = false; } // een lopende sessie: de hub is niet meer aan de orde
  if (view && mountedOn === root && (!nu || nu === gebonden)) return;
  // Hub (#527): zolang er geen sessie loopt en de speler nog geen rol koos, eerst de drie stappen. Zodra een keuze
  // de lobby opent (view) komt de hub niet terug; sluit de lobby zichzelf (Terug of Stoppen), dan is er weer geen view
  // en staat de hub er opnieuw. Een bestaande stroom met een rol (hoofdmenu, main.js, de testbank) komt hier nooit.
  if (!nu && !startOpts.rol && !startOpts.lijst && !view) {
    mountedOn = root;
    mountHub(root, world, sluit);
    return;
  }
  const oudeCode = view && view.state ? (view.state().code || '') : '';
  if (view) view.close();
  mountedOn = root;
  const loopt = huidigeSessie(world, nu === gebonden ? oudeCode : '');
  gebonden = loopt ? loopt.net : null;
  const ls = store();
  const info = () => handshakeInfo({ tiles: '-', story: 'nieuw' });
  koppelWissel(world, { fade: fadeFlash, scene: () => readHostScene(world), onHold: (rol, slot, reden) => openHold(world, rol, slot, reden) }); // het spel overdragen (#439): de route en het scherm
  const keuze = startOpts.rol || null, gate = !!startOpts.gate, lijst = !!startOpts.lijst; startOpts = { ...startOpts, rol: null, lijst: false };
  let spelNaam = ''; try { spelNaam = ls ? nameOf(ls, activeSlot(ls)) : ''; } catch (e) { /* geen naam */ }
  view = mountLobby(root, {
    laatsteCode: ls ? readSession(ls).laatsteCode : '',
    startHost: (route, onChange) => { const hub = startHost(world, info(), { fade: fadeFlash, route, onChange, scene: () => readHostScene(world), onHold: (rol, slot, reden) => openHold(world, rol, slot, reden) }); gebonden = world.coopNet; return hub; },
    addGuest: (tr) => addGuest(world, tr),
    // een gast zonder opgeslagen spel krijgt er een (het begin van zijn eigen spel): zijn beloningen hebben dan een plek (docs/COOP-OPSLAAN.md)
    startClient: (tr, route, wens) => { try { if (!hasSave()) saveGame(world, { toast: false }); } catch (e) { /* de beloningen gaan dan niet verloren: ze staan in het geld van deze sessie */ } const sessie = startClient(world, tr, info(), { fade: fadeFlash, route, wens, code: ls ? readSession(ls).laatsteCode : '', onHold: (rol, slot, reden) => openHold(world, rol, slot, reden) }); gebonden = world.coopNet; return sessie; },
    setMax: (n) => setMaxPlayers(world, n),
    kick: (slot) => removeGuest(world, slot),
    // het spel aan een speler overdragen (#439): dezelfde overdracht als bij Spel > Spelers, nu ook vanuit de wachtkamer
    overdragen: (slot) => biedOver(world, slot),
    onCode: (code) => { if (ls) writeSession(ls, toSession(readSession(ls), { code })); },
    canJoin: () => eigenFilmpjeOverslaan(world, canJoin(world)),
    joined: () => {},
    // 'Spel starten' (alleen de gastheer, in de wachtkamer van een nieuw spel): het menu sluit en de opening begint
    startSpel: () => {
      const n = world.coopNet;
      if (!n || n.role === 'host') { if (!genoegSpelers(world)) return; openHek(world); } // alleen met minstens twee spelers
      else setGate(false); // een gast: de ander startte
      sluit();
    },
    // 'Iedereen stoppen' (host) of 'Spel verlaten' (gast); bij 'terug' is er nog geen sessie
    disconnect: (a) => { setGate(false); if (a === 'verbreek') stopCoopNet(world); }, // Stoppen of Terug: geen wachtkamer meer, je speelt weer je eigen spel
  }, { keuze, startGate: gate, spelNaam, lijst, ...(loopt ? { adopt: { code: loopt.code, route: loopt.route }, rol: loopt.rol, hub: loopt.rol === 'host' ? loopt.net.hub : null, session: loopt.rol === 'gast' ? loopt.net.session : null } : {}) });
}

// De hub vóór de lobby (#527). Stap 1 is een eigen scherm in het vak van Samen spelen (.pm-samen-inner); een keuze
// geeft de lobby precies de beginsituatie die het oude beginscherm ook gaf (keuze 'gast' + lijst, of 'host' met de
// kamercode-route: de twee waarden die createLobby al kent), dus er verandert niets aan het netwerk of de toestemming.
// Stap 2 en 3 staan hier zonder sessie nog leeg: zodra je kiest, neemt de lobby het over en zijn zijn eigen schermen
// (uitnodigen, wachtkamer, starten) stap 2 en 3. De hub begint en beëindigt zelf nooit een sessie.
function mountHub(root, world, sluit) {
  const eerste = (root.classList && root.classList.contains('pm-samen-inner')) ? root : root.querySelector && root.querySelector('.pm-samen-inner');
  if (!eerste) return;
  closeSamenHub();
  // lobbyui.js laat zijn klik-, toets- en invoerluisteraars op dit vak staan als de lobby sluit (close() ruimt de
  // inhoud op, niet de luisteraars). De hub tekent in hetzelfde vak en draagt dezelfde data-act-namen als de lobby,
  // zodat de co-op-testbank dezelfde knoppen blijft vinden; zonder maatregel zou de oude lobby die klikken ook
  // afhandelen en over de hub heen tekenen. Een lege kloon op dezelfde plek heeft geen luisteraars.
  let vak = eerste;
  if (eerste.cloneNode && eerste.parentNode && eerste.parentNode.replaceChild) {
    vak = eerste.cloneNode(false);
    eerste.parentNode.replaceChild(vak, eerste);
  }
  laatste = { root: vak, world, sluit };
  mountedOn = vak;
  hubOpen = true;
  const ls = store();
  const naarLobby = (rol, lijst) => {
    hubOpen = false;
    vanHub = true;
    closeSamenHub();
    startOpts = { ...startOpts, rol, lijst: !!lijst };
    renderSamenPanel(vak, world, sluit); // de lobby begint meteen op de gekozen stap (createLobby: keuze/lijst)
  };
  const onKeuze = (act) => {
    if (act === ACT.BESLOTEN) { hubStap = STAP.METWIE; return teken(); } // stap 2: alleen, of met een kamercode
    if (act === ACT.TERUG) { hubStap = STAP.WAAR; return teken(); }
    // de rest wijst de bestaande lobby de weg met de twee waarden die createLobby al kent (keuze en lijst)
    const route = actieVan(act);
    if (route.sluit) { setGate(false); sluit(); return; } // alleen spelen: geen sessie, je speelt gewoon je eigen spel
    if (!route.rol) return;
    naarLobby(route.rol, route.lijst);
  };
  // Terug op een scherm waar de lobby nog niets doet, brengt je naar de hub en niet naar het oude beginscherm met
  // zijn vier knoppen (#527: dat scherm is juist wat de hub vervangt). De lobby luistert zelf ook op dit vak naar
  // dezelfde klik; in de capture-fase komt deze regel eerst en stopt de klik daar. Eén keer per vak: zonder browser
  // (tests) wordt er niet gekloond en zou elke opening er een luisteraar bij zetten.
  if (!hubTerugGebonden.has(vak)) {
    hubTerugGebonden.add(vak);
    vak.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('[data-act="terug"]');
      if (!b || !vanHub || !view || !view.state) return;
      if (!HUB_TERUG_STAPPEN.includes(view.state().step)) return;
      e.stopPropagation();
      samenHubTerug();
    }, true);
  }
  const teken = () => mountSamenHub(vak, {
    meedoen: magOnline(),
    laatsteCode: ls ? readSession(ls).laatsteCode : '',
    besloten: hubStap === STAP.METWIE,
    onKeuze,
    onActie: onKeuze, // de knoppen van stap 2 (Alleen spelen, Meedoen met een kamercode) gaan dezelfde weg als de keuzes
    onStap: (s) => { hubStap = s; }, // zodat een hertekening van het paneel op dezelfde stap terugkomt
  }, hubStap);
  teken();
}

// Escape binnen de hub: één stap terug (samenhubui.js). Geeft true als de hub de toets gebruikte; anders gaat
// Escape in pausemenu.js verder met wat het altijd deed. Een sessie wordt hier nooit beëindigd.
// Staat de lobby van de hub open op een scherm waar nog niets gebeurt, dan gaat Escape terug naar stap 1 van de hub
// in plaats van het onderdeel te verlaten: de speler komt altijd terug waar hij begon.
const hubTerugGebonden = new WeakSet(); // de vakken waar de Terug-onderschepping al op staat (één keer per vak)
export function samenHubTerug() {
  if (hubOpen) return hubTerugUi();
  if (!vanHub || !view || !view.state) return false;
  if (!HUB_TERUG_STAPPEN.includes(view.state().step)) return false;
  const r = laatste;
  vanHub = false;
  hubStap = STAP.WAAR; // terug bij het begin: de vraag "waar speel je" staat weer bovenaan
  if (view) view.close();
  view = null;
  startOpts = { ...startOpts, rol: null, lijst: false };
  if (r) renderSamenPanel(r.root, r.world, r.sluit);
  return true;
}
