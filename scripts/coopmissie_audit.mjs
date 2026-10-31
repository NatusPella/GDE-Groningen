// Coop audit per mission (#525, spoor 1c): which story missions work with two players, which
// only partly, which not at all -- and why, per stage, read from the source instead of guessed.
//   node scripts/coopmissie_audit.mjs [--json] [--samenvatting]
//
// What it reads (no second truth):
//   - the story steps and mission ids: storyarc.js (STEPS, MISSION_IDS, missionIndexOf)
//   - the coop rule per step: cooproles.js (coopRule, rolVoorSpeler, auditSteps)
//   - the mission defs: missions.js itself (initMissions + getMissionDefs)
//   - whether a stage kind works together: coopstatus.js (the register the game itself warns from)
//   - why: the engine's own handler for that stage kind (missions.js updateStages, plus the
//     helper it calls in the module that exports it), searched for group reads vs a single body
//
// The defs are built on a structural map stub: this audit only looks at the shape of a def
// (type, stage kinds, iedereen, only, race, solo) and never at a coordinate. The stub keeps the
// audit free of the city data (data/cache/province, not in git) and of the cache writes that
// loading the city would do, so it runs in CI and changes nothing on disk.
//
// Pure: no DOM, no network, no writes. Exit code 0 always: the report is a backlog, not a gate
// (turning it into one is spoor 1d/3 of the same issue).
import fs from 'node:fs';
import './node3d.mjs';

const GAME = new URL('../game/js/', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, GAME), 'utf8');

const A = await import('../game/js/storyarc.js');
const R = await import('../game/js/cooproles.js');
const C = await import('../game/js/coopstatus.js');
const H = await import('../game/js/heistrollen.js');
const M = await import('../game/js/missions.js');

const { STEPS, CHARACTERS } = A;

// ------------------------------------------------------------------ the defs
// A map that answers every geometry question the def builders ask, without a city.
const spot = (x, y) => ({ x, y, road: null });
const stubMap = {
  meta: { bounds: null, shops: [], garages: [] }, water: [], roads: [], buildings: [], tiles: [],
  isOpenSpot: () => true, nearestRoadPoint: () => null, openSpotNear: (x, y) => spot(x, y),
  findOpenSpawn: (x, y) => spot(x, y), spawnZ: () => 0, buildingsNear: () => [], roadsNear: () => [],
  isOnBridge: () => false, escapeBuilding: () => null, roadAt: () => null,
};
M.initMissions({ map: stubMap, onRespawn: [], addMessage() {}, player: { x: 0, y: 0 }, vehicles: [], pedestrians: [] });
const DEFS = M.getMissionDefs();

// ------------------------------------------------------------------ the source evidence
// Comments and string literals are stripped before searching: a line of prose that mentions
// world.player is not proof that the handler reads it.
function stripNoise(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

// The body of a top-level function, cut at the closing brace in the first column (the layout of
// every file in game/js). Null when the function is not there or the braces do not add up.
function functionBody(src, name) {
  const hit = new RegExp(`^(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*\\(`, 'm').exec(src);
  if (!hit) return null;
  const lines = src.slice(hit.index).split('\n');
  let end = -1, at = hit.index;
  for (let i = 1; i < lines.length; i++) {
    at += lines[i - 1].length + 1;
    if (/^\}\s*$/.test(lines[i])) { end = at; break; }
  }
  if (end < 0) return null;
  const body = src.slice(hit.index, end + 1);
  const raw = body.replace(/\/\*[\s\S]*?\*\//g, ' ');
  let depth = 0;
  for (const c of raw) { if (c === '{') depth++; else if (c === '}') depth--; }
  return depth === 0 ? body : null;
}

// Local name -> file for the imports of a module, so a called helper can be looked up.
function importsOf(src) {
  const map = new Map();
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'\.\/([\w.]+)'/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim();
      if (!t) continue;
      const [orig, alias] = t.split(/\s+as\s+/);
      map.set((alias || orig).trim(), m[2]);
    }
  }
  return map;
}

