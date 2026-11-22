// Ontdekkingsmeldingen (nieuw gebied, nieuwe streek, streekstempel) wachten tot het laadscherm weg is (eigenaar 22-11:
// "een nieuw gebied ontdekken mag pas na het laadscherm"). Pure wachtrij: de probe (is er een laadscherm?) wordt
// meegegeven, zodat dit in node te testen is. Samen spelen: elke speler heeft zijn eigen laadscherm en dus zijn eigen
// wachtrij; er gaat niets over het net.
let wachtend = [];
const MAX_WACHTEND = 8;

// Is er nu een laadscherm in beeld? Het opstartscherm (#loading, zonder .done) of het laadscherm van een save of reis
// (#load-screen, ook tijdens zijn korte fade-out).
export function laadschermOpen(doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d || !d.getElementById) return false;
  if (d.getElementById('load-screen')) return true;
  const boot = d.getElementById('loading');
  return !!(boot && boot.isConnected !== false && !(boot.classList && boot.classList.contains('done')));
}

// Meld nu, of zodra het laadscherm weg is. `probe` is optioneel (standaard laadschermOpen).
export function meldNaLaadscherm(fn, probe = laadschermOpen) {
  if (typeof fn !== 'function') return false;
  if (!probe()) { fn(); return true; }
  wachtend.push(fn);
  while (wachtend.length > MAX_WACHTEND) wachtend.shift();
  return false;
}

// Per tik (elke seconde of elk frame): zodra het scherm weg is, gaan de wachtende meldingen uit, in volgorde.
export function spoelLaadwacht(probe = laadschermOpen) {
  if (!wachtend.length || probe()) return 0;
  const lijst = wachtend;
  wachtend = [];
  for (const fn of lijst) { try { fn(); } catch (e) { /* een melding is een extraatje */ } }
  return lijst.length;
}

export const aantalWachtend = () => wachtend.length;
export function wisLaadwacht() { wachtend = []; }
