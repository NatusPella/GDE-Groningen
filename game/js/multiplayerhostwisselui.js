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
import { mountOverlay } from './coopoverlay.js';

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
      const room = kamer || makeRoom(); // een opvolger gebruikt de code die de groep al kent
      let gestopt = false, handle = null;
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
let overlay = null, houder = null, timer = null, laatste = '', eindTot = 0, huidige = null;

export function startWisselUi(world) {
  if (timer || typeof document === 'undefined') return;
  timer = setInterval(() => teken(world), 200);
  window.addEventListener('keydown', toets);
}

// #151: de vraag is met een controller te beantwoorden. gamepad.js kiest dan de coopvraag-indeling
// (A = J, B = N) en die toetsen leest coophostwisselnet.js zelf. Esc doet wat de knop Stoppen doet,
// zolang de oude host nog bezig is; zonder die knop doet Esc niets.
function toets(e) {
  if (!overlay || !huidige || e.key !== 'Escape') return;
  const u = huidige.coopWisselUi, w = huidige.coopWissel;
  if (!u || !u.pauze || !(w && w.oud && w.oud.bezig)) return;
  e.preventDefault();
  // het pauzemenu hangt aan dezelfde toets: die is nu van het overdrachtsscherm
  if (huidige.input && huidige.input.consume) huidige.input.consume('escape');
  annuleerOverdracht(huidige);
}

function teken(world) {
  huidige = world;
  const u = world.coopWisselUi;
  const nu = Date.now();
  if (u && u.einde && !u.einde.gezien) { u.einde.gezien = true; eindTot = nu + 5000; }
  const toon = u && (u.vraag || u.pauze || (u.einde && nu < eindTot));
  if (!toon) { if (houder) { houder.close(); houder = null; overlay = null; laatste = ''; } return; }
  const sleutel = JSON.stringify([u.vraag && [u.vraag.tekst, u.vraag.rest], u.pauze && u.pauze.tekst, u.einde && u.einde.tekst]);
  if (sleutel === laatste && overlay) return;
  laatste = sleutel;
  if (!houder) {
    houder = mountOverlay({
      label: 'Spel overdragen', target: document.body,
      onAction: (a) => {
        if (a === 'ja') antwoordVraag(world, true);
        else if (a === 'nee') antwoordVraag(world, false);
        else if (a === 'stop') annuleerOverdracht(world);
      },
    });
    overlay = houder && houder.el;
  }
  if (!houder) return;
  const w = world.coopWissel;
  const kanStoppen = !!(w && w.oud && w.oud.bezig);
  if (u.vraag) houder.render({
    title: 'Het spel overnemen?',
    text: `${u.vraag.tekst} Nog ${u.vraag.rest} seconden. Zonder antwoord is het nee.`,
    buttons: [{ action: 'ja', label: 'Ja (J)', primary: true }, { action: 'nee', label: 'Nee (N)' }],
  });
  else if (u.pauze) houder.render({
    title: 'Even wachten', text: u.pauze.tekst,
    buttons: kanStoppen ? [{ action: 'stop', label: 'Stoppen', primary: true }] : [],
  });
  else houder.render({ text: u.einde.tekst });
}
