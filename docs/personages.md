# Personages van GDE Groningen

Deze personagebijbel houdt de personages consistent: in dialogen, telefoontjes, gesprekjes in de auto, TTS-tags en cutscenes. Per personage staat hier hoe hij of zij praat, wat ze leuk vinden, wat ze haten, hun running gags, en wat ze nooit zouden zeggen.

Regels die voor iedereen gelden:
- Het is **Grunn**, nooit "de Grunn". Stadjers zeggen gewoon **Stad**.
- Echte merken zijn niet toegestaan, parodieën wel.
- Echte bekende Groningers, typetjes of influencers kopiëren we niet. Tammo en Tessa zijn eigen personages: dus geen catchphrases van bestaande typetjes (zoals "Tou eem") en geen grappen over bieten.
- De humor komt van **understatement**. Het hoogste compliment is *"Kon minder."*
- Fries is een kruiderij, geen hoofdgerecht. Friese zinnen krijgen altijd een Nederlandse ondertitel (FY in `subtitles.js`).
- De TTS-stemmen en basistags staan in `scripts/tts_lines_list.mjs` (`CAST`), die van Tammo en Tessa in `scripts/tts_cast.mjs` (`DUO`). Houd de tags hieronder daarmee in lijn.
- Elk personage heeft een eigen kleur voor zijn naam in de ondertitels (zie **Sprekerskleuren** onderaan, `game/js/speakers.js`).
- Het verhaal staat in `docs/verhaal/nieuw/00-OVERZICHT.md`: één Groningse zomer, de laatste twee weken van augustus (Kop: KEI-week, Romp: Noorderzon, Staart: kermis en Gronings Ontzet op 28 augustus), met een epiloog in september.
- Bij de eerste ontmoeting krijgt elk personage een **naamkaart** in trailerstijl: de naam in Bebas en één droge regel (`CHARACTERS` in `game/js/storyarc.js`, getoond door `namecard.js`). Daar staan ook een korte bio en een citaat per personage.
- De **complimentenladder** komt overal terug: Ow → Goud → Valt mie nait of → Braid noar de zin → Kon minder → stilte, met een *kloet in de strotte*.

---

## Tammo
**In één zin:** een droge Stadjer met een groot hart en een kleine portemonnee, die liever een grap maakt dan toegeeft dat hij iets eng vindt.

**Naamkaart:** *Stadjer. Groot hart. Kleine portemonnee.* Tammo, Tessa en Rikus zijn het clubje van de stoep in het Oosterpark. Tammo is al twaalf jaar verliefd op Tessa en zegt het nooit; pas in de finale: "Ik wil bij jou blijven." Vijf woorden. Daarvoor zegt hij hooguit "Woist ja wel", zoals zijn opa.

- **Stem:** Orus, ingesproken in Gronings dialect: *a born and bred Stadjer from the Oosterpark; dry, deadpan man in his thirties*. Daardoor zegt hij soms een Gronings woord waar de ondertitel Nederlands heeft ("Mien droom"). Emoties: droog, laconiek, zuchtend, deadpan, stiekem trots. Hij schreeuwt alleen als het echt misgaat, en dan klinkt hij "feller dan normaal".
- **Zo praat hij:**
  - korte zinnen;
  - understatement: "Viel mee." na een ontploffing;
  - reageert op chaos met een droge observatie;
  - zegt "mien wicht" tegen Tessa als hij het meent.
  - Gronings in kleine doses: *moi*, *kon minder*, *nait soezen*, *goud*.
- **Stopwoorden:**
  - "Kon minder."
  - "Dat is… één manier om het te doen."
  - "Ik zeg niks." (en dan zegt hij iets)
- **Houdt van:**
  - eierballen, en dan wel warm;
  - zijn rode **Fjord Escapade**, die nauwelijks rijdt. Die wordt aan het eind, met een luik erin, de eerste Fjord Frituur;
  - FC Groningen en Oosterpark-nostalgie;
  - d'Olle Grieze als baken ("dan ben ik thuis");
  - fietsen tegen de wind in, omdat dat karakter bouwt.
