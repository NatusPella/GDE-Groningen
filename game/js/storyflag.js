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
//   the hidden setting: localStorage 'gde-nieuwverhaal' = '1', or "nieuwverhaal": true in 'gde-settings'
// Pure: no imports, safe in Node.

const OFF = /^(0|false|nee|uit|off)$/i;

function decide() {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.GDE_NIEUW_VERHAAL !== undefined) return !OFF.test(process.env.GDE_NIEUW_VERHAAL) && process.env.GDE_NIEUW_VERHAAL !== '';
  } catch (e) { /* no process */ }
  try {
    if (typeof location !== 'undefined' && typeof location.search === 'string') {
      const m = /[?&]nieuwverhaal(?:=([^&]*))?/.exec(location.search);
      if (m) return m[1] === undefined || !OFF.test(m[1]);
    }
  } catch (e) { /* no location */ }
  try {
    if (typeof localStorage !== 'undefined') {
      if (localStorage.getItem('gde-nieuwverhaal') === '1') return true;
      const s = JSON.parse(localStorage.getItem('gde-settings') || 'null');
      if (s && s.nieuwverhaal === true) return true;
    }
  } catch (e) { /* storage blocked */ }
  return false;
}

const on = decide();

export const nieuwVerhaal = () => on;
export const ARC_ID = on ? 'nieuw' : 'oud';
