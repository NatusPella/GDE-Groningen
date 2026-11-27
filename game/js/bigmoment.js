// Big moments (#996, ADR 0040, DESIGN_SYSTEM.md "Big moments"): the four moments that get the full
// screen print treatment. Mission passed or failed is a tilted yellow band with a Gronings
// exclamation in large print and the Dutch line under it; "opgepakt" is a stamp on a fine (no
// violence shown, constitution rule 6); a new area is a place-name stamp like a postcard; wanted up
// or down is a short tag at the edge, never full screen. Rustig drukwerk (html.rustig-drukwerk)
// takes the tilt, the misregistration and the stamp motion out through the tokens: the same words.
//
// The module has a pure half (bouwMoment, planner, formatters; tested by scripts/bigmoment_test.mjs
// without a DOM) and one thin DOM function, showBigMoment. The DOM part never takes input or pauses
// the game: a moment is an overlay that fades by itself (pointer-events: none).
//
// Samen spelen (#429): a big moment is local to the player it is about (every player sees their
// own mission result, fine or area); nothing here is sent over the network.

export const SOORTEN = ['geslaagd', 'mislukt', 'opgepakt', 'gebied', 'wanted'];
export const MAX_WOORDEN = 14;   // the 14-word budget of ui-taal.md
export const MAX_FLITS_PER_S = 3; // no flash above three a second (photosensitivity)
export const MAX_WACHTRIJ = 3;
export const RIJDEN_MS = 3;       // vanaf deze snelheid (m/s) of in een voertuig, boot of vliegtuig is de speler aan het rijden

// Defaults per kind: form, label, a Gronings exclamation with its Dutch line, how long it stays (ms).
// "Grunn" never "de Grunn"; every Gronings line has its Dutch next to it (regelNl).
export const STANDAARD = {
  geslaagd: { vorm: 'band', schermvullend: true, klein: 'Missie geslaagd', kop: 'Mooi, dat gaait!', regelNl: 'Dat is gelukt. Netjes gedaan.', ms: 4200 },
  mislukt: { vorm: 'band', schermvullend: true, klein: 'Missie mislukt', kop: 'Nou, nait best.', regelNl: 'Dat ging mis. Probeer het nog eens.', ms: 4200 },
  // #1208, #1218: het woord boete staat een keer (het label bij het bedrag); chip en zin zeggen iets anders
  opgepakt: { vorm: 'stempel', schermvullend: true, klein: 'Staande gehouden', kop: 'Opgepakt', regelNl: 'De agent schrijft een bon uit.', ms: 4200 },
  gebied: { vorm: 'plaats', schermvullend: false, klein: 'Moi!', kop: 'Grunn', regelNl: 'Je bent hier voor het eerst.', ms: 3600 },
  wanted: { vorm: 'rand', schermvullend: false, klein: 'Gezocht', kop: 'Pas op!', regelNl: 'De politie let op je.', ms: 1800 },
};

const cut = (s, max) => {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};

// At most `max` words, the rest becomes an ellipsis: the same budget as the rest of the UI.
import { isPauseMenuOpen } from './pausestate.js';
import { hoofdspeler } from './players.js';
import { planIntro, isSkipEvent } from './endcardimpact.js';
import { icoon } from './icons.js';
import { uitslagBon } from './spelstatus.js';
import { escapeHtml as esc } from './htmlescape.js';

export function klemWoorden(tekst, max = MAX_WOORDEN) {
  const w = String(tekst == null ? '' : tekst).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  return w.length > max ? w.slice(0, max).join(' ').replace(/[.,;:!?]+$/, '') + '…' : w.join(' ');
}

// 1250 -> "€ 1.250" (nl-NL thousands dot, no locale needed so the test is the same everywhere).
export function formatBeloning(b) {
  if (typeof b === 'string') return cut(b, 40);
  if (!Number.isFinite(b) || b === 0) return '';
  const n = Math.min(Number.MAX_SAFE_INTEGER, Math.abs(Math.round(b)));
  if (n === 0) return ''; // een bedrag onder een halve euro is geen '− € 0'
  const tekst = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (b < 0 ? '− € ' : '€ ') + tekst;
}

