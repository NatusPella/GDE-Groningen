// Perf-gate voor de release: legt een opgeslagen perf-run
// ($PERF_OUT/<naam>.json van scripts/perf/run.mjs) langs de absolute norm
// (scripts/perf/normrules.mjs) en langs een gecommitte baseline.
// Pure functies doen de vergelijking; de CLI leest de bestanden, haalt de commit
// op en schrijft <out>/perf-gate.json plus een Nederlandse samenvatting.
//   node scripts/release/perf_gate.mjs --json=<file[,file...]> [--baseline=<pad>]
//     [--out=<map>] [--update --reden=<tekst>] [--tolerantie=0.15]
//     [--avg-tolerantie=0.10] [--max-tolerantie=0.25] [--machine=<id>]
// Exitcodes: 0 groen, 1 rood, 2 fout, 3 niets gemeten.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NORM, routeMap, routeStats, routeHasFrames, routeMeasured, normViolations } from '../perf/normrules.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_BASELINE = path.join(HERE, 'baselines', 'perf-baseline.json');
export const BASELINE_SCHEMA = 'gde-perf-baseline';
export const REPORT_SCHEMA = 'gde-perf-gate';
// Relatieve regressiedrempels: een route is pas rood als hij hier fors overheen gaat.
export const DEFAULT_THRESHOLDS = Object.freeze({ p95: 0.15, avg: 0.1, max: 0.25 });
export const EXIT = Object.freeze({ GROEN: 0, ROOD: 1, FOUT: 2, NIETS_GEMETEN: 3 });
export const STATUS = Object.freeze({
  OK: 'ok',
  ROOD: 'rood',
  ONBESLIST: 'onbeslist',
  NIEUW: 'nieuw',
  ONTBREEKT: 'ontbreekt',
  OVERGESLAGEN: 'overgeslagen',
});

const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

// Drempels normaliseren; onzin valt terug op de standaard, zodat een typefout
// nooit stilletjes de poort opent.
export function normalizeThresholds(input = {}) {
  const bron = isObject(input) ? input : {};
  const kies = (waarde, terugval) => {
    if (waarde === undefined || waarde === null || waarde === '') return terugval;
    const n = Number(waarde);
    return Number.isFinite(n) && n >= 0 ? n : terugval;
  };
  return {
    p95: kies(bron.p95 !== undefined ? bron.p95 : bron.tolerantie, DEFAULT_THRESHOLDS.p95),
    avg: kies(bron.avg, DEFAULT_THRESHOLDS.avg),
    max: kies(bron.max, DEFAULT_THRESHOLDS.max),
  };
}

// Machinecontext: één vorm voor de baseline en voor de huidige run.
export function machineId(machine) {
  if (typeof machine === 'string') return machine.trim().toLowerCase();
  if (isObject(machine)) return String(machine.id || machine.machine || machine.hostname || '').trim().toLowerCase();
  return '';
}

export function machineContext(input = {}) {
  const bron = isObject(input) ? input : {};
  const hostname = typeof bron.hostname === 'string' && bron.hostname.trim() ? bron.hostname.trim() : null;
  const id = machineId(bron.id || bron.machine || hostname) || 'onbekend';
  const load = Array.isArray(bron.load) ? bron.load.map((v) => Number(v)).filter((v) => Number.isFinite(v)) : [];
  const cpus = Number.isFinite(Number(bron.cpus)) && Number(bron.cpus) > 0 ? Number(bron.cpus) : null;
  const cpu = typeof bron.cpu === 'string' && bron.cpu.trim() ? bron.cpu.trim() : null;
  return { id, hostname, load, cpus, cpu };
}

