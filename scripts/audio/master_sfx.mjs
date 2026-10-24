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

// bestand: ruwe bestandsnaam (begint met het Freesound-id); knip: [start, duur] in s of null; hp/lp: hoog- en laagdoorlaat in Hz (standaard 40 en 14000);
// fade: [in, uit] in s; extra: eigen ffmpeg-filter; loop: kort stuk dat het spel herhaalt; meting: de analyse (ffmpeg, per venster van 0,25 s) waarop de knip is gekozen
const GELUIDEN = {
  auto_deur_dicht_1: { bestand: '488053__bendrain__car_door_close_01.wav', knip: null, titel: 'Car_Door_Close_01.wav', auteur: 'BenDrain', id: 488053, gebruik: 'autodeur dicht' },
  auto_deur_dicht_2: { bestand: '778421__blondpanda__car_door_closing_dull_04.wav', knip: null, titel: 'Car_Door_Closing_Dull_04', auteur: 'BlondPanda', id: 778421, gebruik: 'autodeur dicht (dof)' },
  auto_deur_open: { bestand: '488056__bendrain__car_door_open_02.wav', knip: null, titel: 'Car_Door_Open_02.wav', auteur: 'BenDrain', id: 488056, gebruik: 'autodeur open' },
  auto_portiergreep: { bestand: '50697__rutgermuller__car-door-handle.wav', knip: null, titel: 'Car Door Handle.wav', auteur: 'RutgerMuller', id: 50697, gebruik: 'portiergreep' },
  band_piep_bocht: { bestand: '71738__audible-edge__chrysler-lhs-tire-squeal-03-04-25-2009.wav', knip: [5.97, 1.2], hp: 250, fade: [0.1, 0.15], loop: true, titel: 'Chrysler LHS tire squeal 03 (04-25-2009).wav', auteur: 'audible-edge', id: 71738, gebruik: 'één piep van banden in een bocht (loop, volume en toonhoogte naar slip)',
    meting: 'bron 13,8 s, losse piep 6,0 tot 7,15 s (98% van de energie tussen 300 Hz en 3 kHz, onder 300 Hz 2 tot 10%, piek rond 1 kHz)' },
  handrem_bocht: { bestand: '76804__audible-edge__ae0090-volvo-740-gle-handbrake-turn-01.flac', knip: [7.45, 2.0], hp: 400, fade: [0.04, 0.4], titel: 'AE0090 Volvo 740 GLE handbrake turn 01.flac', auteur: 'audible-edge', id: 76804, gebruik: 'handrembocht of driften (alleen de bandenslip)',
    meting: 'bron 10,4 s, aanloop (auto, motor) 0 tot 7,4 s met 30 tot 75% onder 300 Hz weggeknipt, slip 7,5 tot 9,5 s (92 tot 100% tussen 300 Hz en 3 kHz, 0 tot 3% onder 300 Hz, piek rond 1 kHz), staart na 9,5 s weg' },
  remmen_grind: { bestand: '637161__kyles__auto-car-or-van-stop-brake-skid-gravel-short.flac', knip: null, titel: 'auto car or van stop brake skid gravel short.flac', auteur: 'kyles', id: 637161, gebruik: 'remmen op grind' },
  trein_deur_open: { bestand: '209969__jrosin__opening-and-closing-the-train-door.flac', knip: [0.45, 2.95], hp: 60, fade: [0.02, 0.25], titel: 'Opening and closing the train door.flac', auteur: 'jrosin', id: 209969, gebruik: 'treindeuren gaan open',
    meting: 'bron 16,3 s: deur open 0,5 tot 3,7 s (silencedetect -40 dB boven 1,2 kHz: stilte tot 0,59 s en vanaf 3,75 s), daarna alleen achtergrondbrom (98% onder 300 Hz) tot 9 s; hier 0,45 tot 3,4 s' },
  trein_deur_piep: { bestand: '209969__jrosin__opening-and-closing-the-train-door.flac', knip: [9.0, 2.4], hp: 1200, lp: 8000, fade: [0.02, 0.08], titel: 'Opening and closing the train door.flac', auteur: 'jrosin', id: 209969, gebruik: 'waarschuwingssignaal voor het sluiten van de treindeuren',
    meting: 'bron: piepsignaal 1,9 kHz van 9,0 tot 13,8 s (silencedetect boven 1,2 kHz: stilte tot 8,997 s), met de brom eronder weggefilterd (hoogdoorlaat 1,2 kHz); hier 9,0 tot 11,4 s' },
  trein_deur_dicht: { bestand: '209969__jrosin__opening-and-closing-the-train-door.flac', knip: [13.85, 0.7], hp: 200, extra: 'bandreject=f=1900:width_type=h:w=150,bandreject=f=3800:width_type=h:w=250', fade: [0.02, 0.1], titel: 'Opening and closing the train door.flac', auteur: 'jrosin', id: 209969, gebruik: 'treindeuren gaan dicht',
    meting: 'bron: deur dicht 13,85 tot 14,55 s (piek -12 dB rond 14,25 s, silencedetect: stilte vanaf 14,51 s); brom eronder weggefilterd (hoogdoorlaat 200 Hz) en het doorlopende piepsignaal weggefilterd (kerffilters op 1,9 en 3,8 kHz)' },
};

