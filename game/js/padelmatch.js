// Samen spelen (#443): padel tegen elkaar, 2 tegen 2 (met twee spelers: 1 tegen 1 met een AI-maatje; met drie: 2 tegen 1 + AI-maatje).
// Pure logica, zonder three.js en zonder DOM (scripts/coopwedstrijd_padel_test.mjs). De regels komen uit padelrules.js, de afmetingen en het
// slaan uit padel.js (de solowedstrijd); hier is alles zij-onafhankelijk: team 0 staat op v < 0, team 1 op v > 0, "vooruit" is naar het net.
// Host-autoritair: wie het spel opende rekent de bal en alle stoelen uit met de invoer van elke speler (stick en Spatie, dezelfde bytes als bij
// het besturen van een voertuig); ongeveer 12 keer per seconde gaat een compacte momentopname naar de gasten (snapPadel), die hem vloeiend
// tekenen (maakPadelSpiegel). Een stoel zonder speler (maatje of wie wegviel) wordt door de AI gespeeld; wie wegvalt krijgt niets en de rest
// speelt door. Valt een hele ploeg weg, dan wint de andere ploeg met de hand op de rug.
import { clamp } from './minigamekit.js';
import { COURT, scorePoint, judgeServeHit, serveInBox, serveFault, wallKind, judgeWall } from './padelrules.js';

export const GAMES_TE_WINNEN = 3;   // een korte set: wie het eerst drie games heeft
export const MATCH_CAP = 300;       // daarna een beslissend punt
export const PRIJZEN_PADEL = [0, 80, 40]; // geld per plek (1 = winnaars, 2 = verliezers), in de eigen portemonnee
export const STAND_HZ = 12;
export const FASEN = ['intro', 'serve', 'rally', 'point', 'outro', 'klaar'];
export const MAX_SPELERS_PADEL = 4;
const W2 = COURT.W / 2, L2 = COURT.L / 2, NET_H = COURT.NET_H, BALL_R = 0.05, G = 9.8;
const REACH = 1.45, REACH_Z = 2.4, LATE_S = 0.15, SWING_T = 0.32, SWING_BUF = 0.24;
const SPEED_MENS = 5.8, SPEED_AI = 4.3, SPEED_MAATJE = 3.2;
const INTRO_S = 2.6, POINT_S = 1.5, OUTRO_S = 1.2;
const AI = { miss: 0.03, err: 0.05, smash: 0.4, pace: 1.4 };
const AI_NAMEN = ['Hinderk', 'Grietje'];
const fin = (x) => Number.isFinite(x);
const q2 = (x, d = 2) => { const m = 10 ** d; return Math.round((Number(x) || 0) * m) / m; };
const kant = (team) => (team === 0 ? -1 : 1);   // het teken van v op de helft van de ploeg
const vooruit = (team) => -kant(team);           // de richting van de ploeg naar het net (en de tegenstander)
const sideOf = (v) => (v < 0 ? 0 : 1);

// De stoelen: de mensen verdelen zich over twee ploegen (host links, de eerste gast tegenover, dan om en om); lege stoelen krijgen een AI-naam.
export function indeling(deeln) {
  const mens = (deeln || []).slice(0, MAX_SPELERS_PADEL);
  const volgorde = [[0, 0], [1, 0], [0, 1], [1, 1]];
  let ai = 0;
  return volgorde.map(([team, idx], i) => {
    const d = mens[i];
    return { team, idx, slot: d ? d.slot : null, naam: d ? d.naam : AI_NAMEN[ai++ % AI_NAMEN.length], char: d ? d.char || null : null };
  });
}
export const ploegNaam = (stoelen, team) => {
  const n = stoelen.filter((s) => s.team === team && s.slot !== null).map((s) => s.naam);
  return n.length ? n.join(' en ') : 'het AI-team';
};

function maakStoel(i, st) {
  const f = vooruit(st.team);
  const u = (st.idx ? -2.2 : 1.5) * f, v = kant(st.team) * (st.idx ? 2.6 : 8.4);
  return { ...st, i, u, v, hu: st.idx ? u : -f * 2.3, hv: v, speed: 0, swing: 0, buf: 0, prevSw: false, sinceHot: 9, weg: false };
}

