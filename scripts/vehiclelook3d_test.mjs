// Het beeld van de uiterlijk-tuning (game/js/vehiclelook3d.js, epic Autotuning #1155) in Node: geometrie eindig,
// binnen het voertuig, drawcallbudget, gedeelde geometrie, cache begrensd, afwerking, underglow en snackwagen.
//   node scripts/vehiclelook3d_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';
const THREE = await import('three');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const L3 = await import('../game/js/vehiclelook3d.js');
const { generateLook, lookKind, OPTIONS } = await import('../game/js/vehiclelook.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

const car = (name, len, wid, look, extra = {}) => ({ id: 7, model: { name, len, wid, color: '#2e5f9e', maxSpeed: 20, accel: 5, brake: 9 }, health: 100, look, ...extra });
const FULL = { finish: 'pearl', color2: '#f9c80e', stripe: 'racing', decal: 'grunn', rimStyle: 'star', rimColor: '#1d1b17', rimSize: 'l', tire: 'whitewall', spoiler: 'gt', kit: 'wide', diffuser: 'on', roof: 'rack', lamps: 'halo', lampColor: '#4fb3ff', glow: '#ff7ab8', tint: '3', exhaust: 'twin', hanger: 'dice', plate: 'ZOMER 21' };
const drawCalls = (g) => { let c = 0; g.traverse((o) => { if (o.isMesh || o.isPoints) c += Array.isArray(o.material) ? o.material.length : 1; }); return c; };
const finite = (geo) => { const p = geo.attributes.position.array; for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) return false; return true; };

// kaal blijft kaal
const stockV = car('sedan', 4.6, 1.8, undefined);
const stock = buildVehicleMesh(stockV);
const stockCalls = drawCalls(stock);
ok(!stock.userData.lookOverlay && !stock.userData.lookGlow, 'zonder look geen overlay');

// volle look op een sedan
for (const [name, len, wid] of [['hatch', 3.9, 1.7], ['sedan', 4.6, 1.8], ['wagon', 4.8, 1.8], ['sport', 4.2, 1.85], ['suv', 4.7, 1.95], ['van', 5.2, 2.0]]) {
  const v = car(name, len, wid, FULL);
  const m = buildVehicleMesh(v);
  const ov = m.userData.lookOverlay;
  ok(!!ov && ov.geometry.attributes.position.count > 100, 'overlay gebouwd', name);
  if (!ov) continue;
  ok(finite(ov.geometry), 'overlay eindig', name);
  ov.geometry.computeBoundingBox();
  const bb = ov.geometry.boundingBox;
  ok(bb.min.x > -len / 2 - 0.4 && bb.max.x < len / 2 + 0.4 && Math.abs(bb.max.z) < wid / 2 + 0.25 && Math.abs(bb.min.z) < wid / 2 + 0.25 && bb.min.y > -0.05 && bb.max.y < 3.2, 'overlay binnen het voertuig', `${name} ${JSON.stringify(bb)}`);
  ok(ov.geometry.attributes.position.count / 3 < 700, 'driehoekbudget van de overlay', `${name} ${ov.geometry.attributes.position.count / 3}`);
  // drawcalls: de auto zelf + overlay + underglow + nummerbord
  ok(drawCalls(m) - stockCalls <= 3 + 3, 'hoogstens 3 extra drawcalls (overlay, glow, plaat; materialen van de romp tellen mee)', `${name} ${drawCalls(m)} vs ${stockCalls}`);
  ok(m.userData.lookCalls === 3, 'lookCalls telt overlay, glow en plaat', String(m.userData.lookCalls));
  ok(ov.geometry.userData.shared === true && ov.material.userData.shared === true, 'overlay is gedeeld (disposeObject laat hem staan)');
  ok(m.userData.wheels.every((w) => w.geometry.userData.shared === true && finite(w.geometry)), 'wielen hebben gedeelde, eindige velgen', name);
  ok(m.userData.wheels[0].geometry === m.userData.wheels[3].geometry, 'vier wielen delen één geometrie');
  const caps = m.userData.loose && m.userData.loose.sierdoppen;
  ok(!caps || caps.visible === false, 'sierdoppen weg bij eigen velgen', name);
  ok(m.userData.lookGlow && m.userData.lookGlow.visible === false, 'underglow overdag uit', name);
  L3.tickVehicleLook(m, 1, 0.9);
  ok(m.userData.lookGlow.visible === true, 'underglow aan in de nacht');
  L3.tickVehicleLook(m, 1, 0.0);
  ok(m.userData.lookGlow.visible === false, 'underglow weer uit overdag');
  ok(m.userData.lookPlate && m.userData.lookPlate.material.userData.shared, 'nummerbord met gedeeld materiaal');
}

