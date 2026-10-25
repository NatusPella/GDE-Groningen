# Intent: GDE Light Sims

## Doel

Naast het verhaal een set lichte beroepsloopbanen bouwen: de herkenbare lus van GTA IV, Watch Dogs 2, ETS2, Train Simulator, Flight Simulator, Farming Simulator en Fishing Simulator, met rijke features maar een kleine catalogus. Alles werkt in Samen spelen, met eigen voortgang per speler en een samenwerkingsbonus (1+1=3).

Epic: #492. De scope en de afgewezen alternatieven staan in de ADR `0015-een-ingang-geen-hoofdmenu.md`.

## Waarom

De game heeft nu veel losse minigames, maar mist per genre de kernlus: Watch Dogs' multiplayer-logica, ETS2's vrachtmarkt en bezit, Farming Sims markt en vee, Train Sims passagiers, Flight Sims routes en Fishing Sims uitrusting. De eigenaar wil geen simulatorpariteit, maar een lichte, rijke versie die lang speelbaar blijft. Geld is nu te strak: flitsboetes en een laag startbudget zorgen dat spelers vaak blut zijn.

## Succescriteria

- Elke laag is op zichzelf speelbaar en heeft een duidelijke lus met geld, keuzes en groei.
- Elke laag werkt in Samen spelen: gastpad, eigen beloning per speler, test.
- De eerste twee speeluren lopen niet stuk op geld; daarna groeit het inkomen en blijven er dure doelen.
- Geen feature freeze zonder expliciete opdracht van de eigenaar; 1.0 blijft een eigenaarsbeslissing.
- Always summer en geen echte merken blijven overeind.

## Aannames

- "Licht maar rijk" betekent: kleine catalogus, echte lus, geen volledige simulator.
- Vee is fase 2 van de boerderij; markt, contracten en teeltplan komen eerst.
- 1+1=3 is een bonus bovenop de volledige beloning per speler, geen geldvermenigvuldiger zonder ADR.
- De bestaande save blijft werken; nieuwe profielen staan in eigen `gde-*`-sleutels.

## Buiten scope

Volledige simulatorpariteit, hacken/ctOS, loopbare winkels/kroegen/banken, seizoenen, echte merken, en elke feature freeze zonder opdracht van de eigenaar.

## Werkitems

- `wi-493-geld` — #493 Geldcurve fase 1: mildere start, flitswaarschuwing en hoger startbudget.
- `wi-492-boot` — #492 Bootflow: geen hoofdmenu, laatste save, minimaal laadscherm.
- `wi-492-bench` — #492 Eerste-start-prestatietest en automatische grafische preset.
- `wi-492-saves` — #492 Pauzemenu: savebeheer, nieuw spel en stoppen.
- `wi-492-over` — #492 Pauzemenu: Over met nieuws, credits en versie.
- `wi-492-hint` — #492 Eenmalige hint over Samen spelen.
- `wi-492-samen` — #492 Samen spelen: contract voor naadloos in/uit, start vanaf de kaart en 1+1=3.
