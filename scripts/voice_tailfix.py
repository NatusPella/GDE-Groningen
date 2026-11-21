# Nabewerking van spraakclips: haalt de plof aan het begin en de ruisstoot aan het einde weg die de TTS (en de
# opnameketen) in de clips laat staan, haalt de DC-offset weg en geeft de clip een korte fade-in en fade-out (#735).
#
# Waargenomen patroon (21-11, op ruim 20 clips van de eigenaar en op nieuwe clips): [een korte plof van ca. 50 ms]
# [ca. 0,25 s stilte] [spraak] [ca. 0,25 s stilte] [een ruisstoot van ca. 0,2 s, 6 tot 10 dB luider dan de spraak]
# [stilte]. De stoot na de laatste stilte is geen spraak: hij hoort niet bij de tekst. De loudnorm-stap mat hem mee,
# dus de spraak lag ook nog te zacht.
#
#   python scripts/voice_tailfix.py --scan game/audio/voicelines/lines     toont welke clips het patroon hebben
#   python scripts/voice_tailfix.py --fix <clip> [<clip> ...]              herstelt de clips ter plekke (mp3 of wav)
#                                                                          en werkt de dur in de manifest bij
# tts_lines.py roept fix_pcm() aan op de ruwe opname, vóór trimmen en loudnorm, zodat nieuwe clips schoon zijn.
import array, json, math, os, subprocess, sys

SR = 24000
FR = SR // 50            # 20 ms
VOICED = -42.0           # dBFS: onder dit niveau is een frame stil (de ruisvloer van sommige clips ligt rond -47)
GAP = 0.12               # s stilte tussen de spraak en een afgesplitste stoot of plof
HEAD_MAX, TAIL_MAX = 0.12, 0.40
TAIL_LOUDER = 3.0        # dB: de eindstoot is zo veel luider dan de spraak ervoor
FADE_IN, FADE_OUT = 0.008, 0.030
LUFS, TP = -18, -1.5


def frame_db(a):
    out = []
    for i in range(0, len(a) - FR + 1, FR):
        e = sum(x * x for x in a[i:i + FR]) / FR
        out.append(10 * math.log10(e / 32768 ** 2) if e > 0 else -99.0)
    return out


def segments(db):
    """Runs of voiced frames; silences shorter than 3 frames (60 ms) do not split a run."""
    segs, i, n = [], 0, len(db)
    while i < n:
        if db[i] > VOICED:
            j = i
            quiet = 0
            k = i
            while k < n and quiet < 3:
                quiet = quiet + 1 if db[k] <= VOICED else 0
                if db[k] > VOICED:
                    j = k
                k += 1
            segs.append((i, j + 1))
            i = j + 1
        else:
            i += 1
    return segs


def seg_db(db, s):
    e = [10 ** (x / 10) for x in db[s[0]:s[1]]]
    return 10 * math.log10(sum(e) / len(e))


def detect(a):
    """(cut_start_sample, cut_end_sample, reasons) for the speech part of a clip, or the full clip when it is clean."""
    db = frame_db(a)
    segs = segments(db)
    start, end, why = 0, len(a), []
    if len(segs) >= 3:
        # the plof: a very short first run followed by a clear gap
        f = segs[0]
        if (f[1] - f[0]) * 0.02 <= HEAD_MAX and (segs[1][0] - f[1]) * 0.02 >= GAP:
            start = max(0, (segs[1][0] - 2) * FR)
            why.append('plof')
            segs = segs[1:]
        # the noise burst: a short last run after a clear gap, clearly louder than the speech before it
        l, p = segs[-1], segs[-2]
        speech = [seg_db(db, s) for s in segs[:-1]]
        med = sorted(speech)[len(speech) // 2]
        if (l[1] - l[0]) * 0.02 <= TAIL_MAX and (l[0] - p[1]) * 0.02 >= GAP and seg_db(db, l) >= med + TAIL_LOUDER:
            end = min(len(a), (p[1] + 5) * FR)
            why.append('ruis')
    return start, end, why


def fix_pcm(a):
    """Cleans a raw take (array of int16): cuts the plof and the burst, removes DC, fades. Returns (array, reasons)."""
    start, end, why = detect(a)
    b = a[start:end]
    if len(b) == 0:
        return a, []
    dc = sum(b) / len(b)
    f = array.array('h', (max(-32768, min(32767, int(x - dc))) for x in b))
    fi, fo = int(SR * FADE_IN), int(SR * FADE_OUT)
    for i in range(min(fi, len(f))):
        f[i] = int(f[i] * i / fi)
    for i in range(min(fo, len(f))):
        f[len(f) - 1 - i] = int(f[len(f) - 1 - i] * i / fo)
    return f, why


def decode(path):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    a = array.array('h')
    a.frombytes(r[:len(r) // 2 * 2])
    return a


def probe(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout)


def encode_like(pcm, dst):
    """Writes the cleaned samples in the format of dst: mp3 as tts_lines.py (loudnorm -18, 48 kbit/s mono) or wav 16 bit."""
    raw = dst + '.fix.raw'
    open(raw, 'wb').write(pcm.tobytes())
    pad = 'adelay=40,apad=pad_dur=0.12'
    src = ['-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', raw]
    if dst.endswith('.mp3'):
        m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', *src, '-af', f'{pad},loudnorm=I={LUFS}:TP={TP}:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
        m = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
        ln = f"loudnorm=I={LUFS}:TP={TP}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *src, '-af', f'{pad},{ln},asetnsamples=n=1152:p=0', '-ac', '1', '-ar', str(SR), '-b:a', '48k', dst + '.new.mp3'], check=True)
        os.replace(dst + '.new.mp3', dst)
    else:
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *src, '-af', pad, '-c:a', 'pcm_s16le', dst + '.new.wav'], check=True)
        os.replace(dst + '.new.wav', dst)
    os.remove(raw)


def update_manifest(path, dur):
    """Sets dur for the manifest entry whose src is this file (voicelines/<bank>/<src>)."""
    p = os.path.abspath(path).replace('\\', '/')
    if '/voicelines/' not in p:
        return False
    rel = p.split('/voicelines/')[1]
    bank, src = rel.split('/', 1)
    mp = p.split('/voicelines/')[0] + f'/voicelines/{bank}/manifest.json'
    if not os.path.exists(mp):
        return False
    raw = open(mp, encoding='utf-8').read()
    m = json.loads(raw)
    hit = False
    for k, v in m.items():
        if isinstance(v, dict) and v.get('src') == src:
            v['dur'] = round(dur, 2)
            hit = True
    if hit:
        json.dump(m, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    return hit


def fix_file(path, force=False):
    a = decode(path)
    start, end, why = detect(a)
    if not why and not force:
        return None
    f, _ = fix_pcm(a)
    encode_like(f, path)
    d = probe(path)
    update_manifest(path, d)
    return why, d


def scan(root):
    n = bad = 0
    for r, _, fs in os.walk(root):
        for f in sorted(fs):
            if f.endswith(('.mp3', '.wav')):
                n += 1
                _, _, why = detect(decode(os.path.join(r, f)))
                if why:
                    bad += 1
                    print(','.join(why), os.path.join(r, f).replace('\\', '/'))
    print(f'{bad} van {n} clips met het patroon', file=sys.stderr)


if __name__ == '__main__':
    args = sys.argv[1:]
    if args[:1] == ['--scan']:
        for d in args[1:]:
            scan(d)
    elif args[:1] == ['--fix']:
        for p in args[1:]:
            print(p, fix_file(p, force='--force' in args))
