// Shared helpers for the activities (activities.js): no imports of the
// activities themselves, so carbid.js, kermis.js and geheimen.js can use
// them without an import cycle.
import { playerBusy } from './busy.js';

// Why a minigame can't start now, or null.
export function activityBlock(w) {
  if (w.wanted > 0) return 'Niet nu: eerst de politie kwijt';
  if (playerBusy(w, ['mission', 'activeRace']).busy) return 'Niet nu: maak eerst je missie af';
  if (playerBusy(w, ['sideJob']).busy) return 'Niet nu: je bent aan het werk';
  if (playerBusy(w, ['challenge']).busy) return 'Niet nu: eerst die uitdaging';
  if (playerBusy(w, ['padel']).busy) return 'Niet nu';
  return null;
}

// A round map icon in the house style: disc in the accent colour, then the glyph.
export function iconDisc(ctx, s, color) {
  ctx.beginPath();
  ctx.arc(0, 0, 4.6 * s, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = '#0c140e';
  ctx.stroke();
}
