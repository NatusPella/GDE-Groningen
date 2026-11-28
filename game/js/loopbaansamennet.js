// Het transport van Samen in een club of op een erf (#1380): regels staan in loopbaansamen.js (puur). Berichten gaan over het bestaande JSON-gebeurtenissenkanaal van Samen spelen
// (coopnet.js handleEvent, body.k === 'crew'). Geen nieuw binair formaat en geen bestaand bericht gewijzigd: een oude client kent 'crew' niet en negeert het (handleEvent geeft false).
// De eigenaar van de club of het erf is een speler, niet per se wie het spel opende; de host geeft alleen door en zet de ECHTE afzender in `from` (wat een gast over zichzelf zegt telt niet).
// Berichten (a): nodig (eigenaar naar lid), antwoord (lid naar eigenaar, ja of nee), welkom (eigenaar naar lid), uitkering (eigenaar naar lid, een teambonus), stop (het gezelschap eindigt).
// Elke speler boekt zijn eigen kant: een lid krijgt de teambonus in zijn eigen portemonnee (world.money, en world.coopVerdiend voor de save van een gast), één keer per gebeurtenis-id (coopBoek, #448).
// Geen IP-adressen en geen namen anders dan de naam die een speler zelf koos (de lijst van de sessie). Geen THREE, geen DOM (scripts/loopbaansamen_test.mjs).
import { sessionTransport } from './bezitnet.js';
import { maakBoekhouding } from './coopbeloning.js';
import * as S from './loopbaansamen.js';

export const RATE_BURST = 20;
export const RATE_PER_S = 2;
const klok = (w) => (w && Number.isFinite(w.time) ? w.time : 0);
const naamVan = (w, slot) => { const r = Array.isArray(w.coopRoster) ? w.coopRoster.find((x) => x && x.slot === slot) : null; return String((r && (r.naam || r.name)) || `Speler ${slot}`).slice(0, 24); };
const eigenSlot = (w) => (w.coopNet && w.coopNet.role === 'client' && w.coopNet.session ? w.coopNet.session.slot : 0);
const isHost = (w) => !!(w.coopNet && w.coopNet.role === 'host');
const koppel = (w) => w.coopNet && (w.coopNet.hub ? 'host' : w.coopNet.session ? 'client' : null);

// Naar één plek sturen. De eigenaar stuurt als host rechtstreeks, als gast via de host (veld `to`).
function stuur(w, to, body) {
  const t = sessionTransport(w);
  if (!t || !Number.isInteger(to)) return false;
  if (t.role === 'host') { if (to === 0) return false; t.toGuest(to, { k: 'crew', ...body, from: 0 }); return true; }
  t.toHost({ k: 'crew', ...body, to });
  return true;
}

// ---- de eigenaar ----
// Nodig medespelers uit voor een nieuwe club of een nieuw erf. slots: de plekken die een vraag krijgen (zonder: alle medespelers in de sessie). Geeft het gezelschap of null.
export function crewUitnodigen(w, soort, naam, slots = null) {
  if (!koppel(w) || !S.SOORTEN[soort]) return null;
  const eigen = eigenSlot(w);
  const c = w.crew && !S.isOpgeheven(w.crew) && w.crew.soort === soort ? w.crew : S.maakCrew({ id: `c${eigen}${(w.crewTeller = (w.crewTeller || 0) + 1)}`, soort, eigenaar: eigen, naam });
  if (!c) return null;
  w.crew = c;
  const t = sessionTransport(w);
  const kandidaten = Array.isArray(slots) ? slots : (t && t.role === 'host' ? t.guests() : (w.coopRoster || []).map((r) => r && r.slot).filter((s) => Number.isInteger(s)));
  const gevraagd = S.nodigUit(c, kandidaten.filter((s) => s !== eigen), klok(w));
  for (const s of gevraagd) stuur(w, s, { a: 'nodig', crew: c.id, soort: c.soort, naam: c.naam });
  return c;
}
// Een gebeurtenis van de club of het erf levert iets op (een wedstrijddag, een oogstdag): boek de teambonus en stuur elk lid zijn deel. Geeft de boeking of null.
export function crewBoek(w, gebeurtenisId, bedrag) {
  const c = w.crew;
  if (!c || c.eigenaar !== eigenSlot(w)) return null;
  const b = S.boek(c, gebeurtenisId, bedrag);
  if (!b) return null;
  for (const [slot, euro] of Object.entries(b.uitkering)) {
    const s = Number(slot);
    if (!(euro > 0)) continue;
    if (s === c.eigenaar) boekUitkering(w, b.id, euro, c.soort);
    else stuur(w, s, { a: 'uitkering', crew: c.id, ev: b.id, geld: euro });
  }
  return b;
}
export const crewBeginRonde = (w, id) => !!(w.crew && S.beginRonde(w.crew, id));
export const crewEindeRonde = (w) => { if (w.crew) S.eindeRonde(w.crew); };
export const crewInzet = (w, slot, hoeveel) => !!(w.crew && S.zetInzet(w.crew, slot, hoeveel));
// De eigenaar beëindigt het gezelschap (of valt weg): alle leden horen het.
export function crewStop(w) {
  const c = w.crew;
  if (!c) return;
  for (const s of Object.keys(c.leden).map(Number)) if (s !== c.eigenaar && c.leden[s].status !== 'nee' && c.leden[s].status !== 'weg') stuur(w, s, { a: 'stop', crew: c.id });
  w.crew = null;
}

