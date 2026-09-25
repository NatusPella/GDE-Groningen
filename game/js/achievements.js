// Prestaties: declarative list, lifetime stats and the unlock toast.
// Import-free on purpose so any module can call the hooks (recordStat,
// recordUnique, unlockAchievement) without creating import cycles; the
// polling detectors live in achievementtracker.js.
//
// Storage: everything the player earns for good (unlocks, lifetime counters,
// best mission times/medals) sits in its own key so it survives "Nieuw spel".
// Per-playthrough bits (found eierballen) travel inside the savegame, which
// also carries a copy of the unlocked ids so a save restores them if the
// lifetime key was ever cleared.

const KEY = 'gte-prestaties-v1';
const WRITE_DELAY_MS = 2500;
const TOAST_S = 4.2;
export const EIERBAL_TOTAL = 30;

export const CATEGORIES = [
  ['missies', 'Missies'],
  ['rijden', 'Rijden'],
  ['tevoet', 'Te voet'],
  ['politie', 'Politie'],
  ['verkennen', 'Verkennen'],
  ['spoor', 'Spoor & weer'],
  ['sociaal', 'Sociaal & geld'],
  ['verzamelen', 'Verzamelen'],
  ['duif', 'Duif-modus'],
  ['bijbaan', 'Bijbaantjes'],
];

// Per mission (index order of missions.js): medal times in seconds, the
// damage budget for gold/silver (health + armour lost) and the optional
// challenge. wanted: highest star count still allowed for gold.
export const MISSION_GOALS = [
  { name: 'Bommen Berend', gold: 50, silver: 70, wanted: 1, extra: ['Geen schampje', 'Lever Berends bakkie af zonder ook maar één tikje'] },
  { name: 'Chaos op de Grote Markt', gold: 25, silver: 35, wanted: 5, extra: ['Kijkcijferrecord', 'Haal de livestream binnen 18 seconden: Jelmer breekt alle records'] },
  { name: 'KEI-weekrace', gold: 85, silver: 110, wanted: 1, extra: ['Achterlichten', 'Win de KEI-weekrace met minstens 40 seconden voorsprong op de klok'] },
  { name: 'Spoedklus Noorderzon', gold: 70, silver: 95, wanted: 1, extra: ['Decor in één stuk', 'Bezorg het Noorderzon-decor zonder één harde klap'] },
  { name: 'Ringweg-race', gold: 150, silver: 190, wanted: 5, byPlace: true, extra: ['Netjes ingehaald', 'Win de ringweg-race zonder een rivaal te raken'] },
  { name: 'Kroegentocht', gold: 85, silver: 110, wanted: 0, extra: ['Laatste ronde', 'Haal alle vier de kroegen met nog een volle minuut op de klok'] },
  { name: 'Fatbike-terreur', gold: 30, silver: 36, wanted: 0, extra: ['Geen bandafdruk', 'Kom het Zuiderpark door zonder één keer geschept te worden'] },
  { name: 'Rondvaart', gold: 105, silver: 125, wanted: 0, extra: ['Glad water', 'Vaar de rondvaart zonder ergens tegenaan te tikken'] },
];
export const GOLD_DAMAGE = 25;
export const SILVER_DAMAGE = 60;
export const MEDALS = ['', 'Brons', 'Zilver', 'Goud'];

const mdefs = [];
MISSION_GOALS.forEach((g, i) => {
  const n = i + 1;
  mdefs.push({ id: `m${n}_klaar`, cat: 'missies', title: `${g.name}`, desc: `Klaar missie ${n}` });
  const goldDesc = g.byPlace ? 'Goud: win de race als eerste' : `Goud: binnen ${fmtTime(g.gold)}, weinig schade${g.wanted < 5 ? g.wanted ? ', hooguit 1 ster' : ', zonder politie' : ''}`;
  mdefs.push({ id: `m${n}_goud`, cat: 'missies', title: `${g.name}: goud`, desc: goldDesc, medal: true });
  mdefs.push({ id: `m${n}_extra`, cat: 'missies', title: g.extra[0], desc: g.extra[1] });
});