export function maakPadel(deeln, { rng = Math.random, gamesTeWinnen = GAMES_TE_WINNEN } = {}) {
  const m = {
    fase: 'bezig', phase: 'intro', phaseT: INTRO_S, t: 0, n: 0, rng, gamesTeWinnen,
    stoelen: indeling(deeln).map((s, i) => maakStoel(i, s)),
    games: [0, 0], points: [0, 0], serveTeam: 0, serveIdx: [0, 0], server: 0, serverStoel: null, faults: 0, rally: 0, bestRally: 0,
    capped: false, lastWinner: -1, ball: null, pred: null, chaser: null, aiMiss: false, shotQ: 0.5, late: 0, flash: null, ev: [], winnaar: null, opruimen: 0,
  };
  m.namen = [ploegNaam(m.stoelen, 0), ploegNaam(m.stoelen, 1)];
  return m;
}
const rand = (m, a, b) => a + (b - a) * m.rng();
const mens = (s) => s.slot !== null && !s.weg;
const stoelenVan = (m, team) => m.stoelen.filter((s) => s.team === team);
export const mensenVan = (m, team) => stoelenVan(m, team).filter(mens);

export function verlaatPadel(m, slot) {
  const s = m.stoelen.find((x) => x.slot === slot);
  if (!s || s.weg || m.fase !== 'bezig') return false;
  s.weg = true; m.n++;
  return true;
}

const newBall = (u, v, z) => ({ u, v, z, vu: 0, vv: 0, vz: 0, hitter: -1, bounces: 0, crossed: false, live: false });

function serveSetup(m) {
  const team = m.serveTeam, F = vooruit(team), ontv = 1 - team;
  m.server = team;
  const sgn = (m.points[0] + m.points[1]) % 2 ? -1 : 1;
  const lijst = stoelenVan(m, team), server = lijst[m.serveIdx[team] % 2], maat = lijst[(m.serveIdx[team] + 1) % 2];
  m.serverStoel = server.i;
  server.u = F * 2.2 * sgn; server.v = kant(team) * 9.2;
  maat.u = -F * 2.2 * sgn; maat.v = kant(team) * 2.6;
  const ontvangers = stoelenVan(m, ontv);
  ontvangers[0].u = -server.u; ontvangers[0].v = kant(ontv) * 8.5; // de achterste ontvanger staat aan de diagonale kant van de serve
  ontvangers[1].u = server.u; ontvangers[1].v = kant(ontv) * 2.6;
  m.phase = 'serve';
  m.phaseT = mens(server) ? 6 : rand(m, 0.9, 1.4);
  m.ball = null; m.rally = 0; m.chaser = null;
  for (const s of m.stoelen) { s.buf = 0; s.sinceHot = 9; }
}

function hitBall(m, stoel, ut, vt, T, fault = false, q = 0.5) {
  const b = m.ball, side = stoel.team;
  m.shotQ = q;
  b.serve = false; // een return is geen serve meer (de serve zet de vlag na zijn eigen slag)
  b.hitter = side; b.bounces = 0; b.crossed = false; b.live = true;
  if (fault) { vt = side === 0 ? -0.6 : 0.6; T = 0.55; }
  let t = T;
  for (let k = 0; k < 12; k++) {
    b.vu = (ut - b.u) / t;
    b.vv = (vt - b.v) / t;
    b.vz = (BALL_R - b.z + 0.5 * G * t * t) / t;
    if (fault) break;
    const tc = -b.v / b.vv;
    if (!(tc > 0 && tc < t)) break;
    const zc = b.z + b.vz * tc - 0.5 * G * tc * tc;
    if (zc > NET_H + 0.18) break;
    t += 0.1;
  }
  stoel.swing = SWING_T;
  m.rally++; m.bestRally = Math.max(m.bestRally, m.rally);
  voorspel(m);
  m.ev.push({ type: 'pala', team: side, q: q2(q) });
}

