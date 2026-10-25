# Shared Gemini 3.8 TTS call for the tts_*.py voice scripts, on two transports:
#  - 'google' (default): the Gemini API straight from Google AI Studio, billed per audio second and
#    metered here (`usage()`), so a run stops at its --budget without asking anyone;
#  - 'openrouter': shared capacity, paid from the OpenRouter balance (kept for the old route).
# New clips are recorded with gemini-3.8-flash-lite-tts: the owner decided on 25-10 that lite is good
# enough and that Flash is not used any more (ADR 0018, #462). Clips of the Flash era stay accepted,
# so nothing is re-recorded by accident.
# 3.8 reads `input` verbatim, so the delivery (character, emotion, accent) goes in
# speech_metadata.style; it is not billed. Inline vocal tags like <sigh> or <short pause> may stay in
# the text. Needs GOOGLE_AI_STUDIO_KEY (or GEMINI_API_KEY) in .env, or OPENROUTER_API_KEY for the
# openrouter transport; never printed.
#
# What is spoken is Gronings: scripts/gronings_spoken.json maps each line as the
# game shows it (the key text) to its spoken Gronings spelling; the subtitles
# stay as they are. A job with lang 'own' (Frisian characters, foreign
# tourists) is spoken as written.
#
# Every voicelines folder keeps a tts.json next to its manifest.json, keyed
# the same ("<speaker>|<text>", the text as shown): exactly how each clip was
# made - file, model, voice, the input sent, the style, the post-processing
# and the date. The game never loads it.
import base64, datetime, json, os, threading, time, urllib.request

REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# GDE_ENV points at a .env outside this checkout (an agent works in a worktree, the key lives in the
# main clone); the file is read, never printed.
ENV = os.environ.get('GDE_ENV') or next((p for p in [os.path.join(REPO, '.env'), os.path.join(REPO, '..', '..', '..', '.env')] if os.path.exists(p)), None)
ENDPOINT = 'https://openrouter.ai/api/v1/audio/speech'
GOOGLE_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'
PROVIDERS = ('openrouter', 'google')
# new clips are recorded with the lite model, straight from AI Studio: the owner decided on 25-10
# that lite is good enough and that Flash is not used any more (ADR 0018, #462)
PROVIDER = 'google'
MODEL = 'google/gemini-3.8-flash-lite-tts'
GOOGLE_MODEL = 'gemini-3.8-flash-lite-tts'
# the models a recording may have been made with: a clip with one of these is never re-recorded, so
# the 3011 clips of the Flash era stay as they are
ACCEPTED = (MODEL, 'google/gemini-3.8-flash-tts', 'gemini-3.8-flash-tts', GOOGLE_MODEL)
# never record with these again; the owner said so on 25-10 (ADR 0018)
FLASH = ('google/gemini-3.8-flash-tts', 'gemini-3.8-flash-tts')
# gemini-3.8 tts: 25 audio tokens per second; output price per 1M tokens through 31-12-2026
# (ai.google.dev/gemini-api/docs/pricing). Input text is a rounding error next to the audio.
AUDIO_TPS, PRICE = 25, {'gemini-3.8-flash-tts': 9.0, 'gemini-3.8-flash-lite-tts': 6.0}
CURRENT = GOOGLE_MODEL
# same as tts_cast.mjs TTS_LANG; a clip logged with another lang is re-recorded
LANG = 'gro'
# AI Studio allows 10 requests per minute for this model on Tier 1 (a 454-line run otherwise spends
# its time on 429s); 0 turns the throttle off. Over OpenRouter there is no such limit.
RPM = 10
_RATE_LOCK, _LAST_CALL = threading.Lock(), [0.0]
_SPENT = 0.0  # dollars spent in this run; only the google transport can meter itself
_KEYS = {}
_SPOKEN = None


def configure(provider=None, model=None, rpm=None):
    """Picks the transport, the model and the request rate for new clips (one run, one model)."""
    global PROVIDER, CURRENT, RPM
    if provider:
        if provider not in PROVIDERS:
            raise SystemExit(f'unknown provider {provider!r}; use one of {", ".join(PROVIDERS)}')
        PROVIDER = provider
    CURRENT = model or (GOOGLE_MODEL if PROVIDER == 'google' else MODEL)
    if CURRENT in FLASH:
        raise SystemExit(f'{CURRENT} is Flash: de eigenaar wil sinds 25-10 geen Flash meer (ADR 0018, #462). '
                         f'Gebruik {GOOGLE_MODEL}, of vraag het eerst opnieuw.')
    if CURRENT not in ACCEPTED:
        raise SystemExit(f'model {CURRENT!r} is not in ACCEPTED: add it to gemini_tts.ACCEPTED and tts_cast.mjs first')
    if PROVIDER == 'google' and CURRENT not in PRICE:
        raise SystemExit(f'{CURRENT!r} is an OpenRouter id; the google transport wants gemini-3.8-flash-tts or gemini-3.8-flash-lite-tts')
    if rpm is not None:
        RPM = rpm


def throttle():
    """Spaces the google requests so the per-minute limit is not hit by four threads at once."""
    if not RPM:
        return
    with _RATE_LOCK:
        wait = _LAST_CALL[0] + 60.0 / RPM - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        _LAST_CALL[0] = time.monotonic()


