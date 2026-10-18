// The story entries of akte 4's new missions (missionstory.js STORY, keyed by mission id here so the four
// acts that are built side by side never fight over one index-ordered array). The lines are
// placeholders: the new arc plays the script's text (storyarc_nieuw.js `story`, entryFor in
// missionstory.js); what stays is the NPC, the pose and the fail lines. Plain data, no imports.
export const STORY_AKTE4 = {
  // M17 Open, dicht: Wubbo, the bridge keeper
  bruggen: {
    npc: 'wubbo', outroPose: 'hips', ask: 3, textOnly: true,
    intro: [['N', 'Ik ben Wubbo, brugwachter. Open of dicht. Nooit allebei.']],
    outro: [['N', 'Die brug draait niet voor een limo.']],
    replay: [['N', 'Weer elf bruggen? Mijn bruggen zeggen dank.']],
    fail: [['A', 'De brug ging te laat open.'], ['T', 'Wubbo zegt dat de maat telt.']],
  },
  // M18 Wie draaide de camera's uit?: the account manager of Wiebelwerk
  wiebelwerk: {
    npc: 'accountmanager', outroPose: 'hips', ask: 0, textOnly: true,
    intro: [['N', 'Welkom bij Wiebelwerk. Wij maken websites.']],
    outro: [['N', 'Wiebelwerk stelt niks. Wij kunnen niks.']],
    replay: [['N', 'Weer een intake? Wij zijn altijd open.']],
    fail: [['A', 'Hij ziet ons. De deur gaat dicht.'], ['T', 'Een chatbot hadden we beter kunnen nemen.']],
  },
  // M19 Stoom: the jury member in the salon carriage (the Bewaarder speaks in the outro)
  stoom: {
    npc: 'jurylid', outroPose: 'hips', ask: 2, textOnly: true, outroNpcKey: 'bewaarder',
    intro: [['N', 'Heerlijk. Een eierbal.']],
    outro: [['N', 'Ik stap niet uit. Artikel 9 regelt mijn plaatsvervanger.']],
    replay: [['N', 'Weer een trein?']],
    fail: [['A', 'Je reed door het station heen.'], ['T', 'De rem zit links. Of rechts.']],
  },
  // M20 Het beleg van Bourtange: Berend, the bishop
  beleg: {
    npc: 'berend', outroPose: 'hips', ask: 0, textOnly: true, outroNpcKey: 'mem',
    intro: [['N', 'Het Beleg van Bourtange. De vesting is van ons.']],
    outro: [['N', 'Nu is hij van mij.']],
    replay: [['N', 'Weer een beleg? Wat mout, dat mout.']],
    fail: [['A', 'De vesting viel. Het beleg begint opnieuw.'], ['T', 'Een kartonnen kanon houdt niet alles tegen.']],
  },
};
