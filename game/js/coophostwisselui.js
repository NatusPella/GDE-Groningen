// Samen spelen (#439): het spel overdragen, het deel dat je ziet en de echte route. De gegevens komen uit world.coopWisselUi
// (coophostwisselnet.js, getest in scripts/coop/hostwissel_test.mjs): de vraag (J of N), de pauzemelding en de slotmelding.
// De route is dezelfde als in de wachtkamer: een kamer via rtcroom en de openbare brokers, zonder nieuwe code in te voeren (de
// oude host geeft de nieuwe kamer door in hw-verbind). Alleen DOM en netwerk; niet door een mens in beeld bekeken en nog niet over
// echt internet geprobeerd (docs/COOP-OVERDRAGEN.md).
import { handshakeInfo } from './coopnet.js';
import { zetWisselDeps, antwoordVraag, annuleerOverdracht } from './coophostwisselnet.js';
import { hostRoom, joinRoom } from './net/rtcroom.js';
import { MultiSignaler } from './net/brokers.js';
import * as CONFIG from './net/netconfig.js';
import { makeRoom } from './net/sigcrypto.js';
import { wisselWereldHaken } from './coophostwisselwereld.js';
import { meet, beoordeel, verbindingslog } from './net/diagnose.js';
import { maakEnv } from './net/diagnoseenv.js';

const newSignaler = () => new MultiSignaler(CONFIG, { socket: (url) => { const ws = new WebSocket(url); ws.binaryType = 'arraybuffer'; return ws; } },
  { fallbackAfter: CONFIG.TIMEOUTS.fallbackAfter, brokerTimeout: CONFIG.TIMEOUTS.broker });
const KAMER_OPEN_MS = 5 * 60 * 1000; // zo lang blijft de kamer van de nieuwe host open voor wie nog moet aansluiten

// De route voor de overdracht (deps van coophostwisselnet.js). opts: { fade, scene, onHold } zoals samenpanel.js ze ook aan startHost geeft.
export function wisselRoute(world, opts = {}) {
  const api = typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.coop ? window.gdeDesktop.coop : null;
  return {
    ...wisselWereldHaken(world), // opdracht, kapotte objecten, voertuigen, plek en geld per gast (coophostwisselwereld.js)
    info: () => handshakeInfo({ tiles: '-', story: 'nieuw' }),
    maakKamer: () => makeRoom(), // de kamercodes van de opvolgers (overname bij wegvallen)
    hostOpts: () => ({ fade: opts.fade, route: 'kamer', scene: opts.scene, onHold: opts.onHold }),
    clientOpts: () => ({ fade: opts.fade, route: 'kamer', onHold: opts.onHold }),
    // de nieuwe host opent een kamer en blijft aanbiedingen klaarzetten, één per speler, zoals de wachtkamer doet
    opKamer: async ({ aanvaard, kamer }) => {
      const room = kamer || makeRoom(); // een opvolger gebruikt de code die de groep al kent let gestopt = false, handle = null;
      const open = async () => {
        if (gestopt) return;
        if (handle && handle.cancel) handle.cancel();
        handle = await hostRoom(room, { signaler: newSignaler(), timeouts: CONFIG.TIMEOUTS, onstate: (s) => { if (s === 'open') open().catch(() => {}); } });
        aanvaard(handle.transport);
      };
      await open();
      const stop = () => { gestopt = true; if (handle && handle.cancel) handle.cancel(); };
      setTimeout(stop, KAMER_OPEN_MS);
      return { kamer: room, stop };
    },
    // wie aansluit: een kamer, met de tijden van de wachtkamer
    // (joinRoom beslist nooit als het misgaat: na de verbindtijd geven we het op, anders bleef een poging eeuwig hangen)
    verbind: async (kamer) => {
      const h = await joinRoom(kamer, { signaler: newSignaler(), timeouts: CONFIG.TIMEOUTS });
      let t; const op = new Promise((_, nee) => { t = setTimeout(() => { try { h.cancel(); } catch (e) { /* al weg */ } nee(new Error('time-out')); }, CONFIG.TIMEOUTS.connect + 2000); });
      try { return await Promise.race([h.opened, op]); } finally { clearTimeout(t); }
    },
    // kan de nieuwe host de anderen bereiken? dezelfde meting als Spel › Samen spelen › Diagnose
    bereikbaar: async () => { try { const b = beoordeel(await meet(maakEnv({ api, ms: 3000 }), { limiet: 9000 })); verbindingslog.add('overdracht', b.kamer ? 'bereikbaar' : 'niet bereikbaar'); return !!b.kamer; } catch (e) { verbindingslog.add('overdracht', 'meting mislukt'); return true; } },
  };
}

