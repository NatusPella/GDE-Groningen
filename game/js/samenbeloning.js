// Samen spelen: de beloningskaart na een gezamenlijke activiteit (ontwerp 24-11, hoofdstuk 5o). Pure gegevens en HTML, geen DOM en geen netwerk.
// Links de uitslag (plek, vorm, naam, tijd; wie niet meedeed staat in één zin), rechts "Voor jou" als bon: beloning, groepsbonus (1+1=3, groepsbonus.js), verdiend en
// loopbaanpunten, met de zin dat het in je eigen spel is bewaard. Je ziet alleen je eigen bedrag; van de anderen alleen de plek. Niets wordt hier uitbetaald: de
// betaling blijft per gebeurtenis in coopbeloning.js; dit toont wat er al is uitbetaald (de bedragen komen van de aanroeper).
import { groepsbonus, GROEPSBONUS_PER_SPELER } from './groepsbonus.js';
import { VORM_TEKEN, veiligeKleur } from './coopspelers.js';
import { escapeHtml as esc } from './htmlescape.js';

const eur = (n) => '€ ' + Math.round(n).toLocaleString('nl-NL');

// invoer: { titel, uitslag: [{ slot, naam, kleur, vorm, plek?, tijd? }], kijkers: [naam], mijnSlot, basis (jouw beloning vóór de groepsbonus), aantal (deelnemers), punten (loopbaan), verhaal: 'ongewijzigd'|'stap' }
export function beloningGegevens({ titel = 'Klaar', uitslag = [], kijkers = [], mijnSlot = 0, basis = 0, aantal = null, punten = 0, verhaal = 'ongewijzigd' } = {}) {
  const n = aantal != null ? aantal : Math.max(1, uitslag.length);
  const f = groepsbonus(n);
  const b = Math.max(0, Math.round(Number(basis) || 0));
  const totaal = Math.round(b * f);
  const meedoen = uitslag.some((u) => u.slot === mijnSlot);
  return { titel: String(titel).slice(0, 60), uitslag: uitslag.slice(0, 8), kijkers: kijkers.slice(0, 8), mijnSlot, meedoen, basis: b, factor: f, bonus: totaal - b, totaal, aantal: n, punten: Math.max(0, Math.round(Number(punten) || 0)), verhaal };
}
const lijstTekst = (namen) => (namen.length === 1 ? namen[0] : namen.slice(0, -1).join(', ') + ' en ' + namen[namen.length - 1]);

export function beloningHtml(g) {
  const rij = (u, i) => `<div class="sb-rij${u.slot === g.mijnSlot ? ' sb-rij--jij' : ''}"><span class="sb-plek">${esc(u.plek ?? i + 1)}</span><span class="ss-vorm" style="color:${esc(veiligeKleur(u.kleur))}" aria-hidden="true">${VORM_TEKEN[u.vorm] || '●'}</span><b>${esc(u.naam)}</b>${u.slot === g.mijnSlot ? ' <span class="ss-jij">JIJ</span>' : ''}<span class="sb-tijd">${esc(u.tijd || '')}</span></div>`;
  const kijk = g.kijkers.length ? `<p class="sb-kijk">${esc(lijstTekst(g.kijkers))} ${g.kijkers.length === 1 ? 'keek' : 'keken'} mee: geen beloning en niets verloren.</p>` : '';
  const bon = g.meedoen
    ? `<div class="ds-z-bon"><div class="ds-z-bon__regel"><span>Beloning</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag">${eur(g.basis)}</span></div>`
      + (g.bonus > 0 ? `<div class="ds-z-bon__regel"><span>Samen gedaan, ${g.aantal} spelers (×${String(g.factor.toFixed(1)).replace('.', ',')})</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag">+ ${eur(g.bonus)}</span></div>` : '')
      + `<div class="ds-z-bon__totaal"><span>Verdiend</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag">${eur(g.totaal)}</span></div></div>`
      + `<dl class="sb-feiten">${g.punten ? `<dt>Loopbaan</dt><dd>+ ${g.punten} punten</dd>` : ''}<dt>Je verhaal</dt><dd>${g.verhaal === 'stap' ? 'een stap verder' : 'ongewijzigd'}</dd></dl>`
      + `<p class="sb-hulp">Opgeslagen in <b>jouw</b> spel. Je ziet alleen je eigen bedrag; de anderen krijgen hun eigen beloning.</p>`
    : `<p class="sb-hulp">Je keek mee: geen beloning en niets verloren. Bij de volgende vraagt het spel weer of je meedoet.</p>`;
  return `<section class="sb-kaart" role="dialog" aria-modal="true" aria-label="${esc(g.titel)}"><div class="sb-kop">${esc(g.titel)}: klaar</div>`
    + `<div class="sb-md"><div class="sb-kol"><h3 class="ds-z-tussenkop">Uitslag</h3>${g.uitslag.map(rij).join('')}${kijk}</div><div class="sb-kol"><h3 class="ds-z-tussenkop">Voor jou</h3>${bon}</div></div>`
    + `<div class="sb-acties"><button type="button" class="ds-z-knop" data-beloning-door>Doorgaan</button></div></section>`;
}

export { GROEPSBONUS_PER_SPELER };
