// Samen spelen (#449): je eigen voertuig of pand meenemen naar de wereld van een
// ander ("bezorgen en delen"). Dat geldt voor elk eigen voertuig: de auto, de
// fiets, je boot en de heli. Het voertuig blijft in de eigen save van de
// eigenaar; de gastheer zet een kopie in zijn wereld met dezelfde kleur,
// onderdelen en schade, en de snapshot laat hem bij iedereen met het echte model
// zien (#428). Van een pand zet de host alleen een deur met een markering neer:
// geen interieur, geen sleutel en niets in zijn save of die van de gast. Alles
// gaat weg als de eigenaar weggaat en staat nooit in de collectie van de host.
//
// Dit bestand is de regel, puur: geen three.js en geen wereld van de host.
// main.js zet de wereldhaken met zetDeelHaken; home.js doet de pandhaken en de
// testbank zet nepversies. De gast vraagt het aan in ownedvehicles.js
// (deliverOwnedVehicle -> world.coopBezitVraag) en voor een pand met pandVraag;
// de host voert het uit in bezorgHost (coopnet.js, bericht 'bezorg'), en
// magGebruiken bepaalt wie erin mag (coopbestuur.js).
import { lichaamVan, magGebruiken } from './coopbestuur.js';

// Rechten per voertuig of pand, ook voor je boot en de heli: 'vrienden' komt
// erbij zodra er een vriendenlijst is (#449); tot die tijd is het een keuze
// tussen alleen ik en iedereen in de sessie.
export const RECHTEN = ['ik', 'iedereen'];
export const RECHT_TEKST = { ik: 'alleen ik', iedereen: 'iedereen' };
export const STANDAARD_RECHT = 'iedereen'; // meenemen is delen; alleen ik houdt hem voor jezelf
export const STANDAARD_PAND_RECHT = 'ik';  // je huis is van jou, tenzij je het deelt
export const MAX_BEZORG = 2;   // per speler tegelijk in de sessie
export const MAX_PANDEN = 3;
export const MAX_UPGRADES = 8;
export const MAX_DENTS = 12;
export const SLEUTEL = /^[a-z0-9_]{1,24}$/; // een sleutel uit de garage ('hero' of een winkel)
export const PAND_SLEUTEL = /^h:(pv|gm|wp|wk|bu):[a-z0-9]{1,24}$/i; // een huis uit je profiel ('h:wp:WP1017')
// Een boot en de heli gaan als eigen soort over de lijn: elk heeft zijn eigen
// plek nodig (water, open droge grond) en de host controleert dat met dezelfde
// grenzen als bij een auto. 'voertuig' is de auto, fiets of step.
export const SOORTEN = ['voertuig', 'boot', 'heli', 'pand'];
export const SOORT_TEKST = { voertuig: 'voertuig', boot: 'boot', heli: 'helikopter' };
const HEX = /^#[0-9a-f]{6}$/i;

// De soort bij een spec (ownedvehicles.js eigenSpec): boten en de heli hebben
// een eigen plek nodig; al het andere is een gewoon voertuig.
export function soortVan(spec) {
  const kind = spec && spec.kind;
  return kind === 'boat' ? 'boot' : kind === 'heli' ? 'heli' : 'voertuig';
}

// De stand van het delen in deze sessie: de rechten van je eigen voertuigen en
// panden en, bij de host, wat elke speler al bezorgd heeft.
export const nieuweDeelStaat = () => ({ rechten: {}, bezorgd: {}, panden: {} });

export function rechtVan(staat, id, standaard = STANDAARD_RECHT) {
  const r = staat && staat.rechten ? staat.rechten[id] : null;
  return RECHTEN.includes(r) ? r : standaard;
}

// Geeft het nieuwe recht, of null bij onzin (dan blijft het zoals het was).
export function zetDeelRecht(staat, id, recht) {
  if (!staat || typeof id !== 'string' || !RECHTEN.includes(recht)) return null;
  staat.rechten[id] = recht;
  return recht;
}

export const wisselRecht = (recht) => (recht === 'ik' ? 'iedereen' : 'ik');

// De rechten op een eigen voertuig van een medespeler staan in coopbestuur.js (#449), zodat er geen importkring is.
// Hier alleen doorgeven: andere modules halen hem nog steeds bij dit bestand.
export { magGebruiken };

