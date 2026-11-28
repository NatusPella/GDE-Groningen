// Boerderij > Velden en Team (ontwerp docs/ontwerp/BEZIT-UI-24-11.md, onderdeel c): links de kaart met de kleurtaal van de velden en de lijst met vinkvakken,
// rechts het detail met de groeifasen, de gele hoofdactie en de keuzes Wie werkt hier, Volgend gewas, Team en Verzekering; bij meerdere gekozen velden de
// bulkacties. De HTML komt uit pure functies (scripts/bezitvelden_test.mjs); de knoppen dragen data-vd en worden in bezitui.veldenActie afgehandeld.
// Land is een presentatie-adapter: de Zonnehoek-percelen staan al in bezit.parcels (vlag lg), dus één lijst. Samen spelen: eigen bezit (#429); een gast ziet
// bij het werk in de wereld "Zet op de kaart" in plaats van Oogsten met de trekker (gast = true).

import { icoon } from './icons.js';
import { euro } from './geldtekst.js';
import * as B from './boerderij.js';
import { leaseOutPerDay } from './bezitprijs.js';
import { kaartSvg, legendaHtml } from './bezitkaart.js';
import { SPECIES, herdOffers, herdSellValue, vetCost } from './livestock.js';
import { staffOf, staffCapacity, wageOf, SKILL_NAME } from './farmstaff.js';
import { missReason } from './holdingcards.js';
import { escapeHtml as esc } from './htmlescape.js';

// De kadastrale code tussen haakjes (K1244) is een sleutel, geen naam: de speler leest hem niet.
export const schoneNaam = (n) => String(n || '').replace(/\s*\([A-Za-z]?\d+\)\s*$/, '');
const IC = (n, cls = 'bz-ic') => icoon(n, { cls });
const ha = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
const LEVEL_NAAM = { self: 'Zelf', staff: 'Personeel', leased: 'Verpacht' };
const FASE_VAN = { braak: 0, stoppel: 0, geploegd: 0, zaailing: 1, groeiend: 2, bijna: 2, rijp: 3 };
const FASEN = [['Zaaien', 'zaaien'], ['Kiemen', 'blad'], ['Groeien', 'gewas'], ['Rijp', 'oogst'], ['Oogsten', 'schaar']];
const ICOON_VAN = { braak: 'veld_braak', stoppel: 'veld_stoppel', geploegd: 'veld_geploegd', zaailing: 'veld_zaailing', groeiend: 'veld_groeiend', bijna: 'veld_bijna', rijp: 'veld_rijp' };
export const SORT_NAAM = { ripe: 'oogst eerst', name: 'naam', ha: 'grootte', income: 'opbrengst', region: 'streek' };

export const faseIndex = (r) => (r.herd ? -1 : FASE_VAN[r.statusId] ?? 0);

export function fasenHtml(r) {
  const nu = faseIndex(r);
  if (nu < 0) return '';
  return `<ol class="bz-fasen" aria-label="Groeifasen">${FASEN.map(([t, ic], i) => `<li class="${i < nu ? 'is-klaar' : i === nu ? 'is-nu' : 'is-later'}"><i>${i < nu ? IC('vinkje') : IC(ic)}</i><b>${t}</b><small>${i === nu ? (r.ripe ? 'nu' : r.groei > 0 ? `${Math.round(r.groei * 100)}%` : 'nu') : i < nu ? 'klaar' : ''}</small></li>`).join('')}</ol>`;
}

const segment = (naam, opties, actief) => `<div class="ds-z-segment ds-z-segment--blok" role="radiogroup" aria-label="${esc(naam)}">${opties.map(([id, t, sub, extra]) => `<button type="button" role="radio" aria-checked="${id === actief}" ${extra || ''}>${esc(t)}${sub ? `<small>${esc(sub)}</small>` : ''}</button>`).join('')}</div>`;
const tussen = (t, ic) => `<h4 class="ds-z-tussenkop"><span>${esc(t)}</span>${ic ? IC(ic) : ''}</h4>`;
const stapper = (label, waarde, soort) => `<span class="ds-z-stapper"><button type="button" data-vd="${soort}" data-dir="-1" aria-label="${esc(label)}: vorige">${IC('pijl_links')}</button><output>${esc(label)} <b>${esc(waarde)}</b></output><button type="button" data-vd="${soort}" data-dir="1" aria-label="${esc(label)}: volgende">${IC('pijl_rechts')}</button></span>`;

