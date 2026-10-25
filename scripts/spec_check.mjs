// Keeps the canonical specs in .specs-fire/standards in step with the code ("de code is de
// waarheid, de doc is de fout", #499). Two checks, no network, no game boot:
//   node scripts/spec_check.mjs
//   1. Elke verwijzing `pad/bestand.ext:NN` (of `:NN-MM`) in een spec moet naar een bestaand
//      bestand wijzen, binnen dat bestand passen en op een regel wijzen die niet leeg is. Verwijzingen
//      zonder pad (pausemenu.js:59) of met alleen een regelbereik (:14-19) blijven erbuiten: die zijn
//      niet eenduidig te herleiden.
//   2. De tellers die de specs in proza noemen (scenes, regels, missies, lessen, holes, ...) worden
//      opnieuw berekend uit de code of de verhaaldata; TELLERS hieronder zegt per teller waar de
//      waarheid vandaan komt. Ontbreekt een bron in deze worktree (gegenereerde data), dan slaat de
//      poort die teller over met een SKIP-regel in plaats van te falen.
// Een nieuwe teller in een spec hoort in TELLERS te staan; een patroon dat niets meer vindt is een
// fout, zodat een herschreven spec de controle niet stil uitzet.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SPECS = '.specs-fire/standards';

// Verwijzing met een pad en een regelnummer; het pad moet een `/` bevatten.
const REF = /`([\w./-]+\.(?:js|mjs|cjs|json|sh|md|html|css|gdt|ts)):(\d+)(?:-(\d+))?`/g;

// ---------------------------------------------------------------- bronnen

const read = (repo, f) => {
  const p = path.join(repo, f);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
};

const readLines = (repo, f) => {
  const t = read(repo, f);
  return t === null ? null : t.split(/\r?\n/);
};

// De pure regelmodules van het spel laden zonder DOM of THREE; zo telt de poort dezelfde arrays
// als het spel. Een module die niet laadt of ontbreekt is een ontbrekende bron, geen fout.
const moduleAt = async (repo, f) => {
  if (!fs.existsSync(path.join(repo, f))) return null;
  try { return await import(pathToFileURL(path.join(repo, f)).href); } catch { return null; }
};

const scriptData = (repo) => {
  const t = read(repo, 'game/storydata/script.json');
  if (t === null) return null;
  try {
    const d = JSON.parse(t);
    return Array.isArray(d.scenes) ? d : null;
  } catch { return null; }
};

const story = (repo) => {
  const d = scriptData(repo);
  return d ? { waarden: [d.scenes.length, d.scenes.reduce((n, s) => n + s.lines.length, 0)] } : { skip: 'game/storydata/script.json ontbreekt' };
};

// Een regel heeft een opname als storytext.js hem vindt: geen textOnly, een `rec` en een manifest-
// regel onder "<stem>|<tekst>" (game/js/storytext.js, lineVoice).
const storyVoice = (repo) => {
  const d = scriptData(repo);
  if (!d) return { skip: 'game/storydata/script.json ontbreekt' };
  const man = {};
  for (const k of ['story', 'lines', 'banter']) {
    const t = read(repo, `game/audio/voicelines/${k}/manifest.json`);
    if (t === null) return { skip: `game/audio/voicelines/${k}/manifest.json ontbreekt` };
    try { man[k] = JSON.parse(t); } catch { return { skip: `game/audio/voicelines/${k}/manifest.json is onleesbaar` }; }
  }
  const lines = d.scenes.flatMap((s) => s.lines || []);
  const stil = lines.filter((l) => l.channel === 'app-stil').length;
  const geen = lines.filter((l) => !(l.rec && !l.textOnly && man[l.rec] && man[l.rec][(l.voice || l.speaker) + '|' + l.text])).length;
  return { waarden: [stil, geen] };
};

// M00 is de opening, M01-M30 zijn de missies, T1-T5 de reisbeats (verhaal.md, de stappen).
const storySteps = (repo) => {
  const d = scriptData(repo);
  if (!d) return { skip: 'game/storydata/script.json ontbreekt' };
  const steps = new Set(d.scenes.map((s) => s.step));
  const missies = [...steps].filter((s) => /^M\d+$/.test(s) && s !== 'M00').length;
  const beats = [...steps].filter((s) => /^T\d+$/.test(s)).length;
  return { waarden: [missies, beats] };
};

