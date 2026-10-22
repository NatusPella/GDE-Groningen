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
//   act      1..5 (6: Deel 4), for the act budget
export const REISBEATS = {
  T1: { act: 2, from: 'Station Grunn', to: 'Warffum', length: 28000, ride: 'trein', scene: 'T1' },
  T2: { act: 2, from: 'Uithuizen', to: 'Zoutkamp', length: 30000, ride: 'bus', scene: 'T2' },
  // M12 ends at the Eemshaven; the dike race of M14 starts at Bierum, about 22 km on
  M14: { act: 3, from: 'Eemshaven', to: 'Bierum', length: 22000, ride: 'lift' },
  // by rail Delfzijl to Winschoten goes by way of Station Grunn: about 80 km
  T3: { act: 3, from: 'Delfzijl', to: 'Winschoten', length: 80000, ride: 'trein', scene: 'T3' },
  // M16 ends at the Oldambtmeer, M17 starts at the Oosterdiep in Veendam (about 20 km)
  M17: { act: 4, from: 'Winschoten', to: 'Veendam', length: 20000, ride: 'lift' },
  // Wildervank to Bourtange by way of Ter Apel (about 45 km): the beat sits on the step that ends at Bourtange
  T4: { act: 4, from: 'Wildervank', to: 'Bourtange', length: 45000, ride: 'bus', scene: 'T4.1' },
  M21: { act: 4, from: 'Bourtange', to: 'Zuidhorn', length: 65000, ride: 'lift' },
  M23: { act: 5, from: "Tinus' schuur", to: 'Grote Markt', length: 25000, ride: 'lift', selfMode: 'auto' },
  // Deel 4 (act 6): Grote Markt to Loppersum (about 25 km), and Loppersum to Bourtange (about 70 km, by road over Winschoten and Ter Apel)
  M27: { act: 6, from: 'Grote Markt', to: 'Loppersum', length: 25000, ride: 'lift' },
  T5: { act: 6, from: 'Loppersum', to: 'Bourtange', length: 70000, ride: 'lift', scene: 'T5.1' },
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
