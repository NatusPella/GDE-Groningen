# Voices the jobs in scripts/tts_lines.json (from tts_lines_list.mjs) with
# Gemini 3.1 Flash TTS via OpenRouter into game/audio/voicelines/lines +
# manifest.json. Needs ffmpeg and OPENROUTER_API_KEY in .env (never printed).
# Existing clips are skipped; clips are loudness-matched to the story lines
# (-18 LUFS). Stops once the run's spend (OpenRouter credits endpoint) nears
# the budget.   python3 scripts/tts_lines.py [max_jobs] [--budget 2.5]
import json, os, sys, subprocess, urllib.request, urllib.error, wave, time
from concurrent.futures import ThreadPoolExecutor
REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(REPO, 'game', 'audio', 'voicelines', 'lines')
ENV = next((p for p in [os.path.join(REPO, '.env'), os.path.join(REPO, '..', '..', '..', '.env')] if os.path.exists(p)), None)
KEY = [l.split('=', 1)[1].strip().strip('"\'') for l in open(ENV) if l.startswith('OPENROUTER_API_KEY=')][0]
ENDPOINT = 'https://openrouter.ai/api/v1/audio/speech'
MODEL = 'google/gemini-3.1-flash-tts-preview:floor'
TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=stop_periods=-1:stop_duration=0.28:stop_threshold=-45dB,adelay=40,apad=pad_dur=0.12'
LUFS, TP = -18, -1.5
BATCH = 24

args = [a for a in sys.argv[1:]]
budget = 2.5
if '--budget' in args:
    i = args.index('--budget'); budget = float(args[i + 1]); del args[i:i + 2]


def usage():
    req = urllib.request.Request('https://openrouter.ai/api/v1/credits', headers={'Authorization': f'Bearer {KEY}'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())['data']['total_usage']


def tts(voice, text):
    body = json.dumps({'model': MODEL, 'input': text, 'voice': voice, 'response_format': 'pcm'}).encode()
    req = urllib.request.Request(ENDPOINT, data=body, headers={'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def probe(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout)


def encode(wav, dst):
    trimmed = wav[:-4] + '.trim.wav'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-af', TRIM, trimmed], check=True)
    # two-pass loudnorm, linear gain so short barks are not pumped
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', trimmed, '-af', f'loudnorm=I={LUFS}:TP={TP}:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    ln = f"loudnorm=I={LUFS}:TP={TP}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', trimmed, '-af', ln + ',asetnsamples=n=1152:p=0', '-ac', '1', '-ar', '24000', '-b:a', '48k', dst], check=True)
    os.remove(trimmed)


def job(l):
    dst = f"{OUT}/{l['file']}"
    if os.path.exists(dst):
        return l, 'skip', probe(dst)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    # the provider sometimes refuses or returns nothing; a plainer prompt usually passes
    tries = [l['prompt'], f"[{l['tag']}, spoken in Dutch] {l['text']}", f"[{l['who']}, in Dutch] {l['text']}"]
    err = None
    for attempt, inp in enumerate(tries):
        try:
            wav = dst[:-4] + '.tmp.wav'
            pcm = tts(l['voice'], inp)
            if len(pcm) < 12000:
                raise ValueError(f'short audio {len(pcm)}')
            secs = len(pcm) / 48000
            # a read-aloud tag makes the clip far longer than the words need
            if secs > 1.6 + len(l['text']) / 8:
                raise ValueError(f'too long {secs:.1f}s')
            with wave.open(wav, 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
            encode(wav, dst)
            os.remove(wav)
            return l, 'ok' if attempt == 0 else 'ok-fallback', probe(dst)
        except urllib.error.HTTPError as e:
            err = f'HTTP {e.code} {e.read()[:160]!r}'
        except Exception as e:
            err = repr(e)[:160]
        time.sleep(1)
    return l, 'FAIL ' + err, None


lines = json.load(open(os.path.join(REPO, 'scripts', 'tts_lines.json')))
if args:
    lines = lines[:int(args[0])]
man_path = f'{OUT}/manifest.json'
os.makedirs(OUT, exist_ok=True)
man = json.load(open(man_path)) if os.path.exists(man_path) else {}
u0 = usage()
failed = []
with ThreadPoolExecutor(4) as ex:
    for b in range(0, len(lines), BATCH):
        spent = usage() - u0
        if spent > budget:
            print(f'budget reached (${spent:.4f}), stopping with {len(lines) - b} jobs left')
            break
        for l, st, dur in ex.map(job, lines[b:b + BATCH]):
            print(st, l['file'], f'{dur:.2f}s' if dur else '')
            if dur:
                man[l['key']] = {'src': l['file'], 'dur': round(dur, 2)}
            else:
                failed.append(l['file'])
        json.dump(dict(sorted(man.items())), open(man_path, 'w'), ensure_ascii=False, indent=0)
time.sleep(3)
print(f'spent ${usage() - u0:.4f}')
for f in failed:
    print('missing:', f)
