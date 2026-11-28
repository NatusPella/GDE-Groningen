// Het menu Bezit (epic #1095, #1099): de onderdelen Overzicht (beheerscherm met aandachtspunten, percelen, bulkacties en personeel), Bedrijven (je panden
// en de panden dichtbij) en Te koop (de percelen dichtbij) van "Land en bedrijf". De HTML komt uit pure functies (scripts/bezitui_test.mjs); renderBezitPanels
// zet ze in het paneel en bindt de knoppen. DS3-klassen (m-li, m-bt, bd-rij) van de boerderij; elke koop en verkoop vraagt een tweede druk (bevestiging).
// Samen spelen: het bezit en het beheer zijn per speler (#429); een gast ziet en beheert alleen zijn eigen bezit.

import * as L from './bezitlive.js';
import { keepFocus } from './focusbehoud.js';
import * as H from './holdingsmodel.js';
import * as Z from './bezit.js';
import * as B from './boerderij.js';
import * as P from './bezitprijs.js';
import { getBoerderij } from './boerderijlive.js';
import { staffOf, staffCapacity, wageOf, staffWages, SKILL_NAME } from './farmstaff.js';
import { treatCost } from './parcelcare.js';
import { branchOpen, branchHint } from './bezitgate.js';
import { euro } from './geldtekst.js';
import { noteMoney } from './finance.js';
import { hoofdspeler } from './players.js';
import { districtName } from './bezitnews.js';
import { MOBILE_SPOTS, renovationCost } from './business.js';
import { lastReportLine } from './holdingreport.js';
import { renderSnackPanel } from './snackui.js';
import { renderClubPanel } from './clubui.js';   // het tabblad Club: clubaandelen en sponsors van de voetbalcarrière (#1113)
import { SPECIES, herdOffers, herdSellValue, herdsOf } from './livestock.js';
import { icoon } from './icons.js';
import { setLayer } from './mapfilters.js';
import { sectionCard, missReason, holdingButton, statusChip } from './holdingcards.js';
import { frameView, frameHtml, zetTabs } from './bezitframe.js';
import { portfolioHtml, leegHtml } from './bezitoverzicht.js';
import { kaartSvg } from './bezitkaart.js';
import { veldenHtml, teamHtml } from './bezitvelden.js';
import { koopItems, koopHtml, SOORTEN, SORTEN, HOUD_MS } from './bezitkoop.js';
import { bedrijvenHtml } from './bezitbedrijven.js';
import { escapeHtml as esc } from './htmlescape.js';

const ha = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
export const SORT_NAME = { ripe: 'Rijp eerst', name: 'Naam', ha: 'Grootte', income: 'Opbrengst', region: 'Streek' };
const MAX_ROWS = 40;

export const ui = { veld: null, ontsla: null, bk: null, koop: { sel: null, soort: 'alles', sort: 'terug', bevestig: false }, sort: 'ripe', filter: { region: '', soort: '', level: '' }, sel: H.newSelection(), confirm: null, msg: '', msgAt: 0, more: false, product: 'aardappelen' };
// Een melding onder aan een tabblad blijft niet eeuwig staan (en niet op een ander tabblad hangen): na MSG_TTL_MS is hij weg. msgAt 0 = geen klok (tests).
export const MSG_TTL_MS = 20000;
export const msgNow = () => (ui.msg && (!ui.msgAt || Date.now() - ui.msgAt < MSG_TTL_MS) ? ui.msg : '');
const nl = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const ROLE_NAME = { source: 'grondstof', processor: 'verwerking', outlet: 'verkooppunt' };

// De hoofdacties (kopen, aannemen) zijn de gele knop; de rest een omlijnde knop. Zonder eigen vorm leken ze lichtgrijze tekst of uitgeschakeld (#1248).
const HOOFD = new Set(['koop-pand', 'koop-perceel', 'koop-mobiel', 'huur']);
// uit: true (slot) of een reden (slot en reden in de knop), zie holdingcards.js (#1272).
const btn = (act, text, extra = '', uit = false) => holdingButton('data-bz', act, text, extra, uit, HOOFD.has(act));
// Een lege sectie (#1246): icoon, korte kop, één zin en zo mogelijk een knop naar de volgende stap, in plaats van een lap uitleg.
// knop: [sectie:onderdeel, tekst] gaat via data-goto-sub van het pauzemenu naar dat onderdeel.
// Het icoon draagt zelf een vaste maat (32 px als attribuut, plus .bz-leeg-ic in farm.css): zonder maat vulde de svg in het echte spel
// het hele paneel (hertest 24-11, #1246). scripts/bezitui_iconmaat_test.mjs dwingt af dat elk icoon in Land en bedrijf een maat of klasse heeft.
const LEEG_IC = { maat: 'xl', cls: 'bz-leeg-ic' };
export const emptyState = (ic, kop, tekst, knop = null, data = '') => `<div class="ds-z-leeg ds-zeef bz-leeg"${data ? ` data-leeg="${esc(data)}"` : ''}><span class="ds-z-leeg__beeld bz-leeg-beeld">${icoon(ic, LEEG_IC)}</span><h3 class="ds-z-leeg__kop">${esc(kop)}</h3><p class="ds-z-leeg__tekst">${esc(tekst)}</p>` +
  (knop ? `<button type="button" class="ds-z-knop" data-goto-sub="${esc(knop[0])}">${esc(knop[1])}</button>` : '') + '</div>';
const TILE_ICON = { Percelen: 'gewas', Hectare: 'kaart', Panden: 'gebouw', 'Opbrengst per dag': 'geld', 'Loon per dag': 'geldhand' };
const locked = (branch) => `<div class="pm-pane-top"><h2 class="m-h2 td-h2">Nog dicht</h2></div><p class="mut">${esc(branchHint(branch))}</p>`;
const confirmKey = (act, id = '') => `${act}:${id}`;
// Een koop met de reden achter een uitgeschakelde knop ("Je mist nog ...") en wat je na de koop overhoudt (verfijnronde bezit: de knop was grijs zonder uitleg).
const buyAsk = (act, id, text, price, money, extra = '') => askOr(act, id, text, `Voor ${euro(price)}? Je houdt ${euro(money - price)} over.`, money < price ? ` title="${missReason(money, price)}"${extra}` : extra, missReason(money, price) || false);
const askOr = (act, id, text, sure, extra = '', uit = false) => (ui.confirm === confirmKey(act, id)
  ? `<span class="bd-zeker">${sure} ${btn(act, 'Ja', ` data-id="${esc(id)}" data-ok="1"${extra}`)} ${btn('annuleer', 'Nee')}</span>`
  : btn(act, text, ` data-id="${esc(id)}"${extra}`, uit));

// Een bulkknop die geld kost vraagt een tweede druk met een schatting van de kosten (de rest van het scherm doet dat ook bij elke koop).
export function bulkCost(a, bezit, ids) {
  const what = a === 'bulk-mieren' ? 'mieren' : a === 'bulk-wespen' ? 'wespen' : null;
  return what ? ids.reduce((s, id) => s + treatCost(bezit.parcels[id], what), 0) : 0;
}
function bulkBtn(act, text, extra = '', uit = false) {
  if (ui.confirm !== confirmKey(act) || uit) return btn(act, text, extra, uit);
  const cost = bulkCost(act, L.getBezit(), H.selectedIds(ui.sel, H.holdingRows(L.getBezit(), getBoerderij(), {})));
  return `<span class="bd-zeker">${cost > 0 ? `Ongeveer ${euro(cost)}. Zeker?` : 'Dit kost zaaigoed en loonwerk. Zeker?'} ${btn(act, 'Ja', ' data-ok="1"')} ${btn('annuleer', 'Nee')}</span>`;
}

