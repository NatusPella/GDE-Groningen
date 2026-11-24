// Bouwt de statische mockups van Land en bedrijf (ontwerp 24-11) naar <repo>/.scr/bezit-ontwerp/scherm/*.html (lokaal, niet in git).
// Gebruik: node docs/ontwerp/bezit-ui-24-11/bouw.mjs, dan node schiet.mjs (beelden) en node index.mjs (de pagina). Alleen DS3-CSS uit game/js, geen nieuwe kleur of lettertype.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let ROOT = HERE;
while (!fs.existsSync(path.join(ROOT, 'game', 'js', 'ds-tokens.css'))) { const up = path.dirname(ROOT); if (up === ROOT) throw new Error('repo-root niet gevonden'); ROOT = up; }
const WERK = path.join(ROOT, '.scr', 'bezit-ontwerp');
const OUT = path.join(WERK, 'scherm');
const GAME = path.relative(OUT, path.join(ROOT, 'game')).split(path.sep).join('/');
const { icoon } = await import(pathToFileURL(path.join(ROOT, 'game', 'js', 'icons.js')).href);
fs.mkdirSync(OUT, { recursive: true });

const I = (n, cls = '') => icoon(n, { cls: 'bz3-ic ' + cls });
const eur = (n) => '€' + Math.round(n).toLocaleString('nl-NL');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- gedeelde stukken
const toets = (t) => `<span class="ds-z-toets">${t}</span>`;
const knop = (t, mod = '', extra = '') => `<button type="button" class="ds-z-knop${mod ? ' ds-z-knop--' + mod : ''}${extra ? ' ' + extra : ''}">${t}</button>`;
const klein = (t, mod = 'secundair') => knop(t, mod, 'bz3-kleinknop');
const stand = (soort, tekst, ic) => `<span class="bz3-stand bz3-stand--${soort}">${ic ? I(ic) : ''}${esc(tekst)}</span>`;
const plaat = (ic, getal, label, mod = '', stil = false) => `<span class="ds-z-waarde${mod ? ' ds-z-waarde--' + mod : ''}${stil ? ' bz3-waarde--stil' : ''}">${I(ic, 'ds-z-waarde__icoon')}<span class="bz3-waarde__tekst"><span class="ds-z-waarde__getal">${getal}</span><small>${esc(label)}</small></span></span>`;
const seg = (opties, actief, extra = '', label = '') => `<div class="bz3-seg ${extra}" role="radiogroup"${label ? ` aria-label="${esc(label)}"` : ''}>${opties.map(([id, t, sub, uit]) => `<button type="button" role="radio" aria-checked="${id === actief}"${uit ? ' disabled' : ''}><span>${id === actief ? I('vinkje') : ''}${esc(t)}</span>${sub ? `<small>${sub}</small>` : ''}</button>`).join('')}</div>`;
const stap = (label, waarde) => `<span class="bz3-stap"><i>${I('pijl_links', 'bz3-ic--s')}</i><span>${esc(label)} <b>${esc(waarde)}</b></span><i>${I('pijl_rechts', 'bz3-ic--s')}</i></span>`;
const feiten = (rijen) => `<dl class="bz3-feiten">${rijen.map(([k, v, c]) => `<dt>${esc(k)}</dt><dd${c ? ` class="bz3-${c}"` : ''}>${v}</dd>`).join('')}</dl>`;
const bon = (regels, totaal) => `<div class="ds-z-bon bz3-bon">${regels.map(([k, v, c]) => `<div class="ds-z-bon__regel"><span>${esc(k)}</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag${c ? ' bz3-' + c : ''}">${v}</span></div>`).join('')}${totaal ? `<div class="ds-z-bon__totaal"><span>${esc(totaal[0])}</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag">${totaal[1]}</span></div>` : ''}</div>`;
const spark = (punten, w = 220, h = 46) => {
  const max = Math.max(...punten), min = Math.min(...punten);
  const xs = punten.map((_, i) => (i / (punten.length - 1)) * (w - 12) + 6);
  const ys = punten.map((p) => h - 8 - ((p - min) / (max - min || 1)) * (h - 16));
  const d = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  return `<svg class="bz3-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Verloop over zeven dagen"><path d="${d}" fill="none" stroke="var(--ds-c-ink-inkt)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><rect x="${(xs.at(-1) - 5).toFixed(1)}" y="${(ys.at(-1) - 5).toFixed(1)}" width="10" height="10" fill="var(--ds-c-ink-geel)" stroke="var(--ds-c-ink-inkt)" stroke-width="2.5"/></svg>`;
};

// ---------------------------------------------------------------- de wereld van het scenario (één verhaal voor alle schermen)
const S = {
  geld: 18450, waarde: 186400, perDag: 559, aandacht: 3,
  velden: [
    { id: 'zonnehoek', naam: 'Zonnehoek', soort: 'akker', ha: 1.2, plaats: 'Hoogkerk', gebruik: 'Zelf', gewas: 'Aardappelen', st: 'groeit', stTekst: 'Kiemt', pct: 18, x: 0 },
    { id: 'wierde', naam: 'Wierdeakker', soort: 'akker', ha: 2.0, plaats: 'Hoogkerk', gebruik: 'Zelf', gewas: 'Graan', st: 'rijp', stTekst: 'Oogstklaar', pct: 100 },
    { id: 'klei', naam: 'Kleistuk Noord', soort: 'akker', ha: 3.4, plaats: 'Winsum', gebruik: 'Personeel', gewas: 'Bieten', st: 'groeit', stTekst: 'Groeit', pct: 62, dag: 95 },
    { id: 'eenrum', naam: 'Eenrum-weide', soort: 'weiland', ha: 5.5, plaats: 'Eenrum', gebruik: 'Personeel', gewas: '14 koeien', st: 'probleem', stTekst: 'Zieke kudde', pct: 100, dag: 130 },
    { id: 'pieter', naam: 'Pieterburen-kavel', soort: 'akker', ha: 1.6, plaats: 'Pieterburen', gebruik: 'Verpacht', gewas: 'Stoppel', st: 'braak', stTekst: 'Verpacht', pct: 0, dag: 45 },
    { id: 'zuidhorn', naam: 'Zuidhorn-akker', soort: 'akker', ha: 4.1, plaats: 'Zuidhorn', gebruik: 'Zelf', gewas: 'Braak', st: 'braak', stTekst: 'Ligt braak', pct: 0 },
  ],
};
const TABS = [['overzicht', 'Overzicht', null, false], ['boerderij', 'Boerderij', 6, true], ['bedrijven', 'Bedrijven', 2, false], ['tekoop', 'Te koop', 12, false], ['snack', 'Snackwagen', null, true], ['club', 'Club', null, false]];
const NU = [
  { urg: 'nu', ic: 'waarschuwing', kop: 'Zieke kudde bij Eenrum', sub: 'Dierenarts €120 · 14 koeien', tab: 'boerderij' },
  { urg: 'vandaag', ic: 'oogst', kop: 'Wierdeakker is oogstklaar', sub: '2,0 ha graan · ± €1.240', tab: 'boerderij' },
  { urg: 'vandaag', ic: 'plek', kop: 'Vergunning Stationsplein', sub: 'Nog 3 dagen · verlengen €480', tab: 'snack' },
];
const URG = { nu: ['NU', 'waarschuwing'], vandaag: ['VANDAAG', 'tijd'], later: ['LATER', 'zandloper'] };
const klus = (k, focus = false) => `<button type="button" class="bz3-klus bz3-klus--${k.urg}${focus ? ' bz3-kaart--focus' : ''}">${stand(k.urg, URG[k.urg][0], URG[k.urg][1])}<span class="bz3-klus__tekst"><b>${esc(k.kop)}</b><span>${esc(k.sub)}</span></span>${I('pijl_rechts')}</button>`;

const RAIL = [['Spel', ['Spel']], ['Doen', ['Verhaal', 'Activiteiten', 'Loopbanen', 'Kaart']], ['Bezit', ['Spullen', 'Garage', 'Land en bedrijf']], ['Voortgang', ['Veroverd', 'Prestaties', 'Foto’s']], ['Systeem', ['Instellingen']]];

function hints(lijst) {
  return `<div class="hints">${lijst.map(([t, w]) => `<span>${t.split('+').map((x) => toets(x)).join('')} ${esc(w)}</span>`).join('')}</div>`;
}
const HINT_STD = [['↑+↓', 'kiezen'], ['Enter', 'doen'], ['Q+E', 'tabblad'], ['Esc', 'terug']];

