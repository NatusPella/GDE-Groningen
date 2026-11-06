// De G-Music-elementen van de radio (#592): een dood of vervangen element laat geen
// MediaElementSource in de audiograaf hangen. Bron + de pure opruimfunctie.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../game/js/audio/radio.js', import.meta.url), 'utf8');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

ok(/el\.gmusicNode/.test(src), 'een element bewaart zijn node');
ok(/function discardGmusicEl|const discardGmusicEl/.test(src), 'er is een opruimfunctie');
ok((src.match(/discardGmusicEl\(/g) || []).length >= 2, 'opruimen wordt op meer dan één plek gebruikt');
ok(/reviveGmusicEl[\s\S]{0,400}discardGmusicEl/.test(src), 'revive ruimt het oude element op');
ok(/makeJingleEl[\s\S]{0,600}discardGmusicEl/.test(src), 'een nieuwe jingle ruimt de oude op');

// de opruimfunctie zelf, met een nep-element en nep-node
const m = src.match(/function discardGmusicEl[\s\S]*?\n}/);
ok(!!m, 'de functie is te lezen');
const fn = new Function('el', 'return (' + m[0] + ')(el);');
let disconnected = 0;
const el = { gmusicNode: { disconnect() { disconnected++; } } };
fn(el);
ok(disconnected === 1, 'de node wordt losgekoppeld');
ok(el.gmusicNode === null, 'en de verwijzing is weg');
fn(el);
ok(disconnected === 1, 'tweede keer opruimen is veilig');
const leeg = {};
fn(leeg);
ok(disconnected === 1, 'opruimen zonder node is veilig');

console.log(`radio_graph_test: ${n} controles ok`);
