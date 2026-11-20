// De veldkaarten van het boerderijpaneel (#985): wat nu, de lus (ploegen, zaaien, groeien, oogsten, afleveren), elk veld als kaart met status, voortgang en
// volgende klus, de legenda van de kaartstatussen en de eerste-keer-uitleg. Dun: dit bestand maakt alleen markup (ds-kaart, ds-chip, ds-streep, ds-knop uit
// ds-components.css; de indeling staat in boerderij.css) uit het model van boerderijstatus.js. Klikken en toetsen regelt boerderijui.js (data-bd-naar,
// data-bd-uitleg). Geen eigen kleuren: de stand zit in data-status, de betekenis in woorden en een icoon (kleur is nooit de enige betekenis).
import * as B from './boerderij.js';
import { STATUS, STATUS_IDS, KAART_STIJL, LUS, veldenStatus, lusKlaar, watNu } from './boerderijstatus.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nl = (n) => Math.round(n).toLocaleString('nl-NL');
const svg = (pad, cls = 'ds-icoon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pad}</svg>`;
const chip = (statusId, tekst) => `<span class="ds-chip bd-chip" data-status="${statusId}">${svg(STATUS[statusId].icoon, 'ds-chip__icoon')}${esc(tekst || STATUS[statusId].naam)}</span>`;

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
    return `<li data-stand="${stand}"${stand === 'nu' ? ' aria-current="step"' : ''}><span class="ds-chip">${svg(teken, 'ds-chip__icoon')}${esc(l.label)}</span></li>`;
  }).join('') + '</ol>';
}

// Eén veld als kaart: naam, status, gewas, voortgang, wat nu en een knop naar de kaart (secundair: de gele hoofdknop is van het scherm).
export function veldKaartHtml(s, schuurKg = 0) {
  const groeit = s.stadium >= 0;
  const voortgang = groeit ? `<div class="ds-streep" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(s.groei * 100)}" aria-label="Groei van ${esc(s.naam)}"><span class="ds-streep__baan"><span class="ds-streep__vul" style="--ds-streep-w:${(s.groei * 100).toFixed(1)}%"></span></span><span class="ds-streep__label">${Math.round(s.groei * 100)}%</span></div>` : '';
  const extra = [s.cult ? 'gecultiveerd' : '', s.mest ? 'bemest' : '', s.spuit ? 'gespoten' : ''].filter(Boolean).join(', ');
  return `<article class="ds-kaart bd-veld" data-status="${s.statusId}" data-veld="${esc(s.id)}">` +
    `<header class="ds-kaart__kop"><h3 class="ds-kaart__titel">${esc(s.naam)}${s.actief ? ' <span class="ds-t-hulp">werkt hier</span>' : ''}</h3>${chip(s.statusId, s.klaar ? 'Oogstklaar' : s.status)}</header>` +
    `<p class="ds-kaart__tekst">${s.soort === 'weiland' ? 'Weiland' : 'Akker'} · ${esc(String(s.ha).replace('.', ','))} ha${s.gewasNaam ? ` · ${esc(s.gewasNaam)}` : s.planNaam ? ` · plan: ${esc(s.planNaam)}` : ''}${extra ? ` · ${extra}` : ''}</p>` +
    voortgang +
    `<p class="ds-t-hulp bd-veld__nu"><b>Nu:</b> ${esc(watNu(s, schuurKg))}</p>` +
    `<footer class="ds-kaart__voet"><button type="button" class="ds-knop ds-knop--secundair" data-bd-naar="${esc(s.id)}">Zet op de kaart</button></footer></article>`;
}

// De legenda van de kaartstatussen: icoon, woord en de letter op de kaart (kleur is nooit de enige betekenis).
export function legendaHtml() {
  return `<ul class="bd-legenda" aria-label="Wat de kleuren op de kaart betekenen">` + STATUS_IDS.map((id) => `<li>${chip(id)}<span class="ds-t-hulp">kaartletter ${esc(KAART_STIJL[id].letter)}</span></li>`).join('') + '</ul>';
}

// De regelkaart bij de eerste keer: vier stappen met icoon en een zin; wegklikken onthoudt dit apparaat.
export function uitlegKaartHtml() {
  if (uitlegGezien()) return '';
  const stap = (id, tekst) => `<li>${chip(id)} ${esc(tekst)}</li>`;
  return `<article class="ds-kaart ds-kaart--kop bd-uitleg-kaart"><header class="ds-kaart__kop"><h3 class="ds-kaart__titel">Zo werkt je boerderij</h3></header>` +
    `<ol class="bd-uitleg-lijst">${stap('geploegd', 'Ploegen: rij rustig rechte rijen, niet te hard.')}${stap('zaailing', 'Zaaien: kies eerst je gewas bij Gewas.')}${stap('groeiend', 'Groeien: het gewas groeit in speltijd, in de zomer.')}${stap('rijp', 'Oogsten als de vlag geel is, daarna afleveren.')}</ol>` +
    `<footer class="ds-kaart__voet"><button type="button" class="ds-knop ds-knop--secundair" data-bd-uitleg="1">Begrepen</button></footer></article>`;
}

// Het hele blok voor het onderdeel Perceel: wat nu (met de ene hoofdknop), de lus, de velden, de legenda en de uitleg.
export function kaartenBlok(b) {
  const velden = veldenStatus(b);
  if (!velden.length) return '';
  const schuurKg = b.schuur.kg || 0;
  const eerste = velden.find((v) => v.aandacht || v.klaar) || velden[0];
  const hoofd = `<article class="ds-kaart ds-kaart--selectie bd-nu" data-status="${eerste.statusId}"><header class="ds-kaart__kop"><h3 class="ds-kaart__titel">Nu: ${esc(watNu(eerste, schuurKg))}</h3>${chip(eerste.statusId, eerste.klaar ? 'Oogstklaar' : eerste.status)}</header>` +
    `<p class="ds-kaart__tekst">${esc(eerste.naam)}${eerste.gewasNaam ? ` · ${esc(eerste.gewasNaam)}` : ''}${eerste.volgendeNaam ? ` · volgende klus: ${esc(eerste.volgendeNaam)}` : ''}${schuurKg ? ` · in de schuur: ${nl(schuurKg)} kg` : ''}</p>` +
    lusHtml(eerste, schuurKg) +
    `<footer class="ds-kaart__voet"><button type="button" class="ds-knop" data-bd-naar="${esc(eerste.id)}">Zet op de kaart</button></footer></article>`;
  return hoofd + `<div class="bd-velden">${velden.map((v) => veldKaartHtml(v, schuurKg)).join('')}</div>` + uitlegKaartHtml() + `<div><p class="ds-kaart__label">Legenda van de kaart</p>${legendaHtml()}</div>`;
}

export const _gewasNaam = (id) => (B.GEWASSEN[id] ? B.GEWASSEN[id].naam : '');
