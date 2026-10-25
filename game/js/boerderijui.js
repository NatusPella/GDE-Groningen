// Eigen boerderij (#415): het onderdeel Boerderij van het pauzemenu. Links vier onderdelen (Perceel, Gewas, Machines, Kasboek), rechts wat
// er te zien en te doen is: de stand van het land en de volgende taak, het gewas dat je bij het zaaien kiest, de machines die je huurt
// of koopt, en wat de boerderij tot nu toe opbracht. De gegevens komen uit boerderijlive.js (en boerderij.js); dit bestand is alleen DOM.
// Het werk zelf doe je op het land: de bijbaan "Eigen boerderij" bij Hoogkerk. Niet door een mens in beeld bekeken.
import * as B from './boerderij.js';
import { getBoerderij, kiesGewas, koopMachine, getBedrijf, koopPerceel, huurPerceel, zegOpPerceel, verkoopPerceel, betaalSchuldPerceel, zetThuis, zetActief, schuurNaarErf, erfNaarSchuur, koopMachineCat, huurMachineCat, verkoopMachineCat, onderhoudMachine, loonwerk, loonwerkAfleveren, leenGeld, losAf, contracten, neemContract } from './boerderijlive.js';
import * as CT from './boerderijcontracten.js';
import * as PC from './percelen.js';
import * as M from './machines.js';
import * as WT from './werktuigen.js';
import { fillBars } from './motion.js';
import { setUserWaypoint } from './routing.js';
import { wgsToWorld } from './rdnew.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const euro = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
const cent = (n) => `€${n.toFixed(2).replace('.', ',')}`;   // een prijs per kilo: twee decimalen met een komma
const nl = (n) => Math.round(n).toLocaleString('nl-NL');

const ICOON = {
  perceel: '<path d="M3 17l5-9h10l3 9zM8 8l-2 9M13 8l-1 9M18 8l1 9"/>',
  gewas: '<path d="M12 21v-8M12 13c0-3-2-5-5-5 0 3 2 5 5 5zM12 13c0-3 2-5 5-5 0 3-2 5-5 5zM12 8c0-2 1-4 3-5-1 2-1 4-3 5z"/>',
  machines: '<circle cx="7" cy="16" r="3.4"/><circle cx="18" cy="17.5" r="2"/><path d="M7 12.6V7h6l2 5h3v3.5M10 7V4h2"/>',
  percelen: '<path d="M3 6h8v6H3zM13 6h8v6h-8zM3 14h8v5H3zM13 14h8v5h-8z"/>',
  erf: '<path d="M4 20v-9l8-6 8 6v9zM9 20v-6h6v6"/>',
  kas: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M3 11h18M16 15h2"/>',
  bank: '<path d="M3 10l9-6 9 6zM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
};
const ONDERDELEN = [['perceel', 'Perceel'], ['percelen', 'Percelen'], ['erf', 'Erf'], ['gewas', 'Gewas'], ['machines', 'Machines'], ['kas', 'Kasboek'], ['bank', 'Bank']];
const icoon = (n, cls = 'pa-ico') => `<span class="${cls}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICOON[n]}</svg></span>`;

const CSS = `
.bd-pane .pa-ico svg { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.m-pane.bd-pane { gap: 12px; }
.bd-pane p { margin: 4px 0; }
.bd-voort { display: flex; align-items: center; gap: 14px; margin: 4px 0; }
.bd-voort .m-bar { flex: 1; max-width: 360px; height: 6px; }
.bd-rij { display: flex; align-items: center; gap: 16px; padding: 10px 0; border-bottom: 1px solid rgba(240,237,228,0.08); max-width: 720px; }
.bd-rij .bd-naam { flex: 1; }
.bd-rij .mut { font-size: 16px; }
.bd-keus.aan { box-shadow: inset 0 0 0 2px var(--g, #3fc97a); }
.bd-kas { display: grid; grid-template-columns: auto auto; gap: 6px 36px; justify-content: start; margin: 4px 0; }
.bd-kas span:nth-child(odd) { opacity: 0.7; }
.bd-pc { flex-wrap: wrap; max-width: 960px; }
.bd-acties { display: flex; flex-wrap: wrap; gap: 8px; }
.bd-melding { min-height: 1.4em; color: var(--g, #3fc97a); }
`;
let cssAan = false;
function zetCss() {
  if (cssAan || typeof document === 'undefined') return;
  cssAan = true;
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
}

