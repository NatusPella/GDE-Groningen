# Spelersmenu: UX-audit en ontwerp (21-11)

> Canonieke regels: [.specs-fire/standards/multiplayer.md](../.specs-fire/standards/multiplayer.md) en [ui-taal.md](../.specs-fire/standards/ui-taal.md). Dit document is de audit van de eerste speelsessie en het ontwerp dat eruit volgt; bij tegenspraak wint de spec.

Opdracht van de eigenaar na de eerste speelsessie: "Het spelers menu kan flink beter qua UX." Bedoeld is de hele flow:
pauzemenu > Spel > Samen spelen > Sessie en Spelers, de spelerslijst die je met Tab opent, de wachtkamer en de sessiekeuze.
De stijl was al zeefdruk; de inhoud was niet doorgedacht. Beelden voor en na: `scripts/ui/spelers_scenes.js`.

## 1. Audit: de flow als wie het spel opende

| Stap | Scherm (bestand) | Verwarrend | Ontbreekt | Te veel |
| --- | --- | --- | --- | --- |
| 1 | Samen spelen, hub (`samenhubui.js`, `samenhub.js`) | Drie stappen waarvan stap 2 en 3 leeg zijn zolang je niet kiest. | Niets groots; de keuze is helder. | Uitleg boven de knoppen. |
| 2 | Methode (`lobby.js` stap `methode`) | "Kamercode" tegenover "IP-adres (direct)": het tweede is voor de meeste spelers geen keuze. | Een aanbeveling. | Twee uitlegregels plus vier knoppen. |
| 3 | Toestemming (`onlineconsentui.js`) | Goed: één uitleg, één akkoord. | n.v.t. | n.v.t. |
| 4 | Wachtkamer, wachten (`lobby.js` `host-wacht`) | De kamercode is een kleine regel tekst; "Kopieer" geeft geen teken dat het gelukt is. "Spel starten" staat uit zonder te zeggen waarom. | Kopieerfeedback, reden bij een uitgeschakelde knop. | Zes alinea's (openbaar, wachtwoord, "wat kan samen", groepsbonus) tussen de code en de knop. |
| 5 | Wachtkamer, verbonden (`verbonden`) | Spelerschips tonen alleen naam en "opent"/"weg"; wie klaar is, staat nergens. Eruit zetten staat niet hier maar "op het tabblad Spelers". | Status per speler, een reden waarom starten (nog) niet kan. | Dezelfde zes alinea's, nu met het advies, de profieltekst en de passive-uitleg erbij: acht regels voor één knop. |
| 6 | Spel starten | De gastheer kan 10 tot 57 s stilstaan. Het menu lijkt te hangen, dubbel klikken start dubbel. | Voortgang, blokkade van een tweede klik. | n.v.t. |
| 7 | Tab > Spelers in het spel (`coopspelersui.js`) | Een volle rij met vier kolommen en drie knoppen per speler; de netstand was een kleine stip. | Richting, ready, mute/blokkeren. | "Ga erheen", "Overdragen" en "Eruit zetten" staan op elke rij, ook in de Tab-lijst die je even wilt scannen. |
| 8 | Pauzemenu > Spelers | De kop legt drie keer uit wat de sessie is. Eruit zetten vraagt "Zeker weten?" op dezelfde plek: de knop verspringt van betekenis. | Duidelijk wie het spel opende, passive mode per speler, versie. | Een lang blok "Roepen en route" boven het eigen profiel. |
| 9 | Fouten (`REASON_TEXT` in `net/protocol.js`, `lobby.js` `geweigerd`, `verbroken`) | Titel was voor elke fout "Koppelen mislukt"; "Andere versie" en "Kamer vol" lijken op elkaar. | Een titel die zegt wat er mis is en een zin over wat je doet. | n.v.t. |

## 2. Audit: de flow als gast

