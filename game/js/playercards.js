// Samen spelen (#1011): de spelerskaartjes van Spel > Samen spelen > Spelers als HTML-tekst, zonder DOM en zonder coopnet.js (dat trekt de hele
// game binnen). coopspelersui.js tekent hiermee het tabblad en regelt de klikken; scripts/ui/multiplayerflow_meet.mjs meet dezelfde HTML met de echte CSS.
// Een kaartje = avatar (vorm in kleur), naam, status als woorden met een icoon, wat de speler doet en de acties. Geen tekstmuur: de kop zegt in één
// regel wie het spel opende; de uitleg staat achter "Meer info". Wie wat ziet: iedereen dezelfde lijst; alleen wie het spel opende (de gastheer van nu)
// ziet Eruit zetten en Spel overdragen, nooit bij zichzelf; Dempen en Blokkeren (alleen voor jou, in het geheugen) staan bij elke andere speler.
import { icoon } from './icons.js';
import { statusVan, MUTE_ACTIONS } from './playerstatus.js';
import { muteButtonText } from './multiplayerphrases.js';
import { VORM_TEKEN, kanEruitZetten, kanOverdragen, overdragenKnopTekst, eruitKnopTekst, veiligeKleur } from './coopspelers.js';
import { playerCard } from './multiplayerwizard.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const chipHtml = (c) => `<span class="cs-chip cs-chip--${c.soort}" data-chip="${c.id}">${icoon(c.icoon, { maat: 's' })}<span>${esc(c.tekst)}</span></span>`;

// De toetsen op een kaartje (de focus staat op het kaartje): M dempt, B blokkeert, X zet eruit (met bevestiging). Ze staan in de tooltip van het pictogram.
export const CARD_KEYS = { gedempt: 'M', geblokkeerd: 'B', eruit: 'X' };

// Dempen en blokkeren (#1159): twee pictogrammen met een tooltip (wat het doet, en de toets). staat = 'gewoon' | 'gedempt' | 'geblokkeerd'.
export const muteHtml = (slot, staat = 'gewoon') => MUTE_ACTIONS.map((a) => {
  const on = staat === a.id, t = muteButtonText(a.id, on ? a.id : 'gewoon'), toets = CARD_KEYS[a.id];
  return `<button type="button" class="cs-stand cs-stand--icoon" data-stand="${a.id}" data-slot="${slot}" aria-pressed="${on ? 'true' : 'false'}" aria-keyshortcuts="${toets}" title="${esc(`${t} (${toets}): ${a.uitleg}`)}" aria-label="${esc(`${t}, toets ${toets}`)}">${icoon(a.icoon, { maat: 'm' })}</button>`;
}).join('');

