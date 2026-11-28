// Rangmomenten (bouwbrief 28-11, taak R1/B1): de gedeelde haak voor een verhaalmoment bij een rangstijging van een loopbaan.
// Loopbaantaken melden hier hun momenten aan (id, loopbaan, rang, scene, voorwaarde); loopbaanlive.js roept de haak aan bij
// elke niveau-omhoog, en rankmomentsrun.js speelt het moment op een rustig moment af. Zie docs/RANKMOMENTS.md.
//
// Puur: geen DOM, geen wereld, geen THREE; de opslag (gezien) en het afspelen (speel) komen van buiten, dus scripts/rankmoments_test.mjs
// draait het in node. Een rang zonder aangemeld moment doet niets: de speler houdt dan alleen het kaartje van meldOmhoog.
//
// Samen spelen: lokaal per speler. Een gast die door een beloning van de gastheer omhoog gaat (loopbaanGast) speelt zijn eigen moment
// op zijn eigen apparaat; er gaat niets over het netwerk en de gastheer weet er niets van. Een moment is nooit voortgang voor een ander.
import { VAK_IDS, MAX_NIVEAU } from './loopbaan.js';

export const MOMENT_KINDS = ['talk', 'kaart', 'spel'];
const MAX_WOORDEN_REGEL = 25;
export const MAX_TRIES = 3;  // een moment dat drie keer niet wil beginnen (film bezet) laten we los en tellen we als gezien

// id -> moment. Een moment: { id, vak, rang, scene, voorwaarde? }
//   scene { soort:'talk', regels:[[spreker, tekst], ...] }       ondertitelpraat (storytalk.js), spreker is de spreeksleutel (Tammo, Anita, ...)
//   scene { soort:'kaart', wie, tekst }                          een kaart met het personage als kicker
//   scene { soort:'spel', speel:(w, ctx) => boolean }            een eigen scène (storybridge, careerdebutrun-achtig); true = gestart
//   voorwaarde (ctx) => boolean                                  optioneel: ctx = { w, vak, van, naar }; onwaar = dit moment slaan we over
const register = new Map();

// Rangen die niet bij een vak van loopbaan.js horen (de voetbalcarrière heeft zijn eigen zes rangen, footballstory.js): een module meldt zijn
// rangsoort aan en voert de haak zelf (footballrank.js). Het gezien-zijn staat gewoon in het profiel (momenten).
const EXTRA_VAKKEN = new Set();
export const registerRankKind = (id) => { if (typeof id === 'string' && id && !VAK_IDS.includes(id)) EXTRA_VAKKEN.add(id); return EXTRA_VAKKEN.has(id); };

// Meld een moment aan. Geeft { ok, reden }; een ongeldig of dubbel moment wordt niet opgenomen.
export function registerRankMoment(m) {
  const reden = momentProblem(m);
  if (reden) return { ok: false, reden };
  if (register.has(m.id)) return { ok: false, reden: `${m.id}: id bestaat al` };
  register.set(m.id, { id: m.id, vak: m.vak, rang: m.rang, scene: m.scene, voorwaarde: typeof m.voorwaarde === 'function' ? m.voorwaarde : null });
  return { ok: true, reden: '' };
}

export function momentProblem(m) {
  if (!m || typeof m !== 'object') return 'geen moment';
  if (typeof m.id !== 'string' || !m.id || m.id.length > 60) return 'id ontbreekt of is langer dan 60 tekens';
  if (!VAK_IDS.includes(m.vak) && !EXTRA_VAKKEN.has(m.vak)) return `${m.id}: onbekende loopbaan '${m.vak}'`;
  if (!Number.isInteger(m.rang) || m.rang < 2 || m.rang > MAX_NIVEAU) return `${m.id}: rang moet een geheel getal van 2 tot ${MAX_NIVEAU} zijn`;
  if (m.voorwaarde != null && typeof m.voorwaarde !== 'function') return `${m.id}: voorwaarde moet een functie zijn`;
  const s = m.scene;
  if (!s || !MOMENT_KINDS.includes(s.soort)) return `${m.id}: scene.soort moet een van ${MOMENT_KINDS.join(', ')} zijn`;
  if (s.soort === 'talk') {
    if (!Array.isArray(s.regels) || !s.regels.length) return `${m.id}: talk heeft regels nodig`;
    for (const r of s.regels) {
      if (!Array.isArray(r) || typeof r[0] !== 'string' || !r[0] || typeof r[1] !== 'string' || !r[1].trim()) return `${m.id}: een regel is [spreker, tekst]`;
      if (r[1].trim().split(/\s+/).length > MAX_WOORDEN_REGEL) return `${m.id}: een regel is langer dan ${MAX_WOORDEN_REGEL} woorden`;
    }
  } else if (s.soort === 'kaart') {
    if (typeof s.wie !== 'string' || !s.wie || typeof s.tekst !== 'string' || !s.tekst.trim()) return `${m.id}: kaart heeft wie en tekst nodig`;
    if (s.tekst.trim().split(/\s+/).length > MAX_WOORDEN_REGEL) return `${m.id}: de kaarttekst is langer dan ${MAX_WOORDEN_REGEL} woorden`;
  } else if (typeof s.speel !== 'function') return `${m.id}: spel heeft een functie speel nodig`;
  return '';
}

