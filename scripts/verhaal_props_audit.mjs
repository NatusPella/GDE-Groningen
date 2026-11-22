// Audit van props, sets en figuranten van het verhaal (#1121, docs/PROPS-STAND-22-11.md).
//   node scripts/verhaal_props_audit.mjs            controleer en toon de samenvatting
//   node scripts/verhaal_props_audit.mjs --write    schrijf ook docs/PROPS-STAND-22-11.md
// Haalt uit alle missie- en scènedata de gebruikte props, sets, figuranten en voertuigen (kind, set, cast, dressing, wacht)
// en controleert dat elk bestaat in de modelbouwers en catalogi, een polygoonbudget heeft (2 tot 6 materialen, herkenbaar
// silhouet, geen NaN, op de grond), niet dubbel is gebouwd en niet in een figuur of een andere prop staat.
// Zonder gevendorde three.js (cd desktop && npm run stage) is dit een SKIP, geen fout.
import './node3d.mjs';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const read = (f) => fs.readFileSync(new URL(f, ROOT), 'utf8');
const CAST_MARGIN = 0.35;   // m: een figuur staat zo ver van de rand van een voertuig of een groot voorwerp

// Welke prop-id (zonder cijfers) bij welke soort hoort: een scène die weer een doos of bord neerzet voor een klomp, een
// tankwagen of een snackwagen valt hier doorheen. Waarden mogen een lijst zijn.
export const ID_SOORT = {
  klomp: 'klomp', stempel: 'stempel', stempelblad: 'stempel', pinpas: 'pinpas', map: 'map', bierviltje: 'bierviltje', foto: 'fotolijst',
  statief: 'statief', scherm: 'scherm', kratten: 'krat', pannen: 'pan', brij: 'pan', vuurwerk: 'vuurwerk', koeltas: 'koelbox', jas: 'jas',
  aktetas: 'aktetas', vesten: 'hesjes', cont: 'container', tank: 'tankwagen', limo: 'limo', escapade: 'auto', bakkie: 'bakkie',
  trekker: 'trekker', politie: 'politie', koe: 'koe', kat: 'kat', duif: 'duif', duiventil: 'duiventil', botsauto: 'botsauto',
  briefje: 'briefje', radio: 'radio', zuil: 'zuil', automaat: 'automaat', fiets: 'fiets', klembord: 'klembord', matras: 'matras', bal: 'bal',
  bus: ['bestelbus', 'snackwagen'],
};

const rectHit = (px, py, c) => { // punt (f, s) in de gedraaide rechthoek van een prop (c.f, c.s, c.len, c.wid, c.face in graden)
  const a = (c.face || 0) * Math.PI / 180, dx = px - c.f, dy = py - c.s;
  const u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(u) <= c.len / 2 + CAST_MARGIN && Math.abs(v) <= c.wid / 2 + CAST_MARGIN;
};

// de mapping tussen een model-handtekening en zijn soort, voor de duplicaat-controle
const signature = (m) => `${m.tris}|${Object.values(m.bbox).map((v) => v.toFixed(2)).join('x')}`;

export async function auditSources() {
  const A = {};
  try {
    A.cm = await import('../game/js/cutscenemodels.js');
    A.cs = await import('../game/js/cutscript.js');
    A.sp = await import('../game/js/storyprops.js');
    A.a1 = await import('../game/js/cutscenes_akte1.js');
    for (const f of ['cutscenes_akte3', 'cutscenes_akte4', 'cutscenes_akte6']) await import(`../game/js/${f}.js`);
    A.ms = await import('../game/js/missionstory.js');
    A.md = await import('../game/js/missiedecor.js');
    A.wp = await import('../game/js/wachtprops.js');
    A.ss = await import('../game/js/stagesets.js');
    A.cuts = await import('../game/js/cutscenes.js');
  } catch (e) {
    if (e && e.code === 'ERR_MODULE_NOT_FOUND' && /three/.test(String(e.message))) return null;
    throw e;
  }
  return A;
}

