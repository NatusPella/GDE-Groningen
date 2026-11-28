// Pure rules for "does this count as a crime" after a melee swing (#1356). A swing only counts as an offence when it
// lands: combat.js stamps the person it hit (markPlayerHit), pedestrians.js asks classifyPlayerHit. An empty swing, one against a
// wall, or a pedestrian who gets hurt by something else a moment later (a car, a road-rager) leaves no stamp and gives no stars.

export const HIT_WINDOW = 0.8; // s between the landed blow and the moment the health drop is seen

// dader: the seat of the one who swung; 0 is the player who opened the game. A guest's blow (Samen spelen) is his own offence
// (coopgezocht.js), so it leaves no stamp for the host.
export function markPlayerHit(ped, now, dader = 0) {
  if (!ped || (dader | 0) > 0 || !Number.isFinite(now)) return;
  ped._playerHitAt = now;
}

// null: not the player's hit, nothing to report. { kind: 'cop' }: a police officer was hit. { kind: 'ped', crime }: a person was hit;
// crime is false for a road-rager (self-defence).
export function classifyPlayerHit(ped, now) {
  if (!ped || ped._playerHitAt === undefined || !(now - ped._playerHitAt < HIT_WINDOW) || now < ped._playerHitAt) return null;
  if (ped.isCop) return { kind: 'cop' };
  return { kind: 'ped', crime: !ped.rager };
}

// Fists and weapons do not wreck the car you own (a wreck by the player is a crime with witnesses, boom event).
export const meleeSparesVehicle = (v) => !!v && (!!v.playerOwned || !!v.isHeroCar);
