// De voortgangsbalk beweegt zonder layout (#1093): de vulling schuift met translate, nooit met width:  node scripts/ds3_balk_test.mjs
import fs from 'node:fs';
let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log(`FAIL ${name}`); } };
const css = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const comp = css('ds-components.css'), sch = css('ds-schermen.css');
const regel = /(?:^|\n)\.ds-z-balk__vul \{([^}]*)\}/.exec(comp);
ok(!!regel, 'de vulling heeft een regel');
const r = regel ? regel[1] : '';
ok(/width:\s*100%/.test(r) && /translate:\s*calc\(var\(--ds-z-w\) - 100%\)\s+0/.test(r), 'de vulling is vol breed en schuift naar --ds-z-w');
ok(/transition:\s*translate\b/.test(r) && !/transition:[^;]*width/.test(r), 'de overgang is op translate, niet op width');
ok(/\.ds-z-balk__baan \{[^}]*overflow:\s*hidden/.test(comp), 'de baan knipt de vulling');
ok(!/ds-z-balk__vul[^{]*\{[^}]*transition:\s*width/.test(sch), 'de drift-chip animeert ook geen width');
ok(/html\.rustig-drukwerk \.ds-z-balk__vul[^{]*\{\s*transition:\s*none/.test(comp) || /rustig-drukwerk \.ds-z-balk__vul/.test(comp), 'Rustig drukwerk zet de overgang uit');
ok(/html\.reduce-motion :is\([^)]*\.ds-z-balk__vul/.test(comp) && /prefers-reduced-motion[\s\S]*\.ds-z-balk__vul \{ transition: none/.test(comp), 'Beweging beperken zet hem uit');
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