export const ACHIEVEMENTS = [
  ...mdefs,
  { id: 'alle_missies', cat: 'missies', title: 'Grunn is van jou', desc: 'Klaar alle acht missies', count: 'missionsDone', goal: 8 },
  { id: 'alle_zilver', cat: 'missies', title: 'Zilveren Stadjer', desc: 'Minstens zilver op elke missie', count: 'silverPlus', goal: 8 },
  { id: 'alle_goud', cat: 'missies', title: 'Gouden Eierbal', desc: 'Goud op alle acht missies', count: 'goldCount', goal: 8 },

  { id: 'snel_100', cat: 'rijden', title: 'Honderd op de teller', desc: 'Rij 100 km/u', stat: 'topSpeed', goal: 100, unit: 'km/u' },
  { id: 'snel_140', cat: 'rijden', title: 'Harder dan de flitspaal kan tellen', desc: 'Rij 140 km/u', stat: 'topSpeed', goal: 140, unit: 'km/u' },
  { id: 'rijden_25', cat: 'rijden', title: 'Rondje Grunn', desc: 'Rij in totaal 25 km', stat: 'driven', goal: 25000, unit: 'm' },
  { id: 'bijna_10', cat: 'rijden', title: 'Scheer-rijder', desc: '10 keer rakelings langs een ander voertuig', stat: 'nearMiss', goal: 10 },
  { id: 'bijna_50', cat: 'rijden', title: 'Zijspiegels ingeklapt', desc: '50 keer rakelings langs een ander voertuig', stat: 'nearMiss', goal: 50 },
  { id: 'wrakken_25', cat: 'rijden', title: 'Sloopkampioen', desc: 'Maak 25 voertuigen total loss', stat: 'wrecks', goal: 25 },
  { id: 'gejat_10', cat: 'rijden', title: 'Even lenen', desc: 'Jat 10 voertuigen', stat: 'stolen', goal: 10 },
  { id: 'gejat_50', cat: 'rijden', title: 'Autohandel Ome Stadjer', desc: 'Jat 50 voertuigen', stat: 'stolen', goal: 50 },
  { id: 'bus', cat: 'rijden', title: 'Lijn 5 rijdt vandaag anders', desc: 'Jat een stadsbus' },
  { id: 'alle_typen', cat: 'rijden', title: 'Van fiets tot rondvaartboot', desc: 'Rij in elk soort voertuig: auto, bus, fiets, fatbike, scooter, boot en politieauto', set: 'vehicleTypes', goal: 7 },
  { id: 'politieauto', cat: 'rijden', title: 'Zwaailicht erop', desc: 'Kaap een politieauto', hidden: true },
  { id: 'geflitst', cat: 'rijden', title: 'Smile!', desc: 'Word geflitst', hidden: true },

  { id: 'lopen_5', cat: 'tevoet', title: 'Wandelen op de Diepenring', desc: 'Loop in totaal 5 km', stat: 'walked', goal: 5000, unit: 'm' },
  { id: 'zwemmen', cat: 'tevoet', title: 'Kanaalzwemmer', desc: 'Zwem in totaal 250 meter', stat: 'swum', goal: 250, unit: 'm' },
  { id: 'kade_klim', cat: 'tevoet', title: 'Kadeklimmer', desc: 'Klim uit de Diepenring de kade op' },

  { id: 'ster_3', cat: 'politie', title: 'Bekend bij de politie', desc: 'Haal drie sterren', stat: 'maxWanted', goal: 3 },
  { id: 'ster_5', cat: 'politie', title: 'Heel Grunn zoekt je', desc: 'Haal vijf sterren', stat: 'maxWanted', goal: 5 },
  { id: 'ontsnapt_5', cat: 'politie', title: 'Foetsie', desc: 'Raak de politie kwijt na vijf sterren' },
  { id: 'gezocht_3m', cat: 'politie', title: 'Kat en muis', desc: 'Blijf drie minuten achter elkaar gezocht', stat: 'wantedStreak', goal: 180, unit: 's' },
  { id: 'opgepakt', cat: 'politie', title: 'Even brommen', desc: 'Word opgepakt', hidden: true },
  { id: 'wasted', cat: 'politie', title: 'Even plat', desc: 'Ga een keer neer', hidden: true },

  { id: 'wijken_10', cat: 'verkennen', title: 'Stadjer in wording', desc: 'Ontdek 10 wijken', set: 'wijken', goal: 10 },
  { id: 'wijken_33', cat: 'verkennen', title: 'Halve Stadjer', desc: 'Ontdek 33 wijken', set: 'wijken', goal: 33 },
  { id: 'wijken_alle', cat: 'verkennen', title: 'Kenner van Grunn', desc: 'Ontdek alle 66 wijken', set: 'wijken', goal: 66 },
  { id: 'landmarks', cat: 'verkennen', title: 'Toerist in eigen stad', desc: 'Bezoek alle 14 bezienswaardigheden', set: 'landmarks', goal: 14 },
  { id: 'ommelanden', cat: 'verkennen', title: 'Ommelander', desc: 'Trek de stad uit, De Ommelanden in' },
  { id: 'umcg_heli', cat: 'verkennen', title: 'Traumaduif', desc: 'Land op het helidek van het UMCG', hidden: true },
  { id: 'zonsopgang', cat: 'verkennen', title: 'Vroege vogel', desc: 'Zie de zon opkomen boven Grunn' },

  { id: 'treinen', cat: 'spoor', title: 'Treinspotter', desc: 'Zie alle soorten treinen: GTW, WINK en de Intercity', set: 'trains', goal: 3 },
  { id: 'trein_race', cat: 'spoor', title: 'Sneller dan de sprinter', desc: 'Rij een rijdende trein voorbij', hidden: true },
  { id: 'trein_1', cat: 'spoor', title: 'Instappen, deuren sluiten', desc: 'Reis met de trein naar een ander station', stat: 'trainTrips', goal: 1 },
  { id: 'forens', cat: 'spoor', title: 'Forens', desc: 'Reis 10 keer met de trein', stat: 'trainTrips', goal: 10 },
  { id: 'overweg', cat: 'spoor', title: 'Netjes gewacht', desc: 'Wacht keurig voor een dichte overweg tot de trein voorbij is', hidden: true },
  { id: 'storm', cat: 'spoor', title: 'Code Rood', desc: 'Rij een halve minuut door een storm' },
  { id: 'onweer', cat: 'spoor', title: 'Donder en bliksem', desc: 'Maak een onweersbui mee' },

  { id: 'kusje_1', cat: 'sociaal', title: 'Moi schat', desc: 'Geef Tammo of Anita een kusje', stat: 'kisses', goal: 1 },
  { id: 'kusje_25', cat: 'sociaal', title: 'Tortelduifjes', desc: 'Geef 25 kusjes', stat: 'kisses', goal: 25 },
  { id: 'horeca_5', cat: 'sociaal', title: 'Kroegtijger', desc: 'Eet of drink iets bij 5 verschillende zaken', set: 'horeca', goal: 5 },
  { id: 'horeca_25', cat: 'sociaal', title: 'Bitterbal-sommelier', desc: 'Eet of drink iets bij 25 verschillende zaken', set: 'horeca', goal: 25 },
  { id: 'rijk', cat: 'sociaal', title: 'Groninger koopman', desc: 'Heb €5.000 op zak', stat: 'maxMoney', goal: 5000, unit: '€' },
  { id: 'koop_1', cat: 'sociaal', title: 'Klant is koning', desc: 'Koop iets in een winkel', stat: 'purchases', goal: 1 },
  { id: 'koop_10', cat: 'sociaal', title: 'Shopaholic', desc: 'Doe 10 aankopen', stat: 'purchases', goal: 10 },
  { id: 'uitgaven', cat: 'sociaal', title: 'Geld moet rollen', desc: 'Geef in winkels in totaal €2.500 uit', stat: 'spent', goal: 2500, unit: '€' },

  { id: 'eierbal_1', cat: 'verzamelen', title: 'Eerste eierbal', desc: 'Vind een verstopte eierbal', save: 'eierballen', goal: 1 },
  { id: 'eierbal_15', cat: 'verzamelen', title: 'Halve portie', desc: `Vind 15 van de ${EIERBAL_TOTAL} eierballen`, save: 'eierballen', goal: 15 },
  { id: 'eierbal_alle', cat: 'verzamelen', title: 'Eierbalkoning', desc: `Vind alle ${EIERBAL_TOTAL} eierballen in één spel`, save: 'eierballen', goal: EIERBAL_TOTAL },

  { id: 'duif_martini', cat: 'duif', title: 'Hoogste duif van Grunn', desc: 'Land boven op de Martinitoren' },
  { id: 'duif_forum', cat: 'duif', title: 'Uitzicht vanaf het Forum', desc: 'Land op het dak van het Forum' },
  { id: 'duif_station', cat: 'duif', title: 'Stationsduif', desc: 'Land op het Hoofdstation' },
  { id: 'duif_aakerk', cat: 'duif', title: 'Kerkduif', desc: 'Land op de Der Aa-kerk' },
  { id: 'duif_bus', cat: 'duif', title: 'Zwartrijder', desc: 'Lift mee op een bus' },
  { id: 'duif_boot', cat: 'duif', title: 'Grachtenduif', desc: 'Vaar mee op een boot' },
  { id: 'duif_auto', cat: 'duif', title: 'Liftduif', desc: 'Rij mee op een auto' },
  { id: 'duif_loft', cat: 'duif', title: 'Thuis bij de duivenmelker', desc: 'Vind het hok van duivenmelker Harm', hidden: true },
  { id: 'duif_meeuw', cat: 'duif', title: 'Meeuw te slim af', desc: 'Laat een meeuw met lege snavel achter', hidden: true },

  { id: 'sj_eerste', cat: 'bijbaan', title: 'Eerste loonstrookje', desc: 'Rond een klus af bij een bijbaantje', stat: 'sjRounds', goal: 1 },
  { id: 'sj_50', cat: 'bijbaan', title: 'Harde werker', desc: 'Rond 50 klussen af bij bijbaantjes', stat: 'sjRounds', goal: 50 },
  { id: 'sj_alle', cat: 'bijbaan', title: 'Duizendpoot', desc: 'Rond bij alle zes bijbaantjes een klus af', set: 'sjJobs', goal: 6 },
  { id: 'sj_geld', cat: 'bijbaan', title: 'Eerlijk verdiend', desc: 'Verdien in totaal €5.000 met bijbaantjes', stat: 'sjEarned', goal: 5000, unit: '€' },
  { id: 'sj_bezorger', cat: 'bijbaan', title: 'Nog warm!', desc: 'Bezorg 8 bestellingen op rij in één dienst', stat: 'sj_bezorger_streak', goal: 8 },
  { id: 'sj_taxi', cat: 'bijbaan', title: 'Moi, waar mag het heen?', desc: 'Rijd 6 taxiritten op rij in één dienst', stat: 'sj_taxi_streak', goal: 6 },
  { id: 'sj_bus', cat: 'bijbaan', title: 'Keurig op tijd', desc: 'Rijd een hele buslijn zonder één keer te laat te zijn' },
  { id: 'sj_rondvaart', cat: 'bijbaan', title: 'Links ziet u...', desc: 'Vaar een rondvaart zonder één stukje uitleg te missen' },
  { id: 'sj_fietsdepot', cat: 'bijbaan', title: 'Stationsplein leeg', desc: 'Ruim 5 rondes foutgeparkeerde fietsen op in één dienst', stat: 'sj_fietsdepot_streak', goal: 5 },
  { id: 'sj_verhuizing', cat: 'bijbaan', title: 'Niks gebroken', desc: 'Verhuis een student zonder dat er iets sneuvelt' },
  { id: 'sj_legende', cat: 'bijbaan', title: 'Legende van Grunn', desc: 'Haal niveau 5 bij een bijbaantje' },
  { id: 'sj_kots', cat: 'bijbaan', title: 'Kotszakje vergeten', desc: 'Een student kotst je taxi onder', hidden: true },
];
const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

