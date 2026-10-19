#!/usr/bin/env node
// Parses the five machine-readable scripts of the new story
// (docs/verhaal/nieuw/09-script-akte1..5.md) into game/storydata/script.json,
// the data the story (storyarc_nieuw.js) plays from.
//   node scripts/build_story_data.mjs          writes game/storydata/script.json
//   node scripts/build_story_data.mjs --check  fails when the committed file is stale
// A line is `textOnly` when no recording exists for the exact text (speaker
// name as the voice manifests key it, in the story, lines or banter manifest): it is
// shown as text only. A [BEHOUDEN] line without a recording is listed.
// No network, no TTS. The scripts' format is described in the header of 09-script-akte1.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(REPO, 'docs', 'verhaal', 'nieuw');
const OUT = path.join(REPO, 'game', 'storydata', 'script.json');
const VL = path.join(REPO, 'game', 'audio', 'voicelines');

// script speaker -> { key: speaker key of the game (storyarc SPEAKERS / missionstory NPC), name: shown, voice: name in the voice manifests }
const sp = (key, name, voice = name) => ({ key, name, voice });
export const SPEAKER_TABLE = {
  TAMMO: sp('T', 'Tammo'),
  TESSA: sp('A', 'Tessa', 'Anita'),
  RIKUS: sp('rikus', 'Rikus'),
  JELLE: sp('jelle', 'Jelle Terpstra'),
  MEM: sp('mem', 'Mem Terpstra'),
  'OMA TRIJNTJE': sp('trijntje', 'Oma Trijntje'),
  DURK: sp('durk', 'Durk'),
  DOUWE: sp('douwe', 'Douwe'),
  BEREND: sp('berend', 'Berend Bos'),
  BERT: sp('bert', 'Duivenmelker Bert'),
  SJABBE: sp('sjabbe', 'Sjabbe'),
  SJOERD: sp('sjoerd', 'Sjoerd'),
  HENK: sp('henk', 'Henk'),
  JELMER: sp('jelmer', 'Jelmer'),
  // the streamer of M01 has no name in the opening (#93, too close to Jelle); the recordings keep the voice name Jelmer
  STREAMER: sp('jelmer', 'Streamer', 'Jelmer'),
  GEERT: sp('geert', 'Geert'),
  'KAPITEIN KLAAS': sp('klaas', 'Kapitein Klaas'),
  'DOKTER DIJKSTRA': sp('dijkstra', 'Dokter Dijkstra'),
  'ROTOR ROELF': sp('rotor', 'Rotor Roelf'),
  TORENWACHTER: sp('torenwachter', 'Torenwachter'),
  TERRASGAST: sp('terras', 'Terrasgast'),
  SNACKBARHOUDER: sp('snackbar', 'Snackbarhouder'),
  // new cast: no recordings
  GEESJE: sp('geesje', 'Geesje'),
  LAMMERT: sp('lammert', 'Lammert'),
  ROELFIEN: sp('roelfien', 'Roelfien'),
  WUBBO: sp('wubbo', 'Wubbo'),
  TINUS: sp('tinus', 'Tinus'),
  BEWAARDER: sp('bewaarder', 'Mevrouw Hoving'),
  LOKETBEDIENDE: sp('loketbediende', 'Loketbediende'),
  ACCOUNTMANAGER: sp('accountmanager', 'Accountmanager'),
  JURYLID: sp('jurylid', 'Jurylid'),
  BUSCHAUFFEUR: sp('buschauffeur', 'Buschauffeur'),
  KUSTWACHTER: sp('kustwachter', 'Kustwachter'),
  KERMISEXPLOITANT: sp('kermisexploitant', 'Kermisexploitant'),
  DEURWAARDER: sp('deurwaarder', 'Deurwaarder'),
  STUDENT: sp('student', 'Student'),
  BOER: sp('boer', 'Boer'),
  'KIND IN HET PUBLIEK': sp('kind', 'Kind in het publiek'),
};

