// Spelbot fase 4 en 5 (#186), pure analyse in Node: bevindingen met vingerafdruk uit een run,
// cijfers, vergelijking met de vorige run, issueconcepten zonder dubbelen, PNG-controle van
// screenshots, audio-samenvatting en de Nederlandse samenvatting. Geen Electron, geen netwerk.
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { summarise } from '../../game/js/botlogic.js';

// --- vingerafdruk ------------------------------------------------------------------
// Getallen, coordinaten en hexwaarden eruit, zodat dezelfde fout in elke run dezelfde afdruk krijgt.
export const normalise = (s) => String(s || '').toLowerCase().replace(/0x[0-9a-f]+/g, '#').replace(/-?\d+([.,]\d+)?/g, '#').replace(/\s+/g, ' ').trim().slice(0, 160);
export const fingerprint = (kind, step, text) => crypto.createHash('sha1').update([kind, step || '', normalise(text)].join('|')).digest('hex').slice(0, 10);

// --- bevindingen -----------------------------------------------------------------------
// { fp, kind, severity, title, detail, step, shot }; severity: bug | opmerking
export function findings(events) {
  const S = summarise(events);
  const out = [];
  const add = (kind, severity, step, title, detail, shot) => out.push({ fp: fingerprint(kind, step, title), kind, severity, step: step || '', title, detail: detail || '', shot: shot || '' });
  const shotFor = (name) => (events.find((e) => e.type === 'shot' && e.name === name) || {}).name || '';
  for (const e of S.consoleErrors) add('console', 'bug', '', `Consolefout: ${String(e.msg).slice(0, 120)}`, `${e.msg}`);
  for (const e of events.filter((x) => x.type === 'console' && (x.level === 'warning' || x.level === 2) && /TypeError|ReferenceError|non-finite|is not a function|undefined/.test(x.msg || ''))) add('console-waarschuwing', 'bug', '', `Waarschuwing: ${String(e.msg).slice(0, 120)}`, String(e.msg));
  if (S.nan) add('nan', 'bug', '', 'NaN-waarschuwingen in geometrie (computeBoundingSphere)', `${S.nan} waarschuwing(en); de verhaaltest faalt hierop`);
  for (const e of S.stuck) {
    const sid = String(e.step || '').split(':')[0];
    const name = String(e.step || '').replace(/[^\w.-]/g, '_') + '-vast';
    if (String(e.step).startsWith('mg-')) add('minigame-vast', 'bug', e.step, `Minigame ${String(e.step).slice(3)}: de bot komt niet verder`, `Geen verandering gedurende ${Math.round(e.idleFor || 0)} s`, shotFor(name));
    else add('vast', 'bug', sid, `Bot zit vast bij ${sid}`, `Op (${Math.round(e.x)}, ${Math.round(e.y)}), ${Math.round(e.idleFor || 0)} s zonder voortgang, afstand tot doel ${e.goalDist != null ? Math.round(e.goalDist) + ' m' : 'onbekend'}`, shotFor(name));
  }
  for (const e of events.filter((x) => x.type === 'wacht-te-lang')) add('wacht', 'bug', String(e.step || '').split(':')[0], `Bot wacht te lang bij ${String(e.step || '').split(':')[0]}: ${(e.blocking || []).join(', ') || e.act}`, `Het spel laat niet los (${e.act}${e.why ? ', ' + e.why : ''}); vlaggen: ${(e.blocking || []).join(', ') || 'geen'}`);
  // een tak die zijn eigen klok bijhoudt (duif, vliegtuig, paneel) liep zonder time-out door tot het eind van de run (#387)
  for (const e of events.filter((x) => x.type === 'timeout')) add('timeout', 'bug', String(e.step || '').split(':')[0], `Bot hing bij ${String(e.step || '').split(':')[0]}: ${e.what || 'duurde te lang'}`, `Na ${Math.round(e.forS || 0)} s op (${Math.round(e.x)}, ${Math.round(e.y)})${e.goalDist != null ? `, ${Math.round(e.goalDist)} m van doel` : ''}${e.doel && Number.isFinite(e.doel.x) ? `, doel (${Math.round(e.doel.x)}, ${Math.round(e.doel.y)})` : ''}`);
  const cheatSteps = new Map();
  for (const c of S.cheats.filter((x) => x.rung !== 'nudge')) cheatSteps.set(String(c.step).split(':')[0], (cheatSteps.get(String(c.step).split(':')[0]) || []).concat(c.rung));
  for (const [step, rungs] of cheatSteps) add('cheat', 'bug', step, `${step} had een cheat nodig om door te gaan`, `Rungs: ${rungs.join(', ')}`);
  for (const m of S.missions.filter((x) => x.fails >= 2)) add('mislukt', 'opmerking', m.id, `${m.id} mislukte ${m.fails} keer voor de bot`, `Dat kan aan de bot liggen; kijk of de missie ook voor een speler te moeilijk is`);
  for (const m of S.minigames.filter((x) => !x.started)) add('minigame-start', 'opmerking', `mg-${m.id}`, `Minigame ${m.id} start niet bij E`, [m.how, m.prompt ? `prompt: ${m.prompt}` : ''].filter(Boolean).join('; '));
  // #312: een kartrace die de bot niet uitrijdt is een opmerking (botzwakte of een baan die niet rond komt)
  for (const e of events.filter((x) => x.type === 'race-uitslag' && !x.klaar)) add('race', 'opmerking', 'mg-kartbaan', 'Kartrace niet uitgereden', `Plek ${e.plek} van ${e.karts} na ${e.rondes} ronde(s)`);
  for (const e of events.filter((x) => x.type === 'schema')) add('schema', 'bug', '', 'De status van playerapi.js klopt niet met het schema', (e.problems || []).join('; '));
  if (S.unbalanced.length) add('invoer', 'bug', '', 'Toets zonder keyup', S.unbalanced.join(', '));
  // één vingerafdruk komt maar één keer voor
  const seen = new Set();
  return out.filter((f) => (seen.has(f.fp) ? false : seen.add(f.fp)));
}

