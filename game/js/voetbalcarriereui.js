// Het kindscherm Voetbal onder Loopbanen (#1110, epic #1106, docs/VOETBAL-CARRIERE-21-11.md hoofdstuk 9): de schermen Vandaag, Selectie, Kalender, Stand en Training in DS3 (zomerse zeefdruk,
// `.ds-z-*` en de microanimaties `.ds-m-*`, geen eigen componenten of kleuren). De HTML komt uit pure functies (testbaar in node: scripts/voetbal_ui_test.mjs); renderVoetbalPanel zet hem in de DOM en
// luistert op `data-vb`. Hoofdknop per scherm: een primaire (geel), de rest stil; toetsenbord, controller en aanraken doen hetzelfde (gewone knoppen); Esc of B gaat terug (pausemenu).
// Niet door een mens in beeld bekeken (zie docs/VOETBAL-CARRIERE-VERIFICATIE-21-11.md).
import { hoofdspeler } from './players.js';
import * as C from './voetbalcarriere.js';
import * as O from './voetbalontwikkeling.js';
import * as A from './voetbalagenda.js';
import { ATTRS, ATTR_NAMES, ROLE_NAMES, TALENTS, attrCap, playerRating } from './voetbalplayers.js';
import { DIVISION_NAMES } from './voetbalclubs.js';
import { proposal, inviteBeat } from './voetbalbeats.js';
import { ROUNDS } from './voetbalseason.js';
import * as T from './voetbaltransfers.js';
import * as Sp from './voetbalsponsors.js';
import { formationList } from './voetbalrules.js';
import * as V from './voetbalcarrierelive.js';
import * as B from './voetbalclub_bezit.js';
import { voetbalOpen, voetbalHint } from './voetbalpoort.js';

export const TABS = [['vandaag', 'Vandaag'], ['selectie', 'Selectie'], ['kalender', 'Kalender'], ['stand', 'Stand'], ['training', 'Training']];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const euro = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
const rij = (i) => `style="--ds-m-i:${Math.min(8, i)}"`;
const chip = (tekst, soort = '') => `<span class="ds-z-chip${soort ? ` ds-z-chip--${soort}` : ''}">${esc(tekst)}</span>`;
const bar = (label, deel) => `<span class="ds-z-balk" style="--ds-z-w:${Math.round(Math.max(0, Math.min(1, deel)) * 100)}%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">${esc(label)}</span></span>`;
const knop = (act, tekst, { primair = false, ghost = false, uit = '' } = {}) => `<button type="button" class="ds-z-knop ds-m-knop${primair ? '' : ghost ? ' ds-z-knop--ghost' : ' ds-z-knop--secundair'}" data-vb="${act}"${uit ? ` aria-disabled="true" title="${esc(uit)}"` : ''}>${esc(tekst)}</button>`;
export const DIV = DIVISION_NAMES;

const DAGEN_NL = (d) => A.dayText(d);
const KIND = { league: 'Competitie', cup: 'Dijkbeker', europe: 'Waddenbeker' };
const matchTitle = (m) => `${KIND[m.kind]} ${m.kind === 'league' ? `ronde ${m.n}` : m.n}`;

// De kop met club, klasse en plek: bovenaan elk scherm.
function kop(c, ov) {
  const form = ov.formArrow, icon = O.formIcon(ov.form);
  return `<header class="vb-kop ds-m-binnen on"><h2 class="ds-z-kaart__titel">${esc(ov.club)}</h2>` +
    `<p>${chip(ov.divisionName)} ${chip(`plek ${ov.rank} van 8`)} ${chip(`vorm ${icon} ${form}`)} ${chip(`rol ${C.ROLES[c.role]}`)}</p></header>`;
}
const tabsFor = (c) => [...TABS, ...(c && c.roles && c.roles.trainer ? [['trainer', 'Trainer']] : []), ...(c && c.roles && c.roles.manager ? [['manager', 'Manager']] : [])];
const tabsHtml = (tab, c) => `<nav class="ds-z-tabs ds-m-tabs vb-tabs" role="tablist" aria-label="Voetbal">${tabsFor(c).map(([id, naam]) => `<button type="button" role="tab" class="ds-z-tab" data-vb="tab:${id}" aria-selected="${id === tab}">${esc(naam)}</button>`).join('')}</nav>`;

