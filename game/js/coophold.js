// Samen spelen (#95): het scherm als de andere speler wegvalt. Het spel
// pauzeert en wacht (world.uiPaused); de speler kan opnieuw verbinden, en de
// host kan 'Alleen verder' kiezen (de NPC-metgezel neemt de plek over).
// Tekst en keuzes komen uit lobby.js (stap 'verbroken'); tekenen via lobbyui.js.
import { stopCoopNet } from './coopnet.js';

let overlay = null, view = null;

export function isHoldOpen() { return !!overlay; }

export function closeHold(world) {
  if (view) { view.close(); view = null; }
  if (overlay) { overlay.remove(); overlay = null; }
  world.uiPaused = false;
}

// role: 'host' | 'client' (zoals ClientSession/HostSession); session: world.coopNet.session
export async function openHold(world, role) {
  if (overlay || !world.coopNet) return;
  world.uiPaused = true;
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
  const mode = role === 'host' ? 'host' : 'gast';
  view = mountLobby(panel, {
    resumed: () => closeHold(world),
    disconnect: (a) => {
      if (a !== 'verbreek') return; // 'Alleen verder' (host) of 'Stoppen' (gast)
      stopCoopNet(world); closeHold(world);
    },
  }, { start: 'verbroken', mode, session: world.coopNet.session });
}
