// De voetbalwedstrijd in de Euroborg (#981, Voetbal Sim Light): puur, zonder DOM en zonder THREE (scripts/voetbal_test.mjs, scripts/voetbal_botsim.mjs).
// Vijf tegen vijf op een klein veld, twee helften, aftrap, uitbal (inworp, hoekschop, doelschop: simpel, met een korte pauze), een doelpunt met een viering en een
// slow-motionflits, en een simpele overtreding (omver lopen of een tackle van achteren geeft de ander een vrije bal; geen kaarten, geen buitenspel).
// Samen spelen (#443): 1 tot 4 mensen spelen in team 0 tegen de computer; als derby (#1114) kiest elke mens een team (`team` 0 of 1 in deeln, hooguit vier per team) en spelen vrienden tegen elkaar. Host-autoritair: wie het spel opende rekent de bal en alle spelers uit met de invoer van elke speler
// (stick en knoppen, dezelfde bytes als bij een voertuig); twaalf keer per seconde gaat een compacte momentopname naar de gasten (snapVoetbal), die hem vloeiend tekenen
// (makeFootballMirror). Wie wegvalt wordt door de computer vervangen en krijgt niets; de rest speelt door. Geen nieuw netwerkprotocol: dit is de bestaande live-wedstrijd (soort 'live').
import { makeRng } from './minigamekit.js';
import {
  PITCH, LOOP, HELFTEN, KNOP, LAAD_S, TEAMS, opponent, FORMATEN, zetFormaat, cleanFormaat, formationList, formationNames, cleanFormation, cleanStijl, duurVan, NAMES_HOME, NAMEN_UIT, aiLevel, mateLevel, invoerNaarActie, voetbalMedaille, uitkomstVan,
  voetbalBeloning, scoreTekst, richtingVan, ownGoalY, opponentGoalY, formationSpot, inStrafschop, kl,
} from './voetbalrules.js';
import { makeBall, stepBall, zetBal, ballSpeed } from './voetbalbal.js';
import { aiIntentie, besteOntvanger, NIETS } from './voetbalai.js';
import { NEUTRALE_BONUS } from './voetbalkarakter.js';
import { setupExtraRules, judgeFoul, pasBeoordelingToe, blessureWissels, rustWissels, offsideAtKick, penaltySpot, noteer } from './voetbalextrarules.js';

