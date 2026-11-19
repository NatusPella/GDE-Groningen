// De echte rit in de echte wereld (#882 taxi, #926 trein): de speler zit als passagier in een taxi of trein die
// door de wereld rijdt naar het doel dat op de kaart staat. De rekenkant staat in ritpad.js (het tijdsplan met
// echt begin, tijdsprong en echt einde, de klok, de camera); hier staan de wereldkoppelingen: het voertuig, de
// camera via cinematics.js (de wereld loopt door en streamt mee met de camera, zoals bij een filmpje), een kleine
// rit-HUD en het opruimen. Lukt er iets niet, dan geeft start3dRit null of { terugval: true } en speelt reisrit.js
// de oude korte scène. Samen spelen: de rit is een eigen scène van wie hem rijdt (geen netwerkbericht, de wereld
// van de anderen loopt door); de klok springt alleen als je alleen speelt (klokSprongMag).
import { hoofdspeler } from './players.js';
import { playCinematic, skipCinematic } from './cinematics.js';
import { cinematicLinks } from './latehooks.js';
import { Vehicle } from './vehicle.js';
import { carModel, applyFleetFlags } from './trafficfleet.js';
import { smoothPath, cineDrive } from './cinedrive.js';
import { interiorEyePose } from './carinterior.js';
import { planDriveRoute } from './routing.js';
import { getRoutes as getSpoorRoutes, addMissionTrain, removeMissionTrain, placeTrain, clearTrackFor } from './railway.js';
import { klokSprongMag } from './coopgroep.js';
import { refreshDayNight } from './daynight.js';
import { padButtonIndex, playerPad } from './glyphs.js';
import * as P from './ritpad.js';

let lopend = null;
export const isRit3dActive = () => !!lopend;

const schoon = (pts) => {
  const out = [];
  for (const p of pts || []) {
    if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
    const l = out[out.length - 1];
    if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) > 0.5) out.push([p[0], p[1]]);
  }
  return out;
};
const zHoogte = (map, x, y) => (map && map.spawnZ ? map.spawnZ(x, y) : 0);
const voorspel = (x, y, secs = 8) => { try { cinematicLinks.prewarmStreamAt(x, y, secs); } catch (e) { /* streamen is een hulpmiddel */ } };

// ---- de taxi ---------------------------------------------------------------------------------------------

function bouwTaxi(world, optie, dest) {
  const p = hoofdspeler(world);
  const r = planDriveRoute(world, dest, p);
  const pts = schoon(r && !r.noRoute ? r.pts : null);
  if (!P.ritKanEcht('taxi', { pad: pts })) return null;
  const pad = smoothPath(pts, 1);
  const plan = P.ritTijdplan(pad.len, { mode: 'taxi', etaS: optie.etaS });
  const baan = (s) => P.rechterBaan(pad.at(s));
  let v = null, lastS = 0, lastT = 0, gezien = '';
  const sluitStart = () => baan(Math.max(0, pad.len - plan.dcM));
  return {
    plan,
    prewarm: plan.kort ? [pad.at(0), pad.at(pad.len)] : [pad.at(0), pad.at(pad.len - plan.dcM), pad.at(pad.len)],
    begin(w) {
      const q = baan(0);
      v = new Vehicle(q.x, q.y, q.a, carModel('taxi'));
      applyFleetFlags(v, 'taxi');
      Object.assign(v, { road: null, plan: [], driver: 'cine', cineTemp: true, missionCar: true, z: zHoogte(w.map, q.x, q.y) });
      w.vehicles.push(v);
      w.ritTaxi = v; // scene3d tekent het interieur voor de passagier
      cineDrive(v, w.map, q, 0, 0, v.z);
    },
    stap(w, stand, t) {
      const dt = Math.max(0, Math.min(0.1, t - lastT));
      lastT = t;
      const spring = Math.abs(stand.s - lastS) > 40;
      lastS = stand.s;
      const q = baan(stand.s);
      if (spring) voorspel(q.x, q.y);
      cineDrive(v, w.map, q, stand.v, dt, spring ? zHoogte(w.map, q.x, q.y) : null);
      if (stand.fase === 'sprong' && gezien !== 'sprong') { gezien = 'sprong'; const c = sluitStart(); voorspel(c.x, c.y, 10); }
      const eye = interiorEyePose(v);
      const oog = eye ? P.bijrijdersOog(eye, v) : { x: v.x - Math.cos(v.angle) * 0.6, y: v.y - Math.sin(v.angle) * 0.6, z: (v.z || 0) + 1.15, fx: Math.cos(v.angle), fy: Math.sin(v.angle) };
      return { ...P.taxiCamera(oog, t), cut: true };
    },
    einde(w) {
      if (v) { const i = w.vehicles.indexOf(v); if (i >= 0) w.vehicles.splice(i, 1); }
      v = null;
      if (w.ritTaxi) w.ritTaxi = null;
    },
  };
}

