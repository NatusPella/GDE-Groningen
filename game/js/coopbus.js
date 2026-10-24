// Samen een bus rijden, de lijm met het spel (#444, coöp): bij de gastheer (die de wereld draait) bepaalt dit wie er aan boord zit,
// laat een medespeler de deuren (O) bedienen en de kaartjes valideren (E), betaalt elke halte het volle bedrag aan elke meespeler uit
// (world.coopDeel, coopnet.js) en laat de bus veilig afremmen als de chauffeur wegvalt. De regels staan in buscoop.js (met tests).
// Importeert coopnet.js niet (coopnet.js importeert dit bestand).
import {
  maakBusCoop, startDienst, rolVan, magDeur, valideer, nieuweHalte, wachtend, haltebedrag, haltebeloning, valtWeg, doetMee,
} from './buscoop.js';
import { toggleDeuren } from './busbestuur.js';
import { loopbaanDeel } from './loopbaanlive.js';

export const BUSCOOP_TEKST = {
  geenRol: 'Je rijdt mee als reiziger: een dienst die al loopt heeft geen late instap.',
  deur: (open) => (open ? 'Deuren open.' : 'Deuren dicht.'),
  rijdt: 'Sta eerst stil voordat je de deuren opent.',
  niemand: 'Niemand wacht op een kaartje.',
  gevalideerd: (n, rest) => (rest > 0 ? `Kaartje gevalideerd (${n}). Nog ${rest}.` : `Kaartje gevalideerd (${n}). Iedereen is klaar.`),
  overname: 'De chauffeur is weg: je neemt het stuur over.',
  rem: 'De chauffeur is weggevallen: de bus remt af.',
  halte: (euro) => `Halte betaald: samen €${euro}.`,
};

const BREMS = 6; // m/s^2 waarmee de bus afremt als de chauffeur wegvalt

// De bus waar deze speler in zit: slot 0 de gastheer, 1 de metgezel, hoger de extra spelers. null als dat geen bus is.
export function busVan(world, slot) {
  let v = null;
  if (slot === 0) v = world.player && world.player.inVehicle;
  else if (slot === 1) { const c = world.companion; v = c && (c.inVehicle || c.inVeh) || (world.coopRijders && world.coopRijders[1] && world.coopRijders[1].v); }
  else { const f = world.coopFigures && world.coopFigures[slot]; v = f && f.inVeh; }
  return v && v.isBus ? v : null;
}

// Wie zit er nu aan boord (slots van medespelers, plus de gastheer als hij erin zit).
export function aanBoord(world, bus) {
  const uit = [];
  if (world.player && world.player.inVehicle === bus) uit.push(0);
  if (busVan(world, 1) === bus) uit.push(1);
  for (const f of Object.values(world.coopFigures || {})) if (f && f.slot >= 2 && f.inVeh === bus) uit.push(f.slot);
  return uit;
}

const meld = (world, slot, tekst) => { if (slot === 0) { if (world.addMessage) world.addMessage(tekst, 2.6); } else if (world.coopMeld) world.coopMeld(slot, tekst); };

// De bijbaan Streekbus begint: zet de coöp-toestand aan de bediening van de bus (niet in een save). chauffeur: slot dat rijdt (standaard de gastheer).
export function busCoopStart(world, bus, eerstInstappers = 0) {
  const bed = bus && bus.busBediend; if (!bed) return null;
  const n = world.coopNet;
  const bc = maakBusCoop(n && n.sessieId ? n.sessieId : 's');
  const boord = aanBoord(world, bus);
  const chauffeur = world.player && world.player.inVehicle === bus ? 0 : (boord.find((s) => s !== 0) ?? 0);
  startDienst(bc, { chauffeur, aanboord: boord });
  nieuweHalte(bc, eerstInstappers);
  Object.defineProperty(bed, 'coop', { value: bc, writable: true, configurable: true, enumerable: false });
  return bc;
}

