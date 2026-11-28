// Het tabblad Snackwagen in Land en bedrijf (Snackimperium, epic #1095, #1102): je wagen (menu, plek, uren, prijs, voorraad, upgrades), de standplaatsen met hun vergunning en
// Us Mem Snacks, je medewerkers-wagens, de gebeurtenis die wacht op een antwoord, de doelen en de eindscore. De HTML komt uit pure functies (scripts/snackui_test.mjs);
// renderSnackPanel zet hem in het paneel en bindt de knoppen. DS3-klassen van bezitui.js (m-bt, bd-rij, bz-tegel); een koop vraagt een tweede druk. Per speler (#429).

import * as SL from './snacklive.js';
import * as SN from './snackvan.js';
import { PERMIT_DAYS } from './pitch.js';
import { euro } from './geldtekst.js';
import { icoon } from './icons.js';
import { sectionCard, missReason, holdingButton } from './holdingcards.js';
import { keepFocus } from './focusbehoud.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const sui = { msg: '', confirm: null };
const STATUS_TEXT = { jij: 'van jou', usmem: 'van Us Mem Snacks', medespeler: 'van een medespeler', vrij: 'vrij' };
// Kopen is de gele hoofdknop, de rest omlijnd: zonder eigen vorm leken ze lichtgrijze tekst of uitgeschakeld (#1248).
const HOOFD = new Set(['koop-wagen']);   // één gele knop per scherm: de eerste vergunning zonder standplaats wordt geel in spotsHtml (24-11)
// uit: true (slot) of een reden (slot en reden in de knop), zie holdingcards.js (#1272).
const btn = (act, text, extra = '', uit = false) => holdingButton('data-sn', act, text, extra, uit, HOOFD.has(act));
const key = (act, id) => `${act}:${id}`;
const askOr = (act, id, text, sure, extra = '', uit = false) => (sui.confirm === key(act, id)
  ? `<span class="bd-zeker">${sure} ${btn(act, 'Ja', ` data-id="${esc(id)}" data-ok="1"${extra}`)} ${btn('annuleer', 'Nee')}</span>`
  : btn(act, text, ` data-id="${esc(id)}"${extra}`, uit));
// Een fase van het verhaal die nog dicht is (snackstory.js): de knop staat uit en er staat een hint van een personage (nooit een leeg scherm).
// De reden achter een uitgeschakelde koopknop (verfijnronde bezit: grijs zonder uitleg).
const miss = (money, price) => (money < price ? ` title="Je mist nog ${euro(price - money)}"` : '');
const st = (v, k) => !!(v.stages && v.stages[k] && !v.stages[k].open);
// De reden in een knop die uit staat (#1272): eerst het geld, dan een fase die het verhaal nog niet opende. Geen reden = false (knop aan).
const why = (v, price, ...ks) => missReason(v.money, price) || (ks.some((k) => st(v, k)) ? 'Komt later in het verhaal' : false);
const stNote = (v, ...ks) => ks.filter((k) => st(v, k)).map((k) => `<p class="mut" data-stage="${k}">${esc(v.stages[k].hint)}</p>`).join('');
const hh = (h) => `${String(h % 24).padStart(2, '0')}:00`;
const eur2 = (n) => String(n.toFixed(2)).replace('.', ',');

export function closedHtml(hint) {
  return `<div class="pm-pane-top"><span class="m-eb">Land en bedrijf</span><h2 class="m-h2 td-h2">Snackwagen</h2></div><h3 class="m-h3">Nog dicht</h3><p class="mut">${esc(hint)}</p>` +
    '<p class="mut">Later in het verhaal kun je je snackwagen op de beste standplaatsen van de provincie zetten, een menu uit je eigen keten verkopen, medewerkers aannemen en het opnemen tegen het imperium van Jelle Terpstra.</p>';
}

