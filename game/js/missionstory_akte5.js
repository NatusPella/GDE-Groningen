// The STORY entries (missionstory.js) of the act 5 defs that exist only in the new arc: M22 'luik' and M23 'colonne'.
// The lines are the script's (entryFor swaps in the step's `story` scene ids); these are the staging and the fail lines.
export const AKTE5_STORY = {
  luik: {
    // M22 Een luik erin (new story): Henk and Tinus in the barn near Zuidhorn
    npc: 'henk', outroPose: 'hips', ask: 0, textOnly: true,
    intro: [['N', 'Weer een luik.']],
    outro: [['N', 'Het luik zit erin.']],
    replay: [['N', 'Weer een luik? Dit is een karaktertrek.']],
    fail: [['A', 'De Escapade zit nog in de modder.'], ['T', 'Dan gaat het luik er weer uit.']],
  },
  colonne: {
    // M23 De colonne (new story): Wubbo and the friends of Oma
    npc: 'wubbo', outroPose: 'arms', ask: 0, textOnly: true,
    intro: [['N', 'De brug draait op tijd.']],
    outro: [['N', 'Allemaal op de Grote Markt.']],
    replay: [['A', 'Weer een colonne? Rijden. Niet praten.']],
    fail: [['A', 'Sikkom. De colonne is uit elkaar.'], ['T', 'Jelle weet hoe je een stoet splitst.']],
  },
};
