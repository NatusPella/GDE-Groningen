// Samen spelen (#434): wie in een voertuig zit is voor iedereen te zien, op zijn stoel (host, Tessa en gasten), niet "door de auto heen"
// of onzichtbaar. Elke zitter is een echt persoonsmodel (zoals coopfigures3d.js) dat in het voertuigmodel hangt, met dezelfde stoelen
// en houdingen als het spel zelf (seating3d.js vehicleSeatAt en placeSeatedLocal: de bank achterin binnen de carrosserie, de echte
// stoelen van een boot en de passagiersruimte van de bus). Op een fiets zit de bestuurder met de trapbeweging van de fiets mee
// (models3d_vehicles.js updateVehicleWheelSpin laat het kruk draaien, de voeten volgen via de IK van het model).
// De gegevens komen van coopclient.js (gast: world.coopZitters uit het snapshot) en coopnet.js (host: de extra spelers in zijn voertuig).
// Alleen three.js en bestaande bouwers. Stoelen: 0 bestuurder, 1 bijrijder voorin, 2 en hoger de passagiers.
import { buildPersonMesh } from './models3d_people.js';
import { vehicleSeatAt, placeSeatedLocal } from './seating3d.js';
import { riderSeatFor } from './models3d_vehicles.js';
import { figuurLook } from './coopplayers.js';
import { ruimMeshOp } from './coopruim.js';
import { heeftAutoPortier } from './sfx/samples.js';

const zitters = new Map(); // plek -> { mesh, char, ouder, sleutel, seat, trap, beweegt, verborgen }
const deurGezien = new Map(); // plek -> { voertuig, x, y, auto }: wie we zagen instappen, voor het portiergeluid van een medespeler (#460)
let deurStart = null;

// De stoel van deze zitter in het voertuig: de bestaande indeling van het spel (seating3d.js vehicleSeatAt):
// de bestuurder, de bijrijder, de bank achterin binnen de carrosserie, de echte stoelen van een boot (met de
// houding die erbij hoort) en de passagiersruimte van de stadsbus (businterieur.js, #434).
export const stoelVoor = (v, stoel) => vehicleSeatAt(v, stoel);

// Beweegt deze plek? Dan moet de zitter elk beeld opnieuw in de houding staan: een roeier, een peddelaar,
// iemand op een SUP en wie op de waterfiets trapt (#434).
function levendig(s) {
  if (!s || !s.pose) return false;
  return s.pose.arms === 'row' || s.pose.arms === 'paddle' || s.pose.arms === 'sup' || !!s.pose.pedal;
}

// Een bestuurder op een fiets, scooter of motor: zoals scene3d.js syncPlayerRider (de bouten en armen vast, de benen volgen de trappers).
// Geeft de hoek van de dij waar de trappers op draaien (de fietsen; null bij een scooter of motor, die trapt niet).
function fietsHouding(p, v) {
  const ud = p.userData, seat = v.isScooter ? riderSeatFor(v.model) : null;
  if (seat) {
    p.position.set(seat.x, seat.y - 0.93 * p.scale.y, 0); p.rotation.set(0, 0, seat.lean);
    ud.armL.rotation.set(0, 0, seat.arm); ud.armR.rotation.set(0, 0, seat.arm);
    ud.legL.rotation.set(0, 0, seat.leg); ud.legR.rotation.set(0, 0, seat.leg);
    return null;
  }
  if (v.isScooter) {
    p.position.set(-0.08, 0.155, 0); p.rotation.set(0, 0, -0.03);
    ud.armL.rotation.set(0, 0, 0.66); ud.armR.rotation.set(0, 0, 0.66);
    ud.legL.rotation.set(0, 0, 0.12); ud.legR.rotation.set(0, 0, -0.1);
    return null;
  }
  const fat = !!(v.model && v.model.fat);
  p.position.set(fat ? -0.26 : -0.3, (fat ? 0.93 : 1.02) - 0.93 * p.scale.y, 0); p.rotation.set(0, 0, -0.08);
  const arm = fat ? 0.95 : 0.85;
  ud.armL.rotation.set(0, 0, arm); ud.armR.rotation.set(0, 0, arm);
  ud.legL.rotation.z = fat ? 0.55 : 0.33; ud.legR.rotation.z = fat ? 0.55 : 0.33; // de benen aanraken: de trapper-IK van het model zet de voeten op de trappers
  return fat ? 0.55 : 0.33;
}

// De kruk draait (models3d_vehicles.js updateVehicleWheelSpin zet de krukstand en de zwaai van dit beeld: pedalSwing) en deze
// bestuurder trapt mee. De fietser van het model zelf staat verborgen (syncZitters), dus de trapbeweging moet op deze benen lopen;
// het aanraken van de dij laat de trapper-IK van het model de voeten op de trappers zetten (#434).
function trapMee(p, mesh, base) {
  const sw = mesh.userData.pedalSwing || 0, ud = p.userData;
  ud.legL.rotation.z = base + sw;
  ud.legR.rotation.z = base - sw;
}

function plaats(p, v, stoel, t = 0, seat = null) {
  const fiets = v.isBike || v.isScooter;
  if (fiets && stoel === 0 && v._mount !== 'horse') return fietsHouding(p, v);
  placeSeatedLocal(p, seat || stoelVoor(v, stoel), t);
  return null;
}

