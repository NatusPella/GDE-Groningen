// AAA akte 3 en 4, tweede laag (game/js/akte34_beats.js): openingsbeeld, tussenbeats, nasleep, aankleding en wachtspullen.
//   node scripts/akte34_beats_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const B = await import('../game/js/akte34_beats.js');
const { buildNieuwDefs, applyNieuw } = await import('../game/js/missions_nieuw.js');
const { DRESSING_KINDS } = await import('../game/js/missiedecor.js');
const { PROP_KINDS, waitFigureFor, waitDressingFor } = await import('../game/js/wachtprops.js');

let n = 0, bad = 0;
const ok = (naam, c, info = '') => { n++; if (!c) { bad++; console.log('FAIL', naam, info); } };
const eindig = (v) => typeof v === 'number' && Number.isFinite(v);

// 1. de pose is puur, eindig en rustig (geen pan: de camera beweegt hooguit 0,3 m/s)
const f = { x: 100, y: 200 }, a = { x: 130, y: 200 };
const p0 = B.openingPose(f, a, 0), p3 = B.openingPose(f, a, 3.6);
ok('pose is eindig', [p0.position.x, p0.position.y, p0.position.z, p0.lookAt.x, p0.lookAt.y, p0.lookAt.z, p0.fov].every(eindig));
ok('de camera staat opzij van de lijn, op afstand', Math.abs(p0.position.y - 200) > 7 && p0.position.z > 1.5 && p0.position.z < 4);
ok('de kruip is kleiner dan 0,4 m/s (pan-budget)', Math.hypot(p3.position.x - p0.position.x, p3.position.y - p0.position.y) / 3.6 <= 0.4);
ok('het lookAt beweegt niet (geen pan)', p3.lookAt.x === p0.lookAt.x && p3.lookAt.y === p0.lookAt.y);
ok('de andere kant ligt aan de overkant', B.openingPose(f, a, 0, { zij: -1 }).position.y * B.openingPose(f, a, 0, { zij: 1 }).position.y > 0 && B.openingPose(f, a, 0, { zij: -1 }).position.y !== p0.position.y);
ok('een ver doel kijkt hooguit 36 m vooruit', Math.hypot(B.openingPose(f, { x: 5000, y: 200 }, 0).lookAt.x - f.x, 0) <= 18.1);
ok('kapotte invoer geeft null', B.openingPose(null, a) === null && B.openingPose(f, { x: NaN, y: 1 }) === null && B.openingPose({ x: 'a', y: 1 }, a) === null);
ok('dezelfde plek geeft nog een pose', B.openingPose(f, f, 0) !== null);

// 2. de kant kiezen tegen gebouwen
const muur = (zij) => ({ buildingsNear: (x, y) => [{ pts: [[x - 3, y - 3], [x + 3, y - 3], [x + 3, y + 3], [x - 3, y + 3]] }] });
ok('zonder kaart kiest hij kant 1', B.kiesZij(null, f, a) === 1);
const poseY = B.openingPose(f, a, 0, { zij: 1 }).position.y;
const alleenKant1 = { buildingsNear: (x, y) => (Math.abs(y - poseY) < 1 ? [{ pts: [[x - 4, y - 4], [x + 4, y - 4], [x + 4, y + 4], [x - 4, y + 4]] }] : []) };
ok('een gebouw op kant 1 geeft kant -1', B.kiesZij(alleenKant1, f, a) === -1);
ok('gebouwen aan beide kanten geven geen beeld', B.kiesZij(muur(), f, a) === 0);

// 3. de beats lopen een keer, op tijd
{
  const msgs = [];
  const world = { addMessage: (t) => msgs.push(t), players: [], map: null };
  const S = { t: 0, aaa34: { cam: false, camT: 0, gedaan: new Set(), anker: null } };
  const st = { beats: [{ na: 3, tekst: 'Een' }, { na: 6, tekst: 'Twee' }] };
  S.t = 2; B.beatTik(world, st, S, 0.1);
  ok('voor de tijd geen beat', msgs.length === 0);
  S.t = 3.2; B.beatTik(world, st, S, 0.1); B.beatTik(world, st, S, 0.1);
  ok('de eerste beat komt een keer', msgs.length === 1 && msgs[0] === 'Een');
  S.t = 9; B.beatTik(world, st, S, 0.1);
  ok('de tweede beat komt erbij', msgs.length === 2 && msgs[1] === 'Twee');
  B.beatStop(S);
  ok('beatStop ruimt de staat op', S.aaa34 === null);
  B.beatTik(world, st, S, 0.1);
  ok('zonder staat doet beatTik niets', msgs.length === 2);
}

// 4. de nasleep
{
  const msgs = [];
  const world = { addMessage: (t) => msgs.push(t) };
  B.toonNasleep(world, { label: 'X', nasleep: ['een', '', 3, 'twee'] });
  ok('nasleep toont alleen echte regels', msgs.length === 2 && msgs[0] === 'een' && msgs[1] === 'twee');
  ok('zonder nasleep niets', B.nasleepRegels({}).length === 0 && B.nasleepRegels(null).length === 0);
}

