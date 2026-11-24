// Eigen boerderij (#415): het onderdeel Boerderij van het pauzemenu. Links vier onderdelen (Perceel, Gewas, Machines, Kasboek), rechts wat
// er te zien en te doen is: de stand van het land en de volgende taak, het teeltplan per perceel (het gewas voor het volgende zaaien), de
// machines die je huurt of koopt, en wat de boerderij tot nu toe opbracht. De gegevens komen uit boerderijlive.js (en boerderij.js); dit
// bestand is alleen DOM. Het werk zelf doe je op het land: de bijbaan "Eigen boerderij" bij Hoogkerk. Niet door een mens in beeld bekeken.
import { icoon as fIcoon } from './icons.js';
import * as B from './boerderij.js';
import { getBoerderij, kiesGewas, koopMachine, getBedrijf, koopPerceel, huurPerceel, zegOpPerceel, verkoopPerceel, betaalSchuldPerceel, zetThuis, zetActief, schuurNaarErf, erfNaarSchuur, koopMachineCat, huurMachineCat, verkoopMachineCat, onderhoudMachine, loonwerk, loonwerkAfleveren, leenGeld, losAf, contracten, neemContract } from './boerderijlive.js';
import * as CT from './boerderijcontracten.js';
import * as PC from './percelen.js';
import * as M from './machines.js';
import * as WT from './werktuigen.js';
import { fillBars } from './motion.js';
import { setUserWaypoint } from './routing.js';
import { wgsToWorld } from './rdnew.js';
import { sfeerStijl, sfeerBandHtml, SFEER_BAND_CSS } from './carrieresfeer.js';
import { dagKeuze, dagKeuzeTekst } from './boerderijdag.js';
import { koopVraag, tweedeDruk } from './tweedruk.js';
import { kaartenBlok, zetUitlegGezien } from './farmcards.js';
import { getBezit } from './bezitlive.js';
import { frameView, frameHtml } from './bezitframe.js';
import { veldenView, teamView, veldenActie } from './bezitui.js';
import { fpHtml, leegHtml, meerHtml } from './farmpicshtml.js';
import { vulPlaatjes, showLive, ruimLive, ruimPlaatjes } from './farmpics.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const euro = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
const cent = (n) => `€${n.toFixed(2).replace('.', ',')}`;   // een prijs per kilo: twee decimalen met een komma
const nl = (n) => Math.round(n).toLocaleString('nl-NL');

// Betekenisnamen (icons.js, Phosphor, ADR 0041).
const ICOON = { perceel: 'oogst', gewas: 'gewas', machines: 'tractor', percelen: 'rooster', erf: 'boerderij', kas: 'bon', bank: 'bank' };
// Heeft de speler al op het land gewerkt? Zo nee, heet het rail-item "Begin je boerderij" en toont het eerste scherm hoe je begint (21-11).
export const boerderijBegonnen = (b) => !!(b && (b.perceel || b.uren > 0));
// de eerste tab heet Werk: het tabblad Overzicht staat al in de bovenste rij van Land en bedrijf (#1243)
const ONDERDELEN = [['velden', 'Velden'], ['team', 'Team'], ['machines', 'Machines'], ['erf', 'Erf en opslag'], ['kas', 'Kasboek']];
const icoon = (n, cls = 'pa-ico') => `<span class="${cls}">${fIcoon(ICOON[n])}</span>`;

// De boerderij hoort bij het vak Landbouw en draagt dezelfde sfeerband als Loopbanen (#492, #609).
const SFEER = 'landbouw';
// De band draagt ook de naam van de boerderij: één kop in plaats van band, eyebrow en paneelkop onder elkaar (#1243). Compact via .bd-pane .lb-sfeer in farm.css.
const band = () => sfeerBandHtml(SFEER, { icoon: icoon('machines', 'lb-sfeer-ico'), klein: 'Boerderij De Zonnehoek, bij Hoogkerk' });

const CSS = `${SFEER_BAND_CSS}
.bd-pane .pa-ico svg { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.m-pane.bd-pane { gap: 12px; }
.bd-pane p { margin: 4px 0; }
.bd-voort { display: flex; align-items: center; gap: 14px; margin: 4px 0; }
.bd-voort .m-bar { flex: 1; max-width: 360px; height: 6px; }
.bd-rij { display: flex; align-items: center; gap: 16px; padding: 10px 0; border-bottom: 1px solid var(--line); max-width: 720px; }
.bd-rij .bd-naam { flex: 1; }
.bd-rij .mut { font-size: 18px; }
/* de feiten van een rij in kolommen naast elkaar (#609): geen lange prozaregel meer */
.bd-feiten { display: flex; flex-wrap: wrap; gap: 2px 18px; margin-top: 2px; font-size: 18px; color: var(--mut); }
.bd-feiten > span { white-space: nowrap; }
/* de toetsen van het land naast de handeling, als echte toetsplaatjes (#609) */
.bd-toetsen { display: flex; flex-wrap: wrap; gap: 8px 22px; align-items: center; margin: 8px 0; font-size: 18px; color: var(--mut); }
.bd-toetsen > span { display: inline-flex; align-items: center; gap: 8px; }
.bd-keus.aan { box-shadow: inset 0 0 0 2px var(--g, #3fc97a); }
.bd-kas { display: grid; grid-template-columns: auto auto; gap: 6px 36px; justify-content: start; margin: 4px 0; }
.bd-kas span:nth-child(odd) { opacity: 0.7; }
.bd-pc { flex-wrap: wrap; max-width: 960px; }
.bd-acties { display: flex; flex-wrap: wrap; gap: 8px; }
.bd-melding { min-height: 1.4em; color: var(--g, #3fc97a); }
/* 22-11: beeld eerst. Plaatsvakken met een groot icoon tot het 3D-plaatje er is; het plaatje fadet in (<= 250 ms, niet bij Minder beweging) */
.bd-fp { position: relative; display: inline-flex; align-items: center; justify-content: center; flex: none; overflow: hidden; border: 1px solid var(--line); border-radius: 6px; background: var(--panel2, rgba(255,255,255,0.04)); color: var(--mut); }
.bd-fp--s { width: 88px; height: 56px; } .bd-fp--m { width: 144px; height: 90px; } .bd-fp--l { width: 240px; height: 150px; }
.bd-fp__ic .ds-icoon, .bd-fp__ic svg { width: 32px; height: 32px; }
.bd-fp img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity 0.2s ease; }
.bd-fp.is-klaar img { opacity: 1; }
.bd-fp.is-klaar .bd-fp__ic { opacity: 0; }
.reduce-motion .bd-fp img, .reduce-motion .bd-live__doek { transition: none; }
.bd-live { position: relative; width: 100%; max-width: 420px; height: 180px; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; margin: 4px 0 8px; }
.bd-live__doek { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.2s ease; }
.bd-live__doek.on { opacity: 1; }
.bd-gewas, .bd-erfrij, .bd-pcrij { gap: 14px; }
.bd-getal { display: inline-flex; align-items: center; gap: 6px; margin-right: 14px; }
.bd-getal b { font-size: 24px; line-height: 1; } .bd-getal small { color: var(--mut); font-size: 16px; }
.bd-getal__ic .ds-icoon, .bd-getal__ic svg { width: 22px; height: 22px; }
.bd-meer { margin: 6px 0; } .bd-meer summary { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; } .bd-meer p { max-width: 640px; color: var(--mut); }
.bd-leeg { display: flex; align-items: center; gap: 14px; }
.bd-veld__feiten .bd-getal { margin-right: 10px; }
@media (max-width: 720px) { .bd-fp--l { width: 160px; height: 100px; } .bd-live { height: 140px; } }
`;
let cssAan = false;
function zetCss() {
  if (cssAan || typeof document === 'undefined') return;
  cssAan = true;
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
}

