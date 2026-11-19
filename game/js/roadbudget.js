// #804: de roadlus respecteerde de budgetdeadline alleen voor de eerste weg en
// bouwde daarna alle "goedkope" wegen in één frame door (hitchpieken van 0,9-1,7 s
// in 3d:roads). Deze pure regel begrenst het aantal wegen per frame en stopt na de
// deadline, met de eerste weg altijd toegestaan zodat de streaming vooruit blijft.
export const ROAD_BUILD_MAX_PER_FRAME = 4;

export function roadBuildAllowed(built, now, deadline, cap = ROAD_BUILD_MAX_PER_FRAME) {
  if (built >= cap) return false;
  if (built === 0) return true;
  return now <= deadline;
}

// #883: een heavy weg (de hoofdthread bouwt hem zelf) wachtte tot er hoogstens twee wegen te streamen
// waren, maar telde zichzelf mee: in een dorp waar alle wegen heavy zijn (provinciewereld) bleven er
// tientallen over en bouwde er nooit een, zodat de wegen bij de speler ontbraken. Nu wacht hij
// hoogstens HEAVY_ROAD_WAIT_FRAMES frames en bouwt daarna één per frame (de dichtstbijzijnde eerst).
export const HEAVY_ROAD_WAIT_FRAMES = 12;

export function heavyRoadAllowed(built, streamPending, waitedFrames) {
  if (built > 0) return false;
  return streamPending <= 2 || waitedFrames >= HEAVY_ROAD_WAIT_FRAMES;
}