function simulate(b, maxT = 3) {
  const s = { ...b };
  const h = 0.02;
  let first = null;
  for (let t = 0; t < maxT; t += h) {
    const v0 = s.v;
    s.u += s.vu * h; s.v += s.vv * h; s.z += s.vz * h; s.vz -= G * h;
    if ((v0 < 0) !== (s.v < 0) && s.z < NET_H) { s.v = v0; s.vv *= -0.2; }
    if (s.z < BALL_R && s.vz < 0) {
      s.z = BALL_R; s.vz = -s.vz * 0.7; s.vu *= 0.86; s.vv *= 0.86; s.bounces++;
      if (!first) first = { u: s.u, v: s.v };
      if (s.bounces >= 2) break;
    }
    if (Math.abs(s.u) > W2) { s.u = Math.sign(s.u) * W2; s.vu *= -0.72; }
    if (Math.abs(s.v) > L2) { s.v = Math.sign(s.v) * L2; s.vv *= -0.72; }
    if (s.bounces === 1 && s.z > 0.55 && s.z < 1.35 && s.vz < 1.5) return { u: s.u, v: s.v, t, first };
  }
  return { u: s.u, v: s.v, t: maxT, first };
}

// Na elke slag: welke AI-stoel van de ontvangers de bal gaat halen (alleen als hij dichterbij is dan elke mens van die ploeg) en of hij hem mist.
function voorspel(m) {
  const b = m.ball, r = simulate({ ...b, bounces: 0 });
  m.pred = r;
  const ontv = 1 - b.hitter, afst = (s) => Math.hypot(s.u - r.u, s.v - r.v);
  const ais = stoelenVan(m, ontv).filter((s) => !mens(s));
  const mensen = mensenVan(m, ontv);
  const cand = ais.reduce((a, c) => (!a || afst(c) < afst(a) ? c : a), null);
  const best = mensen.reduce((a, c) => Math.min(a, afst(c)), Infinity);
  m.chaser = cand && (!mensen.length || afst(cand) < best * 0.8) ? cand : null;
  if (m.chaser) {
    const far = afst(m.chaser) / (m.chaser.idx ? SPEED_MAATJE + 1 : SPEED_AI) > r.t + 0.15;
    m.aiMiss = far ? m.rng() < 0.55 : m.rng() < Math.min(0.9, AI.miss + m.rally * 0.02 + Math.max(0, m.shotQ - 0.6) * 0.7);
  }
}

const inReach = (s, b) => b && b.live && Math.hypot(b.u - s.u, b.v - s.v) < REACH && b.z < REACH_Z && b.z > 0.08;

// Een mens slaat: de richting van zijn stick (in zijn eigen richting: links, rechts, diep, kort) en de kwaliteit van zijn timing.
function menselijkeSlag(m, stoel, r) {
  const b = m.ball, F = vooruit(stoel.team);
  const d = Math.hypot(b.u - stoel.u, b.v - stoel.v);
  const dq = 1 - Math.abs(d - 0.75) / 0.8, hq = 1 - Math.abs(b.z - 1.05) / 1.35;
  const q = clamp(0.55 * clamp(dq, 0, 1) + 0.45 * clamp(hq, 0, 1) + (b.bounces && b.vz < 0 ? 0.1 : 0) - (m.late || 0), 0, 1);
  const mx = r.mx, vw = r.vw;
  const tegen = stoelenVan(m, 1 - stoel.team), gem = tegen.reduce((a, s) => a + s.u, 0) / tegen.length;
  let ut = mx > 0.35 ? F * 3.7 : mx < -0.35 ? -F * 3.7 : -Math.sign(gem || 1) * rand(m, 1.2, 3);
  let vtEigen = vw > 0.35 ? 8.8 : vw < -0.35 ? 3.4 : 6.6;
  const T = (vw > 0.35 ? 0.5 : 0) + 1.4 - 0.6 * q;
  ut += rand(m, -1, 1) * (1 - q) * 2.4;
  vtEigen += rand(m, -1, 1) * (1 - q) * 1.8;
  const fault = q < 0.16 && m.rng() < 0.55;
  hitBall(m, stoel, clamp(ut, -4.6, 4.6), F * clamp(vtEigen, 1.2, 9.6), T, fault, q);
  if (q > 0.85 && !fault) m.flash = { text: 'Mooi!', t: 0.8, small: true };
}

