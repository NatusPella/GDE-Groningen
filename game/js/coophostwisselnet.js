// Samen spelen (#439): het spel overdragen, de koppeling met de wereld en het netwerk. coophostwissel.js is de pure basis (momentopname en
// toestandsmachines); dit bestand vult de momentopname uit de wereld van wie het spel opende, past hem toe bij de nieuwe speler, stuurt de
// berichten over de bestaande sessies (hub en ClientSession, JSON-gebeurtenissen 'hw-*') en laat iedereen opnieuw verbinden.
// Geen DOM en geen echt netwerk: de route (kamer openen, bij een kamer aansluiten) komt als `deps` binnen (coophostwisselui.js voor het
// echte spel met rtcroom, de tests met een geheugentransport). coopnet.js roept alleen wisselEvent en wisselTik aan.
//
// Verloop: oude host bied() -> bod -> J/N -> stukken -> de ander laadt (hw-geladen) -> opent een kamer -> hw-draait(kamer) -> de oude host
// geeft hw-verbind(kamer) aan de rest, verlaat zijn hub en sluit zelf aan; de nieuwe host verlaat de sessie van de oude, start zijn hub
// met de momentopname en de anderen komen binnen. Tot hw-draait blijft de oude host host: elke fout, time-out of weigering ervoor
// laat zijn sessie ongemoeid (de toestandsmachine garandeert dat; hier wordt alleen opgeruimd).
import * as N from './coopnet.js';
import { OudeHost, NieuweHost, HW, TIJD, maakMomentopname, leesVerbind, bodTekst, pauzeTekst, mislukTekst, vraagWachtTekst, jijTekst, gemistTekst, verbindMisluktTekst } from './coophostwissel.js';
import { weerEvent, leesWeerEvent, pasWeerToe } from './coopweer.js';
import { figures } from './coopclient.js';
import { sceneLeeg } from './coopworld.js';
import { charInfo } from './coopplayers.js';

export const PAUZE_MAX = 80;      // s: de pauze voor een overdracht gaat hoe dan ook weer weg
export const VERBIND_POGINGEN = 12;
const FLUSH_MAX = 3;               // s wachten tot de laatste berichten zijn aangekomen voor iemand van sessie wisselt
const RUIMTE = 28;                 // Reliable houdt er hoogstens 32 vast

const st = (world) => world.coopWissel || (world.coopWissel = { nu: 0, deps: null, oud: null, nieuw: null, hold: false, pauze: null, overname: null, verbindt: false, idT: 0 });
const ui = (world) => world.coopWisselUi || (world.coopWisselUi = { vraag: null, pauze: null, einde: null });
const meld = (world, tekst, sec = 5) => { if (world.addMessage) world.addMessage(tekst, sec); };
const posOf = (b) => (b && b.inVehicle && Number.isFinite(b.inVehicle.x) && Number.isFinite(b.inVehicle.y) ? b.inVehicle : b);

// De route en de wereldhaken. Verplicht: info(), verbind(kamer) -> Promise<transport>, opKamer({ aanvaard(transport) }) -> Promise<{ kamer, stop() }>.
// Optioneel: hostOpts(), clientOpts(wens), bereikbaar() -> Promise<bool>, wacht(ms), rand(), gastGeld(slot), leesOpdracht(world), zetOpdracht(world, o),
// leesKapot(world), zetKapot(world, ids), leesVoertuigen(world), zetVoertuigen(world, lijst), zetPlek(world, x, y, z), pogingen.
export function zetWisselDeps(world, deps) { st(world).deps = deps; return world.coopWissel; }
const wacht = (d, ms) => (d.wacht ? d.wacht(ms) : new Promise((r) => setTimeout(r, ms)));

