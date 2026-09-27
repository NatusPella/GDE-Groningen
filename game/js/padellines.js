// What the padel opponents say during a match (padel.js), as speech
// bubbles. Pure data: scripts/voicelines_collect.mjs reads it in Node.
// Gronings lines get their Dutch subtitle from subtitles.js GRO.
//   PADEL_PAIR   the regulars on every court: Hinderk (m) and Grietje (f)
//   PADEL_TWINS  Durk and Douwe, in the story step 's-padel' (storyarc.js)
// Per speaker, per moment: start (before the first serve), score (they win
// a point), lose (you win a point), won (they win the match), lost.

export const PADEL_PAIR = {
  Hinderk: {
    female: false,
    start: ['Moi! Wie verliest, trakteert op n eierbal.'],
    score: ['Doe raakst hom nait eens, jong!', 'Tegen t glas, en weg is e!'],
    lose: ['Mazzel. Dat was puur mazzel.'],
    won: ['Kon minder, hè? Volgende keer beter.'],
    lost: ['Goed speuld. Ik trakteer wel.'],
  },
  Grietje: {
    female: true,
    start: ['Ik speul al padel doe nog in de luier lagst.'],
    score: ['Kiek, zo dust dat!', 'Nait soezen, bal is al vot!'],
    lose: ['Hé! Dat is nait eerlijk!'],
    won: ['Noar hoes, joe baaident. Oefenen!'],
    lost: ['Goed speuld, mien jong.'],
  },
};

export const PADEL_TWINS = {
  Durk: {
    female: false,
    start: ['Padel. Dat is tennis in een aquarium.'],
    score: ['Wij zijn groot. Het glas is klein.'],
    lose: ['Die bal ging te snel. Voor een bal.'],
    won: ['De baas wordt trots. Denk ik.'],
    lost: ['Niet tegen de baas zeggen.'],
  },
  Douwe: {
    female: false,
    start: ['Durk, de bal. De bal, Durk.'],
    score: ['Punt. Dat was mijn punt, Durk.'],
    lose: ['Ik zag hem wel. Ik was alleen te laat.'],
    won: ['We moeten fietsen, Durk. De sleutel.'],
    lost: ['We moeten weg, Durk. De sleutel.'],
  },
};