// Het laatste dagrapport (holdingreport.js) blijft in het overzicht staan: de melding verdwijnt na een paar seconden.
function rapportHtml() {
  const t = lastReportLine();
  return t ? `<p class="mut" data-rapport="1">${esc(t)}</p>` : '';
}

// Renovatie met de prijs op de knop (voorheen pas na de druk te zien) en een tweede druk; bij een pand in orde staat de knop uit.
function renoBtn(act, id, biz, money) {
  const cost = renovationCost(biz);
  // een pand in orde is een status, geen grijze knop (#1272)
  return cost > 0 ? buyAsk(act, id, `Renovatie ${euro(cost)}`, cost, money) : statusChip('In orde', ` data-bz-status="${act}" data-id="${esc(id)}"`);
}

// Een keuze als chip die bij elke klik naar de volgende optie springt (#1245): de native keuzelijst had browseropmaak en een systeemletter.
// opties: [[waarde, tekst]]; soort: filter:<sleutel> | sort | product.
export function cycleChip(soort, label, opties, huidig, extra = '') {
  const i = Math.max(0, opties.findIndex(([v]) => v === huidig));
  const [, tekst] = opties[i] || ['', 'Alles'];
  return `<button type="button" class="ds-z-chip ds-z-chip--selectie bz-chip"${extra} data-bz-cycle="${esc(soort)}" data-opts="${esc(JSON.stringify(opties))}" data-cur="${esc(huidig)}" aria-label="${esc(label)}: ${esc(tekst)}. Klik voor de volgende keuze">${esc(label)}: ${esc(tekst)}</button>`;
}
export const nextOption = (opties, huidig) => opties[(Math.max(0, opties.findIndex(([v]) => v === huidig)) + 1) % opties.length][0];

// ---- Overzicht ----
export function summaryHtml({ bezit, farm, money = 0, day = 0, news = null, chains = null, board = null, products = [], view = null } = {}) {
  view = view || frameView({ money });
  const rows = H.holdingRows(bezit, farm, { regionOf: (id) => (L.parcelOffer(id) || {}).region });
  const own = rows.filter((r) => !((bezit.parcels[r.id] || {}).lg));
  const sum = H.summarize(rows);
  const points = H.attentionPoints(rows, bezit, farm);
  const staff = staffOf(bezit);
  const shown = H.sortRows(H.filterRows(rows, { region: ui.filter.region || undefined, soort: ui.filter.soort || undefined, level: ui.filter.level || undefined }), ui.sort);
  const opt = H.filterOptions(rows);
  const sel = (key, label, items) => cycleChip('filter:' + key, label, [['', 'Alles'], ...items.map((v) => [v, v])], ui.filter[key] || '');
  const tilesOud = [['Percelen', own.length], ['Hectare', ha(sum.ha)], ['Panden', bezit.buildings.size], ['Opbrengst per dag', euro(sum.incomeDay)], ...(staff.workers.length ? [['Loon per dag', euro(staffWages(staff))]] : [])].map(([k, v]) => `<span class="bz-tegel"><small>${TILE_ICON[k] ? icoon(TILE_ICON[k], { cls: 'bz-tegel-ic' }) : ''}${k}</small><b>${v}</b></span>`).join('');
  const vlakken = rows.map((r) => { const o = L.parcelOffer(r.id); return o && o.parcel ? { id: r.id, shape: o.shape, x: o.parcel.x, y: o.parcel.y, statusId: r.statusId, level: r.level, naam: r.name } : null; }).filter(Boolean);
  const portfolio = view ? portfolioHtml(view, { vlakken }) : '';
  const body = shown.slice(0, ui.more ? 200 : MAX_ROWS).map((r) => `<div class="bd-rij" data-row="${esc(r.id)}"><label class="bz-chk"><input type="checkbox" data-bz-sel="${esc(r.id)}"${ui.sel.has(r.id) ? ' checked' : ''} aria-label="Kies ${esc(r.name)}"></label>` +
    `<span class="bd-naam"><b>${esc(r.name)}</b><span class="bd-feiten"><span>${esc(r.soort)}</span><span>${ha(r.ha)} ha</span><span>${esc(r.stand)}</span><span>${H.LEVEL_NAME[r.level]}</span>${r.herd ? `<span>${r.herd.n} dieren</span>` : ''}${r.incomeDay ? `<span>${euro(r.incomeDay)} per dag</span>` : ''}</span></span>` +
    `<span class="bd-acties">${btn('doel', 'Route', ` data-id="${esc(r.id)}"`)}</span></div>`).join('');
  const selN = H.selectedIds(ui.sel, rows).length;
  const bulk = own.length ? `<div class="bz-bulk" role="group" aria-label="Voor de gekozen percelen"><span class="mut">${selN ? `${selN} gekozen` : 'Vink eerst percelen aan; dan werken de knoppen.'}</span> ${btn('kies-alles', 'Kies alles in de lijst')} ${btn('kies-niets', 'Kies niets')} ` +
    `${bulkBtn('bulk-zaai', 'Zaai alles', '', !selN)} ${btn('bulk-oogst', 'Oogst alles', '', !selN)} ${btn('bulk-zelf', 'Zelf werken', '', !selN)} ${btn('bulk-verpacht', 'Verpachten', '', !selN)} ${btn('bulk-personeel', 'Personeel', '', !selN)}` +
    ` ${btn('bulk-verzeker', 'Verzeker tegen stortbui', ' title="3 euro per ha per speldag; dekt 80% van het verlies, geldt vanaf morgen"', !selN)} ${btn('bulk-onverzeker', 'Zeg verzekering op', '', !selN)}` +
    ` ${bulkBtn('bulk-mieren', 'Bestrijd mieren', ' title="15 euro per ha, houdt tien speldagen stand"', !selN)} ${bulkBtn('bulk-wespen', 'Haal wespennest weg', ' title="40 euro per boomgaard, houdt tien speldagen stand"', !selN)}</div>` : '';
  // Zonder personeel één korte regel; de uitleg over capaciteit en 80% pas als er iemand werkt (#1246).
  // #1272: de kop draagt het aantal; de uitleg over 80% staat achter de info-knop
  const staffLine = staff.workers.length ? `${staff.workers.length} ${staff.workers.length === 1 ? 'medewerker' : 'medewerkers'} · ${staffCapacity(staff)} ha per speldag` : 'Nog niemand in dienst.';
  const staffHtml = sectionCard('personeel', 'spelers', 'Personeel', `<p class="mut">${staffLine}</p>` +
    staff.workers.map((w) => `<div class="bd-rij"><span class="bd-naam"><b>${esc(w.name)}</b><span class="bd-feiten"><span>${SKILL_NAME[w.skill]}</span><span>${euro(wageOf(w))} per dag</span></span></span><span class="bd-acties">${askOr('ontsla', w.id, 'Ontslaan', 'Zeker?')}</span></div>`).join('') +
    `<div class="bz-bulk">${[1, 2, 3].map((k) => btn('huur', `Stel ${SKILL_NAME[k]} aan · ${euro(wageOf({ skill: k }))}`, ` data-skill="${k}"`, missReason(money, wageOf({ skill: k })) || false)).join(' ')}</div>`,
  { count: staff.workers.length, info: 'Personeel werkt de percelen op Personeel. Een arbeider haalt hooguit 80% van wat jij zelf haalt; het loon gaat elke speldag van je geld af.' });
  const empty = !own.length && !rows.length ? emptyState('gewas', 'Nog geen land', 'Een eerste perceel kost ongeveer twee uur werk.', ['boerderij:tekoop', 'Koop je eerste perceel'], 'percelen') : '';
  // Nog niets in bezit: één zin met de volgende stap. Nulltegels, filters, personeel, vee, ketens en markt zeggen nu niets (progressive disclosure).
  if (!rows.length && !own.length && !staff.workers.length && !bezit.buildings.size) {
    return `${leegHtml({ money, bedrijvenOpen: branchOpen('business'), snackOpen: branchOpen('snack') })}${rapportHtml()}<p class="bd-melding" aria-live="polite">${esc(msgNow())}</p>`;
  }
  const parcels = sectionCard('percelen', 'gewas', 'Percelen', `<div class="bz-filters" role="group" aria-label="Sorteren en filteren">${cycleChip('sort', 'Sorteren', H.SORTS.map((x) => [x, SORT_NAME[x]]), ui.sort)}` +
    `${sel('region', 'Streek', opt.regions || [])}${sel('soort', 'Soort', opt.soorten || [])}${sel('level', 'Beheer', H.LEVELS)}</div>` + bulk + `<div class="bz-rijen">${body}</div>` +
    (shown.length > MAX_ROWS && !ui.more ? `<p>${btn('meer', `Toon alle ${shown.length}`)}</p>` : ''), { count: shown.length });
  return `${portfolio}${rapportHtml()}${newsHtml(news)}` +
    chainsHtml(chains, money) + marketHtml(board, products) + `<p class="bd-melding" aria-live="polite">${esc(msgNow())}</p>`;
}