// ---- de momentopname uit de wereld van de oude host -----------------------------------------------------------------------
export function verzamelMomentopname(world, d = {}) {
  const n = world.coopNet, hub = n.hub, p = world.player, c = world.companion;
  const lichaam = (slot) => (slot === 0 ? p : slot === 1 ? c : figures(world)[slot]) || null;
  const spelers = hub.roster.spelers.map((r) => {
    const b = lichaam(r.slot), q = posOf(b) || {}, ci = charInfo(r.char) || {};
    return { slot: r.slot, naam: ci.naam || '', char: r.char, geld: r.slot === 0 ? world.money : (d.gastGeld ? d.gastGeld(r.slot) : 0), health: b && Number.isFinite(b.health) ? b.health : 100, x: q.x, y: q.y, z: (b && b.z) || 0, voertuig: b && (b.inVehicle || b.inVeh) ? String((b.inVehicle || b.inVeh).id ?? 'v') : null };
  });
  const m = world.mission, o = d.leesOpdracht ? d.leesOpdracht(world) : (m && m.phase === 'active' ? { id: m.label || m.type || 'opdracht', stap: m.index, staat: m.phase, t: m.t } : null);
  let voertuigen;
  if (d.leesVoertuigen) voertuigen = d.leesVoertuigen(world);
  else { // de voertuigen waar spelers in zitten
    const vs = new Set(); for (const b of [p, c, ...Object.values(figures(world))]) { const v = b && (b.inVehicle || b.inVeh); if (v && typeof v === 'object') vs.add(v); }
    voertuigen = [...vs].map((v) => ({ id: String(v.id ?? 'v'), soort: (v.model && v.model.name) || (v.isBike ? 'fiets' : 'auto'), x: v.x, y: v.y, z: v.z || 0, hoek: v.angle || 0, schade: v.damage || 0 }));
  }
  return maakMomentopname({
    ver: n.info, zaad: hub.cfg.seed,
    tijd: { dag: world.calendar && world.calendar.day, uur: world.clock, tempo: 1 },
    weerstaat: (() => { const e = weerEvent(world.weatherState); if (!e) return null; const { k, ...rest } = e; return rest; })(),
    wanted: { niveau: world.wanted | 0, hitte: (world.police && world.police.heat) || 0 },
    opdracht: o, spelers, kapot: d.leesKapot ? d.leesKapot(world) : [], voertuigen,
  });
}

// ---- de momentopname toepassen bij de nieuwe host (de eigen voortgang en het eigen geld blijven van de speler zelf) ------------
export function pasMomentopnameToe(world, m, d = {}) {
  const uit = { klok: false, weer: false, opdracht: false };
  world.clock = m.tijd.uur; uit.klok = true;
  if (world.calendar && Number.isFinite(m.tijd.dag) && m.tijd.dag > 0) world.calendar.day = m.tijd.dag;
  const w = m.weerstaat ? leesWeerEvent({ k: 'weer', ...m.weerstaat }) : null;
  if (w) { world.weatherState = pasWeerToe(world.weatherState, w); uit.weer = true; }
  world.wanted = m.wanted.niveau;
  if (world.police && m.wanted.hitte) world.police.heat = m.wanted.hitte;
  const erf = world.coopOverdracht = { opdracht: m.opdracht, kapot: m.kapot, voertuigen: m.voertuigen, spelers: m.spelers, zaad: m.zaad };
  if (m.opdracht) {
    if (d.zetOpdracht) { d.zetOpdracht(world, m.opdracht); uit.opdracht = true; }
    else meld(world, `De opdracht ${m.opdracht.id} liep nog bij de vorige speler. Start hem zelf opnieuw als je hem wilt doen.`, 6);
  }
  if (d.zetKapot && m.kapot.length) d.zetKapot(world, m.kapot);
  if (d.zetVoertuigen && m.voertuigen.length) d.zetVoertuigen(world, m.voertuigen);
  const eerste = m.spelers.find((s) => s.slot === 0); // wie het spel opende stond hier: de nieuwe host komt daar, de anderen volgen via de band
  if (eerste && Number.isFinite(eerste.x) && Number.isFinite(eerste.y) && world.player) { if (d.zetPlek) d.zetPlek(world, eerste.x, eerste.y, eerste.z); else { world.player.x = eerste.x; world.player.y = eerste.y; } }
  erf.klaar = true;
  return uit;
}

