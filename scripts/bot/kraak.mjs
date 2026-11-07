// Spelbot (#312): de kraak-minigames van M06 (stroomkast en fuse), puur: geen Electron, geen DOM.
// De pagina-helft leest de fase/opties/naald uit het scherm; hier staat de keuze en het moment.
export const KRAAK = { marge: 0.12 };

export function kraakStep(s = {}) {
  const fase = s.fase || 'kies';
  const opties = Array.isArray(s.opties) ? s.opties : [];
  if (fase === 'klaar') return { toets: ['e'], why: 'klaar: bevestigen' };
  if (fase === 'kies') {
    const a = opties.find((o) => (o && (o.id || o.key || o.label)) === 'a' || (o && o.label === 'A'));
    return { toets: a ? ['a'] : [], why: a ? 'A gekozen' : 'geen A in de opties' };
  }
  if (fase === 'naald') {
    const naald = Number(s.naald), doel = Number.isFinite(s.doel) ? s.doel : 0.5;
    const marge = Number.isFinite(s.marge) ? s.marge : KRAAK.marge;
    return Number.isFinite(naald) && Math.abs(naald - doel) <= marge
      ? { toets: [' '], why: 'in de marge: drukken' }
      : { toets: [], why: 'wachten tot de naald in de marge komt' };
  }
  return { toets: [], why: 'wachten' };
}
