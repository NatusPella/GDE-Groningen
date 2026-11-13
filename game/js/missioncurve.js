// #829: de moeilijkheidscurve van het verhaal, zonder de missiedefinities zelf te
// laden. Een missie met `only: 'sluip' | 'vermomd'` speelt maar één tak; de
// audit telde die takken vroeger allemaal op en maakte M06 daardoor te zwaar.
export const SCENERY = new Set(['scene', 'plan', 'shot', 'choice']);
export const CHALLENGE = new Set(['hold', 'timing', 'chase', 'boatchase', 'escape', 'laser', 'crack', 'lock', 'fuse', 'bake', 'vault', 'pickpocket', 'heli']);

export function stageCounts(def) {
  const stages = (def && def.stages) || [];
  const common = stages.filter((s) => !s.only);
  const byBranch = new Map();
  for (const s of stages) {
    if (!s.only) continue;
    if (!byBranch.has(s.only)) byBranch.set(s.only, []);
    byBranch.get(s.only).push(s);
  }
  // De speler kiest één tak; de zwaarste tak is de realistische bovengrens.
  const branch = [...byBranch.values()].sort((a, b) => b.length - a.length)[0] || [];
  const all = common.concat(branch);
  return {
    playable: all.filter((s) => !SCENERY.has(s.kind)).length,
    challenge: all.filter((s) => CHALLENGE.has(s.kind)).length,
    timed: all.filter((s) => s.limit || s.time).length,
    branch: branch.length ? branch[0].only : null,
  };
}

export function curveRows(defs) {
  return (defs || []).filter(Boolean).map((d) => ({ label: d.label || '', ...stageCounts(d) }));
}

// Ontwerpregel: een lange missie (>=8 speelbare stappen) mag niet direct door
// een heel korte (<=4) worden gevolgd zonder rustpunt. Een checkpoint, scene,
// board of hold in de korte missie geldt als rustpunt.
export function longThenShort(prev, next) {
  if (!prev || !next || prev.playable < 8 || next.playable > 4) return false;
  const stages = (next.def && next.def.stages) || next.stages || [];
  return !stages.some((s) => s.checkpoint === true || ['scene', 'board', 'hold'].includes(s.kind));
}
