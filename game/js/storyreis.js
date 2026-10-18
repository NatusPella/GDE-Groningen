// The goal type 'reis' of the travel steps of the new story arc (T1, T2, T4 in storyarc_nieuw.js):
//   { type: 'reis', to, at: [lat, lon], r, scene? }
// The step is done when the player stands within `r` metres of the place `at`; `scene` (a script scene)
// is then said once as subtitles. How the player gets there (meerijden, zelf rijden, overslaan) is the
// travel prompt of storytravel.js, which takes the story guide (place() below) as its destination.
import { wgsToWorld } from './rdnew.js';
import { talkLines, storyDataReady } from './storytext.js';
import { playTalk, talkActive } from './storytalk.js';

let world = null;
export const initStoryReis = (w) => { world = w; };

const point = (st) => { const [x, y] = wgsToWorld(st.goal.at[0], st.goal.at[1]); return { x, y }; };

export const REIS_GOALS = {
  reis: {
    begin: (st, b) => { b.phase = 'wait'; },
    met: (st, b) => {
      if (!world) return false;
      if (b.phase === 'talk') return !talkActive();
      const q = point(st), p = world.player;
      if (Math.hypot(p.x - q.x, p.y - q.y) > (st.goal.r || 500)) return false;
      if (!st.goal.scene || !storyDataReady()) return true;
      b.phase = 'talk';
      playTalk(talkLines(st.goal.scene), { id: `${st.id}:aankomst`, delay: 0.8 });
      return false;
    },
    place: (st) => ({ ...point(st), name: st.goal.to }),
  },
};
