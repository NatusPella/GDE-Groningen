// De wereldstaat van een koploze gastheer (#450, slice C): wat een dedicated
// host na een herstart moet terugvinden, zonder savegame.js (dat leunt op DOM,
// canvas en localStorage). Puur: alleen data in en uit, geen fs.
//
// Wat erin gaat: de klok, de tijd, het weer, de missiefase en de wanted-staat.
// Wat er bewust niet in gaat: voertuigen, voetgangers en losse objecten (die
// ontstaan weer rond de gasten) en de persoonlijke saves van spelers (die
// blijven per speler, #429).

export const STAAT_VERSIE = 1;

export function vangStaat(world) {
  const m = world && world.mission;
  return {
    v: STAAT_VERSIE,
    clock: num(world && world.clock, 12),
    time: num(world && world.time, 0),
    wanted: num(world && world.wanted, 0),
    weatherState: world && world.weatherState && typeof world.weatherState === 'object' ? { ...world.weatherState } : null,
    mission: m && typeof m === 'object' ? { phase: typeof m.phase === 'string' ? m.phase : 'idle', id: typeof m.id === 'string' ? m.id : null } : { phase: 'idle', id: null },
    savedAt: Number.isFinite(Date.now()) ? Date.now() : 0,
  };
}

function num(x, d) { return Number.isFinite(x) ? x : d; }

// Zet de staat terug op een wereld. Onbekende of kapotte velden laten de wereld
// met rust; geeft true als er iets is toegepast.
export function herstelStaat(world, staat) {
  if (!world || !staat || typeof staat !== 'object') return false;
  if (staat.v !== STAAT_VERSIE) return false;
  if (Number.isFinite(staat.clock)) world.clock = staat.clock;
  if (Number.isFinite(staat.time)) world.time = staat.time;
  if (Number.isFinite(staat.wanted)) world.wanted = staat.wanted;
  if (staat.weatherState && typeof staat.weatherState === 'object') world.weatherState = { ...staat.weatherState };
  if (staat.mission && typeof staat.mission === 'object' && typeof staat.mission.phase === 'string') world.mission = { ...(world.mission || {}), phase: staat.mission.phase, id: staat.mission.id ?? null };
  return true;
}

// Tekst naar staat; een half geschreven of kapot bestand geeft null in plaats
// van een crash, zodat de host op de vorige stand of op een nieuwe wereld verder
// kan.
export function leesStaat(tekst) {
  if (typeof tekst !== 'string' || !tekst.trim()) return null;
  try {
    const s = JSON.parse(tekst);
    if (!s || typeof s !== 'object' || s.v !== STAAT_VERSIE) return null;
    return s;
  } catch (e) { return null; }
}

export function schrijfStaat(staat) {
  return JSON.stringify(staat, null, 2) + '\n';
}
