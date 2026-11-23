// AI-tells in speltekst (23-11): telt de stijlkenmerken waaraan lezers, recensenten en publishers tekst van een
// taalmodel herkennen (bronnen en uitleg: docs/AI-TELLS-23-11.md). Aanvulling op text_audit.mjs (merken, namen,
// leenwoorden) en tekst_kwaliteit_audit.mjs (vorm); deze kijkt naar toon en zinsbouw.
// Speltekst = wat collectTexts() uit text_audit.mjs oplevert (game/js, index.html, script.json, desktop, changelog)
// en isProse() leesbaar noemt, plus de publieke tekst (collectPubliek: website en de NL-winkelpagina voor Steam). Geen netwerk, geen game-imports.
//   node scripts/ai_tells_scan.mjs              gerangschikte telling per kenmerk en per bestand, met voorbeelden
//   node scripts/ai_tells_scan.mjs --kenmerk=gedachtestreepje,emoji   alle treffers van een of meer kenmerken
//   node scripts/ai_tells_scan.mjs --json       machineleesbaar
//   node scripts/ai_tells_scan.mjs --write      zet scripts/ai_tells_baseline.json op de huidige telling (alleen omlaag)
// De test (scripts/ai_tells_scan_test.mjs) faalt als een kenmerk boven de baseline komt: de telling mag alleen dalen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectTexts, isProse, jsStrings, REPO, voicedLookup } from './text_audit.mjs';

const BASELINE_FILE = path.join(REPO, 'scripts', 'ai_tells_baseline.json');

const L = '\\p{L}';
const woord = (src, flags = 'iu') => new RegExp(`(?<![${L}\\p{N}_])(?:${src})(?![${L}\\p{N}_])`, flags);

// opmaak telt niet mee: tags, toetstokens, entiteiten en sjabloongaten
export const kaal = (x) => x.replace(/<[^<>]*>/g, ' ').replace(/\{[A-Za-z0-9_+]{1,16}\}/g, 'X').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\u0000/g, ' ');

// Woorden die in het Nederlands vooral in modeltekst en verkooppraat opduiken (bronnen: Vizibly, Welingelichte Kringen,
// TE-learning, Wikipedia "Signs of AI writing" vertaald). Spelwoorden met een gewone betekenis (reis als reizen, ontdekken
// als prestatie) staan hier alleen in hun opgeklopte vorm.
const AI_WOORDEN = [
  'naadloze?', 'cruciale?', 'essentiële?', 'essentieel', 'optimale?', 'optimaal', 'meeslepende?', 'boeiende?', 'ultieme?',
  'epische?', 'episch', 'legendarisch', 'iconische?', 'adembenemende?', 'baanbrekende?', 'moeiteloos', 'moeiteloze',
  'onvergetelijke?', 'ongeëvenaarde?', 'unieke ervaring', 'rijke geschiedenis', 'bruisende?', 'levendige?', 'pulserende?',
  'bovendien', 'kortom', 'al met al', 'aanzienlijke?', 'genuanceerde?', 'een breed scala', 'breed scala',
  'speelt een (?:belangrijke|cruciale|grote) rol', 'het is belangrijk om', 'in een wereld waar(?:in)?',
  'duik (?:in|je in)', 'dompel (?:je )?onder', 'ontketen', 'ontdek (?:jezelf|de|het|een|alles)', 'ga op ontdekking', 'beleef de', 'beleef het',
  'stap in de wereld', 'jouw reis', 'je reis begint', 'het avontuur begint', 'avontuur wacht',
  'tot leven', 'til (?:je|jouw) .{1,20} naar een hoger niveau', 'naar een hoger niveau', 'verrijk', 'een ware?',
  'krachtige?', 'intuïtieve?', 'dynamische?', 'robuuste?', 'moderne twist', 'een vleugje', 'een snufje', 'pure? magie',
  'getuigenis van', 'een bewijs van', 'staat symbool voor', 'symbool van', 'weerspiegelt', 'onderstreept',
];
const AI_WOORD_RE = woord(AI_WOORDEN.join('|'));

