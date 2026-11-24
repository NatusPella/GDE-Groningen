// Bouwt de statische mockups van het Spel-menu (ontwerp 24-11) naar <repo>/.scr/spel-ontwerp/scherm/*.html (lokaal, niet in git).
// Gebruik: node docs/ontwerp/spel-ui-24-11/bouw.mjs, dan node schiet.mjs (beelden) en node index.mjs (de pagina). Alleen DS3-CSS uit game/js, geen nieuwe kleur of lettertype.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let ROOT = HERE;
while (!fs.existsSync(path.join(ROOT, 'game', 'js', 'ds-tokens.css'))) { const up = path.dirname(ROOT); if (up === ROOT) throw new Error('repo-root niet gevonden'); ROOT = up; }
const WERK = path.join(ROOT, '.scr', 'spel-ontwerp');
const OUT = path.join(WERK, 'scherm');
const GAME = path.relative(OUT, path.join(ROOT, 'game')).split(path.sep).join('/');
const { icoon } = await import(pathToFileURL(path.join(ROOT, 'game', 'js', 'icons.js')).href);
fs.mkdirSync(OUT, { recursive: true });

const I = (n, cls = '') => icoon(n, { cls: 'sp-ic ' + cls });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const eur = (n) => '€' + Math.round(n).toLocaleString('nl-NL');
const toets = (t) => `<span class="ds-z-toets">${t}</span>`;
const knopToets = (t) => `<span class="ds-z-knop__toets">${toets(t)}</span>`;
const knop = (t, mod = '', extra = '', tk = '') => `<button type="button" class="ds-z-knop${mod ? ' ds-z-knop--' + mod : ''}${extra ? ' ' + extra : ''}">${t}${tk ? knopToets(tk) : ''}</button>`;
const klein = (t, mod = 'secundair', tk = '') => knop(t, mod, 'sp-kleinknop', tk);
const link = (t) => `<button type="button" class="ds-z-link">${t}</button>`;
const status = (soort, tekst, ic) => `<span class="ds-z-status${soort ? ' ds-z-status--' + soort : ''}">${ic ? I(ic) : ''}${esc(tekst)}</span>`;
const tussen = (t, rechts = '') => `<h3 class="ds-z-tussenkop">${esc(t)}${rechts}</h3>`;
const balk = (pct, label = '', mod = '') => `<div class="ds-z-balk ${mod}" style="--ds-z-w:${pct}%" role="progressbar" aria-valuenow="${pct}"><div class="ds-z-balk__baan"><i class="ds-z-balk__vul"></i></div>${label ? `<span class="ds-z-balk__label">${label}</span>` : ''}</div>`;
const thumb = (img, extra = '', tag = '') => `<div class="sp-thumb ${extra}" style="background-image:url('${GAME}/img/laad/${img}.jpg')">${tag ? `<span class="sp-thumb__tag">${esc(tag)}</span>` : ''}</div>`;
const rij = (ic, naam, sub, waarde, mod = '') => `<div class="ds-z-rij ${mod}"><span class="sp-ikoon">${I(ic)}</span><span><span class="ds-z-rij__naam">${esc(naam)}</span><span class="ds-z-rij__sub">${esc(sub)}</span></span><span class="ds-z-rij__waarde">${waarde}</span></div>`;
const statusBlok = (l, w, mod = '') => `<div class="ds-z-status ds-z-status--blok${mod ? ' ds-z-status--' + mod : ''}"><span class="ds-z-status__l">${esc(l)}</span><span class="ds-z-status__w">${w}</span></div>`;
const kopband = ({ eb, titel, sub = '', rechts = '', compact = false }) => `<header class="ds-z-kopband${compact ? ' ds-z-kopband--compact' : ''}"><div><div class="ds-z-kopband__eb">${esc(eb)}</div><h1 class="ds-z-kopband__titel">${esc(titel)}</h1>${sub ? `<p class="ds-z-kopband__sub">${sub}</p>` : ''}</div><div class="ds-z-kopband__rechts">${rechts}</div></header>`;

// ---------------------------------------------------------------- het scenario: één verhaal voor alle schermen (alles verzonnen of uit de canon)
const S = {
  naam: 'Hoofdspel', wie: 'Tammo', geld: 12840, gezond: 100, wanted: 0, speeltijd: '6 u 12', opslag: '4 min geleden', pct: 31,
  deel: 'Akte 2: Het Noorden is groot', stap: 'Een middag op het terras', plaats: 'Grote Markt', afstand: '1,4 km',
  lead: 'Een terras aan de Grote Markt zoekt hulp voor één middag. Ik neem de bestellingen op, jij draagt. Niet kantelen.',
  eerder: 'Soep bij Beppe', stapN: 6, stapT: 14, tijd: 'Vrijdag 14 augustus · 08:07',
};
const NAV = { Spel: 'spel', Verhaal: 'verhaal', Activiteiten: 'todo', Loopbanen: 'loopbaan', Kaart: 'kaart', Spullen: 'spullen', Garage: 'garage', 'Land en bedrijf': 'boerderij', Veroverd: 'veroverd', Prestaties: 'prestaties', "Foto's": 'fotos', Instellingen: 'instellingen' };