function frame({ actief = 'overzicht', waarden, nu = NU, titel = 'Land en bedrijf', eb = 'Bezit', tabs = TABS, inhoud, hint = HINT_STD, overlay = '', focusNu = -1, rail = 'Land en bedrijf', geenNu = false, nuMeer = 2, rust = false }) {
  const railHtml = `<aside class="rail"><span class="rail__logo">GDE</span><span class="rail__datum">Vrijdag 14 augustus · 08:07</span>` +
    RAIL.map(([g, items]) => `<div class="rail__groep">${g}</div>` + items.map((t) => `<div class="rail__item"${t === rail ? ' aria-current="true"' : ''}>${t}</div>`).join('')).join('') + '</aside>';
  const tabHtml = tabs ? `<nav class="bz3-tabs" role="tablist" aria-label="${esc(titel)}"><span class="bz3-tabs__q">${toets('Q')}</span>` + tabs.map(([id, t, n, a]) => `<button type="button" role="tab" class="bz3-tab${a ? ' bz3-tab--aandacht' : ''}" aria-selected="${id === actief}">${esc(t)}${n != null ? `<small>${n}</small>` : ''}</button>`).join('') + `<span class="bz3-tabs__e">${toets('E')}</span></nav>` : '';
  const nuHtml = geenNu ? '' : `<div class="bz3-nu"><div class="bz3-nu__kop">${I('klembord')}<span>Nu te doen</span></div>${nu.map((k, i) => klus(k, i === focusNu)).join('')}${nuMeer ? `<span class="bz3-klus__meer">+${nuMeer} meer</span>` : ''}</div>`;
  return `<div class="stage ds-zeef${rust ? ' ds-rustig' : ''}">${railHtml}<main class="pane">` +
    `<header class="bz3-kop"><div><div class="bz3-kop__eb">${esc(eb)}</div><h1 class="bz3-kop__titel">${esc(titel)}</h1></div><div class="bz3-waarden">${waarden}</div></header>` +
    tabHtml + nuHtml + inhoud + `</main>${hints(hint)}${overlay}</div>`;
}
const WAARDEN = (a = S) => plaat('geld', eur(a.geld), 'geld') + plaat('gebouw', eur(a.waarde), 'totale waarde') + plaat('geldhand', '+' + eur(a.perDag), 'per dag', 'wijzig') + plaat('waarschuwing', String(a.aandacht), 'aandacht', 'gevaar');

// ---------------------------------------------------------------- de kaart: percelen met kleurcodes (SVG)
const POLY = {
  zuidhorn: '40,60 132,50 152,112 58,128', klei: '218,40 322,32 340,92 230,102', eenrum: '378,30 500,40 512,118 394,124',
  pieter: '438,150 522,146 530,204 450,208', aanbod1: '322,150 376,146 384,192 332,198', aanbod2: '40,150 92,146 98,190 48,196', zonnehoek: '108,168 160,162 172,206 120,214', wierde: '196,164 272,158 288,218 208,224',
};
const KLEUR = { eigen: ['var(--ds-c-ink-papier)', ''], aanbod: ['var(--ds-c-ink-geel)', ''], rijp: ['url(#f-rijp)', 'O'], groeit: ['var(--ds-c-ink-geel)', 'G'], braak: ['url(#f-braak)', 'B'], verpacht: ['url(#f-verpacht)', 'V'], probleem: ['var(--ds-c-ink-geel)', '!'] };
const KAART_STAND = { zuidhorn: 'braak', klei: 'groeit', eenrum: 'groeit', pieter: 'verpacht', zonnehoek: 'groeit', wierde: 'rijp' };
function defs() {
  return `<defs>
  <pattern id="f-braak" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--ds-c-ink-papier)"/><circle cx="3" cy="3" r="1.15" fill="var(--ds-c-ink-inkt)"/></pattern>
  <pattern id="f-verpacht" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="var(--ds-c-ink-papier)"/><rect width="2" height="8" fill="var(--ds-c-ink-inkt)"/></pattern>
  <pattern id="f-rijp" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--ds-c-ink-bord)"/></pattern>
  <pattern id="f-water" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--ds-c-papier-2)"/><circle cx="3" cy="3" r="1" fill="var(--ds-c-ink-bord)"/></pattern>
  </defs>`;
}
function veldKaart({ w = 560, h = 250, sel = 'wierde', vlak = null, markers = [], eigen = null, etiketten = true, zoom = null } = {}) {
  const ids = vlak || Object.keys(POLY).filter((k) => !k.startsWith('aanbod'));
  const ratio = w / h; let vb = zoom; let Wv = 560; if (!vb) { Wv = Math.max(560, 236 * ratio); const Hv = Wv / ratio; vb = (280 - Wv / 2) + ` ` + (128 - Hv / 2) + ` ` + Wv + ` ` + Hv; } else { Wv = Number(vb.split(" ")[2]); }
  const k = Math.max(1, Wv / w);
  const polys = ids.map((id) => {
    const st = (eigen && eigen[id]) || KAART_STAND[id];
    const [fill, letter] = KLEUR[st] || KLEUR.braak;
    const pts = POLY[id].split(' ').map((p) => p.split(',').map(Number));
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const gekozen = id === sel;
    const sh = gekozen ? `<polygon points="${POLY[id]}" transform="translate(5,5)" fill="var(--ds-c-ink-inkt)"/>` : '';
    return `${sh}<polygon points="${POLY[id]}" fill="${fill}" stroke="var(--ds-c-ink-inkt)" stroke-width="${gekozen ? 4.5 : 2.5}" stroke-linejoin="round"${st === 'verpacht' ? ' stroke-dasharray="7 4"' : ''}/>` +
      (letter === '' ? '' : `<g transform="translate(${cx.toFixed(0)},${cy.toFixed(0)})"><rect x="${-12 * k}" y="${-12 * k}" width="${24 * k}" height="${24 * k}" rx="${4 * k}" fill="${st === 'rijp' ? 'var(--ds-c-wit)' : 'var(--ds-c-ink-papier)'}" stroke="var(--ds-c-ink-inkt)" stroke-width="2.5"/><text y="${6 * k}" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="${17 * k}" fill="var(--ds-c-ink-inkt)">${letter}</text></g>`);
  }).join('');
  const plaatsen = etiketten ? [['Zuidhorn', 66, 48], ['Winsum', 346, 72], ['Eenrum', 408, 146], ['Hoogkerk', 128, 152], ['Pieterburen', 380, 214]].map(([t, x, y]) => `<g><rect x="${x - 6}" y="${y - 12}" width="${8 * k}" height="${8 * k}" fill="var(--ds-c-ink-inkt)"/><text x="${x + 6 + 4 * k}" y="${y - 4}" font-family="Barlow Condensed" font-weight="800" font-size="${14.5 * k}" fill="var(--ds-c-ink-inkt)" stroke="var(--ds-c-papier-2)" stroke-width="3" paint-order="stroke">${t}</text></g>`).join('') : '';
  const mk = markers.map(([x, y, n, actief]) => `<g transform="translate(${x},${y})">${actief ? '<rect x="-17" y="-17" width="40" height="40" fill="var(--ds-c-ink-inkt)"/>' : ''}<rect x="-15" y="-15" width="30" height="30" rx="4" fill="${actief ? 'var(--ds-c-ink-geel)' : 'var(--ds-c-ink-papier)'}" stroke="var(--ds-c-ink-inkt)" stroke-width="2.5"/><text y="7" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="19" fill="var(--ds-c-ink-inkt)">${n}</text></g>`).join('');
  return `<div class="bz3-mini" style="width:${w}px;height:${h}px"><svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Kaart van je velden">${defs()}
  <rect x="-600" y="-300" width="1800" height="1000" fill="var(--ds-c-papier-2)"/><path d="M-600,236 C-200,224 120,214 250,248 C400,232 500,226 1200,222 L1200,500 L-600,500 Z" fill="url(#f-water)" stroke="var(--ds-c-ink-inkt)" stroke-width="2" stroke-dasharray="3 5"/>
  <path d="M-600,140 C-200,128 150,128 300,152 C400,140 500,134 1200,134" fill="none" stroke="var(--ds-c-ink-inkt)" stroke-width="3"/><path d="M292,-300 L302,500" fill="none" stroke="var(--ds-c-ink-inkt)" stroke-width="2"/>
  ${polys}${plaatsen}${mk}</svg></div>`;
}
const legenda = () => `<div class="bz3-kaartlegenda"><span><i class="i-braak"></i>Braak</span><span><i class="i-groeit"></i>Groeit</span><span><i class="i-rijp"></i>Oogstklaar</span><span><i class="i-verpacht"></i>Verpacht</span></div>`;

// ---------------------------------------------------------------- schermen
const SCHERMEN = {};

