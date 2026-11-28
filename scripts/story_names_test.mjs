// Begrijpelijkheidstoets (#1362, bijbel 00 en 01 §3.3): elke naam of verwijzing in een scène is eerder
// ingeleid. De naamindex komt uit de personagebijbel als data (game/js/characterdossiers*.js): per personage
// de namen (aliases, voornaam, bijnaam) en `firstStep`, de stap waarin de speler hem eerst hoort of ziet.
// De speelvolgorde komt uit scripts/story_steps_nieuw.json (de stappenlijst per hoofdstuk van de bijbel);
// met --order=script geldt de volgorde van game/storydata/script.json zoals die nu is.
//
//   node scripts/story_names_test.mjs                    toetst tegen de basislijn (scripts/story_names_baseline.json)
//   node scripts/story_names_test.mjs --strict           elke overtreding faalt (de lijst die de bouw moet wegwerken)
//   node scripts/story_names_test.mjs --list             toont alle overtredingen per stap
//   node scripts/story_names_test.mjs --write-baseline   schrijft de huidige overtredingen als basislijn
//   node scripts/story_names_test.mjs --steps=<bestand>  een andere stappenlijst (zelfde vorm als story_steps_nieuw.json)
//   node scripts/story_names_test.mjs --order=script      de volgorde van het script in plaats van de bijbel
//
// Wat telt als overtreding: in een scène (de tekstregels) komt de naam van een personage voor, of die
// personage spreekt, in een stap die VOOR zijn firstStep ligt. Personages zonder firstStep worden niet
// beoordeeld (en geteld). De basislijn is het bekende werk van de bouw: een nieuwe overtreding faalt, en een
// overtreding die is opgelost moet uit de basislijn (zodat de lijst alleen kan krimpen).
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };

// ---- pure part: the order of the steps, the name index and the analysis ----

// step -> position (chapter index, index within the chapter); from the chapter list of the bible or from the script
export function stepPositions(config, script, mode = 'bible') {
  const pos = new Map();
  if (mode === 'script') {
    for (const sc of script.scenes) if (!pos.has(sc.step)) pos.set(sc.step, [0, pos.size]);
    return pos;
  }
  Object.values(config.chapters).forEach((steps, ci) => steps.forEach((s, i) => { if (pos.has(s)) throw new Error(`stap ${s} staat twee keer in de stappenlijst`); pos.set(s, [ci, i]); }));
  return pos;
}
const before = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);

// the strings that name a character in game text. Aliases first; else the first name and the nick(s) that
// start with a capital. Too short or ambiguous names are dropped (they would give false alarms).
export function nameIndex(dossiers, ignore = []) {
  const firstOf = (d) => d.name.replace(/[(].*[)]/, '').trim().split(/[ ]+/).filter((w) => !/^(Oma|Opa|Oom|Tante|Boer|Meester|Kapitein|Dokter|Chauffeur|Dispatcher|Stationschef|Hoofdagent|Agent|Wijkagent|Mevrouw|Meneer|Omroeper|Pa|Mam|Ome|Schipper|Voorzitter|Bakker|Trainer)$/i.test(w))[0] || '';
  const raw = new Map();
  for (const d of dossiers) {
    if (d.tier === 'group' || d.tier === 'lead' || d.firstStep === 'n.v.t.') continue;
    const names = new Set(Array.isArray(d.aliases) ? d.aliases : []);
    const f = firstOf(d);
    if (f) names.add(f);
    for (const n of String(d.nick || '').split(';').map((x) => x.trim())) if (/^[A-Z][A-Za-zë-]+( [A-Z][A-Za-zë-]+)*$/.test(n)) names.add(n);
    raw.set(d.id, names);
  }
  const owners = new Map();
  for (const [id, names] of raw) for (const n of names) owners.set(n, [...(owners.get(n) || []), id]);
  const out = new Map();
  for (const [id, names] of raw) {
    const keep = [...names].filter((n) => n.length >= 4 && !ignore.includes(n) && owners.get(n).length === 1);
    if (keep.length) out.set(id, keep);
  }
  return out;
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, (c) => String.fromCharCode(92) + c);
const wordRe = (n) => new RegExp(`(^|[^A-Za-zÀ-ÿ])${esc(n)}($|[^A-Za-zÀ-ÿ])`);