let life = blankLife();
let perSave = { eierballen: new Set() };
let world = null;
let writeTimer = 0;
let toastEl = null;
let toastQueue = [];
let toastUntil = 0;
let toastTimer = 0;

function blankLife() {
  return { v: 1, unlocked: {}, stats: {}, sets: {}, missions: {} };
}

function fmtTime(s) {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
export { fmtTime as formatMissionTime };

function loadLife() {
  life = blankLife();
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!d || d.v !== 1) return;
    if (d.unlocked && typeof d.unlocked === 'object') for (const [id, t] of Object.entries(d.unlocked)) if (BY_ID.has(id)) life.unlocked[id] = Number(t) || 1;
    if (d.stats && typeof d.stats === 'object') for (const [k, v] of Object.entries(d.stats)) if (Number.isFinite(v)) life.stats[k] = v;
    if (d.sets && typeof d.sets === 'object') for (const [k, v] of Object.entries(d.sets)) if (Array.isArray(v)) life.sets[k] = v.filter((s) => typeof s === 'string');
    if (d.missions && typeof d.missions === 'object') {
      for (const [i, r] of Object.entries(d.missions)) {
        if (!MISSION_GOALS[i] || !r) continue;
        life.missions[i] = { best: Number.isFinite(r.best) ? r.best : null, medal: Math.max(0, Math.min(3, r.medal | 0)), runs: r.runs | 0 };
      }
    }
  } catch (e) { /* ignore */ }
}

