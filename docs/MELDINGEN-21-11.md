# Meldingen: inventaris, duur en aflopend balkje (21-11)

Naslag bij [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) ("Meldingen: duur en aflopend balkje") en [.specs-fire/standards/ui-taal.md](../.specs-fire/standards/ui-taal.md). De spec is het *hoe*; dit bestand is de inventaris van wat er bestaat. Wijkt dit af van de code, dan is dit bestand de fout. Zie ook [KANALEN.md](KANALEN.md) (welke planner wat beslist).

Wens van de eigenaar (21-11): sommige HUD-onderdelen hebben een balkje dat leegloopt, zodat je weet wanneer een melding weer weggaat. Bijna alle meldingen mogen dat hebben, en ongeveer even lang in beeld blijven: dan kun je het goed lezen en weet je wanneer het weggaat.

## De regel in een alinea

Alle tijdelijke meldingen gebruiken één bouwsteen: `game/js/noticetiming.js` (puur: duur, timer, wachtrij, register), `game/js/melding.js` (DOM: `noticeBar`, `runNoticeTimer`, `adjustRemaining`) en `game/js/ds-melding.css` (het balkje, `.ds-melding__tijd`, alleen `transform: scaleX`). De duur is een van vier klassen: **kort 4 s, normaal 6 s, lang 9 s, max 10 s**, gekozen uit de tekstlengte (2 s + tekens / 15, minimaal 4, maximaal 10). De timer staat stil bij pauze, menu, film en hover. Een kritieke melding heeft geen balkje en sluit met een knop of toets.

## Inventaris: wat er was (vóór 21-11) en wat het nu is

Duur "oud" is gelezen uit de broncode van de dag; niets hiervan is in beeld bekeken (geen Electron in deze ronde).

