// Ontdekkingsmeldingen (nieuw gebied, nieuwe streek, streekstempel) wachten tot het laadscherm weg is (eigenaar 22-11:
// "een nieuw gebied ontdekken mag pas na het laadscherm"). Pure wachtrij: de probe (is er een laadscherm?) wordt
// meegegeven, zodat dit in node te testen is. Samen spelen: elke speler heeft zijn eigen laadscherm en dus zijn eigen
// wachtrij; er gaat niets over het net.
let waiting = [];
const MAX_WACHTEND = 8;

// Is er nu een laadscherm in beeld? Het opstartscherm (#loading, zonder .done) of het laadscherm van een save of reis
// (#load-screen, ook tijdens zijn korte fade-out).
export function loadScreenOpen(doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d || !d.getElementById) return false;
  if (d.getElementById('load-screen')) return true;
  const screenBox = d.getElementById('loading');
  return !!(screenBox && screenBox.isConnected !== false && !(screenBox.classList && screenBox.classList.contains('done')));
}

// Meld nu, of zodra het laadscherm weg is. `probe` is optioneel (standaard loadScreenOpen).
export function announceAfterLoadScreen(fn, probe = loadScreenOpen) {
  if (typeof fn !== 'function') return false;
  if (!probe()) { fn(); return true; }
  waiting.push(fn);
  while (waiting.length > MAX_WACHTEND) waiting.shift();
  return false;
}

// Per tik (elke seconde of elk frame): zodra het scherm weg is, gaan de wachtende meldingen uit, in volgorde.
export function flushLoadWait(probe = loadScreenOpen) {
  if (!waiting.length || probe()) return 0;
  const list = waiting;
  waiting = [];
  for (const fn of list) { try { fn(); } catch (e) { /* een melding is een extraatje */ } }
  return list.length;
}

export const pendingCount = () => waiting.length;
export function clearLoadWait() { waiting = []; }
