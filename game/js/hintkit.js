// Contextual hints (#201), the pure part: a short text card the first time you
// get into a vehicle kind or start a minigame, each once per device, and
// never in the first quiet minutes of a game where onboarding.js is
// already explaining the goal. Text only (no voice). contexthints.js feeds it
// the world and shows the card; scripts/hintkit_test.mjs checks the logic.
//
// A card body may hold key tokens ({E}, {ESC}, ...): contexthints.js turns them
// into the player's own (rebound) key or the controller button.

// ms after the start of play in which no context hint appears: the first goal comes first
export const CALM_UNTIL = 600;
// seconds between two hints, so they never pile up (longer in the first ten minutes)
export const GAP = 40;
export const GAP_CALM = 90;
// a hint only starts when the player has been in it this long (a stray tap on E does not count)
export const SETTLE = 1.2;

// vehicle kind from the flags on a Vehicle (vehicle.js), most specific first
export function vehicleKind(v) {
  if (!v) return null;
  if (v.isHeli) return 'heli';
  if (v.isPlane) return 'vliegtuig';
  if (v.isBoat) return 'boot';
  if (v.isBus) return 'bus';
  if (v.model && v.model.name === 'tractor') return 'trekker';
  if (v.isScooter) return 'scooter';
  if (v.isBike) return v.model && v.model.fat ? 'fatbike' : 'fiets';
  if (v.model && v.model.motorbike) return 'motor';
  if (v.isTrailerRig || (v.model && v.model.name === 'truck')) return 'vracht';
  return 'auto';
}

export const HINTS = [
  { id: 'v-fiets', kind: 'vehicle', match: 'fiets', title: 'Op de fiets', body: 'Houd {SHIFT} ingedrukt om even flink door te trappen. Met {E} stap je weer af.' },
  { id: 'v-fatbike', kind: 'vehicle', match: 'fatbike', title: 'Fatbike', body: 'Dikke banden, hoge snelheid. Houd {SHIFT} ingedrukt om door te trappen; remmen doe je op tijd.' },
  { id: 'v-scooter', kind: 'vehicle', match: 'scooter', title: 'Op de scooter', body: 'Sturen en gas met {WASD}. Met {E} stap je af.' },
  { id: 'v-motor', kind: 'vehicle', match: 'motor', title: 'Motor', body: 'Met {SHIFT} en gas steigert hij; remmen met {SHIFT} geeft een stoppie. Doe dat liever niet in de stad.' },
  { id: 'v-boot', kind: 'vehicle', match: 'boot', title: 'Aan het roer', body: 'Gas en sturen met {WASD}. Een boot remt langzaam en glijdt door de bocht, dus begin op tijd. Uitstappen met {E} kan bij de wal.' },
  { id: 'v-bus', kind: 'vehicle', match: 'bus', title: 'Een bus', body: 'Lang en zwaar: neem bochten ruim en rem op tijd. Met {H} toeter je.' },
  { id: 'v-trekker', kind: 'vehicle', match: 'trekker', title: 'Trekker', body: 'Gas en sturen met {WASD}, rem met {SPACE}. Eigen werktuig: E koppelt, G aftakas, T hef, X los, R tankt diesel. In de bijbaan werkt de machine vanzelf op de rij.' },
  { id: 'v-vracht', kind: 'vehicle', match: 'vracht', title: 'Vrachtwagen', body: 'Lang, zwaar en traag in de bocht. Houd ruim afstand en neem bochten breed.' },
  { id: 'v-heli', kind: 'vehicle', match: 'heli', title: 'Helikopter', body: 'Omhoog met {SPACE}, omlaag met {CTRL}. Landen: laag en langzaam boven een vlak stuk, dan pas uitstappen met {E}.' },
  { id: 'v-vliegtuig', kind: 'vehicle', match: 'vliegtuig', title: 'Vliegtuig', body: 'Eerst snelheid maken, dan optrekken. Landen doe je laag, langzaam en recht op de baan.' },
  { id: 'v-auto', kind: 'vehicle', match: 'auto', title: 'Rijden', body: 'Gas, rem en sturen met {WASD}, handrem op {SPACE}, toeteren met {H}. Achterom kijken kan met {Q}.' },
  // minigames: world.activityGame is the id of the running one (activities.js)
  { id: 'm-discgolf', kind: 'minigame', match: 'discgolf', title: 'Discgolf', body: 'Gooi de schijf in de mand met zo min mogelijk worpen. Je loopt de ronde door het Stadspark; de uitleg staat tijdens het spelen in beeld.' },
  { id: 'm-pitchputt', kind: 'minigame', match: 'pitchputt', title: 'Pitch & putt', body: 'Zes korte banen: eerst pitchen, op de green putten. Zo min mogelijk slagen. De uitleg staat tijdens het spelen in beeld.' },
  { id: 'm-skatepark', kind: 'minigame', match: 'skatepark', title: 'Skatepark', body: 'Hellingen, leuningen en kunstjes. Ken je de toetsen niet, kijk dan naar de uitleg in beeld.' },
  { id: 'm-kartbaan', kind: 'minigame', match: 'kartbaan', title: 'Kartbaan', body: 'Drie ronden tegen drie rijders. Een schone bocht is sneller dan een harde.' },
  { id: 'm-zwembad', kind: 'minigame', match: 'zwembad', title: 'Zwembad', body: 'Baantjes zwemmen in het zwembad. De uitleg staat tijdens het zwemmen in beeld.' },
  { id: 'm-klimtoren', kind: 'minigame', match: 'klimtoren', title: 'Klimtoren', body: 'Twaalf meter klimmen, tegen de klok. Een val kost tijd, dus klim rustig en gelijkmatig.' },
  { id: 'm-vliegschool', kind: 'minigame', match: 'vliegschool', title: 'Vliegschool', body: 'Dertien korte lessen met het vliegtuig en de helikopter op Eelde, met een medaille per les. Kies een toestel en een les; de uitleg staat in beeld.' },
  { id: 'm-waterski', kind: 'minigame', match: 'waterski', title: 'Waterskiën', body: 'Achter de boot, over sprongen en langs boeien. De uitleg staat tijdens het skiën in beeld.' },
  { id: 'm-hengelen', kind: 'minigame', match: 'hengelen', title: 'Hengelen', body: 'Bij de steiger in Meerstad heb je negentig seconden: de zwaarste vangst telt. Overal aan het water kun je vrij hengelen met {I}; alles wat je vangt komt in je visboek.' },
  { id: 'm-carbid', kind: 'minigame', match: 'carbid', title: 'Carbid schieten', body: 'Melkbus, deksel en een flinke knal. Blijf zelf op afstand.' },
  { id: 'm-kermis', kind: 'minigame', match: 'kermis', title: 'Kermis', body: 'Botsautootjes: botsen mag. Stuur en trap het gas in.' },
  { id: 'm-wandeling', kind: 'minigame', match: 'wandeling', title: 'Wandeling', body: 'Vijf stempelposten langs het Pieterpad, tegen de klok.' },
];

