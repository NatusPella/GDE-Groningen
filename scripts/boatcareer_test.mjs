// Water (#1376): de verhaalingang Z1 tot en met Z3 met migratie voor oude saves, de rangmomenten van de loopbaan Water via de rang-haak, de terugblik,
// de Vaarkaart en de aanmelding van De Drie Zusters als baan van het vak Water. Pure test: geen Electron, geen wereld; de opslag is een nepobject.
//   node scripts/boatcareer_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import './node3d.mjs';
import { STEPS, ADDED_STEPS, nextStoryStep, stepDone, missionIndexOf } from '../game/js/storyarc.js';
import { milestoneFlagsForDone } from '../game/js/storymilestones.js';
import * as R from '../game/js/rankmoments.js';
import * as L from '../game/js/loopbaan.js';
import * as Live from '../game/js/loopbaanlive.js';
import * as W from '../game/js/boatcareer.js';
import { registerStoryQueries } from '../game/js/storyquery.js';
import { speakerColor } from '../game/js/speakers.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = (start = {}) => {
  const m = new Map(Object.entries(start));
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) };
};
const nepWereld = () => ({ money: 0, msgs: [], addMessage(text) { this.msgs.push(text); }, coopDeel() {} });
const rustig = { started: true, held: [] };
const naarNiveau = (w, vak, niv) => Live.loopbaanTel(w, vak, { xp: L.XP_DREMPELS[niv - 1] - Live.getProfiel().vakken[vak].xp });
const speelAlles = (w) => { const g = []; for (let i = 0; i < 40; i++) { const id = Live.rankHook.tik(1, w, rustig); if (id) g.push(id); } return g; };
const script = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const scenes = new Map(script.scenes.map((s) => [s.id, s]));

// --- de verhaalingang: drie toegevoegde stappen na K2, met een scène en migratie voor oude saves -------------------------------------------------
const Z = ['Z1', 'Z2', 'Z3'];
const idx = (id) => STEPS.findIndex((s) => s.id === id);

t('Z1 tot en met Z3 zijn toegevoegde activiteiten op een reisdoel met hun eigen scène', () => {
  for (const id of Z) {
    const s = STEPS[idx(id)];
    assert.ok(s && ADDED_STEPS.includes(id), `${id} is een toegevoegde stap`);
    assert.equal(s.kind, 'activity');
    assert.ok(s.built && s.added === true && !s.reward && !s.cost, `${id}: gebouwd, zonder beloning of kosten`);
    assert.ok(s.goal.type === 'reis' && s.goal.scene === id && s.scenes.includes(id) && s.goal.r >= 250, `${id}: reisdoel met scène`);
    assert.ok(s.lead && s.lead[1].length > 20, `${id}: een lead`);
  }
});
t('de stappen staan na K2 en vóór M12, en Z1 en Z2 zetten de vlaggen water en binnenvaart', () => {
  assert.ok(idx('K2') < idx('Z1') && idx('Z1') < idx('Z2') && idx('Z2') < idx('Z3') && idx('Z3') < idx('M12'));
  assert.equal(STEPS[idx('Z1')].unlocks, W.WATER_VLAG);
  assert.equal(STEPS[idx('Z2')].unlocks, W.BINNENVAART_VLAG);
  assert.ok(!STEPS[idx('Z3')].unlocks, 'Z3 zet geen vlag');
});
t('de dertig missies staan nog in dezelfde volgorde (hoofdstuklijn 28-11: M05 staat voor M04)', () => {
  const m = STEPS.filter((s) => s.kind === 'mission').map((s) => s.id).join();
  assert.equal(m, ['M01', 'M02', 'M03', 'M05', 'M04', ...[...Array(25)].map((_, i) => 'M' + String(i + 6).padStart(2, '0'))].join());
});

