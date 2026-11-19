// #985: het laadscherm is te onderbreken. Na een korte tijd verschijnt "Verder"; een tik, Enter of
// Escape sluit het scherm zonder te wachten tot alles gestreamd is (de wereld bouwt daarna door).
// Het kleine snelreis-sprongetje heeft het niet nodig. Puur, zonder DOM, zodat het te testen is.

export const SKIP_AFTER_S = 2.5;

export const skipReady = (kind, elapsedS) => kind !== 'snel' && Number.isFinite(elapsedS) && elapsedS >= SKIP_AFTER_S;

// De toetsen die het laadscherm doorlaten. Met een modifier (Ctrl+Enter, Alt+Enter) niet.
export function isSkipKey(e) {
  if (!e || e.ctrlKey || e.altKey || e.metaKey) return false;
  return e.key === 'Enter' || e.key === 'Escape' || e.key === ' ';
}