// ---- de lijst links ----
export function rijHtml(r, { sel, vink }) {
  const klasse = r.herd ? (r.herd.sick > 0 ? 'probleem' : 'groeit') : r.ripe ? 'rijp' : r.statusId === 'braak' || r.statusId === 'stoppel' ? 'braak' : 'groeit';
  const waarde = r.herd ? (r.herd.sick > 0 ? '<span class="ds-z-status ds-z-status--probleem">Ziek</span>' : `<b class="bz-getal">${r.herd.n}</b>`) : r.ripe ? '<span class="ds-z-status ds-z-status--goed">Oogstklaar</span>' : r.statusId === 'braak' ? '<span class="ds-z-status ds-z-status--zacht">Ligt braak</span>' : r.level === 'leased' ? '<span class="ds-z-status ds-z-status--zacht">Verpacht</span>' : `<b class="bz-getal">${Math.round(r.groei * 100)}%</b>`;
  const gewas = r.herd ? `${r.herd.n} ${SPECIES[r.herd.sp].naam.toLowerCase()}` : r.crop && B.GEWASSEN[r.crop] ? B.GEWASSEN[r.crop].naam : (r.statusId === 'braak' ? 'braak' : 'leeg');
  return `<div class="bz-rij${sel ? ' bz-rij--sel' : ''}" data-row="${esc(r.id)}" ${sel ? 'aria-current="true"' : ''}>` +
    `<button type="button" class="bz-vink${vink ? ' bz-vink--aan' : ''}" role="checkbox" aria-checked="${!!vink}" aria-label="Kies ${esc(schoneNaam(r.name))}" data-vd="vink" data-id="${esc(r.id)}">${vink ? IC('vinkje') : ''}</button>` +
    `<button type="button" class="bz-rij__knop" data-vd="kies" data-id="${esc(r.id)}"><span class="bz-ikoon bz-ikoon--${klasse}">${IC(r.herd ? 'koe' : ICOON_VAN[r.statusId] || 'veld_braak', 'bz-ic bz-ic--l')}</span>` +
    `<span class="bz-rij__tekst"><b>${esc(schoneNaam(r.name))}</b><small>${ha(r.ha)} ha · ${esc(gewas)} · ${LEVEL_NAAM[r.level]}</small></span><span class="bz-rij__waarde">${waarde}</span></button></div>`;
}

// ---- het detail rechts ----
function gebruikBlok(r, bezit, { n = 1, uitleg = '' } = {}) {
  const rec = (bezit.parcels || {})[r && r.id] || {};
  const pacht = r ? leaseOutPerDay(rec.p) : 0;
  const staff = r && r.level === 'staff' && r.incomeDay ? `+${euro(r.incomeDay)} per dag` : 'werkt na aanwijzing';
  return `<section class="bz-blok">${tussen('Wie werkt hier', 'spelers')}${segment('Gebruik', [
    ['self', 'Zelf', n > 1 ? `${n} velden` : 'jij, op het veld', 'data-vd="gebruik" data-mode="self"'],
    ['staff', 'Personeel', staff, 'data-vd="gebruik" data-mode="staff"'],
    ['leased', 'Verpacht', pacht > 0 ? `+${euro(pacht)} per dag` : 'levert pacht', 'data-vd="gebruik" data-mode="leased"']], r ? r.level : null)}${uitleg ? `<span class="bz-hulp">${esc(uitleg)}</span>` : ''}</section>`;
}