export const FASEN = ['intro', 'aftrap', 'spel', 'hervat', 'goal', 'rust', 'eind', 'klaar'];
export const HERVAT_KINDEN = ['aftrap', 'inworp', 'hoek', 'doelschop', 'vrij', 'strafschop'];   // nieuwe soorten komen achteraan: de index zit in de momentopname
export const SNAPSHOT_HZ = 12;
export const MAX_FOOTBALL_PLAYERS = 4;
const INTRO_S = 3.2, GOAL_S = 3.2, SLOMO_S = 1.1, SLOMO = 0.35, RUST_S = 3.4, EIND_S = 4.5, HERVAT_PAUZE = 1.1, AFTRAP_PAUZE = 0.9, HERVAT_MAX = 3.6;
const G = 9.8;
const fin = (x) => Number.isFinite(x);
const q2 = (x, d = 2) => { const m = 10 ** d; return Math.round((Number(x) || 0) * m) / m; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const hoek = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
const NEUTRAAL = Object.freeze({ mx: 0, my: 0, buttons: 0 });
// De volgorde waarin de mensen een speler krijgen: aanvallers eerst, dan verdedigers; de keeper blijft computer tot een mens hem kiest.
// Voor elke vorming: eerst de aanvallers, dan de middenvelders, dan de verdedigers (bij vijf tegen vijf: 3, 4, 1, 2).
const ROL_VOORKEUR = { aanvaller: 0, middenvelder: 1, verdediger: 2 };
const controlOrder = (lijst) => lijst.map((x, i) => ({ i, r: x.rol })).filter((x) => x.r !== 'keeper').sort((a, b) => ROL_VOORKEUR[a.r] - ROL_VOORKEUR[b.r] || a.i - b.i).map((x) => x.i);

// De factoren van een speler uit de carrière (voetbalplayers.js simFactors): geklemd op 0,6 tot 1,3; ontbrekende waarden zijn neutraal.
const NEUTRAAL_FAC = Object.freeze({ sprint: 1, schot: 1, aanname: 1, verd: 1, uit: 1 });
const ratingFac = (f) => { const o = {}; for (const k of ['sprint', 'schot', 'aanname', 'verd', 'uit']) o[k] = Number.isFinite(f[k]) ? Math.min(1.3, Math.max(0.6, f[k])) : 1; return o; };
function makePlayer(team, i, name, level, rol, perTeam) {
  const dir = richtingVan(team);
  return {
    id: team * perTeam + i, team, i, rol, naam: name, x: 0, y: 0, vx: 0, vy: 0, face: dir > 0 ? Math.PI / 2 : -Math.PI / 2, speed: 0, stamina: 1, moe: false,
    cool: 0, stun: 0, tackleT: 0, tackleCd: 0, tackleGedaan: true, duikT: 0, duikDx: 0, vier: 0, besluitT: 0.3 + 0.1 * i, balT: 0, houdT: 0, slot: null, laatsteMens: null,
    voorspel: null, voorspelT: 0, spreiding: level.spreiding,
  };
}

// ratings: [[per plek van team 0], [idem team 1]] met { naam?, f: { sprint, schot, aanname, verd, uit } } (carrière, voetbalplayers.js simFactors); teams: [team0, team1] overschrijft de zes vaste clubs (voetbalclubs.js teamFor).
// deeln: [{ slot, naam, char, bonus? }] (bonus: { sprint, schot, aanname } van het personage, voetbalkarakter.js; de mensen, de host eerst), opties: { duur 'kort' | 'normaal', stand (moeilijkheid), seed, tegenstander (0..3), aiBeide (voor de botsim: beide teams als tegenstander) }.
export function makeMatch(deeln = [], { duur = 'normaal', stand: level = 'standaard', seed = 1, tegenstander: tg = 0, aiBeide = false, formaat = 'klein', vorming = null, stijl = 'evenwichtig', vormingTegen = null, stijlTegen = 'evenwichtig', teams: teamsOpt = null, ratings = null, regels = null, timings: timingsOpt = null } = {}) {
  const timings = { intro: INTRO_S, rust: RUST_S, eind: EIND_S, ...(timingsOpt || null) };   // de presentatie (opstelling, rustpauze, samenvatting) vraagt langere pauzes dan de pure sim
  formaat = zetFormaat(formaat);
  const perTeam = FORMATEN[formaat].n;
  const rng = makeRng(seed);
  const namenV = formationNames(formaat);
  const vT = cleanFormation(formaat, vorming), vU = cleanFormation(formaat, vormingTegen || namenV[seed % namenV.length]);
  const tac = [{ vorming: vT, stijl: cleanStijl(stijl), lijst: formationList(formaat, vT) }, { vorming: vU, stijl: cleanStijl(stijlTegen), lijst: formationList(formaat, vU) }];
  const order = [controlOrder(tac[0].lijst), controlOrder(tac[1].lijst)];
  const humanTeam = (d) => (d && d.team === 1 ? 1 : 0);   // derby (#1114): een mens kan in team 1 spelen, tegen zijn vrienden
  const hasHuman = [0, 1].map((t) => (deeln || []).slice(0, MAX_FOOTBALL_PLAYERS).some((d) => humanTeam(d) === t));
  const ai = [aiBeide || (!hasHuman[0] && hasHuman[1]) ? aiLevel(level) : mateLevel(level), hasHuman[1] ? mateLevel(level) : aiLevel(level)];
  const teams = teamsOpt && teamsOpt[0] && teamsOpt[1] ? [teamsOpt[0], teamsOpt[1]] : [TEAMS[0], opponent(tg)];
  const players = [];
  for (let t = 0; t < 2; t++) for (let i = 0; i < perTeam; i++) {
    const rt = ratings && ratings[t] && ratings[t][i];
    const pl = makePlayer(t, i, (rt && rt.naam) || (t === 0 ? NAMES_HOME : NAMEN_UIT)[i], ai[t], tac[t].lijst[i].rol, perTeam);
    if (rt && rt.f) pl.fac = ratingFac(rt.f); // ratings per speler (carrière, #1107): zonder blijft alles neutraal en de sim gelijk
    players.push(pl);
  }
  const nTeam = [0, 0];
  const humans = (deeln || []).slice(0, MAX_FOOTBALL_PLAYERS).map((d) => {
    const team = humanTeam(d), k = nTeam[team]++;
    return { team, k };
  }).map(({ team, k }, j) => { const d = deeln[j]; return {
    slot: d.slot, naam: d.naam || 'Speler', char: d.char || null, team, ctl: team * perTeam + (order[team][k] != null ? order[team][k] : order[team][order[team].length - 1]), weg: false, laad: { schot: 0, lang: 0 }, vorig: 0, vorigW: 0, wisselCd: 0, autoT: 0, doelpunten: 0, schoten: 0, assist: 0, inv: NEUTRAAL, bonus: { ...NEUTRAAL_FAC, ...NEUTRALE_BONUS, ...(d.bonus || null) },
  }; });
  for (const mm of humans) { players[mm.ctl].slot = mm.slot; players[mm.ctl].laatsteMens = mm.slot; }
  const duurHelft = duurVan(formaat, duur);
  const m = {
    fase: 'intro', faseT: timings.intro, helft: 1, klok: duurHelft, duurHelft, duurNaam: duur === 'kort' ? 'kort' : 'normaal', formaat, perTeam, tac, stand: level, seed, teams, ai, rng, spelers: players, bal: makeBall(0, 0), mensen: humans,
    timings, score: [0, 0], hervat: null, flash: null, flits: 0, ev: [], tijd: 0, n: 0, foulCd: 0, wisselRustTeam: 0, aftrapTeam: 0,
    stat: { schoten: [0, 0], overtredingen: [0, 0], bezit: [0, 0], uit: 0, doelpuntenVan: {} }, winnaar: null, spiegel: false, alleenAi: humans.length === 0,
  };
  m.bal.owner = -1;
  setupExtraRules(m, regels);
  zetOpstelling(m, 0, true);
  return m;
}

// ---------------------------------------------------------------- opstelling en herstart

function zetOpstelling(m, aftrapTeam, intro = false) {
  for (const p of m.spelers) {
    if (p.rood) continue;
    const spot = formationSpot(p.team, p.i, { x: 0, y: 0 }, p.team === aftrapTeam, true, m.tac[p.team]);
    p.x = spot.x; p.y = spot.y; p.vx = p.vy = 0; p.speed = 0; p.face = richtingVan(p.team) > 0 ? Math.PI / 2 : -Math.PI / 2;
    p.cool = 0; p.stun = 0; p.tackleT = 0; p.duikT = 0; p.vier = 0; p.balT = 0; p.houdT = 0;
  }
  zetBal(m.bal, 0, 0);
  m.bal.owner = -1; m.bal.laatsteTeam = -1; m.bal.laatsteSpeler = -1;
  if (!intro) {
    const taker = m.spelers.find((p) => p.team === aftrapTeam && p.rol === 'aanvaller' && !p.rood) || m.spelers.find((p) => p.team === aftrapTeam && p.rol !== 'keeper' && !p.rood);
    taker.x = 0; taker.y = -richtingVan(aftrapTeam) * 0.5 * 0; taker.face = richtingVan(aftrapTeam) > 0 ? Math.PI / 2 : -Math.PI / 2;
    m.bal.owner = taker.id; taker.balT = 0;
    m.hervat = { kind: 'aftrap', team: aftrapTeam, taker: taker.id, t: 0, pauze: AFTRAP_PAUZE };
    m.fase = 'aftrap';
  }
}

// Tactiek tijdens de wedstrijd: een andere vorming (de rollen van de spelers volgen) of speelstijl voor een team.
export function zetTactiek(m, team, { vorming = null, stijl = null } = {}) {
  const t = m.tac[team];
  if (vorming) { t.vorming = cleanFormation(m.formaat, vorming); t.lijst = formationList(m.formaat, t.vorming); for (const p of m.spelers) if (p.team === team) p.rol = t.lijst[p.i].rol; }
  if (stijl) t.stijl = cleanStijl(stijl);
  return t;
}

export function setupKickoff(m, team) {
  m.aftrapTeam = team;
  zetOpstelling(m, team, false);
  m.flash = { tekst: `Aftrap: ${m.teams[team].kort}`, t: 1.6 };
  m.ev.push({ type: 'aftrap', team });
}

const HERVAT_TEKST = { inworp: 'Inworp', hoek: 'Hoekschop', doelschop: 'Doelschop', vrij: 'Vrije bal', strafschop: 'Strafschop' };
// Een herstart op (x, y) voor team: de dichtstbijzijnde speler (bij een doelschop de keeper) neemt hem, tegenstanders gaan er een stukje vanaf.
export function setupResume(m, kind, team, x, y, takerId = null) {
  if (kind === 'strafschop') { const sp = penaltySpot(1 - team); x = sp.x; y = sp.y; }
  x = kl(x, -(PITCH.B / 2) + 0.4, (PITCH.B / 2) - 0.4); y = kl(y, -(PITCH.L / 2) + 0.4, (PITCH.L / 2) - 0.4);
  let taker = takerId != null ? m.spelers[takerId] : null;
  if (!taker) {
    const eigen = m.spelers.filter((p) => p.team === team && !p.rood);
    if (kind === 'doelschop') taker = eigen.find((p) => p.rol === 'keeper');
    else {
      let bd = Infinity;
      for (const p of eigen) { if (p.rol === 'keeper') continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; taker = p; } }
    }
  }
  taker.x = x; taker.y = y; taker.vx = taker.vy = 0; taker.speed = 0; taker.tackleT = 0; taker.stun = 0; taker.cool = 0; taker.balT = 0; taker.houdT = 0;
  taker.face = richtingVan(team) > 0 ? Math.PI / 2 : -Math.PI / 2;
  zetBal(m.bal, x, y);
  m.bal.owner = taker.id; m.bal.laatsteTeam = team; m.bal.laatsteSpeler = taker.id;
  if (kind === 'strafschop') strafschopOpstelling(m, team, taker);
  for (const o of m.spelers) { // tegenstanders op een meter of drie
    if (o.team === team || kind === 'strafschop' || o.rood) continue;
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < 3 && d > 1e-6) { o.x = kl(x + (o.x - x) / d * 3, -(PITCH.B / 2) + 0.3, (PITCH.B / 2) - 0.3); o.y = kl(y + (o.y - y) / d * 3, -(PITCH.L / 2) + 0.3, (PITCH.L / 2) - 0.3); }
  }
  m.hervat = { kind, team, taker: taker.id, t: 0, pauze: kind === 'strafschop' ? 1.8 : HERVAT_PAUZE };
  m.fase = 'hervat';
  m.bal.bs = -1;
  m.flash = { tekst: `${HERVAT_TEKST[kind]} voor ${m.teams[team].kort}`, t: 1.8 };
  const sleutel = { hoek: 'hoeken', inworp: 'ingooien', doelschop: 'doelschoppen', vrij: 'vrijeTrappen', strafschop: 'strafschoppen' }[kind];
  if (sleutel && m.stat[sleutel]) m.stat[sleutel][team]++;
  m.ev.push({ type: 'hervat', kind, team, x, y });
  for (const e of blessureWissels(m)) m.ev.push(e);    // een gekwetste speler gaat er bij een dode bal uit
}
// Bij een strafschop staat alleen de nemer bij de stip en de keeper op zijn lijn; de rest wacht buiten het strafschopgebied.
function strafschopOpstelling(m, team, taker) {
  const vt = 1 - team, d = richtingVan(vt), gy = ownGoalY(vt), buiten = gy + d * (PITCH.STRAF_D + 2.2);
  let k = 0;
  for (const o of m.spelers) {
    if (o === taker || o.rood) continue;
    if (o.team === vt && o.rol === 'keeper') { o.x = 0; o.y = gy + d * 0.7; o.vx = o.vy = 0; continue; }
    const binnen = Math.abs(o.x) < PITCH.STRAF_B / 2 + 1.2 && (o.y - gy) * d < PITCH.STRAF_D + 1.2 && (o.y - gy) * d > -1;
    if (binnen) { o.y = buiten + d * 0.3 * (k % 3); o.x = ((k % 7) - 3) * (PITCH.STRAF_B / 9); k++; o.vx = o.vy = 0; }
  }
}

