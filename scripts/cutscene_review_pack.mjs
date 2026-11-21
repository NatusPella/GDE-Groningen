// Cutscene-reviewpakket (laag 4 van het cutscene-kwaliteitssysteem, docs/CUTSCENE-REGIE-21-11.md): bundelt per cutscene het script
// (tekst + shotlijst), de lintvondsten en de contactbladen van laag 3 tot een pakket voor vision-reviewers (agents), met een
// vaste uitvoer, zodat de bevindingen terugkomen als reviewrapport (aspect `cutscenes` in de releasegate) en als lijst voor issues.
// De inhoud van de beoordelingsprompt staat in scripts/release/prompts/cutscene-review.md (regie-bijbel: docs/CUTSCENE-REGIE-21-11.md);
// dit script bepaalt alleen WAT een reviewer krijgt en WAT hij teruggeeft.
//
// Humor is smaak. Het pakket laat grappen ongemoeid en label ze alleen (`humor-review`). Een PANEL van onafhankelijke
// reviewers (standaard 3) oordeelt per komische beat; de meerderheid beslist (bij een gelijke stand blijft de grap
// zoals hij is) met een reden en een zekerheid. De eigenaar krijgt alleen een VETO-lijst per akte, met gevoelige en
// onzekere gevallen bovenaan; hij hoeft niets goed te keuren.
//
//   node scripts/cutscene_review_pack.mjs [--out=<map>] [--render=<map van cutscene_render>] [--only=M01,M02.intro] [--panel=3]
//        [--changed=<git-ref>]   alleen cutscenes met gewijzigde tekst (script.json) of, bij gewijzigde cutscene-code, alle geregisseerde
//        [--commit=<sha>]
//   node scripts/cutscene_review_pack.mjs --collect=<map met uitvoer-*.json van de reviewers> [--out=<map>] [--commit=<sha>]
//        → bevindingen.json (reviewrapport voor scripts/release/findings.mjs), bevindingen.md (lijst voor issues),
//          humor-uitslag.json en humor-veto-akte<N>.md (de vetolijsten voor de eigenaar)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadUnits, ROOT } from './lib/cutscene_data.mjs';
import { lintUnit, rapportVan, checkIntroductions, humorCandidates, sampleScene, shotsVan, shotType, RULES } from './lib/cutscene_lint.mjs';

const arg = (k, d = '') => { const a = process.argv.find((v) => v === `--${k}` || v.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.slice(k.length + 3) : true) : d; };
const safe = (id) => String(id).replace(/[^\w.-]/g, '_');
export const PROMPT = 'scripts/release/prompts/cutscene-review.md';
export const BIJBEL = 'docs/CUTSCENE-REGIE-21-11.md';
export const OORDEELOPTIES = ['behouden', 'aanpassen', 'schrappen'];
// Onderwerpen die met zorg moeten (constitutie 6): altijd bovenaan de vetolijst, ook als het panel het eens is.
const GEVOELIG = /\b(gaswinning|aardbeving|aardbevingen|slachtoffer|dood|doodgaan|overleden|begrafenis|gewond|ziekenhuis|zelfmoord|geweld|vermoord|schade door|scheuren in|NAM|ramp)\b/i;

// ---------------------------------------------------------------- pakket per cutscene

const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1);

export function shotLijst(unit) {
  if (!unit.scene || !unit.def) return [];
  const frames = sampleScene(unit);
  const shots = shotsVan(frames);
  const defShots = unit.def.shots || [];
  return shots.map((sh, i) => {
    const d = defShots[sh.idx] || {};
    const c0 = sh.frames[0].s.camera, c1 = sh.frames[sh.frames.length - 1].s.camera;
    const verschuiving = Math.hypot(c1.position.x - c0.position.x, c1.position.y - c0.position.y, c1.position.z - c0.position.z);
    const spreker = (unit.lines || []).find((l) => sh.t0 >= l.at - 0.01 && sh.t0 < l.at + l.dur);
    return { nr: i, shot: sh.idx, van: +fmt(sh.t0), tot: +fmt(i + 1 < shots.length ? shots[i + 1].t0 : unit.duration), soort: d.shot || '?', type: shotType(sh, d), kijkt: typeof d.look === 'string' ? d.look : d.target || null, lens: Math.round(c0.fov), hoogte: +fmt(c0.position.z), beweging_m: +fmt(verschuiving), spreker: spreker ? spreker.speaker : null };
  });
}