// 1. Overzicht, gevuld: portfolio van kaarten
SCHERMEN.overzicht = () => {
  const kaart = (ic, titel, status, mini, rijen, trend, ctx = '') => `<article class="ds-z-kaart bz3-kaart bz3-kaart--klik"${ctx} tabindex="0"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I(ic)}${esc(titel)}</h3><span class="bz3-open">Open ${I('pijl_rechts', 'bz3-ic--s')}</span></header>` +
    `<div class="bz3-rij" style="align-items:stretch;gap:14px">${mini}<div class="bz3-kol" style="flex:1;justify-content:space-between"><div class="bz3-rij" style="flex-wrap:wrap;gap:6px">${status}</div>${feiten(rijen)}</div></div>${trend}</article>`;
  const trend = (pts, txt, mod = 'plus') => `<div class="bz3-rij" style="gap:12px"><div style="flex:1">${spark(pts, 240, 34)}</div><span class="bz3-hulp"><b class="bz3-${mod}">${txt}</b> t.o.v. gisteren</span></div>`;
  const land = kaart('boerderij', 'Boerderij en land', stand('rijp', '1 oogstklaar', 'veld_rijp') + stand('probleem', 'Zieke kudde', 'waarschuwing') + stand('braak', '1 braak', 'veld_braak'),
    veldKaart({ w: 250, h: 150, etiketten: false, sel: null }), [['Velden', '6 · 17,8 ha'], ['Per dag', '+' + eur(210), 'plus'], ['Waarde', eur(31400)]], trend([180, 195, 190, 205, 200, 215, 210], '+5%'));
  const bedr = kaart('winkel', 'Bedrijven', stand('rijp', 'Beide open', 'vinkje') + stand('groeit', 'Onderhoud 74%', 'gereedschap'),
    `<div class="bz3-mini" style="width:250px;height:150px">${veldKaart({ w: 250, h: 150, vlak: [], etiketten: false, markers: [[80, 60, '1', true], [170, 96, '2', false]] })}</div>`, [['Panden', '2'], ['Per dag', '+' + eur(275), 'plus'], ['Waarde', eur(133950)]], trend([240, 250, 262, 255, 268, 270, 275], '+2%'));
  const snack = kaart('burger', 'Snackwagen Tam & Tes', stand('later', 'Opent 11:00', 'tijd') + stand('vandaag', 'Vergunning 3 dgn', 'plek'),
    `<div class="bz3-mini" style="width:250px;height:150px">${veldKaart({ w: 250, h: 150, vlak: [], etiketten: false, markers: [[125, 75, '★', true]] })}</div>`, [['Plek', 'Stationsplein'], ['Per dag', '+' + eur(74), 'plus'], ['Waarde', eur(5600)]], trend([40, 60, 38, 70, 66, 80, 74], '-7%', 'min'));
  const club = kaart('spel', 'Club', stand('later', 'Aandeel 5%', 'prestaties'),
    `<div class="bz3-mini" style="width:250px;height:150px;display:grid;place-items:center"><span class="bz3-getal" style="font-size:44px">5%</span></div>`, [['Club', 'SC Ommelanden'], ['Dividend', eur(40)], ['Waarde', eur(6000)]], `<span class="bz3-hulp">Je dividend komt na elke competitieronde.</span>`);
  const rechts = `<aside class="bz3-kol" style="gap:12px"><section class="ds-z-kaart ds-z-kaart--bord bz3-kaart" style="gap:10px"><header class="ds-z-kaart__kop" style="background:transparent"><h3 class="ds-z-kaart__titel" style="color:var(--ds-c-wit)">${I('doel')}Volgende stap</h3></header><p style="font-size:20px;line-height:1.25">Wierdeakker is rijp: 2,0 ha graan. Oogst het vandaag, dan staat het geld morgen op je rekening.</p><div class="bz3-actie">${knop('Naar het veld', '', '')}<span class="bz3-actie__sub" style="color:var(--ds-c-wit)">± ${eur(1240)}</span></div></section>` +
    `<section class="ds-z-kaart bz3-kaart"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('bon')}Gisteren per bron</h3></header>${bon([['Boerderij en land', '+' + eur(270), 'plus'], ['Loon personeel', '−' + eur(60), 'min'], ['Buurtsuper', '+' + eur(190), 'plus'], ['Woning (huur)', '+' + eur(85), 'plus'], ['Snackwagen', '+' + eur(74), 'plus']])}<span class="bz3-hulp">Samen is dat je dagbedrag bovenaan.</span></section>` +
    `<section class="ds-z-kaart bz3-kaart"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('nieuws')}Nieuws van het land</h3></header><p>Bieten brengen in Winsum 8% meer op dan in Zuidhorn.</p><p class="bz3-hulp">Meer nieuws als er iets gebeurt; anders blijft dit blok dicht.</p></section></aside>`;
  const inhoud = `<div class="bz3-md" style="grid-template-columns:1fr 1fr 420px;grid-template-rows:1fr 1fr;align-content:start;gap:16px"><div style="grid-column:1/3;display:grid;grid-template-columns:1fr 1fr;gap:16px;grid-row:1/3;align-content:start">${land}${bedr}${snack}${club}</div><div style="grid-column:3;grid-row:1/3">${rechts}</div></div>`;
  return frame({ actief: 'overzicht', waarden: WAARDEN(), inhoud, focusNu: -1, hint: [['↑+↓', 'kaart kiezen'], ['Enter', 'openen'], ['Q+E', 'tabblad'], ['Esc', 'terug']] });
};

// 2. Overzicht, nog niets in bezit
SCHERMEN.leeg = () => {
  const stapKaart = (nr, ic, titel, tekst, prijs, extra, primair, uit) => `<article class="ds-z-kaart bz3-kaart${uit ? ' ds-z-kaart--uit' : ''}" style="min-height:430px"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I(ic)}${nr}. ${esc(titel)}</h3></header><div class="bz3-skel" style="height:120px;display:grid;place-items:center">${I(ic, 'bz3-ic--xl')}</div><p style="font-size:19px">${esc(tekst)}</p><div class="bz3-kol" style="margin-top:auto;gap:10px">${prijs ? feiten([['Vanaf', prijs], ['Levert', extra]]) : `<span class="bz3-hulp">${esc(extra)}</span>`}${primair ? knop('Bekijk wat te koop is') : uit ? `<button class="ds-z-knop" disabled>${I('slot')} Komt later</button>` : knop('Bekijk panden', 'secundair')}</div></article>`;
  const inhoud = `<div class="bz3-leeg" style="justify-content:flex-start;padding-top:22px"><div class="bz3-kol" style="align-items:center;gap:8px"><h2 class="bz3-leeg__kop">Nog niets in bezit</h2><p>Land en panden leveren elke dag geld, ook als jij er niet bent. Begin klein: je hebt ${eur(5000)}.</p></div>` +
    `<div class="bz3-stappen">${stapKaart(1, 'gewas', 'Koop een perceel', 'Een stuk weiland of akker bij je in de buurt. Je kiest zelf of je het bewerkt, laat bewerken of verpacht.', eur(2400), '± ' + eur(14) + ' per dag', true)}${stapKaart(2, 'winkel', 'Koop een pand', 'Een winkel of woning brengt dagelijks omzet of huur op. Dat kost meer, dus spaar eerst.', eur(34200), '± ' + eur(60) + ' per dag', false)}${stapKaart(3, 'burger', 'De snackwagen', 'Tessa en Tammo hebben een wagen op het oog, maar eerst moet het verhaal verder.', null, 'Komt later in het verhaal', false, true)}</div></div>`;
  return frame({ actief: 'overzicht', waarden: plaat('geld', eur(5000), 'geld'), nu: [], geenNu: true, tabs: TABS.map(([i, t]) => [i, t, null, false]), inhoud, hint: [['Enter', 'kiezen'], ['Q+E', 'tabblad'], ['Esc', 'terug']] });
};

// 3. Boerderij, velden: kaart + lijst + detail
const veldRij = (v, sel, vink = false) => {
  const ikoon = { rijp: 'veld_rijp', groeit: 'veld_groeiend', braak: 'veld_braak', probleem: 'koe' }[v.st];
  const klasse = { rijp: 'rijp', groeit: 'groeit', braak: 'braak', probleem: 'groeit' }[v.st];
  const lbl = v.st === 'rijp' ? stand('rijp', 'Oogstklaar') : v.st === 'probleem' ? stand('probleem', 'Ziek') : v.st === 'braak' ? stand('braak', v.stTekst) : `<b class="bz3-getal" style="font-size:20px">${v.pct}%</b>`;
  return `<div class="ds-z-rij${sel ? ' ds-z-rij--selectie' : ''}" ${sel ? 'aria-current="true"' : ''}>${vink !== null ? `<span class="bz3-vink${vink ? ' bz3-vink--aan' : ''}">${vink ? I('vinkje') : ''}</span>` : ''}<span class="bz3-ikoon bz3-ikoon--${klasse}">${I(ikoon, 'bz3-ic--l')}</span><span><span class="ds-z-rij__naam">${esc(v.naam)}</span><span class="ds-z-rij__sub">${v.ha.toLocaleString('nl-NL')} ha · ${esc(v.gewas)} · ${esc(v.gebruik)}</span></span><span class="ds-z-rij__waarde">${lbl}</span></div>`;
};
const SUB = (act) => `<div class="bz3-rij bz3-rij--tussen"><div role="radiogroup" aria-label="Boerderij" class="bz3-seg bz3-seg--klein">${[['velden', 'Velden'], ['team', 'Team'], ['machines', 'Machines'], ['erf', 'Erf en opslag'], ['kas', 'Kasboek']].map(([id, t]) => `<button type="button" role="radio" aria-checked="${id === act}">${t}</button>`).join('')}</div></div>`;
const fasen = (actief, dag) => { const F = [['Zaaien', 'zaaien', ''], ['Kiemen', 'blad', ''], ['Groeien', 'gewas', ''], ['Rijp', 'oogst', ''], ['Oogsten', 'schaar', '']]; return `<ol class="bz3-fasen">${F.map(([t, ic], i) => `<li class="${i < actief ? 'is-klaar' : i === actief ? 'is-nu' : 'is-later'}"><i>${i < actief ? I('vinkje') : I(ic)}</i><b>${t}</b><small>${i === actief ? dag : i < actief ? 'klaar' : ''}</small></li>`).join('')}</ol>`; };