function rail({ actief = 'Spel', doorgaan = 'primair', tijd = S.tijd, prestart = false, punt = ['Verhaal'], afsluiten = true } = {}) {
  const item = (t, n = '') => `<div class="rail__item"${t === actief ? ' aria-current="true"' : ''}>${I(NAV[t])}<span>${t}</span>${punt.includes(t) ? '<i class="punt" aria-label="nieuw"></i>' : n}</div>`;
  const groep = (g, items) => `<div class="rail__groep">${g}</div>` + items.map((t) => item(t)).join('');
  return `<aside class="rail"><div class="rail__kop"><span class="rail__logo">GDE</span><span class="rail__tijd"><b>${tijd.split(' · ')[1] || ''}</b>${tijd.split(' · ')[0]}</span></div>` +
    `<div class="rail__go">${prestart ? knop('Terug', 'secundair', '', 'Esc') : knop(`${I('hervat')}Doorgaan`, doorgaan === 'primair' ? '' : 'secundair')}${knop(I('zoek'), 'secundair', 'rail__zoek')}</div>` +
    (prestart ? '' : `${item('Spel')}<div class="rail__sp"></div>` + groep('Doen', ['Verhaal', 'Activiteiten', 'Loopbanen', 'Kaart']) + '<div class="rail__sp"></div>' + groep('Bezit', ['Spullen', 'Garage', 'Land en bedrijf']) + '<div class="rail__sp"></div>' + groep('Voortgang', ['Veroverd', 'Prestaties', "Foto's"]) + '<div class="rail__lijn"></div>') +
    `${item('Instellingen')}<div class="rail__rek"></div><div class="rail__voet">${afsluiten ? `<div class="rail__item">${I('uitgang')}<span>Afsluiten</span></div>` : ''}<span class="rail__ver">v0.66.0</span></div></aside>`;
}
const hints = (lijst) => `<div class="hints">${lijst.map(([t, w]) => `<span>${t.split('+').map((x) => toets(x)).join('')} ${esc(w)}</span>`).join('')}</div>`;
const HINT_STD = [['↑+↓', 'kiezen'], ['Enter', 'doen'], ['Q+E', 'tabblad'], ['Esc', 'doorgaan']];
const TABS = (actief, n = {}) => (n.sessie ? ['Overzicht', 'Spelers', 'Uitnodigen', 'Sessie', 'Opslaan en stoppen'] : ['Overzicht', 'Samen spelen', 'Opslaan en stoppen']).map((t) => `<button type="button" role="tab" class="sp-tab${n[t] === 'punt' ? ' sp-tab--punt' : ''}" aria-selected="${t === actief}">${t}${typeof n[t] === 'number' ? `<small>${n[t]}</small>` : ''}</button>`).join('');
const tabrij = (actief, n) => `<nav class="sp-tabs" role="tablist" aria-label="Spel"><span class="sp-tabs__q">${toets('Q')}</span>${TABS(actief, n)}<span class="sp-tabs__e">${toets('E')}</span></nav>`;
const klus = (soort, ic, kop, sub, focus = false) => `<button type="button" class="sp-klus sp-klus--${soort}${focus ? ' sp-klus--focus' : ''}">${status(soort === 'nu' ? 'probleem' : soort === 'nieuw' ? 'goed' : '', { nu: 'NU', vandaag: 'VANDAAG', nieuw: 'NIEUW' }[soort], ic)}<span class="sp-klus__tekst"><b>${esc(kop)}</b><span>${esc(sub)}</span></span>${I('pijl_rechts')}</button>`;
const strook = (items, meer = 0) => `<div class="sp-strook"><div class="sp-strook__kop">${I('klembord')}<span>Aandacht</span></div>${items.join('')}${meer ? `<span class="sp-klus__meer">+${meer} meer</span>` : ''}</div>`;

function frame({ rail: r = {}, kop, tab, tabN, inhoud, hint = HINT_STD, overlay = '', strookHtml = '', achtergrond = 'vismarkt', tabs = true }) {
  return `<div class="stage ds-zeef"><div class="sp-wereld" style="background-image:url('${GAME}/img/laad/${achtergrond}.jpg')"></div>${rail(r)}<main class="pane">${kopband(kop)}${tabs ? tabrij(tab, tabN) : ''}${strookHtml}${inhoud}</main>${hints(hint)}${overlay}</div>`;
}
const STATUS_SPELER = (w = S) => statusBlok('Geld', `${I('geld')}${eur(w.geld)}`) + statusBlok('Gezondheid', `${I('hart')}${w.gezond}%`, w.gezond < 35 ? 'probleem' : '') + statusBlok('Gezocht', w.wanted ? `${I('ster')}${w.wanted} ${w.wanted === 1 ? 'ster' : 'sterren'}` : `${I('politie')}Niet`, w.wanted ? 'probleem' : '');

// ---------------------------------------------------------------- kaartminiatuur van de heldkaart (de omtrek van de route: jij, het doel, de weg)
const MINIKAART = (label) => `<div class="sp-held__kaart"><svg viewBox="0 0 360 230" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Route naar ${esc(label)}">
<rect width="360" height="230" fill="var(--ds-c-papier-2)"/>
<g fill="none" stroke="var(--ds-c-ink-inkt)" stroke-width="2" opacity=".35"><path d="M0 60H360M0 150H360M80 0V230M200 0V230M290 0V230"/></g>
<path d="M-10 195 C 80 170, 140 215, 230 180 S 340 130, 380 150" fill="none" stroke="var(--ds-c-ink-inkt)" stroke-width="12" opacity=".12"/>
<path d="M60 175 L 80 150 L 200 150 L 200 60 L 290 60" fill="none" stroke="var(--ds-c-ink-geel)" stroke-width="9" stroke-linejoin="round"/>
<path d="M60 175 L 80 150 L 200 150 L 200 60 L 290 60" fill="none" stroke="var(--ds-c-ink-inkt)" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
<circle cx="60" cy="175" r="11" fill="var(--ds-c-ink-papier)" stroke="var(--ds-c-ink-inkt)" stroke-width="3.5"/><circle cx="60" cy="175" r="4" fill="var(--ds-c-ink-inkt)"/>
<rect x="278" y="48" width="24" height="24" fill="var(--ds-c-ink-bord)" stroke="var(--ds-c-ink-inkt)" stroke-width="3.5"/><path d="M285 66V54l9 4-9 4" fill="var(--ds-c-wit)"/>
</svg><small>${esc(label)}</small></div>`;