// Alleen op dezelfde machine zegt de relatieve vergelijking iets; anders is zij
// onbeslist en blijft alleen de absolute norm hard.
export function compareMachine(current, baselineMachine) {
  const b = machineId(baselineMachine);
  const c = machineId(current);
  if (!b) return { vergelijkbaar: false, reden: 'de baseline heeft geen machine-id' };
  if (!c) return { vergelijkbaar: false, reden: 'de huidige machine is onbekend' };
  if (b === c) return { vergelijkbaar: true, reden: null };
  return { vergelijkbaar: false, reden: `andere machine dan de baseline (${b} tegenover ${c})` };
}

// ---------------------------------------------------------------------------
// Baseline laden, valideren en opbouwen
// ---------------------------------------------------------------------------

export function emptyBaseline() {
  return { schema: BASELINE_SCHEMA, versie: 1, datum: null, commit: null, machine: null, load: null, reden: null, routes: {} };
}

export function validateBaseline(data) {
  if (!isObject(data)) return { ok: false, fouten: ['de baseline is geen object'] };
  const fouten = [];
  if (data.schema !== undefined && data.schema !== BASELINE_SCHEMA) fouten.push(`onbekend schema in de baseline: ${String(data.schema)}`);
  if (!isObject(data.routes)) fouten.push('de baseline heeft geen routes-object');
  else for (const [naam, route] of Object.entries(data.routes)) {
    if (!isObject(route)) fouten.push(`route ${naam} in de baseline is geen object`);
  }
  if (data.machine !== undefined && data.machine !== null && typeof data.machine !== 'object' && typeof data.machine !== 'string') {
    fouten.push('machine in de baseline is geen object of tekst');
  }
  return { ok: fouten.length === 0, fouten };
}

export function loadBaseline(file) {
  const pad = String(file || '');
  let data;
  try { data = JSON.parse(fs.readFileSync(pad, 'utf8')); }
  catch (e) {
    const melding = e && e.code === 'ENOENT' ? `baseline niet gevonden: ${pad}` : `baseline is geen geldige json: ${pad} (${e && e.message ? e.message : e})`;
    return { ok: false, fouten: [melding], pad, baseline: null };
  }
  const check = validateBaseline(data);
  return { ok: check.ok, fouten: check.fouten.map((f) => `${f} (${pad})`), pad, baseline: check.ok ? data : null };
}

// Alleen routes met frametijden én een bruikbare meting horen in de baseline.
export function frameRoutes(routes) {
  return Object.entries(isObject(routes) ? routes : {})
    .filter(([, route]) => isObject(route) && !route.error && routeHasFrames(route) && routeMeasured(route))
    .map(([naam]) => naam);
}

// Welke routes kan de gate überhaupt beoordelen? (Losse latentiemetingen niet.)
export function measuredRoutes(routes) {
  return Object.entries(isObject(routes) ? routes : {})
    .filter(([, route]) => isObject(route) && !route.error && routeMeasured(route))
    .map(([naam]) => naam);
}

export function routeCounts(routes) {
  const telling = { totaal: 0, ok: 0, rood: 0, onbeslist: 0, nieuw: 0, ontbreekt: 0, overgeslagen: 0 };
  for (const route of Object.values(isObject(routes) ? routes : {})) {
    telling.totaal++;
    const status = route && typeof route.status === 'string' ? route.status : '';
    if (Object.prototype.hasOwnProperty.call(telling, status)) telling[status]++;
  }
  return telling;
}

export function buildBaseline(routes, meta = {}) {
  const m = isObject(meta) ? meta : {};
  const baseline = emptyBaseline();
  baseline.datum = m.datum || null;
  baseline.commit = m.commit || null;
  baseline.machine = m.machine || null;
  baseline.load = m.load === undefined ? null : m.load;
  baseline.reden = m.reden || null;
  for (const naam of frameRoutes(routes)) baseline.routes[naam] = routeStats(routes[naam]);
  return baseline;
}

