# Voices Tammo and Anita's car banter (game/js/banterlines.js) with Gemini 3.1
# Flash TTS via OpenRouter into game/audio/voicelines/banter + manifest.json,
# in the same voices as their bijbaantje lines, loudness-normalised (two-pass
# loudnorm to -16 LUFS, like the story clips). Needs ffmpeg and the
# OPENROUTER_API_KEY in .env (never printed). Existing clips are skipped, so a
# rerun only records new or edited lines; the spend is measured on the
# OpenRouter credits endpoint before and after, and a run stops starting new
# lines once it passes the budget.
#   node scripts/tts_banter_lines.mjs && python3 scripts/tts_banter.py [max_lines] [budget_usd]
import json, os, sys, subprocess, urllib.request, urllib.error, wave, time, threading
from concurrent.futures import ThreadPoolExecutor
REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(REPO, 'game', 'audio', 'voicelines', 'banter')
ENV = next((p for p in [os.path.join(REPO, '.env'), os.path.join(REPO, '..', '..', '..', '.env')] if os.path.exists(p)), None)
KEY = [l.split('=', 1)[1].strip().strip('"\'') for l in open(ENV) if l.startswith('OPENROUTER_API_KEY=')][0]
ENDPOINT = 'https://openrouter.ai/api/v1/audio/speech'
MODEL = 'google/gemini-3.1-flash-tts-preview:floor'
TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=stop_periods=-1:stop_duration=0.28:stop_threshold=-45dB,adelay=40,apad=pad_dur=0.12'
LOUD = 'I=-16:TP=-1.5:LRA=11'


def usage():
    req = urllib.request.Request('https://openrouter.ai/api/v1/credits', headers={'Authorization': f'Bearer {KEY}'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())['data']['total_usage']


def tts(voice, text):
    body = json.dumps({'model': MODEL, 'input': text, 'voice': voice, 'response_format': 'pcm'}).encode()
    req = urllib.request.Request(ENDPOINT, data=body, headers={'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


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
    if os.path.exists(dst):
        return l, 'skip', duration(dst)
    if stop.is_set():
        return l, 'SKIPPED (budget)', None
    # local character tag + emotion in one bracket (tags may not touch), Dutch transcript
    tries = [f"[{l['who']}, {l['tag']}, spoken in Dutch with a Groningen accent] {l['text']}", f"[{l['tag']}] {l['text']}"]
    err = None
    for attempt, inp in enumerate(tries):
        try:
            wav = dst[:-4] + '.tmp.wav'
            pcm = tts(l['voice'], inp)
            if len(pcm) < 12000:
                raise ValueError(f'short audio {len(pcm)}')
            # a read-aloud tag makes the clip far longer than the words need
            secs = len(pcm) / 48000
            if secs > 1.4 + len(l['text']) / 8:
                raise ValueError(f'too long {secs:.1f}s')
            with wave.open(wav, 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
            normalise(wav, dst)
            os.remove(wav)
            return l, 'ok' if attempt == 0 else 'ok-fallback', duration(dst)
        except urllib.error.HTTPError as e:
            err = f'HTTP {e.code} {e.read()[:160]!r}'
        except Exception as e:
            err = repr(e)[:160]
        time.sleep(1)
    return l, 'FAIL ' + err, None


os.makedirs(OUT, exist_ok=True)
lines = json.load(open(os.path.join(REPO, 'scripts', 'tts_banter.json')))
if len(sys.argv) > 1 and int(sys.argv[1]) > 0:
    lines = lines[:int(sys.argv[1])]
budget = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
u0 = usage()
res = []
todo = sum(1 for l in lines if not os.path.exists(f"{OUT}/{l['file']}"))
print(f'{len(lines)} lines, {todo} to record, budget ${budget:.2f}')
done = 0
with ThreadPoolExecutor(4) as ex:
    for l, st, dur in ex.map(job, lines):
        if st != 'skip':
            print(st, l['file'], f'{dur:.2f}s' if dur else '')
            done += 1
            if done % 25 == 0:
                spent = usage() - u0
                print(f'  ... spent ${spent:.4f} so far')
                if spent > budget * 0.95:
                    stop.set()
        res.append((l, st, dur))
u1 = usage()
print(f'spent ${u1 - u0:.4f}')
man_path = f'{OUT}/manifest.json'
man = json.load(open(man_path)) if os.path.exists(man_path) else {}
for l, st, dur in res:
    if dur:
        man[f"{l['speaker']}|{l['text']}"] = {'src': l['file'], 'dur': round(dur, 2)}
# a full run drops recordings of lines that were edited or removed
if not (len(sys.argv) > 1 and int(sys.argv[1]) > 0):
    keep = {l['file'] for l in lines}
    keys = {f"{l['speaker']}|{l['text']}" for l in lines}
    man = {k: v for k, v in man.items() if k in keys and v['src'] in keep}
    for f in os.listdir(OUT):
        if f.endswith('.mp3') and f not in keep:
            os.remove(os.path.join(OUT, f))
            print('pruned', f)
json.dump(man, open(man_path, 'w'), ensure_ascii=False, indent=0)
for l, st, d in res:
    if not d:
        print('missing:', l['file'])