// A second tab may have written since we loaded: fold its progress in so
// neither tab erases the other's unlocks.
function mergeStored() {
  const mine = life;
  loadLife();
  const other = life;
  life = mine;
  for (const [id, t] of Object.entries(other.unlocked)) if (!life.unlocked[id]) life.unlocked[id] = t;
  for (const [k, v] of Object.entries(other.stats)) if (!(life.stats[k] >= v)) life.stats[k] = v;
  for (const [k, list] of Object.entries(other.sets)) {
    const cur = life.sets[k] || (life.sets[k] = []);
    for (const s of list) if (!cur.includes(s)) cur.push(s);
  }
  for (const [i, r] of Object.entries(other.missions)) {
    const cur = life.missions[i];
    if (!cur) { life.missions[i] = r; continue; }
    if (r.best != null && (cur.best == null || r.best < cur.best)) cur.best = r.best;
    cur.medal = Math.max(cur.medal, r.medal);
    cur.runs = Math.max(cur.runs, r.runs);
  }
}

function writeNow() {
  writeTimer = 0;
  try {
    mergeStored();
    localStorage.setItem(KEY, JSON.stringify(life));
  } catch (e) { /* ignore */ }
}

function markDirty(now = false) {
  if (now) {
    if (writeTimer) clearTimeout(writeTimer);
    writeNow();
    return;
  }
  if (!writeTimer) writeTimer = setTimeout(writeNow, WRITE_DELAY_MS);
}

