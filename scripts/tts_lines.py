# Voices the jobs in scripts/tts_lines.json (from tts_lines_list.mjs) with
# Gemini 3.8 Flash-Lite TTS (gemini_tts.py) into game/audio/voicelines/<out> +
# its manifest.json (out: lines, story, sms, hints), with what each clip was
# made from in that folder's tts.json. Needs ffmpeg. Clips that are current
# (logged with an accepted model, see gemini_tts.ACCEPTED) are skipped; clips are
# loudness-matched to the story lines (-18 LUFS). Stops once the run's spend
# nears the budget, metered by gemini_tts.usage() (#462).
# Flash is never used again (ADR 0018); --provider openrouter still exists.
#   python3 scripts/tts_lines.py [max_jobs] [--budget 2.5]
#   python3 scripts/tts_lines.py 12 --out proef        (a listen, no manifest of the game)
import json, os, sys, subprocess, urllib.error, wave, time
from concurrent.futures import ThreadPoolExecutor
import gemini_tts
from gemini_tts import usage, speak, tries, check, current, load_log, save_log, logged, say_of, configure, LANG
REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
VL = os.path.join(REPO, 'game', 'audio', 'voicelines')
TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=stop_periods=-1:stop_duration=0.28:stop_threshold=-45dB,adelay=40,apad=pad_dur=0.12'
LUFS, TP = -18, -1.5
BATCH = 24
# logged with every clip; the second loudnorm pass uses the first pass's measurements
POST = f'ffmpeg -af {TRIM},loudnorm=I={LUFS}:TP={TP}:LRA=11:linear=true (two-pass),asetnsamples=n=1152 -ac 1 -ar 24000 -b:a 48k mp3'

args = [a for a in sys.argv[1:]]
budget, OUT_DIR, JOBS = 2.5, None, os.path.join(REPO, 'scripts', 'tts_lines.json')
for flag in ['--budget', '--provider', '--model', '--rpm', '--out', '--jobs']:
    if flag in args:
        i = args.index(flag)
        if i + 1 >= len(args): raise SystemExit(f'{flag} needs a value')
        value = args[i + 1]; del args[i:i + 2]
        if flag == '--budget': budget = float(value)
        elif flag == '--provider': configure(provider=value)
        elif flag == '--model': configure(model=value)
        elif flag == '--rpm': configure(rpm=float(value))
        elif flag == '--out': OUT_DIR = value  # a scratch folder for a listen (a proef, not a manifest)
        else: JOBS = os.path.join(REPO, value)


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
    dst = f"{VL}/{l['out']}/{l['file']}"
    if current(logs[l['out']], l['key'], dst, l.get('lang', LANG)):
        return l, 'skip', probe(dst), None
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    say = say_of(l)

    def take(style):
        wav = dst[:-4] + '.tmp.wav'
        pcm = speak(l['voice'], say, style)
        check(pcm, say)
        with wave.open(wav, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
        encode(wav, dst)
        os.remove(wav)

    err = None
    for attempt, style in enumerate(tries(l)):
        try:
            take(style)
            return l, 'ok' if attempt == 0 else 'ok-fallback', probe(dst), style
        except urllib.error.HTTPError as e:
            err = f'HTTP {e.code} {e.read()[:160]!r}'
            # a rate limit is not a reason to change the style: wait and ask again
            for wait in ([10, 20, 30] if e.code == 429 else []):
                time.sleep(wait)
                try:
                    take(style)
                    return l, 'ok-retry', probe(dst), style
                except Exception as again:
                    err = repr(again)[:160]
        except Exception as e:
            err = repr(e)[:160]
        time.sleep(1)
    return l, 'FAIL ' + err, None, None


lines = json.load(open(JOBS, encoding='utf-8'))
if OUT_DIR:
    # a proef writes its clips to a scratch folder: no manifest of the game is touched
    for l in lines: l['out'] = OUT_DIR
if args:
    lines = lines[:int(args[0])]
mans, logs, ordered = {}, {}, set()
for out in sorted({l['out'] for l in lines}):
    p = f'{VL}/{out}/manifest.json'
    os.makedirs(os.path.dirname(p), exist_ok=True)
    mans[out] = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
    logs[out] = load_log(os.path.dirname(p))
    # story/ keeps its hand-made mission order; the generated ones stay sorted
    if list(mans[out]) == sorted(mans[out]):
        ordered.add(out)
u0 = usage()
print(f'{len(lines)} jobs via {gemini_tts.PROVIDER} ({gemini_tts.CURRENT}), budget ${budget:.2f}' + (f', out {OUT_DIR}' if OUT_DIR else ''))
failed = []
with ThreadPoolExecutor(4) as ex:
    for b in range(0, len(lines), BATCH):
        spent = usage() - u0
        if spent > budget:
            print(f'budget reached (${spent:.4f}), stopping with {len(lines) - b} jobs left')
            break
        for l, st, dur, style in ex.map(job, lines[b:b + BATCH]):
            print(st, l['file'], f'{dur:.2f}s' if dur else '')
            if dur:
                mans[l['out']][l['key']] = {'src': l['file'], 'dur': round(dur, 2)}
                if style is not None:
                    logs[l['out']][l['key']] = logged(l, l['file'], style, POST)
            else:
                failed.append(l['file'])
        for out, man in mans.items():
            json.dump(dict(sorted(man.items())) if out in ordered else man, open(f'{VL}/{out}/manifest.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
            save_log(f'{VL}/{out}', logs[out])
time.sleep(3)
print(f'spent ${usage() - u0:.4f} via {gemini_tts.PROVIDER}')
for f in failed:
    print('missing:', f)
