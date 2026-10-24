// Which scenario track should play instead of G-Music: 'race' during a car
// race, 'chase' during a police chase, 'kart' / 'padel' / 'golf' / 'klimtoren'
// while THIS player takes part in that activity, null otherwise. Priority: the
// car race, then the kart race (also a race), then the police chase (it beats
// padel, golf and the climbing tower), then the other activities. The chase
// and the activities are debounced so short sightings, brief escapes and the
// gap between two rounds don't flap the music: a chase starts after
// CHASE_START_S of continuous pursuit and stops CHASE_STOP_S after the police
// lost you; an activity starts after ACT_START_S and stops ACT_STOP_S after
// it ended (switching straight to another activity is immediate).

const CHASE_START_S = 2;
const CHASE_STOP_S = 6;
const ACT_START_S = 0.4;
const ACT_STOP_S = 1.5;

export const ACTIVITY_KEYS = ['kart', 'padel', 'golf', 'klimtoren', 'trein', 'bus', 'boerderij', 'vlucht', 'thuis', 'missie', 'fiets'];
const BOERDERIJ_MODELLEN = ['tractor', 'maaidorser', 'laadmachine']; // de machines van het boerenwerk (boerderijwereld.js, #415)

// Modules that own private state (the machinist service) register a probe
// here instead of being imported by the audio code.
const probes = new Map();
export function registerMusicProbe(key, fn) { probes.set(key, fn); }
const probed = (key, world) => { const f = probes.get(key); try { return !!f && !!f(world); } catch (e) { return false; } };

// Activity music for this player from the world state, or null. A host (or
// solo player) plays the activity itself: world.padelGame, world.activityGame
// (the id of the running minigame). A guest of Samen spelen who said yes plays
// on his own screen (world.coopWedGast: spiegel or score, id of the match);
// a guest who said no has neither and keeps the radio.
const ACTIVITY_BY_ID = { kartbaan: 'kart', padel: 'padel', discgolf: 'golf', pitchputt: 'golf', klimtoren: 'klimtoren' };
export function activityMusicKey(world) {
  if (!world) return null;
  if (world.padelGame) return 'padel';
  const G = world.coopWedGast;
  if (G && (G.spiegel || G.score) && ACTIVITY_BY_ID[G.id]) return ACTIVITY_BY_ID[G.id];
  if (ACTIVITY_BY_ID[world.activityGame]) return ACTIVITY_BY_ID[world.activityGame];
  // train: the machinist service, or a passenger ride between stations (stationtravel.js: trainCam without trainDriving)
  if (probed('trein', world) || (world.trainCam && !world.trainDriving)) return 'trein';
  // bus: driving a bus job or a taken-over line service (the helper and the passengers ride along in it)
  const pv = world.player && world.player.inVehicle;
  if (pv && pv.isBus && (pv.sideJob || pv.rideLine || (pv.busBediend && pv.busBediend.coop))) return 'bus';
  // farm work: in a tractor, combine or loader (the work on the field, the yard and the trips in between)
  if (pv && pv.model && BOERDERIJ_MODELLEN.includes(pv.model.name)) return 'boerderij';
  // flying: a plane or a helicopter (flight school, flights)
  if (pv && (pv.isHeli || (pv.model && pv.model.name === 'plane'))) return 'vlucht';
  // a guest of Samen spelen riding in the host's train or bus
  if (world.coopRole === 'client' && (world.coopZit === 'trein' || world.coopZit === 'bus')) return world.coopZit;
  // your safehouse menu or the photo mode: the calm home loop (it wins over a running mission and the bike)
  if (probed('thuis', world) || probed('foto', world)) return 'thuis';
  // a running story mission (tension loop), then the bike (a relaxed loop); the specific activities above win, a chase wins over all
  if (world.mission && world.mission.phase === 'active') return 'missie';
  if (pv && (pv.isBike || pv.isScooter)) return 'fiets';
  return null;
}

export function createScenarioDirector() {
  let chaseOn = false;
  let chasingFor = 0;
  let calmFor = 0;
  let act = null; // the activity whose music is on
  let actWant = null;
  let actFor = 0; // seconds the wish has differed from act
  return {
    update(dt, { race = false, chasing = false, activity = null } = {}) {
      if (chasing) { chasingFor += dt; calmFor = 0; } else { calmFor += dt; chasingFor = 0; }
      if (!chaseOn && chasingFor >= CHASE_START_S) chaseOn = true;
      else if (chaseOn && calmFor >= CHASE_STOP_S) chaseOn = false;
      const want = ACTIVITY_KEYS.includes(activity) ? activity : null;
      if (want === act) { actFor = 0; actWant = want; }
      else {
        if (want !== actWant) { actWant = want; actFor = 0; }
        actFor += dt;
        if (want ? (act ? true : actFor >= ACT_START_S) : actFor >= ACT_STOP_S) { act = want; actFor = 0; }
      }
      if (race) return 'race';
      if (act === 'kart') return 'kart';
      if (chaseOn) return 'chase';
      return act;
    },
    reset() { chaseOn = false; chasingFor = 0; calmFor = 0; act = null; actWant = null; actFor = 0; },
  };
}

// Loop points inside a decoded buffer: skips the encoder padding / near
// silence an mp3 carries at both ends, so an AudioBufferSourceNode loops
// without an audible gap. Returns seconds.
export function loopPoints(channels, sampleRate, threshold = 0.002) {
  const len = channels[0].length;
  const loud = (i) => channels.some((c) => Math.abs(c[i]) > threshold);
  let a = 0, b = len - 1;
  while (a < len && !loud(a)) a++;
  while (b > a && !loud(b)) b--;
  if (b - a < sampleRate) return { start: 0, end: len / sampleRate };
  return { start: a / sampleRate, end: (b + 1) / sampleRate };
}
