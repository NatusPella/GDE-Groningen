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
- **Nooit echt falen [canon].** Elke missie is te redden, of falen reageert komisch en het verhaal gaat door (de bestaande falen-regels, bijvoorbeeld bij Klaas: "Terug naar Klaas, nog een keer.", blijven de maat).
- **Satire, geen leed** (constitution 6). De overlijdens (Oom Hindrik als begin van de boerenloopbaan, Beppe aan het eind) gebeuren rustig en zonder getoond leed.
- **Altijd zomer** (constitution 3): dus geen Elfstedentocht-grappen over Friesland en geen natuurijs, ook niet in Jelles plagerijen.

**Titel [canon: *Alles voor één eierbal* vervalt].** De eerste oogst voor een nieuwe titel (Nederlands, met een Gronings tintje met zorg, geen echte merken); de slogan *Een zomer in Grunn. Kon minder.* (23-11) blijft de slogan. Vijf voorstellen:
1. ***Een zomer in Grunn*:** de slogan zelf; warm en simpel, precies wat het spel belooft (aanbevolen).
2. ***Kon minder*:** Tammo's tegeltje en het hoogste compliment van de complimentenladder; droog, Gronings, en het eindigt in de stille scène.
3. ***Woist ja wel*:** "Je weet het wel", de zin van Tammo's opa; stil en ontroerend, past bij het relatiegevoel en Beppe's hints.
4. ***Bezwaar: zes weken*:** de bureaucratische grap als titel; komisch en herkenbaar, minder warm.
5. ***Tam & Tes*:** de naam van de wagen en van hen beiden; kort, maar verklapt het slot (de wagen komt pas laat; de eigenaar wilde die niet prominent).
`ARC_ID` blijft `'nieuw'` zodat saves niet breken; de spelnaam *GDE Groningen – Zomer vol misdaad* blijft los van de verhaaltitel.

---

## 2. Personages

Elk blad volgt de velden van de castingkaart (`characterdossiers_base.js`): leeftijd en uiterlijk, vaste kleding en variaties, persoonlijkheid en spreekstijl, wonen, werk, relaties, motief, wat ze weten en wanneer ze eerst voorkomen, model- en stemrichting. De stem is een Gemini-stem (`scripts/tts_cast.mjs`, `scripts/tts_lines_list.mjs`); het model komt van het modulaire mensensysteem (Quaternius-basis, `modularpeople.js`, `models3d_people.js`), de kleding uit `clothingdata.js` (twaalf slots, sets, rolpools; zie `docs/KLEDING-21-11.md`).

### 2.0 Huisregels voor alle figuren