// 272 -> "4:32", 3725 -> "1:02:05"; a string is kept.
export function formatTijd(t) {
  if (typeof t === 'string') return cut(t, 20);
  if (!Number.isFinite(t) || t <= 0) return '';
  const s = Math.floor(t);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const twee = (x) => String(x).padStart(2, '0');
  return h ? `${h}:${twee(m)}:${twee(r)}` : `${m}:${twee(r)}`;
}

// Compact (rijdend): alleen de vormen die in beeld iets bedekken (nieuw gebied, wanted); opgepakt en de
// einde-missie-band blijven vol. Puur, zodat de test het zonder DOM kan controleren.
export const COMPACT_VORMEN = ['plaats', 'rand'];
export function isRijdend({ inVehicle = false, snelheid = 0 } = {}) {
  return !!inVehicle || (Number.isFinite(snelheid) && snelheid > RIJDEN_MS);
}
export function rijdendVan(w) {
  const p = hoofdspeler(w);
  if (!p) return false;
  return isRijdend({ inVehicle: !!p.inVehicle, snelheid: Math.hypot(p.vx || 0, p.vy || 0) });
}

// Opts -> the one shape the DOM and the tests read. Always has the words, whatever the mode.
// opts: { soort, titel, regelNl, beloning, tijd, sterren, klein, beloningLabel }  (all but soort optional)
export function bouwMoment(opts = {}) {
  const soort = SOORTEN.includes(opts.soort) ? opts.soort : 'geslaagd';
  const d = STANDAARD[soort];
  const titel = cut(opts.titel, 40);
  // a new area is named by its place: the big print is the place, the exclamation is the small label
  const kop = titel || d.kop;
  const lang = kop.length > 16; // #1217: een missienaam als titel is langer dan een uitroep: kleinere letter, geen afgebroken woorden
  const regelNl = klemWoorden(opts.regelNl || d.regelNl);
  // #1332: de kaart zelf toont bij mislukt nooit een beloning, ook niet als een aanroeper er een meegeeft (niet alleen momentVanBanner)
  const beloningIn = soort === 'mislukt' ? 0 : opts.beloning;
  const beloning = formatBeloning(beloningIn);
  const tijd = formatTijd(opts.tijd);
  const sterren = Number.isFinite(opts.sterren) ? Math.max(0, Math.min(5, Math.round(opts.sterren))) : null;
  const beloningLabel = cut(opts.beloningLabel, 16) || (soort === 'opgepakt' ? 'Boete' : 'Beloning');
  const klein = cut(opts.klein, 24) || d.klein;
  // Spel-UI 24-11: de uitslagkaart van opgepakt en buiten westen zegt wat het kost, wat verdwijnt en wat blijft (spelstatus.js uitslagBon)
  const bon = Array.isArray(opts.bon) ? opts.bon.slice(0, 5).map((r) => ({ label: cut(r.label, 40), waarde: cut(r.waarde, 28), soort: ['min', 'goed'].includes(r.soort) ? r.soort : '' })) : [];
  const bonOver = bon.length ? cut(opts.bonOver, 16) : '';
  const compact = !!opts.rijdend && COMPACT_VORMEN.includes(d.vorm);
  const delen = [klein + '.', kop + '.', regelNl];
  if (beloning) delen.push(`${beloningLabel}: ${beloning}.`);
  if (tijd) delen.push(`Tijd: ${tijd}.`);
  if (sterren != null) delen.push(`${sterren} van 5 sterren.`);
  // UX-audit 23-11: bij een mislukte missie zegt de kaart zelf hoe je opnieuw begint (vanaf het laatste checkpoint, missioncheckpoint.js);
  // opnieuwToets is de toetsglyph die de aanroeper meegeeft (cinematics.js), zodat dit bestand geen toetsen kent
  const opnieuw = soort === 'mislukt' && opts.opnieuwToets ? String(opts.opnieuwToets) : '';
  if (opnieuw) delen.push('Opnieuw proberen kan meteen.');
  for (const r of bon) delen.push(`${r.label}: ${r.waarde}.`);
  if (bonOver) delen.push(`Je houdt over: ${bonOver}.`);
  return {
    opnieuw, bon, bonOver,
    soort, vorm: d.vorm, schermvullend: d.schermvullend, klein, kop, lang, regelNl, beloning, beloningWaarde: Number.isFinite(beloningIn) ? beloningIn : null, beloningLabel, tijd, sterren, compact, ms: bon.length && !compact ? d.ms + 3500 : compact ? Math.round(d.ms * 0.65) : d.ms,
    aria: delen.join(' '),
  };
}

