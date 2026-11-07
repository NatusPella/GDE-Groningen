// Spelbot (#312): de achtervolging te voet of met een voertuig (M14, M26), puur: geen Electron, geen DOM.
// De pagina-helft leest de afstand en de voertuigstaat en voert de toetsen uit; hier staat alleen de keuze.
export const CHASE = { grab: 2.2, board: 18, keep: 40 };

export function chaseStep(s = {}) {
  const afstand = Number.isFinite(s.afstand) ? s.afstand : Infinity;
  const inVoertuig = !!s.inVoertuig;
  const doelInVoertuig = !!s.doelInVoertuig;
  const heeftVoertuig = !!s.heeftVoertuig;
  if (s.doelWeg) return { actie: 'klaar', toets: [], why: 'het doel is weg' };
  if (!inVoertuig && doelInVoertuig && heeftVoertuig && afstand > CHASE.board) {
    return { actie: 'instappen', toets: ['e'], why: 'het doel rijdt weg: pak je eigen voertuig' };
  }
  if (!inVoertuig && !doelInVoertuig && afstand <= CHASE.grab) {
    return { actie: 'grijpen', toets: ['e'], why: 'dichtbij genoeg om te grijpen' };
  }
  if (inVoertuig && afstand > CHASE.keep) return { actie: 'achtervolgen', toets: [], why: 'gas houden, afstand bewaken' };
  return { actie: 'achtervolgen', toets: [], why: inVoertuig ? 'gas houden' : 'rennen' };
}
