// Een voertuig dat bij een missie of bijbaan hoort is nooit autodiefstal (pedestrians.js, player.js).
// Vlag-regel: de missie zet missionCar (of sideJob, isHeroCar, playerOwned) op wat ze je geeft.
// Vangnet: loopt een vlag toch weg (een wagen die niet gespawnd kon worden, een auto die op de
// afgesproken plek staat), dan is een voertuig bij de missiemarker tijdens een actieve missie ook
// geen diefstal, mits er geen voorbijganger in zit of net uit stapte (dan blijft het een carjack).

// m van de missiemarker (de auto of de plek waar de missie je heen stuurt) waarbinnen instappen hoort bij de missie
export const MISSIE_VOERTUIG_M = 6;

export function heeftVoertuigVlag(v) {
  return !!(v && (v.isHeroCar || v.playerOwned || v.missionCar || v.sideJob || v.storyCar || v.cineTemp));
}

export function isMissieVoertuig(world, v, hadDriver = false) {
  if (!v) return false;
  if (heeftVoertuigVlag(v)) return true;
  if (hadDriver) return false;
  const m = world && world.mission;
  if (!m || m.phase !== 'active' || !m.marker) return false;
  if (!Number.isFinite(m.marker.x) || !Number.isFinite(m.marker.y)) return false;
  return Math.hypot(v.x - m.marker.x, v.y - m.marker.y) <= MISSIE_VOERTUIG_M + (v.halfLen || 0);
}
