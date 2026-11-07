// #653: elke politie-eenheid deed elke 0,25 s een lijncontrole: bij 6-10 eenheden
// honderden grid-queries per seconde, precies tijdens een achtervolging. Een klein
// budget per tijdvenster begrenst dat; de eenheid houdt haar vorige _sees dan even.
export function makeLosBudget(maxPerWindow = 3, windowMs = 100) {
  let start = -Infinity, used = 0;
  return (now) => {
    if (now - start >= windowMs) { start = now; used = 0; }
    if (used >= maxPerWindow) return false;
    used++;
    return true;
  };
}
