// Samen spelen (#95): het uitnodigscherm als toestandsmachine, in de stijl van
// Watch Dogs 2: je kunt op elk moment iemand uitnodigen (intern de host) of aansluiten
// met een code, vanuit het pauzemenu. Er is geen keuze per save of bij het starten;
// iedereen houdt zijn eigen voortgang en speelt lokaal de hoofdpersoon van zijn eigen
// verhaal (Tammo of Tessa); de anderen zien je als je online-avatar (#455).
// Pure logica (geen DOM): toestand en Nederlandse teksten; lobbyui.js tekent.
//
// Twee routes, naast elkaar:
//  - 'kamer'  : kamercode, WebRTC met openbare STUN-servers en versleutelde signalering
//               via openbare brokers (net/rtcroom.js, net/brokers.js). Werkt ook in de browser.
//  - 'direct' : adres:poort van de host met UPnP, rechtstreeks, zonder servers van anderen
//               (desktop/coopcore.cjs). Alleen in de desktop-app.
// Nooit stilzwijgend verbinden: elke route begint met een toestemmingsscherm.

import { REASON_TEXT } from './net/protocol.js';
import { parseRoom } from './net/sigcrypto.js';
import { parseCode } from './net/pairing.js';
import { schoonNaam, filterEnSorteer, leeftijdTekst, leeftijdLang, LIJST, SORTERINGEN, SORTERING_LABEL } from './net/serverlijst.js';
import { EXTRA_CHARS, DEFAULT_MAX, MIN_MAX, ABS_MAX, advies, openerNaam } from './coopplayers.js';

export const ROLES = { HOST: 'host', GAST: 'gast' };
export const ROUTES = { KAMER: 'kamer', DIRECT: 'direct' };

export const CONSENT_TEXT = {
  kamer: 'Voor samen spelen wordt je IP-adres gedeeld met je medespeler en worden openbare servers gebruikt om elkaar te vinden.',
  direct: 'Voor samen spelen wordt je IP-adres gedeeld met je medespeler. Er worden geen servers van anderen gebruikt; je router opent een poort die sluit zodra je stopt.',
};
export const CONSENT_DETAIL = {
  kamer: 'Je kamercode versleutelt wat er via die servers gaat: zij zien alleen onleesbare berichten. Er wordt verder niets verstuurd.',
  direct: 'Iedereen met de code kan zolang de poort open staat proberen te verbinden. Geef de code alleen aan je medespeler. Windows kan nu vragen of GDE Groningen het netwerk mag gebruiken: kies Toestaan (privé netwerk), anders kan de ander je niet bereiken.',
};

// Openbare sessies (#438): standaard is een sessie privé (alleen met de kamercode). De host kiest zelf om hem in de lijst te zetten,
// per sessie, na deze toestemming; wie de lijst opent geeft eerst toestemming voor het verbinden met de openbare servers.
export const OPENBAAR_TEXT = [
  'Een openbare sessie staat in de lijst Openbare sessies, die iedereen kan zien die dit spel heeft. Zo kunnen spelers aansluiten zonder dat je ze een kamercode geeft.',
  'Dit wordt openbaar: de naam van je sessie, het aantal spelers en het maximum, de versie van het spel en de kamercode waarmee anderen aansluiten. Je IP-adres, een wachtwoord en andere gegevens staan er niet bij. De naam wordt gecontroleerd op scheldwoorden en echte merken en namen.',
  'Dit gaat elke 15 seconden naar dezelfde openbare servers als de kamercode, en die zien het onversleuteld. Uitzetten kan altijd: kies Sessie weer privé maken. Dan stopt het, je sessie verdwijnt binnen een minuut uit de lijsten en je krijgt een nieuwe kamercode, zodat de oude niet meer werkt.',
];
export const LIJST_TEXT = [
  'De lijst met openbare sessies wordt opgehaald via dezelfde openbare servers als de kamercode. Die servers zien dan je IP-adres, zoals bij elke website.',
  'Wat in de lijst staat is door spelers zelf geplaatst: de naam, het aantal spelers, de versie en de kamercode, onversleuteld. Sluit je aan, dan loopt dat via de gewone versleutelde kamercode en deel je je IP-adres met de ander.',
  'Staat er iets vervelends in? Kies Melden: die sessie verdwijnt dan uit jouw lijst. Er wordt niets verstuurd.',
];

// Wat "Verbinding testen" doet, vóór de speler het toestaat (het neemt contact op met openbare servers)
export const DIAG_TEXT = 'De test neemt contact op met dezelfde openbare servers als de kamercode: internet, servers om elkaar te vinden en servers voor de kamercode. In de app test hij ook of je router automatisch een poort opent. Er wordt niets van jou verstuurd.';

// ---------------------------------------------------------------- online-avatar (#455)
// Zo zien anderen je in Samen spelen: een eigen naam en kleur, los van de verhaalrol
// (Tammo of Tessa). De naam gaat door dezelfde lijst verboden woorden als een
// sessienaam (constitutie 10) en is hoogstens 16 tekens; de kleur komt uit deze vaste
// set, zodat twee spelers nooit toevallig dezelfde kleur krijgen zonder het te weten.
// Bewaard per apparaat in de gewone instellingen (settings.js: onlineNaam, onlineKleur).
export const ONLINE_NAAM_MAX = 16;
export const PROFIEL_KLEUREN = [
  { hex: '#4fb3ff', naam: 'Blauw' },
  { hex: '#5bd6a0', naam: 'Groen' },
  { hex: '#f2b134', naam: 'Geel' },
  { hex: '#ff9a62', naam: 'Oranje' },
  { hex: '#ff7ab8', naam: 'Roze' },
  { hex: '#b78cff', naam: 'Paars' },
  { hex: '#e86a6a', naam: 'Rood' },
  { hex: '#6fd3e0', naam: 'Turquoise' },
];
export const STANDAARD_KLEUR = PROFIEL_KLEUREN[0].hex;
const VERHAALNAMEN = ['tammo', 'tessa', 'anita']; // die horen bij het verhaal, niet bij een speler

