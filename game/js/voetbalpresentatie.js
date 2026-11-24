// De tv-presentatie van de voetbalwedstrijd (epic voetbal-uitzending, 21-11): puur, geen DOM en geen THREE (scripts/voetbal_uitzending_test.mjs). Dit zijn de modellen en de HTML-teksten (alles ontsnapt) van het
// scorebord met verzonnen clublogo's en kaart- en blessure-icoontjes, de opstelling bij de aftrap, de rustpauze met statistieken, de eindsamenvatting met Man van de match, de veldradar en de ondertitel
// van het commentaar. voetbaltvlayer.js zet ze op het scherm; de stijl staat in voetbaltv.css (alleen ds-tokens). Kleur is nooit het enige signaal: een kaart heeft een woord, een blessure een kruis.
// Een gast (Samen spelen) heeft alleen de momentopname: hij krijgt de opstelling, de stand en de klok, en gebeurtenissen uit het verschil tussen twee momentopnamen (guestEvents); de
// statistieken en Man van de match zijn van wie het spel opende (die rekent ze uit) en staan er bij een gast dus niet.
import { clockText } from './voetbalrules.js';
import { statistiekenVan, matchMvp, speelMinuut, cleanRules } from './voetbalextrarules.js';
import { cleanModus } from './voetbalregie.js';
import { crestSvg } from './voetbalwapen.js';
import { knopToets } from './dsbutton.js';