// Rustig drukwerk is a presentation mode, never a content mode: the words stay the same.
export function momentStijl(moment, rustig = false) {
  return {
    schuin: rustig ? 0 : -1.2,
    beweging: rustig ? 'geen' : 'stempel',
    raster: !rustig,
    misdruk: !rustig,
    woorden: moment.aria,
  };
}

// Samen spelen (#429, #996): does this moment belong on this screen? The host and a solo player see
// everything about their own game. A guest sees a moment only when it happens to the guest himself
// (eigen) or belongs to a joint mission the guest joined (gezamenlijk and deelnemer); world state
// like the wanted level of the host's game is not the guest's moment.
export function mayMomentTonen({ gast = false, eigen = false, gezamenlijk = false, deelnemer = false } = {}) {
  if (!gast) return true;
  return !!eigen || (!!gezamenlijk && !!deelnemer);
}

// A mission result banner (cinematics.js showBanner: kind pass|fail, title, reason, reward) as moment
// options. A short title (the Gronings "Sikkom.") is the big print; a long mission title goes in the
// line under it, so the band never has to wrap a whole sentence at 200 px.
// Perfect-ronde (22-11): (1) the standard title "MISSIE GESLAAGD" is the small label already, so it is not printed a second time as the
// big print (the card then shows the Gronings default); (2) a line longer than the 14-word budget is cut at a SENTENCE, never in the
// middle of one, and the "Nieuw doel: ..." sentence (the hint of what comes next) is kept.
// titels die alleen de uitkomst zeggen
const UITKOMST_TITEL = /^(missie|opdracht|taak|klus)\s+(geslaagd|mislukt|gehaald|volbracht)[.!]*$/i;
export function kaartRegel(tekst, max = MAX_WOORDEN) {
  const t = String(tekst == null ? '' : tekst).replace(/\s+/g, ' ').trim();
  const aantal = (s) => s.split(' ').filter(Boolean).length;
  if (aantal(t) <= max) return t;
  const zinnen = t.match(/[^.!?]+[.!?]*(?=\s|$)/g).map((z) => z.trim()).filter(Boolean);
  const eerste = zinnen[0];
  const doel = zinnen.find((z) => /^Nieuw doel/i.test(z)) || (zinnen.length > 1 ? zinnen[zinnen.length - 1] : null);
  if (doel && doel !== eerste && aantal(`${eerste} ${doel}`) <= max) return `${eerste} ${doel}`;
  if (doel && /^Nieuw doel/i.test(doel) && aantal(doel) <= max) return doel;
  if (aantal(eerste) <= max) return eerste;
  if (doel && aantal(doel) <= max) return doel;
  return klemWoorden(eerste, max);
}

// #1207, #1217: geeft de aanroeper de naam van de missie mee (missie), dan is die naam de grote titel en het label de uitkomst;
// de Groningse standaardkop vervalt dan en de regel is alleen de reden. Zonder missie blijft alles zoals hierboven.
export function momentVanBanner({ kind = 'pass', title = '', reason = '', reward = 0, missie = '' } = {}) {
  const soort = kind === 'fail' ? 'mislukt' : 'geslaagd';
  const ruw = String(title || '').replace(/\s+/g, ' ').trim();
  // #1206: een titel die alleen de uitkomst zegt ("Missie geslaagd", "Opdracht geslaagd", "Taak mislukt.") is het label al: hij staat niet nog eens als titel of in de regel
  const alLabel = ruw.length > 0 && (ruw.toLocaleLowerCase('nl') === STANDAARD[soort].klein.toLocaleLowerCase('nl') || UITKOMST_TITEL.test(ruw));
  const naam = String(missie || '').replace(/\s+/g, ' ').trim();
  if (naam) return { soort, titel: naam, regelNl: (String(reason || '').trim() === naam ? '' : kaartRegel(reason)) || undefined, beloning: soort === 'mislukt' ? 0 : reward };
  const t = alLabel ? '' : ruw;
  const kort = t.length > 0 && t.length <= 16;
  const regel = kort || !t ? reason : [t, reason].filter(Boolean).join('. ');
  // een mislukte missie levert niets op (#1187, #814): geen beloningsregel, ook niet als de aanroeper er een meegeeft
  return { soort, titel: kort ? t : '', regelNl: kaartRegel(regel) || undefined, beloning: soort === 'mislukt' ? 0 : reward };
}