// ---- een lid ----
export function crewAntwoord(w, ja) {
  const u = w.crewUitnodiging;
  if (!u) return false;
  w.crewUitnodiging = null;
  stuur(w, u.eigenaar, { a: 'antwoord', crew: u.crew, ja: ja === true });
  if (ja === true) w.crewLid = { crew: u.crew, eigenaar: u.eigenaar, soort: u.soort, naam: u.naam, status: 'wacht' };
  return true;
}
// Een lid gaat zelf weg uit het gezelschap.
export function crewVerlaat(w) {
  const l = w.crewLid;
  if (!l) return false;
  w.crewLid = null;
  stuur(w, l.eigenaar, { a: 'weg', crew: l.crew });
  return true;
}
// Geld van een teambonus in de eigen portemonnee, één keer per id (#448). Geeft het bedrag dat echt geboekt is.
function boekUitkering(w, id, geld, soort) {
  const boek = w.coopBoek || (w.coopBoek = maakBoekhouding());
  if (!boek.claim(`crew:${id}`.slice(0, 48))) return 0;
  w.money = (w.money || 0) + geld;
  if (w.coopNet && w.coopNet.role === 'client') w.coopVerdiend = (w.coopVerdiend || 0) + geld; // de eigen save van een gast (savegame.js)
  if (w.addMessage) w.addMessage(S.uitkeringTekst(geld, soort), 4);
  return geld;
}

// Elk frame (coopnet.js tickCoopNet): een onbeantwoorde vraag verloopt als nee, J of N antwoordt, en de eigenaar laat verlopen vragen los.
export function crewTik(w, dt = 0) {
  const nu = klok(w);
  if (w.crew) S.tik(w.crew, nu);
  const u = w.crewUitnodiging;
  if (!u) return;
  if (nu - u.sinds >= S.UITNODIGING_S) { w.crewUitnodiging = null; return; }   // geen antwoord is nee: de eigenaar laat de vraag zelf ook verlopen
  const inp = w.input;
  if (w.paused || w.uiPaused || w.coopUitnodiging || !inp || typeof inp.wasPressed !== 'function') return;
  if (inp.wasPressed('j')) crewAntwoord(w, true); else if (inp.wasPressed('n')) crewAntwoord(w, false);
}

