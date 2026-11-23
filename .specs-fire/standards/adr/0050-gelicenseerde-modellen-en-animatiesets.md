# 0050 - Gelicenseerde mensmodellen en animatiesets (CC0/CC-BY)

- **Status:** besloten (eigenaarsbeslissing 23-11-2026)
- **Datum:** 23-11-2026
- **Spec:** `.specs-fire/standards/wereld.md` (mensen), `docs/ANIMATIE-LICENTIES.md`
- **Verwant:** ADR 0039 (audio) en 0041 (iconen), constitutie punt 4 in AGENTS.md, epic 'Personages die leven'

## Context

Alle mensen in spel en cutscenes zijn procedureel: één SkinnedMesh op een eigen rig van dertien botten (`models3d_people.js`), met de loopcyclus, idle en gebaren als formules (`gait.js`, `actoranim.js`). Dat is goedkoop, maar beweging en silhouet blijven stijf naast wat gratis sets nu bieden. De repo is openbaar, dus wat erin komt wordt herverdeeld.

## Besluit

Mensmodellen en animatieclips van derden mogen tijdens de ONTWIKKELING worden opgehaald en omgezet, onder deze voorwaarden:

- **Licentie:** alleen CC0 of CC-BY (3.0/4.0), gratis en ook commercieel bruikbaar, en alleen als de pagina van de bron die licentie zelf toont. URL, licentie en datum komen in `docs/ANIMATIE-LICENTIES.md`.
- **Nooit door het spel:** het spel haalt niets op; alleen omgezette, daadwerkelijk gebruikte bestanden komen in de repo (klein, alleen de nodige clips en delen, gecomprimeerd). Ruwe packs blijven buiten git (`<thuismap>/gde-assets/`).
- **Naamsvermelding:** bij CC-BY de handle van de maker zoals de bron hem toont, in `docs/ANIMATIE-LICENTIES.md` en in de credits van het spel. Geen echte namen zoeken of toevoegen. Bij CC0 is vermelding niet verplicht; we noemen de maker toch in de credits zodra iets van hem in het spel zit.
- **Één systeem:** spel en cutscenes gebruiken hetzelfde model en dezelfde lagen. Procedurele IK, kijkrichting, lipsync en overgangen (`actorlife.js`) liggen bovenop elke basis, ook bovenop clips.
- **Gefaseerd achter een vlag:** een nieuwe basis gaat eerst naar voorbijgangers, dan naar cutscenes, dan naar spelers, elke fase met een vergelijkingspagina; opgeslagen kledingkeuzes worden gemapt en saves gaan niet stuk.
- **Stand 23-11:** na de in-game controle in Electron (openingsfilm, straat met LOD en verre menigte, binnenview, fiets, wapens; scripts/ui/mensen_ingame_scenes.js) zijn de modulaire mensen de standaard voor iedereen. `?mensen=oud` zet de procedurele mensen terug als noodschakelaar; `q` en `q2` tonen een fase los.

Eerste toepassing: Quaternius (quaternius.com), alle drie CC0. De Universal Animation Library dient als referentie voor timing en houdingen. De Ultimate Modular Men en Ultimate Modular Women worden op besluit van de eigenaar (23-11) de nieuwe basis voor alle mensen, met hun animaties; de import en de koppeling aan het kledingsysteem volgen in fasen.

## Afgewezen

- **Mixamo:** vraagt een Adobe-account, en losse herverdeling van de bestanden is niet toegestaan; dat botst met een openbare repo.
- **Eigen motion capture:** apparatuur, opnametijd en schoonmaak; te duur voor wat het oplevert naast vrije sets.
- **Alleen procedureel:** blijft de terugval en de laag voor IK en lipsync, maar silhouet en beweging halen het niveau van de vrije sets niet.
- **CC-BY-NC, -ND, -SA of 'gratis voor persoonlijk gebruik':** niet te herverdelen in een openbare repo of niet commercieel bruikbaar.
- **Betaalde packs en marktplaatsen met eigen licentie:** kosten en licentievoorwaarden die per pack anders zijn.
- **De sets door het spel laten downloaden:** dat stuurt verkeer naar een externe dienst (constitutie 4) en maakt het spel afhankelijk van een site.

## Gevolgen

Elk toegevoegd model- of animatiebestand heeft een regel in `docs/ANIMATIE-LICENTIES.md` (bron, licentie, handle, bewerking). Een importscript zet de bron om naar ons formaat (één materiaal met vertexkleuren, één SkinnedMesh per mens) en houdt de omgezette bestanden klein. Auteurshandles in credits zijn, net als bij audio, een uitzondering op "geen echte namen in credits" en gelden alleen voor deze third-party bestanden.