loadLife();
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { if (writeTimer) { clearTimeout(writeTimer); writeNow(); } });
}

export function initAchievements(w) {
  world = w;
}

// --- progress --------------------------------------------------------------

function derived(key) {
  const recs = Object.values(life.missions);
  if (key === 'missionsDone') return MISSION_GOALS.filter((g, i) => life.unlocked[`m${i + 1}_klaar`]).length;
  if (key === 'silverPlus') return recs.filter((r) => r.medal >= 2).length;
  if (key === 'goldCount') return recs.filter((r) => r.medal >= 3).length;
  return 0;
}

function progressOf(a) {
  if (a.stat) return life.stats[a.stat] || 0;
  if (a.set) return (life.sets[a.set] || []).length;
  if (a.save) return perSave[a.save] ? perSave[a.save].size : 0;
  if (a.count) return derived(a.count);
  return null;
}

function checkGoals(filter) {
  for (const a of ACHIEVEMENTS) {
    if (!a.goal || life.unlocked[a.id] || !filter(a)) continue;
    if (progressOf(a) >= a.goal) unlockAchievement(world, a.id);
  }
}

export function isUnlocked(id) {
  return !!life.unlocked[id];
}

export function getStat(key) {
  return life.stats[key] || 0;
}

export function recordStat(w, key, n = 1) {
  if (!Number.isFinite(n) || !n) return;
  if (w) world = w;
  life.stats[key] = (life.stats[key] || 0) + n;
  markDirty();
  checkGoals((a) => a.stat === key);
}

export function setStatMax(w, key, value) {
  if (!Number.isFinite(value) || value <= (life.stats[key] || 0)) return;
  if (w) world = w;
  life.stats[key] = value;
  markDirty();
  checkGoals((a) => a.stat === key);
}

export function recordUnique(w, key, value) {
  if (typeof value !== 'string' || !value) return false;
  if (w) world = w;
  const list = life.sets[key] || (life.sets[key] = []);
  if (list.includes(value)) return false;
  list.push(value);
  markDirty();
  checkGoals((a) => a.set === key);
  return true;
}

export function hasUnique(key, value) {
  return (life.sets[key] || []).includes(value);
}

export function getSaveSet(key) {
  return perSave[key] || (perSave[key] = new Set());
}