// --- cijfers ------------------------------------------------------------------------------
export function metrics(events, result = {}) {
  const S = summarise(events);
  const done = S.missions.filter((m) => m.end != null);
  const perMission = Object.fromEntries(S.missions.map((m) => [m.id, m.end != null ? Math.round(m.end - m.start) : null]));
  // waar de run stopte: de laatste stap die begon (het rapport zegt het bovenaan, #387)
  const begins = events.filter((e) => e.type === 'step' && e.event === 'begin');
  const lastStep = (begins[begins.length - 1] || {}).id || (S.missions.length ? S.missions[S.missions.length - 1].id : '');
  return {
    result: result.result || '', gameSeconds: Math.round(result.gameSeconds || 0), lastStep,
    stepsDone: done.length, stepsStarted: S.missions.length,
    stuck: S.stuck.length, timeouts: S.timeouts.length, cheats: S.cheats.filter((c) => c.rung !== 'nudge').length, fails: S.missions.reduce((n, m) => n + m.fails, 0),
    consoleErrors: S.consoleErrors.length, nan: S.nan, warnings: S.warnings,
    // #312: de nieuwe vaardigheden in de cijfers: hoeveel tikken de heli en de boot kregen
    helis: events.filter((e) => e.type === 'heli').length, vaart: events.filter((e) => e.type === 'vaart').length,
    // #312: de kartrace en de stunt: een uitslag per gereden race, en de drift/aanloopregels van M01
    races: events.filter((e) => e.type === 'race-uitslag').length,
    raceWins: events.filter((e) => e.type === 'race-uitslag' && e.plek === 1).length,
    stuntTicks: events.filter((e) => e.type === 'stunt').length,
    minigamesStarted: S.minigames.filter((m) => m.started).length, minigames: S.minigames.length,
    perMission,
  };
}

