// Het kindscherm Voetbal onder Loopbanen (#1110, epic #1106, docs/VOETBAL-CARRIERE-21-11.md hoofdstuk 9) in DS3, vernieuwd volgens docs/ontwerp/CLUB-UI-24-11.md: een kopband met wapen en status, echte tabs met een onderstreping
// (Overzicht, Selectie, Tactiek, Stand, Kalender, Training, Club), een held-kaart voor de volgende wedstrijd, een selectietabel met zijpaneel, een formatieveld, een stand met kolommen en zones en de Club-kaarten (clubui.js).
// Vier soorten dingen zien er anders uit: status is platte tekst, navigatie een onderstreping, een keuze een segmentknop met vinkje, een actie een knop (één gele per scherm). De HTML komt uit pure functies (testbaar in node:
// scripts/voetbal_ui_test.mjs); renderVoetbalPanel zet hem in de DOM en luistert op `data-vb`. Toetsenbord, controller en aanraken doen hetzelfde (gewone knoppen); Esc of B gaat terug (pausemenu).
// Samen spelen: het Clubhuis is van de speler zelf; een gast ziet Meedoen-uitleg in plaats van Speel de wedstrijd en kan de tactiek en de transfers van de host niet wijzigen (env.samen).
import { keyTextHtml } from './keycap.js';
import { hoofdspeler } from './players.js';
import * as C from './voetbalcarriere.js';
import * as O from './voetbalontwikkeling.js';
import * as A from './voetbalagenda.js';
import * as S from './voetbalseason.js';
import { ATTRS, ATTR_NAMES, ROLE_NAMES, TALENTS, attrCap, playerRating } from './voetbalplayers.js';
import { DIVISION_NAMES } from './voetbalclubs.js';
import { proposal, inviteBeat } from './voetbalbeats.js';
import { ROUNDS } from './voetbalseason.js';
import * as T from './voetbaltransfers.js';
import { formationList } from './voetbalrules.js';
import * as V from './voetbalcarrierelive.js';
import * as B from './voetbalclub_bezit.js';
import * as KIT from './footballkit.js';
import { dsButtonKey } from './dsbutton.js';
import { drillFor } from './voetbaltraining.js';
import { voetbalOpen, voetbalHint } from './voetbalpoort.js';
import { crestOf, clubBodyHtml, clubAct, clubKeys, kitPhotos, cui } from './clubui.js';
import { trackTabLine } from './dsmicro.js';

export const TABS = [['overzicht', 'Overzicht'], ['selectie', 'Selectie'], ['tactiek', 'Tactiek'], ['stand', 'Stand'], ['kalender', 'Kalender'], ['training', 'Training'], ['club', 'Club']];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const euro = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
const rij = (i) => `style="--ds-m-i:${Math.min(8, i)}"`;
const chip = (tekst, soort = '') => `<span class="ds-z-chip${soort ? ` ds-z-chip--${soort}` : ''}">${esc(tekst)}</span>`;
const bar = (label, deel, rij = false) => `<span class="ds-z-balk${rij ? ' ds-z-balk--rij' : ''}" style="--ds-z-w:${Math.round(Math.max(0, Math.min(1, deel)) * 100)}%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">${esc(label)}</span></span>`;
// Geld weggeven of een speler laten gaan vraagt een tweede druk (zoals het tabblad Club): de eerste druk zet `ui.vraag`, de knop zegt dan "Zeker?".
// `sel` is de gekozen speler in Selectie, `slot` de gekozen plek op het veld, `filter` de positie in de tabel, `liga` de klasse in de stand, `deel` het segment Selectie of Transfers.
export const ui = { vraag: null, sel: null, slot: null, filter: 'alle', liga: null, deel: 'selectie' };
export const BEVESTIG = ['share:buy:', 'share:sell:', 'sell:'];
export const vraagtBevestiging = (a) => BEVESTIG.some((p) => String(a).startsWith(p));
const knop = (act, tekst, { primair = false, ghost = false, uit = '' } = {}) => `<button type="button" class="ds-z-knop ds-m-knop${primair ? '' : ghost ? ' ds-z-knop--ghost' : ' ds-z-knop--secundair'}" data-vb="${act}"${uit ? ` aria-disabled="true" title="${esc(uit)}"` : ''}>${esc(ui.vraag === act && !uit ? `Zeker? ${tekst}` : tekst)}</button>`;
const link = (act, tekst, uit = '') => `<button type="button" class="ds-z-link" data-vb="${act}"${uit ? ` aria-disabled="true" title="${esc(uit)}"` : ''}>${esc(tekst)}</button>`;
const tussen = (t, rest = '') => `<h3 class="ds-z-tussenkop">${t}${rest}</h3>`;
// Een segmentknop: een keuze uit weinig; de gekozen staat heeft een vinkje (CSS) en aria-checked, een dichte keuze zegt waarom.
const segment = (naam, items, { uit = '', klasse = '' } = {}) => `<div class="ds-z-segment${klasse ? ` ${klasse}` : ''}" role="radiogroup" aria-label="${esc(naam)}">${items.map(([act, tekst, aan, inhoud]) => `<button type="button" role="radio" data-vb="${act}" aria-checked="${!!aan}"${uit ? ` aria-disabled="true" title="${esc(uit)}"` : ''}>${inhoud || esc(tekst)}</button>`).join('')}</div>`;
const DIV = DIVISION_NAMES;
const POS = { keeper: 'K', verdediger: 'V', middenvelder: 'M', aanvaller: 'A' };
const pos = (role) => `<span class="vb-pos vb-pos--${POS[role].toLowerCase()}" title="${esc(ROLE_NAMES[role])}">${POS[role]}</span>`;
const WGV = { W: 'winst', G: 'gelijk', V: 'verlies' };
const pips = (s, n = 5, groot = false) => { const a = [...s].map((x) => `<i class="${x.toLowerCase()}" title="${WGV[x]}">${x}</i>`); while (a.length < n) a.push('<i class="n" title="nog niet gespeeld">–</i>'); return `<span class="vb-vorm${groot ? ' vb-vorm--l' : ''}" role="img" aria-label="Vorm: ${s ? [...s].map((x) => WGV[x]).join(', ') : 'nog niet gespeeld'}">${a.join('')}</span>`; };
const TREND = { stijgend: ['op', '↑'], dalend: ['neer', '↓'], stabiel: ['gelijk', '→'] };
const trend = (woord, kort = false) => { const [k, pijl] = TREND[woord] || TREND.stabiel; return `<span class="vb-trend vb-trend--${k}"${kort ? ` title="Vorm ${woord}" aria-label="${woord}"` : ''}>${pijl}${kort ? '' : ` <span>${woord}</span>`}</span>`; };
const teken = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const delta = (n) => `<span class="vb-delta vb-delta--${n > 0 ? 'op' : n < 0 ? 'neer' : 'gelijk'}">${n > 0 ? '▲' : n < 0 ? '▼' : '▬'} ${teken(n)}</span>`;
const feit = (n, l) => `<div class="ds-z-feit"><span class="ds-z-feit__n">${n}</span><span class="ds-z-feit__l">${l}</span></div>`;

