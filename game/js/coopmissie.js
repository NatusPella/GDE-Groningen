// Samen spelen (#452): de opdrachtstand per groep. Pure logica, geen DOM en geen netwerk, getest in scripts/coopmissie_test.mjs.
//
// Waarom een register en niet één world.mission voor de hele sessie: verschillende groepen spelers mogen tegelijk verschillende
// opdrachten spelen (visie, punt 1). Elke opdracht heeft daarom een eigen id met een eigen stap, eigen doelen en een eigen
// deelnemerslijst. De opdrachtketen van missions.js blijft per speler één lopende opdracht (world.mission); dit register bewaart
// de stand van elke groep ernaast, zodat een tweede groep de eerste niet overschrijft. Wie het spel opende simuleert de wereld en
// houdt het register bij; een gast leest alleen de groep waar hijzelf bij hoort (coopnet.js, bericht 'missie' met een id).
//
// De id is dezelfde sleutel als coopmeedoen.js gebruikt: '<index>|<label>'. Twee groepen die precies dezelfde opdracht op hetzelfde
// moment spelen, komen in deze opzet niet voor: de keten van missions.js loopt één keer. Komt dat later wel, dan krijgt de id een
// groepsnummer (hier alleen een controle dat een id uniek is).
//
// Een gast kan zelf een verhaalopdracht van zijn eigen groep starten (#452). Dat gaat als verzoek aan wie het spel opende: die
// controleert dezelfde poort (busy.js), begint de opdracht op het startpunt en legt de groep aan met de vrager als deelnemer. Een
// lopende groep houdt zijn stand: een verzoek voegt alleen een deelnemer toe en overschrijft stap, doelen of keuzes nooit.
import { playerBusy } from './busy.js';
import { standVan, antwoord as meedoenAntwoord } from './coopmeedoen.js';
export const MAX_GROEPEN = 8;  // meer gelijktijdige opdrachten dan dit kent het spel niet (zoals FOCI_MAX bij de foci)
const ID_MAX = 48, LABEL_MAX = 80, STAP_MAX = 90, MAX_DOELEN = 12;

const tekst = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
const slots = (lijst) => [...new Set((Array.isArray(lijst) ? lijst : []).filter((s) => Number.isInteger(s) && s >= 0 && s < 64))].sort((a, b) => a - b);
const doelen = (lijst) => (Array.isArray(lijst) ? lijst : []).filter((d) => d && Number.isFinite(d.x) && Number.isFinite(d.y))
  .slice(0, MAX_DOELEN).map((d) => ({ id: Number.isFinite(d.id) ? d.id | 0 : 0, soort: tekst(d.soort, 12) || 'doel', x: d.x, y: d.y, label: tekst(d.label, 60) }));

export function maakGroepen() { return { groepen: {}, volgorde: [] }; }

// De id van de opdracht die world.mission nu speelt, of null. Dezelfde sleutel als coopmeedoen.opdrachtSleutel.
export function opdrachtId(m) {
  if (!m || m.phase !== 'active') return null;
  return `${m.index | 0}|${tekst(m.label, LABEL_MAX)}`.slice(0, ID_MAX);
}

// Een groep begint (of wordt hervat: dezelfde id houdt zijn deelnemers en antwoorden). Geeft het record of null bij een ongeldige id.
export function begin(st, { id, label = '', index = 0, stap = '', doelen: dl = [], deelnemers = [], lateInstap = true, leider = null, activiteit = 'missie' } = {}, nu = 0) {
  const gid = tekst(id, ID_MAX);
  if (!st || !gid) return null;
  const ds = slots(deelnemers);
  if (!ds.length) return null; // een groep zonder deelnemer bestaat niet (#492)
  let g = st.groepen[gid];
  const lei = Number.isInteger(leider) && leider >= 0 ? leider : (ds[0] ?? 0);
  if (!g) {
    if (st.volgorde.length >= MAX_GROEPEN) return null;
    g = st.groepen[gid] = { id: gid, label: '', index: 0, stap: '', doelen: [], deelnemers: [], lateInstap: true, leider: lei, activiteit: 'missie', sinds: nu };
    st.volgorde.push(gid);
  }
  g.label = tekst(label, LABEL_MAX);
  g.index = index | 0;
  g.stap = tekst(stap, STAP_MAX);
  g.doelen = doelen(dl);
  g.lateInstap = lateInstap !== false;
  g.deelnemers = ds;
  g.leider = lei;
  g.activiteit = tekst(activiteit, 32) || 'missie';
  return g;
}

