# Verfijnronde 22-11: het verhaal en de missies (akte 1 tot en met 5, Deel 4)

> Naslag. De regels staan in `.specs-fire/standards/verhaal.md` en `.specs-fire/standards/mechanica.md`; hier staat wat deze ronde vond en deed.
> Geen nieuwe functies: verfijnen wat er al is. Tests: `scripts/verfijn_verhaal_test.mjs` (pure regels, fuzz, data-audits) en
> `scripts/verfijn_verhaal_save_test.mjs` (400 kapotte saves). Alles in node, geen Electron; wat in beeld moet staat onderaan.

## Wat de ronde deed

| # | Wrijving | Oplossing | Bewijs |
|---|---|---|---|
| 1 | Een ondertitel zonder opname kreeg hoogstens 8 s: 7 regels van 115 tot 135 tekens liepen sneller dan 25 tekens per seconde | Plafond 12 s (`storytext.js` `readingTime`) | test 1 en data-audit op `script.json` |
| 2 | De instelling Leestijd (Ruim) gold alleen voor HUD-kaarten, niet voor de ondertitels van scènes en autopraat | `readingTime(tekst, stand)`: Ruim of Geen timer geeft 1,5 keer zo lang; bedraad in `missionstory.js`, `missions.js`, `storytalk.js` | test 1 |
| 3 | Dezelfde mislukscène (en dezelfde grap) bij elke nieuwe poging | Scène alleen de eerste keer per missie en sessie, daarna de uitslagkaart (`failSceneMode`) | test 2 |
| 4 | Mislukken in de laatste stap na een achtervolging of timingproef begon weer bij de start van de missie | `chase`, `boatchase` en `timing` zijn hervatpunten (`CHECKPOINT_KINDS`); inbraken blijven alleen op verzoek | test 3, `missioncheckpoint_test` |
| 5 | Een doel liggen laten gaf één appje na 5 minuten en daarna stilte | Drie herinneringen (5, 15, 30 minuten), steeds een ander toontje, nooit in een filmpje of missie (`storyremind.js`) | test 7 (simulatie van twee uur) |
| 6 | De doelbalk las "Bezig: Naar de serverkamer" en "Bezig: Houd de tweede deur tegen" (werkwoord ontbrak in de lijst) | ruim 60 werkwoorden erbij in `goaltext.js` | test 9 scant alle stagelabels in de missiebestanden |
| 7 | Een mislukmelding stond altijd 3,5 s, ook met een lange reden | `failMessageSeconds`: 3,5 tot 8 s naar lengte | test 10 |
| 8 | Een terugkeerkaart met een lange titel of eerste zin liep uit het woordbudget | Harde grens: eerst "Laatst gedaan" weg, dan het doel op woorden afgekapt | test 5 (fuzz) |
| 9 | Stuck state: een achtervolgingsdoel met een NaN-afstand liet de wachttijd NaN worden en de achtervolging liep nooit af | `chaseWaitMax` eindig | test 8 |
| 10 | Een NaN-frame maakte de vastzit-teller NaN, dus de hint kwam nooit | `stapVast` negeert een rotte `dt` | test 8 |
| 11 | `dijkEtappe` gaf bij een oneindige lengte of afstand `null` etappes | Eindige invoer afgedwongen | test 8 |
| 12 | `skipReward` gaf bij een oneindige beloning een oneindige uitbetaling | Eindig of 0 | test 8 |
| 13 | Een beschadigde save kon een negatief of absurd aantal mislukkingen zetten (en zo het hulpaanbod of overslaan ontregelen) | Begrensd op 0 tot 99 in `applyStorySave` | `verfijn_verhaal_save_test` |

QA zonder code-wijziging (regressienet): fuzz over de volledige verhaalketen (nooit een voltooide stap terug, nooit vast, ook met vooruit gespeelde missies, test 4);
fuzz van opslag en grace van hervatpunten (test 6); 400 kapotte saves, ook idempotent opslaan en laden; het verhaalgeld blijft positief voor
wie elke missie overslaat (uitbetaling 0 tot 100 procent, test 11); elke Friese regel heeft een Nederlandse ondertitel (audit, geen afwijkingen).

## Samen spelen

Alle wijzigingen zijn lokaal bij de speler van dit apparaat en raken geen netwerkbericht. De herinnering (5) gaat naar wie het spel opende (de
verhaalstap is van de wereld); een gast heeft geen eigen verhaalstap en krijgt hem niet. Leestijd (2) is een eigen apparaatinstelling: een gast
die een scène naspeelt, leest met zijn eigen stand. De mislukscène (3) en het hervatpunt (4) horen bij de eigen missie van de speler; voortgang en
beloning blijven per speler (#429). Dekking: de pure tests hierboven; de gastkaart in `COOP-GAST.md` is niet veranderd.

## Bewust niet (te groot of een nieuwe functie)

- Een eigen ondertitelgrootte of contraststand voor scènes: een nieuwe instelling, hoort bij het DS3-werk.
- "Eerder gespeelde scène overslaan met één toets" (nu 0,9 s Spatie vasthouden): een bewuste keuze tegen per ongeluk overslaan.
- De 18 keer "Ik zeg niks" en "Dat is een ..." in de teksten: het lijkt een terugkerende grap (niet per personage nagelopen), en regels zijn ingesproken
  of canon; herschrijven kost opnames. Wel als bewuste herhaling vastgelegd; een tekstronde kan er gericht varianten bij maken.
- Schaalbare tijdslimieten per missie (staan al in Moeilijkheid en Verhaalmodus, #800 en #1169): niet aangeraakt.
- Meer hervatpunten na verzamelstappen (`kist`, `ton`, `baal`, `vaandel`): hun eigen toestand is niet getest terug te zetten zonder Electron.

## Alleen in beeld of met een echte speler te bekijken (nog niet bekeken)

- Voelt 12 s voor de langste regels goed, en is Ruim niet te traag in scènes met een vaste muziekstand of cameraloop?
- Het oversla-gedrag van de mislukscène: valt het op dat de tweede poging geen scène heeft, of voelt het als tempo?
- Of een hervatpunt na een achtervolging het voertuig en de tijd goed terugzet (de bot en de verhaaltest draaien dit pas bij de release).
- De drie herinneringen: toon en timing in een echte speelsessie (te vaak, te weinig), en dat de stem bij de eerste ongewijzigd klopt.
- De doelbalk met de nieuwe werkwoordenlijst op elk vervoersmodus (voet, auto, boot).