export function baselineInfo(baseline, pad, machineVergelijking) {
  const b = isObject(baseline) ? baseline : {};
  const vergelijking = isObject(machineVergelijking) ? machineVergelijking : { vergelijkbaar: false, reden: null };
  return {
    pad: pad || null,
    schema: b.schema || null,
    datum: b.datum || null,
    commit: b.commit || null,
    machine: b.machine || null,
    load: b.load === undefined ? null : b.load,
    reden: b.reden || null,
    routes: isObject(b.routes) ? Object.keys(b.routes).length : 0,
    vergelijkbaar: vergelijking.vergelijkbaar === true,
    melding: vergelijking.reden || null,
  };
}

// ---------------------------------------------------------------------------
// Vergelijken
// ---------------------------------------------------------------------------

export function regressionViolations(current, base, thresholds) {
  const t = normalizeThresholds(thresholds);
  const huidig = routeStats(current);
  const basis = routeStats(base);
  const uit = [];
  for (const metric of ['p95', 'avg', 'max']) {
    const factor = t[metric];
    if (!Number.isFinite(basis[metric]) || !Number.isFinite(huidig[metric]) || basis[metric] <= 0) continue;
    const grens = basis[metric] * (1 + factor);
    if (huidig[metric] > grens) {
      uit.push({
        metric,
        huidig: huidig[metric],
        baseline: basis[metric],
        drempel: +grens.toFixed(2),
        factor,
        toenamePct: +((huidig[metric] / basis[metric] - 1) * 100).toFixed(1),
      });
    }
  }
  return uit;
}

// Eén bevinding volgens $defs.bevinding uit findings-schema.json.
function makeFinding({ bron, ernst, categorie, titel, beschrijving, bewijs, bestanden }) {
  const bevinding = { bron, aspect: 'perf', ernst, categorie, titel, beschrijving };
  if (Array.isArray(bewijs) && bewijs.length) bevinding.bewijs = bewijs;
  if (Array.isArray(bestanden) && bestanden.length) bevinding.bestanden = bestanden;
  return bevinding;
}

