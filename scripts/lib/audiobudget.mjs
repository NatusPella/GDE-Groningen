// Audio-opslag en laadbudget (#1390): meet game/audio, rekent door naar 40 en 80 uur spel en vergelijkt met de
// budgetten in scripts/audio_budget.json. Puur en zonder netwerk; leest alleen bestanden.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const MB = 1048576;
const CLIP = /\.(mp3|ogg|opus|wav|webm)$/i;

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

// meet een audiomap: bytes per hoofdmap, en voor voicelines het aantal clips, het gemiddelde, de grootste en de dubbele
export function meetAudio(audioDir, { hash = true } = {}) {
  const per = {};
  const voice = { clips: 0, bytes: 0, max: { file: '', bytes: 0 }, dubbel: { groepen: 0, bestanden: 0, bytes: 0 } };
  const gezien = new Map();
  for (const f of walk(audioDir)) {
    const rel = path.relative(audioDir, f).split(path.sep).join('/');
    const top = rel.includes('/') ? rel.split('/')[0] : '(los)';
    const size = fs.statSync(f).size;
    const p = (per[top] ||= { bestanden: 0, bytes: 0 });
    p.bestanden++; p.bytes += size;
    if (top === 'voicelines' && CLIP.test(f)) {
      voice.clips++; voice.bytes += size;
      if (size > voice.max.bytes) voice.max = { file: rel, bytes: size };
      if (hash) {
        const h = crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
        if (!gezien.has(h)) gezien.set(h, []);
        gezien.get(h).push(size);
      }
    }
  }
  for (const maten of gezien.values()) if (maten.length > 1) { voice.dubbel.groepen++; voice.dubbel.bestanden += maten.length - 1; voice.dubbel.bytes += maten[0] * (maten.length - 1); }
  const totaal = Object.values(per).reduce((a, p) => a + p.bytes, 0);
  return { per, totaal, voice: { ...voice, gemiddeld: voice.clips ? voice.bytes / voice.clips : 0 } };
}

// de grootste lading stem per scène: gesproken regels (niet textOnly) maal het gemiddelde clipgewicht
export function sceneLast(script, gemiddeldeBytes) {
  let max = { id: '', regels: 0, bytes: 0 }, gesproken = 0;
  for (const s of script.scenes || []) {
    const n = (s.lines || []).filter((l) => !l.textOnly).length;
    gesproken += n;
    if (n > max.regels) max = { id: s.id, regels: n, bytes: n * gemiddeldeBytes };
  }
  return { scenes: (script.scenes || []).length, gesproken, max };
}

// doorrekening: regels totaal bij een doel in uren ('laag' of 'hoog' uit de aannames), de extra bytes en de maten van web en
// installatie. De nieuwe regels zijn het doel minus de gesproken verhaalregels die er al zijn (bijbel 03 §4.2).
export function projecteer(meting, a, uren, scenario = 'hoog') {
  const rpu = a.regelsPerUur[scenario];
  const regelsTotaal = Math.round(uren * rpu);
  const extraClips = Math.max(0, regelsTotaal - a.bestaandeVerhaalregels);
  const extraMp3 = extraClips * meting.voice.gemiddeld;
  const extraOpus = extraMp3 * a.opusRatio;
  return {
    uren, scenario, regelsTotaal, extraClips, extraMp3, extraOpus,
    webBeideMB: a.web.nuBeideMB + (extraMp3 + extraOpus) / MB,
    webOpusMB: a.web.nietAudioMB + a.web.nuOpusMB + extraOpus / MB,
    installatieMB: a.install.nuPortableMB + extraMp3 / MB,
    audioMB: (meting.totaal + extraMp3) / MB,
    voicelinesMB: (meting.voice.bytes + extraMp3) / MB,
    perUurMB: (rpu * meting.voice.gemiddeld) / MB,
  };
}

// tot hoeveel uur past een maat onder zijn budget (de maten groeien lineair vanaf het uur waarop de bestaande regels zijn gedekt)
export function maxUren(meting, a, budgetMB, sleutel, scenario = 'hoog') {
  const u0 = a.bestaandeVerhaalregels / a.regelsPerUur[scenario];
  const basis = projecteer(meting, a, u0, scenario)[sleutel];
  const perUur = projecteer(meting, a, u0 + 1, scenario)[sleutel] - basis;
  if (basis > budgetMB) return 0;
  return perUur > 0 ? u0 + (budgetMB - basis) / perUur : Infinity;
}

// de controle van de huidige stand tegen de budgetten; een lege lijst is groen
export function controleer(meting, budget, scene) {
  const p = [];
  const v = meting.voice;
  if (v.gemiddeld / 1024 > budget.clipGemiddeldKB) p.push(`gemiddelde clip ${(v.gemiddeld / 1024).toFixed(1)} kB is boven het budget van ${budget.clipGemiddeldKB} kB`);
  if (v.max.bytes / 1024 > budget.clipMaxKB) p.push(`grootste clip ${v.max.file} is ${(v.max.bytes / 1024).toFixed(0)} kB, boven het budget van ${budget.clipMaxKB} kB`);
  if (v.bytes / MB > budget.voicelinesMB) p.push(`voicelines ${(v.bytes / MB).toFixed(1)} MB is boven het budget van ${budget.voicelinesMB} MB`);
  if (meting.totaal / MB > budget.audioTotaalMB) p.push(`game/audio ${(meting.totaal / MB).toFixed(1)} MB is boven het budget van ${budget.audioTotaalMB} MB`);
  if (v.dubbel.bestanden > budget.dubbeleClipsMax) p.push(`${v.dubbel.bestanden} dubbele clips (zelfde inhoud), budget ${budget.dubbeleClipsMax}; ruim ze op`);
  if (scene && scene.max.bytes / MB > budget.sceneLadingMB) p.push(`scène ${scene.max.id} laadt ${(scene.max.bytes / MB).toFixed(2)} MB stem (${scene.max.regels} regels), budget ${budget.sceneLadingMB} MB`);
  return p;
}

// de projectie tegen de budgetten: per doel en scenario welke maat te groot wordt
export function projectieProblemen(pr, budget) {
  const p = [];
  if (pr.webBeideMB > budget.webPagesMB) p.push(`web met mp3-terugval ${pr.webBeideMB.toFixed(0)} MB > ${budget.webPagesMB} MB`);
  if (pr.webOpusMB > budget.webPagesMB) p.push(`web alleen Opus ${pr.webOpusMB.toFixed(0)} MB > ${budget.webPagesMB} MB`);
  if (pr.installatieMB > budget.installatiePortableMB) p.push(`installatie ${pr.installatieMB.toFixed(0)} MB > ${budget.installatiePortableMB} MB`);
  if (pr.audioMB > budget.audioTotaalMB) p.push(`game/audio ${pr.audioMB.toFixed(0)} MB > ${budget.audioTotaalMB} MB`);
  if (pr.voicelinesMB > budget.voicelinesMB) p.push(`voicelines ${pr.voicelinesMB.toFixed(0)} MB > ${budget.voicelinesMB} MB`);
  if (pr.perUurMB > budget.perSpeeluurMB) p.push(`stem per speeluur ${pr.perUurMB.toFixed(2)} MB > ${budget.perSpeeluurMB} MB`);
  return p;
}

export function leesBudget(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
