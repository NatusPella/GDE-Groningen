// De live-laag van de voetbalcarrière (#1110, ADR 0042): houdt het profiel van deze speler bij in de eigen opslag (gde-voetbalcarriere-v1, los van elke savegame), telt nachten op het signaal
// van calendarday.js (de klok die meer dan vier uur terugspringt) en betaalt geld uit via loopbaanVerdien (nooit world.money +=). Geen DOM en geen THREE: scripts/voetbal_carrierelive_test.mjs.
// Samen spelen: de carrière is van de speler zelf (nooit gedeeld); een gast betaalt zijn eigen uitslag uit zijn eigen profiel (zie voetbalsamen.js). Zonder profiel (nog niet gestart) doet dit bestand niets.
import { hoofdspeler } from './players.js';
import { KEYS } from './storagekeys.js';
import * as C from './voetbalcarriere.js';
import { nightPassed } from './voetbalagenda.js';
import { makeParkIndex, fallbackIndex, HOME_WGS } from './voetbalparken.js';
import { wgsToWorld } from './rdnew.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import { euro } from './geldtekst.js';
import { voetbalOpen, progressFrom } from './voetbalpoort.js';
import { nextBeat, inviteBeat, markBeat, hudLine, beatText } from './voetbalbeats.js';
import { storyHome, nextStoryBeat, markStoryBeat, storyHudLine } from './footballstory.js';
import { getStoryView, storyGateProgress } from './storyquery.js';
import { unlockAchievement } from './achievements.js';
import { playerBusy } from './busy.js';
import { narrativeBusy } from './narrative.js';
import { makeSponsorPandIndex } from './voetbalbezit.js';
import { betaalBanenUitgave } from './sidejobwereld.js';
import * as KIT from './footballkit.js';

const WRITE_DELAY_MS = 1500;
let career = null, storageOverride = null, timer = 0, dirty = false, prevClock = null, index = null;
const listeners = new Set();

const storage = () => {
  if (storageOverride !== null) return storageOverride;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
};
// Voor de tests: een eigen opslag (nooit de echte gde-*-sleutels).
export function useStorage(st) { storageOverride = st; career = null; dirty = false; prevClock = null; }
export function useParkData(raw) { index = raw ? makeParkIndex(raw) : null; if (index && index.clubs.length < 8) index = null; }
export const getIndex = () => index || (index = fallbackIndex());
export const getClub = (id) => C.clubResolver(getIndex())(id);
// De wereldplek [x, y] van een club (zijn park of plaats), voor het sponsorpand in de buurt; null als hij niet bekend is.
export function clubPlace(id) {
  const cl = getClub(id), p = cl && (cl.park || cl);
  return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? [p.x, p.y] : null;
}
// De parkdata (voetbalparkendata.js, ongeveer 27 kB) laadt lui met import(): geen netwerkaanroep, alleen de eigen module; kapot of weg geeft de terugval van acht vaste plaatsen.
export async function loadParkData() {
  try { const m = await import('./voetbalparkendata.js'); useParkData(m.default); } catch (e) { useParkData(null); }
  return getIndex().parkCount;
}

// De kaartlaag Voetbal (#1115, #1117, besluit eigenaar 21-11): de sportparken uit de kaart, elk met zijn verzonnen club, als gedimde plek in de laag Voetbal. Het thuispark,
// het trainingsveld en het park van de volgende uitwedstrijd komen al van de activiteit (voetbal.js mapLayerSpots) en staan hier niet dubbel. Zonder echte parkdata (de terugval
// van acht verzonnen plekken) niets: die plekken liggen niet op de kaart. De kaart dunt en verbergt onbezocht gebied zelf. Samen spelen: lokaal, uit de eigen carrière.
let parkSpotCache = { key: '', spots: [] };
export function parkMapSpots() {
  if (!index) return [];
  const c = getCareer(), has = C.hasCareer(c);
  let nextId = null;
  if (has) { try { const nm = C.nextMatch(c, getClub); nextId = nm && !nm.isHome ? nm.opponent : null; } catch (e) { nextId = null; } }
  const key = `${index.parkCount}|${has ? c.club : ''}|${nextId || ''}`;
  if (parkSpotCache.key === key) return parkSpotCache.spots;
  const spots = [];
  for (const cl of index.clubs) {
    if (has && (cl.id === c.club || cl.id === nextId)) continue;
    const p = cl.park, n = cl.trainingsvelden.length + 1;
    spots.push({ id: `voetbal:${cl.id}`, x: p.x, y: p.y, name: cl.naam, sub: `Voetbalclub in ${cl.plaats}${n > 1 ? ` · ${n} sportparken` : ''}`, goal: { kind: 'place', id: `voetbal:${cl.id}`, name: cl.naam, sub: 'Sportpark', x: p.x, y: p.y } });
  }
  parkSpotCache = { key, spots };
  return spots;
}

