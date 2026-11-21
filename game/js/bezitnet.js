// Het netwerktransport van de Bezit-claims (epic #1095, #1104) over het bestaande JSON-gebeurtenissenkanaal van Samen spelen (coopnet.js handleEvent, body.k === 'bezit').
// Geen nieuw binair formaat: een oude client kent de sleutel 'bezit' niet en negeert het bericht (handleEvent geeft false), dus er breekt niets. De claim-regels zelf staan
// in bezitcoop.js (puur); dit bestand regelt alleen wie wat naar wie stuurt: een gast stuurt zijn claim naar de host, de host past hem toe (laagste (tijd, speler-id) wint)
// en geeft hem door aan de anderen; bij aansluiten stuurt de gast zijn ID-verzameling en krijgt hij de claims van de sessie terug; wie wegvalt verliest zijn claims.
// Bezit is per speler (#429): de claims zijn een zachte laag, er verandert niets in andermans opslag. Geen THREE, geen DOM (scripts/bezitnet_test.mjs).

import { attachCoop, setCoopEnsure } from './bezitlive.js';
import { encodeIds, decodeIds, ID_RE, SPOT_RE, PER_PLAYER_PARCELS } from './bezitcoop.js';

export const RATE_BURST = 40;                        // bezit-berichten die een gast achter elkaar mag sturen (review 22-11, B3) ...
export const RATE_PER_S = 8;                         // ... en daarna per seconde (token bucket per slot, aan de kant van de host)
export const SYNC_CHUNK = 150;                       // ID's per bericht: 150 x 8 tekens blijft ruim onder MAX_JSON (2048)
const slotId = (slot) => `s${slot}`;
const nameOf = (world, slot) => {
  const r = Array.isArray(world.coopRoster) ? world.coopRoster.find((s) => s && s.slot === slot) : null;
  return String((r && (r.naam || r.name)) || `Speler ${slot}`).slice(0, 24);
};
const colorOf = (world, slot) => { const r = Array.isArray(world.coopRoster) ? world.coopRoster.find((s) => s && s.slot === slot) : null; return (r && typeof r.kleur === 'string' && r.kleur) || null; };

// Aanmaken (één keer per sessie). transport: { role: 'host' | 'client', toHost(body), toGuest(slot, body), guests() -> [slots] }.
export function ensureBezitNet(world, transport) {
  if (world.bezitNet && world.bezitNet.transport === transport) return world.bezitNet;
  if (world.bezitNet) stopBezitNet(world);                     // een nieuwe sessie (hostwissel, opnieuw aansluiten) begint met een schone map
  const isHost = transport.role === 'host';
  const selfId = isHost ? slotId(0) : 'me';
  const selfName = (world.coopSelfName && String(world.coopSelfName).slice(0, 24)) || 'Medespeler';
  const send = (full) => {
    if (isHost) { for (const s of transport.guests()) transport.toGuest(s, { k: 'bezit', a: full.action, id: full.id, from: full.from, name: full.name, color: full.color, t: full.t }); }
    else transport.toHost({ k: 'bezit', a: full.action, id: full.id, t: full.t });
  };
  const net = attachCoop(world, selfId, selfName, null, send);
  const o = { transport, isHost, net, hello: false, helloVan: new Set(), rate: new Map(), lastT: 0, now: typeof transport.now === 'function' ? transport.now : () => Date.now() };
  world.bezitNet = o;
  // aansluiten: de gast meldt zijn bezit (de eigen percelen uit zijn save, zie bezitlive.attachCoop) aan de host; de host stuurt de claims van de sessie
  if (!isHost) {
    o.hello = true; transport.toHost({ k: 'bezit', a: 'hello', ids: net.snapshot() });
    for (const spot of net.claims.mineSpots().slice(0, 16)) transport.toHost({ k: 'bezit', a: 'claim', id: 'sp:' + spot });       // de eigen standplaatsen
  }
  return o;
}