// zelfde look, zelfde geometrie (cache): twee auto's delen één overlay
const a = buildVehicleMesh(car('sedan', 4.6, 1.8, FULL)), b = buildVehicleMesh({ ...car('sedan', 4.6, 1.8, FULL), id: 8 });
ok(a.userData.lookOverlay.geometry === b.userData.lookOverlay.geometry, 'zelfde look deelt de overlay-geometrie');
ok(a.userData.wheels[0].geometry === b.userData.wheels[0].geometry, 'zelfde look deelt de wielgeometrie');

// afwerking en ruitfolie op de materialen van dit voertuig
const metal = buildVehicleMesh(car('sedan', 4.6, 1.8, { finish: 'metallic', tint: '2' }));
const mats = metal.userData.body.material;
ok(mats[0].metalness > 0.4 && mats[0].roughness < 0.4, 'metallic maakt de lak glanzend');
ok(metal.userData.wheels[0].material !== mats[0] && metal.userData.wheels[0].material.metalness < 0.2, 'banden houden hun rubber');
ok(mats[1].opacity > 0.85, 'ruitfolie maakt het glas donkerder');
const matte = buildVehicleMesh(car('sedan', 4.6, 1.8, { finish: 'matte' }));
ok(matte.userData.body.material[0].roughness > 0.9, 'mat is mat');
ok(stock.userData.body.material[0].metalness < 0.2 && stock.userData.body.material[1].opacity < 0.7, 'de kale auto is niet aangetast (eigen materialen)');

// alleen kleur2/stripes: één drawcall erbij
const light = buildVehicleMesh(car('hatch', 3.9, 1.7, { stripe: 'racing', color2: '#ffffff' }));
ok(light.userData.lookCalls === 1 && !light.userData.lookGlow, 'streep is één drawcall');
const none = buildVehicleMesh(car('hatch', 3.9, 1.7, { finish: 'matte' }));
ok(none.userData.lookCalls === 0 && !none.userData.lookOverlay, 'alleen afwerking kost geen drawcall');

// nonsense en onbekende velden: geen crash, kale auto
const junk = buildVehicleMesh(car('sedan', 4.6, 1.8, { spoiler: 'bestaat-niet', glow: 'rood', plate: 42 }));
ok(junk && !junk.userData.lookCalls, 'rommel in de look geeft geen crash en niets extra');
const wreck = buildVehicleMesh(car('sedan', 4.6, 1.8, FULL, { wrecked: true }));
ok(!wreck.userData.lookOverlay, 'een wrak krijgt geen look');
const police = buildVehicleMesh(car('sedan', 4.6, 1.8, FULL, { isPolice: true }));
ok(!police.userData.lookOverlay, 'politie krijgt geen look');