const careers = async (repo) => {
  const m = await moduleAt(repo, 'game/js/loopbaan.js');
  return m ? { waarden: [m.VAKKEN.length, m.GROEPEN.length] } : { skip: 'game/js/loopbaan.js ontbreekt' };
};

const fishing = async (repo) => {
  const m = await moduleAt(repo, 'game/js/visdata.js');
  return m ? { waarden: [m.WATERTYPEN.length, m.SOORTEN.length] } : { skip: 'game/js/visdata.js ontbreekt' };
};

const farm = async (repo) => {
  const m = await moduleAt(repo, 'game/js/boerderij.js');
  return m ? { waarden: [m.GEWAS_IDS.length] } : { skip: 'game/js/boerderij.js ontbreekt' };
};

const flying = async (repo) => {
  const m = await moduleAt(repo, 'game/js/vliegschoolrules.js');
  return m ? { waarden: [m.LESSEN.length] } : { skip: 'game/js/vliegschoolrules.js ontbreekt' };
};

const flyingPerKit = async (repo) => {
  const m = await moduleAt(repo, 'game/js/vliegschoolrules.js');
  if (!m) return { skip: 'game/js/vliegschoolrules.js ontbreekt' };
  const kist = (k) => m.LESSEN.filter((l) => l.kist === k).length;
  return { waarden: [kist('vliegtuig'), kist('heli')] };
};

const discgolf = async (repo) => {
  const m = await moduleAt(repo, 'game/js/discgolfrules.js');
  return m ? { waarden: [m.DISC_HOLES.length] } : { skip: 'game/js/discgolfrules.js ontbreekt' };
};

const pitchPutt = async (repo) => {
  const m = await moduleAt(repo, 'game/js/puttinglogic.js');
  return m ? { waarden: [m.PP_HOLES.length] } : { skip: 'game/js/puttinglogic.js ontbreekt' };
};

// ---------------------------------------------------------------- de tellers

