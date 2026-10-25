// Speed cameras, pure: how far over the limit counts, and whether a pass is a warning, a fine
// or nothing. The first pass per camera warns; only after that does it cost money (#493).
import { SPEED_FINE } from './economy.js';

export const SPEED_MARGIN_KMH = 35; // a generous margin over the local limit
export const FINE_COOLDOWN = 15;

export function speedOutcome({ speedKmh, limitKmh, warned, money, roll = Math.random() }) {
  if (!(speedKmh > limitKmh + SPEED_MARGIN_KMH)) return { kind: 'none' };
  if (!warned) return { kind: 'warning' };
  const saldo = Number.isFinite(money) ? Math.max(0, Math.floor(money)) : 0;
  if (saldo <= 0) return { kind: 'none' }; // geen geld: geen "boete van €0" op het scherm
  const r = Number.isFinite(roll) ? Math.min(0.999999, Math.max(0, roll)) : 0.5;
  const [min, max] = SPEED_FINE;
  const fine = Math.min(saldo, min + Math.floor(r * (max - min + 1)));
  return { kind: 'fine', fine };
}
