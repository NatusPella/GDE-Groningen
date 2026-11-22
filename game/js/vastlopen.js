// QoL (#985): een voertuig dat klem zit (tussen muren, op een helling) met het gas ingedrukt. Na een paar
// seconden stilstaan zegt een hint hoe je jezelf vrijzet, en met Backspace ingedrukt (anderhalve seconde)
// doet het hetzelfde als Esc > Spel > Overzicht > "Vastgelopen? Zet me vrij". Pure regels, geen DOM;
// safety.js voedt ze elke frame en voert de vrijzetting uit.
export const VAST_STIL_S = 6;      // zo lang stilstaan met gas voordat de hint komt
export const VAST_HOUD_S = 1.5;    // zo lang Backspace vasthouden om vrij te komen
const VAST_SNELHEID = 0.4;  // m/s: daaronder staat het voertuig stil

export const nieuwVast = () => ({ stil: 0, houd: 0, hint: false });

export const VAST_HINT = 'Zit je vast? Houd {BACKSPACE} ingedrukt om jezelf vrij te zetten, of kies {ESC}, Spel, Overzicht, Vastgelopen.';

// Eén frame. invoer: { inVoertuig, gas (gas of rem ingedrukt), snelheid, bezig (een scène, menu of minigame), houdt (Backspace) }.
// Geeft { vast, hint, vrij } terug en werkt `st` bij: hint één keer per vastzit-periode, vrij zodra de toets lang genoeg is vastgehouden.
export function stapVast(st, dt, { inVoertuig, gas, snelheid, bezig, houdt }) {
  if (!Number.isFinite(dt) || dt < 0) dt = 0; // verfijning 22-11: één rotte frame (NaN) maakte de teller NaN en de hint kwam nooit
  const klem = !!inVoertuig && !bezig && !!gas && Math.abs(snelheid || 0) < VAST_SNELHEID;
  if (!klem) {
    st.stil = 0; st.houd = 0;
    if (!inVoertuig || Math.abs(snelheid || 0) > 2) st.hint = false;
    return { vast: false, hint: false, vrij: false };
  }
  st.stil += dt;
  const vast = st.stil >= VAST_STIL_S;
  let hint = false;
  if (vast && !st.hint) { st.hint = true; hint = true; }
  st.houd = vast && houdt ? st.houd + dt : 0;
  const vrij = st.houd >= VAST_HOUD_S;
  if (vrij) { st.houd = 0; st.stil = 0; }
  return { vast, hint, vrij };
}