// ---------------------------------------------------------------- A. Overzicht
function overzicht({ nieuw = false, bezig = false, gast = false, rustig = false } = {}) {
  const w = nieuw ? { ...S, geld: 250, pct: 0 } : S;
  const heldKop = gast ? `Verhaal van Anke · ${S.deel}` : nieuw ? 'Eerste stap · Akte 1: Moi, Grunn' : bezig ? `Je bent bezig · ${S.deel}` : `Volgende stap · ${S.deel}`;
  const titel = nieuw ? 'Nul krassen, vijftienhonderd punten' : S.stap;
  const lead = nieuw ? 'Honderdvijftig euro verdienen: Berend wacht bij het Martinikerkhof met zijn bakkie. Nul krassen, hè.' : S.lead;
  const plaats = nieuw ? 'Martinikerkhof' : S.plaats;
  const feiten = nieuw
    ? `${status('', `Martinikerkhof · 300 m`, 'plek')}${status('', 'Beloning €200', 'geld')}${status('zacht', 'Je kunt niets kwijtraken', 'info')}`
    : `${status('', `${S.plaats} · ${S.afstand}`, 'plek')}${status('', 'Beloning ± €250', 'geld')}${status('zacht', 'Dag, binnen', 'zon')}`;
  const voortgangStap = nieuw ? '' : `<div class="sp-fase">${balk(Math.round(S.stapN / S.stapT * 100), '', '')}<span class="sp-hulp">Stap ${S.stapN} van ${S.stapT} in ${S.deel.split(': ')[0]}</span></div>`;
  const actie = bezig
    ? `<div class="sp-actie">${knop('Verder met de missie', '', '', 'Enter')}${link('Missie stoppen')}</div><span class="sp-hulp">Stoppen kost niets en je kunt hem opnieuw starten. Wat je in deze poging deed, telt niet mee.</span>`
    : `<div class="sp-actie">${knop('Verder met deze stap', '', '', 'Enter')}${link('Op de kaart')}${nieuw ? '' : link('Eerder: ' + S.eerder + ' (Waar waren we?)')}</div>`;
  const held = `<section class="ds-z-kaart sp-held${bezig ? ' sp-held--bezig' : ''}" aria-label="Volgende stap"><header class="ds-z-kaart__kop"><h2 class="ds-z-kaart__titel">${esc(heldKop)}</h2>${gast ? status('', 'Alleen kijken', 'oog') : ''}</header>` +
    `<div class="sp-held__tekst"><h3 class="sp-held__titel">${esc(titel)}</h3><p class="sp-held__lead">${esc(lead)}</p><div class="sp-held__feiten">${bezig ? `${status('', 'Nog 2 van 5 punten', 'vlag')}${status('', 'Tijd 3:40', 'tijd')}` : feiten}</div>${voortgangStap}${gast ? `<div class="sp-actie">${knop('Verder spelen', '', '', 'Enter')}${link('Op de kaart')}</div><span class="sp-hulp">Het verhaal is van Anke, die het spel opende. Jij speelt mee; je geld en je voortgang zijn van jou.</span>` : actie}</div>${MINIKAART(plaats)}</section>`;
  const dichtbij = `<div>${tussen('Dichtbij', link('Alle activiteiten'))}<div class="sp-lijst">${rij('fiets', 'Fietskoerier', 'Bijbaan · Vismarkt', '220 m')}${rij('taart', 'Kermis', 'Evenement · vandaag open', '640 m')}</div></div>`;
  const links = `<div class="sp-kol">${held}${nieuw ? '' : dichtbij}</div>`;
  const voortgang = nieuw
    ? `<div class="sp-kol"><div class="ds-z-leeg" style="padding:22px 18px"><span class="sp-ikoon sp-ikoon--geel">${I('vlag')}</span><h3 class="ds-z-leeg__kop">Je zomer begint hier</h3><p class="ds-z-leeg__tekst" style="font-size:17px">Je voortgang verschijnt zodra je de eerste klus hebt gedaan. Verken, rij rond of volg het verhaal: alles telt mee.</p></div></div>`
    : `<div class="sp-kol"><section class="sp-voortgang">${tussen('Voortgang')}<div class="sp-voortgang__pct"><b>${w.pct}%</b><span>van het spel</span></div>${balk(w.pct)}<dl class="sp-regels"><dt>Verhaal</dt><dd>12 van 71</dd><dt>Prestaties</dt><dd>8 van 237</dd><dt>Kaart verkend</dt><dd>4%</dd><dt>Gebieden</dt><dd>1 van 21</dd></dl></section>` +
      `<section>${tussen('Bijna gehaald')}<div class="sp-lijst">${rij('prestaties', 'Stuntbaas', 'Nul krassen', '4 van 5')}${rij('prestaties', 'Dorpsbezoeker', 'Dorpen bezoeken', '9 van 10')}</div></section></div>`;
  const voet = `<footer class="sp-voetstrook"><span>${I('hulp', 'sp-ic--s')} Vastgelopen?</span>${link('Naar huis')}${link('Jezelf vrijzetten')}<span class="sp-uit sp-hulp">Speeltijd ${w === S ? S.speeltijd : 'net begonnen'} · ${nieuw ? 'nog niet opgeslagen' : 'opgeslagen ' + S.opslag}</span>${link('Nu opslaan')}</footer>`;
  const strookHtml = nieuw ? '' : strook(gast
    ? [klus('vandaag', 'spelers', 'Anke start een wedstrijd', 'Meedoen kan tot de rust', true), klus('nieuw', 'bericht', 'Tessa stuurde je een bericht', '1 ongelezen')]
    : [klus('vandaag', 'taart', 'Kermis opent vandaag', 'Grote Markt · tot 23:00', true), klus('nieuw', 'bericht', 'Tessa stuurde je een bericht', '1 ongelezen in Verhaal'), klus('nieuw', 'garage', 'Je Escapade staat klaar', 'Garage')], 0);
  return frame({ rail: { doorgaan: 'secundair', tijd: nieuw ? 'Vrijdag 14 augustus · 08:00' : S.tijd, punt: nieuw ? [] : ['Verhaal', 'Garage'] }, kop: { eb: `Spel · ${nieuw ? 'Akte 1: Moi, Grunn' : S.deel}`, titel: 'Overzicht', rechts: STATUS_SPELER(w) }, tab: 'Overzicht', tabN: { sessie: gast, Spelers: gast ? 2 : undefined, 'Opslaan en stoppen': nieuw ? 'punt' : undefined }, strookHtml,
    inhoud: `<div class="sp-body" style="grid-template-columns:minmax(0,1fr) 440px">${links}${voortgang}</div>${voet}`,
    hint: [['↑+↓', 'kiezen'], ['Enter', 'verder met deze stap'], ['Q+E', 'tabblad'], ['Esc', 'doorgaan']] });
}

// ---------------------------------------------------------------- B. Opslaan en stoppen
function opslaan({ overlay = '', fout = false, ongeslagen = false } = {}) {
  const statusRegel = fout ? status('probleem', 'Opslaan mislukt: de schijf is vol. Je spel is niet verloren, het staat nog open.', 'waarschuwing')
    : ongeslagen ? status('probleem', 'Niet opgeslagen sinds 26 min', 'waarschuwing') : status('goed', 'Opgeslagen · 4 min geleden', 'vinkje');
  const spel = `<section class="ds-z-kaart sp-spel" aria-label="Dit spel">${thumb('vismarkt', '', 'Huidig spel')}<div class="sp-spel__body"><div class="sp-rij sp-rij--tussen"><h2 class="sp-spel__naam">${S.naam}</h2>${link('Hernoemen')}</div>` +
    `<div class="sp-held__feiten">${status('', `${S.wie} · ${S.deel.split(': ')[0]}`, 'speler')}${status('', S.speeltijd, 'tijd')}${status('', 'Standaard', 'schild')}</div>${statusRegel}<span class="sp-hulp">Het spel bewaart ook vanzelf: elke paar minuten en bij elke missie.</span>` +
    `<div class="sp-actie" style="margin-top:auto">${knop(fout ? 'Opnieuw proberen' : 'Nu opslaan', '', '', 'Enter')}${klein('Opgeslagen spellen', 'secundair')}</div></div></section>`;
  const stop = `<section>${tussen('Het spel verlaten')}<div class="sp-stop"><b>Naar het hoofdmenu</b><span>Je spel wordt eerst opgeslagen. Daarna kies je een ander spel of Samen spelen.</span>${klein('Naar het menu')}</div><div class="sp-stop"><b>Afsluiten</b><span>Slaat je spel op en sluit het spel.</span>${klein('Afsluiten')}</div></section>`;
  const nieuw = `<section>${tussen('Opnieuw beginnen')}<div class="sp-stop"><b>Nieuw spel</b><span>Begint op een nieuwe plek. “${S.naam}” blijft staan.</span>${klein('Nieuw spel…')}</div><div class="sp-stop sp-stop--gevaar"><b>Laatste opslag terugzetten</b><span>Zet je spel terug naar 4 min geleden. Wat je daarna deed, gaat verloren.</span>${klein('Terugzetten…', 'gevaar')}</div></section>`;
  return frame({ rail: { doorgaan: 'secundair' }, kop: { eb: 'Spel', titel: 'Opslaan en stoppen', rechts: STATUS_SPELER() }, tab: 'Opslaan en stoppen', overlay,
    inhoud: `<div class="sp-body" style="grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:28px"><div class="sp-kol">${spel}${stop}</div><div class="sp-kol" style="padding-top:2px">${nieuw}<p class="sp-hulp" style="margin-top:6px">Alles hier is te herstellen behalve “Terugzetten”: dat wist wat je na je laatste opslag deed en vraagt daarom eerst om bevestiging.</p></div></div>` });
}
const modaal = (inhoud, onder = opslaan()) => onder.replace(/<\/div>$/, `<div class="sp-scherm">${inhoud}</div></div>`);
const verliesRegel = (ic, l, t, mod = '') => `<div class="sp-verlies__regel">${I(ic)}<b class="${mod}">${esc(l)}</b><span>${t}</span></div>`;
const BEV_TERUG = () => `<div class="sp-bevestig" role="alertdialog"><h2 class="sp-bevestig__kop">Laatste opslag terugzetten?</h2><p>Je spel gaat terug naar <b>4 min geleden</b>. Wat je daarna deed, is weg.</p>` +
  `<div class="sp-verlies sp-verlies--weg">${verliesRegel('waarschuwing', 'Je verliest', '4 min speeltijd · <b>+€640</b> · de missie “Een middag op het terras” (stap 6)', 'sp-slecht')}</div>` +
  `<div class="sp-verlies">${verliesRegel('vinkje', 'Blijft', 'Alle andere opgeslagen spellen (3) en de kopie van dit spel van 4 min geleden', 'sp-goed')}</div>` +
  `<div class="sp-bevestig__acties">${knop('Nee, doorspelen', '', '', 'Enter')}<span class="sp-rechts"></span>${knop('Houd vast om terug te zetten', 'gevaar', 'sp-vasthoud', 'Enter')}</div></div>`;
