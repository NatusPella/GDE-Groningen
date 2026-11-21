// The Beppe arc as text (issue #1063): the first visit (where Tessa meets her),
// the visits while she lives, the quiet news, the farewell in the empty house and
// the memory notes afterwards. All of it is NEW and text-only: Beppe has no
// voice, so nothing here is spoken or needs a TTS round (docs/verhaal/
// TTS-ACHTERSTAND-21-11-alleen-tekst.md). Dutch, dry and warm, with a Frisian
// shade ("Goed ite" is the only Frisian, as in beppe_texts.js). No real names,
// brands or places beyond the real ones the game already uses.
//
// A script is a list of beats: { who, text } (who: 'beppe' | 'tammo' | 'tessa' |
// '' for the narrator) or { choice: [{ label, reply: [beats] }] }. The runner is
// beppe_boog_rules.js createRunner; the panel is beppe_gesprek.js.
//
// Care (constitution 6): her death is never shown and never a joke. No body, no
// medical picture. The tone after it is quiet: a candle, a chair, soup that is
// still there, and Tammo who does not say much.

export const NAME = { beppe: 'Beppe', tammo: 'Tammo', tessa: 'Tessa', '': '' };

// The first visit, with Tessa (she is there for the first time, Beppe sees them
// together and says what they are).
export const FIRST_VISIT = [
  { who: '', text: 'Je duwt de deur open. Het ruikt naar erwtensoep, kaneel en een fornuis dat nooit uit lijkt te gaan.' },
  { who: 'beppe', text: 'Daar is hij. Mijn jongen. Kom hier.' },
  { who: '', text: 'Ze slaat haar armen om Tammo heen. Hij laat het gebeuren. Eigenlijk laat hij het best graag gebeuren.' },
  { who: 'tammo', text: 'Dag, beppe.' },
  { who: 'beppe', text: 'Dag, beppe. Twee woorden. Dat heeft hij van zijn opa. Die zei ook niets en at alles op.' },
  { who: 'beppe', text: 'En wie is dit? Kom binnen, kind, je staat in de tocht.' },
  { who: 'tessa', text: 'Tessa. Dag mevrouw.' },
  { who: 'beppe', text: 'Mevrouw. Hoor hem, Tammo. Ik ben beppe, voor iedereen. Waar kom jij vandaan, Tessa?' },
  { choice: [
    { label: 'Van een boerderij, met koeien en alles.', reply: [
      { who: 'beppe', text: 'Koeien. Hoor je dat, Tammo? Een meisje met verstand.' },
    ] },
    { label: 'Van het platteland. Ik kan nog steeds melken.', reply: [
      { who: 'beppe', text: 'Nog steeds? Dat verleer je niet. Dat zit in je polsen.' },
    ] },
    { label: 'Lang verhaal. Vooral veel koeien.', reply: [
      { who: 'beppe', text: 'Dan is het geen lang verhaal. Dan is het een goed verhaal.' },
    ] },
  ] },
  { who: 'tessa', text: 'Voor schooltijd, elke ochtend. Een koe wacht niet op een plan.' },
  { who: 'beppe', text: 'Nee. Een koe wacht op eten. Wij ook. Zet je tas maar neer.' },
  { who: '', text: 'Ze kijkt van de een naar de ander. Tammo kijkt naar zijn schoenen. Tessa kijkt naar Tammo.' },
  { who: 'beppe', text: 'Jullie zijn vrienden. Dat zie ik zo. Niet aan wat jullie zeggen, maar aan hoe jullie niet naast elkaar gaan staan.' },
  { who: 'tammo', text: 'Beppe...' },
  { who: 'tessa', text: 'Ja. Dat zijn we.' },
  { who: '', text: 'Ze zegt het zonder grap, voor één keer. Tammo zegt niets, maar hij staat er opeens iets rechter bij.' },
  { who: 'beppe', text: 'Goed. Dan is het goed. Er is soep. Er is altijd soep.' },
  { who: 'beppe', text: 'En kom terug. Niet pas als het moet.' },
];

// The visits while she lives: a short greeting (by how many visits there were,
// and by who is playing: she asks after the other one), one remark (a note from
// beppe_visit_texts.js BEATS, chosen by act, time and weather), sometimes a tip,
// and a goodbye. At most a few short lines.
export const GREETING = {
  second: [
    'Daar ben je weer. Je hebt het gevonden zonder te bellen. Goed zo.',
    'Alweer? Dan was de vorige keer geen toeval.',
  ],
  often: [
    'Je komt vaak. Dat staat me wel aan. De stoel is nog warm.',
    'Kijk eens aan. Ik had net iets te veel gemaakt. Dat doe ik altijd, dus dat is geen kunst.',
  ],
  askTessa: [
    'En Tessa? Eet ze genoeg? Zo\'n slim meisje vergeet dat soms.',
    'Hoe gaat het met Tessa? Ze heeft goede handen, dat zag ik meteen.',
  ],
  askTammo: [
    'En Tammo? Zegt hij nog steeds niets? Dan is het goed.',
    'Tessa. Alleen vandaag? Waar is mijn jongen? Hij heeft vast weer een gebaar gemaakt in plaats van een zin.',
  ],
};
export const GOODBYE = [
  'Doe de groeten. En kom terug.',
  'Goed ite. Dat is geen vraag.',
  'Rij voorzichtig. De koeien staan overal.',
  'Neem wat koek mee. Nee, neem het.',
];
export const REPLY = { stay: 'Even blijven zitten', thanks: 'Dank je, beppe', go: 'Ik ga weer' };

