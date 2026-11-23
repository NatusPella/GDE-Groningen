// Blikrichting in de regietaal (23-11): een spreker kijkt naar wie hij aanspreekt, een draai tijdens het lopen houdt stand na
// aankomst, en de regie-audit van alle scènes is schoon (scripts/cutscene_regie_audit.mjs --strict).
//   node scripts/cutscript_blik_test.mjs
import { spawnSync } from 'node:child_process';
import { compileScene } from '../game/js/cutscript.js';

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };
const A = { x: 0, y: 0, facing: 0, z: 0 };
const deg = (r) => Math.round((r * 180) / Math.PI);
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

// 1. de spreker kijkt naar de vorige andere spreker (hoofd, gaze 'speaker'), ook als zijn lijf recht vooruit staat
const lines = [{ speaker: 'Mem', text: 'Kom je?', at: 0.5, dur: 2 }, { speaker: 'Jelle', text: 'Ik kom, mem.', at: 3, dur: 2 }];
const def = {
  id: 'blik', actors: {
    jelle: { look: 'tammo', at: [0, 0], face: 0, speaker: 'Jelle', gaze: 'speaker' },
    mem: { look: 'anita', at: [0, 2], face: -90, speaker: 'Mem', gaze: 'speaker' },
  }, props: {}, cues: [], shots: [{ t: 0, shot: 'cut', at: [4, 0, 1.6], look: 'mid:jelle,mem@1.3' }],
};
const sc = compileScene(def, { lines, duration: 6 });
const j = sc.sample(3.5, A).actors.jelle;
ok(j.speaking && j.gaze > 0.8, 'Jelle kijkt bij zijn regel met zijn hoofd naar Mem (links van hem)', `gaze ${j.gaze.toFixed(2)}`);

// 2. een draai die tijdens het lopen komt, houdt stand als hij aankomt
const def2 = {
  id: 'draai', actors: {
    jelle: { look: 'tammo', at: [0, 0], face: 0, speaker: 'Jelle' },
    mem: { look: 'anita', at: [-2, 3], face: 0, speaker: 'Mem' },
  }, props: {}, cues: [{ t: 0.5, actor: 'jelle', walk: [[3, 0]], speed: 1 }, { t: 0.8, actor: 'jelle', face: 'actor:mem' }],
  shots: [{ t: 0, shot: 'cut', at: [6, 0, 1.6], look: 'mid:jelle,mem@1.3' }],
};
const sc2 = compileScene(def2, { lines, duration: 6 });
const s2 = sc2.sample(5.5, A).actors;
const want = Math.atan2(s2.mem.y - s2.jelle.y, s2.mem.x - s2.jelle.x);
ok(Math.abs(angDiff(s2.jelle.a, want)) < 0.2, 'na aankomst staat Jelle naar Mem (de draai tijdens het lopen)', `${deg(s2.jelle.a)} tegen ${deg(want)} graden`);

// 3. de audit van alle scènes
const r = spawnSync(process.execPath, ['scripts/cutscene_regie_audit.mjs', '--strict', '--top=10'], { encoding: 'utf8', cwd: new URL('..', import.meta.url) });
ok(r.status === 0, 'cutscene_regie_audit --strict is schoon', (r.stdout || '').split('\n').filter((l) => /\[\d\]/.test(l)).slice(0, 4).join(' | '));
console.log(`cutscript_blik_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