export async function runAudit(A) {
  const errors = [], warnings = [], info = [];
  const E = (m) => errors.push(m), W = (m) => warnings.push(m);
  const { cm, cs, sp, a1, ms, md, wp, ss } = A;
  const NPC = ms.NPC;

  // --- 1. de modelbouwers: elke decorsoort heeft een bouwer, een budget en haalt het ---------------------------------------
  const models = {};   // soort -> { bron, tris, mats, bbox, ... }
  const decorList = cm.DECOR_KINDS;
  for (const k of decorList) if (!sp.DECOR_MAKERS[k]) E(`decor ${k}: staat in DECOR_KINDS maar heeft geen bouwer in storyprops.js`);
  for (const k of Object.keys(sp.DECOR_MAKERS)) if (!decorList.includes(k)) E(`decor ${k}: bouwer zonder vermelding in DECOR_KINDS (cutscenemodels.js)`);
  for (const k of decorList) {
    if (!sp.DECOR_MAKERS[k]) continue;
    const b = sp.budgetOf(k);
    let g, m;
    try { g = sp.DECOR_MAKERS[k](); m = sp.measureModel(g); } catch (e) { E(`decor ${k}: bouwen mislukt: ${e.message}`); continue; }
    const again = sp.measureModel(sp.DECOR_MAKERS[k]());
    models[k] = { bron: 'decor', ...m, budget: b };
    if (m.nan) E(`decor ${k}: NaN of oneindig in geometrie of omhullende`);
    if (m.tris > b.tris) E(`decor ${k}: ${m.tris} driehoeken, budget ${b.tris}`);
    if (m.mats < b.mats[0] || m.mats > b.mats[1]) E(`decor ${k}: ${m.mats} materialen, toegestaan ${b.mats[0]} tot ${b.mats[1]}`);
    if (Math.max(m.bbox.x, m.bbox.y, m.bbox.z) > b.maxDim) E(`decor ${k}: grootste afmeting ${Math.max(m.bbox.x, m.bbox.y, m.bbox.z)} m, budget ${b.maxDim} m`);
    if (Math.min(m.bbox.x, m.bbox.y, m.bbox.z) <= 0) E(`decor ${k}: een afmeting is nul (geen silhouet)`);
    if (m.min.y < -0.05) E(`decor ${k}: staat ${(-m.min.y).toFixed(2)} m onder de grond`);
    if (m.min.y > 0.05) E(`decor ${k}: zweeft ${m.min.y.toFixed(2)} m boven de grond`);
    if (again.tris !== m.tris || again.mats !== m.mats) E(`decor ${k}: twee keer bouwen geeft een ander model (niet deterministisch)`);
    try { sp.disposeModel(g); } catch (e) { E(`decor ${k}: opruimen mislukt: ${e.message}`); }
  }
  // dubbel: twee soorten met dezelfde driehoeken en omhullende zijn hetzelfde model onder twee namen
  const seen = {};
  for (const [k, m] of Object.entries(models)) {
    const sig = signature(m);
    if (seen[sig]) E(`decor ${k} en ${seen[sig]} zijn hetzelfde model (zelfde driehoeken en afmetingen): voeg samen`);
    else seen[sig] = k;
  }

  // voertuigen en dieren uit de wereld: de bron bestaat, de afmetingen staan in PROP_FOOT
  for (const [k, src] of Object.entries(cm.PROP_SOURCES)) {
    if (src.vehicle) {
      if (!cm.VEHICLE_MODEL_NAMES.includes(src.vehicle) && src.vehicle !== 'van') E(`voertuig ${k}: modelnaam ${src.vehicle} staat niet in VEHICLE_MODEL_NAMES`);
      if (!cm.PROP_FOOT[k]) W(`voertuig ${k}: geen PROP_FOOT (de camera kent zijn afmetingen niet)`);
      models[k] = { bron: 'voertuig (wereld)', model: src.vehicle, foot: cm.PROP_FOOT[k] || null };
    } else if (src.animal) {
      models[k] = { bron: 'dier (wereld)', model: src.animal };
    }
  }
  // elke soort die een scène mag gebruiken is geclassificeerd
  for (const k of cs.PROP_KINDS) if (!cm.PROP_SOURCES[k] && !cm.DECOR_KINDS.includes(k) && !cm.PLACEHOLDER_KINDS.includes(k)) E(`soort ${k}: in PROP_KINDS maar nergens geclassificeerd`);
  for (const k of cm.DECOR_KINDS) if (!cs.PROP_KINDS.includes(k)) E(`decor ${k}: ontbreekt in PROP_KINDS (cutscript.js): een scène mag hem niet gebruiken`);
  for (const k of cm.CARRY_LOW) if (!cs.PROP_KINDS.includes(k)) E(`CARRY_LOW ${k}: onbekende soort`);

  // --- 2. de scènes: soorten, verwijzingen, sets, figuranten, overlap -------------------------------------------------------
  const specs = { ...a1.SPECS, ...a1.MORE_SPECS };
  const openingen = a1 && A.cuts ? A.cuts.openingActs([{ speaker: 'Tammo', text: 'x', at: 1, dur: 2 }]).map((o, i) => [`opening-${i + 1}`, o.def]) : [];
  const gebruik = {};
  const setsGezien = {};
  let nProps = 0, nScenes = 0;
  const knownSets = new Set([...ss.STAGE_SETS, 'keuken']);
  const scenes = [...Object.entries(specs), ...openingen];
  for (const [key, spec] of scenes) {
    nScenes++;
    const props = spec.props || {};
    const castKeys = Object.keys(spec.cast || spec.actors || {});
    const actorIds = new Set(['tammo', 'tessa', ...castKeys]);
    if (spec.set) { setsGezien[spec.set] = (setsGezien[spec.set] || 0) + 1; if (!knownSets.has(spec.set)) E(`scène ${key}: onbekende set ${spec.set}`); }
    for (const [id, p] of Object.entries(props)) {
      nProps++;
      gebruik[p.kind] = (gebruik[p.kind] || 0) + 1;
      const bad = cm.propKindIssue(p.kind) || (cs.PROP_KINDS.includes(p.kind) ? null : `soort ${p.kind} staat niet in PROP_KINDS`);
      if (bad) E(`scène ${key}, prop ${id}: ${bad}`);
      const stripped = id.replace(/\d+$/, '');
      const want = ID_SOORT[stripped];
      if (want && !(Array.isArray(want) ? want : [want]).includes(p.kind)) E(`scène ${key}, prop ${id}: heet ${stripped} maar is een ${p.kind} (verwacht ${[].concat(want).join(' of ')}): een stand-in`);
      if (p.at && p.at.length >= 2 && (p.at.some((v) => !Number.isFinite(v)))) E(`scène ${key}, prop ${id}: ongeldige plek ${JSON.stringify(p.at)}`);
    }
    // twee props van dezelfde soort op dezelfde plek (en dezelfde hoogte) zijn er één te veel
    const keys = Object.entries(props);
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
      const [ia, pa] = keys[i], [ib, pb] = keys[j];
      if (pa.kind === pb.kind && pa.at && pb.at && Math.hypot(pa.at[0] - pb.at[0], pa.at[1] - pb.at[1]) < 0.05 && (pa.at[2] || 0) === (pb.at[2] || 0)) E(`scène ${key}: ${ia} en ${ib} (${pa.kind}) staan op dezelfde plek`);
    }
    // verwijzingen: prop:, actor:, carry, drop, follows, mid:
    const walk = (o, f) => { if (Array.isArray(o)) o.forEach((x) => walk(x, f)); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { f(k, v); walk(v, f); } };
    walk({ open: spec.open, beats: spec.beats, shots: spec.shots, wide: spec.wide, direct: spec.direct, props, cast: spec.cast, duo: spec.duo }, (k, v) => {
      if (typeof v !== 'string') return;
      for (const m of v.matchAll(/prop:(\w+)/g)) if (!props[m[1]]) E(`scène ${key}: verwijzing prop:${m[1]} bestaat niet`);
      for (const m of v.matchAll(/actor:(\w+)/g)) if (!actorIds.has(m[1])) E(`scène ${key}: verwijzing actor:${m[1]} bestaat niet`);
      if (/^mid:/.test(v)) for (const t of v.slice(4).replace(/@[\d.]+$/, '').split(',')) if (!actorIds.has(t) && !props[t]) E(`scène ${key}: ${v} noemt ${t}, dat bestaat niet`);
      if ((k === 'carry' || k === 'drop' || k === 'follows') && !props[v]) E(`scène ${key}: ${k} ${v} is geen prop van de scène`);
    });
    // figuranten: elke rol in de cast bestaat in de NPC-tabel en heeft een volledig uiterlijk
    for (const [id, c] of Object.entries(spec.cast || {})) {
      if (!NPC[c.key]) E(`scène ${key}: figurant ${id} heeft sleutel ${c.key} zonder uiterlijk in de NPC-tabel (missionstory.js)`);
      if (!Array.isArray(c.at) || c.at.some((v) => !Number.isFinite(v))) E(`scène ${key}: figurant ${id} heeft geen geldige plek`);
    }
    // overlap: een figuur aan het begin binnen de rechthoek van een voertuig of groot voorwerp
    const standers = [{ id: 'tammo', f: spec.duo && spec.duo.tammo && spec.duo.tammo.at ? spec.duo.tammo.at[0] : 0, s: spec.duo && spec.duo.tammo && spec.duo.tammo.at ? spec.duo.tammo.at[1] : 0.6 }, { id: 'tessa', f: spec.duo && spec.duo.tessa && spec.duo.tessa.at ? spec.duo.tessa.at[0] : 0, s: spec.duo && spec.duo.tessa && spec.duo.tessa.at ? spec.duo.tessa.at[1] : -0.6 }];
    for (const [id, c] of Object.entries(spec.cast || {})) if (Array.isArray(c.at) && !c.hidden) standers.push({ id, f: c.at[0], s: c.at[1] });
    // wie in de opening wegloopt of verborgen is (de stemmen in een rijdende cabine) begint bewust bij het voertuig
    const leavers = new Set((spec.open || []).filter((c) => c && c.actor && (c.walk || c.hide)).map((c) => c.actor));
    for (const [id, p] of Object.entries(props)) {
      const foot = cm.propFoot(p.kind);
      if (!foot || !p.at || p.hidden || (p.at[2] || 0) > 0.3 || foot[0] < 2) continue; // alleen voertuigen en grote voorwerpen op de grond
      for (const s of standers) if (!leavers.has(s.id) && rectHit(s.f, s.s, { f: p.at[0], s: p.at[1], len: foot[0], wid: foot[1], face: p.face || 0 })) E(`scène ${key}: ${s.id} staat aan het begin in ${id} (${p.kind}, ${foot[0]} x ${foot[1]} m)`);
    }
  }

  // --- 3. sets van de missies ---------------------------------------------------------------------------------------------
  const missieBestanden = fs.readdirSync(new URL('game/js/', ROOT)).filter((f) => /^(missions|akte\d+_plan|akte34_beats|storyarc)/.test(f));
  const stageSets = {};
  for (const f of missieBestanden) for (const m of read('game/js/' + f).matchAll(/\bset: '(\w+)'/g)) { stageSets[m[1]] = (stageSets[m[1]] || 0) + 1; if (!knownSets.has(m[1])) E(`${f}: stap met onbekende set ${m[1]}`); }

  // --- 4. aankleding (missiedecor.js) en wachtprops ------------------------------------------------------------------------
  const a12 = await import('../game/js/missions_akte12.js');
  await import('../game/js/missions_akte3.js'); await import('../game/js/akte34_beats.js'); await import('../game/js/missions_akte6.js');
  const plan2 = await import('../game/js/akte2_plan.js');
  a12.applyAkte12([]);
  md.registreerAankleding('trijntje', plan2.PLAN_TRIJNTJE);
  const dressKinds = {};
  for (const k of md.DRESSING_KINDS) {
    const plan = md.dressingPlan(k);
    for (const p of plan.props) {
      dressKinds[p.kind] = (dressKinds[p.kind] || 0) + 1;
      if (p.kind === 'banner') continue;
      let o = null;
      try { o = md.simpleProp(p.kind); } catch (e) { W(`aankleding ${k}: ${p.kind} niet te bouwen zonder canvas (${e.message})`); continue; }
      if (!o) E(`aankleding ${k}: onderdeel ${p.kind} heeft geen bouwer (wordt stil overgeslagen)`);
      else if (!models['aankleding:' + p.kind]) {
        const m = sp.measureModel(o);
        models['aankleding:' + p.kind] = { bron: 'aankleding', ...m, budget: { tris: 600, mats: [2, 6], maxDim: 3.6 } };
        if (m.nan) E(`aankleding ${p.kind}: NaN in geometrie`);
        if (m.tris > 600) E(`aankleding ${p.kind}: ${m.tris} driehoeken, budget 600`);
        if (m.mats < 2 || m.mats > 6) E(`aankleding ${p.kind}: ${m.mats} materialen, toegestaan 2 tot 6`);
        if (m.min.y < -0.05) E(`aankleding ${p.kind}: onder de grond (${m.min.y.toFixed(2)})`);
      }
    }
    for (const q of plan.people) if (![q.look && q.look.shirt, q.look && q.look.skin].every(Number.isFinite)) E(`aankleding ${k}: een figuur heeft geen kleuren`);
  }
  for (const m of [...wp.PROP_KINDS]) { try { const g = wp.buildProp(m); const r = sp.measureModel(g); models['wacht:' + m] = { bron: 'wachtstap', ...r, budget: { tris: 600, mats: [2, 6], maxDim: 3 } }; if (r.nan) E(`wachtprop ${m}: NaN`); if (r.tris > 600) E(`wachtprop ${m}: ${r.tris} driehoeken`); if (r.mats < 2 || r.mats > 6) E(`wachtprop ${m}: ${r.mats} materialen`); } catch (e) { E(`wachtprop ${m}: ${e.message}`); } }
  // bank, kist, baal en ton bestaan één keer (wachtprops.js); missiedecor.js hergebruikt ze
  for (const k of ['bank', 'kist', 'baal', 'ton']) {
    const a = sp.measureModel(md.simpleProp(k)), b = sp.measureModel(wp.buildProp(k));
    if (signature(a) !== signature(b)) E(`dubbel: ${k} wordt in missiedecor.js en wachtprops.js verschillend gebouwd (één bouwer)`);
  }
  // verwijzingen naar aankleding in de bronnen
  const dressRefs = new Set();
  for (const f of missieBestanden) {
    const src = read('game/js/' + f);
    for (const m of src.matchAll(/(?:eindDressing|dressing|dressingAt)\s*[:=]\s*'(\w+)'/g)) dressRefs.add(m[1]);
    if (f === 'missions_akte12.js') for (const m of src.matchAll(/zet\([^\n]*, '(\w+)'\);/g)) dressRefs.add(m[1]);
  }
  for (const r of dressRefs) if (!md.DRESSING_KINDS.includes(r)) E(`aankleding ${r}: waar naar verwezen wordt, maar er is geen plan`);
  // wachtstappen die zelf een prop kiezen
  for (const f of ['missions_akte3', 'missions_akte4', 'missions_akte45', 'missions_akte5', 'missions_akte6', 'akte2_plan', 'akte1_plan', 'akte34_beats']) {
    let mod; try { mod = await import(`../game/js/${f}.js`); } catch (e) { continue; }
    for (const [name, val] of Object.entries(mod)) if (/^WACHT/.test(name)) {
      const walkW = (o) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'prop' && typeof v === 'string' && !wp.PROP_KINDS.includes(v)) E(`${f}.${name}: wachtprop ${v} bestaat niet`); walkW(v); } };
      walkW(val);
    }
  }

  // --- 5. figuranten: NPC-tabel en spreker-sleutels van het script ------------------------------------------------------------
  const seeds = {};
  for (const [k, n] of Object.entries(NPC)) {
    if (!n.name || !Number.isFinite(n.shirt) || !Number.isFinite(n.skin) || !Number.isInteger(n.seed) || !['male', 'female'].includes(n.variant)) E(`NPC ${k}: onvolledig uiterlijk`);
    (seeds[n.seed] ||= []).push(k);
  }
  for (const [s, ks] of Object.entries(seeds)) if (ks.length > 1) W(`NPC ${ks.join(' en ')} delen seed ${s} (zelfde gezicht)`);
  const script = JSON.parse(read('game/storydata/script.json'));
  const sprekers = new Set();
  for (const sc of script.scenes) for (const l of sc.lines) if (l.key) sprekers.add(l.key);
  for (const k of sprekers) if (k !== 'T' && k !== 'A' && !NPC[k]) E(`script: spreker ${k} heeft geen figuur in de NPC-tabel`);

  // --- 6. voertuig-props van de wereld bouwen echt (snackwagen, tankwagen, limo) ----------------------------------------------
  try {
    const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
    for (const k of ['snackwagen', 'tankwagen', 'limo']) {
      const src = cm.PROP_SOURCES[k];
      if (!src || !src.model) { E(`voertuig ${k}: geen eigen model in PROP_SOURCES`); continue; }
      const g = buildVehicleMesh({ id: 'audit-' + k, model: { ...src.model }, health: 100 });
      const r = sp.measureModel(g);
      models[k] = { ...models[k], tris: r.tris, bbox: r.bbox, nan: r.nan };
      if (r.nan || r.tris < 50) E(`voertuig ${k}: wereldmodel is leeg of heeft NaN (${r.tris} driehoeken)`);
    }
  } catch (e) { W(`voertuigmodellen niet gebouwd in node: ${e.message}`); }

  const ongebruikt = [...cm.DECOR_KINDS, ...Object.keys(cm.PROP_SOURCES)].filter((k) => !gebruik[k]);
  info.push(`${nScenes} scènes, ${nProps} props, ${Object.keys(gebruik).length} soorten in gebruik; ${md.DRESSING_KINDS.length} aankledingsplannen; ${Object.keys(NPC).length} figuren in de NPC-tabel`);
  return { errors, warnings, info, models, gebruik, ongebruikt, setsGezien, stageSets, dressKinds, nScenes, nProps, dressingPlans: md.DRESSING_KINDS.length, npcs: Object.keys(NPC).length };
}

