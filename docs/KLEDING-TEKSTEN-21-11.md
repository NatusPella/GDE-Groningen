# Teksten die kleding noemen (21-11, epic Kleding)

Doel: een gesprek of regie-regel zegt niets over kleding dat niet meer klopt als de speler iets anders aanheeft. Bron: `game/storydata/script.json` (23 treffers op pet, jas, colbert, hoed, bril, schoenen, trui, sjaal, broek, kleren, haar en dergelijke), plus de teksten in de code.

## Aangepast (neutraal gemaakt)

| Plek | Was | Nu |
|---|---|---|
| scene 7, regie | "Tammo kijkt naar Tessa's rode jas, en dan naar de telefoon." | "Tammo kijkt naar Tessa, en dan naar de telefoon." |
| scene 22, regie | "Een duif landt op zijn pet." | "Een duif landt op zijn schouder." |
| scene 98, regie (akte 3) | "ze trekt hem aan zijn jas naar zich toe" | "ze trekt hem aan zijn kleren naar zich toe" |
| Spullen, lege kleding | "Stoer & Stads heeft een paar setjes." | "Stoer & Stads heeft losse stukken en setjes." |

De bronbestanden `docs/verhaal/nieuw/09-script-akte1.md` en `09-script-akte3.md` zijn mee aangepast. Regie-regels worden niet ingesproken; `voice_coverage` blijft 2898/2898.

## Blijft staan, met reden

| Plek | Tekst | Reden |
|---|---|---|
| scenes 1, 8, 14, 18, 23, 24, 118 | Jelle, "een Fries in een blauw colbert" | Jelle heeft een vaste look in `storycast.js` (JELLE_LOOK: blauw colbert). Verhaalfiguren gaan voor een rol; dit blijft kloppen. |
| scene 18, regie | oude dame met een hoed (Mevrouw Hoving) | Vaste NPC-look. |
| scene 6 | "Een terrasstoel met een hoed erop" | Grap over een voorwerp, niet over de speler. |
| scene 71 | "twee mensen in zwarte kleding op het wad" | Over anderen. |
| scene 83, regie | "Tammo kijkt naar zijn schoenen." | Schoenen kun je wisselen maar niet uitdoen; dit klopt altijd. |
| scene 185 | "Schoenen mogen aan." | Idem. |
| scenes 22 (regel), 125, 133, 148 | Tammo's jas met de autosleutel; "hier is je jas, met een strikje" | Het verhaal gebruikt de jas als voorwerp. Tammo draagt niet altijd een jas. Voor de verhaal-lead: een scène die dit nodig heeft kan het outfit forceren met `setStoryOutfit({ tammo: { outer: 'jack.blauw', ... } })` (zonder kosten, daarna zijn eigen kleren terug), of de regel kleding-onafhankelijk maken ("de autosleutel in zijn zak"). Niet aangepast omdat het gesproken regels zijn (nieuwe opname nodig). |

## Regels voor nieuwe teksten

1. Noem geen kledingstuk van Tammo of Tessa tenzij de scène het outfit forceert.
2. Een NPC met een vaste look mag zijn kleding wel noemen; zet die look in `storycast.js`.
3. Een regie-regel mag een kledinghandeling noemen (jas uit, pet af) als de scène het outfit tot het einde van de scène vasthoudt (R-xx continuïteit uit de regie-bijbel).
4. Teksten in winkels en menu's tonen alleen wat de data zegt (`clothingdata.js`).
