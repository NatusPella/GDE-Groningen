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
// coopnet.js geeft zijn functies door met zetCoopNet (een vaste import terug maakte een kring met coopnet.js)
let N = {};
export function zetCoopNet(api) { N = api; }
import { OudeHost, NieuweHost, HW, HERSTEL, TIJD, maakMomentopname, leesVerbind, bodTekst, pauzeTekst, mislukTekst, vraagWachtTekst, jijTekst, gemistTekst, verbindMisluktTekst,
  HerstelOntvanger, maakHerstel, rangschik, herstelInterval, beurtOp, STILTE_S, BEURT_S, weggevallenTekst, jijOvernameTekst, sluitAanTekst, overnameMisluktTekst, overTekst, terugHostTekst } from './coophostwissel.js';
import { weerEvent, leesWeerEvent, pasWeerToe } from './coopweer.js';
import { figures } from './coopclient.js';
import { sceneLeeg } from './coopworld.js';
import { charInfo } from './coopplayers.js';

export const PAUZE_MAX = 80;      // s: de pauze voor een overdracht gaat hoe dan ook weer weg
export const VERBIND_POGINGEN = 12;
const FLUSH_MAX = 3;               // s wachten tot de laatste berichten zijn aangekomen voor iemand van sessie wisselt
const RUIMTE = 28;                 // Reliable houdt er hoogstens 32 vast

const st = (world) => world.coopWissel || (world.coopWissel = { nu: 0, deps: null, oud: null, nieuw: null, hold: false, pauze: null, overname: null, verbindt: false, idT: 0, herstel: null, val: null, hostHerstel: null, aansluit: null, meldAan: 0, terugVan: '', terugInfo: null });
const ui = (world) => world.coopWisselUi || (world.coopWisselUi = { vraag: null, pauze: null, einde: null });
const meld = (world, tekst, sec = 5) => { if (world.addMessage) world.addMessage(tekst, sec); };
const posOf = (b) => (b && b.inVehicle && Number.isFinite(b.inVehicle.x) && Number.isFinite(b.inVehicle.y) ? b.inVehicle : b);

// De route en de wereldhaken. Verplicht: info(), verbind(kamer) -> Promise<transport>, opKamer({ aanvaard(transport) }) -> Promise<{ kamer, stop() }>.
// Optioneel: hostOpts(), clientOpts(wens), bereikbaar() -> Promise<bool>, wacht(ms), rand(), gastGeld(slot), leesOpdracht(world), zetOpdracht(world, o),
// leesKapot(world), zetKapot(world, ids), leesVoertuigen(world), zetVoertuigen(world, lijst), zetPlek(world, x, y, z), pogingen.
// Voor de overname bij wegvallen (variant 2) is ook maakKamer() -> string nodig (de kamercodes van de opvolgers), en opKamer krijgt dan { kamer }.
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
export function pasMomentopnameToe(world, m, d = {}, opt = {}) {
  const uit = { klok: false, weer: false, opdracht: false };
  if (!opt.eigenKlokWeer) { // bij een overname volgen de klok en het weer van de gast al de laatste stand van wie het spel opende
    world.clock = m.tijd.uur; uit.klok = true;
    const w = m.weerstaat ? leesWeerEvent({ k: 'weer', ...m.weerstaat }) : null;
    if (w) { world.weatherState = pasWeerToe(world.weatherState, w); uit.weer = true; }
  }
  if (world.calendar && Number.isFinite(m.tijd.dag) && m.tijd.dag > 0) world.calendar.day = m.tijd.dag;
  world.wanted = m.wanted.niveau;
  if (world.police && m.wanted.hitte) world.police.heat = m.wanted.hitte;
  const erf = world.coopOverdracht = { opdracht: m.opdracht, kapot: m.kapot, voertuigen: m.voertuigen, spelers: m.spelers, zaad: m.zaad };
  // de plek waar het spel stond: de nieuwe host komt daar (bij een overname op zijn eigen plek in de lijst), de anderen volgen via de band.
  // Een lopende opdracht zet hem zelf bij haar start (zetOpdracht), dus dan geen tweede verplaatsing.
  const eerste = (opt.slot > 0 && m.spelers.find((s) => s.slot === opt.slot && Number.isFinite(s.x))) || m.spelers.find((s) => s.slot === 0);
  const opdrachtZetPlek = !!(m.opdracht && d.zetOpdracht);
  if (eerste && !opdrachtZetPlek && Number.isFinite(eerste.x) && Number.isFinite(eerste.y) && world.player) { if (d.zetPlek) d.zetPlek(world, eerste.x, eerste.y, eerste.z); else { world.player.x = eerste.x; world.player.y = eerste.y; } }
  if (m.opdracht) {
    if (d.zetOpdracht) { d.zetOpdracht(world, m.opdracht); uit.opdracht = true; }
    else meld(world, `De opdracht ${m.opdracht.id} liep nog bij de vorige speler. Start hem zelf opnieuw als je hem wilt doen.`, 6);
  }
  if (d.zetKapot && m.kapot.length) d.zetKapot(world, m.kapot);
  if (d.zetVoertuigen && m.voertuigen.length) d.zetVoertuigen(world, m.voertuigen);
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
  if (n.sceneNu && !sceneLeeg({ ...n.sceneNu, pauze: false })) return { ok: false, tekst: 'Wacht tot het filmpje voorbij is.' }; // de eigen pauze telt niet: de knop staat in het pauzemenu
  return { ok: true };
}

