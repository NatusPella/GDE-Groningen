# Radio bedienen: controller en toetsenbord (22-11)

> **Naslag.** De zenders zelf staan in [RADIOZENDERS-21-11.md](RADIOZENDERS-21-11.md) (ADR 0046), de zender per voertuig in dezelfde doc (#988). De volledige knopindeling per situatie staat in [CONTROLLER-INDELING-22-11.md](CONTROLLER-INDELING-22-11.md). Hier staat alleen hoe je de radio bedient. Wijkt dit af van de code, dan is dit de fout.

De eigenaar vroeg (22-11): een radiozender aanpassen moet met een controller kunnen, niet alleen via Instellingen. Sinds #495 had een voertuig geen vrije knop meer voor de radio, dus een knop erbij was geen optie: alle knoppen zijn in elk voertuig bezet en er is niets verplaatst. De oplossing bouwt op het acties-wiel van de controller (houd Overzicht 0,4 s, zie de indeling-doc): de radio heeft daar een eigen pagina, en één van de onderdelen opent een zenderwiel.

## Regels

- **Niets verplaatst.** Geen bestaande knop of toets heeft een andere betekenis gekregen. Op het toetsenbord is N alleen anders in tijd: een korte tik zet de radio om bij het loslaten (niet meer bij het indrukken), zodat vasthouden het wiel kan openen zonder dat de radio ook omgaat.
- **Het wiel kost geen pauze.** Het spel loopt door; de stick en de triggers sturen dan niets (zoals bij het acties-wiel), de wagen rolt uit. De stick, de D-pad en de pijltjes kiezen.
- **Eén knop, één betekenis.** Overal waar de radio een eigen knop heeft is dat N (D-pad omhoog te voet); overal anders is het acties-wiel de enige plek.
- **Herbinden.** Het pad stuurt de toetsen van het toetsenbord (gamepad.js). Verplaats je een knop of de toets N bij Instellingen > Besturing, dan volgen aan of uit, vasthouden, Shift en Alt die ene toets. Er is niets aan de opslag veranderd: een oude herbinding blijft gewoon werken en er is geen nieuwe toets bijgekomen. Alt kan geen herbinding worden (vast).
- **Toets in de knop.** Het wiel toont onderin de glyphs van het apparaat dat je gebruikt (A kiest, B sluit op de controller; Enter en Esc op het toetsenbord). Een Steam Deck gebruikt dezelfde acties: de trackpads en achterknoppen sturen hetzelfde als de knoppen waaraan Steam ze koppelt, er is geen aparte code.

## Toetsenbord

| Toets | Doet |
| --- | --- |
| N, kort | Radio aan of uit (bij het loslaten) |
| Shift + N | Volgende zender (ook als de radio uit stond: dan gaat hij aan) |
| Alt + N | Vorige zender |
| N vasthouden (0,4 s) | Het zenderwiel: pijlen kiezen, Enter bevestigt, Esc sluit; ook een klik kiest |
| Instellingen > Geluid | De zenderlijst blijft; de regel erboven noemt de snelkoppelingen |

Ctrl+N is bewust niet gebruikt: in de browser opent dat een nieuw venster. Alt+N werkt in het spel en in de app zonder menubalk.

## Controller

Het acties-wiel opent met Overzicht 0,4 s vasthouden (of met een tik als de tikstand aan staat). Pagina's: Spelen, **Radio**, Wapens, Samen spelen; LB en RB bladeren. De pagina Radio heeft vier onderdelen:

| Onderdeel | Toets die het stuurt | Doet |
| --- | --- | --- |
| Radio aan of uit | N | Zet de radio om (niet in het wiel te voet: daar is D-pad omhoog de radio) |
| Volgende zender | Shift + N | Naar de volgende te kiezen zender |
| Vorige zender | Alt + N | Naar de vorige |
| Zenders kiezen | (opent het zenderwiel) | De lijst met alle zenders |

**Het zenderwiel** is een lijst (DS3): elke zender met een icoontje en zijn naam, de DJ eronder, de huidige gemarkeerd met een punt en dikgedrukt, een geheime zender die je nog niet vond staat er niet in, een zender die nog te weinig nummers heeft staat er grijs met Binnenkort en is niet te kiezen (de D-pad en de stick slaan hem over, een klik doet niets). De laatste rij is Radio uit. Het wiel opent op de huidige zender. D-pad en linkerstick kiezen (de stick één rij per duw, bij vasthouden herhaalt hij), A bevestigt, B, Menu of Overzicht sluit zonder te kiezen. Een gekozen zender zet de radio aan, onthoudt zijn keuze per voertuigsoort en toont de melding (zender en DJ, titel en artiest) zoals bij het instappen.

### Welke knop, per situatie

| Situatie (voertuigen) | Aan of uit | Volgende, vorige | Zenderwiel |
| --- | --- | --- | --- |
| Te voet, aan de waterkant | D-pad omhoog (kort) | Acties-wiel, pagina Radio | D-pad omhoog vasthouden, of acties-wiel |
| Auto, taxi, sportwagen, suv, politie, ambulance, scooter, fiets, motor, fatbike (`vehicle`) | Acties-wiel | Acties-wiel | Acties-wiel |
| Auto met handmatig schakelen (`vehicleManual`) | Acties-wiel | Acties-wiel | Acties-wiel |
| Bus (`bus`) | Acties-wiel | Acties-wiel | Acties-wiel |
| Trekker en landbouwmachine op het erf (`trekker`) | Acties-wiel | Acties-wiel | Acties-wiel |
| Boot, zeilboot (`skutsje`, en `vehicle` voor een motorboot) | Acties-wiel | Acties-wiel | Acties-wiel |
| Helikopter, vliegtuig (`heli`, `plane`) | Acties-wiel | Acties-wiel | Acties-wiel |
| Duif (`pigeon`), trein (`train`) | Acties-wiel | Acties-wiel | Acties-wiel |
| Te voet in een Samen-spelen-sessie | Acties-wiel (D-pad omhoog is dan bij de groep) | Acties-wiel | Acties-wiel |

Waarom overal het wiel: de inventaris van `PAD_MAPS` (en `PAD_COOP`) laat zien dat in de auto, de bus, de trekker en de handmatige auto elke knop een eigen taak heeft. In de boot, de helikopter, het vliegtuig, de duif en de trein zijn enkele knoppen vrij (boot: D-pad omhoog en R3; heli: X, LB, R3 en D-pad omhoog; vliegtuig: Y en R3; duif: R3, D-pad omhoog en rechts; trein: D-pad omhoog en rechts en R3), maar dan zou het per voertuig een andere knop zijn, en in Samen spelen pakt het stuurgeven (Y) en de spelerslijst (Tab) de D-pad omhoog en R3 weer af. Eén plek die overal hetzelfde is wint van een snellere knop die per voertuig verschilt. De snelheid zit in de volgorde: Overzicht vasthouden, RB, en dan A op Volgende zender; de pagina Radio staat na de eerste pagina, dus één bladerstap.

Wie de snelste route wil kan de tikstand aanzetten (Instellingen): dan opent één tik op Overzicht het wiel.

## Samen spelen

De radio is lokaal per speler; er gaat niets over het net. De bestuurder kiest de zender van het voertuig; een passagier volgt hem en **kan niet wisselen** (het wiel opent niet, Shift+N en Alt+N doen niets, in Instellingen kiezen werkt ook niet) en krijgt de melding "De bestuurder kiest de zender." Aan of uit blijft ieders eigen keuze. Passagier is: de gastheer die het stuur aan een gast gaf (`coopWielSlot`), of een gast in het voertuig van de host zonder zelf te sturen (`coopBestuurder`, `coopWiel`). Een gast die zelf stuurt, of de bijrijder die het stuur kreeg, kiest. Het bericht dat de keuze van de bestuurder naar de passagiers brengt is nog niet gebouwd (zie RADIOZENDERS-21-11.md); tot dan volgt een passagier de zender die bij het voertuig hoort (`channelForPlayer`).

## Aanraken

De aanraak-HUD heeft geen radioknop en die is er niet bij gekomen: de radio staat op een telefoon in Instellingen > Geluid, zoals voorheen. Een aparte knop op het scherm is een eigen ontwerpkeuze (de balk is vol) en niet in deze ronde gedaan.

## Code en tests

- `game/js/radiocontrol.js`: de pure regels (zenderwiel-pagina's, N kort en lang, passagier, routes per situatie).
- `game/js/actionradial.js` en `actionradialui.js`: het wiel (nu ook met eigen pagina's, een lijst, onderdelen die niet te kiezen zijn en een toetsenbordkant).
- `game/js/radio.js`: `openRadioWheel`, de N-afhandeling en de weigering voor een passagier in `selectChannel`.
- `game/js/controls.js`: de onderdelen Vorige zender en Zenders kiezen en de groep Radio.
- Tests: `scripts/radiocontrol_test.mjs` (wiel, kort en lang, Samen, routes, herbinden), `scripts/controller_ingame_test.mjs` en `controller_ingame_audit.mjs` (geen botsingen), `radio_uit_test.mjs`, `radiochannels_test.mjs`, `radiovehicle_test.mjs`.

## Niet met een echte controller bekeken

Alles is getest met pure tests en een nep-controller (`controller_ingame_test`); geen Electron, geen beeld, geen echte controller. Nog te beproeven: het gevoel van de houdtijd (0,4 s) en van de stick in de lijst (herhaling 260 ms), of het wiel in beeld leesbaar is bij tien zenders, de glyphs onderin per apparaat (Xbox, PlayStation, Switch, Steam Deck), N vasthouden op een toetsenbord met toetsherhaling, Alt+N in de Electron-app op Windows en macOS (de menubalk), en een passagier in een echte Samen-sessie met een tweede instantie.
