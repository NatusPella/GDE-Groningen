// #1169: moeilijkheid per save: het profiel (niveau + opties eronder), de koppelingen met de gameplay, de veilige grenzen,
// de migratie van een oude save en de spiegel in de instellingen. De regressie die telt: op Standaard is elke optie exact het
// gedrag van vóór dit systeem. De kaart en de navigatie testen in difficultycard_test.mjs.
//   node scripts/difficulty_profile_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Tests schrijven nooit naar echte opslag: een geheugenopslag vóór alle imports.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const D = await import('../game/js/difficulty.js');
const S = await import('../game/js/settings.js');
const W = await import('../game/js/wantedlevels.js');
const Q = await import('../game/js/qte.js');

let n = 0, fails = 0;
const ok = (c, name, info) => { n++; if (!c) { fails++; console.log('FAIL', name, info !== undefined ? JSON.stringify(info) : ''); } };

// --- 1. Standaard is exact het huidige gedrag -------------------------------------------------------------------------------
D.setActiveDifficulty({ level: 'standaard' });
const base = D.getDifficulty();
ok(base.level === 'standaard' && !base.aangepast && Object.keys(base.custom).length === 0, 'het begin is Standaard zonder aanpassingen');
const NEUTRAAL = { policeEscape: 1, policeUnits: 1, trafficDensity: 1, vehicleDamage: 1, damageTaken: 1, driveAssist: 'eigen', raceAi: 1, qte: 'eigen', timeFactor: 1, targetFactor: 1, footballAi: 'volg', footballDuration: 'eigen', income: 1, hints: 'eigen', storyMode: 'uit' };
ok(JSON.stringify(base.options) === JSON.stringify(NEUTRAAL), 'op Standaard is elke optie neutraal (factor 1, eigen instelling, verhaalmodus uit)', base.options);
ok(D.OPTION_KEYS.length === Object.keys(NEUTRAAL).length && D.OPTION_KEYS.every((k) => k in NEUTRAAL), 'de lijst opties en de neutrale tabel zijn dezelfde');
// de koppelingen laten Standaard ongemoeid
ok(D.scaleIncome(1200) === 1200 && D.scaleIncome(0) === 0 && D.scaleIncome(37) === 37, 'scaleIncome: een beloning blijft gelijk op Standaard');
ok(D.qteChoice('makkelijk') === 'makkelijk' && D.qteChoice('normaal') === 'normaal' && D.qteChoice('overslaan') === 'overslaan', 'qteChoice: de eigen instelling blijft staan op Standaard');
ok(D.toggleChoice('hints', true) === true && D.toggleChoice('hints', false) === false && D.toggleChoice('driveAssist', true) === true, 'toggleChoice: de eigen instelling blijft staan');
ok(D.footballLevel() === 'standaard' && D.footballDuration('kort') === 'kort' && D.footballDuration('normaal') === 'normaal', 'voetbal: niveau en duur blijven zoals ze waren');
ok([1, 2, 3, 4, 7].every((b) => D.scaleUnits(b) === b) && D.scaleUnits(0) === 0, 'scaleUnits laat de politiemacht staan');
ok(D.trafficFactor() === 1 && D.vehicleDamageFactor() === 1 && D.damageTakenFactor() === 1 && D.raceSkillFactor() === 1 && !D.storyModeOn(), 'alle factoren zijn 1');
ok(['ontspannen', 'standaard', 'uitdagend'].every((m) => { const f = D.difficultyFactors(m); return f.time === D.DIFFICULTY[m].time && f.target === D.DIFFICULTY[m].target; }), 'difficultyFactors geeft op elk niveau de oude tabel');
// de politie: dezelfde getallen als vóór de koppeling
ok([1, 2, 3, 4, 5].map((s) => W.policeTarget(s)).join() === '1,2,3,4,7', 'policeTarget is de oude tabel');
ok([1, 2, 3, 4, 5].map((s) => W.policeDensity(s).target).join() === '1,2,3,4,7' && [1, 2, 3, 4, 5].map((s) => W.policeDensity(s, { country: true }).target).join() === '1,1,2,2,3', 'policeDensity stad en Ommeland zijn de oude tabellen');
ok([1, 2, 3, 4, 5].map((s) => W.loseAfterOf(W.levelOf(s))).join() === '4,4.5,5,6,7' && [1, 2, 3, 4, 5].map((s) => W.cooldownOf(W.levelOf(s))).join() === '10,12,14,17,20', 'zichttijd en afkoeltijd zijn de oude tabel');
// de zoekcirkel: stepUnseen met de echte regels, vergeleken met de bekende duur (4 s uit het zicht + 10 s afkoelen op één ster)
{
  const pol = { unseenFor: 0, searching: false, lastSeen: { x: 0, y: 0 }, searchRadius: 0, searchCenter: null };
  const w = { wanted: 1, wantedDecayTimer: 0 };
  let t = 0, gone = false;
  while (!gone && t < 120) { gone = W.stepUnseen(pol, w, 0.5, 0, 0); t += 0.5; }
  ok(gone && t === 13.5, 'op Standaard is één ster na 4 + 10 s weg (zoals vroeger)', t);
  globalThis.__tStd = t;
}
ok(Q.qteStandVan({ qteStand: 'makkelijk' }) === 'makkelijk' && Q.qteStandVan({ qteStand: 'normaal' }) === 'normaal' && Q.qteStandVan(null) === 'normaal', 'qteStandVan: Standaard volgt de eigen instelling');