const veldenScherm = ({ lijstHtml, kaartSel, detail, overlay = '', focusNu = -1, hint }) => {
  const links = `<div class="bz3-kol" style="width:540px;gap:8px">${veldKaart({ w: 540, h: 184, sel: kaartSel })}${legenda()}${lijstHtml}</div>`;
  return frame({ actief: 'boerderij', waarden: WAARDEN(), overlay, focusNu, hint, inhoud: SUB('velden') + `<div class="bz3-md" style="grid-template-columns:540px 1fr;gap:20px">${links}<div class="bz3-detail" style="flex:1">${detail}</div></div>` });
};
const kopRegel = (naam, sub, st) => `<div class="bz3-rij bz3-rij--tussen"><div><h2 class="bz3-hero__titel" style="font-size:34px">${naam}</h2><span class="bz3-hulp">${sub}</span></div>${st}</div>`;
const lijstKop = (vinkTekst, aan) => `<div class="bz3-lijst__kop"><span class="bz3-rij"><span class="bz3-vink${aan ? ' bz3-vink--aan' : ''}">${aan ? I('vinkje') : ''}</span><span class="bz3-hulp">${vinkTekst}</span></span>${stap('Sorteren', 'oogst eerst')}</div>`;

SCHERMEN.velden = (overlay = '') => {
  const v = S.velden;
  const lijstHtml = `<div class="bz3-lijst ds-scroll" data-onder="1" style="flex:1">${lijstKop('6 velden · 17,8 ha', false)}${[v[1], v[3], v[5], v[2], v[0], v[4]].map((x, i) => veldRij(x, i === 0, false)).join('')}</div>`;
  const detail = kopRegel('Wierdeakker', 'Akker · 2,0 ha · Hoogkerk · bodem goed', stand('rijp', 'Oogstklaar', 'veld_rijp')) +
    `<section class="bz3-hero"><div class="bz3-label">Graan · 30 dagen geleden gezaaid</div>${fasen(3, 'nu')}<div class="bz3-actie">${knop('Oogsten')}<span class="bz3-actie__sub">± 3.600 kg · ± ${eur(1240)}</span>${klein('Op de kaart')}</div></section>` +
    `<div class="bz3-raster2"><section class="bz3-blok"><div class="bz3-label"><span>Wie werkt hier</span>${I('spelers')}</div>${seg([['zelf', 'Zelf', 'jij, op het veld'], ['staf', 'Personeel', '+' + eur(95) + ' per dag'], ['pacht', 'Verpacht', '+' + eur(45) + ' per dag']], 'zelf', 'bz3-seg--blok', 'Gebruik')}</section>` +
    `<section class="bz3-blok"><div class="bz3-label"><span>Volgend gewas</span>${I('gewas')}</div>${seg([['graan', 'Graan', eur(22) + ' per 100 kg'], ['aardappel', 'Aardappelen', 'prijs stijgt'], ['bieten', 'Bieten', 'prijs gelijk']], 'aardappel', 'bz3-seg--blok', 'Gewas')}</section></div>` +
    `<div class="bz3-raster2"><section class="bz3-blok"><div class="bz3-label"><span>Team</span>${I('hart')}</div><div class="ds-z-balk" style="--ds-z-w:78%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">14 van 18 ha per dag bezet</span></div></section>` +
    `<section class="bz3-blok"><div class="bz3-label"><span>Verzekering</span>${I('schild')}</div><div class="bz3-rij bz3-rij--tussen"><span>Stortbui: <b>niet gedekt</b></span>${klein('Verzeker ' + eur(6) + ' per dag')}</div></section></div>`;
  return veldenScherm({ lijstHtml, kaartSel: 'wierde', detail, overlay, hint: [['↑+↓', 'veld kiezen'], ['Enter', 'doen'], ['Spatie', 'aanvinken'], ['Q+E', 'tabblad'], ['Esc', 'terug']] });
};

// 4. Boerderij, meerdere velden gekozen
SCHERMEN.bulk = () => {
  const v = S.velden;
  const lijstHtml = `<div class="bz3-lijst ds-scroll" data-onder="1" style="flex:1">${lijstKop('<b>3 gekozen</b> · 8,6 ha', true)}` + [[v[1], true], [v[3], false], [v[5], true], [v[2], false], [v[0], true], [v[4], false]].map(([x, k], i) => veldRij(x, i === 0, k)).join('') + '</div>';
  const detail = `<div class="bz3-rij bz3-rij--tussen"><div><h2 class="bz3-hero__titel" style="font-size:34px">3 velden gekozen</h2><span class="bz3-hulp">Wierdeakker, Zuidhorn-akker en Zonnehoek · 8,6 ha</span></div>${klein('Kies niets')}</div>` +
    `<section class="bz3-hero"><div class="bz3-label">Wat past nu op deze keuze</div><div class="bz3-actie">${knop('Oogst 1 veld')}<span class="bz3-actie__sub">alleen Wierdeakker is rijp · ± ${eur(1240)}</span></div><div class="bz3-actie">${klein('Zaai bieten op 1 veld')}<span class="bz3-actie__sub">Zuidhorn-akker ligt braak · zaaigoed ± ${eur(164)}</span></div></section>` +
    `<section class="bz3-blok"><div class="bz3-label"><span>Wie werkt hier</span>${I('spelers')}</div>${seg([['zelf', 'Zelf', '3 velden'], ['staf', 'Personeel', 'past nu op 1 veld'], ['pacht', 'Verpacht', '+' + eur(150) + ' per dag']], null, 'bz3-seg--blok', 'Gebruik')}</section>` +
    `<div class="bz3-raster2"><section class="bz3-blok"><div class="bz3-label"><span>Verzekering</span>${I('schild')}</div><div class="bz3-actie">${klein('Verzeker stortbui')}${klein('Zeg op')}</div><span class="bz3-hulp">${eur(3)} per ha per dag · 8,6 ha</span></section>` +
    `<section class="bz3-blok"><div class="bz3-label"><span>Ongedierte</span>${I('spuit')}</div><div class="bz3-actie"><button class="ds-z-knop ds-z-knop--secundair bz3-kleinknop" disabled>${I('slot')} Bestrijd mieren</button></div><span class="bz3-hulp">Geen last op de gekozen velden.</span></section></div>`;
  return veldenScherm({ lijstHtml, kaartSel: null, detail, hint: [['↑+↓', 'veld kiezen'], ['Spatie', 'aanvinken'], ['Enter', 'doen'], ['Q+E', 'tabblad'], ['Esc', 'terug']] });
};

// 5. Boerderij, weiland met vee
SCHERMEN.vee = () => {
  const v = S.velden;
  const lijstHtml = `<div class="bz3-lijst ds-scroll" data-onder="1" style="flex:1">${lijstKop('6 velden · 17,8 ha', false)}${[v[3], v[1], v[5], v[2], v[0], v[4]].map((x, i) => veldRij(x, i === 0, false)).join('')}</div>`;
  const koeien = Array.from({ length: 14 }, (_, i) => `<span class="bz3-ikoon" title="${i === 5 ? 'Ziek' : 'Gezond'}" style="width:32px;height:32px;${i === 5 ? 'border-color:var(--ds-c-rood);background:var(--ds-c-rood);color:var(--ds-c-wit)' : ''}">${I(i === 5 ? 'ehbo' : 'koe')}</span>`).join('');
  const detail = kopRegel('Eenrum-weide', 'Weiland · 5,5 ha · Eenrum · bodem uitstekend', stand('probleem', 'Zieke kudde', 'waarschuwing')) +
    `<section class="bz3-hero" style="background:var(--ds-c-rood-vlak);border-color:var(--ds-c-rood);box-shadow:var(--ds-schaduw-hard-roze)"><div class="bz3-label" style="color:var(--ds-c-rood-tx)">1 van 14 koeien is ziek</div><div class="bz3-rij" style="flex-wrap:wrap;gap:6px">${koeien}</div><div class="bz3-actie">${knop('Bel de dierenarts')}<span class="bz3-actie__sub">${eur(120)} · zonder arts raken er meer dieren ziek</span></div></section>` +
    `<div class="bz3-raster2"><section class="bz3-blok"><div class="bz3-label"><span>Kudde</span>${I('koe')}</div>${feiten([['Dieren', '14 van 22 plekken'], ['Per dag', '+' + eur(130), 'plus'], ['Waarde', eur(9100)]])}<div class="bz3-actie">${klein('Uitbreiden +4 · ' + eur(2600))}${klein('Verkopen ' + eur(9100), 'gevaar')}</div></section>` +
    `<section class="bz3-blok"><div class="bz3-label"><span>Wie werkt hier</span>${I('spelers')}</div>${seg([['zelf', 'Zelf', 'in het spel'], ['staf', 'Personeel', '+' + eur(130) + ' per dag']], 'staf', 'bz3-seg--blok', 'Gebruik')}<span class="bz3-hulp">Berend verzorgt de kudde.</span></section></div>`;
  return veldenScherm({ lijstHtml, kaartSel: 'eenrum', detail, focusNu: 0, hint: [['↑+↓', 'veld kiezen'], ['Enter', 'doen'], ['Q+E', 'tabblad'], ['Esc', 'terug']] });
};