const nieuwId = (d) => 1 + Math.floor((d && d.rand ? d.rand() : Math.random()) * 0xfffffe);

// De knop 'Spel overdragen' bij een speler. { ok } of { ok: false, tekst }.
export function biedOver(world, slot) {
  const k = kanOverdragen(world, slot); if (!k.ok) { meld(world, k.tekst, 5); return k; }
  const w = st(world), n = world.coopNet, d = w.deps;
  const m = verzamelMomentopname(world, d);
  const oud = new OudeHost({ ver: n.info, naam: naamVan(world, 0) });
  const terug = d.maakKamer ? d.maakKamer() : ''; // de kamer waar het spel terugkomt als het aansluiten bij de nieuwe host niet lukt
  const r = oud.bied(slot, m, nieuwId(d), w.nu, terug);
  if (r.fout) { const tekst = mislukTekst(r.fout); meld(world, tekst, 5); return { ok: false, tekst }; }
  w.oud = oud; w.oudKlaar = false; w.oudEinde = false; w.pauzeVerstuurd = false; w.doel = slot; w.terugVan = terug;
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
  o.fase = 'host'; const wens = n.wens !== undefined ? n.wens : null, terug = w.nieuw.terug;
  N.stopCoopNet(world);
  const hub = N.startHost(world, info, { ...(d.hostOpts ? d.hostOpts() : {}), seed: m.zaad, max });
  pasMomentopnameToe(world, m, d);
  o.hub = hub; for (const tr of o.wachtrij.splice(0)) N.addGuest(world, tr);
  w.nieuwEinde = w.nieuw.id; w.rol = 'host'; w.overname = null; w.rm = o.rm;
  w.aansluit = { id: w.nieuw.id, tot: w.nu + AANSLUIT_S + 3, terug, wens, aangesloten: false, fase: 'wacht', t: 0 }; // wie het spel opende moet nu aansluiten (hw-aangesloten), anders terugval
  eindPauze(world); meld(world, jijTekst, 6); ui(world).einde = { tekst: jijTekst };
}

