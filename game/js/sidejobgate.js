// The unlock gate for side jobs in the world (#1131, WP8 of the story epic). The gate itself lives in unlockgate.js;
// this only answers "may this side job start here?" for one start spot. A side job belongs to a trade (loopbaan.js
// vakVanBaan) and that trade opens once the story links a character to it. No hard wall: a closed side job returns
// that character's line (the E prompt is dimmed, the map draws the icon half transparent).
//
// Never closed: a trade the player already started or a side job already played (`played`), an old save (the gate
// reads it as "everything open"), and a guest (owner > 0) on the host: the host does not know the guest's story, and a
// guest never loses anything. Pure: the gate ({ open(trade), begun(trade), hint(trade) }) comes from outside;
// test: scripts/sidejobgate_test.mjs.
import { vakVanBaan } from './loopbaan.js';

export function sideJobGate(jobId, gate, { owner = 0, played = false } = {}) {
  if (!jobId || !gate || owner > 0 || played) return null;
  const trade = vakVanBaan(jobId);
  try {
    if (typeof gate.begun === 'function' && gate.begun(trade)) return null;
    if (typeof gate.open !== 'function' || gate.open(trade)) return null;
  } catch (e) { return null; } // a failing source never closes
  let hint = null;
  try { hint = typeof gate.hint === 'function' ? gate.hint(trade) : null; } catch (e) { hint = null; }
  return hint || 'Dit komt later in het verhaal.';
}