// 6. Boerderij, team (AI-personeel)
SCHERMEN.team = () => {
  const medew = (naam, rang, loon, werkt, ha, ic) => `<div class="ds-z-rij"><span class="bz3-ikoon">${I(ic, 'bz3-ic--l')}</span><span><span class="ds-z-rij__naam">${naam}</span><span class="ds-z-rij__sub">${rang} · werkt op ${werkt}</span></span><span class="ds-z-rij__waarde">${ha} ha<small>${loon} per dag</small></span></div>`;
  const links = `<div class="bz3-kol" style="width:640px;gap:12px"><div class="bz3-lijst ds-scroll" data-onder="1"><div class="bz3-lijst__kop"><span class="bz3-label">Jouw team · 2 mensen</span><span class="bz3-hulp">samen ${eur(60)} per dag</span></div>${medew('Berend', 'Vakman', eur(38), 'Eenrum-weide', 10, 'hart')}${medew('Tinus', 'Leerling', eur(22), 'Kleistuk Noord', 4, 'speler')}<div class="ds-z-rij ds-z-rij--uit"><span class="bz3-ikoon bz3-ikoon--braak"></span><span><span class="ds-z-rij__naam">Nog een plek vrij</span><span class="ds-z-rij__sub">Neem iemand aan in het blok hiernaast</span></span><span></span></div></div>` +
    `<section class="bz3-blok"><div class="bz3-label"><span>Capaciteit per dag</span>${I('tempo')}</div><div class="ds-z-balk" style="--ds-z-w:78%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">14 van 18 ha in gebruik</span></div><span class="bz3-hulp">Personeel werkt 80% van wat jij zelf haalt. Het loon gaat elke dag van je geld af.</span></section></div>`;
  const optie = (t, sub, ha, loon, hoofd) => `<div class="ds-z-kaart bz3-kaart" style="flex:1"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${t}</h3></header>${feiten([['Haalt', ha + ' ha per dag'], ['Loon', loon + ' per dag']])}<span class="bz3-hulp">${sub}</span>${hoofd ? knop('Aannemen') : klein('Aannemen')}</div>`;
  const rechts = `<div class="bz3-detail" style="flex:1"><div><h2 class="bz3-hero__titel" style="font-size:34px">Iemand aannemen</h2><span class="bz3-hulp">Een tweede vakman neemt het werk op Zuidhorn-akker over.</span></div><div class="bz3-rij" style="align-items:stretch">${optie('Leerling', 'Goedkoop, maar traag.', 4, eur(22), false)}${optie('Vakman', 'De beste prijs voor wat hij haalt.', 8, eur(38), true)}${optie('Meester', 'Duur: voor grote percelen.', 14, eur(70), false)}</div>` +
    `<section class="bz3-blok"><div class="bz3-label"><span>Wat verandert er?</span>${I('klembord')}</div>${bon([['Loon per dag', '−' + eur(38), 'min'], ['Zuidhorn-akker (4,1 ha) wordt bewerkt', '+' + eur(95), 'plus']], ['Per dag erbij', '+' + eur(57)])}<span class="bz3-hulp">Je geld daalt niet bij het aannemen; het loon loopt per dag mee.</span></section></div>`;
  return frame({ actief: 'boerderij', waarden: WAARDEN(), inhoud: SUB('team') + `<div class="bz3-md" style="grid-template-columns:640px 1fr;gap:20px">${links}${rechts}</div>`, hint: [['↑+↓', 'kiezen'], ['←+→', 'rang'], ['Enter', 'aannemen'], ['Q+E', 'tabblad'], ['Esc', 'terug']] });
};

// 7. Bedrijven
SCHERMEN.bedrijven = () => {
  const rij = (ic, naam, sub, w, sel) => `<div class="ds-z-rij${sel ? ' ds-z-rij--selectie' : ''}" ${sel ? 'aria-current="true"' : ''} style="grid-template-columns:auto minmax(0,1fr) auto"><span class="bz3-ikoon">${I(ic, 'bz3-ic--l')}</span><span><span class="ds-z-rij__naam">${naam}</span><span class="ds-z-rij__sub">${sub}</span></span><span class="ds-z-rij__waarde">${w}</span></div>`;
  const links = `<div class="bz3-kol" style="width:480px;gap:12px"><div class="bz3-lijst ds-scroll" data-onder="1"><div class="bz3-lijst__kop"><span class="bz3-label">Panden · 2</span><span class="bz3-hulp">+${eur(275)} per dag</span></div>${rij('winkel', 'Buurtsuper bij Hoogkerk', 'Winkel · 2 van 3 personeel', '+' + eur(190) + '<small>per dag</small>', true)}${rij('thuis', 'Woning bij Winsum', 'Verhuurd · huurder woont er', '+' + eur(85) + '<small>per dag</small>', false)}</div>${veldKaart({ w: 480, h: 220, vlak: [], etiketten: true, markers: [[196, 176, '1', true], [300, 100, '2', false]] })}${knop('Panden te koop bekijken', 'secundair')}</div>`;
  const rechts = `<div class="bz3-detail" style="flex:1"><div class="bz3-rij bz3-rij--tussen"><div><h2 class="bz3-hero__titel" style="font-size:34px">Buurtsuper bij Hoogkerk</h2><span class="bz3-hulp">Winkel · 140 m² · van jou sinds dag 12</span></div>${stand('rijp', 'Open', 'vinkje')}</div>` +
    `<section class="bz3-hero"><div class="bz3-label">Beste volgende stap</div><div class="bz3-hero__titel" style="font-size:24px">Een tweede kassa: korte rijen, meer klanten</div><div class="bz3-actie">${knop('Uitbreiden ' + eur(4800))}<span class="bz3-actie__sub">+${eur(38)} per dag · terugverdiend in ± 126 dagen · je houdt ${eur(13650)} over</span></div></section>` +
    `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px"><section class="bz3-blok"><div class="bz3-label"><span>Omzet en kosten</span>${I('bon')}</div>${bon([['Omzet', eur(310)], ['Inkoop', '−' + eur(84), 'min'], ['Personeel', '−' + eur(36), 'min']], ['Netto per dag', '+' + eur(190)])}</section>` +
    `<section class="bz3-blok"><div class="bz3-label"><span>Klanten</span>${I('speler')}</div><div class="bz3-getal" style="font-size:34px">46 <span class="bz3-hulp" style="font-family:var(--ds-font-zeef-tekst);font-weight:400">gisteren</span></div>${spark([32, 35, 33, 40, 38, 43, 46])}<span class="bz3-hulp"><b class="bz3-plus">+8%</b> t.o.v. gisteren · 4 gemist</span></section>` +
    `<section class="bz3-blok"><div class="bz3-label"><span>Tevredenheid</span>${I('hart')}</div><div class="ds-z-balk" style="--ds-z-w:82%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">82 van 100</span></div><span class="bz3-hulp">Pluspunt: schoon en vol. Minpunt: rijen om vijf uur.</span></section>` +
    `<section class="bz3-blok"><div class="bz3-label"><span>Personeel</span>${I('spelers')}</div>${feiten([['Aan het werk', '2 van 3'], ['Loon', eur(36) + ' per dag']])}${klein('Aannemen ' + eur(18) + ' per dag')}</section>` +
    `<section class="bz3-blok"><div class="bz3-label"><span>Onderhoud</span>${I('gereedschap')}</div><div class="ds-z-balk ds-z-balk--tijd" style="--ds-z-w:74%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">74%</span></div>${klein('Renovatie ' + eur(1250))}</section>` +
    `<section class="bz3-blok"><div class="bz3-label"><span>Waarde en verkoop</span>${I('geld')}</div>${feiten([['Waarde', eur(84000)], ['Verkoopt voor', eur(63000)]])}${klein('Verkopen', 'gevaar')}</section></div></div>`;
  return frame({ actief: 'bedrijven', waarden: WAARDEN(), inhoud: `<div class="bz3-md" style="grid-template-columns:480px 1fr;gap:20px">${links}${rechts}</div>`, hint: [['↑+↓', 'pand kiezen'], ['Enter', 'doen'], ['Q+E', 'tabblad'], ['Esc', 'terug']] });
};

