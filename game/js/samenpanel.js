// Samen spelen (#95): het onderdeel "Samen" in het pauzemenu (alleen met ?coop).
// Hier komen de uitnodiging (host) en het aansluiten (gast) samen; geen keuze bij
// Nieuw spel of Doorgaan. Dit is lijm tussen lobbyui.js en coopnet.js; niet in beeld bekeken.
import { mountLobby } from './lobbyui.js';
import { startHost, startClient, addGuest, stopCoopNet, handshakeInfo, canJoin, removeGuest, setMaxPlayers, openHek, genoegSpelers } from './coopnet.js';
import { fadeFlash } from './coophud.js';
import { openHold } from './coophold.js';
import { koppelWissel } from './coophostwisselui.js';
import { readSession, writeSession, toSession } from './coopsave.js';
import { readHostScene } from './coopscene.js';
import { setGate } from './coopgate.js';
import { saveGame, hasSave } from './savegame.js';
import { nameOf, activeSlot } from './saveslots.js';

let view = null, mountedOn = null;

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

// root: .pm-inner van het onderdeel. Blijft staan als je even naar een ander onderdeel gaat.
// sluit: het pauzemenu sluiten (pausemenu.js geeft het mee; samenpanel.js importeert het menu zelf niet, dat is een importcyclus)
export function renderSamenPanel(root, world, sluit = () => {}) {
  if (view && mountedOn === root) return;
  if (view) view.close();
  mountedOn = root;
  const ls = store();
  const info = () => handshakeInfo({ tiles: '-', story: 'nieuw' });
  koppelWissel(world, { fade: fadeFlash, scene: () => readHostScene(world), onHold: (rol, slot, reden) => openHold(world, rol, slot, reden) }); // het spel overdragen (#439): de route en het scherm
  const keuze = startOpts.rol || null, gate = !!startOpts.gate, lijst = !!startOpts.lijst; startOpts = { ...startOpts, rol: null, lijst: false };
  let spelNaam = ''; try { spelNaam = ls ? nameOf(ls, activeSlot(ls)) : ''; } catch (e) { /* geen naam */ }
  view = mountLobby(root, {
    laatsteCode: ls ? readSession(ls).laatsteCode : '',
    startHost: (route, onChange) => startHost(world, info(), { fade: fadeFlash, route, onChange, scene: () => readHostScene(world), onHold: (rol, slot, reden) => openHold(world, rol, slot, reden) }),
    addGuest: (tr) => addGuest(world, tr),
    // een gast zonder opgeslagen spel krijgt er een (het begin van zijn eigen spel): zijn beloningen hebben dan een plek (docs/COOP-OPSLAAN.md)
    startClient: (tr, route, wens) => { try { if (!hasSave()) saveGame(world, { toast: false }); } catch (e) { /* de beloningen gaan dan niet verloren: ze staan in het geld van deze sessie */ } return startClient(world, tr, info(), { fade: fadeFlash, route, wens, onHold: (rol, slot, reden) => openHold(world, rol, slot, reden) }); },
    setMax: (n) => setMaxPlayers(world, n),
    kick: (slot) => removeGuest(world, slot),
    onCode: (code) => { if (ls) writeSession(ls, toSession(readSession(ls), { code })); },
    canJoin: () => canJoin(world),
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
  }, { keuze, startGate: gate, spelNaam, lijst });
}