// Vergelijkt één route met de norm en (op dezelfde machine) met de baseline.
export function compareRoute(naam, huidigeRoute, baselineRoute, context = {}) {
  const ctx = isObject(context) ? context : {};
  const thresholds = normalizeThresholds(ctx.thresholds);
  const norm = isObject(ctx.norm) ? { ...NORM, ...ctx.norm } : NORM;
  const vergelijkBaseline = ctx.vergelijkBaseline !== false;
  const machine = isObject(ctx.machine) ? ctx.machine : { vergelijkbaar: true, reden: null };
  const bron = ctx.bron || null;
  const baselinePad = ctx.baselinePad || null;
  const huidig = isObject(huidigeRoute) ? routeStats(huidigeRoute) : null;
  const basis = isObject(baselineRoute) ? routeStats(baselineRoute) : null;
  const regels = [];
  const bevindingen = [];
  let status = STATUS.OK;
  const resultaat = () => ({ status, huidig, baseline: basis, regels, bevindingen });

  // De baseline kent deze route, maar de opgegeven run niet.
  if (!isObject(huidigeRoute)) {
    status = STATUS.ONTBREEKT;
    regels.push('route staat in de baseline maar niet in deze run');
    bevindingen.push(makeFinding({
      bron: 'baseline',
      ernst: 'belangrijk',
      categorie: 'baseline',
      titel: `Route ${naam} ontbreekt in deze run`,
      beschrijving: `De baseline kent route ${naam}, maar de opgegeven perf-run bevat hem niet of niet met frametijden. Een ontbrekende route kan een regressie verbergen; draai de route opnieuw of werk de baseline bij met --update.`,
    }));
    return resultaat();
  }

  if (huidigeRoute.error) {
    status = STATUS.ONBESLIST;
    regels.push(`meting mislukt: ${String(huidigeRoute.error).slice(0, 160)}`);
    bevindingen.push(makeFinding({
      bron: 'perf',
      ernst: 'belangrijk',
      categorie: 'performance',
      titel: `Route ${naam} is niet gemeten`,
      beschrijving: `De meting van route ${naam} is mislukt: ${String(huidigeRoute.error).slice(0, 300)}. Zonder meting is er geen uitspraak over de norm of de baseline.`,
      bewijs: bron ? [`${bron}: route ${naam} met error`] : undefined,
    }));
    return resultaat();
  }

  if (!routeMeasured(huidigeRoute)) {
    if (routeHasFrames(huidigeRoute)) {
      status = STATUS.ONBESLIST;
      regels.push('geen bruikbare meting: p95 en max of de hitch-tellers ontbreken');
      bevindingen.push(makeFinding({
        bron: 'perf',
        ernst: 'belangrijk',
        categorie: 'performance',
        titel: `Route ${naam} heeft geen bruikbare meting`,
        beschrijving: `Route ${naam} heeft wel frames maar geen p95/max of hitch-tellers. Zonder die cijfers kan de gate de norm niet beoordelen; draai de perf-run opnieuw met de hitch-tellers aan (PERF_HITCH).`,
        bewijs: bron ? [bron] : undefined,
      }));
    } else {
      status = STATUS.OVERGESLAGEN;
      regels.push('geen frameroute (losse meting telt niet mee)');
    }
    return resultaat();
  }

  // De absolute norm is altijd hard, ook op een andere machine.
  const overtredingen = normViolations(huidigeRoute, norm);
  if (overtredingen.length) {
    status = STATUS.ROOD;
    for (const v of overtredingen) regels.push(`norm: ${v.rule}`);
    bevindingen.push(makeFinding({
      bron: 'perf',
      ernst: 'blokkerend',
      categorie: 'performance',
      titel: `Route ${naam} haalt de perf-norm niet`,
      beschrijving: `Route ${naam} haalt de absolute norm niet: ${overtredingen.map((v) => v.rule).join('; ')}. De norm is p95 <= ${norm.maxP95Ms} ms, max <= ${norm.maxMaxMs} ms en geen frame boven 50 of 100 ms.`,
      bewijs: overtredingen.map((v) => `${naam}: ${v.rule}${bron ? ` (${bron})` : ''}`),
      bestanden: ['scripts/perf/normrules.mjs'],
    }));
  }

  if (!vergelijkBaseline) return resultaat();

  const baselineLeeg = ctx.baselineLeeg === true;
  if (!basis) {
    if (status === STATUS.OK) status = STATUS.NIEUW;
    regels.push(baselineLeeg ? 'de baseline is nog leeg; nog geen relatieve vergelijking' : 'deze route staat nog niet in de baseline');
    bevindingen.push(makeFinding({
      bron: 'baseline',
      ernst: 'belangrijk',
      categorie: 'baseline',
      titel: `Nieuwe route ${naam} zonder baseline`,
      beschrijving: (baselineLeeg ? `De baseline is nog leeg, dus route ${naam} is nieuw.` : `Route ${naam} staat niet in de baseline.`) + ' De absolute norm is wel gecontroleerd. Werk de baseline bij met --update --reden=<tekst> als deze route op deze machine goed is.',
    }));
    return resultaat();
  }

  if (!machine.vergelijkbaar) {
    if (status === STATUS.OK) status = STATUS.ONBESLIST;
    regels.push(`relatieve vergelijking onbeslist: ${machine.reden}`);
    return resultaat();
  }

  const regressies = regressionViolations(huidigeRoute, baselineRoute, thresholds);
  if (regressies.length) {
    status = STATUS.ROOD;
    for (const r of regressies) regels.push(`${r.metric} ${r.huidig} ms > baseline ${r.baseline} ms (+${r.toenamePct}%, drempel +${Math.round(r.factor * 100)}%)`);
    bevindingen.push(makeFinding({
      bron: 'perf',
      ernst: 'blokkerend',
      categorie: 'performance',
      titel: `Route ${naam} is trager dan de baseline`,
      beschrijving: `Route ${naam} is fors trager dan de gecommitte baseline: ${regressies.map((r) => `${r.metric} ${r.huidig} ms tegen ${r.baseline} ms (+${r.toenamePct}%)`).join('; ')}.${baselinePad ? ` Baseline: ${baselinePad}.` : ''}`,
      bewijs: regressies.map((r) => `${naam}: ${r.metric} ${r.huidig} ms > baseline ${r.baseline} ms (drempel +${Math.round(r.factor * 100)}%${bron ? `, ${bron}` : ''})`),
    }));
  } else if (status === STATUS.OK) {
    regels.push(`binnen de norm en de drempels (p95 +${Math.round(thresholds.p95 * 100)}%, avg +${Math.round(thresholds.avg * 100)}%, max +${Math.round(thresholds.max * 100)}%)`);
  }
  return resultaat();
}

