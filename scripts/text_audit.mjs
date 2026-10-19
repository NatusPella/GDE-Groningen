// Audit of all player-facing text against the constitution in AGENTS.md:
// Dutch only, no real brands/companies/people, 'Grunn' never 'de Grunn', always summer.
// Collects every string literal in game/js (comments and console/error strings skipped),
// the text and attributes of game/index.html, every string in game/storydata/script.json
// and the [Unreleased] part of CHANGELOG.md, and checks the prose ones against word lists.
// No network, no game imports.
//   node scripts/text_audit.mjs            findings that are not on the allowlist (exit 1 when any)
//   node scripts/text_audit.mjs --all      also list the allowlisted ones, with the reason
//   node scripts/text_audit.mjs --json     machine-readable findings
// Regel `anglicisme`: Engelse leenwoorden (save, host, checkpoint, ...) zijn een fout; zie docs/WOORDENLIJST.md.
// Lines that are already voiced are flagged `ingesproken`: report them, do not change them
// (re-recording needs the owner's go-ahead). Intentional cases go in ALLOW below, with a reason.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (f) => path.relative(REPO, f).split(path.sep).join('/');
const readLines = (f) => fs.readFileSync(f, 'utf8').split(/\r?\n/);

// ---------------------------------------------------------------- collecting