let gekozen = 'perceel';
let gast = false; // samen spelen: de klussen op het land (de trekker) doe je in je eigen spel (#429)
let melding = '';
const bars = new Map();

const FASE_TEKST = {
  braak: 'Braak land: tijd om te ploegen.', geploegd: 'Geploegd: tijd om te zaaien.', groeit: 'Het gewas groeit.', rijp: 'Rijp: tijd om te oogsten.',
};
// De markt (gewasmarkt.js): de prijs van vandaag en of hij stijgt, daalt of gelijk blijft ten opzichte van gisteren.
const TREND_TEKST = { op: 'prijs stijgt', neer: 'prijs daalt', gelijk: 'prijs gelijk' };

function perceel(b, geld) {
  const f = B.fase(b), s = B.samenvatting(b);
  const g = B.GEWASSEN[b.veld.gewas];
  const volgende = s.volgende ? B.TAKEN[s.volgende].naam : null;
  const k = s.volgende ? B.kosten(b, s.volgende) : null;
  const wacht = B.wacht(b);
  const waar = b.perceel ? 'Je akker ligt bij Hoogkerk, in de buurt van Suikerhal Hoogkerk.' : 'Je akker wordt gekozen als je voor het eerst gaat werken.';
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('perceel', 'pa-ico big')}Perceel</h2></div>` +
    `<div><p class="lb-titel"><b>${esc(FASE_TEKST[f] || '')}</b></p>` +
    (g ? `<p class="mut">${esc(g.naam)}${f === 'groeit' ? ` · nog ${nl(s.urenTotRijp)} speluren` : ''}</p>` : '') +
    (f === 'groeit' || f === 'rijp' ? `<div class="bd-voort"><span class="m-bar${s.groei > 0 ? ' on' : ''}"><i data-bar="bd-groei" data-w="${(s.groei * 100).toFixed(1)}"></i></span><span class="m-num">${Math.round(s.groei * 100)}%</span></div>` : '') + '</div>' +
    `<div><p>${volgende ? `Volgende klus: <b>${esc(volgende)}</b>${k && k.totaal ? ` (kost ${euro(k.totaal)})` : ''}.` : wacht ? 'Nu is er niets te doen: het gewas groeit.' : 'Nu is er niets te doen.'}</p>` +
    (s.schuurKg ? `<p>In de schuur: ${nl(s.schuurKg)} kg ${esc(B.GEWASSEN[s.schuurGewas].naam.toLowerCase())}, klaar om af te leveren.</p>` : '') +
    `<p class="mut">${waar}</p></div>` +
    (gast ? `<p class="mut">Je speelt mee in het spel van een ander. De klussen op het land (de trekker) doe je in je eigen spel; je gewas groeit ondertussen gewoon door, en je kunt gewassen kiezen en machines kopen.</p><p><button type="button" class="m-bt" data-bd-weg="1">Zet de akker op je kaart</button></p>`
      : `<p class="mut">Werk zelf op het land met je eigen trekker en werktuigen (koop of huur ze onder Machines), of start de bijbaan Eigen boerderij bij Hoogkerk (zie de kaart) voor loonwerk met een gehuurde machine. Het gewas groeit in speltijd, ook als je iets anders doet.</p>`) +
    veldenBlok(b) + loonwerkBlok(b, geld, gast);
}

// Alle percelen van jou met hun stand, en wat de loonwerker nu voor je kan doen op het actieve perceel (tegen betaling, met jouw materiaal).
const FASE_KORT = { braak: 'braak', geploegd: 'geploegd', groeit: 'groeit', rijp: 'rijp' };
function veldenBlok(b) {
  const rijen = B.veldenOverzicht(b).map((v) => {
    const d = PC.perceelDef(v.id), actief = v.id === b.bedrijf.actief;
    const g = B.GEWASSEN[v.gewas];
    const bk = b.boek.velden[v.id];
    return `<div class="bd-rij"><span class="bd-naam"><b>${esc(d.naam)}</b>${actief ? ' · werkt hier' : ''}<span class="mut"> · ${esc(FASE_KORT[v.fase] || v.fase)}${g ? ` · ${esc(g.naam.toLowerCase())}${v.fase === 'groeit' ? ` ${Math.round(v.groei * 100)}%` : ''}` : ''}${B.uitputting(b, v.id) > 0.01 ? ` · grond ${Math.round((1 - B.uitputting(b, v.id)) * 100)}%` : ''}${bk ? ` · ${nl(bk.kg)} kg geoogst` : ''}</span></span></div>`;
  }).join('');
  return `<div><p class="lb-titel"><b>Je percelen</b></p>${rijen}</div>`;
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
  return `<div><p class="lb-titel"><b>Loonwerker</b></p><p class="mut">${esc(M.LOONWERKER.naam)} doet een klus op ${esc(PC.actiefPerceel(b.bedrijf).naam)} voor je, met zijn eigen trekker. Hij werkt netjes (${Math.round(M.LOONWERKER.kwaliteit * 100)}%); het zaaigoed en de mest betaal jij.</p>${gastLever}` +
    (knoppen.length ? `<div class="bd-acties">${knoppen.join(' ')}</div>` : '<p class="mut">Nu valt er niets uit te besteden.</p>') + `<p class="bd-melding" aria-live="polite">${esc(melding)}</p></div>`;
}

function gewas(b) {
  const s = B.samenvatting(b);
  const rijen = B.GEWAS_IDS.map((id) => {
    const g = B.GEWASSEN[id];
    const m = s.prijzen[id] || { prijs: g.prijsKg, trend: 'gelijk' };
    return `<div class="bd-rij"><span class="bd-naam"><b>${esc(g.naam)}</b><span class="mut"> · ${cent(m.prijs)} per kg vandaag, ${esc(TREND_TEKST[m.trend] || TREND_TEKST.gelijk)} · zaaigoed ${euro(g.zaaigoed)} · rijp na ${g.groeiUren} speluren · ${nl(g.kgBasis)} kg per perceel · ${esc(g.afnemer)} · ${g.soort === 'weiland' ? 'alleen op weiland' : 'op akkers'}</span></span>` +
      `<button type="button" class="m-bt bd-keus${b.keuze === id ? ' aan' : ''}" data-bd-gewas="${id}" aria-pressed="${b.keuze === id}">${b.keuze === id ? 'Gekozen' : 'Kies'}</button></div>`;
  }).join('');
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('gewas', 'pa-ico big')}Gewas</h2></div>` +
    `<p class="mut">Het gewas dat je bij het volgende zaaien in de grond doet. Wat er al groeit blijft zoals het is. Op een weiland teel je gras, op een akker de akkerbouwgewassen. De prijs per kilo kan per speldag veranderen, hooguit twintig procent boven of onder de basisprijs; je verkoopt tegen de prijs van de dag dat je aflevert.</p>${rijen}` +
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
  const actief = k.actief.map((c) => {
    const over = CT.resterend(c, k.uren);
    return `<div class="bd-rij"><span class="bd-naam"><b>${esc(B.GEWASSEN[c.gewas].naam)}</b><span class="mut"> · ${nl(c.geleverd)} van ${nl(c.kg)} kg · nog ${over} speluren · bonus ${euro(c.bonus)}</span></span></div>`;
  }).join('') || '<p class="mut">Je hebt nog geen contract aangenomen.</p>';
  return `<div><p class="lb-titel"><b>Contracten</b> <span class="mut">· speldag ${k.dag + 1}</span></p>` +
    '<p class="mut">De afnemers vragen deze speldag om een vracht van een gewas. De kilo\'s tellen mee als je dat gewas aflevert; een vol contract betaalt de bonus bovenop de dagprijs. De tijd loopt in speluren, en een contract dat verloopt kost je niets.</p>' +
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
    const wat = isM ? `diesel ${pct(M.brandstofPct(m))} · ${staat}` : staat;
    const erfNaam = PC.erfDef(m.erf).naam;
    const bezit = m.bezit === 'gehuurd' ? `gehuurd, ${euro(c.huurDag)} per dag${m.achterstand ? ' · <b>achterstand</b>' : ''}` : 'van jou';
    const ob = M.onderhoudKosten(m);
    const knoppen = [
      ob > 0 ? knop('onderhoud', `Onderhoudsbeurt ${euro(ob)}`, { uid: m.uid }, geld < ob) : '',
      m.bezit === 'gehuurd' ? knop('terug', 'Breng terug', { uid: m.uid }) : knop('verkoop', `Verkoop ${euro(M.verkoopWaarde(m))}`, { uid: m.uid }),
    ].filter(Boolean).join(' ');
    return `<div class="bd-rij bd-pc"><span class="bd-naam"><b>${esc(c.naam)}</b><span class="mut"> · ${esc(wat)} · ${bezit} · op ${esc(erfNaam)}</span></span><span class="bd-acties">${knoppen}</span></div>`;
  }).join('') || '<p class="mut">Je hebt nog geen machines of werktuigen. Koop of huur ze hieronder: ze staan op je thuis.</p>';
  const vrij = PC.vrijePlekken(bd, bd.thuis);
  const cat = (ids) => ids.map((id) => {
    const c = PC.MACHINE_CATALOGUS[id];
    const extra = c.soort === 'machine' ? `${c.pk} pk · tank ${M.SPEC[id].tank} liter` : (WT.WERKTUIG[c.type].taak ? `voor ${B.TAKEN[WT.WERKTUIG[c.type].taak].naam.toLowerCase()}` : 'vervoert de oogst');
    const k = knop('koop-cat', `Koop ${euro(c.koop)}`, { type: id }, geld < c.koop || vrij <= 0), h = knop('huur-cat', `Huur ${euro(c.huurDag)} per dag`, { type: id }, geld < c.huurDag || vrij <= 0);
    return `<div class="bd-rij bd-pc"><span class="bd-naam"><b>${esc(c.naam)}</b><span class="mut"> · ${esc(extra)}</span></span><span class="bd-acties">${k} ${h}</span></div>`;
  }).join('');
  const ploegen = B.MACHINE_IDS.map((id) => {
    const m = B.MACHINES[id];
    const e = b.machines[id] === 'eigen';
    const taken = m.taken.map((t) => B.TAKEN[t].naam.toLowerCase()).join(' en ');
    return `<div class="bd-rij"><span class="bd-naam"><b>${esc(m.naam)}</b><span class="mut"> · ${esc(taken)} · ${e ? 'van jou: geen huur en een ruimere rij' : `gehuurd, ${euro(m.huur)} per keer`}</span></span>` +
      (e ? '<span class="g">Van jou</span>' : `<button type="button" class="m-bt" data-bd-koop="${id}"${geld >= m.koop ? '' : ' disabled'}>Koop ${euro(m.koop)}</button>`) + '</div>';
  }).join('');
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('machines', 'pa-ico big')}Machines</h2></div>` +
    `<p class="mut">Je machines en werktuigen staan op je thuis, ${esc(thuis.naam)} (nog ${vrij} plekken vrij). In de wereld stap je in een trekker met E; E koppelt een werktuig dat vlakbij staat, G zet de aftakas aan of uit, T hef omhoog of omlaag, X koppelt los en R tankt diesel bij het dieselvat van je erf of een pomp. Slijt een machine, dan rijdt hij trager en gebruikt hij meer diesel: een onderhoudsbeurt helpt.</p>` +
    `<p class="lb-titel"><b>Je machinepark</b></p>${rijen}` +
    `<p class="lb-titel"><b>Machines</b></p>${cat(PC_MACHINES())}<p class="lb-titel"><b>Werktuigen</b></p>${cat(PC_WERKTUIGEN())}` +
    `<p class="lb-titel"><b>Voor het loonwerk van de bijbaan</b></p><p class="mut">De bijbaan Eigen boerderij huurt een machine per klus; koop je hem, dan werk je zonder huur en met meer ruimte in de rij.</p>${ploegen}` +
    `<p class="bd-melding" aria-live="polite">${esc(melding)}</p>`;
}
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
    return `<div class="bd-rij bd-pc"><span class="bd-naam"><b>${esc(d.naam)}</b><span class="mut"> · ${d.soort === 'akker' ? 'akker' : 'weiland'} · ${String(d.ha).replace('.', ',')} ha · bodem ${PC.bodemNaam(d.bodem)} · ${esc(d.plaats)} · ${esc(wat)}</span></span><span class="bd-acties">${acties(s, 'perceel', d.id, geld)}</span></div>`;
  }).join('');
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('percelen', 'pa-ico big')}Percelen</h2></div>` + bedrijfRegel(bd) +
    `<p class="mut">Koop of huur akkers en weilanden bij Hoogkerk, Zuidhorn en Winsum. Betaal je de huur te laat (twee periodes mis), dan gaat het perceel terug naar de verhuurder. Goede bodem geeft meer oogst. De bijbaan werkt op het perceel waar je Werk hier koos. Bieten rooien hoort bij je eigen boerderij: zodra je akker vastligt, valt het losse loonwerk (bietenoogst) weg en oogst je je bieten hier.</p>${rijen}<p class="bd-melding" aria-live="polite">${esc(melding)}</p>`;
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
    const extra = jou ? `<br><span class="mut">Opslag ${nl(PC.opslagGebruikt(bd, d.id))} van ${nl(d.opslagKg)} kg${opslag ? ': ' + opslag : ''} · machineplekken ${machs} van ${d.machinePlekken}</span>` : '';
    const opslagKnoppen = jou ? ' ' + (bd.thuis === d.id && b.schuur.kg > 0 ? `<button type="button" class="m-bt" data-pc="inschuur">Oogst uit de schuur opslaan</button>` : '') + Object.keys(bd.opslag[d.id] || {}).filter((g) => B.GEWASSEN[g]).map((g) => `<button type="button" class="m-bt" data-pc="uitschuur" data-id="${d.id}" data-gewas="${g}">${esc(B.GEWASSEN[g].naam)} naar de schuur</button>`).join(' ') : '';
    return `<div class="bd-rij bd-pc"><span class="bd-naam"><b>${esc(d.naam)}</b><span class="mut"> · ${esc(gebouwen)}, ${d.machinePlekken} plekken voor machines · ${esc(d.plaats)} · ${esc(wat)}</span>${extra}</span><span class="bd-acties">${acties(s, 'erf', d.id, geld)}${opslagKnoppen}</span></div>`;
  }).join('');
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('erf', 'pa-ico big')}Erf</h2></div>` + bedrijfRegel(bd) +
    `<p class="mut">Een erf heeft een huis, een schuur, soms silo's en plekken voor machines. Je thuis is ${esc(PC.erfDef(bd.thuis).naam)}. De Zonnehoek blijft altijd van jou; de oogst uit de werkschuur kun je op je thuis bewaren.</p>${rijen}<p class="bd-melding" aria-live="polite">${esc(melding)}</p>`;
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
    '<p class="mut">Uitgaven zijn huur, zaaigoed, mest, machines, diesel en onderhoud. De opbrengst komt als je de oogst aflevert, met de loonfactor van je loopbaan in Landbouw.</p>' +
    `<p class="lb-titel"><b>Per veld</b> <span class="mut">omzet · kosten · resultaat · geoogst</span></p>${velden ? `<div class="bd-kas">${velden}</div>` : '<p class="mut">Nog geen oogst of kosten per veld.</p>'}` +
    `<p class="lb-titel"><b>Per boekjaar</b> <span class="mut">een boekjaar is honderd speldagen; aankopen staan erbij als kasstroom</span></p>${jaren || '<p class="mut">Nog niets geboekt.</p>'}`;
}

