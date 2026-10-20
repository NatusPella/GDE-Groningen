// De ene loader voor de voice-manifesten (audio/voicelines/<map>/manifest.json).
// Elke map is een "bank": regels op sleutel "<spreker>|<tekst>", dus een
// bewerkte regel blijft stil in plaats van de verkeerde opname af te spelen.
// Eén fetch en één cache per map; wie dezelfde map opent, krijgt dezelfde bank.
// Geen browser-imports: scripts mogen dit laden (zonder fetch blijft de bank leeg).

const ROOT = new URL('../audio/voicelines/', import.meta.url).href;
const banks = new Map();

const voiceKey = (speaker, text) => speaker + '|' + text;

// A line recorded with a leading ellipsis ("…Er komt een politieauto aan.", the pause before it) is also found
// under the text without it: the story's script drops that mark, the recording says the same words (#326).
// Adds the extra keys to a manifest object; an exact key always wins.
export function withEllipsisAliases(m) {
  for (const k of Object.keys(m || {})) {
    const i = k.indexOf('|');
    if (i < 0 || !/^…s*/.test(k.slice(i + 1))) continue;
    const alias = k.slice(0, i + 1) + k.slice(i + 1).replace(/^…s*/, '');
    if (!(alias in m)) m[alias] = m[k];
  }
  return m;
}

// dir: mapnaam onder audio/voicelines ('lines', 'jobs', 'story', ...).
export function openBank(dir) {
  let b = banks.get(dir);
  if (b) return b;
  const base = ROOT + dir + '/';
  const entries = {};
  b = {
    dir: base,
    entries,
    ready: false,
    // ruwe manifestregel ({ src relatief aan de map, dur }) of null
    entry: (speaker, text) => entries[voiceKey(speaker, text)] || null,
    // { src (absoluut), dur } of null
    lookup(speaker, text) {
      const v = entries[voiceKey(speaker, text)];
      return v ? { src: base + v.src, dur: v.dur } : null;
    },
    size: () => Object.keys(entries).length,
  };
  banks.set(dir, b);
  if (typeof fetch === 'function' && typeof window !== 'undefined') {
    fetch(base + 'manifest.json').then((r) => (r.ok ? r.json() : {}))
      .then((m) => { Object.assign(entries, withEllipsisAliases(m || {})); }).catch(() => {})
      .then(() => { b.ready = true; });
  }
  return b;
}
