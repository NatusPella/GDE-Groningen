// Waarschuwing als de missie- of klustijd bijna op is (#985): een melding en een piep bij 30 en 10 s.
// Pure functie, zodat de HUD alleen de vorige en de huidige stand hoeft door te geven.

export const TIME_WARN_AT = [30, 10];

// prev: de stand bij de vorige meting (null als er nog geen was), now: de stand nu, in seconden.
// Geeft de drempel (30 of 10) die we net zijn gepasseerd, anders 0. Bij een sprong over beide
// drempels komt alleen de laagste (de dringendste); bonustijd die de klok weer boven een drempel
// brengt, scherpt de waarschuwing vanzelf opnieuw aan. Bij de start geen waarschuwing: wie een
// korte limiet kreeg, weet dat al.
export function timeWarning(prev, now) {
  if (!Number.isFinite(prev) || !Number.isFinite(now) || now <= 0 || now >= prev) return 0;
  for (let i = TIME_WARN_AT.length - 1; i >= 0; i--) {
    const t = TIME_WARN_AT[i];
    if (prev > t && now <= t) return t;
  }
  return 0;
}

export function timeWarningText(t) {
  return t <= 10 ? 'Nog 10 seconden!' : `Nog ${t} seconden`;
}