// Wat er van een eigen voertuig of pand over de lijn gaat: alleen gegevens, geen
// objecten en niets uit de save. Wat de host leest wordt hier opnieuw
// gecontroleerd; een gast die onzin stuurt, verandert niets.
export function leesBezorg(body) {
  if (!body || typeof body !== 'object' || body.k !== 'bezorg') return null;
  if (body.soort === 'pand') return leesPand(body);
  // een ouder bericht zonder soort is een voertuig (#449)
  const soort = body.soort === undefined ? 'voertuig' : body.soort;
  if (soort !== 'voertuig' && soort !== 'boot' && soort !== 'heli') return null;
  return leesVoertuig(body, soort);
}

function leesVoertuig(body, soort = 'voertuig') {
  if (typeof body.id !== 'string' || !SLEUTEL.test(body.id)) return null;
  const ups = Array.isArray(body.upgrades) ? body.upgrades.filter((u) => typeof u === 'string' && SLEUTEL.test(u)).slice(0, MAX_UPGRADES) : [];
  const dents = Array.isArray(body.dents) ? body.dents.filter((d) => Array.isArray(d) && d.length === 3 && d.every(Number.isFinite)).map((d) => d.map((n) => Math.max(-2, Math.min(2, n)))).slice(0, MAX_DENTS) : [];
  return {
    soort,
    id: body.id,
    color: typeof body.color === 'string' && HEX.test(body.color) ? body.color : null,
    upgrades: ups,
    dents,
    health: Number.isFinite(body.health) ? Math.max(5, Math.min(100, Math.round(body.health))) : 100,
    flat: body.flat === true,
    recht: RECHTEN.includes(body.recht) ? body.recht : STANDAARD_RECHT,
  };
}

// Een pand gaat alleen op naam en plek over de lijn: geen interieur, geen
// inrichting, geen sleutel en geen geld. De host controleert de plek op zijn
// eigen kaart (home.js) en zet er alleen een deur met een bord neer.
function leesPand(body) {
  if (typeof body.id !== 'string' || !PAND_SLEUTEL.test(body.id)) return null;
  const x = Number(body.x), y = Number(body.y), ang = Number(body.ang);
  if (![x, y, ang].every(Number.isFinite)) return null;
  if (Math.abs(x) > 100000 || Math.abs(y) > 100000) return null;
  return {
    soort: 'pand', id: body.id, x, y, ang: hoek(ang),
    recht: RECHTEN.includes(body.recht) ? body.recht : STANDAARD_PAND_RECHT,
  };
}

