// Spoken lines of the post-game (postgame.js and the pg_*.js challenges) as
// pure data, so scripts/voicelines_collect.mjs can read them in Node. All are
// recorded into the lines manifest (audio/voicelines/lines), keyed
// "<speaker>|<text>": Jelle Terpstra speaks Frisian-flavoured Dutch, his
// friendly-rival voice. Edit a line and it goes silent until it is recorded
// again (node scripts/tts_lines_list.mjs && python3 scripts/tts_lines.py).

export const JELLE = 'Jelle Terpstra';

// Jelle's taunts during a challenge, per challenge and moment (a subtitle
// with his voice). greet: when you walk up to one of his start markers.
export const JELLE_LINES = {
  greet: ['Moai! Noch in potsje, Grinzers?', 'Deze keer win ik. Wis en wrachtich.', 'Klaar voor de revanche, Grinzers?'],
  bruggen: {
    go: ['Ien, twa, trije... fuort!'],
    lead: ['Kijk maar naar mijn hekweach, Grinzer!', 'Deze brug is van mij. En de volgende ek.', 'Gas derop! Of is dat in trapfyts?'],
    behind: ['Wacht efkes! Mijn motor is nog koud!', 'Hoe vonden jullie dat gatsje?', 'Net slim. Ik laat jullie even voorgaan.'],
    win: ['Goed gevaren, hear. Net fertelle in Snits.', 'Alve brêgen. Jimme wiene better. Hjoed.'],
    lose: ['Elf bruggen, elf keer voor! Moai, hè?', 'Oefenje mar, Grinzers. Ik wachtsje.'],
  },
  fierljep: {
    jump: ['Sjoch en lear!', 'Deze is voor Fryslân!'],
    splash: ['Wiet! Die telt niet, hear!'],
    mark: ['Dat is de mjitte. Spring er maar overheen.', 'Beter dan dat wordt het niet, Grinzer.'],
    good: ['Hoe! Dat was net min.', 'Ferhip, die heeft geoefend.'],
    wet: ['Plons! Zwemmen kunnen jullie teminsten.', 'Te betiid los. Dat zie ik van hier.'],
    win: ['Verder dan ik. Dat seit gjinien troch, hear.', 'Moaie sprong. Ik ga naar huis en oefenen.'],
    lose: ['Fryslân wint! Maar jullie waren dichtbij.', 'Kom werom as jimme fleugels hawwe.'],
  },
  skutsje: {
    go: ['Seil los!'],
    lead: ['Een skûtsje heeft gjin motor nedich. Alleen fakmanskip.', 'Dyn seil klappert, Grinzer!', 'De wind is Frysk vandaag.'],
    behind: ['Hoe kan dat nou? Mijn seil staat goed!', 'Nee! Net oan myn hek komme!', 'Dat is gewoon gelok met de wind.'],
    win: ['Jullie kunnen zeilen. Ik skamje my in bytsje.', 'Windkracht en fakmanskip. Jullie hebben het allebei.'],
    lose: ['Sa silet in Fries! Moai oan de wyn.', 'Trim dat zeil, Grinzers. Dan praten we verder.'],
  },
};

// Start cutscenes (subtitles): [speaker, text]; 'J' = Jelle, 'T' / 'A'.
export const INTROS = {
  bruggen: [
    ['J', 'Moai, Grinzers! Elf bruggen, één rondje Diepenring. Wie het eerst terug is, wint.'],
    ['A', 'Elf bruggen? Dat doen wij op een dinsdag.'],
    ['J', 'Dan zien we jullie dinsdei wel achter mijn boat.'],
  ],
  fierljep: [
    ['J', 'Fierljeppen, Grinzers! Ik zet de mjitte, jullie springen eroverheen.'],
    ['T', 'Ik spring normaal alleen over een plas.'],
    ['J', 'Dan is dit in hiel grutte plas.'],
  ],
  skutsje: [
    ['J', 'Een echte skûtsjesiler heeft gjin motor nedich. Wind en fakmanskip.'],
    ['A', 'En een Groningse die niet van verliezen houdt.'],
    ['J', 'Van de Oosterhaven naar de Hoge der A. Wa\'t earst oankomt!'],
  ],
  fjord: [
    ['A', 'Onze eigen Fjord Frituur. Met kenteken, deze keer.'],
    ['T', 'En een meeuw op het dak. Zoals beloofd.'],
    ['A', 'Rij naar de drukte, zet hem stil en open het luik.'],
  ],
};

// Fjord Frituur customers: speech bubbles (voiced per sex, ~m/~f).
export const FJORD_BUBBLES = {
  greet: ['Moi! Ik heb honger.', 'Doe maar wat, snel graag!', 'Is dit die van Anita?', 'Wat ruikt dat lekker!', 'Ik sta hier al tien minuten. Grapje.', 'Moi! Doe mie mor n eierbal.', 'Kom op, mien jong, ik heb honger as n peerd.', 'Eindelijk een frituur op wielen!'],
  happy: ['Kon minder!', 'Heerlijk, dank je wel!', 'Tot morgen, hè!', 'De beste van Grunn.', 'Dat is goud spul, mien wicht!'],
  wrong: ['Dit heb ik niet besteld!', 'Frikandel? Ik zei kroket!', 'Nee, nee, nee. Opnieuw.'],
  leave: ['Laat maar, ik ga naar de Vismarkt.', 'Te lang, jong. Veel te lang.', 'Ik goa wel noar hoes. Stoet eten.'],
};

// Tammo and Anita during a Fjord Frituur shift: the companion says them
// (subtitle with their voice). T / A per moment.
export const FJORD_DUO = {
  open: { A: ['Luik open! Grunn heeft honger.', 'Vet is heet, de rij is lang. Kom op.'], T: ['Ik doe de mayo. Dat kan ik.', 'Luik open. Ik heb een schort om.'] },
  rush: { A: ['Het wordt druk! Tempo, tempo!'], T: ['Kijk die rij. Tot aan d\'Olle Grieze.'] },
  good: { A: ['Kassa! Dat was een goeie dienst.', 'Zie je dat? Dat is een tevreden Stadjer.'], T: ['We zijn rijk. Nou ja. Rijker.', 'Niemand klaagde. Dat is hier een compliment.'] },
  bad: { A: ['Morgen beter. We moeten nog inbakken.'], T: ['Een kroket is geen frikandel. Genoteerd.'] },
};