function gewasBlok(r) {
  if (r.herd) return '';
  const opties = Object.entries(B.GEWASSEN).filter(([, g]) => g.soort === r.soort || (r.soort === 'weiland' && g.soort === 'weiland'));
  if (opties.length < 2) return '';
  const huidig = r.plan || r.crop;
  return `<section class="bz-blok">${tussen('Volgend gewas', 'gewas')}${segment('Gewas', opties.map(([id, g]) => [id, g.naam, `${euro(g.prijsKg * 100)} per 100 kg`, `data-vd="gewas" data-g="${esc(id)}"`]), huidig)}</section>`;
}

function teamBlok(bezit, rows) {
  const st = staffOf(bezit), cap = staffCapacity(st);
  const op = rows.filter((x) => x.level === 'staff').reduce((s, x) => s + x.ha, 0);
  const pct = cap > 0 ? Math.min(100, Math.round((op / cap) * 100)) : 0;
  return `<section class="bz-blok">${tussen('Team', 'hart')}${st.workers.length ? `<div class="ds-z-balk" style="--ds-z-w:${pct}%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">${ha(op)} van ${ha(cap)} ha per dag bezet</span></div>` : '<span class="bz-hulp">Nog niemand in dienst.</span>'}` +
    `<button type="button" class="ds-z-link" data-bd="team">Team beheren</button></section>`;
}

function verzekeringBlok(r, bezit) {
  const gedekt = !!(bezit.parcels[r.id] && Number.isFinite(bezit.parcels[r.id].ins));
  return `<section class="bz-blok">${tussen('Verzekering', 'schild')}<div class="bz-rij-tussen"><span>Stortbui: <b>${gedekt ? 'gedekt' : 'niet gedekt'}</b></span>${gedekt ? `<button type="button" class="ds-z-knop ds-z-knop--secundair bz-klein" data-vd="verzeker" data-aan="0">Zeg op</button>` : `<button type="button" class="ds-z-knop ds-z-knop--secundair bz-klein" data-vd="verzeker" data-aan="1">Verzeker</button>`}</div><span class="bz-hulp">3 euro per ha per speldag; dekt 80% van het verlies, vanaf morgen.</span></section>`;
}

function keudeBlok(r, bezit, money, gast) {
  const herd = r.herd;
  if (herd) {
    const waarde = herdSellValue({ sp: herd.sp, n: herd.n });
    return `<section class="bz-blok">${tussen('Kudde', 'koe')}<dl class="bz-feiten"><dt>Dieren</dt><dd>${herd.n} ${SPECIES[herd.sp].naam.toLowerCase()}</dd><dt>Waarde</dt><dd>${euro(waarde)}</dd></dl>` +
      `<button type="button" class="ds-z-knop ds-z-knop--gevaar bz-klein" data-vd="verkoop-vee" data-id="${esc(r.id)}">Verkopen · ${euro(waarde)}</button></section>`;
  }
  const aanbod = r.kind === 'w' ? herdOffers(bezit, r.id, money) : [];
  if (!aanbod.length) return '';
  return `<section class="bz-blok">${tussen('Vee kopen', 'koe')}<div class="bz-acties">${aanbod.map((o) => { const reden = missReason(money, o.cost); return `<button type="button" class="ds-z-knop ds-z-knop--secundair bz-klein" data-vd="koop-vee" data-id="${esc(r.id)}" data-sp="${esc(o.sp)}"${reden ? ' disabled' : ''}>${esc(o.naam)} · ${o.n} · ${euro(o.cost)}${reden ? `<small>${esc(reden)}</small>` : ''}</button>`; }).join('')}</div></section>`;
}

