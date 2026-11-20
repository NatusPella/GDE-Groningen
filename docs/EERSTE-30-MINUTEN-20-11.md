# De eerste 30 minuten van een nieuw spel, 20-11

Doel: beoordelen als een nieuwe speler zonder voorkennis (progressive disclosure: één idee per regel, weten wat je moet doen, waar naartoe, hoe te bewegen en te interacteren, kaart, telefoon, overslaan). Issues: #986 (opening eerst), #987 (onthulling), #985. Bron: de proefspeler (`scripts/bot/run.mjs --mode=story --mens --watch`, een echt nieuw spel zonder startplek-teleport, tot M04) en de code van de onboarding, hintkit, controlhint en cinematics. Context: [PROEFSPELER.md](PROEFSPELER.md), [verhaal/OPENING-ONTHULLING.md](verhaal/OPENING-ONTHULLING.md), [ONBOARDING.md](ONBOARDING.md).

## Eerlijk over wat gezien is

**Gezien in beeld: niets in deze ronde.** De machine had te weinig vrij geheugen: de gedeelde slot-wrapper (max 2 Electron-runs, minimaal 3,5 GB vrij) liet mijn run ruim een uur niet toe en de eerste start faalde op een niet-schrijfbare profielmap in `%TEMP%` (gerepareerd in `scripts/bot/run.mjs`: het wegwerpprofiel komt nu naast de uitvoer, zoals de andere harnassen). De beoordeling hieronder is dus **code- en datalezen** plus de eerdere beeldcheck van #986 (opening speelt als eerste, zie het issue). Alles wat een beeld, een gehoord geluid of een tempo vraagt, staat als "nog niet bekeken". Als de run nog volgt, komen de bevindingen als comment op #986 en #987.

## Wat goed is