let gekozen = 'velden';
let gast = false; // samen spelen: de klussen op het land (de trekker) doe je in je eigen spel (#429)
let melding = '';
const bars = new Map();

// De markt (gewasmarkt.js): de prijs van vandaag en of hij stijgt, daalt of gelijk blijft ten opzichte van gisteren.
const TREND_TEKST = { op: 'prijs stijgt', neer: 'prijs daalt', gelijk: 'prijs gelijk' };

function perceel(b, geld) {
  const s = B.samenvatting(b);
  const volgende = s.volgende ? B.TAKEN[s.volgende].naam : null;
  const k = s.volgende ? B.kosten(b, s.volgende) : null;
  const wacht = B.wacht(b);
  const blok = kaartenBlok(b, getBezit()); // de kaart toont al de volgende klus en wat in de schuur ligt (21-11)
  // #985: eerst wat nu te doen valt (kaart met de lus en de velden), daarna de kosten, de schuur en het uitbesteden
  const begin = boerderijBegonnen(b) ? '' : `<article class="ds-z-kaart ds-z-kaart--recht ds-z-kaart--selectie bd-begin"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">Begin je boerderij</h3></header><p class="ds-z-kaart__tekst">Je akker ligt bij Hoogkerk. Ga erheen, pak de trekker en ploeg het veld; daarna kies je een gewas en zaai je.</p><footer class="ds-z-kaart__voet"><button type="button" class="ds-z-knop" data-bd-weg="1">Zet de akker op de kaart</button></footer></article>`;
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('perceel', 'pa-ico big')}Overzicht</h2></div>` +
    begin + blok +
    `<div>${blok ? '' : `<p>${volgende ? `Volgende klus op het actieve perceel: <b>${esc(volgende)}</b>${k && k.totaal ? ` (kost ${euro(k.totaal)})` : ''}.` : wacht ? 'Nu is er niets te doen: het gewas groeit.' : 'Nu is er niets te doen.'}</p>` + (s.schuurKg ? `<p>In de schuur: ${nl(s.schuurKg)} kg ${esc(B.GEWASSEN[s.schuurGewas].naam.toLowerCase())}, klaar om af te leveren.</p>` : '')}` +
    '</div>' +
    (gast ? `<p class="mut">Je speelt mee: de klussen doe je in je eigen spel.</p><p><button type="button" class="m-bt" data-bd-weg="1">Zet de akker op de kaart</button></p>`
      : meerHtml('Werk zelf op het land met je eigen trekker en werktuigen, of start de bijbaan Eigen boerderij bij Hoogkerk voor loonwerk met een gehuurde machine.', 'Hoe werk ik?')) +
    loonwerkBlok(b, geld, gast);
}

// De velden van jou staan als kaarten (farmcards.js). Hieronder wat de loonwerker nu voor je kan doen op het actieve perceel (tegen betaling, met jouw materiaal).
// De plek van een veld: de gevonden rijen als ze er zijn, anders de plek van het perceel op de kaart.
function veldPlek(id) {
  const p = B.veldPositie(getBoerderij(), id);
  if (p && Number.isFinite(p.x)) return { x: p.x, y: p.y };
  const d = PC.perceelDef(id);
  const [x, y] = wgsToWorld(d.lat, d.lon);
  return { x, y };
}

function loonwerkBlok(b, geld, gast) {
  const ha = PC.actiefPerceel(b.bedrijf).ha;
  const taken = B.opties(b, { vrij: true }).filter((o) => M.loonwerkBestaat(o.taak));
  const knoppen = taken.map((o) => {
    const k = B.kosten(b, o.taak, B.actiefGewas(b), { vrij: true });
    const loon = M.loonwerkKosten(o.taak, ha);
    return `<button type="button" class="m-bt" data-mc="loon" data-taak="${o.taak}"${geld >= loon + k.totaal ? '' : ' disabled'}>${esc(B.TAKEN[o.taak].naam)} ${euro(loon + k.totaal)}</button>`;
  });
  if (b.schuur.kg > 0 && !gast) knoppen.push(`<button type="button" class="m-bt" data-mc="loon-lever">Oogst laten afleveren (${Math.round(M.LOONWERK_AFLEVEREN * 100)}% voor de loonwerker)</button>`);
  const gastLever = gast && b.schuur.kg > 0 ? '<p class="mut">Je oogst lever je in je eigen spel af; hier kan dat niet.</p>' : '';
  return `<div><p class="lb-titel"><b>Loonwerker</b></p><p class="mut">${esc(M.LOONWERKER.naam)} · ${Math.round(M.LOONWERKER.kwaliteit * 100)}%</p>${meerHtml(`${M.LOONWERKER.naam} doet een klus op ${PC.actiefPerceel(b.bedrijf).naam} voor je, met zijn eigen trekker. Het zaaigoed en de mest betaal jij.`, 'Hoe werkt loonwerk?')}${gastLever}` +
    (knoppen.length ? `<div class="bd-acties">${knoppen.join(' ')}</div>` : '<p class="mut">Nu valt er niets uit te besteden.</p>') + `<p class="bd-melding" aria-live="polite">${esc(melding)}</p></div>`;
}

function gewas(b) {
  const s = B.samenvatting(b);
  const gekozen = B.actiefGewas(b);
  const rijen = B.GEWAS_IDS.map((id) => {
    const g = B.GEWASSEN[id];
    const m = s.prijzen[id] || { prijs: g.prijsKg, trend: 'gelijk' };
    const aan = gekozen === id;
    // de feiten van een gewas als kolommen, niet als één lange zin (#609)
    const feiten = [
      `${cent(m.prijs)} per kg vandaag`,
      esc(TREND_TEKST[m.trend] || TREND_TEKST.gelijk),
      `zaaigoed ${euro(g.zaaigoed)}`,
      `rijp na ${g.groeiUren} speluren`,
      `${nl(g.kgBasis)} kg per perceel`,
      esc(g.afnemer),
      g.soort === 'weiland' ? 'alleen op weiland' : 'op akkers',
    ].map((x) => `<span>${x}</span>`).join('');
    return `<div class="bd-rij bd-gewas">${fpHtml(`gewas:${id}`, g.naam, 'm')}<span class="bd-naam"><b>${esc(g.naam)}</b><span class="bd-feiten">${feiten}</span></span>` +
      `<button type="button" class="m-bt bd-keus${aan ? ' aan' : ''}" data-bd-gewas="${id}" aria-pressed="${aan}">${aan ? 'Gekozen' : 'Kies'}</button></div>`;
  }).join('');
  // Het plan per perceel: welk gewas er bij het volgende zaaien in de grond gaat en wat het vandaag per kilo opbrengt.
  const plannen = B.veldenOverzicht(b).map((v) => {
    const d = PC.perceelDef(v.id), g = B.GEWASSEN[v.plan], m = s.prijzen[v.plan] || { prijs: g.prijsKg };
    return `<div class="bd-rij">${fpHtml(`gewas:${v.plan}`, g.naam, 's')}<span class="bd-naam"><b>${esc(d.naam)}</b>${v.id === b.bedrijf.actief ? ' · werkt hier' : ''}<span class="mut"> · plan: ${esc(g.naam)} · ${cent(m.prijs)} per kg vandaag${d.soort === 'weiland' ? ' · weiland' : ''}</span></span></div>`;
  }).join('');
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('gewas', 'pa-ico big')}Gewas</h2></div>` +
    meerHtml('Je teeltplan is het gewas dat bij het volgende zaaien de grond in gaat, per perceel. Je verkoopt tegen de dagprijs van de dag dat je aflevert.', 'Uitleg teeltplan') +
    `<p class="lb-titel"><b>Je teeltplan</b></p>${plannen}` +
    `<p class="lb-titel"><b>Gewassen</b></p>${rijen}` +
    contractenBlok();
}

