// Het tabblad Club in Land en bedrijf (Bezit, epic #1095; voetbalcarrière #1113): je clubaandelen, het dividend per ronde, een nieuw aandeel in je eigen club en de sponsorpanden.
// Geen eigen opslag: de aandelen staan in het carrièreprofiel (voetbalclub_bezit.js, sleutel gde-voetbalcarriere-v1); dit is een weergave met knoppen die de bestaande koop- en verkoopfuncties
// van de live-laag aanroepen (voetbalcarrierelive.js buyShare, sellShare). Per speler: een aandeel is van jouw profiel en komt mee als je in andermans wereld meedoet (#449).
// De HTML komt uit een pure functie (scripts/clubui_test.mjs); renderClubPanel zet hem in het paneel en bindt de knoppen. DS3-klassen van bezitui.js (m-bt, bd-rij, bz-tegel); een koop of verkoop vraagt een tweede druk.
import * as V from './voetbalcarrierelive.js';
import * as C from './voetbalcarriere.js';
import * as B from './voetbalclub_bezit.js';
import { euro } from './geldtekst.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const cui = { msg: '', confirm: null };
const btn = (act, text, extra = '', uit = false) => `<button type="button" class="m-bt" data-cl="${act}"${extra}${uit ? ' disabled' : ''}>${text}</button>`;
const key = (act, id) => `${act}:${id}`;
const askOr = (act, id, text, sure, extra = '', uit = false) => (cui.confirm === key(act, id)
  ? `<span class="bd-zeker">${sure} ${btn(act, 'Ja', ` data-id="${esc(id)}" data-ok="1"${extra}`)} ${btn('annuleer', 'Nee')}</span>`
  : btn(act, text, ` data-id="${esc(id)}"${extra}`, uit));
const top = (extra = '') => `<div class="pm-pane-top"><span class="m-eb">Land en bedrijf</span><h2 class="m-h2 td-h2">Club</h2></div>${extra}`;

// view = { career, money, getClub, msg, confirm }: zo is de HTML een pure functie van de stand.
export function clubHtml(view) {
  const c = view && view.career, getClub = (view && view.getClub) || (() => null), money = Math.max(0, Math.floor((view && view.money) || 0));
  if (!C.hasCareer(c)) {
    return top('<p class="mut">Je hebt nog geen voetbalcarrière. Zodra je bij een club speelt en genoeg verdiend hebt, kun je hier een aandeel in een club kopen. Begin klein: het eerste aandeel komt na je eerste verdiensten uit het voetbal.</p>');
  }
  if (!B.isVisible(c)) {
    const nodig = C.SHARE_READY_EARNED, nu = (c.stats && c.stats.earned) || 0;
    return top(`<p class="mut">Een aandeel in een club komt later: je verdient eerst ${euro(nodig)} met voetbal (nu ${euro(nu)}) of je wordt manager van je club. Dan kun je hier een deel van de club kopen en dividend ontvangen.</p>`);
  }
  const held = C.clubSharesOf(c), div = C.divisionOfMyClub(c) || 'talent', have = (c.bezit.clubs[c.club] || {}).aandeel || 0;
  const perRonde = C.clubDividends(c, getClub).reduce((a, x) => a + x.amount, 0);
  const tiles = [['Clubs', held.length], ['Dividend per ronde', euro(perRonde)], ['Aanschaf samen', euro(held.reduce((a, h) => a + h.prijs, 0))]].map(([k, v]) => `<span class="bz-tegel"><small>${k}</small><b>${v}</b></span>`).join('');
  const rows = held.map((h) => {
    const sell = Math.round(h.prijs * B.VERKOOP_FACTOR);
    return `<div class="bd-rij" data-row="${esc(h.club)}"><span class="bd-naam"><b>${esc(C.nameOf(getClub, h.club))}</b><span class="bd-feiten"><span>${Math.round(h.aandeel * 100)}%</span><span>sinds speldag ${h.sinds}</span><span>gekocht voor ${euro(h.prijs)}</span></span></span>` +
      `<span class="bd-acties">${askOr('verkoop', h.club, `Verkoop voor ${euro(sell)}`, `Verkopen voor ${euro(sell)}? Dat is 75% van de aankoop.`)}</span></div>`;
  }).join('');
  const buy = B.SHARES.filter((x) => have + x <= 1 + 1e-9).map((x) => {
    const r = B.canBuy(c, c.club, div, x, money), prijs = B.priceOf(div, x, B.ownedCount(c.bezit));
    return askOr('koop', `${c.club}|${x}`, `${Math.round(x * 100)}% voor ${euro(prijs)}`, `${Math.round(x * 100)}% kopen voor ${euro(prijs)}?`, '', !r.ok);
  }).join(' ');
  const sponsors = ((c.sponsors && c.sponsors.slots) || []).filter((s) => s.accepted).map((s) => `<div class="bd-rij" data-sponsor="${esc(s.id)}"><span class="bd-naam"><b>${esc(s.naam)}</b><span class="bd-feiten"><span>${euro(s.amount)} bij het doel</span><span>${s.paid ? 'uitbetaald' : 'loopt'}</span><span>${Number.isFinite(s.osm) ? 'pand gevonden: koop het bij Bedrijven' : 'nog geen pand'}</span></span></span></div>`).join('');
  const msg = (view && view.msg) || '';
  return top(`<div class="bz-tegels">${tiles}</div>${msg ? `<p class="mut" role="status">${esc(msg)}</p>` : ''}`) +
    `<h3 class="m-h3">Jouw aandelen</h3>${rows || '<p class="mut">Nog geen aandelen. Een aandeel keert per competitieronde een deel van de winst uit (rustig, geen snelle geldmachine); verkopen levert 75% op.</p>'}` +
    `<h3 class="m-h3">Koop een deel van ${esc(C.nameOf(getClub, c.club))}</h3><p class="mut">Je koopt nooit je spaargeld leeg: een kwart van je geld blijft over.</p><div class="bz-bulk">${buy || '<span class="mut">Je bezit de hele club.</span>'}</div>` +
    `<h3 class="m-h3">Sponsors</h3>${sponsors || '<p class="mut">Geen sponsors aangenomen. Een sponsor vraag je aan in je voetbalcarrière; zijn pand (met een verzonnen naam) kun je kopen bij Bedrijven, met hooguit 10% klantenbonus op wedstrijddagen.</p>'}`;
}

const bound = new WeakSet();
export function renderClubPanel(el, world) {
  if (!el) return;
  const draw = () => { el.innerHTML = clubHtml({ career: V.getCareer(), money: world && world.money, getClub: V.getClub, msg: cui.msg, confirm: cui.confirm }); };
  draw();
  if (bound.has(el)) return;
  bound.add(el);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cl]');
    if (!b) return;
    act(world, b.dataset);
    draw();
  });
}
function act(world, d) {
  const a = d.cl, id = d.id || '', ok = d.ok === '1';
  const ask = (name) => { if (!ok) { cui.confirm = key(name, id); cui.msg = ''; return true; } cui.confirm = null; return false; };
  if (a === 'annuleer') cui.confirm = null;
  else if (a === 'koop') { if (!ask(a)) { const [club, share] = id.split('|'); const r = V.buyShare(world, club, Number(share)); cui.msg = r.ok ? `Aandeel gekocht voor ${euro(r.price)}.` : r.reason || 'Dat lukt nu niet.'; } }
  else if (a === 'verkoop') { if (!ask(a)) { const r = V.sellShare(world, id); cui.msg = r.ok ? `Aandeel verkocht voor ${euro(r.price)}.` : r.reason || 'Dat lukt nu niet.'; } }
}
