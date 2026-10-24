// Spelbot fase 4 en 5 (#186): scripts/bot/analysis.mjs zonder Electron en zonder netwerk:
//   node scripts/botanalysis_test.mjs
import zlib from 'node:zlib';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const A = await import(pathToFileURL(path.join(root, 'scripts', 'bot', 'analysis.mjs')).href);
let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

// --- vingerafdruk ---------------------------------------------------------------------
ok(A.fingerprint('console', '', 'Error at 12.5 0xAB 7') === A.fingerprint('console', '', 'error at 99 0xCD 8'), 'getallen tellen niet mee');
ok(A.fingerprint('console', '', 'boem') !== A.fingerprint('console', '', 'knal'), 'andere tekst, andere afdruk');
ok(A.fingerprint('vast', 'M01', 'x') !== A.fingerprint('vast', 'M02', 'x'), 'andere stap, andere afdruk');
ok(/^[0-9a-f]{10}$/.test(A.fingerprint('a', 'b', 'c')), 'afdruk is 10 hex');

// --- bevindingen en cijfers -----------------------------------------------------------------
const run = (extra = []) => [
  { t: 0, type: 'step', event: 'begin', id: 'M01', label: 'Een' }, { t: 60, type: 'step', event: 'end', id: 'M01' },
  { t: 60, type: 'step', event: 'begin', id: 'M02', label: 'Twee' },
  { t: 70, type: 'stuck', step: 'M02', x: 1, y: 2, idleFor: 25, goalDist: 40 }, { t: 71, type: 'shot', name: 'M02-vast' },
  { t: 72, type: 'cheat', rung: 'teleport', step: 'M02' }, { t: 73, type: 'cheat', rung: 'objective', step: 'M02:m' },
  { t: 80, type: 'console', level: 'error', msg: 'cutscene shot 6: 11.8 s zonder camerabeweging' },
  { t: 81, type: 'console', level: 'error', msg: 'cutscene shot 6: 12.4 s zonder camerabeweging' },
  { t: 90, type: 'minigame', id: 'kartbaan', started: false, how: 'ef' }, { t: 95, type: 'minigame', id: 'duif', started: true, playedS: 30 },
  ...extra,
];
const F = A.findings(run());
ok(F.some((f) => f.kind === 'vast' && f.step === 'M02' && f.shot === 'M02-vast'), 'vast bij M02 met screenshot');
ok(F.filter((f) => f.kind === 'cheat').length === 1 && F.find((f) => f.kind === 'cheat').detail.includes('teleport, objective'), 'één cheat-bevinding per stap');
ok(F.filter((f) => f.kind === 'console').length === 1, 'twee fouten met andere getallen zijn één bevinding');
ok(F.some((f) => f.kind === 'minigame-start' && f.step === 'mg-kartbaan'), 'minigame die niet start');
const W = A.findings([{ t: 5, type: 'wacht-te-lang', step: 'M18', act: 'wait', why: 'gesprek', blocking: ['talk'] }]);
ok(W.length === 1 && W[0].kind === 'wacht' && /talk/.test(W[0].title) && W[0].severity === 'bug', 'wacht-te-lang is een bevinding');
ok(!F.some((f) => /duif/.test(f.title)), 'gestarte minigame is geen bevinding');
ok(new Set(F.map((f) => f.fp)).size === F.length, 'afdrukken zijn uniek');
const M = A.metrics(run(), { result: 'TIMEOUT', gameSeconds: 120 });
ok(M.stuck === 1 && M.cheats === 2 && M.consoleErrors === 2 && M.stepsDone === 1 && M.stepsStarted === 2 && M.perMission.M01 === 60 && M.perMission.M02 === null, 'cijfers');
ok(M.minigames === 2 && M.minigamesStarted === 1, 'minigamecijfers');

