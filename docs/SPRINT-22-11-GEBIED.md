# Sprint 22-11: flow en bediening (UX)

Gebied: de belangrijkste speler-flows van begin tot eind (nieuw spel, doorgaan, reizen, Samen aansluiten), met toetsenbord en controller gelijk.
Meting: `node scripts/flow_stappen_test.mjs` (pure scenario's met de echte UI-regels, zonder Electron en zonder netwerk).

## Stappen per flow (voor en na)

| Flow | Voor | Na | Opmerking |
| --- | --- | --- | --- |
| Nieuw spel, alleen | 2 bevestigingen (startkaart, moeilijkheid) | 2 | al kort; het budget staat nu in de test |
| Doorgaan | 1 bevestiging (de laatste keuze staat gekozen) | 1 | idem |
| Samen aansluiten, eerste keer | 3 schermen (keuze, naam met akkoord, sessie) | 3 | geen netwerk vóór het akkoord, in de test vastgelegd |
| Samen aansluiten, daarna | keuze + sessie, op de sessiekeuze eerst omlaag naar Meedoen | keuze + sessie, Meedoen staat al gekozen | nieuw: `samenRol` onthoudt de laatste rol |
| Reizen | Enter of 1 voor de aanbevolen keuze; de markering verplaatsen kon alleen met een controller | Tab (Shift terug) verplaatst de markering ook met het toetsenbord | toetsenbord en controller bereiken dezelfde drie keuzes |

## Wat er is veranderd
- Reiskeuze (`reisview.js` keyAction, `reispanel.js`): Tab en Shift+Tab verplaatsen de markering, Enter of spatie bevestigt, 1/2/3 kiezen meteen, Escape sluit met de standaardkeuze. Bewust geen pijlen of WASD: het paneel hangt in het spel en die toetsen sturen te voet en in een voertuig.
- Sessiekeuze Samen spelen (`launchchoice.js` rolVoorkeur en bewaarRol, `samenkeuze.js`, `settings.js` samenRol): onthoudt de laatste rol die lukte als voorselectie. Terug bewaart niets; een ongeldige waarde in het bestand wordt null; de keuze blijft per speler en lokaal.
- `scripts/flow_stappen_test.mjs`: budget per flow, de toetsen die de controller in een menu stuurt (PAD_MAPS.menu), een volgende actie en een terugweg op elke kaart, en foutstaten met een actie (herlaadknop bij een bootfout; een mislukte sessie zet je terug op de keuze met de fout erbij).

## Samen-regel
De reiskeuze is lokaal per speler. De voorselectie van de sessiekeuze is een lokale instelling (gde-settings, samenRol) en verandert niets aan wie host is of wie wat krijgt; er is geen netwerkbericht voor nodig.

## Gevonden en niet aangepast (conservatief)
- De eerste-start-meting "Beeld instellen..." duurt ca. 3,5 s en is over te slaan met spatie of Escape; er staat geen hint bij. Klein, niet aangepast.
- De benchmark- en bootkaarten hebben hun eigen terugweg en zijn dus in orde; coopoverlay.js is alleen een opmaakbouwer en heeft geen eigen Escape nodig.

## Nog in beeld te bekijken (niet gedaan: geen Electron)
- De reiskeuze in het spel: Tab verplaatst de gele markering, Enter bevestigt, Escape sluit; met een controller nog steeds omhoog/omlaag en A.
- De sessiekeuze Samen spelen na een eerdere Meedoen: de focus staat op Meedoen.
