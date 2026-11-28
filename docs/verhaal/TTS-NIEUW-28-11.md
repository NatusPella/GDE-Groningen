# Nieuwe stemregels, 28-11 (geen audio)

Bij de bouw van het verhaal van 28-11 komen er regels bij die nog niet zijn opgenomen. Er is geen TTS gedraaid: de regels staan als alleen-tekst in `game/storydata/script.json`
(`textOnly`) tot de eigenaar een opnameronde vraagt. Een sectie per bouwtaak; schrijf onder je eigen kop.

## De boer: hoeve Zeldenrust (#1373)

Bron: `docs/verhaal/nieuw/09-script-akte2.md`, scènes `N5` (herschreven) en `N5.2` (nieuw). Alle regels zijn `[NIEUW]` en alleen tekst.

| Spreker (script) | Spraaksleutel | Voorstel stem | Wat de stem moet kunnen | Regels |
|---|---|---|---|---|
| OOM HINDRIK | `boer_hindrik` | Enceladus (bestaand, zie `characterdossiers_minor.js`) | oude Groningse boer, stellig en samenzweerderig, plat Gronings (niveau 3): "Doar achter is niks meer." | 7 in N5 |
| TANTE AALTJE | `tante_aaltje` | nieuw: rustige vrouw, licht Fries | zorgzaam, administratief, zegt alles twee keer ("Dat staat vast. Dat staat vast.") | 2 in N5, 5 in N5.2 |
| DE NOTARIS | `notaris` | nieuw: plechtige oudere man | plechtig en precies, leest de akte voor | 2 in N5.2 |
| TESSA, TAMMO | bestaand (Anita, Tammo) | bestaand | de nieuwe regels in N5 en N5.2; de regel "Je vroeg nooit naar mijn jeugd..." van Tessa staat al op de wachtlijst | N5: Tessa 8, Tammo 8; N5.2: Tammo 3, Tessa 2 |

Rangmomenten (`game/js/farmrankscenes.js`) zijn ondertitelpraat zonder opname (`voice: null`, `textOnly`); sprekers daar zonder eigen stem tot er een ronde komt:
Ypie Boekema (nuchtere boer, plat Gronings, "Dat wordt wat."), Lutje (vlotte melkrijder, zonder adem), mevrouw Hofstra (vriendelijke ambtenares, "Dit formulier is heel simpel."), Jorrit Tilma (ongeduldige jonge loonwerker).
