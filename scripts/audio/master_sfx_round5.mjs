// SFX round 5 (21-11): picks and masters the new clips from a Freesound inbox (see freesound_fetch.mjs; CC0 and CC BY only, ADR 0039).
// Per group of scripts/audio/sfx_round5_list.mjs the best `n` candidates become <base>_0 .. <base>_<n-1>.ogg in game/audio/sfx and
// get a manifest entry (the source of docs/AUDIO-LICENTIES.md and the in-game credits: run licenties_bouw.mjs --write afterwards).
// Mastering as in rounds 3 and 4: DC removed, high and low pass, silence cut from both ends, capped length with a cosine fade-out,
// 3-5 ms fade-in, level on RMS with a -1.5 dB peak limit, mono 44.1 kHz ogg (Vorbis q2). Detectors of the white-noise round
// (docs/WITTE-RUIS-21-11.md) run on every candidate: a pop at the start (pop_begin.mjs) or a noise burst at the end
// (ruisachtig_scan.mjs eindBurst) rejects it; a noise tail is a penalty unless the group is noisy by nature.
// Choice is on title and measurement, not on hearing (docs/SFX-LUISTER.html lists them for a veto).
//   node scripts/audio/master_sfx_round5.mjs --bron=<inbox> [--alleen=<base>,<base>] [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { GROUPS } from './sfx_round5_list.mjs';
import { SFX_MAP } from '../../game/js/sfx/sfxmap.js';
import { popBegin } from './pop_begin.mjs';
import { eindBurst, scoreClip, GRENS } from './ruisachtig_scan.mjs';
import { trimStilte, normaliseer } from './master_sfx_ronde3.mjs';
import { schrijfOgg, SR } from './stap_knip.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || d;
const UIT = path.join(ROOT, 'game', 'audio', 'sfx');

// groups that are noise by nature: a flat noise tail is no defect there
export const NOISY = new Set(['ui_endcard_whoosh', 'ui_map_zoom', 'ui_travel_whoosh', 'fryer_sizzle', 'coffee_brew', 'bar_pour', 'hairdryer_blast', 'hair_clipper',
  'spray_can', 'impact_wrench', 'grain_pour', 'milking_machine', 'rain_drips', 'wind_gust', 'train_air_brake', 'crowd_goal_roar', 'crowd_groan', 'crowd_chant',
  'cutscene_riser', 'bucket_water', 'tractor_start', 'shop_bag_rustle', 'snack_wrap', 'clothes_rustle', 'zipper_pull', 'curtain_pull', 'ui_bag_open', 'ui_page_turn',
  'npc_sigh', 'npc_cough', 'neon_buzz_on', 'phone_vibrate', 'elevator_doors', 'tram_doors', 'shop_sell_bills', 'dig_soil', 'harvest_cut', 'stairs_steps']);
const BAD_TITLE = /\b(music|song|beat|remix|speech|speaking|talking|narrat\w*|podcast|lyrics|melody|soundtrack|ringtone loop|loop)\b/i;

function decodeFile(file, hp, lp) {
  const af = ['highpass=f=' + hp, 'lowpass=f=' + lp].join(',');
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-af', af, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  const x = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
  let m = 0; for (const v of x) m += v; m /= x.length || 1;
  for (let i = 0; i < x.length; i++) x[i] -= m;   // DC offset away
  return x;
}
const half = (x) => { const y = new Float32Array(x.length >> 1); for (let i = 0; i < y.length; i++) y[i] = 0.5 * (x[2 * i] + x[2 * i + 1]); return y; };

// one candidate: processed clip plus the measurements and the verdict
export function processCandidate(file, meta, g) {
  const [base, , query, , cap, rms, hp, lp, flag] = g;
  const out = { ok: false, why: '', meta, score: 0 };
  if (!flag && BAD_TITLE.test(meta.titel || '') && !BAD_TITLE.test(query)) { out.why = 'title'; return out; }
  let x;
  try { x = trimStilte(decodeFile(file, hp, lp)); } catch (e) { out.why = 'decode'; return out; }
  if (x.length < 0.04 * SR) { out.why = 'short'; return out; }
  const capN = Math.round(cap * SR);
  const cut = x.length > capN;
  if (cut) x = x.slice(0, capN);
  const fi = Math.min(Math.round((base.startsWith('ui_') ? 0.003 : 0.005) * SR), x.length >> 2);
  const fu = Math.min(Math.round((cut ? 0.09 : 0.045) * SR), x.length >> 1);
  for (let i = 0; i < fi; i++) x[i] *= i / fi;
  for (let i = 0; i < fu; i++) x[x.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fu);
  let pk0 = 0; for (const v of x) pk0 = Math.max(pk0, Math.abs(v));
  if (pk0 < 0.003) { out.why = 'silent'; return out; }
  const h = half(x);
  const pop = popBegin(x, SR), eb = eindBurst(h, SR / 2), sc = scoreClip(h);
  if (pop.pop) { out.why = 'pop at the start'; return out; }
  if (eb && eb.burst) { out.why = 'noise burst at the end'; return out; }
  const noisy = NOISY.has(base);
  let score = 0;
  if (cut) score += 1.5;
  if (!noisy) { score += Math.min(4, sc.aandeel * 4); if (sc.staart >= GRENS.staartFrames) score += 3; }
  score += Math.abs(x.length / SR - cap * 0.5) * 0.3;
  const niv = normaliseer(x, rms);
  if (niv.begrensd && niv.rmsDb < rms - 7) { out.why = 'too peaky (rms ' + niv.rmsDb.toFixed(1) + ')'; return out; }
  return { ok: true, why: '', meta, score, x, niv, cut, sec: x.length / SR, aandeel: sc.aandeel, staart: sc.staart };
}

