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

// Defaults per kind: form, label, a Gronings exclamation with its Dutch line, how long it stays (ms).
// "Grunn" never "de Grunn"; every Gronings line has its Dutch next to it (regelNl).
export const STANDAARD = {
  geslaagd: { vorm: 'band', schermvullend: true, klein: 'Missie geslaagd', kop: 'Mooi, dat gaait!', regelNl: 'Dat is gelukt. Netjes gedaan.', ms: 4200 },
  mislukt: { vorm: 'band', schermvullend: true, klein: 'Missie mislukt', kop: 'Nou, nait best.', regelNl: 'Dat ging mis. Probeer het nog eens.', ms: 4200 },
  opgepakt: { vorm: 'stempel', schermvullend: true, klein: 'Boete', kop: 'Opgepakt', regelNl: 'Je bent staande gehouden en er is een boete.', ms: 4200 },
  gebied: { vorm: 'plaats', schermvullend: false, klein: 'Moi!', kop: 'Grunn', regelNl: 'Je bent hier voor het eerst.', ms: 3600 },
  wanted: { vorm: 'rand', schermvullend: false, klein: 'Gezocht', kop: 'Pas op!', regelNl: 'De politie let op je.', ms: 1800 },
};

const cut = (s, max) => {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};

// At most `max` words, the rest becomes an ellipsis: the same budget as the rest of the UI.
import { isPauseMenuOpen } from './pausestate.js';

export function klemWoorden(tekst, max = MAX_WOORDEN) {
  const w = String(tekst == null ? '' : tekst).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  return w.length > max ? w.slice(0, max).join(' ').replace(/[.,;:!?]+$/, '') + '…' : w.join(' ');
}

