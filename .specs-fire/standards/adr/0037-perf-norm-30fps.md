# 0037 - Perf-norm v2: 30 fps-p95, werktijd en een 1 s-hitchbudget

- **Status:** besloten (eigenaarsbeslissing 14-11-2026, voor release 0.61.0)
- **Datum:** 14-11-2026
- **Vervangt:** de norm-definitie in #804 / `scripts/perf/normrules.mjs`
- **Spec:** `docs/RELEASEGATE.md`, `docs/PERF-BESLUITEN.md`
- **Verwant:** ADR 0034 (releasegate)

## Besluit

Een route haalt de perf-norm als:

1. de **wandklok-p95** van de frames `<= 33,5 ms` is (30 fps-grens);
2. de **werktijd-p95** per frame (`cpuP95`) `<= 35 ms` (1 ms meetmarge op de 30 fps-grens) is;
3. de **max** `<= 1000 ms` is (geen totale freeze);
4. frames boven 50/100 ms worden als hitchbudget **gerapporteerd**, maar blokkeren de poort niet;
5. de koude-startroute (`foot`, de eerste seconden na het laden) wordt apart gerapporteerd en valt buiten de steady-state norm.

## Waarom

De oude norm (`p95 <= 25 ms`) werd op de rAF/vsync-klok gemeten. Op een 60 Hz-scherm
liggen frame-intervallen op 16,7 / 33,3 / 50,0 ms; 25 ms valt in een onmeetbaar gat.
In de praktijk eiste de oude norm dat minstens 95% van de frames binnen één beeldje
bleef, terwijl de werktijd-p95 op de referentiemachine 20-48 ms was. Daardoor was de
poort structureel rood en leerde een meting niet of een wijziging de werktijd of alleen
de vsync-fase veranderde.

## Afgewezen alternatieven

- **Norm laten staan en de gate blijven negeren:** geen bruikbaar bewijs.
- **Alleen werktijd meten:** dan verdwijnen echte gebruikershitches uit het beeld.
- **Alleen wandklok meten:** dan is de norm niet machineonafhankelijk en blijft ze
  kwantiseringsruis.
- **25 ms houden met een ruimere meetmethode (b.v. 120 Hz):** de referentiemachine
  haalt dat niet en de spelers monitoren zijn 60 Hz.

Deze norm is een **ondergrens** (30 fps), geen doel: de gate blijft hitches boven
1000 ms en een hoge werktijd-p95 afkeuren. Een volgende verlaging naar 60 fps vraagt eerst een echte daling van de
werktijd-p95 en van de hitches; #804 blijft daarvoor open.