// r: een rij uit coopspelers.js; opts: { acties (de knoppen tonen), rol ('host' | 'gast' | null), bevestig (slot dat om bevestiging vraagt), ctx (statusVan), muteStaat(slot) }
export function cardHtml(r, { acties = false, rol = null, bevestig = null, ctx = {}, muteStaat = () => 'gewoon' } = {}) {
  const asks = acties && bevestig === r.slot && kanEruitZetten(rol, r);
  const card = playerCard(r, { ik: r.jij ? r.slot : -1, isHost: rol === 'host' }); // wie wat mag: Verwijderen alleen voor wie het spel opende, nooit bij jezelf
  const eruit = acties && kanEruitZetten(rol, r) && card.acties.some((a) => a.id === 'verwijderen')
    ? (asks ? `<span class="cs-vraag">${esc(r.naam)} eruit zetten?</span><button type="button" class="cs-eruit" data-eruit="${r.slot}">Ja, eruit zetten</button><button type="button" class="cs-naar" data-eruit-nee="1">Annuleren</button>`
      : `<button type="button" class="cs-eruit" data-eruit="${r.slot}" aria-keyshortcuts="${CARD_KEYS.eruit}" title="${esc(eruitKnopTekst(false))} (${CARD_KEYS.eruit})">${esc(eruitKnopTekst(false))}</button>`) : '';
  const geef = acties && !asks && kanOverdragen(rol, r) ? `<button type="button" class="cs-naar" data-geef="${r.slot}">${esc(overdragenKnopTekst)}</button>` : '';
  const naar = acties && !asks && !r.jij && r.x != null ? `<button type="button" class="cs-naar" data-naar="${r.slot}">Ga erheen</button>` : '';
  // de groep (#492): "leidt <label>" bij de leider, de groepsnaam bij de andere deelnemers, niets bij wie niet meedoet
  const group = r.groep ? ` <small class="cs-groep${r.leidt ? ' cs-leidt' : ''}">${esc(r.groep)}</small>` : '';
  const later = acties && !r.jij && !asks ? `<span class="cs-laterrij">${muteHtml(r.slot, muteStaat(r.slot))}</span>` : '';
  const actiesHtml = naar || geef || eruit || later ? `<span class="cs-acties">${naar}${geef}${eruit}${later}</span>` : '';
  // #903: de speler is een kaart met een avatar in zijn eigen kleur en vorm; de status staat als woorden met een icoon (playerstatus.js statusVan).
  // Kleur is nooit het enige signaal: de vorm en het woord staan ernaast.
  const distance = !r.jij && r.afstandTekst ? `${r.afstandTekst}${r.richting ? ` ${r.richting.pijl} ${r.richting.woord}` : ''}` : '';
  return `<li class="cs-rij${r.verbinding === 'lost' ? ' cs-rij-weg' : ''}" data-slot="${r.slot}" tabindex="0"><span class="cs-avatar" aria-hidden="true"><span class="cs-vorm" style="color:${esc(veiligeKleur(r.kleur))}">${VORM_TEKEN[r.vorm] || '●'}</span></span>` +
    `<span class="cs-naam">${esc(r.naam)}${r.jij ? ' <small class="cs-jij">(jij)</small>' : ''}${group}</span>` +
    `<span class="cs-status">${statusVan(r, ctx).map(chipHtml).join('')}</span>` +
    `<span class="cs-doet">${esc(r.doet)}${distance ? `<small>${esc(distance)}</small>` : ''}</span>${actiesHtml}</li>`;
}

// De kop: het aantal, één korte regel over jouw rol, de rest achter Meer info. versie = versieRegel(VERSION).
export function kopHtml({ aantal, rol, opener = 'De ander', versie = '' }) {
  if (!aantal) return `<div class="cs-kop cs-kop-leeg"><b class="cs-kop-t">Je speelt nu alleen</b><p class="cs-kop-regel">Nodig iemand uit op het tabblad Sessie.</p></div>`;
  const line = rol === 'host' ? 'Jij opende het spel.' : `${esc(opener)} opende het spel.`;
  const info = [
    rol === 'host' ? 'Jij opende het spel: jij kunt spelers eruit zetten of het spel overdragen.' : `${esc(opener)} opende het spel. Valt je verbinding weg, dan kun je opnieuw verbinden of stoppen; je komt terug waar je was.`,
    `${esc(versie)} De wereld en de tijd zijn samen van de groep; je geld, spullen en voortgang blijven van jou. Alleen de speler bij wie de sessie draait, kan iemand eruit zetten.`,
  ];
  return `<div class="cs-kop"><span class="ds-z-chip ds-z-chip--selectie">Samen in Grunn</span><b class="cs-kop-t">${aantal} ${aantal === 1 ? 'speler' : 'spelers'} in deze sessie</b>` +
    `<p class="cs-kop-regel">${line}</p><details class="cs-info"><summary>Meer info</summary>${info.map((l) => `<p>${l}</p>`).join('')}</details></div>`;
}

// De passieve stand (#447): de knop, met de uitleg achter Meer info. data: { passief, tekst: { knopAan, knopUit, uitleg } }
export const pvpHtml = ({ passief, tekst }) => `<div class="cs-pvp"><button type="button" class="cs-pvp-knop" data-passief="${passief ? '0' : '1'}" aria-pressed="${passief ? 'true' : 'false'}">${esc(passief ? tekst.knopAan : tekst.knopUit)}</button><details class="cs-info"><summary>Meer info</summary><p>${esc(tekst.uitleg)}</p></details></div>`;

// Roepen: alleen de knoppen met hun toets (de uitleg stond hier dubbel)
export const roepHtml = (toetsen) => `<div class="cs-sectie"><h4>Roepen</h4><div class="cs-roep">${toetsen.map((k) => `<button type="button" class="cs-roep-knop" data-ping="${k.soort}">${esc(k.tekst)} <small>(${esc(k.toets)})</small></button>`).join('')}</div></div>`;
