// Houdingen en variatie van de modulaire mensen (personages 2, 24-11): elke vaste houding van een voorbijganger (zitten, bellen, appen,
// praten, hurken, vissen, sjouwen, kraam, boos, muziek) krijgt een basis uit de state-machine en armen met IK, nooit een T-pose of NaN;
// props verschijnen en verdwijnen met de houding; elke figuur uit buildPersonMesh is modulair (behalve zwemkleding); lengte, bouw,
// kinderen en hoeden volgen het zaad. Samen spelen: alles volgt uit zaad en houding, dus een gast ziet hetzelfde.
//   node scripts/modularpose_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const THREE = await import('three');
const M = await import('../game/js/modularpeople.js');
const P = await import('../game/js/models3d_people.js');
for (const r of ['man', 'vrouw']) M.registerModularRig(r, JSON.parse(fs.readFileSync(new URL(`../game/models/mensen/${r}.json`, import.meta.url))), fs.readFileSync(new URL(`../game/models/mensen/${r}.bin`, import.meta.url)));
P.setModularPlayerLooks(true);

let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fails++; console.log('FAIL', msg); } };
const v = new THREE.Vector3();
const bonePos = (m, name, out = v) => { m.updateMatrixWorld(true); return m.userData.qBones[m.userData.qIdxBy[name]].getWorldPosition(out); };
const finite = (m) => { m.updateMatrixWorld(true); const b = m.userData.body, g = b.geometry; for (let i = 0; i < g.attributes.position.count; i += 7) { v.fromBufferAttribute(g.attributes.position, i); b.applyBoneTransform(i, v); if (!Number.isFinite(v.x + v.y + v.z)) return false; } return true; };

// 1. alle houdingen: eindige botten, de basis klopt
const POSES = ['sit', 'phone', 'call', 'talk', 'crouch', 'fish', 'hengel', 'hengel-uit', 'hengel-ruk', 'hengel-haal', 'haul', 'angry', 'vendor', 'muziek'];
for (const pose of POSES) for (const female of [false, true]) {
  const seed = 900 + POSES.indexOf(pose) * 3 + (female ? 1 : 0);
  const m = P.buildPersonMesh(0x3f6ea8, 0xd9a47a, { seed, variant: female ? 'female' : 'male', role: 'voetganger' });
  ok(m.userData.qRig, `${pose}: modulair`);
  P.registerPoseSource(seed, { pose, state: 'alive', persistent: true });
  for (let f = 0; f < 90; f++) P.animatePersonWalk(m, 0, 1 / 30);
  ok(finite(m), `${pose} ${female ? 'vrouw' : 'man'}: eindig`);
  const ud = m.userData;
  ok(ud.qPosed === pose, `${pose}: houding vastgelegd`);
  const hips = bonePos(m, 'Hips').y / m.scale.y;
  if (pose === 'sit' || pose === 'fish') ok(hips > 0.4 && hips < 0.6, `${pose}: heup op zithoogte (${hips.toFixed(2)})`);
  else if (pose === 'crouch') ok(hips < 0.7, `${pose}: heup laag (${hips.toFixed(2)})`);
  else ok(hips > 0.7, `${pose}: heup staand (${hips.toFixed(2)})`);
  const head = bonePos(m, 'Head').y / m.scale.y;
  ok(head > 0.7 && head < 1.9, `${pose}: hoofd op een redelijke hoogte (${head.toFixed(2)})`);
  if (pose === 'call') { const w = bonePos(m, 'WristR').clone(), h = bonePos(m, 'Head'); ok(w.distanceTo(h) < 0.35 * m.scale.y, `bellen: de hand bij het hoofd (${w.distanceTo(h).toFixed(2)})`); ok(ud.qProps && ud.qProps.phone && ud.qProps.phone.visible, 'bellen: een telefoon in de hand'); }
  if (pose === 'phone') { ok(ud.qProps && ud.qProps.phone && ud.qProps.phone.visible, 'appen: een telefoon'); const w = bonePos(m, 'WristR').y / m.scale.y; ok(w > 0.9 && w < 1.5, `appen: de hand op borsthoogte (${w.toFixed(2)})`); }
  if (pose === 'fish' || /^hengel/.test(pose)) ok(ud.qProps && ud.qProps.rod && ud.qProps.rod.visible, `${pose}: een hengel`);
  if (pose === 'muziek') ok(ud.qProps && ud.qProps.guitar && ud.qProps.guitar.visible, 'muziek: een gitaar');
  // weer weg: geen houding, geen props, de state-machine vrij
  P.unregisterPoseSource(seed);
  for (let f = 0; f < 30; f++) P.animatePersonWalk(m, 1.4, 1 / 30);
  ok(!ud.qPosed && ud.qParams !== ud.qPoseP && !ud.crouch, `${pose}: na de houding weer los`);
  if (ud.qProps) for (const k in ud.qProps) ok(!ud.qProps[k].visible, `${pose}: prop ${k} weer weg`);
  ok(finite(m), `${pose}: na de houding eindig`);
}

