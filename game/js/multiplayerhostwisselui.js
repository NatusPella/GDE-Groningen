// Samen spelen (#439): het spel overdragen, het deel dat je ziet en de echte route. De gegevens komen uit world.coopWisselUi
// (coophostwisselnet.js, getest in scripts/coop/hostwissel_test.mjs): de vraag (J of N), de pauzemelding en de slotmelding.
// De route is dezelfde als in de wachtkamer: een kamer via rtcroom en de openbare brokers, zonder nieuwe code in te voeren (de
// oude host geeft de nieuwe kamer door in hw-verbind). Alleen DOM en netwerk; niet door een mens in beeld bekeken en nog niet over
// echt internet geprobeerd (docs/COOP-OVERDRAGEN.md).
import { handshakeInfo } from './coopnet.js';
import { zetWisselDeps, antwoordVraag, annuleerOverdracht } from './coophostwisselnet.js';
import { hostRoom, joinRoom, verwijsKamer } from './net/rtcroom.js';
import { MultiSignaler } from './net/brokers.js';
import * as CONFIG from './net/netconfig.js';
import { makeRoom } from './net/sigcrypto.js';
import { wisselWereldHaken } from './coophostwisselwereld.js';
import { meet, beoordeel, verbindingslog } from './net/diagnose.js';
import { maakEnv } from './net/diagnoseenv.js';
import { mountOverlay } from './coopoverlay.js';
import { readSession, writeSession, toSession } from './coopsave.js';

const newSignaler = () => new MultiSignaler(CONFIG, { socket: (url) => { const ws = new WebSocket(url); ws.binaryType = 'arraybuffer'; return ws; } },
  { fallbackAfter: CONFIG.TIMEOUTS.fallbackAfter, brokerTimeout: CONFIG.TIMEOUTS.broker });
const KAMER_OPEN_MS = 5 * 60 * 1000; // zo lang blijft de kamer van de nieuwe host open voor wie nog moet aansluiten

