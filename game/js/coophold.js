// Samen spelen (#95): het scherm als een andere speler wegvalt. Het spel pauzeert en
// wacht (world.coopHold) als dat nodig is: altijd voor Tessa (de eerste gast), voor een
// extra speler alleen als de opdracht hem nodig heeft (coopplayers.holdBeleid). De speler
// kan opnieuw verbinden; de host kan kiezen niet te wachten (die speler wordt verwijderd).
// Tekst en keuzes komen uit lobby.js (stap 'verbroken'); tekenen via lobbyui.js.
import { stopCoopNet, removeGuest } from './coopnet.js';
import { readSession } from './coopsave.js';
import { mountOverlay } from './coopoverlay.js';

let overlay = null, view = null, focusWacht = null, opent = false, houder = null;

export function isHoldOpen() { return !!overlay; }
// de sessie is voorbij terwijl het wachtscherm openstaat (de gastheer stopte, of je werd verwijderd): het scherm en de pauze gaan weg
export function checkHold(world) { if (overlay && !world.coopNet) closeHold(world); }

function closeHold(world) {
  if (focusWacht) { focusWacht.disconnect(); focusWacht = null; }
  if (view) { view.close(); view = null; }
  if (houder) { houder.close(); houder = null; }
  else if (overlay) overlay.remove();
  overlay = null;
  opent = false;
  world.coopHold = false;
}

// (#713) valt er iemand weg midden in een scène, dan eindigen de lopende scènes hier netjes in plaats van te blijven hangen:
// de gastkopie, een wachtende kopie en het eigen filmpje van de gastheer. Geeft of er iets liep.
async function eindigScenes(world) {
  let liep = false;
  if (world.coopCutBezig != null || (world.coopCutWacht && world.coopCutWacht.length)) {
    try { const m = await import('./coopcut.js'); liep = (await m.cutGastStop(world, null, true)) || liep; } catch (e) { /* al weg */ }
    if (world.coopCutWacht) { world.coopCutWacht = null; liep = true; }
  }
  try { const c = await import('./cinematics.js'); if (c.isCinematicActive()) { c.skipCinematic(); liep = true; } } catch (e) { /* al weg */ }
  return liep;
}

// role: 'host' | 'client'; slot: de plek die is weggevallen (host) of onze eigen plek (gast)
export async function openHold(world, role, slot = 1, reden = '') {
  if (overlay || opent || !world.coopNet) return;
  opent = true;
  world.coopHold = true; // een eigen vlag: world.uiPaused wordt door phone.js, het laadscherm en andere schermen steeds teruggezet
  if (await eindigScenes(world)) { try { world.addMessage('De scène stopt: er viel een speler weg.', 5); } catch (e) { /* geen HUD */ } }
  houder = mountOverlay({ label: 'Samen spelen', target: document.body });
  if (!houder) { opent = false; world.coopHold = false; return; }
  overlay = houder.el;
  const panel = houder.pane;
  const { mountLobby } = await import('./lobbyui.js');
  const host = role === 'host';
  const naam = host ? ((world.coopRoster || []).find((r) => r.slot === slot) || {}).naam || '' : '';
  let ls = null; try { ls = localStorage; } catch (e) { /* geen opslag */ }
  view = mountLobby(panel, {
    laatsteCode: ls ? readSession(ls).laatsteCode : '', // de gast hoeft de code van de gastheer niet opnieuw te typen
    resumed: () => closeHold(world),
    disconnect: (a) => {
      if (a !== 'verbreek') return; // 'Niet wachten' (host) of 'Stoppen' (gast)
      if (host) removeGuest(world, slot); else stopCoopNet(world);
      closeHold(world);
    },
  }, {
    start: 'verbroken', rol: host ? 'host' : 'gast', route: world.coopNet.route,
    session: host ? null : world.coopNet.session, hub: host ? world.coopNet.hub : null, holdSlot: host ? slot : null, holdNaam: naam,
  });
  // #151: met een controller moet dit scherm ook zonder muis kunnen. gamepad.js kiest hier de menu-indeling:
  // de pijlen lopen langs de knoppen en A klikt de gefocuste. Zet de eerste knop ("Opnieuw verbinden") vast,
  // dan doet A meteen iets; lobbyui tekent bij elke statuswissel opnieuw, dus we zetten hem daarna terug.
  const eerste = () => {
    if (!overlay) return;
    const a = document.activeElement;
    if (a && overlay.contains(a)) return;
    const b = overlay.querySelector('button');
    if (b && b.focus) b.focus({ preventScroll: true });
  };
  eerste();
  if (typeof MutationObserver === 'function') { focusWacht = new MutationObserver(eerste); focusWacht.observe(panel, { childList: true, subtree: true }); }
}