// The news, once, when it happens during play (a save that is already past it
// never sees it: the house is simply a memory there). A phone text, not a scene.
export const NEWS = {
  from: 'Tante Aaltje',
  text: 'Beppe is vannacht rustig ingeslapen. Het huis blijft open, voor wie even langs wil.',
  card: { kicker: 'Beppe', title: 'Rustig ingeslapen', body: 'Tammo zegt niets. Dat is ook een manier. Het huis aan de westgrens staat open.' },
};

// The reminders before it, while she is alive: she asked after them.
export const NUDGE = {
  first: { from: 'Tammo', text: 'Beppe vroeg of we nog langskomen. Ze zegt dat de soep anders over de datum gaat.' },
  second: { from: 'Tammo', text: 'Beppe vroeg weer naar je. Ga je nog een keer mee? Ze kijkt steeds naar de deur.' },
};

// The farewell: the first visit to the house after the news. She is no longer
// there. Quiet; nothing is explained and nothing is made a joke.
export const FAREWELL_SCENE = [
  { who: '', text: 'Het huis is stil. De stoel bij het raam staat leeg. Op tafel brandt een kaarsje dat iemand heeft aangestoken.' },
  { who: '', text: 'De foto\'s staan op de kast. Op het prikbord hangt een briefje in haar handschrift: "Soep staat op het fornuis. Pak maar. B."' },
  { who: 'tammo', text: 'Ze maakte altijd te veel.' },
  { who: 'tessa', text: 'Er is nog genoeg.' },
  { who: '', text: 'Tessa pakt zijn hand niet. Ze gaat gewoon naast hem staan. Dat is genoeg.' },
  { who: '', text: 'Goed ite, zegt het plaatje op het bankje buiten. Eet goed. Er was altijd een bordje extra.' },
];

// What the house says afterwards: memory notes, "wat Beppe zou zeggen", in her
// voice but as paper on the table, not as speech. Short and warm.
export const MEMORY = [
  { id: 'm-1', act: 'kop', text: 'Eet iets. Een lege maag heeft nog nooit iemand gelukkig gemaakt.' },
  { id: 'm-2', act: 'kop', text: 'Wat je ook doet: doe je jas aan als het regent.' },
  { id: 'm-3', act: 'kop', text: 'Je hoeft niets te zeggen. Zitten is ook gezelschap.' },
  { id: 'm-4', act: 'kop', who: 'tammo', text: 'Tammo. Je mag praten. Het raam gaat er niet van kapot.' },
  { id: 'm-5', act: 'kop', who: 'anita', text: 'Tessa, kind. Een plan is mooi, maar eerst eten.' },
  { id: 'm-6', act: 'kop', time: 'avond', text: 'Het wordt donker. Laat een lamp aan voor wie nog onderweg is.' },
  { id: 'm-7', act: 'kop', time: 'ochtend', text: 'Een goede ochtend begint met een warm bord. De rest komt vanzelf.' },
  { id: 'm-8', act: 'kop', weather: 'regen', text: 'Regen. Zet je schoenen bij het fornuis en blijf nog even.' },
  { id: 'm-9', act: 'romp', text: 'Het Noorden is groot. Je hoeft het niet in één dag af te leggen.' },
  { id: 'm-10', act: 'staart', text: 'Wie veel verliest, moet veel eten. Daar is niets zwaks aan.' },
  { id: 'm-11', act: 'ontzet', text: 'Je hebt veel gedragen. Zet het even neer. Soep.' },
  { id: 'm-12', act: 'nazomer', text: 'Het was een goede zomer. Ik zeg dat niet vaak. Zet daar maar een streepje bij.' },
];
export const MEMORY_UI = {
  prompt: 'Briefje lezen', sub: 'Een briefje in haar handschrift', kicker: 'Wat Beppe zou zeggen',
  stove: 'Er staat nog een bord klaar. Je weet wie dat deed.',
  stoveDone: 'Vandaag heb je al gegeten. Het bord blijft staan.',
};

// Now and then, very rarely, the two of them remember her in a small thing: one
// text per step, once per save, after that step is done (never before it).
export const ECHOES = [
  { id: 'e-m09', step: 'M09', from: 'Tammo', text: 'Beppe had hier iets over gezegd. Ik weet niet meer wat. Iets met eten.' },
  { id: 'e-m16', step: 'M16', from: 'Tessa', text: 'Ik heb vandaag soep gemaakt. Het was niet als bij Beppe. Maar het was soep.' },
  { id: 'e-m24', step: 'M24', from: 'Tammo', text: 'Als beppe dit zag, zei ze dat we moeten eten. Dus ik denk dat we moeten eten.' },
];
