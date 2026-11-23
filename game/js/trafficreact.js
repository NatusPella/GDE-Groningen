// Het verkeer reageert op hoe een speler rijdt (#1315, epic Levende stad): wie vlak voor een auto invoegt krijgt een
// toeter, wie op de verkeerde weghelft op een auto af komt ziet hem uitwijken naar de stoeprand en hoort een lange toeter,
// en wie rakelings langs een auto scheurt krijgt een boos gebaar van de bestuurder achter het stuur. Voetgangers schrikken
// van een auto op de stoep en springen opzij; terrasgasten ook.
// Aanvulling op hornreact.js (de speler toetert zelf) en trafficyield.js (sirenes): dit is de andere kant, het verkeer
// zegt iets terug. Remmen voor een auto in de baan doet vehicle/traffic.js al (followSpeedLimit); hier komt alleen bij
// wat je hoort en ziet. Geen geweld: een toeter, een vuist in de lucht, een opmerking.
//
// Pure regels op platte velden, Node-safe, zonder wereld of klok: scripts/trafficreact_test.mjs rekent ze na.
// Toeval (roll 0..1) komt van de aanroeper.
//
// Samen spelen: van de wereld van wie het spel opende. De host rekent het uit voor elk voertuig met een mens achter het stuur
// (driver === 'player', de host en de gasten; hornreact.js drivenVehicles). Een gast ziet de uitwijkende auto en hoort de
// toeter via de gewone snapshot (plek en toetervlag) en ziet de voetgangers opzij springen; het boze gebaar van de bestuurder
// is beeld bij wie het spel opende (de bestuurdersfiguur wordt per apparaat getekend). Geen beloning, geen voortgang.

export const REACT = {
  scan: 36,          // m: verder weg denkt een AI-bestuurder niet na over de speler
  cutInAhead: 9,     // m voor de neus: zo dicht invoegen is snijden
  cutInLat: 1.9,     // m opzij: in dezelfde baan
  cutInClosing: 2,   // m/s: de auto achter de speler rijdt harder (moet remmen)
  headOnReach: 34,   // m vooruit: een tegenligger in de eigen baan
  headOnLat: 2.2,
  headOnClosing: 6,  // m/s naderingssnelheid
  nearGap: 0.9,      // m tussen de carrosserieën: rakelings
  nearSpeed: 9,      // m/s verschilsnelheid bij het passeren
  cooldown: 7,       // s tussen twee reacties van dezelfde bestuurder
  honkCutIn: 0.7,    // s toeter bij snijden
  honkHeadOn: 1.6,   // s lange toeter bij een spookrijder
  gesture: 2.4,      // s boos gebaar
  swerveHold: 2.2,   // s naar de stoeprand
};

// Temperament per voertuig, vast (zelfde auto reageert twee keer hetzelfde): de meesten toeteren, sommigen maken ook een
// gebaar, een paar laten het gaan. Politie, bussen en fietsers toeteren niet en gebaren niet (een fietser belt; dat is
// de fietsbel van vehicle/twowheeler.js, niet hier).
export function temperOf(id) {
  const k = (((id | 0) * 7 + 3) % 10 + 10) % 10;
  return k < 5 ? 'toeter' : k < 8 ? 'boos' : 'kalm';
}

const near = (a, b, r) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy <= r * r; };

// Hoe staat de speler p tegenover AI-voertuig v? -> 'snijden' | 'spookrijder' | 'rakelings' | null.
// v, p: { x, y, z?, angle, speed, halfLen, halfWid }.
export function classify(v, p) {
  if (!v || !p || v === p) return null;
  if (!near(v, p, REACT.scan)) return null;
  if (Math.abs((v.z || 0) - (p.z || 0)) > 2.5) return null;
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const dx = p.x - v.x, dy = p.y - v.y;
  const fwd = dx * fx + dy * fy, lat = dy * fx - dx * fy;
  const rel = Math.cos(p.angle - v.angle);
  const vHL = v.halfLen || 2, pHL = p.halfLen || 2, vHW = v.halfWid || 0.9, pHW = p.halfWid || 0.9;
  const vs = v.speed || 0, ps = p.speed || 0;
  // naast elkaar en snel langs elkaar: rakelings (aan de zijkant, niet erin: dat is een botsing)
  const gap = Math.abs(lat) - vHW - pHW;
  if (Math.abs(fwd) < vHL + pHL && gap > 0 && gap < REACT.nearGap) {
    const relSpeed = Math.hypot(Math.cos(p.angle) * ps - fx * vs, Math.sin(p.angle) * ps - fy * vs);
    if (relSpeed >= REACT.nearSpeed) return 'rakelings';
  }
  if (fwd <= vHL) return null;
  // in onze baan op ons af: een spookrijder (of iemand die inhaalt over onze helft)
  if (rel < -0.7 && fwd < REACT.headOnReach && Math.abs(lat) < REACT.headOnLat && vs - ps * rel >= REACT.headOnClosing) return 'spookrijder';
  // vlak voor ons in dezelfde richting en wij moeten remmen: gesneden
  if (rel > 0.8 && fwd - vHL - pHL < REACT.cutInAhead && Math.abs(lat) < REACT.cutInLat && vs - ps >= REACT.cutInClosing) return 'snijden';
  return null;
}

