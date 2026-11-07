// #655: een gast met openstaande verdiensten waarvoor het schrijven mislukt
// (opslag vol/geblokkeerd) probeerde het elke frame opnieuw: elke 16 ms een
// readSlot + serialize + stringify. Nu met een korte backoff; een geslaagde
// poging zet de teller weer op nul. Pure regel, los te testen.
export const GUEST_RETRY_MS = 5000;

export function guestRetryDue(now, retryAt) {
  return now >= retryAt;
}
