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

// #804 (ronde 21-11): na die 12 frames bouwde de hoofdthread één heavy weg per frame, zonder tijdsbegrenzing: een
// hitchreeks van honderden ms achter elkaar (de AI-review van 0.64.0). De bouw zelf is niet in stukken te knippen
// (buildRoadGroup is één blok), dus de ruimte ertussen wordt begrensd: na een heavy bouw van `cost` ms komt de
// volgende pas na max(HEAVY_ROAD_GAP_MS, HEAVY_ROAD_COOL x cost) ms. Zo kost de heavy bouw hooguit 1/(1+COOL) van de tijd
// (een hitch met rust ertussen, in plaats van een reeks), en blijft #883 (de wegen komen er wel) gelden: er wacht niets voor altijd.
export const HEAVY_ROAD_GAP_MS = 250;
export const HEAVY_ROAD_COOL = 4;

export function createHeavyRoadGate() {
  let waited = 0, lastEnd = -Infinity, lastCost = 0;
  return {
    // mag er nu een heavy weg gebouwd worden? (built: wegen die dit frame al klaar zijn; now: performance.now())
    allowed(built, streamPending, now) {
      if (now - lastEnd < Math.max(HEAVY_ROAD_GAP_MS, HEAVY_ROAD_COOL * lastCost)) return false;
      return heavyRoadAllowed(built, streamPending, waited);
    },
    built(now, cost) { lastEnd = now; lastCost = cost; },
    // aan het eind van de wegsync: wachtte een heavy weg dit frame (vooruitgeschoven) of niet
    endFrame(deferred) { waited = deferred ? waited + 1 : 0; },
    get waited() { return waited; },
  };
}