// --- per akte (#186, #312) ------------------------------------------------------------
// De vijf aktes van het nieuwe verhaal; de reisstappen horen bij de akte waarin ze vallen
// (docs/TESTEN.md: T1 en T2 bij akte 2, T3 bij 3, T4 bij 4). De epiloog telt bij akte 5.
// Een minigame of een losse activiteit hoort bij geen akte (0).
export const ACTS = [
  { n: 1, name: 'Akte 1: Moi, Grunn', steps: ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06'] },
  { n: 2, name: 'Akte 2: Het Noorden is groot', steps: ['M07', 'M08', 'M09', 'M10', 'M11', 'T1', 'T2'] },
  { n: 3, name: 'Akte 3: Aan de Eems', steps: ['M12', 'M13', 'M14', 'M15', 'M16', 'T3'] },
  { n: 4, name: 'Akte 4: Zuidwaarts', steps: ['M17', 'M18', 'M19', 'M20', 'M21', 'T4'] },
  { n: 5, name: 'Akte 5: Ontzet', steps: ['M22', 'M23', 'M24', 'M25', 'M26', 'M27', 'E'] },
];
const STEP_ACT = new Map(ACTS.flatMap((a) => a.steps.map((id) => [id, a.n])));
// Het aktenummer van een stap: 'M02:m' en 'M02:duif' horen bij M02; een minigame bij 0.
export function actOf(step) {
  const id = String(step || '').split(':')[0];
  if (/^mg-/.test(id)) return 0;
  return STEP_ACT.get(id) || 0;
}

// Per akte: de tijd (de som van de afgeronde stappen), hoeveel stappen klaar zijn, en waar de bot
// hing (vast, time-out) of een cheat nodig had. `extra` is de regel voor wat buiten een akte viel
// (minigames, losse activiteiten), zodat het rapport niets weglaat.
export function perAct(events) {
  const acts = ACTS.map((a) => ({ n: a.n, name: a.name, seconds: 0, steps: [], done: 0, started: 0, stuck: [], timeouts: [], cheats: [], fails: 0 }));
  const extra = { n: 0, name: 'Buiten de aktes (minigames en losse activiteiten)', seconds: 0, steps: [], done: 0, started: 0, stuck: [], timeouts: [], cheats: [], fails: 0 };
  const byN = new Map([...acts, extra].map((a) => [a.n, a]));
  const open = new Map();
  const findOpen = (id) => {
    const list = open.get(id) || [];
    return list.length ? list[list.length - 1] : null;
  };
  for (const e of events) {
    if (e.type === 'step') {
      const id = String(e.id || '?');
      if (e.event === 'begin') {
        const a = byN.get(actOf(id));
        const rec = { id, label: e.label || '', start: e.t, end: null, outcome: null };
        a.steps.push(rec); a.started++;
        if (!open.has(id)) open.set(id, []);
        open.get(id).push(rec);
      } else if (e.event === 'end') {
        const rec = findOpen(id);
        if (rec) { rec.end = e.t; rec.outcome = e.outcome || 'klaar'; if (rec.end != null) byN.get(actOf(id)).done++; }
      }
    } else if (e.type === 'mission' && e.event === 'fail') {
      const a = byN.get(actOf(e.id));
      if (a) a.fails++;
    } else if (e.type === 'stuck' || e.type === 'timeout' || e.type === 'cheat') {
      const a = byN.get(actOf(e.step));
      if (!a) continue;
      if (e.type === 'stuck') a.stuck.push(e);
      else if (e.type === 'timeout') a.timeouts.push(e);
      else if (isCheatRung(e.rung)) a.cheats.push(e);
    }
  }
  for (const a of [...acts, extra]) {
    a.seconds = Math.round(a.steps.reduce((s, r) => s + (r.end != null ? Math.max(0, r.end - r.start) : 0), 0));
    a.steps = a.steps.filter((r) => r.end != null || r.label || r.start != null);
  }
  return { acts, extra };
}
const isCheatRung = (rung) => rung && rung !== 'nudge';

// Een Markdown-tabel per akte, met dezelfde kolommen als het missierapport.
export function actTable(acts) {
  const out = ['| Akte | Tijd | Stappen klaar | Vast | Time-outs | Cheats |', '|---|---|---|---|---|---|'];
  for (const a of acts) {
    out.push(`| ${a.name} | ${fmtClock(a.seconds)} | ${a.done}/${a.started} | ${a.stuck.length} | ${a.timeouts.length} | ${a.cheats.length} |`);
  }
  return out.join('\n');
}
const fmtClock = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.round(Math.max(0, s) % 60)).padStart(2, '0')}`;

// Waar de bot hing, per akte: de vastzitmomenten en time-outs, het langst eerst. Elke regel zegt
// de akte, de stap, de seconden en de plek, zodat er zonder de runmap iets mee te doen is.
export function whereHung(acts, max = 10) {
  const out = [];
  for (const a of acts) {
    for (const e of a.stuck) out.push({ act: a.n, name: a.name, step: e.step || '?', seconds: Math.round(e.idleFor || 0), x: e.x, y: e.y, goalDist: e.goalDist, kind: 'vast', what: `${Math.round(e.idleFor || 0)} s zonder voortgang` });
    for (const e of a.timeouts) out.push({ act: a.n, name: a.name, step: e.step || '?', seconds: Math.round(e.forS || 0), x: e.x, y: e.y, goalDist: e.goalDist, kind: 'time-out', what: e.what || 'duurde te lang' });
  }
  return out.sort((p, q) => q.seconds - p.seconds).slice(0, max);
}

// Een korte samenvatting die als comment op het spelbot-issue kan (#186): per akte de tijd, waar
// hij hing en wat er nog open is. Nederlands, geen interne paden, geen screenshot-lijst.
export function issueComment({ title = 'run', date = '', run = '', metrics: m = {}, acts = [], extra = null, findings: fs = [] }) {
  const out = [`## Spelbot: ${title}${date ? ` (${date})` : ''}`, ''];
  out.push(`Uitkomst **${m.result || 'onbekend'}**, speltijd ${fmtClock(m.gameSeconds || 0)}, ${m.stepsDone || 0} van ${m.stepsStarted || 0} stappen klaar${run ? ` (run ${run})` : ''}.`);
  out.push(`Vastgezeten ${m.stuck || 0}, time-outs ${m.timeouts || 0}, cheat nodig ${m.cheats || 0}, consolefouten ${m.consoleErrors || 0}, NaN ${m.nan || 0}.`);
  if (m.races) out.push(`Kartraces: ${m.races} gereden, ${m.raceWins || 0} gewonnen.`);
  if (acts.length) {
    out.push('', '### Per akte', '', actTable(acts));
    if (extra && (extra.started || extra.stuck.length || extra.timeouts.length)) out.push('', `Buiten de aktes: ${extra.done}/${extra.started} stappen, ${fmtClock(extra.seconds)}.`);
  }
  const hung = whereHung(acts);
  out.push('', '### Waar hij hing', '');
  if (!hung.length) out.push('Nergens: geen vastzitmoment en geen time-out.');
  for (const h of hung) out.push(`- ${h.name}, ${h.step}: ${h.kind} na ${h.seconds} s${Number.isFinite(h.x) ? ` op (${Math.round(h.x)}, ${Math.round(h.y)})` : ''}${Number.isFinite(h.goalDist) ? `, ${Math.round(h.goalDist)} m van het doel` : ''}${h.kind === 'time-out' ? ` (${h.what})` : ''}`);
  const bugs = (fs || []).filter((f) => f.severity === 'bug');
  out.push('', '### Bevindingen', '');
  if (!bugs.length) out.push('Geen fouten gevonden.');
  for (const f of bugs.slice(0, 6)) out.push(`- ${f.title}`);
  if (bugs.length > 6) out.push(`- ... en nog ${bugs.length - 6} (zie het volledige rapport)`);
  out.push('', '### Wat open blijft', '');
  if (m.result && !/^(KLAAR|REPLAY)/.test(String(m.result))) out.push(`- De run is niet uitgespeeld (${m.result}); de laatste stap was ${m.lastStep || '?'}.`);
  if (m.cheats) out.push(`- ${m.cheats} keer een cheat nodig: dat zegt iets over de bot én over het spel.`);
  if (!m.races) out.push('- Geen kartrace gereden in deze run.');
  out.push('- Of het leuk is, hoe de besturing voelt, geluid en beeld bij 1080p of 4K: dat beoordeelt de bot niet.');
  return out.join('\n');
}