function aiSlag(m, stoel) {
  const T = stoel.team, F = vooruit(T);
  const tegen = stoelenVan(m, 1 - T), gem = tegen.reduce((a, s) => a + s.u, 0) / tegen.length;
  const q = rand(m, 0.4, 0.92);
  const weg = gem > 0 ? rand(m, -4.2, -1.2) : rand(m, 1.2, 4.2);
  const ut = m.rng() < 0.65 ? weg : rand(m, -4, 4);
  const lob = m.rng() < 0.2;
  if (m.rng() < AI.err + m.rally * 0.004) {
    if (m.rng() < 0.6) hitBall(m, stoel, ut, 0, 0.55, true);
    else hitBall(m, stoel, ut, F * 11.5, 0.9);
    return;
  }
  if (m.shotQ < 0.45 && m.rng() < AI.smash) {
    hitBall(m, stoel, weg, F * rand(m, 7.4, 9.2), rand(m, 0.85, 1));
    m.flash = { text: 'Smash!', t: 0.8, small: true };
    return;
  }
  hitBall(m, stoel, ut, F * rand(m, 4.2, 9), (lob ? 0.6 : 0) + AI.pace - 0.5 * q);
}

function punt(m, team, why = '') {
  if (m.phase !== 'rally' && m.phase !== 'serve') return;
  m.lastWinner = team;
  if (m.ball) m.ball.live = false;
  const r = scorePoint({ points: m.points, games: m.games }, team, m.gamesTeWinnen);
  m.points = r.points; m.games = r.games; m.faults = 0;
  if (r.gameWon) { m.serveTeam = 1 - m.serveTeam; m.serveIdx[m.serveTeam]++; }
  const over = r.over || m.capped;
  const wie = m.namen[team];
  m.flash = { text: over ? `Set voor ${wie}` : r.gameWon ? `Game voor ${wie}` : `Punt voor ${wie}`, why, t: POINT_S };
  m.phase = over ? 'outro' : 'point';
  m.phaseT = over ? OUTRO_S : POINT_S;
  m.n++;
  m.ev.push({ type: 'punt', team, why, game: r.gameWon, over });
}

function fout(m, why) {
  const f = serveFault(m.faults || 0);
  m.ball.live = false;
  if (f.double) { punt(m, 1 - m.server, 'Dubbele fout'); return; }
  m.faults = f.faults;
  m.flash = { text: 'Fout: tweede serve', why, t: POINT_S };
  m.ball = null; m.phase = 'serve';
  m.phaseT = mens(m.stoelen[m.serverStoel]) ? 6 : rand(m, 0.9, 1.4);
  m.rally = 0;
  m.ev.push({ type: 'fout', why });
}

