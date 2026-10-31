// Picks the next issue for one Ralph tick.
//   gh issue list --state open --json number,title,labels,assignees \
//     | node ralph/select.mjs --config=ralph.toml [--skip=1,2]
// Prints "<number>\t<title>", or "NONE" with exit 1 when nothing is eligible.
//
// Everything project-specific comes from the config, so the same file serves every
// repo. Priority follows the project's own rules: the configured `eerste` labels win
// (bugs before wishes in GDE), then the highest impact, and cheap work wins the tie.
// Epics are eligible on purpose: a loop that only ever starts L-work never merges
// anything, so a cheap high-impact slice of an epic is good work.
import { readFileSync } from 'node:fs';

const STANDAARD = {
  eerste: ['bug', 'wens'],
  impact: { 'impact-zeer-hoog': 4, 'impact-hoog': 3, 'impact-midden': 2, 'impact-laag': 1 },
  kosten: { 'kosten-S': 3, 'kosten-M': 2, 'kosten-L': 1 },
  // Parked or waiting on the owner: the loop must never pick these, or it spins on
  // work only a human can finish.
  geparkeerd: ['eigenaar', 'wacht-beeld', 'vraag-eigenaar'],
  // An issue without any `eerste` label still gets picked, at this score, unless the
  // project opts out. A loop that silently ignores unlabelled issues does nothing at
  // all on a board where nobody labels; saying so once and working is better.
  ongelabeld: 'laagst',
};

const ONGELABELD_SCORE = { laagst: 1, midden: 500, uit: null };

// Minimal TOML reader: only `key = "value"` and `key = ["a", "b"]` plus [tabel] headers
// with simple string/number values. Enough for ralph.toml and no dependency needed.
export function leesToml(tekst) {
  const uit = {};
  let tabel = uit;
  for (const regelRuw of tekst.split('\n')) {
    const regel = regelRuw.replace(/#.*$/, '').trim();
    if (!regel) continue;
    const kop = regel.match(/^\[([^\]]+)\]$/);
    if (kop) {
      tabel = uit[kop[1]] ??= {};
      continue;
    }
    const m = regel.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (!m) continue;
    const [, sleutel, waardeRuw] = m;
    const waarde = waardeRuw.trim();
    if (waarde.startsWith('[')) {
      tabel[sleutel] = [...waarde.matchAll(/"([^"]*)"/g)].map((x) => x[1]);
    } else if (waarde.startsWith('"')) {
      tabel[sleutel] = waarde.slice(1, waarde.lastIndexOf('"'));
    } else if (waarde === 'true' || waarde === 'false') {
      tabel[sleutel] = waarde === 'true';
    } else if (waarde !== '' && !Number.isNaN(Number(waarde))) {
      tabel[sleutel] = Number(waarde);
    }
  }
  return uit;
}

export function bouwRegels(cfg = {}) {
  const c = { ...STANDAARD, ...cfg };
  return {
    eerste: new Set(c.eerste),
    impact: c.impact,
    kosten: c.kosten,
    geparkeerd: new Set(c.geparkeerd),
    ongelabeld: ONGELABELD_SCORE[c.ongelabeld] ?? ONGELABELD_SCORE.laagst,
  };
}

const labelNames = (issue) => new Set((issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name)));

// null = not eligible at all; higher is better.
export function score(issue, regels = bouwRegels()) {
  const labels = labelNames(issue);
  for (const b of regels.geparkeerd) if (labels.has(b)) return null;
  const eersteLabel = [...labels].find((l) => regels.eerste.has(l));
  if (eersteLabel === undefined) {
    // Unlabelled (or labelled with something this project does not rank): eligible but
    // last, so a labelled issue always wins. `uit` makes it ineligible instead.
    return regels.ongelabeld;
  }
  const impact = [...labels].reduce((n, l) => Math.max(n, regels.impact[l] || 0), 0);
  const kosten = [...labels].reduce((n, l) => Math.max(n, regels.kosten[l] || 0), 0);
  const eerste = [...regels.eerste].indexOf(eersteLabel);
  return 1 + Math.max(0, 5 - eerste) * 1000 + impact * 100 + kosten * 10;
}

// `vorige` is the issue the previous tick worked on. When that issue was closed the
// loop has no memory left, and on a board full of equally scored bugs it would pick the
// same lowest number every single tick — always the same issue, never the rest. So among
// issues that tie on score we continue *after* the previous one, wrapping around.
export function pick(issues, skip = new Set(), regels = bouwRegels(), vorige = 0) {
  const kandidaten = issues
    .filter((i) => !skip.has(i.number))
    // An assignee means someone claimed it, us or another agent.
    .filter((i) => !(i.assignees || []).some((a) => a && a.login))
    .map((issue) => ({ issue, s: score(issue, regels) }))
    .filter((x) => x.s !== null && x.s !== undefined);
  if (!kandidaten.length) return null;
  // Deterministic on equal score, so two loops reading the same board agree on the
  // order before either has claimed anything.
  kandidaten.sort((a, b) => b.s - a.s || a.issue.number - b.issue.number);
  const top = kandidaten[0].s;
  const gelijk = kandidaten.filter((x) => x.s === top);
  if (gelijk.length > 1 && vorige) {
    return (gelijk.find((x) => x.issue.number > vorige) ?? gelijk[0]).issue;
  }
  return gelijk[0].issue;
}

if (process.argv[1] && process.argv[1].endsWith('select.mjs')) {
  const skipArg = process.argv.find((a) => a.startsWith('--skip='));
  const skip = new Set((skipArg ? skipArg.slice(7) : '').split(',').filter(Boolean).map(Number));
  const cfgArg = process.argv.find((a) => a.startsWith('--config='));
  const vorigeArg = process.argv.find((a) => a.startsWith('--na='));
  const vorige = vorigeArg ? Number(vorigeArg.slice(5)) || 0 : 0;
  const cfg = cfgArg ? leesToml(readFileSync(cfgArg.slice(9), 'utf8')) : {};
  let issues;
  try { issues = JSON.parse(readFileSync(0, 'utf8')); } catch { console.error('geen geldige JSON op stdin'); process.exit(2); }
  if (!Array.isArray(issues)) { console.error('verwacht een lijst issues'); process.exit(2); }
  const best = pick(issues, skip, bouwRegels(cfg), vorige);
  if (!best) { console.log('NONE'); process.exit(1); }
  console.log(`${best.number}\t${best.title}`);
}