// Een kleur uit de vaste set; alles anders wordt de standaardkleur.
export function profielKleur(kleur) {
  const k = String(kleur || '').toLowerCase();
  return PROFIEL_KLEUREN.some((c) => c.hex === k) ? k : STANDAARD_KLEUR;
}
export const kleurNaam = (kleur) => (PROFIEL_KLEUREN.find((c) => c.hex === profielKleur(kleur)) || PROFIEL_KLEUREN[0]).naam;

// De online naam: leeg mag (dan zie je de naam van je figuur), maar wat je invult
// moet door het filter. Geeft { ok, naam } of { ok: false, reason }.
export function profielNaam(tekst) {
  const naam = String(tekst ?? '').replace(/\s+/g, ' ').trim();
  if (!naam) return { ok: true, naam: '' };
  if (naam.length > ONLINE_NAAM_MAX) return { ok: false, reason: `Een online naam heeft hoogstens ${ONLINE_NAAM_MAX} tekens.` };
  if (VERHAALNAMEN.includes(naam.toLowerCase())) return { ok: false, reason: 'Kies een eigen naam: Tammo en Tessa horen bij het verhaal.' };
  return schoonNaam(naam);
}

// Het profiel zoals het naar de anderen gaat: alleen wat veilig door het net kan.
export function avatarUitProfiel(profiel = {}) {
  const r = profielNaam(profiel.naam);
  return { naam: r.ok ? r.naam : '', kleur: profielKleur(profiel.kleur) };
}
// Eén regel voor het scherm: "Anderen zien je als Bouwer (Groen)."
export function profielTekst(profiel = {}) {
  const av = avatarUitProfiel(profiel);
  return `Anderen zien je als ${av.naam || 'je figuur'} (${kleurNaam(av.kleur)}).`;
}

// In een sessie geldt voor iedereen hetzelfde (#447, #455): je begint op passief en je
// avatar (naam en kleur) is wat de anderen van je zien. Kort, want het staat bij de spelers.
export const PASSIEF_REGEL = 'Je staat standaard op passief: medespelers kunnen je geen schade doen. Je naam, kleur en die stand pas je aan bij Spelers in het pauzemenu.';

// Stand van de ander bij een versieverschil: duidelijke tekst met de versies
export function versieTekst(lokaal, ander) {
  const l = lokaal ? ` (jij: ${lokaal})` : '';
  return ander ? `Andere versie: de ander speelt versie ${ander}${l}. Installeer allebei dezelfde versie, het liefst de nieuwste, en probeer het opnieuw.` : `Andere versie van het spel${l}. Installeer allebei dezelfde versie, het liefst de nieuwste, en probeer het opnieuw.`;
}

// Wat voor invoer is dit? Een kamercode of een adres/code voor de directe route.
export function classifyInput(text) {
  const t = String(text || '').trim();
  if (!t) return { ok: false, reason: 'Er is niets ingevoerd.' };
  if (/^GDE2/i.test(t.replace(/\s+/g, ''))) {
    const c = parseCode(t);
    return c.ok ? { ok: true, route: ROUTES.DIRECT, code: t.replace(/\s+/g, '') } : c;
  }
  const r = parseRoom(t);
  return r.ok ? { ok: true, route: ROUTES.KAMER, room: r.room } : { ok: false, reason: 'Dit is geen kamercode en geen koppelcode van dit spel.' };
}

// caps: { direct (desktop-app), rtc (WebRTC beschikbaar), laatsteCode, start?: 'verbroken', rol?, startGate (de wachtkamer van een nieuw of geladen spel: het spel begint pas als wie het spel opende start), spelNaam (het opgeslagen spel van deze speler) }
export function createLobby(caps = {}) {
  const favorieten = Array.isArray(caps.favorieten) ? caps.favorieten.filter((x) => typeof x === 'string').slice(-100) : [];
  return {
    // keuze: de rol die al in het hoofdmenu is gekozen (Gastheer worden / Meedoen): dan slaat de lobby de rolkeuze over
    step: caps.start || (caps.keuze === ROLES.GAST && caps.lijst && caps.rtc !== false ? 'lijst-vraag' : caps.keuze ? (caps.keuze === ROLES.HOST ? 'methode' : 'gast-typt') : 'start'), rol: caps.rol || caps.keuze || null, route: null, invoer: null,
    code: '', lanCode: '', note: '', error: '', reason: null, status: null, partner: null,
    spelers: [], max: DEFAULT_MAX, wens: null, holdSlot: null, holdNaam: caps.holdNaam || '',
    profiel: { naam: String(caps.onlineNaam || '').slice(0, ONLINE_NAAM_MAX), kleur: profielKleur(caps.onlineKleur) }, profielFout: '',
    caps: { direct: !!caps.direct, rtc: caps.rtc !== false, laatsteCode: caps.laatsteCode || '', startGate: !!caps.startGate, spelNaam: String(caps.spelNaam || ''), lijst: !!caps.lijst, versie: String(caps.versie || ''), opslaan: !!caps.opslaan, favorieten },
    diag: null, terugNaar: caps.keuze === ROLES.GAST && caps.lijst ? 'gast-typt' : 'start', andereVersie: '',
    openbaar: !!(caps.openbaar && caps.openbaar.naam), openbaarNaam: caps.openbaar ? String(caps.openbaar.naam) : '', // alleen voor deze sessie (een nieuwe lobby is weer privé; het paneel leest het uit de hub)
    sessieId: caps.openbaar && caps.openbaar.id ? String(caps.openbaar.id) : '', // het vaste id van deze sessie (#450): dezelfde regel in de lijst, ook na een overname
    sessie: (caps.sessie && caps.sessie.id) ? { id: String(caps.sessie.id), naam: String(caps.sessie.naam || '') }
      : (caps.openbaar && caps.openbaar.id ? { id: String(caps.openbaar.id), naam: String(caps.openbaar.naam || '') } : null), // bij welke sessie je hoort (gast, of de openbare regel van de hub)
    lijst: [],
    // de query bovenop de lijst (#464): zoeken, filters, sortering en een pagina. Puur: view() rekent het uit,
    // lobbyui.js bewaart alleen de keuzes en de sterren.
    lijstZoek: '',
    lijstSortering: 'standaard',
    lijstAantal: LIJST.maxGetoond,
    lijstFilters: { alleenAansluitbaar: false, alleenFavorieten: false, alleenVers: false, verbergOnbruikbaar: false, plek: 'alle' },
    lijstFavorieten: favorieten,
    lijstVervers: 0,
  };
}
const fresh = (s) => createLobby(s.caps);