// ---- Vee (#1101): kuddes op je weilanden, een kudde kopen (past op de grootte van het perceel) of verkopen; per speler (#429) ----
const MAX_VEE_ROWS = 12;
export function veeHtml(bezit, rows, money = 0) {
  const weiden = rows.filter((r) => r.kind === 'w' && !((bezit.parcels[r.id] || {}).lg));
  const kuddes = weiden.filter((r) => r.herd);
  const vrij = weiden.filter((r) => !r.herd && herdOffers(bezit, r.id).length);
  const herds = herdsOf(bezit);
  const kudde = kuddes.map((r) => `<div class="bd-rij" data-vee="${esc(r.id)}"><span class="bd-naam"><b>${esc(r.name)}</b><span class="bd-feiten"><span>${SPECIES[r.herd.sp].naam}</span><span>${r.herd.n} ${r.herd.n === 1 ? 'dier' : 'dieren'}</span>${r.herd.sick > 0 ? '<span class="bz-zwak">Ziek: dierenarts nodig</span>' : '<span>Gezond</span>'}</span></span>` +
    `<span class="bd-acties">${askOr('verkoop-vee', r.id, `Verkopen · ${euro(herdSellValue(herds[r.id]))}`, 'Zeker?')}</span></div>`).join('');
  const aanbod = vrij.slice(0, MAX_VEE_ROWS).map((r) => `<div class="bd-rij" data-vee-vrij="${esc(r.id)}"><span class="bd-naam"><b>${esc(r.name)}</b><span class="bd-feiten"><span>${ha(r.ha)} ha weiland</span><span>nog geen vee</span></span></span><span class="bd-acties">` +
    herdOffers(bezit, r.id, money).map((o) => buyAsk('koop-vee', `${r.id}|${o.sp}`, `${o.naam} · ${o.n} · ${euro(o.cost)}`, o.cost, money, ` data-sp="${o.sp}"`)).join(' ') + '</span></div>').join('');
  const leeg = !weiden.length ? emptyState('koe', 'Nog geen vee', 'Vee loopt op een weiland van jou.', ['boerderij:tekoop', 'Koop een weiland'], 'vee')
    : !kuddes.length && !vrij.length ? '<p class="mut">Je weilanden zijn te klein voor vee.</p>' : '';
  const meer = vrij.length > MAX_VEE_ROWS ? `<p class="mut">En nog ${vrij.length - MAX_VEE_ROWS} weilanden zonder vee.</p>` : '';
  return sectionCard('vee', 'koe', 'Vee', `${leeg}${kudde}${aanbod}${meer}`, { count: kuddes.length || null });
}

// ---- Nieuws van het land (bezitnews.js): hoogstens vijf regels, de buurman met een keuze en de trekkertrek ----
export function newsHtml(news) {
  if (!news) return '';
  const lines = news.lines && news.lines.length ? `<ul class="bz-nieuws">${news.lines.slice(0, 5).map((l) => `<li data-kind="${esc(l.k)}">${esc(l.t)}</li>`).join('')}</ul>` : '<p class="mut">Geen nieuws: het land is rustig.</p>';
  const sc = news.scene;
  const scene = sc ? `<div class="bd-rij" data-scene="${esc(sc.id)}"><span class="bd-naam"><b>De buren</b><span>${esc(sc.text)}</span></span><span class="bd-acties">${sc.choices.map((c) => btn('buur', `${esc(c.label)}${c.cost ? ` (${euro(c.cost)})` : ''}`, ` data-choice="${esc(c.id)}"`)).join(' ')}</span></div>` : '';
  const pull = (news.pull || []).map((p) => `<p class="mut" data-pull="${esc(p.region)}">${esc(p.label)} bij ${esc(p.name)} in ${esc(districtName(p.region))}: ${p.classes.map((c) => `${esc(c.label)}, inleg ${euro(c.fee)}, prijs tot ${euro(c.top)}`).join('; ')}. De wedstrijd zelf is nog niet te spelen.</p>`).join('');
  return sectionCard('nieuws', 'nieuws', 'Nieuws van het land', `${lines}${scene}${pull}`);
}