export function renderMarkdown(r) {
  const rows = (filter) => Object.entries(r.models).filter(([k, m]) => filter(k, m)).sort(([a], [b]) => a.localeCompare(b));
  const fmt = (v) => (v === undefined ? '' : v);
  const line = ([k, m]) => `| ${k} | ${m.bron} | ${fmt(m.tris)} | ${m.budget ? m.budget.tris : ''} | ${fmt(m.mats)} | ${m.bbox ? `${m.bbox.x} x ${m.bbox.y} x ${m.bbox.z}` : (m.foot ? m.foot.join(' x ') : '')} | ${r.gebruik[k] || (k.startsWith('aankleding:') ? r.dressKinds[k.slice(11)] || 0 : 0)} |`;
  const head = '| Soort | Bron | Driehoeken | Budget | Materialen | Afmeting (m) | Gebruik |\n|---|---|---|---|---|---|---|';
  const out = [];
  out.push('# Props, sets en figuranten van het verhaal (stand 22-11)');
  out.push('');
  out.push('Gegenereerd door `node scripts/verhaal_props_audit.mjs --write` (#1121). De audit haalt uit alle scène- en missiedata (cutscene-specs, aankleding, wachtstappen, sets, cast) de gebruikte soorten en controleert dat elk bestaat in de modelbouwers, binnen zijn polygoonbudget valt (2 tot 6 materialen, geen NaN, op de grond, niet dubbel), dat de verwijzingen kloppen en dat geen figuur aan het begin in een voertuig of groot voorwerp staat. Alle modellen zijn procedureel laag-poly (`game/js/storyprops.js`); voertuigen en dieren komen uit de wereld. Niets is in beeld gezien: dat blijft "nog niet bekeken" tot de Electron-sweep van de coördinator.');
  out.push('');
  out.push(`Telling: ${r.nScenes} scènes, ${r.nProps} props, ${Object.keys(r.gebruik).length} soorten in gebruik, ${r.dressingPlans} aankledingsplannen, ${r.npcs} figuren in de NPC-tabel. Fouten: ${r.errors.length}, waarschuwingen: ${r.warnings.length}.`);
  out.push('');
  out.push('## Decor (storyprops.js)');
  out.push('');
  out.push(head);
  for (const e of rows((k, m) => m.bron === 'decor')) out.push(line(e));
  out.push('');
  out.push('## Voertuigen en dieren uit de wereld');
  out.push('');
  out.push(head);
  for (const e of rows((k, m) => /wereld/.test(m.bron))) out.push(line(e));
  out.push('');
  out.push('## Aankleding van missies (missiedecor.js) en wachtstappen (wachtprops.js)');
  out.push('');
  out.push(head);
  for (const e of rows((k, m) => m.bron === 'aankleding' || m.bron === 'wachtstap')) out.push(line(e));
  out.push('');
  out.push('## Sets');
  out.push('');
  out.push(`Cutscene-sets in gebruik: ${Object.entries(r.setsGezien).map(([k, n]) => `${k} (${n})`).join(', ')}. Stap-sets in de missies: ${Object.entries(r.stageSets).map(([k, n]) => `${k} (${n})`).join(', ')}. Elke naam staat in \`STAGE_SETS\` of is de keuken van de opening.`);
  out.push('');
  out.push('## Gefixt in deze ronde');
  out.push('');
  out.push('- 17 nieuwe decormodellen (klomp, stempel, pinpas, map, bierviltje, fotolijst, statief, krat, pan, vuurwerk, koelbox, jas, aktetas, hesjes, container, scherm, prikbord); eerder stonden die als doos, bord, klembord of tas in beeld.');
  out.push('- 3 echte wereldmodellen als scène-prop: de snackwagen (M30), de vettankwagen (M07) en de trekker-limo (M10, M14, M15, M26); eerder een bestelbus of gewone trekker.');
  out.push('- De bal is een voetbal (twee materialen) in plaats van een gele bol; matras, koffer, klembord, bord, radio en duiventil kregen een detail of een materiaal erbij.');
  out.push('- Beppe heeft een figuur in de NPC-tabel (`missionstory.js`); de scène met haar kon eerder niet worden bezet.');
  out.push('- Bank, kist, baal en ton bestonden twee keer (aankleding en wachtstap); nu één bouwer (`wachtprops.js`).');
  out.push('- `PROP_MAKERS` is uit `cutscenehost.js` verhuisd naar `storyprops.js` (met budget en meting); de draaghoogte (`CARRY_LOW`) staat nu op één plek.');
  out.push('');
  out.push('## Open');
  out.push('');
  out.push('- `paal` (M02), `lijstje`, `zak`, `bakje`, `vergunning` en `bord` als bordje blijven bestaande vormen (bord, klembord, tas, doos): herkenbaar genoeg, geen eigen model nodig.');
  out.push('- De aankleding-trekker (`tractor` in missiedecor.js) is een blokkenmodel van 6 delen; het silhouet klopt maar de wereldtrekker is mooier.');
  out.push('- Het prikbord (N8, de vijf vrienden) bestaat nu als model, maar er is nog geen scène-spec die hem neerzet (N8 is een gesprek zonder cutscene-spec).');
  out.push('- Niets hiervan is in beeld gezien (geen Electron in deze ronde): vorm, schaal en kleur zijn alleen gemeten, niet gekeken.');
  out.push('');
  if (r.ongebruikt.length) { out.push(`Soorten zonder scène-gebruik (model bestaat, geen spec zet ze neer): ${r.ongebruikt.join(', ')}.`); out.push(''); }
  return out.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const A = await auditSources();
  if (!A) { console.log('SKIP verhaal_props_audit: three is niet gevendord (draai eerst: cd desktop && npm run stage)'); process.exit(0); }
  const r = await runAudit(A);
  for (const m of r.info) console.log('info:', m);
  for (const m of r.warnings) console.log('waarschuwing:', m);
  for (const m of r.errors) console.log('FOUT:', m);
  if (process.argv.includes('--write')) { fs.writeFileSync(fileURLToPath(new URL('docs/PROPS-STAND-22-11.md', ROOT)), renderMarkdown(r) + '\n'); console.log('docs/PROPS-STAND-22-11.md geschreven'); }
  console.log(`verhaal_props_audit: ${r.errors.length} fouten, ${r.warnings.length} waarschuwingen`);
  process.exit(r.errors.length ? 1 : 0);
}
