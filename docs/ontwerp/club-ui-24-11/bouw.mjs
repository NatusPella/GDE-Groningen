// Maakt de statische mockups van het club-ontwerp (24-11, fase 1): node docs/ontwerp/club-ui-24-11/bouw.mjs
// Elke pagina laadt de echte DS3-CSS (game/js/ds-*.css) plus ontwerp.css (de nieuwe componenten). Alle namen en cijfers zijn verzonnen voorbeeldgegevens.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));

// ---------- gegevens ----------
const C = {
  dork: { id: 'dork', naam: 'Onderling Gezellig Dorkwerd', kort: 'Dorkwerd', shirt: '#b03030', accent: '#f4f1e8', patroon: 'helften' },
  roode: { id: 'roode', naam: 'Nooit Verlegen Oude Roodehaan', kort: 'Roodehaan', shirt: '#2a3f8f', accent: '#f4f1e8', patroon: 'brede-streep' },
  sauw: { id: 'sauw', naam: 'Samen Sterk Sauwerd', kort: 'Sauwerd', shirt: '#2f9e5b', accent: '#f4f1e8', patroon: 'effen' },
  vier: { id: 'vier', naam: 'Vlug en Vrolijk Vierhuizen', kort: 'Vierhuizen', shirt: '#e8c93a', accent: '#2a3a5a', patroon: 'smalle-streep' },
  hark: { id: 'hark', naam: 'Hard Gras Harkstede', kort: 'Harkstede', shirt: '#8a4ab5', accent: '#e8c93a', patroon: 'helften' },
  zuid: { id: 'zuid', naam: 'Eendracht Zuidwolde', kort: 'Zuidwolde', shirt: '#e0742a', accent: '#2a2f36', patroon: 'brede-streep' },
  ruis: { id: 'ruis', naam: 'Rust Roest Ruischerbrug', kort: 'Ruischerbrug', shirt: '#d8d8d0', accent: '#b03030', patroon: 'smalle-streep' },
  noord: { id: 'noord', naam: 'Nooit Gedacht Noordlaren', kort: 'Noordlaren', shirt: '#2a2f36', accent: '#e8e0c0', patroon: 'effen' },
};
// G W GL V doelpunten voor/tegen, vorm (oud naar nieuw)
const STAND = [
  [C.dork, 3, 2, 1, 0, 6, 2, 'WGW'], [C.sauw, 3, 2, 0, 1, 5, 3, 'WVW'], [C.vier, 3, 1, 2, 0, 4, 3, 'GWG'], [C.roode, 3, 1, 1, 1, 3, 3, 'VWG'],
  [C.hark, 3, 1, 1, 1, 4, 5, 'GVW'], [C.zuid, 3, 1, 0, 2, 3, 5, 'VWV'], [C.ruis, 3, 0, 2, 1, 2, 4, 'GVG'], [C.noord, 3, 0, 1, 2, 1, 3, 'VGV'],
];
const pts = (r) => r[2] * 3 + r[3];
const ds = (r) => r[5] - r[6];
const tekenDs = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
// nr, naam, pos, rating, trend, blessure
const SP = [
  [1, 'Eelco Kluunzak', 'K', 42, 'gelijk', null], [2, 'Ids Kleijans', 'V', 41, 'op', null], [3, 'Tjitse Brugwachter', 'V', 41, 'gelijk', null], [4, 'Daan Waddenzicht', 'V', 40, 'neer', 'Enkel, nog 2 dagen'],
  [5, 'Wessel Slootmans', 'V', 39, 'gelijk', null], [6, 'Tammo', 'M', 38, 'op', null], [7, 'Okke Kruidenier', 'M', 43, 'op', null], [8, 'Zwier Rietkraag', 'M', 42, 'gelijk', null],
  [9, 'Douwe Zoutwerf', 'M', 41, 'neer', null], [10, 'Tessa', 'A', 36, 'op', null], [11, 'Gerrit Mosselbank', 'A', 40, 'gelijk', null],
  [12, 'Bouwe Kaaldijk', 'K', 39, 'gelijk', null], [13, 'Lieuwe Vlasakker', 'V', 40, 'gelijk', null], [14, 'Marrit Heidebloem', 'V', 38, 'op', null], [15, 'Gerben Wierdeman', 'M', 41, 'gelijk', null],
  [16, 'Jelmer Slootkant', 'M', 37, 'neer', 'Kuit, nog 4 dagen'], [17, 'Hanneke Zandwal', 'A', 39, 'op', null], [18, 'Eelke Klaverdijk', 'A', 37, 'gelijk', null],
];
const POSNAAM = { K: 'Keeper', V: 'Verdediger', M: 'Middenvelder', A: 'Aanvaller' };
const achter = (n) => n.split(' ').slice(1).join(' ') || n;
const FORM = {
  '4-4-2': [[0, 0.04, 'K'], [-0.65, 0.2, 'V'], [-0.22, 0.2, 'V'], [0.22, 0.2, 'V'], [0.65, 0.2, 'V'], [-0.65, 0.45, 'M'], [-0.22, 0.45, 'M'], [0.22, 0.45, 'M'], [0.65, 0.45, 'M'], [-0.2, 0.7, 'A'], [0.2, 0.7, 'A']],
  '4-3-3': [[0, 0.04, 'K'], [-0.65, 0.2, 'V'], [-0.22, 0.2, 'V'], [0.22, 0.2, 'V'], [0.65, 0.2, 'V'], [-0.4, 0.46, 'M'], [0, 0.46, 'M'], [0.4, 0.46, 'M'], [-0.55, 0.72, 'A'], [0, 0.72, 'A'], [0.55, 0.72, 'A']],
  '3-5-2': [[0, 0.04, 'K'], [-0.45, 0.2, 'V'], [0, 0.2, 'V'], [0.45, 0.2, 'V'], [-0.8, 0.46, 'M'], [-0.4, 0.46, 'M'], [0, 0.46, 'M'], [0.4, 0.46, 'M'], [0.8, 0.46, 'M'], [-0.2, 0.7, 'A'], [0.2, 0.7, 'A']],
};
// basiself op volgorde van de vorming 4-4-2: sp-index per plek
const BASIS442 = [0, 1, 2, 3, 4, 7, 6, 5, 8, 10, 9]; // K, V x4, M x4 (links naar rechts), A x2; Tessa (index 9) op rechtsvoor