const BEV_NIEUW = () => `<div class="sp-bevestig" role="alertdialog"><h2 class="sp-bevestig__kop">Nieuw spel beginnen?</h2><p>Je begint opnieuw in Grunn, op plek 4 van 8. “${S.naam}” wordt eerst opgeslagen en blijft staan.</p>` +
  `<div class="sp-verlies">${verliesRegel('vinkje', 'Blijft', '“Hoofdspel”: 6 u 12, €12.840, Akte 2', 'sp-goed')}${verliesRegel('plus', 'Nieuw', 'Opgeslagen spel 4, vanaf de eerste stap, op een niveau dat je zo kiest', '')}</div>` +
  `<div class="sp-bevestig__acties">${knop('Verder naar het niveau', '', '', 'Enter')}${knop('Annuleren', 'secundair', '', 'Esc')}</div></div>`;

// ---------------------------------------------------------------- C. Opgeslagen spellen
const SLOTS = [
  { n: 1, naam: 'Hoofdspel', img: 'vismarkt', meta: '6 u 12 · Grote Markt<br>4 min geleden', cur: true, tag: 'Huidig' },
  { n: 2, naam: 'Proefrit Eemshaven', img: 'luchtfoto', meta: '3 u 40 · Eemshaven<br>gisteren', niveau: 'Uitdagend' },
  { n: 3, naam: 'Voor de overval', img: 'achtervolging', meta: '5 u 05 · Stationsplein<br>3 dagen geleden' },
  { n: 4, naam: 'Kermisavond', img: 'kermis', meta: '1 u 20 · Grote Markt<br>2 weken geleden', niveau: 'Ontspannen' },
  { n: 5, naam: 'Opgeslagen spel 5', img: 'ringrace', kapot: true, meta: 'Kan niet laden: dit spel komt van een nieuwere versie.' },
];
function slotKaart(s, { focus = 0, modus = 'game', vraag = '' } = {}) {
  const acties = s.kapot ? `<div class="sp-slot__acties">${klein('Reservekopie', 'secundair')}${klein(I('puntjes'), 'secundair', '')}</div>`
    : modus === 'start' ? `<div class="sp-slot__acties">${knop(s.cur ? 'Doorgaan' : 'Laden', s.cur ? '' : 'secundair', 'sp-kleinknop')}${knop(I('puntjes'), 'secundair', 'sp-kleinknop sp-slot__meer')}</div>`
    : `<div class="sp-slot__acties">${s.cur ? klein('Huidig spel', 'ghost') : klein('Laden', 'secundair')}${klein('Hier opslaan', s.cur ? 'secundair' : 'secundair')}${knop(I('puntjes'), 'secundair', 'sp-kleinknop sp-slot__meer')}</div>`;
  return `<article class="sp-slot${s.cur ? '' : ''}${s.kapot ? ' sp-slot--kapot' : ''}${focus ? ' sp-slot--focus' : ''}"${s.cur ? ' aria-current="true"' : ''}>${thumb(s.img, '', s.cur ? 'Huidig' : '')}<div class="sp-slot__naam"><span>${esc(s.naam)}</span>${s.niveau ? `<span class="sp-hulp">${s.niveau}</span>` : ''}</div><div class="sp-slot__meta">${s.meta}</div>${vraag}${acties}</article>`;
}
function slots({ modus = 'game', overlay = '', focus = 2 } = {}) {
  const alle = SLOTS.map((s) => slotKaart(s, { modus, focus: s.n === focus })).join('') + `<article class="sp-slot sp-slot--leeg"><span class="sp-ikoon">${I('plus')}</span><b class="sp-getal" style="font-size:22px">Lege plek</b><span class="sp-hulp">${modus === 'start' ? 'Nieuw spel' : 'Hier opslaan'}</span></article>`;
  const inhoud = `<div class="sp-body" style="gap:14px"><div class="sp-rij sp-rij--tussen">${status('', `${SLOTS.length} van 8 plekken in gebruik`, 'lijst')}<span class="sp-rij">${klein('Spel importeren', 'ghost')}${klein('Reservekopie herstellen', 'ghost')}</span></div><div class="sp-slots">${alle}</div></div>`;
  return `<div class="stage ds-zeef"><div class="sp-wereld" style="background-image:url('${GAME}/img/laad/vismarkt.jpg')"></div><main class="pane" style="left:76px;width:1752px">${kopband({ eb: modus === 'start' ? 'Hoofdmenu' : 'Spel · Opslaan en stoppen', titel: 'Opgeslagen spellen', rechts: modus === 'game' ? statusBlok('Dit spel', `${I('vinkje')}Opgeslagen`, 'goed') : '' })}${inhoud}</main>${hints([['←+→+↑+↓', 'kiezen'], ['Enter', modus === 'start' ? 'laden' : 'laden'], ['X', modus === 'game' ? 'hier opslaan' : 'meer'], ['Y', 'meer'], ['Esc', 'terug']])}${overlay}</div>`;
}
const BEV_OVER = () => `<div class="sp-bevestig" role="alertdialog" style="width:1040px"><h2 class="sp-bevestig__kop">“Voor de overval” overschrijven?</h2><p>Dit opgeslagen spel wordt vervangen door je huidige spel. Het oude spel is daarna <b>weg</b>.</p>` +
  `<div class="sp-vergelijk"><div class="sp-vergelijk__zij sp-vergelijk__zij--weg"><b>Nu in deze plek</b>${thumb('achtervolging')}<span>Opgeslagen spel · 5 u 05 · Akte 2<br>€9.120 · 3 dagen geleden</span></div><div class="sp-vergelijk__pijl">→</div><div class="sp-vergelijk__zij"><b>Straks in deze plek</b>${thumb('vismarkt')}<span>Hoofdspel · 6 u 12 · Akte 2<br>€12.840 · nu</span></div></div>` +
  `<div class="sp-verlies">${verliesRegel('vinkje', 'Veilig', 'Hetzelfde verhaal en meer speeltijd: je verliest alleen de stand van 3 dagen geleden', 'sp-goed')}</div>` +
  `<div class="sp-bevestig__acties">${knop('Nee, bewaar allebei', '', '', 'Enter')}${klein('Naar een lege plek', 'secundair', '')}<span class="sp-rechts"></span>${knop('Houd vast om te overschrijven', 'gevaar', 'sp-vasthoud', 'Enter')}</div></div>`;