// Gebeurtenissen:
//  kies{rol}  route{route}  invoer{text}  akkoord  code{code, lanCode?, note?}  fout{msg}
//  status{status, reason, partner?}  terug  verbreek  hervat
//  spelers{lijst, max}  wens{char}  hold{slot, naam}  gate{aan}
//  overdragen  overdragen-terug  (het spel aan een speler overdragen, #439)
export function reduce(s, ev) {
  const n = { ...s, error: '' };
  switch (ev.t) {
    case 'kies':
      n.rol = ev.rol;
      n.step = ev.rol === ROLES.HOST ? 'methode' : 'gast-typt';
      return n;
    case 'route': // alleen host: kies kamercode of IP-adres
      if (ev.route === ROUTES.DIRECT && !s.caps.direct) return { ...n, error: 'Een IP-adres gebruiken kan alleen in de desktop-app.' };
      if (ev.route === ROUTES.KAMER && !s.caps.rtc) return { ...n, error: 'Een kamercode werkt hier niet: dit apparaat kan geen directe verbinding maken.' };
      n.route = ev.route; n.step = 'toestemming'; return n;
    case 'invoer': { // alleen gast
      const c = classifyInput(ev.text);
      if (!c.ok) return { ...n, error: c.reason };
      if (c.route === ROUTES.DIRECT && !s.caps.direct) return { ...n, error: 'Een adres of koppelcode van de directe route werkt alleen in de desktop-app. Vraag om een kamercode.' };
      if (c.route === ROUTES.KAMER && !s.caps.rtc) return { ...n, error: 'Een kamercode werkt hier niet.' };
      n.route = c.route; n.invoer = c; n.step = 'toestemming'; return n;
    }
    case 'akkoord':
      if (s.step !== 'toestemming') return s;
      n.step = s.rol === ROLES.HOST ? 'host-maakt-code' : 'verbinden'; return n;
    case 'code': // de host heeft een code (kamercode, of adres met UPnP; zonder router de lokale code)
      n.code = ev.code; n.lanCode = ev.lanCode || ''; n.note = ev.note || ''; n.step = 'host-wacht'; return n;
    case 'fout': n.error = ev.msg || 'Er ging iets mis.'; return n;
    case 'diag': // Verbinding testen: eerst de vraag om toestemming
      n.terugNaar = s.step.startsWith('diag') ? s.terugNaar : s.step; n.step = 'diag-vraag'; return n;
    case 'diag-go': n.step = 'diag-bezig'; n.diag = null; return n;
    case 'diag-klaar': n.step = 'diag-uit'; n.diag = ev.beoordeling || null; return n;
    case 'diag-terug': n.step = s.terugNaar || 'start'; return n;
    case 'openbaar-vraag': // alleen de host, alleen de kamercode-route (de IP-route heeft een adres in de code: nooit openbaar)
      if (s.rol !== ROLES.HOST || s.route !== ROUTES.KAMER || !['host-wacht', 'verbonden'].includes(s.step)) return s;
      n.step = 'openbaar-vraag'; return n;
    case 'openbaar-ja': {
      if (s.step !== 'openbaar-vraag') return s;
      const r = schoonNaam(ev.naam);
      if (!r.ok) return { ...n, error: r.reason };
      n.openbaar = true; n.openbaarNaam = r.naam; n.step = s.spelers.length > 1 ? 'verbonden' : 'host-wacht';
      // het vaste id van deze sessie (#450): de hub maakt het en geeft het mee, zodat een heropend paneel of een nieuwe
      // gastheer dezelfde regel in de lijst houdt in plaats van een nieuwe
      n.sessieId = typeof ev.id === 'string' && ev.id ? String(ev.id) : s.sessieId;
      n.sessie = n.sessieId ? { id: n.sessieId, naam: r.naam } : s.sessie;
      return n;
    }
    case 'openbaar-terug': if (s.step !== 'openbaar-vraag') return s; n.step = s.spelers.length > 1 ? 'verbonden' : 'host-wacht'; return n;
    case 'privaat': n.openbaar = false; return n;
    case 'overdragen': // wie het spel opende kiest een speler (#439); alleen met een kamercode, net als het overdragen zelf
      if (s.step !== 'verbonden' || !overdrachtKandidaten(s.rol, s.route, s.spelers).length) return s;
      n.step = 'overdragen-kies'; return n;
    case 'overdragen-terug': if (s.step !== 'overdragen-kies') return s; n.step = s.spelers.length > 1 ? 'verbonden' : 'host-wacht'; return n;
    case 'lijst-vraag': // Openbare sessies bekijken: eerst de toestemming
      if (!s.caps.rtc || !['start', 'gast-typt'].includes(s.step)) return s;
      n.terugNaar = s.step; n.step = 'lijst-vraag'; return n;
    case 'lijst-go': if (s.step !== 'lijst-vraag') return s; n.step = 'lijst'; n.lijst = []; return n;
    case 'lijst-data': if (s.step !== 'lijst') return s; n.lijst = Array.isArray(ev.lijst) ? ev.lijst : []; return n;
    case 'lijst-zoek': // direct tijdens het typen; het zoekveld houdt zijn waarde in de state (lobbyui.js)
      if (s.step !== 'lijst') return s; n.lijstZoek = String(ev.tekst ?? '').slice(0, 60); n.lijstAantal = LIJST.maxGetoond; return n;
    case 'lijst-filter': { // een filterchip aan of uit
      if (s.step !== 'lijst' || !['alleenAansluitbaar', 'alleenFavorieten', 'alleenVers', 'verbergOnbruikbaar'].includes(ev.filter)) return s;
      n.lijstFilters = { ...s.lijstFilters, [ev.filter]: !s.lijstFilters[ev.filter] }; n.lijstAantal = LIJST.maxGetoond; return n;
    }
    case 'lijst-plek': { // Vrij of Vol: nog een keer drukken wist de keuze
      if (s.step !== 'lijst') return s;
      const plek = ev.plek === 'vrij' || ev.plek === 'vol' ? ev.plek : 'alle';
      n.lijstFilters = { ...s.lijstFilters, plek: s.lijstFilters.plek === plek ? 'alle' : plek }; n.lijstAantal = LIJST.maxGetoond; return n;
    }
    case 'lijst-sorteer':
      if (s.step !== 'lijst' || !SORTERINGEN.includes(ev.sortering)) return s;
      n.lijstSortering = ev.sortering; return n;
    case 'lijst-meer': // Meer laden: met stappen van maxGetoond tot maxVolgen
      if (s.step !== 'lijst') return s;
      n.lijstAantal = Math.min(LIJST.maxVolgen, s.lijstAantal + LIJST.maxGetoond); return n;
    case 'lijst-ster': { // een favoriet aan of uit; alleen het id, nooit de naam (lobbyui.js bewaart het op dit apparaat)
      if (s.step !== 'lijst' || !ev.id) return s;
      const id = String(ev.id);
      n.lijstFavorieten = (s.lijstFavorieten.includes(id) ? s.lijstFavorieten.filter((x) => x !== id) : [...s.lijstFavorieten, id]).slice(-100);
      return n;
    }
    case 'lijst-filters-wissen':
      if (s.step !== 'lijst') return s;
      n.lijstZoek = ''; n.lijstFilters = { alleenAansluitbaar: false, alleenFavorieten: false, alleenVers: false, verbergOnbruikbaar: false, plek: 'alle' };
      n.lijstAantal = LIJST.maxGetoond; return n;
    case 'lijst-ververs': if (s.step !== 'lijst') return s; n.lijstVervers = (s.lijstVervers || 0) + 1; return n;
    case 'lijst-kies': { // aansluiten bij een sessie uit de lijst: dezelfde route als een ingevoerde kamercode, met dezelfde toestemming
      if (s.step !== 'lijst') return s;
      const e = s.lijst[ev.i];
      if (!e) return s;
      if (!e.kan) return { ...n, error: e.anders ? 'Deze sessie speelt een andere versie: je kunt er niet bij aansluiten.' : 'Deze sessie zit vol.' };
      n.rol = ROLES.GAST; n.route = ROUTES.KAMER; n.invoer = { ok: true, route: ROUTES.KAMER, room: e.room }; n.step = 'toestemming'; return n;
    }
    case 'lijst-terug': if (s.step !== 'lijst' && s.step !== 'lijst-vraag') return s; n.step = s.terugNaar || 'start'; return n;
    case 'wens': // alleen gast: de figuur die hij het liefst heeft (die van zijn online-avatar)
      n.wens = EXTRA_CHARS.some((c) => c.id === ev.char) ? ev.char : null; return n;
    case 'profiel': { // de online-avatar invullen (#455); de naam wordt pas bij profiel-klaar gefilterd
      const naam = typeof ev.naam === 'string' ? ev.naam.slice(0, ONLINE_NAAM_MAX) : s.profiel.naam;
      return { ...n, profiel: { naam, kleur: ev.kleur ? profielKleur(ev.kleur) : s.profiel.kleur }, profielFout: '' };
    }
    case 'profiel-klaar': { // het formulier verlaten: nu pas het filter, met een uitleg als het niet mag
      const r = profielNaam(s.profiel.naam);
      if (!r.ok) return { ...n, profielFout: r.reason };
      return { ...n, profiel: { ...s.profiel, naam: r.naam } };
    }
    case 'gate': n.caps = { ...s.caps, startGate: !!ev.aan }; return n;
    case 'hold': n.holdSlot = ev.slot ?? null; n.holdNaam = ev.naam || ''; return n;
    case 'spelers': { // de lijst met spelers is veranderd (host: uit de hub; gast: van de host)
      n.spelers = Array.isArray(ev.lijst) ? ev.lijst : []; n.max = Math.min(ABS_MAX, Math.max(MIN_MAX, ev.max | 0 || DEFAULT_MAX));
      // de gekozen speler is weg of niet meer bereikbaar: dan kies je opnieuw in de lijst (#439)
      if (s.step === 'overdragen-kies' && !overdrachtKandidaten(n.rol, n.route, n.spelers).length) n.step = n.spelers.length > 1 ? 'verbonden' : 'host-wacht';
      if (s.rol === ROLES.HOST) {
        if (n.spelers.length > 1 && (s.step === 'host-wacht' || s.step === 'host-maakt-code')) n.step = 'verbonden';
        else if (n.spelers.length <= 1 && s.step === 'verbonden') n.step = 'host-wacht'; // iedereen weg: de code blijft geldig
      }
      return n;
    }
    case 'verbinden': n.step = 'verbinden'; return n;
    case 'status': {
      n.status = ev.status; n.reason = ev.reason || null; if (ev.ander) n.andereVersie = String(ev.ander); if (ev.partner) n.partner = ev.partner;
      if (ev.status === 'ok' || ev.status === 'lag') n.step = 'verbonden';
      else if (ev.status === 'lost') n.step = 'verbroken';
      else if (ev.status === 'geweigerd') n.step = 'geweigerd';
      else if (ev.status === 'verbroken' || ev.status === 'weg') return { ...fresh(s), sessie: s.sessie }; // de sessie onthouden: je vindt hem terug in de lijst (#450)
      return n;
    }
    case 'hervat': // de host wacht weer op dezelfde gast; de gast voert de code opnieuw in
      if (s.step !== 'verbroken') return s;
      n.step = s.rol === ROLES.HOST ? 'host-maakt-code' : 'gast-typt'; return n;
    case 'adopteer': { // de sessie loopt al (na het overdragen van het spel, of het paneel is opnieuw getekend): het paneel kent rol, kamercode en spelers weer
      n.rol = ev.rol === ROLES.HOST ? ROLES.HOST : ROLES.GAST; n.route = ev.route === ROUTES.DIRECT ? ROUTES.DIRECT : ROUTES.KAMER; n.code = String(ev.code || '');
      n.spelers = Array.isArray(ev.lijst) ? ev.lijst : []; n.max = Math.min(ABS_MAX, Math.max(MIN_MAX, ev.max | 0 || DEFAULT_MAX));
      n.partner = ev.slot != null ? { slot: ev.slot } : null; n.status = 'ok'; n.step = 'verbonden';
      // de sessie houdt zijn naam en vaste id (#450): het paneel leest ze uit de hub (openbaar) en uit het welkom (gast), zodat
      // een lopende sessie dezelfde regel in de lijst houdt en een gast hem terugvindt
      if (ev.openbaar && ev.openbaar.naam) { n.openbaar = true; n.openbaarNaam = String(ev.openbaar.naam); n.sessieId = String(ev.openbaar.id || s.sessieId || ''); }
      if (ev.sessie && ev.sessie.id) n.sessie = { id: String(ev.sessie.id), naam: String(ev.sessie.naam || '') };
      else if (n.openbaar && n.sessieId) n.sessie = { id: n.sessieId, naam: n.openbaarNaam };
      return n;
    }
    case 'sessie': // de gast hoort bij het welkom bij welke sessie hij zit (#450): zijn regel in de lijst is herkenbaar
      if (!ev.sessie || !ev.sessie.id) return s;
      n.sessie = { id: String(ev.sessie.id).slice(0, 16), naam: String(ev.sessie.naam || '').slice(0, 24) }; return n;
    case 'laatste-code': // de code waarmee deze speler aansloot: na eruit gezet worden staat hij weer klaar om opnieuw aan te sluiten
      if (typeof ev.code !== 'string' || !ev.code) return s;
      n.caps = { ...s.caps, laatsteCode: ev.code }; return n;
    case 'verbreek': return fresh(s);
    case 'terug': return s.step === 'verbonden' ? s : fresh(s);
    default: return s;
  }
}