// ---------- helpers ----------
let uid = 0;
const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const eur = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
export function wapen(c, maat = 'm') {
  const id = `w${++uid}`;
  const pat = { effen: '', 'brede-streep': `<rect x="36" y="0" width="28" height="120" fill="${c.accent}"/>`, helften: `<rect x="50" y="0" width="50" height="120" fill="${c.accent}"/>`, 'smalle-streep': `<rect x="22" y="0" width="10" height="120" fill="${c.accent}"/><rect x="45" y="0" width="10" height="120" fill="${c.accent}"/><rect x="68" y="0" width="10" height="120" fill="${c.accent}"/>` }[c.patroon] || '';
  return `<span class="vb-wapen vb-wapen--${maat}" role="img" aria-label="Wapen van ${e(c.naam)}"><svg viewBox="0 0 100 115"><defs><clipPath id="${id}"><path d="M8 6H92V58C92 88 70 104 50 112C30 104 8 88 8 58Z"/></clipPath></defs><g clip-path="url(#${id})"><rect width="100" height="120" fill="${c.shirt}"/>${pat}</g><path d="M8 6H92V58C92 88 70 104 50 112C30 104 8 88 8 58Z" fill="none" stroke="#1d1b17" stroke-width="6" stroke-linejoin="round"/><circle cx="50" cy="40" r="12" fill="#f3ead3" stroke="#1d1b17" stroke-width="5"/></svg></span>`;
}
const k = (t, extra = '') => `<kbd class="ds-z-toets"${extra}>${t}</kbd>`;
const pips = (s, n = 5, l = false) => { const a = [...s].map((x) => `<i class="${x.toLowerCase()}" title="${{ W: 'winst', G: 'gelijk', V: 'verlies' }[x]}">${x}</i>`); while (a.length < n) a.push('<i class="n" title="nog niet gespeeld">–</i>'); return `<span class="vb-vorm${l ? ' vb-vorm--l' : ''}" role="img" aria-label="Vorm: ${[...s].map((x) => ({ W: 'winst', G: 'gelijk', V: 'verlies' }[x])).join(', ') || 'nog niet gespeeld'}">${a.join('')}</span>`; };
const pos = (p) => `<span class="vb-pos vb-pos--${p.toLowerCase()}" title="${POSNAAM[p]}">${p}</span>`;
const trend = (t) => ({ op: '<span class="vb-trend vb-trend--op" title="Vorm stijgend">↑ <span>stijgend</span></span>', gelijk: '<span class="vb-trend vb-trend--gelijk" title="Vorm stabiel">→ <span>stabiel</span></span>', neer: '<span class="vb-trend vb-trend--neer" title="Vorm dalend">↓ <span>dalend</span></span>' }[t]);
const trendKort = (t) => ({ op: '<span class="vb-trend vb-trend--op" title="Vorm stijgend" aria-label="stijgend">↑</span>', gelijk: '<span class="vb-trend vb-trend--gelijk" title="Vorm stabiel" aria-label="stabiel">→</span>', neer: '<span class="vb-trend vb-trend--neer" title="Vorm dalend" aria-label="dalend">↓</span>' }[t]);
const balk = (w, label, extra = '') => `<span class="ds-z-balk ds-z-balk--rij" style="--ds-z-w:${w}%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">${label}</span></span>${extra}`;
const iGeld = '<svg class="vb-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M12 7v10M9 9.5c0-1.3 1.3-2 3-2s3 .7 3 2-1.3 1.8-3 2.2-3 .9-3 2.3 1.3 2 3 2 3-.7 3-2" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
const iSlot = '<svg class="vb-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>';
const tabs = [['overzicht', 'Overzicht'], ['selectie', 'Selectie'], ['tactiek', 'Tactiek'], ['stand', 'Stand'], ['kalender', 'Kalender'], ['training', 'Training'], ['club', 'Club']];
const tabsHtml = (actief, punt = '') => `<nav class="vb-tabs ds-m-tabs" role="tablist" aria-label="Voetbal">${k('Q')}${tabs.map(([id, n]) => `<button type="button" class="vb-tab" role="tab" aria-selected="${id === actief}">${n}${punt === id ? '<i class="vb-tab__punt" aria-label="nieuw"></i>' : ''}</button>`).join('')}${k('E')}<span class="vb-tabs__rest"></span></nav>`;
const kop = (compact, sub = true) => `<header class="vb-kop${compact ? ' vb-kop--compact' : ''}">${wapen(C.dork, compact ? 'm' : 'l')}<div><h1 class="vb-kop__naam">${C.dork.naam}</h1><p class="vb-kop__sub"><b>Talentenklasse</b><span>plek 1 van 8</span><span>·</span><span>ronde 4 van 7</span></p></div><div class="vb-stats"><div class="vb-st"><span class="vb-st__l">Plek</span><span class="vb-st__w">1<small>van 8</small></span></div><div class="vb-st"><span class="vb-st__l">Vorm</span><span class="vb-st__w">${pips('WGW', 5)}</span></div><div class="vb-st"><span class="vb-st__l">Geld</span><span class="vb-st__w">${iGeld}${eur(1240)}</span></div></div></header>`;
const hintGroepen = (g) => `<div class="vb-hint">${g.map(([naam, items]) => `<span class="vb-hint__groep">${items.map(([t, w]) => `${k(t)}<span>${w}</span>`).join('')}</span>`).join('')}</div>`;
const HINT_STD = hintGroepen([['', [['↑↓', 'kiezen'], ['↵', 'doen']]], ['', [['Q E', 'tab']]], ['', [['Esc', 'terug']]]]);
const RAIL = `<aside class="rail" aria-label="Menu"><span class="doorgaan">▷ Doorgaan</span><b>Spel</b><span>Spel</span><b>Doen</b><span>Verhaal</span><span>Activiteiten</span><span class="aan">Loopbanen</span><span>Kaart</span><b>Bezit</b><span>Spullen</span><span>Garage</span><span>Land en bedrijf</span><b>Voortgang</b><span>Veroverd</span><span>Prestaties</span></aside>`;

