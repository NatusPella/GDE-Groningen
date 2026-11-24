// De veldkaarten van het boerderijpaneel (#985): wat nu, de lus (ploegen, zaaien, groeien, oogsten, afleveren), elk veld als kaart met status, voortgang en
// volgende klus, de legenda van de kaartstatussen en de eerste-keer-uitleg. Dun: dit bestand maakt alleen markup (ds-z-kaart, ds-z-chip, ds-z-balk, ds-z-knop uit
// ds-components.css; de indeling staat in farm.css) uit het model van farmstatus.js. Klikken en toetsen regelt boerderijui.js (data-bd-naar,
// data-bd-uitleg). Geen eigen kleuren: de stand zit in data-status, de betekenis in woorden en een icoon (kleur is nooit de enige betekenis).
import * as B from './boerderij.js';
import { icoon } from './icons.js';
import { uitlegBlok } from './uitleg.js';
import { overzicht } from './farmmodel.js';
import { fpHtml, leegHtml, getalHtml, animalKey } from './farmpicshtml.js';
import { STATUS, STATUS_IDS, KAART_STIJL, LUS, veldenStatus, lusKlaar, watNu } from './farmstatus.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nl = (n) => Math.round(n).toLocaleString('nl-NL');
const svg = (pad, cls = 'ds-icoon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pad}</svg>`;
const chip = (statusId, tekst) => `<span class="ds-z-chip bd-chip" data-status="${statusId}">${icoon(STATUS[statusId].icoon, { cls: 'ds-z-chip__icoon' })}${esc(tekst || STATUS[statusId].naam)}</span>`;

// De sleutel voor de eerste-keer-uitleg: een keer weggeklikt blijft weg (alleen dit apparaat, geen savegame).
export const UITLEG_SLEUTEL = 'gde-boerderij-uitleg-v1';
export function uitlegGezien() { try { return typeof localStorage !== 'undefined' && localStorage.getItem(UITLEG_SLEUTEL) === '1'; } catch (e) { return false; } }
export function zetUitlegGezien() { try { localStorage.setItem(UITLEG_SLEUTEL, '1'); } catch (e) { /* geen opslag is geen ramp */ } }

// De lus in chips: gedaan, nu en straks. De chip van de huidige stap is de enige met nadruk.
export function lusHtml(s, schuurKg = 0) {
  const klaar = lusKlaar(s, schuurKg);
  const nu = Math.min(klaar, LUS.length - 1);
  return `<ol class="bd-lus" aria-label="De stappen van een teelt">` + LUS.map((l, i) => {
    const stand = i < klaar ? 'klaar' : i === nu ? 'nu' : 'straks';
    const teken = stand === 'klaar' ? '<path d="M5 12l4 4 10-10"/>' : `<text x="12" y="17" text-anchor="middle" font-size="14" fill="currentColor" stroke="none">${i + 1}</text>`;
    return `<li data-stand="${stand}"${stand === 'nu' ? ' aria-current="step"' : ''}><span class="ds-z-chip">${svg(teken, 'ds-z-chip__icoon')}${esc(l.label)}</span></li>`;
  }).join('') + '</ol>';
}

// De groeibalk van een veld dat groeit (leeg als er niets groeit).
// Eén veld als kaart: naam, status, gewas, voortgang, wat nu en een knop naar de kaart (secundair: de gele hoofdknop is van het scherm).
export function groeiHtml(s) {
  const groeit = s.stadium >= 0;
  return groeit ? `<div class="ds-z-balk ds-z-balk--rij" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(s.groei * 100)}" aria-label="Groei van ${esc(s.naam)}"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul" style="--ds-z-w:${(s.groei * 100).toFixed(1)}%"></span></span><span class="ds-z-balk__label">${Math.round(s.groei * 100)}%</span></div>` : '';
}

export const euroTekst = (n) => '€' + Math.round(n).toLocaleString('nl-NL');

// Eén veld als kaart (farmmodel.js, #1013): naam en stand met icoon, gewas en oppervlakte, de groeibalk, de volgende stap, wat het
// naar verwachting oplevert en twee knoppen: Naar veld (zet de route en sluit het menu) en Markeer op kaart (zet het doel en toont de kaart).
// Beide zijn secundair: de ene gele hoofdknop is van het scherm. Kleur is nooit de enige betekenis: de stand heeft icoon en woord.
export function veldKaartHtml(k) {
  const voortgang = k.groeit ? groeiHtml({ naam: k.naam, stadium: 0, groei: k.groei }) : '';
  const gewas = k.gewasNaam ? esc(k.gewasNaam) : k.planNaam ? esc(k.planNaam) : 'geen gewas';
  const v = k.verwachting;
  const verwacht = v && v.kg > 0 ? `<li>${getalHtml('oogst', `${nl(v.kg)} kg`, 'verwacht')}${getalHtml('geld', euroTekst(v.euro), 'ca.')}</li>` : '';
  const fp = k.gewasId ? fpHtml(`gewas:${k.gewasId}`, k.gewasNaam || k.planNaam || '', 's') : ''; // klein in de kop: de naam van het veld heeft de ruimte nodig (#1243)
  return `<article class="ds-z-kaart ds-z-kaart--recht bd-veld" data-status="${k.statusId}" data-stand="${k.stand}" data-veld="${esc(k.id)}">` +
    `<header class="ds-z-kaart__kop">${fp}<h3 class="ds-z-kaart__titel">${esc(k.naam)}</h3>${chip(k.statusId, k.standNaam)}</header>` +
    `<p class="ds-z-kaart__tekst">${gewas} · ${esc(String(k.ha).replace('.', ','))} ha${k.actief ? ' · werkt hier' : ''}</p>` +
    voortgang +
    `<ul class="bd-veld__feiten"><li><span class="ds-t-hulp">Volgende stap</span><b>${esc(k.volgende)}</b></li>${verwacht}</ul>` +
    `<footer class="ds-z-kaart__voet"><button type="button" class="ds-z-knop ds-z-knop--secundair" data-bd-naar="${esc(k.id)}" data-bd-sluit="1" aria-label="Naar veld ${esc(k.naam)}">Naar veld</button>` +
    `<button type="button" class="ds-z-knop ds-z-knop--secundair" data-bd-naar="${esc(k.id)}" data-goto="map" aria-label="Markeer ${esc(k.naam)} op kaart">Markeer op kaart</button></footer></article>`;
}

// De machines als compacte lijst met status; leeg is een eerlijke zin met de weg naar de winkel van het scherm (Machines).
export function machinesKaartHtml(machines) {
  const rijen = machines.map((m) => `<li class="ds-lijst__rij bd-machine" data-stand="${esc(m.stand)}">${m.fp ? fpHtml(m.fp, m.naam, 's') : `<span class="bd-veldregel__ic">${icoon('tractor', { cls: 'ds-icoon' })}</span>`}` +
    `<span class="bd-veldregel__t"><b>${esc(m.naam)}</b><span class="ds-t-hulp">${m.bezit === 'gehuurd' ? 'gehuurd' : 'van jou'}</span></span>` +
    `<span class="ds-z-chip bd-chip" data-machine="${esc(m.stand)}">${esc(m.tekst)}</span></li>`).join('');
  return `<section class="ds-z-kaart ds-z-kaart--recht bd-machines" aria-label="Machines"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">Machines</h3></header>` +
    (rijen ? `<ul class="ds-lijst">${rijen}</ul>` : leegHtml('m:trekker-klein', 'Nog geen machines: huur of koop een trekker.')) +
    `<footer class="ds-z-kaart__voet"><button type="button" class="ds-z-knop ds-z-knop--secundair" data-bd="machines">Machines huren of kopen</button></footer></section>`;
}

// De dieren op je weilanden (#1101): een regel per kudde met aantal en status (icoon en woord), of een eerlijke zin met de weg naar Land en bedrijf.
export function dierenKaartHtml(dieren) {
  const rijen = (dieren || []).map((d) => `<li class="ds-lijst__rij bd-dier" data-ziek="${d.ziek ? '1' : '0'}">${fpHtml(animalKey(d.sp), d.soort, 's')}<span class="bd-veldregel__t"><b>${esc(d.soort)} · ${nl(d.n)} ${d.n === 1 ? 'dier' : 'dieren'}</b><span class="ds-t-hulp">${esc(d.naam)}</span></span>` +
    `<span class="ds-z-chip bd-chip" data-dier="${d.ziek ? 'ziek' : 'gezond'}">${esc(d.ziek ? 'Ziek: dierenarts nodig' : `Gezond · ${String(d.perDag).replace('.', ',')} ${esc(d.eenheid)} per dag`)}</span></li>`).join('');
  return `<section class="ds-z-kaart ds-z-kaart--recht bd-dieren-kaart" aria-label="Dieren"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">Dieren</h3></header>` +
    (rijen ? `<ul class="ds-lijst">${rijen}</ul>` : leegHtml('dier:koe', 'Je hebt nog geen dieren: koop vee bij Land en bedrijf.')) + '</section>';
}

// De toegang tot meer land: altijd zichtbaar op het overzicht, niet verstopt in een tab.
export function toegangKaartHtml(t) {
  return `<section class="ds-z-kaart ds-z-kaart--recht bd-toegang" aria-label="Meer land"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">Meer land</h3></header>` +
    `<p class="ds-z-kaart__tekst">${esc(t.tekst)}</p>` +
    (t.aanbod ? `<footer class="ds-z-kaart__voet"><button type="button" class="ds-z-knop ds-z-knop--secundair" data-bd="percelen">Percelen huren of kopen</button></footer>` : '') + '</section>';
}

// De legenda van de kaartstatussen: icoon, woord en de letter op de kaart (kleur is nooit de enige betekenis).
export function legendaHtml() {
  return `<ul class="bd-legenda" aria-label="Wat de kleuren op de kaart betekenen">` + STATUS_IDS.map((id) => `<li>${chip(id)}<span class="ds-t-hulp">kaartletter ${esc(KAART_STIJL[id].letter)}</span></li>`).join('') + '</ul>';
}

// De regelkaart bij de eerste keer: vier stappen met icoon en een zin; wegklikken onthoudt dit apparaat.
export function uitlegKaartHtml(metLegenda = false) {
  const stap = (id, tekst) => `<li>${chip(id)} ${esc(tekst)}</li>`;
  // #989: eerst de stappen met icoon en lus; de volledige zinnen staan eronder in 'Meer uitleg' (uit in Instellingen = alleen de zinnen)
  const iconenUitleg = uitlegBlok('boerderij-zaaien', { compact: true, nietMeer: true, zonderMeer: true });
  // compact en dicht: één regel die je openklapt, geen losse knop in het scrollgebied (oogtest 20-11)
  return `<details class="ds-z-kaart ds-z-kaart--recht bd-uitleg-kaart"><summary class="ds-z-kaart__titel">Zo werkt je boerderij</summary>` +
    iconenUitleg + `<ol class="bd-uitleg-lijst">${stap('geploegd', 'Ploegen: rij rustig rechte rijen, niet te hard.')}${stap('zaailing', 'Zaaien: kies eerst je gewas bij Gewas.')}${stap('groeiend', 'Groeien: het gewas groeit in speltijd, in de zomer.')}${stap('rijp', 'Oogsten als het veld oogstklaar is (de vlag is groen), daarna afleveren.')}</ol>` +
    (metLegenda ? `<p class="ds-t-label">Legenda van de kaart</p>${legendaHtml()}` : '') +
    '</details>';
}

// Het hele blok voor het onderdeel Overzicht: wat nu (met de ene hoofdknop), de lus, elk veld als kaart, de machines, meer land en de uitleg.
export function kaartenBlok(b, bezit = null) {
  const o = overzicht(b, bezit);
  if (o.leeg) return '';
  const schuurKg = o.schuurKg;
  const eerste = o.velden.find((v) => v.id === (o.hoofd && o.hoofd.veld)) || o.velden[0];
  const s = { statusId: eerste.statusId, klaar: eerste.klaar, status: eerste.standNaam };
  const hoofd = `<article class="ds-z-kaart ds-z-kaart--recht ds-z-kaart--selectie bd-nu" data-status="${eerste.statusId}"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">Nu: ${esc(eerste.volgende)}</h3>${chip(eerste.statusId, eerste.klaar ? 'Oogstklaar' : eerste.standNaam)}</header>` +
    `<p class="ds-z-kaart__tekst">${esc(eerste.naam)}${eerste.gewasNaam ? ` · ${esc(eerste.gewasNaam)}` : ''}${schuurKg ? ` · in de schuur: ${nl(schuurKg)} kg` : ''}${o.verwachtKg ? ` · verwacht op het land: ${nl(o.verwachtKg)} kg` : ''}</p>` +
    lusHtml({ ...s, ...{ statusId: eerste.statusId, klaar: eerste.klaar } }, schuurKg) + (eerste.groeit ? groeiHtml({ naam: eerste.naam, stadium: 0, groei: eerste.groei }) : '') +
    `<footer class="ds-z-kaart__voet"><button type="button" class="ds-z-knop" data-bd-naar="${esc(eerste.id)}" data-bd-sluit="1">${esc(o.hoofd.label)}</button></footer></article>`;
  const velden = `<div class="bd-velden" role="group" aria-label="Je velden">${o.velden.map((k) => veldKaartHtml(k)).join('')}</div>`;
  return hoofd + velden + machinesKaartHtml(o.machines) + toegangKaartHtml(o.toegang) + dierenKaartHtml(o.dieren) + uitlegKaartHtml(true);
}

export const _gewasNaam = (id) => (B.GEWASSEN[id] ? B.GEWASSEN[id].naam : '');
