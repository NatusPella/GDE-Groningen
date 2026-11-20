// AAA-upgrade van akte 1 (AAA-upgradeplan, M01 tot M06): de laag tussen de bouwstenen en de runner. De runner
// (missions.js) roept hier vijf kleine haken aan en weet verder niets van aankleding, finishcamera of stings:
//
//   aaaStart(world, def)                       een missie begint: regelkaart, de kei-aankleding
//   aaaTik(world, def, dt, ctx)                elke beeld in de actieve fase: licht, publiek, arena, kaart, bijna
//   aaaCheckpoint(world, def, wp, info)        een checkpoint is gehaald (sting, finishcamera)
//   aaaStuntKlaar(world)                       de stuntpunten zijn binnen: de arena mag weg
//   aaaOpruimen(world)                         de missie is voorbij: alles weg (aankleding, camera)
//
// Wat het doet: M05 (de Kei-race) krijgt een startboog en finishboog, publiek langs de lijn, een startlicht dat met het
// aftellen van de race meeloopt, een finishcamera en een podiumsting; M01 (de stunt) krijgt de stuntarena (hekken en
// toeschouwers) rond de Grote Markt; beide krijgen een regelkaart voor een missie zonder stappen (def.kaart).
//
// Samen spelen: alles is lokaal beeld bij de speler die de missie draait; er gaat niets over het net en er wordt niets in
// wereld, beloning of voortgang geschreven. Een gast die meedoet ziet de aankleding via zijn eigen start van dezelfde
// missie; wie wegvalt of later aansluit mist alleen beeld.
import { hoofdspeler } from './players.js';
import { buildCheckpointRaceDecor, updateCheckpointRaceDecor, disposeCheckpointRaceDecor } from './racedecor.js';
import { raceLichtTijd } from './cinetemplates.js';
import { buildMissionDressing, updateMissionDressing, disposeMissionDressing } from './missiedecor.js';
import { startCameraTake, stopCameraTake, isCinematicActive } from './cinematics.js';
import { beatDue, beatTekst } from './missiebeats.js'; // tussen-beat halverwege (alleen een zin, nooit een regel van de missie)
import { startKaart, toonRegelkaart, meldKaart } from './regelkaart.js';
import { stingen } from './sfx/stingen.js';
import { haakFx } from './sfx/haken.js'; // ronde 4: startsein en publiek
import { finishSting, bijnaMoment, finishPose, FINISHCAM_SECS } from './akte1_plan.js';

const ARENA_BOUW_AFSTAND = 90; // m: dichterbij bouwen we de arena (de tegels staan er dan, zo staat hij op de grond)
const KEI_ROUTE_LIJST = (def) => (Array.isArray(def.decorRoute) ? def.decorRoute : null);

let H = null; // één missie tegelijk, lokaal bij dit apparaat

const zeg = (fn) => { try { return fn(); } catch (e) { return null; } }; // aankleding mag een missie nooit raken

// opties.scene: een eigen scène (de test); zonder die is het de scène van het spel
export function aaaStart(world, def, opties = {}) {
  aaaOpruimen(world);
  if (!def) return null;
  H = { scene: opties.scene || null, id: def.label || '', kaart: null, kei: null, arena: null, arenaKlaar: false, bijna: false, startKlaar: false, cam: null, camT: 0, finish: null, t: 0, beats: { gezien: {}, getoond: new Set() } };
  if (def.kaart && def.type !== 'stages') H.kaart = zeg(() => startKaart(def, `${def.label || 'm'}:def`));
  const route = KEI_ROUTE_LIJST(def);
  if (route) {
    H.kei = zeg(() => buildCheckpointRaceDecor(world, route, { key: `${def.label}:kei`, startCount: 20, finishCount: 28, scene: H.scene }));
    if (H.kei) H.finish = H.kei.plan.finish;
  }
  return H;
}

export function aaaMeld(sleutel) {
  if (H && H.kaart) meldKaart(H.kaart, sleutel);
}

// ctx: { race, timeLeft, stunt, stageIndex, wpIndex } uit de runner; het publiek en de arena kijken naar de speler.
export function aaaTik(world, def, dt, ctx = {}) {
  if (!H) return;
  const p = hoofdspeler(world);
  const focus = p ? (p.inVehicle || p) : null;
  if (H.kaart) toonRegelkaart(world, H.kaart, dt);
  H.t += dt;
  if (def && def.label && !isCinematicActive()) for (const b of beatDue(def.label, H.beats, { t: H.t, stageIndex: ctx.stageIndex, wpIndex: ctx.wpIndex })) world.addMessage(beatTekst(b), b.secs || 4, { kind: 'missie' });
  if (H.kei) {
    const race = ctx.race;
    if (race && race.phase === 'race' && !H.startKlaar) { H.startKlaar = true; const s = H.kei.plan.start; haakFx(world, 'startsein_toeter', s && s.x, s && s.y); } // het groene licht
    zeg(() => updateCheckpointRaceDecor(H.kei, dt, focus, race ? raceLichtTijd(race.phase, race.timer) : -1));
  }
  if (def && def.stunt && ctx.stunt && !H.arenaKlaar) {
    const c = def.stunt.center;
    if (!H.arena && focus && c && Math.hypot(focus.x - c.x, focus.y - c.y) < ARENA_BOUW_AFSTAND) {
      H.arena = zeg(() => buildMissionDressing(world, 'stuntarena', { x: c.x, y: c.y, a: 0 }, H.scene));
    }
    if (H.arena) zeg(() => updateMissionDressing(H.arena, dt, focus));
  }
  if (bijnaMoment(ctx.timeLeft, H.bijna)) {
    H.bijna = true;
    stingen.push(world, 'bijna');
    if (H.kaart) meldKaart(H.kaart, 'bijna');
  }
  if (H.cam) {
    H.camT += dt;
    if (H.camT >= FINISHCAM_SECS) { stopCameraTake('kei-finish'); H.cam = null; }
  }
}

// wp: het checkpoint dat net gehaald is; info: { via, last, plek } (plek alleen bij de finish van een race)
export function aaaCheckpoint(world, def, wp, info = {}) {
  if (!H || !wp || wp.via) return;
  if (!info.last) { stingen.push(world, 'stap'); return; }
  const medaille = finishSting(info.plek);
  if (medaille) stingen.push(world, medaille);
  if (H.finish) { haakFx(world, 'publiek_gejuich', H.finish.x, H.finish.y); if (medaille) haakFx(world, 'publiek_applaus', H.finish.x, H.finish.y, { delay: 0.5 }); } // het publiek bij de finishboog
  if (H.finish && medaille) {
    const p = hoofdspeler(world);
    const fin = H.finish;
    H.camT = 0;
    H.cam = true;
    startCameraTake('kei-finish', (t) => {
      const q = p && (p.inVehicle || p);
      return finishPose(fin, q ? { x: q.x, y: q.y } : fin, t);
    }, { letterbox: true, hideHud: false });
  }
}

export function aaaStuntKlaar(world) {
  if (!H) return;
  H.arenaKlaar = true;
  if (H.arena) { zeg(() => disposeMissionDressing(H.arena)); H.arena = null; }
}

export function aaaOpruimen() {
  if (!H) return;
  if (H.cam) { stopCameraTake('kei-finish'); H.cam = null; }
  if (H.kei) zeg(() => disposeCheckpointRaceDecor(H.kei));
  if (H.arena) zeg(() => disposeMissionDressing(H.arena));
  H = null;
}

export const aaaStand = () => (H ? { kei: !!H.kei, arena: !!H.arena, kaart: !!H.kaart, cam: !!H.cam, bijna: H.bijna } : null);
