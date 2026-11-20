// De spotmissie van de duif ("Kieken van boven"): wat de speler in de wereld moet zien en lezen, als pure functies zonder three.js of DOM
// (pigeonguide.js tekent het). Doel: elk te spotten ding heeft een plek in de wereld (kolom en naam), de dichtstbijzijnde is het hoofddoel
// met afstand en richting, en de voortgang staat er in woorden bij ("Gespot 2 van 6").

export const GUIDE_MARGIN = 0.86; // hoe dicht bij de rand van het scherm de pijl blijft (genormaliseerd -1..1)

const TAU = Math.PI * 2;
export const wrapAngle = (a) => { a %= TAU; return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a; };

// De hoek tot het doel ten opzichte van de kijkrichting van de duif: 0 = recht vooruit, positief = rechts (de duif vliegt langs (cos yaw, sin yaw), rechts is yaw + 90 graden).
export function relBearing(yaw, fx, fy, tx, ty) {
  return wrapAngle(Math.atan2(ty - fy, tx - fx) - yaw);
}

// De richting in woorden, zodat de pijl niet alleen op kleur of stand leunt.
export function directionWord(rel) {
  const a = Math.abs(rel);
  if (a < 0.35) return 'recht voor je';
  if (a > 2.5) return 'achter je';
  const side = rel > 0 ? 'rechts' : 'links';
  return a < 1.2 ? `schuin ${side} voor je` : a < 1.95 ? side : `schuin ${side} achter je`;
}

export function distText(m) {
  const r = m < 100 ? Math.round(m / 5) * 5 : m < 1000 ? Math.round(m / 10) * 10 : Math.round(m / 100) / 10;
  return m >= 1000 ? `${String(r).replace('.', ',')} km` : `${r} m`;
}

export const progressText = (done, total) => `Gespot ${done} van ${total}`;

// Het model voor een frame. targets: [{ x, y, label } | null]; spotted: Set van indexen; holds: tijd dat de duif bij elk doel hangt.
// flight: { x, y, yaw }. Geeft de doelen met afstand en richting, het dichtstbijzijnde nog niet gespotte (het hoofddoel) en de voortgang.
export function guideModel({ targets, spotted, holds = [], spotTime = 0.8, flight, radius = 16 }) {
  const items = [];
  targets.forEach((t, k) => {
    if (!t) return;
    const d = Math.hypot(t.x - flight.x, t.y - flight.y);
    const done = spotted.has(k);
    items.push({
      k, x: t.x, y: t.y, label: t.label || 'Doel', spotted: done, dist: d, near: d < (t.r || radius),
      rel: relBearing(flight.yaw, flight.x, flight.y, t.x, t.y), hold: done ? 1 : Math.min(1, (holds[k] || 0) / spotTime), nearest: false,
    });
  });
  const open = items.filter((i) => !i.spotted);
  const nearest = open.length ? open.reduce((a, b) => (b.dist < a.dist ? b : a)) : null;
  if (nearest) nearest.nearest = true;
  const done = items.length - open.length;
  return {
    items, nearest, done, total: items.length, progress: progressText(done, items.length),
    line: nearest ? `${nearest.label}: ${distText(nearest.dist)}, ${directionWord(nearest.rel)}` : 'Alles gespot',
  };
}

// De pijl aan de rand van het scherm. ndc: de plek van het doel op het scherm (-1..1, y omhoog); behind: het doel ligt achter de camera.
// Geeft { x, y } (-1..1, y omhoog), `angle` (rad, 0 = omhoog, met de klok mee) en onScreen (het doel is zelf in beeld: dan wijst de pijl er van boven op).
export function edgeIndicator(ndcX, ndcY, behind, margin = GUIDE_MARGIN) {
  let x = behind ? -ndcX : ndcX, y = behind ? -ndcY : ndcY;
  if (!behind && Math.abs(x) <= margin && Math.abs(y) <= margin) return { x, y, angle: Math.PI, onScreen: true };
  if (Math.abs(x) < 1e-6 && Math.abs(y) < 1e-6) y = -1; // recht achter je: de pijl onderaan
  const k = Math.max(Math.abs(x) / margin, Math.abs(y) / margin);
  return { x: x / k, y: y / k, angle: Math.atan2(x, y), onScreen: false };
}

// Elk doel van een spotstage heeft een plek in de wereld en een naam: de test (pigeonguide_test) houdt dat vast.
export function targetsHaveWorldMarks(stage) {
  return Array.isArray(stage.targets) && stage.targets.length > 0 && stage.targets.every((t) => t && t.label && (t.at || t.landmark || Number.isFinite(t.x)));
}

// De uitleg van de eerste vlucht (de toetsen komen als tokens, keycap.js, en lopen mee met herbinden en pad).
export const GUIDE_INTRO = {
  title: 'Je bent de duif',
  goal: 'Vlieg naar de gele kolommen en blijf er even boven hangen: dan staat het op de foto.',
  controls: [['WASD', 'sturen'], ['SPACE', 'klapwieken, hoger'], ['SHIFT', 'duiken']],
};