- **Haat:**
  - koude snacks;
  - omleidingen, met name Ring Zuid en de Krolbrug;
  - Friese opschepperij;
  - mensen die "de Grunn" zeggen;
  - haast.
- **Running gags:**
  - hij kan nooit iets betalen;
  - hij praat tegen zijn auto;
  - hij noemt elk gebouw bij de bijnaam: de Apenrots, het Cruiseschip, de Kiekdeuse;
  - hij verliest altijd van Tessa als hij gelijk wil hebben;
  - hij is eigenwijs en zit er soms gewoon naast; blijkt hij ongelijk te hebben, dan zegt hij droog: "Dat bedoelde ik ook.";
  - Tessa appt met "iemand uit Friesland" en Tammo wordt daar stilletjes jaloers van ("Is hij lang? Fierljepper zeker."). Het blijkt Mem Terpstra te zijn: "…Een moeder. Ik was jaloers op een moeder.";
  - Rikus van Nachtstreek is zijn jeugdvriend uit het Oosterpark en plaagt hem op de radio.
- **Gave: duivenfluisteraar.** Tammo kan duiven sturen. Hij wordt geen duif: hij fluit of klikt met zijn tong, doet zijn ogen dicht en "springt" met de camera in de duif. Zo werkt de duivenmodus.
  - Bert ontdekt het in H4 ("Kiek. Die duiven luuster'n noar dij, jong."); Tammo doet er droog over ("Duiven luisteren naar niemand."), Tessa plaagt ("mijn vriend de duivenkoning").
  - Het groeit: de vlag in H10 ("Ik fluit. De duif pikt."), de duiven boven het vuurwerk in de finale, Rikus maakt er een jingle van, en Jelle is jaloers ("Friese meeuwen luisteren naar niemand.").
  - Verhaalstappen met een duif speelt Tammo. Speel je Tessa bij een duivenbord, dan lukt het niet, en dat zegt ze ook ("Ik ben geen duivenkoning. Ik ben de baas van de duivenkoning.").
- **Nooit:**
  - grote emotionele speeches (als hij iets meent, zegt hij het in vijf woorden);
  - Fries;
  - "super" of "echt amazing".
- **Voorbeeldzinnen:**
  - "Een gouden eierbal. En wij hebben nog geen gewone."
  - "Het museum heeft camera's. Ik heb een pet."
  - "Wij tweeën vóór Grunn. Kon minder, hè?"

## Tessa
**In één zin:** snel, ad rem en de baas van het duo. Ze lacht om alles behalve om mensen die haar droom kleineren.

**Naamkaart:** *Heeft altijd een plan B. Plan A is ook van haar.* Ze heeft geen auto; haar droom, de blauwe frietwagen, komt op Tammo's Escapade ("De Fjord Frituur, op een Fjord. Dan klopt de naam ook.").

- **Stem:** Callirrhoe. Basistag: *Groningse vrouw, lacherig en ad rem*. Emoties: plagend, zelfverzekerd, enthousiast, bazig, warm, grinnikend.
- **Zo praat ze:**
  - snel, ze onderbreekt Tammo;
  - stelt retorische vragen: "Heb jij een plan? Nee. Ik wel.";
  - geeft instructies als bevelen.
  - Gronings als ze boos of ontroerd is: "Doe bist nait goed wies!"
  - Zij weet het meestal beter: feiten, de juiste route, de regels, de Groningse geschiedenis. Dat maakt haar soms een beetje een betweter, en dan plaagt Tammo: "Daar gaat Tessa, de wandelende Wikipedia van Stad."
- **Stopwoorden:**
  - "Tammo. Tám-mo."
  - "Rijden, niet praten."
  - "Dat regel ik wel even."
- **Houdt van:**
  - haar droom, de **Fjord Frituur**, een eigen frietwagen;
  - rijden, en vooral hard;
  - de rondvaart en het water;
  - het Noorderplantsoen bij de eerste zon;
  - winnen;
  - Oma Trijntje.
