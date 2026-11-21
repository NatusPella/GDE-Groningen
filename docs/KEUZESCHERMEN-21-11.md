# Keuzeschermen die de speler onderbreken (21-11, #1091)

Aanleiding (eigenaar, 21-11): "En soms opent een scherm waar je op 1, 2, 3 kunt klikken, dat is heel vervelend. Als je een hint wilt geven dat de speler ook met het OV/de taxi kan, laat het andere personage dan een hint geven aan de speler dat het ook zo kan."

Dit is een bronnenonderzoek (code gelezen, niet in beeld bekeken). Per scherm: trigger, wat de keuze doet, verplicht of niet, en of het past bij "niet onderbreken".

## Het scherm dat de speler overviel (nu vervangen)

| Scherm | Bestanden | Trigger | Keuze | Verplicht? | Past bij niet onderbreken? |
|---|---|---|---|---|---|
| Reisbeat "REIZEN, Naar X" met 1 Meerijden, 2 Zelf, 3 Overslaan | `reispanel.js`, `reisview.js`, `reiskeuze.js`, trigger in `storytravel.js` (`tickStoryTravel`, `decideTravel`) | Een verhaalstap met een reisbeat (`reisbeats.js`: T1 tot T5, M13, M14, M17, M21, M23, M27) waarvan het doel meer dan ca. 6,5 km weg is, zodra de speler 60 m onderweg is of in een rijdend voertuig zit. Standaard aan (`FLAGS.reizen`, uit met `?zonderreizen`) | Meerijden (scene met taxi, trein, bus), Zelf (beloning bij aankomst) of Overslaan (direct naar de plek, de reisregels als ondertitel) | Nee, maar het paneel nam het scherm en de nummertoetsen in tot je koos | Nee. Het opende uit zichzelf, midden in het rijden, en hield de speler vast |

Besluit: dit scherm opent niet meer (zie "Wat er veranderd is"). De keuze blijft bestaan, maar alleen als de speler erom vraagt: kaart, klik op een plek, Reis erheen.

## Schermen die blijven (bewust gekozen of eigen aan een opdracht)

| Scherm | Bestanden | Trigger | Keuze | Verplicht? | Oordeel |
|---|---|---|---|---|---|
| Kaart > Reis erheen (taxi, bus, trein, boot, zelf gaan) | `mapview.js`, `kaartactie.js`, `ovkaart.js`, `ovopties.js` | De speler klikt zelf op een plek of icoon op de kaart | Zet waypoint, Reis erheen met een lijst opties, Info | Nee | Past: de speler vraagt erom. Ander issue, hier niet aangeraakt |
| Gespreksvragen in een missie (M18 intake, M21 wagon, M26 jury) | `stagechoice.js` op `choicepanel.js`, `missions.js` | Een `choice`-fase van een missie, eigen aan het verhaal | 1, 2, 3 geven een antwoord; een fout antwoord kost punten, nooit de missie | Ja, binnen de missie, maar de speler is er dan al bewust in | Past: dit is de missie zelf, geen onderbreking van het vrije spel. Zie #962 |
| Timingfasen (M18, M20, M21) | `stagetiming.js` | Een `timing`-fase van een missie | Spatie op het juiste moment | Ja, binnen de missie | Idem |
| Bijbaanschermen: BOA (1/2/3 een boetebedrag), snackbar (1/2/3 een grappige actie), Het Loket, StudieStaat-balie, Borrel (drie vragen), rechtbank, cabaret, strandpost, telefoonrave | `sidejob_boa.js`, `sidejob_snackbar.js`, `sidejob_keuze.js`, `sidejob_rechtbank.js`, `sidejob_cabaret.js`, `sidejob_paneel.js`, `sidejob_stad.js` | Pas na een bewuste start van de bijbaan (naar het gebouw lopen, E) | Antwoorden binnen het spel; Backspace stopt altijd | Nee, Backspace laat de zaak los | Past: de speler koos de baan |
| Hulpaanbod ("Wil je hulp bij deze stap?") | `assistlive.js`, `assist.js` | Na twee mislukte pogingen van een stap, één keer per stap | Knoppen Ja of Nee, ook met Escape en Backspace | Nee, en na een time-out verdwijnt het zonder tellen | Grensgeval: het opent vanzelf, maar alleen na een mislukking, eenmalig en met een time-out. Niet gewijzigd |
| Opnieuw proberen na een mislukte missie | `missioncheckpoint.js` (`createRetryOffer`, `RETRY_KEYS` Enter of E), `missions.js` | Direct na een mislukte missie, 40 s | Enter of E brengt je terug naar de start | Nee, het verloopt vanzelf | Past: geen nummertoetsen, geen scherm dat het spel stilzet |
| Meedoen? (J of N) bij een bijbaan van een medespeler | `coopbijbaan.js`, `coopscene.js` | Een andere speler start een bijbaan in Samen spelen | J of N, 10 s, geen antwoord is nee | Nee | Past, het is bewust gekozen samen spelen; geen nummertoetsen |
| Halte of station: E start een busdienst of treindienst | `bushalte.js`, `stationtravel.js`, `ovmissie.js` | Je staat bij een paal (9 m) en drukt E | Start de dienst | Nee | Past: een prompt, geen scherm |
| Gespreksstemming van gasten (stem in een groepskeuze) | `coopscene.js` | Een gast kijkt mee met een keuze van de host | Een stem | Nee | Past, hoort bij de missie van de host |

