// Pure poortlogica voor de releasegate (#releasegate): welke fasen een release nodig heeft
// op basis van de gewijzigde bestanden, hoe de uitslagen zich tot één verdict optellen en
// of een bewaard gate-rapport nog bij de huidige commit hoort. Geen git, geen I/O: daardoor
// testbaar zonder Electron, wereld of netwerk.
//
// De gate kent vijf fasen:
//   static  de bestaande lichte suite (run_tests) + geheimenscan + merkenregister + regels/design op de diff
//   world   de zware wereldchecks (test_all --fase=zwaar), alleen als wereld/tegels/wegen/water zijn aangeraakt
//   perf    de perf-routes en de norm/baseline-vergelijking
//   visual  de beeldronde, de beeldbaseline en het AI-beeldreviewpakket
//   review  de AI-code-review op de diff sinds de vorige tag, met de bevindingentriage
//
// De uitslag is nooit stil groen: een fase die niet gedraaid is (geen wereld, geen Electron,
// geen beelden) heet onvolledig en houdt de release tegen, net als in scripts/test_all.mjs.

export const STAGES = ['static', 'world', 'perf', 'visual', 'review'];

export const STAGE_NAAM = Object.freeze({
  static: 'Statisch (suite, regels, design)',
  world: 'Wereld (zware checks en audits)',
  perf: 'Performance (routes, norm, baseline)',
  visual: 'Beeld (baseline en AI-beeldreview)',
  review: 'Review (AI-code-review en triage)',
});

// Een fase die altijd verplicht is: de lichte suite en de review horen bij elke release.
const ALTIJD = new Set(['static', 'review']);

// Bestandspatronen per fase. Een pad dat op minstens één patroon past, vraagt die fase.
const WORLD = [
  /^game\/world\//,
  /^game\/js\/(worldbuilder|world|tilestore|terraincache|terrain|tiles|roads?|rails?|water|vaarnet|bridges?|grass|scenery|props?|placement|wildlife|region)\.js$/,
  /^game\/js\/(world|terrain|tiles|roads?|water|rails?|bridges?|grass|scenery|props?|placement)[a-z0-9_-]*\.js$/i,
  /^game\/vaarnet/,
  /^scripts\/world\//,
  /^scripts\/(ring_probe|seat_audit|province_|drive_audit|clearance_audit|landmark_audit|bus_audit|junction_sim|network_drive|vaarnet_|hull_route|prop_conflict|overlap_check|placement_audit|terrain_|randaudit|height_audit)/,
  /^data\//,
];

const PERF = [
  /^game\/js\/(scene3d|main|renderer|render|gfxprofile|framebudget|tickbudget|losbudget|pathbudget|tilestore|terraincache|worldbuilder|world|vehicle|vehiclephysics|traffic|bot)\.js$/,
  /^game\/js\/(farlod|shadow|material|geometry|mesh|instanc|lod|stream|chunk|pipeline|shader)[a-z0-9_-]*\.js$/i,
  /^game\/js\/[a-z0-9_-]*(budget|perf|lod|render)[a-z0-9_-]*\.js$/i,
  /^scripts\/perf\//,
];

const VISUAL = [
  /^game\//,               // alles wat de speler ziet of hoort kan de beelden raken
  /^desktop\/resources\//, // venster- en app-iconen
  /^web\//,                // de webversie bouwt dezelfde game
];

const MULTIPLAYER = [
  /^game\/js\/(net|net_|coop|multiplayer|protocol|lobby)/i,
  /^game\/js\/coop[a-z0-9_-]*\.js$/i,
  /^scripts\/coop\//,
  /^scripts\/coop[a-z0-9_-]*/,
];

const STORY = [
  /^game\/storydata\//,
  /^game\/js\/(story|missions?|mission_defs|narrative|cutscene|cutscript|keuzewerk|verhaal)/i,
  /^game\/js\/story[a-z0-9_-]*\.js$/i,
  /^docs\/verhaal\//,
];

const HOTSPOTS = { world: WORLD, perf: PERF, visual: VISUAL, multiplayer: MULTIPLAYER, story: STORY };

