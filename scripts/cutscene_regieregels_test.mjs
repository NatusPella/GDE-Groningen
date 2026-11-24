// Regieregels van de linter (#1324): een scène met opzettelijke fouten moet alle regels raken (as-sprong, camera in geometrie,
// afgekapt hoofd, spreker van achteren, te snelle snedes, ondertitel te kort, door een object lopen), een nette scène geen enkele;
// en de baseline mag alleen dalen.
//   node scripts/cutscene_regieregels_test.mjs
import { compileScene } from '../game/js/cutscript.js';
import { propFoot } from '../game/js/cutscenemodels.js';
import { lintUnit, kaderVulling, kaderVan, REGIE_DREMPELS } from './lib/cutscene_lint.mjs';
import { regieTelling, vergelijkBaseline, REGIE_REGELS } from './cutscene_lint.mjs';

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };

const lijn = (speaker, text, at, dur) => ({ speaker, text, at, dur });
const unitVan = (id, def, lines, duration) => ({ id, group: 'Missies', def, lines, duration, scene: compileScene(def, { lines, duration, skipValidate: true }), footOf: propFoot, rhythm: null, status: 'ok' });
const actors = { a: { look: 'tammo', at: [0, 0.6], face: 270, speaker: ['Tammo'] }, b: { look: 'tessa', at: [0, -0.6], face: 90, speaker: ['Tessa'] } };

// --- de nette scène: twee mensen, alle camera's aan één kant van de as, van voren, ruim op tijd
{
  const lines = [lijn('Tammo', 'Zullen we gaan?', 0.5, 2.5), lijn('Tessa', 'Nog even niet.', 3.2, 2.5), lijn('Tammo', 'Goed dan, nog even.', 6.0, 2.6)];
  const def = { id: 'netjes', actors, shots: [
    { t: 0, shot: 'cut', at: [4.5, 0, 1.6], look: 'mid:a,b@1.5', fov: 40 },
    { t: 'L0+0.1', shot: 'cut', at: [2.6, -1.0, 1.6], look: 'a@1.6', fov: 32 },
    { t: 'L1', shot: 'cut', at: [2.6, 1.0, 1.6], look: 'b@1.6', fov: 32 },
    { t: 'L2', shot: 'cut', at: [2.6, -1.0, 1.6], look: 'a@1.6', fov: 32 },
  ] };
  const v = lintUnit(unitVan('netjes', def, lines, 9.5), {}).filter((x) => ['CS-C11', 'CS-C12', 'CS-C13', 'CS-C14', 'CS-T11', 'CS-V06', 'CS-C06'].includes(x.regel));
  ok(v.length === 0, 'een nette scène heeft geen regievondsten', v.map((x) => `${x.regel} ${x.bericht}`).join('; '));
}

