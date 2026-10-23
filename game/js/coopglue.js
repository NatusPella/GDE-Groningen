// Dunne koppeling tussen coop.js (pure logica) en het spel (#95). Alleen
// actief na bindCoop(), dus alleen met ?coop; zonder blijft world.coop leeg.
import { readP2, remoteP2, stepSlot2, assignDevices, leash } from './coop.js';
import { activePadIndex } from './gamepad.js';

export function bindCoop(world, input) {
  world.coop = { input, devices: null };
}

function snapshot(coop) {
  const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : [];
  const idx = [];
  for (const p of pads) if (p && p.connected) idx.push(p.index);
  const p1 = activePadIndex();
  coop.devices = assignDevices(idx, p1 >= 0 ? p1 : null);
  const d = coop.devices.p2;
  const pad = d.kind === 'pad' ? pads[d.pad] : null;
  return {
    isDown: (k) => coop.input.isDown(k),
    padAxes: pad ? pad.axes : null,
    padRun: !!(pad && pad.buttons[0] && pad.buttons[0].pressed),
  };
}

// Speler 2 stuurt de metgezel; beweging is camerarelatief zoals bij speler 1.
export function coopStep(c, dt, world, move) {
  if (!world.coop) return false;
  if (!world.coop.remote && world.coop.local === false) return false; // een sessie loopt, maar de gast is er (nog) niet: de volg-AI
  if (c.coopWacht && world.coop.remote) { c.vx = 0; c.vy = 0; c.crouching = false; return true; } // de wereld rond haar wordt nog geladen (coopnet.js bandMetgezel, #429)
  // online: de gast stuurt de metgezel via het net (net/session.js), anders het eigen toetsenbord of pad
  const inp = world.coop.remote ? remoteP2(world.coop.remoteInput) : readP2(snapshot(world.coop));
  const yaw = (world.coop.remote ? (world.coop.remoteInput && world.coop.remoteInput.yaw) : world.camYaw) || 0, cs = Math.cos(yaw), sn = Math.sin(yaw);
  stepSlot2(c, { ...inp, x: cs * -inp.y - sn * inp.x, y: sn * -inp.y + cs * inp.x }, dt, null);
  move(c, dt, world);
  const l = leash(world.player, c, world.coop.leash); // in een sessie Infinity (coopnet.js): daar doet de band het werk (#388)
  if (l.clamped) { c.x = l.x; c.y = l.y; }
  c.crouching = false;
  c.pose = null;
  return true;
}
