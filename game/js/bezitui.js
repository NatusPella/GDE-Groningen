// Het menu Bezit (epic #1095, #1099): de onderdelen Overzicht (beheerscherm met aandachtspunten, percelen, bulkacties en personeel), Bedrijven (je panden
// en de panden dichtbij) en Te koop (de percelen dichtbij) van "Land en bedrijf". De HTML komt uit pure functies (scripts/bezitui_test.mjs); renderBezitPanels
// zet ze in het paneel en bindt de knoppen. DS3-klassen (m-li, m-bt, bd-rij) van de boerderij; elke koop en verkoop vraagt een tweede druk (bevestiging).
// Samen spelen: het bezit en het beheer zijn per speler (#429); een gast ziet en beheert alleen zijn eigen bezit.

import * as L from './bezitlive.js';
import * as H from './holdingsmodel.js';
import * as Z from './bezit.js';
import * as P from './bezitprijs.js';
import { getBoerderij } from './boerderijlive.js';
import { staffOf, staffCapacity, wageOf, SKILL_NAME } from './farmstaff.js';
import { branchOpen, branchClosedText } from './bezitgate.js';
import { euro } from './geldtekst.js';
import { noteMoney } from './finance.js';
import { hoofdspeler } from './players.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ha = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
export const SORT_NAME = { ripe: 'Rijp eerst', name: 'Naam', ha: 'Grootte', income: 'Opbrengst', region: 'Streek' };
const MAX_ROWS = 40;

export const ui = { sort: 'ripe', filter: { region: '', soort: '', level: '' }, sel: H.newSelection(), confirm: null, msg: '', more: false };

const btn = (act, text, extra = '', uit = false) => `<button type="button" class="m-bt" data-bz="${act}"${extra}${uit ? ' disabled' : ''}>${text}</button>`;
const locked = (branch) => `<div class="pm-pane-top"><h2 class="m-h2 td-h2">Nog dicht</h2></div><p class="mut">${esc(branchClosedText(branch))}</p>`;
const confirmKey = (act, id) => `${act}:${id}`;
const askOr = (act, id, text, sure, extra = '', uit = false) => (ui.confirm === confirmKey(act, id)
  ? `<span class="bd-zeker">${sure} ${btn(act, 'Ja', ` data-id="${esc(id)}" data-ok="1"${extra}`)} ${btn('annuleer', 'Nee')}</span>`
  : btn(act, text, ` data-id="${esc(id)}"${extra}`, uit));