function stepBall(m, dt) {
  const b = m.ball;
  if (!b || !b.live) return;
  const n = 4, h = dt / n;
  for (let i = 0; i < n && b.live; i++) {
    const v0 = b.v;
    b.u += b.vu * h; b.v += b.vv * h; b.z += b.vz * h;
    b.vz -= G * h;
    if ((v0 < 0) !== (b.v < 0)) {
      const into = sideOf(b.v);
      if (b.z < NET_H && b.serve && !b.serveOk) { fout(m, 'Serve in het net'); return; }
      if (b.z < NET_H) {
        b.v = v0 < 0 ? -0.06 : 0.06;
        b.vv *= -0.2; b.vu *= 0.5; b.vz = Math.min(b.vz, 0);
      } else if (into === b.hitter) {
        punt(m, b.hitter, 'Terug over het net'); return;
      } else b.crossed = true;
    }
    if (b.z < BALL_R) {
      b.z = BALL_R;
      if (b.vz < 0) {
        b.vz = -b.vz * 0.7; b.vu *= 0.86; b.vv *= 0.86;
        m.ev.push({ type: 'plop', u: b.u, v: b.v });
        const s = sideOf(b.v);
        if (b.serve && !b.serveOk) {
          if (s !== b.hitter && serveInBox(b.serveU, b.hitter, b.u, b.v)) b.serveOk = true;
          else { fout(m, s === b.hitter ? 'Serve in het net' : 'Serve buiten het vak'); return; }
        }
        if (s === b.hitter) { punt(m, 1 - b.hitter, b.crossed ? '' : 'In het net'); return; }
        if (++b.bounces >= 2) { punt(m, b.hitter, 'Twee keer gestuit'); return; }
      }
    }
    const wallU = Math.abs(b.u) > W2 - BALL_R, wallV = Math.abs(b.v) > L2 - BALL_R;
    if (wallU || wallV) {
      const s = sideOf(b.v);
      const j = judgeWall({ z: b.z, side: s, hitter: b.hitter, bounces: b.bounces });
      if (!j.play) {
        if (b.serve && !b.serveOk) { fout(m, 'Serve buiten het vak'); return; }
        punt(m, j.point, j.why); return;
      }
      const wk = wallKind(b.z);
      m.ev.push({ type: wk.kind === 'glas' ? 'glas' : 'gaas', u: b.u, v: b.v });
      if (wallU) { b.u = Math.sign(b.u) * (W2 - BALL_R); b.vu *= -wk.rest; b.vv *= 0.9; }
      if (wallV) { b.v = Math.sign(b.v) * (L2 - BALL_R); b.vv *= -wk.rest; b.vu *= 0.9; }
    }
  }
}

function beweeg(a, u, v, speed, dt) {
  const du = u - a.u, dv = v - a.v, d = Math.hypot(du, dv);
  const step = Math.min(d, speed * dt);
  if (d > 1e-3) { a.u += du / d * step; a.v += dv / d * step; }
  a.speed = dt > 0 ? step / dt : 0;
}

// De invoer van een mens: { mx, my, buttons } (my < 0 is vooruit, bit 1 (waarde 2) is Spatie) -> { mx, vw, sw }
const leesInvoer = (r) => ({ mx: r && fin(r.mx) ? clamp(r.mx, -1, 1) : 0, vw: r && fin(r.my) ? clamp(-r.my, -1, 1) : 0, sw: !!(r && (r.buttons | 0) & 2) });

