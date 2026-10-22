// Werk op het land (#415): één taak van de boerderij als regels. Een rijtaak (ploegen, zaaien, bemesten, oogsten) rijdt vier rijen over
// het perceel in een snelheidsband en binnen de rij; de afleverrit brengt de schuur naar de afnemer zonder dat de kar leeg strooit.
// Pure regels, geen THREE, geen wereld, geen Math.random (scripts/werkgang_test.mjs); sidejob_boerderij.js voedt ze met de plek
// langs de rij (bietenrules.js akkerRijen en rijPositie). Een eigen machine geeft een ruimere rij. Niemand raakt gewond.
//
// Invoer per stap: along/across (m langs en naast de huidige rij), speed (m/s), decel (m/s^2, positief), lat (m/s^2), dist (m tot de afnemer).
// Uitkomst: gebeurtenissen; result(s) geeft { fractie, gemist, kwaliteit, klaar, mislukt } (fractie 0..1 = hoe netjes de rijen waren).

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export const RIJEN = 4;
export const RIJ_LEN = 100;
export const MAX_SPRONG = 6;
export const HARD_REM = 3.4;
export const HARD_BOCHT = 4;
export const LAAD_AF = 9;
export const EIGEN_RUIMTE = 0.4;     // m extra rij voor wie de machine zelf bezit

// Per taak de snelheidsband (m/s) en de rijbreedte (m naast het midden).
export const BAND = {
  ploegen: { vMin: 1.8, vMax: 5.0, tol: 2.4 },
  zaaien: { vMin: 2.2, vMax: 6.0, tol: 2.2 },
  bemesten: { vMin: 3.0, vMax: 7.0, tol: 2.6 },
  oogsten: { vMin: 2.0, vMax: 6.5, tol: 2.6 },
};

export function init(taak, { eigen = false, kwaliteit = 1 } = {}) {
  const rij = BAND[taak];
  if (rij) {
    return {
      taak, soort: 'rijen', klaar: false, rij: 0, rijen: RIJEN, len: RIJ_LEN, voortgang: 0, goed: 0, gemist: 0, tehard: 0,
      vMin: rij.vMin, vMax: rij.vMax, tol: rij.tol + (eigen ? EIGEN_RUIMTE : 0), time: 0, limit: 300, scheefT: 0,
    };
  }
  return { taak, soort: 'rit', klaar: false, kwaliteit: clamp(kwaliteit, 0, 1), time: 0, limit: 240 };
}

export const fractie = (s) => (s.soort === 'rijen' ? clamp(s.goed / (s.rijen * s.len), 0, 1) : s.kwaliteit);

export function step(s, i, dt) {
  const ev = [];
  if (s.klaar) return ev;
  s.time += dt;
  if (s.time > s.limit) { ev.push({ type: 'fail', why: s.soort === 'rijen' ? 'de zon zakt: het werk blijft liggen' : 'de afnemer is dicht' }); return ev; }
  if (s.soort === 'rit') {
    if ((i.decel || 0) > HARD_REM || (i.lat || 0) > HARD_BOCHT) { s.kwaliteit = Math.max(0, s.kwaliteit - dt * LAAD_AF / 100); ev.push({ type: 'lading' }); }
    if (s.kwaliteit < 0.35) { ev.push({ type: 'fail', why: 'de kar is leeg gestrooid: de oogst ligt langs de weg' }); return ev; }
    if ((i.dist ?? 99) < 7 && (i.speed ?? 99) < 1) { s.klaar = true; ev.push({ type: 'klaar' }); }
    return ev;
  }
  const speed = i.speed || 0;
  const binnen = Math.abs(i.across ?? 99) <= s.tol && (i.along ?? -99) > -1 && (i.along ?? -99) <= s.len + 3;
  if (binnen && speed >= s.vMin) {
    const along = clamp(i.along, 0, s.len);
    const delta = along - s.voortgang;
    if (delta > 0) {
      const goed = Math.min(delta, MAX_SPRONG);
      // te hard werkt slordig: de helft van die meters telt
      s.goed += speed > s.vMax ? goed * 0.5 : goed;
      if (speed > s.vMax) { s.tehard += dt; ev.push({ type: 'tehard' }); }
      s.gemist += delta - goed;
      s.voortgang = along;
      s.scheefT = 0;
    }
  } else if (!binnen && s.voortgang > 0 && s.voortgang < s.len - 2 && (i.along ?? -99) > 0 && (i.along ?? -99) < s.len) {
    s.scheefT += dt;
    if (s.scheefT > 1.2) { s.scheefT = 0; ev.push({ type: 'scheef' }); }
  }
  if (s.voortgang >= s.len - 2) {
    s.rij++;
    s.voortgang = 0;
    ev.push({ type: 'rij', n: s.rij });
    if (s.rij >= s.rijen) { s.klaar = true; ev.push({ type: 'klaar' }); }
  }
  return ev;
}

export const result = (s) => ({ fractie: fractie(s), gemist: s.soort === 'rijen' ? s.gemist : 0, kwaliteit: s.soort === 'rit' ? s.kwaliteit : 1, klaar: !!s.klaar });

// Hoeveel rijen er nog liggen, voor de melding.
export const rijenOver = (s) => (s.soort === 'rijen' ? Math.max(0, s.rijen - s.rij) : 0);
