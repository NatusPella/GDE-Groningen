// De markeringen van Bezit in de wereld (epic #1095, #1100): welke percelen en panden een paal met een bord krijgen, en wat er verandert tussen twee keer. Puur:
// geen THREE, geen DOM, geen klok (scripts/bezitmarker_test.mjs); bezitmarker3d.js bouwt de palen. Je koopt het perceel, niet de tegel: er verandert niets aan
// de wereld, alleen een laag erbovenop. Hoogstens MAX_MARKERS tegelijk, de dichtstbijzijnde; de rest is een cijfer. Een grenslijn tekent alleen waar de kaart een rand
// heeft (PERCEELRANDEN-21-11): deze module levert alleen palen, geen afgeleide rand.

export const MARKER_RADIUS = 600;       // meter rond de speler
export const MAX_MARKERS = 200;         // het budget uit het ontwerp (hoofdstuk 9)
export const REPLAN_MOVE_M = 25;        // pas opnieuw plannen als de speler zoveel verplaatst is (of het bezit veranderde)

const STATE_WORD = { own: 'Van jou', claimed: 'Medespeler' };

// player: { x, y }; bezit: uit bezit.js; index: { parcels, buildings } uit parcelindex.js (mag ontbreken); claims: [{ id, name, color }] van medespelers;
// labelOf(id) -> { name, sub } voor een eigen perceel (naam en stand); geeft een gesorteerde lijst { key, kind, x, y, label, sub, state, color, d }.
export function planMarkers({ player, bezit, index = null, claims = [], labelOf = null, radius = MARKER_RADIUS, max = MAX_MARKERS } = {}) {
  const out = [];
  if (!player || !Number.isFinite(player.x) || !Number.isFinite(player.y) || !bezit) return out;
  const near = (x, y) => { const d = Math.hypot(x - player.x, y - player.y); return d <= radius ? d : -1; };
  for (const id of Object.keys(bezit.parcels)) {
    const r = bezit.parcels[id];
    if (r.lg) continue;                                        // de hand-gezette percelen hebben hun eigen markering van de boerderij
    const c = r.c || r.a;
    if (!c) continue;
    const d = near(c[0], c[1]);
    if (d < 0) continue;
    const l = labelOf ? labelOf(id) : null;
    out.push({ key: 'p:' + id, kind: 'parcel', x: c[0], y: c[1], label: (l && l.name) || 'Perceel', sub: (l && l.sub) || STATE_WORD.own, state: 'own', color: null, d });
  }
  if (index) {
    for (const cl of claims) {
      const p = index.parcels.byId(cl.id);
      if (!p) continue;
      const d = near(p.x, p.y);
      if (d < 0) continue;
      out.push({ key: 'c:' + cl.id, kind: 'parcel', x: p.x, y: p.y, label: `Van ${cl.name}`, sub: STATE_WORD.claimed, state: 'claimed', color: cl.color || null, d });
    }
    for (const osm of bezit.buildings) {
      const b = index.buildings.byId(osm);
      if (!b) continue;
      const d = near(b.x, b.y);
      if (d < 0) continue;
      out.push({ key: 'b:' + osm, kind: 'building', x: b.x, y: b.y, h: b.h || 6, label: 'Van jou', sub: (bezit.bstate[osm] && bezit.bstate[osm].kind) || 'pand', state: 'own', color: null, d });
    }
  }
  return out.sort((a, b) => a.d - b.d || (a.key < b.key ? -1 : 1)).slice(0, max);
}

const sig = (m) => `${m.label}|${m.sub}|${m.state}|${m.color || ''}|${Math.round(m.x)},${Math.round(m.y)}`;
// Wat er verandert: { add: [markers], remove: [keys], update: [markers] }. prev is een Map key -> handtekening die de aanroeper bijhoudt via apply().
export function diffMarkers(prev, next) {
  const add = [], update = [], seen = new Set();
  for (const m of next) {
    seen.add(m.key);
    const old = prev.get(m.key);
    if (old === undefined) add.push(m); else if (old !== sig(m)) update.push(m);
  }
  const remove = [...prev.keys()].filter((k) => !seen.has(k));
  return { add, update, remove };
}
export function applyDiff(prev, d) {
  for (const m of d.add) prev.set(m.key, sig(m));
  for (const m of d.update) prev.set(m.key, sig(m));
  for (const k of d.remove) prev.delete(k);
  return prev;
}

// Moet er opnieuw gepland worden: de speler is ver genoeg verplaatst, of het bezit of de claims zijn veranderd (versie).
export function needsReplan(last, now, version) {
  if (!last) return true;
  return last.version !== version || Math.hypot(now.x - last.x, now.y - last.y) >= REPLAN_MOVE_M;
}

// De versie van wat de markeringen beïnvloedt: aantallen en een som over de id's; goedkoop genoeg voor elk beeld.
export function bezitVersion(bezit, claims = []) {
  let h = Object.keys(bezit.parcels).length * 31 + bezit.buildings.size * 17 + claims.length * 7;
  for (const id of Object.keys(bezit.parcels)) h = (h + id.charCodeAt(id.length - 1) * 3 + id.charCodeAt(1)) | 0;
  return h;
}
