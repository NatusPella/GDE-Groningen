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
import { dsButtonKey } from './dsbutton.js';
import { drillFor } from './voetbaltraining.js';
import { voetbalOpen, voetbalHint } from './voetbalpoort.js';

export const TABS = [['vandaag', 'Vandaag'], ['selectie', 'Selectie'], ['kalender', 'Kalender'], ['stand', 'Stand'], ['training', 'Training']];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const euro = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
const rij = (i) => `style="--ds-m-i:${Math.min(8, i)}"`;
const chip = (tekst, soort = '') => `<span class="ds-z-chip${soort ? ` ds-z-chip--${soort}` : ''}">${esc(tekst)}</span>`;
const bar = (label, deel) => `<span class="ds-z-balk" style="--ds-z-w:${Math.round(Math.max(0, Math.min(1, deel)) * 100)}%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">${esc(label)}</span></span>`;
// Geld weggeven of een speler laten gaan vraagt een tweede druk (zoals het tabblad Club): de eerste druk zet `ui.vraag`, de knop zegt dan "Zeker?".
export const ui = { vraag: null };
export const BEVESTIG = ['share:buy:', 'share:sell:', 'sell:'];
export const vraagtBevestiging = (a) => BEVESTIG.some((p) => String(a).startsWith(p));
const knop = (act, tekst, { primair = false, ghost = false, uit = '' } = {}) => `<button type="button" class="ds-z-knop ds-m-knop${primair ? '' : ghost ? ' ds-z-knop--ghost' : ' ds-z-knop--secundair'}" data-vb="${act}"${uit ? ` aria-disabled="true" title="${esc(uit)}"` : ''}>${esc(ui.vraag === act && !uit ? `Zeker? ${tekst}` : tekst)}</button>`;
const DIV = DIVISION_NAMES;

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
    card = `<article class="ds-z-kaart ds-z-kaart--recht ds-m-binnen on"><h3 class="ds-z-kaart__kop ds-z-kaart__titel">${esc(matchTitle(m))}</h3>` +
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
  const sq = squad.map((q, i) => `<li class="ds-z-rij ds-m-rij${q.protagonist ? ' ds-z-rij--selectie' : ''}" ${rij(i)}${q.id === p.id ? ' aria-current="true"' : ''}><span class="ds-z-rij__naam">${esc(q.name)}</span><span class="ds-z-rij__sub">${esc(ROLE_NAMES[q.role])} · ${q.num}</span><span class="ds-z-rij__waarde">${playerRating(q)}</span></li>`).join('');
  return `<article class="ds-z-kaart ds-m-binnen on"><h3 class="ds-z-kaart__titel">${esc(p.name)} · ${esc(ROLE_NAMES[p.role])}</h3><p>${chip(`rating ${playerRating(p)}`)} ${talenten}</p><ul class="ds-z-lijst vb-vaardig">${attrList}</ul>` +
    `<p class="ds-z-kaart__voet">${esc(mate.name)} speelt mee als teamgenoot en groeit mee, wat langzamer.</p></article>` +
    `<h3 class="ds-z-kaart__titel">Selectie van ${squad.length}</h3><ul class="ds-z-lijst vb-selectie">${sq}</ul>`;
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
  const dr = drillFor(c.focus);
  const oef = dr ? `<p class="ds-z-kaart__tekst">Oefening: ${esc(dr.naam)}. ${esc(dr.kort)}</p>` : '';
  const hoofd = dsButtonKey({ label: `Train: ${dr ? dr.naam : O.FOCUS_NAMES[c.focus]}`, toets: 'ENTER', klasse: 'ds-z-knop ds-m-knop', attrs: `data-vb="train"${reden ? ` aria-disabled="true" title="${esc(reden)}"` : ''}` });
  return `<p>${chip('Een training per speldag')} ${chip('kost 15% energie')} ${chip(`energie nu ${O.energy(c.fatigue)}%`, O.isTired(c.fatigue) ? 'probleem' : '')} ${chip('score 0,5 tot 1,5')}</p><div class="vb-foci">${focusCards}</div>${oef}<p class="vb-acties">${hoofd} ${knop('train:snel', 'Snel trainen (zonder oefening)', { ghost: true, uit: reden })}</p>` +
    `<p class="ds-z-kaart__voet">Een wedstrijd telt als de training van die dag. Hoe dichter bij je plafond, hoe langzamer het gaat. Een goede oefening geeft meer groei dan snel trainen.</p>`;
}
// De uitnodiging of de dichte staat: voor wie de carrière nog niet begon.
// De opstelling kiezen (Trainer en Manager): de beste elf per rol, met een knop per speler om hem vast in de basis te zetten of op de bank te houden. Zonder keuze kiest het spel de beste elf.
function lineupHtml(c, env) {
  const rollen = formationList('groot', c.tactic.formation).map((x) => x.rol);
  const lu = C.lineupOf(c, env.getClub, rollen), pins = C.pinsOf(c);
  const li = (l, i, inBasis) => l.map((q, k) => {
    const vast = pins.start.includes(q.id), bank = pins.bench.includes(q.id);
    const wissel = inBasis ? knop(`pin:bench:${q.id}`, 'Naar de bank', { ghost: true }) : knop(`pin:start:${q.id}`, 'In de basis', { ghost: true });
    const auto = vast || bank ? knop(`pin:auto:${q.id}`, 'Los', { ghost: true }) : '';
    return `<li class="ds-z-rij ds-m-rij" ${rij(k + i)}><span class="ds-z-rij__naam">${esc(q.name)}${vast ? ` ${chip('vast')}` : bank ? ` ${chip('bank')}` : ''}</span><span class="ds-z-rij__sub">${esc(ROLE_NAMES[q.role])}</span><span class="ds-z-rij__waarde">${playerRating(q)} ${wissel} ${auto}</span></li>`;
  }).join('');
  const nog = pins.start.length || pins.bench.length ? `<p class="vb-acties">${knop('pin:all', 'Laat het spel de beste elf kiezen', { ghost: true })}</p>` : '';
  return `<h3 class="ds-z-kaart__titel">Basis (${lu.basis.length})</h3><ul class="ds-z-lijst vb-selectie">${li(lu.basis, 0, true)}</ul><h3 class="ds-z-kaart__titel">Bank (${lu.bank.length})</h3><ul class="ds-z-lijst vb-selectie">${li(lu.bank, 8, false)}</ul>${nog}<p class="ds-z-kaart__voet">Een vaste speler staat in de basis op zijn eigen plek (hooguit ${C.MAX_PINS}); wie op de bank blijft speelt alleen als er niemand anders is.</p>`;
}
function viewTrainer(c, env) {
  const vm = C.TACTICS.formations.map((f) => `<button type="button" class="ds-z-tab" data-vb="tactic:formation:${f}" aria-pressed="${c.tactic.formation === f}">${f}</button>`).join('');
  const st = C.TACTICS.styles.map((f) => `<button type="button" class="ds-z-tab" data-vb="tactic:style:${f}" aria-pressed="${c.tactic.style === f}">${esc(f)}</button>`).join('');
  const m = C.nextMatch(c, env.getClub), kan = m && m.status === 'open', reden = !m ? 'Er is geen wedstrijd' : m.status === 'soon' ? 'Nog niet aan de beurt' : '';
  const coach = `<p class="vb-acties">${knop('coach', 'Coach de wedstrijd', { primair: true, uit: kan ? '' : reden })}</p><p class="ds-z-kaart__voet">Je kijkt toe en past de tactiek onderweg aan (toets 1 speelstijl, toets 2 vorming, om de 40 seconden); alleen computerspelers voetballen. Je speelt dan niet mee.</p>`;
  return `<p>${chip('Je mag blijven spelen')} ${chip('Opstelling en tactiek zijn van jou')}</p>${coach}<h3 class="ds-z-kaart__titel">Vorming</h3><p class="vb-acties">${vm}</p><h3 class="ds-z-kaart__titel">Speelstijl</h3><p class="vb-acties">${st}</p>` +
    `${lineupHtml(c, env)}`;
}
function viewManager(c, env) {
  const cash = C.clubCash(c, env.getClub), venster = T.inBreak(c);
  const marketRows = (c.market.pool || []).slice().sort((a, b) => playerRating(b) - playerRating(a) || (a.id < b.id ? -1 : 1)).map((q, i) => `<li class="ds-z-rij ds-m-rij" ${rij(i)}><span class="ds-z-rij__naam">${esc(q.name)}</span><span class="ds-z-rij__sub">${esc(ROLE_NAMES[q.role])} · rating ${playerRating(q)}</span><span class="ds-z-rij__waarde">${euro(T.priceOf(q))} ${knop(`buy:${q.id}`, 'Koop', { uit: venster ? (T.priceOf(q) > cash ? 'De clubkas is te klein' : '') : 'Alleen in de pauze tussen de seizoenen' })}</span></li>`).join('');
  const eigen = C.squadOf(c, c.club, env.getClub).filter((q) => !q.protagonist).map((q, i) => `<li class="ds-z-rij ds-m-rij" ${rij(i)}><span class="ds-z-rij__naam">${esc(q.name)}</span><span class="ds-z-rij__sub">${esc(ROLE_NAMES[q.role])} · rating ${playerRating(q)}${q.contract != null ? ` · contract nog ${q.contract} seizoen${q.contract === 1 ? '' : 'en'}` : ''}</span><span class="ds-z-rij__waarde">${euro(T.sellPrice(q))} ${q.contract != null && q.contract < T.CONTRACT_MAX ? knop(`renew:${q.id}`, `Verleng (${euro(T.salaryOf(q))})`, { ghost: true, uit: venster ? '' : 'Alleen in de pauze tussen de seizoenen' }) : ''} ${knop(`sell:${q.id}`, 'Verkoop', { uit: venster ? '' : 'Alleen in de pauze tussen de seizoenen' })}</span></li>`).join('');
  const tip = C.managerAdvice(c, env.getClub);
  const tammo = tip ? `<article class="ds-z-kaart ds-z-kaart--bord ds-m-binnen on"><h3 class="ds-z-kaart__titel">Tammo, je zaakwaarnemer</h3><p class="ds-z-kaart__tekst">${esc(`Jullie zijn zwak op de plek van ${ROLE_NAMES[tip.role].toLowerCase()}. ${tip.player.name} (rating ${playerRating(tip.player)}) is transfervrij voor ${euro(tip.price)} en maakt je team ${tip.better} punten sterker daar.`)}</p></article>` : '';
  return `${tammo}<p>${chip(`Clubkas ${euro(cash)}`)} ${chip(venster ? 'Transferperiode: nu' : 'Transferperiode: in de pauze')} ${chip('De kas is van de club, niet van jou')}</p>` +
    `<h3 class="ds-z-kaart__titel">Transfervrije spelers</h3>${marketRows ? `<ul class="ds-z-lijst vb-selectie">${marketRows}</ul>` : '<div class="ds-z-leeg"><p class="ds-z-leeg__kop">Niemand op de markt</p><p class="ds-z-leeg__tekst">Na elk seizoen komen er nieuwe spelers vrij.</p></div>'}` +
    `<h3 class="ds-z-kaart__titel">Jouw selectie</h3><ul class="ds-z-lijst vb-selectie">${eigen}</ul><p class="ds-z-kaart__voet">Verkopen levert hooguit 80% min 10% belasting op: een koop en verkoop kost altijd geld.</p>` + `<h3 class="ds-z-kaart__titel">Opstelling</h3>${lineupHtml(c, env)}` + viewShares(c, env);
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
  const tabId = tabsFor(c).some(([id]) => id === tab) ? tab : 'vandaag';
  const body = { vandaag: viewVandaag, selectie: viewSelectie, kalender: viewKalender, stand: viewTable, training: viewTraining, trainer: viewTrainer, manager: viewManager }[tabId] || viewVandaag;
  return `<div class="ds-zeef vb-pane">${kop(c, ov)}${tabsHtml(tabId, c)}<section class="vb-body ds-m-wissel on" role="tabpanel">${body(c, e)}</section></div>`;
}