// De leveringscontracten (#492): het aanbod van deze speldag met Aannemen, en de voortgang van je eigen contracten in kg.
// De kilo's tellen mee bij de gewone verkoop of aflevering; de bonus komt bovenop de dagprijs en verloopt kost niets.
function contractenBlok() {
  const k = contracten();
  const aanbod = k.aanbod.map((a) => {
    const loopt = k.actief.some((c) => c.id === a.id);
    const oud = k.historie.find((c) => c.id === a.id);
    const status = loopt ? 'Loopt' : oud ? (oud.resultaat === 'klaar' ? 'Voldaan' : 'Verlopen') : '';
    return `<div class="bd-rij"><span class="bd-naam"><b>${esc(B.GEWASSEN[a.gewas] ? B.GEWASSEN[a.gewas].naam : a.gewas)}</b><span class="mut"> · ${nl(a.kg)} kg · binnen ${a.deadlineUren} speluren · bonus ${euro(a.bonus)} (${cent(a.bonusPerKg)} per kg)</span></span>` +
      (status ? `<span class="mut">${status}</span>` : knop('contract', 'Aannemen', { id: a.id }, k.actief.length >= CT.MAX_ACTIEF)) + '</div>';
  }).join('') || '<p class="mut">De afnemers vragen vandaag niets.</p>';
  // #626: per contract één kopregel met een voortgangsbalk en de bonus als bedrag; uitleg ingeklapt.
  const actief = k.actief.map((c) => {
    const over = CT.resterend(c, k.uren);
    const pct = c.kg ? Math.round((c.geleverd / c.kg) * 100) : 0;
    return `<div class="bd-contract"><div class="bd-rij"><span class="bd-naam"><b>${esc(B.GEWASSEN[c.gewas].naam)}</b><span class="mut"> · ${nl(c.geleverd)} van ${nl(c.kg)} kg · nog ${over} speluren</span></span><span class="m-num">${euro(c.bonus)}</span></div>` +
      `<span class="m-bar"><i data-bar="ct-${esc(c.id)}" data-w="${pct}"></i></span>` +
      '<details class="bd-uitleg"><summary>Uitleg</summary><p>De kilo\'s tellen mee als je dit gewas aflevert. De bonus komt bovenop de dagprijs; verlopen kost niets.</p></details></div>';
  }).join('') || '<p class="mut">Je hebt nog geen contract aangenomen.</p>';
  return `<div><p class="lb-titel"><b>Contracten</b> <span class="mut">· speldag ${k.dag + 1}</span></p>` +
    '<details class="bd-uitleg"><summary>Hoe werken contracten?</summary><p>De afnemers vragen vandaag om een vracht gewas; de kilo\'s tellen mee als je het aflevert. Een vol contract betaalt een bonus; verlopen kost niets.</p></details>' +
    `<p class="lb-titel"><b>Aanbod van vandaag</b></p>${aanbod}` +
    `<p class="lb-titel"><b>Lopend</b></p>${actief}` +
    `<p class="bd-melding" aria-live="polite">${esc(melding)}</p></div>`;
}


// Machines (machines.js, werktuigen.js): je machinepark op je thuis, de catalogus om te kopen of per dag te huren, en de machines voor het loonwerk van de bijbaan.
const pct = (x) => `${Math.round(x * 100)}%`;
const knop = (act, tekst, data = {}, uit = false) => `<button type="button" class="m-bt" data-mc="${act}"${Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}${uit ? ' disabled' : ''}>${tekst}</button>`;