// Alle routes langs de norm en de baseline; ook routes die de baseline kent maar
// deze run mist, en routes die nieuw zijn.
export function compareRoutes(huidigeRoutes, baselineRoutes, options = {}) {
  const opties = isObject(options) ? options : {};
  const huidig = isObject(huidigeRoutes) ? huidigeRoutes : {};
  const basis = isObject(baselineRoutes) ? baselineRoutes : {};
  const thresholds = normalizeThresholds(opties.thresholds);
  const norm = isObject(opties.norm) ? opties.norm : NORM;
  const machine = isObject(opties.machine) ? opties.machine : { vergelijkbaar: true, reden: null };
  const vergelijkBaseline = opties.vergelijkBaseline !== false;
  const bronnen = isObject(opties.bronnen) ? opties.bronnen : {};
  const context = (naam) => ({
    thresholds,
    norm,
    machine,
    vergelijkBaseline,
    baselineLeeg: opties.baselineLeeg === true,
    bron: bronnen[naam] || null,
    baselinePad: opties.baselinePad || null,
  });
  const routes = {};
  const bevindingen = [];

  for (const [naam, route] of Object.entries(huidig)) {
    if (!isObject(route)) {
      routes[naam] = { status: STATUS.OVERGESLAGEN, huidig: null, baseline: isObject(basis[naam]) ? routeStats(basis[naam]) : null, regels: ['geen routegegevens in deze run'], bevindingen: [] };
      continue;
    }
    const resultaat = compareRoute(naam, route, basis[naam], context(naam));
    routes[naam] = resultaat;
    bevindingen.push(...resultaat.bevindingen);
  }

  if (vergelijkBaseline) {
    for (const [naam, route] of Object.entries(basis)) {
      if (Object.prototype.hasOwnProperty.call(huidig, naam)) continue;
      const resultaat = compareRoute(naam, null, route, context(naam));
      routes[naam] = resultaat;
      bevindingen.push(...resultaat.bevindingen);
    }
  }

  return { routes, bevindingen, statistiek: routeCounts(routes) };
}

// Mag --update de baseline vervangen? Alleen met een reden, minstens één
// frameroute en zonder normovertreding.
export function updateBlokkades(routes, options = {}) {
  const opties = isObject(options) ? options : {};
  const norm = isObject(opties.norm) ? opties.norm : NORM;
  const namen = frameRoutes(routes);
  const fouten = [];
  const overtredingen = [];
  for (const naam of namen) {
    for (const v of normViolations(isObject(routes) ? routes[naam] : null, norm)) overtredingen.push(`${naam}: ${v.rule}`);
  }
  if (!String(opties.reden || '').trim()) fouten.push('--reden=<tekst> of GDE_BASELINE_REDEN is verplicht bij --update');
  if (!namen.length) fouten.push('geen frameroute gemeten; er is niets om in de baseline te zetten');
  if (overtredingen.length) fouten.push(`normovertreding; de baseline is niet bijgewerkt: ${overtredingen.join('; ')}`);
  return { ok: fouten.length === 0, fouten, overtredingen, routes: namen };
}

