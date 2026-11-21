// Niet-eindige posities opruimen (#1065): een NaN of Infinity in x of y van een auto of voetganger (een rare waarde uit een berekening,
// een botsing, een netwerkbericht) bleef eeuwig in de lijst: afstandstoetsen als `d > despawnDist` zijn bij NaN altijd onwaar, dus het
// verkeersbeheer ruimde zo'n voertuig nooit op, en een botsing kon de NaN op zijn buren verspreiden. safety.js bewaakt alleen de speler en
// zijn eigen voertuig. Zuiver en zonder DOM; scripts/stabiliteit_test.mjs bewaakt het.

const fin = (n) => Number.isFinite(n);

// Haalt voertuigen en voetgangers met een niet-eindige positie uit de lijsten (wat de speler bestuurt blijft: dat bewaakt safety.js).
// Geeft het aantal opgeruimde voertuigen en voetgangers terug en het aantal snelheden dat op nul is gezet.
export function sweepNonFinite(world) {
  const out = { voertuigen: 0, voetgangers: 0, snelheid: 0 };
  const vs = world.vehicles;
  if (vs) {
    for (let i = vs.length - 1; i >= 0; i--) {
      const v = vs[i];
      if (!v || v.driver === 'player') continue;
      if (!fin(v.x) || !fin(v.y) || (v.angle !== undefined && !fin(v.angle))) { vs.splice(i, 1); out.voertuigen++; continue; }
      if (v.speed !== undefined && !fin(v.speed)) { v.speed = 0; out.snelheid++; }
    }
  }
  const ps = world.pedestrians;
  if (ps) {
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      if (p && (!fin(p.x) || !fin(p.y))) { ps.splice(i, 1); out.voetgangers++; }
    }
  }
  return out;
}
