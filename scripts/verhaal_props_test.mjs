// Props, sets en figuranten van het verhaal (#1121): de audit op de echte data is groen, de nieuwe modellen houden hun
// budget (three-mock uit de vendor-cache) en de audit vangt elke soort fout die hij belooft te vangen.
//   node scripts/verhaal_props_test.mjs
import fs from 'node:fs';
import { auditSources, runAudit, renderMarkdown, ID_SOORT } from './verhaal_props_audit.mjs';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const A = await auditSources();
if (!A) { console.log('SKIP verhaal_props_test: three is niet gevendord (draai eerst: cd desktop && npm run stage)'); process.exit(0); }
const { cm, cs, sp, a1, ms } = A;

// --- de echte data ---------------------------------------------------------------------------------------------------
const base = await runAudit(A);
ok(base.errors.length === 0, 'de audit op de echte data is groen', base.errors.slice(0, 3).join(' | '));
ok(base.nScenes >= 90 && base.nProps >= 120, 'de audit ziet alle scènes en props', `${base.nScenes} scènes, ${base.nProps} props`);
ok(base.dressingPlans >= 22, 'de aankledingsplannen zijn geregistreerd', String(base.dressingPlans));

// --- de modellen ------------------------------------------------------------------------------------------------------
const nieuw = ['klomp', 'stempel', 'pinpas', 'map', 'bierviltje', 'fotolijst', 'statief', 'krat', 'pan', 'vuurwerk', 'koelbox', 'jas', 'aktetas', 'hesjes', 'container', 'scherm', 'prikbord'];
for (const k of nieuw) {
  const g = sp.DECOR_MAKERS[k] && sp.DECOR_MAKERS[k]();
  ok(!!g, `${k}: bouwer bestaat`);
  if (!g) continue;
  const m = sp.measureModel(g), b = sp.budgetOf(k);
  ok(!m.nan, `${k}: geen NaN`);
  ok(m.tris > 0 && m.tris <= b.tris, `${k}: binnen het budget`, `${m.tris} van ${b.tris}`);
  ok(m.mats >= 2 && m.mats <= 6, `${k}: 2 tot 6 materialen`, String(m.mats));
  ok(m.bbox.x > 0 && m.bbox.y > 0 && m.bbox.z > 0, `${k}: heeft een silhouet`);
  ok(Math.abs(m.min.y) < 0.05, `${k}: staat op de grond`, String(m.min.y));
  sp.disposeModel(g);
  ok(cm.DECOR_KINDS.includes(k) && cs.PROP_KINDS.includes(k), `${k}: staat in DECOR_KINDS en PROP_KINDS`);
}
// afmetingen kloppen met het ding zelf
const dim = (k) => sp.measureModel(sp.DECOR_MAKERS[k]()).bbox;
ok(dim('container').x > 2.8 && dim('container').y > 2.3, 'een container is zo groot als een container');
ok(dim('klomp').x > 0.25 && dim('klomp').x < 0.5, 'een klomp is een schoen');
ok(dim('bal').x > 0.25 && dim('bal').x < 0.4, 'de bal is een voetbal');
ok(sp.measureModel(sp.DECOR_MAKERS.bal()).mats === 2, 'de voetbal heeft wit en zwart');
ok(dim('statief').y > 1.3, 'het statief staat op ooghoogte');
ok(sp.budgetOf('onbekend').tris === sp.DECOR_BUDGET.default.tris, 'een soort zonder eigen budget krijgt het standaardbudget');
// de wereldvoertuigen
for (const k of ['snackwagen', 'tankwagen', 'limo']) {
  ok(cm.PROP_SOURCES[k] && cm.PROP_SOURCES[k].model && cm.PROP_FOOT[k], `${k}: wereldmodel met afmetingen`);
  ok(!cm.propKindIssue(k), `${k}: geen foutmelding`);
}
ok(cm.PROP_SOURCES.tankwagen.model.livery === 'usmemvet' && cm.PROP_SOURCES.tankwagen.model.tank === true, 'de tankwagen is de vettankwagen van Us Mem');
ok(cm.PROP_SOURCES.snackwagen.model.name === 'foodtruck', 'de snackwagen is de foodtruck');
ok(cm.CARRY_LOW.includes('klomp') && cm.CARRY_LOW.includes('tas') && !cm.CARRY_LOW.includes('klembord'), 'draaghoogte: laag voor tas en klomp, hoog voor klembord');
ok(ms.NPC.beppe && ms.NPC.beppe.name === 'Beppe', 'Beppe heeft een figuur');