// the encoded file is what the game plays: encode to a temp file, decode again and run the same detectors (the lossy step can create a pop or a burst)
export function encodedOk(x) {
  const tmp = path.join(process.env.TEMP || '/tmp', 'gde-sfx-r5-check.ogg');
  schrijfOgg(x, tmp, 2);
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', tmp, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 26 });
  const y = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
  const h = new Float32Array(y.length >> 1); for (let i = 0; i < h.length; i++) h[i] = 0.5 * (y[2 * i] + y[2 * i + 1]);
  const eb = eindBurst(h, SR / 2);
  fs.rmSync(tmp, { force: true });
  return !popBegin(y, SR).pop && !(eb && eb.burst) && Math.abs(y[0]) < 0.05 && Math.abs(y[y.length - 1]) < 0.05;
}

export function pickBest(list, n) {
  const chosen = [], authors = new Map();
  const pool = list.filter((c) => c.ok);
  while (chosen.length < n && pool.length) {
    for (const c of pool) c.eff = c.score + (authors.get(c.meta.auteur) || 0) * 2 + (c.meta.licentie && /by\//.test(c.meta.licentie) ? 0.3 : 0);
    pool.sort((a, b) => a.eff - b.eff);
    const c = pool.shift();
    chosen.push(c);
    authors.set(c.meta.auteur, (authors.get(c.meta.auteur) || 0) + 1);
  }
  return chosen;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bron = arg('bron', '');
  if (!bron) throw new Error('--bron=<inbox> nodig');
  const only = arg('alleen', '').split(',').filter(Boolean);
  const dry = process.argv.includes('--dry');
  const mp = path.join(UIT, 'manifest.json');
  const man = JSON.parse(fs.readFileSync(mp, 'utf8'));
  const rapport = [], tekort = [];
  for (const g of GROUPS) {
    const [base, n, , , , rms, hp, lp] = g;
    if (only.length && !only.includes(base)) continue;
    const dir = path.join(bron, base);
    const metas = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) : [];
    const cands = metas.map((m) => processCandidate(path.join(dir, m.bestand), m, g));
    let chosen = pickBest(cands, n);
    for (let tries = 0; tries < 6; tries++) {
      const bad = chosen.filter((c) => !encodedOk(c.x));
      if (!bad.length) break;
      for (const c of bad) { c.ok = false; c.why = 'fails after encoding'; }
      chosen = pickBest(cands, n);
    }
    if (chosen.length < n) tekort.push(`${base}: ${chosen.length} van ${n} (${cands.map((c) => c.why || 'ok').join(', ') || 'geen kandidaten'})`);
    const label = (SFX_MAP[base] && SFX_MAP[base].label) || base;
    chosen.forEach((c, i) => {
      const k = `${base}_${i}`, dst = path.join(UIT, `${k}.ogg`), meta = c.meta;
      if (!dry) schrijfOgg(c.x, dst, 2);
      const kb = dry ? 0 : Math.round(fs.statSync(dst).size / 102.4) / 10;
      const by3 = /licenses\/by\/3\.0/.test(meta.licentie), by4 = /licenses\/by\/4\.0/.test(meta.licentie);
      const lic = by3 ? 'Creative Commons Attribution 3.0' : by4 ? 'Creative Commons Attribution 4.0' : 'Creative Commons 0 (CC0 1.0)';
      const licUrl = by3 ? 'https://creativecommons.org/licenses/by/3.0/' : by4 ? 'https://creativecommons.org/licenses/by/4.0/' : 'https://creativecommons.org/publicdomain/zero/1.0/';
      man.geluiden[k] = { bestand: `${k}.ogg`, gebruik: label, loop: false, duur_s: Math.round(c.sec * 100) / 100, grootte_kb: kb,
        herkomst: { titel: meta.titel || meta.naam, auteur: meta.auteur, freesound_id: meta.id, url: `https://freesound.org/people/${meta.auteur}/sounds/${meta.id}/`, licentie: lic, licentie_url: licUrl, datum: meta.opgehaald, bron_sha256: meta.sha256 },
        knip_s: null,
        niveau: { rms_db: Math.round(c.niv.rmsDb * 10) / 10, piek_db: Math.round(c.niv.pkDb * 10) / 10 },
        bewerking: `ffmpeg en eigen script: DC-offset weg, hoogdoorlaat ${hp} Hz, laagdoorlaat ${lp / 1000} kHz, mono 44,1 kHz, stilte aan begin en eind weg, ${c.cut ? 'ingekort, ' : ''}fade-in en cosinus-fade-uit, niveau RMS ${rms} dB${c.niv.begrensd ? ' (piekbegrenzing -1,5 dB)' : ''}, ogg (Vorbis q2)` };
      rapport.push(`${k.padEnd(26)} ${String(Math.round(c.sec * 100) / 100).padStart(5)} s ${String(kb).padStart(6)} kB  rms ${c.niv.rmsDb.toFixed(1)}  pk ${c.niv.pkDb.toFixed(1)}  [${by3 || by4 ? 'CC-BY' : 'CC0'} ${meta.auteur}]`);
    });
  }
  if (!dry) {
    man.geluiden = Object.fromEntries(Object.entries(man.geluiden).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(mp, JSON.stringify(man, null, 2) + '\n');
  }
  console.log(rapport.join('\n'));
  console.log(`\n${rapport.length} clips${dry ? ' (droog)' : ''}; tekort:\n${tekort.join('\n') || '(geen)'}`);
}