// Een stap van de wedstrijd. invoer(slot) geeft { mx, my, buttons } van een mens (of null). Geeft de gebeurtenissen van deze stap terug.
export function tikPadel(m, dt, invoer) {
  m.ev = [];
  if (m.fase !== 'bezig') return m.ev;
  m.t += dt; m.phaseT -= dt;
  if (m.flash && (m.flash.t -= dt) <= 0) m.flash = null;
  if (m.t > MATCH_CAP && !m.capped) { m.capped = true; m.flash = { text: 'Beslissend punt!', t: 2 }; m.n++; }
  const inv = new Map();
  for (const s of m.stoelen) {
    if (mens(s)) {
      const r = leesInvoer(invoer ? invoer(s.slot) : null);
      inv.set(s.i, r);
      const F = vooruit(s.team), vastInServe = m.phase === 'serve' && m.serverStoel === s.i;
      if (!vastInServe) {
        const len = Math.hypot(r.mx, r.vw), k = len > 1 ? 1 / len : 1;
        s.u = clamp(s.u + F * r.mx * k * SPEED_MENS * dt, -W2 + 0.35, W2 - 0.35);
        s.v = kant(s.team) * clamp(kant(s.team) * (s.v + F * r.vw * k * SPEED_MENS * dt), 0.9, L2 - 0.4);
      }
      s.speed = len2(r) ? SPEED_MENS : 0;
      if (r.sw && !s.prevSw) { s.buf = SWING_BUF; if (s.swing <= 0) s.swing = SWING_T; } else s.buf = Math.max(0, s.buf - dt);
      s.prevSw = r.sw;
    } else s.prevSw = false;
  }
  if (m.phase === 'intro') {
    if (m.phaseT <= 0) serveSetup(m);
  } else if (m.phase === 'serve') {
    const server = m.stoelen[m.serverStoel], F = vooruit(server.team);
    if (!m.ball) {
      m.ball = newBall(server.u + F * 0.4, server.v + F * 0.3, 1.0);
      m.ball.toss = { wait: 0.5, bounced: false };
    }
    const tb = m.ball;
    if (tb.toss) {
      if ((tb.toss.wait -= dt) <= 0) {
        tb.vz -= G * dt; tb.z += tb.vz * dt;
        if (tb.z <= BALL_R) { tb.z = BALL_R; tb.vz = Math.abs(tb.vz) * 0.75; tb.toss.bounced = true; }
      }
      const klaar = judgeServeHit({ bounced: tb.toss.bounced, z: tb.z }) === 'ok';
      if (mens(server)) {
        if (server.buf > 0 && !klaar) server.buf = 0;
        if (klaar && (server.buf > 0 || m.phaseT <= 0)) {
          server.buf = 0;
          const r = inv.get(server.i) || { mx: 0 };
          hitBall(m, server, -Math.sign(server.u || 1) * 2.6 + F * r.mx * 3.0, F * rand(m, 3.5, 6.4), 1.2);
          m.ball.serve = true; m.ball.serveU = server.u; m.phase = 'rally';
        }
      } else if (klaar && m.phaseT <= 0) {
        const slip = m.rng() < 0.04;
        hitBall(m, server, -Math.sign(server.u || 1) * 2.6 + (slip ? Math.sign(server.u || 1) * 4 : 0), F * rand(m, 3.5, 6.4), 1.25);
        m.ball.serve = true; m.ball.serveU = server.u; m.phase = 'rally';
      }
    }
  } else if (m.phase === 'rally') {
    stepBall(m, dt);
    const b = m.ball;
    if (m.phase === 'rally' && b.live) {
      for (const s of m.stoelen) {
        if (!mens(s) || b.hitter === s.team) continue;
        const hot = b.crossed && inReach(s, b);
        s.sinceHot = hot ? 0 : s.sinceHot + dt;
        const late = !hot && b.crossed && s.sinceHot < LATE_S && b.z > 0.08 && b.z < REACH_Z;
        if ((hot || late) && s.buf > 0) {
          m.late = late ? 0.2 : s.swing < SWING_T - 0.12 ? 0.12 : 0;
          s.buf = 0;
          menselijkeSlag(m, s, inv.get(s.i));
          break;
        }
      }
      const c = m.chaser;
      if (m.phase === 'rally' && b.live && c && !m.aiMiss && b.hitter !== c.team && b.crossed) {
        const d = Math.hypot(b.u - c.u, b.v - c.v);
        if (d < 1.05 && b.z < 2.2 && b.z > 0.2 && (b.bounces === 1 || Math.abs(b.v) < 4)) aiSlag(m, c);
      }
    }
  } else if (m.phase === 'point') {
    if (m.phaseT <= 0) serveSetup(m);
  } else if (m.phase === 'outro') {
    if (m.phaseT <= 0) eindig(m);
  }
  // de AI-stoelen lopen: de aanvaller naar de bal, de rest naar zijn plek, het maatje naast zijn partner
  const b = m.ball;
  for (const s of m.stoelen) {
    if (mens(s)) continue;
    if (m.phase === 'serve' && m.serverStoel === s.i) { s.speed = 0; continue; }
    let tu = s.hu, tv = s.hv;
    const k = kant(s.team);
    if (m.phase === 'rally' && b && b.live && s === m.chaser && m.pred) { tu = m.pred.u + (s.u < m.pred.u ? -0.35 : 0.35); tv = k * Math.max(1.2, k * m.pred.v + 0.4); }
    else if (s.idx) {
      const maats = mensenVan(m, s.team)[0];
      tu = clamp(-Math.sign((maats ? maats.u : s.u) || 1) * 2.2 + (b ? b.u * 0.25 : 0), -4.3, 4.3); tv = k * 2.6;
    } else if (m.phase === 'rally' && b) tu = clamp(s.hu * 0.6 + b.u * 0.25, -4.5, 4.5);
    const sp = s.idx ? SPEED_MAATJE : SPEED_AI;
    beweeg(s, tu, tv, (m.phase === 'point' || m.phase === 'outro' ? 2 : sp) * (m.aiMiss && s === m.chaser ? 0.7 : 1), dt);
  }
  for (const s of m.stoelen) s.swing = Math.max(0, s.swing - dt);
  // een ploeg zonder mensen: de andere ploeg wint (niemand verliest iets bij wegvallen)
  if (m.fase === 'bezig' && m.phase !== 'outro') {
    const nu = [0, 1].filter((t) => mensenVan(m, t).length > 0);
    if (nu.length < 2) {
      m.winnaar = nu.length ? nu[0] : null; m.phase = 'outro'; m.phaseT = 0.5; m.n++;
      m.flash = nu.length ? { text: `${m.namen[nu[0]]} wint: de tegenstander is weg`, t: 3 } : null;
    }
  }
  return m.ev;
}
const len2 = (r) => Math.abs(r.mx) > 0.05 || Math.abs(r.vw) > 0.05;

