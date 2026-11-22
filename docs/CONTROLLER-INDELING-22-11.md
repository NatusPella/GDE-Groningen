# Controllerindeling in het spel (22-11)

Gegenereerd met `node scripts/controller_ingame_doc.mjs --schrijf` uit `game/js/controls.js` (PAD_MAPS, PAD_COOP, het acties-wiel) en de inventaris van `scripts/controller_ingame_audit.mjs`; niet met de hand bijwerken. Een printbare versie staat in [CONTROLLER-CHEATSHEET-22-11.html](CONTROLLER-CHEATSHEET-22-11.html). Bevindingen en open punten: [CONTROLLER-REVIEW-22-11-ingame.md](CONTROLLER-REVIEW-22-11-ingame.md).

## Regels die overal gelden

- Knopnamen zijn die van de Xbox-indeling (A onderaan). PlayStation: Kruis, Rondje, Vierkant, Driehoek, L1, R1, L2, R2, L3, R3, Delen, Opties. Nintendo: A en B, X en Y wisselen van plek, LB en RB zijn L en R, LT en RT zijn ZL en ZR. Steam Deck: als Xbox, schouders L1 en R1.
- **Overzicht** (View) kort indrukken is de kaart. **Houd Overzicht 0,4 seconde** voor het acties-wiel met alles wat in die situatie geen eigen knop heeft: kies met de linkerstick of de D-pad, A bevestigt, B (of Menu, of Overzicht nog eens) sluit, LB en RB bladeren naar de volgende pagina.
- Wie niet kan houden zet bij Instellingen de tikstand (rennen, richten of beide) aan: dan opent één tik op Overzicht het wiel en staat de kaart er als eerste onderdeel in.
- **Menu** (Start) opent en sluit het pauzemenu met de telefoon. In het menu is B terug, LB en RB wisselen van onderdeel, de triggers zoomen op de kaart.
- Elke knop is te verplaatsen bij Instellingen > Besturing; het wiel volgt dat vanzelf, want het stuurt dezelfde toetsen als het toetsenbord. Een oude herbinding blijft gewoon werken: er is niets aan opslag of knopnamen veranderd.
- Het wiel blijft in menu's en minigames weg: daar is Overzicht gewoon de kaart of de eigen knop van het spel.

## Per situatie

### Te voet (`foot`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Lopen | W A S D | |
| A | Springen | SPATIE |  |
| B | Bukken | CTRL |  |
| X | Tweede gebruikstoets (uitstappen) | F | Wiel met snelle zinnen (T) |
| Y | Instappen, praten, gebruiken | E |  |
| LB | Vorig wapen | WHEEL |  |
| RB | Volgend wapen | WHEEL |  |
| LT | Richten | RMB |  |
| RT | Aanvallen, schieten | LMB |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu en telefoon | ESC |  |
| L3 | Rennen | SHIFT |  |
| R3 | Volgend doelwit, spelerslijst | TAB |  |
| D-pad ↑ | Radio aan of uit | N | Bij de groep komen (B) |
| D-pad ↓ | Kusje | K | Roepen: Help! (8) |
| D-pad ← | Verhaalstap overslaan | O | Roepen: Kom hier (7) |
| D-pad → | Lak of garagemenu | R | Wijzen: Kijk daar (9) |

Wiel, Spelen: Kaart (M), Radio aan of uit (N), Volgende zender (Shift + N), Andere kleren (6), Filmcamera (V), Eerste persoon (C), Waypoint naar je doel (5), Verhaalstap overslaan (O), Lak of garagemenu (R), Kusje (K).
Wiel, Wapens: Slaan (1), Pistool (2), Geweer (3), Gooien (4).

