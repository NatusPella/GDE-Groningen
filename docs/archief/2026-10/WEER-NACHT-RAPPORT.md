> **Archief (oktober 2026).** Dit document is vervangen door `.specs-fire/standards/mechanica.md`.
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.

# Weer, dag en nacht in beeld (#19, #194, #195)

Controle van 19 oktober 2026 met `scripts/qa/weer_nacht.mjs` (headless Electron, wegwerpprofiel, één instantie onder een slot) en `scripts/qa/weer_nacht_analyse.mjs`. Altijd zomer: er zijn geen sneeuw- of ijsweertypen.

## Wat is bekeken

- **Zeven plekken:** Grote Markt, station, A7, kust (Lauwersoog), weilanden, dorp (Winsum), op het water (Reitdiep). De coördinaten komen uit `index-provincie.json`.
- **Zeven tijdstippen** (zonshoogte in het spel): zonsopgang 5,8°, ochtend 34°, middag 50°, avond −0,8°, schemering −16°, nacht −21,5° en diepe nacht −14,6°.
- **Zes weertypen** uit `weatherstate.js`: helder, bewolkt, motregen, regenbui, onweer en mist. "Regen" bestaat in het spel als motregen en regenbui.
- **Matrix:** helder op alle tijdstippen, elk ander weer op middag, avond en nacht. Dat zijn 22 combinaties per plek en per combinatie twee opnamen: de straat zoals de speler hem ziet (met HUD) en de lucht (camera 25° omhoog). Daarnaast frametijden op zeven instellingen per plek.
- **Automatische controles** (`scripts/qa/weernachtlogic.mjs`, getest met `scripts/weernacht_test.mjs`): zwart of overbelicht, banding in de lucht, flikker, hoogfrequente ruis in de onderste helft (z-fighting van natte wegen en plassen, vergeleken met dezelfde plek droog), warme lichten (ramen, lantaarns, koplampen) op het juiste tijdstip, sterrenhelderheid, kleurverloop. Daarbovenop een kritische blik als speler op de contactbladen (`contact-<plek>.png` en `-lucht.png`).
- **Onder de loep:** de plekken in de run zijn de stad, de A7, de kust, de weilanden en het dorp. Het station staat waarschijnlijk onder een dak (de lucht is er ook overdag donker) en het water was alleen via een zwemmende speler te nemen. Voor die twee zijn de luchtmetingen niet bruikbaar.

Runmappen (buiten de repo): `…/Temp/claude/wn-run2` (vijf plekken), `wn-run3` (dorp en water), `wn-fix` (controle van de reparatie), `wn-perf` (frametijden).

## Wat er goed uitziet

- **Kleurverloop van de lucht:** zonsopgang en avond hebben een warm verloop van oranje en roze naar blauw, de schemering wordt geleidelijk donkerder, de nacht heeft sterren en de maan (een sikkel op de diepe nacht). Geen banding of zwarte beelden in de heldere series (automatisch en op de contactbladen).
- **Stad bij nacht:** warme lantaarnkegels, verlichte ramen en het natte klinkerdek met regenstrepen zien er goed uit; de HUD-waarschuwing is leesbaar. In het dorp 's nachts zijn de koplampkegels van auto's mooi zichtbaar.
- **Natte wegen:** geen aanwijzing voor z-fighting. De ruismaat (hoogfrequent) in regenopnamen bleef onder de drempel van 1,8 keer droog.
- **Zes weertypen** zijn onderling goed te onderscheiden, met uitzondering van bewolkt (zie hieronder).

## Gevonden en opgelost