function machinepark(b, geld) {
  const bd = b.bedrijf, thuis = PC.erfDef(bd.thuis);
  const eigen = [...bd.machinepark.machines, ...bd.machinepark.werktuigen];
  const rijen = eigen.map((m) => {
    const c = PC.MACHINE_CATALOGUS[m.type], isM = c.soort === 'machine';
    const staat = `${M.staat(m)} (slijtage ${Math.round(m.slijtage)}%)`;
    const erfNaam = PC.erfDef(m.erf).naam;
    const bezit = m.bezit === 'gehuurd' ? `gehuurd, ${euro(c.huurDag)} per dag${m.achterstand ? ' · <b>achterstand</b>' : ''}` : 'van jou';
    const ob = M.onderhoudKosten(m);
    const knoppen = [
      ob > 0 ? knop('onderhoud', `Onderhoudsbeurt ${euro(ob)}`, { uid: m.uid }, geld < ob) : '',
      m.bezit === 'gehuurd' ? knop('terug', 'Breng terug', { uid: m.uid }) : knop('verkoop', `Verkoop ${euro(M.verkoopWaarde(m))}`, { uid: m.uid }),
    ].filter(Boolean).join(' ');
    const feiten = [isM ? `diesel ${pct(M.brandstofPct(m))}` : '', staat, bezit, `op ${esc(erfNaam)}`].filter(Boolean).map((x) => `<span>${x}</span>`).join('');
    return `<div class="bd-rij bd-pc" data-fp-rij="${fpSleutelCat(m.type)}">${fpHtml(fpSleutelCat(m.type), c.naam, 's')}<span class="bd-naam"><b>${esc(c.naam)}</b><span class="bd-feiten">${feiten}</span></span><span class="bd-acties">${knoppen}</span></div>`;
  }).join('') || leegHtml('m:trekker-klein', 'Nog geen machines of werktuigen: koop of huur ze hieronder.');
  const vrij = PC.vrijePlekken(bd, bd.thuis);
  const cat = (ids) => ids.map((id) => {
    const c = PC.MACHINE_CATALOGUS[id];
    const feiten = c.soort === 'machine' ? [`${c.pk} pk`, `tank ${M.SPEC[id].tank} liter`] : (WT.WERKTUIG[c.type].taak ? [`voor ${B.TAKEN[WT.WERKTUIG[c.type].taak].naam.toLowerCase()}`] : ['vervoert de oogst']);
    const k = knop('koop-cat', `Koop ${euro(c.koop)}`, { type: id }, geld < c.koop || vrij <= 0), h = knop('huur-cat', `Huur ${euro(c.huurDag)} per dag`, { type: id }, geld < c.huurDag || vrij <= 0);
    return `<div class="bd-rij bd-pc" data-fp-rij="${fpSleutelCat(id)}">${fpHtml(fpSleutelCat(id), c.naam, 's')}<span class="bd-naam"><b>${esc(c.naam)}</b><span class="bd-feiten">${feiten.map((x) => `<span>${x}</span>`).join('')}</span></span><span class="bd-acties">${k} ${h}</span></div>`;
  }).join('');
  const ploegen = B.MACHINE_IDS.map((id) => {
    const m = B.MACHINES[id];
    const e = b.machines[id] === 'eigen';
    const taken = m.taken.map((t) => B.TAKEN[t].naam.toLowerCase()).join(' en ');
    const feiten = [esc(taken), e ? 'van jou: geen huur en een ruimere rij' : `gehuurd, ${euro(m.huur)} per keer`].map((x) => `<span>${x}</span>`).join('');
    return `<div class="bd-rij"><span class="bd-naam"><b>${esc(m.naam)}</b><span class="bd-feiten">${feiten}</span></span>` +
      (e ? '<span class="g">Van jou</span>' : `<button type="button" class="m-bt" data-bd-koop="${id}"${geld >= m.koop ? '' : ' disabled'}>Koop ${euro(m.koop)}</button>`) + '</div>';
  }).join('');
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('machines', 'pa-ico big')}Machines</h2></div>` +
    `<p class="mut">Thuis: ${esc(thuis.naam)} · nog ${vrij} plekken vrij</p>${meerHtml('Een versleten machine rijdt trager en gebruikt meer diesel; een onderhoudsbeurt helpt.', 'Uitleg machines')}` +
    `<div class="bd-live" data-fp-start="${fpSleutelCat(eigen[0] ? eigen[0].type : 'trekker-klein')}" aria-hidden="true"></div>` +
    `<div class="bd-toetsen">${[['E', 'instappen of koppelen'], ['G', 'aftakas'], ['T', 'heffen'], ['X', 'loskoppelen'], ['R', 'tanken']].map(([k, t]) => `<span><span class="m-kc">${k}</span>${t}</span>`).join('')}</div>` +
    `<p class="lb-titel"><b>Je machinepark</b></p>${rijen}` +
    `<p class="lb-titel"><b>Machines</b></p>${cat(PC_MACHINES())}<p class="lb-titel"><b>Werktuigen</b></p>${cat(PC_WERKTUIGEN())}` +
    `<p class="lb-titel"><b>Voor het loonwerk van de bijbaan</b></p>${meerHtml('De bijbaan Eigen boerderij huurt een machine per klus; koop je hem, dan werk je zonder huur en met meer ruimte in de rij.', 'Uitleg loonwerk')}${ploegen}` +
    `<p class="bd-melding" aria-live="polite">${esc(melding)}</p>`;
}
const fpSleutelCat = (id) => { const c = PC.MACHINE_CATALOGUS[id]; return c ? (c.soort === 'machine' ? `m:${id}` : `w:${c.type}`) : ''; };
const PC_MACHINES = () => Object.keys(PC.MACHINE_CATALOGUS).filter((id) => PC.MACHINE_CATALOGUS[id].soort === 'machine' && M.SPEC[id]);
const PC_WERKTUIGEN = () => WT.WERKTUIG_TYPES;
const machines = machinepark;

// Percelen en erven (percelen.js): aanbod, kopen, leasen, opzeggen. Eén rij per perceel of erf met de knoppen die nu kunnen.
const wereldPos = (d, b) => (d.id === PC.START_PERCEEL && b.perceel ? [b.perceel.x, b.perceel.y] : wgsToWorld(d.lat, d.lon));
function bedrijfRegel(bd) {
  const dag = PC.huurPerDag(bd), schuld = PC.openSchuld(bd);
  return `<p class="mut">${PC.totaalHa(bd).toString().replace('.', ',')} ha van jou · huur ${euro(dag)} per speldag${schuld ? ` · <b>achterstand ${euro(schuld)}</b>` : ''}</p>`;
}
function acties(s, soort, id, geld, nu) {
  const d = s.def, bt = (act, tekst, uit = false, extra = '') => `<button type="button" class="m-bt" data-pc="${act}" data-soort="${soort}" data-id="${id}"${extra}${uit ? ' disabled' : ''}>${tekst}</button>`;
  const uit = [];
  if (s.van === 'jou') {
    if (s.status === 'gehuurd') {
      uit.push(bt('zegop', 'Zeg op'));
      uit.push(bt('wissel', s.betaling === 'week' ? 'Betaal per dag' : 'Betaal per week'));
      if (s.schuld > 0) uit.push(bt('schuld', `Betaal ${euro(s.schuld)}`, geld < s.schuld));
    } else if (id !== PC.START_PERCEEL && id !== PC.START_ERF) uit.push(bt('verkoop', `Verkoop ${euro(Math.round(d.koop * PC.VERKOOP_FACTOR))}`));
    if (soort === 'perceel' && d.soort === 'akker') uit.push(bt('actief', getBedrijf().actief === id ? 'Werkt hier' : 'Werk hier', getBedrijf().actief === id));
    if (soort === 'erf') uit.push(bt('thuis', getBedrijf().thuis === id ? 'Thuis' : 'Maak thuis', getBedrijf().thuis === id));
  } else {
    if (s.kunKopen) uit.push(bt('koop', `Koop ${euro(d.koop)}`, geld < d.koop));
    if (s.kunHuren) {
      uit.push(bt('huur-dag', `Huur ${euro(PC.huurBedrag(d, 'dag'))} per dag`, geld < PC.huurBedrag(d, 'dag')));
      uit.push(bt('huur-week', `Huur ${euro(PC.huurBedrag(d, 'week'))} per week`, geld < PC.huurBedrag(d, 'week')));
    }
  }
  uit.push(bt('kaart', 'Zet op kaart'));
  return uit.join(' ');
}

function percelen(b, geld) {
  const bd = b.bedrijf;
  const rijen = PC.overzichtPercelen(bd).map((s) => {
    const d = s.def;
    const wat = s.van === 'jou' ? (s.status === 'gehuurd' ? `gehuurd per ${s.betaling}` : 'van jou') : 'van ' + d.eigenaar;
    const feiten = [d.soort === 'akker' ? 'akker' : 'weiland', `${String(d.ha).replace('.', ',')} ha`, `bodem ${PC.bodemNaam(d.bodem)}`, esc(d.plaats), esc(wat)].map((x) => `<span>${x}</span>`).join('');
    return `<div class="bd-rij bd-pc bd-pcrij">${fpHtml(d.soort === 'akker' ? 'gewas:graan' : 'gewas:gras', d.naam, 'm')}<span class="bd-naam"><b>${esc(d.naam)}</b><span class="bd-feiten">${feiten}</span></span><span class="bd-acties">${acties(s, 'perceel', d.id, geld)}</span></div>`;
  }).join('');
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('percelen', 'pa-ico big')}Percelen</h2></div>` + bedrijfRegel(bd) +
    `${meerHtml('Koop of huur akkers en weilanden bij Hoogkerk, Zuidhorn en Winsum. Betaal je de huur te laat, dan gaat het perceel terug naar de verhuurder.', 'Uitleg percelen')}${rijen}` +
    '<p class="bd-melding" aria-live="polite">' + esc(melding) + '</p>';
}