function bouwFiguur(char) {
  const look = figuurLook(char) || figuurLook('tammo');
  const m = buildPersonMesh(look.shirt, look.skin, look.opts);
  m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return m;
}
function haal(e) {
  if (e.mesh.parent) e.mesh.parent.remove(e.mesh);
  if (e.verborgen) e.verborgen.visible = true;
  ruimMeshOp(null, e.mesh);
}

// Het portiergeluid van een medespeler (#460): bij het instappen en uitstappen komt er een audio-event (audio.js speelt het met
// afstandsdemping, zoals een NPC). Elke client ziet elke zitter via deze ene functie (gastheer: coopfigures3d, gast: coopentities3d), dus
// geen dubbele geluiden; de eerste seconde na het starten is stil, zodat wie al zat niet allemaal tegelijk instapt.
export function deurGeluiden(world, lijst, zoek) {
  if (!world) return;
  const nu = world.time || 0;
  if (deurStart === null || nu < deurStart - 5) deurStart = nu;
  const stil = nu - deurStart < 1, q = world.audioEvents || (world.audioEvents = []);
  const nuZit = new Set();
  for (const z of lijst || []) {
    const r = zoek(z.voertuig);
    if (!r || !r.v) continue;
    nuZit.add(z.slot);
    const eerder = deurGezien.get(z.slot);
    const auto = heeftAutoPortier(r.v);
    if ((!eerder || eerder.voertuig !== z.voertuig) && !stil && auto && q.length < 64) q.push({ kind: 'door_open', x: r.v.x, y: r.v.y, auto: true });
    deurGezien.set(z.slot, { voertuig: z.voertuig, x: r.v.x, y: r.v.y, auto });
  }
  for (const [slot, e] of deurGezien) {
    if (nuZit.has(slot)) continue;
    deurGezien.delete(slot);
    if (!stil && e.auto && q.length < 64) q.push({ kind: 'door_close', x: e.x, y: e.y, auto: true });
  }
}

// Elke frame: lijst = [{ slot, char, voertuig, stoel }]; zoek(voertuig) geeft { mesh, v } (het voertuigmodel en zijn gegevens) of null.
// Geeft het aantal zitters dat nu in een voertuig zit (voor de testbank). world (optioneel): voor het portiergeluid van een medespeler.
export function syncZitters(lijst, zoek, world = null) {
  deurGeluiden(world, lijst, zoek);
  const nu = world && Number.isFinite(world.time) ? world.time : performance.now() / 1000; // voor de bewegende houdingen (roeien, peddelen)
  const gezien = new Set();
  for (const z of lijst || []) {
    const r = zoek(z.voertuig);
    if (!r || !r.mesh || !r.v || r.mesh.userData.blok) continue;
    gezien.add(z.slot);
    let e = zitters.get(z.slot);
    const ouder = r.mesh.userData.body || r.mesh;
    if (e && (e.char !== z.char || e.ouder !== ouder)) { haal(e); zitters.delete(z.slot); e = null; }
    if (!e) {
      e = { mesh: bouwFiguur(z.char), char: z.char, ouder, verborgen: null, sleutel: '' };
      ouder.add(e.mesh); zitters.set(z.slot, e);
    }
    const m = r.v.model || {};
    const sleutel = z.stoel + '|' + (m.name || '') + '|' + (m.len || 0) + '|' + (m.kind || '');
    e.stoel = z.stoel | 0;
    // een roeier of peddelaar moet elk beeld opnieuw in de houding (de armen en benen bewegen mee, #434)
    if (e.sleutel !== sleutel) {
      e.sleutel = sleutel;
      try { e.seat = stoelVoor(r.v, z.stoel); e.trap = plaats(e.mesh, r.v, z.stoel, nu, e.seat); e.beweegt = levendig(e.seat); } catch (er) { e.trap = null; e.beweegt = false; /* een stoel die niet past: de zitter staat in het midden */ }
    } else if (e.beweegt) {
      try { plaats(e.mesh, r.v, z.stoel, nu, e.seat); } catch (er) { e.beweegt = false; /* houding mislukt: laat hem zo */ }
    }
    e.mesh.visible = true;
    if (e.trap != null) trapMee(e.mesh, r.mesh, e.trap); // de bestuurder van een fiets trapt mee met de kruk (#434)
    // de ingebouwde bestuurder van een fiets (een voorbijganger) maakt plaats voor de speler
    if ((r.v.isBike || r.v.isScooter) && z.stoel === 0) {
      const ud = r.mesh.userData, fig = ud.riderFig || r.mesh.children.find((c) => c !== e.mesh && c.userData && c.userData.legL);
      if (fig && fig !== e.mesh) { fig.visible = false; e.verborgen = fig; }
    }
  }
  for (const [slot, e] of zitters) if (!gezien.has(slot)) { haal(e); zitters.delete(slot); }
  return zitters.size;
}

export const aantalZitters = () => zitters.size;

// Waar elke zitter zit (in het voertuig zelf): [plek, stoel, x, y, z]. Voor de testbank, om te controleren dat
// niemand door de carrosserie steekt (#434).
export function zitterPlekken() {
  return [...zitters].map(([slot, e]) => [slot, e.stoel | 0, +e.mesh.position.x.toFixed(2), +e.mesh.position.y.toFixed(2), +e.mesh.position.z.toFixed(2)]);
}
export function clearZitters() { for (const e of zitters.values()) haal(e); zitters.clear(); deurGezien.clear(); deurStart = null; }