export function getCareer() {
  if (!career) {
    let raw = null;
    try { const st = storage(); raw = st ? st.getItem(KEYS.voetbalCarriere) : null; } catch (e) { raw = null; }
    career = C.normalize(raw);
  }
  return career;
}
export function saveNow() {
  timer = 0;
  if (!dirty) return;
  const st = storage();
  if (!st) return;
  try { st.setItem(KEYS.voetbalCarriere, C.serialize(getCareer())); dirty = false; } catch (e) { /* opslag vol of geblokkeerd: de carrière blijft in dit spel */ }
}
function mark() {
  dirty = true;
  for (const f of listeners) { try { f(career); } catch (e) { /* de luisteraar is niet ons probleem */ } }
  if (!timer && typeof setTimeout === 'function') { timer = setTimeout(saveNow, WRITE_DELAY_MS); if (timer && timer.unref) timer.unref(); }
}
export function subscribe(f) { listeners.add(f); return () => listeners.delete(f); }
export const replaceCareer = (c) => { career = c; mark(); return career; };
export const hasCareer = () => C.hasCareer(getCareer());

// Het geld uit een lijst `earn`-regels: één betaling via loopbaanVerdien (het vak Buiten, zoals de Euroborg-wedstrijd; geen eigen loonfactor). Geeft het bedrag dat echt betaald is.
export function payEarn(w, lines, { xp = 0, label = '' } = {}) {
  const total = (lines || []).reduce((a, x) => a + (x.amount | 0), 0);
  if (!(total > 0) || !w) return 0;
  const paid = loopbaanVerdien(w, 'buiten', total, { xp, n: 0, deel: false, rubriek: 'Overig inkomsten' });
  if (w.addMessage) w.addMessage(`${label ? `${label}: ` : ''}${euro(paid)}`, 3.5, { kind: 'geld', key: 'voetbal-pay' });
  return paid;
}

// Een nieuwe carrière (de speler nam de uitnodiging aan): `char` is het personage waarmee hij speelt.
export function createNew(_w, char, day = 0) {
  const [hx, hy] = wgsToWorld(HOME_WGS.lat, HOME_WGS.lon);
  const idx = getIndex();
  career = C.createCareer({ char, index: idx, home: storyHome(idx) || { x: hx, y: hy }, day });      // de start ligt bij de dorpsclub op het Hogeland (footballstory.js); zonder die plaats in de data blijft het Paddepoel
  mark(); saveNow();
  return career;
}
export function reset() { career = C.newCareer(); mark(); saveNow(); }