// 8. Te koop
const koopRij = (ic, naam, sub, prijs, terug, sel, uit) => `<div class="ds-z-rij${sel ? ' ds-z-rij--selectie' : ''}${uit ? ' ds-z-rij--uit' : ''}" ${sel ? 'aria-current="true"' : ''} style="grid-template-columns:auto minmax(0,1fr) auto"><span class="bz3-ikoon">${I(ic, 'bz3-ic--l')}</span><span><span class="ds-z-rij__naam">${naam}</span><span class="ds-z-rij__sub">${sub}</span></span><span class="ds-z-rij__waarde">${prijs}<small>${terug}</small></span></div>`;
SCHERMEN.tekoop = (overlay = '') => {
  const filters = `<div class="bz3-filters">${stap('Soort', 'alles')}${stap('Sorteren', 'snelst terug')}${stap('Binnen', '3 km')}<span class="bz3-hulp" style="margin-left:auto">9 van 12 · ${I('slot', 'bz3-ic--s')} 2 nog te duur</span></div>`;
  const lijst = `<div class="bz3-lijst ds-scroll" data-onder="1" style="flex:1">${koopRij('gewas', 'Wei bij Dorkwerd', 'Weiland · 1,5 ha · bodem goed · 1,4 km', eur(2700), '159 dagen terug', true)}${koopRij('gewas', 'Dijkweide bij Dorkwerd', 'Weiland · 1,2 ha · uitstekend · 1,5 km', eur(2500), '179 dagen terug')}${koopRij('gewas', 'Polderweide bij Dorkwerd', 'Weiland · 2,1 ha · uitstekend · 1,3 km', eur(4550), '168 dagen terug')}${koopRij('gewas', 'Wei bij Dorkwerd', 'Weiland · 2,0 ha · goed · 1,5 km', eur(4200), '175 dagen terug')}${koopRij('gebouw', 'Bakkerij bij Zuidhorn', 'Pand · 96 m² · 2,1 km', eur(38500), 'je mist ' + eur(20050), false, true)}${koopRij('gewas', 'Polderweide bij Leegkerk', 'Weiland · 3,6 ha · bodem matig · 1,1 km', eur(5450), '218 dagen terug')}${koopRij('gewas', 'Dijkweide bij Leegkerk', 'Weiland · 7,4 ha · bodem matig · 0,8 km', eur(8600), '183 dagen terug')}${koopRij('gewas', 'Kavel bij Eenrum', 'Akker · 2,2 ha · bodem goed · 2,6 km', eur(3900), '201 dagen terug')}${koopRij('thuis', 'Woning bij Leegkerk', 'Woning · 89 m² · 0,5 km', eur(49950), 'je mist ' + eur(31500), false, true)}</div>`;
  const links = `<div class="bz3-kol" style="width:600px;gap:10px">${filters}${lijst}</div>`;
  const rechts = `<div class="bz3-detail" style="flex:1">${veldKaart({ w: 770, h: 200, sel: 'aanbod1', vlak: ['zuidhorn', 'klei', 'eenrum', 'pieter', 'wierde', 'zonnehoek', 'aanbod1', 'aanbod2'], eigen: { zuidhorn: 'eigen', klei: 'eigen', eenrum: 'eigen', pieter: 'eigen', wierde: 'eigen', zonnehoek: 'eigen', aanbod1: 'aanbod', aanbod2: 'aanbod' }, markers: [[354, 170, '1', true], [70, 170, '2', false], [420, 104, '3', false]] })}<div class="bz3-kaartlegenda"><span><i style="background:var(--ds-c-ink-papier)"></i>Van jou</span><span><i class="i-groeit"></i>Te koop</span></div>` +
    `<div class="bz3-rij bz3-rij--tussen"><div><h2 class="bz3-hero__titel" style="font-size:32px">Wei bij Dorkwerd</h2><span class="bz3-hulp">Weiland · 1,5 ha · bodem goed · 1,4 km van je af</span></div>${klein("Op de kaart")}</div>` +
    `<section class="bz3-hero"><div class="bz3-label">Wat kost het en wat levert het</div><div class="bz3-raster2">${bon([['Prijs', eur(2700)], ['Je geld nu', eur(18450)], ['Je geld erna', eur(15750)]])}${bon([['Verpacht levert', '+' + eur(17) + '/dag', 'plus'], ['Zelf bewerkt', '± ' + eur(31) + '/dag', 'plus'], ['Terugverdiend in', '± 159 dgn']])}</div><div class="bz3-actie">${knop('Kopen')}<span class="bz3-actie__sub">Je bevestigt het op de volgende stap.</span></div></section></div>`;
  return frame({ actief: 'tekoop', waarden: WAARDEN(), overlay, inhoud: `<div class="bz3-md" style="grid-template-columns:600px 1fr;gap:20px">${links}${rechts}</div>`, hint: [['↑+↓', 'kiezen'], ['←+→', 'filter'], ['Enter', 'bekijken'], ['Q+E', 'tabblad'], ['Esc', 'terug']] });
};

// 9. Te koop, de bevestiging
SCHERMEN.bevestig = () => {
  const ov =`<div class="bz3-scherm"><section class="ds-z-kaart bz3-kaart" style="width:620px;box-shadow:var(--ds-schaduw-hard);gap:14px"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('bon')}Aankoop bevestigen</h3></header><div><div class="bz3-hero__titel">Wei bij Dorkwerd</div><span class="bz3-hulp">Weiland · 1,5 ha · bodem goed</span></div>${bon([['Prijs', eur(2700)], ['Je geld nu', eur(18450)]], ['Je houdt over', eur(15750)])}${bon([['Je dagbedrag nu', '+' + eur(559)], ['Je dagbedrag erna', '+' + eur(576), 'plus']])}<span class="bz3-hulp">Het perceel is meteen van jou. Het wordt verpacht tot je het zelf in gebruik neemt.</span><div class="bz3-actie"><button type="button" class="ds-z-knop bz3-vasthoud" style="--vul:46%"><span>${I('geld')} Houd vast om te kopen</span></button>${knop('Terug', 'secundair')}</div></section></div>`;
  return SCHERMEN.tekoop(ov);
};

// 10. Snackwagen
SCHERMEN.snack = () => {
  const uren = [0, 0, 0, 0, 0, 3, 5, 7, 8, 9, 7, 5, 3].map((x, i) => x);
  const staven = (() => { const waarden = [14, 22, 18, 25, 31, 42, 38, 30, 16, 6]; const w = 560, h = 100, bw = 38; return `<svg viewBox="0 0 ${w} ${h + 24}" style="width:100%;height:auto" role="img" aria-label="Omzet per uur gisteren">${waarden.map((v, i) => `<rect x="${i * 56 + 8}" y="${h - v * 2}" width="${bw}" height="${v * 2}" fill="${i === 5 ? 'var(--ds-c-ink-geel)' : 'var(--ds-c-ink-bord)'}" stroke="var(--ds-c-ink-inkt)" stroke-width="2.5"/><text x="${i * 56 + 8 + bw / 2}" y="${h + 18}" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="15" fill="var(--ds-c-ink-inkt)">${11 + i}:00</text>`).join('')}<line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="var(--ds-c-ink-inkt)" stroke-width="3"/></svg>`; })();
  const dienst = `<div class="bz3-kol" style="gap:6px"><div style="position:relative;height:30px;border:var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt);border-radius:var(--ds-r);background-color:var(--ds-c-ink-papier);background-image:var(--ds-raster);background-size:6px 6px"><div style="position:absolute;left:${(11 / 24) * 100}%;width:${(10 / 24) * 100}%;top:0;bottom:0;background:var(--ds-c-ink-geel);border-left:var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt);border-right:var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt)"></div><div style="position:absolute;left:${(8.1 / 24) * 100}%;top:-4px;bottom:-4px;width:4px;background:var(--ds-c-ink-inkt)"></div></div><div class="bz3-rij bz3-rij--tussen bz3-hulp"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div><div class="bz3-filters">${stap('Open vanaf', '11:00')}${stap('Open', '10 uur')}${stap('Prijs', '100%')}</div></div>`;
  const menu = (naam, prijs, marge, aan, uit) => `<div class="ds-z-kaart bz3-kaart${uit ? ' ds-z-kaart--uit' : ''}" style="padding:8px 12px;gap:2px"><div class="bz3-rij bz3-rij--tussen"><b class="bz3-getal" style="font-size:20px">${naam}</b>${uit ? I('slot') : `<span class="bz3-vink${aan ? ' bz3-vink--aan' : ''}">${aan ? I('vinkje') : ''}</span>`}</div><span class="bz3-hulp">${uit ? uit : eur(prijs).replace('€', '€') + ' · marge ' + marge + '%'}</span></div>`;
  const links = `<div class="bz3-kol" style="flex:1;gap:12px"><section class="ds-z-kaart bz3-kaart"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('burger')}Gisteren</h3><span class="bz3-hulp" style="color:var(--ds-c-wit)">vandaag open om 11:00</span></header><div class="bz3-rij" style="gap:20px;align-items:flex-start"><div class="bz3-kol" style="gap:4px"><span class="bz3-getal" style="font-size:48px;line-height:1">${eur(186)}</span><span class="bz3-hulp">omzet · 41 klanten · 3 gemist</span><span class="bz3-getal bz3-plus" style="font-size:24px">+${eur(74)} winst</span></div><div style="flex:1">${staven}</div></div></section>` +
    `<section class="ds-z-kaart bz3-kaart"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('tijd')}Dienst</h3></header>${dienst}</section>` +
    `<section class="ds-z-kaart bz3-kaart"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('eten')}Menu</h3><span class="bz3-hulp" style="color:var(--ds-c-wit)">4 van 4 plekken</span></header><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${menu('Friet', 3.6, 61, true)}${menu('Frikandel', 2.8, 55, true)}${menu('Kroket', 2.9, 57, true)}${menu('Bamischijf', 3.1, 54, true)}${menu('Kaassoufflé', 3.2, 52, false)}${menu('Burger', 6.5, 48, false, 'Eerst koeling')}${menu('Milkshake', 4.2, 58, false, 'Eerst koeling')}${menu('Softy', 3.2, 62, false, 'Eerst koeling')}</div></section></div>`;
  const rechts = `<div class="bz3-kol" style="width:470px;gap:12px"><section class="ds-z-kaart bz3-kaart"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('plek')}Standplaats</h3></header><div class="bz3-rij" style="align-items:stretch">${veldKaart({ w: 170, h: 120, vlak: [], etiketten: false, markers: [[85, 60, '★', true]] })}<div class="bz3-kol" style="flex:1;justify-content:space-between"><b class="bz3-getal" style="font-size:24px">Stationsplein</b><span class="bz3-hulp">Veel voetgangers</span>${stand('vandaag', 'Nog 3 dagen', 'tijd')}</div></div><div class="bz3-actie">${knop('Verleng ' + eur(480))}<span class="bz3-actie__sub">je houdt ${eur(17970)}</span></div></section>` +
    `<section class="ds-z-kaart bz3-kaart"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('pakket')}Voorraad</h3></header><div class="ds-z-balk ds-z-balk--tijd" style="--ds-z-w:42%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">3 van 7 dagen</span></div>${klein('Vul aan ' + eur(40))}</section>` +
    `<section class="ds-z-kaart bz3-kaart"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('tune_snack')}Upgrades</h3></header>${[['Koeling', 6000, 'Opent burger, milkshake en softy'], ['Eigen sauzen', 8000, '+6 procentpunt marge'], ['Dubbele frituurpan', 4000, '+40% klanten per uur']].map(([t, p, e]) => `<div class="bz3-rij bz3-rij--tussen" style="gap:8px"><div class="bz3-kol" style="gap:0"><b class="bz3-getal" style="font-size:19px">${t}</b><span class="bz3-hulp">${e}</span></div>${klein(eur(p))}</div>`).join('')}</section></div>`;
  return frame({ actief: 'snack', waarden: WAARDEN(), titel: 'Land en bedrijf', inhoud: `<div class="bz3-md" style="grid-template-columns:1fr 470px;gap:16px;align-content:start"><div style="grid-column:1">${links}</div><div style="grid-column:2">${rechts}</div></div>`, hint: [['↑+↓', 'kiezen'], ['←+→', 'waarde'], ['Enter', 'aan of uit'], ['Q+E', 'tabblad'], ['Esc', 'terug']] });
};