function eventHtml(v) {
  const p = v.pending;
  if (!p) return '';
  const kinds = { storing: 'Storing aan de frituurpan', pech: 'Pechdag', recensie: 'Valse recensie', oorlog: 'Prijzenoorlog', overkoop: 'Verkoper weggekocht', bod: 'Bod van Us Mem Snacks', vergunning: 'Gedoe met de vergunning' };
  const left = Math.max(0, p.deadline - v.day);
  return `<div class="bz-keten" data-event="${esc(p.kind)}"><h4 class="m-h3">${esc(kinds[p.kind] || 'Gebeurtenis')}</h4><p>${esc(p.text)}</p>` +
    `<p class="mut">Nog ${left + 1} ${left === 0 ? 'dag' : 'dagen'} om te antwoorden${p.kind === 'bod' || p.kind === 'overkoop' ? '' : '; zonder antwoord geldt het gevolg al'}.${p.kind === 'vergunning' ? ' Hoe sterker je buurt achter je staat, hoe groter je kans in beroep.' : ''}${p.kind === 'bod' ? ` Het bod is ${euro(p.price)}.` : ''}</p>` +
    `<div class="bz-bulk">${p.choices.map((c) => btn('antwoord', `${esc(c.label)}${c.cost ? ` (${euro(c.cost)})` : ''}`, ` data-choice="${esc(c.id)}"`, (p.kind !== 'bod' && missReason(v.money, c.cost)) || false)).join(' ')}</div></div>`;
}