// ---- de trein --------------------------------------------------------------------------------------------

function bouwTrein(world, optie) {
  const stukken = P.treinStukken(optie.legs, getSpoorRoutes());
  if (!P.ritKanEcht('trein', { stukken })) return null;
  const plan = P.ritTijdplan(stukken.lengthM, { mode: 'trein', etaS: optie.etaS });
  if (plan.kort ? !stukken.enkel : (stukken.A.len < plan.daM + 20 || stukken.C.len < plan.dcM + 20)) return null;
  let trein = null, stuk = null;
  const zet = (w, nieuw, c) => {
    if (!trein || stuk !== nieuw) {
      if (trein) removeMissionTrain(trein);
      stuk = nieuw;
      trein = addMissionTrain(nieuw.naam, nieuw.type, c, nieuw.dir);
      if (!trein) throw new Error('geen trein op het spoor');
      trein.dir = nieuw.dir;
      const a = Math.min(nieuw.s0, nieuw.s1) - 60, b = Math.max(nieuw.s0, nieuw.s1) + 60;
      clearTrackFor(trein, a, b, w, 90);
    }
    trein.c = Math.max(trein.halfLen, Math.min(nieuw.route.len - trein.halfLen, c));
    placeTrain(trein);
    return trein;
  };
  // het stuk en de plek langs het spoor bij een afstand `s` van het begin van de rit
  const plek = (stand) => {
    if (plan.kort) return { stuk: stukken.A, c: P.spoorBoog(stukken.A, stand.s) };
    if (stand.s < plan.lengthM / 2) return { stuk: stukken.A, c: P.spoorBoog(stukken.A, stand.s) };
    const dC = stand.s - (plan.lengthM - plan.dcM);
    return { stuk: stukken.C, c: P.spoorBoog(stukken.C, stukken.C.len - plan.dcM + dC) };
  };
  let lastS = 0;
  const punt = (s) => { const k = plek({ s }); const [x, y] = routePunt(k.stuk.route, k.c); return { x, y }; };
  return {
    plan,
    prewarm: plan.kort ? [punt(0), punt(plan.lengthM)] : [punt(0), punt(plan.lengthM - plan.dcM), punt(plan.lengthM)],
    begin(w) { const k = plek({ s: 0 }); zet(w, k.stuk, k.c); },
    stap(w, stand) {
      const k = plek(stand);
      const t = zet(w, k.stuk, k.c);
      if (Math.abs(stand.s - lastS) > 40) { const q = punt(stand.s); voorspel(q.x, q.y); }
      lastS = stand.s;
      const car = t.cars[Math.floor(t.cars.length / 2)] || t.cars[0];
      return { ...P.treinCamera(car, t.dir, P.treinBeeld(plan, stand)), cut: true };
    },
    einde() {
      if (trein) removeMissionTrain(trein);
      trein = null; stuk = null;
    },
  };
}

function routePunt(route, at) {
  const { pts, s } = route;
  if (at <= 0) return pts[0];
  if (at >= route.len) return pts[pts.length - 1];
  let lo = 0, hi = pts.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (s[mid] <= at) lo = mid; else hi = mid; }
  const k = (at - s[lo]) / ((s[hi] - s[lo]) || 1);
  return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * k, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * k];
}

// ---- de rit-HUD: een zwart vlak voor de sprong, de kloktekst en een kleine balk met de bestemming -----------

