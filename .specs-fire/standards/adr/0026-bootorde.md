# 0026 - Bootorde: de expliciete lijst eerst, de zoektocht als terugval

- **Status:** besloten
- **Datum:** 2026-11-07
- **Spec:** `.specs-fire/standards/multiplayer.md` ("De ingang", "Het bootpad")
- **Gebied:** Samen spelen, de ingang en het startpad
- **Gerelateerd:** #639 (dit besluit), ADR 0022 (altijd een sessie), ADR 0024 (eenspeler is een sessie van één), #528 (bootpad), #554 (sessie van één), #556 (besloten hosten)

## Context

ADR 0022 zegt: "Ja → het spel zoekt een sessie en sluit aan; is er geen, dan host het
zelf." ADR 0024 maakt elke start daarna een gastheer-sessie van één, en de code start
die sessie voordat de automatische zoektocht iets kan doen. Daardoor leek "Ja" in de
praktijk een sessie van één op te leveren, en spraken de twee besluiten elkaar tegen.
De code heeft sinds #554/#556 één werkelijke orde: de speler die "Ja" kiest krijgt eerst
de expliciete lijst in de lobby; de automatische zoektocht in `sessionboot.js` is de
terugval als hij dat scherm sluit; de sessie van één begint pas als de zoektocht klaar is
(`sessionBootDone`). Zo is er één eigenaar van de sessie en ontstaat er nooit een tweede
hub of een stille join.

## Besluit

**Eén bootorde, zoals de code hem al heeft.**

1. **Toestemming eerst.** Zonder `onlineMeedoen === true` opent niets een verbinding en
   start de sessie van één (ADR 0022, constitutie 4 en 10).
2. **"Ja" opent de expliciete lijst.** `main.js` opent het Samen-scherm met de openbare
   lijst; de speler kiest daar zelf. Er is geen stille automatische join.
3. **De zoektocht is de terugval.** Sluit de speler dat scherm zonder sessie, dan pas
   doet `sessionboot.js` zijn automatische ronde (lijst, `sessiekeuze.kies()`, anders
   zelf besloten hosten). Na een geslaagde of opgegeven zoektocht is de beurt voorbij.
4. **De sessie van één komt daarna.** `coopsolo.js` start pas als
   `sessionBootDone(world)` waar is, en `canBootSession` weigert zolang er een sessie of
   overdracht loopt. Wie Samen spelen opent, stopt de sessie van één eerst.
5. **Nooit twee hubs, nooit stil naar buiten.** Elke stap gaat door de bestaande
   `startHost`/`startClient`; een bestaande sessie wint altijd.

## Afgewezen

- **De letterlijke lezing van ADR 0022 (zoektocht vóór de sessie van één).** Dan moet de
  sessie van één wijken voor een zoektocht die mogelijk niets vindt, en heeft de wereld
  tijdens het zoeken geen eigenaar. Dat is precies de dubbele toestand die #554 weghaalde.
- **Stil automatisch joinen bij "Ja".** De speler ziet dan niet bij wie hij terechtkomt;
  de lijst is de expliciete keuze en de zoektocht is alleen een terugval.
- **De sessie van één helemaal niet starten tot iemand meedoet.** Dat is het oude
  tweepadenmodel (ADR 0024, afgewezen).

## Gevolgen

- ADR 0022 en 0024 worden op dit punt gelijkgetrokken: 0022 beschrijft de toestemming en
  de besloten terugval, 0024 de sessie van één; 0026 beschrijft de volgorde daartussen.
- `multiplayer.md` ("De ingang", "Het bootpad") en `sessionboot.js` (comment bij
  `canBootSession`) noemen dezelfde orde.
- `scripts/sessionboot_test.mjs` dekt de "Nee"-route, de "Ja"-route en een bestaande
  sessie van één: geen tweede hub en geen stille join.
