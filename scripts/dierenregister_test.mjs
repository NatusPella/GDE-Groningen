// Audit van het dierenregister (#193): elk dier is volwaardig. Het spawnt (streek, uur, biotoop), is te
// ontdekken (dierenboek en prestatie), heeft een echt model (geen kistje of reservemodel), is te kopen
// of te houden waar dat logisch is (met verzorgen en accessoires), en cutscenes gebruiken alleen
// dieren uit het register.   node scripts/dierenregister_test.mjs   (3D-modules in Node: node3d.mjs)
import './node3d.mjs';
import fs from 'node:fs';
const R = await import('../game/js/dierenregister.js');
const B = await import('../game/js/dierenbezit.js');
const P = await import('../game/js/dierenplan.js');
const A = await import('../game/js/achievements.js');
const W = await import('../game/js/wildlife.js');
const C = await import('../game/js/countryside.js');
let n = 0, bad = 0;
const check = (name, c, extra = '') => { n++; if (!c) { bad++; console.log('FAIL', name, extra); } };
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// --- 1. het register zelf ---
const ids = R.DIEREN.map((d) => d.id);
check('ids zijn uniek', new Set(ids).size === ids.length);
check('dertien dieren', R.DIEREN.length === 13, String(R.DIEREN.length));
const BIOTOPEN = ['weide', 'dijk', 'water', 'kust', 'wad', 'stad', 'erf'];
for (const d of R.DIEREN) {
  const t = `${d.id}: `;
  check(t + 'soort geldig', R.SOORTEN.includes(d.soort));
  check(t + 'naam en boektekst in het Nederlands', d.naam.length > 2 && d.boek.length > 25 && /[a-z]/.test(d.boek) && !/\b(the|and|cow|sheep)\b/i.test(d.boek));
  check(t + 'biotoop geldig', d.biotoop.length > 0 && d.biotoop.every((b) => BIOTOPEN.includes(b)));
  check(t + 'uren geldig', Array.isArray(d.uren) && d.uren.length === 2 && d.uren.every((h) => h >= 0 && h <= 24));
  check(t + 'plan bestaat in dierenplan', R.planBestaat(d) && (!d.plan || P.SPECIES[d.plan]));
}
// elke soort uit het dierenplan zit in het register
for (const sid of P.SPECIES_IDS) check(`dierenplan-soort ${sid} staat in het register`, R.DIEREN.some((d) => d.plan === sid), sid);

// --- 2. spawnen per streek, biotoop en uur ---
for (const d of R.DIEREN) {
  let ergens = false;
  for (const s of R.STREKEN_ALLE) for (let h = 0; h < 24; h++) for (const b of d.biotoop) if (R.spawnWeight(d.id, s, h, b) > 0) ergens = true;
  check(`${d.id}: spawnt ergens`, ergens);
  const streken = R.STREKEN_ALLE.filter((s) => R.mixVan(d, s) > 0);
  check(`${d.id}: komt in minstens twee streken voor`, streken.length >= 2, streken.join());
  const uren = Array.from({ length: 24 }, (_, h) => R.opUur(d, h)).filter(Boolean).length;
  check(`${d.id}: actief overdag, niet altijd`, uren >= 8);
}
check('dierenHier geeft in de stad dieren', R.dierenHier('stad', 12).length >= 4);
check('nachts andere dieren dan overdag', R.dierenHier('stad', 3).map((x) => x.id).join() !== R.dierenHier('stad', 14).map((x) => x.id).join());
check('een koe staat niet op het wad', R.spawnWeight('koe', 'westerkwartier', 12, 'wad') === 0);

// --- 3. ontdekken: dierenboek en prestatie ---
const ach = A.ACHIEVEMENTS.find((a) => a.id === 'dierenboek');
check('prestatie dierenboek bestaat en telt alle dieren', !!ach && ach.set === R.SET_DIEREN && ach.goal === R.DIEREN_TOTAL, JSON.stringify(ach));
for (const d of R.DIEREN) {
  check(`${d.id}: wereldkind ${d.kind}/${d.variant || '-'} wordt als dit dier herkend`, R.dierVanKind(d.kind, d.variant || null) === d);
  const open = R.boekRegel(d.id, false), dicht = R.boekRegel(d.id, true);
  check(`${d.id}: boekregel verborgen tot ontdekt`, open.naam === '???' && dicht.naam === d.naam && dicht.tekst === d.boek);
}
check('gans van het erf (goose) wordt herkend', R.dierVanKind('goose').id === 'gans' && R.dierVanKind('duck', 'goose').id === 'gans');
check('zwaan is een eigen dier', R.dierVanKind('duck', 'swan').id === 'zwaan' && R.dierVanKind('duck', 'drake').id === 'eend');
{
  const gezien = [];
  const w = { player: { x: 0, y: 0 }, wildlife: [{ kind: 'reiger', x: 3, y: 2 }, { kind: 'cow', x: 200, y: 0 }], addMessage: (m) => gezien.push(m) };
  W.ontdekDieren(w, 1);
  check('een reiger dichtbij komt in het dierenboek', gezien.some((m) => /Blauwe reiger/.test(m)), gezien.join());
  check('een koe ver weg niet', !gezien.some((m) => /Koe/.test(m)));
}

