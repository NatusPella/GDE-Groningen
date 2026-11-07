// #632: één cockpit-rand voor de bus, de heli en het vliegtuig: donkere plaat, sfeerrand en een
// maatlijn/patroon uit de bestaande sfeertabellen. Alleen tokens en chroom, geen eigen font of keycap;
// de kanalen zetten deze klasse op hun eigen paneel. Eén keer in de kop van het document.
export const COCKPIT_CLASS = 'cockpit-frame';
export const COCKPIT_CSS = `
#hud .${COCKPIT_CLASS} { position: relative; border-left: 3px solid var(--mk-ok, #3fc97a); }
#hud .${COCKPIT_CLASS}::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 46px; pointer-events: none; opacity: 0.32;
  background: repeating-linear-gradient(0deg, rgba(240,237,228,0.30) 0 2px, transparent 2px 9px); }
#hud .${COCKPIT_CLASS} small { color: var(--mk-mission, #e8c93a); }
#hud .${COCKPIT_CLASS} .hud-key { margin: 0 2px; vertical-align: middle; }
`;

let gedaan = false;
export function mountCockpitCss() {
  if (gedaan || typeof document === 'undefined') return;
  gedaan = true;
  const st = document.createElement('style');
  st.id = 'cockpit-css';
  st.textContent = COCKPIT_CSS;
  document.head.appendChild(st);
}
