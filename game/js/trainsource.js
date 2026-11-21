// De bron van de vertrekborden, in woorden (#1085, model: busbron.js): zijn de vertragingen op het bord echt (Live), of toont het
// bord het rooster (Rooster)? Puur: geen THREE, geen DOM, geen opslag (scripts/trainsource_test.mjs). De stand komt uit trainlive.js
// (stand()), de instelling uit Instellingen. Dit bestand beslist alleen wat de speler te zien krijgt; het haalt niets op.
// De bron staat nooit alleen in een kleur: er staat altijd een woord (Live of Rooster) en een bronregel.

export const KIND = { live: 'live', rooster: 'rooster', uit: 'uit' };
export const VEROUDERD_MS = 180000;   // zoals LIVE_TRAINS.verouderd (livetrains.js)
const SOURCE_LINE = 'Bron: open OV-gegevens';

const REDEN = {
  netwerk: 'de bron is niet bereikbaar',
  'time-out': 'de bron reageert niet',
  status: 'de bron geeft een foutmelding',
  'te-groot': 'de bron geeft te veel gegevens',
  ongeldig: 'de bron geeft onleesbare gegevens',
  leeg: 'er zijn nu geen treinmeldingen',
};

// stand: trainlive.js stand() = { aan, laatsteOk (ms), reden, fouten, opgevraagd, aantal }; nu in ms.
// Geeft { soort, aantal, leeftijdS, reden, tekst, kort }; kort is het woord in het label ('Live' of 'Rooster').
export function sourceState({ instelling = true, stand = null, nu = Date.now(), verouderd = VEROUDERD_MS } = {}) {
  const rooster = (reden, tekst) => ({ soort: KIND.rooster, aantal: 0, leeftijdS: null, reden, tekst, kort: 'Rooster' });
  if (instelling === false) return { soort: KIND.uit, aantal: 0, leeftijdS: null, reden: 'instelling', tekst: 'Live treinen staan uit: de borden tonen het rooster.', kort: 'Rooster' };
  if (!stand || !stand.aan) return rooster('niet-aan', 'Live treinen zijn hier niet beschikbaar: de borden tonen het rooster.');
  if (!stand.laatsteOk) {
    if (stand.reden && REDEN[stand.reden]) return rooster(stand.reden, `Live treinen: ${REDEN[stand.reden]}. De borden tonen het rooster.`);
    return rooster('laden', 'Live vertragingen worden opgehaald. Tot dan toont het bord het rooster.');
  }
  const ageS = Math.max(0, (nu - stand.laatsteOk) / 1000);
  if (ageS * 1000 > verouderd) return rooster(stand.reden || 'verouderd', 'Live treinen: de gegevens zijn te oud. De borden tonen het rooster.');
  if (!stand.aantal) return rooster('geen', 'Voor deze stations zijn nu geen treinmeldingen. De borden tonen het rooster.');
  return { soort: KIND.live, aantal: stand.aantal, leeftijdS: ageS, reden: null, tekst: `Live: vertragingen van ${stand.aantal} treinmeldingen (${ageText(ageS)} bijgewerkt).`, kort: 'Live' };
}

export function ageText(sec) {
  const s = Math.max(0, Math.round(sec));
  if (s < 5) return 'zojuist';
  if (s < 90) return `${s} s geleden`;
  return `${Math.round(s / 60)} min geleden`;
}

const minuten = (s) => Math.max(1, Math.round(s / 60));

// "Vertrekt over 4 min · 3 min vertraagd" voor één rij van het bord. wacht = tijd - nu in spelklokseconden.
// Zonder vertraging alleen "Vertrekt over 4 min"; een vervallen rit zegt dat; onder een minuut "Vertrekt nu".
export function departureLine(rij, nu) {
  if (!rij) return '';
  if (rij.vervallen) return 'Deze trein rijdt niet';
  const wacht = rij.tijd - nu;
  const basis = wacht <= 30 ? 'Vertrekt nu' : wacht < 90 ? 'Vertrekt over 1 min' : `Vertrekt over ${minuten(wacht)} min`;
  return rij.vertraging >= 60 ? `${basis} · ${minuten(rij.vertraging)} min vertraagd` : basis;
}

// Het label op het bord: het woord Live of Rooster plus, bij Live, hoe vers. Eigen dienst (station zonder echt rooster): "Rooster (eigen dienst)".
export function bronLabel(stand, { eigenDienst = false } = {}) {
  if (eigenDienst) return { kort: 'Rooster (eigen dienst)', regel: 'Bron: eigen dienst van het spel' };
  if (stand.soort === KIND.live) return { kort: 'Live', regel: `${SOURCE_LINE} · ${ageText(stand.leeftijdS)} bijgewerkt` };
  return { kort: 'Rooster', regel: `${SOURCE_LINE} · rooster, zonder live vertraging` };
}
