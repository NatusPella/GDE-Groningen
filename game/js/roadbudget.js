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