const hoek = (a) => (((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));

export function bezorgEvent(g, recht) {
  if (g && g.soort === 'pand') return pandEvent(g, recht);
  return {
    k: 'bezorg', soort: soortVan(g), id: g.id, color: g.color || null, upgrades: g.upgrades || [],
    dents: g.dents || [], health: g.health, flat: !!g.flat,
    recht: RECHTEN.includes(recht) ? recht : STANDAARD_RECHT,
  };
}

export function pandEvent(p, recht) {
  return {
    k: 'bezorg', soort: 'pand', id: p.id, x: p.x, y: p.y, ang: p.ang,
    recht: RECHTEN.includes(recht) ? recht : STANDAARD_PAND_RECHT,
  };
}

// De gast: vraag de gastheer om je voertuig in de sessie te zetten. Er gaat niets
// van je eigen wereld mee: de host maakt zijn eigen kopie (coopbezit.js bezorgHost).
export function bezorgVraag(world, g) {
  const n = world && world.coopNet;
  if (!n || n.role !== 'client' || !n.session || !n.session.sendEvent) return { ok: false, tekst: 'Je speelt niet in een sessie.' };
  if (!g || typeof g.id !== 'string' || !SLEUTEL.test(g.id)) return { ok: false, tekst: 'Dat voertuig heb je niet.' };
  if (world.player && world.player.inVehicle) return { ok: false, tekst: 'Stap eerst uit je voertuig.' };
  if (!n.session.sendEvent(bezorgEvent(g, rechtVan(world.coopBezit, g.id)))) return { ok: false, tekst: 'Wie het spel opende is even niet bereikbaar.' };
  const naam = g.label || g.model || 'voertuig';
  const werkwoord = soortVan(g) === 'boot' ? 'legt' : 'zet';
  return { ok: true, tekst: `Wie het spel opende ${werkwoord} je ${naam} klaar.` };
}

// De gast: vraag de gastheer om je pand (de deur van je safehouse, boerderij of
// huis) in de sessie te zetten. Alleen de plek gaat mee; je interieur, je
// inrichting en je sleutel blijven in je eigen save.
export function pandVraag(world, p) {
  const n = world && world.coopNet;
  if (!n || n.role !== 'client' || !n.session || !n.session.sendEvent) return { ok: false, tekst: 'Je speelt niet in een sessie.' };
  const pand = leesPand({ k: 'bezorg', soort: 'pand', id: p && p.id, x: p && p.x, y: p && p.y, ang: p && p.ang, recht: p && p.recht });
  if (!pand) return { ok: false, tekst: 'Dat pand heb je niet.' };
  if (!n.session.sendEvent(pandEvent(pand, rechtVan(world.coopBezit, pand.id, STANDAARD_PAND_RECHT)))) return { ok: false, tekst: 'Wie het spel opende is even niet bereikbaar.' };
  return { ok: true, tekst: 'Wie het spel opende zet je pand in de sessie.' };
}

// Mag deze speler dit voertuig of pand nog bezorgen? De host houdt de telling bij.
export function bezorgControle(staat, slot, v) {
  if (!(slot > 0)) return { ok: false, tekst: v && v.soort === 'pand' ? 'Alleen een gast brengt een eigen pand mee.' : 'Alleen een gast brengt een eigen voertuig mee.' };
  if (v && v.soort === 'pand') {
    const panden = (staat && staat.panden && staat.panden[slot]) || [];
    if (panden.includes(v.id)) return { ok: false, tekst: 'Dat pand staat al in de sessie.' };
    if (panden.length >= MAX_PANDEN) return { ok: false, tekst: `Je kunt hooguit ${MAX_PANDEN} eigen panden tegelijk meenemen.` };
    return { ok: true, tekst: '' };
  }
  const lijst = (staat && staat.bezorgd && staat.bezorgd[slot]) || [];
  if (lijst.includes(v.id)) return { ok: false, tekst: 'Dat voertuig staat al in de sessie.' };
  if (lijst.length >= MAX_BEZORG) return { ok: false, tekst: `Je kunt hooguit ${MAX_BEZORG} eigen voertuigen tegelijk meenemen.` };
  return { ok: true, tekst: '' };
}

// De wereldhaken: spec(key) -> spec (ownedvehicles.js eigenSpec), plek(world, x, y,
// model, opts) -> { x, y, angle } (ownedvehicles.js findParkingSpot, die voor een
// boot water en voor de heli open grond zoekt) en maak(world, gegevens, x, y,
// angle) -> voertuig (shops.js spawnSharedVehicle).
// Voor een pand: pand(world, p) -> { x, y, gz } | null (de plek op de kaart van de
// host), pandZet(world, slot, p) -> marker | null en pandWeg(world, slot).
// main.js zet de voertuighaken, home.js de pandhaken; de testbank zet nepversies.
const haken = { spec: null, plek: null, maak: null, pand: null, pandZet: null, pandWeg: null };
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

// De host zet het voertuig van deze gast neer, bij hem in de buurt: een auto aan
// de kant, een boot op het water en de heli op open grond (dezelfde grenzen en
// dezelfde rechten). Geeft true als het gelukt is. De kopie hoort bij de gast
// (coopBezit) en niet bij de collectie van de host; de snapshot laat hem aan
// iedereen zien.
export function bezorgHost(world, slot, body) {
  const n = world && world.coopNet;
  if (!n || n.role !== 'host' || !(slot >= 1)) return false;
  const v = leesBezorg(body);
  if (!v) return false;
  if (v.soort === 'pand') return bezorgPandHost(world, slot, v);
  const staat = world.coopBezit || (world.coopBezit = nieuweDeelStaat());
  const c = bezorgControle(staat, slot, v);
  if (!c.ok) { meld(world, slot, c.tekst); return false; }
  const l = lichaamVan(world, slot);
  if (!l) return false;
  if (l.inVehicle || l.inVeh) { meld(world, slot, 'Stap eerst uit je voertuig.'); return false; }
  const spec = haken.spec ? haken.spec(v.id) : null;
  if (!spec) { meld(world, slot, 'Dat voertuig ken ik niet.'); return false; }
  // een gast die een boot als auto stuurt (of andersom) krijgt niets: het model
  // van de host bepaalt de soort en dus de plek
  if (soortVan(spec) !== v.soort) { meld(world, slot, 'Dat voertuig ken ik niet.'); return false; }
  const plek = haken.plek ? haken.plek(world, l.x, l.y, spec.model, { outOfView: false, minDist: 3, maxDist: 45 }) : null;
  if (!plek) { meld(world, slot, PLEK_FAIL[v.soort] || 'Hier past hij niet. Ga op een open plek staan.'); return false; }
  const maak = haken.maak;
  const voertuig = maak ? maak(world, { spec, color: v.color || spec.color, upgrades: v.upgrades, health: v.health, dents: v.dents.length ? v.dents : null, flat: v.flat }, plek.x, plek.y, plek.angle || 0) : null;
  if (!voertuig) { meld(world, slot, 'De bezorger kan hier niet komen.'); return false; }
  voertuig.coopBezit = { slot, id: v.id, recht: v.recht };
  (staat.bezorgd[slot] || (staat.bezorgd[slot] = [])).push(v.id);
  const naam = spec.label || SOORT_TEKST[v.soort] || 'voertuig';
  const alleen = v.recht === 'ik';
  // een heli mag in de wereld van een ander niet vliegen (coopbestuur.js), dus
  // daar belooft de melding niet meer dan kijken
  const erbij = alleen ? ' Alleen jij hebt de sleutel.' : v.soort === 'heli' ? ' De anderen kunnen er alleen naar kijken.' : ' De anderen mogen er ook in.';
  meld(world, slot, `${v.soort === 'boot' ? `Je ${naam} ligt klaar.` : v.soort === 'heli' ? `Je ${naam} staat op zijn plek.` : `Je ${naam} staat klaar.`}${erbij}`);
  meldAnderen(world, slot, `${spelerNaam(world, slot)} heeft een eigen ${SOORT_TEKST[v.soort] || 'voertuig'} meegenomen: ${naam}.${alleen ? '' : v.soort === 'heli' ? ' Hij staat er voor de show.' : ' Je mag er ook in.'}`);
  return true;
}

const PLEK_FAIL = {
  boot: 'Hier is geen water. Ga aan de kant staan.',
  heli: 'Te weinig ruimte voor de rotor. Zoek een open plek.',
};

// De host zet het pand van een gast in de sessie: alleen de deur met een
// markering, op de plek die zijn eigen kaart goedkeurt. Er gaat niets van de
// save van de gast of van de host in: geen interieur, geen inrichting, geen
// sleutel en geen geld. De deur gaat weg als de eigenaar weggaat.
export function bezorgPandHost(world, slot, p) {
  const staat = world.coopBezit || (world.coopBezit = nieuweDeelStaat());
  const c = bezorgControle(staat, slot, p);
  if (!c.ok) { meld(world, slot, c.tekst); return false; }
  if (!lichaamVan(world, slot)) return false;
  const plek = haken.pand ? haken.pand(world, p) : null;
  if (!plek) { meld(world, slot, 'Daar kan je pand niet staan.'); return false; }
  const zet = haken.pandZet;
  const marker = zet ? zet(world, slot, { ...p, ...plek }) : null;
  if (!marker) { meld(world, slot, 'De deur past daar niet.'); return false; }
  (staat.panden[slot] || (staat.panden[slot] = [])).push(p.id);
  meld(world, slot, `Je pand staat in de sessie.${p.recht === 'ik' ? ' Alleen jij hebt de sleutel.' : ' De anderen mogen er ook in.'}`);
  meldAnderen(world, slot, `${spelerNaam(world, slot)} heeft een pand in deze sessie.`);
  return true;
}

// De eigenaar gaat weg (of de sessie stopt): zijn voertuig gaat mee terug. Wie er
// op dat moment in rijdt, stapt eerst uit (uitstappen: (slot) => ... van coopnet).
// Zijn panden gaan ook weg: alleen de deur en de markering van de host.
export function bezorgWeg(world, slot, uitstappen = null) {
  if (world.coopBezit && world.coopBezit.bezorgd) delete world.coopBezit.bezorgd[slot];
  if (world.coopBezit && world.coopBezit.panden) delete world.coopBezit.panden[slot];
  if (haken.pandWeg) haken.pandWeg(world, slot);
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
  const staat = world.coopBezit || {};
  const slots = new Set([
    ...Object.keys(staat.bezorgd || {}),
    ...Object.keys(staat.panden || {}),
  ].map(Number));
  for (const v of world.vehicles || []) if (v && v.coopBezit) slots.add(v.coopBezit.slot);
  let n = 0;
  for (const s of slots) n += bezorgWeg(world, s, uitstappen);
  return n;
}
