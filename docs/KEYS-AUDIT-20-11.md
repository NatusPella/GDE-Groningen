# Audit toets- en knopiconen in het spel (20-11)

Naslag (#1003, #985). Gemeten in het draaiende spel op 1280x720 met `scripts/qa/keys.page.js` (draait via `scripts/ui_shots.mjs --scenes=scripts/qa/keys.page.js`, slotnaam `keys`), met toetsenbord en met een nep-xbox-controller. Per zichtbare hint: glyph (Kenney), tekstkeycap (`.hud-key`, `.m-kc` of `kbd` met tekst), muis-SVG, pijltje als tekst, of zin met een toetsnaam als woord.

| Scène | Invoer | glyph | tekstkeycap | muis | pijltje-tekst | zin |
|---|---|---|---|---|---|---|
| te voet | toetsenbord | 0 | 1 (SPATIE) | 1 | 0 | 0 |
| pauze overzicht | toetsenbord | 4 | 2 (Esc, SPATIE) | 0 | 0 | 0 |
| pauze kaart | toetsenbord | 4 | 2 (Klik, SPATIE) | 0 | 0 | 0 |
| pauze Te doen | toetsenbord | 5 | 1 | 0 | 0 | 0 |
| pauze garage | toetsenbord | 6 | 3 (pijlen, SPATIE) | 0 | 0 | 0 |
| minigamebord, stopvenster, uitjekaart, melding | toetsenbord | 1 tot 3 | 7 tot 9 (W A S D, SHIFT, E: de doelregel) | 1 | 0 | 0 |
| te voet | controller | 6 | 0 | 1 | 0 | 0 |
| pauze overzicht | controller | 4 | 1 (Esc) | 0 | 0 | 0 |
| pauze kaart, Te doen, garage | controller | 5 tot 8 | 0 | 0 | 0 | 0 |
| minigamebord, stopvenster, uitjekaart, melding | controller | 4 tot 7 | 0 | 1 | 0 | 0 |

Met een controller staan er vrijwel nergens tekstkeycaps meer; het toetsenbord had ze nog in de doelregel van de HUD en op een paar menuknoppen.

## Omgezet in deze ronde
- De hintregel onder de doelkaart (W A S D, SHIFT, E, `hud_panel.js` `updateObjectiveKeys`) loopt nu via `glyphHtml`: toets-icoon, en met een controller de knop. Dit was de grootste groep tekstkeycaps in de meting.
- Eerder al: stopvenster, voetregel van het pauzemenu (`kiezen / ok / doorgaan`), alle `{TOKEN}`-teksten (zie `scripts/key_tokens_test.mjs`).

## Nog tekst (niet omgezet)
- De knop "Doorgaan" in het pauzemenu-overzicht toont `Esc` als tekstkeycap, en een paar menuknoppen tonen `SPATIE` of `Klik`: dat is `pausemenu.js`/`menu.css` van de menu-agent.
- De pijlen in de garage-hint (`garageui.js`, `data-gk="arrowleft"` met tekst ←/→).
- Toetsen zonder Kenney-glyph (Backspace-variant, F-toetsen, muiswiel) houden een nette tekstkeycap.

## Niet gemeten (niet gezien)
Voertuig, boot, vliegtuig, startkaart, regelkaart, sim-strooken, boerderij, lobby, kaartvoetregel en de Besturing- en Instellingen-tabs: de pagina gaf voor Instellingen en Besturing een fout (`sectionOf is not a function`, verkeerde aanroep in mijn script), de rest vraagt een voertuig of missie die de scène niet kan opzetten. Ook niet gemeten: een PlayStation-controller.

## Grootte
De meting markeerde bijna alle glyphs als kleiner dan 22 px in hoogte en breedte (`kleinGlyph`): het Kenney-toetsenbordglyph is een kleine toets in zijn vak. In het stopvenster en de menuvoetregel is het icoon ongeveer 20 px hoog en de tekst in het Esc-icoon is piepklein. Een groter glyph (hoger dan 24 px lettergrootte) is een vervolgstap; het bestaande lettertype heeft dan meer regelhoogte nodig.
