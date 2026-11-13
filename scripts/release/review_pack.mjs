// Reviewpakket voor de AI-code-review van een release (deel van de releasegate).
// Maakt uit de diff sinds de vorige tag één Nederlands pakket met de gewijzigde bestanden,
// de verplichte reviewaspecten en een begrensde diff, plus review-required.json voor de triage.
//
//   node scripts/release/review_pack.mjs --from=vX.Y.Z [--to=HEAD] [--out=<map>]
//        [--diff=<file>] [--files=<json>] [--max-lines=4000] [--aspecten=a,b]
//
// Zonder --diff haalt de CLI zelf `git diff <from>..<to>` en `git diff --name-status` op en
// schrijft <out>/review-pack.md en <out>/review-required.json. Exit 0 ok, 2 fout.
// De pure functie buildReviewPack() werkt op een aangeleverde diff, zodat de test zonder git kan.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DEFAULT_MAX_LINES = 4000;
const PER_FILE_MAX = 400;

// Vaste volgorde van de systemen in het pakket en van de aspecten in review-required.json.
const SYSTEMS = ['game/js', 'game/css', 'game/html', 'scripts', 'desktop', 'web', 'android', 'docs', 'data', 'onbekend'];
const ASPECT_ORDER = ['correctness', 'rules', 'design', 'perf', 'gameplay', 'ux', 'multiplayer', 'privacy', 'vision'];

const STATUS_LABELS = { A: 'nieuw', M: 'gewijzigd', D: 'verwijderd', R: 'hernoemd', C: 'gekopieerd' };

// ---------------------------------------------------------------- bestanden en systemen

