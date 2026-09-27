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
  greet: ['Moai! Noch in potsje, Grinzers?', 'Dit kear win ik. Wis en wrachtich.', 'Klear foar de revanche?'],
  bruggen: {
    go: ['Ien, twa, trije... fuort!'],
    lead: ['Sjoch myn hekweach mar, Grinzer!', 'Dizze brêge is fan my. En de folgjende ek.', 'Gas derop! Of is dat in trapfyts?'],
    behind: ['Wachtsje efkes! Myn motor is noch kâld!', 'Hoe fûnen jimme dat gatsje?', 'Net slim. Ik lit jimme efkes foargean.'],
    win: ['Goed farre, hear. Net fertelle yn Snits.', 'Alve brêgen. Jimme wiene better. Hjoed.'],
    lose: ['Alve brêgen, alve kear foar! Moai, hè?', 'Oefenje mar, Grinzers. Ik wachtsje.'],
  },
  fierljep: {
    jump: ['Sjoch en lear!', 'Dizze is foar Fryslân!'],
    splash: ['Wiet! Dy telt net, hear!'],
    mark: ['Dat is de mjitte. Spring der mar oerhinne.', 'Better as dat wurdt it net, Grinzer.'],
    good: ['Hoe! Dat wie net min.', 'Ferhip, dy hat oefene.'],
    wet: ['Plons! Swimme kinne jimme teminsten.', 'Te betiid los. Dat sjoch ik fan hjir.'],
    win: ['Fierder as ik. Dat seit gjinien troch, hear.', 'Moai sprong. Ik gean nei hûs en oefenje.'],
    lose: ['Fryslân wint! Mar jimme wiene tichtby.', 'Kom werom as jimme fleugels hawwe.'],
  },
  skutsje: {
    go: ['Seil los!'],
    lead: ['In skûtsje hat gjin motor nedich. Allinnich fakmanskip.', 'Dyn seil klappert, Grinzer!', 'De wyn is Frysk hjoed.'],
    behind: ['Hoe kin dat no? Myn seil stiet goed!', 'Nee! Net oan myn hek komme!', 'Dat is gewoan gelok mei de wyn.'],
    win: ['Jimme kinne sile. Ik skamje my in bytsje.', 'Wynkracht en fakmanskip. Jimme hawwe it allebeide.'],
    lose: ['Sa silet in Fries! Moai oan de wyn.', 'Trim dat seil, Grinzers. Dan prate wy fierder.'],
  },
};

// Start cutscenes (subtitles): [speaker, text]; 'J' = Jelle, 'T' / 'A'.
export const INTROS = {
  bruggen: [
    ['J', 'Moai, Grinzers! Alve brêgen, ien rûntsje Diepenring. Wa\'t earst werom is, wint.'],
    ['A', 'Elf bruggen? Dat doen wij op een dinsdag.'],
    ['J', 'Dan sjogge wy jimme dinsdei wol efter myn boat.'],
  ],
  fierljep: [
    ['J', 'Fierljeppe, Grinzers! Ik set de mjitte, jimme springe der oerhinne.'],
    ['T', 'Ik spring normaal alleen over een plas.'],
    ['J', 'Dan is dit in hiel grutte plas.'],
  ],
  skutsje: [
    ['J', 'In echte skûtsjesiler hat gjin motor nedich. Wyn en fakmanskip.'],
    ['A', 'En een Groningse die niet van verliezen houdt.'],
    ['J', 'Fan de Oosterhaven nei de Hoge der A. Wa\'t earst oankomt!'],
  ],
  fjord: [
    ['A', 'Onze eigen Fjord Frituur. Met kenteken, deze keer.'],
    ['T', 'En een meeuw op het dak. Zoals beloofd.'],
    ['A', 'Rij naar de drukte, zet hem stil en open het luik.'],
  ],
};

// Fjord Frituur customers: speech bubbles (voiced per sex, ~m/~f).
export const FJORD_BUBBLES = {
  greet: ['Moi! Ik heb honger.', 'Doe maar wat, snel graag!', 'Is dit die van Anita?', 'Wat ruikt dat lekker!', 'Ik sta hier al tien minuten. Grapje.', 'Eindelijk een frituur op wielen!'],
  happy: ['Kon minder!', 'Heerlijk, dank je wel!', 'Tot morgen, hè!', 'De beste van Grunn.'],
  wrong: ['Dit heb ik niet besteld!', 'Frikandel? Ik zei kroket!', 'Nee, nee, nee. Opnieuw.'],
  leave: ['Laat maar, ik ga naar de Vismarkt.', 'Te lang, jong. Veel te lang.', 'Ik ga wel naar huis. Brood eten.'],
};

// Tammo and Anita during a Fjord Frituur shift: the companion says them
// (subtitle with their voice). T / A per moment.
export const FJORD_DUO = {
  open: { A: ['Luik open! Grunn heeft honger.', 'Vet is heet, de rij is lang. Kom op.'], T: ['Ik doe de mayo. Dat kan ik.', 'Luik open. Ik heb een schort om.'] },
  rush: { A: ['Het wordt druk! Tempo, tempo!'], T: ['Kijk die rij. Tot aan d\'Olle Grieze.'] },
  good: { A: ['Kassa! Dat was een goeie dienst.', 'Zie je dat? Dat is een tevreden Stadjer.'], T: ['We zijn rijk. Nou ja. Rijker.', 'Niemand klaagde. Dat is hier een compliment.'] },
  bad: { A: ['Morgen beter. We moeten nog inbakken.'], T: ['Een kroket is geen frikandel. Genoteerd.'] },
};