// Het spel begint pas met minstens twee spelers in de wachtkamer (de eigenaar, 20-10): wie het spel opende plus een gast
export const MIN_SPELERS = 2;

// Wie het spel kan overnemen (#439): iedere andere speler die nu bereikbaar is, en alleen met een kamercode (bij een IP-adres
// zou de nieuwe speler zijn eigen poort moeten openen en een koppelcode doorgeven; dat kan het spel niet).
export function overdrachtKandidaten(rol, route, lijst) {
  if (rol !== ROLES.HOST || route !== ROUTES.KAMER) return [];
  return (Array.isArray(lijst) ? lijst : []).filter((p) => p && Number.isInteger(p.slot) && p.slot !== 0 && p.verbinding !== 'lost');
}

// De regel voor de gast: wat er van zijn voortgang wordt bewaard (docs/COOP-OPSLAAN.md)
export const GAST_BEWAREN = (naam, opener = 'de ander') => `Je speelt mee in het spel van ${opener}. Wat je verdient bewaren we in je eigen spel${naam ? ` (${naam})` : ''}; het verhaal en de wereld zijn van ${opener}.`;

// Wat de gast leest over de figuur die hij koos (#455): de rol hoort bij de speler, niet
// bij de plek, dus we leggen alleen uit wat hij kreeg als zijn wens al bezet was.
export function jijRegel(s, lijst, ik) {
  const p = (lijst || []).find((x) => x && x.slot === ik);
  if (!p || !p.naam) return '';
  const wens = s.wens && EXTRA_CHARS.find((c) => c.id === s.wens);
  if (!wens || wens.id === p.char) return '';
  return `Je koos ${wens.naam}, maar die was al bezet: je kreeg ${p.naam}.`;
}

