// Eén standaard startkaart voor alle activiteiten (#678): doel, medaille-eisen, beloning,
// samen-status en je record. De gegevens staan in één tabel, zodat een nieuwe activiteit de
// kaart gratis krijgt en "Te doen", de kaart-hover en de startkaart hetzelfde zeggen.
// De kaartregels zijn kort (HUD-kaartbudget); de volledige bediening staat op het bord van
// het spel zelf, hier alleen de kern van twee of drie toetsen (#688).
// Puur: geen three.js en geen DOM; hudcards.js tekent de kaart.
import { showCard } from './hudcards.js';
import { keyTextHtml } from './keycap.js';
import { samenStatus, toelichtingVan } from './coopstatus.js';
import { getSettings } from './settings.js';
import { cleanDifficulty, DIFFICULTY } from './difficulty.js';
import { medailleTeksten } from './difficulty_medals.js'; // #800: medaille-eisen uit de geschaalde bron
import { laagVan } from './activiteitlaag.js'; // #800: de intrinsieke tweede laag naast de medaille
import { GROEPSBONUS_KORT } from './groepsbonus.js'; // (#811) dezelfde 1+1=3-regel als de wachtkamer

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Toetsen als dezelfde toetsplaatjes als de HUD ([E] wordt een kbd.hud-key).
const keysHtml = (s) => keyTextHtml(esc(s)); // [E], {E}, {MOUSE}: glyphs follow rebinding (keycap.js)