### Aan de waterkant (hengelen) (`hengelen`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Lopen | W A S D | |
| A | Springen | SPATIE |  |
| B | Bukken | CTRL |  |
| X | Hengelen | I |  |
| Y | Instappen, praten, gebruiken | E |  |
| LB | Vorig wapen | WHEEL |  |
| RB | Volgend wapen | WHEEL |  |
| LT | Richten | RMB |  |
| RT | Aanvallen, schieten | LMB |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu en telefoon | ESC |  |
| L3 | Rennen | SHIFT |  |
| R3 | Volgend doelwit, spelerslijst | TAB |  |
| D-pad ↑ | Radio aan of uit | N | Bij de groep komen (B) |
| D-pad ↓ | Kusje | K | Roepen: Help! (8) |
| D-pad ← | Verhaalstap overslaan | O | Roepen: Kom hier (7) |
| D-pad → | Lak of garagemenu | R | Wijzen: Kijk daar (9) |

Wiel, Spelen: Kaart (M), Radio aan of uit (N), Volgende zender (Shift + N), Andere kleren (6), Filmcamera (V), Eerste persoon (C), Waypoint naar je doel (5), Verhaalstap overslaan (O), Lak of garagemenu (R), Kusje (K).
Wiel, Wapens: Slaan (1), Pistool (2), Geweer (3), Gooien (4).
Wiel, Samen spelen: Snelle zinnen (T, alleen Samen spelen).

### Auto, scooter, fiets (`vehicle`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Sturen | A D | |
| A | Handrem | SPATIE |  |
| B | Zwaailicht en sirene | L |  |
| X | Toeteren | H |  |
| Y | Instappen, praten, gebruiken | E |  |
| LB | Wiel met snelle zinnen (alleen in Samen spelen) | T |  |
| RB | Aanvallen, schieten | LMB |  |
| LT | Remmen, achteruit | S |  |
| RT | Gas | W |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu en telefoon | ESC |  |
| L3 | Versnellen | SHIFT |  |
| R3 | Achterom kijken | Q | Volgend doelwit tijdens het richten (TAB) |
| D-pad ↑ | Alarmlichten | P | Het stuur geven of vragen (Y) |
| D-pad ↓ | Hengelen (boot die stilligt) | I |  |
| D-pad ← | Richtingaanwijzer links | [ |  |
| D-pad → | Richtingaanwijzer rechts | ] |  |

Wiel, Spelen: Kaart (M), Radio aan of uit (N), Volgende zender (Shift + N), Andere kleren (6), Filmcamera (V), Eerste persoon (C), Waypoint naar je doel (5), Alarmlichten (P), Verhaalstap overslaan (O), Lak of garagemenu (R).
Wiel, Samen spelen: Kom hier (7, alleen Samen spelen), Help! (8, alleen Samen spelen), Kijk daar (9, alleen Samen spelen).

### Auto, handmatig schakelen (`vehicleManual`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Sturen | A D | |
| A | Handrem | SPATIE |  |
| B | Zwaailicht en sirene | L |  |
| X | Toeteren | H |  |
| Y | Instappen, praten, gebruiken | E |  |
| LB | Een versnelling lager | , |  |
| RB | Een versnelling hoger | . |  |
| LT | Remmen, achteruit | S |  |
| RT | Gas | W |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu en telefoon | ESC |  |
| L3 | Koppeling indrukken | J |  |
| R3 | Achterom kijken | Q | Volgend doelwit tijdens het richten (TAB) |
| D-pad ↑ | Wiel met snelle zinnen (alleen in Samen spelen) | T | Het stuur geven of vragen (Y) |
| D-pad ↓ | Hengelen (boot die stilligt) | I |  |
| D-pad ← | Richtingaanwijzer links | [ |  |
| D-pad → | Richtingaanwijzer rechts | ] |  |

Wiel, Spelen: Kaart (M), Radio aan of uit (N), Volgende zender (Shift + N), Andere kleren (6), Filmcamera (V), Eerste persoon (C), Waypoint naar je doel (5), Alarmlichten (P), Verhaalstap overslaan (O), Lak of garagemenu (R).
Wiel, Samen spelen: Kom hier (7, alleen Samen spelen), Help! (8, alleen Samen spelen), Kijk daar (9, alleen Samen spelen), Snelle zinnen (T, alleen Samen spelen).

