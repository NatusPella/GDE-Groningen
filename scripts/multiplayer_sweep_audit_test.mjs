// De keuring van de Samen-sweep (scripts/multiplayer_sweep_audit.mjs): een kapotte sectie faalt, de echte repo is groen.
//   node scripts/multiplayer_sweep_audit_test.mjs
import fs from 'node:fs';
import { auditSweep } from './multiplayer_sweep_audit.mjs';
let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
const echt = JSON.parse(fs.readFileSync(new URL('./coop_coverage.json', import.meta.url), 'utf8'));
const kopie = () => JSON.parse(JSON.stringify(echt));
const draai = (m, opt = {}) => auditSweep({ manifest: m, nieuw: [], ...opt }).fouten;
const heeft = (f, re) => f.some((x) => re.test(x));

ok(draai(kopie()).length === 0, 'de echte sectie is groen');
let m = kopie(); delete m.sweep22; ok(heeft(draai(m), /mist de sectie sweep22/), 'zonder sectie faalt het');
m = kopie(); m.sweep22.systemen[0].features = ['bestaat-niet']; ok(heeft(draai(m), /bestaat niet in coop_coverage/), 'een onbekend systeem faalt');
m = kopie(); m.features.find((f) => f.id === 'tuning').status = 'gat'; ok(heeft(draai(m), /tuning is nog een gat/), 'een gat in de sweep faalt');
m = kopie(); delete m.features.find((f) => f.id === 'bezit').venster; ok(heeft(draai(m), /bezit is deels maar noemt geen venster-stappen/), 'deels zonder vensters faalt');
m = kopie(); m.features.find((f) => f.id === 'bezit').gat = ''; ok(heeft(draai(m), /deels zonder reden/), 'deels zonder reden faalt');
m = kopie(); m.sweep22.systemen[0].tests = ['scripts/bestaat_niet_test.mjs']; ok(heeft(draai(m), /bestaat niet/), 'een testverwijzing die niet bestaat faalt');
m = kopie(); m.features.find((f) => f.id === 'kleding').guest; m.features.find((f) => f.id === 'kleding').gast = ''; ok(heeft(draai(m), /kleding beantwoordt de vraag gast niet/), 'een onbeantwoorde vraag faalt');
ok(heeft(draai(kopie(), { nieuw: ['verzonnenmodule'], bron: () => '' }), /hoort bij geen systeem/), 'een nieuwe module zonder systeem faalt');
ok(draai(kopie(), { nieuw: ['perf3d'], bron: () => '' }).length === 0, 'een nieuwe module onder nietCoopRelevant mag');
m = kopie(); m.nietCoopRelevant.push({ glob: 'spelerloos', reden: 'test' });
ok(heeft(draai(m, { nieuw: ['spelerloos'], bron: () => 'world.player.x' }), /alleen onder nietCoopRelevant/), 'een nieuwe module die de speler raakt mag niet alleen nvt zijn');
m = kopie(); m.sweep22.venster.push({ stap: 'weesstap', bestand: 'scripts/coop/testbank.mjs', zoek: 'mockLate' }); ok(heeft(draai(m), /weesstap/), 'een venster-stap zonder systeem en draaiboek faalt');
m = kopie(); m.sweep22.venster[0].zoek = 'komt-nergens-voor-xyz'; ok(heeft(draai(m), /bevat "komt-nergens-voor-xyz" niet/), 'een venster-stap die niet bestaat faalt');
m = kopie(); m.sweep22.systemen.push({ id: 'nieuwsysteem', naam: 'x', features: ['weer'], tests: ['scripts/coopweer_test.mjs'] }); ok(heeft(draai(m), /draaiboek noemt systeem nieuwsysteem niet/), 'een systeem dat niet in het draaiboek staat faalt');
console.log(fails ? `multiplayer_sweep_audit_test: ${fails} FAIL` : `multiplayer_sweep_audit_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
