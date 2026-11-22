// Statische ketenaudit van het hele verhaal (22-11, #1121): bewijst zonder Electron dat een nieuw spel van de opening tot de
// aftitels kan doorlopen. Alles wat een speler kan blokkeren staat hier als controle:
//   node scripts/verhaal_keten_audit.mjs [--json=<bestand>] [--tabel=<bestand.md>] [--geen-wereld]
//
// De graaf: STEPS is een lijn (M00, M01, ..., F6); de poort is de finalekaart van akte 5 (Deel 4 wacht erop) en elke stap heeft
// een uitgang (afronden, mislukken en opnieuw, of overslaan). Gecontroleerd wordt:
//   1  bereikbaarheid: de wandeling met nextStoryStep vanaf een nieuw spel bezoekt elke stap, en met alles ervoor gedaan geeft
//      nextStoryStep precies deze stap (geen stap die wordt overgeslagen of blokkeert); de poort van Deel 4 laat de kaart eerst zien
//   2  uitgang: elke stap heeft een doeltype dat het spel kent (GOALS) of een missie met stages; de lijn eindigt op de finale
//   3  geen cyclus zonder voortgang: elke verwijzing (bruggen, reisbeats, mijlpalen, tussenstappen) wijst naar een bestaande stap
//      en nooit achteruit voor wat vooruit moet; de kalenderdag (STEP_DAY) daalt nooit
//   4  vlaggen: elke vlag die ergens gelezen wordt, wordt eerder gezet (stap, mijlpaal, romantiekkeuze of een vlag-familie)
//   5  poorten: unlockgate (akte per wereld) wijst naar bestaande akten en loopbanen worden maar één keer genoemd;
//      een missie-eis (requires) kan worden gehaald voor de missie begint
//   6  tijdlimieten: elke timeLimit is eindig en ruim genoeg om te lezen en te rijden
//   7  doelcoordinaten: reisdoelen, startplekken en stagedoelen liggen in de provincie en (met wereld) op open grond bij een weg
//   8  scenes: elke scene van een stap bestaat in script.json, heeft regels met tekst (ondertitel als terugval) en een eenheid
//      in de cutscene-catalogus (acteurs, rekwisieten, decor) of is een kale scene die als ondertitelpraat speelt
//   9  beloningen: elke missiebeloning is positief en wordt alleen de eerste keer vol uitbetaald (herhaling = klusloon);
//      een activiteit betaalt niets en kost niets behalve een vermelde aankoop
// Exit 0 groen, 1 blokkerend. Wereld-controles (7) slaan over zonder wereld (GAME_WORLD of game/world met index-provincie.json).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');