### Bus (`bus`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Sturen | A D | |
| A | Handrem | SPATIE |  |
| B | Zwaailicht en sirene | L |  |
| X | Toeteren | H |  |
| Y | Instappen, praten, gebruiken | E |  |
| LB | Bus: deuren | O |  |
| RB | Bus: kneel | K |  |
| LT | Remmen, achteruit | S |  |
| RT | Gas | W |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu en telefoon | ESC |  |
| L3 | Versnellen | SHIFT |  |
| R3 | Achterom kijken | Q | Volgend doelwit tijdens het richten (TAB) |
| D-pad ↑ | Alarmlichten | P | Het stuur geven of vragen (Y) |
| D-pad ↓ | Filmcamera | V |  |
| D-pad ← | Richtingaanwijzer links | [ |  |
| D-pad → | Richtingaanwijzer rechts | ] |  |

Wiel, Spelen: Kaart (M), Radio aan of uit (N), Volgende zender (Shift + N), Andere kleren (6), Eerste persoon (C), Waypoint naar je doel (5), Alarmlichten (P), Busdienst overnemen (G).
Wiel, Samen spelen: Kom hier (7, alleen Samen spelen), Help! (8, alleen Samen spelen), Kijk daar (9, alleen Samen spelen), Snelle zinnen (T, alleen Samen spelen).

### Boot (zeilen) (`skutsje`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Sturen | A D | |
| A | Handrem | SPATIE |  |
| B | Zwaailicht en sirene | L |  |
| X | Toeteren | H |  |
| Y | Instappen, praten, gebruiken | E |  |
| LB | Boot: zeil vieren | Z |  |
| RB | Boot: zeil aanhalen | Q |  |
| LT | Remmen, achteruit | S |  |
| RT | Gas | W |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu en telefoon | ESC |  |
| L3 | Versnellen | SHIFT |  |
| R3 | (niets) |  | Volgend doelwit tijdens het richten (TAB) |
| D-pad ↑ | (niets) |  | Het stuur geven of vragen (Y) |
| D-pad ↓ | Hengelen (boot die stilligt) | I |  |
| D-pad ← | Verhaalstap overslaan | O |  |
| D-pad → | Lak of garagemenu | R |  |

Wiel, Spelen: Kaart (M), Radio aan of uit (N), Volgende zender (Shift + N), Andere kleren (6), Filmcamera (V), Eerste persoon (C), Waypoint naar je doel (5).
Wiel, Samen spelen: Kom hier (7, alleen Samen spelen), Help! (8, alleen Samen spelen), Kijk daar (9, alleen Samen spelen), Snelle zinnen (T, alleen Samen spelen).

### Trekker op het erf (`trekker`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Sturen | A D | |
| A | Handrem | SPATIE |  |
| B | Trekker: werktuig ontkoppelen | X |  |
| X | Toeteren | H |  |
| Y | Instappen, praten, gebruiken | E |  |
| LB | Trekker: hef omhoog of omlaag | T |  |
| RB | Aanvallen, schieten | LMB |  |
| LT | Remmen, achteruit | S |  |
| RT | Gas | W |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu en telefoon | ESC |  |
| L3 | Versnellen | SHIFT |  |
| R3 | Achterom kijken | Q |  |
| D-pad ↑ | Trekker: aftakas | G |  |
| D-pad ↓ | Trekker: tanken | R |  |
| D-pad ← | Richtingaanwijzer links | [ |  |
| D-pad → | Richtingaanwijzer rechts | ] |  |

Wiel, Spelen: Kaart (M), Radio aan of uit (N), Volgende zender (Shift + N), Andere kleren (6), Filmcamera (V), Eerste persoon (C), Waypoint naar je doel (5), Alarmlichten (P), Verhaalstap overslaan (O).
Wiel, Samen spelen: Kom hier (7, alleen Samen spelen), Help! (8, alleen Samen spelen), Kijk daar (9, alleen Samen spelen).

