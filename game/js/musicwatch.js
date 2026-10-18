// Watchdog for the radio (audio.js watchdog(), every ~2 s): music that should
// be playing but is not gets a nudge, then the next record. Node-safe, no DOM.
//
// step(now, s) takes the radio's state:
//   active       it should be playing: started, on, not held / suspended / pending
//   hasEl        there is a current element
//   ended        the current element has ended (its 'ended' event may be lost)
//   currentTime  its position; moving means it plays
//   inBreak      a talk break owns the radio
// and answers null, 'resume' (try play() again), 'advance' (the next record)
// or 'endBreak' (a break whose handler never called done).
export const STALL_S = 5;
export const ENDED_GRACE_S = 3;
export const BREAK_MAX_S = 90;
export const COOLDOWN_S = 4;

export function createMusicWatch() {
  const w = { lastTime: NaN, progressAt: 0, stage: 0, endedAt: null, breakAt: null, quietUntil: 0, nudges: 0 };

  function reset(now) {
    w.progressAt = now; w.stage = 0; w.endedAt = null; w.lastTime = NaN;
  }

  w.step = (now, s) => {
    if (s.inBreak) {
      if (w.breakAt === null) w.breakAt = now;
      reset(now);
      if (now - w.breakAt > BREAK_MAX_S) { w.breakAt = null; w.nudges++; w.quietUntil = now + COOLDOWN_S; return 'endBreak'; }
      return null;
    }
    w.breakAt = null;
    if (!s.active || now < w.quietUntil) { reset(now); return null; }
    if (!s.hasEl) { w.nudges++; w.quietUntil = now + COOLDOWN_S; return 'advance'; }
    if (s.ended) {
      if (w.endedAt === null) w.endedAt = now;
      if (now - w.endedAt >= ENDED_GRACE_S) { w.nudges++; w.quietUntil = now + COOLDOWN_S; reset(now); return 'advance'; }
      return null;
    }
    w.endedAt = null;
    if (!Number.isFinite(w.lastTime) || Math.abs(s.currentTime - w.lastTime) > 0.01) {
      w.lastTime = s.currentTime; w.progressAt = now; w.stage = 0;
      return null;
    }
    if (now - w.progressAt < STALL_S) return null;
    w.nudges++;
    w.progressAt = now;
    if (w.stage === 0) { w.stage = 1; return 'resume'; }
    w.stage = 0; w.quietUntil = now + COOLDOWN_S;
    return 'advance';
  };
  return w;
}
