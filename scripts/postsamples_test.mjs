// #658: MSAA-samples hangen aan het kwaliteitsniveau, niet aan de pixelratio.
import fs from 'node:fs';
import { postSampleCount, postNeedsRebuild } from '../game/js/postsamples.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

ok(postSampleCount('hoog') === 2, 'hoog: 2 samples (was 4 op pr 1)');
ok(postSampleCount('middel') === 2, 'middel: 2 samples');
ok(postSampleCount('laag') === 4, 'laag: 4 samples');
ok(!postNeedsRebuild(2, 'hoog') && !postNeedsRebuild(2, 'middel'), 'geen rebuild als het niveau gelijk blijft');
ok(postNeedsRebuild(4, 'hoog') && postNeedsRebuild(2, 'laag'), 'wel een rebuild bij een echt niveauverschil');
console.log('#658 meting: pr 1 -> 2 samples i.p.v. 4 (halve kleurbuffer); een adaptieve schaalstap bouwt de keten niet meer opnieuw en springt niet naar 4');
const src = fs.readFileSync(new URL('../game/js/postfx3d.js', import.meta.url), 'utf8');
ok(/const samplesFor = \(\) => postSampleCount\(level\)/.test(src), 'postfx gebruikt de pure keuze');
ok(/postNeedsRebuild\(composer\.passes\[0\]\.target\.samples, level\)/.test(src), 'rebuild alleen bij een niveauverschil');
ok(/grade\.material\.dispose\(\)/.test(src), 'de grade-pass wordt bij dispose vrijgegeven');
console.log(`${n - fails}/${n} postsamples`);
process.exit(fails ? 1 : 0);
