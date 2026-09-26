# Voices the bijbaantje lines with Gemini 3.1 Flash TTS (via OpenRouter) into
# game/audio/voicelines/jobs + manifest.json. Needs ffmpeg and the
# OPENROUTER_API_KEY in .env (never printed). Existing clips are skipped, so a
# rerun only fills gaps; the spend of the run is printed at the end.
#   node scripts/tts_sidejobs_lines.mjs && python3 scripts/tts_sidejobs.py [max_lines]
import json, os, sys, subprocess, urllib.request, urllib.error, wave, time
from concurrent.futures import ThreadPoolExecutor
REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(REPO, 'game', 'audio', 'voicelines', 'jobs')
ENV = next((p for p in [os.path.join(REPO, '.env'), os.path.join(REPO, '..', '..', '..', '.env')] if os.path.exists(p)), None)
KEY = [l.split('=', 1)[1].strip().strip('"\'') for l in open(ENV) if l.startswith('OPENROUTER_API_KEY=')][0]
ENDPOINT = 'https://openrouter.ai/api/v1/audio/speech'
MODEL = 'google/gemini-3.1-flash-tts-preview:floor'
TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=stop_periods=-1:stop_duration=0.28:stop_threshold=-45dB,adelay=40,apad=pad_dur=0.12,asetnsamples=n=1152:p=0'
RADIO = 'highpass=f=320,lowpass=f=3400,acompressor=threshold=-18dB:ratio=4,volume=1.6,alimiter=limit=0.85,'


def usage():
    req = urllib.request.Request('https://openrouter.ai/api/v1/credits', headers={'Authorization': f'Bearer {KEY}'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())['data']['total_usage']


def tts(voice, text):
    body = json.dumps({'model': MODEL, 'input': text, 'voice': voice, 'response_format': 'pcm'}).encode()
    req = urllib.request.Request(ENDPOINT, data=body, headers={'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def job(l):
    dst = f"{OUT}/{l['file']}"
    if os.path.exists(dst):
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst], capture_output=True, text=True).stdout)
        return l, 'skip', dur
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    # local character tag + emotion in one bracket (tags may not touch), Dutch transcript
    tries = [f"[{l['who']}, {l['tag']}, spoken in Dutch with a Groningen accent] {l['text']}", f"[{l['tag']}] {l['text']}"]
    err = None
    for attempt, inp in enumerate(tries):
        try:
            wav = dst[:-4] + '.tmp.wav'
            pcm = tts(l['voice'], inp)
            if len(pcm) < 24000:
                raise ValueError(f'short audio {len(pcm)}')
            # a read-aloud tag makes the clip far longer than the words need
            secs = len(pcm) / 48000
            if secs > 1.2 + len(l['text']) / 8:
                raise ValueError(f'too long {secs:.1f}s')
            with wave.open(wav, 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-af', (RADIO if l.get('radio') else '') + TRIM, '-ac', '1', '-ar', '24000', '-b:a', '48k', dst], check=True)
            os.remove(wav)
            dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst], capture_output=True, text=True).stdout)
            return l, 'ok' if attempt == 0 else 'ok-fallback', dur
        except urllib.error.HTTPError as e:
            err = f'HTTP {e.code} {e.read()[:160]!r}'
        except Exception as e:
            err = repr(e)[:160]
        time.sleep(1)
    return l, 'FAIL ' + err, None


lines = json.load(open(os.path.join(REPO, 'scripts', 'tts_sidejobs.json')))
if len(sys.argv) > 1:
    lines = lines[:int(sys.argv[1])]
u0 = usage()
res = []
with ThreadPoolExecutor(4) as ex:
    for l, st, dur in ex.map(job, lines):
        print(st, l['file'], f'{dur:.2f}s' if dur else '')
        res.append((l, st, dur))
u1 = usage()
print(f'spent ${u1 - u0:.4f}')
man_path = f'{OUT}/manifest.json'
man = json.load(open(man_path)) if os.path.exists(man_path) else {}
for l, st, dur in res:
    if dur:
        man[f"{l['speaker']}|{l['text']}"] = {'src': l['file'], 'dur': round(dur, 2)}
json.dump(man, open(man_path, 'w'), ensure_ascii=False, indent=0)
for l, st, d in res:
    if not d:
        print('missing:', l['file'])
