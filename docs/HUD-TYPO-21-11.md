# HUD-kaarten: typografische schaal, audit en omzetting (21-11)

Aanleiding (eigenaar, speelsessie): de kaarten in de linkerkolom van de HUD hadden wisselende lettergroottes, bijvoorbeeld een kleine kop met een grote regel eronder, een nieuwskaart met een heel grote kop en een telefoonkaart met grote tekst.
De audit is gelezen uit de CSS (`hudcards.css`, `hud_panel.css`, `phonefeed.css`, `achievements.js`, `regelwidget.css`, `prompts.css`, `bigmoment.css`, `minigamekit.js`). Er is niets in beeld gezien: dit is een omzetting met een pure test; de beeldcontrole staat nog open (zie onderaan).

## Rollen (tokens in `ds-tokens.css`)

| Rol | Token | Maat | Regelhoogte |
|---|---|---|---|
| eyebrow | `--ds-t-kaart-eyebrow` | 13 px, Barlow 800, hoofdletters, 0,12 em | 1,1 |
| titel | `--ds-t-kaart-titel` | 21 px, Barlow 800 | 1,1 |
| body | `--ds-t-kaart-body` | 16 px, Atkinson | 1,3 |
| hulp | `--ds-t-kaart-hulp` | 13 px | 1,3 |
| getal | `--ds-t-kaart-getal` | 28 px | 1,1 |
| moment (alleen aftellen) | `--ds-t-moment-getal` | 150 px | n.v.t. |

Elke rol is `max(<maat>, var(--hud-min, 13px))` en staat op `:root` én op `#hud`: `--hud-min` is 13 px gedeeld door `--ui` en bestaat alleen in de HUD, dus na het zoomen blijft de vloer 13 px. Tekstgrootte (a11y, `.text-groot`) zoomt `#hud .hc-text` en nu ook `#hud .pf-card`.

## Audit: kaart, onderdeel, maat nu (voor) en na

| Kaart | Onderdeel | Voor | Na |
|---|---|---|---|
| Tip, G-Music-achtige kaarten, activiteit, politie, gevaar (`hudcards.css`, `.hc-text`) | kop `small` | 14 px, 3 px letterafstand, Bebas | eyebrow |
| | titel `b` | 28 px (23 px bij hoogte onder 640) | titel |
| | tekst `span` | 18 px (16 px onder 640), `solo` 20 px | body |
| | sluitregel `.hc-close` | 13 px (`--hud-min`), Arial Narrow | hulp |
| | aftellen `.hud-count` | 150 px / 120 px | `--ds-t-moment-getal` en 0,8 daarvan |
| Telefoon- en nieuwskaart (`phonefeed.css`) | afzender `.pf-from` | 28 px (componentmaat `subkop`) | eyebrow |
| | app-naam `.pf-appnaam`, tijd, `+n` | 14 px (`--ds-t-hulp`) | hulp |
| | kop `.pf-title` (Kiezelweek!) | 44 px (`--ds-t-kop`), 28 px onder 640 | titel |
| | tekst `.pf-body` | 20 px (componentmaat `body`), minimaal 14 | body |
| | gesprek: naam, avatar | 28 px | titel |
| | gesprek: spreker | 16 px | eyebrow |
| | gesprek: tekst `.pf-say` | 20 px | body |
| | gesprek: ondertitel `.pf-sub`, klein label | 16 px | hulp |
| Prestatietoast (`achievements.js`, `hud_panel.css`) | kicker | 13 px, 3 px letterafstand (daarna 13 px) | eyebrow |
| | titel | 27 px (daarna 31 px bij de grote presentatie, 22 px smal) | titel |
| | uitleg | 14 px (daarna 15 px) | body |
| | percentage | 15 px | hulp |
| Muziekkaart (`.hud-nowplaying`) | label | 14 px | eyebrow |
| | titel | 20 px | titel |
| | artiest | 13 px | hulp |
| Regelwidget (`regelwidget.css`) | alle tekst | 13 px | hulp |

Buiten deze omzetting (bewust, geen kaart of eigen schaal):

| Onderdeel | Maat nu | Reden |
|---|---|---|
| Doelkaart (`.hud-mission-label` 18/20 px, voortgang 14 px, toetsen `--hud-min`) | eigen maat | HUD-onderdeel met meters en de routekaart, volgende ronde |
| Geld, klok, wapen, snelheid, race (28 tot 100 px) | getallen van de HUD | HUD-waarden; kandidaat voor de rol getal |
| Ondertitels (`#banter-sub` e.a.) | `clamp(15px, 1.5vw, 20px)` | eigen schaal met Ondertitelgrootte |
| Prompts en hints (`prompts.css`) | 13 tot 24 px | hintkit met eigen rij- en toetsmaten, volgende ronde |
| Grote momenten (`bigmoment.css`), naamkaart, `#cine` | `clamp()` 44 tot 160 px | schermvullend, geen kaart |
| Minigamebord (`minigamekit.js`) | eigen CSS | bord, geen kaart; zie #1000 |
| Toetsplaatjes `.hud-key` | 8,5 tot 16 px | binnenkant van een toetsplaatje |

## Wat de test bewaakt (`scripts/hud_typo_test.mjs`, 76 controles)
- vijf rollen als token, met vloer 13 px, oplopend (eyebrow, body, titel, getal) en op `#hud` herhaald;
- in `hudcards.css`, het HUD-deel van `phonefeed.css`, `regelwidget.css`, de prestatietoast en de muziekkaart staat geen `font-size` buiten de rollen;
- dezelfde rol, dezelfde maat: 20 onderdelen van vijf kaartsoorten zijn aan hun rol gekoppeld;
- de nieuwskop gebruikt de titelrol (niet de 44 px-kop) en geen mediaregel zet de kaartmaat opnieuw;
- Tekstgrootte (a11y) zoomt de kaarttekst.

## Open
- Beeldcontrole op 1280x720, 1920x1080 en 1024x600 met alle kaartsoorten naast elkaar (kaartkolom links) en met Tekstgrootte groot: nog niet gezien (perf-venster, geen Electron-run). Een scene voor alle kaartsoorten tegelijk is `scripts/qa/overlap_scenes.page.js` (`tip-prestatie-toast`, `nieuws-met-ondertitel`).
- Omzetten in een volgende ronde: doelkaart, hintkit, HUD-getallen (rol getal), minigamebord.
- Mogelijke gevolgen om in beeld te beoordelen: de titel is kleiner dan voorheen op sommige kaarten (28 naar 21 px) en groter in de telefoon (kop, 44 naar 21 px, juist kleiner); de nieuwskaart is hoger doordat de tekst nu op body-maat de hele regel toont.
