# Farming: speelronde (20-11, #985, #980)

> Verslag van een speelronde over de hele lus van de boerderij: Perceel, ploegen, zaaien, groeien, oogsten, afleveren, volgende ronde. Opdracht van de eigenaar op 20-11:
> "Als farmen maar goed werkt in deze versie!" Dit is een momentopname; de regels van de boerderij staan in [BOERDERIJ.md](BOERDERIJ.md) en
> [mechanica.md](../.specs-fire/standards/mechanica.md), het ontwerp in [FARMING-AUDIT-20-11.md](FARMING-AUDIT-20-11.md). Bij verschil wint de spec.

**Hoe er gespeeld is.** Eerlijk: dit is geen mens. Het is de beeldbank `scripts/qa/boerderij_beeld.mjs` (met `boerderij_beeld.page.js`) in Electron met een wegwerpprofiel,
1280x720, op een eigen stage van deze branch met de wereld van een eerdere bouw. De bank koopt de machines, zet de trekker bij het werktuig (instappen kan alleen bij een
deur, #459), koppelt met E en T en rijdt de rijen met een vaste snelheid; de groei wordt met `tikUren` versneld; het afronden van oogsten en cultiveren gaat via `rondAf`.
Daarna loopt hij het paneel, de kaart op vier zoomniveaus, de veldpaal en het veld in elke stand af. Wat een mens voelt (sturen, de snelheid in de band, het geluid, de tijd
tussen de stappen) is dus niet gespeeld. De beelden staan in `docs/beeld-20-11/farming/`.

## Gedaan (code, met pure tests)

- **Water op de rijen.** In twee van de drie eerste runs lag de akker (op een andere plek dan de vorige run, want de plek wordt gezocht zodra je in de buurt komt) met 4 tot
  8 steekproeven nat op de rijen; de trekker liep tegen de kade en zonk ("Plons! Je auto zinkt") midden in het ploegen. Oorzaak: `vindAkker` keurt de plek terwijl het
  water van de omgeving soms nog niet is geladen, en de plek wordt daarna voor altijd bewaard. Nu keurt `boerderijwereld.js` (`_herkeurVeld`) de plek opnieuw zodra je binnen
  de bouwafstand bent; ligt er water op de rijen en is het veld nog onbewerkt (`veldOnbewerkt`), dan vervalt de plek (`wisVeldPositie`) en zoekt het spel een andere (hoogstens vier
  keer per veld). Een bewerkt veld blijft staan. Test: `boerderijwereld_test`.
- **Het paneel Perceel had bij één veld twee kaarten.** De hoofdkaart "Nu: ..." en daaronder dezelfde akker nog eens als veldkaart, met twee knoppen "Zet op de kaart" en een
  kolom die in de smalle ruimte de titel brak. Nu één kaart, met de groeibalk erin; de veldkaarten blijven voor meerdere velden. Test: `farmstatus_test`.
- **De HUD-strook lag over het doel van je missie en de straatnaamkaart** (bij 1280x720 over de balk "Nul krassen, ..." en de kaart "Gravenburg"). Nu staat hij in de vrije band
  onderin tussen de straatnaamkaart en de snelheidsmeter, op één kolom in de smalle band. Alleen CSS (`farm.css`).
- **De kaartlaag Je velden had geen schakelaar** (de regel stond in de legenda als "altijd" en leek uit te staan). Hij hoort nu bij Percelen, met dezelfde schakelaar.
- **De label van het veld op de kaart lag onder je machines.** De naam van de stand staat nu bij de hoek met de vlag.
- **Toestand per veld, in de taal van de gebieden (extra eis van de eigenaar).** Zeven standen, elk met een eigen Phosphor-icoon (`veld_braak` tot `veld_rijp`, geen nieuwe
  bestanden: bestaande Phosphor-iconen onder nieuwe betekenisnamen), een letter, een lijnpatroon en een eigen vorm op de veldpaal. De standen met een gewas (zaailing tot
  oogstklaar, `GROEI_STANDEN`) hebben ook voortgang: op de kaart een schijf met het icoon en een ring die met het gewas meegroeit, en een vulling die voller wordt (oogstklaar
  het volst). De kleuren volgen de gebieden (eigenaar, 20-11): groen is klaar en in orde (oogstklaar, met een vlag), geel is bezig (zaailing, groeit, bijna rijp, met de voortgang),
  dof grijs is leeg (braak, stoppel) en room is geploegd; ook de wereldmarkering en de lichtkolom volgen dit (`WERELD_KLEUR`); in de wereld een meetlat naast de veldpaal (het veld wordt per 10% opnieuw gebouwd). Alles komt uit `veldStatus()`, dus paneel, kaart, HUD en
  wereld kunnen elkaar niet tegenspreken. Tests: `farmstatus_test` (15).
- **Je velden op de kaart, ook ver uitgezoomd.** De pin is een schijf met een schuur (Phosphor `boerderij`) in de kleur van de stand, de rand in het lijnpatroon van de stand en
  de letter van de stand (B, S, P, Z, G, O). De pin valt onder de categorie `home` (zichtbaar vanaf zoom 0) en wordt nooit door een naburig pictogram weggedrukt (`placeIcons`), en
  hij verdwijnt niet onder de mist van een nog niet ontdekte streek. Op de minikaart staat dezelfde pin. Aangeboden akkers (te koop, te huur) volgen het gewone filter.
- Alles in kaartbestanden: `mapview.js` (drie kleine plekken: vulling per veld, de badge bij het veld, het mistfilter van je eigen pin), `mapicons.js` (categorie en niet
  wegdrukken), `perceelmap.js` en `iconmap.js` (zeven betekenisnamen). De kaartagent (branch `worktree-agent-a0c3f2e69c3e6be02`) is erin gemerged; het enige conflict was
  het einde van `iconmap.js` en de changelog.

## Beelden (Electron, 1280x720, `docs/beeld-20-11/farming/`)

| Wat | Bestand |
|---|---|
| Drie standen naast elkaar: wereld boven (geploegd, groeit met meetlat, oogstklaar met lichtkolom), kaart onder (dezelfde drie) | `farming-toestanden-naast-elkaar.jpg` |
| Veld geploegd, groeit, oogstklaar, stoppel (wereld) | `farming-veld-geploegd.jpg`, `-groeit`, `-rijp`, `-stoppel` |
| De veldpaal van dichtbij (groeit en oogstklaar) | `farming-markering-groeit.jpg`, `farming-markering-rijp.jpg` |
| HUD-strook, trekker met werktuig en tijdens het ploegen (met de minikaart en de pin van je veld) | `farming-trekker-gekoppeld.jpg`, `farming-hud-tijdens-ploegen.jpg` |
| Paneel Perceel, één kaart met lus en groeibalk | `farming-paneel-perceel-rijp.jpg` |
| Kaart dichtbij in vier standen (zoom 24) | `farming-kaart-geploegd.jpg`, `-groeit`, `-rijp`, `-stoppel` |
| Kaart op middenzoom (zoom 3) en twee keer ver uitgezoomd (provincie en woonplaatsen): de pin is ~34 px, met witte rand en schaduw, bovenop alle andere pins | `farming-kaart-midden.jpg`, `farming-kaart-ver.jpg`, `farming-kaart-ver-2.jpg` |

Kritisch nagekeken: de HUD-strook staat nu vrij van het doel en de straatkaart (eerst erover); de meetlat naast de paal is op de paalbeelden klein en alleen goed te zien als je er dichtbij
staat; de pin bij het veld ligt op middenzoom boven je machines (T) en op de provinciekaart tussen andere pictogrammen (een bushalte en de munt van een bijbaan), maar valt niet weg; de
veldnaam (het woord Oogstklaar) wordt op de kaart soms door een machine afgedekt; in het middelste beeld van een eerdere ronde lag een wijkkaart ("Metalenkwartier") over het veld, wat
een gewone melding is. Op de provinciekaart is de pin 20 px: een speler die niet weet waar hij moet zoeken moet nog steeds op het vlak van Hoogkerk inzoomen.

## Gezien en goed

Het veld in elke stand (geploegd met voren, zaailing, groeiend, rijp, stoppel), de veldpaal met vlag, vorm en lichtkolom, het paneel met de lus (vijf chips, "Nu: Oogsten",
één gele knop), de HUD-strook tijdens het ploegen (taak, voortgang, snelheid in de band, diesel, wat nu), de kaart met het vlak, de pin en de legenda, de melding "oogstklaar", de
minikaart met de pin. De nu-regel en de stappen kloppen bij elke stand.

## Gevonden en niet gefixt

- **De trekker kan bij het inrijden van het veld nog steeds tegen de kade lopen als een sloot langs de rijen ligt.** Een veld dat zelf op water ligt wordt nu verplaatst, maar
  een sloot naast het veld blijft een sloot (de trekker "stoot" dan tegen de kade, wat juist hoort). Niet bekeken met een mens aan het stuur.
- **De kaart toont de afnemer niet vooraf** (uit de code, niet gezien). De route naar de afnemer wordt pas gezet als je de aanhanger laadt (`routing.setUserWaypoint`); voor die tijd staat de afnemer niet
  op de kaart. Het paneel zegt wel "Lever de oogst af" maar niet waar. Een kaartpin voor de afnemers is nog niet gemaakt.
- **Het getal dat opspringt na het afronden verdwijnt als je direct uitstapt** (uit de code, niet gezien): het zit in de HUD-strook, die verborgen wordt zodra je uit de machine bent. Het geluid klinkt wel.
- **Geen eigen geluid** voor het werken zelf (ploegen, zaaien, oogsten) en voor "oogstklaar": het bestaande UI-geluid `ui_verzameld` is er het enige.
- **Op de minikaart staat de pin alleen binnen 250 m** (zoals de andere plekken); verder weg staat hij alleen op de grote kaart.
- Het oogstklaar-veld op de kaart is bij zoom 3 klein; de pin draagt het dan, het vlak is pas bij dichterbij zoomen goed te zien.

## Niet gezien

Geen mens aan het stuur: de snelheid en het sturen in de band, de aftakas en de hef met de toetsen (alleen E en T zijn gedaan), tanken (R), de aanhanger laden en bij de afnemer lossen,
het verkopen en het geld dat daarna op de rekening staat, een tweede ronde (opnieuw ploegen na de oogst met stoppel; alleen de stand is gezien), de loonwerker, contracten, het
kasboek en de lening, de controller, fps (geen meting), het geluid, Samen spelen met twee Electron-instanties (alleen pure tests: de toestand komt per speler uit het eigen bedrijf,
de gast ziet de velden van de gastheer via MISC_VELDEN met dezelfde markering en meetlat), en het ongedaan maken van de plek bij een echte langzame tegelbelasting.

## Samen spelen (regel)

De wereld en de velden zijn van wie het spel opende; elke speler heeft zijn eigen bedrijf, geld en opslag (#429). De toestand van een veld (icoon, ring, meetlat, kaartvlak, pin) wordt
altijd uit het eigen bedrijf berekend en nooit gedeeld; een gast ziet de velden van de gastheer in de wereld (status en groei uit MISC_VELDEN) met dezelfde veldpaal. Valt iemand
weg of sluit hij later aan, dan verandert er niets aan het eigen bedrijf; de velden van de gastheer komen met het eerstvolgende stukje (zie [COOP-GAST.md](COOP-GAST.md)).
