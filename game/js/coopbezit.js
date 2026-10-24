// Samen spelen (#449): je eigen voertuig meenemen naar de wereld van een ander
// ("bezorgen en delen"). Het voertuig blijft in de eigen save van de eigenaar;
// de gastheer zet een kopie in zijn wereld met dezelfde kleur, onderdelen en
// schade, en de snapshot laat hem bij iedereen met het echte model zien (#428).
// De host bewaart de kopie niet: ze gaat weg als de eigenaar weggaat en staat
// nooit in zijn collectie of zijn save.
//
// Dit bestand is de regel, puur: geen three.js en geen wereld van de host.
// main.js zet de wereldhaken met zetDeelHaken; de testbank zet nepversies.
// De gast vraagt het aan in ownedvehicles.js (deliverOwnedVehicle ->
// world.coopBezitVraag), de host voert het uit in bezorgHost (coopnet.js,
// bericht 'bezorg'), en magGebruiken bepaalt wie erin mag (coopbestuur.js).
import { lichaamVan } from './coopbestuur.js';

// Rechten per voertuig. 'vrienden' komt erbij zodra er een vriendenlijst is (#449);
// tot die tijd is het een keuze tussen alleen ik en iedereen in de sessie.
export const RECHTEN = ['ik', 'iedereen'];
export const RECHT_TEKST = { ik: 'alleen ik', iedereen: 'iedereen' };
export const STANDAARD_RECHT = 'iedereen'; // meenemen is delen; alleen ik houdt hem voor jezelf
export const MAX_BEZORG = 2;   // per speler tegelijk in de sessie
export const MAX_UPGRADES = 8;
export const MAX_DENTS = 12;
export const SLEUTEL = /^[a-z0-9_]{1,24}$/; // een sleutel uit de garage ('hero' of een winkel)
const HEX = /^#[0-9a-f]{6}$/i;

// De stand van het delen in deze sessie: de rechten van je eigen voertuigen en,
// bij de host, wat elke speler al bezorgd heeft.
export const nieuweDeelStaat = () => ({ rechten: {}, bezorgd: {} });

export function rechtVan(staat, id) {
  const r = staat && staat.rechten ? staat.rechten[id] : null;
  return RECHTEN.includes(r) ? r : STANDAARD_RECHT;
}

// Geeft het nieuwe recht, of null bij onzin (dan blijft het zoals het was).
export function zetDeelRecht(staat, id, recht) {
  if (!staat || typeof id !== 'string' || !RECHTEN.includes(recht)) return null;
  staat.rechten[id] = recht;
  return recht;
}

export const wisselRecht = (recht) => (recht === 'ik' ? 'iedereen' : 'ik');

// Mag deze speler in het voertuig van iemand anders? De eigenaar altijd; een ander
// alleen als de eigenaar hem deelt. De host (plek 0) stapt in zijn eigen wereld in
// wat hij wil: daar gaat deze regel niet over.
export function magGebruiken(recht, slot, eigenaar) {
  if (slot === eigenaar) return true;
  return (recht || STANDAARD_RECHT) !== 'ik';
}

// Wat er van een eigen voertuig over de lijn gaat (ownedvehicles.js bezorgGegevens):
// alleen gegevens, geen objecten en niets uit de save. Wat de host leest wordt hier
// opnieuw gecontroleerd; een gast die onzin stuurt, verandert niets.
export function leesBezorg(body) {
  if (!body || typeof body !== 'object' || body.k !== 'bezorg') return null;
  if (typeof body.id !== 'string' || !SLEUTEL.test(body.id)) return null;
  const ups = Array.isArray(body.upgrades) ? body.upgrades.filter((u) => typeof u === 'string' && SLEUTEL.test(u)).slice(0, MAX_UPGRADES) : [];
  const dents = Array.isArray(body.dents) ? body.dents.filter((d) => Array.isArray(d) && d.length === 3 && d.every(Number.isFinite)).map((d) => d.map((n) => Math.max(-2, Math.min(2, n)))).slice(0, MAX_DENTS) : [];
  return {
    id: body.id,
    color: typeof body.color === 'string' && HEX.test(body.color) ? body.color : null,
    upgrades: ups,
    dents,
    health: Number.isFinite(body.health) ? Math.max(5, Math.min(100, Math.round(body.health))) : 100,
    flat: body.flat === true,
    recht: RECHTEN.includes(body.recht) ? body.recht : STANDAARD_RECHT,
  };
}

