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
| 29 | **vr 11 sep** | epiloog en slot; daarna loopt de open wereld door |
| 32 | ma 14 sep | Deel 4 "Nazomer" begint: M27 |
| 33 | di 15 sep | M28 |
| 35 | do 17 sep | M29 |
| 37 | za 19 sep | T5 en M30; einde van Deel 4, daarna vrij spel |

Elke stap heeft zijn dag (`STEP_DATES` in calendar.js voor de vijf akten,
`NAZOMER_STEP_DAYS` voor Deel 4; een nieuwe stap krijgt de dag van de stap ervoor).

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

### Deel 4 "Nazomer" (M27-M30 en T5)

Deel 4 is gebouwd: maandag 14 tot en met zaterdag 19 september, na de epiloog van
vrijdag 11 september (nog zomer). De data staan in `NAZOMER_STEP_DAYS` in
`game/js/calendar.js` (M27 = ma 14 sep, M28 = di 15, M29 = do 17, T5 en M30 =
za 19) en de inhoud staat in [DEEL4.md](nieuw/DEEL4.md) en
[09-script-akte6.md](nieuw/09-script-akte6.md); test: `scripts/calendar_test.mjs`.

De oude **Ommelander Ronde** (O1-O32, F4a/F4b/F4c, de zeven voorrondes en Ubbo
Oldenhuis) is geschrapt (#187). Die staat niet meer in de code en niet meer in de
kalender: er zijn geen O-nummers of F4-nummers, en `DEEL4_STEP_DAYS` en
`VOORRONDE_STEPS` zijn op 25-10 opgeruimd (zie de toelichting in
`calendar.js` bij `NAZOMER_STEP_DAYS`). Een nachtmissie hoort bij de dag waarop
hij begint; na de laatste zomerdag (di 22 sep, dag 40) toont de HUD alleen de
weekdag en "nazomer · dag N", nooit een maand.

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