// --- 2. de niveaus en hun voorinstellingen ---------------------------------------------------------------------------------
for (const level of D.DIFFICULTY_MODES) {
  const o = D.resolveOptions({ level });
  ok(D.OPTION_DEFS.every((d) => d.stappen.some((s) => s.v === o[d.key])), `${level}: elke voorinstelling is een geldige stap`);
  ok(D.OPTION_DEFS.every((d) => d.presets.length === 3), `${level}: elke optie heeft drie voorinstellingen`);
}
{
  const o = D.resolveOptions({ level: 'ontspannen' }), u = D.resolveOptions({ level: 'uitdagend' });
  ok(o.timeFactor === D.DIFFICULTY.ontspannen.time && u.timeFactor === D.DIFFICULTY.uitdagend.time, 'tijd per niveau is de bestaande tabel');
  ok(o.targetFactor === D.DIFFICULTY.ontspannen.target && u.targetFactor === D.DIFFICULTY.uitdagend.target, 'medailles per niveau zijn de bestaande tabel');
  ok(o.policeEscape < 1 && u.policeEscape > 1 && o.policeUnits < 1 && u.policeUnits > 1 && o.trafficDensity < 1 && u.trafficDensity > 1, 'ontspannen is rustiger en uitdagend scherper (politie en verkeer)');
  ok(o.vehicleDamage < 1 && u.vehicleDamage > 1 && o.damageTaken < 1 && u.damageTaken > 1, 'schade volgt het niveau');
  ok(o.income > 1 && u.income < 1, 'inkomen: ontspannen iets meer, uitdagend iets minder');
  ok(o.storyMode === 'uit' && u.storyMode === 'uit', 'Verhaalmodus is nooit een voorinstelling');
}

