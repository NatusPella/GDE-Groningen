// De reisscène bij meerijden (#97): een korte, overslaanbare rit in plaats van een
// leeg wachtscherm. Dunne DOM-laag; de opbouw, de tijd en het skippen met spatie
// zitten in meerijden.js. Na de scène staat de speler op de bestemming (de interne
// verplaatsing, zoals een respawn) en toont main.js het laadscherm voor de sprong.
import { ritPlan, startRit, stepRit, aankomst, skipHint, ondertitel, voortgang, shotAt, SKIP_KEY } from './meerijden.js';

let active = null;

function build() {
  const el = document.createElement('div');
  el.className = 'reisrit';
  el.style.cssText = 'position:fixed;inset:0;z-index:9000;background:#05080a;color:#f0ede4;font:20px Arial,sans-serif;display:grid;grid-template-rows:12% 1fr 12%;pointer-events:none';
  el.innerHTML = '<div></div><div class="rr-mid" style="display:grid;place-items:center;text-align:center;padding:0 8%"><div><div class="rr-lijn" style="font:14px Arial,sans-serif;letter-spacing:3px;color:#9aa3ad"></div><div class="rr-tekst" style="font-size:34px;margin-top:10px"></div><div class="rr-balk" style="margin:26px auto 0;width:280px;height:4px;background:#1c2a30"><div class="rr-vul" style="height:100%;width:0;background:#5fb4d9"></div></div></div></div>' +
    '<div style="display:flex;justify-content:center;align-items:center"><span class="rr-hint" style="display:none;font:15px Arial,sans-serif"><kbd style="background:#fff;color:#111;border-radius:4px;padding:2px 9px;font:bold 14px Arial,sans-serif;margin-right:8px">Spatie</kbd>overslaan (of tik, A)</span></div>';
  return el;
}

// optie: een optie uit ovopties.reisOpties, dest: { x, y, name }. Resolved met
// { aangekomen, skipped } nadat de speler is verplaatst.
export function startMeerijden(world, optie, dest) {
  if (active || typeof document === 'undefined') return Promise.resolve({ aangekomen: false });
  const plan = ritPlan(optie);
  const rit = startRit(plan);
  if (aankomst(rit, dest, world.money) === null) {
    world.addMessage('Te weinig geld voor dit kaartje', 2.5);
    return Promise.resolve({ aangekomen: false });
  }
  const el = build();
  document.body.appendChild(el);
  const q = (s) => el.querySelector(s);
  // zoals het laadscherm: de wereld staat stil tijdens de scène
  const wasPaused = !!world.uiPaused;
  world.uiPaused = true;
  let skipKey = false;
  const down = (e) => { if (e.key === SKIP_KEY) { skipKey = true; e.preventDefault(); e.stopPropagation(); } };
  const up = (e) => { if (e.key === SKIP_KEY) { skipKey = false; e.preventDefault(); e.stopPropagation(); } };
  // touch and gamepad A skip too (a phone has no space bar)
  const tap = () => { skipKey = true; setTimeout(() => { skipKey = false; }, 120); };
  el.style.pointerEvents = 'auto';
  el.addEventListener('pointerdown', tap);
  document.addEventListener('keydown', down, true);
  document.addEventListener('keyup', up, true);
  return new Promise((resolve) => {
    let last = performance.now();
    active = rit;
    const finish = () => {
      document.removeEventListener('keydown', down, true);
      document.removeEventListener('keyup', up, true);
      active = null;
      world.uiPaused = wasPaused;
      const a = aankomst(rit, dest, world.money);
      el.remove();
      if (!a) return resolve({ aangekomen: false });
      world.money -= a.prijs;
      if (typeof world.clock === 'number') world.clock = (world.clock + a.klokMinuten / 60) % 24;
      const spot = (world.map.findOpenSpawn && world.map.findOpenSpawn(a.x, a.y, 400)) || { x: a.x, y: a.y };
      const p = world.player;
      if (p.inVehicle) { p.inVehicle.speed = 0; p.inVehicle.x = spot.x; p.inVehicle.y = spot.y; }
      p.x = spot.x; p.y = spot.y;
      const c = world.companion;
      if (c && c.state !== 'dead') { c.x = spot.x + 1.5; c.y = spot.y; c.vx = 0; c.vy = 0; }
      world.addMessage(a.bericht, 4, { kind: 'reis' });
      resolve({ aangekomen: true, skipped: rit.skipped });
    };
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let padA = false;
      try { const pad = (navigator.getGamepads ? [...navigator.getGamepads()] : []).find((g) => g && g.connected); padA = !!(pad && pad.buttons[0]?.pressed); } catch (e) { /* none */ }
      stepRit(rit, dt, { skip: skipKey || padA });
      q('.rr-lijn').textContent = (plan.lines[0] || optie.label).toUpperCase();
      q('.rr-tekst').textContent = ondertitel(rit);
      q('.rr-vul').style.width = `${Math.round(voortgang(rit) * 100)}%`;
      q('.rr-hint').style.display = skipHint(rit) ? 'inline' : 'none';
      el.dataset.shot = shotAt(plan, rit.t).name;
      if (rit.done) finish();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