function pagina(titel, body, { w = 1920, h = 1080 } = {}) {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${e(titel)}</title><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="../../../game/fonts/fonts.css"><link rel="stylesheet" href="../../../game/js/ds-tokens.css"><link rel="stylesheet" href="../../../game/js/ds-components.css"><link rel="stylesheet" href="../../../game/js/ds-keycap.css"><link rel="stylesheet" href="../../../game/js/ds-micro.css"><link rel="stylesheet" href="ontwerp.css">
<script>const f=()=>document.documentElement.style.setProperty('--mz',Math.min(innerHeight/1080,innerWidth/1920).toFixed(4));f();addEventListener('resize',f)</script></head><body class="ds-zeef">${body}</body></html>`;
}
const stage = (inner) => `<div class="stage"><div class="stage__achter"></div>${inner}</div>`;
const paneel = (kopHtml, body, { vast = false, voet = '', hint = HINT_STD } = {}) => stage(`${RAIL}<main class="paneel"><div class="paneel__kop">${kopHtml}</div><div class="paneel__body${vast ? ' paneel__body--vast' : ''}">${body}</div>${voet}</main><div class="hint">${hint}</div>`);
const eyebrow = '<p class="vb-tussenkop" style="margin:0 0 var(--ds-s-2)">Loopbanen · Voetbal</p>';

// ---------- a. Clubhuis ----------
function stand3() {
  const rows = [0, 1, 2, 3].map((i) => { const r = STAND[i]; const jij = r[0] === C.dork; return `<tr class="${jij ? 'jij' : ''}"><td class="nr">${i + 1}</td><td class="naam"><span>${wapen(r[0], 'xs')}${e(r[0].kort)}${jij ? '<b class="vb-jij">JIJ</b>' : i === 3 ? '<b class="vb-jij">TEGEN</b>' : ''}</span></td><td>${r[1]}</td><td class="pt">${pts(r)}</td></tr>`; }).join('');
  return `<div class="vb-tabel-vak"><table class="vb-tabel vb-mini"><thead><tr><th>#</th><th class="l">Club</th><th>Gesp.</th><th>Ptn</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function hero({ gast = false } = {}) {
  const links = gast
    ? `<div class="vb-keuze vb-keuze--groot"><button class="ds-z-knop" type="button">Meedoen ${k('J')}</button><ul class="vb-uitleg"><li><b>Femke</b> speelt nu de wedstrijd; jij speelt mee als Tessa in haar team.</li><li>Jij krijgt geld en ervaring. Geen competitiepunten.</li></ul></div>`
    : `<div class="vb-keuze vb-keuze--groot"><button class="ds-z-knop" type="button">Speel de wedstrijd ${k('↵')}</button><ul class="vb-uitleg"><li><b>Je speelt zelf mee.</b> Wat je doet telt als training van vandaag.</li><li><b>Winst levert €55,</b> verlies €25.</li></ul></div>`;
  const rechts = gast
    ? `<div class="vb-keuze"><button class="ds-z-knop ds-z-knop--secundair" type="button" aria-disabled="true" title="Femke speelt nu">Laat uitrekenen</button><ul class="vb-uitleg"><li class="kost">Kan nu niet: Femke speelt nu de wedstrijd.</li></ul><button class="ds-z-knop ds-z-knop--ghost" type="button">Nee, dank ${k('N')}</button></div>`
    : `<div class="vb-keuze"><button class="ds-z-knop ds-z-knop--secundair" type="button">Laat uitrekenen</button><ul class="vb-uitleg"><li>De club speelt zonder jou.</li><li class="kost">Levert €25 vaste vergoeding, geen winstbonus.</li></ul><span><button class="vb-link" type="button">Eerst trainen</button></span></div>`;
  return `<article class="ds-z-kaart ds-z-kaart--recht vb-hero"><div class="ds-z-kaart__kop"><h2 class="ds-z-kaart__titel">${gast ? 'Wedstrijd van Femke' : 'Volgende wedstrijd'}</h2><span>Competitie · ronde 4 van 7</span></div>
<div class="vb-hero__teams"><div class="vb-team">${wapen(C.roode, 'xl')}<div><h3 class="vb-team__naam">${C.roode.kort}</h3><p class="vb-team__vol">${C.roode.naam}</p><p class="vb-team__sub"><span class="vb-thuisuit">Thuis</span><span>plek 4</span>${pips('VWG')}</p></div></div>
<div class="vb-hero__mid"><span class="vb-tegen">Tegen</span><b>Zaterdag 15 augustus</b><small>15:00 · Sportpark Oude Roodehaan</small></div>
<div class="vb-team vb-team--uit">${wapen(C.dork, 'xl')}<div><h3 class="vb-team__naam">${C.dork.kort}</h3><p class="vb-team__vol">${C.dork.naam}</p><p class="vb-team__sub"><span class="vb-thuisuit">Uit</span><span>plek 1</span>${pips('WGW')}</p></div></div></div>
<div class="vb-vergelijk"><span><b>43</b> sterkte</span><span class="vb-vergelijk__l">Bijna gelijk · korte reis</span><span style="text-align:right"><b>41</b> sterkte</span></div>
<div class="vb-hero__keuze">${links}${rechts}</div></article>`;
}
function paginaA(gast) {
  const body = `${eyebrow}${kop(false)}${tabsHtml('overzicht', 'club')}`;
  const main = `<div class="vb-raster"><div class="vb-kolom">${gast ? `<div class="vb-notitie"><b>Femke</b> heeft een wedstrijd gestart. Doe je mee?</div>` : ''}${hero({ gast })}<div class="vb-notitie"><b>Tessa:</b> Train op pass: dat is waar je baat bij hebt. <button class="vb-link" type="button">Training</button></div></div>
<div class="vb-kolom"><section><h3 class="vb-tussenkop">Stand<button class="vb-link" type="button">Alles</button></h3>${stand3()}</section>
<section><h3 class="vb-tussenkop">Jouw speler</h3><div class="vb-speler-kop"><span class="vb-nr">10</span><div><h3>Tessa</h3><p>${pos('A')}<span>Aanvaller</span><span class="vb-fit">Fit</span></p></div><div class="vb-rating"><b>36</b><small>rating</small></div></div>
<div class="vb-veldrij"><span class="vb-veldrij__l">Energie</span>${balk(100, '100%')}</div><div class="vb-veldrij"><span class="vb-veldrij__l">Vorm</span><span class="vb-feit">${trend('gelijk')}</span></div>
<p class="vb-tip" style="margin-top:var(--ds-s-2)">2 sponsors wachten op antwoord. <button class="vb-link" type="button">Naar Club</button></p></section></div></div>`;
  return pagina(gast ? 'Clubhuis, gast' : 'Clubhuis', paneel(body, main));
}