const lees = () => { try { return JSON.parse(fs.readFileSync(path.join(UIT, 'manifest.json'), 'utf8')); } catch (e) { return { licentie: 'Creative Commons 0 (CC0 1.0)', bron: 'https://freesound.org', geluiden: {} }; } };

function master(sleutel, g) {
  const src = path.join(BRON, g.bestand);
  if (!fs.existsSync(src)) throw new Error(`ontbreekt: ${src}`);
  const dst = path.join(UIT, `${sleutel}.ogg`);
  const f = [];
  if (g.knip) f.push(`atrim=start=${g.knip[0]}:duration=${g.knip[1]}`, 'asetpts=PTS-STARTPTS');
  f.push('silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=1:stop_threshold=-55dB:stop_duration=0.3',
    `highpass=f=${g.hp || 40}`, `lowpass=f=${g.lp || 14000}`, ...(g.extra ? [g.extra] : []), 'loudnorm=I=-18:TP=-2:LRA=7');
  const [fin, fuit] = g.fade || (g.loop ? [0.25, 0.25] : [0.004, 0.04]);
  f.push(`afade=t=in:d=${fin}`, 'areverse', `afade=t=in:d=${fuit}`, 'areverse');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-af', f.join(','), '-ac', '1', '-ar', '44100', '-c:a', 'libvorbis', '-q:a', '4', dst], { stdio: 'inherit' });
  return dst;
}

fs.mkdirSync(UIT, { recursive: true });
const man = lees();
for (const k of Object.keys(man.geluiden)) if (!GELUIDEN[k]) delete man.geluiden[k]; // een oude sleutel (zoals trein_deur) verdwijnt uit het manifest
for (const [k, g] of Object.entries(GELUIDEN)) {
  if (ALLEEN && ALLEEN !== k) continue;
  const dst = master(k, g);
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', dst]).toString().trim());
  man.geluiden[k] = { bestand: `${k}.ogg`, gebruik: g.gebruik, loop: !!g.loop, duur_s: Math.round(dur * 100) / 100, grootte_kb: Math.round(fs.statSync(dst).size / 102.4) / 10,
    herkomst: { titel: g.titel, auteur: g.auteur, freesound_id: g.id, url: `https://freesound.org/people/${g.auteur}/sounds/${g.id}/`, licentie: 'Creative Commons 0 (CC0 1.0)' }, knip_s: g.knip ? { start: g.knip[0], duur: g.knip[1] } : null, ...(g.meting ? { meting: g.meting } : {}), bewerking: `ffmpeg: knippen, stilte weg, hoogdoorlaat ${g.hp || 40} Hz, laagdoorlaat ${(g.lp || 14000) / 1000} kHz, loudnorm -18 LUFS, fades, mono 44,1 kHz, ogg (Vorbis q4)` };
  console.log(`${k}: ${dur.toFixed(2)} s, ${(fs.statSync(dst).size / 1024).toFixed(1)} KB`);
}
fs.writeFileSync(path.join(UIT, 'manifest.json'), JSON.stringify(man, null, 2) + '\n');
console.log(`manifest: ${Object.keys(man.geluiden).length} geluiden`);
