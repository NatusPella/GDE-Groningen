// Per scène de stand van de muziek (muziek: 'vol' | 'laag' | 'uit'), voor de regie (aaa30). Zonder regel hier en zonder `music` in de
// scène-data kiest sfx/cutmix.js zelf: vooral praten is 'uit', een rustige scène 'laag', een scène zonder regels 'vol'.
// Sleutel = de scène-id van de host (story-<sleutel>, zie cutscenehost.js). Voorbeeld voor een emotionele slag:
//   'story-M27.outro': 'vol',
export const SCENE_MUSIC = {};