const MISSIONS_SRC = read('missions.js');
const IMPORTS = importsOf(MISSIONS_SRC);
const fileCache = new Map();
const srcOf = (name) => {
  if (!fileCache.has(name)) { try { fileCache.set(name, read(name)); } catch { fileCache.set(name, null); } }
  return fileCache.get(name);
};

// Engine plumbing that says nothing about how a stage treats a second player.
const PLUMBING = new Set(['nextStage', 'fail', 'hint', 'succeed', 'syncPub', 'chainState', 'world']);

// A called helper's body: from missions.js, or from the module that exports it.
function helperBody(name, depth = 0) {
  if (depth > 1 || PLUMBING.has(name)) return null;
  const own = functionBody(MISSIONS_SRC, name);
  if (own) return own;
  const file = IMPORTS.get(name);
  if (!file) return null;
  const src = srcOf(file);
  return src ? functionBody(src, name) : null;
}

// The branch of a switch for `kind`. Grouped labels ('case a:' / 'case b:' / 'case c: {') share
// one body: an empty branch hands over to the next label.
function switchBranch(body, kind) {
  const at = new RegExp(`\\n\\s{4}case '${kind}':`).exec(body);
  if (!at) return null;
  let text = '';
  let from = at.index + at[0].length;
  for (let guard = 0; guard < 5; guard++) {
    const rest = body.slice(from);
    const next = rest.search(/\n\s{4}(?:case '|default:)/);
    text = rest.slice(0, next < 0 ? rest.length : next);
    if (text.replace(/\/\/[^\n]*/g, '').trim() !== '') break;
    const label = /\n\s{4}case '[a-z]+':/.exec(rest);
    if (!label) break;
    from += label.index + label[0].length;
  }
  return text;
}

// The read of a stage kind in the engine: its switch branch, plus the helpers it calls separately
// (a branch that only calls updateHeliStage still decides how a second player is treated).
function stageSource(kind) {
  const stages = functionBody(MISSIONS_SRC, 'updateStages');
  if (!stages) return null;
  const branch = switchBranch(stages, kind);
  if (branch == null) return null;
  const helpers = [];
  for (const call of branch.matchAll(/\b([a-z][\w$]*)\s*\(/g)) {
    const body = helperBody(call[1]);
    if (body) helpers.push({ naam: call[1], text: body });
  }
  return { text: branch, branch, helpers };
}

// Does the engine of a staged mission start from one body? (`const p = hoofdspeler(world)` at the
// top of updateStages.) The same for every stage of every mission, so it is asked once.
let engineOneBody = null;
function engineStartsFromOneBody() {
  if (engineOneBody === null) {
    const stages = functionBody(MISSIONS_SRC, 'updateStages');
    const head = stages ? stages.slice(0, stages.indexOf('switch (st.kind)')) : '';
    engineOneBody = !!head && ONE_BODY.test(stripNoise(head));
  }
  return engineOneBody;
}

// The read of a mission type without stages (deliver, checkpoint, fatbike...) in updateMissions.
// Only the branch of that type: the prologue of updateMissions also tests the keyboard (the host's
// J/N question) and would blame every type for it.
function typeSource(type) {
  const missions = functionBody(MISSIONS_SRC, 'updateMissions');
  if (!missions) return null;
  const at = missions.indexOf(`def.type === '${type}'`);
  if (at < 0) return null;
  const rest = missions.slice(at);
  const next = rest.search(/\}\s*else if \(def\.type === '/);
  const text = rest.slice(0, next < 0 ? rest.length : next);
  const helpers = [];
  for (const call of text.matchAll(/\b([a-z][\w$]*)\s*\(/g)) {
    const body = helperBody(call[1]);
    if (body) helpers.push({ naam: call[1], text: body });
  }
  return { text, helpers };
}

const GROUP_READ = /\b(doelStand|teamActor|iedereenOk|opdrachtSpelers|afstandMeespeler|meespelerInVoertuig|groepKlaar)\s*\(|\bst\.iedereen\b/;
// "The player" of one device: hoofdspeler(world), or the bare world.player singleton (#500).
const ONE_BODY = /\bhoofdspeler\s*\(|\b(?:world|w)\.player\b|\bp\.(?:x|y|z|inVehicle|enterVehicle|exitVehicle|speed|health)\b/;
const OWN_KEYS = /\bworld\.input\b|\binp\.wasPressed\b|\bwasPressed\s*\(/;

// What the source shows for a stage kind: does the handler look at the whole group, at one body,
// at the keyboard of this device? The branch is the handler proper; a helper it calls is kept
// apart, because a helper can be gated on a flag (`if (st.pursuer)`) and then says nothing about
// the step as a whole. `helpers` names what each helper shows, so the report never overclaims.
function reads(text) {
  const t = stripNoise(text);
  return { groep: GROUP_READ.test(t), eenLichaam: ONE_BODY.test(t), toetsen: OWN_KEYS.test(t) };
}
function readEvidence(source) {
  if (!source) return { known: false, groep: false, eenLichaam: false, toetsen: false, helpers: [] };
  const own = reads(source.text);
  const helpers = [];
  for (const h of source.helpers || []) {
    const r = reads(h.text);
    if (r.groep || r.eenLichaam || r.toetsen) helpers.push({ naam: h.naam, ...r });
  }
  return { known: true, ...own, helpers };
}

const evidenceFor = (key) => {
  if (key.startsWith('type:')) return readEvidence(typeSource(key.slice(5)));
  return readEvidence(stageSource(key.startsWith('stage:') ? key.slice(6) : key));
};

// ------------------------------------------------------------------ verdicts
const LABEL = { samen: 'volledig samen', deels: 'deels samen', niet: 'niet samen', solo: 'solo (bedoeld)', onbekend: 'niet vast te stellen' };
const STAGE_VERDICT = { werkt: 'samen', deels: 'deels', nee: 'niet' };
const RANK = { samen: 0, deels: 1, onbekend: 2, niet: 3, solo: 4 };
const worst = (list) => list.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'samen');
const naamVan = (rol) => (CHARACTERS[rol] && CHARACTERS[rol].name) || rol;

// Why a stage does or does not work with two players, in Dutch, from the evidence.
// `code` is the short form for the legend; `text` the full sentence. The register (coopstatus.js)
// gives the verdict, the handler gives the evidence: where the two disagree, the report says so
// instead of picking one. A read that only shows up in a helper is mentioned by name, so the next
// reader knows where to look and how much weight it carries.
function why(verdict, ev) {
  if (!ev.known) return { code: '?', text: 'niet vast te stellen: de handler van deze stapsoort is niet in de bron te vinden' };
  // A read in a helper is weaker evidence than a read in the branch itself: helpers can be gated
  // on a flag of one stage. Say who reads what, and do not let a helper overrule the branch.
  const note = ev.helpers.length
    ? `; in een hulpfunctie leest ${ev.helpers.map((h) => `${h.naam} ${[h.groep && 'de groep', h.eenLichaam && 'een lichaam', h.toetsen && 'de toetsen'].filter(Boolean).join(' en ')}`).join(', ')}`
    : '';
  const T = 'de handeling hangt aan de toetsen van dit apparaat, dus maar een van de twee kan hem doen';
  const L = 'de motor leest een lichaam (hoofdspeler/world.player) en niet de groep';
  if (verdict === 'samen') {
    if (ev.groep && ev.eenLichaam) return { code: 'G+', text: `de motor kijkt naar de groep (doelStand/teamActor), dus elke meespeler telt, maar leest daarnaast ook een lichaam${note}` };
    if (ev.groep) return { code: 'G', text: `de motor kijkt naar de groep (doelStand/teamActor), dus elke meespeler telt${note}` };
    if (ev.eenLichaam) return { code: 'L', text: `het register noemt deze stap samen, maar de handler leest een lichaam (hoofdspeler/world.player)${note}; of de tweede speler echt meedoet is uit de bron niet vast te stellen` };
    if (ev.helpers.length) {
      return { code: 'V?', text: `het register noemt deze stap samen en de handler zelf vraagt niets van een speler, maar de hulpcode verplaatst wel een lichaam${note}; of de tweede speler meegaat is uit de bron niet vast te stellen` };
    }
    return { code: 'V', text: 'de motor kijkt niet naar een lichaam; iedereen kan dit doen' };
  }
  const codes = [];
  const parts = [];
  if (ev.toetsen) { codes.push('T'); parts.push(T); }
  if (ev.eenLichaam) { codes.push('L'); parts.push(L); }
  if (parts.length) return { code: codes.join(''), text: parts.join('; ') + note };
  if (ev.groep) return { code: 'G', text: 'de motor leest de groep, dus de voortgang telt voor iedereen; wat er dan nog aan samen ontbreekt, is uit de bron niet vast te stellen' + note };
  if (ev.helpers.length) {
    return { code: '?', text: `niet vast te stellen: de handler zelf kijkt niet naar de groep en niet naar een lichaam${note}` };
  }
  return { code: '?', text: 'niet vast te stellen: de handler noemt geen groep en geen lichaam' };
}

// ------------------------------------------------------------------ the report
const missionSteps = STEPS.filter((s) => s.kind === 'mission');
const stepOfMission = new Map(missionSteps.map((s) => [s.mission, s]));

// Who plays which story role in this step, per player (#455): the step asks one role, a player
// whose own role differs plays it for the length of the step.
function roleLine(step) {
  return [0, 1]
    .map((slot) => {
      const r = R.rolVoorSpeler(step, { verhaalrol: R.STORY_ROLES[slot] });
      return `plek ${slot + 1} ${naamVan(r.rol)}${r.tijdelijk ? ` (tijdelijk; eigen rol ${naamVan(r.eigen)})` : ' (eigen verhaalrol)'}`;
    })
    .join(', ');
}

function stageLine(st, index) {
  const ev = evidenceFor(`stage:${st.kind}`);
  const stand = C.samenStatus('stap', st.kind);
  const verdict = STAGE_VERDICT[stand] || 'onbekend';
  const w = stand ? why(verdict, ev) : { code: '?', text: 'niet vast te stellen: de stapsoort staat niet in het register van coopstatus.js' };
  // The heist's role steps (heist.js heistRolStap + heistrollen.js ROLSTAP) are the one place where
  // the division between two players is written down: one holds the role and does it, the other
  // waits. That is a real answer, so it replaces the generic one.
  const rol = H.isRolstap(st.kind) ? { rol: H.ROLSTAP[st.kind], plek: H.STAPPLEK[st.kind] } : null;
  const waarom = rol
    ? `verdeelde rol (heistrollen.js ROLSTAP): met twee spelers is een van de twee de ${H.rolNaam(rol.rol)} en doet ${rol.plek}; de ander heeft aan deze stap geen eigen taak en wacht (de gastheer speelt hem alleen zoals altijd)`
    : w.text;
  return {
    index: index + 1, kind: st.kind, label: st.label || '', iedereen: !!st.iedereen, route: st.only || null,
    race: !!st.race, heist: !!st.heist, register: stand || 'onbekend', verdict, code: rol ? 'R' : w.code,
    rol: rol ? { rol: rol.rol, naam: H.rolNaam(rol.rol), plek: rol.plek } : null, waarom,
    bewijs: { groep: ev.groep, eenLichaam: ev.eenLichaam, toetsen: ev.toetsen, bron: ev.known, functies: ev.helpers.map((h) => h.naam) },
  };
}

function missionReport(step) {
  const def = DEFS.find((d) => d.id === step.mission) || null;
  const rule = R.coopRule(step, 2);
  const stages = def ? (def.stages || []).map(stageLine) : [];
  const solo = rule.presence === 'een';
  let verdict, reason;
  if (!def) {
    verdict = 'onbekend';
    reason = `geen opdrachtdefinitie voor '${step.mission}' in missions.js`;
  } else if (solo) {
    verdict = 'solo';
    reason = `solo: de regel zegt presence 'een', plek ${(rule.activeSlot | 0) + 1} speelt en de ander kijkt toe${rule.needsTwo ? ' (needsTwo blijft staan)' : ''}`;
  } else if (stages.length) {
    verdict = worst(stages.map((s) => s.verdict));
    const count = (v) => stages.filter((s) => s.verdict === v);
    const bits = [`${count('samen').length} van ${stages.length} stappen samen`];
    for (const v of ['deels', 'niet', 'onbekend']) {
      const hit = count(v);
      if (hit.length) bits.push(`${hit.length} ${LABEL[v]} (${[...new Set(hit.map((s) => s.kind))].join(', ')})`);
    }
    reason = bits.join('; ');
  } else {
    const stand = C.samenStatus('missie', def.type);
    verdict = STAGE_VERDICT[stand] || 'onbekend';
    const ev = evidenceFor(`type:${def.type}`);
    reason = stand
      ? `geen stappen: de soort '${def.type}' telt (coopstatus: ${stand}); ${why(verdict, ev).text}`
      : `geen stappen en de soort '${def.type}' staat niet in het register van coopstatus.js`;
  }
  const routes = [...new Set(stages.map((s) => s.route).filter(Boolean))];
  return {
    step: step.id, mission: step.mission, label: step.title, type: def ? def.type : null,
    rule: { presence: rule.presence, needsTwo: rule.needsTwo, activeSlot: rule.activeSlot },
    rollen: roleLine(step), verdict, reason, routes, stages,
  };
}

const inStory = missionSteps.map(missionReport);

// Missions in missions.js that the story no longer plays (retired slots) plus the loose side
// missions: they get one line each as well, so no mission of the source is silently skipped.
const outside = DEFS.filter((d) => !stepOfMission.has(d.id)).map((def) => {
  const stages = (def.stages || []).map(stageLine);
  const stand = stages.length ? null : C.samenStatus('missie', def.type);
  let verdict = stages.length ? worst(stages.map((s) => s.verdict)) : STAGE_VERDICT[stand] || 'onbekend';
  const soort = def.retired ? 'gepensioneerd' : def.side ? 'zijmissie' : 'buiten het verhaal';
  let reason;
  if (def.retired) { verdict = 'onbekend'; reason = 'gepensioneerd: staat niet meer in het verhaal en heeft geen stappen'; }
  else if (stages.length) reason = `${stages.length} stappen; uitslag ${LABEL[verdict]}`;
  else reason = stand ? `geen stappen: de soort '${def.type}' telt (coopstatus: ${stand})` : 'geen stappen en geen bekende soort';
  return { mission: def.id, label: def.label || def.id, type: def.type, soort, verdict, reason, stages };
});

const summary = {
  missies: inStory.length,
  volledig: inStory.filter((m) => m.verdict === 'samen').length,
  deels: inStory.filter((m) => m.verdict === 'deels').length,
  niet: inStory.filter((m) => m.verdict === 'niet').length,
  onbekend: inStory.filter((m) => m.verdict === 'onbekend').length,
  solo: inStory.filter((m) => m.verdict === 'solo').length,
  buiten: outside.length,
  stappen: inStory.reduce((n, m) => n + m.stages.length, 0),
  iedereen: inStory.reduce((n, m) => n + m.stages.filter((s) => s.iedereen).length, 0),
};

const report = {
  bron: { stappen: 'game/js/storyarc.js STEPS', regel: 'game/js/cooproles.js coopRule', defs: 'game/js/missions.js getMissionDefs', register: 'game/js/coopstatus.js samenStatus' },
  stepAudit: R.auditSteps(STEPS),
  motorLeestEenLichaam: engineStartsFromOneBody(),
  summary,
  missies: inStory,
  buiten: outside,
};

// ------------------------------------------------------------------ print
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const onlySummary = args.includes('--samenvatting');
const withDetail = !onlySummary;

if (asJson) {
  console.log(JSON.stringify(report, null, 1));
} else {
  const p2 = (n) => String(n).padStart(2, ' ');
  const pad = (s, n) => s + ' '.repeat(Math.max(0, n - [...s].length));
  console.log(`coopmissie_audit: ${summary.missies} missies uit het verhaal, ${summary.stappen} stappen, `
    + `${summary.iedereen} met de vlag iedereen; ${summary.buiten} missies in missions.js buiten het verhaal`);
  console.log(report.stepAudit.length ? `regelkeuring (auditSteps): ${report.stepAudit.length} probleem(en): ${report.stepAudit.join(', ')}` : 'regelkeuring (auditSteps): schoon');
  console.log(`motor: updateStages begint ${report.motorLeestEenLichaam ? 'bij een lichaam (hoofdspeler), dus elke stap van een missie met stappen werkt vanuit een speler' : 'niet bij een lichaam'}`);
  console.log('');
  console.log('per missie (--samenvatting laat de stappen weg)');
  for (const m of inStory) {
    console.log(`${m.step}  ${pad(LABEL[m.verdict], 16)} ${m.label}  - ${m.reason}`);
  }
  console.log('');
  if (withDetail) {
    console.log('per stap');
    console.log('  legenda: G = de motor leest de groep | G+ = groep en daarnaast een lichaam | L = de motor leest een lichaam | T = de toetsen van dit apparaat | R = verdeelde heistrol (heistrollen.js) | V = geen lichaam nodig | V? = register zegt samen, hulpcode verplaatst een lichaam | ? = niet vast te stellen');
    for (const m of inStory) {
      if (!m.stages.length) continue;
      console.log(`${m.step}  ${m.label}  (${m.mission}, ${m.type}) - ${LABEL[m.verdict]}`);
      console.log(`   regel  : presence '${m.rule.presence}', needsTwo ${m.rule.needsTwo ? 'ja' : 'nee'}`);
      console.log(`   rollen : ${m.rollen}`);
      if (m.routes.length) console.log(`   routes : ${m.routes.join(' / ')}; de uitslag telt de stappen van alle routes`);
      for (const s of m.stages) {
        const flags = [s.iedereen ? 'iedereen' : '', s.route ? `alleen ${s.route}` : '', s.race ? 'race' : '', s.heist ? 'heist' : ''].filter(Boolean).join(', ');
        const rol = s.rol ? ` rol: ${s.rol.naam} doet ${s.rol.plek}` : '';
        console.log(`     ${p2(s.index)}. ${pad(s.kind, 10)} ${pad(LABEL[s.verdict], 16)} [${pad(s.code, 2)}]${flags ? ` {${flags}}` : ''}${rol} ${s.label}`);
        console.log(`         ${s.waarom}`);
      }
      console.log('');
    }
    if (outside.length) {
      console.log('buiten het verhaal (missies in missions.js zonder verhaalstap)');
      for (const m of outside) console.log(`  ${pad(m.mission, 18)} ${pad(m.soort, 18)} ${pad(LABEL[m.verdict], 16)} ${m.label} - ${m.reason}`);
      console.log('');
    }
  }
  console.log('samenvatting');
  console.log(`  volledig samen : ${summary.volledig} van ${summary.missies} missies`);
  console.log(`  deels samen    : ${summary.deels} van ${summary.missies} missies`);
  console.log(`  niet samen     : ${summary.niet} van ${summary.missies} missies`);
  console.log(`  onbekend       : ${summary.onbekend} van ${summary.missies} missies`);
  console.log(`  solo (bedoeld) : ${summary.solo} van ${summary.missies} missies`);
  console.log(`  stappen        : ${summary.stappen} in het verhaal, waarvan ${summary.iedereen} met de vlag iedereen`);
  console.log(`  buiten het verhaal: ${summary.buiten} missies in missions.js`);
}
process.exit(0);
