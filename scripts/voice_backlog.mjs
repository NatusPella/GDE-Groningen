// Maakt docs/verhaal/TTS-ACHTERSTAND-21-11.md: welke spreekregels het spel toont of laat horen zonder opname,
// per stem, per missie en per prioriteit, met tekens en geschatte kosten (#735 #924 #987).
// Alleen lezen: geen TTS-aanroep, geen netwerk, geen .env; het enige wat wordt geschreven is het doc (met --write).
//   node scripts/voice_backlog.mjs            schrijft het rapport naar stdout
//   node scripts/voice_backlog.mjs --write    schrijft docs/verhaal/TTS-ACHTERSTAND-21-11.md
//   node scripts/voice_backlog.mjs --check    faalt als het doc achterloopt op de bron
// voice_coverage.mjs ziet alleen wat in scripts/voicelines_collect.mjs is geregistreerd en de verhaalregels van
// script.json. Dit script zoekt daarnaast de spreekbronnen in game/js die er niet in staan (terugkeervignetten,
// doelregels en keuzegesprekken van de nieuwe missies, opgevangen gebabbel) en telt wat bewust stil is.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collect, isVoiced, manifest, REPO } from './voicelines_collect.mjs';
import { DUO } from './tts_cast.mjs';

const OUT = path.join(REPO, 'docs', 'verhaal', 'TTS-ACHTERSTAND-21-11.md');
const JS = path.join(REPO, 'game', 'js');
const rd = (p) => fs.readFileSync(path.join(REPO, p), 'utf8');
const nl = (n) => Number(n).toLocaleString('nl-NL');
const usd = (n) => '$' + n.toFixed(2).replace('.', ',');
const cell = (t, n = 70) => { const s = String(t).replace(/\|/g, '\\|').replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// Prijsmodel van scripts/gemini_tts.py (AUDIO_TPS 25 tokens per seconde, flash-lite $6 per miljoen) en de
// lengteschatting van tts_lines.py (tekens / 14 + 0,6 s per clip).
const AUDIO_TPS = 25, PRICE_PER_M = 6;
const est = (chars, clips) => { const secs = chars / 14 + 0.6 * clips; return { secs, usd: secs * AUDIO_TPS * PRICE_PER_M / 1e6 }; };
const fmtDur = (s) => (s >= 90 ? `${Math.round(s / 60)} min audio` : `${Math.round(s)} s audio`);

// --- wat de opnames al hebben ------------------------------------------------------------------------------------
const keys = new Set();
for (const n of fs.readdirSync(path.join(REPO, 'game', 'audio', 'voicelines'))) {
  const p = path.join(REPO, 'game', 'audio', 'voicelines', n, 'manifest.json');
  if (fs.existsSync(p)) for (const k of Object.keys(JSON.parse(fs.readFileSync(p, 'utf8')))) keys.add(k);
}
const hasKey = (speaker, text) => keys.has(speaker + '|' + text) || keys.has(speaker + '|…' + text) || keys.has(speaker + '|… ' + text);
const spoken = JSON.parse(rd('scripts/gronings_spoken.json'));

// --- stemprofielen (scripts/tts_cast.mjs en de CAST in scripts/tts_lines_list.mjs) ----------------------------
const profile = new Map();
for (const [k, v] of Object.entries(DUO)) profile.set(k, { voice: v.voice, taal: /Gronings/.test(v.accent) ? 'Gronings (spreektekst nodig)' : 'Nederlands' });
const castSrc = rd('scripts/tts_lines_list.mjs');
for (const m of castSrc.matchAll(/^\s+(?:'([^']+)'|([A-Za-z]\w*)|\[NARRATOR\]): \{ voice: '(\w+)'(?:[^\n]*?accent: ([^,}]+))?/gm)) {
  const name = m[1] || m[2] || 'Rikus';
  if (!profile.has(name)) profile.set(name, { voice: m[3], taal: m[4] && /GRO_ACCENT|Gronings/.test(m[4]) ? 'Gronings (spreektekst nodig)' : m[4] ? 'Nederlands (met accent)' : 'zie profiel' });
}
// De stem waaronder een bronregel wordt opgenomen
const NAMEFIX = { Tessa: 'Anita', Berend: 'Berend Bos', Jelle: 'Jelle Terpstra' };
const stemVan = (n) => NAMEFIX[n] || n;
const needsSpoken = (speaker) => (profile.get(stemVan(speaker)) || {}).taal === 'Gronings (spreektekst nodig)';

// --- 1. wat het gereedschap al meet ------------------------------------------------------------------------------------
const collected = collect();
const registered = { total: collected.length, voiced: collected.filter(isVoiced).length };
registered.missing = registered.total - registered.voiced;
const script = JSON.parse(rd('game/storydata/script.json'));
const sl = script.scenes.flatMap((s) => s.lines);
const story = { total: sl.length, appStil: sl.filter((l) => l.channel === 'app-stil').length, textOnly: sl.filter((l) => l.textOnly && l.channel !== 'app-stil').length };
const collectSrc = rd('scripts/voicelines_collect.mjs');
const pending = [...(collectSrc.match(/const PENDING_TTS = new Set\(\[([\s\S]*?)\]\)/)?.[1] || '').matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
const techHints = [...(collectSrc.match(/const TECH_HINTS = new Set\(\[([\s\S]*?)\]\)/)?.[1] || '').matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
const stilFile = JSON.parse(rd('scripts/voice_stil.json'));

// --- 2. bronnen die voice_coverage niet ziet -----------------------------------------------------------------------
// Elke regel: { bron, groep, missie, stem, tekst, kanaal, status }
const lijst = [];
const push = (r) => lijst.push(r);

// 2a. De restpunten die het gereedschap bewust uitsluit
for (const t of pending) push({ cat: 'rest', bron: 'cinematics.js (PENDING_TTS)', missie: 'wereld', stem: 'Rikus', tekst: t, manifest: 'lines', prio: 1 });
for (const s of stilFile.heropname) push({ cat: 'heropname', bron: s.bron, missie: 'inclusieve taal', stem: s.stem.replace(/ \(.*\)$/, ''), tekst: s.wordt, manifest: 'lines', prio: 3, check: 'oude opname klinkt nog; nieuwe tekst vervangt hem' });
for (const s of stilFile.stil) push({ cat: 'stil', bron: 'voice_stil.json', missie: 'inclusieve taal', stem: /KEI|Kiezel/.test(s.text) ? 'Kiekdoar-redactie' : 'Voetganger (bel)', tekst: s.text, manifest: /Kiezel/.test(s.text) ? 'sms' : 'lines', prio: 3, check: s.why });

// 2b. Terugkeervignetten (game/js/terugkeerscenes.js): ondertitels van Tammo en Tessa, geen opname
const { VIGNETTEN } = await import(pathToFileURL(path.join(JS, 'terugkeerscenes.js')).href);
for (const v of VIGNETTEN) for (const [who, tekst] of v.regels) {
  const stem = who === 'tammo' ? 'Tammo' : 'Anita';
  if (!hasKey(who === 'tammo' ? 'Tammo' : 'Tessa', tekst)) push({ cat: 'terugkeer', bron: 'terugkeerscenes.js', missie: `Terugkeer fase ${v.fase}`, stem, tekst, manifest: 'lines', prio: 2 });
}

// 2c. Doelregels (`say:`) en keuzegesprekken in de nieuwe missiebestanden
const missieBestanden = fs.readdirSync(JS).filter((f) => /^missions_(nieuw|akte\d)\.js$/.test(f)).sort();
const akteVan = (f) => (f === 'missions_nieuw.js' ? 'akte 1-3' : f.replace('missions_', '').replace('.js', '').replace('akte', 'akte '));
const prioVan = (f) => (/nieuw|akte2/.test(f) ? 1 : 2);
const STR = "('(?:[^'\\\\]|\\\\.)*')";
for (const f of missieBestanden) {
  const lines = fs.readFileSync(path.join(JS, f), 'utf8').split('\n');
  let missie = f;
  const seen = new Set();
  lines.forEach((ln, i) => {
    const lab = /^ {4,6}label: '((?:[^'\\]|\\.)*)'/.exec(ln);
    if (lab) missie = lab[1].replace(/\\'/g, "'");
    for (const m of ln.matchAll(new RegExp(`\\bsay(?:Hijacked)?: ${STR}|\\.say = ${STR}`, 'g'))) {
      let t; try { t = eval(m[1] || m[2]); } catch { continue; }
      if (seen.has(t) || t.split(' ').length < 3) continue; seen.add(t);
      for (const stem of ['Tammo', 'Anita']) if (!hasKey(stem, t)) push({ cat: 'doelregel', bron: f, missie: `${akteVan(f)}: ${missie}`, stem, tekst: t, manifest: 'hints', prio: prioVan(f) });
    }
    const q = new RegExp(`\\bwho: ${STR}, text: ${STR}`).exec(ln);
    if (q) { const who = eval(q[1]), t = eval(q[2]); if (!hasKey(who, t)) push({ cat: 'vraag', bron: f, missie: `${akteVan(f)}: ${missie}`, stem: who, tekst: t, manifest: 'lines', prio: prioVan(f) }); }
    for (const m of ln.matchAll(new RegExp(`\\breply: ${STR}`, 'g'))) {
      let t; try { t = eval(m[1]); } catch { continue; }
      // een reactie begint soms met een verteller of een naam: dat is verteltekst, geen spreekregel
      const verteller = /^[A-Z][a-zë]+( [a-z]+)?:? ?"/.test(t) || /\b(hij|zij|ze|haar|zijn)\b.*\.$/i.test(t) && !/^"/.test(t) && /^[A-Z][a-zë]+ [a-zë]+/.test(t) && /(knikt|kucht|slikt|schuift|kijkt|schrijft)/.test(t);
      push({ cat: 'reactie', bron: f, missie: `${akteVan(f)}: ${missie}`, stem: 'NPC (zie vraag)', tekst: t, manifest: 'lines', prio: 3, check: verteller ? 'verteltekst, geen spreekregel' : 'tekst en spreker eerst bevestigen' });
    }
  });
}

// 2d. Opgevangen gebabbel (game/js/gebabbel.js): bewust alleen tekst
const { GEBABBEL } = await import(pathToFileURL(path.join(JS, 'gebabbel.js')).href);
const babbel = GEBABBEL.flatMap((g) => g.lines.map(([stem, tekst]) => ({ stem, tekst })));

// --- 3. totalen -------------------------------------------------------------------------------------------------------
const clips = (rs) => rs.length;
const chars = (rs) => rs.reduce((a, r) => a + r.tekst.length, 0);
const sum = (rs) => { const e = est(chars(rs), clips(rs)); return { n: rs.length, chars: chars(rs), secs: e.secs, usd: e.usd }; };
const row = (label, rs) => { const s = sum(rs); return `| ${label} | ${nl(s.n)} | ${nl(s.chars)} | ${fmtDur(s.secs)} | ${usd(s.usd)} |`; };
const geblokkeerd = (rs) => rs.filter((r) => needsSpoken(r.stem) && !(r.tekst in spoken));
const groupBy = (rs, f) => { const m = new Map(); for (const r of rs) { const k = f(r); (m.get(k) || m.set(k, []).get(k)).push(r); } return m; };

const opneembaar = lijst.filter((r) => r.cat !== 'reactie' && r.cat !== 'stil');
const batch1 = opneembaar.filter((r) => r.prio === 1);
const batch2 = opneembaar.filter((r) => r.prio === 2);
const batch3 = [...lijst.filter((r) => r.prio === 3 && r.cat !== 'stil'), ...lijst.filter((r) => r.cat === 'stil')];
const batch3b = babbel.map((b) => ({ ...b, stem: b.stem }));
const alles = [...batch1, ...batch2, ...batch3];

const md = [];
const w = (s = '') => md.push(s);
const B = (n) => ['', batch1, batch2, batch3][n];

w('# TTS-achterstand 21-11: welke spreekregels hebben nog geen stem');
w();
w('Gegenereerd door `node scripts/voice_backlog.mjs --write`; niet met de hand aanpassen (`--check` laat zien of dit doc achterloopt). Alleen gelezen uit de bron: er is geen TTS-aanroep gedaan, geen netwerk gebruikt en `.env` is niet geopend. De eigenaar beslist over het opnemen (kosten; besluit 20-10: geen nieuwe TTS zonder akkoord).');
w();
w('## Kern');
w();
w(`- **Wat het gereedschap meet is op nul:** \`voice_coverage.mjs\` meldt ${nl(registered.voiced)}/${nl(registered.total)} geregistreerde regels en ${nl(story.total - story.appStil - story.textOnly)}/${nl(story.total - story.appStil)} verhaalregels (\`script.json\`) ingesproken; ${story.appStil} stille appjes zijn bewust zonder stem. De regels die in de melding van de eigenaar en in oudere docs als "nog te doen" staan zijn al opgenomen: Geesje (18), Rotor Roelf (2) en Tessa (10) in commit 7277a5a9c van 20-11 (herkomst in \`tts.json\`). De docs \`EIGENAAR-ACTIELIJST.md\`, \`EERSTE-30-MINUTEN-20-11.md\` en \`.specs-fire/standards/verhaal.md\` ("37 hebben geen opname") lopen daarop achter.`);
w(`- **Wat er wel ontbreekt** staat buiten het gereedschap: spreekbronnen in \`game/js\` die niet in \`scripts/voicelines_collect.mjs\` zijn geregistreerd. Daarom meldt \`voice_coverage\` groen terwijl een speler wel ondertitels zonder stem hoort: **${nl(alles.length)} regels, ${nl(chars(alles))} tekens, ca. ${usd(sum(alles).usd)}** (zonder gebabbel; met alles erbij ${usd(sum([...alles, ...batch3b]).usd)}).`);
w(`- Zodra een bron is geregistreerd telt \`voice_coverage\` hem mee en maakt \`tts_lines_list.mjs\` er opdrachten van. Tot die code-stap (zie "Voorwaarden") kan geen enkele nieuwe regel worden opgenomen.`);
w();
w('## 1. Wat al klopt (geen werk)');
w();
w('| Bron | Stand |');
w('|---|---|');
w(`| \`voice_coverage.mjs\`, geregistreerde tabellen | ${nl(registered.voiced)}/${nl(registered.total)} met stem |`);
w(`| \`script.json\` (verhaal), regels met opname | ${nl(story.total - story.appStil - story.textOnly)} van ${nl(story.total - story.appStil)} (${story.textOnly} zonder) |`);
w(`| Stille appjes (\`channel: app-stil\`), bewust | ${story.appStil} |`);
w(`| \`TECH_HINTS\` (technische wachtmelding, geen stem) | ${techHints.length}: ${techHints.map((t) => '"' + t + '"').join(', ')} |`);
w('| Geesje (18), Rotor Roelf (2), Tessa (10) uit #735 en #924 | opgenomen op 20-11 (7277a5a9c) |');
w('| Tessa\'s Groningse clips van #924 | opnieuw ingesproken op 15-11 (367 + 21 + 2 clips) |');
w();
w('## 2. Wat er ontbreekt, per categorie');
w();
w('| Categorie | Regels | Tekens | Geschatte duur | Geschatte kosten |');
w('|---|---:|---:|---|---:|');
const CATS = [['rest', 'Restpunten: vertellersregels die de teller uitsluit (PENDING_TTS)'], ['terugkeer', 'Terugkeervignetten (flat, Tammo en Tessa)'], ['doelregel', 'Doelregels van de nieuwe missies (Tammo en Tessa zeggen ze om en om)'], ['vraag', 'Vragen in keuzegesprekken (Loket, Wiebelwerk, de bond)'], ['heropname', 'Heropname na inclusieve taal (oude opname klinkt nog)'], ['reactie', 'Reacties in keuzegesprekken (mix van spraak en verteltekst)'], ['stil', 'Bewust stil, tekst gewijzigd (voice_stil.json)']];
for (const [c, label] of CATS) w(row(label, lijst.filter((r) => r.cat === c)));
w(row('**Totaal ontbrekend (zonder gebabbel)**', lijst));
w(row('Opgevangen gebabbel (`gebabbel.js`, bewust alleen tekst)', batch3b));
w();
w('"Doelregels" tellen twee clips per tekst: het spel laat de partner (de ander dan jij) de kaart voorlezen, dus er zijn een Tammo- en een Tessa-opname nodig (zoals de 224 bestaande hints).');
w();
w('## 3. Per stem');
w();
w('| Stem (personage) | Gebruikte stemnaam | Taal | Regels | Tekens | Kosten | Wacht op Groningse spreektekst |');
w('|---|---|---|---:|---:|---:|---:|');
for (const [stem, rs] of [...groupBy(opneembaar, (r) => stemVan(r.stem)).entries()].sort((a, b) => b[1].length - a[1].length)) {
  const p = profile.get(stem) || { voice: '(geen profiel)', taal: 'onbekend' };
  w(`| ${stem === 'Anita' ? 'Tessa (intern Anita)' : stem} | ${p.voice} | ${p.taal} | ${rs.length} | ${nl(chars(rs))} | ${usd(sum(rs).usd)} | ${geblokkeerd(rs).length} |`);
}
w();
w('Een stem met "Gronings (spreektekst nodig)" kan pas worden opgenomen als de regel in `scripts/gronings_spoken.json` staat (`say_of` in `gemini_tts.py` stopt anders met een KeyError). Tessa spreekt standaard Nederlands (#134), dus haar regels hebben geen spreektekst nodig.');
w();
w('## 4. Per missie');
w();
w('| Missie of scène | Prioriteit | Regels | Tekens | Kosten | Wacht op spreektekst |');
w('|---|---|---:|---:|---:|---:|');
for (const [m, rs] of [...groupBy(opneembaar, (r) => r.missie).entries()].sort((a, b) => a[1][0].prio - b[1][0].prio || a[0].localeCompare(b[0]))) {
  w(`| ${cell(m, 60)} | ${rs[0].prio === 1 ? 'hoog' : 'middel'} | ${rs.length} | ${nl(chars(rs))} | ${usd(sum(rs).usd)} | ${geblokkeerd(rs).length} |`);
}
w();
w('## 5. Eerst tekstueel controleren, of botst met de constitution');
w();
const checks = [];
checks.push(['Reacties in keuzegesprekken', `${lijst.filter((r) => r.cat === 'reactie').length} regels`, 'Veel reacties zijn verteltekst ("Berend knikt langzaam. Hij schrijft niks op") of beginnen met een naam en een citaat. Eerst per regel bepalen: spreekregel van een NPC, of ondertitel van het scherm. Niet opnemen zonder die keuze.']);
checks.push(['Terugkeervignetten: spreker "Tessa"', `${lijst.filter((r) => r.cat === 'terugkeer' && r.stem === 'Anita').length} regels`, 'De scène zoekt de opname onder de spreker "Tessa" (`terugkeerRegels`, `NAME`), terwijl alle andere Tessa-opnames onder "Anita" staan en `linevoice.js` exact zoekt. Besluit eerst: de spreker in de vignetten op "Anita" zetten, of de opname onder "Tessa" bewaren.']);
checks.push(['Terugkeervignetten: Tammo', `${geblokkeerd(lijst.filter((r) => r.cat === 'terugkeer')).length} regels`, 'Tammo spreekt Gronings; elke regel heeft een spreektekst nodig die een kenner schrijft of goedkeurt (een agent verzint geen Gronings, constitution 1). Tessa\'s regels zijn gewoon Nederlands.']);
checks.push(['Doelregels van Tammo', `${geblokkeerd(lijst.filter((r) => r.cat === 'doelregel')).length} van ${lijst.filter((r) => r.cat === 'doelregel' && r.stem === 'Tammo').length} regels`, 'Zelfde reden: Groningse spreektekst voor Tammo. Verwerk eerst `gronings_merge_draft.mjs`.']);
checks.push(['Doelregels met cijfers, plaatsnamen en bedrijfsnamen', '(steekproef)', 'Een voorgelezen regel moet `node scripts/text_audit.mjs` en het merkenregister (`docs/MERKENREGISTER.md`) halen: Wiebelwerk, Spuit & Klaar, Delfstof Noord en EIKEA zijn verzonnen; alle namen opnieuw tegen het register leggen.']);
checks.push(['Doelregels met toetsen en tekens', '(steekproef)', '"W/S", "{W}", "(E)" worden door `spoken()` in `voicelines_collect.mjs` omgezet; bij nieuwe doelregels hetzelfde doen, anders leest de stem "slash" voor.']);
checks.push(['#987 M03.2 (Mevrouw Hoving, 1998, 1982, "sinds woensdag")', '5 regels van Mevrouw Hoving staan al op de band', 'De tekst is de dichtste van de eerste 30 minuten (`EERSTE-30-MINUTEN-20-11.md`, punt 6). Wordt de tekst herschreven, dan zijn die clips niet meer geldig (een andere letter maakt de regel stil): eerst tekst, dan eventueel opnieuw opnemen. Niet in een batch zetten.']);
checks.push(['Heropnames inclusieve taal', `${lijst.filter((r) => r.cat === 'heropname').length} regels`, 'De oude opname ("jongens") klinkt nog en is mild; de nieuwe tekst is al gekozen. Alleen opnemen als de eigenaar dat wil: de oude regel verdwijnt dan uit het spel zodra de tekst wisselt.']);
checks.push(['Kiekdoar-aankondiging Kiezelweek', '1 regel', 'De opname zegt "KEI-week", een echt evenement; de nieuwe tekst is stil. Opnemen is een duidelijke fix van een merk, dus wel meenemen in batch 3 of eerder.']);
w('| Wat | Omvang | Waarom eerst controleren |');
w('|---|---|---|');
for (const [a, b, c] of checks) w(`| ${a} | ${b} | ${c} |`);
w();
w('Echte namen of merken in de ontbrekende regels: een steekproef over de hoofdletterwoorden in de lijst vond alleen verzonnen namen en echte plaatsen (UMCG staat in het merkenregister als plek); het is geen volledige controle, want de controle loopt via `node scripts/text_audit.mjs` en het merkenregister, niet via dit script.');
w();
w('## 6. Bewust stil of geen spreektekst (staat niet in de batches)');
w();
w(`- **${story.appStil} stille appjes** (\`channel: app-stil\`) en de telefoonmeldingen zonder \`say\`.`);
w(`- **Opgevangen gebabbel** (\`game/js/gebabbel.js\`): ${nl(babbel.length)} korte regels van verzonnen figuren (Student, Bakker, Toerist en dergelijke), ${nl(chars(babbel))} tekens, ca. ${usd(sum(batch3b).usd)}. Ontwerp: alleen tekst. De regels zijn kort en van wisselende sprekers zonder vast stemprofiel; opnemen levert veel clips op voor weinig gehoor. Niet aanbevolen.`);
w('- **Systeemmeldingen** (`world.addMessage`, bijvoorbeeld "Te weinig geld: een eierbal kost €2"): HUD-tekst, geen spreekregel; ze worden alleen voorgelezen als ze in de hints-bank staan.');
w('- **Taxi-, bus- en treinstatus** (`taxistatus.js`, `busstatus.js`, `ovmissie.js`), de **regelkaarten**, de **kaartmeldingen** (`kaartonthulling.js`) en het **politielabel**: statuslabels in de HUD. Er is geen spreekregel gevonden; ze horen niet in een TTS-ronde.');
w('- `missionsdata_zij.js` (de bijzaken van de snackbar, Fatbikes in de Herenstraat), `missie_snackbar.js` en `kiekdoarregels.js` (`voiced: false`): in de bron staat "alles is tekst: geen opname, geen TTS". Dat blijft zo tot de eigenaar anders beslist.');
w();
w('## 7. Voorwaarden voor elk van de batches');
w();
w('1. **Registreren (code, geen TTS):** zet de bronnen in `scripts/voicelines_collect.mjs`, zodat `voice_coverage.mjs` ze meetelt en `tts_lines_list.mjs` er opdrachten van maakt (terugkeer: `VIGNETTEN` uit `terugkeerscenes.js`; doelregels: de `say:`-velden van `missions_nieuw.js` en `missions_akte2/4/5/6.js` naar de `hints`-bank met `hintWho`; vragen naar `lines`). Dit commit is klein en kost niets, maar `voice_coverage` wordt er rood van tot de opnames er zijn, dus alleen registreren per batch.');
w('2. **Groningse spreektekst voor Tammo** in `scripts/gronings_spoken.json` (kenner of eigenaar), daarna `node scripts/gronings_merge_draft.mjs --write`.');
w('3. **Besluit over de speaker "Tessa"** van de terugkeervignetten (zie punt 5).');
w('4. **Sleutel:** `LITELLM_API_KEY` in de omgeving of in de eigen `.env` van de eigenaar; een agent leest die niet. Route en model: `google/gemini-3.8-flash-lite-tts` via `litellm.natuspella.nl` (ADR 0019: nooit Flash).');
w();
w('## 8. Aanbevolen volgorde in drie batches');
w();
const bt = (rs) => { const s = sum(rs); return `${nl(s.n)} clips, ${nl(s.chars)} tekens, ${fmtDur(s.secs)}, ca. ${usd(s.usd)}`; };
const looptijd = (rs) => `ca. ${Math.max(1, Math.round(rs.length * 3 / 60))} tot ${Math.max(2, Math.round(rs.length * 6 / 60))} min (ruwe schatting, 3 tot 6 s per clip met normalisatie)`;
w('| Batch | Inhoud | Omvang | Looptijd | Wacht op |');
w('|---|---|---|---|---|');
w(`| 1 | De restpunten en de doelregels en vragen van het begin van het verhaal (Het Loket, akte 1 tot 3: de regels die iedere speler hoort) | ${bt(batch1)} | ${looptijd(batch1)} | registreren; spreektekst voor Tammo (${geblokkeerd(batch1).length} regels) |`);
w(`| 2 | De terugkeervignetten en de doelregels en vragen van akte 4, 5 en 6 | ${bt(batch2)} | ${looptijd(batch2)} | registreren; besluit speaker "Tessa"; spreektekst voor Tammo (${geblokkeerd(batch2).length} regels) |`);
w(`| 3 | Heropnames inclusieve taal, de stille Kiezelweek-regel en de reacties die na tekstcontrole een spreekregel blijken | ${bt(batch3)} | ${looptijd(batch3)} | tekstcontrole en akkoord van de eigenaar |`);
w();
w(`Alles samen ${bt(alles)}. Ter vergelijking: het hele nieuwe verhaal kostte op flash-lite ca. $0,55 (ADR 0019). De schatting volgt het prijsmodel van \`gemini_tts.py\` (${AUDIO_TPS} audiotokens per seconde, $${PRICE_PER_M} per miljoen, tekens gedeeld door 14 plus 0,6 s per clip) en is een bovengrens: de echte kosten lagen bij de laatste rondes lager.`);
w();
w('### Commando\'s per batch (niet uitgevoerd)');
w();
w('Draai ze in deze volgorde, op een schone werkboom, na stap 1 en 2 van "Voorwaarden". De droogloop vraagt geen sleutel en schrijft niets.');
w();
const budget = (rs) => Math.max(0.25, Math.ceil(sum(rs).usd * 2 * 4) / 4).toFixed(2);
for (const n of [1, 2, 3]) {
  const rs = B(n);
  w(`**Batch ${n}**`);
  w();
  w('```');
  w('node scripts/tts_lines_list.mjs');
  w(`node scripts/tts_opnameronde.mjs --dry --budget ${budget(rs)} --max ${rs.length + 10}`);
  w(`node scripts/tts_opnameronde.mjs --budget ${budget(rs)} --max ${rs.length + 10}`);
  w('node scripts/voice_coverage.mjs --quiet');
  w('node scripts/opnamelijst.mjs --check');
  w('node scripts/voice_backlog.mjs --write');
  w('```');
  w();
}
w('`tts_opnameronde.mjs` doet zelf de wachtrij, de opname (`scripts/tts_lines.py`) en `build_story_data.mjs`, en leest de sleutel niet. Het budget is het dubbele van de schatting; het script stopt als het bereikt is.');
w();
w('## 9. Risico\'s');
w();
w('- **Groen is geen dekking:** `voice_coverage` kijkt alleen naar wat is geregistreerd. Een nieuwe spreektabel zonder registratie valt buiten alle checks; deze lijst laat dat zien. Overweeg een regel in de regelaudit of `voice_backlog --check` in de releasegate.');
w('- **Een andere letter maakt een regel stil:** wordt een bronregel na de opname herschreven, dan is de clip weg (sleutel `<stem>|<tekst>`). Eerst de tekst vastzetten (batch 1 en 2 pas na de tekstcontrole van punt 5).');
w('- **Gronings voor Tammo:** zonder spreektekst stopt `tts_lines.py` met een KeyError; de regels staan dan als "GEBLOKKEERD" in de droogloop.');
w('- **Afspelen is niet bekeken:** of de terugkeerscène en de doelkaart de nieuwe clips goed afspelen (duur, volgorde, `plannedVoiceLines`) is niet getest; dit rapport gebruikt alleen de bron. Na een batch: één Electron-run met `--story-test` en luisteren naar de eerste scènes.');
w('- **Kosten en tegoed:** de gateway rekent per clip; de schatting is grof. De eerdere beperking (AI Studio: 100 aanvragen per dag, 29-10) geldt alleen voor de directe route, niet voor de gateway.');
w('- **Merken en echte namen:** ieder nieuw stuk tekst moet door `text_audit.mjs` en het merkenregister voordat het wordt opgenomen; een opname van een fout merk is niet terug te draaien zonder heropname.');
w();
w('## 10. Wat de eigenaar moet beslissen');
w();
w('1. Wil de eigenaar de doelregels van de nieuwe missies laten voorlezen (ca. dezelfde stijl als de bestaande 224 hints), of blijven ze kaarten zonder stem? (Batch 1 en 2.)');
w('2. Wil de eigenaar de terugkeervignetten inspreken? Dat vraagt een Groningse spreektekst voor Tammo en een besluit over de naam "Tessa" in de bank.');
w('3. Mogen de heropnames voor inclusieve taal en de Kiezelweek-regel mee (batch 3)?');
w('4. Welk budget geldt voor deze ronde (de schatting staat in de tabellen; opnemen wordt pas gestart na zijn akkoord)?');
w('5. Blijft het gebabbel en de bijzaken-tekst (`missionsdata_zij.js`, `missie_snackbar.js`) bewust stil?');
w();
w('## Bijlage: alle ontbrekende regels');
w();
for (const [c, label] of CATS) {
  const rs = lijst.filter((r) => r.cat === c);
  if (!rs.length) continue;
  w(`### ${label} (${rs.length})`);
  w();
  w('| Bron | Missie of scène | Stem | Tekst | Opmerking |');
  w('|---|---|---|---|---|');
  for (const r of rs) w(`| ${r.bron} | ${cell(r.missie, 50)} | ${r.stem} | ${cell(r.tekst, 90)} | ${r.check || (needsSpoken(r.stem) && !(r.tekst in spoken) ? 'spreektekst nodig' : '')} |`);
  w();
}
const out = md.join('\n') + '\n';

const args = process.argv.slice(2);
if (args.includes('--write')) { fs.writeFileSync(OUT, out); console.log(`TTS-ACHTERSTAND-21-11.md: ${alles.length} regels (batch 1: ${batch1.length}, batch 2: ${batch2.length}, batch 3: ${batch3.length}), ${usd(sum(alles).usd)}`); }
else if (args.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== out) { console.log('docs/verhaal/TTS-ACHTERSTAND-21-11.md loopt achter: draai node scripts/voice_backlog.mjs --write'); process.exit(1); }
  console.log('TTS-ACHTERSTAND-21-11.md: actueel');
} else process.stdout.write(out);
