const fs = require('fs');
let s = fs.readFileSync('scripts/_edit30.cjs', 'utf8');
const R = (a, b) => { if (!s.includes(a)) throw new Error('mist ' + a.slice(0, 50)); s = s.replace(a, () => b); };
R("    v0 += MOOD_SEG * 2 + 2 - 4 + 0;   // de rest van het mondgeheugen blijft ongebruikt (nulpunten, niet geïndexeerd)\n    i0 += MOOD_SEG * 6 - 6;\n", "");
R("  const hw = 0.026;\n", "  const hw = 0.026, v0s = v0, i0s = i0;\n");
R("  // wenkbrauwen: een staafje boven elk oog; de binnenkant (naar het midden van het gezicht) staat bij mokkend lager\n  const zm", "  // wenkbrauwen: een staafje boven elk oog; de binnenkant (naar het midden van het gezicht) staat bij mokkend lager\n  v0 = v0s + (MOOD_SEG + 1) * 2; i0 = i0s + MOOD_SEG * 6;   // vaste indeling: de mond heeft zijn eigen ruimte, ongebruikt blijft nul\n  const zm");
R("  // vaste indeling: de ongebruikte plaatsen staan op nul en worden niet getekend\n  return { v: moodStart(v0, base, MOOD_V), i: i0 };\n}\nconst moodStart = (v0) => v0;\n", "  return { v: v0s + MOOD_V, i: i0s + MOOD_I };\n}\n");
fs.writeFileSync('scripts/_edit30.cjs', s);