- **Haat:**
  - wachten;
  - mannen die uitleggen hoe ze moet rijden;
  - Jelle's charme ("daar trapt heel Friesland in, ik niet");
  - slappe friet.
- **Running gags:**
  - ze heeft altijd al een plan B;
  - ze parkeert overal waar het niet mag;
  - ze weet van elke Groninger wie z'n oom is;
  - ze doet alsof ze de kus op de boot niet heeft zien aankomen;
  - ze kent "iemand uit Friesland" en zegt niet wie. Ze krijgt appjes die ze wegklikt ("Niks. Iemand uit Friesland.") en weet rare Friese dingen (hoe je suikerbrood roostert). Het is Mem Terpstra, die in H16 op Nachtstreek belt over de trein naar Ljouwert, perron 3.
- **Nooit:**
  - opgeven;
  - hulpeloos gillen;
  - Fries (ze imiteert Jelle wel, en slecht).
- **Voorbeeldzinnen:**
  - "Eén eierbal, Tammo. Eén. En dan heb ik mijn frietwagen."
  - "Hij bedankt ons. Hij. Bedankt. Ons."
  - "Vóór Grunn. Niet vóór de centen. Nou ja, ook een beetje de centen."

## Jelle Terpstra
**In één zin:** de ijdele, charmante Friese snackbaron van *Us Mem Snacks*, die vindt dat alles wat lekker is eigenlijk Fries is. Hij is de schurk, maar vooral ijdel en nooit echt gemeen.

**Naamkaart:** *Snackkoning. Fries. Heel tevreden met zichzelf.* Eigenlijk is hij een zoon die zijn moeder gelijk wil geven. Zijn **Operaasje Aaibal** heeft vier stappen: de wisseltrofee van de Noordelijke Snackprijs stelen, al het frituurvet opkopen zodat geen Stadjer kan bakken, Stad vernederen, en op Gronings Ontzet winnen, zodat de bal volgens artikel 4 van het reglement van Friesland is. "Foar mem." Zijn moeder wil dat helemaal niet. Hij belt graag in bij Nachtstreek ("Gezellig programma.") en flirt met "famke in het rood".

- **Stem:** Fenrir. Basistag: *ijdele, charmante Friese ondernemer, spreekt Nederlands met Friese woorden*. Emoties: charmant, opschepperig, zelfvoldaan, plechtig, en betrapt als het misgaat.
- **Zo praat hij:**
  - Nederlands met Friese woorden erin: *moai*, *tige tank*, *oant sjen*, *wis en wrachtich*, *Grinzers*;
  - elke zin is reclame voor zichzelf;
  - hij praat in de derde persoon als hij trots is ("Jelle wint altijd.").
  - Hooguit één volledig Friese zin per scène, altijd met een Nederlandse ondertitel.
- **Stopwoorden:**
  - "Moai, Grinzers."
  - "Tige tank!" (ook als hij iemand beroofd heeft)
  - "Dat is Fries. Wis en wrachtich."
- **Houdt van:**
  - zichzelf;
  - zijn zwarte **trekker-limousine**;
  - fierljeppen ("de enige manier om over water te gaan");
  - skûtsjes, pompeblêden en Elfsteden-nostalgie;
  - camera's, livestreams en publiek.
- **Haat:**
  - verliezen;
  - natte pakken (hij valt dus vaak het water in);
  - het woord "Stad" als het over Grunn gaat;
  - eierballen, tot hij er een proeft.
- **Running gags:**
  - elke ontsnapping is een polsstoksprong, en de laatste gaat mis;
  - hij stuurt kaartjes met "Tige tank! – J.", zo beleefd is hij;
  - hij noemt zijn tweeling-handlangers bij de verkeerde naam;
  - zijn livestreams hebben altijd drie kijkers, waarvan één zijn moeder;
  - hij is jaloers op Tammo's duiven: "Friese meeuwen luisteren naar niemand. Ook niet naar mij.";
  - tegen zijn moeder zegt hij alleen "Ja, mem." In de finale laat zij hem de eierbal proeven.
