// Detector (h): eerlijkheid bij tegenstanders (skûtsje-regatta, autoraces, fietsrace). De page-kant logt elke seconde tijdens een race
// een 'rivaal'-regel: { type: 'rivaal', t, stap, speler: { v, x, y }, rivalen: [{ v, x, y, voorsprong? }] } (v in m/s; voorsprong in meter
// langs de baan, positief = de rivaal ligt voor de speler, als de race dat kent).
//   wacht    rubber-banding naar beneden: de rivaal die voorligt stopt of vertraagt tot minder dan 25% van zijn kruissnelheid terwijl de
//            speler >= 3 s stilstaat of vastzit (hij wacht op je)
//   elastiek rubber-banding in beide richtingen: de snelheid van de rivaal correleert sterk negatief met zijn voorsprong (r < -0,6, >= 12 metingen)
//   duw      een botsing waarbij de speler plots meer dan de helft van zijn snelheid verliest terwijl een snellere rivaal binnen 4 m is
// Alle drie zijn aanwijzingen, geen bewijs: de bevinding zegt 'vermoedelijk' en noemt het bewijs.
const mediaan = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const r2 = (v) => Math.round(v * 100) / 100;

export function pearson(xs, ys) {
  const n = xs.length; if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}

export function eerlijkBevindingen(events, { stilV = 1, stilS = 3, wachtFractie = 0.25, rMax = -0.6, minMetingen = 12, duwM = 4 } = {}) {
  const ev = events.filter((e) => e.type === 'rivaal' && e.speler && Array.isArray(e.rivalen)).sort((a, b) => a.t - b.t);
  const uit = [];
  if (!ev.length) return uit;
  const stap = ev[0].stap || '';
  const kruis = mediaan(ev.flatMap((e) => e.rivalen.map((r) => r.v).filter((v) => v > 1)));
  // wacht: aaneengesloten stilstand van de speler
  let van = null;
  const sluit = (tot) => {
    if (van == null || tot - van.t < stilS) { van = null; return; }
    const venster = ev.filter((e) => e.t >= van.t && e.t <= tot);
    const voor = venster.flatMap((e) => e.rivalen.filter((r) => (r.voorsprong == null || r.voorsprong > 0)).map((r) => r.v));
    if (voor.length >= 2 && kruis > 3 && mediaan(voor) < kruis * wachtFractie) {
      uit.push({ type: 'eerlijk-rivaal-wacht', soort: 'eerlijkheid', ernst: 'cosmetisch', stap, plek: [Math.round(van.speler.x), Math.round(van.speler.y)], t: van.t, tekst: '', bewijs: { vermoedelijk: true, stilS: r2(tot - van.t), rivaalMediaanV: r2(mediaan(voor)), kruisV: r2(kruis), uitleg: 'een rivaal vertraagt tot bijna stilstand terwijl de speler wacht: rubber-banding' } });
    }
    van = null;
  };
  for (const e of ev) { if (e.speler.v < stilV) { if (!van) van = e; } else sluit(e.t); }
  sluit(ev[ev.length - 1].t);
  // elastiek: snelheid tegen voorsprong
  const punten = ev.flatMap((e) => e.rivalen.filter((r) => Number.isFinite(r.voorsprong) && r.v > 0.5).map((r) => [r.voorsprong, r.v]));
  if (punten.length >= minMetingen) {
    const r = pearson(punten.map((p) => p[0]), punten.map((p) => p[1]));
    if (r != null && r < rMax) uit.push({ type: 'eerlijk-elastiek', soort: 'eerlijkheid', ernst: 'cosmetisch', stap, plek: null, t: ev[0].t, tekst: '', bewijs: { vermoedelijk: true, correlatie: r2(r), metingen: punten.length, uitleg: 'de rivaal vertraagt als hij voorligt en versnelt als hij achterligt: de race past zich aan jou aan' } });
  }
  // duw: de speler verliest plots snelheid naast een snellere rivaal
  for (let i = 1; i < ev.length; i++) {
    const a = ev[i - 1], b = ev[i];
    if (b.t - a.t > 2.5 || a.speler.v < 4 || b.speler.v > a.speler.v * 0.5) continue;
    const buur = b.rivalen.find((r) => Math.hypot(r.x - b.speler.x, r.y - b.speler.y) <= duwM && r.v > b.speler.v * 1.2);
    if (buur) uit.push({ type: 'eerlijk-botsing-duw', soort: 'eerlijkheid', ernst: 'cosmetisch', stap, plek: [Math.round(b.speler.x), Math.round(b.speler.y)], t: b.t, tekst: '', bewijs: { vermoedelijk: true, voor: r2(a.speler.v), na: r2(b.speler.v), rivaalV: r2(buur.v), uitleg: 'de speler verliest meer dan de helft van zijn snelheid naast een snellere rivaal' } });
  }
  return uit;
}