// De hero: één gele knop, het volgende doel van dit veld.
function heroHtml(r, { money, gast, bezit }) {
  const naam = r.herd ? 'Kudde' : r.crop && B.GEWASSEN[r.crop] ? B.GEWASSEN[r.crop].naam : r.plan && B.GEWASSEN[r.plan] ? B.GEWASSEN[r.plan].naam : 'Geen gewas';
  let kop = '', actie = '', sub = '';
  if (r.herd && r.herd.sick > 0) {
    const kost = vetCost(bezit && bezit.x && bezit.x.herds ? bezit.x.herds[r.id] : { n: r.herd.n });
    kop = `1 van ${r.herd.n} dieren is ziek`; const reden = missReason(money, kost);
    actie = `<button type="button" class="ds-z-knop" data-vd="arts" data-id="${esc(r.id)}"${reden ? ' disabled' : ''}>Bel de dierenarts</button>`; sub = `${euro(kost)} · zonder arts raken er meer dieren ziek${reden ? ` · ${reden}` : ''}`;
  } else if (r.ripe && r.level === 'self') {
    kop = `${esc(naam)} · oogstklaar`;
    actie = gast ? `<button type="button" class="ds-z-knop" data-vd="kaart" data-id="${esc(r.id)}">Zet op de kaart</button>` : `<button type="button" class="ds-z-knop" data-vd="oogst">Oogsten</button>`;
    sub = gast ? 'Je speelt mee: de klus doe je in je eigen spel.' : `± ${r.expectedKg.toLocaleString('nl-NL')} kg`;
  } else if (!r.herd && r.level === 'self' && (r.statusId === 'braak' || r.statusId === 'stoppel' || r.statusId === 'geploegd')) {
    const g = B.GEWASSEN[r.plan] || null;
    kop = 'Dit veld ligt open';
    actie = g ? `<button type="button" class="ds-z-knop" data-vd="zaai">Zaai ${esc(g.naam.toLowerCase())}</button>` : '<span class="bz-hulp">Kies hieronder een gewas om te zaaien.</span>';
    sub = g ? `zaaigoed ± ${euro(g.zaaigoed * r.ha)}` : '';
  } else {
    kop = r.herd ? `${r.herd.n} ${SPECIES[r.herd.sp].naam.toLowerCase()}` : r.level === 'self' ? `${esc(naam)} groeit` : `Dit veld loopt via ${LEVEL_NAAM[r.level].toLowerCase()}`;
    actie = `<button type="button" class="ds-z-knop ds-z-knop--secundair" data-vd="kaart" data-id="${esc(r.id)}">Op de kaart</button>`;
  }
  return `<section class="bz-hero${r.herd && r.herd.sick > 0 ? ' bz-hero--probleem' : ''}">${tussen(kop)}${fasenHtml(r)}<div class="bz-actie">${actie}${sub ? `<span class="bz-hulp">${sub}</span>` : ''}</div></section>`;
}

function statusLabel(r) {
  if (r.herd && r.herd.sick > 0) return `<span class="ds-z-status ds-z-status--probleem">${IC('waarschuwing')}Zieke kudde</span>`;
  if (r.ripe) return `<span class="ds-z-status ds-z-status--goed">${IC('veld_rijp')}Oogstklaar</span>`;
  if (r.statusId === 'braak') return `<span class="ds-z-status ds-z-status--zacht">${IC('veld_braak')}Ligt braak</span>`;
  return '';
}

export function detailHtml(r, ctx) {
  const { bezit, rows, money = 0, gast = false } = ctx;
  return `<div class="bz-kopregel"><div><h3 class="bz-detail__titel">${esc(schoneNaam(r.name))}</h3><span class="bz-hulp">${r.soort === 'weiland' ? 'Weiland' : r.soort === 'boomgaard' ? 'Boomgaard' : 'Akker'} · ${ha(r.ha)} ha${r.region && r.region !== 'overig' ? ` · ${esc(r.region)}` : ''}</span></div>${statusLabel(r)}</div>` +
    heroHtml(r, { money, gast, bezit }) + `<div class="bz-raster2">${gebruikBlok(r, bezit)}${gewasBlok(r)}</div><div class="bz-raster2">${teamBlok(bezit, rows)}${verzekeringBlok(r, bezit)}</div>${keudeBlok(r, bezit, money, gast)}`;
}

