// De indeling van het binnenste van een trein (#442): per wagen de vloer, de deuren, de rijen stoelen, de haltestangen,
// de lampen en de machinistencabine, en het lopen erin (op de vloer van de trein, tussen de stoelen door, van wagen
// naar wagen). Puur: geen THREE, geen DOM, zodat scripts/treinlayout_test.mjs het kan doorlopen. treininterieur.js
// bouwt er de meshes van; traindrive.js laat de speler erin lopen.
// Wagenframe zoals railway3d.js: x langs het spoor (naar toenemende booglengte), y omhoog, z opzij. Wagen i grenst met
// zijn +x-kant aan de -x-kant van wagen i - 1 (wagen 0 is het +s-uiteinde van de trein).

export const HW = 1.45;          // railway.js HALF_WIDTH
export const WALL_Z = HW - 0.1;  // de binnenkant van de wand
export const AISLE = 0.36;       // m: halve breedte van het gangpad (de stoelen staan erachter)
export const DOOR_W = 1.35;
export const DOOR_ZONE = 1.0;    // m aan weerszijden van een deur waar je tot de wand kunt
export const GANGWAY = 0.62;     // halve breedte van de overgang tussen wagens
export const CAB_DEPTH = 1.2;    // m cabine achter de neus van de wagen
export const SEAT_PITCH = 0.92;
export const WALK_SPEED = 2.2;

export const noseOf = (cfg) => (cfg.front === 'virm' ? 1.9 : 1.6);

// null voor een wagen zonder binnenste (vlakke wagens en locomotieven van de goederentrein)
export function carLayout(cfg, seg) {
  if (seg.kind !== 'car' && seg.kind !== 'power') return null;
  const L = seg.len, cab = seg.cab || 0;
  const floorY = cfg.doubleDeck ? 0.55 : 0.75;
  const out = {
    kind: seg.kind, len: L, cab, floorY, ceilY: floorY + 2.45, doors: [], seats: [], poles: [], lamps: [], pillars: [], stand: [],
    saloon: [-L / 2 + 0.1, L / 2 - 0.1], bulkhead: null, hasDesk: false,
  };
  if (seg.kind === 'power') {
    out.saloon = [-L / 2, L / 2];
    for (let x = -L / 2 + 0.8; x < L / 2; x += 2.2) out.lamps.push(x);
    return out;
  }
  const nose = noseOf(cfg);
  if (cab) {
    out.bulkhead = cab * (L / 2 - nose - CAB_DEPTH);
    out.hasDesk = true;
    if (cab > 0) out.saloon[1] = out.bulkhead - 0.15; else out.saloon[0] = out.bulkhead + 0.15;
  }
  // de deuren op de plek van de buitendeuren (railway3d.js buildCar)
  if (cfg.doubleDeck) {
    const x1 = L / 2 - (cab === 1 ? nose : 0), x0 = -L / 2 + (cab === -1 ? nose : 0);
    out.doors.push(x0 + 3.0, x1 - 3.0);
  } else {
    const ce = cab || 1;
    out.doors.push(-ce * (L / 2 - 3.2), ce * (L / 2 - 6.5));
  }
  out.doors.sort((a, b) => a - b);
  const [s0, s1] = out.saloon;
  const nearDoor = (x, r) => out.doors.some((d) => Math.abs(x - d) < r);
  for (let x = s0 + 0.55; x < s1 - 0.5; x += SEAT_PITCH) {
    if (nearDoor(x, 1.15) || (cab !== 1 && x > L / 2 - 1.2) || (cab !== -1 && x < -L / 2 + 1.2)) continue;
    for (const z of [-1.07, -0.62, 0.62, 1.07]) out.seats.push({ x, z });
  }
  for (const d of out.doors) for (const sx of [-0.78, 0.78]) for (const sz of [-0.62, 0.62]) out.poles.push({ x: d + sx, z: sz });
  for (let k = 0, x = s0 + 0.55; x < s1 - 0.5; x += SEAT_PITCH, k++) if (!nearDoor(x, 1.15) && k % 4 === 0) out.poles.push({ x: x - 0.4, z: -AISLE - 0.04 }, { x: x - 0.4, z: AISLE + 0.04 });
  for (const d of out.doors) for (const sx of [-0.45, 0.45]) for (const sz of [-1.0, 1.0]) out.stand.push({ x: d + sx, z: sz });
  for (let x = s0 + 1.0; x < s1; x += 2.8) out.lamps.push(x);
  for (let x = s0 + 0.9; x < s1; x += 1.9) if (!nearDoor(x, 0.95)) out.pillars.push(x);
  return out;
}

// De indeling van alle wagens van een trein (cfg.segments), eenmaal per soort.
const trainCache = new WeakMap();
export function trainLayout(cfg) {
  let l = trainCache.get(cfg);
  if (!l) { l = cfg.segments.map((seg) => carLayout(cfg, seg)); trainCache.set(cfg, l); }
  return l;
}
export const hasInterior = (cfg) => trainLayout(cfg).some(Boolean);

// --- lopen --------------------------------------------------------------------------------------------