// ---- Ketens: grondstof, verwerking en verkooppunt per keten (supplychain.js, bezitchain.js) ----
export function chainsHtml(chains, money = 0) {
  if (!chains || !chains.length) return '';
  // Niets van jou in een keten, geen bron en geen pand om te koppelen: één lege staat met de weg naar Bedrijven, niet de hele schakelrij met nullen (#1246).
  if (chains.every((c) => !c.sourceKg && !c.links.some((l) => l.owned || (l.options && l.options.length)))) return sectionCard('ketens', 'fabriek', 'Ketens', emptyState('fabriek', 'Nog geen keten', 'Een eigen verwerker of verkooppunt geeft extra marge.', ['boerderij:bedrijven', 'Naar Bedrijven'], 'ketens'));
  const body = chains.map((c) => {
    const meta = [`Bron: ${nl(c.sourceKg)} kg per speldag${c.sourceCount ? ` uit ${c.sourceCount} ${c.sourceCount === 1 ? 'perceel of kudde' : 'percelen of kuddes'}` : ' (nog niets op Personeel of in de stal)'}`,
      `extra marge ${Math.round(c.margin * 100)}%`, c.last ? `laatste dag ${euro(c.last.net)} extra` : '', c.closedDays ? `gesloten keten: ${c.closedDays} ${c.closedDays === 1 ? 'dag' : 'dagen'}` : ''].filter(Boolean).join(' · ');
    const links = c.links.map((l, i) => {
      const last = i === c.links.length - 1;
      const bound = l.ref !== null && l.ref !== undefined;
      // #1272: het pand van een schakel is een keuzechip (elke druk het volgende pand, daarna weer los), geen native keuzelijst meer
      const pick = !l.ownable ? '' : !l.options.length ? '<small class="mut">Geen passend pand van jou</small>'
        : `${bindChip(c.id, l)}${bound ? ' ' + btn('keten-los', 'Los', ` data-chain="${esc(c.id)}" data-link="${esc(l.id)}"`) : ''}`;
      const trucks = !last ? `${btn('wagen-plus', 'Wagen erbij', ` data-chain="${esc(c.id)}" data-link="${esc(l.id)}"`)} ${l.trucks ? btn('wagen-min', 'Wagen weg', ` data-chain="${esc(c.id)}" data-link="${esc(l.id)}"`) : ''}` : '';
      const up = l.owned ? askOr('keten-uit', `${c.id}|${l.id}`, `Uitbreiden ${euro(800)}`, `Voor ${euro(800)}? Doorvoer en buffer +25%.`, ` data-chain="${esc(c.id)}" data-link="${esc(l.id)}"`, missReason(money, 800) || false) : '';
      const src = i === 0 && c.sources && c.sources.length ? `<details><summary>Bronnen kiezen (${c.picked ? `${c.picked} gekozen` : 'alles wat past'})</summary>${c.sources.map((s) => `<div>${btn('keten-bron', `${s.picked ? 'Uit: ' : 'Kies: '}${esc(s.name)} (${nl(s.kg)} kg)`, ` data-chain="${esc(c.id)}" data-id="${esc(s.id)}"`)}</div>`).join('')}</details>` : '';
      return `<div class="bz-schakel" data-link="${esc(l.id)}" data-own="${l.owned ? 1 : 0}"><b>${esc(l.label)}</b><small>${ROLE_NAME[l.role]} · ${l.owned ? 'van jou' : l.ownable ? 'niet van jou' : 'vast'}${l.trucks ? ` · ${l.trucks} ${l.trucks === 1 ? 'wagen' : 'wagens'} (${euro(l.wage)} per dag)` : ''}</small>` +
        `<div class="bz-balk" role="img" aria-label="Voorraad ${Math.round(l.fill * 100)}%"${l.fill >= 0.9 ? ' data-vol="1"' : ''}><i style="width:${Math.round(l.fill * 100)}%"></i></div>` +
        `<small>${nl(l.stock)} van ${nl(l.cap)} kg · doorvoer ${nl(l.perDay)} kg per dag${l.distance ? ` · ${nl(l.distance)} m naar de volgende` : ''}</small>${pick}${trucks ? `<div>${trucks}</div>` : ''}${up}${src}</div>`;
    }).join('');
    return `<div class="bz-keten" data-chain="${esc(c.id)}"><h4 class="m-h3">${esc(c.name)}</h4><p class="mut">${esc(meta)}</p>${c.weakest ? `<p class="bz-zwak" data-kind="${esc(c.weakest.kind)}">Zwakste schakel: ${esc(c.weakest.text)}</p>` : ''}<div class="bz-schakels">${links}</div></div>`;
  }).join('');
  return sectionCard('ketens', 'fabriek', 'Ketens', body, { count: chains.filter((c) => c.links.some((l) => l.owned)).length || null,
    info: 'Een eigen verwerker of verkooppunt geeft extra marge: +15% voor een, +35% voor beide. Boven 500 m heb je wagens met chauffeur nodig.' });
}

// De koppeling van een schakel aan een pand van jou als chip: Geen, dan elk passend pand, en weer rond (#1272).
export function bindChip(chainId, link) {
  const opties = [['', 'geen'], ...link.options.map((o) => [String(o.ref), o.label])];
  const cur = link.ref === null || link.ref === undefined ? '' : String(link.ref);
  return cycleChip(`bind:${chainId}|${link.id}`, 'Van jou', opties, cur, ` data-bz-bind="${esc(chainId)}|${esc(link.id)}"`);
}

// ---- Prijzen vandaag per streek (areamarket.js) ----
export function marketHtml(board, products = []) {
  if (!board) return '';
  const TREND = { op: 'stijgt', neer: 'daalt', gelijk: 'gelijk' };
  const rows = board.rows.map((r, i) => `<tr data-region="${esc(r.region)}"${i === 0 ? ' data-best="1"' : ''}><td>${esc(districtName(r.region))}</td><td>${euro(r.price)} per kg</td><td>${Math.round(r.factor * 100)}%</td><td>${TREND[r.trend] || ''}</td></tr>`).join('');
  const pick = cycleChip('product', 'Product', products.map((p) => [p, p]), board.product);
  const auction = board.auction ? `<p class="mut">${esc(board.auction.text)}</p>` : '';
  const best = board.best ? `<p class="mut">Nu het beste: ${esc(districtName(board.best.region))}.</p>` : '';
  return sectionCard('prijzen', 'geld', 'Prijzen vandaag per streek', `${pick}${best}${auction}<table class="bz-prijzen"><thead><tr><th>Streek</th><th>Prijs</th><th>Marktfactor</th><th>Trend</th></tr></thead><tbody>${rows}</tbody></table>`,
    { info: 'Wat je levert drukt de prijs in die streek (3% per 1.000 kg, herstel 25% per dag): spreid je leveringen.' });
}

// ---- Bedrijven ----
export function businessesHtml({ money = 0, mine = [], near = [], day = 0, mobile = [], mobileOffers = [], homes = [] } = {}) {
  if (!branchOpen('business')) return locked('business');
  const mineHtml = mine.length ? mine.map((m) => {
    const b = m.biz;
    return `<div class="bd-rij" data-osm="${m.osm}"><span class="bd-naam"><b>${esc(m.kind.type)} bij ${esc(m.place)}</b><span class="bd-feiten"><span>onderhoud ${Math.round(b.q)}%</span><span>waarde ${euro(Math.round(b.p))}</span>${b.cls === 'rent' && b.type === 'woning' ? `<span>${esc((L.rentView(b, day) || {}).text || '')}</span>` : ''}</span></span>` +
      `<span class="bd-acties">${renoBtn('reno', m.osm, b, money)} ${askOr('verkoop-pand', m.osm, `Verkoop ${euro(P.sellValue(b.p))}`, 'Zeker?')}</span></div>`;
  }).join('') : '<p class="mut">Nog geen bedrijf. Koop hieronder een pand in de buurt.</p>';
  const nearHtml = near.length ? near.map((o) => `<div class="bd-rij" data-osm="${o.osm}"><span class="bd-naam"><b>${esc(o.kind.type)} bij ${esc(o.town.name)}</b><span class="bd-feiten"><span>${Math.round(o.row.m2)} m2</span><span>${o.dist} m</span>${o.forSale ? `<span>${euro(o.price)}</span>` : `<span>${esc(o.reason)}</span>`}</span></span>` +
    `<span class="bd-acties">${o.mine ? '' : o.forSale ? buyAsk('koop-pand', o.osm, `Koop ${euro(o.price)}`, o.price, money) : ''}</span></div>`).join('') : '<p class="mut">Er staan geen koopbare bedrijfspanden binnen 250 meter van je.</p>';
  return sectionCard('bedrijven', 'winkel', 'Jouw bedrijven', mineHtml, { count: mine.length, info: 'Een winkel levert elke speldag omzet, ook als je er niet bent. Monumenten, ziekenhuizen, politie en verhaalgebouwen blijven van de wereld.' }) +
    snackVerwijsHtml(mobile) + sectionCard('buurt', 'gebouw', 'In de buurt', nearHtml, { count: near.length || null }) + homesHtml(homes, money) + `<p class="bd-melding" aria-live="polite">${esc(msgNow())}</p>`;
}