function ownHtml(v) {
  const o = v.own;
  if (!o.hasWagon) return sectionCard('wagen', 'burger', 'Jouw snackwagen', `<p class="mut">Je hebt nog geen snackwagen.</p>${askOr('koop-wagen', 'snack', `Koop een snackwagen ${euro(7500)}`, `Voor ${euro(7500)}?`, miss(v.money, 7500), why(v, 7500))}`,
    { info: `Een kleine wagen kost ${euro(7500)} en draait zelf zodra hij op een standplaats staat.` });
  const spot = o.spot ? v.spots.find((s) => s.id === o.spot) : null;
  const f = o.forecast;
  const next = SN.TIER_IDS[SN.TIER_IDS.indexOf(o.tier) + 1];
  // Eerste winstlus: een wagen die thuis staat verdient niets. Zeg wat de volgende stap is en wat die minstens kost (verfijnronde bezit).
  const frees = v.spots.filter((s) => s.status === 'vrij' && Number.isFinite(s.price)).map((s) => s.price);
  const homeHint = !spot ? `<p class="mut" data-hint="thuis">Je wagen staat nog thuis en verdient niets. Koop hieronder een vergunning voor een standplaats${frees.length ? ` (vanaf ${euro(Math.min(...frees))})` : ''} en zet je wagen erheen.</p>` : '';
  const noProductsWarning = !o.menu.length ? '<p class="bz-zwak" data-hint="menu">Je menu is leeg: zonder product verkoop je niets. Zet hieronder iets op het menu.</p>' : '';
  const knobs = homeHint + noProductsWarning + `<div class="bz-bulk" role="group" aria-label="Openingstijd en prijs">` +
    `<span class="mut">Open vanaf ${hh(o.from)}</span> ${btn('open', '-1 uur', ` data-patch="from:${(o.from + 23) % 24}"`)} ${btn('open', '+1 uur', ` data-patch="from:${(o.from + 1) % 24}"`)} ` +
    `<span class="mut">${o.hours} uur open</span> ${btn('open', 'Korter', ` data-patch="hours:${o.hours - 1}"`, o.hours <= 4)} ${btn('open', 'Langer', ` data-patch="hours:${o.hours + 1}"`, o.hours >= 14)} ` +
    `<span class="mut">Prijs ${Math.round(o.pr * 100)}%</span> ${btn('open', 'Lager', ` data-patch="pr:${Math.round((o.pr - 0.05) * 100) / 100}"`, o.pr <= 0.7)} ${btn('open', 'Hoger', ` data-patch="pr:${Math.round((o.pr + 0.05) * 100) / 100}"`, o.pr >= 1.4)}</div>`;
  const offeringsBlock = `<div class="bz-bulk" role="group" aria-label="Menu">${v.menu.map((m) => {
    const own = m.chainOwn >= 0.5 ? ' (uit je eigen keten)' : '';
    return btn('menu', `${m.on ? 'Af: ' : 'Op: '}${esc(m.label)} €${eur2(m.price)}${own}`, ` data-id="${esc(m.id)}" data-on="${m.on ? 1 : 0}"`, !m.unlocked || st(v, 'menu'));
  }).join(' ')}</div>${stNote(v, 'menu')}<p class="mut">Menu: ${o.menu.length} van ${o.tierDef.slots} plekken. Per klant ongeveer €${eur2(o.numbers.ticket)} omzet en €${eur2(o.numbers.cogs)} inkoop.${v.menu.some((m) => !m.unlocked) ? ' Burger, milkshake en softy vragen koeling.' : ''}</p>`;
  const up = SN.UPGRADE_IDS.map((id) => (v.up.includes(id) ? `<span class="mut">${esc(SN.UPGRADES[id].label)}: aanwezig</span>` : askOr('upgrade', id, `${esc(SN.UPGRADES[id].label)} ${euro(SN.UPGRADES[id].price)}`, `Voor ${euro(SN.UPGRADES[id].price)}?`, miss(v.money, SN.UPGRADES[id].price), why(v, SN.UPGRADES[id].price)))).join(' ');
  return sectionCard('wagen', 'burger', 'Jouw snackwagen', `<div class="bd-rij" data-own="1"><span class="bd-naam"><b>${esc(o.tierDef.label)}</b><span class="bd-feiten"><span>${spot ? esc(spot.short) : 'nog thuis'}</span><span>voorraad voor ${o.stockDays} ${o.stockDays === 1 ? 'dag' : 'dagen'}</span>` +
    `${f ? `<span>vandaag ongeveer ${euro(f.net)} winst (${f.sold} klanten${f.unserved ? `, ${f.unserved} gemist` : ''})</span>` : ''}</span>${f ? `<small class="mut">${esc(f.note)}</small>` : ''}</span>` +
    `<span class="bd-acties">${btn('vul', `Vul aan (${euro(SN.RESTOCK_FEE)})`, '', o.stockDays >= SN.STOCK_MAX)} ${next ? askOr('tier', 'own', `Grotere wagen ${euro(SN.TIERS[next].up)}`, `Voor ${euro(SN.TIERS[next].up)}?`, miss(v.money, SN.TIERS[next].up), why(v, SN.TIERS[next].up)) : ''}</span></div>${knobs}${offeringsBlock}<div class="bz-bulk">${up}</div>`);
}


