> **Archief (oktober 2026).** Dit document is vervangen door `.specs-fire/standards/verhaal.md`; het verhaal zelf staat in `docs/verhaal/nieuw/`.
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.
> Relatieve links in dit document verwijzen naar de oude plek in `docs/` en
> werken hier niet meer.

# Verhaalvoorstel GDE Groningen: "Alles voor één eierbal"

Ontwerpvoorstel, nog geen code. Reageert op de playtestfeedback: geen duidelijk eindspel, te weinig hoofdmissies, de speler moet zelf zoeken wat te doen, Tammo en Anita zeggen weinig tegen elkaar, en er is geen trailer.

---

## 1. Het grote verhaal

### De haak die al in het spel zit
De intro belooft al veel: de kaart *"Alles voor één eierbal"*, Anita's zin *"De mijne heeft vier wielen en geen kenteken"*, en ze *"pinnen met de hele automaat"*. Dit voorstel maakt van die hints de rode draad:

- **De Gouden Eierbal**: een 18-karaats beeldje uit 1953, het "stadsjuweel" van Grunn, te zien in het Groninger Museum. Onbetaalbaar en onverzekerbaar, en precies wat een blut stel wil jatten.
- **Anita's droom**: een eigen foodtruck, de *Fjord Frituur*: vier wielen, geen kenteken. **Tammo's droom**: dat Anita blijft. (En een eierbal.)

### De schurk: Jelle Terpstra, "De Fryske Snackkening"
- Welgestelde Friese ondernemer, baas van **Us Mem Snacks** (parodie; naar het koeienbeeld, geen echt merk). Hij rijdt in een opgevoerde, zwarte **trekker-limousine** met pompeblêd-achtige vlaggetjes.
- Zijn motto is *"Wat Grunn kin, kin Fryslân better."* Hij zegt "Moai!" waar Grunn "Moi" zegt, noemt de stad "dat grutte doarp" en de Martinitoren "in aardich tuorke". Hij is ijdel, charmant en nooit echt gemeen.
- Zijn plan heet **Operaasje Aaibal**. Hij steelt de Gouden Eierbal, zet alle frituren in Grunn droog en wint op **Gronings Ontzet (28 augustus)** de Noordelijke Snackprijs met zijn "Fryske Aaibal". Daarmee is de eierbal "officieel Fries".
- Hij heeft twee handlangers: de tweeling **Durk & Douwe**, groot, loyaal, een tikje traag, altijd samen op één fatbike.
- Zijn gimmick is **fierljeppen**. Bij elke ontsnapping springt hij met een polsstok over een gracht. In de finale gaat dat één keer mis.
- De toon is een vriendschappelijke rivaliteit, zoals een derby tussen twee buren. Friesland is nooit "slecht", Jelle is gewoon een verwaande buurman. Aan het eind proeft hij een echte eierbal: *"Dit is… better as ús. Net fertelle."*

### Kop, romp, staart

| Deel | Speeltijd | Wat er gebeurt | Doel Tammo & Anita |
|---|---|---|---|
| **Kop: "Moi, Grunn"** | 0:00–1:10 | Blut stel doet klusjes en hoort van de Gouden Eierbal. Ze verkennen en plegen de kraak, maar de vitrine is leeg. Er ligt een kaartje: *"Tige tank! – W."* | Geld, dan de Eierbal jatten en verkopen |
| **Romp: "Stad in rouw"** | 1:10–3:00 | Jelle's plan komt bloot te liggen. Bondgenoten (de bestaande NPC's) helpen, de relatie groeit. Middelpunt: de kus na de rondvaart. | Uitzoeken waar de Eierbal is |
| **Staart: "Gronings Ontzet"** | 3:00–4:00 | De speler kraakt Jelle's skûtsje, jaagt per heli op een ballon, redt de Fjord en speelt de finale op de Grote Markt. | Niet meer jatten maar **terugbrengen**: "Wij tweeën vóór Grunn" |

De omslag in één zin: in de kop willen ze de Eierbal *voor zichzelf*, in de staart *voor de stad*. De bestaande slotzin van missie 8, *"Wij tweeën tegen Grunn"*, krijgt in de finale een echo: *"Wij tweeën vóór Grunn."*

**Einde**: de Eierbal gaat terug naar het museum en de beloning betaalt de Fjord Frituur. Laatste shot: Anita geeft Tammo de allereerste eierbal uit hun eigen truck. *Alles voor één eierbal.* Na de aftiteling blijft de wereld open en daagt Jelle je uit voor herspeelbare races (zie H-post).

---

## 2. Hoofdmissies (8 bestaand + 10 nieuw)

[B] = bestaande missie (volgorde en teksten uit `missions.js` en `missionstory.js` blijven), [N] = nieuw. *Vereiste* is een poort die de begeleide flow (§3) vanzelf aanbiedt.

