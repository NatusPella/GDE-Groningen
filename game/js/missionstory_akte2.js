// The STORY entries of act 2's own missions (M09, M10), by mission id (missionstory.js storyOf); the lines are the script's (see entryFor).
export const STORY_AKTE2 = {
  // M09 Heel aankomen is ook een kunst: sixty eggs in Geesje's tractor
  eieren: {
    npc: 'geesje', outroPose: 'hips', ask: 0, textOnly: true,
    intro: [['N', 'Ik ben Geesje, kosteres van de wierdekerk in Usquert. Trijntje belde.']],
    outro: [['N', 'De kratten staan heel. Dat is een kerkelijk wonder.']],
    replay: [['N', 'Weer eieren? De kippen zeggen dank.']],
    fail: [['A', 'Meer dan de helft kapot. Terug naar Geesje, nieuwe kratten.'], ['T', 'Ik reed niet rap.'], ['A', 'Je reed rap genoeg.']],
  },
  // M10 Een trekker-limo op de wierde: the quad against Jelle's tractor-limo; the sloot scene is a stage of the mission
  wierde: {
    npc: 'jelle', outroPose: 'hips', ask: 0, textOnly: true,
    introCast: [{ key: 'durk', pose: 'arms' }, { key: 'douwe', pose: 'arms' }], introProps: ['limo'],
    intro: [['N', 'Goedemiddag. Jelle Terpstra, Us Mem Snacks.']],
    outro: [['A', 'Hij hield de koffer boven water.']],
    replay: [['A', 'Weer over de wierdepaden. De limo past er nog steeds niet tussen.']],
    fail: [['A', 'De limo had ons te pakken. Nog een keer, over de wierdepaden.'], ['T', 'Hij heeft vlaggetjes. Dat is oneerlijk.']],
  },
};