// 1250 -> "€ 1.250" (nl-NL thousands dot, no locale needed so the test is the same everywhere).
export function formatBeloning(b) {
  if (typeof b === 'string') return cut(b, 40);
  if (!Number.isFinite(b) || b === 0) return '';
  const n = Math.abs(Math.round(b));
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

// Opts -> the one shape the DOM and the tests read. Always has the words, whatever the mode.
// opts: { soort, titel, regelNl, beloning, tijd, sterren, klein, beloningLabel }  (all but soort optional)
export function bouwMoment(opts = {}) {
  const soort = SOORTEN.includes(opts.soort) ? opts.soort : 'geslaagd';
  const d = STANDAARD[soort];
  const titel = cut(opts.titel, 40);
  // a new area is named by its place: the big print is the place, the exclamation is the small label
  const kop = titel || d.kop;
  const regelNl = klemWoorden(opts.regelNl || d.regelNl);
  const beloning = formatBeloning(opts.beloning);
  const tijd = formatTijd(opts.tijd);
  const sterren = Number.isFinite(opts.sterren) ? Math.max(0, Math.min(5, Math.round(opts.sterren))) : null;
  const beloningLabel = cut(opts.beloningLabel, 16) || (soort === 'opgepakt' ? 'Boete' : 'Beloning');
  const klein = cut(opts.klein, 24) || d.klein;
  const delen = [klein + '.', kop + '.', regelNl];
  if (beloning) delen.push(`${beloningLabel}: ${beloning}.`);
  if (tijd) delen.push(`Tijd: ${tijd}.`);
  if (sterren != null) delen.push(`${sterren} van 5 sterren.`);
  return {
    soort, vorm: d.vorm, schermvullend: d.schermvullend, klein, kop, regelNl, beloning, beloningLabel, tijd, sterren, ms: d.ms,
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
export function momentVanBanner({ kind = 'pass', title = '', reason = '', reward = 0 } = {}) {
  const soort = kind === 'fail' ? 'mislukt' : 'geslaagd';
  const t = String(title || '').replace(/\s+/g, ' ').trim();
  const kort = t.length > 0 && t.length <= 16;
  const regel = kort ? reason : [t, reason].filter(Boolean).join('. ');
  return { soort, titel: kort ? t : '', regelNl: regel || undefined, beloning: reward };
}

// Wanted went up or down (prev and nu are star counts 0..5): null when nothing changed, else the
// options of the edge tag. Going to zero is "out of sight"; the tag carries the star count in words too.
export function momentVanWanted(prev, nu) {
  if (!Number.isFinite(prev) || !Number.isFinite(nu) || prev === nu) return null;
  const omhoog = nu > prev;
  if (omhoog) return { soort: 'wanted', klein: 'Gezocht', titel: 'Pas op!', regelNl: nu >= 5 ? 'Alle agenten zoeken je.' : 'De politie let op je.', sterren: nu };
  if (nu === 0) return { soort: 'wanted', klein: 'Weg uit beeld', titel: 'Vrij', regelNl: 'De politie ziet je niet meer.', sterren: 0 };
  return { soort: 'wanted', klein: 'Minder gezocht', titel: 'Rustiger', regelNl: 'De politie zoekt minder naar je.', sterren: nu };
}

// Opgepakt (busted: a fine) or buiten westen (down: a hospital bill); money is the amount lost.
export function momentVanOpgepakt({ busted = false, geld = 0 } = {}) {
  if (busted) return { soort: 'opgepakt', beloning: -Math.abs(geld || 0) };
  return { soort: 'opgepakt', klein: 'Neergegaan', titel: 'Buiten westen', regelNl: 'Je bent opgelapt in het ziekenhuis.', beloningLabel: 'Rekening', beloning: -Math.abs(geld || 0) };
}

// A first visit to a district, village or the surrounding land: the place is the print.
export function momentVanGebied(naam, regel = '') {
  return { soort: 'gebied', titel: naam, regelNl: regel || undefined };
}

// Flash gate: how many appearances (anything that pops on screen) began in the last second.
export function toelatenFlits(historie, nu, max = MAX_FLITS_PER_S) {
  return historie.filter((t) => nu - t < 1000).length < max;
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

// ---------------------------------------------------------------------------------------- DOM

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
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
}

function sterrenHtml(n) {
  if (n == null) return '';
  // shape plus count, never colour alone: a filled star, a halftone-dotted outline for an empty one
  let h = '';
  for (let i = 0; i < 5; i++) h += `<i class="bm-ster${i < n ? ' aan' : ''}" aria-hidden="true"></i>`;
  return `<span class="bm-sterren">${h}</span>`;
}

function binnenHtml(m) {
  const meta = [];
  if (m.beloning) meta.push(`<span class="bm-meta-i"><b>${esc(m.beloningLabel)}</b> ${esc(m.beloning)}</span>`);
  if (m.tijd) meta.push(`<span class="bm-meta-i"><b>Tijd</b> ${esc(m.tijd)}</span>`);
  const metaHtml = meta.length ? `<div class="bm-meta">${meta.join('')}</div>` : '';
  const kop = `<div class="bm-kop">${esc(m.kop)}</div>`;
  const regel = `<p class="bm-regel">${esc(m.regelNl)}</p>`;
  if (m.vorm === 'band') return `<div class="bm-dim"></div><div class="bm-band"><span class="bm-klein">${esc(m.klein)}</span>${kop}${regel}${metaHtml}</div>`;
  if (m.vorm === 'stempel') return `<div class="bm-dim"></div><div class="bm-slip"><span class="bm-klein">${esc(m.klein)}</span>${regel}${metaHtml}<div class="bm-stempel" aria-hidden="true">${esc(m.kop)}</div></div>`;
  if (m.vorm === 'plaats') return `<div class="bm-kaart"><span class="bm-klein">${esc(m.klein)}</span>${kop}${regel}<div class="bm-zegel" aria-hidden="true"></div></div>`;
  return `<div class="bm-tag"><span class="bm-klein">${esc(m.klein)}</span>${sterrenHtml(m.sterren)}<span class="bm-kop">${esc(m.kop)}</span><span class="bm-regel">${esc(m.regelNl)}</span></div>`;
}

function toonNu(m, klaarCb) {
  ensureCss();
  const el = document.createElement('div');
  el.className = `bm bm-${m.vorm} bm-${m.soort}`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', m.vorm === 'rand' ? 'polite' : 'assertive');
  el.setAttribute('aria-label', m.aria);
  el.innerHTML = binnenHtml(m);
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('aan'));
  if (m.vorm === 'rand') { if (randActief) randActief.remove(); randActief = el; } else actief = el;
  const weg = () => {
    el.classList.remove('aan');
    el.classList.add('uit');
    setTimeout(() => { el.remove(); if (m.vorm === 'rand' ? randActief === el : actief === el) { if (m.vorm === 'rand') randActief = null; else actief = null; } klaarCb(); }, 450);
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