- **Nooit:**
  - echt geweld of haat;
  - vloeken;
  - Groningers dom noemen. Het is vriendschappelijke rivaliteit: aan het eind geeft hij toe dat de eierbal lekkerder is.
- **Voorbeeldzinnen:**
  - "Grinzers! Jullie gouden bal… ik heb hem even geleend. Tige tank!"
  - "Dit is… better as ús. Net fertelle." (NL: *Dit is… beter dan de onze. Niet doorvertellen.*)
  - "Oant sjen!" *(plons)*

## Durk & Douwe
**In één zin:** Jelle's Friese tweelinghandlangers: groot, traag en trouw. Ze zijn samen één brein en dat deel ook nog.

- **Stemmen:**
  - Durk: Algieba, *grote trage Friese handlanger, zwaar Fries accent*.
  - Douwe: Algenib, *tweelingbroer van Durk*.
  - Emoties: traag, verward, berustend. Durk kan ook dronken en lallend.
- **Uiterlijk:**
  - allebei in een rode hoodie;
  - Durk heeft een blauwe muts en een baard, Douwe een witte muts en een snor.
- **Zo praten ze:**
  - Nederlands met een zwaar Fries accent;
  - ze maken elkaars zinnen af, verkeerd;
  - Douwe herhaalt het laatste woord van Durk.
- **Stopwoorden:**
  - Durk: "Net fertelle, hè?" (hij vertelt het dan meteen)
  - Douwe: "…hè."
  - Samen: "Baas zegt."
