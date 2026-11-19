// De REGELWIDGET (#987-vervolg, "Uitleg met iconen en animaties"): een klein HUD-element dat een regel van een
// missie, minigame of mechaniek live toont met een icoon en een korte animatie, zodat er geen zin voor nodig is.
// Het voorbeeld is de eierrit van M09: de snelheidsmeter met de limiet en de waarschuwingszone, de eieren als
// icoontjes die breken, en het gevolg direct zichtbaar. Zie docs/UITLEG-MET-ICONEN.md voor het patroon en de lijst
// van plekken waar het nog moet komen.
//
// Twee lagen:
//   1. PUUR (geen DOM): per type een functie staat -> vorm (de getallen, de stand, de tekst en de aria-gegevens)
//      en een goedkope sleutel. Lege of NaN-invoer geeft een verborgen vorm, nooit een kapotte widget.
//   2. DUN (alleen in de browser): maakWidget(type, parent) bouwt het element één keer en schrijft alleen als de
//      sleutel verandert. Beweging is CSS (transform/opacity); met 'reduce motion' staat alles stil en staat
//      het tekstalternatief in beeld.
//
// Types: limiet (a), teller (b), voorraad (c), wijzer (d), timing (e), toets (f), stappen (g).
// Samen spelen: elke speler ziet zijn eigen widget van zijn eigen staat; de widget schrijft nooit naar de wereld.
//   node scripts/regelwidget_test.mjs

export const TYPES = ['limiet', 'teller', 'voorraad', 'wijzer', 'timing', 'toets', 'stappen'];

// De ruimte van de raakzone van een timingbalk (#957): nooit smaller dan een vijfde van de balk.
export const MIN_ZONE = 0.2;
export const MAX_VOORRAAD = 10;

const eindig = (v, d = 0) => (Number.isFinite(v) ? v : d);
const klem = (v, a = 0, b = 1) => Math.min(b, Math.max(a, eindig(v, a)));
const rond = (v) => Math.round(eindig(v));
const getal = (v) => String(rond(v));
const woorden = (a) => a.length > 1 ? `${a.slice(0, -1).join(', ')} en ${a[a.length - 1]}` : a.join('');
const leeg = (type) => ({ type, key: '', verborgen: true, stand: 'ok', tekst: '', alt: '', melding: '', anim: 'geen', aria: null });
const aria = (role, label, extra) => Object.assign({ role, label }, extra);

// ---- a. limietmeter: snelheid, lading, geluid, heat met een drempel en een waarschuwingszone ----------------
// inv: { waarde, limiet, marge = 2, max, eenheid = 'km/u', label = 'Snelheid', icoon = 'meter' }
// De waarschuwing begint `marge` onder de limiet, ruim voor het misgaat (zoals eggSpeedWarning).
export function limietVorm(inv, opt = {}) {
  const limiet = inv && inv.limiet;
  if (!(Number.isFinite(limiet) && limiet > 0)) return leeg('limiet');
  const marge = Number.isFinite(inv.marge) && inv.marge >= 0 ? inv.marge : 2;
  const eenheid = inv.eenheid || 'km/u';
  const label = inv.label || 'Snelheid';
  const waarde = Math.max(0, eindig(inv.waarde));
  const max = Number.isFinite(inv.max) && inv.max > limiet ? inv.max : limiet * 1.25;
  const stand = waarde >= limiet ? 'over' : waarde >= limiet - marge ? 'let-op' : 'ok';
  const woord = stand === 'over' ? 'te snel' : stand === 'let-op' ? 'rustig aan' : '';
  const tekst = `${getal(waarde)} / ${getal(limiet)} ${eenheid}`;
  const alt = `${label} ${getal(waarde)} van maximaal ${getal(limiet)} ${eenheid}${woord ? ', ' + woord : ''}`;
  const reduce = !!opt.reduce;
  const vul = Math.round(klem(waarde / max) * 100);
  return {
    type: 'limiet', verborgen: false, stand, tekst, alt, icoon: inv.icoon || 'meter', woord,
    vul, warnVan: Math.round(klem((limiet - marge) / max) * 100), limietBij: Math.round(klem(limiet / max) * 100),
    melding: stand === 'over' ? `${label} boven het maximum van ${getal(limiet)} ${eenheid}` : stand === 'let-op' ? `${label}: rustig aan` : '',
    anim: reduce ? 'geen' : stand === 'over' ? 'schud' : stand === 'let-op' ? 'knipper' : 'geen',
    key: `l|${stand}|${vul}|${tekst}|${reduce ? 1 : 0}|${inv.icoon || ''}`,
    aria: aria('meter', label, { min: 0, max: rond(max), now: rond(waarde), valuetext: alt }),
  };
}