// Wanted went up or down (prev and nu are star counts 0..5): null when nothing changed, else the
// options of the edge tag. Going to zero is "out of sight". #1080: a short status card without stars; the stars live in one place (the minimap, #1175).
export function momentVanWanted(prev, nu) {
  if (!Number.isFinite(prev) || !Number.isFinite(nu) || prev === nu) return null;
  const omhoog = nu > prev;
  if (omhoog) return { soort: 'wanted', klein: 'Gezocht', titel: 'Pas op!', regelNl: nu >= 5 ? 'Alle agenten zoeken je.' : 'De politie let op je.' };
  if (nu === 0) return { soort: 'wanted', klein: 'Weg uit beeld', titel: 'Vrij', regelNl: 'De politie ziet je niet meer.' };
  return { soort: 'wanted', klein: 'Minder gezocht', titel: 'Rustiger', regelNl: 'De politie zoekt minder naar je.' };
}

// Opgepakt (busted: a fine) or buiten westen (down: a hospital bill); money is the amount lost.
export function momentVanOpgepakt({ busted = false, geld = 0, money = null, missie = '' } = {}) {
  // met het geld van de speler erbij (Spel-UI 24-11) staat er een bon op de kaart: wat het kost, wat verdwijnt en wat je overhoudt
  const bon = money == null ? null : uitslagBon({ busted, boete: geld, geld: money, missieNaam: missie });
  const extra = bon ? { bon: bon.regels, bonOver: bon.over } : {};
  if (busted) return { soort: 'opgepakt', beloning: -Math.abs(geld || 0), ...extra };
  return { soort: 'opgepakt', klein: 'Neergegaan', titel: 'Buiten westen', regelNl: 'Je bent opgelapt in het ziekenhuis.', beloningLabel: 'Rekening', beloning: -Math.abs(geld || 0), ...extra };
}

// A first visit to a district, village or the surrounding land: the place is the print.
export function momentVanGebied(naam, regel = '') {
  return { soort: 'gebied', titel: naam, regelNl: regel || undefined };
}

// Flash gate: how many appearances (anything that pops on screen) began in the last second.
export function toelatenFlits(historie, nu, max = MAX_FLITS_PER_S) {
  return (Array.isArray(historie) ? historie : []).filter((t) => nu - t < 1000).length < max;
}

// The planner decides, without a DOM, what a new moment does: show it now, queue it behind the
// full-screen one that is up, or drop it. Rules: one full-screen moment at a time (the rest queues,
// at most MAX_WACHTRIJ, the same moment twice collapses); a wanted tag never interrupts and never
// waits (a late "wanted" is stale); never more than MAX_FLITS_PER_S appearances in a second.
export function maakPlanner() {
  const st = { bezig: null, wachtrij: [], historie: [] };
  const sleutel = (m) => m.soort + '|' + m.kop;
  const toon = (m, nu) => { st.bezig = m; st.historie.push(nu); st.historie = st.historie.filter((t) => nu - t < 1000); return { actie: 'toon', moment: m }; };
  return {
    state: st,
    aanvraag(m, nu) {
      if (!toelatenFlits(st.historie, nu)) return { actie: 'laat-vallen', reden: 'flits' };
      if (m.vorm === 'rand') {
        if (st.bezig && st.bezig.schermvullend) return { actie: 'laat-vallen', reden: 'bezig' };
        st.historie.push(nu);
        return { actie: 'toon', moment: m };
      }
      if (!st.bezig) return toon(m, nu);
      if (st.wachtrij.some((q) => sleutel(q) === sleutel(m)) || sleutel(st.bezig) === sleutel(m)) return { actie: 'laat-vallen', reden: 'dubbel' };
      if (st.wachtrij.length >= MAX_WACHTRIJ) return { actie: 'laat-vallen', reden: 'wachtrij-vol' };
      st.wachtrij.push(m);
      return { actie: 'wacht', plek: st.wachtrij.length };
    },
    klaar(nu) {
      st.bezig = null;
      const volgende = st.wachtrij.shift();
      return volgende ? toon(volgende, nu) : { actie: 'leeg' };
    },
  };
}

