// The travel beats of the new story arc (#97, 08-IMPLEMENTATION): per step that
// follows a jump (> 6.5 km), where it goes, how far, how you can ride along and
// which script scene carries the trip talk. Lengths are the story documents'
// estimates (00-OVERZICHT 7, AANNAME), not measured on the road: scripts/reisbeats_test.mjs
// checks them against the classes, and a later measurement replaces them.
// No new text: the skip montage shows the first lines of `scene` as subtitles.
//
//   to       place the next step starts
//   from     where the last step ended (documentation)
//   length   metres of road
//   ride     key of RIDES in reiskeuze.js (trein, bus, boot, heli, lift)
//   selfMode car or tractor etc. for driving yourself
//   scene    script.json scene whose lines are the core of the trip talk (optional)
//   act      1..5, for the act budget
export const REISBEATS = {
  T1: { act: 2, from: 'Station Grunn', to: 'Winsum', length: 17000, ride: 'trein', scene: 'T1' },
  M09: { act: 2, from: 'Winsum', to: 'Warffum', length: 12000, ride: 'lift' },
  T2: { act: 2, from: 'Uithuizen', to: 'Zoutkamp', length: 30000, ride: 'bus', scene: 'T2' },
  M13: { act: 3, from: 'Delfzijl', to: 'Eemshaven', length: 30000, ride: 'lift' },
  T3: { act: 3, from: 'Delfzijl', to: 'Winschoten', length: 35000, ride: 'trein', scene: 'T3' },
  M19: { act: 4, from: 'Veendam', to: 'Stadskanaal', length: 20000, ride: 'lift' },
  // Stadskanaal to Bourtange by way of Ter Apel (22 + 12 km): the beat sits on the step that ends at Bourtange
  T4: { act: 4, from: 'Stadskanaal', to: 'Bourtange', length: 34000, ride: 'bus', scene: 'T4.1' },
  M21: { act: 4, from: 'Bourtange', to: 'Zuidhorn', length: 65000, ride: 'lift' },
  M23: { act: 5, from: 'Grote Markt', to: 'Zuidhorn', length: 25000, ride: 'lift', selfMode: 'auto' },
};

// the beat in front of a step, as reiskeuze.js wants it (lines from the script:
// the parsed script.json, or a lookup function id -> scene such as storytext.js scene())
export function beatFor(stepId, script) {
  const b = REISBEATS[stepId];
  if (!b) return null;
  const out = { ...b, stepId };
  const sc = b.scene && (typeof script === 'function' ? script(b.scene) : script?.scenes?.find((s) => s.id === b.scene));
  if (sc) out.lines = (sc.lines || []).filter((l) => l.text).slice(0, 4).map((l) => `${l.speaker}: ${l.text}`);
  return out;
}
