// AAA akte 1 en 2 (#955, #963): de tussen-beats en nasleep (missiebeats.js), de aankleding bij start en doel
// (missions_akte12.js) en de wachtclips telefoon en praten met een tweede wachtende (wachtprops.js).
//   node scripts/missiebeats_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import { KEY_WORD_RE } from './release/design_rules.mjs';

const { BEATS, tussenBeats, slotRij, beatDue, beatTekst } = await import('../game/js/missiebeats.js');
const { PLANNEN_AKTE12, applyAkte12 } = await import('../game/js/missions_akte12.js');
const { dressingPlan } = await import('../game/js/missiedecor.js');
const W = await import('../game/js/wachtprops.js');
const { idlePose } = await import('../game/js/idleclips.js');
const { neutralPose } = await import('../game/js/actoranim.js');

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const root = new URL('../game/js/', import.meta.url);
const bron = ['missions_defs.js', 'missions_nieuw.js', 'missions_akte2.js', 'missions.js'].map((f) => fs.readFileSync(new URL(f, root), 'utf8')).join('\n');

// --- de beats --------------------------------------------------------------------------------------------------
const MISSIES = ['Nul krassen, vijftienhonderd punten', 'Even pinnen', 'Het Loket', 'Kieken van boven', 'Wind tegen, beide kanten op', 'Het museum stond er al zo',
  'Al het vet van Grunn', 'Fatbikes tellen niet als fiets', 'Heel aankomen is ook een kunst', 'Een trekker-limo op de wierde', 'Geleend van de Friezen'];
for (const label of MISSIES) {
  ok(BEATS[label], `${label}: heeft beats`);
  ok(bron.includes(`label: '${label}'`) || bron.includes(`label: "${label}"`), `${label}: bestaat als missie`);
  const b = BEATS[label] || {};
  ok((b.tussen || []).length >= 1, `${label}: een tussen-beat`);
  ok(slotRij(label) && slotRij(label).length === 2, `${label}: een nasleep-rij`);
  for (const t of b.tussen || []) {
    const tekst = beatTekst(t);
    ok(tekst.split(/\s+/).length <= 16, `${t.id}: kort genoeg`, tekst);
    ok(!(tekst.match(KEY_WORD_RE) || []).length, `${t.id}: geen ruwe toets in de tekst`, tekst);
    ok(['stage', 'wp', 'tijd'].filter((k) => Number.isFinite(t[k])).length === 1, `${t.id}: precies een trigger`);
    ok(t.secs >= 3 && t.secs <= 6, `${t.id}: leesbare duur`);
  }
  if (slotRij(label)) ok(!(slotRij(label).join(' ').match(KEY_WORD_RE) || []).length, `${label}: nasleep zonder ruwe toets`);
}
const ids = Object.values(BEATS).flatMap((b) => b.tussen.map((t) => t.id));
ok(new Set(ids).size === ids.length, 'elke beat-id is uniek');
ok(!tussenBeats('bestaat niet').length && slotRij('bestaat niet') === null, 'onbekende missie: niets');
// een beat klinkt precies een keer, na zijn trigger en zijn uitstel
{
  const staat = { gezien: {}, getoond: new Set() };
  const L = 'Even pinnen'; // stage 1, na 5 s
  ok(beatDue(L, staat, { t: 3, stageIndex: 0 }).length === 0, 'stap nog niet bereikt: stil');
  ok(beatDue(L, staat, { t: 10, stageIndex: 1 }).length === 0, 'stap net bereikt: nog het uitstel');
  ok(beatDue(L, staat, { t: 15.5, stageIndex: 1 }).length === 1, 'na het uitstel klinkt hij');
  ok(beatDue(L, staat, { t: 40, stageIndex: 2 }).length === 0, 'en nooit twee keer');
  const tijd = { gezien: {}, getoond: new Set() };
  ok(beatDue('Fatbikes tellen niet als fiets', tijd, { t: 44 }).length === 0 && beatDue('Fatbikes tellen niet als fiets', tijd, { t: 46 }).length === 1, 'tijd-trigger');
  const wp = { gezien: {}, getoond: new Set() };
  ok(beatDue('Wind tegen, beide kanten op', wp, { t: 20, wpIndex: 2 }).length === 0 && beatDue('Wind tegen, beide kanten op', wp, { t: 25, wpIndex: 3 }).length === 0 && beatDue('Wind tegen, beide kanten op', wp, { t: 26.5, wpIndex: 3 }).length === 1, 'checkpoint-trigger');
  ok(beatDue(L, { gezien: {}, getoond: new Set() }, { t: 99, stageIndex: NaN }).length === 0, 'NaN-index doet niets');
}
// de runner roept de haken aan
const runner = fs.readFileSync(new URL('missions.js', root), 'utf8');
const aaa = fs.readFileSync(new URL('akte1_aaa.js', root), 'utf8');
ok(runner.includes('slotRij(def.label)') && runner.includes('stageIndex: chainState().stageIndex'), 'missions.js: nasleep en context');
ok(aaa.includes('beatDue(def.label') && aaa.includes('!isCinematicActive()'), 'akte1_aaa.js: beats nooit in een cutscene');