// Je wagen (ontwerp docs/ontwerp/BEZIT-UI-24-11.md, onderdeel f): wat hij verwacht te leveren, de dienst als dagbalk met stappers, het menu als kaarten en de upgrades.
const stap = (label, waarde, patchMin, patchPlus, uitMin, uitPlus) => `<span class="ds-z-stapper"><button type="button" data-sn="open" data-patch="${patchMin}" aria-label="${esc(label)}: minder"${uitMin ? ' disabled' : ''}>${icoon('pijl_links', { cls: 'bz-ic' })}</button><output>${esc(label)} <b>${esc(waarde)}</b></output><button type="button" data-sn="open" data-patch="${patchPlus}" aria-label="${esc(label)}: meer"${uitPlus ? ' disabled' : ''}>${icoon('pijl_rechts', { cls: 'bz-ic' })}</button></span>`;
const tus = (t, ic) => `<h4 class="ds-z-tussenkop"><span>${esc(t)}</span>${ic ? icoon(ic, { cls: 'bz-ic' }) : ''}</h4>`;
export function ownNieuw(v) {
  const o = v.own, f = o.forecast;
  const spot = o.spot ? v.spots.find((s) => s.id === o.spot) : null;
  const next = SN.TIER_IDS[SN.TIER_IDS.indexOf(o.tier) + 1];
  const duur = o.hours;
  const dienst = `<section class="bz-blok" data-blok="dienst">${tus('Dienst', 'tijd')}<div class="bz-dienst" role="img" aria-label="Open van ${hh(o.from)} tot ${hh(o.from + duur)}"><span class="bz-dienst__open" style="--van:${(o.from / 24) * 100}%;--duur:${(Math.min(duur, 24 - o.from) / 24) * 100}%"></span></div><div class="bz-dienst__uren bz-hulp"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>` +
    `<div class="bz-filters" role="group" aria-label="Openingstijd en prijs">${stap('Open vanaf', hh(o.from), `from:${(o.from + 23) % 24}`, `from:${(o.from + 1) % 24}`, false, false)}${stap('Open', `${duur} uur`, `hours:${duur - 1}`, `hours:${duur + 1}`, duur <= 4, duur >= 14)}${stap('Prijs', `${Math.round(o.pr * 100)}%`, `pr:${Math.round((o.pr - 0.05) * 100) / 100}`, `pr:${Math.round((o.pr + 0.05) * 100) / 100}`, o.pr <= 0.7, o.pr >= 1.4)}</div></section>`;
  const kaarten = v.menu.map((m) => {
    const reden = !m.unlocked ? 'Eerst koeling' : st(v, 'menu') ? 'Komt later in het verhaal' : '';
    return `<button type="button" class="bz-menukaart${m.on ? ' is-aan' : ''}" data-sn="menu" data-id="${esc(m.id)}" data-on="${m.on ? 1 : 0}" role="switch" aria-checked="${!!m.on}"${reden ? ' disabled' : ''}><span class="bz-menukaart__naam">${esc(m.label)}</span><small>€${eur2(m.price)}${m.chainOwn >= 0.5 ? ' · eigen keten' : ''}${reden ? ` · ${reden}` : ''}</small><span class="bz-vink${m.on ? ' bz-vink--aan' : ''}" aria-hidden="true">${m.on ? icoon('vinkje', { cls: 'bz-ic' }) : reden ? icoon('slot', { cls: 'bz-ic' }) : ''}</span></button>`;
  }).join('');
  const menu = `<section class="bz-blok" data-blok="menu">${tus(`Menu · ${o.menu.length} van ${o.tierDef.slots} plekken`, 'eten')}<div class="bz-menu">${kaarten}</div>${stNote(v, 'menu')}<span class="bz-hulp">Per klant ongeveer €${eur2(o.numbers.ticket)} omzet en €${eur2(o.numbers.cogs)} inkoop.</span></section>`;
  const ups = SN.UPGRADE_IDS.map((id) => (v.up.includes(id) ? `<div class="bz-rij-tussen"><span><b>${esc(SN.UPGRADES[id].label)}</b> <span class="ds-z-status ds-z-status--goed">aanwezig</span></span></div>` : `<div class="bz-rij-tussen"><b>${esc(SN.UPGRADES[id].label)}</b>${askOr('upgrade', id, euro(SN.UPGRADES[id].price), `Voor ${euro(SN.UPGRADES[id].price)}?`, miss(v.money, SN.UPGRADES[id].price), why(v, SN.UPGRADES[id].price))}</div>`)).join('');
  const nu = `<section class="bz-blok" data-blok="wagen">${tus(esc(o.tierDef.label), 'burger')}<dl class="bz-feiten"><dt>Standplaats</dt><dd>${spot ? esc(spot.short) : 'nog thuis'}</dd><dt>Voorraad</dt><dd>${o.stockDays} ${o.stockDays === 1 ? 'dag' : 'dagen'}</dd>${f ? `<dt>Verwacht vandaag (±)</dt><dd>${euro(f.net)} winst</dd><dt>Klanten (±)</dt><dd>${f.sold}${f.unserved ? `, ${f.unserved} gemist` : ''}</dd>` : ''}</dl>${f ? `<span class="bz-hulp">${esc(f.note)}</span>` : ''}<div class="bz-acties">${btn('vul', `Vul aan (${euro(SN.RESTOCK_FEE)})`, '', o.stockDays >= SN.STOCK_MAX)}${next ? askOr('tier', 'own', `Grotere wagen ${euro(SN.TIERS[next].up)}`, `Voor ${euro(SN.TIERS[next].up)}?`, miss(v.money, SN.TIERS[next].up), why(v, SN.TIERS[next].up)) : ''}</div></section>`;
  const home = !spot ? `<p class="bz-hulp" data-hint="thuis">Je wagen staat nog thuis en verdient niets. Koop hieronder een vergunning voor een standplaats${(() => { const f = v.spots.filter((s) => s.status === 'vrij' && Number.isFinite(s.price)).map((s) => s.price); return f.length ? ` (vanaf ${euro(Math.min(...f))})` : ''; })()} en zet je wagen erheen.</p>` : '';
  const leeg = !o.menu.length ? '<p class="bz-zwak" data-hint="menu">Je menu is leeg: zonder product verkoop je niets. Zet hieronder iets op het menu.</p>' : '';
  return `<div class="bz-snack">${home}${leeg}<div class="bz-raster2">${nu}${dienst}</div>${menu}<section class="bz-blok" data-blok="upgrades">${tus('Upgrades', 'tune_snack')}${ups}</section></div>`;
}