export function bezorgEvent(g, recht) {
  return {
    k: 'bezorg', id: g.id, color: g.color || null, upgrades: g.upgrades || [],
    dents: g.dents || [], health: g.health, flat: !!g.flat,
    recht: RECHTEN.includes(recht) ? recht : STANDAARD_RECHT,
  };
}

// De gast: vraag de gastheer om je voertuig in de sessie te zetten. Er gaat niets
// van je eigen wereld mee: de host maakt zijn eigen kopie (coopbezit.js bezorgHost).
export function bezorgVraag(world, g) {
  const n = world && world.coopNet;
  if (!n || n.role !== 'client' || !n.session || !n.session.sendEvent) return { ok: false, tekst: 'Je speelt niet in een sessie.' };
  if (!g || typeof g.id !== 'string' || !SLEUTEL.test(g.id)) return { ok: false, tekst: 'Dat voertuig heb je niet.' };
  if (g.kind === 'boat' || g.kind === 'heli') return { ok: false, tekst: 'Boten en de helikopter kun je nog niet meenemen.' };
  if (world.player && world.player.inVehicle) return { ok: false, tekst: 'Stap eerst uit je voertuig.' };
  if (!n.session.sendEvent(bezorgEvent(g, rechtVan(world.coopBezit, g.id)))) return { ok: false, tekst: 'De gastheer is even niet bereikbaar.' };
  const naam = g.label || g.model || 'voertuig';
  return { ok: true, tekst: `De gastheer zet je ${naam} bij je neer.` };
}

// Mag deze speler dit voertuig nog bezorgen? De host houdt de telling bij.
export function bezorgControle(staat, slot, v) {
  if (!(slot > 0)) return { ok: false, tekst: 'Alleen een gast brengt een eigen voertuig mee.' };
  const lijst = (staat && staat.bezorgd && staat.bezorgd[slot]) || [];
  if (lijst.includes(v.id)) return { ok: false, tekst: 'Dat voertuig staat al in de sessie.' };
  if (lijst.length >= MAX_BEZORG) return { ok: false, tekst: `Je kunt hooguit ${MAX_BEZORG} eigen voertuigen tegelijk meenemen.` };
  return { ok: true, tekst: '' };
}

// De wereldhaken: spec(key) -> spec (ownedvehicles.js eigenSpec), plek(world, x, y,
// model, opts) -> { x, y, angle } (ownedvehicles.js findParkingSpot) en
// maak(world, gegevens, x, y, angle) -> voertuig (shops.js spawnSharedVehicle).
// main.js zet ze; de testbank zet nepversies.
const haken = { spec: null, plek: null, maak: null };
export function zetDeelHaken(h) { Object.assign(haken, h || {}); }

const meld = (world, slot, tekst) => { if (world.coopMeld) world.coopMeld(slot, tekst); else if (world.addMessage) world.addMessage(tekst, 4); };
const spelerNaam = (world, slot) => {
  const r = (world.coopRoster || []).find((x) => x && x.slot === slot);
  return (r && r.naam) || 'Een speler';
};
// Naar de gastheer en alle andere gasten, behalve de eigenaar zelf.
function meldAnderen(world, behalve, tekst) {
  if (world.addMessage) world.addMessage(tekst, 4);
  const n = world.coopNet;
  if (!n || !n.hub || !n.hub.roster) return;
  const kort = String(tekst).slice(0, 90);
  for (const s of n.hub.roster.spelers) if (s.slot !== 0 && s.slot !== behalve && s.verbinding !== 'lost') n.hub.announce({ k: 'melding', tekst: kort }, s.slot);
}

