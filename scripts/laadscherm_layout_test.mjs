// De layout van het laadscherm en het bootscherm, gemeten in een echte browser (#1069, 22-11): rendert het echte DOM met de echte CSS
// (scripts/ui/laadscherm_render.html) in headless Chrome of Edge, GEEN Electron, en meet de boxen: logo, tagline, "Naar", bestemming,
// tag, voorbeeldplaatje, balk, statusregel. Faalt bij overlap, een te kleine marge (logo tot bestemming minimaal 24 px bij 720p en hoger,
// schaalt mee met --ui), een vak buiten het beeld of een bestemming die te klein wordt gezet. Venster 1280x720 tot 2560x1440, ui-schaal 1
// tot 1,5, korte en lange plaatsnamen, met en zonder tag, de varianten (nieuwe save, snel reizen, wachten op de gastheer, Rustig drukwerk)
// en het bootscherm. Zonder Chrome of Edge: nette skip met melding (de pure CSS-test staat in scripts/laadscherm_css_test.mjs).
//   node scripts/laadscherm_layout_test.mjs [--alles] [--png=<map>]
import path from 'node:path';
import { openBrowser, analyseer, scenarios, naamVan, BROWSER } from './ui/laadscherm_meet.mjs';

let n = 0, fails = 0;
const ok = (c, m, extra) => { n++; if (!c) { fails++; console.log('FAIL ' + m + (extra !== undefined ? ' :: ' + extra : '')); } };
const arg = (k) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };

if (!BROWSER) {
  console.log('laadscherm_layout_test: SKIP, geen Chrome of Edge gevonden (de CSS-test laadscherm_css_test dekt de regels zonder browser)');
  process.exit(0);
}

const lijst = scenarios({ alles: process.argv.includes('--alles'), licht: !process.argv.includes('--alles') });
const png = arg('png');
let br = null;
try {
  br = await openBrowser();
  for (const s of lijst) {
    const run = await br.meet(s, { png: png ? path.join(png, naamVan(s) + '.png') : null });
    const a = analyseer(run);
    ok(a.fouten.length === 0, naamVan(s), a.fouten.join('; '));
    if (s.kind === 'travel' && s.naam === 'Drenthe' && s.tag) {
      // de melding van de eigenaar (1280x720): "Naar" mag de tagline niet raken en het logo moet ademruimte hebben tot de bestemming
      const g = Object.fromEntries(a.gaps.map((x) => [x.paar, x.gap]));
      ok(g['tagline/kick'] >= 16 && g['logo/card'] >= 24, `ademruimte rond logo en bestemming (${naamVan(s)})`, JSON.stringify(g));
    }
  }
} catch (e) {
  ok(false, 'de meting zelf faalt niet', e && e.message);
} finally {
  if (br) await br.close();
}
console.log(fails ? `laadscherm_layout_test: ${fails} FAIL van ${n}` : `laadscherm_layout_test: ok (${n} controles, ${lijst.length} scenario's, browser ${path.basename(BROWSER)})`);
process.exit(fails ? 1 : 0);
