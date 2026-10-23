// Coöp (#434): vloeiend bewegen bij een gast. De snapshots komen met 20 Hz; de gast toont de wereld iets in het verleden
// en tekent tussen twee snapshots. Komt er even geen nieuwe, dan gaat de beweging door met de laatst bekende snelheid
// (hoogstens EXTRA_MAX seconden), zodat voertuigen en mensen niet "een meter en dan stil" staan. Alleen bij een teleport
// (meer dan SPRONG_M tussen twee snapshots) springt de tekening. Pure logica, geen DOM, getest in scripts/net_interp_test.mjs.
export const INTERP_DELAY = 0.12;  // s: zoveel loopt de gast achter op de laatste snapshot
export const EXTRA_MAX = 0.25;     // s: hoever we voorbij de laatste snapshot mogen voorspellen
export const ACHTER_MAX = 0.5;     // s: verder dan dit achter de laatste: de weergavetijd springt bij
export const SPRONG_M = 20;        // m: een verplaatsing tussen twee snapshots groter dan dit is een teleport
export const BIJSTUUR = 0.25;      // hoeveel sneller of langzamer de weergavetijd mag lopen om de vertraging recht te trekken

export const lerp = (a, b, k) => a + (b - a) * k;
export function lerpAngle(a, b, k) { const d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * k; }

// De nieuwe weergavetijd: loopt met de klok mee, een tikje sneller of langzamer richting (laatste - vertraging) en springt alleen
// als we ver achter de laatste snapshot zitten. Zo schuift hij zacht mee met aankomstjitter in plaats van te klemmen.
// tempo: hoeveel hosttijd er per seconde van onze klok voorbijkomt (1 = gelijk; een host die trager draait dan zijn klok, is lager).
export function volgTijd(renderT, laatste, dt, vertraging = INTERP_DELAY, tempo = 1) {
  if (!Number.isFinite(laatste)) return renderT;
  const doel = laatste - vertraging;
  if (renderT == null || !Number.isFinite(renderT)) return doel;
  if (renderT < laatste - ACHTER_MAX) return doel;
  const fout = doel - renderT;
  const snelheid = (Number.isFinite(tempo) ? tempo : 1) * (1 + Math.min(BIJSTUUR, Math.max(-BIJSTUUR, fout * 1.5)));
  return Math.min(laatste + EXTRA_MAX, renderT + dt * snelheid);
}

// Het tempo van de hostklok ten opzichte van onze klok, uit de laatste anderhalve seconde aan snapshots (marks: [onze tijd, hosttijd]).
// Zacht bijgesteld (een derde per snapshot) en begrensd; te weinig gegevens: ongewijzigd.
export function schatTempo(marks, wall, hostT, huidig = 1) {
  marks.push([wall, hostT]);
  while (marks.length > 40 || (marks.length > 2 && wall - marks[0][0] > 1.5)) marks.shift();
  const a = marks[0], b = marks[marks.length - 1], span = b[0] - a[0];
  if (marks.length < 5 || span < 0.4) return huidig;
  const r = (b[1] - a[1]) / span;
  return Math.min(1.5, Math.max(0.3, huidig + (r - huidig) * 0.33));
}

// Eén positie tussen twee toestanden a en b (k van 0 tot 1; boven 1 is voorspellen met de snelheid tussen a en b).
// grond: het veld van de tweede grondas ('z' bij entiteiten, 'y' bij spelers); tellers: velden die ook meelopen (hoogte, snelheid, sturen).
export function mixPositie(a, b, k, grond = 'z', tellers = ['vz', 'speed', 'steer']) {
  if (!a || !Number.isFinite(k)) return b;
  const dx = b.x - a.x, dg = b[grond] - a[grond];
  if (!(Math.hypot(dx, dg) <= SPRONG_M)) return b; // teleport (of rommel): geen glijden
  const kk = Math.max(0, k);
  const o = { ...b, x: a.x + dx * kk, [grond]: a[grond] + dg * kk, angle: lerpAngle(a.angle || 0, b.angle || 0, kk) };
  for (const f of tellers) if (Number.isFinite(a[f]) && Number.isFinite(b[f])) o[f] = lerp(a[f], b[f], Math.min(1, kk));
  return o;
}

// Een lijst entiteiten tussen twee snapshots, op id: wat in a ontbreekt blijft zoals in b.
export function mixEntiteiten(la, lb, k) {
  const m = new Map(); for (const e of la || []) m.set(e.id, e);
  return (lb || []).map((eb) => mixPositie(m.get(eb.id), eb, k, 'z'));
}
