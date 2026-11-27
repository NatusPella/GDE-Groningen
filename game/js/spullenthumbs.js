// De 3D-plaatjes van de Spullen-galerij (spullen-ui 21-11). Elke tegel krijgt een stilstaand beeld van zijn model, getekend door
// dezelfde gedeelde renderer als de Garage (vehiclepreview.js renderSnapshot: één WebGL-context, idle-tijd, een budget per ronde).
// Lui: alleen de tegels in of vlak bij het beeld vragen een plaatje (spullenraster.thumbPlan, hooguit `max` per ronde, de gekozen tegel
// eerst); bij scrollen volgen de rest. Gelijke dingen delen één plaatje. Bij sluiten gaan de plaatjes terug (release).
// Zonder model of zonder WebGL (leeg plaatje) blijft het icoon staan: de enige plek waar de galerij een icoon toont.
// Alles wat de wereld raakt komt binnen als parameter, zodat scripts/spullenraster_test.mjs het zonder three kan doorlopen.
// Samen spelen: lokale weergave van de eigen spullen (#429); niets over het netwerk.
import { thumbPlan, thumbSleutel, kolommenUitTops, visibleIndices } from './spullenraster.js';
import { escapeHtml } from './htmlescape.js';

const THUMB_GROUP = 'spullen';
const THUMB_HOEK = 0.6; // schuin van voren, zoals de Garage
const THUMB_ZOOM = 1.12;

const defaultScheduler = (fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(fn, 16));

// lijst: de scrollende container met de tegels (.sp-tile, in de volgorde van `items`).
// opties: { items, maat: () => ({ thumbW, thumbH }), gekozen: () => index, render, release, cancel, icoon: (item) => html, max, marge }
export function createThumbs(lijst, o) {
  const { items, maat, render, release = () => 0, cancel = () => {}, icoon = () => '', max = 18, marge = 160 } = o;
  const klaar = new Set(); // sleutels met een plaatje (of een eerlijk niets)
  const requested = new Set();
  const urls = new Map();
  let wacht = false;
  let weg = false;
  let requestCount = 0;

  const tegels = () => [...lijst.querySelectorAll('.sp-tile')];

  // een plaatje in elke tegel zetten die dit model toont
  const zet = (sleutel, url) => {
    const { thumbW, thumbH } = maat();
    for (const t of tegels()) {
      const it = items[Number(t.dataset.i)];
      if (!it || thumbSleutel(it.viewer, thumbW, thumbH) !== sleutel) continue;
      const ph = t.querySelector('.sp-ph');
      if (!ph) continue;
      if (url) { ph.innerHTML = `<img alt="" draggable="false" src="${escapeHtml(url)}">`; ph.dataset.state = 'klaar'; } else { ph.innerHTML = icoon(it); ph.dataset.state = 'icoon'; }
    }
  };

  function vul() {
    wacht = false;
    if (weg) return;
    const ts = tegels();
    if (!ts.length) return;
    const { thumbW, thumbH } = maat();
    const tops = ts.map((t) => t.offsetTop);
    const kolommen = kolommenUitTops(tops);
    const rijH = ts.length > kolommen ? tops[kolommen] - tops[0] : (ts[0].offsetHeight || 1) + 12;
    const indices = visibleIndices({ scrollTop: lijst.scrollTop, hoogte: lijst.clientHeight, rijH, kolommen, aantal: ts.length, marge });
    const gekozen = typeof o.gekozen === 'function' ? o.gekozen() : -1;
    const plan = thumbPlan({ indices, items, klaar, requested, gekozen, w: thumbW, h: thumbH, max });
    for (const p of plan) {
      requested.add(p.sleutel);
      requestCount++;
      const url = render(p.spec, thumbW, thumbH, (u) => {
        if (weg) return;
        requested.delete(p.sleutel);
        klaar.add(p.sleutel);
        urls.set(p.sleutel, u || '');
        zet(p.sleutel, u);
        if (!requested.size) inplannen(); // de ronde is af: de rest van wat in beeld staat volgt
      }, { angle: THUMB_HOEK, zoom: THUMB_ZOOM, group: THUMB_GROUP, prio: true });
      void url; // een plaatje uit de cache komt ook via de terugroep binnen
    }
  }

  const inplannen = () => { if (!wacht && !weg) { wacht = true; (o.planner || defaultScheduler)(vul); } };
  const onScroll = () => inplannen();
  lijst.addEventListener('scroll', onScroll, { passive: true });
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('resize', onScroll);
  inplannen();

  return {
    vul: inplannen,
    // de plaatjes die al klaar zijn, voor het stilstaande beeld achter het detail
    url: (spec) => { const { thumbW, thumbH } = maat(); return urls.get(thumbSleutel(spec, thumbW, thumbH)) || ''; },
    stats: () => ({ klaar: klaar.size, requested: requested.size, requestCount }),
    // geef = false: alleen de tegels worden opnieuw getekend (een actie), de plaatjes blijven in de cache voor de volgende tekening
    dispose(geef = true) {
      weg = true;
      lijst.removeEventListener('scroll', onScroll);
      if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('resize', onScroll);
      cancel(THUMB_GROUP);
      if (geef) release(THUMB_GROUP);
      klaar.clear(); requested.clear(); urls.clear();
    },
  };
}
