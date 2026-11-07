// De intocht spelen (#704 epic): de wachtrij van gebiedenlive.js leegmaken wanneer de speler
// rustig is, en de korte "thuiskomst" voor een geliefde buurt (#736) afvuren. Dit is de enige
// plek die de film echt start: de pure regels staan in wijkintocht.js, de camera-baan in
// camerapath.js (veroverTourShot), de beloning in gebiedenlive.js.
//
// Volgorde: eerst de veroveringen in de wachtrij (één film per veroverd gebied), daarna de buurt
// waar je bent als de ouder-wijk al veroverd is. Een film die al gezien is, wordt overgeslagen;
// de intocht gaat één keer per speler af (#708) en is daarna terug te kijken via het profiel.
import { hoofdspeler } from './players.js';
import { isCinematicActive, isBannerUp, sinceCinematic, playCinematic, cinematicWorld } from './cinematics.js';
import { playerBusy } from './busy.js';
import { isMapOpen } from './pausestate.js';
import { veroverTourShot } from './camerapath.js';
import { magIntocht, isRustig, neemIntocht, wachtrij, maakIntocht, thuiskomstVoor } from './wijkintocht.js';
import { getOverzicht, noteerIntocht, intochtGezien } from './gebiedenlive.js';

const TIK_S = 0.5;
let tik = 0;

// De pose achter de speler waar de intocht op eindigt (zelfde hoek als de wijk-flyover).
function achterPose(w) {
  const p = hoofdspeler(w);
  const a = Number.isFinite(p.angle) ? p.angle : 0;
  return {
    pos: { x: p.x - Math.cos(a) * 9, y: p.y - Math.sin(a) * 9, z: 3.8 },
    look: { x: p.x, y: p.y, z: 1.4 },
  };
}

function context(w, front) {
  return {
    cinematic: isCinematicActive(),
    banner: isBannerUp(),
    respawn: !!w.pendingRespawn,
    busy: playerBusy(w, ['missionPhase', 'sideJob', 'challenge', 'race']).busy,
    menu: !!w.paused,
    map: isMapOpen(),
    wanted: w.wanted,
    sindsFilm: sinceCinematic(),
    sindsBeloning: Number.isFinite(w.time) && front && Number.isFinite(front.in) ? w.time - front.in : NaN,
  };
}

// De lijnen voor playCinematic: de sceneregels met hun stem, en als laatste de titel van de
// verovering (het "eindbeeld" met de titel in beeld).
function filmLijnen(film) {
  const out = (film.regels || []).map((r) => ({ speaker: r.stem === 'Tammo' ? 'Tammo' : r.stem === 'Tessa' ? 'Anita' : 'Rikus', text: r.tekst }));
  out.push({ speaker: '', text: film.titel });
  return out;
}

function speel(w, film) {
  if (!w || !w.map) return false;
  const shot = veroverTourShot(w, { x: film.x, y: film.y }, film.stops, achterPose(w));
  if (!shot) return false;
  const ok = playCinematic({
    id: film.titel === 'Thuiskomst' ? 'thuiskomst' : 'intocht',
    priority: 2, duration: film.seconden, pause: true, keepMotion: true,
    lines: filmLijnen(film),
    shot,
    prewarm: film.stops.map((s) => ({ x: s.x, y: s.y })),
  });
  if (ok) noteerIntocht(film.gebied);
  return ok;
}

// #708: een intocht van een al veroverd gebied terugkijken vanuit Loopbaan › Veroverd. De wereld
// komt van de cinematics (die kent de lopende sessie), dus het paneel hoeft hem niet mee te geven.
export function bekijkIntocht(gebiedId) {
  if (!gebiedId || isCinematicActive()) return false;
  const w = cinematicWorld();
  const o = getOverzicht();
  if (!w || !w.map || !o || !o.ind) return false;
  if (!Array.isArray(o.profiel.beloond) || !o.profiel.beloond.includes(gebiedId)) return false;
  const g = o.ind.gebied.get(gebiedId);
  if (!g) return false;
  const film = maakIntocht(o.ind, { gebied: gebiedId, naam: g.naam }, { landmarks: (w.map.meta && w.map.meta.landmarks) || [] });
  return film ? speel(w, film) : false;
}

// De korte thuiskomst in een geliefde buurt (#736): alleen als de ouder-wijk veroverd is, de
// buurt nog niet gezien is en de speler er echt is. De regel zelf staat puur in wijkintocht.js.
function probeerThuiskomst(w, ind, profiel, landmarks, ctx) {
  if (!isRustig(ctx)) return false;
  const p = hoofdspeler(w);
  const punten = (w.map && w.map.meta && w.map.meta.neighbourhoodPoints) || [];
  const film = thuiskomstVoor(ind, profiel, punten, p.x, p.y, { landmarks });
  return film ? speel(w, film) : false;
}

// Elke halve seconde (main.js na de tracker): eerst een verovering uit de wachtrij, dan de buurt.
export function probeerIntocht(dt, w) {
  tik -= dt;
  if (tik > 0) return false;
  tik = TIK_S;
  if (!w || !document.body.classList.contains('game-started')) return false;
  const o = getOverzicht();
  if (!o || !o.ind) return false;
  const landmarks = (w.map && w.map.meta && w.map.meta.landmarks) || [];
  while (wachtrij(w).length) {
    const front = wachtrij(w)[0];
    const ctx = context(w, front);
    if (!magIntocht(w, ctx)) return false;
    if (front && intochtGezien(front.gebied)) { neemIntocht(w); continue; } // al gezien: doorschuiven
    const film = maakIntocht(o.ind, front, { landmarks });
    if (!film || film.stops.length < 3) { neemIntocht(w); continue; } // geen bruikbare stops: niet vastlopen
    return speel(w, film);
  }
  return probeerThuiskomst(w, o.ind, o.profiel, landmarks, context(w, null));
}