function bouwHud(titel, bestemming) {
  const el = document.createElement('div');
  el.className = 'reisrit3d';
  el.style.cssText = 'position:fixed;inset:0;z-index:9000;pointer-events:auto;font:20px Arial,sans-serif;color:#f0ede4';
  el.innerHTML = '<div class="rr3-zwart" style="position:absolute;inset:0;background:#0c140e;opacity:1;pointer-events:none"></div>'
    + '<div class="rr3-sprong" style="position:absolute;inset:0;display:grid;place-items:center;text-align:center;font:34px Arial,sans-serif;pointer-events:none;opacity:0"><div><div class="rr3-tekst"></div><div class="rr3-klok" style="font-size:22px;margin-top:10px;opacity:.8"></div></div></div>'
    + '<div class="rr3-balk" style="position:absolute;left:0;right:0;bottom:7%;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;text-shadow:0 1px 4px rgba(0,0,0,.7)">'
    + '<div class="rr3-lijn" style="font:bold 14px Arial,sans-serif;letter-spacing:3px"></div>'
    + '<div class="rr3-rest" style="font:22px Arial,sans-serif"></div>'
    + '<div style="width:260px;height:3px;background:rgba(240,237,228,.25)"><div class="rr3-vul" style="height:100%;width:0;background:#3fc97a"></div></div>'
    + '<span class="rr3-hint" style="display:none;font:15px Arial,sans-serif"><span class="hud-key" data-gk="SPATIE" style="background:#f0ede4;color:#0f5c30;border-radius:4px;padding:2px 9px;font:bold 14px Arial,sans-serif;margin-right:8px">Spatie</span>overslaan (of tik op het scherm)</span></div>';
  el.querySelector('.rr3-lijn').textContent = String(titel || '').toUpperCase();
  el.querySelector('.rr3-rest').textContent = bestemming ? `Naar ${bestemming}` : '';
  return el;
}

