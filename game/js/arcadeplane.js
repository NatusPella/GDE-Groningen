// Arcade-vliegtuig (#15): pure vliegmodel, zonder THREE of wereld. heliflight.js
// is aan Vehicle, kaart en toetsen gekoppeld en vliegt alleen rotoren; dit is het
// vastevleugelmodel ernaast. Een stap neemt stuurinvoer in [-1, 1] en geeft de
// nieuwe staat. Onderaan staat de vluchtdienst (#444): een route tussen twee velden
// met poorten, een checklist, een klok en een uitslag met medaille.
// Tests: scripts/arcadeplane_test.mjs en scripts/vluchtdienst_test.mjs.
import { maakDienst, stapDienst, dienstVoortgang, dienstUitslag, dienstStand } from './simdienst.js';

export const PLANE = {
  stall: 22,        // m/s: eronder zakt de neus en valt hij
  cruise: 48,
  vmax: 70,
  accel: 14,        // m/s2 bij vol gas
  drag: 0.0035,
  climbMax: 0.55,   // rad: grootste neushoek
  rollMax: 0.8,
  turnRate: 0.9,    // rad/s bij volle rolhoek
  liftoff: 30,      // m/s: pas daarboven komt hij van de baan
  rotate: 26,       // m/s: vanaf hier kan de neus omhoog
  landVz: 4,        // m/s zinkgang waaronder de landing zacht is
  crashVz: 9,
  ceiling: 600,
  flapStep: 2,      // m/s lagere overtrek-, rotatie- en opstijgsnelheid per stand van de kleppen (0 tot 3)
  flapDrag: 0.18,   // extra luchtweerstand per stand
  flapMax: 58,      // m/s: sneller dan dit klappen de kleppen vanzelf in
  gearDrag: 0.12,   // extra luchtweerstand met het landingsgestel uit, in de lucht
  landSpeed: 2.0,   // keer de overtreksnelheid: sneller aan de grond is een harde landing
};