const DAGEN_NL = (d) => A.dayText(d);
const KIND = { league: 'Competitie', cup: 'Dijkbeker', europe: 'Waddenbeker' };
const matchTitle = (m) => `${KIND[m.kind]} ${m.kind === 'league' ? `ronde ${m.n}` : m.n}`;
const crest = (c, env, id, maat) => crestOf(c, env.getClub, id, maat);
const leagueOf = (c, id) => { const d = S.divisionOf(c.world, id); return d && c.leagues[d] ? c.leagues[d] : null; };

// De kopband met wapen, clubnaam, klasse en plek; rechts de status (plek, vorm, geld). Groot op Overzicht, compact op de andere tabs.
function kop(c, ov, env, compact) {
  const lg = c.leagues[ov.division], n = lg ? lg.clubs.length : 8, vorm = S.formOf(lg, c.club);
  return `<header class="ds-z-kopband${compact ? ' ds-z-kopband--compact' : ''} ds-m-binnen on">${crest(c, env, c.club, compact ? 'm' : 'l')}<div><h2 class="ds-z-kopband__titel">${esc(ov.club)}</h2>` +
    `<p class="ds-z-kopband__sub"><b>${esc(ov.divisionName)}</b><span>plek ${ov.rank} van ${n}</span><span>·</span><span>ronde ${Math.min(ov.round + 1, ROUNDS)} van ${ROUNDS}</span></p></div>` +
    `<div class="ds-z-kopband__rechts"><div class="ds-z-status ds-z-status--blok"><span class="ds-z-status__l">Plek</span><span class="ds-z-status__w">${ov.rank}<small>van ${n}</small></span></div><div class="ds-z-status ds-z-status--blok"><span class="ds-z-status__l">Vorm</span><span class="ds-z-status__w">${pips(vorm)}</span></div>` +
    `<div class="ds-z-status ds-z-status--blok"><span class="ds-z-status__l">Geld</span><span class="ds-z-status__w">${euro(env.money || 0)}</span></div></div></header>`;
}
const tabsFor = () => TABS;
const tabsHtml = (tab, c, env) => `<nav class="ds-m-tabs vb-tabs" role="tablist" aria-label="Voetbal"><i class="ds-m-tabs__lijn" aria-hidden="true"></i>${tabsFor(c).map(([id, naam]) => `<button type="button" role="tab" class="vb-tab" data-vb="tab:${id}" aria-selected="${id === tab}">${esc(naam)}${id === 'club' && nieuweSponsors(c) ? '<i class="vb-tab__punt" aria-label="nieuw"></i>' : ''}</button>`).join('')}</nav>`;
const nieuweSponsors = (c) => !!(c.sponsors && c.sponsors.slots && c.sponsors.slots.some((x) => !x.accepted && !x.paid));