// ---------- b. componenten ----------
function paginaB() {
  const seg = (items, i, extra = '') => `<div class="vb-seg ${extra}" role="radiogroup">${items.map((t, j) => `<button type="button" role="radio" aria-checked="${j === i}">${t}</button>`).join('')}</div>`;
  const body = `<div style="padding:var(--ds-s-6);--mz:1;--menu-min:13px;background:var(--ds-zeef-bg);width:100%;box-sizing:border-box;min-height:100%;overflow:auto"><h1 class="vb-kop__naam" style="margin-bottom:var(--ds-s-2)">Club-UI: componenten en vier soorten dingen</h1><p class="vb-uitlegzin" style="margin-bottom:var(--ds-s-5);max-width:110ch">Regel: een speler ziet aan het uiterlijk wat hij kan doen. Status is platte tekst (geen rand, geen schaduw). Navigatie is een onderstreping. Een keuze is een segment met een vinkje. Een actie heeft een harde schaduw; alleen de belangrijkste is geel.</p>
<div class="vb-sheet">
<section><h4>1. Status (niet klikbaar)</h4><div class="vb-rijen"><span class="vb-feit"><small>Plek</small><b>1</b> van 8</span><span class="vb-feit"><small>Geld</small><b>€1.240</b></span><span class="vb-feit">${trend('gelijk')}</span></div><div class="vb-rijen">${pips('WGWVG')} ${pips('WG')} ${pips('')}</div><div class="vb-rijen">${pos('K')}${pos('V')}${pos('M')}${pos('A')}<span class="vb-blessure">Enkel, 2 dagen</span><span class="vb-fit">Fit</span></div><p class="vb-tip">Vorm: W winst (vierkant), G gelijk, V verlies (rond). Leeg gestippeld = nog niet gespeeld.</p></section>
<section style="grid-column: span 2"><h4>2. Navigatie (tabs)</h4>${tabsHtml('selectie', 'club')}<p class="vb-tip">Onderstreping in bordgroen, geen pil; Q en E wisselen; een rood punt (met woord in aria-label) is iets nieuws.</p></section>
<section><h4>3. Keuze (segment)</h4>${seg(['Thuis', 'Uit', 'Derde'], 0)}${seg(['Verdedigend', 'Evenwichtig', 'Aanvallend'], 1)}<div class="vb-seg"><button type="button" role="radio" aria-checked="true">Thuis</button><button type="button" role="radio" aria-checked="false">Uit</button><button type="button" role="radio" aria-disabled="true" title="Vanaf Prof">Derde · vanaf Prof</button></div><p class="vb-tip">Gekozen = bordgroen met vinkje. Op slot = raster en een reden.</p></section>
<section><h4>4. Actie (knoppen)</h4><div class="vb-rijen"><button class="ds-z-knop" type="button">Speel de wedstrijd</button><button class="ds-z-knop ds-z-knop--secundair" type="button">Laat uitrekenen</button><button class="vb-link" type="button">Naar training</button><button class="ds-z-knop ds-z-knop--secundair" type="button" aria-disabled="true">Op slot</button></div><p class="vb-tip">Eén gele per scherm. Daaronder secundair (papier). Derde actie: onderstreepte link met pijl. Op slot: gestippeld, altijd met de reden in de melding.</p></section>
<section><h4>Wapen (maten xs tot xl)</h4><div class="vb-rijen">${wapen(C.dork, 'xs')}${wapen(C.roode, 's')}${wapen(C.sauw, 'm')}${wapen(C.vier, 'l')}${wapen(C.hark, 'xl')}</div><p class="vb-tip">Een schild met patroon (effen, brede streep, helften, smalle streep): kleur is nooit het enige verschil.</p></section>
<section><h4>Tussenkop (zonder misdruk)</h4><h3 class="vb-tussenkop">Bank<button class="vb-link" type="button">Beste elf</button></h3><h3 class="vb-tussenkop">Sponsors<small>2 wachten</small></h3><p class="vb-tip">Eén niveau onder de titel, een lijn eronder; de rode misdruk blijft op de schermtitel en de kaartkop.</p></section>
<section><h4>Stat met teamgemiddelde en plafond</h4><div class="vb-stat" style="--team:41%;--cap:62%"><span class="vb-stat__naam">Tempo</span><span class="vb-stat__spoor"><span class="ds-z-balk" style="--ds-z-w:44%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span></span><i class="vb-stat__team"></i><i class="vb-stat__cap"></i></span><span class="vb-stat__w">44</span><span class="vb-delta vb-delta--op">▲ +3</span></div><div class="vb-sleutel"><span><i class="tick"></i>team</span><span><i class="cap"></i>plafond</span></div></section>
<section><h4>Leeg, laden, fout</h4><div class="ds-z-leeg"><p class="ds-z-leeg__kop">Nog geen wedstrijden</p><p class="ds-z-leeg__tekst">Na de eerste ronde zie je hier je vorm.</p></div><div class="vb-skelet" aria-busy="true"><i></i><i></i><i></i></div><div class="ds-z-kaart ds-z-kaart--probleem ds-z-kaart--recht"><p class="ds-z-kaart__tekst"><b>De stand laadt niet.</b> Je carrière is veilig.</p><div class="ds-z-kaart__voet"><button class="ds-z-knop ds-z-knop--secundair" type="button">Opnieuw</button></div></div></section>
<section><h4>Toetsregel in groepen</h4>${hintGroepen([['', [['↑↓', 'kiezen'], ['↵', 'doen']]], ['', [['Q E', 'tab']]], ['', [['Esc', 'terug']]]])}<p class="vb-tip">Hooguit vier groepen op één regel; een groep heeft een naam of een streep ervoor.</p></section>
</div></div>`;
  return pagina('Componenten', body);
}