const BEV_WEG = () => `<div class="sp-bevestig" role="alertdialog" style="width:820px"><h2 class="sp-bevestig__kop">“Voor de overval” verwijderen?</h2><p>Dit spel en zijn reservekopie gaan weg. Dat kan niet ongedaan worden gemaakt.</p>` +
  `<div class="sp-vergelijk" style="grid-template-columns:1fr"><div class="sp-vergelijk__zij sp-vergelijk__zij--weg" style="flex-direction:row;gap:14px;align-items:center"><div style="width:220px">${thumb('achtervolging')}</div><span><b>Voor de overval</b><br>5 u 05 · Akte 2 · €9.120<br>Laatst opgeslagen 3 dagen geleden</span></div></div>` +
  `<div class="sp-bevestig__acties">${knop('Nee, bewaren', '', '', 'Enter')}<span class="sp-rechts"></span>${knop('Houd vast om te verwijderen', 'gevaar', 'sp-vasthoud', 'Enter')}</div></div>`;
const BEV_LADEN = () => `<div class="sp-bevestig" role="alertdialog" style="width:820px"><h2 class="sp-bevestig__kop">“Proefrit Eemshaven” laden?</h2><p>Je speelt verder vanaf dit spel. Je huidige spel “${S.naam}” heeft <b>nog niet opgeslagen</b> wat je de laatste 26 min deed.</p>` +
  `<div class="sp-verlies sp-verlies--weg">${verliesRegel('waarschuwing', 'Anders weg', '26 min speeltijd · <b>+€640</b> · stap 6 van 14', 'sp-slecht')}</div>` +
  `<div class="sp-bevestig__acties">${knop('Opslaan en laden', '', '', 'Enter')}${knop('Laden zonder opslaan', 'secundair')}<span class="sp-rechts"></span>${knop('Annuleren', 'ghost', '', 'Esc')}</div></div>`;

// ---------------------------------------------------------------- D. Hoofdmenu
const KEUZE = (ic, t, sub, huidig = false, meta = '') => `<button type="button" class="sp-keuze"${huidig ? ' aria-current="true"' : ''}>${I(ic)}<span><b>${t}</b><span>${sub}</span></span>${meta ? `<span class="sp-hulp">${meta}</span>` : ''}</button>`;
function hoofdmenu({ nieuw = false, gast = false } = {}) {
  const held = nieuw
    ? `<button type="button" class="sp-doorgaan sp-doorgaan--groot sp-doorgaan--focus"><span class="sp-doorgaan__body"><span class="sp-doorgaan__kop"><span>Nieuw spel</span>${knopToets('Enter')}</span><span class="sp-doorgaan__regel">Begin je zomer in Grunn. Je kiest straks hoe pittig het is.</span></span></button>`
    : `<button type="button" class="sp-doorgaan sp-doorgaan--focus">${thumb('vismarkt')}<span class="sp-doorgaan__body"><span class="sp-doorgaan__kop"><span>Doorgaan</span>${knopToets('Enter')}</span><span class="sp-doorgaan__regel"><b>${S.naam}</b> · ${S.wie}</span><span class="sp-doorgaan__regel">${S.stap}</span><span class="sp-doorgaan__regel">${S.speeltijd} · ${S.geld ? eur(S.geld) : ''} · gisteren 21:40</span>${balk(S.pct)}</span></button>`;
  const keuzes = (nieuw ? '' : KEUZE('nieuw', 'Nieuw spel', 'Op een nieuwe plek; je andere spellen blijven staan') + KEUZE('laden', 'Opgeslagen spellen', 'Laden, hernoemen of verwijderen', false, '5 spellen')) +
    KEUZE('samen', 'Samen spelen', 'Speel met vrienden in een eigen, besloten sessie') + KEUZE('instellingen', 'Instellingen', 'Beeld, geluid, besturing en moeilijkheid') + KEUZE('uitgang', 'Afsluiten', 'Sluit het spel');
  const paneel = `<aside class="sp-menu"><div class="sp-logo"><span class="sp-logo__mark">GDE</span><div><span class="sp-logo__sign">Groningen</span><small>Zomer vol misdaad</small></div></div>${held}<div class="sp-keuzes">${keuzes}</div><div class="sp-menu__hints">${hints([['↑+↓', 'kiezen'], ['Enter', 'doen'], ['1–5', 'snelkeuze']])}</div><div class="sp-menu__voet"><span class="sp-pegi">18</span><span>v0.66.0 · <button class="ds-z-link" type="button" style="font-size:14px">Over en nieuws</button></span></div></aside>`;
  return `<div class="stage ds-zeef"><div class="sp-wereld sp-wereld--licht" style="background-image:url('${GAME}/img/laad/luchtfoto.jpg')"></div>${paneel}<div class="sp-plek">${I('plek')}Martinikerk, Grunn</div></div>`;
}
const meter = (n, w, l, ic) => `<span class="sp-meter">${I(ic, 'sp-ic--s')}<span>${l}</span><i class="${n>0?'aan':''}"></i><i class="${n>1?'aan':''}"></i><i class="${n>2?'aan':''}"></i><b>${w}</b></span>`;
function nieuwSpel() {
  const inhoud = `<div class="sp-bevestig" role="dialog" style="width:1020px"><div class="sp-rij sp-rij--tussen"><div><div class="sp-label">Nieuw spel · plek 4 van 8</div><h2 class="sp-bevestig__kop">Hoe pittig moet het zijn?</h2></div>${status('zacht', 'Je kunt dit later aanpassen bij Instellingen', 'info')}</div>` +
    `<div class="sp-niveaus" role="radiogroup"><button class="sp-niveau" role="radio" aria-checked="false"><b>Ontspannen</b><span>Meer tijd, rustige politie. Voor het verhaal.</span><small>${meter(1,'ruim','Tijd','tijd')}${meter(1,'rustig','Politie','politie')}${meter(1,'rustig','Verkeer','auto')}</small></button><button class="sp-niveau" role="radio" aria-checked="true"><b>Standaard</b><span>Zoals bedoeld. Goed om mee te beginnen.</span><small>${meter(2,'gewoon','Tijd','tijd')}${meter(2,'gewoon','Politie','politie')}${meter(2,'gewoon','Verkeer','auto')}<em class="sp-aanb">Aanbevolen</em></small></button><button class="sp-niveau" role="radio" aria-checked="false"><b>Uitdagend</b><span>Minder tijd, scherpe politie, druk verkeer.</span><small>${meter(3,'krap','Tijd','tijd')}${meter(3,'scherp','Politie','politie')}${meter(3,'druk','Verkeer','auto')}</small></button></div>` +
    `<div class="sp-rij sp-rij--tussen"><span class="sp-rij">${status('', 'Naam: Opgeslagen spel 4', 'pen')}${link('Wijzigen')}</span>${link('Eigen opties aanpassen')}</div><div class="sp-bevestig__acties">${knop('Begin het spel', '', '', 'Enter')}${knop('Terug', 'secundair', '', 'Esc')}<span class="sp-rechts sp-hulp">Toetsen 1, 2 of 3 kiezen een niveau</span></div></div>`;
  return `<div class="stage ds-zeef"><div class="sp-wereld" style="background-image:url('${GAME}/img/laad/luchtfoto.jpg')"></div><div class="sp-scherm">${inhoud}</div></div>`;
}