// --- 4. echte modellen (geen kistje, geen reservemodel) ---
const MODULES = { wildlife: W, countryside: C };
const gezienGeo = new Map();
for (const d of R.DIEREN) {
  const fn = MODULES[d.model.module] && MODULES[d.model.module][d.model.fn];
  check(`${d.id}: bouwfunctie ${d.model.fn} bestaat`, typeof fn === 'function');
  if (typeof fn !== 'function') continue;
  const mesh = fn(...d.model.args);
  let verts = 0, geo = null, nan = false;
  mesh.traverse((o) => {
    if (o.geometry && o.geometry.attributes.position) {
      verts += o.geometry.attributes.position.count;
      geo = geo || o.geometry;
      for (const v of o.geometry.attributes.position.array) if (!Number.isFinite(v)) nan = true;
    }
  });
  check(`${d.id}: model heeft echte geometrie (${verts} punten)`, verts >= 120, String(verts));
  check(`${d.id}: geen NaN in de vorm`, !nan);
  const sleutel = geo ? geo.uuid : d.id;
  check(`${d.id}: eigen model, niet gedeeld met een ander dier`, !gezienGeo.has(sleutel), `${d.id} = ${gezienGeo.get(sleutel)}`);
  gezienGeo.set(sleutel, d.id);
  if (d.model.module === 'wildlife') {
    const inWereld = W.buildWildlifeMesh3D({ kind: d.kind, variant: d.variant, bobSeed: 0, breed: 0, color: 0 });
    let g2 = null;
    inWereld.traverse((o) => { if (o.geometry && o.geometry.attributes.position && !g2) g2 = o.geometry; });
    check(`${d.id}: de wereld gebruikt het model van het register`, !!g2 && !!geo && g2.attributes.position.count === geo.attributes.position.count, `${g2 && g2.attributes.position.count} / ${geo && geo.attributes.position.count}`);
    for (const st of ['ground', 'fly', 'stand', 'swim', 'rust', 'zwem', 'duik']) {
      let ok = true;
      try { W.animateWildlifeMesh3D(inWereld, { kind: d.kind, variant: d.variant, state: st, speed: 0.5, stride: 1, z: 0, bobSeed: 0.4, diveT: 0.5, stateAge: 0.3, stateTimer: 1, fleeT: 0 }, 3.3); } catch (e) { ok = false; console.log(e.message); }
      check(`${d.id}: animatie in toestand ${st}`, ok);
    }
  }
}