// --- 3. veilige grenzen ----------------------------------------------------------------------------------------------------
const GRENS = { policeEscape: [0.5, 1.6], policeUnits: [0.5, 1.5], trafficDensity: [0.4, 1.5], vehicleDamage: [0.25, 1.5], damageTaken: [0.25, 1.5], raceAi: [0.85, 1.12], timeFactor: [0.7, 2], targetFactor: [0.7, 1.4], income: D.INCOME_RANGE };
for (const [key, [lo, hi]] of Object.entries(GRENS)) {
  const d = D.optionDef(key);
  ok(d.stappen.every((s) => typeof s.v === 'number' && s.v >= lo && s.v <= hi), `${key}: elke stap ligt binnen ${lo} en ${hi}`, d.stappen.map((s) => s.v));
  ok(d.stappen.some((s) => s.v === 1), `${key}: de neutrale stap bestaat`);
}
ok(D.optionDef('income').stappen.every((s) => s.v >= 0.75 && s.v <= 1.25), 'het inkomen blijft binnen een kwart (balans, Bezit-balans)');
ok(!D.OPTION_DEFS.some((d) => /price|prijs/i.test(d.key)), 'er is geen prijsoptie: inkomen en prijs samen zouden de balans buigen');
ok(D.OPTION_DEFS.every((d) => d.stappen.length >= 2 && d.label && d.uitleg && ['wereld', 'lokaal'].includes(d.scope) && D.OPTION_GROUPS.some(([g]) => g === d.groep)), 'elke optie heeft stappen, tekst, scope en een groep');
{
  // garbage in: een kapotte waarde valt terug op het niveau
  const p = D.cleanProfile({ level: 'onzin', custom: { policeEscape: 99, trafficDensity: 'veel', onbekend: 1, income: 2, raceAi: NaN, qte: null } });
  ok(p.level === 'standaard' && Object.keys(p.custom).length === 0, 'een kapot profiel wordt Standaard zonder aanpassingen', p);
  ok(JSON.stringify(D.cleanProfile(null)) === JSON.stringify({ level: 'standaard', custom: {} }) && JSON.stringify(D.cleanProfile('x')) === JSON.stringify({ level: 'standaard', custom: {} }), 'null en tekst worden Standaard');
  const q = D.cleanProfile({ level: 'uitdagend', custom: { policeEscape: 1.25, trafficDensity: 0.75 } });
  ok(!('policeEscape' in q.custom) && q.custom.trafficDensity === 0.75, 'een waarde gelijk aan het niveau telt niet als aangepast');
  ok(Object.values(D.resolveOptions({ level: 'uitdagend', custom: { raceAi: 1.1, income: 1.25, timeFactor: 1.7 } })).every((v) => v !== undefined), 'elke optie heeft altijd een waarde');
  const inc = D.resolveOptions({ level: 'standaard', custom: { income: 1.25 } });
  ok(inc.income === 1.25, 'de grootste geldige stap kan');
}
ok(D.scaleUnits(1) >= 1 && (D.setActiveOption('policeUnits', 0.5), D.scaleUnits(1) === 1 && D.scaleUnits(2) === 1 && D.scaleUnits(7) === 4), 'een halve politiemacht laat nooit een lege jacht achter');
D.setActiveDifficulty({ level: 'standaard' });

// --- 4. de actieve stand ---------------------------------------------------------------------------------------------------
{
  const seen = [];
  const off = D.onDifficultyChange((d, prev) => seen.push([d.level, prev, d.aangepast]));
  D.setActiveLevel('uitdagend');
  ok(D.getDifficulty().level === 'uitdagend' && D.opt('policeEscape') === 1.25 && D.opt('qte') === 'normaal', 'een niveau kiezen zet zijn voorinstellingen');
  D.setActiveLevel('uitdagend');
  ok(seen.length === 1, 'hetzelfde niveau kiezen meldt niets');
  ok(D.setActiveOption('trafficDensity', 0.75) && D.getDifficulty().aangepast && D.opt('trafficDensity') === 0.75, 'een optie kan afwijken van het niveau (Aangepast)');
  ok(!D.setActiveOption('trafficDensity', 7) && D.opt('trafficDensity') === 0.75, 'een ongeldige waarde wordt geweigerd');
  ok(D.setActiveOption('trafficDensity', 1.25) && !D.getDifficulty().aangepast, 'de waarde van het niveau zelf haalt de aanpassing weg');
  D.setActiveOption('income', 1.25);
  D.setActiveLevel('ontspannen');
  ok(!D.getDifficulty().aangepast && D.opt('income') === 1.15, 'een ander niveau wist de eigen aanpassingen');
  D.setActiveOption('income', 1);
  D.resetActiveOptions();
  ok(!D.getDifficulty().aangepast, 'resetActiveOptions zet terug naar het niveau');
  ok(seen.length >= 4 && seen[0][0] === 'uitdagend' && seen[0][1] === 'standaard', 'luisteraars krijgen het nieuwe en het vorige niveau', seen[0]);
  off();
  D.setActiveDifficulty({ level: 'uitdagend', custom: { raceAi: 1.1, storyMode: 'aan' } });
  ok(D.raceSkillFactor() === 1.1 && D.storyModeOn() && D.qteChoice('normaal') === 'overslaan', 'Verhaalmodus zet quicktime-events op overslaan');
  ok(D.footballLevel() === 'uitdagend', 'het voetbal volgt het niveau');
  D.setActiveOption('footballAi', 'ontspannen');
  ok(D.footballLevel() === 'ontspannen', 'het voetbal kan los van het niveau');
  D.setActiveDifficulty({ level: 'standaard' });
}

