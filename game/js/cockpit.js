// #632: één cockpit-rand voor de bus, de heli en het vliegtuig: donkere plaat, sfeerrand en een
// maatlijn/patroon uit de bestaande sfeertabellen. Alleen tokens en chroom, geen eigen font of keycap;
// de kanalen zetten deze klasse op hun eigen paneel. Eén keer in de kop van het document.
export const COCKPIT_CLASS = 'cockpit-frame';
export const COCKPIT_CSS = `
/* #849: hier bewust geen position. De panelen die deze klasse dragen (het
   vliegtuigpaneel, het buskaartje) zetten zelf position: absolute; een
   position: relative in deze regel had dezelfde specificiteit en kwam later in
   de head, waardoor het vliegtuigpaneel in de normale flow linksboven belandde.
   Een absoluut paneel is zelf al het containing block voor de ::before. */
#hud .${COCKPIT_CLASS} { border-left: 3px solid var(--mk-ok, #3fc97a); }
#hud .${COCKPIT_CLASS}::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 46px; pointer-events: none; opacity: 0.32;
  background: repeating-linear-gradient(0deg, color-mix(in srgb, var(--ds-c-creme) 30%, transparent) 0 2px, transparent 2px 9px); }
#hud .${COCKPIT_CLASS} small { color: var(--mk-mission, #e8c93a); }
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