// ---------------------------------------------------------------------------
// Verdict, rapport en samenvatting
// ---------------------------------------------------------------------------

export function verdictFor(bevindingen = []) {
  const lijst = Array.isArray(bevindingen) ? bevindingen : [];
  const blokkerend = lijst.filter((b) => isObject(b) && b.ernst === 'blokkerend').length;
  return { verdict: blokkerend ? 'rood' : 'groen', exitcode: blokkerend ? EXIT.ROOD : EXIT.GROEN, blokkerend };
}

export function buildReport(input = {}) {
  const b = isObject(input) ? input : {};
  const routes = isObject(b.routes) ? b.routes : {};
  const bevindingen = Array.isArray(b.bevindingen) ? b.bevindingen : [];
  const verdict = verdictFor(bevindingen);
  return {
    schema: REPORT_SCHEMA,
    versie: 1,
    modus: b.modus || 'controle',
    commit: b.commit || null,
    machine: b.machine || null,
    gegenereerd: b.gegenereerd || null,
    baseline: b.baseline || null,
    drempels: normalizeThresholds(b.thresholds),
    norm: { maxP95Ms: NORM.maxP95Ms, maxMaxMs: NORM.maxMaxMs, maxOver50: NORM.maxOver50, maxOver100: NORM.maxOver100 },
    bestanden: Array.isArray(b.bestanden) ? b.bestanden : [],
    routes,
    statistiek: isObject(b.statistiek) ? b.statistiek : routeCounts(routes),
    bevindingen,
    verdict: b.verdict || verdict.verdict,
    status: b.verdict || verdict.verdict,
    exitcode: Number.isInteger(b.exitcode) ? b.exitcode : verdict.exitcode,
  };
}

export function renderSummary(report) {
  const r = isObject(report) ? report : {};
  const s = isObject(r.statistiek) ? r.statistiek : {};
  const regels = [];
  regels.push(`Perf-gate (${r.modus === 'update' ? 'baseline bijwerken' : 'controle'}): ${s.ok || 0} ok, ${s.rood || 0} rood, ${s.onbeslist || 0} onbeslist, ${s.nieuw || 0} nieuw, ${s.ontbreekt || 0} ontbrekend, ${s.overgeslagen || 0} overgeslagen van ${s.totaal || 0} routes`);
  const b = isObject(r.baseline) ? r.baseline : null;
  if (b && b.pad) {
    regels.push(`baseline: ${b.pad}${b.datum ? ` (${String(b.datum).slice(0, 10)})` : ''}, ${b.routes || 0} route(s)${b.vergelijkbaar === false ? ' - niet vergelijkbaar (andere machine of geen machine-id)' : ''}`);
  }
  for (const [naam, route] of Object.entries(isObject(r.routes) ? r.routes : {})) {
    const uitleg = isObject(route) && Array.isArray(route.regels) && route.regels.length ? ` - ${route.regels.join('; ')}` : '';
    regels.push(`${naam}: ${isObject(route) ? route.status : '?'}${uitleg}`);
  }
  const lijst = Array.isArray(r.bevindingen) ? r.bevindingen : [];
  const blokkerend = lijst.filter((x) => isObject(x) && x.ernst === 'blokkerend').length;
  const belangrijk = lijst.filter((x) => isObject(x) && x.ernst === 'belangrijk').length;
  regels.push(`Verdict: ${r.verdict} - ${blokkerend} blokkerend, ${belangrijk} belangrijk; exit ${r.exitcode}`);
  return regels;
}

// ---------------------------------------------------------------------------
// Invoer laden
// ---------------------------------------------------------------------------

