// Het minigamebord en het stopvenster zijn leesbaar (#985): het watermerk staat zacht in de marge en nooit onder
// tekst, de sfeernaam in de kop wordt niet afgekapt, en het stopvenster toont toets-iconen in de knoppen.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { keyTextHtml, keyLabelGlyph } from '../game/js/keycap.js';

const src = readFileSync(fileURLToPath(new URL('../game/js/minigamekit.js', import.meta.url)), 'utf8');
let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.log('FAIL ' + m); } };
const css = src.slice(src.indexOf('Zomerse zeefdruk'));
const wm = /\.mg-watermark \{([^}]*)\}/.exec(css);
ok(wm, 'er is een watermerkregel in de zeefdruklaag');
if (wm) {
  const op = Number(/opacity:\s*([\d.]+)/.exec(wm[1])?.[1]);
  ok(op > 0 && op <= 0.1, `watermerk is zacht (dekking ${op} <= 0.1)`);
  ok(/top:\s*\d+px/.test(wm[1]) && /bottom:\s*auto/.test(wm[1]), 'watermerk staat bovenin de marge, niet onderin bij de tekst');
  ok(/max-width:\s*\d+%/.test(wm[1]) && /overflow:\s*hidden/.test(wm[1]), 'watermerk is begrensd en loopt niet over de tekst');
}
ok(/\.mg-board > :not\(\.mg-watermark\):not\(\.mg-vorm\) \{[^}]*z-index:\s*1/.test(css), 'echte tekst ligt boven het watermerk');
const sf = [...css.matchAll(/\.mg-board \.mg-sfeer \{([^}]*)\}/g)].map((m) => m[1]).join(' ');
ok(/white-space:\s*normal/.test(sf) && /text-overflow:\s*clip/.test(sf), 'sfeernaam in de kop wikkelt door en wordt niet afgekapt');
ok(/#hud \.mg-board small \{[^}]*flex-wrap:\s*wrap/.test(css), 'de kopregel mag op twee regels');
// stopvenster: toets-iconen in de knoppen, geen toetsnamen als woord
ok(!/ESC of ENTER = stoppen/.test(src), 'geen toetsnamen als gewone tekst in het stopvenster');
ok(/keyTextHtml\('\{SPACE\}'\)/.test(src) && /keyTextHtml\('\{ESC\}'\)/.test(src), 'de knoppen dragen {SPACE} en {ESC}');
const esc = keyTextHtml('{ESC}');
ok(/is-kbg/.test(esc) && /data-set="keys"/.test(esc) && /data-gk="ESC"/.test(esc), '{ESC} is een toets-icoon dat de controller kan vervangen');
ok(keyLabelGlyph('Enter') && keyLabelGlyph('Q') && keyLabelGlyph('↑') && keyLabelGlyph('Spatie'), 'hintlabels (Enter, Q, pijl, Spatie) krijgen een icoon');
ok(keyLabelGlyph('Muis') === null, 'een woord zonder toets houdt zijn tekst');
console.log(failed ? `mg_bord_test: ${failed} fouten` : 'mg_bord_test: ok');
process.exit(failed ? 1 : 0);