const isChangedPath = (f) => typeof f === 'string' && f.length > 0;
const normaliseer = (f) => String(f).replace(/\\/g, '/').replace(/^\.\//, '');

/** Welke verzamelingen patronen passen op dit pad? -> ['world','perf',...] */
export function classifyPath(file) {
  if (!isChangedPath(file)) return [];
  const f = normaliseer(file);
  return Object.keys(HOTSPOTS).filter((soort) => HOTSPOTS[soort].some((re) => re.test(f)));
}

/**
 * Stel het poortplan op voor een lijst gewijzigde bestanden.
 * @param {string[]} files repo-relatieve paden met / als scheiding
 * @param {{all?: boolean, force?: string[], skip?: string[]}} [opts]
 * @returns {{stages: Record<string,{nodig:boolean,verplicht:boolean,redenen:string[]}>, bestanden:string[], geselecteerd:string[]}}
 */
export function planStages(files, opts = {}) {
  const lijst = [...new Set((Array.isArray(files) ? files : []).filter(isChangedPath).map(normaliseer))].sort();
  const force = new Set((opts.force || []).filter((s) => STAGES.includes(s)));
  const skip = new Set((opts.skip || []).filter((s) => STAGES.includes(s)));
  const klassen = new Map(); // fase -> voorbeeldpaden
  for (const f of lijst) {
    for (const soort of classifyPath(f)) {
      if (!klassen.has(soort)) klassen.set(soort, []);
      const rij = klassen.get(soort);
      if (rij.length < 8 && !rij.includes(f)) rij.push(f);
    }
  }
  for (const fase of force) if (!klassen.has(fase)) klassen.set(fase, []);

  const stages = {};
  for (const fase of STAGES) {
    const altijd = ALTIJD.has(fase);
    const geraakt = klassen.get(fase) || [];
    const nodig = (altijd || geraakt.length > 0 || force.has(fase)) && !skip.has(fase);
    const redenen = [];
    if (altijd) redenen.push('hoort bij elke release');
    if (geraakt.length) redenen.push(...geraakt.map((f) => `geraakt: ${f}`));
    if (force.has(fase)) redenen.push('geforceerd met --force');
    if (skip.has(fase)) redenen.push('overgeslagen met --skip');
    stages[fase] = { nodig, verplicht: nodig, redenen };
  }
  // --all zet alle fasen aan (behalve wat expliciet met --skip uit staat)
  if (opts.all) {
    for (const fase of STAGES) {
      if (skip.has(fase)) continue;
      stages[fase].nodig = true;
      stages[fase].verplicht = true;
      if (!stages[fase].redenen.length) stages[fase].redenen.push('--all');
    }
  }
  const geselecteerd = STAGES.filter((f) => stages[f].nodig);
  return { stages, bestanden: lijst, geselecteerd };
}

/** De fasen die volgens het plan verplicht zijn (en dus allemaal PASS moeten zijn). */
export function requiredStages(plan) {
  return STAGES.filter((f) => plan && plan.stages && plan.stages[f] && plan.stages[f].verplicht);
}

const FASE_CODES = new Set([0, 1, 3]);

/**
 * Tel de uitslagen van de gedraaide fasen op tot één verdict.
 * 0 = groen, 1 = rood, 3 = onvolledig (iets verplichts is niet gedraaid of niet gemeten).
 * @param {Record<string,{status:string,code:number,detail?:string}>} uitslagen
 * @param {{allowSkip?: boolean}} [opts]
 */
export function mergeVerdict(uitslagen, opts = {}) {
  const redenen = [];
  const koppen = { PASS: 0, FAIL: 1, SKIP: 3, WACHT: 3, ONBESLIST: 3, 'NIET GEMETEN': 3, 'NIET GEDRAAID': 3 };
  let rood = false;
  let onvolledig = false;
  let gemeten = 0;
  for (const [fase, u] of Object.entries(uitslagen || {})) {
    const status = u && u.status ? String(u.status) : 'NIET GEDRAAID';
    const code = u && FASE_CODES.has(Number(u.code)) ? Number(u.code) : (koppen[status] != null ? koppen[status] : 3);
    if (status === 'PASS') gemeten++;
    if (code === 1 || status === 'FAIL') { rood = true; redenen.push(`${fase}: rood${u && u.detail ? ` (${u.detail})` : ''}`); }
    else if (code !== 0 && status !== 'PASS') { onvolledig = true; redenen.push(`${fase}: ${status}${u && u.detail ? ` (${u.detail})` : ''}`); }
  }
  if (!gemeten) onvolledig = true;
  let status = 'groen';
  let code = 0;
  if (rood) { status = 'rood'; code = 1; }
  else if (onvolledig && !opts.allowSkip) { status = 'onvolledig'; code = 3; }
  else if (onvolledig) { status = 'groen'; code = 0; }
  if (!redenen.length) redenen.push('alle gedraaide fasen zijn groen');
  return { status, code, redenen, gemeten };
}

// De versiecommit van release.sh raakt alleen deze bestanden; de gate mag daarom op de
// code-commit ervoor zijn gedaan (de review blijft op de code staan).
const RELEASE_METADATA = /^(CHANGELOG\.md|desktop\/package\.json|desktop\/package-lock\.json|android\/package\.json|android\/package-lock\.json)$/;

/**
 * Keurt een bewaard gate-rapport tegen de huidige commit en het plan.
 * @param {object} gate inhoud van release-gate.json
 * @param {{commit?: string, allowSkip?: boolean, allowReleaseCommit?: boolean, filesSinds?: string[]}} [opts]
 * @returns {{ok:boolean, code:number, problemen:string[], waarschuwingen:string[]}}
 */
export function verifyGate(gate, opts = {}) {
  const problemen = [];
  const waarschuwingen = [];
  if (!gate || typeof gate !== 'object') return { ok: false, code: 3, problemen: ['geen gate-rapport gevonden'], waarschuwingen };
  if (Number(gate.schema) !== 1) problemen.push('onbekend schema in het gate-rapport');
  const commit = opts.commit ? String(opts.commit) : null;
  const sinds = Array.isArray(opts.filesSinds) ? opts.filesSinds.map(normaliseer) : null;
  const alleenReleaseMeta = Boolean(opts.allowReleaseCommit && sinds && sinds.length > 0 && sinds.every((f) => RELEASE_METADATA.test(f)));
  if (!commit) problemen.push('geen commit opgegeven om tegen te verifiëren');
  else if (!gate.commit) problemen.push('het gate-rapport noemt geen commit');
  else if (gate.commit !== commit) {
    if (alleenReleaseMeta) waarschuwingen.push(`de gate is op ${gate.commit.slice(0, 10)} gedaan; sindsdien zijn alleen release-metadata-bestanden gewijzigd (${sinds.length})`);
    else problemen.push(`het gate-rapport is van commit ${String(gate.commit).slice(0, 10)}, HEAD is ${commit.slice(0, 10)}: opnieuw draaien`);
  }
  const vereist = requiredStages(gate.plan);
  if (!vereist.length) problemen.push('het gate-rapport heeft geen plan met verplichte fasen');
  for (const fase of vereist) {
    const u = gate.stages && gate.stages[fase];
    if (!u) { problemen.push(`fase ${fase} ontbreekt in het rapport`); continue; }
    if (u.status !== 'PASS') problemen.push(`fase ${fase}: ${u.status}${u.detail ? ` (${u.detail})` : ''}`);
  }
  const review = gate.review;
  if (!review || review.status !== 'groen') problemen.push(`review: ${review ? review.status : 'ontbreekt'}`);
  else if (commit && review.commit && review.commit !== commit) {
    // De review hoort op de code-commit; alleen de versiecommit erachter is toegestaan.
    const reviewOpGateCommit = alleenReleaseMeta && gate.commit && review.commit === gate.commit;
    if (reviewOpGateCommit) waarschuwingen.push(`de review is op ${review.commit.slice(0, 10)} gedaan (de code-commit vóór de versiecommit)`);
    else problemen.push('de review is op een andere commit gedaan');
  }
  if (!problemen.length) return { ok: true, code: 0, problemen: [], waarschuwingen };
  // Een ontbrekende of onvolledige meting is geen rood maar "niets gemeten" (3); een echte
  // tegenspraak (andere commit, onbekend schema) is rood (1).
  const hard = problemen.some((p) => /andere commit|onbekend schema|HEAD is/.test(p));
  return { ok: false, code: hard ? 1 : 3, problemen, waarschuwingen };
}

/** Korte Nederlandse samenvatting van een plan, voor de terminal en het rapport. */
export function beschrijfPlan(plan) {
  return STAGES.map((fase) => {
    const s = plan && plan.stages && plan.stages[fase];
    if (!s) return `${fase}: onbekend`;
    return `${fase}: ${s.nodig ? 'nodig' : 'niet nodig'}${s.redenen.length ? ` (${s.redenen.slice(0, 2).join('; ')})` : ''}`;
  });
}