// Per teller: de spec, het patroon met één groep per getal, de namen van die getallen en de bron.
// Alleen tellers die de specs echt noemen; `--` in het patroon is een koppelteken.
export const TELLERS = [
  { file: 'verhaal.md', pattern: /De data: ([\w.]+) scènes, ([\w.]+) regels/g, labels: ['scènes', 'regels'], source: story },
  { file: 'verhaal.md', pattern: /([\w.]+)\s+zijn\s+stille\s+appjes\s+en\s+([\w.]+)\s+hebben\s+geen\s+opname/g, labels: ['stille appjes', 'regels zonder opname'], source: storyVoice },
  { file: 'verhaal.md', pattern: /samen ([\w.]+) missies en ([\w.]+) reisbeats/g, labels: ['missies', 'reisbeats'], source: storySteps },
  { file: 'verhaal.md', pattern: /noemt ([\w.]+) missies en ([\w.]+) reisbeats/g, labels: ['missies', 'reisbeats'], source: storySteps },
  { file: 'verhaal.md', pattern: /[Dd]e code heeft er ([\w.]+) en ([\w.]+)/g, labels: ['missies', 'reisbeats'], source: storySteps },
  { file: 'verhaal.md', pattern: /script\.json` telt er ([\w.]+) en ([\w.]+)/g, labels: ['scènes', 'regels'], source: story },

  { file: 'mechanica.md', pattern: /([\w.]+) vakken in ([\w.]+) groepen/g, labels: ['vakken', 'groepen'], source: careers },
  { file: 'mechanica.md', pattern: /([\w.]+) watertypen en ([\w.]+) soorten/g, labels: ['watertypen', 'soorten'], source: fishing },
  { file: 'mechanica.md', pattern: /([\w.]+) gewassen met eigen zaaigoed/g, labels: ['gewassen'], source: farm },
  { file: 'mechanica.md', pattern: /([\w.]+) lessen bij Eelde/g, labels: ['lessen'], source: flying },
  { file: 'mechanica.md', pattern: /([\w.]+) vliegtuig- en ([\w.]+) helikopterlessen/g, labels: ['vliegtuiglessen', 'helikopterlessen'], source: flyingPerKit },
  { file: 'mechanica.md', pattern: /Discgolf: ([\w.]+) holes/g, labels: ['holes'], source: discgolf },
  { file: 'mechanica.md', pattern: /Pitch en putt: ([\w.]+) holes/g, labels: ['holes'], source: pitchPutt },
];

// De getallen staan in de specs ook als woord ("negen holes"); alleen de woorden die er echt staan.
const WOORD = {
  een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10,
  elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16, zeventien: 17,
  achttien: 18, negentien: 19, twintig: 20,
};

export function getal(t) {
  const s = String(t == null ? '' : t).trim().toLowerCase();
  if (WOORD[s]) return WOORD[s];
  if (!/^\d[\d.]*$/.test(s)) return null;
  return Number(s.replace(/\./g, ''));
}

// ---------------------------------------------------------------- de controle

export async function check({ repo = REPO, specDir = path.join(repo, SPECS) } = {}) {
  const problems = [];
  const skipped = [];
  let refs = 0;
  let counters = 0;

  if (!fs.existsSync(specDir)) {
    return { refs, counters, skipped, problems: [{ where: SPECS, message: 'de specs ontbreken; niets te controleren' }] };
  }

  const specFiles = fs.readdirSync(specDir).filter((n) => n.endsWith('.md')).sort();
  const texts = new Map();
  for (const name of specFiles) texts.set(name, readLines(repo, path.posix.join(SPECS, name)));

  // 1. regelverwijzingen
  for (const name of specFiles) {
    const lines = texts.get(name);
    const where = (i) => `${SPECS}/${name}:${i + 1}`;
    lines.forEach((line, i) => {
      for (const m of line.matchAll(REF)) {
        const target = m[1];
        if (!target.includes('/')) continue;
        refs++;
        const start = Number(m[2]);
        const end = m[3] ? Number(m[3]) : start;
        const abs = path.resolve(repo, target);
        if (!abs.startsWith(path.resolve(repo) + path.sep)) {
          problems.push({ where: where(i), message: `${target} verwijst buiten de repo` });
          continue;
        }
        const file = readLines(repo, target);
        if (file === null) {
          problems.push({ where: where(i), message: `${target} bestaat niet` });
          continue;
        }
        if (end < start) {
          problems.push({ where: where(i), message: `${target}:${start}-${end} heeft een eind vóór het begin` });
          continue;
        }
        if (start < 1 || end > file.length) {
          problems.push({ where: where(i), message: `${target}:${start}${m[3] ? '-' + end : ''} valt buiten het bestand (${file.length} regels)` });
          continue;
        }
        if (!file[start - 1].trim()) {
          problems.push({ where: where(i), message: `${target}:${start}${m[3] ? '-' + end : ''} wijst op een lege regel` });
        }
      }
    });
  }

  // 2. tellers
  for (const c of TELLERS) {
    const lines = texts.get(c.file);
    if (!lines) {
      problems.push({ where: `${SPECS}/${c.file}`, message: 'de spec ontbreekt, dus de teller kan niet gecontroleerd worden' });
      continue;
    }
    const text = lines.join('\n');
    const matches = [...text.matchAll(c.pattern)];
    if (!matches.length) {
      problems.push({ where: `${SPECS}/${c.file}`, message: `de teller ${c.labels.join(' en ')} staat niet meer in de spec (${c.pattern})` });
      continue;
    }
    const bron = await c.source(repo);
    if (bron.skip) {
      skipped.push(`${SPECS}/${c.file}: ${c.labels.join(' en ')} — ${bron.skip}`);
      continue;
    }
    for (const m of matches) {
      const lineNo = text.slice(0, m.index).split('\n').length;
      c.labels.forEach((label, k) => {
        const gezegd = getal(m[k + 1]);
        const echt = bron.waarden[k];
        counters++;
        if (gezegd === null) problems.push({ where: `${SPECS}/${c.file}:${lineNo}`, message: `${label}: "${m[k + 1]}" is geen getal` });
        else if (gezegd !== echt) problems.push({ where: `${SPECS}/${c.file}:${lineNo}`, message: `spec zegt ${gezegd} ${label}, de bron zegt ${echt}` });
      });
    }
  }

  return { refs, counters, skipped, problems };
}

// ---------------------------------------------------------------- CLI

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { refs, counters, skipped, problems } = await check();
  for (const p of problems) console.log(`FOUT ${p.where}: ${p.message}`);
  for (const s of skipped) console.log(`SKIP ${s}`);
  const n = problems.length;
  console.log(`${refs} verwijzingen en ${counters} tellers gecontroleerd, ${skipped.length} overgeslagen, ${n} fout${n === 1 ? '' : 'en'}`);
  process.exit(n ? 1 : 0);
}
