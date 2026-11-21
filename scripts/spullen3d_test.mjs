// Spullen in 3D (#1086): elk ding heeft viewerdata of een gedocumenteerde terugval, elk model heeft geometrie binnen het
// driehoekbudget en geeft zijn eigen geometrie vrij, en de viewer is aan het menu gehangen zoals de Garage (één gedeelde renderer,
// pauzeren buiten beeld, dispose bij sluiten, rustige draai en geen draai bij beperkte beweging).
//   node scripts/spullen3d_test.mjs   (heeft de gevendorde three nodig: cd desktop && npm run stage)
import './node3d.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SP = await import('../game/js/spullen3d.js');
const M3 = await import('../game/js/models3d_spullen.js');
const V = await import('../game/js/visdata.js');
const { alleItems, controleer, perCategorie, bouwModel, DRIEHOEKEN_MAX } = await import('./ui/spullen3d_dekking.mjs');
const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

const items = alleItems();
const rapport = controleer(items);

t('elk ding heeft viewerdata, of de terugval is gedocumenteerd (TERUGVAL)', () => {
  const zonder = items.filter((it) => !it.viewer);
  assert.deepEqual(zonder.map((it) => it.key), [], 'items zonder viewerdata en zonder terugval');
  for (const [k, reden] of Object.entries(SP.TERUGVAL)) assert.ok(typeof reden === 'string' && reden.length > 20, `terugval ${k} zonder reden`);
});

t('elk model bestaat, heeft driehoeken en blijft binnen het budget', () => {
  const fout = rapport.filter((r) => !r.ok);
  assert.deepEqual(fout.map((r) => `${r.key}: ${r.reden}`), []);
  assert.ok(rapport.length >= 90, 'de catalogus is kleiner dan verwacht: ' + rapport.length);
  assert.ok(Math.max(...rapport.map((r) => r.tris)) <= DRIEHOEKEN_MAX);
});

t('dekking per categorie is 100 procent', () => {
  for (const [c, r] of Object.entries(perCategorie(rapport))) assert.equal(r.model, r.totaal, `${c}: ${r.zonder.join(', ')}`);
});

t('elke soort in models3d_spullen.js geeft geometrie, en dispose raakt alleen eigen geometrie', () => {
  for (const type of M3.SPUL_TYPES) {
    const mesh = M3.buildSpulMesh({ type });
    assert.ok(mesh, type);
    assert.ok(M3.driehoeken(mesh) > 0, type + ' zonder driehoeken');
    const geos = new Set(); let disposed = 0;
    mesh.traverse((o) => {
      if (!o.geometry) return;
      geos.add(o.geometry);
      assert.ok(!(o.geometry.userData && o.geometry.userData.shared), type + ': een gedeelde geometrie lekt bij dispose');
      const m = o.material;
      for (const mm of Array.isArray(m) ? m : [m]) assert.ok(mm, type + ' zonder materiaal');
    });
    for (const g of geos) { g.addEventListener('dispose', () => disposed++); g.dispose(); }
    assert.equal(disposed, geos.size, type + ': niet alle geometrie gaf zich vrij');
  }
  assert.equal(M3.buildSpulMesh({ type: 'bestaatniet' }), null);
  assert.equal(M3.buildSpulMesh(null), null);
});

t('materialen zijn gedeeld per kleur: twee modellen bouwen maakt geen nieuwe materialen aan', () => {
  const mats = (g) => { const s = new Set(); g.traverse((o) => { if (o.material) s.add(o.material); }); return s; };
  const a = mats(M3.buildSpulMesh({ type: 'motor' }));
  const b = mats(M3.buildSpulMesh({ type: 'motor' }));
  for (const m of a) { assert.ok(m.userData.shared, 'materiaal niet gemarkeerd als gedeeld (lekt of wordt te vroeg weggegooid)'); assert.ok(b.has(m)); }
});

t('de vissen: elke soort uit visdata heeft een regel en de drie vormen komen voor', () => {
  assert.deepEqual(Object.keys(SP.VIS_LOOK).sort(), V.SOORTEN.map((s) => s.id).sort());
  const vormen = new Set(Object.values(SP.VIS_LOOK).map((l) => l[0]));
  assert.deepEqual([...vormen].sort(), ['plat', 'slang', 'spil']);
  // een onbekende soort valt terug op een grijs visje, geen null
  assert.equal(SP.etenSpec('vis:onbekend').spul.type, 'vis');
  // varianten uit één generator: verschillende kleur en lengte geven verschillende modellen
  const a = bouwModel(SP.etenSpec('vis:snoek')), b = bouwModel(SP.etenSpec('vis:spiering'));
  assert.notEqual(M3.driehoeken(a), 0);
  assert.notDeepEqual(SP.etenSpec('vis:snoek'), SP.etenSpec('vis:spiering'));
  assert.notEqual(JSON.stringify(SP.etenSpec('vis:paling')), JSON.stringify(SP.etenSpec('vis:bot')));
  assert.ok(b);
});

