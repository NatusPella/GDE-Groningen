// Mission map layers (issue #180): what the full map and the minimap show
// while a mission runs. Pure logic, no DOM, no clock, no world: a snapshot of
// the running mission comes in (missionmaplive.js reads it from the live
// modules), a layer comes out:
//   { kind, title, items, lines, areas, focus, info, quiet }
// items are icons ({ id, role, kind, x, y, label, sub, mini, focus }), lines
// are polylines, areas are discs, focus is the part of the world the minimap
// zooms in on, info is the distance, direction and arrival time of the goal.
// Icon kinds are the ones of mapicons.js (the 'mm-' kinds are new there), so
// the rim colours and minimum sizes of mapstyle.js / mapicons.js hold.
import { etaSeconds, etaLabel } from './travelroute.js';
import { KINDS, LEVEL } from './hudbus.js';

// What each role of an item shows as, and how much it counts (a higher
// number wins when the minimap has to drop things).
export const ROLES = {
  goal: { kind: 'sj-target', pri: 100 },
  next: { kind: 'sj-target', pri: 95 },
  checkpoint: { kind: 'waypoint', pri: 70 },
  stop: { kind: 'mm-halte', pri: 75 },
  ring: { kind: 'mm-ring', pri: 72 },
  pad: { kind: 'mm-pad', pri: 90 },
  rival: { kind: 'mm-rival', pri: 60 },
  threat: { kind: 'mm-gevaar', pri: 85 },
  hazard: { kind: 'mm-gevaar', pri: 80 },
  bridge: { kind: 'mm-brug', pri: 78 },
  subgoal: { kind: 'mm-subdoel', pri: 55 },
  aid: { kind: 'mm-hulp', pri: 40 },
  police: { kind: 'police', pri: 88 },
};
// the lines
const LINE_STYLES = { route: 'route', ideal: 'ideal', crow: 'crow', track: 'track' };

// minimap limits
export const MINI_MAX_ITEMS = 9;
export const MINI_ZOOM = { minFactor: 0.3, maxFactor: 1.6, margin: 1.25, fill: 0.78 };
// closer than this (m) a threat or low bridge is announced
const WARN_DIST = { threat: 70, bridge: 160 };

const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const ok = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const COMPASS = ['oosten', 'zuidoosten', 'zuiden', 'zuidwesten', 'westen', 'noordwesten', 'noorden', 'noordoosten'];

// the compass word of a direction in the world frame (y grows to the south)
export function compassOf(from, to) {
  if (!ok(from) || !ok(to)) return '';
  const a = Math.atan2(to.y - from.y, to.x - from.x);
  return COMPASS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
}

// Turn from where you look to the goal: -π..π, positive to the right.
export function relativeBearing(from, angle, to) {
  if (!ok(from) || !ok(to) || !Number.isFinite(angle)) return 0;
  let d = Math.atan2(to.y - from.y, to.x - from.x) - angle;
  d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
  return d;
}

