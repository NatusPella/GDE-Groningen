// #835: één streekuitdaging op het Hogeland: met een voertuig van Warffum via Usquert naar
// Uithuizen, over de wierdenpaden. Puur: geen DOM, geen three en geen klok.
export const STREEKUITDAGING = {
  id: 'hogelandrit',
  naam: 'Hogelandrit',
  start: { x: -638.9, y: -19173.8, naam: 'Warffum, Pastorieweg' },
  checkpoints: [
    { x: 2779.1, y: -20401.5, naam: 'Usquert, kerk' },
    { x: 6946.3, y: -21282.8, naam: 'Uithuizen, station' },
  ],
  radius: 32,
  startRadius: 28,
  time: { goud: 180, zilver: 240, brons: 330 },
  beloning: 200,
};

export const checkpoints = () => STREEKUITDAGING.checkpoints.map((q) => ({ ...q }));
export const startpunt = () => ({ ...STREEKUITDAGING.start });
export const doelBij = (x, y, index) => {
  const q = STREEKUITDAGING.checkpoints[index];
  return q && Math.hypot(q.x - x, q.y - y) <= STREEKUITDAGING.radius;
};
export const startBij = (x, y) => Math.hypot(STREEKUITDAGING.start.x - x, STREEKUITDAGING.start.y - y) <= STREEKUITDAGING.startRadius;
export function medailleVoor(seconden) {
  const t = Number(seconden);
  if (!Number.isFinite(t)) return 0;
  if (t <= STREEKUITDAGING.time.goud) return 3;
  if (t <= STREEKUITDAGING.time.zilver) return 2;
  if (t <= STREEKUITDAGING.time.brons) return 1;
  return 0;
}
