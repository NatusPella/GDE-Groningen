// Samen spelen (#95): het onderdeel "Samen" in het pauzemenu (alleen met ?coop).
// Hier komen de uitnodiging (host) en het aansluiten (gast) samen; geen keuze bij
// Nieuw spel of Doorgaan. Dit is lijm tussen lobbyui.js en coopnet.js; niet in beeld bekeken.
import { mountLobby } from './lobbyui.js';
import { startHost, startClient, stopCoopNet, handshakeInfo, canJoin, removeGuest } from './coopnet.js';
import { fadeFlash } from './coophud.js';
import { openHold } from './coophold.js';
import { readSession, writeSession, toSession } from './coopsave.js';
import { ARC_ID } from './storyflag.js';

let view = null, mountedOn = null;

const store = () => { try { return localStorage; } catch (e) { return null; } };

// root: .pm-inner van het onderdeel. Blijft staan als je even naar een ander onderdeel gaat.
export function renderSamenPanel(root, world) {
  if (view && mountedOn === root) return;
  if (view) view.close();
  mountedOn = root;
  const ls = store();
  const info = () => handshakeInfo({ tiles: '-', story: ARC_ID });
  view = mountLobby(root, {
    laatsteCode: ls ? readSession(ls).laatsteCode : '',
    startHost: (tr, route) => startHost(world, tr, info(), 1, { onHold: (r) => openHold(world, r), fade: fadeFlash, route }),
    startClient: (tr, route) => startClient(world, tr, info(), { onHold: (r) => openHold(world, r), fade: fadeFlash, route }),
    onCode: (code) => { if (ls) writeSession(ls, toSession(readSession(ls), { code })); },
    canJoin: () => canJoin(world),
    joined: () => {},
    disconnect: (a, rol) => {
      // Gast verwijderen (host) of spel verlaten (gast); bij 'terug' is er nog geen sessie
      if (a !== 'verbreek') return;
      if (rol === 'host') removeGuest(world); else stopCoopNet(world);
    },
  });
}

export function samenCanJoin(world) { return canJoin(world); }