// --- 5. kopen, houden en uitrusten ---
for (const d of R.DIEREN) {
  if (d.kopen) {
    check(`${d.id}: koopbaar met prijs en plek`, d.kopen.prijs > 0 && R.HOUDEN.includes(d.kopen.houden));
    check(`${d.id}: minstens een verbetering (verzorgen, trainen of accessoire)`, d.upgrades.length >= 1 && d.upgrades.every((u) => u.id && u.label && u.prijs > 0 && u.effect.length > 8));
  } else {
    check(`${d.id}: niet te koop, met een reden`, !!d.reden && d.reden.length > 15 && d.upgrades.length === 0);
  }
}
check('minstens een huisdier, vee en wild dier', ['huisdier', 'vee', 'wild'].every((s) => R.DIEREN.some((d) => d.soort === s)));
check('vee is te koop voor op het erf', R.DIEREN.filter((d) => d.soort === 'vee' && d.id !== 'eend').every((d) => d.kopen && d.kopen.houden === 'erf'));
check('huisdieren zijn te koop', R.DIEREN.filter((d) => d.soort === 'huisdier').every((d) => d.kopen));
{
  let b = B.leegBezit();
  check('te weinig geld: geen aankoop', B.koopBlokkade(b, 'kat', 10) === 'Te weinig geld');
  check('niet-koopbaar dier geeft de reden', /beschermd/.test(B.koopBlokkade(b, 'zeehond', 9999)));
  const r = B.koop(b, 'kat', 500);
  check('kat kopen lukt', !r.fout && r.prijs === 80 && r.bezit.dieren.length === 1);
  b = r.bezit;
  check('het origineel blijft ongewijzigd', B.leegBezit().dieren.length === 0);
  const r2 = B.koop(b, 'kat', 500);
  check('tweede kat krijgt een eigen naam', r2.dier.naam === 'Kat 2');
  check('plek loopt vol', B.koopBlokkade(r2.bezit, 'hond', 9999) === 'Daar is geen plek meer voor');
  const u = B.upgrade(b, b.dieren[0].uid, 'belletje', 100);
  check('accessoire kopen lukt eenmaal', !u.fout && B.upgradeBlokkade(u.bezit, b.dieren[0].uid, 'belletje', 100) === 'Zit er al op');
  const v1 = B.upgrade(b, b.dieren[0].uid, 'verzorgen', 100);
  const v2 = B.upgrade(v1.bezit, b.dieren[0].uid, 'verzorgen', 100);
  check('verzorgen is herhaalbaar en vult aan', v1.bezit.dieren[0].verzorgd === 25 && v2.bezit.dieren[0].verzorgd === 50 && B.stemming(v2.bezit.dieren[0]) === 'gaat wel');
  check('zonder verzorging raakt het dier uit conditie', B.verval(v2.bezit, 3).dieren[0].verzorgd === 20 && B.stemming(B.verval(v2.bezit, 3).dieren[0]) === 'verwaarloosd');
  const opslag = new Map();
  const store = { getItem: (k) => (opslag.has(k) ? opslag.get(k) : null), setItem: (k, v) => opslag.set(k, v) };
  B.saveBezit(store, 'gde-dieren-v1', u.bezit);
  const terug = B.loadBezit(store, 'gde-dieren-v1');
  check('opslag komt ongeschonden terug', terug.dieren.length === 1 && terug.dieren[0].upgrades.includes('belletje'));
  store.setItem('gde-dieren-v1', JSON.stringify({ versie: 1, dieren: [{ id: 'zeehond' }, { id: 'kat', upgrades: ['bestaatniet', 'belletje'] }, null] }));
  const schoon = B.loadBezit(store, 'gde-dieren-v1');
  check('kapotte of niet-koopbare opslag wordt opgeschoond', schoon.dieren.length === 1 && schoon.dieren[0].upgrades.join() === 'belletje');
  check('onleesbare opslag geeft een leeg bezit', B.loadBezit({ getItem: () => '{kapot' }, 'x').dieren.length === 0);
}
check('opslagsleutel is geregistreerd', /dieren: 'gde-dieren-v1'/.test(read('game/js/storagekeys.js')));
check('de dierenhoek staat in de winkel', /dierenSections/.test(read('game/js/shops.js')));

// --- 6. cutscenes gebruiken alleen dieren uit het register ---
const DIERWOORDEN = ['duif', 'kat', 'hond', 'koe', 'schaap', 'paard', 'gans', 'eend', 'zwaan', 'meeuw', 'vis', 'zeehond', 'reiger', 'kip', 'konijn', 'vogel', 'varken', 'geit', 'ezel', 'mus', 'raaf', 'kraai'];
const cutFiles = fs.readdirSync(new URL('../game/js/', import.meta.url)).filter((f) => /^cutscenes.*\.js$/.test(f));
const props = new Set();
for (const f of cutFiles) for (const m of read('game/js/' + f).matchAll(/kind:\s*'([a-z]+)'/g)) props.add(m[1]);
const cutDieren = [...props].filter((k) => DIERWOORDEN.includes(k));
check('cutscenes bevatten dieren', cutDieren.length >= 2, cutDieren.join());
for (const k of cutDieren) check(`cutscene-dier ${k} staat in het register`, R.DIEREN.some((d) => d.cutscene === k), k);
const host = read('game/js/cutscenehost.js');
for (const w of DIERWOORDEN) check(`cutscenehost heeft geen eigen kistjesversie van ${w}`, !new RegExp(`^\s*${w}:\s*\(\)\s*=>`, 'm').test(host));
const CM = await import('../game/js/cutscenemodels.js');
for (const d of R.DIEREN.filter((x) => x.cutscene)) {
  const src = CM.propSource(d.cutscene);
  check(`cutscene-dier ${d.id} komt uit het register (cutscenemodels)`, !!src && src.animal === d.kind && src.dier === d.id);
  check(`cutscene-dier ${d.id} is een bekende dierensoort`, CM.ANIMAL_KINDS.includes(d.kind));
}
for (const d of R.DIEREN.filter((x) => x.cutscene)) check(`cutscene-dier ${d.id} heeft een wildlife-model`, d.model.module === 'wildlife');

console.log(`dierenregister_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