// 2. een uitgeschakelde (dode) mens of een mens zonder bron blijft ongemoeid
{
  const m = P.buildPersonMesh(0x3f6ea8, 0xd9a47a, { seed: 4242, role: 'voetganger' });
  P.registerPoseSource(4242, { pose: 'sit', state: 'dead' });
  for (let f = 0; f < 20; f++) P.animatePersonWalk(m, 1.4, 1 / 30);
  ok(!m.userData.qPosed, 'dood: geen houding');
  P.unregisterPoseSource(4242);
}

// 3. alles uit buildPersonMesh is modulair, behalve zwemkleding en opts.procedural
{
  const cases = [{ seed: 1 }, { seed: 2, role: 'voetganger' }, { seed: 3, role: 'chauffeur' }, { seed: 4, role: 'ambulance' }, { seed: 5, look: { age: 'child' } },
    { seed: 6, look: { age: 'old' } }, { seed: 7, variant: 'female' }, { seed: 8, cop: true }, {}];
  for (const o of cases) { const m = P.buildPersonMesh(0x6a6a6a, 0xc89070, o); ok(m.userData.qRig, `buildPersonMesh ${JSON.stringify(o)} modulair`); }
  ok(!P.buildPersonMesh(0x6a6a6a, 0xc89070, { seed: 9, swim: 'trunks', swimColor: 0xc8261e }).userData.qRig, 'zwemkleding blijft het eigen model');
  ok(!P.buildPersonMesh(0x6a6a6a, 0xc89070, { seed: 9, procedural: true }).userData.qRig, 'opts.procedural blijft het eigen model');
}

// 4. maat en bouw uit het zaad: stabiel, geloofwaardig, kinderen klein, ouderen iets kleiner
{
  const man = [], vrouw = [], wides = [], kids = [], olds = [];
  for (let i = 0; i < 300; i++) {
    const a = M.buildModularPerson(i * 7.3 + 1, { female: false }), b = M.buildModularPerson(i * 7.3 + 1, { female: false });
    ok(a.scale.y === b.scale.y && a.scale.x === b.scale.x, `maat stabiel per zaad ${i}`);
    man.push(a.scale.y); wides.push(a.scale.x / a.scale.y);
    vrouw.push(M.buildModularPerson(i * 7.3 + 2, { female: true }).scale.y);
    kids.push(M.buildModularPerson(i + 5, { female: i % 2 === 0, child: true }).scale.y);
    olds.push(M.buildModularPerson(i + 9, { female: false, old: true }).scale.y);
  }
  const sd = (xs) => { const mu = xs.reduce((s, x) => s + x, 0) / xs.length; return Math.sqrt(xs.reduce((s, x) => s + (x - mu) ** 2, 0) / xs.length); };
  ok(sd(man) > 0.02 && sd(man) < 0.06, `lengte varieert (sd ${sd(man).toFixed(3)})`);
  ok(Math.max(...man) <= 1.095 && Math.min(...man) >= 0.9, `man binnen grenzen (${Math.min(...man).toFixed(3)}-${Math.max(...man).toFixed(3)})`);
  ok(Math.min(...wides) >= 0.93 && Math.max(...wides) <= 1.12 && sd(wides) > 0.02, `bouw varieert binnen 0,93-1,12 (${Math.min(...wides).toFixed(3)}-${Math.max(...wides).toFixed(3)})`);
  ok(Math.max(...kids) < 0.85 * Math.min(...man) + 0.1 && Math.min(...kids) > 0.5, `kinderen klein (${Math.min(...kids).toFixed(2)}-${Math.max(...kids).toFixed(2)})`);
  ok(sd(olds) > 0, 'ouderen verschillen ook');
}

