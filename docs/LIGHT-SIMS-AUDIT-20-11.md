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
| 2. Krantenwijk | hoog: een van de eerste bijbanen | wereld al redelijk (brievenbussen, vliegende kranten, liggende kranten), maar elke brievenbus zag er na de worp hetzelfde uit, geen duidelijk volgend doel in de straat, de stapel en de uitkomst alleen als meldingen, geen uitleg | gebouwd, zie 3 |
| 3. Bezorger (Hap & Rap) | hoog | tekstregel "warm 82%" in de bijbaankaart; eten dat afkoelt was onzichtbaar; geen doel in de straat; geen uitleg | gebouwd, zie 4 |
| 4. Bakronde (Oma's eierballen, akte 5) | middel: twee missies (M25, M26) en dus gegarandeerd gespeeld | paneel met harde kleuren en inline stijl in de code (eigen donkerbruin en oranje rand, Arial), geen voortgangsbalk, een bal die klaar is kreeg geen teken | gebouwd, zie 5 |
| 5. Rondvaartgids | midden: een bijbaan met een eigen steiger en een rustige lus | de toeristen en het verhaal waren onzichtbaar: alleen een regel "Tocht 1 · 1/3 verhalen", geen teken waar je moet vertragen, geen uitleg | gebouwd, zie 6 |

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

## 3. Krantenwijk

**Wat kan de speler.** Bijbaan van Drukkerij De Natte Inkt (verzonnen): in een wijk van Grunn kranten gooien naar brievenbussen, op de fiets of lopend. E gooit naar de dichtstbijzijnde brievenbus; dichtbij en langzaam is raak,
op volle snelheid wordt het de deurmat of de border. In een wijk met een vijver mag de hele stapel in de papiercontainer (betaalt minder). Loon per worp plus een vaste vergoeding en een fooi bij alles raak (`krantenrules.js`).

**De lus.** Naar de wijk, bezorgen (stapel is huizen plus drie reserve), ronde klaar, volgende wijk. Elke ronde heeft een klok.

| Onderdeel | Voor | Na |
|---|---|---|
| Uitleg | de intro van de baas (drie zinnen) | plus vier iconen met een zin in de strook tot je voor het eerst gooit (`gde-sim-uitleg-v1`) |
| HUD | de bijbaankaart met een regel voortgang ("Helpman, 2/6 bezorgd, stapel 7") | strook: stappen als chips (naar de wijk, bezorgen, klaar), balk brievenbussen bezorgd, cijfers stapel, in de bus, op de mat, mis en tijd, en één zin wat nu (afstand en snelheid bepalen of er staat "Nu E" of "Rustig aan") |
| Wereld | brievenbus, vliegende en liggende kranten | de volgende brievenbus krijgt een gele lichtkolom (MeshBasic, depthWrite uit), en een brievenbus waar de krant in zit krijgt een omhoog gezet vlaggetje met een krantenrol erin |
| Feedback | een regel in de berichtenkaart | een getal springt op per worp ("In de bus €4,50", "Op de mat €2,70", "Mis, geen loon") met het bestaande UI-geluid |
| Kaart | de markering van de volgende brievenbus en puntjes voor de rest (bestond al, uit `view()`) | ongewijzigd |

**Samen spelen.** De bijbaan is van wie het spel opende (de wereld bezit de ronde, de brievenbussen en de stapel). Een meespelende gast gooit mee met `helperActie` (bestond al, #452) en ziet de bijbaankaart zoals eerst; de strook, de lichtkolom en de vlaggetjes
zijn er voor de eigen dienst (`c.owner` leeg). De vlaggetjes en de kolom staan in de wereld van de host en worden niet aan gasten gestuurd (nog niet gezien bij twee instanties). Beloning per speler volgens #429, zoals bij elke bijbaan. Valt de host weg, dan eindigt de dienst.
Test: `krantenhud_test` (model, markup, bedrading).

**Niet gedaan.** Het vlaggetje bij de gast, een kaartlaag met de route als lijn, een eigen sting bij een foutloze ronde.

## 4. Bezorger (Hap & Rap, maaltijden op de e-fatbike)

**Wat kan de speler.** Bijbaan: een bestelling ophalen bij een zaak (zes verzonnen zaken in de stad), naar de klant fietsen voor het eten koud is. Ophalen en afleveren gaan vanzelf bij aankomst (geen toets). Tegenwind, regen en botsen laten het eten sneller afkoelen;
warm geeft fooi (boven 70%), lauw weinig, koud niets. De klok is de warmte.

**De lus.** Ophalen, bezorgen, klaar, volgende bestelling; de afstand en de tijd worden strakker met je reeks en niveau.

| Onderdeel | Voor | Na |
|---|---|---|
| Uitleg | de intro van de baas | plus vier iconen met een zin in de strook tot je voor het eerst iets ophaalt (`gde-sim-uitleg-v1`) |
| HUD | de bijbaankaart: "Bestelling 3 · warm 82% · tegenwind 5" | strook: stappen als chips (ophalen, bezorgen, klaar), een warmtemeter die leegloopt en onder 40% rood wordt met het woord "Snel, het eten wordt koud!", cijfers bestelling, afstand, tijd en wind, en één zin wat nu (waar, wat en voor wie) |
| Wereld | thermobox op de fiets, kok en klant die wachten | een gele lichtkolom boven de zaak en daarna boven de deur van de klant (dezelfde kolom als de krantenwijk, `simkolom3d.js`) |
| Feedback | een regel in de berichtenkaart | een getal springt op: "Opgehaald" en "Warm bezorgd · fooi €8" met het bestaande UI-geluid |
| Kaart | de markering van het doel (bestond al, uit `view()`) | ongewijzigd |

**Samen spelen.** De bijbaan is van wie het spel opende. Een meespelende gast kan ophalen en afleveren als hij bij de plek staat (`afstandNaast`, bestond al, #452). De strook en de lichtkolom zijn er voor de eigen dienst (`c.owner` leeg) en worden niet aan gasten gestuurd.
Test: `bezorghud_test` (model, markup, bedrading, gedeelde kolom).

**Niet gedaan.** Een zichtbaar pakketje op de stoep na het afleveren, stoom boven de thermobox, een kaartlaag met de route.

## 5. Bakronde (Oma's eierballen, M25 en M26)

**Wat kan de speler.** Oma's recept is een volgorde: je drukt de ingrediënten in die volgorde in (1 tot 6); een verkeerd ingrediënt is een mislukte eierbal, te veel mislukte ballen is opnieuw bakken, zonder de missie te verliezen. De oefenronde heeft vijf ingrediënten, de wedstrijd vier en drie ballen.
Oma's volgorde blijft verborgen: alleen wat je goed deed krijgt zijn icoon (de regelwidget, #987).

| Onderdeel | Voor | Na |
|---|---|---|
| Paneel | een eigen donkerbruin vlak met oranje rand en vaste kleuren in de code | een `ds-kaart` op dezelfde plek en in dezelfde taal als de strook van de andere sims (`sim.css`, klassen `bk-`, alleen ds-tokens); de speelbot vindt het nog als `#bakeround` |
| Voortgang | de tekst "Eierbal 2 van 3 · mislukt 1/3" | dezelfde gegevens als chip, plus een balk met de klare ballen ("1 van 3 klaar") |
| Feedback | een bal die klaar is zag je alleen aan de teller | de melding "Eierbal klaar! De volgende." en bij alles "Alle eierballen klaar!", met het bestaande UI-geluid; een fout blijft de rode foutmelding van Oma |
| Wat nu | de lege regel | "Druk de ingrediënten in Oma's volgorde (1 tot 6)" of "Stap 2 van 4" |

**Samen spelen.** De bakronde is van wie het spel opende (een missie). Een gast die meedoet drukt mee met zijn toets (`bakeKeyId`, #525) en ziet de stand via het bestaande paneel van de host (`bakePanel`); dat is hier niet veranderd. Het nieuwe paneel is voor wie de ronde draait.
Test: `bakeround_test` (23, o.a. `bakeHudModel` en dat er geen eigen kleuren of inline stijl meer in de code staan). Beeld: `docs/img/qa/lichtsims-bakeronde-na.jpg` (het paneel in een browservenster met de echte stijlbladen, niet in het spel).

**Niet gedaan.** Zichtbare eierballen of een pan in de keuken (de wereldkant van deze sim: de keuken is een binnenset van de missie), een eigen sting per bal.

## 6. Rondvaartgids (Diepenring-water)

**Wat kan de speler.** Bijbaan van Schipper Geert: een rondvaartboot tussen vier steigers langs zeven bezienswaardigheden varen. Bij elke bezienswaardigheid gas eraf (onder 3,6 m/s): dan vertelt de gids het verhaal (regels met stem), anders missen de toeristen het en daalt hun tevredenheid.
Stoten laat hem ook dalen. Aan het eind stilliggen bij de steiger; alle verhalen geeft een fooi en een prestatie.

**De lus.** Instappen (even stilliggen bij de steiger), varen en vertellen, aanleggen, de volgende tocht de andere kant op.

| Onderdeel | Voor | Na |
|---|---|---|
| Uitleg | de intro van Geert | plus vier iconen met een zin in de strook tot de toeristen voor het eerst aan boord zijn (`gde-sim-uitleg-v1`) |
| HUD | de bijbaankaart met "Tocht 2 · 1/3 verhalen · uitleg 40%" | strook: stappen als chips (instappen, varen, aanleggen), een balk voor het verhaal dat je vertelt (anders de verhalen van de tocht), cijfers verhalen, tevredenheid, tempo en tijd, en één zin wat nu ("Gas eraf bij Herebrug: ze willen het verhaal horen", "Je vertelt over Herebrug") |
| Wereld | boot, geleidepuntjes op de vaarlijn | een gele lichtkolom op het water boven het volgende doel: de steiger, de volgende bezienswaardigheid, daarna de eindsteiger (`simkolom3d.js`, op waterniveau) |
| Feedback | een regel in de berichtenkaart | een getal springt op: "Verhaal verteld: Herebrug", "Gemist: ...", "Applaus aan boord!" met het bestaande UI-geluid |
| Kaart | markering en geleidepuntjes (bestond al, uit `view()`) | ongewijzigd |

**Samen spelen.** De bijbaan is van wie het spel opende (de boot en de tocht). De strook en de lichtkolom zijn voor de eigen dienst (`c.owner` leeg) en worden niet aan gasten gestuurd; een gast als bijrijder ziet de bijbaankaart zoals eerst.
Test: `rondvaarthud_test` (model, drempel gelijk aan de baan, markup, bedrading).

**Niet gedaan.** Toeristen aan boord in beeld (de boot heeft ze niet als figuren), een kaartlaag met de route en de bezienswaardigheden als lijst.

## Beeldbewijs en eerlijkheid

`docs/img/qa/lichtsims-strook-na.jpg` en `lichtsims-strook-na-2.jpg` (met de bezorger, ook een koud wordende bestelling): de echte markup van de strook (`simHudHtml`) met de echte stijlbladen (ds-tokens, ds-components, sim.css) in een browservenster: hengelen met een beet, hengelen bij de eerste keer (uitleg met vier pictogrammen), krantenwijk onderweg en bij de eerste keer. Het script staat niet in git (`.scr/simbeeld.mjs`). **Niet in het spel gezien:** de strook boven de echte wereld, de lichtkolom, het vlaggetje, het uitroepteken boven het dobbertje en het opspringende getal (geen gestagede game en wereld in deze worktree, en meerdere Electron-instanties van anderen liepen al). Geen fps gemeten; de wereldkant is een paar kleine meshes met MeshBasic, zonder nieuw shaderprogramma of licht.