// --- de scènes gebruiken de nieuwe soorten ---------------------------------------------------------------------------------
const specs = { ...a1.SPECS, ...a1.MORE_SPECS };
const kindOf = (scene, id) => specs[scene] && specs[scene].props && specs[scene].props[id] && specs[scene].props[id].kind;
ok(kindOf('M30.outro', 'bus') === 'snackwagen', 'M30: de snackwagen staat op het plein');
ok(kindOf('M07.intro', 'tank') === 'tankwagen', 'M07: de tankwagen');
ok(kindOf('M10.intro', 'limo') === 'limo', 'M10: de trekker-limo');
ok(kindOf('M13.intro', 'cont1') === 'container', 'M13: containers op de kade');
ok(kindOf('M03.2', 'klomp') === 'klomp', 'M03: de klomp');
ok(kindOf('M01.3', 'statief') === 'statief', 'M01: het statief van de streamer');
ok(kindOf('M09.intro', 'kratten1') === 'krat', 'M09: kratten');
for (const [id, soort] of Object.entries(ID_SOORT)) for (const k of [].concat(soort)) ok(cs.PROP_KINDS.includes(k), `ID_SOORT ${id}: ${k} is een bekende soort`);

// --- de audit vangt wat hij belooft ------------------------------------------------------------------------------------------
async function met(naam, zet, ruim, verwacht) {
  try { zet(); const r = await runAudit(A); ok(r.errors.some((e) => verwacht.test(e)), naam, r.errors.slice(0, 2).join(' | ') || 'geen fout gemeld'); } finally { ruim(); }
}
const THREE = await import('three');
const kaal = (c = 0x888888) => new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: c }));
const voegSoort = (k, f) => { sp.DECOR_MAKERS[k] = f; cm.DECOR_KINDS.push(k); cs.PROP_KINDS.push(k); };
const haalSoort = (k) => { delete sp.DECOR_MAKERS[k]; for (const l of [cm.DECOR_KINDS, cs.PROP_KINDS]) { const i = l.indexOf(k); if (i >= 0) l.splice(i, 1); } };
await met('een model met NaN valt door de audit', () => voegSoort('nantest', () => { const g = new THREE.Group(); const m = kaal(); m.position.set(NaN, 0, 0); g.add(m); return g; }), () => haalSoort('nantest'), /nantest.*NaN/);
await met('een te zwaar model valt door het budget', () => voegSoort('zwaartest', () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 64, 64), new THREE.MeshStandardMaterial({ color: 1 })), new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 2 }))); return g; }), () => haalSoort('zwaartest'), /zwaartest.*driehoeken/);
await met('een model met één kleur valt door de materialen', () => voegSoort('eenkleurtest', () => { const g = new THREE.Group(); const m = kaal(); m.position.y = 0.5; g.add(m); return g; }), () => haalSoort('eenkleurtest'), /eenkleurtest.*materialen/);
await met('een model dat zweeft wordt gemeld', () => voegSoort('zweeftest', () => { const g = new THREE.Group(); const m = kaal(1); m.position.y = 2; const m2 = kaal(2); m2.position.y = 2.2; g.add(m, m2); return g; }), () => haalSoort('zweeftest'), /zweeftest.*zweeft/);
await met('twee soorten met hetzelfde model worden gemeld', () => voegSoort('doos2', () => sp.DECOR_MAKERS.doos()), () => haalSoort('doos2'), /hetzelfde model/);
await met('een decorsoort zonder bouwer wordt gemeld', () => { cm.DECOR_KINDS.push('spooktest'); }, () => { cm.DECOR_KINDS.pop(); }, /spooktest.*geen bouwer/);
const SPEC = (extra) => () => { a1.MORE_SPECS['TEST.x'] = { props: {}, cast: {}, ...extra }; };
const WEG = () => { delete a1.MORE_SPECS['TEST.x']; };
await met('een stand-in (klomp als tas) wordt gemeld', SPEC({ props: { klomp: { kind: 'tas', at: [2, 0, 0] } } }), WEG, /stand-in/);
await met('een onbekende soort wordt gemeld', SPEC({ props: { ding: { kind: 'ufo', at: [2, 0, 0] } } }), WEG, /onbekende soort ufo/);
await met('een placeholder-soort wordt gemeld', SPEC({ props: { kar: { kind: 'aanhanger', at: [2, 0, 0] } } }), WEG, /placeholder/);
await met('een onbekende set wordt gemeld', SPEC({ set: 'kasteel' }), WEG, /onbekende set kasteel/);
await met('een verwijzing naar een prop die niet bestaat wordt gemeld', SPEC({ open: [{ actor: 'tammo', face: 'prop:spook' }] }), WEG, /prop:spook/);
await met('een carry van een onbekende prop wordt gemeld', SPEC({ open: [{ actor: 'tammo', carry: 'spook' }] }), WEG, /carry spook/);
await met('een figurant zonder uiterlijk wordt gemeld', SPEC({ cast: { x: { key: 'bestaatniet', at: [3, 0], face: 0 } } }), WEG, /bestaatniet/);
await met('een figurant in een voertuig wordt gemeld', SPEC({ cast: { x: { key: 'berend', at: [5, 0], face: 0 } }, props: { wagen: { kind: 'bestelbus', at: [5, 0, 0], face: 0 } } }), WEG, /x staat aan het begin in wagen/);
await met('twee gelijke props op dezelfde plek worden gemeld', SPEC({ props: { a: { kind: 'doos', at: [3, 1, 0] }, b: { kind: 'doos', at: [3, 1, 0] } } }), WEG, /dezelfde plek/);
await met('een mid: naar een onbekende rol wordt gemeld', SPEC({ wide: { from: [0, 0, 2], to: [1, 1, 2], look: 'mid:tammo,spook@1.2' } }), WEG, /spook, dat bestaat niet/);
// wie wegloopt uit een voertuig begint er bewust in: geen fout
{
  a1.MORE_SPECS['TEST.x'] = { props: { wagen: { kind: 'bestelbus', at: [5, 0, 0], face: 0 } }, cast: { x: { key: 'berend', at: [5, 0], face: 0 } }, open: [{ actor: 'x', walk: [[2, 0]] }] };
  const r = await runAudit(A); delete a1.MORE_SPECS['TEST.x'];
  ok(!r.errors.some((e) => /TEST\.x/.test(e)), 'wie uit een voertuig stapt (walk in de opening) is geen fout', r.errors.join('|'));
}
ok((await runAudit(A)).errors.length === 0, 'na de negatieve proeven is alles weer groen');

// --- het rapport klopt met de audit ---------------------------------------------------------------------------------------
const doc = fs.readFileSync(new URL('../docs/PROPS-STAND-22-11.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
ok(doc.trimEnd() === renderMarkdown(base).trimEnd(), 'docs/PROPS-STAND-22-11.md is actueel (draai: node scripts/verhaal_props_audit.mjs --write)');

console.log(`verhaal_props_test: ${n} controles${fails ? `, ${fails} MISLUKT` : ' ok'}`);
process.exit(fails ? 1 : 0);
