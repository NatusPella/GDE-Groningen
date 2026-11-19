// Voortgang en balans van de proefspeler (docs/PROEFSPELER.md, "Voortgang en balans"). Pure functies op de events.jsonl van een run:
//   voortgangAnalyse(events, { id, verwachtS })   per missie en seed: tijd per fase, stilstand, dode tijd, pogingen, schade, geld, mislukkingen
//   faalHeatmap(runs, { cel })                    waar mislukkingen vallen, over seeds heen (cellen van `cel` meter)
//   balansOverzicht(analyses)                     per missie over seeds: duur tegen de verwachte duur, geld, schade, faalratio
// Dode tijd is bewijsgebonden: alleen tijd waarvoor het logboek zegt dat er niets gebeurde (stilstand >= 8 s, 'stuck', een doel dat niet in
// beeld was en geen doeltekst). Een lange rit zonder oogmoment is geen dode tijd.
const r1 = (v) => Math.round(v * 10) / 10;
const med = (a) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

export const BALANS = { dodeS: 30, traagFactor: 2, snelFactor: 0.25, celM: 50 };

// Samenvoegen van overlappende of aansluitende intervallen [van, tot]
function samenvoegen(iv, gap = 2) {
  const s = iv.filter((q) => q.tot > q.van).sort((a, b) => a.van - b.van), uit = [];
  for (const q of s) {
    const l = uit[uit.length - 1];
    if (l && q.van <= l.tot + gap) { l.tot = Math.max(l.tot, q.tot); l.redenen.add(q.reden); if (!l.plek && q.plek) l.plek = q.plek; }
    else uit.push({ van: q.van, tot: q.tot, plek: q.plek || null, redenen: new Set([q.reden]) });
  }
  return uit.map((q) => ({ vanT: r1(q.van), totT: r1(q.tot), duurS: r1(q.tot - q.van), plek: q.plek, redenen: [...q.redenen] }));
}

// Oorzaak van een mislukking uit wat het logboek er rond zegt
function oorzaakVan(fail, oogVoor) {
  const msgs = (fail.msgs || []).filter(Boolean).join(' / ');
  if (msgs) return msgs;
  if (oogVoor) {
    if (Number.isFinite(oogVoor.gezondheid) && oogVoor.gezondheid <= 0) return 'speler dood (gezondheid 0)';
    if (oogVoor.voertuig && Number.isFinite(oogVoor.voertuig.gezondheid) && oogVoor.voertuig.gezondheid <= 0) return 'voertuig kapot';
    if (oogVoor.gezocht >= 3) return `politie (gezocht ${oogVoor.gezocht})`;
  }
  return 'onbekend (geen melding in het logboek)';
}