function erf(b, geld) {
  const bd = b.bedrijf;
  const rijen = PC.overzichtErven(bd).map((s) => {
    const d = s.def;
    const jou = s.van === 'jou';
    const gebouwen = ['huis', d.schuur ? 'schuur' : null, d.silo ? 'silo' : null].filter(Boolean).join(', ');
    const wat = jou ? (s.status === 'gehuurd' ? `gehuurd per ${s.betaling}` : 'van jou') : 'van ' + d.eigenaar;
    const opslag = jou ? Object.entries(bd.opslag[d.id] || {}).map(([g, kg]) => `${nl(kg)} kg ${esc(B.GEWASSEN[g] ? B.GEWASSEN[g].naam.toLowerCase() : g)}`).join(', ') : '';
    const machs = jou ? PC.machinesOp(bd, d.id).length : 0;
    const feiten = [esc(gebouwen), `${d.machinePlekken} plekken voor machines`, esc(d.plaats), esc(wat)].map((x) => `<span>${x}</span>`).join('');
    const extra = jou ? `<span class="bd-feiten">Opslag ${nl(PC.opslagGebruikt(bd, d.id))} van ${nl(d.opslagKg)} kg${opslag ? ': ' + opslag : ''} · machineplekken ${machs} van ${d.machinePlekken}</span>` : '';
    const opslagKnoppen = jou ? ' ' + (bd.thuis === d.id && b.schuur.kg > 0 ? `<button type="button" class="m-bt" data-pc="inschuur">Oogst uit de schuur opslaan</button>` : '') + Object.keys(bd.opslag[d.id] || {}).filter((g) => B.GEWASSEN[g]).map((g) => `<button type="button" class="m-bt" data-pc="uitschuur" data-id="${d.id}" data-gewas="${g}">${esc(B.GEWASSEN[g].naam)} naar de schuur</button>`).join(' ') : '';
    return `<div class="bd-rij bd-pc bd-erfrij" data-fp-rij="${d.silo ? 'gebouw:silo' : 'gebouw:schuur'}">${fpHtml(d.silo ? 'gebouw:silo' : 'gebouw:schuur', d.naam, 'm')}<span class="bd-naam"><b>${esc(d.naam)}</b><span class="bd-feiten">${feiten}</span>${extra}</span><span class="bd-acties">${acties(s, 'erf', d.id, geld)}${opslagKnoppen}</span></div>`;
  }).join('');
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('erf', 'pa-ico big')}Erf</h2></div>` + bedrijfRegel(bd) +
    `<p class="mut">Je thuis is ${esc(PC.erfDef(bd.thuis).naam)}.</p>${meerHtml('Een erf heeft een huis, een schuur, soms silo\'s en plekken voor machines. De Zonnehoek blijft altijd van jou; de oogst uit de werkschuur kun je op je thuis bewaren.', 'Uitleg erf')}` +
    `<div class="bd-live" data-fp-start="gebouw:schuur" aria-hidden="true"></div>${rijen}` +
    '<p class="bd-melding" aria-live="polite">' + esc(melding) + '</p>';
}


const POST_NAAM = { zaaigoed: 'Zaaigoed', mest: 'Mest en spuitmiddel', machines: 'Machines en machinehuur', brandstof: 'Diesel', onderhoud: 'Onderhoud', huur: 'Huur van land en erf', loonwerk: 'Loonwerker', rente: 'Rente', aankoop: 'Aankopen' };

// Het kasboek: het resultaat sinds het begin, per veld, en per boekjaar (honderd speldagen) met de posten.
function kas(b) {
  const s = B.samenvatting(b);
  const velden = Object.entries(b.boek.velden).map(([id, v]) => `<span>${esc(PC.perceelDef(id).naam)}</span><span>${euro(v.omzet)} · ${euro(v.kosten)} · <b class="${v.omzet - v.kosten >= 0 ? 'g' : ''}">${euro(v.omzet - v.kosten)}</b> · ${nl(v.kg)} kg</span>`).join('');
  const jaren = Object.keys(b.boek.jaren).map(Number).sort((x, y) => y - x).slice(0, 4).map((j) => {
    const r = b.boek.jaren[j];
    const posten = Object.entries(r.posten).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${esc(POST_NAAM[k] || k)} ${euro(v)}`).join(' · ');
    return `<p><b>Boekjaar ${j}${j === B.boekjaar(b) ? ' (loopt)' : ''}</b>: omzet ${euro(r.omzet)}, kosten ${euro(r.kosten)}, resultaat <b class="${r.omzet - r.kosten >= 0 ? 'g' : ''}">${euro(r.omzet - r.kosten)}</b><br><span class="mut">${posten || 'Nog geen kosten.'}</span></p>`;
  }).join('');
  const sb = b.boek.lening.schuld;
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('kas', 'pa-ico big')}Kasboek</h2></div>` +
    `<div class="bd-kas"><span>Omzet</span><span>${euro(s.omzet)}</span><span>Uitgaven</span><span>${euro(s.uitgaven)}</span><span>Winst</span><span class="${s.winst >= 0 ? 'g' : ''}">${euro(s.winst)}</span>` +
    `<span>Oogsten</span><span>${nl(s.oogsten)}</span><span>Leveringen</span><span>${nl(s.leveringen)}</span>${sb > 0 ? `<span>Schuld bij de bank</span><span>${euro(sb)}</span>` : ''}</div>` +
    meerHtml('Uitgaven zijn huur, zaaigoed, mest, machines, diesel en onderhoud. De opbrengst komt bij het afleveren, met de loonfactor van je loopbaan.', 'Uitleg kasboek') +
    `<p class="lb-titel"><b>Per veld</b> <span class="mut">omzet · kosten · resultaat · geoogst</span></p>${velden ? `<div class="bd-kas">${velden}</div>` : '<p class="mut">Nog geen oogst of kosten per veld.</p>'}` +
    `<p class="lb-titel"><b>Per boekjaar</b> <span class="mut">een boekjaar is honderd speldagen; aankopen staan erbij als kasstroom</span></p>${jaren || '<p class="mut">Nog niets geboekt.</p>'}`;
}

// De bank (verzonnen): een kleine lening met een lage rente per speldag.
function bank(b, geld) {
  const l = b.boek.lening;
  const ruimte = B.leenRuimte(b);
  const stap = [1000, 5000, 10000];
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('bank', 'pa-ico big')}Bank</h2></div>` +
    `<p class="mut">${esc(B.LENING.bank)} · tot ${euro(B.LENING.max)} · rente ${(B.LENING.renteDag * 100).toFixed(2).replace('.', ',')}% per speldag</p>${meerHtml('De rente komt bij je schuld; een lening is een keuze, geen noodzaak.', 'Uitleg lening')}` +
    `<div class="bd-kas"><span>Schuld</span><span>${euro(l.schuld)}</span><span>Nog te lenen</span><span>${euro(ruimte)}</span><span>Opgenomen tot nu toe</span><span>${euro(l.opgenomen)}</span><span>Afgelost</span><span>${euro(l.afgelost)}</span><span>Rente betaald</span><span>${euro(l.rente)}</span></div>` +
    `<p class="lb-titel"><b>Lenen</b></p><div class="bd-acties">${stap.map((x) => knop('leen', `Leen ${euro(x)}`, { bedrag: x }, x > ruimte)).join(' ')}</div>` +
    `<p class="lb-titel"><b>Aflossen</b></p><div class="bd-acties">${stap.map((x) => knop('los', `Los ${euro(x)} af`, { bedrag: x }, l.schuld <= 0 || geld < Math.min(x, l.schuld))).join(' ')}${l.schuld > 0 ? knop('los', `Los alles af (${euro(l.schuld)})`, { bedrag: l.schuld }, geld < l.schuld) : ''}</div>` +
    `<p class="bd-melding" aria-live="polite">${esc(melding)}</p>`;
}

