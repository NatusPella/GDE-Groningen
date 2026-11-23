# 0053 - De wolf: een echt gevaarlijk dier zonder getoond geweld

- **Status:** besloten (eigenaar, 23-11; via de coördinator)
- **Datum:** 2026-11-23
- **Spec:** `mechanica.md` (dieren), `multiplayer.md` (wereld van de host), `constitution.md` (artikel 6)
- **Gerelateerd:** ADR 0050 (gelicenseerde modellen en animatiesets, op `personages-leven-23-11`), `game/js/provinceanimals.js`, `scripts/provinciedieren_test.mjs`

## Context

De eigenaar wil alle dieren die in de provincie Groningen passen in het spel, en daarbij een wolf die echt gevaarlijk is:
hij mag aanvallen en schade doen. Grondwet artikel 6 zegt buiten PvP "zonder getoond geweld". Zonder een vaste invulling
wordt elke volgende wolf (of beer, of hond die bijt) opnieuw een discussie over wat wel en niet mag.

## Besluit

1. **Aanval met schade, geen bloed.** De wolf bijt de speler voor `WOLF_BITE` (14) schade per beet, met 1,1 s tussen de
   beten. De beet loopt via `combat.js damagePlayer` als gewone melee-schade: dezelfde gevolgen als elke andere klap
   (pantser, blok, hulpinstellingen, neervallen en de bestaande respawn bij 0 gezondheid). Geen bloed, geen gore, geen
   wonden, geen getoond slachtoffer.
2. **Zeldzaam en aangekondigd.** Alleen 's nachts (20 tot 7 uur), alleen in de grensstreek (Westerwolde, Veenkoloniën,
   een enkele in het Oldambt), ver van huizen (buiten de bebouwde kom, bijna geen bebouwing), hoogstens één tegelijk.
   Eerst hoor je gehuil ("In de verte huilt een wolf."), dichterbij zie je sporen ("Verse pootafdrukken in het zand.").
3. **Gedrag.** Op 30 m blijft hij staan en kijkt hij je aan (loeren). Binnen 9 m, of als je op hem af blijft lopen,
   valt hij aan. Een auto verjaagt hem, net als een speler die hard op hem afrent terwijl hij loert; na drie beten gaat
   hij er zelf vandoor. Hij verdwijnt daarna uit de streek.
4. **Vee.** Met niemand in de buurt kan hij een schaap, koe of gans pakken: dat dier rent weg en is weg (uit beeld),
   zonder getoonde aanval. Wie in de buurt is (120 m) leest "Er ontbreekt een dier in de wei. Er liep hier een wolf."
5. **Samen spelen.** De wolf leeft in de wereld van de host. Hij richt zich op de dichtstbijzijnde speler. Elke speler
   neemt de beet in zijn eigen spel: de host voor zichzelf (`provinceanimals.js`), een gast wanneer de snapshot van de
   host de wolf in de aanvalsstand vlak naast hem toont (`coopextra3d.js`, het aux-veld van het dierenbericht). Schade
   is per speler; er gaat geen nieuw bericht over het net. Een oudere gast ziet de wolf, maar krijgt geen beet.
6. **Voorgestelde zin voor grondwet artikel 6** (de coördinator zet hem in `AGENTS.md`; een agent wijzigt de grondwet niet):
   "Uitzondering (goedgekeurd door de eigenaar op 23-11, ADR 0053): de wolf is een echt gevaarlijk dier; hij valt aan als
   je te dichtbij komt en doet schade zoals elke andere klap (neervallen kan), zonder bloed of gore; hij is zeldzaam
   (bos, heide en grensstreek, 's nachts), wordt aangekondigd met sporen en gehuil, kan vee pakken zonder getoond geweld
   en is te verjagen; bij Samen spelen leeft hij in de wereld van de host en neemt elke speler de schade in zijn eigen spel."

## Afgewezen

- **Een wolf die alleen bang is (zoals ree en vos).** Afgewezen door de eigenaar: hij moet echt gevaarlijk zijn.
- **Bloed en verwondingen zoals in PvP.** Artikel 6 staat bloed alleen toe bij PvP tussen spelers die beiden niet op
  passive mode staan; een dier hoort daar niet bij.
- **Een getoonde aanval op vee.** Te dicht bij "een echt slachtoffer als grap"; het dier verdwijnt uit beeld.
- **De host stuurt de schade naar de gast over het net.** Een nieuw bericht en een autoriteitsvraag; elke speler neemt
  de beet zelf, zoals elke speler ook zijn eigen voortgang heeft (#429).

## Gevolgen

- `provinceanimals.js` (spawn, gedrag, de wachtrij `animalHits`), `main.js` (`takeAnimalHits` na de dieren, ook op een
  gast), `coopextra.js` / `coopextra3d.js` (stand van de wolf in het aux-veld), `dierenregister.js` (wolf, zeldzaam).
- Test: `scripts/provinciedieren_test.mjs` (sporen, loeren, aanvallen, drie beten, verjagen met een auto, vee, alleen de
  eigen speler, spawn alleen 's nachts in de grensstreek).
- Leeftijdsclassificatie (#60): een gevaarlijk dier dat de speler kan laten neervallen, zonder bloed; het spel is al 18+.
