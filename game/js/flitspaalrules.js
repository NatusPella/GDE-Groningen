import { SPEED_FINE } from "./economy.js";
const SPEED_MARGIN_KMH = 35;
const FINE_COOLDOWN = 15;
function speedOutcome({ speedKmh, limitKmh, warned, money, roll = Math.random() }) {
  if (!(speedKmh > limitKmh + SPEED_MARGIN_KMH)) return { kind: "none" };
  if (!warned) return { kind: "warning" };
  const saldo = Number.isFinite(money) ? Math.max(0, Math.floor(money)) : 0;
  if (saldo <= 0) return { kind: "none" };
  const r = Number.isFinite(roll) ? Math.min(0.999999, Math.max(0, roll)) : 0.5;
  const [min, max] = SPEED_FINE;
  const fine = Math.min(saldo, min + Math.floor(r * (max - min + 1)));
  return { kind: "fine", fine };
}
export {
  FINE_COOLDOWN,
  SPEED_MARGIN_KMH,
  speedOutcome
};