// ---- berichten ----
const emmer = new WeakMap();
function rateOk(w, slot, nu) {
  let m = emmer.get(w); if (!m) emmer.set(w, (m = new Map()));
  let b = m.get(slot); if (!b) m.set(slot, (b = { tokens: RATE_BURST, last: nu }));
  b.tokens = Math.min(RATE_BURST, b.tokens + Math.max(0, nu - b.last) * RATE_PER_S); b.last = nu;
  if (b.tokens < 1) return false;
  b.tokens -= 1; return true;
}
// Een 'crew'-bericht uit handleEvent. van: de plek van de afzender (0 = de host zelf). true als het bericht van ons is.
export function crewEvent(w, body, van) {
  if (!body || body.k !== 'crew' || typeof body.a !== 'string' || typeof body.crew !== 'string') return false;
  const t = sessionTransport(w);
  if (!t) return false;
  if (t.role === 'host') {
    if (!(van >= 1)) return true;
    if (!rateOk(w, van, klok(w) || Date.now() / 1000)) return true;
    const to = Number.isInteger(body.to) ? body.to : null;
    if (to === null) return true;
    const kopie = { ...body }; delete kopie.to;
    if (to !== 0) { if (t.guests().includes(to) && to !== van) t.toGuest(to, { ...kopie, from: van }); return true; }   // doorgeven met de echte afzender
    return verwerk(w, { ...kopie, from: van });
  }
  if (!Number.isInteger(body.from)) return true;
  return verwerk(w, body);
}
function verwerk(w, b) {
  const nu = klok(w), from = b.from;
  switch (b.a) {
    case 'nodig': { // een medespeler vraagt: meedoen in zijn club of op zijn erf?
      if (!S.SOORTEN[b.soort] || w.crewUitnodiging || w.crewLid) return true;      // één vraag tegelijk; wie al meedoet krijgt geen tweede
      w.crewUitnodiging = { crew: b.crew, eigenaar: from, soort: b.soort, naam: String(b.naam || '').slice(0, 40), sinds: nu };
      if (w.addMessage) w.addMessage(S.vraagTekst(b.soort, naamVan(w, from), w.crewUitnodiging.naam), S.UITNODIGING_S);
      return true;
    }
    case 'antwoord': { // alleen de eigenaar van dit gezelschap luistert
      const c = w.crew;
      if (!c || c.id !== b.crew) return true;
      const st = S.antwoord(c, from, b.ja === true);
      if (st === 'mee' || st === 'later') stuur(w, from, { a: 'welkom', crew: c.id, status: st });
      return true;
    }
    case 'welkom': {
      const l = w.crewLid;
      if (!l || l.crew !== b.crew || l.eigenaar !== from) return true;
      l.status = b.status === 'later' ? 'later' : 'mee';
      if (w.addMessage) w.addMessage(l.status === 'later' ? 'Je doet mee vanaf de volgende ronde.' : 'Je doet mee.', 3.5);
      return true;
    }
    case 'uitkering': {
      const u = S.leesUitkering(w.crewLid, b, from);
      if (u) boekUitkering(w, u.ev, u.geld, w.crewLid.soort);
      return true;
    }
    case 'stop': { const l = w.crewLid; if (l && l.crew === b.crew && l.eigenaar === from) { w.crewLid = null; if (w.addMessage) w.addMessage('Het samenwerken is afgelopen.', 3.5); } return true; }
    case 'weg': { if (w.crew && w.crew.id === b.crew) S.verlaat(w.crew, from); return true; }
    case 'weggevallen': { // de host meldt: deze plek is weg (alleen van de host, from 0)
      if (from !== 0 || !Number.isInteger(b.slot)) return true;
      if (w.crew) { if (S.verlaat(w.crew, b.slot)) w.crew = null; }
      if (w.crewLid && w.crewLid.eigenaar === b.slot) { w.crewLid = null; if (w.addMessage) w.addMessage('Het samenwerken is afgelopen.', 3.5); }
      if (w.crewUitnodiging && w.crewUitnodiging.eigenaar === b.slot) w.crewUitnodiging = null;
      return true;
    }
    default: return true;
  }
}

// De host hoort dat een speler weggaat (coopnet.js onLeave): de eigenaar die wegvalt beëindigt het gezelschap, een lid dat wegvalt telt niet meer mee. De host is soms zelf de eigenaar;
// is de eigenaar een gast, dan hoort die het via 'weg'.
export function crewLeave(w, slot) {
  if (w.crew) { if (S.verlaat(w.crew, slot)) w.crew = null; }
  if (w.crewLid && w.crewLid.eigenaar === slot) { w.crewLid = null; w.crewUitnodiging = null; }
  if (w.crewUitnodiging && w.crewUitnodiging.eigenaar === slot) w.crewUitnodiging = null;
  const t = sessionTransport(w);
  if (t && t.role === 'host') {
    // de eigenaar is een gast: laat hem en de anderen weten dat dit lid weg is of dat de eigenaar zelf weg is (de host kent alleen de leden die hij ziet)
    for (const s of t.guests()) if (s !== slot) t.toGuest(s, { k: 'crew', a: 'weggevallen', crew: '-', slot, from: 0 });
  }
  return true;
}
// Bij het einde van de sessie.
export function crewReset(w) { w.crew = null; w.crewLid = null; w.crewUitnodiging = null; }
