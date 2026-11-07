// Spelbot (#312): de menus van de telefoon, het pauzemenu, de trein en de bus, puur. De bot moet ze kunnen
// openen, doorlopen en sluiten zonder te blijven hangen; de pagina-helft voert de toetsen uit.
// scherm: null (dicht), 'telefoon', 'pauze', 'trein', 'bus'.
export const MENU = { stap: 90 };

export function menuStap({ scherm = null, items = [], index = 0, doel = null } = {}) {
  if (!scherm) return { toets: ['e'], why: 'menuscherm openen' };
  if (scherm === 'pauze') {
    if (doel && items[index] && items[index].id === doel) return { toets: ['enter'], why: 'pauze-item kiezen' };
    if (items.length) return { toets: ['down'], why: 'door het pauzemenu lopen' };
    return { toets: ['escape'], why: 'pauze sluiten' };
  }
  if (scherm === 'telefoon') {
    if (!items.length) return { toets: ['escape'], why: 'telefoon sluiten' };
    if (doel && items[index] && items[index].id === doel) return { toets: ['enter'], why: 'app openen' };
    return { toets: ['down'], why: 'naar de volgende app' };
  }
  if (scherm === 'trein' || scherm === 'bus') {
    if (doel && items[index] && items[index].id === doel) return { toets: ['enter'], why: 'bestemming of lijn kiezen' };
    if (items.length) return { toets: ['down'], why: 'door de lijst' };
    return { toets: ['escape'], why: 'sluiten' };
  }
  return { toets: ['escape'], why: 'onbekend scherm: sluiten' };
}

// Eén stap per keer: welk item is na deze toets gekozen (voor de test en de pagina-helft).
export function menuIndex(scherm, items, index, toets) {
  if (!items.length) return index;
  if (toets === 'down') return (index + 1) % items.length;
  if (toets === 'up') return (index - 1 + items.length) % items.length;
  return index;
}
