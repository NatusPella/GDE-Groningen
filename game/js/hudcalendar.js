// The HUD's date chip and special-day badge, read from the game calendar
// (calendarday.js: todayInfo, todaySpecial). `small` days (the weekly market)
// get a quiet badge and leave the clock small; the big clock is for the days
// that matter (Gronings Ontzet, KEI-week, ...).
import { todayInfo, todaySpecial } from './calendarday.js';
import { calIcon } from './calendar.js';

export function hudDate(world) {
  let info = null, sp = null;
  try { info = todayInfo(world); sp = todaySpecial(world); } catch (e) { info = null; }
  if (!info || !info.short) return { short: '', long: '', special: '', icon: '', small: false, key: '' };
  return {
    short: info.short, long: info.long || info.short,
    special: sp ? sp.name : '', icon: sp ? calIcon(sp.icon) : '', small: !!(sp && sp.small),
    key: `${info.n}|${sp ? sp.id : ''}`,
  };
}