// --- time-outs in een tak met een eigen klok (duif M04, #387) ---------------------------------------------
{
  const tl = [
    { t: 0, type: 'step', event: 'begin', id: 'M04', label: 'Kieken van boven' },
    { t: 60, type: 'timeout', step: 'M04:duif', what: 'duif: hetzelfde fotodoel niet gehaald', forS: 60, x: -110, y: 1060, goalDist: 205, doel: { x: -47, y: 865 } },
  ];
  const FT = A.findings(tl);
  ok(FT.length === 1 && FT[0].kind === 'timeout' && FT[0].severity === 'bug' && /M04/.test(FT[0].title) && /60 s/.test(FT[0].detail) && /\(-110, 1060\)/.test(FT[0].detail), 'time-out is een bevinding met duur en plek');
  const MT = A.metrics(tl, { result: 'TIMEOUT' });
  ok(MT.timeouts === 1 && MT.lastStep === 'M04', 'time-out en laatste stap in de cijfers');
  const T = A.nlSummary({ title: 'x', metrics: MT, cmp: A.compareRuns(null, { metrics: MT, findings: FT }), findings: FT });
  ok(/Time-outs: 1/.test(T) && /stopte in stap M04/.test(T), 'samenvatting noemt de time-out en waar de run stopte');
  ok(A.compareRuns({ metrics: { ...MT, timeouts: 0 }, findings: [] }, { metrics: MT, findings: [] }).regressies.some((r) => r.metric === 'timeouts'), 'meer time-outs is een regressie');
}

// --- vergelijken ------------------------------------------------------------------------------------
{
  const prev = { metrics: M, findings: F };
  const cur2 = A.findings(run([{ t: 99, type: 'console', level: 'error', msg: 'iets nieuws' }]).filter((e) => !(e.type === 'minigame' && e.id === 'kartbaan')));
  const cur = { metrics: { ...M, consoleErrors: 5, stepsDone: 0 }, findings: cur2 };
  const c = A.compareRuns(prev, cur);
  ok(c.nieuw.length === 1 && /nieuws/.test(c.nieuw[0].title), 'nieuwe bevinding');
  ok(c.opgelost.length === 1 && c.opgelost[0].kind === 'minigame-start', 'opgeloste bevinding');
  ok(c.regressies.some((r) => r.metric === 'consoleErrors') && c.regressies.some((r) => r.metric === 'stepsDone'), 'regressies in cijfers');
  ok(A.compareRuns(null, cur).first === true, 'eerste run');
  const slow = A.compareRuns({ metrics: { ...M, perMission: { M01: 60 } }, findings: [] }, { metrics: { ...M, perMission: { M01: 200 } }, findings: [] });
  ok(slow.regressies.some((r) => r.metric === 'tijd M01'), 'veel langzamer is een regressie');
}

// --- issues zonder dubbelen ---------------------------------------------------------------------------
{
  const bug = F.find((f) => f.kind === 'vast');
  const draft = A.issueDraft(bug, { run: 'r1', replay: 'replay.jsonl' });
  ok(draft.labels.includes('bug') && draft.labels.some((l) => /^impact-/.test(l)) && draft.labels.some((l) => /^kosten-/.test(l)), 'labels bug, impact en kosten');
  ok(draft.body.includes(A.FP_MARK(bug.fp)) && draft.title.startsWith('Spelbot:'), 'afdruk staat in de tekst');
  ok(draft.body.includes('Nog niet in beeld bekeken'), 'eerlijk over wat niet bekeken is');
  const plan = A.planIssues(F, [{ number: 12, state: 'OPEN', body: draft.body }, { number: 13, state: 'CLOSED', body: A.issueDraft(F.find((f) => f.kind === 'cheat')).body }]);
  ok(plan.find((p) => p.f.fp === bug.fp).action === 'comment' && plan.find((p) => p.f.fp === bug.fp).number === 12, 'bestaand open issue: comment, geen dubbel');
  ok(plan.find((p) => p.f.kind === 'cheat').action === 'heropen-comment', 'gesloten issue: terug melden');
  ok(plan.some((p) => p.action === 'nieuw') && plan.every((p) => p.f.severity === 'bug'), 'rest is nieuw, opmerkingen worden geen issue');
}

