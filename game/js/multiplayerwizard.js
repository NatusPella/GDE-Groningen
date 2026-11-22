// Samen spelen (#1011): de stap-voor-stap-flow als regels. Puur: geen DOM, geen netwerk, geen opslag, zodat
// `node scripts/multiplayerwizard_test.mjs` de hele flow zonder browser kan doorlopen. De bestaande lobby (lobby.js)
// blijft de bron van wat er verbindt; dit bestand zegt alleen in welke STAP van de wizard een lobbyscherm valt,
// wat Terug (B/Esc) doet, wat een stap mag zeggen (tekstdieet) en wat er eerst klaar moet zijn voor Verder.
//
// De stappen (zie docs/SAMEN-FLOW-UX-22-11.md voor de kaart):
//   0 Keuze      Meedoen | Open je spel (of, bij een lopende sessie, de statuskaart)
//   1 Wie ben jij  naam, kleur en figuur met een live voorbeeld
//   2 Kiezen     gast: kamercode | openbare sessies | vrienden; host: privé | openbaar, wachtwoord, sessienaam
//   3 Verbinden  één voortgangsregel, Terug en Verbinding testen
//
// Privacyregels (constitutie 10) die hier vastliggen: een sessie is standaard privé; openbaar maken kan alleen na een
// uitdrukkelijk vinkje en een sessienaam die door het filter komt; een IP-adres staat nooit in een veld of regel.
import { schoonNaam } from './net/serverlijst.js';
import { classifyInput, profielNaam, ROLES } from './lobby.js';

export const WSTEP = { CHOICE: 0, WHO: 1, PICK: 2, CONNECT: 3 };
export const WSTEPS = [
  { nr: 1, id: 'wie', label: 'Wie ben jij' },
  { nr: 2, id: 'kiezen', label: 'Kiezen' },
  { nr: 3, id: 'verbinden', label: 'Verbinden' },
];
// Per stap hoogstens zoveel tekens in de zichtbare uitleg (één regel); de rest staat achter "Meer info".
export const HINT_MAX = 70;
export const SESSION_NAME_MAX = 24;

// Welke lobbyschermen bij welke stap horen. De wizard kent de lobbystappen bij naam (lobby.js view()).
const PICK_SCREENS = ['gast-typt', 'methode', 'toestemming', 'lijst-vraag', 'lijst', 'openbaar-vraag', 'diag-vraag'];
const WHO_SCREENS = ['gast-typt', 'methode']; // eerst de kaart "Wie ben jij", daarna dezelfde schermen als stap 2
// 'verbonden' met een wachtkamer (startGate) is nog stap 3; zonder wachtkamer loopt de sessie en is het scherm een statuskaart

// De staat van de wizard ZELF (de lobby heeft zijn eigen staat): wat de speler in de stappen koos en nog niet verbond.
export function createWizard(caps = {}) {
  return {
    wieKlaar: !!caps.wieKlaar,      // de kaart "Wie ben jij" is bevestigd
    wijze: caps.wijze || null,      // gast: 'code' | 'lijst' | 'favorieten'; host: 'prive' | 'openbaar'
    openbaar: false,                // host: openbaar gekozen (de sessie blijft privé tot alles klopt)
    bevestigd: false,               // host: het vinkje "ik begrijp wat er openbaar wordt"
    sessienaam: '',                 // host: de naam in de openbare lijst
    wwOpen: false,                  // gast: het wachtwoordveld is open (de sessie vraagt er een)
    fout: '',                       // korte, vriendelijke melding van de wizard zelf
    rtc: caps.rtc !== false,
    favorieten: Math.max(0, caps.favorieten | 0),
    direct: !!caps.direct,
  };
}

// Is dit een lopende sessie (statuskaart) in plaats van een stap?
export const isStatusCard = (lobby) => !!lobby && lobby.step === 'verbonden' && !(lobby.caps && lobby.caps.startGate);