// De bank (verzonnen): een kleine lening met een lage rente per speldag.
function bank(b, geld) {
  const l = b.boek.lening;
  const ruimte = B.leenRuimte(b);
  const stap = [1000, 5000, 10000];
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('bank', 'pa-ico big')}Bank</h2></div>` +
    `<p class="mut">${esc(B.LENING.bank)} leent je tot ${euro(B.LENING.max)}. De rente is ${(B.LENING.renteDag * 100).toFixed(2).replace('.', ',')}% per speldag en komt bij je schuld: je betaalt niets uit je zak tot je aflost, en niemand neemt iets af. Een lening is een keuze, geen noodzaak.</p>` +
    `<div class="bd-kas"><span>Schuld</span><span>${euro(l.schuld)}</span><span>Nog te lenen</span><span>${euro(ruimte)}</span><span>Opgenomen tot nu toe</span><span>${euro(l.opgenomen)}</span><span>Afgelost</span><span>${euro(l.afgelost)}</span><span>Rente betaald</span><span>${euro(l.rente)}</span></div>` +
    `<p class="lb-titel"><b>Lenen</b></p><div class="bd-acties">${stap.map((x) => knop('leen', `Leen ${euro(x)}`, { bedrag: x }, x > ruimte)).join(' ')}</div>` +
    `<p class="lb-titel"><b>Aflossen</b></p><div class="bd-acties">${stap.map((x) => knop('los', `Los ${euro(x)} af`, { bedrag: x }, l.schuld <= 0 || geld < Math.min(x, l.schuld))).join(' ')}${l.schuld > 0 ? knop('los', `Los alles af (${euro(l.schuld)})`, { bedrag: l.schuld }, geld < l.schuld) : ''}</div>` +
    `<p class="bd-melding" aria-live="polite">${esc(melding)}</p>`;
}

function detail(b, geld) {
  return gekozen === 'percelen' ? percelen(b, geld) : gekozen === 'erf' ? erf(b, geld) : gekozen === 'gewas' ? gewas(b) : gekozen === 'machines' ? machines(b, geld) : gekozen === 'kas' ? kas(b) : gekozen === 'bank' ? bank(b, geld) : perceel(b, geld);
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

export function renderBoerderijPanel(el, world) {
  if (!el) return;
  zetCss();
  const b = getBoerderij();
  gast = !!(world && world.coopRole === 'client');
  const geld = (world && world.money) || 0;
  const s = B.samenvatting(b);
  const rijen = ONDERDELEN.map(([id, naam]) => {
    const sub = id === 'perceel' ? (s.volgende ? B.TAKEN[s.volgende].naam : B.fase(b) === 'groeit' ? 'Groeit' : '-') : id === 'percelen' ? `${Object.keys(b.bedrijf.percelen).length} van jou` : id === 'erf' ? PC.erfDef(b.bedrijf.thuis).naam : id === 'gewas' ? B.GEWASSEN[b.keuze].naam : id === 'machines' ? `${b.bedrijf.machinepark.machines.length} machines, ${b.bedrijf.machinepark.werktuigen.length} werktuigen` : id === 'bank' ? (b.boek.lening.schuld > 0 ? `schuld ${euro(b.boek.lening.schuld)}` : 'geen schuld') : euro(s.winst);
    return `<button type="button" class="m-li lb-li${gekozen === id ? ' sel' : ''}" data-bd="${id}"${gekozen === id ? ' aria-current="true"' : ''}>${icoon(id)}<span class="nm"><span class="one">${esc(naam)}</span><span class="mut one">${esc(sub)}</span></span></button>`;
  }).join('');
  el.innerHTML = `<div class="m-tabs"><span class="m-grow"></span><span class="pa-total"><span class="mut">Je geld</span><span class="m-num">${euro(geld)}</span></span></div>` +
    `<div class="m-main"><div class="m-list pa-list lb-list">${rijen}</div><aside class="m-pane pa-pane bd-pane" aria-live="polite">${detail(b, geld)}</aside></div>`;
  fillBars(el, bars);
  if (!el.dataset.bound) {
    el.dataset.bound = '1';
    const opnieuw = () => renderBoerderijPanel(el, world);
    el.addEventListener('click', (e) => {
      const o = e.target.closest('[data-bd]');
      const g = e.target.closest('[data-bd-gewas]');
      const k = e.target.closest('[data-bd-koop]');
      const w = e.target.closest('[data-bd-weg]');
      const pc = e.target.closest('[data-pc]');
      const mc = e.target.closest('[data-mc]');
      if (mc) { melding = machineActie(mc.dataset, world); opnieuw(); const nu = el.querySelector(`[data-mc="${mc.dataset.mc}"]:not([disabled])`) || el.querySelector(`[data-bd="${gekozen}"]`); if (nu) nu.focus({ preventScroll: true }); }
      else if (pc) { melding = percelenActie(pc.dataset, world); opnieuw(); const nu = el.querySelector(`[data-pc="${pc.dataset.pc}"][data-id="${pc.dataset.id}"]:not([disabled])`) || el.querySelector(`[data-pc][data-id="${pc.dataset.id}"]:not([disabled])`) || el.querySelector(`[data-bd="${gekozen}"]`); if (nu) nu.focus({ preventScroll: true }); }
      else if (w) { const q = getBoerderij().perceel || (([x, y]) => ({ x, y }))(wgsToWorld(53.2336, 6.4977)); setUserWaypoint(q.x, q.y, 'Eigen akker'); if (world && world.addMessage) world.addMessage('De akker staat op je kaart.', 3); }
      else if (o) { gekozen = o.dataset.bd; melding = ''; opnieuw(); const nu = el.querySelector(`[data-bd="${gekozen}"]`); if (nu) nu.focus({ preventScroll: true }); }
      else if (g) { kiesGewas(g.dataset.bdGewas); opnieuw(); const nu = el.querySelector(`[data-bd-gewas="${g.dataset.bdGewas}"]`); if (nu) nu.focus({ preventScroll: true }); }
      else if (k) {
        const r = koopMachine(world, k.dataset.bdKoop);
        melding = r.ok ? `${B.MACHINES[k.dataset.bdKoop].naam} gekocht voor ${euro(r.prijs)}.` : r.reden;
        opnieuw();
      }
    });
    el.addEventListener('focusin', (e) => {
      const o = e.target.closest && e.target.closest('[data-bd]');
      if (!o || o.dataset.bd === gekozen) return;
      gekozen = o.dataset.bd; melding = '';
      for (const bt of el.querySelectorAll('[data-bd]')) { const aan = bt.dataset.bd === gekozen; bt.classList.toggle('sel', aan); bt.toggleAttribute('aria-current', aan); }
      el.querySelector('.bd-pane').innerHTML = detail(getBoerderij(), (world && world.money) || 0);
      queueMicrotask(() => fillBars(el, bars));
    });
  }
}
