// Player-facing text for a visit to Beppe's house (issue #1063). All of it is
// new, text-only (nothing here is voiced, so no TTS round is needed). Beppe is
// a fictional Frisian grandmother (see beppe_texts.js); she is no living
// character in the game: what she says comes as notes in her house (a note on
// the kitchen table, a pinboard, the pan on the stove), in the same quiet
// register as the tribute. No spoilers: every beat belongs to an act and is
// only used once the player has reached that act (beppe_visit_rules.js).

// The invitation: one phone text from Tammo as soon as the house opens.
export const INVITE = {
  from: 'Tammo',
  text: 'Mijn beppe woont net over de westgrens, bij Visvliet. De deur staat altijd open en er is altijd soep. Kom een keer mee langs.',
  card: { title: 'Beppes huis staat open', body: 'Aan de westgrens. Soep, een briefje en soms een tip. Kom gerust vaker.' },
};

// "Te doen" and the map marker once the house is open.
export const OPEN = {
  sub: 'Aan de westgrens · altijd open',
  todoText: "De deur van Beppes huis staat open. Binnen is er soep op het fornuis, een briefje op tafel en een prikbord met tips. Elke dag mag je één keer eten, en elk bezoek ligt er iets nieuws.",
};

// The door and the room.
export const DOOR = {
  prompt: 'Naar binnen',
  promptSub: 'Beppes huis, de deur staat open',
  firstTitle: 'Kom maar binnen',
  firstBody: 'Het ruikt naar soep en oud hout. Op de keukentafel ligt een briefje: "Pak maar. Er is altijd genoeg. B."',
  leavePrompt: 'Naar buiten',
  leaveSub: 'Terug naar de veranda',
};

// The three things to use inside.
export const STOVE = {
  prompt: 'Soep',
  promptReady: 'De pan staat nog warm',
  promptDone: 'Vandaag heb je al gegeten',
  title: 'Soep van Beppe',
  eat: 'Je schept een bord erwtensoep op en eet het staand op. Je voelt je een stuk beter.',
  eatFull: 'Je hebt geen honger, maar een bordje past er altijd bij.',
  cookie: 'Er ligt een koek in je zak. En een briefje: "Voor onderweg."',
  done: 'Het bord van vandaag staat al in de afwas. Morgen is er weer soep.',
};
export const TABLE = { prompt: 'Briefje lezen', sub: 'Er ligt een briefje op de keukentafel', kicker: 'Briefje op tafel' };
export const BOARD = { prompt: 'Prikbord', sub: 'Briefjes en een kaartje', kicker: 'Op het prikbord' };

// The soup: health plus a little pocket money; both small on purpose.
export const SOUP = { heal: 30, cookieMoney: 10 };

