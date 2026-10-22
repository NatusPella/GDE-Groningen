// Studentenfietsen (#402): de regels (studentenfiets.js), de plaats in het schademodel (vehicledamage.js fietsStaat), de naam,
// dat de oude fietsen van het verkeer (trafficfleet.js) de staat meekrijgen en dat het mesh de afwijkingen echt tekent.
//   node scripts/studentenfiets_test.mjs
import './node3d.mjs';

const THREE = await import('three');
await import('../game/js/player.js');
const SF = await import('../game/js/studentenfiets.js');
const DM = await import('../game/js/vehicledamage.js');
const { buildVehicleMesh, updateBikeStaat } = await import('../game/js/models3d_vehicles.js');
const { vehicleDisplayName: vehicleName } = await import('../game/js/vehiclenames.js');
const T = await import('../game/js/trafficfleet.js');

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// --- de regels -------------------------------------------------------------------------------------------------
{
  const rng = seeded(5);
  let leeg = 0, ongeldig = 0;
  const telt = { student: {}, standaard: {} };
  for (const wijk of ['student', 'standaard']) {
    for (let i = 0; i < 4000; i++) {
      const s = SF.studentStaat(wijk, rng);
      if (!SF.DEFECTEN.some((d) => s[d])) leeg++;
      if (Object.keys(s).length !== SF.DEFECTEN.length || Object.values(s).some((x) => typeof x !== 'boolean')) ongeldig++;
      for (const d of SF.DEFECTEN) if (s[d]) telt[wijk][d] = (telt[wijk][d] || 0) + 1;
    }
  }
  check('een studentenstaat heeft altijd minstens één afwijking', leeg === 0, leeg);
  check('de staat heeft vier booleans', ongeldig === 0);
  check('in een studentenwijk komen alle afwijkingen vaker voor dan in een gewone wijk', SF.DEFECTEN.every((d) => telt.student[d] > telt.standaard[d]), JSON.stringify(telt));
  check('blauwe banden zijn een minderheid, rammelen komt het vaakst voor', telt.student.blauw < telt.student.rammel && telt.student.blauw < 2000);
  check('onbekende wijk valt terug op gewoon', SF.kansenVoor('onbekend') === SF.kansenVoor('standaard'));
  const a = SF.studentStaat('student', seeded(9)), b = SF.studentStaat('student', seeded(9));
  check('zelfde rng, zelfde staat', JSON.stringify(a) === JSON.stringify(b));
  check('de tekst noemt de afwijkingen', SF.staatTekst({ spatbord: true, licht: true, blauw: false, rammel: true }) === 'scheef voorspatbord, geen voorlicht en rammelt' && SF.staatTekst({ blauw: true }) === 'blauwe banden' && SF.staatTekst({}) === '' && SF.staatTekst(null) === '');
  check('de sleutel voor de geometrie', SF.staatSleutel({ spatbord: true, licht: true, blauw: true }) === 'SLB' && SF.staatSleutel({ rammel: true }) === '' && SF.staatSleutel(null) === '');
  check('rammelen kan alleen rijdend, en vaker als het sneller gaat', SF.rammelInterval(0) === 0 && SF.rammelInterval(1) === 0 && SF.rammelInterval(2, () => 0.5) > SF.rammelInterval(6, () => 0.5) && SF.rammelInterval(6, () => 0.5) >= 0.28 && SF.rammelInterval(NaN) === 0);
  const tekst = JSON.stringify([SF.DEFECT_TEKST]);
  check('geen merknamen in de teksten', !/gazelle|batavus|swapfiets|omafiets|vanmoof|giant/i.test(tekst));
}

