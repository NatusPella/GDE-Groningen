// Samen spelen (#95): het scherm als een andere speler wegvalt. Het spel pauzeert en
// wacht (world.coopHold) als dat nodig is: altijd voor Tessa (de eerste gast), voor een
// extra speler alleen als de opdracht hem nodig heeft (coopplayers.holdBeleid). De speler
// kan opnieuw verbinden; de host kan kiezen niet te wachten (die speler wordt verwijderd).
// Tekst en keuzes komen uit lobby.js (stap 'verbroken'); tekenen via lobbyui.js.
import { stopCoopNet, removeGuest } from './coopnet.js';
import { readSession } from './coopsave.js';
import { mountOverlay } from './coopoverlay.js';
import { toonHervatKaart } from './coophud.js';

let weg0 = 0; // wanneer het wachtscherm openging: de hervatkaart zegt hoe lang je weg was
let overlay = null, view = null, focusWacht = null, opent = false, houder = null;

const openerNaamVan = (world) => { const p = (world.coopRoster || []).find((x) => x && x.slot === 0); return (p && p.naam) || 'de ander'; };
export function isHoldOpen() { return !!overlay; }
// de sessie is voorbij terwijl het wachtscherm openstaat (de gastheer stopte, of je werd verwijderd): het scherm en de pauze gaan weg
export function checkHold(world) { if (overlay && (!world.coopNet || world.coopHoldVerder)) { world.coopHoldVerder = false; closeHold(world); } }

// De host laat de anderen weten dat het wachten voorbij is (verder gegaan of de speler is terug).
function wachtUit(world) { const n = world.coopNet; if (n && n.role === 'host' && n.hub) { try { for (const p of n.hub.roster.spelers) if (p.slot !== 0 && p.verbinding !== 'lost') n.hub.announce({ k: 'wacht', aan: false }, p.slot); } catch (e) { /* weg */ } } }
function closeHold(world) {
  wachtUit(world);
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
  weg0 = Date.now();
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
    resumed: () => { const sec = (Date.now() - weg0) / 1000; closeHold(world); if (role === 'client') toonHervatKaart({ seconden: sec, naam: openerNaamVan(world) }); },
    disconnect: (a) => {
      if (a !== 'verbreek') return; // 'Nu zonder ... verder' (host) of 'Stoppen' (gast)
      // 24-11: verder zonder de ander is geen verwijderen. De wereld wacht niet meer; de speler houdt zijn plek en kan terugkomen (verwijderen is alleen aan wie het spel opende, bij Spelers).
      if (!host) stopCoopNet(world);
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