// Per activiteit (activities.js ACTIVITEIT_IDS): titel, doel (één zin), medailles (brons, zilver,
// goud of null), beloning en de kernbesturing.
export const STARTKAART = {
  carbid: {
    titel: 'Carbid schieten', doel: 'Vijf schoten op de balen, de tonnen en de stroman',
    medailles: ['45 punten', '80 punten', '120 punten'], beloning: '€20, €45 of €90 per medaille, plus loopbaanpunten',
    kern: '[A] [D] [W] [S] richten · {SPACE} water · [E] aansteken',
  },
  kermis: {
    titel: "Botsauto's", doel: 'Bots de anderen in de flank, 75 seconden lang',
    medailles: ['60 punten', '110 punten', '160 punten'], beloning: '€3 per ritje; €5, €12 of €25 per medaille, plus loopbaanpunten',
    kern: '[W] [S] gas en achteruit · [A] [D] sturen',
  },
  hoogvlieger: {
    titel: 'Reuzenrad', doel: 'Draai mee in het rad en kijk over de stad uit',
    medailles: ['1 ritje', '3 ritjes', '5 ritjes'], beloning: '€2 per ritje; je teller staat in Te doen',
    kern: '[E] instappen · {MOUSE} of {ARROWS} om je heen kijken',
  },
  geheimen: {
    titel: 'Geheimpjes', doel: 'Vind de kleine dingen die niemand je aanwijst',
    medailles: null, beloning: 'geld en een prestatie per vondst',
    kern: 'Kijk goed om je heen',
  },
  drift: {
    titel: 'Driftzones', doel: 'Glijd door de bocht en houd je reeks vast',
    medailles: ['2.500 punten', '5.000 punten', '9.000 punten'], beloning: 'premie per medaille en loopbaanpunten',
    kern: '[W] gas · {SPACE} handrem in de bocht',
  },
  discgolf: {
    titel: 'Discgolf', doel: 'Negen manden in het Stadspark met zo min mogelijk worpen',
    medailles: ['6 boven par', '1 boven par', '2 onder par'], beloning: 'prijzengeld per plek en loopbaanpunten',
    kern: '[A] [D] richten · houd {SPACE} en laat los om te gooien',
  },
  pitchputt: {
    titel: 'Pitch & putt', doel: 'Zes korte banen op de golfbaan',
    medailles: ['7 boven par', '3 boven par', 'op par of beter'], beloning: 'prijzengeld per plek en loopbaanpunten',
    kern: '[A] [D] richten · houd {SPACE} en laat los',
  },
  penalty: {
    titel: 'Penaltyserie Euroborg', doel: 'Vijf penalty’s op de keeper van Grunn-achtig',
    medailles: ['2 doelpunten', '3 doelpunten', '5 doelpunten'], beloning: 'prijzengeld per plek en loopbaanpunten',
    kern: '[A] [D] [W] [S] richten · houd {SPACE} en laat los',
  },
  voetbal: {
    titel: 'Wedstrijd spelen', doel: 'Een echte wedstrijd met commentaar, kaarten en herhalingen, ook als competitie',
    medailles: ['Winst', 'Winst met de nul', 'Winst met een hattrick'], beloning: 'prijzengeld per uitslag en loopbaanpunten',
    kern: '[W] [A] [S] [D] lopen · [F] [E] passen · {SPACE} schot',
  },
  skatepark: {
    titel: 'Skatepark', doel: 'Negentig seconden trucs, met een keten die oploopt',
    medailles: ['1.200 punten', '3.200 punten', '6.500 punten'], beloning: 'prijzengeld per plek en loopbaanpunten',
    kern: '[W] duwen · {SPACE} ollie · [E] kickflip',
  },
  kartbaan: {
    titel: 'Karten bij Kardinge', doel: 'Drie ronden tegen drie rijders',
    medailles: ['derde', 'tweede', 'eerste'], beloning: 'prijzengeld per plek en loopbaanpunten',
    kern: '[W] gas · [S] rem · {SPACE} handrem in de bocht',
  },
  ringrace: {
    titel: 'Ringrace', doel: 'Eén rondje ringweg tegen vier tegenstanders',
    medailles: ['derde', 'tweede', 'eerste'], beloning: 'prijzengeld per plek en loopbaanpunten',
    kern: '[W] gas · [S] rem · [A] [D] sturen',
  },
  zwembad: {
    titel: 'Zwembad Het Natte Papier', doel: 'Honderd meter, vier baantjes',
    medailles: ['binnen 1:40', 'binnen 1:16', 'binnen 1:04'], beloning: 'je record en je prestaties',
    kern: '{SPACE} duiken · [A] [D] om en om zwemmen',
  },
  klimtoren: {
    titel: 'Klimtoren Zernike', doel: 'Twaalf meter omhoog zonder je armen te verliezen',
    medailles: ['binnen 1:20', 'binnen 0:48', 'binnen 0:30'], beloning: 'prijzengeld per plek en loopbaanpunten',
    kern: 'Houd [A] en [D] vast, laat één hand los om hoger te grijpen',
  },
  waterski: {
    titel: 'Waterskiën bij het Grunopark', doel: 'Zwaai om de boeien en spring over de golven',
    medailles: ['650 punten', '1.300 punten', '2.200 punten'], beloning: 'je record en je prestaties',
    kern: '[A] [D] leunen · {SPACE} springen',
  },
  vliegschool: {
    titel: 'Vliegschool De Windwijzer', doel: 'Haal de twintig lessen van de vliegschool',
    medailles: ['één les', 'alle lessen', 'overal goud'], beloning: 'geld en loopbaanpunten per les',
    kern: '[W] [S] gas · [A] [D] sturen · {SPACE} neus omhoog',
  },
  carillon: {
    titel: 'Carillon', doel: 'Speel het deuntje zuiver op de klokken van de Martinitoren',
    medailles: ['50% goed', '75% goed', '92% goed'], beloning: 'je record en je prestaties',
    kern: '[Q] [E] deuntje kiezen · {SPACE} spelen',
  },
  pannenkoek: {
    titel: 'Pannenkoekenschip', doel: 'Bak en serveer twee minuten lang',
    medailles: ['400 punten', '700 punten', '1.000 punten'], beloning: 'je record en je prestaties',
    kern: '[1] [2] [3] beslag · {SPACE} draaien',
  },
  hengelen: {
    titel: 'Hengelen', doel: 'Haal de zwaarste vis binnen; overal aan het water mag vrij',
    medailles: ['4 kg', '7,5 kg', '12 kg'], beloning: 'vangstgeld per vis en je visboek',
    kern: '[I] vrij hengelen · {SPACE} uitgooien en binnenhalen',
  },
  boeren: {
    titel: 'Boerenwerk', doel: 'Vier werkgangen op je eigen akker',
    medailles: null, beloning: 'de oogst en loopbaanpunten; het materiaal betaal je zelf',
    kern: '{SPACE} op de tel slaan',
  },
  wandeling: {
    titel: 'Wandeling Winsum', doel: 'Loop in volgorde langs de vijf stempelposten',
    medailles: ['rustig tempo', 'doorlopen', 'stevig doorstappen'], beloning: 'je record en je prestaties',
    kern: 'Loop naar de volgende post · [Backspace] stopt',
  },
  snackketen: {
    titel: 'Kroketkoning', doel: 'Koop snackbars, verbouw ze en leeg de kassa',
    medailles: null, beloning: 'omzet per minuut; de kassa is van jou',
    kern: '[E] kopen, verbouwen of de kassa legen',
  },
  evenementen: {
    titel: 'Evenementen', doel: 'Bezoek de markten, optochten, kermissen en concerten van de agenda',
    medailles: null, beloning: 'een streepje in je evenementenlijst',
    kern: 'Kom langs als het evenement loopt',
  },
  regatta: {
    titel: 'Zeilregatta', doel: 'Rond twee keer alle tonnen in de juiste volgorde',
    medailles: ['uitvaren', 'tweede', 'winnen'], beloning: 'prijzengeld per plek en loopbaanpunten',
    kern: '[Q] zeil aan · [Z] zeil los',
  },
  safehuis: {
    titel: 'Safehuizen', doel: 'Koop of verdien een eigen woning in elk gebied',
    medailles: null, beloning: 'een eigen huis: slapen, garage en onderduiken',
    kern: '[E] bij de deur',
  },
  pvparena: {
    titel: 'PvP-arena', doel: 'Vecht met twee tot acht spelers, zonder blijvend verlies',
    medailles: null, beloning: 'een beloning per team; verliezen kost niets',
    kern: '[E] vraagt een ronde aan',
  },
  vluchtdienst: {
    titel: 'Vluchtdienst', doel: 'Vlieg door twee poorten en land zacht op het tweede veld',
    medailles: ['gehaald', 'op tijd', 'alles goed'], beloning: 'vluchtloon in geld en loopbaanpunten',
    kern: '[W] [S] gas · {SPACE} neus omhoog · [K] kleppen',
  },
  vaardienst: {
    titel: 'Rondvaart', doel: 'Vaar de drie kades in volgorde langs',
    medailles: ['gehaald', 'op tijd', 'alles goed'], beloning: 'je medaille op het bord',
    kern: '[W] [S] gas en rem · [A] [D] sturen',
  },
};