// Waar de bal uit ging en wie hem herstart (puur, voor de test): zijlijn = inworp voor de ander; achterlijn = hoekschop voor de aanvaller of doelschop voor de verdediger.
export function uitbalHervat(uit, laatsteTeam) {
  if (uit.kind === 'zij') return { kind: 'inworp', team: laatsteTeam === 0 ? 1 : 0, x: Math.sign(uit.x || 1) * ((PITCH.B / 2) - 0.4), y: kl(uit.y, -(PITCH.L / 2) + 2, (PITCH.L / 2) - 2) };
  const eind = uit.y < 0 ? -1 : 1, verdediger = eind < 0 ? 0 : 1;
  if (laatsteTeam === verdediger) return { kind: 'hoek', team: 1 - verdediger, x: Math.sign(uit.x || 1) * ((PITCH.B / 2) - 0.5), y: eind * ((PITCH.L / 2) - 0.5) };
  return { kind: 'doelschop', team: verdediger, x: 0, y: eind * ((PITCH.L / 2) - 3.2) };
}

// ---------------------------------------------------------------- de mensen: wie bestuurt wie

const NABIJ_KEEPER = 9;
function beschikbaar(m, genomen, human) {
  const bal = m.bal, uit = [];
  for (const p of m.spelers) {
    if (p.team !== human.team || genomen.has(p.id) || p.rood) continue;
    if (p.rol === 'keeper' && Math.hypot(bal.x - p.x, bal.y - p.y) > NABIJ_KEEPER) continue;
    uit.push(p);
  }
  return uit;
}
const naBal = (m, p) => Math.hypot(p.x - m.bal.x, p.y - m.bal.y);

function wijsBesturing(m, dt, invoer) {
  const genomen = new Set(m.mensen.filter((x) => !x.weg).map((x) => x.ctl));
  const bal = m.bal, drager = bal.owner >= 0 ? m.spelers[bal.owner] : null;
  for (const human of m.mensen) {
    if (human.weg) continue;
    const inv = (invoer && invoer(human.slot)) || NEUTRAAL;
    human.inv = inv;
    human.wisselCd -= dt; human.autoT -= dt;
    const wisselNu = !!((inv.buttons | 0) & KNOP.WISSEL), wil = wisselNu && !(human.vorigW & KNOP.WISSEL);
    human.vorigW = wisselNu ? KNOP.WISSEL : 0;
    const cur = m.spelers[human.ctl];
    let goal = null;
    if (cur.rood) { // uitgesloten: de besturing gaat naar de speler die het dichtst bij de bal staat
      genomen.delete(human.ctl);
      let best = null, bd = Infinity;
      for (const q of beschikbaar(m, genomen, human)) { const d = naBal(m, q); if (d < bd) { bd = d; best = q; } }
      genomen.add(human.ctl);
      if (best) goal = best;
    }
    if (!goal && wil && human.wisselCd <= 0) {
      genomen.delete(human.ctl);
      let best = null, bd = Infinity;
      for (const p of beschikbaar(m, genomen, human)) { if (p === cur) continue; const d = naBal(m, p); if (d < bd) { bd = d; best = p; } }
      genomen.add(human.ctl);
      if (best) { goal = best; human.wisselCd = 0.25; }
    } else if (human.autoT <= 0) {
      human.autoT = 0.2;
      const eigenBal = !!drager && drager.team === human.team;
      if (eigenBal && drager.id !== human.ctl && !genomen.has(drager.id) && drager.balT < 0.4 && drager.rol !== 'keeper') {
        // de pass is aangekomen: de dichtstbijzijnde mens neemt de ontvanger over
        let dichtst = human, bd = naBal(m, cur);
        for (const o of m.mensen) { if (o.weg || o === human || o.team !== human.team) continue; const d = Math.hypot(m.spelers[o.ctl].x - drager.x, m.spelers[o.ctl].y - drager.y); if (d < bd - 1e-6) { bd = d; dichtst = o; } }
        if (dichtst === human && cur.id !== drager.id) goal = drager;
      } else if (!eigenBal && cur.id !== (drager ? drager.id : -1)) {
        // verdedigen of een losse bal: de speler die het dichtst bij de bal staat
        genomen.delete(human.ctl);
        let best = null, bd = Infinity;
        for (const p of beschikbaar(m, genomen, human)) { const d = naBal(m, p); if (d < bd) { bd = d; best = p; } }
        genomen.add(human.ctl);
        if (best && best !== cur && bd + 1.6 < naBal(m, cur) && cur.tackleT <= 0 && cur.duikT <= 0) goal = best;
      }
      if (!goal && cur.rol === 'keeper' && naBal(m, cur) > NABIJ_KEEPER + 3 && cur.houdT <= 0) { // de bal is ver weg: terug naar een veldspeler
        genomen.delete(human.ctl);
        let best = null, bd = Infinity;
        for (const p of beschikbaar(m, genomen, human)) { const d = naBal(m, p); if (d < bd) { bd = d; best = p; } }
        genomen.add(human.ctl);
        if (best) goal = best;
      }
    }
    if (goal && goal.id !== human.ctl) {
      cur.slot = null;
      genomen.delete(human.ctl); human.ctl = goal.id; genomen.add(goal.id);
      human.laad.schot = 0; human.laad.lang = 0;
      m.ev.push({ type: 'wissel', slot: human.slot, speler: goal.id });
    }
  }
  for (const p of m.spelers) p.slot = null;
  for (const human of m.mensen) if (!human.weg) { const p = m.spelers[human.ctl]; p.slot = human.slot; p.laatsteMens = human.slot; }
}

