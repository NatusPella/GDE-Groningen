// Een aanhanger achter een voertuig (#1342): pure kinematica, zonder three of DOM, zodat scripts/towtrailer_test.mjs hem in gewone node
// kan nalopen. De aanhanger heeft één as (x, y = de oorsprong van het model) en een dissel van HITCH_REACH meter naar voren; het koppelpunt
// zit net achter het voertuig. Elk beeld volgt de as het koppelpunt langs de lijn tussen die twee (de klassieke ketting), met een
// grens aan de hoek ten opzichte van het voertuig zodat hij bij achteruit niet dubbelvouwt.

export const HITCH_REACH = 1.6; // de punt van de dissel voor de as (buildAtmTrailer in introkitchen3d.js: dissel tot x = 1.6)
export const TOW_GAP = 0.15; // tussen de achterbumper en het koppelpunt
export const MAX_FOLD = 1.1; // rad: verder dan dit draait de aanhanger niet weg van het voertuig

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Het koppelpunt van een voertuig {x, y, angle, model: { len }}.
export function hitchPoint(v) {
  const half = ((v.model && v.model.len) || 4.5) / 2 + TOW_GAP;
  return { x: v.x - Math.cos(v.angle) * half, y: v.y - Math.sin(v.angle) * half };
}

// De beginstand: recht achter het voertuig.
export function startTow(v) {
  const h = hitchPoint(v);
  return { x: h.x - Math.cos(v.angle) * HITCH_REACH, y: h.y - Math.sin(v.angle) * HITCH_REACH, angle: v.angle };
}

// Eén stap: de as volgt het koppelpunt. Geeft dezelfde tow terug (aangepast).
export function stepTow(tow, v) {
  const h = hitchPoint(v);
  let ang = Math.atan2(h.y - tow.y, h.x - tow.x);
  if (!Number.isFinite(ang)) ang = v.angle;
  const rel = wrap(ang - v.angle);
  if (Math.abs(rel) > MAX_FOLD) ang = v.angle + Math.sign(rel) * MAX_FOLD;
  tow.angle = ang;
  tow.x = h.x - Math.cos(ang) * HITCH_REACH;
  tow.y = h.y - Math.sin(ang) * HITCH_REACH;
  return tow;
}