- **De opening speelt eerst en is altijd te overslaan.** De stap `opening` begint bij een nieuw spel zodra de wereld rustig is; de vlucht-in van de spelstart blokkeert hem niet meer (`openingstart.js`, `openingstart_test` 54 checks). Overslaan is Spatie of A ingedrukt houden, met een ring en de regel "Houd SPATIE ingedrukt om over te slaan" (`cinematics.js`); het is nooit een enkele druk, dus geen per ongeluk overslaan. De opening duurt 147,7 s (`openingtempo_test`).
- **Eén uitleg tegelijk.** De onboarding-kaarten (doel, geld, kaart, Te doen, eerste dag, Samen spelen) starten pas als alle vertelling 4 s stil is, 12 s na het einde van een film, met 30 s tussenruimte. Voertuig- en minigamekaarten komen pas na twee minuten spel en hooguit elke 40 tot 90 s.
- **Doelen, geen toetsen** in de kaarten; de toetsen staan in één compacte regel in de doellijn en volgen de verlegde toets of de controllerknop.
- **Samen spelen:** de opening is van de wereld (een gast speelt haar niet opnieuw en kan zijn eigen weergave overslaan); de Samen-kaarten voor host en gast komen pas na 8 s in de sessie, één per keer, en pas als er een film klaar is (`isCinematicActive()` houdt ze tegen). De pure logica is gedekt door `hintkit_test` (133 checks).
- De herschreven openings- en M01-regels (#987) staan in de meting op 0 overtredingen van de norm; de TTS is voor die regels compleet (`voice_coverage` 2677/2677), met 10 nieuwe Tessa-regels die op de TTS-ronde (#735) wachten.

## Wat verwarrend kan zijn (nog niet in beeld bevestigd)

| # | Bevinding | Bron | Impact | Kosten |
| --- | --- | --- | --- | --- |
| 1 | **Geen enkele lopen-toets te zien bij de eerste wandeling.** De bedieningsregel (WASD lopen, Shift rennen, E gebruiken) bestond alleen bij een actieve missie, bijbaan of achtervolging; het eerste verhaaldoel (naar Berend) is geen missie. De onboarding-kaarten leren bewust geen toetsen. Een speler zonder voorkennis wist dus niet hoe hij zich bewoog. | `controlhint.js` `hintActive`, `hud_panel.js` | hoog | S, **gebouwd** |
| 2 | De eerste kaart ("Je eerste klus") zet de uit-schakelaar ("Uitleg uit: Esc, Instellingen") in dezelfde kaart als het doel: twee ideeën op één kaart, terwijl het doel het enige is dat telt. Beter: de uit-regel pas op de tweede kaart. | `onboarding.js` `SKIP_NOTE` | laag | S |
| 3 | Een gast draait de onboarding niet (`main.js`): hij krijgt de Samen-kaart over Tab, maar niet "Je doel staat onderin. Volg de gele route". Zeker bij een gast die de opening van de host heeft overgeslagen is er dan geen uitleg over het doel. Controleren in een run met twee spelers. | `contexthints.js`, `main.js` | middel | M |
| 4 | De eerste telefoon- en kaartuitleg ("Zelf kiezen": kaart met M) komt pas nadat de doelkaart er al was; wie de kaart zelf opent krijgt hem niet te zien als dat de eerste keer was (`known: hintUses('map')`). Dat is goed bedoeld, maar de telefoon (Esc, Verhaal) wordt pas na de eerste missie genoemd. Is dat te laat voor een speler die Tammo's bericht wil terugvinden? | `onboarding.js` | laag | S |
| 5 | De trailermontage (C00.1) heeft geen stem en weinig tekst; de haak staat in de slotkaart. In de eerdere beeldcheck van #986 haperde de montage op cuts naar verre plekken (tegels laden, 0,7 tot 1,1 s stilstaand beeld). Voor een nieuwe speler leest dat als "het spel hangt". | `docs/PERF-TREND-0.54-NAAR-NU.md`, issue #986 | middel | L (voorwarmen is bewust afgewezen) |
| 6 | De M03.2-scène (mevrouw Hoving, 1998, 1982, "sinds woensdag") blijft de dichtste van de eerste 30 minuten; het is canon die later nodig is. | `OPENING-ONTHULLING.md` | laag | M |
| 7 | De Tammo-close-up in de keuken staat erg dicht op het gezicht (eerdere beeldcheck van #986). | issue #986 | laag | S |
| 8 | Geesje (18 regels) en Rotor Roelf (2 regels) hebben nog geen stem (wachten op een Groningse spreektekst); ze komen na M03. | #924 | middel | eigenaar |

## Aanbevolen, op impact en kosten

1. **Gebouwd:** de lopen-regel bij het eerste verhaaldoel (#1). Alleen zolang `missionsDone` 0 is, het verhaaldoel er is en er geen missie loopt; daarna terug naar het gedrag van #824. "Toetshints uit" verbergt hem ook.
2. Uit-regel verplaatsen naar de tweede kaart (#2): alleen een teksten- en volgordewijziging in `onboarding.js`, geen TTS.
3. Een run met twee spelers (host en gast, nieuw spel) om #3 en de volgorde van de Samen-kaarten tegen de film te zien: nog niet gedaan.
4. De volgende beeldrun: opening tot en met M03 met `--watch`, daarna de beelden per oogmoment lezen (kaartpijl, doelmarkering, eerste voertuig). Zie hieronder hoe.

## Hoe de run te herhalen

```
cd desktop && GDE_PREBUILT_WORLD=<andere-build>/game/world GDE_STAGE_OUT=desktop/build/s1/game GDE_TERRAIN_CACHE=0 node build.mjs
node <slot.mjs> run eerste30 -- bash <script dat run.mjs aanroept>
  node scripts/bot/run.mjs --mode=story --mens --seed=1 --watch=400 --shots=300 --zonder-startplek --until=M04 --slot --out=<map>
```

De uitvoer (`events.jsonl`, `index.md` en de beelden met oogmomenten `<stap>-oogNN-<reden>`) leest een mens of een AI-reviewer met beeld, zoals in [PROEFSPELER.md](PROEFSPELER.md) beschreven.

## Niet bekeken

Opening in beeld deze ronde, huis en keuken, de eerste missie, telefoon en kaart in het echt, het eerste voertuig, de synchronisatie van stem en ondertitel (alleen `voice_coverage` en de koppelingen in de data zijn gecontroleerd), een tweespelersrun, controller. Geen audio gegenereerd, geen speltekst gewijzigd.
