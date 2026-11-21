// De computerspelers van de voetbalwedstrijd (#981): puur, zonder DOM en zonder THREE (scripts/voetbal_test.mjs). Teamgenoten en tegenstanders gebruiken dezelfde code; de stand
// (reactietijd, snelheid, schotafwijking, keeper, tackle) komt uit voetbalrules.js. Een speler heeft een rol (keeper, verdediger, aanvaller) en een plek in de vorming die met de bal
// meeschuift; wie het dichtst bij de bal staat zet druk of rent erachteraan; wie de bal heeft dribbelt, schiet of speelt over. Dit bestand beslist alleen: voetbalmatch.js voert uit.
import { PITCH, LOOP, richtingVan, ownGoalY, opponentGoalY, formationSpot, inStrafschop, kl, drukZetters } from './voetbalrules.js';
import { crossLine, ballSpeed } from './voetbalbal.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const NIETS = Object.freeze({ dx: 0, dy: 0, sprint: false, tackle: false, kick: null, duik: null });

const naar = (p, tx, ty, { sprint = false, stop = 0.35 } = {}) => {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d < stop) return { dx: 0, dy: 0, sprint: false, tackle: false, kick: null, duik: null };
  const v = Math.min(1, (d - stop) / 1.6 + 0.15);
  return { dx: dx / d * v, dy: dy / d * v, sprint, tackle: false, kick: null, duik: null };
};

const teamgenoten = (m, p) => m.spelers.filter((q) => q.team === p.team && q !== p);
const opponents = (m, p) => m.spelers.filter((q) => q.team !== p.team);

// Hoe vrij is de lijn van a naar b: de kleinste afstand van een tegenstander tot dat lijnstuk.
function vrijheid(m, a, b, team) {
  const vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy || 1;
  let min = 99;
  for (const o of m.spelers) {
    if (o.team === team) continue;
    const t = kl(((o.x - a.x) * vx + (o.y - a.y) * vy) / l2, 0, 1);
    const d = Math.hypot(a.x + vx * t - o.x, a.y + vy * t - o.y);
    if (d < min) min = d;
  }
  return min;
}

// De beste ontvanger voor een pass van p: vooruit en vrij scoort hoog. null als niemand goed ligt. Ook voor een mens die richt (de pass wijst naar de beste in zijn richting).
export function besteOntvanger(m, p, { richting = null, geenKeeper = true, minScore = 0.25 } = {}) {
  const dir = richtingVan(p.team);
  let best = null, bs = minScore;
  for (const q of teamgenoten(m, p)) {
    if (geenKeeper && q.rol === 'keeper' && p.rol !== 'keeper') continue;
    const vx = q.x - p.x, vy = q.y - p.y, d = Math.hypot(vx, vy);
    if (d < 2.2 || d > PITCH.L * 0.57) continue;
    let s;
    if (richting) {
      const c = (vx * richting.x + vy * richting.y) / d;
      if (c < 0.7) continue; // binnen ongeveer 45 graden van waar de speler heen wijst
      s = c * 1.2 - d * 0.012;
    } else s = ((vy * dir) / d) * 0.55 + Math.min(d, 12) * 0.02;
    const open = vrijheid(m, p, q, p.team);
    s += open > 2.4 ? 0.5 : open > 1.4 ? 0.15 : -1;
    if (!richting && Math.abs(q.y - opponentGoalY(p.team)) < 7) s += 0.2; // wie bij het doel staat
    if (s > bs) { bs = s; best = q; }
  }
  return best;
}

// De kracht (0..1) van een grondpass of voorzet naar een afstand, in dezelfde eenheid als het menselijke laden (voetbalmatch.js schopt uit die kracht).
const passPower = (d) => kl((d - 2) / (PITCH.L * 0.62) + 0.2, 0.2, 1);

function dichtstbij(m, p, lijst) {
  let best = null, bd = Infinity;
  for (const q of lijst) { const d = dist(p, q); if (d < bd) { bd = d; best = q; } }
  return { q: best, d: bd };
}

// Rang van p onder zijn team qua afstand tot de bal (0 = het dichtst), keeper niet meegerekend. De mens-bestuurde spelers tellen mee: die zijn al onderweg.
function balRang(m, p) {
  let rang = 0;
  const dp = Math.hypot(p.x - m.bal.x, p.y - m.bal.y);
  for (const q of m.spelers) {
    if (q === p || q.team !== p.team || q.rol === 'keeper') continue;
    const dq = Math.hypot(q.x - m.bal.x, q.y - m.bal.y);
    if (dq < dp - 1e-6 || (Math.abs(dq - dp) <= 1e-6 && q.id < p.id)) rang++;
  }
  return rang;
}