1. **Sterren en maan verdwenen niet achter wolken of mist** (`scene3d.js`, `applyTimeOfDay`): de sterrenhemel en de maan reageerden alleen op de regenintensiteit. Onder "bewolkt", "motregen" en "mist" 's nachts stond dus een helder bezaaide hemel. Meting vóór de reparatie (sterrenhelderheid, nacht, a7): helder 822, bewolkt 656, regenbui 762, weilanden mist 460 tegen 504. Na de reparatie (`wn-fix`): a7 helder 560, bewolkt 181; kust helder 511, mist 162; regenbui geen sterren meer. Oplossing: `cover = max(regen, bewolking × 1,5, mist)` stuurt sterren en maan. Op de A7 blijven de sterren bij mist deels zichtbaar (788 tegen 560 flux, de helderste sterren blijven door de mist heen); dat is niet nader bekeken.

## Waarnemingen als speler (niet aangepast)

- **Bewolkt is zwak:** de overcast van 0,4 laat de zonneschijf zichtbaar en geeft alleen een lichte vergrijzing; er zijn geen wolkenvormen. Overdag onderscheidt "bewolkt" zich nauwelijks van "helder". Voorstel: wolken tekenen (sprite- of dome-laag) of de zon sterker dempen; dat is een ontwerpkeuze en geen reparatie.
- **Avond en nacht op het platteland zijn donker:** de gemiddelde helderheid van de grond is 17 tot 27 op 255 (nacht 19 tot 21). Alles blijft leesbaar (hek, speler, de verre dorpslichten), maar het is donker. De avondwaarde (zon op −0,8°) is niet donkerder dan de schemering: er is geen "dal" in de curve.
- **Regenstrepen** zijn dik en wit, vooral bij onweer nabij de camera en 's nachts op een zwarte grond. Het leest als regen maar is hard; kijk of de breedte of de helderheid per kwaliteitsprofiel omlaag mag.
- **De HUD blijft in de luchtopnamen staan:** de camera-pose verbergt de kaart en de meldingskaarten niet. Voor spelers is dat normaal.
- **Zonsopgang op 5,8°** is in het spel al volle zon; een echte zonsopgang (0° tot 3°) zit rond 4,8 uur. Als je de zonsopgang wilt tonen, kies dat uur.

## Frametijden met effecten

De metingen zijn onbetrouwbaar: de machine draaide tegelijk met andere Electron-instanties en de test draait zonder echte GPU-isolatie. Medianen over de zeven plekken, vier seconden per instelling, 1280x720:

| Instelling | fps (mediaan) | p50 (ms) | p95 (ms) |
|---|---|---|---|
| middag helder | 16,1 | 55 | 107 |
| middag regenbui | 13,1 | 49 | 318 |
| middag onweer | 17,2 | 44 | 88 |
| middag mist | 11,4 | 59 | 145 |
| avond helder | 14,0 | 60 | 114 |
| nacht helder | 14,3 | 62 | 110 |
| nacht regenbui | 15,9 | 55 | 89 |

Een systematische straf voor regen is niet te zien (de p50 is bij regen zelfs iets lager). De p95 springt per plek tot meer dan een seconde (kust en water in de regenbui, het water in de mist): dat zijn waarschijnlijk shadercompilaties of tegelcompilaties bij de eerste frames, maar zonder opwarmronde en zonder een rustige machine is dat niet te bewijzen. Meet dit opnieuw op een vrije machine.

## Niet gedaan of niet vertrouwd

- Geen echte bliksemopnamen (flits zit onder de drempel van de screenshot-timing) en dus ook geen controle van de donder.
- Het station en het water zijn alleen voor de straatopnamen bruikbaar.
- **Flikker:** de automatische vlag in `wn-run2` komt van opnamen die achterliepen op de pagina (opname "c" kwam na het verspringen van de camera). De opnamevolgorde is aangepast; een nieuwe meting is niet gedraaid. Op `nacht-helder` zijn drie opeenvolgende opnamen gelijk (helderheid 21, 21, 21): daar geen flikker.
- Frametijden niet op een vrije machine; geen vergelijking per kwaliteitsprofiel.
- Alle beoordelingen komen uit screenshots en contactbladen die één agent heeft bekeken; de eigenaar heeft ze nog niet gezien.
