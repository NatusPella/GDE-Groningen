// Cutscene-kwaliteitssysteem: de echte data als eenheden voor de linter, de renderlaag en het reviewpakket.
// Alles uit de bestaande pure catalogus (game/js/cutpreview.js buildCatalog) plus script.json en de stemmanifesten;
// geen game, geen wereld, geen THREE. De eenheden hebben de vorm die scripts/lib/cutscene_lint.mjs verwacht.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SPEAKER_NAAM = { T: 'Tammo', A: 'Anita' };

export const leesTijd = (text) => Math.max(2.2, Math.min(8, 1.3 + String(text || '').length * 0.058));

function laadManifesten() {
  const m = {};
  for (const k of ['story', 'lines', 'banter']) {
    const p = `game/audio/voicelines/${k}/manifest.json`;
    m[k] = fs.existsSync(path.join(ROOT, p)) ? JSON.parse(lees(p)) : {};
  }
  return m;
}

// Een scriptregel verrijkt: de stemduur uit het manifest (of hasVoice false als de clip ontbreekt).
function verrijk(l, speakers, manifesten, looks) {
  const voor = (l.voice || (speakers[l.key] && speakers[l.key].voice) || l.speaker);
  const man = manifesten[l.rec] || {};
  const v = !l.textOnly && l.rec ? (man[`${voor}|${l.text}`] || man[`${l.speaker}|${l.text}`]) : null;
  return {
    key: l.key, speaker: SPEAKER_NAAM[l.key] || (looks[l.key] && looks[l.key].name) || l.speaker, text: l.text, channel: l.channel, textOnly: !!l.textOnly, tag: l.tag,
    voiceDur: v ? v.dur : 0,
    hasVoice: l.textOnly || l.channel === 'app-stil' ? null : !!v,
    ...(v && v.src ? { src: v.src } : {}),
  };
}

// Eenheden in verhaalvolgorde van hun eerste scriptscène. Geeft { units, scriptUnits, names, speakers, scenes }.
export async function loadUnits({ root = ROOT } = {}) {
  const imp = (f) => import(pathToFileURL(path.join(root, 'game', 'js', f)).href);
  const script = JSON.parse(lees('game/storydata/script.json'));
  const manifesten = laadManifesten();
  const npcSource = lees('game/js/missionstory.js');
  const { buildCatalog, npcNamesFromSource, sceneIdsFor, sliceOf } = await imp('cutpreview.js');
  const { propFoot } = await imp('cutscenemodels.js');
  const looks = npcNamesFromSource(npcSource);
  const catalog = buildCatalog({ script, npcSource });
  const sceneById = new Map(script.scenes.map((s) => [s.id, s]));
  const names = {};
  for (const [k, v] of Object.entries(script.speakers || {})) names[k] = v.name;
  for (const [k, v] of Object.entries(looks)) if (!names[k]) names[k] = v.name;

  const dekking = new Map(); // scriptscène-id -> eenheid-id
  const units = [];
  const scriptLines = (ids, slice) => {
    const out = [];
    for (const id of ids) {
      const sc = sceneById.get(id);
      if (!sc) continue;
      for (const l of slice ? sc.lines.slice(slice[0], slice[1]) : sc.lines) if (l.channel !== 'app-stil') out.push(verrijk(l, script.speakers, manifesten, looks));
    }
    return out;
  };

  for (const e of catalog) {
    if (!['Opening', 'Missies', 'Thuisavonden'].includes(e.group)) continue;
    let ids = [], slice = null;
    if (e.group === 'Opening') { const n = ['story-opening-trailer', 'story-opening-keuken', 'story-opening-verhuisdag'].indexOf(e.id); ids = n >= 0 ? [`C00.${n + 1}`] : []; }
    else if (e.group === 'Missies') { const sl = sliceOf(e.id); slice = sl ? [sl.from, sl.to] : null; ids = sceneIdsFor(e.id); }
    else ids = ['M06.0'];
    const sl = scriptLines(ids, slice);
    // koppel de getimede regels aan de scriptregels op tekst (volgorde blijft)
    let p = 0;
    const lines = (e.lines || []).map((t) => {
      let j = sl.findIndex((q, k) => k >= p && q.text === t.text);
      if (j < 0) j = sl.findIndex((q) => q.text === t.text);
      const ver = j >= 0 ? sl[j] : {};
      if (j >= 0) p = j + 1;
      return { ...ver, speaker: t.speaker, text: t.text, at: t.at, dur: t.dur };
    });
    const regie = ids.flatMap((id) => (sceneById.get(id) || {}).regie || []);
    const act = ids.length && sceneById.get(ids[0]) ? sceneById.get(ids[0]).act : 0;
    for (const id of ids) if (e.group !== 'Thuisavonden' && !dekking.has(id)) dekking.set(id, e.id);
    units.push({
      id: e.id, group: e.group, kind: 'staged', act, sceneIds: ids, regie, lines, def: e.def, scene: e.scene, duration: e.duration,
      rhythm: e.rhythm, status: e.status, issues: e.status === 'fout' ? e.issues : [], missing: null, footOf: propFoot,
    });
  }

  // scriptscènes zonder eigen regie: alleen de tekstregels (kale scènes, appjes, telefoongesprekken)
  const scriptUnits = [];
  for (const sc of script.scenes) {
    const regels = sc.lines.map((l) => verrijk(l, script.speakers, manifesten, looks));
    let t = 0.6;
    const timed = regels.map((l) => { const dur = l.voiceDur ? l.voiceDur + 0.25 : leesTijd(l.text); const r = { ...l, at: t, dur }; t += dur + 0.1; return r; });
    const appOnly = timed.length && timed.every((l) => l.channel === 'app-stil');
    scriptUnits.push({ id: sc.id, group: 'Script', kind: appOnly ? 'app' : 'script', act: sc.act, sceneIds: [sc.id], regie: sc.regie || [], lines: appOnly ? timed : timed.filter((l) => l.channel !== 'app-stil'), def: null, scene: null, duration: t, status: 'ok', issues: [], footOf: propFoot, titel: sc.title, scriptKind: sc.kind });
  }
  const eigen = scriptUnits.filter((u) => !dekking.has(u.id) && !units.some((x) => x.sceneIds.includes(u.id)));
  return { units, scriptUnits, kaleUnits: eigen, dekking, names, speakers: script.speakers, scenes: script.scenes, looks };
}