export function packVan(unit, vondsten, { render = null, commit = '' } = {}) {
  const humor = humorCandidates(unit).map((c) => ({ ...c, voor: (unit.lines[c.regelNr - 1] || {}).text || null, na: (unit.lines[c.regelNr + 1] || {}).text || null, gevoelig: GEVOELIG.test(c.text) || GEVOELIG.test((unit.lines[c.regelNr - 1] || {}).text || '') }));
  return {
    cutscene: unit.id, groep: unit.group, akte: unit.act || 0, commit, duur: +fmt(unit.duration), regie: unit.regie || [],
    regels: (unit.lines || []).map((l, i) => ({ nr: i, wie: l.speaker, tekst: l.text, van: +fmt(l.at), duur: +fmt(l.dur), kanaal: l.channel || 'stem', alleenOndertitel: !!l.textOnly })),
    shots: shotLijst(unit),
    lint: vondsten.filter((v) => v.categorie !== 'smaak').map((v) => ({ regel: v.regel, ernst: v.ernst, bericht: v.bericht, t: v.t ?? null })),
    humor, beelden: render,
  };
}

function bladen(renderDir, id) {
  if (!renderDir) return null;
  const dir = path.join(renderDir, safe(id));
  const contact = path.join(dir, 'vision', 'contact');
  const lijst = fs.existsSync(contact) ? fs.readdirSync(contact).filter((f) => /\.png$/.test(f)).sort().map((f) => path.relative(ROOT, path.join(contact, f)).split(path.sep).join('/')) : [];
  const meet = path.join(dir, 'measure.json');
  let meting = null;
  if (fs.existsSync(meet)) { try { const m = JSON.parse(fs.readFileSync(meet, 'utf8')); meting = { blokkerend: m.blokkerend, belangrijk: m.belangrijk, vondsten: m.vondsten.map((v) => `${v.regel} ${v.bericht}`) }; } catch { /* onleesbaar */ } }
  return lijst.length || meting ? { contactbladen: lijst, rijen: 'elke rij is een shot; kolommen zijn begin, midden en eind', meting } : null;
}

export const UITVOER_VOORBEELD = {
  cutscene: '<id>', reviewer: '<naam>', commit: '<sha>',
  scores: { tekst: 4, camera: 3, visueel: 4, volgbaar: 5 },
  bevindingen: [{ ernst: 'belangrijk', categorie: 'camera', titel: 'korte titel', beschrijving: 'wat, waar (regelnr of tijd) en waarom', bewijs: ['regel 3', 'blad-01 rij 2'], fix: 'wat te doen' }],
  humor: [{ regelNr: 0, keuze: 'behouden', variant: null, reden: 'waarom', zekerheid: 0.8, gevoelig: false }],
};