// #985 (overlap-audit 20-11): the wanted tag sits under the HUD's right column (clock, stars, money, weapon), never over it.
// trBottom: the bottom of that column in screen px; the tag stays inside the window (viewH, its own height).
export function randTop(trBottom, viewH = Infinity, hoogte = 0, gap = 12) {
  const top = Math.round((Number.isFinite(trBottom) ? trBottom : 0) + gap);
  return Math.max(0, Math.min(top, Number.isFinite(viewH) ? Math.max(0, viewH - hoogte - gap) : top));
}

// The place card ('gebied') hangs in the free centre, but never over zone B (the objective and the route card, measured):
// base is its own top (px), zoneBottom the bottom of that column.
export function plaatsTop(base, zoneBottom, gap = 12) {
  return Math.round(Math.max(Number.isFinite(base) ? base : 0, Number.isFinite(zoneBottom) ? zoneBottom + gap : 0));
}

// ---------------------------------------------------------------------------------------- DOM

let cssGeladen = false;
let planner = null;
let actief = null;       // the full-screen element on screen
let randActief = null;   // the wanted tag on screen

function ensureCss() {
  if (cssGeladen) return;
  cssGeladen = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./bigmoment.css', import.meta.url).href;
  document.head.appendChild(link);
  const impact = document.createElement('link'); // de eindkaart met impact: eigen animaties, los van de rustige big moments
  impact.rel = 'stylesheet';
  impact.href = new URL('./endcardimpact.css', import.meta.url).href;
  document.head.appendChild(impact);
}

function sterrenHtml(n) {
  if (n == null) return '';
  // shape plus count, never colour alone: a filled star, a halftone-dotted outline for an empty one
  let h = '';
  for (let i = 0; i < 5; i++) h += `<i class="bm-ster${i < n ? ' aan' : ''}" aria-hidden="true"></i>`;
  return `<span class="bm-sterren">${h}</span>`;
}

// De bon onder de stempelkaart: regels met stippellijn, daaronder wat je overhoudt (spelstatus.js uitslagBon)
function bonHtml(m) {
  if (!m.bon || !m.bon.length) return '';
  const regel = (r) => `<div class="ds-z-bon__regel"><span>${esc(r.label)}</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag${r.soort === 'min' ? ' bm-bon-min' : r.soort === 'goed' ? ' bm-bon-goed' : ''}">${esc(r.waarde)}</span></div>`;
  return `<div class="ds-zeef bm-bon"><div class="ds-z-bon">${m.bon.map(regel).join('')}${m.bonOver ? `<div class="ds-z-bon__totaal"><span>Je houdt over</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag">${esc(m.bonOver)}</span></div>` : ''}</div></div>`;
}

