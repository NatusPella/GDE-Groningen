// Eigen boerderij (#415): het onderdeel Boerderij van het pauzemenu. Links vier onderdelen (Perceel, Gewas, Machines, Kasboek), rechts wat
// er te zien en te doen is: de stand van het land en de volgende taak, het gewas dat je bij het zaaien kiest, de machines die je huurt
// of koopt, en wat de boerderij tot nu toe opbracht. De gegevens komen uit boerderijlive.js (en boerderij.js); dit bestand is alleen DOM.
// Het werk zelf doe je op het land: de bijbaan "Eigen boerderij" bij Hoogkerk. Niet door een mens in beeld bekeken.
import * as B from './boerderij.js';
import { getBoerderij, kiesGewas, koopMachine, getBedrijf, koopPerceel, huurPerceel, zegOpPerceel, verkoopPerceel, betaalSchuldPerceel, zetThuis, zetActief, schuurNaarErf, erfNaarSchuur } from './boerderijlive.js';
import * as PC from './percelen.js';
import { fillBars } from './motion.js';
import { setUserWaypoint } from './routing.js';
import { wgsToWorld } from './rdnew.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const euro = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
const nl = (n) => Math.round(n).toLocaleString('nl-NL');

const ICOON = {
  perceel: '<path d="M3 17l5-9h10l3 9zM8 8l-2 9M13 8l-1 9M18 8l1 9"/>',
  gewas: '<path d="M12 21v-8M12 13c0-3-2-5-5-5 0 3 2 5 5 5zM12 13c0-3 2-5 5-5 0 3-2 5-5 5zM12 8c0-2 1-4 3-5-1 2-1 4-3 5z"/>',
  machines: '<circle cx="7" cy="16" r="3.4"/><circle cx="18" cy="17.5" r="2"/><path d="M7 12.6V7h6l2 5h3v3.5M10 7V4h2"/>',
  percelen: '<path d="M3 6h8v6H3zM13 6h8v6h-8zM3 14h8v5H3zM13 14h8v5h-8z"/>',
  erf: '<path d="M4 20v-9l8-6 8 6v9zM9 20v-6h6v6"/>',
  kas: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M3 11h18M16 15h2"/>',
};
const ONDERDELEN = [['perceel', 'Perceel'], ['percelen', 'Percelen'], ['erf', 'Erf'], ['gewas', 'Gewas'], ['machines', 'Machines'], ['kas', 'Kasboek']];
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

function perceel(b) {
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
      : `<p class="mut">Werk doe je op het land: start de bijbaan Eigen boerderij bij Hoogkerk (zie de kaart). Het gewas groeit in speltijd, ook als je iets anders doet.</p>`);
}