// ---- schermen ----
const samenUit = (env) => { const s = env.samen; return s && s.gast ? `Wie het spel opende start de wedstrijd${s.host ? ` (${s.host})` : ''}; jij kiest zelf of je meedoet` : ''; };
function viewOverzicht(c, env) {
  const m = env.match, ov = env.ov, samen = env.samen || {};
  const voorstel = proposal(c, m);
  let card;
  if (!m) card = `<div class="ds-z-leeg"><p class="ds-z-leeg__kop">Seizoen ${c.seasonNr} loopt ten einde</p><p class="ds-z-leeg__tekst">Na de pauze begint het volgende seizoen. Train nog een keer.</p><button type="button" class="ds-z-knop" data-vb="tab:training">Naar training</button></div>`;
  else {
    const wanneer = m.status === 'open' ? 'Nu te spelen' : m.status === 'missed' ? 'Voorbij: de club rekent hem uit' : DAGEN_NL(m.in).replace(/^./, (x) => x.toUpperCase());
    const pay = C.payOverview(ov.division, m.kind), look = C.matchOutlook(c, env.getClub, m);
    const plaats = m.stadium ? (m.stadium === 'euroborg' ? 'Euroborg' : String(m.stadium)) : m.parkPlaats ? `Sportpark ${m.parkPlaats}` : '';
    const lgMy = leagueOf(c, c.club), lgOpp = leagueOf(c, m.opponent);
    const rankMy = lgMy ? S.rankOf(lgMy, c.club) : 0, rankOpp = lgOpp && lgOpp === lgMy ? S.rankOf(lgOpp, m.opponent) : 0;
    const team = (id, naam, thuis, rank, vorm, uit) => `<div class="vb-team${uit ? ' vb-team--uit' : ''}">${crest(c, env, id, 'l')}<div><h3 class="vb-team__naam">${esc(kort(env, id, naam))}</h3><p class="vb-team__vol">${esc(naam)}</p><p class="vb-team__sub"><span class="vb-thuisuit">${thuis ? 'Thuis' : 'Uit'}</span>${rank ? `<span>plek ${rank}</span>` : ''}${pips(vorm)}</p></div></div>`;
    const mijn = team(c.club, ov.club, m.isHome, rankMy, S.formOf(lgMy, c.club), !m.isHome), tegen = team(m.opponent, m.opponentName, !m.isHome, rankOpp, S.formOf(lgOpp, m.opponent), m.isHome);
    const speelTekst = m.kind === 'league'
      ? `Winst levert ${euro(pay.winst)}, gelijk ${euro(pay.gelijk)}, verlies ${euro(pay.verlies)}.` : `Winst levert ${euro(pay.winst)}, gelijk ${euro(pay.gelijk)}, verlies ${euro(pay.verlies)}; alleen meedoen levert ${euro(pay.verlies)}.`;
    const speel = m.status === 'open' && m.canPlay && !(samen.gast) && !samen.bezig;
    const reden = c.injury ? c.injury.text : m.status === 'soon' ? 'Nog niet aan de beurt' : !m ? 'Er is geen wedstrijd' : '';
    const playUit = speel ? '' : samenUit(env) || (samen.bezig ? 'De wedstrijd loopt nu' : reden);
    const simUit = samen.bezig ? 'De wedstrijd loopt nu' : m && (m.status === 'open' || m.status === 'missed') ? '' : reden || 'Nog niet aan de beurt';
    const hoofd = dsButtonKey({ label: 'Speel de wedstrijd', toets: 'ENTER', klasse: 'ds-z-knop ds-m-knop', attrs: `data-vb="play"${playUit ? ` aria-disabled="true" title="${esc(playUit)}"` : ''}` });
    const links = `<div class="vb-keuze vb-keuze--groot">${hoofd}<ul class="vb-uitleg"><li><b>Je speelt zelf mee.</b> Wat je doet telt als training van vandaag.</li><li>${esc(speelTekst)}</li></ul></div>`;
    const rechts = `<div class="vb-keuze">${knop('sim', 'Laat uitrekenen', { uit: simUit })}<ul class="vb-uitleg"><li>De club speelt zonder jou.</li><li class="kost">${pay.uitrekenen ? `Levert ${euro(pay.uitrekenen)} vergoeding, geen bonus.` : 'Levert niets op.'}</li></ul><span>${link('tab:training', 'Eerst trainen')}</span></div>`;
    const gastRegel = samen.gast || samen.bezig ? keyTextHtml(`<div class="vb-notitie"><b>${esc(samen.host || 'Wie het spel opende')}</b>${samen.bezig ? ' speelt nu een wedstrijd. Doe mee met {J}, sla over met {N}.' : ' start de wedstrijden in deze wereld. Jij krijgt Meedoen ({J} of {N}).'}</div>`) : '';
    card = `${gastRegel}<article class="ds-z-kaart ds-z-kaart--recht vb-hero ds-m-binnen on"><div class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">Volgende wedstrijd</h3><span>${esc(matchTitle(m))}${m.travelDays > 1 ? ' · verre rit: twee speldagen' : ''}</span></div>` +
      `<div class="vb-hero__teams">${m.isHome ? mijn : tegen}<div class="vb-hero__mid"><span class="vb-tegen">Tegen</span><b>${esc(wanneer)}</b>${plaats ? `<small>${esc(plaats)}</small>` : ''}</div>${m.isHome ? tegen : mijn}</div>` +
      `<div class="vb-vergelijk"><span><b>${m.isHome ? look.mine : look.theirs}</b> sterkte</span><span class="vb-vergelijk__l">${esc(look.zin)}${m.isHome ? '' : ' · uit spelen is een korte reis'}</span><span style="text-align:right"><b>${m.isHome ? look.theirs : look.mine}</b> sterkte</span></div>` +
      `<div class="vb-hero__keuze">${links}${rechts}</div></article>`;
  }
  const reg = voorstel ? `<div class="vb-notitie"><b>${esc(voorstel.wie)}:</b> <span>${esc(voorstel.tekst)}</span> ${link('tab:training', 'Training')}</div>` : '';
  const bod = c.offer ? `<article class="ds-z-kaart ds-z-kaart--bord ds-m-binnen on"><h3 class="ds-z-kaart__titel">Een club biedt</h3><p class="ds-z-kaart__tekst"><strong>${esc(C.nameOf(env.getClub, c.offer.club))}</strong> biedt een contract van ${c.offer.seasons} seizoen${c.offer.seasons === 1 ? '' : 'en'}. Jij kiest, geen druk.</p><p class="vb-acties">${knop('offer:accept', 'Bod aannemen', { uit: c.evDone === 0 ? '' : 'Alleen aan het begin van een seizoen' })} ${knop('offer:decline', 'Blijven', { ghost: true })}</p></article>` : '';
  return `${bod}<div class="vb-raster"><div class="vb-kolom">${card}${reg}</div><div class="vb-kolom">${standKlein(c, env)}${spelerKaart(c, env)}</div></div>`;
}
// Een korte clubnaam voor een kop: de clubdata heeft `kort`; een naam zonder data blijft de volle naam.
const kort = (env, id, naam) => { const k = env.getClub(id); return (k && k.kort) || naam; };
function standKlein(c, env) {
  const st = C.leagueTable(c), n = st.rows.length;
  const m = env.match, opp = m && m.opponent;
  const show = st.rows.filter((r) => r.plek <= 3 || r.id === c.club || r.id === opp).slice(0, 5);
  const rows = show.map((r) => { const mijn = r.id === c.club; return `<tr class="${mijn ? 'jij' : ''}"><td class="nr">${r.plek}</td><td class="naam"><span>${crest(c, env, r.id, 'xs')}<span>${esc(kort(env, r.id, C.nameOf(env.getClub, r.id)))}</span>${mijn ? '<b class="vb-jij">JIJ</b>' : r.id === opp ? '<b class="vb-jij">TEGEN</b>' : ''}</span></td><td>${r.g}</td><td class="pt">${r.p}</td></tr>`; }).join('');
  return `<section>${tussen('Stand', link('tab:stand', 'Alles'))}<div class="vb-tabel-vak"><table class="ds-z-tabel vb-mini"><thead><tr><th>#</th><th class="l">Club</th><th>Gesp.</th><th>Ptn</th></tr></thead><tbody>${rows}</tbody></table></div><p class="vb-tip">${esc(DIV[st.division])} · ${n} clubs</p></section>`;
}
function spelerKaart(c, env) {
  const p = c.me, rating = playerRating(p), ov = env.ov;
  const sq = C.squadOf(c, c.club, env.getClub).find((q) => q.id === p.id) || p;
  const spons = nieuweSponsors(c) ? `<p class="vb-tip">Er zijn sponsors die op antwoord wachten. ${link('tab:club', 'Naar Club')}</p>` : '';
  return `<section>${tussen('Jouw speler')}<div class="vb-speler-kop"><span class="vb-nr">${sq.num || ''}</span><div><h3>${esc(p.name)}</h3><p>${pos(p.role)}<span>${esc(ROLE_NAMES[p.role])}</span>${c.injury ? `<span class="vb-blessure">${esc(c.injury.text)}</span>` : ''}</p></div><div class="vb-rating"><b>${rating}</b><small>rating</small></div></div>` +
    `<div class="vb-veldrij"><span class="vb-veldrij__l">Energie</span>${bar(`${O.energy(c.fatigue)}%`, O.energy(c.fatigue) / 100, true)}</div><div class="vb-veldrij"><span class="vb-veldrij__l">Vorm</span><span class="vb-feit">${trend(ov.formArrow)}</span></div>${spons}</section>`;
}

