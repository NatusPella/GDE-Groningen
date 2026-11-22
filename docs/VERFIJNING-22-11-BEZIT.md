# Verfijnronde Bezit, boerderij, snackwagen en economie (22-11)

Geen nieuwe functies: wrijving wegnemen in wat er al is. Alles is met pure tests en mocks gedekt (`scripts/bezit_verfijn_test.mjs`, 19 controles, plus fuzz en een simulatie van 240 speldagen);
er is geen Electron en geen build gedraaid, dus **niets hiervan is in beeld bekeken** (zie onderaan).

## Wrijving, oplossing, bewijs

| # | Wrijving | Oplossing | Bewijs |
|---|----------|-----------|--------|
| 1 | Het dagrapport (wat elke speldag binnenkwam en uitging) werd berekend maar nergens getoond: het geld veranderde stil | Eén korte melding per speldag met totaal en posten (percelen, bedrijven, snackwagen, ketens, bijzonder, verzekering); sleutel `bz-dagrapport` vervangt gisteren (`holdingreport.js`, haak in `main.js`) | `bezit_verfijn_test`: dagrapport (4 controles) |
| 2 | Bij een leeg budget verdween een negatieve dag zonder uitleg (geld wordt op 0 gehouden) | De regel zegt "Je geld is op: de kosten lopen door." | idem |
| 3 | De melding verdwijnt na vijf seconden en is nergens terug te lezen | Het laatste rapport staat als regel in Overzicht (`data-rapport`) | idem |
| 4 | Personeel werkt zichtbaar maar de melding zegt niets | "Personeel werkte op N percelen" in het rapport (AI-personeel in woorden) | idem |
| 5 | Een perceel met kudde verkopen gaf de kudde stilletjes weg | De kudde wordt uitbetaald (zelfde 70% als Vee verkopen) en gaat weg; kaart en tekst noemen het (`verkoopPerceel`, `parcelOffer.herdValue`, `forsalecard.js`) | test: kudde uitbetaald; exploit: kopen, vee kopen, verkopen levert nooit winst |
| 6 | Vee van duizenden euro kopen zonder bevestiging | Tweede druk per soort, met "Je houdt X over" | test: vee kopen vraagt een tweede druk |
| 7 | Een schakel uitbreiden (800 euro) zonder bevestiging | Tweede druk met wat het geeft (+25%) | test: ketenuitbreiding |
| 8 | Renovatie: de prijs was pas na de druk te zien, geen bevestiging | Prijs op de knop, tweede druk, bij "in orde" een uitgeschakelde knop | idem |
| 9 | Bulk mieren, wespen en zaaien kostten geld zonder bevestiging of schatting | Tweede druk met een schatting ("Ongeveer X. Zeker?"; zaaien: zaaigoed en loonwerk) | test: bulk met kosten |
| 10 | Bulkknoppen grijs bij 0 gekozen zonder uitleg | "Vink eerst percelen aan; dan werken de knoppen." | idem |
| 11 | Grijze koopknoppen zonder reden (percelen, panden, woningen, vee, snackwagen, vergunningen, upgrades) | `title` met "Je mist nog X"; de bevestiging toont wat je overhoudt | test: vee, snack |
| 12 | Koop mislukt met "Kopen lukt nu niet" voor elke andere reden; vee op andermans perceel zei "past niet" | `buyFailText`: eigen zin voor vol, al van jou en onbekend; juiste zin bij vee | test: koopfouten |
| 13 | Te koop: "wordt geladen, of er is niets" in één zin | Twee zinnen: laden, en "niets te koop binnen drie kilometer" met een tip | test: te koop |
| 14 | Kosten van personeel niet zichtbaar naast de opbrengst | Tegel "Loon per dag" in Overzicht zodra je personeel hebt | test: overzicht loon |
| 15 | Veel velden tegelijk oogstklaar (na slapen of reizen) gaf een stoet meldingen die elkaar wegdrukten | Eén samenvatting vanaf twee velden, met de weg naar Oogst alles (`harvestnotice.js`) | test: oogstmelding |
| 16 | Snackwagen kopen en dan? Een wagen die thuis staat verdient niets | Uitleg met de laagste vergunningsprijs, en na de koop een volgende stap in de melding | test: snack thuis |
| 17 | Leeg menu: geen waarschuwing | Waarschuwing "Je menu is leeg" | test: snack |
| 18 | Een melding onder een tabblad bleef eeuwig staan en hing ook op een ander tabblad | Verloopt na twintig seconden (`msgNow`) | test: meldingen verlopen |
| 19 | Weinig invoervastheid van het opgeslagen bezit | Fuzz: 400 willekeurige rommelopslagen normaliseren zonder fout en idempotent | test: fuzz |
| 20 | Lange speelduur nooit samen gecontroleerd | Simulatie van 240 speldagen met willekeurig kopen, verkopen, vee, personeel, verzekering: geld eindig en niet negatief, geen kudde zonder perceel, rapporten zonder NaN | test: simulatie |

Samen spelen: alles is per speler en lokaal (#429). Het dagrapport en de oogstmelding gaan over je eigen bezit en je eigen velden; een gast ziet zijn eigen rapport, nooit dat van de host.
Een kudde wordt alleen uitbetaald aan wie het perceel verkoopt. Niets gaat over het netwerk; het protocol en de opslagsleutels zijn ongewijzigd.

## Bewust niet

- Ongedaan maken van een koop of verkoop na de tweede druk: dat is een nieuwe functie (een herroepingsvenster raakt de claims van medespelers en de boekhouding); de tweede druk met bedrag en rest is de bescherming.
- Een eigen boekhoudscherm (inkomsten en uitgaven per post, per week): te groot; het dagrapport en de tegels geven het dagelijkse inzicht.
- Het perceel van een medespeler-claim of hostwissel bij de nieuwe meldingen: ze zijn lokaal, er is geen nieuwe netwerkgegeven.
- De trekkertrek en het stilvallen van machines (zie BEZIT-STAND-22-11.md): inhoud, geen verfijning.

## Alleen in beeld of met een echte speler te bekijken (label `hertest`)

- Past de dagrapport-regel op de meldingsbalk (lengte bij vijf posten) en is de toon niet te druk bij elke speldag? Overweeg een drempel als spelers er genoeg van krijgen.
- De bevestigingsregels in de lijsten (`bd-zeker`) met de langere tekst "Je houdt X over" op een smal scherm.
- De tegel "Loon per dag" in de rij tegels, en de uitleg bij een wagen die thuis staat, op 1080p en klein.
- Of het uitbetalen van de kudde bij perceelverkoop als eerlijk voelt (hij valt onder dezelfde 70% als Vee verkopen).