// --- 5. de gameplay leest de optie (niet een eigen getal) -------------------------------------------------------------------
{
  D.setActiveDifficulty({ level: 'uitdagend' });
  ok(W.loseAfterOf(W.levelOf(1)) === 4 * 1.25 && W.cooldownOf(W.levelOf(1)) === 12.5, 'Politie kwijtraken: uitdagend duurt een kwart langer');
  ok(W.policeDensity(3).target === 4 && W.policeDensity(5).target === 9, 'Politiemacht: uitdagend heeft een kwart meer eenheden');
  const pol = { unseenFor: 0, searching: false, lastSeen: { x: 0, y: 0 }, searchRadius: 0, searchCenter: null };
  const w = { wanted: 1, wantedDecayTimer: 0 };
  let t = 0, gone = false;
  while (!gone && t < 120) { gone = W.stepUnseen(pol, w, 0.5, 0, 0); t += 0.5; }
  ok(gone && Math.abs(t - globalThis.__tStd * 1.25) <= 0.5, 'uitdagend: één ster duurt een kwart langer dan op Standaard', t);
  D.setActiveDifficulty({ level: 'ontspannen' });
  ok(W.policeDensity(3).target === 2 && W.policeDensity(1).target === 1, 'ontspannen: minder eenheden, nooit minder dan één');
  ok(D.scaleIncome(1000) === 1150 && D.scaleIncome(10) === 12, 'ontspannen: een beloning is een zesde meer, afgerond op hele euro\'s');
  ok(Q.qteStandVan({ qteStand: 'normaal' }) === 'makkelijk', 'ontspannen zet quicktime-events op makkelijk');
  D.setActiveDifficulty({ level: 'standaard' });
}
const src = (f) => read(`game/js/${f}`);
const KOPPELINGEN = [
  ['wantedlevels.js', /policeEscapeFactor\(\)/, 'politie kwijtraken'], ['wantedlevels.js', /scaleUnits\(/, 'politiemacht'], ['hud_panel.js', /cooldownOf\(/, 'de zoekbalk volgt de afkoeltijd'],
  ['main.js', /trafficFactor\(\)/, 'verkeersdrukte (spawn)'], ['streetpopulation.js', /trafficFactor\(\)/, 'verkeersdrukte (uitdunnen)'],
  ['vehicle.js', /vehicleDamageFactor\(\)/, 'schade aan je voertuig'], ['combat.js', /damageTakenFactor\(\)/, 'schade aan jezelf'],
  ['player.js', /toggleChoice\('driveAssist'/, 'rij-assist'], ['racers.js', /raceSkillFactor\(\)/, 'races'], ['kartbaan.js', /raceSkillFactor\(\)/, 'kartbaan'],
  ['qte.js', /qteChoice\(/, 'quicktime-events'], ['missions.js', /scaleIncome\(/, 'beloning'], ['missions.js', /storyModeOn\(\)/, 'verhaalmodus'],
  ['voetbal.js', /footballLevel\(\)/, 'voetbal niveau'], ['voetbal.js', /footballDuration\(/, 'voetbal duur'], ['hud_panel.js', /toggleChoice\('hints'/, 'hints'], ['prompts.js', /toggleChoice\('hints'/, 'hints (prompts)'],
  ['settings.js', /toggleChoice\('hints'/, 'hints (klasse)'],
];
for (const [f, re, wat] of KOPPELINGEN) ok(re.test(src(f)), `${f} leest ${wat} uit difficulty.js`);
// geen losse getallen meer naast de bron: de oude velden worden buiten wantedlevels.js niet meer rechtstreeks gelezen
{
  const bestanden = fs.readdirSync(path.join(root, 'game/js')).filter((f) => f.endsWith('.js'));
  const los = bestanden.filter((f) => f !== 'wantedlevels.js' && /levelOf\([^)]*\)\.(loseAfter|cooldown)\b/.test(src(f)));
  ok(los.length === 0, 'niemand leest loseAfter of cooldown nog los van wantedlevels.js', los);
}

// --- 6. de save: veld, migratie en opslag ----------------------------------------------------------------------------------
{
  const sg = src('savegame.js');
  ok(/moeilijkheid: getDifficultyProfile\(\)/.test(sg), 'serialize schrijft het veld moeilijkheid');
  ok(/setActiveDifficulty\(profileFromSave\(d\.moeilijkheid, legacyDifficultyLevel\)\)/.test(sg), 'applySave zet de moeilijkheid van de save');
  const legacy = D.profileFromSave(undefined, 'standaard');
  ok(legacy.level === 'standaard' && Object.keys(legacy.custom).length === 0, 'een oude save zonder veld is Standaard');
  ok(D.profileFromSave(undefined, 'uitdagend').level === 'uitdagend', 'een oude save erft het niveau dat het apparaat had (eenmalig)');
  ok(D.profileFromSave(null, 'onzin').level === 'standaard' && D.profileFromSave(7, 'x').level === 'standaard', 'een kapot veld of kapot apparaatniveau valt terug op Standaard');
  const geschreven = JSON.parse(JSON.stringify({ moeilijkheid: { level: 'uitdagend', custom: { income: 1.25, policeUnits: 0.5 } } }));
  const terug = D.profileFromSave(geschreven.moeilijkheid);
  ok(terug.level === 'uitdagend' && terug.custom.income === 1.25 && terug.custom.policeUnits === 0.5, 'het profiel overleeft opslaan en laden');
  ok(D.profileFromSave({ level: 'ontspannen', custom: { income: 9, nietsbestaand: 1 } }).custom.income === undefined, 'een kapotte optie in een save valt terug op het niveau');
  ok(D.cleanProfile(D.cleanProfile({ level: 'uitdagend', custom: { income: 1.25 } })).custom.income === 1.25, 'cleanProfile is idempotent');
  // de savegame-versie is niet opgehoogd: het veld is optioneel en een oude save leest zonder migratie
  const sm = src('savemigrate.js');
  ok(/export const SAVE_VERSION = \d+;/.test(sm), 'SAVE_VERSION blijft een getal (het veld is optioneel)');
}

// --- 7. de spiegel in de instellingen (per save, niet per apparaat) ---------------------------------------------------------
{
  D.setActiveDifficulty({ level: 'standaard' });
  ok(S.getSettings().difficulty === 'standaard', 'de instelling spiegelt het niveau');
  S.setSetting('difficulty', 'uitdagend');
  ok(D.getDifficulty().level === 'uitdagend' && D.opt('trafficDensity') === 1.25, 'een niveau kiezen in de instellingen zet de moeilijkheid van de save');
  D.setActiveOption('income', 1.25);
  ok(S.getSettings().difficulty === 'uitdagend', 'een aanpassing laat het niveau staan');
  D.setActiveLevel('ontspannen');
  ok(S.getSettings().difficulty === 'ontspannen', 'een niveau uit de save zet de spiegel');
  S.resetSettings();
  ok(S.getSettings().difficulty === 'ontspannen' && D.getDifficulty().level === 'ontspannen', 'Standaard herstellen raakt de moeilijkheid van de save niet');
  ok(typeof S.legacyDifficultyLevel === 'string', 'het niveau van het apparaat vóór dit systeem blijft bekend voor de migratie');
  S.setSetting('difficulty', 'standaard');
  D.setActiveDifficulty({ level: 'standaard' });
}

// --- 8. Samen spelen: de regel staat in het manifest en de docs --------------------------------------------------------------
{
  ok(D.OPTION_DEFS.filter((d) => d.scope === 'wereld').map((d) => d.key).sort().join() === 'policeEscape,policeUnits,trafficDensity', 'alleen politie en verkeer zijn van de wereld (de host)');
  ok(D.OPTION_DEFS.filter((d) => d.scope === 'lokaal').length === D.OPTION_DEFS.length - 3, 'de rest is lokaal per speler');
}

console.log(fails ? `${fails}/${n} FAIL` : `difficulty_profile_test: ${n}/${n} ok`);
process.exitCode = fails ? 1 : 0;