// ---- Selectie ----
const FILTERS = [['alle', 'Alle'], ['keeper', 'K'], ['verdediger', 'V'], ['middenvelder', 'M'], ['aanvaller', 'A']];
function statRij(naam, v, team, cap, d) {
  return `<div class="vb-stat" style="--team:${Math.round(team)}%;--cap:${Math.min(100, cap)}%"><span class="vb-stat__naam">${esc(naam)}</span><span class="vb-stat__spoor"><span class="ds-z-balk" style="--ds-z-w:${v}%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span></span><i class="vb-stat__team"></i><i class="vb-stat__cap"></i></span><span class="vb-stat__w">${v}</span>${delta(d)}</div>`;
}
function viewSelectie(c, env) {
  const squad = C.squadOf(c, c.club, env.getClub).slice().sort((a, b) => (a.num | 0) - (b.num | 0));
  const gekozen = squad.find((q) => q.id === ui.sel) || squad.find((q) => q.id === c.me.id) || squad[0];
  const lijst = squad.filter((q) => ui.filter === 'alle' || q.role === ui.filter);
  const avg = Object.fromEntries(ATTRS.map((k) => [k, squad.reduce((s, q) => s + q.attrs[k], 0) / squad.length]));
  const teamRating = Math.round(squad.reduce((s, q) => s + playerRating(q), 0) / squad.length);
  const rows = lijst.map((q, i) => {
    const jij = q.id === c.me.id, mate = q.id === c.mate.id, kies = q.id === gekozen.id;
    return `<tr class="ds-m-rij${kies ? ' gekozen' : ''}" ${rij(i)}${kies ? ' aria-selected="true"' : ''}><td class="nr">${q.num || ''}</td><td class="naam"><button type="button" class="vb-celknop" data-vb="sel:${esc(q.id)}" aria-pressed="${kies}"><span>${esc(q.name)}${jij ? '<b class="vb-jij">JIJ</b>' : mate ? '<b class="vb-jij vb-jij--stil">TEAMGENOOT</b>' : ''}</span></button></td><td class="c">${pos(q.role)}</td><td class="pt">${playerRating(q)}</td></tr>`;
  }).join('');
  const jijIs = gekozen.id === c.me.id, mateIs = gekozen.id === c.mate.id;
  const fase = jijIs ? c.phase : mateIs ? c.mphase : null;
  const groei = fase ? ATTRS.map((k) => [k, fase[k] | 0]).filter(([, n]) => n > 0) : [];
  const som = groei.reduce((s, [, n]) => s + n, 0), beste = groei.slice().sort((a, b) => b[1] - a[1])[0];
  const stats = ATTRS.map((k) => statRij(ATTR_NAMES[k], gekozen.attrs[k], avg[k], attrCap(gekozen, k), Math.round(gekozen.attrs[k] - avg[k]))).join('');
  const talenten = (gekozen.talents || []).filter((t) => TALENTS[t]);
  const zwakste = ATTRS.map((k) => [k, gekozen.attrs[k] / attrCap(gekozen, k)]).sort((a, b) => a[1] - b[1])[0][0];
  const zij = `<aside class="vb-zij ds-m-binnen on" aria-label="Geselecteerde speler"><div class="vb-speler-kop"><span class="vb-nr">${gekozen.num || ''}</span><div><h3>${esc(gekozen.name)}${jijIs ? ' <b class="vb-jij">JIJ</b>' : ''}</h3><p>${pos(gekozen.role)}<span>${esc(ROLE_NAMES[gekozen.role])}</span>${jijIs ? trend(env.ov.formArrow) : ''}${jijIs && c.injury ? `<span class="vb-blessure">${esc(c.injury.text)}</span>` : ''}</p></div><div class="vb-rating"><b>${playerRating(gekozen)}</b><small>team ${teamRating}</small></div></div>` +
    `${tussen('Vaardigheden')}${stats}<div class="vb-sleutel"><span><i class="tick"></i>teamgemiddelde</span><span><i class="cap"></i>plafond</span></div>` +
    (fase ? `${tussen('Groei deze fase')}<div class="vb-groei"><div><span>Punten erbij</span><b>+${som}</b></div><div><span>Meeste groei</span><b>${beste ? `${esc(ATTR_NAMES[beste[0]])} +${beste[1]}` : '–'}</b></div><div><span>Per vaardigheid hooguit</span><b>${O.PHASE_CAP}</b></div></div>` : '') +
    (talenten.length ? `${tussen('Talent')}<ul class="vb-uitleg">${talenten.map((t) => `<li><b>${esc(TALENTS[t].naam)}:</b> ${esc(TALENTS[t].uitleg)}</li>`).join('')}</ul>` : '') +
    (jijIs ? `<div class="vb-acties">${link(`trainfocus:${zwakste}`, `Train ${ATTR_NAMES[zwakste]}`)}</div>` : '') + `</aside>`;
  const filter = segment('Positie', FILTERS.map(([id, t]) => [`filter:${id}`, t, ui.filter === id]));
  const delen = c.roles && c.roles.manager ? segment('Onderdeel', [['deel:selectie', 'Selectie', ui.deel === 'selectie'], ['deel:transfers', 'Transfers', ui.deel === 'transfers']]) : '';
  const links = `<div class="vb-selkolom"><div class="vb-selbalk">${delen}${filter}<span class="vb-tip">${squad.length} spelers</span></div><div class="vb-tabel-vak vb-tabel-vak--scroll"><table class="ds-z-tabel vb-sel"><thead><tr><th class="c">#</th><th class="l">Naam</th><th class="c">Pos.</th><th>Rating</th></tr></thead><tbody class="vb-selectie on">${rows}</tbody></table></div></div>`;
  return `<div class="vb-twee">${links}${zij}</div>`;
}