// ---- meewerken in een snackwagen (Snackimperium, #1102): { k: 'bezit', a: 'snack-work', spot, hours, to } ----
// De eigenaar van de wagen is de speler van wie de standplaats-claim 'sp:<plek>' is (alle spelers zijn gelijk; de host is alleen de relay). Een gast stuurt het naar de host
// met 'to' = het slot van de eigenaar (0 = de host zelf); de host past het toe of geeft het door met 'from' = het slot van de meewerker. Het loon betaalt de meewerker zichzelf
// (snacklive.workAlong); de eigenaar krijgt de verkoopbonus via de ontvanger. Een oude client kent 'snack-work' niet en negeert het (handleBezit geeft true, doet niets).
let workHandler = () => {};
export const setSnackWorkHandler = (fn) => { workHandler = typeof fn === 'function' ? fn : () => {}; };
const slotOfId = (id) => { const m = /^s(\d{1,2})$/.exec(String(id)); return m ? Number(m[1]) : null; };
const cleanWork = (spot, hours) => (typeof spot === 'string' && SPOT_RE.test('sp:' + spot) && Number.isFinite(Number(hours)) ? { type: 'snack-work', spot, hours: Math.max(1, Math.min(14, Math.round(Number(hours)))) } : null);
// De zender (setSnackWorkSend): msg = { type: 'snack-work', spot, hours }. Geeft true als er iets verstuurd of toegepast is.
export function sendSnackWork(world, msg, transport = (world && world.bezitNet && world.bezitNet.transport) || sessionTransport(world)) {
  const m = msg && cleanWork(msg.spot, msg.hours);
  if (!m || !transport) return false;
  const o = ensureBezitNet(world, transport);
  const owner = o.net.claims.lookup('sp:' + m.spot);            // een claim van een ander; null = niet van een medespeler
  if (!owner) return false;
  const to = slotOfId(owner.playerId);
  if (to === null) return false;
  if (o.isHost) { if (to === 0) return false; transport.toGuest(to, { k: 'bezit', a: 'snack-work', spot: m.spot, hours: m.hours, from: 0 }); return true; }
  transport.toHost({ k: 'bezit', a: 'snack-work', spot: m.spot, hours: m.hours, to });
  return true;
}
function handleSnackWork(world, body, van, o, transport) {
  const m = cleanWork(body.spot, body.hours);
  if (!m) return;
  if (o.isHost) {
    const to = Number.isInteger(body.to) ? body.to : null;
    if (to === null || !(van >= 1)) return;
    const owner = o.net.claims.lookup('sp:' + m.spot), mine = o.net.claims.has('sp:' + m.spot) && !owner;
    if (to === 0) { if (mine) workHandler({ ...m, from: van }, world); return; }                   // de host is de eigenaar
    if (!owner || owner.playerId !== slotId(to) || !transport.guests().includes(to)) return;        // alleen naar de echte eigenaar
    transport.toGuest(to, { k: 'bezit', a: 'snack-work', spot: m.spot, hours: m.hours, from: van });
    return;
  }
  if (!o.net.claims.has('sp:' + m.spot) || o.net.claims.lookup('sp:' + m.spot)) return;           // niet onze plek: negeren
  workHandler({ ...m, from: Number.isInteger(body.from) ? body.from : 0 }, world);
}

const chunks = (ids) => { const out = []; for (let i = 0; i < ids.length; i += SYNC_CHUNK) out.push(ids.slice(i, i + SYNC_CHUNK)); return out; };