// ---------------------------------------------------------------- E. Laadscherm
function laadscherm({ soort = 'save' } = {}) {
  const kick = soort === 'save' ? 'Verder in' : 'Naar';
  const plaats = soort === 'save' ? 'Grote Markt' : 'Drenthe';
  const stap = soort === 'save' ? 'Gebouwen en straten komen binnen' : 'De route naar Drenthe wordt gebouwd';
  return `<div class="stage ds-zeef"><div class="sp-laad"></div><div class="sp-laad__kader"><div class="sp-laad__links"><div class="sp-logo"><span class="sp-logo__mark" style="font-size:150px">GDE</span><div><span class="sp-logo__sign" style="font-size:44px">Groningen</span><small style="font-size:22px">Zomer vol misdaad</small></div></div>` +
    `<div class="sp-laad__kaart"><small>${kick}</small><div class="sp-laad__plaats">${plaats}</div>${soort === 'save' ? '' : `<div style="padding:0 18px 14px">${status('goed', 'Vandaag: Kiezelweek', 'datum')}</div>`}</div></div><div class="sp-laad__beeld" style="background-image:url('${GAME}/img/laad/${soort === 'save' ? 'vismarkt' : 'rondvaart'}.jpg')"></div></div>` +
    `<div class="sp-laad__onder">${balk(soort === 'save' ? 72 : 38)}<div class="sp-laad__stap"><span>${stap}</span>${soort === 'save' ? '' : ''}</div></div></div>`;
}
function laadWacht() {
  return laadscherm({ soort: 'reis' }).replace(/<div class="sp-laad__stap"><span>[^<]*<\/span>/, `<div class="sp-laad__stap"><span><b class="sp-label" style="margin-right:10px">Tip</b>Houd {Spatie} ingedrukt om een scène over te slaan; je verliest er niets mee.</span>`).replace('{Spatie}', '</span>' + toets('Spatie') + '<span>').replace(/<\/span><span class="ds-z-toets">/, '</span>&nbsp;<span class="ds-z-toets">');
}
function laadKlaar() {
  return laadscherm({ soort: 'save' }).replace('<div class="sp-laad__stap"><span>Gebouwen en straten komen binnen</span>', `<div class="sp-laad__stap"><span>Klaar, Grunn staat te wachten</span>${knop('Verder', '', '', 'Enter')}`);
}

// ---------------------------------------------------------------- F. Uitslag: opgepakt en buiten westen
function uitslag(soort) {
  const op = soort === 'opgepakt';
  const bon = op
    ? `<div class="ds-z-bon"><div class="ds-z-bon__regel"><span>Boete (2 sterren)</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag sp-slecht">−€120</span></div><div class="ds-z-bon__regel"><span>Zoekniveau</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag sp-goed">gewist</span></div><div class="ds-z-bon__regel"><span>Missie “Een middag op het terras”</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag">opnieuw te starten</span></div><div class="ds-z-bon__totaal"><span>Je houdt over</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag">€12.720</span></div></div>`
    : `<div class="ds-z-bon"><div class="ds-z-bon__regel"><span>Ziekenhuis</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag sp-goed">gratis</span></div><div class="ds-z-bon__regel"><span>Gezondheid</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag sp-goed">weer 100%</span></div><div class="ds-z-bon__regel"><span>Je Escapade</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag">staat bij de voordeur</span></div><div class="ds-z-bon__totaal"><span>Je houdt over</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag">€12.840</span></div></div>`;
  return `<div class="stage ds-zeef"><div class="sp-wereld" style="background-image:url('${GAME}/img/laad/achtervolging.jpg')"></div><div class="sp-uitslag"><section class="sp-uitslag__kaart"><span class="sp-stempel">${op ? 'Bekeuring' : 'Opgelapt'}</span><span class="sp-uitslag__klein">${op ? 'Staande gehouden' : 'Neergegaan'}</span><h1 class="sp-uitslag__kop">${op ? 'Opgepakt' : 'Buiten westen'}</h1><p style="font-size:20px">${op ? 'De agent schrijft een bon uit en brengt je naar het bureau aan het Martinikerkhof.' : 'Je bent opgelapt in het UMCG. Zonder rekening, de ambulance was gratis.'}</p>${bon}` +
    `<div class="sp-actie" style="margin-top:4px">${knop(op ? 'Verder' : 'Verder', '', '', 'Enter')}${op ? link('Missie opnieuw proberen') : ''}<span class="sp-hulp" style="margin-left:auto">Wacht je, dan gaat het scherm vanzelf weg (8 s)</span></div></section></div>${hints([['Enter', 'verder'], ['Spatie', 'overslaan']])}</div>`;
}