// De voorkeur voor de uitzending (de camera-regie en de regels kaarten, blessures, strafschoppen, buitenspel, wissels) staat onder `tv` in de eigen sleutel van de voetbalvoorkeur (alleen dit apparaat);
// alles wat niet klopt wordt de standaard.
export function leesTvVoorkeur(raw) {
  let d = null;
  try { d = JSON.parse(raw || 'null'); } catch (e) { d = null; }
  const tv = d && typeof d === 'object' && d.tv && typeof d.tv === 'object' ? d.tv : {};
  return { camera: cleanModus(tv.camera), regels: cleanRules(tv.regels) };
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const hex = (n) => `#${((Number.isFinite(n) ? n : 0) >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
const initiaal = (naam) => String(naam || '?').replace(/^De\s+/i, '').charAt(0).toUpperCase();

// Het verzonnen clubwapen (Club-UI 24-11): hetzelfde schild als in het Clubhuis (voetbalwapen.js: shirtkleur, accent en patroon van de club, met een symbool). Geen echt embleem, geen echte club.
export function clubLogo(team, maat = 28) {
  const klas = maat <= 26 ? 'xs' : maat <= 34 ? 's' : 'm';
  return crestSvg({ id: team.id || team.kort || team.naam, naam: team.naam || team.kort, shirt: team.shirt, accent: team.accent != null ? team.accent : team.broek != null ? team.broek : team.shirt, patroon: team.patroon || 'effen', emblem: team.emblem }, [], klas).replace('class="vb-wapen ', 'class="vbtv-logo vb-wapen ');
}
export const cardIcon = (kleur) => `<span class="vbtv-kaart vbtv-kaart--${kleur === 'rood' ? 'rood' : 'geel'}" role="img" aria-label="${kleur === 'rood' ? 'Rode kaart' : 'Gele kaart'}"><i></i><b>${kleur === 'rood' ? 'rood' : 'geel'}</b></span>`;
const blessureIcoon = () => '<span class="vbtv-blessure" role="img" aria-label="Blessure"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M5 1h4v4h4v4H9v4H5V9H1V5h4z" fill="var(--ds-c-wit)" stroke="var(--ds-c-ink-inkt)" stroke-width="1.4"/></svg></span>';

// Per team: kaarten en blessures van het veld (uit de spelers) voor het scorebord.
function teamIcoonRij(sim, team) {
  const sp = sim.spelers.filter((p) => p.team === team);
  const geel = sp.filter((p) => p.geel === 1 && !p.rood).length, rood = sp.filter((p) => p.rood).length, bles = sp.filter((p) => p.blessure).length;
  return { geel, rood, blessure: bles };
}
const iconenHtml = (r) => `${r.geel ? cardIcon('geel') + (r.geel > 1 ? `<small>${r.geel}</small>` : '') : ''}${r.rood ? cardIcon('rood') + (r.rood > 1 ? `<small>${r.rood}</small>` : '') : ''}${r.blessure ? blessureIcoon() : ''}`;

const helftTekst = (h) => (h === 2 ? 'Tweede helft' : 'Eerste helft');
// Het scorebord (de rij van het bord bovenin, minigamekit.js createBoard): logo, naam, stand, klok en de icoontjes.
export function scoreboardRow(sim) {
  const [a, b] = sim.score, t0 = sim.teams[0], t1 = sim.teams[1];
  const clockTxt = sim.fase === 'rust' ? 'rust' : sim.fase === 'eind' || sim.fase === 'klaar' ? 'einde' : clockText(sim.klok == null ? 0 : sim.klok);
  const i0 = sim.spiegel ? { geel: 0, rood: 0, blessure: 0 } : teamIcoonRij(sim, 0), i1 = sim.spiegel ? { geel: 0, rood: 0, blessure: 0 } : teamIcoonRij(sim, 1);
  return `<span class="vbtv-kant">${clubLogo(t0, 26)} ${esc(t0.kort)} ${iconenHtml(i0)} <b>${a | 0}</b></span><span>-</span><span class="vbtv-kant"><b>${b | 0}</b> ${esc(t1.kort)} ${iconenHtml(i1)} ${clubLogo(t1, 26)}</span><span class="mg-klok">${esc(helftTekst(sim.helft || 1))} · <b>${esc(clockTxt)}</b></span>`;
}

// ---------------------------------------------------------------- de opstelling bij de aftrap

const ROL_KORT = { keeper: 'Keeper', verdediger: 'Verdediging', middenvelder: 'Middenveld', aanvaller: 'Aanval' };
const ROL_KORT_ENKEL = { keeper: 'Keeper', verdediger: 'Verdediger', middenvelder: 'Middenvelder', aanvaller: 'Aanvaller' };
function opstellingModel(sim) {
  const kant = (t) => ({ team: sim.teams[t], vorming: sim.tac && sim.tac[t] ? sim.tac[t].vorming : '', stijl: sim.tac && sim.tac[t] ? sim.tac[t].stijl : '',
    spelers: sim.spelers.filter((p) => p.team === t).map((p, k) => ({ nr: k + 1, naam: p.naam, rol: p.rol, rolNaam: ROL_KORT[p.rol] || '', jij: sim.mensen.some((x) => x.ctl === p.id && !x.weg) })) });
  return { thuis: kant(0), uit: kant(1), formaat: sim.formaat };
}
// De opstelling bij de aftrap (Club-UI 24-11): één kaart met de twee teams naast elkaar op hetzelfde raster: de lijst van thuis, één formatieveld met beide teams en de lijst van uit. De kop gebruikt de korte
// clubnaam (die breekt nooit over twee regels), de lijsten hebben dezelfde kolommen (#, positie, naam) en dezelfde rijhoogte. `plek`: waar de aftrap is (een carrièrewedstrijd op een sportpark is niet in de Euroborg, 24-11).
// `knop`: de gele Aftrap met zijn toets (F) onderin; een gast kan niet doorgaan en krijgt hem niet.
const POS_LETTER = { keeper: 'K', verdediger: 'V', middenvelder: 'M', aanvaller: 'A' };
const posBadge = (rol) => `<span class="vb-pos vb-pos--${(POS_LETTER[rol] || 'M').toLowerCase()}" title="${esc(ROL_KORT[rol] || '')}">${POS_LETTER[rol] || ''}</span>`;
const VELD_LIJNEN = '<svg class="vb-veld__lijnen" viewBox="0 0 105 68" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="101" height="64"/><path d="M52.5 2V66"/><circle cx="52.5" cy="34" r="9"/><rect x="2" y="14" width="16" height="40"/><rect x="87" y="14" width="16" height="40"/><rect x="2" y="25" width="5" height="18"/><rect x="98" y="25" width="5" height="18"/></svg>';
export function opstellingHtml(sim, plek = 'in de Euroborg', { knop = true } = {}) {
  const m = opstellingModel(sim);
  const kant = (k, uit) => `<div class="vb-team${uit ? ' vb-team--uit' : ''}">${clubLogo(k.team, 48)}<div><h2 class="vbtv-teamnaam">${esc(k.team.kort)}</h2><p class="vbtv-sub"><span class="vb-thuisuit">${uit ? 'Uit' : 'Thuis'}</span><span>${esc(k.vorming)} · ${esc(k.stijl)}</span></p></div></div>`;
  const lijst = (k) => `<div class="lijst11 vbtv-lijst" role="group" aria-label="Opstelling ${esc(k.team.kort)}"><div class="h"><span class="n">#</span><span>P</span><span>Speler</span></div><ol>${k.spelers.map((s) => `<li${s.jij ? ' class="jij vbtv-jij"' : ''}><span class="n">${s.nr}</span>${posBadge(s.rol)}<span class="nm">${esc(s.naam)}${s.jij ? ' · jij' : ''}</span></li>`).join('')}</ol></div>`;
  const W = sim.perTeam > 6 ? 56 : 26, L = sim.perTeam > 6 ? 90 : 42, clamp = (v) => Math.max(3, Math.min(97, v));
  const stip = sim.spelers.filter((p) => !p.rood).map((p) => { const jij = sim.mensen.some((x) => x.ctl === p.id && !x.weg); return `<span class="vb-spot vb-spot--klein${p.team === 0 ? ' vb-spot--tegen' : ''}${jij ? ' vb-spot--jij' : ''}" style="--spot-x:${clamp(50 + (p.y / L) * 100).toFixed(1)}%;--spot-y:${clamp(50 + (p.x / W) * 100).toFixed(1)}%"><span class="vb-spot__nr">${sim.spelers.filter((q) => q.team === p.team).indexOf(p) + 1}</span></span>`; }).join('');
  const veld = `<div class="vb-veld vb-veld--breed" role="img" aria-label="Beide opstellingen op het veld">${VELD_LIJNEN}<span class="vb-veld__kop">${esc(m.thuis.team.kort)}</span><span class="vb-veld__kop vb-veld__kop--r">${esc(m.uit.team.kort)}</span>${stip}</div>`;
  const jij = m.thuis.spelers.concat(m.uit.spelers).find((s) => s.jij);
  const voet = `<div class="vbtv-voet"><span class="vbtv-sub">${jij ? `Jij speelt als <b>${esc(jij.naam)}</b>, ${esc((ROL_KORT_ENKEL[jij.rol] || '').toLowerCase())}, rugnummer ${jij.nr}.` : ''}</span>${knop ? `<span class="ds-z-knop ds-z-knop--toets vbtv-aftrap" aria-hidden="true"><span class="ds-z-knop__label">Aftrap</span>${knopToets('F')}</span>` : ''}</div>`;
  return `<div class="vbtv-introkop">${kant(m.thuis, false)}<div class="vbtv-plek"><span class="vbtv-eyebrow">Aftrap ${esc(plek)}</span><b>${esc(m.thuis.team.kort)} tegen ${esc(m.uit.team.kort)}</b></div>${kant(m.uit, true)}</div><div class="vbtv-introrij">${lijst(m.thuis)}${veld}${lijst(m.uit)}</div>${voet}`;
}