// ---------- c. Selectie ----------
function paginaC() {
  const sorted = SP.slice().sort((a, b) => a[0] - b[0]);
  const rows = sorted.map((p) => { const jij = p[0] === 10; return `<tr class="${jij ? 'gekozen' : ''}" aria-selected="${jij}"><td class="nr">${p[0]}</td><td class="naam"><span>${e(p[1])}${jij ? '<b class="vb-jij">JIJ</b>' : p[0] === 6 ? '<b class="vb-jij vb-jij--stil">TEAMGENOOT</b>' : ''}</span></td><td class="c">${pos(p[2])}</td><td class="pt">${p[3]}</td><td class="c">${trendKort(p[4])}</td><td class="l">${p[5] ? `<span class="vb-blessure">${e(p[5])}</span>` : '<span class="vb-fit">Fit</span>'}</td></tr>`; }).join('');
  const stat = (n, v, team, cap, d) => `<div class="vb-stat" style="--team:${team}%;--cap:${cap}%"><span class="vb-stat__naam">${n}</span><span class="vb-stat__spoor"><span class="ds-z-balk" style="--ds-z-w:${v}%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span></span><i class="vb-stat__team"></i><i class="vb-stat__cap"></i></span><span class="vb-stat__w">${v}</span><span class="vb-delta vb-delta--${d > 0 ? 'op' : d < 0 ? 'neer' : 'gelijk'}">${d > 0 ? '▲' : d < 0 ? '▼' : '▬'} ${tekenDs(d)}</span></div>`;
  const links = `<div style="display:flex;flex-direction:column;gap:var(--ds-s-3);min-height:0;height:100%"><div style="display:flex;align-items:center;gap:var(--ds-s-4);flex:none"><div class="vb-seg" role="radiogroup" aria-label="Positie"><button role="radio" aria-checked="true">Alle</button><button role="radio" aria-checked="false">K</button><button role="radio" aria-checked="false">V</button><button role="radio" aria-checked="false">M</button><button role="radio" aria-checked="false">A</button></div><span class="vb-tip" style="margin-left:auto">18 spelers · op rugnummer</span></div><div class="vb-tabel-vak vb-tabel-vak--scroll" style="flex:1;min-height:0"><table class="vb-tabel" style="--rij-h:42px"><thead><tr><th>#▲</th><th class="l">Naam</th><th class="c">Pos.</th><th>Rating</th><th class="c">Vorm</th><th class="l">Conditie</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  const zij = `<aside class="vb-zij" aria-label="Geselecteerde speler"><div class="vb-speler-kop"><span class="vb-nr">10</span><div><h3>Tessa <b class="vb-jij">JIJ</b></h3><p>${pos('A')}<span>Aanvaller</span>${trend('op')}</p></div><div class="vb-rating"><b>36</b><small>team 41</small></div></div>
<h4 class="vb-tussenkop" style="margin:var(--ds-s-1) 0 0">Vaardigheden</h4>${stat('Tempo', 44, 41, 62, 3)}${stat('Schot', 38, 39, 70, -1)}${stat('Pass', 33, 42, 66, -9)}${stat('Uithouding', 40, 44, 58, -4)}${stat('Verdedigen', 22, 40, 40, -18)}
<div class="vb-sleutel"><span><i class="tick"></i>teamgemiddelde</span><span><i class="cap"></i>plafond</span></div>
<h4 class="vb-tussenkop" style="margin:var(--ds-s-1) 0 0">Groei dit seizoen</h4><div class="vb-groei"><div><span>Rating</span><b>+2</b></div><div><span>Beste groei</span><b>Pass +3</b></div><div><span>Trainingen</span><b>11</b></div></div>
<div style="display:flex;align-items:center;gap:var(--ds-s-3);flex-wrap:wrap"><span class="vb-feit"><small>Talent</small><b style="font-size:var(--ds-t-label)">geen</b></span><button class="vb-link" type="button" style="margin-left:auto">Train Pass</button></div></aside>`;
  return pagina('Selectie', paneel(`${eyebrow}${kop(true)}${tabsHtml('selectie')}`, `<div class="vb-twee">${links}${zij}</div>`, { vast: true }));
}

// ---------- d. Tactiek ----------
function veldLijnen(breed) {
  if (breed) return `<svg class="vb-veld__lijnen" viewBox="0 0 105 68" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="101" height="64"/><path d="M52.5 2V66"/><circle cx="52.5" cy="34" r="9"/><rect x="2" y="14" width="16" height="40"/><rect x="87" y="14" width="16" height="40"/><rect x="2" y="25" width="5" height="18"/><rect x="98" y="25" width="5" height="18"/></svg>`;
  return `<svg class="vb-veld__lijnen" viewBox="0 0 68 80" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="64" height="76"/><path d="M2 40H66"/><circle cx="34" cy="40" r="8"/><rect x="14" y="62" width="40" height="16"/><rect x="14" y="2" width="40" height="16"/><rect x="25" y="72" width="18" height="6"/><rect x="25" y="2" width="18" height="6"/></svg>`;
}
function miniVorming(f) {
  const d = FORM[f].map(([u, dd]) => `<circle cx="${30 + u * 25}" cy="${42 - dd * 38}" r="3.2" fill="currentColor"/>`).join('');
  return `<svg class="vb-seg__mini" viewBox="0 0 60 48" aria-hidden="true"><rect x="1" y="1" width="58" height="46" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>${d}</svg>`;
}
function paginaD() {
  const spots = FORM['4-4-2'].map(([u, d, p], i) => { const s = SP[BASIS442[i]]; const jij = s[0] === 10; return `<button type="button" class="vb-spot${jij ? ' vb-spot--jij' : ''}" style="left:${50 + u * 47}%;bottom:${9 + d * 92}%" aria-pressed="${jij}" aria-label="${POSNAAM[p]} ${e(s[1])}, rating ${s[3]}"><span class="vb-spot__nr">${s[0]}</span><span class="vb-spot__naam">${e(achter(s[1]))}</span><span class="vb-spot__rt">${s[3]}</span></button>`; }).join('');
  const veld = `<div class="vb-tactiek__veld"><div class="vb-veld" role="group" aria-label="Opstelling 4-4-2">${veldLijnen(false)}<span class="vb-veld__kop">4-4-2 · evenwichtig</span><span class="vb-richting">↑ aanvallen</span>${spots}</div></div>`;
  const bank = [16, 17, 11, 12, 13, 14, 15].map((i) => SP[i]).map((s, i) => { const kand = s[2] === 'A'; const dl = kand ? s[3] - 36 : null; return `<li ${kand && s[0] === 17 ? 'aria-selected="true"' : ''}><span class="n">${s[0]}</span>${pos(s[2])}<span class="nm">${e(s[1])}${s[5] ? ' <span class="vb-blessure">Kuit</span>' : ''}</span><span class="vb-delta ${dl == null ? '' : dl > 0 ? 'vb-delta--op' : dl < 0 ? 'vb-delta--neer' : 'vb-delta--gelijk'}">${dl == null ? '' : `${dl > 0 ? '▲' : dl < 0 ? '▼' : '▬'} ${tekenDs(dl)}`}</span><span class="rt">${s[3]}</span></li>`; }).join('');
  const rechts = `<div class="vb-tactiek__rechts"><section class="vb-keuzeblok"><h3 class="vb-tussenkop">Vorming</h3><div class="vb-seg vb-seg--stapel vb-seg--vol" role="radiogroup" aria-label="Vorming"><button role="radio" aria-checked="true">${miniVorming('4-4-2')}<span>✓ 4-4-2</span></button><button role="radio" aria-checked="false">${miniVorming('4-3-3')}<span>4-3-3</span></button><button role="radio" aria-checked="false">${miniVorming('3-5-2')}<span>3-5-2</span></button></div><p class="vb-uitlegzin">Vier achter, vier op het middenveld, twee voor. Stevig en gebalanceerd.</p></section>
<section class="vb-keuzeblok"><h3 class="vb-tussenkop">Speelstijl</h3><div class="vb-seg vb-seg--vol" role="radiogroup" aria-label="Speelstijl"><button role="radio" aria-checked="false">Verdedigend</button><button role="radio" aria-checked="true">Evenwichtig</button><button role="radio" aria-checked="false">Aanvallend</button></div><p class="vb-uitlegzin">Evenwichtig: de lijnen staan in het midden en twee spelers zetten druk.</p></section>
<section><h3 class="vb-tussenkop">Bank<small>kies een plek op het veld, dan een speler</small><button class="vb-link" type="button">Beste elf</button></h3><ul class="vb-bank" role="listbox" aria-label="Bank">${bank}</ul><p class="vb-tip" style="margin-top:var(--ds-s-2)">Gekozen plek: <b>Aanvaller, Tessa (36)</b>. Het verschil is tegen haar rating.</p></section></div>`;
  const voet = `<div class="vb-actiebalk"><p><b>Coach de wedstrijd:</b> je kijkt toe en past onderweg de speelstijl (toets 1) en vorming (toets 2) aan. Jij speelt dan niet mee.</p><button class="ds-z-knop" type="button">Coach de wedstrijd ${k('↵')}</button></div>`;
  return pagina('Tactiek', paneel(`${eyebrow}${kop(true)}${tabsHtml('tactiek')}`, `<div class="vb-tactiek" style="padding:0">${veld}${rechts}</div>`, { vast: true, voet }));
}

// ---------- e. Stand ----------
function paginaE() {
  const rows = STAND.map((r, i) => { const jij = r[0] === C.dork; const zone = i < 2 ? 'zone-op' : i > 5 ? 'zone-neer' : ''; return `<tr class="${zone}${jij ? ' jij' : ''}"><td class="nr">${i + 1}</td><td class="naam"><span>${wapen(r[0], 's')}<span title="${e(r[0].naam)}">${e(r[0].naam)}</span>${jij ? '<b class="vb-jij">JIJ</b>' : r[0] === C.roode ? '<b class="vb-jij vb-jij--stil">TEGEN</b>' : ''}</span></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${tekenDs(ds(r))}</td><td class="pt">${pts(r)}</td><td class="l">${pips(r[7])}</td></tr>`; }).join('');
  const tabel = `<div><div class="vb-tabel-vak"><table class="vb-tabel"><thead><tr><th class="c">#</th><th class="l">Club</th><th>Gesp.</th><th>W</th><th>Gel.</th><th>V</th><th>DS</th><th>Ptn</th><th class="l">Vorm</th></tr></thead><tbody>${rows}</tbody></table></div><div class="vb-legenda"><span><i></i>Promotie: de top twee</span><span><i class="neer"></i>Degradatie: de onderste twee</span><span>W winst · Gel. gelijk · V verlies · DS doelsaldo</span></div></div>`;
  const zij = `<div class="vb-kolom"><section><h3 class="vb-tussenkop">Jouw seizoen</h3><div class="vb-feiten"><div class="ds-z-feit"><span class="ds-z-feit__n">1<small>e</small></span><span class="ds-z-feit__l">plek van 8</span></div><div class="ds-z-feit"><span class="ds-z-feit__n">3<small>/7</small></span><span class="ds-z-feit__l">rondes gespeeld</span></div></div></section>
<section><h3 class="vb-tussenkop">Bekers</h3><p class="vb-feit"><span class="vb-ja">✓ Nog in de race</span><span>Dijkbeker</span></p><p class="vb-feit"><span class="vb-nee">– Niet geplaatst</span><span>Waddenbeker</span></p></section>
<section><h3 class="vb-tussenkop">Vorig seizoen</h3><p class="vb-tip" style="font-size:var(--ds-t-body)">Talentenklasse, plek 3. Geen promotie.</p></section></div>`;
  const kopS = `<div style="display:flex;align-items:center;gap:var(--ds-s-4);margin-bottom:var(--ds-s-3)"><div class="vb-seg" role="radiogroup" aria-label="Klasse"><button role="radio" aria-checked="false">Kroonklasse</button><button role="radio" aria-checked="false">Terpklasse</button><button role="radio" aria-checked="true">Talentenklasse · jouw klasse</button></div><span class="vb-tip" style="margin-left:auto">Ronde 3 van 7 gespeeld</span></div>`;
  return pagina('Stand', paneel(`${eyebrow}${kop(true)}${tabsHtml('stand')}`, `${kopS}<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,270px);gap:var(--ds-s-4);align-items:start">${tabel}${zij}</div>`));
}