// ---- schermen ----
function viewVandaag(c, env) {
  const m = env.match, ov = env.ov;
  const voorstel = proposal(c, m);
  let card;
  if (!m) card = `<div class="ds-z-leeg"><p class="ds-z-leeg__kop">Seizoen ${c.seasonNr} loopt ten einde</p><p class="ds-z-leeg__tekst">Na de pauze begint het volgende seizoen. Train nog een keer.</p></div>`;
  else {
    const venue = m.isHome ? 'thuis' : 'uit';
    const wanneer = m.status === 'open' ? 'Nu te spelen' : m.status === 'missed' ? 'Voorbij: de club rekent hem uit' : DAGEN_NL(m.in).replace(/^./, (x) => x.toUpperCase());
    const winPay = C.payFor(ov.division, m.kind, 'winst', true).reduce((a, x) => a + x.amount, 0), vast = C.payFor(ov.division, m.kind, 'verlies', false).reduce((a, x) => a + x.amount, 0);
    card = `<article class="ds-z-kaart ds-m-binnen on"><h3 class="ds-z-kaart__kop ds-z-kaart__titel">${esc(matchTitle(m))}</h3>` +
      `<p class="ds-z-kaart__tekst"><strong>${esc(m.opponentName)}</strong> (${venue})${m.travelDays > 1 ? ' · verre rit: twee speldagen' : ''}</p>` +
      `<p>${chip(wanneer, m.status === 'open' ? 'primair' : '')} ${chip(vast ? `uitrekenen ${euro(vast)}` : 'uitrekenen niets')} ${chip(winPay ? `winnen ${euro(winPay)}` : 'winnen geen bonus')}</p>` +
      `<p class="ds-z-kaart__voet">${esc(m.isHome ? 'Thuis spelen is gratis.' : 'Uit spelen is een korte reis.')}</p></article>`;
  }
  const speel = m && m.status === 'open' && m.canPlay;
  const reden = !m ? 'Er is geen wedstrijd' : c.injury ? c.injury.text : m.status === 'soon' ? 'Nog niet aan de beurt' : '';
  const stat = `<p class="vb-stat">${chip(`energie ${O.energy(c.fatigue)}%`, O.isTired(c.fatigue) ? 'probleem' : '')} ${c.injury ? chip(c.injury.text, 'probleem') : ''} ${chip(`rating ${ov.rating}`)}</p>`;
  const reg = voorstel ? `<article class="ds-z-kaart ds-z-kaart--bord ds-m-binnen on"><p class="ds-z-kaart__tekst"><strong>${esc(voorstel.wie)}</strong>: ${esc(voorstel.tekst)}</p></article>` : '';
  const bod = c.offer ? `<article class="ds-z-kaart ds-z-kaart--bord ds-m-binnen on"><h3 class="ds-z-kaart__titel">Een club biedt</h3><p class="ds-z-kaart__tekst"><strong>${esc(C.nameOf(env.getClub, c.offer.club))}</strong> biedt een contract van ${c.offer.seasons} seizoen${c.offer.seasons === 1 ? '' : 'en'}. Jij kiest, geen druk.</p><p class="vb-acties">${knop('offer:accept', 'Bod aannemen', { uit: c.evDone === 0 ? '' : 'Alleen aan het begin van een seizoen' })} ${knop('offer:decline', 'Blijven', { ghost: true })}</p></article>` : '';
  const spons = c.sponsors && c.sponsors.slots.length ? `<h3 class="ds-z-kaart__titel">Sponsors dit seizoen</h3><ul class="ds-z-lijst vb-selectie">${c.sponsors.slots.map((x, i) => `<li class="ds-z-rij ds-m-rij" ${rij(i)}><span class="ds-z-rij__naam">${esc(x.naam)}</span><span class="ds-z-rij__sub">${esc(Sp.SORTS[x.sort].naam)} · ${esc(Sp.GOALS[x.goal].tekst)}</span><span class="ds-z-rij__waarde">${euro(x.amount)} ${x.paid ? chip('Betaald', 'succes') : x.accepted ? chip('Aangenomen') : knop(`sponsor:${x.id}`, 'Neem aan', { ghost: true })}</span></li>`).join('')}</ul>` : '';
  return `${bod}${card}${stat}<p class="vb-acties">${knop('play', 'Speel de wedstrijd', { primair: true, uit: speel ? '' : reden })} ${knop('sim', 'Laat uitrekenen', { uit: m && (m.status === 'open' || m.status === 'missed') ? '' : reden || 'Nog niet aan de beurt' })} ${knop('tab:training', 'Naar training', { ghost: true })}</p>${reg}${spons}`;
}
const bal = (naam, v, cap) => `<li class="ds-z-rij ds-m-rij"><span class="ds-z-rij__naam">${esc(naam)}</span><span class="ds-z-rij__waarde">${bar(`${v} van ${cap}`, v / 100)}</span></li>`;
function viewSelectie(c, env) {
  const p = c.me, mate = c.mate;
  const attrList = ATTRS.map((k, i) => bal(ATTR_NAMES[k], p.attrs[k], attrCap(p, k))).join('');
  const talenten = p.talents.length ? p.talents.map((t) => chip(TALENTS[t].naam)).join(' ') : chip('Nog geen talent');
  const squad = C.squadOf(c, c.club, env.getClub).slice().sort((a, b) => playerRating(b) - playerRating(a));
  const sq = squad.slice(0, 18).map((q, i) => `<li class="ds-z-rij ds-m-rij${q.protagonist ? ' ds-z-rij--selectie' : ''}" ${rij(i)}${q.id === p.id ? ' aria-current="true"' : ''}><span class="ds-z-rij__naam">${esc(q.name)}</span><span class="ds-z-rij__sub">${esc(ROLE_NAMES[q.role])} · ${q.num}</span><span class="ds-z-rij__waarde">${playerRating(q)}</span></li>`).join('');
  return `<article class="ds-z-kaart ds-m-binnen on"><h3 class="ds-z-kaart__titel">${esc(p.name)} · ${esc(ROLE_NAMES[p.role])}</h3><p>${chip(`rating ${playerRating(p)}`)} ${talenten}</p><ul class="ds-z-lijst vb-vaardig">${attrList}</ul>` +
    `<p class="ds-z-kaart__voet">${esc(mate.name)} speelt mee als teamgenoot en groeit mee, wat langzamer.</p></article>` +
    `<h3 class="ds-z-kaart__titel">Selectie van 18</h3><ul class="ds-z-lijst vb-selectie">${sq}</ul>`;
}
function viewTable(c, env) {
  const st = C.leagueTable(c);
  const n = st.rows.length;
  const rows = st.rows.map((r, i) => {
    const mijn = r.id === c.club;
    const up = st.division !== 'kroon' && r.plek <= 2, down = r.plek > n - 2;
    const mark = up ? '↑ promotie' : down ? '↓ degradatie' : '';
    return `<li class="ds-z-rij ds-m-rij${mijn ? ' ds-z-rij--selectie' : ''}" ${rij(i)}${mijn ? ' aria-current="true"' : ''}><span class="ds-z-rij__naam">${r.plek}. ${esc(C.nameOf(env.getClub, r.id))}</span><span class="ds-z-rij__sub">${r.g} gespeeld · doelsaldo ${r.saldo >= 0 ? '+' : ''}${r.saldo}${mark ? ` · ${mark}` : ''}</span><span class="ds-z-rij__waarde">${r.p} p</span></li>`;
  }).join('');
  const extra = c.cup ? `<p>${chip(`Dijkbeker: ${c.cup.done ? (c.cup.winner === c.club ? 'gewonnen' : 'afgelopen') : c.cup.alive.includes(c.club) ? 'nog in de race' : 'uitgeschakeld'}`)}</p>` : '';
  const eu = c.europe ? `<p>${chip(`Waddenbeker: ${c.europe.winner === c.club ? 'gewonnen' : c.europe.alive.includes(c.club) ? 'nog in de race' : 'uitgeschakeld'}`)}</p>` : '';
  return `<h3 class="ds-z-kaart__titel">${esc(DIV[st.division])} · ronde ${st.round} van ${ROUNDS}</h3><ol class="ds-z-lijst vb-stand">${rows}</ol>${extra}${eu}`;
}
function viewKalender(c, env) {
  const div = C.divisionOfMyClub(c) || 'talent';
  const lg = c.leagues[div];
  const mijn = [];
  for (const r of lg.results) { const d = r.find((x) => x[0] === c.club || x[1] === c.club); if (d) mijn.push(d); }
  const items = c.cal.map((ev, i) => {
    const isDone = i < c.evDone;
    let tekst = '', sub = `dag ${ev.day}`;
    if (isDone && ev.kind === 'league') { const d = mijn[ev.n - 1]; if (d) tekst = `${C.nameOf(env.getClub, d[0])} ${d[2]}-${d[3]} ${C.nameOf(env.getClub, d[1])}`; }
    else if (isDone) tekst = (c.last && c.last.kind === ev.kind) ? c.last.text : 'Gespeeld';
    else if (i === c.evDone && env.match) tekst = `${env.match.opponentName} (${env.match.isHome ? 'thuis' : 'uit'})`;
    else tekst = 'Nog niet bekend';
    return `<li class="ds-z-rij ds-m-rij${i === c.evDone ? ' ds-z-rij--selectie' : ''}" ${rij(i)}><span class="ds-z-rij__naam">${esc(KIND[ev.kind])} ${ev.kind === 'league' ? `ronde ${ev.n}` : ev.n}</span><span class="ds-z-rij__sub">${esc(sub)} · ${isDone ? 'gespeeld' : i === c.evDone ? 'volgende' : 'komt'}</span><span class="ds-z-rij__waarde">${esc(tekst)}</span></li>`;
  }).join('');
  const res = c.result ? `<article class="ds-z-kaart ds-z-kaart--bord ds-m-binnen on"><p class="ds-z-kaart__tekst">Vorig seizoen (${c.result.nr}): ${esc(DIV[c.result.division])} plek ${c.result.rank}, ${esc(c.result.outcome.replace('-', ' en '))}.</p></article>` : '';
  return `<h3 class="ds-z-kaart__titel">Seizoen ${c.seasonNr}</h3><ol class="ds-z-lijst vb-kalender">${items}</ol>${res}<p class="ds-z-kaart__voet">Een ronde elke 3 speldagen. Pauze tussen de seizoenen: ${A.BREAK_DAYS} speldagen.</p>`;
}
function viewTraining(c) {
  const done = !O.canTrain(c, c.day - c.seasonStart);
  const focusCards = ATTRS.map((k, i) => {
    const v = c.me.attrs[k], cap = attrCap(c.me, k), sel = c.focus === k;
    return `<button type="button" class="ds-z-kaart ds-z-kaart--klik ds-m-rij vb-focus${sel ? ' ds-z-kaart--selectie' : ''}" ${rij(i)} data-vb="focus:${k}" aria-pressed="${sel}"><span class="ds-z-kaart__titel">${esc(O.FOCUS_NAMES[k])}</span><span class="ds-z-kaart__tekst">${esc(ATTR_NAMES[k])}</span>${bar(`${v} van ${cap}`, v / cap)}</button>`;
  }).join('');
  const reden = c.injury ? c.injury.text : done ? 'Vandaag al getraind of gespeeld' : '';
  return `<p>${chip('Een training per speldag')} ${chip('kost 15% energie')}</p><div class="vb-foci">${focusCards}</div><p class="vb-acties">${knop('train', `Train: ${O.FOCUS_NAMES[c.focus]}`, { primair: true, uit: reden })}</p>` +
    `<p class="ds-z-kaart__voet">Een wedstrijd telt als de training van die dag. Hoe dichter bij je plafond, hoe langzamer het gaat.</p>`;
}
// De uitnodiging of de dichte staat: voor wie de carrière nog niet begon.
function viewTrainer(c, env) {
  const rollen = formationList('groot', c.tactic.formation).map((x) => x.rol);
  const lu = C.lineupOf(c, env.getClub, rollen);
  const vm = C.TACTICS.formations.map((f) => `<button type="button" class="ds-z-tab" data-vb="tactic:formation:${f}" aria-pressed="${c.tactic.formation === f}">${f}</button>`).join('');
  const st = C.TACTICS.styles.map((f) => `<button type="button" class="ds-z-tab" data-vb="tactic:style:${f}" aria-pressed="${c.tactic.style === f}">${esc(f)}</button>`).join('');
  const li = (l, i) => l.map((q, k) => `<li class="ds-z-rij ds-m-rij" ${rij(k + i)}><span class="ds-z-rij__naam">${esc(q.name)}</span><span class="ds-z-rij__sub">${esc(ROLE_NAMES[q.role])}</span><span class="ds-z-rij__waarde">${playerRating(q)}</span></li>`).join('');
  const m = C.nextMatch(c, env.getClub), kan = m && m.status === 'open', reden = !m ? 'Er is geen wedstrijd' : m.status === 'soon' ? 'Nog niet aan de beurt' : '';
  const coach = `<p class="vb-acties">${knop('coach', 'Coach de wedstrijd', { primair: true, uit: kan ? '' : reden })}</p><p class="ds-z-kaart__voet">Je kijkt toe en past de tactiek onderweg aan (toets 1 speelstijl, toets 2 vorming, om de 40 seconden); alleen computerspelers voetballen. Je speelt dan niet mee.</p>`;
  return `<p>${chip('Je mag blijven spelen')} ${chip('Opstelling en tactiek zijn van jou')}</p>${coach}<h3 class="ds-z-kaart__titel">Vorming</h3><p class="vb-acties">${vm}</p><h3 class="ds-z-kaart__titel">Speelstijl</h3><p class="vb-acties">${st}</p>` +
    `<h3 class="ds-z-kaart__titel">Basis (${lu.basis.length})</h3><ul class="ds-z-lijst vb-selectie">${li(lu.basis, 0)}</ul><h3 class="ds-z-kaart__titel">Bank (${lu.bank.length})</h3><ul class="ds-z-lijst vb-selectie">${li(lu.bank, 8)}</ul>`;
}
function viewManager(c, env) {
  const cash = C.clubCash(c, env.getClub), venster = T.inBreak(c);
  const marketRows = (c.market.pool || []).map((q, i) => `<li class="ds-z-rij ds-m-rij" ${rij(i)}><span class="ds-z-rij__naam">${esc(q.name)}</span><span class="ds-z-rij__sub">${esc(ROLE_NAMES[q.role])} · rating ${playerRating(q)}</span><span class="ds-z-rij__waarde">${euro(T.priceOf(q))} ${knop(`buy:${q.id}`, 'Koop', { uit: venster ? (T.priceOf(q) > cash ? 'De clubkas is te klein' : '') : 'Alleen in de pauze tussen de seizoenen' })}</span></li>`).join('');
  const eigen = C.squadOf(c, c.club, env.getClub).filter((q) => !q.protagonist).slice(0, 18).map((q, i) => `<li class="ds-z-rij ds-m-rij" ${rij(i)}><span class="ds-z-rij__naam">${esc(q.name)}</span><span class="ds-z-rij__sub">${esc(ROLE_NAMES[q.role])} · rating ${playerRating(q)}${q.contract != null ? ` · contract nog ${q.contract} seizoen${q.contract === 1 ? '' : 'en'}` : ''}</span><span class="ds-z-rij__waarde">${euro(T.sellPrice(q))} ${q.contract != null && q.contract < T.CONTRACT_MAX ? knop(`renew:${q.id}`, `Verleng (${euro(T.salaryOf(q))})`, { ghost: true, uit: venster ? '' : 'Alleen in de pauze tussen de seizoenen' }) : ''} ${knop(`sell:${q.id}`, 'Verkoop', { uit: venster ? '' : 'Alleen in de pauze tussen de seizoenen' })}</span></li>`).join('');
  const tip = C.managerAdvice(c, env.getClub);
  const tammo = tip ? `<article class="ds-z-kaart ds-z-kaart--bord ds-m-binnen on"><h3 class="ds-z-kaart__titel">Tammo, je zaakwaarnemer</h3><p class="ds-z-kaart__tekst">${esc(`Jullie zijn zwak op de plek van ${ROLE_NAMES[tip.role].toLowerCase()}. ${tip.player.name} (rating ${playerRating(tip.player)}) is transfervrij voor ${euro(tip.price)} en maakt je team ${tip.better} punten sterker daar.`)}</p></article>` : '';
  return `${tammo}<p>${chip(`Clubkas ${euro(cash)}`)} ${chip(venster ? 'Transferperiode: nu' : 'Transferperiode: in de pauze')} ${chip('De kas is van de club, niet van jou')}</p>` +
    `<h3 class="ds-z-kaart__titel">Transfervrije spelers</h3>${marketRows ? `<ul class="ds-z-lijst vb-selectie">${marketRows}</ul>` : '<div class="ds-z-leeg"><p class="ds-z-leeg__kop">Niemand op de markt</p><p class="ds-z-leeg__tekst">Na elk seizoen komen er nieuwe spelers vrij.</p></div>'}` +
    `<h3 class="ds-z-kaart__titel">Jouw selectie</h3><ul class="ds-z-lijst vb-selectie">${eigen}</ul><p class="ds-z-kaart__voet">Verkopen levert hooguit 80% min 10% belasting op: een koop en verkoop kost altijd geld.</p>` + viewShares(c, env);
}
// Clubaandelen (#1113): pas zichtbaar na het eerste aandeel of de manager-ontgrendeling; je koopt nooit je spaargeld leeg (een kwart blijft over).
function viewShares(c, env) {
  if (!B.isVisible(c)) return '';
  const div = C.divisionOfMyClub(c) || 'talent', have = (c.bezit.clubs[c.club] || {}).aandeel || 0, money = Math.floor((env && env.money) || 0);
  const buy = B.SHARES.filter((x) => have + x <= 1 + 1e-9).map((x) => { const r = B.canBuy(c, c.club, div, x, money); return knop(`share:buy:${c.club}:${x}`, `${Math.round(x * 100)}% voor ${euro(B.priceOf(div, x, B.ownedCount(c.bezit)))}`, { uit: r.ok ? '' : r.reason }); }).join(' ');
  const rows = C.clubSharesOf(c).map((h, i) => `<li class="ds-z-rij ds-m-rij" ${rij(i)}><span class="ds-z-rij__naam">${esc(C.nameOf(env.getClub, h.club))}</span><span class="ds-z-rij__sub">${Math.round(h.aandeel * 100)}% sinds speldag ${h.sinds}</span><span class="ds-z-rij__waarde">${knop(`share:sell:${h.club}`, `Verkoop ${euro(Math.round(h.prijs * B.VERKOOP_FACTOR))}`, { ghost: true })}</span></li>`).join('');
  return `<h3 class="ds-z-kaart__titel">Clubaandelen</h3><p>${chip('Rustig inkomen per ronde')} ${chip('Verkopen levert 75% op')}</p>${rows ? `<ul class="ds-z-lijst vb-selectie">${rows}</ul>` : ''}<p class="vb-acties">${buy}</p>`;
}
function viewUitnodiging(c, env) {
  if (!env.unlocked) return `<div class="ds-z-leeg"><p class="ds-z-leeg__kop">De voetbalcarrière komt later</p><p class="ds-z-leeg__tekst">${esc(env.hint || 'Dit komt later in het verhaal.')} De Euroborg en de penaltyserie kun je nu al spelen.</p></div>`;
  const b = inviteBeat(c, { unlocked: true, busy: false, day: -1 }, env.char || 'anita');
  const t = b ? `<strong>${esc(b.wie)}</strong>: ${esc(b.tekst)}` : 'De club hier in de buurt zoekt spelers.';
  return `<article class="ds-z-kaart ds-z-kaart--bord ds-m-binnen on"><h3 class="ds-z-kaart__titel">Een avondje trainen</h3><p class="ds-z-kaart__tekst">${t}</p><p>${chip('Talentenklasse')} ${chip('Begin klein')} ${chip('Blessures uit te zetten')}</p></article>` +
    `<p class="vb-acties">${knop('start', 'Aannemen', { primair: true })}</p><p class="ds-z-kaart__voet">Je speelt als ${env.char === 'tammo' ? 'Tammo' : 'Tessa'}; de ander regelt de papieren en speelt mee.</p>`;
}
export function viewHtml(c, tab, env) {
  if (!C.hasCareer(c)) return `<div class="ds-zeef vb-pane">${viewUitnodiging(c, env)}</div>`;
  const ov = C.summary(c, env.getClub);
  const e = { ...env, ov, match: C.nextMatch(c, env.getClub) };
  const body = { vandaag: viewVandaag, selectie: viewSelectie, kalender: viewKalender, stand: viewTable, training: viewTraining, trainer: viewTrainer, manager: viewManager }[tab] || viewVandaag;
  return `<div class="ds-zeef vb-pane">${kop(c, ov)}${tabsHtml(tab, c)}<section class="vb-body ds-m-wissel" role="tabpanel">${body(c, e)}</section></div>`;
}

