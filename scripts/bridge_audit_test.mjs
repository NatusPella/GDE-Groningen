// De brugaudit (#235): synthetische gevallen voor elke bevinding, de
// ontdubbeling van bruggen, en de stadskaart als plafond.
//   node scripts/bridge_audit_test.mjs
import fs from 'node:fs';
import { auditBridges } from './world/bridge_audit.mjs';
import { dropDuplicateBridges } from './world/bridgededupe.mjs';

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
const road = (pts, o = {}) => ({ pts, type: 'secondary', cat: 'major', width: 8, bridge: true, layer: 1, ...o });

// een sprong in dekhoogte bij een knoop en een te steile helling
{
  const a = road([[0, 0], [20, 0]], { z: [0, 5] });
  const b = road([[20, 0], [60, 0]], { bridge: false, z: [4, 4] });
  const r = auditBridges({ roads: [a, b], water: [] });
  ok(r.findings.step.length === 1 && Math.abs(r.findings.step[0].dz - 1) < 1e-9, 'sprong van 1 m bij de knoop', JSON.stringify(r.findings.step.map((f) => f.dz)));
  ok(r.findings.steep.length === 1, 'helling van 25 % is te steil', String(r.findings.steep.length));
  const c = road([[0, 0], [20, 0]], { z: [0, 0.4] });
  ok(auditBridges({ roads: [c], water: [] }).findings.steep.length === 0, 'helling van 2 % mag');
}
// een brug waarvan het einde in het water loopt, en een die netjes aansluit
{
  const water = [{ pts: [[-40, -20], [-1, -20], [-1, 20], [-40, 20]] }];
  const a = road([[0, 0], [30, 0]], { z: undefined });
  ok(auditBridges({ roads: [a], water }).findings.wetEnd.length === 1, 'einde in water gevlagd');
  const land = road([[-10, 0], [0, 0]], { bridge: false });
  ok(auditBridges({ roads: [a, land], water }).findings.wetEnd.length === 0, 'aansluitende weg: geen gat');
}
// dubbele bruggen en een dek over een straat op gelijke hoogte
{
  const a = road([[0, 0], [30, 0]], { name: 'Waardbrug' });
  const b = road([[0, 0.5], [30, 0.5]], { name: 'Waardbrug', width: 6 });
  const r = auditBridges({ roads: [a, b], water: [] });
  ok(r.findings.duplicate.length === 1 && r.findings.duplicate[0].sameHeight, 'dubbele brug gevlagd');
  const d1 = road([[0, 0], [30, 0]]);
  const d2 = road([[0, 6], [30, 6]]);
  ok(auditBridges({ roads: [d1, d2], water: [] }).findings.duplicate.length === 0, 'dubbele rijbaan op 6 m is geen duplicaat');
  const dek = road([[0, 0], [40, 0]]);
  const straat = road([[20, -30], [20, 30]], { bridge: false, layer: 0 });
  ok(auditBridges({ roads: [dek, straat], water: [] }).findings.zfight.length === 1, 'plat dek over een straat: z-fight-kandidaat');
  const hoog = road([[0, 0], [40, 0]], { z: [5, 5] });
  ok(auditBridges({ roads: [hoog, straat], water: [] }).findings.zfight.length === 0, 'dek 5 m hoger: geen z-fight');
}
// ontdubbelen
{
  const mk = (row) => ({ kind: 'roads', row });
  const feats = [
    mk(road([[0, 0], [30, 0]], { name: 'Waardbrug', width: 6, cat: 'normal', osm: 1 })),
    mk(road([[0, 0.3], [30, 0.3]], { name: 'Waardbrug', width: 6, cat: 'normal', osm: 2, movable: 'bascule' })),
    mk(road([[0, 0], [30, 0]], { name: 'Pad', width: 1.8, cat: 'foot', osm: 3 })),
    mk(road([[0, 10], [30, 10]], { name: 'Tweede rijbaan', width: 6, cat: 'normal', osm: 4 })),
    { kind: 'buildings', row: { pts: [] } },
  ];
  const out = dropDuplicateBridges(feats);
  const osm = out.filter((f) => f.kind === 'roads').map((f) => f.row.osm).sort();
  ok(JSON.stringify(osm) === '[1,4]', 'van drie op elkaar blijft één dek, de rijbaan op 10 m blijft', JSON.stringify(osm));
  ok(out.find((f) => f.row.osm === 1).row.movable === 'bascule', 'de beweegbare vlag verhuist naar het dek dat blijft');
  ok(out.some((f) => f.kind === 'buildings'), 'andere kenmerken blijven staan');
  ok(dropDuplicateBridges([mk(road([[0, 0], [30, 0]], { osm: 5 })), mk(road([[15, -15], [15, 15]], { osm: 6 }))]).length === 2, 'kruisende bruggen zijn geen duplicaat');
}
// de stadskaart: geen sprongen, geen te steile bruggen, hooguit het ene bekende paar
{
  const { loadCityData } = await import('./lib/loadworld.mjs');
  const data = await loadCityData({ extras: false });
  const r = auditBridges(data);
  ok(r.bridges.length > 300, 'de stad heeft bruggen', String(r.bridges.length));
  ok(r.findings.step.length === 0, 'stad: geen hoogtesprong bij een brug', String(r.findings.step.length));
  ok(r.findings.steep.length === 0, 'stad: geen te steile brug', String(r.findings.steep.length));
  ok(r.findings.duplicate.length <= 1, 'stad: hooguit één dubbele brug', String(r.findings.duplicate.length));
  ok(r.findings.zfight.length <= 8, 'stad: z-fight-kandidaten onder het plafond', String(r.findings.zfight.length));
}
console.log(`${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