// Kun je hier staan, in wagen `cl`? (x, z in het wagenframe)
export function canStand(cl, x, z) {
  if (!cl) return false;
  const L = cl.len;
  if (x < -L / 2 + 0.12 || x > L / 2 - 0.12) return false;
  if (cl.kind === 'power') return Math.abs(z) <= GANGWAY;
  if (cl.cab && (x - cl.bulkhead) * cl.cab > 0) {
    // de cabine: een kuil voor het bureau, de wand met een deurtje in het gangpad
    if (Math.abs(z) > HW - 0.3) return false;
    if ((x * cl.cab) > L / 2 - 1.05) return false;
    if (Math.abs(x - cl.bulkhead) < 0.12 && Math.abs(z) > AISLE) return false;
    return true;
  }
  if (cl.cab && Math.abs(x - cl.bulkhead) < 0.12) return Math.abs(z) <= AISLE;
  const open = (cl.cab !== 1 && x > L / 2 - 1.0) || (cl.cab !== -1 && x < -L / 2 + 1.0);
  if (open && !cl.doors.some((d) => Math.abs(x - d) < DOOR_ZONE)) return Math.abs(z) <= GANGWAY;
  if (cl.doors.some((d) => Math.abs(x - d) < DOOR_ZONE)) return Math.abs(z) <= HW - 0.3;
  return Math.abs(z) <= AISLE;
}

// st: { car, lx, lz }. d: de verplaatsing in het wagenframe. Een stap per as, zodat je langs een wand glijdt;
// aan het eind van een wagen ga je door naar de buurwagen (de gang is smal). Geeft st terug.
export function walkMove(layout, st, dx, dz) {
  const cl = layout[st.car];
  if (!cl) return st;
  if (canStand(cl, st.lx + dx, st.lz)) st.lx += dx;
  else if (dx) tryCross(layout, st, dx);
  if (canStand(layout[st.car], st.lx, st.lz + dz)) st.lz += dz;
  return st;
}

function tryCross(layout, st, dx) {
  const cl = layout[st.car];
  const edge = cl.len / 2 - 0.12;
  const toward = dx > 0 ? 1 : -1;
  const x = st.lx + dx;
  if (Math.abs(x) <= edge || Math.sign(x) !== toward) return;
  const next = st.car - toward; // +x: wagen i - 1, -x: wagen i + 1
  const nl = layout[next];
  if (!nl || Math.abs(st.lz) > GANGWAY) return;
  const nx = -toward * (nl.len / 2 - 0.2);
  if (!canStand(nl, nx, st.lz)) return;
  st.car = next; st.lx = nx;
}

// Waar je staat in de wereld (kaartcoördinaten), voor een wagen { x, y, angle, z }.
export function carPoint(car, lx, lz) {
  const c = Math.cos(car.angle), s = Math.sin(car.angle);
  return { x: car.x + lx * c - lz * s, y: car.y + lx * s + lz * c };
}
export const carHeading = (car, yaw) => car.angle + yaw;

// Het zitje van de machinist in de cabinewagen: waar de ogen zitten (wagenframe).
export function driverEye(cl) {
  const e = cl.cab || 1;
  return { x: e * (cl.len / 2 - 1.5), y: cl.floorY + 1.28, z: -0.25 };
}
// Waar je in de cabine staat als je opstaat en het deurtje in de wand ziet.
export function cabDoorSpot(cl) {
  return { x: cl.bulkhead - cl.cab * 0.5, z: 0 };
}
// Het cabinedeel: staat de speler achter de wand van de cabine?
export const inCabZone = (cl, x) => !!cl.cab && (x - cl.bulkhead) * cl.cab > 0;

// Een deur binnen bereik (m) van de speler, of null; voor het uitstappen op een halte.
export function doorNear(cl, x, z, r = 1.3) {
  if (!cl) return null;
  let best = null, bd = r;
  for (const d of cl.doors) {
    const dd = Math.hypot(x - d, Math.abs(z) - (HW - 0.3));
    if (dd < bd) { bd = dd; best = { x: d, side: z >= 0 ? 1 : -1 }; }
  }
  return best;
}

// Reizigers van een wagen: een deterministisch beeld per zaadje; { seated: [{x,z,c,s}], standing: [...] }.
export function passengers(cl, seed, fill = 0.55) {
  const out = { seated: [], standing: [] };
  if (!cl || cl.kind !== 'car') return out;
  let r = (seed * 2654435761) >>> 0;
  const rnd = () => { r ^= r << 13; r >>>= 0; r ^= r >>> 17; r ^= r << 5; r >>>= 0; return r / 4294967296; };
  for (const s of cl.seats) if (rnd() < fill) out.seated.push({ x: s.x, z: s.z, c: (rnd() * 6) | 0, s: (rnd() * 3) | 0 });
  for (const s of cl.stand) if (rnd() < fill * 0.5) out.standing.push({ x: s.x + (rnd() - 0.5) * 0.1, z: s.z, c: (rnd() * 6) | 0, s: (rnd() * 3) | 0, a: rnd() * Math.PI * 2 });
  return out;
}
