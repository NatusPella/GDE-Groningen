// World life (21-11): the short speech-bubble lines of the daily events as pure data (no imports, so
// scripts/voicelines_collect.mjs can read them in Node). A few words each, funny and never mean; no real
// brands or people (constitution 2); Gronings only in small, careful doses ("moi", "kiek", "joh", "mien").
// Keys are the event ids of worldlife.js; `mensen` is what any person at that event says, `rol` adds lines per role.

export const LIFE_LINES = {
  markt: {
    mensen: ['Moi! Kom moar kieken, t kost niks.', 'Drie haring voor de prijs van twee, joh!', 'Vandoag vers: de vis, de kaas en mien praatjes.', 'Hai, wie wil der nog een tompouce van de vismarkt?', 'Pas op, de kist staat nog open.'],
    rol: { toerist: ['Is dit een echte haring of een kunstwerk?', 'Mag ik die proeven? Ik bedoel: eten.'] },
  },
  artiest: {
    mensen: ['Nog één nummer, dan stopt hij echt.', 'Is dit kunst? Ik denk van wel.', 'Een euro in de hoed, dat is ook een compliment.', 'Hij speelt vals, maar met overtuiging.', 'Mooi, joh! Doe t nog ais.'],
    rol: { toerist: ['Dit zet ik op mijn vakantiefilmpje.'] },
  },
  studentenfeest: {
    mensen: ['Wie heeft er nog iets koels? Voor de cola, hè.', 'Ik heb morgen tentamen. Dat is morgen.', 'Dit is geen feest, dit is netwerken.', 'Iemand nog een oplader? Voor mijn stem, bedoel ik.', 'Kiek, de zon komt er al aan. Of is dat de lamp?'],
    rol: { feestganger: ['Nog één rondje, dan ga ik naar huis.'] },
  },
  kermis: {
    mensen: ['Nog één ritje, dan stoppen we echt.', 'Mien suikerspin is groter dan joen suikerspin.', 'Wie heeft de zweefmolen vastgezet?', 'Ik win die knuffel. Dat zeg ik elk jaar.', 'Hai, de poffertjes ruiken weer naar vroeger.'],
    rol: { student: ['Eerst de botsauto, dan de colleges.'] },
  },
  wandelgroep: {
    mensen: ['Nog twee kilometer, zegt de gids.', 'Dat is een eend. Geloof ik.', 'Zullen we bij de volgende bank stoppen?', 'Moi! Mooi weertje voor een wandeling, hè.', 'Wie heeft er koffie in de thermos?'],
    rol: {},
  },
  hardloper: {
    mensen: ['Ik loop niet hard, ik loop vaak.', 'Nog één rondje. Dat zei ik net ook.', 'Moi! Niet kieken, ik hou t vol.', 'Mien horloge zegt dat ik rust moet nemen.', 'Hoe ver nog? Zeg maar niks.'],
    rol: {},
  },
  toerist: {
    mensen: ['Nog één foto, met de toren erbij!', 'Kun je me met de toren erop zetten?', 'Is dit nou Grunn? Het is prachtig.', 'Wacht, mijn duim zat ervoor.', 'Ze zeggen moi tegen iedereen. Ik zeg het ook maar.'],
    rol: {},
  },
};

// The bubbles of the animals are only text (no voice, no recording): duck, sheep, pigeon and swallow.
export const ANIMAL_LINES = {
  eend: ['Kwak.', 'Kwak kwak.', 'Kwek?'],
  schaap: ['Meeee.', 'Mè.', 'Meh.'],
  duif: ['Roekoe.', 'Roekoe-koe.'],
  zwaluw: ['Tswiet.'],
};