// Een 'bezit'-bericht uit handleEvent. van: het slot van de afzender (0 = de host zelf). Geeft true als het bericht van ons is (ook als het niets deed).
export function handleBezit(world, body, van, transport) {
  if (!body || body.k !== 'bezit' || typeof body.a !== 'string') return false;
  const o = ensureBezitNet(world, transport);
  const { net } = o;
  if (o.isHost) {
    if (!(van >= 1)) return true;                                          // de host luistert alleen naar gasten
    const from = slotId(van), name = nameOf(world, van), color = colorOf(world, van);
    if (!rateOk(o, van)) return true;                                      // te veel berichten van dezelfde gast: genegeerd
    if (body.a === 'hello') {
      if (o.helloVan.has(van)) return true;                                // een hello per verbinding: opnieuw sturen vult de laag niet
      o.helloVan.add(van);
      const t = stamp(o);                                                  // de host stempelt de tijd zelf: wat de gast zegt over t telt niet (review 22-11, B2)
      const ids = decodeIds(body.ids, PER_PLAYER_PARCELS);
      for (const c of chunks(ids)) net.claims.adopt(from, name, color, encodeIds(c), t);
      const taken = ids.filter((id) => net.claims.ownerOf(id) === from);   // alleen wat echt van hem geworden is gaat naar de anderen
      for (const s of transport.guests()) if (s !== van) for (const c of chunks(taken)) transport.toGuest(s, { k: 'bezit', a: 'sync', from, name, color, ids: encodeIds(c) });
      // de claims die al in de sessie staan naar de nieuwe gast
      const known = net.claims.list().map((c) => c.id), own = net.claims.snapshot();
      for (const c of chunks(decodeIds(own))) transport.toGuest(van, { k: 'bezit', a: 'sync', from: slotId(0), name: nameOf(world, 0), color: null, ids: encodeIds(c) });
      for (const [fromId, grp] of byOwner(net.claims, from)) for (const c of chunks(grp.ids)) transport.toGuest(van, { k: 'bezit', a: 'sync', from: fromId, name: grp.name, color: grp.color, ids: encodeIds(c) });
      for (const c of net.claims.listAll()) if (SPOT_RE.test(c.id) && c.from !== from) transport.toGuest(van, { k: 'bezit', a: 'claim', id: c.id, from: c.from, name: c.name, color: c.color, t: c.t });   // de standplaatsen van de anderen
      void known;
      return true;
    }
    if (body.a === 'snack-work') { handleSnackWork(world, body, van, o, transport); return true; }
    if (body.a !== 'claim' && body.a !== 'release') return true;
    if (typeof body.id !== 'string' || !ID_RE.test(body.id)) return true;
    const msg = { id: body.id, action: body.a, from, name, color, t: stamp(o) };
    const r = net.receive(world, msg);
    if (r && (r.ignored === 'quotum' || r.ignored === 'vol')) return true;  // niet aangenomen: ook niet doorgeven
    for (const s of transport.guests()) if (s !== van) transport.toGuest(s, { k: 'bezit', a: msg.action, id: msg.id, from, name, color, t: msg.t });
    // de gast verloor: hij hoort het van de host, zodat hij zijn geld terugkrijgt
    if (r && r.ignored === 'verloren') { const w = net.claims.lookup(msg.id); if (w) transport.toGuest(van, { k: 'bezit', a: 'claim', id: msg.id, from: w.playerId, name: w.name, color: w.color, t: 0 }); }
    return true;
  }
  // client: een bericht van de host
  if (body.a === 'sync') { if (typeof body.from === 'string') net.claims.adopt(body.from, String(body.name || 'Medespeler'), body.color || null, body.ids, 0); return true; }
  if (body.a === 'drop') { if (typeof body.from === 'string') net.claims.drop(body.from); return true; }
  if (body.a === 'snack-work') { handleSnackWork(world, body, 0, o, transport); return true; }
  if (body.a !== 'claim' && body.a !== 'release') return true;
  if (typeof body.id !== 'string' || !ID_RE.test(body.id) || typeof body.from !== 'string') return true;
  net.receive(world, { id: body.id, action: body.a, from: body.from, name: body.name, color: body.color, t: Number.isFinite(body.t) ? body.t : 0 });
  return true;
}
// De host stempelt de tijd van een claim zelf (eigen klok, nooit terug): wie het eerst bij de host aankomt wint.
function stamp(o) { const t = Math.max(o.now(), o.lastT + 0.001); o.lastT = t; return t; }
// Snelheidsgrens per gast (token bucket): RATE_BURST berichten, daarna RATE_PER_S per seconde.
function rateOk(o, slot) {
  const nu = o.now(); let b = o.rate.get(slot);
  if (!b) o.rate.set(slot, (b = { tokens: RATE_BURST, last: nu }));
  b.tokens = Math.min(RATE_BURST, b.tokens + Math.max(0, nu - b.last) / 1000 * RATE_PER_S); b.last = nu;
  if (b.tokens < 1) return false;
  b.tokens -= 1; return true;
}
function* byOwner(claims, exceptFrom) {
  const per = new Map();
  for (const c of claims.listAll()) { if (c.from === exceptFrom || c.from === slotId(0)) continue; let g = per.get(c.from); if (!g) per.set(c.from, (g = { ids: [], name: c.name, color: c.color })); g.ids.push(c.id); }
  yield* per.entries();
}