// Bulk: meerdere velden gekozen.
export function bulkDetailHtml(sel, ctx) {
  const { bezit, money = 0 } = ctx;
  const rijp = sel.filter((x) => x.ripe && x.level === 'self'), open = sel.filter((x) => !x.herd && x.level === 'self' && ['braak', 'stoppel', 'geploegd'].includes(x.statusId) && B.GEWASSEN[x.plan]);
  const totHa = sel.reduce((s, x) => s + x.ha, 0);
  const zaaiKost = open.reduce((s, x) => s + B.GEWASSEN[x.plan].zaaigoed * x.ha, 0);
  return `<div class="bz-kopregel"><div><h3 class="bz-detail__titel">${sel.length} velden gekozen</h3><span class="bz-hulp">${ha(totHa)} ha</span></div><button type="button" class="ds-z-knop ds-z-knop--secundair bz-klein" data-vd="niets">Kies niets</button></div>` +
    `<section class="bz-hero">${tussen('Wat past nu op deze keuze')}<div class="bz-actie">${rijp.length ? `<button type="button" class="ds-z-knop" data-vd="oogst">Oogst ${rijp.length} ${rijp.length === 1 ? 'veld' : 'velden'}</button><span class="bz-hulp">± ${rijp.reduce((s, x) => s + x.expectedKg, 0).toLocaleString('nl-NL')} kg</span>` : '<span class="bz-hulp">Niets is oogstklaar.</span>'}</div>` +
    `${open.length ? `<div class="bz-actie"><button type="button" class="ds-z-knop ds-z-knop--secundair bz-klein" data-vd="zaai">Zaai ${open.length} ${open.length === 1 ? 'veld' : 'velden'}</button><span class="bz-hulp">zaaigoed ± ${euro(zaaiKost)}${missReason(money, zaaiKost) ? ` · ${missReason(money, zaaiKost)}` : ''}</span></div>` : ''}</section>` +
    gebruikBlok(null, bezit, { n: sel.length }) +
    `<div class="bz-raster2"><section class="bz-blok">${tussen('Verzekering', 'schild')}<div class="bz-acties"><button type="button" class="ds-z-knop ds-z-knop--secundair bz-klein" data-vd="verzeker" data-aan="1">Verzeker</button><button type="button" class="ds-z-knop ds-z-knop--secundair bz-klein" data-vd="verzeker" data-aan="0">Zeg op</button></div><span class="bz-hulp">3 euro per ha per speldag · ${ha(totHa)} ha</span></section>` +
    `<section class="bz-blok">${tussen('Ongedierte', 'spuit')}<div class="bz-acties"><button type="button" class="ds-z-knop ds-z-knop--secundair bz-klein" data-vd="mieren">Bestrijd mieren</button><button type="button" class="ds-z-knop ds-z-knop--secundair bz-klein" data-vd="wespen">Wespennest weg</button></div><span class="bz-hulp">15 euro per ha, 40 euro per boomgaard; tien speldagen.</span></section></div>`;
}

// ---- Velden als geheel ----
export function veldenHtml({ rows, bezit, money = 0, gast = false, sel = null, ticked = new Set(), sortNaam = 'ripe', vlakken = [] }) {
  if (!rows.length) return '';
  const gekozen = rows.filter((x) => ticked.has(x.id));
  const huidig = rows.find((x) => x.id === sel) || rows[0];
  const lijst = rows.map((x) => rijHtml(x, { sel: x.id === huidig.id && !gekozen.length, vink: ticked.has(x.id) })).join('');
  const totHa = rows.reduce((s, x) => s + x.ha, 0);
  const links = `<div class="bz-links"><div class="bz-mini bz-mini--breed">${kaartSvg(vlakken, { w: 540, h: 184, sel: huidig.id })}</div>${legendaHtml()}` +
    `<div class="bz-lijst" role="group" aria-label="Je velden"><div class="bz-lijst__kop"><button type="button" class="bz-vink${gekozen.length === rows.length ? ' bz-vink--aan' : ''}" role="checkbox" aria-checked="${gekozen.length === rows.length}" aria-label="Kies alles" data-vd="${gekozen.length === rows.length ? 'niets' : 'alles'}">${gekozen.length === rows.length ? IC('vinkje') : ''}</button><span class="bz-hulp">${gekozen.length ? `<b>${gekozen.length} gekozen</b>` : `${rows.length} velden`} · ${ha(totHa)} ha</span>${stapper('Sorteren', SORT_NAAM[sortNaam] || sortNaam, 'sort')}</div><div class="bz-lijst__rijen ds-scroll" data-onder="1">${lijst}</div></div></div>`;
  const detail = `<div class="bz-detail ds-scroll" data-onder="1">${gekozen.length > 1 ? bulkDetailHtml(gekozen, { bezit, money }) : detailHtml(gekozen[0] || huidig, { bezit, rows, money, gast })}</div>`;
  return `<div class="bz-md">${links}${detail}</div>`;
}

