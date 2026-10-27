# Voices the fixed-path clips in scripts/tts_barks.json (tts_barks_lines.mjs:
# barks, street phrases, police, news feed, jingles) with Gemini 3.8 Flash TTS
# (gemini_tts.py) into game/audio/<folder>/ as 24 kHz mono WAV, trimmed and
# loudness-matched to the other lines (-18 LUFS), with how each was made in
# that folder's tts.json. audio.js has the paths hard-coded, so there is no
# manifest; clips logged with gemini_tts.MODEL are skipped.
#   node scripts/tts_barks_lines.mjs && python3 scripts/tts_barks.py
import json, os, subprocess, urllib.error, wave, time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from gemini_tts import usage, speak, tries, check, current, load_log, save_log, logged, say_of
REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
AUDIO = os.path.join(REPO, 'game', 'audio')
TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,adelay=40,apad=pad_dur=0.12'
LOUD = 'I=-18:TP=-1.5:LRA=11'
# logged with every clip; the second loudnorm pass uses the first pass's measurements
POST = f'ffmpeg -af {TRIM},loudnorm={LOUD}:linear=true (two-pass) -ac 1 -ar 24000 -c:a pcm_s16le wav'


def encode(src, dst):
    trimmed = src[:-4] + '.trim.wav'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-af', TRIM, trimmed], check=True)
    probe = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', trimmed, '-af', f'loudnorm={LOUD}:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(probe[probe.rindex('{'):probe.rindex('}') + 1])
    af = (f"loudnorm={LOUD}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', trimmed, '-af', af, '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', dst], check=True)
    os.remove(trimmed)


def job(l):
    dst = f"{AUDIO}/{l['file']}"
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if current(logs[os.path.dirname(l['file'])], f"{l['speaker']}|{l['text']}", dst):
        return l, 'skip', None
    err = None
    for attempt, style in enumerate(tries(l)):
        try:
            say = say_of(l)
            pcm = speak(l['voice'], say, style)
            check(pcm, say)
            raw = dst[:-4] + '.tmp.wav'
            with wave.open(raw, 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
            encode(raw, dst)
            os.remove(raw)
            return l, 'ok' if attempt == 0 else 'ok-fallback', style
        except urllib.error.HTTPError as e:
            err = f'HTTP {e.code} {e.read()[:160]!r}'
        except Exception as e:
            err = repr(e)[:160]
        time.sleep(1)
    return l, 'FAIL ' + err, None


barks = json.load(open(os.path.join(REPO, 'scripts', 'tts_barks.json'), encoding='utf-8'))
logs = defaultdict(dict, {d: load_log(f'{AUDIO}/{d}') for d in {os.path.dirname(l['file']) for l in barks}})
u0 = usage()
with ThreadPoolExecutor(4) as ex:
    for l, st, style in ex.map(job, barks):
        if st != 'skip':
            print(st, l['file'], l['text'])
        if style is not None:
            logs[os.path.dirname(l['file'])][f"{l['speaker']}|{l['text']}"] = logged(l, os.path.basename(l['file']), style, POST)
for d, log in logs.items():
    save_log(f'{AUDIO}/{d}', log)
time.sleep(3)
print(f'spent ${usage() - u0:.4f}')
