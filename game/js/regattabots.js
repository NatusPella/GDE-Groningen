// Bot-zeilers in de zeilregatta (#197): puur, Node-safe. Elke bot vaart dezelfde baan met stepBot
// (zeilrules.js) en een eigen vaardigheid; de speler krijgt een plaats in het klassement.
import { stepBot, REGATTA, windOp } from './zeilrules.js';

const BOT_NAMEN = ['Wiebe', 'Marrit', 'Tjeerd', 'Anke']; // verzonnen zeilers
const BOT_VAARDIGHEID = [0.62, 0.74, 0.86];

// n bots naast elkaar bij de eerste ton, kijkend naar de eerste ton.
export function maakBots(tonnen, n = 3) {
  const t0 = tonnen[0], t1 = tonnen[1] || t0;
  const koers = Math.atan2(t1.y - t0.y, t1.x - t0.x);
  return Array.from({ length: n }, (_, i) => {
    const zij = (i - (n - 1) / 2) * 12;
    return {
      naam: BOT_NAMEN[i % BOT_NAMEN.length], vaardigheid: BOT_VAARDIGHEID[i % BOT_VAARDIGHEID.length],
      x: t0.x - Math.cos(koers) * 25 - Math.sin(koers) * zij, y: t0.y - Math.sin(koers) * 25 + Math.cos(koers) * zij,
      heading: koers, speed: 0, trim: 0.6, helling: 0, omgeslagen: 0, apart: 0,
      volgend: 0, ronde: 0, gerond: 0, klaar: false, tijd: null,
    };
  });
}

// Eén stap voor alle bots; t is de tijd sinds de start.
export function stepBots(bots, tonnen, wind, dt, t, rondes = REGATTA.rondes) {
  for (const b of bots) {
    if (b.klaar) continue;
    const ton = tonnen[b.volgend];
    stepBot(b, ton, wind, dt, b.vaardigheid);
    if (Math.hypot(ton.x - b.x, ton.y - b.y) <= REGATTA.straal) {
      b.volgend++; b.gerond++;
      if (b.volgend >= tonnen.length) {
        b.volgend = 0; b.ronde++;
        if (b.ronde >= rondes) { b.klaar = true; b.tijd = t; }
      }
    }
  }
  return bots;
}

// Plaats van de speler (1 = eerste): wie klaar is staat voor; verder telt het aantal gerond ton, dan de afstand tot de volgende.
export function speelPlaats(reg, px, py, bots) {
  const afstand = (r) => { const t = r.tonnen[r.volgend]; return Math.hypot(t.x - px, t.y - py); };
  let plaats = 1;
  for (const b of bots) {
    if (b.klaar && !reg.klaar) { plaats++; continue; }
    if (b.klaar && reg.klaar) { if (b.tijd < reg.tijd) plaats++; continue; }
    if (reg.klaar) continue;
    if (b.gerond > reg.gerond) { plaats++; continue; }
    if (b.gerond === reg.gerond) {
      const t = reg.tonnen[b.volgend];
      if (Math.hypot(t.x - b.x, t.y - b.y) < afstand(reg)) plaats++;
    }
  }
  return plaats;
}
export const plaatsTekst = (p, n) => `${p}e van ${n}`;
export { windOp };