// Wat een mens met zijn invoer doet: lopen, schot of voorzet laden en loslaten, een pass, een tackle, of (keeper) duiken.
const laadK = (s) => kl(0.2 + 0.8 * Math.min(1, s / LAAD_S), 0.2, 1);
function humanIntent(m, p, human, dt) {
  // derby (#1114): wie in team 1 speelt kijkt vanaf de andere kant (cameraVoor met team1), dus zijn stick is ook gedraaid: vooruit is altijd naar het doel van de tegenstander
  const a0 = invoerNaarActie(human.inv), a = p.team === 1 ? { ...a0, dx: -a0.dx, dy: -a0.dy } : a0, b = human.inv.buttons | 0;
  const edge = (bit) => (b & bit) && !(human.vorig & bit);
  const los = (bit) => !(b & bit) && (human.vorig & bit);
  const live = m.fase === 'spel' || (m.hervat && m.hervat.t >= m.hervat.pauze);
  const it = { dx: a.dx, dy: a.dy, sprint: a.sprint, tackle: false, kick: null, duik: null };
  const heeft = m.bal.owner === p.id && live;
  const wijst = a.sterkte > 0.25;
  const ri = wijst ? { x: a.dx / Math.hypot(a.dx, a.dy), y: a.dy / Math.hypot(a.dx, a.dy) } : { x: Math.cos(p.face), y: Math.sin(p.face) };
  const dir = richtingVan(p.team), gy = opponentGoalY(p.team);
  if (heeft) {
    if (b & KNOP.SCHOT) human.laad.schot += dt; else if (los(KNOP.SCHOT)) {
      // richthulp: wijst de speler ongeveer naar het doel, dan mikt de schop op het doel; links en rechts van de stick kiezen de hoek
      let dx = ri.x, dy = ri.y;
      const towardGoal = (gy - p.y) * dir > 0 && Math.hypot(p.x, gy - p.y) < 22;
      const gx = Math.hypot(0 - p.x, gy - p.y) || 1;
      if (towardGoal && ((-p.x) * ri.x + (gy - p.y) * ri.y) / gx > 0.6) {
        const ax = kl(wijst ? a.dx * (PITCH.DOEL_B / 2) * 1.1 : 0, -(PITCH.DOEL_B / 2) * 0.85, (PITCH.DOEL_B / 2) * 0.85);
        const vx = ax - p.x, vy = gy - p.y, l = Math.hypot(vx, vy) || 1;
        dx = vx / l; dy = vy / l;
      }
      it.kick = { soort: 'schot', kracht: laadK(human.laad.schot), dx, dy, doel: -1 };
      human.laad.schot = 0;
    }
    if (!it.kick) {
      if (b & KNOP.LANG) human.laad.lang += dt; else if (los(KNOP.LANG)) {
        const q = besteOntvanger(m, p, { richting: wijst ? ri : null, minScore: 0.2 });
        it.kick = q ? { soort: 'lang', kracht: laadK(human.laad.lang), dx: ri.x, dy: ri.y, doel: q.id } : { soort: 'lang', kracht: laadK(human.laad.lang), dx: ri.x, dy: ri.y, doel: -1 };
        human.laad.lang = 0;
      }
    }
    if (!it.kick && edge(KNOP.PASS)) {
      const q = besteOntvanger(m, p, { richting: wijst ? ri : null, geenKeeper: false, minScore: 0.1 });
      if (q) { const d = dist(p, q); it.kick = { soort: 'pass', kracht: kl((d - 2) / (PITCH.L * 0.62) + 0.2, 0.2, 1), dx: q.x - p.x, dy: q.y - p.y, doel: q.id }; }
      else it.kick = { soort: 'pass', kracht: 0.45, dx: ri.x, dy: ri.y, doel: -1 };
    }
  } else {
    human.laad.schot = 0; human.laad.lang = 0;
    if (p.rol === 'keeper') { if (edge(KNOP.SCHOT) || edge(KNOP.TACKLE) || edge(KNOP.PASS)) it.duik = { dx: Math.abs(a.dx) > 0.2 ? Math.sign(a.dx) : 0, dy: 0 }; }
    else if (edge(KNOP.TACKLE) && live) it.tackle = true;
  }
  if (heeft && p.rol === 'keeper') p.houdT += 0; // de keeper wacht op een knop; de tijd tikt in voerUit
  human.vorig = b;
  return it;
}

// ---------------------------------------------------------------- bewegen en acties

function beweeg(m, p, it, dt) {
  const human = p.slot != null;
  const lv = m.ai[p.team];
  let top = p.rol === 'keeper' ? LOOP.keeper : LOOP.loop;
  const sterkte = Math.min(1, Math.hypot(it.dx, it.dy));
  if (it.sprint && sterkte > 0.5 && !p.moe && p.rol !== 'keeper' && p.stamina > 0) { top = LOOP.sprint * bonusVan(m, p).sprint; p.stamina = Math.max(0, p.stamina - (LOOP.stamina_af * dt) / bonusVan(m, p).uit); if (p.stamina <= 0.02) p.moe = true; }
  else { p.stamina = Math.min(1, p.stamina + LOOP.stamina_bij * dt * (sterkte < 0.1 ? 1.6 : 1)); if (p.moe && p.stamina > 0.3) p.moe = false; }
  if (!human) top *= lv.tempo;
  if (p.blessure) top *= 0.6;                                 // een gekwetste speler loopt kreupel tot hij gewisseld wordt
  if (p.stun > 0) { top *= 0.25; p.stun -= dt; }
  let tx = it.dx * top, ty = it.dy * top;
  let acc = sterkte > 0.05 ? 10 : 13;
  if (p.tackleT > 0) { p.tackleT -= dt; const f = LOOP.sprint * 1.1; tx = Math.cos(p.face) * f; ty = Math.sin(p.face) * f; acc = 14; }
  if (p.duikT > 0) { p.duikT -= dt; tx = p.duikDx * 6.8 * keeperSchaal(); ty *= 0.3; acc = 18; }
  if (m.fase === 'goal' && p.vier <= 0) { tx = 0; ty = 0; }
  const k = Math.min(1, acc * dt);
  p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k;
  p.x += p.vx * dt; p.y += p.vy * dt;
  p.x = kl(p.x, -(PITCH.B / 2) + 0.15, (PITCH.B / 2) - 0.15); p.y = kl(p.y, -(PITCH.L / 2) + 0.1, (PITCH.L / 2) - 0.1);
  p.speed = Math.hypot(p.vx, p.vy);
  const draai = p.speed > 0.6 ? Math.atan2(p.vy, p.vx) : (sterkte > 0.2 ? Math.atan2(it.dy, it.dx) : p.face);
  if (p.tackleT <= 0 && (sterkte > 0.15 || p.speed > 0.6)) { const d = hoek(draai, p.face); p.face += kl(d, -14 * dt, 14 * dt); }
  p.cool = Math.max(0, p.cool - dt); p.tackleCd = Math.max(0, p.tackleCd - dt); p.vier = Math.max(0, p.vier - dt);
  if (p.balT >= 0 && m.bal.owner === p.id) p.balT += dt;
}