### Kop
| # | Titel | Locatie | Gameplay | Vereiste | Beloning | Verhaalstap |
|---|---|---|---|---|---|---|
| H1 [B] | Bommen Berend wil z'n bakkie | Martinikerkhof naar Boterdiep | Bezorgen, schadevrij | – | €250 | Berend: *"Er wou hier al een Fries m'n bakkie kopen. Contant, uit een klomp."* Eerste hint naar Jelle. |
| H2 [N] | Pinnen met de hele automaat | Herestraat naar pandjeshuis *Pand & Poen* | Ontsnappen bij 2 sterren, daarna naar *Spuit & Klaar* voor een nieuwe kleur, afleveren | – | €400, korting bij de spuiterij | Vervolg op de intro. De pandjesbaas: *"Te weinig voor jullie droom. Echt geld ligt in het museum."* Het doel is gezet. |
| H3 [B] | Chaos op de Grote Markt | Grote Markt | Rampage | Wapen gekocht bij *Pang & Zo* | €300 | In Jelmers stream-chat verschijnt "JelleWâld": *"Moai stedsje. Foar in wykein."* |
| H4 [N] | Duif op verkenning | Stationsplein-duiventil naar Groninger Museum | Duif-modus: vlieg rond het museum en "spot" 3 camera's en 2 bewakers (zweven boven het doel = foto) | – (introduceert duif-modus) | €200 | Er staat al een zwarte trekker-limo bij de achteringang. |
| H5 [B] | KEI-weekrace door Grunn | Academiegebouw | Checkpointrace | Een fiets (KEI-week is een fietsrace) | €350 | Tweede wordt studententeam "Snits Snel", gesponsord door Us Mem Snacks. |
| H6 [N] | De Museumkraak | Groninger Museum, 's nachts, via het Verbindingskanaal | Het plan op een bouwtekening en een keuze: sluipen via de achterdeur (slotje openpeuteren) of vermomd als schoonmakers (pasje rollen). Camera's op herhaling via de stroomkast, bewakers met zaklampen, lasers in zaal 3, de vitrine kraken (1953), dan alarm: rennen naar de boot die Tammo brengt en een bootvlucht bij 3 sterren | Kleding *Zwart incognito* **of** een boot gehuurd bij *Bootje Huren*; nacht (wachten bij de garage) | €150 (verzekeringsfoto van de lege vitrine) en Jelle als contact in de telefoon | **Einde kop.** De vitrine is leeg. Kiekdoar: *"Gouden Eierbal foetsie. Stad in rouw."* Jelle's livestream kondigt Operaasje Aaibal aan. |

### Romp
| # | Titel | Locatie | Gameplay | Vereiste | Beloning | Verhaalstap |
|---|---|---|---|---|---|---|
| H7 [B] | Spoedklus voor Noorderzon | Naar het Noorderplantsoen | Bezorgen op tijd | – | €500 | Femke zag Durk & Douwe alle frituurvet in de stad opkopen. |
| H8 [N] | Vet gekaapt | Oostelijke Ringweg naar de Oosterpoort | Achtervolging: schiet de banden van tankwagen *Us Mem Vet* stuk en breng hem weg | Uzi *Ratelaar* (aanbevolen, niet verplicht) | €600 | Zonder vet kan geen frituur in Grunn bakken. Nu is het plan duidelijk. |
| H9 [B] | Ringweg-race: eindelijk klaar? | Ringweg | Race tegen 4 tegenstanders | Aanbevolen: tuning bij *Knal & Kolder* | €750 | Eén van de vier is **Jelle in zijn trekker-limo**. Verliest hij, dan wordt het persoonlijk: *"Dit is net klear, Grinzer."* |
| H10 [N] | Vlag van d'Olle Grieze | Martinitoren | Duif-actie: pik 5 touwen los van een reuzenvlag (pompeblêd-parodie) terwijl Jelle's "Fryske meeuwen" duiken | H4 gespeeld | €350 | Heel Grunn ziet de vlag vallen. Stadjers juichen, Jelle post een boze selfie. |
| H11 [B] | Kroegentocht: Poelestraat plat | Poelestraat/Peperstraat | Te voet, checkpoints | Avond | €320 | In de laatste kroeg verklapt een dronken Durk: *"De bal leit op it skûtsje…"* |
| H12 [B] | Fatbike-terreur: blijf overeind | Zuiderpark | Ontwijken | – | €275 | Oma Trijntje stond in 1953 model voor het beeldje: *"Die bal is gien geld, jong. Die bal is Grunn."* Tammo en Anita beginnen te twijfelen. |
| H13 [B] | Rondvaart met valse papieren | Diepenring | Varen | – | €450 | **Middelpunt, de kus.** Ze varen langs het skûtsje in de Oosterhaven. Voorstel: de slotregel eindigt nu met *"…of misschien: wij tweeën vóór Grunn."* |

### Staart
| # | Titel | Locatie | Gameplay | Vereiste | Beloning | Verhaalstap |
|---|---|---|---|---|---|---|
| H14 [N] | Skûtsje-kraak | Oosterhaven naar Damsterdiep | Bootachtervolging, aan boord springen, gevecht op dek | Eigen boot (huren of de rondvaartboot in de garage) | €800 | De Eierbal blijkt van chocola. Jelle fierljept over de gracht weg. Een tip: de echte gaat vanavond per ballon de stad uit. |
| H15 [N] | Traumaduif | UMCG-helidek, dan boven de stad | **Heli- en ballon-minigame** (zie hieronder) | Voor 21:00 in-game (daarna vliegt de ballon niet) | €1000, ontgrendelt minigame *Ballonjacht* | Tammo pakt de Eierbal uit de mand. Jelle landt woedend in een weiland bij de Ommelanden. |
| H16 [N] | Waar is de Fjord? | Stad, dan Hoofdstation, dan een overweg | Zoeken via Kiekdoar-tips en duif-modus (spot de rode Fjord van boven), dan een race tegen de trein naar Leeuwarden | – | €700 | Jelle ontvoert Anita's Fjord Escapade. Ze halen hem net voor de overweg terug. Anita: *"Niemand. Raakt. Mijn. Fjord."* |
| H17 [N] | Het Bod | Stadsbalkon, dan de stad | Jelle daagt uit voor de Snackprijs. Boodschappenrondje met 3 stops: mosterd, eieren van de volkstuin (eiermeter, niet hard remmen) en stoetbrood | €300 om in te kopen | €400 | De duo-dialoog gaat over "wat doen we ermee als we winnen?" Ze kiezen: terug naar het museum. |
| H18 [N] | **Finale: Gronings Ontzet** | Grote Markt, ringweg, Reitdiep | Drie fases: (1) verdedig de kraam tegen Durk & Douwe's vuurwerk, (2) Jelle grist de Eierbal van het podium, achtervolging over de ringweg met politie erbij, (3) Jelle's fierljep over het Reitdiep mislukt en je vist hem op | Alle H-missies | €2500 en de Fjord Frituur als bezit | Jelle proeft de eierbal. De Eierbal gaat terug naar het museum en de foodtruck gaat open. Kus, aftiteling. |

