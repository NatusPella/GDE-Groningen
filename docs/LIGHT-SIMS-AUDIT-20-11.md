# Light sims: audit en verbeteringen (20-11, #985, #980)

> Werkdocument bij de feedback van de eigenaar op 20-11: "de light sims zijn nog niet goed genoeg qua UI/UX/HUD/gameplay/map-weergave". Het patroon komt van de boerderij
> ([FARMING-AUDIT-20-11.md](FARMING-AUDIT-20-11.md), [BOERDERIJ.md](BOERDERIJ.md)): één stand per ding, zichtbare wereld, een HUD-strook, uitleg met pictogrammen bij de eerste keer.
> Dit is een momentopname: wat er was, wat er is gebouwd, wat nog niet gezien of gedaan is. De regels van de sims staan in
> [.specs-fire/standards/mechanica.md](../.specs-fire/standards/mechanica.md); bij verschil wint de spec.

## 1. Inventaris en keuze

Gezocht in `game/js`: hengelen (wedstrijd en vrij, hengeltuig, visboek), bakronde (Oma's eierballen), kartbaan, padel, discgolf, carbid, duifmodus, klimtoren, zwembad, skatepark,
reuzenrad, kermis, dorpsuitjes en uitjepaneel, rondvaartjacht en de bijbanen (`sidejob_*.js`: krantenwijk, bezorger, snackbar, taxi, bus, rondvaart, veer, verhuizing, fietsdepot, boa, tjalke).
Een sim is "licht" als hij een eigen kleine lus heeft zonder missie eromheen. Gekozen op speelkans (hoe vaak een speler hem tegenkomt zonder dat een missie hem dwingt) en op hoe weinig
de lus nu zichtbaar of uitgelegd is.

| Sim | Speelkans | Waarom nu zwak | Stand |
|---|---|---|---|
| 1. Hengelen | hoog: overal aan het water met I, plus de Meerstad-wedstrijd | wereld goed (hengel, lijn, dobber, vis), maar HUD was een tekstbord in eigen kleuren, geen uitleg, geen beetteken, vangst alleen als regel | gebouwd, zie 2 |
| 2. Krantenwijk | hoog: eerste bijbaan | zie 3 | zie 3 |
| 3. Bezorger | hoog | zie 3 | zie 3 |
| 4. Kartbaan | midden | zie 3 | zie 3 |
| 5. Rondvaart | midden | zie 3 | zie 3 |

## 2. Hengelen

**Wat kan de speler.** Vrij hengelen (I) op elk water waar hij aan de kant staat of met een boot stilligt: elk watertype eigen vissoorten, een visboek, de visboer betaalt per kilo, hengel en aas kopen
(hengeltuig). En de Meerstad-wedstrijd (E bij de steiger): negentig seconden, de zwaarste vangst wint, medailles en een record; bij Samen spelen een wedstrijd tegen elkaar.

**De lus.** Uitgooien (Spatie), wachten op het dobbertje, bij een beet binnen het beetvenster weer Spatie, binnenhalen. Te vroeg trekken jaagt de vis weg, te laat laat hem los.

| Onderdeel | Voor | Na |
|---|---|---|
| Uitleg | niets; de startkaart noemt de toetsen | vier iconen met een zin tot je voor het eerst uitgooit (alleen dit apparaat, `gde-sim-uitleg-v1`) |
| HUD | bord (`minigamekit`) met tekst en harde kleuren: Uit, Worp, Wacht, Beet als cellen, getallen in een regel | strook (`simhud.js`, `sim.css`, alleen ds-tokens): stappen als chips met icoon (één met nadruk), beetmeter die leegloopt, cijfers, één zin "wat nu" |
| Beet | alleen het dobbertje dat zakt en een geluid | ook een geel uitroepteken boven het dobbertje (wereld) en een meter in de strook met de tijd die je nog hebt |
| Vangst | een regel in de berichtenkaart | een getal springt op in de strook ("+Baars 0,60 kg", "Nieuw: ..." bij een nieuwe soort) met het bestaande UI-geluid |
| Wereld | hengel, lijn, dobbertje, plons, springende vis (bestond al, #437) | hetzelfde plus het uitroepteken |
| Kaart | de steiger van de wedstrijd als pictogram | ongewijzigd; geen kaartstatus voor vrije hengelplekken (zie niet gedaan) |

**Gegevens (HUD).** Plek en watertype, vangsten, soorten, gewicht, wat de visboer betaalt, hengel en aas; in de wedstrijd de tijd. Model: `hengelstatus.js` (puur).

**Samen spelen.** Hengelen blijft van de speler zelf: de minigame draait lokaal, ook bij een gast (`GAST_ACTIVITEITEN`), en de vangst, het visboek en het geld zijn per speler (#429). De strook is lokaal: elke
speler ziet zijn eigen stappen en beetmeter. In de wedstrijd tegen elkaar blijft de stand van de anderen op het bord staan (host telt, `multiplayerwedstrijd.js`). Valt een speler weg, dan verdwijnt zijn strook met zijn ronde.
Test: `hengelhud_test`.

**Niet gedaan.** Kaartmarkering voor goede hengelplekken, een vangstlijst van de dag in de strook, een eigen sting voor een zeldzame vis.
