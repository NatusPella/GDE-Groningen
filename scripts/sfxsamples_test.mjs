// De sample-laag (#460): de CC0-opnames in game/audio/sfx. Pure logica, zonder Web Audio.
//   node scripts/sfxsamples_test.mjs
// Controleert: manifest en bestanden kloppen, elke sleutel in de code staat in het manifest, de terugval als iets
// ontbreekt of niet laadt, de afkoeling, de grenzen van de variatie, de deurvolgorde en dat de build alles meeneemt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SAMPLE_KEYS, SAMPLE_INFO, SAMPLE_BASE, VARIATIE, variatie, afkoelingOk, heeftAutoPortier, autoDeurPlan, createSamples,
  slipLoopNiveau, slipLoopRate, grindNodig, eagerKeys, FX_VERVANG, FX_OPNAME_ALLEEN, vervangSleutel,
} from '../game/js/sfx/samples.js';
import { CATEGORIES } from '../game/js/sfx/mixplan.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SFX = path.join(ROOT, 'game', 'audio', 'sfx');
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

// -- manifest en bestanden ------------------------------------------------------------------
const man = JSON.parse(fs.readFileSync(path.join(SFX, 'manifest.json'), 'utf8'));
const g = man.geluiden || {};
for (const k of SAMPLE_KEYS) {
  ok(g[k], `${k} staat in het manifest`);
  if (!g[k]) continue;
  const f = path.join(SFX, g[k].bestand || '');
  ok(fs.existsSync(f), `${k}: bestand ${g[k].bestand} bestaat`);
  if (fs.existsSync(f)) ok(fs.readFileSync(f).subarray(0, 4).toString() === 'OggS', `${k} is een ogg-bestand`);
  ok(g[k].herkomst && g[k].herkomst.url && /CC0|Creative Commons (0|Attribution)/.test(g[k].herkomst.licentie), `${k}: bron en CC0- of CC-BY-licentie in het manifest (ADR 0039)`);
  ok(g[k].duur_s > 0.1 && (g[k].loop ? g[k].duur_s <= 32 : g[k].duur_s < (k.startsWith('donder_') ? 14 : 6)), `${k}: duur ${g[k].duur_s} s is kort genoeg`);   // een lus hooguit 32 s (weer en zomer), een eenmalige klank hooguit 6 s, een donderslag hooguit 14 s
}
for (const k of Object.keys(g)) ok(SAMPLE_KEYS.includes(k), `manifest-sleutel ${k} heeft een regel in SAMPLE_INFO`);
ok(!g.trein_deur && !fs.existsSync(path.join(SFX, 'trein_deur.ogg')), 'de oude hele treindeur-opname is weg');
for (const f of fs.readdirSync(SFX).filter((x) => x.endsWith('.ogg'))) ok(g[f.replace(/\.ogg$/, '')], `${f} heeft een manifestregel`);
ok(g.band_piep_bocht.loop === true && g.band_piep_bocht.duur_s <= 1.5, 'band_piep_bocht is een korte loop (hooguit 1,5 s)');
ok(g.handrem_bocht.duur_s <= 2.1, 'handrem_bocht is kort (hooguit 2 s)');
for (const k of SAMPLE_KEYS) ok(CATEGORIES[SAMPLE_INFO[k].cat], `${k}: categorie ${SAMPLE_INFO[k].cat} bestaat in mixplan.js`);

