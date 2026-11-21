// De bal van de voetbalwedstrijd (#981): puur, deterministisch en zonder toeval in de natuurkunde (scripts/voetbal_test.mjs). Rollen met wrijving, stuiten, de palen en de lat
// van de twee doelen, een doelpunt als de bal over de lijn tussen de palen gaat, en "uit" als hij het veld verlaat. Simpel maar plezierig: de wrijving is groot bij hoge snelheid
// (een harde bal remt snel af), een stuit houdt ruim de helft. z is de hoogte van de onderkant van de bal boven het gras.
import { VELD } from './voetbalrules.js';

const G = 9.8;
const R = VELD.BAL_R;
const MAX_STAP = 1 / 120;

export const maakBal = (x = 0, y = 0) => ({ x, y, z: 0, vx: 0, vy: 0, vz: 0, dood: false, netTeam: -1, laatsteTeam: -1, laatsteSpeler: -1 });
export const balSnelheid = (b) => Math.hypot(b.vx, b.vy);
export const zetBal = (b, x, y, z = 0) => { b.x = x; b.y = y; b.z = z; b.vx = b.vy = b.vz = 0; b.dood = false; b.netTeam = -1; };

// Eén stap (dt mag groot zijn: hij wordt in stukjes gehakt). Geeft de gebeurtenissen: stuit, paal, lat, goal ({ team }), uit ({ kind: 'zij' | 'achter', x, y }).
export function stapBal(b, dt, ev = []) {
  const n = Math.max(1, Math.ceil(dt / MAX_STAP));
  const h = dt / n;
  for (let i = 0; i < n; i++) stapKlein(b, h, ev);
  return ev;
}

function stapKlein(b, h, ev) {
  const ox = b.x, oy = b.y;
  // verticaal
  if (b.z > 0 || b.vz > 0) {
    b.vz -= G * h;
    b.z += b.vz * h;
    if (b.z <= 0) {
      b.z = 0;
      if (b.vz < -0.9) { ev.push({ type: 'stuit', sterkte: Math.min(1, -b.vz / 9) }); b.vz = -b.vz * 0.56; b.vx *= 0.92; b.vy *= 0.92; } else b.vz = 0;
    }
  }
  // horizontaal: lucht remt weinig, gras remt: vast deel plus een deel dat met de snelheid groeit
  const s = Math.hypot(b.vx, b.vy);
  if (s > 0) {
    const rem = b.z > 0.02 ? 0.14 * s : 0.9 + 0.35 * s;
    const na = Math.max(0, s - rem * h);
    const f = na / s;
    b.vx *= f; b.vy *= f;
    if (na < 0.04) { b.vx = 0; b.vy = 0; }
  }
  b.x += b.vx * h; b.y += b.vy * h;
  if (b.netTeam >= 0) { net(b, ev); return; }
  const zc = b.z + R;
  // de palen: vier cilinders op de hoeken van de doelen (de bal onder de lat)
  if (zc < VELD.DOEL_H + 0.05) {
    for (const px of [-(VELD.DOEL_B / 2), (VELD.DOEL_B / 2)]) for (const py of [-(VELD.L / 2), (VELD.L / 2)]) {
      const dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy), min = VELD.PAAL_R + R;
      if (d < min && d > 1e-6) {
        const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 1.65 * vn * nx; b.vy -= 1.65 * vn * ny; ev.push({ type: 'paal', sterkte: Math.min(1, -vn / 14) }); }
        b.x = px + nx * min; b.y = py + ny * min;
      }
    }
  }
  // de lat en de doellijn: alleen tussen de palen en alleen naar buiten
  for (const yl of [-(VELD.L / 2), (VELD.L / 2)]) {
    if ((oy - yl) * (b.y - yl) > 0 || Math.abs(b.x) >= (VELD.DOEL_B / 2) || (b.y - oy) * yl <= 0) continue;
    if (Math.abs(zc - VELD.DOEL_H) < R + 0.04) { // de lat
      const boven = zc >= VELD.DOEL_H;
      b.y = oy; b.vy = -b.vy * 0.55; b.vz = (boven ? 1 : -1) * (Math.abs(b.vz) * 0.4 + 1.3);
      b.z = boven ? Math.max(b.z, VELD.DOEL_H - R + 0.05) : Math.min(b.z, VELD.DOEL_H - R - 0.06);
      ev.push({ type: 'lat', sterkte: Math.min(1, Math.hypot(b.vx, b.vy) / 14) });
      return;
    }
    if (zc < VELD.DOEL_H) { // een doelpunt: het team dat naar deze kant aanvalt scoort (team 0 valt aan naar +y)
      b.netTeam = yl > 0 ? 0 : 1;
      ev.push({ type: 'goal', team: b.netTeam, x: b.x, y: yl });
      return;
    }
  }
  // uit: over de zijlijn, of over de achterlijn naast of boven het doel
  if (!b.dood) {
    if (Math.abs(b.x) > (VELD.B / 2)) { b.dood = true; ev.push({ type: 'uit', kind: 'zij', x: b.x, y: b.y }); }
    else if (Math.abs(b.y) > (VELD.L / 2) + 0.02) { b.dood = true; ev.push({ type: 'uit', kind: 'achter', x: b.x, y: b.y }); }
  }
}

// In het net: de bal blijft binnen de palen, de lat en de achterkant van het net, en rolt uit.
function net(b, ev) {
  const diep = (VELD.L / 2) + VELD.DOEL_DIEPTE, rand = (VELD.DOEL_B / 2) - R;
  if (b.x > rand) { b.x = rand; b.vx = -Math.abs(b.vx) * 0.2; }
  if (b.x < -rand) { b.x = -rand; b.vx = Math.abs(b.vx) * 0.2; }
  if (b.y > diep - R) { b.y = diep - R; b.vy = -Math.abs(b.vy) * 0.12; }
  if (b.y < -diep + R) { b.y = -diep + R; b.vy = Math.abs(b.vy) * 0.12; }
  const top = VELD.DOEL_H - 2 * R;
  if (b.z > top) { b.z = top; b.vz = -Math.abs(b.vz) * 0.2; }
}

// Waar de bal de lijn y = yl kruist als niemand hem raakt: { t (s), x, z } of null. Voor de keeper (en de test). Rekent op een kopie.
export function kruisLijn(b, yl, max = 2.5) {
  if ((b.vy === 0) || ((yl - b.y) * b.vy < 0)) return null;
  const c = { ...b };
  const ev = [];
  for (let t = 0; t < max; t += 1 / 60) {
    const was = c.y;
    stapBal(c, 1 / 60, ev);
    if ((was - yl) * (c.y - yl) <= 0 || c.netTeam >= 0) return { t: t + 1 / 60, x: c.x, z: c.z };
    if (c.dood) return null;
    ev.length = 0;
  }
  return null;
}
