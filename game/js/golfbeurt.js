// Beurtmodel voor Pitch & putt met meer spelers (#436): puur, geen THREE, geen netwerk (scripts/golfbeurt_test.mjs).
// Regel van het golf: wie het verst van het hol ligt slaat; op de tee begint wie de vorige baan het beste speelde (de eer).
// Met één speler is de beurt altijd van hem, zoals nu. De netwerklaag (wie welke speler is) hangt zich later aan `spelerId`.

export function nieuweBeurt(ids) {
  const spelers = ids.map((id) => ({ id, lie: null, slagen: 0, klaar: false, kaart: [] }));
  return { spelers, baan: 0, aanDeBeurt: spelers.length ? spelers[0].id : null };
}

// Bij een nieuwe baan: allen op de tee, de eer voor wie de vorige baan het minst slagen had (bij gelijk: wie de eer al had).
export function beginBaan(b, tee) {
  const vorige = b.spelers.map((s) => s.kaart[b.baan - 1]);
  b.spelers.forEach((s) => { s.lie = { x: tee.x, y: tee.y }; s.slagen = 0; s.klaar = false; });
  let eer = b.spelers.find((s) => s.id === b.aanDeBeurt) || b.spelers[0];
  if (b.baan > 0 && vorige.every((v) => v != null)) {
    for (const s of b.spelers) if (s.kaart[b.baan - 1] < eer.kaart[b.baan - 1]) eer = s;
  }
  b.aanDeBeurt = eer ? eer.id : null;
  return b.aanDeBeurt;
}

const afstand = (s, cup) => Math.hypot(s.lie.x - cup.x, s.lie.y - cup.y);

// Na een slag: leg de bal neer, tel de slag, en geef terug wie nu aan de beurt is (null als de baan klaar is).
export function slaan(b, id, nieuweLie, cup, { inHol = false, opgepakt = false } = {}) {
  const s = b.spelers.find((x) => x.id === id);
  if (!s || s.klaar) return b.aanDeBeurt;
  s.slagen++;
  s.lie = { x: nieuweLie.x, y: nieuweLie.y };
  if (inHol || opgepakt) { s.klaar = true; s.kaart[b.baan] = s.slagen; }
  const open = b.spelers.filter((x) => !x.klaar);
  if (!open.length) { b.aanDeBeurt = null; return null; }
  // de verste bal slaat; bij gelijke afstand blijft de volgorde van de lijst
  b.aanDeBeurt = open.reduce((m, x) => (afstand(x, cup) > afstand(m, cup) + 1e-9 ? x : m), open[0]).id;
  return b.aanDeBeurt;
}

export function volgendeBaan(b) { b.baan++; return b.baan; }

// De stand: totaal aantal slagen per speler, de laagste eerst.
export function stand(b) {
  return b.spelers.map((s) => ({ id: s.id, totaal: s.kaart.reduce((a, v) => a + (v || 0), 0), banen: s.kaart.filter((v) => v != null).length }))
    .sort((a, c) => a.totaal - c.totaal);
}