**H15 Traumaduif in detail**
- De gele traumaheli landt op het UMCG. Piloot *Dokter Dijkstra* staat bij de koffieautomaat. Anita: *"Ik heb ooit een drone gehad."* Tammo: *"Die ligt nog in het Reitdiep."*
- Fase 1, opstijgen: korte besturingsuitleg (W/S hoogte, A/D draaien, muis richting).
- Fase 2, de jacht: de ballon drijft met de echte wind uit `skyprops.js` weg. Als het weer een storm geeft, vallen er rukwinden. Ontwijk de Martinitoren, bouwkranen en meeuwen.
- Fase 3, de koppeling: hou 5 seconden dezelfde hoogte en snelheid als de mand (een meter in beeld), terwijl Tammo aan een touw naar beneden gaat. Drie pogingen.
- Na afloop wordt *Ballonjacht* herhaalbaar: tik 10 ballonnen aan binnen de tijd (brons/zilver/goud). Het sluit aan op de bestaande prestatie *Traumaduif*.

**H-post, na het einde (herspeelbaar, Jelle als vriendelijke rivaal)**: de *Elf Bruggenrace* (varen langs 11 bruggen van de Diepenring), *Fierljep-duel* (timing-minigame aan de Hoornsediep-kade) en *Skûtsje-sprint*.

---

## 3. Begeleide flow ("auto-pilot")

**Principe**: de automatische waypoint wijst altijd naar de **volgende stap**. Dat is afwisselend een missie en een activiteit. Nooit twee missies achter elkaar, behalve bij een cliffhanger (H6 naar H7 niet, H14 naar H15 wel).

**Regels**
1. Na elke missie of activiteit zet het spel binnen 3 s de waypoint naar de volgende stap. Er komt een telefoonmelding bij, met een reden in het karakter van Tammo of Anita (*"Anita: Eerst een blaffer, dan de Grote Markt."*).
2. Een stap met vereiste is een **poort**: de missie-marker blijft grijs met *"Eerst: koop een wapen"* en de waypoint gaat naar de winkel.
3. Zet de speler zelf een waypoint, dan heeft die voorrang. De auto-pilot komt pas terug als die bereikt of gewist is, of na het instappen in een voertuig.
4. Geen gezeur: rijdt de speler 90 s van de route af, dan verschijnt er alleen een ster "Aanrader" op de kaart. Na 5 minuten komt er één herinnering via de telefoon.
5. Een activiteit duurt 3 tot 8 minuten. Klaar is klaar: de pigeon-activiteit is bijvoorbeeld "klaar" na 1 landing of 20 poepscore.

**De eerste ~2 uur**

| Tijd | Stap | Soort | Waarom hier |
|---|---|---|---|
| 0:00 | Intromontage | – | – |
| 0:04 | H1 Berend | Missie | Rijden leren |
| 0:09 | Eierbal halen bij *Frituur Vet & Lekker* | Horeca | Callback naar "eierbal op de bank", uitleg over gezondheid |
| 0:12 | H2 Pinnen met de automaat | Missie | Politie en spuiterij leren |
| 0:20 | *Pang & Zo*: pistool kopen | Winkel (poort H3) | Geld van H2 uitgeven |
| 0:24 | H3 Chaos op de Grote Markt | Missie | Vechten |
| 0:28 | Duiventil Grote Markt: 20 poepscore | Duif-modus | Vliegen leren vóór H4 |
| 0:34 | H4 Duif op verkenning | Missie | Duif als missiegereedschap |
| 0:40 | Bijbaantje *Hap & Rap bezorger* (1 ronde) | Bijbaan | Geld voor een auto |
| 0:48 | *Ome Harm Occasions* of garage | Winkel/garage (poort H5) | Bezit en garage leren |
| 0:54 | H5 KEI-weekrace | Missie | Racen |
| 1:00 | *Stoer & Stads*: Zwart incognito, **of** *Bootje Huren* | Winkel (poort H6) | Keuze: sluipen of varen |
| 1:04 | Wachten bij de garage tot de avond | Garage | Dag/nacht uitleggen |
| 1:05 | H6 De Museumkraak | Missie | Einde kop |
| 1:13 | Treinreis naar een ander station | Minigame | Wereld groter maken, "even onderduiken" |
| 1:18 | H7 Noorderzon | Missie | Romp begint |
| 1:23 | *Pang & Zo*: Uzi | Winkel (aanbevolen voor H8) | – |
| 1:26 | H8 Vet gekaapt | Missie | Achtervolging |
| 1:33 | *Knal & Kolder* tuning | Winkel/garage | Voorbereiding op de ringweg |
| 1:37 | H9 Ringweg-race | Missie | Jelle persoonlijk |
| 1:44 | Bijbaantje *Fietsdepot* of *Verhuizing* | Bijbaan | Adempauze |
| 1:52 | H10 Vlag van d'Olle Grieze | Missie | Duif-actie |
| 1:57 | Verstopte eierbal zoeken (hint op de kaart) | Verzamelen | Uitleg over de 30 collectibles |
| 2:00 | H11 Kroegentocht (avond) | Missie | – |

---

## 4. Tammo en Anita praten in de auto

**Systeem (`cartalk`)**
- **Wanneer**: beide personages zitten in hetzelfde voertuig, de snelheid is meer dan 15 km/u, er zijn geen sterren, er loopt geen missie-timer of cinematic, en de speler zit minstens 6 s in de auto.
- **Triggers, op prioriteit**:
  1. *Nabespreking*: de eerste rit na een missie (geslaagd of mislukt), één keer per missie-uitkomst, geldig tot 5 minuten na afloop.
  2. *Vooruitblik*: de waypoint staat op een missie en er is nog 400 m te gaan.
  3. *Plek*: je rijdt langs een landmark dat hoort bij een eerdere missie.
  4. *Situatie*: geflitst, bijna-aanrijding, storm of onweer, zonsopgang, 100 km/u.
