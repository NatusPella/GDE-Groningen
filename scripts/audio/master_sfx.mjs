// Masteringscript voor opnames van effecten (Freesound, CC0): één herhaalbare bewerking zodat alles even hard en even helder klinkt.
// Bron: de map met ruwe downloads (standaard ~/Downloads, of --bron=<map>). Resultaat: game/audio/sfx/*.ogg en game/audio/sfx/manifest.json
// (bron, auteur, licentie, datum, bewerking), dat docs/LICENTIES.md en NOTICE.md voeden. Vereist ffmpeg in het pad.
// Gebruik: node scripts/audio/master_sfx.mjs [--bron=<map>] [--alleen=<sleutel>]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || d;
const BRON = arg('bron', path.join(os.homedir(), 'Downloads'));
const ALLEEN = arg('alleen', '');
const UIT = path.join(ROOT, 'game', 'audio', 'sfx');

// bestand: ruwe bestandsnaam (begint met het Freesound-id); knip: [start, duur] in s of null; loop: kort stuk dat naadloos herhaalt (fade in en uit)
const GELUIDEN = {
  auto_deur_dicht_1: { bestand: '488053__bendrain__car_door_close_01.wav', knip: null, titel: 'Car_Door_Close_01.wav', auteur: 'BenDrain', id: 488053, gebruik: 'autodeur dicht' },
  auto_deur_dicht_2: { bestand: '778421__blondpanda__car_door_closing_dull_04.wav', knip: null, titel: 'Car_Door_Closing_Dull_04', auteur: 'BlondPanda', id: 778421, gebruik: 'autodeur dicht (dof)' },
  auto_deur_open: { bestand: '488056__bendrain__car_door_open_02.wav', knip: null, titel: 'Car_Door_Open_02.wav', auteur: 'BenDrain', id: 488056, gebruik: 'autodeur open' },
  auto_portiergreep: { bestand: '50697__rutgermuller__car-door-handle.wav', knip: null, titel: 'Car Door Handle.wav', auteur: 'RutgerMuller', id: 50697, gebruik: 'portiergreep' },
  band_piep_bocht: { bestand: '71738__audible-edge__chrysler-lhs-tire-squeal-03-04-25-2009.wav', knip: [1.0, 8.0], loop: true, titel: 'Chrysler LHS tire squeal 03 (04-25-2009).wav', auteur: 'audible-edge', id: 71738, gebruik: 'banden piepen in een bocht (loop)' },
  handrem_bocht: { bestand: '76804__audible-edge__ae0090-volvo-740-gle-handbrake-turn-01.flac', knip: [1.5, 6.5], titel: 'AE0090 Volvo 740 GLE handbrake turn 01.flac', auteur: 'audible-edge', id: 76804, gebruik: 'handrembocht of driften' },
  remmen_grind: { bestand: '637161__kyles__auto-car-or-van-stop-brake-skid-gravel-short.flac', knip: null, titel: 'auto car or van stop brake skid gravel short.flac', auteur: 'kyles', id: 637161, gebruik: 'remmen op grind' },
  trein_deur: { bestand: '209969__jrosin__opening-and-closing-the-train-door.flac', knip: [0, 16], titel: 'Opening and closing the train door.flac', auteur: 'jrosin', id: 209969, gebruik: 'treindeur open en dicht' },
};

const lees = () => { try { return JSON.parse(fs.readFileSync(path.join(UIT, 'manifest.json'), 'utf8')); } catch (e) { return { licentie: 'Creative Commons 0 (CC0 1.0)', bron: 'https://freesound.org', geluiden: {} }; } };

function master(sleutel, g) {
  const src = path.join(BRON, g.bestand);
  if (!fs.existsSync(src)) throw new Error(`ontbreekt: ${src}`);
  const dst = path.join(UIT, `${sleutel}.ogg`);
  const f = [];
  if (g.knip) f.push(`atrim=start=${g.knip[0]}:duration=${g.knip[1]}`, 'asetpts=PTS-STARTPTS');
  f.push('silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=1:stop_threshold=-55dB:stop_duration=0.3',
    'highpass=f=40', 'lowpass=f=14000', 'loudnorm=I=-18:TP=-2:LRA=7');
  if (g.loop) f.push('afade=t=in:d=0.25', 'areverse', 'afade=t=in:d=0.25', 'areverse');
  else f.push('afade=t=in:d=0.004', 'areverse', 'afade=t=in:d=0.04', 'areverse');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-af', f.join(','), '-ac', '1', '-ar', '44100', '-c:a', 'libvorbis', '-q:a', '4', dst], { stdio: 'inherit' });
  return dst;
}

fs.mkdirSync(UIT, { recursive: true });
const man = lees();
for (const [k, g] of Object.entries(GELUIDEN)) {
  if (ALLEEN && ALLEEN !== k) continue;
  const dst = master(k, g);
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', dst]).toString().trim());
  man.geluiden[k] = { bestand: `${k}.ogg`, gebruik: g.gebruik, loop: !!g.loop, duur_s: Math.round(dur * 100) / 100, grootte_kb: Math.round(fs.statSync(dst).size / 102.4) / 10,
    herkomst: { titel: g.titel, auteur: g.auteur, freesound_id: g.id, url: `https://freesound.org/people/${g.auteur}/sounds/${g.id}/`, licentie: 'Creative Commons 0 (CC0 1.0)' }, bewerking: 'ffmpeg: knippen, stilte weg, hoogdoorlaat 40 Hz, laagdoorlaat 14 kHz, loudnorm -18 LUFS, fades, mono 44,1 kHz, ogg (Vorbis q4)' };
  console.log(`${k}: ${dur.toFixed(2)} s, ${(fs.statSync(dst).size / 1024).toFixed(1)} KB`);
}
fs.writeFileSync(path.join(UIT, 'manifest.json'), JSON.stringify(man, null, 2) + '\n');
console.log(`manifest: ${Object.keys(man.geluiden).length} geluiden`);
