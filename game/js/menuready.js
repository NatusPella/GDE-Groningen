// The 'menu ready' gate (#226, #92): the main menu only shows when the world behind it is drawn and the
// main thread is quiet, so the first click never lands on a frozen page. Pure (no DOM, no clock):
// startscreen.js feeds it one reading per drawn frame, scripts/menuready_test.mjs runs it.
//
// Ready when: at least `minFrames` frames were drawn, the last `quietFrames` of them each took no more than
// `maxFrameMs`, nothing is left to stream in (`pending` is 0) and the extra work (`extraDone`, e.g. the
// country placement) has finished. A time-out opens the menu anyway: a slow computer waits, it never hangs.
export const GATE = { minFrames: 4, quietFrames: 3, maxFrameMs: 90, timeoutMs: 20000 };

export function makeMenuGate(opts = {}) {
  const o = { ...GATE, ...opts };
  let frames = 0, quiet = 0, longest = 0, startedAt = null, readyAt = null, timedOut = false;
  return {
    // now: ms clock; frameMs: time since the last drawn frame; pending: tiles still to stream in; extraDone: bool
    step(now, frameMs, pending = 0, extraDone = true) {
      if (readyAt !== null) return true;
      if (startedAt === null) startedAt = now;
      frames++;
      longest = Math.max(longest, frameMs);
      // the first frame has no earlier one to measure against
      quiet = frames > 1 && frameMs <= o.maxFrameMs ? quiet + 1 : 0;
      const ok = frames >= o.minFrames && quiet >= o.quietFrames && !(pending > 0) && !!extraDone;
      if (ok || now - startedAt >= o.timeoutMs) { readyAt = now; timedOut = !ok; return true; }
      return false;
    },
    // a time-out can also come while no frame is drawn (a frozen page): the caller's timer asks
    expire(now) { if (readyAt === null) { readyAt = now; timedOut = true; } return true; },
    isReady: () => readyAt !== null,
    report: () => ({ frames, longestFrameMs: Math.round(longest), waitedMs: readyAt !== null && startedAt !== null ? Math.round(readyAt - startedAt) : null, timedOut }),
  };
}
