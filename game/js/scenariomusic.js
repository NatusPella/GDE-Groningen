// Which scenario track should play instead of G-Music: 'race' during a car
// race, 'chase' during a police chase, null otherwise. A race wins over a
// chase. The chase is debounced so short sightings and brief escapes don't
// flap the music: it starts after CHASE_START_S of continuous pursuit and
// stops CHASE_STOP_S after the police lost you.

const CHASE_START_S = 2;
const CHASE_STOP_S = 6;

export function createScenarioDirector() {
  let chaseOn = false;
  let chasingFor = 0;
  let calmFor = 0;
  return {
    update(dt, { race = false, chasing = false } = {}) {
      if (chasing) { chasingFor += dt; calmFor = 0; } else { calmFor += dt; chasingFor = 0; }
      if (!chaseOn && chasingFor >= CHASE_START_S) chaseOn = true;
      else if (chaseOn && calmFor >= CHASE_STOP_S) chaseOn = false;
      return race ? 'race' : chaseOn ? 'chase' : null;
    },
    reset() { chaseOn = false; chasingFor = 0; calmFor = 0; },
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