// 11. Club: verwijzing naar het clubontwerp
SCHERMEN.club = () => {
  // De inhoud van dit tabblad is het ontwerp van de club-agent (docs/ontwerp/CLUB-UI-24-11.md, onderdeel f); hier staat het in het kader van Land en bedrijf, met dezelfde segmenten, tussenkoppen en een gele knop die ontbreekt.
  const tenue = `<section class="ds-z-kaart bz3-kaart" style="width:560px"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('kleding')}Tenue</h3></header><div class="bz3-rij" style="align-items:stretch;gap:16px"><div class="bz3-skel" style="width:190px;height:190px;display:grid;place-items:center">${I('kleding', 'bz3-ic--xl')}</div><div class="bz3-kol" style="flex:1;gap:10px"><div class="bz3-label">Wat je draagt</div>${seg([['thuis', 'Thuis'], ['uit', 'Uit'], ['derde', 'Derde', '', true]], 'thuis', 'bz3-seg--blok bz3-seg--klein', 'Tenue')}<div class="bz3-label">Rugnummer</div>${stap('Nummer', '10')}<span class="bz3-hulp">Je draagt het bij wedstrijd, training en penalty’s. Derde tenue vanaf Prof.</span></div></div></section>`;
  const aandeel = `<section class="ds-z-kaart bz3-kaart"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('prestaties')}Aandeel en dividend</h3></header>${feiten([['Jouw aandeel', '5% van SC Ommelanden'], ['Dividend per ronde', eur(40), 'plus'], ['Waarde', eur(6000)]])}<div class="bz3-label">Meer kopen</div>${seg([['10', '10%', eur(4200)], ['25', '25%', eur(9800)], ['51', '51%', eur(21000), true], ['100', '100%', eur(46000), true]], null, 'bz3-seg--blok', 'Aandeel kopen')}<span class="bz3-hulp">Grijs betekent: je mist nog geld. Verkopen levert 75% van wat je betaalde.</span></section>`;
  const sponsors = `<section class="ds-z-kaart bz3-kaart"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('handdruk')}Sponsors</h3></header><div class="bz3-lijst" style="border-width:var(--ds-lijn-dik)"><div class="ds-z-rij" style="grid-template-columns:auto minmax(0,1fr) auto"><span class="bz3-ikoon">${I('vinkje')}</span><span><span class="ds-z-rij__naam">Bakkerij Zuidhorn</span><span class="ds-z-rij__sub">Op het shirt · ${eur(120)} per doelpunt</span></span><span class="bz3-stand bz3-stand--rijp">Aangenomen</span></div><div class="ds-z-rij" style="grid-template-columns:auto minmax(0,1fr) auto"><span class="bz3-ikoon">${I('handdruk')}</span><span><span class="ds-z-rij__naam">Loonbedrijf De Wierde</span><span class="ds-z-rij__sub">Op de borst · ${eur(90)} per doelpunt</span></span>${klein('Neem aan')}</div></div></section>`;
  const inhoud = `<div class="bz3-md" style="grid-template-columns:560px 1fr;gap:20px;align-content:start;padding-top:6px"><div class="bz3-kol" style="gap:14px">${tenue}</div><div class="bz3-kol" style="gap:14px">${aandeel}${sponsors}</div></div>`;
  return frame({ actief: 'club', waarden: WAARDEN(), inhoud, hint: [['↑+↓', 'kiezen'], ['1+2+3', 'tenue'], ['Q+E', 'tabblad'], ['Esc', 'terug']] });
};

// 12. Garage en Spullen: dezelfde kop en kaarten
SCHERMEN.garage = () => {
  const auto = (naam, sub, sel, uit) => `<article class="ds-z-kaart bz3-kaart bz3-kaart--klik${sel ? ' ds-z-kaart--selectie' : ''}${uit ? ' ds-z-kaart--uit' : ''}" style="padding:10px"><div class="ds-z-leeg__beeld" style="min-height:96px;display:grid;place-items:center;border:2px dashed var(--ds-c-ink-inkt);background-image:var(--ds-raster);background-size:6px 6px">${I(uit ? 'vraag' : 'auto', 'bz3-ic--xl')}</div><b class="bz3-getal" style="font-size:21px">${naam}</b>${uit ? '<span class="bz3-hulp">Nog niet ontdekt</span>' : stand(sel ? 'rijp' : 'later', sub, sel ? 'vinkje' : 'plek')}</article>`;
  const raster = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-content:start;width:700px">${auto('Escapade', 'Thuis', true)}${auto('Fjord', 'Op de kaart')}${auto('Wiebelwerk-bus', 'Thuis')}${auto('', '', false, true)}${auto('', '', false, true)}${auto('', '', false, true)}</div>`;
  const rechts = `<div class="bz3-detail" style="flex:1"><div class="ds-z-leeg__beeld" style="height:260px;display:grid;place-items:center;border:2px dashed var(--ds-c-ink-inkt);background-image:var(--ds-raster);background-size:6px 6px;border-radius:var(--ds-r)"><span class="bz3-hulp" style="background:var(--ds-c-ink-papier);padding:2px 10px">3D-voorbeeld (sleep om te draaien)</span></div><div class="bz3-rij bz3-rij--tussen"><div><h2 class="bz3-hero__titel" style="font-size:34px">Escapade</h2><span class="bz3-hulp">Oud en rood. Koppig, net als Tammo.</span></div>${stand('rijp', 'Geen schade', 'vinkje')}</div><section class="bz3-hero"><div class="bz3-actie">${knop('Naar de kaart')}${klein('Tunen', 'secundair')}</div></section><section class="bz3-blok"><div class="bz3-label"><span>Cijfers</span></div><div class="bz3-balkrij"><span>Topsnelheid</span><div class="ds-z-balk"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul" style="--ds-z-w:72%"></span></span></div><b class="bz3-getal">180 km/u</b></div><div class="bz3-balkrij"><span>Trekkracht</span><div class="ds-z-balk" style="--ds-z-w:90%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span></div><b class="bz3-getal">9 van 10</b></div></section></div>`;
  const tabs = [['auto', 'Auto’s', 3, false], ['boot', 'Boten', 0, false], ['vlieg', 'Vliegtuigen', 0, false]];
  const w = plaat('auto', '3 van 56', 'ontdekt') + plaat('geld', eur(26400), 'waarde');
  return frame({ actief: 'auto', titel: 'Garage', eb: 'Bezit', waarden: w, tabs, geenNu: true, rail: 'Garage', inhoud: `<div class="bz3-md" style="grid-template-columns:700px 1fr;gap:22px;padding-top:6px">${raster}${rechts}</div>`, hint: [['↑+↓+←+→', 'kiezen'], ['Enter', 'doen'], ['Q+E', 'tabblad'], ['Esc', 'terug']] });
};
SCHERMEN.spullen = () => {
  const ding = (naam, sub, sel) => `<article class="ds-z-kaart bz3-kaart bz3-kaart--klik${sel ? ' ds-z-kaart--selectie' : ''}" style="padding:10px"><div class="ds-z-leeg__beeld" style="min-height:84px;display:grid;place-items:center;border:2px dashed var(--ds-c-ink-inkt);background-image:var(--ds-raster);background-size:6px 6px">${I('kleding', 'bz3-ic--xl')}</div><b class="bz3-getal" style="font-size:19px">${naam}</b><span class="bz3-hulp">${sub}</span></article>`;
  const raster = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;align-content:start;width:720px">${ding('Stadjerspet (roest)', 'Hoofd', true)}${ding('Stoppelbaardje', 'Gezicht')}${ding('Jack (blauw)', 'Jas')}${ding('Spijkerbroek', 'Broek')}${ding('Gympen (ecru)', 'Schoenen')}${ding('Set: Stadjer classic', '4 stukken')}${ding('Spaarkaart Krant', '0 van 10')}${ding('Eierballen', '0 van 30')}</div>`;
  const rechts = `<div class="bz3-detail" style="flex:1"><div class="ds-z-leeg__beeld" style="height:220px;display:grid;place-items:center;border:2px dashed var(--ds-c-ink-inkt);background-image:var(--ds-raster);background-size:6px 6px;border-radius:var(--ds-r)"><span class="bz3-hulp" style="background:var(--ds-c-ink-papier);padding:2px 10px">3D-voorbeeld</span></div><div><div class="bz3-label">Kleding</div><h2 class="bz3-hero__titel" style="font-size:34px">Stadjerspet (roest)</h2></div><p>De pet met het gele plaatje van de Stadjer. Zit altijd een tikje scheef.</p><section class="bz3-hero"><div class="bz3-actie">${knop('Uitdoen')}${klein('Terugzetten', 'ghost')}</div></section>${bon([['Herkomst', 'Kledingwinkel, ' + eur(18)], ['Effect', 'Uitdoen kan hier']])}</div>`;
  const filters = `<div class="bz3-filters">${stap('Soort', 'alles')}${stap('Sorteren', 'standaard')}<span class="bz3-stap" style="min-width:260px"><span>${I('zoek')} Zoek in je spullen</span></span></div>`;
  return frame({ actief: 'x', titel: 'Spullen', eb: 'Bezit', waarden: plaat('tas', '6', 'dingen') + plaat('geld', eur(18000), 'contant'), tabs: null, geenNu: true, rail: 'Spullen', inhoud: `<div class="bz3-kol" style="flex:1;gap:12px;padding-top:6px">${filters}<div class="bz3-md" style="grid-template-columns:720px 1fr;gap:22px">${raster}${rechts}</div></div>`, hint: [['↑+↓+←+→', 'kiezen'], ['Enter', 'doen'], ['Esc', 'terug']] });
};

