// The STORY entries of Deel 4's missions (M27-M30, docs/verhaal/nieuw/DEEL4.md), by mission id (missionstory.js storyOf); the
// lines are the script's (09-script-akte6.md, see entryFor): what stays here is the NPC, the pose and the fail lines.
export const STORY_AKTE6 = {
  // M27 Inpakken: Willemien in Loppersum
  inpakken: {
    npc: 'willemien', outroPose: 'hips', ask: 0, textOnly: true,
    intro: [['N', 'Jullie zijn van Trijntje. Kom binnen.']],
    outro: [['N', 'Het is een huis. Het moet alleen even blijven staan.']],
    replay: [['N', 'Nog een doos? Er is altijd nog een doos.']],
    fail: [['A', 'Dat ging mis. Nog een keer.'], ['T', 'De kat wil nog steeds niet in de mand.']],
  },
  // M28 De wisselwoning: the drive with Willemien and the cat
  wisselwoning: {
    npc: 'willemien', outroPose: 'hips', ask: 0, textOnly: true,
    intro: [['N', 'Rustig rijden. Niet om de spullen. Om mij.']],
    outro: [['N', 'Hij vindt het niks.']],
    replay: [['N', 'Nog een ritje? De kat blijft hier.']],
    fail: [['A', 'Dat ging te rap.'], ['T', 'Ik reed rustig.'], ['A', 'Rustiger.']],
  },
  // M29 Terug: back home, and the neighbours' party
  terug: {
    npc: 'willemien', outroPose: 'hips', ask: 0, textOnly: true,
    intro: [['N', 'Een paar weken, zeiden ze. Dit keer klopte het.']],
    outro: [['N', 'Zeg tegen Trijntje: ik ben thuis.']],
    replay: [['N', 'Kom maar binnen. Koffie staat.']],
    fail: [['A', 'Dat ging mis. Nog een keer.'], ['T', 'Het huis wacht wel.']],
  },
  // M30 Het proefbeleg: Berend, the bishop
  proefbeleg: {
    npc: 'berend', outroPose: 'hips', ask: 0, textOnly: true,
    intro: [['N', 'Het proefbeleg van Bourtange. Ik tel alleen.']],
    outro: [['N', 'Dan is winnen verkeerd.']],
    replay: [['N', 'Weer het beleg? Ik win nog steeds niet graag.']],
    fail: [['A', 'De vesting hield stand. Het proefbeleg begint opnieuw.'], ['T', 'Een kartonnen kanon houdt niet alles tegen.']],
  },
};
