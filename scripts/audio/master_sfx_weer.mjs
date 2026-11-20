// Weer, zomerambiance, onweer en autolussen met opnames (#988, ADR 0039): Freesound-previews (CC0 en CC-BY) uit een inbox-map naar
// game/audio/sfx/*.ogg, met naadloze lussen (nuldoorgang, gelijk-vermogen-kruisfade van 150 tot 500 ms) en een niveau dat past bij de
// procedurele lagen die ze aanvullen (bed_rain -25 dB RMS, bed_wind -15, bed_roof -15,5). Meet de naad en het niveau.
//   node scripts/audio/master_sfx_weer.mjs --bron=<inbox>[,<inbox>] [--alleen=<sleutel>]
// Voegt alleen zijn eigen sleutels toe aan het manifest. De keuze van bron en venster is op meting (stabiel niveau, geen gebeurtenissen), niet op gehoor.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { maakLus, meetNaad } from './master_sfx_voertuigen.mjs';
import { vindBron, schrijfOgg, SR } from './stap_knip.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || d;
const BRON = arg('bron', '').split(',').filter(Boolean);
const ALLEEN = arg('alleen', '');
const UIT = path.join(ROOT, 'game', 'audio', 'sfx');

// id: Freesound-id; knip: [start, duur] in s; loop: naadloos met kruisfade kruis (s); rms: doelniveau in dB; hp/lp in Hz; fade [in, uit] (alleen niet-lus)
export const GELUIDEN = {
  regen_motregen: { id: 167034, knip: [2, 14], loop: true, kruis: 0.4, hp: 120, lp: 12000, rms: -28, gebruik: 'weer: motregen, lichte regen buiten (lus)' },
  regen_bui: { id: 34073, knip: [0, 12], loop: true, kruis: 0.4, hp: 100, lp: 12000, rms: -25, gebruik: 'weer: gewone bui, regen buiten (lus)' },
  regen_plens: { id: 341802, knip: [2, 14], loop: true, kruis: 0.4, hp: 80, lp: 12000, rms: -22, gebruik: 'weer: plensbui, harde regen buiten (lus)' },
  regen_dak: { id: 232731, knip: [0, 14], loop: true, kruis: 0.4, hp: 80, lp: 9000, rms: -17, gebruik: 'weer: regen op een dak, gedempt van binnen (lus)' },
  regen_auto: { id: 435665, knip: [0, 16], loop: true, kruis: 0.4, hp: 60, lp: 7000, rms: -18, gebruik: 'weer: regen op de auto, van binnen gehoord (lus)' },
  wind_gras: { id: 321962, knip: [1, 20], loop: true, kruis: 0.5, hp: 50, lp: 8000, rms: -17, gebruik: 'weer: wind door gras, riet en open land (lus)' },
  zomer_insecten: { id: 529573, knip: [4, 20], loop: true, kruis: 0.5, hp: 400, lp: 14000, rms: -22, gebruik: 'zomer: weide met insecten, een warme dag (lus)' },
  zomer_vogels: { id: 618493, knip: [0, 30], loop: true, kruis: 0.5, hp: 150, lp: 14000, rms: -24, gebruik: 'zomer: vogels in het bos, overdag (lus)' },
  zomer_stadsvogels: { id: 712294, knip: [2, 18], loop: true, kruis: 0.5, hp: 150, lp: 14000, rms: -24, gebruik: 'zomer: vogels in de stad, overdag (lus)' },
  donder_dichtbij_0: { id: 505113, knip: [0, 10], hp: 30, lp: 10000, rms: -18, fade: [0.004, 1.2], gebruik: 'onweer: donderslag dichtbij met rommel' },
  donder_dichtbij_1: { id: 534023, knip: [0, 9], hp: 30, lp: 10000, rms: -18, fade: [0.004, 1.2], gebruik: 'onweer: donderslag dichtbij, scherp' },
  donder_dichtbij_2: { id: 2689, knip: [0, 12], hp: 30, lp: 10000, rms: -18, fade: [0.004, 1.5], gebruik: 'onweer: harde donderslag dichtbij' },
  donder_ver_0: { id: 581124, knip: [0, 8], hp: 30, lp: 6000, rms: -22, fade: [0.05, 1.0], gebruik: 'onweer: gerommel ver weg' },
  donder_ver_1: { id: 34777, knip: [0.8, 8.4], hp: 30, lp: 6000, rms: -22, fade: [0.05, 1.0], gebruik: 'onweer: gerommel ver weg (tweede)' },
  band_drift: { id: 71741, knip: [5.0, 2.4], loop: true, kruis: 0.15, hp: 300, lp: 12000, rms: -22, gebruik: 'auto: banden die slippen tijdens een drift (lus, toonhoogte volgt de slip)' },
  motor_auto_stationair: { id: 369053, knip: [0.3, 6.5], loop: true, kruis: 0.3, hp: 40, lp: 8000, rms: -24, gebruik: 'auto: motor stationair onder de motorsynth (lus, toonhoogte volgt het toerental)' },
};

