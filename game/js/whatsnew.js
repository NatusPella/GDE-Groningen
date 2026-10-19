// "Wat is er nieuw" after an update: the title screen opens the changelog
// when this install last ran another version. A first launch ever skips it;
// a player with a save or settings from before this was stored counts as
// returning. Dev builds never open it.
import { KEYS } from './storagekeys.js';

const KEY = KEYS.lastVersion;
const RETURNING_KEYS = [KEYS.save, KEYS.settings];

// 0.21.0 < 0.22.0; non-numeric parts count as 0
export function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

// What to show on start: null (nothing), or { since } where since is the
// version last seen (null: unknown, an install from before this existed).
function newsOnStart({ stored, current, returning }) {
  if (!current || current === 'dev') return null;
  if (stored) return stored === current ? null : { since: stored };
  return returning ? { since: null } : null;
}

function storage() {
  try { return window.localStorage; } catch (e) { return null; }
}

export function checkWhatsNew(current) {
  const ls = storage();
  if (!ls) return null;
  let stored = null, returning = false;
  try {
    stored = ls.getItem(KEY);
    returning = RETURNING_KEYS.some((k) => ls.getItem(k) !== null);
  } catch (e) { return null; }
  return newsOnStart({ stored, current, returning });
}

export function markVersionSeen(current) {
  if (!current || current === 'dev') return;
  try { storage()?.setItem(KEY, current); } catch (e) { /* ignore */ }
}