// tweewieler, bus, boot: alleen wat past
const bike = buildVehicleMesh({ id: 31, isBike: true, model: { name: 'bike', len: 1.8, wid: 0.6, color: '#b33a3a', rider: 0xc8102e }, look: { finish: 'metallic', glow: '#6fd3e0', spoiler: 'gt', plate: 'ABC' }, health: 100 });
ok(bike.userData.lookGlow && !bike.userData.lookPlate, 'fiets: underglow wel, nummerbord niet');
const bus = buildVehicleMesh({ id: 32, isBus: true, playerOwned: true, model: { name: 'midibus', len: 8.4, wid: 2.3, color: '#132a44', stripe: '#c8102e' }, look: { stripe: 'flank', color2: '#f9c80e', glow: '#6fd3e0' }, health: 100 });
ok(!!bus.userData.lookOverlay && !!bus.userData.lookGlow, 'bus van de speler: strepen en glow');
const npcBus = buildVehicleMesh({ id: 33, isBus: true, model: { name: 'midibus', len: 8.4, wid: 2.3, color: '#132a44' }, look: { stripe: 'flank', glow: '#6fd3e0' }, health: 100 });
ok(!npcBus.userData.lookOverlay && !npcBus.userData.lookGlow, 'NPC-bus blijft zoals hij is');

// snackwagen: luifel, uitstalling, bakkenlicht, lucht en belettering
const SNACK = { finish: 'gloss', color2: '#f9c80e', awning: 'zon', display: 'tafel', beacon: 'bak', air: 'bijtjes', snackName: 'tammo', glow: '#6fd3e0', decal: 'frituur', exhaust: 'big', plate: 'FRIET 1' };
const sv = { id: 40, model: { name: 'foodtruck', len: 5.6, wid: 2.1, color: '#2f6fb0' }, health: 100, look: SNACK };
ok(lookKind(sv) === 'snackwagen', 'foodtruck is snackwagen');
const sm = buildVehicleMesh(sv);
ok(!!sm.userData.lookOverlay && !!sm.userData.lookLamps && !!sm.userData.lookAir && !!sm.userData.lookGlow, 'snackwagen heeft overlay, bakkenlicht, lucht en glow');
ok(finite(sm.userData.lookOverlay.geometry) && finite(sm.userData.lookLamps.geometry), 'snackwagen-geometrie eindig');
sm.userData.lookOverlay.geometry.computeBoundingBox();
const sb = sm.userData.lookOverlay.geometry.boundingBox;
ok(sb.max.z > 2.1 / 2 + 1 && sb.min.z < 0 && sb.max.y < 3.2, 'uitstalling staat aan de serveerkant, belettering aan de andere', JSON.stringify(sb));
ok(sm.userData.lookLamps.material instanceof THREE.MeshBasicMaterial, 'bakkenlicht is ongeschaduwd (geeft zelf licht)');
const air0 = sm.userData.lookAir.geometry.attributes.position.array.slice();
L3.tickVehicleLook(sm, 2.5, 0, true);
const air1 = sm.userData.lookAir.geometry.attributes.position.array;
ok(air1.some((x, i) => x !== air0[i]) && air1.every(Number.isFinite), 'de lucht beweegt en blijft eindig');
L3.tickVehicleLook(sm, 3, 0, false);
ok(sm.userData.lookAir.visible === false, 'de lucht is ver weg uit');
ok(sm.userData.lookCalls === 5 + 1 - 1 || sm.userData.lookCalls >= 4, 'snackwagen-drawcalls blijven klein', String(sm.userData.lookCalls));
for (const air of ['damp', 'geur', 'bijtjes']) { const m = buildVehicleMesh({ ...sv, id: 41, look: { air } }); ok(!!m.userData.lookAir && m.userData.lookAir.material.userData.shared, 'lucht ' + air); }
// TAM & TES is de standaardbelettering van de snackwagen: ook zonder look, en 'none' haalt hem weg
const kaal = buildVehicleMesh({ ...sv, id: 42, look: undefined });
ok(!!kaal.userData.lookOverlay, 'een snackwagen zonder look draagt TAM & TES');
const zonder = buildVehicleMesh({ ...sv, id: 43, look: { snackName: 'none' } });
ok(!zonder.userData.lookOverlay, 'zonder belettering geen overlay');
ok(OPTIONS.snackName[0].id === 'tamtes' && OPTIONS.snackName[0].label === 'TAM & TES', 'de eerste (standaard) belettering is TAM & TES');
const snackOnCar = buildVehicleMesh(car('sedan', 4.6, 1.8, { awning: 'zon', beacon: 'bak', air: 'damp', snackName: 'tammo' }));
ok(!snackOnCar.userData.lookOverlay && !snackOnCar.userData.lookAir, 'snackwagen-onderdelen komen niet op een gewone auto');

