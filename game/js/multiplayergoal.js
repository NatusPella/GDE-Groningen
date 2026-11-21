// Samen spelen (#1159): een navigatiedoel (waypoint) delen. Je doel blijft van jezelf (navtarget, goal.js); met "Deel mijn
// doel" stuur je het als voorstel naar een ander, en die kiest zelf: J = volgen, N = negeren. In een voertuig zijn er twee
// rollen: wie bestuurt en wie navigeert (de bijrijder). De navigator deelt zijn doel met de bestuurder, de bestuurder deelt
// het met wie meerijdt; wie niet in een voertuig zit deelt met iedereen. Een ping op je doel gaat via coopnet.js sendPing
// (zelfde berichten en kleuren als de roepjes). Pure logica, geen DOM en geen netwerk (scripts/multiplayergoal_test.mjs).

import { WORLD_LIMIT } from './partnerhud.js';
import { hoofdspeler } from './players.js';

export const GOAL_TTL = 20;      // s dat een voorstel openstaat
export const GOAL_COOLDOWN = 5;  // s tussen twee voorstellen van dezelfde speler
export const GOAL_KIND = 'doel';

export const goalEvent = (x, y, aan = 'voertuig') => ({ k: GOAL_KIND, x, y, aan: aan === 'iedereen' ? 'iedereen' : 'voertuig' });

// Een binnenkomend bericht: eindige coördinaten binnen de wereld, anders niets.
export function readGoal(body) {
  if (!body || body.k !== GOAL_KIND) return null;
  const { x, y } = body;
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > WORLD_LIMIT || Math.abs(y) > WORLD_LIMIT) return null;
  return { x, y, aan: body.aan === 'iedereen' ? 'iedereen' : 'voertuig' };
}

// ---- wie zit waar? bezetting: [{ slot, voertuig (een voorwerp of id, null te voet), bestuurder (bool) }]
export function roleInVehicle(slot, bezetting) {
  const ik = (bezetting || []).find((b) => b && b.slot === slot);
  if (!ik || ik.voertuig == null) return null;
  return ik.bestuurder ? 'bestuurder' : 'navigator';
}
export const ROLE_WORD = { bestuurder: 'bestuurder', navigator: 'navigator' };

// Naar wie gaat een gedeeld doel? Geeft de plekken (zonder de afzender zelf).
//  - aan 'voertuig': alleen in een voertuig. Een navigator deelt met de bestuurder (niet met de hele bus), een bestuurder
//    met wie meerijdt. Zit de afzender niet in een voertuig, dan is er niemand: de keuze 'iedereen' staat apart.
//  - aan 'iedereen': alle andere spelers.
export function recipients(van, aan, bezetting, alle = []) {
  const entries = (bezetting || []).filter((b) => b && Number.isInteger(b.slot));
  if (aan === 'iedereen') {
    const slots = new Set([...entries.map((b) => b.slot), ...(alle || []).filter(Number.isInteger)]);
    slots.delete(van);
    return [...slots].sort((a, b) => a - b);
  }
  const ik = entries.find((b) => b.slot === van);
  if (!ik || ik.voertuig == null) return [];
  const mee = entries.filter((b) => b.slot !== van && b.voertuig === ik.voertuig);
  return (ik.bestuurder ? mee : mee.filter((b) => b.bestuurder)).map((b) => b.slot).sort((a, b) => a - b);
}
// De standaardkeuze van de knop: in een voertuig met anderen deel je daar, anders met iedereen.
export function defaultReach(van, bezetting) {
  const ik = (bezetting || []).find((b) => b && b.slot === van);
  if (ik && ik.voertuig != null && (bezetting || []).some((b) => b && b.slot !== van && b.voertuig === ik.voertuig)) return 'voertuig';
  return 'iedereen';
}

// ---- het voorstel bij de ontvanger: één tegelijk (het nieuwste wint), twintig seconden, J of N
export function createGoalState() { return { voorstel: null, laatste: {} }; }
export const goalLine = (naam, rol) => `${naam || 'Een speler'}${rol ? ` (${ROLE_WORD[rol] || rol})` : ''} deelt een doel: J = volgen, N = negeren.`;

// afz: { slot, naam }; rol: wat de afzender in het voertuig is (of null); mag: gedempt of geblokkeerd is false.
export function receiveGoal(staat, body, afz, nu, { mag = true, aan = true, rol = null } = {}) {
  const d = readGoal(body);
  if (!d) return { toon: false, reden: 'onbekend' };
  if (!aan) return { toon: false, reden: 'uit' };
  if (!mag) return { toon: false, reden: 'geblokkeerd' };
  const k = String(afz && afz.slot);
  if (nu - (staat.laatste[k] ?? -1e9) < GOAL_COOLDOWN) return { toon: false, reden: 'te-snel' };
  staat.laatste[k] = nu;
  staat.voorstel = { x: d.x, y: d.y, slot: afz && afz.slot, naam: (afz && afz.naam) || '', rol, tot: nu + GOAL_TTL };
  return { toon: true, regel: goalLine(afz && afz.naam, rol), voorstel: staat.voorstel };
}
export function openGoal(staat, nu) {
  if (!staat || !staat.voorstel) return null;
  if (staat.voorstel.tot <= nu) { staat.voorstel = null; return null; }
  return staat.voorstel;
}
// J of N. Bij J geeft dit het doel terug dat de ontvanger zelf op zijn kaart zet; het voorstel verdwijnt in beide gevallen.
export function answerGoal(staat, volg, nu) {
  const v = openGoal(staat, nu);
  if (!v) return null;
  staat.voorstel = null;
  return volg ? { actie: 'volg', x: v.x, y: v.y, naam: v.naam ? `Doel van ${v.naam}` : 'Gedeeld doel' } : { actie: 'negeer' };
}

// De bezetting uit de wereld (host: eigen lichaam plus de figuren van de gasten). Alleen lezen, tolerant voor ontbrekende velden.
export function occupancyOf(world) {
  const uit = [];
  const host = hoofdspeler(world);
  if (host) uit.push({ slot: 0, voertuig: host.inVehicle || null, bestuurder: !!host.inVehicle && (world.coopWielSlot == null) });
  const figuren = (world && world.coopFigures) || {};
  for (const f of Object.values(figuren)) {
    if (!f || !Number.isInteger(f.slot)) continue;
    uit.push({ slot: f.slot, voertuig: f.inVeh || null, bestuurder: !!f.inVeh && (f.coopBestuurt === true || world.coopWielSlot === f.slot) });
  }
  return uit;
}

// Een host die doorstuurt, begrenst per afzender (één voorstel per GOAL_COOLDOWN); geeft true als dit voorstel mag.
export function goalPace(staat, slot, nu) {
  const k = String(slot);
  if (nu - (staat.laatste[k] ?? -1e9) < GOAL_COOLDOWN) return false;
  staat.laatste[k] = nu;
  return true;
}
