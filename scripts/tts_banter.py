# Voices Tammo and Tessa's car banter (game/js/banterlines.js) with Gemini 3.8
# Flash TTS (gemini_tts.py) into game/audio/voicelines/banter + manifest.json
# (what each clip was made from in tts.json),
# in the same voices as their bijbaantje lines, loudness-normalised (two-pass
# loudnorm to -16 LUFS, like the story clips). Needs ffmpeg. Current clips
# (logged with gemini_tts.MODEL) are skipped, so a rerun only records new,
# edited or outdated lines; the spend is measured on the OpenRouter credits
# endpoint before and after, and a run stops starting new lines once it
# passes the budget.
#   node scripts/tts_banter_lines.mjs && python3 scripts/tts_banter.py [max_lines] [budget_usd]
import json, os, sys, subprocess, urllib.error, wave, time, threading
from concurrent.futures import ThreadPoolExecutor
from gemini_tts import usage, speak, tries, check, current, load_log, save_log, logged, say_of
REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(REPO, 'game', 'audio', 'voicelines', 'banter')
TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=stop_periods=-1:stop_duration=0.28:stop_threshold=-45dB,adelay=40,apad=pad_dur=0.12'
LOUD = 'I=-16:TP=-1.5:LRA=11'
# logged with every clip; the second loudnorm pass uses the first pass's measurements
POST = f'ffmpeg -af {TRIM},loudnorm={LOUD}:linear=true (two-pass),aresample=24000,asetnsamples=n=1152 -ac 1 -ar 24000 -b:a 48k mp3'


def duration(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout)


def normalise(src, dst):
    trimmed = src[:-4] + '.trim.wav'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-af', TRIM, trimmed], check=True)
    probe = subprocess.run(['ffmpeg', '-hide_banner', '-i', trimmed, '-af', f'loudnorm={LOUD}:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(probe[probe.rindex('{'):probe.rindex('}') + 1])
    af = (f"loudnorm={LOUD}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=24000,asetnsamples=n=1152:p=0")
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', trimmed, '-af', af, '-ac', '1', '-ar', '24000', '-b:a', '48k', dst], check=True)
    os.remove(trimmed)


stop = threading.Event()


def job(l):
    dst = f"{OUT}/{l['file']}"
    if current(log, f"{l['speaker']}|{l['text']}", dst):
        return l, 'skip', duration(dst), None
    if stop.is_set():
        return l, 'SKIPPED (budget)', None, None
    err = None
    for attempt, style in enumerate(tries(l)):
        try:
            wav = dst[:-4] + '.tmp.wav'
            say = say_of(l)
            pcm = speak(l['voice'], say, style)
            check(pcm, say, 1.4)
            with wave.open(wav, 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
            normalise(wav, dst)
            os.remove(wav)
            return l, 'ok' if attempt == 0 else 'ok-fallback', duration(dst), style
        except urllib.error.HTTPError as e:
            err = f'HTTP {e.code} {e.read()[:160]!r}'
        except Exception as e:
            err = repr(e)[:160]
        time.sleep(1)
    return l, 'FAIL ' + err, None, None


os.makedirs(OUT, exist_ok=True)
lines = json.load(open(os.path.join(REPO, 'scripts', 'tts_banter.json'), encoding='utf-8'))
if len(sys.argv) > 1 and int(sys.argv[1]) > 0:
    lines = lines[:int(sys.argv[1])]
budget = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
man_path = f'{OUT}/manifest.json'
man = json.load(open(man_path, encoding='utf-8')) if os.path.exists(man_path) else {}
log = load_log(OUT)
u0 = usage()
res = []
todo = sum(1 for l in lines if not current(log, f"{l['speaker']}|{l['text']}", f"{OUT}/{l['file']}"))
print(f'{len(lines)} lines, {todo} to record, budget ${budget:.2f}')
done = 0
with ThreadPoolExecutor(4) as ex:
    for l, st, dur, style in ex.map(job, lines):
        if st != 'skip':
            print(st, l['file'], f'{dur:.2f}s' if dur else '')
            done += 1
            if done % 25 == 0:
                spent = usage() - u0
                print(f'  ... spent ${spent:.4f} so far')
                if spent > budget * 0.95:
                    stop.set()
        res.append((l, st, dur, style))
u1 = usage()
print(f'spent ${u1 - u0:.4f}')
for l, st, dur, style in res:
    if dur:
        man[f"{l['speaker']}|{l['text']}"] = {'src': l['file'], 'dur': round(dur, 2)}
    if style is not None:
        log[f"{l['speaker']}|{l['text']}"] = logged(l, l['file'], style, POST)
# a full run drops recordings of lines that were edited or removed
if not (len(sys.argv) > 1 and int(sys.argv[1]) > 0):
    keep = {l['file'] for l in lines}
    keys = {f"{l['speaker']}|{l['text']}" for l in lines}
    man = {k: v for k, v in man.items() if k in keys and v['src'] in keep}
    log = {k: v for k, v in log.items() if k in man}
    for f in os.listdir(OUT):
        if f.endswith('.mp3') and f not in keep:
            os.remove(os.path.join(OUT, f))
            print('pruned', f)
json.dump(man, open(man_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
save_log(OUT, log)
for l, st, d, _ in res:
    if not d:
        print('missing:', l['file'])