// 5. de defs: alles wat hier is toegevoegd klopt met de stappen
const id = (x, y) => ({ x, y, road: 'snap' });
const map = new Proxy({}, { get: (t, k) => (k === 'then' ? undefined : () => []) });
const defs = buildNieuwDefs({ map, walk: id, drive: id, models: {} });
applyNieuw(defs);
const by = (label) => defs.find((d) => d.label === label);
for (const k of Object.keys(B.PLANNEN_AKTE34)) ok(`aankleding ${k} is geregistreerd`, DRESSING_KINDS.includes(k));
for (const plan of Object.values(B.PLANNEN_AKTE34)) {
  ok('elk plan heeft props en mensen', plan.props.length >= 3 && plan.people.length >= 2);
  ok('geen onderdeel verder dan 16 m van het anker', [...plan.props, ...plan.people].every((q) => Math.hypot(q.along, q.side) <= 16));
}
const gebruikt = new Set();
let beats = 0, camera = 0, nasleep = 0;
for (const d of defs) {
  if (Array.isArray(d.nasleep)) { nasleep++; ok(`${d.label}: nasleep is tekst`, d.nasleep.every((t) => typeof t === 'string' && t.length > 10 && t.length < 160)); }
  for (const s of d.stages || []) {
    if (s.dressing) gebruikt.add(s.dressing);
    if (s.openCam) camera++;
    for (const b of s.beats || []) {
      beats++;
      ok(`${d.label}: beat heeft tekst en tijd`, typeof b.tekst === 'string' && b.tekst.length > 8 && eindig(b.na) && b.na > 0 && b.na < 200);
      ok(`${d.label}: sting is bekend`, !b.sting || ['stap', 'bijna', 'start'].includes(b.sting));
    }
  }
}
ok('minstens zeven missies uit de nieuwe boog hebben nasleep (M12, M16 en M21 staan in de hoofdlijst van missions.js)', nasleep >= 7, String(nasleep));
ok('minstens vijftien beats', beats >= 15, String(beats));
ok('minstens vier openingsbeelden', camera >= 4, String(camera));
for (const k of Object.keys(B.PLANNEN_AKTE34)) ok(`aankleding ${k} hangt aan een stap`, gebruikt.has(k) || (k === 'overweg' || k === 'heliplek'));

// 6. de nieuwe wachtspullen
for (const k of ['kaartspel', 'radio', 'landkaart']) {
  ok(`wachtprop ${k} is kiesbaar`, PROP_KINDS.includes(k));
  const plan = waitFigureFor({ label: 'x', wacht: { figuur: true, prop: k } });
  ok(`wachtprop ${k} geeft een figuur met clips`, plan && plan.prop === k && plan.rooster.length >= 3 && plan.rooster.every((r) => r.dur >= 3));
  ok(`waitDressingFor kiest ${k}`, waitDressingFor({ wacht: { prop: k } }) === k);
}
const m13 = by('Het containerlabyrint'), m20 = by('Het beleg van Bourtange');
ok('M13 wacht bij de kooi met een radio en bij de container met een landkaart', m13.stages[1].wacht.prop === 'radio' && m13.stages[3].wacht.prop === 'landkaart');
ok('M20 houdt de noordwal met een kaartspel', m20.stages.find((s) => s.kind === 'hold' && /noordwal/.test(s.label)).wacht.prop === 'kaartspel');

// 6b. M15 (Kist Kees-lijn): opening bij het toestel, radio in de lucht, sleutelmoment, landing en een tweede nasleepregel
const m15 = by('Laag over het graan');
ok('M15: de eerste stap heeft een openingsbeeld en een beat', !!m15.stages[0].openCam && m15.stages[0].beats.length >= 1);
ok('M15: de lucht heeft drie beats (radio, kermis, sleutelmoment) in oplopende tijd', m15.stages[1].beats.length === 3 && m15.stages[1].beats.every((b, i, a) => i === 0 || b.na > a[i - 1].na));
ok('M15: de landing heeft twee beats met een toetsplaatje, zonder ruwe toetsnaam', m15.stages[2].beats.length === 2 && m15.stages[2].beats.some((b) => /{SHIFT}/.test(b.tekst)) && m15.stages.flatMap((s) => s.beats).every((b) => !/(Shift|Spatie|Ctrl|WASD)/.test(b.tekst) && b.tekst.split(' ').length <= 16));
ok('M15: nasleep met twee regels', m15.nasleep.length === 2);

// 7. de haken zitten in de runner
const run = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
ok('missions.js start, tikt en stopt de beats en toont de nasleep', /beatStart\(world, st, S/.test(run) && /beatTik\(world, st, S, dt\)/.test(run) && /beatStop\(S\)/.test(run) && /toonNasleep\(world, def\)/.test(run));

console.log(`akte34_beats_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