- **Cooldowns**: 75 s globaal tussen gesprekken, 10 minuten per plek-regel, 3 minuten per situatie-type. Nabesprekingen negeren de globale cooldown maar wachten tot een lopend gesprek klaar is.
- **Onderbreken**: bij een crash of nieuwe sterren kapt het gesprek af met een korte reactie (*"Au."*, *"Nou komt de pliesie."*). De rest van een onderbroken nabespreking volgt later, eenmalig.
- **Audio en weergave**: de G-Music gaat 6 dB omlaag. Ondertitels gebruiken de stijl van `missionstory.js`. Stemmen worden opgezocht via dezelfde `speaker|tekst`-manifest, dus een regel zonder opname blijft gewoon een ondertitel.
- **Data**: `{ id, trigger: 'after:H3:pass', stage: 3, lines: [['A','…'],['T','…']] }`. `stage` voorkomt spoilers op dezelfde manier als `DUO_BY_STAGE`.

**Voorbeeldregels (32)**

| Na | Regels |
|---|---|
| H1 geslaagd | A: *"Geen kras. Berend moest bijna huilen."* T: *"Dat was de koffie. Die was koud."* |
| H1 mislukt | T: *"Misschien telt hij niet zo goed."* A: *"Hij telt sinds 1672, Tammo."* |
| H2 | A: *"Een pinautomaat in de achterbak. Mijn moeder zou trots zijn."* T: *"Je moeder werkte bij de bank."* A: *"Precies."* |
| H2 | T: *"De Gouden Eierbal. Dat is toch gewoon een verhaaltje?"* A: *"Achttien karaat verhaaltje."* |
| H3 | T: *"Jelmer zei 'content'. Ik heb nog nooit zo weinig content gevoeld."* A: *"Wie was die Jelle in de chat?"* |
| H4 | A: *"Jij poept op het museum en noemt het verkenning."* T: *"Kunst is wat je ervan maakt."* |
| H5 | T: *"Snits Snel. Wie noemt zijn team nou Snits Snel?"* A: *"Iemand die tweede wordt."* |
| H6 | A: *"'Tige tank.' Hij bedankt ons. Hij. Bedankt. Ons."* T: *"Ik vind het wel beleefd, eigenlijk."* A: *"Tammo."* |
| H6 | T: *"Dus we zijn inbrekers zonder buit."* A: *"Wandelaars. Met een zaklamp."* |
| H8 | A: *"Een tankwagen vol frituurvet. Wat wil die man met al dat vet?"* T: *"Frituren, schat. Hij is Fries. Hij frituurt."* |
| H9 | T: *"Hij reed in een tréker. En hij haalde me bijna in."* A: *"Hij haalde je in, Tammo. Twee keer."* |
| H10 | A: *"Heel Grunn stond te klappen voor een duif."* T: *"Niet voor een duif. Voor mij, als duif."* |
| H11 | T: *"'It skûtsje.' Weet jij wat een skûtsje is?"* A: *"Een boot. Met zeil. En met onze Eierbal."* |
| H12 | A: *"Oma Trijntje was het model. Zij ís de Eierbal, eigenlijk."* T: *"Dan hebben we bijna een oma verkocht."* |
| H13 | T: *"Die kus… was dat voor de toeristen?"* A: *"Er waren geen toeristen meer. Die waren al uitgestapt."* |
| H14 | T: *"Chocola. We hebben een boot gekaapt voor chocola."* A: *"Hij was wel lekker."* T: *"Heb jij van de bewijslast gegeten?"* |
| H15 | A: *"Ik heb een traumaheli gevlogen."* T: *"Je hebt ermee geparkeerd. Op een ballon."* |
| H16 | A: *"Niemand. Raakt. Mijn. Fjord."* T: *"Ik mag er ook niet in rijden."* A: *"Precies. Niemand."* |
| H17 | T: *"En als we winnen, verkopen we hem toch nog?"* A: *"…Nee. Hij hoort in Grunn."* |
| Plek: Martinitoren (na H10) | T: *"Daar hing de vlag."* A: *"Daar hing jij, als duif. Heel stoer."* |
| Situatie: geflitst | A: *"Smile. Die foto komt naast de wc bij Geert."* |
| Situatie: storm | T: *"Code rood."* A: *"Voor Grunn is dit gewoon dinsdag."* |

---

## 5. Trailermodus voor YouTube

> **Vervangen (2 oktober 2026):** de shotlijst hieronder is de eerste trailer. De huidige is "GDE Groningen — Een zomer in Grunn" uit `docs/verhaal/E-trailer.md` (24 shots, naamkaarten, MP4-export met `--trailer-video`). De attract-intro bij de eerste start is vervallen.

Eén sequentie met drie ingangen: een verborgen **benchmark**, een **attract-intro bij de eerste start** en een **desktopschakelaar** voor opnames. Er komt nergens een menuknop "Trailer".

### 5a. Verstopt als "Benchmark"
- **Waar**: *Instellingen → Beeld*, onderaan onder "Zichtafstand", een knop **"Benchmark draaien"** met de notitie *"Test hoe soepel Grunn draait op deze computer (±1,5 min)."*
- Het staat bij *Beeld* omdat het daar logisch voelt, naast Kwaliteit en Schaduwen. Instellingen zijn ook te openen vanaf het startscherm (pre-start), dus je hoeft geen spel te laden.
- **Wat een gewone speler ziet**:
  - Een bevestiging: *"Benchmark starten? Je spel wordt eerst opgeslagen."* Tijdens het spel wordt er echt opgeslagen en na afloop keer je terug naar dezelfde plek.
  - Daarna volgt de volledige trailer (shotlijst hieronder) zonder HUD. Alleen rechtsonder staat klein en halfdoorzichtig *"BENCHMARK · 58 fps"*.
  - Aan het eind komt een resultatenkaart in de stijl van de pauzemenu-panelen: gemiddelde fps, 1%-low, zwaarste shot (bijv. *"Storm boven het Forum: 41 fps"*) en een advies (*"Kwaliteit 'hoog' draait prima"* of *"Probeer 'middel' of zichtafstand 'normaal'"*).
  - Knoppen: *"Toepassen"* (alleen bij een advies), *"Nog een keer"* en *"Terug"*.
