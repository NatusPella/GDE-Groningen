# Sprint 22-11: mensen, voertuigen en dieren (graphics)

Gebied: kwaliteit en variatie van NPC-modellen, voertuigen en dieren; animaties zonder glitches; culling en LOD zonder zichtbare overgangen.
Werkwijze: geen Electron en geen build; alles is in Node gemeten en met de softwarerenderer (`scripts/lib/kleding_clip_png.mjs`) in een PNG bekeken.
Eigen branch `sprint-graphics-mensen-22-11`; het spel zelf is **nog niet in beeld bekeken**.

## Voor en na

| Onderdeel | Voor | Na | Bewijs |
| --- | --- | --- | --- |
| Kippen van Bezit (`herdview3d.js`) | een eend (`buildDuckMesh3D('hen')`) stond voor elke kip | een echte kip: `buildChickenMesh3D`, vier looks, hennen en hanen, kam, lellen, staart, poten met tenen; 340 tot 540 driehoeken | `scripts/dierenmodel_test.mjs` |
| Houding van het vee op je weide | alle dieren in dezelfde rust-pose, een rij standbeelden | `poseHerdAnimal`: vast per zaad rechtop, opzij kijkend, grazend of diep grazend (koe, schaap, kip) | idem, plus beeldblad |
| Schapen | een model voor elk schaap (witte wol, zwart gezicht) | `SHEEP_LOOKS`: vier soorten, het zaad kiest; weiland (`countryside.js`, een sjabloon en een sleutel per soort) en kudde | idem |
| Bestuurder in verkeer (`scene3d.js`) | aan en uit op een kale drempel van 70 m | `hystVisible` (zoals de gevels): geen geknipper bij een auto die rond 70 m rijdt | `scripts/lod_figuren_test.mjs` |
| Kleur van het verkeer (`trafficfleet.js`) | standaardpalet: 3 van 11 kleurig en donker | 7 van 16 kleurig, met een echt blauw, rood, champagne, grasgroen en zilverblauw; grijs blijft de meerderheid in beeld | `scripts/verkeerkleur_test.mjs` |

## Wat gemeten is en niet gevonden
- Alle wildlife-modellen (koe, schaap, eend, gans, reiger, zeehond, vis, duif, meeuw, kat, hond): eindige hoekpunten, driehoeken 62 tot 690. De geanimeerde poses (lopen, rennen, grazen, zitten, poetsen, aaien, snuffelen) van koe, schaap, kat en hond komen niet door de grond (laagste punt -0,035 m bij het grazen van een koe: de snuit in het gras, gewenst).
- Voetglijden van lopende NPC's: een eerste meetopzet (`animatePersonWalk`, voorwaartse kinematica) liet bij het begin van de stand een korte plateau zien (de voet staat 0,1 s stil ten opzichte van het lichaam), maar de stand-detectie was niet betrouwbaar genoeg om er een drempel op te zetten; de proefwijziging (driehoeksgolf voor de heupzwaai) is teruggedraaid. Open: een betere meting (heel- en teenpunt uit de gevilde mesh) en dan de heupzwaai.
- Geen kinderen in de menigte: bewust niet toegevoegd (18+, zie constitution 6 en de PvP-regels); een besluit voor de eigenaar.

## Samen spelen
- Het vee is per speler (#429, `herdsVisible`): een gast ziet het niet; de nieuwe kip, de poses en de schaapsoorten raken dus alleen de wereld van wie het spel opende en gaan niet over het net.
- Schapen en koeien in het weiland van de provincie (`countryside.js`) worden lokaal door elke speler uit het eigen zaad gebouwd; het zaad bepaalt de soort. Een gast kan dus een andere soort schaap op dezelfde plek zien als de host als zijn zaad afwijkt (dat gold al voor de plek zelf); er is niets om te synchroniseren.
- De bestuurdersfiguur en de verkeerskleur zijn beeld bij elke speler lokaal.

## Wat in beeld bekeken moet worden (nog niet bekeken in het spel)
1. Een eigen weide met kippen, schapen en koeien (Bezit): lijken de kippen op kippen vanaf 5 en vanaf 30 m, staan de poses natuurlijk (grazende dieren niet in de grond)?
2. Weilanden in de provincie: zijn de vier schaapsoorten zichtbaar zonder dat een kudde bont lijkt; geen haperingen bij het bouwen van een kudde (een sjabloon per soort, vier in plaats van een).
3. Verkeer rond 70 m: een stilstaande of schommelende auto met bestuurder: geen geknipper.
4. Een straat in het centrum: is de kleurmix aangenaam en niet te bont?
5. Beeldbladen opnieuw maken: `node scripts/dieren_blad_render.mjs <map> kip|koe|schaap|eend [n]` en `node scripts/npc_blad_render.mjs <map> [n] [rol] [voor|zij]`.

## Scripts
- `scripts/dierenmodel_test.mjs` (kip, schapen, poses, begroting), `scripts/lod_figuren_test.mjs`, `scripts/verkeerkleur_test.mjs`.
- `scripts/dierenmodel_audit.mjs` (bouw en grootte van alle dieren), `scripts/dierenpose_audit.mjs` (laagste en hoogste punt per pose; de eend zit op kanaalhoogte, de duif en de meeuw hangen met hun poten onder het lichaamsmiddelpunt: die getallen zijn hoogtes, geen fouten).
