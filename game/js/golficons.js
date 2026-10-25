// On-theme iconen voor het golf (#453): kleine vlakke SVG's in de low-poly stijl van DESIGN_SYSTEM.md (hoekige vlakken in twee
// tinten, crème op donkergroen, geen cartoon-contouren). Puur: alleen tekst, geen DOM, zodat de HUD (golfhud.js) en de test ze delen.
// Elk icoon heeft een eigen vorm naast zijn kleur (de kleur is nooit het enige teken).
const C = { cream: '#f0ede4', green: '#3fc97a', dark: '#17301f', flag: '#d93f3f', sand: '#d9c487', sandDk: '#b89f5e', water: '#4aa3a8', waterDk: '#2f7f86', steel: '#cfcbbd', steelDk: '#8d8a7e' };

export const GOLF_VORM = {
  // vlag in de hole: paal, rode wimpel, crème put
  vlag: `<ellipse cx="12" cy="20.5" rx="6" ry="2" fill="${C.dark}"/><polygon points="12,3 12,20 13.2,20 13.2,3" fill="${C.cream}"/><polygon points="13.2,3.5 21,6.8 13.2,10.2" fill="${C.flag}"/><polygon points="13.2,3.5 21,6.8 13.2,6.8" fill="#ec6b5a"/>`,
  // de bal: een hoekige schijf met drie vlakken
  bal: `<polygon points="12,3 18.5,6 21,12.5 18,19 12,21 6,19 3,12.5 5.5,6" fill="${C.cream}"/><polygon points="12,3 18.5,6 12,11" fill="#ffffff"/><polygon points="12,11 21,12.5 18,19" fill="#cfcbbd"/><polygon points="12,11 6,19 12,21 18,19" fill="#e4e0d2"/>`,
  // wedge: korte steel en een schuine kop
  wedge: `<polygon points="17,2 19,3 8.2,17.2 6.8,16" fill="${C.steel}"/><polygon points="6.8,16 8.2,17.2 5,21.5 2,21.5 2.5,18.5" fill="${C.steelDk}"/><polygon points="2.5,18.5 5,21.5 2,21.5" fill="${C.cream}"/>`,
  // putter: een rechte steel met een platte kop
  putter: `<polygon points="14,2 15.6,2 15.6,16 14,16" fill="${C.steel}"/><polygon points="9,16 20,16 21,19 8,19" fill="${C.steelDk}"/><polygon points="9,16 20,16 20.5,17.4 8.5,17.4" fill="${C.cream}"/>`,
  // zand: een heuvel van twee vlakken
  zand: `<polygon points="2,19 8,8 12,13 16,6 22,19" fill="${C.sand}"/><polygon points="16,6 22,19 14,19" fill="${C.sandDk}"/><polygon points="8,8 12,13 6,19 2,19" fill="#ead9a0"/>`,
  // water: twee hoekige golven
  water: `<polygon points="2,9 6,6 10,9 14,6 18,9 22,6 22,12 2,12" fill="${C.water}"/><polygon points="2,15 6,12 10,15 14,12 18,15 22,12 22,18 2,18" fill="${C.waterDk}"/>`,
  // beurt: een pijl naar rechts
  beurt: `<polygon points="3,8 13,8 13,3 22,12 13,21 13,16 3,16" fill="${C.green}"/><polygon points="3,8 13,8 13,3 22,12 13,12 3,12" fill="#6fe0a0"/>`,
  // meekijken: een oog van vlakken
  oog: `<polygon points="2,12 7,6.5 17,6.5 22,12 17,17.5 7,17.5" fill="${C.steel}"/><polygon points="9,9 15,9 16.5,12 15,15 9,15 7.5,12" fill="${C.dark}"/><polygon points="10.5,10.5 13.5,10.5 14,12 13,13.5 11,13.5 10,12" fill="${C.green}"/>`,
  // eerste plek: een kroon van punten
  winnaar: `<polygon points="3,18 4,8 8.5,12 12,5 15.5,12 20,8 21,18" fill="${C.cream}"/><polygon points="12,5 15.5,12 20,8 21,18 12,18" fill="#d9d5c6"/><rect x="3" y="18" width="18" height="2.5" fill="${C.green}"/>`,
};

export const GOLF_ICONEN = Object.keys(GOLF_VORM);

export function golfIcon(naam, px = 18) {
  const v = GOLF_VORM[naam];
  if (!v) return '';
  return `<svg class="gf-ic" width="${px}" height="${px}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${v}</svg>`;
}