// --- het schademodel -----------------------------------------------------------------------------------------------
{
  const nieuw = { isBike: true, model: { name: 'bike', len: 1.75, wid: 0.5 } };
  const s0 = DM.fietsStaat(nieuw);
  check('een nieuwe fiets mankeert niets', !s0.spatbord && !s0.licht && !s0.blauw && !s0.rammel);
  const oud = { isBike: true, model: { name: 'bike', old: true, len: 1.75, wid: 0.5, student: { spatbord: true, licht: false, blauw: true, rammel: true } } };
  const s1 = DM.fietsStaat(oud);
  check('een studentenfiets heeft zijn staat uit het model', s1.spatbord && !s1.licht && s1.blauw && s1.rammel);
  const geraakt = { isBike: true, model: { name: 'bike', len: 1.75, wid: 0.5 }, dentLog: [[0.8, 0, 0.7]] };
  const s2 = DM.fietsStaat(geraakt);
  check('een klap voorop maakt het spatbord scheef', s2.spatbord && !s2.licht);
  const hard = { isBike: true, model: { name: 'bike', len: 1.75, wid: 0.5 }, dentLog: [[0.8, 0, 0.7], [0.8, 0.1, 0.6]] };
  check('een harde klap voorop maakt ook het voorlicht los', DM.fietsStaat(hard).licht);
  const achter = { isBike: true, model: { name: 'bike', len: 1.75, wid: 0.5 }, dentLog: [[-0.8, 0, 2]] };
  check('een klap achterop raakt het voorspatbord niet', !DM.fietsStaat(achter).spatbord);
  check('rare invoer blijft heel', DM.fietsStaat(null).spatbord === false && DM.fietsStaat({}).licht === false);
  check('de schadetekst noemt de staat van een fiets en niet van een auto', /Fiets: scheef voorspatbord/.test(DM.schadeTekst(oud, 1.75, 0.5)) && !/Fiets:/.test(DM.schadeTekst({ model: { name: 'hatch' } }, 3.8, 1.7)));
  const eerder = DM.schadeTekst({ isBike: true, model: { name: 'bike' } }, 1.75, 0.5);
  check('een nieuwe fiets heeft geen fietsregel in de schadetekst', !/Fiets:/.test(eerder), eerder);
}

// --- de naam ----------------------------------------------------------------------------------------------------------
if (vehicleName) {
  const naam = (m) => vehicleName({ id: 1, model: { name: 'bike', old: true, ...m } });
  const blauw = naam({ student: { blauw: true } }), gewoon = naam({ student: { rammel: true } });
  check('een fiets met blauwe banden is de blauwbandige leenfiets, zonder merk', /Blauwbandige leenfiets/.test(JSON.stringify(blauw)) && /Studentenbarrel/.test(JSON.stringify(gewoon)), JSON.stringify([blauw, gewoon]));
}

// --- het verkeer: oude fietsen krijgen de staat, vooral in een studentenwijk ------------------------------------------
{
  // een nepkaart met één studentenbuurt op (0, 0) en één gewone buurt ver weg: het verkeer kiest per buurt
  const map = { meta: { neighbourhoodPoints: [{ x: 0, y: 0, name: 'Paddepoel' }, { x: 9000, y: 9000, name: 'Vinkhuizen' }] } };
  const rng = seeded(11);
  let oud = 0, zonder = 0, ongeldig = 0, onverlicht = 0;
  for (let i = 0; i < 4000; i++) {
    const v = T.pickBikeVariant(map, 0, 0, rng, { hour: 14 });
    if (!v || !v.old || v.senior) continue; // de oude fiets van een oudere is geen studentenfiets
    oud++;
    if (!v.student) zonder++;
    else if (!SF.DEFECTEN.some((d) => v.student[d])) ongeldig++;
    if (v.student && v.student.licht && !v.noLight) onverlicht++;
  }
  check('elke oude fiets in het verkeer heeft een studentenstaat met minstens één afwijking', oud > 200 && zonder === 0 && ongeldig === 0, JSON.stringify({ oud, zonder, ongeldig }));
  check('zonder voorlicht betekent ook onverlicht in het donker', onverlicht === 0);
  const aandeel = (x, y) => { let o = 0, t = 0; const r = seeded(3); for (let i = 0; i < 4000; i++) { const v = T.pickBikeVariant(map, x, y, r, { hour: 14 }); t++; if (v && v.old) o++; } return o / t; };
  check('in een studentenwijk zijn er meer oude fietsen dan in een gewone wijk', aandeel(0, 0) > aandeel(9000, 9000) * 1.5, [aandeel(0, 0), aandeel(9000, 9000)]);
}

