// Binnensets (bouwsteen G0b): de pure kant van de drie nieuwe kamers waar een dialoog binnen
// speelt, naast kantoor, serverkamer, Loket en Oma's keuken (stagesets.js). Geen three:
// afmetingen, meubelvoetafdrukken, de plek van de speler en de figuren, de fit-regels en de
// terugval zijn met node na te spelen. Het tekenen staat in rooms3d.js.
//
//   kroeg      de bar met krukken, tafels, een dartbord en een jukebox (M16, #956);
//   woonkamer  de bank, de salontafel en de tv, met de eettafel bij het raam;
//   garage     de werkplaats met een auto op de hefbrug, werkbank en banden (M02);
//   kruitkelder  het gewelf onder Bourtange met kruittonnen, de kist met de bal en de deur waar Jelles mannen op kloppen (M20).
//
// Plan: u langs wereld-x, v langs wereld-y, de oorsprong in het midden van de vloer. De speler
// kijkt naar +u, zoals in alle binnensets. Een kamer is gesloten (alleen de binnenkant wordt
// getekend) en hangt op de vloerhoogte van de kaart; staat de grond eronder in water, in een
// gebouw of is de hoogte onbekend, dan komt de kamer hoog boven de straat (roomBaseHeight) en
// valt een kamer die nergens past terug op het spel in de open lucht (null).

export const ROOM_KINDS = ['kroeg', 'woonkamer', 'garage', 'kruitkelder'];
export const ROOM_LIFT = 40; // m: een kamer hoog boven de straat, zoals de keuken van de opening

export const ROOMS = {
  kroeg: {
    w: 11, d: 7, h: 3.0,
    player: { u: -1.0, v: 0.2 },
    furniture: [
      { id: 'bar', kind: 'bar', u: 4.3, v: 0, w: 0.7, d: 5.4, h: 1.1 },
      { id: 'kruk1', kind: 'kruk', u: 3.35, v: -1.9, w: 0.4, d: 0.4, h: 0.7 },
      { id: 'kruk2', kind: 'kruk', u: 3.35, v: -0.65, w: 0.4, d: 0.4, h: 0.7 },
      { id: 'kruk3', kind: 'kruk', u: 3.35, v: 0.65, w: 0.4, d: 0.4, h: 0.7 },
      { id: 'kruk4', kind: 'kruk', u: 3.35, v: 1.9, w: 0.4, d: 0.4, h: 0.7 },
      { id: 'tafelA', kind: 'tafel', u: -2.8, v: -2.1, w: 1.2, d: 1.2, h: 0.78 },
      { id: 'tafelB', kind: 'tafel', u: -2.8, v: 2.1, w: 1.2, d: 1.2, h: 0.78 },
      { id: 'tafelC', kind: 'tafel', u: 0.4, v: -2.4, w: 1.2, d: 1.2, h: 0.78 },
      { id: 'jukebox', kind: 'jukebox', u: -5.0, v: 0, w: 0.6, d: 1.1, h: 1.6 },
    ],
    npcs: [
      { key: 'snackbar', u: 5.0, v: 0.2, face: Math.PI },   // de kastelein achter de bar
      { key: 'terras', u: 1.9, v: 1.2, face: 2.6 },          // een gast die meekijkt
    ],
  },
  woonkamer: {
    w: 7.5, d: 5.6, h: 2.7,
    player: { u: -1.2, v: 0.4 },
    furniture: [
      { id: 'bank', kind: 'bank', u: 2.2, v: 0, w: 1.0, d: 2.4, h: 0.85 },
      { id: 'salontafel', kind: 'salontafel', u: 0.5, v: 0, w: 0.9, d: 0.9, h: 0.42 },
      { id: 'tvkast', kind: 'tvkast', u: -3.35, v: 0, w: 0.5, d: 1.6, h: 0.5 },
      { id: 'eettafel', kind: 'tafel', u: 0.2, v: -2.0, w: 1.6, d: 0.9, h: 0.76 },
      { id: 'plant', kind: 'plant', u: 3.1, v: 2.1, w: 0.5, d: 0.5, h: 1.2 },
    ],
    npcs: [
      { key: 'mem', u: 1.1, v: 1.55, face: -2.3 },
      { key: 'berend', u: -1.6, v: 1.6, face: -1.2 },
    ],
  },
  garage: {
    w: 9, d: 6.5, h: 3.4,
    player: { u: -1.5, v: 0.5 },
    furniture: [
      { id: 'hefbrug', kind: 'hefbrug', u: 1.4, v: -1.4, w: 4.4, d: 2.0, h: 1.5 },
      { id: 'werkbank', kind: 'werkbank', u: -4.0, v: -1.5, w: 0.8, d: 2.6, h: 0.95 },
      { id: 'banden', kind: 'banden', u: 3.7, v: 2.3, w: 0.9, d: 0.9, h: 1.0 },
      { id: 'vaten', kind: 'vaten', u: 3.8, v: -2.6, w: 0.9, d: 0.9, h: 0.95 },
    ],
    npcs: [
      { key: 'tinus', u: -2.8, v: 1.6, face: 0.5 },
      { key: 'berend', u: 0.2, v: 2.3, face: -1.1 },
    ],
  },
  // M20 Het beleg van Bourtange (AAA): de drie deurstappen spelen in het gewelf. De deur staat voor de speler (+u), de kruittonnen
  // en de kist met de bal staan achter hem langs de muur, Mem en Oma Trijntje staan naast hem bij het kaarslicht.
  kruitkelder: {
    w: 8, d: 5.6, h: 2.7,
    player: { u: -1.4, v: 0.2 },
    furniture: [
      { id: 'deur', kind: 'deur', u: 3.85, v: 0, w: 0.3, d: 1.5, h: 2.1 },
      { id: 'tonA', kind: 'kruitton', u: -3.2, v: -2.0, w: 0.9, d: 0.9, h: 0.95 },
      { id: 'tonB', kind: 'kruitton', u: -3.2, v: -0.95, w: 0.9, d: 0.9, h: 0.95 },
      { id: 'tonC', kind: 'kruitton', u: -3.2, v: 2.0, w: 0.9, d: 0.9, h: 0.95 },
      { id: 'tonD', kind: 'kruitton', u: -2.15, v: 2.1, w: 0.9, d: 0.9, h: 0.95 },
      { id: 'kist', kind: 'kist', u: -3.15, v: 0.55, w: 0.8, d: 0.9, h: 0.55 },
      { id: 'kaarstafel', kind: 'kaarstafel', u: 0.9, v: -2.2, w: 0.8, d: 0.8, h: 0.8 },
    ],
    npcs: [
      { key: 'mem', u: 1.5, v: 1.4, face: -2.3 },
      { key: 'trijntje', u: 1.7, v: -1.2, face: 2.4 },
    ],
  },
};