// optie: een reisoptie (taxi of trein), plan: ritPlan(optie) uit meerijden.js, dest: { x, y, name }.
// Geeft null als de rit niet echt kan (dan de oude scène), anders een belofte die klaar is als de scène
// uitliep, geskipt werd of afbrak: { skipped, terugval }.
export function start3dRit(world, optie, plan, dest) {
  if (lopend || !world || !world.map || typeof document === 'undefined') return null;
  if (plan.mode !== 'taxi' && plan.mode !== 'trein') return null;
  let regie;
  try { regie = plan.mode === 'taxi' ? bouwTaxi(world, optie, dest) : bouwTrein(world, optie, dest); } catch (e) { console.warn('reisrit3d: bouwen', e); return null; }
  if (!regie) return null;
  const tp = regie.plan;
  const klokMag = klokSprongMag(world);
  const staat = {
    fout: null, skip: false, klaar: false, t: 0, laatstePose: null,
    klok0: world.clock, gezond0: world.health, hold0: !!world.challengeHoldPlayer,
  };
  const hud = bouwHud(optie.label || (plan.mode === 'trein' ? 'Met de trein' : 'Met de taxi'), dest && dest.name);
  const q = (s) => hud.querySelector(s);
  document.body.appendChild(hud);
  const zwart = q('.rr3-zwart');
  let skipKey = false;
  const down = (e) => { if (e.key === ' ') { skipKey = true; e.preventDefault(); e.stopPropagation(); } };
  const up = (e) => { if (e.key === ' ') { skipKey = false; e.preventDefault(); e.stopPropagation(); } };
  const tap = () => { skipKey = true; setTimeout(() => { skipKey = false; }, 120); };
  hud.addEventListener('pointerdown', tap);
  document.addEventListener('keydown', down, true);
  document.addEventListener('keyup', up, true);

  const opruimen = () => {
    document.removeEventListener('keydown', down, true);
    document.removeEventListener('keyup', up, true);
    try { regie.einde(world); } catch (e) { console.warn('reisrit3d: opruimen', e); }
    world.challengeHoldPlayer = staat.hold0;
    if (klokMag && typeof staat.klok0 === 'number') world.clock = staat.klok0; // reisrit.js zet de aankomsttijd er na de landing bij
    lopend = null;
  };

  return new Promise((resolve) => {
    let hudKlaar = false;
    const hudWeg = () => {
      if (hudKlaar) return;
      hudKlaar = true;
      hud.style.pointerEvents = 'none';
      zwart.style.transition = 'opacity .6s';
      requestAnimationFrame(() => { zwart.style.opacity = '0'; });
      setTimeout(() => hud.remove(), 800);
    };
    const eind = (skipped) => {
      const fout = staat.fout;
      opruimen();
      hudWeg();
      resolve(fout ? { terugval: true, skipped: false } : { terugval: false, skipped: !!skipped });
    };
    const spec = {
      id: 'reisrit', priority: 6, duration: tp.totaalS + 0.6, letterbox: true, hideHud: true, pause: false, skippable: false,
      prewarm: regie.prewarm,
      shot: (u, t, w) => {
        staat.t = t;
        try {
          // jij bent onkwetsbaar en staat stil (verborgen op je plek): de wereld verandert niet door de rit
          if (typeof staat.gezond0 === 'number' && w.health < staat.gezond0) w.health = staat.gezond0;
          const pad = playerPad();
          const b = pad && pad.buttons[padButtonIndex('a')];
          if ((skipKey || (b && b.pressed)) && P.magSkippen(t, staat.klaar) && !staat.skip) {
            staat.skip = true;
            zwart.style.transition = 'none';
            zwart.style.opacity = '1';
            queueMicrotask(() => skipCinematic());
          }
          const stand = P.ritStand(tp, t);
          const pose = regie.stap(w, stand, t);
          if (klokMag && typeof staat.klok0 === 'number') { w.clock = (staat.klok0 + stand.minuten / 60) % 24; refreshDayNight(w); }
          if (!staat.skip) {
            const intro = t < 0.6 ? 1 - t / 0.6 : 0;
            const uit = t > tp.totaalS - 0.4 ? (t - (tp.totaalS - 0.4)) / 0.4 : 0;
            zwart.style.transition = 'none';
            zwart.style.opacity = String(Math.max(stand.fade, Math.max(0, intro), Math.min(1, uit)));
          }
          const sprong = stand.fase === 'sprong';
          q('.rr3-sprong').style.opacity = sprong ? '1' : '0';
          if (sprong) {
            q('.rr3-tekst').textContent = P.sprongTekstVoor(stand, klokMag);
            q('.rr3-klok').textContent = klokMag && typeof staat.klok0 === 'number' ? P.klokLabel(staat.klok0 + stand.minuten / 60) : '';
          }
          const rest = Math.max(0, Math.round(tp.clockMin - stand.minuten));
          q('.rr3-rest').textContent = stand.fase === 'aankomst' ? `Aangekomen${dest && dest.name ? ` in ${dest.name}` : ''}` : `Naar ${(dest && dest.name) || 'je bestemming'} · nog ± ${Math.max(1, rest)} min`;
          q('.rr3-vul').style.width = `${Math.round(Math.min(1, stand.u) * 100)}%`;
          q('.rr3-hint').style.display = P.magSkippen(t, staat.klaar || staat.skip) ? 'inline' : 'none';
          staat.laatstePose = pose;
          return pose;
        } catch (e) {
          console.warn('reisrit3d: scène', e);
          staat.fout = e;
          queueMicrotask(() => skipCinematic());
          return staat.laatstePose;
        }
      },
      onStart() {
        world.cinematicHidePlayers = true;
        world.challengeHoldPlayer = true;
        zwart.style.transition = 'none';
      },
      onEnd(skipped) {
        staat.klaar = true;
        eind(skipped || staat.skip);
      },
    };
    lopend = { regie, staat };
    let ok = false;
    try { regie.begin(world); ok = playCinematic(spec); } catch (e) { console.warn('reisrit3d: starten', e); staat.fout = e; }
    if (!ok) {
      // de scène kon niet starten (een andere scène gaat voor): opruimen en de oude scène laten spelen
      staat.fout = staat.fout || new Error('scène niet gestart');
      eind(false);
    }
  });
}
