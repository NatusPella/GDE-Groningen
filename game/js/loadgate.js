// De laadpoort (eigenaar 21-11: "Een doorlopende balk, zonder enter! Automatisch doorgaan! En tekst eronder wat de game
// aan het doen is."): de statusregel en het sluitmoment van een laadscherm. Pure staatmachine zonder DOM;
// loadscreen.js voedt hem elk frame. Er is geen Enter- of verder-prompt meer: zodra het laden klaar is, gaat het scherm zelf door.
//
//   laadt      er wordt nog geladen: de huidige echte stap als statusregel
//   wacht-host een gast wacht op de wereld van de gastheer: "Wachten op <naam>"
//   hangt      een stap duurt te lang (HANG_S): de regel zegt eerlijk dat het spel niet vastzit en waarmee het bezig is
//   klaar      alle verplichte stappen zijn gedaan: het scherm sluit zelf, één keer (actie 'door')
//
// Geluid: Electron start audio zonder gebaar (autoplay-policy in desktop/main.js); in een browser hervat audio.js de
// AudioContext bij het eerstvolgende gebaar (unlockAudio), zonder prompt.

export const HANG_S = 8; // vanaf hier zegt de statusregel dat het langer duurt (het scherm kapt zelf af bij MAX_S, loadlogic.js)
export const FADE_MS = 400; // de korte fade van het scherm naar het spel

export const createGate = () => ({ state: 'laadt', started: false, stap: '', wachtOp: '' });

// De duur van de fade: 0 bij "Beweging beperken" (reduced motion), anders hooguit FADE_MS.
export const fadeMs = (reduced) => (reduced ? 0 : FADE_MS);

// input: { done, elapsedS, stap (tekst van de huidige stap), wachtOp (naam van de gastheer, of '') }.
// Geeft { state, status, actie } terug; actie 'door' betekent: sluit het scherm nu (hooguit één keer).
export function gateTick(g, input) {
  const { done = false, elapsedS = 0, stap = '', wachtOp = '' } = input || {};
  g.stap = stap;
  g.wachtOp = wachtOp || '';
  if (g.started) return view(g, 'klaar', 'niets');
  if (done) { g.state = 'klaar'; g.started = true; return view(g, 'klaar', 'door'); }
  if (g.wachtOp) g.state = 'wacht-host';
  else if (Number.isFinite(elapsedS) && elapsedS >= HANG_S) g.state = 'hangt';
  else g.state = 'laadt';
  return view(g, g.state, 'niets');
}

// De ene statusregel onder de balk: wat het spel nu doet (alleen echte stappen, geen nepteksten).
export function statusLine(state, stap, wachtOp = '') {
  const s = String(stap || '').trim();
  if (state === 'wacht-host') return `Wachten op ${wachtOp}`;
  if (state === 'hangt') return `Dit duurt langer dan normaal, het spel is niet vastgelopen. Nog bezig met: ${s || 'laden'}`;
  if (state === 'klaar') return 'Klaar';
  return s || 'Het spel wordt geladen';
}

function view(g, state, actie) {
  return { state, status: statusLine(state, g.stap, g.wachtOp), actie };
}