export function makePlane(x, y, z, heading) {
  return { x, y, z, heading, speed: 0, pitch: 0, roll: 0, vz: 0, onGround: true, crashed: false, stalled: false, throttle: 0, flaps: 0, gear: true };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Tegenwind in m/s voor een koers (wind = { x, y }: waarheen de wind waait); negatief is rugwind.
export const tegenwind = (wind, heading) => (wind ? -(wind.x * Math.cos(heading) + wind.y * Math.sin(heading)) : 0);

// groundAt(x, y) -> hoogte van de grond; onRunway(x, y) -> bool (baan of helling)
// inp: { throttle, roll, yaw, pitch, brake, flaps (0..3), gear (bool), wind: { x, y } }
export function stepPlane(p, inp, dt, groundAt, onRunway = () => true, spec = PLANE) {
  if (p.crashed || dt <= 0) return p;
  const thr = clamp(inp.throttle ?? 0, 0, 1);
  p.throttle = thr;
  // kleppen en landingsgestel: de kleppen klappen boven flapMax vanzelf in; het gestel kan alleen in de lucht
  if (inp.flaps !== undefined) p.flaps = clamp(Math.round(inp.flaps), 0, 3);
  if (p.speed > spec.flapMax) p.flaps = 0;
  if (inp.gear !== undefined && !p.onGround) p.gear = !!inp.gear;
  if (p.onGround) p.gear = true;
  const fl = p.flaps || 0;
  const stallV = spec.stall - spec.flapStep * fl, rotateV = spec.rotate - spec.flapStep * fl, liftoffV = spec.liftoff - spec.flapStep * fl;
  // wind telt mee: op de grond ligt de vliegsnelheid hoger met tegenwind; in de lucht drijf je mee
  const head = tegenwind(inp.wind, p.heading);
  const dragK = 1 + spec.flapDrag * fl + (!p.onGround && p.gear ? spec.gearDrag : 0);
  p.speed = clamp(p.speed + (thr * spec.accel - spec.drag * dragK * p.speed * p.speed - (p.onGround ? 2 + (inp.brake ? 10 : 0) : 0)) * dt, 0, spec.vmax);

  if (p.onGround) {
    p.roll = 0;
    p.pitch = 0;
    p.heading += clamp(inp.yaw ?? 0, -1, 1) * 0.5 * Math.min(1, p.speed / 8) * dt;
    if (p.speed + head >= rotateV && (inp.pitch ?? 0) > 0.1 && p.speed + head >= liftoffV) {
      p.onGround = false;
      p.vz = 3;
      p.z += 0.3;
    }
  } else {
    p.roll += (clamp(inp.roll ?? 0, -1, 1) * spec.rollMax - p.roll) * Math.min(1, 3 * dt);
    p.pitch += (clamp(inp.pitch ?? 0, -1, 1) * spec.climbMax - p.pitch) * Math.min(1, 2 * dt);
    p.heading += Math.sin(p.roll) * spec.turnRate * dt * (p.speed / spec.cruise);
    p.stalled = p.speed < stallV;
    const lift = p.stalled ? -9.8 * (1 - p.speed / stallV) * 1.4 : 0;
    const target = Math.sin(p.pitch) * p.speed * 0.6 + lift - (p.stalled ? 2.5 : 0);
    p.vz += (target - p.vz) * Math.min(1, 1.6 * dt);
    if (p.stalled) p.pitch = Math.min(p.pitch, -0.15);
    p.z += p.vz * dt;
    if (p.z > spec.ceiling) { p.z = spec.ceiling; p.vz = Math.min(p.vz, 0); }
  }
  p.x += Math.cos(p.heading) * p.speed * Math.cos(p.pitch) * dt;
  p.y += Math.sin(p.heading) * p.speed * Math.cos(p.pitch) * dt;
  if (!p.onGround && inp.wind) { p.x += inp.wind.x * dt; p.y += inp.wind.y * dt; }
  if (p.onGround) { p.z = groundAt(p.x, p.y); return p; }

  const g = groundAt(p.x, p.y);
  if (p.z <= g) {
    const sink = -p.vz;
    const flat = Math.abs(p.roll) < 0.25 && Math.abs(p.pitch) < 0.3;
    const neus = p.pitch;
    if (onRunway(p.x, p.y) && p.gear && sink < spec.crashVz && flat && p.speed >= stallV * 0.8 && sink < spec.landVz * 2.2) {
      // zacht: rustig zakken, niet te snel aan de grond en de neus niet naar beneden
      const zacht = sink < spec.landVz && p.speed <= stallV * spec.landSpeed && neus > -0.22;
      p.onGround = true; p.z = g; p.vz = 0; p.pitch = 0; p.roll = 0; p.stalled = false;
      p.landing = zacht ? 'zacht' : 'hard';
    } else {
      p.crashed = true; p.z = g; p.speed = 0; p.vz = 0;
    }
  }
  return p;
}

// --- vluchtdienst (#444): een route tussen twee velden met een puntentelling ------------
// De regels: vlieg de poorten in volgorde langs (binnen poortR, langzamer dan poortV en op de
// hoogte van de poort), houd de checklist bij het opstijgen in orde en land op de bestemming.
// Een crash of een gemiste poort kost punten, net als te laat aankomen; er is nooit leed.
export const VLUCHT = {
  poortR: 220,        // m: zo dicht bij een poort telt hij
  poortV: 62,         // m/s: langzamer dan dit door de poort
  hoogteMarge: 60,    // m: zoveel mag je van de hoogte van een poort zitten
  veldR: 320,         // m: het veld waar je neerkomt
  landBonus: 4,       // punten voor een zachte landing
  checklistBonus: 3,  // punten voor een vlucht die met een kloppende checklist begon
};

// De checklist van een vlucht, tegen de staat van het vliegtuig (arcadeplane.js).
export const CHECKLIST = [
  { id: 'kleppen', tekst: 'Kleppen op 0 of 1', ok: (p) => (p.flaps || 0) <= 1 },
  { id: 'gestel', tekst: 'Landingsgestel uit', ok: (p) => !!p.gear },
  { id: 'waterpas', tekst: 'Vleugels waterpas', ok: (p) => Math.abs(p.roll || 0) < 0.2 },
];

export function checklist(p) {
  return CHECKLIST.map((i) => ({ id: i.id, tekst: i.tekst, ok: !!i.ok(p) }));
}

// route: [{ x, y, naam?, z?, zMarge?, stopR?, stopV? }]; van en naar: { x, y, naam }.
export function maakVluchtdienst({ van = null, naar = null, route = [], maxTijd = null } = {}) {
  if (!naar || !Number.isFinite(naar.x) || !Number.isFinite(naar.y)) throw new Error('een vlucht heeft een bestemming nodig');
  const halten = route.map((p, k) => ({
    x: p.x, y: p.y, z: p.z != null ? p.z : null, zMarge: p.zMarge != null ? p.zMarge : VLUCHT.hoogteMarge,
    naam: p.naam || `Poort ${k + 1}`, stopR: p.stopR != null ? p.stopR : VLUCHT.poortR,
    stopV: p.stopV != null ? p.stopV : VLUCHT.poortV, wacht: 0,
  }));
  // Het veld telt pas als je er echt staat: stil en binnen veldR, hoe snel je er ook aan kwam.
  halten.push({ x: naar.x, y: naar.y, naam: naar.naam || 'Bestemming', stopR: naar.stopR != null ? naar.stopR : VLUCHT.veldR, stopV: Infinity, stil: true, wacht: 0 });
  const d = maakDienst({ vervoer: 'vliegtuig', naam: `${(van && van.naam) || 'Vertrek'} – ${naar.naam || 'Bestemming'}`, halten, maxTijd });
  d.landing = null;
  d.checklist = null;
  d.checklistOk = false;
  return d;
}

// Eén beeld van de dienst bij de staat van het vliegtuig (p uit makePlane/stepPlane).
export function vluchtStap(d, p, { dt = 0 } = {}) {
  if (d.klaar || d.mislukt || !p) return [];
  const ev = [];
  if (p.crashed) {
    d.mislukt = 'crash';
    ev.push({ soort: 'mislukt', reden: 'crash' });
    return ev;
  }
  // De checklist wordt één keer beoordeeld, op het moment dat de kist van de baan komt.
  if (!p.onGround && !d.checklist) {
    d.checklist = checklist(p);
    d.checklistOk = d.checklist.every((i) => i.ok);
  }
  const h = d.halten[d.i];
  const inBand = !h || h.z == null || Math.abs((p.z || 0) - h.z) <= (h.zMarge != null ? h.zMarge : VLUCHT.hoogteMarge);
  for (const e of stapDienst(d, { x: p.x, y: p.y, v: p.speed || 0, dt, stil: !!p.onGround, stop: inBand })) {
    if (e.soort === 'halte' && e.laatste) {
      d.landing = p.landing || 'hard';
      d.bonus = (d.landing === 'zacht' ? VLUCHT.landBonus : 0) + (d.checklistOk ? VLUCHT.checklistBonus : 0);
    }
    if (e.soort === 'klaar') e.uitslag = vluchtUitslag(d);
    ev.push(e);
  }
  return ev;
}

// De uitslag met de landing en de checklist erbij (de rest komt uit simdienst.js).
export function vluchtUitslag(d) {
  return { ...dienstUitslag(d), landing: d.landing || null, checklist: d.checklist || null };
}

export const vluchtVoortgang = dienstVoortgang;
export const vluchtStand = dienstStand;