function binnenHtml(m) {
  const meta = [];
  if (m.beloning) meta.push(`<span class="bm-meta-i bm-i-beloning"><b>${esc(m.beloningLabel)}</b> <span class="bm-teller">${esc(m.beloning)}</span></span>`);
  if (m.tijd) meta.push(`<span class="bm-meta-i bm-i-tijd"><b>Tijd</b> ${esc(m.tijd)}</span>`);
  if (m.opnieuw) meta.push(`<span class="bm-meta-i bm-i-opnieuw">${m.opnieuw} <b>Opnieuw proberen</b></span>`);
  const metaHtml = (meta.length ? `<div class="bm-meta">${meta.join('')}</div>` : '') + bonHtml(m);
  const kop = `<div class="bm-kop${m.lang ? ' lang' : ''}">${esc(m.kop)}</div>`;
  const regel = `<p class="bm-regel">${esc(m.regelNl)}</p>`;
  if (m.vorm === 'band') return `<div class="bm-dim"></div><div class="bm-band ds-mi-in ds-mi-landing"><span class="bm-klein">${esc(m.klein)}</span>${kop}${regel}${metaHtml}${m.sterren != null && m.soort === 'geslaagd' ? sterrenHtml(m.sterren) : ''}<span class="bm-glans" aria-hidden="true"></span></div>`;
  if (m.vorm === 'stempel') return `<div class="bm-dim"></div><div class="bm-slip ds-mi-in ds-mi-landing"><span class="bm-klein">${esc(m.klein)}</span>${regel}${metaHtml}<div class="bm-stempel ds-mi-in ds-mi-landing ds-mi-na" aria-hidden="true">${esc(m.kop)}</div></div>`;
  if (m.vorm === 'plaats') return `<div class="bm-kaart ds-mi-in ds-mi-landing"><span class="bm-klein">${esc(m.klein)}</span>${kop}${regel}<div class="bm-zegel" aria-hidden="true">${icoon('plek', { maat: 'xl' })}</div></div>`; // #1219: een plekicoon in het zegel, geen leeg stippelvierkant
  return `<div class="bm-tag ds-mi-in ds-mi-landing"><span class="bm-klein">${esc(m.klein)}</span><span class="bm-kop">${esc(m.kop)}</span><span class="bm-regel">${esc(m.regelNl)}</span></div>`;
}

// Het geluid van de eindkaart komt van buiten (cinematics.js koppelt audio.js): dit bestand blijft zonder audio-import testbaar.
let eindkaartGeluid = null;
export function setEindkaartGeluid(fn) { eindkaartGeluid = typeof fn === 'function' ? fn : null; }