export function renderPack(p, { reviewer = '', panel = null } = {}) {
  const L = [];
  L.push(`# Reviewpakket cutscene ${p.cutscene}${reviewer ? ` (reviewer ${reviewer})` : ''}`);
  L.push('');
  L.push(`Groep ${p.groep}, akte ${p.akte || '?'}, duur ${p.duur} s${p.commit ? `, commit ${p.commit}` : ''}.`);
  L.push(`Lees eerst \`${PROMPT}\` (beoordelingsprompt) en \`${BIJBEL}\` (regie-bijbel). Beoordeel alleen deze cutscene, onafhankelijk${panel ? ` van de andere ${panel - 1} reviewers van het panel` : ''}.`);
  L.push('');
  L.push('Vragen: kloppen tekst, camera en visuele logica? Is het volgbaar voor iemand met nul context? Nederlands, introducties, dialoogritme, regie-bijbel. Grappen beoordeel je niet als goed of slecht in je bevindingen: structuur (is de grap uitgelegd, is er ruimte voor een reactie) mag, smaak gaat via het `humor`-veld hieronder.');
  L.push('');
  if (p.regie.length) { L.push('## Regie uit het verhaal'); for (const r of p.regie) L.push(`- ${r}`); L.push(''); }
  L.push('## Script');
  L.push('| nr | wie | tekst | van (s) | duur (s) | kanaal |');
  L.push('|---|---|---|---|---|---|');
  for (const r of p.regels) L.push(`| ${r.nr} | ${r.wie} | ${String(r.tekst).replace(/\|/g, '\\|')} | ${r.van} | ${r.duur} | ${r.kanaal}${r.alleenOndertitel ? ' (alleen ondertitel)' : ''} |`);
  L.push('');
  if (p.shots.length) {
    L.push('## Shotlijst');
    L.push('| shot | van | tot | soort | type | kijkt naar | lens | hoogte (m) | beweging (m) | spreker |');
    L.push('|---|---|---|---|---|---|---|---|---|---|');
    for (const s of p.shots) L.push(`| ${s.nr} | ${s.van} | ${s.tot} | ${s.soort} | ${s.type} | ${s.kijkt || ''} | ${s.lens} | ${s.hoogte} | ${s.beweging_m} | ${s.spreker || ''} |`);
    L.push('');
  } else L.push('## Shotlijst\nGeen eigen regie: alleen de tekst is te beoordelen.\n');
  if (p.beelden) {
    L.push('## Beelden');
    for (const b of p.beelden.contactbladen) L.push(`- ${b}`);
    L.push(p.beelden.rijen ? `(${p.beelden.rijen})` : '');
    if (p.beelden.meting) { L.push(`Automatische beeldmeting: ${p.beelden.meting.blokkerend} blokkerend, ${p.beelden.meting.belangrijk} belangrijk.`); for (const v of p.beelden.meting.vondsten.slice(0, 12)) L.push(`- ${v}`); }
    L.push('');
  } else L.push('## Beelden\nNog geen gerenderde beelden (laag 3 draait later); beoordeel tekst en shotlijst en zeg dat het beeld niet bekeken is.\n');
  L.push('## Automatische vondsten (linter)');
  if (!p.lint.length) L.push('Geen.'); else for (const v of p.lint) L.push(`- [${v.ernst}] ${v.regel} ${RULES[v.regel] ? RULES[v.regel].titel + ': ' : ''}${v.bericht}`);
  L.push('');
  L.push('## Komische beats (label humor-review)');
  if (!p.humor.length) L.push('Geen kandidaten.');
  else for (const h of p.humor) L.push(`- regel ${h.regelNr} (${h.speaker}): "${h.text}" [${h.redenen.join(', ')}]${h.gevoelig ? ' [GEVOELIG]' : ''}${h.voor ? `\n  - ervoor: "${h.voor}"` : ''}${h.na ? `\n  - erna: "${h.na}"` : ''}`);
  L.push('');
  L.push('## Uitvoer');
  L.push(`Schrijf precies één JSON-bestand \`uitvoer-${safe(p.cutscene)}${reviewer ? '-' + reviewer : ''}.json\`, zonder proza eromheen:`);
  L.push('```json');
  L.push(JSON.stringify({ ...UITVOER_VOORBEELD, cutscene: p.cutscene, reviewer: reviewer || '<naam>', commit: p.commit || '<sha>' }, null, 2));
  L.push('```');
  L.push(`- \`scores\`: 1 tot 5 per onderdeel (5 = goed voor een speler zonder context). \`ernst\`: blokkerend, belangrijk of nit; blokkerend vraagt bewijs.`);
  L.push(`- \`humor\`: één item per komische beat hierboven; \`keuze\` is ${OORDEELOPTIES.map((o) => `\`${o}\``).join(', ')}; bij \`aanpassen\` een \`variant\`; \`zekerheid\` 0 tot 1; \`gevoelig\` true bij een gevoelig onderwerp (constitutie 6). Bij twijfel: \`behouden\`.`);
  return L.join('\n') + '\n';
}

// ---------------------------------------------------------------- panel en terugkoppeling

export function panelRapporten(reports) {
  // reports: de JSON-uitvoer van alle reviewers over alle cutscenes
  const perCut = new Map();
  for (const r of reports) { if (!r || !r.cutscene) continue; if (!perCut.has(r.cutscene)) perCut.set(r.cutscene, []); perCut.get(r.cutscene).push(r); }
  return perCut;
}