## Wat er veranderd is

1. `storytravel.js`: `tickStoryTravel` opent het reispaneel alleen nog als de aanroeper een `ask`-functie meegeeft. `story.js` geeft die niet meer mee. Bij een reisstap met een ver doel markeert het spel de stap als afgehandeld (zelfde vlag `reis:<id>`) en gebeurt er verder niets: de speler rijdt, loopt of pakt de kaart. De codepaden voor Meerijden, Zelf en Overslaan blijven bestaan (de tests dekken ze), voor wie de kaart gebruikt.
2. Nieuw: de lichte hint. `ovhint.js` (puur, getest), `ovhintlines.js` (de zinnen), `ovhintlive.js` (wereld, opslag, kaart). Hij wordt elke twee seconden gevraagd vanuit `story.js`, achter dezelfde vlag als de reisbeats.

### Regels van de hint

- **Wie spreekt:** het andere personage (speel je Tammo, dan zegt Tessa het; speel je Tessa, dan Tammo). De kaart toont de naam als kicker; de opname komt uit de hints-bank (`Anita|...` en `Tammo|...`, zie `smsvoice.js` en `hudcards.js` `companionSays`). Zonder opname is het een stille kaart.
- **Tekst:** vijf zinnen. Twee noemen alleen de taxi, drie noemen ook de bus of trein (OV). De kaarttoets staat als `{M}` in de tekst en wordt de eigen, eventueel herbonden toets of de controllerknop (zelfde weg als `contexthints.js`). Zinnen noemen geen personage: beiden kunnen ze zeggen. De zin wisselt en wordt nooit twee keer achter elkaar gekozen.
- **Alleen bij een echt ver doel:** doel (`getGoal()`: verhaal, missie of plek) minimaal 4000 m hemelsbreed.
- **Alleen als het kan:** met een halte binnen 600 m te voet mag het OV genoemd worden; zonder halte alleen de taxi, en dan alleen met minstens € 25.
- **Nooit tijdens:** pauze, dood, filmpje, verhaalcontact of cameraovername, missie, bijbaan, minigame (padel, activiteit, heli-run, duif), achtervolging (wanted), telefoon open, kaart open, een andere hudkaart in beeld, of als je al in een bus, boot, trein of in de lucht zit.
- **Spaarzaam:** hoogstens eens per 600 spelseconden (10 minuten), één keer per doel (cel van 800 m), na vier keer zonder dat de speler OV of taxi pakte stopt hij. Pakte de speler een taxi of het OV (`reisrit.js` `startMeerijden`), dan is het 30 echte minuten stil, en na drie ritten blijft hij weg. Uit met Instellingen > Uitleg voor nieuwe spelers.
- **Opslag:** `gde-ovhint-v1` (`getoond`, `gebruikt`, `gebruiktOp`, `laatsteId`), per apparaat, nooit in de save; kapotte data is een lege stand.

### Samen spelen (regel voor COOP-GAST)

- Wie krijgt wat: de hint is **lokaal per speler**; er is geen netwerkbericht en geen wereldstand.
- Een **gast** krijgt geen hint, want hij kan niet reizen (`kaartactie.js` `GAST_REIS_MELDING`: een rit verplaatst alleen je eigen figuur, de wereld is van wie het spel opende). Wie het spel opende en met anderen speelt krijgt hem wel; die kan reizen.
- Geen beloning, geen voortgang en geen verhaalstap hangt af van de hint. Wegvallen of later aansluiten verandert niets (de stand is lokaal).
- Test: `scripts/ovhint_test.mjs` (pure test: gast geen hint, host wel).

## Opnames

De vijf zinnen staan voor beide sprekers in `scripts/tts_lines.json` (10 clips) en in de wachtlijst `scripts/voice_wacht.json`, zodat `voice_coverage` groen blijft tot de TTS-ronde draait. Hervatten: `node scripts/tts_lines_list.mjs` en `python scripts/tts_lines.py`.

## Nog niet bekeken (beeld en geluid)

Alleen de pure logica en de verwijderde paneelroute zijn met node getest. Niet in beeld of gehoor gecontroleerd: hoe de kaart er in het HUD uitziet met het personagenaam als kicker, of de `{M}`-toets goed als toetsicoon verschijnt, of de kaart niet botst met andere kaarten, en of de hint in een echte reisstap (bijvoorbeeld T1 naar Warffum) op een natuurlijk moment komt. Ook niet gecontroleerd: dat de hint bij een gewoon waypoint (zonder verhaalstap) komt (het leest `getGoal()`).