// ---- de snackwagen (id frietwagen; business.js, mobiel bedrijf): kopen, standplaats kiezen, verkopen ----
export function mobileHtml(mobile = [], offers = [], money = 0, day = 0) {
  const own = mobile.map((m) => `<div class="bd-rij" data-mobile="${esc(m.id)}"><span class="bd-naam"><b>${esc(m.def.label)}</b><span class="bd-feiten"><span>${esc(m.spotLabel)}</span><span>onderhoud ${Math.round(m.biz.q)}%</span><span>waarde ${euro(m.value)}</span>${m.forecast ? `<span>ongeveer ${euro(m.forecast.revenue)} omzet per dag</span>` : ''}</span><small class="mut">${esc(m.def.story)}</small></span>` +
    `<span class="bd-acties">${Object.keys(MOBILE_SPOTS).map((k) => (k === m.spot ? statusChip(MOBILE_SPOTS[k].label, ` data-spot="${esc(k)}" aria-current="true"`) : btn('plek', esc(MOBILE_SPOTS[k].label), ` data-id="${esc(m.id)}" data-spot="${esc(k)}"`))).join(' ')} ${renoBtn('reno-mobiel', m.id, m.biz, money)} ${askOr('verkoop-mobiel', m.id, `Verkoop ${euro(Math.round((m.biz.p * 0.75) / 5) * 5)}`, 'Zeker?')}</span></div>`).join('');
  const shop = offers.map((o) => `<div class="bd-rij" data-offer="${esc(o.id)}"><span class="bd-naam"><b>${esc(o.label)} te koop</b><span class="bd-feiten"><span>${euro(o.price)}</span><span>geen pand nodig: je kiest zelf de standplaats</span></span><small class="mut">${esc(o.story)}</small></span><span class="bd-acties">${askOr('koop-mobiel', o.id, `Koop ${euro(o.price)}`, `Voor ${euro(o.price)}?`, '', missReason(money, o.price) || false)}</span></div>`).join('');
  return sectionCard('snack', 'burger', 'Snackwagen', `${own}${shop}`);
}

// De snackwagen koop en beheer je op het tabblad Snackwagen; hier alleen een verwijzing, zodat dezelfde Koop-knop niet op twee plekken staat (#1250).
export function snackVerwijsHtml(mobile = []) {
  return sectionCard('snack', 'burger', 'Snackwagen', `<p class="mut" data-verwijs="snack">${mobile.length ? 'Je snackwagen draait.' : 'Je hebt nog geen snackwagen.'} Kopen, standplaats en menu staan op het tabblad Snackwagen.</p>`);
}

// ---- woningen in de buurt (housing.js): kopen, verhuren (automatisch) en verkopen ----
export function homesHtml(homes = [], money = 0) {
  if (!homes.length) return '';
  const rows = homes.map((o) => `<div class="bd-rij" data-osm="${o.osm}" data-home="1"><span class="bd-naam"><b>Woning bij ${esc(o.town.name)}</b><span class="bd-feiten"><span>${Math.round(o.row.m2)} m2 grondvlak</span><span>${o.dist} m</span><span>${o.forSale ? euro(o.price) : esc(o.reason)}</span></span></span>` +
    `<span class="bd-acties">${o.forSale ? buyAsk('koop-pand', o.osm, `Koop ${euro(o.price)}`, o.price, money) : ''}</span></div>`).join('');
  return sectionCard('woningen', 'thuis', 'Woningen in de buurt', rows, { count: homes.length, info: 'Een gekochte woning wordt verhuurd: elke speldag huur, tenzij de huurder verhuist (dan staat hij even leeg).' });
}

// Twee lege toestanden die niet door elkaar mogen lopen: de lijst laadt nog, of er is hier niets te koop (#1251).
export function leegTeKoop(laden) {
  return laden
    ? '<div class="ds-z-leeg" data-leeg="laden"><h3 class="ds-z-leeg__kop">Percelen laden</h3><p class="ds-z-leeg__tekst">Even wachten: de lijst met percelen wordt opgehaald.</p></div>'
    // #1251 (hertest 24-11): met een icoon en een knop naar de kaart met de laag Te koop aan, in plaats van alleen een zin
    : `<div class="ds-z-leeg ds-zeef bz-leeg" data-leeg="niets"><span class="ds-z-leeg__beeld bz-leeg-beeld">${icoon('bord', LEEG_IC)}</span><h3 class="ds-z-leeg__kop">Niets te koop in de buurt</h3><p class="ds-z-leeg__tekst">Op de kaart zie je alle percelen die te koop zijn, ook verder weg.</p>` +
      '<button type="button" class="ds-z-knop" data-bz="kaart-tekoop" data-goto="map">Toon op de kaart</button></div>';
}

// ---- Te koop ----
export function forSaleHtml({ money = 0, offers = [], loading = false, laden = false } = {}) {
  if (!branchOpen('land')) return locked('land');
  const rows = offers.length ? offers.map((o) => `<div class="bd-rij" data-id="${esc(o.id)}"><span class="bd-naam"><b>${esc(o.name)}</b><span class="bd-feiten"><span>${esc(o.kindName)}</span><span>${ha(o.ha)} ha</span><span>bodem ${esc(o.soilWord)}</span><span>${o.dist} m</span><span>${euro(o.price)}</span></span></span>` +
    `<span class="bd-acties">${btn('doel-perceel', 'Route', ` data-id="${esc(o.id)}"`)} ${buyAsk('koop-perceel', o.id, `Koop ${euro(o.price)}`, o.price, money)}</span></div>`).join('') : leegTeKoop(loading || laden);
  return sectionCard('tekoop', 'kaart', 'Dichtbij', rows, { count: offers.length || null, info: 'Op de kaart zie je alle percelen met de laag Te koop. Wie veel land heeft, betaalt meer voor het volgende perceel.' }) + `<p class="bd-melding" aria-live="polite">${esc(msgNow())}</p>`;
}

// ---- de koppeling met de wereld ----
function playerPos(world) { const p = world && hoofdspeler(world); return p && Number.isFinite(p.x) ? { x: p.x, y: p.y } : { x: 0, y: 0 }; }
export function nearbyOffers(world, max = 10) {
  const ix = L.getIndexNow();
  if (!ix) return [];
  const p = playerPos(world);
  return ix.parcels.inRect(p.x - 3000, p.y - 3000, p.x + 3000, p.y + 3000).filter((c) => c.access !== 'geen').map((c) => ({ c, d: Math.hypot(c.x - p.x, c.y - p.y) })).sort((a, b) => a.d - b.d).slice(0, max).map((e) => ({ ...L.parcelOffer(e.c.id), dist: Math.round(e.d) })).filter((o) => o.id && o.forSale);
}