// een save van vóór deze ronde: alle stappen behalve Z1 tot en met Z3
const OUD = STEPS.filter((s) => !Z.includes(s.id));
const saveTot = (laatste) => {
  const k = OUD.findIndex((s) => s.id === laatste);
  const done = new Set(OUD.slice(0, k + 1).map((s) => s.id));
  const passed = new Set([...done].map((id) => STEPS.find((s) => s.id === id)).filter((s) => s && s.kind === 'mission').map((s) => missionIndexOf(s.mission)));
  return { done, mp: (i) => passed.has(i) };
};
const huidige = (laatste) => { const s = saveTot(laatste); return nextStoryStep((id) => s.done.has(id), s.mp, () => false); };
t('een oude save vóór het invoegpunt speelt Z1 tot en met Z3; voorbij het invoegpunt herhaalt hij ze niet', () => {
  assert.equal(huidige('K2').id, 'Z1');
  assert.notEqual(huidige('M11').id, 'Z1');
  assert.notEqual(huidige('M12').id, 'Z2');
  const s = saveTot('M21');
  assert.ok(Z.every((id) => stepDone(idx(id), (x) => s.done.has(x), s.mp)), 'een save voorbij M21 heeft ze als gedaan (geen blokkade)');
  assert.equal(huidige('M30').id, 'F6', 'een uitgespeelde oude save speelt alleen het slot');
});
t('de stappen geven geen extra wagen-vlaggen of beloning', () => {
  const tot = (l) => new Set(OUD.slice(0, OUD.findIndex((s) => s.id === l) + 1).map((s) => s.id));
  for (const l of ['M13', 'M21']) assert.equal(milestoneFlagsForDone(new Set([...tot(l), ...Z])).join(), milestoneFlagsForDone(tot(l)).join());
});

t('de scènes bestaan, zijn kort en laten de bijfiguren zichzelf noemen', () => {
  for (const id of Z) {
    const sc = scenes.get(id);
    assert.ok(sc && sc.step === id, `${id}: scène`);
    assert.ok(sc.lines.length + sc.regie.length <= 32, `${id}: kort genoeg`);
    assert.ok(sc.lines.every((l) => l.text.split(/\s+/).length <= 25), `${id}: elke beurt kort`);
    assert.ok(sc.lines.every((l) => l.textOnly || ['Tammo', 'Tessa'].includes(l.speaker)), `${id}: nog geen opname voor de bijfiguren (stem komt in de TTS-ronde; een korte regel van Tammo of Tessa mag een bestaande opname hergebruiken)`);
  }
  const sp = (id) => new Set(scenes.get(id).lines.map((l) => l.speaker));
  assert.ok(sp('Z1').has('Wiebe Hazenberg') && sp('Z1').has('Noor'), 'Z1: Wiebe en Noor');
  assert.ok(sp('Z2').has('Schipper Lammert') && !sp('Z2').has('Wiebe Hazenberg'), 'Z2: Lammert, Wiebe is er niet (hij ligt thuis)');
  assert.ok(sp('Z3').has('Dina') && sp('Z3').has('De loods'), 'Z3: Dina en de loods');
  const zegtZelf = (id, wie, re) => scenes.get(id).lines.some((l) => l.speaker === wie && re.test(l.text));
  assert.ok(zegtZelf('Z1', 'Wiebe Hazenberg', /Wiebe Hazenberg, schipper/) && zegtZelf('Z1', 'Noor', /Noor hier, de gids-student/), 'Z1: ze noemen eerst hun naam en rol');
  assert.ok(zegtZelf('Z2', 'Schipper Lammert', /Lammert Veenstra, schipper/), 'Z2: Lammert noemt zijn naam, zijn band met Wiebe en zijn schip');
  assert.ok(zegtZelf('Z3', 'Dina', /Dina, sluiswachter/), 'Z3: Dina noemt zichzelf');
  assert.ok(scenes.get('Z2').lines.some((l) => /Noorderspoor Water/.test(l.text)), 'Z2 stelt het bedrijf voor');
  assert.ok(scenes.get('Z3').lines.filter((l) => l.speaker === 'De loods').every((l) => l.channel === 'radio'), 'de loods is alleen een stem op de marifoon');
  assert.ok(!scenes.get('Z1').lines.some((l) => /Klaas/.test(l.text)), 'Z1 noemt geen personage dat nog niet is ingeleid');
  for (const id of Z) assert.ok(!/winter|sneeuw|ijs\b/i.test(scenes.get(id).lines.map((l) => l.text).join(' ')), `${id}: altijd zomer`);
  assert.ok(!scenes.get('Z1').lines.some((l) => /bloed|ziekenhuis|gebroken/i.test(l.text)), 'Z1: geen getoond leed');
});

