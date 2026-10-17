// The feature flag `nieuwverhaal`: which story arc this page load plays.
// 'oud' is the released arc (storyarc.js); 'nieuw' is the five-act story of
// docs/verhaal/nieuw (storyarc_nieuw.js), off in every release until the
// owner agrees. Decided once per page load, so the arc never changes under
// a running game; a save records its arc (savemigrate.js) and never loads
// into the other one.
//
// On, in this order of precedence:
//   env GDE_NIEUW_VERHAAL=1 (Node tests; the desktop app passes it on as ?nieuwverhaal)
//   URL query ?nieuwverhaal (web and desktop; ?nieuwverhaal=0 forces it off)
//   the setting Verhaal (Instellingen, settings.js `verhaal`: 'oud' | 'nieuw', default 'oud', storychoice.js); also localStorage 'gde-nieuwverhaal' = '1'
// Pure: no imports, safe in Node.

const OFF = /^(0|false|nee|uit|off)$/i;

// { on, forced }: forced = decided by the environment or the URL, so the setting cannot change it
function decide() {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.GDE_NIEUW_VERHAAL !== undefined) return { on: !OFF.test(process.env.GDE_NIEUW_VERHAAL) && process.env.GDE_NIEUW_VERHAAL !== '', forced: true };
  } catch (e) { /* no process */ }
  try {
    if (typeof location !== 'undefined' && typeof location.search === 'string') {
      const m = /[?&]nieuwverhaal(?:=([^&]*))?/.exec(location.search);
      if (m) return { on: m[1] === undefined || !OFF.test(m[1]), forced: true };
    }
  } catch (e) { /* no location */ }
  try {
    if (typeof localStorage !== 'undefined') {
      if (localStorage.getItem('gde-nieuwverhaal') === '1') return { on: true, forced: false };
      const s = JSON.parse(localStorage.getItem('gde-settings') || 'null');
      if (s && (s.verhaal === 'nieuw' || s.nieuwverhaal === true)) return { on: true, forced: false };
    }
  } catch (e) { /* storage blocked */ }
  return { on: false, forced: false };
}

const decided = decide();
const on = decided.on;

export const nieuwVerhaal = () => on;
export const arcForced = () => decided.forced;
export const ARC_ID = on ? 'nieuw' : 'oud';
