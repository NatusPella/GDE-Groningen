# 0044 - Interieurs in het pand zelf, lui gebouwd

- **Status:** besloten (eigenaarseis, 21-11-2026; uitwerking epic #1150)
- **Datum:** 21-11-2026
- **Spec:** `.specs-fire/standards/wereld.md`, `docs/INTERIEURS-21-11.md`
- **Verwant:** `docs/BINNENSETS-21-11.md` (binnenmissies), `docs/BEPPE-HUIS-21-11.md`, ADR 0023

## Context

De eigenaar wil "meer panden een echt enterable interieur, zoals in Watch Dogs 2": te voet door de voordeur naar binnen, in het pand zelf. Er waren al drie losse oplossingen: handgemaakte interieurs voor vijf landmarks (museum, Forum, kerken; `interieur3d.js`), een kamer op het erf van Beppe en de binnensets van missies, en menu's bij winkels. Er zijn 370.144 panden.

## Besluit

Het interieur ligt **in het pand zelf**, in de wereld, binnen de echte voetafdruk en achter de echte voordeur van de gevel. Er is geen teleport naar een apart gebied, ook niet als terugval: past een pand niet, dan is het niet betreedbaar. De deur komt uit de gevelbouwer (`b.entrance`), de hal is de grootste rechthoek binnen de voetafdruk achter die deur, het interieur wordt gebouwd bij naderen (20 m) en weggegooid bij vertrek (32 m), hooguit twee tegelijk, en komt uit een generator die alleen van pandzaad en soort afhangt (deterministisch, lokaal per speler).

## Afgewezen

- **B, teleport naar een apart interieurgebied met een snelle fade:** goedkoper, maar de eigenaar wil lopen door de deur in de gevel; het bracht ook een tweede wereldlaag, een positiesprong voor medespelers en een kamer die niet bij de buitenkant past. Afgevallen als norm en als terugval.
- **Hybride (A voor klein, B voor groot):** valt af met B. Grote panden die niet passen zijn niet betreedbaar.
- **Handgemaakte plattegronden per pand:** niet haalbaar bij tienduizenden panden; alleen de bestaande landmarks houden hun handwerk (`b.rooms`, `b.interior`).
- **Stencil- of portaalrendering van een apart interieur:** vraagt een tweede render-pad en lost de botsing en de camera niet op. De bestaande `portalcut3d` (de gevel openknippen) is genoeg.
- **Alle interieurs vooraf bouwen:** geheugen en laadtijd; vrijgeven bij vertrek is nodig (leakwatch).
- **De ramen vervangen door echte interieurs:** de nepkamer achter het raam blijft (goedkoop op afstand); het echte interieur gebruikt dezelfde kleur- en winkelkit-bron, zodat ze overeenkomen.

## Gevolgen

- `models3d_buildings.js` legt per pand `b.entrance` vast (gevelrand, plek en maat van de deur, de kamer van het raam ernaast, de ruiten van de gevel).
- `collision.js` vraagt een pand met een live interieur eerst `b.walk.resolve`; zo wordt de open deur doorloopbaar.
- De raam-shader kiest zijn paletten met een integer-hash (`igHash24`), gelijk aan `interiorlook.js`; een test houdt de twee in de pas.
- Nieuwe panden of soorten komen erbij als data (`interiorkinds.js`) en een recept (`interiorlayout.js`), met een tekenaar per itemtype (`interiorbuild3d.js`); de tests dwingen af dat die gelijk zijn.