// ---------------------------------------------------------------- de rustpauze en het eindverslag

function statRijen(sim) {
  const s = statistiekenVan(sim);
  const rij = (label, [a, b], pct = false) => ({ label, a: pct ? `${a}%` : String(a), b: pct ? `${b}%` : String(b), deel: a + b > 0 ? a / (a + b) : 0.5 });
  const rijen = [rij('Balbezit', s.bezit, true), rij('Schoten', s.schoten), rij('Schoten op doel', s.opDoel), rij('Hoekschoppen', s.hoeken), rij('Overtredingen', s.overtredingen)];
  if (sim.regels && sim.regels.kaarten) rijen.push(rij('Gele kaarten', s.geel), rij('Rode kaarten', s.rood));
  if (sim.regels && sim.regels.wissels) rijen.push(rij('Wissels', s.wissels));
  return rijen;
}
const statTabel = (rijen) => `<ul class="vbtv-stats">${rijen.map((r) => `<li><span class="vbtv-sa">${esc(r.a)}</span><span class="vbtv-sl">${esc(r.label)}<i style="--vbtv-deel:${Math.round(r.deel * 100)}%"></i></span><span class="vbtv-sb">${esc(r.b)}</span></li>`).join('')}</ul>`;
const goalList = (sim, t) => (sim.verloop || []).filter((e) => e.type === 'goal' && e.team === t).map((e) => {
  const who = e.eigen ? 'eigen doelpunt' : (sim.spelers[e.speler] ? sim.spelers[e.speler].naam : '?');
  return `${esc(who)} ${e.min}'`;
});
export function rustHtml(sim) {
  const [a, b] = sim.score, thuis = goalList(sim, 0), uit = goalList(sim, 1);
  return `<div class="vbtv-kop"><span class="vbtv-eyebrow">Rust</span><h2>${clubLogo(sim.teams[0], 34)} ${esc(sim.teams[0].kort)} <b>${a | 0}</b> - <b>${b | 0}</b> ${esc(sim.teams[1].kort)} ${clubLogo(sim.teams[1], 34)}</h2></div>` +
    `<div class="vbtv-scorers"><p>${thuis.join(', ') || '&nbsp;'}</p><p>${uit.join(', ') || '&nbsp;'}</p></div>${sim.spiegel ? '' : statTabel(statRijen(sim))}`;
}
export function eindModel(sim) {
  const mvp = sim.spiegel ? null : matchMvp(sim);
  const uitslag = sim.score[0] > sim.score[1] ? 'Gewonnen' : sim.score[0] < sim.score[1] ? 'Verloren' : 'Gelijkspel';
  return { uitslag, score: sim.score.slice(), mvp, rijen: sim.spiegel ? [] : statRijen(sim), thuis: goalList(sim, 0), uit: goalList(sim, 1), minuut: speelMinuut(sim) };
}
export function eindHtml(sim) {
  const m = eindModel(sim);
  const mvp = m.mvp ? `<div class="vbtv-mvp"><span class="vbtv-eyebrow">Man van de match</span><b>${esc(m.mvp.naam)}</b><em>${esc(sim.teams[m.mvp.team].kort)} · ${m.mvp.st.doelpunten ? m.mvp.st.doelpunten + (m.mvp.st.doelpunten === 1 ? ' doelpunt' : ' doelpunten') : ''}${m.mvp.st.assists ? ' · ' + m.mvp.st.assists + (m.mvp.st.assists === 1 ? ' assist' : ' assists') : ''}${m.mvp.st.reddingen ? ' · ' + m.mvp.st.reddingen + ' reddingen' : ''}${m.mvp.st.tackles ? ' · ' + m.mvp.st.tackles + ' tackles' : ''}</em></div>` : '';
  return `<div class="vbtv-kop"><span class="vbtv-eyebrow">Eindsignaal · ${esc(m.uitslag)}</span><h2>${clubLogo(sim.teams[0], 34)} ${esc(sim.teams[0].kort)} <b>${m.score[0]}</b> - <b>${m.score[1]}</b> ${esc(sim.teams[1].kort)} ${clubLogo(sim.teams[1], 34)}</h2></div>` +
    `<div class="vbtv-scorers"><p>${m.thuis.join(', ') || '&nbsp;'}</p><p>${m.uit.join(', ') || '&nbsp;'}</p></div>${mvp}${m.rijen.length ? statTabel(m.rijen) : ''}`;
}