// Meerderheid per komische beat. Bij een gelijke stand (of zonder meerderheid) blijft de grap zoals hij is.
export function stemHumor(oordelen, { drempel = 0.6 } = {}) {
  const n = oordelen.length;
  const tel = {};
  for (const o of oordelen) { const k = OORDEELOPTIES.includes(o.keuze) ? o.keuze : 'behouden'; tel[k] = (tel[k] || 0) + 1; }
  const gesorteerd = Object.entries(tel).sort((a, b) => b[1] - a[1]);
  const top = gesorteerd[0];
  const gelijk = gesorteerd.length > 1 && gesorteerd[1][1] === top[1];
  const keuze = gelijk || top[1] <= n / 2 ? 'behouden' : top[0];
  const voor = oordelen.filter((o) => (OORDEELOPTIES.includes(o.keuze) ? o.keuze : 'behouden') === keuze);
  const gem = voor.length ? voor.reduce((s, o) => s + (Number.isFinite(o.zekerheid) ? o.zekerheid : 0.5), 0) / voor.length : 0.5;
  const eensgezind = voor.length / n;
  const zekerheid = Math.round(eensgezind * gem * 100) / 100;
  const beste = keuze === 'aanpassen' ? voor.filter((o) => o.variant).sort((a, b) => (b.zekerheid || 0) - (a.zekerheid || 0))[0] : null;
  return {
    keuze, variant: beste ? beste.variant : null, stemmen: tel, zekerheid, eensgezind: Math.round(eensgezind * 100) / 100,
    reden: (beste ? beste.reden : (voor.find((o) => o.reden) || {}).reden) || '', gevoelig: oordelen.some((o) => o.gevoelig), laag: zekerheid < drempel || (gelijk && n > 1),
  };
}

export function humorUitslag(perCut, packs = new Map()) {
  const items = [];
  for (const [id, reports] of perCut) {
    const beats = new Map();
    for (const r of reports) for (const h of r.humor || []) { if (!beats.has(h.regelNr)) beats.set(h.regelNr, []); beats.get(h.regelNr).push(h); }
    const pack = packs.get(id);
    for (const [regelNr, oordelen] of beats) {
      const regel = pack && pack.regels ? pack.regels.find((x) => x.nr === regelNr) : null;
      const kand = pack && pack.humor ? pack.humor.find((x) => x.regelNr === regelNr) : null;
      const uitslag = stemHumor(oordelen);
      items.push({ cutscene: id, akte: (pack && pack.akte) || (reports[0] && reports[0].akte) || 0, regelNr, tekst: regel ? regel.tekst : (oordelen[0].tekst || ''), wie: regel ? regel.wie : '', ...uitslag, gevoelig: uitslag.gevoelig || !!(kand && kand.gevoelig) || GEVOELIG.test(regel ? regel.tekst : ''), reviewers: oordelen.length });
    }
  }
  return items;
}

// De vetolijst voor de eigenaar: eerst wat gevoelig of onzeker is, daarna wat het panel koos. De eigenaar geeft alleen veto.
export function renderVeto(akte, items) {
  const mijn = items.filter((i) => i.akte === akte);
  const eerst = mijn.filter((i) => i.gevoelig || i.laag).sort((a, b) => Number(b.gevoelig) - Number(a.gevoelig) || a.zekerheid - b.zekerheid);
  const rest = mijn.filter((i) => !(i.gevoelig || i.laag)).sort((a, b) => a.cutscene.localeCompare(b.cutscene) || a.regelNr - b.regelNr);
  const regel = (i) => `- [ ] \`${i.cutscene}\` regel ${i.regelNr}${i.wie ? ` (${i.wie})` : ''}: "${i.tekst}"\n  - panel: **${i.keuze}** (${Object.entries(i.stemmen).map(([k, v]) => `${v}x ${k}`).join(', ')}; zekerheid ${i.zekerheid})${i.variant ? `; variant: "${i.variant}"` : ''}${i.reden ? `\n  - reden: ${i.reden}` : ''}${i.gevoelig ? '\n  - GEVOELIG onderwerp: kijk hier zelf naar' : ''}`;
  const L = [`# Humor-veto akte ${akte}`, '', 'Het panel van onafhankelijke reviewers heeft deze komische beats beoordeeld; de meerderheid heeft besloten. Jij hoeft niets goed te keuren: zet een kruisje (`[x]`) bij wat je terugdraait, de rest staat.', ''];
  L.push(`## Eerst kijken: gevoelig of onzeker (${eerst.length})`); L.push(eerst.length ? eerst.map(regel).join('\n') : 'Niets.'); L.push('');
  L.push(`## Het panel koos (${rest.length}), alleen veto`); L.push(rest.length ? rest.map(regel).join('\n') : 'Niets.');
  return L.join('\n') + '\n';
}

