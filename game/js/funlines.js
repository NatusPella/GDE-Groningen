// What is said at the free-roam activities and on the car radio: carbid
// schieten (carbid.js), the botsautootjes on the kermis (kermis.js) and the
// talk station Radio Grunn (radiostations.js). Pure data:
// scripts/voicelines_collect.mjs reads these tables in Node. Gronings lines
// get their Dutch subtitle from subtitles.js GRO.

// The two farmers at the carbid field, as speech bubbles. Per moment:
// start, early (lit too soon: a weak plof), late (the gas escaped), good
// (a full knal), hit (the lid hits a target), miss, end (after the last
// shot: good or poor).
export const CARBID_CAST = {
  Roelf: { female: false, voice: 'Charon', who: 'oude Groningse boer op zijn erf, praat plat Gronings, nuchter en droog' },
  Hilje: { female: true, voice: 'Despina', who: 'Groningse boerin op leeftijd, praat plat Gronings, ad rem' },
};

export const CARBID_LINES = {
  Roelf: {
    start: ['Moi! De melkbus ligt kloar. Nait te veul wotter, hè.', 'Kom mor gaauw, t wordt al schemerg.'],
    early: ['Te vroug, jong. Dat was n scheetje.'],
    late: ['Te loat! t Gas is der al oet.'],
    good: ['Wat n knaal!', 'Kiek uut, hai gaait!'],
    hit: ['Midden in de baal!', 'Raak! Dat heurt ze in Winsum.'],
    miss: ['Mis. Mor t geluud was goud.'],
    endGood: ['Kon minder.'],
    endPoor: ['Volgend joar beter. Of t joar doarnoa.'],
  },
  Hilje: {
    start: ['Doe mor normaal, den dousto al gek genog.'],
    early: ['Wacht nou ais even op t gas!'],
    late: ['Doe stoist te soezen, jong.'],
    good: ['Hai vlugt! Hai vlugt!'],
    hit: ['Dat ton ligt om! Mooi zo.'],
    miss: ['Dat deksel ligt nou bie de buurman.'],
    endGood: ['Doar kinnen ze in Stad nog wat van leren.'],
    endPoor: ['t Was gezellig. Dat is ook wat.'],
  },
};

// Kermisbaas Jan at the botsautotent and the other drivers in the bumper cars.
export const KERMIS_CAST = {
  Jan: { female: false, voice: 'Zubenelgenubi', who: 'luidruchtige Groningse kermisbaas achter de microfoon van de botsauto\'s, joviaal' },
};

export const KERMIS_LINES = {
  Jan: {
    start: ['Instappen, instappen! Botsen mag, kopstoten nait!', 'Nog één rondje! Wie dut mit?'],
    // the story ride (storyarc.js r-kermis): free, Durk & Douwe in two of the cars
    story: ['Gratis rondje, jong! Bots die twij reuzen mor oet mien baan.'],
    last: ['Leste rondje, mensen!'],
    end: ['Afstappen, de tied is om!'],
  },
};

// Sikkom on the first kermis evening of a day (read aloud like other news).
export const KERMIS_NEWS = "Kermis op de Grote Markt! Botsauto's, suikerspin en een reuzenrad tot diep in de nacht.";

// The other drivers in the bumper cars (bubbles, any voice).
export const BOTS_BUMPED = ['Au, mien nek!', 'Hé! Kiek toch uut!', 'Ik krieg die wel!'];
export const BOTS_HIT = ['Hebbes!', 'Ha! Raak!'];

// Durk & Douwe in the story ride (bubbles in their own voices): when you bump
// them and when they bump you.
export const KERMIS_TWINS = {
  durk: { bumped: ['Hé! Niet zo hard, wij zijn groot!', 'Douwe, de duif rijdt achter ons!'], hit: ['Hebbes, duif!'] },
  douwe: { bumped: ['Durk, ik word misselijk.', 'Baas zei niks over botsen.'], hit: ['Sorry. …Hè.'] },
};

// Radio Grunn: the talk station on the car radio. Geesje presents; between
// her bits run the Sikkom news, the traffic, the cows and Rikus's
// Nachtstreek lines that already have a recording.
export const RADIO_HOST = 'Geesje (Radio Grunn)';
export const RADIO_GRUNN = {
  ident: [
    'Radio Grunn. Proatradio veur Stad en Ommeland.',
    'Je luistert naar Radio Grunn. Gewoon weer een dag in Stad.',
    'Radio Grunn. Wij zeggen wat er is, en niet meer dan dat.',
  ],
  news: ['Eerst het nieuws, van Sikkom.', 'Nog meer nieuws. Sikkom weet het altijd eerder.'],
  traffic: ['Dan het verkeer.'],
  cows: ['En dan de koeien. Ja, die hebben ook een mening.'],
  rikus: ['Rikus van Nachtstreek stuurde ons er nog eentje.'],
  weatherSun: ['Het weer: droog, met kans op wind. Zoals altijd.'],
  weatherRain: ['Het weer: regen. Je bent in Grunn, wat had je dan gedacht.'],
  ads: [
    'Reclame. Garage Knalpot: wij repareren alles, behalve je rijstijl.',
    'Reclame. EIKEA: zelf in elkaar zetten, zelf het schroefje zoeken.',
    'Reclame. Pomp en Poets: tanken, wassen, en een praatje over het weer.',
    'Reclame. De eierbal: rond, heet en Gronings. Bij elke snackbar in Stad.',
  ],
};