// ---- DOM ----
let tab = 'vandaag', host = null, wereld = null, sluit = null;
const CSS = `.vb-pane { display: grid; gap: var(--ds-s-2, 10px); padding: var(--ds-s-3, 14px); }
.vb-kop p, .vb-acties, .vb-stat { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0; }
.vb-foci { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.vb-focus { text-align: left; cursor: pointer; }
.vb-stand, .vb-kalender, .vb-selectie, .vb-vaardig { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.vb-vaardig .ds-z-rij__waarde { min-width: 180px; }`;
let cssLoaded = false;
const zetCss = () => { if (cssLoaded || typeof document === 'undefined') return; cssLoaded = true; const el = document.createElement('style'); el.textContent = CSS; document.head.appendChild(el); };
const envFor = (w, progress = {}) => ({ money: w ? w.money || 0 : 0, getClub: V.getClub, unlocked: voetbalOpen(progress), hint: voetbalHint(progress), char: ((w && hoofdspeler(w)) || {}).character === 'tammo' ? 'tammo' : 'anita' });
let progressFn = () => ({});
export function useProgress(fn) { progressFn = typeof fn === 'function' ? fn : () => ({}); }
let launcher = null, coachLauncher = null;
export function registerLauncher(fn) { launcher = fn; }
export function registerCoachLauncher(fn) { coachLauncher = fn; }