let wereld = null;
function detail(b, geld) {
  if (gekozen === 'velden') {
    // Velden: de kaart en lijst van al je land (bezitvelden.js); wie nog niets heeft ziet het begin van de boerderij. Het land van de Zonnehoek dat te koop of te huur is staat eronder.
    const v = veldenView(wereld);
    return (v || perceel(b, geld)) + `<details class="bz-uitklap"><summary class="ds-z-link">Land bij de Zonnehoek te koop of te huur</summary>${percelen(b, geld)}</details>`;
  }
  if (gekozen === 'team') return teamView(wereld);
  // Elke andere subpagina van de boerderij draagt dezelfde sfeerband (#609).
  // De oude pagina's (perceel, percelen, gewas, bank) blijven bereikbaar voor sneltoetsen en tests; het segment toont ze onder Velden en Kasboek.
  const inhoud = gekozen === 'percelen' ? percelen(b, geld) : gekozen === 'erf' ? erf(b, geld) : gekozen === 'gewas' ? gewas(b) : gekozen === 'machines' ? machines(b, geld) : gekozen === 'kas' ? kas(b) + bank(b, geld) : gekozen === 'bank' ? bank(b, geld) : perceel(b, geld);
  return band() + inhoud;
}

// QoL (#985): een aankoop van €1.000 of meer vraagt een tweede druk, zoals de gewone winkel.
let geWapend = null;
function koopBevestiging(data) {
  let item = null;
  if (data.mc === 'koop-cat') item = PC.MACHINE_CATALOGUS[data.type];
  else if (data.pc === 'koop') item = PC.perceelOfErf(data.soort, data.id);
  else if (data.bdKoop) item = B.MACHINES[data.bdKoop];
  return item ? koopVraag(item.naam, item.koop) : '';
}
function tweedeDrukStap(data) {
  const vraag = koopBevestiging(data);
  const stap = tweedeDruk(geWapend, JSON.stringify(data), vraag, Date.now());
  geWapend = stap.armed;
  if (!stap.uitvoeren) melding = vraag;
  return stap.uitvoeren;
}