// Wat de UI toont. buttons: [{ act, label, primary? }]; input: een tekstvak; code: de code met kopieerknop.
export function view(s) {
  // bij een fout in de stappen waar je verbindt: wijs de weg naar de test
  const hulp = s.error && ['gast-typt', 'host-wacht', 'host-maakt-code', 'methode', 'verbinden'].includes(s.step) && !/gekopieerd/.test(s.error);
  const V = (o) => { const r = { title: 'Samen spelen', lines: [], buttons: [], input: null, code: null, profiel: null, error: s.error, ...o }; if (hulp && r.buttons.some((b) => b.act === 'diag')) r.lines = [...r.lines, 'Lukt het niet? Kies Verbinding testen: daar staat wat er mis is en wat je kunt doen.']; return r; };
  // het kleine formulier voor je online-avatar (#455): op de schermen waar je kiest om samen te spelen
  const profiel = { ...s.profiel, kleuren: PROFIEL_KLEUREN, maxLength: ONLINE_NAAM_MAX, fout: s.profielFout, tekst: profielTekst(s.profiel) };
  switch (s.step) {
    case 'start':
      return V({
        lines: ['Speel samen met een vriend in de open wereld: opdrachten, minigames en het verhaal. Je houdt je eigen voortgang en speelt lokaal je eigen verhaal: Tammo of Tessa, net wat jouw verhaal vraagt. De wereld is van wie het spel opent.', 'Vul hieronder je online naam en kleur in: zo zien de anderen je, ook als jij lokaal Tammo of Tessa bent.'],
        profiel,
        buttons: [{ act: 'kies-host', label: 'Iemand uitnodigen', primary: true }, { act: 'kies-gast', label: 'Code of adres invoeren' }, ...(s.caps.rtc ? [{ act: 'lijst', label: 'Openbare sessies' }] : []), { act: 'diag', label: 'Verbinding testen' }],
      });
    case 'methode': {
      const buttons = [{ act: 'route-kamer', label: 'Kamercode', primary: true }];
      if (s.caps.direct) buttons.push({ act: 'route-direct', label: 'IP-adres (direct)' });
      buttons.push({ act: 'diag', label: 'Verbinding testen' }, { act: 'terug', label: 'Terug' });
      return V({
        title: 'Iemand uitnodigen',
        lines: ['Kamercode: werkt overal, ook in de browser, via openbare servers.',
          s.caps.direct ? 'IP-adres: rechtstreeks naar jou, zonder servers van anderen. Je router moet UPnP hebben.' : 'Het IP-adres (direct) kan alleen in de desktop-app.'],
        profiel,
        buttons,
      });
    }
    case 'toestemming':
      return V({
        title: 'Eerst even toestemming',
        lines: [CONSENT_TEXT[s.route], CONSENT_DETAIL[s.route]],
        buttons: [{ act: 'akkoord', label: 'Akkoord en verbinden', primary: true }, { act: 'terug', label: 'Annuleren' }],
      });
    case 'host-maakt-code':
      return V({ title: 'Iemand uitnodigen', lines: [s.route === ROUTES.DIRECT ? 'Je router wordt gevraagd een poort te openen…' : 'Je kamercode wordt gemaakt…'], buttons: [{ act: 'terug', label: 'Annuleren' }] });
    case 'host-wacht': {
      const lines = [s.route === ROUTES.DIRECT ? 'Geef dit adres of deze code aan je medespeler. Zodra die verbindt, komt je medespeler naast je staan.' : 'Geef deze kamercode aan je medespeler. Zodra die hem invoert, komt je medespeler naast je staan.'];
      if (s.note) lines.push(s.note);
      if (s.lanCode && s.lanCode !== s.code) lines.push('Op hetzelfde netwerk werkt ook de lokale code: ' + s.lanCode);
      if (s.caps.startGate) lines.push('Wacht op een medespeler: je kunt het spel starten zodra er minstens twee spelers zijn.');
      if (s.openbaar) lines.push(openbaarRegel(s));
      return V({ title: 'Iemand uitnodigen', lines, code: s.code, buttons: [...(s.caps.startGate ? [{ act: 'start-spel', label: 'Spel starten', primary: true, disabled: true }] : []), { act: 'kopieer', label: 'Kopieer', primary: !s.caps.startGate }, ...openbaarKnop(s), { act: 'diag', label: 'Verbinding testen' }, { act: 'terug', label: 'Stoppen' }] });
    }
    case 'gast-typt':
      return V({
        title: 'Aansluiten', lines: ['Voer de kamercode of de koppelcode in die je kreeg. Je speelt lokaal je eigen verhaal (Tammo of Tessa, wat jouw opdracht vraagt) en de anderen zien je als je online-avatar. Kies hieronder je naam, kleur en figuur: je naam en kleur zijn wat de anderen bij je figuur zien.', GAST_BEWAREN(s.caps.spelNaam)],
        profiel,
        input: { placeholder: 'Kamercode of GDE2-…', value: s.caps.laatsteCode || '' },
        wensen: EXTRA_CHARS.map((c) => ({ act: 'wens-' + c.id, id: c.id, naam: c.naam, kleur: c.kleur, gekozen: s.wens === c.id })),
        buttons: [{ act: 'koppel', label: 'Verder', primary: true }, ...(s.caps.rtc ? [{ act: 'lijst', label: 'Openbare sessies' }] : []), { act: 'diag', label: 'Verbinding testen' }, { act: 'terug', label: 'Terug' }],
      });
    case 'verbinden':
      return V({ title: 'Verbinden…', lines: ['Even geduld. Dit duurt een paar seconden.'], buttons: [{ act: 'terug', label: 'Annuleren' }] });
    case 'verbonden': {
      const lag = s.status === 'lag';
      const host = s.rol === ROLES.HOST;
      const lijst = s.spelers || [];
      const ik = host ? 0 : s.partner && s.partner.slot;
      const namen = lijst.map((p) => p.naam + (p.verbinding === 'lost' ? ' · verbinding weg' : p.verbinding === 'lag' ? ' · haperend' : ''));
      const opener = openerNaam(lijst);
      const lines = [lijst.length ? `Spelers (${lijst.length} van ${s.max}): ${namen.join(', ')}.` : 'Je speelt met je medespeler.'];
      if (lag) lines.push('De verbinding haperde even; we wachten op de ander.');
      const tip = advies(lijst.length, host ? 'host' : 'gast'); if (tip) lines.push(tip);
      lines.push(profielTekst(s.profil), PASSIEF_REGEL);
      const buttons = [];
      if (host && s.caps.startGate) { // het spel begint pas met minstens twee spelers en een druk op Spel starten
        const genoeg = lijst.filter((p) => p.verbinding !== 'lost').length >= MIN_SPELERS;
        lines.push(genoeg ? "Het spel begint pas als jij op 'Spel starten' drukt: ook de openingsscène zien jullie samen." : 'Wacht op een medespeler: je kunt het spel starten zodra er minstens twee spelers zijn.');
        buttons.push({ act: 'start-spel', label: 'Spel starten', primary: true, disabled: !genoeg });
      }
      if (host) {
        for (const p of lijst) if (p.slot !== 0) buttons.push({ act: 'kick-' + p.slot, label: `${p.naam} eruit zetten` });
        const volgende = volgendeMax(s.max, lijst.length); if (volgende !== s.max) buttons.push({ act: 'max-' + volgende, label: `Maximaal ${s.max} spelers: wijzig naar ${volgende}` }); // één instelling in plaats van vier knoppen (#434)
        lines.push(s.code && lijst.length < s.max ? 'Er is nog plek: geef de code aan de volgende speler.' : 'Je kunt een speler er elk moment uit halen.');
        if (s.openbaar) lines.push(openbaarRegel(s));
        buttons.push(...openbaarKnop(s));
        // het spel overdragen (#439): de ander neemt de wereld over en jij sluit als gast aan
        if (overdrachtKandidaten(s.rol, s.route, lijst).length) buttons.push({ act: 'overdragen', label: 'Spel overdragen…' });
        buttons.push({ act: 'verbreek', label: 'Iedereen stoppen' });
      } else {
        lines.push(`${opener} heeft het spel geopend.`);
        const jij = jijRegel(s, lijst, ik); if (jij) lines.push(jij);
        if (s.caps.startGate) lines.push(`Wacht tot ${opener} het spel start.`);
        lines.push(GAST_BEWAREN(s.caps.spelNaam, opener));
        lines.push('Je kunt er elk moment uit; je komt terug waar je was.');
        buttons.push({ act: 'verbreek', label: 'Spel verlaten' });
      }
      return V({ title: 'Je speelt samen', lines, code: host && s.code && lijst.length < s.max ? s.code : null, spelers: lijst, ik, buttons });
    }
    case 'overdragen-kies': { // het spel aan een speler overdragen (#439): de gekozen speler krijgt de vraag (J of N)
      const kandidaten = overdrachtKandidaten(s.rol, s.route, s.spelers);
      return V({
        title: 'Spel overdragen',
        lines: kandidaten.length
          ? ['Kies wie het spel overneemt. Die speler krijgt de vraag; bij ja draait de wereld daar verder en sluit jij als gast aan. Je personage, je geld en je voortgang blijven van jou.',
            'De wereld gaat mee: de tijd, het weer, de politie, de lopende opdracht en de kapotte dingen. Iedereen blijft op de eigen plek.']
          : ['Er is nu niemand aan wie je het spel kunt overdragen.'],
        buttons: [...kandidaten.map((p) => ({ act: 'overdragen-' + p.slot, label: `Aan ${p.naam || 'de ander'} overdragen` })), { act: 'overdragen-terug', label: 'Terug', primary: !kandidaten.length }],
      });
    }
    case 'verbroken': {
      const host = s.rol === ROLES.HOST;
      const wie = host ? (s.holdNaam || 'De ander') : (s.holdNaam || openerNaam(s.spelers, true));
      return V({
        title: 'Verbinding weg',
        lines: [
          `${wie} is niet meer bereikbaar. Het spel staat stil tot jullie weer verbonden zijn.`,
          host ? `Wil je niet wachten? Dan ${s.holdNaam ? 'verwijder je ' + s.holdNaam : 'speel je alleen verder'} en gaat het spel door.` : 'Voer de code opnieuw in, of stop met samen spelen; je komt terug waar je was.',
        ],
        buttons: [{ act: 'hervat', label: 'Opnieuw verbinden', primary: true }, { act: 'verbreek', label: host ? 'Niet wachten' : 'Stoppen' }, { act: 'diag', label: 'Verbinding testen' }],
      });
    }
    case 'geweigerd':
      return V({ title: 'Koppelen mislukt', lines: [s.reason === 'versie' || s.reason === 'protocol' ? versieTekst(s.caps.versie, s.andereVersie) : (REASON_TEXT[s.reason] || 'Koppelen is niet gelukt.')], buttons: [{ act: 'terug', label: 'Terug', primary: true }, { act: 'diag', label: 'Verbinding testen' }] });
    case 'openbaar-vraag':
      return V({ title: 'Maak deze sessie openbaar', lines: OPENBAAR_TEXT, input: { placeholder: 'Naam van je sessie (hoogstens 24 tekens)', value: s.openbaarNaam || '', maxLength: 24 }, buttons: [{ act: 'openbaar-ja', label: 'Akkoord en openbaar maken', primary: true }, { act: 'openbaar-terug', label: 'Annuleren' }] });
    case 'lijst-vraag':
      return V({ title: 'Openbare sessies', lines: LIJST_TEXT, buttons: [{ act: 'lijst-go', label: 'Akkoord en lijst tonen', primary: true }, { act: 'lijst-terug', label: 'Annuleren' }] });
    case 'lijst': {
      // (#464) de pure query: zoeken, filters, sortering en de pagina. De volgorde hier is de volgorde op het scherm.
      const rijen = (s.lijst || []).map((e, i) => ({ ...e, i }));
      const f = s.lijstFilters || {};
      const q = filterEnSorteer(rijen, {
        zoek: s.lijstZoek, alleenAansluitbaar: f.alleenAansluitbaar, alleenFavorieten: f.alleenFavorieten,
        alleenVers: f.alleenVers, verbergOnbruikbaar: f.verbergOnbruikbaar, plek: f.plek,
        sortering: s.lijstSortering, favorieten: s.lijstFavorieten, aantal: s.lijstAantal,
      });
      const sessies = q.rijen.map((e) => ({
        i: e.i, act: 'sluit-' + e.i, meld: 'meld-' + e.i, ster: 'ster-' + e.i, id: e.id,
        naam: e.naam, spelers: e.spelers, max: e.max, versie: e.versie,
        kan: !!e.kan, anders: !!e.anders, vol: !!e.vol, mijn: !!(s.sessie && s.sessie.id && e.id === s.sessie.id),
        favoriet: !!e.favoriet, leeftijd: leeftijdTekst(e.ouderdom), leeftijdLang: leeftijdLang(e.ouderdom), dim: !!e.dim,
        tekst: `${e.naam} · ${e.spelers} van ${e.max} spelers · versie ${e.versie}${e.anders ? ' · Andere versie: niet aan te sluiten' : e.vol ? ' · Vol' : ''}${s.sessie && s.sessie.id === e.id ? ' · je was hier' : ''}`,
      }));
      const getoond = q.rijen.length, totaal = q.totaal, alles = q.alles;
      const telling = alles === 0 || totaal === 0 ? '' : getoond < totaal ? `${getoond} van ${totaal} sessies` : totaal < alles ? `${totaal} van ${alles} sessies` : `${alles} ${alles === 1 ? 'sessie' : 'sessies'}`;
      const lines = [alles === 0
        ? 'We zoeken openbare sessies. Er zijn er nu geen gevonden; de lijst ververst zichzelf elke paar seconden, dus even geduld kan helpen.'
        : totaal === 0
          ? 'Geen sessies die passen. Wis het zoekveld of de filters om alles te zien.'
          : 'Kies een sessie om aan te sluiten. De lijst ververst zichzelf elke paar seconden.' + (telling ? ` ${telling}.` : '')];
      if (s.lijstZoek) lines.push(`Je zoekt op "${s.lijstZoek}".`);
      return V({
        title: 'Openbare sessies', lines, sessies,
        lijstInfo: {
          zoek: s.lijstZoek || '', sortering: s.lijstSortering, aantal: s.lijstAantal, filters: { ...f },
          getoond, totaal, alles, meer: getoond < totaal, telling, ververst: s.lijstVervers || 0,
          sorteringen: SORTERINGEN.map((id) => ({ id, label: SORTERING_LABEL[id], gekozen: id === s.lijstSortering })),
        },
        buttons: [
          { act: 'lijst-ververs', label: 'Lijst verversen' },
          ...(totaal === 0 && alles > 0 ? [{ act: 'lijst-filters-wissen', label: 'Filters wissen' }] : []),
          { act: 'lijst-terug', label: 'Terug', primary: true },
        ],
      });
    }
    case 'diag-vraag':
      return V({ title: 'Verbinding testen', lines: [DIAG_TEXT], buttons: [{ act: 'diag-go', label: 'Test starten', primary: true }, { act: 'diag-terug', label: 'Annuleren' }] });
    case 'diag-bezig':
      return V({ title: 'Verbinding testen', lines: ['We testen je verbinding. Dit duurt ongeveer tien seconden…'], buttons: [] });
    case 'diag-uit': {
      const d = s.diag;
      const teken = { ok: 'Goed', 'let-op': 'Let op', mis: 'Mis', overgeslagen: 'Niet getest' };
      const lines = d ? [d.samenvatting, ...d.items.map((i) => `${teken[i.status] || i.status}: ${i.titel}. ${i.tekst}${i.tip ? ' ' + i.tip : ''}`)] : ['De test is niet gelukt.'];
      return V({ title: 'Uitslag verbinding', lines, buttons: [{ act: 'diag-go', label: 'Opnieuw testen' }, { act: 'rapport', label: 'Foutrapport kopiëren' }, ...(s.caps.opslaan ? [{ act: 'logbestand', label: 'Logbestand opslaan' }] : []), { act: 'diag-terug', label: 'Terug', primary: true }] });
    }
    default:
      return V({});
  }
}