// ---- Stand ----
function viewStand(c, env) {
  const div = ui.liga && c.leagues[ui.liga] ? ui.liga : C.divisionOfMyClub(c) || 'talent';
  const mijnKlasse = C.divisionOfMyClub(c) || 'talent';
  const st = C.leagueTable(c, div), lg = c.leagues[div], n = st.rows.length;
  const rows = st.rows.map((r) => {
    const mijn = r.id === c.club, z = S.zonesFor(div, r.plek, n), opp = env.match && env.match.opponent === r.id;
    const naam = C.nameOf(env.getClub, r.id);
    return `<tr class="ds-m-rij ${z.op ? 'zone-op' : z.neer ? 'zone-neer' : ''}${mijn ? ' jij' : ''}" ${rij(r.plek)}${mijn ? ' aria-current="true"' : ''}><td class="nr">${r.plek}</td><td class="naam"><span>${crest(c, env, r.id, 's')}<span>${esc(naam)}</span>${mijn ? '<b class="vb-jij">JIJ</b>' : opp ? '<b class="vb-jij">TEGEN</b>' : ''}</span></td><td>${r.g}</td><td>${r.w}</td><td>${r.gl}</td><td>${r.v}</td><td>${teken(r.saldo)}</td><td class="pt">${r.p}</td><td class="l">${pips(S.formOf(lg, r.id))}</td></tr>`;
  }).join('');
  const legenda = `<div class="vb-legenda">${div !== 'kroon' ? '<span><i></i>↑ Promotie: de top twee</span>' : ''}${div !== 'talent' ? '<span><i class="neer"></i>↓ Degradatie: de onderste twee</span>' : ''}<span>W winst · Gel. gelijk · V verlies · DS doelsaldo</span></div>`;
  const tabel = `<div><div class="vb-tabel-vak"><table class="ds-z-tabel vb-standtabel"><thead><tr><th class="c">#</th><th class="l">Club</th><th>Gesp.</th><th>W</th><th>Gel.</th><th>V</th><th>DS</th><th>Ptn</th><th class="l">Vorm</th></tr></thead><tbody class="vb-stand on">${rows}</tbody></table></div>${legenda}</div>`;
  const bekerWoord = (ko, ja, nee) => (ko.winner === c.club ? ja : nee);
  const bekers = [];
  if (c.cup) bekers.push(`<p class="vb-feit">${c.cup.done ? (c.cup.winner === c.club ? '<span class="vb-ja">✓ Gewonnen</span>' : '<span class="vb-nee">Afgelopen</span>') : c.cup.alive.includes(c.club) ? '<span class="vb-ja">✓ Nog in de race</span>' : '<span class="vb-nee">Uitgeschakeld</span>'}<span>Dijkbeker</span></p>`);
  if (c.europe) bekers.push(`<p class="vb-feit">${c.europe.winner === c.club ? '<span class="vb-ja">✓ Gewonnen</span>' : c.europe.alive.includes(c.club) ? '<span class="vb-ja">✓ Nog in de race</span>' : '<span class="vb-nee">Uitgeschakeld</span>'}<span>Waddenbeker</span></p>`);
  const res = c.result ? `<section>${tussen('Vorig seizoen')}<p class="vb-tip vb-groot">${esc(DIV[c.result.division])}, plek ${c.result.rank}: ${esc(c.result.outcome.replace('-', ' en '))}.</p></section>` : '';
  const zij = `<div class="vb-kolom"><section>${tussen('Jouw seizoen')}<div class="vb-feiten">${feit(`${S.rankOf(c.leagues[mijnKlasse], c.club)}<small>e</small>`, `plek van ${c.leagues[mijnKlasse].clubs.length}`)}${feit(`${Math.min(c.leagues[mijnKlasse].round, ROUNDS)}<small>/${ROUNDS}</small>`, 'rondes gespeeld')}</div></section>${bekers.length ? `<section>${tussen('Bekers')}${bekers.join('')}</section>` : ''}${res}</div>`;
  const kies = segment('Klasse', ['kroon', 'terp', 'talent'].filter((d) => c.leagues[d]).map((d) => [`liga:${d}`, DIV[d] + (d === mijnKlasse ? ' · jouw klasse' : ''), d === div]));
  return `<div class="vb-selbalk">${kies}<span class="vb-tip">Ronde ${Math.min(st.round, ROUNDS)} van ${ROUNDS} gespeeld</span></div><div class="vb-standraster">${tabel}${zij}</div>`;
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
  const res = c.result ? `<div class="vb-notitie"><span>Vorig seizoen (${c.result.nr}): ${esc(DIV[c.result.division])} plek ${c.result.rank}, ${esc(c.result.outcome.replace('-', ' en '))}.</span></div>` : '';
  return `${tussen(`Seizoen ${c.seasonNr}`)}<ol class="ds-z-lijst vb-kalender on">${items}</ol>${res}<p class="vb-tip">Een ronde elke 3 speldagen. Pauze tussen de seizoenen: ${A.BREAK_DAYS} speldagen.</p>`;
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
  return `<p class="vb-feiten-regel"><span class="vb-feit"><small>Per speldag</small><b>1 training</b></span><span class="vb-feit"><small>Kost</small><b>15% energie</b></span><span class="vb-feit"><small>Energie nu</small><b>${O.energy(c.fatigue)}%</b></span></p>${tussen('Kies je focus')}<div class="vb-foci on">${focusCards}</div>${oef}<p class="vb-acties">${hoofd} ${knop('train:snel', 'Snel trainen (zonder oefening)', { ghost: true, uit: reden })}</p>` +
    `<p class="vb-tip">Een wedstrijd telt als de training van die dag. Hoe dichter bij je plafond, hoe langzamer het gaat. Een goede oefening geeft meer groei dan snel trainen.</p>`;
}