// --- PNG ------------------------------------------------------------------------------------------------------
{
  const crc = (buf) => { let c, t = [], r = 0xffffffff; for (let i = 0; i < 256; i++) { c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } for (const b of buf) r = t[(r ^ b) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, 'latin1'); data.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
  const png = (w, h, px) => {
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc(h * (w * 3 + 1));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = px(x, y); const i = y * (w * 3 + 1) + 1 + x * 3; raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; }
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  };
  const stat = (px) => A.imageStats(A.decodePng(png(40, 40, px)));
  ok(A.imageFlags(stat(() => [0, 0, 0])).includes('zwart beeld'), 'zwart beeld wordt herkend');
  ok(A.imageFlags(stat(() => [255, 255, 255])).includes('wit beeld'), 'wit beeld wordt herkend');
  ok(A.imageFlags(stat(() => [90, 120, 60])).includes('leeg of vlak beeld'), 'vlak beeld wordt herkend');
  ok(A.imageFlags(stat((x, y) => (x < 8 ? [255, 0, 255] : [(x * 37 + y * 11) & 255, (x * 5) & 255, (y * 9) & 255]))).includes('magenta pixels (NaN)'), 'magenta pixels worden herkend');
  ok(A.imageFlags(stat((x, y) => [(x * 37 + y * 11) & 255, (x * 5 + 40) & 255, (y * 9 + 30) & 255])).length === 0, 'een normaal beeld krijgt geen vlag');
  // het filter Sub, Up, Average en Paeth: een PNG met verlopen decodeert gelijk aan wat erin ging
  const grad = A.decodePng(png(16, 16, (x, y) => [x * 16, y * 16, (x + y) * 8]));
  ok(grad.data[(5 * 16 + 7) * 3] === 7 * 16 && grad.data[(5 * 16 + 7) * 3 + 1] === 5 * 16, 'decoderen geeft de pixels terug');
  let threw = false; try { A.decodePng(Buffer.from('geen png geen png geen png')); } catch (e) { threw = true; }
  ok(threw, 'geen PNG geeft een fout');
  const md = A.checklistMarkdown([{ file: 'shots-M01-begin.png', moment: 'begin M01', flags: ['zwart beeld'] }, { file: 'x.png', flags: [] }]);
  ok(md.includes('## shots-M01-begin.png') && md.includes('**zwart beeld**') && md.includes('- [ ] HUD en tekst') && md.includes('geen bijzonderheden'), 'checklist per screenshot');
}

// --- audio ------------------------------------------------------------------------------------------------------
{
  const ev = [];
  for (let i = 0; i < 100; i++) ev.push({ t: i * 0.5, type: 'audio', rms: i > 10 && i < 70 ? 0 : 0.1, peak: i === 5 || i === 6 ? 1 : 0.4 });
  ev.push({ t: 3, type: 'sfx', name: 'claxon' }, { t: 3.2, type: 'sfx', name: 'claxon' }, { t: 4, type: 'sfx', name: 'deur' });
  ev.push({ t: 3, type: 'mission', event: 'start', id: 'M01' }, { t: 40, type: 'mission', event: 'fail', id: 'M01' });
  const a = A.audioSummary(ev, { silentS: 20 });
  ok(a.clips === 2, 'clipping geteld');
  ok(a.silentTooLong && a.longestSilent >= 29, 'lange stilte gevonden');
  ok(a.sfx.claxon === 2 && a.sfx.deur === 1, 'sfx per naam geteld');
  ok(a.quiet.length === 1 && /fail/.test(a.quiet[0].what), 'gebeurtenis zonder geluid gevonden');
}

// --- samenvatting ----------------------------------------------------------------------------------------------------
{
  const txt = A.nlSummary({ title: 'akte 1', date: '2026-10-18', metrics: M, cmp: A.compareRuns(null, { metrics: M, findings: F }), findings: F, issues: A.planIssues(F, []) });
  for (const part of ['# Spelbot, akte 1 (2026-10-18)', 'speltijd', 'eerste run', '## Bevindingen', 'nieuw issue', 'De bot beoordeelt niet']) ok(txt.includes(part), `samenvatting bevat ${part}`);
  ok(!/\bthe\b|\band\b/.test(txt.replace(/spelbot:[0-9a-f]+/g, '')), 'samenvatting is Nederlands');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