| Type | Module | Oude duur | Balkje oud | Duur nu | Balkje nu | Zone | Wachtrij | Pauze (nu) | Prioriteit |
|---|---|---|---|---|---|---|---|---|---|
| HUD-kaart (`addMessage`, `showCard`; ook uitleg- en hintkaarten van `contexthints.js`, de banter-hintkaart van `ovhintlive.js`, `busmelding.js`, politie- en missiekaarten) | `hudcards.js` | 4 tot 10 s (`cardSeconds`, 1,25 x readingTime; "ruim" 1,7 x; "geen" laat belangrijke kaarten blijven) | ja, 4 px inkt, loopt lineair | 4, 6, 9 of 10 s (`cardDuration`) | ja, bordgroen; rood bij gevaar en politie; geen bij een blijvende kaart | A (links onder de gezondheid); prestatiesoort in E | één tegelijk (`MAX_VISIBLE`), 5 in de rij; een rij met twee of meer wachtenden kort de lopende kaart in (balkje loopt mee, `adjustRemaining`) | HUD verborgen, `paused`, `uiPaused`, verhaalgesprek of ondertitel (`hc-held`): de klok en het balkje staan stil; hover niet (de kaart is bewust doorklikbaar naar de wereld) | `CARD_PRIORITY` in `attention.js`: verhaal, gevaar, beloning, tips; gevaar en politie dringen een zwakkere kaart weg |
| Prestatietoast | `achievements.js` | max(4,2 s; 1,2 s + 0,06 s per teken); een korte variant 60 % | nee (de balk "x/y prestaties" in de kaart is voortgang, geen tijd) | 4, 6, 9 of 10 s | ja, bordgroen op de papieren DS3-kaart (#1175: inktrand, harde schaduw, icoon in een vak); houdt zijn moment (`ds-moment-stempel`) | E | `toastQueue`: volle kaart, dan korte, daarna één samenvatting (`achievementunlock.js`); wacht op zone E | wacht bij start tijdens film, menu en overlay; een lopende kaart stond niet stil in pauze (`setTimeout`), nu wel; hover houdt vast | P3 (`narrative` award); een groot moment gaat voor |
| Telefoonmelding (Kiekdoar, bericht, geld) | `phonefeed.js` | 6 tot 13 s | ja, 7 s standaard in de inkt van de app | 6, 9 of 10 s | ja, bordgroen | A (bovenaan), een gesprek gaat voor | `notes`, hooguit 6, verhaal vooraan; "+N" naast de kaart | `!paused`, `held` en HUD zichtbaar (`pf-pauze`); de stem rekt de tijd (`adjustRemaining`) | P1 verhaal, P2 rest |
| Naamkaart (eerste ontmoeting) | `namecard.js` | 3,4 s | nee | 4 s (kort) | ja, bordgroen; loopt ook tijdens de film waar hij bij hoort | links boven het midden | wacht hooguit 12 s onder een resultaatkaart | pauze en menu; film niet | `overlayhold` |
| Menumelding (tijdens pauzemenu) | `menumelding.js` | 3,5 s | nee | 4 s (kort) | ja, bordgroen, elk element houdt zijn balkje tussen hertekeningen | onderin het menu | hooguit 3, dezelfde tekst ververst | het menu staat open; de tijd loopt gewoon | geen |
| Foutkaart "Er ging iets mis" | `fouttoast.js` | blijft | nee | blijft | nee: kritiek | rechtsboven | een per sessie | sluit met Sluiten | n.v.t. |
| Eindkaart en groot moment | `bigmoment.js`, `endcardimpact.js` | 1,8 tot 4,2 s (`ms` per soort) | nee | ongewijzigd | nee: eigen regie en overslaan | schermvullend of rand | `overlayhold` | eigen | P0 |
| Banner en resultaat; wijkkaart ("NIEUWE BUURT"), landmark | `cinematics.js` | banner 3,8 s (mislukt 2,8 s); wijkkaart eigen duur | nee | ongewijzigd | nee: filmisch moment met eigen regie | midden en links | `attention.js` (moment) | de film zelf | n.v.t. |
| Ondertitels | `subtitles.js`, `storytalk.js` | de lengte van de gesproken regel | nee | ongewijzigd | nee: eigen readingTime | onderin | een regel tegelijk | met de stem | P1 |
| Opgeslagen-vinkje | `savegame.js` | 2,2 s | nee | ongewijzigd | nee: een statussymbool, geen tekst om te lezen | links onder | geen | geen | P3 |
| Aftelling (3, 2, 1, GO) | `hudcards.js` (`showCount`) | 0,9 s animatie | nee | ongewijzigd | nee: een teller is zelf de klok | midden | geen | geen | n.v.t. |
| Toetstips | `prompts.js`, `hudtext.js` | zolang de situatie geldt | nee | ongewijzigd | nee: geen tijdelijke melding maar een toestand | onderin | een per rij, getrapt | gameBusy houdt ze weg | P2 |
| Stuntuitleg ("brief") | `stunthud.js` | `briefT` | nee | ongewijzigd | nee (vervolg: balkje toevoegen; de activiteit bepaalt wanneer) | boven de stunt | geen | met de activiteit | P1 |
| Laadscherm | `loadscreen.js` | tot klaar | nee | ongewijzigd | nee: geen melding | schermvullend | n.v.t. | n.v.t. | n.v.t. |

Nog niet nagelopen in de code: de uitnodiging "Meedoen?" van Samen spelen (`coophud.js`), de boerderij- en simhud-strook (`farmhud.js`, `simhud.js`; dat zijn toestanden van de activiteit, geen tijdelijke meldingen), en de politiekaart "Achtervolging eindigt zonder arrestatie" van de wanted-branch (die gaat via `hudcards.js` met soort politie en krijgt daar het rode balkje; niet aangeraakt om die branch niet te kruisen).

## De duurklassen

| Klas | Duur | Token | Voor |
|---|---|---|---|
| kort | 4 s | `--ds-melding-kort` | een naam, een paar woorden, de menumelding, een wachtrij met twee of meer wachtenden |
| normaal | 6 s | `--ds-melding-normaal` | een korte zin of een tip |
| lang | 9 s | `--ds-melding-lang` | een uitleg of een zin met een toets |
| max | 10 s | `--ds-melding-max` | de bovengrens; een langere tekst staat in het tekstlog (Pauze > Hulp) |

De duur van een tekst is `2 s + tekens / 15`, begrensd op 4 tot 10 s, daarna naar boven op een klas gezet. Een melding die een klas opgeeft (`klas: 'lang'`) houdt die als ondergrens; de tekst kan hem verlengen, nooit verkorten. Leestijden zijn geen animaties: ze gaan niet op 0 bij "Beweging beperken".

## Beweging beperken (vastgelegd besluit)

Het balkje is informatie, geen decoratie. Onder "Beweging beperken", Rustig drukwerk en `prefers-reduced-motion` blijft het dus zichtbaar en loopt het **in tien stappen** (`steps(10, end)`) in plaats van vloeiend. De readingTime verandert niet. Alternatieven die zijn afgewezen: het balkje weglaten (de speler weet dan niet meer wanneer de melding weggaat) en een statisch balkje (geen informatie over wat er nog rest).

## Samen spelen

Meldingen zijn lokaal per speler. Elke speler ziet zijn eigen kaarten, toasts en balkjes; er gaat niets over het net. Een gast die in de wereld van een ander meespeelt krijgt zijn eigen prestaties en kaarten (per speler, #429); een melding die de host stuurt via een EXTRA-bericht komt bij de gast als gewone lokale kaart met dezelfde regels. Valt iemand weg of sluit hij later aan, dan is er niets om te synchroniseren. Dekking: de pure tests in `scripts/meldingtijd_test.mjs`.

## Hoe test je het

- `node scripts/meldingtijd_test.mjs`: duurfunctie, klassen, timer (pauze, menu, film, hover), wachtrij, prioriteit, de DOM-kant met een nagebootst document, tokens, css en de adapters.
- `node scripts/ds3_dekking_test.mjs`: de ratel "een tijdelijke melding hoort een aflopend balkje te hebben". Een bestand dat een element met `.add('out')` op een timer laat verdwijnen, staat in `NOTICE_TYPES` (`game/js/noticetiming.js`), met een balkje of met een reden waarom niet. Een nieuw bestand zonder register faalt.
- Het beeld: `docs/beeld-21-11/meldingen/mock.html` met zes meldingstypen en het balkje (headless Chrome, geen Electron).

## Vervolg

- Stuntuitleg (`stunthud.js`) en een eventuele hover-houdt-vast voor HUD-kaarten (nu doorklikbaar naar de wereld, dus zonder hover).
- De sweep in Electron: kijken of het balkje op elke kaart past (breedte, hoeken) en of de rode variant op gevaar en politie goed leesbaar is.

## Meldingenpoort (22-11)

`game/js/notifygate.js` houdt meldingen vast zolang het laadscherm, het opstartscherm, een cutscene of een schermvullend menu het scherm heeft, en geeft ze daarna een voor een vrij met de duur van `noticetiming.js`. Soorten: wanted, missie, prestatie, doel, hint, gebied, ontdekking, kaart. Ontdekkingen smelten samen, wat 20 s wacht vervalt (prestaties nooit), een savegame laden laat oude ontdekkingen vallen. Lokaal per speler; er gaat niets over het net. Test: `scripts/notifygate_test.mjs`.