// ---- iedereen sluit aan bij de nieuwe host (de oude host ook, als gast) -------------------------------------------------------
export const AANSLUIT_S = 40;  // s dat de anderen (en wie het spel opende) de tijd krijgen om bij de nieuwe host aan te sluiten
export const TERUG_S = 30;     // s dat de terugvalkamer van wie het spel opende openstaat voor wie nog moet aansluiten
// Bij de nieuwe host aansluiten, met een terugval: lukt dat niet binnen AANSLUIT_S, dan neemt wie het spel opende het weer over (hij opent de
// kamer `terug` en de anderen komen daar) en stopt de nieuwe host zijn hub (aansluitTik). opt: { terug, oudHost, meldAan (id van de overdracht
// voor hw-aangesloten), info, max, zaad }.
function verbindMet(world, kamer, wens = null, opt = {}) {
  const w = st(world), d = w.deps; if (w.val || w.verbindt || !d) return false;
  const n = world.coopNet, host = n && n.role === 'host';
  const lijst = [{ slot: -1, kamer, duur: AANSLUIT_S }];
  if (opt.terug) lijst.push({ slot: opt.oudHost ? 0 : -2, kamer: opt.terug, duur: TERUG_S });
  w.rol = null;
  startZoek(world, {
    lijst, ik: opt.oudHost ? 0 : -9, wens, verbind: true, meldAan: opt.meldAan || 0,
    info: opt.info || (n && n.info) || d.info(), max: opt.max || (n && (host ? n.hub.roster.max : n.session.welcome && n.session.welcome.max)) || undefined, zaad: opt.zaad,
    pauze: 'Verbinden met het nieuwe spel. Even wachten.',
    tekst: { aan: () => overTekst(''), mislukt: verbindMisluktTekst, host: terugHostTekst },
  });
  return true;
}

// ---- variant 2: overname bij wegvallen ----------------------------------------------------------------------------------------
// Wie het spel opende stuurt de gasten elke ~10 s een herstelmomentopname (hw-hk en hw-hs) met een rangorde van opvolgers en per opvolger een
// kamercode. Valt hij weg (STILTE_S zonder bericht en zonder BYE), dan kiest elke gast uit dezelfde lijst dezelfde opvolger. De opvolger
// start de wereld op de momentopname en opent zijn kamer; de anderen sluiten daar aan. Lukt dat niet binnen een beurt (BEURT_S), dan is de
// volgende opvolger aan de beurt. Alleen met een kamercode (de lijst en de codes gaan niet over een IP-adres) en niet zonder gasten.
const POGING_S = 1.5;       // s tussen twee pogingen om bij de kamer van de opvolger aan te sluiten
const HERSTEL_PENDING = 12; // een gast met meer dan dit nog onderweg krijgt deze ronde geen herstelmomentopname (het bandbreedtebudget)

function herstelTik(world, dt) {
  const w = st(world), n = world.coopNet, d = w.deps;
  if (!d || !d.opKamer || !d.maakKamer || n.route === 'direct') return;
  if ((w.oud && w.oud.bezig) || w.oudKlaar || w.overname) return;
  const gasten = n.hub.roster.spelers.filter((s) => s.slot !== 0 && s.verbinding === 'ok' && n.hub.sessions.get(s.slot));
  const hh = w.hostHerstel && w.hostHerstel.net === n ? w.hostHerstel : (w.hostHerstel = { net: n, t: 0, id: 0, vorige: [], kamers: {}, gehad: new Set(), bytes: 0, stuurde: 0 });
  if (!gasten.length) { hh.t = 0; return; } // zonder gasten staat het uit
  hh.t += dt;
  const nieuw = gasten.filter((s) => !hh.gehad.has(s.slot)), aanBeurt = hh.t >= herstelInterval(gasten.length);
  if (!aanBeurt && !nieuw.length) return;
  const doel = (aanBeurt ? gasten : nieuw).filter((s) => n.hub.sessions.get(s.slot).rel.pending.length <= HERSTEL_PENDING);
  if (!doel.length) return;
  if (aanBeurt) hh.t = 0;
  const kand = gasten.map((s) => ({ slot: s.slot, ping: Math.round((n.hub.sessions.get(s.slot).rtt || 0) * 1000), kamer: hh.kamers[s.slot] || (hh.kamers[s.slot] = d.maakKamer()) }));
  const rang = hh.vorige = rangschik(kand, hh.vorige);
  hh.id = (hh.id % 0xfffff) + 1;
  const pak = maakHerstel(hh.id, verzamelMomentopname(world, d), rang);
  if (!pak) return; // te groot voor het budget: de gasten houden de vorige
  for (const s of doel) {
    hh.gehad.add(s.slot);
    n.hub.announce(pak.kop, s.slot); for (const b of pak.stukken) n.hub.announce(b, s.slot);
    hh.bytes += JSON.stringify(pak.kop).length + pak.stukken.reduce((a, b) => a + b.d.length, 0); hh.stuurde++;
  }
}

