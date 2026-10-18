// The travel steps (T1 to T4) and the epilogue (E) of the new story arc (storyarc_nieuw.js), as goal
// types of story.js (`Object.assign(GOALS, REIS_GOALS)`).
//
//   { type: 'travel', to, beat, arrive? }   a jump to the place `to` (deel4places.js). When the player
//        is more than ~6.5 km away the travel panel (reispanel.js, #97) offers meerijden, zelf rijden
//        or overslaan; meerijden and overslaan take the player there with the clock on the real travel
//        time and the beat's trip talk as subtitles (the train and bus rides themselves are not built:
//        both are the same jump), zelf rijden leaves the player to drive (a small reward on arrival).
//        The step is done on arrival (within ARRIVE_M of the place); the `arrive` scenes (or, without
//        them, the step's scenes) are said once as subtitles.
//   { type: 'epilogue' }                    the last scenes (E1, E2) as subtitles once the finale is over
import { placePoint } from './deel4places.js';
import { REISBEATS } from './reisbeats.js';
import { arrival, selfReward } from './reiskeuze.js';
import { askTravel, travelPromptOpen, closeTravel } from './reispanel.js';
import { shouldPrompt, arrivalMessage } from './reisview.js';
import { talkLines, storyDataReady } from './storytext.js';
import { playTalk, talkActive } from './storytalk.js';
import { teleport, blockedReason } from './cheats.js';
import { isMissionActive, getMissionDefs } from './missions.js';
import { missionIndexOf } from './storyarc.js';
import { isCinematicActive, sinceCinematic } from './cinematics.js';
import { narrativeBusy } from './narrative.js';

export const ARRIVE_M = 800;
// a road is longer than the line through the air
const ROAD_FACTOR = 1.25;

let world = null;
// the step the open travel panel is for
let promptFor = null;
export const initStoryReis = (w) => { world = w; };

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const ready = () => !!world && !isMissionActive() && !isCinematicActive() && sinceCinematic() > 1 && !narrativeBusy() && !world.pigeonMode
  && !world.pendingRespawn && !blockedReason(world) && typeof document !== 'undefined' && document.body.classList.contains('game-started');

// the beat of a travel step as reiskeuze.js wants it: the real distance, the trip talk as its lines
function beatOf(st, from, to) {
  const base = REISBEATS[st.id] || {};
  const scene = st.goal.scene || base.scene;
  const lines = storyDataReady() && scene ? talkLines(scene).filter((l) => l.channel !== 'telefoon').slice(0, 4).map((l) => `${l.speaker}: ${l.text}`) : [];
  return { ...base, stepId: st.id, to: st.goal.to, length: Math.round(dist(from, to) * ROAD_FACTOR), lines };
}

function say(ids, id) {
  if (!storyDataReady() || !ids || !ids.length) return false;
  return playTalk(talkLines(ids), { id, delay: 0.8 });
}

export const REIS_GOALS = {
  travel: {
    begin: (st, b) => { b.phase = 'wait'; },
    met: (st, b) => {
      if (!world) return false;
      const to = placePoint(st.goal.to);
      if (!to) return true;
      const p = world.player;
      if (b.phase === 'done') return !talkActive();
      if (b.phase === 'wait' || b.phase === 'drive') {
        if (dist(p, to) < ARRIVE_M) {
          if (b.phase === 'drive' && b.reward && ready()) { world.money += b.reward; world.addMessage(`Zelf gereden: +€${b.reward}`, 3, { kind: 'missie' }); b.reward = 0; }
          if (!ready() && b.phase === 'wait') return false;
          b.phase = 'done';
          say(st.goal.arrive, `${st.id}:aankomst`);
          return false;
        }
        if (b.phase === 'wait' && ready()) {
          const beat = beatOf(st, p, to);
          if (!shouldPrompt(beat.length)) { b.phase = 'drive'; b.reward = 0; return false; }
          b.phase = 'ask';
          promptFor = st.id;
          askTravel(beat).then((choice) => {
            b.choice = choice;
            if (choice === 'zelf') { b.phase = 'drive'; b.reward = arrival(beat, 'zelf').money; return; }
            // meerijden and overslaan: the same jump, the real time on the clock, the trip talk as subtitles
            const a = arrival(beat, choice);
            b.phase = 'jump';
            if (typeof world.clock === 'number') world.clock = (world.clock + a.clockMinutes / 60) % 24;
            teleport(world, to.x, to.y, st.goal.to);
            if (choice === 'overslaan' && a.subtitles.length) world.addMessage(a.subtitles[0], 4, { kind: 'reis' });
            say(st.goal.scene || REISBEATS[st.id]?.scene, `${st.id}:reis`);
            world.addMessage(arrivalMessage(beat).text, 3, { kind: 'reis' });
            // the tiles round the target come in first: no second question, arrival is the distance
            b.phase = 'drive';
            b.reward = 0;
          });
        }
      }
      return false;
    },
    place: (st) => { const q = placePoint(st.goal.to); return q ? { x: q.x, y: q.y, name: st.goal.to } : null; },
  },
  epilogue: {
    begin: (st, b) => { b.phase = 'wait'; },
    met: (st, b) => {
      if (b.phase === 'wait') {
        if (ready() && storyDataReady()) { b.phase = 'play'; say(st.scenes, 'epiloog'); }
        return false;
      }
      return b.phase === 'play' && !talkActive();
    },
    place: () => null,
  },
};

// A mission step whose start is a jump away (> 6.5 km): the same travel panel once, before the mission.
// Called every frame by story.js for the current step; `base` is the step's runtime state (reset per step).
export function updateStoryReis(w, step, base) {
  if (promptFor && travelPromptOpen() && (!step || step.id !== promptFor)) closeTravel();
  if (world && step && step.kind === 'mission' && base.reisAsked && promptFor === step.id && travelPromptOpen()) {
    // they got there by themselves while the panel was open
    const d0 = step.mission && getMissionDefs()[missionIndexOf(step.mission)];
    if (d0 && d0.start && !shouldPrompt(Math.round(dist(w.player, d0.start) * ROAD_FACTOR))) closeTravel();
  }
  if (!world || !step || step.kind !== 'mission' || !step.built || base.reisAsked || !step.mission) return;
  const def = getMissionDefs()[missionIndexOf(step.mission)];
  if (!def || !def.start || !ready()) return;
  const from = w.player, to = def.start;
  const length = Math.round(dist(from, to) * ROAD_FACTOR);
  if (!shouldPrompt(length)) return;
  base.reisAsked = true;
  promptFor = step.id;
  const b = REISBEATS[step.id] || {};
  const scene = b.scene;
  const lines = storyDataReady() && scene ? talkLines(scene).slice(0, 4).map((l) => `${l.speaker}: ${l.text}`) : [];
  const beat = { ...b, stepId: step.id, to: step.title, length, lines };
  askTravel(beat).then((choice) => {
    if (choice === 'zelf') return;
    const a = arrival(beat, choice);
    if (typeof world.clock === 'number') world.clock = (world.clock + a.clockMinutes / 60) % 24;
    teleport(world, to.x, to.y, step.title);
    if (a.subtitles.length) world.addMessage(a.subtitles[0], 4, { kind: 'reis' });
    if (scene) say(scene, `${step.id}:reis`);
  });
}

export { selfReward };