// --- de foute scène
const lines = [
  lijn('Tammo', 'Ik zeg iets heel belangrijks.', 0.5, 3.0),      // 0: van achteren
  lijn('Tessa', 'En ik antwoord je.', 3.6, 3.0),                   // 1
  lijn('Tammo', 'Mijn hoofd past niet in beeld.', 6.8, 3.0),       // 2: afgekapt hoofd
  lijn('Tessa', 'Dat zie ik.', 10.0, 2.5),                         // 3: as-sprong
  lijn('Tammo', 'Deze zin is veel te lang om in zo weinig tijd te lezen, echt waar.', 12.8, 4.0), // 4: de volgende regel komt te vroeg
  lijn('Tessa', 'Ja.', 14.3, 1.5),                                 // 5
  lijn('Tammo', 'Wat staat daar?', 16.0, 2.5),                     // 6: camera in een container
  lijn('Tessa', 'Een auto voor de lens.', 19.0, 3.0),              // 7: een auto vult het kader
];
const def = {
  id: 'fout', actors: { ...actors, c: { look: 'tammo', at: [0.1, 4], face: 270 } },
  props: { box: { kind: 'container', at: [8, 0, 0] }, wagen: { kind: 'auto', at: [3.2, 3.5, 0], face: 0 } },
  cues: [{ t: 0.2, actor: 'c', walk: [[0.1, -4]] }, { t: 'L6', actor: 'a', walk: [[11, 0.3]] }],
  shots: [
    { t: 0, shot: 'cut', at: [0, 3.2, 1.6], look: 'a@1.6', fov: 34 },                   // achter Tammo: zijn achterhoofd
    { t: 'L1', shot: 'cut', at: [2.6, 1.0, 1.6], look: 'b@1.6', fov: 32 },
    { t: 'L2', shot: 'cut', at: [2.6, 0.6, 1.0], look: 'a@1.0', fov: 24 },              // schouders wel, hoofd niet
    { t: 'L3', shot: 'cut', at: [-2.6, -1.0, 1.6], look: 'b@1.6', fov: 32 },            // de andere kant van de as
    { t: 'L3+1.0', shot: 'cut', at: [2.6, -1.0, 1.6], look: 'a@1.6', fov: 32 },         // terug: nog een sprong
    { t: 'L4', shot: 'cut', at: [-2.6, 1.0, 1.6], look: 'b@1.6', fov: 32 },
    { t: 'L4+0.9', shot: 'cut', at: [3.5, 0.5, 1.7], look: 'mid:a,b@1.5', fov: 40 },     // te snel achter elkaar
    { t: 'L4+1.8', shot: 'cut', at: [3.0, -0.5, 1.7], look: 'mid:a,b@1.5', fov: 38 },
    { t: 'L4+2.7', shot: 'cut', at: [4.0, 0.2, 1.8], look: 'mid:a,b@1.5', fov: 42 },
    { t: 'L6', shot: 'cut', at: [8, 0, 1.5], look: 'b@1.5', fov: 40 },                   // in de container
    { t: 'L7', shot: 'cut', at: [3.2, 6.2, 1.2], look: 'b@1.5', fov: 40 },               // achter de auto
  ],
};
const u = unitVan('fout', def, lines, 22.5);
const v = lintUnit(u, {});
const heeft = (regel, re = /./) => v.some((x) => x.regel === regel && re.test(x.bericht));
const lijst = v.map((x) => `${x.regel} ${x.bericht}`).join('\n  ');
ok(heeft('CS-C06'), 'as-sprong (180-gradenregel) gevonden', lijst);
ok(heeft('CS-C11'), 'afgekapt hoofd gevonden', lijst);
ok(heeft('CS-C12', /staat in box|vult/), 'camera in of achter geometrie gevonden', lijst);
ok(heeft('CS-C12', /wagen/), 'een auto die het kader vult gevonden', lijst);
ok(heeft('CS-C13', /regel 0/), 'spreker van achteren (kijkt weg) gevonden', lijst);
ok(heeft('CS-C14'), 'te snelle snedes gevonden', lijst);
ok(heeft('CS-T11', /regel 4/), 'ondertitel te kort in beeld gevonden', lijst);
ok(heeft('CS-V06'), 'door een object of personage lopen gevonden', lijst);

// kadervulling: een container recht voor de lens vult alles, een ver weg vrijwel niets
const cam = { position: { x: 0, y: 0, z: 1.5 }, lookAt: { x: 10, y: 0, z: 1.5 }, fov: 40 };
ok(kaderVulling(cam, { x: 2.5, y: 0, h: 0, a: 0 }, propFoot('container')) > 0.9, 'container voor de lens vult het kader');
ok(kaderVulling(cam, { x: 60, y: 0, h: 0, a: 0 }, propFoot('container')) < 0.05, 'container ver weg vult bijna niets');
ok(kaderVulling(cam, { x: -3, y: 0, h: 0, a: 0 }, propFoot('container')) === 0, 'container achter de camera vult niets');
const k = kaderVan(cam);
ok(k({ x: 10, y: 1, z: 1.5 }).x > 0, '+y is rechts in beeld voor een camera langs +x');
ok(REGIE_DREMPELS.objectVulling === 0.3, 'de drempel voor een object in het kader is 30%');

// baseline: alleen dalen
const rap = [{ id: 'X', vondsten: [{ regel: 'CS-C13' }, { regel: 'CS-C13' }, { regel: 'CS-T01' }] }];
const t = regieTelling(rap);
ok(t['CS-C13'].X === 2 && !t['CS-T01'], 'de telling neemt alleen regieregels mee');
ok(vergelijkBaseline(t, { 'CS-C13': { X: 2 } }).stijging.length === 0, 'gelijk aan de baseline is goed');
ok(vergelijkBaseline(t, { 'CS-C13': { X: 1 } }).stijging.length === 1, 'boven de baseline is een fout');
ok(vergelijkBaseline(t, { 'CS-C13': { X: 3 } }).daling.length === 1, 'onder de baseline mag (en kan vastgezet worden)');
ok(vergelijkBaseline({ 'CS-C12': { Y: 1 } }, {}).stijging.length === 1, 'een nieuwe cutscene met een vondst is een stijging');
ok(REGIE_REGELS.includes('CS-C06') && REGIE_REGELS.includes('CS-V05'), 'de bestaande as- en kijkregel vallen onder de baseline');

console.log(fails ? `cutscene_regieregels_test: ${fails} van ${n} FOUT` : `cutscene_regieregels_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