// Leest één of meer bewaarde perf-runs en voegt de routes samen. Een onleesbaar
// bestand is een fout: de gate moet niet op een half bestand groen worden.
export function loadRunFiles(files) {
  const lijst = Array.isArray(files) ? files : [];
  const routes = {};
  const bronnen = {};
  const fouten = [];
  const machines = [];
  for (const file of lijst) {
    let json;
    try { json = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { fouten.push(`${file} is geen geldige json (${e && e.message ? e.message : e})`); continue; }
    const runRoutes = routeMap(json);
    const namen = Object.keys(runRoutes);
    if (!namen.length) { fouten.push(`${file} bevat geen routes`); continue; }
    for (const naam of namen) {
      routes[naam] = runRoutes[naam];
      bronnen[naam] = path.basename(file);
    }
    if (isObject(json) && isObject(json.machine)) machines.push(json.machine);
  }
  return { routes, bronnen, fouten, machines };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `gebruik: node scripts/release/perf_gate.mjs --json=<file[,file...]> [--baseline=<pad>] [--out=<map>]
       [--update [--reden=<tekst>]] [--tolerantie=0.15] [--avg-tolerantie=0.10] [--max-tolerantie=0.25] [--machine=<id>]
       --update leest de reden ook uit GDE_BASELINE_REDEN (leeg: "handmatige update"); zonder reden wordt niets geschreven.`;

// De commit ophalen mag alleen in de CLI: de pure functies blijven vrij van git.
function gitCommit() {
  try {
    const resultaat = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: HERE, encoding: 'utf8', timeout: 5000 });
    const sha = (resultaat.stdout || '').trim();
    return /^[0-9a-f]{7,40}$/.test(sha) ? sha : null;
  } catch { return null; }
}

function parseArgs(argv) {
  const opts = { json: [], update: false };
  const onbekend = [];
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') { opts.help = true; continue; }
    const match = /^--([a-zA-Z0-9-]+)(?:=(.*))?$/.exec(arg);
    if (!match) { onbekend.push(arg); continue; }
    const key = match[1];
    const waarde = match[2];
    if (key === 'json') {
      for (const stuk of String(waarde || '').split(',')) { const f = stuk.trim(); if (f) opts.json.push(f); }
    } else if (key === 'update') {
      opts.update = waarde === undefined ? true : waarde !== 'false';
    } else if (['baseline', 'out', 'reden', 'machine', 'tolerantie', 'avg-tolerantie', 'max-tolerantie'].includes(key)) {
      opts[key] = waarde;
    } else {
      onbekend.push(arg);
    }
  }
  return { opts, onbekend };
}

function schrijfRapport(outMap, rapport) {
  fs.mkdirSync(outMap, { recursive: true });
  const bestand = path.join(outMap, 'perf-gate.json');
  fs.writeFileSync(bestand, JSON.stringify(rapport, null, 2) + '\n');
  return bestand;
}