// nieuw (bevindingen die er eerder niet waren), opgelost (er eerder wel, nu niet), regressies (cijfers die slechter werden)
const WORSE_IF_HIGHER = ['stuck', 'timeouts', 'cheats', 'fails', 'consoleErrors', 'nan'];
export function compareRuns(prev, cur) {
  if (!prev) return { first: true, nieuw: cur.findings || [], opgelost: [], regressies: [] };
  const had = new Set((prev.findings || []).map((f) => f.fp)), has = new Set((cur.findings || []).map((f) => f.fp));
  const regressies = [];
  for (const k of WORSE_IF_HIGHER) if ((cur.metrics[k] || 0) > (prev.metrics[k] || 0)) regressies.push({ metric: k, was: prev.metrics[k] || 0, nu: cur.metrics[k] });
  if (cur.metrics.stepsDone < prev.metrics.stepsDone) regressies.push({ metric: 'stepsDone', was: prev.metrics.stepsDone, nu: cur.metrics.stepsDone });
  for (const [id, secs] of Object.entries(cur.metrics.perMission || {})) {
    const was = (prev.metrics.perMission || {})[id];
    if (secs != null && was != null && secs > was * 1.5 && secs - was > 30) regressies.push({ metric: `tijd ${id}`, was, nu: secs });
  }
  return { first: false, nieuw: (cur.findings || []).filter((f) => !had.has(f.fp)), opgelost: (prev.findings || []).filter((f) => !has.has(f.fp)), regressies };
}

