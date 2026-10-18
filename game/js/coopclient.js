// Coöp online (#95): de gast-kant in het spel en de vaste personages. Pure
// functies op een `world`-achtig object (testbaar zonder spel):
// - de host speelt Tammo (slot 0), de gast Tessa ('anita', slot 1), geen keuze en geen wissel;
// - op de gast staat het eigen lichaam in world.player (de camera volgt dat),
//   het lichaam van de host in world.companion; op de host andersom;
// - de gast toont de toestand van de host (posities, geld, wanted) en stuurt alleen invoer.
// Niet in een echt spel gezien; zie #95.

export const CHAR_OF_SLOT = ['tammo', 'anita'];

export function bodyFor(world, role, slot) {
  const mine = role === 'client' ? 1 : 0;
  return slot === mine ? world.player : world.companion;
}

// Zet de twee lichamen op hun vaste personage en schakel de verhaalwissel uit (story.js kijkt naar world.coop.fixedChars).
export function setFixedCharacters(world, role) {
  const mine = role === 'client' ? 1 : 0;
  if (world.player) world.player.character = CHAR_OF_SLOT[mine];
  if (world.companion) world.companion.character = CHAR_OF_SLOT[1 - mine];
  if (world.coop) world.coop.fixedChars = true;
}

// Toestand van de host op deze wereld zetten. sample = net/session.js ClientSession.world().
export function applyHostState(world, role, sample) {
  if (!sample) return 0;
  let n = 0;
  for (const p of sample.players) {
    const b = bodyFor(world, role, p.slot);
    if (!b || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    b.x = p.x; b.y = p.y; b.angle = p.angle;
    if (b.vx !== undefined) { b.vx = 0; b.vy = 0; }
    n++;
  }
  if (sample.shared) { world.money = sample.shared.money; world.wanted = sample.shared.wanted; }
  return n;
}

// Invoer van de gast: schermrichting (axis x rechts, y omlaag) en de eigen camerahoek,
// zodat de host de richting in wereldruimte kan bepalen (coopglue.js).
export function makeClientInput(axis, run, camYaw) {
  const [x, y] = axis || [0, 0];
  return { mx: x, my: y, buttons: run ? 1 : 0, yaw: Number.isFinite(camYaw) ? camYaw : 0 };
}