// A note on the table. act: the first act in which the player may read it
// (kop < romp < staart < zuid < ontzet < nazomer); who: 'tammo' or 'anita'
// (Tessa) when it speaks to that player; time: 'ochtend' | 'middag' |
// 'avond' | 'nacht'; weather: 'regen'. A beat with a condition is preferred
// when the condition holds and never shown when it does not.
export const BEATS = [
  // akte 1
  { id: 'kop-1', act: 'kop', text: 'Doe je schoenen maar niet uit. Het kleed heeft het zwaarder gehad.' },
  { id: 'kop-2', act: 'kop', text: 'Wie niet eet, kan niet fietsen. Dat is geen spreekwoord, dat is gewoon zo.' },
  { id: 'kop-3', act: 'kop', text: 'Er is genoeg. Er is altijd genoeg. Zeg dat maar tegen wie het vraagt.' },
  { id: 'kop-tammo', act: 'kop', who: 'tammo', text: 'Jongen, je jas zit scheef. Zo ga je de deur niet uit. Eerst eten.' },
  { id: 'kop-tessa', act: 'kop', who: 'anita', text: 'Tessa, kind. Ga zitten. Ik zie dat je weer een plan hebt. Eet eerst.' },
  { id: 'kop-ochtend', act: 'kop', time: 'ochtend', text: 'Vroeg op? Dan heb je recht op twee koeken. Eén is voor de weg.' },
  { id: 'kop-middag', act: 'kop', time: 'middag', text: 'Het is middag. De pan staat er nog. Zo gaat dat hier al veertig jaar.' },
  { id: 'kop-avond', act: 'kop', time: 'avond', text: 'De zon gaat onder en de soep nog niet. Blijf niet te lang weg.' },
  { id: 'kop-nacht', act: 'kop', time: 'nacht', text: 'Het is nacht. Wie nu nog rondrijdt, heeft een goede reden of een slechte. Soep?' },
  { id: 'kop-regen', act: 'kop', weather: 'regen', text: 'Het regent. Goed voor de tuin, slecht voor je schoenen. Zet ze maar bij het fornuis.' },
  // akte 2
  { id: 'romp-1', act: 'romp', text: 'Het Noorden is groot, zeggen ze. Het is ook nat. Neem een jas mee.' },
  { id: 'romp-2', act: 'romp', text: 'Wie veel rijdt, moet veel eten. Zo simpel is het. Pak een bord.' },
  { id: 'romp-3', act: 'romp', text: 'Je loopt anders dan vorige keer. Sneller. Dat is niet altijd beter.' },
  { id: 'romp-tammo', act: 'romp', who: 'tammo', text: 'Tammo zegt weinig. Dat heeft hij van mij. Wij praten als er iets te zeggen valt.' },
  { id: 'romp-tessa', act: 'romp', who: 'anita', text: 'Tessa, je praat sneller dan de wind. Eet tussendoor, dan kom je ook ergens.' },
  // akte 3
  { id: 'staart-1', act: 'staart', text: 'Het water hier is niet alleen om naar te kijken. Blijf aan de kant als het hoog staat.' },
  { id: 'staart-2', act: 'staart', text: 'Het gaat wat worden, merk ik. Je neemt minder koek mee en meer verhalen.' },
  { id: 'staart-regen', act: 'staart', weather: 'regen', text: 'Regen op het dak. Zo hoort het, als je binnen zit met soep.' },
  // akte 4
  { id: 'zuid-1', act: 'zuid', text: 'Je komt van ver, zie ik aan je schoenen. Zuidwaarts, zeker. Zet ze bij het fornuis.' },
  { id: 'zuid-2', act: 'zuid', text: 'Het hoeft niet allemaal in één dag. De tuin doet er ook een seizoen over.' },
  // akte 5
  { id: 'ontzet-1', act: 'ontzet', text: 'Je ziet er moe uit, kind. Dat is geen schande. Eerst een bord, dan de rest.' },
  { id: 'ontzet-2', act: 'ontzet', text: 'Wat het ook is: het gaat over als je het samen doet. Dat is mijn hele les.' },
  // nazomer
  { id: 'nazomer-1', act: 'nazomer', text: 'De tuin geeft meer dan wij op kunnen. Neem mee wat je kwijt kunt, al is het een praatje.' },
  { id: 'nazomer-2', act: 'nazomer', text: 'Het is een mooie zomer geweest. Dat zeg ik niet vaak. Zet daar maar een streepje bij.' },
  { id: 'nazomer-avond', act: 'nazomer', time: 'avond', text: 'Een late zomeravond, een warme pan en een lege stoel voor wie komt. Goed ite.' },
];

// A tip or a rumour about the world, from the pinboard. Every one points at
// something that exists in the game from the act in which it is told.
export const TIPS = [
  { id: 'tip-eierballen', act: 'kop', text: 'Er liggen eierballen verstopt in Stad, hoor ik. Dertig. Ik zoek ze niet. Mijn knieën wel.' },
  { id: 'tip-bankjes', act: 'kop', text: 'Sommige bankjes in Stad hebben een plaatje. Lees ze. Daar staat vaak het beste wat iemand te zeggen had.' },
  { id: 'tip-martinitoren', act: 'kop', text: 'De buurman zegt dat er een deurtje zit in de Martinitoren. Hij zegt ook dat hij ooit de loterij won.' },
  { id: 'tip-automaat', act: 'kop', text: 'Ergens in een steegje zou een muur zitten die eierballen geeft. Ik heb het niet gezien, ik weet het van horen zeggen.' },
  { id: 'tip-eendjes', act: 'kop', text: 'In het Noorderplantsoen racen badeendjes. Er wordt op gewed. Zet nooit je hele geld op een eend.' },
  { id: 'tip-bieten', act: 'romp', text: 'Bij Hoogkerk zoeken ze handen voor de bieten. Het betaalt, en je rug merkt het.' },
  { id: 'tip-rust', act: 'kop', text: 'Het bankje bij het hek is er voor jou. Ga er even zitten, dan zorgt het wel voor de rest.' },
];

// The cards: the soup and the note.
export const CARD = {
  kicker: 'Beppe',
  fullLine: 'Je gezondheid is weer vol.',
};