// De volgende stap van een lopende groep. Een onbekende id doet niets (een late of oude gast verzint geen groep).
export function zetStand(st, id, { index, stap, doelen: dl, lateInstap } = {}, nu = 0) {
  const g = groep(st, id);
  if (!g) return null;
  if (Number.isInteger(index)) g.index = index;
  if (typeof stap === 'string') g.stap = tekst(stap, STAP_MAX);
  if (Array.isArray(dl)) g.doelen = doelen(dl);
  if (lateInstap !== undefined) g.lateInstap = lateInstap !== false;
  g.sinds = nu;
  return g;
}

export function zetDeelnemers(st, id, lijst) {
  const g = groep(st, id);
  if (!g) return null;
  g.deelnemers = slots(lijst);
  return g;
}

// De opdracht is klaar of mislukt: de groep gaat weg; de andere groepen blijven staan.
export function beeindig(st, id) {
  const g = groep(st, id);
  if (!g) return false;
  delete st.groepen[g.id];
  st.volgorde = st.volgorde.filter((x) => x !== g.id);
  return true;
}

export function groep(st, id) { return st && typeof id === 'string' && st.groepen ? st.groepen[id] || null : null; }
export function groepen(st) { return st && st.volgorde ? st.volgorde.map((id) => st.groepen[id]).filter(Boolean) : []; }
export const deelnemers = (st, id) => (groep(st, id) || { deelnemers: [] }).deelnemers;
export const deelnemer = (st, id, slot) => deelnemers(st, id).includes(slot);
export const leiderVan = (st, id) => { const g = groep(st, id); return g ? g.leider : null; };
export const isLeider = (st, id, slot) => leiderVan(st, id) === slot;

// De groep waar deze speler bij hoort. Eén speler zit in deze opzet in hoogstens één groep; wijkt de id af van de lopende
// opdracht van de wereld, dan is dat een andere groep en blijft de stand van deze speler staan.
export function groepVan(st, slot) {
  for (const g of groepen(st)) if (g.deelnemers.includes(slot)) return g;
  return null;
}

// Wat deze speler van zijn eigen opdracht ziet (label, stap, doelen). Een toeschouwer zonder eigen groep volgt de enige
// lopende opdracht; zijn er meer, dan ziet hij niets (hij kijkt niet mee met een willekeurige groep).
export function zichtbaar(st, slot) {
  const g = groepVan(st, slot);
  if (g) return { id: g.id, label: g.label, index: g.index, stap: g.stap, lateInstap: g.lateInstap, deelnemer: true, leider: g.leider, activiteit: g.activiteit };
  const alle = groepen(st);
  if (alle.length !== 1) return null;
  const e = alle[0];
  return { id: e.id, label: e.label, index: e.index, stap: e.stap, lateInstap: e.lateInstap, deelnemer: false, leider: e.leider, activiteit: e.activiteit };
}

// De doelen van de opdracht van deze speler; een toeschouwer ziet de doelen van de enige lopende opdracht.
export function doelenVoor(st, slot) {
  const g = groepVan(st, slot) || (groepen(st).length === 1 ? groepen(st)[0] : null);
  return g ? g.doelen : [];
}

// De doelen voor de kaart en de minimap (#492): de eigen groep van deze speler eerst (vol), daarna de andere groepen (gedempt,
// KAART_ANDER_ALPHA). De eigen markering staat daardoor bovenop en wordt nooit door een andere groep overschreven. Dit register is
// er alleen op de gastheer: een gast krijgt van de host alleen de doelen van zijn eigen groep (coopnet.js hostSim.extra ->
// coopextra.js gastDoelen).
export const KAART_ANDER_ALPHA = 0.5;
export function kaartDoelen(world) {
  const st = world && world.coopGroepen;
  if (!st) return [];
  const eigen = groepVan(st, 0);
  const uit = [];
  if (eigen) for (const d of eigen.doelen) uit.push({ id: d.id, soort: d.soort, x: d.x, y: d.y, label: d.label, groep: eigen.label, leider: eigen.leider, eigen: true });
  for (const g of groepen(st)) {
    if (eigen && g.id === eigen.id) continue;
    for (const d of g.doelen) uit.push({ id: d.id, soort: d.soort, x: d.x, y: d.y, label: d.label, groep: g.label, leider: g.leider, eigen: false });
  }
  return uit;
}

// Spelers die weg zijn, houden geen groep open. verbonden = de plekken die nog in de sessie zitten (inclusief de gastheer).
export function ruimOp(st, verbonden) {
  const open = new Set(Array.isArray(verbonden) ? verbonden : []);
  let weg = 0;
  for (const g of groepen(st)) {
    if (g.deelnemers.length && g.deelnemers.some((s) => open.has(s))) continue;
    if (beeindig(st, g.id)) weg++;
  }
  return weg;
}