// Een knop in Percelen of Erf: doe het en geef de melding terug. Alles gaat via boerderijlive.js (geld en opslag).
function percelenActie(d, world) {
  const soort = d.soort, id = d.id, naamVan = (PC.perceelOfErf(soort, id) || {}).naam;
  const klaar = (r, tekst) => (r.ok ? tekst : r.reden);
  switch (d.pc) {
    case 'koop': { const r = koopPerceel(world, soort, id); return klaar(r, naamVan + ' gekocht voor ' + euro(r.prijs) + '.'); }
    case 'huur-dag': case 'huur-week': { const r = huurPerceel(world, soort, id, d.pc === 'huur-week' ? 'week' : 'dag'); return klaar(r, naamVan + ' gehuurd: ' + euro(r.bedrag) + ' betaald.'); }
    case 'zegop': return klaar(zegOpPerceel(soort, id), 'Je huur van ' + naamVan + ' is opgezegd.');
    case 'verkoop': { const r = verkoopPerceel(world, soort, id); return klaar(r, naamVan + ' verkocht voor ' + euro(r.opbrengst) + '.'); }
    case 'schuld': { const r = betaalSchuldPerceel(world, soort, id); return klaar(r, 'Achterstand betaald: ' + euro(r.bedrag) + '.'); }
    case 'wissel': { const x = (soort === 'erf' ? getBedrijf().erven : getBedrijf().percelen)[id]; return PC.wisselBetaling(getBedrijf(), soort, id, x && x.betaling === 'week' ? 'dag' : 'week') ? 'De betaling is aangepast na de huidige periode.' : 'Dat kan niet.'; }
    case 'actief': return zetActief(id) ? 'De boerderij werkt nu op ' + naamVan + '.' : 'Dat kan niet.';
    case 'thuis': return zetThuis(id) ? naamVan + ' is nu je thuis.' : 'Dat kan niet.';
    case 'inschuur': { const r = schuurNaarErf(); return klaar(r, nl(r.kg) + ' kg opgeslagen op je thuis.'); }
    case 'uitschuur': { const r = erfNaarSchuur(id, d.gewas); return klaar(r, nl(r.kg) + ' kg staat weer in de werkschuur, klaar om af te leveren.'); }
    case 'kaart': {
      const x = soort === 'erf' ? PC.erfDef(id) : PC.perceelDef(id);
      const q = wereldPos(x, getBoerderij());
      setUserWaypoint(q[0], q[1], x.naam);
      return x.naam + ' staat op je kaart.';
    }
    default: return '';
  }
}

// Een knop bij Machines, het loonwerk, de Bank of de contracten: doe het en geef de melding terug (alles via boerderijlive.js: geld en opslag).
function machineActie(d, world) {
  const naam = (type) => (PC.MACHINE_CATALOGUS[type] || { naam: 'Machine' }).naam;
  const bd = getBedrijf();
  const m = d.uid ? M.vind(bd, d.uid) : null;
  switch (d.mc) {
    case 'contract': {
      const r = neemContract(d.id);
      return r.ok ? `Contract aangenomen: ${nl(r.contract.kg)} kg ${B.GEWASSEN[r.contract.gewas].naam.toLowerCase()} binnen ${CT.resterend(r.contract, getBoerderij().uren)} speluren.` : r.reden;
    }
    case 'koop-cat': { const r = koopMachineCat(world, d.type, bd.thuis); return r.ok ? `${naam(d.type)} gekocht voor ${euro(r.prijs)}. Hij staat op je erf met een volle tank.` : r.reden; }
    case 'huur-cat': { const r = huurMachineCat(world, d.type, bd.thuis); return r.ok ? `${naam(d.type)} gehuurd: ${euro(r.prijs)} voor de eerste dag. Daarna elke speldag; te laat betalen en hij gaat terug.` : r.reden; }
    case 'verkoop': { const nm = m ? naam(m.type) : ''; const r = verkoopMachineCat(world, d.uid); return r.ok ? `${nm} verkocht voor ${euro(r.bedrag)}.` : r.reden; }
    case 'terug': { const nm = m ? naam(m.type) : ''; const r = verkoopMachineCat(world, d.uid); return r.ok ? `${nm} is teruggebracht.` : r.reden; }
    case 'onderhoud': { const r = onderhoudMachine(world, d.uid); return r.ok ? `Onderhoudsbeurt klaar voor ${euro(r.kosten)}: de slijtage is weg.` : r.reden; }
    case 'loon': {
      const r = loonwerk(world, d.taak);
      return r.ok ? `${M.LOONWERKER.naam}: ${B.TAKEN[d.taak].naam.toLowerCase()} gedaan (${Math.round(M.LOONWERKER.kwaliteit * 100)}%) voor ${euro(r.kosten)}.` : r.reden;
    }
    case 'loon-lever': { const r = loonwerkAfleveren(world); return r.ok ? `${nl(r.kg)} kg afgeleverd: +${euro(r.betaald)} (de loonwerker kreeg ${euro(r.fee)}).` : r.reden; }
    case 'leen': { const r = leenGeld(world, Number(d.bedrag)); return r.ok ? `Je leende ${euro(r.bedrag)} bij ${B.LENING.bank}.` : r.reden; }
    case 'los': { const r = losAf(world, Number(d.bedrag)); return r.ok ? `Je loste ${euro(r.bedrag)} af.` : r.reden; }
    default: return '';
  }
}

// #669: bij aankomst bovenaan het scherm de keuze van vandaag (gewas, contract, verwachte winst), zodat de speler
// eerst plant en kiest en niet eerst drie tabbladen hoeft te lezen. De lange uitleg blijft in de tabbladen/Hulp.
function dagKaart() {
  const k = dagKeuze(getBoerderij());
  if (!k) return '';
  const machine = k.machine ? ` Machine: ${esc(k.machine.naam)}${k.machine.eigen ? ' (van jou)' : ` (huur ${euro(k.machine.huur)}/dag)`}.` : '';
  return `<div class="bd-dag" style="margin:0 0 8px"><p class="lb-titel"><b>Vandaag</b> <span class="mut">speldag ${k.dag + 1}</span></p><p class="mut">${esc(dagKeuzeTekst(k).replace(/^Vandaag: /, ''))}${machine}</p></div>`; // de kop zegt al Vandaag (#1244)
}

// Het menuonderdeel sluit of een ander onderdeel opent: plaatjes terug, live voorbeeld weg (geen GL-context, geen geheugen vast).
export const ruimBoerderijPlaatjes = ruimPlaatjes;