// ---- verzenden ------------------------------------------------------------------------------------------------------
const rest = (n, behalve) => n.hub.roster.spelers.filter((s) => s.slot !== 0 && s.slot !== behalve && s.verbinding !== 'lost').map((s) => s.slot);
function naarHost(world, uit) { const n = world.coopNet; if (n && n.role === 'client') for (const b of uit) n.session.sendEvent(b); }
function vanHost(world, uit, doel) {
  const n = world.coopNet; if (!n || n.role !== 'host') return;
  for (const { naar, ...b } of uit) {
    if (naar === 'rest') for (const s of rest(n, doel)) n.hub.announce(b, s);
    else n.hub.announce(b, doel);
  }
}
function zetHold(world, aan) {
  const w = st(world);
  if (aan) { w.hold = true; world.coopHold = true; } else if (w.hold) { w.hold = false; world.coopHold = false; }
}
function zetPauze(world, tekst, id, tot) { const w = st(world); w.pauze = { id, tot }; ui(world).pauze = { tekst }; zetHold(world, true); }
function eindPauze(world) { const w = st(world); w.pauze = null; ui(world).pauze = null; zetHold(world, false); }
const naamVan = (world, slot) => { const p = (world.coopRoster || []).find((x) => x && x.slot === slot); return (p && (p.naam || (charInfo(p.char) || {}).naam)) || 'De ander'; };

// ---- wie het spel opende ----------------------------------------------------------------------------------------------
// Kan het nu? { ok } of { ok: false, tekst } (een Nederlandse reden voor de speler).
export function kanOverdragen(world, slot) {
  const n = world.coopNet, w = st(world), d = w.deps;
  if (!n || n.role !== 'host' || !n.hub) return { ok: false, tekst: 'Alleen wie het spel opende kan het overdragen.' };
  if (!d || !d.verbind || !d.opKamer || n.route === 'direct') return { ok: false, tekst: 'Overdragen werkt alleen als jullie met een kamercode spelen.' };
  if ((w.oud && w.oud.bezig) || (w.nieuw && w.nieuw.bezig) || w.overname || w.verbindt || w.oudKlaar) return { ok: false, tekst: 'Er loopt al een overdracht.' };
  const sp = n.hub.roster.spelers.find((s) => s.slot === slot);
  if (!Number.isInteger(slot) || slot < 1 || !sp || sp.verbinding !== 'ok') return { ok: false, tekst: 'Die speler is nu niet goed bereikbaar. Jij houdt het spel.' };
  const k = N.canJoin(world); if (!k.ok) return { ok: false, tekst: k.reason }; // je sluit straks zelf als gast aan
  if (n.sceneNu && !sceneLeeg(n.sceneNu)) return { ok: false, tekst: 'Wacht tot het filmpje voorbij is.' };
  return { ok: true };
}

const nieuwId = (d) => 1 + Math.floor((d && d.rand ? d.rand() : Math.random()) * 0xfffffe);