// De wereldmarker bij een gast (#434): het doel van de opdracht van zijn groep. Staat dat doel bij een garage of pomp (de
// spuitdienst van een opdracht: "Rij een garage in"), dan krijgt het het garageteken; anders het gewone doelteken. Puur:
// bijGarage is een vraagfunctie (x, y, m -> ja/nee), zodat de gast zijn eigen kaart gebruikt en een test een nepwereld.
// Het doel gaat voor het beginpunt van de volgende opdracht: die twee staan nooit samen (coopentities3d.js, net als de
// kaart en de minimap, hud_panel.js `gastStart`).
export const GARAGE_MARKER_M = 20;
export function doelMarker(doel, bijGarage = null, m = GARAGE_MARKER_M) {
  if (!doel || !Number.isFinite(doel.x) || !Number.isFinite(doel.y)) return null;
  const garage = !!(bijGarage && bijGarage(doel.x, doel.y, m));
  return { x: doel.x, y: doel.y, soort: garage ? 'garage' : 'goal' };
}

// ---- een gast start zelf een verhaalopdracht (#452)

export const GROEP_RADIUS = 40; // zo dicht bij het startpunt moet de vragende gast staan (m)

// Wat de vragende gast en de gastheer te lezen krijgen. Nederlands, kort, zonder merken of namen van echte personen.
export const MISSIE_TEKST = {
  bezig: 'Er loopt al een opdracht. Wacht of doe mee.',
  bijbaan: 'Er loopt al een bijbaan. Wacht of doe mee.',
  wedstrijd: 'Er loopt al een wedstrijd. Wacht of doe mee.',
  activiteit: 'Er loopt al een activiteit. Wacht of doe mee.',
  filmpje: 'Er loopt een filmpje. Probeer het zo nog eens.',
  politie: 'Er is politie achter jullie aan. Eerst die kwijt.',
  wacht: 'Het spel is even bezig. Probeer het zo nog eens.',
  onbekend: 'Deze opdracht kun je niet starten.',
  alleen: 'Deze opdracht doe je alleen in je eigen spel.',
  nietJouwBeurt: 'Deze opdracht is nog niet aan de beurt in jouw verhaal.',
  nietBijStart: 'Ga bij het startpunt staan en druk op E.',
  vraagt: (label) => `Je vraagt ${label} te starten.`,
  hostStart: (naam, label) => `${naam} start ${label}. Meedoen? J = ja, N = nee (zonder antwoord kijk je mee).`,
  gestart: (label) => `${label} is begonnen.`,
};

// Draait er al een wedstrijd of een uitnodiging daarvoor? (coopwedstrijd.js bewaart die stand op het net)
export function wedstrijdLoopt(world) {
  const W = world && world.coopNet && world.coopNet.wed;
  return !!(W && (W.r || W.sc || W.lv || W.u));
}

// Waarom deze wereld nu geen opdracht van een gast kan beginnen, of null. Dezelfde poort als elke andere start (busy.js): een
// gastheer die zelf in een opdracht, bijbaan, wedstrijd of filmpje zit, houdt de wereld bezet.
export function verzoekBlok(world) {
  if (!world) return MISSIE_TEKST.wacht;
  if (world.wanted > 0) return MISSIE_TEKST.politie;
  if (wedstrijdLoopt(world)) return MISSIE_TEKST.wedstrijd;
  if (playerBusy(world, ['cinematic']).busy) return MISSIE_TEKST.filmpje;
  if (playerBusy(world, ['mission', 'activeRace', 'missionPhase', 'race']).busy) return MISSIE_TEKST.bezig;
  if (playerBusy(world, ['sideJob']).busy) return MISSIE_TEKST.bijbaan;
  if (playerBusy(world, ['challenge', 'padel', 'activityGame', 'activity', 'heliRun', 'pigeon', 'train']).busy) return MISSIE_TEKST.activiteit;
  if (playerBusy(world, ['respawn']).busy) return MISSIE_TEKST.wacht;
  return null;
}

// Het verzoek van een gast: { k: 'missiegast', a: 'start', i, label }. Alleen een bestaande opdracht-index telt.
export const verzoekEvent = (index, label) => ({ k: 'missiegast', a: 'start', i: index | 0, label: tekst(label, LABEL_MAX) });
export function leesVerzoek(b) {
  if (!b || b.k !== 'missiegast' || b.a !== 'start') return null;
  const i = Number(b.i);
  if (!Number.isInteger(i) || i < 0 || i > 999) return null;
  if (typeof b.label !== 'string' || !b.label) return null;
  return { i, label: tekst(b.label, LABEL_MAX) };
}