// De stap van de wizard: 0 keuze, 1 wie, 2 kiezen, 3 verbinden. `lobby` is de staat van lobby.js, `wz` die van createWizard.
export function wizStep(lobby, wz) {
  const s = lobby && lobby.step;
  if (s === 'start') return WSTEP.CHOICE;
  if (WHO_SCREENS.includes(s) && !(wz && wz.wieKlaar)) return WSTEP.WHO;
  if (PICK_SCREENS.includes(s)) return WSTEP.PICK;
  if (s === 'verbonden') return isStatusCard(lobby) ? WSTEP.CHOICE : WSTEP.CONNECT; // de statuskaart is geen stap; de wachtkamer wel
  return WSTEP.CONNECT;
}

// Het stappenpuntje: voor elke stap 'klaar', 'nu' of 'straks'. Bij de keuze en de statuskaart staat er geen indicator.
export function indicator(lobby, wz) {
  const nu = wizStep(lobby, wz);
  if (nu === WSTEP.CHOICE) return [];
  return WSTEPS.map((st) => ({ ...st, staat: st.nr < nu ? 'klaar' : st.nr === nu ? 'nu' : 'straks' }));
}

// Wat Terug (B/Esc, en de knop) doet. Geeft { soort, ... }:
//   'wie-terug'  alleen de wizard gaat een stap terug (naar "Wie ben jij")
//   'lobby'      een lobbyknop: act (bijvoorbeeld 'terug', 'lijst-terug')
//   'niets'      op de eerste stap: het menu beslist (Escape sluit het onderdeel)
export function wizTerug(lobby, wz) {
  const s = lobby && lobby.step;
  const nu = wizStep(lobby, wz);
  if (nu === WSTEP.CHOICE) return { soort: 'niets' };
  if (nu === WSTEP.WHO) return { soort: 'lobby', act: 'terug' }; // naar de keuze
  if (s === 'lijst' || s === 'lijst-vraag') return { soort: 'lobby', act: 'lijst-terug' };
  if (s === 'diag-vraag') return { soort: 'lobby', act: 'diag-terug' };
  if (s === 'openbaar-vraag') return { soort: 'lobby', act: 'openbaar-terug' };
  if (s === 'gast-typt' || s === 'methode') return { soort: 'wie-terug' };
  // toestemming en alles van stap 3: Annuleren/Stoppen/Terug van de lobby, daarna staat stap 2 er weer (zie `naTerug`)
  return { soort: 'lobby', act: 'terug', naTerug: true };
}

// Na een Terug uit stap 3 (de lobby valt dan op zijn beginscherm) wil de speler stap 2 terug, niet de keuze.
export const naTerugRol = (lobbyVoor) => (lobbyVoor && lobbyVoor.rol) || null;

// Wat de wizard zelf van de staat bewaart.
export function reduceWizard(wz, ev) {
  const n = { ...wz, fout: '' };
  switch (ev.t) {
    case 'wie-klaar': { // Verder op "Wie ben jij": de naam moet door het filter (leeg mag: dan is het de naam van je figuur)
      const r = profielNaam(ev.naam);
      if (!r.ok) return { ...n, fout: r.reason };
      n.wieKlaar = true; return n;
    }
    case 'wie-terug': n.wieKlaar = false; n.wijze = null; return n;
    case 'wijze': {
      const w = ev.wijze;
      if (['code', 'lijst', 'favorieten'].includes(w)) {
        if (w === 'lijst' && !wz.rtc) return { ...n, fout: 'Openbare sessies werken hier niet.' };
        if (w === 'favorieten' && !(wz.rtc && wz.favorieten > 0)) return { ...n, fout: 'Je hebt nog geen favorieten.' };
        n.wijze = w; return n;
      }
      if (w === 'prive') { n.wijze = 'prive'; n.openbaar = false; n.bevestigd = false; return n; } // terug naar privé wist het vinkje
      if (w === 'openbaar') {
        if (!wz.rtc) return { ...n, fout: 'Openbaar maken werkt hier niet.' };
        n.wijze = 'openbaar'; n.openbaar = true; return n;
      }
      return { ...n, fout: 'Onbekende keuze.' };
    }
    case 'bevestig': n.bevestigd = !!ev.aan; return n;
    case 'sessienaam': n.sessienaam = String(ev.tekst ?? '').slice(0, SESSION_NAME_MAX); return n;
    case 'ww': n.wwOpen = !!ev.open; return n;
    case 'fout': n.fout = String(ev.msg || ''); return n;
    case 'reset': return createWizard({ wieKlaar: wz.wieKlaar, rtc: wz.rtc, favorieten: wz.favorieten, direct: wz.direct });
    default: return wz;
  }
}

