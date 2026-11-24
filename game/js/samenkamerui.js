// Samen spelen: de tabbladen Uitnodigen en Sessie van de kamer (ontwerp 24-11, hoofdstuk 5i). De HTML is puur (samenspelers.js); dit bestand haalt de gegevens uit de sessie
// en bindt de knoppen: de code kopiëren, weer privé maken (vasthouden), voorstellen om te stoppen (een gezamenlijke keuze, geen hostrecht) en het spel verlaten.
// Nooit een IP-adres: alleen de kamercode of de naam van een openbare sessie. Niet door een mens in een echte sessie bekeken.
import { KOPIEER } from './playerstatus.js';
import { uitnodigenHtml, sessieHtml } from './samenspelers.js';
import { readSession } from './coopsave.js';
import { groepAkkoord } from './coopgroep.js';
import { stopCoopNet } from './coopnet.js';
import { toonBevestiging } from './spelbevestig.js';
import { isSoloHost } from './coopsolo.js';
import { setVisibleInterval } from './visibletimer.js';

const echt = (world) => !!(world && world.coopNet && !isSoloHost(world));
const opener = (world) => ((world.coopSpelers || []).find((r) => r.slot === 0) || {}).naam || 'de ander';
function code() { try { return readSession(localStorage).laatsteCode || ''; } catch (e) { return ''; } }

const timers = new WeakMap();
function monteer(root, world, soort) {
  const teken = () => {
    if (!root.isConnected || root.closest('[hidden]')) { const t = timers.get(root); if (t) { clearInterval(t); timers.delete(root); } return; }
    if (!echt(world)) { root.innerHTML = '<p class="ss-hulp">Je speelt nu alleen. Open je spel of doe mee bij Samen spelen.</p>'; return; }
    const n = world.coopNet, host = n.role === 'host', hub = host ? n.hub : null;
    const rijen = world.coopSpelers || [];
    const html = soort === 'uitnodigen'
      ? uitnodigenHtml({ code: code(), openbaar: !!(hub && hub.openbaar), openbaarNaam: hub && hub.openbaar ? hub.openbaar.naam : '', rol: host ? 'host' : 'gast', openerNaam: opener(world), spelers: rijen, max: (hub && hub.roster && hub.roster.max) || 8 })
      : sessieHtml({ naam: hub && hub.openbaar ? hub.openbaar.naam : (world.coopSessieNaam || ''), openbaar: !!(hub && hub.openbaar), max: (hub && hub.roster && hub.roster.max) || 8, wachtwoord: !!(hub && hub.wachtwoord), rol: host ? 'host' : 'gast', openerNaam: opener(world), logboek: world.coopLogboek || [] });
    if (root.dataset.sig !== html) { root.dataset.sig = html; root.innerHTML = html; }
  };
  if (!root.dataset.gebonden) {
    root.dataset.gebonden = '1';
    root.addEventListener('click', (e) => {
      const k = e.target.closest && e.target.closest('[data-kopieer]');
      if (k) {
        const c = k.getAttribute('data-kopieer');
        const klaar = (ok) => { k.textContent = ok ? 'Gekopieerd' : KOPIEER.mislukt; };
        try { navigator.clipboard.writeText(c).then(() => klaar(true), () => klaar(false)); } catch (er) { klaar(false); }
        return;
      }
      if (e.target.closest('[data-privaat]')) {
        const hub = world.coopNet && world.coopNet.hub;
        toonBevestiging({
          titel: 'Weer privé maken?', tekst: 'Je sessie verdwijnt uit de lijst met openbare sessies.',
          verlies: [{ soort: 'weg', label: 'Je verliest', tekst: 'de plek in de lijst: nieuwe spelers vinden je sessie niet meer' }, { soort: 'blijft', label: 'Blijft', tekst: 'iedereen die al in de sessie zit, en wie de kamercode al heeft' }],
          acties: [{ label: 'Nee, laat openbaar', soort: 'veilig' }, { label: 'Houd vast om privé te maken', soort: 'gevaar', vasthouden: true }],
        }).then((i) => { if (i === 1 && hub && hub.zetOpenbaar) { hub.zetOpenbaar(false); if (world.addMessage) world.addMessage('Je sessie is weer privé.', 4); } root.dataset.sig = ''; teken(); });
        return;
      }
      if (e.target.closest('[data-stop-voorstel]')) { groepAkkoord(world, 'stoppen', null, () => stopCoopNet(world)); return; } // iedereen kan het voorstellen; de groep stemt
      if (e.target.closest('[data-verlaat]')) stopCoopNet(world); // een gast verlaat alleen zelf de sessie: je speelt weer je eigen spel
    });
  }
  root.dataset.sig = ''; teken();
  const oud = timers.get(root); if (oud) clearInterval(oud);
  timers.set(root, setVisibleInterval(teken, 1000));
}
export const renderUitnodigen = (root, world) => { if (root) monteer(root, world, 'uitnodigen'); };
export const renderSessie = (root, world) => { if (root) monteer(root, world, 'sessie'); };