// all violations: [{ step, scene, id, kind: 'noemt'|'spreekt', name }]
export function analyse({ scenes, dossiers, positions, ignore = [] }) {
  const byId = new Map(dossiers.map((d) => [d.id, d]));
  const bySpeaker = new Map(dossiers.filter((d) => d.speakerKey !== 'n.v.t.').map((d) => [d.speakerKey, d]));
  const index = nameIndex(dossiers, ignore);
  const res = index.size ? [...index].map(([id, names]) => ({ id, res: names.map((n) => [n, wordRe(n)]) })) : [];
  const out = [];
  for (const sc of scenes) {
    const here = positions.get(sc.step);
    if (!here) throw new Error(`stap ${sc.step} (scène ${sc.id}) staat niet in de stappenlijst`);
    const introAt = (d) => positions.get(d.firstStep);
    for (const l of sc.lines || []) {
      const sp = bySpeaker.get(l.key);
      if (sp && sp.firstStep !== 'n.v.t.' && sp.tier !== 'lead' && introAt(sp) && before(here, introAt(sp))) out.push({ step: sc.step, scene: sc.id, id: sp.id, kind: 'spreekt', name: sp.name });
      for (const { id, res: rs } of res) {
        const d = byId.get(id);
        const at = introAt(d);
        if (!at || !before(here, at)) continue;
        const hit = rs.find(([, re]) => re.test(l.text || ''));
        if (hit && !(sp && sp.id === id)) out.push({ step: sc.step, scene: sc.id, id, kind: 'noemt', name: hit[0] });
      }
    }
  }
  return out;
}
const key = (v) => `${v.step}|${v.id}|${v.kind}`;
const unique = (vs) => [...new Map(vs.map((v) => [key(v), v])).values()];

// ---- the checks ----
let n = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 8).join('\n  ')); process.exitCode = 1; } };

// 1. the analysis itself, on a synthetic story (behaviour, not source)
t('de analyse vindt een naam die eerder is ingeleid niet, en een naam die te vroeg valt wel', () => {
  const dossiers = [
    { id: 'tammo', tier: 'lead', name: 'Tammo', nick: 'n.v.t.', speakerKey: 'T', firstStep: 'S1' },
    { id: 'bert', tier: 'supporting', name: 'Bert Hoekstra', nick: 'Duivenmelker Bert', speakerKey: 'bert', firstStep: 'S3' },
    { id: 'hindrik', tier: 'minor', name: 'Hindrik de Jong', nick: 'Oom Hindrik', aliases: ['Oom Hindrik', 'Hindrik'], speakerKey: 'n.v.t.', firstStep: 'S2' },
    { id: 'geen', tier: 'minor', name: 'Gerrit Zonder', nick: 'n.v.t.', speakerKey: 'n.v.t.', firstStep: 'n.v.t.' },
  ];
  const positions = stepPositions({ chapters: { H1: ['S1', 'S2'], H2: ['S3'] } }, null);
  const sc = (id, step, lines) => ({ id, step, lines });
  const v = analyse({ dossiers, positions, scenes: [
    sc('a', 'S1', [{ key: 'T', text: 'Ga naar Bert, die weet het. En Gerrit Zonder ook.' }]), // Bert te vroeg; Gerrit heeft geen firstStep
    sc('b', 'S2', [{ key: 'T', text: 'Oom Hindrik wacht.' }]), // ingeleid in dezelfde stap: goed
    sc('c', 'S2', [{ key: 'bert', text: 'Ik ben hier al.' }]), // spreekt voor zijn intro
    sc('d', 'S3', [{ key: 'bert', text: 'Hindrik en Bert samen.' }]), // allemaal ingeleid
  ] });
  assert.deepEqual(v.map(key).sort(), ['S1|bert|noemt', 'S2|bert|spreekt']);
  assert.ok(!v.some((x) => x.id === 'geen'), 'zonder firstStep wordt niet beoordeeld');
});

t('de stappenlijst telt elke stap één keer en de volgorde is per hoofdstuk', () => {
  assert.throws(() => stepPositions({ chapters: { H1: ['A'], H2: ['A'] } }, null), /twee keer/);
  const p = stepPositions({ chapters: { H1: ['A', 'B'], H2: ['C'] } }, null);
  assert.ok(before(p.get('A'), p.get('B')) && before(p.get('B'), p.get('C')) && !before(p.get('C'), p.get('A')));
  const s = stepPositions(null, { scenes: [{ step: 'X' }, { step: 'Y' }, { step: 'X' }] }, 'script');
  assert.ok(before(s.get('X'), s.get('Y')));
});

