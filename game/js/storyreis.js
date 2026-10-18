// The goal of a travel step of the new story (T1 train to Winsum, T2 bus to Zoutkamp, ...): be at the
// place the trip goes to, however you got there (the train from the ticket machine, the ride-along or
// skip of the travel beat (storytravel.js, which sets you down at the goal's place), or driving yourself).
// goal { type: 'reis', to: 'Winsum', at: [lat, lon], r: 300, scene: 'T1', from: 4 }
//   at     where the trip ends (WGS84); the guide of the step points there, so the travel beat offers the choice
//   r      how close counts as arrived (m)
//   scene  script.json scene whose lines are spoken on arrival (the ones of the trip itself are the montage's)
// Pure apart from the world and talk hooks story.js hands in.
import { wgsToWorld } from './rdnew.js';

const placeOf = (st) => {
  const [x, y] = wgsToWorld(st.goal.at[0], st.goal.at[1]);
  return { x, y, name: st.goal.to };
};

export function makeReisGoals({ getWorld, busy, playLines }) {
  return {
    reis: {
      begin: (st, b) => { b.arrived = false; },
      met: (st, b) => {
        const w = getWorld();
        if (!w || !w.player) return false;
        if (b.arrived) return !busy();
        const p = w.player.inVehicle || w.player;
        const dest = placeOf(st);
        if (Math.hypot(p.x - dest.x, p.y - dest.y) > (st.goal.r || 300)) return false;
        b.arrived = true;
        if (st.goal.scene) playLines(st.goal.scene, st.goal.from || 0);
        return !busy();
      },
      place: (st) => placeOf(st),
    },
  };
}

export { placeOf as reisPlace };
