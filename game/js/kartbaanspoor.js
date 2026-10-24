// The track of Karten in Ulrum in the game's own frame (pure, no THREE): kartbaan.js draws and drives on it, and
// coopwedstrijd.js (an online race, #443) simulates on exactly the same track, so host and guests race on one baan.
import { buildTrack } from './kartrace.js';
import { geo, frame } from './minigamekit.js';
import { ULRUM_RING, ringToLocal, startOnLongestStraight } from './kartbaandata.js';

export const KARTBAAN_WIDTH = 7;
export const KARTBAAN_ROT = 0;
const RING0 = ringToLocal(ULRUM_RING);
export const KARTBAAN_ORIGIN = geo(RING0.lat0, RING0.lon0);
export const KARTBAAN_FRAME = frame(KARTBAAN_ORIGIN, KARTBAAN_ROT);
// the mapped ring in the game's own frame (its y runs south), started mid-straight
export const KARTBAAN_TRACK = buildTrack(startOnLongestStraight(ULRUM_RING.map(([la, lo]) => { const q = geo(la, lo); return [q.x - KARTBAAN_ORIGIN.x, q.y - KARTBAAN_ORIGIN.y]; })), KARTBAAN_WIDTH);