// Mag de speler van stap 2 naar stap 3? Per rol en keuze: geeft { ok } of { ok: false, fout } (kort en met één actie).
export function kanVerder(lobby, wz, invoer = '') {
  if (!lobby) return { ok: false, fout: 'Er is nog geen sessie.' };
  if (lobby.rol === ROLES.GAST || lobby.step === 'gast-typt') {
    if (wz.wijze === 'lijst' || wz.wijze === 'favorieten') return { ok: true };
    const c = classifyInput(invoer);
    if (!c.ok) return { ok: false, fout: c.reason };
    return { ok: true, route: c.route };
  }
  // host
  if (wz.openbaar || wz.wijze === 'openbaar') {
    if (!wz.rtc) return { ok: false, fout: 'Openbaar maken werkt hier niet.' };
    if (!wz.bevestigd) return { ok: false, fout: 'Zet eerst het vinkje: dan weet je wat er openbaar wordt.' };
    if (!String(wz.sessienaam || '').trim()) return { ok: false, fout: 'Geef je sessie een naam.' };
    const r = schoonNaam(wz.sessienaam);
    if (!r.ok) return { ok: false, fout: r.reason };
    return { ok: true, naam: r.naam, openbaar: true };
  }
  return { ok: true, openbaar: false }; // privé is de standaard en vraagt niets extra's
}

// Een openbare sessie mag nooit via de IP-route (daar zit een adres in de code): alleen met de kamercode.
export const magOpenbaar = (route) => route !== 'direct';

// Het veld mag een code nooit tonen die een IP-adres draagt (GDE2-...): lobby.js houdt dat al zo; deze regel is voor de wizard.
export const codeForField = (tekst) => (/^GDE2/i.test(String(tekst || '').replace(/\s+/g, '')) ? '' : String(tekst || ''));

// Een code of regel die een IP-adres lijkt te bevatten: voor tests en voor wie een regel op een scherm zet.
export const bevatIp = (tekst) => /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(String(tekst || '')) || /\bGDE2-/i.test(String(tekst || ''));

// Tekstdieet: de korte uitleg bij een stap, hoogstens HINT_MAX tekens. Wat langer is, staat achter "Meer info".
export function kort(tekst, max = HINT_MAX) {
  const t = String(tekst || '').trim();
  return t.length <= max ? t : '';
}
export function splitHint(regels, max = HINT_MAX) {
  const list = (Array.isArray(regels) ? regels : []).map((x) => String(x || '').trim()).filter(Boolean);
  const eerste = list.length && list[0].length <= max ? list[0] : '';
  return { kort: eerste, meer: eerste ? list.slice(1) : list };
}

// Titels en korte regels per stap. De lobby levert titel en regels; wat hier staat gaat voor als de wizard een eigen
// korte zin heeft (alles ≤ HINT_MAX). De volledige tekst blijft achter Meer info.
export const WIZ_TEKST = {
  keuze: { titel: 'Samen spelen', kort: 'Speel samen in dezelfde wereld.' },
  wie: { titel: 'Wie ben jij?', kort: 'Zo zien de anderen je.' },
  gast: { titel: 'Meedoen', kort: 'Kies hoe je bij de anderen komt.' },
  host: { titel: 'Open je spel', kort: 'Je spel is standaard privé.' },
  verbinden: { titel: 'Verbinden', kort: '' },
  statuskaart: { titel: 'Je speelt samen', kort: '' },
};