// Een medespeler drukt O (a = 'deur') of E (a = 'valideer') in de bus van de gastheer. true als er iets is gebeurd (of een melding kwam).
export function busCoopActie(world, slot, a) {
  const bus = busVan(world, slot), bed = bus && bus.busBediend, bc = bed && bed.coop;
  if (!bc) return false;
  if (a === 'deur') {
    if (!magDeur(bc, slot)) { meld(world, slot, BUSCOOP_TEKST.geenRol); return true; }
    const r = toggleDeuren(bed, bus.speed);
    meld(world, slot, r.ok ? BUSCOOP_TEKST.deur(r.open) : BUSCOOP_TEKST.rijdt);
    return true;
  }
  if (a === 'valideer') {
    const r = valideer(bc, slot);
    if (r.ok) { meld(world, slot, BUSCOOP_TEKST.gevalideerd(r.gevalideerd, r.resterend)); return true; }
    if (r.reden === 'niemand') { meld(world, slot, BUSCOOP_TEKST.niemand); return true; }
    return false; // E doet dan wat het altijd deed (uitstappen)
  }
  return false;
}

// E van een medespeler: valideert als er kaartjes wachten en hij dat mag; anders false (dan stapt hij uit zoals altijd).
export function busCoopValideerE(world, slot) {
  const bus = busVan(world, slot), bc = bus && bus.busBediend && bus.busBediend.coop;
  if (!bc || !bc.begonnen || !(wachtend(bc) > 0)) return false;
  return busCoopActie(world, slot, 'valideer');
}

// Een halte is afgerond (de deuren zijn dicht en de bus vertrekt): de wereld verdient samen, het volle bedrag voor elke meespeler, zonder
// verdeling. Alleen als er echt meer dan één speler meedoet (solo blijft alles zoals het was). Geeft het bedrag of 0.
export function busCoopBetaal(world, bus, uitw, sat) {
  const bc = bus && bus.busBediend && bus.busBediend.coop;
  if (!bc || !bc.begonnen || bc.deelnemers.length < 2 || !world.coopDeel) return 0;
  const bedrag = haltebedrag({ board: uitw.board, alight: uitw.alight, sat, gevalideerd: bc.gevalideerd });
  if (!bedrag) return 0;
  const boord = aanBoord(world, bus).filter((s) => doetMee(bc, s));
  const slots = bc.deelnemers.filter((s) => s === 0 || boord.includes(s) || s === bc.chauffeur);
  if (slots.length < 2) return 0;
  world.money = (world.money || 0) + bedrag; // de gastheer krijgt eerst alles; coopDeel geeft elke meespelende gast hetzelfde bedrag
  world.coopDeel(bedrag, { ...loopbaanDeel('bus', bedrag, 1), slots: slots.filter((s) => s !== 0) });
  if (world.addMessage) world.addMessage(BUSCOOP_TEKST.halte(bedrag), 2.4);
  haltebeloning(bc, { board: uitw.board, alight: uitw.alight, sat, slots }); // boekt het volgnummer van de halte
  return bedrag;
}

// Elke frame tijdens de dienst: valt een meedoende speler weg, dan neemt een ander het stuur of remt de bus veilig af.
export function busCoopTik(world, bus, dt) {
  const bed = bus && bus.busBediend, bc = bed && bed.coop;
  if (!bc || !bc.begonnen) return null;
  const boord = aanBoord(world, bus);
  let actie = null;
  for (const slot of [...bc.deelnemers]) {
    if (slot === 0 || boord.includes(slot)) continue;
    if (world.coopNet && world.coopNet.hub && world.coopNet.hub.roster) { // alleen echt weg als hij uitstapte of wegviel
      const s = world.coopNet.hub.roster.spelers.find((x) => x.slot === slot);
      if (s && s.verbinding !== 'lost' && bus.speed > 3) continue; // nog onderweg: even wachten tot de stoel echt leeg is
    }
    const r = valtWeg(bc, slot, boord);
    if (r.actie === 'overnemen') { meld(world, r.chauffeur, BUSCOOP_TEKST.overname); actie = r; }
    else if (r.actie === 'remmen') actie = r;
  }
  if (bc.deelnemers.length === 0 || (actie && actie.actie === 'remmen')) bc.remmen = true;
  if (bc.remmen) {
    const sp = bus.speed || 0;
    bus.throttle = 0;
    bus.speed = Math.abs(sp) <= BREMS * dt ? 0 : sp - Math.sign(sp) * BREMS * dt;
    if (bus.speed === 0) { bus.handbrake = true; bc.remmen = false; if (world.addMessage) world.addMessage(BUSCOOP_TEKST.rem, 3); }
  }
  return actie;
}