- De benchmark draait **realtime** en meet dus echte fps. De captions staan erin, want het is stiekem de trailer. Meet- en adviescode kan komen uit de bestaande `--perf-test`-tooling.

### 5b. Attract-intro bij de allereerste start
- **Wanneer**: alleen bij de eerste start. Het laadscherm vult zich en daarna speelt de attract-cut in plaats van direct het startmenu.
  - Bijhouden via een nieuwe instelling `attractSeen`, in dezelfde localStorage als de andere instellingen. *"Standaardinstellingen"* reset deze vlag **niet**.
  - Wordt niet getoond als er al een save bestaat (een bestaande speler na een update), en nooit bij `?stil`, `--stil`, `--smoke-test` of `--perf-test`.
  - De vlag wordt gezet zodra de cut *start*, zodat een crash of het sluiten van de app hem niet elke keer opnieuw laat afspelen.
- **Overslaan**: net als bij alle cutscenes door de **spatiebalk even ingedrukt te houden** (ongeveer 1 s, met een vulbalkje), zodat het nooit per ongeluk gebeurt. Rechtsonder staat klein *"Houd Spatie ingedrukt om over te slaan"*.
- **Korte cut, ~30 s, alleen wereld en features, geen verhaal**: shots 2, 3, 9, 10, 11, 13, 14, 16, 17, 20, 21 en 23 in kortere versie, met alleen de sfeer-captions (*"Grunn."*, *"Grunn slaapt nooit."*, *"Weer? Ja."*, *"Dag en nacht."*).
- **Geen overlap met de openingsmontage van "Nieuw spel"**: die montage vertelt het *verhaal* (de automaat, de kaarten *"Tammo & Anita"* en *"Alles voor één eierbal"*, *"Welkom in Grunn"*). Daarom laat de attract-cut bewust **Tammo, Anita, de Fjord, Jelle, de pinautomaat en alle dialoog** weg. Hij eindigt ook niet met het logo-kaartje van de montage, maar met de start-logo-overgang hieronder. Zo zie je bij de eerste start eerst "de stad" en na *Nieuw spel* "het verhaal", zonder dat er iets dubbel voorbijkomt.
- **Overgang naar het menu, zonder zwart beeld**:
  - Het laatste shot, de hoge luchtfoto bij zonsondergang (23), gaat over in de eerste langzame camerabeweging van het startscherm (`startscreen.js`, het highlight-shot). De laatste pose van de attract is gelijk aan de beginpose van die beweging, dus de camera loopt gewoon door.
  - De muziek crossfadet in 2 s naar het startschermgeluid.
  - Het logo verschijnt groot in het midden en schuift en krimpt in 0,8 s naar zijn plek in het menu, waarna de menu-items infaden.
  - Bij overslaan gebeurt hetzelfde, versneld: een fade van 0,4 s naar het startscherm. Nooit een harde cut.
- **Later terugzien**: via *Instellingen → Beeld → Benchmark draaien*, dan de volledige versie.

### 5c. Desktopschakelaar en browser (voor YouTube-opnames)
- Desktop: `--trailer`, in lijn met de bestaande `--stil` en `--perf-test`, met een wegwerpprofiel. Optioneel `--trailer=3840x2160`, `--trailer-shot=12` om één shot te testen en `--trailer-cut=kort` voor de attract-versie.
- Browser: `/?trailer` (en `/?trailer&stil` om zonder muziek te testen).
- **Anders dan de benchmark**: geen fps-teller en geen resultatenkaart. **Vaste tijdstap** (1/60 s per frame, onafhankelijk van de echte fps), zodat opnemen met OBS of een frame-dump vloeiend is, ook op een langzame machine. De app sluit vanzelf na het laatste frame.

### Gedeeld gedrag
HUD, minimap, prompts en toasts staan uit. Vaste seed voor verkeer, voetgangers en weer. Eigen muziektrack, ondertitels uit. Captions als grote kaarten in de stijl van de intromontage. Esc stopt (in de attract-versie: Spatie ingedrukt houden). Elk shot is een `playCinematic`-shot met een vooraf gezet weer en tijdstip (`daynight.js` en de weer-API worden per shot geforceerd).

**Shotlijst (~80 s)**