// ---- DOM ----
let tab = 'vandaag', host = null, wereld = null, sluit = null;
const CSS = `.vb-pane { display: grid; gap: var(--ds-s-2, 10px); padding: var(--ds-s-3, 14px); }
.vb-kop p, .vb-acties, .vb-stat { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0; }
.vb-foci { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.vb-focus { text-align: left; cursor: pointer; }
.vb-stand, .vb-kalender, .vb-selectie, .vb-vaardig { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.vb-vaardig .ds-z-rij__waarde { min-width: 180px; }
/* #1110 (hertest 22-11): een brede kaart onder 1 graad schuift over de chips en de kop eronder; in de body liggen ze recht en met lucht ertussen */
.vb-body { display: grid; gap: var(--ds-s-3); }
.vb-body > .ds-z-kaart { transform: none; }
.vb-body > h3 { margin: var(--ds-s-2) 0 0; }`;
let cssLoaded = false;
const zetCss = () => { if (cssLoaded || typeof document === 'undefined') return; cssLoaded = true; const el = document.createElement('style'); el.textContent = CSS; document.head.appendChild(el); };
const envFor = (w, progress = {}) => ({ money: w ? w.money || 0 : 0, getClub: V.getClub, unlocked: voetbalOpen(progress), hint: voetbalHint(progress), char: ((w && hoofdspeler(w)) || {}).character === 'tammo' ? 'tammo' : 'anita' });
let progressFn = () => ({});
export function useProgress(fn) { progressFn = typeof fn === 'function' ? fn : () => ({}); }
let launcher = null, coachLauncher = null;
export function registerLauncher(fn) { launcher = fn; }
// De trainingsminigame (voetbaltrainingrun.js) meldt zich hier aan; zonder aanmelding (node-tests, kapotte import) valt Train terug op de snelle training.
let trainer = null;
export function registerTrainer(fn) { trainer = typeof fn === 'function' ? fn : null; }
export function registerCoachLauncher(fn) { coachLauncher = fn; }