// ---------- f. Club ----------
function shirt(c, nr) {
  const pat = { effen: '', helften: `<rect x="100" y="0" width="100" height="220" fill="${c.accent}"/>`, 'brede-streep': `<rect x="70" y="0" width="60" height="220" fill="${c.accent}"/>`, 'smalle-streep': '' }[c.patroon] || '';
  const d = 'M60 20 L84 8 Q100 26 116 8 L140 20 L190 52 L168 92 L148 82 L148 205 Q100 214 52 205 L52 82 L32 92 L10 52 Z';
  return `<svg viewBox="0 0 200 220" role="img" aria-label="Voorbeeld van het shirt"><defs><clipPath id="sh"><path d="${d}"/></clipPath></defs><g clip-path="url(#sh)"><rect width="200" height="220" fill="${c.shirt}"/>${pat}</g><path d="${d}" fill="none" stroke="#1d1b17" stroke-width="5" stroke-linejoin="round"/><text x="100" y="128" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="70" fill="#f3ead3" stroke="#1d1b17" stroke-width="2.5" paint-order="stroke">${nr}</text></svg>`;
}
function paginaF(open) {
  const tenue = `<article class="ds-z-kaart ds-z-kaart--recht"><div class="ds-z-kaart__kop"><h2 class="ds-z-kaart__titel">Tenue</h2><span>Niveau: Amateur</span></div><div class="vb-shirtvak">${shirt(C.dork, 10)}</div>
<div class="vb-veldrij"><span class="vb-veldrij__l">Tenue</span><div class="vb-seg" role="radiogroup"><button role="radio" aria-checked="true">Thuis ${k('1')}</button><button role="radio" aria-checked="false">Uit ${k('2')}</button><button role="radio" aria-disabled="true" title="Een derde tenue krijg je vanaf Prof">Derde · vanaf Prof</button></div></div>
<div class="vb-veldrij"><span class="vb-veldrij__l">Rugnummer</span><div class="vb-stepper"><button type="button" aria-label="Nummer lager">−</button><output aria-live="polite">10</output><button type="button" aria-label="Nummer hoger">+</button></div></div>
<div class="vb-veldrij"><span class="vb-veldrij__l">Sponsor</span><span style="font-size:var(--ds-t-body)">Nog geen sponsor op het shirt</span></div>
<p class="vb-tip">Je draagt het tenue bij wedstrijd, training en penalty's. Een beter tenue komt met een hogere klasse.</p></article>`;
  const profiel = `<article><h3 class="vb-tussenkop">Wapen en kleuren</h3><div class="vb-twee-vlak">${wapen(C.dork, 'xl')}<div class="vb-kolom" style="gap:var(--ds-s-3)"><div class="vb-kleuren"><span class="vb-kleur"><i style="background:${C.dork.shirt}"></i>Shirt</span><span class="vb-kleur"><i style="background:${C.dork.accent}"></i>Broek en accent</span></div><span class="vb-feit"><small>Patroon</small><b style="font-size:var(--ds-t-label)">helften</b></span></div></div></article>
<article><h3 class="vb-tussenkop">Stadion en trainingsveld</h3><div class="vb-feiten"><div class="ds-z-feit"><span class="ds-z-feit__n">800</span><span class="ds-z-feit__l">plaatsen, Sportpark Dorkwerd</span></div><div class="ds-z-feit"><span class="ds-z-feit__n">1</span><span class="ds-z-feit__l">trainingsveld, gras</span></div></div><p class="vb-tip" style="margin-top:var(--ds-s-2)">Een tribune bouwen kan na je eerste aandeel.</p></article>`;
  const locked = `<div class="vb-slot">${iSlot}<div style="flex:1"><b>Aandeel kopen: nog dicht.</b> Dat kan zodra je €3.000 met voetbal hebt verdiend, of manager van je club wordt.<div style="margin-top:var(--ds-s-2)">${balk(4, '€120 van €3.000')}</div></div></div>`;
  const opened = `<div class="vb-kolom"><div class="vb-feiten"><div class="ds-z-feit"><span class="ds-z-feit__n">10<small>%</small></span><span class="ds-z-feit__l">van Dorkwerd, sinds speldag 12</span></div><div class="ds-z-feit"><span class="ds-z-feit__n">€34</span><span class="ds-z-feit__l">dividend per ronde</span></div></div><p class="vb-tip">Na elke competitieronde krijg je dividend, hoger als je club hoger staat. Je koopt nooit je spaargeld leeg: een kwart blijft over.</p>
<div class="vb-optie"><button type="button"><b>+10%</b><span>€3.030</span></button><button type="button" aria-disabled="true"><b>+25%</b><span>€7.575</span></button><button type="button" aria-disabled="true"><b>+51%</b><span>€15.453</span></button><button type="button" aria-disabled="true"><b>100%</b><span>niet mogelijk</span></button></div><p class="vb-tip">Grijs: dat leegt je spaargeld. Verkopen levert 75% van wat je betaalde.</p><button class="vb-link" type="button" style="align-self:flex-start">Verkoop mijn 10% voor €2.250</button></div>`;
  const aandeel = `<article><h3 class="vb-tussenkop">Aandeel en dividend</h3>${open ? opened : locked}</article>`;
  const sponsors = `<article class="vol"><h3 class="vb-tussenkop">Sponsors<small>2 aanbiedingen, 1 aangenomen</small></h3><div class="vb-sponsor vb-sponsor--aan"><span><b>Bel Fietsen</b><small>Fietsenmaker · scoor een doelpunt</small></span><span class="vb-sponsor__bedrag">€190</span><span class="vb-feit"><span class="vb-ja">✓ Aangenomen</span></span></div><div class="vb-sponsor"><span><b>Karretje Markt</b><small>Supermarkt · promotie aan het eind van het seizoen</small></span><span class="vb-sponsor__bedrag">€160</span><button class="ds-z-knop ds-z-knop--secundair" type="button">Neem aan</button></div><div class="vb-sponsor"><span><b>Stuur Occasions</b><small>Autodealer · drie wedstrijden zonder verlies</small></span><span class="vb-sponsor__bedrag">€210</span><button class="ds-z-knop ds-z-knop--secundair" type="button">Neem aan</button></div></article>`;
  return pagina(open ? 'Club, aandeel open' : 'Club', paneel(`${eyebrow}${kop(true)}${tabsHtml('club')}`, `<div class="vb-clubraster">${tenue}<div class="vb-kolom" style="gap:var(--ds-s-5)">${profiel}${aandeel}</div>${sponsors}</div>`));
}

