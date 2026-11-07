// #492 missielus per groep. De ketenhouder in missions.js houdt per sleutel een keten (slice 2a) en de
// wereldvelden van de opdracht per sleutel (slice 2b). Deze lus bepaalt welke ketens per frame aan de
// beurt zijn en hoeveel tijd elk krijgt, zodat twee groepen die tegelijk een opdracht doen elkaar niet
// overschrijven. Puur: geen wereld, geen DOM; de test hieronder spant twee sleutels voor en kijkt of ze
// los van elkaar opschieten. De aanroeper wisselt zelf de ketensleutel om de update van die groep.
export function maakMissielus() {
  return { groepen: new Map(), volgorde: [] };
}
// Zet een groep aan of uit. Uit = de volgende tik doet niet mee; de volgorde blijft stabiel.
export function zetGroep(lus, sleutel, aan) {
  if (!lus || sleutel == null) return false;
  if (aan) {
    if (!lus.groepen.has(sleutel)) lus.volgorde.push(sleutel);
    lus.groepen.set(sleutel, true);
  } else {
    lus.groepen.delete(sleutel);
    const i = lus.volgorde.indexOf(sleutel);
    if (i >= 0) lus.volgorde.splice(i, 1);
  }
  return true;
}
export const actieveGroepen = (lus) => (lus ? lus.volgorde.slice() : []);
export const aantalActief = (lus) => (lus ? lus.volgorde.length : 0);
// De tijd per groep: de frame-tijd wordt eerlijk verdeeld. Zonder groepen is er niets te tikken.
export function deelPerGroep(dt, n) {
  const k = Math.max(0, Math.floor(Number(n) || 0));
  return k ? Math.max(0, Number(dt) || 0) / k : 0;
}
// Eén beeld: elke actieve groep krijgt zijn deel van dt. Een fout in de ene groep mag de andere niet
// tegenhouden (net als een kapotte opdracht de wereld niet mag laten hangen); de fouten komen terug.
export function tik(lus, dt, fn) {
  const groepen = actieveGroepen(lus);
  const deel = deelPerGroep(dt, groepen.length);
  const fouten = [];
  for (const sleutel of groepen) {
    try { fn(sleutel, deel); } catch (e) { fouten.push({ sleutel, fout: e }); }
  }
  return { aantal: groepen.length, deel, fouten };
}