| Stap | Verwarrend | Ontbreekt | Te veel |
| --- | --- | --- | --- |
| Code invoeren (`gast-typt`) | Eén lange uitlegalinea boven het veld, het veld zelf staat laag; op een laag scherm klapt het wel naar boven (#871). | Een zichtbare hoofdknop met toets. | Profiel, wachtwoord, figuurkeuze en "wat bewaren we" op één scherm. |
| Verbinden | Goed: de tekst zegt na 8 en 20 s wat er kan zijn (#985). | n.v.t. | n.v.t. |
| Wachtkamer als gast | Je weet niet wie er al zit en of de start al gevraagd is: "Spel starten" doet stil iets. | Wie er in de sessie zit met status, "Start gevraagd, wachten op <naam>". | Dezelfde regels als de gastheer. |
| Verbinding weg | De tekst is goed, de titel "Verbinding weg" ook; de knop "Opnieuw verbinden" is er al. | Wat er met je eigen spel gebeurt staat alleen in de lobby, niet in de Spelers-tab. | n.v.t. |
| Eruit gezet | `wegMelding` is duidelijk. | n.v.t. | n.v.t. |

## 3. Wat dit oplevert aan principes

1. **Eén hoofdactie per scherm**, de gele knop, met toetshint (Enter). Alles wat niet nodig is om verder te komen staat in een vouw ("Meer uitleg").
2. **Status is een woord met een icoon, nooit alleen kleur.** Per speler: wie het spel opende, verbinding en ping, in de wachtkamer (ready), passive mode of actief. De versie staat één keer bovenaan: een andere versie komt de sessie niet in, dus de lijst per speler zou liegen over verschillen die er niet kunnen zijn.
3. **Een knop die uit staat, zegt waarom.** "Spel starten" is pas actief met minstens twee spelers en niemand die is weggevallen; anders staat eronder wat de gastheer kan doen.
4. **Een traag moment toont voortgang.** Spel starten wordt "Spel wordt gestart…", blokkeert een tweede klik, en zegt na 10 s dat het langer duurt dan normaal. Het HUD-bericht blijft staan als het menu dichtgaat.
5. **Gevaarlijke acties vragen om bevestiging in gewone taal**: "Rik eruit zetten?" met "Ja, eruit zetten" en "Annuleren". Niet dezelfde knop die van betekenis wisselt.
6. **De Tab-lijst is om te scannen**: vorm en kleur, naam, ping, afstand met richting, ready. Geen acties behalve de voorbereide pictogrammen voor dempen en blokkeren (uitgeschakeld, met uitleg "komt later", #451).
7. **Foutmeldingen hebben drie delen**: een titel die zegt wat er mis is, één zin wat er is gebeurd, één zin wat je doet. Geen "host" en geen "iedereen" in spelertekst.

## 4. Het ontwerp per scherm

**Wachtkamer (wie het spel opende).** Titel, de kamercode groot in een bon met de knop "Kopieer de code" (de knop meldt "Gekopieerd"), een telling "Spelers (2 van 4)" met de spelerschips, de reden onder "Spel starten", daaronder in een vouw alles wat uitleg is. Knoppen: Spel starten (geel, Enter), Kopieer de code, de rest als tweede rang.

**Wachtkamer (gast).** Zelfde opbouw: wie het spel opende, wie er in de sessie zit, "Wachten op de start". De knop is "Spel starten" (vraagt het aan wie het spel opende) en wordt "Start gevraagd" na een klik.

**Spelers-tab in het pauzemenu.** Kop: aantal spelers, een zin over jouw rol (wie opende, wat kun je), de versie. Per speler een kaart: avatar met vorm in kleur, naam, statuschips, wat de speler doet met afstand en richting, daaronder de acties (Ga erheen, Spel overdragen, Eruit zetten, en de uitgeschakelde pictogrammen dempen en blokkeren). Daarna de passive mode-knop, Roepen en het eigen profiel.

**Tab-lijst in het spel.** Compact, geen knoppen behalve de pictogrammen. De voet zegt hoe je de lijst sluit en de roepgebaren.

**Fouten.** `foutUitleg` in `playerstatus.js`: Andere versie, Kamer vol, Verbinden mislukt, Wachtwoord nodig, Je bent verwijderd, Andere wereld, Ander verhaal, Verbinding verbroken (met "Opnieuw verbinden").

## 5. Wat er gebouwd is

- `game/js/playerstatus.js` (puur, getest in `scripts/playerstatus_test.mjs`): `statusVan`, `startKnop`, `magStarten`, `foutUitleg`, `tabRegel`, `richtingVan`, `versieRegel`, `LATER_ACTIES`.
- `game/js/coopspelersui.js`: Spelers-tab en Tab-lijst opnieuw; `coopspelers.js` geeft per speler de richting mee.
- `game/js/lobby.js` en `lobbyui.js`: de Spel-starten-knop met voortgang, foutschermen met een eigen titel, de code groot en kopieerbaar met melding, uitleg in een vouw, Enter op de hoofdknop.
- `game/js/samenpanel.js`: een HUD-bericht zodra het starten het menu sluit.
- Niet aangeraakt: `net*.js`, `coopnet.js`, de testbank (een andere agent werkt daar aan netwerkfixes).

## 6. Samen spelen

Dit is een weergave: het is van wie het spel opende en van elke gast voor zichzelf wat hij ziet. Wie het spel opende ziet de knoppen Spel overdragen en Eruit zetten; een gast niet. Elke speler ziet dezelfde lijst (naam, kleur, verbinding, ready, passive mode); de afstand en richting zijn die van de eigen speler naar de ander. Er is geen voortgang of beloning mee gemoeid. Valt iemand weg, dan staat de rij als "Verbinding weg" in de lijst en blokkeert Spel starten tot de speler terug is of eruit gezet wordt. Wie later aansluit, staat bij de volgende verversing (elke 0,25 s) in de lijst. Dekking: `playerstatus_test`, `coopspelers_test`, `coopui_test`, `lobby_test`.

## 7. Niet gedaan

- Dempen en blokkeren zelf (#451): alleen de uitgeschakelde pictogrammen.
- Per-speler versie: het netwerk stuurt die niet mee en de kennismaking weigert een andere versie al.
- "Opnieuw verbinden" in de Spelers-tab: die knop staat in de lobby op het scherm Verbinding weg; de Spelers-tab beschrijft het wel.
- De hub (stap 1) en het toestemmingsscherm zijn niet herzien: die waren in orde.