// ---------- g. wedstrijdintro en HUD ----------
function lijst11(club, spelers, jijNr) {
  return `<ul class="lijst11" aria-label="Opstelling ${e(club.kort)}"><li class="h"><span class="n">#</span><span>P</span><span>Speler</span><span class="rt">Rtg</span></li>${spelers.map((s) => `<li class="${s[0] === jijNr ? 'jij' : ''}"><span class="n">${s[0]}</span>${pos(s[2])}<span class="nm">${e(s[1])}${s[0] === jijNr ? ' · jij' : ''}</span><span class="rt">${s[3]}</span></li>`).join('')}</ul>`;
}
const ROODE = [[1, 'Aart Terpzicht', 'K', 44], [2, 'Jurre Kuipertje', 'V', 43], [3, 'Lars Poldermeer', 'V', 42], [4, 'Wiebe Brugwachter', 'V', 42], [5, 'Wessel Vaarboom', 'V', 41], [6, 'Menno Plasdrasser', 'M', 44], [7, 'Okke IJsselhof', 'M', 43], [8, 'Folkert Appelflap', 'M', 43], [9, 'Jelle Schaapskooi', 'M', 42], [10, 'Tijmen Vaarboom', 'A', 45], [11, 'Folkert Brugwachter', 'A', 44]];
function paginaG1() {
  const dork = BASIS442.map((i) => SP[i]).sort((a, b) => a[0] - b[0]);
  const spotsHome = FORM['4-4-2'].map(([u, d, p], i) => `<span class="vb-spot vb-spot--klein vb-spot--tegen" style="left:${4 + d * 46}%;top:${50 + u * 40}%"><span class="vb-spot__nr">${ROODE[i][0]}</span></span>`).join('');
  const spotsAway = FORM['4-4-2'].map(([u, d, p], i) => { const s = SP[BASIS442[i]]; return `<span class="vb-spot vb-spot--klein ${s[0] === 10 ? 'vb-spot--jij' : ''}" style="left:${96 - d * 46}%;top:${50 - u * 40}%"><span class="vb-spot__nr">${s[0]}</span></span>`; }).join('');
  const veld = `<div class="vb-veld vb-veld--breed" aria-label="Beide opstellingen">${veldLijnen(true)}<span class="vb-veld__kop">Roodehaan · 4-4-2</span><span class="vb-veld__kop vb-veld__kop--r">Dorkwerd · 4-4-2</span>${spotsHome}${spotsAway}</div>`;
  const intro = `<section class="intro" aria-label="Opstelling"><div class="intro__kop"><div class="vb-team">${wapen(C.roode, 'm')}<div><h2 class="vb-team__naam" style="font-size:var(--ds-t-subkop)">Roodehaan</h2><p class="vb-team__sub" style="margin:0"><span class="vb-thuisuit">Thuis</span><span>evenwichtig</span></p></div></div><div class="intro__plek">Aftrap<b>Zaterdag 15 augustus · 15:00</b>Sportpark Oude Roodehaan</div><div class="vb-team vb-team--uit">${wapen(C.dork, 'm')}<div><h2 class="vb-team__naam" style="font-size:var(--ds-t-subkop)">Dorkwerd</h2><p class="vb-team__sub" style="margin:0"><span class="vb-thuisuit">Uit</span><span>evenwichtig</span></p></div></div></div>
<div class="intro__midden">${lijst11(C.roode, ROODE)}${veld}${lijst11(C.dork, dork, 10)}</div>
<div class="intro__voet"><span class="vb-tip" style="color:var(--ds-c-ink-inkt)">Jij speelt als <b>Tessa</b>, aanvaller, rugnummer 10.</span>${hintGroepen([['', [['WASD', 'lopen'], ['F', 'pass']]], ['', [['Spatie', 'schot']]]])}<button class="ds-z-knop" type="button">Aftrap ${k('F')}</button></div></section>`;
  return pagina('Wedstrijdintro', stage(`<div class="scene"></div><div class="scene__tekst">Plaatsvervanger voor de 3D-scène van het sportpark</div>${intro}`));
}
function hudBasis(inner) {
  const score = `<div class="hud-score" role="status" aria-label="Stand Roodehaan 0, Dorkwerd 1, eerste helft 12:30"><span class="hud-score__team">${wapen(C.roode, 'xs')}Roodehaan</span><span class="hud-score__stand">0 <span style="font-size:var(--ds-t-subkop)">–</span> 1</span><span class="hud-score__team">Dorkwerd${wapen(C.dork, 'xs')}</span><span class="hud-score__tijd"><b>12:30</b><small>Eerste helft</small></span></div>`;
  const speler = `<div class="hud-speler" aria-label="Jouw speler"><div class="hud-speler__kop"><span class="vb-nr" style="width:var(--ds-s-7);height:var(--ds-s-7);font-size:var(--ds-t-subkop)">10</span><b>Tessa</b>${pos('A')}</div>${balk(72, 'Energie 72%')}</div>`;
  return stage(`<div class="scene"></div><div class="scene__tekst">Plaatsvervanger voor de 3D-scène</div>${score}<div class="hud-mini">Minikaart</div>${speler}${inner}`);
}
function paginaG2() {
  return pagina('HUD tijdens de wedstrijd', hudBasis(`<div class="hud-melding" role="status"><b>Hilbrand</b><span>Mooie combinatie op links, Dorkwerd zet druk.</span></div>`));
}
function paginaG3() {
  const grp = (naam, items) => `<span class="vb-hint__groep"><span class="vb-hint__naam">${naam}</span><span class="vb-hint__rij">${items.map(([t, w]) => `${k(t)}<span>${w}</span>`).join('')}</span></span>`;
  return pagina('HUD, toetsen in groepen', hudBasis(`<div class="hud-toetsen"><div class="vb-hint">${grp('Lopen', [['W', ''], ['A', ''], ['S', ''], ['D', '']])}${grp('Bal', [['F', 'pass'], ['E', 'lang'], ['Spatie', 'schot']])}${grp('Verdedigen', [['Ctrl', 'tackle'], ['Q', 'wissel']])}${grp('Tactiek', [['1', 'stijl'], ['2', 'vorming'], ['3', 'camera']])}</div></div>`).replace('<div class="hud-melding"', '<div class="hud-melding"'));
}

const uit = { 'a-clubhuis': paginaA(false), 'a2-clubhuis-gast': paginaA(true), 'b-componenten': paginaB(), 'c-selectie': paginaC(), 'd-tactiek': paginaD(), 'e-stand': paginaE(), 'f-club': paginaF(false), 'f2-club-aandeel': paginaF(true), 'g-intro': paginaG1(), 'g2-hud': paginaG2(), 'g3-hud-toetsen': paginaG3() };
for (const [n, h] of Object.entries(uit)) fs.writeFileSync(path.join(dir, `${n}.html`), h);
console.log(`${Object.keys(uit).length} pagina's geschreven in ${dir}`);