// What is going on now, from the world, as plain data (world-free for tests).
export function situation(w) {
  const pl = (w && w.player) || {};
  return {
    vehicle: vehicleKind(pl.inVehicle),
    minigame: (w && w.activityGame) || null,
    wanted: (w && w.wanted) || 0,
    dead: !!(w && (w.health <= 0 || w.pendingRespawn)),
    paused: !!(w && w.paused),
  };
}

// Which hint to show now, or null.
// st: { vehicle, minigame, wanted, dead, paused } (situation()); seen: Set of ids;
// clock: { playT (s of play), lastAt (playT of the last hint, -Infinity at first), inT (s in the current vehicle/minigame) };
// opts: { enabled, busy } (the "Uitleg voor nieuwe spelers" setting; busy = something else has the player)
export function pickHint(st, seen, clock, opts = {}) {
  if (opts.enabled === false || opts.busy) return null;
  if (st.paused || st.dead || st.wanted > 0) return null;
  if (clock.inT < SETTLE) return null;
  const calm = clock.playT < CALM_UNTIL;
  if (clock.playT - clock.lastAt < (calm ? GAP_CALM : GAP)) return null;
  // in the first minutes only the lessons of onboarding.js; a vehicle is allowed once the first goal had its turn
  if (calm && clock.playT < 120) return null;
  for (const h of HINTS) {
    if (seen.has(h.id)) continue;
    if (h.kind === 'vehicle' && st.vehicle === h.match) return h;
    if (h.kind === 'minigame' && st.minigame === h.match) return h;
  }
  return null;
}

// The ids a player has seen, from the stored JSON (broken or foreign data is an empty set).
export function parseSeen(raw) {
  try {
    const d = JSON.parse(raw || '[]');
    return new Set(Array.isArray(d) ? d.filter((x) => typeof x === 'string' && HINTS.some((h) => h.id === x)) : []);
  } catch (e) {
    return new Set();
  }
}

export const serializeSeen = (seen) => JSON.stringify([...seen]);