// Eén druk op de koppelchip van een schakel: het volgende pand koppelen, of bij 'geen' weer los. Geeft de melding terug.
export function bindStep(sleutel, ref) {
  const [ch, lk] = String(sleutel).split('|');
  return (ref ? L.koppelSchakel(ch, lk, ref) : L.ontkoppelSchakel(ch, lk)).text;
}

let bound = null;
export function renderBezitPanels(els, world) {
  if (!els) return;
  // elke klik tekent de panelen opnieuw; zonder dit viel de focus naar body en begon de D-pad weer bovenaan (22-11)
  const restore = keepFocus([els.overzicht, els.bedrijven, els.tekoop, els.snack, els.club].find((p) => p && p.contains && document.activeElement && p.contains(document.activeElement)));
  const bezit = L.getBezit(), farm = getBoerderij();
  const money = (world && world.money) || 0, day = Math.floor(farm.uren / 24);
  // Alleen wachten als de index er nog niet is: ensureIndex() geeft na het laden een al opgeloste belofte terug, en dan riep deze regel via rerender zichzelf
  // eindeloos aan in microtaken (het scherm Land en bedrijf bevroor de hele pagina).
  if (!L.getIndexNow()) L.ensureIndex().then(() => { if (els.rerender) els.rerender(); }).catch(() => {});
  const view = frameView(world), kader = frameHtml(view);
  if (els.overzicht) els.overzicht.innerHTML = kader + summaryHtml({ bezit, farm, money, day, news: L.newsView(world), chains: L.chainViews(), board: L.priceBoard(ui.product), products: L.marketProducts(), view });
  if (els.bedrijven) { const p = playerPos(world); els.bedrijven.innerHTML = businessesHtml({ money, mine: L.myBusinesses(), near: L.buildingsNear(p.x, p.y), day, mobile: L.myMobile(), mobileOffers: L.mobileOffers(), homes: L.homesNear(p.x, p.y) }); els.bedrijven.innerHTML = kader + bedrijvenView(world, view); }
  const aanbod = nearbyOffers(world);
  if (els.tekoop) { els.tekoop.innerHTML = kader + tekoopView(world, view); }
  if (els.snack) { renderSnackPanel(els.snack, world); els.snack.insertAdjacentHTML('afterbegin', kader); }
  if (els.club) { renderClubPanel(els.club, world); els.club.insertAdjacentHTML('afterbegin', kader); }
  zetTabs(els.overzicht && els.overzicht.closest('[data-panel]'), view, { boerderij: view.rows.length, bedrijven: view.panden.length, tekoop: aanbod.length });
  restore();
  const redo = () => renderBezitPanels(els, world);
  els.rerender = redo;
  if (bound === world) return;
  bound = world;
  if (els.tekoop) bindVasthouden(els.tekoop, world, () => els.rerender());
  for (const el of [els.overzicht, els.bedrijven, els.tekoop]) {
    if (!el) continue;
    el.addEventListener('change', (e) => {
      const f = e.target.closest('[data-bz-filter]'), s = e.target.closest('[data-bz-sort]'), c = e.target.closest('[data-bz-sel]');
      const pr = e.target.closest('[data-bz-product]');
      if (pr) ui.product = pr.value;
      else if (f) ui.filter[f.dataset.bzFilter] = f.value;
      else if (s) ui.sort = s.value;
      else if (c) { if (c.checked) ui.sel.add(c.dataset.bzSel); else ui.sel.delete(c.dataset.bzSel); }
      els.rerender();
    });
    el.addEventListener('click', (e) => {
      const cy = e.target.closest('[data-bz-cycle]');
      if (cy) {
        const opts = JSON.parse(cy.dataset.opts || '[]'), nxt = opts.length ? nextOption(opts, cy.dataset.cur) : '';
        const raw = cy.dataset.bzCycle, at = raw.indexOf(':');
        const soort = at < 0 ? raw : raw.slice(0, at), sleutel = at < 0 ? '' : raw.slice(at + 1);
        if (soort === 'filter') ui.filter[sleutel] = nxt; else if (soort === 'sort') ui.sort = nxt; else if (soort === 'product') ui.product = nxt;
        else if (soort === 'bind') { ui.msg = bindStep(sleutel, nxt); ui.msgAt = ui.msg ? Date.now() : 0; }
        els.rerender();
        return;
      }
      const bk = e.target.closest('[data-bk]');
      if (bk) { ui.bk = Number(bk.dataset.osm); ui.msg = ''; els.rerender(); return; }
      const kp = e.target.closest('[data-kp]');
      if (kp) { koopActie(world, kp.dataset); els.rerender(); return; }
      const b = e.target.closest('[data-bz]');
      if (!b) return;
      act(world, b.dataset, els);
    });
  }
}

