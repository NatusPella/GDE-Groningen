// #663: M09 en M10 hebben geen lange, ononderbroken rit meer en de eierregel
// waarschuwt vóór hij faalt. node scripts/missietempo_test.mjs
//
// Meetbaar aan de missiedefinities (missions_akte2.js, puur):
//  - M09: drie goto-stappen (was twee) door een tussenstop op de wierde;
//  - M10: de achtervolging in twee goto-stappen (was één van 3,5 km), met
//    dezelfde limo op beide stukken;
//  - M09 faalt pas onder 38% eieren (was 50%), met twee waarschuwingen
//    (75% en 60%/45%) vóór die grens in de eierregel.
import fs from 'node:fs';
import { buildAkte2Defs } from '../game/js/missions_akte2.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const defs = buildAkte2Defs({});
const m09 = defs.find((d) => d.label === 'Heel aankomen is ook een kunst');
const m10 = defs.find((d) => d.label === 'Een trekker-limo op de wierde');
ok(!!m09 && !!m10, 'M09 en M10 staan in de akte-2-definities');
const gotos = (d) => d.stages.filter((s) => s.kind === 'goto');

// M09: tussenstuk halverwege (de rit was 2,6 km in één ruk)
ok(gotos(m09).length >= 3, 'M09 heeft een tussenstuk: drie goto-stappen', gotos(m09).length);
ok(gotos(m09).some((s) => /tussenstop/i.test((s.label || '') + ' ' + ((s.target && s.target.label) || ''))), 'het tussenstuk heet een tussenstop');
ok(m09.stages[2] && m09.stages[2].kind === 'goto', 'na de tussenstop volgt de eindbestemming');

// M10: de lange rit in twee stukken, met dezelfde achtervolger door
const m10g = gotos(m10);
ok(m10g.length >= 3, 'M10 heeft twee rijstukken naast de bushalte', m10g.length);
const chase = m10g.filter((s) => s.pursuer);
ok(chase.length >= 2, 'M10 jaagt op beide stukken door (twee stappen met pursuer)', chase.length);
ok(m10g.filter((s) => s.pursuer).every((s) => s.pursuer === m10g.find((q) => q.pursuer).pursuer), 'beide stukken delen dezelfde limo-instelling');

// eieren: tweede kans en een waarschuwing vóór de faalgrens
ok(m09.eggs && m09.eggs.failAt <= 40, 'de eierregel faalt pas onder 38% (was 50%)', m09.eggs && m09.eggs.failAt);
const src = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
const m = src.match(/for \(const lvl of \[([0-9, ]+)\]\)/);
ok(!!m, 'de eierregel heeft waarschuwingsniveaus');
if (m) {
  const lvls = m[1].split(',').map((x) => Number(x.trim())).filter(Number.isFinite);
  ok(lvls.some((l) => l > m09.eggs.failAt), 'minstens één waarschuwing boven de faalgrens', lvls.join(','));
  ok(lvls.some((l) => l > 50), 'de eerste waarschuwing komt ruim voor het einde', lvls.join(','));
}
ok(/Nog één stoot en de missie mislukt/.test(src), 'de laatste waarschuwing zegt dat de missie bijna mislukt');

console.log(`#663 meting: M09 ${gotos(m09).length} rijstappen (was 2), M10 ${m10g.length} rijstappen waarvan ${chase.length} met de limo (was 1+1), eieren falen op ${m09.eggs.failAt}% (was 50%)`);
console.log(`${n - fails}/${n} missietempo`);
process.exit(fails ? 1 : 0);
