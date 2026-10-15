# De kalender: één Groningse zomer

GDE speelt in **de zomer van 2026**. Het is altijd zomer: geen seizoenen, geen
herfst, geen Koningsdag. Code: `game/js/calendar.js` (de kalender zelf, puur),
`game/js/calendarday.js` (vandaag in het spel, de save, de HUD-kaart).
Test: `node scripts/calendar_test.mjs`.

## Waarom 2026

De datumkaarten van de delen staan al vast (Kop 14, Romp 18, Staart 24
augustus) en Gronings Ontzet is altijd op 28 augustus. In 2026 valt dat op een
**vrijdag**: het verhaal loopt dan precies twee weken, van vrijdag tot vrijdag.

## De tijdlijn

| Dag | Datum | Wat |
|---|---|---|
| 1 | vr 14 aug | Deel 1 (Kop), KEI-week. H1, EIKEA |
| 2-4 | za 15 – ma 17 aug | H2-H4 (zaterdag: marktdag bij de chaos op de Grote Markt), KEI-race (zo 16), de kraak (ma 17, 's nachts) |
| 5 | di 18 aug | Deel 2 (Romp), Noorderzon. Onderduiken |
| 6 | wo 19 aug | H7: het decor, de dag vóór Noorderzon opent; H8 |
| 7-10 | do 20 – zo 23 aug | H9-H13; r-kermis op de openingsavond van de Zomerkermis (vr 21) |
| 11 | ma 24 aug | Deel 3 (Staart). De boot huren |
| 12-14 | di 25 – do 27 aug | skûtsje (di, "morgen" in de recap), heli, carbid, padel, Fjord, het bod |
| 15 | **vr 28 aug** | **H18, Gronings Ontzet** |
| 19 | di 1 sep | epiloog; daarna vrij spel |
| 33 | di 15 sep | Deel 4 "Nazomer" begint (datumkaart "Deel 4 · 15 september"), O1 |
| 33-40 | di 15 – di 22 sep | F4a: Stad, Hogeland, Eemsdelta (O1-O10); voorronde 1 op za 19, voorronde 2 op di 22 |
| 40 | di 22 sep | laatste zomerdag (de herfst begint astronomisch op 23 september) |
| 41+ | – | **Nazomer · dag 41, 42, …**: F4b (dag 41-45) en F4c (dag 46-51); zie "Deel 4" hieronder |

Elke stap heeft zijn dag (`STEP_DATES` in calendar.js voor Deel 1-3,
`DEEL4_STEP_DAYS` voor Deel 4; een nieuwe stap krijgt de dag van de stap ervoor).

### Hoe de datum loopt

- **Een nacht** (de klok springt meer dan vier uur terug: middernacht,
  slapen, een late trein) maakt het de volgende dag.
- **Het verhaal zet een ondergrens**: de huidige stap speelt op zijn eigen dag,
  dus wie een stap afrondt, kan een paar dagen verder zijn (zoals een
  scènewissel).
- **En een bovengrens**: hoogstens de dag van de stap erna. Wachten en slapen
  brengt je niet voorbij het verhaal: Ontzet is altijd op 28 augustus.
- Na de finale is de kalender open, vanaf 1 september.

### De nazomer houdt aan

Na 22 september stopt de datum. De HUD toont dan de weekdag en
**"nazomer · dag 41"**: de dagen tellen door, de weekdagen (en de markten)
ook, maar er komt nooit een oktober in beeld. Ook de zon stopt: vanaf
1 september blijft hij staan waar hij die dag stond. Het licht wordt dus
nooit herfstig, en het weer ook niet (weather.js: geen storm, ook niet in het
vrije spel). Rikus zegt in de epiloog "De zomer is op"; de stad is het daar
niet mee eens.

## De zon

`daynight.js` krijgt per dag de declinatie (`setSunDeclination`): van 14,1°
op 14 augustus naar 9,2° op 28 augustus en 7,7° vanaf 1 september. Op 53,2°N
gaat de zon daardoor ruim een half uur eerder onder: van 19:19 naar 18:50 en
18:42 **zonnetijd**. De trailer en de intro houden het licht waarmee ze
gemaakt zijn (15°).

**[?] Voor de eigenaar: de klok is zonnetijd, geen zomertijd.** Echte
zonsondergang in Stad op 28 augustus is 20:38 (CEST); in de game 18:50. Het
verschil is vast: 1 uur 34 minuten (UTC+2 min 6,57° oosterlengte). Eén
constante in daynight.js zou de klok "echt" maken, maar dan schuiven alle
avondmomenten (trailer-shots, het startscherm, `isNight` vanaf 21:00, de
kermislampjes): dus pas na een besluit. Argument vóór: de scène
"zonsondergang aan de Hoge der A" staat op 20:54 en is nu al donker.

## Bijzondere dagen

Op de eerste ochtend (06:00-22:00, niet tijdens een missie, scène of ander
kaartje, niet in de eerste 45 seconden) verschijnt één keer een stil kaartje
**"Vandaag in Grunn"**. De HUD toont onder de klok de datum, het dagnummer en
het belangrijkste van vandaag als badge. Het pauzemenu (Overzicht) toont
vandaag en de komende dagen.

| Dag(en) | Wat | Kaart | Wat er in de game gebeurt |
|---|---|---|---|
| vr 14 – ma 17 aug | **KEI-week** | Duizenden nieuwe Stadjers zoeken hun groepje. Rij rustig door de binnenstad en het Plantsoen. | flavour.js `keiweek`: groepjes in de binnenstad en het Plantsoen, barks; H5 KEI-race |
| do 20 – zo 30 aug | **Noorderzon** | Elf dagen theater en muziek in het Noorderplantsoen. Tot laat lampjes in de bomen. | H7 (decor, de dag ervoor); badge en agenda |
| vr 21 – zo 30 aug | **Zomerkermis** (Grote Markt) | Tot en met 30 augustus staat de kermis de hele dag op de Grote Markt, niet alleen 's avonds. | kermis.js `kermisOn`: de hele dag kermis (anders 19:00-01:00); r-kermis op de openingsavond |
| **vr 28 aug** | **Gronings Ontzet** (Bommen Berend, 1672) | In 1672 hield Stad stand tegen Bommen Berend. Vlaggen op de Grote Markt, en vanavond vuurwerk. | flavour.js `bommenberend`: vlaggen (flavour3d), vuurwerk; H18 |
| di, vr, za | **Marktdag** (Grote Markt en Vismarkt) | geen kaart, alleen de badge | pg_foodtruck.js: drukte op de Vismarkt alleen op marktdagen |
| za 12 sep | **Bloemetjesmarkt**, nazomereditie | De nazomereditie: de hele dag bloemen op de Grote Markt. De binnenstad staat vol touringcars. | flavour.js `bloemetjesmarkt`: kramen, kamerplanten, touringcars |
| di 15 sep | **Suikercampagne** | Bij Hoogkerk ruikt het weer naar suiker. Op de polderwegen rijden de bietenwagens. | kaart (knipoog naar de epiloog); later: bietenwagens in countrylife.js |
| di 22 sep | **Laatste zomerdag** | Morgen begint de nazomer. In Grunn houdt die aan. | daarna "nazomer · dag N" |

Echt en verzonnen: Gronings Ontzet (28 augustus) en de vaste marktdagen zijn
echt. KEI-week, Noorderzon en de zomerkermis zijn echte Groningse
augustus-evenementen, maar hun echte data schuiven per jaar; de game houdt
deze data aan. De echte Bloemetjesmarkt is op Goede Vrijdag (voorjaar) en past
dus niet in een eeuwige zomer: de nazomereditie is verzonnen, zodat de kramen,
planten en touringcars uit flavour3d.js blijven bestaan. De Meikermis en de
echte-datum-events (Goede Vrijdag, de echte KEI-week) zijn weg: alles volgt
nu de kalender van de game, niet de klok van de computer.

### Deel 4 "Nazomer": één kalender voor F4a, F4b en F4c

Dit is de enige bron voor de data van Deel 4. De scripts (deel4-f4a/b/c.md en
PROVINCIE-VERHAAL.md) verwijzen hiernaar; in code staat het als
`DEEL4_STEP_DAYS` en `VOORRONDE_STEPS` in calendar.js (test:
`scripts/calendar_test.mjs`). De stappen zijn nog niet gebouwd; de data zijn
vast, de kaartjes staan in `SPECIAL_DAYS` met `open: false` (niet op de HUD of
in de agenda tot Deel 4 er is; PROVINCIE-VERHAAL.md §6.1).

**Regels**

- **15 september 2026 is een dinsdag.** De oude F4a-kalender (ma 15, za 20, za
  27) klopte niet: 20 en 27 september zijn zondagen. Alle weekdagen hieronder
  zijn 2026-weekdagen.
- **Een nachtmissie hoort bij de dag waarop hij begint** (de avond ervoor).
  De klok na middernacht is de volgende dag, binnen de grens van de volgende
  stap (zie "Hoe de datum loopt"). Zo is "Morgen is de voorronde" (O9) gewoon
  de dag erna.
- **Na dag 40 toont de HUD alleen de weekdag en "nazomer · dag N"**, nooit een
  maand. In het verhaal blijft het september: een tekst die "september" zegt
  (O20 "Het sneeuwt. In september." op dag 47, O26 "Het is september" op
  dag 49) blijft dus waar. Hetzelfde geldt voor de Rikus-grap in de epiloog: de zomer
  is op, de stad is het er niet mee eens. In de scripts staan voor dag 41+ dus
  geen maandnamen en geen "oktober"; schrijvers gebruiken "dag N" en de weekdag.
- **Marktdag blijft di, vr, za.** Kermissen en feesten liggen in het weekend of
  lopen er doorheen ("zomerweekend": 19-20, 26-27, en de Winschoten-kermis t/m
  zo 4 oktober = dag 52).
- **Zeven voorrondes, zeven verschillende dagen, steeds in de volgorde van
  winnen** (standaardvolgorde): za 19, di 22, vr 25, zo 27, di 29, vr 2, za 3.
  Alles ná dag 40 is nazomer-uitbreiding; dat past, want het spel loopt door.
- **Vrije volgorde binnen een ring** (Hogeland/Eemsdelta, Wadkust/Westerkwartier)
  verandert de dagen niet: een stap speelt op zijn eigen dag of later (de
  ondergrens van `storyBounds`). Wie de tweede regio van een ring als eerste
  doet, ziet de data van de andere regio dus pas nadat de kalender erbij is.
  Voor het bouwen: `n-zuidhorn` staat op dag 43 omdat `STEPS` de Wadkust-stappen
  eerst heeft en een stap nooit een eerdere dag mag hebben dan de stap ervoor;
  het Westerkwartier is open vanaf dag 41 (de ring opent met de tweede
  voorronde), de stap zelf speelt vanaf dag 43.

**De tabel**

| Datum | Weekdag | Dag | Stappen | Bijzondere dag (kaart) |
|---|---|---|---|---|
| 15 sep | di | 33 | O1 (Vismarkt, ochtend), 's nachts Ubbo op Nachtstreek | Suikercampagne (open), markt |
| 16 sep | wo | 34 | O2 (vroege trein naar Warffum), O3 | |
| 17 sep | do | 35 | O4 (late middag), `n-trekkertrek` (optioneel) | |
| 18 sep | vr | 36 | O5 (tuinfeest, avond) | Tuinfeest in de Menkemaborg, markt |
| 19 sep | za | 37 | O6 (**voorronde 1, Hogeland**, kermis Uithuizen, middag), `n-warffum` | Kermis in Uithuizen (t/m zo), markt |
| 20 sep | zo | 38 | `n-delfzijl`, O7 (schemer), O8 (nacht) | Kermis in Uithuizen |
| 21 sep | ma | 39 | O9 (nacht, windkracht 9; "morgen is de voorronde") | |
| 22 sep | di | 40 | O10 (**voorronde 2, Eemsdelta**, Appingedam), `n-woonschip` | Jaarmarkt in de Eemsdelta, laatste zomerdag, markt |
| 23 sep | wo | 41 | `n-zoutkamp`, O11 (ochtend), O12 (nacht) | |
| 24 sep | do | 42 | O13 (laagwater 15:30) | |
| 25 sep | vr | 43 | O14 (**voorronde 3, Wadkust**, havenfeest, 18:30), `n-kotter`, `n-zuidhorn` | Havenfeest in Lauwersoog, markt |
| 26 sep | za | 44 | O15 (09:00; trekkertrek-finale 's middags), O16 (nacht, 22:30) | Trekkertrek in het Westerkwartier, Kermis in Zuidhorn (t/m zo), markt |
| 27 sep | zo | 45 | O17 (open dag Nienoord, 10:30), O18 (**voorronde 4, Westerkwartier**, 14:00), `n-schuur` | Open dag in Nienoord, Kermis in Zuidhorn |
| 28 sep | ma | 46 | `n-winschoten`, O19 (avond) | Oogstfeest in Beerta (t/m wo) |
| 29 sep | di | 47 | O20 (ochtend), O21 (middag), O22 (**voorronde 5, Oldambt**, kermis Winschoten, avond), `n-beerta`, `n-aanbod`, `n-ruzie` (nacht) | Kermis in Winschoten (t/m zo), Oogstfeest, markt |
| 30 sep | wo | 48 | `n-veendam`, O23 (middag), O24 (avond), O25 (nacht) | Oogstfeest in Beerta |
| 1 okt | do | 49 | O26 (nacht) | Stoomtreindag in Stadskanaal (jaarmarkt) |
| 2 okt | vr | 50 | O27 (**voorronde 6, Veenkoloniën**, middag), `n-brugwachter`, `n-westerwolde` | markt |
| 3 okt | za | 51 | O28 (ochtend), O29 (01:00, de nacht ervoor; klok terug), O30 (middag), O31 (**voorronde 7 / finale, Westerwolde**, laat in de middag), O32 (gouden uur), `n-boshut` | Vestingdag in Westerwolde, markt |
| daarna | – | 52+ | vrij spel, "nazomer · dag N" | |

(Kolom 1 is alleen voor de schrijvers: vanaf dag 41 komt er geen maand in beeld.
Dag 49 en 51 zijn "do · nazomer" en "za · nazomer"; de HUD toont "dag 49" en
"dag 51".)

Wat er veranderd is ten opzichte van de eerste versies:

- **F4a**: O1 di 15 (was ma), O2 wo 16 (was di), het tuinfeest vr 18 (de
  gesproken regels zeiden "zaterdag", de tabel "vrijdagavond": nu overal
  vrijdag), voorronde Hogeland za 19 (was za 20), voorronde Eemsdelta di 22
  (was za 27; O9 blijft de dag ervoor).
- **F4b**: ongewijzigd (23-27, al correct), `n-zuidhorn` op dag 43.
- **F4c**: de finale is za dag 51 (was za 27 sept); O10 hoeft niet naar zo 21.
  Oldambt di 29, Veenkoloniën wo 30 - vr 2, Westerwolde za 3.

**Kaartteksten voor Deel 4** (`SPECIAL_DAYS`, `open: false`; naam, icoon, kaart):

| id | Dagen | Naam | Icoon | Kaart |
|---|---|---|---|---|
| `borgfeest` | vr 18 (36) | Tuinfeest in de Menkemaborg | ster | Lampjes langs de gracht. Ubbo zoekt zijn jury. Jij bent niet uitgenodigd. |
| `uithuizenkermis` | za 19 - zo 20 (37-38) | Kermis in Uithuizen | rad | Botsauto's en zweefmolen op het dorpsveld. De eerste voorronde van de Ommelander Ronde. |
| `jaarmarkt` | di 22 (40) | Jaarmarkt in de Eemsdelta | kraam | Kramen langs het Damsterdiep in Appingedam. De sluiswachter meldt alleen. |
| `havenfeest` | vr 25 (43) | Havenfeest in Lauwersoog | vlag | Vlaggetjes op de pier. De laatste boot naar Schier vaart om 19:05. |
| `trekkertrek` | za 26 (44) | Trekkertrek in het Westerkwartier | trekker | De finale op het sportveld bij Niekerk. Wie het verst trekt, wint. |
| `zuidhornkermis` | za 26 - zo 27 (44-45) | Kermis in Zuidhorn | rad | Het is geen Uithuizen, maar het draait. Zondag is er een rally. |
| `nienoord` | zo 27 (45) | Open dag in Nienoord | bloem | Het Rijtuigenhuis is open. De koetsen staan klaar, de paarden ook. |
| `oogstfeest` | ma 28 - wo 30 (46-48) | Oogstfeest in Beerta | aar | Trekkerparade en combineshow. Het laatste graan is binnen. |
| `oldambtkermis` | di 29 - zo 4 (47-52) | Kermis in Winschoten | rad | Een week kermis aan de rand van het graan. Durk en Douwe zijn er ook. |
| `stoomtrein` | do 1 (49) | Jaarmarkt en stoomtreindag in Stadskanaal | trein | Een museumtrein langs de kanaalwijken, vandaag gratis. Elke brug gaat open. |
| `vesting` | za 3 (51) | Vestingdag in Westerwolde | vlag | Kartonnen kanonnen op de wallen. Berend speelt weer de belegeraar. |

Vrije events (geen kaart): de paardenmarkt van Marum (zo 27) en de Garnalendag
in Zoutkamp (za 26) uit F4b zijn zomerweekend-events; het oogstfeest op het
Hogeland uit F4a is hetzelfde nazomerfeest als dat in Beerta, het gebeurt
op elke willekeurige dag zonder kaart.

PROVINCIE-VERHAAL.md noemde voor Deel 4 nog seizoenen (herfstkleuren, eerste
vorst in O32). Dat botst met "altijd zomer"; bij het bouwen van Deel 4 kiezen
we nazomer-varianten (stoppelvelden, ochtendmist, "de laatste zomeravond" in
O32, geen vorst). Zie PROVINCIE-VERHAAL.md §2.4 en §6.

## Save

`kalender: { v: 1, dag, gezien }` in de save (versie 7). Een oudere save krijgt
bij het laden de dag van de stap waar hij verdergaat (savemigrate.js, migratie
6→7), zonder al gezien kaartjes.

## API (voor de HUD en andere systemen)

calendar.js (puur): `formatDay(n)` → `{ short: 'Vr 28 aug', long, dayLabel:
'dag 15', nazomer }`, `weekdayShort(n)`, `dayOfSummer(n)`, `specialDay(n)` →
`{ id, name, icon, card, small }`, `specialsOn(n)`, `upcomingSpecials(n, k)`,
`isSpecial(id, n)`, `calIcon(key)`, `sunDeclinationDeg(n)`.

calendarday.js (vandaag): `today()`, `todayInfo()`, `todaySpecial()`,
`isToday(id)`, `upcoming(w, k)`, `onDayChange(fn)` en het window-event
`daychange` (`detail: { day, from, info, special }`). Debug:
`window.__calendar.get()` / `.set(n)`.