// Het pictogram van een standplaats uit zijn naam: een stadion, een station, een markt, een strand of een park; anders een plek.
export function spotIcon(s) {
  const n = String((s && (s.name || s.short)) || '').toLowerCase();
  if (/stadion|voetbal/.test(n)) return 'prestaties';
  if (/station|perron/.test(n)) return 'trein';
  if (/markt|plein/.test(n)) return 'winkel';
  if (/strand|meer|haven|kade|water/.test(n)) return 'boot';
  if (/park|bos/.test(n)) return 'boom';
  return 'plek';
}

function spotsHtml(v) {
  let geelGehad = v.own.hasWagon && !v.own.spot ? false : true;   // de eerste vrije vergunning is de gele knop als je wagen nog thuis staat
  const hasEmpty = (id) => !v.spots.find((s) => s.id === id).wagon;
  const rows = v.spots.slice().sort((a, b) => b.foot - a.foot).map((s) => {
    const feiten = [esc(s.place), STATUS_TEXT[s.status] + (s.claim ? ` (${esc(s.claim.name)})` : ''), s.status === 'jij' ? `nog ${s.daysLeft} dagen, verlengen ${euro(s.renew)}` : '', s.wagon ? (s.wagon === 'own' ? 'jouw wagen staat er' : `wagen ${esc(s.wagon)} staat er`) : ''].filter(Boolean).map((x) => `<span>${x}</span>`).join('');
    let acts = btn('doel-plek', 'Op de kaart', ` data-id="${esc(s.id)}"`);
    if (s.status === 'vrij' && !geelGehad) { geelGehad = true; acts += ' ' + askOr('vergunning', s.id, `Vergunning ${euro(s.price)}`, `Voor ${euro(s.price)}?`, miss(v.money, s.price), why(v, s.price, 'stek')).replace('class="m-bt', 'class="m-bt bz-hoofd'); }
    else if (s.status === 'vrij') acts += ' ' + askOr('vergunning', s.id, `Vergunning ${euro(s.price)}`, `Voor ${euro(s.price)}?`, miss(v.money, s.price), why(v, s.price, 'stek'));
    else if (s.status === 'usmem') acts += ' ' + askOr('neem-over', s.id, `Neem over ${euro(s.ask)}`, `Voor ${euro(s.ask)}?`, miss(v.money, s.ask), why(v, s.ask, 'keten'));
    else if (s.status === 'jij' && hasEmpty(s.id)) {
      if (v.own.hasWagon) acts += ' ' + btn('zet-wagen', 'Zet mijn wagen hier', ` data-id="${esc(s.id)}"`, st(v, 'standplaats'));
      acts += ' ' + askOr('vloot', s.id, `Extra wagen ${euro(v.wagonPrice)}`, `Voor ${euro(v.wagonPrice)} met een medewerker?`, '', why(v, v.wagonPrice, 'team') || (v.fleet.length >= SN.MAX_FLEET ? 'Je hebt al het maximum aan wagens' : false) || (v.fleet.length >= 1 && st(v, 'keten') ? 'Komt later in het verhaal' : false));
    }
    // #1249: een plaatje per standplaats (het pictogram van het soort plek)
    return `<div class="bd-rij" data-spot="${esc(s.id)}" data-status="${s.status}"><span class="sn-plek-ic" aria-hidden="true">${icoon(spotIcon(s), { maat: 'l' })}</span><span class="bd-naam"><b>${esc(s.name)}</b><span class="bd-feiten">${feiten}</span></span><span class="bd-acties">${acts}</span></div>`;
  }).join('');
  // #1249: de uitleg in één regel
  return sectionCard('standplaatsen', 'plek', 'Standplaatsen', `<p class="mut">Vergunning: ${PERMIT_DAYS} speldagen, verlengen kost een kwart.</p>${stNote(v, 'stek', 'standplaats', 'team', 'keten')}${rows}`,
    { count: v.spots.filter((s) => s.status === 'jij').length });
}

