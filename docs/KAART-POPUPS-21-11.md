# Kaartpopups: Zet waypoint, Reis erheen en de invoerkaart (21-11)

Eigenaar (21-11): (1) 'Zelf gaan' in Reis erheen is gewoon een waypoint en slaat nergens op; Reis erheen gaat over HOE je reist. (2) De toetsaanwijzing hoort IN de knop, niet ernaast. (3) De eerste popup (de plekkaart) had geen toetsen en de tweede wel: alle kaartpopups moeten gelijk zijn. (4) Denk na over controller en toetsenbord: hoe navigeer je door alle knoppen, overal hetzelfde. (5) Op 'Zo werkt de kaart': wat doen Q en E, hoe bereikt een controller 'Meer uitleg', en 'Terug te vinden onder Instellingen' is niet geweldig; de genummerde rijen 1 tot 4 blijven.
Stand: ontworpen, gebouwd en met pure tests gedekt; **nog niet in beeld bekeken** (geen Electron in deze ronde). Zie "In beeld te controleren". Spec: `.specs-fire/standards/ui-taal.md` (Toets in de knop, Navigatie met controller en toetsenbord) en `DESIGN_SYSTEM.md`.

## 1. De flow: van kaartklik tot reis

```
klik op de kaart (muis) / A onder het richtkruis (controller) / Enter op het doek (toetsenbord)
 |
 +-- op jezelf ................ hint "Je staat hier" [Sluiten Esc]
 +-- op een marker of plek .... PLEKKAART (niet modaal; de kaart blijft bedienbaar)
        [1 Zet waypoint | Haal weg | Volg het verhaal]   <- eerste focus
        [2 Reis erheen]  -> REISPOPUP (modaal)
        [3 Info]         -> klapt uit in de kaart, geen popup
        [Sluiten  Esc]
        |
        REISPOPUP "Reis erheen"  (plek + afstand, dan een rij per vervoerswijze)
          [1 Met de trein]  [2 Met de bus]  [3 Met de taxi]  [4 Per boot]   (volgorde: aanbevolen, daarna de snelste, daarna wat niet kan)
          [Reis nu · prijs · duur  Enter]   <- eerste focus (de primaire actie)
          [Terug  Esc]
          |
          Reis nu -> kaart dicht, reisrit.js speelt de scène (startMeerijden); klok en geld lopen mee
```

Zelf gaan bestaat niet als reisoptie. **Zet waypoint is de enige 'zelf gaan'-route**: een lijn op de kaart, de afstand en een baken in de wereld; je rijdt of loopt er zelf heen. De popup zegt dat in één zin ("Liever zelf gaan? Zet dan een waypoint."). De oude regel "Dat kan ook in Samen spelen" is weg: een gast kan een waypoint zetten en dat staat in de uitleg voor een gast (`GAST_UITLEG`), de Lagen-legenda (`GAST_LEGENDA`) en de reden bij elke rij.

### Vervoerswijzen

`REIS_MODI` (kaartactie.js) is de lijst; `status: 'actief'` komt in de popup, `'gepland'` nog niet. Een route komt van `reisOptiesVoor` (reiskaart.js, `ovopties.js`); de scène van `reisrit.js`.

| Vervoer | Status | Prijs | Duur | Kan niet als | Reden die de rij toont |
|---|---|---|---|---|---|
| Met de trein | actief | 4 tot 8 euro, naar de afstand | rit plus lopen | geen station aan beide kanten, of < 1,5 km | "Geen treinverbinding hierheen" |
| Met de bus | actief | 3 euro per rit, 3 per overstap | wachttijd 4 min, rit, lopen | geen halte binnen 600 m, of < 1,5 km | "Geen buslijn hierheen" |
| Met de taxi | actief | 5 euro plus 1 per 700 m | 2 min wachten plus de rit | < 300 m, een achtervolging, te weinig geld | "Te dichtbij: loop of rij zelf", "Niet tijdens een achtervolging: wacht tot de politie weg is", "Je hebt € n te weinig" |
| Per boot | actief | 5 euro | 5 min wachten plus de rit | geen steiger bij je of de plek, of < 1,5 km | "Geen vaarroute hierheen" |
| Vlucht (vliegtuig, helikopter) | gepland | n.t.b. | n.t.b. | geen vliegveld of helikopterplek | later |
| Eigen voertuig laten komen (garage) | gepland, met Bezit | gratis of een kleine vergoeding | komt aanrijden | geen eigen voertuig, of het staat in Samen spelen bij een ander | later |
| Fiets (deelfiets) | gepland | klein bedrag per rit | naar afstand | geen fiets in de buurt | later |