function ontvangHerstel(world, body) {
  const w = st(world), n = world.coopNet;
  const h = w.herstel && w.herstel.net === n ? w.herstel : (w.herstel = { net: n, ontv: new HerstelOntvanger(), laatst: null }); // een nieuwe sessie begint met een lege lijst
  const k = h.ontv.neem(body); if (k) h.laatst = { ...k, t: w.nu };
}

// Een gast: is wie het spel opende weg? Dan kiezen we samen de opvolger.
function controleerWeg(world) {
  const w = st(world), n = world.coopNet, s = n.session;
  if (w.val || w.verbindt || w.overname || (w.nieuw && w.nieuw.bezig) || !n.joined || !s.stilte) return;
  if (s.status === 'geweigerd' || s.status === 'verbroken') return; // een BYE (het spel gestopt): geen overname, de gast speelt weer in zijn eigen spel
  if (s.stilte() < STILTE_S) return;
  const h = w.herstel; if (!h || h.net !== n || !h.laatst) return;
  startVal(world, h.laatst);
}
// De gedeelde zoektocht naar een host: een lijst van kamers (elk met zijn eigen beurt, `duur` seconden), de eigen plek `ik` in die lijst (is de
// beurt van jezelf, dan open je de kamer en wordt je host, anders probeer je bij die kamer aan te sluiten). Tikken in valTik (de speltijd, geen
// echte klok). Gebruikt door de overname bij wegvallen en door het aansluiten bij een nieuwe host met zijn terugval.
function startZoek(world, o) {
  const w = st(world);
  const v = w.val = { t0: w.nu, lijst: o.lijst, ik: o.ik, info: o.info, max: o.max, zaad: o.zaad, wens: o.wens === undefined ? null : o.wens, m: o.m || null, namen: o.namen || (() => 'De ander'), tekst: o.tekst, meldAan: o.meldAan || 0, beurt: -1, volgende: 0, probe: null, eigenBezig: false, eigenGedaan: false, klaar: false };
  w.verbindt = !!o.verbind;
  if (world.coopNet) N.stopCoopNet(world); // de eigen plek in de oude sessie loslaten: het eigen spel en personage komen terug
  const duur = o.lijst.reduce((a, r) => a + (r.duur || BEURT_S), 0);
  zetPauze(world, o.pauze, 0, w.nu + duur + 20); ui(world).einde = null;
  return v;
}
function startVal(world, h) {
  const w = st(world), n = world.coopNet, d = w.deps;
  const lijst = h.rang.filter((r) => r.kamer); if (!lijst.length || !d) return false;
  const namen = (slot) => { const x = h.m.spelers.find((q) => q.slot === slot); return (x && x.naam) || 'De ander'; };
  const ik = n.session.slot, tekst = weggevallenTekst(lijst[0].slot === ik ? 'Jij' : namen(lijst[0].slot));
  startZoek(world, { lijst, ik, info: n.info, max: (n.session.welcome && n.session.welcome.max) || undefined, wens: n.wens !== undefined ? n.wens : null, m: h.m, namen, pauze: tekst, tekst: { aan: sluitAanTekst, mislukt: overnameMisluktTekst, host: jijOvernameTekst } });
  meld(world, tekst, 6);
  return true;
}
function valKlaar(world, tekst) { // klaar met de zoektocht (gelukt of niet): pauze weg, melding
  const w = st(world); w.val = null; w.verbindt = false; eindPauze(world); meld(world, tekst, 6); ui(world).einde = { tekst };
}
function valTik(world) {
  const w = st(world), v = w.val, d = w.deps; if (!v) return;
  if (world.coopNet && !v.klaar) { w.val = null; w.verbindt = false; return; } // de speler zelf startte intussen een sessie: de zoektocht vervalt
  const beurt = beurtOp(v.lijst, w.nu - v.t0);
  if (beurt >= v.lijst.length) { valKlaar(world, v.tekst.mislukt); return; }
  const kand = v.lijst[beurt];
  if (v.beurt !== beurt) { v.beurt = beurt; v.volgende = w.nu; }
  if (kand.slot === v.ik) { if (!v.eigenBezig && !v.eigenGedaan) startEigen(world, v, kand); return; }
  if (v.probe || w.nu < v.volgende) return;
  v.volgende = w.nu + POGING_S;
  const probe = v.probe = {};
  Promise.resolve().then(() => d.verbind(kand.kamer)).then((tr) => tr, () => null).then((tr) => {
    if (v.probe === probe) v.probe = null;
    if (!tr) return;
    if (w.val !== v || v.klaar) { try { tr.close(); } catch (e) { /* al dicht */ } return; } // intussen afgehandeld
    try { N.startClient(world, tr, v.info, { ...(d.clientOpts ? d.clientOpts(v.wens) : {}), wens: v.wens }); }
    catch (e) { try { tr.close(); } catch (er) { /* al dicht */ } v.volgende = w.nu + 5; return; }
    v.klaar = true; if (v.meldAan) w.meldAan = v.meldAan; // wie het spel opende meldt de nieuwe host dat hij is aangesloten (hw-aangesloten, zodra het welkom er is)
    valKlaar(world, v.tekst.aan(v.namen(kand.slot)));
  });
}
// Deze speler is aan de beurt om host te zijn: de kamer openen, de wereld starten (op de momentopname, als die er is) en de anderen aannemen.
async function startEigen(world, v, kand) {
  const w = st(world), d = w.deps;
  v.eigenBezig = true;
  let rm = null;
  const faal = () => { v.eigenGedaan = true; if (rm) { try { rm.stop(); } catch (e) { /* al weg */ } } };
  try {
    if (d.bereikbaar && !(await d.bereikbaar())) { faal(); return; }
    const wachtrij = []; let hub = null;
    rm = await d.opKamer({ kamer: kand.kamer, aanvaard: (tr) => { if (hub) N.addGuest(world, tr); else wachtrij.push(tr); } });
    if (w.val !== v || v.klaar || world.coopNet) { faal(); return; } // intussen afgebroken, of de speler zit al in een sessie
    hub = N.startHost(world, v.info, { ...(d.hostOpts ? d.hostOpts() : {}), seed: v.m ? v.m.zaad : v.zaad, max: v.max });
    if (v.m) pasMomentopnameToe(world, v.m, d, { slot: v.ik, eigenKlokWeer: true }); // zonder momentopname (de terugval van wie het spel opende) is de eigen wereld al goed
    for (const tr of wachtrij.splice(0)) N.addGuest(world, tr);
    v.klaar = true; w.rol = 'host'; w.rm = rm; w.overgenomen = (w.overgenomen || 0) + 1;
    valKlaar(world, v.tekst.host);
  } catch (e) { faal(); } finally { v.eigenBezig = false; }
}