// De knop 'Spel overdragen' bij een speler. { ok } of { ok: false, tekst }.
export function biedOver(world, slot) {
  const k = kanOverdragen(world, slot); if (!k.ok) { meld(world, k.tekst, 5); return k; }
  const w = st(world), n = world.coopNet, d = w.deps;
  const m = verzamelMomentopname(world, d);
  const oud = new OudeHost({ ver: n.info, naam: naamVan(world, 0) });
  const r = oud.bied(slot, m, nieuwId(d), w.nu);
  if (r.fout) { const tekst = mislukTekst(r.fout); meld(world, tekst, 5); return { ok: false, tekst }; }
  w.oud = oud; w.oudKlaar = false; w.oudEinde = false; w.pauzeVerstuurd = false; w.doel = slot;
  vanHost(world, r.uit, slot);
  zetHold(world, true); ui(world).einde = null; ui(world).pauze = { tekst: vraagWachtTekst(naamVan(world, slot)) }; // wie het spel opende staat stil tot het antwoord er is
  return { ok: true };
}
// Stoppen (Esc op het wachtscherm, of de knop): de oude host blijft host.
export function annuleerOverdracht(world) {
  const w = st(world);
  if (w.oud && w.oud.bezig) { const r = w.oud.annuleer(w.nu); vanHost(world, r.uit, w.doel); naOud(world); return true; }
  if (w.nieuw && w.nieuw.bezig) { const r = w.nieuw.mislukt('geannuleerd', w.nu); naarHost(world, r.uit); naNieuw(world); return true; }
  return false;
}
// De speler die de vraag kreeg: J of N.
export function antwoordVraag(world, ja) {
  const w = st(world); if (!w.nieuw || w.nieuw.fase !== 'gevraagd') return false;
  const r = w.nieuw.antwoord(!!ja, w.nu); naarHost(world, r.uit);
  ui(world).vraag = null;
  if (ja) { zetPauze(world, pauzeTekst(w.nieuw.naam), w.nieuw.id, w.nu + PAUZE_MAX); } else naNieuw(world);
  return true;
}

function naOud(world) {
  const w = st(world), o = w.oud; if (!o || w.oudEinde) return;
  if (o.fase === 'mislukt' || o.fase === 'geannuleerd') {
    w.oudEinde = true;
    const n = world.coopNet;
    if (w.pauzeVerstuurd && n && n.role === 'host') for (const s of rest(n, w.doel)) n.hub.announce({ k: HW.ANNULEER, id: o.id, reden: o.reden }, s); // de anderen kunnen weer verder
    eindPauze(world);
    meld(world, mislukTekst(o.reden), 6);
    ui(world).einde = { tekst: mislukTekst(o.reden) };
  }
}
function naNieuw(world) {
  const w = st(world), x = w.nieuw; if (!x || w.nieuwEinde === x.id) return;
  if (x.fase === 'geweigerd' || x.fase === 'mislukt' || x.fase === 'geannuleerd') {
    w.nieuwEinde = x.id;
    const o = w.overname; w.overname = null; if (o && o.rm) { try { o.rm.stop(); } catch (e) { /* al weg */ } }
    ui(world).vraag = null; eindPauze(world);
    const tekst = gemistTekst(x.reden); meld(world, tekst, 5); ui(world).einde = { tekst };
  }
}

// ---- de nieuwe host --------------------------------------------------------------------------------------------------
async function startOvername(world) {
  const w = st(world), n = world.coopNet, d = w.deps, x = w.nieuw;
  const o = w.overname = { wachtrij: [], rm: null, hub: null, fase: 'kamer', sinds: w.nu };
  const stop = (reden) => { if (w.overname !== o) return; if (x.bezig) { const r = x.mislukt(reden, w.nu); naarHost(world, r.uit); } naNieuw(world); };
  try {
    if (!d || !d.opKamer || (d.bereikbaar && !(await d.bereikbaar()))) { stop('onbereikbaar'); return; }
    o.rm = await d.opKamer({ aanvaard: (tr) => { if (o.hub) N.addGuest(world, tr); else o.wachtrij.push(tr); } });
  } catch (e) { stop('onbereikbaar'); return; }
  if (w.overname !== o || x.fase !== 'geladen' || !world.coopNet || world.coopNet !== n) { try { o.rm.stop(); } catch (e) { /* al weg */ } return; } // intussen afgebroken of time-out
  const r = x.draait(o.rm.kamer, w.nu); naarHost(world, r.uit);
  o.fase = 'draait'; o.sinds = w.nu;
}
// De oude host heeft hw-draait ontvangen: de nieuwe host verlaat de sessie van de oude en wordt zelf host.
function schakelNaarHost(world) {
  const w = st(world), n = world.coopNet, d = w.deps, o = w.overname, m = w.nieuw.momentopname;
  const info = n.info, max = (n.session.welcome && n.session.welcome.max) || undefined;
  o.fase = 'host';
  N.stopCoopNet(world);
  const hub = N.startHost(world, info, { ...(d.hostOpts ? d.hostOpts() : {}), seed: m.zaad, max });
  pasMomentopnameToe(world, m, d);
  o.hub = hub; for (const tr of o.wachtrij.splice(0)) N.addGuest(world, tr);
  w.nieuwEinde = w.nieuw.id; w.rol = 'host'; w.overname = null; w.rm = o.rm;
  eindPauze(world); meld(world, jijTekst, 6); ui(world).einde = { tekst: jijTekst };
}