// 13. Toestanden: laden, fout, dicht, geen bedrijf, gast
SCHERMEN.toestanden = () => {
  const paneel = (titel, inh) => `<section class="bz3-kol" style="gap:8px"><div class="bz3-label">${titel}</div>${inh}</section>`;
  const laden = `<div class="bz3-lijst ds-scroll" data-onder="1" style="padding:12px;gap:10px;min-height:250px"><div class="bz3-label">Percelen laden</div><span class="bz3-hulp">Even wachten: de lijst met percelen wordt opgehaald.</span>${[0, 1, 2].map(() => '<div class="bz3-skel" style="height:52px"></div>').join('')}</div>`;
  const fout = `<section class="ds-z-kaart ds-z-kaart--probleem bz3-kaart" style="min-height:250px"><header class="ds-z-kaart__kop" style="background:var(--ds-c-rood)"><h3 class="ds-z-kaart__titel">${I('waarschuwing')}De lijst komt niet binnen</h3></header><p style="font-size:19px">Je land en je geld zijn veilig. Alleen het aanbod kon niet worden opgehaald.</p><div class="bz3-actie" style="margin-top:auto">${knop('Opnieuw proberen')}${klein('Terug', 'ghost')}</div></section>`;
  const dicht = `<section class="ds-z-kaart ds-z-kaart--uit bz3-kaart" style="min-height:250px"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('slot')}Bedrijven zijn nog dicht</h3></header><p style="font-size:19px">Tessa is boerendochter. Na Oma Trijntjes recept staat haar land voor je open.</p><div class="bz3-kol" style="margin-top:auto"><div class="ds-z-balk"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul" style="--ds-z-w:35%"></span></span><span class="ds-z-balk__label">Verhaal: 2 van 5 hoofdstukken</span></div>${klein('Naar het verhaal')}</div></section>`;
  const nietsT = `<div class="ds-z-leeg ds-zeef" style="min-height:250px"><span class="ds-z-leeg__beeld" style="min-height:64px;display:grid;place-items:center">${I('bord', 'bz3-ic--xl')}</span><h3 class="ds-z-leeg__kop">Niets te koop in de buurt</h3><p class="ds-z-leeg__tekst" style="font-size:18px">Op de kaart zie je alle percelen die te koop zijn, ook verder weg.</p>${knop('Toon op de kaart')}</div>`;
  const gast = `<section class="ds-z-kaart bz3-kaart" style="min-height:250px"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('spelers')}Je speelt mee</h3></header><p style="font-size:18px">Dit bezit is van jou, niet van de wereld van Anke. Je beheert het zelf; anderen zien alleen wat jij deelt.</p>${feiten([['Je land', '6 velden'], ['De wereld van', 'Anke'], ['Je voortgang', 'blijft bij jou']])}<span class="bz3-hulp" style="margin-top:auto">Een medespeler die wegvalt, raakt zijn bezit niet kwijt.</span></section>`;
  const rustig = `<div class="bz3-kol ds-rustig" style="gap:8px"><div class="bz3-kaart ds-z-kaart" style="min-height:250px"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${I('boerderij')}Boerderij en land</h3></header><div class="bz3-rij" style="flex-wrap:wrap;gap:6px">${stand('rijp', '1 oogstklaar', 'veld_rijp')}${stand('probleem', 'Zieke kudde', 'waarschuwing')}${stand('braak', '1 braak', 'veld_braak')}</div><h3 class="bz3-hero__titel" style="text-shadow:var(--ds-misdruk)">Titel met misdruk</h3><div class="bz3-skel" style="height:56px"></div><span class="bz3-hulp">Rustig drukwerk: zelfde vorm en woorden. Raster en misdruk vallen weg, een stippelrand en een woord blijven.</span></div></div>`;
  const inhoud = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding-top:8px;align-content:start">${paneel('Laden', laden)}${paneel('Fout', fout)}${paneel('Dicht (het verhaal opent het nog niet)', dicht)}${paneel('Leeg: Te koop', nietsT)}${paneel('Samen spelen: gast', gast)}${paneel('Rustig drukwerk', rustig)}</div>`;
  return frame({ actief: 'tekoop', waarden: WAARDEN(), inhoud, geenNu: true, hint: [['Enter', 'doen'], ['Esc', 'terug']] });
};

// 14. Bediening: de focusvolgorde
SCHERMEN.bediening = () => {
  const badge = (n, x, y) => `<span style="position:absolute;left:${x}px;top:${y}px;z-index:9;width:34px;height:34px;display:grid;place-items:center;background:var(--ds-c-ink-inkt);border:3px solid var(--ds-c-ink-papier);border-radius:var(--ds-r);font-family:var(--ds-font-zeef-kop);font-weight:800;font-size:22px;color:var(--ds-c-ink-papier)">${n}</span>`;
  const bs = badge(1, 1500, 168) + badge(2, 470, 210) + badge(3, 872, 280) + badge(4, 396, 590) + badge(5, 970, 520) + badge(6, 1250, 626);
  const leg = `<div style="position:absolute;left:384px;top:960px;width:1444px;display:flex;gap:30px;color:var(--ds-c-wit);font-size:var(--ds-t-hulp)"><span><b>1</b> tabblad (Q en E)</span><span><b>2</b> Nu te doen (omhoog vanuit de inhoud)</span><span><b>3</b> onderdeel van de boerderij (links en rechts)</span><span><b>4</b> veld kiezen (op en neer, spatie vinkt aan)</span><span><b>5</b> de hoofdactie van het detail</span><span><b>6</b> keuzes in het detail (links en rechts)</span></div>`;
  return SCHERMEN.velden(bs + leg);
};

// ---------------------------------------------------------------- schrijven
const PAGINA = (naam, body, titel) => `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${esc(titel || naam)} – Land en bedrijf, ontwerp 24-11</title><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${GAME}/fonts/fonts.css"><link rel="stylesheet" href="${GAME}/js/ds-tokens.css"><link rel="stylesheet" href="${GAME}/js/ds-components.css"><link rel="stylesheet" href="${GAME}/js/ds-scroll.css"><link rel="stylesheet" href="../mock.css"></head><body>${body}
<script>
function fit(){var s=Math.min(innerWidth/1920,innerHeight/1080);var H=innerHeight/s;var W=innerWidth/s;var st=document.querySelector('.stage');if(H>1080){st.style.height=H+'px';}
st.style.transform='scale('+s+')';st.style.left=Math.max(0,(innerWidth-1920*s)/2)+'px';st.style.top='0px';st.style.setProperty('--mz',s);st.style.setProperty('--menu-min','calc(13px / '+s+')');
var ex=Math.max(0,H-1080);document.querySelectorAll('.pane,.rail').forEach(function(e){e.style.height=(806+ex)+'px'});var hn=document.querySelector('.hints');if(hn){hn.style.top=(902+ex)+'px'}}
fit();addEventListener('resize',fit);
</script></body></html>`;

// de menutekst wordt in het spel met --mz verkleind; --menu-min (13px / --mz) is de vloer op het scherm (menu.css). Hier hetzelfde: elke maat onder 20 px krijgt die vloer.
const src = fs.readFileSync(path.join(HERE, 'mock.src.css'), 'utf8');
fs.writeFileSync(path.join(WERK, 'mock.css'), src.replace(/font-size: (\d+)px/g, (m, n) => (Number(n) < 20 ? `font-size: max(${n}px, var(--menu-min))` : m)));

for (const [naam, f] of Object.entries(SCHERMEN)) {
  fs.writeFileSync(path.join(OUT, naam + '.html'), PAGINA(naam, f()));
}
console.log('gebouwd:', Object.keys(SCHERMEN).join(', '));