// ---------------------------------------------------------------- G. Waar waren we? en aanwijzingen
function recap() {
  return `<div class="stage ds-zeef"><div class="sp-wereld sp-wereld--licht" style="background-image:url('${GAME}/img/laad/vismarkt.jpg')"></div><div class="sp-scherm"><section class="sp-recap" role="dialog"><h1 class="sp-recap__kop">Waar waren we?</h1><span class="sp-hulp" style="margin-top:-8px">${S.deel} · stap ${S.stapN} van ${S.stapT}</span>` +
    `<div class="sp-recap__rij"><span class="sp-ikoon">${I('verhaal')}</span><div><small>Waar het om draait</small><p>Een recept van 1953 om eerlijk te winnen: Oma Trijntjes vijf ingrediënten van vijf vrienden. Jelle koopt ze op.</p></div></div>` +
    `<div class="sp-recap__rij"><span class="sp-ikoon">${I('vinkje')}</span><div><small>Laatst gedaan</small><p>${S.eerder}</p></div></div>` +
    `<div class="sp-recap__rij sp-recap__rij--nu"><span class="sp-ikoon sp-ikoon--geel">${I('doel')}</span><div><small>Nu</small><p>${S.stap}: ${S.lead}</p></div></div>` +
    `<div class="sp-actie" style="justify-content:space-between">${link('Naar het Overzicht')}${knop('Verder', '', '', 'Enter')}</div></section></div>${hints([['Enter', 'verder'], ['Esc', 'verder'], ['M', 'overzicht']])}</div>`;
}
function aanwijzingen() {
  const toast = (x, y, ic, kop, tekst, w) => `<div class="sp-toast" style="left:${x}px;top:${y}px"><div class="sp-toast__ic">${I(ic)}</div><div class="sp-toast__b"><small>${kop}</small><p>${tekst}</p></div><div class="sp-toast__balk"><i style="--w:${w}%"></i></div></div>`;
  return `<div class="stage ds-zeef"><div class="sp-wereld sp-wereld--licht" style="background-image:url('${GAME}/img/laad/vismarkt.jpg')"></div>` +
    `<div style="position:absolute;left:60px;top:50px;width:620px;display:flex;flex-direction:column;gap:16px"><div class="sp-paneel" style="color:var(--ds-c-wit)"><h3 style="color:var(--ds-c-wit)">1. Het doel staat altijd in beeld (de HUD, bestaand)</h3></div><section class="ds-z-kaart" style="transform:none;padding:10px 14px;gap:4px"><span class="sp-label">Doel</span><b class="sp-getal" style="font-size:26px">${S.stap}</b><span class="sp-hulp">${S.plaats} · ${S.afstand}</span></section></div>` +
    toast(60, 330, 'bericht', 'Na 5 minuten', 'Nog even dit: Een middag op het terras. Staat op je kaart, als je zin hebt.', 80) +
    toast(60, 470, 'kaart', 'Na 15 minuten', 'Nog steeds: Een middag op het terras. Geen haast, de kaart wijst het aan.', 45) +
    toast(60, 610, 'taxi', 'Doel ver weg', 'Tessa: Dat is ver. Met de taxi ben je er sneller. Kaart, dan Reis erheen.', 30) +
    `<div style="position:absolute;left:760px;top:330px;width:560px;display:flex;flex-direction:column;gap:12px;color:var(--ds-c-wit);background:var(--ds-c-glas);padding:22px;border-radius:var(--ds-r)"><div class="sp-paneel"><h3 style="color:var(--ds-c-wit)">Voorstel: één plek, één stem, één regel</h3></div><p style="font-size:19px;line-height:1.4">De drie zachte aanwijzingen (herinnering, OV-hint, “Zit je vast?”) komen allemaal uit het personage dat je niet speelt, op dezelfde plek, met dezelfde duurbalk; ze nemen nooit een klik en nooit een toets.</p><p style="font-size:19px;line-height:1.4">Wie ze niet wil, zet ze uit bij Instellingen, Hints en uitleg. Het Overzicht blijft de plek waar je de stap altijd kunt nalezen.</p></div></div>`;
}

