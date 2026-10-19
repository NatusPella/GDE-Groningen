// Samen spelen (#95): het onderdeel "Samen" in het pauzemenu (alleen met ?coop).
// Hier komen de uitnodiging (host) en het aansluiten (gast) samen; geen keuze bij
// Nieuw spel of Doorgaan. Dit is lijm tussen lobbyui.js en coopnet.js; niet in beeld bekeken.
import { mountLobby } from './lobbyui.js';
import { startHost, startClient, addGuest, stopCoopNet, handshakeInfo, canJoin, removeGuest, setMaxPlayers } from './coopnet.js';
import { fadeFlash } from './coophud.js';
import { openHold } from './coophold.js';
import { readSession, writeSession, toSession } from './coopsave.js';

let view = null, mountedOn = null;

// Samen spelen vanuit het hoofdmenu (startscreen.js zet het, main.js haalt het op zodra het spel te besturen is);
// een gewone variabele: het wereldobject wordt bij een nieuw spel opnieuw opgebouwd
let openOnStart = false;
export const requestOpenSamen = () => { openOnStart = true; };
export const takeOpenSamen = () => { const v = openOnStart; openOnStart = false; return v; };
export const wantsOpenSamen = () => openOnStart;

const store = () => { try { return localStorage; } catch (e) { return null; } };

// root: .pm-inner van het onderdeel. Blijft staan als je even naar een ander onderdeel gaat.
export function renderSamenPanel(root, world) {
  if (view && mountedOn === root) return;
  if (view) view.close();
  mountedOn = root;
  const ls = store();
  const info = () => handshakeInfo({ tiles: '-', story: 'nieuw' });
  view = mountLobby(root, {
    laatsteCode: ls ? readSession(ls).laatsteCode : '',
    startHost: (route, onChange) => startHost(world, info(), { fade: fadeFlash, route, onChange, onHold: (rol, slot, reden) => openHold(world, rol, slot, reden) }),
    addGuest: (tr) => addGuest(world, tr),
    startClient: (tr, route, wens) => startClient(world, tr, info(), { fade: fadeFlash, route, wens, onHold: (rol, slot, reden) => openHold(world, rol, slot, reden) }),
    setMax: (n) => setMaxPlayers(world, n),
    kick: (slot) => removeGuest(world, slot),
    onCode: (code) => { if (ls) writeSession(ls, toSession(readSession(ls), { code })); },
    canJoin: () => canJoin(world),
    joined: () => {},
    // 'Iedereen stoppen' (host) of 'Spel verlaten' (gast); bij 'terug' is er nog geen sessie
    disconnect: (a) => { if (a === 'verbreek') stopCoopNet(world); },
  });
}