export function renderVoetbalPanel(el, w = null, close = null) {
  if (!el) return;
  host = el; if (w) wereld = w; if (close) sluit = close;
  zetCss();
  el.innerHTML = viewHtml(V.getCareer(), tab, envFor(wereld, progressFn()));
  if (!el.dataset.vbAan) {
    el.dataset.vbAan = '1';
    el.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('[data-vb]');
      if (!b) return;
      const reden = uitReden(b);
      if (reden) { if (wereld && wereld.addMessage) wereld.addMessage(reden, 2.5); return; }   // een grijze knop doet niets en zegt waarom
      act(b.dataset.vb, b);
    });
  }
}
// Een uitgeschakelde knop (aria-disabled, met de reden in title) doet niets: de reden is de melding.
export function uitReden(b) { return b && b.getAttribute && b.getAttribute('aria-disabled') === 'true' ? (b.getAttribute('title') || 'Dat kan nu niet') : null; }
// De melding na een actie van het scherm: een weigering zegt waarom, een gelukte koop, verkoop of verlenging zegt wat het kostte of opleverde.
const TRAIN_REDEN = { blessure: 'Je bent geblesseerd', 'vandaag al bezig': 'Vandaag al getraind of gespeeld' };
export function actieBericht(a, r) {
  if (!r) return null;
  if (a === 'sim' && r.ok !== false && r.summary === null) return 'Er is geen wedstrijd om uit te rekenen';
  if (r.ok === false) return TRAIN_REDEN[r.reason] || r.reason || 'Dat kan nu niet';
  if (a.startsWith('buy:') && r.ok) return `Gekocht voor ${euro(r.price)}`;
  if (a.startsWith('sell:') && r.ok) return `Verkocht voor ${euro(r.price)}`;
  if (a.startsWith('renew:') && r.ok) return `Contract verlengd tot ${r.contract} ${r.contract === 1 ? 'seizoen' : 'seizoenen'}`;
  if (a === 'offer:accept' && r.ok) return 'Nieuw contract getekend';
  if (a.startsWith('sponsor:') && r.ok) return 'Sponsor getekend';
  return null;
}
function melding(a, r) { const t = actieBericht(a, r); if (t && wereld && wereld.addMessage) wereld.addMessage(t, 3); }
function act(a) {
  const c = V.getCareer();
  if (vraagtBevestiging(a)) {
    if (ui.vraag !== a) { ui.vraag = a; renderVoetbalPanel(host); return; }     // de eerste druk vraagt, de tweede doet het
    ui.vraag = null;
  } else ui.vraag = null;
  if (a.startsWith('tab:')) { tab = a.slice(4); }
  else if (a === 'start') V.createNew(wereld, envFor(wereld, progressFn()).char);
  else if (a.startsWith('focus:')) V.applyFocus(a.slice(6));
  else if (a === 'train') { if (trainer && trainer(wereld, c.focus)) { if (sluit) sluit(); return; } melding(a, V.trainNow(wereld, c.focus, 0.8)); }
  else if (a === 'train:snel') melding(a, V.trainNow(wereld, c.focus, 0.8));
  else if (a === 'sim') melding(a, V.finishMatch(wereld, null));
  else if (a.startsWith('tactic:')) { const [, k, v] = a.split(':'); V.replaceCareer(C.withTactic(c, k === 'formation' ? { formation: v } : { style: v })); }
  else if (a.startsWith('pin:')) { const [, where, ...rest] = a.split(':'); if (where === 'all') V.replaceCareer(C.clearLineupPins(c)); else { const r = C.setLineupPin(c, rest.join(':'), where, V.getClub); if (r.ok) V.replaceCareer(r.career); else melding(a, r); } }
  else if (a.startsWith('sponsor:')) { const r = C.acceptSponsor(c, a.slice(8), V.getSponsorPandIndex(), V.clubPlace(c.club)); if (r.ok) V.replaceCareer(r.career); melding(a, r); }
  else if (a.startsWith('share:buy:')) { const [, , club, share] = a.split(':'); V.buyShare(wereld, club, Number(share)); }
  else if (a.startsWith('share:sell:')) V.sellShare(wereld, a.slice(11));
  else if (a === 'offer:accept') { const r = C.acceptOffer(c); if (r.ok) V.replaceCareer(r.career); melding(a, r); }
  else if (a === 'offer:decline') V.replaceCareer(C.declineOffer(c));
  else if (a.startsWith('buy:')) { const r = C.managerBuy(c, a.slice(4), V.getClub); if (r.ok) V.replaceCareer(r.career); melding(a, r); }
  else if (a.startsWith('renew:')) { const r = C.managerRenew(c, a.slice(6), V.getClub, 1); if (r.ok) V.replaceCareer(r.career); melding(a, r); }
  else if (a.startsWith('sell:')) { const r = C.managerSell(c, a.slice(5), V.getClub); if (r.ok) V.replaceCareer(r.career); melding(a, r); }
  else if (a === 'play') { if (launcher && launcher(wereld)) { if (sluit) sluit(); return; } melding(a, { ok: false, reason: 'De wedstrijd kan nu niet beginnen' }); }
  else if (a === 'coach') { if (coachLauncher && coachLauncher(wereld)) { if (sluit) sluit(); return; } melding(a, { ok: false, reason: 'De wedstrijd kan nu niet beginnen' }); }
  renderVoetbalPanel(host);
}
export const cardInfo = (c, getClub) => {
  if (!C.hasCareer(c)) return { gestart: false, stand: 'Nog niet begonnen', niveau: 'Talent' };
  const ov = C.summary(c, getClub);
  return { gestart: true, stand: `${ov.divisionName}, plek ${ov.rank}`, niveau: ov.level.naam, volgende: ov.next ? `${matchTitle(ov.next)} ${DAGEN_NL(ov.next.in)}` : 'Pauze tussen de seizoenen' };
};