export function addToSaveSet(w, key, value) {
  const s = getSaveSet(key);
  if (s.has(value)) return false;
  s.add(value);
  if (w) world = w;
  checkGoals((a) => a.save === key);
  return true;
}

export function unlockAchievement(w, id, { silent = false } = {}) {
  const a = BY_ID.get(id);
  if (!a || life.unlocked[id]) return false;
  if (w) world = w;
  life.unlocked[id] = Date.now();
  markDirty(true);
  if (!silent) queueToast(a);
  checkGoals((x) => !!x.count);
  return true;
}

// --- missions ---------------------------------------------------------------

export function getMissionRecord(i) {
  return life.missions[i] || null;
}

// result: { time, medal, extra } - returns what changed for the HUD message.
export function recordMissionResult(w, i, result) {
  if (!MISSION_GOALS[i]) return null;
  const prev = life.missions[i] || { best: null, medal: 0, runs: 0 };
  const rec = { ...prev, runs: prev.runs + 1 };
  const newBest = rec.best == null || result.time < rec.best;
  if (newBest) rec.best = Math.round(result.time * 10) / 10;
  const newMedal = result.medal > rec.medal;
  if (newMedal) rec.medal = result.medal;
  life.missions[i] = rec;
  markDirty(true);
  const n = i + 1;
  unlockAchievement(w, `m${n}_klaar`);
  if (result.medal >= 3) unlockAchievement(w, `m${n}_goud`);
  if (result.extra) unlockAchievement(w, `m${n}_extra`);
  checkGoals((a) => !!a.count);
  return { newBest: newBest && prev.best != null, newMedal, prevBest: prev.best, medal: result.medal };
}

// --- savegame ---------------------------------------------------------------

export function getAchievementSaveData() {
  return { eierballen: [...getSaveSet('eierballen')], unlocked: Object.keys(life.unlocked) };
}

export function applyAchievementSaveData(d) {
  perSave = { eierballen: new Set() };
  if (!d || typeof d !== 'object') return;
  if (Array.isArray(d.eierballen)) for (const id of d.eierballen) if (typeof id === 'string') perSave.eierballen.add(id);
  let merged = false;
  if (Array.isArray(d.unlocked)) {
    for (const id of d.unlocked) if (BY_ID.has(id) && !life.unlocked[id]) { life.unlocked[id] = 1; merged = true; }
  }
  if (merged) markDirty(true);
}

// --- views ------------------------------------------------------------------

export function getAchievementSummary() {
  const total = ACHIEVEMENTS.length;
  const done = ACHIEVEMENTS.filter((a) => life.unlocked[a.id]).length;
  return { done, total, pct: total ? Math.floor((done / total) * 100) : 0 };
}

export function getAchievementView() {
  return CATEGORIES.map(([cat, label]) => {
    const items = ACHIEVEMENTS.filter((a) => a.cat === cat).map((a) => {
      const unlocked = !!life.unlocked[a.id];
      const cur = progressOf(a);
      return {
        id: a.id, unlocked, hidden: !!a.hidden && !unlocked, medal: !!a.medal,
        title: a.title, desc: a.desc, at: unlocked && life.unlocked[a.id] > 1 ? life.unlocked[a.id] : 0,
        progress: a.goal && a.goal > 1 && cur != null ? { cur: Math.min(cur, a.goal), goal: a.goal, unit: a.unit || '' } : null,
      };
    });
    return { cat, label, items, done: items.filter((x) => x.unlocked).length };
  });
}

export function getLifetimeStats() {
  const s = life.stats;
  return {
    driven: s.driven || 0, walked: s.walked || 0, swum: s.swum || 0, topSpeed: s.topSpeed || 0,
    nearMiss: s.nearMiss || 0, stolen: s.stolen || 0, kisses: s.kisses || 0, wrecks: s.wrecks || 0,
    trainTrips: s.trainTrips || 0,
    wijken: (life.sets.wijken || []).length, eierballen: getSaveSet('eierballen').size,
  };
}

// --- toast ------------------------------------------------------------------