const LINE = /^([A-ZÄËÏÖÜ][A-ZÄËÏÖÜ0-9 .'’\/&→-]*?(?: \([^)]*\))?): (.+?)(?: \[(BEHOUDEN|NIEUW)\])?\s*$/;
const CHANNEL = { radio: 'radio', telefoon: 'telefoon', stil: 'app-stil' };

const manifests = {};
function manifest(name) {
  if (!manifests[name]) {
    const p = path.join(VL, name, 'manifest.json');
    manifests[name] = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  }
  return manifests[name];
}
// where the exact line is recorded: the story, lines or banter manifest (storytext.js plays from the same three)
const REC_MANIFESTS = ['story', 'lines', 'banter'];
const recordingOf = (voice, text) => REC_MANIFESTS.find((m) => manifest(m)[voice + '|' + text]) || null;

// the story step a scene belongs to: Mnn.k -> Mnn, Tn[.k] -> Tn, C00.k -> M00, E1/E2 -> E
function stepOf(id) {
  let m;
  if ((m = /^M(\d\d)\./.exec(id))) return 'M' + m[1];
  if ((m = /^T(\d)/.exec(id))) return 'T' + m[1];
  if (/^C00\./.test(id)) return 'M00';
  if (/^E\d$/.test(id)) return 'E';
  return null;
}

function kindOf(id, title) {
  if (/^C00\./.test(id)) return 'opening';
  if (/^R\d/.test(id)) return 'radio';
  if (/^A\d/.test(id)) return 'app';
  if (/^B\d/.test(id)) return 'banter';
  if (/^S\d/.test(id)) return 'side';
  if (/^T\d/.test(id)) return /herhaling/.test(title) ? 'replay' : /instappen|intro/.test(title) ? 'intro' : /aankomst/.test(title) ? 'outro' : 'travel';
  if (/^E\d/.test(id)) return 'epilogue';
  if (/Autogesprek/.test(title)) return 'banter';
  if (/: intro\b/.test(title)) return 'intro';
  if (/: outro\b/.test(title)) return 'outro';
  if (/: herhaling\b/.test(title)) return 'replay';
  return 'key';
}

export function parseScripts() {
  const files = fs.readdirSync(SRC).filter((f) => /^09-script-akte\d\.md$/.test(f)).sort();
  const scenes = [];
  for (const f of files) {
    const act = Number(/akte(\d)/.exec(f)[1]);
    let scene = null;
    for (const raw of fs.readFileSync(path.join(SRC, f), 'utf8').split(/\r?\n/)) {
      const h = raw.match(/^## \[([^\]]+)\] (.*)$/);
      if (h) {
        const parts = h[2].split(' – ');
        const vehicle = parts.length >= 3 ? parts.pop() : '';
        const region = parts.length >= 2 ? parts.pop() : '';
        const title = parts.join(' – ');
        scene = { id: h[1], act, file: f, title, region, vehicle, step: stepOf(h[1]), kind: kindOf(h[1], title), regie: [], lines: [] };
        scenes.push(scene);
        continue;
      }
      if (!scene) continue;
      const r = raw.match(/^\(regie: (.*)\)\s*$/);
      if (r) { scene.regie.push(r[1]); if (/Gameplay:/.test(r[1])) scene.gameplay = r[1].replace(/^.*Gameplay:\s*/, ''); continue; }
      if (raw.startsWith('>') || raw.startsWith('#') || !raw.trim()) continue;
      const m = raw.match(LINE);
      if (!m) continue;
      const head = m[1].trim();
      const tag = m[3] || '';
      if (head.startsWith('APP ')) {
        const a = /^APP ([A-ZÄËÏÖÜ]+)→([A-ZÄËÏÖÜ]+) \(stil\)$/.exec(head);
        scene.lines.push({ speaker: a ? a[1].charAt(0) + a[1].slice(1).toLowerCase() : head, from: a ? a[1] : '', to: a ? a[2] : '', text: m[2], tag, channel: 'app-stil', textOnly: true, silent: true });
        continue;
      }
      const c = /^(.*?)(?: \(([^)]*)\))?$/.exec(head);
      const line = { who: c[1], text: m[2], tag, channel: CHANNEL[c[2]] && c[2] !== 'stil' ? CHANNEL[c[2]] : 'stem' };
      if (c[2] && !CHANNEL[c[2]]) line.manner = c[2];
      scene.lines.push(line);
    }
  }
  return scenes;
}

// radio and app scenes hang on a step: after the step before them in the file,
// or at the start of the step when they sit between two scenes of one step
function anchor(scenes) {
  scenes.forEach((s, i) => {
    if (s.step || (s.kind !== 'radio' && s.kind !== 'app' && s.kind !== 'banter' && s.kind !== 'side')) return;
    let prev = null, next = null;
    for (let j = i - 1; j >= 0; j--) if (scenes[j].step) { prev = scenes[j].step; break; }
    // what comes after the scene: a banter or replay line of the step before it does not count
    for (let j = i + 1; j < scenes.length; j++) if (scenes[j].step && scenes[j].kind !== 'banter' && scenes[j].kind !== 'replay') { next = scenes[j].step; break; }
    if (s.kind === 'banter') { s.pool = s.id; s.step = prev || next; return; }
    if (s.kind === 'side') { s.step = prev || next; return; }
    if (prev && prev === next) s.anchor = { at: 'start', step: prev };
    else if (prev) s.anchor = { at: 'after', step: prev };
    else s.anchor = { at: 'start', step: next };
    s.step = s.anchor.step;
  });
}

// A mission's first scene is its intro and its last story scene its outro, also when the script
// does not say so in the title (the intro is where the mission starts, the outro plays at the end).
function roles(scenes) {
  for (const step of new Set(scenes.map((s) => s.step))) {
    const own = scenes.filter((s) => s.step === step && /^M\d\d\.\d$/.test(s.id) && !s.anchor && (s.kind === 'key' || s.kind === 'intro' || s.kind === 'outro'));
    if (!own.length) continue;
    if (!own.some((s) => s.kind === 'intro')) {
      const first = own.find((s) => /\.1$/.test(s.id)) || own[0];
      if (first.kind === 'key') first.kind = 'intro';
    }
    if (!own.some((s) => s.kind === 'outro')) {
      const last = [...own].reverse().find((s) => s.kind === 'key');
      if (last) last.kind = 'outro';
    }
  }
}

export function build() {
  const scenes = parseScripts();
  anchor(scenes);
  roles(scenes);
  const unknown = new Set();
  const behoudenMissing = [];
  for (const s of scenes) {
    s.lines = s.lines.map((l) => {
      if (l.channel === 'app-stil') return l;
      const spk = SPEAKER_TABLE[l.who];
      if (!spk) { unknown.add(l.who); return { speaker: l.who, text: l.text, tag: l.tag, channel: l.channel, textOnly: true }; }
      const rec = recordingOf(spk.voice, l.text);
      const recorded = !!rec;
      if (l.tag === 'BEHOUDEN' && !recorded) behoudenMissing.push(`[${s.id}] ${spk.voice}: ${l.text}`);
      const out = { speaker: spk.name, key: spk.key, text: l.text, tag: l.tag, channel: l.channel, textOnly: !recorded };
      if (l.manner) out.manner = l.manner;
      if (rec) out.rec = rec;
      if (spk.voice !== spk.name) out.voice = spk.voice;
      return out;
    });
  }
  if (unknown.size) throw new Error('unknown speakers in the scripts: ' + [...unknown].join(', '));
  const data = {
    note: 'Generated by scripts/build_story_data.mjs from docs/verhaal/nieuw/09-script-akte*.md. Do not edit by hand.',
    speakers: Object.fromEntries(Object.values(SPEAKER_TABLE).map((s) => [s.key, { name: s.name, voice: s.voice }])),
    scenes: scenes.map((s) => {
      const o = { id: s.id, title: s.title, act: s.act, region: s.region, vehicle: s.vehicle, step: s.step, kind: s.kind };
      if (s.anchor) o.anchor = s.anchor;
      if (s.pool) o.pool = s.pool;
      if (s.gameplay) o.gameplay = s.gameplay;
      o.regie = s.regie;
      o.lines = s.lines;
      return o;
    }),
  };
  return { data, behoudenMissing };
}

function summary(data) {
  const lines = data.scenes.flatMap((s) => s.lines);
  const textOnly = lines.filter((l) => l.textOnly).length;
  return { scenes: data.scenes.length, lines: lines.length, textOnly, recorded: lines.length - textOnly, silentApps: lines.filter((l) => l.channel === 'app-stil').length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { data, behoudenMissing } = build();
  const json = JSON.stringify(data, null, 1) + '\n';
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== json) { console.log('game/storydata/script.json is stale: run node scripts/build_story_data.mjs'); process.exit(1); }
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, json);
  }
  const s = summary(data);
  console.log(`script.json: ${s.scenes} scenes, ${s.lines} lines (${s.recorded} met opname, ${s.textOnly} alleen tekst, waarvan ${s.silentApps} stille appjes)`);
  if (behoudenMissing.length) {
    console.log(`[BEHOUDEN] zonder opname (nu alleen tekst): ${behoudenMissing.length}`);
    for (const l of behoudenMissing) console.log('  ' + l);
  }
}