export const rankMoments = () => [...register.values()];
export const rankMomentsOf = (vak) => rankMoments().filter((m) => m.vak === vak).sort((a, b) => a.rang - b.rang);
export const clearRankMomentsForTest = () => register.clear();

// De momenten die bij deze stijging horen: rang in (van, naar], nog niet gezien, voorwaarde waar; laagste rang eerst.
// Een sprong over meer niveaus (een grote beloning) speelt dus elk niveau dat hij oversloeg, in volgorde.
export function momentsFor(vak, van, naar, { gezien = () => false, ctx = {} } = {}) {
  const out = [];
  for (const m of rankMomentsOf(vak)) {
    if (!(m.rang > van && m.rang <= naar) || gezien(m.id)) continue;
    let ok = true;
    if (m.voorwaarde) { try { ok = !!m.voorwaarde({ ...ctx, vak, van, naar }); } catch (e) { ok = false; } }
    if (ok) out.push(m);
  }
  return out;
}

// Wanneer mag een moment beginnen: niets wat een andere activiteit verstoort. s komt van rankmomentsrun.js (live) of van de test.
export function rankBlockers(s) {
  const out = [];
  if (!s.started) out.push('spel nog niet gestart');
  if (s.loading) out.push('laadscherm staat nog');
  for (const h of s.held || []) out.push('poort: ' + h);
  if (s.noticeShown) out.push('melding in beeld');
  if (s.missionActive) out.push('missie actief');
  if (s.cinematicActive) out.push('film bezig');
  if (s.sinceCinematicS != null && s.sinceCinematicS <= 2.5) out.push('film net afgelopen');
  if (s.pigeon) out.push('duifstand');
  if (s.activity) out.push('activiteit of minigame bezig');
  if (s.sideJob) out.push('bijbaan of dienst bezig');
  if (s.respawn) out.push('terugzetten loopt');
  if (s.wanted > 0) out.push('politie op je hielen');
  if (s.menuOpen) out.push('menu open');
  if (s.talkBusy) out.push('er loopt al praat');
  return out;
}
export const RANK_CALM_S = 3;

// De haak met zijn eigen wachtrij. `store`: { gezien(id), markeer(id) } (het profiel van deze speler); `speel(moment, w, ctx)` geeft true als het
// moment begon, false als het nu niet kon. Een uitzondering in speel telt als mislukt zonder het spel te raken.
export function makeRankHook({ store, speel }) {
  const wacht = [];       // { moment, w, ctx, pogingen }
  let rust = 0;
  const gezien = (id) => { try { return !!store.gezien(id); } catch (e) { return false; } };

  // loopbaanlive.meldOmhoog: o = { vak, van, naar }. Zet de momenten in de wachtrij; geeft het aantal terug (0 = alleen het kaartje).
  function omhoog(w, o) {
    if (!o || !o.vak || !(o.naar > o.van)) return 0;
    const lijst = momentsFor(o.vak, o.van, o.naar, { gezien, ctx: { w } });
    let n = 0;
    for (const m of lijst) {
      if (wacht.some((x) => x.moment.id === m.id)) continue;
      wacht.push({ moment: m, w, ctx: { w, vak: o.vak, van: o.van, naar: o.naar }, pogingen: 0 });
      n++;
    }
    rust = 0;
    return n;
  }

  // Elk frame vanuit rankmomentsrun.js; s is de momentopname voor rankBlockers. Speelt hooguit één moment per aanroep.
  function tik(dt, w, s) {
    if (!wacht.length) return null;
    const b = rankBlockers(s || {});
    rust = b.length ? 0 : rust + dt;
    if (b.length || rust < RANK_CALM_S) return null;
    const e = wacht[0];
    if (gezien(e.moment.id)) { wacht.shift(); return null; }
    if (e.moment.voorwaarde) {
      let ok = true;
      try { ok = !!e.moment.voorwaarde({ ...e.ctx, w: w || e.w }); } catch (x) { ok = false; }
      if (!ok) { wacht.shift(); return null; }
    }
    let begon = false;
    try { begon = !!speel(e.moment, w || e.w, e.ctx); } catch (x) { begon = false; e.pogingen = MAX_TRIES; }
    if (begon || ++e.pogingen >= MAX_TRIES) {
      // begonnen of opgegeven: nooit twee keer (opgegeven telt als gezien, zodat niets blijft hangen)
      try { store.markeer(e.moment.id); } catch (x) { /* opslag: het moment blijft in dit spel gezien via de wachtrij */ }
      wacht.shift();
      rust = 0;
      return begon ? e.moment.id : null;
    }
    rust = 0;
    return null;
  }

  return { omhoog, tik, wachtrij: () => wacht.map((x) => x.moment.id), leeg: () => { wacht.length = 0; rust = 0; } };
}