t('geldniveau groeit met het bedrag en is begrensd', () => {
  assert.deepEqual([0, 49, 50, 499, 500, 4999, 5000, 1e9, -5, NaN].map(SP.moneyTier), [0, 0, 1, 1, 2, 2, 3, 3, 0, 0]);
});

t('specs zijn gewone data (JSON) en onbekende ids geven null in plaats van een fout', () => {
  for (const it of items) assert.equal(JSON.stringify(it.viewer), JSON.stringify(JSON.parse(JSON.stringify(it.viewer))), it.key);
  assert.equal(SP.etenSpec('bestaatniet'), null);
  assert.equal(SP.meubelSpec('x'), null);
  assert.equal(SP.upgradeSpec('auto', 'x'), null);
  assert.equal(SP.upgradeSpec('boot', 'motor'), null);
  assert.equal(SP.kledingSpec(null), null);
  assert.equal(SP.wapenSpec(''), null);
});

t('geen echte merken of letters op de nieuwe modellen: de generator tekent geen tekst', () => {
  const s = src('../game/js/models3d_spullen.js');
  assert.ok(!/fillText|CanvasTexture|getContext/.test(s), 'models3d_spullen.js hoort geen canvas of tekst te gebruiken');
});

t('vehiclepreview kent het soort spul en deelt de ene renderer', () => {
  const s = src('../game/js/vehiclepreview.js');
  assert.match(s, /OBJECT_KINDS = new Set\(\[[^\]]*'spul'/);
  assert.match(s, /buildSpulMesh\(spec\.spul\)/);
  assert.match(s, /reset\(\) \{ p\.angle = angle; p\.zoom = zoom;/);
});

t('spullen.js: de viewer gebruikt createSharedPreview (geen eigen WebGLRenderer) en ruimt op', () => {
  const s = src('../game/js/spullen.js');
  assert.ok(/createSharedPreview\(c, \{/.test(s));
  assert.ok(!/new THREE\.WebGLRenderer|WebGLRenderer\(/.test(s));
  assert.match(s, /export function disposeSpullenViewer\(\) \{ stopViewer\(\); \}/);
  assert.match(s, /viewer\.dispose\(\)/);
  assert.match(s, /IntersectionObserver/); // pauzeren buiten beeld
  assert.match(s, /speed: reducedMotion\(\) \? 0 : /); // beperkte beweging: geen automatische draai
  assert.match(s, /data-spul-reset/);
  assert.match(s, /3D is hier niet beschikbaar/); // terugval naar het icoon
  // elk ding in collect() zet viewer (geld, wapens, vuisten, kleding, thuis, eten, vier kaarten, drie upgradesoorten)
  const gezet = (s.match(/viewer: /g) || []).length;
  assert.ok(gezet >= 13, 'te weinig items met viewer in collect(): ' + gezet);
});

t('pausemenu.js: de viewer gaat weg bij een ander tabblad en bij sluiten, en draait op de pijltjes', () => {
  const s = src('../game/js/pausemenu.js');
  assert.match(s, /name !== 'spullen'\) disposeSpullenViewer\(\)/);
  assert.ok((s.match(/disposeSpullenViewer\(\)/g) || []).length >= 2);
  assert.match(s, /tab === 'spullen' && \(dir === 'left' \|\| dir === 'right'\)[^\n]*turnSpullenViewer/);
});

t('stijl: tekst in de viewer minstens 13 px, en beperkte beweging zet de animatie uit', () => {
  const s = src('../game/js/spullen.js');
  const css = s.slice(s.indexOf('.sp-model{'), s.indexOf('</style>`;'));
  for (const m of css.matchAll(/font-size:([^;}]+)/g)) {
    const px = [...m[1].matchAll(/(\d+)px/g)].map((x) => +x[1]);
    assert.ok(px.length && Math.max(...px) >= 13, 'te kleine tekst: ' + m[1]);
  }
  assert.match(css, /prefers-reduced-motion:reduce\)\{#pause-menu \.sp-model/);
  assert.match(css, /html\.reduce-motion #pause-menu \.sp-model/);
});

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} tests`);
process.exit(fails ? 1 : 0);