// ---- b. tellerring / countdown: tijd of kans --------------------------------------------------------------
// inv: { rest, totaal, eenheid = 's' | '%' | ..., label = 'Tijd', laag = 0.25, kritiek = 0.1 }
export function tellerVorm(inv, opt = {}) {
  const totaal = inv && inv.totaal;
  if (!(Number.isFinite(totaal) && totaal > 0) || !Number.isFinite(inv.rest)) return leeg('teller');
  const eenheid = inv.eenheid || 's';
  const label = inv.label || 'Tijd';
  const rest = Math.max(0, Math.min(totaal, inv.rest));
  const deel = rest / totaal;
  const laag = Number.isFinite(inv.laag) ? inv.laag : 0.25;
  const kritiek = Number.isFinite(inv.kritiek) ? inv.kritiek : 0.1;
  const stand = deel <= kritiek ? 'kritiek' : deel <= laag ? 'laag' : 'ok';
  const s = Math.ceil(rest);
  const tekst = eenheid === 's' ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${getal(rest)} ${eenheid}`;
  const alt = eenheid === 's' ? `${label}: nog ${s} seconden` : `${label}: ${getal(rest)} ${eenheid}`;
  const reduce = !!opt.reduce;
  const streep = Math.round(deel * 100);
  return {
    type: 'teller', verborgen: false, stand, tekst, alt, streep,
    melding: stand === 'kritiek' ? `${label} bijna op` : '',
    anim: reduce ? 'geen' : stand === 'kritiek' ? 'knipper' : 'geen',
    key: `t|${stand}|${streep}|${tekst}|${reduce ? 1 : 0}`,
    aria: aria('timer', label, { min: 0, max: rond(totaal), now: rond(rest), valuetext: alt }),
  };
}

// ---- c. voorraad / levens: eieren, pakjes, levens die breken of vol raken ----------------------------------
// inv: { heel, totaal, icoon = 'ei', label = 'Eieren', max = 10 }. Bij meer dan `max` stukken staat elk icoon
// voor een groep; de tekst noemt altijd het echte aantal.
export function voorraadVorm(inv, opt = {}) {
  const totaal = inv && inv.totaal;
  if (!(Number.isFinite(totaal) && totaal > 0) || !Number.isFinite(inv.heel)) return leeg('voorraad');
  const heel = Math.round(klem(inv.heel, 0, totaal));
  const label = inv.label || 'Eieren';
  const icoon = inv.icoon || 'ei';
  const n = Math.min(Math.round(totaal), Math.max(1, Math.min(MAX_VOORRAAD, inv.max | 0 || MAX_VOORRAAD)));
  let hele = Math.round(heel / totaal * n);
  if (heel > 0 && hele === 0) hele = 1;
  if (heel < totaal && hele === n) hele = n - 1;
  const procent = heel / totaal;
  const stand = heel === 0 ? 'leeg' : procent <= 0.4 ? 'kritiek' : procent <= 0.7 ? 'laag' : 'ok';
  const tekst = `${heel} / ${rond(totaal)}`;
  const alt = `${label}: ${heel} van ${rond(totaal)} heel`;
  const reduce = !!opt.reduce;
  return {
    type: 'voorraad', verborgen: false, stand, tekst, alt, icoon, n, hele,
    melding: stand === 'kritiek' || stand === 'leeg' ? alt : '',
    anim: reduce ? 'geen' : 'breek', // het icoon dat net stuk ging krijgt eenmalig een korte schok
    key: `v|${icoon}|${n}|${hele}|${tekst}|${reduce ? 1 : 0}`,
    aria: aria('meter', label, { min: 0, max: rond(totaal), now: heel, valuetext: alt }),
  };
}

// ---- d. richting- en afstandwijzer naar het doel met afstandsringen ----------------------------------------
// inv: { afstand (m), hoek (radialen t.o.v. waar je naar kijkt, rechtsom positief), ringen = [50, 150, 400], label = 'Doel' }
const KANTEN = ['voor', 'rechts voor', 'rechts', 'rechts achter', 'achter', 'links achter', 'links', 'links voor'];
export function wijzerVorm(inv, opt = {}) {
  if (!inv || !Number.isFinite(inv.afstand) || !Number.isFinite(inv.hoek)) return leeg('wijzer');
  const afstand = Math.max(0, inv.afstand);
  const ringen = Array.isArray(inv.ringen) && inv.ringen.length ? inv.ringen : [50, 150, 400];
  const label = inv.label || 'Doel';
  let graden = (inv.hoek * 180 / Math.PI) % 360;
  if (graden > 180) graden -= 360;
  if (graden <= -180) graden += 360;
  const gr = Math.round(graden / 5) * 5; // 5 graden is genoeg: minder schrijven
  const kant = KANTEN[Math.round((((gr % 360) + 360) % 360) / 45) % 8];
  let ring = ringen.length; // 0 = binnen de kleinste ring (bijna ter plaatse)
  for (let i = 0; i < ringen.length; i++) if (afstand <= ringen[i]) { ring = i; break; }
  const tekst = afstand >= 1000 ? `${(afstand / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(afstand / 5) * 5} m`;
  const alt = `${label}: ${tekst}, ${kant}`;
  const reduce = !!opt.reduce;
  return {
    type: 'wijzer', verborgen: false, stand: ring === 0 ? 'dichtbij' : 'ok', tekst, alt, graden: gr, ring, ringen: ringen.length, kant,
    melding: '', anim: reduce ? 'geen' : ring === 0 ? 'knipper' : 'geen',
    key: `w|${gr}|${ring}|${tekst}|${reduce ? 1 : 0}`,
    aria: aria('img', label, { valuetext: alt }),
  };
}

// ---- e. timingbalk met raakzone (de heen-en-weer-balk) -----------------------------------------------------
// inv: { naald (0..1), van, tot (0..1), label = 'Timing' }. De zone is nooit smaller dan MIN_ZONE (#957).
export function timingVorm(inv, opt = {}) {
  if (!inv || !Number.isFinite(inv.naald) || !Number.isFinite(inv.van) || !Number.isFinite(inv.tot)) return leeg('timing');
  let van = klem(Math.min(inv.van, inv.tot));
  let tot = klem(Math.max(inv.van, inv.tot));
  if (tot - van < MIN_ZONE) {
    const mid = (van + tot) / 2;
    van = klem(mid - MIN_ZONE / 2, 0, 1 - MIN_ZONE);
    tot = van + MIN_ZONE;
  }
  const naald = klem(inv.naald);
  const erin = naald >= van && naald <= tot;
  const label = inv.label || 'Timing';
  const tekst = erin ? 'Nu!' : 'Wacht';
  const alt = `${label}: ${erin ? 'de streep staat in de zone' : 'de streep staat buiten de zone'}`;
  const reduce = !!opt.reduce;
  const n = Math.round(naald * 100);
  return {
    type: 'timing', verborgen: false, stand: erin ? 'raak' : 'ok', tekst, alt, naald: n, van: Math.round(van * 100), tot: Math.round(tot * 100),
    melding: '', anim: reduce ? 'geen' : 'beweeg',
    key: `m|${n}|${Math.round(van * 100)}|${Math.round(tot * 100)}|${reduce ? 1 : 0}`,
    aria: aria('meter', label, { min: 0, max: 100, now: n, valuetext: alt }),
  };
}

// ---- f. toets-glyph met een korte lus van de handeling -----------------------------------------------------
// inv: { toetsen: ['A', 'D'], handeling: 'houd' | 'tik' | 'draai', label }
const HANDELING = {
  houd: { kort: 'vasthouden', zin: (t) => `Houd ${t} ingedrukt` },
  tik: { kort: 'tikken', zin: (t) => `Tik op ${t}` },
  draai: { kort: 'draaien', zin: (t) => `Draai met ${t}` },
};
export function toetsVorm(inv, opt = {}) {
  const toetsen = inv && Array.isArray(inv.toetsen) ? inv.toetsen.filter((t) => typeof t === 'string' && t) : [];
  if (!toetsen.length) return leeg('toets');
  const h = HANDELING[inv.handeling] ? inv.handeling : 'tik';
  const t = woorden(toetsen);
  const alt = inv.label ? `${inv.label}: ${HANDELING[h].zin(t)}` : HANDELING[h].zin(t);
  const reduce = !!opt.reduce;
  return {
    type: 'toets', verborgen: false, stand: 'ok', tekst: HANDELING[h].kort, alt, toetsen, handeling: h,
    melding: '', anim: reduce ? 'geen' : h,
    key: `k|${h}|${toetsen.join('+')}|${reduce ? 1 : 0}`,
    aria: aria('status', alt),
  };
}

// ---- g. stap voor stap: "eerst dit, dan dat" met twee of drie iconen en een lijn -----------------------------
// inv: { stappen: [{ icoon, label, waarde }], klaar (aantal gedaan), verberg = false, modus: 'stappen' | 'legenda', label }
// verberg: toekomstige stappen tonen alleen hun nummer (een geheugenspel verklapt de volgorde niet).
// legenda: geen volgorde, alleen icoon + waarde ("parasol +160"), voor "wat levert punten op".
export function stappenVorm(inv, opt = {}) {
  const stappen = inv && Array.isArray(inv.stappen) ? inv.stappen.filter((s) => s && typeof s === 'object') : [];
  if (!stappen.length) return leeg('stappen');
  const legenda = inv.modus === 'legenda';
  const klaar = Math.round(klem(inv.klaar, 0, stappen.length));
  const n = stappen.length;
  const label = inv.label || (legenda ? 'Wat levert wat op' : 'Stappen');
  const lijst = stappen.map((s, i) => ({
    icoon: s.icoon || '', waarde: s.waarde == null ? '' : String(s.waarde),
    label: !legenda && inv.verberg && i > klaar ? '?' : String(s.label || ''),
    stand: legenda ? 'nu' : i < klaar ? 'klaar' : i === klaar ? 'nu' : 'straks',
  }));
  const alt = legenda
    ? `${label}: ${lijst.map((s) => `${s.label} ${s.waarde}`.trim()).join(', ')}`
    : klaar >= n ? `${label}: alles gedaan` : `${label}: stap ${klaar + 1} van ${n}, ${lijst[klaar].label === '?' ? 'nog onbekend' : lijst[klaar].label}`;
  const reduce = !!opt.reduce;
  return {
    type: 'stappen', verborgen: false, stand: klaar >= n ? 'klaar' : 'ok', tekst: legenda ? '' : `${Math.min(klaar + 1, n)} / ${n}`, alt, lijst, klaar, modus: legenda ? 'legenda' : 'stappen',
    melding: '', anim: reduce ? 'geen' : 'volg',
    key: `s|${legenda ? 'g' : 's'}|${klaar}|${lijst.map((s) => s.icoon + s.label + s.waarde).join(',')}|${reduce ? 1 : 0}`,
    aria: aria('status', alt),
  };
}

export const VORMEN = { limiet: limietVorm, teller: tellerVorm, voorraad: voorraadVorm, wijzer: wijzerVorm, timing: timingVorm, toets: toetsVorm, stappen: stappenVorm };
export function vorm(type, inv, opt) {
  const f = VORMEN[type];
  return f ? f(inv, opt) : leeg(String(type));
}

// ---- iconen: kleine vormen op 24x24, fill = currentColor; `stuk` is de barst die over een gebroken icoon valt ---------
export const ICONEN = {
  ei: '<path d="M12 2.5c-3.6 0-6.5 5.2-6.5 10a6.5 6.5 0 0 0 13 0c0-4.8-2.9-10-6.5-10z"/>',
  pakje: '<path d="M3 8h18v12H3z"/><path d="M3 8l2-4h14l2 4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.5 8h3v12h-3z" fill="none" stroke="var(--rw-gat, #0c140e)" stroke-width="1.6"/>',
  hart: '<path d="M12 21s-8.5-5.4-8.5-11A4.8 4.8 0 0 1 12 7.2 4.8 4.8 0 0 1 20.5 10c0 5.6-8.5 11-8.5 11z"/>',
  parasol: '<path d="M2.5 12a9.5 9.5 0 0 1 19 0z"/><path d="M12 12v8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.5 20.5h5" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  kliko: '<path d="M5 8h14l-1.4 13H6.4z"/><path d="M4 5h16v2H4z"/><path d="M9 5l1-2h4l1 2z"/>',
  stoepbord: '<path d="M12 3L4.5 21h2l1.6-4h7.8l1.6 4h2z"/><path d="M9 14h6" fill="none" stroke="var(--rw-gat, #0c140e)" stroke-width="1.6"/>',
  hand: '<path d="M8 21v-7L6 11.5a1.5 1.5 0 0 1 2.3-1.9L9 10.5V4.5a1.5 1.5 0 0 1 3 0V10l.5-5a1.5 1.5 0 0 1 3 .3L15 10l1-3.2a1.5 1.5 0 0 1 2.9.8L18 14c-.4 2.6-1.5 4-2.5 5.2V21z"/>',
  auto: '<path d="M3 15l1.6-5.2A2 2 0 0 1 6.5 8.4h11a2 2 0 0 1 1.9 1.4L21 15v3h-2.5v-1.5h-13V18H3z"/><circle cx="7.5" cy="14" r="1.1" fill="var(--rw-gat, #0c140e)"/><circle cx="16.5" cy="14" r="1.1" fill="var(--rw-gat, #0c140e)"/>',
  meter: '<path d="M3 17a9 9 0 1 1 18 0" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 17l4-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  klok: '<circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8.5V13l3 2M9.5 2.5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  zout: '<path d="M8 9h8l1 12H7z"/><path d="M8 9a4 4 0 0 1 8 0z"/>',
  meel: '<path d="M7 7h10l2 14H5z"/><path d="M9 7l1.5-3h3L15 7z"/>',
  vet: '<path d="M12 3c3.4 4.4 6 7.4 6 11a6 6 0 0 1-12 0c0-3.6 2.6-6.6 6-11z"/>',
  mosterd: '<path d="M9 21V10l1.5-3h3L15 10v11z"/><path d="M11 7V3h2v4z"/>',
  bloem: '<path d="M12 21V8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9c-3 0-4-3-4-5 3 0 4 2 4 5zm0 0c3 0 4-3 4-5-3 0-4 2-4 5zm0 5c-3 0-4-3-4-5 3 0 4 2 4 5zm0 0c3 0 4-3 4-5-3 0-4 2-4 5z"/>',
  pijl: '<path d="M12 2.5l6.5 12H13v7h-2v-7H5.5z"/>',
  stuk: '<path d="M12 4l-2.5 5 3.5 2.5-3 4 2.5 4" fill="none" stroke="var(--rw-gat, #0c140e)" stroke-width="1.8" stroke-linejoin="round"/>',
};
export const iconSvg = (naam, extra = '') => `<svg class="rw-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONEN[naam] || ICONEN.pakje}${extra}</svg>`;

// ===== DUNNE DOM-LAAG (alleen in de browser) ==========================================================================
let aankondiger = null;
// hud_panel.js zet hier zijn schermnarratie in (#802); zonder aankondiger blijft de widget stil voor de narratie.
export function zetAankondiger(fn) { aankondiger = typeof fn === 'function' ? fn : null; }

let toetsRenderer = (t) => `<kbd class="rw-key" data-gk="${String(t).replace(/[&<>"]/g, '')}">${String(t).replace(/[&<>"]/g, '')}</kbd>`;
// de HUD kan hier glyphHtml (prompts.js) in zetten, zodat de toets de herbinding volgt
export function zetToetsRenderer(fn) { if (typeof fn === 'function') toetsRenderer = fn; }

const reduceNu = () => typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion');
let cssGeladen = false;
function laadCss() {
  if (cssGeladen || typeof document === 'undefined') return;
  cssGeladen = true;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = new URL('./regelwidget.css', import.meta.url).href;
  document.head.appendChild(l);
}

const RING = '<svg class="rw-ring" viewBox="0 0 40 40" aria-hidden="true"><circle class="rw-ring-bg" cx="20" cy="20" r="16"/><circle class="rw-ring-vul" cx="20" cy="20" r="16" pathLength="100"/></svg>';

function bouw(type, root) {
  switch (type) {
    case 'limiet':
      root.innerHTML = '<span class="rw-icoon"></span><div class="rw-balk"><i class="rw-vul"></i><s class="rw-warn"></s><s class="rw-lim"></s></div><b class="rw-tekst"></b><span class="rw-woord"></span>';
      return { icoon: root.firstChild, vul: root.querySelector('.rw-vul'), warn: root.querySelector('.rw-warn'), lim: root.querySelector('.rw-lim'), tekst: root.querySelector('.rw-tekst'), woord: root.querySelector('.rw-woord') };
    case 'teller':
      root.innerHTML = RING + '<b class="rw-tekst"></b>';
      return { vul: root.querySelector('.rw-ring-vul'), tekst: root.querySelector('.rw-tekst') };
    case 'voorraad':
      root.innerHTML = '<span class="rw-rij"></span><b class="rw-tekst"></b>';
      return { rij: root.firstChild, tekst: root.querySelector('.rw-tekst'), n: 0, icoon: '', hele: -1 };
    case 'wijzer':
      root.innerHTML = '<span class="rw-rozet"><svg class="rw-ringen" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18"/><circle cx="20" cy="20" r="12"/><circle cx="20" cy="20" r="6"/></svg><span class="rw-pijl">' + iconSvg('pijl') + '</span></span><b class="rw-tekst"></b><span class="rw-woord"></span>';
      return { pijl: root.querySelector('.rw-pijl'), tekst: root.querySelector('.rw-tekst'), woord: root.querySelector('.rw-woord') };
    case 'timing':
      root.innerHTML = '<div class="rw-spoor"><s class="rw-zone"></s><i class="rw-naald"></i></div><b class="rw-tekst"></b>';
      return { zone: root.querySelector('.rw-zone'), naald: root.querySelector('.rw-naald'), tekst: root.querySelector('.rw-tekst') };
    case 'toets':
      root.innerHTML = '<span class="rw-toetsen"></span><svg class="rw-draai" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.5-5.8M20 3v4h-4"/></svg><b class="rw-tekst"></b>';
      return { toetsen: root.firstChild, tekst: root.querySelector('.rw-tekst') };
    default: // stappen
      root.innerHTML = '<ol class="rw-lijst"></ol><b class="rw-tekst"></b>';
      return { lijst: root.firstChild, tekst: root.querySelector('.rw-tekst'), n: 0, sig: '' };
  }
}

function pas(w, v) {
  const e = w.e;
  const t = w.type;
  if (e.tekst && e.tekst.textContent !== v.tekst) e.tekst.textContent = v.tekst;
  if (t === 'limiet') {
    e.vul.style.setProperty('--rw-p', v.vul / 100);
    e.warn.style.left = v.warnVan + '%'; e.warn.style.width = Math.max(0, v.limietBij - v.warnVan) + '%';
    e.lim.style.left = v.limietBij + '%';
    if (e.icoon.dataset.i !== v.icoon) { e.icoon.dataset.i = v.icoon; e.icoon.innerHTML = iconSvg(v.icoon); }
    if (e.woord.textContent !== v.woord) e.woord.textContent = v.woord;
  } else if (t === 'teller') {
    e.vul.style.strokeDasharray = v.streep + ' 100';
  } else if (t === 'voorraad') {
    if (e.n !== v.n || e.icoon !== v.icoon) {
      e.n = v.n; e.icoon = v.icoon; e.hele = -1;
      let h = '';
      for (let i = 0; i < v.n; i++) h += `<span class="rw-stuk" data-s="heel">${iconSvg(v.icoon, BARST)}</span>`;
      e.rij.innerHTML = h;
    }
    const kids = e.rij.children;
    const eerder = e.hele < 0 ? v.hele : e.hele;
    for (let i = 0; i < kids.length; i++) {
      const stuk = i >= v.hele;
      const nu = stuk ? 'stuk' : 'heel';
      if (kids[i].dataset.s !== nu) {
        kids[i].dataset.s = nu;
        if (stuk && i < eerder && v.anim === 'breek') { kids[i].classList.remove('rw-breekt'); void kids[i].offsetWidth; kids[i].classList.add('rw-breekt'); }
      }
    }
    e.hele = v.hele;
  } else if (t === 'wijzer') {
    e.pijl.style.setProperty('--rw-hoek', v.graden + 'deg');
    e.woord.textContent = v.kant;
  } else if (t === 'timing') {
    e.zone.style.left = v.van + '%'; e.zone.style.width = (v.tot - v.van) + '%';
    e.naald.style.setProperty('--rw-p', v.naald / 100);
  } else if (t === 'toets') {
    e.toetsen.innerHTML = v.toetsen.map((k) => toetsRenderer(k)).join('');
  } else {
    const sig = v.lijst.map((s) => s.icoon).join(',') + '|' + v.modus;
    if (sig !== e.sig) {
      e.sig = sig;
      e.lijst.innerHTML = v.lijst.map((s) => `<li>${s.icoon ? iconSvg(s.icoon) : '<span class="rw-nr"></span>'}<span class="rw-l"></span><b class="rw-w"></b></li>`).join('');
    }
    const kids = e.lijst.children;
    for (let i = 0; i < kids.length; i++) {
      const s = v.lijst[i];
      kids[i].dataset.s = s.stand;
      const nr = kids[i].querySelector('.rw-nr');
      if (nr) nr.textContent = String(i + 1);
      kids[i].querySelector('.rw-l').textContent = s.label;
      kids[i].querySelector('.rw-w').textContent = s.waarde;
    }
  }
}
const BARST = `<g class="rw-barst">${ICONEN.stuk}</g>`;

// Bouwt één widget in `parent`. w.inv is het schrijfvlak: de aanroeper zet er zijn getallen in (zonder nieuw object
// per beeld) en roept w.ververs() aan. Alleen als de sleutel verandert wordt de DOM aangeraakt.
export function maakWidget(type, parent, inv = {}) {
  if (typeof document === 'undefined' || !VORMEN[type]) return null;
  laadCss();
  const root = document.createElement('div');
  root.className = `rw rw-${type}`;
  root.hidden = true;
  const w = { type, root, inv, key: '\0', stand: 'ok', e: bouw(type, root) };
  const alt = document.createElement('span');
  alt.className = 'rw-alt'; // zichtbaar bij 'reduce motion': het tekstalternatief in plaats van de beweging
  root.appendChild(alt);
  w.alt = alt;
  parent.appendChild(root);
  w.ververs = () => {
    const reduce = reduceNu();
    // goedkope sleutelcontrole eerst: de vorm (en zijn objecten) wordt alleen op een wijziging gebouwd
    const v = VORMEN[type](w.inv, { reduce });
    if (v.key === w.key) return false;
    w.key = v.key;
    if (v.verborgen) {
      if (!root.hidden) root.hidden = true;
      root.removeAttribute('role'); root.removeAttribute('aria-label');
      w.stand = 'ok';
      return true;
    }
    root.hidden = false;
    root.dataset.stand = v.stand;
    root.dataset.anim = v.anim;
    if (v.modus) root.dataset.modus = v.modus;
    if (v.handeling) root.dataset.handeling = v.handeling;
    root.classList.toggle('rw-statisch', reduce);
    const a = v.aria;
    root.setAttribute('role', a.role);
    root.setAttribute('aria-label', a.label);
    for (const k of ['min', 'max', 'now']) {
      if (a[k] == null) root.removeAttribute('aria-value' + k); else root.setAttribute('aria-value' + k, String(a[k]));
    }
    if (a.valuetext) root.setAttribute('aria-valuetext', a.valuetext); else root.removeAttribute('aria-valuetext');
    if (w.alt.textContent !== v.alt) w.alt.textContent = v.alt;
    pas(w, v);
    if (v.melding && v.stand !== w.stand && aankondiger) aankondiger(v.melding);
    w.stand = v.stand;
    return true;
  };
  w.verberg = () => { if (!root.hidden) { w.key = '\0'; root.hidden = true; } };
  w.verwijder = () => { if (root.parentNode) root.parentNode.removeChild(root); };
  return w;
}
