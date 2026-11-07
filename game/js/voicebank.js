// De ene loader voor de voice-manifesten (audio/voicelines/<map>/manifest.json).
// Elke map is een "bank": regels op sleutel "<spreker>|<tekst>", dus een
// bewerkte regel blijft stil in plaats van de verkeerde opname af te spelen.
// Eén fetch en één cache per map; wie dezelfde map opent, krijgt dezelfde bank.
// Geen browser-imports: scripts mogen dit laden (zonder fetch blijft de bank leeg).
//
// #733: een vroege of mislukte fetch maakte scènes de hele sessie stil: er was
// geen retry. Nu probeert de bank het met oplopende wachttijd opnieuw (drie
// pogingen), is er één promise om op te wachten (whenReady), en wordt een
// definitief mislukte bank één keer gemeld in plaats van stil te blijven.
// Een geslaagde bank laadt maar één keer; een mislukte bank kan een aanroeper
// met retry() nog één keer laten proberen (bv. bij een nieuwe scène).

const ROOT = new URL('../audio/voicelines/', import.meta.url).href;
const banks = new Map();

// wachttijd (ms) tussen de pogingen: de eerste meteen, dan na 400 ms en 1,2 s
export const RETRY_WACHT = [400, 1200];
export const POGINGEN = RETRY_WACHT.length + 1;

const voiceKey = (speaker, text) => speaker + '|' + text;

// A line recorded with a leading ellipsis ("…Er komt een politieauto aan.", the pause before it) is also found
// under the text without it: the story's script drops that mark, the recording says the same words (#326).
// Adds the extra keys to a manifest object; an exact key always wins.
export function withEllipsisAliases(m) {
  for (const k of Object.keys(m || {})) {
    const i = k.indexOf('|');
    if (i < 0 || !/^…\s*/.test(k.slice(i + 1))) continue;
    const alias = k.slice(0, i + 1) + k.slice(i + 1).replace(/^…\s*/, '');
    if (!(alias in m)) m[alias] = m[k];
  }
  return m;
}

function maakBank(dir) {
  const base = ROOT + dir + '/';
  const entries = {};
  const b = {
    dir: base,
    entries,
    ready: false,       // true zodra de manifest geladen is
    failed: false,      // true als alle pogingen mislukten (de scènes blijven dan stil)
    fout: '',           // de laatste foutmelding
    attempts: 0,        // hoeveel fetches er gedaan zijn
    geenBrowser: false, // Node/tests zonder fetch: de bank blijft leeg, dat is geen fout
    gemeld: false,      // de waarschuwing is één keer gedaan
    // ruwe manifestregel ({ src relatief aan de map, dur }) of null
    entry: (speaker, text) => entries[voiceKey(speaker, text)] || null,
    // { src (absoluut), dur } of null
    lookup(speaker, text) {
      const v = entries[voiceKey(speaker, text)];
      return v ? { src: base + v.src, dur: v.dur } : null;
    },
    size: () => Object.keys(entries).length,
  };
  // Eén promise voor iedereen die op de bank wil wachten (boot, tests, een scène
  // die zijn stemmen liever eerst heeft): hij resolvet ook als de bank mislukt.
  let oplossen = null;
  const nieuweWacht = () => { b._klaar = new Promise((res) => { oplossen = res; }); return b._klaar; };
  nieuweWacht();
  const klaar = (ok) => { b.ready = ok; if (!ok) b.failed = true; const r = oplossen; oplossen = null; if (r) r(ok); };
  b.whenReady = () => b._klaar;
  const poging = (n) => {
    b.attempts = n + 1;
    fetch(base + 'manifest.json')
      .then((r) => {
        if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
        return r.json();
      })
      .then((m) => { Object.assign(entries, withEllipsisAliases(m || {})); b.fout = ''; klaar(true); })
      .catch((err) => {
        b.fout = err && err.message ? err.message : String(err);
        const wacht = RETRY_WACHT[n];
        if (wacht != null) {
          b._timer = setTimeout(() => poging(n + 1), wacht);
          return;
        }
        klaar(false);
        if (!b.gemeld) {
          b.gemeld = true;
          try { console.warn(`stemmenbank ${base}: ${b.fout}; scènes met deze stemmen blijven stil`); } catch (e) { /* geen console */ }
        }
      });
  };
  b.retry = () => {
    if (b.ready || b.geenBrowser) return b.whenReady();
    if (b._timer) { clearTimeout(b._timer); b._timer = null; }
    b.failed = false;
    nieuweWacht();
    poging(0);
    return b._klaar;
  };
  if (typeof fetch === 'function' && typeof window !== 'undefined') poging(0);
  else { b.geenBrowser = true; klaar(false); b.failed = false; } // geen browser: niets te melden
  return b;
}

// dir: mapnaam onder audio/voicelines ('lines', 'jobs', 'story', ...).
export function openBank(dir) {
  let b = banks.get(dir);
  if (b) return b;
  b = maakBank(dir);
  banks.set(dir, b);
  return b;
}
