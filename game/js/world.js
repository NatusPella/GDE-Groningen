// Shared mutable game state. Every system (vehicles, pedestrians, combat,
// police, missions, hud) receives this same object and reads/writes the
// arrays and fields it owns. See ARCHITECTURE.md for the full contract.
export class World {
  constructor(map, input, player) {
    this.map = map;
    this.input = input;
    this.player = player;

    this.vehicles = [];
    this.pedestrians = [];
    this.bullets = [];
    this.particles = [];

    this.wanted = 0; // 0-5, any system may increase it; police.js owns decay + spawns
    this.wantedDecayTimer = 0; // police.js's own bookkeeping, other systems don't touch this
    this.money = 250; // starting budget: a first pistol or a few snacks
    this.health = 100;
    this.armor = 0;
    this.weapon = 'fists';
    this.ammo = {};
    this.mission = null; // {type, label, timeLeft, ...} for hud.js to render
    this.stats = { kills: 0, pedKills: 0, copKills: 0, missionsDone: 0, playerWrecks: 0 };
    this.onRespawn = []; // (world, {busted}) callbacks, run at the end of respawnPlayer

    this.spawnPoint = { x: player.x, y: player.y };
    this.time = 0;
    this.messages = []; // {text, until} HUD toast queue
  }

  addMessage(text, duration = 3) {
    this.messages.push({ text, until: this.time + duration });
  }
}

// Shared "player died / got busted" recovery flow — used by combat.js (health
// hits 0) and police.js (busted while wanted). Lives here (not in either
// module) so neither has to import the other.
// Death/arrest: announce it now and let cinematics.js play the DOOD /
// OPGEPAKT slow-motion shot, which calls respawnPlayer when it ends.
export function requestRespawn(world, opts = {}) {
  if (world.pendingRespawn) return;
  world.pendingRespawn = { ...opts, announced: true };
  world.addMessage(opts.busted ? 'OPGEPAKT' : 'DOOD', 3.5);
}

// spot: {x, y, angle?, name?} chosen by respawn.js (hospital / police
// station); without it the player comes back at a random landmark.
export function respawnPlayer(world, { busted = false, moneyPenalty = 0, announced = false, spot: at = null } = {}) {
  const p = world.player;
  if (p.inVehicle) {
    const v = p.inVehicle;
    v.driver = null;
    v.speed = 0;
    v.driftX = 0;
    v.driftY = 0;
    p.inVehicle = null;
  }
  p.vx = 0;
  p.vy = 0;
  p.gz = 0;
  p.z = 0;
  p.vz = 0;
  const landmarks = world.map.meta.landmarks || [];
  const pick = at || (landmarks.length ? landmarks[Math.floor(Math.random() * landmarks.length)] : world.spawnPoint);
  const spot = at || world.map.findOpenSpawn(pick.x, pick.y, 400) || pick;
  const sx = spot.x, sy = spot.y;
  p.x = sx;
  p.y = sy;
  if (at && Number.isFinite(at.angle)) p.angle = at.angle;
  if (pick.name && !at) world.spawnLandmarkName = pick.name;
  world.health = 100;
  world.armor = 0;
  world.wanted = 0;
  world.wantedDecayTimer = 0;
  world.money = Math.max(0, world.money - moneyPenalty);
  if (!announced) world.addMessage(busted ? 'OPGEPAKT' : 'DOOD', 3.5);
  if (pick.name) world.addMessage(at && at.message ? at.message : `Je respawnt bij ${pick.name}`, 4);
  for (const fn of world.onRespawn) fn(world, { busted });
}
