const GREEN_TIME = 8;
const YELLOW_TIME = 2;
const RED_TIME = 8;
const CYCLE_TIME = GREEN_TIME + YELLOW_TIME + RED_TIME;

const APPROACH_DIST = 12;
const APPROACH_DOT = 0.55;
const PLAYER_APPROACH_DIST = 14;
const PLAYER_SPEED_CAP = 2;

let lights = [];

function phaseAt(t) {
  if (t < GREEN_TIME) return 'green';
  if (t < GREEN_TIME + YELLOW_TIME) return 'yellow';
  return 'red';
}

export function initTrafficLights(world) {
  const positions = world.map.meta.trafficLights || [];
  lights = positions.map((p) => ({
    x: p.x,
    y: p.y,
    t: Math.random() * CYCLE_TIME,
  }));
}

export function updateTrafficLights(dt, world) {
  for (const light of lights) {
    light.t = (light.t + dt) % CYCLE_TIME;
  }
  if (!lights.length) return;

  for (const v of world.vehicles) {
    if (v.wrecked || v.driver === 'player' || !v.road) continue;
    const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
    for (const light of lights) {
      if (phaseAt(light.t) !== 'red') continue;
      const dx = light.x - v.x, dy = light.y - v.y;
      const d = Math.hypot(dx, dy);
      if (d > APPROACH_DIST) continue;
      const dot = (dx * fx + dy * fy) / (d || 1);
      if (dot < APPROACH_DOT) continue;
      v.waitTimer = 0.3;
      break;
    }
  }

  const pv = world.player.inVehicle;
  if (pv && !pv.wrecked) {
    const fx = Math.cos(pv.angle), fy = Math.sin(pv.angle);
    for (const light of lights) {
      if (phaseAt(light.t) !== 'red') continue;
      const dx = light.x - pv.x, dy = light.y - pv.y;
      const d = Math.hypot(dx, dy);
      if (d > PLAYER_APPROACH_DIST) continue;
      const dot = (dx * fx + dy * fy) / (d || 1);
      if (dot < APPROACH_DOT) continue;
      pv.speed = Math.min(pv.speed, PLAYER_SPEED_CAP);
      break;
    }
  }
}

const PHASE_COLORS = { green: '#2ecc40', yellow: '#f1c40f', red: '#e74c3c' };

export function drawTrafficLights(ctx, world) {
  for (const light of lights) {
    const phase = phaseAt(light.t);
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.moveTo(light.x, light.y);
    ctx.lineTo(light.x, light.y - 2.6);
    ctx.stroke();

    ctx.fillStyle = '#26282b';
    ctx.beginPath();
    ctx.roundRect(light.x - 0.28, light.y - 3.3, 0.56, 0.9, 0.1);
    ctx.fill();

    ctx.fillStyle = PHASE_COLORS[phase];
    ctx.beginPath();
    ctx.arc(light.x, light.y - 2.85, 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
}
