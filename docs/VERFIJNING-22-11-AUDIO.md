# Verfijnronde geluid, muziek en radio (22-11)

Doel: geen nieuwe functies, wel de zuivere audiomodules (mix, stappen, lagen, UI-taal, stings, radio) hardmaken tegen de randgevallen die in
het spel kunnen optreden: een ontbrekende positie, een tijd zonder waarde, een sleutelwoord als `constructor`. Een NaN in een versterking,
een NaN-tijd of een sleutel van het prototype maakte een klank stil of liet een afkoeltijd of een dempstand voorgoed vastlopen.
Bewijs: `node scripts/verfijn_audio_test.mjs` (fuzz op 9 rare waarden per functie, plus een simulatie van 6.000 radiokeuzes met dag en nacht).

## Wrijving en oplossing

| # | Wrijving (stuck state of fout) | Oplossing | Bewijs |
|---|---|---|---|
| 1 | `distanceGain`, `airLowpassHz`, `arrivalDelay` geven NaN bij een onbekende afstand (Web Audio weigert dat) | afstand zonder waarde telt als dichtbij | verfijn_audio_test |
| 2 | `speechDuckFactor` geeft NaN bij een ontbrekende spraakstand | stand zonder waarde telt als 0 | idem |
| 3 | `categoryLevel` en de spraakdemping geven bij `constructor` of `toString` een functie of undefined terug | alleen eigen sleutels tellen | idem |
| 4 | `plan(info, d)` valt om zonder `info` | veilig met standaardniveau | idem |
| 5 | `capVoor` rekent met een prototypesleutel en een NaN-prioriteit (limiet NaN: nooit vol) | eigen sleutels, onbruikbare prioriteit telt als gewoon | idem |
| 6 | de globale stemlimiet gaf bij een ontbrekende prioriteit `undefined`: elke klank van die aanroep viel stil | `voiceCap` valt terug op gewoon (audio.js `voiceOk`) | idem |
| 7 | `duckAmbience` met NaN als sterkte of duur bleef voorgoed in de dempstand hangen | `duckVeilig` begrenst sterkte (0 tot 1) en duur (0 tot 30 s) | idem |
| 8 | `stepSurface('constructor')` gaf een functie terug: stapnamen als tekst van een functie, geen voetstap | alleen eigen aliassen | idem |
| 9 | `stepNames` en `fileStepNames` met NaN als toeval gaven `step_gras_NaN` (stille stap) | NaN telt als 0 | idem |
| 10 | `fileSurface` zelfde prototypegat als 8 | alleen eigen aliassen | idem |
| 11 | `strideFor` met NaN-snelheid zette het stapritme op NaN: voorgoed geen voetstappen meer | snelheid zonder waarde telt als 0, minimale stap blijft | idem |
| 12 | `gainJitter` met NaN of een toeval buiten 0 tot 1 gaf NaN of Infinity | begrensd | idem |
| 13 | `clamp01` van het laagplan liet NaN door (havens, spoor, verkeer, occlusie, bedden) | NaN wordt 0 | idem |
| 14 | `scheepshoornPauze` met NaN of Infinity: pauze NaN of 0, de hoorn bleef weg of klonk doorlopend | niveau en toeval begrensd | idem |
| 15 | `treinHoornPauze` met een toeval buiten 0 tot 1: negatieve pauze | toeval begrensd | idem |
| 16 | `verkeerDagNiveau` met NaN als binnenstand-factor: stil verkeer | factor zonder waarde telt als 1 | idem |
| 17 | `bedWobble` zonder sleutel of NaN-tijd gaf een uitzondering of NaN | sleutel en tijd veilig | idem |
| 18 | `magKlinken` met NaN-tijd schreef NaN als laatste tijd: de afkoeltijd van dat UI-geluid was voorgoed weg (geluid kon spammen) | NaN-tijd speelt niet en wist niets | idem |
| 19 | `wordtGesmoord` en de afkoeltijd keken in het prototype | alleen eigen sleutels | idem |
| 20 | `kiesVariant` met NaN als toeval gaf `undefined`: een stil UI-geluid | NaN telt als 0 | idem |
| 21 | `toonSpreiding` en stingspreiding met NaN: NaN-afspeelsnelheid | NaN telt als midden | idem |
| 22 | volume uit een tekst als `50%` (instellingenbestand, adres) viel terug op de standaard 100% | procent en komma-getal worden gelezen | idem |
| 23 | `planAdBlock` met een lege reclamelijst gaf een blok met een gat | geen blok | idem |
| 24 | geen lange-speelduurtest voor de radio | 6.000 keuzes over dag en nacht: nooit twee keer achter elkaar, geschiedenis begrensd, elk nummer komt aan bod | idem |

## Bewust niet (te groot, nieuwe functie of niet te meten zonder spel)

- Een schuif voor omgevingsgeluid (ambience) en ondertitels voor alle geluiden: nieuwe functie, hoort bij een eigen issue.
- Een proefgeluid bij het loslaten van een volumeschuif (Effecten, Stemmen): UX-winst, maar vraagt een luisterronde in het spel.
- Mixbalans stem tegen sfx tegen muziek, ducking-tijden en de keuze welke geluiden irritant zijn: dat is luisterwerk met een echte speler.
- Het laden van audio (laadtijd) en het gelijktijdig aantal klanken op een echt apparaat: Electron-meting volgt in de coördinatorronde.

## Alleen in beeld of met een echte speler te bekijken

- Of de dempstand na een regel zonder duur nu natuurlijk terugkomt (alleen hoorbaar in het spel).
- Of de stemlimiet bij hoge drukte de juiste klanken laat vallen (luisterproef, drukke markt of kermis).

## Samen spelen

Geen wijziging aan netwerk of voortgang: alles is lokale audio per speler; een gast hoort dezelfde regels.
