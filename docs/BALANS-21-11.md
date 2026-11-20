# Economiebalans 21-11: De Duizendpoot (#985 punt 45)

Klacht (QoL-punt 45): "De Duizendpoot betaalt weinig". Wie alle negentien loopbanen met een echte eerste klus begint
(#846) kreeg eenmalig €750. De eigenaar gaf toestemming dit zelf te beslissen met een korte rekenonderbouwing.

Gemeten met `node scripts/economie_sim_test.mjs` (sim: `scripts/lib/economiesim.mjs`). Alleen een tuningconstante
verandert (`DUIZENDPOOT_EURO` in `game/js/loopbaan.js`); er is niets gemigreerd en geen opslag veranderd. Wie de
beloning al kreeg, houdt de vlag `duizendpoot` in het profiel en krijgt niets extra (geen terugwerkende kracht).

## De sim

Een sessie van 10 uur met een gemengde speler: 40% verhaalmissies, 25% bijbaantjes, 8% eigen boerderij, 5% racen, 5%
eierballen, 4% padel, 3% hengelen (de rest is rijden en kijken). Bronnen en kosten komen uit de bestaande data
(`economy.js`, `shopdata.js`, `percelen.js`, `loopbaan.js`); de tijden per gebeurtenis zijn schattingen uit de
speeltesten, dezelfde als in `loopbaan_balans_test.mjs`. Het verhaal is 24.350 euro in ongeveer 12 uur.

| bron | euro per uur (bruto, met bezetting) |
|---|---:|
| verhaalmissies | 2.029 |
| bijbaantjes | 1.900 |
| eigen boerderij | 1.584 |
| padel | 800 |
| eierballen | 350 |
| racen en driften | 200 |
| hengelen (vrij) | 196 |

Kosten per uur: reparaties 120, aanhouding 120, snelheidsboetes 20, winkel 120, samen 380 per uur. Dat geeft **netto
ongeveer €1.100 per uur** en na tien uur circa €11.700 (zonder bonus).

## De rekening voor De Duizendpoot

- De jacht: negentien eerste klussen (1,5 tot 12 minuten per klus, plus 3 minuten reizen naar de startplek) is **ongeveer
  2 uur** spelen. De klussen zelf betalen samen zo'n €1.165.
- Wie die twee uur gewoon doorspeelt, verdient 2 x €1.100 = **€2.180** netto.
- Met €750 levert de jacht dus €1.915 op tegen €2.180 doorspelen: **0,88 keer**. Het loont niet, ook niet in tijd (de bonus
  is 0,68 uur netto inkomen). Dat is de klacht.
- Met €2.000 levert de jacht €3.165 op: **1,45 keer** doorspelen. De bonus is 1,8 uur netto inkomen, ongeveer de duur van de
  jacht zelf. Dat is "de moeite waard, maar geen manier om te grinden".

Randvoorwaarden: onder de prijs van het goedkoopste perceel (Sauwerd Weide, €2.400), zodat het een duwtje blijft en geen
perceel cadeau; met het startgeld (€500) erbij is dat perceel wel bijna binnen. Minstens een revanche-goud (€1.500).

## Voor en na

| maat | voor (€750) | na (€2.000) |
|---|---:|---:|
| De Duizendpoot | €750 | **€2.000** |
| verdienste per uur (netto, de sim) | 1.099 | 1.099 (ongewijzigd) |
| bonus in uren netto inkomen | 0,68 | 1,82 |
| jacht tegenover doorspelen (loon plus bonus) | 0,88 | 1,45 |
| tijd tot eerste auto (Hunze Mug, €800) | 16 min | 16 min |
| tijd tot eerste perceel (€2.400, zonder bonus) | 104 min | 104 min (de bonus komt na ongeveer 2 uur) |
| vermogen na 10 uur, in duurste auto's (€3.800) | 3,2 | 3,6 |
| bonus als deel van het netto vermogen na 10 uur | 7% | 18% |

Inflatie: eenmalig €1.250 erbij, circa 11% van wat een speler in tien uur netto binnenhaalt. Dat is een eenmalige
injectie per profiel, geen stroom; het verandert geen prijs en geen loon. De prijzen van voertuigen, percelen en
winkels blijven staan.

## Niet veranderd

- Geen opslagsleutel, geen savegame en geen profielveld: de beloning blijft eenmalig, lokaal en zonder loonfactor.
- De prestatie `duizendpoot` (id, doel 19) blijft; alleen de omschrijving noemt het nieuwe bedrag
  (`achievements.js`, `steam/achievements.json`). Het aantal prestaties verandert niet, dus de prestatieteller klopt nog.
- Geen premies, loonfactoren, prijzen of missiebeloningen.

## Niet bekeken

Niets in beeld bekeken. De sim is een model met geschatte tijden, geen gemeten speelsessie: een speeltest met de
spelbot of een mens moet bevestigen dat de jacht ongeveer twee uur kost. Bij een afwijking van meer dan een kwart past
het bedrag mee (`economie_sim_test.mjs` bewaakt dat de verhouding 1,2 tot 2 blijft).