function fleetHtml(v) {
  if (!v.fleet.length) return '';
  const rows = v.fleet.map((f) => {
    const next = SN.TIER_IDS[SN.TIER_IDS.indexOf(f.tier) + 1];
    return `<div class="bd-rij" data-wagon="${esc(f.id)}"><span class="bd-naam"><b>${esc(f.tierDef.label)} bij ${f.spotName ? esc(f.spotName) : 'nergens'}</b><span class="bd-feiten"><span>${esc(f.staff.name)}, vaardigheid ${f.staff.skill}</span><span>${f.mode === 'aandeel' ? '30% van de winst' : `loon ${euro(f.wage)} per dag`}</span></span></span>` +
      `<span class="bd-acties">${btn('modus', f.mode === 'aandeel' ? 'Naar vast loon' : 'Naar aandeel', ` data-id="${esc(f.id)}" data-mode="${f.mode === 'aandeel' ? 'loon' : 'aandeel'}"`)} ${next ? askOr('tier', f.id, `Groter ${euro(SN.TIERS[next].up)}`, `Voor ${euro(SN.TIERS[next].up)}?`, '', why(v, SN.TIERS[next].up)) : ''} ${askOr('verkoop-vloot', f.id, 'Verkoop', 'Zeker?')}</span></div>`;
  }).join('');
  return sectionCard('vloot', 'spelers', 'Medewerkers-wagens', rows, { count: v.fleet.length,
    info: 'Een wagen zonder jou draait op 85% en de aanvoer kost 15% extra; de opbrengst is passief en valt onder de rem van je andere passieve inkomen.' });
}