function eindig(m) {
  m.fase = 'klaar'; m.phase = 'klaar'; m.n++;
  if (m.winnaar == null) m.winnaar = m.games[0] > m.games[1] ? 0 : m.games[1] > m.games[0] ? 1 : m.lastWinner >= 0 ? m.lastWinner : 0;
  m.ev.push({ type: 'klaar', winnaar: m.winnaar });
}

// De uitslag: één regel per mens (de winnende ploeg is plek 1, de andere plek 2); wie wegviel krijgt niets.
export function uitslagPadel(m) {
  const w = m.winnaar == null ? (m.games[0] >= m.games[1] ? 0 : 1) : m.winnaar;
  return m.stoelen.filter((s) => s.slot !== null).map((s) => {
    const eigen = m.games[s.team], ander = m.games[1 - s.team];
    return { slot: s.slot, naam: s.naam, ai: false, weg: s.weg, fin: !s.weg, plek: s.team === w ? 1 : 2, tijd: null, beste: null, tekst: s.weg ? 'niet meer erbij' : `${s.team === w ? 'gewonnen' : 'verloren'}: ${eigen}-${ander} games` };
  }).sort((a, b) => (a.weg - b.weg) || (a.plek - b.plek) || (a.slot - b.slot));
}
export const winnaarsPadel = (rijen) => rijen.filter((r) => r.plek === 1 && !r.weg).map((r) => r.slot);
export function beloningPadel(rij) {
  if (!rij || rij.weg || rij.ai) return { geld: 0, xp: 0 };
  return { geld: PRIJZEN_PADEL[rij.plek] | 0, xp: rij.plek === 1 ? 24 : 18 };
}

// ---------------------------------------------------------------- de momentopname naar de gasten en hun spiegel

// d: [fase, serveTeam, p0, p1, g0, g1, rally, golden, bal(live, u, v, z, vu, vv, vz, hitter), 4 x stoel(u, v, swing, snelheid, weg)]
export function snapPadel(m, seq = 0) {
  const b = m.ball;
  const d = [Math.max(0, FASEN.indexOf(m.phase)), m.serveTeam, m.points[0], m.points[1], m.games[0], m.games[1], m.rally, m.capped ? 1 : 0,
    b ? 1 : 0, q2(b ? b.u : 0), q2(b ? b.v : 0), q2(b ? b.z : 0), q2(b ? b.vu : 0, 1), q2(b ? b.vv : 0, 1), q2(b ? b.vz : 0, 1), b ? b.hitter : -1 ];
  for (const s of m.stoelen) d.push(q2(s.u), q2(s.v), s.swing > 0 ? 1 : 0, q2(s.speed, 1), s.weg ? 1 : 0);
  return { k: 'wed', f: 'lv', n: seq | 0, d, x: m.flash ? `${m.flash.text}${m.flash.why ? ` (${m.flash.why})` : ''}`.slice(0, 60) : '' };
}
export const SNAP_LEN = 16 + 5 * 4;
// De haken die het wedstrijdkader (multiplayerwedstrijd.js) van een live wedstrijd nodig heeft.
export const livePadel = {
  tik: tikPadel, snap: snapPadel, verlaat: verlaatPadel, uitslag: uitslagPadel, beloning: beloningPadel, vak: 'padel',
  meedoen: (m, slot) => m.stoelen.some((s) => s.slot === slot && !s.weg),
};
export function leesLive(b) {
  if (!b || b.k !== 'wed' || b.f !== 'lv' || !Number.isInteger(b.n) || !Array.isArray(b.d) || b.d.length !== SNAP_LEN || !b.d.every(fin)) return null;
  return { f: 'lv', n: b.n, d: b.d.slice(), x: typeof b.x === 'string' ? b.x.replace(/[\u0000-\u001f<>]/g, '').slice(0, 60) : '' };
}

