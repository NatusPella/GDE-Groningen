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

// Aansluiten als gast terwijl je eigen opening of een filmpje nog loopt (bijvoorbeeld bij opnieuw aansluiten): wie op Aansluiten drukt
// kiest ervoor, dus je eigen filmpje stopt en je sluit meteen aan. Herstel na een val of een nieuwe start wacht nog wel (#429).
function eigenFilmpjeOverslaan(world, kan) {
  if (kan.ok || !kan.filmpje || !isCinematicActive()) return kan;
  try { skipCinematic(); } catch (e) { return kan; }
  if (world.cameraOverride) world.cameraOverride = null;
  return canJoin(world);
}

let view = null, mountedOn = null, gebonden = null; // gebonden: de sessie (world.coopNet) waar dit paneel zelf bij hoort; een andere sessie is door een overdracht gekomen

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
  const nu = world && world.coopNet;
  if (view && mountedOn === root && (!nu || nu === gebonden)) return;
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
