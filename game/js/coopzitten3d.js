// Samen spelen (#434): wie in een voertuig zit is voor iedereen te zien, op zijn stoel (host, Tessa en gasten), niet "door de auto heen"
// of onzichtbaar. Elke zitter is een echt persoonsmodel (zoals coopfigures3d.js) dat in het voertuigmodel hangt, met dezelfde stoelen
// en houdingen als het spel zelf (seating3d.js vehicleSeat, models3d_people.js seatPose). Op een fiets zit de bestuurder met de
// trapbeweging van de fiets mee (models3d_vehicles.js updateVehicleWheelSpin laat het kruk draaien, de voeten volgen via de IK van het model).
// De gegevens komen van coopclient.js (gast: world.coopZitters uit het snapshot) en coopnet.js (host: de extra spelers in zijn voertuig).
// Alleen three.js en bestaande bouwers. Stoelen: 0 bestuurder, 1 bijrijder voorin, 2 en hoger achterin.
import { buildPersonMesh, seatPose, seatedY, standBehindPose } from './models3d_people.js';
import { vehicleSeat } from './seating3d.js';
import { riderSeatFor } from './models3d_vehicles.js';
import { figuurLook } from './coopplayers.js';
import { ruimMeshOp } from './coopruim.js';

const zitters = new Map(); // plek -> { mesh, char, ouder, rijder }

// De stoel van deze zitter in het voertuig: vehicleSeat voor de bestuurder en de bijrijder, achterin verder naar achteren en om en om links en rechts.
export function stoelVoor(v, stoel) {
  if (stoel <= 1) return vehicleSeat(v, stoel === 0);
  const s = vehicleSeat(v, false), rij = Math.floor((stoel - 2) / 2) + 1;
  const stap = v.isBus ? 1.25 : v.isBoat ? 0.8 : 0.85;
  return { ...s, x: s.x - stap * rij, z: (stoel % 2 === 0 ? -1 : 1) * Math.max(0.25, Math.abs(s.z)) };
}

// Een bestuurder op een fiets, scooter of motor: zoals scene3d.js syncPlayerRider (de bouten en armen vast, de benen volgen de trappers).
function fietsHouding(p, v) {
  const ud = p.userData, seat = v.isScooter ? riderSeatFor(v.model) : null;
  if (seat) {
    p.position.set(seat.x, seat.y - 0.93 * p.scale.y, 0); p.rotation.set(0, 0, seat.lean);
    ud.armL.rotation.set(0, 0, seat.arm); ud.armR.rotation.set(0, 0, seat.arm);
    ud.legL.rotation.set(0, 0, seat.leg); ud.legR.rotation.set(0, 0, seat.leg);
  } else if (v.isScooter) {
    p.position.set(-0.08, 0.155, 0); p.rotation.set(0, 0, -0.03);
    ud.armL.rotation.set(0, 0, 0.66); ud.armR.rotation.set(0, 0, 0.66);
    ud.legL.rotation.set(0, 0, 0.12); ud.legR.rotation.set(0, 0, -0.1);
  } else {
    const fat = !!(v.model && v.model.fat);
    p.position.set(fat ? -0.26 : -0.3, (fat ? 0.93 : 1.02) - 0.93 * p.scale.y, 0); p.rotation.set(0, 0, -0.08);
    const arm = fat ? 0.95 : 0.85;
    ud.armL.rotation.set(0, 0, arm); ud.armR.rotation.set(0, 0, arm);
    ud.legL.rotation.z = fat ? 0.55 : 0.33; ud.legR.rotation.z = fat ? 0.55 : 0.33; // de benen aanraken: de trapper-IK van het model zet de voeten op de trappers
  }
}

function plaats(p, v, stoel) {
  const fiets = v.isBike || v.isScooter;
  if (fiets && stoel === 0 && v._mount !== 'horse') { fietsHouding(p, v); return; }
  const s = stoelVoor(v, stoel);
  p.rotation.set(0, s.face || 0, 0);
  if (s.stand && !(s.pose && s.pose.arms === 'sup')) { standBehindPose(p); p.position.set(s.x, s.y, s.z); return; }
  seatPose(p, s.pose);
  p.position.set(s.x, seatedY(p, s.y), s.z);
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

// Elke frame: lijst = [{ slot, char, voertuig, stoel }]; zoek(voertuig) geeft { mesh, v } (het voertuigmodel en zijn gegevens) of null.
// Geeft het aantal zitters dat nu in een voertuig zit (voor de testbank).
export function syncZitters(lijst, zoek) {
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
    const sleutel = z.stoel + '|' + (r.v.model && r.v.model.name);
    if (e.sleutel !== sleutel) { e.sleutel = sleutel; try { plaats(e.mesh, r.v, z.stoel); } catch (er) { /* een stoel die niet past: de zitter staat in het midden */ } }
    e.mesh.visible = true;
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
export function clearZitters() { for (const e of zitters.values()) haal(e); zitters.clear(); }
