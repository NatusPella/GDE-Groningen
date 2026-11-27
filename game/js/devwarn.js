// Dev-only diagnostic warnings for recovered errors (coding-standards.md).
// Silent in production, story tests and autoplay so player error logs and
// automated test runs stay clean; deduplicated per scope and message.
import { DEV, STORY_TEST, AUTOPLAY } from './devflags.js';

const MAX_SEEN = 200;
const seen = new Set();

export function devWarn(scope, err, active = DEV && !STORY_TEST && !AUTOPLAY) {
  if (!active) return false;
  const detail = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err ?? '');
  const key = `${scope}:${detail}`;
  if (seen.has(key)) return false;
  if (seen.size >= MAX_SEEN) seen.clear();
  seen.add(key);
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[dev:${scope}]`, err);
  }
  return true;
}
