// The Martinitoren room closes on E (after 1 s) or after 9 s of real time, in
// slow motion and on a hitching frame rate too (game/js/roomclock.js).
//   node scripts/room_clock_test.mjs
import { advanceRoomClock, roomShouldClose, ROOM_MAX_S } from '../game/js/roomclock.js';

let fails = 0;
const ok = (c, n) => { if (!c) { fails++; console.log('FAIL', n); } };

function run(fps, timeScale, secs) {
  const room = { t: 0, last: null };
  let now = 1000, closedAt = null;
  const dt = 1 / fps;
  for (let i = 0; i < secs * fps && closedAt == null; i++) {
    now += dt * 1000;
    const t = advanceRoomClock(room, now, dt * timeScale);
    if (roomShouldClose(t, false, false)) closedAt = (now - 1000) / 1000;
  }
  return closedAt;
}
for (const [fps, ts] of [[60, 1], [60, 0.3], [60, 0.1], [4, 1], [30, 0]]) {
  const c = run(fps, ts, 30);
  ok(c != null && c < ROOM_MAX_S + 1, `closes within ~9 s at ${fps} fps, timeScale ${ts} (closed at ${c})`);
}
{
  const room = { t: 0, last: null };
  advanceRoomClock(room, 1000, 0.016);
  advanceRoomClock(room, 1000 + 60000, 0.016);
  ok(room.t < 1, 'a one minute pause does not eat the room time');
}
ok(!roomShouldClose(0.5, true, false), 'E before 1 s is ignored');
ok(roomShouldClose(1.5, true, false), 'E after 1 s closes');
ok(!roomShouldClose(8.9, false, false), 'stays open at 8.9 s');
ok(roomShouldClose(9.1, false, false), 'closes after 9 s');
ok(roomShouldClose(0, false, true), 'a respawn closes it at once');
if (fails) { console.log(`${fails} FAILED`); process.exit(1); }
console.log('room clock ok');