// ---- Tactiek: het formatieveld, de vorming en de speelstijl als segment, de bank met kandidaten ----
const miniVorming = (f) => { const l = formationList('groot', f); return `<svg class="vb-vorming__mini" viewBox="0 0 60 48" aria-hidden="true"><rect x="1" y="1" width="58" height="46" rx="3" class="vb-mini__rand"/>${l.map((x) => `<circle cx="${30 + x.u * 25}" cy="${42 - x.d * 38}" r="3.2" class="vb-mini__punt"/>`).join('')}</svg>`; };
const veldLijnen = () => '<svg class="vb-veld__lijnen" viewBox="0 0 68 80" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="64" height="76"/><path d="M2 40H66"/><circle cx="34" cy="40" r="8"/><rect x="14" y="62" width="40" height="16"/><rect x="14" y="2" width="40" height="16"/><rect x="25" y="72" width="18" height="6"/><rect x="25" y="2" width="18" height="6"/></svg>';
const STIJL_UITLEG = { verdedigend: 'Verdedigend: de lijnen staan diep en één speler zet druk.', evenwichtig: 'Evenwichtig: de lijnen staan in het midden en twee spelers zetten druk.', aanvallend: 'Aanvallend: de lijnen staan hoog en drie spelers zetten druk.' };
const VORM_UITLEG = { '4-4-2': 'Vier achter, vier op het middenveld, twee voor. Stevig en gebalanceerd.', '4-3-3': 'Vier achter, drie op het middenveld, drie voor. Veel druk op de flanken.', '3-5-2': 'Drie achter, vijf op het middenveld, twee voor. Sterk in het midden.' };
const achternaam = (n) => String(n).split(' ').slice(1).join(' ') || String(n);
function viewTactiek(c, env) {
  const samen = env.samen || {}, trainer = !!(c.roles && c.roles.trainer);
  const dicht = samen.gast ? `Je speelt in het team van ${samen.host || 'wie het spel opende'}: vorming en stijl zijn van dat team` : !trainer ? 'Opstelling en tactiek zijn van de trainer; je krijgt ze als je Trainer wordt' : '';
  const formatie = formationList('groot', c.tactic.formation), rollen = formatie.map((x) => x.rol);
  const lu = C.lineupOf(c, env.getClub, rollen), pins = C.pinsOf(c);
  const sel = Number.isInteger(ui.slot) && lu.basis[ui.slot] ? ui.slot : Math.max(0, lu.basis.findIndex((q) => q.id === c.me.id));
  const gekozen = lu.basis[sel];
  const spots = formatie.map((f, i) => { const q = lu.basis[i]; if (!q) return ''; const jij = q.id === c.me.id, aan = i === sel; return `<button type="button" class="vb-spot${jij ? ' vb-spot--jij' : ''}" style="--spot-x:${(50 + f.u * 47).toFixed(1)}%;--spot-y:${(9 + f.d * 92).toFixed(1)}%" data-vb="slot:${i}" aria-pressed="${aan}" aria-label="${esc(ROLE_NAMES[q.role])} ${esc(q.name)}, rating ${playerRating(q)}"><span class="vb-spot__nr">${q.num || ''}</span><span class="vb-spot__naam">${esc(achternaam(q.name))}</span></button>`; }).join('');
  const veld = `<div class="vb-tactiek__veld"><div class="vb-veld" role="group" aria-label="Opstelling ${esc(c.tactic.formation)}">${veldLijnen()}<span class="vb-veld__kop">${esc(c.tactic.formation)} · ${esc(c.tactic.style)}</span><span class="vb-richting">↑ aanvallen</span>${spots}</div></div>`;
  const bank = lu.bank.slice().sort((a, b) => (b.role === gekozen.role) - (a.role === gekozen.role) || playerRating(b) - playerRating(a));
  const bankRijen = bank.map((q) => {
    const kand = q.role === gekozen.role, d = playerRating(q) - playerRating(gekozen), vast = pins.start.includes(q.id), bnk = pins.bench.includes(q.id);
    return `<li><button type="button" class="vb-bankrij" data-vb="pin:start:${esc(q.id)}"${dicht ? ` aria-disabled="true" title="${esc(dicht)}"` : ''}><span class="n">${q.num || ''}</span>${pos(q.role)}<span class="nm">${esc(q.name)}${vast ? ' <span class="vb-jij vb-jij--stil">VAST</span>' : bnk ? ' <span class="vb-jij vb-jij--stil">BANK</span>' : ''}</span>${kand ? delta(d) : '<span></span>'}<span class="rt">${playerRating(q)}</span></button></li>`;
  }).join('');
  const vormSeg = segment('Vorming', C.TACTICS.formations.map((f) => [`tactic:formation:${f}`, f, c.tactic.formation === f, `${miniVorming(f)}<span>${esc(f)}</span>`]), { uit: dicht, klasse: 'vb-vorming ds-z-segment--blok' });
  const stijlSeg = segment('Speelstijl', C.TACTICS.styles.map((f) => [`tactic:style:${f}`, f[0].toUpperCase() + f.slice(1), c.tactic.style === f]), { uit: dicht, klasse: 'ds-z-segment--blok' });
  const nogAuto = pins.start.length || pins.bench.length ? link('pin:all', 'Beste elf', dicht) : '';
  const naarBank = gekozen && gekozen.id !== c.me.id && gekozen.id !== c.mate.id ? link(`pin:bench:${esc(gekozen.id)}`, 'Naar de bank', dicht) : '';
  const rechts = `<div class="vb-tactiek__rechts"><section class="vb-keuzeblok">${tussen('Vorming')}${vormSeg}<p class="vb-uitlegzin">${esc(VORM_UITLEG[c.tactic.formation] || '')}</p></section><section class="vb-keuzeblok">${tussen('Speelstijl')}${stijlSeg}<p class="vb-uitlegzin">${esc(STIJL_UITLEG[c.tactic.style] || '')}</p></section>` +
    `<section>${tussen('Bank', `<small>kies een plek op het veld, dan een speler</small>${naarBank}${nogAuto}`)}<ul class="vb-bank" aria-label="Bank">${bankRijen}</ul><p class="vb-tip">Gekozen plek: <b>${esc(ROLE_NAMES[gekozen.role])}, ${esc(gekozen.name)} (${playerRating(gekozen)})</b>. Het verschil is tegen zijn rating.${dicht ? ` ${esc(dicht)}.` : ''}</p></section></div>`;
  const m = C.nextMatch(c, env.getClub), kan = trainer && !samen.gast && !samen.bezig && m && m.status === 'open', reden = !trainer ? 'Alleen als Trainer' : samen.gast ? 'Jij speelt mee in het team van wie het spel opende' : samen.bezig ? 'De wedstrijd loopt nu' : !m ? 'Er is geen wedstrijd' : m.status === 'soon' ? 'Nog niet aan de beurt' : '';
  const coach = dsButtonKey({ label: 'Coach de wedstrijd', toets: 'ENTER', klasse: 'ds-z-knop ds-m-knop', attrs: `data-vb="coach"${kan ? '' : ` aria-disabled="true" title="${esc(reden)}"`}` });
  const voet = `<div class="vb-actiebalk"><p><b>Coach de wedstrijd:</b> je kijkt toe en past onderweg de speelstijl (toets 1) en vorming (toets 2) aan, om de 40 seconden. Alleen computerspelers voetballen; jij speelt dan niet mee.</p>${coach}</div>`;
  return { body: `<div class="vb-tactiek">${veld}${rechts}</div>`, voet };
}

