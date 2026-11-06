# Archief: cutscene-review GDE Groningen, 6-11-2026

Dit is de review van alle cutscenes in `GDE Groningen – Zomer vol misdaad`: de regie, de logica, de
scènes, Samen spelen, de flow, en het voorstel voor één lange cutscene per veroverde wijk.
Gemeten HEAD: `907f8c5c` (de cutscene-code is gelijk aan `e5e8b712`; daarna kwamen docs-, dev- en
review-commits van andere sessies). De review is **statisch**: geen Electron, geen spel, geen
netwerk, geen volledige suite. Dat staat ook eerlijk in `00-RAPPORT.md` §12.

## Inhoud

| Bestand | Wat |
|---|---|
| `00-RAPPORT.md` | het eindrapport: samenvatting, inventaris, visuele invulling, logica, flow, Samen spelen, waar scènes missen of te veel zijn, de issue-tabel (C1-C30 + C0), drie golven en de dekking |
| `01-regie-techniek.md` | deelreview regie/techniek: 20 bevindingen (1 Kritiek, 3 Hoog, 14 Midden, 2 Laag), waaronder de kritieke `pause:true`-vondst (#729) |
| `00-WIJK-VEROVER-FILM.md` | het kernvoorstel: één lange intocht per veroverde wijk (trigger, camera, data-gedreven stops, eenmalig, Samen spelen, codeplan, per-wijk scènes) |
| `05-wijk-verovering.md` | de harde inventaris van veroverbare wijken (8 bewezen + 23 kandidaten) en het technische raamwerk, met 14 bevindingen |
| `07-wijk-scenes-ontwerp.md` | acht volledig uitgewerkte intocht-scènes (shots, cast, props, tekst, geluid, techniek) + generieke template; conclusie: geliefde buurten als Oosterparkwijk/Korrewegwijk/Selwerd zijn met 0-1 taken niet veroverbaar (zie #736) en het hoofdstukkenmodel (drie ankers) is het enige nieuwe raamwerkstuk |
| `04-multiplayer.md` | cutscenes in Samen spelen: 15 bevindingen (3 Hoog, 8 Midden, 4 Laag), spelregels en testdekking |
| `_issues.json` / `_issues2.json` / `_issues_gemaakt*.json` | de issue-teksten en de nummers die op het bord zijn gezet |
| `_maak_issues.mjs` | het wegwerpscript waarmee de issues zijn aangemaakt en op project 5 gezet |

Deelreview 01 (regie/techniek) is aangeleverd en staat hierboven. Deelreview 02 (verhaal) heeft
geen eindrapport opgeleverd: de eerste reviewer is gefaald, een tweede begrensde reviewer is gestart
en levert mogelijk later `02-verhaal-scenes.md`. Tot die er is, is het verhaalonderwerp deels door
het eindrapport en door 04/05/07 gedekt, maar de systematische scène-voor-scène-audit van alle 89
staging-specs en de volledige verhaal-/continuïteitsanalyse per akte ontbreken. De inventariscijfers
(207 scènes, 101 min tekst, 44% zonder eigen regie) komen uit de tussenstand van de eerste reviewer
en zijn daarom in het eindrapport als "inventaris" en niet als eindconclusie opgenomen.

## Waar de bevindingen nu leven

De **32 issues** staan op het bord (project 5 van NatusPella), in de kolommen **Bugs** (bug-issues) en
**Wensen** (wens-issues):

- **#704-#728**: van de epic "Intocht: één lange cutscene per veroverde wijk" (#704) en het
  fundament (#705) tot de coöp-bugs (#711, #713-#715), de terminologie (#716), de
  openingsmontage (#717), de opening (#718), de finale (#719), de activiteitenscènes (#720), de
  landmarks (#721), de vijf missende outro-specs (#722), docs/preview (#723), tests (#724) en de
  kleine bugs (#725-#728).
- **#729-#734** (uit deelreview 01): de **Kritiek**-bug dat `pause:true` de wereld en de speler niet
  pauzeert (#729), regiehoogten op absolute z=0 (#730), `attachVoices` dat de duur na het compileren
  oprekt (#731), landmark/Ommelanden zonder snelheids-/race-/duifpoorten (#732), de stemmenbank
  zonder retry (#733) en de bundel met de resterende 14 midden- en 2 laagpunten (#734).
- **#736**: de veroverlaag laat geliefde buurten (Oosterparkwijk, Korrewegwijk, Selwerd, …) buiten
  beeld; drie opties (MIN_TAKEN voor buurten op 1, taken toevoegen, of de intocht ook op de
  buurtlaag laten vuren).
- Verwante bestaande issues die niet gedupliceerd zijn: #662 (opening comprimeren), #642
  (filmpje-overslaan), #687 (menu pauzeert alleen eigen speler), #676/#608 (Veroverd-UI),
  #581 (verweesde code), #633/#688 (uitjes-presentatie), #644 (ondertitels).

## Veiligheid en werkwijze

- Geen geheimen of persoonsgegevens; `.env` is nooit gelezen of gewijzigd.
- Geen commits, pushes of tags door deze review; alleen GitHub-issues zijn aangemaakt (op verzoek
  van de eigenaar). De rapportbestanden staan als concept in deze map (gestaged, niet gecommit).
- `desktop/main.js` en de bestanden van andere sessies zijn niet aangeraakt.
- De review is read-only op de code; alleen deze map en het bord zijn nieuw.

_Archief aangemaakt op 6-11-2026 22:20._