def api_key():
    """The API key of the active transport, read from .env without ever printing it."""
    if PROVIDER not in _KEYS:
        names = ('GOOGLE_AI_STUDIO_KEY', 'GEMINI_API_KEY') if PROVIDER == 'google' else ('OPENROUTER_API_KEY',)
        if not ENV:
            raise SystemExit(f'no .env found for {" or ".join(names)} (set GDE_ENV to point at one)')
        lines = open(ENV, encoding='utf-8').read().splitlines()
        found = [l.split('=', 1)[1].strip().strip('"\'') for name in names for l in lines if l.startswith(name + '=')]
        if not found:
            raise SystemExit(f'{" or ".join(names)} is not in .env')
        _KEYS[PROVIDER] = found[0]
    return _KEYS[PROVIDER]


def say_of(l):
    """The text a job is voiced with: its Gronings spoken version, or as written for lang 'own'."""
    global _SPOKEN
    t = l.get('say', l['text'])
    if l.get('lang', LANG) == 'own':
        return t
    if _SPOKEN is None:
        _SPOKEN = json.load(open(os.path.join(REPO, 'scripts', 'gronings_spoken.json'), encoding='utf-8'))
    if t not in _SPOKEN:
        raise KeyError('no Gronings spoken text in scripts/gronings_spoken.json for: ' + t)
    return _SPOKEN[t]


def usage():
    """Dollars spent so far: the credits endpoint on OpenRouter, our own meter on google."""
    if PROVIDER == 'google':
        return _SPENT
    req = urllib.request.Request('https://openrouter.ai/api/v1/credits', headers={'Authorization': f'Bearer {api_key()}'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())['data']['total_usage']


def speak(voice, text, style):
    """24 kHz mono 16-bit PCM."""
    if PROVIDER == 'google':
        return _speak_google(voice, text, style)
    body = {'model': CURRENT if '/' in CURRENT else 'google/' + CURRENT, 'input': text, 'voice': voice, 'response_format': 'pcm'}
    if style:
        body['provider'] = {'options': {'google-ai-studio': {'speech_metadata': {'style': style}}}}
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(), headers={'Authorization': f'Bearer {api_key()}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def _speak_google(voice, text, style):
    part = {'type': 'text', 'text': text}
    if style:
        part['annotations'] = [{'type': 'speech_metadata', 'style': style}]
    body = {
        'model': CURRENT,
        'input': [{'type': 'user_input', 'content': [part]}],
        # raw PCM, so the wave wrapper and the length check below stay as they are: a unary 3.8 call
        # returns WAV (RIFF) by default
        'response_format': {'type': 'audio', 'mime_type': 'audio/l16', 'sample_rate': 24000},
        'generation_config': {'speech_config': [{'voice': voice}]},
    }
    req = urllib.request.Request(GOOGLE_ENDPOINT, data=json.dumps(body).encode(), headers={'x-goog-api-key': api_key(), 'Content-Type': 'application/json'})
    throttle()
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.loads(r.read())
    pcm = pcm_of(data)
    global _SPENT
    _SPENT += len(pcm) / 2 / 24000 * AUDIO_TPS / 1e6 * PRICE[CURRENT]
    return pcm


def pcm_of(data):
    """The audio bytes of an Interactions response (steps[].content[].data), as raw PCM."""
    for step in reversed(data.get('steps') or []):
        for c in step.get('content') or []:
            if c.get('type') == 'audio' and c.get('data'):
                return to_pcm(base64.b64decode(c['data']))
    for cand in data.get('candidates') or []:  # a generateContent-shaped answer
        for part in (cand.get('content') or {}).get('parts') or []:
            d = (part.get('inlineData') or part.get('inline_data') or {}).get('data')
            if d:
                return to_pcm(base64.b64decode(d))
    raise ValueError('no audio in the response: ' + str(sorted(data))[:160])


def to_pcm(raw):
    """A RIFF header would end up inside our own wave file."""
    if raw[:4] == b'RIFF':
        i = raw.find(b'data', 12)
        return raw[i + 8:] if i > 0 else raw[44:]
    return raw


def tries(l):
    # the provider sometimes refuses or returns nothing; a plainer style usually passes
    return [l['style'], l.get('tag', '')]


def check(pcm, text, slack=1.6):
    # a clip far longer than its words is a hallucinated or padded take
    if len(pcm) < 12000:
        raise ValueError(f'short audio {len(pcm)}')
    secs = len(pcm) / 48000
    if secs > slack + len(text) / 7:
        raise ValueError(f'too long {secs:.1f}s')
    return secs


def load_log(folder):
    p = os.path.join(folder, 'tts.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}


def save_log(folder, log):
    json.dump(dict(sorted(log.items())), open(os.path.join(folder, 'tts.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)


def logged(l, src, style, post):
    return {'src': src, 'model': CURRENT, 'via': PROVIDER, 'lang': l.get('lang', LANG), 'voice': l['voice'], 'input': say_of(l), 'style': style, 'post': post, 'date': datetime.date.today().isoformat()}


def current(log, key, dst, lang=LANG):
    # recorded with an accepted model and this language; an older or unlogged clip is re-recorded
    e = log.get(key, {})
    return os.path.exists(dst) and e.get('model') in ACCEPTED and e.get('lang') == lang