// De knop en de regel voor een openbare sessie (alleen de kamercode-route: de IP-route zet een adres in de code)
const openbaarKnop = (s) => s.rol === ROLES.HOST && s.route === ROUTES.KAMER ? [s.openbaar ? { act: 'privaat', label: 'Sessie weer privé maken' } : { act: 'openbaar', label: 'Maak deze sessie openbaar' }] : [];
const openbaarRegel = (s) => `Deze sessie staat openbaar in de lijst Openbare sessies, als "${s.openbaarNaam}". Kies Sessie weer privé maken om hem te verbergen.`;

// het maximum is één instelling: elke druk gaat naar de volgende stap (4, 8, 12, 16) en weer rond; nooit onder het aantal spelers
export function volgendeMax(max, aantal = 0) {
  const stappen = [4, 8, 12, 16].filter((m) => m >= aantal);
  return stappen.find((m) => m > max) || stappen[0] || max;
}

// Verbindingsstatus voor het partnerlabel: kleur-onafhankelijk (tekst erbij).
export function statusBadge(status, rttSec = 0) {
  if (status === 'ok') return rttSec > 0.25 ? { level: 'traag', text: 'Traag' } : { level: 'goed', text: 'Verbonden' };
  if (status === 'lag') return { level: 'traag', text: 'Haperend' };
  if (status === 'lost') return { level: 'weg', text: 'Verbinding weg' };
  if (status === 'verbinden') return { level: 'bezig', text: 'Verbinden' };
  return { level: 'uit', text: '' };
}

// Gedrag bij lag: < 0,6 s normaal; 0,6-5 s de ander blijft staan en een badge verschijnt;
// > 5 s verbroken: het spel pauzeert en wacht (scherm 'Verbinding weg').
export function lagPolicy(quietSec) {
  if (quietSec < 0.6) return { freezeRemote: false, badge: false, hold: false };
  if (quietSec < 5) return { freezeRemote: true, badge: true, hold: false };
  return { freezeRemote: true, badge: true, hold: true };
}
