// Masteringscript voor de voertuigopnames (helikopter, vliegtuig, boot): CC0-previews van Freesound uit een eigen inbox-map
// (scripts/audio/freesound_zoek.mjs --haal=<id> --uit=<map>) naar game/audio/sfx/*.ogg, met een naadloze lus waar het geluid doorloopt.
// De lus: een stuk van N + C samples; de eerste C samples worden met een gelijk-vermogen-kruisfade (C = 100 ms) gemengd met de C samples
// na het einde, zodat eind en begin op elkaar aansluiten zonder klik. Het begin schuift naar de dichtstbijzijnde nuldoorgang.
// Het script meet de naad (sprong tegen de gewone sprong tussen twee samples, en het niveauverschil rond de naad) en meldt of die gaat.
// Voegt alleen zijn eigen sleutels toe aan game/audio/sfx/manifest.json en laat de rest staan.
// Gebruik: node scripts/audio/master_sfx_voertuigen.mjs --bron=<inbox-map> [--alleen=<sleutel>]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || d;
const BRON = arg('bron', '');
const ALLEEN = arg('alleen', '');
const UIT = path.join(ROOT, 'game', 'audio', 'sfx');
const SR = 44100, KRUIS = Math.round(0.1 * SR), DOEL_RMS_DB = -21, PIEK_MAX_DB = -2;

// id: Freesound-id (bestand <id>.ogg of .mp3 in de inbox); knip: [start, duur] in s; loop: naadloos; hp/lp: Hz; fade: [in, uit] in s (alleen niet-lus);
// gebruik: waarvoor; titel/auteur komen uit het .json-bestand naast de download
export const GELUIDEN = {
  heli_rotor_stat: { id: 184412, knip: [0, 6.0], loop: true, hp: 30, lp: 9000, gebruik: 'helikopter: rotor stationair en uitlopen (afspeelsnelheid volgt het rotortoerental)' },
  heli_rotor_vlucht: { id: 187681, knip: [0, 6.3], loop: true, hp: 30, lp: 12000, gebruik: 'helikopter: rotor in vlucht (wop-wop, laag bij langzaam, krachtiger bij snelheid)' },
  vliegtuig_start: { id: 437851, knip: [0, 5.6], hp: 30, lp: 12000, fade: [0.01, 0.4], gebruik: 'vliegtuig: motor aanslaan (starter, ontsteking, motor valt in)' },
  vliegtuig_stationair: { id: 437851, knip: [6.0, 9.5], loop: true, hp: 30, lp: 12000, gebruik: 'vliegtuig: motor stationair (lage toeren)' },
  vliegtuig_toeren: { id: 789390, knip: [0, 5.8], loop: true, hp: 60, lp: 12000, gebruik: 'vliegtuig: propeller bij hoge toeren (laag erbovenop, volgt het gas)' },
  vliegtuig_wind: { id: 267899, knip: [20, 9], loop: true, hp: 40, lp: 6000, gebruik: 'vliegtuig: stromende lucht bij snelheid' },
  vliegtuig_overtrek: { id: 425272, knip: [0, 3.2], loop: true, hp: 300, lp: 5000, gebruik: 'vliegtuig: overtrekwaarschuwing (zoemer)' },
  vliegtuig_gestel: { id: 425273, knip: [0, 4.0], hp: 60, lp: 5000, fade: [0.005, 0.15], gebruik: 'vliegtuig: landingsgestel in of uit' },
  vliegtuig_rol_asfalt: { id: 490905, knip: [19.9, 5.0], loop: true, hp: 40, lp: 3000, gebruik: 'vliegtuig: wielen rollend op een verharde baan' },
  vliegtuig_rol_gras: { id: 251661, knip: [0.5, 11], loop: true, hp: 80, lp: 7000, gebruik: 'vliegtuig: wielen rollend op gras of grind' },
  boot_motor_stat: { id: 637742, knip: [3, 12], loop: true, hp: 40, lp: 9000, gebruik: 'motorboot: buitenboordmotor stationair of langzaam' },
  boot_motor_vol: { id: 454199, knip: [0, 10.2], loop: true, hp: 40, lp: 10000, gebruik: 'motorboot: buitenboordmotor op snelheid, met golfslag' },
};

const lees = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
function laad(g) {
  const base = path.join(BRON, String(g.id));
  const bron = ['.ogg', '.mp3', '.wav', '.flac'].map((e) => base + e).find((p) => fs.existsSync(p));
  if (!bron) throw new Error(`ontbreekt in de inbox: ${g.id}`);
  const f = [`atrim=start=${g.knip[0]}:duration=${g.knip[1] + (g.loop ? 0.1 : 0)}`, 'asetpts=PTS-STARTPTS', `highpass=f=${g.hp || 40}`, `lowpass=f=${g.lp || 14000}`];
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', bron, '-af', f.join(','), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return { x: new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)), meta: lees(base + '.json') };
}

function nuldoorgang(x, vanaf) { for (let i = vanaf; i < Math.min(x.length - 1, vanaf + 2000); i++) if (x[i] <= 0 && x[i + 1] > 0) return i; return vanaf; }