const CSS = `
#hud .ach-toast { position: absolute; top: 11vh; left: 50%; z-index: 6; display: flex; align-items: center; gap: 14px;
  min-width: 300px; max-width: calc(100vw - 32px); box-sizing: border-box; padding: 10px 22px 10px 12px;
  background: linear-gradient(90deg, rgba(12,20,14,0.94) 0%, rgba(12,20,14,0.86) 70%, rgba(12,20,14,0.6) 100%);
  border-left: 4px solid #3fc97a; box-shadow: 0 8px 28px rgba(0,0,0,0.55), 0 0 22px rgba(63,201,122,0.18);
  opacity: 0; transform: translate(-50%, -14px); transition: opacity 0.35s ease, transform 0.35s ease; pointer-events: none; }
#hud .ach-toast.on { opacity: 1; transform: translate(-50%, 0); }
#hud .ach-toast .ach-ico { flex: none; width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center;
  background: radial-gradient(circle at 35% 30%, #6fe39d 0%, #1e9e56 70%); color: #0c140e; box-shadow: 0 0 16px rgba(63,201,122,0.5); }
#hud .ach-toast.gold { border-left-color: #e8c93a; }
#hud .ach-toast.gold .ach-ico { background: radial-gradient(circle at 35% 30%, #fff0a8 0%, #d9a91e 70%); box-shadow: 0 0 16px rgba(232,201,58,0.55); }
#hud .ach-toast .ach-txt { display: flex; flex-direction: column; min-width: 0; }
#hud .ach-toast .ach-kicker { font-size: 13px; letter-spacing: 3px; color: #3fc97a; }
#hud .ach-toast.gold .ach-kicker { color: #e8c93a; }
#hud .ach-toast .ach-title { font-size: 27px; letter-spacing: 1.5px; line-height: 1; color: #f0ede4; }
#hud .ach-toast .ach-desc { font: 14px/1.3 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.3px; color: rgba(240,237,228,0.75); }
#hud .ach-toast .ach-pct { font-size: 15px; color: rgba(240,237,228,0.5); margin-left: 8px; letter-spacing: 1px; }
@media (max-width: 480px) { #hud .ach-toast { min-width: 0; width: calc(100vw - 32px); } #hud .ach-toast .ach-title { font-size: 22px; } }
`;

export const TROPHY_SVG = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3zm0 4H6v1a2 2 0 0 0 1 1.7V7zm10 0v2.7A2 2 0 0 0 18 8V7h-1z"/></svg>';

function ensureToast() {
  if (toastEl || typeof document === 'undefined') return toastEl;
  const hud = document.getElementById('hud');
  if (!hud) return null;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  toastEl = document.createElement('div');
  toastEl.className = 'ach-toast';
  toastEl.setAttribute('role', 'status');
  toastEl.setAttribute('aria-live', 'polite');
  hud.appendChild(toastEl);
  return toastEl;
}

const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function queueToast(a) {
  toastQueue.push(a);
  if (!toastUntil) showNextToast();
}

// Waits out cutscenes and menus so an unlock is never shown where nobody sees it.
function toastBlocked() {
  const b = document.body;
  if (!b.classList.contains('game-started') || b.classList.contains('cine-hide-hud')) return true;
  const pm = document.getElementById('pause-menu');
  return !!(pm && pm.classList.contains('visible'));
}

function showNextToast() {
  const el = ensureToast();
  if (el && toastQueue.length && toastBlocked()) {
    toastUntil = 1;
    toastTimer = setTimeout(showNextToast, 500);
    return;
  }
  const a = toastQueue.shift();
  if (!el || !a) { toastUntil = 0; return; }
  const gold = a.medal || a.id === 'alle_goud';
  el.classList.toggle('gold', gold);
  const { pct } = getAchievementSummary();
  el.innerHTML = `<span class="ach-ico">${TROPHY_SVG}</span><span class="ach-txt">` +
    `<span class="ach-kicker">PRESTATIE ONTGRENDELD<span class="ach-pct">${pct}%</span></span>` +
    `<span class="ach-title">${escHtml(a.title)}</span><span class="ach-desc">${escHtml(a.desc)}</span></span>`;
  void el.offsetWidth;
  el.classList.add('on');
  if (world) {
    const q = world.audioEvents || (world.audioEvents = []);
    if (q.length < 64) q.push({ kind: 'prestatie', x: world.player ? world.player.x : 0, y: world.player ? world.player.y : 0 });
  }
  toastUntil = 1;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('on');
    toastTimer = setTimeout(showNextToast, 450);
  }, TOAST_S * 1000);
}