// 5. variatie: geen twee dezelfde naast elkaar, meer dan één hoofd per kapsel, hoeden zeldzaam, kleding volgt de rol
{
  const heads = new Set(), same = [];
  let hats = 0, prev = null, dup = 0;
  for (let i = 0; i < 400; i++) {
    const m = P.buildPersonMesh(0x6a6a6a, 0xd9a47a, { seed: 3000 + i * 13, variant: 'male', role: 'voetganger' });
    const l = m.userData.qLook;
    heads.add(l.parts.hoofd); if (l.cap) hats++;
    const key = [l.parts.hoofd, l.parts.romp, l.parts.benen, l.parts.voeten, l.shirt, l.pants].join('|');
    if (key === prev) dup++;
    prev = key;
  }
  ok(heads.size >= 5, `${heads.size} verschillende hoofden bij 400 voetgangers`);
  ok(hats >= 5 && hats <= 120, `hoeden zijn zeldzaam maar er zijn er (${hats}/400)`);
  ok(dup <= 2, `bijna nooit twee dezelfde achter elkaar (${dup})`);
}

// 6. alledaagse gebaren van wie stilstaat: ze komen voor, zijn eindig, zijn niet synchroon en verdwijnen als iemand loopt
{
  const people = [], first = [], seen = new Set();
  for (let i = 0; i < 6; i++) { people.push(P.buildPersonMesh(0x3f6ea8, 0xd9a47a, { seed: 7700 + i * 11, role: 'voetganger' })); first.push(null); }
  let phoneSeen = false, finiteAll = true;
  for (let f = 0; f < 30 * 70; f++) {
    people.forEach((m, i) => {
      P.animatePersonWalk(m, 0, 1 / 30);
      const fd = m.userData.qFid;
      if (fd && fd.name) { seen.add(fd.name); if (first[i] === null) first[i] = f / 30; if (fd.name === 'phone' && m.userData.qProps && m.userData.qProps.phone && m.userData.qProps.phone.visible) phoneSeen = true; }
    });
    if (f % 150 === 0) for (const m of people) if (!finite(m)) finiteAll = false;
  }
  ok(finiteAll, 'gebaren: eindig');
  ok(first.every((x) => x !== null), `gebaren: iedereen doet er binnen 70 s een (${first.map((x) => x && x.toFixed(0)).join(', ')} s)`);
  ok(new Set(first.map((x) => Math.round(x))).size >= 4, 'gebaren: niet synchroon (verschillende starttijden)');
  ok(seen.size >= 2 && phoneSeen, `gebaren: meerdere soorten (${[...seen].join(', ')}) en de telefoon komt in beeld`);
  const m = people[0];
  for (let f = 0; f < 60; f++) P.animatePersonWalk(m, 1.4, 1 / 30);
  ok(!(m.userData.qFid && m.userData.qFid.name) && !(m.userData.qProps && m.userData.qProps.phone && m.userData.qProps.phone.visible), 'gebaren: weg zodra hij loopt');
}

