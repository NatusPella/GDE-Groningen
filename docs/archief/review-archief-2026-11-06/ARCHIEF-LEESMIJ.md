# Archief: codebase-review GDE Groningen, 6-11-2026

Dit is een duurzame kopie van de tweede codebase-review van `GDE Groningen` (HEAD `9d63ab80`, main), uitgevoerd door een aparte review-chat naast de review-sessie die issues #555–#580 opleverde. De oorspronkelijke bestanden stonden in `.test-temp/code-review-2026-11-06/`; die map is door een andere sessie opgeruimd. Deze kopie is daarom uit de DSH-sessielogs teruggehaald (write/edit-calls chronologisch toegepast); de bestandsgroottes komen exact overeen met de originelen van 16:39.

## Inhoud

| Bestand | Wat |
|---|---|
| `RAPPORT.md` | Samenvatting: 47 bevindingen (1 Kritiek, 7 Hoog, 20 Midden, 19 Laag), verificatie en dekkingsbeperking |
| `kern-wereld.md` | Deelreview kern, wereld, streaming, prestatie |
| `multiplayer-netwerk.md` | Deelreview Samen spelen en netwerk |
| `opslag-save.md` | Deelreview opslag, save, spelersstaat |
| `verhaal-missies.md` | Deelreview verhaal, missies, minigames |
| `ui-invoer-audio.md` | Deelreview UI, invoer, audio, a11y |
| `desktop-tooling-ci.md` | Deelreview desktop, tooling, CI |
| `AFSTEMMING-ANTWOORD.md` | Antwoord van de review-Lead op de afstemmingsnotitie van de andere review-sessie |

## Waar de bevindingen nu leven

De bevindingen zijn omgezet naar GitHub-issues op het bord (project 5, kolom Bugs):

- **GDE #555–#593** — de eerste reviewsessie maakte #555–#580 (26 issues, waarvan 3 later aangevuld); de tweede review leverde 6 losse Hoog-issues #582–#587 en 6 gebiedsbundels #588–#593.
- Status op 6-11-2026 19:45: **#580 en #582–#587 zijn al gefixt en gesloten** door de bouwsessie (commits `60b2ece1`, `00a7f9f7`, `f3fd1a7c`, `9430d5b6`); de bundels #588–#593 en de meeste #555–#579 staan nog open.
- De drie duplicaten zijn niet opnieuw aangemaakt: #555 (helikoptercrash), #557 (laadscherm ~92%) en #578 (settings-downgrade) bestonden al; de review-chat bevestigde ze met extra bewijs.

## Afstemming tussen de twee review-chats

- De review-sessie (de chat die dit archief maakt) legde een notitie in de rapportmap; de review-Lead las die en antwoordde in `AFSTEMMING-ANTWOORD.md`.
- Afspraak: geen duplicaten; de eigenaar beslist over issue-aanmaak. De eigenaar koos "Hoog apart, midden/laag per gebied bundelen"; dat is uitgevoerd (#582–#593).
- De oorspronkelijke notitie `00-AFSTEMMING-van-reviewchat.md` en het bericht `AFSTEMMING-GEDAAN.md` zijn met `.test-temp` verdwenen; hun kern staat hierboven en in de issue-bodies.

## Veiligheid

- Geen geheimen of persoonsgegevens in deze bestanden of in de aangemaakte issues. De enige IP-achtige treffers in de issue-set zijn `127.0.0.1` (loopback) in twee wom-issues over de dedicated server.
- `.env` is nooit gelezen of gewijzigd; de review was read-only.
- Er zijn door de review-sessie geen commits, pushes of tags gedaan; alleen GitHub-issues zijn aangemaakt.
- De review is statisch: geen Electron, geen volledige suite, geen netwerk. Dat staat ook eerlijk in `RAPPORT.md`.

_Archief aangemaakt op 6-11-2026 19:52 uit de DSH-sessielogs; de review zelf is van 16:00–16:40._