| # | Tijd | Plek / inhoud | Camera | Caption |
|---|---|---|---|---|
| 1 | 0:00–0:04 | Zwart, geluid van meeuwen en een fietsbel | – | *"Het noorden heeft één stad."* |
| 2 | 0:04–0:09 | Zonsopgang boven de Martinitoren, mist over het Reitdiep | Langzame kraanbeweging omhoog langs de toren | *"Grunn."* |
| 3 | 0:09–0:12 | Vismarkt, markt en duiven | Laag dolly-shot, duiven vliegen op | – |
| 4 | 0:12–0:15 | Tammo & Anita stappen in de rode Fjord | Close-up die uitzoomt | *"Twee Stadjers."* |
| 5 | 0:15–0:18 | De Fjord scheurt de Herestraat door | Achtervolgcamera laag bij de bumper | *"Eén droom."* |
| 6 | 0:18–0:20 | Pinautomaat in de achterbak | Statisch shot, humorpauze | *"Vier wielen. Geen kenteken."* |
| 7 | 0:20–0:24 | Jelle in de trekker-limo, vlaggetjes wapperen | Lage tegenlichtshot, slowmotion | *"En één Fries."* |
| 8 | 0:24–0:27 | Jelle fierljept over de Diepenring | Zijwaarts meebewegen, slowmotion op het hoogste punt | *"Moai."* |
| 9 | 0:27–0:31 | Achtervolging met 3 sterren door de binnenstad, zwaailichten | Snelle cuts tussen dak- en bumpercam | – |
| 10 | 0:31–0:34 | Politieheli boven de Grote Markt, schijnwerper | Vanuit de heli naar beneden | *"Grunn slaapt nooit."* |
| 11 | 0:34–0:37 | Duif-modus: vlucht langs de Martinitoren | Achter de duif, rakelings langs de wijzerplaat | *"Soms moet je het van boven zien."* |
| 12 | 0:37–0:39 | Duif poept op een corpsbal | Close-up, freeze frame | *"En soms moet je iets loslaten."* |
| 13 | 0:39–0:43 | Rondvaartboot op de Diepenring, bruggen | Drone-shot hoog, zakt naar het water | – |
| 14 | 0:43–0:47 | Ringweg-race, 5 auto's naast elkaar op het viaduct | Brede zijwaartse track | *"De ringweg is af."* |
| 15 | 0:47–0:48 | Een pion stuitert over het asfalt | Close-up | *"Bijna."* |
| 16 | 0:48–0:52 | Storm: regen, bliksem boven het Forum | Statisch groothoek, bliksemflits als cut | *"Weer? Ja."* |
| 17 | 0:52–0:55 | Gele traumaheli stijgt op van het UMCG, ballonnen aan de horizon | Omhoog kantelen, zon laag | – |
| 18 | 0:55–0:58 | Heli naast een heteluchtballon, Tammo aan het touw | Orbit rond beide | *"Traumaduif."* |
| 19 | 0:58–1:01 | Fatbikes in het Zuiderpark, Tammo duikt weg | Slowmotion op ooghoogte | – |
| 20 | 1:01–1:04 | Trein raast over de overweg, de Fjord net ervoor | Laag bij het spoor | – |
| 21 | 1:04–1:07 | Nacht: Poelestraat vol licht, kroegen | Langzame dolly door de straat | *"Dag en nacht."* |
| 22 | 1:07–1:10 | Tammo & Anita kussen op de rondvaartboot, stad op de achtergrond | Orbit, onscherpe lichten | *"Wij tweeën…"* |
| 23 | 1:10–1:13 | Luchtfoto van heel Grunn bij zonsondergang | Hoge terugtrekkende beweging | *"…vóór Grunn."* |
| 24 | 1:13–1:17 | Logo | – | *"GDE Groningen. Nu te spelen."* |
| 25 | 1:17–1:20 | Na de titel: Tammo met een eierbal | Close-up | T: *"Mag ik nou eindelijk?"* A: *"Nee."* |

**Techniek (licht)**
- Een shotlijst als data (`trailer.js`): per shot plek, tijd van de dag, weer, gescripte acteurs, camerafunctie, caption en in welke cut het zit (`vol` en/of `kort`). Een shot met verhaal-elementen (4–8, 12, 18, 22, 25) is nooit `kort`.
- Eén speler met drie modi: `benchmark` (realtime, fps meten, resultatenkaart), `attract` (korte cut, overslaan door Spatie ingedrukt te houden, overgang naar het startscherm) en `opname` (vaste tijdstap, sluit af).
- Het hergebruikt `cinematics.js` en de camerahelpers uit `missionstory.js`.
- Opgenomen shots gebruiken bestaande systemen: racers, politie, duif, rondvaartchase en skyprops.

---

## 6. Besluiten (26 september 2026)
- De schurk heet **Jelle Terpstra** (een terp is het Friese neefje van de Groninger wierde).
- H15 wordt eerst een **rails-heli** (alleen hoogte en snelheid).
- De attract-intro speelt ook **één keer voor bestaande spelers** na de update die hem introduceert, daarna via de benchmark.
- **Herzien (27 september 2026):** de attract-intro speelt **bij elke start** (niet meer één keer); overslaan blijft Spatie ingedrukt houden, met de hint meteen in beeld. Testruns (`?stil`, `?dev`, `?storytest`, `?hitch`, `?noattract`) slaan hem over. De instelling `attractSeen` doet niets meer.
- Het slot van missie 8 (*"vóór Grunn"*) wordt **opnieuw ingesproken**.
- Nog te controleren bij de bouw: kloppen de plekken met de kaartdekking (Reitdiep en de Hoornsediep-kade liggen aan de rand)?
- **Altijd verder kunnen:** lukt een stap in de flow niet (bijv. omdat een onderdeel kapot is), dan moet je duidelijk kunnen overslaan. Na een mislukte missie komt er een knop *Sla deze missie over, verder met het verhaal*. Hetzelfde geldt voor eisen en activiteiten die vastlopen.
- **Eigen auto = gekochte auto.** Een gestolen auto telt nooit als eigen auto, ook niet in de garage. Eisen zoals "een eigen auto" vragen dus altijd een aankoop, en het verhaal moet vóór zo'n eis genoeg geld opleveren.
- **Tammo of Anita kiest het verhaal:** je speelt afwisselend als Tammo of Anita, passend bij het moment in het verhaal; zelf wisselen kan niet meer. Per stap bepaalt het verhaal wie je bent (dat scheelt ook TTS: alleen de regels van de hoofdpersoon per scène).
- **Cutscenes overslaan** gaat overal door de spatiebalk even ingedrukt te houden, nooit met één druk.
- **Efficiënt testen** (een verhaal van 2 uur speel je niet elke keer uit): een verborgen testmodus (`?dev` / desktop `--dev`) met
  - hoofdstukkeuze: spring naar elke missie of stap in de flow, met de juiste savegame-staat (geld, gekochte spullen, voltooide missies);
  - knoppen "doel voltooien", "missie winnen/verliezen" en "naar volgend doel teleporteren", plus tijdversnelling en onkwetsbaar;
  - een automatische doorloop per missie (`--story-test`) die elke missie start, de doelen via debug-hooks afwerkt en controleert dat de flow doorloopt tot het einde, met een rapport en screenshots per stap.