// Schermen waar de wizard één eigen korte zin boven zet; de volledige tekst van de lobby staat dan achter Meer info.
export const SHORT_PER_SCREEN = {
  toestemming: 'Je IP-adres gaat naar je medespeler en openbare servers.',
  'host-maakt-code': '', 'host-wacht': 'Geef de kamercode aan je medespeler.', verbinden: '',
  'lijst-vraag': 'Voor de lijst verbinden we met openbare servers.', lijst: 'Kies een sessie om aan te sluiten.',
  'diag-vraag': 'De test neemt contact op met openbare servers.',
  'openbaar-vraag': 'Naam, spelers en versie komen in de lijst.',
  verbroken: 'Het spel staat even stil.',
};
// Schermen waar de regels van de lobby zelf de inhoud zijn (een uitslag, een fout): die staan in beeld, niet achter Meer info.
export const CONTENT_SCREENS = ['diag-uit', 'diag-bezig', 'geweigerd', 'overdragen-kies'];
// Schermen met een lange lijst: alleen daar mag de inhoud scrollen (de rest past zonder scrollbalk).
export const SCROLL_SCREENS = ['lijst', 'diag-uit'];

// De voortgangsregel van stap 3 (alleen de gast verbindt langs de tikken van lobby.js). tik = de verbindtik (4 s).
export function progressLine(lobby) {
  const s = lobby && lobby.step;
  const tik = (lobby && lobby.wachtTik) | 0;
  if (s === 'verbinden') {
    if (tik < 2) return { tekst: 'Verbinden…', bezig: true };
    if (tik < 5) return { tekst: 'Wachten op wie het spel opende…', bezig: true };
    return { tekst: 'Nog geen antwoord. Klopt de code?', bezig: false, actie: 'Terug' };
  }
  if (s === 'host-maakt-code') return { tekst: 'Je kamercode wordt gemaakt…', bezig: true };
  if (s === 'host-wacht') return { tekst: 'Wachten op spelers…', bezig: true };
  if (s === 'verbonden') return { tekst: 'Verbonden', bezig: false };
  if (s === 'verbroken') return { tekst: 'Verbinding weg', bezig: false, actie: 'Opnieuw verbinden' };
  if (s === 'geweigerd') return { tekst: 'Niet binnengekomen', bezig: false, actie: 'Terug' };
  return { tekst: '', bezig: false };
}

// Welke knoppen horen in de vaste voetzone, in de volgorde links naar rechts: secundair eerst, de hoofdactie (geel) laatst.
// `knoppen` is v.buttons van lobby.js ({ act, label, primary?, disabled? }). Verbinding testen en Openbare sessies zijn
// nooit de hoofdactie; Terug/Annuleren/Stoppen staan links.
export function footerOrder(knoppen) {
  const list = Array.isArray(knoppen) ? knoppen : [];
  const rank = (b) => (b.primary ? 9 : ['terug', 'verbreek', 'openbaar-terug', 'lijst-terug', 'diag-terug', 'overdragen-terug'].includes(b.act) ? 0 : b.act === 'diag' ? 2 : 1);
  return [...list].sort((a, b) => rank(a) - rank(b));
}

// Een lijst spelers als kaartjes (de Spelers-subtab): wie wat mag zien en doen. `ik` = eigen plek (slot), `isHost` = jij opende het spel.
// Geeft per speler welke acties er zijn; Verwijderen en Overdragen alleen voor wie het spel opende (en nooit voor jezelf).
export function playerCard(p, { ik = null, isHost = false } = {}) {
  const jij = p && Number.isInteger(p.slot) && p.slot === ik;
  const opent = !!p && p.slot === 0;
  const acties = [];
  if (!jij && p) {
    acties.push({ id: 'dempen', label: 'Dempen', toets: 'M', aan: false, later: true });
    acties.push({ id: 'blokkeren', label: 'Blokkeren', toets: 'B', aan: false, later: true });
    if (isHost) acties.push({ id: 'verwijderen', label: 'Verwijderen', toets: 'X', gevaar: true });
  }
  return { jij, opent, acties };
}