### Helikopter (`heli`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Vliegen | W A S D | |
| A | Omhoog | SPATIE |  |
| B | Omlaag | CTRL |  |
| Y | Instappen, praten, gebruiken | E |  |
| RB | Sneller | SHIFT |  |
| LT | Omlaag | CTRL |  |
| RT | Omhoog | SPATIE |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu en telefoon | ESC |  |
| L3 | Sneller | SHIFT |  |
| D-pad ↓ | Filmcamera | V |  |
| D-pad ← | Verhaalstap overslaan | O |  |
| D-pad → | Minigame of vluchtdienst stoppen | BACKSPACE |  |

Wiel, Spelen: Kaart (M), Radio aan of uit (N), Volgende zender (Shift + N), Eerste persoon (C), Waypoint naar je doel (5).
Wiel, Samen spelen: Kom hier (7, alleen Samen spelen), Help! (8, alleen Samen spelen), Kijk daar (9, alleen Samen spelen), Snelle zinnen (T, alleen Samen spelen).

### Vliegtuig (`plane`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Vliegen | W A S D | |
| A | Neus omhoog | SPATIE |  |
| B | Neus omlaag | CTRL |  |
| X | Vliegtuig: landingsgestel | G |  |
| LB | Vliegtuig: kleppen | K |  |
| RB | Remmen op de baan | SHIFT |  |
| LT | Neus omlaag | CTRL |  |
| RT | Neus omhoog | SPATIE |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu en telefoon | ESC |  |
| L3 | Remmen op de baan | SHIFT |  |
| D-pad ↑ | Verhaalstap overslaan | O |  |
| D-pad ↓ | Minigame of vluchtdienst stoppen | BACKSPACE |  |
| D-pad ← | Vliegtuig: roer links | Q |  |
| D-pad → | Vliegtuig: roer rechts | E |  |

Wiel, Spelen: Kaart (M), Radio aan of uit (N), Volgende zender (Shift + N), Eerste persoon (C), Waypoint naar je doel (5).
Wiel, Samen spelen: Kom hier (7, alleen Samen spelen), Help! (8, alleen Samen spelen), Kijk daar (9, alleen Samen spelen), Snelle zinnen (T, alleen Samen spelen).

### Duif (`pigeon`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Vliegen | W A S D | |
| A | Klapwieken | SPATIE |  |
| B | Pikken en landen | CTRL |  |
| X | Duif: poepen | F |  |
| Y | Instappen, praten, gebruiken | E |  |
| LB | Duif: koeren | C |  |
| RB | Achterom kijken (in een voertuig) | Q |  |
| LT | Sneller vliegen | SHIFT |  |
| RT | Aanvallen, schieten | LMB |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu en telefoon | ESC |  |
| L3 | Sneller vliegen | SHIFT |  |
| D-pad ↓ | Duif: weer mens worden | X |  |
| D-pad ← | Verhaalstap overslaan | O |  |

Wiel, Spelen: Kaart (M), Radio aan of uit (N), Volgende zender (Shift + N).
Wiel, Samen spelen: Kom hier (7, alleen Samen spelen), Help! (8, alleen Samen spelen), Kijk daar (9, alleen Samen spelen), Snelle zinnen (T, alleen Samen spelen).

### Trein (machinist) (`train`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Lopen door de cabine | W A S D | |
| A | Noodrem | SPATIE |  |
| B | Minigame of vluchtdienst stoppen | BACKSPACE |  |
| X | Toeteren | H |  |
| Y | Instappen, praten, gebruiken | E |  |
| LB | Trein: waakzaamheidsknop | K |  |
| RB | Trein: dienst starten | G |  |
| LT | Achteruit, remmen | S |  |
| RT | Vooruit, gas | W |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu en telefoon | ESC |  |
| L3 | Trein: deuren | O |  |
| D-pad ↓ | Trein: door de trein lopen | T |  |
| D-pad ← | Trein: deuren | O |  |

Wiel, Spelen: Kaart (M), Radio aan of uit (N), Volgende zender (Shift + N), Cabinecamera (C).
Wiel, Samen spelen: Kom hier (7, alleen Samen spelen), Help! (8, alleen Samen spelen), Kijk daar (9, alleen Samen spelen).