Alle onderdelen die de bestaande modules al rekenen blijven zoals ze waren (prijs en duur: `ovopties.js`; het streekvoordeel van 10% korter staat in de duur). Alleen te dichtbij is nieuw als reden per rij (`geenRoute`, kaartactie.js); `OV_MIN_M` is nu één constante in ovopties.js.

Volgorde en aanbevolen:

1. Aanbevolen (de snelste die je kunt betalen, mits niet veel trager dan zelf rijden of een sprong; `ovopties.js`), dan de rest die kan op snelheid.
2. Daarna wat te duur of geblokkeerd is (de reden staat in de rij).
3. Daarna wat er niet is (geen route; de reden staat in de rij).
4. De cijfertoets 1 tot 9 volgt die volgorde, in de rij zelf.

Is er niets dat kan, dan blijft Reis nu weg en zegt de popup waarom plus "Zet een waypoint om er zelf heen te gaan". De plekkaart zegt dan bij Reis erheen de eerste reden ("Te dichtbij: loop of rij zelf", "Je hebt € 4 te weinig") in plaats van een prijs. De knop blijft bedienbaar, want de popup legt het per vervoerswijze uit.

### Een gast in Samen spelen

Bestaande regel (#388, COOP-GAST.md): een rit verplaatst alleen je eigen figuur en de wereld is van wie het spel opende. Een gast kan dus een waypoint zetten en zelf gaan, maar niet reizen. De plekkaart toont Reis erheen met "Alleen in je eigen spel"; de popup toont dezelfde vier rijen uitgeschakeld met die reden, niets aanbevolen, geen Reis nu en de uitleg `GAST_REIS_MELDING`. Er is geen aparte wensen- of hostroute. Test: kaartpopups_test (gast), kaartreispopup_test.

### Markers en later Bezit

Elke marker opent dezelfde plekkaart; alleen de eerste actie wisselt, en daarna volgt alles dezelfde popups.

| Marker | Eerste actie (1) | Reis erheen | Opmerking |
|---|---|---|---|
| Een lege plek of straat | Zet waypoint | ja | 'spot' |
| Een missie of klus | Zet waypoint (wordt je doel) of Volg het verhaal | ja | `chooseTodo`; een Samen-spelen-onderdeel meldt `h.samen` |
| Een POI (winkel, garage, station, steiger) | Zet waypoint | ja | een station of halte heeft zelf ook Als passagier meegaan (stationtravel.js) |
| Je eigen voertuig of garage (Spullen, Garage) | Zet waypoint | ja, plus later "Laten komen" (gepland, `eigen`) | eigen voertuigen blijven bij de eigenaar in Samen spelen (COOP-GAST.md, #449) |
| Een pand van jou (Bezit, komt later) | Zet waypoint | ja | Bezit voegt alleen een regel toe in `ACTIE_TOETSEN` en een actie als Beheer; de popups veranderen niet |
| Het waypoint zelf | Haal weg | ja | een tweede klik haalt het weg |

Uitbreiden is data: een actie erbij is één regel in `actieModel` plus een cijfer in `ACTIE_TOETSEN`; een vervoerswijze erbij is één regel in `REIS_MODI`, een route in `reisOptiesVoor` en een scène in `reisrit.js`.

## 2. De invoerkaart

Eén patroon voor alle kaartpopups (en het voorbeeld voor elk menu): **bevestigen is Enter of A, terug is Esc of B, de secundaire actie is X of Delete (alleen waar hij bestaat), omhoog en omlaag lopen door de knoppen, een cijfer kiest een rij**. Het pad stuurt dezelfde toetsen als het toetsenbord (gamepad.js `PAD_MAPS.menu`: A is Enter, B is Esc, X is Delete, Y is spatie, LB en RB zijn Q en E, LT en RT zijn [ en ], L3 is Tab, D-pad en stick zijn de pijlen), dus er is één codepad (`mapview.js kaartToets`).

| Actie | Toetsenbord | Muis | Controller | Aanraking | Glyph in de knop |
|---|---|---|---|---|---|
| Plek kiezen op de kaart | Enter op het doek | klik | A onder het richtkruis | tik | geen (de kaart zelf) |
| Zet waypoint, Haal weg, Volg het verhaal | 1, of Enter met de focus erop | klik | D-pad naar de knop, A | tik | `1` (pad: geen, dan A bevestigt de focus) |
| Reis erheen | 2, of Enter | klik | D-pad, A | tik | `2` |
| Info | 3, of Enter | klik | D-pad, A | tik | `3` |
| Plekkaart sluiten | Esc | klik op Sluiten | B | tik | Esc (pad: B) |
| Een vervoer kiezen | 1 tot 9, of pijl en Enter | klik | D-pad, A | tik | het cijfer in de rij |
| Reis nu | Enter (eerste focus) | klik | A | tik | Enter (pad: A, Switch: de rechterknop) |
| Terug uit de popup | Esc | klik op Terug of ernaast | B | tik | Esc (pad: B) |
| Uitleg 'Begrepen' | Enter, spatie, Esc of klik ernaast | klik | A of B | tik | Enter (pad: A) |
| Uitleg opnieuw | klik op ? | klik | L3 naar de kaartknoppen, A | tik | geen |
| Lopen door de lijst | pijl omhoog en omlaag, Home, End | hover | D-pad, stick | n.v.t. | n.v.t. |
| Binnen een venster blijven | Tab, Shift+Tab (rond) | n.v.t. | D-pad blijft in het venster | n.v.t. | n.v.t. |

De glyph is de keycap uit `glyphHtml` (keycap.js) met `data-gk`: `glyphs.js` zet hem live om naar de knop van het apparaat dat de speler nu gebruikt (toetsenbord, Xbox, PlayStation, Steam Deck, Switch), verbergt hem op aanraking en als de controller de toets niet heeft (een cijfer). Hij verdwijnt dan met zijn wikkel; de knop houdt zijn label. Een herbonden toets toont de nieuwe toets. Q en E doen in een open kaartvenster niets (ze wisselen anders het menu onder de kaart); op de gewone kaart wisselen ze de menupagina, zie hieronder.

### Wat Q en E op de kaart doen

Q en E (LB en RB op een controller) zijn geen kaartfunctie: het zijn de vaste menutoetsen van het pauzemenu. Op de kaart gaan ze naar de vorige of volgende pagina van het menu (`pausemenu.js` `cycleSection`, `cycleOwnTabs`). De kaart heeft zelf geen tabs of modi. Besluit: ze staan niet meer in 'Zo werkt de kaart' (de uitleg gaat over de kaart) en de voetbalk zegt op de kaart "andere pagina" in plaats van "onderdeel". Andere schermen houden "onderdeel" of "tabblad"; of die woorden beter kunnen is een vervolgpunt.

### Eerste focus, focusval en herstel

- **Plekkaart (niet modaal):** de eerste focus staat op de primaire actie (eerste knop). Geen focusval: Tab loopt door naar de rest van de kaart. Esc sluit hem en geeft de focus aan de kaart. Met de focus in de kaart lopen de pijlen langs de knoppen en schuift de kaart niet; WASD schuift hem nog wel.
- **Reispopup (modaal):** de eerste focus staat op Reis nu (zonder Reis nu op Terug); Tab en D-pad blijven binnen het venster; pijl omlaag en omhoog lopen door rijen en voetknoppen, links en rechts tussen Reis nu en Terug. Enter op een rij kiest hem en zet de focus op Reis nu (Enter, Enter is boeken); een muisklik op een rij laat de focus staan. Esc, B of een klik naast het venster is Terug en zet de focus op Reis erheen in de plekkaart.
- **Uitleg 'Zo werkt de kaart' (modaal, een knop):** de focus staat op Begrepen; na sluiten gaat hij naar het doek, of naar de Hulp-knop als de uitleg daarvan kwam.
- **Volgorde van lagen bij Esc of B:** uitleg, reispopup, plekkaart, kaart. Elke Esc gaat precies één laag terug (`pausemenu.js goBack`).
- De controller bereikt alle kaartknoppen (zoeken, Lagen, zoom, Naar jezelf, Hulp) met L3 en de D-pad (`padmapnav.js`); in een open kaartvenster blijft de D-pad in het venster.

### Zo werkt de kaart (eerste keer)

Behouden: de vier genummerde rijen (zoek, Lagen, klik een plek, sluiten). Nieuw: **Begrepen met Enter in de knop**; geen 'Meer uitleg' (een controller kwam er niet bij en vier rijen zijn kort genoeg; de volledige regels staan nog in Hulp, `helpoverview.js`, en in de uitleg als iconen uit staan); de regel 'Terug te vinden onder Instellingen' is weg en vervangen door een **Hulp-knop (?)** bij de zoomknoppen, die dezelfde uitleg op elk moment opent. Een gast leest de Samen-spelen-regel als zin onder de rijen. De Q/E-rij is vervangen door "M of Esc sluit de kaart".

## 3. Samen spelen

Het is van iedereen dezelfde kaartpopup; de regels (COOP-GAST.md): de kaart en de waypoints zijn per speler (lokaal); **Reis erheen** is alleen voor wie het spel opende (de wereld), een gast ziet de rijen uitgeschakeld met de reden; Zet waypoint doet iedereen lokaal. Niets nieuws over het netwerk. Test: kaartpopups_test (gast), kaartreispopup_test, kaartactie_test.

## 4. Losse toetshints naast een knop elders

Gezocht in `game/js` (een glyph of `{TOKEN}` direct na een `</button>`): **geen losse hints meer in de kaartpopups**; de rest van het spel had er geen gevonden. De knoppen die de toets al in de knop hebben maar nog niet via `dsButtonKey` lopen (opruiming later, zelfde uiterlijk): minigamekit.js (Doorgaan, Stoppen: `keyTextHtml` in de knop), todoui.js (`.m-kc` in Doorgaan), trailer.js (`Terug {ESC}` als tekst in de knop), lobbyui.js (te bekijken). Aanbevolen vervolg: die vier op `dsButtonKey` zetten en de bewaking (`controleerToetsInKnop`) over de hele repo laten lopen.

## 5. Bewaking

- `game/js/dsbutton.js`: `dsButtonKey` en `knopToets`, één component voor "toets in de knop".
- `scripts/lib/ds3_regels.mjs` `controleerToetsInKnop`, aangeroepen door `scripts/ds3_dekking_test.mjs`: een knop met `data-key` heeft zijn glyph (`.ds-z-knop__toets` met `data-gk`) in de knop; geen `.hint`, `.ds-toetsregel` of `.mv-help-toets` direct na een `</button>`.
- `scripts/kaartpopups_test.mjs`: de opties per situatie, de glyph per apparaat, de navigatie (`listnav.js navIndex`) en de verdrading.
- Bestaande tests bijgewerkt: kaartactie_test, kaartreispopup_test, kaartuitleg_test.

## 6. In beeld te controleren (1280x720 en 1920x1080)

Niet in beeld gezien; het is hier uit code en pure tests gebouwd. Bij 1280x720 en 1920x1080, ui-schaal 1,0 en 1,5, met Rustig drukwerk aan en uit:

1. **Plekkaart, toetsenbord:** klik op een lege plek: eerste focus (geen ring bij een muisklik); de cijfers 1, 2, 3 staan rechts in de drie knoppen, Esc in Sluiten; geen tekst onder 15 px; de plekkaart past naast de zoomknoppen.
2. **Plekkaart, controller:** wissel naar een controller: de cijfers verdwijnen; alleen Sluiten toont B. D-pad loopt Zet waypoint, Reis erheen, Info, Sluiten met een duidelijke DS3-focusring; A bevestigt; B sluit.
3. **Reispopup, toetsenbord:** vier rijen met icoon, zin, prijs, duur, het woord aanbevolen en het cijfer rechts; Reis nu met Enter in de knop, Terug met Esc. Controleer ook de varianten: te dichtbij (alles uit met reden), te weinig geld, geen trein, een gast (alles uit, geen Reis nu).
4. **Reispopup, controller en glyphs:** Xbox (A en B), PlayStation (kruis en rondje), Steam Deck en Switch: de glyph in Reis nu en Terug volgt het apparaat en de rijcijfers verdwijnen. Een herbonden toets toont de nieuwe toets.
5. **Focus:** Tab blijft in het venster; Enter op een rij zet de focus op Reis nu; Esc gaat een laag terug en zet de focus op Reis erheen.
6. **Uitleg:** vier genummerde rijen met de ringen op zoekveld en Lagen; geen Meer uitleg, geen Instellingen-regel; Begrepen met Enter in de knop; de Hulp-knop (?) staat bij de zoomknoppen en opent hem opnieuw; een gast leest de Samen-spelen-regel.
7. **Contrast en maat:** de glyph in een gele knop (Reis nu), in een papieren knop (Terug, Sluiten) en in de donkere plekkaartrijen: leesbaar in Rustig drukwerk en de kleurenblindmodi; de rijen worden bij 1,5 niet breder dan het venster; geen glyph klopt buiten de knop.
8. **Voetbalk:** op de kaart staat "andere pagina" bij Q en E.

## Afgewezen alternatieven

- **Zelf gaan houden als rij 'zonder reis':** het is een waypoint; twee wegen naar dezelfde actie verwarren, en het kostte een zin uitleg.
- **Een gast de rijen verbergen:** de reden "Alleen in je eigen spel" op elke rij is duidelijker dan een lege popup.
- **De glyph links van het label of als badge in de hoek:** rechts in de rij en achter het label in een gewone knop sluit aan op de voetbalk van het pauzemenu en de Reis nu-knop; een badge in de hoek botst met het aanbevolen-label.
- **Padknoppen voor de cijfers:** een controller heeft geen cijfers; een verzonnen mapping (X voor Info) botst met de menu-indeling (X is Delete). De D-pad en A zijn genoeg, en het cijfer verdwijnt zoals alle toetsen zonder padknop.
- **Focusval in de plekkaart:** hij is geen venster; de kaart blijft bedienbaar. Esc en B geven de kaart terug.