// De intentie van een computerspeler voor deze stap.
export function aiIntentie(m, p, dt) {
  const lv = m.ai[p.team];
  p.besluitT = Math.max(0, p.besluitT - dt);
  if (m.fase === 'goal' || m.fase === 'rust' || m.fase === 'eind' || m.fase === 'intro') return NIETS;
  const bal = m.bal, drager = bal.owner >= 0 ? m.spelers[bal.owner] : null;
  if (p.rol === 'keeper') return keeperIntentie(m, p, dt, lv, drager);
  if (drager === p) return dragerIntentie(m, p, lv);
  const aanval = !!drager && drager.team === p.team;
  const rang = balRang(m, p);
  const spot = formationSpot(p.team, p.i, bal, aanval, m.fase === 'aftrap', m.tac[p.team]);
  if (m.fase !== 'spel' && m.fase !== 'goal') return naar(p, spot.x, spot.y, { sprint: false });
  if (drager && !aanval) { // de tegenstander heeft de bal: de twee dichtstbijzijnden zetten druk, de rest houdt de lijn
    if (rang < drukZetters(m.tac[p.team].stijl)) {
      const vt = 0.3;
      const tx = drager.x + drager.vx * vt, ty = drager.y + drager.vy * vt;
      const d = dist(p, drager);
      const it = naar(p, tx, ty, { sprint: d > 3.5, stop: 0.5 });
      if (d < 1.3 && p.tackleCd <= 0 && p.stun <= 0 && p.besluitT <= 0) {
        p.besluitT = lv.reactie * (0.8 + m.rng() * 0.8);
        if (m.rng() < lv.tackle) it.tackle = true;
      }
      return it;
    }
    // een tegenstander in de buurt dekken: tussen hem en het eigen doel
    return naar(p, spot.x, spot.y, { sprint: dist(p, spot) > 6 });
  }
  if (!drager) { // een losse bal: de dichtstbijzijnde van het team gaat erop af
    if (rang === 0 || (rang === 1 && dist(p, bal) < 5) || (rang === 2 && PITCH.L > 60 && dist(p, bal) < 8)) {
      const t = 0.22;
      return naar(p, bal.x + bal.vx * t, bal.y + bal.vy * t, { sprint: dist(p, bal) > 2.5, stop: 0.2 });
    }
    return naar(p, spot.x, spot.y, { sprint: dist(p, spot) > 6 });
  }
  // een teamgenoot heeft de bal: een vrije plek zoeken, aanvallers vooruit
  return naar(p, spot.x, spot.y, { sprint: dist(p, spot) > 7 });
}

// De bal aan de voet: schieten, overspelen of doorlopen.
function dragerIntentie(m, p, lv) {
  const dir = richtingVan(p.team), gy = opponentGoalY(p.team);
  const dgoal = Math.hypot(p.x, gy - p.y);
  const voor = (gy - p.y) * dir > 0;
  const { d: druk } = dichtstbij(m, p, opponents(m, p));
  const wachtOpHervatting = m.fase !== 'spel';
  if (wachtOpHervatting) {
    if (p.besluitT > 0 || (m.hervat && m.hervat.t < m.hervat.pauze)) return NIETS;
    const q = besteOntvanger(m, p, { minScore: -9 }) || teamgenoten(m, p).find((x) => x.rol !== 'keeper') || null;
    p.besluitT = lv.reactie;
    if (!q) return { ...NIETS, kick: { soort: 'pass', kracht: 0.5, dx: 0, dy: dir, doel: -1 } };
    return kopieer(p, q, m.hervat && (m.hervat.kind === 'hoek' || m.hervat.kind === 'doelschop') && dist(p, q) > PITCH.L * 0.29);
  }
  const runTime = p.balT;
  let it = null;
  if (p.besluitT <= 0) {
    p.besluitT = lv.reactie * (0.6 + m.rng() * 0.7);
    // schieten: dichtbij genoeg en met het gezicht naar het doel
    if (voor && dgoal < PITCH.L * (PITCH.L > 60 ? 0.24 : 0.32) && Math.abs(p.x) < PITCH.B * 0.33) {
      const chance = 0.45 + (druk < 2 ? 0.3 : 0) + (dgoal < PITCH.L * 0.15 ? 0.25 : 0);
      if (m.rng() < chance * Math.min(1.2, lv.durf)) {
        const keeper = m.spelers.find((q) => q.team !== p.team && q.rol === 'keeper');
        const kant = keeper ? (keeper.x > 0.4 ? -1 : keeper.x < -0.4 ? 1 : (m.rng() < 0.5 ? -1 : 1)) : 1;
        const ax = kant * (PITCH.DOEL_B / 2) * (0.5 + 0.35 * m.rng());
        const dx = ax - p.x, dy = gy - p.y, l = Math.hypot(dx, dy) || 1;
        return { ...NIETS, kick: { soort: 'schot', kracht: 0.78 + 0.22 * m.rng(), dx: dx / l, dy: dy / l, doel: -1 } };
      }
    }
    // overspelen: onder druk, te lang aan de bal, of een vrije maat die verder staat
    if (druk < 2.6 || runTime > 2.6 || m.rng() < 0.14) {
      const q = besteOntvanger(m, p, { minScore: druk < 1.8 ? -0.3 : 0.45 });
      if (q) return kopieer(p, q, dist(p, q) > PITCH.L * 0.33);
    }
    // een lange bal naar voren vanaf de eigen helft als er niets beters is
    if (druk < 1.6 && (p.y - ownGoalY(p.team)) * dir < PITCH.L * 0.3 && m.rng() < 0.5) return { ...NIETS, kick: { soort: 'lang', kracht: 0.7, dx: 0, dy: dir, doel: -1 } };
  }
  // doorlopen naar het doel, om de dichtstbijzijnde tegenstander heen
  const { q: opp, d: od } = dichtstbij(m, p, opponents(m, p));
  let tx = kl(p.x, -(PITCH.B / 2) + 2, (PITCH.B / 2) - 2) * 0.7, ty = gy;
  if (opp && od < 4.2 && (opp.y - p.y) * dir > -0.5) tx = p.x + (p.x >= opp.x ? 1 : -1) * 4;
  it = naar(p, kl(tx, -(PITCH.B / 2) + 1.5, (PITCH.B / 2) - 1.5), ty, { sprint: p.stamina > 0.35 && (!opp || od > 1.5), stop: 0.2 });
  return it;
}