// Wat de bestuurder doet. -> { honk (s), gesture (s), swerve (s), line } of null; line is soms een opmerking bij het
// gebaar (tekstballon boven de auto, world.extraSpeakers, alleen als de speler dichtbij is).
export const DRIVER_LINES = ['Kiek uut, joh!', 'Hé, rij eens normaal!', 'Waar heb jij je rijbewijs gehaald?', 'Lekker bezig, hoor!', 'Doe even rustig!'];
export function reaction(kind, v, now, roll = 0.5) {
  if (!kind || !v) return null;
  if (now - (v._reactAt ?? -99) < REACT.cooldown) return null;
  if (v.isPolice || v.sirenOn || v.isBus || v.isBike || v.isBoat) return null;
  const t = temperOf(v.id);
  const out = { kind, honk: 0, gesture: 0, swerve: 0, line: null };
  if (kind === 'spookrijder') {
    out.swerve = REACT.swerveHold;              // iedereen wijkt uit, ook de kalme
    out.honk = t === 'kalm' ? 0 : REACT.honkHeadOn;
    out.gesture = t === 'boos' ? REACT.gesture : 0;
  } else if (kind === 'snijden') {
    if (t === 'kalm') return null;
    out.honk = REACT.honkCutIn;
    out.gesture = t === 'boos' && roll < 0.7 ? REACT.gesture : 0;
  } else if (kind === 'rakelings') {
    if (t === 'kalm' && roll > 0.3) return null;
    out.honk = t === 'toeter' ? REACT.honkCutIn : 0;
    out.gesture = t !== 'toeter' || roll < 0.4 ? REACT.gesture : 0;
  }
  if (out.gesture && roll < 0.5) out.line = DRIVER_LINES[Math.floor(roll * 2 * DRIVER_LINES.length) % DRIVER_LINES.length];
  return out;
}

// --- voetgangers en een auto op de stoep --------------------------------------------------------------
export const STARTLE = {
  reach: 11,        // m vooruit
  lat: 2.6,         // m opzij van de baan van de auto
  minSpeed: 2.5,    // m/s: stapvoets over de stoep (parkeren) laat niemand schrikken
  flee: 5,          // s wegrennen
  screamChance: 0.25,
  cooldown: 6,
};
export const STARTLE_LINES = ['Hé! Dit is de stoep!', 'Ben je gek geworden?', 'Stoep, joh! Stoep!', 'Help!', 'Rij es normaal!'];

// Schrikt voetganger ped van auto car die over de stoep rijdt (carOnWalk: de auto staat niet op een rijbaan)?
// -> null | 'opzij' (een stap opzij, geen paniek) | 'schrik' (wegrennen, soms een kreet). ped: { x, y, state, isCop, _startleAt }.
export function carStartle(ped, car, carOnWalk, now, roll = 0.5) {
  if (!carOnWalk || !car || !ped || ped.isCop || ped.state === 'dead' || ped.state === 'flee') return null;
  if (now - (ped._startleAt ?? -99) < STARTLE.cooldown) return null;
  const sp = car.speed || 0;
  if (sp < STARTLE.minSpeed) return null;
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  const dx = ped.x - car.x, dy = ped.y - car.y;
  const fwd = dx * fx + dy * fy, lat = Math.abs(dy * fx - dx * fy);
  const reach = (car.halfLen || 2) + Math.min(STARTLE.reach, 3 + sp * 0.9);
  if (fwd < -(car.halfLen || 2) || fwd > reach || lat > (car.halfWid || 0.9) + STARTLE.lat) return null;
  return sp > 6 || roll < 0.6 ? 'schrik' : 'opzij';
}