// --- zuivere controles: alles wat een lijst stappen en wat gegevens nodig heeft; getest met kapotte voorbeeldketens ---------------
// i = { steps, parts, nextStep(doneId, passed, cardSeen, skip), missionIndexOf, goalTypes: Set, bridges, reisbeats, stepDay: Map,
//       milestones, romance, flagReads: Set, flagFamilies: [prefix], scenesById: Map, unitOfScene: (id)=>kind|null, defs: Map(missionId->def)|null,
//       finalePart, dayOf }
export function ketenControles(i) {
  const f = [];
  const bad = (code, id, msg, sev = 'blokkerend') => f.push({ code, id, msg, sev });
  const { steps, parts } = i;
  const ids = steps.map((s) => s.id);
  const pos = new Map(ids.map((id, k) => [id, k]));

  // 1 bereikbaarheid
  if (new Set(ids).size !== ids.length) bad('K1', '-', 'stap-id\'s zijn niet uniek');
  for (const s of steps) {
    if (s.built !== true) bad('K1', s.id, 'stap is niet gebouwd: het verhaal stopt hier');
    if (!parts[s.part] || !parts[s.part].open) bad('K1', s.id, `deel ${s.part} is niet open`);
  }
  const done = new Set(), passed = new Set();
  const walk = [];
  for (let guard = 0; guard < steps.length + 5; guard++) {
    const nx = i.nextStep((id) => done.has(id), (m) => passed.has(m), null);
    if (!nx || nx.finale || nx.end) { walk.push(nx && nx.finale ? 'FINALE' : 'EINDE'); break; }
    walk.push(nx.id);
    done.add(nx.id);
    if (nx.kind === 'mission') passed.add(i.missionIndexOf(nx.mission));
  }
  if (walk.slice(0, -1).join() !== ids.join()) bad('K1', '-', `de wandeling vanaf een nieuw spel bezoekt niet elke stap in volgorde (${walk.length - 1}/${ids.length})`);
  if (walk[walk.length - 1] !== 'FINALE') bad('K2', '-', 'de keten eindigt niet op de finale (aftitels)');
  // met alles ervoor gedaan is deze stap aan de beurt (de poort van Deel 4 gezien); een stap die niet aan de beurt komt is een vastloper
  for (let k = 0; k < steps.length; k++) {
    const dn = new Set(ids.slice(0, k));
    const ps = new Set(steps.slice(0, k).filter((s) => s.kind === 'mission').map((s) => i.missionIndexOf(s.mission)));
    const nx = i.nextStep((id) => dn.has(id), (m) => ps.has(m), () => true);
    if (!nx || nx.id !== steps[k].id) bad('K1', steps[k].id, `met alles ervoor gedaan is dit niet de volgende stap (${nx && (nx.id || JSON.stringify(nx.end))})`);
  }
  // de poort: vóór de finalekaart van akte 5 stopt het verhaal op de kaart; erna loopt Deel 4 door
  {
    const fp = i.finalePart;
    const lastOfFinale = steps.filter((s) => s.part === fp).map((s) => s.id).at(-1);
    const dn = new Set(ids.slice(0, pos.get(lastOfFinale) + 1));
    const ps = new Set(steps.filter((s) => dn.has(s.id) && s.kind === 'mission').map((s) => i.missionIndexOf(s.mission)));
    const closed = i.nextStep((id) => dn.has(id), (m) => ps.has(m), () => false);
    const open = i.nextStep((id) => dn.has(id), (m) => ps.has(m), (p) => p === fp);
    if (!(closed && closed.finale && closed.end === fp)) bad('K1', lastOfFinale, 'de finalekaart van akte 5 houdt Deel 4 niet tegen');
    if (!(open && open.id && parts[open.part] && parts[open.part].after === fp)) bad('K1', lastOfFinale, 'na de finalekaart start Deel 4 niet');
  }

  // 2 uitgang
  for (const s of steps) {
    if (s.kind === 'activity') {
      if (!s.goal || !i.goalTypes.has(s.goal.type)) bad('K2', s.id, `doeltype ${s.goal && s.goal.type} is onbekend bij het spel (geen uitgang)`);
      if (s.goal && s.goal.type === 'reis' && !(Array.isArray(s.goal.at) && s.goal.at.length === 2 && s.goal.at.every(Number.isFinite))) bad('K2', s.id, 'reisdoel zonder coordinaten');
      if (s.goal && s.goal.type === 'reis' && !(s.goal.r > 0)) bad('K2', s.id, 'reisdoel zonder aankomststraal');
    } else if (s.kind === 'mission') {
      const d = i.defs && i.defs.get(s.mission);
      if (i.defs && !d) bad('K2', s.id, `missie ${s.mission} heeft geen definitie`);
      if (d && !((d.stages && d.stages.length) || d.type)) bad('K2', s.id, 'missie zonder stages (geen uitgang)');
    } else bad('K2', s.id, `onbekend soort stap ${s.kind}`);
  }
  if (steps.at(-1).kind === 'mission' && !steps.at(-1).goal) { /* de laatste stap is een activiteit (F6), een missie als laatste is ook een uitgang */ }

  // 3 verwijzingen en volgorde
  for (const b of i.bridges) { if (!pos.has(b.after)) bad('K3', b.id, `brug na ${b.after}: die stap bestaat niet`); }
  for (const id of Object.keys(i.reisbeats)) { if (!pos.has(id) && !i.defs) continue; if (!pos.has(id) && !/^M\d+$/.test(id)) bad('K3', id, 'reisbeat voor een stap die niet bestaat', 'let op'); }
  for (const m of i.milestones) if (!pos.has(m.step)) bad('K3', m.flag, `mijlpaal na ${m.step}: die stap bestaat niet`);
  for (let k = 1; k < i.milestones.length; k++) {
    if (pos.has(i.milestones[k].step) && pos.has(i.milestones[k - 1].step) && pos.get(i.milestones[k].step) < pos.get(i.milestones[k - 1].step)) bad('K3', i.milestones[k].flag, 'mijlpalen staan niet in verhaalvolgorde');
  }
  let lastDay = -Infinity;
  for (const s of steps) {
    const d = i.stepDay.get(s.id);
    if (!Number.isFinite(d)) { bad('K3', s.id, 'stap zonder kalenderdag'); continue; }
    if (d < lastDay) bad('K3', s.id, `kalenderdag ${d} ligt voor de dag van de stap ervoor (${lastDay})`);
    lastDay = Math.max(lastDay, d);
  }
  // een nachtscene (klok na middernacht, 2.30) hoort bij een dag die klopt: de klok moet een geldige tijd zijn
  for (const s of steps) if (s.homeScene && s.homeScene.clock != null && !(Number.isFinite(s.homeScene.clock) && s.homeScene.clock >= 0 && s.homeScene.clock < 24)) bad('K3', s.id, 'homeScene-klok buiten 0 tot 24');

  // 4 vlaggen: gezet voor of op het moment dat ze gelezen worden
  const writers = new Map();   // vlag -> eerste stapindex die hem zet
  const addW = (flag, stepId) => { const k = pos.has(stepId) ? pos.get(stepId) : -1; if (!writers.has(flag) || writers.get(flag) > k) writers.set(flag, k); };
  for (const s of steps) if (s.unlocks) addW(s.unlocks, s.id);
  for (const m of i.milestones) addW(m.flag, m.step);
  for (const r of i.romance) for (const fl of r.flags) { const br = i.bridges.find((b) => b.id === r.bridge); addW(fl, br ? br.after : '?'); }
  for (const fl of i.flagReads) {
    if (i.flagFamilies.some((p) => fl.startsWith(p))) continue;
    if (!writers.has(fl) || writers.get(fl) < 0) bad('K4', fl, `vlag ${fl} wordt gelezen maar door geen stap gezet`);
  }
  for (const b of i.bridges) for (const e of b.extra || []) {
    const w = writers.get(e.if);
    if (w === undefined || w < 0) bad('K4', b.id, `brug ${b.id} leest ${e.if}, maar niets zet die vlag`);
    else if (w >= pos.get(b.after)) bad('K4', b.id, `brug ${b.id} leest ${e.if} voordat die gezet is`);
  }
  for (const r of i.romance) if (!i.bridges.some((b) => b.id === r.bridge)) bad('K4', r.id, `keuze hangt aan brug ${r.bridge} die niet bestaat`);

  // 5 poorten
  const seenVak = new Map();
  for (const s of steps) for (const v of s.loopbanen || []) { if (seenVak.has(v)) continue; seenVak.set(v, s.id); }
  for (const w of i.gateWorlds || []) {
    if (!parts[w.part]) bad('K5', w.id, `wereld ${w.id} wijst naar een onbekende akte ${w.part}`);
    // de poort gaat open zodra het verhaal de akte bereikt: een akte zonder stappen zou hem nooit openen
    else if (!steps.some((s) => s.part === w.part)) bad('K5', w.id, `wereld ${w.id}: akte ${w.part} heeft geen stappen, de poort gaat nooit open`);
  }
  if (i.defs) for (const s of steps.filter((q) => q.kind === 'mission')) {
    const d = i.defs.get(s.mission);
    for (const r of [].concat((d && d.requires) || [])) {
      // een eis is te halen als de speler het kan kopen of de stap erop wijst (waive) of een eerdere stap hem levert
      if (!i.reqObtainable.has(r)) bad('K5', s.id, `eis ${r} kan niet worden gehaald`);
    }
  }

  // 6 tijdlimieten
  if (i.defs) for (const s of steps.filter((q) => q.kind === 'mission')) {
    const d = i.defs.get(s.mission);
    if (!d) continue;
    if (d.timeLimit != null && !(Number.isFinite(d.timeLimit) && d.timeLimit >= 30 && d.timeLimit <= 900)) bad('K6', s.id, `timeLimit ${d.timeLimit} is geen eindig getal tussen 30 en 900 s`);
    for (const [j, q] of (d.stages || []).entries()) if (q.timeLimit != null && !(Number.isFinite(q.timeLimit) && q.timeLimit >= 5 && q.timeLimit <= 900)) bad('K6', s.id, `stage ${j}: timeLimit ${q.timeLimit} ongeldig`);
  }

  // 8 scenes
  const sceneIds = (s) => {
    const out = new Set(s.scenes || []);
    for (const k of ['intro', 'outro', 'replay']) for (const sc of [].concat((s.story || {})[k] || [])) out.add(sc);
    if (s.goal && s.goal.scene) out.add(s.goal.scene);
    if (s.homeScene && s.homeScene.id) out.add(s.homeScene.id);
    return [...out];
  };
  const sceneRows = new Map();
  for (const s of steps) {
    const rows = [];
    for (const sc of sceneIds(s)) {
      const row = i.scenesById.get(sc);
      if (!row) { bad('K8', s.id, `scene ${sc} bestaat niet in script.json`); continue; }
      if (!row.lines.length) bad('K8', s.id, `scene ${sc} heeft geen regels`);
      for (const [j, l] of row.lines.entries()) {
        if (!l.speaker && !l.key) bad('K8', s.id, `scene ${sc} regel ${j + 1} heeft geen spreker`);
        if (typeof l.text !== 'string' || l.text.trim().length < 1) bad('K8', s.id, `scene ${sc} regel ${j + 1} heeft geen tekst (geen ondertitel als terugval)`);
      }
      const kind = i.unitOfScene(sc);
      if (!kind) bad('K8', s.id, `scene ${sc} heeft geen eenheid in de cutscene-catalogus (geen acteurs, rekwisieten of decor, ook geen kale ondertitelscene)`, 'let op');
      rows.push({ id: sc, kind: kind || '-', lines: row.lines.length, voiced: row.lines.filter((l) => l.hasVoice).length });
    }
    // een stap met een reisdoel of thuisscene speelt zijn scene bij aankomst; zonder scene valt hij terug op de lead (tekst)
    if (!rows.length && s.kind === 'activity' && s.goal && s.goal.type !== 'opening' && !s.lead && !s.done && !s.say) bad('K8', s.id, 'stap zonder scene en zonder tekst op de telefoon: de speler ziet niets');
    sceneRows.set(s.id, rows);
  }

  // 9 beloningen
  for (const s of steps) {
    if (s.kind === 'mission') {
      // Het Loket (M03) betaalt bewust 0: de stap kost 150 aan inschrijfgeld en de kaart zegt dat eerlijk
      if (!(Number.isFinite(s.reward) && (s.reward > 0 || (s.reward === 0 && s.cost > 0)))) bad('K9', s.id, `beloning ${s.reward} is niet positief`);
      if (s.cost != null && !(Number.isFinite(s.cost) && s.cost >= 0)) bad('K9', s.id, 'kosten zijn geen niet-negatief getal');
      const d = i.defs && i.defs.get(s.mission);
      if (d && d.reward !== s.reward) bad('K9', s.id, `de definitie betaalt ${d.reward}, de stap zegt ${s.reward}`);
      if (d && i.klusloon && !(i.klusloon(d.reward, d) < d.reward && i.klusloon(d.reward, d) >= 0)) bad('K9', s.id, 'een herhaling betaalt niet minder dan de eerste keer (eenmalig volle beloning)');
    } else {
      if (s.reward != null && s.reward !== 0) bad('K9', s.id, `een activiteit betaalt ${s.reward} (hoort 0)`);
      if (s.cost != null && !(Number.isFinite(s.cost) && s.cost >= 0)) bad('K9', s.id, 'kosten zijn geen niet-negatief getal');
    }
  }
  return { findings: f, walk, sceneRows };
}

