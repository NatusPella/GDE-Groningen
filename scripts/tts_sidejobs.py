# Voices the bijbaantje lines with Gemini 3.8 Flash TTS (gemini_tts.py) into
# game/audio/voicelines/jobs + manifest.json (what each clip was made from in
# tts.json). Needs ffmpeg. Current clips
# (logged with gemini_tts.MODEL) are skipped, so a rerun only fills gaps and
# outdated clips; the spend of the run is printed at the end.
#   node scripts/tts_sidejobs_lines.mjs && python3 scripts/tts_sidejobs.py [max_lines]
import json, os, sys, subprocess, urllib.error, wave, time
from concurrent.futures import ThreadPoolExecutor
from gemini_tts import usage, speak, tries, check, current, load_log, save_log, logged, say_of
REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(REPO, 'game', 'audio', 'voicelines', 'jobs')
TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=stop_periods=-1:stop_duration=0.28:stop_threshold=-45dB,adelay=40,apad=pad_dur=0.12,asetnsamples=n=1152:p=0'
RADIO = 'highpass=f=320,lowpass=f=3400,acompressor=threshold=-18dB:ratio=4,volume=1.6,alimiter=limit=0.85,'


def post(l):
    return f"ffmpeg -af {(RADIO if l.get('radio') else '') + TRIM} -ac 1 -ar 24000 -b:a 48k mp3"


def job(l):
    dst = f"{OUT}/{l['file']}"
    if current(log, f"{l['speaker']}|{l['text']}", dst):
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst], capture_output=True, text=True).stdout)
        return l, 'skip', dur, None
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    err = None
    for attempt, style in enumerate(tries(l)):
        try:
            wav = dst[:-4] + '.tmp.wav'
            say = say_of(l)
            pcm = speak(l['voice'], say, style)
            check(pcm, say, 1.2)
            with wave.open(wav, 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-af', (RADIO if l.get('radio') else '') + TRIM, '-ac', '1', '-ar', '24000', '-b:a', '48k', dst], check=True)
            os.remove(wav)
            dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst], capture_output=True, text=True).stdout)
            return l, 'ok' if attempt == 0 else 'ok-fallback', dur, style
        except urllib.error.HTTPError as e:
            err = f'HTTP {e.code} {e.read()[:160]!r}'
        except Exception as e:
            err = repr(e)[:160]
        time.sleep(1)
    return l, 'FAIL ' + err, None, None


lines = json.load(open(os.path.join(REPO, 'scripts', 'tts_sidejobs.json'), encoding='utf-8'))
if len(sys.argv) > 1:
    lines = lines[:int(sys.argv[1])]
man_path = f'{OUT}/manifest.json'
man = json.load(open(man_path, encoding='utf-8')) if os.path.exists(man_path) else {}
log = load_log(OUT)
u0 = usage()
res = []
with ThreadPoolExecutor(4) as ex:
    for l, st, dur, style in ex.map(job, lines):
        print(st, l['file'], f'{dur:.2f}s' if dur else '')
        res.append((l, st, dur, style))
u1 = usage()
print(f'spent ${u1 - u0:.4f}')
for l, st, dur, style in res:
    if dur:
        man[f"{l['speaker']}|{l['text']}"] = {'src': l['file'], 'dur': round(dur, 2)}
    if style is not None:
        log[f"{l['speaker']}|{l['text']}"] = logged(l, l['file'], style, post(l))
json.dump(man, open(man_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
save_log(OUT, log)
for l, st, d, _ in res:
    if not d:
        print('missing:', l['file'])