// ---- iedereen sluit aan bij de nieuwe host (de oude host ook, als gast) -------------------------------------------------------
async function verbindMet(world, kamer, wens = null) {
  const w = st(world), d = w.deps; if (w.verbindt || !d) return false;
  w.verbindt = true; w.rol = null;
  const info = (world.coopNet && world.coopNet.info) || d.info();
  zetPauze(world, 'Verbinden met het nieuwe spel. Even wachten.', 0, w.nu + PAUZE_MAX);
  if (world.coopNet) N.stopCoopNet(world); // eerst de eigen plek in de oude sessie loslaten: het eigen spel en personage komen terug
  let tr = null;
  for (let i = 0; i < (d.pogingen || VERBIND_POGINGEN) && !tr; i++) {
    try { tr = await d.verbind(kamer); } catch (e) { tr = null; }
    if (!tr) await wacht(d, 1500); // de nieuwe host opent zijn kamer voor één speler tegelijk
  }
  w.verbindt = false; w.pauze = null; ui(world).pauze = null; zetHold(world, false);
  if (!tr) { meld(world, verbindMisluktTekst, 7); ui(world).einde = { tekst: verbindMisluktTekst }; return false; }
  try { N.startClient(world, tr, info, { ...(d.clientOpts ? d.clientOpts(wens) : {}), wens }); }
  catch (e) { try { tr.close(); } catch (er) { /* al dicht */ } meld(world, e && e.message ? e.message : verbindMisluktTekst, 7); return false; }
  return true;
}

// ---- berichten en tikken (coopnet.js roept ze aan) ------------------------------------------------------------------------
export function wisselEvent(world, body, van = 0) {
  if (!body || typeof body.k !== 'string' || !body.k.startsWith('hw-')) return false;
  const w = st(world), n = world.coopNet;
  if (n && n.role === 'host') { // een antwoord van de speler die het spel krijgt
    if (!w.oud || !w.oud.bezig) return false;
    const r = w.oud.ontvang(body, van, w.nu);
    vanHost(world, r.uit, w.doel);
    if (body.k === HW.JA && w.oud.fase === 'sturen' && !w.pauzeVerstuurd) { // vanaf nu staat het spel stil voor iedereen
      w.pauzeVerstuurd = true; w.pauzeId = w.oud.id;
      for (const s of rest(n, w.doel)) n.hub.announce({ k: HW.PAUZE, id: w.oud.id, naam: naamVan(world, w.doel) }, s);
      ui(world).pauze = { tekst: pauzeTekst(naamVan(world, w.doel)) };
    }
    if (w.oud.fase === 'klaar' && !w.oudKlaar) { w.oudKlaar = true; w.klaarT = w.nu; w.kamer = w.oud.kamer; w.oudId = w.oud.id; }
    naOud(world);
    return true;
  }
  if (van !== 0) return false;
  if (body.k === HW.VERBIND) { // de oude host meldt de nieuwe kamer: ook wie op dit moment geen sessie meer heeft luistert (het zijn dezelfde berichten)
    const v = leesVerbind(body, 0, 0); if (!v) return false;
    if (w.overname || w.verbindt) return false; // de nieuwe host zelf (of wie al bezig is) doet hier niets mee
    eindPauze(world);
    verbindMet(world, v.kamer, n && n.wens !== undefined ? n.wens : null);
    return true;
  }
  if (!n || n.role !== 'client') return false;
  if (body.k === HW.PAUZE) { zetPauze(world, pauzeTekst(String(body.naam || '').slice(0, 40)), body.id, w.nu + PAUZE_MAX); return true; }
  if (body.k === HW.ANNULEER && !(w.nieuw && w.nieuw.bezig && w.nieuw.id === body.id)) { // de rest: de overdracht is gestopt, het spel gaat door
    if (w.pauze && w.pauze.id === body.id) { eindPauze(world); meld(world, mislukTekst('geannuleerd').replace('Jij houdt het spel.', 'Het spel gaat door.'), 5); }
    return true;
  }
  if (body.k === HW.BOD && (!w.deps || !w.deps.opKamer || n.route === 'direct' || w.overname || w.verbindt)) { // deze speler kan het spel niet overnemen
    if (Number.isInteger(body.id) && body.id > 0) naarHost(world, [{ k: HW.NEE, id: body.id, reden: 'bezig' }]);
    return true;
  }
  if (!w.nieuw) w.nieuw = new NieuweHost({ ver: n.info });
  const was = w.nieuw.fase;
  const r = w.nieuw.ontvang(body, van, w.nu);
  naarHost(world, r.uit);
  if (body.k === HW.BOD && w.nieuw.fase === 'gevraagd') { ui(world).vraag = { tekst: bodTekst(w.nieuw.naam), rest: TIJD.bod }; ui(world).einde = null; meld(world, bodTekst(w.nieuw.naam), 8); }
  if (w.nieuw.fase === 'geladen' && was !== 'geladen' && !w.overname) startOvername(world);
  naNieuw(world);
  if (body.k === HW.ANNULEER) eindPauze(world);
  return true;
}

