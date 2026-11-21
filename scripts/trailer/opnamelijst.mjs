// Opnamelijst van de verhaaltrailer 'ontdek' (75 s, #1172): de shotlijst als draaiboek voor de opnamerun, zonder iets op te nemen.
// Alles komt uit twee bronnen die elkaar moeten bevestigen: PLAN.ontdek (game/js/trailerplan.js: duur, kaarten, stemmen, geluiden) en de tabel
// "Shotlijst met opnamepositie" in docs/verhaal/TRAILER-FILMSCRIPT-21-11.md (plaats, uur, weer). Per shot: absolute begin- en eindtijd, fase van het
// ritme, de beeldtekst met absolute tijden, de stemopnames (met bestandscontrole), de stilstaande beelden voor de contactsheet (repl_shot) en wat de
// kijker/luisteraar daar moet zien en horen. Onderaan: de commando's voor de coördinator en de eisen aan het resultaat.
//
//   node scripts/trailer/opnamelijst.mjs            draaiboek als markdown
//   node scripts/trailer/opnamelijst.mjs --json     dezelfde gegevens als JSON
//
// Neemt niet op, start geen Electron en schrijft niets. Opnemen doet de coördinator: node scripts/record_trailer.mjs --run --cut=ontdek (zie README).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN, SLOGAN, planDuration } from '../../game/js/trailerplan.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DOC = 'docs/verhaal/TRAILER-FILMSCRIPT-21-11.md';
export const FPS = 60;
const NL = String.fromCharCode(10);

// Het ritme van de cut: een fase begint bij de eerste shot die erbij hoort (de tijden volgen uit PLAN, niet uit een schatting).
export const PHASES = [
  { id: 'koud', name: 'Koude opening', first: 'radio', note: 'zwart, een radio, een zin; geen muziek' },
  { id: 'wereld', name: 'Wereld en paar', first: 'sunrise', note: 'het thema draagt, grote beelden van 3 tot 4 s' },
  { id: 'hindernis', name: 'Hindernis en belofte', first: 'escapade', note: 'riser op de stoot; de Fries in het blauwe colbert' },
  { id: 'tempo', name: 'Tempo-opbouw', first: 'boat', note: 'shots van 2,0 tot 3,0 s, een tik op elke snede' },
  { id: 'grap', name: 'Komische beat', first: 'bijna', note: 'stilte op de uitademing, dan de grap' },
  { id: 'adem', name: 'Adem', first: 'plantsoen', note: 'rustig, gitaar en bas, geen drums' },
  { id: 'slot', name: 'Slotkaart', first: 'logo', note: 'titel, slogan, platforms' },
];

// Wat moet in beeld of te horen zijn per shot (de controle-eis voor wie de opname bekijkt); alleen wat de tabel niet al zegt.
const CHECK = {
  radio: 'zwart beeld, de radio-kaart 06:12, Rikus is het eerste geluid; geen muziek',
  jelle: 'blauw colbert als silhouet en kleur, geen naam in beeld',
  berend: 'de stilte vóór de zin is bedoeld (halve seconde), geen muziek eronder',
  logo: `titelkaart met de slogan "${SLOGAN}" en "Gratis · voor pc en Mac"; geen woord over frietwagen of snacks`,
  trauma: 'stilte in de montage (geen tik): de heli is de adempauze voor de tijdsprong',
};

const num = (s) => parseFloat(String(s).replace(',', '.'));

// De tabel uit het filmscript: { nr, shot, dur, place, when, cue }
export function parseShotTable(md) {
  const rows = [];
  for (const line of md.split(NL)) {
    const cells = line.trim().split('|').map((c) => c.trim());
    // een rij begint en eindigt met een pijp: cells = ['', nr, shot, dur, place, when, cue, '']
    if (cells.length !== 8 || cells[0] !== '' || cells[7] !== '') continue;
    const m = /^`([a-z0-9-]+)`$/.exec(cells[2]);
    if (!m || !/^[0-9]+$/.test(cells[1])) continue;
    rows.push({ nr: +cells[1], shot: m[1], dur: num(cells[3]), place: cells[4], when: cells[5], cue: cells[6] });
  }
  return rows;
}

