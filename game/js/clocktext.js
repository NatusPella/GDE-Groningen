// The in-game clock as hh:mm (world.dayNight.hour); a leaf so the phone, the contacts and the
// pause menu need not import hud_panel.js for it (import cycle, #108). hud_panel.js re-exports it.
export function getClockText(world) {
  const h = world && world.dayNight ? world.dayNight.hour : undefined;
  if (typeof h !== 'number' || !Number.isFinite(h)) return '';
  const total = Math.floor((((h % 24) + 24) % 24) * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