// De schop van een speler: de bal verlaat zijn voet met een snelheid die bij de soort past. De spreiding komt van de speler (computer: de stand; mens: klein) en van een te harde of slappe schop.
function schop(m, p, kick) {
  const b = m.bal, k = kl(kick.kracht, 0.15, 1);
  let dx = kick.dx, dy = kick.dy, l = Math.hypot(dx, dy);
  if (l < 1e-6) { dx = Math.cos(p.face); dy = Math.sin(p.face); l = 1; }
  dx /= l; dy /= l;
  const ontv = kick.doel != null && kick.doel >= 0 ? m.spelers[kick.doel] : null;
  let distance = 0;
  if (ontv) {
    const tx = ontv.x + ontv.vx * 0.45, ty = ontv.y + ontv.vy * 0.45;
    distance = Math.hypot(tx - p.x, ty - p.y);
    if (distance > 0.5) { dx = (tx - p.x) / distance; dy = (ty - p.y) / distance; }
  }
  const humanP = p.slot != null;
  const basis = humanP ? 0.035 / bonusVan(m, p).schot : p.spreiding / bonusVan(m, p).schot;
  let spreiding = kick.soort === 'schot' ? basis + Math.abs(k - 0.85) * 0.1 : kick.soort === 'lang' ? basis * 0.6 + 0.02 : basis * 0.35 + 0.01;
  if (p.stun > 0) spreiding += 0.08;
  const a = Math.atan2(dy, dx) + (m.rng() * 2 - 1) * spreiding;
  const ca = Math.cos(a), sa = Math.sin(a);
  let vh, vz = 0;
  if (kick.soort === 'schot') { vh = (8 + 16 * k) * (PITCH.L > 60 ? 1.15 : 1); vz = 0.5 + 2.4 * k * (0.25 + 0.75 * m.rng()); }
  else if (kick.soort === 'lang') {
    const D = kl(ontv && distance > 0 ? distance : PITCH.L * 0.2 + PITCH.L * 0.62 * k, 6, PITCH.L * 0.8), th = 0.62;
    const v = Math.sqrt(D * G / Math.sin(2 * th)) * 1.07;
    vh = v * Math.cos(th); vz = v * Math.sin(th);
  } else vh = ontv && distance > 0 ? kl(5 + 0.78 * distance, 6, 15.5) : 5 + 11 * k;
  b.owner = -1; b.dood = false;
  b.x = p.x + ca * 0.75; b.y = p.y + sa * 0.75; b.z = vz > 0 ? 0.05 : 0;
  b.vx = ca * vh; b.vy = sa * vh; b.vz = vz;
  b.laatsteTeam = p.team; b.laatsteSpeler = p.id;
  p.cool = 0.4; p.balT = 0; p.houdT = 0;
  b.bs = -1;
  if (ontv && kick.soort !== 'schot' && ontv.team === p.team) {
    p.st.passes++; b.passVan = p.id; b.passNaar = ontv.id; b.passT = m.tijd;
    if (offsideAtKick(m, p, ontv)) b.bs = ontv.id;
  }
  if (kick.soort === 'schot') {
    m.stat.schoten[p.team]++; p.st.schoten++; const mm = humanOf(m, p); if (mm) mm.schoten++;
    const gy = opponentGoalY(p.team);
    if (b.vy * (gy - b.y) > 0) { const t = (gy - b.y) / b.vy, xg = b.x + b.vx * t; if (Math.abs(xg) < PITCH.DOEL_B / 2 + 0.2) m.stat.opDoel[p.team]++; }
  }
  m.ev.push({ type: 'schop', soort: kick.soort, sterkte: k, x: p.x, y: p.y, speler: p.id });
  if (m.fase === 'aftrap' || m.fase === 'hervat') { m.fase = 'spel'; m.hervat = null; }
}
const bonusVan = (m, p) => { const mm = p.slot != null ? m.mensen.find((x) => x.slot === p.slot) : null; return mm ? mm.bonus : (p.fac || NEUTRAAL_FAC); };
const humanOf = (m, p) => (p.laatsteMens != null ? m.mensen.find((x) => x.slot === p.laatsteMens) || null : null);

function voerUit(m, p, it) {
  const b = m.bal;
  const live = m.fase === 'spel' || ((m.fase === 'aftrap' || m.fase === 'hervat') && m.hervat && m.hervat.t >= m.hervat.pauze);
  if (!live) return;
  if (it.kick && b.owner === p.id && p.cool <= 0) schop(m, p, it.kick);
  if (it.tackle && p.tackleCd <= 0 && p.stun <= 0 && p.tackleT <= 0 && b.owner !== p.id && m.fase === 'spel') { p.tackleT = 0.4; p.tackleCd = 1.0; p.tackleGedaan = false; }
  if (it.duik && p.duikT <= 0 && b.owner !== p.id) { p.duikT = 0.55; p.duikDx = it.duik.dx || 0; p.vier = 0; m.ev.push({ type: 'duik', speler: p.id }); }
  if (p.tackleT > 0 && !p.tackleGedaan && m.fase === 'spel') tackleControle(m, p);
}

function tackleControle(m, p) {
  const o = m.bal.owner >= 0 ? m.spelers[m.bal.owner] : null;
  if (!o || o.team === p.team || dist(p, o) > 1.05) return;
  p.tackleGedaan = true;
  const lv = m.ai[p.team];
  let chance = (p.slot != null ? 0.6 : 0.2 + lv.tackle * 0.8) * bonusVan(m, p).verd;
  const behind = Math.cos(hoek(p.face, o.face)) > 0.4;
  chance -= 0.05 * o.speed;
  if (!behind) chance += 0.1;
  if (o.rol === 'keeper' && inStrafschop(o.team, o.x, o.y)) chance = 0; // een keeper met de bal in de hand is van hem
  if (m.rng() < chance) {
    const b = m.bal;
    b.owner = -1; b.laatsteTeam = p.team; b.laatsteSpeler = p.id;
    const a = p.face + (m.rng() - 0.5) * 0.9;
    b.x = o.x + Math.cos(a) * 0.5; b.y = o.y + Math.sin(a) * 0.5; b.z = 0; b.vx = Math.cos(a) * 4.6; b.vy = Math.sin(a) * 4.6; b.vz = 0;
    o.cool = 0.5; o.stun = 0.35; o.balT = 0;
    p.st.tackles++;
    m.ev.push({ type: 'tackle', team: p.team, speler: p.id });
  } else {
    p.stun = 0.7; p.tackleT = 0;
    if ((behind && m.rng() < 0.4) || (p.speed > 7.0 && m.rng() < 0.15)) foul(m, p, o, behind || p.speed > 7.0); else m.ev.push({ type: 'duel', speler: p.id });
  }
}

function foul(m, dader, slachtoffer, hard = false) {
  if (m.foulCd > 0 || m.fase !== 'spel') return;
  m.foulCd = 1.5;
  m.stat.overtredingen[dader.team]++;
  m.ev.push({ type: 'overtreding', team: dader.team, speler: dader.id, x: slachtoffer.x, y: slachtoffer.y });
  const b = judgeFoul(m, dader, slachtoffer, hard);         // kaart, blessure en strafschop (voetbalextrarules.js; alles uit te zetten)
  for (const e of pasBeoordelingToe(m, dader, slachtoffer, b)) m.ev.push(e);
  if (b.strafschop) setupResume(m, 'strafschop', slachtoffer.team, slachtoffer.x, slachtoffer.y, slachtoffer.rol === 'keeper' || b.blessure ? null : slachtoffer.id);
  else setupResume(m, 'vrij', slachtoffer.team, slachtoffer.x, slachtoffer.y, slachtoffer.id);
}
// Buitenspel (optioneel): de ontvanger van een pass stond voor de laatste verdedigers, de ander krijgt een vrije bal.
function callOffside(m, p) {
  m.stat.buitenspel[p.team]++;
  m.ev.push({ type: 'buitenspel', team: p.team, speler: p.id });
  noteer(m, 'buitenspel', p.team, p.id);
  setupResume(m, 'vrij', 1 - p.team, p.x, p.y);
}

// ---------------------------------------------------------------- de bal: dragen, oppakken, keeper

function carry(m, dt) {
  const b = m.bal, o = m.spelers[b.owner];
  const off = Math.min(0.85, 0.55 + 0.045 * o.speed);
  const tx = o.x + Math.cos(o.face) * off, ty = o.y + Math.sin(o.face) * off;
  const k = Math.min(1, dt * 22);
  b.x += (tx - b.x) * k; b.y += (ty - b.y) * k; b.z = 0; b.vz = 0; b.vx = o.vx; b.vy = o.vy;
  b.laatsteTeam = o.team; b.laatsteSpeler = o.id;
  if (o.rol === 'keeper') o.houdT += dt;
}