// Aan het begin van een sessie (samenpanel.js): de route en het scherm klaarzetten.
export function koppelWissel(world, opts = {}) {
  zetWisselDeps(world, wisselRoute(world, opts));
  startWisselUi(world);
}

// ---- het scherm -----------------------------------------------------------------------------------------------------------------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let overlay = null, timer = null, laatste = '', eindTot = 0;

export function startWisselUi(world) {
  if (timer || typeof document === 'undefined') return;
  timer = setInterval(() => teken(world), 200);
}
function teken(world) {
  const u = world.coopWisselUi;
  const nu = Date.now();
  if (u && u.einde && !u.einde.gezien) { u.einde.gezien = true; eindTot = nu + 5000; }
  const toon = u && (u.vraag || u.pauze || (u.einde && nu < eindTot));
  if (!toon) { if (overlay) { overlay.remove(); overlay = null; laatste = ''; } return; }
  const sleutel = JSON.stringify([u.vraag && [u.vraag.tekst, u.vraag.rest], u.pauze && u.pauze.tekst, u.einde && u.einde.tekst]);
  if (sleutel === laatste && overlay) return;
  laatste = sleutel;
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'gm coop-wissel'; overlay.setAttribute('role', 'alertdialog'); overlay.setAttribute('aria-live', 'assertive');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(8,16,10,0.72);';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      const b = e.target.closest('[data-wissel]'); if (!b) return;
      const a = b.getAttribute('data-wissel');
      if (a === 'ja') antwoordVraag(world, true); else if (a === 'nee') antwoordVraag(world, false); else if (a === 'stop') annuleerOverdracht(world);
    });
  }
  const knop = (act, label) => `<button type="button" data-wissel="${act}" style="margin:14px 10px 0 0;padding:8px 20px;border:0;border-radius:4px;background:rgba(240,237,228,0.18);color:inherit;font:inherit;cursor:pointer;">${label}</button>`;
  const w = world.coopWissel;
  const kanStoppen = !!(w && w.oud && w.oud.bezig);
  let html;
  if (u.vraag) html = `<h3 style="margin:0 0 8px;font:normal 26px 'Bebas Neue','Arial Narrow',Arial,sans-serif;letter-spacing:0.06em;">Het spel overnemen?</h3><p style="margin:0;">${esc(u.vraag.tekst)}</p><p style="margin:8px 0 0;opacity:0.7;">Nog ${u.vraag.rest} seconden. Zonder antwoord is het nee.</p>${knop('ja', 'Ja (J)')}${knop('nee', 'Nee (N)')}`;
  else if (u.pauze) html = `<h3 style="margin:0 0 8px;font:normal 26px 'Bebas Neue','Arial Narrow',Arial,sans-serif;letter-spacing:0.06em;">Even wachten</h3><p style="margin:0;">${esc(u.pauze.tekst)}</p>${kanStoppen ? knop('stop', 'Stoppen') : ''}`;
  else html = `<p style="margin:0;">${esc(u.einde.tekst)}</p>`;
  overlay.innerHTML = `<div style="max-width:560px;padding:28px 32px;background:rgba(15,40,26,0.96);border:1px solid rgba(240,237,228,0.16);border-radius:6px;color:#f0ede4;font:20px/1.35 'Arial Narrow',Arial,sans-serif;">${html}</div>`;
}
