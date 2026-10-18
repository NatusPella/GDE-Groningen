// Zeilvaren in de open wereld (#197): een boot met model.zeil (zeilboot) vaart op de wind uit
// zeilrules.js. De wind komt uit de dag en het uur (geen klok van buiten), Q haalt het zeil aan,
// Z viert het. De boot laat de gewone vaarlaag het werk doen (v.sailTop is de snelheid die de
// wind toelaat, zoals bij het skûtsje) en wordt hier alleen vooruit getrokken tot die snelheid.
// Regels getest in scripts/zeilvaren_test.mjs.
import { windOp, windHoek, polair, trimRendement, BOOT_SOORTEN, WIND, standTekst } from './zeilrules.js';

export const TRIM_RATE = 0.5;      // per seconde, zoals stepZeil
export const TEKST_GAP_S = 7;      // s tussen twee korte stand-teksten

// De snelheid die de wind aan een boot met deze koers en schoot geeft.
export function windSnelheid(heading, trim, wind, soort = BOOT_SOORTEN.zeilboot) {
  const hoek = windHoek(heading, wind);
  return soort.maxSpeed * (wind.speed / WIND.max) * polair(hoek) * trimRendement(trim, hoek);
}

// Eén stap voor een zeilende boot: trim bijwerken, sailTop zetten, snelheid naar de wind toe trekken.
export function zeilStap(v, wind, inp, dt, soort = BOOT_SOORTEN.zeilboot) {
  v.zeilTrim = Math.max(0, Math.min(1, (v.zeilTrim ?? 0.6) + (inp.trim || 0) * TRIM_RATE * dt));
  v.sailTop = windSnelheid(v.angle, v.zeilTrim, wind, soort);
  if ((v.speed || 0) < v.sailTop) v.speed = Math.min(v.sailTop, (v.speed || 0) + soort.accel * dt);
  return v.sailTop;
}

// Windwijzer (HUD): de pijl wijst waar de wind heen waait, gezien vanaf de boot (boeg = boven).
// hoek: windHoek (0 = wind recht van voren), in graden voor CSS rotate (kloksgewijs).
export const windPijlGraden = (hoek) => 180 - (hoek * 180) / Math.PI;

let wijzer = null;
function toonWijzer(v, wind, hoek) {
  if (typeof document === 'undefined') return;
  if (!wijzer) {
    wijzer = document.createElement('div');
    wijzer.id = 'windwijzer';
    wijzer.setAttribute('role', 'img');
    wijzer.innerHTML = '<svg viewBox="-20 -20 40 40" aria-hidden="true"><circle r="18" class="ww-ring"/><path class="ww-pijl" d="M0 -13 L6 5 L0 1 L-6 5 Z"/></svg><b class="ww-snel"></b><span class="ww-trim"><i></i></span><span class="ww-keys"><span class="hud-key">Q</span> aan <span class="hud-key">Z</span> vieren</span>';
    document.body.appendChild(wijzer);
  }
  wijzer.hidden = false;
  wijzer.querySelector('.ww-pijl').style.transform = `rotate(${windPijlGraden(hoek).toFixed(0)}deg)`;
  wijzer.querySelector('.ww-snel').textContent = `${Math.round(wind.speed)} m/s`;
  wijzer.querySelector('.ww-trim i').style.width = `${Math.round((v.zeilTrim ?? 0.6) * 100)}%`;
  wijzer.setAttribute('aria-label', `Wind ${Math.round(wind.speed)} meter per seconde, zeil ${Math.round((v.zeilTrim ?? 0.6) * 100)} procent aangehaald`);
}
function verbergWijzer() { if (wijzer) wijzer.hidden = true; }

let textT = 0;

export function updateZeilvaren(dt, world, dag) {
  const v = world && world.player && world.player.inVehicle;
  if (!v || !v.isBoat || !v.model || !v.model.zeil || v.driver !== 'player') { verbergWijzer(); if (v && v.model && v.model.zeil) v.sailTop = null; return; }
  if (world.paused) return;
  const uur = ((world.clock % 24) + 24) % 24;
  const wind = windOp(dag, uur);
  world.wind = wind;
  const inp = { trim: (world.input.isDown('q') ? 1 : 0) - (world.input.isDown('z') ? 1 : 0) };
  zeilStap(v, wind, inp, dt);
  toonWijzer(v, wind, windHoek(v.angle, wind));
  textT -= dt;
  if (textT <= 0) {
    textT = TEKST_GAP_S;
    world.addMessage(`${standTekst({ heading: v.angle, omgeslagen: 0 }, wind)} · wind ${Math.round(wind.speed)} m/s`, 2.5);
  }
}