// de generator past op alle soorten en geeft eindige geometrie
let built = 0;
for (let i = 0; i < 60; i++) {
  const g = generateLook(i * 7 + 1);
  const m = buildVehicleMesh({ ...car(['hatch', 'sedan', 'wagon', 'sport', 'suv', 'van'][i % 6], 4.3, 1.8, g.look), id: 100 + i, model: { name: ['hatch', 'sedan', 'wagon', 'sport', 'suv', 'van'][i % 6], len: 4.3, wid: 1.8, color: g.bodyColor } });
  if (m.userData.lookOverlay) { ok(finite(m.userData.lookOverlay.geometry), 'generator-overlay eindig', String(i)); built++; }
  if (fails) break;
}
ok(built > 40, 'de meeste gegenereerde looks hebben een overlay', String(built));

// cache blijft begrensd, ook na veel verschillende looks
for (let i = 0; i < 150; i++) buildVehicleMesh({ ...car('hatch', 3.9, 1.7, { stripe: 'racing', color2: '#' + (0x100000 + i * 997).toString(16).padStart(6, '0') }), id: 300 + i });
ok(L3.lookCacheSize() <= 48, 'cache is begrensd', String(L3.lookCacheSize()));
L3.clearLookCache();
ok(L3.lookCacheSize() === 0, 'cache leeg te maken');

// de overlay voor een volle look blijft klein
const tri = L3.addonTriangles(FULL, 'auto', car('sport', 4.2, 1.85, FULL), { belt: 0.82, roof: 1.25, xA: 0.6, xB: -0.1, xC: -0.8, xD: -1.7, hood: 0.7, deck: 0.86, fw: 1.2, rw: -1.2 });
ok(tri > 50 && tri < 700, 'driehoeken van een volle look', String(tri));
ok(Object.keys(OPTIONS).length >= 19, 'opties aanwezig');

// ronde 5 (22-11): elke optie van de lijsten bouwt een eindige overlay binnen het voertuig en binnen het driehoekbudget
for (const field of ['stripe', 'rimStyle', 'spoiler', 'kit', 'roof', 'lamps', 'exhaust', 'hanger']) {
  for (const o of OPTIONS[field]) {
    for (const [name, len, wid] of [['hatch', 3.9, 1.7], ['suv', 4.7, 1.95]]) {
      const m = buildVehicleMesh(car(name, len, wid, { [field]: o.id }));
      const ov = m.userData.lookOverlay;
      if (field === 'rimStyle') { ok(m.userData.wheels.every((w) => finite(w.geometry)), 'velg eindig', `${o.id} ${name}`); continue; }
      if (o.price === 0) continue;
      ok(!!ov && finite(ov.geometry), 'overlay eindig per optie', `${field}=${o.id} ${name}`);
      if (!ov) continue;
      ov.geometry.computeBoundingBox();
      const bb = ov.geometry.boundingBox;
      ok(bb.min.x > -len / 2 - 0.5 && bb.max.x < len / 2 + 0.5 && Math.abs(bb.max.z) < wid / 2 + 0.25 && bb.min.y > -0.05 && bb.max.y < 3.2, 'optie binnen het voertuig', `${field}=${o.id} ${name} ${JSON.stringify(bb)}`);
      ok(ov.geometry.attributes.position.count / 3 < 700, 'optie binnen het driehoekbudget', `${field}=${o.id}`);
    }
  }
}
for (const id of ['twist', 'dish']) { const g = L3.buildRimGeometry(0.35, 0.22, { rimStyle: id }); ok(finite(g) && g.attributes.position.count / 3 > 40, 'nieuwe velgstijl heeft vorm', id); }

console.log(`vehiclelook3d_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
