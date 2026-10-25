// "Te doen": one catalogue of everything there is to do, for the pause menu
// (Overzicht, Te doen), the map's marker card and search. Read only
// from the systems that own the things; choosing one makes it the player's
// goal (goal.js). A story mission later than the current step asks first
// (confirmPlayAhead): playing ahead mixes up the story.
//
// An item: { key, group, icon, title, code, meta, status ('nu' | 'klaar' |
// 'later' | 'slot' | ''), medal (0-3, or null without medals), record, x, y,
// dist, goal (a goal.js spec, 'story' for the current story step, or null),
// mission (index), detail: { kicker, text, rows: [[label, value]], medals } }.
import { wasHelped } from './assistlive.js';
import { getSettings } from './settings.js';
import { getMissionList, getMissionDefs, trackMission, isMissionActive, activeMissionIndex, medalBonusLeft } from './missions.js';
import { getStorySteps, storyMissionAhead } from './story.js';
import { STEP_BY_ID } from './storyarc.js';
import { getMissionRecord, getChallengeRecord, MISSION_GOALS, MEDALS, formatMissionTime, getStat, isUnlocked, getSaveSet, uniqueCount, EIERBAL_TOTAL } from './achievements.js';
import { getSideJobOffers, getSideJobList } from './sidejobs.js';
import { getPadelSpotsForRender } from './padel.js';
import { getHeliSpotsForRender, HELI_MEDAL_SCORES } from './helirun.js';
import { getPigeonSpotsForRender } from './pigeonspots.js';
import { getPigeonSaveData } from './pigeonmode.js';
import { activityMapIcons } from './activities.js';
import { LES_IDS } from './vliegschoolrules.js';
import { isPostgameOpen, CHALLENGES } from './postgame.js';
import { SET_DONE, SET_EGGS } from './dorpsuitjes.js';
import { VILLAGES } from './ommelandlines.js';
import { getStationsForRender } from './stationtravel.js';
import { SECRETS_TOTAL } from './geheimen.js';
import { DRIFT_ZONE, DRIFT_MEDAL_AT } from './driftzone.js';
import { getGoal, setGoal, clearGoal } from './goal.js';
import { drawMapIcon } from './hud_panel.js';
import { klusloon } from './economy.js';
import { zachtePauze } from './coopgroep.js';
import { samenWaarschuwing } from './coopstatus.js';
import { missieMagVanuitMenu, MISSIE_VIA_STARTPUNT } from './coopgast.js';

export const GROUPS = [
  ['missies', 'Missies', 'het verhaal en je klussen'],
  ['minigames', 'Minigames', 'altijd opnieuw te spelen'],
  ['bijbaantjes', 'Bijbaantjes', 'geld verdienen tussendoor'],
  ['ommeland', 'Ommeland', 'buiten de stad'],
  ['verzamelen', 'Verzamelen', 'zoek ze zelf'],
  ['nahetverhaal', 'Na het verhaal', 'Jelle wil revanche'],
];
export const STATUS_LABEL = { nu: 'Nu', klaar: 'Klaar', later: 'Later', slot: 'Op slot' };
const TYPE_LABEL = { deliver: 'Bezorgen', stunt: 'Stunts', checkpoint: 'Race', fatbike: 'Overleven', boat: 'Varen', stages: 'Missie' };
const WORLD_ENDS = 12;

const euro = (v) => '€' + Math.round(v).toLocaleString('nl-NL');
const who = (c) => (c === 'anita' ? 'Tessa' : c === 'tammo' ? 'Tammo' : '');

// --- icons: the map markers (hud_panel.js drawMapIcon) as small images -----------

const iconUrls = {};
export function mapIconUrl(kind, px = 40) {
  const k = kind + ':' + px + ':' + getSettings().colorBlind;
  if (iconUrls[k]) return iconUrls[k];
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = c.height = px * 2;
  const ctx = c.getContext('2d');
  ctx.scale((px * 2) / 24, (px * 2) / 24);
  // the mission rings are drawn wider than the disc icons
  const big = { missionIdle: 1.5, missionActive: 1.5, landmark: 1.8, eierbalTip: 2 }[kind] || (/^m[ia]-/.test(kind) ? 1.55 : 2.3);
  try { drawMapIcon(ctx, kind, 12, 12, big, { t: 0.3 }); } catch (e) { /* unknown kind: empty */ }
  return (iconUrls[k] = c.toDataURL());
}