const lees = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
// Bij een lus: het beste venster in de bron zoeken (kleinste niveaustap en sprong over de naad), want opnames hebben soms een uitschieter.
function beste(volledig, g) {
  const kr = Math.round(g.kruis * SR), n = Math.round((g.knip[1] + g.kruis) * SR), stap = Math.round(0.25 * SR);
  const lo = Math.round((g.zoek ? g.zoek[0] : 0) * SR), hi = Math.min(volledig.length - n, Math.round((g.zoek ? g.zoek[1] : volledig.length / SR) * SR));
  let best = null;
  for (let st = lo; st <= hi; st += stap) {
    const lus = maakLus(Float32Array.from(volledig.subarray(st, st + n)), kr), m = meetNaad(lus);
    const score = Math.abs(m.niveaustapDb) + 2 * Math.min(5, m.sprongRatio);
    if (!best || score < best.score) best = { st, score };
  }
  return best ? best.st / SR : g.knip[0];
}
function laad(g) {
  const { bestand, meta } = vindBron(BRON, g.id);
  if (g.loop && g.zoek !== false && !g.gezocht) {
    const vol = ffDecode(bestand, g);
    g.knip = [beste(vol, g), g.knip[1]];
    g.gezocht = true;
  }
  const f = [`atrim=start=${g.knip[0]}:duration=${g.knip[1] + (g.loop ? g.kruis : 0)}`, 'asetpts=PTS-STARTPTS', `highpass=f=${g.hp || 40}`, `lowpass=f=${g.lp || 14000}`];
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', bestand, '-af', f.join(','), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return { x: new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)), meta: lees(meta) };
}

function ffDecode(bestand, g) {
  const f = [`highpass=f=${g.hp || 40}`, `lowpass=f=${g.lp || 14000}`];
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', bestand, '-af', f.join(','), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
}

function normaliseer(x, doelDb, piekDb = -1.5) {
  let e = 0, pk = 0;
  for (const s of x) { e += s * s; pk = Math.max(pk, Math.abs(s)); }
  const rms = Math.sqrt(e / x.length) + 1e-12;
  let gain = Math.pow(10, doelDb / 20) / rms;
  let begrensd = false;
  if (gain * pk > Math.pow(10, piekDb / 20)) { gain = Math.pow(10, piekDb / 20) / (pk + 1e-12); begrensd = true; }
  for (let i = 0; i < x.length; i++) x[i] *= gain;
  return { rmsDb: 20 * Math.log10(rms * gain), pkDb: 20 * Math.log10(pk * gain + 1e-12), begrensd };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!BRON.length) throw new Error('--bron=<inbox> nodig');
  const mp = path.join(UIT, 'manifest.json');
  const man = lees(mp);
  const rapport = [];
  for (const [k, g] of Object.entries(GELUIDEN)) {
    if (ALLEEN && ALLEEN !== k) continue;
    let { x, meta } = laad(g);
    let naad = null;
    if (g.loop) { x = maakLus(x, Math.round(g.kruis * SR)); naad = meetNaad(x); }
    else {
      const [fi, fu] = g.fade || [0.004, 0.04];
      const ni = Math.round(fi * SR), nu = Math.round(fu * SR);
      for (let i = 0; i < ni && i < x.length; i++) x[i] *= i / ni;
      for (let i = 0; i < nu && i < x.length; i++) x[x.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / nu);
    }
    const niv = normaliseer(x, g.rms);
    const dst = path.join(UIT, `${k}.ogg`);
    schrijfOgg(x, dst, 2);
    const kb = Math.round(fs.statSync(dst).size / 102.4) / 10;
    const lic = /zero/.test(meta.licentie) ? 'Creative Commons 0 (CC0 1.0)' : /by\/3\.0/.test(meta.licentie) ? 'Creative Commons Attribution 3.0' : 'Creative Commons Attribution 4.0';
    const licUrl = lic.includes('CC0') ? 'https://creativecommons.org/publicdomain/zero/1.0/' : `https://creativecommons.org/licenses/by/${lic.endsWith('3.0') ? '3.0' : '4.0'}/`;
    man.geluiden[k] = { bestand: `${k}.ogg`, gebruik: g.gebruik, loop: !!g.loop, duur_s: Math.round((x.length / SR) * 100) / 100, grootte_kb: kb,
      herkomst: { titel: meta.titel || meta.naam, auteur: meta.auteur, freesound_id: meta.id, url: `https://freesound.org/people/${meta.auteur}/sounds/${meta.id}/`, licentie: lic, licentie_url: licUrl, datum: meta.opgehaald, bron_sha256: meta.sha256 },
      knip_s: { start: g.knip[0], duur: g.knip[1] },
      ...(naad ? { naad: { sprong_ratio: Math.round(naad.sprongRatio * 100) / 100, niveaustap_db: Math.round(naad.niveaustapDb * 100) / 100, kruisfade_ms: Math.round(g.kruis * 1000) } } : {}),
      niveau: { rms_db: Math.round(niv.rmsDb * 10) / 10, piek_db: Math.round(niv.pkDb * 10) / 10 },
      bewerking: `ffmpeg: knippen, hoogdoorlaat ${g.hp || 40} Hz, laagdoorlaat ${(g.lp || 14000) / 1000} kHz, mono 44,1 kHz${g.loop ? `, naadloze lus (nuldoorgang, gelijk-vermogen-kruisfade ${Math.round(g.kruis * 1000)} ms)` : ', fade-in en cosinus-fade-uit'}, niveau RMS ${g.rms} dB${niv.begrensd ? ' (piekbegrenzing -1,5 dB)' : ''}, ogg (Vorbis q2)` };
    rapport.push(`${k.padEnd(22)} ${String(man.geluiden[k].duur_s).padStart(5)} s ${String(kb).padStart(6)} kB  rms ${niv.rmsDb.toFixed(1)}  pk ${niv.pkDb.toFixed(1)}${niv.begrensd ? ' (begrensd)' : ''}${naad ? `  naad: sprong x${naad.sprongRatio.toFixed(2)}, stap ${naad.niveaustapDb.toFixed(2)} dB` : ''}  [${meta.licentie.includes('zero') ? 'CC0' : 'CC-BY'} ${meta.auteur}]`);
  }
  man.geluiden = Object.fromEntries(Object.entries(man.geluiden).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(mp, JSON.stringify(man, null, 2) + '\n');
  console.log(rapport.join('\n'));
}
