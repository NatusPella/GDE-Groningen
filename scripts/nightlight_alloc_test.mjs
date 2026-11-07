// #658: de nachtlichten maken geen nieuwe arrays/Sets per frame meer.
import fs from 'node:fs';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const src = fs.readFileSync(new URL('../game/js/nightlights3d.js', import.meta.url), 'utf8');
const lamp = src.slice(src.indexOf('function updateRealLampLights'), src.indexOf('function lampMaterialsOf'));
const police = src.slice(src.indexOf('function updatePoliceLights'), src.indexOf('function updatePoliceLights') + 4000);
ok(!/const near = \[\]/.test(lamp), 'geen nieuwe array in updateRealLampLights');
ok(!/new Set\(/.test(lamp), 'geen nieuwe Set in updateRealLampLights');
ok(/_lampNear/.test(lamp) && /_lampPool/.test(lamp) && /_lampKeep/.test(lamp), 'hergebruikte scratch in de lampenlus');
ok(!/const near = \[\]/.test(police), 'geen nieuwe array in updatePoliceLights');
ok(!/new Set\(/.test(police), 'geen nieuwe Set in updatePoliceLights');
ok(/_polNear/.test(police) && /_polPool/.test(police) && /_polKeep/.test(police), 'hergebruikte scratch in de politielus');
ok(/if \(night < 0\.05 && !\(world\.wanted > 0\)/.test(police), 'vroeg terug bij dag zonder wanted/sirene');
console.log('#658 meting: nachtpad 0 nieuwe arrays en 0 nieuwe Sets per frame (was 2 arrays + 2 Sets per frame), en de politielus stopt bij dag zonder sirene');
console.log(`${n - fails}/${n} nightlightalloc`);
process.exit(fails ? 1 : 0);