function kopieer(p, q, lang) {
  const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
  return { ...NIETS, kick: { soort: lang ? 'lang' : 'pass', kracht: passPower(d), dx: dx / d, dy: dy / d, doel: q.id } };
}

function keeperIntentie(m, p, dt, lv, drager) {
  const dir = richtingVan(p.team), yg = ownGoalY(p.team), bal = m.bal;
  const speed = LOOP.keeper * lv.tempo;
  if (drager === p) { // vast: na een korte pauze overgooien of uittrappen
    if (m.fase !== 'spel' && m.hervat && m.hervat.t < m.hervat.pauze) return NIETS;
    if (p.houdT < lv.reactie + 0.9) return NIETS;
    const q = besteOntvanger(m, p, { geenKeeper: true, minScore: -9 }) || teamgenoten(m, p).find((x) => x.rol !== 'keeper');
    if (!q) return { ...NIETS, kick: { soort: 'lang', kracht: 0.8, dx: 0, dy: dir, doel: -1 } };
    return kopieer(p, q, dist(p, q) > PITCH.L * 0.26);
  }
  if (m.fase !== 'spel') { const h = formationSpot(p.team, 0, bal, false, true, m.tac[p.team]); return naar(p, h.x, h.y, { stop: 0.2 }); }
  // voorspel waar de bal de doellijn kruist (een paar keer per seconde)
  p.voorspelT -= dt;
  if (p.voorspelT <= 0) {
    p.voorspelT = 0.08;
    const komt = bal.vy * dir < -1.5 && !bal.dood && bal.owner < 0;
    p.voorspel = komt ? crossLine(bal, yg, 1.6) : null;
  }
  const v = p.voorspel;
  if (v && Math.abs(v.x) < (PITCH.DOEL_B / 2) + 0.5 && v.z < 1.9) {
    const it = naar(p, v.x, yg + dir * 0.9, { sprint: true, stop: 0.12 });
    const verschil = v.x - p.x;
    if (v.t < 0.55 && Math.abs(verschil) > 0.7 && p.duikT <= 0 && p.besluitT <= 0) {
      p.besluitT = 0.4;
      if (m.rng() < 0.3 + 0.7 * lv.keeper * (PITCH.L > 60 ? 0.78 : 1)) it.duik = { dx: Math.sign(verschil), dy: 0 };
    }
    return it;
  }
  // een langzame losse bal in de eigen zestien die niemand eerder heeft: erop af
  if (!drager && ballSpeed(bal) < 5 && inStrafschop(p.team, bal.x, bal.y) && dist(p, bal) < 6) {
    let eerder = false;
    for (const q of m.spelers) if (q !== p && q.team !== p.team && dist(q, bal) < dist(p, bal) - 0.3) eerder = true;
    if (!eerder) return naar(p, bal.x, bal.y, { sprint: true, stop: 0.2 });
  }
  const distance = Math.hypot(bal.x, bal.y - yg);
  const diepte = kl(1.0 + Math.max(0, 14 - distance) * 0.11, 0.8, 2.6);
  return naar(p, kl(bal.x * 0.42, -(PITCH.DOEL_B / 2) + 0.3, (PITCH.DOEL_B / 2) - 0.3), yg + dir * diepte, { stop: 0.15 });
}
