// Regressies voor de vliegtuig- en propbugs van 0.61.0 (#857, #860, #864, #880):
//   node scripts/vliegtuigprops_test.mjs
// #857: het vliegtuig heet Kist Kees en heeft een eigen icoon i.p.v. "VOERTUIG" met een auto.
// #860: de matras in C00.3 gaat met de Escapade mee in plaats van te blijven zweven.
// #864: gedragen cutscene-props hangen aan de hand; kermiskarren zijn botsauto's, geen Escapades.
// #880: de M15-leus past op het doek en het doek zakt niet door de grond na de landing.
import './node3d.mjs';
import { readFileSync } from 'node:fs';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const read = (f) => readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

// --- #857: vliegtuignaam en -icoon -------------------------------------------------
const { vehicleDisplayName, vehicleDisplayLabel } = await import('../game/js/vehiclenames.js');
const plane = { model: { name: 'plane' }, isPlane: true, id: 7 };
ok(vehicleDisplayName(plane).model === 'Kist Kees', 'vliegtuig heet Kist Kees', vehicleDisplayName(plane).model);
ok(vehicleDisplayName(plane).make === '', 'vliegtuig heeft geen los merk');
ok(vehicleDisplayLabel(plane) === 'Kist Kees', 'vliegtuiglabel is Kist Kees', vehicleDisplayLabel(plane));
const hudPanel = read('hud_panel.js');
ok(/plane: 'vliegtuig'/.test(hudPanel), 'HUD heeft een vliegtuigicoon');
ok(/VEH_ICONS\[v\.isPlane \? 'plane'/.test(hudPanel), 'HUD kiest het vliegtuigicoon voor een vliegtuig');

// --- #880: M15-spandoek -------------------------------------------------------------
const { bannerLines, bannerHeight } = await import('../game/js/planestage.js');
const leus = 'JELLE KOOPT DE JURY. LEVENSLANG EIERBALLEN';
const regels = bannerLines(leus);
ok(regels.length === 2, 'de leus wordt in twee regels getekend', JSON.stringify(regels));
ok(regels.join(' ') === leus, 'geen woord van de leus valt weg', regels.join(' '));
ok(regels.every((r) => r.length < leus.length), 'elke regel is korter dan de hele leus');
ok(bannerLines('KORT').length === 1, 'een korte leus blijft op één regel');
// het doek is 3 m hoog: de onderkant moet boven de grond blijven
ok(Math.abs(bannerHeight(0, 5) - 6.6) < 1e-9, 'doek staat op de grond op grond + 1,6 m', String(bannerHeight(0, 5)));
ok(Math.abs(bannerHeight(100, 5) - 98.5) < 1e-9, 'in de lucht hangt het doek 1,5 m onder de kist', String(bannerHeight(100, 5)));
ok(bannerHeight(0, 5) - 1.5 > 5, 'de onderkant van het doek zit boven maaiveld', String(bannerHeight(0, 5) - 1.5));
const stageSrc = read('planestage.js');
ok(/fitText\(g, regel, 468/.test(stageSrc), 'de tekst wordt per regel teruggeschaald');
ok(/bannerHeight\(v\.z, gh\)/.test(stageSrc), 'de bannerhoogte wordt op de grond geklemd');

// --- #860: matras gaat mee met de Escapade ------------------------------------------
const { OPENING_ACTS } = await import('../game/js/cutscenes.js');
const { compileScene } = await import('../game/js/cutscript.js');
const verhuis = OPENING_ACTS.find((a) => a.id === 'story-opening-verhuisdag');
ok(!!verhuis, 'C00.3 (verhuisdag) bestaat');
if (verhuis) {
  // Het aantal regels volgt de echte cue-data (hoogste L-verwijzing in cues, shots en fx), niet een vast getal:
  // de opening kreeg een zesde regel (L5) en de test liep achter. De scene gaat door openingActs, net als in het
  // spel, zodat de regeltijden en het wegfilteren van niet-oplopende shots hetzelfde zijn als in de film.
  const refs = [...(verhuis.cues || []), ...(verhuis.shots || []), ...(verhuis.fx || [])]
    .map((c) => /^L(\d+)/.exec(typeof c.t === 'string' ? c.t : '')).filter(Boolean).map((m) => +m[1]);
  const lineCount = Math.max(...refs) + 1;
  ok(lineCount >= 6, 'C00.3 verwijst naar zijn regels met L-tijden', String(lineCount));
  const { openingActs } = await import('../game/js/cutscenes.js');
  const OPENING_ACT3_START = 25; // ACT_SPLIT in cutscenes.js: C00.3 begint bij regel 25
  const lines = Array.from({ length: OPENING_ACT3_START + lineCount }, (_, i) => ({ speaker: i % 2 ? 'Anita' : 'Tammo', text: 'Regel ' + i, at: i * 6, dur: 5 }));
  const act = openingActs(lines).find((x) => x.def.id === verhuis.id);
  ok(!!act, 'openingActs levert C00.3');
  const scene = compileScene(act.def, { lines: act.lines, duration: act.duration });
  const anchor = { x: 500, y: -300, facing: 1.1, z: 0 };
  const voor = scene.sample(1, anchor);
  const na = scene.sample(40, anchor);
  const matrasVoor = voor.props.matras, matrasNa = na.props.matras;
  const escapadeNa = na.props.escapade;
  ok(matrasVoor.visible && matrasNa.visible, 'de matras is en blijft zichtbaar');
  const verplaatst = Math.hypot(matrasNa.x - matrasVoor.x, matrasNa.y - matrasVoor.y);
  ok(verplaatst > 20, 'de matras is met de auto meegereden', verplaatst.toFixed(1) + ' m');
  ok(Math.hypot(matrasNa.x - escapadeNa.x, matrasNa.y - escapadeNa.y) < 0.05, 'de matras blijft op de Escapade liggen',
    `${Math.hypot(matrasNa.x - escapadeNa.x, matrasNa.y - escapadeNa.y).toFixed(3)} m verschil`);
  ok(Math.abs((matrasNa.h - anchor.z) - 1.45) < 0.01, 'de matras blijft op dakhoogte 1,45 m', String(matrasNa.h - anchor.z));
}

// --- #864: gedragen props en kermiskarren ------------------------------------------
const { propKindIssue, propFoot } = await import('../game/js/cutscenemodels.js');
ok(propKindIssue('botsauto') === null, 'botsauto is een geldige cutscene-prop');
ok(Array.isArray(propFoot('botsauto')) && propFoot('botsauto')[0] > 1, 'de botsauto heeft een eigen voetafdruk');
const { MORE_SPECS } = await import('../game/js/cutscenes_akte1.js');
await import('../game/js/cutscenes_akte3.js');
const m16 = MORE_SPECS['M16.outro'];
ok(!!m16, 'M16.outro bestaat');
ok(m16.props && m16.props.botsauto1 && m16.props.botsauto1.kind === 'botsauto', 'M16: kermiswagen 1 is een botsauto');
ok(m16.props && m16.props.botsauto2 && m16.props.botsauto2.kind === 'botsauto', 'M16: kermiswagen 2 is een botsauto');
const hostSrc = read('cutscenehost.js');
ok(/function handOf\(mesh\)/.test(hostSrc), 'de cutscenehost kent de hand van een acteur');
ok(/PERSON_RIG\.FOREARM/.test(hostSrc), 'de hand wordt uit de onderarm van de pop bepaald');
ok(/botsauto: \(\) =>/.test(hostSrc), 'de host bouwt een eigen botsautomodel');

// de drager en zijn koffer in een echte scene: de prop moet aan de hand hangen, niet voor de borst
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
const { PERSON_RIG } = await import('../game/js/models3d_people.js');
await import('../game/js/cutscenehost.js');
const host = window.__cutHost;
ok(!!host && typeof host.buildScriptRun === 'function', 'de cutscenehost is in Node te bouwen');
if (host) {
  const def = {
    id: 'test-dragen',
    actors: { drager: { look: { shirt: 0x336699, skin: 0xd0a080, variant: 'male' }, at: [0, 0], face: 0, anim: 'carry' } },
    props: { koffer: { kind: 'koffer', at: [2, 0, 0] } },
    cues: [{ t: 0, actor: 'drager', carry: 'koffer' }],
    shots: [{ t: 0, shot: 'cut', at: [0, -3, 1.6], look: 'drager' }],
  };
  const scene = compileScene(def, { lines: [], duration: 3 });
  const run = host.buildScriptRun(def, scene, { x: 500, y: -300, facing: 0, z: 0 }, null, null);
  try {
    run.frame(1, 0.1);
    const actor = run.actors.drager, prop = run.props.koffer;
    const elbow = actor.userData.elbowR || actor.userData.elbowL;
    ok(!!elbow, 'de pop heeft een elbow-bot');
    if (elbow) {
      const hand = new THREE.Vector3(0, -(PERSON_RIG.FOREARM || 0.25) * 1.25, 0);
      elbow.localToWorld(hand);
      const d = Math.hypot(prop.position.x - hand.x, prop.position.y - hand.y, prop.position.z - hand.z);
      ok(d < 0.15, 'de gedragen koffer hangt aan de hand', d.toFixed(3) + ' m van de hand');
      const borst = new THREE.Vector3(actor.position.x, actor.position.y + 1.07, actor.position.z);
      ok(Math.hypot(prop.position.x - borst.x, prop.position.y - borst.y, prop.position.z - borst.z) > 0.4, 'de koffer zweeft niet voor de borst');
    }
  } finally {
    run.dispose();
  }
}

console.log(fails ? `${fails} of ${n} controles mislukt` : `vliegtuigprops_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