### Bijbaan of tekstpaneel (`minigame`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Lopen | W A S D | |
| A | Springen, handrem | SPATIE |  |
| B | Minigame stoppen | BACKSPACE |  |
| X | Gebruiken (tweede knop), duif: poepen | F |  |
| Y | Instappen, gebruiken | E |  |
| LB | Vorig wapen | WHEEL |  |
| RB | Volgend wapen | WHEEL |  |
| LT | Richten | RMB |  |
| RT | Aanvallen, schieten | LMB |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu | ESC |  |
| L3 | Rennen | SHIFT |  |
| R3 | Volgend doelwit tijdens het richten | TAB |  |
| D-pad ↑ | Slaan | 1 |  |
| D-pad ↓ | Geweer | 3 |  |
| D-pad ← | Gooien: carbidbus | 4 |  |
| D-pad → | Pistool | 2 |  |

### Vraag van Samen spelen (J of N) (`coopvraag`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Lopen | W A S D | |
| A | Rijden | J |  |
| B | Radio aan of uit (ook te voet) | N |  |
| X | Gebruiken (tweede knop), duif: poepen | F |  |
| Y | Instappen, gebruiken | E |  |
| LB | Vorig wapen | WHEEL |  |
| RB | Volgend wapen | WHEEL |  |
| LT | Richten | RMB |  |
| RT | Aanvallen, schieten | LMB |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu | ESC |  |
| L3 | Rennen | SHIFT |  |
| R3 | Volgend doelwit tijdens het richten | TAB |  |

### Carillon (`klokken`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Kiezen | pijltjes | |
| A | ; | ; |  |
| B | Zwaailicht en sirene | L |  |
| X | Rijden | J |  |
| Y | Kusje | K |  |
| LB | Achterom kijken (in een voertuig) | Q |  |
| RB | Instappen, gebruiken | E |  |
| LT | Minigame stoppen | BACKSPACE |  |
| RT | Springen, handrem | SPATIE |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu | ESC |  |
| D-pad ↑ | Gebruiken (tweede knop), duif: poepen | F |  |
| D-pad ↓ | Achteruit | S |  |
| D-pad ← | Links | A |  |
| D-pad → | Rechts | D |  |

### Pannenkoekenschip (`pannenkoek`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| A | Achterom kijken (in een voertuig) | Q |  |
| B | Vooruit | W |  |
| X | Instappen, gebruiken | E |  |
| Y | Lak of garagemenu | R |  |
| LB | Slaan | 1 |  |
| RB | Pistool | 2 |  |
| LT | Geweer | 3 |  |
| RT | Minigame stoppen | BACKSPACE |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu | ESC |  |

### Klimtoren (`klimtoren`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| A | Springen, handrem | SPATIE |  |
| B | Minigame stoppen | BACKSPACE |  |
| X | Gebruiken (tweede knop), duif: poepen | F |  |
| Y | Instappen, gebruiken | E |  |
| LB | Links | A |  |
| RB | Rechts | D |  |
| LT | Richten | RMB |  |
| RT | Aanvallen, schieten | LMB |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu | ESC |  |
| L3 | Rennen | SHIFT |  |
| R3 | Volgend doelwit tijdens het richten | TAB |  |
| D-pad ← | Links | A |  |
| D-pad → | Rechts | D |  |

### Voetbal (Euroborg) (`voetbal`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Lopen | W A S D | |
| A | Gebruiken (tweede knop), duif: poepen | F |  |
| B | Instappen, gebruiken | E |  |
| X | Springen, handrem | SPATIE |  |
| Y | Achterom kijken (in een voertuig) | Q |  |
| LB | Bukken | CTRL |  |
| LT | Rennen | SHIFT |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu | ESC |  |
| D-pad ↑ | Slaan | 1 |  |
| D-pad ↓ | Geweer | 3 |  |
| D-pad ← | Pistool | 2 |  |
| D-pad → | Minigame stoppen | BACKSPACE |  |