- **Eén vaste basislook per figuur** (silhouet en kleurvlak, zoals Jelles blauwe colbert) die in elke scène, op de kaart en in het telefoonportret hetzelfde is. Variaties zijn **gelaagd** (jas, pet, werkkleding), nooit een totaal ander uiterlijk. Een speler herkent een figuur in twee seconden en op afstand.
- **De kleding van de speler is altijd vrij [canon]:** de cutscenes tonen wat de speler draagt. De consistente stijl in de bladen geldt voor **alle andere personages** en voor **Tammo en Tessa zoals ze als NPC verschijnen** (de metgezel, of de rol die de speler niet speelt). Tammo's en Tessa's sets in `outfitByAct` zijn dus de NPC-kleding; wat hier bij hen "variaties" heet, zijn voorstellen voor die NPC-kant en nooit een dwang voor de speler (ook niet `incognito` bij de kraak: de scène zegt "in het zwart" alleen als de speler dat draagt).
- **Per scène staat vast wie de speler is en wie NPC** (§4.7): het veld `speler` op de scène (Tammo, Tessa of beide) bepaalt welke kant de kleding van de speler krijgt en welke de vaste NPC-set.
- **Bijfiguren houden hun look** (`vast:`), met hooguit een zomer- en een werkvariant.
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
| Relaties | Tessa (beste vriend, stiekem meer, §5); Beppe (**zijn** oma, moeders moeder, Fries); Oma Trijntje (**Tessa's** oma, maar voor de hele straat "Oma"; Tammo kent haar van kind af uit de buurt, mentor); Rikus (jeugdvriend); opa (overleden, 1953, huilde nooit behalve toen); ouders Gerrit en Anke (alleen genoemd). |
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
| Relaties | Tammo (§5); Beppe (klikt over koeien); Mem (appt haar stiekem); haar **Oma Trijntje** (Pa's moeder, 92, in de Oosterparkwijk: haar anker in de Stad; Tessa is haar kleindochter en de eerste die het recept van 1953 mag leren); ouders en zusje Lieke (10); Femke (vriendin); Rikus (via Tammo). |
| Motief | Een thuis dat blijft ("een thuis met wielen"). Ze weet niet waar ze hoort en durft niet te zeggen dat Tammo erbij hoort. |
| Weet en wanneer | Alles van boerderijen; kent Friesland, maar in H1 alleen als bijzin ("ik ken Friezen"). Appt sinds H11 stiekem met Mem. Eerst: H1. |
| Model en stem | Modulair basismodel, lang zwart haar. Stem **Callirrhoe**, lacherig en ad rem. |
| Afwijkt van de code | Dossier: *"de frietwagen is tot akte 5 een tekening op een bierviltje"*; bijbel: de wagen komt in H15 (§6, M00). Dossier noemt het ouderlijk erf "een dorp op de klei (bewust vaag)", J3 zet het bij Siddeburen: bijbel volgt J3. |

#### Beppe, Hinke Wiersma (`beppe`) [canon: oma van Tammo, warme plek, overlijdt na het slot]

| Veld | Inhoud |
|---|---|
| Leeftijd | 88. |
| Uiterlijk | Klein, wit haar in een knotje, zachte rimpels, een soeplepel in de hand. Weinig bewegingen, veel kijken. |
| Vaste kleding | Schort met een bloemetje en wollen vest (gedempt groen of paars). Variaties: jas in de tuin, zondagse blouse op het feest (H16). |
| Persoonlijkheid | Zacht, nuchter, gul. Ze ziet Tessa meteen en zegt dat Tammo en zij "vrienden" zijn, op een toon die het tegendeel zegt. Weinig woorden. **Haar huis is een warme plek waar Tammo en Tessa steeds langskomen** (soep, de tuin, de duiven, het bankje). **Zij hoopt dat Tammo en Tessa samen eindigen** en geeft Tammo steeds stiekeme hints, alleen aan hem, als Tessa het niet hoort. |
| Spreekstijl | Fries-getint Nederlands (F2), kort en zacht, Nederlandse ondertitel. Tics: "Goed ite!" / "Jonge, hast al iten?" / "Dan meitsje ik sop." **Eigen stem [voorstel]:** ze praat in kleine, zachte zinnen, vraagt meer dan ze vertelt ("En jij, jonge, wat wil jíj?"), herhaalt wat de ander zei als troost ("Het was zwaar, ja."), en noemt Tessa heel even "dyn famke" (je meisje) tegen Tammo, om het meteen te laten zakken. Ze troost met eten, nooit met raad; haar grappen zijn dun en laat ("Ik ben achtentachtig, ik heb tijd."). Maximaal één Friese zin per scène, altijd ondertiteld. |
| Wonen | Huis met tuin, vogelhuisje en duiven aan de westgrens van de provincie, **net binnen de grens** aan de westrand van het Westerkwartier (het dossier zegt "net over de grens bij Kollum"; bijbel: geen vaste scènes buiten de provincie, dus haar huis ligt aan deze kant); het laatste bankje van Grunn met haar koperen plaatje staat vlakbij. Moeder van Tammo's moeder Anke. |
| Werk | Gepensioneerd; tuin, vogels, duiven, soep. |
| Relaties | Tammo (Friese oma, moederskant); Tessa (ziet als eerste wat er is); Oma Trijntje (**Tessa's** oma: twee verschillende oma's met elk een eigen stem, keuken en wereld; ze ontmoeten elkaar in H16, F3); Tante Aaltje (haar dochter, **[voorstel]**); Mem (leeftijdgenote, kent haar van de markt in Ljouwert, **[voorstel]**). |
| Motief | Dat Tammo eet en niet alleen is, en dat hij en Tessa samen eindigen: haar stille wens, waarvoor ze Tammo van achter de soeppan een zetje geeft. Ze zegt het nooit hardop tegen Tessa. |
| Hints (planten) | Alleen tegen Tammo, Tessa buiten gehoor (in de tuin, bij de auto, aan de telefoon): **H1** "Zij kijkt naar jou zoals jij naar de duiven kijkt." (Tammo: "Beppe."); **H4** "Je tante zet jullie op één bank. Ik heb het haar gevraagd."; **H5** "Zij past op een erf. Jij ook, als zij erbij is."; **H8** "Wie draagt wiens tas? Zo kan ik het ook."; **H10** "Eet ze goed? Jonge, zij eet goed." en de foto uit de eerste Kiezelweek op de plank; **H13** "Zeg het niet te laat, jonge. Ik heb tijd, maar niet eindeloos." (licht, geen drama); **H15** "Ik heb een jas gekocht. Voor een feest. Zeg het maar niet." Elke hint is een grap en een duwtje; Tammo ontkent steeds. Tessa hoort ze nooit, maar Beppe knipoogt naar haar bij het afscheid. |
| Overlijden [canon] | Beppe overlijdt **na het slot**, rustig en warm, in de nacht na het Gronings Ontzet (waarop ze was, in haar zondagse blouse, en waar ze Oma Trijntje ontmoette): geen getoond leed, een bericht van Tante Aaltje en een briefje op haar tafel. Ze wordt begraven in **Oudwoude** (Fryslân; alleen als cutscene, geen speelbaar gebied), waar Tammo en Tessa elkaars hand vasthouden zodat zij kan zien dat ze samen zijn geëindigd zoals ze altijd wilde: de kernscène van de relatieboog (§5.3). |
| Weet en wanneer | Alles wat in het gezin gebeurt; weet vóór de twee zelf dat het wederzijds is. Eerst: H1 (de soeprit); haar huis keert terug in H4, H7, H10, H13 en H15 (een vaste bezoekplek, soep eens per speeldag blijft). |
| Model en stem | Modulair oud, klein, wit haar met knot. **Stem nieuw** (zacht, oud, Fries-getint). |
| Afwijkt van de code | **Middel.** Code en `BEPPE-HUIS-21-11.md`: Beppe overlijdt al na M06 (herinneringsplek met kaars, foto, lege stoel); ze heeft geen stem; J6 laat haar op bezoek komen nadat ze dood is (tegenstrijdig). Bijbel (besluit eigenaar 28-11): ze leeft door tot het slot en is een warme plek met hints; ze krijgt een stem; **het overlijden verhuist van na M06 naar na het Ontzet** (de bestaande herinneringsfase met kaars, foto en lege stoel, het bankje en de aftitelingskaarten blijven dus kloppen, alleen later); de begrafenis in Oudwoude is nieuw en alleen een cutscene. Oom Hindrik overlijdt niet (§2.2): hij gaat naar een verzorgingshuis en de hoeve wordt een schenking; Beppe is het ene afscheid van het verhaal. |

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
| Weet en wanneer | **Vóór het slot vooral hoorbaar (brieven, vergunningen, omroepen, de radioreclame van Us Mem Snacks), maar af en toe in beeld [canon, eigenaar 28-11]:** de speler ziet en spreekt hem af en toe, in korte, duidelijke, bureaucratische en komische ontmoetingen, nog geen volledige confrontatie. Zes stuks, elk hoogstens enkele minuten: **H2** bij het Loket (hij stempelt zelf hun werkbewijs, zonnebril op, plechtig); **H5** (het raam van de trekker-limo zakt, hij overhandigt een brief "Warffum in beheer" en rijdt door); **H8** (op de kade met een klembord weigert hij een aanlegplaats, vriendelijk); **H11** (hij zit zelf achter het inschrijfloket van de Snackprijs en stempelt met een kleine zucht); **H13** (de kermis in Winschoten, met een brief in drievoud); **H16** de ontknoping. Eerst *genoemd* H1 (Berend: een Fries met een klomp), *gelezen* H2 (de eerste brief) en dan pas *gezien* (dezelfde dag). |
| Model en stem | `JELLE_LOOK`; stem **Fenrir** (bestaand). |
| Afwijkt van de code | Code: Jelle is in M03 en M10 al in persoon in beeld. Bijbel: korte ontmoetingen verspreid over de lijn (H2, H5, H8, H11, H13), geen volledige confrontatie voor H16 (§6). De Commissie Standplaatsen Noord en de bezwaartermijn-grap zijn nieuw. |

#### Mem, Gerda Terpstra (`mem`) [canon: Jelles oma; voorstel: rol in het slot]

91. Marineblauwe jas met witte kraag, bril, grijze knot, pompeblêd-rode sjaal (`MEM_LOOK`, vast; geen variaties). Warm, stellig, samenzweerderig, eerlijk, nooit gemeen: haar eierbal won in 1953 net niet en ze vindt het inmiddels best; ze wil dat haar kleinzoon ophoudt. Nederlands met Friese woorden (F1; *famke*, *jonge*, *net fertelle*), ondertiteld. Tics: "Sjochst? Dat wie alles wat ik woe." / "Priuw, jonge." / appt Tessa "Pas op dysels, famke. – M." Woont in een rijtjeshuis in Ljouwert. Relaties: Jelle, Oma Trijntje (de winnares van 1953; ze eindigen als twee oude vriendinnen), Tessa (de zomers naast haar). Hoorbaar vanaf H11 (stille appjes), in beeld H14. Stem **Gacrux**. Afwijkt van de code: niet; **voorstel:** in 1953 scoorde haar eierbal beter dan die van Oma Trijntje en kreeg ze nooit de eer; in H16 erkent Oma Trijntje dat hardop en delen de twee de standplaats (§4, H16) (§4, H16).

#### Oma Trijntje, Trijntje Mulder-Boelens (`trijntje`) [canon: Tessa's oma; achternaam voorstel]

92, **de oma van Tessa** (Pa's moeder; eigenaardig genoeg al jaren de buurvrouw uit Tammo's kindertijd: Tammo noemde haar altijd "Oma van de straat" en kreeg eierballen van haar, zonder te weten dat ze Tessa's oma was; dat ontdekken ze in de flashback van H3 en het wordt een running gag). **Zij is niet Beppe:** Beppe is Tammo's Friese oma en leeft op het platteland met soep, tuin en duiven; Oma Trijntje is Tessa's Gronings-stadse oma, heeft het recept van 1953, rechte rug, plat Gronings en een keuken vol potten. Ze zijn elkaars tegendeel in toon (zacht en vragend tegenover stellig en afdoend) en ontmoeten elkaar pas in H16. Grijs haar, ouderwetse schort of vest, handen vol bloem, rechtop met een vaste blik (`vast: oma-kleding`). Warm, stellig, trots op één zin, ziet alles. Plat Gronings (niveau 3) in korte stellige zinnen: "Die bal is gien geld, jong. Die bal is Grunn." / "Ik ben Gronings. Wij zeggen het één keer. Dan is het waar." / "Niet tegen haar." Woont in een benedenwoning in de Oosterparkwijk met een kleine keuken vol potten; de logeerkamer en het prikbord bij de Noorderhaven (N8). Weet het recept van 1953 (vet, eieren, zout, meel, mosterd: vijf vrienden, vijf ingrediënten). Stem **Sulafat**. Eerst genoemd H1, in beeld **H3** (N8, de avond bij Oma). **Afwijkt van de code:** (1) het dossier maakt haar Tammo's oma ("Trijntje Wierenga-Boelens", de krentjebrijregel) en zet haar eerste stap op M07/M08; bijbel (besluit eigenaar 28-11): Tessa's oma, achternaam Mulder-Boelens, in beeld in H3 zodat 1953 en het recept bekend zijn vóór de bal-lijn. (2) Opgenomen regels waarin Tammo "oma" zegt (M08.3, "Ik ben vierentwintig, oma.") blijven kloppen: hij noemt haar zo zoals de hele straat. (3) Het recept is **van haar** en niet van Beppe (deel 2 schrijft op één plek "Beppe (het recept)": moet Oma Trijntje zijn). Het recept wordt het hart van de snackwagen (§7).

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

**Oom Hindrik de Jong** (`boer_hindrik`, 74; cameo wordt bijfiguur) **[voorstel; boer = erfenis of schenking van een oom, canon; hij overlijdt niet]**
- *Uiterlijk en kleding:* pet, ruitoverhemd, laarzen, leunt tegen een hek (`vast: boerenkleding`).
- *Karakter en spreekstijl:* stellig, samenzweerderig, serieus; plat Gronings (niveau 3): "Doar achter is niks meer, mien jong." (de dijk).
- *Wonen en werk:* hoeve **Zeldenrust** aan de Waddenkust op het Hogeland tussen Warffum en Usquert ("aan de rand van de provincie"); 40 koeien en wat akkerbouw. *Relatie:* de man van Beppe's overleden zus Tjitske (dus Tammo's oud-oom, Beppe's zwager), een Groninger die ooit een Friezin trouwde. *Motief:* dat het land blijft werken.
- *Eerst:* H4 (het bezoek, twee scènes), gaat aan het eind van H4 met een zwaai naar **Huize Waddenzicht** (een verzonnen verzorgingshuis in Warffum) en blijft daarna bereikbaar voor een bezoek met een mand eieren en een kop thee die hij te slap vindt. *Model/stem:* modulair oud, pet; stem **Enceladus** (bestaand).
- *Afwijkt van de code:* dossier: cameo zonder verhaalstap; hier de oom van de erfenis.

**Tante Aaltje** (`tante_aaltje`, 55; genoemd wordt bijfiguur) **[voorstel]**
- *Uiterlijk en kleding:* verpleegstersuniform in de dienst, daarbuiten een gedempt violet vest; kort grijzend haar, leesbril aan een koordje, een map met "ZEKER" erop.
- *Karakter en spreekstijl:* zorgzaam, rustig, administratief; Fries-getint Nederlands (F2), korte volzinnen; onderstreept alles twee keer.
- *Wonen en werk:* woont in Kollum, net over de grens, en komt voor de erfenis naar de provincie (haar scènes spelen op de hoeve en bij de notaris in Warffum; geen vaste scènes in Friesland); verpleegkundige; verzorgde Oom Hindrik thuis en regelt zijn verhuizing naar het verzorgingshuis en de schenking van de hoeve. *Relaties:* Beppe (haar moeder), Anke (haar zus), Tammo (neef). *Motief:* dat de boerderij naar de goede handen gaat. **Zij zet de schenking klaar.**
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
| **Femke van der Meer** (`femke`), 27 (dossier 33), uit het dorp van Tessa's dorpsteam | Gele keepersjack, keepershandschoenen, een tas die altijd openstaat | Energiek, gehaast, enthousiast, een dag te laat; niveau 1 | **Keeper en vriendin van Tessa** (keuze: de scripts en de spec zeggen dit; zie hieronder): keeper bij VV De Hoek (**H6**), belt Rikus (radio), de dubbele date in Veendam (**H10**), appjes | **Leda**. **Afwijkt (keuze):** het dossier maakt haar festivalmaker (33) en laat een aparte keeper "Marit Hoogland" bestaan; bijbel: Femke is de keeper en Marit vervalt; dossier `femke` aanpassen (werk, uiterlijk, leeftijd), dossier `marit` verwijderen, spec en `storyarc_nieuw.js` hoeven niet te wijzigen (daar is ze al keeper) |
| **Meester Eppo Rozema** (nieuw), 68, VV De Hoek | Wollen vest, sjaal, een koekenpan onder de arm | Gepensioneerd onderwijzer, legt tactiek uit met suikerklontjes; niveau 2 | Trainer van de dorpsclub; invaller-aanleiding (zijn linksbuiten ligt eruit); **H6** (uit deel 2, naam gelijkgetrokken) | Stem nieuw |
| **Chauffeur Dries Oltmans** (nieuw), 63, Winsum | Chauffeursvest, pet, een eigen koffiekan | Gemoedelijk, groet iedereen, niveau 2 | **De chauffeur die wegvalt** (zere rug: niet erg, genoeg). Hij is al vanaf **H2** de vaste chauffeur van de bus naar huis, valt weg in **H7** (uit deel 2, naam gelijkgetrokken) | Stem nieuw |
| **Dispatcher Annemarie** (nieuw), 45 | Alleen een stem op de portofoon | Kort, zorgzaam, "Dries ligt op de bank." | Vervoer: de centrale; **H7** (uit deel 2) | Stem nieuw |
| **Stationschef Jochem Luiken** (nieuw), 49, Station Groningen | Stationsjas, pet, fluit | Strak, vriendelijk | Spoor van vervoer; **H7** (uit deel 2; voornaam Jochem om botsing met Dijkstra te vermijden) | Stem nieuw |
| **Willemien Bolt** (`willemien`), 67, Loppersum | Zomerjurk, kat | Nuchter, droog | Vaste klant, nazomer | **Aoede** |
| **Durk en Douwe Oosting**, 38, Ljouwert | Rode hoodies, beanies (blauw/wit), groot | "…Hè." | Jelles handlangers; eerst **H5** (limo), lopen over in H16 | **Algieba** / **Algenib**. Geen |
| **Mevrouw Aleida Hoving** (`bewaarder`), 81 | Zwart mantelpak, bril aan koord, medaille | Beleefd, formeel | Bewaarder, juryvoorzitter; **H12** | **Gacrux** (gedeeld met Mem; toonhoogte onderscheidt) |
| **Sjoerd Dijkman** (`sjoerd`), 26 | Koerierskleding, helm | Haastig | Fietsrace; **H3** | **Umbriel**. Geen |
| **Hoofdagent Hilda Wolthuis** (nieuw), 54, Politiebureau Grunn | Blauw uniform met een te groot petje dat ze steeds rechtzet, notitieboekje, een stempel | Precies, plechtig, citeert artikelnummers (de zusterziel van Jelle, maar aan de goede kant); niveau 0 met een enkel Gronings "nou ja" | Komische bijrol: schrijft een parkeerbon op de Escapade (**H2**), is "drie minuten te laat" bij het museum (H12) en leest in **H16** als enige de stukken van Jelles verordening voor; wil niets liever dan dat iedereen de regels naleeft | Stem nieuw (kordate vrouw, droog); uitbreiding van het groepsdossier `politie` |
| **Agent Joost Ensing** (nieuw), 27, fietspatrouille | Uniform met fluohesje over de jas, helm, een fietstas met koekjes | Enthousiast, verontschuldigend, "Sorry, sorry!" | Komisch: komt steeds net te laat, krijgt van Veldkamp een duif op zijn helm (**H5**); bij de kraak (**H12**) belt hij met "Ik meen het alarm gehoord te hebben" | Stem nieuw (jonge man) |
| **Wijkagent Tjeerd Bolhuis** (nieuw), 61, Paddepoel | Uniform met openstaande jas, thermosfles, slaapt in de dienstauto | Rustig, Gronings niveau 2, "Ik heb niks gezien. Ik zag het wel." | Komisch en warm: zoekt in **H10** (N9) "twee Stadjers in het zwart", herkent Tammo en Tessa en kijkt de andere kant op; houdt in H16 de route vrij | Stem nieuw (oude, rustige man) |
| **Jacob Bruining, torenwachter** (`torenwachter`), 88 | Wachtersjas, verrekijker | "Ik meld alleen." (drie keer, dan "Ik klap.") | Stadsfiguur aan de telefoon | **Iapetus**. Geen |

### 2.3 Fries en Gronings: de plaagrivaliteit [canon]

Het is een **spel**, geen vijandschap. Groningers plagen Friezen (*pompeblêd*), Friezen plagen terug. **Alleen Jelle gaat te ver**; Mem, Beppe en Tessa (kent Friesland) zijn de redelijke stemmen. Geen echte politieke of historische wonden, geen koppeling aan echte bedrijven, geen Elfsteden of winterbeeld. Fries blijft kort, ondertiteld, en altijd met zorg.

### 2.4 Twee oma's en het namenregister

**Beppe en Oma Trijntje zijn twee verschillende personages [canon, eigenaar 28-11]:** Beppe is de oma van **Tammo**, Oma Trijntje de oma van **Tessa**. Ze mogen niet samenvallen en niet verdwijnen.

| | **Beppe** (Hinke Wiersma, 88) | **Oma Trijntje** (Trijntje Mulder-Boelens, 92) |
|---|---|---|
| Oma van | Tammo (moeders moeder) | Tessa (Pa's moeder); "Oma van de straat" voor iedereen in de Oosterparkwijk, ook voor Tammo |
| Plek | Westgrens van de provincie, tuin, duiven, vogelhuisje | Benedenwoning Oosterparkwijk, keuken vol potten, later de Noorderhaven |
| Taal | Fries-getint, zacht, vragend | Plat Gronings, stellig, een regel als een spreuk |
| Gaaf voor het verhaal | Soep, zorg, een warme plek om langs te komen, ziet de relatie als eerste en geeft Tammo hints; het erf van de familie (Tante Aaltje, Oom Hindrik) | Het recept van 1953, de Snackprijs, de standplaats; het hart van de snackwagen |
| Relatie tot de ander | Ziet Tessa meteen; "Jullie zijn vrienden." | Kent Tammo van kind af uit de straat ("de jongen met de duif"); ontdekt in de flashback (H3) dat Tessa haar kleindochter is |
| Eerste verschijning | **H1** (de soeprit) | **H3** (de avond bij Oma), eerder genoemd |
| Einde | Overlijdt rustig na het Ontzet; begrafenis in Oudwoude | Leeft door; in de nazomer de standplaats met Mem |
| Ontmoeten elkaar | pas in **H16** (F3 Soep en eierbal), waar de twee oma's elkaar een stoel geven | |

**Namenregister: dubbelingen met deel 2 (`02-loopbanen.md`, branch `verhaalbijbel-2-28-11`) en met de bestaande cast, gelijkgetrokken.** Regel: de bestaande cast (dossiers) wint; deel 2 past aan. Deel 2 is geschreven zonder kennis van dit blad en noemt bij een paar rollen een andere naam of een andere functie; die staan hier gelijk. Ik heb dat bestand niet gewijzigd (andere branch); de coördinator voert dit register door bij de samenvoeging.

| Deel 2 zegt | Botst met | Besluit in de bijbel |
|---|---|---|
| **Tante Gesina** (erfenis, erf bij Hoogkerk) | drie Geesjes (Geesje Tuinstra, Geessien Meijer, Geesje de Vries) | Vervalt. De schenking komt van **Oom Hindrik de Jong** (hoeve Zeldenrust, Hogeland); **Tante Aaltje** (bestaand) zet haar klaar. De hond, de brief aan de spijker en het kalenderblad uit deel 2 blijven bruikbaar als details op de hoeve; "Hoeve Gesina" wordt "Hoeve Zeldenrust" |
| **De buurboer Harm Veldkamp** | Auke Veldkamp (buurman), Harm Dijkhuis (geschrapt) | **Buurboer Ypie Boekema** |
| **Melkrijder Lutje** | (geen) | Behouden |
| **Chauffeur Dries** | (geen; mijn eerste opzet "Arie" vervalt) | **Dries Oltmans**, vaste chauffeur vanaf H2, valt weg in H7 |
| **Dispatcher Annemarie**, mevrouw **Wassink** | (geen) | Behouden |
| **Stationschef Pieter Luiken** | Pieter Dijkstra | **Jochem Luiken** |
| **Schipper Okke** (rondvaart) | Wiebe Hazenberg is al de rondvaartschipper | Vervalt: **Wiebe Hazenberg** neemt zijn plek (boos op de wal, warm eronder; de "eend gered"-grap blijft) |
| **Schipper Geert** (binnenvaart) | Geert Hulshof (kermisexploitant) | Vervalt: **Lammert Veenstra** (bestaande binnenvaartschipper) neemt zijn plek |
| **Fenna**, gids-student | Fenna Wiersema (molenaar, Winsum) | **Noor** |
| **Havenmeester Tjalling**, **de loods** | (geen) | Behouden |
| **Sluiswachter Berendien** | Berend Bos (bijna dezelfde naam) | **Dina** |
| **Voorzitter Albert Bos** | Berend Bos | **Albert Teuben** |
| **Trainer Meester Klaas** | Kapitein Klaas Brouwer; mijn eerste opzet "Dolf" vervalt | **Meester Eppo Rozema** |
| **Bakker Wubbo Hoekstra** | Wubbo Zijlstra (brugwachter), Bert Hoekstra | **Bakker Jaap Roorda** |
| **Jan Kleibijter**, **Notarisklerk Rieneke** | (geen) | Behouden |
| **Verslaggever Hilbrand** | = Hilbrand Kuipers (bestaand) | Zelfde figuur, behouden |
| **"Lammert (kade)"** | Lammert Visser en Lammert Veenstra | Altijd met achternaam; kade = Visser |
| **"Beppe (het recept)"** | Het recept is van Oma Trijntje | Het recept is van **Oma Trijntje**; Beppe is soep en zorg |
| **Tessa's erfdorp bij Hoogkerk** | J3 (Siddeburen), A1 (Hoogkerk) | Het erf is **Zeldenrust** bij Warffum/Usquert; Hoogkerk blijft de bietenoogst |

**Check op nieuwe namen.** Elke nieuwe figuurnaam wordt vóór opname vergeleken met de dossiers (voornaam, achternaam en roepnaam; `DOSSIERS` in `characterdossiers.js`); de eerste opzet van dit blad had zelf botsingen met deel 2 (Dolf, Arie, Hennie), die daarom zijn vervangen. Voorstel: `scripts/characterdossiers_test.mjs` uitbreiden met een dubbelingencontrole op voornaam binnen dezelfde loopbaan en op achternaam binnen dezelfde familie. Echte persoonsgegevens staan er niet in; alle namen zijn verzonnen.

---

## 3. Begrijpelijkheid [canon, eigenaar 28-11]

**De eis.** Iemand die het verhaal niet kent moet alles snappen. Het verhaal ontdekt zich langzaam, mist nooit context en legt zichzelf uit. Er is geen verwijzing naar iets wat de speler niet heeft gezien; elk personage, elke plek en elke verwijzing wordt eerst geïntroduceerd. De bestaande maatregelen ([SCHRIJFREGELS-21-11.md](../SCHRIJFREGELS-21-11.md) regel 1 en 2; de vragen in `docs/PLAYTESTPLAN.md`; het kaartje "Waar waren we?" in `game/js/recapcard.js`; "Wat weten we?" met `CLUES`; `scripts/storyclarity_test.mjs`, `introduction_test`, `recapcard_test`) vormen de basis. Dit deel zet ze in één set regels die elke nieuwe scène moet halen.

### 3.1 Regels

**A. Introductievolgorde per personage** (bestaande regel, nu zonder uitzondering):
1. *Aankondiging:* een ander personage noemt hem vooraf in één zin ("Bert, de beste vriend van mijn opa").
2. *Eerste scène:* hij is zelf in beeld, met naamkaart (`Naamkaart:` en `card:`), toont **één** persoonlijkheidstrek en zegt in een bijzin hoe hij bij Tammo of Tessa hoort.
3. *Pas daarna* mag iemand naar hem verwijzen.
4. **Radio, telefoon, brief en omroep introduceren niemand.** Ze mogen een nog onbekende hooguit anoniem aanduiden ("een Fries met een klomp"). Jelle wordt zo opgebouwd: een omschrijving (H1), een naam op een brief die twee personen samen lezen (H2), zijn stem via de omroeper en de radio, zijn gezicht vanaf H2 in korte ontmoetingen (§2.1), nadat zijn naam eerst op een brief stond.
5. Maximaal **één nieuw personage** en **één nieuwe plek per scène**; nooit twee nieuwe begrippen in één regel.

**B. Plekken.** Een plek wordt eerst bezocht of op de kaart onthuld, met naam en één zin over wat het is, voordat iemand ernaar verwijst. Een reis begint met het doel en eindigt met een aankomstkaart; een plek die alleen in een verhaalfeit voorkomt (de hoeve, de kotter) krijgt een eigen eerste scène.

**C. Verwijzingen en begrippen.** Een begrip (de Snackprijs, de Gouden Eierbal, 1953, standplaats, formulier 14-B, de Commissie) mag pas worden gebruikt nadat het is uitgelegd of in beeld is geweest. Uitleg is in-wereld (een personage dat het weet, tegen een personage dat het niet weet), hoogstens 25 woorden per beurt, nooit tegen de speler. **Gezien-regel:** een scène verwijst alleen naar wat de speler eerder zag of hoorde, of legt het in dezelfde scène uit.

**D. Herhaling en recaps.**
- *Drie keer, in drie vormen:* elk belangrijk feit komt voor als zaadje (nog zonder uitleg), als uitleg en als uitbetaling (§7). Wat de speler nodig heeft staat ook in de **doelregel** van de stap.
- *"Waar waren we?":* het bestaande recapkaartje bij terugkeer na een pauze of een nieuwe sessie: de stap, de reden en de volgende stap in drie regels.
- *Hoofdstukopening:* één in-wereld terugblik van maximaal drie zinnen (Tessa's lijstje, het kaartje van de flat, een bericht) die alleen noemt wat de speler zelf meemaakte. Rikus vertelt nooit meer dan de speler al weet.
- *Hoofdstukslot (mijlpaal):* een korte scène die zegt hoe het ervoor staat ("Hoeve erbij, Jelle een stapel brieven verder").
- *Terugkerende bijfiguren* krijgen een herinnering in een bijzin ("Geesje, van de eieren in Warffum"), nooit alleen een naam.
- *Dossiers en clues* tonen alleen wat de speler ontmoette (`reveal`); het dossier onthult niets vooruit.

**E. Ontdekken in lagen.** Een raadsel krijgt eerst een zichtbare vorm, dan een naam, dan een reden. Jelle: een omschrijving, een brief met zijn naam, daarna meteen een korte ontmoeting, dan steeds langere. De snackwagen: een bord met een vrije standplaats, een weggezette aanhanger, het idee, de naam, de bouw. De relatie: een voorwerp, een opmerking, een bijna.

**F. Samen spelen.** De verhaalstand is per speler. Een gast die later aansluit speelt de recap en de naamkaarten voor figuren die hij nog niet kent (op zijn eigen voortgang) en ziet geen scène die naar een stap van de ander verwijst zonder dat hij die stap heeft (zie `.specs-fire/standards/multiplayer.md`, "Wat een gast wel en niet kan").

**G. Taal.** Geen jargon in doelregels; Gronings en Fries ondertiteld; een uitleg die de speler al weet wordt een grap, geen les.

### 3.2 Wat de speler per mijlpaal weet: de toets op de lijn (handmatig en automatisch)

Per hoofdstuk staat in §4.3 de regel **Speler weet nu**. De toets: een scène in hoofdstuk n verwijst alleen naar wat in de regels "Speler weet nu" van H1 tot en met n-1 staat, of legt het zelf uit. Bij het schrijven legt elke stap in de stapdata vast wat hij `introduceert` en wat hij `verwijst`; een nieuwe test (voorstel: `scripts/story_reference_test.mjs`, naast `introduction_test`) faalt als `verwijst` iets bevat dat geen eerdere stap `introduceert`. De problemen die deze toets al op het huidige verhaal en op de eerste opzet van de lijn vond, staan in §4.4.

### 3.3 Testen [canon: koude lezer en automatische controle]

**Koude-lezertoets per mijlpaal.** Bij elke mijlpaal (16 hoofdstukken, minimaal H1, H4, H10 en H16 met een echt mens) leest een lezer die niets van het verhaal weet **alleen** de scènes van H1 tot en met dat hoofdstuk, in speelvolgorde, zonder dossier, kaart of bijbel (ondertitels en doelregels zoals een speler ze ziet). Daarna beantwoordt hij een vaste lijst: wie is X (voor elk personage dat in het hoofdstuk optrad), wat wil Jelle, waarom doen Tammo en Tessa dit, wat is de standplaats, waar speelt dit zich af, wat is er in dit hoofdstuk gebeurd, wat is de volgende stap. Slaagt als minstens negen van de tien antwoorden goed zijn; een fout antwoord levert een concrete correctie op (een introductie, een herhaling, een recap). Het tussentijdse werk kan een agent zonder voorkennis doen, gevoed met alleen de scripttekst. Resultaat per hoofdstuk als comment op het issue.

**Automatische controle op verwijzingen** (`scripts/story_reference_test.mjs`, voorstel, naast `introduction_test` en `storyclarity_test`):
1. Elke stap heeft `introduceert` en `verwijst` (§3.2); een `verwijst` zonder eerdere `introduceert` (in speelvolgorde, na de herindeling van §6) faalt.
2. Een **woordenlijst** (alle namen uit `DOSSIERS`, plaatsnamen van de kaart, begrippen als Snackprijs, standplaats, Commissie, formulier 14-B, het recept, Gouden Eierbal, 1953) wordt tegen de scripttekst gelegd: komt een woord voor in een scène vóór de scène die het introduceert, dan faalt de test (behalve de anonieme aanduidingen van §3.1 A4).
3. Radio, telefoon, brief en omroep mogen niets `introduceren` (de bestaande regel, nu als test).
4. Elk hoofdstuk heeft een openings-terugblik (≤ drie zinnen) en een slotregel, en een naamkaart bij elke eerste verschijning (`card:`).
5. Dossiervelden `firstStep` en `reveal` komen overeen met de eerste scène in de speelvolgorde; `recapcard_test` blijft draaien.
Een nieuwe overtreding faalt; een bekende schuld staat in een lijst die alleen korter mag worden (zoals bij `dialogue_rhythm_test`).

---

## 4. De verhaallijn in hoofdstukken

**Structuur [canon].** Eén doorlopend, logisch verhaal: **geen aktes, geen keuzes, geen vertakkingen**. De hele wereld is vanaf het begin open; het verhaal bepaalt waarheen je gaat. De verdeling is een richtlijn voor gewicht: ongeveer **25% kennismaking, 40% loopbanen, 35% snackwagen en slot**. Een **mijlpaal elke 2 tot 3 uur**.

**Lengte.** De hoofdlijn is bij ontspannen spelen **ongeveer 40 uur**: 16 hoofdstukken van gemiddeld 2,5 uur (kennismaking 10 uur, loopbanen 16 uur, snackwagen en slot 14 uur). De 40 tot 80 uur komt uit wat de speler zelf toevoegt: **loopbanen zijn eindeloos**, elk met een eigen game-gevoel (voetbal met teams, transfers en seizoenen; boeren met gewassen, machines en markt; vervoer met roosters en lijnen; water met vaarten; horeca met een groeiende wagen), plus bijbanen, minigames en evenementen. Wie alleen de hoofdlijn speelt haalt ongeveer 40 uur, wie in een loopbaan blijft 80 en meer. Loopbanen zijn altijd beschikbaar zodra je meedoet, ook voor gasten, en blijven los speelbaar; ze verweven via leveringen, gedeelde personages en gezamenlijke evenementen.

**Wereld [canon].** Gebieden met eigen sfeer: **Stad Groningen** (Grote Markt, Noorderhaven, Paddepoel: druk, studentikoos, bureaucratisch-grappig), **Waddenkust en Lauwersmeer** (wind, kotters, dijken, Zoutkamp), **Hogeland en Veenkoloniën** (wijd land, boerderijen, kanalen, Veendam), **Westerkwartier en Gorecht** (bosjes, zandwegen, Zuidhorn, Hoogkerk) en, als verbinding, **Oldambt en Eemsdelta** (haven, graan, kermis, Delfzijl). Boeren op plekken met een band met het verhaal (de hoeve van Oom Hindrik), voetbal van dorpsvelden naar de Euroborg, vervoer en water door provincie en stad.

**Reisbereik [canon].** Alleen als de wereld het toelaat, en de provincie Groningen eerst: alle vaste scènes spelen binnen de provincie. Friesland (Ljouwert, Mem, Jelles stelpboerderij) komt in woorden, brieven en beelden voor, nooit als vaste scène; Mem en Jelle komen naar Groningen (Bourtange, de Grote Markt).

**Groei [canon].** Rangen per loopbaan, een groeiend eigen bedrijf (elke loopbaan is een kleine firma; ze komen in H15 samen), nieuwe voertuigen en uitrusting, een stad die op je reageert (§7). **Thuis groeit mee** **[voorstel]:** de flat wordt in H2 en H10 opgeknapt, in H15 komt een standplaatsbak bij een Hoekhuis aan de Noorderhaven (verruilen), en de hoeve is een tweede thuis.

**Kalender [canon, eigenaar 28-11]: decor, geen tijdlijn.** De speler ziet **geen datum** meer: geen datumkaarten met een dag of datum, geen dagregel met "dag 15" of "Vr 28 aug" in het HUD, geen datums in "Waar waren we?" of "Wat weten we?", geen datum op de epiloogkaart. De zomerse verzonnen kalender (`game/js/calendar.js`, altijd zomer, zonnestand, zomerse evenementen, nooit winter) blijft **intern** als decor: ze stuurt licht, evenementen en het weer, maar niet het verhaal. De verhaalstappen zijn dus **niet aan kalenderdagen gebonden**: de kermis, het Beleg en het Gronings Ontzet zijn gebeurtenissen die de stap oproept, geen datums die de stap bepalen; **het Gronings Ontzet (het slotfeest) komt pas als het verhaal dat nodig heeft** (H16). De 40 uur hoofdlijn hoeven dus niet in veertien verhaaldagen te passen, en de herindeling die de oude datums zouden eisen vervalt. Gevolg voor de bouwronde (aan te passen, niet in dit deel): de datumkaarten (`PARTS.date`, `partNumber`), de HUD-dagregel, de datums in de recap- en dossierkaarten en `calendar_test` (de interne dagtelling voor zon en evenementen en voor oude saves blijft); de zonnetijd en de verzonnen kalenderdagen blijven zoals ze zijn (constitution 3). Zomerse evenementen onderweg, bij naam: Zomermarkt in de Oosterparkwijk, het dorpsvoetbaltoernooi, het oogstfeest op de hoeve, de kermis (Stad en Winschoten), de Waddenvaart (Zoutkamp), het Beleg van Bourtange, het Gronings Ontzet.

### 4.1 Overzicht

| H | Titel | Uur (richt) | Deel | Gebied | Mijlpaal |
|---|---|---|---|---|---|
| 1 | Verhuisdag | 0 tot 2,5 | Kennismaking | Stad, westrand | De Escapade rijdt; de eerste honderdvijftig euro |
| 2 | De straat | 2,5 tot 5 | Kennismaking | Stad (Paddepoel, Loket) | Het werkbewijs: formulier 14-B ingeleverd |
| 3 | De stad is een derde hoofdpersoon | 5 tot 7,5 | Kennismaking | Stad (Grote Markt, Noorderhaven) | De kaart van de Stad is open |
| 4 | Het eerste Noorden | 7,5 tot 10 | Kennismaking | Hogeland, Zoutkamp | De provincie is open; het bezoek aan Oom Hindrik |
| 5 | Het erf | 10 tot 12,5 | Loopbaan boer | Hogeland | De hoeve is van jullie; eerste oogst |
| 6 | Het veld | 12,5 tot 15 | Loopbaan voetbal | Hogeland, Veendam | De eerste wedstrijd |
| 7 | De dienst | 15 tot 17,5 | Loopbaan vervoer | Stad, Winsum, spoor | Het eigen dienstrooster |
| 8 | Het water | 17,5 tot 20 | Loopbaan water | Stad, Reitdiep, Zoutkamp | Het vaarbewijs, twee schepen |
| 9 | De lucht | 20 tot 22,5 | Eigen verhaalstuk | Lauwersoog, Oldambt | De eerste vlucht boven het Wad |
| 10 | De stad reageert | 22,5 tot 25 | Loopbanen verweven | Stad, Euroborg | De Euroborg-avond en het stadsfeest |
| 11 | Het recept | 25 tot 27,5 | Slot begint | Stad, Noorderhaven | Oma's recept is compleet |
| 12 | De bal | 27,5 tot 30 | Slot | Stad (museum) | De vitrine is leeg |
| 13 | De provincie rond | 30 tot 32,5 | Slot | Eemsdelta, Oldambt | Jelles koopboek in handen |
| 14 | Zuidwaarts | 32,5 tot 35 | Slot | Veenkoloniën, Westerwolde | De bal terug in Bourtange |
| 15 | De wagen | 35 tot 37,5 | Slot | Westerkwartier | Het luik zit erin: Tam & Tes |
| 16 | Het Ontzet | 37,5 tot 40 | Slot | Stad | De rij tot de Korenbeurs; de stille avond |

Na H16 volgt de **nazomer** (de bestaande M27 tot en met M30 en F6): vrije speeltijd, nog altijd met iets te doen.

**Einde en nazomer [canon].** Na het slot lopen de wereld en alle loopbanen door. Het einde is duidelijk: de stille scène, Beppe's afscheid in Oudwoude, **de aftiteling** (met de in-herinnering-kaarten) en dan de vrije nazomer (de bestaande M27 tot en met M30 en F6 als optionele evenementen).

**Vervoer.** Het verhaal is bij vervoer minimaal (H7, ongeveer één uur); de diepte (roosters, lijnen, eigen lijn) zit in de eindeloze modus.

### 4.2 Het eerste uur [canon: de vier eisen]

Het eerste uur moet bevatten: een terloopse hint naar Jelle en de snackwagen, een eerste kleine overwinning, een eerste verkenning buiten de stad, een eerste bijbaan.

| Minuut | Wat | Vervult |
|---|---|---|
| 0 tot 12 | **Opening (M00):** verhuizing van het laatste studentenhuis in de Oosterparkwijk naar de flat in Paddepoel; Tammo en Tessa plagen elkaar; op de radio van Rikus draait een reclamespotje van *Us Mem Snacks* ("Foar mem!"). De speler leert de bediening. | hint Jelle: alleen een merk |
| 12 tot 20 | Eerste wandeling tot de Vismarkt: een bord *Vrije standplaats* (aanvragen bij de Commissie Standplaatsen Noord, formulier 14-B). Tessa: "Daar zou ik wel willen staan." Tammo: "Zonder wagen?" Stilte. Een grap van drie seconden, geen doel. | hint snackwagen |
| 20 tot 35 | **M01 Nul krassen, vijftienhonderd punten:** Berend (aangekondigd door Tammo) laat Tammo zijn bakkie door de stad rijden; terloops vertelt Berend dat een Fries in een blauw colbert dat bakkie contant uit een klomp wilde kopen. | eerste overwinning ("Goed."), eerste euro's; Jelle anoniem |
| 35 tot 45 | **N1 Een klus voor Sjabbe:** een kopieermachine de trap op, dertig euro, "ik vraag niks". | eerste bijbaan (klussen) |
| 45 tot 60 | **N3 Soep bij Beppe:** de stad uit via de westrand naar Beppe's huis aan de westgrens van de provincie, met een korte vrije verkenning van de polder en het Westerkwartier; Beppe ontmoet Tessa ("Jullie zijn vrienden."). | eerste verkenning buiten de stad; Beppe |
| 60 | **Mijlpaal 1:** recapkaart "Waar waren we?" en de eerste regel van "Wat weten we?": *Tammo en Tessa weten niet wat ze willen, maar wel dat ze elkaar niet kwijt willen.* | begrijpelijk beginpunt |

### 4.3 De hoofdstukken

Per hoofdstuk: de stappen met de **nieuwe bijfiguur** (één per stap), wat ontgrendelt, de relatie-beat, de Jelle-lijn en **Speler weet nu**. Stappen met een ID zijn bestaande stappen (§6); wat nieuw geschreven moet worden is zo genoemd.

**H1 Verhuisdag (0 tot 2,5 u).** Opening M00 (Rikus hoorbaar); M01 (nieuw: Berend); N1 Een klus voor Sjabbe (nieuw: Sjabbe); N3 Soep bij Beppe (nieuw: Beppe); W1 Half drie (de friet in de nacht: Tessa's liefde voor snacks als zaadje). *Recept (zaadje 1):* in de keuken staat een pot mosterd die Tessa niet wil weggooien ("van Oma") en ze noemt terloops "Oma's eierballen". *Ontgrendelt:* klussen. *Relatie:* het kaartje van de eerste Kiezelweek hangt aan de koelkast (O1); Beppe: "Jullie zijn vrienden." en, alleen tegen Tammo, hint 1 (§2.1). Beppe's keuken is vanaf nu een vaste plek om langs te komen. *Jelle:* een radiospot en een klomp, anoniem. *Thuis:* de flat is kaal. *Speler weet nu:* wie Tammo en Tessa zijn, dat ze net afgestudeerd en werkloos zijn, dat de Escapade (de rode auto) hun enige bezit is, dat Beppe Tammo's Friese oma is, dat een Fries snackbedrijf ("Us Mem Snacks") rondgaat.

**H2 De straat (2,5 tot 5 u).** N2 Een duif op de gang (nieuw: Veldkamp); (nieuw) de scooters op de stoep (nieuw: Sander Poelman); J1 Post van de gemeente (de eerste brief: kenmerk en afzender *J. Terpstra, voorzitter van de Commissie Standplaatsen Noord*); een parkeerbon op de Escapade (nieuw: Hoofdagent Hilda Wolthuis: precies, plechtig, "Dat staat in artikel…"); M02 Even pinnen (nieuw: de loketbediende); N4 Een eerste ronde (taxi, formulier); M03 Het Loket herschreven (§6) tot het werkbewijs (formulier 14-B; bezwaartermijn zes weken: de eerste bureaucratische grap). *Ontgrendelt:* taxi (proefrit), kantoor. *Relatie:* Veldkamp: "Zijn jullie al…?" "Nee." *Jelle (eerste korte ontmoeting):* bij het Loket stempelt hij zelf het werkbewijs, twee minuten, zonnebril op, plechtig en bureaucratisch ("Bezwaar: zes weken. Helaas drie dagen."); verder een naam op papier. *Thuis:* de flat krijgt een verfje. *Speler weet nu:* de Commissie en Jelle als naam en bureaucraat, dat een standplaats iets is waar iemand om vecht, dat Sander een rivaal is.

**H3 De stad is een derde hoofdpersoon (5 tot 7,5 u).** Een dag op de Grote Markt: de Stadsomroeper leest een besluit van Jelle voor (nieuw: Hayo Prins); Bert en zijn duiven (nieuw: Bert, aangekondigd door Veldkamp); M05 Wind tegen, beide kanten op (fietsrace, padel; nieuw: Sjoerd); N10 Een middag op het terras (nieuw: de terrasgast, horeca-proeven); een **flashback**, speelbaar, naar de Kiezelweek van vijf jaar geleden op het Academiegebouw (Tammo's valse start, de gedeelde pen); N8 Een avond bij Oma (nieuw: Oma Trijntje in beeld; zij zelf legt 1953 en de Snackprijs uit; het prikbord met vijf namen). In de flashback ontdekt Tammo dat de "Oma van de straat" uit zijn kindertijd Tessa's oma is. Oma legt hier ook het recept van 1953 uit als een gerecht, nog niet als geheim: vijf ingrediënten, vijf vrienden. *Ontgrendelt:* horeca (proeven), padel. *Relatie:* de flashback toont hoe ze vrienden werden. *Jelle:* de omroeper leest zijn tweede besluit voor. *Speler weet nu:* de belangrijkste plekken van de Stad (Grote Markt, Vismarkt, Noorderhaven, Academiegebouw, Oosterparkwijk) en dat Oma Trijntje in 1953 de Snackprijs won met een recept van vijf ingrediënten, terwijl Jelles oma toen tweede werd.

**H4 Het eerste Noorden (7,5 tot 10 u).** T1 De trein naar Warffum; M09 Heel aankomen is ook een kunst (nieuw: Geesje, de eieren); K1; T2 De streekbus naar Zoutkamp; N6 Een dag op het water (nieuw: Klaas); **N5 herschreven tot het bezoek aan een boerderij:** hoeve Zeldenrust op de Waddendijk bij Oom Hindrik (nieuw: Oom Hindrik) en Tante Aaltje (nieuw: Tante Aaltje); Tessa melkt, Tammo valt in de sloot; Oom Hindrik vertelt over opa en wijst naar de dijk: "Doar achter is niks meer." Aan het eind van de dag vertelt Tante Aaltje dat Oom Hindrik naar Huize Waddenzicht gaat omdat hij het erf niet meer alleen kan doen; hij zwaait vanaf de achterbank met zijn pet. *Ontgrendelt:* hengelen, bus, trein, de hele provincie. *Relatie:* Tante Aaltje zet hen samen op één bank: "Jullie zien er goed uit." "We zijn collega's." "Natuurlijk." *Jelle:* de omroeper meldt dat de Commissie het "Warffum-gebied in beheer neemt" (nog niet uitgelegd: zaadje). *Speler weet nu:* de provincie is open, Tessa is thuis op een boerderij, wie Oom Hindrik is en dat zijn erf een nieuwe boer zoekt.

**H5 Het erf (10 tot 12,5 u): boer.** *Aanleiding [canon]: erfenis van een oom of tante, hier als schenking (Oom Hindrik overlijdt niet).* Tante Aaltje zet de schenking klaar en leest bij de notaris de akte voor (nieuw: de notaris): Oom Hindrik schenkt de hoeve aan "mijn neef Tammo en aan Tessa, die mijn koeien begreep"; J3 Koffie bij Tessa's ouders (Siddeburen); de buurboer Ypie Boekema melkt al een week mee (nieuw: Ypie); M10 herschreven: een zwarte trekker-limo met vlaggetjes rijdt het erf op en af (het raam zakt: Jelle overhandigt zelf een brief, "Warffum in beheer", en rijdt door; nieuw: Durk en Douwe aan het stuur); A1 De bietenoogst. *Recept (zaadje 2):* Tessa merkt op dat de eieren van de hoeve "Oma's eieren" zijn: dezelfde als vroeger. *Ontgrendelt:* **boer** (rangen: Knecht, Pachter, Boer, Akkerbaas), de hoeve als eigen bedrijf, een trekker. *Relatie:* Tammo geeft Tessa de sleutel van de Escapade voor de markt (vertrouwenstaak 1). *Thuis:* de hoeve krijgt een logeerkamer. *Speler weet nu:* de schenking, het eerste eigen bedrijf, dat de zwarte limo van Jelle is.

**H6 Het veld (12,5 tot 15 u): voetbal.** *Aanleiding [canon]: invaller bij een dorpsclub.* Zondag bij VV De Hoek (verzonnen dorpsclub op het Hogeland): de linksbuiten ligt eruit (nieuw: Meester Eppo Rozema, de trainer; zijn linksbuiten ligt eruit); Tessa valt in, Tammo regelt schoenen en papieren (V1); V2 De eerste training in Veendam (Femke, de keeper van het eigen team, kent Tessa van het dorpsteam; nieuw: Femke); V3 Het is jouw avond. *Ontgrendelt:* **voetbal**: een ladder langs de velden van de provincie (dorp, Veendam, streekclub) naar de Euroborg als hoogste niveau (rangen per niveau; teams, transfers, seizoenen). *Relatie:* Tammo houdt langs de lijn haar tas vast; haar handschoen blijft in zijn jaszak (voorwerp 1). *Jelle:* de omroeper leest een bord-weigering voor ("Geen bord langs de weg voor VV De Hoek"). *Speler weet nu:* wat de ladder is, dat Tessa kan voetballen, wie Femke is.

**H7 De dienst (15 tot 17,5 u): vervoer.** *Het verhaal blijft hier minimaal [canon]:* ongeveer één uur verhaal (Dries draagt over, de eerste dienst, de eerste lijn), de rest van het hoofdstuk is vrije ruimte (bijbanen, de Zomermarkt) en de diepte van vervoer zit in de eindeloze modus (roosters, lijnen, eigen lijn). *Aanleiding [canon]: een chauffeur valt weg.* Chauffeur Dries Oltmans (al sinds H2 de vaste chauffeur van de bus naar huis, met zijn eigen koffiekan) krijgt een zere rug (niet erg, genoeg); Dispatcher Annemarie belt over de portofoon ("Dries ligt op de bank"); Tammo neemt zijn diensten over; N7 De streekbus naar Winsum (nieuw: de buschauffeur); N11 Een bezorgrondje bij Bedum; de trein (nieuw: Jochem Luiken). *Ontgrendelt:* **vervoer** (taxi, bus, trein; mag de kortste loopbaan zijn; rangen: invaller, vaste chauffeur, dienstleider, eigen lijn). *Relatie:* Tessa maakt zijn rooster en zet haar nummer als noodnummer bovenaan ("Voor als de auto kapot gaat."). *Recept (zaadje 3):* bij een bezorgrit levert Tammo een vat vet en een zak mosterd af zonder te weten waarvoor. *Jelle:* een brief over een "tijdelijke wijziging" van de dienstregeling, bezwaar zes weken. *Speler weet nu:* hoe vervoer werkt; dat de Commissie ook de lijnen bepaalt.

**H8 Het water (17,5 tot 20 u): rondvaart en binnenvaart.** *Aanleiding [canon]: een schipper valt weg.* Wiebe Hazenberg (hoorbaar in H3; nieuw als stap: Wiebe) struikelt over zijn megafoon en kan zijn heup niet meer gebruiken; zijn rondvaartboot en zijn vrachtschip *De Drie Zusters* hebben een schipper nodig; Lammert Veenstra (nieuw: Lammert Veenstra) leert hun de binnenvaart; K2 De kade in de ochtend; M11-opmaat: de rubberboot van Klaas. **Twee sporen:** de **rondvaart in de Stad** en de **binnenvaart door de provincie** (leveringen voor de hoeve en voor Geesje). *Relatie:* "Twee op één dek is een bemanning" (Wiebe); een rood-blauw touwtje om haar pols (voorwerp 2). *Jelle (korte ontmoeting):* hij staat zelf op de kade met een klembord en weigert de aanlegplaats, vriendelijk en onverbiddelijk. *Speler weet nu:* water is een eigen wereld, vracht en toerist.

**H9 De lucht (20 tot 22,5 u).** Eigen verhaalstuk, geen loopbaan met aanleiding: M12 Het staat niet in het rooster (nieuw: Dijkstra, de traumaheli), M15 Laag over het graan (nieuw: Roelfien), de ballon boven de Dollard (Jelles ballon van Us Mem Snacks), T3. *Relatie:* in de ballon een bijna (bijna 1: het schaap). *Jelle:* zijn ballon is een visueel moment zonder ontmoeting (hij zwaait vanuit de mand). *Speler weet nu:* de lucht is er, Roelfien is Oma's nicht.

**H10 De stad reageert (22,5 tot 25 u).** Loopbanen verweven: de hoeve levert aan Geesje en de kermis, vervoer brengt, water brengt langs de Noorderhaven. Evenementen: de Euroborg-avond (Tessa speelt de openingswedstrijd, nieuw: Hilbrand de verslaggever), J4 Een dubbele date in Veendam (Femke, al bekend uit H6), N9 Nacht op een dijk (de politie zoekt "twee Stadjers in het zwart"; nieuw: Wijkagent Tjeerd Bolhuis, die de andere kant op kijkt), A2 De kermisrit, N12 De lijst op de koelkast (WIE KAN WAT; de lege regel SAMEN). Sander plaatst de eerste bestelling. *Relatie:* ze hangen samen een lamp op en de flat voelt voor het eerst als thuis. *Jelle:* een groot bord "Us Mem Snacks" naast de Euroborg; de Stad wint het stadsfeest. *Speler weet nu:* de stad kent hen; ze raakten vijf loopbanen.

**H11 Het recept (25 tot 27,5 u): het slot begint.** *Aanleiding [canon]: snackwagen en horeca als slotstuk waarin alles samenkomt.* De Snackprijs (in H3 uitgelegd) nadert; Jelle koopt ingrediënten op. Oma Trijntje legt de lijn bloot: "Wat jullie de hele zomer droegen, is mijn recept." (Het recept is het hart van de snackwagen; zie §7.) De vijf ingrediënten komen **uit de loopbanen:** eieren van de hoeve, meel van Roelfien, vet via vracht (M07 Al het vet van Grunn), zout van de Waddenkust, mosterd per binnenvaart. M08 (het recept ophalen), de inschrijving voor de Snackprijs (de oude kern van M03), O6. Mem appt Tessa voor het eerst ("Pas op dysels, famke."); Tessa verzwijgt het (haar kleine geheim, **geen ruzie**). *Jelle (korte ontmoeting):* hij zit zelf achter het inschrijfloket van de Snackprijs en stempelt hun inschrijving met een kleine zucht. *Speler weet nu:* de Snackprijs, het recept, en waarom alles samenkomt.

**H12 De bal (27,5 tot 30 u).** De Gouden Eierbal staat in het museum; wie hem bewaart (nieuw: Mevrouw Hoving) zit de jury voor. M04 Kieken van boven, M05-camera's, M06 Het museum stond er al zo (de vitrine is al leeg: "Tige tank! – J."); Henk bouwt het plan (nieuw: Henk Pol); Agent Joost Ensing (nieuw: Joost) komt drie minuten te laat voor het alarm; Durk en Douwe in beeld. *Relatie:* vertrouwenstaak 2: Tammo houdt de ladder, Tessa de plattegrond. *Speler weet nu:* Jelle heeft de bal echt.

**H13 De provincie rond (30 tot 32,5 u).** M11 Geleend van de Friezen, M13 Het containerlabyrint (nieuw: Lammert Visser), K3, M14 De dijk, J2, W2 (het havenhuis voor later), M16 Nog eentje dan (kermis in Winschoten; nieuw: Geert); **Jelle op de kermis** (korte ontmoeting, zijn vierde), zonnebril op, met een brief in drievoud. De botsauto-kus wordt een **bijna** (§5). *Speler weet nu:* wat Jelle wil (zijn oma, Friesland), hoe hij praat en dat hij hen niet haat maar bestudeert.

**H14 Zuidwaarts (32,5 tot 35 u).** M17 Open, dicht (nieuw: Wubbo), M18 (het logboek), J5, M19, T4, M20 Het beleg van Bourtange (nieuw: Mem in beeld; de bal terug), M21 herschreven: Tessa haalt de Escapade terug **zonder ruzie**; ze zijn praktisch uit elkaar (taken in tegengestelde richting) en missen elkaar; ze hebben het er niet over. *Relatie:* de stilte: een kaartje van een koe, "Waar ben je?" (voorwerp 3). *Jelle:* Mem neemt de bal af; hij zegt "Ja, mem." *Speler weet nu:* Mem is geen vijand.

**H15 De wagen (35 tot 37,5 u).** F1 Een wagen langs de weg (nieuw: Tinus en zijn schuur), M22 Een luik erin (Henk bouwt het luik; Tammo pandt zijn opa's horloge bij Sjabbe), F2 De eerste bak; de naam: **Tam & Tes** (Henk: "Tam. Tes. Ik zeg niks. Eén koekje." De grap wordt nooit uitgelegd). Alles uit de loopbanen komt terug. *Relatie:* Tessa koopt het horloge stiekem terug (voorwerp 4). *Jelle:* een brief aan "de heer en mevrouw Wierenga-Mulder" (hij denkt dat ze getrouwd zijn). *Speler weet nu:* de wagen is van hen; de standplaats nog niet.

**H16 Het Ontzet (37,5 tot 40 u).** *Actie:* M23 De colonne (Wijkagent Bolhuis houdt de route vrij; iedereen die ze hielpen komt terug met een voertuig of hulp: Tinus' trekker, Dries' bus, Wiebe's boot, Dijkstra's heli, Eppo's elftal), M24 Er hangt iets Fries aan d'Olle Grieze, M25 Het bod viel tegen, M26 Ontzet. *Feest:* het Gronings Ontzet in de Stad met alle bijfiguren; **Jelles bureaucratische ontknoping** (voorgelezen door Hoofdagent Hilda Wolthuis, de enige die de stukken las): zijn eigen **Verordening Eerste Aanvraag** zegt dat de oudste aanvraag voorgaat. Die staat op naam van Oma Trijntje én Mem, beide in 1953 op dezelfde dag ingediend, en "bij gelijke aanvragen werken de aanvragers samen op één standplaats". **De erkenning:** in het archief van Jelles eigen Commissie ligt het originele juryformulier van 1953: Gerda (Mem) scoorde hoger dan Trijntje, maar het formulier werd pas na de uitslag opgeteld en niemand opende het meer. Jelle vond het jaren geleden en diende een *Verzoek tot herziening 1953* in; de herziening vraagt de handtekening van de winnares ("erkenning door de winnaar") en hij durfde haar nooit te vragen. Zijn eigen verzoek ligt al drie jaar onbehandeld op zijn eigen bureau. Op het Ontzet zegt Oma Trijntje het zelf, hardop, voor de hele Grote Markt: "Gerda. Jouw eierbal was beter." (ze heeft het zeventig jaar niet gezegd; het sluit aan bij de bestaande regel in M08.3). Mem: "Ik hoef geen prijs. Ik hoef dat jij het zegt." Jelle tekent zijn eigen verzoek, zijn zonnebril gaat af, en zijn verordening (gelijke aanvragen werken samen op één standplaats) geeft Mem en Oma Trijntje samen de standplaats van Tam & Tes. Tessa, de slimme leider, heeft al een zet klaar: **De Gerda**, Mems eierbal (het geheim leerde ze in de zomers in Ljouwert en uit Mems appjes) komt als tweede eierbal op de kaart van de wagen, naast Oma's recept (F3, F4). *Stille scène:* F5 Een avond voor twee aan de Noorderhaven: weinig woorden, haar hand in zijn zak met de handschoen (§5). *Beppe op het feest:* in haar zondagse blouse, naast Oma Trijntje (F3), ze zegt niets, ze knipoogt naar Tessa. *Epiloog (E):* in de nacht na het Ontzet overlijdt Beppe rustig (bericht van Tante Aaltje, briefje op haar tafel: "Houd elkaar vast. – B."); de begrafenis in Oudwoude (§5.3, kernscène); daarna de aftiteling met de in-herinnering-kaarten en de nazomer. *Speler weet nu:* alles; en dat er altijd nog iets te doen is.

### 4.4 Toets op begrijpelijkheid: gevonden problemen

| Gevonden | Waarom het niet begrijpelijk is | Oplossing |
|---|---|---|
| M03 (nu) verwijst naar de Snackprijs en Jelle in persoon in de derde stap | De speler kent noch de prijs noch Jelle | M03 wordt het werkbewijs (H2); de Snackprijs komt in H3 (Oma) en H11 |
| M02 noemt Sjabbe als telefoonstem | Telefoon introduceert niet | N1 (Sjabbe in beeld) staat vóór M02 |
| M06-kraak noemt de Gouden Eierbal en 1953 | Nooit uitgelegd | Oma legt 1953 en de Snackprijs uit in H3; de kraak pas in H12 |
| M08 introduceert Oma Trijntje laat | Ze wordt al lang genoemd | Oma in beeld in H3 (N8) |
| O6 "Jelle biedt op Oma's recept" | Recept onbekend | Recept in H3, bod in H11 |
| J6 Beppe aan de deur (nadat ze volgens de code overleed) | Tegenstrijdig | Het overlijden komt pas na het slot; J6 klopt dan weer |
| M21 "Alleen" na de ruzie | Zonder ruzie onbegrijpelijk | Tessa's solo is praktisch (§6); de stilte wordt getoond |
| F2/F3 noemen "de wagen" voor hij gebouwd is | Zaadje zonder uitbetaling | De wagen valt in H1, H5, H8 en H11 als grapje, in H15 wordt hij gebouwd |
| Radio-Rikus noemt "de duivenfluisteraar" | Wie is dat? | Veldkamp (H2) en Bert (H3) staan dan al in beeld |

Afspraak: elke nieuwe scène krijgt `introduceert` en `verwijst` (§3.2).

### 4.5 Emotionele scènes [canon, eigenaar 28-11]

De toon laat deze vier soorten scènes toe; ze zijn warm, zonder leed, met humor en ontroering tegelijk. Elke scène staat op een vaste plek in de lijn.

| Soort | Scène | Waar | Hoe |
|---|---|---|---|
| Warm afscheid zonder leed | **Oom Hindrik zwaait:** in H4 neemt hij hen mee naar het hek, wijst naar de dijk, geeft Tessa de koeienbel en gaat met zijn pet in de auto naar het verzorgingshuis; in H5 bezoeken ze hem met een mand eieren. | H4, H5 | geen sterfscène; de grap draagt het afscheid (hij klaagt dat de thee in het huis te slap is); de buurboer neemt zijn pet af |
| Warm afscheid zonder leed | **Chauffeur Dries en zijn koffiekan:** hij draagt zijn dienst over; Tammo mag de koffiekan op het dashboard laten staan. | H7 | Dries blijft de laatste halte meerijden "voor de gezelligheid" |
| Warm afscheid zonder leed | **Wiebe en zijn megafoon:** hij geeft de megafoon aan Tessa en zegt voor het eerst iets zachts. | H8 | hij blijft aan de wal schreeuwen (de grap) |
| Bijna missen | **Het perron:** in H14 reizen ze elk een andere kant op en missen elkaar op Station Veendam of Station Groningen op één minuut; hij ziet haar trein vertrekken, zij ziet hem de trap op rennen; geen woord, wel een raamgebaar. | H14 | de stilte-beat van de relatieboog (§5); zonder ruzie |
| Trotse overwinning samen | **De eerste echte bak:** in H15 gaat het luik voor het eerst open en rijdt de eerste klant weg met een eierbal; en in H10 het stadsfeest, de eerste keer dat de stad hun naam roept. | H10, H15 | alle bijfiguren juichen; Sander bestelt |
| Humor en ontroering tegelijk | **"Tam. Tes. Ik zeg niks. Eén koekje."** (Henk); **de bezwaartermijn** in Jelles ontknoping ("zes weken, helaas drie dagen") waarna hij zijn zonnebril afzet; **de koeienbel** in de stille scène. | H15, H16 | de grap draagt de ontroering, nooit uitleggen |

### 4.6 Beppe-scènes (verplicht) [canon, eigenaar 28-11]

De Beppe-scènes horen bij het hoofdverhaal: ze zijn de emotionele boog en geen bijbaan. Ze zijn onderdeel van de hoofdstappen (de stap opent met de scène of sluit ermee) en dus niet optioneel; alleen de losse soepbezoeken tussendoor (eens per speeldag) blijven vrije speeltijd.

| Hoofdstuk | Scène | Wat |
|---|---|---|
| H1 | N3 Soep bij Beppe | Eerste bezoek: Tessa ontmoet haar; "Jullie zijn vrienden."; hint 1 |
| H4 | Beppe belt (voor het bezoek aan de hoeve) | Hint 2; zij vraagt Tante Aaltje de stoelen te zetten |
| H5 | De hoeve in de familie | Hint 3 aan de telefoon; ze stuurt een mand met soep voor de eerste avond op het erf |
| H7 of H8 | Beppe in de keuken | Hint 4; Tessa in de tuin bij de duiven, Tammo binnen |
| H10 | J6 Beppe aan de deur | Bezoek met soep en de foto uit de eerste Kiezelweek; hint 5 |
| H13 | Beppe's bankje | Hint 6 ("Zeg het niet te laat, jonge."); licht, zonder drama |
| H15 | Beppe's jas | Hint 7; zij koopt een jas voor een feest |
| H16 | Het feest | Zondagse blouse, Oma Trijntje en Beppe in één keuken (F3), de knipoog |
| E | Het afscheid | Het overlijden, het briefje, de begrafenis in Oudwoude; de handen (§5.3) |

### 4.7 Perspectief en besturing: zoals het spel het nu regelt (niet veranderen)

De bijbel verandert de besturing niet; ze beschrijft wat de code doet, zodat de scènes er rekening mee houden.
- **Eén hoofdspeler tegelijk, Tammo of Tessa, per stap.** Elke verhaalstap kan een `player` hebben (`'anita'` voor Tessa, bijvoorbeeld V1 tot en met V3 en M21); `story.js` (`updateCharacter`) wisselt de hoofdspeler van personage zodra het rustig is (`SWAP_CALM`); wie boert of voetbalt speelt als Tessa (`karakterbonus.js`). De andere figuur is de **computermetgezel** en loopt mee.
- **Samen spelen.** Wie het spel opende is Tammo, de gast is Tessa (`fixedChars`); de andere rol in een scène is de metgezel en elke rol wordt één keer getekend (`coopcut.js`). Zie `docs/COOP-GAST.md`.
- **Per scène: speler en NPC [canon].** Elke scène legt vast wie de speler is en wie de NPC; in de cutscene draagt de speler wat hij zelf koos, de NPC zijn vaste set. Voorstel per hoofdstuk (de bestaande `karakterbonus`-regel blijft: boeren en voetballen als Tessa; Samen spelen: host Tammo, gast Tessa):

| H | Speler (voorstel) | NPC | H | Speler | NPC |
|---|---|---|---|---|---|
| 1 | Tammo | Tessa | 9 | Tammo (heli), Tessa (ballon) | de ander |
| 2 | Tessa (de brieven, het Loket) | Tammo | 10 | Tessa (Euroborg) | Tammo |
| 3 | Tammo | Tessa | 11 | Tessa (recept) | Tammo |
| 4 | Tessa (de hoeve) | Tammo | 12 | Tammo (ladder) | Tessa |
| 5 | Tessa | Tammo | 13 | Tammo | Tessa |
| 6 | Tessa (voetbal) | Tammo | 14 | Tessa (M21 solo), Tammo (Bourtange) | de ander |
| 7 | Tammo | Tessa | 15 | Tammo (het luik) | Tessa |
| 8 | Tammo | Tessa | 16 | beide, wisselend per scène; de stille scène: de speler en de metgezel | |

- **Gevolg voor de bijbel.** De loopbaan-sterktes in §2.1 zijn *neigingen* van de figuren en geen sloten: elke loopbaan blijft voor beide figuren speelbaar (eigenaar, 28-11). Nieuwe stappen krijgen een `player` waar de scène één van de twee centraal zet (Beppe's soepbezoek: Tammo; de hoeve: Tessa; de wagen: beiden), en de rest wisselt zoals nu.

### 4.8 De aftiteling [canon, eigenaar 28-11]

Emotioneel én grappig tegelijk, na de epiloog en Beppe's afscheid.
- **Beelden:** een terugblik in de stad zelf, ontleend aan de echte spelassets: de Grote Markt in het avondlicht, de Noorderhaven, de hoeve Zeldenrust, de Euroborg, het perron, het luik; de personages en hun gags in kort: Berends "Goed.", Henks koekje, de duiven die naar Tammo vliegen, Jelles bezwaartermijn, Wiebe's megafoon, Veldkamp die het weer mist.
- **Statistieken van de speler:** uren gespeeld, gereden kilometers, geoogst, doelpunten, vaarbeurten, uitgedeelde eierballen, aantal keer dat Tammo "Kon minder." zei; **alleen lokaal**, nooit verzonden (constitution 4).
- **Een korte muzikale finale** (kort stuk, geen tekstzang nodig); de bestaande muziek- en opdrachtlijsten staan in `docs/verhaal/MUZIEKLIJST-21-11.md`.
- **Een scène na de credits:** een brief van Jelle valt op de mat, gericht aan "de heer en mevrouw Wierenga-Mulder": "Onderwerp: Gefeliciteerd. Bezwaartermijn: zes weken. Helaas drie dagen." Onderaan, in een andere hand: "Kom koffie. – M." Tessa en Tammo kijken elkaar aan; de duif landt op het luik.
- **Verhouding tot de code:** nu rollen de credits (`ending.js`, `credits.js`) pas als het verhaal klaar is *en* elke verhaalmissie en elke uitdaging na het verhaal is gehaald. In de bijbel rolt de aftiteling aan het einde van de epiloog (duidelijk einde) en blijft de wereld daarna open; het huidige "alles gehaald"-moment kan een tweede, kort slotbeeld zijn. Afwijking van de code, ter beslissing van de bouwronde.
- **Samen spelen:** iedereen ziet de aftiteling lokaal, met zijn eigen statistieken.

---

## 5. De relatieboog Tammo en Tessa [canon: grondlijn; voorstel: scènes]

**Grondlijn [canon].** Ze beginnen als **beste vrienden die vaak plagen**. Het middenconflict is **geen ruzie**: ze weten allebei niet wat ze willen, zijn verschillend, willen elkaar niet missen en willen **stiekem allebei meer**, zonder dat van elkaar te weten of toe te durven. **Anderen zien het al.** Het verhaal laat het zien via veelbetekenende opmerkingen, rollen die bijfiguren hen toekennen, taken die vertrouwen vragen en voorwerpen in de wereld. Het slot is in de snackwagen: eerst actie, dan feest in de stad met Jelles bureaucratische ontknoping, dan een stille scène. Twee bogen lopen mee: Tessa wordt de slimme leider, Tammo vindt zijn eigen plek.

**Regels voor elke relatiescène.**
1. Nooit een keuze van de speler die het verloop verandert; geen vertakking (canon). Stille flags (`romantiek:*`) mogen, alleen toevoegen.
2. Nooit een bekentenis voor het slot. Hooguit een **bijna** (er wordt iets niet gezegd; een derde onderbreekt, een schaap, een bel, een kruising).
3. Een signaal is altijd **subtiel en tweezijdig**: als Tammo iets doet, doet Tessa binnen twee hoofdstukken iets gelijks.
4. De speler weet vóór de personages dat het wederzijds is (dramatische ironie), maar de scène blijft luchtig.
5. Humor eerst, ontroering daarna; een signaal is nooit alleen mooi, het heeft ook een grap.
6. Geen jaloezie-driehoek en geen ruzie: de bijna-beats lossen op in een grap.

### 5.1 De fasen

| Fase | Hoofdstukken | Stand | Wat de speler ziet |
|---|---|---|---|
| 1 Plagen | H1 tot en met H4 | Beste vrienden | Ze plagen elkaar: Tessa imiteert Jelle slecht, Tammo zegt "Tám-mo" terug; hij mag haar tas dragen en betaalt nooit; ze parkeert overal. Beppe zegt "Jullie zijn vrienden." op een toon die het tegendeel zegt. Het kaartje van de eerste Kiezelweek hangt aan de koelkast. |
| 2 Verschillend | H5 tot en met H8 | Elk een eigen loopbaan | Tessa is thuis op het erf en op het veld, Tammo achter het stuur en op het water. Ze zijn overdag verschillend en 's avonds weer samen. Ze weten allebei niet wat ze willen ("Wat willen wij nou?" "Weet ik veel."). |
| 3 Anderen zien het | H8 tot en met H12 | Stiekem meer | De bijfiguren merken het eerder dan zij (§5.2). Eerste "wij"-momenten (de lamp in de flat, de koelkastlijst met de lege regel SAMEN). |
| 4 Het middenstuk zonder ruzie | H13 en H14 | Samen en toch apart | Ze moeten elk een andere kant op (taken in tegengestelde richting). Geen woord over ruzie: ze missen elkaar en zeggen het niet. Bijna's: de botsauto's (H13), het perron (H14). |
| 5 Het slot | H15 en H16 | De wagen: Tam & Tes | Actie, feest, stille scène (§5.3). |

### 5.2 De signalen

**Opmerkingen van bijfiguren** (elk een zin, nooit een uitleg):
- Veldkamp (H2): "Zijn jullie al…?" "Nee." "Zo."
- Tante Aaltje (H4, bij het zetten van de stoelen): "Jullie zien er goed uit." "We zijn collega's." "Natuurlijk."
- **Beppe** (H1 tot en met H15, alleen tegen Tammo): zeven hints, zie het blad van Beppe in §2.1; één tegen Tessa erbij: "Jullie zijn vrienden." (de toon zegt het tegendeel).
- Wiebe (H8): "Twee op één dek is een bemanning."
- Mevrouw Wassink in de bus (H7): "De jongedame en de heer, zijn jullie al getrouwd?" Tessa: "We rijden alleen mee." Mevrouw Wassink: "Dat zeiden wij ook."
- Femke (H10, de dubbele date): "Het is toch een dubbele date?" Rikus: "Het is een dubbele *friet*."
- Rikus (radio, H10): "Een duif vloog naar de verkeerde, Grunn." (de duif en Tammo).
- Henk (H15): "Tam. Tes. Ik zeg niks. Eén koekje."
- Jelle (H15, brief): gericht aan "de heer en mevrouw Wierenga-Mulder". Tessa: "Hij denkt dat we getrouwd zijn." Tammo: "Kon minder." Zij kijkt hem even aan.

**Rollen die ze hen toekennen:** Oom Hindrik schenkt het erf aan "Tammo en Tessa, die mijn koeien begreep" (H5); Wiebe maakt hen "de bemanning" (H8); Dries: "een goed koppel op de lijn" (H7); de voetbalclub zet Tammo als "de regelaar achter de spits" op het formulier (H6); Tante Aaltje: "mijn neef en degene die bij hem hoort."

**Taken die vertrouwen vragen:**
1. De sleutel van de Escapade geven aan Tessa (H5).
2. Zijn rooster maken en haar nummer als noodnummer erop (H7).
3. De ladder houden terwijl zij de plattegrond leest (H12).
4. "Geef de stuurboordkant aan de ander" op het water (H8).
5. Het kasboek van de wagen, het bonnetje en de sleutel van het luik (H15): hij beheert het luik, zij het geld.

**Voorwerpen in de wereld:**
- Het **kaartje van de eerste Kiezelweek** (`romantiek:kaartje-hangt` en `kaartje-zak`, bestaand): het hangt in de flat, een tweede zit in zijn zak.
- Haar **keepers- of spitshandschoen** in zijn jaszak (H6) en die in de stille scène teruggegeven.
- Een **rood-blauw touwtje** om haar pols na de kade (H8): ze draagt het mee op het feest.
- De **koeienbel** van Oom Hindrik die hij haar geeft (H4); in de stille scène hangt hij aan het luik.
- Een **kaartje van een koe** met "Waar ben je?" dat zij hem stuurt tijdens de stilte (H14).
- **Opa's horloge**: hij pandt het bij Sjabbe voor het luik (H15), zij koopt het stiekem terug en legt het in zijn pet (H16).
- De **koelkastlijst** WIE KAN WAT met de lege regel SAMEN (H10), waarop in H16 iemand "Tam & Tes" bijschrijft.
- **Foto's en briefjes:** een foto van hen beiden in de eerste Kiezelweek in Beppe's keuken (H1 en H10, steeds iets verder in beeld), een briefje van Tante Aaltje bij de schenkingsakte ("Pas goed op elkaar. – A."), en de brief van Oom Hindrik ("De koeien weten het al.").

### 5.3 De bijna's en het slot

**Vier bijna's** (elk onderbroken, nooit langer dan een zucht): de **ballon** boven de Dollard (H9, een schaap op het veld beneden doet de ballon dalen), de **nacht op de dijk** (N9, H10, het politieblokje met de zoeklichten), de **botsauto's** (H13, de rit stopt), het **perron** (H14, de trein vertrekt). De bestaande **kus in de botsauto (M16)** wordt een bijna, de **vijf woorden "voor iedereen" (M26.7)** worden de stille scène.

**Slot [canon].** Eerst actie, dan feest, dan stilte:
1. **Actie (H16, M23 tot en met M26):** de colonne, de vlag, het bod, de race tegen de klok. Ze werken naadloos samen zonder te praten (alles uit de loopbanen helpt).
2. **Feest in de Stad (het Gronings Ontzet):** de hele cast, de omroeper leest Jelles laatste besluit voor en gaat wél door tot de bezwaartermijn; Jelles **bureaucratische ontknoping** (zie §4, H16). Iemand roept "Kus!" en Tammo en Tessa lachen het weg ("Kon minder."). Triomfantelijk en warm.
3. **Stille scène (F5):** later die avond aan de Noorderhaven, bij het luik. Nauwelijks tekst. Zij geeft hem zijn horloge terug, hij haar de handschoen. Hij zet zijn pet af. Hij zegt vijf woorden, zacht ("Ik wil bij jou blijven.") en zij antwoordt met zíjn zin: "Kon minder." (het hoogste compliment van de complimentenladder). De camera blijft op de koeienbel hangen. Geen woorden daarna.
4. **Beppe's afscheid (E, kernscène).** In de nacht na het Ontzet overlijdt Beppe rustig; Tante Aaltje belt, het briefje op haar tafel zegt "Houd elkaar vast. – B." De begrafenis is in **Oudwoude**: geen getoond leed, wel stilte, het kerkje, een esdoorn, Oma Trijntje die komt, Mem die komt (zonder Jelle: hij blijft voor de kerk staan en zet zijn zonnebril af). Tammo en Tessa staan aan het graf en **houden elkaars hand vast**; Tammo zegt als enig Fries woord: "Dag, beppe." Zonder woorden (alleen Beppe's hints als herinnering in een montage) wordt duidelijk dat ze samen zijn geëindigd, zoals zij altijd wilde. Dit is de kernscène die elke eerdere hint laat landen. **Oudwoude** ligt in Fryslân en komt als plek in de code niet voor (geen treffer in `game/js`, `docs` of `scripts`; de wereld loopt tot het Kollum-bordje bij de noordwestgrens, zie `beppe_garden.js`). Besluit eigenaar: **alleen een cutscene, geen speelbaar gebied**. De scène speelt in een afgesloten set met vaste decorstukken (kerkhofmuur, esdoorn, kerkje, bordje "Oudwoude"), met de bestaande figurenmodellen, zonder dat de wereld wordt uitgebreid.

---

## 6. Het huidige verhaal in de nieuwe lijn

Per bestaande stap een advies: **behouden** (zelfde inhoud, hooguit een kleine aanpassing), **herschrijven** (zelfde stap, andere inhoud of toon) of **verplaatsen** (zelfde inhoud, ander hoofdstuk). De MISSION_IDS en alle stap-ids blijven bestaan (append-only; ze staan in saves en medailles). Een andere volgorde vraagt wel een savemigratie met dezelfde techniek als `ADDED_STEPS` en `passedBetweenSteps`; de bouwronde plant dat. De scripts (`09-script-*.md`) en opnames: een behouden regel behoudt zijn opname; een herschreven regel is stil tot de volgende opnameronde (zie `voice_wacht.json`).

### 6.1 Missies

| ID | Titel (nu) | Advies | Nieuw (H) | Reden |
|---|---|---|---|---|
| M00 | Opening: verhuisdag | Behouden, licht herschrijven | H1 | Voeg de radiospot van Us Mem Snacks en het bord op de Vismarkt toe (hint Jelle en wagen); wagen blijft geen doel |
| M01 | Nul krassen, vijftienhonderd punten | Behouden | H1 | Perfecte eerste overwinning; bevat de klomp-anekdote (Jelle anoniem) |
| M02 | Even pinnen | Verplaatsen | H2 | Sjabbe is dan al in beeld (N1); telefoon introduceert niet |
| M03 | Het Loket | Herschrijven | H2 (werkbewijs); inschrijving Snackprijs naar H11 | Nu verwijst de stap naar de Snackprijs en Jelle in persoon voordat de speler beide kent; bureaucratie blijft, in de vorm van formulier 14-B |
| M04 | Kieken van boven | Verplaatsen | H12 | Bert is dan al geïntroduceerd (H3); de bal-lijn begint pas als de speler Oma's 1953 kent |
| M05 | Wind tegen, beide kanten op | Herschrijven, verplaatsen | H3 | Fietsrace en padel als stadsminigame (Sjoerd); de camera-clue (drie minuten) gaat naar H12 |
| M06 | Het museum stond er al zo | Verplaatsen | H12 | De kraak is het midden van het slotstuk; unlock taxi gaat naar H7 |
| M07 | Al het vet van Grunn | Verplaatsen | H11 | Vet is een ingrediënt van Oma's recept (§7) en vracht een loopbaan |
| M08 | Fatbikes tellen niet als fiets | Verplaatsen | H11 | Oma Trijntje is al in beeld (H3); hier het recept zelf ophalen |
| M09 | Heel aankomen is ook een kunst | Behouden | H4 | Geesje en de eieren; de eieren zijn zaadje van het recept (nog zonder uitleg) |
| M10 | Een trekker-limo op de wierde | Herschrijven | H5 | Korte ontmoeting vanuit het limoraam (brief "Warffum in beheer"); Durk en Douwe aan het stuur; unlock "jelle" blijft |
| M11 | Geleend van de Friezen | Verplaatsen | H13 | Waterintro eerst (H8); deze achtervolging past in de provincietour |
| M12 | Het staat niet in het rooster | Herschrijven, verplaatsen | H9 | De lucht als eigen verhaalstuk; het "koopboek" als reden vervalt naar H13 |
| M13 | Het containerlabyrint | Behouden | H13 | Lammert Visser en de haven; handhaving-loopbaan |
| M14 | De dijk | Behouden | H13 | Zonsopgang en de deurwaarder: Jelles papier in actie |
| M15 | Laag over het graan | Verplaatsen | H9 | Roelfien (Oma's nicht), lucht; het meel is een recept-ingrediënt |
| M16 | Nog eentje dan | Herschrijven | H13 | Kermis in Winschoten; de kus in de botsauto wordt een bijna (§5); Jelle kort in beeld (zijn vierde ontmoeting) |
| M17 | Open, dicht | Behouden | H14 | Wubbo, elf bruggen; de mosterd is een ingrediënt |
| M18 | Wie draaide de camera's uit? | Behouden | H14 | Het logboek; blijft consistent met de kraak in H12 |
| M19 | Stoom | Behouden | H14 | De jury; stoomtrein als decor |
| M20 | Het beleg van Bourtange | Behouden | H14 | Mem in beeld, de bal terug, "Ja, mem." |
| M21 | Iedereen heeft een rode auto gezien | Herschrijven | H14 | Solo van Tessa zonder ruzie: praktische verdeling, de stilte wordt getoond (het perron) |
| M22 | Een luik erin | Behouden | H15 | Henk, het luik, de naam Tam & Tes, het horloge in pand |
| M23 | De colonne | Behouden | H16 | Elke loopbaan levert een voertuig of hulp |
| M24 | Er hangt iets Fries aan d'Olle Grieze | Behouden | H16 | De vlag; de Torenwachter meldt voor de derde keer |
| M25 | Het bod viel tegen | Behouden | H16 | De proefronde van het recept met alle vijf |
| M26 | Ontzet, net als in 1672 | Herschrijven | H16 | De vijf woorden "voor iedereen" worden de stille scène; Jelles ontknoping via zijn eigen verordening |
| M27 | Inpakken | Behouden | Nazomer | Vrije speeltijd; Willemien in Loppersum |
| M28 | De wisselwoning | Behouden | Nazomer | idem |
| M29 | Terug | Behouden | Nazomer | idem; podium-loopbaan |
| M30 | Het proefbeleg | Behouden | Nazomer | idem; golf-loopbaan; het Beleg als feest |

### 6.2 Activiteiten, reisbeats en tussenstappen

| ID | Titel | Advies | Nieuw (H) | Reden |
|---|---|---|---|---|
| N1 | Een klus voor Sjabbe | Behouden | H1 | Eerste bijbaan (klussen) |
| N2 | Een duif op de gang | Verplaatsen | H2 | Veldkamp als buur |
| N3 | Soep bij Beppe | Behouden, locatie herschrijven | H1 | Eerste verkenning buiten de stad; haar huis ligt binnen de provinciegrens |
| N4 | Een eerste ronde | Behouden | H2 | Taxi-proefrit en Dries als chauffeur van de bus naar huis |
| W1 | Half drie | Behouden | H1 | Zaadje voor Tessa's snackliefde en het recept |
| N5 | De boerderij in Warffum | Herschrijven | H4 | Wordt het bezoek aan de hoeve van Oom Hindrik (aanleiding boer) |
| N6 | Een dag op het water | Behouden | H4 | Klaas, hengelen |
| N7 | De streekbus naar Winsum | Verplaatsen | H7 | Chauffeur Dries; aanleiding vervoer |
| N8 | Een avond bij Oma | Verplaatsen | H3 | Oma Trijntje (Tessa's oma) en 1953 |
| N9 | Nacht op een dijk | Verplaatsen | H10 | Bijna 2; Rikus' busje |
| N10 | Een middag op het terras | Verplaatsen | H3 | Horeca-proeven; de terrasgast |
| N11 | Een bezorgrondje bij Bedum | Verplaatsen | H7 | Vervoer; zaadje 3 van het recept |
| N12 | De lijst op de koelkast | Verplaatsen | H10 | WIE KAN WAT, de lege regel SAMEN |
| K1 | Het land achter de pastorie | Behouden | H4 | Geesje |
| K2 | De kade in de ochtend | Verplaatsen | H8 | Water |
| K3 | Het havenkantoor in de nacht | Behouden | H13 | Lammert Visser |
| J1 | Post van de gemeente | Verplaatsen | H2 | De eerste brief van Jelle (de bureaucratische grap) |
| J2 | Een envelop in Appingedam | Behouden | H13 | Jelles papier |
| J3 | Koffie bij Tessa's ouders | Verplaatsen | H5 | Tessa's wortels, bij de hoeve |
| J4 | Een dubbele date in Veendam | Verplaatsen | H10 | Femke en Rikus; "dubbele friet" |
| J5 | Een wielklem in Stadskanaal | Behouden | H14 | De Escapade in de klem: Jelles papier |
| J6 | Beppe aan de deur | Behouden, licht herschrijven | H10 | Beppe leeft nog (nu klopt het); soep, de foto uit de Kiezelweek, hint 5 |
| V1 | Schoenen voor de ster | Herschrijven | H6 | Eerst de aanleiding (invaller bij VV De Hoek) |
| V2 | De eerste training | Herschrijven | H6 | Eerste ladderstap: Veendam; Femke als keeper |
| V3 | Het is jouw avond | Herschrijven | H6 | De eerste wedstrijd |
| A1 | De bietenoogst bij Hoogkerk | Behouden | H5 | Minigame boer; zaadje 2 |
| A2 | De kermisrit | Verplaatsen | H10 | Stadskermis; botsauto-bijna in H13 |
| T1 | De trein naar Warffum | Behouden | H4 | Eerste trein, Tessa wordt stil |
| T2 | De streekbus naar Zoutkamp | Behouden | H4 | Klaas |
| T3 | De trein naar Winschoten | Verplaatsen | H13 | Past bij de kermis |
| T4 | De bus naar Bourtange | Behouden | H14 | Tinus en Berend |
| T5 | De weg naar Bourtange | Behouden | Nazomer | Proefbeleg |
| F1 | Een wagen langs de weg | Behouden | H15 | De vondst |
| F2 | De eerste bak | Behouden | H15 | Hoogkerk, de loods |
| F3 | Soep en eierbal | Behouden | H16 | De twee oma's in één keuken |
| F4 | Foar mem, achteraan de rij | Behouden | H16 | Jelle in de rij; zonnebril af |
| F5 | Een avond voor twee | Herschrijven | H16 | Wordt de stille scène |
| F6 | De kaart op het luik | Behouden | Nazomer | Endgame: de standplaatsenkaart |
| E | Epiloog en slot | Herschrijven (aanvullen) | H16 | Beppe's overlijden, de begrafenis in Oudwoude (kernscène), de aftiteling; daarna de vrije nazomer |

### 6.3 Overgangsscènes en systemen

| Onderdeel | Advies | Reden |
|---|---|---|
| O1 (het kaartje van de eerste Kiezelweek) | Behouden | H1: de eerste relatiebeat |
| O2 (Rikus: "vijf jaar") | Herschrijven | H3: mag nog geen bekentenis zijn; wordt "sinds de Kiezelweek" zonder de aantallen |
| O3 (eerlijk winnen, Oma's 1953) | Verplaatsen | H11: de speler kent 1953 dan al uit H3 |
| O4 en O5 (Mem belt Tessa: "de jas", "Straks") | Verplaatsen | H11: Mem is eerst hoorbaar, in beeld pas H14 |
| O6 (Jelle biedt op het recept) | Verplaatsen | H11: het recept is dan bekend |
| O7 ("Over zaterdag") | Verplaatsen | H13 |
| O8 (de politie zoekt twee Stadjers) | Verplaatsen | H10 (bij N9) |
| O9 (apart: "Ik heb de auto") | Herschrijven | H14: stil, zonder ruzie |
| O10 (Jelles rekening voor de colonne) | Verplaatsen | H16 |
| O11 (Jelle bestelt een eierbal voor zijn oma) | Verplaatsen | H16 of nazomer |
| O12 (de flat na M30) | Behouden | Nazomer |
| Beppe-boog (`beppe_boog.js`, `beppe_visit_rules.js`, `BEPPE-HUIS-21-11.md`) | Herschrijven (verplaatsen) | Het overlijden verhuist van na M06 naar na het Ontzet (E); de bezoeken (eerste bezoek, soep, hints) lopen H1 tot en met H15; de herinneringsfase (kaars, foto, lege stoel, briefjes "Wat Beppe zou zeggen") begint pas in de nazomer; Oom Hindrik overlijdt niet (verzorgingshuis, schenking) |
| Politie en misdaad (`politie`, wanted-systeem, de kraak) | Behouden als komische bijrol | Drie vaste agenten (Wolthuis, Ensing, Bolhuis) met een eigen blad (§2.2); satirisch en licht, nooit getoond geweld (constitution 6): de agenten bekeuren, melden, drinken thee en komen te laat |
| Carrière-tour, reputatie, thuis (`careertour.js`, `reputation.js`, `homebase.js`) | Behouden, aanpassen | Koppelen aan de nieuwe loopbaan-aanleidingen en de groei (§4) |
| Wagen-flags `wagen:*` | Behouden | Het recept en de wagen zijn kleine grapjes in H1 tot H11 (`wagen:idee`), de naam in H15 (`wagen:naam`) |
| Romantiek-flags `romantiek:*` | Behouden | Alleen toevoegen; de stille scène krijgt een eigen flag |

### 6.4 Oma Trijntje is Tessa's oma: wat moet worden aangepast [canon, eigenaar 28-11]

Vastgesteld: **Oma Trijntje is de oma van Tessa; Beppe is de oma van Tammo.** Wat in code, dossiers, docs en opnames nu anders zegt, in één lijst voor de bouwronde.

| Plek | Nu | Aanpassen |
|---|---|---|
| `characterdossiers_leads.js:150` | naam "Trijntje Wierenga-Boelens", nick "Tammo zegt oma" | "Trijntje Mulder-Boelens"; nick "Oma Trijntje; heel de straat zegt Oma"; `household`, `storyRole`, `introducedBy` en `firstStep` (nu M07) naar H3 (N8) |
| `characterdossiers_leads.js:177` | canonNotes: "Tammo's oma (krentjebrijregel)" | Tessa's oma; de krentjebrijregel blijft (zij kent Tammo van kind af als buurvrouw) |
| `characterdossiers_relations.js:15` | tammo–trijntje: family, kleinzoon/oma | neighbours: buurjongen en buurvrouw ("Oma van de straat"), sinds zijn geboorte |
| `characterdossiers_relations.js:16` | anita–trijntje: friends, "vriendin van de kleinzoon" | family: kleindochter en oma, sinds haar geboorte; het recept is van haar oma |
| `characterdossiers_minor.js:305,310` | Opa Wierenga is "Oma Trijntjes man (voorstel)" | Tammo's opa is haar buurman en vriend, niet haar man; opa en Oma blijven vrienden uit 1953 |
| `characterdossiers_minor.js` (`tessa_pa`) | "Pa" zonder verwijzing | Pa Mulder is Oma Trijntjes zoon; `characterdossiers_test.mjs` laat de wederzijdse relaties controleren |
| `docs/VERHAALCANON-21-11.md` (rij "Oma Trijntje") en `docs/personages.md` (Oma Trijntje) | "Tammo is haar kleinzoon (de krentjebrijregel); Tessa kent haar uit de studietijd" | Tessa is haar kleindochter; Tammo kent haar als de buurvrouw uit zijn kindertijd |
| `09-script-akte2.md:65` (OMA TRIJNTJE, telefoon) | "Tammo, met je oma. Kom naar de Noorderhaven…" | **Opgenomen** (`Oma Trijntje\|Tammo, met je oma…` in `manifest.json`): nieuwe tekst ("Tammo, met Oma Trijntje.") en **opnieuw opnemen**; ook `cutscenes_akte2.js:118-119` (`on: 'Tammo, met je oma'`), `scripts/gronings_spoken.json:3073`, `game/storydata/script.json` (bouwen) |
| `09-script-akte3.md:155` (TAMMO) | "Het is niet eens van ons. Het is van mijn oma." | **Opgenomen** (`Tammo\|Het is niet eens…`): "Het is van Tessa's oma." of "Het is van Oma."; opnieuw opnemen; `gronings_spoken.json:1466` |
| `09-script-akte2.md:493` (app Tammo, stil) | "Het is mijn oma, dus ik." | Tekst aanpassen ("Het is jouw oma, dus ik ben te gast."); stil, geen opname |
| `09-script-akte5.md:211`, `missionstory.js:422`, `cutscenes_akte4.js:352`, `gronings_spoken.json:2756` (TAMMO) | "Oma… hoe zei opa het eigenlijk? Tegen jou." | **Blijft geldig** (opgenomen) mits opa haar buurman en vriend is (niet haar man): de regel blijft zoals hij is |
| `09-script-akte2.md:83-85` (M08.3, opgenomen) | "Eet je krentjebrij." / "Ik ben vierentwintig, oma." / "Dan eet je hem al vierentwintig jaar te weinig." | **Blijft geldig**: ze kent hem sinds zijn geboorte als buurvrouw; de hele straat zegt Oma |
| `09-script-akte2.md` (TESSA: "We slapen, Oma." enz.), `akte3`, `akte4`, `akte5` ("Zoals Oma zei.", "Oma Trijntje, Beppe.") | Tessa en Tammo zeggen "Oma" | **Blijven**: nu klopt Tessa's "Oma" zelfs beter |

Samen: **twee opgenomen regels opnieuw** (Oma Trijntje, Tammo), **één stille regel** (app), twee cutscene-verwijzingen (`on:`), de dossiers en de docs. De opnames wachten op de eerstvolgende opnameronde (`voice_wacht.json`, akkoord eigenaar).

---

## 7. Lopende motieven en wat vanaf het begin geplant wordt

### 7.1 Het recept van 1953 (het hart van de snackwagen) [canon, eigenaar 28-11]

Het recept (vet, eieren, zout, meel, mosterd: vijf ingrediënten van vijf vrienden) is van **Oma Trijntje**, Tessa's oma. Het wordt het hart van de snackwagen en komt in het slot terug; **Jelle zit er achteraan.** Het wordt vanaf het begin terloops geplant en over de hele lijn opgebouwd.

| Hoofdstuk | Wat de speler ziet | Rol |
|---|---|---|
| H1 | Een pot mosterd in de flat ("van Oma"); Tessa noemt "Oma's eierballen" | Zaadje: een gezellig detail |
| H3 | Oma Trijntje vertelt van 1953 en vertelt het recept als een gerecht: vijf ingrediënten, vijf vrienden; het prikbord met vijf namen | Uitleg: nog geen geheim |
| H4 | De eieren van Geesje | Ingrediënt 1 (zonder dat iemand het zegt) |
| H5 | "Dit zijn Oma's eieren" op de hoeve | Zaadje 2 |
| H7 | Tammo levert vet en mosterd af | Zaadje 3 |
| H8 | Zout van de Waddenkust (Zoutkamp) | Ingrediënt 3 |
| H9 | Meel van Roelfiens graan | Ingrediënt 4 |
| H11 | Oma legt de lijn bloot: "Wat jullie de hele zomer droegen, is mijn recept."; Jelle begint het recept op te kopen | Onthulling |
| H12 tot en met H14 | Jelle jaagt op het recept (de bal en het recept zijn twee kanten van zijn plan) | Spanning |
| H15 | Het recept wordt het menu van Tam & Tes | Uitbetaling 1 |
| H16 | Oma Trijntje erkent hardop dat Mems eierbal beter was; Mem krijgt "De Gerda" naast Oma's recept op de kaart van Tam & Tes; de oma's delen de standplaats | Uitbetaling 2 (ontknoping) |

### 7.2 Overige lopende motieven

| Motief | Planten | Doorlopend | Uitbetaling |
|---|---|---|---|
| **De standplaats en de snackwagen** | H1: bord op de Vismarkt en Tessa's grap "Daar zou ik wel willen staan." | H5, H8, H11: nog drie keer een grapje | H15 de wagen, H16 de standplaats |
| **Jelle in lagen** | H1 een klomp; H2 een brief, dan het Loket; H3 de omroeper | H4 "Warffum in beheer", H5 de limo, H9 de ballon, H10 het bord bij de Euroborg | H2 zijn gezicht (Loket), H5, H8, H11 en H13 korte ontmoetingen; H14 "Ja, mem."; H16 de ontknoping |
| **De bezwaartermijn: "zes weken, helaas drie dagen"** | H2: eerste brief | Elke brief; de omroeper hoest erover heen (H3, H6) | H16: de omroeper leest hem voor het eerst helemaal voor; de hele Grote Markt zegt hem mee |
| **De duiven die naar Tammo vliegen** | H2: Veldkamp | Bert, Rikus' radio, het litteken | Nooit uitgelegd (H16: een duif landt op het luik en niemand zegt iets) |
| **De complimentenladder** (bestaand: Goidag, Goud, Valt mie nait of, Braid noar de zin, Kon minder, niks meer) | H1: Berend | Elke figuur geeft een tree | H16: Tessa zegt "Kon minder." als hoogste compliment |
| **Tammo's horloge (opa)** | H1: hij kijkt erop | H15: gepand | H16: terug in zijn pet |
| **De koeienbel** | H4: Oom Hindrik | Hij hangt aan de hoeve en dan aan het luik | H16: de stille scène |
| **Beppe's hints en haar briefje "Houd elkaar vast. – B."** | H1 de eerste hint; H4 tot en met H15 zes meer, alleen tegen Tammo | Tessa hoort ze nooit; Beppe knipoogt | E: het briefje en de handen aan het graf in Oudwoude |
| **Het kaartje van de Kiezelweek** (bestaand) | H1 | Hangt aan de koelkast, zit in zijn zak | H16: beide samen |
| **De handschoen** | H6 | Zit in zijn jaszak | H16 |
| **De lijst WIE KAN WAT met de lege regel SAMEN** (bestaand) | H10 | De regel blijft leeg | H16: iemand schrijft "Tam & Tes" erbij |
| **De tag-lines van de bijfiguren** | Berend: "Nul krassen."; Sjabbe: "Ik vraag niks."; Henk: "Eén koekje."; de Torenwachter: "Ik meld alleen." (drie keer, dan "Ik klap.") | | |
| **De stad verandert, aangekondigd** | H1: het bord; H3: de omroeper kondigt het opbreken van het Stationsplein aan | H6: de Euroborg krijgt een tribune erbij; H8: de kade aan de Noorderhaven wordt vernieuwd | H7, H10, H11, H16: ze zijn klaar |
| **Fries tegen Gronings** | H1 | Elk hoofdstuk één plaaggrap | H16: de oma's |

### 7.3 Samen spelen (regel per onderdeel, zoals AGENTS.md eist)

- **De wereld is van wie het spel opende**; de hoofdlijn is **per speler** (eigen voortgang, #429): iedereen is lokaal de hoofdpersoon die de stap nodig heeft en ziet de ander als partner-NPC. Een gast speelt de hoofdlijn in de wereld van de host, **zonder gesprekken met bijfiguren** van een ander en zonder een stap van de ander.
- **Loopbanen** zijn altijd beschikbaar zodra je meedoet, ook voor een gast (hij mag meteen in elke loopbaan beginnen); ze kunnen samen in dezelfde club of op dezelfde hoeve, elk een eigen loopbaan in dezelfde wereld, tegen elkaar (voetbal, races) en met handel tussen spelers.
- **Beloning en voortgang** zijn per speler (§3.1 F). Valt iemand weg of sluit hij later aan: de recap ("Waar waren we?") en de naamkaarten volgen zijn eigen stand. Dekking: pure test voor de datalaag, testbankstap voor de scènes (bouwronde).
- **Emotionele scènes (Beppe, het afscheid, de stille scène, de aftiteling)** zijn per speler lokaal: iedereen ziet ze met zijn eigen voortgang (de scène is data in de verhaalstap en speelt op elk scherm). Een gast die later aansluit en de bijbehorende scènes niet speelde, krijgt de context via de recap "Waar waren we?" en een korte terugblik, nooit een scène die hij zonder voorgeschiedenis niet begrijpt (§3).
- **Evenementen** (het stadsfeest, de colonne, het Ontzet) zijn gezamenlijk: iedereen in de wereld doet mee en ziet ze; de beloning is per speler.

---

## 8. Besluiten en open vragen

### 8.1 Besloten door de eigenaar (28-11)

1. **Kalender:** decor, geen tijdlijn; de speler ziet geen datum; het Gronings Ontzet komt pas als het verhaal dat nodig heeft (§4).
2. **Oom Hindrik overlijdt niet** (verzorgingshuis, de hoeve is een schenking). **Beppe is het ene afscheid**, na het slot, in Oudwoude als **alleen een cutscene**.
3. **De kraak en de Gouden Eierbal** blijven zoals nu de slotmotor (H11 tot H14).
4. **Oma Trijntje is Tessa's oma** (§6.4: wat aangepast moet worden).
5. **Jelle krijgt eerder een gezicht:** korte, bureaucratische, komische ontmoetingen in H2, H5, H8, H11 en H13, de confrontatie in H16.
6. **Femke is de keeper en vriendin van Tessa** (keuze; het dossier past zich aan, spec en storyarc blijven); Marit vervalt.
7. **De boog "de ene oma was beter en kreeg nooit de eer"** vervangt de mosterd-twist (zie hieronder).
8. **De titel *Alles voor één eierbal* vervalt**; vijf voorstellen in §1.
9. **Nieuwe bijfiguren en de club SC Noorderlicht zijn akkoord.**
10. Eerder: perspectief en besturing zoals nu, Beppe-scènes verplicht, aftiteling emotioneel en grappig, provincie Groningen eerst, nooit echt falen, vervoer minimaal in het verhaal.

### 8.2 Toets van de erkenningsboog (besluit 7)

Past "de ene oma scoorde beter en kreeg nooit de eer" bij de twee oma's, de prijs van 1953 en Jelle's oma? **Ja, de code zegt het al.** In 1953 won Oma Trijntje de Noordelijke Snackprijs; **Jelle's oma Mem (Gerda Terpstra)** werd tweede. Oma Trijntje zegt in M08.3 (opgenomen): "Tweede werd Gerda Terpstra. Haar eierbal was beter." en "Haar kleinzoon, zeker. Ik heb het nooit gezegd." De oude canon had hetzelfde als slotregel ("Gerda. Jouw eierbal was beter."). Daarmee is Mem de oma die beter scoorde en nooit de eer kreeg, en is Jelle's hele drijfveer (groot lijken voor zijn oma, bewijzen dat Friesland beter is) een klein, begrijpelijk verdriet. De ontknoping (§4, H16) werkt dat uit: het originele juryformulier, Jelles onbehandelde *Verzoek tot herziening 1953* op zijn eigen bureau, Oma Trijntje die het hardop zegt, Mem die geen prijs hoeft maar de erkenning wil, de gedeelde standplaats en **De Gerda** als tweede eierbal. De mosterd-twist vervalt omdat de erkenning het sterkere, eenvoudiger gevoel geeft en omdat het recept van Oma Trijntje het hart van de wagen blijft (het recept is niet van twee oma's samen; de eer is dat wel).

### 8.3 Open voor de eigenaar (met voorstel)

1. **Welke titel?** *Voorstel:* *Een zomer in Grunn* (§1).
2. **De Gerda.** Een tweede eierbal op de kaart van de wagen, naar Mem, met een recept dat Tessa uit Mems appjes en de Ljouwert-zomers kent. *Voorstel:* ja, het houdt de erkenning in het spel (je kunt hem bakken en verkopen) en het sluit het recept-verhaal af zonder het recept van Oma Trijntje te veranderen.
3. **Aantal Jelle-ontmoetingen.** Zes korte ontmoetingen (H2, H5, H8, H11, H13, H16). *Voorstel:* zo laten; als het te veel wordt, vervalt de ontmoeting in H8 (de kade) en blijft die een brief.