// --- issues zonder dubbelen -----------------------------------------------------------------
export const FP_MARK = (fp) => `spelbot:${fp}`;
const IMPACT = { wacht: 'impact-hoog', console: 'impact-hoog', nan: 'impact-hoog', vast: 'impact-hoog', timeout: 'impact-hoog', 'minigame-vast': 'impact-midden', 'minigame-start': 'impact-midden', cheat: 'impact-hoog', mislukt: 'impact-laag', schema: 'impact-laag', invoer: 'impact-midden' };
const COST = { wacht: 'kosten-M', console: 'kosten-S', nan: 'kosten-M', vast: 'kosten-M', timeout: 'kosten-M', 'minigame-vast': 'kosten-M', 'minigame-start': 'kosten-S', cheat: 'kosten-M', mislukt: 'kosten-S', schema: 'kosten-S', invoer: 'kosten-S' };

// existing: [{ number, title, body, state }] van gh; geeft per bevinding 'nieuw' of 'bestaat' (met nummer)
export function planIssues(list, existing) {
  const by = new Map();
  for (const i of existing) { const m = /spelbot:([0-9a-f]{10})/.exec(i.body || ''); if (m) by.set(m[1], i); }
  return list.filter((f) => f.severity === 'bug').map((f) => {
    const hit = by.get(f.fp);
    return hit ? { f, action: hit.state === 'CLOSED' ? 'heropen-comment' : 'comment', number: hit.number } : { f, action: 'nieuw' };
  });
}

export function issueDraft(f, ctx = {}) {
  const body = [
    `Gevonden door de Spelbot (epic #186)${ctx.run ? ` in run ${ctx.run}` : ''}.`, '',
    `**Wat:** ${f.title}`, f.detail ? `**Detail:** ${f.detail}` : '', f.step ? `**Stap:** ${f.step}` : '',
    f.shot ? `**Screenshot:** ${ctx.shotPrefix || 'shots-'}${f.shot}.png (bijlage in de eerste comment)` : '',
    ctx.replay ? `**Replay:** ${ctx.replay} (\`node scripts/bot/run.mjs --replay=...\`)` : '',
    '', 'Nog niet in beeld bekeken door een agent.', '', `<!-- ${FP_MARK(f.fp)} -->`].filter((l) => l !== '').join('\n');
  return { title: `Spelbot: ${f.title}`.slice(0, 120), body, labels: ['bug', IMPACT[f.kind] || 'impact-midden', COST[f.kind] || 'kosten-M'] };
}

// --- PNG-controle (8 bit, RGB of RGBA, niet-geïnterlinieerd) ------------------------------------------
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('geen PNG');
  let p = 8, w = 0, h = 0, depth = 0, type = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), name = buf.toString('latin1', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (name === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; if (data[12]) throw new Error('geïnterlinieerd'); }
    else if (name === 'IDAT') idat.push(data);
    else if (name === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || (type !== 2 && type !== 6)) throw new Error(`niet ondersteund: diepte ${depth} type ${type}`);
  const bpp = type === 6 ? 4 : 3, stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = out.subarray(y * stride, (y + 1) * stride), up = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0, b = up ? up[x] : 0, c = up && x >= bpp ? up[x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      row[x] = v & 255;
    }
  }
  return { w, h, bpp, data: out };
}