export function voortgangAnalyse(events, { id = '', verwachtS = null, dodeS = BALANS.dodeS } = {}) {
  const sel = (e) => !id || !e.id || e.id === id;
  const begin = events.find((e) => e.type === 'step' && e.event === 'begin' && sel(e));
  const eind = [...events].reverse().find((e) => e.type === 'step' && e.event === 'end' && sel(e));
  const slot = [...events].reverse().find((e) => e.type === 'einde');
  const t0 = begin ? begin.t : (events.find((e) => Number.isFinite(e.t)) || {}).t ?? 0;
  const tEind = eind && Number.isFinite(eind.t) ? eind.t : slot && Number.isFinite(slot.gameS) ? slot.gameS : (events[events.length - 1] || {}).t ?? t0;
  const oog = events.filter((e) => e.type === 'oog' && (!id || !e.stap || e.stap === id));
  const duurS = r1(tEind - t0);
  const verwacht = verwachtS ?? (begin && (begin.verwachtS ?? begin.timeLimit)) ?? null;

  // tijd per fase: de markeringen zijn de doelwissels (met hun fase) en het begin van de stap
  const marks = [{ t: t0, fase: 'begin' }].concat(events.filter((e) => e.type === 'doel' && e.t >= t0).map((e) => ({ t: e.t, fase: e.stage || e.label || 'doel', doel: e.doel || '' })));
  const fases = marks.map((m, i) => ({ fase: m.fase, doel: m.doel || '', vanT: r1(m.t), totT: r1(i + 1 < marks.length ? marks[i + 1].t : tEind), duurS: r1((i + 1 < marks.length ? marks[i + 1].t : tEind) - m.t) })).filter((f) => f.duurS > 0);

  // stilstand en dode tijd, alleen op bewijs
  const stil = [], dood = [];
  for (const o of oog) {
    const t = o.t ?? o.tijd;
    if (o.filmpje || o.dialoog) continue;
    if (o.stilS >= 8) { stil.push({ van: t - o.stilS, tot: t, plek: o.plek, reden: 'stilstand' }); dood.push({ van: t - o.stilS, tot: t, plek: o.plek, reden: 'stilstand' }); }
  }
  for (const e of events.filter((q) => q.type === 'stuck' || q.type === 'vast')) {
    const s = e.idleFor ?? e.stilS; if (Number.isFinite(s) && s > 0) { stil.push({ van: e.t - s, tot: e.t, plek: [e.x, e.y], reden: 'vast' }); dood.push({ van: e.t - s, tot: e.t, plek: [e.x, e.y], reden: 'vast' }); }
  }
  // opeenvolgende oogmomenten zonder zichtbaar doel en zonder doeltekst: de speler heeft niets om naar te kijken
  let run = null;
  const sluitRun = () => { if (run && run.tot - run.van >= 5) dood.push({ ...run, reden: 'geen zichtbaar doel' }); run = null; };
  for (const o of oog) {
    const t = o.t ?? o.tijd, leeg = !o.filmpje && !o.dialoog && !o.doelTekst && !o.doelNaam && !(o.zicht && o.zicht.zichtbaar);
    if (leeg) { if (!run) run = { van: t, tot: t, plek: o.plek }; run.tot = t; } else sluitRun();
  }
  sluitRun();
  const dodeTijd = samenvoegen(dood).filter((q) => q.duurS >= dodeS);
  const stilstand = samenvoegen(stil).filter((q) => q.duurS >= 8);

  // pogingen, schade, geld, gezocht
  const fails = events.filter((e) => e.type === 'mission' && e.event === 'fail' && sel(e));
  const failN = oog.some((o) => Number.isFinite(o.mislukt)) ? Math.max(...oog.map((o) => o.mislukt || 0)) : fails.length;
  const gez = oog.map((o) => o.gezondheid).filter(Number.isFinite), vg = oog.map((o) => o.voertuig && o.voertuig.gezondheid).filter(Number.isFinite);
  const geld = oog.map((o) => o.geld).filter(Number.isFinite);
  const mislukkingen = fails.map((f) => {
    const voor = [...oog].reverse().find((o) => (o.t ?? o.tijd) <= f.t) || null;
    const na = oog.find((o) => o.reden === 'mislukt' && (o.t ?? o.tijd) >= f.t - 0.5) || null;
    return { t: r1(f.t), fase: (voor && voor.fase) || f.phase || '', plek: (na || voor || {}).plek || null, oorzaak: oorzaakVan(f, voor), seed: null };
  });

  return {
    missie: id, duurS, verwachtS: verwacht, verhouding: verwacht ? Math.round((duurS / verwacht) * 100) / 100 : null,
    oordeel: verwacht && duurS > verwacht * BALANS.traagFactor ? 'veel langer dan verwacht' : verwacht && duurS < verwacht * BALANS.snelFactor ? 'veel korter dan verwacht' : verwacht ? 'binnen verwachting' : 'geen verwachting bekend',
    fases, stilstand, dodeTijd, dodeTijdS: r1(dodeTijd.reduce((a, q) => a + q.duurS, 0)),
    pogingen: failN + (eind && eind.outcome === 'klaar' ? 1 : 0) || 1, mislukt: failN,
    schade: { minGezondheid: gez.length ? Math.min(...gez) : null, minVoertuig: vg.length ? Math.min(...vg) : null, gezondheidVerlies: gez.length ? Math.max(0, gez[0] - Math.min(...gez)) : null },
    geld: geld.length ? { begin: geld[0], eind: geld[geld.length - 1], delta: geld[geld.length - 1] - geld[0] } : null,
    maxGezocht: Math.max(0, ...oog.map((o) => o.gezocht || 0)),
    mislukkingen,
  };
}

