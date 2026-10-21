// Balans en tempo per missie uit runs van de Spelbot (#147). Leest alleen events.jsonl (geen Electron):
//   node scripts/bot/balans.mjs --out=docs/verhaal/BALANS-TEMPO.md kop=<runmap> romp=<runmap> staart=<runmap> zuid=<runmap> ontzet=<runmap>
// Per stap (uit de 'step'-gebeurtenissen met de meter van bot.page.js): speeltijd, echte tijd, afgelegde meters, tijd in cutscenes,
// in gesprekken, doelwissels, de langste stilte (geen beweging, scène of nieuw doel), mislukt ('Opnieuw'), vastgezeten en cheats.
// Daarna per akte de mediaan en het maximum en een lijst afwijkingen. De bot beoordeelt geen plezier: een lange stilte of een cheat
// kan aan de bot liggen. Een stap met een cheat telt niet mee in de mediaan (de cheat knipt de tijd af).
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const runs = process.argv.slice(2).filter((a) => !a.startsWith('--') && a.includes('=')).map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]);
const fmt = (s) => (s == null ? '-' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : null; };

export function readEvents(dir) {
  return fs.readFileSync(path.join(dir, 'events.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

// per step: { id, title, t0, t1, speel, wall, dist, cine, cineN, talk, goals, maxQuiet, fails, stuck, cheats, outcome, cineDur[] }
export function stepsOf(events) {
  const steps = new Map();
  const cur = { id: null };
  const get = (id) => { if (!steps.has(id)) steps.set(id, { id, title: '', t0: null, t1: null, speel: null, wall: null, dist: null, cine: null, cineN: null, talk: null, goals: 0, maxQuiet: null, fails: 0, stuck: 0, cheats: [], outcome: '', cineDur: [], routes: [], firstStatus: null }); return steps.get(id); };
  for (const e of events) {
    if (e.type === 'step' && e.event === 'begin') { cur.id = e.id; const s = get(e.id); s.title = e.label || ''; if (s.t0 == null) s.t0 = e.t; }
    else if (e.type === 'step' && e.event === 'end') {
      const s = get(e.id); s.t1 = e.t; s.outcome = e.outcome || '';
      for (const k of ['wall', 'dist', 'cine', 'cineN', 'talk', 'maxQuiet', 'actief', 'limiet', 'restMin']) if (e[k] != null) s[k] = e[k];
      if (e.goals != null) s.goals = e.goals;
      s.speel = s.t0 != null ? Math.round((e.t - s.t0) * 10) / 10 : null;
    } else if (cur.id) {
      const s = get(cur.id);
      if (e.type === 'mission' && e.event === 'fail') s.fails++;
      else if (e.type === 'stuck') s.stuck++;
      else if (e.type === 'cheat' && e.rung !== 'nudge') s.cheats.push(e.rung);
      else if (e.type === 'cine') s.cineDur.push(e.dur);
      else if (e.type === 'doel' && Number.isFinite(e.afstand)) s.routes.push({ afstand: e.afstand, veh: e.veh });
      else if (e.type === 'status' && !s.firstStatus && Number.isFinite(e.dist)) s.firstStatus = { afstand: e.dist, veh: e.veh };
    }
  }
  // the step a run ends in has no 'end' of its own (older runs): it lasts until the last event
  const lastT = events.reduce((m, e) => (Number.isFinite(e.t) ? Math.max(m, e.t) : m), 0);
  for (const s of steps.values()) if (s.speel == null && s.t0 != null && s.t1 == null) { s.speel = Math.round((lastT - s.t0) * 10) / 10; s.outcome = s.outcome || 'laatste'; }
  return [...steps.values()];
}

// de ontwerp-duur van de cutscenes per akte (leestijd, zonder de opnames): uit de catalogus van de cutscene-preview
export async function cutsceneSpreiding() {
  const { buildCatalog } = await import('../../game/js/cutpreview.js');
  const root = new URL('../../', import.meta.url);
  const script = JSON.parse(fs.readFileSync(new URL('game/storydata/script.json', root), 'utf8'));
  const cat = buildCatalog({ script, npcSource: fs.readFileSync(new URL('game/js/missionstory.js', root), 'utf8') });
  const akteVan = (id) => { const m = /^M(\d+)/.exec(id); if (!m) return null; const k = +m[1]; return k <= 6 ? 'kop' : k <= 11 ? 'romp' : k <= 16 ? 'staart' : k <= 21 ? 'zuid' : 'ontzet'; };
  const perAkte = {};
  for (const e of cat) { const a = akteVan(e.id); if (!a || !e.duration) continue; (perAkte[a] = perAkte[a] || []).push({ id: e.id, dur: e.duration }); }
  const lines = ['## Cutscenes per akte (ontwerp)', '', 'Duur van de scènes zoals het spel ze timet zonder opnames (leestijd per regel); met opnames is een scène korter of even lang. Afgeleid uit `cutpreview.js`.', '', '| Akte | Scènes | Mediaan | Langste | Totaal | Scènes boven 90 s |', '|---|---|---|---|---|---|'];
  for (const [a, list] of Object.entries(perAkte)) {
    const longest = list.reduce((b, x) => (!b || x.dur > b.dur ? x : b), null);
    lines.push(`| ${AKTEN[a]} | ${list.length} | ${fmt(median(list.map((x) => x.dur)))} | ${longest.id} ${fmt(longest.dur)} | ${fmt(list.reduce((n, x) => n + x.dur, 0))} | ${list.filter((x) => x.dur > 90).map((x) => x.id).join(', ') || '-'} |`);
  }
  lines.push('');
  return { text: lines.join('\n'), perAkte };
}

// the length of the route a player has to cover, whoever plays: the distance to each goal when it appears (the first of the step from the
// first status when the run did not log it). Time: 5,5 m/s on foot, 14 m/s in a vehicle. Goals beyond 8 km (a train, a flight) are left out.
export function nominaal(s) {
  const list = s.routes.length ? s.routes : s.firstStatus ? [s.firstStatus] : [];
  let m = 0, t = 0;
  for (const r of list) { if (!(r.afstand < 8000)) continue; m += r.afstand; t += r.afstand / (r.veh && r.veh !== 'te voet' ? 14 : 5.5); }
  return { meter: Math.round(m), sec: Math.round(t) };
}

export const AKTEN = { kop: 'Akte 1', romp: 'Akte 2', staart: 'Akte 3', zuid: 'Akte 4', ontzet: 'Akte 5' };

// afwijkingen van één akte: de regels die in de tabel gemarkeerd worden
export function afwijkingen(steps, { quiet = 90, ritM = 1800 } = {}) {
  const clean = steps.filter((s) => s.speel != null && s.cheats.length === 0 && /^M\d/.test(s.id));
  const med = median(clean.map((s) => s.speel));
  const out = [];
  for (const s of steps) {
    if (!/^M\d|^T\d/.test(s.id) || s.speel == null) continue;
    if (s.maxQuiet != null && s.maxQuiet > quiet) out.push({ id: s.id, soort: 'stilte', tekst: `${s.id}: ${Math.round(s.maxQuiet)} s zonder beweging, scène of nieuw doel` });
    const nom = nominaal(s);
    if (nom.meter > ritM) out.push({ id: s.id, soort: 'rit', tekst: `${s.id}: een route van ${nom.meter} m (ongeveer ${fmt(nom.sec)} reizen), meer dan ${ritM} m` });
    if (med && s.cheats.length === 0 && s.speel > 1.6 * med && s.speel > 240) out.push({ id: s.id, soort: 'lang', tekst: `${s.id}: ${fmt(s.speel)} speeltijd, ${(s.speel / med).toFixed(1)} keer de mediaan van de akte (${fmt(med)})` });
    // the time limit of the mission: almost all of it used (too tight for the bot, so surely for a player) or barely a fifth of it
    if (s.limiet > 0 && s.restMin != null && s.fails === 0 && s.restMin < 0.1 * s.limiet) out.push({ id: s.id, soort: 'krap', tekst: `${s.id}: nog ${s.restMin} s van ${s.limiet} s over (minder dan 10%)` });
    if (s.limiet > 0 && s.actief > 0 && s.fails === 0 && s.cheats.length === 0 && s.actief < 0.2 * s.limiet && s.limiet >= 180) out.push({ id: s.id, soort: 'ruim', tekst: `${s.id}: ${Math.round(s.actief)} s gebruikt van ${s.limiet} s (minder dan 20%)` });
    if (s.fails >= 2) out.push({ id: s.id, soort: 'opnieuw', tekst: `${s.id}: ${s.fails} keer opnieuw` });
    if (s.cine != null && s.speel > 0 && s.cine / s.speel > 0.5 && s.cine > 90) out.push({ id: s.id, soort: 'scene', tekst: `${s.id}: ${Math.round(100 * s.cine / s.speel)}% van de tijd in cutscenes (${fmt(s.cine)})` });
  }
  return { med, out };
}

export function rapport(runList) {
  const lines = [];
  const alle = {};
  for (const [name, dir] of runList) {
    const steps = stepsOf(readEvents(dir));
    alle[name] = steps;
    const res = fs.existsSync(path.join(dir, 'result.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'result.json'), 'utf8')) : {};
    const { med, out } = afwijkingen(steps);
    lines.push(`## ${AKTEN[name] || name}`, '', `Run \`${path.basename(path.dirname(dir))}/${path.basename(dir)}\`: uitkomst ${res.result || 'onbekend'}, speeltijd ${fmt(res.gameSeconds)}, echte tijd ${fmt(res.wallSeconds)}.`, '');
    lines.push('| Stap | Titel | Speeltijd | Echt | Route | Reistijd | Afstand bot | Cutscene | Gesprek | Doelwissels | Langste stilte | Tijdlimiet (gebruikt) | Opnieuw | Vast | Cheats |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const s of steps) {
      if (s.speel == null) continue;
      lines.push(`| ${s.id} | ${(s.title || '').slice(0, 34)} | ${fmt(s.speel)} | ${fmt(s.wall)} | ${nominaal(s).meter} m | ${fmt(nominaal(s).sec)} | ${s.dist ?? '-'} m | ${fmt(s.cine)} | ${fmt(s.talk)} | ${s.goals} | ${s.maxQuiet != null ? Math.round(s.maxQuiet) + ' s' : '-'} | ${s.limiet > 0 ? `${fmt(s.actief)} van ${fmt(s.limiet)}` : '-'} | ${s.fails} | ${s.stuck} | ${s.cheats.length ? s.cheats.join(', ') : '-'} |`);
    }
    lines.push('', `Mediaan speeltijd van de stappen zonder cheat: ${fmt(med)}.`, '');
    if (out.length) { lines.push('Afwijkingen:', '', ...out.map((o) => `- ${o.tekst}`), ''); } else lines.push('Geen afwijkingen boven de drempels.', '');
  }
  // akten onderling
  lines.push('## Akten onderling', '', '| Akte | Stappen | Mediaan speeltijd | Langste stap | Mediaan route | Mediaan cutscene | Mediaan doelwissels | Opnieuw | Cheats |', '|---|---|---|---|---|---|---|---|---|');
  for (const [name, steps] of Object.entries(alle)) {
    const m = steps.filter((s) => /^M\d/.test(s.id) && s.speel != null);
    const clean = m.filter((s) => s.cheats.length === 0);
    const longest = m.reduce((b, s) => (!b || s.speel > b.speel ? s : b), null);
    lines.push(`| ${AKTEN[name] || name} | ${m.length} | ${fmt(median(clean.map((s) => s.speel)))} | ${longest ? `${longest.id} ${fmt(longest.speel)}` : '-'} | ${median(clean.map((s) => nominaal(s).meter)) ?? '-'} m | ${fmt(median(clean.filter((s) => s.cine != null).map((s) => s.cine)))} | ${median(clean.map((s) => s.goals)) ?? '-'} | ${m.reduce((n, s) => n + s.fails, 0)} | ${m.reduce((n, s) => n + s.cheats.length, 0)} |`);
  }
  lines.push('');
  return { text: lines.join('\n'), alle };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('balans.mjs')) {
  if (runs.length) {
    const { text: t0 } = rapport(runs);
    const text = process.argv.includes('--cutscenes') ? `${t0}\n${(await cutsceneSpreiding()).text}` : t0;
    const OUT = arg('out');
    if (OUT) { fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true }); fs.writeFileSync(OUT, text); console.log(`geschreven: ${OUT}`); } else console.log(text);
  }
}