const keeperSchaal = () => 1 + (PITCH.DOEL_B / 4.4 - 1) * 0.28; // een keeper in een groter doel reikt iets verder
const KEEPER_BEREIK = 1.05, KEEPER_DUIK = 1.9;
function oppakken(m) {
  const b = m.bal;
  if (b.dood || b.netTeam >= 0) return;
  let best = null, bd = Infinity;
  for (const p of m.spelers) {
    if (p.cool > 0 || p.stun > 0.3 || p.rood) continue;
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    const rel = Math.hypot(b.vx - p.vx * 0.4, b.vy - p.vy * 0.4); // wie naar de bal toe loopt vangt hem iets lastiger, maar niet zo erg als de ruwe verschilsnelheid
    const keeper = p.rol === 'keeper' && inStrafschop(p.team, p.x, p.y) && b.laatsteTeam !== p.team;
    let r, hoog;
    if (keeper) { r = (p.duikT > 0 ? KEEPER_DUIK : KEEPER_BEREIK) * keeperSchaal(); hoog = PITCH.DOEL_H + 0.3; }
    else { r = (kl(0.78 - 0.022 * rel, 0.38, 0.78) + (p.tackleT > 0 ? 0.25 : 0)) * (1 + (bonusVan(m, p).aanname - 1) * 0.8); hoog = 0.75; }
    if (b.z > hoog) continue;
    if (d < r && d < bd) { bd = d; best = { p, keeper, rel }; }
  }
  if (!best) return;
  const { p, keeper, rel } = best;
  if (!keeper && b.bs === p.id) { b.bs = -1; callOffside(m, p); return; }
  b.bs = -1;
  if (keeper) {
    const lv = m.ai[p.team], vaardig = (p.slot != null ? 0.8 : lv.keeper) * (PITCH.L > 60 ? 0.78 : 1);
    const sp = ballSpeed(b);
    if (sp <= 9 + 13 * vaardig && m.rng() < 0.55 + 0.45 * vaardig) { b.owner = p.id; p.houdT = 0; p.balT = 0; p.duikT = 0; p.st.reddingen++; m.ev.push({ type: 'redding', soort: 'vangst', speler: p.id }); }
    else { // weggeslagen: de bal gaat van het doel af, met wat toeval opzij
      b.vy = -b.vy * 0.5 + richtingVan(p.team) * 2; b.vx += (m.rng() - 0.5) * 8; b.vz = 1.6; p.cool = 0.4;
      b.laatsteTeam = p.team; b.laatsteSpeler = p.id;
      p.st.reddingen++;
      m.ev.push({ type: 'redding', soort: 'weg', speler: p.id });
    }
    return;
  }
  if (rel > 11.5 * bonusVan(m, p).aanname) { // een te harde bal: afketsen, de aanname mislukt
    b.vx = -b.vx * 0.3 + (m.rng() - 0.5) * 3; b.vy = -b.vy * 0.3 + (m.rng() - 0.5) * 3; p.cool = 0.3; m.ev.push({ type: 'afketsing', speler: p.id });
    return;
  }
  b.owner = p.id; p.balT = 0; b.laatsteTeam = p.team; b.laatsteSpeler = p.id;
  b.vx = p.vx; b.vy = p.vy; b.vz = 0; b.z = 0;
}

function pushPlayers(m) {
  const S = m.spelers, b = m.bal;
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const a = S[i], c = S[j];
    if (a.rood || c.rood) continue;
    const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
    if (d >= 0.75 || d < 1e-6) continue;
    // omver lopen: een sprinter botst van achteren op de bal bij een tegenstander
    if (a.team !== c.team && m.fase === 'spel' && m.foulCd <= 0) {
      for (const [x, y] of [[a, c], [c, a]]) {
        if (b.owner === y.id && x.speed > 6.3 && x.tackleT <= 0 && d < 0.62) {
          const nx = (y.x - x.x) / d, ny = (y.y - x.y) / d;
          const naarHem = (x.vx * nx + x.vy * ny) / (x.speed || 1);
          const behind = Math.cos(hoek(x.face, y.face)) > 0.3;
          if (naarHem > 0.8 && behind) { foul(m, x, y, true); return; }
        }
      }
    }
    const dm = (0.75 - d) / 2, nx = dx / d, ny = dy / d;
    a.x -= nx * dm; a.y -= ny * dm; c.x += nx * dm; c.y += ny * dm;
  }
  for (const p of S) { if (p.rood) continue; p.x = kl(p.x, -(PITCH.B / 2) + 0.15, (PITCH.B / 2) - 0.15); p.y = kl(p.y, -(PITCH.L / 2) + 0.1, (PITCH.L / 2) - 0.1); }
}

// ---------------------------------------------------------------- de stap

export function tikWedstrijd(m, dtIn, invoer = null) {
  zetFormaat(m.formaat);
  m.ev = [];
  const dt = Math.min(Math.max(dtIn, 0), 0.1);
  if (m.fase === 'klaar') return m.ev;
  m.tijd += dt; m.n++;
  if (m.flash && (m.flash.t -= dt) <= 0) m.flash = null;
  m.flits = Math.max(0, m.flits - dt * 2.5);
  m.foulCd = Math.max(0, m.foulCd - dt);
  if (m.fase === 'intro') {
    m.faseT -= dt;
    if (m.faseT <= 0) setupKickoff(m, 0);
    return m.ev;
  }
  if (m.fase === 'rust') {
    m.faseT -= dt;
    if (m.faseT <= 0) { m.helft = 2; m.klok = m.duurHelft; setupKickoff(m, 1); }
    return m.ev;
  }
  if (m.fase === 'eind') {
    m.faseT -= dt;
    if (m.faseT <= 0) { m.fase = 'klaar'; m.ev.push({ type: 'klaar', winnaar: m.winnaar }); }
    return m.ev;
  }
  fieldStep(m, dt, invoer);
  return m.ev;
}

function fieldStep(m, dt, invoer) {
  const goal = m.fase === 'goal';
  const sdt = goal && m.faseT > GOAL_S - SLOMO_S ? dt * SLOMO : dt;
  if (m.hervat && (m.fase === 'aftrap' || m.fase === 'hervat')) m.hervat.t += dt;
  wijsBesturing(m, dt, invoer);
  for (const p of (m.n % 2 ? m.spelers.slice().reverse() : m.spelers)) { // de volgorde wisselt per stap, zodat geen team voorrang heeft
    if (p.rood) continue;
    let it;
    if (p.slot != null) { const human = m.mensen.find((x) => x.slot === p.slot && !x.weg); it = human ? humanIntent(m, p, human, dt) : NIETS; }
    else it = aiIntentie(m, p, sdt);
    if (goal && p.vier <= 0) it = NIETS;
    beweeg(m, p, it, sdt);
    if (!goal) voerUit(m, p, it);
  }
  // een mens die niet schiet of speelt bij een herstart: na een tijd gaat de bal vanzelf weg
  if (m.hervat && (m.fase === 'aftrap' || m.fase === 'hervat') && m.hervat.t > HERVAT_MAX && m.bal.owner >= 0) {
    const p = m.spelers[m.bal.owner], q = besteOntvanger(m, p, { geenKeeper: false, minScore: -9 });
    schop(m, p, q ? { soort: 'pass', kracht: 0.5, dx: q.x - p.x, dy: q.y - p.y, doel: q.id } : { soort: 'pass', kracht: 0.5, dx: 0, dy: richtingVan(p.team), doel: -1 });
  }
  // een keeper met de bal in zijn handen mag hem niet eeuwig houden (ook niet als een mens hem bestuurt)
  if (m.bal.owner >= 0) { const o = m.spelers[m.bal.owner]; if (o.rol === 'keeper' && m.fase === 'spel' && o.houdT > 5) { const q = besteOntvanger(m, o, { geenKeeper: true, minScore: -9 }); schop(m, o, q ? { soort: 'pass', kracht: 0.6, dx: q.x - o.x, dy: q.y - o.y, doel: q.id } : { soort: 'lang', kracht: 0.7, dx: 0, dy: richtingVan(o.team), doel: -1 }); } }
  pushPlayers(m);
  const b = m.bal;
  if (b.owner >= 0) carry(m, sdt);
  else {
    const ev = stepBall(b, sdt, []);
    for (const e of ev) {
      if (e.type === 'goal' && m.fase === 'spel') goalScored(m, e);
      else if (e.type === 'uit' && m.fase === 'spel') { m.stat.uit++; const h = uitbalHervat(e, b.laatsteTeam < 0 ? 0 : b.laatsteTeam); m.ev.push({ type: 'uit', kind: e.kind }); setupResume(m, h.kind, h.team, h.x, h.y); return; }
      else if (e.type === 'paal' || e.type === 'lat' || e.type === 'stuit') m.ev.push(e);
    }
    if (m.fase === 'spel') oppakken(m);
  }
  if (m.fase === 'spel') {
    if (b.owner >= 0) m.stat.bezit[m.spelers[b.owner].team] += dt;
    m.klok -= dt;
    if (m.klok <= 0) { m.klok = 0; einde_helft(m); }
  } else if (goal) {
    m.faseT -= dt;
    if (m.faseT <= 0) setupKickoff(m, m.aftrapTeam);
  }
}