const BULK_PAID = ['bulk-zaai', 'bulk-mieren', 'bulk-wespen'];
// Eén knop. Een koop of verkoop vraagt een tweede druk (data-ok), zoals de rest van de boerderij.
function act(world, d, els) {
  const a = d.bz, id = d.id, ok = d.ok === '1';
  const farm = getBoerderij(), bezit = L.getBezit();
  const rows = H.holdingRows(bezit, farm, {});
  const ask = (name) => { if (!ok) { ui.confirm = confirmKey(name, id); ui.msg = ''; return true; } ui.confirm = null; return false; };
  if (a === 'annuleer') ui.confirm = null;
  else if (a === 'meer') ui.more = true;
  else if (a === 'kies-alles') H.selectRows(ui.sel, H.sortRows(H.filterRows(rows, { region: ui.filter.region || undefined, soort: ui.filter.soort || undefined, level: ui.filter.level || undefined }), ui.sort).slice(0, 200));
  else if (a === 'kies-niets') H.clearSelection(ui.sel);
  else if (a === 'kaart-tekoop') setLayer('tekoop', true); // het pauzemenu gaat zelf naar de kaart (data-goto)
  else if (a === 'doel' || a === 'doel-perceel') { const o = L.parcelOffer(id); if (o) { import('./routing.js').then((m) => m.setUserWaypoint(o.parcel.x, o.parcel.y, o.name)); ui.msg = `Doel gezet: ${o.name}.`; } else ui.msg = 'Dit perceel heeft nog geen plek op de kaart.'; }
  else if (a === 'koop-perceel') { if (!ask(a)) { const r = L.koopPerceel(world, id); ui.msg = r.text; if (r.ok && world.addMessage) world.addMessage(r.text, 3); } }
  else if (a === 'koop-pand') { if (!ask(a)) { const r = L.koopPand(world, Number(id)); ui.msg = r.text; if (r.ok && world.addMessage) world.addMessage(r.text, 3); } }
  else if (a === 'verkoop-pand') { if (!ask(a)) ui.msg = L.verkoopPand(world, Number(id)).text; }
  else if (a === 'reno') { if (!ask(a)) ui.msg = L.renovatePand(world, Number(id)).text; }
  else if (a === 'buur') ui.msg = L.kiesBuur(world, d.choice).text;
  else if (a === 'keten-los') ui.msg = L.ontkoppelSchakel(d.chain, d.link).text;
  else if (a === 'keten-bron') ui.msg = L.kiesBron(d.chain, id).text;
  else if (a === 'wagen-plus') ui.msg = L.adjustWagons(d.chain, d.link, 1).text;
  else if (a === 'wagen-min') ui.msg = L.adjustWagons(d.chain, d.link, -1).text;
  else if (a === 'keten-uit') { if (!ask(a)) ui.msg = L.schakelUitbreiden(world, d.chain, d.link).text; }
  else if (a === 'koop-mobiel') { if (!ask(a)) { const r = L.koopMobiel(world, id); ui.msg = r.text; if (r.ok && world.addMessage) world.addMessage(r.text, 3); } }
  else if (a === 'verkoop-mobiel') { if (!ask(a)) ui.msg = L.verkoopMobiel(world, id).text; }
  else if (a === 'plek') ui.msg = L.setPitch(id, d.spot).text;
  else if (a === 'reno-mobiel') { if (!ask(a)) ui.msg = L.renoveerMobiel(world, id).text; }
  else if (a === 'huur') ui.msg = L.huurArbeider(world, Number(d.skill)).text;
  else if (a === 'koop-vee') { if (!ask(a)) { const r = L.koopVee(world, String(id).split('|')[0], d.sp); ui.msg = r.text; if (r.ok && world.addMessage) world.addMessage(r.text, 3); } }
  else if (a === 'verkoop-vee') { if (!ask(a)) ui.msg = L.verkoopVee(world, id).text; }
  else if (a === 'ontsla') { if (!ask(a)) { L.ontslaArbeider(id); ui.msg = 'Ontslagen. De percelen van die arbeider staan weer op Zelf.'; } }
  else if (a.startsWith('bulk-') && BULK_PAID.includes(a) && !ok) { ui.confirm = confirmKey(a); ui.msg = ''; }
  else if (a.startsWith('bulk-')) {
    ui.confirm = null;
    const ids = H.selectedIds(ui.sel, rows);
    let r = null;
    if (a === 'bulk-zaai') r = H.bulkWork(bezit, farm, ids, 'zaaien', { money: world.money || 0, day: Math.floor(farm.uren / 24) });
    else if (a === 'bulk-oogst') r = H.bulkWork(bezit, farm, ids, 'oogsten', { money: world.money || 0, day: Math.floor(farm.uren / 24) });
    else if (a === 'bulk-verzeker' || a === 'bulk-onverzeker') r = L.zetVerzekering(ids, a === 'bulk-verzeker');
    else if (a === 'bulk-mieren' || a === 'bulk-wespen') r = L.bestrijd(world, ids, a === 'bulk-mieren' ? 'mieren' : 'wespen');
    else { r = H.bulkSetMode(bezit, ids, { 'bulk-zelf': 'self', 'bulk-verpacht': 'leased', 'bulk-personeel': 'staff' }[a]); }
    ui.msg = r ? bulkText(a, r) : '';
    if (r && Number.isFinite(r.net) && r.net !== 0) { noteMoney(r.net > 0 ? 'Verkoop' : 'Winkels'); world.money = Math.max(0, (world.money || 0) + r.net); }
    L.markeer();
  }
  ui.msgAt = ui.msg ? Date.now() : 0;
  if (els && els.rerender) els.rerender();
}
export function bulkText(a, r) {
  const skipped = Object.entries(r.skipped || {}).map(([k, n]) => `${n}x ${k.replace(/-/g, ' ')}`).join(', ');
  const verb = { 'bulk-zaai': 'gezaaid', 'bulk-oogst': 'geoogst', 'bulk-zelf': 'op Zelf gezet', 'bulk-verpacht': 'verpacht', 'bulk-personeel': 'aan personeel gegeven', 'bulk-verzeker': 'verzekerd', 'bulk-onverzeker': 'van de verzekering gehaald', 'bulk-mieren': 'tegen mieren behandeld', 'bulk-wespen': 'van wespen ontdaan' }[a] || 'gedaan';
  return `${r.done || 0} ${(r.done || 0) === 1 ? 'perceel' : 'percelen'} ${verb}${r.cost > 0 ? ` voor ${euro(r.cost)}` : ''}${skipped ? `; overgeslagen: ${skipped}` : ''}.`;
}

// ---- Boerderij > Velden en Team (bezitvelden.js): de HTML en de knoppen (data-vd) ----
const vlakkenVan = (rows) => rows.map((r) => { const o = L.parcelOffer(r.id); return o && o.parcel ? { id: r.id, shape: o.shape, x: o.parcel.x, y: o.parcel.y, statusId: r.statusId, level: r.level, naam: r.name } : null; }).filter(Boolean);
const melding = () => `<p class="bd-melding" aria-live="polite">${esc(msgNow())}</p>`;
export function veldenView(world) {
  const bezit = L.getBezit(), farm = getBoerderij(), money = (world && world.money) || 0;
  const rows = H.sortRows(H.holdingRows(bezit, farm, { regionOf: (id) => (L.parcelOffer(id) || {}).region }), ui.sort);
  H.pruneSelection(ui.sel, bezit);
  if (!rows.length) return '';
  const sel = ui.veld && rows.some((r) => r.id === ui.veld) ? ui.veld : rows[0].id;
  return veldenHtml({ rows, bezit, money, gast: !!(world && world.coopRole === 'client'), sel, ticked: ui.sel, sortNaam: ui.sort, vlakken: vlakkenVan(rows) }) + melding();
}
export const teamView = (world) => teamHtml({ bezit: L.getBezit(), money: (world && world.money) || 0, confirm: ui.confirm }) + melding();

