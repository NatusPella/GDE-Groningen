// The HUD's date chip and special-day badge, through one small adapter over
// calendar.js. The game calendar is still growing: a specialDay(world) or
// special-day field it exports wins; until then the badge comes from the
// fixed days below (the story's own dates), so the HUD needs no change when
// the calendar learns more.
import * as calendar from './calendar.js';

const SHORT_DAY = { zondag: 'Zo', maandag: 'Ma', dinsdag: 'Di', woensdag: 'Wo', donderdag: 'Do', vrijdag: 'Vr', zaterdag: 'Za' };
const SHORT_MONTH = { januari: 'jan', februari: 'feb', maart: 'mrt', april: 'apr', mei: 'mei', juni: 'jun', juli: 'jul', augustus: 'aug', september: 'sep', oktober: 'okt', november: 'nov', december: 'dec' };

// day of August -> the day's name (only the story's days; 32 = 1 September)
export const FALLBACK_DAYS = { 28: 'Gronings Ontzet' };

export function hudDate(world) {
  let d = null;
  try { d = calendar.storyDate ? calendar.storyDate(world) : null; } catch (e) { d = null; }
  if (!d || !d.weekday) return { short: '', long: '', special: '' };
  const short = `${SHORT_DAY[d.weekday] || d.weekday.slice(0, 2)} ${d.day} ${SHORT_MONTH[d.month] || d.month.slice(0, 3)}`;
  return { short, long: d.long || short, special: specialName(world, d) };
}

function specialName(world, d) {
  try {
    if (typeof calendar.specialDay === 'function') {
      const s = calendar.specialDay(world);
      if (s) return typeof s === 'string' ? s : s.name || s.title || '';
      return '';
    }
  } catch (e) { /* fall back */ }
  if (d.special) return typeof d.special === 'string' ? d.special : d.special.name || '';
  return d.month === 'augustus' ? FALLBACK_DAYS[d.day] || '' : '';
}