- **TTS-dekking (0.5.0):** elke tekstwolk of ondertitel met gesproken tekst krijgt ook echt een stem. Eerst een inventarisatie van alle regels zonder audio (missies, bijbaantjes, NPC's, telefoon, winkels, companion), dan ontbrekende regels genereren en een check die meldt als er nieuwe tekst zonder stem bijkomt.
- TTS: gebruik volop emotietags, gecombineerd met lokale tags zoals *[Groningse man die boos is]*.
- **Tammo en Anita om de beurt:** het verhaal bepaalt wie je speelt. Elke stap heeft een vaste speler (`player` in `storyarc.js`, gekozen op wie de scène leidt); bij de start van de stap wisselen ze na een korte fade (*"Anita neemt het over"*), de ander wordt de companion. Vrij wisselen met C bestaat niet meer. Na het gebouwde verhaal blijft het personage van de laatste stap; een oude save krijgt het personage van de huidige stap. Telefoonberichten (`lead`, `done`, `after`) komen altijd van de ander, zodat per scène alleen de regels van de hoofdpersoon nodig zijn.

---

## 7. Bouwstatus

De verhaalstappen staan als data in `game/js/storyarc.js` (`STEPS`, `built: true` = gebouwd).

**0.5.0, Kop (gebouwd):** H1 Berend (met hint naar de Fries), eierbal halen bij Frituur Vet & Lekker, **H2 Pinnen met de hele automaat** (nieuw: auto instappen, 2 sterren, gratis nieuwe kleur bij een garage, verzilveren bij Pand & Poen), pistool bij Pang & Zo (poort H3), H3 Chaos (met "JelleWâld" in de chat), vliegles: 20 poeppunten, **H4 Duif op verkenning** (nieuw: duif vanaf het Stationsplein, 3 camera's en 2 bewakers op de foto), één ronde Hap & Rap, eigen fiets bij Trap & Toeter (poort H5), H5 KEI-weekrace (met "Snits Snel" van Us Mem Snacks), zwart incognito of huurboot (poort H6), wachten bij de garage tot het donker is (poort H6), **H6 De Museumkraak** (nieuw: achteringang, stroomkast, lege vitrine, kaartje *"Tige tank! – W."*, 3 sterren ontsnappen; daarna Kiekdoar en Jelle's livestream, Jelle als telefooncontact), kaart *"Wordt vervolgd…"*.

Afwijkingen: H2's spuitbeurt gebeurt in een Garage Knalpot/Pomp & Poets-werkplaats (daar zit Spuit & Klaar). De auto-pilot toont geen grijze missie-marker; de route en een zwevend label wijzen naar de winkel. Nieuw: komt de speler geld tekort voor een verplichte aankoop, dan schiet een personage het één keer voor.

**Openingsmontage (herzien, 27 september 2026):** ~90 s op de beat van het thema (dat begint opnieuw): Grunn bij zonsopgang (Verteller), het Groninger Museum en de Gouden Eierbal in zijn vitrine (1953, wat hij voor Grunn betekent), kaart *"Tammo & Anita"*, gisteravond op de Vismarkt bij de rode Fjord Escapade (Anita's droom: de Fjord Frituur; Tammo's droom: dat Anita blijft, en een eierbal), een Friese silhouet met vlag op de Grote Markt, de pinautomaat in de Herestraat, een zwarte trekker-limo die voorbijglijdt, kaart *"Alles voor één eierbal"*, vanochtend de automaat die er nog staat (*"Vandaag gaat de telefoon."*), logo en *"Welkom in Grunn"*. Daarna komt Tammo's telefoonbericht over Berend (H1). Wat de Verteller in de montage al vertelde, slaat H1 over.

**0.6.0, Romp (gebouwd):** treinreis om onder te duiken (station, één rit), H7 Noorderzon (Femke zag Durk & Douwe al het frituurvet opkopen), Uzi bij Pang & Zo (aanbevolen), **H8 Vet gekaapt** (nieuw: achtervolging van de tankwagen *Us Mem Vet* vanaf de Europaweg, banden stukschieten of rammen, tankwagen kapen, naar de Oosterpoort; daarna Jelle's eerste fierljep-ontsnapping met Durk & Douwe), eigen auto bij Ome Harm (poort H9, met voorschot van Harm), tuning bij Knal & Kolder (aanbevolen), H9 Ringweg-race (Jelle rijdt mee in zijn zwarte trekker-limo), bijbaan Fietsdepot of Verhuizing, **H10 Vlag van d'Olle Grieze** (nieuw: duif-actie, vijf touwen van Jelle's reuzenvlag aan de Martinitoren lospikken terwijl Fryske meeuwen duiken, de vlag valt), verstopte eierbal zoeken, H11 Kroegentocht (een dronken Durk verklapt het skûtsje), H12 Fatbike-terreur (Oma Trijntje stond in 1953 model), H13 Rondvaart (skûtsje in de Oosterhaven, de kus en *"…of misschien: wij tweeën vóór Grunn"*), kaart *"Wordt vervolgd…"* aan het eind van de Romp.

Afwijkingen: de Kroegentocht heeft geen avond-eis (de oude vrije missie blijft zo speelbaar). H8 start op de Europaweg in plaats van de Oostelijke Ringweg (dichter bij de stad). Aanbevolen aankopen (`optional`) tellen mee in de geldlijn, maar niet in de controle "alles overgeslagen". Een missie die je vroeg start (de gele marker staat er al tijdens de activiteit ervoor) maakt de open activiteiten ervoor af, met hun `unlocks` en `beat`-berichten. Na het gebouwde verhaal krijgen vrije missies geen automatische route meer.

Elke activiteit in het verhaal heeft een verhaalreden: de `lead` op de telefoon, een zin die de companion hardop zegt als de stap begint (`say`, een tekstwolk in de eigen stem) en een `done` die terugverwijst naar het plot. Los gespeeld blijven activiteiten gewoon zichzelf. H1 opent met de Verteller (Grunn en de Gouden Eierbal) en een wisselwoord van Tammo en Anita; Anita rijdt Berends bakkie.

**Staart (gebouwd):** eigen boot huren bij Bootje Huren (met voorschot van Klaas), **H14 Skûtsje-kraak** (nieuw: de missie start bij je huurboot, het skûtsje met rood zeil vaart de Diepenring rond, langszij blijven om aan boord te springen, Durk en Douwe gaan plons, de Eierbal is van chocola, Jelle fierljept weg en verklapt de ballon), **H15 Traumaduif** (nieuw: helirun.js-variant `traumaduif` vanaf het UMCG, Dokter Dijkstra), **H16 Waar is de Fjord?** (nieuw: duif-modus langs drie rode auto's uit Jelmers chat, dan Jelmers auto en de gejatte Fjord rammen voordat de trein naar Leeuwarden vertrekt, terug naar Henk), **H17 Het Bod** (nieuw: Jelle daagt uit op het Stadsbalkon, boodschappen voor €300: mosterd, eieren van de volkstuin met eiermeter, stoetbrood, naar de kraam), **H18 Finale: Gronings Ontzet** (nieuw: Bommen Berend in de jury, kraam verdedigen tegen vuurwerk, Jelle grist de Eierbal, achtervolging van de trekker-limo met politie, mislukte fierljep over het Reitdiep, opvissen; Jelle proeft: *"Dit is… better as ús. Net fertelle."*, kus en *"Wij tweeën vóór Grunn"*). Daarna de eindkaart: epiloog (Eierbal terug in het museum, Fjord Frituur open), aftiteling en *Einde*; de wereld blijft open.

Afwijkingen: H15 heeft geen 21:00-eis. H16 is geen race tegen een echte trein: de achtervolging heeft een klok ("trein"). Het H-post-deel (Elf Bruggenrace, Fierljep-duel, Skûtsje-sprint) is gebouwd in `postgame.js`: pas na de eindkaart verschijnen Jelle's drie uitdagingen op de kaart (brons, zilver, goud en records bij de prestaties), met Friese plagerijen en autogesprekjes. De Elf Bruggenrace vaart de rondvaartroute met zijn elf bruggen, het fierljep-duel ligt aan de eerste gracht uit een vaste lijst die smal genoeg is (het Hoornsediep is te breed, dus meestal de Zuiderhaven), recht over het water, de skûtsje-sprint gaat van de Oosterhaven naar de Hoge der A (wind en zeilstand bepalen de snelheid). Jelle's skûtsje is nu een echt skûtsje (ook in H14). De Fjord Frituur is na het einde een eigen voertuig in de garage, met een kort foodtruck-spel op drukke plekken (Grote Markt, Vismarkt, Noorderplantsoen, Euroborg bij wedstrijden, Poelestraat in de KEI-nacht) en upgrades via Ubbo.

**Verhaalbeleving (na playtest):** Jelle Terpstra (blauw colbert, zonnebril, blonde kuif en snor, rode sjaal) en de tweeling Durk & Douwe (rode hoodies, Durk blauwe muts en baard, Douwe witte muts en snor, samen op één fatbike) staan nu in beeld: bij de trekker-limo aan de achterdeur van het museum (H4, door de ogen van de duif), Jelles livestream na de kraak (H6, met een gouden bal die later van chocola blijkt), de fatbike met jerrycans vet (H7), de vlucht na de tankwagen (H8, de tweeling wiebelt weg op één fiets), de ringweg (H9), de dronken Durk en Douwe die hem overeind houdt (H11), het skûtsje waar ze overboord springen (H14), het Bod (H17) en de finale (H18). Alle contact met Jelle en de tweeling is echt en ingesproken: gesprekken (ook "Onbekend nummer"), een voicemail van een per ongeluk bellende Durk, livestreams, een Kiekdoar-post met selfie en handgeschreven kaartjes. Jelle praat vooral Nederlands met Friese woorden, de tweeling Nederlands; Friese regels krijgen hun Nederlandse ondertitel uit `subtitles.js`. Bij het begin van de Romp en de Staart komt een kaart *"Eerder in GDE"* met de Verteller; de Verteller keert ook terug op de keerpunten (de lege vitrine, 1953, de chocola, het besluit). Aanwijzingen krijgen in beeld een push-in en een zachte sting, en staan terug te lezen in het pauzemenu onder *"Wat weten we?"*. Bij elke wissel zegt de nieuwe hoofdpersoon kort waarom die deze stap doet. Stille autogesprekjes op de keerpunten (na de kraak, na Oma Trijntje, na de kus, na de chocola, voor het Bod, na de finale).

**Minder duif:** de duif zit nog in twee verhaalmomenten: H4 (begint nu met een korte vliegles van Bert boven het Stationsplein; de losse stap *Vliegles* is vervallen) en H10 (eerst een openingsshot van de vlag met Jelle aan de voet van de toren, daarna een echte doekvlag die wappert, bij elk touw verder zakt en in slow motion naar beneden dwarrelt). In H16 vraag je bij de Westerhaven rond (Hilly, in het Gronings) en volg je het piepje van Henks oude zender naar achter het station. Een duivenstap start altijd op zijn eigen duivenplek. Vrij duiven blijft overal kunnen.

**Overslaan:** elke stap, ook een lopende missie (die wordt dan afgebroken) en de finale, is via het pauzemenu (Missies) over te slaan; de knop *Sla deze missie over* verschijnt na een mislukte poging. Afbreken tijdens de heli-vlucht (H15) beëindigt die vlucht nu ook.

