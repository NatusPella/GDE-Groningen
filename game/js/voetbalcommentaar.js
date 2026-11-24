// De commentaarmotor van de voetbalwedstrijd (epic voetbal-uitzending, 21-11): puur, geen DOM en geen THREE (scripts/voetbal_uitzending_test.mjs). Twee commentatoren (voetbalcommentaardata.js) praten mee met
// de gebeurtenissen van de sim (voetbalmatch.js ev): aftrap, kans, schot, redding, doelpunt, kaart, blessure, wissel, hoekschop, strafschop, rust, einde, comeback en derby, met vulling in rustige minuten.
// Afwisselend en niet herhalend: elke soort en commentator heeft een zak die leeg moet voordat een entry terugkomt (en nooit twee keer dezelfde entry achter elkaar), plus een geheugen van de laatste
// dertig regels over alle soorten heen. Drukte wordt gedempt: een entry van lage prioriteit valt weg als er net iets gezegd is, een doelpunt of kaart komt altijd. Commentaar is lokaal (Samen spelen: iedere
// speler hoort het commentaar van zijn eigen spel; er gaat niets over het net).
// Stemmen: een vaste entry (zonder accolade) heeft de sleutel `Hilbrand|tekst` of `Roelie|tekst` in de stembank (tts_cast, voice_wacht.json); een sjabloon of een entry zonder opname blijft ondertitel.
import { makeRng } from './minigamekit.js';
import { COMMENTATOREN, KINDS, COMMENTAAR, isDerby } from './voetbalcommentaardata.js';

const MEMORY = 30;
const MIN_TUSSEN = { 1: 3.6, 2: 1.8, 3: 0 };     // seconden stilte die een entry van deze prioriteit nodig heeft
const KIND_INTERVAL = { kans: 14, schot: 11, uit: 20, ingooi: 24, overtreding: 12, vrij: 16, hoek: 14, doelschop: 20, redding: 7, vulling: 12, bezitThuis: 90, bezitUit: 90 };
const LEEG = Object.freeze({ h: [], r: [] });