// ---------------------------------------------------------------- de veldradar

// De radar: alles op 0 tot 1 over het veld (x dwars, y in de lengte, jouw aanvalsrichting naar boven); alleen de bal, de spelers en de jouwe. Een uitgesloten speler staat er niet op.
export function radarModel(sim, eigenId = -1) {
  const W = (sim.perTeam > 6 ? 56 : 26), L = (sim.perTeam > 6 ? 90 : 42);
  // derby (#1114): speelt jouw mens in team 1, dan valt hij naar -y aan; de radar draait dan een halve slag zodat jouw aanval altijd naar boven wijst
  const eigen = eigenId >= 0 ? sim.spelers[eigenId] : null, draai = eigen && eigen.team === 1 ? -1 : 1;
  const norm = (p) => ({ x: Math.max(0, Math.min(1, 0.5 + draai * p.x / W)), y: Math.max(0, Math.min(1, 0.5 - draai * p.y / L)) });
  return { bal: norm(sim.bal), spelers: sim.spelers.filter((p) => !p.rood).map((p) => ({ ...norm(p), team: p.team, jij: p.id === eigenId, keeper: p.rol === 'keeper' })), W, L };
}
export function radarHtml(sim, eigenId = -1, hoog = 84, breed = 52) {
  const r = radarModel(sim, eigenId), X = (v) => (v * breed).toFixed(1), Y = (v) => (v * hoog).toFixed(1);
  // kleur is nooit het enige signaal: de ploeg van de computer is een vierkantje, de keeper een maatje groter
  const stip = r.spelers.map((p) => { const rad = (p.jij ? 3.6 : 2.4) + (p.keeper ? 0.8 : 0), cl = `vbtv-r${p.team}${p.jij ? ' vbtv-rjij' : ''}`; return p.team === 1 ? `<rect x="${(X(p.x) - rad).toFixed(1)}" y="${(Y(p.y) - rad).toFixed(1)}" width="${(rad * 2).toFixed(1)}" height="${(rad * 2).toFixed(1)}" class="${cl}"/>` : `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${rad}" class="${cl}"/>`; }).join('');
  return `<svg viewBox="0 0 ${breed} ${hoog}" width="${breed}" height="${hoog}" role="img" aria-label="Veldradar"><rect x="0.5" y="0.5" width="${breed - 1}" height="${hoog - 1}" class="vbtv-rveld"/><line x1="0" y1="${hoog / 2}" x2="${breed}" y2="${hoog / 2}" class="vbtv-rlijn"/><circle cx="${breed / 2}" cy="${hoog / 2}" r="6" class="vbtv-rlijn vbtv-rleeg"/>${stip}<circle cx="${X(r.bal.x)}" cy="${Y(r.bal.y)}" r="2" class="vbtv-rbal"/></svg>`;
}