// ---- Buurt en klanten: tevredenheid, goodwill, bondgenoten, vaste klanten en hulp aan de buurt (goodwill.js) ----
export function neighbourhoodHtml(v) {
  const g = v.gw;
  if (!g) return '';
  const allies = g.allies.length ? `Bondgenoten: ${g.allies.map(esc).join(', ')}.` : 'Nog geen bondgenoten: help de buurt op drie plekken in hetzelfde gebied.';
  const rows = g.spots.map((s) => `<div class="bd-rij" data-buurt="${esc(s.id)}"><span class="bd-naam"><b>${esc(s.short)}</b><span class="bd-feiten"><span>vaste klanten ${s.loyal} van ${s.cap}</span><span>${s.helped}x geholpen</span></span></span>` +
    `<span class="bd-acties">${s.help.map((h) => askOr('help', `${s.id}|${h.id}`, `${esc(h.label)} ${euro(h.cost)}${h.wait ? ` (over ${h.wait} d)` : ''}`, `Voor ${euro(h.cost)}?`, ` data-spot="${esc(s.id)}" data-kind="${esc(h.id)}"`, missReason(v.money, h.cost) || h.wait > 0)).join(' ')}</span></div>`).join('');
  const helpers = g.helpers.length ? `<h4 class="m-h3">Meewerken bij een medespeler</h4>` + g.helpers.map((h) => `<div class="bd-rij" data-helper="${esc(h.id)}"><span class="bd-naam"><b>${esc(h.short)}</b><span class="bd-feiten"><span>van ${esc((h.claim && h.claim.name) || 'een medespeler')}</span></span></span><span class="bd-acties">${btn('meewerken', 'Meewerken (6 uur)', ` data-id="${esc(h.id)}"`, h.done)}</span></div>`).join('') : '';
  return sectionCard('buurt', 'handdruk', 'Buurt en klanten', `<div class="bz-tegels"><span class="bz-tegel"><small>Tevreden klanten</small><b>${g.sat}%</b></span><span class="bz-tegel"><small>Goodwill</small><b>${g.goodwill}</b></span><span class="bz-tegel"><small>Geschillen gewonnen</small><b>${g.disputes.won} van ${g.disputes.won + g.disputes.lost}</b></span><span class="bz-tegel"><small>Reputatie van Us Mem</small><b>${v.rival.rep}</b></span></div>` +
    (v.reputatie && v.reputatie.line ? `<p class="mut">Op straat: "${esc(v.reputatie.line)}"${v.reputatie.jelle ? ` Jelle: "${esc(v.reputatie.jelle)}"` : ''} Rij bij je wagen: ${v.reputatie.queue} klanten.</p>` : '') +
    `<p class="mut">${allies}${g.disputes.bribesFailed ? ` Een omkoping van Jelle is ${g.disputes.bribesFailed}x mislukt.` : ''}</p>${rows || '<p class="mut">Zodra je een standplaats hebt, kun je de buurt helpen.</p>'}${helpers}`,
  { info: 'Jelle Terpstra speelt met formulieren, enveloppen en lage prijzen. Jij wint met oprechte interesse: tevreden klanten, vaste klanten en een buurt die je helpt omdat jij hen hielp.' });
}

export function snackHtml(v) {
  if (!v.open) return closedHtml(v.hint);
  // #1273: the tile is the reputation (0 to 100), not a name: it says what it is and "van 100", like the Snackimperium tile.
  const balk = (naam, w) => `<div class="ds-z-balk" style="--ds-z-w:${Math.max(0, Math.min(100, Math.round(w)))}%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">${naam}: ${Math.round(w)} van 100</span></div>`;
  const imperium = `<section class="bz-blok" data-blok="imperium"><h4 class="ds-z-tussenkop"><span>Imperium</span></h4>${balk('Reputatie', v.effRep)}${balk('Snackimperium', v.score.score)}<dl class="bz-feiten"><dt>Standplaatsen</dt><dd>${v.score.held} tegen ${v.rival.spots} van Us Mem</dd><dt>Wagens</dt><dd>${v.score.wagons}</dd></dl></section>`;
  const goals = `<ul class="bz-lijst">${v.goals.map((g) => `<li data-goal="${g.id}" data-done="${g.done ? 1 : 0}">${g.done ? 'Klaar: ' : 'Nog niet: '}${esc(g.label)}</li>`).join('')}</ul>`;
  const war = v.war ? `<p class="bz-zwak" data-kind="oorlog">Prijzenoorlog tot dag ${v.war.until}: Us Mem Snacks verlaagt zijn prijzen met ${Math.round(v.war.depth * 100)}%${v.war.matched ? '; jij prijst mee.' : '.'}</p>` : '';
  return `${imperium}` +
    // #1249 (hertest 24-11): één korte regel; de standplaatsen staan al in de tegel
    `<p class="mut">${esc(v.rival.name)}: ${v.rival.pand} panden, keten niveau ${v.rival.chain}. Jouw aandeel ${Math.round(v.score.share * 100)}%.</p>${war}${eventHtml(v)}` +
    (v.own.hasWagon ? ownNieuw(v) : ownHtml(v)) + fleetHtml(v) + spotsHtml(v) + neighbourhoodHtml(v) + sectionCard('doelen', 'vlag', 'Doelen', goals, { count: `${v.goals.filter((g) => g.done).length} van ${v.goals.length}` }) + `<p class="bd-melding" aria-live="polite">${esc(sui.msg)}</p>`;
}

