// scripts/perf/heapmap.mjs (#1040): de indeling van een heapprofiel in categorieen; zuiver, zonder Electron.
//   node scripts/heapmap_test.mjs
import { classify, summarize, formatSummary } from './perf/heapmap.mjs';

let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

ok(classify('file:///x/js/tilestore.js') === 'tegeldata', 'tilestore is tegeldata');
ok(classify('file:///x/js/sfx/samples.js') === 'audio', 'samples is audio');
ok(classify('file:///x/js/audio/scenario.js') === 'audio', 'scenario is audio');
ok(classify('file:///x/js/shopsigns3d.js') === 'textures en canvas', 'bordtextures zijn textures');
ok(classify('file:///x/js/roadsurface.js') === 'wegen en routes', 'roadsurface hoort bij wegen');
ok(classify('file:///x/js/scene3d.js') === 'scene en render', 'scene3d is scene');
ok(classify('file:///x/vendor/three.module.js') === 'scene en render', 'three is scene');
ok(classify('', '(program)') === 'native', 'zonder bestand is native');
ok(classify('file:///x/js/zzzonbekend.js') === 'overig', 'onbekend is overig');

const prof = { head: { callFrame: { url: '' }, selfSize: 0, children: [
  { callFrame: { url: 'file:///x/js/tilestore.js', functionName: 'onmessage' }, selfSize: 30 * 1048576, children: [] },
  { callFrame: { url: 'file:///x/js/sfx/samples.js', functionName: 'laad' }, selfSize: 10 * 1048576, children: [
    { callFrame: { url: 'file:///x/js/roadsurface.js', functionName: 'fillNodes' }, selfSize: 5 * 1048576, children: [] }] },
] } };
const s = summarize(prof);
ok(s.total === 45 * 1048576, 'totaal telt alle selfSize op', String(s.total));
ok(s.byCat.get('tegeldata') === 30 * 1048576 && s.byCat.get('audio') === 10 * 1048576 && s.byCat.get('wegen en routes') === 5 * 1048576, 'categorietotalen kloppen');
const txt = formatSummary(s);
ok(/tegeldata/.test(txt) && /tilestore\.js/.test(txt) && !/NaN/.test(txt), 'tekst noemt categorie en bestand, zonder NaN', txt);
ok(formatSummary(summarize({})).includes('0.0 MB'), 'een leeg profiel geeft nul zonder fout');
console.log(fails ? `heapmap_test: ${fails} van ${n} mislukt` : `heapmap_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