// Elke frame (main.js, naast updateCalendar): een nacht verder? De klok springt meer dan vier uur terug. Lazy en goedkoop: alleen een vergelijking, de rest bij een nacht.
export function updateDay(dt, w) {
  const c = getCareer();
  const h = w && Number.isFinite(w.clock) ? ((w.clock % 24) + 24) % 24 : null;
  const night = nightPassed(prevClock, h);
  prevClock = h;
  if (!night || !C.hasCareer(c)) return null;
  return advance(w, 1);
}
// Het clubtenue groeit mee met de klasse (footballkit.js levelSync, docs/VOETBALKLEDING-22-11.md): bij promotie of degradatie (en bij de eerste wedstrijd) komen de stukken van het
// nieuwe niveau in de kast van Tammo en Tessa en volgt een kleine melding. De vlag kitLvl staat in de carrièrevlaggen (een getal).
export function kitSync(w) {
  const c = getCareer();
  if (!C.hasCareer(c)) return null;
  const club = getClub(c.club);
  if (!club) return null;
  const r = KIT.levelSync(c, club);
  if (!r.changed) return null;
  career = { ...career, flags: { ...career.flags, kitLvl: r.flag } };
  mark();
  if (w && w.addMessage) w.addMessage(KIT.levelMessage(r.to), 4);
  return r;
}
export function advance(w, nights) {
  const r = C.advanceDays(getCareer(), nights, getClub);
  career = r.career;
  const paid = payEarn(w, r.earn, { label: 'Voetbal' });
  unlockFor(w, career, { report: r.report || null });
  kitSync(w);
  if (w && w.addMessage) for (const n of r.notes.slice(0, 3)) w.addMessage(n, 4);
  mark();
  return { ...r, paid };
}
// De prestaties van de carrière (elf, per speler): welke horen bij dit profiel, deze wedstrijd en dit seizoenseinde. Geeft de lijst ids (de aanroeper hoeft niets te doen); unlockAchievement is idempotent.
export function achievementsFor(c, { summary = null, report = null } = {}) {
  if (!C.hasCareer(c)) return [];
  const ids = [], div = C.divisionOfMyClub(c);
  if (summary && summary.played && c.stats.matches >= 1) ids.push('vc_debuut');
  if (summary && summary.goals > 0 && summary.played && C.divisionOfMyClub(c) === 'terp') ids.push('vc_doelpunt_terp');
  if (C.levelOf(c).id === 'basis' || C.levelOf(c).id === 'kapitein' || C.levelOf(c).id === 'trainer') ids.push('vc_basis');
  if (report && /promotie/.test(report.outcome)) ids.push('vc_promotie');
  if (report && report.division === 'terp' && report.champion === c.club) ids.push('vc_kampioen_terp');
  if (report && report.cup === 'gewonnen') ids.push('vc_beker');
  if (div === 'kroon') ids.push('vc_kroon');
  if (c.flags.captain) ids.push('vc_kapitein');
  if (report && report.europe === 'gewonnen') ids.push('vc_waddenbeker');
  if (c.roles.trainer) ids.push('vc_trainer');
  if (c.roles.manager) ids.push('vc_manager');
  return ids;
}
function unlockFor(w, c, ctx) {
  const ids = achievementsFor(c, ctx);
  for (const id of ids) { try { unlockAchievement(w, id); } catch (e) { /* een prestatie mag het spel nooit stoppen */ } }
  return ids;
}
// Een wedstrijd is gespeeld of uitgerekend: verwerk, betaal, meld. result = { gf, ga, pens?, stats? } of null (uitrekenen).
export function finishMatch(w, result) {
  const r = C.playEvent(getCareer(), getClub, result);
  if (!r.summary) return r;
  career = r.career;
  const paid = payEarn(w, r.summary.earn, { label: r.summary.played ? 'Voetbal' : 'Uitgerekend', xp: r.summary.played ? 20 : 8 });
  if (w && w.addMessage && r.summary.injury) w.addMessage(r.summary.injury.text, 5);
  unlockFor(w, career, { summary: r.summary });
  kitSync(w);
  mark();
  return { ...r, paid };
}
export function trainNow(w, focus, score = 0.8) {
  const r = C.train(getCareer(), focus, score);
  if (r.ok) { career = r.career; mark(); if (w && w.addMessage) w.addMessage(`Training klaar: ${r.gains.length ? '+1 ' + r.gains.join(', +1 ') : 'je voelt het groeien'}`, 3); }
  return r;
}
export function applyFocus(focus) { career = C.withFocus(getCareer(), focus); mark(); return career; }
export function applyInjuries(on) { const c = getCareer(); if (!C.hasCareer(c)) return c; career = { ...c, settings: { ...c.settings, injuries: !!on }, injury: on ? c.injury : null }; mark(); return career; }
export function flush() { saveNow(); }