const normalizePath = (p) => String(p || '').replace(/\\/g, '/').replace(/^\.\//, '');
const normalizeStatus = (status) => {
  const letter = String(status || 'M').trim().charAt(0).toUpperCase();
  return 'AMDRC'.includes(letter) ? letter : 'M';
};

function systemFor(file) {
  const p = normalizePath(file);
  if (p.startsWith('game/js/')) return /\.css$/i.test(p) ? 'game/css' : 'game/js';
  if (p.startsWith('game/css/')) return 'game/css';
  if (p.startsWith('game/html/')) return 'game/html';
  if (/^game\/[^/]+\.css$/i.test(p)) return 'game/css';
  if (/^game\/[^/]+\.html?$/i.test(p)) return 'game/html';
  if (/^game\//.test(p)) return 'data';
  if (/^scripts\//.test(p)) return 'scripts';
  if (/^desktop\//.test(p)) return 'desktop';
  if (/^web\//.test(p)) return 'web';
  if (/^android\//.test(p)) return 'android';
  if (/^data\//.test(p)) return 'data';
  if (/^docs\//.test(p) || /^\.specs-fire\//.test(p) || /^licenses\//.test(p) || /\.(?:md|txt)$/i.test(p)) return 'docs';
  return 'onbekend';
}

// Pad -> status uit de uitvoer van `git diff --name-status` (R/C hebben twee paden).
export function parseNameStatus(text) {
  const files = {};
  for (const line of String(text || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    const status = normalizeStatus(parts[0]);
    const file = status === 'R' || status === 'C' ? parts[parts.length - 1] : parts[1];
    if (file) files[normalizePath(file)] = status;
  }
  return files;
}

// Aangeleverde bestanden: object {pad: status}, array paden of array {pad,status}.
export function normalizeFiles(data) {
  const files = {};
  if (!data) return files;
  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item === 'string') {
        if (!item.trim()) continue;
        const parts = item.split('\t');
        if (parts.length >= 2) files[normalizePath(parts[parts.length - 1])] = normalizeStatus(parts[0]);
        else files[normalizePath(item)] = 'M';
        continue;
      }
      if (item && typeof item === 'object') {
        const file = item.pad || item.bestand || item.path || item.file;
        if (file) files[normalizePath(file)] = normalizeStatus(item.status);
      }
    }
    return files;
  }
  if (typeof data === 'object') {
    const source = data.bestanden || data.files || data;
    for (const [file, status] of Object.entries(source)) files[normalizePath(file)] = normalizeStatus(status);
  }
  return files;
}

// Leest --files: een pad naar een JSON-bestand of inline JSON (object of array).
export function readFilesArgument(value) {
  const text = String(value || '').trim();
  if (!text) return {};
  const data = text.startsWith('{') || text.startsWith('[')
    ? JSON.parse(text)
    : JSON.parse(fs.readFileSync(path.resolve(text), 'utf8'));
  return normalizeFiles(data);
}

// ---------------------------------------------------------------- diff splitsen

// Splitst een unified diff in één blok per bestand met kop (vóór de eerste @@) en romp.
export function parseDiff(text) {
  const lines = String(text || '').split(/\r?\n/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const raw = [];
  let current = null;
  const preamble = [];
  for (const line of lines) {
    const match = /^diff --git a\/(.*) b\/(.*)$/.exec(line);
    if (match) {
      if (current) raw.push(current);
      current = { a: match[1], b: match[2], lines: [line] };
      continue;
    }
    if (current) current.lines.push(line);
    else if (line.trim()) preamble.push(line);
  }
  if (current) raw.push(current);

  const entries = raw.map((block) => {
    const blockText = block.lines.join('\n');
    let status = 'M';
    if (/^new file mode /m.test(blockText)) status = 'A';
    else if (/^deleted file mode /m.test(blockText)) status = 'D';
    else if (/^rename from /m.test(blockText)) status = 'R';
    else if (/^copy from /m.test(blockText)) status = 'C';
    const file = normalizePath(status === 'D' ? block.a : block.b);
    const hunkIndex = block.lines.findIndex((line) => line.startsWith('@@'));
    const header = hunkIndex >= 0 ? block.lines.slice(0, hunkIndex) : block.lines.slice();
    const body = hunkIndex >= 0 ? block.lines.slice(hunkIndex) : [];
    return {
      file,
      status,
      header,
      body,
      original: block.lines.length,
      added: body.filter((line) => line.startsWith('+') && !line.startsWith('+++')).length,
    };
  });
  return { entries, preamble };
}

// Houdt van een te groot blok de kop en de eerste/laatste regels over, met een INGEKORT-regel.
function truncateChunk(entry, maxLines, reason) {
  const total = entry.header.length + entry.body.length;
  if (total <= maxLines) {
    return { entry: { ...entry, display: [...entry.header, ...entry.body] }, truncation: null };
  }
  const available = Math.max(0, maxLines - 1);
  let header = entry.header;
  let body = entry.body;
  let headCount = 0;
  let tailCount = 0;
  if (body.length) {
    // De kop (diff-header) gaat altijd mee; minstens twee rompregels als dat past.
    header = header.slice(0, Math.min(header.length, Math.max(0, available - 2)));
    const bodyBudget = Math.max(0, available - header.length);
    headCount = Math.ceil(bodyBudget / 2);
    tailCount = bodyBudget - headCount;
    body = [...body.slice(0, headCount), ...body.slice(body.length - tailCount)];
  } else {
    header = header.slice(0, available);
  }
  const cut = total - (header.length + body.length);
  const marker = `INGEKORT: ${cut} regels (bestand had ${total} regels; eerste ${headCount} en laatste ${tailCount} opgenomen${reason ? `; ${reason}` : ''})`;
  return {
    entry: { ...entry, display: [...header, marker, ...body], truncated: true },
    truncation: { bestand: entry.file, status: entry.status, origineel: total, opgenomen: header.length + 1 + body.length, ingekort: cut, reden: reason || 'per bestand' },
  };
}

// Begrenst de hele diff op maxLines, met per bestand een maximum van perFileMax regels.
export function limitDiff(entries, maxLines = DEFAULT_MAX_LINES, perFileMax = PER_FILE_MAX) {
  const limited = [];
  const truncations = [];
  let used = 0;
  for (const entry of entries) {
    const total = entry.header.length + entry.body.length;
    const remaining = maxLines - used;
    if (remaining <= 0) {
      // Geen ruimte meer: het bestand komt alleen in de inkortingenlijst, niet in de diff.
      truncations.push({ bestand: entry.file, status: entry.status, origineel: total, opgenomen: 0, ingekort: total, reden: 'totaalregel' });
      continue;
    }
    const maxForFile = Math.min(perFileMax, remaining);
    if (maxForFile <= 1) {
      // Er is geen ruimte meer: alleen een regel dat dit bestand niet is opgenomen.
      const marker = `INGEKORT: ${total} regels (totaalregel --max-lines=${maxLines} bereikt; bestand niet opgenomen)`;
      limited.push({ ...entry, display: [marker], truncated: true });
      truncations.push({ bestand: entry.file, status: entry.status, origineel: total, opgenomen: 1, ingekort: total, reden: 'totaalregel' });
      used += 1;
      continue;
    }
    const reason = maxForFile < Math.min(perFileMax, total) ? 'totaalregel --max-lines' : 'per bestand';
    const { entry: shortened, truncation } = truncateChunk(entry, maxForFile, reason);
    limited.push(shortened);
    used += shortened.display.length;
    if (truncation) truncations.push(truncation);
  }
  return { entries: limited, truncations, used, maxLines };
}

// ---------------------------------------------------------------- aspecten

const HOT_PATH = /(scene3d|tilestore|gfxprofile|renderer|vehicle|bot|perf|worldbuilder)/i;
const GAMEPLAY = /(missie|mission|verhaal|story|opdracht|quest|minigame|activit|gameplay)/i;
const UI_NAME = /(menu|hud|ui|interface|a11y|toegankelijk|logo)/i;
const MULTIPLAYER = /(^|\/)(multiplayer|net|coop)(\/|\.|_|-|$)/i;
const STORAGE = /(^|\/)(save|saves|savegame|storage|opslag|persist|settings)(\/|\.|_|-|$)/i;

const isDesignFile = (p) => /\.(css|html?)$/i.test(p) || (/^(game|web)\//.test(p) && UI_NAME.test(path.posix.basename(p)));
const isUxFile = (p) => isDesignFile(p) || (/^(game|web)\//.test(p) && UI_NAME.test(p));
const isPerfFile = (p) => HOT_PATH.test(p);
const isGameplayFile = (p) => GAMEPLAY.test(p);
const isMultiplayerFile = (p) => MULTIPLAYER.test(p);
const isStorageFile = (p) => STORAGE.test(p);

// Privacy: netwerk- of opslagwijzigingen. In de diff zoeken we naar de bekende opslag- en netwerkaanroepen.
function privacyFromDiff(entries) {
  const pattern = /localStorage|sessionStorage|indexedDB|navigator\.sendBeacon|\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket|\bsave[A-Za-z]*\s*\(|\bopslaan\b|\bopslag\b|https?:\/\//i;
  for (const entry of entries) {
    for (const line of entry.body) {
      if (!line.startsWith('+') || line.startsWith('+++')) continue;
      if (pattern.test(line.slice(1))) return true;
    }
  }
  return false;
}

// Bepaalt de verplichte reviewaspecten; extra aspecten (--aspecten) komen erbij.
export function determineAspects(files, entries = [], extra = []) {
  const aspects = new Set(['correctness', 'rules']);
  for (const file of Object.keys(files)) {
    if (isDesignFile(file)) aspects.add('design');
    if (isUxFile(file)) aspects.add('ux');
    if (isPerfFile(file)) aspects.add('perf');
    if (isGameplayFile(file)) aspects.add('gameplay');
    if (isMultiplayerFile(file)) aspects.add('multiplayer');
    if (isMultiplayerFile(file) || isStorageFile(file)) aspects.add('privacy');
  }
  if (privacyFromDiff(entries)) aspects.add('privacy');
  for (const aspect of extra || []) {
    const name = String(aspect || '').trim().toLowerCase();
    if (name) aspects.add(name);
  }
  const known = ASPECT_ORDER.filter((aspect) => aspects.has(aspect));
  const unknown = [...aspects].filter((aspect) => !ASPECT_ORDER.includes(aspect)).sort();
  return [...known, ...unknown];
}

export function filesForAspect(aspect, files) {
  const all = Object.keys(files).sort();
  if (aspect === 'design') return all.filter(isDesignFile);
  if (aspect === 'ux') return all.filter(isUxFile);
  if (aspect === 'perf') return all.filter(isPerfFile);
  if (aspect === 'gameplay') return all.filter(isGameplayFile);
  if (aspect === 'multiplayer') return all.filter(isMultiplayerFile);
  if (aspect === 'privacy') return all.filter((file) => isMultiplayerFile(file) || isStorageFile(file));
  if (aspect === 'vision') return [];
  return all;
}

const PROMPTS_FOR_ASPECT = {
  correctness: 'correctness.md',
  rules: 'code-review.md',
  design: 'design.md',
  perf: 'perf.md',
  gameplay: 'code-review.md',
  ux: 'design.md',
  multiplayer: 'code-review.md',
  privacy: 'code-review.md',
  vision: 'vision.md',
};

const CHECKLISTS = {
  correctness: [
    'Logica: klopt de nieuwe berekening ook bij lege, ontbrekende, dubbele of negatieve invoer?',
    'Saves: opslagsleutels blijven `gde-*`; bestaande saves en migraties breken niet; niets overschrijven zonder migratie.',
    'Fouten: faalt het met context in de console en blijft het spel speelbaar? Geen stil falen.',
    'Regressierisico: raakt de wijziging een gedeelde module (`World`, `surfaceAt`, `waterlevels.js`, `spatialgrid.js`, `busy.js`, `activityhub.js`) en is elke aanroeper bijgewerkt?',
    'Samen spelen: geen nieuwe `world.player`-aanname en het gedrag voor host en gast klopt (AGENTS.md, multiplayer-regel).',
    'Tests: welke bestaande test dekt dit, of welke test ontbreekt? Ontbrekend testbewijs is op zichzelf geen blokkade.',
    'Dode code en verboden refactors: geen ongebruikte imports of functies en geen refactor buiten de opdracht.',
    'Constitutie: geen Engelse spelerstekst, geen echte merken of personen, altijd zomer, satire zonder leed.',
  ],
  rules: [
    '1. Nederlands in alles wat de speler ziet of hoort.',
    '2. Geen echte merken, bedrijven of personen; echte plaatsen mogen.',
    '3. Altijd zomer: geen winter, sneeuw of natuurijs.',
    '4. Geen echte persoonsgegevens; geen externe diensten behalve de goedgekeurde coöp-uitzondering en openbare leesopvragen.',
    '5. Geheimen blijven geheim: nooit `.env` of een sleutel lezen, printen of committen.',
    '6. Satire, geen leed; 18+ en bloed alleen in PvP.',
    '7. De roadmap is GitHub, geen roadmap-markdown in git.',
    '8. Niets openbaar zonder akkoord van de eigenaar.',
    '9. Poort 9000 en de geïnstalleerde app niet aanraken.',
    '10. Veilig samen spelen: geen IP-adressen opslaan of tonen, standaard privé, geen echte persoonsnamen.',
    'Coding-standards: 2 spaties, enkele quotes, geen `var`, geen nieuwe npm-pakketten; alleen regels die echt geschonden worden melden.',
  ],
  design: [
    'Kleur: alleen de tokens uit `.specs-fire/standards/ui-taal.md` (`--gron-green #1e9e56`, `--gron-green-light #3fc97a`, `--gd #0f5c30`, achtergrond `#17301f` naar `#0c140e`, tekst `#f0ede4`); één rood `#d93f3f`, wanted-geel `#e8c93a` alleen voor de wanted-sterren, badge en missiemarkering; geen blauw accent.',
    'Contrast 4,5:1 voor tekst en 3:1 voor grote tekst en iconen; kleur is nooit de enige aanwijzing.',
    'Typografie: Bebas Neue voor titels en knoppen, Arial Narrow voor lopende tekst; menu 80/64/44/26/24/20/18 px; geen spelerstekst onder 12 px en menu\'s 13 px en hoger; het logo is HTML/CSS.',
    'Menu\'s: de structuur staat alleen in `pausemenu.js` (`SECTIONS`, `RAIL_GROUPS`, `CHILD`, `SUBTABS`); één primaire knop per scherm, de rest ghost of stille tekst; focus zichtbaar; hooguit 125 woorden op een keuzescherm en 270 op een naslagscherm.',
    'Taal: Nederlands; "Samen spelen" en nooit co-op, coöp of multiplayer; "Grunn"; getallen als `840 m`, `1,2 km`, `€45`, `m:ss.cc`.',
    'Toegankelijkheid: `aria-label` waar een icoon betekenis heeft en `role="img"` op een kale `span`.',
    'Beoordeel alleen toegevoegde of gewijzigde regels; bestaande design-schuld in onaangeraakte code is geen nieuwe blokkade.',
  ],
  perf: [
    'Frame budget: 60 fps is 16,6 ms per frame; geen nieuwe dure berekening per frame in de render- of updateloop.',
    'Allocaties: geen nieuwe objecten, arrays of `Vector3` per frame (GC-hitches).',
    'Streaming: tegels en wereld laden via het bestaande streamingpad; geen dubbele laadactie of tweede hoogtevraag buiten `surfaceAt`.',
    'Draw calls en materialen: geen nieuw materiaal per frame en geen extra draw call per prop zonder noodzaak.',
    'CPU per frame: geen O(n²) of dure lookups per frame; gebruik de bestaande grid en `surfaceAt`.',
    'Bewijs: noem de code (bestand:regel) die per frame draait, of een meting (`scripts/perf/run.mjs`, normen in `scripts/perf/normrules.mjs`). "Voelt traag" is geen bevinding.',
    'Bestaande trage paden in onaangeraakte code zijn geen releaseblokkade.',
  ],
  gameplay: [
    'Missie, verhaal of minigame: beloning, voortgang en afronding kloppen; geen dubbele of oneindige beloning.',
    'Samen spelen-regel: is het van wie het spel opende, doet een gast mee of doet iedereen het lokaal? Wat ziet een gast, wie krijgt de beloning en de voortgang, wat gebeurt er bij wegvallen of later aansluiten en welke test dekt het?',
    'Geen nieuwe `world.player`-aannames in gedeelde code.',
    'Spelertekst is Nederlands en binnen het woordbudget (HUD-bericht één zin van hooguit 14 woorden).',
    'Geen nieuwe cheat of omzeiling van de bestaande regels.',
  ],
  ux: [
    'Leesbaarheid: contrast, tekstgrootte, focus en volledige toetsenbordbediening.',
    'Menustructuur: één eigenaar (`pausemenu.js`); geen tweede plek die knoppen, rijen of tabs definieert.',
    'Tekst: kort en rustig, Nederlandse notatie en maximaal 125 woorden op een keuzescherm.',
    'Terugweg: Esc en terug gedragen zich zoals de rest van het menu.',
    'Toegankelijkheid: kleur nooit de enige aanwijzing; `aria-live` voor statusmeldingen.',
  ],
  multiplayer: [
    'Elke speler is gelijkwaardig; alleen spelers verwijderen is een hostrecht. Tijd, reizen, slapen, laden, cheats en pauzeren zijn gezamenlijke keuzes.',
    'Wat ziet een gast (snapshot of EXTRA-bericht) en wie krijgt de beloning en de voortgang (per speler)?',
    'Wat gebeurt er als iemand wegvalt, later aansluit of de host wisselt?',
    'Geen `world.player`-aannames in nieuwe code.',
    'Is er een pure coöp-test of testbankstap? Een ontbrekende test benoem je, je verzint er geen.',
  ],
  privacy: [
    'Constitutie 4 en 10: geen echte persoonsgegevens en geen IP-adressen opslaan of tonen.',
    'Netwerk: geen nieuwe externe dienst buiten de goedgekeurde uitzonderingen (STUN, brokers, openbare leesopvraag zonder spelerkenmerk).',
    'Opslag: alleen `gde-*`-sleutels, geen onversleutelde persoonsgegevens en geen tracking.',
    'Verzonden data: alleen wat de functie nodig heeft; geen volledige save of `World` naar buiten.',
    'Bewijs: bestand:regel van de fetch-, localStorage- of save-regel.',
  ],
  vision: [
    'Beoordeel de beelden uit het beeldreviewpakket (`vision-pack.md`), niet de code.',
    'Volg de kleur-, typografie- en menuregels uit `.specs-fire/standards/ui-taal.md` en `DESIGN_SYSTEM.md`.',
    'Let op overlap, afgesneden tekst, focus, contrast, zwevende of verzonken props, gaten en z-fighting.',
    'Alleen "geen bevindingen" als elk beeld in je dekking echt is bekeken.',
  ],
};

function checklistFor(aspect) {
  return CHECKLISTS[aspect] || [
    'Beoordeel de wijzigingen in dit pakket op dit aspect.',
    'Noem concreet bewijs (bestand:regel, meting of beeld).',
    'Geen bevindingen? Vermeld dan je dekking; "geen bevindingen" mag alleen na alles bekeken te hebben.',
  ];
}

// Strikte outputinstructie: alleen een reviewrapport-JSON volgens $defs.reviewrapport.
function outputInstruction(aspect) {
  const example = {
    onderwerp: aspect,
    reviewer: '<naam van de reviewer>',
    commit: '<sha van de review>',
    dekking: { bestanden: ['<pad>'], beelden: [], aspecten: [aspect] },
    bevindingen: [],
  };
  return [
    `Lever precies één reviewrapport als JSON volgens \`$defs.reviewrapport\` in \`scripts/release/findings-schema.json\`: \`onderwerp\` is "${aspect}" en \`dekking.aspecten\` bevat "${aspect}".`,
    '',
    '```json',
    JSON.stringify(example, null, 2),
    '```',
    '',
    '`ernst` is `blokkerend`, `belangrijk` of `nit`; `bewijs` is verplicht bij `blokkerend` (bestand:regel, beeldnaam, meting of commando-uitvoer); `bron` is een van `code-review`, `vision`, `perf`, `rules`, `design`, `baseline`, `test`; `aspect` is een van de schema-enums. Geen proza om de JSON heen en geen extra uitleg: alleen het JSON-object, eventueel in één ```json-codeblok.',
  ].join('\n');
}

// ---------------------------------------------------------------- pakket schrijven

function fileStatus(status) {
  return STATUS_LABELS[status] || 'gewijzigd';
}

function renderPack({ from, to, commit, files, aspects, truncations, entries, filesWithoutDiff, maxLines, used, perFileMax }) {
  const lines = [];
  const quoted = (value) => (value ? `\`${value}\`` : 'onbekend');
  lines.push(`# Reviewpakket release-diff ${from || '(geen tag)'}..${to}`, '');
  lines.push(`- Commit: ${quoted(commit)}`);
  lines.push(`- Van: ${quoted(from)} naar \`${to}\``);
  lines.push(`- Gewijzigde bestanden: ${Object.keys(files).length}`);
  lines.push(`- Diffregels in dit pakket: ${used} (maximaal ${maxLines}; per bestand maximaal ${perFileMax})`);
  lines.push('');
  lines.push('## Opdracht voor de reviewer', '');
  lines.push('1. Lees dit pakket eerst helemaal en noteer de verplichte aspecten en de bijbehorende promptbestanden.');
  lines.push('2. Lees daarna per genoemd bestand de gewijzigde regels in de diff en de gerichte context in de repo. Lees geen bestanden die hier niet genoemd staan en speculeer niet zonder bewijs.');
  lines.push('3. Beoordeel alleen de wijziging; bestaande schuld in onaangeraakte code is geen releaseblokkade.');
  lines.push('4. Lever per aspect één reviewrapport als JSON volgens `$defs.reviewrapport` in `scripts/release/findings-schema.json`, met `onderwerp` en `dekking.aspecten` op dat aspect, en met je volledige dekking in `dekking.bestanden`.');
  lines.push('5. Geen bevindingen is een geldige uitkomst, maar alleen nadat je elk bestand in je dekking echt hebt bekeken; zet dan `"bevindingen": []` en noem je dekking.');
  lines.push('');
  lines.push('Verplichte aspecten: ' + aspects.map((aspect) => `\`${aspect}\``).join(', ') + '.');
  lines.push('');

  if (truncations.length) {
    lines.push('## Inkortingen', '');
    lines.push(`De diff is begrensd op ${maxLines} regels in totaal en ${perFileMax} regels per bestand. Deze bestanden zijn ingekort:`);
    lines.push('');
    for (const truncation of truncations) {
      lines.push(`- \`${truncation.bestand}\` (${fileStatus(truncation.status)}): ${truncation.origineel} regels oorspronkelijk, ${truncation.opgenomen} opgenomen, ${truncation.ingekort} ingekort (${truncation.reden}).`);
    }
    lines.push('');
  } else {
    lines.push('## Inkortingen', '', 'Geen: de hele diff past binnen de grenzen.', '');
  }

  lines.push('## Bestanden per systeem', '');
  for (const system of SYSTEMS) {
    const paths = Object.keys(files).filter((file) => systemFor(file) === system).sort();
    if (!paths.length) continue;
    lines.push(`### ${system}`, '');
    for (const file of paths) lines.push(`- \`${file}\` (${fileStatus(files[file])})`);
    lines.push('');
  }

  if (filesWithoutDiff.length) {
    lines.push('## Bestanden zonder diff', '');
    lines.push('Van deze bestanden is alleen de status bekend; de diff is niet meegeleverd:');
    lines.push('');
    for (const file of filesWithoutDiff) lines.push(`- \`${file}\` (${fileStatus(files[file])})`);
    lines.push('');
  }

  lines.push('## Wat je per aspect moet controleren', '');
  for (const aspect of aspects) {
    const relevant = filesForAspect(aspect, files);
    lines.push(`### Aspect: ${aspect}`, '');
    lines.push(`Prompt: \`scripts/release/prompts/${PROMPTS_FOR_ASPECT[aspect] || 'code-review.md'}\`.`);
    lines.push('');
    if (relevant.length) {
      lines.push('Relevante bestanden:');
      lines.push('');
      for (const file of relevant) lines.push(`- \`${file}\` (${fileStatus(files[file])})`);
      lines.push('');
    } else {
      lines.push('Geen specifieke bestanden voor dit aspect bekend; beoordeel de hele diff hieronder.');
      lines.push('');
    }
    lines.push('Checklist:');
    lines.push('');
    for (const item of checklistFor(aspect)) lines.push(`- ${item}`);
    lines.push('');
    lines.push('Outputinstructie:');
    lines.push('');
    lines.push(outputInstruction(aspect));
    lines.push('');
  }

  lines.push('## Diff', '');
  for (const system of SYSTEMS) {
    const blocks = entries.filter((entry) => systemFor(entry.file) === system);
    if (!blocks.length) continue;
    lines.push(`### ${system}`, '');
    for (const block of blocks) {
      lines.push(`#### \`${block.file}\` (${fileStatus(block.status)})`, '');
      lines.push('````diff');
      lines.push(...block.display);
      lines.push('````', '');
    }
  }

  return lines.join('\n') + '\n';
}

// Pure kern: bouwt het pakket en de review-required.json uit een aangeleverde diff.
export function buildReviewPack({
  diff = '',
  files = null,
  commit = '',
  from = '',
  to = 'HEAD',
  maxLines = DEFAULT_MAX_LINES,
  perFileMax = PER_FILE_MAX,
  aspecten = [],
} = {}) {
  const { entries } = parseDiff(diff);
  const fromDiff = {};
  for (const entry of entries) fromDiff[entry.file] = entry.status;
  const supplied = normalizeFiles(files);
  const allFiles = { ...fromDiff, ...supplied };
  const filesWithoutDiff = Object.keys(allFiles).filter((file) => !entries.some((entry) => entry.file === file)).sort();

  const limited = limitDiff(entries, maxLines, perFileMax);
  const aspects = determineAspects(allFiles, entries, aspecten);
  const required = {
    commit: commit || '',
    from: from || '',
    to: to || 'HEAD',
    bestanden: allFiles,
    aspecten: aspects,
    inkortingen: limited.truncations,
  };
  const text = renderPack({
    from,
    to: to || 'HEAD',
    commit,
    files: allFiles,
    aspects,
    truncations: limited.truncations,
    entries: limited.entries,
    filesWithoutDiff,
    maxLines,
    used: limited.used,
    perFileMax,
  });
  return {
    text,
    required,
    files: allFiles,
    aspects,
    truncations: limited.truncations,
    entries: limited.entries,
    filesWithoutDiff,
  };
}

// ---------------------------------------------------------------- CLI

function option(name, fallback) {
  const value = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
}

function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 << 20 });
  return { code: typeof result.status === 'number' ? result.status : 2, out: result.stdout || '', err: (result.stderr || '').trim() };
}

function main() {
  const from = option('from', '');
  const to = option('to', 'HEAD');
  const diffPath = option('diff', '');
  const filesArg = option('files', '');
  const out = path.resolve(option('out', path.join(os.tmpdir(), 'gde-review-pack')));
  const maxLines = Number(option('max-lines', String(DEFAULT_MAX_LINES)));
  const extra = (option('aspecten', '') || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);

  const invalidAspect = extra.find((aspect) => !/^[a-z][a-z0-9-]{1,30}$/.test(aspect));
  if (invalidAspect) {
    console.error(`Ongeldige aspectnaam in --aspecten: ${invalidAspect}`);
    return 2;
  }
  if (!Number.isFinite(maxLines) || maxLines < 50) {
    console.error('--max-lines moet een getal van minstens 50 zijn.');
    return 2;
  }

  let diff;
  let files = null;
  let commit = '';
  if (diffPath) {
    try {
      diff = fs.readFileSync(path.resolve(diffPath), 'utf8');
    } catch (error) {
      console.error(`Diff niet leesbaar: ${diffPath} (${error.message})`);
      return 2;
    }
    if (filesArg) {
      try {
        files = readFilesArgument(filesArg);
      } catch (error) {
        console.error(`--files niet leesbaar: ${filesArg} (${error.message})`);
        return 2;
      }
    }
    // Zonder git: een sha als --to is meteen de commit; anders blijft de commit onbekend.
    commit = /^[0-9a-f]{7,40}$/i.test(to) ? to.toLowerCase() : '';
  } else {
    if (!from) {
      console.error('Geen --from=<tag> opgegeven en geen --diff=<bestand>: zonder beginpunt is er geen release-diff. Gebruik bijvoorbeeld --from=v0.60.7 of --diff=<bestand>.');
      return 2;
    }
    const nameStatus = git(['diff', '--name-status', `${from}..${to}`]);
    if (nameStatus.code !== 0) {
      console.error(`git diff --name-status ${from}..${to} mislukte: ${nameStatus.err || `exit ${nameStatus.code}`}`);
      return 2;
    }
    const diffResult = git(['diff', `${from}..${to}`]);
    if (diffResult.code !== 0) {
      console.error(`git diff ${from}..${to} mislukte: ${diffResult.err || `exit ${diffResult.code}`}`);
      return 2;
    }
    diff = diffResult.out;
    files = parseNameStatus(nameStatus.out);
    commit = git(['rev-parse', to]).out.trim();
  }

  let result;
  try {
    result = buildReviewPack({ diff, files, commit, from, to, maxLines, aspecten: extra });
  } catch (error) {
    console.error('Reviewpakket bouwen mislukte: ' + (error && error.message ? error.message : error));
    return 2;
  }

  fs.mkdirSync(out, { recursive: true });
  const packPath = path.join(out, 'review-pack.md');
  fs.writeFileSync(packPath, result.text);
  fs.writeFileSync(path.join(out, 'review-required.json'), JSON.stringify(result.required, null, 1) + '\n');
  console.log(`Reviewpakket: ${packPath}`);
  console.log(`  ${Object.keys(result.files).length} bestanden, aspecten: ${result.aspects.join(', ')}${result.truncations.length ? `; ${result.truncations.length} inkorting(en)` : ''}.`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try { process.exit(main()); } catch (error) { console.error('review_pack crashte:', error && error.stack || error); process.exit(2); }
}

export { main };