export function distLabel(m) {
  if (!Number.isFinite(m)) return '';
  if (m < 1000) return `${Math.max(5, Math.round(m / 5) * 5)} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

// Which kind of layer a snapshot gets: what you are doing wins over the
// mission's own type; a chase wins over everything on the road.
export function layerKindOf(s) {
  if (!s) return 'algemeen';
  if (s.pigeon) return 'duif';
  if (s.kart) return 'kart';
  if (s.heli) return 'heli';
  const w = s.wanted;
  if (w && w.phase && w.phase !== 'rustig') return 'achtervolging';
  if (s.bus) return 'bus';
  if (s.train) return 'trein';
  if (s.boat) return 'boot';
  const m = s.mission;
  if (m && m.race && m.phase === 'active') return 'race';
  if (m && m.type === 'boat') return 'boot';
  return 'algemeen';
}

const MODE_OF = { duif: 'lucht', kart: 'auto', race: 'auto', achtervolging: 'auto', boot: 'boot', heli: 'lucht', trein: 'ov', bus: 'auto', algemeen: 'auto' };

function item(role, p, extra = {}) {
  const r = ROLES[role];
  return { id: `${role}:${extra.id ?? Math.round(p.x)},${Math.round(p.y)}`, role, kind: extra.kind || r.kind, x: p.x, y: p.y, label: extra.label || '', sub: extra.sub || '', pri: r.pri + (extra.bonus || 0), mini: extra.mini !== false, focus: !!extra.focus, state: extra.state || null, drawn: !!extra.drawn };
}

function line(id, role, pts, style) {
  const clean = (pts || []).filter((p) => Array.isArray(p) ? Number.isFinite(p[0]) && Number.isFinite(p[1]) : ok(p)).map((p) => (Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p.x, y: p.y }));
  return clean.length > 1 ? { id, role, style, pts: clean } : null;
}

// The next thing to go to, per layer kind: the point the info line talks about.
function nextTarget(kind, s, items) {
  const first = (roles) => items.filter((i) => roles.includes(i.role)).sort((a, b) => b.pri - a.pri)[0];
  if (kind === 'duif' || kind === 'heli' || kind === 'bus' || kind === 'trein') {
    const n = items.find((i) => i.state === 'next') || first(['pad', 'next', 'goal', 'stop']);
    return n || null;
  }
  if (kind === 'kart') return items.find((i) => i.role === 'checkpoint' && i.state === 'next') || null;
  if (kind === 'achtervolging') return null;
  return first(['goal', 'next']) || items.find((i) => i.role === 'checkpoint') || null;
}

// The game has no flight ban for the pigeon; the one thing to stay away from
// in the air is a helicopter pad (rotor wash, dust): its area on the pigeon
// layer, drawn as a hazard. pads: heliflight getHelipads(); r defaults to 8 m.
export function heliZones(pads, { factor = 6, min = 60 } = {}) {
  return (pads || []).filter(ok).map((p) => ({ x: p.x, y: p.y, r: Math.max(min, factor * (p.r > 0 ? p.r : 8)), label: 'Helikopterplek' }));
}

// Where to run to: wantedlevels.stepUnseen counts the cool-down twice as fast
// outside the search circle, so the escape area lies just outside it, on the
// player's side of the centre. Nothing is shown with no circle; a player at
// the centre gets the area straight ahead of the heading.
export function escapeSpot(search, player, margin = 40, r = 30) {
  if (!search || !(search.r > 0) || !ok(search) || !ok(player)) return null;
  let dx = player.x - search.x, dy = player.y - search.y;
  let d = Math.hypot(dx, dy);
  if (d < 1) { dx = Math.cos(player.angle || 0); dy = Math.sin(player.angle || 0); d = 1; }
  const k = (search.r + margin) / d;
  return { x: search.x + dx * k, y: search.y + dy * k, r };
}

// Build the layer of a snapshot. Missing parts of the snapshot are fine: a
// layer with only the player and nothing else comes back as null.
export function buildMissionLayer(s) {
  if (!s || !ok(s.player)) return null;
  const kind = layerKindOf(s);
  const m = s.mission || null;
  const items = [];
  const lines = [];
  const areas = [];
  let title = m && m.label ? m.label : '';

  // --- the goal and the optional goals (every kind) ---
  if (m && ok(m.marker) && m.phase === 'active' && kind !== 'kart' && kind !== 'heli') {
    items.push(item('goal', m.marker, { id: 'marker', label: m.label || 'Missiedoel', sub: 'Missiedoel', focus: true, drawn: true }));
  } else if (s.goal && ok(s.goal) && kind !== 'kart') {
    items.push(item('goal', s.goal, { id: 'goal', label: s.goal.name || 'Doel', sub: 'Jouw doel', focus: true, drawn: true }));
  }
  const wps = m && m.phase === 'active' ? m.waypoints || [] : [];
  wps.filter(ok).forEach((w, i) => items.push(item('checkpoint', w, { id: 'wp' + i, label: `Controlepunt ${(m.wpIndex || 0) + i + 2}`, state: i === 0 ? 'next' : 'later', focus: i < 2, drawn: true })));
  if (m && ok(m.marker) && m.phase === 'active' && wps.length) lines.push(line('mission-route', 'route', [m.marker, ...wps], LINE_STYLES.route));
  (s.subgoals || []).filter((g) => ok(g) && !g.done).forEach((g, i) => items.push(item('subgoal', g, { id: 'sub' + i, label: g.label || 'Extra', sub: 'Optioneel' })));
  (s.hazards || []).filter(ok).forEach((h, i) => {
    items.push(item('hazard', h, { id: 'haz' + i, label: h.label || 'Gevaar', sub: h.sub || 'Let op' }));
    if (h.r > 0) areas.push({ id: 'haz-area' + i, role: 'hazard', x: h.x, y: h.y, r: h.r, color: 'danger' });
  });
  (s.aids || []).filter(ok).forEach((a, i) => items.push(item('aid', a, { id: 'aid' + i, kind: a.kind || 'garage', label: a.label || 'Hulp', sub: 'Hulpmiddel', mini: false })));
  if (m && m.zone && ok(m.zone) && m.zone.r > 0) areas.push({ id: 'zone', role: 'goal', x: m.zone.x, y: m.zone.y, r: m.zone.r, color: 'mission' });

  // --- per kind ---
  if (kind === 'duif') {
    title = title || 'Duivenmodus';
    const p = s.pigeon;
    (p.targets || []).filter(ok).forEach((t, i) => items.push(item(i === 0 ? 'next' : 'goal', t, { id: 'pt' + i, label: t.label || 'Voerplek', sub: i === 0 ? 'Volgend doel' : 'Voerplek', state: i === 0 ? 'next' : 'later', focus: i === 0 })));
    (p.threats || []).filter(ok).forEach((t, i) => items.push(item('threat', t, { id: 'th' + i, label: t.label || 'Bedreiging', sub: t.kind === 'kat' ? 'Kat' : t.kind === 'auto' ? 'Auto' : t.kind === 'meeuw' ? 'Meeuw' : 'Gevaar' })));
    (p.noFly || []).filter(ok).forEach((z, i) => areas.push({ id: 'nofly' + i, role: 'hazard', x: z.x, y: z.y, r: z.r || 60, color: 'danger', label: z.label || 'Vliegverbod' }));
    const t0 = items.find((i) => i.state === 'next');
    if (t0) lines.push(line('crow', 'route', [s.player, t0], LINE_STYLES.crow));
  } else if (kind === 'kart') {
    const k = s.kart;
    title = title || 'Kartrace';
    lines.push(line('track', 'route', k.line, LINE_STYLES.track));
    if (k.ideal && k.ideal.length > 1) lines.push(line('ideal', 'route', k.ideal, LINE_STYLES.ideal));
    (k.checkpoints || []).filter(ok).forEach((c, i) => items.push(item('checkpoint', c, { id: 'kc' + i, label: `Controlepunt ${i + 1}`, state: i === k.nextCheckpoint ? 'next' : 'later', focus: true })));
    (k.karts || []).filter((r) => ok(r) && !r.player).forEach((r, i) => items.push(item('rival', r, { id: 'rv' + i, label: r.name || 'Tegenstander', sub: r.lap ? `Ronde ${r.lap}` : 'Tegenstander', focus: true })));
    (k.cuts || []).filter(ok).forEach((c, i) => items.push(item('hazard', c, { id: 'cut' + i, label: 'Afgesneden stuk', sub: 'Tijdstraf' })));
  } else if (kind === 'achtervolging') {
    const w = s.wanted;
    title = title || (w.phase === 'zoeken' ? 'Politie zoekt je' : 'Achtervolging');
    if (w.search && w.search.r > 0) areas.push({ id: 'search', role: 'hazard', x: w.search.x, y: w.search.y, r: w.search.r, color: 'police', label: 'Zoekgebied', drawn: true });
    if (w.escape && w.escape.r > 0) areas.push({ id: 'escape', role: 'goal', x: w.escape.x, y: w.escape.y, r: w.escape.r, color: 'safe', label: 'Ontsnappingsgebied' });
    (w.units || []).filter(ok).forEach((u, i) => items.push(item('police', u, { id: 'pu' + i, kind: u.kind || 'police', label: 'Politie', mini: true, focus: dist(u, s.player) < 400, drawn: true })));
    if (w.chased && ok(w.chased)) items.push(item('rival', w.chased, { id: 'chased', label: 'Achtervolgde', sub: 'Achtervolging', focus: true }));
    if (w.escape && ok(w.escape)) items.push(item('goal', w.escape, { id: 'escape-pt', label: 'Ontsnappen', sub: 'Buiten het zoekgebied ben je sneller kwijt', focus: true }));
  } else if (kind === 'boot') {
    const b = s.boat || {};
    title = title || 'Op het water';
    if (b.route && b.route.length > 1) lines.push(line('boat-route', 'route', b.route, LINE_STYLES.route));
    (b.stops || []).filter(ok).forEach((t, i) => items.push(item('stop', t, { id: 'bs' + i, label: t.label || 'Aanlegplek', sub: 'Halte' })));
    (b.bridges || []).filter(ok).forEach((br, i) => {
      const fits = Number.isFinite(br.clearance) && Number.isFinite(b.airDraught) ? br.clearance >= b.airDraught + 0.05 : true;
      const clear = Number.isFinite(br.clearance) ? `${br.clearance.toFixed(1).replace('.', ',')} m` : '';
      items.push(item(fits ? 'bridge' : 'hazard', br, { id: 'br' + i, kind: 'mm-brug', label: br.name || 'Brug', sub: fits ? `Doorvaarthoogte ${clear}` : `Te laag: ${clear}`, bonus: fits ? 0 : 10, mini: !fits || dist(br, s.player) < 350, state: fits ? 'ok' : 'low' }));
    });
  } else if (kind === 'heli') {
    const h = s.heli;
    title = title || 'Heli';
    (h.rings || []).filter((r) => ok(r) && r.state !== 'done' && r.state !== 'miss').forEach((r, i) => items.push(item('ring', r, { id: 'hr' + i, label: 'Ring', state: r.state === 'next' ? 'next' : 'later', focus: r.state === 'next' })));
    if (ok(h.pad)) items.push(item('pad', h.pad, { id: 'pad', label: 'Landingsplek', sub: 'Landen op de H', focus: true }));
    if (ok(h.balloon)) items.push(item('goal', h.balloon, { id: 'balloon', kind: 'mm-subdoel', label: 'Ballon', sub: 'Achtervolg de ballon', focus: true }));
  } else if (kind === 'trein' || kind === 'bus') {
    const r = kind === 'bus' ? s.bus : s.train;
    title = title || (kind === 'bus' ? 'Buslijn' : 'Treinrit');
    if (r.route && r.route.length > 1) lines.push(line(kind + '-route', 'route', r.route, LINE_STYLES.route));
    (r.stops || []).filter(ok).forEach((t, i) => items.push(item('stop', t, { id: 'st' + i, label: t.name || 'Halte', sub: t.next ? 'Volgende halte' : t.done ? 'Gehaald' : 'Halte', state: t.next ? 'next' : t.done ? 'done' : 'later', focus: !!t.next, mini: !t.done, bonus: t.next ? 20 : 0 })));
  } else if (kind === 'race') {
    title = title || 'Race';
  }

  const nt = nextTarget(kind, s, items);
  const target = nt || (m && ok(m.marker) && m.phase === 'active' ? m.marker : null);
  let info = null;
  if (target) {
    const d = Number.isFinite(m && m.distance) && m.phase === 'active' && (!nt || nt.role === 'goal') ? m.distance : dist(s.player, target);
    const eta = etaSeconds(d, MODE_OF[kind], s.player.speed || 0);
    info = { distance: Math.round(d), distanceLabel: distLabel(d), compass: compassOf(s.player, target), turn: relativeBearing(s.player, s.player.angle, target), etaS: Math.round(eta), etaLabel: etaLabel(eta), label: nt ? nt.label : (m && m.label) || '', target: { x: target.x, y: target.y } };
  }
  if (kind === 'kart' && s.kart) {
    const k = s.kart;
    info = { ...(info || {}), lap: k.lap ?? null, laps: k.laps ?? null, lapTime: k.lapTime ?? null, bestLap: k.bestLap ?? null, position: k.position ?? null };
  }
  if (kind === 'achtervolging' && s.wanted) info = { ...(info || {}), stars: s.wanted.stars || 0, phase: s.wanted.phase };

  const clean = lines.filter(Boolean);
  const layer = { kind, title, items, lines: clean, areas, info, quiet: kind !== 'algemeen' || !!(m && m.phase === 'active') };
  layer.focus = focusOf(layer, s.player, kind === 'kart');
  return items.length || clean.length || areas.length || info ? layer : null;
}

// The part of the world the minimap zooms in on: the player and everything
// the layer marks as focus (and the discs that matter): { x, y, r } around
// the middle of that, or null when there is only the player.
function focusOf(layer, player, wholeTrack = false) {
  const pts = [{ x: player.x, y: player.y, r: 0 }];
  for (const i of layer.items) if (i.focus) pts.push({ x: i.x, y: i.y, r: 0 });
  for (const a of layer.areas) if (a.role === 'goal' || a.color === 'police') pts.push({ x: a.x, y: a.y, r: a.r });
  if (wholeTrack) for (const l of layer.lines) if (l.style === 'track') for (const p of l.pts) pts.push({ x: p.x, y: p.y, r: 0 });
  if (pts.length < 2) return null;
  // the focus is always seen from the player, who stays in the middle of the minimap
  let r = 0;
  for (const p of pts) r = Math.max(r, Math.hypot(p.x - player.x, p.y - player.y) + p.r);
  return { x: player.x, y: player.y, r };
}

// The minimap's scale (px a metre) for a layer: the base scale of the
// travel mode, zoomed so the focus fits (with a margin) but never more than a
// bit out or in from the base. Without a layer or focus the base is kept.
export function missionMinimapScale(layer, base, sizePx) {
  if (!layer || !layer.focus || !(base > 0)) return base;
  const { minFactor, maxFactor, margin, fill } = MINI_ZOOM;
  const need = (sizePx / 2 * fill) / Math.max(20, layer.focus.r * margin);
  return Math.max(base * minFactor, Math.min(base * maxFactor, need));
}

// What the minimap draws of a layer: the items marked for it, the most
// important MINI_MAX_ITEMS (the nearest first among equals); `inRange` is a
// filter of the caller (what lies inside the square).
// Items with `drawn` (the mission's own marker, its checkpoints, the player's
// goal) are drawn by the maps themselves; the maps pass skipDrawn.
export function selectMiniItems(layer, player, max = MINI_MAX_ITEMS, { skipDrawn = false } = {}) {
  if (!layer) return [];
  return layer.items
    .filter((i) => i.mini && !(skipDrawn && i.drawn))
    .map((i) => ({ i, d: Math.hypot(i.x - player.x, i.y - player.y) }))
    .sort((a, b) => b.i.pri - a.i.pri || a.d - b.d)
    .slice(0, max)
    .map((e) => e.i);
}

// The full map shows everything of the layer; only the aids hold back at low zoom.
export function selectMapItems(layer, zoom, { skipDrawn = false } = {}) {
  if (!layer) return [];
  return layer.items.filter((i) => (i.role !== 'aid' || zoom >= 3) && !(skipDrawn && i.drawn));
}

// --- notices (hudbus.js cards) --------------------------------------------------

// Messages for a change between two layers. `seen` is a Set of keys already
// said (the caller keeps it per mission). Returns cards as showCard takes
// them: { kind, title, body, key, voice: false } with their attention rank.
export function layerNotices(prev, layer, player, seen = new Set()) {
  const out = [];
  const say = (kind, key, title, body) => {
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind, title, body, key, voice: false, rank: LEVEL[KINDS[kind].level] });
  };
  if (!layer) return out;
  if (layer.kind === 'achtervolging' && (!prev || prev.kind !== 'achtervolging' || (prev.info && prev.info.phase) !== layer.info.phase)) {
    say('politie', 'mm-wanted-' + layer.info.phase + '-' + (layer.info.stars || 0), layer.info.phase === 'zoeken' ? 'De politie zoekt je' : 'Achtervolging', layer.info.phase === 'zoeken' ? 'Blijf uit het rode zoekgebied op de kaart.' : 'Kijk op de kaart voor het ontsnappingsgebied.');
  }
  for (const i of layer.items) {
    const d = Math.hypot(i.x - player.x, i.y - player.y);
    if (i.role === 'threat' && d < WARN_DIST.threat) say('gevaar', 'mm-threat-' + i.id, i.label || 'Gevaar', `Dichtbij: ${distLabel(d)}.`);
    if (i.role === 'hazard' && i.state === 'low' && d < WARN_DIST.bridge) say('gevaar', 'mm-bridge-' + i.id, i.label || 'Lage brug', `${i.sub}. Vaar er niet onderdoor.`);
  }
  return out;
}