// Eén knop van Velden of Team. Geeft niets terug; de melding staat in ui.msg. De aanroeper tekent daarna opnieuw.
export function veldenActie(world, d) {
  const bezit = L.getBezit(), farm = getBoerderij();
  const rows = H.holdingRows(bezit, farm, {});
  const doel = () => (ui.sel.size ? [...ui.sel].filter((id) => rows.some((r) => r.id === id)) : [ui.veld || (rows[0] && rows[0].id)].filter(Boolean));
  const metDoel = (bz, extra = {}) => { const keep = ui.sel; ui.sel = new Set(doel()); try { act(world, { bz, ok: '1', ...extra }, null); } finally { ui.sel = keep; } };
  const a = d.vd;
  if (a === 'kies') { ui.veld = d.id; ui.sel.clear(); ui.msg = ''; }
  else if (a === 'vink') { H.toggleSelect(ui.sel, d.id); if (!ui.veld) ui.veld = d.id; ui.msg = ''; }
  else if (a === 'alles') H.selectRows(ui.sel, rows);
  else if (a === 'niets') H.clearSelection(ui.sel);
  else if (a === 'sort') ui.sort = H.SORTS[(H.SORTS.indexOf(ui.sort) + (Number(d.dir) || 1) + H.SORTS.length) % H.SORTS.length];
  else if (a === 'oogst') metDoel('bulk-oogst');
  else if (a === 'zaai') metDoel('bulk-zaai');
  else if (a === 'gebruik') metDoel({ self: 'bulk-zelf', staff: 'bulk-personeel', leased: 'bulk-verpacht' }[d.mode]);
  else if (a === 'verzeker') metDoel(d.aan === '1' ? 'bulk-verzeker' : 'bulk-onverzeker');
  else if (a === 'mieren') metDoel('bulk-mieren');
  else if (a === 'wespen') metDoel('bulk-wespen');
  else if (a === 'gewas') { const r = H.bulkSetCrop(farm, doel(), d.g); ui.msg = r.done ? `Volgend gewas: ${(B.GEWASSEN[d.g] || {}).naam}.` : 'Dat gewas past niet op dit veld.'; L.markeer(); }
  else if (a === 'arts') ui.msg = L.belArts(world, d.id).text;
  else if (a === 'koop-vee') { const r = L.koopVee(world, d.id, d.sp); ui.msg = r.text; if (r.ok && world.addMessage) world.addMessage(r.text, 3); }
  else if (a === 'verkoop-vee') { if (ui.confirm !== 'vv:' + d.id) { ui.confirm = 'vv:' + d.id; ui.msg = 'Nog een keer drukken om de kudde te verkopen.'; } else { ui.confirm = null; ui.msg = L.verkoopVee(world, d.id).text; } }
  else if (a === 'huur') ui.msg = L.huurArbeider(world, Number(d.skill)).text;
  else if (a === 'ontsla') { if (d.ok === '1') { L.ontslaArbeider(d.id); ui.confirm = null; ui.msg = 'Ontslagen. De percelen van die arbeider staan weer op Zelf.'; } else ui.confirm = `ontsla:${d.id}`; }
  else if (a === 'annuleer') ui.confirm = null;
  else if (a === 'kaart') { const o = L.parcelOffer(d.id); if (o && o.parcel) { import('./routing.js').then((m) => m.setUserWaypoint(o.parcel.x, o.parcel.y, o.name)); ui.msg = `Doel gezet: ${o.name}. Het staat op je kaart.`; } }
  ui.msgAt = ui.msg ? Date.now() : 0;
}

// ---- Bedrijven (bezitbedrijven.js) en Te koop (bezitkoop.js) ----
export function bedrijvenView(world, view) {
  if (!branchOpen('business')) return locked('business');
  const money = (world && world.money) || 0, day = Math.floor(getBoerderij().uren / 24);
  const mine = L.myBusinesses();
  if (!mine.length) return emptyState('winkel', 'Nog geen bedrijf', 'Een pand levert elke speldag omzet of huur, ook als je er niet bent.', ['boerderij:tekoop', 'Bekijk panden te koop'], 'bedrijven') + `<p class="bd-melding" aria-live="polite">${esc(msgNow())}</p>`;
  return bedrijvenHtml({ mine, sel: ui.bk, day, owned: view ? Object.keys(view.bezit.parcels).filter((k) => !view.bezit.parcels[k].lg).length + view.bezit.buildings.size : 0, rentView: L.rentView,
    renoHtml: (m) => renoBtn('reno', m.osm, m.biz, money), verkoopHtml: (m) => askOr('verkoop-pand', m.osm, `Verkopen · ${euro(P.sellValue(m.biz.p))}`, 'Zeker?'), melding: msgNow() });
}
let koopLaatst = [];
export function tekoopView(world, view) {
  if (!branchOpen('land')) return locked('land');
  if (!L.getIndexNow()) return leegTeKoop(true);
  const money = (world && world.money) || 0, p = playerPos(world), bezit = L.getBezit();
  const owned = Object.keys(bezit.parcels).filter((k) => !bezit.parcels[k].lg).length + bezit.buildings.size;
  const alle = L.buildingsNear(p.x, p.y, 600, 20);
  const items = koopItems({ offers: nearbyOffers(world, 30), panden: alle.filter((o) => o.kind && o.kind.type !== 'woning'), woningen: L.homesNear(p.x, p.y, 8), money, owned });
  koopLaatst = items;
  const rows = view ? view.rows : [];
  const vlakken = rows.map((r) => { const o = L.parcelOffer(r.id); return o && o.parcel ? { id: r.id, shape: o.shape, x: o.parcel.x, y: o.parcel.y, statusId: 'eigen', level: 'self', naam: r.name } : null; }).filter(Boolean);
  return koopHtml({ items, sel: ui.koop.sel, soort: ui.koop.soort, sort: ui.koop.sort, money, bevestig: ui.koop.bevestig, dagNu: view ? view.w.perDag : null, vlakken }) + `<p class="bd-melding" aria-live="polite">${esc(msgNow())}</p>`;
}
export function koopActie(world, d) {
  const k = ui.koop, a = d.kp;
  const wissel = (lijst, nu, dir) => lijst[(lijst.indexOf(nu) + (Number(dir) || 1) + lijst.length) % lijst.length];
  if (a === 'kies') { k.sel = d.key; k.bevestig = false; ui.msg = ''; }
  else if (a === 'soort') { k.soort = wissel(SOORTEN, k.soort, d.dir); k.bevestig = false; }
  else if (a === 'sort') k.sort = wissel(SORTEN, k.sort, d.dir);
  else if (a === 'koop') k.bevestig = true;
  else if (a === 'terug') k.bevestig = false;
  else if (a === 'koop-ok') {
    const i = koopLaatst.find((x) => x.key === d.key);
    k.bevestig = false;
    if (i) { act(world, { bz: i.act, id: String(i.id), ok: '1' }, null); k.sel = null; }
  }
  ui.msgAt = ui.msg ? Date.now() : 0;
}
// Vasthouden om te kopen (HOUD_MS): muis, toets (Enter of Spatie) en controller (A is een toets). Een klik zonder vasthouden, zoals de controller die soms doet, telt als de eerste van twee drukken.
export function bindVasthouden(el, world, rerender) {
  if (!el || !el.dataset || el.dataset.houdGebonden) return;
  el.dataset.houdGebonden = '1';
  let timer = null, knop = null, gedaan = false, gewapend = 0;
  const stop = () => { if (timer) clearTimeout(timer); timer = null; if (knop) { knop.classList.remove('is-vasthouden'); knop = null; } };
  const start = (b) => {
    if (timer) return;
    knop = b; gedaan = false; b.classList.add('is-vasthouden');
    timer = setTimeout(() => { timer = null; gedaan = true; const key = b.dataset.houd; stop(); koopActie(world, { kp: 'koop-ok', key }); rerender(); }, HOUD_MS);
  };
  const vind = (e) => (e.target && e.target.closest ? e.target.closest('[data-houd]') : null);
  el.addEventListener('pointerdown', (e) => { const b = vind(e); if (b) { gewapend = 0; start(b); } });
  for (const t of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(t, (e) => { if (knop) stop(); });
  el.addEventListener('keydown', (e) => { const b = vind(e); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (!e.repeat) start(b); } });
  el.addEventListener('keyup', (e) => { if (knop && (e.key === 'Enter' || e.key === ' ')) stop(); });
  el.addEventListener('click', (e) => {
    const b = vind(e); if (!b) return;
    if (gedaan) { gedaan = false; return; }
    // een klik zonder echte aanraking of toets (de controller): de tweede druk binnen vier seconden bevestigt
    if (e.detail === 0) { const nu = Date.now(); if (gewapend && nu - gewapend < 4000) { gewapend = 0; koopActie(world, { kp: 'koop-ok', key: b.dataset.houd }); rerender(); } else { gewapend = nu; ui.msg = 'Druk nog een keer om te kopen.'; ui.msgAt = nu; rerender(); } }
  });
}