// De bevindingen van het panel als één reviewrapport. Een bevinding telt als hij door minstens twee reviewers (of de enige reviewer) is gedaan;
// een bevinding van één reviewer in een panel komt als nit mee, zodat niets verdwijnt maar niets onterecht blokkeert.
export function bevindingenVan(perCut, { commit = '' } = {}) {
  const out = [];
  for (const [id, reports] of perCut) {
    const n = reports.length;
    const groepen = new Map();
    for (const r of reports) for (const b of r.bevindingen || []) {
      const sleutel = `${b.categorie || ''}|${String(b.titel || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 40)}`;
      if (!groepen.has(sleutel)) groepen.set(sleutel, []);
      groepen.get(sleutel).push({ ...b, door: r.reviewer });
    }
    for (const lijst of groepen.values()) {
      const eerste = lijst[0];
      const rang = { blokkerend: 0, belangrijk: 1, nit: 2 };
      const meerderheid = n === 1 || lijst.length >= 2;
      let ernst = lijst.map((b) => b.ernst).sort((a, b) => rang[a] - rang[b])[Math.floor((lijst.length - 1) / 2)] || 'nit';
      if (!meerderheid && ernst !== 'nit') ernst = 'nit';
      const bewijs = [...new Set(lijst.flatMap((b) => b.bewijs || []))];
      if (ernst === 'blokkerend' && !bewijs.length) bewijs.push(`cutscene ${id}`);
      out.push({ bron: 'vision', aspect: 'cutscenes', ernst, categorie: String(eerste.categorie || 'regie').slice(0, 40), titel: `${id}: ${String(eerste.titel || 'bevinding').slice(0, 100)}`.slice(0, 120), beschrijving: `${String(eerste.beschrijving || '').slice(0, 1700)} (gezien door ${lijst.length} van ${n} reviewer${n === 1 ? '' : 's'})`.padEnd(10, '.'), ...(ernst === 'blokkerend' || bewijs.length ? { bewijs } : {}), ...(eerste.fix ? { fix: String(eerste.fix).slice(0, 1000) } : {}), reviewer: lijst.map((b) => b.door).filter(Boolean).join(', ').slice(0, 80) || 'cutscene-panel' });
    }
  }
  return { onderwerp: 'cutscenes', reviewer: 'cutscene-panel', commit: /^[0-9a-f]{7,40}$/.test(commit) ? commit : '0000000', dekking: { bestanden: [], beelden: [], aspecten: ['cutscenes'], opmerking: `${perCut.size} cutscenes beoordeeld` }, bevindingen: out };
}

export function renderBevindingen(rapport) {
  const groepen = { blokkerend: [], belangrijk: [], nit: [] };
  for (const b of rapport.bevindingen) groepen[b.ernst].push(b);
  const L = ['# Cutscene-bevindingen van het reviewpanel', ''];
  for (const [ernst, lijst] of Object.entries(groepen)) {
    L.push(`## ${ernst} (${lijst.length})`);
    for (const b of lijst) L.push(`- **${b.titel}** [${b.categorie}]: ${b.beschrijving}${b.fix ? ` Fix: ${b.fix}` : ''}`);
    L.push('');
  }
  return L.join('\n');
}

// ---------------------------------------------------------------- wat is gewijzigd