// 2. the real story against the bible
const D = await import('../game/js/characterdossiers.js');
const script = JSON.parse(read('game/storydata/script.json'));
const config = JSON.parse(read(opt('steps', 'scripts/story_steps_nieuw.json')));
const positions = stepPositions(config, script, opt('order', 'bible'));
const planned = new Set(config.planned || []);

t('elke stap van het script staat in de stappenlijst, en elke stap van de lijst bestaat of is gepland', () => {
  const inScript = new Set(script.scenes.map((s) => s.step));
  const missing = [...inScript].filter((s) => !positions.has(s));
  assert.deepEqual(missing, [], `stappen van het script die niet in de stappenlijst staan: ${missing.join(', ')}`);
  const ghost = [...positions.keys()].filter((s) => !inScript.has(s) && !planned.has(s));
  assert.deepEqual(ghost, [], `stappen in de lijst die niet bestaan en niet gepland zijn: ${ghost.join(', ')}`);
});

t('elke firstStep van de personagebijbel staat in de stappenlijst', () => {
  for (const d of D.DOSSIERS) if (d.firstStep !== 'n.v.t.') assert.ok(positions.has(d.firstStep) || planned.has(d.firstStep), `${d.id}: firstStep ${d.firstStep} staat niet in de stappenlijst`);
});

t('de bijbelpersonages die nieuw zijn hebben een firstStep (de naamindex is er klaar voor)', () => {
  for (const id of ['sander', 'hayo', 'eppo', 'ypie', 'dries', 'annemarie', 'jochem', 'noor', 'dina', 'hilda', 'joost', 'tjeerd', 'femke', 'boer_hindrik', 'tante_aaltje', 'trijntje', 'beppe']) {
    const d = D.dossierOf(id);
    assert.ok(d && d.firstStep !== 'n.v.t.', `${id}: geen firstStep`);
  }
  const idx = nameIndex(D.DOSSIERS);
  assert.ok(idx.size >= 40, `de naamindex heeft ${idx.size} personages, verwacht minstens 40`);
  for (const id of ['beppe', 'trijntje', 'mem', 'hilda', 'tjeerd']) assert.ok(idx.has(id), `${id} staat niet in de naamindex`);
});

const violations = unique(analyse({ scenes: script.scenes, dossiers: D.DOSSIERS, positions }));
const baselineFile = new URL('./story_names_baseline.json', import.meta.url);
if (flag('write-baseline')) { fs.writeFileSync(baselineFile, JSON.stringify({ _: 'Bekende overtredingen van de naamregel (scripts/story_names_test.mjs): stap|personage|soort. Alleen laten krimpen; schrijf opnieuw met --write-baseline.', order: opt('order', 'bible'), violations: violations.map(key).sort() }, null, 1) + '\n'); console.log(`basislijn geschreven: ${violations.length} overtredingen`); }
const baseline = new Set(fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')).violations : []);

if (flag('list')) for (const v of violations) console.log(`${positions.get(v.step).join('.')}  ${v.step}  ${v.scene}  ${v.kind} ${v.id} (${v.name})`);

t(flag('strict') ? 'strikt: geen enkele naam of verwijzing komt voor zijn inleiding' : 'geen nieuwe overtreding van de naamregel (de basislijn is het bekende werk)', () => {
  if (flag('strict')) return assert.equal(violations.length, 0, `${violations.length} overtredingen; zie --list`);
  const fresh = violations.filter((v) => !baseline.has(key(v)));
  assert.deepEqual(fresh.map(key), [], `nieuwe overtredingen (een personage wordt genoemd of spreekt voor zijn firstStep): zet de inleiding eerder of verplaats de firstStep`);
  const solved = [...baseline].filter((k) => !violations.some((v) => key(v) === k));
  assert.deepEqual(solved, [], `opgeloste overtredingen staan nog in de basislijn: draai --write-baseline`);
});

if (!process.exitCode) console.log(`story_names_test: ${n}/${n} ok (${violations.length} bekende overtredingen in ${new Set(violations.map((v) => v.step)).size} stappen; volgorde ${opt('order', 'bible')})`);