// --- ware gegevens ---------------------------------------------------------------------------------------------------------------------
const arg = (k) => { const a = process.argv.find((v) => v === `--${k}` || v.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.slice(k.length + 3) : true) : null; };

export async function leesGegevens() {
  process.env.GDE_NIEUW_VERHAAL = '1';
  await import('./node3d.mjs');
  const A = await import('../game/js/storyarc.js');
  const N = await import('../game/js/storyarc_nieuw.js');
  const CAL = await import('../game/js/calendar.js');
  const MS = await import('../game/js/storymilestones.js');
  const RO = await import('../game/js/storyromance.js');
  const GATE = await import('../game/js/unlockgate.js');
  const { REISBEATS } = await import('../game/js/reisbeats.js');
  const FUN = await import('../game/js/storyfun.js');
  const EIK = await import('../game/js/storyeikea.js');
  const { loadUnits } = await import('./lib/cutscene_data.mjs');
  const storySrc = fs.readFileSync(path.join(ROOT, 'game/js/story.js'), 'utf8');
  // de basisdoelen van story.js (const GOALS = { ... }), plus wat storyfun, storyeikea en storyreis erbij zetten
  const body = storySrc.slice(storySrc.indexOf('const GOALS = {'));
  const goalTypes = new Set([...body.slice(0, body.indexOf('\n};')).matchAll(/^  ([a-zA-Z]+): \{/gm)].map((m) => m[1]));
  for (const k of [...Object.keys(FUN.FUN_GOALS), ...Object.keys(EIK.EIKEA_GOALS), 'reis']) goalTypes.add(k);
  const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/storydata/script.json'), 'utf8'));
  const U = await loadUnits();
  const kindOf = new Map();
  for (const u of U.units) for (const sc of u.sceneIds || [u.id]) kindOf.set(sc, u.def || u.scene ? 'cutscene' : 'script');
  for (const u of U.scriptUnits) for (const sc of u.sceneIds || [u.id]) if (!kindOf.has(sc)) kindOf.set(sc, 'script');
  for (const u of U.kaleUnits) for (const sc of u.sceneIds || [u.id]) if (!kindOf.has(sc)) kindOf.set(sc, 'kaal');
  for (const [sc, uid] of U.dekking) if (!kindOf.has(sc) && kindOf.has(uid)) kindOf.set(sc, kindOf.get(uid));
  const scenesById = new Map(script.scenes.map((s) => [s.id, { ...s, lines: (s.lines || []).map((l) => ({ ...l, hasVoice: !l.textOnly && l.channel !== 'tekst' })) }]));
  // vlaggen die code leest: storyFlag('x') en flags.has('x') met een vaste naam
  const flagReads = new Set();
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) { const t = fs.readFileSync(p, 'utf8'); for (const m of t.matchAll(/storyFlag\('([a-z][a-z0-9:_-]*)'\)/g)) flagReads.add(m[1]); } } };
  walk(path.join(ROOT, 'game/js'));
  // de requirements die een missie kan eisen en hoe de speler ze haalt (missionrequirements.js): kopen of de wereld zelf
  const obtainable = new Set(['night', 'boat', 'heist', 'bike', 'car', 'racecar', 'weapon']);
  return {
    A, N, CAL, MS, RO, GATE, REISBEATS, goalTypes, scenesById, flagReads, obtainable,
    unitOfScene: (id) => kindOf.get(id) || null,
  };
}