export function maakLus(x, kruis = KRUIS) {
  // x heeft N + kruis (of minder) samples; is er minder, dan wordt N korter
  const start = nuldoorgang(x, 0);
  const y = x.subarray(start);
  const N = Math.min(Math.round(y.length - kruis), y.length - kruis);
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) out[i] = y[i];
  for (let i = 0; i < kruis; i++) {
    const a = (i / kruis) * Math.PI / 2;
    out[i] = y[i] * Math.sin(a) + y[N + i] * Math.cos(a);
  }
  return out;
}

export function meetNaad(x) {
  const n = x.length;
  let som = 0;
  for (let i = 1; i < n; i++) som += Math.abs(x[i] - x[i - 1]);
  const gem = som / (n - 1) || 1e-9;
  const sprong = Math.abs(x[0] - x[n - 1]);
  const rms = (a, b) => { let e = 0; for (let i = a; i < b; i++) e += x[i] * x[i]; return Math.sqrt(e / (b - a) + 1e-20); };
  const w = Math.round(0.08 * SR);
  const stap = 20 * Math.log10(rms(0, w) / rms(n - w, n));
  return { sprongRatio: sprong / gem, niveaustapDb: stap };
}

function normaliseer(x) {
  let e = 0, pk = 0;
  for (const s of x) { e += s * s; pk = Math.max(pk, Math.abs(s)); }
  const rms = Math.sqrt(e / x.length) + 1e-12;
  let gain = Math.pow(10, DOEL_RMS_DB / 20) / rms;
  gain = Math.min(gain, Math.pow(10, PIEK_MAX_DB / 20) / (pk + 1e-12));
  for (let i = 0; i < x.length; i++) x[i] *= gain;
  return { rmsDb: 20 * Math.log10(rms * gain), pkDb: 20 * Math.log10(pk * gain + 1e-12) };
}

function schrijf(x, dst) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', '-', '-c:a', 'libvorbis', '-q:a', '3', dst], { input: Buffer.from(x.buffer, x.byteOffset, x.byteLength) });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!BRON) throw new Error('--bron=<inbox-map> nodig');
  const mp = path.join(UIT, 'manifest.json');
  const man = lees(mp);
  const rapport = [];
  for (const [k, g] of Object.entries(GELUIDEN)) {
    if (ALLEEN && ALLEEN !== k) continue;
    let { x, meta } = laad(g);
    let naad = null;
    if (g.loop) { x = maakLus(x); naad = meetNaad(x); }
    else {
      const [fi, fu] = g.fade || [0.004, 0.04];
      const ni = Math.round(fi * SR), nu = Math.round(fu * SR);
      for (let i = 0; i < ni && i < x.length; i++) x[i] *= i / ni;
      for (let i = 0; i < nu && i < x.length; i++) x[x.length - 1 - i] *= i / nu;
    }
    const niv = normaliseer(x);
    const dst = path.join(UIT, `${k}.ogg`);
    schrijf(x, dst);
    const kb = Math.round(fs.statSync(dst).size / 102.4) / 10;
    const by = !/zero/.test(meta.licentie);
    man.geluiden[k] = { bestand: `${k}.ogg`, gebruik: g.gebruik, loop: !!g.loop, duur_s: Math.round((x.length / SR) * 100) / 100, grootte_kb: kb,
      herkomst: { titel: meta.naam, auteur: meta.auteur, freesound_id: meta.id, url: `https://freesound.org/people/${meta.auteur}/sounds/${meta.id}/`, licentie: by ? 'Creative Commons Attribution 4.0' : 'Creative Commons 0 (CC0 1.0)' },
      knip_s: { start: g.knip[0], duur: g.knip[1] },
      ...(naad ? { naad: { sprong_ratio: Math.round(naad.sprongRatio * 100) / 100, niveaustap_db: Math.round(naad.niveaustapDb * 100) / 100, kruisfade_ms: 100 } } : {}),
      niveau: { rms_db: Math.round(niv.rmsDb * 10) / 10, piek_db: Math.round(niv.pkDb * 10) / 10 },
      bewerking: `ffmpeg: knippen, hoogdoorlaat ${g.hp || 40} Hz, laagdoorlaat ${(g.lp || 14000) / 1000} kHz, mono 44,1 kHz${g.loop ? ', naadloze lus (nuldoorgang, gelijk-vermogen-kruisfade 100 ms)' : ', fades'}, statisch niveau (RMS -21 dB, piek max -2 dB), ogg (Vorbis q3)` };
    rapport.push(`${k.padEnd(22)} ${String(man.geluiden[k].duur_s).padStart(5)} s ${String(kb).padStart(6)} kB  rms ${niv.rmsDb.toFixed(1)}  pk ${niv.pkDb.toFixed(1)}${naad ? `  naad: sprong x${naad.sprongRatio.toFixed(2)}, stap ${naad.niveaustapDb.toFixed(2)} dB` : ''}  [${meta.licentie.includes('zero') ? 'CC0' : 'CC-BY'} ${meta.auteur}]`);
  }
  man.geluiden = Object.fromEntries(Object.entries(man.geluiden).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(mp, JSON.stringify(man, null, 2) + '\n');
  console.log(rapport.join('\n'));
}
