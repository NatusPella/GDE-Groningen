// Eén standaard startkaart voor alle activiteiten (#678): doel, medaille-eisen, beloning,
// samen-status en je record. De gegevens staan in één tabel, zodat een nieuwe activiteit de
// kaart gratis krijgt en "Te doen", de kaart-hover en de startkaart hetzelfde zeggen.
// De kaartregels zijn kort (HUD-kaartbudget); de volledige bediening staat op het bord van
// het spel zelf, hier alleen de kern van twee of drie toetsen (#688).
// Puur: geen three.js en geen DOM; hudcards.js tekent de kaart.
import { showCard } from './hudcards.js';
import { samenStatus, toelichtingVan } from './coopstatus.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Toetsen als dezelfde toetsplaatjes als de HUD ([E] wordt een kbd.hud-key).
const KEYS = 'A|D|W|S|E|F|R|T|O|K|Q|Z|M|G|H|L|N|P|X|C|U|Spatie|Enter|Tab|Shift|Backspace|Esc|1|2|3|4';
const KEY_RE = new RegExp(`\\[(${KEYS})\\]`, 'g');
const keysHtml = (s) => esc(s).replace(KEY_RE, (m, k) => `<kbd class="hud-key">${k === 'Spatie' ? 'SPATIE' : k.toUpperCase()}</kbd>`);

// Per activiteit (activities.js ACTIVITEIT_IDS): titel, doel (één zin), medailles (brons, zilver,
// goud of null), beloning en de kernbesturing.
export const STARTKAART = {
  carbid: {
    titel: 'Carbid schieten', doel: 'Vijf schoten op de balen, de tonnen en de stroman',
    medailles: ['45 punten', '80 punten', '120 punten'], beloning: '€20, €45 of €90 per medaille, plus loopbaanpunten',
    kern: '[A] [D] [W] [S] richten · [Spatie] water · [E] aansteken',
  },
  kermis: {
    titel: "Botsauto's", doel: 'Bots de anderen in de flank, 75 seconden lang',
    medailles: ['60 punten', '110 punten', '160 punten'], beloning: '€3 per ritje; €5, €12 of €25 per medaille, plus loopbaanpunten',
    kern: '[W] [S] gas en achteruit · [A] [D] sturen',
  },
  hoogvlieger: {
    titel: 'Reuzenrad', doel: 'Draai mee in het rad en kijk over de stad uit',
    medailles: ['1 ritje', '3 ritjes', '5 ritjes'], beloning: '€2 per ritje; je teller staat in Te doen',
    kern: '[E] instappen · muis of pijltjes om je heen kijken',
  },
  geheimen: {
    titel: 'Geheimpjes', doel: 'Vind de kleine dingen die niemand je aanwijst',
    medailles: null, beloning: 'geld en een prestatie per vondst',
    kern: 'Kijk goed om je heen',
  },
  drift: {
    titel: 'Driftzones', doel: 'Glijd door de bocht en houd je reeks vast',
    medailles: ['2.500 punten', '5.000 punten', '9.000 punten'], beloning: 'premie per medaille en loopbaanpunten',
    kern: '[W] gas · [Spatie] handrem in de bocht',
  },
  discgolf: {
    titel: 'Discgolf', doel: 'Negen manden in het Stadspark met zo min mogelijk worpen',
    medailles: ['6 boven par', '1 boven par', '2 onder par'], beloning: 'prijzengeld per plek en loopbaanpunten',
    kern: '[A] [D] richten · houd [Spatie] en laat los om te gooien',
  },
  pitchputt: {
    titel: 'Pitch & putt', doel: 'Zes korte banen op de golfbaan',
    medailles: ['7 boven par', '3 boven par', 'op par of beter'], beloning: 'prijzengeld per plek en loopbaanpunten',
    kern: '[A] [D] richten · houd [Spatie] en laat los',
  },
  skatepark: {
    titel: 'Skatepark', doel: 'Negentig seconden trucs, met een keten die oploopt',
    medailles: ['1.200 punten', '3.200 punten', '6.500 punten'], beloning: 'prijzengeld per plek en loopbaanpunten',
    kern: '[W] duwen · [Spatie] ollie · [E] kickflip',
  },
  kartbaan: {
    titel: 'Karten bij Kardinge', doel: 'Drie ronden tegen drie rijders',
    medailles: ['derde', 'tweede', 'eerste'], beloning: 'prijzengeld per plek en loopbaanpunten',
    kern: '[W] gas · [S] rem · [Spatie] handrem in de bocht',
  },
  ringrace: {
    titel: 'Ringrace', doel: 'Eén rondje ringweg tegen vier tegenstanders',
    medailles: ['derde', 'tweede', 'eerste'], beloning: 'prijzengeld per plek en loopbaanpunten',
    kern: '[W] gas · [S] rem · [A] [D] sturen',
  },
  zwembad: {
    titel: 'Zwembad Het Natte Papier', doel: 'Honderd meter, vier baantjes',
    medailles: ['binnen 1:40', 'binnen 1:16', 'binnen 1:04'], beloning: 'je record en je prestaties',
    kern: '[Spatie] duiken · [A] [D] om en om zwemmen',
  },
  klimtoren: {
    titel: 'Klimtoren Zernike', doel: 'Twaalf meter omhoog zonder je armen te verliezen',
    medailles: ['binnen 1:20', 'binnen 0:48', 'binnen 0:30'], beloning: 'prijzengeld per plek en loopbaanpunten',
    kern: 'Houd [A] en [D] vast, laat één hand los om hoger te grijpen',
  },
  waterski: {
    titel: 'Waterskiën bij het Grunopark', doel: 'Zwaai om de boeien en spring over de golven',
    medailles: ['650 punten', '1.300 punten', '2.200 punten'], beloning: 'je record en je prestaties',
    kern: '[A] [D] leunen · [Spatie] springen',
  },
  vliegschool: {
    titel: 'Vliegschool De Windwijzer', doel: 'Haal de twintig lessen van de vliegschool',
    medailles: ['één les', 'alle lessen', 'overal goud'], beloning: 'geld en loopbaanpunten per les',
    kern: '[W] [S] gas · [A] [D] sturen · [Spatie] neus omhoog',
  },
  carillon: {
    titel: 'Carillon', doel: 'Speel het deuntje zuiver op de klokken van de Martinitoren',
    medailles: ['de helft goed', 'driekwart goed', '92% goed'], beloning: 'je record en je prestaties',
    kern: '[Q] [E] deuntje kiezen · [Spatie] spelen',
  },
  pannenkoek: {
    titel: 'Pannenkoekenschip', doel: 'Bak en serveer twee minuten lang',
    medailles: ['400 punten', '700 punten', '1.000 punten'], beloning: 'je record en je prestaties',
    kern: '[1] [2] [3] beslag · [Spatie] draaien',
  },
  hengelen: {
    titel: 'Hengelen', doel: 'Haal de zwaarste vis binnen; overal aan het water mag vrij',
    medailles: ['4 kg', '7,5 kg', '12 kg'], beloning: 'vangstgeld per vis en je visboek',
    kern: '[I] vrij hengelen · [Spatie] uitgooien en binnenhalen',
  },
  boeren: {
    titel: 'Boerenwerk', doel: 'Vier werkgangen op je eigen akker',
    medailles: null, beloning: 'de oogst en loopbaanpunten; het materiaal betaal je zelf',
    kern: '[Spatie] op de tel slaan',
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
    kern: '[W] [S] gas · [Spatie] neus omhoog · [K] kleppen',
  },
  vaardienst: {
    titel: 'Rondvaart', doel: 'Vaar de drie kades in volgorde langs',
    medailles: ['gehaald', 'op tijd', 'alles goed'], beloning: 'je medaille op het bord',
    kern: '[W] [S] gas en rem · [A] [D] sturen',
  },
};