// Verhoudingen voor de eenvoudige controle: zwart (lumen < 8), wit, magenta (de NaN-pixels van ?pixeldebug),
// cyaan (negatieve HDR) en hoe vlak het beeld is (standaardafwijking van de helderheid).
export function imageStats(img) {
  const { w, h, bpp, data } = img;
  let black = 0, white = 0, magenta = 0, cyan = 0, sum = 0, sum2 = 0, n = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    const i = (y * w + x) * bpp, r = data[i], g = data[i + 1], b = data[i + 2], l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    n++; sum += l; sum2 += l * l;
    if (l < 8) black++; else if (l > 247) white++;
    if (r > 230 && g < 40 && b > 230) magenta++;
    if (r < 40 && g > 230 && b > 230) cyan++;
  }
  const mean = sum / n;
  return { blackFrac: black / n, whiteFrac: white / n, magentaFrac: magenta / n, cyanFrac: cyan / n, mean, stdev: Math.sqrt(Math.max(0, sum2 / n - mean * mean)) };
}

// automatische vlaggen: ['zwart', 'leeg', 'nan-pixels', ...]
export function imageFlags(st) {
  const f = [];
  if (st.blackFrac > 0.97) f.push('zwart beeld');
  else if (st.whiteFrac > 0.97) f.push('wit beeld');
  else if (st.stdev < 3) f.push('leeg of vlak beeld');
  if (st.magentaFrac > 0.002) f.push('magenta pixels (NaN)');
  if (st.cyanFrac > 0.002) f.push('cyaan pixels (negatieve HDR)');
  return f;
}

// De checklist voor een beoordelaar (de eigenaar of een subagent): per screenshot dezelfde vragen.
export const CHECKLIST = ['HUD en tekst zijn leesbaar en niet afgekapt', 'Geen clipping: niets steekt door muren, vloeren of de camera', 'Geen gaten in de wereld (zicht op de leegte, ontbrekende tegels)', 'Geen zwart of leeg beeld, geen flikkerende vlakken', 'Geen magenta of cyaan pixels (NaN of negatieve HDR)', 'Alleen Nederlands; geen echte merken in beeld'];
export function checklistMarkdown(shots) {
  const out = ['# Beoordeling screenshots', '', 'Vink per screenshot af. De bot heeft alleen de automatische controle gedaan (kolom Auto).', ''];
  for (const s of shots) {
    out.push(`## ${s.file}`, '', s.moment ? `Moment: ${s.moment}` : '', `Auto: ${s.flags.length ? '**' + s.flags.join(', ') + '**' : 'geen bijzonderheden'}`, '', ...CHECKLIST.map((c) => `- [ ] ${c}`), '');
  }
  return out.join('\n');
}

// --- audio -------------------------------------------------------------------------------------------
// Events: { type: 'audio', rms, peak } elke 250 ms en { type: 'sfx', name } per afgespeeld effect.
export function audioSummary(events, { silentS = 20 } = {}) {
  const samples = events.filter((e) => e.type === 'audio');
  let clips = 0, silentRun = 0, longestSilent = 0, last = null;
  for (const s of samples) {
    if (s.peak >= 0.999) clips++;
    if (s.rms < 0.0005) { silentRun = last == null ? 0 : silentRun + (s.t - last); longestSilent = Math.max(longestSilent, silentRun); } else silentRun = 0;
    last = s.t;
  }
  const sfx = {};
  for (const e of events.filter((x) => x.type === 'sfx')) sfx[e.name] = (sfx[e.name] || 0) + 1;
  // gebeurtenissen die een geluid horen te hebben: een missiestart of -mislukking zonder effect binnen 3 s
  const quiet = events.filter((e) => e.type === 'mission' && (e.event === 'start' || e.event === 'fail')).filter((e) => !events.some((x) => (x.type === 'sfx' || x.type === 'voice') && x.t >= e.t - 0.5 && x.t <= e.t + 3));
  return { samples: samples.length, clips, longestSilent: Math.round(longestSilent * 10) / 10, silentTooLong: longestSilent >= silentS, sfx, quiet: quiet.map((e) => ({ t: e.t, what: `${e.event} ${e.id || ''}` })) };
}