function gewijzigdeScenes(ref) {
  const git = (a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  const lijst = git(['diff', '--name-only', ref, '--', 'game/js', 'game/storydata']);
  const bestanden = (lijst.stdout || '').split('\n').filter(Boolean);
  const code = bestanden.some((f) => /game\/js\/(cutscene|cinematics|cineshots|cutscript|cuegestures|poseclips|missionstory)/.test(f));
  const oud = git(['show', `${ref}:game/storydata/script.json`]);
  const ids = new Set();
  if (oud.status === 0) {
    try {
      const was = new Map(JSON.parse(oud.stdout).scenes.map((s) => [s.id, JSON.stringify(s)]));
      const nu = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/storydata/script.json'), 'utf8'));
      for (const s of nu.scenes) if (was.get(s.id) !== JSON.stringify(s)) ids.add(s.id);
    } catch { /* onleesbaar: alle scènes */ code || ids.add('*'); }
  }
  return { code, ids, bestanden };
}

// ---------------------------------------------------------------- hoofdprogramma

async function bouwPakketten() {
  const OUT = path.resolve(String(arg('out', path.join(ROOT, 'docs', 'beeld-21-11', 'cutscenes', 'review'))));
  const renderDir = arg('render') ? path.resolve(String(arg('render'))) : (fs.existsSync(path.join(ROOT, 'docs', 'beeld-21-11', 'cutscenes', 'render-report.json')) ? path.join(ROOT, 'docs', 'beeld-21-11', 'cutscenes') : null);
  const only = String(arg('only', '')).split(',').filter(Boolean);
  const panel = Math.max(1, Number(arg('panel', 1)) || 1);
  const commit = String(arg('commit', ''));
  const data = await loadUnits();
  const { units, kaleUnits, scriptUnits, dekking, names, speakers, looks } = data;
  const alle = [...units, ...kaleUnits];
  const ctx = { speakers, npc: looks };
  const intro = checkIntroductions(scriptUnits.map((u) => ({ id: u.id, kind: u.kind, lines: u.lines, regie: u.regie })), names);
  let gekozen = alle;
  if (only.length) gekozen = alle.filter((u) => only.some((o) => u.id === o || u.id.startsWith(o)));
  else if (arg('changed')) {
    const g = gewijzigdeScenes(String(arg('changed')));
    gekozen = alle.filter((u) => (g.code && u.group !== 'Script') || g.ids.has('*') || (u.sceneIds || []).some((s) => g.ids.has(s)));
    console.log(`gewijzigd sinds ${arg('changed')}: ${g.code ? 'cutscene-code' : 'geen cutscene-code'}, ${g.ids.size} scènes met nieuwe tekst`);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const index = [];
  const packs = [];
  for (const u of gekozen) {
    const v = lintUnit(u, ctx);
    for (const sceneId of u.sceneIds || [u.id]) for (const iv of intro.get(sceneId) || []) if ((dekking.get(sceneId) || sceneId) === u.id) v.push({ ...iv, cutscene: u.id });
    const rap = rapportVan(u, v);
    const pack = packVan(u, v, { render: bladen(renderDir, u.id), commit });
    packs.push(pack);
    const dir = path.join(OUT, safe(u.id));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'pack.json'), JSON.stringify(pack, null, 1) + '\n');
    fs.writeFileSync(path.join(dir, 'pack.md'), renderPack(pack));
    if (panel > 1) {
      for (let k = 1; k <= panel; k++) {
        const pd = path.join(OUT, 'panel', safe(u.id));
        fs.mkdirSync(pd, { recursive: true });
        fs.writeFileSync(path.join(pd, `reviewer-${k}.md`), renderPack(pack, { reviewer: `r${k}`, panel }));
      }
    }
    index.push({ id: u.id, groep: u.group, akte: u.act || 0, score: rap.score, blokkerend: rap.blokkerend, belangrijk: rap.belangrijk, humor: pack.humor.length, beelden: !!pack.beelden });
  }
  index.sort((a, b) => a.score - b.score);
  // humorbundels per akte voor het panel (nooit voor de eigenaar zelf)
  const humorPerAkte = {};
  for (const p of packs) for (const h of p.humor) { (humorPerAkte[p.akte] = humorPerAkte[p.akte] || []).push({ ...h, akte: p.akte, wie: h.speaker }); }
  fs.mkdirSync(path.join(OUT, 'humor'), { recursive: true });
  for (const [akte, lijst] of Object.entries(humorPerAkte)) {
    const L = [`# Humor-review akte ${akte} (voor het panel, ${lijst.length} beats)`, '', `Label \`humor-review\`. Een panel van ${panel > 1 ? panel : 3} onafhankelijke reviewers oordeelt per beat (${OORDEELOPTIES.join(', ')}); bij een gelijke stand blijft de grap. Prompt: \`${PROMPT}\`.`, ''];
    for (const h of lijst) L.push(`- \`${h.cutscene}\` regel ${h.regelNr} (${h.speaker}): "${h.text}" [${h.redenen.join(', ')}]${h.gevoelig ? ' [GEVOELIG]' : ''}`);
    fs.writeFileSync(path.join(OUT, 'humor', `akte${akte}-humor-review.md`), L.join('\n') + '\n');
  }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ gemaakt: new Date().toISOString().slice(0, 10), panel, prompt: PROMPT, bijbel: BIJBEL, cutscenes: index }, null, 1) + '\n');
  fs.writeFileSync(path.join(OUT, 'index.md'), `# Reviewpakketten cutscenes\n\n${index.length} cutscenes, slechtste score eerst. Prompt: \`${PROMPT}\`, bijbel: \`${BIJBEL}\`, panel: ${panel}.\n\n| cutscene | akte | score | blokkerend | belangrijk | humorbeats | beelden |\n|---|---|---|---|---|---|---|\n${index.map((i) => `| ${i.id} | ${i.akte} | ${i.score} | ${i.blokkerend} | ${i.belangrijk} | ${i.humor} | ${i.beelden ? 'ja' : 'nog niet'} |`).join('\n')}\n`);
  console.log(`cutscene_review_pack: ${index.length} pakketten in ${OUT}${panel > 1 ? `, panel van ${panel}` : ''}, ${Object.values(humorPerAkte).reduce((s, l) => s + l.length, 0)} humorbeats gelabeld`);
  return 0;
}