export function ketenInvoer(G, defs = null, klusloon = null) {
  const { A, CAL, MS, RO, GATE, REISBEATS } = G;
  return {
    steps: A.STEPS, parts: A.PARTS, nextStep: A.nextStoryStep, missionIndexOf: A.missionIndexOf, goalTypes: G.goalTypes,
    bridges: A.BRIDGES, reisbeats: REISBEATS, stepDay: CAL.STEP_DAY, milestones: MS.VAN_MILESTONES, romance: RO.ROMANCE_CHOICES,
    flagReads: G.flagReads, flagFamilies: ['keuze:', 'bridge:', 'recap:', 'met:', 'onderduik:', 'credits'],
    scenesById: G.scenesById, unitOfScene: G.unitOfScene, defs, finalePart: A.FINALE_PART, gateWorlds: GATE.gateWorlds(),
    reqObtainable: G.obtainable, klusloon,
  };
}

// De wereldcontroles (7): reisdoelen en startplekken liggen op open grond bij een weg.
export async function laadWereld() {
  const dir = path.resolve(process.env.GAME_WORLD || path.join(ROOT, 'game', 'world'));
  if (!fs.existsSync(path.join(dir, 'index-provincie.json'))) return null;
  const S = await import('../game/js/tilestore.js');
  const TW = await import('../game/js/tileworld.js');
  const PW = await import('../game/js/provinceworld.js');
  const Gd = await import('../game/js/gdt.js');
  const { patchRows } = await import('../game/js/vaarnet.js');
  const { wgsToWorld } = await import('../game/js/rdnew.js');
  const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(path.join(dir, f))))) : undefined) });
  const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
  const map = T.world;
  PW.initProvince({ index: T.index, world: map });
  return { T, map, Gd, patchRows };
}

