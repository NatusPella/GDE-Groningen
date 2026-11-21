// SFX owner verdict (21-11, #1166): masters three new candidates for the sounds the owner rejected and installs the best one.
// Targets: ui_confirm_0, shop_sell_bills_0 (real banknotes) and shop_drawer_1 (a real drawer). Raw previews come from
// freesound_zoek.mjs --haal=<ids> --uit=<raw>/<key> (CC0 and CC BY only, ADR 0039). Same mastering and detectors as round 5.
// Candidates land in docs/sfx-oordeel-kandidaten/<key>_k1..k3.ogg for the listening page (sfx_oordeel_paneel.mjs);
// the best (k1) is installed in game/audio/sfx and in the manifest.
//   node scripts/audio/sfx_oordeel.mjs --bron=<raw> [--installeer]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { GROUPS } from './sfx_round5_list.mjs';
import { processCandidate, encodedOk, pickBest } from './master_sfx_round5.mjs';
import { schrijfOgg } from './stap_knip.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || d;
export const TARGETS = [['ui_confirm', 0], ['shop_sell_bills', 0], ['shop_drawer', 1]];
const VOORKEUR = { shop_sell_bills: 435624, shop_drawer: 91924 };   // Taking Bill From Stack; Till With Bell (a cash drawer with a ring, unlike the wooden drawer_0)
const SFX =path.join(ROOT, 'game', 'audio', 'sfx');
export const KAND = path.join(ROOT, 'docs', 'sfx-oordeel-kandidaten');

function lic(url) {
  if (/licenses\/by\/3\.0/.test(url)) return ['Creative Commons Attribution 3.0', 'https://creativecommons.org/licenses/by/3.0/'];
  if (/licenses\/by\/4\.0/.test(url)) return ['Creative Commons Attribution 4.0', 'https://creativecommons.org/licenses/by/4.0/'];
  return ['Creative Commons 0 (CC0 1.0)', 'https://creativecommons.org/publicdomain/zero/1.0/'];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bron = arg('bron', '');
  if (!bron) throw new Error('--bron=<raw> nodig');
  const install = process.argv.includes('--installeer');
  fs.mkdirSync(KAND, { recursive: true });
  const mp = path.join(SFX, 'manifest.json');
  const man = JSON.parse(fs.readFileSync(mp, 'utf8'));
  const lijst = {};
  for (const [base, idx] of TARGETS) {
    const g = GROUPS.find((x) => x[0] === base);
    const [, , , , cap, rms, hp, lp] = g;
    const dir = path.join(bron, base);
    const cands = [];
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const m = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const id = String(m.id), file = ['ogg', 'mp3'].map((e) => path.join(dir, `${id}.${e}`)).find((p) => fs.existsSync(p));
      const meta = { id: m.id, titel: m.naam, auteur: m.auteur, licentie: m.licentie, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), opgehaald: new Date().toISOString().slice(0, 10) };
      const c = processCandidate(file, meta, g);
      console.log(base.padEnd(16), id.padEnd(7), c.ok ? `ok score ${c.score.toFixed(2)} ${c.sec.toFixed(2)}s rms ${c.niv.rmsDb.toFixed(1)}` : 'AFGEWEZEN ' + c.why, '|', m.auteur, m.naam);
      cands.push(c);
    }
    let chosen = pickBest(cands, 3);
    for (let t = 0; t < 6; t++) {
      const bad = chosen.filter((c) => !encodedOk(c.x));
      if (!bad.length) break;
      for (const c of bad) { c.ok = false; c.why = 'fails after encoding'; }
      chosen = pickBest(cands, 3);
    }
    chosen.sort((a, b) => (b.meta.id === VOORKEUR[base]) - (a.meta.id === VOORKEUR[base]));   // by title: the one that fits the sound best goes first
    lijst[base] = [];
    chosen.forEach((c, i) => {
      const dst = path.join(KAND, `${base}_k${i + 1}.ogg`);
      schrijfOgg(c.x, dst, 2);
      const [l, lu] = lic(c.meta.licentie);
      const entry = { bestand: `${base}_${idx}.ogg`, gebruik: (man.geluiden[`${base}_${idx}`] || {}).gebruik, loop: false, duur_s: Math.round(c.sec * 100) / 100,
        grootte_kb: Math.round(fs.statSync(dst).size / 102.4) / 10,
        herkomst: { titel: c.meta.titel, auteur: c.meta.auteur, freesound_id: c.meta.id, url: `https://freesound.org/people/${c.meta.auteur}/sounds/${c.meta.id}/`, licentie: l, licentie_url: lu, datum: c.meta.opgehaald, bron_sha256: c.meta.sha256 },
        knip_s: null, niveau: { rms_db: Math.round(c.niv.rmsDb * 10) / 10, piek_db: Math.round(c.niv.pkDb * 10) / 10 },
        bewerking: `ffmpeg en eigen script: DC-offset weg, hoogdoorlaat ${hp} Hz, laagdoorlaat ${lp / 1000} kHz, mono 44,1 kHz, stilte aan begin en eind weg, ${c.cut ? 'ingekort, ' : ''}fade-in en cosinus-fade-uit, niveau RMS ${rms} dB${c.niv.begrensd ? ' (piekbegrenzing -1,5 dB)' : ''}, ogg (Vorbis q2)` };
      lijst[base].push({ kand: `${base}_k${i + 1}.ogg`, entry });
      if (i === 0 && install) { fs.copyFileSync(dst, path.join(SFX, `${base}_${idx}.ogg`)); man.geluiden[`${base}_${idx}`] = entry; }
    });
  }
  fs.writeFileSync(path.join(KAND, 'kandidaten.json'), JSON.stringify(lijst, null, 1) + '\n');
  if (install) fs.writeFileSync(mp, JSON.stringify(man, null, 2) + '\n');
  for (const [b, l] of Object.entries(lijst)) console.log(b, l.map((x) => `${x.kand}=${x.entry.herkomst.freesound_id}(${x.entry.herkomst.auteur})`).join('  '));
}
