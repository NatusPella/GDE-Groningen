// De indelingsregel van scripts/clearance_audit.mjs (#494): ligt dit punt van een
// viaductdek boven de rijbaan van een laan, of alleen boven de stoep of berm
// ernaast? elevation.surfaceHalfWidth telt bij een straat 1,8 m stoep bij de
// halve breedte op, waardoor een smal voetbrugdek naast een weg boven de weg
// leek te liggen. We nemen het smalste van de oude regel (het dek boven de as van
// de laan) en het verharde deel (width / 2), zodat een doorgang die smaller is
// dan de laan alleen boven het verharde deel telt.
export function laneUnderDeck(x, y, lane, deckHalf) {
  const dx = lane.bx - lane.ax, dy = lane.by - lane.ay;
  const l2 = dx * dx + dy * dy || 1;
  const u = Math.max(0, Math.min(1, ((x - lane.ax) * dx + (y - lane.ay) * dy) / l2));
  const d = Math.hypot(x - (lane.ax + dx * u), y - (lane.ay + dy * u));
  const paved = Number.isFinite(lane.r && lane.r.width) ? lane.r.width / 2 : lane.hs;
  return d <= Math.min(paved, Math.max(lane.hs - deckHalf, 0.5));
}