// De regels onder de streep van de kaart: medailles, beloning, samen en record.
export function startkaartRegels(id, { record = null } = {}) {
  const k = STARTKAART[id];
  if (!k) return [];
  const regels = [];
  if (k.medailles) regels.push(`Medailles: brons ${k.medailles[0]} · zilver ${k.medailles[1]} · goud ${k.medailles[2]}`);
  if (k.beloning) regels.push(`Beloning: ${k.beloning}`);
  const s = samenStatus('activiteit', id);
  if (s) {
    const woord = s === 'werkt' ? 'ja, met de groep' : s === 'deels' ? 'deels' : 'nog niet samen';
    const tol = toelichtingVan('activiteit', id);
    regels.push(`Samen: ${woord}${tol ? ` — ${tol}` : ''}`);
  }
  if (record) regels.push(`Record: ${record}`);
  return regels;
}

// De kaart als hudcards-spec. `record` komt van de activiteit zelf (die kent zijn recordregel).
export function startkaartSpec(id, { record = null, kicker = null } = {}) {
  const k = STARTKAART[id];
  if (!k) return null;
  const regels = startkaartRegels(id, { record });
  const kern = k.kern ? `<br>${keysHtml(k.kern)}` : '';
  const body = `Doel: ${k.doel}`;
  return {
    kind: 'tip', kicker: kicker || 'Activiteit', title: k.titel,
    body,
    bodyHtml: esc(body) + kern + (regels.length ? `<br>${regels.map((r) => esc(r)).join('<br>')}` : ''),
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
export function startkaartRijen(id) {
  const k = STARTKAART[id];
  if (!k) return [];
  const rijen = [['Doel', k.doel]];
  if (k.medailles) rijen.push(['Medailles', `brons ${k.medailles[0]} · zilver ${k.medailles[1]} · goud ${k.medailles[2]}`]);
  if (k.beloning) rijen.push(['Beloning', k.beloning]);
  return rijen;
}

// Eén regel voor de kaart-hover en "Te doen": doel plus de eerste medaille-eis.
export const startkaartRegel = (id) => {
  const k = STARTKAART[id];
  if (!k) return '';
  return `Doel: ${k.doel}`;
};
