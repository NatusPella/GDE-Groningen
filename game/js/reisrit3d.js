// De echte rit in de echte wereld (#882 taxi, #926 trein): de speler zit als passagier in een taxi of trein die
// door de wereld rijdt naar het doel dat op de kaart staat. De rekenkant staat in ritpad.js (het tijdsplan met
// echt begin, tijdsprong en echt einde, de klok, de camera); hier staan de wereldkoppelingen: het voertuig, de
// camera via cinematics.js (de wereld loopt door en streamt mee met de camera, zoals bij een filmpje), een kleine
// rit-HUD en het opruimen. De binnenkant (de cabine van de taxi met chauffeur en meter, het raam van de treincoupé) staat in
// ritcabine.js (maten) en ritcabine3d.js (beeld); scene3d.js tekent hem aan de hand van world.ritTaxi, world.ritMeter en world.ritKader. Lukt er iets niet, dan geeft start3dRit null of { terugval: true } en speelt reisrit.js
// de oude korte scène. Samen spelen: de rit is een eigen scène van wie hem rijdt (geen netwerkbericht, de wereld
// van de anderen loopt door); de klok springt alleen als je alleen speelt (klokSprongMag).
import { hoofdspeler } from './players.js';
import { playCinematic, skipCinematic } from './cinematics.js';
import { cinematicLinks } from './latehooks.js';
import { Vehicle } from './vehicle.js';
import { carModel, applyFleetFlags } from './trafficfleet.js';
import { cineDrive } from './cinedrive.js';
import { taxiBedrag, perronPlek } from './ritcabine.js';
import { planDriveRoute, insideBuilding } from './routing.js';
import { ritRoute } from './ridepath.js';
import { getRoutes as getSpoorRoutes, addMissionTrain, removeMissionTrain, placeTrain, clearTrackFor } from './railway.js';
import { pushAudioEvent } from './pedgeom.js';
import { klokSprongMag } from './coopgroep.js';
import { refreshDayNight } from './daynight.js';
import { padButtonIndex, playerPad } from './glyphs.js';
import { getSettings, setSetting } from './settings.js';
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
  // het pad volgt de weg en snijdt geen gebouw; de taxi start en stopt aan de straatkant (ridepath.js, #882)
  const rr = ritRoute(pts, { start: { x: p.x, y: p.y }, doel: dest, binnen: (x, y) => insideBuilding(world.map, x, y) });
  const pad = rr.pad;
  if (rr.schendingen > 0) console.warn(`reisrit3d: ${rr.schendingen} punten van het ritpad liggen in een gebouw (data)`);
  const plan = P.ritTijdplan(pad.len, { mode: 'taxi', etaS: optie.etaS });
  const baan = (s) => P.rechterBaan(pad.at(s));
  const meter = (s) => taxiBedrag(s, { totaalM: plan.lengthM, prijs: optie.price });
  let v = null, lastS = 0, lastT = 0, gezien = '';
  const dyn = P.maakDynamiek();
  const sluitStart = () => baan(Math.max(0, pad.len - plan.dcM));
  return {
    plan, padInfo: { schendingen: rr.schendingen, mix: rr.mix, beginBinnen: rr.begin, eindBinnen: rr.eind },
    prewarm: plan.kort ? [pad.at(0), pad.at(pad.len)] : [pad.at(0), pad.at(pad.len - plan.dcM), pad.at(pad.len)],
    begin(w) {
      const q = baan(0);
      // de tegels langs de hele rit vooraf aanvragen (tileworld.js warmRoute): de taxi komt er op snelheid langs
      try { const rp = []; for (let s = 0; s <= pad.len; s += 250) { const a = pad.at(s); rp.push([a.x, a.y]); } if (w.map && w.map.warmRoute) w.map.warmRoute(rp); } catch (e) { /* vooruitladen is een hulpmiddel */ }
      v = new Vehicle(q.x, q.y, q.a, carModel('taxi'));
      applyFleetFlags(v, 'taxi');
      // ghost (#1020): het verkeer botst niet met de taxi van de rit; anders kreeg hij deuken onderweg (beeldcheck 21-11)
      Object.assign(v, { road: null, plan: [], driver: 'cine', cineTemp: true, missionCar: true, ghost: true, z: zHoogte(w.map, q.x, q.y) });
      w.vehicles.push(v);
      pushAudioEvent(w, { kind: 'door_close', x: q.x, y: q.y, auto: true }); // het portier gaat dicht (greep, deur): je zit
      w.ritTaxi = v; // scene3d tekent de cabine van Gele Gans voor de passagier (ritcabine3d.js)
      w.ritMeter = meter(0);
      cineDrive(v, w.map, q, 0, 0, v.z);
      // de verborgen speler staat er vanaf het eerste beeld, zodat het voertuig en zijn cabine meteen getekend worden (in de eerste seconden zat de camera nog zonder cabine op de weg, beeldcheck 20-11)
      const hp = hoofdspeler(w);
      hp.x = v.x; hp.y = v.y; hp.gz = v.z || 0;
    },
    stap(w, stand, t, cam = 'cabine') {
      const dt = Math.max(0, Math.min(0.1, t - lastT));
      lastT = t;
      const spring = Math.abs(stand.s - lastS) > 40;
      lastS = stand.s;
      const q = baan(stand.s);
      if (spring) voorspel(q.x, q.y);
      cineDrive(v, w.map, q, stand.v, dt, spring ? zHoogte(w.map, q.x, q.y) : null);
      // de verborgen speler rijdt mee: voertuigmeshes worden rond de speler getekend, en na de tijdsprong stond de taxi kilometers
      // van hem af, zodat de cabine ontbrak in de laatste helft van de rit (beeldcheck #882)
      const hp = hoofdspeler(w);
      hp.x = v.x; hp.y = v.y; hp.gz = v.z || 0;
      if (stand.fase === 'sprong' && gezien !== 'sprong') { gezien = 'sprong'; const c = sluitStart(); voorspel(c.x, c.y, 10); }
      w.ritMeter = meter(stand.s);
      const d = spring ? dyn.stand() : dyn.stap(v.angle, stand.v, dt); // een tijdsprong telt niet als bocht of schok
      w.ritStuur = d.stuur;
      w.ritBuiten = cam !== 'cabine'; // een buitencamera toont het model van de taxi en niet de cabine (ritcabine3d.js)
      if (w.ritBuiten) return { ...P.ritBuitenCamera(v, cam), cut: true };
      return { ...P.taxiCamera(P.taxiOog(v), t, 30, { ...d, v: stand.v }), cut: true };
    },
    einde(w) {
      if (v && w) pushAudioEvent(w, { kind: 'door_open', x: v.x, y: v.y, auto: true }); // uitstappen
      if (v) { const i = w.vehicles.indexOf(v); if (i >= 0) w.vehicles.splice(i, 1); }
      v = null;
      if (w.ritTaxi) w.ritTaxi = null;
      w.ritMeter = 0;
      w.ritStuur = 0;
      w.ritBuiten = false;
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
    begin(w) {
      const k = plek({ s: 0 }); zet(w, k.stuk, k.c);
      // de tegels langs het spoor vooraf aanvragen (tileworld.js warmRoute)
      try { const rp = []; for (let s = 0; s <= plan.lengthM; s += 300) { const q = punt(s); rp.push([q.x, q.y]); } if (w.map && w.map.warmRoute) w.map.warmRoute(rp); } catch (e) { /* vooruitladen is een hulpmiddel */ }
    },
    // het perron van de aankomst: waar de trein stopt, de plek langs het spoor (#926); null: dan de gewone landing
    landing(w) {
      const k = plek({ s: plan.lengthM }), [x, y] = routePunt(k.stuk.route, k.c);
      const legs = (optie.legs || []).filter((l) => l && l.kind === 'train');
      return perronPlek(w.map && w.map.perrons, [x, y], { naam: legs.length ? legs[legs.length - 1].to : '' });
    },
    stap(w, stand, tijd, cam = 'cabine') {
      const k = plek(stand);
      const t = zet(w, k.stuk, k.c);
      if (Math.abs(stand.s - lastS) > 40) { const q = punt(stand.s); voorspel(q.x, q.y); }
      lastS = stand.s;
      const car = t.cars[Math.floor(t.cars.length / 2)] || t.cars[0];
      const beeld = cam === 'cabine' ? P.treinBeeld(plan, stand) : cam;
      w.ritKader = beeld === 'raam' ? 'trein' : null; // bij het raam zit je in de coupé; naast de trein kijk je van buiten
      return { ...P.treinCamera(car, t.dir, beeld, tijd, stand.v), cut: true };
    },
    einde(w) {
      if (trein) removeMissionTrain(trein);
      trein = null; stuk = null;
      if (w) w.ritKader = null;
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
  el.style.cssText = 'position:fixed;inset:0;z-index:9000;pointer-events:auto;font:20px var(--ds-font-zeef-tekst);color:var(--ds-c-ink-inkt)';
  el.innerHTML = '<div class="rr3-zwart" style="position:absolute;inset:0;background:var(--ds-c-glas);opacity:1;pointer-events:none"></div>'
    + '<div class="rr3-sprong" style="position:absolute;inset:0;display:grid;place-items:center;text-align:center;font:800 34px var(--ds-font-zeef-kop);color:var(--ds-c-ink-papier);pointer-events:none;opacity:0"><div><div class="rr3-tekst"></div><div class="rr3-klok" style="font-size:22px;margin-top:10px;opacity:.8"></div></div></div>'
    + '<div class="rr3-balk" style="position:absolute;left:0;right:0;bottom:7%;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;left:50%;right:auto;transform:translateX(-50%);width:max-content;max-width:90vw;padding:10px 24px 12px;box-sizing:border-box;background:var(--ds-c-ink-papier);border:var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt);border-radius:8px;box-shadow:var(--ds-schaduw-hard)">'
    + '<div class="rr3-lijn" style="font:800 16px var(--ds-font-zeef-kop);letter-spacing:0.12em;color:var(--ds-c-ink-bord)"></div>'
    + '<div class="rr3-rest" style="font:800 24px var(--ds-font-zeef-kop)"></div>'
    + '<div style="width:260px;height:12px;box-sizing:border-box;border:var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt);border-radius:4px;overflow:hidden;background:var(--ds-c-ink-papier)"><div class="rr3-vul" style="height:100%;width:0;background:var(--ds-c-ink-geel)"></div></div>'
    + '<span class="rr3-cam" style="font:14px var(--ds-font-zeef-tekst)"><span style="background:var(--ds-c-ink-inkt);color:var(--ds-c-ink-papier);border-radius:4px;padding:1px 8px;font:800 14px var(--ds-font-zeef-kop);margin-right:8px">C of Y</span>camera: <b class="rr3-camnaam"></b></span>'
    + '<span class="rr3-hint" style="display:none;font:15px var(--ds-font-zeef-tekst)">{SPACE}overslaan (of tik op het scherm)</span></div>';
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
    cam: P.geldigeRitCamera(getSettings().ritCamera), klok0: world.clock, gezond0: world.health, hold0: !!world.challengeHoldPlayer,
  };
  const hud = bouwHud(optie.label || (plan.mode === 'trein' ? 'Met de trein' : 'Met de taxi'), dest && dest.name);
  const q = (s) => hud.querySelector(s);
  document.body.appendChild(hud);
  const zwart = q('.rr3-zwart');
  let skipKey = false;
  const zetCam = (k) => { staat.cam = k; q('.rr3-camnaam').textContent = P.RIT_CAMERA_NAMEN[k]; try { setSetting('ritCamera', k); } catch (e) { /* de keuze blijft voor deze rit */ } };
  zetCam(staat.cam);
  const down = (e) => {
    if (e.key === ' ') { skipKey = true; e.preventDefault(); e.stopPropagation(); }
    else if ((e.key === 'c' || e.key === 'C') && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) { zetCam(P.volgendeRitCamera(staat.cam)); e.preventDefault(); e.stopPropagation(); } // lokaal per speler; de eerstepersoonstoets C doet in de rit niets
  };
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
    world.ritBezig = false;
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
      let landing = null;
      try { landing = !fout && regie.landing ? regie.landing(world) : null; } catch (e) { console.warn('reisrit3d: perron', e); }
      opruimen();
      hudWeg();
      resolve(fout ? { terugval: true, skipped: false } : { terugval: false, skipped: !!skipped, landing });
    };
    const spec = {
      id: 'reisrit', priority: 6, duration: tp.totaalS + 0.6, letterbox: true, hideHud: true, pause: false, skippable: false,
      prewarm: regie.prewarm,
      shot: (u, t, w) => {
        staat.t = t;
        try {
          // jij bent onkwetsbaar en rijdt verborgen mee (stap() zet je op de taxi): de wereld loopt door, ook voor wie je beroofd; reisrit.js landt je altijd op de bestemming
          if (typeof staat.gezond0 === 'number' && w.health < staat.gezond0) w.health = staat.gezond0;
          const pad = playerPad();
          const b = pad && pad.buttons[padButtonIndex('a')];
          if ((skipKey || (b && b.pressed)) && P.magSkippen(t, staat.klaar) && !staat.skip) {
            staat.skip = true;
            zwart.style.transition = 'none';
            zwart.style.opacity = '1';
            queueMicrotask(() => skipCinematic());
          }
          const camKnop = pad && pad.buttons[padButtonIndex('y')];
          if (camKnop && camKnop.pressed && !staat.camGedrukt) zetCam(P.volgendeRitCamera(staat.cam));
          staat.camGedrukt = !!(camKnop && camKnop.pressed);
          const stand = P.ritStand(tp, t);
          const pose = regie.stap(w, stand, t, staat.cam);
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
        world.ritBezig = true; // savegame.js bewaart niet halverwege de rit
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