// --- de aankleding ---------------------------------------------------------------------------------------------
const defs = [
  { label: 'Even pinnen', stages: [{ kind: 'board' }, { kind: 'garage' }, { kind: 'goto', target: { shop: 'pand' } }] },
  { label: 'Al het vet van Grunn', stages: [{ kind: 'board' }, { kind: 'chase' }, { kind: 'goto', target: { label: 'De Oosterpoort' }, dressing: 'plein' }] },
  { label: 'Heel aankomen is ook een kunst', stages: [{ kind: 'board' }, { kind: 'goto', target: { label: 'Westerhornseweg' } }, { kind: 'goto', target: { label: 'Tussenstop op de wierde' } }, { kind: 'goto', target: { label: 'De kerkkelder in Usquert' } }] },
  { label: 'Een trekker-limo op de wierde', stages: [{ kind: 'board' }, { kind: 'goto', target: { label: 'De sloot bij Uithuizen' } }] },
  { label: 'Kieken van boven', stages: [{ kind: 'pigeon' }] },
  { label: 'Geleend van de Friezen', stages: [{ kind: 'goto', target: { storyBoat: true } }, { kind: 'goto', target: { label: 'De steiger bij Noordpolderzijl' } }] },
];
applyAkte12(defs);
ok(defs[0].stages[2].dressing === 'pandenpoen', 'M02: Pand & Poen aangekleed');
ok(defs[1].stages[1].dressing === 'groothandel' && defs[1].stages[2].dressing === 'plein', 'M07: groothandel erbij, plein blijft');
ok(defs[2].stages[2].dressing === 'wierdemarkt' && defs[2].stages[3].dressing === 'kerkkelder' && !defs[2].stages[1].dressing, 'M09: markt en kelder, de weg niet');
ok(defs[3].stages[1].dressing === 'slootkant' && defs[3].stages[0].dressing === 'quaderf', 'M10: erf en sloot aangekleed');
ok(defs[4].stages[0].dressing === 'duivenhok', 'M04: Bert met zijn duiven');
ok(defs[5].stages[1].dressing === 'klaassteiger' && !defs[5].stages[0].dressing, 'M11: Klaas wacht op de steiger, niet op het water');
applyAkte12(defs); // twee keer is niet erger
for (const kind of Object.keys(PLANNEN_AKTE12)) {
  const p = dressingPlan(kind);
  ok(p && p.props.length >= 4 && p.people.length >= 2, `${kind}: plan met props en figuren`);
  if (!p) continue;
  // niets in de stage-cirkel (4,5 m), zodat de speler naar de markering kan lopen
  for (const q of [...p.props, ...p.people]) ok(Math.hypot(q.along, q.side) > 4.5, `${kind}: niets in de cirkel`, `${q.kind || ''} ${q.along},${q.side}`);
  const tekst = JSON.stringify(p.props.filter((q) => q.kind === 'banner'));
  ok(!(tekst.match(KEY_WORD_RE) || []).length, `${kind}: geen ruwe toets op een bord`);
}

// --- #963: wachtclips en de maat -------------------------------------------------------------------------------------
ok(W.IDLE_CLIPS.includes('telefoon') && W.IDLE_CLIPS.includes('praten'), 'de clips telefoon en praten bestaan');
ok(W.PROP_KINDS.includes('bordje'), 'het A-bord is een wachtprop');
ok(W.waitDressingFor({ wacht: { prop: 'bordje' } }) === 'bordje', 'een stap kiest het A-bord');
for (const clip of ['telefoon', 'praten']) {
  const p = neutralPose();
  idlePose(p, clip, 1.5, 4);
  const v = [p.armR.z, p.armR.e, p.armL.z, p.head.x, p.head.y, p.head.z];
  ok(v.every(Number.isFinite), `${clip}: eindige pose`);
  ok(p.armR.z > 0.5, `${clip}: de rechterarm gaat omhoog`);
  const q = neutralPose(); idlePose(q, clip, 0, 4);
  ok(Math.abs(q.armR.z - 0.08) < 1e-6, `${clip}: begint in de neutrale stand`);
}
{
  const zonder = W.waitFigureFor({ label: 'Wacht', say: 'x', wacht: { figuur: true, seed: 0.4 } });
  const met = W.waitFigureFor({ label: 'Wacht', say: 'x', wacht: { figuur: true, seed: 0.4, maat: true } });
  ok(zonder.maat === null && met.maat, 'een maat alleen op verzoek');
  ok(zonder.plek === met.plek && zonder.shirt === met.shirt && zonder.skin === met.skin && JSON.stringify(zonder.rooster) === JSON.stringify(met.rooster), 'de eerste figuur blijft dezelfde met of zonder maat');
  ok(met.maat.rooster.some((r) => r.clip === 'praten') && met.maat.eigenRooster.some((r) => r.clip === 'praten'), 'beiden praten');
  ok(met.maat.rooster.every((r, i) => r.dur === met.maat.eigenRooster[i].dur), 'de beurten lopen gelijk op');
}
const akte2 = fs.readFileSync(new URL('akte2_plan.js', root), 'utf8');
ok(/seed: 0\.83, maat: true/.test(akte2), 'M11: bij de laatste kuip kletst Klaas met een boer');

console.log(fails ? `${fails} van ${n} controles mislukt` : `missiebeats_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