// De spiegel van een gast: dezelfde vorm als de host-wedstrijd voor wie hem tekent (stoelen, bal, stand), maar vloeiend gevoed door momentopnamen.
export function maakPadelSpiegel(start, mijnSlot) {
  const stoelen = indeling(start.deeln.map((d) => ({ slot: d.slot, naam: d.naam, char: d.char }))).map((s, i) => ({ ...maakStoel(i, s), tu: 0, tv: 0 }));
  for (const s of stoelen) { s.tu = s.u; s.tv = s.v; }
  const eigen = stoelen.find((s) => s.slot === mijnSlot);
  return { spiegel: true, stoelen, namen: [ploegNaam(stoelen, 0), ploegNaam(stoelen, 1)], mijnStoel: eigen ? eigen.i : -1, mijnTeam: eigen ? eigen.team : 0,
    phase: 'intro', serveTeam: 0, points: [0, 0], games: [0, 0], rally: 0, capped: false, ball: null, bt: null, flashText: '', n: -1, leeftijd: 0, nSnap: 0 };
}
export function voerInPadel(sp, st) {
  if (!st || st.f !== 'lv' || st.d.length !== SNAP_LEN || st.n < sp.n) return false; // een oudere momentopname telt niet
  const d = st.d;
  sp.n = st.n; sp.phase = FASEN[clamp(d[0] | 0, 0, FASEN.length - 1)]; sp.serveTeam = d[1] | 0; sp.points = [d[2] | 0, d[3] | 0]; sp.games = [d[4] | 0, d[5] | 0]; sp.rally = d[6] | 0; sp.capped = !!d[7];
  if (d[8]) {
    const eerst = !sp.ball;
    sp.bt = { u: d[9], v: d[10], z: d[11], vu: d[12], vv: d[13], vz: d[14], hitter: d[15] | 0 };
    if (eerst) sp.ball = { ...sp.bt, live: true };
  } else { sp.ball = null; sp.bt = null; }
  sp.leeftijd = 0; sp.nSnap++;
  sp.stoelen.forEach((s, i) => { const o = 16 + i * 5; s.tu = d[o]; s.tv = d[o + 1]; s.swing = d[o + 2] ? SWING_T : 0; s.speed = d[o + 3]; s.weg = !!d[o + 4]; if (sp.nSnap === 1) { s.u = s.tu; s.v = s.tv; } });
  sp.flashText = st.x || '';
  return true;
}
export function tikPadelSpiegel(sp, dt) {
  sp.leeftijd += dt;
  const k = 1 - Math.exp(-dt * 20);
  for (const s of sp.stoelen) {
    s.u += (s.tu - s.u) * k; s.v += (s.tv - s.v) * k;
    if (s.swing > 0) s.swing = Math.max(0, s.swing - dt);
  }
  if (sp.ball && sp.bt) { // de bal vliegt door tussen twee momentopnamen en wordt naar de host bijgetrokken
    const a = Math.min(sp.leeftijd, 0.25), t = sp.bt;
    const tu = t.u + t.vu * a, tv = t.v + t.vv * a, tz = Math.max(0.05, t.z + t.vz * a - 0.5 * G * a * a);
    const kb = 1 - Math.exp(-dt * 30);
    sp.ball.u += (tu - sp.ball.u) * kb; sp.ball.v += (tv - sp.ball.v) * kb; sp.ball.z += (tz - sp.ball.z) * kb;
  }
}
