// Kleine, pure tijdpoort voor werk dat niet elke frame hoeft (politie-scans,
// Ommeland-solids). Eén regel per gebruiker, los te testen.
export function makeTick(intervalMs) {
  let at = -Infinity;
  return (now) => {
    if (now - at < intervalMs) return false;
    at = now;
    return true;
  };
}
