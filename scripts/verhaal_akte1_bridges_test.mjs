// Regressie voor #1124 (akte 1 laat het motief zien) en #1125 (overgangsscenes): wat op main staat blijft staan.
//   node scripts/verhaal_akte1_bridges_test.mjs
// De uitgebreide overgangstest is storybridge_test; hier alleen de vorm van de data en de beloften uit de twee issues.
import { readFileSync } from 'node:fs';
import { BRIDGES } from '../game/js/storyarc.js';
import { bridgeSpacingProblems, BRIDGE_VIAS } from '../game/js/storybridge.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const script = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const scene = (id) => script.scenes.find((s) => s.id === id);
const tekst = (id) => (scene(id) ? scene(id).lines.map((l) => l.text).join(' ') : '');

// --- #1125: twaalf overgangsscenes, overslaanbaar, hoogstens één per twee missies.
// Het issue vroeg 2 tot 6 regels; de gebouwde scenes hebben er 8 tot 14 (O1 het meest). Dit is de bovengrens van nu:
// inkorten is een open punt (de opnames hangen eraan), langer worden mag niet.
ok(BRIDGES.length >= 12, 'minstens twaalf overgangsscenes', String(BRIDGES.length));
for (const b of BRIDGES) {
  const sc = scene(b.scene || b.id);
  ok(sc && sc.kind === 'bridge', `${b.id}: staat als bridge in de verhaaldata`);
  ok(sc && sc.lines.length >= 2 && sc.lines.length <= 14, `${b.id}: hoogstens 14 regels (doel uit het issue: 6)`, String(sc && sc.lines.length));
  ok(BRIDGE_VIAS.includes(b.via), `${b.id}: via is car, flat of phone`, b.via);
}
ok(bridgeSpacingProblems().length === 0, 'hoogstens één overgang per twee missies', JSON.stringify(bridgeSpacingProblems()));

// --- #1124: de eerste vijf minuten tonen wie ze zijn en wat ze willen
const keuken = tekst('C00.2');
ok(/Vierentwintig, net afgestudeerd/.test(keuken), 'opening: 24 en net afgestudeerd');
ok(/nul banen/.test(keuken), 'opening: werkloos (nul banen)');
ok(/frietwagen/i.test(keuken) && /snackwagen/i.test(keuken), 'opening: de wagen is het motief');
ok(/Samen/.test(keuken) && /huisgenoten/i.test(keuken), 'opening: samen, als huisgenoten');
ok(/Wij niet/.test(keuken), 'opening: ze blijven bij elkaar');
ok(/jeugdvriend/i.test(script.scenes.flatMap((s) => s.lines.map((l) => l.text)).join(' ')), 'Rikus is Tammo\'s jeugdvriend');
// Jelle laat zich in akte 1 vaker zien dan twee keer
const jelleAkte1 = script.scenes.filter((s) => s.act === 1 && s.lines.some((l) => /Jelle/.test(l.speaker)));
ok(jelleAkte1.length >= 3, 'Jelle spreekt in minstens drie scenes van akte 1', jelleAkte1.map((s) => s.id).join(','));
// de spelregel van de bal in één zin (bewaarder + notaris + datum), vóór het einde van akte 3
ok(/De bewaarder\. Notaris, 28 augustus, drie uur\./.test(tekst('M12.4')), 'M12.4: de spelregel van de bal in één zin');
// Oma wordt genoemd voordat ze in beeld komt (M08.3)
const eerstOma = script.scenes.findIndex((s) => s.lines.some((l) => /Oma/.test(l.text)));
ok(eerstOma >= 0 && eerstOma < script.scenes.findIndex((s) => s.id === 'M08.3'), 'Oma Trijntje wordt vooraf genoemd', String(eerstOma));

console.log(`verhaal_akte1_bridges_test: ${n} controles${fails ? `, ${fails} mislukt` : ' ok'}`);
process.exit(fails ? 1 : 0);