- **Houdt van:** Jelle, fatbikes (met z'n tweeën op één), frituurvet, synchroon zwemmen en klompen (om geld in te bewaren).
- **Haat:** trappen, snelheid, nadenken en water. Toch belanden ze er steeds in.
- **Running gags:**
  - ze doen alles synchroon, ook in het water vallen ("Plons.");
  - Durk verklapt elk geheim zodra hij één biertje ophad;
  - ze betalen contant, uit een klomp.
- **Nooit:** slim zijn op het goede moment, en gemeen zijn.

## Berend Bos
**In één zin:** de chagrijnige Stadjer uit de Schildersbuurt die al veertig jaar **Bommen Berend** speelt in het naspel van het Ontzet: elk jaar valt hij de stad aan, en elk jaar verliest hij. Hij schrijft de gemeente brieven. Kort, nors, en stiekem trots op Tammo en Tessa.

**Naamkaart:** *Speelt veertig jaar Bommen Berend. Verliest elk jaar.* (De echte Bommen Berend was de bisschop van Münster, in 1672.)

- **Stem:** Charon. Basistag: *Berend Bos, chagrijnige oude Stadjer die al veertig jaar Bommen Berend speelt*. Emoties: nors, stiekem trots, mopperend, verbaasd.
- **Zo praat hij:**
  - korte, grommende zinnen;
  - complimenten verpakt als klacht;
  - veel Gronings: "Wat mout, dat mout.", "Kom mor.";
  - noemt Tammo en Tessa "dat stel".
- **Houdt van:**
  - zijn bakkie;
  - Gronings Ontzet (28 augustus);
  - de Martinitoren;
  - koffie zwart;
  - vroeger, toen alles beter was.
- **Haat:**
  - fatbikes;
  - verandering;
  - Friezen, al blijkt later dat dat wel meevalt;
  - mensen die zijn naam te luid uitspreken;
  - de nieuwe Grote Markt.
- **Running gags:**
  - elke NPC legt anders uit wie er in 1672 nou eigenlijk won, en Berend wordt daar boos om;
  - hij schreef in 1977 een brief over de sectoren in het centrum, en daarna elke week;
  - hij is jurylid in de finale en loopt hardop de complimentenladder af; bij de Groninger eierbal zegt hij niks meer: een kloet in de strotte, de hoogste trede.
  - "Goidag" tegen vreemden, en "Moi" alleen als hij je mag (tegen Tessa, in H1).
- **Voorbeeldzinnen:**
  - "Zo. Jullie zijn dat stel waar heel Grunn over kletst? Ik had er meer van verwacht."
  - "Kon minder." *(= hij is diep ontroerd)*

## Rikus
**In één zin:** Tammo's jeugdvriend uit het Oosterpark, nu de nacht-dj van *Radio Nachtstreek*, die het verhaal van Tammo en Tessa vertelt alsof het een oude legende is, en daarna de lucht eruit prikt.

- **Stem:** Schedar (ook op Nachtstreek: één stem). Basistag: *Rikus, Groningse nacht-dj en verteller, jeugdvriend van Tammo, warm en droog*. Emoties: vertellend, droog met een knipoog, plagend, trots.
- **Uiterlijk:** FC-groen jack, stoppelbaard, dik montuur, een buikje van de nachtdiensten, studiokoptelefoon (`RIKUS_LOOK` in `storycast.js`).
- **Zo praat hij:**
  - als op zijn nachtprogramma: "Hier is Rikus, op Nachtstreek. Luister, ik vertel je hoe het zat met die twee.";
  - plechtig begin, droge afsluiter: "Grunn. Tweehonderdduizend mensen, driehonderdduizend fietsen en één toren die alles ziet.";
  - vertelt nooit meer dan de speler al weet.
- **Houdt van:** Tammo (maar dat zegt hij niet), Tessa's frietwagenplan (hij wil de eerste friet, en krijgt de tweede), het Oosterpark van vroeger, nachtmuziek van hier.
- **Haat:** haast, stilte op de radio, mensen die "de Grunn" zeggen.
- **Running gags:**
  - hij plaagt Tammo op de radio: de duivenfluisteraar van het Oosterpark, met jingle;
  - hij weet dat Tessa appt met Friesland, en zegt het hardop;
  - hij betaalt nooit, behalve voor die tweede friet.
- **Wanneer:** elke missie begint met **Bel Rikus** op Nachtstreek: een Stadjer met een probleem belt in (de radiokaart op de telefoon, zijn stem in de radioklank). Na missies volgen de rubrieken: de **fietstunnel-update** ("Bijna klaar", het jaartal schuift elke keer op), het **storingsbericht** (de Krolbrug, in de Staart achttien bruggen tegelijk), de **torenwachter** en de peiling **"Woist ja wel?"** (zijn ze het of niet?). Verder: de opening, de terugblik aan het begin van elk deel, live op de Grote Markt bij de finale ("Nachtstreek, in het daglicht. Ik voel me een vleermuis.") en het slot vanuit de studio.
- **Voorbeeldzinnen:**
  - "Moi, hier is Rikus, op Nachtstreek. Luister. Ik vertel je hoe het zat met die twee."
  - "De tweede was voor mij. Zelf betaald, natuurlijk. Hier was Rikus, op Nachtstreek. Welterusten, Grunn."

## Mem Terpstra
**In één zin:** Jelle's moeder, de "Mem" van *Us Mem Snacks*, een oude vriendin van Oma Trijntje uit 1953 en de enige naar wie Jelle luistert.

- **Stem:** Gacrux. Basistag: *warme, stellige oude Friese moeder, spreekt Nederlands met Friese woorden*. Emoties: warm, stellig, samenzweerderig.
- **Uiterlijk:** marineblauwe jas met een witte kraag, bril, grijze knot en de pompeblêd-rode sjaal die haar zoon van haar afkeek (`MEM_LOOK` in `storycast.js`).
- **Zo praat ze:** kort en stellig, Nederlands met Friese woorden (*famke*, *jonge*, *myn*, *net fertelle*), altijd met een Nederlandse ondertitel.
- **Naamkaart:** *Iemand uit Friesland.* Voluit **Gerda Terpstra** uit Ljouwert.
- **Rol:** in 1953 werd ze als jonge bakster tweede bij de Snackprijs, tegen Trijntje, met de betere eierbal. Haar zoon heeft dat nooit losgelaten; zij wel. Ze appt Tessa stiekem ("Pas op dysels, famke. – M."), belt in H16 naar Nachtstreek over de trein naar Ljouwert, en in de finale zegt Trijntje het eindelijk: "Gerda. Jouw eierbal was beter." "Dat duurde lang." Dan laat ze Jelle proeven: "Priuw, jonge." Op het bordje in het museum komt haar naam erbij.
- **Nooit:** gemeen, of partij kiezen tegen haar zoon (ze wil alleen dat hij eerlijk verliest).

---

## Bijrollen (kort)
| Personage | Kern | Stem en tags | Kenmerk |
|---|---|---|---|
| **Sjabbe** | sluwe heler, koopt alles | Rasalgethi, *hees, zakelijk* | "Wat denk je dat het waard is? De helft." |
| **Jelmer** | hyperactieve streamer | Puck, *jong, hyper* | leest chats hardop voor, verzint trends |
| **Sjoerd** | droge wedstrijdleider (KEI, races) | Umbriel, *droog, schamper* | "Regels zijn regels. Behalve de mijne." |
| **Henk** | gemoedelijke garagehouder, monteur | Sadaltager, *gemoedelijk* | belt als je auto schade heeft, noemt elke deuk "een karaktertrekje" |
| **Harm** | wegwerker, twintig jaar Ring Zuid | Alnilam, *gemoedelijk, trots* | "Vorig jaar was het de voorlaatste." |
| **Geert** | joviale kroegbaas | Zubenelgenubi, *joviaal, roddelend* | weet alles van iedereen, vertelt het voor een biertje |
| **Femke** | gehaaste festivalmaker (Noorderzon) | Leda, *gehaast, enthousiast* | alles moet "gisteren" |
| **Oma Trijntje** | 92, won in 1953 de Snackprijs met de beste eierbal van Stad (haar handjes om de bal op de foto); de tweede mentor | Sulafat, *warm, stellig* | wist dat Gerda's eierbal beter was en zei het zeventig jaar niet: "Ik ben Gronings. Wij zeggen het één keer. Dan is het waar." |
| **Kapitein Klaas** | schorre schipper | Enceladus, *schor, knipogend* | kent elke brug, praat tegen zijn boot |
| **Hilly** | nieuwsgierige vrouw, plat Gronings | Despina, *kletserig* | ooggetuige in "Waar is de Fjord?" |
| **Dokter Dijkstra** | nuchtere traumaarts en heli-piloot | Sadachbia, *droog, zakelijk* | "Dit stond niet in het rooster." |
| **Duivenmelker Bert** | oude wijze duivenman | Iapetus, *zacht, wijs* | praat over duiven als over mensen; ontdekt dat de duiven naar Tammo luisteren |
| **Schipper Wiebe** | boze rondvaartschipper met megafoon | *luid, woedend* | scheldt je uit, maar alleen in tegeltjeswijsheden |
| **Aaltje & Grietje** | twee droge commentaarkoeien | Zephyr en Autonoe, *deadpan* | commentaar op je chaos; Aaltje sceptisch, Grietje wijs |
| **Rotor Roelf** | joviale helikopterverkoper van Eelde | Achird, *joviaal, verkoperig* | geeft een gratis proefvlucht aan iedereen die "misschien" koopt: "En nait tegen d'Olle Grieze aan, hè?" |
| **De torenwachter** | hele oude man boven in d'Olle Grieze, alleen een stem aan de telefoon | Iapetus, *oud, droog, onverstoorbaar* | belt Tammo en Rikus over wat hij ziet: "Ik meld alleen." |
| **Snackbarhouder** | veertig jaar open in de Oosterpoort, lege pannen | Rasalgethi, *wanhopig, dan juichend* | "Vet! Valt mie nait of!" |

## Hoe Tammo en Tessa met elkaar omgaan
- Tessa leidt, Tammo relativeert. Maar als het er echt op aankomt, is Tammo degene die het goede zegt, en in vijf woorden.
- Ze plagen elkaar constant, maar kritiek van buitenaf pikken ze niet: dan staan ze pal voor elkaar.
- Hun bedoeling verschuift van **"Alles voor één eierbal"** (voor de centen en Tessa's frietwagen) naar **"Wij tweeën vóór Grunn"** (de eierbal hoort bij Stad).
- **De romance in vijf stappen:** Kop: beste vrienden, ze zeggen "goidag" tegen vreemden en niks tegen elkaar. H6: elkaars hand in het donker, "Voor de grip." Romp: jaloezie (Jelle, "iemand uit Friesland") en een "moi" dat net te zacht is. H13: "Moi." "…Moi." Dan de kus, en daarna doen ze alsof er niks gebeurd is. H16: ruzie, "Jij zegt nooit iets." H18: "Woist ja wel." "Dat telt. Maar ik wil het één keer horen." "Ik wil bij jou blijven." 
- Wie een verhaalstap speelt, past bij wie ze zijn:
  - **Tessa:** rijden, regelen, praten met mensen, water;
  - **Tammo:** sluipen, fietsen, doorzetten, droog blijven onder druk, en alles met duiven.
- **Het ritme van hun gesprekjes** (inspiratie: de warme, kibbelende vriendschap uit oude kinder-tv, zonder namen of zinnen te lenen): korte heen-en-weertjes, elkaars zinnen verkeerd afmaken, kleine misverstanden en woordgrapjes, en dan een zachte verzoening ("…Nou ja."). Tammo is de eigenwijze die stellig iets zegt en er soms gewoon naast zit ("Dat bedoelde ik ook."); Tessa is de verstandige die meer weet, en soms een beetje saai wordt over regels en plannen. Ze plagen, maar staan altijd aan dezelfde kant en zorgen voor elkaar.

## Sprekerskleuren
Elke naam staat vet in de eigen kleur voor de zin ("**Tammo:** tekst"), in cutscenes, ballonnetjes, telefoontjes, autogesprekjes en de telefoon. De kleuren staan in `game/js/speakers.js` (`SPEAKER_COLORS`); ze hebben allemaal een luminantie van ongeveer 0,18-0,30, zodat ze leesbaar zijn op de donkere ondertitelschaduw én op het lichte tekstballonnetje. Tammo en Tessa zijn blauw en oranje (het Okabe-Ito-paar), dus ook bij kleurenblindheid goed uit elkaar te houden.

| Personage | Kleur | | Personage | Kleur |
|---|---|---|---|---|
| Tammo | `#2a8ad4` blauw | | Tessa | `#d86b00` oranje |
| Rikus | `#a35ad6` paars | | Jelle Terpstra | `#d93a63` pompeblêd-rood |
| Mem Terpstra | `#c0507a` bessenrood | | Durk | `#3f9a3f` groen |
| Douwe | `#20968a` blauwgroen | | Berend Bos | `#a47a34` oker |
| Oma Trijntje | `#cc5f90` roze | | Sjabbe | `#8c8a3c` olijf |
| Jelmer | `#a38a00` mosterd | | Sjoerd | `#5f9848` grasgroen |
| Henk | `#6f8bb0` staalblauw | | Harm | `#a5823c` zand |
| Geert | `#b27850` koper | | Femke | `#b464c4` orchidee |
| Kapitein Klaas | `#3f86a8` zeeblauw | | Duivenmelker Bert | `#7282c4` duifblauw |
| Dokter Dijkstra | `#dd4b44` rood | | Hilly | `#c0609e` fuchsia |
| Schipper Wiebe | `#cf5a2e` roestoranje | | Koe Aaltje / Grietje | `#818b58` / `#94866e` |
| Rotor Roelf | `#2a9ab8` hemelsblauw | | Torenwachter | `#9a8f6a` steen |
| Voorbijgangers, bazen, radio en navigatie | `#8a8a8a` neutraal grijs | | | |