export function renderBoerderijPanel(el, world, sluit = null) {
  if (!el) return;
  zetCss();
  const b = getBoerderij();
  gast = !!(world && world.coopRole === 'client');
  const geld = (world && world.money) || 0;
  wereld = world;
  if (!['velden', 'team', 'machines', 'erf', 'kas', 'perceel', 'percelen', 'gewas', 'bank'].includes(gekozen)) gekozen = 'velden';
  const actiefSeg = { perceel: 'velden', percelen: 'velden', gewas: 'velden', bank: 'kas' }[gekozen] || gekozen;
  const s = B.samenvatting(b);
  // de onderdelen als tabs in het paneel zelf (panelmodel, DESIGN_SYSTEM.md > Panels): Q en E wisselen, de tab zegt het aantal waar dat helpt
  const tel = { percelen: Object.keys(b.bedrijf.percelen).length, machines: b.bedrijf.machinepark.machines.length + b.bedrijf.machinepark.werktuigen.length };
  // #1243: de onderdelen zijn een segmentbalk (ds-z-tabs), niet een tweede onderstreepte tabrij onder die van Land en bedrijf. Q en E werken op role="tab".
  const tabs = ONDERDELEN.map(([id, naam]) => `<button type="button" role="radio" class="${actiefSeg === id ? 'sel' : ''}" data-bd="${id}" aria-checked="${actiefSeg === id}">${esc(naam)}</button>`).join('');
  // De sfeernaam staat al in de band; hier alleen de chip en het geld.
  let kader = ''; try { kader = frameHtml(frameView(world)); } catch (e) { /* het kader is een extra; de boerderij werkt ook zonder */ }
  el.innerHTML = kader + `<div class="bd-seg-rij"><nav class="ds-z-segment ds-z-segment--klein" role="radiogroup" aria-label="Boerderij">${tabs}</nav></div>` +
    dagKaart() +
    `<div class="m-main bd-main"><aside class="m-pane pa-pane bd-pane" aria-live="polite">${detail(b, geld)}</aside></div>`;
  fillBars(el, bars);
  vulPlaatjes(el);
  const liveVak = el.querySelector && el.querySelector('.bd-live');
  if (liveVak && liveVak.dataset) showLive(liveVak, liveVak.dataset.fpStart); else ruimLive();
  if (!el.dataset.bound) {
    el.dataset.bound = '1';
    const opnieuw = () => renderBoerderijPanel(el, world, sluit);
    el.addEventListener('click', (e) => {
      const o = e.target.closest('[data-bd]');
      const g = e.target.closest('[data-bd-gewas]');
      const k = e.target.closest('[data-bd-koop]');
      const w = e.target.closest('[data-bd-weg]');
      const naar = e.target.closest('[data-bd-naar]');
      const uitleg = e.target.closest('[data-bd-uitleg]');
      const pc = e.target.closest('[data-pc]');
      const mc = e.target.closest('[data-mc]');
      const vd = e.target.closest('[data-vd]');
      if (vd) { veldenActie(world, vd.dataset); opnieuw(); const nu = el.querySelector(`[data-vd="${vd.dataset.vd}"][data-id="${vd.dataset.id}"]`) || el.querySelector(`[data-vd="${vd.dataset.vd}"]`); if (nu && nu.focus) nu.focus({ preventScroll: true }); }
      else if (mc && !tweedeDrukStap(mc.dataset)) opnieuw();
      else if (mc) { melding = machineActie(mc.dataset, world); opnieuw(); const nu = el.querySelector(`[data-mc="${mc.dataset.mc}"]:not([disabled])`) || el.querySelector(`[data-bd="${gekozen}"]`); if (nu) nu.focus({ preventScroll: true }); }
      else if (pc && !tweedeDrukStap(pc.dataset)) opnieuw();
      else if (pc) { melding = percelenActie(pc.dataset, world); opnieuw(); const nu = el.querySelector(`[data-pc="${pc.dataset.pc}"][data-id="${pc.dataset.id}"]:not([disabled])`) || el.querySelector(`[data-pc][data-id="${pc.dataset.id}"]:not([disabled])`) || el.querySelector(`[data-bd="${gekozen}"]`); if (nu) nu.focus({ preventScroll: true }); }
      else if (uitleg) { zetUitlegGezien(); opnieuw(); }
      else if (naar) { const q = veldPlek(naar.dataset.bdNaar); setUserWaypoint(q.x, q.y, PC.perceelDef(naar.dataset.bdNaar).naam); if (world && world.addMessage) world.addMessage(naar.dataset.bdSluit ? "Op weg naar je veld. Het doel staat op je kaart." : "Het veld staat op je kaart.", 3); if (naar.dataset.bdSluit && typeof sluit === "function") sluit(); }
      else if (w) { const q = getBoerderij().perceel || (([x, y]) => ({ x, y }))(wgsToWorld(53.2336, 6.4977)); setUserWaypoint(q.x, q.y, 'Eigen akker'); if (world && world.addMessage) world.addMessage('De akker staat op je kaart.', 3); }
      else if (o) { gekozen = o.dataset.bd; melding = ''; opnieuw(); const nu = el.querySelector(`[data-bd="${gekozen}"]`); if (nu) nu.focus({ preventScroll: true }); }
      else if (g) { kiesGewas(g.dataset.bdGewas); opnieuw(); const nu = el.querySelector(`[data-bd-gewas="${g.dataset.bdGewas}"]`); if (nu) nu.focus({ preventScroll: true }); }
      else if (k && !tweedeDrukStap(k.dataset)) opnieuw();
      else if (k) {
        const r = koopMachine(world, k.dataset.bdKoop);
        melding = r.ok ? `${B.MACHINES[k.dataset.bdKoop].naam} gekocht voor ${euro(r.prijs)}.` : r.reden;
        opnieuw();
      }
    });
    el.addEventListener('focusin', (e) => {
      const rij = e.target.closest && e.target.closest('[data-fp-rij]');
      const vak = rij && el.querySelector('.bd-live');
      if (vak && rij.dataset.fpRij && vak.dataset.fpLive !== rij.dataset.fpRij) showLive(vak, rij.dataset.fpRij);
      const o = e.target.closest && e.target.closest('[data-bd]');
      if (!o || o.dataset.bd === gekozen) return;
      gekozen = o.dataset.bd; melding = '';
      for (const bt of el.querySelectorAll('[data-bd]')) { const aan = bt.dataset.bd === gekozen; bt.classList.toggle('sel', aan); bt.setAttribute('aria-selected', String(aan)); }
      el.querySelector('.bd-pane').innerHTML = detail(getBoerderij(), (world && world.money) || 0);
      queueMicrotask(() => fillBars(el, bars));
    });
  }
}