// Een gast die weggaat: zijn claims verdwijnen bij de host en bij de anderen.
export function dropSlot(world, slot, transport) {
  const o = world.bezitNet;
  if (!o || !o.isHost) return 0;
  const from = slotId(slot);
  const n = o.net.claims.drop(from);
  o.helloVan.delete(slot); o.rate.delete(slot);                            // een nieuwe gast op deze plek mag weer een hello sturen
  for (const s of transport.guests()) if (s !== slot) transport.toGuest(s, { k: 'bezit', a: 'drop', from });
  return n;
}

// Opruimen bij het einde van de sessie.
export function stopBezitNet(world) { if (world.bezitNet) { world.bezitNet.net.stop(); world.bezitNet = null; } }

// De transport van de huidige sessie uit world.coopNet (coopnet.js): de host spreekt de gasten via de hub aan, een gast praat met de host via zijn sessie. null zonder sessie.
export function transportOf(world) {
  const n = world && world.coopNet;
  if (!n) return null;
  if (n.role === 'host' && n.hub) {
    return { role: 'host', toGuest: (slot, body) => { try { n.hub.announce(body, slot); } catch (e) { /* gast weg */ } },
      guests: () => n.hub.roster.spelers.filter((s) => s.slot !== 0 && s.verbinding !== 'lost').map((s) => s.slot) };
  }
  if (n.role === 'client' && n.session) return { role: 'client', toHost: (body) => { try { n.session.sendEvent(body); } catch (e) { /* geen verbinding */ } }, guests: () => [] };
  return null;
}
// Een transport per sessie: dezelfde sessie geeft hetzelfde object terug zodat ensureBezitNet niet steeds opnieuw begint.
const cache = new WeakMap();
export function sessionTransport(world) {
  const n = world && world.coopNet;
  if (!n) return null;
  let t = cache.get(n);
  if (!t) { t = transportOf(world); if (t) cache.set(n, t); }
  return t;
}
// Voor coopnet.js: een bericht en een vertrek.
export function bezitEvent(world, body, van) { const t = sessionTransport(world); return t ? handleBezit(world, body, van, t) : false; }
// Bij het begin van de sessie (host: na startHost, gast: zodra hij binnen is): de claimlaag aanmaken met de eigen percelen en bij een gast het hello sturen, niet pas bij de eerste koop.
export function openBezitNet(world) { const t = sessionTransport(world); if (t) ensureBezitNet(world, t); }
export function bezitLeave(world, slot) { const t = sessionTransport(world); return t ? dropSlot(world, slot, t) : 0; }
// Bezit meldt een koop of verkoop hier aan: zorgt dat het transport er is voordat de claim verstuurd wordt.
setCoopEnsure((w) => { const t = sessionTransport(w); if (t) ensureBezitNet(w, t); });
