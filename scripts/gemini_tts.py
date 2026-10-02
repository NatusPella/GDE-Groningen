# Shared Gemini 3.8 Flash TTS call for the tts_*.py voice scripts, via
# OpenRouter on its shared capacity (paid from the OpenRouter balance).
# 3.8 reads `input` verbatim, so the delivery (character, emotion, accent)
# goes in speech_metadata.style; it is not billed. Inline vocal tags like
# <sigh> or <short pause> may stay in the text. Needs OPENROUTER_API_KEY in
# .env (never printed).
#
# Every voicelines folder keeps a tts.json next to its manifest.json, keyed
# the same ("<speaker>|<text>", the text as shown): exactly how each clip was
# made - file, model, voice, the input sent, the style, the post-processing
# and the date. The game never loads it.
import datetime, json, os, urllib.request

REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ENV = next((p for p in [os.path.join(REPO, '.env'), os.path.join(REPO, '..', '..', '..', '.env')] if os.path.exists(p)), None)
KEY = [l.split('=', 1)[1].strip().strip('"\'') for l in open(ENV) if l.startswith('OPENROUTER_API_KEY=')][0]
ENDPOINT = 'https://openrouter.ai/api/v1/audio/speech'
# same as tts_cast.mjs TTS_MODEL; a clip logged with another model is re-recorded
MODEL = 'google/gemini-3.8-flash-tts'


def usage():
    req = urllib.request.Request('https://openrouter.ai/api/v1/credits', headers={'Authorization': f'Bearer {KEY}'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())['data']['total_usage']


def speak(voice, text, style):
    """24 kHz mono 16-bit PCM."""
    body = {'model': MODEL, 'input': text, 'voice': voice, 'response_format': 'pcm'}
    if style:
        body['provider'] = {'options': {'google-ai-studio': {'speech_metadata': {'style': style}}}}
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(), headers={'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def tries(l):
    # the provider sometimes refuses or returns nothing; a plainer style usually passes
    return [l['style'], l.get('tag', '')]


def check(pcm, text, slack=1.6):
    # a clip far longer than its words is a hallucinated or padded take
    if len(pcm) < 12000:
        raise ValueError(f'short audio {len(pcm)}')
    secs = len(pcm) / 48000
    if secs > slack + len(text) / 8:
        raise ValueError(f'too long {secs:.1f}s')
    return secs


def load_log(folder):
    p = os.path.join(folder, 'tts.json')
    return json.load(open(p)) if os.path.exists(p) else {}


def save_log(folder, log):
    json.dump(dict(sorted(log.items())), open(os.path.join(folder, 'tts.json'), 'w'), ensure_ascii=False, indent=0)


def logged(l, src, style, post):
    return {'src': src, 'model': MODEL, 'voice': l['voice'], 'input': l.get('say', l['text']), 'style': style, 'post': post, 'date': datetime.date.today().isoformat()}


def current(log, key, dst):
    # recorded with this model; an older or unlogged clip is re-recorded
    return os.path.exists(dst) and log.get(key, {}).get('model') == MODEL
