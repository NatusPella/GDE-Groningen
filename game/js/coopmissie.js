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
export function begin(st, { id, label = '', index = 0, stap = '', doelen: dl = [], deelnemers = [], lateInstap = true } = {}, nu = 0) {
  const gid = tekst(id, ID_MAX);
  if (!st || !gid) return null;
  let g = st.groepen[gid];
  if (!g) {
    if (st.volgorde.length >= MAX_GROEPEN) return null;
    g = st.groepen[gid] = { id: gid, label: '', index: 0, stap: '', doelen: [], deelnemers: [], lateInstap: true, sinds: nu };
    st.volgorde.push(gid);
  }
  g.label = tekst(label, LABEL_MAX);
  g.index = index | 0;
  g.stap = tekst(stap, STAP_MAX);
  g.doelen = doelen(dl);
  g.lateInstap = lateInstap !== false;
  g.deelnemers = slots(deelnemers);
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
  if (g) return { id: g.id, label: g.label, index: g.index, stap: g.stap, lateInstap: g.lateInstap, deelnemer: true };
  const alle = groepen(st);
  if (alle.length !== 1) return null;
  const e = alle[0];
  return { id: e.id, label: e.label, index: e.index, stap: e.stap, lateInstap: e.lateInstap, deelnemer: false };
}

// De doelen van de opdracht van deze speler; een toeschouwer ziet de doelen van de enige lopende opdracht.
export function doelenVoor(st, slot) {
  const g = groepVan(st, slot) || (groepen(st).length === 1 ? groepen(st)[0] : null);
  return g ? g.doelen : [];
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