// --- helpers ------------------------------------------------------------------------

// A short place name for a spot: a landmark close by, else the street, else the wijk.
export function placeName(world, x, y) {
  const meta = world.map.meta;
  let best = null, bd = 140;
  for (const l of meta.landmarks || []) {
    const d = Math.hypot(l.x - x, l.y - y);
    if (d < bd) { bd = d; best = l.name; }
  }
  if (best) return best;
  const rp = world.map.nearestRoadPoint(x, y, 60);
  if (rp && rp.road && rp.road.name) return rp.road.name;
  let wijk = '', wd = Infinity;
  for (const p of meta.neighbourhoodPoints || []) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < wd) { wd = d; wijk = p.name; }
  }
  return wijk;
}

function nearest(list, p) {
  let best = null, bd = Infinity;
  for (const q of list) {
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}

function medalRows(g, left) {
  const bonus = (m) => { const b = left.find((q) => q.medal === m); return b && b.amount ? ` · +${euro(b.amount)}` : ''; };
  return [
    [1, `Uitspelen${bonus(1)}`],
    [2, `Binnen ${formatMissionTime(g.silver)}, niet te veel schade${g.happy ? `, toeristen minstens ${g.happy[1]}% tevreden` : ''}${bonus(2)}`],
    [3, `${g.byPlace ? 'Als eerste over de finish' : `Binnen ${formatMissionTime(g.gold)}, weinig schade${g.happy ? `, toeristen minstens ${g.happy[0]}% tevreden` : ''}`}${g.wanted < 5 ? (g.wanted ? ', hooguit 1 ster' : ', zonder politie') : ''}${bonus(3)}`],
  ];
}

// --- the catalogue ------------------------------------------------------------------------

function missionItems(world) {
  const steps = getStorySteps();
  const defs = getMissionDefs();
  const active = activeMissionIndex();
  return [...getMissionList()].sort((a, b) => a.order - b.order).map((m) => {
    const i = m.index;
    const def = defs[i];
    const k = steps.findIndex((s) => s.mission === i);
    const step = steps[k];
    const ahead = storyMissionAhead(i);
    const status = active === i || (step && step.current) ? 'nu' : m.done ? 'klaar' : ahead ? 'later' : '';
    const g = MISSION_GOALS[i];
    const rec = g ? getMissionRecord(i) : null;
    const left = g ? medalBonusLeft(i) : [];
    const leftSum = left.reduce((n, q) => n + q.amount, 0);
    const place = placeName(world, m.start.x, m.start.y);
    const play = step && step.player ? who(step.player) : '';
    let meta;
    if (status === 'klaar' || (m.done && status === 'nu')) meta = `Klus · opnieuw spelen: ${euro(m.klusloon)} klusloon`;
    else if (status === 'nu') meta = ['Missie', play, euro(m.reward), place && `start ${place}`].filter(Boolean).join(' · ');
    else if (status === 'later') meta = 'Later in het verhaal · vooruit spelen kan, met waarschuwing';
    else meta = `${TYPE_LABEL[m.type] || 'Missie'} · ${euro(m.reward)}`;
    if (step && wasHelped(step.id)) meta += ' · met hulp';
    const record = [rec && rec.best != null ? `Record ${formatMissionTime(rec.best)}` : '', m.done && leftSum ? `${MEDALS[left[left.length - 1].medal].toLowerCase()} nog te halen: +${euro(leftSum)}` : ''].filter(Boolean).join(' · ');
    const next = k >= 0 ? steps.slice(k + 1).find((s) => s.available) : null;
    const rows = [['Start', place || '—']];
    rows.push(['Beloning', m.done ? `${euro(m.klusloon)} klusloon (eerste keer ${euro(m.reward)})` : euro(m.reward)]);
    rows.push(['Nodig', m.needs || 'Niks, je kunt meteen']);
    if (next && status !== 'klaar') rows.push(['Daarna', next.title]);
    if (rec && rec.best != null) rows.push(['Record', `${rec.medal ? MEDALS[rec.medal] + ' · ' : ''}${formatMissionTime(rec.best)}`]);
    return {
      key: 'm:' + i, group: 'missies', icon: 'mi-' + i, title: m.label, code: m.code || '', meta, status,
      medal: g && status !== 'later' ? (rec ? rec.medal : 0) : null, record: status === 'later' ? '' : record, x: m.start.x, y: m.start.y, mission: i, needs: m.needs,
      goal: step && step.current && !active ? 'story' : { kind: 'mission', id: i, name: m.code ? `${m.code} · ${m.label}` : m.label, sub: place, x: def.start.x, y: def.start.y },
      detail: {
        kicker: [m.code, m.done ? 'klus' : 'missie', play && `speel als ${play}`].filter(Boolean).join(' · '),
        text: step && step.lead && (m.done || status === 'nu') ? step.lead : status === 'later' ? 'Dit deel van het verhaal komt later. Je kunt hem nu al spelen, maar dan hoor je dingen die nog niet gebeurd zijn.' : '',
        rows, medals: g ? medalRows(g, left) : null,
      },
    };
  });
}

function minigameItems(world) {
  const p = world.player;
  const out = [];
  const add = (it, spots) => {
    const s = spots.length ? nearest(spots, p) : null;
    out.push({ group: 'minigames', status: '', ...it, x: s ? s.x : undefined, y: s ? s.y : undefined,
      goal: s ? { kind: 'play', id: it.playId, name: it.title, sub: s.name || placeName(world, s.x, s.y), x: s.x, y: s.y } : null,
      where: s ? s.name || placeName(world, s.x, s.y) : '' });
  };
  const padel = getPadelSpotsForRender();
  const pr = getChallengeRecord('padel');
  add({ key: 'mg:padel', playId: 'padel', icon: 'padel', title: 'Padel', meta: `${padel.length} banen in de stad · eerst tot twee games`,
    medal: pr ? pr.medal : 0, record: pr && pr.best != null ? `Record ${pr.best} punten` : 'Nog niet gespeeld',
    detail: { kicker: 'Minigame · overal in de stad', text: 'Een potje dubbel tegen de vaste spelers. Na afloop heb je je volle gezondheid terug en een poos Padelfit.', rows: [['Banen', String(padel.length)]] } }, padel);
  const acts = activityMapIcons(world);
  const carbid = acts.filter((a) => a.layer === 'carbid');
  const cr = getChallengeRecord('carbid');
  add({ key: 'mg:carbid', playId: 'carbid', icon: 'act-carbid', title: 'Carbid schieten', meta: `${carbid[0] ? carbid[0].name + ' · ' : ''}wacht tot de schemering`,
    medal: cr ? cr.medal : 0, record: cr && cr.best != null ? `Record ${cr.best} punten` : 'Nog niet gespeeld',
    detail: { kicker: 'Minigame · in de polder', text: 'Melkbus, water, carbid en een flinke knal. Vijf schoten op balen, tonnen en de stroman.', rows: [] } }, carbid);
  const kermis = acts.filter((a) => a.layer === 'kermis');
  const kr = getChallengeRecord('botsauto');
  add({ key: 'mg:botsauto', playId: 'kermis', icon: 'act-kermis', title: "Botsauto's", meta: 'Grote Markt · €3 · kermis 19:00–01:00',
    medal: kr ? kr.medal : 0, record: kr && kr.best != null ? `Record ${kr.best} punten` : 'Nog niet gespeeld',
    detail: { kicker: 'Minigame · Grote Markt', text: 'Botsen tegen vijf rijders, Tammo of Tessa incluis. Van opzij en van achteren telt het dubbel.', rows: [] } }, kermis);
  const drift = acts.filter((a) => a.layer === 'drift');
  const dz = DRIFT_ZONE.bestOverall();
  add({ key: 'mg:drift', playId: 'drift', icon: 'act-drift', title: 'Driftzones', meta: `${drift.length} rotondes · handrem en gas`,
    medal: dz.medal, record: dz.best != null ? `Record ${dz.best} punten` : 'Nog niet gedrift',
    detail: { kicker: 'Minigame · rotondes in de stad', text: 'Rijd een driftzone in, trek aan de handrem in de bocht en blijf glijden met gas erop. Reeksen en wisselbochten tellen mee; een klap kost je de punten.', rows: [['Zones', drift.map((d) => d.name).join(', ')]],
      medals: DRIFT_MEDAL_AT.map((p, i) => [i + 1, `${p.toLocaleString('nl-NL')} punten`]) } }, drift);
  const mg = (layer, key, playId, title, meta, recId, fmt, kicker, text, medals) => {
    const list = acts.filter((a) => a.layer === layer);
    const r = getChallengeRecord(recId);
    add({ key, playId, icon: 'act-' + layer, title, meta, medal: r ? r.medal : 0, record: r && r.best != null ? fmt(r.best) : 'Nog niet gespeeld',
      detail: { kicker, text, rows: [], ...(medals ? { medals } : {}) } }, list);
  };
  const rel = (v) => (v === 0 ? 'E' : v > 0 ? `+${v}` : String(v));
  mg('discgolf', 'mg:discgolf', 'discgolf', 'Discgolf', 'Stadspark · negen banen · gratis', 'discgolf', (v) => `Record ${rel(v)} t.o.v. par`, 'Minigame · Stadspark',
    'Negen manden in het Stadspark. Richt, kies hyzer of anhyzer, houd Spatie voor kracht en let op de wind. Water kost een worp.', [[1, '6 boven par'], [2, '1 boven par'], [3, '2 onder par']]);
  mg('pitchputt', 'mg:pitchputt', 'pitchputt', 'Pitch & putt', 'op de echte golfbanen · zes banen · gratis', 'pitchputt', (v) => `Record ${rel(v)} t.o.v. par`, 'Minigame · golfbaan',
    'Zes korte banen: pitchen naar de green en putten. Lees de pijltjes op de green, de bal loopt naar beneden.', [[1, '7 boven par'], [2, '3 boven par'], [3, 'op par of beter']]);
  mg('skatepark', 'mg:skatepark', 'skatepark', 'Skatepark', 'Stadspark · 90 seconden · gratis', 'skatepark', (v) => `Record ${Math.round(v).toLocaleString('nl-NL')} punten`, 'Minigame · Stadspark',
    'Hellingen, een kist en leuningen. Ollie, kickflip, heelflip, spins en grinds; elk nieuw kunstje in de keten telt zwaarder, een val kost je de keten.', [[1, '1.200 punten'], [2, '3.200 punten'], [3, '6.500 punten']]);
  mg('kartbaan', 'mg:kartbaan', 'kartbaan', 'Karten bij Kardinge', 'Kardinge · drie ronden · gratis', 'kart-race', (v) => `Record ${formatMissionTime(v)}`, 'Minigame · Kardinge',
    'Drie ronden tegen drie rijders. Gas, rem en handrem: een lange drift geeft een versnelling. Eerste is goud, tweede zilver, derde brons.', [[1, 'derde'], [2, 'tweede'], [3, 'eerste']]);
  mg('ringrace', 'mg:ringrace', 'ringrace', 'Ringrace', 'ringweg · één rondje · gratis', 'ringrace', (v) => `Record ${formatMissionTime(v)}`, 'Minigame · de ringweg',
    'Eén rondje over de ringweg van 17,5 km tegen vier tegenstanders, met de eerlijke racewagen van de baan. Winnen is goud, tweede zilver, derde brons. Met medespelers rijd je tegen elkaar.', [[1, 'derde'], [2, 'tweede'], [3, 'eerste']]);
  mg('zwembad', 'mg:zwembad', 'zwembad', 'Zwembad Het Natte Papier', 'Papiermolenlaan · 100 meter · gratis', 'zwembad', (v) => `Record ${formatMissionTime(v)}`, 'Minigame · Papiermolenlaan',
    'Vier banen van vijfentwintig meter. Duik vanaf het blok en zwem met A en D om en om in een rustig ritme; een keerpunt vlak voor de muur met Spatie is sneller.', [[1, 'binnen 1:40'], [2, 'binnen 1:16'], [3, 'binnen 1:04']]);
  mg('klimtoren', 'mg:klimtoren', 'klimtoren', 'Klimtoren Zernike', 'Zernike · twaalf meter · gratis', 'klimtoren', (v) => `Record ${formatMissionTime(v)}`, 'Minigame · Zernike',
    'Houd A en D vast voor je handen, laat steeds één hand los om hem hoger te zetten. Rust op de grote grepen, anders geven je armen het op.', [[1, 'binnen 1:20'], [2, 'binnen 0:48'], [3, 'binnen 0:30']]);
  mg('waterski', 'mg:waterski', 'waterski', 'Waterskiën bij het Grunopark', 'Grunopark · achter de boot · gratis', 'waterski', (v) => `Record ${Math.round(v).toLocaleString('nl-NL')} punten`, 'Minigame · Grunopark',
    'Achter de boot over het meer: zwaai om de boeien, spring over de golven en sla een salto of grab voor extra punten. Drie valpogingen.', [[1, '650 punten'], [2, '1.300 punten'], [3, '2.200 punten']]);
  {
    const lessen = LES_IDS.map((id) => getChallengeRecord('vlieg-' + id));
    const gehaald = lessen.filter((r) => r && r.medal > 0).length, goud = lessen.filter((r) => r && r.medal === 3).length;
    add({ key: 'mg:vliegschool', playId: 'vliegschool', icon: 'act-vliegschool', title: 'Vliegschool De Windwijzer', meta: 'Eelde · twintig lessen · gratis',
      medal: goud === LES_IDS.length ? 3 : gehaald === LES_IDS.length ? 2 : gehaald > 0 ? 1 : 0, record: gehaald ? `${gehaald} van ${LES_IDS.length} lessen gehaald${goud ? ` · ${goud}× goud` : ''}` : 'Nog niet gevlogen',
      detail: { kicker: 'Minigame · het vliegveld bij Eelde', text: 'Zes lessen met het vliegtuig en zeven met de helikopter: ringen, landen op een markering, laag over water, een slalom langs de molens, een noodlanding, tussen hoge gebouwen door en hoveren. Per les een medaille en een beloning.', rows: [],
        medals: [[1, 'één les gehaald'], [2, 'alle lessen gehaald'], [3, 'overal goud']] } }, acts.filter((a) => a.layer === 'vliegschool'));
  }
  const heli = getHeliSpotsForRender();
  const best = getStat('heliBest');
  const hr = getChallengeRecord('ballonjacht');
  const heliMedal = Math.max(hr ? hr.medal : 0, isUnlocked('ballonjacht_goud') ? 3 : 0,
    best >= HELI_MEDAL_SCORES[2] ? 2 : 0, isUnlocked('ballonjacht') ? 1 : 0);
  add({ key: 'mg:heli', playId: 'heli', icon: 'heli', title: 'Ballonjacht', meta: 'Traumaheli op het UMCG',
    medal: heliMedal, record: best ? `Topscore ${best.toLocaleString('nl-NL')}` : 'Nog niet gespeeld',
    detail: { kicker: 'Minigame · UMCG', text: 'Met de traumaheli door de ringen, tegen de wind in, en dan stil hangen naast een ballon.', rows: [],
      medals: [[1, 'Haal de ballon in'], [2, `${HELI_MEDAL_SCORES[2].toLocaleString('nl-NL')} punten`], [3, `${HELI_MEDAL_SCORES[3].toLocaleString('nl-NL')} punten`]] } }, heli);
  const pigeon = getPigeonSpotsForRender();
  const pb = getPigeonSaveData().best;
  add({ key: 'mg:duif', playId: 'duif', icon: 'pigeon', title: 'Duivenmodus', meta: `${pigeon.length} duivenplekken · alleen Tammo`,
    medal: null, record: pb ? `Beste vlucht ${pb} poepjes` : 'Nog niet gevlogen',
    detail: { kicker: 'Minigame · Tammo de duivenfluisteraar', text: 'Fluit, doe je ogen dicht en vlieg als duif over Grunn. Poep op wat beweegt.', rows: [] } }, pigeon);
  return out;
}

function jobItems() {
  const best = new Map(getSideJobList().map((j) => [j.id, j]));
  return getSideJobOffers(worldRef).map((o) => {
    const j = best.get(o.id) || {};
    return {
      key: 'job:' + o.id, group: 'bijbaantjes', icon: 'sj-' + o.id, title: o.name, status: o.active ? 'nu' : '',
      meta: `Niveau ${o.level} · ${o.title} · ${euro(o.pay[0])}–${euro(o.pay[1])} per ronde`, medal: null,
      record: j.bestStreak ? `Record ${j.bestStreak} op rij` : j.rounds ? `${j.rounds} rondes gedaan` : 'Nog niet gedaan',
      x: o.x, y: o.y, goal: { kind: 'job', id: o.id, name: o.name, sub: 'Bijbaantje', x: o.x, y: o.y }, stopJob: !!o.active,
      detail: { kicker: 'Bijbaantje', text: o.blurb, rows: [['Niveau', `${o.level} · ${o.title}`], ['Verdienen', `${euro(o.pay[0])}–${euro(o.pay[1])} per ronde`], ...(o.blocked ? [['Nu', o.blocked]] : [])] },
    };
  });
}

function ommelandItems(world) {
  const total = Object.keys(VILLAGES).length;
  const done = uniqueCount(SET_DONE), eggs = uniqueCount(SET_EGGS);
  const city = getStationsForRender().filter((s) => !VILLAGES[s.name]);
  const st = city.length ? nearest(city, world.player) : null;
  const names = Object.keys(VILLAGES);
  const ends = uniqueCount('wereldeinden');
  return [
    { key: 'om:dorp', group: 'ommeland', icon: 'station', title: 'Dorpsuitjes', status: done >= total ? 'klaar' : '',
      meta: `${names.slice(0, 3).join(', ')} en ${total - 3} andere dorpen · met de trein`, medal: null,
      record: `${done} van ${total} gedaan · ${eggs} van ${total} eierballen`, x: st ? st.x : undefined, y: st ? st.y : undefined,
      goal: st ? { kind: 'place', name: st.name, sub: 'Met de trein naar de dorpen', x: st.x, y: st.y } : null,
      detail: { kicker: 'Ommeland · met de trein', text: 'In elk dorp is iets te doen, valt er wat te eten en ligt er een eierbal verstopt. Neem de trein vanaf het station.', rows: [['Dorpen', names.join(', ')]] } },
    { key: 'om:einde', group: 'ommeland', icon: 'landmark', title: 'Einde van de wereld', status: ends >= WORLD_ENDS ? 'klaar' : '',
      meta: 'Waar het Ommeland ophoudt · zoek ze zelf', medal: null, record: `${ends} van ${WORLD_ENDS} gevonden`, goal: null,
      detail: { kicker: 'Ommeland · verkennen', text: 'Ergens houden de wegen van het Ommeland op. Waar, dat zeggen we niet.', rows: [] } },
  ];
}

function collectItems() {
  const eggs = getSaveSet('eierballen').size, secrets = getSaveSet('geheimen').size;
  return [
    { key: 'col:eieren', group: 'verzamelen', icon: 'eierbalTip', title: 'Eierballen zoeken', status: eggs >= EIERBAL_TOTAL ? 'klaar' : '',
      meta: 'Verstopt bij de bezienswaardigheden', medal: null, record: `${eggs} van ${EIERBAL_TOTAL} gevonden`, goal: null,
      detail: { kicker: 'Verzamelen', text: 'Overal in Grunn ligt een eierbal verstopt. Een tip nodig? De wandkaart thuis weet er een paar.', rows: [] } },
    { key: 'col:geheim', group: 'verzamelen', icon: 'landmark', title: 'Geheimpjes', status: secrets >= SECRETS_TOTAL ? 'klaar' : '',
      meta: 'Ergens in Grunn · we verklappen niks', medal: null, record: `${secrets} van ${SECRETS_TOTAL} gevonden`, goal: null,
      detail: { kicker: 'Verzamelen', text: 'Kleine dingen die je alleen vindt als je goed kijkt. Of als je op de verkeerde plek staat op het verkeerde moment.', rows: [] } },
  ];
}

// The Fjord Frituur upgrades (pg_foodtruck.js), bought from Te doen.
function fjordUpgradeItems(world) {
  const pa = world.postgameActions;
  if (!isPostgameOpen() || !pa || !pa.upgrades) return [];
  const fj = CHALLENGES.find((d) => d.id === 'fjord');
  return pa.upgrades().map((u) => ({
    key: 'fu:' + u.id, group: 'nahetverhaal', icon: 'pg-' + (fj ? fj.icon : 'fjord'), title: `Fjord Frituur: ${u.name}`, status: u.owned ? 'klaar' : '',
    meta: u.blurb, medal: null, record: u.owned ? 'Gekocht' : euro(u.price), goal: null, upgrade: u.id,
    detail: { kicker: 'Fjord Frituur · opknappen', text: u.blurb, rows: [['Prijs', euro(u.price)]] },
  }));
}

// Buys upgrade `id`; returns the message for the player.
export function buyFjordUpgrade(world, id) {
  const pa = world.postgameActions;
  const u = pa && pa.upgrades ? pa.upgrades().find((x) => x.id === id) : null;
  return u ? u.buy() : 'Niet te koop';
}

function postgameItems(world) {
  const open = isPostgameOpen();
  const offers = open && world.postgameActions ? world.postgameActions.offers() : [];
  return [...CHALLENGES.map((d) => {
    const o = offers.find((q) => q.id === d.id);
    const rec = getChallengeRecord(d.id);
    return {
      key: 'pg:' + d.id, group: 'nahetverhaal', icon: 'pg-' + d.icon, title: d.name, status: open ? '' : 'slot',
      meta: open ? d.blurb : 'Na het verhaal', medal: open ? (rec ? rec.medal : 0) : null,
      record: open && rec && rec.best != null ? `Record ${rec.best}` : '', x: o ? o.x : undefined, y: o ? o.y : undefined,
      goal: o ? { kind: 'challenge', id: d.id, name: d.name, sub: o.where, x: o.x, y: o.y } : null,
      detail: { kicker: open ? 'Na het verhaal · Jelle wil revanche' : 'Op slot', text: open ? d.blurb : 'Gaat open als het verhaal uit is.', rows: o ? [['Waar', o.where]] : [] },
    };
  }), ...fjordUpgradeItems(world)];
}

// The current story step when it is an activity (a mission step is in the missions).
function storyStepItem(world) {
  const g = world.storyGuide;
  const step = g && STEP_BY_ID.get(g.step);
  if (!step || step.kind !== 'activity') return null;
  return {
    key: 'st:' + step.id, group: 'verhaal', icon: 'missionIdle', title: step.title, meta: 'Verhaal · nu', status: 'nu',
    medal: null, record: '', x: g.x, y: g.y, goal: 'story',
    detail: { kicker: 'Verhaal · nu', text: step.lead ? step.lead[1] : '', rows: [] },
  };
}

let worldRef = null;

export function getTodoItems(world) {
  worldRef = world;
  const p = world.player;
  const items = [...missionItems(world), ...minigameItems(world), ...jobItems(), ...ommelandItems(world), ...collectItems(), ...postgameItems(world)];
  const st = storyStepItem(world);
  if (st) items.unshift(st);
  const goal = getGoal();
  for (const it of items) {
    it.dist = Number.isFinite(it.x) ? Math.hypot(it.x - p.x, it.y - p.y) : null;
    it.isGoal = !!(goal && it.goal && typeof it.goal === 'object' && goal.kind === it.goal.kind && goal.id === it.goal.id && (goal.kind !== 'place' || goal.name === it.goal.name));
  }
  return items;
}

// --- choosing --------------------------------------------------------------------------

// Makes an item the goal; `after` runs once it is set (not when the player
// backs out of the play-ahead question). Returns false when nothing happened.
export function chooseTodo(world, it, after = null) {
  if (!it || !it.goal) return false;
  if (it.goal === 'story') {
    clearGoal({ quiet: true });
    world.addMessage(`Route naar het verhaal: ${it.code ? it.code + ' · ' : ''}${it.title}`, 3, { kind: 'missie', key: 'goal' });
    if (after) after();
    return true;
  }
  if (it.goal.kind === 'mission') return playMission(world, it.goal.id, after);
  setGoal(it.goal);
  if (after) after();
  return true;
}

// Picks mission i (menu, phone): the current story mission is just the story,
// a later story mission asks first, a passed one is a klus.
export function playMission(world, i, after = null) {
  const list = getMissionList();
  const m = list[i];
  if (!m) return false;
  // Samen spelen: een gast start de opdracht niet op zijn eigen scherm (dat is een dunne client); hij vraagt
  // hem bij het startpunt met E (#452). Zo begint de telefoon of het menu geen opdracht die de wereld niet kent.
  if (!missieMagVanuitMenu(world)) {
    world.addMessage(MISSIE_VIA_STARTPUNT, 4);
    return false;
  }
  if (isMissionActive()) {
    world.addMessage(activeMissionIndex() === i ? 'Deze missie loopt al' : 'Maak eerst je huidige missie af', 3);
    return false;
  }
  const sw = samenWaarschuwing(world, 'missie', null, m.samen); // samen spelen: een route naar een opdracht die nog niet (helemaal) samen werkt meldt dat; de route wordt wel gezet
  if (sw) world.addMessage(sw.tekst, 3);
  const cur = getStorySteps().find((s) => s.current && s.mission === i);
  if (cur) {
    clearGoal({ quiet: true });
    world.addMessage(`Route naar ${m.code || m.label}`, 3, { kind: 'missie', key: 'goal' });
    if (after) after();
    return true;
  }
  const go = () => {
    trackMission(world, i);
    world.addMessage(m.done ? `Klus: ${m.label} (${'€' + klusloon(m.reward)})` : `Doel: ${m.code ? m.code + ' · ' : ''}${m.label}`, 3, { kind: 'missie', key: 'goal' });
    if (after) after();
  };
  const ahead = storyMissionAhead(i);
  if (ahead) confirmPlayAhead(world, ahead, go);
  else go();
  return true;
}

// --- "H9 nu al spelen?" ------------------------------------------------------------------

let dlg = null;

export function isPlayAheadOpen() {
  return !!(dlg && !dlg.el.hidden);
}

function buildDialog() {
  const el = document.createElement('div');
  el.id = 'gde-ahead';
  el.hidden = true;
  el.innerHTML = `<div class="ga-box" role="dialog" aria-modal="true" aria-labelledby="ga-title">
    <b id="ga-title"></b><p class="ga-text"></p><p class="ga-now"></p>
    <div class="ga-btns"><button type="button" class="ga-primary" data-ga="back">Terug naar het verhaal</button><button type="button" class="ga-secondary" data-ga="go"></button></div></div>`;
  document.body.appendChild(el);
  const d = { el, onGo: null, world: null };
  el.addEventListener('mousedown', (e) => e.stopPropagation());
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ga]');
    if (b) closeDialog(b.dataset.ga === 'go');
  });
  window.addEventListener('keydown', (e) => {
    if (el.hidden) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    const btns = [...el.querySelectorAll('button')];
    const i = btns.indexOf(document.activeElement);
    if (e.key === 'Escape' || e.key === 'Backspace') closeDialog(false);
    else if (e.key === 'Enter' || e.key === ' ') closeDialog(i === 1);
    else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) btns[i === 0 ? 1 : 0].focus();
  }, true);
  return d;
}

