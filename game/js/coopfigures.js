// Samen spelen (#95): welke figuren van andere spelers staan in de wereld? Pure
// planning (geen three.js), zodat het testbaar is: coopfigures3d.js maakt, verplaatst
// en ruimt de modellen op volgens dit plan.

// have = plekken waarvoor al een model bestaat; figuren = world.coopFigures ({ slot: figuur })
// Geeft { add: [figuur], remove: [plek], keep: [figuur] }. Een figuur zonder geldige plek of positie telt niet mee.
export function planFigures(have, figuren) {
  const want = Object.values(figuren || {}).filter((f) => f && Number.isInteger(f.slot) && f.char && Number.isFinite(f.x) && Number.isFinite(f.y));
  const wantSlots = new Set(want.map((f) => f.slot));
  const haveSet = new Set(have);
  return {
    add: want.filter((f) => !haveSet.has(f.slot)),
    keep: want.filter((f) => haveSet.has(f.slot)),
    remove: [...haveSet].filter((s) => !wantSlots.has(s)),
  };
}

// Een model moet opnieuw gebouwd worden als de figuur van personage is veranderd (andere speler op dezelfde plek).
export const needsRebuild = (modelChar, figuur) => modelChar !== figuur.char;

// Loopsnelheid voor de animatie uit de verplaatsing sinds het vorige frame (op een client heeft een figuur geen snelheid).
export function walkSpeed(prev, cur, dt) {
  if (!prev || !(dt > 0)) return 0;
  const v = Math.hypot(cur.x - prev.x, cur.y - prev.y) / dt;
  return Number.isFinite(v) && v < 40 ? v : 0; // een sprong (teleport) telt niet als rennen
}

// Hoogte van het label boven de figuur en tekst/kleur van het label (naam en kleur uit de lijst met spelers).
export const LABEL_Y = 2.35;
export function labelSpec(figuur) { return { tekst: figuur.naam || '?', kleur: figuur.kleur || '#ffffff' }; }