function goalScored(m, e) {
  m.score[e.team]++;
  const b = m.bal, schutter = b.laatsteSpeler >= 0 ? m.spelers[b.laatsteSpeler] : null;
  const eigen = !schutter || schutter.team !== e.team;
  let assistId = -1;
  if (!eigen) {
    m.stat.doelpuntenVan[schutter.id] = (m.stat.doelpuntenVan[schutter.id] || 0) + 1;
    schutter.st.doelpunten++;
    if (b.passNaar === schutter.id && b.passVan >= 0 && m.tijd - b.passT < 6 && b.passVan !== schutter.id && m.spelers[b.passVan].team === e.team) { m.spelers[b.passVan].st.assists++; assistId = b.passVan; }
    const mm = humanOf(m, schutter); if (mm) mm.doelpunten++;
    schutter.vier = GOAL_S - 0.4;
  }
  m.fase = 'goal'; m.faseT = GOAL_S; m.aftrapTeam = 1 - e.team; m.hervat = null;
  m.flits = 1;
  for (const p of m.spelers) if (p.team === e.team && p !== schutter) p.vier = 1.2;
  const name = eigen ? 'eigen doelpunt' : schutter.naam;
  m.flash = { tekst: `GOAL! ${m.teams[e.team].kort} ${scoreTekst(m.score[0], m.score[1])} (${name})`.slice(0, 60), t: GOAL_S };
  noteer(m, 'goal', e.team, eigen ? -1 : schutter.id, { eigen, assist: assistId });
  m.ev.push({ type: 'goal', team: e.team, speler: eigen ? -1 : schutter.id, eigen, assist: assistId, stand: m.score.slice() });
}

function einde_helft(m) {
  const b = m.bal;
  b.owner = -1; b.vx = b.vy = 0;
  m.ev.push({ type: 'fluit', helft: m.helft });
  if (m.helft < HELFTEN) { for (const e of rustWissels(m)) m.ev.push(e); m.fase = 'rust'; m.faseT = m.timings.rust; m.flash = { tekst: `Rust: ${scoreTekst(m.score[0], m.score[1])}`, t: m.timings.rust }; return; }
  m.fase = 'eind'; m.faseT = m.timings.eind;
  m.winnaar = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1;
  m.flash = { tekst: `Einde: ${m.teams[0].kort} ${scoreTekst(m.score[0], m.score[1])} ${m.teams[1].kort}`.slice(0, 60), t: m.timings.eind };
  m.ev.push({ type: 'einde', winnaar: m.winnaar });
}

// Een speler valt weg (verbinding kwijt of gestopt): de computer neemt zijn speler over.
export function verlaatVoetbal(m, slot) {
  const mm = m.mensen.find((x) => x.slot === slot);
  if (!mm || mm.weg) return false;
  mm.weg = true;
  const p = m.spelers[mm.ctl]; if (p) p.slot = null;
  return true;
}
export const meedoenVoetbal = (m, slot) => m.mensen.some((x) => x.slot === slot && !x.weg);

// ---------------------------------------------------------------- uitslag en beloning

// Eén regel per mens (de plek is 1 winst, 2 verlies, 3 gelijk); `tijd` is wat hij zelf scoorde, `tekst` bevat de stand ("gewonnen: 3-1").
export function uitslagVoetbal(m) {
  return m.mensen.map((x) => {   // per mens vanuit zijn eigen team (derby, #1114: wie in team 1 speelt wint bij score[1] > score[0])
    const gf = m.score[x.team || 0], ga = m.score[1 - (x.team || 0)], uitk = uitkomstVan(gf, ga);
    const spot = uitk === 'winst' ? 1 : uitk === 'verlies' ? 2 : 3;
    const phrase = uitk === 'winst' ? 'gewonnen' : uitk === 'verlies' ? 'verloren' : 'gelijk';
    return {
      slot: x.slot, naam: x.naam, ai: false, weg: x.weg, fin: !x.weg, plek: spot, tijd: x.doelpunten, beste: null,
      tekst: x.weg ? 'niet meer erbij' : `${phrase}: ${scoreTekst(gf, ga)}`,
    };
  }).sort((a, b) => (a.weg - b.weg) || (a.slot - b.slot));
}
export const winnaarsVoetbal = (rijen) => rijen.filter((r) => r.plek === 1 && !r.weg).map((r) => r.slot);
export function beloningVoetbal(rij) {
  if (!rij || rij.weg || rij.ai) return { geld: 0, xp: 0 };
  const mm = /(\d+)-(\d+)/.exec(rij.tekst || '');
  return voetbalBeloning({ plek: rij.plek, weg: false, nul: !!mm && +mm[2] === 0 });
}
// Wat een speler zelf bewaart (record en medaille), uit zijn uitslagsregel; werkt voor de host (zijn eigen regel) en voor een gast (de regel uit het eindbericht).
export function medailleUitRij(rij) {
  if (!rij || rij.weg) return { medaille: 0, gf: 0, ga: 0, eigen: 0 };
  const mm = /(\d+)-(\d+)/.exec(rij.tekst || '');
  const gf = mm ? +mm[1] : 0, ga = mm ? +mm[2] : 0, eigen = Math.max(0, rij.tijd | 0);
  return { medaille: voetbalMedaille({ gf, ga, eigen }), gf, ga, eigen };
}

// ---------------------------------------------------------------- de momentopname naar de gasten en hun spiegel