function gewas(b) {
  const rijen = B.GEWAS_IDS.map((id) => {
    const g = B.GEWASSEN[id];
    return `<div class="bd-rij"><span class="bd-naam"><b>${esc(g.naam)}</b><span class="mut"> · zaaigoed ${euro(g.zaaigoed)} · rijp na ${g.groeiUren} speluren · ${nl(g.kgBasis)} kg per perceel · ${esc(g.afnemer)}</span></span>` +
      `<button type="button" class="m-bt bd-keus${b.keuze === id ? ' aan' : ''}" data-bd-gewas="${id}" aria-pressed="${b.keuze === id}">${b.keuze === id ? 'Gekozen' : 'Kies'}</button></div>`;
  }).join('');
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('gewas', 'pa-ico big')}Gewas</h2></div>` +
    `<p class="mut">Het gewas dat je bij het volgende zaaien in de grond doet. Wat er al groeit blijft zoals het is.</p>${rijen}`;
}

function machines(b, geld) {
  const rijen = B.MACHINE_IDS.map((id) => {
    const m = B.MACHINES[id];
    const eigen = b.machines[id] === 'eigen';
    const taken = m.taken.map((t) => B.TAKEN[t].naam.toLowerCase()).join(' en ');
    return `<div class="bd-rij"><span class="bd-naam"><b>${esc(m.naam)}</b><span class="mut"> · ${esc(taken)} · ${eigen ? 'van jou: geen huur en een ruimere rij' : `gehuurd, ${euro(m.huur)} per keer`}</span></span>` +
      (eigen ? '<span class="g">Van jou</span>' : `<button type="button" class="m-bt" data-bd-koop="${id}"${geld >= m.koop ? '' : ' disabled'}>Koop ${euro(m.koop)}</button>`) + '</div>';
  }).join('');
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('machines', 'pa-ico big')}Machines</h2></div>` +
    `<p class="mut">De trekker is van de boerderij. Een machine huur je automatisch per klus; koop je hem, dan werk je zonder huur en met meer ruimte in de rij.</p>${rijen}<p class="bd-melding" aria-live="polite">${esc(melding)}</p>`;
}

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
    `<p class="mut">Koop of huur akkers en weilanden bij Hoogkerk, Zuidhorn en Winsum. Betaal je de huur te laat (twee periodes mis), dan gaat het perceel terug naar de verhuurder. Goede bodem geeft meer oogst. De bijbaan werkt op het perceel waar je Werk hier koos; de bietenoogst en andere bijbanen blijven loonwerk voor anderen.</p>${rijen}<p class="bd-melding" aria-live="polite">${esc(melding)}</p>`;
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

function kas(b) {
  const s = B.samenvatting(b);
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('kas', 'pa-ico big')}Kasboek</h2></div>` +
    `<div class="bd-kas"><span>Omzet</span><span>${euro(s.omzet)}</span><span>Uitgaven</span><span>${euro(s.uitgaven)}</span><span>Winst</span><span class="${s.winst >= 0 ? 'g' : ''}">${euro(s.winst)}</span>` +
    `<span>Oogsten</span><span>${nl(s.oogsten)}</span><span>Leveringen</span><span>${nl(s.leveringen)}</span></div>` +
    '<p class="mut">Uitgaven zijn huur, zaaigoed, mest en machines. De opbrengst komt als je de oogst aflevert, met de loonfactor van je loopbaan in Landbouw.</p>';
}

function detail(b, geld) {
  return gekozen === 'percelen' ? percelen(b, geld) : gekozen === 'erf' ? erf(b, geld) : gekozen === 'gewas' ? gewas(b) : gekozen === 'machines' ? machines(b, geld) : gekozen === 'kas' ? kas(b) : perceel(b);
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

export function renderBoerderijPanel(el, world) {
  if (!el) return;
  zetCss();
  const b = getBoerderij();
  gast = !!(world && world.coopRole === 'client');
  const geld = (world && world.money) || 0;
  const s = B.samenvatting(b);
  const rijen = ONDERDELEN.map(([id, naam]) => {
    const sub = id === 'perceel' ? (s.volgende ? B.TAKEN[s.volgende].naam : B.fase(b) === 'groeit' ? 'Groeit' : '-') : id === 'percelen' ? `${Object.keys(b.bedrijf.percelen).length} van jou` : id === 'erf' ? PC.erfDef(b.bedrijf.thuis).naam : id === 'gewas' ? B.GEWASSEN[b.keuze].naam : id === 'machines' ? `${s.eigen.length} van ${B.MACHINE_IDS.length} van jou` : euro(s.winst);
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
      if (pc) { melding = percelenActie(pc.dataset, world); opnieuw(); const nu = el.querySelector(`[data-pc="${pc.dataset.pc}"][data-id="${pc.dataset.id}"]:not([disabled])`) || el.querySelector(`[data-pc][data-id="${pc.dataset.id}"]:not([disabled])`) || el.querySelector(`[data-bd="${gekozen}"]`); if (nu) nu.focus({ preventScroll: true }); }
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