// All string literals in JS source with their line number. Skips comments; template
// literals yield their static parts (${...} is skipped over).
export function jsStrings(code, lineBase = 1) {
  const out = [];
  let line = lineBase, i = 0;
  const n = code.length;
  let prevSig = ''; // last significant char, to tell a regex literal from a division
  const skipTemplateExpr = () => { // after '${'
    let depth = 1;
    while (i < n && depth) {
      const c = code[i];
      if (c === '\n') line++;
      if (c === '\'' || c === '"') { readString(c, false); continue; }
      if (c === '`') { readTemplate(false); continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
  };
  function readString(q, silent) {
    const startLine = line;
    let s = ''; i++;
    while (i < n && code[i] !== q && code[i] !== '\n') {
      if (code[i] === '\\') {
        const e = code[i + 1];
        if (e === 'n') s += '\n'; else if (e === 't') s += '\t';
        else if (e === 'u' && /^[0-9a-fA-F]{4}$/.test(code.slice(i + 2, i + 6))) { s += String.fromCharCode(parseInt(code.slice(i + 2, i + 6), 16)); i += 4; }
        else if (e === '\n') line++;
        else s += e;
        i += 2;
      } else s += code[i++];
    }
    i++;
    if (!silent) out.push({ line: startLine, text: s });
  }
  function readTemplate(silent) {
    const startLine = line;
    let s = ''; i++;
    while (i < n && code[i] !== '`') {
      if (code[i] === '\\') { s += code[i + 1] === 'n' ? '\n' : code[i + 1]; i += 2; continue; }
      if (code[i] === '$' && code[i + 1] === '{') { i += 2; s += '\u0000'; skipTemplateExpr(); continue; }
      if (code[i] === '\n') line++;
      s += code[i++];
    }
    i++;
    if (!silent) for (const part of s.split('\u0000')) if (part.trim()) out.push({ line: startLine, text: part });
  }
  while (i < n) {
    const c = code[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && code[i + 1] === '/') { while (i < n && code[i] !== '\n') i++; continue; }
    if (c === '/' && code[i + 1] === '*') { const e = code.indexOf('*/', i + 2); const end = e < 0 ? n : e + 2; for (let k = i; k < end; k++) if (code[k] === '\n') line++; i = end; continue; }
    if (c === '\'' || c === '"') { readString(c); prevSig = 'a'; continue; }
    if (c === '`') { readTemplate(); prevSig = 'a'; continue; }
    if (c === '/' && /[(,=:[!&|?{};]|^$/.test(prevSig)) { // regex literal
      i++; let cls = false;
      while (i < n && code[i] !== '\n' && (cls || code[i] !== '/')) { if (code[i] === '\\') i++; else if (code[i] === '[') cls = true; else if (code[i] === ']') cls = false; i++; }
      i++; prevSig = 'a'; continue;
    }
    if (!/\s/.test(c)) prevSig = c;
    i++;
  }
  return out;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// developer-only files: test harness labels are English on purpose and never shown to a player
const DEV_FILES = /storytest\.js$/;
const DEV_LINE = /console\.|new Error\(|throw |assert|\.warn\(|\.error\(|debug/i;

export function collectTexts() {
  const items = [];
  const push = (file, line, text, kind) => items.push({ file, line, text, kind });
  for (const f of walk(path.join(REPO, 'game', 'js'))) {
    if (DEV_FILES.test(f)) continue;
    const code = fs.readFileSync(f, 'utf8');
    const lines = code.split(/\r?\n/);
    for (const s of jsStrings(code)) {
      if (DEV_LINE.test(lines[s.line - 1] || '')) continue;
      push(rel(f), s.line, s.text, 'js');
    }
  }
  // index.html: inline scripts through the JS reader, the rest as text and attributes
  const htmlFile = path.join(REPO, 'game', 'index.html');
  const html = fs.readFileSync(htmlFile, 'utf8');
  const lineAt = (idx) => html.slice(0, idx).split('\n').length;
  for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const base = lineAt(m.index + m[0].indexOf(m[1]));
    const lines = html.split(/\r?\n/);
    for (const s of jsStrings(m[1], base)) if (!DEV_LINE.test(lines[s.line - 1] || '')) push('game/index.html', s.line, s.text, 'html-js');
  }
  const bare = html.replace(/<script\b[\s\S]*?<\/script>/gi, (x) => x.replace(/[^\n]/g, ' ')).replace(/<style\b[\s\S]*?<\/style>/gi, (x) => x.replace(/[^\n]/g, ' ')).replace(/<!--[\s\S]*?-->/g, (x) => x.replace(/[^\n]/g, ' '));
  for (const m of bare.matchAll(/(?:title|aria-label|placeholder|alt|content)="([^"]*)"/g)) push('game/index.html', lineAt(m.index), m[1], 'html-attr');
  for (const m of bare.matchAll(/>([^<>]+)</g)) { const t = m[1].replace(/\s+/g, ' ').trim(); if (t) push('game/index.html', lineAt(m.index + m[0].search(/\S/, 1)), t, 'html'); }
  // story script
  const sf = path.join(REPO, 'game', 'storydata', 'script.json');
  if (fs.existsSync(sf)) {
    const sl = readLines(sf);
    const where = new Map();
    sl.forEach((l, k) => { const m = /:\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$/.exec(l) || /^\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$/.exec(l); if (m) { const t = JSON.parse('"' + m[1] + '"'); if (!where.has(t)) where.set(t, k + 1); } });
    const visit = (v, key) => {
      if (typeof v === 'string') { if (key !== 'rec' && key !== 'voice' && key !== 'id' && key !== 'note') push('game/storydata/script.json', where.get(v) || 0, v, 'story'); }
      else if (Array.isArray(v)) v.forEach((x) => visit(x, key));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(x, k);
    };
    visit(JSON.parse(sl.join('\n')));
  }
  // desktop shell: menu and dialog texts (not the dev harness)
  for (const name of ['main.js', 'preload.js', 'coopcore.cjs']) {
    const f = path.join(REPO, 'desktop', name);
    if (!fs.existsSync(f)) continue;
    const code = fs.readFileSync(f, 'utf8');
    const lines = code.split(/\r?\n/);
    for (const s of jsStrings(code)) if (!DEV_LINE.test(lines[s.line - 1] || '')) push(rel(f), s.line, s.text, 'js');
  }
  // spoken (Gronings) versions: the same brand/people/winter rules apply to what is said
  const gs = path.join(REPO, 'scripts', 'gronings_spoken.json');
  if (fs.existsSync(gs)) {
    const spoken = JSON.parse(fs.readFileSync(gs, 'utf8'));
    // what the shown line already triggers is judged there (and allowlisted there); only new findings count here
    for (const [shown, v] of Object.entries(spoken)) {
      if (typeof v !== 'string' || v === shown) continue;
      const known = new Set(checkText(shown).map((f) => f.rule));
      if (checkText(v).some((f) => !known.has(f.rule))) push('scripts/gronings_spoken.json', 0, v, 'gesproken');
    }
  }
  // player-visible changelog lines
  const cl = path.join(REPO, 'CHANGELOG.md');
  if (fs.existsSync(cl)) {
    const l = readLines(cl);
    let on = false;
    l.forEach((t, k) => { if (/^## /.test(t)) on = /Unreleased/i.test(t); else if (on && t.trim()) push('CHANGELOG.md', k + 1, t.replace(/^[-*]\s*/, ''), 'changelog'); });
  }
  return items;
}

// Prose = something a player can read: a sentence, or a capitalised name with a space.
// Skips ids, paths, css, numbers and snake/camel identifiers.
export function isProse(t) {
  const s = t.trim();
  if (s.length < 3 || !/[A-Za-zÀ-ÿ]{2}/.test(s)) return false;
  if (/^[#.\/]|^https?:|^[\w-]+\.(js|json|png|jpg|mp3|ogg|wav|glb|gdt|svg|css)$/i.test(s)) return false;
  if (/^[a-z0-9_.:\-\/|]+$/i.test(s) && !/\s/.test(s)) return /^[A-Z][a-zé]{3,}$/.test(s); // single word: only a Capitalised word
  if (/^[\s\d.,:;#%()\-+*/=<>{}\[\]'"|&!?@$^~\\]*$/.test(s)) return false;
  // code and css, not placeholders: `{plaats}` and a ';' inside a sentence are fine
  if (/=>|\)\s*\{|\{[^}]*[:;=][^}]*\}|^\s*[{}]|\)\s*;|\*=|[^\s]\s\*\s|^\s*(rgba?|hsla?|translate|scale)\(|\b(px|rem|em|vh|vw)\b;?$/.test(s)) return false;
  return /\s/.test(s);
}

// ---------------------------------------------------------------- word lists

const B = (cat, words, opts = {}) => words.map((w) => ({ rule: 'merk', cat, w, cs: !!opts.cs }));
const BRANDS = [
  ...B('auto', ['Volkswagen', 'Mercedes', 'BMW', 'Audi', 'Toyota', 'Tesla', 'Opel', 'Renault', 'Peugeot', 'Citroën', 'Volvo', 'Porsche', 'Ferrari', 'Lamborghini', 'Hyundai', 'Skoda', 'Nissan', 'Mazda', 'Suzuki', 'Harley', 'Yamaha', 'Kawasaki', 'Scania', 'Land Rover', 'Range Rover', 'Bugatti', 'Maserati', 'Bentley', 'Rolls-Royce', 'Jaguar', 'Lexus', 'Subaru', 'Mitsubishi']),
  ...B('auto', ['Ford', 'Fiat', 'Kia', 'Honda', 'Mini', 'Jeep', 'DAF', 'Seat', 'Smart'], { cs: true }),
  ...B('tech', ['Google', 'Apple', 'iPhone', 'iPad', 'Microsoft', 'Facebook', 'Instagram', 'Twitter', 'WhatsApp', 'TikTok', 'YouTube', 'Netflix', 'Spotify', 'Amazon', 'Uber', 'Tinder', 'Snapchat', 'PlayStation', 'Xbox', 'Nintendo', 'Samsung', 'Android', 'Wikipedia', 'ChatGPT', 'OpenAI', 'Discord', 'Twitch', 'LinkedIn', 'Bitcoin', 'Telegram', 'Huawei', 'Nokia', 'Sony', 'Linux', 'Photoshop', 'Gmail', 'Hotmail', 'Pinterest', 'Reddit', 'Airbnb', 'Booking.com', 'Marktplaats', 'Bol.com', 'Coolblue', 'Thuisbezorgd', 'Deliveroo']),
  ...B('tech', ['Windows', 'Steam', 'Zoom', 'Siri', 'Alexa'], { cs: true }),
  ...B('eten', ['Coca-Cola', 'Pepsi', 'Heineken', 'Grolsch', 'Bavaria', 'Amstel', 'Hertog Jan', "McDonald's", 'McDonalds', 'Burger King', 'KFC', "Domino's", 'Starbucks', 'Nutella', 'Snickers', 'Red Bull', 'Doritos', 'Unox', 'Calvé', 'Lidl', 'Aldi', 'Jumbo', 'Albert Heijn', 'Blokker', 'Ikea', 'Kruidvat', 'Etos', 'Zara', 'Primark', 'Nike', 'Adidas', 'Rolex', 'Gamma', 'Praxis', 'Hornbach', 'Mediamarkt', 'Media Markt', 'Decathlon', 'Douwe Egberts', 'Pickwick', 'Fanta', 'Sprite', 'Haribo', 'Duvel', 'Jupiler', 'Brand Bier', 'Bokma', 'Hema', 'Spar', 'Vomar', 'Dirk', 'Bakker Bart', 'Lays', "Lay's"], { cs: false }),
  ...B('bank', ['Rabobank', 'ABN AMRO', 'ABN', 'ING', 'SNS', 'Triodos', 'Bunq', 'Revolut', 'PayPal', 'iDEAL', 'Mastercard', 'Tikkie', 'Visa', 'Knab', 'Klarna', 'Western Union'], { cs: true }),
  ...B('media', ['Dagblad van het Noorden', 'RTV Noord', 'Telegraaf', 'Volkskrant', 'NRC', 'RTL', 'SBS', 'Veronica', 'Radio 538', 'Qmusic', 'NPO', 'BNN', 'Disney', 'Marvel', 'Pokémon', 'Pokemon', 'Mario', 'Zelda', 'GTA', 'Grand Theft Auto', 'Minecraft', 'Fortnite', 'Star Wars', 'Harry Potter', 'James Bond', 'Batman', 'Superman', 'Spider-Man', 'Pikachu', 'Lego', 'Barbie', 'Playboy', 'Lonely Planet', 'Joop', 'GeenStijl', 'Linda', 'Libelle', 'Donald Duck', 'Mickey Mouse', 'Tweede Kamer', 'Eurovisie', 'Songfestival', 'Idols', 'Expeditie Robinson', 'Boer zoekt Vrouw', 'Het Klokhuis', 'Sesamstraat', 'Studio Sport'], { cs: false }),
  ...B('overig', ['NS', 'ProRail', 'Arriva', 'Qbuzz', 'Syntus', 'GVB', 'PostNL', 'DHL', 'UPS', 'Shell', 'BP', 'Esso', 'Gasunie', 'Gazprom', 'Vattenfall', 'Eneco', 'Essent', 'Greenpeace', 'Shell', 'Fedex', 'FedEx', 'Tomtom', 'TomTom', 'Philips', 'Unilever', 'Heineken', 'ASML', 'Booking', 'KLM', 'Schiphol', 'Ryanair', 'Easyjet', 'Rijkswaterstaat'], { cs: true }),
];
const PEOPLE = ['Mendini', 'Starck', 'Himmelb', 'Eurosonic', 'Lowlands', 'Pinkpop', 'Oerol', 'Sail Amsterdam', 'Koningsdag', 'Werkman', 'Rutte', 'Wilders', 'Trump', 'Obama', 'Biden', 'Putin', 'Poetin', 'Musk', 'Bezos', 'Zuckerberg', 'Willem-Alexander', 'Máxima', 'Maxima', 'Beatrix', 'Cruijff', 'Cruyff', 'Messi', 'Ronaldo', 'Van Gogh', 'Rembrandt', 'Hitler', 'Merkel', 'Klaas Dijkhoff', 'Mark Rutte', 'Geert Wilders', 'Frans Timmermans', 'Jesse Klaver', 'Thierry Baudet', 'Sinterklaas', 'André Hazes', 'Andre Hazes', 'Anouk', 'Gers Pardoel', 'Ali B', 'Marco Borsato', 'Borsato', 'Tom Waes', 'Jeroen Krabbé', 'Johan Derksen', 'René van der Gijp', 'Wilfred Genee', 'Peter R. de Vries', 'Taylor Swift', 'Beyoncé', 'Kanye', 'Elvis', 'Michael Jackson', 'Madonna', 'Eminem', 'Drake', 'Shakira', 'Rihanna'];
// first names that, followed by a capitalised surname, suggest a real person
const FIRST = 'Jan Piet Klaas Henk Kees Willem Hendrik Johannes Cornelis Gerrit Dirk Sjoerd Geert Harm Albert Wim Hans Peter Marco Mark Frank Bas Rob Ruud Arjen Robin Wesley Frenkie Virgil Memphis Daley Matthijs Sven Tim Tom Thomas Jeroen Johan Rene René Ronald Erik Eric Martin Maarten Wouter Wilma Maria Anna Sandra Linda Marianne Ingrid Femke Sanne Lisa Emma Sophie Julia Nina Femke Karin Marijke Joke Els Greet Trijntje Fenna Anke Aaltje'.split(/\s+/);

// English function words that do not occur in Dutch (so 'is', 'in', 'of', 'was', 'me', 'he', 'an' are not here)
const EN = new Set("the and you your yours with this that these those have has had not will would could should from they their there what when where which into just don't can't won't doesn't didn't isn't it's i'm i'll i've we're you're he's she's let's about because before after again always never very much more some any only also than then them been being are were does did how why who whom whose out over under off our us his her him she its myself press click loading welcome please start game over continue back exit quit options settings save load yes no ok".split(' '));
const EN_STRONG = new Set("the and you your with this that these those have has will would could should from they their there what when where which into don't can't won't it's i'm i'll we're you're let's about because before after always never very much some than been are does press click please".split(' '));

const WINTER = [
  /\bsneeuw\w*/i, /\bwinter\w*/i, /\bkerst(?!ens?\b)\w*/i, /\bvorst\b/i, /\bijs(?:baan|banen|vrij|pret|kap|schol|beer|berg|pegel|zeil\w*)?\b/i, /\bijzel\w*/i, /\bschaats\w*/i, /\bbevroren\b/i, /\bbesneeuwd\w*/i, /\bsinterklaas\w*/i, /\boud en nieuw\b/i, /\boliebol\w*/i, /\belfsteden\w*/i, /\bgladheid\b/i, /\bstrooizout\b/i, /\bwinterbanden\b/i, /\bkachel\w*/i, /\bhagel(?!geweer)\w*/i, /\bsnow\b/i, /\bchristmas\b/i, /\bice\b/i,
  /\boudjoar\w*/i, /\bnajaar\w*/i, /\bherfst\w*/i, /\bvoorjaar\w*/i, /\b(?:november|december|januari|februari)\b/i,
];

// Engelse leenwoorden waar een goed Nederlands woord voor is (docs/WOORDENLIJST.md).
// `w` is een woord of regex-bron; `nl` wat er voor in de plaats komt. Hatchback, sedan, app, camera,
// HUD, minimap en cheats zijn ingeburgerd en staan hier bewust niet in.
const ANGLICISMEN = [
  ['save', 'savegame (zelfstandig), opslaan (werkwoord)'], ['saves', 'savegames'], ['save slot', 'opslagplek'], ['save-slot', 'opslagplek'],
  ['host', 'gastheer'], ['checkpoint', 'controlepunt (race) of hervatpunt (opnieuw beginnen)'], ['checkpoints', 'controlepunten'],
  ['ghost', 'spook of spookrijder'], ['ghosts', 'spookrijders'], ['chain', 'keten'], ['run', 'ronde, rit of poging'], ['runs', 'rondes'],
  ['trick', 'kunstje of toer'], ['tricks', 'kunstjes of toeren'], ['boost', 'versnelling of stoot'], ['combo', 'reeks'], ['combo\'s', 'reeksen'],
  ['livestream', 'uitzending'], ['deadline', 'uiterste tijd'], ['shopaholic', 'winkelverslaafde'], ['total loss', 'afgeschreven'], ['lobby', 'wachtkamer of kamer'], ['loadout', 'uitrusting'],
  ['hole', 'baan'], ['holes', 'banen'],
];
// markup en selectors zijn geen tekst: attributen als data-action="save" en [data-boost] of .pm-rail-acts niet meekijken
const stripMarkup = (t) => t.replace(/\b(?:data-[\w-]+|class|id|for|name|type|role|href|src)="[^"]*"/g, ' ').replace(/\bdata-[\w-]+/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/(?<![\p{L}\p{N}])[.#][a-z][\w-]*/gu, ' ');

const FIXED = [
  { rule: 'de-grunn', re: /\bde Grunn\b(?!e|\w)/i, note: "'de Grunn' mag niet; het is 'Grunn'" },
];

// ---------------------------------------------------------------- allowlist
// Intentional cases. `term` is the matched word (case-insensitive), `file`/`ctx` narrow it
// (substring of the path / of the string). Every entry needs a reason (`why`).
export const ALLOW = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'text_audit_allow.json'), 'utf8')).allow;

const isAllowed = (f) => ALLOW.find((a) => (a.rule === '*' || a.rule === f.rule) && (!a.term || a.term.toLowerCase() === f.term.toLowerCase()) && (!a.file || f.file.includes(a.file)) && (!a.ctx || f.text.includes(a.ctx)));

// ---------------------------------------------------------------- the checks

const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (w, cs) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}(?![\\p{L}\\p{N}])`, cs ? 'u' : 'iu');
const BRAND_RES = BRANDS.map((b) => ({ ...b, re: wordRe(b.w, b.cs) }));
const PEOPLE_RES = PEOPLE.map((w) => ({ w, re: wordRe(w, true) }));
const ANGLI_RES = ANGLICISMEN.map(([w, nl]) => ({ w, nl, re: wordRe(w, false) }));

export function checkText(text) {
  const found = [];
  for (const b of BRAND_RES) { const m = b.re.exec(text); if (m) found.push({ rule: 'merk', term: m[0], note: `echt merk of bedrijf (${b.cat})` }); }
  for (const p of PEOPLE_RES) { const m = p.re.exec(text); if (m) found.push({ rule: 'persoon', term: m[0], note: 'echte persoon' }); }
  const nameRe = new RegExp(`(?<![\\p{L}])(${FIRST.join('|')}) ((?:van|de|den|der|ter|ten|te|het|'t)(?: (?:de|den|der|het|'t))? )?[A-Z][\\p{L}'-]{2,}`, 'gu');
  for (const m of text.matchAll(nameRe)) found.push({ rule: 'naam', term: m[0], note: 'vermoedelijke persoonsnaam' });
  for (const w of WINTER) { const m = w.exec(text); if (m) found.push({ rule: 'winter', term: m[0], note: 'winterwoord (altijd zomer)' }); }
  const kaal = stripMarkup(text);
  for (const a of ANGLI_RES) { const m = a.re.exec(kaal); if (m) found.push({ rule: 'anglicisme', term: m[0], note: `Engels leenwoord; zeg: ${a.nl}` }); }
  for (const f of FIXED) { const m = f.re.exec(text); if (m) found.push({ rule: f.rule, term: m[0], note: f.note }); }
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  if (words.length >= 3) {
    const hits = [...new Set(words.filter((w) => EN.has(w)))];
    const strong = hits.filter((w) => EN_STRONG.has(w));
    if (strong.length >= 2 || (hits.length >= 3 && hits.length / words.length >= 0.3)) found.push({ rule: 'engels', term: hits.join(' '), note: 'Engelse functiewoorden in speltekst' });
  }
  // alleen woorden die in het Nederlands niet voorkomen ('wie', 'die', 'der', 'pas', 'je', 'mit' wel)
  const DE = new Set('und ich nicht ist ein eine wir sie wo bitte danke guten haben wunderschön für auch noch das aber viele sehr schön herrlich dieser entschuldigung sprechen'.split(' '));
  const FR = new Set('bonjour merci très vous nous est avec pour dans une des mais'.split(' '));
  const lw = text.toLowerCase().match(/[a-zäöüßéèç]+/g) || [];
  if (lw.length >= 2) {
    const de = [...new Set(lw.filter((w) => DE.has(w)))];
    if (de.length >= 2) found.push({ rule: 'duits', term: de.join(' '), note: 'Duitse tekst in speltekst' });
    const fr = [...new Set(lw.filter((w) => FR.has(w)))];
    if (fr.length >= 2) found.push({ rule: 'frans', term: fr.join(' '), note: 'Franse tekst in speltekst' });
  }
  return found;
}


export function audit({ voiced = null } = {}) {
  const findings = [];
  for (const it of collectTexts()) {
    if (!isProse(it.text)) continue;
    for (const f of checkText(it.text)) {
      const full = { ...it, ...f };
      full.allowed = isAllowed(full) || null;
      full.ingesproken = voiced ? voiced(it) : false;
      findings.push(full);
    }
  }
  const seen = new Set();
  return findings.filter((f) => { const k = `${f.file}:${f.line}:${f.rule}:${f.term}:${f.text}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

// ---------------------------------------------------------------- CLI

// Every text that has a recording: the keys of all voiceline manifests are `speaker|text`
// (optionally `~m|` / `~f|` for the sex-specific variants).
export async function voicedLookup() {
  const root = path.join(REPO, 'game', 'audio', 'voicelines');
  const set = new Set();
  const addManifest = (f) => {
    try { for (const k of Object.keys(JSON.parse(fs.readFileSync(f, 'utf8')))) set.add(k.slice(k.indexOf('|') + 1)); } catch { /* unreadable manifest: skip */ }
  };
  const scan = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) scan(path.join(d, e.name));
      else if (e.name === 'manifest.json') addManifest(path.join(d, e.name));
    }
  };
  scan(root);
  return (it) => set.has(it.text);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const findings = audit({ voiced: await voicedLookup() });
  const open = findings.filter((f) => !f.allowed);
  if (args.includes('--json')) console.log(JSON.stringify(findings, null, 1));
  else {
    const show = args.includes('--all') ? findings : open;
    for (const f of show) console.log(`[${f.rule}] ${f.file}:${f.line}${f.ingesproken ? ' (ingesproken)' : ''}: ${f.term} | ${f.text.replace(/\s+/g, ' ').slice(0, 140)}${f.allowed ? `  -- toegestaan: ${f.allowed.why}` : ''}`);
    console.log(`${open.length} bevindingen (${findings.length - open.length} toegestaan)`);
  }
  process.exit(open.length ? 1 : 0);
}