// ---- Selectie, deel Transfers (alleen met de rol Manager): wat er bestaat is de markt van transfervrije spelers, verlengen en verkopen, en de raad van Tammo ----
function viewTransfers(c, env) {
  const cash = C.clubCash(c, env.getClub), venster = T.inBreak(c), samen = env.samen || {};
  const gastUit = samen.gast ? 'Alleen in je eigen wereld' : '';
  const dicht = (...r) => r.find(Boolean) || '';
  const marketRows = (c.market.pool || []).slice().sort((a, b) => playerRating(b) - playerRating(a) || (a.id < b.id ? -1 : 1)).map((q, i) => `<li class="ds-z-rij ds-m-rij" ${rij(i)}><span class="ds-z-rij__naam">${esc(q.name)}</span><span class="ds-z-rij__sub">${esc(ROLE_NAMES[q.role])} · rating ${playerRating(q)}</span><span class="ds-z-rij__waarde">${euro(T.priceOf(q))} ${knop(`buy:${q.id}`, 'Koop', { uit: dicht(gastUit, venster ? (T.priceOf(q) > cash ? 'De clubkas is te klein' : '') : 'Alleen in de pauze tussen de seizoenen') })}</span></li>`).join('');
  const eigen = C.squadOf(c, c.club, env.getClub).filter((q) => !q.protagonist).map((q, i) => `<li class="ds-z-rij ds-m-rij" ${rij(i)}><span class="ds-z-rij__naam">${esc(q.name)}</span><span class="ds-z-rij__sub">${esc(ROLE_NAMES[q.role])} · rating ${playerRating(q)}${q.contract != null ? ` · contract nog ${q.contract} seizoen${q.contract === 1 ? '' : 'en'}` : ''}</span><span class="ds-z-rij__waarde">${euro(T.sellPrice(q))} ${q.contract != null && q.contract < T.CONTRACT_MAX ? knop(`renew:${q.id}`, `Verleng (${euro(T.salaryOf(q))})`, { ghost: true, uit: dicht(gastUit, venster ? '' : 'Alleen in de pauze tussen de seizoenen') }) : ''} ${knop(`sell:${q.id}`, 'Verkoop', { uit: dicht(gastUit, venster ? '' : 'Alleen in de pauze tussen de seizoenen') })}</span></li>`).join('');
  const tip = C.managerAdvice(c, env.getClub);
  const tammo = tip ? `<article class="ds-z-kaart ds-z-kaart--bord ds-m-binnen on"><h3 class="ds-z-kaart__titel">Tammo, je zaakwaarnemer</h3><p class="ds-z-kaart__tekst">${esc(`Jullie zijn zwak op de plek van ${ROLE_NAMES[tip.role].toLowerCase()}. ${tip.player.name} (rating ${playerRating(tip.player)}) is transfervrij voor ${euro(tip.price)} en maakt je team ${tip.better} punten sterker daar.`)}</p></article>` : '';
  return `${tammo}<p class="vb-feiten-regel"><span class="vb-feit"><small>Clubkas</small><b>${euro(cash)}</b></span><span class="vb-feit"><small>Transferperiode</small><b>${venster ? 'nu' : 'in de pauze'}</b></span><span class="vb-tip">De kas is van de club, niet van jou.</span></p>` +
    `${tussen('Transfervrije spelers')}${marketRows ? `<ul class="ds-z-lijst vb-selectie on">${marketRows}</ul>` : '<div class="ds-z-leeg"><p class="ds-z-leeg__kop">Niemand op de markt</p><p class="ds-z-leeg__tekst">Na elk seizoen komen er nieuwe spelers vrij.</p></div>'}` +
    `${tussen('Jouw selectie')}<ul class="ds-z-lijst vb-selectie on">${eigen}</ul><p class="vb-tip">Verkopen levert hooguit 80% min 10% belasting op: een koop en verkoop kost altijd geld.</p>`;
}