// ---- de poort, de uitnodiging en de beats ----
// De stand voor de poort: die van het verhaal (storyGateProgress); zonder story.js (een losse test) de oude afleiding, waarin een ontbrekende poort alles opent.
export function progressNow(w) {
  // 24-11: de poort van het verhaal zelf (story.js state.gate). w.gate bestaat niet, dus de oude regel hieronder gaf altijd 'alles open': de uitnodiging
  // van de club ('Ik heb jou opgegeven. Niet zeuren.') kwam in een nieuw spel al in akte 1, ook bij Samen spelen. Besluit eigenaar: het verhaal opent alles.
  let sp = null;
  try { sp = storyGateProgress(); } catch (e) { sp = null; }
  if (sp) return { ...sp, dev: !!(w && w.devJump), begun: (id) => hasCareer() || (typeof sp.begun === 'function' && sp.begun(id)) };
  let sv = { end: false };
  try { sv = getStoryView() || sv; } catch (e) { sv = { end: false }; }
  return progressFrom({ stepId: sv.id || null, ended: !!sv.end, gate: w ? w.gate : undefined, dev: !!(w && w.devJump), begun: () => hasCareer() });
}
export const isUnlockedNow = (w) => voetbalOpen(progressNow(w));
// Kan er nu een zijpad-beat komen? Niet tijdens een missie of scène, niet in dezelfde minuut als een kaart.
let extraBusy = null;                                 // main.js zet hier cardsBusy (hudcards.js haalt THREE binnen en hoort niet in een node-test)
export function zetBezigProbe(fn) { extraBusy = typeof fn === 'function' ? fn : null; }
export function sidePathBusy(w) {
  try { return !!(playerBusy(w).busy || narrativeBusy() || (extraBusy && extraBusy())); } catch (e) { return false; }
}
let beatCheck = 0;
const currentDay = () => { const c = getCareer(); return C.hasCareer(c) ? c.day : 0; };
// Elke frame goedkoop; elke twee seconden kijken we of er een uitnodiging of beat te melden is (een stil appje: hooguit 14 woorden). Geeft de beat of null.
export function updateBeats(dt, w) {
  if (!w || (beatCheck -= dt) > 0) return null;
  beatCheck = 2;
  const c = getCareer();
  const ctx = { unlocked: isUnlockedNow(w), busy: sidePathBusy(w), day: currentDay() };
  const char = (hoofdspeler(w) || {}).character === 'tammo' ? 'tammo' : 'anita';
  if (!C.hasCareer(c)) {
    // de uitnodiging: hooguit een keer per speldag en drie keer in totaal (het paneel toont hem altijd); een gemiste uitnodiging vervalt niet maar zeurt niet
    const nu = Math.floor((w.time || 0) / 1440);
    if (!ctx.unlocked || ctx.busy || (c.invites | 0) >= 3 || (c.inviteWorld != null && c.inviteWorld === nu)) return null;
    const inv = inviteBeat(c, { unlocked: true, busy: false, day: -1 }, char);
    if (!inv) return null;
    if (w.addMessage) w.addMessage(`${inv.wie}: ${inv.tekst}`, 8, { kind: 'tip', key: 'voetbal-b1' });
    career = { ...c, invited: true, invites: (c.invites | 0) + 1, inviteWorld: nu }; mark();
    return inv;
  }
  const b = nextBeat(c, ctx);
  if (!b) {
    const sb = nextStoryBeat(c, ctx);      // de verhaalbeats per rang en Jelle's brief (footballstory.js); pas als de tien vaste beats niet aan de beurt zijn
    if (!sb) return null;
    if (w.addMessage) w.addMessage(storyHudLine(sb), 7, { kind: 'tip', key: `voetbal-${sb.id}` });
    career = markStoryBeat(c, sb, ctx.day); mark();
    return sb;
  }
  if (w.addMessage) w.addMessage(hudLine(b, c.char), 7, { kind: 'tip', key: `voetbal-${b.id}` });
  career = markBeat(c, b, ctx.day); mark();
  return b;
}
// ---- clubaandelen en het sponsorpand (#1113, #1179) ----
// De Bezit-pandindex (parcelindex.js createBuildingIndex) komt lui uit main.js: zonder index kiest een sponsor geen pand (het spel gaat gewoon door).
let pandProbe = null;
export function zetPandIndexProbe(fn) { pandProbe = typeof fn === 'function' ? fn : null; }
export const getSponsorPandIndex = () => { try { const b = pandProbe && pandProbe(); return b ? makeSponsorPandIndex(b) : null; } catch (e) { return null; } };
// Een aandeel kopen: het bedrag gaat van het saldo af (betaalBanenUitgave, ook bij een gast zijn eigen geld); het kan alleen als de som er helemaal is.
export function buyShare(w, clubId, share) {
  const c = getCareer();
  const money = w ? Math.max(0, Math.floor(w.money || 0)) : 0;
  const r = C.buyClubShare(c, clubId, share, money, getClub);
  if (!r.ok) return r;
  const paid = betaalBanenUitgave(w, r.price, 'Overig uitgaven');
  if (paid < r.price) { if (paid > 0 && w) w.money += paid; return { career: c, ok: false, reason: 'Het geld is er niet' }; }
  career = r.career; mark();
  if (w && w.addMessage) w.addMessage(`Aandeel in ${r.club}: ${euro(r.price)}`, 4, { kind: 'geld', key: 'voetbal-aandeel' });
  return r;
}
export function sellShare(w, clubId) {
  const r = C.sellClubShare(getCareer(), clubId);
  if (!r.ok) return r;
  career = r.career; mark();
  if (w && r.price > 0) { w.money += r.price; if (w.addMessage) w.addMessage(`Aandeel verkocht: ${euro(r.price)}`, 4, { kind: 'geld', key: 'voetbal-aandeel' }); }
  return r;
}
export { beatText };