### Snackwagen (`foodtruck`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Lopen | W A S D | |
| A | Springen, handrem | SPATIE |  |
| B | Minigame stoppen | BACKSPACE |  |
| X | Minigame stoppen | BACKSPACE |  |
| Y | Instappen, gebruiken | E |  |
| LB | Waypoint naar je eigen doel (nog eens: weg) | 5 |  |
| RB | Andere kleren | 6 |  |
| RT | Gas | W |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu | ESC |  |
| D-pad ↑ | Slaan | 1 |  |
| D-pad ↓ | Geweer | 3 |  |
| D-pad ← | Gooien: carbidbus | 4 |  |
| D-pad → | Pistool | 2 |  |

### Vliegschool (lesmenu) (`vliegschool`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Kiezen | pijltjes | |
| A | Kiezen | ENTER |  |
| B | Minigame stoppen | BACKSPACE |  |
| Overzicht | Kaart | M |  |
| Menu | Pauzemenu | ESC |  |
| D-pad ↑ | Omhoog | ↑ |  |
| D-pad ↓ | Omlaag | ↓ |  |
| D-pad ← | Links | ← |  |
| D-pad → | Rechts | → |  |

### Menu, telefoon en kaart (`menu`)

| Knop | Doet | Toets op het toetsenbord | Samen spelen |
| --- | --- | --- | --- |
| Linkerstick | Kiezen | pijltjes | |
| A | Kiezen | ENTER |  |
| B | Terug | ESC |  |
| X | Doel wissen | DEL |  |
| Y | Springen, handrem | SPATIE |  |
| LB | Achterom kijken (in een voertuig) | Q |  |
| RB | Instappen, gebruiken | E |  |
| LT | Richtingaanwijzer links (nog eens: uit) | [ |  |
| RT | Richtingaanwijzer rechts (nog eens: uit) | ] |  |
| Overzicht | Kaart | M |  |
| Menu | Terug | ESC |  |
| L3 | Volgend doelwit tijdens het richten | TAB |  |
| D-pad ↑ | Omhoog | ↑ |  |
| D-pad ↓ | Omlaag | ↓ |  |
| D-pad ← | Links | ← |  |
| D-pad → | Rechts | → |  |

## Per actie, over alle situaties

Een streepje: de actie bestaat in die situatie niet. Wiel: houd Overzicht. Knoppen in een Samen-spelen-sessie staan bij de situatie hierboven.