// ---- Overzicht ----
export function overviewHtml({ bezit, farm, money = 0, day = 0 } = {}) {
  const rows = H.holdingRows(bezit, farm, { regionOf: (id) => (L.parcelOffer(id) || {}).region });
  const own = rows.filter((r) => !((bezit.parcels[r.id] || {}).lg));
  const sum = H.summarize(rows);
  const points = H.attentionPoints(rows, bezit, farm);
  const staff = staffOf(bezit);
  const shown = H.sortRows(H.filterRows(rows, { region: ui.filter.region || undefined, soort: ui.filter.soort || undefined, level: ui.filter.level || undefined }), ui.sort);
  const opt = H.filterOptions(rows);
  const sel = (key, label, items) => `<label class="bz-sel">${label}<select data-bz-filter="${key}"><option value="">Alles</option>${items.map((v) => `<option value="${esc(v)}"${ui.filter[key] === v ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`;
  const tiles = [['Percelen', own.length], ['Hectare', ha(sum.ha)], ['Panden', bezit.buildings.size], ['Opbrengst per dag', euro(sum.incomeDay)]].map(([k, v]) => `<span class="bz-tegel"><small>${k}</small><b>${v}</b></span>`).join('');
  const attention = points.length ? `<ul class="bz-lijst">${points.map((p) => `<li data-code="${p.code}">${esc(p.tekst)}</li>`).join('')}</ul>` : '<p class="mut">Niets dringends: alles loopt.</p>';
  const body = shown.slice(0, ui.more ? 200 : MAX_ROWS).map((r) => `<div class="bd-rij" data-row="${esc(r.id)}"><label class="bz-chk"><input type="checkbox" data-bz-sel="${esc(r.id)}"${ui.sel.has(r.id) ? ' checked' : ''} aria-label="Kies ${esc(r.name)}"></label>` +
    `<span class="bd-naam"><b>${esc(r.name)}</b><span class="bd-feiten"><span>${esc(r.soort)}</span><span>${ha(r.ha)} ha</span><span>${esc(r.stand)}</span><span>${H.LEVEL_NAME[r.level]}</span>${r.herd ? `<span>${r.herd.n} dieren</span>` : ''}${r.incomeDay ? `<span>${euro(r.incomeDay)} per dag</span>` : ''}</span></span>` +
    `<span class="bd-acties">${btn('doel', 'Doel', ` data-id="${esc(r.id)}"`)}</span></div>`).join('');
  const selN = H.selectedIds(ui.sel, rows).length;
  const bulk = own.length ? `<div class="bz-bulk" role="group" aria-label="Voor de gekozen percelen"><span class="mut">${selN} gekozen</span> ${btn('kies-alles', 'Kies alles in de lijst')} ${btn('kies-niets', 'Kies niets')} ` +
    `${btn('bulk-zaai', 'Zaai alles', '', !selN)} ${btn('bulk-oogst', 'Oogst alles', '', !selN)} ${btn('bulk-zelf', 'Zelf werken', '', !selN)} ${btn('bulk-verpacht', 'Verpachten', '', !selN)} ${btn('bulk-personeel', 'Personeel', '', !selN)}</div>` : '';
  const staffHtml = `<h3 class="m-h3">Personeel</h3><p class="mut">${staff.workers.length} ${staff.workers.length === 1 ? 'medewerker' : 'medewerkers'} · ${staffCapacity(staff)} ha per speldag. Een arbeider haalt hooguit 80% van wat je zelf op het veld haalt: handwerk levert per handeling het meeste.</p>` +
    staff.workers.map((w) => `<div class="bd-rij"><span class="bd-naam"><b>${esc(w.name)}</b><span class="bd-feiten"><span>${SKILL_NAME[w.skill]}</span><span>${euro(wageOf(w))} per dag</span></span></span><span class="bd-acties">${askOr('ontsla', w.id, 'Ontslaan', 'Zeker?')}</span></div>`).join('') +
    `<div class="bz-bulk">${[1, 2, 3].map((k) => btn('huur', `Stel ${SKILL_NAME[k]} aan · ${euro(wageOf({ skill: k }))}`, ` data-skill="${k}"`, money < wageOf({ skill: k }))).join(' ')}</div>`;
  const empty = !own.length && !rows.length ? `<p class="mut">Je hebt nog geen percelen. Open de kaart en kies de laag Te koop, of kijk bij Te koop hier. Een eerste perceel kost ongeveer twee uur werk.</p>` : '';
  return `<div class="pm-pane-top"><span class="m-eb">Land en bedrijf</span><h2 class="m-h2 td-h2">Overzicht</h2></div><div class="bz-tegels">${tiles}</div>${attention}${empty}` +
    `<div class="bz-filters" role="group" aria-label="Sorteren en filteren"><label class="bz-sel">Sorteren<select data-bz-sort>${H.SORTS.map((s) => `<option value="${s}"${ui.sort === s ? ' selected' : ''}>${SORT_NAME[s]}</option>`).join('')}</select></label>` +
    `${sel('region', 'Streek', opt.regions || [])}${sel('soort', 'Soort', opt.soorten || [])}${sel('level', 'Beheer', H.LEVELS)}</div>` + bulk + `<div class="bz-rijen">${body}</div>` +
    (shown.length > MAX_ROWS && !ui.more ? `<p>${btn('meer', `Toon alle ${shown.length}`)}</p>` : '') + staffHtml + `<p class="bd-melding" aria-live="polite">${esc(ui.msg)}</p>`;
}

// ---- Bedrijven ----
export function businessesHtml({ money = 0, mine = [], near = [], day = 0 } = {}) {
  if (!branchOpen('business')) return locked('business');
  const mineHtml = mine.length ? mine.map((m) => {
    const b = m.biz;
    return `<div class="bd-rij" data-osm="${m.osm}"><span class="bd-naam"><b>${esc(m.kind.type)} bij ${esc(m.place)}</b><span class="bd-feiten"><span>onderhoud ${Math.round(b.q)}%</span><span>waarde ${euro(Math.round(b.p))}</span></span></span>` +
      `<span class="bd-acties">${btn('reno', 'Renovatie', ` data-id="${m.osm}"`)} ${askOr('verkoop-pand', m.osm, `Verkoop ${euro(P.sellValue(b.p))}`, 'Zeker?')}</span></div>`;
  }).join('') : '<p class="mut">Je hebt nog geen bedrijf. Koop hieronder een pand in de buurt: een winkel levert elke speldag omzet, ook als je er niet bent.</p>';
  const nearHtml = near.length ? near.map((o) => `<div class="bd-rij" data-osm="${o.osm}"><span class="bd-naam"><b>${esc(o.kind.type)} bij ${esc(o.town.name)}</b><span class="bd-feiten"><span>${Math.round(o.row.m2)} m2</span><span>${o.dist} m</span>${o.forSale ? `<span>${euro(o.price)}</span>` : `<span>${esc(o.reason)}</span>`}</span></span>` +
    `<span class="bd-acties">${o.mine ? '' : o.forSale ? askOr('koop-pand', o.osm, `Koop ${euro(o.price)}`, `Voor ${euro(o.price)}?`, '', money < o.price) : ''}</span></div>`).join('') : '<p class="mut">Er staan geen koopbare bedrijfspanden binnen 250 meter van je.</p>';
  return `<div class="pm-pane-top"><span class="m-eb">Land en bedrijf</span><h2 class="m-h2 td-h2">Bedrijven</h2></div><p class="mut">Monumenten, ziekenhuizen, politie en verhaalgebouwen blijven van de wereld.</p>` +
    `<h3 class="m-h3">Jouw bedrijven</h3>${mineHtml}<h3 class="m-h3">In de buurt</h3>${nearHtml}<p class="bd-melding" aria-live="polite">${esc(ui.msg)}</p>`;
}

// ---- Te koop ----
export function forSaleHtml({ money = 0, offers = [] } = {}) {
  if (!branchOpen('land')) return locked('land');
  const rows = offers.length ? offers.map((o) => `<div class="bd-rij" data-id="${esc(o.id)}"><span class="bd-naam"><b>${esc(o.name)}</b><span class="bd-feiten"><span>${esc(o.kindName)}</span><span>${ha(o.ha)} ha</span><span>bodem ${esc(o.soilWord)}</span><span>${o.dist} m</span><span>${euro(o.price)}</span></span></span>` +
    `<span class="bd-acties">${btn('doel-perceel', 'Doel', ` data-id="${esc(o.id)}"`)} ${askOr('koop-perceel', o.id, `Koop ${euro(o.price)}`, `Voor ${euro(o.price)}?`, '', money < o.price)}</span></div>`).join('') : '<p class="mut">De index van percelen wordt geladen, of er is niets te koop in de buurt. Verklein de kaart voor meer.</p>';
  return `<div class="pm-pane-top"><span class="m-eb">Land en bedrijf</span><h2 class="m-h2 td-h2">Te koop</h2></div><p class="mut">De dichtstbijzijnde percelen. Op de kaart zie je ze allemaal met de laag Te koop. Wie veel land heeft, betaalt meer voor het volgende perceel.</p>${rows}<p class="bd-melding" aria-live="polite">${esc(ui.msg)}</p>`;
}

// ---- de koppeling met de wereld ----
function playerPos(world) { const p = world && hoofdspeler(world); return p && Number.isFinite(p.x) ? { x: p.x, y: p.y } : { x: 0, y: 0 }; }
export function nearbyOffers(world, max = 10) {
  const ix = L.getIndexNow();
  if (!ix) return [];
  const p = playerPos(world);
  return ix.parcels.inRect(p.x - 3000, p.y - 3000, p.x + 3000, p.y + 3000).filter((c) => c.access !== 'geen').map((c) => ({ c, d: Math.hypot(c.x - p.x, c.y - p.y) })).sort((a, b) => a.d - b.d).slice(0, max).map((e) => ({ ...L.parcelOffer(e.c.id), dist: Math.round(e.d) })).filter((o) => o.id && o.forSale);
}

let bound = null;
export function renderBezitPanels(els, world) {
  if (!els) return;
  const bezit = L.getBezit(), farm = getBoerderij();
  const money = (world && world.money) || 0, day = Math.floor(farm.uren / 24);
  L.ensureIndex().then(() => { if (els.rerender) els.rerender(); }).catch(() => {});
  if (els.overzicht) els.overzicht.innerHTML = overviewHtml({ bezit, farm, money, day });
  if (els.bedrijven) { const p = playerPos(world); els.bedrijven.innerHTML = businessesHtml({ money, mine: L.myBusinesses(), near: L.buildingsNear(p.x, p.y), day }); }
  if (els.tekoop) els.tekoop.innerHTML = forSaleHtml({ money, offers: nearbyOffers(world) });
  const redo = () => renderBezitPanels(els, world);
  els.rerender = redo;
  if (bound === world) return;
  bound = world;
  for (const el of [els.overzicht, els.bedrijven, els.tekoop]) {
    if (!el) continue;
    el.addEventListener('change', (e) => {
      const f = e.target.closest('[data-bz-filter]'), s = e.target.closest('[data-bz-sort]'), c = e.target.closest('[data-bz-sel]');
      if (f) ui.filter[f.dataset.bzFilter] = f.value;
      else if (s) ui.sort = s.value;
      else if (c) { if (c.checked) ui.sel.add(c.dataset.bzSel); else ui.sel.delete(c.dataset.bzSel); }
      els.rerender();
    });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-bz]');
      if (!b) return;
      act(world, b.dataset, els);
    });
  }
}

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
  else if (a === 'doel' || a === 'doel-perceel') { const o = L.parcelOffer(id); if (o) { import('./routing.js').then((m) => m.setUserWaypoint(o.parcel.x, o.parcel.y, o.name)); ui.msg = `Doel gezet: ${o.name}.`; } else ui.msg = 'Dit perceel heeft nog geen plek op de kaart.'; }
  else if (a === 'koop-perceel') { if (!ask(a)) { const r = L.koopPerceel(world, id); ui.msg = r.text; if (r.ok && world.addMessage) world.addMessage(r.text, 3); } }
  else if (a === 'koop-pand') { if (!ask(a)) { const r = L.koopPand(world, Number(id)); ui.msg = r.text; if (r.ok && world.addMessage) world.addMessage(r.text, 3); } }
  else if (a === 'verkoop-pand') { if (!ask(a)) ui.msg = L.verkoopPand(world, Number(id)).text; }
  else if (a === 'reno') ui.msg = L.renovatePand(world, Number(id)).text;
  else if (a === 'huur') ui.msg = L.huurArbeider(world, Number(d.skill)).text;
  else if (a === 'ontsla') { if (!ask(a)) { L.ontslaArbeider(id); ui.msg = 'Ontslagen. De percelen van die arbeider staan weer op Zelf.'; } }
  else if (a.startsWith('bulk-')) {
    const ids = H.selectedIds(ui.sel, rows);
    let r = null;
    if (a === 'bulk-zaai') r = H.bulkWork(bezit, farm, ids, 'zaaien', { money: world.money || 0, day: Math.floor(farm.uren / 24) });
    else if (a === 'bulk-oogst') r = H.bulkWork(bezit, farm, ids, 'oogsten', { money: world.money || 0, day: Math.floor(farm.uren / 24) });
    else { r = H.bulkSetMode(bezit, ids, { 'bulk-zelf': 'self', 'bulk-verpacht': 'leased', 'bulk-personeel': 'staff' }[a]); }
    ui.msg = r ? bulkText(a, r) : '';
    if (r && Number.isFinite(r.net) && r.net !== 0) { noteMoney(r.net > 0 ? 'Verkoop' : 'Winkels'); world.money = Math.max(0, (world.money || 0) + r.net); }
    L.markeer();
  }
  if (els && els.rerender) els.rerender();
}
export function bulkText(a, r) {
  const skipped = Object.entries(r.skipped || {}).map(([k, n]) => `${n}x ${k.replace(/-/g, ' ')}`).join(', ');
  const verb = { 'bulk-zaai': 'gezaaid', 'bulk-oogst': 'geoogst', 'bulk-zelf': 'op Zelf gezet', 'bulk-verpacht': 'verpacht', 'bulk-personeel': 'aan personeel gegeven' }[a] || 'gedaan';
  return `${r.done || 0} ${(r.done || 0) === 1 ? 'perceel' : 'percelen'} ${verb}${skipped ? `; overgeslagen: ${skipped}` : ''}.`;
}