// De route voor de overdracht (deps van coophostwisselnet.js). opts: { fade, scene, onHold } zoals samenpanel.js ze ook aan startHost geeft.
function wisselRoute(world, opts = {}) {
  const api = typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.coop ? window.gdeDesktop.coop : null;
  return {
    ...wisselWereldHaken(world), // opdracht, kapotte objecten, voertuigen, plek en geld per gast (coophostwisselwereld.js)
    info: () => handshakeInfo({ tiles: '-', story: 'nieuw' }),
    maakKamer: () => makeRoom(), // de kamercodes van de opvolgers (overname bij wegvallen)
    hostOpts: () => ({ fade: opts.fade, route: 'kamer', scene: opts.scene, onHold: opts.onHold }),
    clientOpts: () => ({ fade: opts.fade, route: 'kamer', onHold: opts.onHold }),
    onCode: (code) => { let ls = null; try { ls = localStorage; } catch (e) { return; } if (ls) writeSession(ls, toSession(readSession(ls), { code })); }, // #983: de kamer van de nieuwe host als laatste code
    // de nieuwe host opent een kamer en blijft aanbiedingen klaarzetten, één per speler, zoals de wachtkamer doet
    opKamer: async ({ aanvaard, kamer }) => {
      const room = kamer || makeRoom(); // een opvolger gebruikt de code die de groep al kent
      let gestopt = false, handle = null;
      let fouten = 0;
      const open = async () => {
        if (gestopt) return;
        // #983: alleen een aanbod waar niemand op antwoordde; cancel() sluit sinds #589 ook een open kanaal, en dat is een speler die al verbonden is
        if (handle && handle.cancel && !(handle.transport && handle.transport.isOpen())) handle.cancel();
        handle = await hostRoom(room, { signaler: newSignaler(), timeouts: CONFIG.TIMEOUTS, onstate: (s) => {
          if (s === 'open') { fouten = 0; open().catch(() => {}); }
          // #1059: een mislukte verbinding (ICE 'failed', antwoord dat niet klopte) liet de kamer dood: er kwam nooit een nieuw aanbod. Nu komt er
          // na een korte, groeiende wachttijd een vers aanbod, tot de kamer sluit.
          else if (s === 'fout' && !gestopt) { fouten++; setTimeout(() => { if (!gestopt) open().catch(() => {}); }, Math.min(8000, 500 * 2 ** Math.min(fouten, 4))); }
        } });
        aanvaard(handle.transport);
      };
      await open();
      const stop = () => { gestopt = true; if (handle && handle.cancel) handle.cancel(); };
      setTimeout(stop, KAMER_OPEN_MS);
      return { kamer: room, stop };
    },
    // wie aansluit: een kamer, met de tijden van de wachtkamer
    // (joinRoom beslist nooit als het misgaat: na de verbindtijd geven we het op, anders bleef een poging eeuwig hangen)
    // opt.tijd (ms): de pogingen bij een overname zijn kort (#1059): na dat aantal ms geeft deze poging het op en doet de zoektocht een nieuwe.
    // Een ICE-fout (failed) meldt zich meteen en een verhuisde kamer (verhuisd-naar) komt terug als fout met .verhuisd.
    verbind: async (kamer, opt = {}) => {
      const tijd = Number.isFinite(opt.tijd) ? opt.tijd : CONFIG.TIMEOUTS.connect + 2000;
      const h = await joinRoom(kamer, { signaler: newSignaler(), timeouts: { ...CONFIG.TIMEOUTS, connect: Math.min(CONFIG.TIMEOUTS.connect, tijd) } });
      let t; const op = new Promise((_, nee) => { t = setTimeout(() => { try { h.cancel(); } catch (e) { /* al weg */ } nee(new Error('time-out')); }, tijd + 2000); });
      const mis = h.failed ? h.failed.then((f) => { throw Object.assign(new Error((f && f.tekst) || 'mislukt'), f && f.verhuisd ? { verhuisd: f.verhuisd } : {}); }) : new Promise(() => {});
      try { return await Promise.race([h.opened, op, mis]); } finally { clearTimeout(t); }
    },
    // (#1059) de opvolger kon de afgesproken kamer niet openen: onder de oude code staat een verwijzing naar de nieuwe
    verwijs: async (oud, nieuw) => { const r = await verwijsKamer(oud, nieuw, { signaler: newSignaler() }); setTimeout(() => r.stop(), KAMER_OPEN_MS); return r; },
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

export function stopWisselUi() {
  if (timer) { clearInterval(timer); timer = null; }
  if (typeof window !== 'undefined') window.removeEventListener('keydown', toets);
  if (houder) { houder.close(); houder = null; }
  overlay = null;
  laatste = '';
  huidige = null;
}

function startWisselUi(world) {
  huidige = world;
  laatste = '';
  if (timer || typeof document === 'undefined') return;
  timer = setInterval(() => teken(huidige), 200);
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
  if (!world) return;
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
        const w = huidige;
        if (!w) return;
        if (a === 'ja') antwoordVraag(w, true);
        else if (a === 'nee') antwoordVraag(w, false);
        else if (a === 'stop') annuleerOverdracht(w);
      },
    });
    overlay = houder && houder.el;
  }
  if (!houder) return;
  const w = world.coopWissel;
  const kanStoppen = !!(w && w.oud && w.oud.bezig);
  if (u.vraag) houder.render({
    title: 'Het spel overnemen?',
    text: `${u.vraag.tekst} Daarna draait het spel op jouw computer; tijd, weer en je voortgang blijven zoals ze waren. Nog ${u.vraag.rest} seconden. Zonder antwoord is het nee.`,
    buttons: [{ action: 'ja', label: 'Ja', toets: 'J', primary: true }, { action: 'nee', label: 'Nee', toets: 'N' }],
  });
  else if (u.pauze) houder.render({
    title: 'Even wachten', text: u.pauze.tekst,
    buttons: kanStoppen ? [{ action: 'stop', label: 'Stoppen', primary: true }] : [],
  });
  else houder.render({ text: u.einde.tekst });
}