async function wereldControles(G, defs, W) {
  const { wgsToWorld } = await import('../game/js/rdnew.js');
  const { T, map, Gd, patchRows } = W;
  const pts = [];
  for (const s of G.A.STEPS) {
    if (s.kind === 'activity' && s.goal && s.goal.type === 'reis') { const [x, y] = wgsToWorld(s.goal.at[0], s.goal.at[1]); pts.push({ id: s.id, what: 'reisdoel ' + s.goal.to, x, y }); }
    if (s.kind === 'mission' && defs) {
      const d = defs.get(s.mission);
      if (d && d.start) pts.push({ id: s.id, what: 'startplek', x: d.start.x, y: d.start.y });
      // stagedoelen (te voet of met de auto): water- en luchtdoelen horen bij een boot of vliegtuig en tellen alleen als 'let op'
      for (const [j, q] of (d ? d.stages || [] : []).entries()) if (q.kind === 'goto' && q.target && Number.isFinite(q.target.x) && Number.isFinite(q.target.y)) pts.push({ id: s.id, what: `stage ${j + 1} doel`, x: q.target.x, y: q.target.y, zacht: true });
    }
  }
  const keys = new Set();
  for (const p of pts) for (let dx = -300; dx <= 300; dx += 100) for (let dy = -300; dy <= 300; dy += 100) {
    const [i, j] = Gd.tileIndexOf(p.x + dx, p.y + dy);
    const k = Gd.tileKey(i, j);
    if (T.index.tiles[k]) keys.add(k);
  }
  await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 })));
  map.tileQueue.run(1e9);
  try { map.addWaterPatches(patchRows(JSON.parse(fs.readFileSync(path.join(ROOT, 'game/vaarnet_fixes.json'), 'utf8'))).filter((r) => !r.strip)); } catch (e) { /* zonder vaarnet-correcties */ }
  const findings = [], rows = [];
  for (const p of pts) {
    const open = map.isOpenSpot(p.x, p.y);
    const road = map.nearestRoadPoint(p.x, p.y, 200, false);
    const d = road ? Math.hypot(road.x - p.x, road.y - p.y) : null;
    const near = open ? { x: p.x, y: p.y } : map.openSpotNear(p.x, p.y);
    const shift = near ? Math.hypot(near.x - p.x, near.y - p.y) : null;
    rows.push({ id: p.id, what: p.what, x: Math.round(p.x), y: Math.round(p.y), open, wegAfstand: d === null ? null : Math.round(d), verschuif: shift === null ? null : Math.round(shift) });
    // een startplek in een gebouw of in water is te schuiven (de speler komt op de dichtstbijzijnde open plek); geen open plek in 60 m is een vastloper
    if (!open && (shift === null || shift > 60)) findings.push({ code: 'K7', id: p.id, sev: p.zacht ? 'let op' : 'blokkerend', msg: `${p.what} (${Math.round(p.x)}, ${Math.round(p.y)}) ligt niet op open grond en er is geen open plek binnen 60 m` });
    else if (!open) findings.push({ code: 'K7', id: p.id, sev: 'let op', msg: `${p.what} ligt niet op open grond; de speler wordt ${Math.round(shift)} m verschoven` });
    if (d === null || d > 400) findings.push({ code: 'K7', id: p.id, sev: 'let op', msg: `${p.what}: geen weg binnen 400 m` });
  }
  return { rows, findings };
}