| Groep | Actie | Toets | Voet | Water | Auto | Hand | Bus | Boot | Trekker | Heli | Vliegtuig | Duif | Trein |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bewegen | Vooruit, gas | W | Linkerstick | Linkerstick | RT | RT | RT | RT | RT | Linkerstick | Linkerstick | Linkerstick | RT |
| Bewegen | Achteruit, remmen | S | Linkerstick | Linkerstick | LT | LT | LT | LT | LT | Linkerstick | Linkerstick | Linkerstick | LT |
| Bewegen | Links, sturen | A | Linkerstick | Linkerstick | Linkerstick | Linkerstick | Linkerstick | Linkerstick | Linkerstick | Linkerstick | Linkerstick | Linkerstick | - |
| Bewegen | Rechts, sturen | D | Linkerstick | Linkerstick | Linkerstick | Linkerstick | Linkerstick | Linkerstick | Linkerstick | Linkerstick | Linkerstick | Linkerstick | - |
| Bewegen | Rondkijken (camera) | MOUSE | Rechterstick | Rechterstick | Rechterstick | Rechterstick | Rechterstick | Rechterstick | Rechterstick | Rechterstick | Rechterstick | Rechterstick | Rechterstick |
| Bewegen | Springen, handrem, omhoog, noodrem | SPATIE | A | A | A | A | A | A | A | A | A | A | A |
| Bewegen | Rennen, versnelling, duiken | SHIFT | L3 | L3 | L3 | - | L3 | L3 | L3 | RB | RB | LT | - |
| Bewegen | Bukken, omlaag, neus omlaag | CTRL | B | B | - | - | - | - | - | B | B | B | - |
| Bewegen | Een versnelling hoger | . | - | - | - | RB | - | - | - | - | - | - | - |
| Bewegen | Een versnelling lager | , | - | - | - | LB | - | - | - | - | - | - | - |
| Bewegen | Koppeling indrukken | J | - | - | - | L3 | - | - | - | - | - | - | - |
| Bewegen | Achterom kijken | Q | - | - | R3 | R3 | R3 | - | R3 | - | - | - | - |
| Acties | Instappen, praten, gebruiken | E | Y | Y | Y | Y | Y | Y | Y | Y | - | Y | Y |
| Acties | Tweede gebruikstoets (uitstappen) | F | X | Y | - | - | - | - | - | - | - | - | - |
| Acties | Kusje | K | D-pad ↓ | D-pad ↓ | - | - | - | - | - | - | - | - | - |
| Acties | Andere kleren (toets 6) | 6 | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | - | - | - | - |
| Acties | Hengelen | I | - | X | D-pad ↓ | D-pad ↓ | - | D-pad ↓ | - | - | - | - | - |
| Acties | Lak of garagemenu | R | D-pad → | D-pad → | Wiel | Wiel | - | - | - | - | - | - | - |
| Acties | Toeteren te voet | H | geen | geen | - | - | - | - | - | - | - | - | - |
| Acties | Geluid aan of uit | U | geen | geen | geen | geen | geen | geen | geen | geen | geen | geen | geen |
| Wapens | Aanvallen, schieten | LMB | RT | RT | RB | RT | - | - | RB | - | - | RT | - |
| Wapens | Richten | RMB | LT | LT | - | - | - | - | - | - | - | - | - |
| Wapens | Vorig of volgend wapen | WHEEL | RB | RB | - | - | - | - | - | - | - | - | - |
| Wapens | Slaan (direct) | 1 | Wiel | Wiel | - | - | - | - | - | - | - | - | - |
| Wapens | Pistool (direct) | 2 | Wiel | Wiel | - | - | - | - | - | - | - | - | - |
| Wapens | Geweer (direct) | 3 | Wiel | Wiel | - | - | - | - | - | - | - | - | - |
| Wapens | Gooien (direct) | 4 | Wiel | Wiel | - | - | - | - | - | - | - | - | - |
| Wapens | Volgend doelwit, spelerslijst | TAB | R3 | R3 | - | - | - | - | - | - | - | - | - |
| Menu | Kaart | M | Overzicht | Overzicht | Overzicht | Overzicht | Overzicht | Overzicht | Overzicht | Overzicht | Overzicht | Overzicht | Overzicht |
| Menu | Pauzemenu en telefoon | ESC | Menu | Menu | Menu | Menu | Menu | Menu | Menu | Menu | Menu | Menu | Menu |
| Menu | Waypoint naar je eigen doel | 5 | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | - | - |
| Menu | Verhaalstap overslaan | O | D-pad ← | D-pad ← | Wiel | Wiel | - | - | Wiel | - | - | - | - |
| Menu | Minigame of vluchtdienst stoppen | BACKSPACE | - | - | - | - | - | - | - | D-pad → | D-pad ↓ | - | B |
| Camera | Filmcamera | V | Wiel | Wiel | Wiel | Wiel | D-pad ↓ | Wiel | Wiel | D-pad ↓ | - | - | - |
| Camera | Eerste persoon aan of uit | C | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | - | - |
| Camera | Cabinecamera (trein) | C | - | - | - | - | - | - | - | - | - | - | Wiel |
| Radio | Radio aan of uit | N | D-pad ↑ | D-pad ↑ | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel |
| Radio | Volgende zender (Shift + N) | Shift + N | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel |
| Voertuig | Toeteren | H | - | - | X | X | X | X | X | - | - | - | X |
| Voertuig | Zwaailicht en sirene | L | - | - | B | B | B | B | - | - | - | - | - |
| Voertuig | Richtingaanwijzer links | [ | - | - | D-pad ← | D-pad ← | D-pad ← | - | D-pad ← | - | - | - | - |
| Voertuig | Richtingaanwijzer rechts | ] | - | - | D-pad → | D-pad → | D-pad → | - | D-pad → | - | - | - | - |
| Voertuig | Alarmlichten | P | - | - | D-pad ↑ | Wiel | D-pad ↑ | - | Wiel | - | - | - | - |
| Voertuig | Bus: deuren | O | - | - | - | - | LB | - | - | - | - | - | - |
| Voertuig | Bus: kneel | K | - | - | - | - | RB | - | - | - | - | - | - |
| Voertuig | Bus: de dienst overnemen | G | - | - | - | - | Wiel | - | - | - | - | - | - |
| Voertuig | Boot: zeil aanhalen | Q | - | - | - | - | - | RB | - | - | - | - | - |
| Voertuig | Boot: zeil vieren | Z | - | - | - | - | - | LB | - | - | - | - | - |
| Voertuig | Trekker: aftakas | G | - | - | - | - | - | - | D-pad ↑ | - | - | - | - |
| Voertuig | Trekker: hef omhoog of omlaag | T | - | - | - | - | - | - | LB | - | - | - | - |
| Voertuig | Trekker: werktuig ontkoppelen | X | - | - | - | - | - | - | B | - | - | - | - |
| Voertuig | Trekker: tanken | R | - | - | - | - | - | - | D-pad ↓ | - | - | - | - |
| Voertuig | Vliegtuig: roer links | Q | - | - | - | - | - | - | - | - | D-pad ← | - | - |
| Voertuig | Vliegtuig: roer rechts | E | - | - | - | - | - | - | - | - | D-pad → | - | - |
| Voertuig | Vliegtuig: landingsgestel | G | - | - | - | - | - | - | - | - | X | - | - |
| Voertuig | Vliegtuig: kleppen | K | - | - | - | - | - | - | - | - | LB | - | - |
| Voertuig | Trein: deuren | O | - | - | - | - | - | - | - | - | - | - | L3 |
| Voertuig | Trein: waakzaamheidsknop | K | - | - | - | - | - | - | - | - | - | - | LB |
| Voertuig | Trein: dienst starten | G | - | - | - | - | - | - | - | - | - | - | RB |
| Voertuig | Trein: door de trein lopen | T | - | - | - | - | - | - | - | - | - | - | D-pad ↓ |
| Voertuig | Duif: poepen | F | - | - | - | - | - | - | - | - | - | X | - |
| Voertuig | Duif: koeren | C | - | - | - | - | - | - | - | - | - | LB | - |
| Voertuig | Duif: weer mens worden | X | - | - | - | - | - | - | - | - | - | D-pad ↓ | - |
| Samen spelen | Roepen: Kom hier (Samen spelen) | 7 | D-pad ← | D-pad ← | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel |
| Samen spelen | Roepen: Help! (Samen spelen) | 8 | D-pad ↓ | D-pad ↓ | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel |
| Samen spelen | Wijzen: Kijk daar (Samen spelen) | 9 | D-pad → | D-pad → | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel | Wiel |
| Samen spelen | Wiel met snelle zinnen (Samen spelen) | T | X | Wiel | LB | Wiel | Wiel | Wiel | - | - | - | - | - |
| Samen spelen | Het stuur geven of vragen (Samen spelen) | Y | - | - | D-pad ↑ | D-pad ↑ | D-pad ↑ | D-pad ↑ | - | - | - | - | - |
| Samen spelen | Bij de groep komen (Samen spelen) | B | D-pad ↑ | D-pad ↑ | - | - | - | - | - | - | - | - | - |

Acties zonder knop, bewust:

- Achterom kijken: Samen spelen: R3 opent dan de spelerslijst (Tab, #636, besluit eigenaar); achterom kijken is een vasthouden en past niet in het wiel. Op het toetsenbord blijft Q.
- Toeteren te voet: Eigenaarsbesluit: te voet heeft de toeter geen knop (pad_input_audit); in voertuigen zit hij op X.
- Geluid aan of uit: Geluid aan of uit staat ook in Instellingen > Geluid; een knop voor een instelling die je zelden wisselt hoeft niet (pad_input_audit).