// --- de baan en het vak ----------------------------------------------------------------------------------------------------------------------

t('De Drie Zusters is een baan van het vak Water, met een vaardigheid bij Kapitein', () => {
  assert.equal(L.vakVanBaan('binnenvaart'), 'water');
  assert.ok(L.banenVan('water').includes('binnenvaart'));
  const v = L.vaardigheidVan('water', 4);
  assert.equal(v.titel, 'Kapitein');
  assert.match(v.wat, /De Drie Zusters/);
  assert.equal(L.vaardigheidVan('water', 3), null, 'het stadsspoor heeft geen nieuwe handeling');
  assert.equal(L.vaardigheidVan('water', 5).titel, 'Kapitein', 'de hoogste blijft gelden');
  assert.equal(L.vaardigheidVan('water', 6).titel, 'Zeebaas van de Waddenzee');
});

// --- de rangmomenten -------------------------------------------------------------------------------------------------------------------------

const moments = () => R.rankMomentsOf('water');
t('het vak Water heeft een moment voor rang 2 tot en met 6, geldig en in het register; rang 4 heeft er twee (met en zonder terugblik)', () => {
  for (let rang = 2; rang <= 6; rang++) {
    const ms = moments().filter((x) => x.rang === rang);
    assert.ok(ms.length >= 1, `water rang ${rang}`);
    assert.equal(ms.length, rang === 4 ? 2 : 1);
    for (const m of ms) {
      assert.ok(m.id.startsWith(`water-rang${rang}`) && m.id.length <= 60);
      assert.equal(R.momentProblem({ id: m.id, vak: 'water', rang, scene: m.scene }), '', m.id);
    }
  }
});
t('alle sprekers van de momenten en de terugblik zijn bekend en hebben een eigen kleur', () => {
  const namen = new Set();
  for (const regels of Object.values(W.MOMENTEN)) for (const [wie] of regels) namen.add(wie);
  for (const l of W.terugblikTalk('water')) namen.add(l.speaker);
  for (const [wie] of W.provincieTerugblik()) namen.add(wie);
  for (const wie of namen) assert.ok(wie === 'Tammo' || wie === 'Anita' || speakerColor(wie) !== '#8a8a8a', `${wie}: kleur`);
  assert.ok([...namen].every((w) => !/Tessa/.test(w)), "Tessa heet in de spreeksleutel 'Anita'");
  for (const regels of Object.values(W.MOMENTEN)) for (const [, tekst] of regels) assert.ok(tekst.split(/\s+/).length <= 25, `kort: ${tekst}`);
});
t('een stijging speelt het moment van die rang één keer, in volgorde, en alleen voor deze speler', () => {
  Live.rankHook.leeg();
  Live.zetProfielVoorTest(null, nepOpslag());
  const w = nepWereld();
  naarNiveau(w, 'water', 2);
  assert.deepEqual(Live.rankHook.wachtrij(), ['water-rang2']);
  assert.deepEqual(speelAlles(w), ['water-rang2']);
  naarNiveau(w, 'water', 5); // een sprong over rang 3 en 4: de momenten spelen in volgorde
  assert.deepEqual(speelAlles(w), ['water-rang3', 'water-rang4-terugblik', 'water-rang5'], 'zonder vlag binnenvaart: rang 4 met terugblik');
  assert.ok(L.momentGezien(Live.getProfiel(), 'water-rang3'));
  Live.rankHook.leeg();
  Live.zetProfielVoorTest(null, nepOpslag());
  const gast = nepWereld();
  naarNiveau(gast, 'water', 2);
  assert.deepEqual(speelAlles(gast), ['water-rang2'], 'een gast met een leeg profiel ziet zijn eigen moment');
});
t('rang 4 weet of de speler Z2 zelf speelde: dan geen terugblik van Lammert', () => {
  registerStoryQueries({ storyFlag: (f) => f === W.BINNENVAART_VLAG });
  try {
    Live.rankHook.leeg();
    Live.zetProfielVoorTest(null, nepOpslag());
    const w = nepWereld();
    naarNiveau(w, 'water', 4);
    assert.deepEqual(speelAlles(w), ['water-rang2', 'water-rang3', 'water-rang4']);
    assert.ok(!W.MOMENTEN[4].some(([wie, tekst]) => /^Lammert Veenstra,/.test(tekst)), 'het gewone rang-4-moment stelt Lammert niet opnieuw voor');
  } finally { registerStoryQueries({ storyFlag: () => false }); }
});
t('een moment wacht tot het rustig is', () => {
  Live.rankHook.leeg();
  Live.zetProfielVoorTest(null, nepOpslag());
  const w = nepWereld();
  naarNiveau(w, 'water', 2);
  for (let i = 0; i < 10; i++) assert.equal(Live.rankHook.tik(1, w, { ...rustig, sideJob: true }), null, 'een overtocht bezig is niet rustig');
  assert.deepEqual(speelAlles(w), ['water-rang2']);
});