// De nieuwe host na hw-draait: sluit wie het spel opende niet binnen AANSLUIT_S aan, dan neemt hij het weer over. De nieuwe host stuurt zijn
// gasten naar de terugvalkamer, stopt zijn hub en sluit zelf daar aan.
function aansluitTik(world) {
  const w = st(world), a = w.aansluit, n = world.coopNet;
  if (!n || n.role !== 'host') { w.aansluit = null; return; } // intussen iets anders geworden
  if (a.aangesloten) { w.aansluit = null; return; }
  if (a.fase === 'wacht') {
    if (w.nu < a.tot) return;
    if (!a.terug) { w.aansluit = null; return; }
    for (const s of rest(n, -1)) n.hub.announce({ k: HW.VERBIND, id: a.id, kamer: a.terug, naam: naamVan(world, 0) }, s);
    a.fase = 'flush'; a.t = w.nu; meld(world, 'Wie het spel opende kon niet aansluiten. Het spel gaat terug naar hem.', 6);
    return;
  }
  const open = [...n.hub.sessions.values()].some((s) => s.rel.pending.length > 0);
  if (open && w.nu - a.t < FLUSH_MAX) return;
  w.aansluit = null;
  try { if (w.rm) w.rm.stop(); } catch (e) { /* al weg */ } w.rm = null;
  startZoek(world, { lijst: [{ slot: -2, kamer: a.terug, duur: TERUG_S }], ik: -9, wens: a.wens, verbind: true, info: n.info, max: n.hub.roster.max, pauze: 'Terug naar het eerste spel. Even wachten.', tekst: { aan: () => overTekst(''), mislukt: verbindMisluktTekst, host: terugHostTekst } });
}