async function verzamel() {
  const dir = path.resolve(String(arg('collect')));
  const OUT = path.resolve(String(arg('out', dir)));
  const commit = String(arg('commit', ''));
  const reports = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/^uitvoer-.*\.json$/.test(e.name)) { try { reports.push(JSON.parse(fs.readFileSync(p, 'utf8'))); } catch (er) { console.log(`overgeslagen (geen geldige JSON): ${p}`); } } } };
  walk(dir);
  const perCut = panelRapporten(reports);
  const packs = new Map();
  const packDir = path.resolve(String(arg('packs', path.join(ROOT, 'docs', 'beeld-21-11', 'cutscenes', 'review'))));
  for (const id of perCut.keys()) { const p = path.join(packDir, safe(id), 'pack.json'); if (fs.existsSync(p)) packs.set(id, JSON.parse(fs.readFileSync(p, 'utf8'))); }
  const rapport = bevindingenVan(perCut, { commit });
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'bevindingen.json'), JSON.stringify(rapport, null, 1) + '\n');
  fs.writeFileSync(path.join(OUT, 'bevindingen.md'), renderBevindingen(rapport));
  const uitslag = humorUitslag(perCut, packs);
  fs.writeFileSync(path.join(OUT, 'humor-uitslag.json'), JSON.stringify(uitslag, null, 1) + '\n');
  for (const akte of [...new Set(uitslag.map((i) => i.akte))]) fs.writeFileSync(path.join(OUT, `humor-veto-akte${akte}.md`), renderVeto(akte, uitslag));
  console.log(`cutscene_review_pack: ${reports.length} reviewrapporten, ${perCut.size} cutscenes, ${rapport.bevindingen.length} bevindingen, ${uitslag.length} humorbeats beslist (${uitslag.filter((i) => i.gevoelig || i.laag).length} voor de eigenaar bovenaan)`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (arg('collect') ? verzamel() : bouwPakketten()).then((c) => process.exit(c), (e) => { console.error(e); process.exit(2); });
}
