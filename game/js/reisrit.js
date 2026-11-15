import { hoofdspeler } from './players.js';
// De reisscène bij meerijden (#97): een korte, overslaanbare rit in plaats van een
// leeg wachtscherm. Dunne DOM-laag; de opbouw, de tijd en het skippen met spatie
// zitten in meerijden.js. Na de scène staat de speler op de bestemming (de interne
// verplaatsing, zoals een respawn) en toont main.js het laadscherm voor de sprong.
import { zachtePauze, klokSprongMag, meerSpelers } from './coopgroep.js';
import { ritPlan, startRit, stepRit, aankomst, skipHint, ondertitel, voortgang, shotAt, SKIP_KEY } from './meerijden.js';
import { padButtonIndex, playerPad } from './glyphs.js';

let active = null;

export const isRitActive = () => !!active;

function build(taxi = false, label = '') {
  const el = document.createElement('div');
  el.className = 'reisrit' + (taxi ? ' reisrit-taxi' : '');
  el.style.cssText = 'position:fixed;inset:0;z-index:9000;background:#05080a;color:#f0ede4;font:20px Arial,sans-serif;display:grid;grid-template-rows:12% 1fr 12%;pointer-events:none';
  // #882: de taxi is in beeld: een weg met een rijdende taxi, het dakbord en de
  // meter. De rest van de scène blijft dezelfde dunne, overslaanbare laag.
  const taxiLayer = taxi
    ? '<div class="rr-taxi" style="--p:0;position:relative;height:120px;margin:20px auto 0;width:min(520px,80vw)">'
      + '<div style="position:absolute;left:0;right:0;bottom:18px;height:3px;background:#2a3a40"></div>'
      + '<div class="rr-cab" style="position:absolute;bottom:20px;left:6%;width:88px;height:46px">'
      + '<div style="position:absolute;left:6px;right:6px;top:14px;height:26px;background:#e0b020;border-radius:5px 8px 3px 3px"></div>'
      + '<div style="position:absolute;left:22px;right:16px;top:2px;height:16px;background:#e0b020;border-radius:6px 8px 0 0"></div>'
      + '<div style="position:absolute;left:28px;right:22px;top:5px;height:10px;background:#20303a"></div>'
      + '<div style="position:absolute;left:20px;top:-4px;width:34px;height:8px;background:#f2f0e6;border-radius:2px;color:#111;font:bold 7px Arial,sans-serif;text-align:center;line-height:8px">TAXI</div>'
      + '<div style="position:absolute;left:14px;bottom:-5px;width:16px;height:16px;border-radius:50%;background:#111;border:2px solid #4a4d50"></div>'
      + '<div style="position:absolute;right:14px;bottom:-5px;width:16px;height:16px;border-radius:50%;background:#111;border:2px solid #4a4d50"></div>'
      + '</div></div>'
    : '';
  el.innerHTML = '<div></div><div class="rr-mid" style="display:grid;place-items:center;text-align:center;padding:0 8%"><div><div class="rr-lijn" style="font:14px Arial,sans-serif;letter-spacing:3px;color:#9aa3ad"></div><div class="rr-tekst" style="font-size:34px;margin-top:10px"></div><div class="rr-balk" style="margin:26px auto 0;width:280px;height:4px;background:#1c2a30"><div class="rr-vul" style="height:100%;width:0;background:#5fb4d9"></div></div>' + taxiLayer + '</div></div>' +
    '<div style="display:flex;justify-content:center;align-items:center"><span class="rr-hint" style="display:none;font:15px Arial,sans-serif"><span class="hud-key" data-gk="SPATIE" style="background:#fff;color:#111;border-radius:4px;padding:2px 9px;font:bold 14px Arial,sans-serif;margin-right:8px">Spatie</span>overslaan (of tik op het scherm)</span></div>';
  // de eerste frame is nooit leeg: de scène vult zichzelf meteen met de rit
  el.querySelector('.rr-lijn').textContent = String(label || '').toUpperCase();
  el.querySelector('.rr-tekst').textContent = taxi ? 'Instappen' : '';
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
  const el = build(plan.mode === 'taxi', optie.label);
  document.body.appendChild(el);
  const q = (s) => el.querySelector(s);
  // zoals het laadscherm: de wereld staat stil tijdens de scène
  const wasPaused = !!world.uiPaused;
  world.uiPaused = true;
  zachtePauze(world, 'reisrit', true); // met meer spelers loopt de wereld door; jij reist alleen zelf (#452)
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
      zachtePauze(world, 'reisrit', false);
      const a = aankomst(rit, dest, world.money);
      el.remove();
      if (!a) return resolve({ aangekomen: false });
      world.money -= a.prijs;
      if (typeof world.clock === 'number' && klokSprongMag(world)) world.clock = (world.clock + a.klokMinuten / 60) % 24; // met meer spelers springt de klok niet: de tijd is van iedereen (#452)
      // met de boot kom je bij de aanlegplaats aan (#438): daar blijf je in de buurt, niet 400 m het land op
      const straal = rit.plan.mode === 'boot' ? 40 : 400;
      const spot = (world.map.findOpenSpawn && world.map.findOpenSpawn(a.x, a.y, straal)) || { x: a.x, y: a.y };
      const p = hoofdspeler(world);
      if (p.inVehicle) { p.inVehicle.speed = 0; p.inVehicle.x = spot.x; p.inVehicle.y = spot.y; }
      p.x = spot.x; p.y = spot.y;
      const c = world.companion;
      if (c && c.state !== 'dead' && !meerSpelers(world)) { c.x = spot.x + 1.5; c.y = spot.y; c.vx = 0; c.vy = 0; }
      world.addMessage(a.bericht, 4, { kind: 'reis' });
      resolve({ aangekomen: true, skipped: rit.skipped });
    };
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let padA = false;
      // de A-knop van de pad van speler 1, met dezelfde herbinding en wissel als het spel (#151)
      const pad = playerPad();
      const b = pad && pad.buttons[padButtonIndex('a')];
      padA = !!(b && b.pressed);
      stepRit(rit, dt, { skip: skipKey || padA });
      q('.rr-lijn').textContent = (plan.lines[0] || optie.label).toUpperCase();
      q('.rr-tekst').textContent = ondertitel(rit);
      q('.rr-vul').style.width = `${Math.round(voortgang(rit) * 100)}%`;
      const cab = q('.rr-cab');
      if (cab) cab.style.left = `${6 + voortgang(rit) * 66}%`;
      q('.rr-hint').style.display = skipHint(rit) ? 'inline' : 'none';
      el.dataset.shot = shotAt(plan, rit.t).name;
      if (rit.done) finish();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

