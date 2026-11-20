// #964: auto's en boten die door een cutscene heen rijden. De scène filmt een
// paar meter om zich heen; het gewone verkeer dat daar net langs komt is geen
// decor en rijdt dwars door de opname. Deze regel kiest ze: alleen rijdende
// voertuigen dicht bij de camera, nooit de auto van de speler, de auto's van de
// scène zelf (cineTemp, missie, verhaal) of een geparkeerde auto.
//
// Puur (geen three.js, geen wereld) zodat een test het kan naspelen.
export function vehiclesInShot(vehicles, camera, { radius = 65, playerVehicle = null, minSpeed = 0.6 } = {}) {
  if (!vehicles || !camera || !Number.isFinite(camera.x) || !Number.isFinite(camera.y)) return [];
  const out = [];
  for (const v of vehicles) {
    if (!v || v === playerVehicle || v.wrecked || v.sinking) continue;
    if (v.cineTemp || v.missionCar || v.isHeroCar || v.playerOwned || v.ghost) continue;
    if (Math.abs((v.z || 0) - (camera.z || 0)) > 22) continue; // a viaduct below, or a shot from high above
    if (Math.abs(v.speed || 0) < minSpeed) continue; // a parked car is decor, not a passer-by
    if (Math.hypot((v.x || 0) - camera.x, (v.y || 0) - camera.y) > radius) continue;
    out.push(v);
  }
  return out;
}

// Mark the ones in the shot for the scene and clear the flag again once they
// have left it. `hidden` is the set kept between frames by the caller.
export function markVehiclesInShot(vehicles, camera, hidden, opts = {}) {
  const want = vehiclesInShot(vehicles, camera, opts);
  for (const v of hidden) if (!want.includes(v)) { v.hideInScene = false; hidden.delete(v); }
  for (const v of want) { v.hideInScene = true; hidden.add(v); }
  return want;
}

export function clearVehicleHiding(hidden) {
  for (const v of hidden) v.hideInScene = false;
  hidden.clear();
}

// #955 (M09): een scène die zelf een voertuig als prop neerzet (het trekkerprop van Geesje) en
// daarnaast het echte, stilstaande missievoertuig van dezelfde soort heeft, geeft twee trekkers in
// beeld. Deze regel kiest dat echte voertuig, dat tijdens de scène niet getekend wordt: een
// missievoertuig zonder bestuurder met dezelfde modelnaam dicht bij het ankerpunt.
export function duplicateOfProps(vehicles, anchor, propModelNames, { radius = 30 } = {}) {
  if (!vehicles || !anchor || !propModelNames || !propModelNames.length) return [];
  return vehicles.filter((v) => v && v.missionCar && !v.driver && !v.wrecked && !v.sinking
    && v.model && propModelNames.includes(v.model.name)
    && Math.hypot((v.x || 0) - anchor.x, (v.y || 0) - anchor.y) <= radius);
}