export function wisselTik(world, dt) {
  const w = world.coopWissel; if (!w) return;
  w.nu += dt;
  if (w.pauze && w.nu > w.pauze.tot) { w.pauze = null; ui(world).pauze = null; zetHold(world, false); } // nooit blijven hangen
  const n = world.coopNet;
  const o = w.oud;
  if (o && n && n.role === 'host') {
    if (o.bezig) {
      const s = n.hub.sessions.get(w.doel), sp = n.hub.roster.spelers.find((x) => x.slot === w.doel);
      if (!s || !sp || sp.verbinding === 'lost') { o.reden = 'weg'; const r = o.annuleer(w.nu); o.reden = 'weg'; vanHost(world, r.uit, w.doel); }
      else vanHost(world, o.tik(w.nu, Math.max(0, RUIMTE - s.rel.pending.length)).uit, w.doel);
      naOud(world);
    }
    if (w.oudKlaar && !w.oudBezigMetVerlaten) { // het bericht naar de rest is weg: even wachten tot het aankomt, dan zelf van sessie wisselen
      const open = [...n.hub.sessions.entries()].filter(([slot]) => slot !== w.doel).some(([, s]) => s.rel.pending.length > 0);
      if (!open || w.nu - w.klaarT >= FLUSH_MAX) { w.oudBezigMetVerlaten = true; const kamer = w.kamer; w.oudKlaar = false; N.stopCoopNet(world); w.oudBezigMetVerlaten = false; eindPauze(world); ui(world).einde = { tekst: 'Je speelt nu mee in het spel van de ander.' }; verbindMet(world, kamer, null); }
    }
  }
  const x = w.nieuw;
  if (x && n && n.role === 'client') {
    if (x.bezig) naarHost(world, x.tik(w.nu).uit);
    if (x.fase === 'gevraagd') {
      const u = ui(world).vraag; if (u) u.rest = Math.max(0, Math.ceil(TIJD.bod - (w.nu - x.sinds)));
      const inp = world.input;
      if (inp && inp.wasPressed && !world.coopUitnodiging) { if (inp.wasPressed('j')) antwoordVraag(world, true); else if (inp.wasPressed('n')) antwoordVraag(world, false); }
    }
    const ov = w.overname;
    if (ov && ov.fase === 'draait' && (n.session.rel.pending.length === 0 || w.nu - ov.sinds > FLUSH_MAX)) schakelNaarHost(world);
    naNieuw(world);
  }
}