// ---- berichten en tikken (coopnet.js roept ze aan) ------------------------------------------------------------------------
export function wisselEvent(world, body, van = 0) {
  if (!body || typeof body.k !== 'string' || !body.k.startsWith('hw-')) return false;
  const w = st(world), n = world.coopNet;
  if (n && n.role === 'host') { // een antwoord van de speler die het spel krijgt
    if (body.k === HW.AANGESLOTEN) { if (w.aansluit && body.id === w.aansluit.id && van > 0) w.aansluit.aangesloten = true; return true; } // wie het spel opende is bij de nieuwe host aangekomen
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
    if (w.overname || w.verbindt || w.val) return false; // de nieuwe host zelf (of wie al bezig is) doet hier niets mee
    eindPauze(world);
    verbindMet(world, v.kamer, n && n.wens !== undefined ? n.wens : null, { terug: v.terug });
    return true;
  }
  if (!n || n.role !== 'client') return false;
  if (body.k === HERSTEL.KOP || body.k === HERSTEL.STUK) { ontvangHerstel(world, body); return true; }
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
  else if (w.pauze && w.hold && !world.coopHold) world.coopHold = true; // het wachtscherm bij een weggevallen speler (coophold.js) zet de vlag zelf weer uit
  const n = world.coopNet;
  if (w.val) valTik(world);
  const o = w.oud;
  if (w.aansluit) { aansluitTik(world); if (world.coopNet !== n) return; } // de nieuwe host stopte zijn hub (terugval)
  if (w.meldAan && n && n.role === 'client' && n.joined) { n.session.sendEvent({ k: HW.AANGESLOTEN, id: w.meldAan }); w.meldAan = 0; }
  if (n && n.role === 'host' && n.hub) herstelTik(world, dt);
  if (o && n && n.role === 'host') {
    if (o.bezig) {
      const s = n.hub.sessions.get(w.doel), sp = n.hub.roster.spelers.find((x) => x.slot === w.doel);
      if (!s || !sp || sp.verbinding === 'lost') { o.reden = 'weg'; const r = o.annuleer(w.nu); o.reden = 'weg'; vanHost(world, r.uit, w.doel); }
      else vanHost(world, o.tik(w.nu, Math.max(0, RUIMTE - s.rel.pending.length)).uit, w.doel);
      naOud(world);
    }
    if (w.oudKlaar && !w.oudBezigMetVerlaten) { // het bericht naar de rest is weg: even wachten tot het aankomt, dan zelf van sessie wisselen
      const open = [...n.hub.sessions.entries()].filter(([slot]) => slot !== w.doel).some(([, s]) => s.rel.pending.length > 0);
      if (!open || w.nu - w.klaarT >= FLUSH_MAX) { w.oudBezigMetVerlaten = true; const kamer = w.kamer, opt = { terug: w.terugVan, oudHost: true, meldAan: w.oudId, info: n.info, max: n.hub.roster.max, zaad: n.hub.cfg.seed }; w.oudKlaar = false; N.stopCoopNet(world); w.oudBezigMetVerlaten = false; eindPauze(world); verbindMet(world, kamer, null, opt); }
    }
  }
  if (n && n.role === 'client') controleerWeg(world);
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
