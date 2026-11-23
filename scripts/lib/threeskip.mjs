// #1298: een test die de echte spelcode via node3d.mjs laadt, sloeg zichzelf bij ELKE importfout over (SKIP, exit 0).
// Een echte fout in de spelcode (syntaxfout, ontbrekende export) was zo stil groen, en in CI zonder three.js de hele
// opslag-compatsuite ook. Deze helper laat alleen een ontbrekende three.js een SKIP zijn, en in CI ook dat niet.
//   try { SG = await import('../game/js/savegame.js'); } catch (e) { skipAlsThreeOntbreekt('naam_test.mjs', e); }

// zelfde herkenning als NIET_NODIG in scripts/run_tests.mjs
export const THREE_ONTBREEKT = /Cannot find (package|module)[^\n]*['"]three['"]|vendor[\\/]+three|is not vendored yet/i;

export const inCi = (env = process.env) => !!(env.CI || env.GDE_RULES_BASE);

// -> 'skip' | 'fout' (pure keuze, getest in scripts/threeskip_test.mjs)
export function skipKeuze(e, env = process.env) {
  const msg = String((e && e.message) || e);
  if (!THREE_ONTBREEKT.test(msg)) return 'fout'; // een echte importfout is een fout, geen stille SKIP
  return inCi(env) ? 'fout' : 'skip'; // CI haalt three.js zelf op: daar ontbreekt hij niet
}

export function skipAlsThreeOntbreekt(naam, e) {
  if (skipKeuze(e) === 'fout') {
    console.error(`FOUT ${naam}: de spelcode laadt niet${inCi() ? ' (in CI telt een ontbrekende three.js ook als fout)' : ''}`);
    throw e;
  }
  console.log(`SKIP ${naam}:`, String(e.message).split('\n')[0]);
  process.exit(0);
}