const isSjabloon = (t) => /\{[a-z]+\}/.test(t);
// De sleutel van de stembank voor een entry; sjablonen hebben er geen (ze blijven ondertitel).
export const stemSleutel = (wie, tekst) => (!tekst || isSjabloon(tekst) || !COMMENTATOREN[wie] ? null : `${COMMENTATOREN[wie].stem}|${tekst}`);
export function vulSjabloon(tekst, v = {}) {
  return String(tekst).replace(/\{([a-z]+)\}/g, (all, k) => (v[k] != null && v[k] !== '' ? String(v[k]) : k === 'stand' ? '' : k === 'team' ? 'de ploeg' : k === 'speler' ? 'de speler' : k === 'ronde' ? 'deze ronde' : k === 'rondes' ? 'zeven' : k === 'divisie' ? 'competitie' : k === 'sponsor' ? 'onze sponsor' : 'de ander')).replace(/\s+([.,!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}
export function allLines() {
  const uit = [];
  for (const [soort, p] of Object.entries(COMMENTAAR)) for (const wie of ['h', 'r']) for (const tekst of p[wie] || []) uit.push({ soort, wie, tekst });
  return uit;
}
export function countLines() { return allLines().length; }

// `buiten`: de wedstrijd is niet in de Euroborg (een carrièrewedstrijd op een sportpark). Dan mijden we regels die de Euroborg noemen, en regels over de Stadjers als die niet
// meespelen (beeld 24-11: "Welkom in de Euroborg!" op het park in Oude Roodehaan). Zo'n regel komt alleen nog als er in die zak niets anders is.
export function makeCommentaar({ seed = 1, teams = ['Stadjers', 'Hunebedders'], ids = ['stadjers', 'hunebedders'], duurHelft = 150, buiten = false } = {}) {
  const mijd = [buiten ? 'Euroborg' : null, ids.includes('stadjers') ? null : 'Stadjers'].filter(Boolean);
  return {
    rng: makeRng((seed | 0) + 4242), teams, ids, duurHelft, mijd: mijd.length ? new RegExp(mijd.join('|')) : null,
    zak: {}, laatsteIndex: {}, geheugen: [], rij: [], sinds: 99, laatsteWie: 'r', logboek: [], laatsteSoort: {}, t: 0, stilte: 0,
    flags: { start: false, laatste: false, spanning: [false, false, false], bezit: -999 }, scorePrev: [0, 0], gezegd: 0,
  };
}

// Een entry uit de zak van (soort, wie): de zak wordt geschud als hij leeg is; nooit dezelfde als de vorige uit deze zak en nooit een die in het geheugen zit (als er keus is).
function trek(c, soort, wie) {
  const pool = (COMMENTAAR[soort] || LEEG)[wie] || [];
  if (!pool.length) return null;
  const sleutel = `${soort}:${wie}`;
  let zak = c.zak[sleutel];
  if (!zak || !zak.length) {
    zak = pool.map((_, i) => i);
    for (let i = zak.length - 1; i > 0; i--) { const j = Math.floor(c.rng() * (i + 1)); [zak[i], zak[j]] = [zak[j], zak[i]]; }
    if (zak.length > 1 && zak[zak.length - 1] === c.laatsteIndex[sleutel]) zak.unshift(zak.pop()); // de eerstvolgende (aan het eind) is niet de vorige
    c.zak[sleutel] = zak;
  }
  const past = (k) => !c.mijd || !c.mijd.test(pool[zak[k]]);
  let kies = -1;
  for (let k = zak.length - 1; k >= 0; k--) { if (past(k) && !c.geheugen.includes(pool[zak[k]])) { kies = k; break; } }
  if (kies < 0) for (let k = zak.length - 1; k >= 0; k--) { if (past(k)) { kies = k; break; } }
  if (kies < 0 && c.mijd && pool.some((t) => !c.mijd.test(t))) { delete c.zak[sleutel]; return trek(c, soort, wie); }   // de zak heeft alleen nog gemeden regels: opnieuw schudden
  if (kies < 0) kies = zak.length - 1;
  const idx = zak.splice(kies, 1)[0];
  c.laatsteIndex[sleutel] = idx;
  const tekst = pool[idx];
  c.geheugen.push(tekst); if (c.geheugen.length > MEMORY) c.geheugen.shift();
  return tekst;
}

const scoreText = (s) => `${s[0]}-${s[1]}`;
function varsVan(c, ctx, extra = {}) {
  const sc = ctx && ctx.score ? ctx.score : [0, 0];
  return { stand: scoreText(sc), team: c.teams[0], ander: c.teams[1], ...extra };
}

// Zet een entry in de rij: wie spreekt, na hoeveel seconden. Geeft de entry of null als hij door de drukte vervalt.
function plan(c, soort, wie, vars, vertraging = 0) {
  const tekst = trek(c, soort, wie);
  if (!tekst) return null;
  const entry = { soort, wie, naam: COMMENTATOREN[wie].naam, stem: COMMENTATOREN[wie].stem, tekst: vulSjabloon(tekst, vars), sjabloon: isSjabloon(tekst), sleutel: stemSleutel(wie, tekst), vertraging, prio: (KINDS[soort] || { prio: 1 }).prio };
  c.rij.push(entry);
  return entry;
}

const ander = (wie) => (wie === 'h' ? 'r' : 'h');
// Het seizoen in de carrière (ctx.carriere, voetbalcarriere.js commentaryContext): na de aftrap een regel over de ronde of de plek in de stand, daarna het debuut of de sponsor. Hilbrand opent, Roelie reageert met een kans.
function seasonLines(c, ctx, uit) {
  const k = ctx.carriere;
  const vars = varsVan(c, ctx, { ronde: k.ronde, rondes: k.rondes, divisie: k.divisie, speler: k.naam, sponsor: k.sponsor || '' });
  let kindId = 'seizoenRonde';
  if (k.kind === 'cup') kindId = 'bekerWedstrijd';
  else if (k.kind === 'europe') kindId = 'europaWedstrijd';
  else if (k.laatste) kindId = 'seizoenLaatste';
  else if (k.rank && k.rank <= 2) kindId = 'seizoenTop';
  else if (k.rank && k.clubs && k.rank >= k.clubs - 1) kindId = 'seizoenBodem';
  const queue = [kindId];
  if (k.debuut) queue.push('carriereDebuut'); else if (k.sponsor && (k.ronde | 0) % 2 === 1) queue.push('sponsorRegel');
  let at = ctx.derby ? 10 : 6.5;
  for (const s of queue) {
    const a = plan(c, s, 'h', vars, at); if (a) uit.push(a);
    if (a && c.rng() < (KINDS[s] || { kans: 0.3 }).kans) { const b = plan(c, s, 'r', vars, at + 2.4); if (b) uit.push(b); }
    at += 8;
  }
}
// Een gebeurtenis van de sim in commentaar. Geeft de geplande regels (ook in c.rij; tikCommentaar speelt ze af).
export function commentaarVoor(c, e, ctx = {}) {
  const uit = [];
  const kindChance = (s) => (KINDS[s] || { kans: 0.3 }).kans;
  const zeg = (soort, extra = {}, eerste = 'h') => {
    const p = KINDS[soort] || { prio: 1 };
    if (p.prio < 3) {
      const interval = KIND_INTERVAL[soort] || 0;
      if (interval && c.t - (c.laatsteSoort[soort] ?? -999) < interval) return;
      if (c.sinds < MIN_TUSSEN[p.prio] || c.rij.some((r) => r.prio >= p.prio)) return;
    } else c.rij = c.rij.filter((r) => r.prio >= 3);    // belangrijk nieuws gaat voor: de rij met kleine dingen vervalt
    const vars = varsVan(c, ctx, extra);
    const a = plan(c, soort, eerste, vars, 0);
    if (!a) return;
    uit.push(a); c.laatsteSoort[soort] = c.t;
    if (c.rng() < kindChance(soort)) { const b = plan(c, soort, ander(eerste), vars, 2.2 + c.rng() * 1.2); if (b) uit.push(b); }
  };
  const nameOf = (id) => (ctx.naamVan ? ctx.naamVan(id) : null) || '';
  const t0 = (team) => (team === 0);
  switch (e.type) {
    case 'aftrap': {
      if (!c.flags.start && (!ctx.helft || ctx.helft === 1)) {
        c.flags.start = true;
        zeg('start');
        if (ctx.derby) { const d = plan(c, 'derby', 'h', varsVan(c, ctx), 6.5); if (d) uit.push(d); }
        if (ctx.carriere) seasonLines(c, ctx, uit);
      } else if (ctx.helft === 2 && !c.flags.tweede) { c.flags.tweede = true; zeg('tweedeHelft'); }
      break;
    }
    case 'goal': {
      const t = e.team, sc = e.stand || ctx.score || [0, 0], spk = e.speler >= 0 ? nameOf(e.speler) : '';
      const vorigVerschil = (c.scorePrev[t] - c.scorePrev[1 - t]);
      c.scorePrev = sc.slice();
      if (e.eigen) { zeg('goalEigen', { speler: spk, team: c.teams[t] }); break; }
      if (vorigVerschil < 0 && sc[t] === sc[1 - t]) { zeg('comeback', { speler: spk, team: c.teams[t] }, 'h'); break; }
      if (ctx.carriere && t0(t) && spk && spk === ctx.carriere.naam) { zeg('sterGoal', { speler: spk, team: c.teams[t] }, 'h'); break; }
      zeg(t0(t) ? 'goalThuis' : 'goalUit', { speler: spk, team: c.teams[t] }, 'h');
      break;
    }
    case 'redding': zeg('redding', {}, c.rng() < 0.7 ? 'h' : 'r'); break;
    case 'paal': case 'lat': zeg('paal'); break;
    case 'schop': if (e.soort === 'schot') zeg(e.sterkte > 0.65 ? 'kans' : 'schot'); break;
    case 'hervat': {
      const kind = e.kind, team = e.team;
      const kindKey = { hoek: 'hoek', inworp: 'ingooi', doelschop: 'doelschop', vrij: 'vrij', strafschop: 'strafschop' }[kind];
      if (kindKey) zeg(kindKey, { team: c.teams[team] });
      break;
    }
    case 'overtreding': zeg('overtreding'); break;
    case 'kaart': zeg(e.kleur === 'rood' ? 'rood' : 'geel', { speler: nameOf(e.speler), team: c.teams[e.team] }, e.kleur === 'rood' ? 'h' : (c.rng() < 0.6 ? 'h' : 'r')); break;
    case 'blessure': zeg('blessure', { speler: nameOf(e.speler), team: c.teams[e.team] }); break;
    case 'wisselspeler': zeg('wissel', { speler: e.in, team: c.teams[e.team] }); break;
    case 'buitenspel': zeg('buitenspel'); break;
    case 'uit': zeg('uit'); break;
    case 'fluit': if (e.helft === 1) zeg('rust'); break;
    case 'einde': zeg(e.winnaar === 0 ? 'eindWinst' : e.winnaar < 0 ? 'eindGelijk' : 'eindVerlies'); break;
    default: break;
  }
  return uit;
}

// Elke tik: de rij afspelen (retourneert de regels die nu klinken) en in rustige minuten vulling of een situatieregel plannen.
export function tikCommentaar(c, dt, ctx = {}) {
  c.t += dt; c.sinds += dt;
  const klinkt = [];
  for (const r of c.rij) r.vertraging -= dt;
  while (c.rij.length) {
    const r = c.rij.find((x) => x.vertraging <= 0);
    if (!r) break;
    c.rij.splice(c.rij.indexOf(r), 1);
    if (r.prio < 3 && c.sinds < MIN_TUSSEN[r.prio] && r.vertraging > -0.5) { c.rij.unshift({ ...r, vertraging: 0.4 }); break; } // even wachten
    c.sinds = 0; c.laatsteWie = r.wie; c.gezegd++;
    c.logboek.push({ t: c.t, wie: r.wie, soort: r.soort, tekst: r.tekst }); if (c.logboek.length > 80) c.logboek.shift();
    klinkt.push(r);
  }
  if (ctx.fase === 'spel' && !c.rij.length) {
    const clockPlayed = ctx.helft && ctx.duurHelft != null ? ctx.duurHelft - ctx.klok : 0;
    const sc = ctx.score || [0, 0];
    if (ctx.helft === 2 && ctx.klok != null && ctx.klok < ctx.duurHelft * 0.12 && !c.flags.laatste) { c.flags.laatste = true; const a = plan(c, 'laatsteMinuut', 'h', varsVan(c, ctx), 0); if (a && c.rng() < 0.6) plan(c, 'laatsteMinuut', 'r', varsVan(c, ctx), 2.4); }
    else if (ctx.helft && Math.abs(sc[0] - sc[1]) <= 1 && sc[0] + sc[1] > 0 && clockPlayed > ctx.duurHelft * 0.55 && !c.flags.spanning[ctx.helft]) { c.flags.spanning[ctx.helft] = true; plan(c, 'spanning', 'h', varsVan(c, ctx), 0); }
    else if (c.sinds > 13 + c.rng() * 5) {
      const bz = ctx.bezit;
      if (bz && c.t - c.flags.bezit > 90 && (bz[0] > 62 || bz[1] > 62)) { c.flags.bezit = c.t; plan(c, bz[0] > 62 ? 'bezitThuis' : 'bezitUit', c.rng() < 0.6 ? 'h' : 'r', varsVan(c, ctx), 0); }
      else plan(c, 'vulling', c.laatsteWie === 'h' ? 'r' : 'h', varsVan(c, ctx), 0);
    }
  }
  return klinkt;
}

// De Man van de match is een los moment na het eindsignaal (de samenvatting).
export function commentMvp(c, naam) {
  c.rij = c.rij.filter((r) => r.prio >= 3);
  const vars = { speler: naam };
  const a = plan(c, 'manOfTheMatch', 'h', vars, 0);
  if (a && c.rng() < 0.8) plan(c, 'manOfTheMatch', 'r', vars, 2.6);
  return c.rij.slice();
}
export const derbyVan = (idA, idB) => isDerby(idA, idB);