// --- het mesh tekent het -----------------------------------------------------------------------------------------------
{
  const bike = (id, student, extra = {}) => ({ id, isBike: true, model: { name: 'bike', old: true, len: 1.75, wid: 0.5, color: '#4a5a6a', rider: '#2f5c8a', ...(student ? { student } : {}) }, ...extra });
  const body = (v) => { let g = null; buildVehicleMesh(v).traverse((o) => { if (o.isMesh && o.geometry.attributes.position.count > 200 && !g) g = o.geometry; }); return g; };
  const wheels = (v) => { const out = []; buildVehicleMesh(v).traverse((o) => { if (o.isMesh && o.geometry.attributes.color) out.push(o.geometry); }); return out; };
  const hash = (g) => { let h = 0; const p = g.attributes.position.array; for (let i = 0; i < p.length; i++) h = (h * 31 + Math.round(p[i] * 1000)) | 0; return h; };
  const vorm = body(bike(2, null)), zonderLicht = body(bike(2, { licht: true })), scheef = body(bike(2, { spatbord: true })), alleen = body(bike(2, { rammel: true }));
  check('een fiets zonder voorlicht heeft minder driehoeken dan een gewone', vorm && zonderLicht && zonderLicht.attributes.position.count < vorm.attributes.position.count, [vorm && vorm.attributes.position.count, zonderLicht && zonderLicht.attributes.position.count]);
  check('een scheef voorspatbord staat anders maar kost geen driehoeken', scheef.attributes.position.count === vorm.attributes.position.count && hash(scheef) !== hash(vorm));
  check('rammelen verandert niets aan het mesh', hash(alleen) === hash(vorm));
  const blauw = new THREE.Color(0x2f6fb0);
  const heeftBlauw = (v) => wheels(v).some((g) => { const c = g.attributes.color; for (let i = 0; i < c.count; i++) if (Math.abs(c.getX(i) - blauw.r) < 0.01 && Math.abs(c.getY(i) - blauw.g) < 0.01 && Math.abs(c.getZ(i) - blauw.b) < 0.01) return true; return false; });
  check('blauwe banden zijn blauw, gewone banden niet', heeftBlauw(bike(3, { blauw: true })) && !heeftBlauw(bike(3, null)) && !heeftBlauw(bike(3, { rammel: true })));
  const geraakt = body(bike(2, null, { dentLog: [[0.8, 0, 1.4]] }));
  check('een geraakte fiets krijgt bij een nieuw mesh een scheef spatbord en geen voorlicht', geraakt.attributes.position.count < vorm.attributes.position.count);
  // een klap tijdens het rijden: het frame van het bestaande mesh wordt vervangen
  const levend = bike(2, null);
  const mesh = buildVehicleMesh(levend);
  const voor = mesh.children[0].geometry.attributes.position.count;
  check('zonder klap verandert het mesh niet', updateBikeStaat(mesh, levend) === false);
  levend.dentLog = [[0.8, 0, 0.7]];
  const scheefGeraakt = updateBikeStaat(mesh, levend);
  const naScheef = mesh.children[0].geometry.attributes.position.count;
  levend.dentLog = [[0.8, 0, 0.7], [0.8, 0.1, 0.6]];
  const lichtLos = updateBikeStaat(mesh, levend);
  const naLicht = mesh.children[0].geometry.attributes.position.count;
  check('een klap voorop maakt het spatbord scheef, een tweede breekt het voorlicht af, en daarna verandert er niets meer', scheefGeraakt && naScheef === voor && lichtLos && naLicht < voor && updateBikeStaat(mesh, levend) === false, [voor, naScheef, naLicht]);
  const rug = bike(2, null, { dentLog: [[-0.8, 0, 2]] });
  check('een klap achterop verandert niets', updateBikeStaat(buildVehicleMesh(rug), rug) === false);
  check('een wrak, fatbike en bakfiets doen niet mee', updateBikeStaat(buildVehicleMesh(bike(5, null)), { ...bike(5, null), wrecked: true, dentLog: [[0.8, 0, 2]] }) === false && updateBikeStaat(null, levend) === false);
  const fat = { id: 9, isBike: true, model: { name: 'bike', fat: true, student: { licht: true }, len: 1.9, wid: 0.7, color: '#4a5a6a', rider: '#2f5c8a' } };
  const fatPlain = { ...fat, model: { ...fat.model, student: undefined } };
  check('een fatbike doet niet mee', hash(body(fat)) === hash(body(fatPlain)));
}

console.log(bad ? `${bad} van ${n} mislukt` : `studentenfiets_test: alles goed (${n} controles)`);
process.exit(bad ? 1 : 0);