// ---- binden ----
const refs = new WeakMap();
export function renderSnackPanel(el, world, rerender) {
  if (!el) return;
  const had = refs.has(el);
  refs.set(el, { world, rerender });
  const draw = () => {
    const cur = refs.get(el) || { world, rerender };
    const restore = keepFocus(el);
    el.innerHTML = snackHtml(SL.snackView(cur.world));
    restore();
  };
  draw();
  if (had) return;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sn]');
    if (!b) return;
    const cur = refs.get(el) || { world, rerender };
    act(cur.world, b.dataset);
    if (cur.rerender) cur.rerender();
    else draw();
  });
}
function act(world, d) {
  const a = d.sn, id = d.id, ok = d.ok === '1';
  const ask = (name) => { if (!ok) { sui.confirm = key(name, id); sui.msg = ''; return true; } sui.confirm = null; return false; };
  const say = (r) => { sui.msg = r.text || ''; if (r.ok && world.addMessage && r.cost) world.addMessage(r.text, 3); };
  if (a === 'annuleer') sui.confirm = null;
  else if (a === 'koop-wagen') { if (!ask(a)) { const r = SL.buyVan(world); say(r); if (r.ok) sui.msg += ' Koop nu een vergunning bij Standplaatsen en zet je wagen erheen.'; } }
  else if (a === 'vergunning') { if (!ask(a)) say(SL.koopVergunning(world, id)); }
  else if (a === 'neem-over') { if (!ask(a)) say(SL.acquireRivalSpot(world, id)); }
  else if (a === 'upgrade') { if (!ask(a)) say(SL.koopUpgrade(world, id)); }
  else if (a === 'tier') { if (!ask(a)) say(SL.upgradeVan(world, id === 'snack' ? 'own' : id)); }
  else if (a === 'vloot') { if (!ask(a)) say(SL.koopVloot(world, id)); }
  else if (a === 'verkoop-vloot') { if (!ask(a)) say(SL.verkoopVloot(world, id)); }
  else if (a === 'zet-wagen') say(SL.placeVan(id));
  else if (a === 'vul') say(SL.refillStock(world));
  else if (a === 'help') { if (!ask(a)) say(SL.helpNeighbourhood(world, d.spot, d.kind)); }
  else if (a === 'meewerken') say(SL.workAlong(world, id, 6));
  else if (a === 'menu') say(SL.offeringButton(id));
  else if (a === 'modus') say(SL.zetModus(id, d.mode));
  else if (a === 'antwoord') say(SL.answerEvent(world, d.choice));
  else if (a === 'open') { const [k, val] = String(d.patch || '').split(':'); say(SL.zetOpen({ [k]: Number(val) })); }
  else if (a === 'doel-plek') import('./pitch.js').then((S) => { const p = S.spotXY(id), def = S.spotDef(id); if (p && def) import('./routing.js').then((m) => m.setUserWaypoint(p.x, p.y, def.short)); });
}