// De uitnodiging of de dichte staat: voor wie de carrière nog niet begon.
function viewUitnodiging(c, env) {
  if (!env.unlocked) return `<div class="ds-z-leeg"><p class="ds-z-leeg__kop">De voetbalcarrière komt later</p><p class="ds-z-leeg__tekst">${esc(env.hint || 'Dit komt later in het verhaal.')} De Euroborg en de penaltyserie kun je nu al spelen.</p></div>`;
  const b = inviteBeat(c, { unlocked: true, busy: false, day: -1 }, env.char || 'anita');
  const t = b ? `<strong>${esc(b.wie)}</strong>: ${esc(b.tekst)}` : 'De club hier in de buurt zoekt spelers.';
  return `<article class="ds-z-kaart ds-z-kaart--bord ds-m-binnen on"><h3 class="ds-z-kaart__titel">Een avondje trainen</h3><p class="ds-z-kaart__tekst">${t}</p><p>${chip('Talentenklasse')} ${chip('Begin klein')} ${chip('Blessures uit te zetten')}</p></article>` +
    `<p class="vb-acties">${knop('start', 'Aannemen', { primair: true })}</p><p class="vb-tip">Je speelt als ${env.char === 'tammo' ? 'Tammo' : 'Tessa'}; de ander regelt de papieren en speelt mee.</p>`;
}
export function viewHtml(c, tab, env) {
  if (!C.hasCareer(c)) return `<div class="ds-zeef vb-pane">${viewUitnodiging(c, env)}</div>`;
  const ov = C.summary(c, env.getClub);
  const e = { ...env, ov, match: C.nextMatch(c, env.getClub) };
  const tabId = tabsFor(c).some(([id]) => id === tab) ? tab : 'overzicht';
  const compact = tabId !== 'overzicht';
  let body, voet = '', vast = false;
  if (tabId === 'tactiek') { const t = viewTactiek(c, e); body = t.body; voet = t.voet; vast = true; }
  else if (tabId === 'selectie') { body = ui.deel === 'transfers' && c.roles && c.roles.manager ? `<div class="vb-selbalk">${segment('Onderdeel', [['deel:selectie', 'Selectie', false], ['deel:transfers', 'Transfers', true]])}</div>${viewTransfers(c, e)}` : viewSelectie(c, e); vast = !(ui.deel === 'transfers' && c.roles && c.roles.manager); }
  else if (tabId === 'club') body = clubBodyHtml({ career: c, money: env.money, getClub: env.getClub, msg: cui.msg, confirm: cui.confirm, kit: KIT.kitView(c, env.getClub) });
  else body = { overzicht: viewOverzicht, stand: viewStand, kalender: viewKalender, training: viewTraining }[tabId](c, e);
  return `<div class="ds-zeef vb-pane${vast ? ' vb-pane--vast' : ''}">${kop(c, ov, e, compact)}${tabsHtml(tabId, c, e)}<section class="vb-body${vast ? ' vb-body--vast' : ''} ds-m-wissel on" role="tabpanel" data-tab="${tabId}">${body}</section>${voet}</div>`;
}

// ---- DOM ----
let tab = 'overzicht', host = null, wereld = null, sluit = null;
let cssLoaded = false;
const zetCss = () => { cssLoaded = true; };
const samenVan = (w) => {
  const n = w && w.coopNet;
  if (!n) return null;
  const spelers = (n.hub && n.hub.roster && n.hub.roster.spelers) || (n.roster && n.roster.spelers) || [];
  const hostSpeler = spelers.find((s) => s.slot === 0);
  const W = n.wed || null;
  return { gast: n.role === 'client', host: hostSpeler && (hostSpeler.naam || '') ? String(hostSpeler.naam).slice(0, 24) : '', bezig: !!(W && (W.r || W.sc || W.lv)) };
};
const envFor = (w, progress = {}) => ({ money: w ? w.money || 0 : 0, getClub: V.getClub, unlocked: voetbalOpen(progress), hint: voetbalHint(progress), char: ((w && hoofdspeler(w)) || {}).character === 'tammo' ? 'tammo' : 'anita', samen: samenVan(w) });
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
  for (const nav of el.querySelectorAll('.ds-m-tabs')) trackTabLine(nav);
  if (tab === 'club') kitPhotos(el);
  if (!el.dataset.vbAan) {
    el.dataset.vbAan = '1';
    el.addEventListener('click', (e) => {
      const cl = e.target.closest && e.target.closest('[data-cl]');
      if (cl) { clubAct(wereld, cl.dataset); renderVoetbalPanel(host); return; }
      const b = e.target.closest && e.target.closest('[data-vb]');
      if (!b) return;
      const reden = uitReden(b);
      if (reden) { if (wereld && wereld.addMessage) wereld.addMessage(reden, 2.5); return; }   // een grijze knop doet niets en zegt waarom
      act(b.dataset.vb, b);
    });
    // het tenue op het tabblad Club: 1, 2, 3 en min en plus
    el.addEventListener('keydown', (e) => { if (tab === 'club' && clubKeys(e, wereld, el)) renderVoetbalPanel(host); });
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
  return null;
}
function melding(a, r) { const t = actieBericht(a, r); if (t && wereld && wereld.addMessage) wereld.addMessage(t, 3); }
function act(a) {
  const c = V.getCareer();
  if (vraagtBevestiging(a)) {
    if (ui.vraag !== a) { ui.vraag = a; renderVoetbalPanel(host); return; }     // de eerste druk vraagt, de tweede doet het
    ui.vraag = null;
  } else ui.vraag = null;
  if (a.startsWith('tab:')) { tab = TABS.some(([id]) => id === a.slice(4)) ? a.slice(4) : 'overzicht'; }
  else if (a === 'start') V.createNew(wereld, envFor(wereld, progressFn()).char);
  else if (a.startsWith('focus:')) V.applyFocus(a.slice(6));
  else if (a.startsWith('trainfocus:')) { V.applyFocus(a.slice(11)); tab = 'training'; }
  else if (a.startsWith('sel:')) ui.sel = a.slice(4);
  else if (a.startsWith('slot:')) ui.slot = Number(a.slice(5));
  else if (a.startsWith('filter:')) ui.filter = a.slice(7);
  else if (a.startsWith('liga:')) ui.liga = a.slice(5);
  else if (a.startsWith('deel:')) ui.deel = a.slice(5) === 'transfers' ? 'transfers' : 'selectie';
  else if (a === 'train') { if (trainer && trainer(wereld, c.focus)) { if (sluit) sluit(); return; } melding(a, V.trainNow(wereld, c.focus, 0.8)); }
  else if (a === 'train:snel') melding(a, V.trainNow(wereld, c.focus, 0.8));
  else if (a === 'sim') melding(a, V.finishMatch(wereld, null));
  else if (a.startsWith('tactic:')) { const [, k, v] = a.split(':'); V.replaceCareer(C.withTactic(c, k === 'formation' ? { formation: v } : { style: v })); ui.slot = null; }
  else if (a.startsWith('pin:')) { const [, where, ...rest] = a.split(':'); if (where === 'all') V.replaceCareer(C.clearLineupPins(c)); else { const r = C.setLineupPin(c, rest.join(':'), where, V.getClub); if (r.ok) V.replaceCareer(r.career); else melding(a, r); } }
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
