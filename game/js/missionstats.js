// #497: de cijferregels van een missie zijn pure opmaak. De missieketen levert
// de momentopname (run, kills, rondvaart/stunt/schade) via een host-naad; dit
// bestand kent geen world, geen DOM en geen THREE.
export function fmtTime(s) {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// ctx: { run, kills, rondvaart, stunt, fatbikeHits, cargoLeft }
// #814: een mislukte missie kost geen geld of voortgang. De faalbanner noemt
// dat één keer; stats is dezelfde [[label, waarde], ...] als missionStats.
export const FAIL_LOSS_LINE = ['Verlies', 'geen — je geld en voortgang blijven van jou.'];

export function failureStats(stats) {
  const rows = Array.isArray(stats) ? stats : [];
  return rows.some(([label]) => label === FAIL_LOSS_LINE[0]) ? rows : [...rows, FAIL_LOSS_LINE];
}

export function missionStats(def, ctx = {}) {
  const r = ctx.run;
  if (!r) return [];
  const stats = [['Tijd', fmtTime(r.elapsed)]];
  const kills = (ctx.kills || 0) - (r.kills || 0);
  if (kills > 0 && def.type !== 'stunt') stats.push(['Kills', String(Math.max(0, kills))]);
  const rv = ctx.rondvaart || null;
  if (rv) stats.push(['Toeristen', `${rv.joy}%`], ['Verhalen verteld', `${rv.told}/${rv.stops}`], ['Botsingen', String(rv.bumps)]);
  if (r.vehicleUsed && !rv) stats.push([def.fragile ? def.fragile.label : 'Schade voertuig', def.fragile ? `${Math.round(ctx.cargoLeft || 0)}%` : `${Math.round(r.vehDamage)}%`]);
  if (def.type === 'fatbike') stats.push(['Geschept', String(ctx.fatbikeHits || 0)]);
  const su = ctx.stunt || null;
  if (su) stats.push(['Punten', String(su.score)], ['Omver', String(su.broken)]);
  if (r.hurt > 0.5 || (!rv && !r.vehicleUsed)) stats.push(['Verwondingen', `${Math.round(r.hurt)}%`]);
  if (r.racePos) stats.push(['Positie', `${r.racePos}/${r.raceTotal}`]);
  return stats;
}
