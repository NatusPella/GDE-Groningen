// Small state of the trailer and the intro montage, so the rest of the game can
// ask "is it playing?" and start a benchmark without importing trailer.js (2500
// lines) or intromontage.js (1500 lines); those are loaded when they are needed.
import { FLAGS } from './devflags.js';
import { SESSION_KEYS } from './storagekeys.js';

const BENCH_KEY = SESSION_KEYS.benchmarkPending;
const CUTS = ['vol', 'kort', 'verhaal', 'gameplay'];

let trailerRunning = false;
let introPlaying = false;
export const isTrailerRunning = () => trailerRunning;
export const isIntroPlaying = () => introPlaying;
export const setTrailerRunning = (v) => { trailerRunning = !!v; };
export const setIntroPlaying = (v) => { introPlaying = !!v; };

// What should play before the title menu shows, if anything.
export function pendingTrailer() {
  if (FLAGS.trailer) {
    const n = Number(FLAGS.shot);
    return { mode: 'opname', cut: CUTS.includes(FLAGS.cut) ? FLAGS.cut : 'vol', shot: Number.isFinite(n) && n > 0 ? n : null, frames: FLAGS.frames };
  }
  // ?attract (desktop --attract) plays the attract intro on request, also in a test run
  if (FLAGS.attract) return { mode: 'attract', cut: 'kort' };
  // ?benchmark=N (desktop --benchmark=N): N benchmark runs in a row, logged
  if (FLAGS.benchmark) return { mode: 'benchmark', cut: 'vol' };
  let bench = null;
  try { bench = sessionStorage.getItem(BENCH_KEY); sessionStorage.removeItem(BENCH_KEY); } catch (e) { /* ignore */ }
  if (bench) return { mode: 'benchmark', cut: 'vol', fromGame: true };
  // no intro before the menu: the title screen's live city is the attract,
  // and Nieuw spel opens with its own trailer-style opening
  return null;
}

// In a running game the benchmark starts from a fresh load of the title
// screen (after saving), and "Terug" continues that save.
export function benchmarkViaReload() {
  try { sessionStorage.setItem(BENCH_KEY, '1'); } catch (e) { return false; }
  location.reload();
  return true;
}