// 7. een eigen kop per figuur: haarkleur, huidtint, baard, kaal, uitdrukking en gezichtsvorm uit het zaad; geen gedegenereerde petdelen
{
  const hair = new Set(), skin = new Set(), moods = new Set(), face = new Set(), combo = new Set();
  let beards = 0, n = 0;
  for (let i = 0; i < 400; i++) {
    const m = P.buildPersonMesh(0x6a6a6a, 0xd9b48f, { seed: 6000 + i * 7, variant: i % 3 ? 'male' : 'female', role: 'voetganger' });
    const l = m.userData.qLook; n++;
    hair.add(l.hair); skin.add(l.skin); moods.add(l.mood); if (l.face) face.add(l.face.map((x) => x.toFixed(2)).join());
    if (l.wear && l.wear.includes('baard')) beards++;
    combo.add([l.parts.hoofd, l.hair, l.skin, l.face && l.face[0].toFixed(2)].join('|'));
  }
  ok(hair.size >= 8, `haarkleuren: ${hair.size}`);
  ok(skin.size >= 6, `huidtinten: ${skin.size}`);
  ok(moods.has('neutraal') && moods.has('vrolijk') && moods.has('mokkend'), `uitdrukkingen: ${[...moods].join(', ')}`);
  ok(face.size > 100, `gezichtsvormen: ${face.size}`);
  ok(beards >= 8 && beards <= 80, `baarden zijn er maar niet overal (${beards} van ${n})`);
  ok(combo.size > 340, `bijna elke figuur een eigen kop (${combo.size} van ${n})`);
  // twee spelers van een voetbalploeg (zelfde kit, ander zaad) hebben niet dezelfde kop
  const heads = new Set();
  for (let i = 0; i < 11; i++) { const m = P.buildPersonMesh(0xc8261e, 0xd9b48f, { seed: 9811 + i * 13, variant: 'male', skinVary: true, look: { age: 'adult', top: 'tee' } }); heads.add(m.userData.qLook.parts.hoofd + m.userData.qLook.hair + m.userData.qLook.skin); }
  ok(heads.size >= 9, `een elftal: ${heads.size} verschillende koppen`);
  // mood-wissel
  const m = P.buildPersonMesh(0x6a6a6a, 0xd9b48f, { seed: 321, variant: 'male', role: 'voetganger' });
  const t0 = m.userData.body.geometry.index.count;
  ok(M.setModularMood(m, 'verbaasd') && M.setModularMood(m, 'mokkend') && !M.setModularMood(m, 'mokkend') && !M.setModularMood(m, 'boos'), 'uitdrukking wisselen kan, dubbel of onbekend niet');
  ok(m.userData.body.geometry.index.count === t0, 'dezelfde driehoekentelling bij elke uitdrukking');
  // geen draadvlakken in een pet of platte pet: elke driehoek heeft oppervlak
  for (const cap of ['cap', 'flatcap', 'beanie']) {
    const q = M.buildModularFromAppearance({ seed: 5, variant: 'male', skin: 0xd9a47a, look: { hat: cap, hatColor: 0x3a4d6e } }), g = q.userData.body.geometry, p = g.attributes.position, ix = g.index;
    let bad = 0;
    for (let t = 0; t < ix.count; t += 3) { const A = new THREE.Vector3().fromBufferAttribute(p, ix.getX(t)), B = new THREE.Vector3().fromBufferAttribute(p, ix.getX(t + 1)), C = new THREE.Vector3().fromBufferAttribute(p, ix.getX(t + 2)); if (ix.getX(t) !== ix.getX(t + 1) && new THREE.Vector3().crossVectors(B.sub(A), C.sub(A)).length() < 1e-9 && ix.getX(t) > 0) bad++; }
    ok(bad === 0, `${cap}: geen draadvlakken (${bad})`);
  }
}

console.log(fails ? `modularpose: ${fails} van ${n} FAILED` : `modularpose: alle ${n} checks groen`);
process.exit(fails ? 1 : 0);