// --- Nederlandse samenvatting --------------------------------------------------------------------------
const fmtS = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
export function nlSummary({ title, date, metrics: m, cmp, findings: fs, issues = [], audio = null, acts = [], extra = null }) {
  const out = [`# Spelbot, ${title || 'run'}${date ? ` (${date})` : ''}`, ''];
  out.push(`De bot speelde ${fmtS(m.gameSeconds)} speltijd en kwam klaar met ${m.stepsDone} van ${m.stepsStarted} gestarte stappen. Uitkomst: **${m.result || 'onbekend'}**.`);
  out.push(`Vastgezeten: ${m.stuck} keer. Time-outs: ${m.timeouts || 0}. Cheat nodig: ${m.cheats} keer. Missies mislukt: ${m.fails}. Consolefouten: ${m.consoleErrors}. NaN-waarschuwingen: ${m.nan}.`);
  if (m.races) out.push(`Kartraces: ${m.races} gereden, ${m.raceWins || 0} gewonnen; stunttikken: ${m.stuntTicks || 0}.`);
  if (m.result && !/^(KLAAR|REPLAY)/.test(String(m.result)) && m.lastStep) out.push(`De run stopte in stap ${m.lastStep}; zie "Waar de run stopte" in report.md.`);
  if (m.minigames) out.push(`Minigames: ${m.minigamesStarted} van ${m.minigames} gestart.`);
  if (acts && acts.length) {
    out.push('', '## Per akte', '', actTable(acts));
    if (extra && (extra.started || extra.stuck.length || extra.timeouts.length)) out.push('', `Buiten de aktes: ${extra.done}/${extra.started} stappen, ${fmtS(extra.seconds)}.`);
    const hung = whereHung(acts);
    out.push('', '## Waar hij hing', '');
    if (!hung.length) out.push('Nergens: geen vastzitmoment en geen time-out.');
    for (const h of hung) out.push(`- ${h.name}, ${h.step}: ${h.kind} na ${h.seconds} s${Number.isFinite(h.x) ? ` op (${Math.round(h.x)}, ${Math.round(h.y)})` : ''}${Number.isFinite(h.goalDist) ? `, ${Math.round(h.goalDist)} m van het doel` : ''}${h.kind === 'time-out' ? ` (${h.what})` : ''}`);
  }
  if (cmp && !cmp.first) {
    out.push('', '## Ten opzichte van de vorige run', '', `- Nieuw: ${cmp.nieuw.length}${cmp.nieuw.length ? ' (' + cmp.nieuw.map((f) => f.title).slice(0, 5).join('; ') + ')' : ''}`, `- Opgelost: ${cmp.opgelost.length}${cmp.opgelost.length ? ' (' + cmp.opgelost.map((f) => f.title).slice(0, 5).join('; ') + ')' : ''}`);
    out.push(`- Regressies: ${cmp.regressies.length ? cmp.regressies.map((r) => `${r.metric} ${r.was} naar ${r.nu}`).join('; ') : 'geen'}`);
  } else out.push('', 'Dit is de eerste run: er is nog niets om mee te vergelijken.');
  if (audio) out.push('', `Geluid: ${audio.samples ? `langste stilte ${audio.longestSilent} s, ${audio.clips} keer clipping, ${Object.keys(audio.sfx).length} verschillende effecten (onder --stil is de uitgang gedempt: lange stilte zegt dan weinig)` : 'niet gemeten (start met --audio)'}.`);
  out.push('', '## Bevindingen', '');
  if (!fs.length) out.push('Geen.');
  for (const f of fs) { const i = issues.find((x) => x.f.fp === f.fp); out.push(`- [${f.severity}] ${f.title}${i ? ` (${i.action === 'nieuw' ? 'nieuw issue' : 'issue #' + i.number}${i.created ? ' ' + i.created : ''})` : ''}`); }
  out.push('', 'De bot beoordeelt niet of het leuk is of hoe de besturing voelt; dat blijft aan de eigenaar en echte spelers.', '');
  return out.join('\n');
}

// Een bevinding per vlag van een screenshot (zwart, leeg, NaN-pixels): shots = [{ file, flags }]
export function imageFindings(shots) {
  const out = [];
  for (const s of shots) {
    const name = String(s.file).replace(/^shots-/, '').replace(/\.png$/, '');
    for (const flag of s.flags) out.push({ fp: fingerprint('beeld', name.split(/[-_]/)[0], flag), kind: 'beeld', severity: 'bug', step: name.split(/[-_]/)[0], title: `Screenshot ${name}: ${flag}`, detail: `Automatische controle op ${s.file}`, shot: name });
  }
  const seen = new Set();
  return out.filter((f) => (seen.has(f.fp) ? false : seen.add(f.fp)));
}