// Een faalheatmap over runs: [{ missie, seed, mislukkingen: [{ plek: [x, y], oorzaak }] }] naar cellen, vaakst eerst.
export function faalHeatmap(runs, { cel = BALANS.celM } = {}) {
  const m = new Map();
  for (const r of runs) for (const f of r.mislukkingen || []) {
    if (!f.plek || !Number.isFinite(f.plek[0])) continue;
    const cx = Math.floor(f.plek[0] / cel), cy = Math.floor(f.plek[1] / cel), k = `${r.missie}|${cx}|${cy}`;
    if (!m.has(k)) m.set(k, { missie: r.missie, cx, cy, x: cx * cel + cel / 2, y: cy * cel + cel / 2, n: 0, seeds: new Set(), oorzaken: {} });
    const c = m.get(k); c.n++; c.seeds.add(r.seed); c.oorzaken[f.oorzaak] = (c.oorzaken[f.oorzaak] || 0) + 1;
  }
  return [...m.values()].map((c) => ({ ...c, seeds: [...c.seeds], oorzaak: Object.entries(c.oorzaken).sort((a, b) => b[1] - a[1])[0][0] })).sort((a, b) => b.n - a.n);
}

// Een kleine tekstkaart van de heatmap voor de index: elke cel een cijfer (aantal mislukkingen, 9+ = veel), verder een punt.
export function heatmapAscii(cellen) {
  if (!cellen.length) return '(geen mislukkingen met een plek)';
  const xs = cellen.map((c) => c.cx), ys = cellen.map((c) => c.cy), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (x1 - x0 > 60 || y1 - y0 > 30) return `(heatmap te groot voor tekst: ${cellen.length} cellen, bereik ${x1 - x0 + 1} x ${y1 - y0 + 1})`;
  const k = [];
  for (let y = y1; y >= y0; y--) { let l = ''; for (let x = x0; x <= x1; x++) { const c = cellen.find((q) => q.cx === x && q.cy === y); l += c ? (c.n > 9 ? '9' : String(c.n)) : '.'; } k.push(l); }
  return k.join('\n');
}

// Per missie over seeds: duur (mediaan, min, max) tegen de verwachte duur, geld, schade, dode tijd, pogingen.
export function balansOverzicht(analyses) {
  const per = new Map();
  for (const a of analyses) { if (!per.has(a.missie)) per.set(a.missie, []); per.get(a.missie).push(a); }
  return [...per.entries()].map(([missie, l]) => {
    const duur = l.map((a) => a.duurS);
    const v = l.map((a) => a.verwachtS).find(Number.isFinite) ?? null;
    return {
      missie, seeds: l.length, duurMediaanS: med(duur), duurMinS: Math.min(...duur), duurMaxS: Math.max(...duur), verwachtS: v,
      verhouding: v ? Math.round((med(duur) / v) * 100) / 100 : null,
      geldDeltaMediaan: med(l.map((a) => a.geld && a.geld.delta)), schadeMax: Math.max(0, ...l.map((a) => a.schade.gezondheidVerlies || 0)),
      dodeTijdMediaanS: med(l.map((a) => a.dodeTijdS)), pogingenMax: Math.max(...l.map((a) => a.pogingen)),
      spreidingDuur: duur.length > 1 ? Math.round((Math.max(...duur) / Math.max(1, Math.min(...duur))) * 100) / 100 : 1,
    };
  });
}
