// #688: één invoer- en stopconventie voor alle activiteiten (minigames, diensten, verhalen).
// Eén bron voor de toetsen, zodat het bord, de helpregel en de test hetzelfde zeggen. Toetsen blijven
// via input.js heringedeeld; dit bestand noemt alleen de standaardtoetsen.
export const ACTIE_TOETS = 'e';          // de standaard "doen"-toets in de wereld
export const STOP_DIRECT = ['backspace']; // stopt meteen (de pad-B komt hier ook binnen)
export const STOP_VRAAG = 'escape';       // vraagt eerst "Stoppen?"
export const STOP_BEVESTIG = ['escape', 'enter'];
export const STOP_DOORGAAN = [' '];
export const STOP_UITZONDERING = { id: 'hengelen', start: 'i', tekst: 'Vrij hengelen start met I; dat staat in de kaart en in het toetsenoverzicht.' };

// De uitkomst van één frame: 'stop' (meteen of bevestigd), 'vraag' (open het venster), 'door' (venster weg)
// of null. Puur; de aanroeper leest de toetsen en consumeert ze.
export function stopUitkomst({ direct = false, vraagOpen = false, bevestig = false, doorgaan = false, start = false } = {}) {
  if (direct) return 'stop';
  if (vraagOpen) return bevestig ? 'stop' : doorgaan ? 'door' : null;
  return start ? 'vraag' : null;
}

// De toetsen als één lijst voor het toetsenoverzicht en de helpregel (2-3 kern toetsen, geen muur).
export function stopToetsen() {
  return { actie: ACTIE_TOETS, direct: [...STOP_DIRECT], vraag: STOP_VRAAG, bevestig: [...STOP_BEVESTIG], doorgaan: [...STOP_DOORGAAN], uitzondering: STOP_UITZONDERING };
}
