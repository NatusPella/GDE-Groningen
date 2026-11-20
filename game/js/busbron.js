// De bron van de bussen, in woorden (#922, live bussen als USP): zijn de bussen op de kaart echt (Live), of rijden ze het rooster van het spel (Rooster, de eigen dienst)?
// Puur: geen THREE, geen DOM, geen opslag (scripts/busbron_test.mjs). De stand komt uit buslive.js (stand()), de instelling uit Instellingen. Dit bestand beslist alleen wat de
// speler te zien krijgt; het haalt niets op. Er gaat niets van de speler naar buiten: de opvraag staat in livebussen.js (alleen GET naar een vaste url, zonder cookies of id).

export const SOORT = { live: 'live', rooster: 'rooster', uit: 'uit' };
export const VEROUDERD_MS = 180000;   // zoals LIVE_BRON.verouderd (livebussen.js): ouder telt niet meer als live

// Wat er mis ging bij het laatste opvragen, in één rustige zin (nooit een foutcode in beeld).
const REDEN = {
  netwerk: 'de bron is niet bereikbaar',
  'time-out': 'de bron reageert niet',
  status: 'de bron geeft een foutmelding',
  'te-groot': 'de bron geeft te veel gegevens',
  ongeldig: 'de bron geeft onleesbare gegevens',
  leeg: 'er zijn nu geen bussen gemeld',
};

export function leeftijdTekst(sec) {
  const s = Math.max(0, Math.round(sec));
  if (s < 5) return 'zojuist';
  if (s < 90) return `${s} s geleden`;
  return `${Math.round(s / 60)} min geleden`;
}

// stand: buslive.js stand() = { aan, laatsteOk (ms), reden, fouten, opgevraagd, aantal }; nu in ms.
// Geeft { soort, aantal, leeftijdS, reden, tekst, kort }; tekst is voor een melding of een regel, kort voor het label op de kaart.
export function bronStand({ instelling = true, stand = null, nu = Date.now(), verouderd = VEROUDERD_MS } = {}) {
  if (instelling === false) return { soort: SOORT.uit, aantal: 0, leeftijdS: null, reden: 'instelling', tekst: 'Live bussen staan uit: de bussen rijden het rooster.', kort: 'Rooster' };
  const rooster = (reden, tekst) => ({ soort: SOORT.rooster, aantal: 0, leeftijdS: null, reden, tekst, kort: 'Rooster' });
  if (!stand || !stand.aan) return rooster('niet-aan', 'Live bussen zijn hier niet beschikbaar: de bussen rijden het rooster.');
  if (!stand.laatsteOk) {
    if (stand.reden && REDEN[stand.reden]) return rooster(stand.reden, `Live bussen: ${REDEN[stand.reden]}. De bussen rijden het rooster.`);
    return rooster('laden', 'Live bussen worden opgehaald. Tot dan rijden de bussen het rooster.');
  }
  const leeftijdS = Math.max(0, (nu - stand.laatsteOk) / 1000);
  if (leeftijdS * 1000 > verouderd) return rooster(stand.reden || 'verouderd', 'Live bussen: de gegevens zijn te oud. De bussen rijden het rooster.');
  if (!stand.aantal) return rooster('geen', 'Op dit moment is er geen live bus op onze lijnen. De bussen rijden het rooster.');
  return { soort: SOORT.live, aantal: stand.aantal, leeftijdS, reden: null, tekst: `Live: ${stand.aantal} echte ${stand.aantal === 1 ? 'bus' : 'bussen'} op de kaart (${leeftijdTekst(leeftijdS)} bijgewerkt).`, kort: 'Live' };
}

// De richting van een bus: naar het eindpunt van de lijn (dir 1) of terug naar het begin (dir -1). Zonder namen in de data: niets verzinnen.
export function richtingTekst(line, dir = 1) {
  if (!line) return '';
  const naar = dir < 0 ? line.from : line.to;
  return naar ? `richting ${naar}` : '';
}

// Het label voor de kaart: de lijn groot, de rest in de regel eronder. bron 'Live' of 'Rooster' staat altijd in de regel, nooit alleen in een kleur of een stip.
export function busLabel(line, dir, soort, leeftijdS = null) {
  const naam = (line && line.name) || 'Bus';
  const delen = [];
  if (line && line.ref) delen.push(`Lijn ${line.ref}`);
  const r = richtingTekst(line, dir);
  if (r) delen.push(r);
  if (soort === SOORT.live) { delen.push('Live bus'); if (leeftijdS != null) delen.push(`positie ${leeftijdTekst(leeftijdS)}`); } else delen.push('Rooster (eigen dienst)');
  return { label: naam, sub: delen.join(' · ') };
}

// De eerste live bus: één rustige melding, nooit vaker dan één keer per apparaat, en nooit meer dan één keer per sessie bij een uitval.
export function maakMelder({ gezien = () => false, zetGezien = () => {} } = {}) {
  const st = { live: false, gemeldUitval: false };
  return {
    // bus: de dichtstbijzijnde live bus { line, dir } of null; geeft de tekst of null
    tik(stand, bus) {
      if (stand.soort === SOORT.live) {
        st.gemeldUitval = false;
        if (!st.live && bus && !gezien('livebus')) {
          st.live = true; zetGezien('livebus');
          const r = richtingTekst(bus.line, bus.dir);
          return `Live bus: ${bus.line && bus.line.ref ? `lijn ${bus.line.ref}` : 'een lijn'} rijdt hier nu echt${r ? `, ${r}` : ''}. Zie de kaart.`;
        }
        if (bus) st.live = true;
        return null;
      }
      if (st.live && !st.gemeldUitval && stand.soort === SOORT.rooster) { st.gemeldUitval = true; st.live = false; return 'Live bussen even niet beschikbaar: de bussen rijden het rooster.'; }
      return null;
    },
    _stand: () => ({ ...st }),
  };
}
