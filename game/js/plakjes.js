// The plakjesbord of the new story (docs/verhaal/nieuw 00-OVERZICHT "Het plakjesbord"): Jelle buys Grunn up
// slice by slice. "Wat weten we?" (the pause menu, Verhaal › Aanwijzingen) shows the slices the pair know
// about and how each one ended. Pure, no imports; story.js hands in the steps that are done.
//   step     the mission step that settles the slice
//   reveal   the step from which the slice is on the board (when it starts, or the koopboek of M12 shows all of them)
//   result   how it ends: 'gered' (won back), 'verloren' (Jelle keeps it) or 'geblokkeerd' (stopped for now)
export const PLAKJES = [
  { n: 1, name: 'Standplaatsen', step: 'M03', reveal: 'M03', result: 'verloren', open: 'Jelle koopt de rij en alle vrije standplaatsen van het jaar.', ended: 'Alle vrije standplaatsen zijn van Jelle. Alleen die van de winnaar blijft vrij.' },
  { n: 2, name: 'Vet', step: 'M07', reveal: 'M07', result: 'gered', open: 'Jelle koopt al het vet van Grunn.', ended: 'Het vet staat bij de snackbars in de Oosterpoort.' },
  { n: 3, name: 'Eieren', step: 'M09', reveal: 'M09', result: 'gered', open: 'Jelle kocht alle eieren van het Hogeland, behalve die van Geesje.', ended: 'Zestig eieren, heel in de kerkkelder van Usquert.' },
  { n: 4, name: 'Zout', step: 'M11', reveal: 'M11', result: 'gered', open: 'Jelle kocht de zoutstekers van het wad.', ended: 'Drie kuipen wadzout van de kwelder bij Noordpolderzijl.' },
  { n: 5, name: 'Haven', step: 'M13', reveal: 'M12', result: 'gered', open: 'Jelle zegt dat de Eemshaven van hem is.', ended: 'Lammerts haven blijft open.' },
  { n: 6, name: 'Bloem en jury', step: 'M15', reveal: 'M12', result: 'verloren', open: 'Jelle koopt de molen en de juryleden.', ended: 'De bloem is definitief van Jelle, en een jurylid ook.' },
  { n: 7, name: 'Mosterd', step: 'M17', reveal: 'M12', result: 'gered', open: 'Jelle wil de mosterd van de Veenkoloniën.', ended: 'De mosterd blijft van Grunn.' },
  { n: 8, name: 'De bewaarder', step: 'M26', reveal: 'M12', result: 'geblokkeerd', open: 'De notaris tekent op 28 augustus de laatste verkoop.', ended: 'De notaris komt niet door: de weg is dicht.' },
];

// -> [{ n, name, state: 'open' | 'gered' | 'verloren' | 'geblokkeerd', text }] for the slices on the board
// done: Set of step ids that are done; current: the id of the step being played (or null)
export function plakjesState(done, current = null) {
  const out = [];
  for (const p of PLAKJES) {
    if (!(done.has(p.reveal) || done.has(p.step) || current === p.reveal || current === p.step)) continue;
    const ended = done.has(p.step);
    out.push({ n: p.n, name: p.name, state: ended ? p.result : 'open', text: ended ? p.ended : p.open });
  }
  return out;
}


