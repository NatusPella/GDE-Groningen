# Tekstinvoer met een controller, 22-11

Naslag voor het schermtoetsenbord (#1011, #495). Eigenaarseis: "Denk ook na hoe een speler die alleen met controller speelt tekstvelden in moet vullen."
Spec: [.specs-fire/standards/ui-taal.md](../.specs-fire/standards/ui-taal.md) (DS3, toets-in-de-knop) en [.specs-fire/standards/multiplayer.md](../.specs-fire/standards/multiplayer.md) (constitutie 10).
Wijkt dit doc af van de code, dan is het doc de fout.

## 1. Inventaris van alle tekstinvoer

Dertien tekstvelden in de sjablonen, twaalf soorten invoer (rij 10 heeft drie velden; het veld van rij 5 en 6 is hetzelfde element in drie lobbyschermen). `scripts/onscreenkeyboard_test.mjs` scant `game/js` en `game/index.html`: elk tekstveld zonder `data-osk` laat de test falen. Voor Samen spelen blijft de invoer **lokaal**: niets gaat naar het netwerk dat er nog niet heen ging.

| # | Veld | Waar | Type (`data-osk`) | Max | Toegestane tekens | Ook zonder tekst? | Controllerspeler vroeger |
|---|---|---|---|---|---|---|---|
| 1 | Online naam, eerste start | `onlineconsentui.js` (`.os-naam`) | `naam` | 16 | letters, cijfers, spatie en `. , ' ! ? & ( ) + -`; `profielNaam` (verhaalnamen en woordenlijst verboden) | leeg mag niet; chips met verzonnen bijnamen en Willekeurig | het kale toetsenbord (A op het veld) |
| 2 | Online naam, Instellingen | `onlineconsentui.js` (`.os-inst-naam`) | `naam` | 16 | idem | leeg mag (je figuur) | idem |
| 3 | Online naam, Spelers-tab | `coopspelersui.js` (`.cs-profiel-naam`) | `naam` | 16 | idem | leeg mag; chips | idem |
| 4 | Online naam, wachtkamer | `lobbyui.js` (`.coop-profiel-naam`) | `naam` | 16 | idem | leeg mag; chips | idem |
| 5 | Sessienaam (openbaar maken) | `lobbyui.js` (`.coop-input`) | `naam` + check `sessie-naam` | 24 | letters, cijfers, spatie en `. , ' ! ? & ( ) + -`; `schoonNaam`: lijst verboden woorden, geen echte persoonsnaam, geen adres | leeg mag (dan "Open spel"); chips met verzonnen sessienamen | idem |
| 6 | Kamercode of koppelcode | `lobbyui.js` (`.coop-input`, twee schermen) | `code` | 64 | `A-Z a-z 0-9 . : _ -`; `GDE2-` als toets | Plakken (klembord) en Recent (laatste drie) | idem |
| 7 | Wachtwoord van de sessie | `lobbyui.js` (`.coop-wachtwoord`) | `wachtwoord` | 32 | alle printbare tekens | leeg mag (open sessie) | idem |
| 8 | Zoeken in openbare sessies | `lobbyui.js` (`.coop-lijst-zoek`) | `zoek` | 60 | alle printbare tekens behalve `< >` | de filters en sortering doen het ook zonder zoekterm | idem |
| 9 | Zoek een plek, missie of minigame | `mapview.js` | `zoek` | geen | idem | chips missie, minigame, winkel; de kaart zelf is te bladeren | idem |
| 10 | Zoek in je spullen / de besturing / het menu | `pausemenu.js` (drie velden) | `zoek` | geen | idem | chips (fiets, kast, stempel; toeter, duif, kaart; kaart, geluid, besturing); alles is ook te bladeren | idem |
| 11 | Spel hernoemen | `saveslotsui.js` (`.ssl-input`) | `tekst` | 28 | geen besturingstekens, geen `< >` | chips: Spel van 22 nov (de datum van vandaag), Hoofdspel, Proefrit, Veilig | idem |
| 12 | Tekst op het nummerbord | `tuningworkshopui.js` (`.tm-plate`) | `tekst` | per auto | alle printbare tekens | standaardnummerbord (geen tekst nodig) | idem |


Geen tekstveld, dus geen toetsenbord nodig:

- **Outfit-code**: wordt getoond en gekopieerd (`clothingpanel.js` codeSection), er is geen veld om een code in te plakken. De code delen kan met de knop Kopiëren.
- **Cheats**: aan/uit en knoppen, geen getypte codes.
- **Herbinden**: de herbindschermen vangen een toets of knop op (`capturePadButton`), geen tekst.
- **Chat en zinnen**: er is geen vrije chat; de vaste zinnen zijn knoppen (Samen spelen, `multiplayerphrases.js`). Tekstchat en voicechat komen later, opt-in (zie #451).
- **Commandoregel en debug**: het ontwikkelpaneel en de dev-opdrachten zijn niet voor spelers en hebben geen schermtoetsenbord.
- **Kleur kiezen** (`input type=color`) en **spel importeren** (`input type=file`): het systeemvenster doet het (kleur en bestand). Op een controller vraagt dit een eigen oplossing (een vaste kleurenreeks staat er al naast; importeren blijft een toetsenbord-of-muis-handeling). Genoteerd, niet in dit werk.

## 2. Ontwerp

Eén bedrading voor alle velden: een veld krijgt `data-osk="naam|code|tekst|wachtwoord|zoek|cijfers"` en optioneel `data-osk-label`, `data-osk-max`, `data-osk-check` en `data-osk-chips` (`a|b|c`, `@datum` = "Spel van 22 nov"). `attachTextInput(el, opties)` doet hetzelfde vanuit code. `onscreenkeyboard.js` hangt één stel luisteraars aan het document; de sjablonen hoeven niets te weten.

Modules:

- `game/js/oskmodel.js`: puur (geen DOM): indelingen, raster, invoer, lagen, controle, suggesties, de reductor `handleKey`.
- `game/js/oskview.js`: puur: `renderOsk(stand)` geeft de kaart als HTML; `oskKnop()` de knop Toetsenbord naast een veld.
- `game/js/onscreenkeyboard.js`: de bedrading: openen, sluiten, focus, het veld synchroniseren, klembord, recente invoer.
- `game/js/ds-osk.css`: de kaart in DS3 (zeefdruk: papier, inkt, harde schaduw; geel met dikke rand = de toets onder de focus), alleen tokens.
- `controls.js` `PAD_MAPS.osk` en `gamepad.js`: zolang `<html>` de klasse `osk-open` heeft, kiest `context()` de indeling `osk` en behandelt hem als menu (herhaling, stick als pijlen).

Het toetsenbord vervangt het oude, kale toetsenbord (`padkeyboard.js` met `padkeyslogic.js`, dat alleen tekst, geen lagen, geen controle en geen suggesties kende).

### Wanneer het opent

- **Alleen als de laatst gebruikte invoer een controller is** (`inputdevice.js`: `dev-pad`). Toetsenbord en muis houden het gewone veld; aanraking gebruikt het systeemtoetsenbord (de knop Toetsenbord is er dan niet).
- **A op een gefocust veld** opent het (de Enter van het pad wordt dan niet doorgegeven aan het scherm).
- **Focus op een veld** (klik op een kaart, een programmatische focus) opent het ook, **behalve** vlak na een pijl van het pad (D-pad of stick): wie met het D-pad langs een veld naar de knoppen eronder loopt, krijgt geen kaart over zich heen. Dat is een bewuste afwijking van "opent bij focus": zonder die uitzondering is elk formulier een val. A op het veld opent het dan.
- **De knop Toetsenbord** naast elk veld (alleen zichtbaar bij `dev-pad`).
- Na sluiten keert de focus terug naar het veld en **blijft het veld "geparkeerd"**: het opent niet meteen weer; A opent opnieuw.
- Een **echte toets van het toetsenbord**, een muisbeweging of aanraking klapt het toetsenbord in (wat getypt is blijft staan). Een muisklik op de kaart zelf sluit hem niet.

### Bediening

| Knop | Toets (`PAD_MAPS.osk`) | Doet |
|---|---|---|
| D-pad of linkerstick | pijlen | beweegt over het raster; rond aan alle randen (geen dode einden); omhoog en omlaag kiezen de toets die het dichtst bij de breedte ligt |
| A | Enter | typt de toets onder de focus (of kiest de chip) |
| B | Backspace | wist een teken (houd ingedrukt: herhaalt) |
| X | Spatie | spatie |
| Y | Shift | hoofdletter: eenmalig, vast, uit |
| LB / RB | PageUp / PageDown | cursor links / rechts (houd ingedrukt: herhaalt) |
| LT / RT | `[` / `]` | vorige / volgende laag: letters, cijfers en leestekens, accenten |
| Start | F10 | bevestigt (Klaar of Zoek) |
| Overzicht (Select) | Escape | annuleert: de oude waarde komt terug |

Alle acties staan ook als toets in het raster, met de knop van het apparaat **in de toets** (toets-in-de-knop, `knopToets`, `data-gk`, `data-pad-ctx="osk"`): `glyphs.js` toont de knop van Xbox, PlayStation, Steam Deck of Switch. A, de bumpers en de triggers staan in een toetsregel onderaan. B lang indrukken annuleert **niet** (B herhaalt het wissen); annuleren is Overzicht of de toets Annuleren.

### Indelingen

| Type | Rijen | Bijzonderheden |
|---|---|---|
| `naam` | chips (vier namen en Willekeurig), qwerty NL in drie rijen, actierij, cursorrij | begint met een hoofdletter; toetsen met een niet-toegestaan teken zijn gedimd en zeggen waarom |
| `tekst` | qwerty NL | alle printbare tekens |
| `zoek` | chips (recent en vaste woorden), qwerty NL | bevestigen heet Zoek |
| `code` | cijfers, qwerty (hoofdletters vast), actierij met `GDE2-` | `GDE2-` komt vooraan, nooit dubbel; chips Plakken en Recent |
| `wachtwoord` | als tekst | voorbeeld toont bolletjes; toets Toon/Verberg; geen suggesties |
| `cijfers` | cijferpad 1 tot 9, 0 | alleen cijfers |

Lagen (`naam`, `tekst`, `zoek`, `wachtwoord`): letters, cijfers en leestekens (`1234567890`, `- _ . , : ; ! ? ' "`, `( ) & + = / @ # %  *`) en accenten (`áàâäãåæçßñ`, `éèêëíìîïĳœ`, `óòôöõøúùûü`). De accenten staan op een eigen pagina; lang indrukken is niet gebouwd (een pagina is voor een pad eenvoudiger en voorspelbaarder).

### Live

Het voorbeeld toont wat je typt, met een cursor, en het **veld zelf volgt live** (een `input`-gebeurtenis na elke toets, zodat een scherm als de wachtkamer zijn eigen concept bijhoudt). De tekenteller (`8/16`) en de controle zijn live: een afgekeurde naam krijgt meteen een zichtbare reden (maximale lengte, toegestane tekens, de lijst verboden woorden van Samen spelen), en Klaar sluit niet zolang de controle faalt. Bij sluiten met Klaar volgt een `change`-gebeurtenis. Het scherm kan intussen opnieuw getekend zijn (de lijst met sessies ververst elke twee seconden): het toetsenbord zoekt het veld dan terug via klasse, type en label.

### Suggesties zodat tikken niet hoeft

- **Naamvelden**: vier verzonnen Groningse bijnamen (`BIJNAMEN`, 24 stuks: Wadloper, Polderpiloot, Fietsbel, …) en **Willekeurig**. Nooit echte namen; de test laat elke bijnaam door `schoonNaam` en `profielNaam` gaan en bewaakt de lengte.
- **Sessienaam**: drie verzonnen sessienamen (`SESSIENAMEN`).
- **Kamercode**: **Plakken** (het klembord via `textfield.js` `readClip`: desktop-app of browser) en **Recent**, de laatste drie codes. Recent staat alleen in het geheugen van deze sessie en bevat **nooit** een directe code (`GDE2-…`) of een IP-adres (constitutie 10).
- **Zoekvelden**: recente zoekopdrachten en vaste woorden per veld (`data-osk-chips`).
- **Opslaan hernoemen**: "Spel van 22 nov" (de dag van vandaag) en de bestaande namen.

### Samen spelen

Is het van wie het spel opende, een gast, of lokaal? **Lokaal**: iedere speler vult zijn eigen veld in op zijn eigen scherm; er is geen netwerkwijziging, geen EXTRA-bericht, geen nieuwe voortgang. Constitutie 10 blijft: sessienamen gaan door de lijst verboden woorden (dezelfde `schoonNaam` als elders), geen echte persoonsnamen. Wie wegvalt of later aansluit merkt niets. Test: `scripts/onscreenkeyboard_test.mjs` (pure model en een nagebootste pagina).

### Toegankelijkheid

De kaart is `role="dialog" aria-modal="true"` met een naam ("Schermtoetsenbord: Online naam"); de focus staat op de kaart (de toetsen zijn geen tabstops) met `aria-activedescendant` op de toets onder de focus; het voorbeeld is `aria-live="polite"` en de melding `role="alert"`; de teller heeft een uitgeschreven label. Elke toets heeft een `aria-label` ("Wis een teken", "Hoofdletter", …). **Minder beweging** (`reduce-motion` of `prefers-reduced-motion`) zet het omhoogschuiven uit. Modals houden de focus binnen: een focus buiten de kaart wordt teruggezet.

### Niet gebouwd

- **Steam-schermtoetsenbord** (`ShowFloatingGamepadTextInput`): `desktop/` kent geen Steam-API (alleen `steamflags.cjs` en `SteamDeck=1`); er is geen bestaande binding en dit werk voegt geen afhankelijkheid toe. Op de Steam Deck werkt het eigen toetsenbord (de Deck is een controller). Genoteerd voor later (geen nieuwe afhankelijkheid zonder akkoord).
- **Haptiek**: optioneel gelaten; `gamepad.js` heeft het trillen centraal en een toets heeft geen eigen gebeurtenis.
- **Lang indrukken voor accenten** en **B lang voor annuleren**: zie boven.

## 3. Wat met een echte controller te testen is

Niets hiervan is met een echte controller of met het oog in het draaiende spel gezien; alleen de pure logica, een nagebootste pagina en statische beelden (`docs/beeld-22-11/toetsenbord/`, gemaakt met `scripts/ui/toetsenbord_beeld.mjs`).

1. Open Samen spelen, ga naar het profiel en druk A op het naamveld: opent de kaart? Staat de gele toets op de q? Loopt de stick er soepel overheen?
2. Wissel apparaat: pak de muis of een toets: klapt de kaart in en blijft de tekst staan?
3. Loop met het D-pad door de wachtkamer langs het naamveld: komt er geen kaart over de knoppen eronder?
4. Kies een bijnaam met A en Willekeurig; bevestig met Start; controleer dat de naam in de lijst met spelers staat.
5. Typ een afgekeurde sessienaam (een echte persoonsnaam): komt er een reden en sluit Klaar niet?
6. Kamercode: Plakken met een code op het klembord, de toets `GDE2-`, Recent na een eerste keer meedoen.
7. Wachtwoord: bolletjes, Toon en Verberg.
8. Opslaan hernoemen: voorgestelde namen en Annuleren (de oude naam komt terug).
9. Hints per apparaat: tonen de toetsen de juiste knop op Xbox, PlayStation, Steam Deck en Switch (A en B wisselen bij Nintendo)?
10. Minder beweging aan: schuift de kaart niet in beeld?
11. Op 1280x720 en 1920x1080, en op de Steam Deck (1280x800): past de kaart onder het veld en blijft het voorbeeld zichtbaar?
12. Een scherm dat opnieuw tekent terwijl het toetsenbord openstaat (de lijst met sessies): blijft de invoer staan?
