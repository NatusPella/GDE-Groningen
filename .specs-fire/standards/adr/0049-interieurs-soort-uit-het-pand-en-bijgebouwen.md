# 0049 - Interieurs: het soort volgt uit het pand zelf, kleine bijgebouwen zijn betreedbaar

- **Status:** voorgesteld (coördinatorbesluit onder de wens van de eigenaar, 22-11-2026: "Kunnen we meer gebouwen voorzien van interieurs?"; conservatieve keuzes, graag kijken in beeld)
- **Datum:** 22-11-2026
- **Spec:** `.specs-fire/standards/wereld.md`, `docs/INTERIEURS-STAND-22-11.md`
- **Verwant:** ADR 0044 (interieurs in het pand zelf), epic #1150

## Context

Na ronde 6 was 42,6% van de 370.144 panden betreedbaar. De audit (ronde 7) liet zien waarom de rest dicht bleef: 47% van de panden heeft geen OSM-type (`yes`) en daarvan was 77% te klein voor de minimale woninghal (3,4 bij 4,5 m); bij huizen met een type viel 26% af omdat de gevelbouwer de deur 1,2 m van de hoek zet en `findHall` een hal eiste die minstens 0,9 m naar beide kanten van het deurmidden reikt, met een grof raster van 0,5 m dat net onder die grens bleef hangen; schuren, stallen en kassen stonden bewust dicht.

## Besluit

1. **Het soort volgt uit het pand zelf.** Een pand zonder type wordt een kantoor (hoogte vanaf 5 m), een bedrijfshal (voetafdruk vanaf 700 m², laag) of een woning. Alleen de eigen voetafdruk en hoogte tellen. Ligging, landgebruik en nabije panden tellen niet mee: die hangen af van welke tegels al geladen zijn, en host en gast zouden dan een ander soort zien. Het soort is dus gelijk op elke client.
2. **Past de hal van het hoofdsoort niet, dan is het pand een bijgebouw** in plaats van niets: schuur (hal vanaf 2,0 bij 2,2 m), garagebox, stal, kas (varianten van `garage`; lage vaste plafonds, zonder balie, een boer alleen in de stal). Typen die een kamer hebben (`shed`, `barn`, `greenhouse` ...) zijn rechtstreeks zo'n bijgebouw.
3. **Een gevel zonder deur** (`b.entrance === null`, de gevelbouwer tekende er geen) krijgt een gemaakte deur op de langste gevel in plaats van "geen voordeur". Een gevel die nog niet getekend is (`undefined`) wacht op zijn echte deur.
4. **De deurruimte van de hal** is 0,7 m (was 0,9) en `findHall` groeit de hal in stappen van 10 cm als het raster van 0,5 m onder die grens blijft; het plafond mag 2,1 m zijn (was 2,3).
5. **Een appartementencomplex** (vanaf 220 m²) krijgt een portiek met een doorgang naar de woning op de begane grond; er is geen trap omhoog.
6. **Blijft dicht, met reden** (`NOT_ENTERABLE_WHY`): bouwplaatsen, dak, carport, ruine, silo, torens, tent, toilet, wachthuisje, caravan, woonboot, kiosk, tank, duiventil, bunker, molen, tribune, gemaal en transformatorhuisje.

## Afgewezen

- **Het type afleiden uit ligging en omgeving** (landgebruik, winkelstraat, buurpanden, adressen): afhankelijk van geladen tegels, dus per client verschillend. Een winkel op de begane grond blijft werk van de POI-koppeling, die al deterministisch is.
- **Elk bijgebouw een eigen soort** (nieuwe `KINDS`-regel): raakt rollen, geluid, drukte, balie en de matrixtest voor soorten zonder eigen rol; varianten van `garage` kosten één tak per recept.
- **De deur van een pand verplaatsen naar de straatkant** (met het wegsegment): vraagt wegdata die per tegel geladen wordt (zelfde bezwaar als boven); de gemaakte deur kiest de langste gevel.
- **Alle schuurtjes dicht laten** (de eerdere stand): dat hield 47% van de panden dicht en negeerde de wens van de eigenaar; de reden was geloofwaardigheid, en een lage schuur met planken, een fiets en een emmer is dat.

## Gevolgen

- `interiorkinds.js`: `SUB_HALL`, `fallbackKinds`, `untypedKind`, `bijgebouwSub`, `NOT_ENTERABLE_WHY`; `interiorrules.js`: `planKind` met terugval en `DOOR_CLEAR`; `interiorframe.js`: de fijne groei in `findHall`, `synthEntrance(b, gable, minLen)`.
- Het budget (12.000 driehoeken per pand, lui bouwen 24 m, weggooien 34 m, hooguit twee tegelijk) verandert niet; de bijgebouwen zijn ruim kleiner (zwaarste 2.700 driehoeken). `scripts/interieur_r7_test.mjs` dekt determinisme, loopbaarheid en het budget op 500 panden per nieuw recept.
- Wat de aantallen niet zeggen: een schuurtje van 5 m² is een kamer die je in kunt, geen woning. De audit meldt bijgebouwen apart (fase 5).
