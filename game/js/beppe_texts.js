// Player-facing text for the Beppe tribute: a fictional Frisian grandmother
// ("beppe" is the Frisian word for grandmother, a role name, not a real
// person). No real name, address, date or illness appears here (constitution
// 2 and 4). Frisian lines always carry their Dutch on the same card; spoken
// lines get their Dutch through subtitles.js while they are voiced
// (constitution 1).

export const BEPPE_SIGN = 'Beppe';
export const ROAD_SIGN = 'Kollum';

// The last bench of Grunn, on the last Groningen spot of the western road.
export const LAST_BENCH = {
  plaque: 'Goed ite!',
  plaqueNl: 'Eet goed.',
  cardTitle: 'Goed ite!',
  cardBody: 'Met een lange oe. En er was altijd een bordje extra.',
  promptLabel: 'Plaatje lezen',
  promptSub: 'Er zit een koperen plaatje op dit bankje.',
};

// The fictional house at the edge of the playable map, just over the border.
export const HOUSE_ARRIVAL = {
  title: 'Beppes huis',
  body: 'Aan het einde van de weg, net over de grens. De vogels weten het al.',
};

// "Te doen" entry (group Ommeland) and the waypoint the map marker offers.
export const TODO = {
  key: 'om:beppe',
  title: HOUSE_ARRIVAL.title,
  sub: 'Aan de westgrens',
  meta: 'Aan de westgrens · het laatste bankje van Grunn en de tuin met de duiven',
  kicker: 'Ommeland · eerbetoon',
  text: 'Waar de weg naar Kollum de provincie verlaat staat het laatste bankje van Grunn. Even verder, net over de grens, een klein huis tussen de tuin en de vogels. Ga erheen en lees het plaatje.',
  done: 'Gevonden aan de westgrens.',
};

// The quiet layer: her hope in Frisian, the maker's answer in Dutch — glad she
// finds support, without claiming or denying her hope (owner, 13-11).
export const REMEMBRANCE = {
  title: 'In herinnering',
  body: 'Aan wie altijd een bordje extra had.',
  her: { fries: 'Ik hoopje dat der in himel is.', nl: 'Ik hoop dat er een hemel is.' },
  hope: 'Ik ben blij voor je dat je daar steun uit haalt.',
  certain: 'En dit weet ik zeker: je hebt nooit iemand met honger laten zitten.',
  closing: { fries: 'Goed ite!', nl: 'Eet goed.' },
  promptLabel: 'Even lezen',
  promptSub: 'In herinnering',
  // The bench as a rest stop: Beppe makes sure you want for nothing.
  gift: 'Beppe zorgt dat je niets tekortkomt: je gezondheid is weer vol, al je voertuigen zijn heel en je hebt al je wapens.',
  giftShort: 'Goed eten. Je bent weer helemaal fit.',
};

// Spoken lines for the character (phase 2, recorded by the owner in the TTS
// round); subtitles.js carries the Dutch while they are being voiced.
export const HOUSE_LINES = [
  { fries: 'Goed ite, jonge!', nl: 'Eet goed, jongen.' },
  { fries: 'Kom mar yn.', nl: 'Kom maar binnen.' },
  { fries: 'De fûgels binne der al.', nl: 'De vogels zijn er al.' },
];
