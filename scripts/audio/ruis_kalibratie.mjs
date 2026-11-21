// Kalibratie van de ruis-einde- en pop-begin-detectors op de beluisterde set (21-11): de positieven zijn de clips die de eigenaar
// als fout noemde, de negatieven de overige spraakclips uit zijn luisterlijst (docs/WITTE-RUIS-LUISTER-VERDACHT.html, de
// eerste versie), die hij OK vond. Meet per clip de kenmerken en zegt hoe goed elke regel positieven en negatieven scheidt.
//   node scripts/audio/ruis_kalibratie.mjs [--lijst=pad.html] [--tabel]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { eindBurst } from './ruisachtig_scan.mjs';
import { popBegin } from './pop_begin.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SR = 22050;
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };

// de clips die de eigenaar noemde (de kalibratie-opdrachten van 21-11)
export const POSITIEF = [
  'banter/wk-oosterpark-stoep_3_a_033661.mp3', 'anita/missie_gelukt_v2.wav', 'anita/missie_gelukt_v1.wav', 'lines/anita/alleen_75b2d578.mp3',
  'lines/anita/jij_stuurt_ik_zeg_wanneer_f6514353.mp3', 'lines/anita/dat_weet_je_gewoon_27acfb05.mp3', 'story/m2/intro_4_anita.mp3',
  'lines/geesje/dan_koopt_u_een_eierkoek_b46628c6.mp3', 'lines/anita/wat_8e0c039a.mp3', 'story/m2/intro_2_anita.mp3',
].map((f) => 'game/audio/voicelines/' + f);

export function laad(f) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(ROOT, f), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength - (buf.byteLength % 4)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = fs.readFileSync(arg('lijst', path.join(ROOT, 'scripts', 'audio', 'data', 'luisterlijst_eigenaar_21-11.html')), 'utf8');
  const lijst = [...new Set([...html.matchAll(/game\/audio\/voicelines\/[^"<\s]+/g)].map((m) => m[0]))];
  const pos = new Set(POSITIEF);
  const alle = [...new Set([...POSITIEF, ...lijst])];
  const rijen = [];
  for (const f of alle) {
    let x; try { x = laad(f); } catch (e) { continue; }
    rijen.push({ f, pos: pos.has(f), eind: eindBurst(x, SR), pop: popBegin(x, SR) });
  }
  const tel = (naam, fn) => {
    let tp = 0, fp = 0, fn_ = 0, tn = 0;
    for (const r of rijen) { const g = fn(r); if (g && r.pos) tp++; else if (g) fp++; else if (r.pos) fn_++; else tn++; }
    console.log(`${naam.padEnd(28)} TP ${tp}  FP ${fp}  FN ${fn_}  TN ${tn}  precisie ${(tp / Math.max(1, tp + fp)).toFixed(2)}  recall ${(tp / Math.max(1, tp + fn_)).toFixed(2)}`);
  };
  console.log(`${rijen.length} clips (${rijen.filter((r) => r.pos).length} positief, ${rijen.filter((r) => !r.pos).length} negatief)`);
  tel('ruis-einde', (r) => r.eind.burst);
  tel('pop-begin', (r) => r.pop.pop);
  tel('ruis-einde OF pop-begin', (r) => r.eind.burst || r.pop.pop);
  tel('ruis-einde EN pop-begin', (r) => r.eind.burst && r.pop.pop);
  if (process.argv.includes('--tabel')) for (const r of rijen) console.log((r.pos ? 'POS ' : 'neg ') + r.f.replace('game/audio/voicelines/', '').padEnd(62), 'eind', r.eind.burst ? `${r.eind.ms}ms ${r.eind.piekDb}dB` : '-', ' pop', JSON.stringify(r.pop));
}
