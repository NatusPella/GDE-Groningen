// Samen spelen (#95): het scherm als een andere speler wegvalt. Het spel pauzeert en
// wacht (world.coopHold) als dat nodig is: altijd voor Tessa (de eerste gast), voor een
// extra speler alleen als de opdracht hem nodig heeft (coopplayers.holdBeleid). De speler
// kan opnieuw verbinden; de host kan kiezen niet te wachten (die speler wordt verwijderd).
// Tekst en keuzes komen uit lobby.js (stap 'verbroken'); tekenen via lobbyui.js.
import { stopCoopNet, removeGuest } from './coopnet.js';

let overlay = null, view = null;

export function isHoldOpen() { return !!overlay; }
// de sessie is voorbij terwijl het wachtscherm openstaat (de gastheer stopte, of je werd verwijderd): het scherm en de pauze gaan weg
export function checkHold(world) { if (overlay && !world.coopNet) closeHold(world); }

function closeHold(world) {
  if (view) { view.close(); view = null; }
  if (overlay) { overlay.remove(); overlay = null; }
  world.coopHold = false;
}

// role: 'host' | 'client'; slot: de plek die is weggevallen (host) of onze eigen plek (gast)
export async function openHold(world, role, slot = 1, reden = '') {
  if (overlay || !world.coopNet) return;
  world.coopHold = true; // een eigen vlag: world.uiPaused wordt door phone.js, het laadscherm en andere schermen steeds teruggezet
  overlay = document.createElement('div');
  overlay.className = 'gm coop-hold';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(8,16,10,0.82);';
  const panel = document.createElement('div');
  panel.style.cssText = 'max-width:640px;padding:32px;background:rgba(15,40,26,0.96);border:1px solid rgba(240,237,228,0.16);border-radius:6px;color:#f0ede4;';
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  const { mountLobby } = await import('./lobbyui.js');
  const host = role === 'host';
  const naam = host ? ((world.coopRoster || []).find((r) => r.slot === slot) || {}).naam || '' : '';
  view = mountLobby(panel, {
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
}