export function renderVoetbalPanel(el, w = null, close = null) {
  if (!el) return;
  host = el; if (w) wereld = w; if (close) sluit = close;
  zetCss();
  el.innerHTML = viewHtml(V.getCareer(), tab, envFor(wereld, progressFn()));
  if (!el.dataset.vbAan) {
    el.dataset.vbAan = '1';
    el.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-vb]'); if (b) act(b.dataset.vb, b); });
  }
}
function act(a) {
  const c = V.getCareer();
  if (a.startsWith('tab:')) { tab = a.slice(4); }
  else if (a === 'start') V.createNew(wereld, envFor(wereld, progressFn()).char);
  else if (a.startsWith('focus:')) V.applyFocus(a.slice(6));
  else if (a === 'train') V.trainNow(wereld, c.focus, 0.8);
  else if (a === 'sim') V.finishMatch(wereld, null);
  else if (a.startsWith('tactic:')) { const [, k, v] = a.split(':'); V.replaceCareer(C.withTactic(c, k === 'formation' ? { formation: v } : { style: v })); }
  else if (a.startsWith('sponsor:')) { const r = C.acceptSponsor(c, a.slice(8), V.getSponsorPandIndex(), V.clubPlace(c)); if (r.ok) V.replaceCareer(r.career); }
  else if (a.startsWith('share:buy:')) { const [, , club, share] = a.split(':'); V.buyShare(wereld, club, Number(share)); }
  else if (a.startsWith('share:sell:')) V.sellShare(wereld, a.slice(11));
  else if (a === 'offer:accept') { const r = C.acceptOffer(c); if (r.ok) V.replaceCareer(r.career); }
  else if (a === 'offer:decline') V.replaceCareer(C.declineOffer(c));
  else if (a.startsWith('buy:')) { const r = C.managerBuy(c, a.slice(4), V.getClub); if (r.ok) V.replaceCareer(r.career); }
  else if (a.startsWith('renew:')) { const r = C.managerRenew(c, a.slice(6), V.getClub, 1); if (r.ok) V.replaceCareer(r.career); }
  else if (a.startsWith('sell:')) { const r = C.managerSell(c, a.slice(5), V.getClub); if (r.ok) V.replaceCareer(r.career); }
  else if (a === 'play') { if (launcher && launcher(wereld)) { if (sluit) sluit(); return; } }
  else if (a === 'coach') { if (coachLauncher && coachLauncher(wereld)) { if (sluit) sluit(); return; } }
  renderVoetbalPanel(host);
}
export const voetbalBegonnen = () => C.hasCareer(V.getCareer());
export const cardInfo = (c, getClub) => {
  if (!C.hasCareer(c)) return { gestart: false, stand: 'Nog niet begonnen', niveau: 'Talent' };
  const ov = C.summary(c, getClub);
  return { gestart: true, stand: `${ov.divisionName}, plek ${ov.rank}`, niveau: ov.level.naam, volgende: ov.next ? `${matchTitle(ov.next)} ${DAGEN_NL(ov.next.in)}` : 'Pauze tussen de seizoenen' };
};