// De host zet het voertuig van deze gast neer, bij hem in de buurt. Geeft true als
// het gelukt is. De kopie hoort bij de gast (coopBezit) en niet bij de collectie
// van de host; de snapshot laat hem aan iedereen zien.
export function bezorgHost(world, slot, body) {
  const n = world && world.coopNet;
  if (!n || n.role !== 'host' || !(slot >= 1)) return false;
  const v = leesBezorg(body);
  if (!v) return false;
  const staat = world.coopBezit || (world.coopBezit = nieuweDeelStaat());
  const c = bezorgControle(staat, slot, v);
  if (!c.ok) { meld(world, slot, c.tekst); return false; }
  const l = lichaamVan(world, slot);
  if (!l) return false;
  if (l.inVehicle || l.inVeh) { meld(world, slot, 'Stap eerst uit je voertuig.'); return false; }
  const spec = haken.spec ? haken.spec(v.id) : null;
  if (!spec) { meld(world, slot, 'Dat voertuig ken ik niet.'); return false; }
  if (spec.kind === 'boat' || spec.kind === 'heli') { meld(world, slot, 'Boten en de helikopter kun je nog niet meenemen.'); return false; }
  const plek = haken.plek ? haken.plek(world, l.x, l.y, spec.model, { outOfView: false, minDist: 3, maxDist: 45 }) : null;
  if (!plek) { meld(world, slot, 'Hier past hij niet. Ga op een open plek staan.'); return false; }
  const maak = haken.maak;
  const voertuig = maak ? maak(world, { spec, color: v.color || spec.color, upgrades: v.upgrades, health: v.health, dents: v.dents.length ? v.dents : null, flat: v.flat }, plek.x, plek.y, plek.angle || 0) : null;
  if (!voertuig) { meld(world, slot, 'De bezorger kan hier niet komen.'); return false; }
  voertuig.coopBezit = { slot, id: v.id, recht: v.recht };
  (staat.bezorgd[slot] || (staat.bezorgd[slot] = [])).push(v.id);
  const naam = spec.label || 'voertuig';
  meld(world, slot, `Je ${naam} staat klaar.${v.recht === 'ik' ? ' Alleen jij mag erin.' : ' De anderen mogen er ook in.'}`);
  meldAnderen(world, slot, `${spelerNaam(world, slot)} heeft een eigen voertuig meegenomen: ${naam}.${v.recht === 'ik' ? '' : ' Je mag erin rijden.'}`);
  return true;
}

// De eigenaar gaat weg (of de sessie stopt): zijn voertuig gaat mee terug. Wie er
// op dat moment in rijdt, stapt eerst uit (uitstappen: (slot) => ... van coopnet).
export function bezorgWeg(world, slot, uitstappen = null) {
  if (world.coopBezit && world.coopBezit.bezorgd) delete world.coopBezit.bezorgd[slot];
  if (!Array.isArray(world.vehicles)) return 0;
  let n = 0;
  for (let i = world.vehicles.length - 1; i >= 0; i--) {
    const v = world.vehicles[i];
    if (!v || !v.coopBezit || v.coopBezit.slot !== slot) continue;
    for (const [s, r] of Object.entries(world.coopRijders || {})) if (r && r.v === v && uitstappen) uitstappen(+s);
    const j = world.vehicles.indexOf(v);
    if (j >= 0) { world.vehicles.splice(j, 1); n++; }
  }
  return n;
}

export function bezorgAllesWeg(world, uitstappen = null) {
  const slots = new Set(Object.keys((world.coopBezit && world.coopBezit.bezorgd) || {}).map(Number));
  for (const v of world.vehicles || []) if (v && v.coopBezit) slots.add(v.coopBezit.slot);
  let n = 0;
  for (const s of slots) n += bezorgWeg(world, s, uitstappen);
  return n;
}