// --- de terugblik ----------------------------------------------------------------------------------------------------------------------------

t('de terugblik is kort, noemt wie weggevallen is, en vervalt voor wie de aanleiding speelde', () => {
  const regels = W.terugblikTalk('water');
  assert.equal(regels.length, 2);
  assert.ok(regels.every((l) => l.textOnly && l.text.split(/\s+/).length <= 25 && l.speaker === 'Noor'), 'Noor vertelt, kort en zonder opname');
  assert.ok(regels.some((l) => /Wiebe Hazenberg/.test(l.text)));
  assert.deepEqual(W.terugblikTalk('water', { gezien: true }), [], 'wie Z1 speelde krijgt hem niet');
  assert.deepEqual(W.terugblikTalk('bus'), [], 'een ander vak heeft geen terugblik');
  const prov = W.provincieTerugblik();
  assert.equal(prov.length, 2);
  assert.ok(prov.every(([wie, tekst]) => wie === 'Schipper Lammert' && tekst.split(/\s+/).length <= 25));
});

// --- de Vaarkaart ----------------------------------------------------------------------------------------------------------------------------

t('de Vaarkaart zegt het spoor, de kernlus, de rang nu en de volgende; een ander vak heeft er geen', () => {
  const stad = W.waterGids('water', 2);
  assert.equal(stad.spoor, 'stad');
  assert.equal(stad.nu.titel, 'Roeier');
  assert.equal(stad.volgende.titel, 'Schipper');
  const prov = W.waterGids('water', 4);
  assert.equal(prov.spoor, 'provincie');
  assert.equal(prov.nu.titel, 'Kapitein');
  assert.match(prov.titel, /Noorderspoor Water/);
  assert.equal(W.waterGids('water', 6).volgende, null, 'de hoogste rang heeft geen volgende');
  assert.equal(W.waterGids('bus', 2), null);
  assert.equal(W.spoorVan(3), 'stad');
  assert.equal(W.spoorVan(4), 'provincie');
  for (let nv = 1; nv <= 6; nv++) assert.equal(W.waterGids('water', nv).nu.titel, L.vakInfo('water').titels[nv - 1]);
});

console.log(`boatcareer_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
