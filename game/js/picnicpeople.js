// De picknickers in het Noorderplantsoen (flavour3d.js, #342): wie waar zit en welke figuren van een kleine pool
// bij de speler in de buurt staan. Puur. De figuren zelf zijn gewone mensmodellen (buildPersonMesh) in een zittende
// pose op de deken; ze worden alleen dichtbij getekend (een pool, geen figuur per deken).

// Twee zithoudingen op de grond: achterover leunend op de handen met gestrekte benen, en met de armen om de knieën.
export const SIT_GROUND = [
  { recline: 0.18, footX: 0.8, footY: -0.07, arms: 'behind' },
  { recline: 0.06, footX: 0.4, footY: -0.06, arms: 'hug' },
];
export const SEAT_TOP = 0.06;
export const POOL_SIZE = 10, ASSIGN_R = 100, RELEASE_R = 130;

// spots: [{ x, y, a, r }] (een deken, hoek a, toeval r); één of twee mensen per deken, tegenover elkaar op de lange as
// van de deken. ry is de draaihoek om de y-as van het mensmodel (kijkt langs zijn +x), zoals flavour3d.place().
export function picnicPeople(spots) {
  const out = [];
  spots.forEach((s, i) => {
    const people = 1 + (s.r > 0.45 ? 1 : 0);
    for (let k = 0; k < people; k++) {
      const off = k ? 0.5 : -0.5;
      out.push({
        spot: i, k, x: s.x + Math.cos(s.a) * off, y: s.y - Math.sin(s.a) * off,
        ry: s.a + (k ? Math.PI : 0) + (s.r - 0.5) * 0.6, pose: (i + k) % SIT_GROUND.length,
      });
    }
  });
  return out;
}

// pool: [{ who: index in people | -1 }]. Laat figuren los die te ver weg zijn en geeft vrije figuren de dichtstbijzijnde
// nog niet bezette mensen binnen ASSIGN_R. Geeft de veranderde pool-indexen terug.
export function assignPool(people, pool, px, py) {
  const changed = [];
  const taken = new Set();
  pool.forEach((q, i) => {
    if (q.who >= 0 && Math.hypot(people[q.who].x - px, people[q.who].y - py) > RELEASE_R) { q.who = -1; changed.push(i); }
    if (q.who >= 0) taken.add(q.who);
  });
  const want = [];
  people.forEach((p, i) => { const d = Math.hypot(p.x - px, p.y - py); if (d <= ASSIGN_R && !taken.has(i)) want.push([d, i]); });
  want.sort((a, b) => a[0] - b[0]);
  let w = 0;
  pool.forEach((q, i) => { if (q.who < 0 && w < want.length) { q.who = want[w++][1]; changed.push(i); } });
  return changed;
}