// De ondertitel van het commentaar: wie spreekt en wat (de stem is een extraatje: de tekst staat er altijd).
// Zonder tekst geen balk: een regel met alleen een naam leest als een kapotte lege kaart (review 22-11).
export const subtitleHtml = (regel) => (regel && String(regel.tekst || '').trim() ? `<b>${esc(regel.naam)}</b><span>${esc(regel.tekst)}</span>` : '');

// ---------------------------------------------------------------- gebeurtenissen voor een gast (uit het verschil tussen twee momentopnamen)

export function guestEvents(prev, nu) {
  const ev = [];
  if (!prev) return ev;
  if (nu.fase !== prev.fase) {
    if (nu.fase === 'aftrap' && prev.fase !== 'goal' && prev.fase !== 'rust') ev.push({ type: 'aftrap', team: 0 });
    if (nu.fase === 'aftrap' && prev.fase === 'rust') ev.push({ type: 'aftrap', team: 1 });
    if (nu.fase === 'rust') ev.push({ type: 'fluit', helft: 1 });
    if (nu.fase === 'eind') ev.push({ type: 'einde', winnaar: nu.score[0] > nu.score[1] ? 0 : nu.score[1] > nu.score[0] ? 1 : -1 });
  }
  for (const t of [0, 1]) if (nu.score[t] > prev.score[t]) ev.push({ type: 'goal', team: t, speler: -1, eigen: false, stand: nu.score.slice() });
  if (nu.hervatKind && nu.hervatKind !== prev.hervatKind && nu.fase === 'hervat') ev.push({ type: 'hervat', kind: nu.hervatKind, team: 0 });
  return ev;
}
export const guestState = (sim) => ({ fase: sim.fase, score: sim.score.slice(), hervatKind: sim.hervat ? sim.hervat.kind : null });

// Overslaan van een kaart of de herhaling met F of spatie kan pas na een korte leestijd: wie net de knoppen indrukte voor een pass of schot slaat het eindverslag niet per ongeluk over.
export const MIN_LEEST = { intro: 0.4, rust: 1.6, eind: 1.6, herhaling: 0.9 };
export const magOverslaan = (soort, sindsS) => Number.isFinite(sindsS) && sindsS >= (MIN_LEEST[soort] != null ? MIN_LEEST[soort] : 0.5);

// De regels van het uitslagbord na een carrièrewedstrijd: stand, jouw doelpunten, wat het opleverde (contract en bonus), groei en een bekernieuws. Wat je verdiende stond er niet bij: dat was het eerste wat je wilde weten.
const eur = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
export function carriereBannerRijen(s, { gf = 0, ga = 0, doelpunten = 0, coach = false } = {}) {
  const rijen = coach ? [['Stand', `${gf}-${ga}`], ['Als trainer', 'Je speelde niet mee']] : [['Stand', `${gf}-${ga}`], ['Jouw doelpunten', String(doelpunten | 0)]];
  const verdiend = ((s && s.earn) || []).reduce((a, x) => a + (Number.isFinite(x && x.amount) ? x.amount : 0), 0);
  if (verdiend > 0) rijen.push(['Verdiend', eur(verdiend)]);
  if (s && s.gains && s.gains.length) rijen.push(['Groei', `+${s.gains.length}`]);
  if (s && s.injury && s.injury.text) rijen.push(['Let op', s.injury.text]);
  if (s && s.notes && s.notes.length) rijen.push(['Beker', s.notes[0]]);
  return rijen;
}
