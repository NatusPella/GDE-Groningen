# Verhaalbijbel deel 1: verhaal en personages (28-11, #1357)

Eerste deel van de verhaalbijbel voor het uitgebreide verhaal (40 tot 80 uur). Besluiten van de eigenaar: [issue #1357](https://github.com/NatusPella/GDE-Groningen/issues/1357) met alle comments. Dit deel schrijft het *wat*: toon, personages, de doorlopende lijn, de relatie en wat er van het huidige verhaal blijft. Latere delen werken de loopbanen, de wereld en de uitvoering uit. Code komt pas daarna.

**Gezag van dit document.** De data in `game/js/characterdossiers*.js` (schema in [PERSONAGES-DOSSIERS-21-11.md](../../PERSONAGES-DOSSIERS-21-11.md)), `storycast.js` (looks) en `storyarc_nieuw.js` (stappen) is de huidige stand van de code. Dit document is het **voorstel voor de nieuwe stand**; waar het afwijkt van de code staat dat bij het personage ("Afwijkt van de code") of in de tabel van §6. Na goedkeuring trekt de bouwronde de dossiers gelijk aan deze bijbel, zodat de bijbel de enige bron is. Wat canon is (eigenaar) en wat voorstel (agent) staat erbij: **[canon]** of **[voorstel]**.

Opbouw: 1 logline en toon, 2 personages, 3 begrijpelijkheid (regels), 4 de verhaallijn in hoofdstukken, 5 de relatieboog, 6 het huidige verhaal in de nieuwe lijn, 7 motieven en geplante zaadjes, 8 open vragen. De begrijpelijkheid heeft een eigen sectie (3) omdat zij de lijn en de tabel toetst; de eigenaar vroeg daar later om.

---

## 1. Logline en toon

**Logline.** Twee net afgestudeerde vrienden uit Groningen weten niet wat ze willen worden, maar wel dat ze elkaar niet kwijt willen. Over één zomer proberen ze alles: de boerderij van een oom, een dorpsvoetbalclub, een taxidienst, een rondvaartboot. Ondertussen krijgen ze brieven van een bureaucratische Friese snackbaron, met kenmerken en bezwaartermijnen. Pas als alles wat ze leerden samenkomt, bouwen ze iets wat alleen zij kunnen: een snackwagen met een eigen standplaats. **[voorstel, op canon van 21-11 en 28-11]**

**Wat het verhaal is.** Een plekje in de wereld vinden, niet een frietwagen kopen. De snackwagen *Tam & Tes* is het slotstuk waarin elke loopbaan, elke bijfiguur en elk plaatsje terugkomt (canon 21-11 en 28-11). De speler moet na 40 uur voelen: Groningen is mijn stad, ik heb echt iets opgebouwd, ik ken en hou van Tammo en Tessa, en er is altijd nog iets te doen.

**Toon [canon].**
- **Komisch met hart.** De humor zit vooral in de dialoog en de bijfiguren; de missies zelf mogen serieuzer zijn.
- **Triomfantelijk, warm slot.** Het eind wint niet door geweld en niet door geld, maar door mensen die terugkomen om te helpen, en door Jelles eigen regels.
- **Vooral ontspannen.** Geen tijdsdruk die straft; de wereld wacht. Een mislukte missie probeer je gewoon opnieuw.
- **Droog Gronings understatement** ("Kon minder."), **bureaucratische absurditeit** (formulier 14-B, een bezwaartermijn van zes weken die over drie dagen afloopt), **situatiekomedie tussen Tammo en Tessa**, **parodie op echte plekken met verzonnen namen**.
- **Satire, geen leed** (constitution 6). Een overlijden (Oom Hindrik) gebeurt rustig, buiten beeld, en is een begin, geen drama.
- **Altijd zomer** (constitution 3): dus geen Elfstedentocht-grappen over Friesland en geen natuurijs, ook niet in Jelles plagerijen.

**Titel.** Slogan: *Een zomer in Grunn. Kon minder.* (23-11). De werktitel *Alles voor één eierbal* blijft tot de eigenaar iets anders kiest (open vraag 9).

---

## 2. Personages

Elk blad volgt de velden van de castingkaart (`characterdossiers_base.js`): leeftijd en uiterlijk, vaste kleding en variaties, persoonlijkheid en spreekstijl, wonen, werk, relaties, motief, wat ze weten en wanneer ze eerst voorkomen, model- en stemrichting. De stem is een Gemini-stem (`scripts/tts_cast.mjs`, `scripts/tts_lines_list.mjs`); het model komt van het modulaire mensensysteem (Quaternius-basis, `modularpeople.js`, `models3d_people.js`), de kleding uit `clothingdata.js` (twaalf slots, sets, rolpools; zie `docs/KLEDING-21-11.md`).

### 2.0 Huisregels voor alle figuren

- **Eén vaste basislook per figuur** (silhouet en kleurvlak, zoals Jelles blauwe colbert) die in elke scène, op de kaart en in het telefoonportret hetzelfde is. Variaties zijn **gelaagd** (jas, pet, werkkleding), nooit een totaal ander uiterlijk. Een speler herkent een figuur in twee seconden en op afstand.
- **Tammo en Tessa wisselen per situatie** (sets in `outfitByAct`); bijfiguren houden hun look (`vast:`), met hooguit een zomer- en een werkvariant.
- **Kleur is taal:** Jelles koningsblauw en pompeblêd-rood horen bij Jelle en Friesland; Tessa's rood bij Tessa; Tammo's blauw met oranje pet bij Tammo. Geen ander figuur draagt die combinaties groot.
- **Dialectniveau:** 0 = standaard Nederlands, 1 = een enkel Gronings woord, 2 = Gronings in doses, 3 = plat Gronings, F1 = Nederlands met Friese woorden, F2 = Fries-getint. Fries en Gronings met zorg, altijd Nederlandse ondertitel (`subtitles.js`); "Grunn", nooit "de Grunn".
- **Namen en merken** zijn verzonnen (constitution 2); echte plaatsen en gebouwen (Euroborg, UMCG, Martinitoren) mogen decor zijn.

### 2.1 Hoofdfiguren

#### Tammo Wierenga (`tammo`) [canon: basis; voorstel: uitwerking]

| Veld | Inhoud |
|---|---|
| Leeftijd | 24, net afgestudeerd. |
| Uiterlijk | Gemiddeld lang, slank, donker kort haar, stoppels, een zoekende blik. Beweegt rustig, handen in de zakken als hij niet weet wat te zeggen. **[voorstel]** Een litteken boven zijn wenkbrauw van de keer dat hij tegen een duif aanliep (running gag, nooit uitgelegd). |
| Vaste kleding | Blauw jack of shirt, **oranje pet**, jeans, ecru gympen (`tammo:stadjer`). Silhouet: blauw met oranje pet. |
| Variaties | `tammo:boer` op het erf (laarzen); chauffeursvest bij vervoer; schippersjas op het water; `tammo:groenwit` alleen als hij meespeelt; `tammo:incognito` voor de kraak; een nette overhemd met de pet in zijn zak voor het feest (H16). De pet gaat alleen af in de stille scène. |
| Persoonlijkheid | Droog, onhandig-lief, eigenwijs en vaak fout, precies, loyaal. Hij zegt het niet, maar doet het (het horloge van zijn opa). Het gezicht van het duo: kent de buurt, praat met iedereen, onthoudt namen. |
| Spreekstijl | Korte droge zinnen, meestal vijf woorden of minder (nooit meer dan acht in nieuwe regels); langer alleen in drie grote momenten. Gronings in kleine doses (*moi*, *kon minder*, *nait soezen*), niveau 2; Fries alleen "beppe". Tics: "Kon minder." / "Ik zeg niks. Dat is ook een antwoord." / "Dat bedoelde ik ook." na een fout; praat tegen zijn auto; noemt gebouwen bij een bijnaam. |
| Wonen | Elfde verdieping van de woontoren aan de Pleiadenlaan in Paddepoel (garage en helidek: de parodie), sinds 14 augustus met Tessa; daarvoor het laatste studentenhuis in de Oosterparkwijk, waar hij vandaan komt. |
| Werk / loopbaan | Werkloos, net afgestudeerd. **Sterk:** rijden en alles op wielen (taxi, bus, trein, vracht, race), mensen en praten (horeca-voorkant, het luik). **Zwak:** administratie en plannen (Tessa). Zijn eigen plek: stuurman en gezicht van Tam & Tes. |
| Relaties | Tessa (beste vriend, stiekem meer, §5); Oma Trijntje (vaders moeder, mentor); Beppe (moeders moeder, Fries); Rikus (jeugdvriend); opa (overleden, 1953, huilde nooit behalve toen); ouders Gerrit en Anke (alleen genoemd). |
| Motief | Niet kwijtraken wat hij heeft: Tessa, de stad, de mensen. Hij vreest dat "iets worden" betekent dat hij weg moet uit Grunn. Boog: hij vindt een plek die *in* Grunn en de provincie ligt. |
| Weet en wanneer | Kent de stad en de eierbal van 1953 (via opa en Oma), en de oude vrienden van zijn opa (Bert, Berend). Eerst: H1. |
| Model en stem | Modulair basismodel, donker haar, stoppels. Stem **Orus**, droog en deadpan (de stemtag in de code zegt "dertig": laten staan voor de bestaande clips). |
| Afwijkt van de code | Niet. Voorstel erbij: litteken, chauffeursvest en schippersjas als extra outfits. |

#### Tessa Mulder (`anita`) [canon: basis; voorstel: uitwerking]

| Veld | Inhoud |
|---|---|
| Leeftijd | 24, net afgestudeerd. |
| Uiterlijk | Iets kleiner dan Tammo, lang zwart haar (in een staart als ze werkt), alerte ogen, snelle bewegingen; kijkt in een ruimte eerst naar de uitgang. |
| Vaste kleding | **Rode jas of rood shirt**, donkere broek, laarzen (`anita:classic`). Silhouet: de rode jas. |
| Variaties | `anita:wadloper` op het Hogeland; werkoverall met rode zakdoek op het erf; `anita:groenwit` en keepers- of spitsschoenen bij voetbal; `anita:pastel` in de nazomer; een gele regenjas alleen op de rondvaartboot; een nette rode blouse voor het feest. |
| Persoonlijkheid | Snel en ad rem, **de slimme leider** van het duo, betweterig bij regels, praktisch met boerennuchterheid, geeft niet op. Ze leest elke brief en regelt alles voor het gevraagd wordt. Ze is bang nergens te blijven. |
| Spreekstijl | **Standaard Nederlands** (niveau 0, besluit #134); een Gronings woord is een grap over haar. Snel, onderbreekt Tammo, retorische vragen, bevelen. Tics: "Tammo. Tám-mo." / "Rijden, niet praten." / "Dat regel ik wel even." / snackcijfers; ze imiteert Jelle slecht. |
| Wonen | Dezelfde flat (zij huurde hem). **[voorstel]** Opgegroeid in een pachtersgezin dat zeven keer verhuisde, telkens naar een andere boerderij op het platteland (verzoent "boerendochter" met "nooit langer dan een paar jaar ergens"); haar ouders wonen nu op een pachterserf bij Siddeburen; elke zomer logeerde ze naast Mem in Ljouwert. |
| Werk / loopbaan | Werkloos, net afgestudeerd. **Sterk:** boerderij en dieren, regels lezen en plannen, voetbal (spits van een dorpsteam), leiding geven. **Zwak:** achterover leunen, erop vertrouwen dat iets vanzelf goed komt. Haar eigen plek: de slimme leider, kok en menu-eigenaar van het bedrijf. |
| Relaties | Tammo (§5); Beppe (klikt over koeien); Mem (appt haar stiekem); haar ouders en zusje Lieke (10); Femke (vriendin); Rikus (via Tammo). |
| Motief | Een thuis dat blijft ("een thuis met wielen"). Ze weet niet waar ze hoort en durft niet te zeggen dat Tammo erbij hoort. |
| Weet en wanneer | Alles van boerderijen; kent Friesland, maar in H1 alleen als bijzin ("ik ken Friezen"). Appt sinds H11 stiekem met Mem. Eerst: H1. |
| Model en stem | Modulair basismodel, lang zwart haar. Stem **Callirrhoe**, lacherig en ad rem. |
| Afwijkt van de code | Dossier: *"de frietwagen is tot akte 5 een tekening op een bierviltje"*; bijbel: de wagen komt in H15 (§6, M00). Dossier noemt het ouderlijk erf "een dorp op de klei (bewust vaag)", J3 zet het bij Siddeburen: bijbel volgt J3. |

#### Beppe, Hinke Wiersma (`beppe`) [canon: oma van Tammo; voorstel: ze leeft door]

| Veld | Inhoud |
|---|---|
| Leeftijd | 88. |
| Uiterlijk | Klein, wit haar in een knotje, zachte rimpels, een soeplepel in de hand. Weinig bewegingen, veel kijken. |
| Vaste kleding | Schort met een bloemetje en wollen vest (gedempt groen of paars). Variaties: jas in de tuin, zondagse blouse op het feest (H16). |
| Persoonlijkheid | Zacht, nuchter, gul. Ze ziet Tessa meteen en zegt dat Tammo en zij "vrienden" zijn, op een toon die het tegendeel zegt. Weinig woorden. |
| Spreekstijl | Fries-getint Nederlands (F2), kort en zacht, Nederlandse ondertitel. Tics: "Goed ite!" / "Jonge, hast al iten?" / "Dan meitsje ik sop." |
| Wonen | Huis met tuin, vogelhuisje en duiven net over de grens bij Kollum (Fryslân), aan de westgrens; het laatste bankje van Grunn met haar koperen plaatje staat vlakbij. Moeder van Tammo's moeder Anke. |
| Werk | Gepensioneerd; tuin, vogels, duiven, soep. |
| Relaties | Tammo (Friese oma, moederskant); Tessa (ziet als eerste wat er is); Oma Trijntje (de andere oma; ze ontmoeten elkaar in H16, F3); Tante Aaltje (haar dochter, **[voorstel]**); Mem (leeftijdgenote, kent haar van de markt in Ljouwert, **[voorstel]**). |
| Motief | Dat Tammo eet en niet alleen is; dat hij zichzelf vindt zonder dat zij het zegt. |
| Weet en wanneer | Alles wat in het gezin gebeurt. Eerst: H1 (de soeprit). |
| Model en stem | Modulair oud, klein, wit haar met knot. **Stem nieuw** (zacht, oud, Fries-getint). |
| Afwijkt van de code | **Groot.** Code en `BEPPE-HUIS-21-11.md`: Beppe overlijdt na M06 en wordt een herinneringsplek (kaars, foto, lege stoel); ze heeft geen stem; J6 laat haar op bezoek komen nadat ze dood is (tegenstrijdig). Bijbel: ze leeft door tot en met het feest, krijgt een stem, en het overlijden gaat naar Oom Hindrik. De herinneringsfase blijft als bestand bestaan, maar opent niet in dit verhaal. Open vraag 2. |

#### Jelle Terpstra (`jelle`) [canon: motief en toon; voorstel: werkwijze]

| Veld | Inhoud |
|---|---|
| Leeftijd | 36. |
| Uiterlijk | Lang, rechtop, blonde kuif en snor, **zonnebril dag en nacht**, koningsblauw colbert, wit overhemd, crème broek, **pompeblêd-rode sjaal** (`JELLE_LOOK`, vast). |
| Vaste kleding | Altijd dezelfde look. Variaties zijn accessoires: een bril met gouden rand voor documenten, een stempel in de borstzak, het Friese vaandel als ceintuur op feestdagen. De zonnebril gaat af in één scène (H16, voor zijn oma). |
| Persoonlijkheid | Ijdel, charmant, **bureaucratisch**, nooit echt gemeen. Wil **groot en stoer lijken voor zijn oma Mem**, die ooit een prijs niet won (de Noordelijke Snackprijs van 1953, die Oma Trijntje won). Wil **bewijzen dat hij en Friesland beter zijn dan Groningen**, maar het is plaagrivaliteit: een goedmoedig duel dat alleen hij te ver drijft. Regels beschermen hem tegen verliezen. |
| Spreekstijl | Plechtig, reclame voor zichzelf, bureaucratisch (kenmerken, artikelnummers, bezwaartermijnen). Nederlands met Friese woorden (F1; *moai*, *tige tank*, *oant sjen*, *wis en wrachtich*); hooguit één volledig Friese zin per scène, ondertiteld. Tics: "Tige tank! – J." onder elk briefje; derde persoon als hij trots is; noemt handlangers bij de verkeerde naam; elke brief eindigt met "Bezwaar: zes weken. Helaas drie dagen." |
| Wonen | Statige stelpboerderij bij Ljouwert, drie straten van zijn oma; kantoor in Grunn (Us Mem Snacks). |
| Werk | Snackbaron van *Us Mem Snacks*, voorzitter van de verzonnen **Commissie Standplaatsen Noord** (**[voorstel]**) die vergunt en weigert. Wapen: papier. |
| Relaties | Mem (zijn oma, zijn reden); Durk en Douwe (tweeling-handlangers); zijn moeder (onbenoemd, zonder stem, wil omzet); Tammo en Tessa (zijn "dossier"). |
| Motief | Mem de erkenning geven die zij in 1953 miste en bewijzen dat Friesland wint. Wat hij niet ziet: Mem wil dat niet. |
| Weet en wanneer | **Vóór het slot vooral hoorbaar, zelden in beeld [canon]:** brieven, vergunningen, omroepen (de Stadsomroeper leest zijn besluiten voor), de radioreclame van Us Mem Snacks. Zijn gezicht zien we drie keer: een zwarte trekker-limo die voorbijrijdt zonder gezicht (H5), een korte ontmoeting op de kermis (H13) en het slot (H16). Eerst *genoemd* H1 (Berend: een Fries met een klomp), *gelezen* H2 (de eerste brief). |
| Model en stem | `JELLE_LOOK`; stem **Fenrir** (bestaand). |
| Afwijkt van de code | Code: Jelle is in M03 en M10 al in persoon in beeld. Bijbel: stem eerst, gezicht laat (§6). De Commissie Standplaatsen Noord en de bezwaartermijn-grap zijn nieuw. |

#### Mem, Gerda Terpstra (`mem`) [canon: Jelles oma; voorstel: rol in het slot]

91. Marineblauwe jas met witte kraag, bril, grijze knot, pompeblêd-rode sjaal (`MEM_LOOK`, vast; geen variaties). Warm, stellig, samenzweerderig, eerlijk, nooit gemeen: haar eierbal won in 1953 net niet en ze vindt het inmiddels best; ze wil dat haar kleinzoon ophoudt. Nederlands met Friese woorden (F1; *famke*, *jonge*, *net fertelle*), ondertiteld. Tics: "Sjochst? Dat wie alles wat ik woe." / "Priuw, jonge." / appt Tessa "Pas op dysels, famke. – M." Woont in een rijtjeshuis in Ljouwert. Relaties: Jelle, Oma Trijntje (de winnares van 1953; ze eindigen als twee oude vriendinnen), Tessa (de zomers naast haar). Hoorbaar vanaf H11 (stille appjes), in beeld H14. Stem **Gacrux**. Afwijkt van de code: niet; **voorstel:** haar 1953-aanvraag wordt in H16 door Jelles eigen verordening de reden dat zij en Oma Trijntje de standplaats delen (§4, H16).

#### Oma Trijntje, Trijntje Wierenga-Boelens (`trijntje`) [canon]

92, vaders moeder van Tammo. Grijs haar, ouderwetse schort of vest, handen vol bloem, rechtop met een vaste blik (`vast: oma-kleding`). Warm, stellig, trots op één zin, ziet alles. Plat Gronings (niveau 3) in korte stellige zinnen: "Die bal is gien geld, jong. Die bal is Grunn." / "Ik ben Gronings. Wij zeggen het één keer. Dan is het waar." / "Niet tegen haar." Woont in een benedenwoning in de Oosterparkwijk met een kleine keuken vol potten; de logeerkamer en het prikbord bij de Noorderhaven (N8). Weet het recept van 1953 (vet, eieren, zout, meel, mosterd: vijf vrienden, vijf ingrediënten). Stem **Sulafat**. Eerst genoemd H1, in beeld **H3** (N8, de avond bij Oma). Afwijkt van de code: eerste stap in code is M07/M08; bijbel eerder, zodat 1953 en het recept bekend zijn vóór de bal-lijn.

#### Rikus Haverkamp (`rikus`) [canon]

25, Tammo's jeugdvriend uit het Oosterpark, nacht-dj en verteller van Radio Nachtstreek (zijn eerste baan). Groen jack, stoppelbaard, dik montuur, koptelefoon, een buikje van de nachtdiensten (`RIKUS_LOOK`). Warm, droog, trouw, weet alles en zegt niks behalve op de radio. Radio-Nederlands met Gronings in doses (niveau 2), plechtig begin, droge afsluiter ("Moi, hier is Rikus, op Nachtstreek." / "Welterusten, Grunn."). Bovenwoning in de Oosterparkwijk. Stem **Schedar**. Eerst H1, als hoorbaar personage; **radio en telefoon introduceren nooit iemand anders** (schrijfregel 1): een personage in beeld kondigt aan, Rikus bevestigt hooguit. Afwijkt van de code: niet.

### 2.2 Bijfiguren

Eerst de vijf eerste bijfiguren die de eigenaar noemde (Beppe staat hierboven; buur, ouder familielid, rivaal, stadsfiguur hieronder), daarna de overige cast compact. "Eerst" verwijst naar hoofdstuk H1 tot en met H16 (§4). **Eén nieuwe bijfiguur per verhaalstap** staat per stap in de tabellen van §4. Wat een figuur weet, weet de speler pas als hij ermee in een scène stond.

**Auke Veldkamp, de buur** (`buurman`, 71) **[canon: buur; naam bestaat]**
- *Uiterlijk en kleding:* grijs haar, vest, duif op de schouder (`vast: huisvest`); zomer: mouwen opgestroopt.
- *Karakter en spreekstijl:* wijs, weinig woorden, vriendelijk; Gronings getint (niveau 1 tot 2); eindigt zinnen met "Zo." Hij mist steeds het moment waarop er iets groots gebeurt. Zijn duiven vliegen naar Tammo en niet naar hem (onverklaard, nooit uitgelegd).
- *Wonen en werk:* de gang op de elfde verdieping naast Tammo en Tessa, duivenhok op het balkon; gepensioneerd. *Relaties:* kent Bert (duiven, vriend van Tammo's opa). *Motief:* iemand om voor te zorgen; hij ziet als eerste dat ze "samen" zijn.
- *Eerst:* H2 (een duif op de gang). *Model/stem:* modulair oud, vest; stem nog te kiezen (oude, zachte man).

**Sander Poelman, de rivaal uit de straat** (nieuw, 27) **[voorstel]**
- *Uiterlijk en kleding:* gelijkmatig kapsel, gladde baard, **een neon-oranje gilet met "ZOEF" op de rug** (verzonnen deelscooterbedrijf), witte sneakers, een tablet onder de arm. Silhouet: het neon gilet (Tammo's pet is gedempt oranje: het onderscheid is bewust).
- *Karakter en spreekstijl:* competitief, vlot, zelfverzekerd; Nederlands met start-up-woorden, niveau 0; elke zin eindigt als vraag ("…toch?"). Zet zijn scooters altijd op de stoep voor hun portiek.
- *Wonen en werk:* nieuwbouwflat aan de overkant van de Pleiadenlaan; eigenaar van ZOEF, later een bezorgdienst. *Relaties:* plaagrivaliteit met Tammo (wie rijdt beter, wie heeft de grootste wagen). *Motief:* de eerste zijn die iets ontwikkelt wat Groningen "nodig heeft"; wordt klant en bijna-vriend (de eerste bestelling bij Tam & Tes).
- *Eerst:* H2. *Model/stem:* modulair jong, neon gilet; stem nieuw (jonge, snelle man, praat in vragen).

**Omroeper Hayo Prins, het stadsfiguur** (nieuw, 58) **[voorstel]**
- *Uiterlijk en kleding:* breed, rood gezicht, rood-witte omroepersjas met gouden knopen, driekantige hoed, **koperen bel**.
- *Karakter en spreekstijl:* plechtig, trots op zijn ambt, leest voor wat er door zijn bus komt zonder te oordelen, ook Jelles besluiten. Gronings (niveau 2): "Hoort, hoort! Bij besluit veertien-B…" Hij slaat de laatste regel (de bezwaartermijn) over omdat hij moet hoesten.
- *Wonen en werk:* een kamer boven de Vismarkt-poort; stadsomroeper (verzonnen eeuwenoud ambt), verkoopt 's middags kranten. *Relaties:* de Torenwachter (oude rivaal: de wachter meldt, hij roept om), Jelle (opdrachtgever, ongewild). *Motief:* dat de stad nog luistert. **Jelle krijgt via hem een mond zonder in beeld te zijn.**
- *Eerst:* H3 (de Grote Markt). *Model/stem:* modulair, breed, omroepersjas; stem nieuw (luide, plechtige oude man).

**Oom Hindrik de Jong** (`boer_hindrik`, 74; cameo wordt bijfiguur) **[voorstel; boer = erfenis van een oom, canon]**
- *Uiterlijk en kleding:* pet, ruitoverhemd, laarzen, leunt tegen een hek (`vast: boerenkleding`).
- *Karakter en spreekstijl:* stellig, samenzweerderig, serieus; plat Gronings (niveau 3): "Doar achter is niks meer, mien jong." (de dijk).
- *Wonen en werk:* hoeve **Zeldenrust** aan de Waddenkust op het Hogeland tussen Warffum en Usquert ("aan de rand van de provincie"); 40 koeien en wat akkerbouw. *Relatie:* Oma Trijntje's schoonbroer (man van haar overleden zus), voor Tammo "Oom Hindrik"; kende opa uit 1953. *Motief:* dat het land blijft werken.
- *Eerst:* H4 (het bezoek, twee scènes), overlijdt rustig buiten beeld bij de overgang naar H5. *Model/stem:* modulair oud, pet; stem **Enceladus** (bestaand).
- *Afwijkt van de code:* dossier: cameo zonder verhaalstap; hier de oom van de erfenis.

**Tante Aaltje** (`tante_aaltje`, 55; genoemd wordt bijfiguur) **[voorstel]**
- *Uiterlijk en kleding:* verpleegstersuniform in de dienst, daarbuiten een gedempt violet vest; kort grijzend haar, leesbril aan een koordje, een map met "ZEKER" erop.
- *Karakter en spreekstijl:* zorgzaam, rustig, administratief; Fries-getint Nederlands (F2), korte volzinnen; onderstreept alles twee keer.
- *Wonen en werk:* huis in Kollum, tien minuten van Beppe; verpleegkundige; verzorgde Oom Hindrik thuis en is zijn executeur. *Relaties:* Beppe (haar moeder), Anke (haar zus), Tammo (neef). *Motief:* dat de boerderij naar de goede handen gaat. **Zij zet de erfenis klaar.**
- *Eerst:* H4 (op de hoeve), actief H5. *Model/stem:* modulair middelbaar, violet vest; stem nieuw (rustige vrouw, licht Fries). Nu alleen tekst.

#### Overige cast, compact

Stemmen zonder naam zijn nieuw te kiezen (alle 30 Gemini-stemmen zijn al in gebruik; bij hergebruik onderscheiden stemtag en accent).

| Naam (id), leeftijd, wonen | Uiterlijk en kleding | Karakter, spreekstijl | Rol, motief, eerst | Model/stem; afwijking |
|---|---|---|---|---|
| **Berend Bos** (`berend`), 72, Schildersbuurt | Kaal, grijze snor, tweed pet, bruin jack | Nors, "Goidag"; "Je kijkt vaker naar die telefoon dan naar de weg." | Bommen Berend, jurylid, bakkie; eerst **H1** (M01) | **Charon**. Geen |
| **Sjabbe Kamminga** (`sjabbe`), 58, centrum | Vest met veel zakken, bril op het voorhoofd | Droog, "Ik vraag niks. Ik zeg alleen:…" | Pandhouder, telefoonstem; eerst **H1** (N1); neemt Tammo's horloge in pand (H15) | **Rasalgethi**. Geen |
| **Bert Hoekstra** (`bert`), 79, Stationsplein | Gele regenjas, pet met duiveveertje | Zacht, wijs | Opa's beste vriend, duivenmelker; eerst **H3** | **Iapetus**. Code: M03; bijbel H3 |
| **Henk Pol** (`henk`), 66, Haren-kant | Blauwe monteursoverall, vettige pet, koekje in de zak | "Ik zeg niks. Eén koekje." | Bouwt het luik (H15); genoemd H8, in beeld **H12** | **Sadaltager**. Geen |
| **Geesje Tuinstra** (`geesje`), 84, Warffum | Mantelpak, parelketting, schort bij de eieren | Warm, nuchter | Eieren, Oma's schoolvriendin; **H4** | **Pulcherrima**. Geen |
| **Kapitein Klaas Brouwer** (`klaas`), 71, Zoutkamp | Visserstrui, gele laarzen | Droog: "Tot de sluis. Daarna ben je voor eigen rekening." | Schipper, mentor water; **H4** (hengels) | **Enceladus**. Dossier: Noorderhaven; bijbel: Zoutkamp |
| **Wiebe Hazenberg** (`wiebe`), 58, Diepenring | Schippersjas, rode muts, megafoon | Boos, luid, tegeltjeswijsheden (niveau 3) | **De schipper die wegvalt** (heup, na struikelen over zijn eigen megafoon); hoorbaar **H3**, aanleiding **H8**; bezit rondvaartboot en vrachtschip | **Alnilam**. Code: zonder verhaalstap |
| **Lammert Veenstra** (`schipper_lammert`), 69, woonboot Starkenborghkanaal | Schippersmuts, trui | Droog, vertellend | Binnenvaartmentor (tweede spoor); **H8** | **Iapetus**. Cameo wordt bijfiguur; niet verwarren met havenmeester Visser |
| **Lammert Visser** (`lammert`), 66, Eemshaven | Fluohesje, helm | Kort, ironisch: "De kraan piept." | Havenmeester; **H13** | **Iapetus** (gedeeld; Visser zakelijk, Veenstra vertellend) |
| **Dokter Pieter Dijkstra** (`dijkstra`), 52, UMCG-kant | Heli-overall, zonnebril | Rustig, "Eerst eten, dan reddingen." | Lucht (heli); **H9** | **Sadachbia**. Geen |
| **Roelfien Hofman** (`roelfien`), 58, Oldambt | Pilotenjack over de overall | Vrolijk, praktisch | Spandoekvlieger, Oma's nicht; **H9** | **Laomedeia**. Geen |
| **Wubbo Zijlstra** (`wubbo`), 61, Veendam | Blauwe overall, gele pet, fluitje | Rustig | Elf bruggen; **H14** | **Sadaltager**. Geen |
| **Tinus Kloosterman** (`tinus`), 64, Westerkwartier | Modderlaarzen, camouflagejack | Joviaal | Schuur voor het luik; **H15** | **Enceladus**. Geen |
| **Femke van der Meer** (`femke`), 33, Noorderplantsoen | Gele jas, klembord, walkietalkie | Gehaast, altijd een dag te laat | Tessa's vriendin, organisator van het stadsfeest; **H10** | **Leda**. **Afwijkt:** dossier festivalmaker, spec/storyarc keeper; bijbel: festivalmaker. Open vraag 6 |
| **Marit Hoogland** (`marit`), 24, Veendam | Keepershandschoenen, trainingsjack | Energiek, droog, trouw | Keeper in de club; **H6** | Stem nieuw. Dossier bestond al |
| **Trainer Dolf Brons** (nieuw), 52, VV De Hoek | Trainingsjas, fluit, krant | Kort, gemoedelijk | Dorpsclubtrainer, invaller-aanleiding; **H6** | Stem nieuw |
| **Arie Veenhuis** (nieuw), 55, Winsum | Chauffeursvest, pet, thermosfles | Gemoedelijk, niveau 2 | **De chauffeur die wegvalt** (pols, door een padelbal); **H7** | Stem nieuw |
| **Hennie, stationschef** (nieuw), 49, Station Groningen | Stationsjas, pet, fluit | Strak, vriendelijk | Spoorspoor van vervoer; **H7** | Stem nieuw |
| **Willemien Bolt** (`willemien`), 67, Loppersum | Zomerjurk, kat | Nuchter, droog | Vaste klant, nazomer | **Aoede** |
| **Durk en Douwe Oosting**, 38, Ljouwert | Rode hoodies, beanies (blauw/wit), groot | "…Hè." | Jelles handlangers; eerst **H5** (limo), lopen over in H16 | **Algieba** / **Algenib**. Geen |
| **Mevrouw Aleida Hoving** (`bewaarder`), 81 | Zwart mantelpak, bril aan koord, medaille | Beleefd, formeel | Bewaarder, juryvoorzitter; **H12** | **Gacrux** (gedeeld met Mem; toonhoogte onderscheidt) |
| **Sjoerd Dijkman** (`sjoerd`), 26 | Koerierskleding, helm | Haastig | Fietsrace; **H3** | **Umbriel**. Geen |
| **Jacob Bruining, torenwachter** (`torenwachter`), 88 | Wachtersjas, verrekijker | "Ik meld alleen." (drie keer, dan "Ik klap.") | Stadsfiguur aan de telefoon | **Iapetus**. Geen |

### 2.3 Fries en Gronings: de plaagrivaliteit [canon]

Het is een **spel**, geen vijandschap. Groningers plagen Friezen (*pompeblêd*), Friezen plagen terug. **Alleen Jelle gaat te ver**; Mem, Beppe en Tessa (kent Friesland) zijn de redelijke stemmen. Geen echte politieke of historische wonden, geen koppeling aan echte bedrijven, geen Elfsteden of winterbeeld. Fries blijft kort, ondertiteld, en altijd met zorg.