export async function main() {
  const G = await leesGegevens();
  const { A } = G;
  const noWorld = !!arg('geen-wereld');
  let defs = null, klusloon = null, rows = [], skip = null, wfind = [];
  // missiedefinities: initMissions vraagt een kaart (de provinciewereld); zonder wereld slaan de def-afhankelijke controles over
  const W = noWorld ? null : await laadWereld();
  if (W) {
    try {
      const M = await import('../game/js/missions.js');
      M.initMissions({ map: W.map, onRespawn: [], addMessage() {}, player: { x: 0, y: 0 }, vehicles: [], pedestrians: [], stats: { pedKills: 0, copKills: 0 } });
      const list = M.getMissionDefs();
      defs = new Map();
      for (const s of A.STEPS.filter((q) => q.kind === 'mission')) { const d = list[A.MISSION_IDS.indexOf(s.mission)]; if (d) defs.set(s.mission, d); }
      klusloon = M.klusloon || null;
    } catch (e) { console.log('LET OP: missiedefinities niet geladen: ' + String(e.message || e).slice(0, 200)); }
  }
  const inp = ketenInvoer(G, defs, klusloon);
  const r = ketenControles(inp);
  if (W) { const w = await wereldControles(G, defs, W); rows = w.rows; wfind = w.findings; } else skip = noWorld ? 'overgeslagen (--geen-wereld)' : 'geen wereld met de provincie (GAME_WORLD of game/world)';
  const findings = [...r.findings, ...wfind];
  const blok = findings.filter((x) => x.sev === 'blokkerend');
  for (const x of findings) console.log(`${x.sev === 'blokkerend' ? 'FAIL' : 'let op'} ${x.code} ${x.id}: ${x.msg}`);
  const perAkte = {};
  for (const s of A.STEPS) perAkte[s.part] = (perAkte[s.part] || 0) + 1;
  console.log(`verhaal_keten_audit: ${A.STEPS.length} stappen, ${Object.entries(perAkte).map(([k, v]) => `${k} ${v}`).join(', ')}; ${blok.length} blokkerend, ${findings.length - blok.length} let op${skip ? '; wereldcontrole: ' + skip : `; ${rows.length} plekken gecontroleerd`}`);
  const jf = arg('json');
  if (typeof jf === 'string') fs.writeFileSync(jf, JSON.stringify({ stappen: A.STEPS.length, findings, wereld: rows, wandeling: r.walk, scenes: Object.fromEntries(r.sceneRows) }, null, 1));
  const tf = arg('tabel');
  if (typeof tf === 'string') {
    const out = ['| stap | akte | dag | soort | doel | scenes | wereld |', '|---|---|---|---|---|---|---|'];
    for (const s of A.STEPS) {
      const sc = r.sceneRows.get(s.id) || [];
      const w = rows.filter((q) => q.id === s.id).map((q) => (q.open ? 'open' : `verschoven ${q.verschuif} m`) + (q.wegAfstand == null ? ', geen weg' : `, weg ${q.wegAfstand} m`)).join('; ');
      out.push(`| ${s.id} | ${s.part} | ${A.STEPS && inp.stepDay.get(s.id)} | ${s.kind} | ${s.goal ? s.goal.type : (s.mission || '')} | ${sc.map((q) => `${q.id}(${q.lines}r,${q.kind})`).join(' ')} | ${w} |`);
    }
    fs.writeFileSync(tf, out.join('\n') + '\n');
  }
  return { findings, blok: blok.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await main();
  process.exit(r.blok ? 1 : 0);
}
