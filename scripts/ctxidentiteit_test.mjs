// Eigen identiteit per context (#1004), puur: de tabel, de CSS-regels (alleen tokens, geen hex), contrast 4,5:1 van de
// tekst op de band, de 13 px-vloer van de stempel, Rustig drukwerk en de bedrading in minigamekit en farmhud.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTEXTEN, contextVan, zetContext } from '../game/js/ctxidentiteit.js';
import { iconBekend } from '../game/js/icons.js';
import { contrastRatio } from './release/ds_tokens_lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

const tokens = rd('game/js/ds-tokens.css'); const comp = rd('game/js/ds-components.css');
const hex = (naam) => { const m = tokens.match(new RegExp(`--ds-c-${naam}:\\s*(#[0-9a-fA-F]{6})`)); return m && m[1]; };
const INKT = { bord: 'ink-bord', geel: 'ink-geel', roze: 'ink-roze', inkt: 'ink-inkt', papier: 'ink-papier', wit: 'wit' };

ok(Object.keys(CONTEXTEN).join() === 'golf,farming', 'de proefset is golf en farming');
for (const [id, c] of Object.entries(CONTEXTEN)) {
  ok(INKT[c.band] && INKT[c.tekst], `${id}: band en tekst zijn bestaande inkten`);
  ok(contrastRatio(hex(INKT[c.tekst]), hex(INKT[c.band])) >= 4.5, `${id}: tekst op de band minstens 4,5:1 (${contrastRatio(hex(INKT[c.tekst]), hex(INKT[c.band])).toFixed(1)})`);
  ok(iconBekend(c.embleem), `${id}: het embleem ${c.embleem} bestaat in icons.js`);
  ok(/^[A-Z]{3,12}$/.test(c.stempel), `${id}: de stempel is korte tekst in hoofdletters, Nederlands`);
  const regel = comp.split('\n').find((l) => l.startsWith(`[data-ctx="${id}"]`));
  ok(regel, `${id}: een regel in ds-components.css`);
  ok(regel.includes(`var(--ds-c-${INKT[c.band]})`) && regel.includes(`var(--ds-c-${INKT[c.tekst]})`) && regel.includes(`"${c.stempel}"`), `${id}: de CSS-regel volgt de tabel`);
  ok(!/#[0-9a-fA-F]{3,8}\b/.test(regel), `${id}: geen hex in de regel`);
}
// de blokregels: tokens, 13 px-vloer, Rustig drukwerk
const blok = comp.slice(comp.indexOf('/* ---- Context-identiteit')).replace(/\/\*[\s\S]*?\*\//g, '');
ok(blok.length > 400 && !/#[0-9a-fA-F]{3,8}\b/.test(blok.replace(/#hud/g, '')), 'het contextblok gebruikt geen hex');
ok(/font-size: var\(--ds-t-label\)/.test(blok) && /--ds-t-label:\s*(\d+)px/.test(tokens) && Number(tokens.match(/--ds-t-label:\s*(\d+)px/)[1]) >= 13, 'de stempel leest --ds-t-label (minstens 13 px)');
ok(/rustig-drukwerk[^{]*\[data-ctx\][^{]*\{ transform: none/.test(blok), 'Rustig drukwerk zet de stempel recht');
ok(!/text-shadow:\s*var\(--ds-misdruk\)/.test(blok) && /\[data-ctx="farming"\] \.ds-z-kaart__titel \{ text-shadow: none/.test(blok), 'geen misdruk op de gele band');

// de functies
ok(contextVan('discgolf') === 'golf' && contextVan('pitchputt') === 'golf' && contextVan('boerderij') === 'farming' && contextVan('skatepark') === null, 'contextVan koppelt de spellen van de proefset');
const el = { dataset: {} };
ok(zetContext(el, 'golf').dataset.ctx === 'golf', 'zetContext zet het attribuut');
ok(!('ctx' in zetContext(el, 'onzin').dataset), 'een onbekende context laat het paneel neutraal');
ok(zetContext(null, 'golf') === null && zetContext({}, 'golf') !== undefined, 'zonder element of dataset gebeurt er niets');

// de bedrading
ok(/zetContext\(root, contextVan\(title\)\)/.test(rd('game/js/minigamekit.js')), 'minigamekit zet de context op het bord');
ok(/zetContext\(el, 'farming'\)/.test(rd('game/js/farmhud.js')), 'farmhud zet de context op de boerderij-HUD');
console.log(`ctxidentiteit_test: ${n} controles ok`);
