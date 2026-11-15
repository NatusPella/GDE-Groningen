// Which Tammo/Tessa pair a mission gets when it starts out of order (#935).
// Pure: the table itself lives in missionstory.js (the TTS list reads it there),
// this is only the rule around it. The last stage may only say "de laatste klus
// voor vandaag" when that mission really closes the day; otherwise the player
// hears that line again at every early mission.
//
//   resolveDuo(table, stage, kind, { earlyLast, dayFinale })
export function resolveDuo(table, stage, kind, { earlyLast = null, dayFinale = false } = {}) {
  if (!Array.isArray(table) || !table.length) return [];
  const i = Math.max(0, Math.min(table.length - 1, stage));
  if (i === table.length - 1 && !dayFinale && earlyLast && earlyLast[kind]) return earlyLast[kind];
  return table[i][kind] || [];
}
