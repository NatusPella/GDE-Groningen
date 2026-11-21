// De laadpoort (opdracht 21-11, eigenaar: "Op laadschermen zie ik soms een Enter (verder)-prompt. Maar ik moet toch wachten."):
// één eerlijke status voor een laadscherm. Pure staatmachine zonder DOM; loadscreen.js voedt hem elk frame.
//
//   laadt      er wordt nog geladen: GEEN prompt, wel de huidige stap en de voortgang
//   wacht-host een gast wacht op de wereld van de gastheer ("Wachten op <naam>"): geen prompt
//   hangt      een stap duurt te lang (HANG_S): de reden staat erbij en "Toch doorgaan" werkt direct
//   klaar      alle verplichte stappen zijn gedaan: Enter werkt direct, zonder verdere wachttijd
//
// Een laadscherm sluit zelf zodra het 'klaar' is (niemand hoeft daarvoor een toets in te drukken), dus de Enter-prompt staat
// alleen in 'hangt' (en kort in 'klaar'); een toets tijdens het laden is geen dode toets: hij wordt onthouden (REMEMBER_MS) en
// uitgevoerd zodra het scherm klaar is, en intussen zegt een melding waar het op wacht. Eén start, nooit twee.

export const HANG_S = 8; // vanaf hier: reden + "Toch doorgaan" (het scherm kapt zelf af bij MAX_S, loadlogic.js)
export const REMEMBER_MS = 1000; // een Enter tijdens het laden telt hoogstens zo lang mee voor 'klaar'

export const createGate = () => ({ state: 'laadt', pressAt: null, started: false, stap: '', wachtOp: '' });

// input: { done, elapsedS, stap (tekst van de huidige stap), wachtOp (naam van de host, of '') }; nowMs: klok van de aanroeper.
// Geeft { state, prompt, promptTekst, status, sub, actie } terug; actie 'door' betekent: sluit het scherm nu (hooguit één keer).
export function gateTick(g, input, nowMs) {
  const { done = false, elapsedS = 0, stap = '', wachtOp = '' } = input || {};
  g.stap = stap;
  g.wachtOp = wachtOp || '';
  if (g.started) return view(g, 'klaar', 'niets');
  if (done) g.state = 'klaar';
  else if (g.wachtOp) g.state = 'wacht-host';
  else if (Number.isFinite(elapsedS) && elapsedS >= HANG_S) g.state = 'hangt';
  else g.state = 'laadt';
  if (g.pressAt != null && nowMs - g.pressAt > REMEMBER_MS) g.pressAt = null; // te oud: de speler is het allang vergeten
  if (g.state === 'klaar' && g.pressAt != null) { g.pressAt = null; g.started = true; return view(g, g.state, 'door'); }
  return view(g, g.state, 'niets');
}

// Een Enter (of Escape/spatie) van de speler. 'door': sluit nu; 'onthoud': nog niet, de melding zegt waarop gewacht wordt;
// 'niets': al gestart.
export function gatePress(g, nowMs) {
  if (g.started) return { actie: 'niets', melding: '' };
  if (g.state === 'klaar' || g.state === 'hangt') { g.started = true; g.pressAt = null; return { actie: 'door', melding: '' }; }
  g.pressAt = nowMs;
  return { actie: 'onthoud', melding: g.state === 'wacht-host' ? `Wachten op ${g.wachtOp}` : `Nog even: ${g.stap || 'het laden'}` };
}

function view(g, state, actie) {
  const status = state === 'wacht-host' ? `Wachten op ${g.wachtOp}`
    : state === 'klaar' ? 'Klaar'
      : state === 'hangt' ? 'Dit duurt langer dan normaal. Het spel is niet vastgelopen.'
        : 'Laden…';
  const sub = state === 'hangt' ? `Nog bezig met: ${g.stap || 'laden'}` : state === 'laadt' ? g.stap : '';
  return { state, prompt: state === 'klaar' || state === 'hangt', promptTekst: state === 'hangt' ? 'Toch doorgaan' : 'Verder', status, sub, actie };
}
