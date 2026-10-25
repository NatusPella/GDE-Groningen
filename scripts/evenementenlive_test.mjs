// Evenementen in de wereld (evenementenlive.js, #203): afsluitingen ruimen verkeer, indeling van props en menigte.
//   node scripts/evenementenlive_test.mjs
import * as L from '../game/js/evenementenlive.js';
import { AGENDA, KINDS, centreOf, isActive, trafficFactor } from '../game/js/evenementen.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

// props en menigte: vast, binnen de afsluiting, alleen bekende props
for (const ev of AGENDA) {
  const k = KINDS[ev.kind], a = L.propLayout(ev), b = L.propLayout(ev);
  check('indeling is vast ' + ev.id, JSON.stringify(a) === JSON.stringify(b));
  check('props bekend ' + ev.id, a.length > 0 && a.every((p) => k.props.includes(p.prop)));
  check('props binnen afsluiting ' + ev.id, a.every((p) => Math.hypot(p.dx, p.dy) <= k.closure));
  const c = L.crowdSpots(ev);
  check('menigte binnen afsluiting ' + ev.id, c.length === L.MAX_CROWD && c.every((s) => Math.hypot(s.dx, s.dy) <= k.closure));
  check('menigte-aantal ' + ev.id, L.crowdCount(ev) > 0 && L.crowdCount(ev) <= L.MAX_CROWD);
}

// verkeer weg uit een dichte afsluiting, maar niet bij de speler, niet van de speler
const ev = AGENDA.find((e) => KINDS[e.kind].traffic === 0);
const c = centreOf(ev), day = ev.from, hour = (ev.hours[0] + ev.hours[1]) / 2;
check('proef: evenement actief', isActive(ev, day, hour));
check('proef: midden dicht', trafficFactor(c.x, c.y, day, hour) <= 0);
const far = { x: c.x + 5000, y: c.y };
const cars = [
  { id: 1, x: c.x, y: c.y },
  { id: 2, x: c.x, y: c.y, playerOwned: true },
  { id: 3, x: c.x, y: c.y, driver: 'player' },
  { id: 4, x: c.x, y: c.y, isPolice: true },
  { id: 5, x: c.x + 5000, y: c.y },
];
const out = L.vehiclesToClear(cars, far, day, hour).map((v) => v.id);
check('alleen gewoon verkeer in het gebied gaat weg', out.length === 1 && out[0] === 1, out.join());
const near = L.vehiclesToClear(cars, { x: c.x + 5, y: c.y }, day, hour);
check('dicht bij de speler blijft staan', near.length === 0);
check('buiten de uren niets te ruimen', L.vehiclesToClear(cars, far, day, 4).length === 0);
check('aankomsttekst noemt de naam', L.arrivalText(ev).includes(ev.naam));

// fitLayout: bezette plekken schuiven op of vallen weg, vrije blijven staan
{
  const ev0 = AGENDA[0], items = L.propLayout(ev0);
  check('fit: alles vrij laat alles staan', L.fitLayout(ev0, items, () => true).length === items.length);
  check('fit: niets vrij laat niets staan', L.fitLayout(ev0, items, () => false).length === 0);
  const half = (dx) => dx > 0; // alleen de oostkant is vrij
  const fit = L.fitLayout(ev0, items, half);
  check('fit: alleen vrije plekken over', fit.every((q) => q.dx > 0) && fit.length > 0);
  check('fit: vast per evenement', JSON.stringify(fit) === JSON.stringify(L.fitLayout(ev0, items, half)));
  check('fit: binnen de afsluiting', fit.every((q) => Math.hypot(q.dx, q.dy) <= KINDS[ev0.kind].closure));
}
{
  let q = 0.3; const rand = () => (q = (q * 7.7 + 0.13) % 1);
  const g = L.groupSpot(AGENDA[0], rand), cc = L.centreOf(AGENDA[0]);
  check('groepsplek binnen het evenement', Math.hypot(g.x - cc.x, g.y - cc.y) <= 160 && g.n >= 2 && g.n <= 4);
  check('menigtecap > 0', L.crowdPedCap(AGENDA[0]) > 0);
}
// een gast ziet en hoort het evenement ook, maar ruimt geen voertuigen op (#452)
{
  const keuze = AGENDA.filter((e) => KINDS[e.kind].traffic === 0 && KINDS[e.kind].closure > 50 && e.from <= 40);
  const proef = (ev, rol) => {
    const mid = centreOf(ev), d = ev.from, h = (ev.hours[0] + ev.hours[1]) / 2;
    const w = {
      coopRole: rol, map: {}, clock: h, time: 0,
      player: { x: mid.x + 45, y: mid.y }, // binnen de afsluiting, maar verder dan 40 m van de auto
      vehicles: [{ id: 1, x: mid.x, y: mid.y }, { id: 2, x: mid.x, y: mid.y, playerOwned: true }],
      messages: [], addMessage(t) { this.messages.push(t); },
    };
    L.updateEvenementen(2, w, d);
    return { w, ev };
  };
  const gast = proef(keuze[0], 'client');
  check('gast: het evenement is actief', gast.w.eventsNow.some((e) => e.id === gast.ev.id));
  check('gast: het geluid van het evenement', !!gast.w.eventSound && gast.w.eventSound.id === gast.ev.id);
  check('gast: de aankomstmelding', gast.w.messages.some((m) => m.includes(gast.ev.naam)));
  check('gast: zijn voertuigen blijven staan', gast.w.vehicles.length === 2, String(gast.w.vehicles.length));
  const host = proef(keuze[1], 'host');
  check('gastheer: gewoon verkeer in de afsluiting gaat weg', host.w.vehicles.length === 1 && host.w.vehicles[0].id === 2, host.w.vehicles.map((v) => v.id).join());
  check('gastheer: ook evenementen en geluid', host.w.eventsNow.some((e) => e.id === host.ev.id) && !!host.w.eventSound);
}
console.log(`evenementenlive_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