const FLASH_CODES = ['', 'goal', 'uit', 'rust', 'eind', 'hervat'];
const flashCode = (m) => (m.fase === 'goal' ? 1 : m.fase === 'rust' ? 3 : m.fase === 'eind' ? 4 : m.fase === 'hervat' ? 5 : m.fase === 'aftrap' ? 5 : 0);
// d: [fase, helft, klok, s0, s1, bx, by, bz, bvx, bvy, bvz, eigenaar, hervatsoort, flash, flits, slomo, ctl x4, dan per speler twee getallen]. Per speler: (x, y) in stappen van 5 cm in één
// getal, en (hoek in 64 stappen, flags) in één getal. Zo past elf tegen elf (44 + 20) in de 64 getallen die het bestaande live-bericht draagt.
const SPOT_X = 40, SPOT_Y = 60, STAP = 20;
const packSpot = (x, y) => Math.round(kl(x + SPOT_X, 0, 2 * SPOT_X - 0.05) * STAP) * 4096 + Math.round(kl(y + SPOT_Y, 0, 2 * SPOT_Y - 0.05) * STAP);
const unpackSpot = (v) => ({ x: Math.floor(v / 4096) / STAP - SPOT_X, y: (v % 4096) / STAP - SPOT_Y });
const packHoek = (a) => ((Math.round((((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * 64) % 64) * 512);
export const snapLengte = (formaat) => 20 + 2 * 2 * FORMATEN[cleanFormaat(formaat)].n;
export function snapVoetbal(m, seq = 0) {
  const b = m.bal;
  const d = [Math.max(0, FASEN.indexOf(m.fase)), m.helft, q2(m.klok, 1), m.score[0], m.score[1], q2(b.x), q2(b.y), q2(b.z), q2(b.vx, 1), q2(b.vy, 1), q2(b.vz, 1), b.owner,
    m.hervat ? HERVAT_KINDEN.indexOf(m.hervat.kind) : -1, flashCode(m), m.flits > 0.5 ? 1 : 0, m.fase === 'goal' && m.faseT > GOAL_S - SLOMO_S ? 1 : 0];
  for (let k = 0; k < 4; k++) { const mm = m.mensen[k]; d.push(mm && !mm.weg ? mm.ctl : -1); }
  for (const p of m.spelers) {
    const flags = Math.min(15, Math.round(p.speed / 0.6)) + (p.tackleT > 0 ? 16 : 0) + (p.stun > 0 ? 32 : 0) + (p.duikT > 0 ? 64 : 0) + (p.vier > 0 ? 128 : 0) + (p.moe ? 256 : 0);
    d.push(packSpot(p.x, p.y), packHoek(p.face) + flags);
  }
  return { k: 'wed', f: 'lv', n: seq | 0, d, x: m.flash ? String(m.flash.tekst).slice(0, 60) : '' };
}
export const liveVoetbal = {
  tik: tikWedstrijd, snap: snapVoetbal, verlaat: verlaatVoetbal, uitslag: uitslagVoetbal, beloning: beloningVoetbal, vak: 'buiten', meedoen: meedoenVoetbal,
};
export function leesLiveVoetbal(b) {
  if (!b || b.k !== 'wed' || b.f !== 'lv' || !Number.isInteger(b.n) || !Array.isArray(b.d) || (b.d.length !== snapLengte('klein') && b.d.length !== snapLengte('groot')) || !b.d.every(fin)) return null;
  return { f: 'lv', n: b.n, d: b.d.slice(), x: typeof b.x === 'string' ? b.x.replace(/[\u0000-\u001f<>]/g, '').slice(0, 60) : '' };
}

// De spiegel van een gast: dezelfde velden als de host-wedstrijd voor wie hem tekent, vloeiend gevoed door de momentopnamen.
export function makeFootballMirror(start, mijnSlot, { duur = 'normaal', stand: level = 'standaard', tegenstander: tg = 0, formaat = 'klein', vorming = null, stijl = 'evenwichtig', team1 = [] } = {}) {
  const m = makeMatch(start.deeln.map((d) => ({ slot: d.slot, naam: d.naam, char: d.char, team: team1.includes(d.slot) ? 1 : 0 })), { duur, stand: level, seed: 1, tegenstander: tg, formaat, vorming, stijl });
  m.spiegel = true; m.mijnSlot = mijnSlot; m.n = -1; m.leeftijd = 0; m.nSnap = 0; m.flashTekst = ''; m.bt = null; m.mijnId = -1;
  for (const p of m.spelers) { p.tx = p.x; p.ty = p.y; p.slot = null; }
  m.bal.tx = 0; m.bal.ty = 0; m.bal.tz = 0; m.bal.bvx = 0; m.bal.bvy = 0; m.bal.bvz = 0;
  return m;
}
export function voerInVoetbal(sp, st) {
  if (!st || st.f !== 'lv' || st.d.length !== snapLengte(sp.formaat) || st.n < sp.n) return false;
  zetFormaat(sp.formaat);
  const d = st.d;
  sp.n = st.n; sp.fase = FASEN[kl(d[0] | 0, 0, FASEN.length - 1)]; sp.helft = d[1] | 0 || 1; sp.klok = d[2]; sp.score = [d[3] | 0, d[4] | 0];
  const b = sp.bal;
  b.tx = d[5]; b.ty = d[6]; b.tz = d[7]; b.bvx = d[8]; b.bvy = d[9]; b.bvz = d[10]; b.owner = d[11] | 0;
  sp.hervat = d[12] >= 0 ? { kind: HERVAT_KINDEN[kl(d[12] | 0, 0, HERVAT_KINDEN.length - 1)] } : null;
  sp.flits = d[14] ? 1 : sp.flits; sp.slomo = !!d[15];
  sp.ctl = [d[16] | 0, d[17] | 0, d[18] | 0, d[19] | 0];
  sp.mensen.forEach((mm, k) => { mm.ctl = sp.ctl[k] >= 0 ? sp.ctl[k] : mm.ctl; mm.weg = sp.ctl[k] < 0; });
  const eigen = sp.mensen.find((x) => x.slot === sp.mijnSlot);
  sp.mijnId = eigen && !eigen.weg ? eigen.ctl : -1;
  sp.spelers.forEach((p, i) => {
    const o = 20 + i * 2, pl = unpackSpot(d[o]), hv = d[o + 1] | 0, flags = hv % 512;
    p.tx = pl.x; p.ty = pl.y; p.face = Math.floor(hv / 512) / 64 * 2 * Math.PI;
    p.snelheidSnap = (flags & 15) * 0.6; p.tackleT = flags & 16 ? 0.3 : 0; p.stun = flags & 32 ? 0.3 : 0; p.duikT = flags & 64 ? 0.3 : 0; p.vier = flags & 128 ? 1 : 0; p.moe = !!(flags & 256);
    if (sp.nSnap === 0) { p.x = p.tx; p.y = p.ty; }
    p.slot = null;
  });
  for (const mm of sp.mensen) if (!mm.weg && sp.spelers[mm.ctl]) sp.spelers[mm.ctl].slot = mm.slot;
  if (sp.nSnap === 0) { b.x = b.tx; b.y = b.ty; b.z = b.tz; }
  sp.leeftijd = 0; sp.nSnap++;
  sp.flashTekst = st.x || '';
  return true;
}
const GUEST_FOLLOW = 30, GAST_MAX_SPEED = 20;
export function tikVoetbalSpiegel(sp, dt) {
  sp.leeftijd += dt;
  const k = 1 - Math.exp(-dt * GUEST_FOLLOW);
  for (const p of sp.spelers) {
    const ox = p.x, oy = p.y, du = p.tx - p.x, dv = p.ty - p.y, d = Math.hypot(du, dv);
    if (d <= 0.005) { p.x = p.tx; p.y = p.ty; } else { const s = Math.min(d, d * k, GAST_MAX_SPEED * dt); p.x += du / d * s; p.y += dv / d * s; }
    p.speed = dt > 0 ? Math.hypot(p.x - ox, p.y - oy) / dt : 0;
  }
  const b = sp.bal;
  if (b.owner >= 0) { // de bal volgt zijn drager (de host stuurt hem ook mee, dit maakt het vloeiender)
    const a = Math.min(sp.leeftijd, 0.25);
    const kb = 1 - Math.exp(-dt * 30);
    b.x += (b.tx + b.bvx * a - b.x) * kb; b.y += (b.ty + b.bvy * a - b.y) * kb; b.z += (b.tz - b.z) * kb;
  } else {
    const a = Math.min(sp.leeftijd, 0.25), kb = 1 - Math.exp(-dt * 30);
    b.x += (b.tx + b.bvx * a - b.x) * kb; b.y += (b.ty + b.bvy * a - b.y) * kb; b.z += (Math.max(0, b.tz + b.bvz * a - 0.5 * G * a * a) - b.z) * kb;
  }
  if (sp.flits > 0) sp.flits = Math.max(0, sp.flits - dt * 2.5);
}