// #800: de medaille-eisen per moeilijkheidsstand komen uit dezelfde schaalbron als het spel
// (difficulty.js): punten delen door de target-factor, tijden en kilo's vermenigvuldigen. Alleen
// activiteiten waarvan de regels de stand al toepassen staan hier; de rest houdt zijn vaste eis.
const MEDAILLE_BRON = {
  carbid: { waarden: [45, 80, 120], lager: false, soort: 'punten' },
  kermis: { waarden: [60, 110, 160], lager: false, soort: 'punten' },
  drift: { waarden: [2500, 5000, 9000], lager: false, soort: 'punten' },
  klimtoren: { waarden: [80, 48, 30], lager: true, soort: 'tijd' },
  zwembad: { waarden: [100, 76, 64], lager: true, soort: 'tijd' },
  waterski: { waarden: [650, 1300, 2200], lager: false, soort: 'punten' },
  pannenkoek: { waarden: [400, 700, 1000], lager: false, soort: 'punten' },
  hengelen: { waarden: [4, 7.5, 12], lager: false, soort: 'kg' },
  carillon: { waarden: [0.5, 0.75, 0.92], lager: false, soort: 'procent' },
};

const klok = (sec) => {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Eén drempel in de eenheid van de activiteit, met dezelfde afronding als de regels: punten en
// seconden op een heel getal, kilo's op één decimaal, procenten op een heel percentage.
function medailleTekst(soort, waarde) {
  if (soort === 'tijd') return `binnen ${klok(waarde)}`;
  if (soort === 'punten') return `${Math.round(waarde).toLocaleString('nl-NL')} punten`;
  if (soort === 'kg') return `${Math.round(waarde * 10) / 10}`.replace('.', ',') + ' kg';
  if (soort === 'procent') return `${Math.min(100, Math.round(waarde * 100))}% goed`;
  return String(waarde);
}

// De medailles voor deze stand. Zonder geschaalde drempel: de vaste teksten uit de tabel.
export function medaillesVoorStand(id, difficulty = null) {
  const k = STARTKAART[id];
  if (!k || !k.medailles) return null;
  // #800: dezelfde geschaalde bron als het spel (difficulty_medals.js); de tabel is de terugval.
  return medailleTeksten(id, difficulty) || k.medailles.slice();
}

// De regels onder de streep van de kaart: stand, medailles, beloning, samen en record.
export function startkaartRegels(id, { record = null, difficulty = null } = {}) {
  const k = STARTKAART[id];
  if (!k) return [];
  const mode = cleanDifficulty(difficulty || getSettings().difficulty);
  const regels = [`Stand: ${DIFFICULTY[mode].label}`]; // #800: de gekozen stand staat op elke startkaart
  const medailles = medaillesVoorStand(id, mode);
  if (medailles) regels.push(`Medailles: brons ${medailles[0]} · zilver ${medailles[1]} · goud ${medailles[2]}`);
  if (k.beloning) regels.push(`Beloning: ${k.beloning}`);
  const laag = laagVan(id);
  if (laag) regels.push(`Tweede laag: ${laag}`); // #800: wat er na de medaille nog te halen is, zonder nieuwe teller
  const s = samenStatus('activiteit', id);
  if (s) {
    const woord = s === 'werkt' ? 'ja, met de groep' : s === 'deels' ? 'deels' : 'nog niet samen';
    const tol = toelichtingVan('activiteit', id);
    regels.push(`Samen: ${woord}${tol ? `. ${tol}` : ''}`);
    if (s === 'werkt') regels.push(GROEPSBONUS_KORT); // (#811) 1+1=3 ook op de startkaart
  }
  if (record) regels.push(`Record: ${record}`);
  return regels;
}

// De kaart als hudcards-spec. `record` komt van de activiteit zelf (die kent zijn recordregel).
// #999 (24-11): de kaart is een kort overzicht in plaats van negen zinnen onder elkaar. Elke regel heeft een label links
// (Doel, Toetsen, Medailles, Beloning, Daarna) en de waarde rechts; de stand, samen en je record zijn chips onderaan, met
// een woord erin (nooit alleen kleur). De medailles zijn drie plaatjes met een letter (B, Z, G) en de eis. De regels staan
// los met <br> ertussen, zodat de hoogteschatting van hudbus.js (cardLines) dezelfde regels telt als het beeld.
const MEDAILLE = [['b', 'B', 'brons'], ['z', 'Z', 'zilver'], ['g', 'G', 'goud']];
const rij = (label, waarde) => `<span class="sk-r"><span class="sk-l">${label}</span><span class="sk-w">${waarde}</span></span>`;
const skChip = (tekst, soort = '') => `<span class="sk-chip${soort ? ' sk-chip--' + soort : ''}">${esc(tekst)}</span>`;

export function startkaartSpec(id, { record = null, kicker = null, difficulty = null } = {}) {
  const k = STARTKAART[id];
  if (!k) return null;
  const mode = cleanDifficulty(difficulty || getSettings().difficulty);
  const rijen = [rij('Doel', esc(k.doel))];
  if (k.kern) rijen.push(rij('Toetsen', keysHtml(k.kern)));
  const medailles = medaillesVoorStand(id, mode);
  if (medailles) {
    rijen.push(rij('Medailles', MEDAILLE.map(([c, l, naam], i) => `<span class="sk-m"><i class="sk-m-${c}" role="img" aria-label="${naam}">${l}</i>${esc(medailles[i])}</span>`).join('')));
  }
  if (k.beloning) rijen.push(rij('Beloning', esc(k.beloning)));
  const laag = laagVan(id);
  if (laag) rijen.push(rij('Daarna', esc(laag)));
  const chips = [skChip(`Stand: ${DIFFICULTY[mode].label}`)];
  const s = samenStatus('activiteit', id);
  if (s) chips.push(skChip(`Samen: ${s === 'werkt' ? 'ja' : s === 'deels' ? 'deels' : 'nee'}`, s === 'werkt' ? 'ja' : ''));
  if (s === 'werkt') chips.push(skChip('+50% per speler', 'ja'));
  if (record) chips.push(skChip(`Record: ${record}`, 'record'));
  rijen.push(`<span class="sk-r sk-chips">${chips.join('')}</span>`);
  // de volledige zinnen (stand, samen met toelichting, 1+1=3) blijven de tekst voor het tekstlog en schermlezers
  const regels = startkaartRegels(id, { record, difficulty: mode });
  const body = [`Doel: ${k.doel}`, ...regels].join(' · ');
  return {
    kind: 'tip', kicker: kicker || 'Activiteit', title: k.titel,
    body,
    bodyHtml: `<span class="sk">${rijen.join('<br>')}</span>`,
    duration: 12, key: 'startkaart-' + id, voice: false, important: true,
  };
}

// Toont de startkaart; geeft de spec terug (null als de activiteit er geen heeft).
export function toonStartkaart(w, id, opts = {}) {
  const spec = startkaartSpec(id, opts);
  if (spec) showCard(w, spec);
  return spec;
}

// Dezelfde gegevens als regels voor "Te doen" en de kaart-hover (#678): doel, medailles en
// beloning, zonder de samen-status (die staat al op de regel en in het detail).
export function startkaartRijen(id, { difficulty = null } = {}) {
  const k = STARTKAART[id];
  if (!k) return [];
  const rijen = [['Doel', k.doel]];
  const medailles = medaillesVoorStand(id, difficulty);
  if (medailles) rijen.push(['Medailles', `brons ${medailles[0]} · zilver ${medailles[1]} · goud ${medailles[2]}`]);
  if (k.beloning) rijen.push(['Beloning', k.beloning]);
  return rijen;
}

// Eén regel voor de kaart-hover en "Te doen": doel plus de bronzen eis en de
// beloning, binnen het budget van de kaart-subregel. Te lang? Dan doel + brons;
// nog te lang? Dan alleen het doel, netjes op een woordgrens afgekapt.
export const MAX_HOVER_CHARS = 100;

function trimWords(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > 0 ? cut.slice(0, sp) : cut).trimEnd() + '…';
}

export function startkaartRegel(id, { difficulty = null } = {}) {
  const k = STARTKAART[id];
  if (!k) return '';
  const medailles = medaillesVoorStand(id, difficulty);
  const brons = medailles ? `brons ${medailles[0]}` : '';
  const volledig = `Doel: ${k.doel}${brons ? ` · ${brons}` : ''}${k.beloning ? ` · ${k.beloning}` : ''}`;
  if (volledig.length <= MAX_HOVER_CHARS) return volledig;
  const compact = `Doel: ${k.doel}${brons ? ` · ${brons}` : ''}`;
  if (compact.length <= MAX_HOVER_CHARS) return compact;
  return trimWords(`Doel: ${k.doel}`, MAX_HOVER_CHARS);
}


