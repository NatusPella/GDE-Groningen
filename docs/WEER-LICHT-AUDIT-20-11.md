# Weer, licht en dag-nacht: audit 20-11 (Refs #985)

Doel: AAA-beleving met stabiele prestaties. Dit is een audit van wat er al staat (statisch uit de code, aangevuld met beelden uit Electron), wat lelijk of springerig is, wat veel kost, en wat er in deze ronde aan is gedaan. Alles blijft zomer (AGENTS.md, constitution 3): geen sneeuw, ijs of winterlicht.

## Wat er al staat

- **Dag-nacht** (`daynight.js`, `sunrules.js`, `nightrules.js`): negen sleutelstanden op zonshoogte (60 graden tot -25) met kleur van zon, hemel, horizon, mist, gloed en grading (belichting, bloomdrempel, verzadiging, vignet). Tussen de standen lineair. Zon en maan als schaduwlicht, maanfase over de kalenderdagen.
- **Hemel** (`sky3d.js`): een koepel met een kleurverloop, zon, zonsgloed aan de horizon, maanschijf met fase, regenboog na een bui en een sterrenveld (1400 punten, aandeel per kwaliteitsprofiel) dat vervaagt met wolken en mist. Eén ShaderMaterial; de omgevingsmap (PMREM) wordt hooguit één keer per seconde opnieuw gebakken en overgeslagen als de invoer minder dan 1,5 % veranderd is (`envInputsChanged`).
- **Wolken** (`cloud3d.js`, `cloudlook.js`): een InstancedMesh van 22 wolkjes (laagpoly icosaëders), aantal, tint en dekking volgen bewolking en dag-nacht.
- **Weer** (`weatherstate.js`, `weather.js`, `weatherlook.js`, `weerdag.js`): een pure weermachine per regio (helder, bewolkt, mist, motregen, regenbui, onweer), gedeeld met gasten (`coopweer.js`). Regen is één mesh met 2500 streepjes, bijgewerkt op de CPU, aantal per kwaliteitsprofiel. Mist met zichtbodem en hoogtedemping (#866). Onweer plant inslagen met afstand, flikkeringen en donder met afstandsvertraging (343 m/s, `sfx/weermap.js`, `sfx/ambience.js`).
- **Nat wegdek**: `uWet` in de terrein- en gras-shaders (donkerder, gladder, plassen met ruis, rimpels via `uRainTime`), meer omgevingsreflectie op bestrating, en grip voor het rijmodel (`roadGrip`) die dezelfde plassen volgt. Alleen op `middel` en `hoog` plassen (`QUALITY_LOOK`).
- **Nachtlicht** (`nightlights3d.js`, `nightrules.js`): straatlantaarns met een eigen aanzetdrempel en zachte overgang per lamp, ramen met een brandcurve per gebouwsoort (wonen, winkel, kantoor, horeca), bladerdak dat meedimt, koplampen die met regen en mist meekomen, verkeerslichten die feller worden.
- **Nabewerking** (`postfx3d.js`): `middel` grading en vignet, `hoog` ook bloom. Er is geen lensflare en dat blijft zo: dat zou een extra pass zijn.

## Beelden gezien (Electron, `hoog`, `scripts/weer_shots.mjs`)

Zie `scripts/weer/weer_scenes.js`: zeven momenten (zonsopgang 5,3 u, ochtend 8,5, dag 13, avond 18,5, zonsondergang 20,9, schemering 22, nacht 1) en vijf weerstanden. De vaste plek (Concordiabuurt, camera tegen een garagewand) laat bijna geen hemel zien; wat daardoor wel te beoordelen was:

- **Dag, regen en onweer**: regenstreepjes zijn dun en wit, goed leesbaar tegen donkere gevels, minder tegen lichte; het onweer verdonkert het beeld duidelijk (zon op 15 %); het wegdek is natter en donkerder. Dat leest goed.
- **Mist**: dichtbij (onder de zichtbodem van 16 m) is er geen verschil met helder weer, dus in een smalle straat is mist alleen aan het eind van de straat te zien. Dat is bewust (#866), maar het maakt mist in de stad een zwak effect. Niet veranderd.
- **Bewolkt** op 13 u: kleur en schaduw veranderen subtiel, er is geen duidelijke wolkenlucht in beeld; de wolkenlaag was door de camerahoek niet te beoordelen.
- **Avond (18,5 u) en zonsondergang (20,9 u)** lijken sterk op elkaar in dit kadertje: warm licht, lange schaduwen; de gloed zit in de hemel en die zit niet in beeld.
- **Nacht en schemering**, **lantaarns en ramen 's nachts**, **sterren**, **wolken en zonsopgangshemel**: nog niet bekeken (de beeldrun haalde het tijdslimiet van 240 s niet bij een zwaar belaste machine en daarna wachtte het slot op geheugen). Hier staat dus niets over beweerd.

## Wat springt of flikkert (uit de code, niet in beeld bevestigd)

1. **Regiogrens**: `followRegionWeather` zette `overcast` en `mist` direct op de waarden van de regio waar de speler staat. Wie een grens oversteekt (of een gast die de staat van de gastheer krijgt) zag de lucht en de mist in een frame omslaan. Opgelost.
2. **Regen komt met een klap binnen**: bij intensiteit 0,02 sprong de dekking van 0 naar 52 % van de volle dekking. Opgelost.
3. **Wolken verschijnen een voor een**: het aantal wolken was een afgerond getal; bij een weerwisseling kwam er elke paar seconden een hele wolk uit het niets bij of weg. Opgelost.
4. **Donder per flikkering**: de donder werd gestart op elke stijgende flank van de flits, dus een inslag met drie flikkeringen gaf drie donderslagen. Opgelost: een teller per inslag (`scene.userData.lightningStrikes`), de donder volgt dezelfde gebeurtenis als de flits.
5. **Flits ver weg is even fel als dichtbij**: een inslag op 3 km flitste als een inslag op 250 m. Opgelost: de flits wordt zwakker met de afstand (tot 40 %).
6. **Sleutelstanden lineair**: de overgang tussen de negen zonshoogte-standen is lineair, dus er zit een knik in het kleurverloop op elke sleutel (vooral rond 6 en 1 graad, waar de gloed en de belichting snel veranderen). Niet veranderd: dat raakt het hele spel en was in deze ronde niet te beoordelen. Voorstel: easing (`smoothstep`) op `t` in `computeLighting`, daarna beeld voor en na.
7. **Schaduwlicht wisselt bij -3 graden** van zon naar maan (`isMoon`): de richting springt, maar de zon staat daar op 8 % van de lichtsterkte, dus nauwelijks zichtbaar. Niet veranderd.

## Wat veel kost

- **Regen**: 2500 streepjes, 30 000 floats per frame naar de GPU, op `hoog` volledig, op `laag` 45 %. Per druppel een afstandstoets tot de lens: nu zonder `Math.hypot` (kwadraten).
- **Omgevingsmap**: een PMREM-bake van de hemelkleuren, hooguit 1 keer per seconde en alleen bij meer dan 1,5 % verandering; tijdens de schemering en bij een buienfront is dat de grootste terugkerende piek. Staat al zo; `envStats.baked` en `envStats.skipped` geven het getal.
- **Wolken**: 22 wolken, tot ca. 90 instanties, doorzichtig en over elkaar; goedkoop in draw calls (een), maar overdraw bij een volledig bewolkte lucht.
- **Sterren**: 1400 additieve punten, op `laag` 35 %.
- **Frametijd voor en na**: niet gemeten. Op het moment van de run draaiden twee andere game-Electrons en was er minder dan 2 GB geheugen vrij; elke meting zou vervuild zijn.

## Wat deze ronde is gebouwd

Alle code in `game/js/weersmooth.js` (puur, geen THREE) en zes kleine bedradingen; geen nieuw shaderprogramma, licht of full-screen pass.

| Verbetering | Waar | Kosten |
|---|---|---|
| Bewolking en mist schuiven zacht mee (tijdconstante 6 s) | `weather.js` `followRegionWeather` | nul |
| Regendekking loopt in tussen 0,02 en 0,16 | `weather.js` `updateRain` | nul |
| Wolkenaantal schuift mee; de laatste wolk groeit | `cloud3d.js`, `cloudlook.js` (`fill`) | nul |
| Een donderslag per inslag, op dezelfde teller als de flits | `weather.js`, `sfx/ambience.js` | nul |
| Flits zwakker op afstand | `weather.js` `updateLightning` | nul |
| Regenafstandstoets met kwadraten | `weather.js` `updateRain` | iets sneller |

Alles werkt onder de bestaande kwaliteitsprofielen: er is geen nieuwe verplichte kost voor `laag`.

## Samen spelen

Tijd en weer zijn gezamenlijke keuzes en geen hostrecht. De host meldt de klok om de 2 s (`net/speelklok.js`, een gast volgt zacht via `KlokVolger`) en de weermachine om de 4 s (`coopweer.js`); een gast stapt zijn eigen weermachine niet. Een gast die later aansluit krijgt de staat bij de eerstvolgende melding. De nieuwe zachte overgangen draaien lokaal op elk scherm en veranderen niets aan wat er gemeld wordt. Gedekt door `scripts/weersmooth_test.mjs` (gast en gastheer lopen na 400 s op dezelfde klok en hetzelfde weer in elke regio) naast `coopweer_test.mjs` en `net_speelklok_test.mjs`. De bliksem en donder zijn per scherm: elke speler ziet zijn eigen inslag (de planner draait lokaal), dat blijft zo.

## Open

- Beelden van schemering, nacht, sterren, lantaarns en ramen, en een hemelbeeld met wolken (camera omhoog, `scripts/weer/weer_probe.js` is een start).
- Easing op de sleutelstanden (punt 6) met beeld voor en na.
- Frametijd voor en na op een rustige machine (`scripts/weer_shots.mjs` met `GDE_WEER_NOBUSY=1` onder de slot-wrapper).