// ---- Team ----
export function teamHtml({ bezit, money = 0, confirm = null }) {
  const st = staffOf(bezit), cap = staffCapacity(st);
  const rijen = st.workers.map((w) => `<div class="bz-rij"><span class="bz-ikoon">${IC('speler', 'bz-ic bz-ic--l')}</span><span class="bz-rij__tekst"><b>${esc(w.name)}</b><small>${SKILL_NAAM_CAP(w.skill)} · ${euro(wageOf(w))} per dag</small></span>` +
    (confirm === `ontsla:${w.id}` ? `<span class="bz-acties">Zeker? <button type="button" class="ds-z-knop ds-z-knop--gevaar bz-klein" data-vd="ontsla" data-id="${esc(w.id)}" data-ok="1">Ja</button><button type="button" class="ds-z-knop ds-z-knop--secundair bz-klein" data-vd="annuleer">Nee</button></span>` : `<button type="button" class="ds-z-knop ds-z-knop--secundair bz-klein" data-vd="ontsla" data-id="${esc(w.id)}">Ontslaan</button>`) + '</div>').join('');
  const links = `<div class="bz-links bz-links--smal"><div class="bz-lijst"><div class="bz-lijst__kop"><span class="ds-z-tussenkop">Jouw team · ${st.workers.length}</span><span class="bz-hulp">${euro(st.workers.reduce((s, w) => s + wageOf(w), 0))} per dag</span></div>${rijen || '<p class="bz-hulp bz-pad">Nog niemand in dienst.</p>'}</div>` +
    `<section class="bz-blok">${tussen('Capaciteit per dag', 'tempo')}<span class="bz-hulp">${st.workers.length ? `Het team regelt ${ha(cap)} ha per speldag.` : 'Zonder team regel je niets per dag.'} Een arbeider haalt hooguit 80% van wat jij zelf haalt; het loon gaat elke speldag van je geld af.</span></section></div>`;
  const opties = [1, 2, 3].map((k) => { const loon = wageOf({ skill: k }); const reden = missReason(money, loon); return `<article class="ds-z-kaart ds-z-kaart--recht bz-optie"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${esc(SKILL_NAAM_CAP(k))}</h3></header><dl class="bz-feiten"><dt>Loon</dt><dd>${euro(loon)} per dag</dd></dl><button type="button" class="ds-z-knop${k === 2 ? '' : ' ds-z-knop--secundair'}" data-vd="huur" data-skill="${k}"${reden ? ' disabled' : ''}>Aannemen${reden ? `<small>${esc(reden)}</small>` : ''}</button></article>`; }).join('');
  const rechts = `<div class="bz-detail"><div class="bz-kopregel"><div><h3 class="bz-detail__titel">Iemand aannemen</h3><span class="bz-hulp">Het loon loopt per speldag mee; je geld daalt niet bij het aannemen.</span></div></div><div class="bz-opties">${opties}</div></div>`;
  return `<div class="bz-md bz-md--team">${links}${rechts}</div>`;
}
const SKILL_NAAM_CAP = (k) => { const s = SKILL_NAME[k] || 'beginner'; return s[0].toUpperCase() + s.slice(1); };