const round = (x) => Math.round(x * 100) / 100;
const hhmm = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`;

export function buildSheet({ has = (src) => fs.existsSync(path.join(ROOT, 'game', src)), docText } = {}) {
  const beats = PLAN.ontdek.beats;
  const table = parseShotTable(docText ?? fs.readFileSync(path.join(ROOT, DOC), 'utf8'));
  const byShot = new Map(table.map((r) => [r.shot, r]));
  let t = 0;
  let phase = null;
  const shots = beats.map((b, i) => {
    const p = PHASES.find((q) => q.first === b.shot);
    if (p) phase = p;
    const row = byShot.get(b.shot) || null;
    const start = round(t), end = round(t + b.dur);
    t += b.dur;
    const caps = (b.caps || []).map((c) => ({ kind: c.kind, title: c.title, kicker: c.kicker || null, from: round(start + c.at), to: round(start + c.at + c.dur) }));
    const voice = (b.voice || []).map(([at, src, d]) => ({ at: round(start + at), src, dur: d ?? null, exists: has(src) }));
    const lines = (b.lines || []).map(([at, d, who, text]) => ({ at: round(start + at), dur: d, who, text }));
    const sfx = (b.sfx || []).map(([at, kind]) => ({ at: round(start + at), kind }));
    // stills voor de contactsheet: begin, midden en einde van de shot; met kaarten ook het midden van de kaart
    const stills = [round(start + 0.1), round(start + b.dur / 2), round(end - 0.1)];
    if (caps.length) stills.push(round((caps[0].from + caps[0].to) / 2));
    return {
      nr: i + 1, shot: b.shot, phase: phase ? phase.id : null, start, end, dur: b.dur, frames: Math.round(b.dur * FPS), plain: !!b.plain,
      place: row ? row.place : null, when: row ? row.when : null, cue: row ? row.cue : null, caps, voice, lines, sfx,
      stills: [...new Set(stills)].sort((a, c) => a - c), check: CHECK[b.shot] || null,
    };
  });
  const total = round(planDuration('ontdek'));
  const phases = PHASES.map((p, idx) => {
    const first = shots.find((s) => s.shot === p.first);
    const next = PHASES[idx + 1] ? shots.find((s) => s.shot === PHASES[idx + 1].first) : null;
    return { ...p, from: first ? first.start : null, to: next ? next.start : total };
  });
  const voices = shots.flatMap((s) => s.voice.map((v) => ({ shot: s.shot, ...v })));
  return {
    cut: 'ontdek', slogan: SLOGAN, total, frames: Math.round(total * FPS), fps: FPS, shots, phases, table, voices,
    requirements: {
      duration: [round(total - 0.6), round(total + 0.6)], loudnessLufs: -14, truePeakDb: -1, resolution: '1920x1080 (daarna 3840x2160)',
      endsWithSlogan: true, noFlashes: true, noSnackvan: true,
    },
    commands: [
      'node scripts/record_trailer.mjs --run --cut=ontdek --res=1080p --out=<map buiten de repo> --game-dir=<staged game> --slot',
      'node scripts/trailer/check_video.mjs <map>/GDE-Groningen-ontdek-1080p.mp4 --out=<map>/controle',
      'node scripts/trailer/check_audio.mjs <map>/GDE-Groningen-ontdek-1080p.mp4 --out=<map>/controle',
      'node scripts/trailer/contact_video.mjs <map>/GDE-Groningen-ontdek-1080p.mp4 --out=<map>/controle --every=1',
    ],
  };
}

// Wat niet klopt tussen PLAN en de tabel in het filmscript; leeg = de twee bronnen zeggen hetzelfde.
export function checkSheet(sheet) {
  const out = [];
  const beats = PLAN.ontdek.beats;
  if (sheet.table.length !== beats.length) out.push(`de tabel heeft ${sheet.table.length} shots, PLAN ${beats.length}`);
  sheet.shots.forEach((s, i) => {
    const r = sheet.table[i];
    if (!r) return;
    if (r.shot !== s.shot) out.push(`rij ${i + 1}: tabel ${r.shot}, PLAN ${s.shot}`);
    if (Math.abs(r.dur - s.dur) > 0.051) out.push(`${s.shot}: tabel ${r.dur} s, PLAN ${s.dur} s`);
    if (!s.place || !s.when) out.push(`${s.shot}: plaats of uur ontbreekt in de tabel`);
    for (const v of s.voice) if (!v.exists) out.push(`${s.shot}: stemopname ontbreekt (${v.src})`);
    for (const c of s.caps) if (c.to - c.from < 2 - 1e-6 && c.kind !== 'radio') out.push(`${s.shot}: kaart "${c.title}" blijft ${round(c.to - c.from)} s (minimaal 2 s)`);
  });
  for (const p of sheet.phases) if (p.from == null) out.push(`fase ${p.id}: de shot ${p.first} staat niet in de cut`);
  const lastPhase = sheet.phases[sheet.phases.length - 1];
  if (lastPhase && Math.abs(lastPhase.to - sheet.total) > 1e-6) out.push('de laatste fase eindigt niet aan het eind van de cut');
  if (Math.abs(sheet.frames - sheet.total * FPS) > 1) out.push('aantal beelden klopt niet met de duur');
  return out;
}

export function toMarkdown(sheet) {
  const L = [];
  L.push(`# Opnamelijst: verhaaltrailer ${sheet.cut} (${sheet.total} s, ${sheet.frames} beelden bij ${sheet.fps} fps)`, '');
  L.push(`Slogan op de slotkaart: **${sheet.slogan}**. Dit is een draaiboek: er is niets opgenomen.`, '');
  L.push('## Ritme', '', '| Fase | Van | Tot | Wat |', '|---|---|---|---|');
  for (const p of sheet.phases) L.push(`| ${p.name} | ${hhmm(p.from)} | ${hhmm(p.to)} | ${p.note} |`);
  L.push('', '## Shots', '', '| # | Begin | Eind | Shot | Plaats | Uur, weer | Tekst en stem | Controle |', '|---|---|---|---|---|---|---|---|');
  for (const s of sheet.shots) {
    const txt = [...s.caps.map((c) => `kaart "${c.title}" ${hhmm(c.from)}-${hhmm(c.to)}`), ...s.lines.map((l) => `${l.who}: "${l.text}" ${hhmm(l.at)}`)].join('; ') || '-';
    L.push(`| ${s.nr} | ${hhmm(s.start)} | ${hhmm(s.end)} | \`${s.shot}\` | ${s.place} | ${s.when} | ${txt} | ${s.check || ''} |`);
  }
  L.push('', '## Stemmen (bestaande opnames)', '');
  for (const v of sheet.voices) L.push(`- ${hhmm(v.at)} \`${v.shot}\`: ${v.src}${v.exists ? '' : ' (ONTBREEKT)'}`);
  L.push('', '## Eisen aan het resultaat', '', `- Duur ${sheet.requirements.duration.join(' tot ')} s, luidheid ${sheet.requirements.loudnessLufs} LUFS, true peak onder ${sheet.requirements.truePeakDb} dBTP, ${sheet.requirements.resolution}.`, '- Geen witte flitsen, geen snackwagen in beeld of tekst, de slotkaart draagt de slogan.', '', "## Commando's (coördinator, één Electron-instantie)", '');
  for (const c of sheet.commands) L.push('```', c, '```');
  return L.join(NL) + NL;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sheet = buildSheet();
  const bad = checkSheet(sheet);
  if (bad.length) { console.error('opnamelijst klopt niet:' + NL + '- ' + bad.join(NL + '- ')); process.exit(1); }
  process.stdout.write(process.argv.includes('--json') ? JSON.stringify(sheet, null, 2) + NL : toMarkdown(sheet));
}
