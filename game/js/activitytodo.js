// Catalogusregel voor "Te doen" (#677): elke activiteit uit activities.js hoort in de lijst te staan,
// ook als de activiteit zelf geen `todo`-regel meelevert. Deze module maakt dan één nette standaardregel
// uit wat de activiteit al heeft (naam, legenda, plek), zodat "Te doen" dezelfde bron gebruikt als de
// kaart en er geen activiteit meer buiten de catalogus valt. Puur: geen DOM, geen THREE, geen opslag;
// activities.js vult de samen-status en zet de regel in de lijst.
export function standaardTodo(a, spot) {
  if (!a || !spot || !a.id) return null;
  const titel = String(a.todoTitel || a.label || a.titel || a.name || a.id);
  const note = (a.legend && a.legend.note) || a.mapSub && a.mapSub(spot) || 'Vrije activiteit in de stad';
  const meta = spot.name ? `${spot.name} · ${note}` : note;
  return {
    key: `act:${a.id}`,
    group: 'minigames',
    icon: (a.legend && a.legend.kind) || null,
    title: titel,
    code: '',
    meta,
    // een activiteit zonder eigen wedstrijdstatus is altijd open; de activiteit zelf kan hem 'later' zetten
    status: '',
    medal: null,
    record: '',
    x: spot.x, y: spot.y,
    goal: { kind: 'place', id: a.id, name: titel, sub: spot.name || 'Op de kaart', x: spot.x, y: spot.y },
    detail: {
      kicker: (a.legend && a.legend.label) || 'Activiteit',
      text: note,
      rows: [
        ['Waar', spot.name || 'Op de kaart'],
        ['Hoe', 'Loop erheen en druk E om mee te doen'],
      ],
    },
  };
}