export const isRoomKind = (kind) => ROOM_KINDS.includes(kind);
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

// Waar de kamer komt zodat de speler op zijn plek in de kamer staat. null bij een onbekende
// kamer of een speler zonder positie.
export function roomLayout(kind, player) {
  const spec = ROOMS[kind];
  if (!spec || !player || !isNum(player.x) || !isNum(player.y)) return null;
  return {
    kind, x: player.x - spec.player.u, y: player.y - spec.player.v, facing: 0,
    hold: { x: player.x, y: player.y, angle: 0 },
  };
}

// De fit-regels: een punt ({ u, v, r }) staat in de kamer, op minstens `margin` van de muur en
// niet in een meubelvoetafdruk (plus zijn eigen straal). Geeft de lijst van overtredingen.
export function roomFit(kind, points, { margin = 0.45 } = {}) {
  const spec = ROOMS[kind];
  if (!spec) return [`onbekende kamer ${kind}`];
  const bad = [];
  points.forEach((p, i) => {
    const name = p.id || `punt ${i}`;
    const r = p.r ?? 0.35;
    if (!isNum(p.u) || !isNum(p.v)) { bad.push(`${name}: geen getal`); return; }
    if (Math.abs(p.u) > spec.w / 2 - margin || Math.abs(p.v) > spec.d / 2 - margin) bad.push(`${name}: te dicht bij de muur`);
    for (const f of spec.furniture) {
      if (Math.abs(p.u - f.u) < f.w / 2 + r && Math.abs(p.v - f.v) < f.d / 2 + r) bad.push(`${name}: staat in ${f.id}`);
    }
  });
  return bad;
}

// Speler en figuren van een kamer als fit-punten.
export function roomPeoplePoints(kind) {
  const spec = ROOMS[kind];
  if (!spec) return [];
  return [{ id: 'speler', u: spec.player.u, v: spec.player.v }, ...spec.npcs.map((n) => ({ id: n.key, u: n.u, v: n.v }))];
}

// De vloerhoogte van de kamer. groundAt(x, y) -> hoogte van de kaart (of een niet-getal);
// blockedAt(x, y) -> true in water of een gebouw. De kamer staat op de hoogste grond onder
// zijn voetafdruk; is die onbekend, dan is er geen kamer (null: terugval op de open lucht);
// is een hoek geblokkeerd, dan hangt hij hoog boven de straat (allowLift, voor een cutscene
// waar alles op de ankerhoogte staat) of is er geen kamer (null): een missiestap houdt de
// speler op de grond, dus daar kan een kamer niet omhoog.
export function roomBaseHeight(kind, layout, { groundAt, blockedAt = null, allowLift = false } = {}) {
  const spec = ROOMS[kind];
  if (!spec || !layout || typeof groundAt !== 'function') return null;
  const hw = spec.w / 2, hd = spec.d / 2;
  let top = -Infinity, blocked = false;
  for (const [du, dv] of [[0, 0], [-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]]) {
    const x = layout.x + du, y = layout.y + dv;
    const g = groundAt(x, y);
    if (!isNum(g)) return null;
    top = Math.max(top, g);
    if (blockedAt && blockedAt(x, y)) blocked = true;
  }
  if (blocked) return allowLift ? { z: top + ROOM_LIFT, lifted: true } : null;
  return { z: top, lifted: false };
}

// De camera binnen de muren (cutscenehost.js env.clamp), in wereldmaten rond de kamer op `at`.
export function roomClamp(kind, at, x, y, z) {
  const spec = ROOMS[kind];
  if (!spec) return null;
  const base = at.z || 0;
  return {
    x: Math.max(at.x - (spec.w / 2 - 0.45), Math.min(at.x + (spec.w / 2 - 0.45), x)),
    y: Math.max(at.y - (spec.d / 2 - 0.45), Math.min(at.y + (spec.d / 2 - 0.45), y)),
    z: Math.max(base + 0.3, Math.min(base + spec.h - 0.25, z)),
  };
}
