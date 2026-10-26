# Voices the two spoken lines of the trailer "Een zomer in Grunn"
# (js/trailer.js TRAILER_VOICE) with Gemini 3.8 Flash TTS (gemini_tts.py),
# in the voices the cast already has (tts_lines_list.mjs CAST), into
# game/audio/voicelines/trailer + its manifest.json and tts.json. Rikus is on
# the radio: the broadcast band and a bed of static are baked into his clip,
# so the game and the MP4 export (desktop --trailer-video) play the same file.
#   python3 scripts/tts_trailer.py [--force]
import json, os, subprocess, sys, wave
from gemini_tts import usage, speak, check, current, load_log, save_log, logged, say_of

REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(REPO, 'game', 'audio', 'voicelines', 'trailer')
ACCENT = 'spoken in Gronings dialect (Grunnegs) exactly as written, warm Groningen accent'
TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse'
LUFS, TP = -18, -1.5
# 0.9 s of static before Rikus and 0.6 s after, AM-radio band, a little presence
RADIO = ("[0:a]adelay=900,apad=pad_dur=0.6,highpass=f=240,lowpass=f=4600,equalizer=f=1900:t=q:w=0.8:g=3[v];"
         "anoisesrc=c=pink:a=0.05:d={d},highpass=f=400,lowpass=f=5200,afade=t=in:d=0.25,afade=t=out:st={fo}:d=0.4[n];"
         "[v][n]amix=inputs=2:duration=first:normalize=0")

JOBS = [
    {'key': 'Rikus|Augustus. In Grunn heet dat zomer.', 'file': 'rikus_augustus.mp3', 'voice': 'Schedar', 'radio': True,
     'text': 'Augustus. In Grunn heet dat zomer.',
     'style': f'{ACCENT}; Rikus, Groningse nacht-dj en verteller, jeugdvriend van Tammo, warm en droog. Tone: loom, droog, met een knipoog, als dj op de radio op een warme ochtend.'},
    {'key': 'Bommen Berend|…Kon minder.', 'file': 'berend_kon_minder.mp3', 'voice': 'Charon', 'radio': False,
     'text': '…Kon minder.', 'say': 'Kon minder.',
     'style': f'{ACCENT}; norse oude Groningse man met een bakkie. Tone: nors, binnensmonds, na een lange stilte, stiekem een heel klein beetje tevreden.'},
]
POST = f'ffmpeg -af {TRIM},loudnorm=I={LUFS}:TP={TP}:LRA=11:linear=true (two-pass) -ac 1 -ar 24000 -b:a 64k mp3'
POST_RADIO = POST + '; then radio band (highpass 240 Hz, lowpass 4.6 kHz, +3 dB at 1.9 kHz) over a pink-noise static bed, 0.9 s lead-in'


def probe(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout)


def encode(wav, dst, radio):
    trimmed = wav[:-4] + '.trim.wav'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-af', TRIM, trimmed], check=True)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', trimmed, '-af', f'loudnorm=I={LUFS}:TP={TP}:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    ln = f"loudnorm=I={LUFS}:TP={TP}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
    if not radio:
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', trimmed, '-af', ln, '-ac', '1', '-ar', '24000', '-b:a', '64k', dst], check=True)
    else:
        norm = wav[:-4] + '.norm.wav'
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', trimmed, '-af', ln, '-ac', '1', '-ar', '24000', norm], check=True)
        d = probe(norm) + 1.5
        fc = RADIO.format(d=f'{d:.2f}', fo=f'{d - 0.4:.2f}')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', norm, '-filter_complex', fc, '-ac', '1', '-ar', '24000', '-b:a', '64k', dst], check=True)
        os.remove(norm)
    os.remove(trimmed)


os.makedirs(OUT, exist_ok=True)
man_path = os.path.join(OUT, 'manifest.json')
man = json.load(open(man_path, encoding='utf-8')) if os.path.exists(man_path) else {}
log = load_log(OUT)
force = '--force' in sys.argv
u0 = usage()
for j in JOBS:
    dst = os.path.join(OUT, j['file'])
    if not force and current(log, j['key'], dst):
        print('skip', j['file'])
        continue
    say = say_of(j)
    for style in [j['style'], '']:
        try:
            pcm = speak(j['voice'], say, style)
            check(pcm, say)
            wav = dst[:-4] + '.tmp.wav'
            with wave.open(wav, 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
            encode(wav, dst, j['radio'])
            os.remove(wav)
            break
        except Exception as e:
            print('retry', j['file'], repr(e)[:160])
    else:
        print('FAIL', j['file'])
        continue
    dur = probe(dst)
    man[j['key']] = {'src': j['file'], 'dur': round(dur, 2)}
    log[j['key']] = logged(j, j['file'], style, POST_RADIO if j['radio'] else POST)
    print('ok', j['file'], f'{dur:.2f}s')
json.dump(man, open(man_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
save_log(OUT, log)
print(f'spent ${usage() - u0:.4f}')
