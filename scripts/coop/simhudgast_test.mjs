// Samen spelen: een bijbaan van een gast (c.owner > 0) loopt op de machine van wie het spel opende, maar raakt de lichte sim-HUD
// (simHudTik/simHudPop) en de uitlegvlag (zetUitlegGezien) van de eigenaar niet. De banen laden three van een CDN en zijn hier niet
// te importeren: de test leest de bron en eist dat elke aanroep achter een c.owner-bewaking staat.
//   node scripts/coop/simhudgast_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };
const BANEN = ['taxi', 'bus', 'krantenwijk', 'bezorger', 'rondvaart'];
const bron = (b) => fs.readFileSync(new URL(`../../game/js/sidejob_${b}.js`, import.meta.url), 'utf8').split(/\r?\n/);

for (const b of BANEN) {
  t(`${b}: elke strook-, pop- en uitlegaanroep staat achter c.owner`, () => {
    const slecht = [];
    const regels = bron(b);
    regels.forEach((regel, i) => {
      if (/^\s*import\s/.test(regel) || /^\s*\/\//.test(regel)) return;
      const aanroep = /\b(simHudPop|zetUitlegGezien)\(/.test(regel) || /\bsimHudTik\(0, null\)/.test(regel);
      const vroeg = i > 0 && /^\s*if \(c\.owner\) \{ if \(d\.kolom\) d\.kolom\.visible = false; return; \}/.test(regels[i - 1]); // de vorige regel is de vroege return voor een gast
      if (aanroep && !vroeg && !/\bc\.owner\b|!c \|\| !c\.owner/.test(regel)) slecht.push(`${i + 1}: ${regel.trim().slice(0, 90)}`);
    });
    assert.deepEqual(slecht, [], 'zonder bewaking: ' + slecht.join(' | '));
  });
  t(`${b}: de strook wordt voor een gast leeg gelaten (vroege return op c.owner)`, () => {
    assert.ok(bron(b).some((r) => /if \(c\.owner\) \{ if \(d\.kolom\) d\.kolom\.visible = false; return; \}/.test(r)), 'geen vroege return op c.owner');
  });
}

for (const b of BANEN) {
  t(`${b}: een baan van een gast maakt de strook van de eigenaar ook niet leeg (geen simHudTik in een c.owner-tak)`, () => {
    const slecht = bron(b).filter((r) => /if \(c\.owner \|\|.*\{[^}]*simHudTik\(/.test(r) || /if \(c\.owner\) \{[^}]*simHudTik\(/.test(r));
    assert.deepEqual(slecht, []);
  });
}

console.log(`simhudgast_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