// Engelse woorden die in Nederlandse speltekst niets te zoeken hebben (aanvulling op ANGLICISMEN in text_audit.mjs)
const ENGELS = ['the', 'and', 'you', 'your', 'with', 'now', 'new', 'ready', 'go', 'nice', 'wow', 'awesome', 'epic', 'cool',
  'unlock', 'unlocked', 'achievement', 'achievements', 'quest', 'quests', 'loot', 'spawn', 'level up', 'game over', 'skill',
  'skills', 'boost', 'perk', 'perks', 'tutorial', 'objective', 'mission', 'missions', 'start game', 'new game', 'resume',
  'quit', 'exit', 'yes', 'no', 'ok', 'okay', 'done', 'warning', 'success', 'failed', 'complete', 'completed', 'reward',
  'rewards', 'store', 'leaderboard', 'highscore', 'cooldown', 'vibe', 'vibes', 'basically', 'literally', 'please', 'thanks'];
// Bewust NIET: shop, item, tips, deal, sale, cool, chill, upgrade, stats, combo, oké, sorry: gewoon spreektaal-Nederlands.
// Bewust NIET: woorden die docs/WOORDENLIJST.md toestaat (app, score, bonus, level, tip, minigame, cheats, streamer).
const ENGELS_RE = woord(ENGELS.join('|'), 'u');
// een stuk van een HTML-sjabloon (attributen, css) is geen zin
const MARKUP = /=\s*["']|\bvar\(--|\bclass=|\bdata-[\w-]+|\d+px\b|^\s*["'>]|["']\s*$|[{;]\s*[\w-]+\s*:\s*\S|(?:^|[\s,])\.[a-z][\w-]+|=no\b|=cover\b/;
// alleen klassenamen ('ds-z-knop mv-help-ok', 'stl-row stl-now'): geen zin
const KLASSEN = (t) => { const w = t.trim().split(/\s+/); return w.length > 0 && w.every((x) => /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(x)) && w.some((x) => /[-_]/.test(x)); };

// Een kop of label in Title Case: elk woord met een hoofdletter, minstens één gewoon Nederlands woord dat dat niet hoort.
// De en Het tellen niet: 'Café De Lallende Koe' is een eigennaam en mag zo.
const KLEINE_WOORDEN = new Set(['een', 'en', 'of', 'met', 'op', 'in', 'voor', 'naar', 'je', 'jouw', 'je', 'mijn',
  'aan', 'uit', 'bij', 'om', 'over', 'tot', 'te', 'is', 'zijn', 'wordt', 'nieuwe', 'nieuw', 'alle', 'alles', 'eigen',
  'spel', 'speler', 'spelers', 'kaart', 'menu', 'instellingen', 'opdracht', 'opdrachten', 'missie', 'missies', 'prestatie',
  'prestaties', 'geld', 'tijd', 'auto', 'fiets', 'boot', 'snel', 'starten', 'stoppen', 'opslaan', 'laden', 'spelen', 'samen',
  'winkel', 'kopen', 'verkopen', 'baan', 'werk', 'dag', 'nacht', 'zomer', 'dorp']); // 'Stad' is een eigennaam (taalregel)
function titleCase(t) {
  const s = t.trim();
  if (/[.!?…;|·:]/.test(s) || /,$/.test(s) || /\d/.test(s) || /\s{2,}/.test(s) || s.length > 60) return null;
  const w = s.split(/\s+/).filter((x) => /^\p{L}/u.test(x));
  if (w.length < 2 || w.length > 7) return null;
  if (!w.every((x) => /^\p{Lu}/u.test(x))) return null;
  if (w.every((x) => /^\p{Lu}+\P{L}*$/u.test(x))) return null; // HOOFDLETTERS is een stijl, geen Title Case
  if (/^(?:De|Het)$/.test(w[1]) || w.slice(1).some((x) => /^(?:De|Het|Van|Der|Den|Ter|Ten)$/.test(x) && w.indexOf(x) < w.length - 1)) {
    // eigennaam: 'Café De Lallende Koe', 'Molen De Wiekslag'; alleen nog fout bij een echt klein woord als Een of En
    return w.slice(1).some((x) => /^(?:Een|En|Is|Naar|Nooit|Voor|Met|Op)$/.test(x)) ? s : null;
  }
  // Alleen functiewoorden en gewone UI-woorden tellen: een lexicon uit de speltekst zelf gaf te veel vals alarm op
  // verzonnen namen (Zware Klei, Stalen Stuur) en echte gebouwen (Lutherse Kerk).
  const fout = w.slice(1).find((x) => KLEINE_WOORDEN.has(x.replace(/[^\p{L}]/gu, '').toLowerCase()));
  return fout ? s : null;
}

// identieke zinnen: dezelfde zin van zes woorden of meer op meerdere plekken (sjabloon-gevoel)
const zinSleutel = (t) => t.replace(/\s+/g, ' ').trim();

// een ondertitel die op een werkwoord eindigt ('de politie komt', 'de dienst stopt') is een statusregel, geen titel
const VERB_EIND = / (?:komt|stopt|zag het|gaat open|remt vanzelf|groeit|volgt|klapt|begint|is open|staat|blijft)$|^(?:de|het|een) \p{L}+ (?:\p{Ll}+t|\p{Ll}+en)$/u;

export const KENMERKEN = [
  { id: 'gedachtestreepje', uitleg: 'gedachtestreepje (— of een los –) midden in een zin; Nederlands schrijft een komma, punt of dubbele punt',
    test: (t) => { const u = t.replace(/\s–\s\p{Lu}\.?\s*["”)]?$/u, '').replace(/GDE Groningen – Zomer vol misdaad/g, 'GDE').replace(/\d\s–\s\d/g, '0'); return /—|\s–\s/.test(u) ? (u.match(/—|\s–\s/g) || []).join('') : null; } },
  { id: 'niet-x-maar-y', uitleg: "'niet X, maar Y' en 'niet alleen ... maar ook': de contrastformule van modeltekst",
    test: (t) => { const m = /(?<![\p{L}])niet (?:alleen|enkel|zomaar|gewoon|zo maar|meer)?\s?[^.!?;:]{1,50},? maar(?: ook)?(?![\p{L}])/iu.exec(t) || /(?<![\p{L}])geen [^.!?;:]{1,40}, maar(?![\p{L}])/iu.exec(t); return m ? m[0] : null; } },
  { id: 'ai-woord', uitleg: "opgeklopte modelwoorden (naadloos, cruciaal, essentieel, duik in, ontdek de, episch, jouw reis, bovendien, kortom)",
    test: (t) => { const m = AI_WOORD_RE.exec(t); return m ? m[0] : null; } },
  { id: 'drietal', uitleg: "opsomming van precies drie korte delen ('snel, simpel en slim'): de regel van drie",
    test: (t) => { const m = /(?<![\p{L},] )(?<![\p{L}])(\p{L}+(?: \p{L}+)?), (\p{L}+(?: \p{L}+)?) en (\p{L}+(?: \p{L}+)?)(?=[.!?…]|$)/u.exec(t.trim()); return m && !/^\p{Lu}/u.test(m[2]) ? m[0] : null; } },
  { id: 'laten-we', uitleg: "'Laten we...', 'Klaar om...?', 'Ben je klaar voor...': presentatorentoon",
    test: (t) => { const m = /(?<![\p{L}])(?:laten we|klaar om (?:te|het|de)|ben je klaar voor|maak je klaar voor|zet je schrap|let's)(?![\p{L}])/iu.exec(t); return m ? m[0] : null; } },
  { id: 'afsluitzin', uitleg: "samenvattende of morele slotzin ('Kortom', 'Al met al', 'Want uiteindelijk draait het om')",
    test: (t) => { const m = /(?<![\p{L}])(?:uiteindelijk draait (?:het|alles) om|want daar draait het om|en dat is (?:precies )?(?:waar|wat) het om draait|het gaat erom dat|wat telt is|onthoud:)(?![\p{L}])/iu.exec(t); return m ? m[0] : null; } },
  { id: 'vraag-antwoord', uitleg: "kort vraagje dat zichzelf beantwoordt ('Het resultaat? Chaos.', 'Eerlijk?')",
    test: (t) => { const m = /(?:^|[.!?] )((?:\p{L}+ ){0,2}\p{L}+)\? \p{Lu}/u.exec(t.trim()); return m && /^(?:het (?:resultaat|gevolg|antwoord|probleem|geheim)|de (?:uitkomst|oplossing|reden|clou)|eerlijk|waarom|het mooiste|het beste)$/iu.test(m[1]) ? m[0] : null; } },
  { id: 'nadruk-accent', uitleg: "nadrukaccent (écht, héél, dé) als stijlmiddel",
    test: (t) => { const m = /(?<![\p{L}])(?:écht|héél|dé|hét|één van de)(?![\p{L}])/u.exec(t); return m && m[0] !== 'één van de' ? m[0] : null; } },
  { id: 'uitroep-enthousiasme', uitleg: "overdreven enthousiasme: uitroepteken plus geweldig, fantastisch, super, wauw, gaaf of top",
    test: (t) => { if (!/!/.test(t)) return null; const m = /(?<![\p{L}])(?:geweldig|fantastisch|fantastische|super|wauw|gaaf|geweldige|top|hoera|joepie|yes)(?![\p{L}])/iu.exec(t); return m ? m[0] + '!' : null; } },
  { id: 'nep-statistiek', uitleg: "verzonnen statistiek of bron ('87% van de spelers', 'onderzoek toont aan', 'experts zeggen')",
    test: (t) => { const m = /\d+ ?(?:%|procent) van (?:de|alle|onze) (?:spelers|Groningers|Nederlanders|mensen|bevolking|studenten|inwoners|bezoekers|chauffeurs|automobilisten|fietsers)|(?<![\p{L}])(?:onderzoek (?:toont|laat zien)|studies tonen|experts (?:zeggen|zijn het eens)|wetenschappers zeggen|volgens kenners)(?![\p{L}])/iu.exec(t); return m ? m[0] : null; } },
  // Een HUD-regel 'Status: wat je doet' ('Te hoog: een stukje zakken') is een vaste UI-vorm en telt niet; alleen een titel
  // met een naamwoordelijke ondertitel ('Discgolf: de volle ronde', 'Het proefbeleg: de gracht') is de modelformule.
  { id: 'titel-dubbelepunt', uitleg: "titel met dubbele punt en een ondertitel 'de/het/een ...' ('Groningen: een reis door de tijd')",
    test: (t) => { const s = t.trim(); if (s.length > 60 || /[.!?]$/.test(s) || /\d/.test(s)) return null; const m = /^(\p{Lu}[\p{L}' -]{2,30}): ((?:de|het|een) [\p{L}'-]+(?: [\p{L}'-]+)?)$/u.exec(s); return m && m[1].split(' ').length <= 4 && !VERB_EIND.test(m[2]) ? s : null; } },
  { id: 'title-case', uitleg: 'kop of label in Engelse Title Case (Nieuw Spel Starten); Nederlands: alleen het eerste woord en namen',
    test: titleCase },
  { id: 'emoji', uitleg: 'emoji in speltekst', test: (t) => { const m = t.match(/\p{Extended_Pictographic}/gu); const e = m && m.filter((c) => !/[★☆✓✔✗✕✖©®™↑↓←→↔⇄⏸▶◀⏵⏴⏹⌛⏳☀☁☂⚠⚡❤♥✦✧✪⬆⬇⬅➡]/u.test(c)); return e && e.length ? e.join('') : null; } },
  { id: 'engels-woord', uitleg: 'Engels woord in Nederlandse speltekst (naast de ANGLICISMEN van text_audit)',
    test: (t) => { const m = ENGELS_RE.exec(t); return m ? m[0] : null; } },
  { id: 'staccato-drietal', uitleg: "drie zinnetjes van hooguit drie woorden op rij ('Twee vrienden. Eén zomer. Geen plan.'): de trailerformule",
    test: (t) => { const z = t.split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter(Boolean); for (let i = 0; i + 2 < z.length; i++) if (z.slice(i, i + 3).every((x) => /[.]$/.test(x) && x.split(/\s+/).length <= 3)) return z.slice(i, i + 3).join(' '); return null; } },
  { id: 'uitroep-stapel', uitleg: 'drie of meer uitroeptekens in één korte tekst: schreeuwerig, alles even belangrijk',
    test: (t) => (t.match(/!/g) || []).length >= 3 && t.length < 200 ? '!!!' : null },
  { id: 'dubbele-spatie', uitleg: 'twee spaties achter elkaar midden in een zin', raw: true,
    test: (raw) => raw.replace(/\u0000/g, 'X').split(/<[^<>]*>/).some((seg) => /[\p{L}\p{N},.!?] {2,}[\p{L}\p{N}]/u.test(seg)) ? '␣␣' : null },
  { id: 'drie-puntjes', uitleg: "'...' (drie punten) waar de rest van het spel '…' gebruikt", test: (t) => /(?<!\.)\.\.\.(?!\.)/.test(t) ? '...' : null },
  { id: 'placeholder-debug', uitleg: 'placeholder- of debugtekst (TODO, lorem ipsum, FIXME, XXX, TBD, placeholder, test 123)',
    test: (t) => { const m = /(?<![\p{L}])(?:TODO|FIXME|XXX|TBD|lorem ipsum|placeholder|plaatshouder|test ?123|asdf|nog invullen|tekst hier|hier komt)(?![\p{L}])/u.exec(t) || /(?<![\p{L}])(?:lorem ipsum|placeholder|nog invullen|tekst hier|hier komt tekst)(?![\p{L}])/iu.exec(t); return m ? m[0] : null; } },
];

// Wat een publisher het eerst leest: de marketingpagina (website/), de hulppagina's en de tekst voor de Steam-winkelpagina
// (alleen het Nederlandse deel; de Engelse winkeltekst is bewust Engels). HTML wordt per tekstblok gelezen.
export function collectPubliek() {
  const items = [];
  const rel = (f) => path.relative(REPO, f).split(path.sep).join('/');
  const blokken = (file, line, html) => {
    for (const seg of html.split(/<\/?(?:p|li|h[1-6]|div|section|span|strong|a|td|th|figcaption|button|header|footer|nav|ul|ol)\b[^>]*>/i)) {
      const t = seg.replace(/<[^<>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (t) items.push({ file, line, text: t, kind: 'publiek' });
    }
  };
  for (const name of ['help-pages.mjs', 'slideshows.mjs', 'script.js']) {
    const f = path.join(REPO, 'website', name);
    if (!fs.existsSync(f)) continue;
    for (const s of jsStrings(fs.readFileSync(f, 'utf8'))) blokken(rel(f), s.line, s.text);
  }
  const idx = path.join(REPO, 'website', 'index.html');
  if (fs.existsSync(idx)) {
    const html = fs.readFileSync(idx, 'utf8').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (x) => x.replace(/[^\n]/g, ' '));
    html.split(/\r?\n/).forEach((l, k) => {
      for (const m of l.matchAll(/(?:title|aria-label|alt|content)="([^"]*)"/g)) items.push({ file: 'website/index.html', line: k + 1, text: m[1], kind: 'publiek' });
      blokken('website/index.html', k + 1, l);
    });
  }
  const wp = path.join(REPO, 'docs', 'steam', 'winkelpagina.md');
  if (fs.existsSync(wp)) {
    let engels = false;
    fs.readFileSync(wp, 'utf8').split(/\r?\n/).forEach((l, k) => {
      if (/^#{2,3} /.test(l)) engels = /^#{2,3} EN\b/.test(l);
      if (/^\*\*EN\*\*/.test(l)) engels = true;
      if (/^\*\*NL\*\*/.test(l)) engels = false;
      if (engels || !/^(?:> |\[\*\]|\[h2\]|[A-ZÀ-ÿ])/.test(l)) return;
      if ((l.match(/\b(?:the|and|with|no|of|is|are|your|you)\b/g) || []).length >= 2) return; // een Engelse regel buiten een EN-kop
      const t = l.replace(/^> /, '').replace(/\[\/?[a-z0-9*=]+[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
      if (t) items.push({ file: 'docs/steam/winkelpagina.md', line: k + 1, text: t, kind: 'publiek' });
    });
  }
  return items;
}

// Spiegels: de ondertitels en het verhaalscript dragen dezelfde regel als de plek waar hij klinkt; dat is één regel, geen herhaling.
const SPIEGEL = /(?:^|\/)(?:subtitles\.js|script\.json|audiocredits\.js)$/;
const KIND_VAN =(it) => it.file === 'CHANGELOG.md' ? 'changelog' : it.kind;

// Alle treffers. Het changelog telt mee (Over > Wat is er nieuw), maar staat als eigen bestand in de telling.
export function scan({ items = [...collectTexts(), ...collectPubliek()] } = {}) {
  const hits = [];
  const seen = new Set();
  const zinnen = new Map();  for (const it of items) {
    if (!isProse(it.text)) continue;
    const t = kaal(it.text);
    if (!/\p{L}{2}/u.test(t) || MARKUP.test(t) || KLASSEN(t)) continue;
    for (const k of KENMERKEN) {
      const term = k.test(k.raw ? it.text : t);
      if (!term) continue;
      const key = `${k.id}|${it.file}|${it.line}|${t}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ kenmerk: k.id, file: it.file, line: it.line, kind: KIND_VAN(it), term, text: t.replace(/\s+/g, ' ').trim() });
    }
    const z = zinSleutel(t);
    if (z.split(' ').length >= 6 && it.kind !== 'changelog' && !SPIEGEL.test(it.file)) {
      if (!zinnen.has(z)) zinnen.set(z, []);
      zinnen.get(z).push(it);
    }
  }
  // telt per zin (niet per plek): de eerste plek staat in de telling, de andere in de term
  for (const [z, plekken] of zinnen) {
    const files = [...new Set(plekken.map((p) => p.file))];
    if (files.length < 2) continue;
    hits.push({ kenmerk: 'identieke-zin', file: plekken[0].file, line: plekken[0].line, kind: KIND_VAN(plekken[0]), term: files.join(' + '), text: z });
  }
  return hits;
}
KENMERKEN.push({ id: 'identieke-zin', uitleg: 'dezelfde zin (6+ woorden) letterlijk in meerdere bestanden: sjabloongevoel', test: () => null });

export function tellingen(hits) {
  const per = {};
  for (const k of KENMERKEN) per[k.id] = 0;
  for (const h of hits) per[h.kenmerk]++;
  return per;
}

export function leesBaseline() {
  return fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) : null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const hits = scan();
  const per = tellingen(hits);
  const kenmerk = (args.find((a) => a.startsWith('--kenmerk=')) || '').split('=')[1];
  if (args.includes('--json')) { console.log(JSON.stringify({ per, hits }, null, 1)); process.exit(0); }
  if (kenmerk) {
    const wil = new Set(kenmerk.split(','));
    const ingesproken = await voicedLookup();
    for (const h of hits.filter((x) => wil.has(x.kenmerk))) console.log(`${h.kenmerk} ${h.file}:${h.line}${ingesproken({ text: h.text }) ? ' (ingesproken)' : ''} [${h.term}] ${h.text.slice(0, 160)}`);
    process.exit(0);
  }
  if (args.includes('--write')) {
    const oud = leesBaseline();
    const nieuw = { v: 1, op: new Date().toISOString().slice(0, 10), uitleg: 'Bovengrens per AI-kenmerk in speltekst (scripts/ai_tells_scan.mjs). Mag alleen dalen.', per: {} };
    for (const [k, n] of Object.entries(per)) nieuw.per[k] = oud && oud.per && oud.per[k] != null ? Math.min(oud.per[k], n) : n;
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(nieuw, null, 2) + '\n');
    console.log(`baseline geschreven: ${BASELINE_FILE}`);
  }
  const base = leesBaseline();
  console.log('AI-tells in speltekst, per kenmerk (hoogste eerst):');
  for (const [k, n] of Object.entries(per).sort((a, b) => b[1] - a[1])) {
    const u = KENMERKEN.find((x) => x.id === k).uitleg;
    const b = base && base.per ? base.per[k] : null;
    console.log(`${String(n).padStart(5)}  ${k.padEnd(22)}${b != null ? ` (baseline ${b})` : ''}  ${u}`);
    for (const h of hits.filter((x) => x.kenmerk === k).slice(0, 3)) console.log(`         ${h.file}:${h.line} [${h.term}] ${h.text.slice(0, 110)}`);
  }
  const perFile = {};
  for (const h of hits) perFile[h.file] = (perFile[h.file] || 0) + 1;
  console.log('\nPer bestand (top 25):');
  for (const [f, n] of Object.entries(perFile).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`${String(n).padStart(5)}  ${f}`);
  console.log(`\n${hits.length} treffers in totaal`);
}