// -- sleutels in de code komen voor in het manifest -----------------------------------------
const JS = path.join(ROOT, 'game', 'js');
const used = new Set();
const re = /['"`](auto_(?:deur|portiergreep)[a-z_0-9]*|band_piep_bocht|handrem_bocht|remmen_grind|trein_deur[a-z_0-9]*|heli_rotor[a-z_]*|vliegtuig_[a-z_]+|boot_motor[a-z_]*|regen_[a-z]+|wind_gras|zomer_[a-z]+|donder_[a-z_0-9]+|band_drift|motor_(?:auto|diesel)_stationair|ui_klik|tram_bel_op_[0-9]|bus_halte_ding|bus_deur_sis|kermis_lawaai|kassa_koop|winkelbel_deur|deur_(?:hout|huis)_[a-z_]+_op|plons_groot|scheepshoorn_op|camera_sluiter|alarm_loeit|vuurwerk_knal_[0-9]|trein_remmen_piep|trein_hoorn_[a-z]+|dier_[a-z_0-9]+|golfjes_oever|menigte_gemurmel|kikkers_nacht|stad_nacht_nl|ruimte_binnen)['"`]/g;
for (const f of fs.readdirSync(JS, { recursive: true }).filter((x) => x.endsWith('.js'))) {
  const t = fs.readFileSync(path.join(JS, f), 'utf8');
  for (const m of t.matchAll(re)) used.add(m[1]);
}
// ronde 4: de sleutels die FX_VERVANG en FX_OPNAME_ALLEEN koppelen tellen als gebruikt (de haken zelf bewaakt sfx_haken_test.mjs)
for (const l of [...Object.values(FX_VERVANG), ...Object.values(FX_OPNAME_ALLEEN)]) for (const k of l) used.add(k);
for (const k of used) ok(g[k], `sleutel ${k} uit de code staat in het manifest`);
// de voetstappen (stap_<ondergrond>_<n>) worden in sfx/steps.js samengesteld; stappen_test.mjs bewaakt ze
for (const k of SAMPLE_KEYS) ok(k.startsWith('stap_') || used.has(k), `${k} wordt in de code gebruikt`);
const audioSrc = fs.readFileSync(path.join(JS, 'audio.js'), 'utf8'), samplesSrc = fs.readFileSync(path.join(JS, 'sfx', 'samples.js'), 'utf8');
ok(!/https?:\/\//.test(samplesSrc.replace(/\/\/.*$/gm, '')), 'samples.js heeft geen externe URL');
ok(SAMPLE_BASE.startsWith('./audio/'), 'zelfde relatieve pad als de rest (./audio/...)');
ok(/case 'sample':/.test(audioSrc) && /e\.auto && playAutoDeur/.test(audioSrc), 'audio.js kent het sample-event en het portier van auto\'s');
ok(/synth|playDoor\(x, y, true\)/.test(audioSrc), 'audio.js houdt de synth als terugval');

// -- de build neemt game/audio/sfx mee ------------------------------------------------------
const build = fs.readFileSync(path.join(ROOT, 'desktop', 'build.mjs'), 'utf8');
ok(/fs\.cpSync\(SRC, OUT, \{ recursive: true/.test(build), 'desktop/build.mjs kopieert game/ in zijn geheel');
ok(!/audio[\\/]+sfx|\.ogg/.test(build.replace(/\/\/.*$/gm, '')), 'de build sluit geen sfx of ogg uit');

// -- variatie: toonhoogte hooguit 4%, volume hooguit 1,5 dB ------------------------------------
ok(VARIATIE.rate === 0.04 && VARIATIE.db === 1.5, 'variatie-instelling: 4% en 1,5 dB');
for (const r of [0, 0.25, 0.5, 0.999999, 1]) {
  const v = variatie(() => r);
  ok(v.rate >= 0.96 - 1e-9 && v.rate <= 1.04 + 1e-9, `toonhoogte binnen 4% (rand ${r}): ${v.rate}`);
  const db = 20 * Math.log10(v.gain);
  ok(Math.abs(db) <= 1.5 + 1e-9, `volume binnen 1,5 dB (rand ${r}): ${db.toFixed(2)}`);
}
let lo = 9, hi = 0;
for (let i = 0; i < 400; i++) { const v = variatie(); lo = Math.min(lo, v.rate); hi = Math.max(hi, v.rate); }
ok(hi - lo > 0.04, 'de variatie is er echt (spreiding in 400 keer)');

// -- afkoeling ------------------------------------------------------------------------------
{
  const last = new Map();
  ok(afkoelingOk(last, 'handrem_bocht', 10), 'eerste keer mag');
  ok(!afkoelingOk(last, 'handrem_bocht', 12), 'twee seconden later nog niet (gap 6 s)');
  ok(afkoelingOk(last, 'handrem_bocht', 16.5), 'na de afkoeling weer');
  ok(afkoelingOk(last, 'auto_deur_open', 16.5) && afkoelingOk(last, 'auto_deur_dicht_1', 16.5), 'andere sleutels hebben een eigen afkoeling');
  ok(afkoelingOk(last, 'band_piep_bocht', 1) && afkoelingOk(last, 'band_piep_bocht', 1), 'de loop heeft geen afkoeling (gap 0)');
  ok(SAMPLE_INFO.trein_deur_open.gap >= 3 && SAMPLE_INFO.trein_deur_piep.gap >= 3, 'treindeuren niet te vaak');
}

// -- voertuigen met een portier --------------------------------------------------------------
{
  const v = (o, name = 'sedan') => ({ model: { name }, ...o });
  ok(heeftAutoPortier(v({})) && heeftAutoPortier(v({ isTaxi: true }, 'taxi')) && heeftAutoPortier(v({}, 'van')), 'auto, taxi en bestelwagen hebben een portier');
  ok(!heeftAutoPortier(v({ isBike: true }, 'bike')) && !heeftAutoPortier(v({ isScooter: true }, 'scooter')), 'fiets en step niet');
  ok(!heeftAutoPortier(v({}, 'quad')) && !heeftAutoPortier(v({}, 'tractor')) && !heeftAutoPortier(v({ isBoat: true }, 'boat')), 'quad, tractor en boot niet');
  ok(!heeftAutoPortier(v({ isBus: true }, 'bus')) && !heeftAutoPortier(null), 'bus en niets niet');
}

// -- de volgorde van het portier: greep, open, dicht ----------------------------------------------
{
  const p = autoDeurPlan(() => 0.1), q = autoDeurPlan(() => 0.9);
  ok(p.map((s) => s.key).join() === 'auto_portiergreep,auto_deur_open,auto_deur_dicht_1', 'greep, open, dicht 1', p.map((s) => s.key).join());
  ok(q[2].key === 'auto_deur_dicht_2', 'het andere dichtgeluid bij een andere worp');
  ok(p[0].delay < p[1].delay && p[1].delay < p[2].delay && p[2].delay - p[1].delay > 0.5, 'de greep komt vlak voor de deur, het dicht pas na het stappen');
}

// -- slip, handrem en grind -------------------------------------------------------------------------
ok(slipLoopNiveau(0.2) === 0 && slipLoopNiveau(0.9) === 1 && slipLoopNiveau(0.6) > 0 && slipLoopNiveau(0.6) < 1, 'het niveau van de piepende loop volgt de slip');
ok(slipLoopRate(0) < slipLoopRate(1) && slipLoopRate(1) < 1.25 && slipLoopRate(0) > 0.8, 'de toonhoogte van de loop volgt de slip, binnen redelijke grenzen');
ok(grindNodig({ surface: 'gras', speed: 12, _fxDec: 14 }) && !grindNodig({ surface: 'asfalt', speed: 12, _fxDec: 14 }) && !grindNodig({ surface: 'gras', speed: 12, _fxDec: 2 }) && !grindNodig({ surface: 'gras', speed: 2, _fxDec: 14 }), 'remmen_grind alleen bij hard remmen op gras');

// -- de lader en de terugval ----------------------------------------------------------------------
const fakeCtx = (opts = {}) => ({ decodeAudioData: async (ab) => { if (opts.stuk) throw new Error('kapot'); return { duration: 1, bytes: ab.byteLength }; } });
const fakeFetch = (files) => async (url) => {
  const naam = url.replace(SAMPLE_BASE, '');
  if (!(naam in files)) return { ok: false, status: 404 };
  const f = files[naam];
  return { ok: true, json: async () => JSON.parse(f), arrayBuffer: async () => new Uint8Array(8).buffer };
};
{
  const files = { 'manifest.json': JSON.stringify(man) };
  for (const k of SAMPLE_KEYS) files[g[k].bestand] = 'x';
  const s = createSamples(fakeCtx(), { fetchFn: fakeFetch(files) });
  ok(s.buffer('auto_deur_open') === null, 'voor het laden: geen buffer (de synth speelt)');
  await s.laadAlles();
  ok(SAMPLE_KEYS.every((k) => s.has(k)) && s.stats.mislukt === 0, 'alles geladen', JSON.stringify(s.stats));
  ok(s.isLoop('band_piep_bocht') && !s.isLoop('auto_deur_open'), 'loop-vlag uit het manifest');
  ok(s.start() === s.start(), 'start is idempotent');
}
// lui laden (#804): alleen de korte, vaak gebruikte klanken bij de start; de lussen en de rest bij de eerste vraag
{
  const files = { 'manifest.json': JSON.stringify(man) };
  for (const k of SAMPLE_KEYS) files[g[k].bestand] = 'x';
  const s = createSamples(fakeCtx(), { fetchFn: fakeFetch(files), gapMs: 0 });
  await s.start();
  const eager = eagerKeys();
  ok(eager.length > 50 && eager.length < SAMPLE_KEYS.length / 2 + 20, `bij de start alleen de eager-klanken (${eager.length} van ${SAMPLE_KEYS.length})`);
  ok(eager.every((k) => s.has(k)) && s.stats.geladen === eager.length, 'de eager-klanken zijn na start() geladen', JSON.stringify(s.stats));
  ok(!s.has('regen_bui') && s.buffer('regen_bui') === null, 'een lus van het weer is na start() nog niet gedecodeerd (de synth speelt)');
  ok(g.regen_bui.loop && !eager.includes('regen_bui') && !eager.includes('zomer_insecten'), 'lussen zijn nooit eager');
  await new Promise((r) => setTimeout(r, 30));
  ok(s.has('regen_bui') && s.buffer('regen_bui') !== null, 'na de eerste vraag laadt de klank op de achtergrond');
  const n = s.stats.geladen; s.has('regen_bui'); s.buffer('regen_bui'); await s.laadAlles();
  ok(s.stats.geladen === SAMPLE_KEYS.length && n < SAMPLE_KEYS.length, 'laadAlles haalt de rest, en niets wordt twee keer geladen', JSON.stringify(s.stats));
  ok(s.buffer('onbekend_geluid') === null && s.stats.geladen === SAMPLE_KEYS.length, 'een onbekende sleutel laadt niets');
}
{
  const s = createSamples(fakeCtx(), { fetchFn: fakeFetch({}) });
  await s.start();
  ok(SAMPLE_KEYS.every((k) => s.buffer(k) === null), 'zonder manifest: overal null, geen fout');
}
{
  const files = { 'manifest.json': JSON.stringify(man) };
  for (const k of SAMPLE_KEYS) if (k !== 'remmen_grind') files[g[k].bestand] = 'x';
  const s = createSamples(fakeCtx(), { fetchFn: fakeFetch(files) });
  await s.laadAlles();
  ok(s.buffer('remmen_grind') === null && s.buffer('auto_deur_open') !== null && s.stats.mislukt === 1, 'een ontbrekend bestand: alleen die sleutel valt terug');
}
{
  const files = { 'manifest.json': JSON.stringify(man) };
  for (const k of SAMPLE_KEYS) files[g[k].bestand] = 'x';
  const s = createSamples(fakeCtx({ stuk: true }), { fetchFn: fakeFetch(files) });
  await s.laadAlles();
  ok(SAMPLE_KEYS.every((k) => s.buffer(k) === null) && s.stats.mislukt === SAMPLE_KEYS.length, 'een bestand dat niet decodeert: terugval, geen fout');
}
{
  const s = createSamples(fakeCtx(), { fetchFn: async () => { throw new Error('geen netwerk'); } });
  await s.start();
  ok(s.buffer('trein_deur_open') === null, 'een fetch die faalt: terugval, geen fout');
  const z = createSamples(null, { fetchFn: null });
  await z.start();
  ok(z.buffer('auto_deur_open') === null, 'zonder ctx en zonder fetch: geen fout');
}

// -- opnames in de plaats van synth (FX_VERVANG, SFX ronde 3) -------------------------------------
{
  const { FX_INFO } = await import('../game/js/sfx/fxbank.js');
  for (const [naam, sleutels] of Object.entries(FX_VERVANG)) {
    ok(FX_INFO[naam] || FX_INFO[`${naam}_0`] || naam === 'train_horn', `FX_VERVANG: ${naam} is een effect van fxbank.js`);
    for (const k of sleutels) ok(SAMPLE_INFO[k] && g[k], `FX_VERVANG: ${naam} -> ${k} staat in SAMPLE_INFO en in het manifest`);
  }
  // lussen van deze ronde: naadloos gemeten (sprong over de naad klein, geen niveaustap) en een piek onder -1 dB
  const { GELUIDEN: RONDE3 } = await import('./audio/master_sfx_ronde3.mjs');
  for (const k of Object.keys(RONDE3)) {
    const m = g[k];
    if (!m || !m.naad || !m.niveau) continue;
    ok(m.naad.sprong_ratio < 1 && Math.abs(m.naad.niveaustap_db) < 2, `${k}: naad gemeten (sprong x${m.naad.sprong_ratio}, stap ${m.naad.niveaustap_db} dB)`);
    ok(m.niveau.piek_db <= -1, `${k}: piek ${m.niveau.piek_db} dB onder -1`);
  }
  // ronde 4: opname-only effecten (geen synth in fxbank.js) en de manifest-eigenschappen van de nieuwe opnames
  const { GELUIDEN: RONDE4 } = await import('./audio/master_sfx_ronde4.mjs');
  for (const [naam, sleutels] of Object.entries(FX_OPNAME_ALLEEN)) {
    ok(!FX_INFO[naam] && !FX_VERVANG[naam], `FX_OPNAME_ALLEEN: ${naam} heeft geen synth (anders hoort hij in FX_VERVANG)`);
    for (const k of sleutels) ok(SAMPLE_INFO[k] && g[k], `FX_OPNAME_ALLEEN: ${naam} -> ${k} staat in SAMPLE_INFO en in het manifest`);
  }
  let kb4 = 0;
  for (const k of Object.keys(RONDE4)) {
    const m = g[k];
    ok(m && SAMPLE_INFO[k], `ronde 4: ${k} staat in manifest en SAMPLE_INFO`);
    if (!m) continue;
    kb4 += m.grootte_kb;
    ok(m.herkomst && /^Creative Commons (0|Attribution (3|4).0)/.test(m.herkomst.licentie), `ronde 4: ${k} heeft een toegestane licentie`);
    ok(m.duur_s > 0.05 && m.duur_s < 4, `ronde 4: ${k} is kort (${m.duur_s} s)`);
    ok(m.niveau.piek_db <= -1, `ronde 4: ${k} piek ${m.niveau.piek_db} dB onder -1`);
    ok(!m.loop, `ronde 4: ${k} is geen lus`);
  }
  ok(kb4 < 1500, `ronde 4: samen ${Math.round(kb4)} kB, onder de 1,5 MB`);
  ok(vervangSleutel('ei_breuk', (k) => k === 'ei_breuk_1', () => 0) === 'ei_breuk_1', 'een opname-only effect vindt zijn sleutel');
  ok(vervangSleutel('kratten_klets', () => false) === null, 'opname-only zonder geladen opname: null (stil)');
  ok(vervangSleutel('winkel_kassa_1', () => true) === 'kassa_koop', 'een variant (_1) vindt de vervanging van de basisnaam');
  ok(vervangSleutel('winkel_kassa_0', () => false) === null, 'niet geladen: null (de synth blijft)');
  ok(vervangSleutel('bestaat_niet', () => true) === null, 'onbekende naam: null');
  ok(vervangSleutel('firework_burst_2', (k) => k === 'vuurwerk_knal_1', () => 0) === 'vuurwerk_knal_1', 'alleen een geladen sleutel wordt gekozen');
  ok(vervangSleutel('splash_big', null) === null, 'zonder has-functie: null');
}

console.log(fails ? `sfxsamples_test: ${fails} fouten van ${n}` : `sfxsamples_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