function closeDialog(go) {
  const d = dlg;
  d.el.hidden = true;
  if (d.world) {
    d.world.uiPaused = false;
    zachtePauze(d.world, 'afspeelvooruit', false);
    if (d.world.input) d.world.input.reset();
  }
  if (d.prevFocus && d.prevFocus.isConnected) d.prevFocus.focus({ preventScroll: true });
  const fn = d.onGo;
  d.onGo = null;
  if (go && fn) fn();
}

function confirmPlayAhead(world, ahead, onGo) {
  if (!dlg) dlg = buildDialog();
  const el = dlg.el;
  el.querySelector('#ga-title').textContent = `${ahead.code} nu al spelen?`;
  el.querySelector('.ga-text').textContent = `${ahead.title} ligt verder in het verhaal. Speel je hem nu, dan loopt het verhaal door elkaar: je krijgt dingen te horen die nog niet gebeurd zijn.`;
  el.querySelector('.ga-now').textContent = `Je verhaal staat op ${ahead.now.code ? ahead.now.code + ' · ' : ''}${ahead.now.title}.`;
  el.querySelector('[data-ga="go"]').textContent = `Toch ${ahead.code} spelen`;
  dlg.onGo = onGo;
  dlg.world = world;
  dlg.prevFocus = document.activeElement;
  world.uiPaused = true;
  zachtePauze(world, 'afspeelvooruit', true); // met meer spelers loopt de wereld door (#452)
  if (document.pointerLockElement) document.exitPointerLock();
  el.hidden = false;
  el.querySelector('[data-ga="back"]').focus({ preventScroll: true });
}
