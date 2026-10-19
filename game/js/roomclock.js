// The little room under the Martinitoren closes after ROOM_MAX_S seconds of
// real time, whatever the game's time scale (slow motion, a hitching frame
// rate) does. A pause gap counts at most PAUSE_GAP_S, so a menu freezes it.
export const ROOM_MAX_S = 9;
const ROOM_MIN_S = 1;
const PAUSE_GAP_S = 0.5;

export function advanceRoomClock(room, nowMs, gameDt = 0) {
  const real = room.last == null ? 0 : Math.min(PAUSE_GAP_S, Math.max(0, (nowMs - room.last) / 1000));
  room.last = nowMs;
  room.t += Math.max(gameDt, real);
  return room.t;
}

export function roomShouldClose(t, keyPressed, respawning) {
  return !!respawning || t > ROOM_MAX_S || (t > ROOM_MIN_S && !!keyPressed);
}