// Mag deze gast deze opdracht nu vragen? eigen = de volgende opdracht van de gast zelf ({ index, label }), def = de opdracht in
// de wereld van de gastheer, lichaam = waar de gast staat. Geeft de Nederlandse reden of null.
export function startReden({ verzoek, def, eigen = null, lichaam = null, radius = GROEP_RADIUS } = {}) {
  if (!verzoek) return MISSIE_TEKST.onbekend;
  if (!def) return MISSIE_TEKST.onbekend;
  if (def.solo) return MISSIE_TEKST.alleen; // een opdracht die de wereld alleen voor één speler klaarzet
  if (tekst(def.label, LABEL_MAX) !== verzoek.label) return MISSIE_TEKST.onbekend; // een andere opdracht dan de gast noemde
  if (eigen && (eigen.index | 0) !== verzoek.i) return MISSIE_TEKST.nietJouwBeurt; // je start je eigen verhaal, niet dat van een ander
  const s = def.start;
  if (lichaam && s && Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(lichaam.x) && Number.isFinite(lichaam.y)) {
    if (Math.hypot(lichaam.x - s.x, lichaam.y - s.y) > radius) return MISSIE_TEKST.nietBijStart;
  }
  return null;
}

// Een speler erbij in een bestaande groep; de rest van de stand blijft staan.
export function voegDeelnemer(st, id, slot) {
  const g = groep(st, id);
  if (!g || !(slot >= 0)) return g;
  if (!g.deelnemers.includes(slot)) g.deelnemers = slots([...g.deelnemers, slot]);
  return g;
}

// De groep van een opdracht die een gast start: bestaat hij al, dan blijft die stand leidend en komt de vrager er alleen bij;
// anders begint de groep met de vrager als deelnemer. Geeft het record of null.
export function beginVerzoek(st, { index = 0, label = '', stap = '', doelen: dl = [], lateInstap = true } = {}, starter = 1, nu = 0) {
  const id = opdrachtId({ phase: 'active', index, label });
  if (!st || !id) return null;
  if (groep(st, id)) return voegDeelnemer(st, id, starter);
  return begin(st, { id, label, index, stap, doelen: dl, lateInstap, deelnemers: [starter], leider: starter }, nu);
}

// ---- de gastheer kiest ook mee (#452)
// De gastheer is ook een speler: start een gast een opdracht, dan krijgt de gastheer dezelfde vraag (J/N) als de andere gasten. Zegt
// hij nee, of antwoordt hij niet, dan kijkt hij toe: geen geld, geen loopbaanpunten en geen verhaalstap, en zijn eigen keten blijft
// waar hij was. Zijn keuze staat in dezelfde stand op plek 0; er gaat geen bericht over het net, want hij houdt de stand zelf bij.
export const GASTHEER_VRAAG_S = 20; // zolang staat de vraag open; daarna telt hij als nee

// De vraag aan de gastheer klaarzetten (coopglue.js doet dat bij het begin van de opdracht van een gast).
export function gastheerVraag(world, id, label, sec = GASTHEER_VRAAG_S) {
  if (!world) return false;
  world.coopGastVraag = { id: tekst(id, ID_MAX), label: tekst(label, LABEL_MAX), rest: Number.isFinite(sec) ? Math.max(1, Math.min(30, sec)) : GASTHEER_VRAAG_S };
  return true;
}

// Per frame op de gastheer (missions.js updateMissions): J of N, of de tijd loopt af en dat is nee.
export function gastheerVraagTik(world, dt) {
  const n = world && world.coopNet, v = world && world.coopGastVraag;
  if (!n || n.role !== 'host' || !n.meedoen || !v) return false;
  const inp = world.input;
  v.rest -= dt;
  const ja = !!(inp && inp.wasPressed && inp.wasPressed('j'));
  const nee = !!(inp && inp.wasPressed && inp.wasPressed('n'));
  if (!ja && !nee && v.rest > 0) return false;
  if (inp && inp.consume) { if (ja) inp.consume('j'); if (nee) inp.consume('n'); }
  const antwoord = ja && v.rest > 0;
  world.coopGastVraag = null;
  if (!meedoenAntwoord(n.meedoen, 0, antwoord, v.id || undefined)) return false; // de opdracht is al voorbij
  if (world.addMessage) {
    world.addMessage(antwoord
      ? `Je doet mee met ${v.label}.`
      : `Je doet niet mee met ${v.label}. Geld, loopbaanpunten en de verhaalstap van deze opdracht zijn niet voor jou.`, 5);
  }
  return true;
}

// Speelt de gastheer zelf mee aan deze opdracht? Zonder sessie, zonder vraag of zonder keuze: ja (het gewone pad, zoals voorheen).
export function gastheerMee(world, id = null) {
  const n = world && world.coopNet;
  if (!n || n.role !== 'host' || !n.meedoen) return true;
  const st = standVan(n.meedoen, id || undefined);
  if (!st || !Object.prototype.hasOwnProperty.call(st.keuze, 0)) return true;
  return st.keuze[0] === 'ja' || st.keuze[0] === 'verplicht';
}