// ---------------------------------------------------------------- H. Rail in toestanden
function railToestanden() {
  const k = (t, r) => `<div class="sp-paneel" style="position:relative;width:300px;height:870px"><h3 style="color:var(--ds-c-wit);height:48px">${t}</h3><div style="position:relative;flex:1">${r.replace('class="rail"', 'class="rail" style="left:0;top:0"')}</div></div>`;
  return `<div class="stage ds-zeef"><div class="sp-wereld" style="background-image:url('${GAME}/img/laad/vismarkt.jpg')"></div><div style="position:absolute;left:60px;top:40px;display:flex;gap:44px">` +
    k('In het spel, Doorgaan geel', rail({ doorgaan: 'primair', punt: [] })) + k('Paneel met eigen gele knop: Doorgaan secundair', rail({ doorgaan: 'secundair' })) + k('Vanuit het hoofdmenu (nog geen spel)', rail({ prestart: true, punt: [], actief: 'Instellingen' })) +
    `<div style="color:var(--ds-c-wit);width:560px;font-size:19px;line-height:1.45;display:flex;flex-direction:column;gap:12px"><h3 style="font-family:var(--ds-font-zeef-kop);font-size:26px;letter-spacing:.06em;text-transform:uppercase">Wat er verandert</h3><p>1. Alle twaalf onderdelen, Afsluiten en de versie passen zonder scrollen op elke maat, ook op 1280x720 (nu scrolt de rail daar en verdwijnen logo en datum; de huidige rail heeft er twee koppen en Cheats bij).</p><p>2. Een groep van één onderdeel (Spel, Instellingen) heeft geen kop meer: de kop herhaalde alleen de naam eronder.</p><p>3. Datum en tijd staan één keer, in de rail; de tijd is groot, de dag klein.</p><p>4. Een rode ruit bij een onderdeel dat nieuws heeft (bericht, nieuwe auto); nooit een getal erachter, dat stond er dubbel.</p><p>5. Doorgaan is geel, tenzij het paneel een eigen gele knop heeft. Vanuit het hoofdmenu (nog geen spel) heet de knop Terug en staat er alleen Instellingen.</p><p>6. De zoekknop blijft; de toets / opent hem.</p></div></div></div>`;
}
function toestanden() {
  const paneel = (t, inh) => `<div class="sp-paneel"><h3 style="color:var(--ds-c-ink-bord)">${t}</h3>${inh}</div>`;
  const laden = `<div class="sp-kol"><div class="sp-skel" style="height:150px" aria-busy="true"></div><div class="sp-skel" style="height:24px"></div><div class="sp-skel" style="height:24px;width:70%"></div></div>`;
  const fout = `<section class="ds-z-kaart ds-z-kaart--probleem" style="transform:none"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('waarschuwing')}Opslaan mislukt</h3></header><p style="font-size:17px">De schijf is vol, dus ${S.naam} kon niet worden bewaard. Het spel staat nog open en niets is verloren.</p><div class="ds-z-kaart__voet">${klein('Opgeslagen spellen', 'secundair')}${klein('Opnieuw proberen', '')}</div></section>`;
  const leeg = `<div class="ds-z-leeg"><span class="sp-ikoon sp-ikoon--geel">${I('opslaan')}</span><h3 class="ds-z-leeg__kop">Nog geen opgeslagen spellen</h3><p class="ds-z-leeg__tekst" style="font-size:17px">Sla je spel op en het staat hier, met een beeld van waar je was.</p>${klein('Nu opslaan', '')}</div>`;
  const sessie = `<section class="ds-z-kaart" style="transform:none"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('spelers')}Je speelt mee</h3></header><p style="font-size:17px">Anke opende dit spel. Jij kunt je eigen spel niet laden zolang je meedoet; “Naar het hoofdmenu” verlaat de sessie.</p><div class="ds-z-kaart__voet">${klein('Sessie verlaten', 'secundair')}</div></section>`;
  const oud = `<section class="ds-z-kaart ds-z-kaart--uit" style="transform:none"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('slot')}Opgeslagen spel 5</h3></header><p style="font-size:17px">Dit spel komt van een nieuwere versie van GDE en kan niet laden. Het blijft ongewijzigd staan.</p><div class="ds-z-kaart__voet">${klein('Exporteren', 'secundair')}</div></section>`;
  const rustig = `<div class="ds-rustig sp-kol">${statusBlok('Geld', `${I('geld')}${eur(S.geld)}`)}${knop('Verder met deze stap', '', '', 'Enter')}${klein('Nu opslaan', 'secundair')}</div>`;
  return `<div class="stage ds-zeef"><div class="sp-wereld" style="background-image:url('${GAME}/img/laad/vismarkt.jpg')"></div><main class="pane" style="left:76px;width:1752px;top:60px;height:960px"><header class="ds-z-kopband"><div><div class="ds-z-kopband__eb">Spel</div><h1 class="ds-z-kopband__titel">Toestanden</h1></div></header><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px;padding-top:6px;align-content:start">` +
    paneel('Laden (aria-busy, geen spinner)', laden) + paneel('Fout bij opslaan', fout) + paneel('Leeg: geen opgeslagen spellen', leeg) + paneel('Samen spelen: gast', sessie) + paneel('Kan niet laden (nieuwere versie)', oud) + paneel('Rustig drukwerk', rustig) + `</div></main></div>`;
}
function bediening() {
  const b = (n, x, y) => `<span class="sp-badge" style="left:${x}px;top:${y}px">${n}</span>`;
  const o = overzicht().replace(/<\/div>$/, '');
  const leg = `<div style="position:absolute;left:384px;top:940px;width:1444px;display:flex;gap:30px;color:var(--ds-c-wit);font-size:var(--ds-t-hulp)"><span><b>1</b> Doorgaan (altijd bereikbaar met Esc of B)</span><span><b>2</b> tabblad (Q en E, LB en RB)</span><span><b>3</b> Aandacht: links en rechts</span><span><b>4</b> de gele knop (Enter of A)</span><span><b>5</b> Dichtbij</span><span><b>6</b> Vastgelopen</span></div>`;
  return o + b(1, 100, 134) + b(2, 396, 160) + b(3, 880, 200) + b(4, 400, 524) + b(5, 400, 660) + b(6, 400, 840) + leg + '</div>';
}

// ---------------------------------------------------------------- schrijven
const SCHERMEN = {
  'a-overzicht': () => overzicht(), 'a2-overzicht-nieuw': () => overzicht({ nieuw: true }), 'a3-overzicht-missie': () => overzicht({ bezig: true }), 'a4-overzicht-gast': () => overzicht({ gast: true }),
  'b-opslaan': () => opslaan(), 'b2-terugzetten': () => modaal(BEV_TERUG(), opslaan()), 'b3-nieuw-bevestig': () => modaal(BEV_NIEUW(), opslaan()), 'b4-opslaan-fout': () => opslaan({ fout: true }),
  'c-slots': () => slots(), 'c2-overschrijven': () => modaal(BEV_OVER(), slots()), 'c3-verwijderen': () => modaal(BEV_WEG(), slots({ focus: 3 })), 'c4-laden-ongeslagen': () => modaal(BEV_LADEN(), slots({ focus: 2 })),
  'd-hoofdmenu': () => hoofdmenu(), 'd2-hoofdmenu-nieuw': () => hoofdmenu({ nieuw: true }), 'd3-nieuw-spel': () => nieuwSpel(), 'd4-hoofdmenu-laden': () => slots({ modus: 'start' }),
  'e-laad-save': () => laadscherm({ soort: 'save' }), 'e2-laad-reis': () => laadscherm({ soort: 'reis' }), 'e3-laad-lang': () => laadWacht(), 'e4-laad-klaar': () => laadKlaar(),
  'f-opgepakt': () => uitslag('opgepakt'), 'f2-buiten-westen': () => uitslag('west'),
  'g-recap': () => recap(), 'g2-aanwijzingen': () => aanwijzingen(),
  'h-rail': () => railToestanden(), 'h2-toestanden': () => toestanden(), 'h3-bediening': () => bediening(),
};
const PAGINA = (naam, body) => `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${esc(naam)} – Spel, ontwerp 24-11</title><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${GAME}/fonts/fonts.css"><link rel="stylesheet" href="${GAME}/js/ds-tokens.css"><link rel="stylesheet" href="${GAME}/js/ds-components.css"><link rel="stylesheet" href="${GAME}/js/ds-scroll.css"><link rel="stylesheet" href="../mock.css"></head><body>${body}
<script>
function fit(){var s=Math.min(innerWidth/1920,innerHeight/1080);var H=innerHeight/s;var st=document.querySelector('.stage');
st.style.transform='scale('+s+')';st.style.left=Math.max(0,(innerWidth-1920*s)/2)+'px';st.style.top='0px';st.style.setProperty('--mz',s);st.style.setProperty('--menu-min','calc(13px / '+s+')');
if(H>1080){var ex=H-1080;st.style.height=H+'px';document.querySelectorAll('.pane:not([style*="top"]),.rail:not([style*="top"])').forEach(function(e){e.style.height=(806+ex)+'px'});var hn=document.querySelector('.hints');if(hn){hn.style.top=(902+ex)+'px'}}}
fit();addEventListener('resize',fit);
</script></body></html>`;
const gedeeld = fs.readFileSync(path.join(HERE, 'gedeeld.css'), 'utf8');
const src = fs.readFileSync(path.join(HERE, 'mock.src.css'), 'utf8') + '\n' + gedeeld;
fs.writeFileSync(path.join(WERK, 'mock.css'), src.replace(/font-size: (\d+)px/g, (m, n) => (Number(n) < 20 ? `font-size: max(${n}px, var(--menu-min))` : m)));
for (const [naam, f] of Object.entries(SCHERMEN)) fs.writeFileSync(path.join(OUT, naam + '.html'), PAGINA(naam, f()));
console.log('gebouwd:', Object.keys(SCHERMEN).length, 'schermen');