function main() {
  const { opts, onbekend } = parseArgs(process.argv.slice(2));
  const fout = (melding, code = EXIT.FOUT) => { console.error(melding); return code; };
  if (opts.help) { console.log(USAGE); return EXIT.GROEN; }
  if (onbekend.length) return fout(`onbekende optie(s): ${onbekend.join(' ')}\n${USAGE}`);
  if (!opts.json.length) return fout(`geen --json=<file> opgegeven\n${USAGE}`);

  const geladen = loadRunFiles(opts.json);
  if (geladen.fouten.length) return fout(geladen.fouten.join('\n'));
  if (!Object.keys(geladen.routes).length) return fout('geen routes gevonden in de opgegeven json');

  const thresholds = normalizeThresholds({ tolerantie: opts.tolerantie, avg: opts['avg-tolerantie'], max: opts['max-tolerantie'] });
  const cpus = os.cpus();
  const machine = machineContext({ machine: opts.machine, hostname: os.hostname(), load: os.loadavg(), cpus: cpus.length, cpu: cpus[0] ? cpus[0].model : null });
  const commit = gitCommit();
  const gegenereerd = new Date().toISOString();
  const baselinePad = path.resolve(opts.baseline || DEFAULT_BASELINE);
  const outMap = path.resolve(opts.out || path.join(os.tmpdir(), 'gde-release', 'perf'));

  if (opts.update) {
    // De orchestrator geeft alleen --update mee; de reden mag dan uit de omgeving
    // komen. Zonder enige reden schrijven we niets: een baseline-update is bewust.
    const envReden = process.env.GDE_BASELINE_REDEN;
    const reden = String(opts.reden || '').trim()
      || (envReden === undefined ? '' : String(envReden).trim() || 'handmatige update');
    const check = updateBlokkades(geladen.routes, { reden, norm: NORM });
    if (!check.ok) {
      console.error(check.fouten.join('\n'));
      if (!frameRoutes(geladen.routes).length) return EXIT.NIETS_GEMETEN;
      return check.overtredingen.length ? EXIT.ROOD : EXIT.FOUT;
    }
    const baseline = buildBaseline(geladen.routes, { datum: gegenereerd, commit, machine, load: machine.load, reden });
    fs.mkdirSync(path.dirname(baselinePad), { recursive: true });
    fs.writeFileSync(baselinePad, JSON.stringify(baseline, null, 2) + '\n');
    const vergelijking = compareRoutes(geladen.routes, {}, { thresholds, vergelijkBaseline: false, bronnen: geladen.bronnen, baselinePad });
    const rapport = buildReport({
      modus: 'update',
      commit,
      machine,
      gegenereerd,
      bestanden: opts.json,
      thresholds,
      routes: vergelijking.routes,
      bevindingen: vergelijking.bevindingen,
      statistiek: vergelijking.statistiek,
      baseline: baselineInfo(baseline, baselinePad, { vergelijkbaar: true, reden: null }),
    });
    const bestand = schrijfRapport(outMap, rapport);
    for (const regel of renderSummary(rapport)) console.log(regel);
    console.log(`baseline bijgewerkt: ${baselinePad}`);
    console.log(`rapport: ${bestand}`);
    return rapport.exitcode;
  }

  const geladenBaseline = loadBaseline(baselinePad);
  if (!geladenBaseline.ok) return fout(geladenBaseline.fouten.join('\n'));
  const baseline = geladenBaseline.baseline || emptyBaseline();
  const baselineRoutes = isObject(baseline.routes) ? baseline.routes : {};
  const leeg = Object.keys(baselineRoutes).length === 0;
  // Een lege baseline heeft geen machine nodig; zodra er routes in staan, telt
  // de machine mee voor de relatieve vergelijking.
  const machineVergelijking = leeg ? { vergelijkbaar: true, reden: null } : compareMachine(machine, baseline.machine);
  const vergelijking = compareRoutes(geladen.routes, leeg ? {} : baselineRoutes, {
    thresholds,
    machine: machineVergelijking,
    baselineLeeg: leeg,
    bronnen: geladen.bronnen,
    baselinePad,
  });
  const nietsGemeten = measuredRoutes(geladen.routes).length === 0;
  const rapport = buildReport({
    modus: 'controle',
    commit,
    machine,
    gegenereerd,
    bestanden: opts.json,
    thresholds,
    routes: vergelijking.routes,
    bevindingen: vergelijking.bevindingen,
    statistiek: vergelijking.statistiek,
    baseline: { ...baselineInfo(baseline, baselinePad, machineVergelijking), leeg },
    verdict: nietsGemeten ? 'niets gemeten' : undefined,
    exitcode: nietsGemeten ? EXIT.NIETS_GEMETEN : undefined,
  });
  const bestand = schrijfRapport(outMap, rapport);
  if (rapport.baseline.melding) console.log(`let op: ${rapport.baseline.melding}; de relatieve vergelijking is onbeslist, de absolute norm blijft hard.`);
  if (nietsGemeten) console.log('niets gemeten: geen frameroutes in de opgegeven run(s); losse latentiemetingen tellen niet mee.');
  for (const regel of renderSummary(rapport)) console.log(regel);
  console.log(`rapport: ${bestand}`);
  return rapport.exitcode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
