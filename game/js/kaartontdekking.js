// Kaartontdekking (#899): de onbezochte gebieden echt uitgrijzen. De oude mist was een
// donkere laag over de stad die met de speler meereed; de rest van de provincie was meteen
// zichtbaar. Hier staan de pure regels: welke buurten (de fijnste laag van Veroverd,
// gebieden.js) zijn nog niet bezocht, hoe groot het masker is en hoe lang een net onthuld
// gebied zichtbaar opgloeit voordat het grijs verdwijnt. De kaart bouwt daar één masker van
// (mapview.js); de opslag blijft die van gebieden.js (`bezocht`), dus per speler.
export const DISCOVERY_RES_M = 80; // m per pixel van het masker: klein genoeg voor een zachte rand
export const REVEAL_MS = 1300;     // hoe lang een net bezochte buurt zichtbaar opgloeit

// De maat van het masker over een wereldbox, in pixels.
export function maskSize(bounds, res = DISCOVERY_RES_M) {
  if (!Array.isArray(bounds) || bounds.length !== 4 || !bounds.every(Number.isFinite) || !(res > 0)) return null;
  const w = Math.ceil((bounds[2] - bounds[0]) / res), h = Math.ceil((bounds[3] - bounds[1]) / res);
  return w > 0 && h > 0 ? { w, h } : null;
}

// De buurten die deze speler nog niet bezocht heeft, in de volgorde van de indeling:
// [{ gebied, ... }] van gebieden.js (niveau 'buurt'). Zonder indeling niets.
export function unseenDistricts(ind, profile) {
  if (!ind || !Array.isArray(ind.gebieden)) return [];
  const seen = new Set(profile && Array.isArray(profile.bezocht) ? profile.bezocht : []);
  return ind.gebieden.filter((g) => g && g.niveau === 'buurt' && g.grens && !seen.has(g.id));
}

// Hoeveel van de provincie je zag: de bezochte buurten, naar beneden afgerond (zoals
// kaartVerkend in gebieden.js, zodat 100 pas bij de laatste buurt valt).
export function discoveryRatio(ind, profile) {
  if (!ind || !Array.isArray(ind.gebieden)) return { done: 0, total: 0, pct: 0 };
  const seen = new Set(profile && Array.isArray(profile.bezocht) ? profile.bezocht : []);
  let total = 0, done = 0;
  for (const g of ind.gebieden) {
    if (!g || g.niveau !== 'buurt') continue;
    total++;
    if (seen.has(g.id)) done++;
  }
  return { done, total, pct: total ? Math.floor((done / total) * 100) : 0 };
}

// De dekking van de onthulling: 1 vlak na het bezoek, 0 als de fade klaar is. Een
// smoothstep, zodat het gebied zacht uitdooft in plaats van in één beeld te verspringen.
export function revealAlpha(now, at, ms = REVEAL_MS) {
  if (!Number.isFinite(now) || !Number.isFinite(at) || !(ms > 0)) return 0;
  const t = Math.max(0, Math.min(1, (now - at) / ms));
  return 1 - t * t * (3 - 2 * t);
}

// Het detailniveau per gebiedstoestand (20-11, gebiedtoestand.js): in een gebied waar je nog nooit was zie je alleen grove vormen
// (de mistlaag dempt wegen, water en gebouwen), geen straatnamen en geen kleine pins. Bezocht gebied houdt het volle detail.
// De toestand wordt per speler uit het eigen profiel gehaald; de kaart is lokaal.
export const DETAIL = {
  onzichtbaar: { straatnamen: false, pins: false },
  zichtbaar: { straatnamen: true, pins: true },
  bezig: { straatnamen: true, pins: true },
  veroverd: { straatnamen: true, pins: true },
};
export const detailVoor = (toestand) => DETAIL[toestand] || DETAIL.onzichtbaar;

// Pins die ook in onbezocht gebied blijven: jijzelf, medespelers, het gekozen doel en je eigen waypoint (bewust getoonde doelen).
const BLIJFT = new Set(['player', 'partner', 'goal', 'userWaypoint']);
export function pinBlijftInMist(kind, pick) {
  return BLIJFT.has(kind) || !!(pick && (pick.isGoal || pick.self));
}
