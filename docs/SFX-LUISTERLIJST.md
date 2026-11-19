# Luisterlijst voor de nieuwe geluiden (SFX-GAPS)

Voor de eigenaar of een playtester. De nieuwe geluiden zijn **niet beluisterd**: de tests rekenen ze door (zaad, geen NaN, onder de piek, eindige duur,
aantal stemmen), maar of ze goed klinken weet nog niemand. Deze lijst zegt wat je kunt beluisteren, waar je het in het spel oproept en wat niet goed mag klinken.
Staat er iets niet goed op, meld het in het audio-issue met de naam van het geluid (de naam in de eerste kolom) en een woord als "te hard", "te schel" of "herhaalt".

**Snelste route.** Start het spel met `?sfxtest` achter het adres van de webversie en druk op F8: het paneel Geluidstest toont onder **Menu** alle
UI-geluiden, onder **Water**, **Winkel** en **Deuren** de wereldgeluiden, met een afstands- en richtingsschuif. Dat is dezelfde weg als in het spel (afstand, luchtfilter, dempen bij een stem).
De omgevingslagen staan niet in het paneel: die hoor je alleen op de plek zelf (onderaan).

**Algemeen, voor elk geluid:** niet pijnlijk bij een hoofdtelefoon op een gewoon volume; geen klik of knal aan het begin of eind; de Effecten-schuif in
Instellingen > Geluid maakt ze zachter en op nul zwijgen ze; de dempknop zet ze uit; een stem die praat dempt de wereldgeluiden (de UI-geluiden niet, die zijn kort).

## Menu en beloning (UI-bus)

| Geluid | Waar je het hoort | Wat het moet zijn | Wat niet goed mag klinken |
| --- | --- | --- | --- |
| `ui_tab` | pauzemenu of telefoon: klik op een tab (Spel, Overzicht, Spullen) | twee zachte houten tikjes | een bevestigingstoon (dat is de klank van een knop); rommelig bij snel wisselen |
| `ui_weiger` | een winkel of activiteit met te weinig geld (bijvoorbeeld tennis of een hapje zonder geld) | twee lage dofe tonen omlaag: "nee" | schel, boos of lang |
| `ui_toast` | een tip of missiemelding bovenin | één glazen tikje, bijna niet te horen | opdringerig; meer dan eens per twee seconden |
| `ui_uitgave` | geld uitgeven: winkel, hapje, boete | twee muntjes die op elkaar vallen | verward met de kassa bij geld erbij (dat is een ander geluid) |
| `ui_kaart_open`, `ui_kaart_dicht` | de minikaart aanklikken of de kaart in het pauzemenu: open en weer dicht | papier dat opengevouwen en dichtgevouwen wordt | ruis die blijft hangen; samen met het inklappen van de telefoon een rommeltje |
| `ui_gevaar` | een politie- of gevaarmelding (bijvoorbeeld een brommerwaarschuwing) | twee zachte lage pulsen | een sirene; schrikken |
| `ui_ontdek` | een nieuwe streek verkennen of een nieuwe vissoort vangen | drie klokjes omhoog | te lang of te vrolijk voor een kleine vondst |
| `ui_uitkijk` | E bij een uitkijkpunt (te voet) | een wijd uitwaaierend akkoord met wat lucht | langer dan twee seconden; een metalen na-ring |
| `ui_verzameld` | een verzamelobject in Verzamelen | vier snelle pingeltjes omhoog | piepjes die op een alarm lijken |
| `ui_loopbaan` | een loopbaanniveau omhoog (een bijbaan doen tot de trap) | een trapje en een vol slotakkoord, het blijste geluid van de set | harder dan de prestatiesting; botst met de radio |

Letten op de rij: meldingen stapelen niet (een lichtere melding blijft weg als er net een zwaardere klonk); bij veel meldingen na elkaar hoor je dus minder dan je ziet.

## Wereld (`fx`-gebeurtenissen op de plek)

| Geluid | Waar je het hoort | Wat het moet zijn | Wat niet goed mag klinken |
| --- | --- | --- | --- |
| `hengel_uitwerp` | hengelen aan een gracht, vijver of haven: Spatie om uit te werpen | een zingende lijn en een plopje met kringen | de vroegere plons; te hard bij een rustige plek |
| `hengel_beet` | hetzelfde, als "BEET!" in beeld komt | twee korte tikken: het dobbertje gaat onder | niet te onderscheiden van het uitwerpen; geen haast uitstralen |
| `hengel_vangst` | een vis binnenhalen | natte klappen en spetters, een spartelende vis | te lang of te vet |
| `hengel_los` | te vroeg gehaald of de vis ontsnapt | een lijn die losschiet en een kleine plons | klinkt als een beet |
| `water_uit` | zwem naar een kade of oever en klim eruit | een natte zwaai, druppels, een klap op de kant | klinkt bij een teleport of respawn (dat mag niet); te lang |
| `horeca_hap` | E bij een horecapunt met geld op zak | een hap, een slik en een klein klinkje | vies of komisch; vet |

## Omgeving per streek (lagen: zoek de plek, wacht een paar seconden)

De lagen komen langzaam in (ongeveer twee seconden) en zijn er altijd zacht onder; het is geslaagd als je ze pas mist als je weggaat.

| Laag | Waar | Wat het moet zijn | Wat niet goed mag klinken |
| --- | --- | --- | --- |
| `bed_kust` | op de Waddenzee, de Eems of de Dollard, of op een dijk of strand aan de kust (Eemshaven, Lauwerskust, Hogeland aan de dijk) | brekende golven met sissende uitloop, wat wind | een ruisband die niet op golven lijkt; hoorbaar op een plek zonder zee binnen 150 meter |
| `bed_polder` | open land buiten de dorpen: Hogeland, Hunsingo, Oldambt, Veenkoloniën, Westerwolde, Westerkwartier | wind door gras, een verre veldvogel af en toe | een fluitende ruis; de vogel die elke tien seconden hetzelfde zegt (de lus is tien seconden) |
| `bed_riet` | langs een sloot of maar buiten de dorpen, vooral Lauwerskust | ruisend riet en zacht klotsen | scherp; te duidelijk aanwezig midden in een veld |
| `bed_industrie` | tussen loodsen en fabrieken: Eemshaven, Delfzijl, bedrijventerreinen | een lage brom, ver gekletter, af en toe stoom | een toon die doordringt; hoorbaar in een woonwijk |

In een afgesloten voertuig (auto, bus) zijn de lagen zachter; bij regen wijkt vooral de polder en de kust. Controleer ook of de lagen elkaar niet vechten op de overgang
(dijk naar polder, dorp naar industrie): er hoort een zachte overgang te zijn, geen sprong.

## Wat een mens verder kan vragen

- Klinken `ui_tab` en `ui_toast` samen met de bestaande knoppen en de tik bij het wisselen van de focus (de bestaande set) als één familie?
- Is de volgorde van prioriteit in [SFX-GAPS.md](SFX-GAPS.md) de goede, vooral de open rij "voertuig over zand, grind, gras en klinkers"?
- Past `ui_loopbaan` bij de prestatiesting (`#840`) of is hij te dichtbij zodat ze elkaar op dezelfde dag verstoren?