function rustigStand() {
  const root = document.documentElement;
  if (root.classList.contains('reduce-motion') || root.classList.contains('rustig-drukwerk')) return true;
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// De intro met impact van de band (endcardimpact.js): klassen en CSS-variabelen voor de staffeling, timers voor
// geluid en teller. Een toets of klik (niet vastgehouden) slaat over en toont direct de eindstand. Geeft een
// opruimfunctie terug; bij Beweging beperken of Rustig drukwerk blijft het bij de snelle fade en één geluid.
function startImpact(el, m) {
  const rustig = rustigStand();
  const plan = planIntro({ soort: m.soort, beloning: m.beloningWaarde, tijd: !!m.tijd, sterren: m.soort === 'geslaagd' ? m.sterren : null, rustig });
  const timers = [];
  const speel = (g) => { if (eindkaartGeluid) { try { eindkaartGeluid(g.naam, g.i || 0); } catch (e) { /* geluid mag de kaart nooit breken */ } } };
  if (!plan.impact) { plan.geluid.forEach(speel); return null; }
  el.classList.add('bm-i');
  const zet = (sel, eenh) => { const x = el.querySelector(sel); if (x) x.style.setProperty('--bm-n', String(eenh)); };
  zet('.bm-klein', plan.onderdelen.find((o) => o.naam === 'klein').eenh);
  zet('.bm-kop', plan.onderdelen.find((o) => o.naam === 'kop').eenh);
  zet('.bm-regel', plan.onderdelen.find((o) => o.naam === 'regel').eenh);
  for (const o of plan.onderdelen) if (o.naam === 'beloning' || o.naam === 'tijd') zet(`.bm-i-${o.naam}`, o.eenh);
  el.querySelectorAll('.bm-ster').forEach((x, i) => { if (plan.sterren[i]) x.style.setProperty('--bm-n', String(plan.sterren[i].eenh)); });
  if (plan.glans) zet('.bm-glans', plan.glans.eenh);
  if (plan.schok) el.style.setProperty('--bm-schok-n', String(plan.schok.eenh));
  const teller = el.querySelector('.bm-teller');
  const eind = m.beloning;
  if (plan.teller && teller) teller.textContent = formatBeloning(0) || '€ 0';
  if (plan.teller && teller) for (const s of plan.teller.stappen) timers.push(setTimeout(() => { teller.textContent = formatBeloning(s.waarde); }, plan.teller.at + s.t));
  for (const g of plan.geluid) timers.push(setTimeout(() => speel(g), g.at));
  let weg = false;
  const stop = () => {
    if (weg) return;
    weg = true;
    timers.forEach(clearTimeout);
    window.removeEventListener('keydown', op, true);
    window.removeEventListener('pointerdown', op, true);
  };
  const op = (ev) => {
    if (!isSkipEvent(ev)) return;
    stop();
    el.classList.add('bm-klaar'); // direct de eindstand: geen animaties meer, alle onderdelen vol in beeld
    if (teller && plan.teller) teller.textContent = eind;
  };
  window.addEventListener('keydown', op, true);
  window.addEventListener('pointerdown', op, true);
  timers.push(setTimeout(stop, plan.totaal + 50));
  return stop;
}

function toonNu(m, klaarCb) {
  ensureCss();
  const el = document.createElement('div');
  el.className = `bm bm-v-${m.vorm} bm-${m.soort}${m.compact ? ' bm-compact' : ''}`; // bm-v-: de vorm van de wortel botst anders met het kind .bm-band of .bm-stempel
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', m.vorm === 'rand' ? 'polite' : 'assertive');
  el.setAttribute('aria-label', m.aria);
  el.innerHTML = binnenHtml(m);
  document.body.appendChild(el);
  if (m.vorm === 'rand') { // under the HUD's right column, measured now: the zoom and the weapon chip decide how tall it is
    const tr = document.querySelector('#hud .hud-top-right');
    if (tr) el.style.top = randTop(tr.getBoundingClientRect().bottom, window.innerHeight, el.offsetHeight) + 'px';
  }
  if (m.vorm === 'plaats') { // under the objective column of zone B (the owner moved the objective to the top centre, 20-11)
    const zb = document.querySelector('#hud .hud-zone-b');
    if (zb) el.style.top = plaatsTop(window.innerHeight * (m.compact ? 0.15 : 0.24), zb.getBoundingClientRect().bottom) + 'px'; // not from getComputedStyle: bigmoment.css may not be loaded yet at the first moment
  }
  const stopImpact = m.vorm === 'band' ? startImpact(el, m) : null;
  requestAnimationFrame(() => el.classList.add('aan'));
  if (m.vorm === 'rand') { if (randActief) randActief.remove(); randActief = el; } else actief = el;
  // de missie is voorbij: doelbalk en sleutelhints wijken achter de eindkaart (#1188, #1189)
  if (m.schermvullend) document.body.classList.add('bm-eindkaart');
  const weg = () => {
    if (stopImpact) stopImpact();
    el.classList.remove('aan');
    el.classList.add('uit');
    setTimeout(() => { el.remove(); if (m.vorm === 'rand' ? randActief === el : actief === el) { if (m.vorm === 'rand') randActief = null; else actief = null; } if (m.schermvullend && !actief) document.body.classList.remove('bm-eindkaart'); klaarCb(); }, 450);
  };
  setTimeout(weg, m.ms);
  return el;
}

// The one entry point. Returns { el, done } (done resolves when the moment is gone), or null when
// the moment was dropped (a flash gate, a duplicate, a full queue) or there is no document.
export function showBigMoment(opts = {}) {
  if (typeof document === 'undefined') return null;
  if (!mayMomentTonen(opts)) return null;
  if (isPauseMenuOpen()) return null; // a moment never sits over the pause menu; the old card stays as the fallback
  if (!planner) planner = maakPlanner();
  const m = bouwMoment(opts);
  const nu = performance.now();
  const r = planner.aanvraag(m, nu);
  if (r.actie === 'laat-vallen') return null;
  let klaar;
  const done = new Promise((res) => { klaar = res; });
  const afronden = () => {
    klaar();
    if (m.vorm === 'rand') return;
    const volgende = planner.klaar(performance.now());
    if (volgende.actie === 'toon') toonVolgende(volgende.moment);
  };
  if (r.actie === 'wacht') { m.__klaar = klaar; return { el: null, done }; }
  return { el: toonNu(m, afronden), done };
}

function toonVolgende(m) {
  const klaar = m.__klaar || (() => {});
  toonNu(m, () => {
    klaar();
    const volgende = planner.klaar(performance.now());
    if (volgende.actie === 'toon') toonVolgende(volgende.moment);
  });
}
